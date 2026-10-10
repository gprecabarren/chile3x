-- Author-only history and withdrawals; retains existing moderation records.
CREATE INDEX IF NOT EXISTS reviews_author_created_idx ON reviews(author_id, created_at);
-- Preserve daily/browser deduplication while counting new actual button taps.
-- Previous rows represent at least one tap; repeats before this migration were not stored.
ALTER TABLE profile_contact_events ADD COLUMN click_count INTEGER NOT NULL DEFAULT 1;
