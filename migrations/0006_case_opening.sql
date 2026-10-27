-- Case opening: the situation the presenter's case landed on, and how many times a case has been opened.
ALTER TABLE rooms ADD COLUMN case_situation_id TEXT;
ALTER TABLE rooms ADD COLUMN case_roll INTEGER NOT NULL DEFAULT 0;
