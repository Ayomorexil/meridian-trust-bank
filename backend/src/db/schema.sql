-- Meridian Trust Federal Credit Union — Database Schema
-- Fictional institution. Simulated banking data only. No real payment rails.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS  (both customers and staff live here, differentiated by role)
-- ============================================================
CREATE TYPE user_role AS ENUM ('customer', 'support', 'manager', 'admin', 'superadmin');
CREATE TYPE kyc_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'locked', 'closed');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_number   VARCHAR(20) UNIQUE NOT NULL,
    full_name       VARCHAR(120) NOT NULL,
    email           VARCHAR(160) UNIQUE NOT NULL,
    phone           VARCHAR(30),
    password_hash   TEXT NOT NULL,
    role            user_role NOT NULL DEFAULT 'customer',
    status          user_status NOT NULL DEFAULT 'active',
    kyc_status      kyc_status NOT NULL DEFAULT 'unverified',
    avatar_initials VARCHAR(4),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ACCOUNTS
-- ============================================================
CREATE TYPE account_type AS ENUM ('checking', 'savings', 'credit', 'investment');
CREATE TYPE account_status AS ENUM ('active', 'frozen', 'closed');

CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_type    account_type NOT NULL,
    account_number  VARCHAR(20) UNIQUE NOT NULL,
    nickname        VARCHAR(80),
    balance         NUMERIC(14, 2) NOT NULL DEFAULT 0,
    available_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    credit_limit    NUMERIC(14, 2),           -- only used for credit accounts
    apy             NUMERIC(5, 2),            -- only used for savings accounts
    savings_goal    NUMERIC(14, 2),
    status          account_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- ============================================================
-- TRANSACTIONS  (the ledger entries that actually move balances)
-- ============================================================
CREATE TYPE txn_direction AS ENUM ('debit', 'credit');
CREATE TYPE txn_status AS ENUM (
    'pending', 'completed', 'processing', 'scheduled',
    'cancelled', 'failed', 'declined', 'held', 'reversed', 'refunded', 'expired'
);

CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    direction       txn_direction NOT NULL,
    category        VARCHAR(40) NOT NULL DEFAULT 'other',
    description     VARCHAR(160) NOT NULL,
    amount          NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    balance_after   NUMERIC(14, 2),
    status          txn_status NOT NULL DEFAULT 'completed',
    related_transfer_id UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_account_id ON transactions(account_id);

-- ============================================================
-- TRANSFERS  (customer-initiated; go through the admin approval workflow)
-- ============================================================
CREATE TYPE transfer_status AS ENUM (
    'pending', 'processing', 'completed', 'scheduled',
    'cancelled', 'failed', 'declined', 'held', 'reversed', 'refunded', 'expired'
);
CREATE TYPE transfer_kind AS ENUM ('internal', 'external_ach', 'zelle', 'wire');

CREATE TABLE transfers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(20) UNIQUE NOT NULL DEFAULT ('MT-' || upper(substr(md5(random()::text), 1, 10))),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_account_id UUID NOT NULL REFERENCES accounts(id),
    to_account_id   UUID REFERENCES accounts(id),          -- null for external
    external_label  VARCHAR(120),                          -- e.g. "External Account (ACH)"
    recipient_name        VARCHAR(120),                     -- external transfers only
    external_bank_name    VARCHAR(120),                     -- external transfers only
    external_account_number VARCHAR(20),                    -- external transfers only, simulated
    external_routing_number VARCHAR(9),                     -- external transfers only, simulated ABA-style
    kind            transfer_kind NOT NULL DEFAULT 'internal',
    amount          NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    memo            VARCHAR(160),
    status          transfer_status NOT NULL DEFAULT 'pending',
    scheduled_date  DATE,
    decline_reason  VARCHAR(160),
    processed_by    UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at    TIMESTAMPTZ
);

CREATE INDEX idx_transfers_user_id ON transfers(user_id);
CREATE INDEX idx_transfers_status ON transfers(status);

