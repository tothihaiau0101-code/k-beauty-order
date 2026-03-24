import sqlite3
import json
import os
import time
import logging
from contextlib import contextmanager
from typing import Any, Dict, List, Optional
from datetime import datetime

logger = logging.getLogger("KBeautyBot.DB")

class SqliteStore:
    def __init__(self, db_path: str = "data/shop.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path) or ".", exist_ok=True)
        self.init_db()

    @contextmanager
    def get_db(self):
        conn = sqlite3.connect(self.db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init_db(self):
        with self.get_db() as db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS orders (
                    id TEXT PRIMARY KEY,
                    data TEXT,
                    created_at TEXT
                );
                CREATE TABLE IF NOT EXISTS stock (
                    id TEXT PRIMARY KEY,
                    data TEXT
                );
                CREATE TABLE IF NOT EXISTS inventory_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id TEXT,
                    action TEXT,
                    qty INTEGER,
                    note TEXT,
                    stock_after INTEGER,
                    timestamp TEXT
                );
                CREATE TABLE IF NOT EXISTS customers (
                    chat_id TEXT PRIMARY KEY,
                    data TEXT
                );
                CREATE TABLE IF NOT EXISTS chats (
                    session_id TEXT PRIMARY KEY,
                    data TEXT,
                    last_activity TEXT
                );
            ''')

    # ---- MIGRATION HELPER (optional call) ----
    def migrate_from_json(self, orders_file: str, stock_file: str, chats_file: str, customers_file: str, history_file: str):
        try:
            with self.get_db() as db:
                db.execute("PRAGMA foreign_keys = OFF;")
                
                # Orders
                if os.path.exists(orders_file):
                    with open(orders_file, 'r', encoding='utf-8') as f:
                        for row in json.load(f):
                            oid = row.get("orderId", row.get("id"))
                            if oid:
                                db.execute("INSERT OR IGNORE INTO orders (id, data, created_at) VALUES (?, ?, ?)",
                                          (oid, json.dumps(row, ensure_ascii=False), row.get("created_at", "")))
                
                # Stock
                if os.path.exists(stock_file):
                    with open(stock_file, 'r', encoding='utf-8') as f:
                        for row in json.load(f):
                            if row.get("id"):
                                db.execute("INSERT OR IGNORE INTO stock (id, data) VALUES (?, ?)",
                                          (row["id"], json.dumps(row, ensure_ascii=False)))
                
                # History
                if os.path.exists(history_file):
                    with open(history_file, 'r', encoding='utf-8') as f:
                        for row in json.load(f):
                            db.execute("INSERT OR IGNORE INTO inventory_history (product_id, action, qty, note, stock_after, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                                      (row.get("id", ""), row.get("action", ""), row.get("qty", 0), row.get("note", ""), row.get("stock_after", 0), row.get("timestamp", "")))
                
                # Customers
                if os.path.exists(customers_file):
                    with open(customers_file, 'r', encoding='utf-8') as f:
                        for cid, data in json.load(f).items():
                            db.execute("INSERT OR IGNORE INTO customers (chat_id, data) VALUES (?, ?)",
                                      (str(cid), json.dumps(data, ensure_ascii=False)))
                
                # Chats
                if os.path.exists(chats_file):
                    with open(chats_file, 'r', encoding='utf-8') as f:
                        for sid, data in json.load(f).items():
                            db.execute("INSERT OR IGNORE INTO chats (session_id, data, last_activity) VALUES (?, ?, ?)",
                                      (str(sid), json.dumps(data, ensure_ascii=False), data.get("last_activity", "")))
        except Exception as e:
            logger.error(f"Migration error: {e}")

    # ---- STORE API ----
    def get_customer(self, chat_id: str) -> Optional[Dict[str, Any]]:
        with self.get_db() as db:
            row = db.execute("SELECT data FROM customers WHERE chat_id = ?", (str(chat_id),)).fetchone()
            if row:
                return json.loads(row["data"])
        return None

    def save_customer(self, chat_id: str, data: Dict[str, Any]) -> None:
        with self.get_db() as db:
            db.execute("INSERT OR REPLACE INTO customers (chat_id, data) VALUES (?, ?)", 
                       (str(chat_id), json.dumps(data, ensure_ascii=False)))

    def increment_referral(self, referrer_id: str) -> bool:
        c = self.get_customer(referrer_id)
        if c:
            c["invited_count"] = c.get("invited_count", 0) + 1
            self.save_customer(referrer_id, c)
            return True
        return False

    def add_order(self, order: Dict[str, Any]) -> None:
        oid = order.get("orderId", order.get("id"))
        if not oid: 
            order["orderId"] = f"KB-{int(time.time())}"
            oid = order["orderId"]
        order["created_at"] = datetime.now().isoformat()
        order["status"] = order.get("status", "pending")
        with self.get_db() as db:
            db.execute("INSERT OR REPLACE INTO orders (id, data, created_at) VALUES (?, ?, ?)",
                       (oid, json.dumps(order, ensure_ascii=False), order["created_at"]))
        logger.info(f"Order saved: {oid}")

    def update_order_status(self, order_id: str, new_status: str) -> bool:
        valid_statuses = ["pending", "confirmed", "shipping", "completed", "cancelled"]
        if new_status not in valid_statuses: return False
        
        with self.get_db() as db:
            row = db.execute("SELECT data FROM orders WHERE id = ?", (order_id,)).fetchone()
            if row:
                order = json.loads(row["data"])
                order["status"] = new_status
                order["updated_at"] = datetime.now().isoformat()
                db.execute("UPDATE orders SET data = ? WHERE id = ?", (json.dumps(order, ensure_ascii=False), order_id))
                logger.info(f"Order {order_id} status → {new_status}")
                return True
        return False

    def get_order_by_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        with self.get_db() as db:
            row = db.execute("SELECT data FROM orders WHERE id = ?", (order_id,)).fetchone()
            if row:
                return json.loads(row["data"])
        return None

    def get_recent_orders(self, limit: int = 10) -> List[Dict[str, Any]]:
        with self.get_db() as db:
            rows = db.execute("SELECT data FROM orders ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
            return [json.loads(r["data"]) for r in rows]

    # Need this to get ALL orders for analytics and logic API
    def _read_json(self, path: str) -> Any:
        # Dummy wrapper to maintain compatible behavior with _read_json in WebHook handler
        if "orders" in path:
            with self.get_db() as db:
                rows = db.execute("SELECT data FROM orders ORDER BY created_at DESC").fetchall()
                return [json.loads(r["data"]) for r in rows]
        elif "stock" in path:
            return self.get_stock()
        elif "chats" in path:
            with self.get_db() as db:
                rows = db.execute("SELECT session_id, data FROM chats").fetchall()
                result = {}
                for r in rows:
                    result[r["session_id"]] = json.loads(r["data"])
                return result
        return []

    def get_stock(self) -> List[Dict[str, Any]]:
        with self.get_db() as db:
            rows = db.execute("SELECT data FROM stock").fetchall()
            return [json.loads(r["data"]) for r in rows]

    def calculate_monthly_revenue(self) -> float:
        current_month = datetime.now().strftime("%Y-%m")
        total = 0.0
        with self.get_db() as db:
            rows = db.execute("SELECT data FROM orders WHERE created_at LIKE ?", (f"{current_month}%",)).fetchall()
            for r in rows:
                order = json.loads(r["data"])
                amount = order.get("total", order.get("total_amount", 0))
                if isinstance(amount, (int, float)):
                    total += float(amount)
                elif isinstance(amount, str):
                    try:
                        total += float(amount.replace(",", ""))
                    except ValueError:
                        pass
        return total

    def update_stock(self, product_id: str, action: str, quantity: int, note: str = "") -> Dict[str, Any]:
        with self.get_db() as db:
            row = db.execute("SELECT data FROM stock WHERE id = ?", (product_id,)).fetchone()
            if not row: return {"error": f"product {product_id} not found"}
            
            product = json.loads(row["data"])
            current = product.get("stock", 0)
            if action == "in":
                product["stock"] = current + quantity
            elif action == "out":
                if quantity > current:
                    return {"error": f"insufficient stock: have {current}, need {quantity}"}
                product["stock"] = current - quantity
            else:
                return {"error": "action must be 'in' or 'out'"}
            
            db.execute("UPDATE stock SET data = ? WHERE id = ?", (json.dumps(product, ensure_ascii=False), product_id))
            db.execute("INSERT INTO inventory_history (product_id, action, qty, note, stock_after, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                       (product_id, action, quantity, note, product["stock"], datetime.now().isoformat()))
            
            logger.info(f"Inventory {action}: {product_id} x{quantity} ({current} → {product['stock']})")
            return {"ok": True, "new_stock": product["stock"], "product": product.get("name", "")}

    def get_inventory_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self.get_db() as db:
            rows = db.execute("SELECT product_id as id, product_id, action, qty, note, stock_after, timestamp FROM inventory_history ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
            return [dict(r) for r in rows]

    def add_chat_message(self, session_id: str, name: str, phone: str, message: str, is_customer: bool = True) -> Dict[str, Any]:
        with self.get_db() as db:
            row = db.execute("SELECT data FROM chats WHERE session_id = ?", (session_id,)).fetchone()
            if row:
                chat = json.loads(row["data"])
            else:
                chat = {
                    "session_id": session_id,
                    "name": name,
                    "phone": phone,
                    "messages": [],
                    "created_at": datetime.now().isoformat()
                }
            
            chat["name"] = name
            chat["phone"] = phone
            chat["last_activity"] = datetime.now().isoformat()
            chat["messages"].append({
                "role": "customer",
                "message": message,
                "timestamp": datetime.now().isoformat()
            })
            
            db.execute("INSERT OR REPLACE INTO chats (session_id, data, last_activity) VALUES (?, ?, ?)",
                       (session_id, json.dumps(chat, ensure_ascii=False), chat["last_activity"]))
            logger.info(f"Chat message added to session {session_id}")
            return {"ok": True, "session_id": session_id}

    def add_chat_reply(self, session_id: str, text: str) -> Dict[str, Any]:
        with self.get_db() as db:
            row = db.execute("SELECT data FROM chats WHERE session_id = ?", (session_id,)).fetchone()
            if not row: return {"error": "session not found"}
            
            chat = json.loads(row["data"])
            chat["last_activity"] = datetime.now().isoformat()
            chat["messages"].append({
                "role": "support",
                "message": text,
                "timestamp": datetime.now().isoformat()
            })
            
            db.execute("UPDATE chats SET data = ?, last_activity = ? WHERE session_id = ?",
                       (json.dumps(chat, ensure_ascii=False), chat["last_activity"], session_id))
            logger.info(f"Chat reply added to session {session_id}")
            return {"ok": True}

    def get_chat_messages(self, session_id: str) -> List[Dict[str, Any]]:
        with self.get_db() as db:
            row = db.execute("SELECT data FROM chats WHERE session_id = ?", (session_id,)).fetchone()
            if row:
                chat = json.loads(row["data"])
                return chat.get("messages", [])
        return []

    def get_chat_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        with self.get_db() as db:
            row = db.execute("SELECT data FROM chats WHERE session_id = ?", (session_id,)).fetchone()
            if row:
                return json.loads(row["data"])
        return None
