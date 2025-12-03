# Forum Backend Server Setup Guide

**For:** Server Administrator
**Purpose:** Deploy the forum API backend for MC Assist mobile app
**Time Required:** 30-45 minutes

---

## What You're Setting Up

The MC Assist app needs a forum backend service to enable discussion features. This guide will help you:
- Install required software (Docker)
- Deploy a forum API service
- Set up a PostgreSQL database
- Configure your web server to route forum requests

---

## Prerequisites Checklist

Before starting, make sure you have:

- [ ] Access to the server where PeerTube is hosted (SSH access)
- [ ] Root or sudo privileges on the server
- [ ] Your PeerTube domain name (e.g., `course-connect.ab-civil.com`)
- [ ] 30-45 minutes of time

---

## Step 1: Connect to Your Server

Open your terminal or SSH client and connect to your server:

```bash
ssh root@YOUR_SERVER_IP
```

Replace `YOUR_SERVER_IP` with your actual server IP address.

---

## Step 2: Install Docker (if not already installed)

Check if Docker is installed:

```bash
docker --version
```

If you see a version number, skip to Step 3. Otherwise, install Docker:

```bash
# Update package list
apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

---

## Step 3: Create Project Directory

Create a directory for the forum API:

```bash
mkdir -p /opt/forum-api
cd /opt/forum-api
```

---

## Step 4: Upload Forum Code to Server

**From your local machine** (where the code is), open a new terminal and run:

```bash
# Replace YOUR_SERVER_IP with your actual server IP
scp -r C:\Dev\course-connect-ios\forum-api\* root@YOUR_SERVER_IP:/opt/forum-api/
```

Or if you have the code in a Git repository:

```bash
cd /opt/forum-api
git clone YOUR_REPOSITORY_URL .
```

---

## Step 5: Create Configuration File

This file contains all the settings for your forum.

```bash
cd /opt/forum-api

# Create the .env file
cat > .env <<'EOF'
# Server Configuration
PORT=3001
NODE_ENV=production

# Database Configuration
DB_NAME=forum
DB_USER=forum_user
DB_PASSWORD=REPLACE_WITH_SECURE_PASSWORD

# CORS - IMPORTANT: Replace with your actual domain
ALLOWED_ORIGINS=https://your-domain.com

# Security (for future features)
JWT_SECRET=REPLACE_WITH_RANDOM_SECRET
EOF
```

**IMPORTANT: Edit the .env file now:**

```bash
nano .env
```

Replace these values:
1. `REPLACE_WITH_SECURE_PASSWORD` - Create a strong password for the database
2. `https://your-domain.com` - Your actual PeerTube domain (e.g., `https://course-connect.ab-civil.com`)
3. `REPLACE_WITH_RANDOM_SECRET` - Any random string (or use the command below)

**To generate secure random values:**

```bash
# Generate database password
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 32
```

Copy the generated values into your .env file.

Press `Ctrl+X`, then `Y`, then `Enter` to save.

---

## Step 6: Start the Forum Services

This command will:
- Download PostgreSQL database
- Build the forum API
- Start both services

```bash
cd /opt/forum-api
docker compose up -d --build
```

Wait 30-60 seconds for everything to start.

---

## Step 7: Create Database Tables

Run this command to set up the database structure:

```bash
docker exec forum-api npm run migrate
```

You should see:
- "Migration completed successfully"
- "Created 2 default categories"

---

## Step 8: Verify Everything is Working

Check that services are running:

```bash
# Check container status (should show both running)
docker compose ps

# Test the API
curl http://localhost:3001/health

# Check forum categories
curl http://localhost:3001/api/v1/forum/categories
```

You should see JSON data with "Announcements" and "General Discussion" categories.

If you see errors, skip to the Troubleshooting section below.

---

## Step 9: Configure Nginx (Web Server)

You need to tell your web server to route forum requests to the forum API.

### Find Your Nginx Configuration

Your PeerTube Nginx config is likely in one of these locations:

```bash
# Check these locations:
ls /etc/nginx/sites-available/
ls /etc/nginx/conf.d/
```

Look for a file named `peertube`, `default`, or your domain name.

### Edit the Configuration

```bash
# Replace 'peertube' with your actual config file name
nano /etc/nginx/sites-available/peertube
```

