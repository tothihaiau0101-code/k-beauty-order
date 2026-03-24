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
import secrets
import hmac
import hashlib
from datetime import datetime
from typing import Any, Dict, List, Optional
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib import request, error as urllib_error
from urllib.parse import urlencode

# PayOS SDK import (official package)
try:
    from payos import PayOS, CreatePaymentLinkRequest
except Exception as e:
    import logging
    logging.getLogger("KBeautyBot.Init").error(f"Failed to import PayOS: {e}")
    PayOS = None
    CreatePaymentLinkRequest = None

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
        return dict(os.environ)

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


# ─────────────────────────────────────────
# PayOS Integration - Official SDK
# Docs: https://payos.vn/docs
# ─────────────────────────────────────────


class GHNClient:
    """GHN Express API — tạo vận đơn COD tự động."""
    API = "https://online-gateway.ghn.vn/shiip/public-api"

    def __init__(self, token: str, shop_id: str):
        self.token = token
        self.shop_id = str(shop_id)
        self.enabled = bool(token and shop_id and token != "your_ghn_token")

    def create_order(self, order: dict) -> Optional[dict]:
        """Tạo vận đơn GHN, trả về dict với order_code hoặc None."""
        if not self.enabled:
            logger.warning("GHN not configured")
            return None
        payload = {
            "payment_type_id": 2,             # 1=người gửi trả, 2=người nhận (COD)
            "note": order.get("note", ""),
            "required_note": "KHONGCHOXEMHANG",
            "to_name": order.get("name", ""),
            "to_phone": order.get("phone", ""),
            "to_address": order.get("address", ""),
            "to_ward_name": "",
            "to_district_name": "",
            "to_province_name": "",
            "cod_amount": int(order.get("total", 0)) + 25000,  # tiền hàng + phí COD
            "weight": 500,        # gram, mặc định 500g
            "length": 20,         # cm
            "width": 15,
            "height": 10,
            "service_type_id": 2,  # Chuyển phát nhanh
            "items": [
                {"name": order.get("products", "BeaPop Order")[:100],
                 "quantity": 1, "weight": 500}
            ]
        }
        try:
            req = request.Request(
                f"{self.API}/v2/shipping-order/create",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Token": self.token,
                    "ShopId": self.shop_id,
                },
                method="POST"
            )
            with request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                if result.get("code") == 200:
                    return result.get("data")  # chứa order_code, expected_delivery_time
                logger.error(f"GHN error: {result}")
        except Exception as e:
            logger.error(f"GHN create_order error: {e}")
        return None


