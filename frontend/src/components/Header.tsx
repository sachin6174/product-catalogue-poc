import { FormEvent, useState } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router";
import { api } from "../api";
import { useApi } from "../useApi";

export function Header() {
  const categories = useApi(() => api.getCategories(), []);

  return (
    <header className="header">
      <div className="header__top">
        <Link to="/" className="header__brand">
          Catalogue
        </Link>
        <SearchBar />
      </div>
      {/* If categories fail to load, the rest of the site still works - so fail quietly here. */}
      {categories.data && (
        <nav aria-label="Categories" className="header__nav">
          {categories.data.map((category) => (
            <NavLink key={category.slug} to={`/category/${category.slug}`}>
              {category.name}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}

function SearchBar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [term, setTerm] = useState(searchParams.get("q") ?? "");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = term.trim();
    if (!trimmed) return; // nothing to search for
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="search">
      <input
        type="search"
        aria-label="Search products"
        placeholder="Search products"
        value={term}
        maxLength={100}
        onChange={(e) => setTerm(e.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
}
