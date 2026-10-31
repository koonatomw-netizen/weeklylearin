import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, Download, Eye, Maximize, Pencil, Plus, Trash2, X } from "lucide-react";
import { useFullscreen } from "../PresenterScreen";
import { SlideStage } from "../slides/Deck";
import { SlideRenderer } from "../slides/SlideRenderer";
import { weekId } from "../shared/curriculum";
import { stepCount } from "../shared/slideDoc";
import { TEMPLATE_IDS, TEMPLATE_INFO, createFromTemplate, type TemplateId } from "../shared/templates";
import type { Language } from "../shared/types";
import { Notice, TerminalWindow, t } from "../ui";
import { adminApi, type AdminLesson, type AdminLessonDetail, type AdminSlide } from "./adminApi";

/** Lesson ids of weeks 3 to 12; the import button shows while any of them is missing. */
const CURRICULUM_IDS = Array.from({ length: 10 }, (_, index) => weekId(index + 3));

export default function Library({ language, onEdit }: { language: Language; onEdit: (lessonId: string, slideId: string | null) => void }) {
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminLessonDetail | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<{ afterSlideId?: string } | null>(null);
  const [preview, setPreview] = useState<number | null>(null);

  const fail = (caught: unknown) => setError(caught instanceof Error ? caught.message : "Something went wrong.");
  const loadLessons = useCallback(async () => {
    const { lessons: list } = await adminApi.lessons(showArchived);
    setLessons(list);
    return list;
  }, [showArchived]);
  const loadDetail = useCallback(async (id: string) => setDetail((await adminApi.lesson(id)).lesson), []);

  useEffect(() => {
    loadLessons().then((list) => setSelected((current) => current ?? list[0]?.id ?? null)).catch(fail);
  }, [loadLessons]);
  useEffect(() => { if (selected) loadDetail(selected).catch(fail); else setDetail(null); }, [selected, loadDetail]);

  /** Run a mutation with a busy flag and shared error handling, then refresh the list. */
  async function run(work: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try { await work(); await loadLessons(); }
    catch (caught) {
      fail(caught);
      if (selected) await loadDetail(selected).catch(() => undefined);
    } finally { setBusy(false); }
  }

  const createLesson = (event: React.FormEvent) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    void run(async () => { const { lesson } = await adminApi.createLesson({ title }); setNewTitle(""); setSelected(lesson.id); setDetail(lesson); });
  };
  const seedWeek02 = () => void run(async () => { const { lesson } = await adminApi.seedWeek02(); setSelected(lesson.id); setDetail(lesson); setNotice(t(language, "Week 02 imported. A draft plan with its challenge, cases and feedback wording is waiting in the Weekly Planner: review it, then publish.", "นำเข้าสัปดาห์ที่ 2 แล้ว มีแผนฉบับร่างพร้อมโจทย์ เคส และคำถามแบบสอบถามรออยู่ใน Weekly Planner ตรวจแล้วเผยแพร่ได้เลย")); });
  const seedCurriculum = () => void run(async () => { const { results } = await adminApi.seedCurriculum(); const added = results.filter((row) => row.status === "imported").length; setNotice(t(language, `Imported ${added} weeks (3 to 12). Each has a draft plan with its games in the Weekly Planner. Review, then publish.`, `นำเข้า ${added} สัปดาห์ (3 ถึง 12) แต่ละสัปดาห์มีแผนฉบับร่างพร้อมเกมใน Weekly Planner ตรวจแล้วเผยแพร่ได้เลย`)); });
  const seedHeadToHead = () => void run(async () => { const { lesson } = await adminApi.seedHeadToHead(); setSelected(lesson.id); setDetail(lesson); setNotice(t(language, "Head-to-Head imported. Paste your prepared ChatGPT and Claude answers over the [placeholders] on the round slides before using it. A draft plan with the poll is in the Weekly Planner.", "นำเข้า Head-to-Head แล้ว วางคำตอบ ChatGPT และ Claude ที่เตรียมไว้แทนข้อความใน [วงเล็บ] บนสไลด์แต่ละรอบก่อนใช้ มีแผนฉบับร่างพร้อมโพลอยู่ใน Weekly Planner")); });
  const seed = () => void run(async () => { const { lesson } = await adminApi.seedWeek01(); setSelected(lesson.id); setDetail(lesson); });

  const replaceSlide = (slide: AdminSlide) => setDetail((current) => current && { ...current, slides: current.slides.map((item) => (item.id === slide.id ? slide : item)) });
  const move = (index: number, delta: -1 | 1) => detail && void run(async () => {
    const ids = detail.slides.map((slide) => slide.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    setDetail((await adminApi.reorder(detail.id, ids)).lesson);
  });

  return <>
    <div className="admin-title">
      <div><h1>Lesson Library</h1><p>{t(language, "Reusable lessons and slides. Use the pencil to edit a slide in the Slide Builder.", "บทเรียนและสไลด์ที่ใช้ซ้ำได้ กดรูปดินสอเพื่อแก้ไขสไลด์ใน Slide Builder")}</p></div>
    </div>
    {error && <Notice>{error}</Notice>}
    {notice && <Notice kind="success">{notice}</Notice>}
    <div className="library">
      <aside className="lesson-list">
        <form onSubmit={createLesson} className="button-row">
          <input className="input" value={newTitle} maxLength={120} onChange={(event) => setNewTitle(event.target.value)} placeholder={t(language, "New lesson title", "ชื่อบทเรียนใหม่")} aria-label={t(language, "New lesson title", "ชื่อบทเรียนใหม่")} style={{ flex: 1, minWidth: 0 }} />
          <button className="btn btn--accent" type="submit" disabled={busy || !newTitle.trim()} aria-label={t(language, "Create lesson", "สร้างบทเรียน")}><Plus size={15} /></button>
        </form>
        {(() => { const week01 = lessons.find((lesson) => lesson.id === "week01-starter"); return !week01 || (week01.slideCount < 13 && !lessons.some((lesson) => lesson.id === "week01-skills-starter")); })() && <button className="btn btn--ghost" disabled={busy} onClick={seed}><Download size={15} />{t(language, "Import Week 01 starter lessons", "นำเข้าบทเรียนสัปดาห์ที่ 1")}</button>}
        {!lessons.some((lesson) => lesson.id === "week02-starter") && <button className="btn btn--ghost" disabled={busy} onClick={seedWeek02}><Download size={15} />{t(language, "Import Week 02 starter", "นำเข้าสัปดาห์ที่ 2")}</button>}
        {CURRICULUM_IDS.some((lessonId) => !lessons.some((lesson) => lesson.id === lessonId)) && <button className="btn btn--ghost" disabled={busy} onClick={seedCurriculum}><Download size={15} />{t(language, "Import Weeks 3 to 12", "นำเข้าสัปดาห์ที่ 3 ถึง 12")}</button>}
        {!lessons.some((lesson) => lesson.id === "head2head-starter") && <button className="btn btn--ghost" disabled={busy} onClick={seedHeadToHead}><Download size={15} />{t(language, "Import Head-to-Head segment", "นำเข้า Head-to-Head")}</button>}
        {lessons.map((lesson) => <button key={lesson.id} className={`lesson-item${selected === lesson.id ? " is-on" : ""}${lesson.archived ? " is-archived" : ""}`} onClick={() => setSelected(lesson.id)}>
          <b>{lesson.title}</b>
          <small>{lesson.category || "—"} · {lesson.slideCount} {t(language, "slides", "สไลด์")}{lesson.archived ? " · archived" : ""}</small>
        </button>)}
        {!lessons.length && <p className="mono-dim">{t(language, "> no lessons yet — create one or import Week 01", "> ยังไม่มีบทเรียน")}</p>}
        <label className="hint" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />{t(language, "Show archived", "แสดงที่เก็บถาวร")}
        </label>
      </aside>

      {detail ? <section style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <LessonHeader key={detail.id + detail.updatedAt} lesson={detail} language={language} busy={busy}
          onSave={(data) => void run(async () => setDetail((await adminApi.updateLesson(detail.id, data)).lesson))} />
        <div className="button-row">
          <button className="btn btn--accent" disabled={busy || detail.archived} onClick={() => setPicker({})}><Plus size={15} />{t(language, "Add slide", "เพิ่มสไลด์")}</button>
          {detail.slides.length > 0 && <button className="btn" onClick={() => onEdit(detail.id, null)}><Pencil size={15} />{t(language, "Open in Builder", "เปิดใน Builder")}</button>}
          {detail.slides.length > 0 && <button className="btn" onClick={() => setPreview(0)}><Eye size={15} />{t(language, "Preview lesson", "ดูตัวอย่างบทเรียน")}</button>}
          <span className="mono-dim">{detail.slides.length} {t(language, "slides", "สไลด์")}</span>
        </div>
        {detail.slides.length ? <div className="slide-grid">
          {detail.slides.map((slide, index) => <SlideCard key={slide.id} slide={slide} index={index} count={detail.slides.length} language={language} busy={busy} archived={detail.archived}
            onPreview={() => setPreview(index)}
            onEdit={() => onEdit(detail.id, slide.id)}
            onRename={(title) => void run(async () => replaceSlide((await adminApi.updateSlide(slide.id, { version: slide.version, title })).slide))}
            onMove={(delta) => move(index, delta)}
            onDuplicate={() => void run(async () => { await adminApi.addSlide(detail.id, { duplicateOf: slide.id, afterSlideId: slide.id }); await loadDetail(detail.id); })}
            onInsertAfter={() => setPicker({ afterSlideId: slide.id })}
            onDelete={() => {
              if (!window.confirm(t(language, `Delete slide "${slide.title || index + 1}"? This cannot be undone.`, `ลบสไลด์ "${slide.title || index + 1}"? ย้อนกลับไม่ได้`))) return;
              void run(async () => { await adminApi.deleteSlide(slide.id); await loadDetail(detail.id); });
            }} />)}
        </div> : <TerminalWindow title="empty.lesson"><p className="mono-dim">{t(language, "> this lesson has no slides — add one from a template", "> บทเรียนนี้ยังไม่มีสไลด์")}</p></TerminalWindow>}
      </section> : <p className="mono-dim">{t(language, "> select a lesson", "> เลือกบทเรียน")}</p>}
    </div>

    {picker && detail && <TemplatePicker language={language} busy={busy} onClose={() => setPicker(null)} onPick={(template) => void run(async () => {
      await adminApi.addSlide(detail.id, { template, title: TEMPLATE_INFO[template].name, afterSlideId: picker.afterSlideId });
      setPicker(null);
      await loadDetail(detail.id);
    })} />}
    {preview !== null && detail?.slides[preview] && <PreviewModal slides={detail.slides} start={preview} language={language} onClose={() => setPreview(null)} />}
  </>;
}

