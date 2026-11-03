# Product Catalogue PoC

A small product catalogue where customers can browse, search, view a product and send an enquiry to the sales team.
It's a proof of concept, but it's built so that it can keep growing: the product data source, the email provider and the look and feel can each be swapped without rewriting the rest.

- **[DECISIONS.md](DECISIONS.md)** - assumptions, what I cut and why, how this grows, what I'd do next
- **[AI_USAGE.md](AI_USAGE.md)** - how I used AI to build it, and where it got things wrong

## Run it locally

### Option 1: Docker (recommended, one command)

Needs Docker with Compose.

```bash
docker compose up --build
```

| What | URL |
| --- | --- |
| The app | http://localhost:8080 |
| Sales inbox (Mailpit) - enquiry emails land here | http://localhost:8025 |

First build takes a couple of minutes. No accounts, API keys or `.env` file needed.

### Option 2: Without Docker (Node 20.12+, Node 22+ recommended)

Two terminals:

```bash
# Terminal 1 - API on http://localhost:3001
cd backend && npm install && npm run dev

# Terminal 2 - web app on http://localhost:5173
cd frontend && npm install && npm run dev
```

Open http://localhost:5173. In this mode enquiry emails are printed in terminal 1 instead of being sent.
To send them to a real inbox instead, run `docker compose up mailpit`, set `EMAIL_TRANSPORT=smtp` in `backend/.env` (copy it from `backend/.env.example`) and open http://localhost:8025.

## Try the acceptance criteria

1. **Home page** - the 5 "top rated" products are on http://localhost:8080.
2. **Category page** - click a category in the header (e.g. *Men's Clothing*). The 3 highest rated are at the top, the rest are under "More in ...".
3. **Search** - type `jacket` and click **Search**. Only matching products show. Try `mens jacket` - it won't return women's jackets.
4. **Product page** - click any product tile.
5. **Enquiry** - on a product page click **Enquire**, fill in name and email, and submit. You'll see a thank-you message, and the email shows up at http://localhost:8025.

## Run the tests

```bash
cd backend && npm test     # API, business rules, Fake Store adapter
cd frontend && npm test    # one test per acceptance criterion
```

`npm run typecheck` and `npm run build` work in both folders too.

## Configuration

All config is through environment variables, validated at startup (`backend/src/config.ts`). Everything has a default, so nothing needs to be set to run it locally. See [`backend/.env.example`](backend/.env.example).

| Variable | Default | What it does |
| --- | --- | --- |
| `FEATURED_PRODUCT_IDS` | `11,3,18,5,19` | The products the owner picked as "top rated" for the home page, in order |
| `EMAIL_TRANSPORT` | `console` (`smtp` in Docker) | `smtp` sends real email, `console` prints it |
| `SALES_INBOX` | `sales@catalogue.local` | Where enquiries are sent |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | `localhost` / `1025` / - / - | SMTP server (Mailpit locally) |
| `MAIL_FROM` | `Catalogue <no-reply@catalogue.local>` | Sender address |
| `FAKE_STORE_URL` | `https://fakestoreapi.com` | Product source |
| `PRODUCT_CACHE_TTL_SECONDS` | `300` | How long products are cached in memory |
| `PORT` | `3001` | API port |

With Docker you can override the featured products without editing files: `FEATURED_PRODUCT_IDS=1,2,3,4,5 docker compose up`.

## Stack and why

| Layer | Choice | Why |
| --- | --- | --- |
| Client | React + TypeScript (Vite) | A web app is the quickest thing for the owner to try and share (just a URL), and it runs locally with one command. React + TS is widely known, so it's easy to find people to build it out. A mobile app can come later and reuse the same API. |
| Backend | Node.js + TypeScript (Express) | Same language as the frontend, so one team can work on both. Express is small and well known; there isn't enough backend logic yet to justify a heavier framework. |
| Validation | zod | Validates request bodies, config and the Fake Store response with the same tool, and gives TS types for free. |
| Email | Nodemailer over SMTP, Mailpit locally | SMTP works with almost every provider (including Amazon SES), and Mailpit gives the reviewer a real inbox with no account. |

## How it's structured

```
frontend/                React app - only ever calls /api on its own origin
  src/api.ts             the one place that talks to the backend
  src/pages/             Home, Category, Search, Product
  src/components/        Header (search + category nav), ProductGrid, EnquiryForm
  src/styles.css         theme variables (colours, fonts, spacing)
  nginx.conf             serves the app and forwards /api to the backend (Docker)

backend/
  src/index.ts           wires everything together - the only place concrete classes are picked
  src/app.ts             HTTP routes + error handling
  src/config.ts          env var parsing and validation
  src/catalog/
    product.ts           our Product model + ProductRepository interface
    fakeStoreRepository.ts   Fake Store implementation (the only file that knows Fake Store exists)
    catalogService.ts    business rules: featured products, category "top rated"
  src/enquiry/
    emailSender.ts       EmailSender interface + SMTP and console implementations
    enquiryService.ts    validates and formats the enquiry email
```

```
Browser ──/api──▶ nginx ──▶ Express routes ──▶ CatalogService ──▶ ProductRepository ──▶ Fake Store
                                            └▶ EnquiryService ──▶ EmailSender ──▶ SMTP (Mailpit)
```

### API

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/products/featured` | The owner's chosen products |
| GET | `/api/categories` | `[{ slug, name }]` |
| GET | `/api/categories/:slug` | `{ category, topRated, others }` |
| GET | `/api/products?q=term` | Products matching the search term |
| GET | `/api/products/:id` | One product |
| POST | `/api/enquiries` | `{ productId, name, email, phone?, message? }` → 201 |
| GET | `/api/health` | `{ status: "ok" }` |

Errors come back as `{ error, fields? }`: 400 for bad input, 404 for unknown products or categories, 429 when rate limited, and 502 when Fake Store is down.

## Time spent

See the end of [AI_USAGE.md](AI_USAGE.md#time-spent).
