---
estimated_steps: 3
estimated_files: 2
---

# T04: Add deploy documentation and smoke verification script

**Slice:** S01 — Production Deploy
**Milestone:** M003

## Description

Create deployment documentation for Hetzner VPS setup and a reusable smoke test script. The documentation bridges the gap between "stack works in Docker" and "stack runs on a real VPS with HTTPS." The verification script provides repeatable smoke testing that works against both local Docker Compose and production URLs.

This is the final task — it doesn't change application code, just adds operational documentation and tooling.

## Steps

1. **Create `deploy/README.md`** with these sections:
   - **Prerequisites**: Hetzner VPS (CX22 or similar, Ubuntu 24.04), a domain name, SSH access to VPS
   - **VPS Initial Setup**: Commands to install Docker + Docker Compose plugin, configure firewall (`ufw allow 22,80,443/tcp`), create app user
   - **DNS Setup**: Create A record pointing domain to VPS IP address. Wait for propagation. Also create A record for `www` subdomain (optional).
   - **First Deploy**: Clone repo, copy `.env.production.example` to `.env`, edit `.env` with real values (domain, passwords, JWT secret — give instructions for generating a secure random string), run `docker compose -f docker-compose.prod.yml up -d`, run `bash deploy/verify.sh https://yourdomain.com`
   - **Updating**: `git pull && docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d`
   - **Database Backup**: `docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres gurkan > backup_$(date +%Y%m%d).sql`
   - **Database Restore**: `docker compose -f docker-compose.prod.yml exec -T db psql -U postgres gurkan < backup.sql`
   - **Troubleshooting**: Certificate not provisioning (check ports 80/443 open, check DNS propagation), API not starting (check DB healthcheck, check logs), 502 Bad Gateway (API not ready yet, wait or check logs)
   - Use placeholder domain `gurkan.example.com` throughout, clearly marked as "replace with your domain"

2. **Create `deploy/verify.sh`** — Smoke test script:
   ```bash
   #!/usr/bin/env bash
   # Usage: bash deploy/verify.sh [BASE_URL]
   # Default: http://localhost
   
   BASE_URL="${1:-http://localhost}"
   PASS=0
   FAIL=0
   
   check() {
     local name="$1" cmd="$2" expected="$3"
     result=$(eval "$cmd" 2>/dev/null)
     if echo "$result" | grep -q "$expected"; then
       echo "✅ $name"
       ((PASS++))
     else
       echo "❌ $name (got: $result)"
       ((FAIL++))
     fi
   }
   
   echo "Smoke testing: $BASE_URL"
   echo "========================="
   
   # Frontend loads
   check "Frontend returns HTML" \
     "curl -s -o /dev/null -w '%{http_code}' $BASE_URL/" \
     "200"
   
   # Frontend has SPA content
   check "Frontend contains app root" \
     "curl -s $BASE_URL/" \
     "<div id=\"root\""
   
   # API endpoint reachable
   check "API login endpoint reachable" \
     "curl -s -o /dev/null -w '%{http_code}' -X POST $BASE_URL/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"x\",\"password\":\"x\"}'" \
     "400\|401"
   
   # SPA routing works (deep link returns HTML, not 404)
   check "SPA deep link works" \
     "curl -s -o /dev/null -w '%{http_code}' $BASE_URL/properties" \
     "200"
   
   echo "========================="
   echo "Results: $PASS passed, $FAIL failed"
   
   [ "$FAIL" -eq 0 ] && exit 0 || exit 1
   ```
   Make the script executable: `chmod +x deploy/verify.sh`

3. **Verify the script works** against the local Docker Compose stack (if still running from T03) or note that it requires the stack to be running.

## Must-Haves

- [ ] `deploy/README.md` covers VPS setup, DNS, first deploy, updating, backup, and troubleshooting
- [ ] `deploy/verify.sh` is executable and tests frontend, API, and SPA routing
- [ ] Verification script exits 0 on success, 1 on failure
- [ ] Documentation uses placeholder domain and clearly marks values to replace

## Verification

- `deploy/README.md` exists and contains sections: Prerequisites, VPS Initial Setup, DNS Setup, First Deploy, Updating, Database Backup, Troubleshooting
- `deploy/verify.sh` is executable (`test -x deploy/verify.sh`)
- `bash deploy/verify.sh http://localhost` — passes all checks when Docker Compose stack is running (or skip if stack is down and verify script syntax only with `bash -n deploy/verify.sh`)
- No secrets or real credentials appear in any file

## Inputs

- `docker-compose.prod.yml` — Created in T03, referenced in deploy documentation
- `.env.production.example` — Created in T03, referenced in deploy documentation
- `Caddyfile` — Created in T03, referenced in troubleshooting section

## Observability Impact

- **New signal: `deploy/verify.sh` exit code** — Returns 0 (all checks pass) or 1 (at least one failure). Each check prints ✅/❌ with the test name. A future agent can run `bash deploy/verify.sh http://localhost` after any compose change and get instant pass/fail feedback.
- **Inspection surface: `deploy/README.md`** — Human-readable operational runbook. Future agents check this file for correct Docker Compose commands, backup procedures, and troubleshooting steps.
- **Failure visibility:** The verify script surfaces failures as `❌ <check name> (got: <actual>)`, making it obvious which smoke test failed and what was returned instead.
- **No runtime signals changed** — this task adds documentation and a shell-based testing tool, not application-level observability.

## Expected Output

- `deploy/README.md` — Complete VPS deployment guide
- `deploy/verify.sh` — Executable smoke test script accepting base URL parameter
