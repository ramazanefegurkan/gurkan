---
id: T04
parent: S01
milestone: M003
provides:
  - Complete VPS deployment guide (deploy/README.md) covering Hetzner setup, DNS, first deploy, updating, backup/restore, and troubleshooting
  - Reusable smoke verification script (deploy/verify.sh) testing frontend, API, and SPA routing with exit code signaling
key_files:
  - deploy/README.md
  - deploy/verify.sh
key_decisions:
  - Used $((VAR + 1)) arithmetic instead of ((VAR++)) to avoid bash exit-code-1 gotcha when variable is 0 under set -e
  - verify.sh uses grep -qE (extended regex) for multi-pattern matching (e.g., 400|401)
patterns_established:
  - Smoke test pattern: curl-based check function with name/command/expected triple, printing ✅/❌ per check, exit 0 on all-pass / exit 1 on any failure
observability_surfaces:
  - deploy/verify.sh exit code 0 (all pass) or 1 (failures) — run after any compose or deploy change
  - Per-check ✅/❌ output with expected vs. actual on failure
duration: 15m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T04: Add deploy documentation and smoke verification script

**Added Hetzner VPS deployment guide and curl-based smoke test script with 4 endpoint checks**

## What Happened

Created two files: `deploy/README.md` (comprehensive deployment guide) and `deploy/verify.sh` (executable smoke test script).

The README covers the full journey from bare VPS to running production stack: system setup (Docker, firewall), DNS configuration, first deploy with secret generation instructions, update workflow, database backup/restore, and a troubleshooting section for common failure modes (TLS, API crashes, 502s). Uses `gurkan.example.com` as placeholder domain throughout.

The verify script accepts a base URL (defaults to `http://localhost`) and runs 4 curl-based checks: frontend returns 200, frontend contains `<div id="root"`, API login endpoint returns 400 or 401, and SPA deep link to `/properties` returns 200. Exits 0 on all-pass, 1 on any failure.

Hit a bash gotcha during testing: `((PASS++))` returns exit code 1 when PASS is 0 (because the expression evaluates to 0/falsy), which combined with `set -e` killed the script after the first check. Fixed by removing `set -e` (inappropriate for a test runner that expects some commands to fail) and using `PASS=$((PASS + 1))` arithmetic.

## Verification

- `deploy/README.md` exists and contains all 8 required sections (Prerequisites, VPS Initial Setup, DNS Setup, First Deploy, Updating, Database Backup, Database Restore, Troubleshooting)
- `deploy/verify.sh` has executable bit set in git (`100755`)
- `bash -n deploy/verify.sh` — syntax check passes
- `bash deploy/verify.sh http://localhost` — all 4 checks pass against running Docker Compose stack, exit code 0
- No hardcoded secrets in either file
- Placeholder domain `gurkan.example.com` appears 11 times in README

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `test -f deploy/README.md` | 0 | ✅ pass | <1s |
| 2 | `test -f deploy/verify.sh` | 0 | ✅ pass | <1s |
| 3 | `git ls-files -s deploy/verify.sh` → 100755 | 0 | ✅ pass | <1s |
| 4 | `bash -n deploy/verify.sh` | 0 | ✅ pass | <1s |
| 5 | `bash deploy/verify.sh http://localhost` (4/4 checks) | 0 | ✅ pass | 2s |
| 6 | `grep -iE "(password\|secret\|token\|key)=[A-Za-z0-9]{8,}" deploy/*` | 1 (no match) | ✅ pass | <1s |
| 7 | Section check (8/8 sections present in README) | 0 | ✅ pass | <1s |

### Slice-Level Verification (final — T04 of T04)

| # | Check | Status |
|---|-------|--------|
| 1 | `docker compose build` completes for all services | ✅ pass |
| 2 | `docker compose up -d` starts all 4 services healthy | ✅ pass |
| 3 | `curl http://localhost:80` returns frontend HTML | ✅ pass |
| 4 | `curl http://localhost:80/api/auth/login` returns 400/401 | ✅ pass (400) |
| 5 | SPA routing: deep-link to `/properties` returns index.html | ✅ pass |
| 6 | PostgreSQL healthcheck passes before API starts | ✅ pass |
| 7 | `deploy/verify.sh` smoke test passes | ✅ pass |

All 7 slice-level checks pass. Slice S01 is complete.

## Diagnostics

- **Run smoke test:** `bash deploy/verify.sh http://localhost` (local) or `bash deploy/verify.sh https://gurkan.example.com` (production)
- **Failure shape:** Each failed check prints `❌ <name> (expected: <pattern>, got: <actual>)` with the curl output that didn't match
- **Inspect README:** `grep "## " deploy/README.md` lists all section headings

## Deviations

- **Removed `set -e` from verify.sh:** The plan's script skeleton didn't include `set -euo pipefail`, but I initially added it for safety. Removed `set -e` because it's incompatible with the check function pattern (eval'd commands and arithmetic on zero values can return non-zero). Kept `set -uo pipefail` for unset variable protection and pipe safety.
- **Changed `((PASS++))` to `PASS=$((PASS + 1))`:** The plan's skeleton used `((PASS++))` which returns exit code 1 when the pre-increment value is 0, crashing the script. Used POSIX-compliant arithmetic expansion instead.

## Known Issues

None.

## Files Created/Modified

- `deploy/README.md` — Complete VPS deployment guide with 8 sections covering Hetzner setup through troubleshooting
- `deploy/verify.sh` — Executable smoke test script: 4 curl-based checks, accepts base URL, exits 0/1
- `.gsd/milestones/M003/slices/S01/tasks/T04-PLAN.md` — Added Observability Impact section (pre-flight fix)
