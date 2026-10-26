-- Prompt Battle data model. Additive only: legacy tables (submissions, slide_templates,
-- template_versions) and their rows are kept untouched for historical reference.

ALTER TABLE rooms ADD COLUMN activity TEXT NOT NULL DEFAULT 'waiting';
ALTER TABLE rooms ADD COLUMN slide_step INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rooms ADD COLUMN active_battle_id TEXT;

CREATE TABLE IF NOT EXISTS prompt_submissions (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  attempt INTEGER NOT NULL CHECK (attempt BETWEEN 1 AND 3),
  prompt_text TEXT NOT NULL CHECK (length(prompt_text) BETWEEN 1 AND 2000),
  request_id TEXT NOT NULL,
  checklist_json TEXT NOT NULL DEFAULT '{}',
  submitted_at TEXT NOT NULL,
  UNIQUE (participant_id, attempt),
  UNIQUE (participant_id, request_id),
  UNIQUE (id, participant_id)
);
CREATE INDEX IF NOT EXISTS prompt_submissions_by_room ON prompt_submissions(room_code, submitted_at);

CREATE TABLE IF NOT EXISTS final_selections (
  participant_id TEXT PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  submission_id TEXT NOT NULL,
  auto_selected INTEGER NOT NULL DEFAULT 0 CHECK (auto_selected IN (0, 1)),
  selected_at TEXT NOT NULL,
  FOREIGN KEY (submission_id, participant_id) REFERENCES prompt_submissions(id, participant_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS final_selections_by_room ON final_selections(room_code);

CREATE TABLE IF NOT EXISTS battles (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  round TEXT NOT NULL CHECK (round IN ('mini', 'final')),
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'closed', 'revealed')),
  eligible_voters INTEGER,
  resolution_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  opened_at TEXT,
  closed_at TEXT,
  revealed_at TEXT,
  UNIQUE (room_code, round, sequence)
);

CREATE TABLE IF NOT EXISTS battle_entries (
  id TEXT PRIMARY KEY,
  battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  submission_id TEXT NOT NULL REFERENCES prompt_submissions(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  is_winner INTEGER NOT NULL DEFAULT 0 CHECK (is_winner IN (0, 1)),
  UNIQUE (battle_id, participant_id),
  UNIQUE (battle_id, display_order),
  UNIQUE (id, battle_id)
);
CREATE INDEX IF NOT EXISTS battle_entries_by_battle ON battle_entries(battle_id, display_order);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL,
  voter_participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (battle_id, voter_participant_id),
  FOREIGN KEY (entry_id, battle_id) REFERENCES battle_entries(id, battle_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS votes_by_battle ON votes(battle_id, entry_id);

-- Integrity guards that hold even if application checks are bypassed.
CREATE TRIGGER IF NOT EXISTS votes_require_open_battle
BEFORE INSERT ON votes
WHEN (SELECT status FROM battles WHERE id = NEW.battle_id) IS NOT 'open'
BEGIN
  SELECT RAISE(ABORT, 'battle_not_open');
END;

CREATE TRIGGER IF NOT EXISTS votes_block_competitors
BEFORE INSERT ON votes
WHEN EXISTS (SELECT 1 FROM battle_entries WHERE battle_id = NEW.battle_id AND participant_id = NEW.voter_participant_id)
BEGIN
  SELECT RAISE(ABORT, 'competitor_cannot_vote');
END;

CREATE TRIGGER IF NOT EXISTS votes_immutable
BEFORE UPDATE ON votes
BEGIN
  SELECT RAISE(ABORT, 'votes_are_final');
END;

CREATE TABLE IF NOT EXISTS presenter_actions (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  action TEXT NOT NULL,
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS presenter_actions_by_room ON presenter_actions(room_code, created_at);
