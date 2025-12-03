# Push Notifications Implementation Plan
## MC Assist (Course Connect iOS) - Custom Backend Approach

**Timeline:** 2-3 days
**Last Updated:** 2025-11-11

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Backend Service Setup](#phase-1-backend-service-setup)
4. [Phase 2: Mobile App Integration](#phase-2-mobile-app-integration)
5. [Phase 3: Deployment](#phase-3-deployment)
6. [Phase 4: Testing](#phase-4-testing)
7. [Maintenance & Monitoring](#maintenance--monitoring)

---

## Architecture Overview

```
┌──────────────────┐
│  PeerTube Server │
│  (existing)      │
└────────┬─────────┘
         │ API calls every 1-5 min
         ▼
┌────────────────────────────────────────────┐
│  Notification Backend Service              │
│  (NEW - self-hosted on your server)        │
│                                            │
│  Components:                               │
│  1. PeerTube Poller (cron job)            │
│  2. Device Token Manager (SQLite DB)       │
│  3. Notification Processor                 │
│  4. Expo Push API Client                   │
│  5. REST API for mobile app                │
└────────┬───────────────────────────────────┘
         │ Send push via Expo Push API
         ▼
┌────────────────────────────────────────────┐
│  Expo Push Notification Service (FREE)     │
│  (Handles FCM/APNs routing)                │
└────────┬───────────────────────────────────┘
         │
         ├─────────────────┬─────────────────┐
         ▼                 ▼                 ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │ iOS     │      │ Android │      │ Web     │
    │ Device  │      │ Device  │      │ Browser │
    └─────────┘      └─────────┘      └─────────┘
    MC Assist App    MC Assist App    (optional)
```

### Data Flow

1. **User subscribes to channel** → App saves subscription to PeerTube
2. **Backend polls PeerTube** → Checks for new notifications every 1-5 minutes
3. **New notification found** → Backend looks up user's device tokens
4. **Send push notification** → Backend calls Expo Push API
5. **Expo routes to device** → FCM (Android) or APNs (iOS)
6. **User receives notification** → In MC Assist app
7. **User taps notification** → App navigates to video/comment/etc.

---

## Prerequisites

### 1. Server Requirements

- **OS:** Linux (Ubuntu 20.04+, Debian 11+) or Docker support
- **RAM:** Minimum 256MB, recommended 512MB
- **CPU:** 1 vCore (minimal load)
- **Storage:** 1GB (for code, database, logs)
- **Network:** Port 3000 (or custom) open for mobile app connections
- **SSL Certificate:** Required (Let's Encrypt recommended)

### 2. Software Dependencies

- **Node.js:** 18.x or 20.x LTS
- **npm:** 9.x or higher
- **PM2** (for process management) or Docker
- **SQLite3** (bundled, no separate install needed)

### 3. Accounts & Access

- **Expo Account:** Free account at expo.dev (for push service)
- **PeerTube Instance:** Admin access preferred (but not required)
- **Server SSH Access:** To deploy backend service

### 4. Development Tools

- **Git:** For version control
- **Code Editor:** VSCode recommended
- **Postman/Insomnia:** For API testing (optional)

---

## Phase 1: Backend Service Setup

**Duration:** 6-8 hours (Day 1)

### Step 1.1: Create Backend Service Directory Structure

```bash
# On your development machine
cd C:\Dev
mkdir mc-assist-notification-backend
cd mc-assist-notification-backend

# Initialize Node.js project
npm init -y
```

**Directory structure:**
```
mc-assist-notification-backend/
├── src/
│   ├── index.js                 # Main entry point
│   ├── config.js                # Configuration management
│   ├── database.js              # SQLite database setup
│   ├── peertube-poller.js       # PeerTube polling logic
│   ├── notification-processor.js # Process notifications
│   ├── push-sender.js           # Expo push integration
│   └── routes/
│       ├── devices.js           # Device registration endpoints
│       └── health.js            # Health check endpoint
├── database/
│   └── notifications.db         # SQLite database (auto-created)
├── logs/
│   └── .gitkeep
├── .env.example                 # Environment variables template
├── .env                         # Your actual config (git-ignored)
├── .gitignore
├── package.json
├── Dockerfile                   # Docker deployment
├── docker-compose.yml           # Docker Compose config
└── README.md
```

### Step 1.2: Install Dependencies

```bash
npm install express cors dotenv expo-server-sdk node-cron sqlite3 axios winston
npm install --save-dev nodemon
```

**Dependencies explained:**
- `express` - Web framework for REST API
- `cors` - Allow mobile app to call API
- `dotenv` - Environment variable management
- `expo-server-sdk` - Send push notifications via Expo
- `node-cron` - Schedule PeerTube polling
- `sqlite3` - Database for device tokens
- `axios` - HTTP client for PeerTube API
- `winston` - Logging framework
- `nodemon` - Auto-restart during development

### Step 1.3: Create Configuration File

**File:** `src/config.js`

```javascript
require('dotenv').config();

module.exports = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // PeerTube configuration
  peertubeInstances: process.env.PEERTUBE_INSTANCES.split(','), // Support multiple instances
  pollingIntervalMinutes: parseInt(process.env.POLLING_INTERVAL_MINUTES) || 2,

  // Database
  databasePath: process.env.DATABASE_PATH || './database/notifications.db',

  // Expo Push
  expoPushToken: process.env.EXPO_PUSH_TOKEN, // Optional, for higher rate limits

  // Security
  apiKey: process.env.API_KEY, // Shared secret with mobile app

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};
```

**File:** `.env.example`

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# PeerTube Instances (comma-separated)
PEERTUBE_INSTANCES=peertube.example.com,another-peertube.com

# Polling Configuration
POLLING_INTERVAL_MINUTES=2

# Database
DATABASE_PATH=./database/notifications.db

# Expo Push Service (optional, for higher rate limits)
# Get from: https://expo.dev/accounts/[account]/settings/access-tokens
EXPO_PUSH_TOKEN=

# Security
# Generate with: openssl rand -base64 32
API_KEY=your-secret-api-key-here

# Logging
LOG_LEVEL=info
```

### Step 1.4: Database Schema

**File:** `src/database.js`

```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./config');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.dirname(config.databasePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(config.databasePath);

// Initialize database schema
db.serialize(() => {
  // Device tokens table
  db.run(`
    CREATE TABLE IF NOT EXISTS device_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expo_push_token TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      peertube_instance TEXT NOT NULL,
      peertube_access_token TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index on user_id and instance for faster lookups
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_user_instance
    ON device_tokens(user_id, peertube_instance)
  `);

  // Notification tracking table (to avoid sending duplicates)
  db.run(`
    CREATE TABLE IF NOT EXISTS sent_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      peertube_instance TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(notification_id, user_id, peertube_instance)
    )
  `);

  // Create index for faster duplicate checks
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_notification_lookup
    ON sent_notifications(notification_id, user_id, peertube_instance)
  `);

  // User notification preferences
  db.run(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      peertube_instance TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      enabled BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, peertube_instance, notification_type)
    )
  `);
});

module.exports = db;
```

**Database Tables:**
1. **device_tokens** - Stores Expo push tokens with PeerTube credentials
2. **sent_notifications** - Tracks sent notifications to prevent duplicates
3. **notification_preferences** - User preferences for notification types

### Step 1.5: PeerTube Poller

**File:** `src/peertube-poller.js`

```javascript
const axios = require('axios');
const db = require('./database');
const logger = require('./logger');
const { processNotifications } = require('./notification-processor');

class PeerTubePoller {
  async pollAllUsers() {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT DISTINCT user_id, peertube_instance, peertube_access_token FROM device_tokens',
        async (err, users) => {
          if (err) {
            logger.error('Error fetching users from database:', err);
            return reject(err);
          }

          logger.info(`Polling notifications for ${users.length} users`);

          for (const user of users) {
            try {
              await this.pollUserNotifications(user);
            } catch (error) {
              logger.error(
                `Error polling notifications for user ${user.user_id} on ${user.peertube_instance}:`,
                error.message
              );
            }
          }

          resolve();
        }
      );
    });
  }

  async pollUserNotifications(user) {
    const { user_id, peertube_instance, peertube_access_token } = user;

    try {
      // Fetch notifications from PeerTube
      const response = await axios.get(
        `https://${peertube_instance}/api/v1/users/me/notifications`,
        {
          headers: {
            Authorization: `Bearer ${peertube_access_token}`,
          },
          params: {
            start: 0,
            count: 20, // Get last 20 notifications
            unread: true, // Only unread notifications
          },
        }
      );

      const notifications = response.data.data;

      if (notifications.length === 0) {
        logger.debug(`No new notifications for user ${user_id}`);
        return;
      }

      logger.info(
        `Found ${notifications.length} new notifications for user ${user_id}`
      );

      // Process each notification
      await processNotifications(notifications, user);
    } catch (error) {
      if (error.response?.status === 401) {
        logger.warn(
          `Invalid access token for user ${user_id} on ${peertube_instance}. Token may have expired.`
        );
        // Could implement token refresh here if PeerTube supports it
      } else {
        logger.error(
          `Error fetching notifications for ${user_id}:`,
          error.message
        );
      }
      throw error;
    }
  }
}

module.exports = new PeerTubePoller();
```

### Step 1.6: Notification Processor

**File:** `src/notification-processor.js`

```javascript
const db = require('./database');
const logger = require('./logger');
const { sendPushNotification } = require('./push-sender');

// Map PeerTube notification types to user-friendly messages
const NOTIFICATION_MESSAGES = {
  1: { title: 'New video from subscription', body: (n) => `${n.video.channel.displayName} uploaded: ${n.video.name}` },
  2: { title: 'New comment on your video', body: (n) => `${n.comment.account.displayName} commented on ${n.comment.video.name}` },
  3: { title: 'New abuse report', body: (n) => 'A new abuse report requires your attention' },
  4: { title: 'Video blacklisted', body: (n) => `Your video "${n.video.name}" was blacklisted` },
  5: { title: 'Video published', body: (n) => `Your video "${n.video.name}" is now published` },
  6: { title: 'Video import finished', body: (n) => `Import finished for "${n.video.name}"` },
  7: { title: 'New user registration', body: (n) => `New user registered: ${n.account.displayName}` },
  8: { title: 'New follower', body: (n) => `${n.actorFollow.follower.displayName} started following you` },
  9: { title: 'Mentioned in comment', body: (n) => `${n.comment.account.displayName} mentioned you` },
  12: { title: 'New instance follower', body: (n) => `${n.actorFollow.follower.host} is following your instance` },
  15: { title: 'Abuse state changed', body: (n) => 'An abuse report state was updated' },
  // Add more types as needed
};

async function processNotifications(notifications, user) {
  const { user_id, peertube_instance } = user;

  for (const notification of notifications) {
    try {
      // Check if we've already sent this notification
      const alreadySent = await checkIfSent(
        notification.id,
        user_id,
        peertube_instance
      );

      if (alreadySent) {
        logger.debug(`Notification ${notification.id} already sent to user ${user_id}`);
        continue;
      }

      // Check user preferences
      const shouldSend = await checkUserPreference(
        user_id,
        peertube_instance,
        notification.type
      );

      if (!shouldSend) {
        logger.debug(
          `User ${user_id} has disabled notifications of type ${notification.type}`
        );
        continue;
      }

      // Format notification message
      const message = formatNotification(notification);

      // Send push notification
      await sendPushNotification(user_id, peertube_instance, message, notification);

      // Mark as sent
      await markAsSent(notification.id, user_id, peertube_instance);

      logger.info(`Sent notification ${notification.id} to user ${user_id}`);
    } catch (error) {
      logger.error(
        `Error processing notification ${notification.id}:`,
        error.message
      );
    }
  }
}

function formatNotification(notification) {
  const template = NOTIFICATION_MESSAGES[notification.type];

  if (!template) {
    logger.warn(`Unknown notification type: ${notification.type}`);
    return {
      title: 'New notification',
      body: 'You have a new notification',
      data: notification,
    };
  }

  return {
    title: template.title,
    body: template.body(notification),
    data: {
      notificationId: notification.id,
      type: notification.type,
      videoUuid: notification.video?.uuid,
      commentId: notification.comment?.id,
      channelHandle: notification.video?.channel?.name,
    },
  };
}

function checkIfSent(notificationId, userId, instance) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM sent_notifications WHERE notification_id = ? AND user_id = ? AND peertube_instance = ?',
      [notificationId.toString(), userId, instance],
      (err, row) => {
        if (err) return reject(err);
        resolve(!!row);
      }
    );
  });
}

