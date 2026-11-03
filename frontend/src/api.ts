// The only file that knows how to talk to the backend. Pages call these
// functions and never use fetch directly.

// These types mirror the backend's product model. Fine to duplicate at this
// size; if they start drifting, generate them from an OpenAPI spec instead.
export interface Category {
  slug: string;
  name: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  category: Category;
  rating: { average: number; count: number };
}

export interface CategoryPage {
  category: Category;
  topRated: Product[];
  others: Product[];
}

export interface Enquiry {
  productId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(body.error ?? "Something went wrong", response.status, body.fields);
  }
  return body as T;
}

export const api = {
  getCategories: () => request<Category[]>("/categories"),
  getCategoryPage: (slug: string) => request<CategoryPage>(`/categories/${encodeURIComponent(slug)}`),
  getFeatured: () => request<Product[]>("/products/featured"),
  getProduct: (id: string) => request<Product>(`/products/${encodeURIComponent(id)}`),
  search: (term: string) => request<Product[]>(`/products?q=${encodeURIComponent(term)}`),
  submitEnquiry: (enquiry: Enquiry) =>
    request<{ message: string }>("/enquiries", { method: "POST", body: JSON.stringify(enquiry) }),
};
