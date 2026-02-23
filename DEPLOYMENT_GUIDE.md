# MindWave Deployment Guide for College Server

## Overview
This guide will help you deploy the MindWave platform to your college server. The application is a Node.js-based web application with MongoDB database.

## Prerequisites

### Server Requirements
- **Operating System**: Linux (Ubuntu 20.04+ recommended) or Windows Server
- **Node.js**: Version 16.x or higher
- **MongoDB**: Version 5.0 or higher
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 10GB free space
- **Network**: Static IP address or domain name

### Software to Install
1. Node.js and npm
2. MongoDB
3. PM2 (Process Manager for Node.js)
4. Nginx (Web Server/Reverse Proxy)
5. Git

---

## Step 1: Server Setup

### For Ubuntu/Linux Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18.x LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

### For Windows Server

1. Download and install Node.js from: https://nodejs.org/
2. Download and install MongoDB from: https://www.mongodb.com/try/download/community
3. Install PM2: `npm install -g pm2-windows-service` then `npm install -g pm2`
4. Install IIS or use Node.js directly

---

## Step 2: Clone and Setup Application

```bash
# Navigate to web directory
cd /var/www  # Linux
# or
cd C:\inetpub\wwwroot  # Windows

# Clone the repository
git clone https://github.com/YOUR_USERNAME/mindwave2.git
cd mindwave2

# Install dependencies
npm install
```

---

## Step 3: Environment Configuration

Create a `.env` file in the project root:

```bash
# Copy example env file
cp .env.example .env

# Edit the .env file
nano .env  # Linux
# or
notepad .env  # Windows
```

### Required Environment Variables

```env
# Server Configuration
PORT=8081
NODE_ENV=production

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/mindwave

# JWT Secret (Generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google OAuth (for Google Classroom integration)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-college-domain.edu/auth/google/callback

# Google Gemini API (for AI features)
GEMINI_API_KEY=your-gemini-api-key

# Hugging Face API (for chatbot)
HUGGINGFACE_API_KEY=your-huggingface-api-key

# Session Secret
SESSION_SECRET=your-session-secret-change-this

# Email Configuration (optional, for notifications)
SMTP_HOST=smtp.your-college.edu
SMTP_PORT=587
SMTP_USER=noreply@your-college.edu
SMTP_PASS=your-email-password

# College Domain
COLLEGE_DOMAIN=your-college.edu
```

---

## Step 4: Database Setup

```bash
# Connect to MongoDB
mongosh

# Create database and admin user
use mindwave
db.createUser({
  user: "mindwave_admin",
  pwd: "secure_password_here",
  roles: [{ role: "readWrite", db: "mindwave" }]
})

# Exit MongoDB shell
exit
```

Update MongoDB URI in `.env`:
```env
MONGODB_URI=mongodb://mindwave_admin:secure_password_here@localhost:27017/mindwave
```

---

## Step 5: Application Configuration

### Update API Base URLs

If your server has a specific domain, update the following files:

**In all JavaScript files that use `API_BASE`:**
```javascript
// Change from:
const API_BASE = window.location.origin;

// To (if needed):
const API_BASE = 'https://mindwave.your-college.edu';
```

### Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Classroom API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://your-domain.edu/auth/google/callback`
6. Copy Client ID and Secret to `.env`

---

## Step 6: Build and Start Application

```bash
# Install production dependencies only
npm install --production

# Start with PM2
pm2 start server.js --name mindwave

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command it outputs
```

### PM2 Useful Commands
```bash
pm2 status          # Check application status
pm2 logs mindwave   # View logs
pm2 restart mindwave # Restart application
pm2 stop mindwave   # Stop application
pm2 delete mindwave # Remove from PM2
```

---

## Step 7: Nginx Configuration (Linux)

Create Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/mindwave
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name mindwave.your-college.edu;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mindwave.your-college.edu;

    # SSL Certificate (use your college's SSL certificate)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:;" always;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:8081;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # File upload size limit
    client_max_body_size 50M;

    # Logging
    access_log /var/log/nginx/mindwave_access.log;
    error_log /var/log/nginx/mindwave_error.log;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/mindwave /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

---

## Step 8: SSL Certificate Setup

### Option 1: Use College's Existing SSL Certificate
Contact your college IT department for SSL certificate files.

### Option 2: Let's Encrypt (Free SSL)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mindwave.your-college.edu
```

---

## Step 9: Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## Step 10: Database Backup Setup

Create a backup script:

```bash
sudo nano /usr/local/bin/backup-mindwave.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mindwave"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mongodump --db mindwave --out $BACKUP_DIR/backup_$DATE
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

Make executable and schedule:
```bash
sudo chmod +x /usr/local/bin/backup-mindwave.sh
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-mindwave.sh
```

---

## Step 11: Monitoring and Logging

### Setup Log Rotation
```bash
sudo nano /etc/logrotate.d/mindwave
```

Add:
```
/var/log/nginx/mindwave_*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

### Monitor with PM2
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Step 12: Testing Deployment

1. **Check Application Status**
   ```bash
   pm2 status
   curl http://localhost:8081
   ```

2. **Test Database Connection**
   ```bash
   mongosh mindwave
   db.stats()
   ```

3. **Test Web Access**
   - Open browser: `https://mindwave.your-college.edu`
   - Try logging in
   - Test all features

4. **Check Logs**
   ```bash
   pm2 logs mindwave
   sudo tail -f /var/log/nginx/mindwave_error.log
   ```

---

## Updating the Application

```bash
cd /var/www/mindwave2
git pull origin main
npm install --production
pm2 restart mindwave
```

---

## Troubleshooting

### Application won't start
```bash
pm2 logs mindwave --lines 100
# Check for errors in environment variables or dependencies
```

### Database connection issues
```bash
sudo systemctl status mongod
mongosh  # Test connection
```

### Nginx errors
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Port already in use
```bash
sudo lsof -i :8081
# Kill the process or change PORT in .env
```

---

## Security Best Practices

1. **Change all default passwords**
2. **Use strong JWT_SECRET and SESSION_SECRET**
3. **Enable firewall (ufw)**
4. **Keep system updated**: `sudo apt update && sudo apt upgrade`
5. **Regular backups**
6. **Monitor logs regularly**
7. **Use HTTPS only**
8. **Restrict MongoDB access** to localhost only
9. **Set up fail2ban** for brute force protection
10. **Regular security audits**

---

## Support and Maintenance

### Regular Maintenance Tasks
- Daily: Check application logs
- Weekly: Review database backups
- Monthly: Update dependencies (`npm update`)
- Quarterly: Security audit and updates

### Getting Help
- Check logs: `pm2 logs mindwave`
- MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`
- Nginx logs: `sudo tail -f /var/log/nginx/mindwave_error.log`

---

## Contact Your College IT Department

Before deployment, coordinate with your college IT team for:
1. Server access and credentials
2. Domain name setup (DNS configuration)
3. SSL certificate
4. Firewall rules
5. Email server configuration (SMTP)
6. Google Workspace admin access (for Google Classroom integration)

---

## Conclusion

Your MindWave platform should now be successfully deployed on your college server! Make sure to test all features thoroughly and monitor the application regularly.

For any issues or questions, refer to the troubleshooting section or check the application logs.
