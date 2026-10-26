-- Mandatory weekly feedback. Additive only; kept separate from Prompt Battle data
-- (no link to submissions, battles or votes). session_id is the room code.

CREATE TABLE IF NOT EXISTS weekly_feedback (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  training_rating INTEGER NOT NULL CHECK (training_rating BETWEEN 1 AND 5),
  work_challenges TEXT NOT NULL CHECK (length(trim(work_challenges)) BETWEEN 1 AND 1000),
  support_needed TEXT NOT NULL CHECK (length(trim(support_needed)) BETWEEN 1 AND 1000),
  training_requests TEXT NOT NULL CHECK (length(trim(training_requests)) BETWEEN 1 AND 1000),
  other_comments TEXT NOT NULL DEFAULT '' CHECK (length(other_comments) <= 1000),
  submitted_at TEXT NOT NULL,
  UNIQUE (session_id, participant_id)
);
CREATE INDEX IF NOT EXISTS weekly_feedback_by_session ON weekly_feedback(session_id, submitted_at);