function checkUserPreference(userId, instance, notificationType) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT enabled FROM notification_preferences WHERE user_id = ? AND peertube_instance = ? AND notification_type = ?',
      [userId, instance, notificationType.toString()],
      (err, row) => {
        if (err) return reject(err);
        // If no preference set, default to enabled
        resolve(row ? row.enabled === 1 : true);
      }
    );
  });
}

function markAsSent(notificationId, userId, instance) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR IGNORE INTO sent_notifications (notification_id, user_id, peertube_instance) VALUES (?, ?, ?)',
      [notificationId.toString(), userId, instance],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

module.exports = { processNotifications };
```

### Step 1.7: Push Sender (Expo Integration)

**File:** `src/push-sender.js`

```javascript
const { Expo } = require('expo-server-sdk');
const db = require('./database');
const logger = require('./logger');
const config = require('./config');

// Create Expo SDK client
const expo = new Expo({
  accessToken: config.expoPushToken, // Optional
});

async function sendPushNotification(userId, instance, message, originalNotification) {
  // Get all device tokens for this user on this instance
  const tokens = await getDeviceTokens(userId, instance);

  if (tokens.length === 0) {
    logger.warn(`No device tokens found for user ${userId} on ${instance}`);
    return;
  }

  // Create push messages
  const messages = tokens
    .filter((token) => Expo.isExpoPushToken(token))
    .map((token) => ({
      to: token,
      sound: 'default',
      title: message.title,
      body: message.body,
      data: message.data,
      priority: 'high',
      badge: 1, // Increment badge count
    }));

  // Filter out invalid tokens
  const validMessages = messages.filter((msg) =>
    Expo.isExpoPushToken(msg.to)
  );

  if (validMessages.length === 0) {
    logger.warn(`No valid Expo push tokens for user ${userId}`);
    return;
  }

  // Send notifications in chunks
  const chunks = expo.chunkPushNotifications(validMessages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
      logger.debug(`Sent chunk of ${chunk.length} notifications`);
    } catch (error) {
      logger.error('Error sending push notification chunk:', error);
    }
  }

  // Handle tickets (check for errors)
  tickets.forEach((ticket, index) => {
    if (ticket.status === 'error') {
      logger.error(
        `Error sending notification to ${validMessages[index].to}:`,
        ticket.message
      );

      // If token is invalid, remove it from database
      if (
        ticket.details?.error === 'DeviceNotRegistered' ||
        ticket.details?.error === 'InvalidCredentials'
      ) {
        removeDeviceToken(validMessages[index].to);
      }
    }
  });

  logger.info(
    `Sent ${tickets.length} push notifications for user ${userId}`
  );
}

