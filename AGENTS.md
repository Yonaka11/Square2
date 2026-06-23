# AGENTS.md

## Cursor Cloud specific instructions

This repo contains a single product: a local-first Square fee dashboard under
`square-fee-dashboard/` with two services (`backend/` and `frontend/`). Standard
setup/run/test commands are documented in `square-fee-dashboard/README.md` — use
that as the source of truth. Notes below are non-obvious caveats only.

### Services & how to run

- **Backend** (`square-fee-dashboard/backend`, Express + TypeScript on port 8080):
  `npm run dev`. Run it from the `backend/` directory.
- **Frontend** (`square-fee-dashboard/frontend`, Vite + React on port 5173):
  `npm run dev`. The Vite dev server **proxies `/api` to `http://localhost:8080`**
  (see `vite.config.ts`), so the backend must be running for the UI to load data.
  Start the backend first.

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
- **Square is mock-only in v1**: real sync (`backend/src/services/square/*`) is a
  placeholder. `POST /api/sync/square` intentionally returns a helpful error when
  credentials are missing and a 501 when present. Credentials go in
  `backend/.env` (`SQUARE_ACCESS_TOKEN`, `SQUARE_ENVIRONMENT`, `SQUARE_LOCATION_ID`).
- **Lint/typecheck/build**: each app has `npm run lint`, `npm run typecheck`; the
  frontend also has `npm run build`. The frontend build (`tsc -b`) type-checks
  `vite.config.ts`, which needs `@types/node` (already a devDependency).
