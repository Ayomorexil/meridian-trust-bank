# API Testing Guide — Meridian Trust Backend

Every endpoint in the API, what it does, what it needs, and a copy-pasteable `curl`
command for it. Matching Bruno requests exist in `bruno/` if you'd rather click than
type (see the note at the end).

## 0. Before you start

```bash
cd backend
npm install
npm run seed     # creates the demo accounts described below
npm run dev       # API now running on http://localhost:5000
```

All requests below assume `http://localhost:5000/api` as the base URL. Every response
is JSON, shaped as `{ status, data: {...} }` on success or `{ status, code, message }`
on failure.

**Auth pattern used throughout:** log in once, grab `token` from the response, then pass
it as `Authorization: Bearer <token>` on every subsequent request. To make the examples
copy-pasteable, save it to a shell variable:

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"edward.etkinson@example.com","password":"Password!2345"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

echo $TOKEN
```

(No `jq`? The Python one-liner above works anywhere Python 3 is installed. If you have
`jq`: `... | jq -r .token`.)

For the admin section, do the same with an admin login into a separate variable, e.g. `ADMIN_TOKEN`.

---

## 1. Health check

**`GET /api/health`** — no auth. Confirms the server is up.

```bash
curl http://localhost:5000/api/health
```
Expected: `{"status":"ok","service":"meridian-trust-api"}`

---

## 2. Auth

### `POST /api/auth/register`
Creates a new member. No auth required. Automatically provisions a checking + savings
account at $0 and a starter credit score, and returns a token immediately (no separate
login step needed after registering).

| Field | Type | Required | Notes |
|---|---|---|---|
| fullName | string | yes | |
| email | string | yes | must be unique |
| password | string | yes | min 8 characters |
| phone | string | no | |

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test.user@example.com",
    "password": "Password!2345",
    "phone": "+1-914-555-0100"
  }'
```
Success (201): `{ status: "success", token, data: { user: {...} } }`
Failure (409): email already exists.

### `POST /api/auth/login`
No auth required.

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"edward.etkinson@example.com","password":"Password!2345"}'
```
Success (200): `{ status: "success", token, data: { user } }`
Failure (401): wrong email/password, or `code: "INVALID_CREDENTIALS"`.
Failure (403): account suspended/locked, `code: "ACCOUNT_LOCKED"`.

### `GET /api/auth/me`
Requires auth. Returns the currently logged-in user's profile.

```bash
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer $TOKEN"
```

---

## 3. Accounts *(all require `Authorization: Bearer $TOKEN`)*

### `GET /api/accounts`
Lists every account owned by the logged-in member (checking, savings, credit, brokerage).

```bash
curl http://localhost:5000/api/accounts -H "Authorization: Bearer $TOKEN"
```

Tip: grab an account id out of the response for the requests below:
```bash
CHECKING_ID=$(curl -s http://localhost:5000/api/accounts -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin)['data']['accounts']; print(next(a['id'] for a in d if a['account_type']=='checking'))")
```

### `GET /api/accounts/:id`
Single account detail. 404 if it doesn't belong to you.

```bash
curl http://localhost:5000/api/accounts/$CHECKING_ID -H "Authorization: Bearer $TOKEN"
```

### `GET /api/accounts/:id/transactions?limit=10`
Transaction history for one account, most recent first. `limit` optional, max 100, default 25.

```bash
curl "http://localhost:5000/api/accounts/$CHECKING_ID/transactions?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### `GET /api/accounts/activity/recent?limit=10`
Merged activity feed across *all* of your accounts — this is what powers the Home screen.

```bash
curl "http://localhost:5000/api/accounts/activity/recent?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4. Transfers *(all require auth)*

### `POST /api/transfers`
Creates a transfer. Two distinct behaviors depending on the body you send:

**Internal (own account → own/another account)** — settles instantly. Debits the source,
credits the destination, both inside one DB transaction, and the transfer comes back
`status: "completed"`.

```bash
curl -X POST http://localhost:5000/api/transfers \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{
    \"fromAccountId\": \"$CHECKING_ID\",
    \"toAccountId\": \"$SAVINGS_ID\",
    \"amount\": 250.00,
    \"memo\": \"curl test\"
  }"
```

**External (ACH/Zelle/wire)** — no `toAccountId`; lands as `status: "pending"` in the admin
approval queue instead of moving money immediately.

```bash
curl -X POST http://localhost:5000/api/transfers \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": "'$CHECKING_ID'",
    "kind": "external_ach",
    "externalLabel": "External Account (ACH)",
    "amount": 150.00,
    "memo": "Rent"
  }'
