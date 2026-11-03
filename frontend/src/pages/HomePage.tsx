import { api } from "../api";
import { ProductGrid } from "../components/ProductGrid";
import { Status } from "../components/Status";
import { useApi } from "../useApi";

export function HomePage() {
  const featured = useApi(() => api.getFeatured(), []);

  return (
    <section>
      <h1>Top rated</h1>
      <Status state={featured}>{(products) => <ProductGrid products={products} />}</Status>
    </section>
  );
}
