import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { CatalogService } from "./catalog/catalogService.js";
import { FakeStoreRepository } from "./catalog/fakeStoreRepository.js";
import { EmailMessage, EmailSender } from "./enquiry/emailSender.js";
import { EnquiryService } from "./enquiry/enquiryService.js";
import { stubFetch } from "./testing/fixtures.js";

// These tests run the real repository, services and routes together.
// Only the network call to Fake Store and the email provider are faked.

class RecordingEmailSender implements EmailSender {
  sent: EmailMessage[] = [];
  async send(message: EmailMessage) {
    this.sent.push(message);
  }
}

let emailSender: RecordingEmailSender;

function buildApp() {
  const repository = new FakeStoreRepository({ baseUrl: "https://fake.test", cacheTtlMs: 0 });
  const catalog = new CatalogService(repository, ["5", "3", "1"]);
  emailSender = new RecordingEmailSender();
  const enquiries = new EnquiryService(catalog, emailSender, "sales@example.com");
  return createApp({ catalog, enquiries });
}

beforeEach(() => {
  stubFetch({});
  vi.spyOn(console, "error").mockImplementation(() => {}); // keep test output clean
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/products/featured", () => {
  it("returns the chosen featured products in order", async () => {
    const res = await request(buildApp()).get("/api/products/featured");
    expect(res.status).toBe(200);
    expect(res.body.map((p: { id: string }) => p.id)).toEqual(["5", "3", "1"]);
  });

  it("returns 502 when the product source is down", async () => {
    stubFetch({ status: 500 });
    const res = await request(buildApp()).get("/api/products/featured");
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/try again/);
  });
});

describe("GET /api/categories", () => {
  it("lists categories with slugs", async () => {
    const res = await request(buildApp()).get("/api/categories");
    expect(res.body).toContainEqual({ slug: "mens-clothing", name: "men's clothing" });
  });

  it("returns top rated and other products for a category", async () => {
    const res = await request(buildApp()).get("/api/categories/mens-clothing");
    expect(res.status).toBe(200);
    expect(res.body.topRated.map((p: { id: string }) => p.id)).toEqual(["3", "1"]);
    expect(res.body.others).toEqual([]);
  });

  it("returns 404 for an unknown category", async () => {
    const res = await request(buildApp()).get("/api/categories/garden");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/products?q=", () => {
  it("returns only matching products", async () => {
    const res = await request(buildApp()).get("/api/products").query({ q: "backpack" });
    expect(res.status).toBe(200);
    expect(res.body.map((p: { id: string }) => p.id)).toEqual(["1"]);
  });

  it("rejects an empty search term", async () => {
    const res = await request(buildApp()).get("/api/products").query({ q: "   " });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/products/:id", () => {
  it("returns the product", async () => {
    const res = await request(buildApp()).get("/api/products/3");
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Mens Cotton Jacket");
  });

  it("returns 404 for an unknown product", async () => {
    const res = await request(buildApp()).get("/api/products/999");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/enquiries", () => {
  const validEnquiry = {
    productId: "3",
    name: "Jane Citizen",
    email: "jane@example.com",
    phone: "0400 000 000",
    message: "Do you have this in large?",
  };

  it("emails the sales inbox and thanks the customer", async () => {
    const res = await request(buildApp()).post("/api/enquiries").send(validEnquiry);

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/thank you/i);
    expect(emailSender.sent).toHaveLength(1);
    const email = emailSender.sent[0];
    expect(email.to).toBe("sales@example.com");
    expect(email.replyTo).toBe("jane@example.com");
    expect(email.subject).toBe("New enquiry: Mens Cotton Jacket");
    expect(email.text).toContain("Jane Citizen");
    expect(email.text).toContain("Do you have this in large?");
  });

  it("works without the optional phone and message", async () => {
    const { phone, message, ...required } = validEnquiry;
    const res = await request(buildApp()).post("/api/enquiries").send(required);
    expect(res.status).toBe(201);
  });

  it("rejects invalid contact details and sends nothing", async () => {
    const res = await request(buildApp())
      .post("/api/enquiries")
      .send({ ...validEnquiry, name: " ", email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields)).toEqual(["name", "email"]);
    expect(emailSender.sent).toHaveLength(0);
  });

  it("rejects an enquiry for a product that doesn't exist", async () => {
    const res = await request(buildApp())
      .post("/api/enquiries")
      .send({ ...validEnquiry, productId: "999" });
    expect(res.status).toBe(400);
    expect(emailSender.sent).toHaveLength(0);
  });

  it("returns 500 without leaking details when the email provider fails", async () => {
    const app = buildApp();
    emailSender.send = async () => {
      throw new Error("SMTP connection refused at 10.0.0.1");
    };
    const res = await request(app).post("/api/enquiries").send(validEnquiry);
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("SMTP");
  });

  it("rate limits repeated enquiries from the same client", async () => {
    const app = buildApp();
    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/enquiries").send(validEnquiry);
    }
    const res = await request(app).post("/api/enquiries").send(validEnquiry);
    expect(res.status).toBe(429);
  });
});
