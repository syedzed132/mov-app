# Production Deployment & Operations Guide

This guide details the deployment of **NXT FORM** on a single Virtual Private Server (VPS) within the **CAD $50/month** infrastructure budget.

---

## 1. Infrastructure Cost Analysis & Budget Verification

**Target Budget:** Maximum CAD $50.00/month  
**Estimated Spend:** CAD $6.00 – $12.00/month  
**Remaining Buffer:** > CAD $38.00/month (76% margin)

| Component | Recommended Provider | Specs | Monthly Cost (USD) | Monthly Cost (CAD) |
|---|---|---|---|---|
| **VPS Server** | Hetzner Cloud (CPX11) *or* DigitalOcean Droplet | 1–2 vCPU, 2 GB RAM, 40 GB NVMe | ~$4.00 – $6.00 | ~$5.50 – $8.25 |
| **Object / Block Storage** | Local NVMe + automated offsite sync | 40 GB NVMe included | $0.00 | $0.00 |
| **Reverse Proxy & SSL** | Caddy *or* Cloudflare + Nginx | Automatic TLS 1.3 | $0.00 | $0.00 |
| **USDA FoodData Central** | U.S. Department of Agriculture | 1,000 req/hour tier | $0.00 | $0.00 |
| **Open Food Facts** | Open Food Facts API | Free open database | $0.00 | $0.00 |
| **Offsite Backups** | Backblaze B2 *or* Cloudflare R2 | 10 GB retention | ~$0.06 | ~$0.08 |
| **Total** | | | **~$4.06 – $6.06** | **~$5.60 – $8.35** |

---

## 2. Server Provisioning Steps (Ubuntu 24.04 LTS)

### Step 1: System Baseline & Firewall Setup
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ufw curl git tar fail2ban

# Configure Firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Step 2: Install Docker & Docker Compose
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Step 3: Clone Repository and Configure Environment
```bash
git clone https://github.com/DuarteSantos8/openGym.git /opt/nxtform
cd /opt/nxtform

cp .env.production.example .env
nano .env # Set ORIGIN=https://app.yourdomain.com and RP_ID=app.yourdomain.com
```

### Step 4: Build and Launch Containers
```bash
docker compose up -d --build
docker compose ps
```

---

## 3. Automated Offsite Backup Setup

Set up a daily cron job to run `scripts/backup-data.mjs` and sync archives to offsite storage:

```bash
# Add to crontab (crontab -e)
# Run daily at 03:00 AM
0 3 * * * node /opt/nxtform/scripts/backup-data.mjs >> /var/log/nxtform-backup.log 2>&1
```

### Restore Verification
To test and verify backup restoration:
```bash
node /opt/nxtform/scripts/restore-data.mjs /opt/nxtform/backups/nxtform-data-YYYY-MM-DD.tar.gz /opt/nxtform/restore-test
```

---

## 4. Privacy & Monitoring Best Practices
- **No Health Data in Access Logs:** Nginx is configured to log only HTTP status and response times, omitting query strings on sensitive endpoints.
- **Fail2Ban Protection:** Protects SSH and login endpoints from brute-force attempts.