```

Error cases you can trigger on purpose to see the banking-style error messages:
- Amount > $10,000 → 400, `code: "TRANSFER_LIMIT_EXCEEDED"`
- Amount > available balance → 400, `code: "INSUFFICIENT_FUNDS"`
- `toAccountId` equal to `fromAccountId` → 400, `code: "SAME_ACCOUNT_TRANSFER"`
- Destination account frozen → 403, `code: "ACCOUNT_FROZEN"`

### `GET /api/transfers`
Your transfer history, most recent first.

```bash
curl http://localhost:5000/api/transfers -H "Authorization: Bearer $TOKEN"
```

### `PATCH /api/transfers/:id/cancel`
Cancels your own transfer — only works while it's still `pending`/`scheduled` (i.e. an
external transfer that hasn't been approved yet). Releases the held funds back to your
available balance.

```bash
curl -X PATCH http://localhost:5000/api/transfers/$TRANSFER_ID/cancel \
  -H "Authorization: Bearer $TOKEN"
```

### `GET /api/transfers/:id/receipt`
Full receipt for one of your own transfers — reference number, both parties, timestamps,
resulting balance. This is what the app's Receipt screen renders.

```bash
curl http://localhost:5000/api/transfers/$TRANSFER_ID/receipt -H "Authorization: Bearer $TOKEN"
```

---

## 5. Credit *(all require auth)*

### `GET /api/credit/score`
Current credit score + factor breakdown (payment history, utilization, credit age, hard inquiries).

```bash
curl http://localhost:5000/api/credit/score -H "Authorization: Bearer $TOKEN"
```

### `POST /api/credit/simulate`
"What if" projector. `scenario` is one of: `payoff_credit_card`, `lower_utilization`,
`on_time_payments_6mo`.

```bash
curl -X POST http://localhost:5000/api/credit/simulate \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"scenario": "payoff_credit_card"}'
```

---

## 6. Investments *(requires auth)*

### `GET /api/investments`
Your holdings (symbol, shares, avg cost, current price, market value, all-time gain/loss)
plus total portfolio value.

```bash
curl http://localhost:5000/api/investments -H "Authorization: Bearer $TOKEN"
```

To actually see prices move, run the admin daily cycle (§7) and call this again — the
`current_price` and `totalGainLoss` fields will have changed.

---

## 7. Admin *(all require `Authorization: Bearer $ADMIN_TOKEN`, staff role)*

Log in as staff first:
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@meridiantrust.demo","password":"Admin!2345"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
```

Role gates, so you know what needs what:
- `support` — read-only: dashboard, list customers/transfers, hold/release/reject/cancel/fail transfers, lock/unlock customers
- `manager` and up — adds: suspend/reactivate customers, approve transfers, freeze/unfreeze accounts, KYC changes
- `admin` and up — adds: manual balance adjustments, reverse transfers, run the daily cycle
- `superadmin` — same permissions as `admin` in this build (no action is gated tighter than `admin`)

### `GET /api/admin/dashboard/summary`
```bash
curl http://localhost:5000/api/admin/dashboard/summary -H "Authorization: Bearer $ADMIN_TOKEN"
```
Returns member count, count of transfers awaiting action, total deposits on the books, and 24h approved transfer volume.

### `GET /api/admin/customers?search=&status=`
Both query params optional. `search` matches name/email/member number (ILIKE). `status` is `active`/`suspended`/`locked`/`closed`.
```bash
curl "http://localhost:5000/api/admin/customers?search=Priya" -H "Authorization: Bearer $ADMIN_TOKEN"
```

### `GET /api/admin/customers/:id`
Customer profile + all of their accounts.
```bash
curl http://localhost:5000/api/admin/customers/$CUSTOMER_ID -H "Authorization: Bearer $ADMIN_TOKEN"
```

### `PATCH /api/admin/customers/:id/suspend` *(manager+)*
Body: `{ "reason": "..." }` — optional but recommended, goes to the audit log.
```bash
curl -X PATCH http://localhost:5000/api/admin/customers/$CUSTOMER_ID/suspend \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"Suspicious login pattern"}'
```

