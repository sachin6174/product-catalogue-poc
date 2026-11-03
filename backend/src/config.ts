import { z } from "zod";

// Load backend/.env if it exists (Node 20.12+). In Docker, env vars come from compose instead.
try {
  process.loadEnvFile();
} catch {
  // no .env file - fall back to real env vars and the defaults below
}

const configSchema = z.object({
  PORT: z.coerce.number().int().default(3001),
  FAKE_STORE_URL: z.url().default("https://fakestoreapi.com"),
  PRODUCT_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(300),

  // The 5 products the owner picked as "top rated" for the home page, in display order.
  FEATURED_PRODUCT_IDS: z
    .string()
    .default("11,3,18,5,19")
    .transform((value) => value.split(",").map((id) => id.trim()).filter(Boolean)),

  // "smtp" sends real email (Mailpit locally); "console" just logs it.
  EMAIL_TRANSPORT: z.enum(["smtp", "console"]).default("console"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("Catalogue <no-reply@catalogue.local>"),
  SALES_INBOX: z.email().default("sales@catalogue.local"),
});

export type Config = z.infer<typeof configSchema>;

// Fail fast on startup with a readable message if config is wrong.
export function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid configuration:\n" + z.prettifyError(result.error));
    process.exit(1);
  }
  return result.data;
}
