# S01: Production Deploy — UAT

**Milestone:** M003
**Written:** 2026-03-18

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: The Docker Compose stack runs locally and proves the full production architecture. VPS deployment is a human step documented in deploy/README.md — it uses the same compose file and config, so local verification covers the technical surface.

## Preconditions

- Docker Engine installed and running (`docker --version` succeeds)
- Docker Compose V2 available (`docker compose version` succeeds)
- Ports 80 and 443 available on the host (no other service binding them)
- Working directory is the repo root (where `docker-compose.prod.yml` lives)
- A `.env` file exists with at minimum `DB_PASSWORD` and `JWT_SECRET` set (copy from `.env.production.example` and fill in test values)

## Smoke Test

```bash
# Start the full stack
docker compose -f docker-compose.prod.yml up -d

# Wait for services to stabilize (~15 seconds)
sleep 15

# Run the smoke test
bash deploy/verify.sh http://localhost
# Expected: 4/4 checks pass, exit code 0
```

## Test Cases

### 1. Full stack starts with one command

1. Run `docker compose -f docker-compose.prod.yml up -d`
2. Wait 20 seconds for all services to initialize
3. Run `docker compose -f docker-compose.prod.yml ps`
4. **Expected:** All 4 services (db, api, web, caddy) show status "Up". The db service shows "(healthy)".

### 2. Frontend loads through Caddy reverse proxy

1. Open a browser or run `curl http://localhost/`
2. **Expected:** Returns HTTP 200 with HTML containing `<div id="root"`. This is the React SPA entry point served by nginx through Caddy.

### 3. API reachable through Caddy /api/* routing

1. Run: `curl -X POST http://localhost/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"wrong"}'`
2. **Expected:** Returns HTTP 400 (bad request) or 401 (unauthorized) with a JSON error response. This proves Caddy correctly routes `/api/*` to the ASP.NET Core backend.

### 4. SPA client-side routing works (deep links)

1. Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost/properties`
2. Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost/login`
3. Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost/dashboard`
4. **Expected:** All three return HTTP 200, not 404. This proves nginx's `try_files` directive correctly serves `index.html` for any frontend route, enabling React Router to handle navigation.

### 5. PostgreSQL health-gates API startup

1. Run `docker compose -f docker-compose.prod.yml down -v` to remove volumes
2. Run `docker compose -f docker-compose.prod.yml up -d`
3. Immediately run `docker compose -f docker-compose.prod.yml logs api | head -5`
4. **Expected:** API container waits for db to be healthy before starting. After db healthcheck passes, API logs show EF Core migration output and successful startup. No `Npgsql.NpgsqlException` connection errors.

### 6. Database data persists across container restarts

1. Start the stack: `docker compose -f docker-compose.prod.yml up -d`
2. Wait for startup, then register a user:
   ```bash
   curl -X POST http://localhost/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"persist@test.com","password":"Test123!","fullName":"Persistence Test"}'
   ```
3. Restart the stack: `docker compose -f docker-compose.prod.yml restart`
4. Wait 15 seconds, then try to login:
   ```bash
   curl -X POST http://localhost/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"persist@test.com","password":"Test123!"}'
   ```
5. **Expected:** Login succeeds and returns a JWT token. The `pgdata_prod` volume persisted the user data across restart.

### 7. Smoke verification script works

1. With the stack running, run: `bash deploy/verify.sh http://localhost`
2. **Expected:** Output shows 4 checks with ✅ for each, "Results: 4 passed, 0 failed", and exit code 0.
3. Stop the stack: `docker compose -f docker-compose.prod.yml down`
4. Run: `bash deploy/verify.sh http://localhost`
5. **Expected:** Output shows ❌ for each check, "Results: 0 passed, 4 failed", and exit code 1.

### 8. Environment-configurable frontend API URL

1. Rebuild frontend with custom URL: `docker compose -f docker-compose.prod.yml build --build-arg VITE_API_URL=https://custom.example.com/api web`
2. Run the built image: `docker run --rm gurkan-m003-web cat /usr/share/nginx/html/assets/*.js | grep -o "custom.example.com/api"`
3. **Expected:** The custom URL appears in the bundled JavaScript, confirming VITE_API_URL build arg works.

