-- Forum Categories Table
CREATE TABLE IF NOT EXISTS forum_categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  icon VARCHAR(50),
  "order" INTEGER NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Forum Users Table (simplified - could integrate with PeerTube users)
CREATE TABLE IF NOT EXISTS forum_users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  account_host VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Forum Threads Table
CREATE TABLE IF NOT EXISTS forum_threads (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  category_id VARCHAR(36) NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  author_id VARCHAR(36) NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  related_video_id VARCHAR(100),
  related_channel_id VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_threads_category ON forum_threads(category_id);
CREATE INDEX idx_threads_author ON forum_threads(author_id);
CREATE INDEX idx_threads_created_at ON forum_threads(created_at DESC);

-- Forum Posts Table
CREATE TABLE IF NOT EXISTS forum_posts (
  id VARCHAR(36) PRIMARY KEY,
  thread_id VARCHAR(36) NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id VARCHAR(36) NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
  reply_to_id VARCHAR(36) REFERENCES forum_posts(id) ON DELETE SET NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at TIMESTAMP
);

CREATE INDEX idx_posts_thread ON forum_posts(thread_id);
CREATE INDEX idx_posts_author ON forum_posts(author_id);
CREATE INDEX idx_posts_created_at ON forum_posts(created_at DESC);
