---
id: T03
parent: S01
milestone: M003
provides:
  - Production Docker Compose orchestrating 4 services (db, api, web, caddy) with one-command startup
  - Caddy reverse proxy with automatic HTTPS via Let's Encrypt and /api/* routing
  - .env.production.example template documenting all required secrets
key_files:
  - docker-compose.prod.yml
  - Caddyfile
  - .env.production.example
  - .gitignore
key_decisions:
  - Separated SITE_ADDRESS (Caddy address) from DOMAIN (app config) to avoid Caddy localhost TLS issue
  - Caddyfile defaults to :80 (plain HTTP) when SITE_ADDRESS unset; production sets SITE_ADDRESS to FQDN for auto-HTTPS
patterns_established:
  - Docker Compose env var pattern: required secrets use ${VAR:?error}, optional config uses ${VAR:-default}
  - Caddy env var substitution with {$SITE_ADDRESS::80} for address, DOMAIN for CORS
  - PostgreSQL healthcheck with depends_on condition:service_healthy gates API startup
observability_surfaces:
  - docker compose -f docker-compose.prod.yml ps — service health status
  - docker compose -f docker-compose.prod.yml logs caddy — proxy routing errors
  - docker compose -f docker-compose.prod.yml logs api — ASP.NET Core startup, DB migration, request errors
  - Caddy access logs to stdout — all HTTP requests through the reverse proxy
duration: 20m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T03: Create production Docker Compose with Caddy reverse proxy

**Production Docker Compose with 4 services (db, api, web, caddy), Caddy reverse proxy routing /api/* to backend and everything else to frontend, all secrets via .env**

## What Happened

Created the three deliverables: `docker-compose.prod.yml`, `Caddyfile`, and `.env.production.example`. The compose file defines 4 services on a shared `gurkan-net` bridge network with named volumes for PostgreSQL data, API uploads, and Caddy TLS certificates.

Key implementation details:
- **PostgreSQL** uses `pg_isready` healthcheck with `start_period: 10s` — API depends on it with `condition: service_healthy` to ensure MigrateAsync doesn't fail on startup.
- **API** receives connection string, JWT secret, and CORS origins via environment variables using ASP.NET Core's `__` convention (e.g., `ConnectionStrings__DefaultConnection`). Required secrets use `${VAR:?error}` syntax to fail fast on missing values.
- **Frontend** build receives `VITE_API_URL` as a Docker build arg, which Vite inlines during the production build.
- **Caddy** uses `{$SITE_ADDRESS::80}` in the Caddyfile — defaults to plain HTTP on port 80 for local testing. Production sets `SITE_ADDRESS` to the FQDN, which triggers Caddy's automatic Let's Encrypt certificate provisioning.

Discovered that Caddy treats `localhost` as a domain name and auto-provisions TLS via its internal CA, causing HTTP→HTTPS redirects. Solved by introducing a separate `SITE_ADDRESS` env var (defaults to `:80`) instead of using `DOMAIN` directly in the Caddyfile. This is documented in K019.

## Verification

- `docker compose -f docker-compose.prod.yml config` — validates without errors
- `docker compose -f docker-compose.prod.yml build` — both API and frontend images built successfully
- `docker compose -f docker-compose.prod.yml up -d` — all 4 services started, DB healthcheck passed before API
- `docker compose -f docker-compose.prod.yml ps` — all services Up, db healthy
- `curl -s http://localhost | grep -q "<title>"` — frontend HTML served through Caddy ✅
- `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost/api/auth/login -H "Content-Type: application/json" -d '{"email":"x","password":"x"}'` — returned 400 ✅
- SPA deep-link `curl http://localhost/properties` returns 200 with index.html ✅
- `docker compose -f docker-compose.prod.yml down` — clean teardown ✅

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `docker compose -f docker-compose.prod.yml config` | 0 | ✅ pass | 1s |
| 2 | `docker compose -f docker-compose.prod.yml build` | 0 | ✅ pass | 5s |
| 3 | `docker compose -f docker-compose.prod.yml up -d` | 0 | ✅ pass | 20s |
| 4 | `docker compose -f docker-compose.prod.yml ps` (all Up) | 0 | ✅ pass | 1s |
| 5 | `curl -s http://localhost \| grep -q "<title>"` | 0 | ✅ pass | 1s |
| 6 | `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost/api/auth/login ...` → 400 | 0 | ✅ pass | 1s |
| 7 | `curl -s http://localhost/properties \| grep -q "<title>"` (SPA routing) | 0 | ✅ pass | 1s |
| 8 | `docker compose -f docker-compose.prod.yml down` | 0 | ✅ pass | 5s |

### Slice-Level Verification (partial — T03 of T04)

| # | Check | Status |
|---|-------|--------|
| 1 | `docker compose build` completes for all services | ✅ pass |
| 2 | `docker compose up -d` starts all 4 services healthy | ✅ pass |
| 3 | `curl http://localhost:80` returns frontend HTML | ✅ pass |
| 4 | `curl http://localhost:80/api/auth/login` returns 400/401 | ✅ pass |
| 5 | SPA routing: deep-link to `/properties` returns index.html | ✅ pass |
| 6 | PostgreSQL healthcheck passes before API starts | ✅ pass |
| 7 | `deploy/verify.sh` smoke test passes | ⬜ not yet (T04) |

## Diagnostics

- **Service status:** `docker compose -f docker-compose.prod.yml ps` — shows health, uptime, ports
- **Caddy logs:** `docker compose -f docker-compose.prod.yml logs caddy` — shows request routing, TLS provisioning errors, upstream connection failures
- **API logs:** `docker compose -f docker-compose.prod.yml logs api` — ASP.NET Core startup, DB migration, request errors
- **DB health:** `docker compose -f docker-compose.prod.yml exec db pg_isready -U postgres` — manual health probe
- **Failure shape:** Caddy logs `dial tcp api:8080: connect: connection refused` when API is down; API logs `Npgsql.NpgsqlException` when DB isn't ready

## Deviations

- **SITE_ADDRESS env var added (not in original plan):** The plan used `{$DOMAIN:localhost}` in the Caddyfile, but Caddy treats `localhost` as a domain requiring TLS. Introduced a separate `SITE_ADDRESS` env var (defaults to `:80`) for the Caddyfile address, keeping `DOMAIN` for CORS and app-level config. This is a minor structural improvement, not a plan-breaking change.

## Known Issues

None.

## Files Created/Modified

- `docker-compose.prod.yml` — Production compose with 4 services (db, api, web, caddy), shared network, persistent volumes
- `Caddyfile` — Reverse proxy routing /api/* to API, everything else to frontend, with SITE_ADDRESS env var
- `.env.production.example` — Template with all required production secrets and documentation
- `.env` — Local testing values (gitignored, not committed)
- `.gitignore` — Added `!.env.production.example` exception so template is tracked
