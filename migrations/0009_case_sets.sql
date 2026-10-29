-- Reusable, editable sets of case-opening situations. A plan copies a set into its own pool when you pick it.
CREATE TABLE IF NOT EXISTS case_sets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  situations_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
