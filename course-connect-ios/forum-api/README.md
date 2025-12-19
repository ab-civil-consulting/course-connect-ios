# Forum API Service

A production-ready forum backend service for PeerTube instances, built with Node.js, Express, TypeScript, and PostgreSQL.

## Features

- 📝 Forum categories, threads, and posts
- 🔍 Search functionality
- 👥 User management
- 🔐 Admin category management
- 🐳 Docker support for easy deployment
- 📊 PostgreSQL database with migrations
- 🚀 Production-ready with error handling and logging

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 16
- **Deployment**: Docker & Docker Compose

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or use Docker)
- npm or yarn

### Setup

1. **Clone and install dependencies**:

   ```bash
   cd forum-api
   npm install
   ```

2. **Create environment file**:

   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables** in `.env`:

   ```env
   PORT=3001
   NODE_ENV=development

   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=forum
   DB_USER=postgres
   DB_PASSWORD=your_password

   ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006
   ```

4. **Start PostgreSQL** (if not using Docker):

   ```bash
   # Using Docker for PostgreSQL only:
   docker run -d \\
     --name forum-postgres \\
     -e POSTGRES_DB=forum \\
     -e POSTGRES_PASSWORD=your_password \\
     -p 5432:5432 \\
     postgres:16-alpine
   ```

5. **Run database migrations**:

   ```bash
   npm run migrate
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```

Server will be running at `http://localhost:3001`

## Production Deployment (Hetzner)

### Option 1: Docker Compose (Recommended)

This is the easiest way to deploy - includes both the API and PostgreSQL database.

1. **SSH into your Hetzner server**:

   ```bash
   ssh root@your-server-ip
   ```

2. **Install Docker and Docker Compose** (if not already installed):

   ```bash
   # Update package list
   apt update

   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh

   # Install Docker Compose
   apt install docker-compose-plugin
   ```

3. **Create project directory**:

   ```bash
   mkdir -p /opt/forum-api
   cd /opt/forum-api
   ```

4. **Copy your code** to the server:

   ```bash
   # From your local machine:
   scp -r /path/to/forum-api/* root@your-server-ip:/opt/forum-api/
   ```

5. **Create production `.env` file**:

   ```bash
   cat > .env <<EOF
   PORT=3001
   NODE_ENV=production
   DB_NAME=forum
   DB_USER=forum_user
   DB_PASSWORD=$(openssl rand -base64 32)
   ALLOWED_ORIGINS=https://your-domain.com,https://course-connect.ab-civil.com
   EOF
   ```

6. **Build and start services**:

   ```bash
   docker-compose up -d --build
   ```

7. **Run database migrations**:

   ```bash
   docker exec -it forum-api npm run migrate
   ```

8. **Verify it's running**:
   ```bash
   curl http://localhost:3001/health
   ```

### Option 2: Standalone Deployment (Using Existing PostgreSQL)

If you already have PostgreSQL running on your server (e.g., for PeerTube):

1. **Create forum database**:

   ```bash
   sudo -u postgres psql
   CREATE DATABASE forum;
   CREATE USER forum_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE forum TO forum_user;
   \\q
   ```

2. **Install Node.js 20+**:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs
   ```

3. **Deploy the application**:

   ```bash
   cd /opt/forum-api
   npm ci --production
   npm run build
   ```

4. **Create `.env` file** (same as above)

5. **Run migrations**:

   ```bash
   npm run migrate
   ```

6. **Create systemd service**:

   ```bash
   cat > /etc/systemd/system/forum-api.service <<EOF
   [Unit]
   Description=Forum API Service
   After=network.target postgresql.service

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/opt/forum-api
   Environment="NODE_ENV=production"
   EnvironmentFile=/opt/forum-api/.env
   ExecStart=/usr/bin/node /opt/forum-api/dist/index.js
   Restart=on-failure
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   EOF
   ```

7. **Start the service**:
   ```bash
   systemctl enable forum-api
   systemctl start forum-api
   systemctl status forum-api
   ```

### Nginx Configuration

Add this to your Nginx config to proxy requests to the forum API:

```nginx
# Forum API upstream
upstream forum_api {
    server localhost:3001;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # ... existing SSL configuration ...

    # Forum API endpoints
    location /api/v1/forum {
        proxy_pass http://forum_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Reload Nginx:

```bash
nginx -t
systemctl reload nginx
```

## API Endpoints

### Categories

- `GET /api/v1/forum/categories` - List all categories
- `GET /api/v1/forum/categories/:id` - Get category by ID
- `POST /api/v1/forum/categories` - Create category (admin)
- `PATCH /api/v1/forum/categories/:id` - Update category (admin)
- `DELETE /api/v1/forum/categories/:id` - Delete category (admin)

### Threads

- `GET /api/v1/forum/categories/:categoryId/threads` - List threads in category
- `GET /api/v1/forum/threads/:id` - Get thread by ID
- `POST /api/v1/forum/threads` - Create new thread

### Posts

- `GET /api/v1/forum/threads/:threadId/posts` - List posts in thread
- `POST /api/v1/forum/posts` - Create new post

### Search

- `GET /api/v1/forum/search?query=...` - Search threads

## Managing Forum Categories

The default migration creates two categories:

- **Announcements** (slug: `announcements`)
- **General Discussion** (slug: `general`)

### Add New Categories

Using curl:

```bash
curl -X POST https://your-domain.com/api/v1/forum/categories \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Feature Requests",
    "description": "Suggest new features for the platform",
    "slug": "feature-requests",
    "icon": "lightbulb",
    "order": 3
  }'
```

Or directly in the database:

```sql
INSERT INTO forum_categories (id, name, description, slug, icon, "order", is_locked)
VALUES (
  'feature-requests',
  'Feature Requests',
  'Suggest new features for the platform',
  'feature-requests',
  'lightbulb',
  3,
  false
);
```

## Monitoring

### Check service status:

```bash
# Docker
docker-compose ps
docker-compose logs -f forum-api

# Systemd
systemctl status forum-api
journalctl -u forum-api -f
```

### Health check:

```bash
curl https://your-domain.com/api/v1/forum/categories
```

## Backup

### Database backup:

```bash
# Docker
docker exec forum-postgres pg_dump -U forum_user forum > forum_backup_$(date +%Y%m%d).sql

# Standalone
sudo -u postgres pg_dump forum > forum_backup_$(date +%Y%m%d).sql
```

### Restore:

```bash
# Docker
docker exec -i forum-postgres psql -U forum_user forum < forum_backup.sql

# Standalone
sudo -u postgres psql forum < forum_backup.sql
```

## Troubleshooting

### API not responding

```bash
# Check if service is running
systemctl status forum-api  # or docker-compose ps

# Check logs
journalctl -u forum-api -n 100  # or docker-compose logs forum-api

# Test database connection
docker exec forum-postgres psql -U forum_user -d forum -c "SELECT 1"
```

### Database connection errors

- Verify database credentials in `.env`
- Check if PostgreSQL is running
- Ensure database exists and user has permissions

### CORS errors

- Add your domain to `ALLOWED_ORIGINS` in `.env`
- Restart the service after changes

## Security Notes

- Change default database password
- Use strong passwords for production
- Keep `NODE_ENV=production` in production
- Use HTTPS/SSL certificates
- Regularly update dependencies
- Set up firewall rules to restrict database access
- Consider implementing authentication for write operations

## Support

For issues or questions, please open an issue in the repository.

## License

ISC
