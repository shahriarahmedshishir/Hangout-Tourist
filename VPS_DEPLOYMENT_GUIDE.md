# 🖥️ VPS Production Deployment Guide

Complete step-by-step guide for deploying Hangout Tourist to a VPS (Ubuntu/Debian)

---

## 📋 Pre-Deployment Requirements

### VPS Specifications Recommended

- **OS:** Ubuntu 22.04 LTS or Debian 12
- **RAM:** Minimum 2GB (4GB recommended)
- **Storage:** 20GB minimum
- **CPU:** 1vCPU minimum (2vCPU recommended)
- **Bandwidth:** Unlimited (minimum 100GB/month)

### What You'll Need

- SSH access to VPS (root or sudo user)
- Domain name (with DNS access)
- SSL certificate (Let's Encrypt free option)
- MongoDB connection string (Atlas or self-hosted)
- Redis instance (Redis Cloud or self-hosted)

---

## 🚀 Step 1: Initial VPS Setup (30 minutes)

### 1.1 Connect to VPS

```bash
ssh root@your-vps-ip
# OR if you have a specific user
ssh username@your-vps-ip
```

### 1.2 Update System

```bash
apt update && apt upgrade -y
```

### 1.3 Install System Dependencies

```bash
apt install -y \
  curl \
  wget \
  git \
  build-essential \
  python3 \
  nginx \
  certbot \
  python3-certbot-nginx \
  ufw

# For Node.js installation
apt install -y ca-certificates gnupg
```

### 1.4 Configure Firewall

```bash
# Enable firewall
ufw enable

# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5001/tcp    # Backend API port (optional, for testing)

# Verify
ufw status
```

### 1.5 Create App User

```bash
# Create new user for app (more secure than running as root)
adduser appuser --disabled-password

# Add to sudo group
usermod -aG sudo appuser

# Switch to new user
su - appuser
```

---

## 💾 Step 2: Install Node.js & npm (20 minutes)

### 2.1 Install Node.js (Latest LTS)

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 2.2 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Enable PM2 startup
pm2 startup
# Copy and run the command it outputs

# Verify
pm2 --version
```

---

## 🗄️ Step 3: Install & Configure Redis (25 minutes)

### Option A: Self-Hosted Redis (Simple)

```bash
# Install Redis
sudo apt install -y redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
# Should return: PONG

# Set password (optional but recommended)
sudo nano /etc/redis/redis.conf
# Find: # requirepass foobared
# Change to: requirepass your-strong-password-here

# Restart Redis
sudo systemctl restart redis-server

# Connect with password
redis-cli -a your-strong-password-here
```

### Option B: Managed Redis (Recommended for Production)

```bash
# Use Redis Cloud, AWS ElastiCache, or similar
# Get your REDIS_URL from the provider
# Example: redis://default:password@redis-cluster.com:6379

# No installation needed locally
```

### 2.3 Verify Redis

```bash
# Get Redis info
redis-cli info stats

# Monitor in real-time (optional)
redis-cli MONITOR
```

---

## 📁 Step 4: Clone & Setup Application (20 minutes)

### 4.1 Clone Repository

```bash
cd /home/appuser
git clone https://github.com/your-repo/hangouttourist.git
cd hangouttourist

# Or if using private repo with SSH key
# Add SSH key first, then clone
```

### 4.2 Install Dependencies

```bash
cd backend
npm install

# Verify no critical vulnerabilities
npm audit
# Fix if needed: npm audit fix
```

### 4.3 Create Production .env File

```bash
nano .env.production
```

Paste this (update with your values):

```env
# ═══════════════════════════════════════════════════════════════════
# PRODUCTION ENVIRONMENT VARIABLES
# ═══════════════════════════════════════════════════════════════════

NODE_ENV=production
PORT=5001

# ─ Core ─────────────────────────────────────────────────────────
JWT_SECRET=your-super-secret-key-generate-with-openssl-rand-base64-32
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/hangouttourist?retryWrites=true&w=majority
DB_NAME=hangouttourist

# ─ Frontend URLs ───────────────────────────────────────────────
CLIENT_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com

# ─ SSL Commerz (Payment Gateway) ────────────────────────────────
# Get these from your SSLCommerz merchant panel
SSLCOMMERZ_STORE_ID=your_production_store_id
SSLCOMMERZ_STORE_PASSWORD=your_production_password
SSLCOMMERZ_CALLBACK_SECRET=generate-with-openssl-rand-base64-32
SSLCOMMERZ_IPS=209.58.135.132,209.58.135.133  # Get from SSLCommerz support

# ─ AWS SES (Email Service) ──────────────────────────────────────
# Make sure email is verified in AWS SES console
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_iam_access_key
AWS_SECRET_ACCESS_KEY=your_iam_secret_key
AWS_SES_FROM_EMAIL=noreply@your-domain.com

# ─ Redis (Session & Fraud Detection) ────────────────────────────
REDIS_URL=redis://default:your-redis-password@localhost:6379
# OR for managed Redis:
# REDIS_URL=redis://default:password@redis-host.com:6379

# ─ Logging ──────────────────────────────────────────────────────
LOG_LEVEL=error
LOG_FORMAT=json
```

### 4.4 Set Permissions

```bash
# Make sure appuser owns the app directory
sudo chown -R appuser:appuser /home/appuser/hangouttourist

# Set proper permissions
chmod 755 /home/appuser/hangouttourist
```

---

## 🔒 Step 5: SSL Certificate Setup (15 minutes)

### 5.1 Point Domain to VPS

```
In your DNS provider (GoDaddy, Namecheap, etc.):
- Add A record pointing to VPS IP
- Wait 5-10 minutes for DNS propagation
```

### 5.2 Get SSL Certificate

```bash
# Stop any existing web server
sudo systemctl stop nginx

# Get certificate (auto-renewal enabled)
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d api.your-domain.com \
  -d www.your-domain.com \
  --agree-tos \
  -m your-email@domain.com

# Verify certificate
sudo certbot certificates

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## 🌐 Step 6: Nginx Configuration (20 minutes)

### 6.1 Create Nginx Config

```bash
sudo nano /etc/nginx/sites-available/hangouttourist
```

Paste this configuration:

```nginx
# ═══════════════════════════════════════════════════════════════════
# HANGOUT TOURIST - PRODUCTION NGINX CONFIG
# ═══════════════════════════════════════════════════════════════════

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com api.your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# Backend API
upstream backend {
    server 127.0.0.1:5001;
    keepalive 32;
}

# Frontend
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;

    # Frontend (React app)
    root /home/appuser/hangouttourist/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets (cache)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.your-domain.com;

    # SSL Configuration (same as above)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req zone=api_limit burst=200 nodelay;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support (for Socket.IO)
    location /socket.io {
        proxy_pass http://backend/socket.io;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 6.2 Enable Nginx Config

```bash
# Check syntax
sudo nginx -t

# Enable site
sudo ln -s /etc/nginx/sites-available/hangouttourist /etc/nginx/sites-enabled/

# Reload Nginx
sudo systemctl reload nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 🚀 Step 7: Start Application (15 minutes)

### 7.1 Create PM2 Ecosystem Config

```bash
cd /home/appuser/hangouttourist/backend
nano ecosystem.config.js
```

Paste this:

```javascript
module.exports = {
  apps: [
    {
      name: "hangouttourist-api",
      script: "./server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
      env_production: {
        NODE_ENV: "production",
      },
      error_file: "/home/appuser/hangouttourist/logs/error.log",
      out_file: "/home/appuser/hangouttourist/logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      max_memory_restart: "500M",
      watch: false,
      ignore_watch: ["node_modules", "logs"],
      max_restarts: 10,
      min_uptime: "10s",
      autorestart: true,
    },
  ],
};
```

### 7.2 Create Logs Directory

```bash
mkdir -p /home/appuser/hangouttourist/logs
chmod 755 /home/appuser/hangouttourist/logs
```

### 7.3 Start with PM2

```bash
# Start application
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit

# View logs
pm2 logs

# Check status
pm2 status

# Save PM2 config for auto-restart
pm2 save
pm2 startup
# Run the command PM2 outputs
```

### 7.4 Verify Backend is Running

```bash
# Check if listening on port 5001
netstat -tlnp | grep 5001

# Test locally
curl http://localhost:5001/api/auth/health
# Should return: {"message":"Health check passed"}
```

---

## 🧪 Step 8: Testing & Verification (30 minutes)

### 8.1 Test Frontend

```bash
# Open browser and visit:
https://your-domain.com

# Check browser console for errors
# Verify no mixed content warnings (HTTP/HTTPS)
```

### 8.2 Test Backend API

```bash
# From your local machine
curl -X GET https://api.your-domain.com/api/auth/health

# Should return:
# {"message":"Health check passed"}
```

### 8.3 Test Payment System

```bash
# Via browser:
1. Create test account
2. Verify email
3. Initiate test payment (SSLCommerz sandbox)
4. Complete payment flow

# Check logs
pm2 logs hangouttourist-api
```

### 8.4 Test Database Connection

```bash
# In your app logs, should see:
# ✅ Connected to MongoDB
# ✅ AWS SES configured and ready
# ✅ Redis configured and ready

pm2 logs | grep "✅"
```

### 8.5 Test SSL Certificate

```bash
# Via browser (should show green lock)
https://your-domain.com
https://api.your-domain.com

# Via command line
curl -v https://api.your-domain.com 2>&1 | grep "SSL"
```

---

## 📊 Step 9: Monitoring & Maintenance (Ongoing)

### 9.1 Set Up Log Rotation

```bash
sudo nano /etc/logrotate.d/hangouttourist
```

Paste:

```
/home/appuser/hangouttourist/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 appuser appuser
    sharedscripts
    postrotate
        pm2 reload hangouttourist-api
    endscript
}
```

### 9.2 Monitor in Real-Time

```bash
# Watch PM2
pm2 monit

# Watch Nginx
tail -f /var/log/nginx/error.log

# Watch Application
pm2 logs -f

# Watch Redis
redis-cli MONITOR
```

### 9.3 Check System Health

```bash
# CPU & Memory
top

# Disk Space
df -h

# Open Connections
netstat -an | grep ESTABLISHED | wc -l

# Redis Memory
redis-cli info memory
```

---

## 🔄 Step 10: Backup Strategy

### 10.1 Daily Database Backup

```bash
sudo nano /usr/local/bin/backup-db.sh
```

Paste:

```bash
#!/bin/bash

BACKUP_DIR="/home/appuser/hangouttourist/backups"
mkdir -p $BACKUP_DIR

# Backup MongoDB (if self-hosted)
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/mongodb-$(date +%Y%m%d-%H%M%S)"

# Backup Redis
redis-cli --rdb $BACKUP_DIR/redis-$(date +%Y%m%d-%H%M%S).rdb

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;

echo "Backup completed at $(date)" >> /var/log/backups.log
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/backup-db.sh
```

Add to crontab:

```bash
sudo crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * /usr/local/bin/backup-db.sh
```

### 10.2 Upload to Cloud Storage

```bash
# Install AWS CLI or use similar tool
apt install -y awscli

# Configure
aws configure

# Script to upload backups
sudo nano /usr/local/bin/upload-backups.sh
```

---

## 🚨 Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs hangouttourist-api

# Check Node.js errors
node /home/appuser/hangouttourist/backend/server.js

# Check .env file
cat /home/appuser/hangouttourist/backend/.env.production
```

### Redis Connection Failed

```bash
# Check Redis is running
systemctl status redis-server

# Test connection
redis-cli ping

# Check password
redis-cli -a your-password ping
```

### Nginx Not Proxying Correctly

```bash
# Check Nginx config
sudo nginx -t

# View Nginx error log
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### High Memory Usage

```bash
# Check PM2 memory
pm2 monit

# Increase PM2 max memory restart
# Edit ecosystem.config.js and update max_memory_restart

# Restart
pm2 restart hangouttourist-api
```

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] VPS created and configured
- [ ] SSH access verified
- [ ] Firewall configured
- [ ] Domain DNS pointing to VPS
- [ ] SSL certificate obtained

