-- KCA Module 28: feed posts and comments
-- Align table/column names with the existing base schema before applying.

CREATE TABLE IF NOT EXISTS posts (
    id BIGSERIAL PRIMARY KEY,
    author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 5000),
    visibility TEXT NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public', 'community', 'private')),
    community_id BIGINT REFERENCES communities(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'published'
        CHECK (status IN ('draft', 'published', 'hidden', 'removed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((visibility = 'community' AND community_id IS NOT NULL)
        OR (visibility <> 'community'))
);

CREATE INDEX IF NOT EXISTS posts_feed_idx
    ON posts (created_at DESC, id DESC)
    WHERE status = 'published' AND visibility = 'public';
CREATE INDEX IF NOT EXISTS posts_author_idx
    ON posts (author_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS posts_community_idx
    ON posts (community_id, created_at DESC, id DESC)
    WHERE status = 'published';

CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    parent_comment_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
    status TEXT NOT NULL DEFAULT 'published'
        CHECK (status IN ('published', 'hidden', 'removed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comments_post_idx
    ON comments (post_id, created_at ASC, id ASC)
    WHERE status = 'published';
CREATE INDEX IF NOT EXISTS comments_author_idx
    ON comments (author_id, created_at DESC, id DESC);

-- Application must also verify:
-- * author account is active and email-verified;
-- * community membership/visibility for non-public posts;
-- * a reply's parent comment belongs to the same post;
-- * author can edit/delete only their own content unless moderator permission applies;
-- * every moderation action is audited.
