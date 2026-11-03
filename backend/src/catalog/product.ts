// Our own product model. Every product source gets mapped into this shape,
// so the rest of the app never depends on Fake Store's field names.

export interface Category {
  slug: string; // URL-safe id, e.g. "mens-clothing"
  name: string; // display name, e.g. "men's clothing"
}

export interface Product {
  id: string; // string, not number - a future source may use SKUs or UUIDs
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  category: Category;
  rating: { average: number; count: number };
}

// The boundary to wherever product data lives. Fake Store today; a database,
// PIM or commerce platform later. Only this interface needs re-implementing.
export interface ProductRepository {
  findById(id: string): Promise<Product | undefined>;
  findByCategory(categorySlug: string): Promise<Product[]>;
  search(term: string): Promise<Product[]>;
  listCategories(): Promise<Category[]>;
}

// Thrown when the product source is down or returns something unexpected.
// Mapped to a 502 by the API so the client can show a "try again" message.
export class ProductSourceError extends Error {}
