-- KCA Module 29: video battles, submissions, voting and rewards
-- Review the existing schema before applying; adapt ID types/table names if needed.

CREATE TABLE IF NOT EXISTS battles (
    id BIGSERIAL PRIMARY KEY,
    creator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 5 AND 120),
    description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 3000),
    category TEXT NOT NULL CHECK (category IN ('rap', 'freestyle', 'gaming', 'breakdance', 'other')),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'open', 'voting', 'closed', 'cancelled')),
    starts_at TIMESTAMPTZ,
    submissions_close_at TIMESTAMPTZ,
    voting_close_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (submissions_close_at IS NULL OR starts_at IS NULL OR submissions_close_at > starts_at),
    CHECK (voting_close_at IS NULL OR submissions_close_at IS NULL OR voting_close_at >= submissions_close_at)
);

CREATE TABLE IF NOT EXISTS battle_submissions (
    id BIGSERIAL PRIMARY KEY,
    battle_id BIGINT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
    participant_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    media_id BIGINT REFERENCES media(id) ON DELETE SET NULL,
    video_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('pending_review', 'approved', 'rejected', 'withdrawn')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    review_note TEXT,
    CHECK (media_id IS NOT NULL OR video_url IS NOT NULL),
    UNIQUE (battle_id, participant_id)
);
CREATE INDEX IF NOT EXISTS battle_submissions_battle_idx
    ON battle_submissions (battle_id, submitted_at, id);

CREATE TABLE IF NOT EXISTS battle_votes (
    id BIGSERIAL PRIMARY KEY,
    battle_id BIGINT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
    submission_id BIGINT NOT NULL REFERENCES battle_submissions(id) ON DELETE CASCADE,
    voter_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (battle_id, voter_id)
);
CREATE INDEX IF NOT EXISTS battle_votes_submission_idx
    ON battle_votes (submission_id);

CREATE TABLE IF NOT EXISTS battle_results (
    id BIGSERIAL PRIMARY KEY,
    battle_id BIGINT NOT NULL UNIQUE REFERENCES battles(id) ON DELETE CASCADE,
    winner_submission_id BIGINT REFERENCES battle_submissions(id) ON DELETE SET NULL,
    total_valid_votes INTEGER NOT NULL DEFAULT 0 CHECK (total_valid_votes >= 0),
    finalized_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
    finalized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result_note TEXT
);

-- Exactly-once reward grant: unique reference protects against repeat finalization.
CREATE TABLE IF NOT EXISTS reward_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    points_delta INTEGER NOT NULL CHECK (points_delta <> 0),
    reason TEXT NOT NULL,
    reference_type TEXT NOT NULL,
    reference_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, reason, reference_type, reference_id)
);
CREATE INDEX IF NOT EXISTS reward_ledger_user_idx
    ON reward_ledger (user_id, created_at DESC);

-- Application transactions must validate status transitions and voting windows.
-- A vote must target an approved submission in the same battle.
-- The voter cannot vote in a battle where they are a participant.
-- Never accept winner, vote counts, or points from the client.
