---
id: S01
parent: M003
milestone: M003
provides:
  - Docker Compose production stack orchestrating 4 services (PostgreSQL, ASP.NET Core API, React/Vite frontend via nginx, Caddy reverse proxy)
  - Multi-stage Dockerfiles for API (aspnet:10.0) and frontend (nginx:alpine) with layer-cached dependency builds
  - Caddy reverse proxy with automatic HTTPS via Let's Encrypt and /api/* routing to backend
  - Environment-configurable frontend API URL (VITE_API_URL) and backend CORS (Cors:AllowedOrigins)
  - Production appsettings with Docker-network connection string and env var override pattern
  - .env.production.example template documenting all required secrets
  - VPS deployment guide covering Hetzner setup through troubleshooting
  - Reusable smoke verification script (deploy/verify.sh)
requires:
  - slice: none
    provides: First slice in M003 — no upstream dependencies
affects:
  - S02
  - S03
  - S04
key_files:
  - docker-compose.prod.yml
  - Caddyfile
  - .env.production.example
  - GurkanApi/Dockerfile
  - GurkanApi/.dockerignore
  - GurkanApi/appsettings.Production.json
  - gurkan-ui/Dockerfile
  - gurkan-ui/nginx.conf
  - gurkan-ui/.dockerignore
  - gurkan-ui/src/api/client.ts
  - GurkanApi/Program.cs
  - deploy/README.md
  - deploy/verify.sh
key_decisions:
  - Caddy 2 as reverse proxy (not Nginx) — zero-config automatic HTTPS, simpler config syntax (D019)
  - Separate SITE_ADDRESS env var for Caddy address vs DOMAIN for app config — avoids Caddy localhost TLS issue (K019)
  - CORS falls back to AllowAnyOrigin when Cors:AllowedOrigins unset — preserves zero-config dev experience
  - Debian-based aspnet:10.0 (not Alpine) to ensure QuestPDF/Skia native DLL compatibility (K017)
  - Required secrets use ${VAR:?error} syntax in compose for fail-fast on missing values
patterns_established:
  - Frontend env vars use VITE_ prefix with import.meta.env and hardcoded fallback for dev
  - Backend per-environment config via appsettings.{Environment}.json with env var overrides using __ convention
  - Multi-stage Docker builds with dependency-layer caching (COPY package files → install → COPY source)
  - Docker Compose env var pattern: required secrets use ${VAR:?error}, optional config uses ${VAR:-default}
  - Caddy env var substitution with {$SITE_ADDRESS::80} for address
  - PostgreSQL healthcheck with depends_on condition:service_healthy gates API startup
  - nginx SPA pattern: try_files $uri $uri/ /index.html with aggressive caching on /assets/
  - Smoke test pattern: curl-based check function with name/command/expected triple, exit 0/1
observability_surfaces:
  - docker compose -f docker-compose.prod.yml ps — service health status
  - docker compose -f docker-compose.prod.yml logs <service> — per-service logs (caddy/api/db/web)
  - deploy/verify.sh <base_url> — 4-check smoke test with exit code signaling
  - curl -I https://domain/api/health — API reachability (when deployed)
  - Caddy access logs show upstream connection errors if API is down
  - ASP.NET Core structured logs show startup, DB migration, and CORS errors
drill_down_paths:
  - .gsd/milestones/M003/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M003/slices/S01/tasks/T03-SUMMARY.md
  - .gsd/milestones/M003/slices/S01/tasks/T04-SUMMARY.md
duration: 48m
verification_result: passed
completed_at: 2026-03-18
---

# S01: Production Deploy

**Docker Compose production stack with Caddy reverse proxy, multi-stage Dockerfiles for API and frontend, environment-configurable CORS and API URL, VPS deployment guide and smoke test script — all 4 services start with one command, frontend and API reachable through reverse proxy**

## What Happened

This slice transformed the localhost-only M001 application into a production-deployable Docker Compose stack with 4 services, following a bottom-up build order across 4 tasks.

**T01 (Environment Configuration)** made the two hardcoded coupling points configurable: frontend `client.ts` now reads `VITE_API_URL` from `import.meta.env` with `http://localhost:5039/api` fallback, and backend `Program.cs` CORS reads `Cors:AllowedOrigins` from configuration with `AllowAnyOrigin()` fallback for development. Created `appsettings.Production.json` with Docker-network connection string (`Host=db;Port=5432`) and placeholder CORS origin. Real secrets override via ASP.NET Core's `__` convention at runtime.

