# Meridian Trust Federal Credit Union — Mobile Banking Platform (Demo)

A full-stack **simulated** online banking platform. **Meridian Trust is a fictional
institution** — no real financial brand, charter, or deposit insurance is used, and every
screen carries a visible "demo account / simulated data" watermark. This is a portfolio /
learning project: it does not connect to any real payment rails, and no real money ever
moves. Built to demonstrate full-stack engineering depth — schema design, transactional
integrity, RBAC, an audit trail, and a scheduled settlement job — for things like job
applications and technical interviews.

## Stack

- **Backend:** Node.js, Express, PostgreSQL (raw SQL via `pg-promise` — no ORM), JWT auth,
  Argon2id password hashing, `express-validator`, a custom `AppError` + `catchAsync`
  pattern, centralized error middleware, `node-cron` for the daily settlement job.
- **Frontend:** React 18 + Vite + Tailwind CSS, Zustand for state, Axios with a mock/real
  toggle (`VITE_USE_MOCK`), `HashRouter` for routing.
- **Database:** PostgreSQL, UUID primary keys.
- **Admin console:** separate `/admin` React app (same codebase) with a transfer approval
  workflow, manual balance adjustments, member suspension, and a full audit log.

## What's new in this build

- **Sign up / sign in on one screen** — new members create their own account with their own
  password (`/register` → Argon2id-hashed, JWT issued immediately). No demo credentials are
  shown in the UI anymore.
- **Admin console is not linked anywhere in the customer app.** Staff reach it directly at
  `/#/admin/login` (see "Accessing the admin console" below).
- **Real deduct-and-settle transfers.** Internal transfers debit the source account and
  credit the destination account inside a single DB transaction — the balance you see is
  the real post-transfer balance, not a mock.
- **Receipts.** Every completed transfer gets a reference number, timestamp, and
  post-transfer balance, viewable and printable at `/#/receipt/:transferId`.
- **Investment portfolio.** Simulated holdings (Tesla, Apple, NVIDIA, an S&P 500 ETF,
  Microsoft) linked to a brokerage account. A daily settlement cycle nudges each holding's
  price with a randomized walk and posts the resulting gain/loss straight into the account
  balance and transaction ledger.
- **Recurring real-world-style debits.** Seeded recurring charges — IRS estimated tax, state
  tax, utilities, wireless, health insurance premium, mortgage payment, subscriptions — each
  on its own schedule (weekly/monthly/quarterly), auto-debited by the same daily cycle.
- **Daily settlement cycle**, runs two ways:
  - Automatically every night at 00:05 via `node-cron` (`backend/src/server.js`)
  - On demand from the Admin Dashboard's **"Run Cycle Now"** button — useful for a live demo
    so you don't have to wait until midnight
- **Logo + favicon** — an SVG shield mark (`MT` monogram), used as the browser favicon and
  throughout the app (`src/components/Logo.jsx`).
- **Demo watermarking** — a visible banner on the login screen, home screen, and receipts
  makes clear this is simulated data, not a real account.

## Accessing the admin console

The admin/staff sign-in is intentionally **not linked anywhere in the customer-facing app**
— customers browsing the member app will never see or stumble into it. It's still fully
reachable, just by URL:

- Local dev: `http://localhost:5173/#/admin/login`
- The app uses `HashRouter`, so the admin route always lives after the `#`, regardless of
  where the site is deployed.