### Add This Configuration

Find the `server` block for your HTTPS site (the one with `listen 443 ssl`).

**Add this section BEFORE the closing `}` of the server block:**

```nginx
    # Forum API Proxy Configuration
    location /api/v1/forum {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for forum operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
```

Save the file: `Ctrl+X`, then `Y`, then `Enter`

### Test and Reload Nginx

```bash
# Test configuration (should show "successful")
nginx -t

# If test passed, reload Nginx
systemctl reload nginx
```

---

## Step 10: Test From the Internet

From any computer (or your phone), test the forum API:

```bash
# Replace YOUR_DOMAIN with your actual domain
curl https://YOUR_DOMAIN/api/v1/forum/categories
```

You should see the forum categories in JSON format.

---

## Step 11: Test in the Mobile App

1. Open the MC Assist mobile app
2. Connect to your PeerTube instance
3. Open the sidebar/menu
4. Click on "Forum" (with the menu icon ≡)
5. You should see "Announcements" and "General Discussion" categories

**Success!** Your forum is now live.

---

## Managing the Forum Service

### View Logs

```bash
cd /opt/forum-api

# View recent logs
docker compose logs forum-api

# Follow logs in real-time
docker compose logs -f forum-api
```

### Restart the Service

```bash
cd /opt/forum-api
docker compose restart forum-api
```

### Stop the Service

```bash
cd /opt/forum-api
docker compose stop
```

### Start the Service

```bash
cd /opt/forum-api
docker compose up -d
```

### Update the Service (after code changes)

```bash
cd /opt/forum-api
docker compose down
docker compose up -d --build
```

---

## Database Backup

### Create a Backup

```bash
# Create backup folder
mkdir -p /opt/forum-backups

# Create backup (creates a file with today's date)
docker exec forum-postgres pg_dump -U forum_user forum > /opt/forum-backups/forum_backup_$(date +%Y%m%d).sql

# Verify backup was created
ls -lh /opt/forum-backups/
```

### Restore from Backup

```bash
# Stop the API first
cd /opt/forum-api
docker compose stop forum-api

# Restore database
docker exec -i forum-postgres psql -U forum_user forum < /opt/forum-backups/forum_backup_20250114.sql

# Start the API
docker compose start forum-api
```

### Automated Daily Backups

Add this to your crontab:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * docker exec forum-postgres pg_dump -U forum_user forum > /opt/forum-backups/forum_backup_$(date +\%Y\%m\%d).sql
```

---

## Troubleshooting

### Forum API Won't Start

**Check container status:**
```bash
cd /opt/forum-api
docker compose ps
```

**View error logs:**
```bash
docker compose logs forum-api
```

**Common fixes:**
```bash
# Restart everything
docker compose restart

# Rebuild from scratch
docker compose down
docker compose up -d --build
```

### Database Connection Errors

**Check database is running:**
```bash
docker compose ps
```

**Test database connection:**
```bash
docker exec forum-postgres psql -U forum_user -d forum -c "SELECT 1"
```

**Check .env file has correct password:**
```bash
cat /opt/forum-api/.env | grep DB_PASSWORD
```

### "No Forum Categories Available" in App

**Test API from server:**
```bash
curl http://localhost:3001/api/v1/forum/categories
```

**Test API from internet:**
```bash
curl https://YOUR_DOMAIN/api/v1/forum/categories
```

**If localhost works but domain doesn't:**
- Check Nginx configuration (Step 9)
- Make sure you ran `nginx -t` and `systemctl reload nginx`

**If neither work:**
- Check forum API logs: `docker compose logs forum-api`
- Verify migration ran: `docker exec forum-api npm run migrate`

### CORS Errors in App

The app can't connect due to security restrictions.

**Fix:**
1. Edit .env file: `nano /opt/forum-api/.env`
2. Make sure `ALLOWED_ORIGINS` has your correct domain
3. Restart: `docker compose restart forum-api`

### Migration Errors

**If migration fails:**

```bash
# Check database is accessible
docker exec forum-postgres psql -U forum_user -d forum -c "SELECT version();"

# Try migration again
docker exec forum-api npm run migrate

