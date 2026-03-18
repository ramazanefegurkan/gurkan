---
estimated_steps: 4
estimated_files: 3
---

# T03: Create production Docker Compose with Caddy reverse proxy

**Slice:** S01 — Production Deploy
**Milestone:** M003

## Description

Wire the API, frontend, PostgreSQL, and Caddy into a single `docker-compose.prod.yml` that brings up the complete production stack with one command. This is the integration task — it connects all the pieces from T01 (config) and T02 (Dockerfiles) into an orchestrated deployment.

Caddy was chosen over Nginx as the reverse proxy (Decision D016 resolved) because it provides automatic HTTPS via Let's Encrypt with zero manual certificate management. For local testing, Caddy serves on port 80 without TLS (using the `:80` address instead of a domain name).

**Key constraints:**
- PostgreSQL must be healthy before API starts (MigrateAsync on startup — research constraint)
- API listens on port 8080 inside container (.NET 10 convention — K004 equivalent for containers)
- Frontend listens on port 80 inside container (nginx)
- Caddy needs ports 80 and 443 on the host for HTTPS certificate provisioning
- File uploads need a persistent volume at `/app/uploads` in the API container
- Docker Compose `.env` file is auto-loaded — use it for secrets
- Domain name is not yet decided — use `${DOMAIN}` variable in Caddyfile, default to `:80` for local testing

## Steps

1. **Create `.env.production.example`** — Template file for production secrets:
   ```env
   # Domain (without https://)
   DOMAIN=gurkan.example.com
   
   # PostgreSQL
   POSTGRES_DB=gurkan
   POSTGRES_USER=postgres
   DB_PASSWORD=CHANGE_ME_strong_password_here
   
   # JWT
   JWT_SECRET=CHANGE_ME_at_least_32_characters_long_random_string
   
   # API URL for frontend build (must match domain)
   VITE_API_URL=https://gurkan.example.com/api
   ```

2. **Create `Caddyfile`** — Reverse proxy configuration:
   ```
   {$DOMAIN:localhost} {
       handle /api/* {
           reverse_proxy api:8080
       }
       handle {
           reverse_proxy web:80
       }
   }
   ```
   The `{$DOMAIN:localhost}` syntax uses the DOMAIN env var with `localhost` as fallback for local testing. When DOMAIN is set to a real domain, Caddy automatically provisions a Let's Encrypt certificate. When it's `localhost` or `:80`, Caddy serves plain HTTP.

3. **Create `docker-compose.prod.yml`**:
   - **`db` service**: `postgres:16-alpine`, environment from `.env` (POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD mapped from DB_PASSWORD), healthcheck: `pg_isready -U postgres`, named volume `pgdata_prod` for data persistence. No published ports (internal only on Docker network).
   - **`api` service**: Build context `./GurkanApi`, depends_on `db` with `condition: service_healthy`. Environment variables: `ASPNETCORE_ENVIRONMENT=Production`, `ConnectionStrings__DefaultConnection=Host=db;Port=5432;Database=${POSTGRES_DB};Username=${POSTGRES_USER};Password=${DB_PASSWORD}`, `Jwt__Secret=${JWT_SECRET}`, `Cors__AllowedOrigins__0=https://${DOMAIN}`. Volume mount for uploads: `api_uploads:/app/uploads`. No published ports.
   - **`web` service**: Build context `./gurkan-ui`, build args: `VITE_API_URL=${VITE_API_URL}`. No published ports (Caddy proxies to it).
   - **`caddy` service**: `caddy:2-alpine`, ports `80:80` and `443:443` on host. Volume mounts: `./Caddyfile:/etc/caddy/Caddyfile` (read-only), `caddy_data:/data` (for certificates), `caddy_config:/config`. Depends on `web` and `api`. Environment: `DOMAIN=${DOMAIN}`.
   - **Networks**: All services on a shared `gurkan-net` bridge network.
   - **Volumes**: `pgdata_prod`, `api_uploads`, `caddy_data`, `caddy_config`.

4. **Test the full stack locally**:
   - Create a local `.env` file (not committed) with test values: `DOMAIN=localhost`, `DB_PASSWORD=postgres`, `JWT_SECRET=TestSecretKeyForLocalDocker32Chars!!`, `VITE_API_URL=http://localhost/api`, etc.
   - Run `docker compose -f docker-compose.prod.yml config` to validate.
   - Run `docker compose -f docker-compose.prod.yml build` to build all images.
   - Run `docker compose -f docker-compose.prod.yml up -d` to start.
   - Verify: `curl http://localhost` returns frontend HTML. `curl http://localhost/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test","password":"test"}'` returns an API response (400 or 401).
   - Teardown: `docker compose -f docker-compose.prod.yml down`.

## Must-Haves

- [ ] `docker-compose.prod.yml` defines 4 services: db, api, web, caddy
- [ ] PostgreSQL has healthcheck and API depends on it with `condition: service_healthy`
- [ ] Caddyfile routes `/api/*` to API and everything else to frontend
- [ ] `.env.production.example` documents all required environment variables
- [ ] Secrets (DB password, JWT secret) are injected via environment variables, not in config files
- [ ] PostgreSQL data and uploads have persistent named volumes
- [ ] `docker compose -f docker-compose.prod.yml build` succeeds
- [ ] Frontend is reachable through Caddy at port 80
- [ ] API is reachable through Caddy at `/api/*`

## Verification

- `docker compose -f docker-compose.prod.yml config` validates without errors
- `docker compose -f docker-compose.prod.yml build` completes for all services
- `docker compose -f docker-compose.prod.yml up -d` — all 4 services reach running/healthy state
- `docker compose -f docker-compose.prod.yml ps` shows all services Up
- `curl -s http://localhost | grep -q "<title>"` — frontend HTML served through Caddy
- `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost/api/auth/login -H "Content-Type: application/json" -d '{"email":"x","password":"x"}'` returns 400 or 401
- `docker compose -f docker-compose.prod.yml down` cleans up

## Observability Impact

- Signals added/changed: Caddy access logs (stdout), PostgreSQL healthcheck status, ASP.NET Core production logging
- How a future agent inspects this: `docker compose -f docker-compose.prod.yml ps` for health, `docker compose -f docker-compose.prod.yml logs api` for API errors, `docker compose -f docker-compose.prod.yml logs caddy` for proxy issues
- Failure state exposed: Caddy logs `dial tcp api:8080: connect: connection refused` if API is down; API logs `Npgsql.NpgsqlException` if DB isn't ready; healthcheck status in `docker compose ps`

## Inputs

- `GurkanApi/Dockerfile` — Created in T02, builds API image
- `gurkan-ui/Dockerfile` — Created in T02, builds frontend image
- `GurkanApi/appsettings.Production.json` — Created in T01, has Docker-network connection string
- `GurkanApi/Program.cs` — Modified in T01, reads CORS origins from config

## Expected Output

- `docker-compose.prod.yml` — Complete production orchestration with 4 services, networks, and volumes
- `Caddyfile` — Reverse proxy config with automatic HTTPS and domain variable
- `.env.production.example` — Template for production secrets (DOMAIN, DB_PASSWORD, JWT_SECRET, VITE_API_URL)
