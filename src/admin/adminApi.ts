import { ApiError } from "../api";
import type { SlideDoc } from "../shared/slideDoc";
import type { TemplateId } from "../shared/templates";

export interface AdminSlide { id: string; lessonId: string; position: number; title: string; doc: SlideDoc; version: number; updatedAt: string }
export interface AdminLesson { id: string; title: string; category: string; description: string; createdAt: string; updatedAt: string; archived: boolean; slideCount: number }
export interface AdminLessonDetail extends AdminLesson { slides: AdminSlide[] }
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
  reorder: (lessonId: string, slideIds: string[]) => call<{ lesson: AdminLessonDetail }>(`/lessons/${lessonId}/reorder`, send("POST", { slideIds })),
};
