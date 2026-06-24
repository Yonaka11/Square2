# AGENTS.md

## Cursor Cloud specific instructions

This repo contains a single product: a local-first Square fee dashboard under
`square-fee-dashboard/` with two services (`backend/` and `frontend/`). Standard
setup/run/test commands are documented in `square-fee-dashboard/README.md` — use
that as the source of truth. Notes below are non-obvious caveats only.

### Services & how to run

- **One command (preferred)**: from `square-fee-dashboard/`, run `npm run dev` to
  start backend + frontend together (uses `concurrently`). `npm run install:all`
  installs both. Root also exposes `test`, `lint`, `typecheck`, `build`.
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
- **Real Square data only**: there is NO mock/sample data and no auto-seed. A fresh
  database is empty until a Square sync runs (`POST /api/sync/square` or the
  "Sync from Square" button). Square credentials are therefore required to load
  any data.
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
- **Optional auth**: OFF by default. Setting `ADMIN_PASSWORD` enables a login gate;
  all `/api` routes except `/api/auth/*`, `/api/health`, `/api/webhooks/*` then
  require a signed bearer token. The `requireAuth` middleware matches open paths
  against `req.originalUrl` (NOT `req.path`, which is stripped of the `/api` mount
  prefix) — keep that in mind if adding new open routes. Tokens are HMAC-signed via
  `backend/src/auth/auth.ts` (no JWT dep).
- **Webhooks**: `POST /api/webhooks/square` verifies Square's HMAC signature over
  `SQUARE_WEBHOOK_URL + rawBody` using `SQUARE_WEBHOOK_SIGNATURE_KEY`. Raw body is
  captured via the `verify` callback on `express.json` (don't remove it). Events are
  stored in `webhook_events` and shown on the Sync Status page.
- **Production single-port serving**: with `SERVE_STATIC=true` (or
  `NODE_ENV=production`) the backend serves `frontend/dist` + SPA fallback on the
  same port as the API. `npm run start` (root) builds the frontend then serves it.
  `Dockerfile` + `docker-compose.yml` provide a single-container deployment.
- **Lint/typecheck/test/build**: backend has `npm run lint`, `npm run typecheck`,
  `npm test`; frontend has `npm run lint`, `npm run typecheck`, `npm run build`. The
  frontend build (`tsc -b`) type-checks `vite.config.ts`, which needs `@types/node`
  (already a devDependency).
