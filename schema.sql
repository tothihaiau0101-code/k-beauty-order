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
