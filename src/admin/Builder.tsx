import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  AppWindow, ArrowLeft, Circle, Eye, Maximize, Minus, Plus, Radio, Redo2, Square, SquareDashed, Type, Undo2, Image as ImageIcon,
} from "lucide-react";
import { SlideStage } from "../slides/Deck";
import { SlideRenderer } from "../slides/SlideRenderer";
import { CANVAS_W, stepCount, type SlideDoc, type SlideElement, type WidgetKind } from "../shared/slideDoc";
import { TEMPLATE_INFO } from "../shared/templates";
import type { Language } from "../shared/types";
import { Notice, t } from "../ui";
import { adminApi, type AdminLesson, type AdminLessonDetail, type AdminSlide } from "./adminApi";
import { AssetPicker } from "./AssetPicker";
import {
  addElement, boundingBox, deleteElements, duplicateElements, imageElement, moveElements, newElement, paragraphsToText, resizeRect,
  snapGuides, snapRect, snapResize, textToParagraphs, updateElement, type Guide, type Handle, type NewElementKind, type Rect,
} from "./editorOps";
import { PreviewModal, TemplatePicker } from "./Library";
import { Properties, type ImageTarget } from "./Properties";
import { useAutosave, useHistory, type SaveStatus } from "./useEditorState";

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const HANDLE_POS: Record<Handle, [number, number]> = { nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5] };

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(element && (element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)));
}

