import { Link, Outlet, Route, Routes } from "react-router";
import { Header } from "./components/Header";
import { CategoryPage } from "./pages/CategoryPage";
import { HomePage } from "./pages/HomePage";
import { ProductPage } from "./pages/ProductPage";
import { SearchPage } from "./pages/SearchPage";

// Routes are kept separate from the router itself so tests can render them
// inside a MemoryRouter at any URL.
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="products/:id" element={<ProductPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function Layout() {
  return (
    <>
      <Header />
      <main className="main">
        <Outlet />
      </main>
    </>
  );
}

function NotFound() {
  return (
    <p>
      Page not found. <Link to="/">Back to home</Link>
    </p>
  );
}