function getDeviceTokens(userId, instance) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT expo_push_token FROM device_tokens WHERE user_id = ? AND peertube_instance = ?',
      [userId, instance],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map((row) => row.expo_push_token));
      }
    );
  });
}

function removeDeviceToken(token) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM device_tokens WHERE expo_push_token = ?',
      [token],
      (err) => {
        if (err) {
          logger.error('Error removing invalid device token:', err);
          return reject(err);
        }
        logger.info(`Removed invalid device token: ${token}`);
        resolve();
      }
    );
  });
}

module.exports = { sendPushNotification };
```

### Step 1.8: REST API Routes

**File:** `src/routes/devices.js`

```javascript
const express = require('express');
const router = express.Router();
const db = require('../database');
const logger = require('../logger');
const config = require('../config');

// Middleware to verify API key
function verifyApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== config.apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Register or update device token
router.post('/register', verifyApiKey, (req, res) => {
  const {
    expoPushToken,
    userId,
    peertubeInstance,
    peertubeAccessToken,
  } = req.body;

  // Validate input
  if (!expoPushToken || !userId || !peertubeInstance || !peertubeAccessToken) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['expoPushToken', 'userId', 'peertubeInstance', 'peertubeAccessToken'],
    });
  }

  // Validate Expo push token format
  if (!expoPushToken.startsWith('ExponentPushToken[') && !expoPushToken.startsWith('ExpoPushToken[')) {
    return res.status(400).json({
      error: 'Invalid Expo push token format',
    });
  }

  // Insert or update device token
  db.run(
    `INSERT INTO device_tokens (expo_push_token, user_id, peertube_instance, peertube_access_token, updated_at, last_seen_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(expo_push_token) DO UPDATE SET
       user_id = excluded.user_id,
       peertube_instance = excluded.peertube_instance,
       peertube_access_token = excluded.peertube_access_token,
       updated_at = CURRENT_TIMESTAMP,
       last_seen_at = CURRENT_TIMESTAMP`,
    [expoPushToken, userId, peertubeInstance, peertubeAccessToken],
    function (err) {
      if (err) {
        logger.error('Error registering device token:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      logger.info(`Registered device token for user ${userId} on ${peertubeInstance}`);
      res.json({
        success: true,
        message: 'Device registered successfully',
      });
    }
  );
});