/** Lesson-level shell: slide list on the left, the editor for the chosen slide on the right. */
export default function Builder({ language, lessonId, slideId, onOpen }: {
  language: Language; lessonId: string | null; slideId: string | null; onOpen: (lessonId: string | null, slideId: string | null) => void;
}) {
  const [lessons, setLessons] = useState<AdminLesson[] | null>(null);
  const [lesson, setLesson] = useState<AdminLessonDetail | null>(null);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    if (lessonId) return;
    adminApi.lessons().then((result) => setLessons(result.lessons)).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load lessons."));
  }, [lessonId]);
  useEffect(() => {
    if (!lessonId) { setLesson(null); return; }
    adminApi.lesson(lessonId).then((result) => {
      setLesson(result.lesson);
      if (!slideId && result.lesson.slides[0]) onOpen(lessonId, result.lesson.slides[0].id);
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the lesson."));
  }, [lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSaved = useCallback((saved: AdminSlide) => {
    setLesson((current) => current && { ...current, slides: current.slides.map((item) => (item.id === saved.id ? saved : item)) });
  }, []);

  if (!lessonId) {
    return <>
      <div className="admin-title"><div><h1>Slide Builder</h1><p>{t(language, "Choose a lesson to edit.", "เลือกบทเรียนที่จะแก้ไข")}</p></div></div>
      {error && <Notice>{error}</Notice>}
      <div className="lesson-list" style={{ maxWidth: 520 }}>
        {(lessons ?? []).map((item) => <button key={item.id} className="lesson-item" onClick={() => onOpen(item.id, null)}>
          <b>{item.title}</b><small>{item.category || "—"} · {item.slideCount} {t(language, "slides", "สไลด์")}</small>
        </button>)}
        {lessons && !lessons.length && <p className="mono-dim">{t(language, "> no lessons yet — create one in the Lesson Library", "> ยังไม่มีบทเรียน สร้างได้ในคลังบทเรียน")}</p>}
      </div>
    </>;
  }
  if (!lesson) return <p className="mono-dim">{error || t(language, "loading lesson…", "กำลังโหลดบทเรียน…")}</p>;
  const slide = lesson.slides.find((item) => item.id === slideId) ?? lesson.slides[0];

  return <div className="builder">
    <aside className="builder-slides">
      <button className="link-button" onClick={() => onOpen(null, null)}><ArrowLeft size={14} />{t(language, "Lessons", "บทเรียน")}</button>
      <b className="builder-lesson-title">{lesson.title}</b>
      {lesson.slides.map((item, index) => <button key={item.id} className={`builder-thumb${item.id === slide?.id ? " is-on" : ""}`} onClick={() => onOpen(lesson.id, item.id)} aria-current={item.id === slide?.id ? "true" : undefined}>
        <span className="slide-num">{String(index + 1).padStart(2, "0")}</span>
        <SlideStage><SlideRenderer doc={item.doc} /></SlideStage>
        <small>{item.title || t(language, "Untitled", "ไม่มีชื่อ")}</small>
      </button>)}
      <button className="btn btn--ghost" disabled={lesson.archived} onClick={() => setPicker(true)}><Plus size={14} />{t(language, "Add slide", "เพิ่มสไลด์")}</button>
    </aside>
    {slide ? <SlideEditor key={slide.id} slide={slide} language={language} onSaved={onSaved} readOnly={lesson.archived} />
      : <p className="mono-dim">{t(language, "> this lesson has no slides yet", "> บทเรียนนี้ยังไม่มีสไลด์")}</p>}
    {picker && <TemplatePicker language={language} busy={false} onClose={() => setPicker(false)} onPick={(template) => {
      setPicker(false);
      adminApi.addSlide(lesson.id, { template, title: TEMPLATE_INFO[template].name, afterSlideId: slide?.id })
        .then(async ({ slide: created }) => { setLesson((await adminApi.lesson(lesson.id)).lesson); onOpen(lesson.id, created.id); })
        .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not add the slide."));
    }} />}
  </div>;
}

interface DragState {
  kind: "move" | "resize";
  handle?: Handle;
  startX: number;
  startY: number;
  base: SlideDoc;
  ids: string[];
  startRect: Rect;
  moved: boolean;
}

function SlideEditor({ slide, language, onSaved, readOnly }: { slide: AdminSlide; language: Language; onSaved: (slide: AdminSlide) => void; readOnly: boolean }) {
  const history = useHistory<SlideDoc>(slide.doc);
  const doc = history.present;
  const [title, setTitle] = useState(slide.title);
  const [selection, setSelection] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [previewStep, setPreviewStep] = useState<number | "all">("all");
  const [guides, setGuides] = useState<Guide[]>([]);
  const [preview, setPreview] = useState<null | { fullscreen: boolean }>(null);
  const [imageTarget, setImageTarget] = useState<ImageTarget | null>(null);
  const [scale, setScale] = useState(0.5);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const autosave = useAutosave(slide, onSaved);
  const steps = stepCount(doc);

  // Autosave every committed or transient change (debounced inside the hook).
  useEffect(() => { if (!readOnly) autosave.schedule(title, doc); }, [doc, title]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const update = () => setScale(element.getBoundingClientRect().width / CANVAS_W || 0.5);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const selected = useMemo(() => doc.elements.filter((element) => selection.includes(element.id)), [doc, selection]);
  const visible = (element: SlideElement) => previewStep === "all" || (element.step ?? 0) <= previewStep;

  const apply = useCallback((next: SlideDoc | ((current: SlideDoc) => SlideDoc)) => { if (!readOnly) history.set(next); }, [history, readOnly]);

  const insert = (kind: NewElementKind) => {
    const element = newElement(kind);
    apply((current) => addElement(current, element));
    setSelection([element.id]);
    if (kind === "text") setEditing(element.id);
  };

  // ------------------------------------------------------------ pointer input
  function beginDrag(event: ReactPointerEvent, element: SlideElement, handle?: Handle) {
    if (event.button !== 0 || readOnly) return;
    event.stopPropagation();
    let ids = selection;
    if (event.shiftKey && !handle) {
      ids = selection.includes(element.id) ? selection.filter((id) => id !== element.id) : [...selection, element.id];
      setSelection(ids);
      return;
    }
    if (!selection.includes(element.id)) ids = [element.id];
    setSelection(ids);
    const movable = doc.elements.filter((item) => ids.includes(item.id) && !item.locked);
    if (!movable.length) return;
    drag.current = {
      kind: handle ? "resize" : "move", handle, startX: event.clientX, startY: event.clientY, base: doc,
      ids: handle ? [element.id] : movable.map((item) => item.id), startRect: handle ? { x: element.x, y: element.y, w: element.w, h: element.h } : boundingBox(movable), moved: false,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent) {
    const state = drag.current;
    if (!state) return;
    const dx = (event.clientX - state.startX) / scale;
    const dy = (event.clientY - state.startY) / scale;
    if (!state.moved && Math.hypot(dx * scale, dy * scale) < 3) return;
    state.moved = true;
    const targets = snapGuides(state.base, state.ids);
    const threshold = 6 / scale;
    if (state.kind === "move") {
      const raw = { ...state.startRect, x: state.startRect.x + dx, y: state.startRect.y + dy };
      const snapped = event.altKey ? { rect: { ...raw, x: Math.round(raw.x), y: Math.round(raw.y) }, lines: [] } : snapRect(raw, targets, threshold);
      history.set(moveElements(state.base, state.ids, snapped.rect.x - state.startRect.x, snapped.rect.y - state.startRect.y), "transient");
      setGuides(snapped.lines);
    } else if (state.handle) {
      const raw = resizeRect(state.startRect, state.handle, dx, dy, event.shiftKey);
      const snapped = event.altKey || event.shiftKey ? { rect: raw, lines: [] } : snapResize(raw, state.handle, targets, threshold);
      history.set(updateElement(state.base, state.ids[0], snapped.rect), "transient");
      setGuides(snapped.lines);
    }
  }

  function endDrag() {
    const state = drag.current;
    drag.current = null;
    setGuides([]);
    if (state?.moved) history.commit(state.base);
  }

  // -------------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || preview || readOnly) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === "z") { event.preventDefault(); if (event.shiftKey) history.redo(); else history.undo(); return; }
      if (mod && key === "y") { event.preventDefault(); history.redo(); return; }
      if (mod && key === "a") { event.preventDefault(); setSelection(doc.elements.map((element) => element.id)); return; }
      if (!selection.length) return;
      const unlocked = selected.filter((element) => !element.locked).map((element) => element.id);
      if (mod && key === "d") {
        event.preventDefault();
        const result = duplicateElements(doc, selection);
        history.set(result.doc);
        setSelection(result.newIds);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        history.set(deleteElements(doc, unlocked));
        setSelection(selection.filter((id) => !unlocked.includes(id)));
      } else if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        history.set(moveElements(doc, unlocked, dx, dy));
      } else if (event.key === "Escape") setSelection([]);
      else if (event.key === "Enter" && selected.length === 1 && selected[0].type === "text" && !selected[0].locked) { event.preventDefault(); setEditing(selected[0].id); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, history, selection, selected, preview, readOnly]);

  const editingElement = doc.elements.find((element) => element.id === editing && element.type === "text") as Extract<SlideElement, { type: "text" }> | undefined;
  const renderDoc = editingElement ? { ...doc, elements: doc.elements.filter((element) => element.id !== editing) } : doc;
  const single = selected.length === 1 ? selected[0] : null;

  return <>
    <section className="builder-center">
      <div className="builder-toolbar" role="toolbar" aria-label={t(language, "Insert and edit", "แทรกและแก้ไข")}>
        <button className="btn btn--ghost" disabled={readOnly} onClick={() => insert("text")} title={t(language, "Add text", "เพิ่มข้อความ")}><Type size={15} />{t(language, "Text", "ข้อความ")}</button>
        <InsertMenu language={language} disabled={readOnly} label={t(language, "Shape", "รูปทรง")} icon={<Square size={15} />} items={[
          ["rect", t(language, "Rectangle", "สี่เหลี่ยม"), <Square size={14} key="r" />], ["rounded", t(language, "Rounded", "มุมมน"), <SquareDashed size={14} key="o" />],
          ["ellipse", t(language, "Ellipse", "วงรี"), <Circle size={14} key="e" />], ["line", t(language, "Line", "เส้น"), <Minus size={14} key="l" />],
        ]} onPick={insert} />
        <button className="btn btn--ghost" disabled={readOnly} onClick={() => insert("window")} title={t(language, "Terminal window frame", "กรอบหน้าต่าง")}><AppWindow size={15} />{t(language, "Window", "หน้าต่าง")}</button>
        <InsertMenu language={language} disabled={readOnly} label={t(language, "Live", "สด")} icon={<Radio size={15} />} items={(["join", "live-stats", "challenge", "battle", "leaderboard", "feedback-status"] as WidgetKind[]).map((kind) => [kind, kind, <Radio size={14} key={kind} />])} onPick={insert} />
        <button className="btn btn--ghost" disabled={readOnly} onClick={() => setImageTarget({ mode: "insert" })} title={t(language, "Insert an image", "แทรกรูปภาพ")}><ImageIcon size={15} />{t(language, "Image", "รูปภาพ")}</button>
        <span className="toolbar-sep" />
        <button className="icon-button" disabled={!history.canUndo || readOnly} onClick={history.undo} aria-label={t(language, "Undo", "เลิกทำ")} title="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
        <button className="icon-button" disabled={!history.canRedo || readOnly} onClick={history.redo} aria-label={t(language, "Redo", "ทำซ้ำ")} title="Redo (Ctrl+Shift+Z)"><Redo2 size={15} /></button>
        <span className="toolbar-sep" />
        <label className="toolbar-step">{t(language, "show", "แสดง")}
          <select className="input" value={String(previewStep)} onChange={(event) => setPreviewStep(event.target.value === "all" ? "all" : Number(event.target.value))}>
            <option value="all">{t(language, "all steps", "ทุกขั้น")}</option>
            {Array.from({ length: steps + 1 }, (_, step) => <option key={step} value={step}>{t(language, `step ${step}`, `ขั้น ${step}`)}</option>)}
          </select>
        </label>
        <button className="btn btn--ghost" onClick={() => setPreview({ fullscreen: false })}><Eye size={15} />{t(language, "Preview", "ตัวอย่าง")}</button>
        <button className="icon-button" onClick={() => setPreview({ fullscreen: true })} aria-label={t(language, "Fullscreen preview", "ตัวอย่างเต็มจอ")} title={t(language, "Fullscreen preview", "ตัวอย่างเต็มจอ")}><Maximize size={15} /></button>
        <SaveBadge status={readOnly ? "saved" : autosave.status} language={language} readOnly={readOnly} />
      </div>
      {autosave.status === "conflict" && <div className="notice notice--error builder-conflict" role="alert">
        <span>{t(language, "This slide was changed in another tab or by another admin.", "สไลด์นี้ถูกแก้ไขจากที่อื่น")}</span>
        <button className="btn" onClick={() => void autosave.acceptTheirs().then((latest) => { history.reset(latest.doc); setTitle(latest.title); setSelection([]); })}>{t(language, "Load theirs", "โหลดเวอร์ชันล่าสุด")}</button>
        <button className="btn btn--danger" onClick={() => void autosave.overwrite()}>{t(language, "Keep mine", "ใช้ของฉัน")}</button>
      </div>}
      {autosave.status === "error" && autosave.message && <Notice>{autosave.message}</Notice>}

      <div className="builder-stage-wrap">
        <SlideStage className="builder-stage">
          <div className="builder-canvas" ref={canvasRef}>
            <SlideRenderer doc={renderDoc} step={previewStep} />
            <div className="builder-overlay" onPointerDown={(event) => { if (event.target === event.currentTarget) { setSelection([]); setEditing(null); } }}
              style={{ ["--handle" as string]: `${12 / scale}px`, ["--line" as string]: `${1.5 / scale}px` }}>
              {doc.elements.map((element) => visible(element) && element.id !== editing && <div key={element.id}
                className={`hitbox${selection.includes(element.id) ? " is-selected" : ""}${element.locked ? " is-locked" : ""}`}
                style={{ left: element.x, top: element.y, width: element.w, height: Math.max(element.h, 8) }}
                onPointerDown={(event) => beginDrag(event, element)} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
                onDoubleClick={() => { if (element.type === "text" && !element.locked && !readOnly) { setSelection([element.id]); setEditing(element.id); } }}
                title={element.locked ? t(language, "Locked — unlock in Properties", "ล็อกอยู่ ปลดล็อกได้ในคุณสมบัติ") : undefined} />)}
              {single && !single.locked && !editing && visible(single) && HANDLES.map((handle) => <div key={handle} className={`handle handle--${handle}`}
                style={{ left: single.x + single.w * HANDLE_POS[handle][0], top: single.y + Math.max(single.h, 8) * HANDLE_POS[handle][1] }}
                onPointerDown={(event) => beginDrag(event, single, handle)} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} />)}
              {guides.map((guide, index) => <div key={index} className={`guide guide--${guide.axis}`} style={guide.axis === "x" ? { left: guide.at } : { top: guide.at }} />)}
              {editingElement && <TextEditor element={editingElement} onDone={(text) => {
                if (text !== null && text !== paragraphsToText(editingElement.paragraphs)) apply((current) => updateElement(current, editingElement.id, { paragraphs: textToParagraphs(editingElement.paragraphs, text) }));
                setEditing(null);
              }} />}
            </div>
          </div>
        </SlideStage>
      </div>
      <p className="mono-dim builder-hints">{t(language,
        "Click to select · Shift+click multi-select · drag to move (Alt: no snap) · handles resize (Shift: keep ratio) · double-click text to edit · arrows nudge · Ctrl+D duplicate · Delete · Ctrl+Z / Ctrl+Shift+Z",
        "คลิกเพื่อเลือก · Shift+คลิกเลือกหลายชิ้น · ลากเพื่อย้าย (Alt: ไม่ดูดแนว) · จับมุมเพื่อปรับขนาด (Shift: คงสัดส่วน) · ดับเบิลคลิกข้อความเพื่อแก้ · ลูกศรขยับ · Ctrl+D ทำสำเนา · Delete ลบ · Ctrl+Z / Ctrl+Shift+Z")}</p>
    </section>

    <Properties language={language} doc={doc} title={title} selection={selection} readOnly={readOnly}
      onTitle={setTitle} onSelect={setSelection} onChange={apply} onEditText={(id) => { setSelection([id]); setEditing(id); }} onChooseImage={setImageTarget} />

    {imageTarget && <AssetPicker language={language} onClose={() => setImageTarget(null)}
      title={imageTarget.mode === "background" ? t(language, "choose a background image", "เลือกรูปพื้นหลัง") : t(language, "choose an image", "เลือกรูปภาพ")}
      onPick={(asset) => {
        const target = imageTarget;
        setImageTarget(null);
        if (target.mode === "insert") {
          const element = imageElement(asset);
          apply((current) => addElement(current, element));
          setSelection([element.id]);
        } else if (target.mode === "replace") {
          apply((current) => updateElement(current, target.id, { assetId: asset.id } as Partial<SlideElement>));
        } else {
          apply((current) => ({ ...current, background: { assetId: asset.id } }));
        }
      }} />}

    {preview && <PreviewModal slides={[{ ...slide, title, doc }]} start={0} language={language} startFullscreen={preview.fullscreen} onClose={() => setPreview(null)} />}
  </>;
}

function TextEditor({ element, onDone }: { element: Extract<SlideElement, { type: "text" }>; onDone: (text: string | null) => void }) {
  const [value, setValue] = useState(() => paragraphsToText(element.paragraphs));
  const ref = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const first = element.paragraphs[0];
  const finish = (text: string | null) => { if (done.current) return; done.current = true; onDone(text); };
  return <textarea ref={ref} className="text-editor" value={value} aria-label="Edit text"
    style={{ left: element.x, top: element.y, width: element.w, minHeight: element.h, fontSize: first?.size ?? 32, fontFamily: first?.font === "mono" ? "var(--mono)" : "var(--sans)", textAlign: first?.align ?? "left" }}
    onChange={(event) => setValue(event.target.value)}
    onPointerDown={(event) => event.stopPropagation()}
    onBlur={() => finish(value)}
    onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); finish(null); }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); finish(value); }
    }} />;
}

