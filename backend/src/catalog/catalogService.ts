import { Category, Product, ProductRepository } from "./product.js";

// How many products show in the "Top rated" strip on a category page.
export const CATEGORY_TOP_RATED_COUNT = 3;

export interface CategoryPage {
  category: Category;
  topRated: Product[];
  others: Product[];
}

// Business rules for the catalogue. Knows nothing about HTTP or Fake Store.
export class CatalogService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly featuredProductIds: string[],
  ) {}

  // Home page: the products the owner hand-picked, in the order they picked them.
  // An id that no longer exists is skipped rather than breaking the home page.
  async getFeatured(): Promise<Product[]> {
    const products = await Promise.all(
      this.featuredProductIds.map((id) => this.repository.findById(id)),
    );
    return products.filter((p): p is Product => p !== undefined);
  }

  // Category page: highest customer rating first, split into "top rated" and the rest.
  // Returns undefined for an unknown category so the route can 404.
  async getCategoryPage(slug: string): Promise<CategoryPage | undefined> {
    const categories = await this.repository.listCategories();
    const category = categories.find((c) => c.slug === slug);
    if (!category) return undefined;

    const products = await this.repository.findByCategory(slug);
    const sorted = [...products].sort(byRatingDesc);
    return {
      category,
      topRated: sorted.slice(0, CATEGORY_TOP_RATED_COUNT),
      others: sorted.slice(CATEGORY_TOP_RATED_COUNT),
    };
  }

  getProduct(id: string): Promise<Product | undefined> {
    return this.repository.findById(id);
  }

  listCategories(): Promise<Category[]> {
    return this.repository.listCategories();
  }

  search(term: string): Promise<Product[]> {
    return this.repository.search(term);
  }
}

// Higher average first; when equal, the one with more reviews wins.
function byRatingDesc(a: Product, b: Product): number {
  return b.rating.average - a.rating.average || b.rating.count - a.rating.count;
}
