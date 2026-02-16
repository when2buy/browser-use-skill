# Self-Hosted browser-use on Digital Ocean

Deploy browser-use on your own infrastructure for unlimited profiles and tasks.

## Why Self-Host?

**Pros**:
- ✅ Fixed cost ($20-40/month)
- ✅ Unlimited profiles & tasks
- ✅ Full data control
- ✅ No API limits

**Cons**:
- ⚠️ Requires server management
- ⚠️ No built-in stealth/CAPTCHA solving
- ⚠️ Manual scaling

## Architecture

```
OpenClaw → Your DO Droplet → browser-use (Docker) → Chrome/Chromium
                ↓
    Profile storage: /profiles/<user_id>/<platform>/
```

## Setup Guide

### 1. Create Digital Ocean Droplet

```bash
# Using doctl (Digital Ocean CLI)
~/bin/doctl compute droplet create browser-use-server \
  --image ubuntu-22-04-x64 \
  --size s-2vcpu-4gb \
  --region sgp1 \
  --ssh-keys <your-ssh-key-id>

# Or via web UI:
# - Image: Ubuntu 22.04 LTS
# - Plan: Basic ($24/mo) - 2vCPU, 4GB RAM
# - Region: Singapore (sgp1) or closest to users
```

### 2. Install Docker

SSH into droplet and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
```

### 3. Deploy browser-use

Create deployment directory:

```bash
mkdir -p ~/browser-use-deploy
cd ~/browser-use-deploy
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  browser-use:
    image: ghcr.io/browser-use/browser-use:latest
    container_name: browser-use
    restart: unless-stopped
    ports:
      - "9222:9222"  # Chrome DevTools Protocol
      - "8080:8080"  # API endpoint
    volumes:
      - ./profiles:/profiles
      - ./cache:/cache
    environment:
      - DISPLAY=:99
      - CHROME_ARGS=--disable-dev-shm-usage --no-sandbox
    shm_size: 2gb
    mem_limit: 3gb
```

Start service:

```bash
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 4. Configure Firewall

```bash
# Allow SSH
sudo ufw allow OpenSSH

# Allow browser-use API (if exposing publicly)
sudo ufw allow 8080/tcp

# Enable firewall
sudo ufw enable
```

### 5. Set Up Nginx Reverse Proxy (Optional)

For HTTPS and domain access:

```bash
# Install Nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# Create config
sudo nano /etc/nginx/sites-available/browser-use
```

Add configuration:

```nginx
server {
    listen 80;
    server_name browser.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and get SSL:

```bash
sudo ln -s /etc/nginx/sites-available/browser-use /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d browser.yourdomain.com
```

### 6. Update OpenClaw Integration

Modify `browser-use-skill/index.js` to use self-hosted endpoint:

```javascript
const { chromium } = require('playwright');

async function getClient() {
  // Instead of browser-use SDK, use Playwright directly
  return await chromium.connectOverCDP('http://your-droplet-ip:9222');
}

// Update profile storage to use local paths
const PROFILE_BASE = '/path/to/profiles';

async function getOrCreateProfile(userId, platform) {
  const profilePath = `${PROFILE_BASE}/${userId}/${platform}`;
  
  // Check if profile exists
  if (await fs.pathExists(profilePath)) {
    return { profilePath, isNew: false };
  }
  
  // Create new profile directory
  await fs.mkdir(profilePath, { recursive: true });
  return { profilePath, isNew: true };
}
```

## Profile Management

### Storage Structure

```
/profiles/
  ├── 7373369713/           # User ID (Telegram)
  │   ├── linkedin/         # Platform profile
  │   │   ├── Default/      # Chrome profile data
  │   │   │   ├── Cookies
  │   │   │   ├── Local Storage
  │   │   │   └── ...
  │   │   └── metadata.json
  │   └── twitter/
  │       └── ...
  └── 1234567890/
      └── ...
```

### Backup Strategy

```bash
# Daily backup to object storage
#!/bin/bash

# Backup profiles
tar -czf profiles-$(date +%Y%m%d).tar.gz /profiles

# Upload to Digital Ocean Spaces (S3-compatible)
aws s3 cp profiles-$(date +%Y%m%d).tar.gz \
  s3://your-bucket/backups/ \
  --endpoint-url https://sgp1.digitaloceanspaces.com