# If still failing, check logs
docker compose logs postgres
```

---

## Security Checklist

After setup, verify:

- [ ] Database password is strong (not "password123")
- [ ] `.env` file is not publicly accessible
- [ ] CORS is set to your actual domain (not `*`)
- [ ] Nginx is using HTTPS (SSL certificates)
- [ ] Firewall blocks direct access to port 3001
- [ ] Regular backups are scheduled

---

## Firewall Configuration (Recommended)

Your forum API should NOT be accessible directly from the internet. Only Nginx should access it.

```bash
# Allow only localhost to access port 3001
ufw deny 3001/tcp
ufw allow from 127.0.0.1 to any port 3001

# Verify firewall rules
ufw status
```

---

## Common Commands Reference

| Task | Command |
|------|---------|
| View logs | `cd /opt/forum-api && docker compose logs forum-api` |
| Restart service | `cd /opt/forum-api && docker compose restart forum-api` |
| Check status | `cd /opt/forum-api && docker compose ps` |
| Create backup | `docker exec forum-postgres pg_dump -U forum_user forum > backup.sql` |
| Update code | `cd /opt/forum-api && docker compose down && docker compose up -d --build` |
| Test API | `curl http://localhost:3001/health` |
| View database | `docker exec -it forum-postgres psql -U forum_user forum` |

---

## Getting Help

If you encounter issues:

1. **Check logs first:**
   ```bash
   cd /opt/forum-api
   docker compose logs forum-api
   docker compose logs postgres
   ```

2. **Check service status:**
   ```bash
   docker compose ps
   systemctl status nginx
   ```

3. **Common error messages:**
   - "Connection refused" → Service isn't running
   - "Database connection error" → Check .env password
   - "CORS error" → Check ALLOWED_ORIGINS in .env
   - "502 Bad Gateway" → Forum API isn't responding (check logs)

4. **Collect this information for support:**
   - Error message from logs
   - Output of `docker compose ps`
   - Contents of .env (REMOVE passwords first!)
   - Nginx configuration

---

## What's Running After Setup

After completing this guide, you'll have:

1. **PostgreSQL Database** (Container: `forum-postgres`)
   - Running on port 5432 (internal only)
   - Stores all forum data
   - Persistent storage in Docker volume

2. **Forum API Service** (Container: `forum-api`)
   - Running on port 3001 (internal only)
   - Handles all forum operations
   - Accessible via Nginx at `/api/v1/forum`

3. **Nginx Configuration**
   - Routes `https://YOUR_DOMAIN/api/v1/forum/*` to forum API
   - Handles SSL/TLS encryption

---

## Adding Custom Forum Categories

After setup, you can add more categories by editing the database:

```bash
# Connect to database
docker exec -it forum-postgres psql -U forum_user forum

# Add a new category
INSERT INTO forum_categories (name, slug, description, position, is_visible)
VALUES ('Technical Support', 'tech-support', 'Get help with technical issues', 3, true);

# View all categories
SELECT * FROM forum_categories ORDER BY position;

# Exit database
\q
```

Or use a PostgreSQL GUI tool like pgAdmin to manage categories visually.

---

## Performance Monitoring

### Check Resource Usage

```bash
# Check Docker container resources
docker stats forum-api forum-postgres

# Check disk space
df -h

# Check database size
docker exec forum-postgres psql -U forum_user forum -c "SELECT pg_size_pretty(pg_database_size('forum'));"
```

### View Active Connections

```bash
docker exec forum-postgres psql -U forum_user forum -c "SELECT count(*) FROM pg_stat_activity WHERE datname='forum';"
```

---

## Updating to Future Versions

When updates are released:

```bash
# 1. Backup database first!
docker exec forum-postgres pg_dump -U forum_user forum > /opt/forum-backups/before_update_$(date +%Y%m%d).sql

# 2. Upload new code to server
# (Use scp or git pull)

# 3. Rebuild and restart
cd /opt/forum-api
docker compose down
docker compose up -d --build

# 4. Run any new migrations
docker exec forum-api npm run migrate

# 5. Verify it works
curl http://localhost:3001/health
```

---

**Setup Complete!** 🎉

Your forum is now running and accessible through the MC Assist mobile app. Users can create threads, post replies, and participate in discussions.

For questions or issues, contact your development team with the troubleshooting information listed above.
