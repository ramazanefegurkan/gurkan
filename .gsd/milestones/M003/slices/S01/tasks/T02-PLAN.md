---
estimated_steps: 5
estimated_files: 5
---

# T02: Create Dockerfiles for API and frontend

**Slice:** S01 — Production Deploy
**Milestone:** M003

## Description

Create multi-stage Dockerfiles for both the ASP.NET Core 10 API and the React/Vite frontend, plus supporting files (nginx SPA config, .dockerignore). These are the build artifacts that `docker-compose.prod.yml` (T03) will reference.

**Key constraints from research and knowledge base:**
- K015: QuestPDF loads native Skia DLL — the `aspnet:10.0` runtime image includes the necessary runtime, no special handling needed
- .NET 10 containers default to port 8080 (since .NET 8+), not 5000
- .NET 10 images run as non-root user — uploads directory must be writable
- The API project file is at `GurkanApi/GurkanApi.csproj` and there's a solution file `GurkanApi.slnx` at root
- Frontend uses Vite, outputs to `dist/` directory, and `VITE_API_URL` is a build-time env var (T01)
- Frontend is a pure SPA (React Router) — nginx must serve `index.html` for all routes

## Steps

1. **Create `GurkanApi/.dockerignore`**:
   ```
   bin/
   obj/
   .git
   .gitignore
   *.md
   .env*
   uploads/
   ```

2. **Create `GurkanApi/Dockerfile`** — Multi-stage build:
   - **Build stage** (`sdk:10.0` as build): Set WORKDIR `/src`. Copy `GurkanApi.csproj` and run `dotnet restore`. Copy all source files. Run `dotnet publish -c Release -o /app/publish --no-restore`.
   - **Runtime stage** (`aspnet:10.0` as runtime): Set WORKDIR `/app`. Copy from build stage `/app/publish`. Create `/app/uploads` directory. Set ownership to the app user (`APP_UID` 1654 in .NET 10 images, but use `chown $APP_UID` or just ensure the directory exists with proper permissions). Expose port 8080. Set `ASPNETCORE_ENVIRONMENT=Production`. Entrypoint: `dotnet GurkanApi.dll`.
   
   **Important:** The Dockerfile build context is `./GurkanApi` (not the repo root). The .csproj references no other projects except the solution, so no parent directory files are needed during build.

3. **Create `gurkan-ui/.dockerignore`**:
   ```
   node_modules/
   dist/
   .git
   .gitignore
   *.md
   .env*
   ```

4. **Create `gurkan-ui/nginx.conf`** — SPA-friendly nginx config:
   ```nginx
   server {
       listen 80;
       server_name _;
       root /usr/share/nginx/html;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Cache static assets aggressively
       location /assets/ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```
   The `try_files` directive is critical — without it, direct navigation to `/properties/123` returns 404 instead of the SPA.

5. **Create `gurkan-ui/Dockerfile`** — Multi-stage build:
   - **Build stage** (`node:22-alpine` as build): Set WORKDIR `/app`. Copy `package.json` and `package-lock.json`. Run `npm ci`. Copy all source. Accept `VITE_API_URL` as `ARG` with default empty string. Set it as `ENV VITE_API_URL=$VITE_API_URL`. Run `npm run build` (Vite inlines the env var at build time, outputs to `dist/`).
   - **Serve stage** (`nginx:alpine`): Remove default nginx config. Copy custom `nginx.conf` to `/etc/nginx/conf.d/default.conf`. Copy `dist/` from build stage to `/usr/share/nginx/html`. Expose port 80.

## Must-Haves

- [ ] `GurkanApi/Dockerfile` builds successfully with `docker build -t gurkan-api ./GurkanApi`
- [ ] `gurkan-ui/Dockerfile` builds successfully with `docker build -t gurkan-web --build-arg VITE_API_URL=/api ./gurkan-ui`
- [ ] `gurkan-ui/nginx.conf` has `try_files $uri $uri/ /index.html` for SPA routing
- [ ] Both `.dockerignore` files exclude build artifacts and unnecessary files
- [ ] API image exposes port 8080 (.NET 10 container convention)
- [ ] Frontend image serves on port 80 via nginx

## Verification

- `docker build -t gurkan-api ./GurkanApi` completes without errors
- `docker build -t gurkan-web --build-arg VITE_API_URL=http://localhost:8080/api ./gurkan-ui` completes without errors
- `docker run --rm -d -p 8080:8080 --name test-api gurkan-api` — container starts (will fail to connect to DB, but the image runs)
- `docker run --rm -d -p 3080:80 --name test-web gurkan-web` — `curl http://localhost:3080` returns HTML content, `curl http://localhost:3080/properties` also returns HTML (SPA fallback works)
- Clean up test containers: `docker stop test-api test-web 2>/dev/null`
- Image sizes are reasonable: API < 300MB, frontend < 50MB

## Observability Impact

- **Docker build signals:** `docker build` exit code and layer output show build success/failure. Build cache hits speed up re-builds — cache misses indicate changed source layers.
- **Container runtime signals:** `docker logs <container>` for both API and frontend containers. API container will log ASP.NET Core startup (including migration failures and connection errors). Frontend nginx container logs access requests and 404s.
- **Inspection surfaces:** `docker images gurkan-api` and `docker images gurkan-web` show image sizes and creation timestamps. `docker inspect <image>` reveals exposed ports, entrypoint, environment variables, and layer count.
- **Failure visibility:** API container exits with non-zero code if `dotnet GurkanApi.dll` fails to start (e.g., missing DLL, bad config). Frontend nginx returns 502 if upstream is unreachable; SPA fallback failures manifest as 404s on client-side routes.
- **Diagnostic commands:** `docker run --rm gurkan-api ls /app/` verifies published DLLs are present. `docker run --rm gurkan-web ls /usr/share/nginx/html/` verifies built frontend assets. `docker run --rm gurkan-web cat /etc/nginx/conf.d/default.conf` verifies nginx SPA config.

## Inputs

- `gurkan-ui/src/api/client.ts` — Modified in T01 to read `VITE_API_URL` env var
- `GurkanApi/GurkanApi.csproj` — Project file for dotnet restore/publish
- `gurkan-ui/package.json` + `gurkan-ui/package-lock.json` — For npm ci

## Expected Output

- `GurkanApi/Dockerfile` — Multi-stage build producing aspnet:10.0 runtime image
- `GurkanApi/.dockerignore` — Excludes bin/, obj/, uploads/, .git
- `gurkan-ui/Dockerfile` — Multi-stage build producing nginx:alpine image with SPA
- `gurkan-ui/nginx.conf` — SPA-aware nginx configuration
- `gurkan-ui/.dockerignore` — Excludes node_modules/, dist/, .git
