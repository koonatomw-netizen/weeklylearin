/** A room counts as finished when the presenter ended it, or when it was started more than a day ago and nobody ended it. */
export const STALE_ROOM_MS = 24 * 60 * 60 * 1000;

export function isFinishedRoom(room: { createdAt: string; endedAt: string | null }, now = Date.now()): boolean {
  if (room.endedAt) return true;
  const started = Date.parse(room.createdAt);
  return Number.isFinite(started) && now - started > STALE_ROOM_MS;
}
