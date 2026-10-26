import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api";
import type { SlideDoc } from "../shared/slideDoc";
import { validateSlideDoc } from "../shared/slideDoc";
import { adminApi, type AdminSlide } from "./adminApi";

const HISTORY_LIMIT = 100;

/**
 * Undo/redo over immutable documents. "transient" updates (live dragging) change the
 * present without adding history; `commit(base)` then records the whole gesture as one step.
 */
export function useHistory<T>(initial: T) {
  const [state, setState] = useState<{ past: T[]; present: T; future: T[] }>({ past: [], present: initial, future: [] });

  const set = useCallback((next: T | ((current: T) => T), mode: "push" | "transient" = "push") => {
    setState((current) => {
      const value = typeof next === "function" ? (next as (current: T) => T)(current.present) : next;
      if (value === current.present) return current;
      if (mode === "transient") return { ...current, present: value };
      return { past: [...current.past, current.present].slice(-HISTORY_LIMIT), present: value, future: [] };
    });
  }, []);

  /** Record a finished gesture: `base` is the document before the transient updates began. */
  const commit = useCallback((base: T) => {
    setState((current) => (base === current.present ? current : { past: [...current.past, base].slice(-HISTORY_LIMIT), present: current.present, future: [] }));
  }, []);

  const undo = useCallback(() => setState((current) => current.past.length
    ? { past: current.past.slice(0, -1), present: current.past[current.past.length - 1], future: [current.present, ...current.future] }
    : current), []);
  const redo = useCallback(() => setState((current) => current.future.length
    ? { past: [...current.past, current.present], present: current.future[0], future: current.future.slice(1) }
    : current), []);
  const reset = useCallback((value: T) => setState({ past: [], present: value, future: [] }), []);

  return { present: state.present, set, commit, undo, redo, reset, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}

export type SaveStatus = "saved" | "unsaved" | "saving" | "conflict" | "error";

/**
 * Debounced autosave with optimistic locking. Saves are serialised; a stale version
 * surfaces as a conflict the user resolves (reload theirs or overwrite with mine).
 */
export function useAutosave(slide: AdminSlide, onSaved: (slide: AdminSlide) => void) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState<AdminSlide | null>(null);
  const version = useRef(slide.version);
  const savedJson = useRef(JSON.stringify({ title: slide.title, doc: slide.doc }));
  const pending = useRef<{ title: string; doc: SlideDoc }>({ title: slide.title, doc: slide.doc });
  const timer = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const save = useCallback(async (): Promise<void> => {
    if (inFlight.current) { await inFlight.current; }
    const payload = pending.current;
    const json = JSON.stringify(payload);
    if (json === savedJson.current) { setStatus((current) => (current === "conflict" ? current : "saved")); return; }
    const check = validateSlideDoc(payload.doc);
    if (!check.ok) { setStatus("error"); setMessage(check.error); return; }
    setStatus("saving");
    const work = (async () => {
      try {
        const { slide: saved } = await adminApi.updateSlide(slide.id, { version: version.current, title: payload.title, doc: payload.doc });
        version.current = saved.version;
        savedJson.current = json;
        setMessage("");
        onSavedRef.current(saved);
        setStatus(JSON.stringify(pending.current) === json ? "saved" : "unsaved");
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 409) {
          setStatus("conflict");
          setConflict((caught as ApiError & { body?: { slide?: AdminSlide } }).body?.slide ?? null);
        } else {
          setStatus("error");
          setMessage(caught instanceof Error ? caught.message : "Save failed.");
        }
      }
    })();
    inFlight.current = work;
    await work;
    inFlight.current = null;
  }, [slide.id]);

  const schedule = useCallback((title: string, doc: SlideDoc) => {
    pending.current = { title, doc };
    window.clearTimeout(timer.current);
    if (JSON.stringify(pending.current) === savedJson.current) { setStatus((current) => (current === "conflict" ? current : "saved")); return; }
    setStatus((current) => (current === "conflict" ? current : "unsaved"));
    timer.current = window.setTimeout(() => { void save(); }, 900);
  }, [save]);

  const flush = useCallback(async () => { window.clearTimeout(timer.current); await save(); }, [save]);

  /** Keep my version: retry the save on top of the latest server version. */
  const overwrite = useCallback(async () => {
    if (conflict) version.current = conflict.version;
    else version.current = (await adminApi.lessonSlide(slide.id)).slide.version;
    setConflict(null);
    savedJson.current = "";
    setStatus("unsaved");
    await save();
  }, [conflict, save, slide.id]);

  /** Accept the server version: returns it so the editor can reload. */
  const acceptTheirs = useCallback(async (): Promise<AdminSlide> => {
    const latest = conflict ?? (await adminApi.lessonSlide(slide.id)).slide;
    version.current = latest.version;
    savedJson.current = JSON.stringify({ title: latest.title, doc: latest.doc });
    pending.current = { title: latest.title, doc: latest.doc };
    setConflict(null);
    setStatus("saved");
    return latest;
  }, [conflict, slide.id]);

  // Warn before closing the tab with unsaved work; flush when the editor unmounts.
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (JSON.stringify(pending.current) !== savedJson.current) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.clearTimeout(timer.current);
      if (JSON.stringify(pending.current) !== savedJson.current) void save();
    };
  }, [save]);

  return { status, message, conflict, schedule, flush, overwrite, acceptTheirs };
}