function LessonHeader({ lesson, language, busy, onSave }: { lesson: AdminLessonDetail; language: Language; busy: boolean; onSave: (data: Partial<{ title: string; category: string; archived: boolean }>) => void }) {
  const [title, setTitle] = useState(lesson.title);
  const [category, setCategory] = useState(lesson.category);
  const dirty = title.trim() !== lesson.title || category.trim() !== lesson.category;
  return <TerminalWindow title={`lesson · ${lesson.id.slice(0, 8)}`} right={lesson.archived ? <span className="mini-tag">archived</span> : undefined}>
    <div className="lesson-head">
      <label><span className="field-label">{t(language, "title", "ชื่อบทเรียน")}</span><input className="input" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></label>
      <label><span className="field-label">{t(language, "category", "หมวดหมู่")}</span><input className="input" value={category} maxLength={60} onChange={(event) => setCategory(event.target.value)} /></label>
      <div className="button-row">
        <button className="btn btn--accent" disabled={busy || !dirty || !title.trim()} onClick={() => onSave({ title: title.trim(), category: category.trim() })}>{t(language, "Save", "บันทึก")}</button>
        <button className="btn btn--ghost" disabled={busy} onClick={() => onSave({ archived: !lesson.archived })}>{lesson.archived ? <><ArchiveRestore size={15} />{t(language, "Restore", "กู้คืน")}</> : <><Archive size={15} />{t(language, "Archive", "เก็บถาวร")}</>}</button>
      </div>
    </div>
  </TerminalWindow>;
}

