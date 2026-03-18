#!/usr/bin/env bash
# Smoke test for Gürkan Property Manager deployment.
# Usage: bash deploy/verify.sh [BASE_URL]
# Default: http://localhost

set -uo pipefail

BASE_URL="${1:-http://localhost}"
# Strip trailing slash if present
BASE_URL="${BASE_URL%/}"

PASS=0
FAIL=0

check() {
  local name="$1" cmd="$2" expected="$3"
  local result
  result=$(eval "$cmd" 2>/dev/null) || true
  if echo "$result" | grep -qE "$expected"; then
    echo "✅ $name"
    PASS=$((PASS + 1))
  else
    echo "❌ $name (expected: $expected, got: $result)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "Smoke testing: $BASE_URL"
echo "========================="
echo ""

# 1. Frontend loads
check "Frontend returns 200" \
  "curl -sf -o /dev/null -w '%{http_code}' '$BASE_URL/'" \
  "200"

# 2. Frontend has SPA content
check "Frontend contains app root" \
  "curl -sf '$BASE_URL/'" \
  '<div id="root"'

# 3. API endpoint reachable (login should return 400 or 401 for bad credentials)
check "API login endpoint reachable" \
  "curl -sf -o /dev/null -w '%{http_code}' -X POST '$BASE_URL/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\":\"x\",\"password\":\"x\"}'" \
  "400|401"

# 4. SPA routing works (deep link returns 200, not 404)
check "SPA deep link (/properties) works" \
  "curl -sf -o /dev/null -w '%{http_code}' '$BASE_URL/properties'" \
  "200"

echo ""
echo "========================="
echo "Results: $PASS passed, $FAIL failed"
echo ""

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
