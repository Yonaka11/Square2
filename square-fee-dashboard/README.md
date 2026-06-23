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

## Setup & run (two terminals)

### 1. Backend

```bash
cd backend
cp .env.example .env        # optional; leave blank to use mock data
npm install
npm run seed                # optional: (re)seed 90+ days of mock data
npm run dev                 # starts http://localhost:8080
```

> On first run, if the database has no orders, the backend **auto-seeds** mock
> data so the dashboard is immediately usable without Square credentials.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # starts http://localhost:5173
```

Open **http://localhost:5173**.

---

## Mock data vs. Square

- **No Square credentials?** The app runs entirely on realistic mock data
  (multiple orders/day across 90+ days, discounts, refunds, taxes, varied hours,
  catalog items with some missing barcodes, and a category you can exclude).
- **Re-seed anytime:** `npm run seed` in `backend/`, or click **Seed Mock Data**
  on the *Sync Status* page (`POST /api/sync/mock`).
- **Enable Square Sandbox later:** fill in `backend/.env`:
  ```
  SQUARE_ACCESS_TOKEN=...
  SQUARE_ENVIRONMENT=sandbox
  SQUARE_LOCATION_ID=...
  ```
  Then `POST /api/sync/square`. Real sync logic lives in placeholder modules
  (`backend/src/services/square/*`) and is intentionally not implemented yet; the
  endpoint returns a helpful error until it is wired up.

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
POST /api/sync/mock
POST /api/sync/square
GET  /api/exports/monthly-fee.csv?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

---

## Useful scripts

| Location   | Command           | Description                          |
| ---------- | ----------------- | ------------------------------------ |
| `backend/` | `npm run dev`     | Run API with hot reload (port 8080)  |
| `backend/` | `npm run seed`    | (Re)seed mock data into SQLite       |
| `backend/` | `npm run typecheck` | Type-check the backend             |
| `backend/` | `npm run lint`    | Lint the backend                     |
| `frontend/`| `npm run dev`     | Run UI with hot reload (port 5173)   |
| `frontend/`| `npm run build`   | Production build                     |
| `frontend/`| `npm run lint`    | Lint the frontend                    |

---

## Notes / scope (v1)

- No authentication yet.
- No Docker required.
- No cloud database or hosting.
- No Square webhooks — manual sync only.
- No destructive Square catalog changes — catalog editing is local-only for now.
