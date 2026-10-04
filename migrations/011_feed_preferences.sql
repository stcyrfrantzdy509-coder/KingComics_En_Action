-- KCA Module 35 — Personalized feed
-- Blueprint only. Confirm source table names and user ID types before applying.

CREATE TABLE IF NOT EXISTS feed_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sort_mode TEXT NOT NULL DEFAULT 'recent'
    CHECK (sort_mode IN ('recent', 'popular')),
  show_followed_members BOOLEAN NOT NULL DEFAULT TRUE,
  show_communities BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS posts_feed_created_idx
  ON posts (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS user_follows_feed_idx
  ON user_follows (follower_user_id, followed_user_id);
