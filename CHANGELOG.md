# K-Beauty Order (BeaPop) — CHANGELOG

> Premium K-Beauty & K-Pop ordering platform
> **Deploy:** Cloudflare Pages (frontend) + Cloudflare Workers API + D1 Database
> **Repository:** https://github.com/tothihaiau0101-code/k-beauty-order

---

## [Unreleased] — M83

### Planned
- **M83:** Documentation — CHANGELOG.md for complete project history

---

## [5.0.0] — 2026-03-26 — M82: Uptime Health Check

### Added
- Health check script with Telegram alerts for downtime monitoring
- Automated uptime tracking with configurable intervals
- Alert notifications to admin Telegram on service interruption

### Changed
- Updated deployment configuration for better reliability

### Files
- `scripts/health_check.py` — New uptime monitoring script
- `wrangler.toml` — Updated pages_build_output_dir for wrangler v4

---

## [4.9.0] — 2026-03-25 — M81: Skeleton Loading + Error Boundary

### Added
- Skeleton loading states for all data-fetching components
- Glassmorphism error boundary UI with retry functionality
- Security architecture documentation (`docs/security-architecture.md`)

### Changed
- Improved perceived performance during data loading
- Enhanced error handling UX across all pages

### Security
- Bumped `httpx` dependency to v0.28.1 (security patch)

### Files
- `catalog.html` — Skeleton loaders for product cards
- `admin.html` — Skeleton loaders for tables
- `docs/security-architecture.md` — New security documentation
- `LIGHTHOUSE_REPORT_M81.md` — Performance benchmark

---

## [4.8.0] — 2026-03-25 — M80: Security Hardening

### Added
- Rate limiting API gateway (100 requests/minute per IP)
- CORS lockdown with explicit allowlist
- Input sanitization via `safeId()` function

### Fixed
- **JWT vulnerability:** Patched potential token tampering vector
- **Checkout flow:** Fixed 5 security vulnerabilities identified in audit
- SQL injection prevention in all query parameters
- XSS prevention in user-generated content fields

### Security
- All API endpoints now validate input with `safeId()` helper
- Rate limit headers returned on all responses
- CORS preflight caching enabled

### Files
- `workers/api/index.js` — Rate limiter + CORS middleware + safeId()
- `tests/test_security_m80_access_denied.py` — 122 security test cases

---

## [4.7.0] — 2026-03-24 — M79: Complete Shopping Flow

### Added
- Full cart state management with offline-first D1 sync
- Complete checkout flow integration (catalog → cart → order)
- Auto-upsert customer on checkout
- Order stats endpoint for dashboard
- JSON items storage in orders table

### Changed
- Cart now syncs to Cloudflare D1 on each operation
- Guest checkout auto-creates customer record
- Loyalty tier calculation runs on every purchase

### Fixed
- Cart state persistence across page reloads
- Order total calculation with voucher discounts

### Files
- `catalog.html` — Enhanced cart management
- `cart.html` — New standalone cart page
- `order-form.html` — Integrated checkout flow
- `workers/api/index.js` — Checkout + stats endpoints

---

## [4.6.0] — 2026-03-24 — M77-M78: JWT Authentication

### Added
- **Customer Auth (M77):** Login/Register with JWT tokens
  - `POST /api/auth/register` — Customer registration
  - `POST /api/auth/login` — Customer login
  - `GET /api/auth/me` — Get current customer profile
  - `POST /api/auth/change-password` — Password change
- **Admin Auth (M78):** JWT-protected admin dashboard
  - `POST /api/admin/login` — Admin authentication
  - Admin middleware for all protected routes
  - Role-based access control (customer vs admin tokens)
- **D1 Database Tables:**
  - `admins` — Admin credentials (username, password_hash, role)
  - `customers` — Updated with password_hash column

### Changed
- Migrated from localStorage plaintext to JWT tokens
- All admin routes now require Bearer token with `role: 'admin'`
- Customer routes require valid JWT with `role: 'customer'`
- Token expiry: 24 hours with automatic invalidation on password change

