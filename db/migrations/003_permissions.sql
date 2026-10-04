-- KCA Module 27: role and permission foundations
-- Review names/types against the current schema before applying.
-- This migration is intentionally additive and does not grant elevated roles.

CREATE TABLE IF NOT EXISTS role_permissions (
    role_name TEXT NOT NULL,
    permission_key TEXT NOT NULL,
    PRIMARY KEY (role_name, permission_key)
);

CREATE TABLE IF NOT EXISTS community_memberships (
    community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    membership_role TEXT NOT NULL DEFAULT 'member'
        CHECK (membership_role IN ('member', 'moderator', 'manager')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'pending', 'suspended', 'left')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (community_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_memberships_user_idx
    ON community_memberships (user_id, status);
CREATE INDEX IF NOT EXISTS community_memberships_role_idx
    ON community_memberships (community_id, membership_role, status);

-- Global roles are not assigned by user-facing routes.
-- The owner identity must be provisioned only by a controlled operator procedure.
-- Seed permission vocabulary; application code must enforce these server-side.
INSERT INTO role_permissions (role_name, permission_key) VALUES
 ('member', 'profile.edit_self'),
 ('member', 'post.create'),
 ('member', 'comment.create'),
 ('member', 'battle.submit'),
 ('member', 'battle.vote'),
 ('community_manager', 'community.settings.edit'),
 ('community_manager', 'community.members.manage'),
 ('community_moderator', 'community.content.moderate'),
 ('moderator', 'content.review'),
 ('moderator', 'reports.review'),
 ('admin', 'users.suspend'),
 ('admin', 'reports.review'),
 ('owner', 'platform.settings.manage'),
 ('owner', 'roles.grant_admin'),
 ('owner', 'owner.transfer')
ON CONFLICT DO NOTHING;
