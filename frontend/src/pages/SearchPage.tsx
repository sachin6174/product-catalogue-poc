import { useSearchParams } from "react-router";
import { api } from "../api";
import { ProductGrid } from "../components/ProductGrid";
import { Status } from "../components/Status";
import { useApi } from "../useApi";

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const term = searchParams.get("q")?.trim() ?? "";
  // The term lives in the URL so search results can be bookmarked and shared.
  const results = useApi(() => (term ? api.search(term) : Promise.resolve([])), [term]);

  if (!term) return <p className="muted">Type something in the search bar to find products.</p>;

  return (
    <section>
      <h1>Results for “{term}”</h1>
      <Status state={results}>
        {(products) =>
          products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <p>No products match “{term}”. Try a different word.</p>
          )
        }
      </Status>
    </section>
  );
}