### Fixed
- CORS Authorization header handling
- JWT expiry validation with proper error messages
- Secret key rotation support via environment variable
- Cross-role token isolation (customer tokens cannot access admin routes)

### Security
- Passwords hashed with salt + SHA-256
- JWT signed with HMAC-SHA256
- Token tampering detection with signature verification
- Role validation on every protected request

### Files
- `workers/api/index.js` — Auth endpoints + JWT middleware
- `schema.sql` — Admins table + customers.password_hash
- `auth.js` — Customer auth UI logic
- `login.html` — Admin login page
- `tools/seed_admin.sh` — Admin account seeder
- `tests/test_auth_m77_m78.py` — 26 auth test cases

---

## [4.5.0] — 2026-03-23 — M76: Customer Database on D1

### Added
- **Customers table on Cloudflare D1:**
  - `customerId`, `name`, `phone`, `email`, `address`
  - `loyalty_tier`, `total_orders`, `total_spent`
  - `joined_at`, `note`
  - Indexes on `phone` and `loyalty_tier`
- **Customer API endpoints:**
  - `GET /api/customers` — List with tier filter
  - `GET /api/customers/:phone` — Customer detail + orders
  - `POST /api/customers` — Create/upsert customer
  - `PUT /api/customers/:phone/tier` — Update loyalty tier
  - `POST /api/seed/customers` — Seed 100 demo customers (dev)
- **Auto-upsert logic:** Customers auto-created on order placement
- **Loyalty tier calculation:** Bronze/Silver/Gold/Platinum based on spend
- **Admin Dashboard Tab:** New "Khách Hàng" tab with tier filter

### Changed
- Customer data now stored in D1 (not JSON files)
- Loyalty tier auto-calculated on purchase

### Files
- `schema.sql` — Customers table + indexes
- `workers/api/index.js` — Customer CRUD + tier calc
- `admin.html` — Customers tab
- `tools/seed_d1_customers.sh` — Seed script
- `tools/data/customers.json` — 100 demo customers

---

## [4.4.0] — 2026-03-22 — M75: Cloudflare D1 Migration

### Added
- **Cloudflare D1 Database:** `beapop-db` with persistent edge SQLite
- **Cloudflare Worker API:** `beapop-api` as API layer
  - All CRUD operations routed through Worker
  - CORS headers for Pages → Worker communication
- **Schema:** `orders`, `inventory`, `inventory_history` tables
- **wrangler.toml:** D1 binding + Pages config

### Changed
- **Architecture:** Railway → Cloudflare migration
  - Frontend: Cloudflare Pages (static)
  - API: Cloudflare Worker (edge compute)
  - Database: Cloudflare D1 (edge SQLite)
  - Railway: Telegram Bot only (webhook receiver)
- Database path now configurable via environment variable

### Removed
- Local SQLite file writes to ephemeral filesystem

### Files
- `wrangler.toml` — D1 database binding
- `schema.sql` — D1 schema (orders, inventory, history)
- `workers/api/index.js` — Worker API router
- `telegram_bot.py` — HTTP calls to Worker instead of local DB

---

## [4.3.0] — 2026-03-21 — M72-M74: Sprint 16 Fixes

### M72: Analytics + API URL Centralization
#### Fixed
- Analytics closure binding (`this._getOrders` undefined → closure variable)
- Weekly chart field (`o.date` → `o.created_at`)
- API URL centralized via `<meta name="api-url">` tag

#### Files
- `src/admin/analytics.js` — Closure fix
- `src/admin/utils.js` — API URL helper
- `catalog.html`, `order-form.html`, `tracking.html`, `chat-widget.js` — Meta tag

### M73: SQLite + Railway Volume
#### Added
- Railway Persistent Volume mounted at `/data`
- `DB_PATH` environment variable configuration

#### Fixed
- SQLite database path reads from env var for persistence

