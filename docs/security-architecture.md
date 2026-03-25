# Security Architecture — BeaPop K-Beauty Order API

> **Version:** 1.0 | **Last updated:** 2026-03-25
> **Scope:** Cloudflare Worker (`workers/api/index.js`) — JWT, CORS, Rate Limiting, Input Validation

---

## Table of Contents

1. [Overview](#overview)
2. [JWT Authentication](#jwt-authentication)
3. [CORS Policy](#cors-policy)
4. [Rate Limiting](#rate-limiting)
5. [Input Validation & Path Safety](#input-validation--path-safety)
6. [Security Headers](#security-headers)
7. [Password Hashing](#password-hashing)
8. [Environment Variables](#environment-variables)
9. [Route Authorization Matrix](#route-authorization-matrix)

---

## Overview

The BeaPop API runs as a **Cloudflare Worker** — a V8-isolated serverless edge function with no persistent memory between requests. All security controls are stateless (JWT) or use external storage (KV for rate limiting, D1 for credential verification).

```
Browser / Mobile
      │
      ▼
  [CORS check]          ← resolveAllowedOrigin() — exact-match allowlist
      │
  [Global rate limit]   ← 200 req/min per IP via KV fixed-window counter
      │
  [Route dispatch]
      │
  [Per-route rate limit] ← auth_strict (5/min), order_write (10/min), etc.
      │
  [JWT verification]    ← verifyAdmin() or verifyCustomer()
      │
  [Input validation]    ← safeId(), phone regex, field length caps
      │
  [D1 query]
      │
  [Response + security headers]
```

---

## JWT Authentication

### Algorithm

**HS256** — HMAC-SHA256 via WebCrypto `crypto.subtle`.

The implementation uses `crypto.subtle.importKey` + `crypto.subtle.sign('HMAC', ...)`, which is the **correct HMAC primitive** (not a length-extension-vulnerable `SHA256(message + secret)` concatenation).

```
JWT = base64url(header) + "." + base64url(payload) + "." + base64url(HMAC-SHA256(header.payload, JWT_SECRET))
```

### Token Structure

```json
// Header
{ "alg": "HS256", "typ": "JWT" }

// Customer payload
{
  "customerId": "cust_abc123",
  "phone": "0901234567",
  "role": "customer",
  "iat": 1742860000,
  "exp": 1743464800        // iat + 7 days
}

// Admin payload
{
  "username": "admin",
  "role": "admin",
  "iat": 1742860000,
  "exp": 1742888800        // iat + 8 hours
}
```

### Expiry Policy

| Token type | TTL | Constant |
|------------|-----|----------|
| Customer | **7 days** | `JWT_EXPIRY_CUSTOMER = 7 * 24 * 3600` |
| Admin | **8 hours** | `JWT_EXPIRY_ADMIN = 8 * 3600` |

Admin sessions are short-lived by design: an admin who walks away from a dashboard will be automatically logged out after 8 hours.

### Verification Flow (`verifyJWT`)

1. Split token into 3 parts — reject immediately if not exactly 3.
2. Decode payload and **check `exp` first** (fail-fast before expensive crypto).
3. Recompute `HMAC-SHA256(header.payload, JWT_SECRET)`.
4. Compare hex strings — reject on mismatch.
5. Return payload on success, `null` on any failure (constant-time exit).

### Token Delivery

Tokens are delivered in the JSON response body and stored by the client in `localStorage`:

- Customer: `localStorage.setItem('customerToken', token)`
- Admin: `localStorage.setItem('adminToken', token)`

The `Authorization: Bearer <token>` header is attached by `apiFetch()` (admin) and `CartStore` (customer) for all protected API calls.

### Secret Management

The JWT secret is read from `env.JWT_SECRET` (Cloudflare Workers environment variable). A fallback `'beapop_secret_123'` exists for local development only and **must be overridden in production** via the Cloudflare dashboard.

---

## CORS Policy

### Exact-Origin Allowlist

The wildcard `Access-Control-Allow-Origin: *` is **not used**. Instead, `resolveAllowedOrigin()` compares the request's `Origin` header against a hard-coded allowlist, supplemented by the optional `env.ALLOWED_ORIGINS` runtime variable.

```
Allowlist (built-in):
  https://k-beauty-order.pages.dev
  https://beapop.pages.dev
  https://036b49c2.k-beauty-order.pages.dev
  http://localhost:5000
  http://localhost:3000
  http://127.0.0.1:5000
  http://127.0.0.1:3000

Runtime override:
  env.ALLOWED_ORIGINS = "https://new-domain.pages.dev,https://staging.pages.dev"
  (set in Cloudflare Workers → Settings → Variables)
```

**If the origin is not allowlisted:** the `Access-Control-Allow-Origin` header is omitted entirely — the browser blocks the response. Server-to-server requests (no `Origin` header) are not affected.

### Vary Header

Every response includes `Vary: Origin`. This prevents CDN/proxy caches from serving a response cached for origin A to a request from origin B.

### Preflight Handling

`OPTIONS` requests return immediately with the CORS headers and `null` body (no route processing, no rate limiting consumed).

### Allowed Methods & Headers

```
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Webhook-Secret, Authorization, X-Seed-Secret
```

`Authorization` is explicitly listed so `Bearer` tokens can be sent cross-origin without a second preflight per request.

---

## Rate Limiting

### Storage Backend

Cloudflare **KV** namespace (`RATE_LIMIT_KV` binding). KV is eventually consistent but sufficient for fixed-window counters where ±1 request of tolerance is acceptable.

**Fail-open design:** if `env.RATE_LIMIT_KV` is unbound (local dev) or KV returns an error, rate limiting is silently skipped. Legitimate traffic is never blocked by infrastructure issues.

### Window Key Format

```
rl:{category}:{identifier}:{bucket}

Examples:
  rl:global:203.0.113.42:29047966
  rl:auth_strict:203.0.113.42:29047966
  rl:auth_strict:203.0.113.42:admin:29047966   ← admin login uses IP+username
```

`bucket = floor(unix_timestamp / windowSecs)` — a new bucket starts at each window boundary. Each key is stored with `expirationTtl = windowSecs + 5s` (auto-expires from KV).

### Rate Limit Categories

| Category | Max requests | Window | Applied to |
|----------|-------------|--------|------------|
| `auth_strict` | **5 / 60s** | 1 min | `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/admin/login`, `POST /api/auth/change-password` |
| `auth_normal` | **15 / 60s** | 1 min | `GET /api/auth/me` |
| `order_write` | **10 / 60s** | 1 min | `POST /api/orders` |
| `write` | **30 / 60s** | 1 min | Other write endpoints (inventory, customers) |
| `global` | **200 / 60s** | 1 min | Every request, per IP — checked first |

### Admin Login: Distributed Brute-Force Protection

Standard IP-based rate limiting can be bypassed by rotating across many IPs. For `/api/admin/login`, the rate limit key is **`{IP}:{username}`** (truncated to 32 chars). An attacker would need 5 × (number of IP addresses) attempts per minute per username — much harder at scale.

### 429 Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 43
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1742860043

{"error": "Quá nhiều yêu cầu. Vui lòng thử lại sau."}
```

---

## Input Validation & Path Safety

### Path Traversal Prevention — `safeId()`

All URL path segments used as database IDs pass through `safeId()`:

```js
function safeId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const clean = decodeURIComponent(raw).trim();
  if (!/^[a-zA-Z0-9_\-]{1,64}$/.test(clean)) return null;
  return clean;
}
```

This blocks directory traversal (`../`), SQL injection via ID fields, and excessively long identifiers. Applied to all `/api/orders/:id`, `/api/inventory/:id`, `/api/customers/:id` routes.

### Order Creation Validation

`POST /api/orders` enforces:

| Field | Rule |
|-------|------|
| `phone` | Must match `/^0\d{9}$/` (Vietnamese mobile format) |
| `name` | Trimmed, max 200 characters |
| `address` | Trimmed, max 500 characters |
| `note` | Trimmed, max 1000 characters |
| `total` | `parseFloat()` — NaN rejected with 400 |
| `status` | **Always hardcoded to `'pending'`** — client cannot set order status |
| `id` | **Always `crypto.randomUUID()`** — client cannot supply order ID |

### Order Status Update Whitelist

`PUT /api/orders/:id` only accepts these status values (admin-only route):

```js
const ALLOWED_STATUSES = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];
```

Any other value returns `400 Bad Request`.

### Seed Endpoint Protection

`POST /api/seed/customers` requires the `X-Seed-Secret` header to match `env.SEED_SECRET`. Without the secret this endpoint returns `403 Forbidden`. This prevents unauthenticated database seeding in production.

---

## Security Headers

All responses include these headers regardless of route:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Block clickjacking via iframe |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage on cross-origin navigation |
| `Vary` | `Origin` | Correct CDN caching for CORS responses |

---

## Password Hashing

Passwords are stored as `{salt}:{SHA256(password + salt)}`:

1. Generate a 16-byte random salt (hex-encoded = 32 chars).
2. Concatenate `password + salt` and hash with `crypto.subtle.digest('SHA-256')`.
3. Store as `"<salt>:<hash>"` in the `password_hash` column.

**Note:** SHA-256 with a random salt provides protection against rainbow tables but is not bcrypt/scrypt/argon2. For a low-risk retail application this is acceptable; upgrading to a dedicated KDF would be a future improvement.

---

## Environment Variables

Set in **Cloudflare Workers → Settings → Variables** (encrypted at rest):

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** | HS256 signing secret — minimum 32 random bytes |
| `SEED_SECRET` | **Yes** | Guards `POST /api/seed/customers` in production |
| `ALLOWED_ORIGINS` | No | Comma-separated extra origins added to CORS allowlist at runtime |

The `RATE_LIMIT_KV` binding is configured in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "<your-kv-namespace-id>"
```

Create with:
```bash
wrangler kv:namespace create "RATE_LIMIT"
# Copy the output ID into wrangler.toml
```

---

## Route Authorization Matrix

| Route | Method | Auth required | Rate limit category |
|-------|--------|--------------|-------------------|
| `/api/auth/register` | POST | — | `auth_strict` |
| `/api/auth/login` | POST | — | `auth_strict` |
| `/api/auth/me` | GET | Customer JWT | `auth_normal` |
| `/api/auth/change-password` | POST | Customer JWT | `auth_strict` |
| `/api/admin/login` | POST | — | `auth_strict` (IP+username key) |
| `/api/orders` | GET | Admin JWT | `global` |
| `/api/orders` | POST | — | `order_write` |
| `/api/orders/:id` | PUT | Admin JWT | `global` |
| `/api/orders/:id` | DELETE | Admin JWT | `global` |
| `/api/inventory` | GET | — | `global` |
| `/api/inventory` | POST | Admin JWT | `write` |
| `/api/inventory/:id` | PUT | Admin JWT | `write` |
| `/api/inventory/:id` | DELETE | Admin JWT | `write` |
| `/api/stats` | GET | Admin JWT | `global` |
| `/api/customers` | GET | Admin JWT | `global` |
| `/api/customers/:id` | GET | Admin JWT | `global` |
| `/api/cart` | GET | Customer JWT | `global` |
| `/api/cart` | PUT | Customer JWT | `write` |
| `/api/cart` | DELETE | Customer JWT | `write` |
| `/api/seed/customers` | POST | `X-Seed-Secret` header | `global` |

---

## Threat Model Summary

| Threat | Mitigation |
|--------|-----------|
| Token forgery | HMAC-SHA256 via WebCrypto — length-extension safe |
| Stolen/expired token | `exp` claim checked on every request |
| Cross-site request forgery | CORS exact-origin allowlist; `Authorization` header required (not cookies) |
| Credential brute-force | `auth_strict`: 5 attempts/min; admin login keyed by IP+username |
| DoS / request flooding | Global 200 req/min per IP |
| Order status tampering | Status hardcoded to `'pending'` on creation; PUT whitelist enforced |
| Path traversal via IDs | `safeId()` character allowlist on all URL-path ID segments |
| Unauthenticated seeding | `X-Seed-Secret` required on seed endpoint |
| Clickjacking | `X-Frame-Options: DENY` |
| MIME confusion | `X-Content-Type-Options: nosniff` |
| CDN origin confusion | `Vary: Origin` on all CORS responses |