**T02 (Dockerfiles)** created multi-stage builds for both services. The API Dockerfile uses `sdk:10.0` for build and `aspnet:10.0` (Debian) for runtime — Alpine was deliberately avoided to keep QuestPDF/Skia native DLL compatibility (K015/K017). Creates `/app/uploads` with correct ownership for the non-root app user (UID 1654). The frontend Dockerfile uses `node:22-alpine` → `nginx:alpine` with a custom `nginx.conf` that handles SPA routing via `try_files $uri $uri/ /index.html`. Both images use dependency-layer caching for fast rebuilds. API image is ~486MB (Debian + .NET), frontend ~93MB (nginx:alpine).

**T03 (Docker Compose + Caddy)** wired everything together into `docker-compose.prod.yml` with 4 services on a shared `gurkan-net` bridge network: PostgreSQL with `pg_isready` healthcheck, API with `depends_on: db: condition: service_healthy`, frontend (internal only), and Caddy exposing ports 80/443. Key discovery: Caddy treats `localhost` as a domain and auto-provisions TLS, causing HTTP→HTTPS redirects locally. Solved by introducing `SITE_ADDRESS` env var (defaults to `:80`) separate from `DOMAIN` (K019). Required secrets use `${VAR:?error}` for fail-fast.

**T04 (Deploy Docs + Smoke Test)** created `deploy/README.md` covering the full VPS journey (system setup, DNS, first deploy, updates, backup/restore, troubleshooting) and `deploy/verify.sh` with 4 curl-based checks (frontend 200, app root div, API login endpoint, SPA deep link). Hit a bash gotcha: `((PASS++))` returns exit code 1 when PASS is 0 under `set -e` — fixed with `PASS=$((PASS + 1))` (K020).

## Verification

All 7 slice-level checks passed as verified in T04's final execution:

| # | Check | Status |
|---|-------|--------|
| 1 | `docker compose -f docker-compose.prod.yml build` completes for all services | ✅ pass |
| 2 | `docker compose -f docker-compose.prod.yml up -d` starts all 4 services healthy | ✅ pass |
| 3 | `curl http://localhost:80` returns frontend HTML | ✅ pass |
| 4 | `curl http://localhost:80/api/auth/login` returns 400/401 (API reachable through Caddy) | ✅ pass (400) |
| 5 | Frontend SPA routing: deep-link to `/properties` returns index.html, not 404 | ✅ pass |
| 6 | PostgreSQL healthcheck passes before API starts migration | ✅ pass |
| 7 | `deploy/verify.sh http://localhost` passes (4/4 checks) | ✅ pass |

Additional verification across tasks:
- `npm run build` in gurkan-ui succeeds with VITE_API_URL env var usage confirmed
- Both Docker images build successfully with multi-stage caching
- `docker compose config` validates without errors
- `deploy/README.md` contains all 8 required sections
- `bash -n deploy/verify.sh` syntax check passes
- No hardcoded secrets in any committed file

## Requirements Advanced

- R025 — Docker Compose production stack fully operational locally. All verification criteria met: build succeeds, 4 services start healthy, frontend and API reachable through Caddy reverse proxy, SPA routing works, PostgreSQL healthcheck gates API startup, smoke test passes. VPS deployment remains a human-executed step documented in deploy/README.md.

## Requirements Validated

- R025 — Fully validated at the operational proof level. The local Docker Compose stack proves the complete production architecture works: multi-service orchestration, reverse proxy routing, environment-based configuration, health-gated service startup. The only remaining gap is human execution of VPS provisioning and DNS setup, which is documented but not automatable.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- **SITE_ADDRESS env var added (T03):** Plan used `{$DOMAIN:localhost}` in Caddyfile, but Caddy treats `localhost` as a domain requiring TLS certificates. Introduced a separate `SITE_ADDRESS` env var defaulting to `:80` for local plain HTTP. Minor structural improvement, no plan breakage.
- **Removed `set -e` from verify.sh (T04):** Added `set -e` initially for safety, but it's incompatible with the check function pattern where eval'd commands and arithmetic on zero values return non-zero. Kept `set -uo pipefail`.

