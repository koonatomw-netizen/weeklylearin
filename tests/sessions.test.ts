import { describe, expect, it } from "vitest";
import { STALE_ROOM_MS, isFinishedRoom } from "../src/shared/sessions";

const now = Date.parse("2026-11-02T12:00:00Z");

describe("isFinishedRoom", () => {
  it("counts a room the presenter ended", () => {
    expect(isFinishedRoom({ createdAt: new Date(now - 1000).toISOString(), endedAt: new Date(now).toISOString() }, now)).toBe(true);
  });
  it("keeps a room that started recently and is still running", () => {
    expect(isFinishedRoom({ createdAt: new Date(now - 60 * 60 * 1000).toISOString(), endedAt: null }, now)).toBe(false);
  });
  it("counts a room nobody ended after a day", () => {
    expect(isFinishedRoom({ createdAt: new Date(now - STALE_ROOM_MS - 1000).toISOString(), endedAt: null }, now)).toBe(true);
  });
  it("keeps a room whose start time cannot be read", () => {
    expect(isFinishedRoom({ createdAt: "not a date", endedAt: null }, now)).toBe(false);
  });
});
