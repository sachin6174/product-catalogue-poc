import { Link } from "react-router";
import { Product } from "../api";
import { formatPrice } from "../format";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="product-grid">
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile product={product} />
        </li>
      ))}
    </ul>
  );
}

function ProductTile({ product }: { product: Product }) {
  return (
    <Link to={`/products/${product.id}`} className="product-tile">
      <img src={product.imageUrl} alt="" loading="lazy" />
      <span className="product-tile__title">{product.title}</span>
      <span className="product-tile__price">{formatPrice(product.price)}</span>
      <span className="muted">
        ★ {product.rating.average} ({product.rating.count})
      </span>
    </Link>
  );
}
