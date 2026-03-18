# Deployment Guide — Gürkan Property Manager

This guide walks through deploying the Gürkan Property Manager to a **Hetzner VPS** with Docker Compose and automatic HTTPS via Caddy.

> **Placeholder domain:** This guide uses `gurkan.example.com` throughout — **replace it with your actual domain** everywhere you see it.

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| **VPS** | Hetzner CX22 (or similar: 2 vCPU, 4 GB RAM, 40 GB disk) running **Ubuntu 24.04** |
| **Domain name** | A domain you control (e.g., `gurkan.example.com`) |
| **SSH access** | Root or sudo access to the VPS |
| **Git repository** | This repo cloned or accessible via HTTPS/SSH |

---

## VPS Initial Setup

SSH into your VPS and run these commands as root (or prefix with `sudo`):

### 1. Update system packages

```bash
apt update && apt upgrade -y
```

### 2. Install Docker and Docker Compose plugin

```bash
# Install Docker using the official convenience script
curl -fsSL https://get.docker.com | sh

# Verify installation
docker --version
docker compose version
```

### 3. Configure the firewall

```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (required for Let's Encrypt and Caddy)
ufw allow 443/tcp   # HTTPS
ufw --force enable
ufw status
```

### 4. Create an application user (optional but recommended)

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
su - deploy
```

---

## DNS Setup

1. Go to your domain registrar or DNS provider.
2. Create an **A record** pointing your domain to the VPS IP address:

   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | A | `gurkan.example.com` | `YOUR_VPS_IP` | 300 |

3. **(Optional)** Create an A record for the `www` subdomain:

   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | A | `www.gurkan.example.com` | `YOUR_VPS_IP` | 300 |

4. Wait for DNS propagation (usually a few minutes, can take up to 48 hours):

   ```bash
   # Check from your local machine
   dig +short gurkan.example.com
   # Should return your VPS IP address
   ```

> **⚠️ Important:** DNS must resolve before deploying. Caddy will fail to provision a TLS certificate if the domain doesn't point to the server.

---

## First Deploy

### 1. Clone the repository

```bash
# As the deploy user (or root)
cd /opt
git clone <your-repo-url> gurkan
cd gurkan
```

### 2. Create the environment file

```bash
cp .env.production.example .env
```

### 3. Edit `.env` with real values

Open `.env` in your editor and set all values:

```bash
nano .env
```

| Variable | What to set |
|----------|-------------|
| `DOMAIN` | Your domain, e.g., `gurkan.example.com` |
| `SITE_ADDRESS` | Same as DOMAIN, e.g., `gurkan.example.com` (enables auto-HTTPS) |
| `DB_PASSWORD` | A strong random password (see below) |
| `JWT_SECRET` | A random string, minimum 32 characters (see below) |
| `VITE_API_URL` | `https://gurkan.example.com/api` |
| `POSTGRES_DB` | `gurkan` (default is fine) |
| `POSTGRES_USER` | `postgres` (default is fine) |

**Generate secure random values:**

```bash
# Generate a strong DB password (32 characters)
openssl rand -base64 32

# Generate a JWT secret (64 characters)
openssl rand -base64 48
```

### 4. Build and start all services

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### 5. Verify the deployment

```bash
# Check that all 4 services are running
docker compose -f docker-compose.prod.yml ps

# Run the smoke test
bash deploy/verify.sh https://gurkan.example.com
```

You should see all checks passing (✅). Open `https://gurkan.example.com` in your browser to verify the application loads.

---

## Updating

To deploy a new version:

```bash
cd /opt/gurkan
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

This rebuilds only changed images and restarts affected containers. Database data is preserved in Docker volumes.

---

## Database Backup

Create a SQL dump of the database:

```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres gurkan > backup_$(date +%Y%m%d).sql
```

This creates a file like `backup_20260318.sql` in the current directory.

**Recommended:** Set up a cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * cd /opt/gurkan && docker compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres gurkan > /opt/gurkan/backups/backup_$(date +\%Y\%m\%d).sql
```

Make sure the backups directory exists:

```bash
mkdir -p /opt/gurkan/backups
```

---

## Database Restore

To restore from a backup:

```bash
docker compose -f docker-compose.prod.yml exec -T db psql -U postgres gurkan < backup.sql
```

> **Note:** This overwrites the current database contents. Stop the API first if you want to avoid conflicts:
>
> ```bash
> docker compose -f docker-compose.prod.yml stop api
> docker compose -f docker-compose.prod.yml exec -T db psql -U postgres gurkan < backup.sql
> docker compose -f docker-compose.prod.yml start api
> ```

---

## Troubleshooting

### TLS certificate not provisioning

**Symptoms:** Browser shows "connection not secure" or Caddy logs show ACME errors.

**Checks:**
```bash
# Verify ports 80 and 443 are open
ufw status

# Verify DNS resolves to this server
dig +short gurkan.example.com

# Check Caddy logs for ACME errors
docker compose -f docker-compose.prod.yml logs caddy
```

**Common causes:**
- Ports 80/443 are blocked by the firewall or Hetzner's cloud firewall
- DNS doesn't point to this server yet (propagation delay)
- `SITE_ADDRESS` in `.env` is not set to the domain name

---

### API not starting

**Symptoms:** API container keeps restarting; frontend loads but API calls fail.

**Checks:**
```bash
# Check API container logs
docker compose -f docker-compose.prod.yml logs api

# Check if database is healthy
docker compose -f docker-compose.prod.yml exec db pg_isready -U postgres

# Check all service statuses
docker compose -f docker-compose.prod.yml ps
```

**Common causes:**
- Database password mismatch between `DB_PASSWORD` in `.env` and what PostgreSQL was initialized with (if you changed the password after first run, you need to delete the `pgdata_prod` volume: `docker volume rm gurkan_pgdata_prod`)
- Missing or invalid `JWT_SECRET` in `.env`
- Database not yet healthy when API starts (should self-resolve due to healthcheck dependency)

---

### 502 Bad Gateway

**Symptoms:** Caddy returns a 502 error page.

**Checks:**
```bash
# Check if the API container is running
docker compose -f docker-compose.prod.yml ps api

# Check Caddy logs for upstream errors
docker compose -f docker-compose.prod.yml logs caddy

# Check API logs for startup errors
docker compose -f docker-compose.prod.yml logs api
```

**Common causes:**
- API container hasn't finished starting yet — wait 10–15 seconds and try again
- API crashed during database migration — check API logs for `Npgsql.NpgsqlException`
- If API keeps crashing, check `DB_PASSWORD` matches between `.env` and the PostgreSQL volume

---

### Viewing logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service (api, web, db, caddy)
docker compose -f docker-compose.prod.yml logs -f api

# Last 50 lines of a service
docker compose -f docker-compose.prod.yml logs --tail=50 api
```

---

### Restarting everything

```bash
# Restart all services (preserves data)
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Nuclear option: rebuild everything from scratch (preserves data volumes)
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

---

### Resetting everything (⚠️ destroys data)

```bash
# Stop services and remove volumes (deletes database and uploaded files!)
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d
```
