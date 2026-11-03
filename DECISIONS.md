# Decisions and assumptions

## Assumptions (where the acceptance criteria left gaps)

**1. "I have chosen 5 products to be top rated" means a hand-picked list, not a calculation.**
The criterion says the owner *chooses* them, so I didn't compute them from ratings. There's no admin screen yet, so for now the owner "chooses" through a config value, `FEATURED_PRODUCT_IDS` (default `11,3,18,5,19`, which are the highest rated products across all four categories). They show in the order listed. If an id stops existing in the product source, it's skipped and the rest of the page still renders.

**2. "Top rated products for that category" means the 3 highest rated by customers.**
Unlike the home page, nothing says the owner picks these, and asking them to curate every category is extra work for a PoC. So the category page sorts by average rating (more reviews wins a tie). It shows the top 3 under "Top rated" and the rest under "More in ...". The number 3 is a constant in `catalogService.ts`. Fake Store categories only have 4 to 6 products, so 3 leaves something for the "additional products" section.

**3. Search matching rules.**
"Only see products that have text matching that search term" is open to interpretation, so I went with:
- Case-insensitive, and searches the title, description and category name.
- Every word in the search must match, so `mens jacket` means mens AND jacket.
- Each search word has to match the *start* of a word. `jack` finds "jacket", but `mens` does not find "womens". Plain substring matching made searching "mens" return women's clothing, which is clearly wrong for a shop.
- Apostrophes are ignored, so `mens` finds "Men's".
- An empty search does nothing. The term is capped at 100 characters.
- The term goes in the URL (`/search?q=jacket`), so results can be bookmarked and shared.

**4. The enquiry form asks for name and email (required), plus phone and message (optional).**
"Contact details" isn't defined. Name and email are the minimum sales needs to reply, and phone and message are useful but shouldn't block a lead. One enquiry covers one product, because there's no cart in scope. The email to sales has the customer's address as Reply-To, so sales can just hit reply.

**5. "The sales inbox will receive an email": locally, that inbox is Mailpit.**
The reviewer can't be asked to create an email account, so Docker runs Mailpit, a local SMTP server with a web inbox at http://localhost:8025. The sales address is the `SALES_INBOX` setting. I didn't send a confirmation email to the customer because it isn't in the criteria. The on-screen thank-you message covers it.

**6. Other small ones**
- Prices are shown in AUD. Fake Store has no currency.
- Category URLs use a slug made from the name (`men's clothing` becomes `/category/mens-clothing`).
- Product ids are strings in our model, even though Fake Store uses numbers, because a real catalogue will likely use SKUs or UUIDs.
- Web rather than mobile, so the owner can try it from a link and share it, and the reviewer can run it with one command.

## Requirements I dropped or simplified

| What | Why |
| --- | --- |
| No admin UI for choosing featured products | Config value instead. Building an admin UI would take most of the time-box and isn't on the critical path. |
| Search is done in memory in the backend | Fake Store has no search endpoint, and it only has 20 products. Search sits behind `ProductRepository.search()`, so a real source (a database or a search service) would do it natively. |
| No pagination | 20 products. It would be needed with a real catalogue. |
| Enquiries aren't stored, only emailed | If the email provider is down, the customer sees an error and can retry, but the enquiry isn't saved. Fine for a PoC, but it's the first thing I'd fix (see below). |
| No CAPTCHA | Basic protection only: validation, a 10kb body limit, and 5 enquiries per minute per IP. The rate limit is in memory, so it's per instance. |
| Minimal styling | The creative work is still being done, so I kept the design plain and put the colours, fonts and spacing in CSS variables. |
| No browser end-to-end tests | The backend tests run real routes through to the Fake Store adapter. The frontend tests render the real pages, one per acceptance criterion. I checked the full flow by hand in a browser. Playwright would be next (see below). |
| Product types are duplicated in frontend and backend | It's one small file. A shared package or generated types adds tooling the PoC doesn't need yet. |

## How the design supports growth beyond the PoC

The brief says the **product source, look and feel, and email provider** will all change, so those are exactly the seams in the code:

- **Product data source.** Everything goes through the `ProductRepository` interface (`backend/src/catalog/product.ts`). Fake Store is one implementation, and it's the only file that knows Fake Store exists. It maps Fake Store's fields into our own `Product` model and validates the response. Moving to a database, a PIM or Shopify means writing one new class and changing one line in `index.ts`. Business rules, routes and the frontend don't change.
- **Email provider.** Same pattern with `EmailSender`. The SMTP implementation already works with most providers, including Amazon SES's SMTP interface, so moving to SES could be just config. A provider-specific API is one new class.
- **Look and feel.** Colours, fonts and spacing are CSS variables in one block at the top of `styles.css`, and components use those variables only. Pages are small and only get data through `src/api.ts`, so a redesign doesn't touch data fetching.
- **Frontend and backend are separate apps talking JSON over `/api`.** The browser never sees Fake Store (a requirement), and the API returns our model rather than Fake Store's, so a future mobile app could use the same API.
- **AWS-friendly.** Both parts are stateless containers configured through env vars that are checked at startup. The backend could run on ECS Fargate or App Runner, the frontend build on S3 + CloudFront, email through SES, and secrets in Secrets Manager or SSM.

## What I'd do next with another day

1. **Don't lose leads.** Save each enquiry in a database first, then send the email from a queue (SQS) with retries. Right now a provider outage means a lost enquiry.
2. **A Playwright end-to-end test** of the enquiry journey against `docker compose`, plus a GitHub Actions workflow running tests and builds on each PR.
3. **Let the owner pick featured products** without a deploy, through a small admin page or a headless CMS.
4. **Bot protection** on the enquiry form (Cloudflare Turnstile or reCAPTCHA), and a shared rate-limit store such as Redis once there's more than one instance.
5. **An OpenAPI spec** for the API, with frontend types generated from it.
6. **Production polish.** Structured logging, Docker health checks, cache headers on product responses, and image optimisation.
