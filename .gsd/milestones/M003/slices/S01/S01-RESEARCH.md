# S01 (Production Deploy) — Research

**Date:** 2026-03-18
**Depth:** Targeted — known technologies (Docker, Caddy, ASP.NET Core), standard deployment pattern, but first production deploy for this codebase.

## Summary

This slice creates the production deployment stack: Dockerized ASP.NET Core 10 API + React/Vite frontend + PostgreSQL, fronted by Caddy for automatic HTTPS, running on a Hetzner VPS. The codebase currently has only a dev-only `docker-compose.yml` (PostgreSQL only) and hardcoded `localhost:5039` in the frontend. No Dockerfiles exist yet.

The work is straightforward infrastructure — multi-stage Dockerfile for the API, nginx-based static serving for the frontend SPA, a production `docker-compose.prod.yml` with Caddy as reverse proxy, and environment-based configuration for both backend and frontend. .NET 10 Docker images (`mcr.microsoft.com/dotnet/sdk:10.0` and `aspnet:10.0`) are GA and available. Caddy provides zero-config automatic HTTPS via Let's Encrypt.

The primary requirement this slice delivers is **R025** (VPS deploy — Hetzner + domain + HTTPS + Docker Compose). It also unblocks S02–S06 by providing the production-accessible backend URL that all downstream slices consume.

## Recommendation

Use **Caddy** (not Nginx) as the reverse proxy — it handles automatic HTTPS with zero manual certificate management, has simpler configuration, and is well-suited for single-VPS Docker Compose deployments. Use a **single `docker-compose.prod.yml`** with four services: `api`, `web`, `db`, `caddy`. The frontend should use Vite's `VITE_API_URL` env var (build-time injection) to point to the production API URL. Backend configuration should use `appsettings.Production.json` with environment variable overrides for secrets.

## Implementation Landscape

### Key Files

**Existing (to modify):**
- `docker-compose.yml` — Currently only PostgreSQL on port 5434. Keep for local dev, create separate prod compose.
- `GurkanApi/Program.cs` — CORS currently `AllowAnyOrigin()`. Production needs specific origin whitelist. Also: app listens on default port (8080 in container per .NET 8+ convention). `MigrateAsync()` on startup handles DB migrations automatically — good for prod.
- `GurkanApi/appsettings.json` — Base config. Connection string uses `localhost:5434`. Production needs `db:5432` (Docker network hostname). JWT secret needs real value via env override.
- `gurkan-ui/src/api/client.ts` — Hardcoded `baseURL: 'http://localhost:5039/api'`. Must read from `import.meta.env.VITE_API_URL` or similar.
- `gurkan-ui/vite.config.ts` — Minimal config. No changes needed for production build.
- `.gitignore` — Already ignores `.env`, `.env.*`, `bin/`, `obj/`, `dist/`, `build/`.

**New files to create:**
- `GurkanApi/Dockerfile` — Multi-stage build: `sdk:10.0` → build+publish → `aspnet:10.0` runtime.
- `gurkan-ui/Dockerfile` — Multi-stage: `node:22-alpine` → build → `nginx:alpine` to serve static files.
- `gurkan-ui/nginx.conf` — SPA fallback config (try_files to index.html for client-side routing).
- `docker-compose.prod.yml` — Full production stack: api + web + db + caddy.
- `Caddyfile` — Reverse proxy config: domain → web (frontend), domain/api → api (backend).
- `GurkanApi/appsettings.Production.json` — Production-specific overrides (connection string pointing to `db` service, stricter CORS).
- `.env.production.example` — Template for production secrets (DB password, JWT secret, domain name).
- `deploy/README.md` — VPS setup documentation (DNS, firewall, Docker install, first deploy).

### Build Order

1. **Frontend environment variable for API URL** — Change `client.ts` to use `import.meta.env.VITE_API_URL || 'http://localhost:5039/api'`. Smallest change, unblocks everything else. Can be tested locally.

2. **Backend Dockerfile** — Multi-stage build. Copy `.csproj` → restore → copy all → publish → runtime image. ASP.NET Core 10 in container listens on port 8080 by default. Expose 8080.

3. **Frontend Dockerfile** — Multi-stage: npm install → `npm run build` (Vite outputs to `dist/`) → copy to nginx. Need `nginx.conf` with `try_files $uri $uri/ /index.html` for SPA routing. Pass `VITE_API_URL` as build arg.

4. **Production docker-compose** — Wire up all four services on a shared Docker network. Caddy on ports 80/443, other services internal only (no published ports). PostgreSQL with named volume for data persistence. API depends_on db.