### 9. Environment-configurable backend CORS

1. With the stack running, check API logs for CORS configuration:
   `docker compose -f docker-compose.prod.yml logs api | grep -i cors`
2. Run a CORS preflight check:
   ```bash
   curl -I -X OPTIONS http://localhost/api/auth/login \
     -H "Origin: https://evil.example.com" \
     -H "Access-Control-Request-Method: POST"
   ```
3. **Expected:** The response should NOT include `Access-Control-Allow-Origin: https://evil.example.com`. CORS is restricted to the configured origin in production mode.

## Edge Cases

### Stack startup with missing required secrets

1. Remove DB_PASSWORD from .env (or delete .env entirely)
2. Run `docker compose -f docker-compose.prod.yml up -d`
3. **Expected:** Docker Compose fails with an error message containing "DB_PASSWORD is required" — the `${DB_PASSWORD:?...}` syntax prevents startup with missing secrets.

### Stack startup with port 80 already in use

1. Start another service on port 80 (e.g., `python -m http.server 80`)
2. Run `docker compose -f docker-compose.prod.yml up -d`
3. **Expected:** Caddy container fails to start with a port binding error. Other services (db, api, web) may still start since they don't expose host ports.

### Frontend handles /api prefix correctly (no route collision)

1. With the stack running, run: `curl http://localhost/api/nonexistent`
2. **Expected:** Returns an API-style error (404 or similar from ASP.NET Core), NOT the frontend index.html. The `/api/*` prefix is exclusively handled by the backend.

### Concurrent requests under load

1. Run: `for i in $(seq 1 20); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost/ & done; wait`
2. **Expected:** All 20 requests return 200. Caddy and nginx handle concurrent connections without errors.

## Failure Signals

- `docker compose ps` shows any service as "Exited" or without "(healthy)" on db
- `curl http://localhost/` returns connection refused or timeout
- `curl http://localhost/api/auth/login` returns connection refused, 502 (bad gateway), or frontend HTML instead of API JSON
- `curl http://localhost/properties` returns 404 instead of 200 (nginx SPA routing broken)
- `deploy/verify.sh` exits with code 1
- `docker compose logs api` shows `Npgsql.NpgsqlException` (DB connection failure) or migration errors
- `docker compose logs caddy` shows `dial tcp api:8080: connect: connection refused` (API not ready)

## Requirements Proved By This UAT

- R025 — All operational verification criteria met locally: Docker Compose builds, starts, and serves both frontend and API through Caddy reverse proxy with PostgreSQL health-gated startup. VPS deployment documented but requires human execution.

## Not Proven By This UAT

- **HTTPS / TLS certificate provisioning** — Local testing uses plain HTTP (`:80`). Let's Encrypt auto-HTTPS only activates when SITE_ADDRESS is set to a real domain on a public-facing server.
- **DNS resolution** — No actual domain or DNS A record is tested.
- **VPS performance under real load** — Local Docker Compose doesn't replicate VPS resource constraints.
- **Backup/restore workflow** — Documented in deploy/README.md but not tested in this UAT.
- **Container restart resilience** — `restart: unless-stopped` policy is set but not stress-tested across Docker daemon restarts.

## Notes for Tester

- If port 80 is occupied, change Caddy's port mapping in docker-compose.prod.yml (e.g., `8080:80`) and adjust all curl commands accordingly.
- The first `docker compose up` takes longer due to image pulls (postgres:16-alpine, caddy:2-alpine) and builds. Subsequent startups are fast.
- After testing, clean up with `docker compose -f docker-compose.prod.yml down -v` to remove containers and volumes.
- The `.env` file for local testing should have simple values (e.g., `DB_PASSWORD=testpass123`, `JWT_SECRET=test_jwt_secret_at_least_32_chars_long`). Don't use production secrets.
- Image builds are cached — if you change source code, force a rebuild with `docker compose -f docker-compose.prod.yml build --no-cache`.
