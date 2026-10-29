-- Per-plan content that used to be fixed in code. NULL = use the built-in defaults.
ALTER TABLE training_plans ADD COLUMN situations_json TEXT;
ALTER TABLE training_plans ADD COLUMN feedback_json TEXT;
