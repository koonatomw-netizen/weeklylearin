-- Phase 5: lightweight recurring-issue tags for training history.
-- Tags are admin-only metadata and do not alter frozen training snapshots.
CREATE TABLE IF NOT EXISTS session_issue_tags (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  tag TEXT NOT NULL CHECK (length(trim(tag)) BETWEEN 1 AND 40),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 240),
  created_at TEXT NOT NULL,
  UNIQUE (session_id, tag)
);
CREATE INDEX IF NOT EXISTS session_issue_tags_by_session ON session_issue_tags(session_id, created_at);
