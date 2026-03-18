---
estimated_steps: 4
estimated_files: 3
---

# T01: Make frontend API URL and backend CORS environment-configurable

**Slice:** S01 — Production Deploy
**Milestone:** M003

## Description

Both the frontend and backend are hardcoded to localhost development values. The frontend `client.ts` has `baseURL: 'http://localhost:5039/api'` and the backend `Program.cs` uses `AllowAnyOrigin()` for CORS. Production deploy requires:
- Frontend API URL read from `VITE_API_URL` environment variable (Vite injects this at build time)
- Backend CORS restricted to specific origins in Production, kept permissive in Development
- A production config file (`appsettings.Production.json`) with Docker-network-aware connection string and env var override patterns

This is the smallest prerequisite change — it doesn't require Docker or any infrastructure, but everything downstream depends on it.

**Key knowledge:** 
- K014: Backend API serves on `localhost:5039` per `launchSettings.json`
- K009: Vite + React-TS uses `erasableSyntaxOnly: true` — no enums, use const objects
- Vite env vars must be prefixed with `VITE_` to be exposed to client code
- `import.meta.env.VITE_API_URL` is replaced at build time, not runtime

## Steps

1. **Edit `gurkan-ui/src/api/client.ts`** — Change the axios instance creation to:
   ```typescript
   const api = axios.create({
     baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5039/api',
     headers: { 'Content-Type': 'application/json' },
   });
   ```
   This preserves the localhost fallback for local development without `.env` files.

2. **Edit `GurkanApi/Program.cs`** — Replace the CORS configuration (lines 42-51) with environment-conditional logic:
   ```csharp
   builder.Services.AddCors(options =>
   {
       options.AddDefaultPolicy(policy =>
       {
           var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
           if (origins != null && origins.Length > 0)
           {
               policy.WithOrigins(origins)
                     .AllowAnyMethod()
                     .AllowAnyHeader();
           }
           else
           {
               policy.AllowAnyOrigin()
                     .AllowAnyMethod()
                     .AllowAnyHeader();
           }
       });
   });
   ```
   This reads allowed origins from configuration. When `Cors:AllowedOrigins` is not set (dev), it falls back to `AllowAnyOrigin()`. In production, `appsettings.Production.json` specifies the allowed origins.

3. **Create `GurkanApi/appsettings.Production.json`**:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=db;Port=5432;Database=gurkan;Username=postgres;Password=${DB_PASSWORD}"
     },
     "Cors": {
       "AllowedOrigins": ["https://${DOMAIN}"]
     },
     "Jwt": {
       "Secret": "${JWT_SECRET}"
     },
     "Logging": {
       "LogLevel": {
         "Default": "Information",
         "Microsoft.AspNetCore": "Warning"
       }
     }
   }
   ```
   **Important:** The `${...}` placeholders above are illustrative. ASP.NET Core doesn't do shell-style substitution. The actual values will be overridden via environment variables in Docker Compose using the `__` separator convention (e.g., `ConnectionStrings__DefaultConnection`, `Jwt__Secret`). The JSON file should contain reasonable defaults where possible, with actual secrets injected via env vars at runtime:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=db;Port=5432;Database=gurkan;Username=postgres;Password=postgres"
     },
     "Cors": {
       "AllowedOrigins": ["https://gurkan.example.com"]
     },
     "Logging": {
       "LogLevel": {
         "Default": "Information",
         "Microsoft.AspNetCore": "Warning"
       }
     }
   }
   ```
   The connection string password and JWT secret will be overridden by environment variables in `docker-compose.prod.yml`.

4. **Verify locally** — Run `cd gurkan-ui && npm run build` to confirm the frontend still builds. Check that `grep -r "VITE_API_URL" src/api/client.ts` shows the env var usage. Confirm `appsettings.Production.json` is valid JSON.

## Must-Haves

- [ ] `client.ts` reads `import.meta.env.VITE_API_URL` with localhost fallback
- [ ] `Program.cs` CORS reads origins from configuration, falls back to AllowAnyOrigin when unset
- [ ] `appsettings.Production.json` exists with Docker-network connection string and CORS origins placeholder

## Verification

- `cd gurkan-ui && npm run build` succeeds without errors
- `grep "VITE_API_URL" gurkan-ui/src/api/client.ts` returns a match
- `cat GurkanApi/appsettings.Production.json | python -m json.tool` validates as JSON
- `grep "AllowedOrigins" GurkanApi/Program.cs` confirms configuration-based CORS
- Local dev still works: backend starts, frontend `npm run dev` connects to localhost:5039

## Observability Impact

- **CORS origin mismatch failures** become visible via ASP.NET Core structured logs — `Microsoft.AspNetCore.Cors` logs blocked requests at `Warning` level when `AllowedOrigins` is configured.
- **Frontend API URL misconfiguration** surfaces as network errors in browser console and failed requests visible in the Vite dev server or production nginx access logs.
- **Inspection:** `grep "AllowedOrigins" GurkanApi/appsettings*.json` shows configured origins per environment. In production, `docker exec <api> env | grep -i cors` confirms the effective override.
- **Failure state:** If `VITE_API_URL` is wrong at build time, the frontend will show CORS or network errors on every API call — visible in browser DevTools Network tab. If `Cors:AllowedOrigins` is set but doesn't include the actual frontend domain, all cross-origin requests fail with 403.

## Inputs

- `gurkan-ui/src/api/client.ts` — Current hardcoded baseURL `http://localhost:5039/api`
- `GurkanApi/Program.cs` — Current `AllowAnyOrigin()` CORS policy (lines 42-51)
- `GurkanApi/appsettings.json` — Base configuration with dev connection string (localhost:5434)

## Expected Output

- `gurkan-ui/src/api/client.ts` — Modified to use `import.meta.env.VITE_API_URL || 'http://localhost:5039/api'`
- `GurkanApi/Program.cs` — CORS reads from `Cors:AllowedOrigins` config section, falls back to AllowAnyOrigin
- `GurkanApi/appsettings.Production.json` — New file with production-ready connection string, CORS origins, and logging config