### M74: Admin Auth Backend
#### Added
- `POST /api/admin/login` endpoint verification
- `ADMIN_PASSWORD` environment variable

#### Files
- `telegram_bot.py` — Admin login endpoint
- `login.html` — Admin login form

---

## [4.2.0] — 2026-03-20 — M67-M70: Sprint 14 Cleanup

### M67: Remove Deprecated DataStore
#### Removed
- Class `DataStore` (~300 lines) from `tools/telegram_bot.py`
- All references to legacy JSON-based storage

#### Changed
- Codebase now fully uses `SqliteStore` from `tools/db.py`

### M68: CI/CD Test Step
#### Added
- `test` job in `.github/workflows/deploy.yml`
- Pytest runs before deploy on every push

### M69: Deploy Documentation
#### Added
- `DEPLOY.md` — Complete deployment guide
- Railway Volume setup instructions
- Environment variable configuration

### M70: Cleanup Legacy Files
#### Removed
- `stock.json` (root) — Data now in SQLite

---

## [4.1.0] — 2026-03-20 — M66: Testing Infrastructure

### Added
- **Backend tests (pytest):**
  - `tests/test_db.py` — SqliteStore CRUD (11 tests)
  - `tests/conftest.py` — Pytest fixtures
- **Frontend tests (Node.js built-in runner):**
  - `tests/frontend/test_frontend.mjs` — 54 test cases

### Coverage
- Phone validation, name validation, password validation
- Loyalty tier calculation, tier colors
- Reward milestones, voucher application
- Cart operations, safeId() security

---

## [4.0.0] — 2026-03-20 — M64-M65: Admin Authentication + Code Splitting

### M64: Admin Authentication
#### Added
- `login.html` — Admin login page with password form
- `POST /api/admin/login` — JWT token endpoint
- Session-based token storage (`sessionStorage`)
- Authorization header on all admin API calls
- Middleware to block unauthorized PUT/POST requests

#### Security
- Token-based authentication (no plaintext passwords)
- Session expires on browser close

### M65: Admin Code Splitting
#### Added
- `src/admin/utils.js` — Shared utilities (formatVND, API, apiFetch)
- `src/admin/orders.js` — Orders tab logic
- `src/admin/stock.js` — Inventory tab logic
- `src/admin/analytics.js` — Analytics + Loyalty tab logic

#### Changed
- `admin.html` reduced from 1079 lines → ~400 lines
- ES Module imports replace inline scripts

---

## [3.5.0] — 2026-03-19 — M62: COD GHN Shipping + Tracking

### Added
- **GHN Integration (Giao Hàng Nhanh):**
  - `GHNClient` class in `telegram_bot.py`
  - Auto-create shipping order on `/update KB-XXXX shipping`
  - Support for COD (Cash on Delivery) payment
  - Estimated delivery time tracking
- **Order Tracking Page:**
  - `tracking.html` — Customer-facing order lookup
  - Phone number search
  - Timeline visualization (4 steps: pending → confirmed → shipping → completed)
  - GHN tracking link integration
- **Backend API:**
  - `GET /api/orders?phone=xxx` — Filter orders by phone
  - `GET /api/order-status/:id` — Order status poll

### Environment Variables
```
GHN_TOKEN=<API token>
GHN_SHOP_ID=<shop ID>
GHN_PROVINCE_ID=<warehouse province>
GHN_DISTRICT_ID=<warehouse district>
GHN_WARD_CODE=<warehouse ward>
GHN_ADDRESS=<warehouse address>
```

### Files
- `telegram_bot.py` — GHNClient + auto-shipping logic
- `tracking.html` — Customer tracking UI
- `.env` — GHN credentials

---

## [3.4.0] — 2026-03-19 — M59: PayOS Success Confirmation

### Added
- **PayOS Return URL:**
  - `return_url` parameter on payment link creation
  - `cancel_url` for cancelled payments
- **Success Banner:**
  - Green banner on `?payment=success` param
  - Auto-poll backend for order confirmation
  - Order status verification via `GET /api/order-status/:id`
