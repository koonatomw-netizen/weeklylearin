import { ApiError } from "../api";
import type { Challenge, PublishedDeck } from "../shared/deck";
import type { SlideDoc } from "../shared/slideDoc";
import type { TemplateId } from "../shared/templates";

export interface AdminSlide { id: string; lessonId: string; position: number; title: string; doc: SlideDoc; version: number; updatedAt: string }
export interface AdminLesson { id: string; title: string; category: string; description: string; createdAt: string; updatedAt: string; archived: boolean; slideCount: number }
export interface AdminLessonDetail extends AdminLesson { slides: AdminSlide[] }
export interface AdminPlan {
  id: string; title: string; weekDate: string | null; durationMin: number | null; notes: string; challenge: Challenge;
  status: "draft" | "published"; copiedFrom: string | null; createdAt: string; updatedAt: string; slideCount: number;
  latestVersion: number | null; latestSnapshotId: string | null; publishedAt: string | null; hasUnpublishedChanges: boolean;
}
export interface AdminPlanSlide { slideId: string; position: number; title: string; lessonId: string; lessonTitle: string; doc: SlideDoc }
export interface AdminPlanDetail extends AdminPlan {
  slides: AdminPlanSlide[];
  snapshots: Array<{ id: string; version: number; publishedAt: string; bytes: number }>;
}
export interface AdminSession { code: string; title: string; createdAt: string; activity: string; snapshotId: string | null; version: number | null; planId: string | null; participants: number; feedback: number }
export interface AdminAsset { id: string; mime: string; bytes: number; width: number | null; height: number | null; createdAt: string }
export interface Dashboard { lessons: number; slides: number; sessions: number; feedback: number; recent: Array<{ action: string; createdAt: string }> }

const KEY = "4seas:admin";
export const adminToken = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (token: string | null) => { try { if (token) localStorage.setItem(KEY, token); else localStorage.removeItem(KEY); } catch { /* storage blocked */ } },
};

/** Fired when the server says the admin session is gone, so the app can show the sign-in screen. */
export const SESSION_ENDED = "4seas:admin-session-ended";

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = adminToken.get();
  let response: Response;
  try {
    response = await fetch(`/api/admin${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError("Network connection lost. Your last change may not be saved.");
  }
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (response.status === 401 && path !== "/login") {
    adminToken.set(null);
    window.dispatchEvent(new Event(SESSION_ENDED));
  }
  if (!response.ok) throw Object.assign(new ApiError(body.error ?? "The request could not be completed.", response.status), { body });
  return body;
}

const send = (method: string, data?: unknown): RequestInit => ({ method, body: data === undefined ? "{}" : JSON.stringify(data) });

export const adminApi = {
  login: (passphrase: string) => call<{ token: string; expiresAt: string }>("/login", send("POST", { passphrase })),
  logout: () => call<{ ok: true }>("/logout", send("POST")),
  me: () => call<{ ok: true }>("/me"),
  dashboard: () => call<Dashboard>("/dashboard"),
  lessons: (archived = false) => call<{ lessons: AdminLesson[] }>(`/lessons${archived ? "?archived=1" : ""}`),
  lesson: (id: string) => call<{ lesson: AdminLessonDetail }>(`/lessons/${id}`),
  createLesson: (data: { title: string; category?: string }) => call<{ lesson: AdminLessonDetail }>("/lessons", send("POST", data)),
  updateLesson: (id: string, data: Partial<{ title: string; category: string; description: string; archived: boolean }>) =>
    call<{ lesson: AdminLessonDetail }>(`/lessons/${id}`, send("PATCH", data)),
  seedWeek01: () => call<{ lesson: AdminLessonDetail; created: boolean }>("/seed/week01", send("POST")),
  addSlide: (lessonId: string, data: { template?: TemplateId; duplicateOf?: string; afterSlideId?: string; title?: string }) =>
    call<{ slide: AdminSlide }>(`/lessons/${lessonId}/slides`, send("POST", data)),
  lessonSlide: (id: string) => call<{ slide: AdminSlide }>(`/slides/${id}`),
  updateSlide: (id: string, data: { version: number; title?: string; doc?: SlideDoc }) => call<{ slide: AdminSlide }>(`/slides/${id}`, send("PATCH", data)),
  deleteSlide: (id: string) => call<{ ok: true }>(`/slides/${id}`, { method: "DELETE" }),
  plans: () => call<{ plans: AdminPlan[] }>("/plans"),
  plan: (id: string) => call<{ plan: AdminPlanDetail }>(`/plans/${id}`),
  createPlan: (data: { title: string; weekDate?: string | null; durationMin?: number | null }) => call<{ plan: AdminPlanDetail }>("/plans", send("POST", data)),
  copyPlan: (id: string) => call<{ plan: AdminPlanDetail }>("/plans", send("POST", { copyFrom: id })),
  updatePlan: (id: string, data: Partial<{ title: string; weekDate: string | null; durationMin: number | null; notes: string; challenge: Challenge; slideIds: string[] }>) =>
    call<{ plan: AdminPlanDetail }>(`/plans/${id}`, send("PATCH", data)),
  deletePlan: (id: string) => call<{ ok: true }>(`/plans/${id}`, { method: "DELETE" }),
  publishPlan: (id: string) => call<{ snapshot: { id: string; version: number; publishedAt: string }; plan: AdminPlanDetail }>(`/plans/${id}/publish`, send("POST")),
  snapshot: (id: string) => call<{ snapshot: { id: string; publishedAt: string; deck: PublishedDeck } }>(`/snapshots/${id}`),
  startSession: (snapshotId: string) => call<{ roomCode: string; hostToken: string; title: string }>(`/snapshots/${snapshotId}/session`, send("POST")),
  sessions: () => call<{ sessions: AdminSession[] }>("/sessions"),
  assets: () => call<{ assets: AdminAsset[] }>("/assets"),
  uploadAsset: (file: File) => call<{ asset: AdminAsset; deduplicated: boolean }>("/assets", { method: "POST", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } }),
  deleteAsset: (id: string) => call<{ ok: true }>(`/assets/${id}`, { method: "DELETE" }),
  reorder: (lessonId: string, slideIds: string[]) => call<{ lesson: AdminLessonDetail }>(`/lessons/${lessonId}/reorder`, send("POST", { slideIds })),
};