function SlideCard({ slide, index, count, language, busy, archived, onPreview, onEdit, onRename, onMove, onDuplicate, onInsertAfter, onDelete }: {
  slide: AdminSlide; index: number; count: number; language: Language; busy: boolean; archived: boolean;
  onPreview: () => void; onEdit: () => void; onRename: (title: string) => void; onMove: (delta: -1 | 1) => void; onDuplicate: () => void; onInsertAfter: () => void; onDelete: () => void;
}) {
  const [title, setTitle] = useState(slide.title);
  useEffect(() => setTitle(slide.title), [slide.title]);
  const steps = stepCount(slide.doc);
  const live = slide.doc.elements.some((element) => element.type === "widget");
  return <article className="slide-card">
    <div onClick={onPreview} role="button" tabIndex={0} aria-label={t(language, `Preview slide ${index + 1}`, `ดูสไลด์ ${index + 1}`)} onKeyDown={(event) => { if (event.key === "Enter") onPreview(); }}>
      <SlideStage><SlideRenderer doc={slide.doc} /></SlideStage>
    </div>
    <div className="slide-card-body">
      <div className="slide-card-top">
        <span className="slide-num">{String(index + 1).padStart(2, "0")}</span>
        <input className="input" value={title} maxLength={120} disabled={archived} aria-label={t(language, "Slide title", "ชื่อสไลด์")}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => { if (title.trim() !== slide.title) onRename(title.trim()); }}
          onKeyDown={(event) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); }} />
      </div>
      <div className="slide-tags">
        {live && <span className="mini-tag mini-tag--live">live</span>}
        {steps > 0 && <span className="mini-tag">{steps} {t(language, "steps", "ขั้น")}</span>}
        {slide.doc.notes && <span className="mini-tag">notes</span>}
        <span className="mini-tag">v{slide.version}</span>
      </div>
      {!archived && <div className="icon-row">
        <button className="icon-button" onClick={onEdit} aria-label={t(language, "Edit in Builder", "แก้ไขใน Builder")} title={t(language, "Edit in Builder", "แก้ไขใน Builder")}><Pencil size={14} /></button>
        <button className="icon-button" disabled={busy || index === 0} onClick={() => onMove(-1)} aria-label={t(language, "Move up", "เลื่อนขึ้น")} title={t(language, "Move earlier", "เลื่อนขึ้น")}><ArrowUp size={14} /></button>
        <button className="icon-button" disabled={busy || index === count - 1} onClick={() => onMove(1)} aria-label={t(language, "Move down", "เลื่อนลง")} title={t(language, "Move later", "เลื่อนลง")}><ArrowDown size={14} /></button>
        <button className="icon-button" disabled={busy} onClick={onDuplicate} aria-label={t(language, "Duplicate", "ทำสำเนา")} title={t(language, "Duplicate", "ทำสำเนา")}><Copy size={14} /></button>
        <button className="icon-button" disabled={busy} onClick={onInsertAfter} aria-label={t(language, "Insert slide after", "แทรกสไลด์ถัดไป")} title={t(language, "Insert slide after", "แทรกสไลด์ถัดไป")}><Plus size={14} /></button>
        <button className="icon-button" disabled={busy} onClick={onDelete} aria-label={t(language, "Delete", "ลบ")} title={t(language, "Delete", "ลบ")} style={{ marginLeft: "auto" }}><Trash2 size={14} /></button>
      </div>}
    </div>
  </article>;
}