- **Backend Endpoint:**
  - `GET /api/order-status/:id` — Order status check

### Changed
- Order confirmation only after successful payment
- Payment cancellation shows warning banner

### Files
- `telegram_bot.py` — PayOS return_url + cancel_url
- `order-form.html` — Success banner + status polling

---

## [3.3.0] — 2026-03-18 — M55-M58: Sprint 9-10 Features

### M55: Loyalty Voucher Program
#### Added
- **Reward Milestones:**
  - LOYAL500K: Giảm 5%
  - LOYAL1M: Giảm 10% (max 100k)
  - LOYAL2M: Giảm 50k
  - LOYAL5M: Giảm 15% (max 200k)
  - LOYAL10M: Giảm 20% (max 300k)
- **Voucher Wallet:**
  - Auto-generated vouchers on milestone achievement
  - Used/unused status tracking
  - Copy-to-clipboard functionality
- **Milestone Tracker:**
  - Progress bars for next tier
  - Tier-based UI colors (Bronze/Silver/Gold/VIP)
- **Order Form Integration:**
  - Loyalty voucher application
  - Milestone nudge ("Mua thêm X₫ để nhận voucher...")

#### Files
- `auth.js` — Voucher engine + milestone logic
- `account.html` — Voucher wallet UI
- `order-form.html` — Voucher application + nudge

### M56: Security Hardening
#### Added
- **PBKDF2 Password Hashing:**
  - 100,000 iterations with random salt
  - Salt stored as `salt:hash` format
- **Rate Limiting:**
  - 5 attempts max, 30s lockout
  - SessionStorage-based tracking
  - Applied to login + reset password
- **PIN Security:**
  - 4-6 digit PIN on registration
  - PIN required for password reset
  - `Auth.changePin()` method
- **Unified Error Messages:**
  - Single "Invalid credentials" message (no user enumeration)

#### Files
- `auth.js` — PBKDF2, rate limiting, PIN

### M57: Auto-fill Order Form
#### Added
- Auto-fill customer info from auth profile
- Badge indicating pre-filled information
- Auto-save address on successful order

#### Files
- `auth.js` — `saveAddress()` method
- `order-form.html` — Auto-fill logic + badge

### M58: Change Password/PIN
#### Added
- Change password section in account page
- Change PIN section in account page
- Inline success/error feedback

#### Files
- `account.html` — Password/PIN change forms

---

## [3.2.0] — 2026-03-18 — M53-M54: UI Polish

### M53: Product Popup Light Theme
#### Changed
- Dark theme → Light theme for product detail modal
- Background: `#1a1a2e` → `#ffffff`
- Text colors: `rgba(255,255,255,0.x)` → `var(--text-secondary)`
- Border colors: `rgba(255,255,255,0.x)` → `rgba(0,0,0,0.07)`
- Purple accents → Black for better contrast

### M53b: Popup Text Color Fix
#### Changed
- Brand text: `#7c3aed` → `#1a1a1a`
- Reviewer names: `#7c3aed` → `#1a1a1a`
- "Add to Cart" button: Purple → Black

### M54: Order Form Light Theme
#### Changed
- **Cart Bar:** Dark → Light (`rgba(6,6,14,0.95)` → `rgba(255,255,255,0.97)`)
- **Payment Modal:** Dark gradient → White background
- **Payment Info Boxes:** Dark → Light theme
- **Qty Buttons:** Light theme styling

#### Files
- `catalog.html` — Product modal theme
- `order-form.html` — Cart bar + payment modal theme

---

## [3.1.0] — 2026-03-17 — M45-M52: Core Features

### M45: Category Filter
#### Added
- Filter bar: Tất cả / Skincare / Makeup / Album / Combo
- Active state with gradient background
- Section-based filtering logic

### M4: Social Channels Floating Bar
#### Added
- Floating sidebar with Zalo, Facebook, Instagram, TikTok links
- Fixed position on left side of viewport