function InsertMenu<K extends string>({ label, icon, items, onPick, disabled, language }: {
  label: string; icon: React.ReactNode; items: Array<[K, string, React.ReactNode]>; onPick: (kind: K) => void; disabled: boolean; language: Language;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);
  return <div className="insert-menu" ref={ref}>
    <button className="btn btn--ghost" disabled={disabled} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>{icon}{label} ▾</button>
    {open && <div className="insert-menu-list" role="menu" aria-label={label}>
      {items.map(([kind, text, itemIcon]) => <button key={kind} role="menuitem" onClick={() => { setOpen(false); onPick(kind); }}>{itemIcon}{text}</button>)}
      {items.length > 4 && <span className="mono-dim">{t(language, "live data appears in Presenter Mode", "ข้อมูลสดแสดงในโหมดผู้สอน")}</span>}
    </div>}
  </div>;
}

function SaveBadge({ status, language, readOnly }: { status: SaveStatus; language: Language; readOnly: boolean }) {
  const label = readOnly ? t(language, "archived · read-only", "เก็บถาวร · อ่านอย่างเดียว") : {
    saved: t(language, "saved", "บันทึกแล้ว"), unsaved: t(language, "unsaved…", "ยังไม่บันทึก…"), saving: t(language, "saving…", "กำลังบันทึก…"),
    conflict: t(language, "conflict", "ขัดแย้ง"), error: t(language, "not saved", "บันทึกไม่สำเร็จ"),
  }[status];
  return <span className={`save-badge is-${readOnly ? "saved" : status}`} role="status" aria-live="polite"><i />{label}</span>;
}
