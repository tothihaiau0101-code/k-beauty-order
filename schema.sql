-- BeaPop D1 Schema
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  address TEXT,
  items TEXT,
  total REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  note TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  stock INTEGER DEFAULT 0,
  price REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT,
  action TEXT,
  qty INTEGER,
  note TEXT,
  stock_after INTEGER,
  timestamp TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS customers (
  customerId   TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT UNIQUE NOT NULL,
  email        TEXT DEFAULT '',
  address      TEXT DEFAULT '',
  loyalty_tier TEXT DEFAULT 'Bronze',
  total_orders INTEGER DEFAULT 0,
  total_spent  REAL DEFAULT 0,
  joined_at    TEXT DEFAULT (datetime('now', 'localtime')),
  note         TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_tier  ON customers(loyalty_tier);
