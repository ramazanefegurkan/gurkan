---
id: T02
parent: S01
milestone: M003
provides:
  - Multi-stage Dockerfile for ASP.NET Core 10 API (sdk:10.0 build → aspnet:10.0 runtime)
  - Multi-stage Dockerfile for React/Vite frontend (node:22-alpine build → nginx:alpine serve)
  - SPA-aware nginx configuration with try_files fallback
  - .dockerignore files excluding build artifacts for both projects
key_files:
  - GurkanApi/Dockerfile
  - GurkanApi/.dockerignore
  - gurkan-ui/Dockerfile
  - gurkan-ui/nginx.conf
  - gurkan-ui/.dockerignore
key_decisions:
  - Used Debian-based aspnet:10.0 (not Alpine) to ensure QuestPDF/Skia native DLL compatibility (K015)
  - API Dockerfile build context is ./GurkanApi (not repo root) since .csproj has no cross-project references
  - Frontend VITE_API_URL passed as Docker build ARG, inlined at build time by Vite
patterns_established:
  - Multi-stage Docker builds with dependency-layer caching (COPY package files → install → COPY source)
  - .NET 10 containers expose port 8080 and use $APP_UID (1654) for non-root file ownership
  - nginx SPA pattern: try_files $uri $uri/ /index.html with aggressive caching on /assets/
observability_surfaces:
  - docker logs <api-container> shows ASP.NET Core startup and DB connection errors
  - docker logs <web-container> shows nginx access/error logs
  - docker images gurkan-api/gurkan-web shows image sizes and creation timestamps
  - docker run --rm gurkan-api ls /app/ verifies published DLLs
  - docker run --rm gurkan-web cat /etc/nginx/conf.d/default.conf verifies SPA config
duration: 5m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T02: Create Dockerfiles for API and frontend

**Multi-stage Dockerfiles for API (aspnet:10.0) and frontend (nginx:alpine) with SPA-aware nginx config, .dockerignore files, and verified container startup**

## What Happened

Created 5 files per plan, all steps executed exactly as specified:

1. **`GurkanApi/.dockerignore`** — Excludes bin/, obj/, .git, uploads/, .env*, *.md to keep Docker context clean.

2. **`GurkanApi/Dockerfile`** — Two-stage build: `sdk:10.0` stage restores from .csproj, copies source, publishes Release to `/app/publish`. Runtime stage uses `aspnet:10.0`, copies published output, creates `/app/uploads` with correct ownership for the non-root app user (UID 1654), exposes port 8080, sets `ASPNETCORE_ENVIRONMENT=Production`.

3. **`gurkan-ui/.dockerignore`** — Excludes node_modules/, dist/, .git, .env*, *.md.

4. **`gurkan-ui/nginx.conf`** — SPA-friendly nginx config: `try_files $uri $uri/ /index.html` for client-side routing fallback, aggressive 1-year caching on `/assets/` (Vite hashed filenames make this safe).

5. **`gurkan-ui/Dockerfile`** — Two-stage build: `node:22-alpine` stage accepts `VITE_API_URL` as build ARG (Vite inlines it), runs `npm ci` + `npm run build`. Serve stage uses `nginx:alpine`, replaces default config with custom `nginx.conf`, copies `dist/` to nginx html root, exposes port 80.

## Verification

- `docker build -t gurkan-api ./GurkanApi` — completed successfully (exit 0, ~124s including layer downloads)
- `docker build -t gurkan-web --build-arg VITE_API_URL=/api ./gurkan-ui` — completed successfully (exit 0, ~44s)
- API container starts and fails only due to missing DB (`Name or service not known` for `db:5432`) — confirms the image runs correctly
- Frontend container: `curl http://localhost:3080/` returns 200 with HTML
- Frontend SPA fallback: `curl http://localhost:3080/properties` returns 200 with same index.html (not 404)
- Image sizes: API 486MB (Debian-based aspnet:10.0, expected for .NET + QuestPDF/Skia), frontend 93.2MB (nginx:alpine base is ~57MB)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `docker build -t gurkan-api ./GurkanApi` | 0 | ✅ pass | 124s |
| 2 | `docker build -t gurkan-web --build-arg VITE_API_URL=/api ./gurkan-ui` | 0 | ✅ pass | 44s |
| 3 | `docker run --rm -d -p 8080:8080 --name test-api gurkan-api` | 0 | ✅ pass | <1s |
| 4 | `docker run --rm -d -p 3080:80 --name test-web gurkan-web` | 0 | ✅ pass | <1s |
| 5 | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3080/` | 0 (200) | ✅ pass | <1s |
| 6 | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3080/properties` | 0 (200) | ✅ pass | <1s |
| 7 | `grep "try_files" gurkan-ui/nginx.conf` | 0 | ✅ pass | <1s |
| 8 | `grep "EXPOSE 8080" GurkanApi/Dockerfile` | 0 | ✅ pass | <1s |
| 9 | `grep "EXPOSE 80" gurkan-ui/Dockerfile` | 0 | ✅ pass | <1s |

### Slice-level checks (T02 is intermediate — partial expected)

| # | Slice Check | Status | Notes |
|---|-------------|--------|-------|
| 1 | `docker compose -f docker-compose.prod.yml build` | ⏳ blocked | Compose file not yet created (T03) |
| 2 | `docker compose -f docker-compose.prod.yml up -d` | ⏳ blocked | Compose file not yet created (T03) |
| 3 | `curl http://localhost:80` returns frontend HTML | ⏳ blocked | Caddy not yet configured (T03) |
| 4 | `curl http://localhost:80/api/auth/login` returns 400/401 | ⏳ blocked | Reverse proxy not yet configured (T03) |
| 5 | Frontend SPA routing through nginx | ✅ pass | Verified: `/properties` returns 200 with index.html |
| 6 | PostgreSQL healthcheck | ⏳ blocked | Compose file not yet created (T03) |
| 7 | `deploy/verify.sh` passes | ⏳ blocked | Script not yet created (T04) |

## Diagnostics

- **Check API image contents:** `docker run --rm gurkan-api ls /app/` — should list GurkanApi.dll and dependencies
- **Check frontend assets:** `docker run --rm gurkan-web ls /usr/share/nginx/html/` — should list index.html, assets/, favicon.svg
- **Verify nginx SPA config:** `docker run --rm gurkan-web cat /etc/nginx/conf.d/default.conf` — should show try_files directive
- **API container logs:** `docker logs <container>` shows ASP.NET Core startup, DB connection attempts, and migration errors
- **Rebuild caching:** Subsequent `docker build` calls use layer cache for unchanged dependencies

## Deviations

None — all 5 steps executed exactly as planned.

## Known Issues

- Image sizes exceed the plan's aspirational targets (API 486MB vs target <300MB, frontend 93.2MB vs target <50MB). This is inherent to the base images: Debian-based `aspnet:10.0` is required for QuestPDF/Skia compatibility, and `nginx:alpine` base alone is ~57MB. Sizes are normal for these image families and not a functional concern.

## Files Created/Modified

- `GurkanApi/Dockerfile` — Multi-stage build: sdk:10.0 → aspnet:10.0 runtime, exposes 8080
- `GurkanApi/.dockerignore` — Excludes bin/, obj/, .git, uploads/, .env*, *.md
- `gurkan-ui/Dockerfile` — Multi-stage build: node:22-alpine → nginx:alpine, accepts VITE_API_URL build arg
- `gurkan-ui/nginx.conf` — SPA-aware nginx config with try_files fallback and asset caching
- `gurkan-ui/.dockerignore` — Excludes node_modules/, dist/, .git, .env*, *.md