-- ============================================================
-- CREDIT SCORE SNAPSHOTS
-- ============================================================
CREATE TABLE credit_scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score           SMALLINT NOT NULL CHECK (score BETWEEN 300 AND 850),
    payment_history_pct SMALLINT NOT NULL DEFAULT 100,
    usage_pct       SMALLINT NOT NULL DEFAULT 0,
    credit_age_years SMALLINT NOT NULL DEFAULT 0,
    hard_inquiries  SMALLINT NOT NULL DEFAULT 0,
    set_by_admin_id UUID REFERENCES users(id),               -- null = system-generated (e.g. seed/simulator)
    reason          VARCHAR(200),
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_scores_user_id ON credit_scores(user_id);

-- ============================================================
-- AUDIT LOGS  (every admin action that touches money or account state)
-- ============================================================
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL REFERENCES users(id),
    action          VARCHAR(60) NOT NULL,        -- e.g. 'transfer.approve', 'account.adjust_balance'
    entity_type     VARCHAR(40) NOT NULL,        -- 'transfer' | 'account' | 'user'
    entity_id       UUID NOT NULL,
    old_value       JSONB,
    new_value       JSONB,
    reason          VARCHAR(200),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);

-- ============================================================
-- NOTIFICATIONS  (in-app, generated on status changes)
-- ============================================================
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(120) NOT NULL,
    body            VARCHAR(280) NOT NULL,
    read            BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- ============================================================
-- INVESTMENTS  (simulated brokerage-style holdings linked to a savings/investment account)
-- ============================================================
CREATE TABLE investments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    symbol          VARCHAR(10) NOT NULL,
    company_name    VARCHAR(80) NOT NULL,
    shares          NUMERIC(14, 4) NOT NULL DEFAULT 0,
    avg_cost        NUMERIC(14, 2) NOT NULL DEFAULT 0,
    current_price   NUMERIC(14, 2) NOT NULL DEFAULT 0,
    daily_change_pct NUMERIC(6, 3) NOT NULL DEFAULT 0,
    last_accrued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_investments_user_id ON investments(user_id);

-- ============================================================
-- RECURRING CHARGES  (bills, subscriptions, simulated tax withholding —
-- automatically debited by the daily settlement cycle)
-- ============================================================
CREATE TYPE recurring_frequency AS ENUM ('weekly', 'monthly', 'quarterly');

CREATE TABLE recurring_charges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    payee           VARCHAR(120) NOT NULL,
    category        VARCHAR(40) NOT NULL DEFAULT 'bills',
    amount          NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    frequency       recurring_frequency NOT NULL DEFAULT 'monthly',
    next_run_date   DATE NOT NULL,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_charges_user_id ON recurring_charges(user_id);
CREATE INDEX idx_recurring_charges_next_run ON recurring_charges(next_run_date) WHERE active = true;

-- ============================================================
-- INVESTMENTS  (simulated holdings — no real market connection)
-- ============================================================
CREATE TABLE investment_holdings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    symbol          VARCHAR(10) NOT NULL,
    company_name    VARCHAR(80) NOT NULL,
    shares          NUMERIC(14, 4) NOT NULL,
    avg_cost        NUMERIC(14, 2) NOT NULL,
    current_price   NUMERIC(14, 2) NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_investment_holdings_account_id ON investment_holdings(account_id);

-- One row per simulated trading day, per holding — powers a simple sparkline
-- and gives the daily accrual something to log against.
CREATE TABLE investment_price_ticks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holding_id      UUID NOT NULL REFERENCES investment_holdings(id) ON DELETE CASCADE,
    price           NUMERIC(14, 2) NOT NULL,
    change_pct      NUMERIC(6, 3) NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_ticks_holding_id ON investment_price_ticks(holding_id);

-- ============================================================
-- RECURRING DEBITS  (subscriptions, utility bills, simulated tax withdrawals)
-- ============================================================
CREATE TYPE recurring_frequency AS ENUM ('weekly', 'monthly', 'quarterly', 'annually');
CREATE TYPE recurring_category AS ENUM ('subscription', 'utility', 'tax', 'insurance', 'loan_payment', 'other');

CREATE TABLE recurring_debits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    payee_name      VARCHAR(100) NOT NULL,
    category        recurring_category NOT NULL DEFAULT 'other',
    amount          NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    frequency       recurring_frequency NOT NULL DEFAULT 'monthly',
    next_run_date   DATE NOT NULL,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_debits_account_id ON recurring_debits(account_id);
CREATE INDEX idx_recurring_debits_next_run ON recurring_debits(next_run_date) WHERE active = true;
