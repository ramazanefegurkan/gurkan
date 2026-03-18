# S01: Production Deploy — Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

## Implementation Decisions

- **VPS:** Hetzner CX22 (4GB RAM, 2 vCPU, 40GB SSD, ~7€/ay)
- **Reverse proxy:** Caddy — otomatik HTTPS via Let's Encrypt, minimal Caddyfile config
- **Domain:** Henüz alınmadı. Deploy domain-agnostic hazırlanır — domain ve API URL environment variable olarak alınır. Domain gelince sadece Caddyfile + env güncellenir.
- **CI/CD:** GitHub Actions — push to main → build Docker images → SSH ile VPS'e deploy (docker compose pull + up)
- **DB backup:** S01 scope dışı — sonraki slice veya ayrı task olarak ele alınacak
- **JWT secret:** Production'da environment variable'dan okunacak, hardcoded appsettings.json kullanılmayacak
- **CORS:** Production'da `AllowAnyOrigin` kaldırılacak, sadece frontend domain'e izin verilecek
- **File storage:** Docker volume mount ile persist edilecek (uploads dizini)

## Agent's Discretion

- Dockerfile multi-stage build pattern'ı (build stage + runtime stage) — agent kararı
- Docker Compose service isimleri ve network yapısı — agent kararı
- GitHub Actions workflow detayları (self-hosted runner vs SSH deploy) — agent kararı, SSH deploy tercih edilir
- Caddyfile exact syntax — agent kararı
- Production appsettings override stratejisi (appsettings.Production.json vs env variables) — agent kararı, env variables tercih edilir

## Scope

### In Scope
- Backend Dockerfile (ASP.NET Core 10 multi-stage build)
- Frontend Dockerfile (Vite build → static files served by Caddy or Nginx lightweight)
- Production `docker-compose.prod.yml` (API + frontend + PostgreSQL + Caddy)
- Caddyfile (reverse proxy: frontend + API routing, otomatik HTTPS)
- Production environment config (JWT secret, DB credentials, CORS, API URL — all via env vars)
- GitHub Actions CI/CD workflow (build → deploy via SSH)
- VPS initial setup documentation/script

### Out of Scope
- Domain satın alma (kullanıcı yapacak)
- DB backup / restore stratejisi
- Monitoring / alerting / log aggregation
- SSL sertifika satın alma (Caddy + Let's Encrypt otomatik)

## Key Constraints

- Mevcut backend `localhost:5039`'da çalışıyor — production'da port mapping farklı olacak
- Mevcut CORS `AllowAnyOrigin` — production'da domain-locked olmalı
- Mevcut JWT secret hardcoded — production'da env variable olmalı
- PostgreSQL şu an port 5434'te — production'da internal Docker network üzerinden 5432
- `uploads/` dizini Docker volume ile persist edilmeli
- Frontend API baseURL şu an hardcoded `localhost:5039` — build-time env variable ile değiştirilmeli

## Deferred Ideas

- Hetzner snapshots ile VPS-level backup
- Blue-green deploy / zero-downtime deploy
- Container registry (GitHub Container Registry) kullanımı — şimdilik VPS üzerinde build yeterli
- Rate limiting / WAF
