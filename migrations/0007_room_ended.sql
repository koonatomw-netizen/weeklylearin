-- Stop session: the presenter can end a room for everyone. NULL = still running (every existing room).
ALTER TABLE rooms ADD COLUMN ended_at TEXT;