5. **Caddyfile** — Domain-based routing. `domain.com` → frontend container:80. `domain.com/api/*` → api container:8080. Caddy auto-provisions Let's Encrypt cert.

6. **Backend production config** — `appsettings.Production.json` with `Host=db;Port=5432;Database=gurkan` connection string template. CORS restricted to production domain. JWT secret via `Jwt__Secret` environment variable. `ASPNETCORE_ENVIRONMENT=Production` in compose.

7. **Deploy documentation** — VPS setup steps, DNS A record, firewall (80/443 open), Docker/Compose install, `.env` creation, `docker compose up -d`.

### Verification Approach

- **Local verification (without VPS):** `docker compose -f docker-compose.prod.yml build` succeeds. `docker compose -f docker-compose.prod.yml up` starts all services. API responds on internal port. Frontend loads. Caddy proxies correctly (test with localhost first, then domain).
- **VPS verification:** `curl -I https://domain.com` returns 200 with valid TLS cert. `curl https://domain.com/api/auth/login` returns expected response. Frontend loads in browser, login works, data displays.
- **Smoke test:** Login via browser on production URL → see dashboard → navigate property list. This proves full stack is working: DNS → Caddy → HTTPS → frontend → API → PostgreSQL.

## Constraints

- **.NET 10 Docker images default to port 8080** — Since .NET 8, containerized ASP.NET Core apps listen on port 8080 (not 5000/5039). The Dockerfile/compose must use 8080 or set `ASPNETCORE_HTTP_PORTS`.
- **.NET 10 Docker images are Ubuntu-based only** — No Debian images for .NET 10. Default tag is Ubuntu 24.04 "Noble". Alpine variant (`10.0-alpine`) also available for smaller images.
- **`MigrateAsync()` runs on startup** — The API applies pending migrations automatically (Program.cs line 112). This means the API container must wait for PostgreSQL to be ready. Use `depends_on` with healthcheck or a startup retry.
- **File uploads use local filesystem** — `DocumentsController` stores files at `FileStorage:BasePath` (default: `uploads/`). This path needs a Docker volume mount in production to persist across container rebuilds.
- **QuestPDF native dependency** — The API uses QuestPDF which requires native Skia DLL. The `aspnet:10.0` image includes the necessary runtime. No special handling needed in Dockerfile.
- **Frontend is a pure SPA** — No SSR. Vite builds static files to `dist/`. Served by nginx inside the frontend container. All routing is client-side (React Router).
- **CORS is currently `AllowAnyOrigin()`** — Works for dev but should be restricted in production. Needs environment-conditional CORS policy.

## Common Pitfalls

- **PostgreSQL not ready when API starts** — `MigrateAsync()` will fail if DB isn't accepting connections yet. Use Docker healthcheck on db service + `depends_on: db: condition: service_healthy` in compose, or add retry logic.
- **Caddy certificate provisioning requires ports 80+443 open** — Let's Encrypt HTTP-01 challenge needs port 80 accessible from internet. If VPS firewall blocks it, cert issuance fails silently and Caddy serves self-signed.
- **`VITE_API_URL` is build-time, not runtime** — Vite inlines env vars at build time. If the API URL changes, the frontend must be rebuilt. This is fine for our single-domain setup but worth noting.
- **Docker Compose `.env` file auto-loading** — Docker Compose automatically reads `.env` in the same directory. Use this for production secrets (DB_PASSWORD, JWT_SECRET, DOMAIN). Don't commit this file.
- **Volume permissions on `uploads/`** — The API container runs as non-root user in .NET 10 images. The uploads volume must be writable. May need `chown` in Dockerfile or explicit user configuration.

## Open Risks

- **Domain name not yet decided** — User needs to provide the domain. Caddyfile and CORS config depend on it. The deploy documentation should prompt for this. Use placeholder `gurkan.example.com` in configs.
- **VPS not yet provisioned** — Hetzner VPS needs to be created, SSH configured, Docker installed. This is outside the code scope but needed for final verification. Deploy docs should cover this.
- **First deploy DB migration on empty PostgreSQL** — `MigrateAsync()` will create all tables from scratch on first run. Should work but hasn't been tested against a fresh PostgreSQL 16 in Docker (only tested locally on port 5434).

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Docker multi-stage | `github/awesome-copilot@multi-stage-dockerfile` | available (7.9K installs) |
| Docker Compose | `manutej/luxor-claude-marketplace@docker-compose-orchestration` | available (514 installs) |
| ASP.NET Core containerize | `github/awesome-copilot@containerize-aspnetcore` | available (7.1K installs) |
| Docker expert | `sickn33/antigravity-awesome-skills@docker-expert` | available (7.1K installs) |
