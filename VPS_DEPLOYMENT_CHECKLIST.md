# 🚀 VPS Deployment Quick Checklist

Fast reference for deploying to VPS (Ubuntu/Debian)

---

## 📋 Pre-Deployment (Do Before Starting)

- [ ] VPS with Ubuntu 22.04 (minimum 2GB RAM)
- [ ] SSH access credentials
- [ ] Domain name registered
- [ ] DNS updated to point to VPS IP
- [ ] SSLCommerz production account
- [ ] MongoDB connection string (Atlas recommended)
- [ ] Redis instance (or will install locally)
- [ ] AWS SES verified domain

---

## 🖥️ VPS Setup (1 hour)

### System Setup

```bash
ssh root@your-vps-ip
apt update && apt upgrade -y
apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx ufw

# Firewall
ufw enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw status
```

### Create App User

```bash
adduser appuser --disabled-password
usermod -aG sudo appuser
su - appuser
```

### Install Node.js & PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
pm2 startup
```

### Install Redis (if self-hosted)

```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
redis-cli ping  # Should return PONG
```

---

## 📁 Deploy Application (30 min)

### Clone & Install

```bash
cd /home/appuser
git clone https://github.com/your-repo/hangouttourist.git
cd hangouttourist/backend
npm install
```

### Create .env.production

```bash
nano .env.production
```

**Copy this template and fill in your values:**

```env
NODE_ENV=production
PORT=5001

JWT_SECRET=YOUR-SECRET-KEY-HERE
MONGODB_URI=YOUR-MONGODB-URI
DB_NAME=hangouttourist
CLIENT_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com

SSLCOMMERZ_STORE_ID=YOUR-STORE-ID
SSLCOMMERZ_STORE_PASSWORD=YOUR-PASSWORD
SSLCOMMERZ_CALLBACK_SECRET=YOUR-SECRET
SSLCOMMERZ_IPS=209.58.135.132,209.58.135.133

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR-KEY
AWS_SECRET_ACCESS_KEY=YOUR-SECRET
AWS_SES_FROM_EMAIL=noreply@your-domain.com

REDIS_URL=redis://default:PASSWORD@localhost:6379
```

---

## 🔒 SSL Certificate (15 min)

### Get Certificate

```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d api.your-domain.com \
  --agree-tos \
  -m your-email@domain.com
```

### Verify

```bash
sudo certbot certificates
```

---

## 🌐 Nginx Configuration (15 min)

### Create Config

```bash
sudo nano /etc/nginx/sites-available/hangouttourist
```

**Copy from:** [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md#61-create-nginx-config)
(Replace `your-domain.com` with your actual domain)

### Enable & Start

```bash
sudo nginx -t
sudo ln -s /etc/nginx/sites-available/hangouttourist /etc/nginx/sites-enabled/
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 🚀 Start Application (10 min)

### Create PM2 Config

```bash
cd /home/appuser/hangouttourist/backend
nano ecosystem.config.js
```

**Copy from:** [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md#71-create-pm2-ecosystem-config)

### Create Logs Directory

```bash
mkdir -p /home/appuser/hangouttourist/logs
chmod 755 /home/appuser/hangouttourist/logs
```

### Start App

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Run the command it outputs
```

### Verify

```bash
pm2 status
pm2 logs
curl http://localhost:5001/api/auth/health
```

---

## ✅ Testing (30 min)

### Frontend

- [ ] Open https://your-domain.com
- [ ] Check for errors (no mixed content warnings)

### Backend

- [ ] Test: `curl https://api.your-domain.com/api/auth/health`
- [ ] Should return: `{"message":"Health check passed"}`

### Payment System

- [ ] Create account
- [ ] Verify email
- [ ] Test payment (SSLCommerz sandbox)

### Check Logs

```bash
pm2 logs
# Should see: ✅ Connected to MongoDB
#             ✅ Redis configured
```

### SSL Certificate

- [ ] Browser shows green lock icon
- [ ] No SSL warnings

---

## 🔄 Ongoing Maintenance

### Daily

```bash
pm2 monit              # Monitor resources
pm2 logs               # Check for errors
```

### Weekly

```bash
sudo certbot renew --dry-run  # Test auto-renewal
redis-cli info memory         # Check Redis usage
df -h                         # Check disk space
```

### Monthly

- [ ] Review logs for errors
- [ ] Update dependencies: `npm update`
- [ ] Check SSL cert expiry: `sudo certbot certificates`

---

## 🆘 Troubleshooting

### App won't start

```bash
pm2 logs hangouttourist-api
node /home/appuser/hangouttourist/backend/server.js
cat /home/appuser/hangouttourist/backend/.env.production
```

### Redis not connecting

```bash
redis-cli ping
systemctl status redis-server
```

### Nginx not working

```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Check what's running

```bash
pm2 status                    # PM2 apps
netstat -tlnp | grep 5001    # Node.js port
netstat -tlnp | grep 6379    # Redis port
netstat -tlnp | grep 80      # Nginx HTTP
netstat -tlnp | grep 443     # Nginx HTTPS
```

---

## 🔑 Generate Secure Keys

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate SSLCOMMERZ_CALLBACK_SECRET
openssl rand -base64 32

# Generate Redis password
openssl rand -base64 32
```

---

## 📊 Quick Monitoring

```bash
# All in one command (run in terminal)
watch -n 5 'pm2 monit; echo "---"; redis-cli info memory; echo "---"; df -h'

# Or separately:
pm2 monit
redis-cli info memory
df -h
top
```

---

## 📋 Complete Command Summary

```bash
# SSH to VPS
ssh root@your-vps-ip

# Switch to app user
su - appuser

# Navigate to app
cd /home/appuser/hangouttourist/backend

# View logs
pm2 logs

# Restart app
pm2 restart hangouttourist-api

# Stop app
pm2 stop hangouttourist-api

# Start app
pm2 start ecosystem.config.js --env production

# Restart Nginx
sudo systemctl restart nginx

# Check SSL cert
sudo certbot certificates

# Test backend
curl https://api.your-domain.com/api/auth/health

# Redis ping
redis-cli ping

# System status
pm2 status
```

---

## ✨ Final Checklist

- [ ] VPS setup complete
- [ ] Node.js installed
- [ ] PM2 installed
- [ ] Redis running
- [ ] Application cloned & installed
- [ ] .env.production configured
- [ ] SSL certificate obtained
- [ ] Nginx configured
- [ ] Application started with PM2
- [ ] Frontend loads (https://your-domain.com)
- [ ] Backend responds (api.your-domain.com/api/auth/health)
- [ ] Payment system works
- [ ] Logs showing no errors
- [ ] Backups configured
- [ ] Team notified

---

## 🎯 Estimated Time

- VPS Setup: 1 hour
- Application Deploy: 30 min
- SSL Setup: 15 min
- Nginx Config: 15 min
- Start & Test: 30 min
- **Total: ~2.5 hours**

---

## 📞 Need Help?

Refer to detailed guide: [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md)

---

**Last Updated:** 2026-06-03  
**Status:** Ready for VPS ✅
