import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeStoreRepository, toSlug } from "./fakeStoreRepository.js";
import { ProductSourceError } from "./product.js";
import { stubFetch } from "../testing/fixtures.js";

const newRepository = () =>
  new FakeStoreRepository({ baseUrl: "https://fake.test", cacheTtlMs: 60_000 });

afterEach(() => vi.unstubAllGlobals());

describe("FakeStoreRepository", () => {
  it("maps Fake Store data into our product model", async () => {
    stubFetch({});
    const product = await newRepository().findById("3");

    expect(product).toEqual({
      id: "3",
      title: "Mens Cotton Jacket",
      description: "Great outerwear jackets for Spring/Autumn/Winter",
      price: 55.99,
      imageUrl: "https://fakestoreapi.com/img/3.png",
      category: { slug: "mens-clothing", name: "men's clothing" },
      rating: { average: 4.7, count: 500 },
    });
  });

  it("lists each category once", async () => {
    stubFetch({});
    const categories = await newRepository().listCategories();
    expect(categories.map((c) => c.slug)).toEqual(["mens-clothing", "jewelery", "womens-clothing"]);
  });

  it("caches the product list instead of calling Fake Store every request", async () => {
    const fetchMock = stubFetch({});
    const repository = newRepository();
    await repository.findById("1");
    await repository.search("jacket");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  describe("search", () => {
    const titlesFor = async (term: string) =>
      (await newRepository().search(term)).map((p) => p.title);

    it("is case-insensitive and matches the start of words", async () => {
      stubFetch({});
      expect(await titlesFor("JACK")).toEqual([
        "Mens Cotton Jacket",
        "Lock and Love Women's Faux Leather Moto Biker Jacket",
      ]);
    });

    it("does not match 'mens' inside 'womens'", async () => {
      stubFetch({});
      expect(await titlesFor("mens jacket")).toEqual(["Mens Cotton Jacket"]);
    });

    it("requires every word to match", async () => {
      stubFetch({});
      expect(await titlesFor("cotton bracelet")).toEqual([]);
    });

    it("also matches description and category", async () => {
      stubFetch({});
      expect(await titlesFor("legends")).toEqual(["John Hardy Women's Legends Naga Bracelet"]);
      expect(await titlesFor("jewelery")).toEqual(["John Hardy Women's Legends Naga Bracelet"]);
    });
  });

  describe("when Fake Store misbehaves", () => {
    it("throws ProductSourceError on a non-200 response", async () => {
      stubFetch({ status: 503 });
      await expect(newRepository().findById("1")).rejects.toBeInstanceOf(ProductSourceError);
    });

    it("throws ProductSourceError on a network failure", async () => {
      stubFetch(new TypeError("fetch failed"));
      await expect(newRepository().findById("1")).rejects.toBeInstanceOf(ProductSourceError);
    });

    it("throws ProductSourceError when the data has an unexpected shape", async () => {
      stubFetch({ body: [{ id: "not-a-number" }] });
      await expect(newRepository().findById("1")).rejects.toBeInstanceOf(ProductSourceError);
    });
  });
});

describe("toSlug", () => {
  it("makes URL-safe category ids", () => {
    expect(toSlug("men's clothing")).toBe("mens-clothing");
    expect(toSlug("Electronics")).toBe("electronics");
  });
});
