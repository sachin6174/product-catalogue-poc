import { useParams } from "react-router";
import { api } from "../api";
import { ProductGrid } from "../components/ProductGrid";
import { Status } from "../components/Status";
import { useApi } from "../useApi";

export function CategoryPage() {
  const { slug = "" } = useParams();
  const page = useApi(() => api.getCategoryPage(slug), [slug]);

  return (
    <Status state={page}>
      {({ category, topRated, others }) => (
        <>
          <h1 className="capitalise">{category.name}</h1>
          <section>
            <h2>Top rated</h2>
            <ProductGrid products={topRated} />
          </section>
          {others.length > 0 && (
            <section>
              <h2>More in {category.name}</h2>
              <ProductGrid products={others} />
            </section>
          )}
        </>
      )}
    </Status>
  );
}
