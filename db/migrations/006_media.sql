-- KCA Module 30: media metadata and processing states
-- This stores metadata only; actual binary files must live in controlled object storage.

CREATE TABLE IF NOT EXISTS media (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    storage_key TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL CHECK (char_length(original_filename) <= 255),
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    media_kind TEXT NOT NULL CHECK (media_kind IN ('image', 'video')),
    status TEXT NOT NULL DEFAULT 'pending_upload'
        CHECK (status IN ('pending_upload', 'uploaded', 'scanning', 'processing', 'ready', 'rejected', 'deleted')),
    visibility TEXT NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('private', 'public')),
    width INTEGER CHECK (width IS NULL OR width > 0),
    height INTEGER CHECK (height IS NULL OR height > 0),
    duration_seconds NUMERIC(10,2) CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    checksum_sha256 TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_owner_idx ON media (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS media_ready_kind_idx ON media (media_kind, created_at DESC)
    WHERE status = 'ready';

-- Validate MIME type from file contents (not just client headers), actual size,
-- extension, checksum, image/video metadata and safe storage access in the service.
-- Never serve a user-supplied path directly from the web root.
