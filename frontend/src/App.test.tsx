import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, Product, api } from "./api";
import { AppRoutes } from "./App";

// One test per acceptance criterion, written as the user journey.
// Real routes and pages are rendered; only the backend calls are mocked.
vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    api: {
      getCategories: vi.fn(),
      getCategoryPage: vi.fn(),
      getFeatured: vi.fn(),
      getProduct: vi.fn(),
      search: vi.fn(),
      submitEnquiry: vi.fn(),
    },
  };
});

const jackets = { slug: "jackets", name: "jackets" };

function product(id: string, title: string): Product {
  return {
    id,
    title,
    description: `${title} description`,
    price: 49.95,
    imageUrl: `https://img.test/${id}.png`,
    category: jackets,
    rating: { average: 4.5, count: 100 },
  };
}

function renderAt(url: string) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[url]}>
      <AppRoutes />
    </MemoryRouter>,
  );
  return user;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.getCategories).mockResolvedValue([jackets]);
});

describe("Home page", () => {
  it("shows the 5 featured products", async () => {
    const featured = ["1", "2", "3", "4", "5"].map((id) => product(id, `Featured ${id}`));
    vi.mocked(api.getFeatured).mockResolvedValue(featured);

    renderAt("/");

    const grid = await screen.findByRole("list");
    expect(within(grid).getAllByRole("link")).toHaveLength(5);
    expect(within(grid).getByText("Featured 3")).toBeInTheDocument();
  });

  it("shows an error message if products can't be loaded", async () => {
    vi.mocked(api.getFeatured).mockRejectedValue(new ApiError("Products are unavailable", 502));
    renderAt("/");
    expect(await screen.findByRole("alert")).toHaveTextContent("Products are unavailable");
  });
});

describe("Category page", () => {
  it("shows top rated and additional products after clicking a category link", async () => {
    vi.mocked(api.getFeatured).mockResolvedValue([]);
    vi.mocked(api.getCategoryPage).mockResolvedValue({
      category: jackets,
      topRated: [product("1", "Best jacket")],
      others: [product("2", "Other jacket")],
    });

    const user = renderAt("/");
    await user.click(await screen.findByRole("link", { name: "jackets" }));

    expect(api.getCategoryPage).toHaveBeenCalledWith("jackets");
    const topRated = (await screen.findByRole("heading", { name: "Top rated" })).closest("section")!;
    expect(within(topRated).getByText("Best jacket")).toBeInTheDocument();
    const more = screen.getByRole("heading", { name: "More in jackets" }).closest("section")!;
    expect(within(more).getByText("Other jacket")).toBeInTheDocument();
  });
});

describe("Search", () => {
  it("shows only the matching products after clicking Search", async () => {
    vi.mocked(api.getFeatured).mockResolvedValue([]);
    vi.mocked(api.search).mockResolvedValue([product("7", "Rain jacket")]);

    const user = renderAt("/");
    await user.type(screen.getByRole("searchbox", { name: "Search products" }), "  rain ");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(api.search).toHaveBeenCalledWith("rain"); // trimmed
    expect(await screen.findByRole("heading", { name: "Results for “rain”" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Rain jacket")).toBeInTheDocument();
  });

  it("does nothing when the search box is empty", async () => {
    vi.mocked(api.getFeatured).mockResolvedValue([]);
    const user = renderAt("/");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(api.search).not.toHaveBeenCalled();
  });

  it("tells the user when nothing matches", async () => {
    vi.mocked(api.search).mockResolvedValue([]);
    renderAt("/search?q=unicorn");
    expect(await screen.findByText(/No products match “unicorn”/)).toBeInTheDocument();
  });
});

describe("Product page", () => {
  it("opens the product details when a product tile is clicked", async () => {
    vi.mocked(api.getFeatured).mockResolvedValue([product("3", "Cotton jacket")]);
    vi.mocked(api.getProduct).mockResolvedValue(product("3", "Cotton jacket"));

    const user = renderAt("/");
    await user.click(await screen.findByRole("link", { name: /Cotton jacket/ }));

    expect(api.getProduct).toHaveBeenCalledWith("3");
    expect(await screen.findByRole("heading", { level: 1, name: "Cotton jacket" })).toBeInTheDocument();
    expect(screen.getByText("Cotton jacket description")).toBeInTheDocument();
    expect(screen.getByText("$49.95")).toBeInTheDocument();
  });
});

describe("Enquiry", () => {
  async function openEnquiryForm() {
    vi.mocked(api.getProduct).mockResolvedValue(product("3", "Cotton jacket"));
    const user = renderAt("/products/3");
    await user.click(await screen.findByRole("button", { name: "Enquire" }));
    return user;
  }

  it("submits contact details and shows a thank you message", async () => {
    vi.mocked(api.submitEnquiry).mockResolvedValue({ message: "Thank you" });
    const user = await openEnquiryForm();

    await user.type(screen.getByLabelText("Name"), "Jane Citizen");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Message (optional)"), "Is this in stock?");
    await user.click(screen.getByRole("button", { name: "Send enquiry" }));

    expect(api.submitEnquiry).toHaveBeenCalledWith({
      productId: "3",
      name: "Jane Citizen",
      email: "jane@example.com",
      phone: undefined,
      message: "Is this in stock?",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Thank you");
  });

  it("shows the server's validation errors and keeps the form open", async () => {
    vi.mocked(api.submitEnquiry).mockRejectedValue(
      new ApiError("Invalid request", 400, { email: ["Enter a valid email address"] }),
    );
    const user = await openEnquiryForm();

    await user.type(screen.getByLabelText("Name"), "Jane");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.click(screen.getByRole("button", { name: "Send enquiry" }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