### M46: Order Tracking
#### Added
- `tracking.html` — Order tracking page
- Phone number lookup
- Timeline visualization (4-step flow)
- Demo data for testing

### M47: Blog
#### Added
- `blog.html` — Skincare blog page
- 5 articles:
  - Quy trình skincare 5 bước
  - Top 5 kem chống nắng
  - Cách chọn toner
  - Review COSRX Snail
  - K-Pop album nên mua 2025
- Card grid layout with "Đọc thêm" toggle

### M48: PWA
#### Added
- `manifest.json` — PWA manifest (name, icons, theme)
- `sw.js` — Service Worker with offline-first caching
- Relative paths for sub-folder deployment
- `offline.html` — Offline fallback page

### M49: Multi-language (Planned)
#### Added
- EN/VI toggle button framework
- i18n object structure for translations
- localStorage persistence for language preference

### M50: Analytics Dashboard (Planned)
#### Added
- Analytics tab in admin dashboard
- Metrics: Conversion rate, top products, weekly chart
- Data sourced from `allOrders` array (API data)

### M51: Loyalty Program (Planned)
#### Added
- Points system (10,000₫ = 1 point)
- Tier badges: Bronze/Silver/Gold/VIP
- Customer leaderboard in admin

### M52: Telegram Drip Campaign (Planned)
#### Added
- Auto drip campaign framework in `telegram_bot.py`
- Day 1 welcome message with best sellers + voucher
- `/test_drip` admin command

---

## [3.0.0] — 2026-03-16 — M60-M63: Cart Enhancements

### M60: Cart Dropdown with Controls
#### Added
- Cart dropdown with +/- quantity buttons
- Remove button per item
- Total price display
- Click-outside-to-close behavior

### M61: Standalone Cart Page
#### Added
- `cart.html` — Dedicated cart page
- Two-column layout (products | order summary)
- Quantity controls (+/-)
- Remove item functionality
- "Đặt Hàng Ngay" CTA → order-form.html

### M62 (Sprint 4A): Service Worker Fix
#### Fixed
- Relative paths for `sw.js` and `manifest.json`
- `STATIC_ASSETS` array updated for Pages deployment
- Created `offline.html` fallback page

### M63 (Sprint 4A): Product Tester Program
#### Added
- `tester.html` — Product tester application page
- Campaign list with slot availability
- Application form (name, phone, skin type, social link)
- "Báo cáo Review" button for approved testers
- Nav link: "🎁 Tester" on all pages

---

## [2.5.0] — 2026-03-15 — M6-M7: UI Enhancements

### M6: Chat Widget
#### Added
- Floating chat widget (`chat-widget.js`)
- Web to Telegram message bridge
- Auto-welcome greeting
- Toast notifications

### M7: Account Page
#### Added
- `account.html` — Customer account page
- Profile view/edit
- Order history
- Loyalty tier display
- Points balance

---

## [2.4.0] — 2026-03-14 — SQLite Migration

### Added
- **SqliteStore class** (`tools/db.py`):
  - `init_db()` — Schema creation
  - `add_order()`, `get_order_by_id()`, `update_order_status()`
  - `update_stock()`, `get_inventory()`, `get_inventory_history()`
  - Context manager with WAL mode for concurrent writes
- **Railway Persistent Volume:**
  - Mount path `/data`
  - `DB_PATH=/data/shop.db` environment variable

### Changed
- Database backend: JSON files → SQLite
- All API endpoints use `SqliteStore`

### Removed
- Direct JSON file reads/writes for orders and inventory

---

## [2.3.0] — 2026-03-13 — Bug Fixes

### Fixed
- **Analytics Bug:** `loadAnalytics()` now reads from `allOrders` (API data) instead of `localStorage.getItem('kb_orders')` (empty)
- **Loyalty Bug:** `loadLoyalty()` fixed to use API data
- **API URL:** Centralized via meta tag
- **Lang Attribute:** `<html lang="vi">` instead of `lang="en"`

