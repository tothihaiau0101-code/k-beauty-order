#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# healthcheck.sh — K-Beauty Order Uptime Monitor (M82)
#
# Pings the frontend + API endpoints every 5 minutes.
# Logs results to tools/data/healthcheck.log
# Sends a Telegram alert on any failure (set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID).
#
# Usage:
#   bash tools/healthcheck.sh              # run once
#   bash tools/healthcheck.sh --loop       # run every 5 min indefinitely
#   bash tools/healthcheck.sh --loop --interval 60   # custom interval (seconds)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── CONFIG ───────────────────────────────────────────────────────────────────
FRONTEND_URL="https://k-beauty-order.pages.dev"
API_URL="https://beapop-api.beapop.workers.dev/api/inventory"
LOG_FILE="$(dirname "$0")/data/healthcheck.log"
TIMEOUT=10          # curl timeout in seconds
INTERVAL=300        # default: 5 minutes (300 seconds)

# Optional Telegram alerts — set via env vars or .env file
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# ── ARGS ─────────────────────────────────────────────────────────────────────
LOOP=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --loop)       LOOP=true;  shift ;;
    --interval)   INTERVAL="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ── HELPERS ──────────────────────────────────────────────────────────────────
log() {
  local level="$1"; shift
  local ts; ts=$(date '+%Y-%m-%d %H:%M:%S')
  local msg="[$ts] [$level] $*"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

send_telegram() {
  local text="$1"
  if [[ -z "$TELEGRAM_BOT_TOKEN" || -z "$TELEGRAM_CHAT_ID" ]]; then
    return 0   # silently skip if not configured
  fi
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=${text}" \
    -d "parse_mode=HTML" \
    > /dev/null
}

check_endpoint() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  local http_code
  local response_time

  # -w outputs timing + status; -o /dev/null discards body
  read -r http_code response_time < <(
    curl -s -o /dev/null \
         -w "%{http_code} %{time_total}" \
         --max-time "$TIMEOUT" \
         --location \
         "$url" 2>/dev/null || echo "000 0"
  )

  local ms
  ms=$(echo "$response_time" | awk '{printf "%.0f", $1 * 1000}')

  if [[ "$http_code" == "$expected_status" ]]; then
    log "OK" "✅ $name — HTTP $http_code — ${ms}ms — $url"
    return 0
  else
    log "FAIL" "❌ $name — HTTP $http_code (expected $expected_status) — ${ms}ms — $url"
    send_telegram "🚨 <b>K-Beauty Health Check FAILED</b>%0A%0A<b>$name</b>%0AURL: $url%0AStatus: $http_code (expected $expected_status)%0ATime: $(date '+%Y-%m-%d %H:%M:%S')"
    return 1
  fi
}

run_checks() {
  local any_fail=0

  log "INFO" "─── Health check start ───────────────────────────────────"
  check_endpoint "Frontend (Pages)"  "$FRONTEND_URL"  200 || any_fail=1
  check_endpoint "API /inventory"    "$API_URL"        200 || any_fail=1
  log "INFO" "─── Health check end (fail=$any_fail) ────────────────────"

  return $any_fail
}

# ── MAIN ─────────────────────────────────────────────────────────────────────
mkdir -p "$(dirname "$LOG_FILE")"

if [[ "$LOOP" == "true" ]]; then
  log "INFO" "Starting uptime monitor — interval ${INTERVAL}s — logging to $LOG_FILE"
  while true; do
    run_checks || true   # don't exit loop on failure
    sleep "$INTERVAL"
  done
else
  run_checks
fi
