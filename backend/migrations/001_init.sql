CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  type        TEXT        NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  color       TEXT        NOT NULL DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id           SERIAL PRIMARY KEY,
  description  TEXT          NOT NULL,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  type         TEXT          NOT NULL CHECK (type IN ('expense', 'income')),
  category_id  INTEGER       REFERENCES categories(id) ON DELETE SET NULL,
  occurred_on  DATE          NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_occurred_on ON transactions (occurred_on);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category_id);