### `PATCH /api/admin/customers/:id/reactivate` *(manager+)*
```bash
curl -X PATCH http://localhost:5000/api/admin/customers/$CUSTOMER_ID/reactivate \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### `PATCH /api/admin/customers/:id/lock` / `.../unlock`
Same shape as suspend/reactivate, any staff role.

### `PATCH /api/admin/customers/:id/kyc` *(manager+)*
Body: `{ "status": "verified" | "rejected" | "pending", "reason": "..." }`
```bash
curl -X PATCH http://localhost:5000/api/admin/customers/$CUSTOMER_ID/kyc \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"verified","reason":"ID document reviewed"}'
```

### `PATCH /api/admin/accounts/:id/freeze` / `.../unfreeze` *(manager+)*
Body: `{ "reason": "..." }`
```bash
curl -X PATCH http://localhost:5000/api/admin/accounts/$ACCOUNT_ID/freeze \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"Fraud review"}'
```

### `POST /api/admin/accounts/:id/adjust` *(admin+)*
Direct manual credit/debit. `reason` is **required**. Always audited.

| Field | Type | Notes |
|---|---|---|
| amount | number | > 0 |
| direction | "credit" \| "debit" | |
| reason | string | required |
| category | string | optional, defaults to `admin_adjustment` |

```bash
curl -X POST http://localhost:5000/api/admin/accounts/$ACCOUNT_ID/adjust \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"amount": 500, "direction": "credit", "reason": "Goodwill credit — service outage"}'
```

### `GET /api/admin/transfers?status=pending`
`status` optional — omit to see everything. Valid values: `pending`, `processing`, `held`,
`scheduled`, `completed`, `declined`, `cancelled`, `failed`, `reversed`.
```bash
curl "http://localhost:5000/api/admin/transfers?status=pending" -H "Authorization: Bearer $ADMIN_TOKEN"
```

### `PATCH /api/admin/transfers/:id/approve` *(manager+)*
Moves money for real: debits the source, credits the destination (if internal), status → `completed`.
```bash
curl -X PATCH http://localhost:5000/api/admin/transfers/$TRANSFER_ID/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"Verified with member by phone"}'
```

### `PATCH /api/admin/transfers/:id/reject` — reason **required**
Releases the hold, status → `declined`.
```bash
curl -X PATCH http://localhost:5000/api/admin/transfers/$TRANSFER_ID/reject \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"Recipient details could not be verified"}'
```

### `PATCH /api/admin/transfers/:id/cancel` — reason required
Same mechanics as reject, status → `cancelled`.

### `PATCH /api/admin/transfers/:id/hold` — reason required
Pauses the transfer for review without releasing the hold on funds. Status → `held`.
```bash
curl -X PATCH http://localhost:5000/api/admin/transfers/$TRANSFER_ID/hold \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"Flagged for manual review"}'
```

### `PATCH /api/admin/transfers/:id/release`
Only works on a `held` transfer — puts it back to `pending`. No reason required.
```bash
curl -X PATCH http://localhost:5000/api/admin/transfers/$TRANSFER_ID/release \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### `PATCH /api/admin/transfers/:id/fail` — reason required
Releases the hold, status → `failed` (e.g. "receiving bank unavailable").

### `PATCH /api/admin/transfers/:id/reverse` *(admin+)* — reason required
Only works on a `completed` (or `refunded`) transfer. Fully unwinds the ledger entries —
credits the source back, debits the destination back if internal. Status → `reversed`.
```bash
curl -X PATCH http://localhost:5000/api/admin/transfers/$TRANSFER_ID/reverse \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"Duplicate transaction detected"}'
```

### `GET /api/admin/audit-logs` *(manager+)*
Every admin action above, with admin identity, action name, old/new value, and reason.
```bash
curl http://localhost:5000/api/admin/audit-logs -H "Authorization: Bearer $ADMIN_TOKEN"
```

### `POST /api/admin/simulate/run-daily-cycle` *(admin+)*
Manually triggers what otherwise runs automatically every night at 00:05 (`node-cron`,
see `src/server.js`): a randomized daily price move for every investment holding (posted
straight into the linked account balance), plus processing of any recurring
bill/tax/subscription charge whose `next_run_date` has arrived.
```bash
curl -X POST http://localhost:5000/api/admin/simulate/run-daily-cycle \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
Response includes a per-holding list of price % moves and dollar deltas, and a per-charge
list of what was paid vs. declined (declined if the account didn't have enough available
balance — this is realistic, not a bug).

---

## End-to-end smoke test (copy/paste block)

Runs through the whole system in order: register → login → view accounts → internal
transfer → receipt → investments → admin login → approve a pending transfer → run the
daily cycle → audit log.

```bash
BASE=http://localhost:5000/api

# 1. Member login
TOKEN=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"edward.etkinson@example.com","password":"Password!2345"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# 2. Accounts
curl -s $BASE/accounts -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

CHECKING_ID=$(curl -s $BASE/accounts -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin)['data']['accounts']; print(next(a['id'] for a in d if a['account_type']=='checking'))")
SAVINGS_ID=$(curl -s $BASE/accounts -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin)['data']['accounts']; print(next(a['id'] for a in d if a['account_type']=='savings'))")

# 3. Internal transfer (settles instantly)
TRANSFER=$(curl -s -X POST $BASE/transfers -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"fromAccountId\":\"$CHECKING_ID\",\"toAccountId\":\"$SAVINGS_ID\",\"amount\":100,\"memo\":\"smoke test\"}")
echo $TRANSFER | python3 -m json.tool
TRANSFER_ID=$(echo $TRANSFER | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['transfer']['id'])")

# 4. Receipt
curl -s $BASE/transfers/$TRANSFER_ID/receipt -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 5. Investments
curl -s $BASE/investments -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 6. Admin login
ADMIN_TOKEN=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@meridiantrust.demo","password":"Admin!2345"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# 7. Run the daily cycle and watch prices move
curl -s -X POST $BASE/admin/simulate/run-daily-cycle -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# 8. Confirm the audit trail picked it up
curl -s $BASE/admin/audit-logs -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool
```

---

## Prefer clicking to typing?

Open the `bruno/` folder in the [Bruno app](https://www.usebruno.com/) (File → Open
Collection), select the **Local** environment, and run requests in numbered order within
each folder (Auth → Accounts → Transfers → Credit → Investments → Admin). The login
requests have a post-response script that automatically saves the token into the
environment, so everything downstream just works without copy-pasting anything.
