# CLAUDE.md

Instructions for AI coding agents working in this repo.

## What this is
A proof-of-concept product catalogue (browse, search, product details, enquiry).
It is meant to grow into the real product, so keep it simple but don't take shortcuts
that would have to be thrown away.

- `backend/` - Node.js + TypeScript + Express API. The only thing that talks to Fake Store.
- `frontend/` - React + TypeScript + Vite. Talks only to our backend (`/api/...`).

## Rules
- The frontend must never call the Fake Store API (or any product source) directly.
- Product data goes through the `ProductRepository` interface. Fake Store is just one
  implementation. Don't leak Fake Store field names or quirks outside `fakeStoreRepository.ts`.
- Email goes through the `EmailSender` interface. Don't import nodemailer anywhere else.
- Validate every request body / query with zod at the route boundary.
- No secrets in the repo. New config goes in `config.ts` and the matching `.env.example`.
- Keep dependencies minimal. Ask before adding a library - prefer a few lines of code.
- Styling uses the CSS variables in `frontend/src/styles.css`. No hard-coded colours in components.

## Code style
- TypeScript strict mode. No `any`.
- Small functions, plain names. Comments explain *why*, not *what*.
- Tests live next to the code as `*.test.ts(x)` and run with Vitest.

## Before saying a task is done
- `npm test` and `npm run build` pass in both `backend/` and `frontend/`.
- If you changed behaviour or made an assumption, update `DECISIONS.md`.
