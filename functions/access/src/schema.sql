-- Discovery-access ledger for the reposell listing access worker.
-- Identity comes from WorkOS AuthKit (GitHub login); the ledger records which
-- WorkOS user paid a discovery contribution for a given listing.
-- Apply with: npx wrangler d1 execute reposell-listing-access --file=src/schema.sql --remote
--            npx wrangler d1 execute reposell-listing-access --file=src/schema.sql --local

CREATE TABLE IF NOT EXISTS contributions (
  listing_id TEXT NOT NULL,
  -- WorkOS user id (from the AuthKit GitHub session).
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  -- GitHub login, when surfaced by WorkOS raw attributes (may be '').
  github_login TEXT,
  checkout_session_id TEXT NOT NULL,
  payment_link_id TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (listing_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_contributions_user ON contributions (user_id);