# Keep only last 30 days
find . -name "profiles-*.tar.gz" -mtime +30 -delete
```

Add to crontab:

```bash
crontab -e
# Add: 0 2 * * * /path/to/backup-profiles.sh
```

## Scaling

### Vertical Scaling

Upgrade droplet when needed:

```bash
# Resize to 4vCPU, 8GB RAM ($48/mo)
~/bin/doctl compute droplet-action resize <droplet-id> \
  --size s-4vcpu-8gb \
  --resize-disk
```

### Horizontal Scaling (Multiple Droplets)

Use load balancer for multiple browser instances:

```
OpenClaw → DO Load Balancer → [Droplet 1, Droplet 2, Droplet 3]
```

Add session affinity based on user ID:

```javascript
// Simple hash-based routing
function selectDroplet(userId) {
  const droplets = [
    'http://droplet1:9222',
    'http://droplet2:9222',
    'http://droplet3:9222'
  ];
  
  const hash = userId.split('').reduce((a, b) => {
    return ((a << 5) - a) + b.charCodeAt(0);
  }, 0);
  
  return droplets[Math.abs(hash) % droplets.length];
}
```

## Monitoring

### Health Checks

```bash
# Create healthcheck script
cat > /root/healthcheck.sh << 'EOF'
#!/bin/bash

if curl -f http://localhost:9222/json/version > /dev/null 2>&1; then
  echo "✅ Browser service healthy"
  exit 0
else
  echo "❌ Browser service down, restarting..."
  docker-compose restart browser-use
  exit 1
fi
EOF

chmod +x /root/healthcheck.sh

# Add to cron (every 5 minutes)
crontab -e
# Add: */5 * * * * /root/healthcheck.sh
```

### Resource Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop -y

# Check Docker stats
docker stats browser-use

# Check disk usage
df -h
du -sh /profiles/*
```

## Cost Breakdown

### Digital Ocean Costs

| Component           | Cost/Month | Notes                    |
|---------------------|------------|--------------------------|
| Droplet (2vCPU/4GB) | $24        | Basic plan               |
| Droplet (4vCPU/8GB) | $48        | If scaling needed        |
| Backup Spaces       | $5         | 250GB storage            |
| Load Balancer       | $12        | Only if multiple servers |
| **Total (single)**  | **$29**    | Basic setup              |
| **Total (scaled)**  | **$89**    | With LB + larger droplet |

### Comparison with Cloud

| Metric           | browser-use Cloud | Self-Hosted DO |
|------------------|-------------------|----------------|
| Setup Time       | 5 minutes         | 1-2 hours      |
| Monthly Cost     | $99 (Business)    | $29-89         |
| Profiles         | Unlimited         | Unlimited      |
| Tasks            | ~5000/mo          | Unlimited      |
| Data Control     | Third-party       | Full           |
| Maintenance      | Zero              | Weekly checks  |

**Recommendation**:
- **<10 users**: Use browser-use Cloud ($99/mo)
- **10-50 users**: Self-hosted single droplet ($29/mo)
- **>50 users**: Self-hosted with load balancer ($89+/mo)

## Troubleshooting

### Chrome Crashes

Increase shared memory:

```yaml
# docker-compose.yml
shm_size: 4gb  # Increase from 2gb
```

### Profile Corruption

Reset profile:

```bash
# Backup first
mv /profiles/7373369713/linkedin /profiles/backup/

# User will need to login again
```

### Out of Disk Space

Clean old profiles:

```bash
# Find large profiles
du -sh /profiles/*/* | sort -rh | head -20

# Delete unused profiles (>30 days)
find /profiles -type d -mtime +30 -exec rm -rf {} \;
```

## Security

### Hardening

```bash
# Disable password auth
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd

# Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban

# Update regularly
sudo apt update && sudo apt upgrade -y
```

### Network Isolation

```bash
# Only allow OpenClaw server to connect
sudo ufw allow from <openclaw-server-ip> to any port 9222
sudo ufw deny 9222
```

### Secrets Management

```bash
# Store API keys in environment file
cat > ~/browser-use-deploy/.env << EOF
BROWSER_USE_AUTH_TOKEN=$(openssl rand -hex 32)
EOF

# Load in docker-compose
env_file:
  - .env
```

## Next Steps

1. ✅ Set up droplet and deploy docker-compose
2. 🔧 Update OpenClaw skill to use self-hosted endpoint
3. 📊 Set up monitoring and backups
4. 🔒 Harden security (firewall, SSH, fail2ban)
5. 📈 Monitor usage and scale as needed

---

Need help? Check the [browser-use GitHub](https://github.com/browser-use/browser-use) or ask in Discord!
