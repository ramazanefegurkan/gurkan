# S01: Production Deploy

**Goal:** Backend + frontend + PostgreSQL Dockerized and orchestrated with Docker Compose, fronted by Caddy for automatic HTTPS, ready for Hetzner VPS deployment.
**Demo:** `docker compose -f docker-compose.prod.yml up` starts all 4 services (api, web, db, caddy). Frontend loads through Caddy, API responds at `/api/*`, login works end-to-end through the reverse proxy.

## Must-Haves

- Multi-stage Dockerfile for ASP.NET Core 10 API (sdk → publish → aspnet runtime)
- Multi-stage Dockerfile for React/Vite frontend (node → build → nginx to serve SPA)
- `docker-compose.prod.yml` with 4 services: `api`, `web`, `db`, `caddy`
- Caddyfile with reverse proxy routing: domain → frontend, domain/api → backend
- Frontend `client.ts` reads API URL from `VITE_API_URL` env var (build-time)
- Backend CORS restricted to production domain (environment-conditional)
- `appsettings.Production.json` with Docker-network connection string and env var overrides
- `.env.production.example` template for production secrets
- Deploy documentation covering VPS setup, DNS, firewall, Docker install, first deploy
- PostgreSQL data + uploads volumes persisted across container rebuilds

## Proof Level

- This slice proves: operational
- Real runtime required: yes (Docker Compose locally; VPS deploy is human-dependent)
- Human/UAT required: yes (VPS provisioning, DNS setup, final browser check on production domain)

## Verification

- `docker compose -f docker-compose.prod.yml build` completes without errors for all services
- `docker compose -f docker-compose.prod.yml up -d` starts all 4 services and they stay healthy
- `curl http://localhost:80` returns the frontend HTML (through Caddy)
- `curl http://localhost:80/api/auth/login` returns 400/401 (API reachable through Caddy reverse proxy)
- Frontend SPA routing works through nginx (deep-link to `/properties` returns index.html, not 404)
- PostgreSQL healthcheck passes before API starts migration
- `deploy/verify.sh` smoke test script passes against local stack

## Observability / Diagnostics

- Runtime signals: Docker container health status, Caddy access logs, ASP.NET Core structured logging (Information level in production)
- Inspection surfaces: `docker compose -f docker-compose.prod.yml ps` for service status, `docker compose logs <service>` for per-service logs, `curl -I https://domain/api/health` (when deployed)
- Failure visibility: Caddy logs show upstream connection errors if API is down, PostgreSQL healthcheck prevents premature API start, ASP.NET Core logs MigrateAsync failures at startup
- Redaction constraints: `.env` contains DB password and JWT secret — never committed, `.env.production.example` has placeholder values only

## Integration Closure

- Upstream surfaces consumed: none (first slice in M003)
- New wiring introduced in this slice: Caddy reverse proxy → frontend nginx container + API container; Docker network for inter-service communication; environment-based configuration for both frontend and backend
- What remains before the milestone is truly usable end-to-end: VPS provisioning, DNS A record, firewall rules (80/443), `.env` with real secrets — all covered in deploy documentation but require human execution

## Tasks

- [x] **T01: Make frontend API URL and backend CORS environment-configurable** `est:30m`
  - Why: Both frontend and backend are hardcoded to localhost. Production deploy requires the frontend to target a configurable API URL and the backend to restrict CORS to the production domain. This is the smallest prerequisite change that unblocks all Dockerfile and compose work.
  - Files: `gurkan-ui/src/api/client.ts`, `GurkanApi/Program.cs`, `GurkanApi/appsettings.Production.json`
  - Do: (1) Change `client.ts` baseURL to read from `import.meta.env.VITE_API_URL` with fallback to `http://localhost:5039/api`. (2) Update `Program.cs` CORS to use a configurable origin list: `AllowAnyOrigin()` in Development, specific origins from config in Production. (3) Create `appsettings.Production.json` with production connection string (`Host=db;Port=5432`), CORS origins placeholder, and JWT secret env var override pattern.
  - Verify: `cd gurkan-ui && npm run build` succeeds. `grep "VITE_API_URL" src/api/client.ts` confirms env var usage. `appsettings.Production.json` exists with correct structure.
  - Done when: Frontend reads API URL from env var, backend CORS is environment-conditional, production config file exists.

