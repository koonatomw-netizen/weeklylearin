import type { PublishedDeck } from "./shared/deck";
import type { Checklist, ControlAction, FeedbackAnswers, FeedbackResponse, RoomEnvelope } from "./shared/types";

export class ApiError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
    this.name = "ApiError";
  }
}

async function jsonRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } });
  } catch {
    throw new ApiError("Network connection lost. Check your Wi-Fi and try again.");
  }
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new ApiError(body.error ?? "The request could not be completed.", response.status);
  return body;
}

const auth = (token: string): HeadersInit => ({ Authorization: `Bearer ${token}` });
const room = (code: string, action: string) => `/api/rooms/${encodeURIComponent(code)}/${action}`;

export const newRequestId = () => crypto.randomUUID();

export const getConfig = () => jsonRequest<{ hostReady: boolean }>("/api/config");

export const createRoom = (passphrase: string) =>
  jsonRequest<{ roomCode: string; hostToken: string; title: string }>("/api/rooms", { method: "POST", headers: { "X-Host-Passphrase": passphrase }, body: "{}" });

export const joinRoom = (code: string, nickname: string) =>
  jsonRequest<{ participantId: string; participantToken: string; nickname: string }>(room(code, "join"), { method: "POST", body: JSON.stringify({ nickname }) });

export const getRoom = (code: string, token: string) => jsonRequest<RoomEnvelope>(room(code, "state"), { headers: auth(token) });

export const createSocketTicket = (code: string, token: string) =>
  jsonRequest<{ ticket: string }>(room(code, "ticket"), { method: "POST", headers: auth(token), body: "{}" });

export const submitPrompt = (code: string, token: string, prompt: string, requestId: string) =>
  jsonRequest<RoomEnvelope>(room(code, "submit"), { method: "POST", headers: auth(token), body: JSON.stringify({ prompt, requestId }) });

export const saveChecklist = (code: string, token: string, submissionId: string, checklist: Checklist) =>
  jsonRequest<RoomEnvelope>(room(code, "checklist"), { method: "POST", headers: auth(token), body: JSON.stringify({ submissionId, checklist }) });

export const selectFinal = (code: string, token: string, submissionId: string) =>
  jsonRequest<RoomEnvelope>(room(code, "final"), { method: "POST", headers: auth(token), body: JSON.stringify({ submissionId }) });

export const castVote = (code: string, token: string, battleId: string, entryId: string, requestId: string) =>
  jsonRequest<RoomEnvelope>(room(code, "vote"), { method: "POST", headers: auth(token), body: JSON.stringify({ battleId, entryId, requestId }) });

export const control = (code: string, token: string, action: ControlAction) =>
  jsonRequest<RoomEnvelope>(room(code, "control"), { method: "POST", headers: auth(token), body: JSON.stringify(action) });

// The version is part of the URL so a room moved to a newer deck never reuses the browser's cached copy of the old one.
export const getDeck = (code: string, token: string, snapshotId?: string | null) =>
  jsonRequest<{ snapshotId: string | null; deck: PublishedDeck | null }>(`${room(code, "deck")}${snapshotId ? `?v=${encodeURIComponent(snapshotId)}` : ""}`, { headers: auth(token) });

export const submitFeedback = (code: string, token: string, answers: FeedbackAnswers) =>
  jsonRequest<RoomEnvelope>(room(code, "feedback"), { method: "POST", headers: auth(token), body: JSON.stringify(answers) });

export const getFeedbackResponses = (code: string, token: string) =>
  jsonRequest<{ responses: FeedbackResponse[] }>(room(code, "responses"), { headers: auth(token) });

export async function exportResults(code: string, token: string, kind: "export" | "feedbackcsv" = "export"): Promise<Blob> {
  const response = await fetch(room(code, kind), { headers: auth(token) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new ApiError(body.error ?? "CSV export failed.", response.status);
  }
  return response.blob();
}

// Tokens live in localStorage so a phone that discards the tab can still rejoin.
const read = (key: string) => {
  try { return localStorage.getItem(key) ?? sessionStorage.getItem(key); } catch { return null; }
};
const write = (key: string, value: string | null) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* storage blocked */ }
};

export const tokens = {
  host: (code: string) => read(`4seas:host:${code}`),
  setHost: (code: string, token: string) => write(`4seas:host:${code}`, token),
  participant: (code: string) => read(`4seas:participant:${code}`),
  setParticipant: (code: string, token: string | null) => write(`4seas:participant:${code}`, token),
};
