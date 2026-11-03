import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { CatalogService } from "./catalog/catalogService.js";
import { ProductSourceError } from "./catalog/product.js";
import { EnquiryService, ProductNotFoundError, enquirySchema } from "./enquiry/enquiryService.js";

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search term is required").max(100),
});

interface Dependencies {
  catalog: CatalogService;
  enquiries: EnquiryService;
}

export function createApp({ catalog, enquiries }: Dependencies) {
  const app = express();
  app.set("trust proxy", 1); // we sit behind nginx in docker; needed for per-IP rate limiting
  app.use(helmet());
  app.use(express.json({ limit: "10kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/categories", async (_req, res) => {
    res.json(await catalog.listCategories());
  });

  app.get("/api/categories/:slug", async (req, res) => {
    const page = await catalog.getCategoryPage(req.params.slug);
    if (!page) return notFound(res, "Category not found");
    res.json(page);
  });

  app.get("/api/products/featured", async (_req, res) => {
    res.json(await catalog.getFeatured());
  });

  // Search: GET /api/products?q=backpack
  app.get("/api/products", async (req, res) => {
    const { q } = searchQuerySchema.parse(req.query);
    res.json(await catalog.search(q));
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await catalog.getProduct(req.params.id);
    if (!product) return notFound(res, "Product not found");
    res.json(product);
  });

  // Stops one client spamming the sales inbox. In-memory store is fine for a
  // single instance; multiple instances would need a shared store (e.g. Redis).
  const enquiryLimiter = rateLimit({ windowMs: 60_000, limit: 5 });

  app.post("/api/enquiries", enquiryLimiter, async (req, res) => {
    const enquiry = enquirySchema.parse(req.body);
    await enquiries.submit(enquiry);
    res.status(201).json({ message: "Thank you for your enquiry" });
  });

  app.use("/api", (_req, res) => notFound(res, "Not found"));
  app.use(errorHandler);
  return app;
}

function notFound(res: Response, error: string) {
  res.status(404).json({ error });
}

// One place that turns errors into HTTP responses. Never leaks stack traces.
function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: "Invalid request", fields: z.flattenError(err).fieldErrors });
    return;
  }
  if (err instanceof ProductNotFoundError) {
    res.status(400).json({ error: "Product does not exist" });
    return;
  }
  if (err instanceof ProductSourceError) {
    console.error(err.message);
    res.status(502).json({ error: "Products are unavailable right now, please try again" });
    return;
  }
  // Malformed JSON body from express.json()
  if (err instanceof SyntaxError && "status" in err && err.status === 400) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
}
