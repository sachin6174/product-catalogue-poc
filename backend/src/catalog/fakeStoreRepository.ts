import { z } from "zod";
import { Category, Product, ProductRepository, ProductSourceError } from "./product.js";

// Shape of https://fakestoreapi.com/products. We validate it because it's an
// external API we don't control - better to fail clearly than render junk.
const fakeStoreProductSchema = z.object({
  id: z.number(),
  title: z.string(),
  price: z.number(),
  description: z.string(),
  category: z.string(),
  image: z.string(),
  rating: z.object({ rate: z.number(), count: z.number() }).optional(),
});
type FakeStoreProduct = z.infer<typeof fakeStoreProductSchema>;

interface Options {
  baseUrl: string;
  cacheTtlMs: number;
  timeoutMs?: number;
}

// Fake Store only has ~20 products and no search endpoint, so we fetch the whole
// list once, cache it briefly and filter in memory. A real data source would do
// filtering/search on its side - that's why these live behind ProductRepository.
export class FakeStoreRepository implements ProductRepository {
  private cache?: { products: Product[]; expiresAt: number };

  constructor(private readonly options: Options) {}

  async findById(id: string): Promise<Product | undefined> {
    const products = await this.getAll();
    return products.find((p) => p.id === id);
  }

  async findByCategory(categorySlug: string): Promise<Product[]> {
    const products = await this.getAll();
    return products.filter((p) => p.category.slug === categorySlug);
  }

  async search(term: string): Promise<Product[]> {
    const searchWords = toWords(term);
    const products = await this.getAll();
    // A product matches when every search word is the start of a word in its
    // title, description or category. Matching on word starts (not anywhere in
    // the text) stops "mens" matching "womens", while "jack" still finds "jacket".
    return products.filter((p) => {
      const productWords = toWords(`${p.title} ${p.description} ${p.category.name}`);
      return searchWords.every((s) => productWords.some((w) => w.startsWith(s)));
    });
  }

  async listCategories(): Promise<Category[]> {
    const products = await this.getAll();
    const bySlug = new Map(products.map((p) => [p.category.slug, p.category]));
    return [...bySlug.values()];
  }

  private async getAll(): Promise<Product[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.products;
    }
    const products = (await this.fetchProducts()).map(toProduct);
    this.cache = { products, expiresAt: Date.now() + this.options.cacheTtlMs };
    return products;
  }

  private async fetchProducts(): Promise<FakeStoreProduct[]> {
    let response: Response;
    try {
      response = await fetch(`${this.options.baseUrl}/products`, {
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 5000),
      });
    } catch (error) {
      throw new ProductSourceError(`Could not reach Fake Store: ${String(error)}`);
    }
    if (!response.ok) {
      throw new ProductSourceError(`Fake Store responded with ${response.status}`);
    }
    const parsed = z.array(fakeStoreProductSchema).safeParse(await response.json());
    if (!parsed.success) {
      throw new ProductSourceError("Fake Store returned data in an unexpected shape");
    }
    return parsed.data;
  }
}

function toProduct(item: FakeStoreProduct): Product {
  return {
    id: String(item.id),
    title: item.title,
    description: item.description,
    price: item.price,
    imageUrl: item.image,
    category: { slug: toSlug(item.category), name: item.category },
    rating: { average: item.rating?.rate ?? 0, count: item.rating?.count ?? 0 },
  };
}

// "men's clothing" -> "mens-clothing"
export function toSlug(name: string): string {
  return normalise(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Lowercase and drop apostrophes so "mens" matches "Men's".
function normalise(text: string): string {
  return text.toLowerCase().replace(/['’]/g, "");
}

function toWords(text: string): string[] {
  return normalise(text).split(/[^a-z0-9]+/).filter(Boolean);
}
