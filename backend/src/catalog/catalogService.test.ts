import { describe, expect, it } from "vitest";
import { CatalogService } from "./catalogService.js";
import { Product, ProductRepository } from "./product.js";
import { makeProduct } from "../testing/fixtures.js";

// Minimal in-memory repository - the service shouldn't care where products come from.
function repositoryWith(products: Product[]): ProductRepository {
  return {
    findById: async (id) => products.find((p) => p.id === id),
    findByCategory: async (slug) => products.filter((p) => p.category.slug === slug),
    search: async () => products,
    listCategories: async () => [...new Map(products.map((p) => [p.category.slug, p.category])).values()],
  };
}

const electronics = { slug: "electronics", name: "electronics" };
const jewelery = { slug: "jewelery", name: "jewelery" };

describe("CatalogService.getFeatured", () => {
  const products = ["1", "2", "3", "4", "5", "6"].map((id) => makeProduct({ id }));

  it("returns the chosen products in the chosen order", async () => {
    const catalog = new CatalogService(repositoryWith(products), ["5", "1", "3", "6", "2"]);
    const featured = await catalog.getFeatured();
    expect(featured.map((p) => p.id)).toEqual(["5", "1", "3", "6", "2"]);
  });

  it("skips ids that no longer exist instead of failing", async () => {
    const catalog = new CatalogService(repositoryWith(products), ["1", "999", "2"]);
    const featured = await catalog.getFeatured();
    expect(featured.map((p) => p.id)).toEqual(["1", "2"]);
  });
});

describe("CatalogService.getCategoryPage", () => {
  const products = [
    makeProduct({ id: "a", category: electronics, rating: { average: 2.0, count: 10 } }),
    makeProduct({ id: "b", category: electronics, rating: { average: 4.8, count: 10 } }),
    makeProduct({ id: "c", category: electronics, rating: { average: 4.5, count: 50 } }),
    makeProduct({ id: "d", category: electronics, rating: { average: 4.5, count: 90 } }),
    makeProduct({ id: "e", category: electronics, rating: { average: 3.0, count: 10 } }),
    makeProduct({ id: "x", category: jewelery, rating: { average: 5.0, count: 10 } }),
  ];
  const catalog = new CatalogService(repositoryWith(products), []);

  it("splits the category into the 3 highest rated and the rest", async () => {
    const page = await catalog.getCategoryPage("electronics");
    expect(page?.category).toEqual(electronics);
    // d beats c on review count when the average is tied
    expect(page?.topRated.map((p) => p.id)).toEqual(["b", "d", "c"]);
    expect(page?.others.map((p) => p.id)).toEqual(["e", "a"]);
  });

  it("returns undefined for an unknown category", async () => {
    expect(await catalog.getCategoryPage("garden")).toBeUndefined();
  });
});
