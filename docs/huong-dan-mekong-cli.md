# 📖 HƯỚNG DẪN SỬ DỤNG MEKONG CLI — Dự Án K-Beauty Order

> **Phiên bản:** v5.0 · **Ngày tạo:** 22/03/2026
> **Dự án tham chiếu:** K-Beauty Order — Nền tảng đặt hàng mỹ phẩm Hàn Quốc

---

## 📋 MỤC LỤC

1. [Tổng Quan Kiến Trúc](#-tổng-quan-kiến-trúc)
2. [Cách Cài Đặt & Cấu Hình](#-cách-cài-đặt--cấu-hình)
3. [TẦNG 0 — META (Hệ thống)](#-tầng-0--meta)
4. [TẦNG 1 — STUDIO (Sáng tạo & Thiết kế)](#-tầng-1--studio)
5. [TẦNG 2 — FOUNDER (Chiến lược & Vốn)](#-tầng-2--founder)
6. [TẦNG 3 — BUSINESS (Kinh doanh)](#-tầng-3--business)
7. [TẦNG 4 — PRODUCT (Sản phẩm)](#-tầng-4--product)
8. [TẦNG 5 — ENGINEERING (Kỹ thuật)](#-tầng-5--engineering)
9. [TẦNG 6 — OPS (Vận hành)](#-tầng-6--ops)
10. [Water Protocol 水](#-water-protocol-水)
11. [Hệ Thống Agent & Model Routing](#-hệ-thống-agent--model-routing)

---

## 🏗 TỔNG QUAN KIẾN TRÚC

Mekong CLI là **nền tảng kinh doanh vận hành bằng AI**, được tổ chức theo **6 tầng kiến trúc** chuyển tiếp từ chiến lược đến thực thi:

```
┌─────────────────────────────────────────┐
│  TẦNG 1 — STUDIO    (Sáng tạo)         │  brainstorm, design, branding
│  TẦNG 2 — FOUNDER   (Chiến lược)       │  fundraise, intel, binh-phap
│  TẦNG 3 — BUSINESS  (Kinh doanh)       │  sales, marketing, finance
│  TẦNG 4 — PRODUCT   (Sản phẩm)        │  plan, sprint, roadmap, launch
│  TẦNG 5 — ENGINEERING (Kỹ thuật)       │  code, fix, review, deploy, test
│  TẦNG 6 — OPS       (Vận hành)         │  ops, status, monitor, sync
├─────────────────────────────────────────┤
│  TẦNG 0 — META (xuyên suốt)            │  help, cook, init, bootstrap
└─────────────────────────────────────────┘
```

**Nguyên lý cốt lõi:**
- **PEV Pipeline:** Plan → Execute → Verify — mọi tác vụ đều đi qua 3 bước này
- **MCU (Mekong Credit Unit):** Đơn vị thanh toán cho mỗi tác vụ AI
- **Water Protocol 水:** Luồng ngữ cảnh đa agent chảy giữa các tầng
- **Jidoka (Tự kiểm):** Dừng ngay khi phát hiện vấn đề nguy hiểm

---

## ⚙ CÁI ĐẶT & CẤU HÌNH

### Cài đặt
```bash
# Clone repo
git clone https://github.com/longtho638-jpg/mekong-cli.git

# Cài đặt Python CLI
cd mekong-cli
pip install -e .

# Cài đặt TypeScript packages
pnpm install
```

### Cấu hình LLM (bắt buộc)
```bash
# Cấu hình 3 biến môi trường — hỗ trợ MỌI nhà cung cấp LLM
export LLM_BASE_URL="https://api.anthropic.com"
export LLM_API_KEY="sk-ant-..."
export LLM_MODEL="claude-sonnet-4-6"
```

### Kiểm tra sức khỏe hệ thống
```bash
mekong doctor check    # Kiểm tra toàn bộ hệ thống
```

---

## 🔧 TẦNG 0 — META

> Các lệnh **xuyên suốt**, không thuộc tầng nào cụ thể — nền tảng cho mọi hoạt động.

---

### `/help` — Tra cứu lệnh

**Công dụng:** Hiển thị danh sách tất cả lệnh. Tự nhận diện persona (dev hoặc non-tech) để hiển thị phù hợp.

```bash
mekong help              # Xem tất cả lệnh
mekong help cook         # Xem chi tiết lệnh /cook
mekong help deploy       # Xem chi tiết lệnh /deploy
```

**Ví dụ K-Beauty:** Khi mới bắt đầu dự án, chạy `mekong help` để xem tổng quan các lệnh có thể dùng.

---

### `/cook` — Thực thi tác vụ thông minh ⭐

**Công dụng:** Lệnh **số 1 quan trọng nhất**. Nhận mô tả bằng ngôn ngữ tự nhiên, tự phân loại (code/content/ops/analysis), chọn agent + model phù hợp, thực thi theo PEV pipeline.

```bash
mekong cook "viết email marketing cho bộ serum mới"
mekong cook "fix lỗi đơn hàng không gửi được telegram"
mekong cook "tạo báo cáo doanh thu tháng 3"
```

**Flags quan trọng:**

| Flag | Mô tả |
|------|--------|
| `--agent cto` | Chỉ định agent (cto/cmo/coo/cfo/cs/sales/editor/data) |
| `--model claude-opus-4-6` | Chỉ định model LLM cụ thể |
| `--dry-run` | Chỉ lên kế hoạch, không thực thi |
| `--no-bill` | Không tính MCU (dùng khi dev/test) |
| `--strict` | Không retry nếu verify fail |
| `--verbose` | Hiện chi tiết routing và quyết định |

**Ví dụ K-Beauty chi tiết:**
```bash
# CMO agent viết nội dung marketing cho sản phẩm mới
mekong cook "viết bài review sản phẩm COSRX Snail Mucin cho fanpage" --agent cmo

# CTO agent fix bug form đặt hàng
mekong cook "sửa lỗi validation số điện thoại trong order-form.html" --agent cto

# Xem kế hoạch trước khi thực thi, không tốn MCU
mekong cook "thêm tính năng loyalty points cho khách hàng" --dry-run

# Data agent phân tích đơn hàng
mekong cook "phân tích top 10 sản phẩm bán chạy Q1 2026" --agent data
```

**Quy trình xử lý:**
1. **SCAN** — Đọc context dự án (CLAUDE.md, company.json, cto-memory.md)
2. **CLASSIFY** — Phân loại domain (code/content/ops/analysis/support)
3. **MODEL SELECT** — Chọn model phù hợp dựa trên agent + complexity
4. **EXECUTE (PEV)** — Plan → Execute → Verify
5. **BILLING** — Ghi nhận MCU đã dùng
6. **MEMORY** — Lưu kết quả vào bộ nhớ

---

### `/init` — Khởi tạo dự án

**Công dụng:** Tự động setup toàn bộ cấu trúc AgencyOS trong dự án hiện tại. **Không hỏi gì** — chạy xong là xong.

```bash
mekong init              # Khởi tạo trong thư mục hiện tại
mekong init k-beauty     # Khởi tạo dự án tên k-beauty
```

**Tạo ra cấu trúc:**
```
├── .agencyos/
│   ├── commands/
│   ├── workflows/
│   │   ├── primary-workflow.md
│   │   └── development-rules.md
│   └── mcp.json
├── AGENCYOS.md
└── docs/
```

**Ví dụ K-Beauty:** Chạy `mekong init` khi bắt đầu dự án K-Beauty Order để có ngay cấu trúc chuẩn.

---

### `/bootstrap` — Xây dựng dự án từ đầu đến cuối ⭐

**Công dụng:** Orchestrator lớn nhất — đưa bạn qua **toàn bộ quy trình**: từ hỏi yêu cầu → nghiên cứu → chọn tech stack → lập kế hoạch → thiết kế → code → test → review → deploy → tài liệu.

```bash
mekong bootstrap "website đặt hàng mỹ phẩm Hàn Quốc, hỗ trợ thanh toán COD, tích hợp Telegram"
```

**Ví dụ K-Beauty:** Đây chính là cách dự án K-Beauty Order được khởi tạo — lệnh này sẽ hỏi bạn từng bước về yêu cầu, tech stack, rồi tự động triển khai.

---

### `/status` — Dashboard sức khỏe hệ thống

**Công dụng:** Kiểm tra tổng thể: Ollama (AI local), API keys, MCU balance, trạng thái git, company config.

```bash
mekong status            # Dashboard đầy đủ
```

**Output mẫu:**
```
┌─────────────────────────────────────────────────┐
│  AgencyOS / Mekong CLI — System Status          │
├─────────────────────────────────────────────────┤
│  Ollama      [●] running 2 models              │
│  Claude API  [✓] key set                       │
│  MCU Balance 45 available                      │
│  Company     K-Beauty VN                       │
│  Uncommitted 3 files changed                   │
└─────────────────────────────────────────────────┘
```

---

## 🎨 TẦNG 1 — STUDIO

> Tầng **sáng tạo & thiết kế** — nơi ý tưởng được sinh ra.

---

### `/brainstorm` — Động não ý tưởng

**Công dụng:** Đặt câu hỏi phức tạp, nhận phân tích đa chiều với 2-3 giải pháp khả thi kèm pros/cons. **Chỉ tư vấn, không code.**

```bash
mekong brainstorm "nên dùng Shopify hay tự build cho K-Beauty?"
mekong brainstorm "chiến lược pricing cho dòng serum cao cấp"
mekong brainstorm "làm thế nào tăng retention rate cho khách mua mỹ phẩm?"
```

**Ví dụ K-Beauty:** Trước khi quyết định tích hợp Telegram Bot cho thông báo đơn hàng, chạy brainstorm để đánh giá các phương án (Telegram vs Zalo vs Email).

---

### `/design` — Thiết kế UI/UX

**Công dụng:** Tạo design guidelines, wireframes HTML, và hướng dẫn thiết kế cho developers.

```bash
mekong design "form đặt hàng mobile-first cho K-Beauty"
mekong design "trang admin quản lý đơn hàng"
```

**Ví dụ K-Beauty:** Dùng lệnh này để tạo wireframe cho `order-form.html` và `admin.html`.

---

### `/branding` — Xây dựng thương hiệu

**Công dụng:** Tạo brand identity: logo, color palette, typography, brand voice guidelines.

```bash
mekong branding "K-Beauty VN — thương hiệu mỹ phẩm Hàn Quốc tại Việt Nam"
```

---

### `/content` — Tạo nội dung

**Công dụng:** Viết blog, mô tả sản phẩm, email, bài đăng — theo brand voice đã định nghĩa.

```bash
mekong content "viết mô tả sản phẩm cho COSRX Low pH Good Morning Gel Cleanser"
mekong content "viết email chào mừng khách hàng mới đăng ký"
```

---

### `/video` — Tạo kịch bản video

**Công dụng:** Viết script video marketing, review sản phẩm, hướng dẫn skincare routine.

```bash
mekong video "kịch bản TikTok 60s review bộ skincare Hàn Quốc cho da dầu"
```

---

## 🏛 TẦNG 2 — FOUNDER

> Tầng **chiến lược cấp cao** — tầm nhìn, huy động vốn, phân tích đối thủ.

---

### `/binh-phap` — Chiến lược kinh doanh (Binh Pháp)

**Công dụng:** Áp dụng **Binh Pháp Tôn Tử** vào chiến lược kinh doanh — 13 chương tương ứng 13 chiến lược.

```bash
mekong binh-phap "chiến lược thâm nhập thị trường mỹ phẩm Hàn tại VN"
```

---

### `/intel` — Thu thập tình báo kinh doanh

**Công dụng:** Phân tích đối thủ, xu hướng thị trường, profile nhà đầu tư.

```bash
mekong intel "Hasaki.vn"                    # Phân tích đối thủ
mekong intel market "mỹ phẩm Hàn Quốc VN"  # Phân tích thị trường
mekong intel "The Face Shop Vietnam"         # Deep dive đối thủ
```

**Ví dụ K-Beauty:** Trước khi ra mắt, chạy `mekong intel "Hasaki.vn"` để hiểu pricing, strengths, và weaknesses của đối thủ lớn nhất.

---

### `/fundraise` — Huy động vốn

**Công dụng:** Tạo pitch deck, financial model, danh sách VC phù hợp.

```bash
mekong fundraise "seed round $200K cho K-Beauty VN"
```

---

### `/swot` — Phân tích SWOT

**Công dụng:** Strengths, Weaknesses, Opportunities, Threats.

```bash
mekong swot "K-Beauty Order — nền tảng đặt mỹ phẩm Hàn"
```

---

### `/okr` — Quản lý OKR

**Công dụng:** Đặt Objectives & Key Results cho quý/năm.

```bash
mekong okr "Q2 2026 — tăng trưởng đơn hàng 200%"
```

---

### `/competitor` — Phân tích đối thủ

**Công dụng:** So sánh trực tiếp với đối thủ cạnh tranh.

```bash
mekong competitor "so sánh K-Beauty VN với Hasaki, Lixibox, Sociolla"
```

---

## 💼 TẦNG 3 — BUSINESS

> Tầng **kinh doanh** — sales, marketing, tài chính, khách hàng.

---

### `/sales` — Hub bán hàng

**Công dụng:** Quản lý pipeline bán hàng từ lead → qualify → proposal → close → invoice.

```bash
mekong sales                    # Pipeline overview
mekong sales status             # Deals đang chạy
mekong sales forecast           # Dự báo doanh thu
mekong sales report weekly      # Báo cáo tuần
```

**Sub-commands:**

| Lệnh | Công dụng | Ví dụ K-Beauty |
|-------|-----------|----------------|
| `/sales/lead` | Tìm & qualify leads | Tìm KOL mỹ phẩm để hợp tác |
| `/sales/proposal` | Tạo proposals | Đề xuất hợp tác cho brand Hàn Quốc |
| `/sales/close` | Closing scripts | Script chốt deal với nhà phân phối |
| `/sales/followup` | Follow-up templates | Nhắc nhở khách chưa hoàn tất đơn |

---

### `/marketing` — Hub Marketing

**Công dụng:** Quản lý toàn bộ hoạt động marketing: content, ads, SEO, analytics.

```bash
mekong marketing                     # Dashboard tổng quan
mekong marketing status              # Trạng thái campaigns
mekong marketing ideas               # Generate ý tưởng marketing
mekong marketing calendar            # Lịch nội dung
```

**Sub-commands:**

| Lệnh | Công dụng | Ví dụ K-Beauty |
|-------|-----------|----------------|
| `/marketing/social` | Tạo bài đăng MXH | Bài TikTok, Instagram về skincare |
| `/marketing/email` | Email campaigns | Email flash sale mỹ phẩm |
| `/marketing/ads` | Ad copy | Quảng cáo Facebook Ads cho serum |
| `/marketing/seo` | SEO optimization | Tối ưu từ khóa "mỹ phẩm Hàn Quốc" |
| `/marketing/analytics` | Phân tích traffic | Đo lường conversion rate |

---

### `/finance` — Hub Tài Chính

**Công dụng:** Quản lý tài chính: invoicing, expense tracking, runway planning.

```bash
mekong finance                   # Dashboard tổng quan
mekong finance status            # P&L summary
mekong finance forecast          # Dự báo 3-6 tháng
mekong finance report monthly    # Báo cáo tháng
```

**Sub-commands:**

| Lệnh | Công dụng | Ví dụ K-Beauty |
|-------|-----------|----------------|
| `/finance/invoice` | Xuất hóa đơn | Hóa đơn cho nhà phân phối |
| `/finance/expense` | Track chi phí | Chi phí nhập hàng, vận chuyển |
| `/finance/runway` | Tính runway | Bao lâu trước khi cần gọi vốn |
| `/finance/tax` | Tax planning | Thuế nhập khẩu mỹ phẩm |

---

### `/crm` — Quản lý khách hàng

**Công dụng:** Customer Relationship Management — theo dõi tương tác khách hàng.

```bash
mekong crm "thêm khách hàng Nguyễn Thị A, SĐT 0901234567"
```

---

### `/affiliate` — Tiếp thị liên kết

**Công dụng:** Quản lý chương trình affiliate, tracking commission.

```bash
mekong affiliate "tạo chương trình affiliate cho K-Beauty"
```

---

### `/pricing` — Chiến lược giá

**Công dụng:** Xây dựng và tối ưu hóa chiến lược giá.

```bash
mekong pricing "định giá bộ skincare combo 3 bước cho K-Beauty"
```

---

### `/leadgen` — Tạo lead

**Công dụng:** Generate leads từ nhiều nguồn.

```bash
mekong leadgen "tìm khách hàng tiềm năng cho mỹ phẩm Hàn ở TPHCM"
```

---

## 📦 TẦNG 4 — PRODUCT

> Tầng **sản phẩm** — lập kế hoạch, quản lý sprint, phát hành.

---

### `/plan` — Phân tách mục tiêu thông minh ⭐

**Công dụng:** Chia mục tiêu lớn thành subtasks nhỏ, tự phân công agent + model + tính MCU.

```bash
mekong plan "xây dựng hệ thống loyalty points cho K-Beauty"
mekong plan "tích hợp thanh toán MoMo và VNPay" --execute
```

**Output mẫu:**
```
╔══════════════════════════════════════════════════╗
║  PLAN: "Tích hợp loyalty points"                ║
╠══════════════════════════════════════════════════╣
║  ID    AGENT/MODEL           TASK            MCU ║
╠══════════════════════════════════════════════════╣
║  T001  CTO/Opus              DB schema         5 ║
║  T002  CTO/Sonnet            API endpoints     3 ║
║  T003  CMO/Gemini            UI loyalty page   1 ║
║  T004  Data/Qwen             Report template   1 ║
╠══════════════════════════════════════════════════╣
║  Total: 4 tasks · 10 MCU · est. 25 min         ║
╚══════════════════════════════════════════════════╝
```

---

### `/sprint` — Quản lý Sprint

**Công dụng:** Lên kế hoạch và track sprint 1-2 tuần.

```bash
mekong sprint                     # Sprint hiện tại
mekong sprint plan "2 weeks"      # Lên sprint mới
mekong sprint review              # Retrospective
```

**Ví dụ K-Beauty:** Lên sprint 2 tuần cho việc phát triển tính năng analytics và loyalty.

---

### `/roadmap` — Lộ trình sản phẩm

**Công dụng:** Xây dựng và hiển thị product roadmap.

```bash
mekong roadmap "K-Beauty Order 2026"
```

---

### `/launch` — Ra mắt sản phẩm ⭐

**Công dụng:** Tạo bản copy ra mắt cho Product Hunt, Hacker News, Reddit, Indie Hackers — kèm launch checklist.

```bash
mekong launch "K-Beauty Order"                    # Tất cả platforms
mekong launch "K-Beauty Order" --tier ph           # Chỉ Product Hunt
mekong launch "K-Beauty Order" --tagline "Korean beauty, Vietnamese price"
```

**Tạo ra:** Thư mục `.mekong/launch/` chứa copy cho từng platform + checklist T-7 → launch day → post-launch.

---

### `/ship` — Phát hành sản phẩm

**Công dụng:** Deploy và launch feature ra production — kèm pre-deploy checklist và rollback plan.

```bash
mekong ship                      # Pre-ship checklist
mekong ship feature "loyalty"    # Ship tính năng cụ thể
mekong ship hotfix "bug123"      # Emergency fix
mekong ship rollback "v1.2.3"    # Rollback nếu cần
```

---

### `/estimate` — Ước lượng thời gian

```bash
mekong estimate "thêm tính năng tìm kiếm sản phẩm"
```

---

### `/scope` — Xác định phạm vi

```bash
mekong scope "MVP K-Beauty Order phase 2"
```

---

## 🛠 TẦNG 5 — ENGINEERING

> Tầng **kỹ thuật** — viết code, debug, review, deploy.

---

### `/code` — Bắt đầu coding theo kế hoạch ⭐

**Công dụng:** Đọc implementation plan và code từng bước. Quy trình 6 bước: Analysis → Implementation → Testing → Code Review → User Approval → Finalize.

```bash
mekong code                        # Tự tìm plan mới nhất
mekong code "phase-01"             # Code phase cụ thể
```

**Ví dụ K-Beauty:** Sau khi đã dùng `/plan` để tạo kế hoạch loyalty points, dùng `/code` để triển khai.

---

### `/fix` — Sửa bug thông minh ⭐

**Công dụng:** Debug BẮT BUỘC qua SCAN → Root Cause Analysis → Jidoka Safety Gate → Minimal Fix.

```bash
mekong fix "đơn hàng không hiển thị trên admin.html"
mekong fix "lỗi gửi Telegram khi có emoji trong tên sản phẩm" --file tools/telegram_bot.py
mekong fix "validation SĐT sai format" --file order-form.html --line 395
```

**Quy trình:**
1. **SCAN** (bắt buộc) — Đọc code, git log, dependencies
2. **Root Cause** — Xác định lỗi ở đâu, tại sao, ảnh hưởng gì
3. **Jidoka Gate** — DỪNG nếu đụng DB/payment/auth
4. **Minimal Fix** — Sửa ÍT nhất có thể, không refactor thêm
5. **Verify** — Chạy test, confirm

---

### `/review` — Review code/nội dung

**Công dụng:** Review theo domain-specific checklist: code (security, performance, maintainability), content (tone, SEO, CTA), ops (idempotent, rollback).

```bash
mekong review order-form.html         # Review file cụ thể
mekong review --security              # Focus security
mekong review --full                  # Tất cả checklist
```

**Ví dụ K-Beauty:** Review `telegram_bot.py` trước khi deploy để kiểm tra bảo mật API token.

---

### `/deploy` — Triển khai hệ thống ⭐

**Công dụng:** Multi-strategy deployment: Blue-Green, Canary, Rolling, Recreate. Kèm CI/CD integration.

```bash
mekong deploy blue-green production   # Zero downtime deploy
mekong deploy canary staging          # Canary 10% traffic
mekong deploy rolling production      # Rolling update
```

**Ví dụ K-Beauty:** Deploy order form mới lên production dùng Blue-Green strategy để đảm bảo zero downtime.

---

### `/test` — Chạy test

```bash
mekong test                         # Chạy tất cả test
mekong test unit                    # Chỉ unit tests
mekong test e2e                     # End-to-end tests
```

---

### `/refactor` — Tái cấu trúc code

```bash
mekong refactor "tách logic thanh toán ra module riêng"
```

---

### `/debug` — Debug sâu

```bash
mekong debug "tại sao order status không update realtime"
```

---

### `/lint` — Kiểm tra code style

```bash
mekong lint                         # Lint toàn bộ
```

---

### `/typecheck` — Kiểm tra type

```bash
mekong typecheck                    # Type check
```

---

### `/schema` — Quản lý schema

```bash
mekong schema "thêm field loyalty_points vào bảng customers"
```

---

### Git Commands:

| Lệnh | Công dụng | Ví dụ |
|-------|-----------|-------|
| `/git-branch` | Quản lý branch | `mekong git-branch "feature/loyalty"` |
| `/git-merge` | Merge branch | `mekong git-merge "feature/loyalty" to main` |
| `/git-rebase` | Rebase | `mekong git-rebase main` |
| `/git-stash` | Stash thay đổi | `mekong git-stash` |
| `/git-tag` | Tạo tag release | `mekong git-tag "v1.2.0"` |
| `/git-squash` | Gộp commits | `mekong git-squash 5` |

---

## ⚙ TẦNG 6 — OPS

> Tầng **vận hành** — monitoring, billing, automation, đồng bộ.

---

### `/ops` — Hub vận hành

**Công dụng:** Dashboard vận hành: billing, reporting, team management.

```bash
mekong ops                     # Dashboard
mekong ops status              # Operations status
mekong ops automate            # Gợi ý automation
mekong ops report weekly       # Báo cáo tuần
```

**Sub-commands:**

| Lệnh | Công dụng |
|-------|-----------|
| `/ops/billing` | Auto-billing setup |
| `/ops/reporting` | Tạo báo cáo |
| `/ops/team` | Quản lý team |
| `/ops/automate` | Tự động hóa tác vụ |

---

### `/sync-*` — Đồng bộ hệ thống

**Công dụng:** Đồng bộ dữ liệu giữa các công cụ và môi trường.

| Lệnh | Công dụng |
|-------|-----------|
| `mekong sync-all` | Đồng bộ tất cả |
| `mekong sync-agent` | Đồng bộ agents |
| `mekong sync-artifacts` | Đồng bộ artifacts |
| `mekong sync-tasks` | Đồng bộ tasks |
| `mekong sync-rules` | Đồng bộ rules |
| `mekong sync-mcp` | Đồng bộ MCP servers |
| `mekong sync-editor` | Đồng bộ với editor (VS Code) |
| `mekong sync-browser` | Đồng bộ browser tools |

---

### `/monitor` — Giám sát hệ thống

```bash
mekong monitor                  # Dashboard metrics
```

---

### `/rollback` — Rollback khẩn cấp

```bash
mekong rollback "v1.1.0"       # Quay lại version trước
```

---

### `/clean` — Dọn dẹp hệ thống

```bash
mekong clean                    # Xóa cache, temp files
```

---

### `/env` — Quản lý biến môi trường

```bash
mekong env                      # Xem env vars
```

---

### `/migrate` — Chạy migration

```bash
mekong migrate "thêm bảng loyalty_transactions"
```

---

### `/security` — Kiểm tra bảo mật

```bash
mekong security                 # Audit bảo mật toàn bộ
```

---

## 🌊 WATER PROTOCOL 水

**Water Protocol** là cơ chế **truyền tải ngữ cảnh đa agent** giữa các tầng:

```
Studio (ý tưởng) ──水──▶ Founder (chiến lược) ──水──▶ Business (kinh doanh)
    ──水──▶ Product (sản phẩm) ──水──▶ Engineering (code) ──水──▶ Ops (vận hành)
```

**Ví dụ K-Beauty flow thực tế:**
1. `/brainstorm` → Quyết định thêm loyalty program → context truyền xuống
2. `/plan` → Phân tách thành 4 subtasks → agent assignments
3. `/code` → CTO agent triển khai DB schema + API
4. `/review` → Code review tự động
5. `/ship` → Deploy ra production
6. `/ops` → Monitor performance

Mỗi bước **tự động truyền context** cho bước tiếp theo qua `.mekong/memory.json`.

---

## 🤖 HỆ THỐNG AGENT & MODEL ROUTING

### 8 Agents mặc định

| Agent | Vai trò | Model mặc định | Khi nào dùng |
|-------|---------|-----------------|-------------|
| **CTO** | Chief Technology | claude-opus-4-6 (complex), claude-sonnet-4-6 (standard) | Code, architecture, technical |
| **CMO** | Chief Marketing | gemini-2.0-flash | Content, marketing, social |
| **COO** | Chief Operations | ollama:llama3.2:3b (local) | Ops, infra, setup |
| **CFO** | Chief Financial | ollama:qwen2.5:7b (local) | Finance, metrics, sensitive data |
| **CS** | Customer Support | claude-haiku-4-5 | Trả lời khách hàng |
| **Sales** | Sales | claude-sonnet-4-6 | Proposal, closing |
| **Editor** | Content Editor | gemini-2.0-flash | Long-form writing |
| **Data** | Data Analyst | ollama:qwen2.5:7b (local) | Reports, analytics |

### MCU (Mekong Credit Unit)

| Complexity | MCU | Ví dụ |
|-----------|-----|-------|
| Simple (0-3 bước) | 1 MCU | Viết 1 email, fix 1 dòng code |
| Standard (4-8 bước) | 3 MCU | Tạo landing page, fix module |
| Complex (9+ bước) | 5 MCU | Thiết kế architecture, full feature |

### Bảo mật dữ liệu

Khi goal chứa: *password, secret, key, token, private, internal, confidential* → **BẮT BUỘC dùng local model**, không gọi API cloud.

---

## 📌 QUICK REFERENCE CHO K-BEAUTY

### Lệnh hay dùng nhất

```bash
# === Hàng ngày ===
mekong status                                              # Check hệ thống
mekong cook "trả lời tin nhắn khách hàng hỏi về serum"    # CS agent xử lý
mekong cook "viết caption Instagram cho sản phẩm mới"      # CMO viết content

# === Hàng tuần ===
mekong finance report weekly                               # Báo cáo tài chính
mekong sales report weekly                                 # Báo cáo bán hàng
mekong marketing calendar                                  # Lịch content tuần tới
mekong sprint                                              # Sprint status

# === Khi phát triển tính năng ===
mekong brainstorm "cách tốt nhất để làm X?"               # Tư vấn kiến trúc
mekong plan "mô tả tính năng"                             # Lên kế hoạch
mekong code                                                # Triển khai
mekong review --full                                       # Review code
mekong ship feature "tên tính năng"                        # Phát hành

# === Khi có bug ===
mekong fix "mô tả bug" --file path/to/file                # Fix thông minh
```

---

> **💡 Mẹo:** Bắt đầu với `/cook` cho mọi thứ. Mekong CLI sẽ tự phân loại và chọn agent phù hợp. Chỉ dùng lệnh chuyên biệt khi cần kiểm soát chi tiết hơn.

---

*Tài liệu này được tạo bởi Mekong CLI × AgencyOS — Dự án K-Beauty Order*
