#!/usr/bin/env python3
"""
Telegram Bot for K-Beauty & K-Pop Order Management.

This bot handles incoming order webhooks from the shop's website and provides
management commands via Telegram (/orders, /stock, /revenue).

Requirements:
    - Python 3.6+
    - No external packages (uses standard library: urllib, http.server, json, etc.)

Usage:
    python telegram_bot.py
"""

import json
import os
import logging
import threading
import signal
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib import request, error as urllib_error
from urllib.parse import urlencode

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("KBeautyBot")


def load_env(path: str = ".env") -> Dict[str, str]:
    """
    Load environment variables from a .env file without external packages.

    Args:
        path: Path to the .env file.

    Returns:
        Dictionary of environment variables.
    """
    env_vars = {}
    if not os.path.exists(path):
        logger.warning(f"Env file not found: {path}")
        return env_vars

    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, value = line.split("=", 1)
                    env_vars[key.strip()] = value.strip()
    except Exception as e:
        logger.error(f"Error loading env file: {e}")
    
    # Merge with OS environment (OS takes precedence)
    return {**env_vars, **os.environ}


class TelegramClient:
    """Handles communication with Telegram Bot API using urllib."""

    def __init__(self, token: str, chat_id: str):
        """
        Initialize Telegram Client.

        Args:
            token: Bot API Token.
            chat_id: Target Chat ID for notifications.
        """
        self.token = token
        self.chat_id = chat_id
        self.base_url = f"https://api.telegram.org/bot{token}"
        self.offset = 0

    def _request(self, method: str, data: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Send a request to Telegram API.

        Args:
            method: API method name (e.g., sendMessage).
            data: Payload dictionary.

        Returns:
            JSON response or None if failed.
        """
        url = f"{self.base_url}/{method}"
        headers = {"Content-Type": "application/json"}
        body = json.dumps(data).encode("utf-8") if data else None

        try:
            req = request.Request(url, data=body, headers=headers, method="POST")
            with request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib_error.HTTPError as e:
            logger.error(f"Telegram API HTTP Error: {e.code} - {e.reason}")
        except urllib_error.URLError as e:
            logger.error(f"Telegram API URL Error: {e.reason}")
        except Exception as e:
            logger.error(f"Telegram API General Error: {e}")
        return None

    def send_message(self, text: str, parse_mode: str = "Markdown") -> bool:
        """
        Send a text message to the configured chat_id.

        Args:
            text: Message content.
            parse_mode: Formatting mode (Markdown/HTML).

        Returns:
            True if successful, False otherwise.
        """
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": parse_mode
        }
        response = self._request("sendMessage", payload)
        return response is not None and response.get("ok", False)

    def get_updates(self, timeout: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieve updates from Telegram.

        Args:
            timeout: Long polling timeout in seconds.

        Returns:
            List of update objects.
        """
        params = {
            "offset": self.offset,
            "timeout": timeout,
            "allowed_updates": ["message"]
        }
        # Encode params for GET request
        url = f"{self.base_url}/getUpdates?{urlencode(params)}"
        
        try:
            req = request.Request(url, method="GET")
            with request.urlopen(req, timeout=timeout + 5) as response:
                data = json.loads(response.read().decode("utf-8"))
                if data.get("ok"):
                    updates = data.get("result", [])
                    if updates:
                        self.offset = updates[-1]["update_id"] + 1
                    return updates
        except Exception as e:
            logger.error(f"Error getting updates: {e}")
        return []


class DataStore:
    """Handles JSON file storage for orders and stock."""

    def __init__(self, orders_file: str, stock_file: str):
        """
        Initialize Data Store.

        Args:
            orders_file: Path to orders JSON file.
            stock_file: Path to stock JSON file.
        """
        self.orders_file = orders_file
        self.stock_file = stock_file
        self.inventory_history_file = os.path.join(os.path.dirname(orders_file), "inventory_history.json")
        self._lock = threading.Lock()
        self._ensure_files()

    def _ensure_files(self) -> None:
        """Create data files if they don't exist."""
        if not os.path.exists(self.orders_file):
            self._write_json(self.orders_file, [])
        if not os.path.exists(self.stock_file):
            self._write_json(self.stock_file, [])
        if not os.path.exists(self.inventory_history_file):
            self._write_json(self.inventory_history_file, [])

    def _read_json(self, path: str) -> Any:
        """Read JSON file with locking."""
        with self._lock:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                return [] if "orders" in path else {}

    def _write_json(self, path: str, data: Any) -> None:
        """Write JSON file with locking."""
        with self._lock:
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

    def add_order(self, order: Dict[str, Any]) -> None:
        """
        Save a new order.

        Args:
            order: Order dictionary.
        """
        orders = self._read_json(self.orders_file)
        if not isinstance(orders, list):
            orders = []
        order["created_at"] = datetime.now().isoformat()
        order["status"] = order.get("status", "pending")  # pending → confirmed → shipping → completed
        orders.append(order)
        self._write_json(self.orders_file, orders)
        logger.info(f"Order saved: {order.get('orderId', order.get('id', 'N/A'))}")

    def update_order_status(self, order_id: str, new_status: str) -> bool:
        """
        Update order status by orderId.

        Args:
            order_id: Order ID (e.g. 'KB-A1B2CD').
            new_status: New status string.

        Returns:
            True if found and updated.
        """
        valid_statuses = ["pending", "confirmed", "shipping", "completed", "cancelled"]
        if new_status not in valid_statuses:
            return False
        orders = self._read_json(self.orders_file)
        if not isinstance(orders, list):
            return False
        for order in orders:
            oid = order.get("orderId", order.get("id", ""))
            if oid == order_id:
                order["status"] = new_status
                order["updated_at"] = datetime.now().isoformat()
                self._write_json(self.orders_file, orders)
                logger.info(f"Order {order_id} status → {new_status}")
                return True
        return False

    def get_order_by_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Find an order by its ID."""
        orders = self._read_json(self.orders_file)
        if not isinstance(orders, list):
            return None
        for order in orders:
            oid = order.get("orderId", order.get("id", ""))
            if oid == order_id:
                return order
        return None

    def get_recent_orders(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent orders.

        Args:
            limit: Number of orders to retrieve.

        Returns:
            List of order dictionaries.
        """
        orders = self._read_json(self.orders_file)
        if not isinstance(orders, list):
            return []
        return sorted(orders, key=lambda x: x.get("created_at", ""), reverse=True)[:limit]

    def get_stock(self) -> List[Dict[str, Any]]:
        """
        Get current stock data.

        Returns:
            List of stock items.
        """
        stock = self._read_json(self.stock_file)
        return stock if isinstance(stock, list) else []

    def calculate_monthly_revenue(self) -> float:
        """
        Calculate total revenue for the current month.

        Returns:
            Total revenue amount.
        """
        orders = self._read_json(self.orders_file)
        if not isinstance(orders, list):
            return 0.0
        
        current_month = datetime.now().strftime("%Y-%m")
        total = 0.0
        
        for order in orders:
            created_at = order.get("created_at", "")
            if created_at.startswith(current_month):
                # Handle both field names: 'total' (new form) and 'total_amount' (legacy)
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
        """Update stock for a product (in/out)."""
        stock = self._read_json(self.stock_file)
        if not isinstance(stock, list):
            return {"error": "stock data invalid"}
        
        product = None
        for item in stock:
            if item.get("id") == product_id:
                product = item
                break
        
        if not product:
            return {"error": f"product {product_id} not found"}
        
        current = product.get("stock", 0)
        if action == "in":
            product["stock"] = current + quantity
        elif action == "out":
            if quantity > current:
                return {"error": f"insufficient stock: have {current}, need {quantity}"}
            product["stock"] = current - quantity
        else:
            return {"error": "action must be 'in' or 'out'"}
        
        self._write_json(self.stock_file, stock)
        
        # Log history
        history = self._read_json(self.inventory_history_file)
        if not isinstance(history, list):
            history = []
        history.append({
            "id": product_id,
            "name": product.get("name", ""),
            "action": action,
            "qty": quantity,
            "note": note,
            "timestamp": datetime.now().isoformat(),
            "stock_before": current,
            "stock_after": product["stock"]
        })
        self._write_json(self.inventory_history_file, history)
        logger.info(f"Inventory {action}: {product_id} x{quantity} ({current} → {product['stock']})")
        
        return {"ok": True, "new_stock": product["stock"], "product": product.get("name", "")}

    def get_inventory_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent inventory history."""
        history = self._read_json(self.inventory_history_file)
        if not isinstance(history, list):
            return []
        return sorted(history, key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]


class WebhookHandler(BaseHTTPRequestHandler):
    """HTTP Handler for incoming order webhooks."""

    store: Optional[DataStore] = None
    bot: Optional[TelegramClient] = None
    secret: str = ""
    allow_no_secret: bool = True  # Allow requests without secret in dev mode

    def log_message(self, format: str, *args: Any) -> None:
        """Override to use logger."""
        logger.info(f"Webhook: {args[0]}")

    def _send_cors_headers(self) -> None:
        """Add CORS headers to response."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Webhook-Secret")

    def _send_json(self, data: Any, status: int = 200) -> None:
        """Send JSON response with CORS."""
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False, default=str).encode("utf-8"))

    def do_OPTIONS(self) -> None:
        """Handle CORS preflight requests."""
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        """Handle GET requests for admin API."""
        if not WebhookHandler.store:
            self.send_response(500)
            self.end_headers()
            return

        if self.path == "/api/orders":
            orders = WebhookHandler.store._read_json(WebhookHandler.store.orders_file)
            if not isinstance(orders, list):
                orders = []
            orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            self._send_json(orders)

        elif self.path.startswith("/api/orders/"):
            oid = self.path.split("/api/orders/")[1]
            order = WebhookHandler.store.get_order_by_id(oid)
            if order:
                self._send_json(order)
            else:
                self._send_json({"error": "not found"}, 404)

        elif self.path == "/api/stats":
            orders = WebhookHandler.store._read_json(WebhookHandler.store.orders_file)
            if not isinstance(orders, list):
                orders = []
            current_month = datetime.now().strftime("%Y-%m")
            month_orders = [o for o in orders if isinstance(o, dict) and o.get("created_at", "").startswith(current_month)]
            stats = {
                "total_orders": len(orders),
                "month_orders": len(month_orders),
                "pending": len([o for o in orders if o.get("status") == "pending"]),
                "confirmed": len([o for o in orders if o.get("status") == "confirmed"]),
                "shipping": len([o for o in orders if o.get("status") == "shipping"]),
                "completed": len([o for o in orders if o.get("status") == "completed"]),
                "cancelled": len([o for o in orders if o.get("status") == "cancelled"]),
                "revenue": WebhookHandler.store.calculate_monthly_revenue()
            }
            self._send_json(stats)

        elif self.path == "/api/revenue-monthly":
            orders = WebhookHandler.store._read_json(WebhookHandler.store.orders_file)
            if not isinstance(orders, list):
                orders = []
            # Group revenue by month (YYYY-MM)
            month_data = {}
            for o in orders:
                if not isinstance(o, dict):
                    continue
                # Skip cancelled orders
                if o.get("status") == "cancelled":
                    continue
                created = o.get("created_at", "")
                if len(created) >= 7:
                    month_key = created[:7]  # "2026-03"
                    amount = o.get("total", o.get("total_amount", 0))
                    if isinstance(amount, str):
                        try:
                            amount = float(amount.replace(",", ""))
                        except ValueError:
                            amount = 0
                    month_data[month_key] = month_data.get(month_key, 0) + float(amount)
            # Build last 12 months array
            result = []
            now = datetime.now()
            for i in range(11, -1, -1):
                y = now.year
                m = now.month - i
                while m <= 0:
                    m += 12
                    y -= 1
                key = f"{y:04d}-{m:02d}"
                month_names = ["","Th1","Th2","Th3","Th4","Th5","Th6","Th7","Th8","Th9","Th10","Th11","Th12"]
                result.append({
                    "month": key,
                    "label": month_names[m],
                    "revenue": month_data.get(key, 0),
                    "orders": len([o for o in orders if isinstance(o, dict) and o.get("created_at", "").startswith(key) and o.get("status") != "cancelled"])
                })
            self._send_json(result)

        elif self.path == "/api/inventory":
            stock = WebhookHandler.store.get_stock()
            self._send_json(stock)

        elif self.path == "/api/inventory/history":
            history = WebhookHandler.store.get_inventory_history()
            self._send_json(history)

        else:
            self.send_response(404)
            self.end_headers()

    def do_PUT(self) -> None:
        """Handle PUT requests for updating order status."""
        if not WebhookHandler.store:
            self.send_response(500)
            self.end_headers()
            return

        if self.path.startswith("/api/orders/"):
            oid = self.path.split("/api/orders/")[1]
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length).decode("utf-8"))
            new_status = body.get("status", "")
            if WebhookHandler.store.update_order_status(oid, new_status):
                self._send_json({"status": "updated", "orderId": oid, "newStatus": new_status})
            else:
                self._send_json({"error": "not found or invalid status"}, 400)

        elif self.path.startswith("/api/inventory/"):
            product_id = self.path.split("/api/inventory/")[1]
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length).decode("utf-8"))
            action = body.get("action", "")
            quantity = int(body.get("quantity", 0))
            note = body.get("note", "")
            if action not in ("in", "out") or quantity <= 0:
                self._send_json({"error": "invalid action or quantity"}, 400)
                return
            result = WebhookHandler.store.update_stock(product_id, action, quantity, note)
            if "error" in result:
                self._send_json(result, 400)
            else:
                self._send_json(result)

        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self) -> None:
        """Handle POST requests from order form."""
        if self.path != "/webhook/order":
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)
        
        # Security Check (relaxed in dev mode)
        auth_header = self.headers.get("X-Webhook-Secret", "")
        if WebhookHandler.secret and auth_header != WebhookHandler.secret and not WebhookHandler.allow_no_secret:
            logger.warning("Unauthorized webhook attempt")
            self.send_response(403)
            self.end_headers()
            return

        try:
            data = json.loads(post_data.decode("utf-8"))
            if WebhookHandler.store and WebhookHandler.bot:
                # Save Order
                WebhookHandler.store.add_order(data)

                # Auto-deduct stock
                PICKER_TO_STOCK = {
                    'cosrx-snail': 'KB001', 'boj-sun': 'KB002', 'anua-toner': 'KB003',
                    'torriden-serum': 'KB004', 'skin1004': 'KB005', 'mediheal': 'KB006',
                    'roundlab': 'KB007', 'romand': 'KB008',
                    'txt-7th': 'ALB001', 'bts-arirang': 'ALB002', 'babymonster': 'ALB003',
                    'kissoflife': 'ALB004', 'nctwish': 'ALB005'
                }
                for item in data.get('items', []):
                    stock_id = PICKER_TO_STOCK.get(item.get('id', ''))
                    if stock_id:
                        WebhookHandler.store.update_stock(
                            stock_id,
                            'out',
                            int(item.get('quantity', 1)),
                            note=f"Đơn {data.get('orderId', '')}"
                        )

                # Notify Owner
                msg = self._format_order_message(data)
                WebhookHandler.bot.send_message(msg)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode("utf-8"))
            else:
                logger.error("Store or Bot not initialized")
                self.send_response(500)
                self.end_headers()
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
        except Exception as e:
            logger.error(f"Webhook processing error: {e}")
            self.send_response(500)
            self.end_headers()

    def _format_order_message(self, order: Dict[str, Any]) -> str:
        """Format order data into a Telegram message.
        
        Supports both formats:
        - Original: customer_name, phone, items[], total_amount, id
        - Order form: name, phone, address, products (text), total, orderId
        """
        # Handle both field name formats
        name = order.get("name", order.get("customer_name", "N/A"))
        phone = order.get("phone", "N/A")
        address = order.get("address", "")
        oid = order.get("orderId", order.get("id", "N/A"))
        
        # Handle items as list or text
        items = order.get("items", [])
        products_text = order.get("products", "")
        if items and isinstance(items, list):
            lines = []
            for i in items:
                name_str = i.get('name', 'Item')
                qty = i.get('qty', 1)
                price = i.get('price', 0)
                if price:
                    lines.append(f"▪️ {name_str} x{qty} — {price * qty:,}₫")
                else:
                    lines.append(f"▪️ {name_str} x{qty}")
            item_list = "\n".join(lines)
        elif products_text:
            item_list = f"▪️ {products_text}"
        else:
            item_list = "(không rõ)"
        
        # Handle total
        total = order.get("total", order.get("total_amount", 0))
        if isinstance(total, str):
            try:
                total = int(total.replace(",", ""))
            except ValueError:
                total = 0
        
        note = order.get("note", "")
        category = order.get("category", "")
        
        msg = (
            f"🛍️ *Đơn Hàng Mới #{oid}*\n\n"
            f"👤 *Khách:* {name}\n"
            f"📞 *SĐT:* {phone}\n"
        )
        if address:
            msg += f"📍 *Địa chỉ:* {address}\n"
        if category:
            msg += f"📂 *Loại:* {category}\n"
        msg += f"\n📦 *Sản phẩm:*\n{item_list}\n\n"
        msg += f"💰 *Tổng:* {total:,}₫"
        if note:
            msg += f"\n📝 *Ghi chú:* {note}"
        
        return msg