## Known Limitations

- **VPS deployment requires human execution:** VPS provisioning, DNS A record setup, firewall rules, and `.env` with real secrets are documented but not automated. This is inherent to infrastructure bootstrapping.
- **No health endpoint on API:** `curl /api/health` is mentioned in observability but no dedicated health endpoint exists — the login endpoint serves as a reachability probe. A proper `/api/health` endpoint would be a small improvement.
- **Image sizes are large:** API image ~486MB (Debian-based aspnet:10.0 needed for QuestPDF/Skia), frontend ~93MB (nginx:alpine). These are normal for the base image families but larger than minimal deployments.
- **No container resource limits:** Docker Compose doesn't set memory/CPU limits. Acceptable for a single-VPS deployment but should be added if resources become constrained.

## Follow-ups

- none — all planned work completed. VPS deployment is a human-dependent next step documented in deploy/README.md.

## Files Created/Modified

- `gurkan-ui/src/api/client.ts` — baseURL reads from VITE_API_URL with localhost fallback
- `GurkanApi/Program.cs` — CORS reads AllowedOrigins from config, falls back to AllowAnyOrigin
- `GurkanApi/appsettings.Production.json` — Docker-network connection string, placeholder CORS origin
- `GurkanApi/Dockerfile` — Multi-stage: sdk:10.0 build → aspnet:10.0 runtime, port 8080
- `GurkanApi/.dockerignore` — Excludes bin/, obj/, .git, uploads/
- `gurkan-ui/Dockerfile` — Multi-stage: node:22-alpine → nginx:alpine, VITE_API_URL build arg
- `gurkan-ui/nginx.conf` — SPA-aware nginx with try_files fallback and asset caching
- `gurkan-ui/.dockerignore` — Excludes node_modules/, dist/, .git
- `docker-compose.prod.yml` — 4 services (db, api, web, caddy), shared network, persistent volumes
- `Caddyfile` — Reverse proxy /api/* → api:8080, everything else → web:80
- `.env.production.example` — Template with all required production secrets
- `deploy/README.md` — VPS deployment guide: setup through troubleshooting (8 sections)
- `deploy/verify.sh` — 4-check curl-based smoke test, exit 0/1

## Forward Intelligence

### What the next slice should know
- The production API URL pattern is `https://{DOMAIN}/api` — Caddy routes `/api/*` to the backend, everything else to the frontend. Downstream slices (S02/S03/S04) should use this URL pattern.
- Backend CORS is configured via `Cors__AllowedOrigins__0` env var in docker-compose.prod.yml. Mobile app (S04) will need its origin added if applicable, though React Native requests may not need CORS.
- The frontend's API URL is baked in at Docker build time via `VITE_API_URL` build arg. Changing the API URL requires a frontend image rebuild.
- Docker Compose local testing uses plain HTTP on port 80 (SITE_ADDRESS defaults to `:80`). Production sets SITE_ADDRESS to the FQDN for auto-HTTPS.

### What's fragile
- **VITE_API_URL is build-time only** — Cannot be changed at runtime. If the domain changes, the frontend image must be rebuilt. This is a Vite limitation (import.meta.env is inlined during build).
- **Caddy SITE_ADDRESS vs DOMAIN separation** — Two env vars control related but different things. Misconfiguring one without the other (e.g., setting DOMAIN but not SITE_ADDRESS) will break either CORS or TLS. The .env.production.example documents both clearly.

### Authoritative diagnostics
- `docker compose -f docker-compose.prod.yml ps` — first thing to check; shows health status of all 4 services
- `docker compose -f docker-compose.prod.yml logs api` — DB connection, migration, and CORS errors appear here
- `docker compose -f docker-compose.prod.yml logs caddy` — upstream connection failures, TLS provisioning errors
- `deploy/verify.sh <url>` — quickest reachability check for both frontend and API

### What assumptions changed
- **Plan assumed DOMAIN could be used directly as Caddy address** — Caddy treats any hostname (including `localhost`) as a domain requiring TLS. Required introducing SITE_ADDRESS as a separate concept (K019).
- **Plan didn't specify Alpine vs Debian for API image** — Resolved in favor of Debian to maintain QuestPDF/Skia compatibility (K017). This is a permanent constraint unless QuestPDF is removed.
