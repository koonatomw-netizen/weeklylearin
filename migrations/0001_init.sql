CREATE TABLE IF NOT EXISTS rooms (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  host_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_version INTEGER NOT NULL,
  slides_snapshot TEXT NOT NULL,
  current_slide INTEGER NOT NULL DEFAULT 0,
  phase TEXT NOT NULL DEFAULT 'join',
  scoring_mode TEXT NOT NULL DEFAULT 'demo',
  scoring_model TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  participant_token_hash TEXT NOT NULL,
  joined_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS participants_by_room ON participants(room_code, joined_at);
CREATE UNIQUE INDEX IF NOT EXISTS participant_nickname_per_room
  ON participants(room_code, lower(nickname));

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  attempt INTEGER NOT NULL CHECK (attempt IN (1, 2)),
  prompt_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete')),
  error_message TEXT NOT NULL DEFAULT '',
  total INTEGER NOT NULL DEFAULT 0 CHECK (total BETWEEN 0 AND 100),
  rubric_json TEXT NOT NULL DEFAULT '{}',
  evaluation_json TEXT NOT NULL DEFAULT '{}',
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(participant_id, attempt)
);

CREATE INDEX IF NOT EXISTS submissions_by_room ON submissions(room_code, attempt, submitted_at);

CREATE TABLE IF NOT EXISTS slide_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  draft_json TEXT NOT NULL,
  published_json TEXT NOT NULL,
  draft_version INTEGER NOT NULL DEFAULT 1,
  published_version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS template_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES slide_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('draft', 'published')),
  slides_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS template_versions_by_template ON template_versions(template_id, created_at DESC);
