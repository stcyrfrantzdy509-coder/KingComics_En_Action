-- KCA Module 32 — Search and discovery
-- Review names and types against the final schema before applying.

CREATE TABLE IF NOT EXISTS search_documents (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('profile', 'post', 'community', 'battle')),
  entity_id BIGINT NOT NULL,
  owner_user_id BIGINT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'members', 'private')),
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'hidden', 'removed', 'draft')),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(body, '')), 'B')
  ) STORED,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS search_documents_vector_idx
  ON search_documents USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS search_documents_type_updated_idx
  ON search_documents (entity_type, updated_at DESC)
  WHERE status = 'published' AND visibility = 'public';