export function TemplatePicker({ language, busy, onClose, onPick }: { language: Language; busy: boolean; onClose: () => void; onPick: (template: TemplateId) => void }) {
  // Preview docs are generated once; ids only need to be unique within each preview.
  const previews = useMemo(() => {
    let counter = 0;
    return TEMPLATE_IDS.map((id) => ({ id, doc: createFromTemplate(id, () => `p${++counter}`) }));
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={t(language, "Choose a template", "เลือกเทมเพลต")} onClick={(event) => event.stopPropagation()}>
      <div className="modal-head"><span className="grow">{t(language, "choose a template", "เลือกเทมเพลต")}</span><button className="icon-button" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
      <div className="modal-body"><div className="template-grid">
        {previews.map(({ id, doc }) => <button key={id} className="template-card" disabled={busy} onClick={() => onPick(id)}>
          <SlideStage><SlideRenderer doc={doc} /></SlideStage>
          <b>{TEMPLATE_INFO[id].name}{TEMPLATE_INFO[id].live && <span className="mini-tag mini-tag--live" style={{ marginLeft: 6 }}>live</span>}</b>
          <small>{TEMPLATE_INFO[id].nameTh}</small>
        </button>)}
      </div></div>
    </div>
  </div>;
}

export function PreviewModal({ slides, start, language, onClose, startFullscreen = false }: { slides: AdminSlide[]; start: number; language: Language; onClose: () => void; startFullscreen?: boolean }) {
  const [index, setIndex] = useState(start);
  const [step, setStep] = useState(0);
  const fullscreen = useFullscreen();
  // Opened from a click, so the browser still allows entering fullscreen here.
  useEffect(() => { if (startFullscreen) fullscreen.toggle(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const slide = slides[index];
  const steps = stepCount(slide.doc);

  const advance = useCallback((direction: 1 | -1) => {
    if (direction === 1) {
      if (step < steps) setStep(step + 1);
      else if (index < slides.length - 1) { setIndex(index + 1); setStep(0); }
    } else if (step > 0) setStep(step - 1);
    else if (index > 0) { setIndex(index - 1); setStep(stepCount(slides[index - 1].doc)); }
  }, [index, step, steps, slides]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); advance(1); }
      else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); advance(-1); }
      else if (event.key === "f" || event.key === "F") fullscreen.toggle();
      else if (event.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, fullscreen, onClose]);

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={t(language, "Slide preview", "ดูตัวอย่างสไลด์")} onClick={(event) => event.stopPropagation()}>
      <div className="modal-head">
        <span className="grow">{String(index + 1).padStart(2, "0")}/{String(slides.length).padStart(2, "0")} · {slide.title}{steps > 0 && ` · step ${step}/${steps}`}</span>
        <button className="icon-button" onClick={() => advance(-1)} aria-label={t(language, "Previous", "ก่อนหน้า")}><ChevronLeft size={16} /></button>
        <button className="icon-button" onClick={() => advance(1)} aria-label={t(language, "Next", "ถัดไป")}><ChevronRight size={16} /></button>
        <button className="icon-button" onClick={fullscreen.toggle} aria-label={t(language, "Fullscreen", "เต็มจอ")}><Maximize size={15} /></button>
        <button className="icon-button" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </div>
      <div className="modal-body">
        <div className="preview-shell" ref={fullscreen.ref}>
          <SlideStage><SlideRenderer doc={slide.doc} step={step} /></SlideStage>
        </div>
        <p className="mono-dim">← → / Space · F {t(language, "fullscreen", "เต็มจอ")} · Esc {t(language, "close", "ปิด")} · {t(language, "Live widgets show placeholders here; they display session data in Presenter Mode (Phase 4).", "ส่วนสดแสดงตัวอย่างที่นี่ และจะแสดงข้อมูลจริงในโหมดผู้สอน (เฟส 4)")}</p>
        {slide.doc.notes && <div className="notes-box"><b>{t(language, "Presenter notes", "บันทึกผู้สอน")}:</b> {slide.doc.notes}</div>}
      </div>
    </div>
  </div>;
}
