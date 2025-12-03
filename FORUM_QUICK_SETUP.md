# Forum Backend - Quick Setup Reference

**For server administrator** | Time: 30 minutes | Difficulty: Easy

---

## 1. Install Docker (if needed)

```bash
apt update
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose-plugin -y
```

---

## 2. Upload Code to Server

```bash
# On server:
mkdir -p /opt/forum-api

# From your computer:
scp -r C:\Dev\course-connect-ios\forum-api\* root@YOUR_SERVER_IP:/opt/forum-api/
```

---

## 3. Create Configuration

```bash
cd /opt/forum-api
cat > .env <<EOF
PORT=3001
NODE_ENV=production
DB_NAME=forum
DB_USER=forum_user
DB_PASSWORD=$(openssl rand -base64 32)
ALLOWED_ORIGINS=https://YOUR-DOMAIN.com
JWT_SECRET=$(openssl rand -base64 32)
EOF
```

**⚠️ Edit .env and replace YOUR-DOMAIN.com with your actual domain!**

```bash
nano .env
```

---

## 4. Start Services

```bash
cd /opt/forum-api
docker compose up -d --build
```

Wait 60 seconds, then:

```bash
docker exec forum-api npm run migrate
```

---

## 5. Verify It Works

```bash
docker compose ps                                    # Both should be "running"
curl http://localhost:3001/health                   # Should return {"status":"ok"}
curl http://localhost:3001/api/v1/forum/categories  # Should return JSON with categories
```

---

## 6. Configure Nginx

```bash
nano /etc/nginx/sites-available/peertube
```

Add this **inside** the `server { ... listen 443 ssl ... }` block:

```nginx
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
    }
```

Test and reload:

```bash
nginx -t
systemctl reload nginx
```

---

## 7. Test From Internet

```bash
curl https://YOUR-DOMAIN.com/api/v1/forum/categories
```

Should return JSON with "Announcements" and "General Discussion".

---

## ✅ Done!

Open the mobile app → Sidebar → Forum

You should see the forum categories!

---

## Quick Commands

| Action | Command |
|--------|---------|
| View logs | `cd /opt/forum-api && docker compose logs -f forum-api` |
| Restart | `cd /opt/forum-api && docker compose restart` |
| Stop | `cd /opt/forum-api && docker compose stop` |
| Start | `cd /opt/forum-api && docker compose up -d` |
| Backup DB | `docker exec forum-postgres pg_dump -U forum_user forum > backup_$(date +%Y%m%d).sql` |
| Update code | `cd /opt/forum-api && docker compose down && docker compose up -d --build` |

---

## Troubleshooting

**"No categories available" in app:**
```bash
# Check if running:
docker compose ps

# Check logs:
docker compose logs forum-api

# Test locally:
curl http://localhost:3001/api/v1/forum/categories

# Test from internet:
curl https://YOUR-DOMAIN.com/api/v1/forum/categories
```

**Can't connect to database:**
```bash
# Check .env file password matches
cat .env | grep DB_PASSWORD

# Test database connection:
docker exec forum-postgres psql -U forum_user -d forum -c "SELECT 1"
```

**CORS errors:**
```bash
# Edit .env and fix ALLOWED_ORIGINS
nano .env
# Then restart:
docker compose restart forum-api
```

---

**For detailed instructions, see `FORUM_SERVER_SETUP.md`**
