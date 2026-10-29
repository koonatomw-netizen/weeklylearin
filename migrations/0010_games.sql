-- Game Hub: games live in each plan (frozen into published versions); a room tracks the running game and stores answers.
ALTER TABLE training_plans ADD COLUMN games_json TEXT;
ALTER TABLE rooms ADD COLUMN game_id TEXT;
ALTER TABLE rooms ADD COLUMN game_question INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rooms ADD COLUMN game_status TEXT NOT NULL DEFAULT 'idle';

CREATE TABLE IF NOT EXISTS game_answers (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  question_index INTEGER NOT NULL CHECK (question_index >= 0),
  choice INTEGER,
  text TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (participant_id, game_id, question_index)
);
CREATE INDEX IF NOT EXISTS game_answers_by_room ON game_answers(room_code, game_id, question_index);
