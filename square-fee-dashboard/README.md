# Square Fee Dashboard

A **local-first** business dashboard for Square sellers. It calculates a monthly
**location fee** (default **25%**) owed on eligible sales after deducting refunds,
discounts, taxes (if configured), and excluded categories. It also provides sales
analytics and a local catalog manager.

Everything runs on your machine. Data is stored in a local SQLite file
(`./data/square_dashboard.db`). The frontend **never** calls Square directly — the
backend owns all Square API calls and stores normalized data locally.

---

## Tech stack

| Layer      | Technology                                  |
| ---------- | ------------------------------------------- |
| Frontend   | React + Vite + TypeScript + Tailwind CSS    |
| Charts     | Recharts                                    |
| Backend    | Node.js + Express + TypeScript              |
| Database   | SQLite (via `better-sqlite3`), integer cents|
| Routing    | React Router                                |

---

## Project structure

```
square-fee-dashboard/
  frontend/   # React + Vite app (http://localhost:5173)
  backend/    # Express API + SQLite (http://localhost:8080)
  data/       # Local SQLite database lives here
  exports/    # Place for exported CSV files
  README.md
  .gitignore
  .env.example
```

---

## Prerequisites

- Node.js 18+ (tested on Node 22)
- npm

---

## Quick start (one command)

From the `square-fee-dashboard/` folder:

```bash
npm run install:all   # installs backend + frontend deps
npm run dev           # runs backend (8080) AND frontend (5173) together
```

Then open **http://localhost:5173**. The app uses **only real Square data** (no
mock data): configure Square credentials (below) and run a sync to load data.
Root scripts also: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

Prefer running each service in its own terminal? Use the two-terminal flow below.

## Setup & run (two terminals)

### 1. Backend

```bash
cd backend
cp .env.example .env        # fill in your Square credentials
npm install
npm run dev                 # starts http://localhost:8080
```

> The app uses only real Square data. On first run the database is empty until
> you run a Square sync (`POST /api/sync/square` or the "Sync from Square" button).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # starts http://localhost:5173
```

Open **http://localhost:5173**.

---

## Data: Square only (no mock data)

This app uses **only real Square data** — there is no mock/sample data.

- **Configure credentials** in `backend/.env`:
  ```
  SQUARE_ACCESS_TOKEN=...
  SQUARE_ENVIRONMENT=sandbox      # use your live environment value for real data
  SQUARE_LOCATION_ID=...
  ```
- **Sync:** `POST /api/sync/square` (or click **Sync from Square** on the Sync
  Status page). This runs a **read-only** sync (locations → catalog → orders →
  payments → refunds) via Square's REST API and stores normalized data locally.
  Without credentials the endpoint returns a helpful error and the dashboard
  stays empty until a successful sync.

  Implementation: `backend/src/services/square/` — `squareClient.ts` (authenticated
  REST fetch), `normalize.ts` (pure Square→DB normalizers, unit-tested in
  `normalize.test.ts`), and `sync{Catalog,Orders,Payments,Refunds}.ts` orchestrated
  by `runSync.ts`. We call the REST API directly (no SDK) to keep money handling in
  integer cents and avoid SDK version churn. No destructive Square writes are made.

---

## The fee calculation

All money is stored and computed in **integer cents** (never floating point).

```
gross sales
  - refunds
  - discounts                (only if "discounts reduce" is enabled)
  - excluded category sales  (gross sales of excluded categories)
  - taxes                    (only if "taxes excluded" is enabled)
= fee-liable sales

fee owed = fee-liable sales × fee percentage
```

The fee percentage and all toggles are configurable on the **Fee Rules Settings**
page and persisted to SQLite. See `backend/src/services/feeCalculator.ts` for the
fully-commented implementation.

---

## Production deployment (single port)

Run the whole app (API + built UI) on one port:

```bash
# From square-fee-dashboard/
npm run start          # builds the frontend, then serves it + API on :8080
# open http://localhost:8080
```

Or with Docker:

```bash
docker compose up --build      # serves on http://localhost:8080
```

The container serves the built frontend and the API together; `./data` is mounted
so the SQLite database persists across restarts.

## Authentication (optional)

Auth is **off by default** for frictionless local use. To require an admin
sign-in, set `ADMIN_PASSWORD` (and optionally `SESSION_SECRET`) in `backend/.env`.
When enabled, the frontend shows a login screen and all `/api` routes (except
`/api/auth/*`, `/api/health`, `/api/webhooks/*`) require a signed bearer token.

## Webhooks (optional)

`POST /api/webhooks/square` receives Square notifications. When
`SQUARE_WEBHOOK_SIGNATURE_KEY` and `SQUARE_WEBHOOK_URL` are set, payloads are
HMAC-SHA256 verified (Square's scheme) and rejected with `401` if invalid.
Received events are stored and shown on the **Sync Status** page. v1 records
events; triggering incremental sync from a webhook is a future enhancement
(manual sync remains the primary path).

## Pages

1. **Dashboard Overview** — key metric cards for the current month.
2. **Monthly Location Fee Report** — date-range selector, category breakdown,
   full fee math, CSV export, and save-snapshot.
3. **Sales Analytics** — sales by day/day-of-week/hour, busiest & slowest
   days/hours, top items & categories, refund rate, discount impact, avg ticket.
4. **Catalog Manager** — view/add/edit local catalog items (SKU, barcode,
   inventory), plus missing-barcode and uncategorized reports.
5. **Fee Rules Settings** — configure fee %, excluded categories, tax/discount
   toggles, and refund deduction method.
6. **Sync Status** — last sync, per-table counts, and recent sync log.

---

## API routes

```
GET  /api/dashboard/overview
GET  /api/reports/monthly-fee?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET  /api/reports/sales-analytics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
POST /api/reports/snapshots
GET  /api/reports/snapshots
GET  /api/catalog/items
POST /api/catalog/items
PUT  /api/catalog/items/:id
GET  /api/catalog/reports/missing-barcode
GET  /api/catalog/reports/uncategorized
GET  /api/settings/fee-rules
PUT  /api/settings/fee-rules
GET  /api/settings/categories
GET  /api/sync/status
POST /api/sync/square
GET  /api/exports/monthly-fee.csv?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
GET  /api/auth/status
POST /api/auth/login
POST /api/webhooks/square
GET  /api/webhooks/recent
```

---

## Useful scripts

| Location   | Command           | Description                          |
| ---------- | ----------------- | ------------------------------------ |
| `backend/` | `npm run dev`     | Run API with hot reload (port 8080)  |
| `backend/` | `npm test`        | Run unit tests                       |
| `backend/` | `npm run typecheck` | Type-check the backend             |
| `backend/` | `npm run lint`    | Lint the backend                     |
| `frontend/`| `npm run dev`     | Run UI with hot reload (port 5173)   |
| `frontend/`| `npm run build`   | Production build                     |
| `frontend/`| `npm run lint`    | Lint the frontend                    |

---

## Notes / scope

- Authentication is optional (off by default; enable with `ADMIN_PASSWORD`).
- Docker is optional — local dev needs only Node.
- No cloud database; SQLite stays local. Single-port self-hosting is supported.
- Square webhooks are received & verified; manual sync remains the primary path.
- No destructive Square catalog changes — catalog editing is local-only for now.