class KBeautyBot:
    """Main Bot Orchestrator."""

    def __init__(self, config: Dict[str, str]):
        """
        Initialize Bot.

        Args:
            config: Configuration dictionary from env.
        """
        self.config = config
        self.token = config.get("TELEGRAM_BOT_TOKEN", "")
        self.chat_id = config.get("TELEGRAM_CHAT_ID", "")
        self.port = int(config.get("WEBHOOK_PORT", 5000))
        self.secret = config.get("WEBHOOK_SECRET", "")
        
        # Data Paths
        self.data_dir = config.get("DATA_DIR", "./data")
        os.makedirs(self.data_dir, exist_ok=True)
        
        self.orders_file = os.path.join(self.data_dir, config.get("ORDERS_FILE", "orders.json"))
        self.stock_file = config.get("STOCK_FILE", "./stock.json") # Stock usually in tools dir
        
        self.bot_client = TelegramClient(self.token, self.chat_id)
        self.store = DataStore(self.orders_file, self.stock_file)
        self.running = True

        # Configure Webhook Handler
        WebhookHandler.store = self.store
        WebhookHandler.bot = self.bot_client
        WebhookHandler.secret = self.secret

    def _handle_command(self, message: Dict[str, Any]) -> None:
        """Process Telegram commands."""
        chat_id = message.get("chat_id")
        text = message.get("text", "").strip()
        
        # Security: Only allow configured chat_id to use commands
        if str(chat_id) != str(self.chat_id):
            return

        response = ""
        try:
            if text == "/orders":
                orders = self.store.get_recent_orders(10)
                if not orders:
                    response = "📭 Chưa có đơn hàng nào."
                else:
                    status_icons = {"pending": "🟡", "confirmed": "🔵", "shipping": "🚚", "completed": "✅", "cancelled": "❌"}
                    response = "📋 *10 Đơn Gần Nhất:*\n\n"
                    for i, o in enumerate(orders, 1):
                        oid = o.get('orderId', o.get('id', '?'))
                        name = o.get('name', o.get('customer_name', '?'))
                        total = o.get('total', o.get('total_amount', 0))
                        status = o.get('status', 'pending')
                        icon = status_icons.get(status, '⬜')
                        response += f"{i}. {icon} #{oid} — {name} — {total:,}₫\n"
            
            elif text == "/stock":
                stock = self.store.get_stock()
                if not stock:
                    response = "📦 Dữ liệu kho trống."
                else:
                    response = "📦 *Tồn Kho:*\n\n"
                    for item in stock:
                        status = "✅" if item.get("stock", 0) > 0 else "❌"
                        response += f"{status} {item.get('name', 'N/A')} ({item.get('stock', 0)})\n"
            
            elif text == "/revenue":
                revenue = self.store.calculate_monthly_revenue()
                month = datetime.now().strftime("%m/%Y")
                order_count = len([o for o in self.store._read_json(self.store.orders_file) if isinstance(o, dict) and o.get('created_at', '').startswith(datetime.now().strftime('%Y-%m'))])
                response = f"📊 *Doanh Thu Tháng {month}*\n\n💰 {revenue:,.0f}₫\n📦 {order_count} đơn"
            
            elif text.startswith("/status"):
                parts = text.split(maxsplit=1)
                if len(parts) < 2:
                    response = "ℹ️ Dùng: `/status KB-XXXX`"
                else:
                    order = self.store.get_order_by_id(parts[1].strip())
                    if not order:
                        response = f"❌ Không tìm thấy đơn `{parts[1]}`"
                    else:
                        status_labels = {"pending": "🟡 Chờ xác nhận", "confirmed": "🔵 Đã xác nhận", "shipping": "🚚 Đang giao", "completed": "✅ Hoàn thành", "cancelled": "❌ Đã hủy"}
                        oid = order.get('orderId', order.get('id', '?'))
                        name = order.get('name', order.get('customer_name', '?'))
                        total = order.get('total', order.get('total_amount', 0))
                        st = order.get('status', 'pending')
                        response = f"📦 *Đơn #{oid}*\n\n👤 {name}\n💰 {total:,}₫\n📌 {status_labels.get(st, st)}\n🕐 {order.get('created_at', 'N/A')[:16]}"
            
            elif text.startswith("/update"):
                parts = text.split()
                if len(parts) < 3:
                    response = "ℹ️ Dùng: `/update KB-XXXX confirmed`\n\nTrạng thái: `pending` `confirmed` `shipping` `completed` `cancelled`"
                else:
                    oid, new_st = parts[1], parts[2]
                    if self.store.update_order_status(oid, new_st):
                        status_labels = {"pending": "🟡 Chờ xác nhận", "confirmed": "🔵 Đã xác nhận", "shipping": "🚚 Đang giao", "completed": "✅ Hoàn thành", "cancelled": "❌ Đã hủy"}
                        response = f"✅ Đơn `{oid}` → {status_labels.get(new_st, new_st)}"
                    else:
                        response = f"❌ Không tìm thấy `{oid}` hoặc trạng thái không hợp lệ"
            
            elif text == "/start" or text == "/help":
                response = (
                    "👋 *Chào Admin K-Beauty Order!*\n\n"
                    "📋 Quản lý đơn:\n"
                    "/orders — 10 đơn gần nhất\n"
                    "/status `ID` — Chi tiết 1 đơn\n"
                    "/update `ID` `status` — Đổi trạng thái\n\n"
                    "📊 Báo cáo:\n"
                    "/revenue — Doanh thu tháng\n"
                    "/stock — Tồn kho\n\n"
                    "📌 Trạng thái: pending → confirmed → shipping → completed"
                )
            else:
                return # Ignore unknown commands

            if response:
                # Override chat_id for response to match incoming message
                # Note: send_message uses self.chat_id initialized, but for safety we ensure it matches
                payload = {
                    "chat_id": chat_id,
                    "text": response,
                    "parse_mode": "Markdown"
                }
                self.bot_client._request("sendMessage", payload)

        except Exception as e:
            logger.error(f"Command handling error: {e}")
            self.bot_client.send_message(f"⚠️ Lỗi lệnh: {e}")

    def _poll_telegram(self) -> None:
        """Long polling loop for Telegram updates."""
        logger.info("Started Telegram Polling...")
        while self.running:
            try:
                updates = self.bot_client.get_updates(timeout=30)
                for update in updates:
                    if "message" in update:
                        self._handle_command(update["message"])
            except Exception as e:
                logger.error(f"Polling error: {e}")
                time.sleep(5)

    def _run_server(self) -> None:
        """Run HTTP server for webhooks in a separate thread."""
        server = HTTPServer(("0.0.0.0", self.port), WebhookHandler)
        logger.info(f"Webhook Server running on port {self.port}")
        while self.running:
            server.handle_request()

    def run(self) -> None:
        """Start the bot."""
        if not self.token or not self.chat_id:
            logger.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID")
            return

        # Start Webhook Server Thread
        server_thread = threading.Thread(target=self._run_server, daemon=True)
        server_thread.start()

        # Start Polling in Main Thread
        try:
            self._poll_telegram()
        except KeyboardInterrupt:
            logger.info("Shutting down...")
            self.running = False


def main() -> None:
    """Entry point."""
    # Load Env
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    config = load_env(env_path)
    
    if not config.get("TELEGRAM_BOT_TOKEN"):
        print("Error: TELEGRAM_BOT_TOKEN not found. Please configure .env file.")
        sys.exit(1)

    bot = KBeautyBot(config)
    
    # Graceful Shutdown
    def signal_handler(sig: Any, frame: Any) -> None:
        logger.info("Received exit signal")
        bot.running = False
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    bot.run()


if __name__ == "__main__":
    main()