### Files
- `admin.html` — Analytics and Loyalty fix
- `index.html` — lang="vi"

---

## [2.2.0] — 2026-03-12 — Admin Authentication

### Added
- Admin login requirement for dashboard access
- Session-based token validation
- Protected API endpoints (PUT/POST)

---

## [2.1.0] — 2026-03-11 — PayOS Integration

### Added
- PayOS payment gateway integration
- Payment link creation API
- Multi-payment method support:
  - PayOS (QR code)
  - MoMo
  - ZaloPay
  - COD (Cash on Delivery)

---

## [2.0.0] — 2026-03-10 — Cloudflare Pages Migration

### Changed
- **Hosting:** Netlify → Cloudflare Pages
- **API:** Railway → Cloudflare Workers (partial)
- **Database:** JSON files → SQLite (Railway) → D1 (Cloudflare)

### Added
- `_redirects` file for Cloudflare Pages routing
- `wrangler.toml` for D1 + Worker config
- Cloudflare-specific build output directory

---

## [1.5.0] — 2026-03-08 — Telegram Bot

### Added
- Telegram bot for order notifications (`tools/telegram_bot.py`)
- Webhook endpoint for order creation
- Admin commands: `/update`, `/stats`, `/export`
- Customer notification on order status change

---

## [1.4.0] — 2026-03-06 — Admin Dashboard

### Added
- `admin.html` — Admin dashboard with 5 tabs:
  - Orders (list, filter, update status)
  - Stock (inventory in/out, history)
  - Customers (list, search)
  - Analytics (KPIs, charts)
  - Loyalty (tier leaderboard)
- Export CSV functionality
- Real-time auto-refresh (30s interval)

---

## [1.3.0] — 2026-03-04 — Order Form

### Added
- `order-form.html` — Interactive order form
- Cart bar with product list
- Payment method selection
- Voucher code application
- Order confirmation modal with payment info

---

## [1.2.0] — 2026-03-02 — Catalog

### Added
- `catalog.html` — Product catalog page
- Product cards with images, prices, descriptions
- Search functionality
- Filter by category
- Add to cart functionality
- Product detail modal

---

## [1.1.0] — 2026-03-01 — PWA Foundation

### Added
- `manifest.json` — PWA manifest
- `sw.js` — Service Worker
- Dark theme design
- Responsive layout (mobile-first)

---

## [1.0.0] — 2026-02-28 — Initial Release

### Added
- Basic order form (`order-form.html`)
- Product catalog (static)
- JSON file storage (`data/orders.json`, `stock.json`)
- Python backend (`tools/telegram_bot.py`)
- README documentation

---

## Version Numbering

This project follows semantic versioning:
- **Major:** Breaking changes (architecture, auth system)
- **Minor:** New features, missions (M##)
- **Patch:** Bug fixes, security patches

## Mission Coding

Missions are coded M4, M5, M6... and tracked in `cto_dispatch_missions.md`:
- **Sprint 1-3:** Bug fixes, SQLite migration, admin auth
- **Sprint 4:** Code splitting (M65)
- **Sprint 5:** Testing (M66)
- **Sprint 6-12:** Feature sprints (M4-M71)
- **Sprint 13:** Remaining (M62-M71)
- **Sprint 14:** Cleanup (M67-M70)
- **Sprint 15:** System tools (M71 RAM Monitor)
- **Sprint 16-19:** Cloudflare migration (M72-M78)
- **Sprint 20+:** Shopping flow + security (M79-M82)

## Deploy Targets

| Target | Platform | Notes |
|--------|----------|-------|
| Frontend | Cloudflare Pages | `wrangler pages deploy . --project-name k-beauty-order` |
| API Worker | Cloudflare Workers | `wrangler deploy workers/api/index.js --name beapop-api` |
| Database | Cloudflare D1 | `beapop-db` binding |
| Bot | Railway | Telegram bot only (webhook) |

---

*Last updated: 2026-03-26*
