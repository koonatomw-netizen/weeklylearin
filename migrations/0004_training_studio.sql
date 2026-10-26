-- 4Seas Training Studio: admin sessions, lesson library, weekly plans and published snapshots.
-- Additive only. Existing rooms keep snapshot_id NULL and continue to use the built-in Week 01 deck.

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_actions_by_time ON admin_actions(created_at);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  category TEXT NOT NULL DEFAULT '' CHECK (length(category) <= 60),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 500),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS slides (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '' CHECK (length(title) <= 120),
  doc_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS slides_by_lesson ON slides(lesson_id, position);

-- Uploaded images (Phase 3, stored in R2; this table holds references only).
CREATE TABLE IF NOT EXISTS slide_assets (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE,
  mime TEXT NOT NULL CHECK (mime IN ('image/png', 'image/jpeg', 'image/webp')),
  bytes INTEGER NOT NULL CHECK (bytes > 0),
  width INTEGER,
  height INTEGER,
  sha256 TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS training_plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  week_date TEXT,
  duration_min INTEGER CHECK (duration_min IS NULL OR duration_min BETWEEN 5 AND 480),
  notes TEXT NOT NULL DEFAULT '',
  challenge_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  copied_from TEXT REFERENCES training_plans(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS training_plan_slides (
  plan_id TEXT NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  slide_id TEXT NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (plan_id, position)
);

CREATE TABLE IF NOT EXISTS training_snapshots (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES training_plans(id),
  version INTEGER NOT NULL,
  deck_json TEXT NOT NULL,
  published_at TEXT NOT NULL,
  UNIQUE (plan_id, version)
);

-- Published decks are history: never edited in place.
CREATE TRIGGER IF NOT EXISTS training_snapshots_immutable
BEFORE UPDATE ON training_snapshots
BEGIN
  SELECT RAISE(ABORT, 'snapshots_are_immutable');
END;

ALTER TABLE rooms ADD COLUMN snapshot_id TEXT REFERENCES training_snapshots(id);
