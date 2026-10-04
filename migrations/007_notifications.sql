-- KCA Module 31 — Notifications
-- PostgreSQL migration blueprint. Review table names/types before applying.

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'post_comment', 'post_reply', 'community_invite',
    'battle_vote', 'battle_result', 'moderation_update', 'system'
  )),
  entity_type TEXT NULL CHECK (entity_type IN (
    'post', 'comment', 'community', 'battle', 'report', 'system'
  )),
  entity_id BIGINT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  body TEXT NULL CHECK (body IS NULL OR char_length(body) <= 500),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ NULL,
  CONSTRAINT notifications_dedupe_key_length
    CHECK (dedupe_key IS NULL OR char_length(dedupe_key) BETWEEN 1 AND 200)
);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_recipient_dedupe_uq
  ON notifications (recipient_user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON notifications (recipient_user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON notifications (recipient_user_id, created_at DESC)
  WHERE read_at IS NULL;