### Setup

- [ ] Node.js installed
- [ ] PM2 installed
- [ ] Redis installed/configured
- [ ] Application cloned
- [ ] Dependencies installed
- [ ] .env.production created with all values

### Configuration

- [ ] Nginx configured
- [ ] SSL certificate linked
- [ ] PM2 ecosystem config created
- [ ] Log rotation configured
- [ ] Backups configured

### Testing

- [ ] Frontend loads (https://your-domain.com)
- [ ] Backend responds (api.your-domain.com/api/auth/health)
- [ ] Payment system works
- [ ] Email sends
- [ ] Redis connected
- [ ] SSL certificate valid

### Post-Deployment

- [ ] Monitoring enabled
- [ ] Alerts configured
- [ ] Backups running
- [ ] Team notified
- [ ] Documentation updated

---

## 🔐 Security Hardening (Optional but Recommended)

### Additional Security Steps

```bash
# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Change SSH port (optional)
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

# Restart SSH
sudo systemctl restart ssh

# Fail2Ban for brute force protection
sudo apt install -y fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

---

## 🎯 Production Checklist Summary

✅ VPS setup & security  
✅ Node.js & dependencies  
✅ Redis configured  
✅ Application deployed  
✅ SSL certificate  
✅ Nginx reverse proxy  
✅ PM2 process manager  
✅ Monitoring active  
✅ Backups scheduled  
✅ All tests passing

---

## 📞 Quick Commands Reference

```bash
# View application status
pm2 status

# Restart application
pm2 restart hangouttourist-api

# View logs
pm2 logs hangouttourist-api

# Monitor resources
pm2 monit

# Check nginx status
sudo systemctl status nginx

# View SSL cert expiry
sudo certbot certificates

# Check Redis
redis-cli ping

# System resources
top
df -h
```

---

## ⏰ Estimated Timeline

- Pre-deployment: 30 min
- VPS setup: 30 min
- Node.js & Redis: 20 min
- Application setup: 20 min
- SSL & Nginx: 20 min
- Start app & test: 30 min
- **Total: ~2.5 hours**

---

**Last Updated:** 2026-06-03  
**Status:** Ready for VPS Deployment