// Unregister device token
router.post('/unregister', verifyApiKey, (req, res) => {
  const { expoPushToken } = req.body;

  if (!expoPushToken) {
    return res.status(400).json({ error: 'Missing expoPushToken' });
  }

  db.run(
    'DELETE FROM device_tokens WHERE expo_push_token = ?',
    [expoPushToken],
    function (err) {
      if (err) {
        logger.error('Error unregistering device token:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      logger.info(`Unregistered device token: ${expoPushToken}`);
      res.json({
        success: true,
        message: 'Device unregistered successfully',
      });
    }
  );
});

// Update notification preferences
router.post('/preferences', verifyApiKey, (req, res) => {
  const { userId, peertubeInstance, notificationType, enabled } = req.body;

  if (!userId || !peertubeInstance || notificationType === undefined || enabled === undefined) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['userId', 'peertubeInstance', 'notificationType', 'enabled'],
    });
  }

  db.run(
    `INSERT INTO notification_preferences (user_id, peertube_instance, notification_type, enabled, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, peertube_instance, notification_type) DO UPDATE SET
       enabled = excluded.enabled,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, peertubeInstance, notificationType.toString(), enabled ? 1 : 0],
    function (err) {
      if (err) {
        logger.error('Error updating notification preferences:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      logger.info(`Updated notification preferences for user ${userId}`);
      res.json({
        success: true,
        message: 'Preferences updated successfully',
      });
    }
  );
});

// Get notification preferences
router.get('/preferences/:userId/:instance', verifyApiKey, (req, res) => {
  const { userId, instance } = req.params;

  db.all(
    'SELECT notification_type, enabled FROM notification_preferences WHERE user_id = ? AND peertube_instance = ?',
    [userId, instance],
    (err, rows) => {
      if (err) {
        logger.error('Error fetching notification preferences:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const preferences = {};
      rows.forEach((row) => {
        preferences[row.notification_type] = row.enabled === 1;
      });

      res.json(preferences);
    }
  );
});

module.exports = router;
```

**File:** `src/routes/health.js`

```javascript
const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  // Check database connection
  db.get('SELECT 1', (err) => {
    if (err) {
      return res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        error: err.message,
      });
    }

    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  });
});

// Get service statistics
router.get('/stats', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM device_tokens', (err, deviceCount) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    db.get('SELECT COUNT(*) as count FROM sent_notifications WHERE sent_at > datetime("now", "-24 hours")', (err, notificationCount) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        registeredDevices: deviceCount.count,
        notificationsSent24h: notificationCount.count,
        timestamp: new Date().toISOString(),
      });
    });
  });
});

module.exports = router;
```

### Step 1.9: Logger Setup

**File:** `src/logger.js`

```javascript
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Write errors to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760,
      maxFiles: 5,
    }),
  ],
});

// In development, also log to console
if (config.nodeEnv !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

module.exports = logger;
```

### Step 1.10: Main Application Entry Point

**File:** `src/index.js`

```javascript
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const config = require('./config');
const logger = require('./logger');
const db = require('./database');
const peertubePoller = require('./peertube-poller');

// Import routes
const devicesRouter = require('./routes/devices');
const healthRouter = require('./routes/health');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/devices', devicesRouter);
app.use('/api/health', healthRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'MC Assist Notification Backend',
    version: '1.0.0',
    status: 'running',
  });
});

// Start server
const server = app.listen(config.port, () => {
  logger.info(`Notification backend listening on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Polling interval: ${config.pollingIntervalMinutes} minutes`);
  logger.info(`PeerTube instances: ${config.peertubeInstances.join(', ')}`);
});

// Schedule PeerTube polling
const cronExpression = `*/${config.pollingIntervalMinutes} * * * *`;
logger.info(`Scheduling polling with cron expression: ${cronExpression}`);

cron.schedule(cronExpression, async () => {
  logger.info('Starting scheduled PeerTube polling...');
  try {
    await peertubePoller.pollAllUsers();
    logger.info('Polling completed successfully');
  } catch (error) {
    logger.error('Error during polling:', error);
  }
});

// Also run immediately on startup
setTimeout(async () => {
  logger.info('Running initial poll...');
  try {
    await peertubePoller.pollAllUsers();
  } catch (error) {
    logger.error('Error during initial poll:', error);
  }
}, 5000); // Wait 5 seconds after startup

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed');
    db.close(() => {
      logger.info('Database closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed');
    db.close(() => {
      logger.info('Database closed');
      process.exit(0);
    });
  });
});

module.exports = app;
```

### Step 1.11: Package.json Scripts

**File:** `package.json` (update scripts section)

```json
{
  "name": "mc-assist-notification-backend",
  "version": "1.0.0",
  "description": "Push notification backend for MC Assist mobile app",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["peertube", "notifications", "expo", "push"],
  "author": "Your Company",
  "license": "MIT"
}
```

### Step 1.12: Docker Configuration (Optional but Recommended)

**File:** `Dockerfile`

```dockerfile
FROM node:18-alpine

# Install build dependencies for sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create directories
RUN mkdir -p database logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/index.js"]
```

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  notification-backend:
    build: .
    container_name: mc-assist-notifications
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env
    volumes:
      - ./database:/app/database
      - ./logs:/app/logs
    networks:
      - mc-assist-network

networks:
  mc-assist-network:
    driver: bridge
```

### Step 1.13: Git Configuration

**File:** `.gitignore`

```
# Dependencies
node_modules/

# Environment variables
.env

# Database
database/*.db
database/*.db-journal

# Logs
logs/*.log

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build
dist/
build/
```

### Step 1.14: README for Backend

**File:** `README.md`

```markdown
# MC Assist Notification Backend

Push notification service for MC Assist mobile app with PeerTube integration.

## Features

- Polls PeerTube instances for new notifications
- Sends push notifications via Expo Push Service
- Manages device tokens and user preferences
- Tracks sent notifications to avoid duplicates
- Supports multiple PeerTube instances

## Quick Start

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

### Production (Docker)

1. Configure `.env` file

2. Build and run:
   ```bash
   docker-compose up -d
   ```

3. Check logs:
   ```bash
   docker-compose logs -f
   ```

## API Endpoints

### Device Registration
```
POST /api/devices/register
Headers: X-API-Key: <your-api-key>
Body: {
  "expoPushToken": "ExponentPushToken[...]",
  "userId": "user123",
  "peertubeInstance": "peertube.example.com",
  "peertubeAccessToken": "peertube-access-token"
}
```

### Health Check
```
GET /api/health
```

### Statistics
```
GET /api/health/stats
```

## Configuration

See `.env.example` for all configuration options.

## Monitoring

- Logs: `./logs/combined.log` and `./logs/error.log`
- Health check: `http://your-server:3000/api/health`

## License

MIT
```

---

## Phase 2: Mobile App Integration

**Duration:** 4-6 hours (Day 2)

### Step 2.1: Install Expo Notifications

**In your main project directory:**

```bash
cd C:\Dev\course-connect-ios\OwnTube.tv
npx expo install expo-notifications expo-device expo-constants
```

### Step 2.2: Configure App for Push Notifications

**File:** `OwnTube.tv/app.config.ts` (update)

Add to the `expo` configuration:

```typescript
// Inside the expo configuration object
plugins: [
  // ... existing plugins
  [
    "expo-notifications",
    {
      icon: "./assets/notification-icon.png", // Optional: custom notification icon
      color: "#ffffff", // Optional: notification color
      sounds: ["./assets/notification-sound.wav"], // Optional: custom sound
    },
  ],
],
notification: {
  icon: "./assets/notification-icon.png",
  color: "#1a73e8",
  androidMode: "default",
  androidCollapsedTitle: "#{unread_notifications} new notifications",
},
```

### Step 2.3: Create Notification Service

**File:** `OwnTube.tv/services/notificationService.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private readonly backendUrl: string;
  private readonly apiKey: string;

  constructor() {
    // TODO: Move to environment variables
    this.backendUrl = 'https://your-server.com'; // Replace with your server URL
    this.apiKey = 'your-secret-api-key-here'; // Replace with your API key
  }

  /**
   * Register device for push notifications
   */
  async registerForPushNotifications(
    userId: string,
    peertubeInstance: string,
    peertubeAccessToken: string
  ): Promise<string | null> {
    // Check if device supports push notifications
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push notification permissions');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    const expoPushToken = tokenData.data;

    console.log('Expo push token:', expoPushToken);

    // Register with backend
    try {
      const response = await fetch(`${this.backendUrl}/api/devices/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          expoPushToken,
          userId,
          peertubeInstance,
          peertubeAccessToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Registration failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Device registered successfully:', data);

      return expoPushToken;
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  }

  /**
   * Unregister device from push notifications
   */
  async unregisterDevice(expoPushToken: string): Promise<void> {
    try {
      const response = await fetch(`${this.backendUrl}/api/devices/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({ expoPushToken }),
      });

      if (!response.ok) {
        throw new Error(`Unregistration failed: ${response.statusText}`);
      }

      console.log('Device unregistered successfully');
    } catch (error) {
      console.error('Error unregistering device:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    peertubeInstance: string,
    notificationType: number,
    enabled: boolean
  ): Promise<void> {
    try {
      const response = await fetch(`${this.backendUrl}/api/devices/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          userId,
          peertubeInstance,
          notificationType,
          enabled,
        }),
      });

      if (!response.ok) {
        throw new Error(`Preference update failed: ${response.statusText}`);
      }

      console.log('Preferences updated successfully');
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(
    userId: string,
    peertubeInstance: string
  ): Promise<Record<string, boolean>> {
    try {
      const response = await fetch(
        `${this.backendUrl}/api/devices/preferences/${userId}/${peertubeInstance}`,
        {
          headers: {
            'X-API-Key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch preferences: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching preferences:', error);
      throw error;
    }
  }

  /**
   * Configure notification channels (Android only)
   */
  async setupNotificationChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a73e8',
      });

      await Notifications.setNotificationChannelAsync('subscriptions', {
        name: 'New videos from subscriptions',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });

      await Notifications.setNotificationChannelAsync('comments', {
        name: 'Comments and mentions',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  }
}

export default new NotificationService();
```

### Step 2.4: Create Notification Store (Zustand)

**File:** `OwnTube.tv/store/notificationStore.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationState {
  expoPushToken: string | null;
  notificationsEnabled: boolean;
  lastRegistrationTime: number | null;

  setExpoPushToken: (token: string | null) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setLastRegistrationTime: (time: number) => void;
  clearNotificationData: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      expoPushToken: null,
      notificationsEnabled: false,
      lastRegistrationTime: null,

      setExpoPushToken: (token) => set({ expoPushToken: token }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setLastRegistrationTime: (time) => set({ lastRegistrationTime: time }),
      clearNotificationData: () =>
        set({
          expoPushToken: null,
          notificationsEnabled: false,
          lastRegistrationTime: null,
        }),
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### Step 2.5: Add Notification Hooks

**File:** `OwnTube.tv/hooks/useNotifications.ts`

```typescript
import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import notificationService from '../services/notificationService';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthSessionStore } from '../store/authSessionStore';

export function useNotifications() {
  const router = useRouter();
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  const { expoPushToken, setExpoPushToken, setNotificationsEnabled } = useNotificationStore();
  const { currentInstance, accessToken, userId } = useAuthSessionStore();

  useEffect(() => {
    // Setup notification channels (Android)
    notificationService.setupNotificationChannels();

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        setNotification(notification);
      }
    );

    // Listen for notification interactions (tap)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        handleNotificationTap(response.notification);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  /**
   * Register for push notifications
   */
  const registerForPushNotifications = async () => {
    if (!currentInstance || !accessToken || !userId) {
      console.warn('Cannot register: missing auth data');
      return false;
    }

    try {
      const token = await notificationService.registerForPushNotifications(
        userId,
        currentInstance,
        accessToken
      );

      if (token) {
        setExpoPushToken(token);
        setNotificationsEnabled(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return false;
    }
  };

  /**
   * Unregister from push notifications
   */
  const unregisterFromPushNotifications = async () => {
    if (!expoPushToken) {
      return;
    }

    try {
      await notificationService.unregisterDevice(expoPushToken);
      setExpoPushToken(null);
      setNotificationsEnabled(false);
    } catch (error) {
      console.error('Failed to unregister from push notifications:', error);
    }
  };

  /**
   * Handle notification tap - navigate to relevant screen
   */
  const handleNotificationTap = (notification: Notifications.Notification) => {
    const data = notification.request.content.data;

    // Navigate based on notification type
    if (data.videoUuid) {
      router.push(`/video/${data.videoUuid}`);
    } else if (data.commentId) {
      router.push(`/video/${data.videoUuid}?commentId=${data.commentId}`);
    } else if (data.channelHandle) {
      router.push(`/channel/${data.channelHandle}`);
    }

    // Clear badge count
    Notifications.setBadgeCountAsync(0);
  };

  return {
    notification,
    expoPushToken,
    registerForPushNotifications,
    unregisterFromPushNotifications,
  };
}
```

### Step 2.6: Integrate into App Layout

**File:** `OwnTube.tv/app/_layout.tsx` (update)

Add notification setup to your root layout:

```typescript
import { useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useAuthSessionStore } from '../store/authSessionStore';

export default function RootLayout() {
  const { registerForPushNotifications } = useNotifications();
  const { isAuthenticated } = useAuthSessionStore();

  useEffect(() => {
    // Register for push notifications when user is authenticated
    if (isAuthenticated) {
      registerForPushNotifications();
    }
  }, [isAuthenticated]);

  // ... rest of your layout code
}
```

### Step 2.7: Create Notification Settings Screen

**File:** `OwnTube.tv/screens/NotificationSettings/index.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuthSessionStore } from '../../store/authSessionStore';
import notificationService from '../../services/notificationService';

const NOTIFICATION_TYPES = [
  { type: 1, label: 'New videos from subscriptions', description: 'When a channel you follow uploads a new video' },
  { type: 2, label: 'Comments on your videos', description: 'When someone comments on your videos' },
  { type: 5, label: 'Video published', description: 'When your video is published' },
  { type: 6, label: 'Video import finished', description: 'When a video import completes' },
  { type: 8, label: 'New followers', description: 'When someone follows your channel' },
  { type: 9, label: 'Mentions in comments', description: 'When someone mentions you in a comment' },
];

export default function NotificationSettings() {
  const { expoPushToken, registerForPushNotifications, unregisterFromPushNotifications } = useNotifications();
  const { userId, currentInstance } = useAuthSessionStore();
  const [preferences, setPreferences] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    if (!userId || !currentInstance) return;

    try {
      const prefs = await notificationService.getPreferences(userId, currentInstance);
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const success = await registerForPushNotifications();
      if (!success) {
        Alert.alert('Error', 'Failed to enable push notifications');
      }
    } else {
      await unregisterFromPushNotifications();
    }
  };

  const toggleNotificationType = async (type: number, enabled: boolean) => {
    if (!userId || !currentInstance) return;

    try {
      await notificationService.updatePreferences(userId, currentInstance, type, enabled);
      setPreferences((prev) => ({ ...prev, [type]: enabled }));
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification preferences');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push Notifications</Text>
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Enable push notifications</Text>
            <Text style={styles.description}>
              Receive notifications on this device
            </Text>
          </View>
          <Switch
            value={!!expoPushToken}
            onValueChange={toggleNotifications}
          />
        </View>
      </View>

      {expoPushToken && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          {NOTIFICATION_TYPES.map(({ type, label, description }) => (
            <View key={type} style={styles.row}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.description}>{description}</Text>
              </View>
              <Switch
                value={preferences[type] ?? true}
                onValueChange={(enabled) => toggleNotificationType(type, enabled)}
              />
            </View>
          ))}
        </View>
      )}

      {expoPushToken && (
        <View style={styles.section}>
          <Text style={styles.debugInfo}>Push Token: {expoPushToken}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  labelContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  debugInfo: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
});
```

### Step 2.8: Update App Config with Project ID

**File:** `OwnTube.tv/app.config.ts` (update)

```typescript
export default {
  // ... existing config
  extra: {
    // ... existing extra config
    eas: {
      projectId: "your-expo-project-id", // Get this from expo.dev after creating project
    },
  },
};
```

To get your Expo project ID:
```bash
cd OwnTube.tv
npx expo login
eas init
# This will create the project and give you the ID
```

---

## Phase 3: Deployment

**Duration:** 4-6 hours (Day 2-3)

### Step 3.1: Prepare Backend for Production

**On your development machine:**

```bash
cd mc-assist-notification-backend

# Create production .env file
cp .env.example .env

# Edit .env with your production values
nano .env
```

**Production `.env` example:**
```bash
PORT=3000
NODE_ENV=production
PEERTUBE_INSTANCES=your-peertube-instance.com
POLLING_INTERVAL_MINUTES=2
DATABASE_PATH=./database/notifications.db
API_KEY=generate-a-strong-random-key-here
LOG_LEVEL=info
```

Generate API key:
```bash
openssl rand -base64 32
```

### Step 3.2: Deploy Backend to Server

**Option A: Docker Deployment (Recommended)**

```bash
# On your development machine
cd mc-assist-notification-backend

# Build and test locally
docker-compose up --build

# If working, copy to server
scp -r . user@your-server.com:/opt/mc-assist-notifications/

# On your server
ssh user@your-server.com
cd /opt/mc-assist-notifications
docker-compose up -d

# Check logs
docker-compose logs -f
```

**Option B: PM2 Deployment**

```bash
# On your server
cd /opt/mc-assist-notifications

# Install dependencies
npm ci --only=production

# Install PM2
npm install -g pm2

# Start with PM2
pm2 start src/index.js --name mc-assist-notifications

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### Step 3.3: Setup Nginx Reverse Proxy (Optional but Recommended)

**File:** `/etc/nginx/sites-available/mc-assist-notifications`

```nginx
server {
    listen 80;
    server_name notifications.your-domain.com;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name notifications.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/notifications.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/notifications.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/mc-assist-notifications /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3.4: Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d notifications.your-domain.com
```

### Step 3.5: Update Mobile App Configuration

**File:** `OwnTube.tv/services/notificationService.ts`

Update the backend URL:

```typescript
constructor() {
  this.backendUrl = 'https://notifications.your-domain.com'; // Your production URL
  this.apiKey = 'your-production-api-key'; // Same as backend .env
}
```

**Better: Use environment variables**

**File:** `OwnTube.tv/app.config.ts`

```typescript
extra: {
  notificationBackendUrl: process.env.EXPO_PUBLIC_NOTIFICATION_BACKEND_URL || 'https://notifications.your-domain.com',
  notificationApiKey: process.env.EXPO_PUBLIC_NOTIFICATION_API_KEY,
  // ... other config
},
```

**File:** `OwnTube.tv/services/notificationService.ts`

```typescript
import Constants from 'expo-constants';

constructor() {
  this.backendUrl = Constants.expoConfig?.extra?.notificationBackendUrl;
  this.apiKey = Constants.expoConfig?.extra?.notificationApiKey;
}
```

---

## Phase 4: Testing

**Duration:** 4-6 hours (Day 3)

### Step 4.1: Backend Testing

**Test health endpoint:**
```bash
curl https://notifications.your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-11T12:00:00.000Z"
}
```

**Test device registration:**
```bash
curl -X POST https://notifications.your-domain.com/api/devices/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "expoPushToken": "ExponentPushToken[test]",
    "userId": "test-user",
    "peertubeInstance": "your-peertube.com",
    "peertubeAccessToken": "test-token"
  }'
```

### Step 4.2: Mobile App Testing

**iOS Testing:**
1. Build app: `npm run ios`
2. Navigate to Settings → Notifications
3. Enable push notifications
4. Grant permissions when prompted
5. Verify token registration in backend logs

**Android Testing:**
1. Build app: `npm run android`
2. Follow same steps as iOS
3. Check Android notification channels in device settings

**Test notification delivery:**
1. Subscribe to a channel in the app
2. Upload a video to that channel (or use test account)
3. Wait for polling interval (2 minutes)
4. Verify notification appears on device

### Step 4.3: End-to-End Testing Checklist

- [ ] Backend starts without errors
- [ ] Database tables created successfully
- [ ] Health endpoint returns 200
- [ ] Device registration works (iOS)
- [ ] Device registration works (Android)
- [ ] Notification permissions requested correctly
- [ ] Polling runs on schedule
- [ ] Notifications sent successfully
- [ ] Notifications appear on device
- [ ] Tapping notification navigates to correct screen
- [ ] Badge count increments
- [ ] Notification preferences save correctly
- [ ] Unregistration works
- [ ] Invalid tokens removed from database
- [ ] Logs written to files
- [ ] SSL certificate valid

### Step 4.4: Test Notification Types

Create test scenarios for each notification type:

1. **New video from subscription** - Subscribe to channel, upload video
2. **Comment on your video** - Post comment on your video
3. **New follower** - Follow your channel from another account
4. **Mention in comment** - Comment with @yourname
5. **Video published** - Upload video and wait for processing

---

## Maintenance & Monitoring

### Daily Monitoring

**Check service health:**
```bash
# Docker
docker-compose ps
docker-compose logs --tail=100

# PM2
pm2 status
pm2 logs mc-assist-notifications --lines 100
```

**Check database size:**
```bash
ls -lh database/notifications.db
```

**Check disk space:**
```bash
df -h
```

### Weekly Tasks

**Review error logs:**
```bash
tail -n 500 logs/error.log
```

**Check notification stats:**
```bash
curl https://notifications.your-domain.com/api/health/stats
```

**Clean old sent notifications (optional):**
```sql
sqlite3 database/notifications.db "DELETE FROM sent_notifications WHERE sent_at < datetime('now', '-30 days')"
```

### Database Backup

**Setup automated backups:**

```bash
# Create backup script
nano /opt/mc-assist-notifications/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/mc-assist-notifications/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp database/notifications.db "$BACKUP_DIR/notifications_$DATE.db"
# Keep only last 30 days
find $BACKUP_DIR -name "notifications_*.db" -mtime +30 -delete
```

```bash
chmod +x backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /opt/mc-assist-notifications/backup.sh
```

### Scaling Considerations

**If you exceed 1000+ users:**

1. **Increase polling interval** - Change to 5-10 minutes
2. **Add database indices** - Already included in schema
3. **Use PostgreSQL** - Replace SQLite for better concurrency
4. **Add Redis caching** - Cache recent notifications
5. **Horizontal scaling** - Run multiple backend instances

### Troubleshooting

**Notifications not being sent:**
- Check backend logs for errors
- Verify polling is running: `docker-compose logs | grep "Starting scheduled"`
- Check device tokens in database: `sqlite3 database/notifications.db "SELECT COUNT(*) FROM device_tokens"`
- Verify PeerTube access tokens are valid

**Backend crashes:**
- Check system resources: `free -m && df -h`
- Review error logs: `tail logs/error.log`
- Restart service: `docker-compose restart` or `pm2 restart mc-assist-notifications`

**Duplicate notifications:**
- Verify sent_notifications table has unique constraint
- Check database integrity: `sqlite3 database/notifications.db "PRAGMA integrity_check"`

---

## Security Considerations

1. **API Key Security:**
   - Use strong, randomly generated keys
   - Never commit `.env` to git
   - Rotate keys periodically (every 6 months)

2. **PeerTube Access Tokens:**
   - Stored encrypted would be ideal (add encryption layer)
   - Tokens refresh needed if PeerTube supports it

3. **HTTPS Only:**
   - Always use SSL in production
   - Enforce HTTPS redirects in nginx

4. **Rate Limiting:**
   - Add rate limiting to API endpoints
   - Prevent abuse of registration endpoint

5. **Database Security:**
   - Regular backups
   - File permissions: `chmod 600 database/notifications.db`
   - Consider encryption at rest for sensitive data

---

## Cost Estimate

**Running Costs (per month):**

| Item | Cost |
|------|------|
| Server (256MB RAM, 1 vCPU) | $0 (your existing server) |
| Expo Push Service | Free (up to millions of notifications) |
| SSL Certificate (Let's Encrypt) | Free |
| Domain (optional subdomain) | $0 (if using existing domain) |
| **Total** | **$0/month** |

---

## Timeline Summary

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1: Backend | 6-8 hours | Setup Node.js service, database, API |
| Phase 2: Mobile App | 4-6 hours | Install expo-notifications, create hooks/stores |
| Phase 3: Deployment | 4-6 hours | Deploy to server, configure nginx, SSL |
| Phase 4: Testing | 4-6 hours | Test all platforms, fix issues |
| **Total** | **18-26 hours** | **~2-3 days** |

---

## Next Steps

1. Review this plan and ask any questions
2. Set up backend development environment
3. Deploy backend to staging/testing server
4. Integrate into mobile app
5. Test thoroughly on all platforms
6. Deploy to production
7. Monitor and iterate

---

## Support & References

- **Expo Notifications Docs:** https://docs.expo.dev/push-notifications/overview/
- **PeerTube API Docs:** https://docs.joinpeertube.org/api-rest-reference.html
- **Expo Push Service:** https://expo.dev/notifications
- **Node.js Best Practices:** https://github.com/goldbergyoni/nodebestpractices

---

**Document Version:** 1.0
**Created:** 2025-11-11
**Author:** Claude (MC Assist Development Team)
