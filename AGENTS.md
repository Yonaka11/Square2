# AGENTS.md

## Cursor Cloud specific instructions

This repo contains a single product: a local-first Square fee dashboard under
`square-fee-dashboard/` with two services (`backend/` and `frontend/`). Standard
setup/run/test commands are documented in `square-fee-dashboard/README.md` — use
that as the source of truth. Notes below are non-obvious caveats only.

### Services & how to run

- **One command (preferred)**: from `square-fee-dashboard/`, run `npm run dev` to
  start backend + frontend together (uses `concurrently`). `npm run install:all`
  installs both. Root also exposes `seed`, `test`, `lint`, `typecheck`, `build`.
- **Backend** (`square-fee-dashboard/backend`, Express + TypeScript on port 8080):
  `npm run dev`. Run it from the `backend/` directory.
- **Frontend** (`square-fee-dashboard/frontend`, Vite + React on port 5173):
  `npm run dev`. The Vite dev server **proxies `/api` to `http://localhost:8080`**
  (see `vite.config.ts`), so the backend must be running for the UI to load data.
  When starting services separately, start the backend first.

### Non-obvious caveats

- **Database / SQLite**: uses `better-sqlite3` (a native module). It is the chosen
  local SQLite layer instead of Prisma (no codegen / engine download). The DB file
  lives at `square-fee-dashboard/data/square_dashboard.db` and is git-ignored.
- **Auto-seed on first run**: when the backend starts and finds zero orders, it
  automatically seeds 90+ days of mock data. So a fresh clone "just works" with no
  Square credentials. To force a re-seed, run `npm run seed` in `backend/` or
  `POST /api/sync/mock`. Re-seeding **clears existing transactional + catalog
  data** but preserves the `fee_rules` settings row.
- **Money is always integer cents** end-to-end (DB, API, and frontend formatting).
  Never introduce floating-point currency.
- **Square sync (read-only)**: implemented via direct REST calls in
  `backend/src/services/square/*` (no Square SDK — keeps money in integer cents and
  avoids SDK version churn). `POST /api/sync/square` runs catalog→orders→payments→
  refunds and returns a helpful error if credentials are missing. Credentials go in
  `backend/.env` (`SQUARE_ACCESS_TOKEN`, `SQUARE_ENVIRONMENT=sandbox`,
  `SQUARE_LOCATION_ID`). Pure normalizers in `normalize.ts` are unit-tested
  (`npm test` in `backend/`, uses Node's test runner via `tsx`), so the transform
  logic can be verified without live Square access.
- **Lint/typecheck/test/build**: backend has `npm run lint`, `npm run typecheck`,
  `npm test`; frontend has `npm run lint`, `npm run typecheck`, `npm run build`. The
  frontend build (`tsc -b`) type-checks `vite.config.ts`, which needs `@types/node`
  (already a devDependency).
