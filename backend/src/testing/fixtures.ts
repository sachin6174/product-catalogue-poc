import { vi } from "vitest";
import { Product } from "../catalog/product.js";

// A small slice of real Fake Store data, in Fake Store's own shape.
export const fakeStoreProducts = [
  {
    id: 1,
    title: "Fjallraven - Foldsack No. 1 Backpack",
    price: 109.95,
    description: "Your perfect pack for everyday use",
    category: "men's clothing",
    image: "https://fakestoreapi.com/img/1.png",
    rating: { rate: 3.9, count: 120 },
  },
  {
    id: 3,
    title: "Mens Cotton Jacket",
    price: 55.99,
    description: "Great outerwear jackets for Spring/Autumn/Winter",
    category: "men's clothing",
    image: "https://fakestoreapi.com/img/3.png",
    rating: { rate: 4.7, count: 500 },
  },
  {
    id: 5,
    title: "John Hardy Women's Legends Naga Bracelet",
    price: 695,
    description: "From our Legends Collection",
    category: "jewelery",
    image: "https://fakestoreapi.com/img/5.png",
    rating: { rate: 4.6, count: 400 },
  },
  {
    id: 16,
    title: "Lock and Love Women's Faux Leather Moto Biker Jacket",
    price: 29.95,
    description: "100% polyurethane shell",
    category: "women's clothing",
    image: "https://fakestoreapi.com/img/16.png",
    rating: { rate: 2.9, count: 340 },
  },
];

// Replaces global fetch so tests never hit the real Fake Store API.
export function stubFetch(response: { status?: number; body?: unknown } | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return new Response(JSON.stringify(response.body ?? fakeStoreProducts), {
      status: response.status ?? 200,
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function makeProduct(overrides: Partial<Product> & { id: string }): Product {
  return {
    title: `Product ${overrides.id}`,
    description: "",
    price: 10,
    imageUrl: "",
    category: { slug: "electronics", name: "electronics" },
    rating: { average: 3, count: 10 },
    ...overrides,
  };
}