Sign in there with a `support` / `manager` / `admin` / `superadmin` role account (see the
seeded logins below, or promote a user's `role` column directly in Postgres). From the
console you get: dashboard summary, the transfer approval queue (approve / reject / hold /
release / reverse / mark failed), customer management (suspend/reactivate, manual balance
credit/debit), the daily-cycle trigger, and the full audit log.

## Quick start — frontend only (no backend, mock data)

```bash
cd frontend
cp .env.example .env        # VITE_USE_MOCK=true by default
npm install
npm run dev
```

Open http://localhost:5173 — the full member app (including investments and receipts) works
against in-memory mock data, pre-loaded as "Edward Etkinson" with the balances described
below. The admin console requires the real backend, since it needs real role-based accounts.

## Quick start — full stack with Docker

```bash
docker compose up --build
```

Starts PostgreSQL (schema auto-applied on first boot), the Express API on `:5000`, and the
React app served by nginx on `:5173` (proxying `/api` to the backend).

Seed demo data once the containers are healthy:

```bash
docker compose exec backend npm run seed
```

## Quick start — full stack, manual (no Docker)

```bash
# 1. Create a Postgres database and apply the schema
createdb meridian_trust
psql meridian_trust < backend/src/db/schema.sql

# 2. Backend
cd backend
cp .env.example .env        # edit DATABASE_URL / JWT_SECRET as needed
npm install
npm run seed                # creates demo staff + member accounts
npm run dev                 # http://localhost:5000

# 3. Frontend (in a second terminal)
cd frontend
cp .env.example .env
# set VITE_USE_MOCK=false in .env to talk to the real API
npm install
npm run dev                 # http://localhost:5173
```

## Demo logins (after seeding)

| Role | Email | Password |
|---|---|---|
| Member — Edward Etkinson (~$2.05M across checking/savings/brokerage, full transaction & investment history) | edward.etkinson@example.com | Password!2345 |
| Member — Priya Nandakumar (has a pending external transfer, for testing the admin queue) | priya.n@example.com | Password!2345 |
| Admin | admin@meridiantrust.demo | Admin!2345 |
| Superadmin | superadmin@meridiantrust.demo | SuperAdmin!2345 |

Or use the **Create Account** tab on the sign-in screen to register your own member with
your own email and password — that account starts with a checking + savings account at $0,
same as a real bank's new-member flow.

**All of the above is clearly-labeled simulated data.** Nothing in this app is, or should be
represented as, real financial standing, proof of funds, or a real institution.

## What's implemented

- JWT auth (register/login), Argon2id hashing, role-based access (`customer`, `support`,
  `manager`, `admin`, `superadmin`)
- Checking / savings / credit / brokerage accounts per member
- Internal transfers settle instantly with a real balance deduction + credit inside a DB
  transaction; external/ACH/Zelle transfers land in a **pending admin approval queue**
- Printable transfer receipts with a reference number and post-transaction balance
- Admin transfer workflow: **approve, reject, hold, release, reverse, mark failed** — every
  action is written to an immutable `audit_logs` table with admin id, reason, old/new value
- Manual account balance credit/debit by admins, always audited and always requires a reason
- Member suspend / reactivate, account freeze / unfreeze, KYC status
- Realistic banking error messages (insufficient funds, transfer limit exceeded, account
  frozen, etc.) surfaced from a shared error catalogue
- Credit score screen with a simple deterministic "what if" simulator
- Simulated investment portfolio with daily randomized price movement and automatic P&L
  posting to the linked account
- Recurring bills/taxes/subscriptions, auto-debited on schedule by the daily cycle
- In-app notifications generated on every status change (stored, not yet pushed)

## What's intentionally out of scope for this build

Cards issuance/freezing (UI only, not wired), loan origination, mobile check deposit/OCR,
and real-time chat are referenced in the UI as visual affordances but aren't wired to
backend logic — natural next phases on top of the same schema/pattern.

## Testing the API

Full endpoint-by-endpoint reference with `curl` examples for everything (including an
end-to-end smoke-test script): **[`docs/API_TESTING.md`](docs/API_TESTING.md)**.

Prefer clicking to typing? See `bruno/` — a full Bruno collection covering auth, accounts,
transfers, credit, investments, and every admin action, with login requests that
auto-save the JWT for the rest of the collection. Open the `bruno/` folder in the Bruno
app and select the `Local` environment.

## Project structure

```
meridian-trust-bank/
├── backend/
│   └── src/
│       ├── config/db.js         # pg-promise connection
│       ├── controllers/         # auth, accounts, transfers, credit, investments, admin
│       ├── services/dailyCycle.js  # investment accrual + recurring charge processing
│       ├── middleware/          # auth (protect/restrictTo), validate, errorHandler
│       ├── routes/
│       ├── db/schema.sql        # full Postgres schema
│       ├── db/seed.js           # demo data
│       └── utils/               # AppError, catchAsync, audit log + notify helpers
├── frontend/
│   └── src/
│       ├── api/                 # axios client, mock data, bank service switcher
│       ├── store/                # Zustand auth + bank stores
│       ├── components/          # Logo, DemoBanner, Shell, Topbar, BottomNav, ...
│       └── pages/                # Login (signin/signup), Home, Accounts, Transfer,
│                                  # Credit, Investments, Receipt, More, admin/*
├── bruno/                       # API test collection
└── docker-compose.yml
```
