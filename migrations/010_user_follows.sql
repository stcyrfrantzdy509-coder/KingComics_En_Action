-- KCA Module 34 — Member follows
-- Blueprint only. Confirm users.id type and existing relationship tables before applying.

CREATE TABLE IF NOT EXISTS user_follows (
  follower_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_user_id, followed_user_id),
  CONSTRAINT user_follows_no_self CHECK (follower_user_id <> followed_user_id)
);

CREATE INDEX IF NOT EXISTS user_follows_followed_created_idx
  ON user_follows (followed_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_follows_follower_created_idx
  ON user_follows (follower_user_id, created_at DESC);
