---
id: T01
parent: S01
milestone: M003
provides:
  - Environment-configurable frontend API URL via VITE_API_URL
  - Configuration-driven backend CORS with AllowAnyOrigin fallback
  - Production appsettings with Docker-network connection string
key_files:
  - gurkan-ui/src/api/client.ts
  - GurkanApi/Program.cs
  - GurkanApi/appsettings.Production.json
key_decisions:
  - CORS falls back to AllowAnyOrigin when Cors:AllowedOrigins is unset (preserves zero-config dev experience)
  - appsettings.Production.json uses placeholder domain and default password — real secrets injected via env vars at runtime using ASP.NET Core __ convention
patterns_established:
  - Frontend env vars use VITE_ prefix and import.meta.env with hardcoded fallback for dev
  - Backend per-environment config via appsettings.{Environment}.json with env var overrides
observability_surfaces:
  - CORS mismatches logged by ASP.NET Core at Warning level
  - Frontend API misconfiguration visible as network errors in browser DevTools
duration: 8m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T01: Make frontend API URL and backend CORS environment-configurable

**Frontend reads API URL from `VITE_API_URL` env var with localhost fallback; backend CORS reads allowed origins from config, falls back to AllowAnyOrigin for dev; added appsettings.Production.json with Docker-network defaults**

## What Happened

Three files changed per plan:

1. **`gurkan-ui/src/api/client.ts`** — Changed `baseURL` from hardcoded `'http://localhost:5039/api'` to `import.meta.env.VITE_API_URL || 'http://localhost:5039/api'`. Vite replaces the env var at build time; without a `.env` file, the fallback preserves the local dev experience.

2. **`GurkanApi/Program.cs`** — Replaced the unconditional `AllowAnyOrigin()` CORS policy with configuration-driven logic: reads `Cors:AllowedOrigins` from `IConfiguration`, uses `WithOrigins(origins)` when the array is present and non-empty, otherwise falls back to `AllowAnyOrigin()`. This means dev (no config) keeps working, and production (with `appsettings.Production.json` or env var overrides) restricts to specified origins.

3. **`GurkanApi/appsettings.Production.json`** — Created with Docker-network-aware connection string (`Host=db;Port=5432`), a placeholder CORS origin (`https://gurkan.example.com`), and production logging levels. Real secrets (DB password, JWT secret) will be overridden via environment variables in Docker Compose using ASP.NET Core's `__` separator convention.

## Verification

- `npm run build` in `gurkan-ui` succeeds — TypeScript compiles, Vite produces production bundle (105 modules, 377KB JS gzipped to 105KB)
- `grep "VITE_API_URL" gurkan-ui/src/api/client.ts` confirms env var usage
- `python -m json.tool GurkanApi/appsettings.Production.json` validates as valid JSON
- `grep "AllowedOrigins" GurkanApi/Program.cs` confirms configuration-based CORS

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-ui && npm run build` | 0 | ✅ pass | 3.0s |
| 2 | `grep "VITE_API_URL" gurkan-ui/src/api/client.ts` | 0 | ✅ pass | <1s |
| 3 | `python -m json.tool GurkanApi/appsettings.Production.json` | 0 | ✅ pass | <1s |
| 4 | `grep "AllowedOrigins" GurkanApi/Program.cs` | 0 | ✅ pass | <1s |

### Slice-level checks (T01 is intermediate — partial expected)

| # | Slice Check | Status | Notes |
|---|-------------|--------|-------|
| 1 | `docker compose -f docker-compose.prod.yml build` | ⏳ blocked | Dockerfiles not yet created (T02) |
| 2 | `docker compose -f docker-compose.prod.yml up -d` | ⏳ blocked | Compose file not yet created (T03) |
| 3 | `curl http://localhost:80` returns frontend HTML | ⏳ blocked | Caddy not yet configured (T03) |
| 4 | `curl http://localhost:80/api/auth/login` returns 400/401 | ⏳ blocked | Reverse proxy not yet configured (T03) |
| 5 | Frontend SPA routing through nginx | ⏳ blocked | nginx.conf not yet created (T02) |
| 6 | PostgreSQL healthcheck | ⏳ blocked | Compose file not yet created (T03) |
| 7 | `deploy/verify.sh` passes | ⏳ blocked | Script not yet created (T04) |

## Diagnostics

- **CORS origin check:** `grep "AllowedOrigins" GurkanApi/appsettings*.json` shows configured origins per environment
- **Frontend API target:** Build the frontend with `VITE_API_URL=https://example.com/api npm run build`, then `grep "example.com" gurkan-ui/dist/assets/*.js` to confirm the env var was injected
- **Runtime CORS failures:** Check ASP.NET Core logs for `Microsoft.AspNetCore.Cors` warnings when a request is blocked

## Deviations

None — all three steps executed exactly as planned.

## Known Issues

None.

## Files Created/Modified

- `gurkan-ui/src/api/client.ts` — Changed baseURL to read from `import.meta.env.VITE_API_URL` with localhost fallback
- `GurkanApi/Program.cs` — CORS now reads `Cors:AllowedOrigins` from configuration, falls back to AllowAnyOrigin
- `GurkanApi/appsettings.Production.json` — New file with Docker-network connection string, placeholder CORS origin, production logging
