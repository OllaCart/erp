# Module 09 — Finance Manager
# Dash ERP System Specification

## Purpose

Track revenue, expenses, and burn rate across all three businesses.
SwiftFi is actively generating revenue — this module tracks it closely.
Claude provides weekly financial summaries and alerts on anomalies.

## Financial Data Per Business

  SwiftFi:
    - Revenue: transaction fees from crypto onramp
    - Expenses: infrastructure, APIs, developer salary/contract
    - Key metric: revenue per transaction, monthly active users, MRR

  UnbeatableLoans:
    - Revenue: not yet (pre-revenue)
    - Expenses: domain, hosting, development costs
    - Key metric: burn rate, time to first loan closed

  OllaCart:
    - Revenue: not yet (pre-revenue)
    - Expenses: domain, hosting, Rye API costs
    - Key metric: burn rate, Rye API integration progress

## Supabase Schema

  Table: financial_accounts
    id: uuid PRIMARY KEY
    business_id: text NOT NULL
    account_name: text                  -- "Stripe", "Bank of America Checking", "Mercury"
    account_type: text                  -- "revenue" | "bank" | "credit_card" | "payment_processor"
    currency: text DEFAULT 'USD'
    current_balance: decimal
    last_synced_at: timestamp
    is_active: boolean DEFAULT true

  Table: transactions
    id: uuid PRIMARY KEY
    business_id: text NOT NULL
    account_id: uuid REFERENCES financial_accounts(id)
    transaction_type: text              -- "revenue" | "expense" | "transfer"
    category: text                      -- "infrastructure" | "salary" | "marketing" |
                                       --  "legal" | "tools" | "transaction_fee" | "other"
    amount: decimal NOT NULL            -- positive = inflow, negative = outflow
    description: text
    vendor: text
    transaction_date: date
    month: text                         -- "2025-01" for grouping
    source: text                        -- "manual" | "stripe_webhook" | "bank_import"
    stripe_payment_id: text
    created_at: timestamp DEFAULT now()

  Table: monthly_summaries
    id: uuid PRIMARY KEY
    business_id: text NOT NULL
    month: text NOT NULL                -- "2025-01"
    total_revenue: decimal DEFAULT 0
    total_expenses: decimal DEFAULT 0
    net: decimal DEFAULT 0
    gross_margin: decimal
    transaction_count: integer
    notes: text
    created_at: timestamp DEFAULT now()

## API Routes

  GET /api/finance/summary
    - Returns financial summary per business
    - Params: business_id?, month?, period (month|quarter|year)

  GET /api/finance/transactions
    - List transactions with filters
    - Params: business_id, type, category, month, limit

  POST /api/finance/transactions
    - Add manual transaction

  GET /api/finance/mrr
    - Monthly Recurring Revenue for SwiftFi
    - Returns MRR trend over last 12 months

  POST /api/finance/stripe-webhook
    - Receive Stripe payment events (for SwiftFi)
    - Auto-creates revenue transactions

## Stripe Integration (SwiftFi)

  File: /app/api/webhooks/stripe/route.ts
  File: /lib/stripe.ts

  Events to handle:
    payment_intent.succeeded  → create positive transaction (revenue)
    charge.refunded           → create negative transaction (refund)
    invoice.paid              → create positive transaction (subscription)

  Stripe webhook setup:
    Endpoint: /api/webhooks/stripe
    Secret: STRIPE_WEBHOOK_SECRET env var
    Events: payment_intent.succeeded, charge.refunded, invoice.paid

## Key Metrics Per Business

  SwiftFi:
    - MRR (Monthly Recurring Revenue)
    - Transaction volume (count and dollar amount)
    - Average transaction size
    - Revenue growth MoM (%)
    - Gross margin per transaction
    - Top expense categories

  UnbeatableLoans:
    - Monthly burn rate
    - Runway (months of runway left)
    - Cost to close first loan (track all costs)

  OllaCart:
    - Monthly burn rate
    - Runway
    - Rye API costs per month

## Claude Financial Intelligence

  Weekly financial brief (every Friday):
    - Revenue this week vs last week (SwiftFi)
    - Top expenses this week
    - Burn rate trend
    - Runway estimate
    - Anomaly alerts ("SwiftFi revenue dropped 30% this week")
    - Recommendations ("Consider reducing Rye API polling frequency — $X/month")

  Monthly close (1st of each month):
    - Full P&L summary per business
    - MoM comparisons
    - Projections based on trend
    - "At current burn rate, UnbeatableLoans has X months of runway"

## UI Components

  File: /components/finance/FinanceView.tsx

  Layout:
    - Business tabs at top
    - Summary cards: Revenue, Expenses, Net, Runway
    - Charts: Revenue trend (line), Expense breakdown (donut)
    - Transactions list with category badges

  Summary cards (per business):
    SwiftFi:          MRR | This Month Revenue | This Month Expenses | Net
    UnbeatableLoans:  Monthly Burn | Runway | Total Spent to Date
    OllaCart:         Monthly Burn | Runway | Total Spent to Date

  Transaction entry:
    - Manual entry form: amount, category, description, date, business
    - Import from CSV (bank statement upload)

  Charts:
    - Revenue by month (last 12 months) — SwiftFi focus
    - Expense categories pie chart per business
    - Burn rate trend (all businesses)

## Manual Data Entry

  Until bank APIs are connected, all transactions entered manually or via CSV import.
  CSV import format: date, description, amount, category
  Claude auto-categorizes transactions from description during import.

  Future integrations (not in MVP):
    - Plaid (bank account sync)
    - Mercury API (if using Mercury bank)
    - QuickBooks sync
