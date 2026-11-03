# AI usage

## Tools and models

- **Claude Code** (VS Code extension) running **Claude Opus 5.5**. I used it to plan, write the code, tests and docs, run commands and check the result in a browser.
- Headless Chrome screenshots, taken by the agent, to check the UI at desktop and phone widths.

I reviewed every file before committing it and can explain all of it.

## Agent instruction file

[`CLAUDE.md`](CLAUDE.md) was the first thing committed on the feature branch, before any code. It holds the rules I wanted the agent to stick to the whole way through:

- The frontend never calls Fake Store; all product data goes through the backend.
- Product data only goes through `ProductRepository`, and email only through `EmailSender`. No Fake Store field names or nodemailer imports outside their adapter.
- Validate every input with zod at the boundary, and keep secrets out of the repo.
- Keep dependencies minimal: ask before adding a library.
- "Done" means tests and build pass in both apps and DECISIONS.md is updated.

## The plan

I agreed this plan with the agent before any code was written:

1. **Stack:** React + TS web app with a Node + TS (Express) backend. Web, so the owner can try it from a link and the reviewer can run it with one command.
2. **Seams:** the brief says the data source, look and feel, and email provider will change, so each one gets a boundary: a `ProductRepository` interface, CSS variables, and an `EmailSender` interface.
3. **Email without accounts:** SMTP to Mailpit in Docker Compose, so the reviewer sees a real inbox.
4. **Tests:** backend route tests that run the real code and fake only the network edges, plus one frontend test per acceptance criterion.
5. **Git:** `main` holds only an initial commit. The work goes on `feature/product-catalogue` in small commits, then a PR.
6. **Keep it small:** no state library, no CSS framework, no ORM, and no features beyond the acceptance criteria.

## Key prompts and moments that shaped the solution

1. **"Read the brief, follow every instruction, keep the project as light as possible and easy for a human to understand."** This set the tone. It's why there's no React Query, no CSS framework and no DI container, and why `index.ts` wires everything by hand in about 20 lines.
2. **Making the brief's "will change" list the architecture.** Asking "what does the brief say will change?" gave exactly three seams: data source, email provider, and look and feel. Everything else stayed simple.
3. **Defining "top rated" in two different ways on purpose.** The home page criterion says *"I have chosen"*, so it's a hand-picked list in config. The category criterion doesn't, so it's calculated from ratings. I made the agent write down the reasoning in DECISIONS.md instead of picking one rule silently.
4. **"Run it against the real Fake Store before writing tests."** A smoke test with curl of every endpoint caught the search bug below. The tests alone, written by the same agent, wouldn't have.
5. **"Prove the tests can fail."** After the backend tests all passed first time, I had the agent put the old search logic back and confirm the regression test failed. Then it restored the fix.

## Where the AI got things wrong, and how I caught it

| What went wrong | How it was caught | Fix |
| --- | --- | --- |
| The `.gitignore` used `./info.txt`-style paths. Git doesn't support a `./` prefix, so the confidential brief and recruiter email would have been committed. | `git check-ignore` before the first commit showed nothing was ignored. | Changed the paths to `/info.txt` and checked again. |
| Search used substring matching, so `mens cotton` returned women's products ("womens" contains "mens"). | Smoke test against real Fake Store data. | Changed it to match the start of each word, and added a regression test. Confirmed the test fails against the old code. |
| The first default "top rated" list included a monitor with a 2.2 rating. | Reading the API output. | Picked the 5 highest-rated products across categories as the default. |
| The enquiry form put the error text inside the `<label>`, so screen readers would read the field as "Email Enter a valid email address". | A frontend test failed when it looked the field up by its label. | Moved the error outside the label and linked it with `aria-describedby`. I fixed the component, not the test. |
| It installed jsdom 27, which crashes on Node 20.18 (it needs `require()` of ES modules, added in 20.19). | The frontend test run failed to start. | Pinned jsdom 26 so the tests run on any Node 20.12+. |
| The header content sat 16px left of the page content. | Screenshot review. | Gave both the same container width and padding. |
| It took the 390px "mobile" screenshot as proof of overflow, but headless Chrome had silently kept the viewport at 500px. | Measured `innerWidth` before touching any CSS. | Rechecked inside a 375px iframe. The layout was fine, and no CSS change was needed. |

## Time spent

| Activity | Time |
| --- | --- |
| Planning (reading the brief, deciding stack and assumptions) | _fill in_ |
| Building | _fill in_ |
| Testing (automated + manual in the browser) | _fill in_ |
| Reviewing code and writing docs | _fill in_ |
| **Total** | _fill in_ |
