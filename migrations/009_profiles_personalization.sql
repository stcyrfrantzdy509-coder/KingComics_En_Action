-- KCA Module 33 — Profiles and personalization
-- Blueprint only. Align user/profile columns with the final schema before applying.

CREATE TABLE IF NOT EXISTS profile_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (profile_visibility IN ('public', 'members', 'private')),
  show_activity BOOLEAN NOT NULL DEFAULT TRUE,
  show_follow_counts BOOLEAN NOT NULL DEFAULT TRUE,
  allow_community_invites BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_media (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_kind TEXT NOT NULL CHECK (media_kind IN ('avatar', 'banner')),
  media_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, media_kind)
);

CREATE INDEX IF NOT EXISTS profile_media_user_idx ON profile_media (user_id);
