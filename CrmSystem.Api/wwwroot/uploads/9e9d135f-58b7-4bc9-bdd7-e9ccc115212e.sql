-- =====================================================================
-- CRM System — Database Schema (PostgreSQL)
-- Generated from: CRM Project Documentation, Section 4.3
-- =====================================================================
-- Run with:  psql -U <user> -d <database> -f crm_schema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- Clean slate (safe to re-run during development)
-- Comment this block out once you have real data you don't want to lose.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS interactions CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS deals CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS customer_status_enum;
DROP TYPE IF EXISTS lead_source_enum;
DROP TYPE IF EXISTS lead_stage_enum;
DROP TYPE IF EXISTS deal_stage_enum;
DROP TYPE IF EXISTS ticket_status_enum;
DROP TYPE IF EXISTS ticket_priority_enum;
DROP TYPE IF EXISTS interaction_type_enum;
DROP TYPE IF EXISTS user_role_enum;

-- ---------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------
CREATE TYPE customer_status_enum   AS ENUM ('lead', 'active', 'churned');
CREATE TYPE lead_source_enum       AS ENUM ('website', 'referral', 'cold_call', 'ad');
CREATE TYPE lead_stage_enum        AS ENUM ('new', 'contacted', 'qualified', 'lost');
CREATE TYPE deal_stage_enum        AS ENUM ('prospecting', 'negotiation', 'won', 'lost');
CREATE TYPE ticket_status_enum     AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority_enum   AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE interaction_type_enum  AS ENUM ('call', 'email', 'meeting', 'note');
CREATE TYPE user_role_enum         AS ENUM ('admin', 'sales', 'support');

-- ---------------------------------------------------------------------
-- USERS  (internal staff: admins, sales reps, support agents)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role_enum NOT NULL DEFAULT 'sales',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- COMPANIES  (optional parent org for B2B customers)
-- ---------------------------------------------------------------------
CREATE TABLE companies (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    industry        VARCHAR(100),
    website         VARCHAR(200),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- CUSTOMERS  (core entity — the person or organization being managed)
-- ---------------------------------------------------------------------
CREATE TABLE customers (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    phone           VARCHAR(30),
    company_id      INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    status          customer_status_enum NOT NULL DEFAULT 'lead',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- LEADS  (a potential, unconverted customer)
-- ---------------------------------------------------------------------
CREATE TABLE leads (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    source          lead_source_enum NOT NULL,
    stage           lead_stage_enum NOT NULL DEFAULT 'new',
    assigned_to     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- DEALS  (an active sales opportunity with monetary value)
-- ---------------------------------------------------------------------
CREATE TABLE deals (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    title           VARCHAR(150) NOT NULL,
    value           DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (value >= 0),
    stage           deal_stage_enum NOT NULL DEFAULT 'prospecting',
    assigned_to     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    close_date      DATE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- TICKETS  (support issues / cases)
-- ---------------------------------------------------------------------
CREATE TABLE tickets (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subject         VARCHAR(150) NOT NULL,
    description     TEXT,
    status          ticket_status_enum NOT NULL DEFAULT 'open',
    priority        ticket_priority_enum NOT NULL DEFAULT 'medium',
    assigned_to     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMP,
    CHECK (resolved_at IS NULL OR resolved_at >= created_at)
);

-- ---------------------------------------------------------------------
-- INTERACTIONS  (calls, emails, meetings, notes logged against a customer)
-- ---------------------------------------------------------------------
CREATE TABLE interactions (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type            interaction_type_enum NOT NULL,
    summary         TEXT NOT NULL,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- INDEXES  (speed up the lookups the app will do most often)
-- ---------------------------------------------------------------------
CREATE INDEX idx_customers_company_id   ON customers(company_id);
CREATE INDEX idx_customers_status       ON customers(status);

CREATE INDEX idx_leads_customer_id      ON leads(customer_id);
CREATE INDEX idx_leads_assigned_to      ON leads(assigned_to);
CREATE INDEX idx_leads_stage            ON leads(stage);

CREATE INDEX idx_deals_customer_id      ON deals(customer_id);
CREATE INDEX idx_deals_assigned_to      ON deals(assigned_to);
CREATE INDEX idx_deals_stage            ON deals(stage);

CREATE INDEX idx_tickets_customer_id    ON tickets(customer_id);
CREATE INDEX idx_tickets_assigned_to    ON tickets(assigned_to);
CREATE INDEX idx_tickets_status         ON tickets(status);
CREATE INDEX idx_tickets_priority       ON tickets(priority);

CREATE INDEX idx_interactions_customer_id ON interactions(customer_id);
CREATE INDEX idx_interactions_created_at  ON interactions(created_at);

-- ---------------------------------------------------------------------
-- SAMPLE SEED DATA  (optional — comment out for production)
-- Useful for testing the app immediately after setup.
-- ---------------------------------------------------------------------
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Admin User',   'admin@example.com',   'CHANGE_ME_HASH', 'admin'),
    ('Sarah Sales',  'sarah@example.com',   'CHANGE_ME_HASH', 'sales'),
    ('Tom Support',  'tom@example.com',     'CHANGE_ME_HASH', 'support');

INSERT INTO companies (name, industry, website) VALUES
    ('Acme Retail Ltd.', 'Retail', 'https://acme-retail.example.com');

INSERT INTO customers (name, email, phone, company_id, status) VALUES
    ('John Doe',  'john.doe@example.com',  '+251911000001', 1, 'active'),
    ('Mary Kebede', 'mary.k@example.com',  '+251911000002', NULL, 'lead');

INSERT INTO leads (customer_id, source, stage, assigned_to) VALUES
    (2, 'website', 'contacted', 2);

INSERT INTO deals (customer_id, title, value, stage, assigned_to, close_date) VALUES
    (1, 'Annual Subscription Renewal', 1200.00, 'negotiation', 2, '2026-08-15');

INSERT INTO tickets (customer_id, subject, description, status, priority, assigned_to) VALUES
    (1, 'Login issue', 'Customer cannot log into their account.', 'open', 'high', 3);

INSERT INTO interactions (customer_id, type, summary, created_by) VALUES
    (1, 'call', 'Discussed renewal terms, customer requested discount.', 2);

-- =====================================================================
-- End of schema
-- =====================================================================
