import { useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../api";
import { EnquiryForm } from "../components/EnquiryForm";
import { Status } from "../components/Status";
import { formatPrice } from "../format";
import { useApi } from "../useApi";

export function ProductPage() {
  const { id = "" } = useParams();
  const product = useApi(() => api.getProduct(id), [id]);
  const [enquiring, setEnquiring] = useState(false);

  return (
    <Status state={product}>
      {(p) => (
        <article className="product-detail">
          <img src={p.imageUrl} alt={p.title} />
          <div>
            <Link to={`/category/${p.category.slug}`} className="muted capitalise">
              {p.category.name}
            </Link>
            <h1>{p.title}</h1>
            <p className="product-detail__price">{formatPrice(p.price)}</p>
            <p className="muted">
              ★ {p.rating.average} from {p.rating.count} reviews
            </p>
            <p>{p.description}</p>

            {enquiring ? (
              <EnquiryForm productId={p.id} />
            ) : (
              <button onClick={() => setEnquiring(true)}>Enquire</button>
            )}
          </div>
        </article>
      )}
    </Status>
  );
}