class WebhookHandler(BaseHTTPRequestHandler):
    """HTTP Handler for incoming order webhooks."""

    store: Optional[Any] = None
    bot: Optional[TelegramClient] = None
    payos: Optional[PayOS] = None
    ghn: Optional[Any] = None       # GHNClient instance
    ghn_config: dict = {}
    secret: str = ""
    allow_no_secret: bool = True  # Allow requests without secret in dev mode
    base_url: str = "https://web-production-46a5.up.railway.app"
    admin_tokens: set = set()     # Active admin session tokens

    def log_message(self, format: str, *args: Any) -> None:
        """Override to use logger."""
        logger.info(f"Webhook: {args[0]}")

    def _send_cors_headers(self) -> None:
        """Add CORS headers to response."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Webhook-Secret, Authorization")

    def _check_admin_auth(self) -> bool:
        """Check if request has valid admin Bearer token. Returns True if authorized."""
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer ") and auth[7:] in WebhookHandler.admin_tokens:
            return True
        self._send_json({"error": "Unauthorized"}, 401)
        return False

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

        # Admin API endpoints require auth
        admin_paths = ["/api/orders", "/api/stats", "/api/inventory", "/api/revenue", "/api/chat"]
        if any(self.path.startswith(p) for p in admin_paths):
            if not self._check_admin_auth():
                return

        if self.path == "/api/orders":
            orders = WebhookHandler.store._read_json(WebhookHandler.store.orders_file)
            if not isinstance(orders, list):
                orders = []
            # Filter by phone if provided
            query_string = self.path.split("?", 1)[1] if "?" in self.path else ""
            params = {}
            if query_string:
                for param in query_string.split("&"):
                    if "=" in param:
                        key, value = param.split("=", 1)
                        params[key] = value
            phone_filter = params.get("phone", "")
            if phone_filter:
                orders = [o for o in orders if o.get("phone", "").replace(" ", "") == phone_filter]
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

        elif self.path.startswith("/api/order-status/"):
            order_id = self.path.split("/api/order-status/")[1]
            orders = WebhookHandler.store._read_json(WebhookHandler.store.orders_file)
            order = next((o for o in orders if o.get("id") == order_id), None)
            if order:
                self._send_json({"status": order.get("status", "pending")})
            else:
                self._send_json({"status": "not_found"}, 404)

        elif self.path.startswith("/api/chat/"):
            # GET /api/chat/{sessionId} - Poll for chat messages
            session_id = self.path.split("/api/chat/")[1].split("?")[0]  # Remove query params
            if not WebhookHandler.store:
                self._send_json({"error": "server not ready"}, 500)
                return
            messages = WebhookHandler.store.get_chat_messages(session_id)
            chat_info = WebhookHandler.store.get_chat_info(session_id)
            self._send_json({
                "session_id": session_id,
                "messages": messages,
                "name": chat_info.get("name") if chat_info else None,
                "phone": chat_info.get("phone") if chat_info else None
            })

        elif self.path == "/api/create-payment":
            # POST-style but using GET for simplicity — see do_POST for actual endpoint
            self._send_json({"error": "Use POST /api/create-payment"}, 405)

        else:
            self.send_response(404)
            self.end_headers()

    def do_PUT(self) -> None:
        """Handle PUT requests for updating order status."""
        if not WebhookHandler.store:
            self.send_response(500)
            self.end_headers()
            return

        # All PUT endpoints require admin auth
        if not self._check_admin_auth():
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
        """Handle POST requests from order form and PayOS webhook."""

        # --- Admin Login ---
        if self.path == "/api/admin/login":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                data = json.loads(self.rfile.read(content_length).decode("utf-8"))
                password = data.get("password", "")
                expected = os.environ.get("ADMIN_PASSWORD", "beapop2026")
                if password == expected:
                    token = secrets.token_hex(32)
                    WebhookHandler.admin_tokens.add(token)
                    logger.info("Admin login successful")
                    self._send_json({"token": token})
                else:
                    logger.warning("Admin login failed: wrong password")
                    self._send_json({"error": "Sai mật khẩu"}, 401)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            return

        # --- Chat: Send Message ---
        if self.path == "/api/chat":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                data = json.loads(self.rfile.read(content_length).decode("utf-8"))
                session_id = data.get("sessionId", "")
                name = data.get("name", "Anonymous")
                phone = data.get("phone", "")
                message = data.get("message", "")

                if not session_id or not message:
                    self._send_json({"error": "sessionId and message required"}, 400)
                    return

                if not WebhookHandler.store:
                    self._send_json({"error": "server not ready"}, 500)
                    return

                # Save message to chats.json
                result = WebhookHandler.store.add_chat_message(session_id, name, phone, message)

                # Forward to Telegram
                if WebhookHandler.bot:
                    phone_str = f"📞 SĐT: `{phone}`\n" if phone else ""
                    tg_msg = (
                        f"💬 *Chat từ web*\n\n"
                        f"👤 Khách: {name}\n"
                        f"{phone_str}"
                        f"💬 {message}\n\n"
                        f"📌 Reply: `/reply {session_id}` nội dung"
                    )
                    WebhookHandler.bot.send_message(tg_msg)

                self._send_json({"ok": True, "session_id": session_id})
            except Exception as e:
                logger.error(f"Chat POST error: {e}")
                self._send_json({"error": str(e)}, 500)
            return

        # --- PayOS: Create Payment Link ---
        if self.path == "/api/payos/create":
            if not WebhookHandler.payos:
                self._send_json({"error": "PayOS not configured"}, 503)
                return
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                data = json.loads(self.rfile.read(content_length).decode("utf-8"))
                order_id_str = data.get("orderId", "")  # e.g. "KB-A1B2"
                amount = int(data.get("amount", 0))
                description = data.get("description", order_id_str)[:25]  # PayOS max 25 chars

                if not amount or amount <= 0:
                    self._send_json({"error": "invalid amount"}, 400)
                    return

                # Convert orderId to a numeric code for PayOS (use timestamp-based)
                import hashlib
                order_code = abs(hash(order_id_str)) % (10 ** 9) or int(time.time())

                FRONTEND = "https://k-beauty-order.pages.dev"
                payment_data = CreatePaymentLinkRequest(
                    order_code=order_code,
                    amount=amount,
                    description=description,
                    return_url=f"{FRONTEND}/order-form?payment=success&orderId={order_id_str}",
                    cancel_url=f"{FRONTEND}/order-form?payment=cancel&orderId={order_id_str}"
                )
                result = WebhookHandler.payos.create_payment_link(payment_data)
                if result:
                    # Save orderCode to order record
                    if WebhookHandler.store:
                        orders = WebhookHandler.store._read_json(WebhookHandler.store.orders_file)
                        if isinstance(orders, list):
                            for o in orders:
                                if o.get("orderId") == order_id_str:
                                    o["payosOrderCode"] = order_code
                                    WebhookHandler.store._write_json(WebhookHandler.store.orders_file, orders)
                                    break
                    checkout_url = result.checkout_url
                    logger.info(f"PayOS checkout URL: {checkout_url}")
                    self._send_json({
                        "checkoutUrl": checkout_url,
                        "orderCode": order_code
                    })
                else:
                    self._send_json({"error": "PayOS payment creation failed"}, 502)
            except Exception as e:
                logger.error(f"PayOS create payment error: {e}")
                self._send_json({"error": str(e)}, 500)
            return

        # --- PayOS: Receive Payment Confirmation Webhook ---
        if self.path == "/webhook/payos":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                raw_body = self.rfile.read(content_length).decode("utf-8")
                data = json.loads(raw_body)

                # Verify webhook signature from PayOS
                if WebhookHandler.payos and WebhookHandler.payos.enabled:
                    if not WebhookHandler.payos.verify_webhook(data):
                        logger.warning("PayOS webhook signature mismatch")
                        self._send_json({"error": "invalid signature"}, 400)
                        return

                webhook_data = data.get("data", data)
                status = webhook_data.get("status", "").upper()
                order_code = str(webhook_data.get("orderCode", ""))
                amount = webhook_data.get("amount", 0)

                if status == "PAID" and WebhookHandler.store:
                    # Find order by matching orderCode stored in order
                    orders = WebhookHandler.store._read_json(WebhookHandler.store.orders_file)
                    matched_order = None
                    if isinstance(orders, list):
                        for o in orders:
                            if str(o.get("payosOrderCode", "")) == order_code:
                                matched_order = o
                                break

                    if matched_order:
                        oid = matched_order.get("orderId", matched_order.get("id", order_code))
                        WebhookHandler.store.update_order_status(oid, "confirmed")
                        # Notify admin via Telegram
                        if WebhookHandler.bot:
                            name = matched_order.get("name", matched_order.get("customer_name", "Khách"))
                            msg = (
                                f"💳 *Thanh Toán Thành Công!*\n\n"
                                f"📦 Đơn: `#{oid}`\n"
                                f"👤 Khách: {name}\n"
                                f"💰 Số tiền: {amount:,}₫\n"
                                f"✅ Trạng thái: Đã xác nhận"
                            )
                            WebhookHandler.bot.send_message(msg)
                        logger.info(f"PayOS confirmed payment for order {oid}")
                    else:
                        logger.warning(f"PayOS webhook: no matching order for code {order_code}")

                self._send_json({"success": True})
            except Exception as e:
                logger.error(f"PayOS webhook error: {e}")
                self._send_json({"error": str(e)}, 500)
            return

        if self.path != "/webhook/order":
            self.send_response(404)
            self.end_headers()
            return

        # Security Check (relaxed in dev mode)
        auth_header = self.headers.get("X-Webhook-Secret", "")
        if WebhookHandler.secret and auth_header != WebhookHandler.secret and not WebhookHandler.allow_no_secret:
            logger.warning("Unauthorized webhook attempt")
            self.send_response(403)
            self.end_headers()
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
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

    def _handle_payos_webhook(self, raw_body: bytes) -> None:
        """Handle PayOS payment confirmation webhook."""
        try:
            body = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json({"error": "invalid json"}, 400)
            return

        # Verify signature
        if WebhookHandler.payos and not WebhookHandler.payos.verify_webhook(body):
            logger.warning("PayOS webhook signature mismatch")
            self._send_json({"error": "invalid signature"}, 403)
            return

        data = body.get("data", {})
        code = body.get("code", "")

        # Only process successful payments
        if code != "00":
            logger.info(f"PayOS webhook non-success code: {code}")
            self._send_json({"success": True})
            return

        order_code = str(data.get("orderCode", ""))
        amount = data.get("amount", 0)
        description = data.get("description", "")

        logger.info(f"PayOS payment confirmed: orderCode={order_code}, amount={amount}")

        # Find order by orderCode (we store it as numeric suffix of orderId)
        if WebhookHandler.store:
            orders = WebhookHandler.store._read_json(WebhookHandler.store.orders_file)
            matched_order = None
            if isinstance(orders, list):
                for o in orders:
                    stored_code = o.get("payosOrderCode")
                    if stored_code and str(stored_code) == order_code:
                        matched_order = o
                        break

            if matched_order:
                oid = matched_order.get("orderId", order_code)
                WebhookHandler.store.update_order_status(oid, "confirmed")

                # Notify admin via Telegram
                if WebhookHandler.bot:
                    msg = (
                        f"💸 *Đã nhận tiền!*\n\n"
                        f"📦 Đơn: `{oid}`\n"
                        f"💰 Số tiền: {amount:,}₫\n"
                        f"🏦 PayOS xác nhận\n"
                        f"📌 → Trạng thái: 🔵 Đã xác nhận\n\n"
                        f"Dùng `/update {oid} shipping` khi giao hàng."
                    )
                    WebhookHandler.bot.send_message(msg)
                    logger.info(f"Order {oid} auto-confirmed via PayOS")
            else:
                logger.warning(f"PayOS webhook: no order found for orderCode {order_code}")

        self._send_json({"success": True})

    def _handle_create_payment(self, raw_body: bytes) -> None:
        """Create a PayOS payment link for an order."""
        if not WebhookHandler.payos or not WebhookHandler.payos.enabled:
            self._send_json({"error": "PayOS not configured"}, 503)
            return
        try:
            body = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json({"error": "invalid json"}, 400)
            return

        order_id = body.get("orderId", "")
        amount = int(body.get("amount", 0))
        description = body.get("description", order_id)

        if not order_id or amount <= 0:
            self._send_json({"error": "missing orderId or amount"}, 400)
            return

        # Generate numeric order code from orderId (PayOS requires integer)
        import re
        numeric_part = re.sub(r'[^0-9]', '', order_id)
        order_code = int(numeric_part[-9:]) if numeric_part else int(time.time()) % 1000000000

        # Store orderCode on the order record
        if WebhookHandler.store:
            orders = WebhookHandler.store._read_json(WebhookHandler.store.orders_file)
            if isinstance(orders, list):
                for o in orders:
                    if o.get("orderId") == order_id:
                        o["payosOrderCode"] = order_code
                        WebhookHandler.store._write_json(WebhookHandler.store.orders_file, orders)
                        break

        base = WebhookHandler.base_url
        result = WebhookHandler.payos.create_payment(
            order_code=order_code,
            amount=amount,
            description=description,
            return_url=f"{base}/order-success?orderId={order_id}",
            cancel_url=f"{base}/order-form.html?cancelled={order_id}"
        )

        if result:
            self._send_json({
                "checkoutUrl": result.get("checkoutUrl"),
                "paymentLinkId": result.get("paymentLinkId"),
                "orderCode": order_code
            })
        else:
            self._send_json({"error": "PayOS payment creation failed"}, 502)

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
        self.port = int(os.environ.get("PORT") or config.get("WEBHOOK_PORT", 5000))
        self.secret = config.get("WEBHOOK_SECRET", "")
        
        # Data Paths
        self.data_dir = config.get("DATA_DIR", "./data")
        os.makedirs(self.data_dir, exist_ok=True)
        
        self.orders_file = os.path.join(self.data_dir, config.get("ORDERS_FILE", "orders.json"))
        self.stock_file = config.get("STOCK_FILE", "./stock.json") # Stock usually in tools dir
        self.chats_file = os.path.join(self.data_dir, "chats.json")

        self.bot_client = TelegramClient(self.token, self.chat_id)
        from db import SqliteStore
        db_path = os.environ.get("DB_PATH", os.path.join(self.data_dir, "shop.db"))
        self.store = SqliteStore(db_path)
        customers_file = os.path.join(self.data_dir, "customers.json")
        history_file = os.path.join(self.data_dir, "inventory_history.json")
        self.store.migrate_from_json(self.orders_file, self.stock_file, self.chats_file, customers_file, history_file)
        self.running = True

        # Initialize PayOS client — read from os.environ first (Railway), then config file
        payos_client_id = os.environ.get("PAYOS_CLIENT_ID") or config.get("PAYOS_CLIENT_ID", "")
        payos_api_key = os.environ.get("PAYOS_API_KEY") or config.get("PAYOS_API_KEY", "")
        payos_checksum_key = os.environ.get("PAYOS_CHECKSUM_KEY") or config.get("PAYOS_CHECKSUM_KEY", "")
        logger.info(f"PayOS init — client_id={'SET' if payos_client_id else 'MISSING'}, api_key={'SET' if payos_api_key else 'MISSING'}, checksum={'SET' if payos_checksum_key else 'MISSING'}")

        if PayOS and payos_client_id and payos_api_key and payos_checksum_key:
            self.payos_client = PayOS(
                client_id=payos_client_id,
                api_key=payos_api_key,
                checksum_key=payos_checksum_key
            )
            logger.info("PayOS payment gateway: ENABLED ✓")
        else:
            self.payos_client = None
            logger.warning("PayOS not configured — set PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY in .env")

        # Configure Webhook Handler
        WebhookHandler.store = self.store
        WebhookHandler.bot = self.bot_client
        WebhookHandler.secret = self.secret
        WebhookHandler.payos = self.payos_client
        WebhookHandler.base_url = config.get("BASE_URL", "https://web-production-46a5.up.railway.app")

        # GHN Shipping client
        self.ghn = GHNClient(
            token=config.get("GHN_TOKEN", ""),
            shop_id=config.get("GHN_SHOP_ID", "")
        )
        if self.ghn.enabled:
            logger.info("GHN shipping: ENABLED ✓")
        else:
            logger.warning("GHN not configured — set GHN_TOKEN, GHN_SHOP_ID in .env")
        WebhookHandler.ghn = self.ghn
        WebhookHandler.ghn_config = {
            "province_id": config.get("GHN_PROVINCE_ID", ""),
            "district_id": config.get("GHN_DISTRICT_ID", ""),
            "ward_code": config.get("GHN_WARD_CODE", ""),
            "address": config.get("GHN_ADDRESS", ""),
        }

    def _handle_command(self, message: Dict[str, Any]) -> None:
        """Process Telegram commands."""
        chat_id = message.get("chat_id")
        text = message.get("text", "").strip()
        sender_name = message.get("from", {}).get("first_name", "Bạn")
        
        is_admin = (str(chat_id) == str(self.chat_id))
        response = ""

        try:
            # ----- ADMIN COMMANDS -----
            if is_admin and text == "/orders":
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
            
            elif is_admin and text == "/stock":
                stock = self.store.get_stock()
                if not stock:
                    response = "📦 Dữ liệu kho trống."
                else:
                    response = "📦 *Tồn Kho:*\n\n"
                    for item in stock:
                        status = "✅" if item.get("stock", 0) > 0 else "❌"
                        response += f"{status} {item.get('name', 'N/A')} ({item.get('stock', 0)})\n"
            
            elif is_admin and text == "/revenue":
                revenue = self.store.calculate_monthly_revenue()
                month = datetime.now().strftime("%m/%Y")
                order_count = len([o for o in self.store._read_json(self.store.orders_file) if isinstance(o, dict) and o.get('created_at', '').startswith(datetime.now().strftime('%Y-%m'))])
                response = f"📊 *Doanh Thu Tháng {month}*\n\n💰 {revenue:,.0f}₫\n📦 {order_count} đơn"
            
            elif is_admin and text.startswith("/status"):
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
            
            elif is_admin and text.startswith("/update"):
                parts = text.split()
                if len(parts) < 3:
                    response = "ℹ️ Dùng: `/update KB-XXXX confirmed`\n\nTrạng thái: `pending` `confirmed` `shipping` `completed` `cancelled`"
                else:
                    oid, new_st = parts[1], parts[2]
                    if self.store.update_order_status(oid, new_st):
                        status_labels = {"pending": "🟡 Chờ xác nhận", "confirmed": "🔵 Đã xác nhận", "shipping": "🚚 Đang giao", "completed": "✅ Hoàn thành", "cancelled": "❌ Đã hủy"}
                        response = f"✅ Đơn `{oid}` → {status_labels.get(new_st, new_st)}"

                        # Nếu đơn COD → tự động tạo vận đơn GHN
                        if new_st == "shipping" and WebhookHandler.ghn and WebhookHandler.ghn.enabled:
                            order = self.store.get_order_by_id(oid)
                            if order and order.get("paymentMethod") == "cod":
                                ghn_result = WebhookHandler.ghn.create_order(order)
                                if ghn_result:
                                    mvd = ghn_result.get("order_code", "")
                                    delivery = ghn_result.get("expected_delivery_time", "")
                                    # Lưu mã vận đơn vào order
                                    orders = self.store._read_json(self.store.orders_file)
                                    if isinstance(orders, list):
                                        for o in orders:
                                            if o.get("orderId") == oid:
                                                o["ghnOrderCode"] = mvd
                                                o["estimatedDelivery"] = delivery
                                                self.store._write_json(self.store.orders_file, orders)
                                                break
                                    response += f"\n📦 GHN: `{mvd}` | Giao: {delivery[:10] if delivery else 'N/A'}"
                                else:
                                    response += "\n⚠️ Không tạo được vận đơn GHN — thêm thủ công."
                    else:
                        response = f"❌ Không tìm thấy `{oid}` hoặc trạng thái không hợp lệ"

            elif is_admin and text.startswith("/reply"):
                # /reply {sessionId} {text} - Reply to web chat
                parts = text.split(maxsplit=2)
                if len(parts) < 3:
                    response = "ℹ️ Dùng: `/reply sessionId nội dung`"
                else:
                    session_id = parts[1]
                    reply_text = parts[2]
                    result = self.store.add_chat_reply(session_id, reply_text)
                    if result.get("ok"):
                        response = f"✅ Đã reply session `{session_id}`:\n{reply_text}"
                    else:
                        response = f"❌ Session `{session_id}` không tồn tại"

            elif is_admin and text == "/test_drip":
                response = "🚀 Đang kích hoạt chu kỳ Drip Campaign thủ công. Check log!"
                self.bot_client.send_message(response)
                # Call drip once directly (don't block)
                threading.Thread(target=self._run_drip_campaign, daemon=True).start()
                return
            
            elif is_admin and (text == "/start" or text == "/help"):
                response = (
                    "👋 *Chào Admin K-Beauty Order!*\n\n"
                    "📋 Quản lý đơn:\n"
                    "/orders — 10 đơn gần nhất\n"
                    "/status `ID` — Chi tiết 1 đơn\n"
                    "/update `ID` `status` — Đổi trạng thái\n\n"
                    "💬 Live Chat:\n"
                    "/reply `sessionId` `nội dung` — Reply khách web\n\n"
                    "📊 Báo cáo:\n"
                    "/revenue — Doanh thu tháng\n"
                    "/stock — Tồn kho\n\n"
                    "📌 Trạng thái: pending → confirmed → shipping → completed"
                )
            
            # ----- CUSTOMER COMMANDS -----
            elif not is_admin and text.startswith("/start"):
                # Check for referral payload
                parts = text.split()
                referred_by = ""
                if len(parts) > 1 and parts[1].startswith("ref_"):
                    referred_by = parts[1].replace("ref_", "")
                
                # Register customer if not exists
                customer = self.store.get_customer(str(chat_id))
                if not customer:
                    customer = {
                        "chat_id": str(chat_id),
                        "name": sender_name,
                        "referred_by": referred_by,
                        "invited_count": 0,
                        "joined_at": datetime.now().isoformat()
                    }
                    self.store.save_customer(str(chat_id), customer)
                    
                    # Notify referrer if exists
                    if referred_by and referred_by != str(chat_id):
                        if self.store.increment_referral(referred_by):
                            ref_msg = (
                                f"🎉 *Chúc mừng!* Bạn vừa mời thành công 1 người bạn tham gia BeaPop.\n"
                                f"Lượt giới thiệu của bạn đã tăng lên! Hãy nhắc bạn ấy mua hàng để bạn được cộng điểm nhé."
                            )
                            self.bot_client._request("sendMessage", {"chat_id": referred_by, "text": ref_msg, "parse_mode": "Markdown"})
                
                # Send Welcome Message + Voucher
                response = (
                    f"👋 Chào mừng {sender_name} đến với *BeaPop* - Mỹ phẩm Hàn & K-Pop chính hãng!\n\n"
                    f"🎁 *Tặng bạn Voucher 10% cho đơn hàng đầu tiên!*\n"
                    f"👉 Nhập mã: `WELCOME10` tại bước thanh toán.\n\n"
                    f"🛒 Đặt hàng siêu tốc tại Web: [BeaPop Store](https://kbeauty-beapop.com)\n\n"
                    f"💡 *Mẹo:* Bạn có thể dùng lệnh /ref để lấy link giới thiệu, mời bạn bè và nhận thêm lợi ích từ BeaPop!"
                )
                
            elif not is_admin and text == "/ref":
                customer = self.store.get_customer(str(chat_id))
                invited = customer.get("invited_count", 0) if customer else 0
                
                response = (
                    f"🔗 *Link giới thiệu của bạn:*\n\n"
                    f"`https://t.me/BeaPop_Bot?start=ref_{chat_id}`\n\n"
                    f"👨‍👩‍👧‍👦 Bạn đã giới thiệu thành công: *{invited}* người.\n"
                    f"🎁 Gửi link này cho bạn bè. Khi họ bấm vào, hệ thống sẽ tự động ghi nhận cho bạn. Càng nhiều bạn tham gia, đặc quyền của bạn càng lớn!"
                )
                
            else:
                if not is_admin:
                    response = "🤖 Cám ơn bạn đã quan tâm BeaPop. Hiện tại mình chỉ là Bot tự động.\n🛒 Vui lòng truy cập website hoặc nhắn `/start` để nhận Voucher nhé!"

            # Send response if any
            if response:
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

    def _run_drip_campaign(self) -> None:
        """Background loop to send drip messages."""
        logger.info("Started Drip Campaign thread...")
        while self.running:
            try:
                customers = self.store._read_json(self.store.customers_file)
                if isinstance(customers, dict):
                    now = datetime.now()
                    for cid, data in customers.items():
                        joined_str = data.get("joined_at")
                        if not joined_str:
                            continue
                        try:
                            joined = datetime.fromisoformat(joined_str)
                        except ValueError:
                            continue
                        
                        days_passed = (now - joined).days
                        drip_state = data.get("drip_state", 0)

                        # Check if customer has any orders
                        has_orders = False
                        orders = self.store._read_json(self.store.orders_file)
                        if isinstance(orders, list):
                            for order in orders:
                                order_chat_id = order.get("chat_id", order.get("customer_chat_id", ""))
                                if str(order_chat_id) == str(cid):
                                    has_orders = True
                                    break

                        # Skip if customer already has orders
                        if has_orders:
                            continue

                        if days_passed >= 1 and drip_state < 1:
                            msg = (
                                f"🌟 Chào {data.get('name', 'bạn')}! Bạn đã ngắm được gợi ý nào ưng ý tại BeaPop chưa?\n"
                                f"🔥 Top 3 Best Seller hôm nay đang vơi nhanh lắm, xem thử nhé:\n"
                                f"1️⃣ Nước hoa hồng Anua Heartleaf\n"
                                f"2️⃣ Tinh chất chống nắng BoJ\n"
                                f"3️⃣ Serum cấp nước Torriden\n\n"
                                f"👉 Đừng quên bạn có mã `WELCOME10` giảm 10% nha. Nhấn link mua ngay: [BeaPop Store](https://kbeauty-beapop.com/order-form.html)"
                            )
                            if self.bot_client._request("sendMessage", {"chat_id": cid, "text": msg, "parse_mode": "Markdown"}):
                                data["drip_state"] = 1
                                self.store._write_json(self.store.customers_file, customers)

                        elif days_passed >= 2 and drip_state < 2:
                            msg = (
                                f"⏰ Ting ting! Mã `WELCOME10` của {data.get('name', 'bạn')} sắp hết hạn rồi!\n"
                                f"Đừng bỏ lỡ cơ hội sở hữu mỹ phẩm Hàn Quốc chính hãng với ưu đãi đặc biệt này.\n\n"
                                f"🛒 Chốt đơn lẹ tại: [BeaPop Store](https://kbeauty-beapop.com/order-form.html)"
                            )
                            if self.bot_client._request("sendMessage", {"chat_id": cid, "text": msg, "parse_mode": "Markdown"}):
                                data["drip_state"] = 2
                                self.store._write_json(self.store.customers_file, customers)

                for _ in range(3600):
                    if not self.running:
                        break
                    time.sleep(1)
            except Exception as e:
                logger.error(f"Drip Campaign error: {e}")
                time.sleep(60)

    def run(self) -> None:
        """Start the bot."""
        # HTTP-only mode (no Telegram token set)
        if not self.token or self.token == "dummy":
            logger.warning("Running in HTTP-only mode — set TELEGRAM_BOT_TOKEN for Telegram notifications")
            self._run_server()  # blocking
            return

        if not self.chat_id or self.chat_id == "0":
            logger.error("Missing TELEGRAM_CHAT_ID")
            self._run_server()
            return

        # Start Webhook Server Thread
        server_thread = threading.Thread(target=self._run_server, daemon=True)
        server_thread.start()

        # Start Drip Campaign Thread
        drip_thread = threading.Thread(target=self._run_drip_campaign, daemon=True)
        drip_thread.start()

        # Start Polling in Main Thread
        try:
            self._poll_telegram()
        except KeyboardInterrupt:
            logger.info("Shutting down...")
            self.running = False


def main() -> None:
    """Entry point."""
    # Load from .env file (local dev) — Railway uses actual env vars
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    config = load_env(env_path)

    # Railway env vars take priority over .env file
    for key in ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "WEBHOOK_PORT",
                "WEBHOOK_SECRET", "DATA_DIR",
                "PAYOS_CLIENT_ID", "PAYOS_API_KEY", "PAYOS_CHECKSUM_KEY"]:
        val = os.environ.get(key)
        if val:
            config[key] = val

    if not config.get("TELEGRAM_BOT_TOKEN"):
        logger.warning("TELEGRAM_BOT_TOKEN not set — running in HTTP-only mode (no Telegram notifications)")
        # Still run the HTTP server so the API works
        config["TELEGRAM_BOT_TOKEN"] = "dummy"
        config["TELEGRAM_CHAT_ID"] = "0"

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