- [x] **T02: Create Dockerfiles for API and frontend** `est:45m`
  - Why: No Docker images exist yet for either service. Multi-stage Dockerfiles are needed before the compose file can wire them together.
  - Files: `GurkanApi/Dockerfile`, `gurkan-ui/Dockerfile`, `gurkan-ui/nginx.conf`, `gurkan-ui/.dockerignore`, `GurkanApi/.dockerignore`
  - Do: (1) Create API Dockerfile: `sdk:10.0` stage copies .csproj, runs restore, copies all source, publishes Release to `/app/publish`. Runtime stage uses `aspnet:10.0`, copies published output, exposes 8080 (NET 10 container default). Create `/app/uploads` directory and set permissions for non-root user. (2) Create frontend Dockerfile: `node:22-alpine` stage copies package.json+lock, runs npm ci, copies source, accepts `VITE_API_URL` as build ARG, runs `npm run build`. Serve stage uses `nginx:alpine`, copies build output to `/usr/share/nginx/html`, copies custom `nginx.conf`. (3) Create `nginx.conf` for SPA: listen 80, `try_files $uri $uri/ /index.html` for client-side routing. (4) Create `.dockerignore` files for both projects (node_modules, bin, obj, dist, .git).
  - Verify: `docker build -t gurkan-api ./GurkanApi` succeeds. `docker build -t gurkan-web ./gurkan-ui` succeeds. Images are created and reasonably sized.
  - Done when: Both Docker images build successfully. API image based on aspnet:10.0, frontend image based on nginx:alpine.

- [x] **T03: Create production Docker Compose with Caddy reverse proxy** `est:45m`
  - Why: The individual Docker images need orchestration. This task wires api + web + db + caddy into a single `docker compose up` that brings up the complete production stack with automatic HTTPS.
  - Files: `docker-compose.prod.yml`, `Caddyfile`, `.env.production.example`
  - Do: (1) Create `docker-compose.prod.yml` with 4 services: `db` (postgres:16-alpine, healthcheck via pg_isready, named volume `pgdata_prod`), `api` (build from ./GurkanApi, depends_on db healthy, env vars for connection string/JWT/ASPNETCORE_ENVIRONMENT=Production, uploads volume), `web` (build from ./gurkan-ui with VITE_API_URL build arg, internal only), `caddy` (caddy:2-alpine, ports 80+443, Caddyfile mount, caddy data+config volumes). All services on shared `gurkan-net` bridge network. (2) Create `Caddyfile`: `{$DOMAIN}` block with `handle /api/*` reverse_proxy to `api:8080` and `handle` default reverse_proxy to `web:80`. Include automatic HTTPS via Let's Encrypt. For local testing, add a `:80` fallback block. (3) Create `.env.production.example` with DOMAIN, DB_PASSWORD, JWT_SECRET, POSTGRES_USER, POSTGRES_DB placeholders.
  - Verify: `docker compose -f docker-compose.prod.yml config` validates without errors. `docker compose -f docker-compose.prod.yml build` succeeds. `docker compose -f docker-compose.prod.yml up -d` starts all services and they reach healthy/running state within 30 seconds.
  - Done when: All 4 services start and stay running. `curl http://localhost:80` returns frontend HTML. `curl http://localhost:80/api/auth/login -X POST -H "Content-Type: application/json" -d '{}'` returns an API error response (proving reverse proxy works).

- [x] **T04: Add deploy documentation and smoke verification script** `est:30m`
  - Why: The production stack works locally but VPS deployment requires human steps (VPS provisioning, DNS, firewall). Clear documentation bridges the gap. A verification script provides repeatable smoke testing for both local and production environments.
  - Files: `deploy/README.md`, `deploy/verify.sh`
  - Do: (1) Create `deploy/README.md` with sections: Prerequisites (Hetzner VPS, domain, SSH access), VPS Initial Setup (Docker + Docker Compose install, firewall ufw allow 80/443/22), DNS Setup (A record pointing to VPS IP), First Deploy (clone repo, create `.env` from template, `docker compose -f docker-compose.prod.yml up -d`), Updating (git pull + rebuild + restart), Backup (pg_dump via docker exec), Troubleshooting (common issues: cert provisioning, DB not ready, port conflicts). Use placeholder domain `gurkan.example.com` throughout. (2) Create `deploy/verify.sh` — a bash script that accepts a base URL (default `http://localhost`) and runs curl-based smoke tests: frontend returns HTML, API returns response, static assets load. Exit 0 on all pass, exit 1 on any failure. Make it executable.
  - Verify: `bash deploy/verify.sh http://localhost` passes when local Docker Compose stack is running. `deploy/README.md` contains all required sections.
  - Done when: Deploy documentation is complete and actionable. Verification script runs and reports pass/fail for each check.

## Files Likely Touched

- `gurkan-ui/src/api/client.ts`
- `GurkanApi/Program.cs`
- `GurkanApi/appsettings.Production.json`
- `GurkanApi/Dockerfile`
- `GurkanApi/.dockerignore`
- `gurkan-ui/Dockerfile`
- `gurkan-ui/nginx.conf`
- `gurkan-ui/.dockerignore`
- `docker-compose.prod.yml`
- `Caddyfile`
- `.env.production.example`
- `deploy/README.md`
- `deploy/verify.sh`
