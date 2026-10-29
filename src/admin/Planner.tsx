import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, CalendarDays, Copy, Eye, Plus, Radio, Rocket, Save, Trash2, X } from "lucide-react";
import { tokens } from "../api";
import { SlideStage } from "../slides/Deck";
import { SlideRenderer } from "../slides/SlideRenderer";
import type { Challenge, FeedbackQuestions } from "../shared/deck";
import type { Situation } from "../shared/situations";
import type { SlideDoc } from "../shared/slideDoc";
import type { Language } from "../shared/types";
import { Notice, TerminalWindow, t } from "../ui";
import { adminApi, type AdminLesson, type AdminLessonDetail, type AdminPlan, type AdminPlanDetail, type AdminSlide } from "./adminApi";
import { FeedbackEditor, SituationsEditor } from "./PlanContentEditors";
import { PreviewModal } from "./Library";

/** Open a presenter tab for a freshly started session (the host token stays in this browser). */
export async function startLiveSession(snapshotId: string): Promise<string> {
  const session = await adminApi.startSession(snapshotId);
  tokens.setHost(session.roomCode, session.hostToken);
  window.open(`/?view=host&room=${session.roomCode}`, `4seas-host-${session.roomCode}`);
  return session.roomCode;
}

const asPreviewSlides = (slides: Array<{ title: string; doc: SlideDoc }>): AdminSlide[] =>
  slides.map((slide, index) => ({ id: `preview-${index}`, lessonId: "", position: index, title: slide.title, doc: slide.doc, version: 1, updatedAt: "" }));

export default function Planner({ language }: { language: Language }) {
  const [plans, setPlans] = useState<AdminPlan[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(() => new URL(window.location.href).searchParams.get("plan"));
  const [title, setTitle] = useState("");
  const [weekDate, setWeekDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => adminApi.plans().then((result) => setPlans(result.plans)).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load plans.")), []);
  useEffect(() => { void load(); }, [load]);

  const open = (id: string | null) => {
    setOpenId(id);
    const params = new URLSearchParams({ view: "admin", tab: "planner" });
    if (id) params.set("plan", id);
    window.history.replaceState({}, "", `/?${params}`);
    if (!id) void load();
  };

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !title.trim()) return;
    setBusy(true);
    setError("");
    try { const { plan } = await adminApi.createPlan({ title: title.trim(), weekDate: weekDate || null }); setTitle(""); setWeekDate(""); open(plan.id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create the plan."); }
    finally { setBusy(false); }
  }

  async function duplicate(id: string) {
    setBusy(true);
    setError("");
    try { const { plan } = await adminApi.copyPlan(id); open(plan.id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not duplicate the plan."); }
    finally { setBusy(false); }
  }

  if (openId) return <PlanEditor key={openId} planId={openId} language={language} onBack={() => open(null)} onOpen={open} />;

  return <>
    <div className="admin-title"><div><h1>Weekly Planner</h1><p>{t(language, "Plan each week's session, then publish a frozen version to teach from.", "วางแผนแต่ละสัปดาห์ แล้วเผยแพร่เวอร์ชันที่ล็อกไว้เพื่อใช้สอน")}</p></div></div>
    {error && <Notice>{error}</Notice>}
    <TerminalWindow title="new-plan">
      <form className="plan-new" onSubmit={create}>
        <label><span className="field-label">{t(language, "title", "ชื่อแผน")}</span><input className="input" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder={t(language, "e.g. Week 02 · Handling complaints", "เช่น สัปดาห์ที่ 2 · การรับมือคำร้องเรียน")} /></label>
        <label><span className="field-label">{t(language, "week of", "สัปดาห์ของวันที่")}</span><input className="input" type="date" value={weekDate} onChange={(event) => setWeekDate(event.target.value)} /></label>
        <button className="btn btn--accent" type="submit" disabled={busy || !title.trim()}><Plus size={15} />{t(language, "Create plan", "สร้างแผน")}</button>
      </form>
    </TerminalWindow>
    {plans === null ? <p className="mono-dim">{t(language, "loading plans…", "กำลังโหลดแผน…")}</p> : plans.length ? <div className="plan-list">
      {plans.map((plan) => <article key={plan.id} className="plan-card">
        <header><CalendarDays size={16} /><span className="mono">{plan.weekDate ?? t(language, "no date", "ไม่ระบุวันที่")}</span><PlanStatus plan={plan} language={language} /></header>
        <b>{plan.title}</b>
        <span className="mono-dim">{plan.slideCount} {t(language, "slides", "สไลด์")}{plan.durationMin ? ` · ${plan.durationMin} min` : ""}</span>
        <div className="button-row button-row--tight">
          <button className="btn btn--accent" onClick={() => open(plan.id)}>{t(language, "Open", "เปิด")}</button>
          <button className="btn btn--ghost" disabled={busy} onClick={() => void duplicate(plan.id)}><Copy size={14} />{t(language, "Duplicate", "ทำสำเนา")}</button>
        </div>
      </article>)}
    </div> : <p className="mono-dim">{t(language, "> no plans yet — create this week's plan above", "> ยังไม่มีแผน สร้างแผนสัปดาห์นี้ได้ด้านบน")}</p>}
  </>;
}

export function PlanStatus({ plan, language }: { plan: Pick<AdminPlan, "latestVersion" | "hasUnpublishedChanges">; language: Language }) {
  if (!plan.latestVersion) return <span className="status-chip is-pending"><i />{t(language, "draft", "ฉบับร่าง")}</span>;
  return <span className={`status-chip ${plan.hasUnpublishedChanges ? "is-closed" : "is-revealed"}`}><i />v{plan.latestVersion}{plan.hasUnpublishedChanges ? ` · ${t(language, "unpublished changes", "มีการแก้ที่ยังไม่เผยแพร่")}` : ` · ${t(language, "published", "เผยแพร่แล้ว")}`}</span>;
}

interface Draft { title: string; weekDate: string; durationMin: string; notes: string; challenge: Challenge; situations: Situation[] | null; feedbackQuestions: FeedbackQuestions | null; slides: Array<{ slideId: string; title: string; lessonTitle: string; doc: SlideDoc }> }

function toDraft(plan: AdminPlanDetail): Draft {
  return {
    title: plan.title, weekDate: plan.weekDate ?? "", durationMin: plan.durationMin ? String(plan.durationMin) : "", notes: plan.notes,
    challenge: plan.challenge, situations: plan.situations, feedbackQuestions: plan.feedbackQuestions, slides: plan.slides.map((slide) => ({ slideId: slide.slideId, title: slide.title, lessonTitle: slide.lessonTitle, doc: slide.doc })),
  };
}

function PlanEditor({ planId, language, onBack, onOpen }: { planId: string; language: Language; onBack: () => void; onOpen: (id: string | null) => void }) {
  const [plan, setPlan] = useState<AdminPlanDetail | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [lesson, setLesson] = useState<AdminLessonDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<AdminSlide[] | null>(null);

  useEffect(() => {
    adminApi.plan(planId).then(({ plan: loaded }) => { setPlan(loaded); setDraft(toDraft(loaded)); }).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the plan."));
    adminApi.lessons().then(({ lessons: list }) => setLessons(list)).catch(() => undefined);
  }, [planId]);

  const dirty = useMemo(() => Boolean(plan && draft && JSON.stringify(toDraft(plan)) !== JSON.stringify(draft)), [plan, draft]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!plan || !draft) return <p className="mono-dim">{error || t(language, "loading plan…", "กำลังโหลดแผน…")}</p>;
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const setChallenge = (key: keyof Challenge, value: string) => set({ challenge: { ...draft.challenge, [key]: value } });
  const moveSlide = (index: number, delta: -1 | 1) => {
    const slides = [...draft.slides];
    [slides[index], slides[index + delta]] = [slides[index + delta], slides[index]];
    set({ slides });
  };

  async function run<T>(work: () => Promise<T>): Promise<T | undefined> {
    if (busy) return undefined;
    setBusy(true);
    setError("");
    setNotice("");
    try { return await work(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Something went wrong."); return undefined; }
    finally { setBusy(false); }
  }

  const save = async () => {
    if (!draft) return plan;
    const { plan: saved } = await adminApi.updatePlan(plan.id, {
      title: draft.title, weekDate: draft.weekDate || null, durationMin: draft.durationMin ? Number(draft.durationMin) : null, notes: draft.notes,
      challenge: draft.challenge, situations: draft.situations, feedbackQuestions: draft.feedbackQuestions, slideIds: draft.slides.map((slide) => slide.slideId),
    });
    setPlan(saved);
    setDraft(toDraft(saved));
    return saved;
  };

  const publish = () => run(async () => {
    if (!window.confirm(t(language, `Publish version ${(plan.latestVersion ?? 0) + 1}? It will be frozen: later edits to the library will not change it.`, `เผยแพร่เวอร์ชัน ${(plan.latestVersion ?? 0) + 1}? เวอร์ชันนี้จะถูกล็อก การแก้ไขคลังภายหลังจะไม่กระทบ`))) return;
    if (dirty) await save();
    const result = await adminApi.publishPlan(plan.id);
    setPlan(result.plan);
    setDraft(toDraft(result.plan));
    setNotice(t(language, `Published version ${result.snapshot.version}. Start a live session from it below.`, `เผยแพร่เวอร์ชัน ${result.snapshot.version} แล้ว เริ่มห้องเรียนสดได้ด้านล่าง`));
  });

  return <>
    <div className="admin-title">
      <div>
        <button className="link-button" onClick={() => { if (!dirty || window.confirm(t(language, "Leave without saving your changes?", "ออกโดยไม่บันทึก?"))) onBack(); }}><ArrowLeft size={14} />{t(language, "All plans", "แผนทั้งหมด")}</button>
        <h1>{draft.title || t(language, "Untitled plan", "แผนไม่มีชื่อ")}</h1>
        <PlanStatus plan={plan} language={language} />
      </div>
      <div className="button-row">
        {dirty && <span className="save-badge is-unsaved"><i />{t(language, "unsaved changes", "ยังไม่บันทึก")}</span>}
        <button className="btn" disabled={busy || !dirty} onClick={() => void run(save)}><Save size={15} />{t(language, "Save draft", "บันทึกร่าง")}</button>
        <button className="btn" disabled={!draft.slides.length} onClick={() => setPreview(asPreviewSlides(draft.slides))}><Eye size={15} />{t(language, "Preview", "ตัวอย่าง")}</button>
        <button className="btn btn--accent" disabled={busy || !draft.slides.length} onClick={() => void publish()}><Rocket size={15} />{t(language, `Publish v${(plan.latestVersion ?? 0) + 1}`, `เผยแพร่ v${(plan.latestVersion ?? 0) + 1}`)}</button>
      </div>
    </div>
    {error && <Notice>{error}</Notice>}
    {notice && <Notice kind="success">{notice}</Notice>}

    <div className="plan-grid">
      <TerminalWindow title="plan.details">
        <div className="geometry geometry--2">
          <label className="props-field"><span className="field-label">{t(language, "title", "ชื่อแผน")}</span><input className="input" value={draft.title} maxLength={120} onChange={(event) => set({ title: event.target.value })} /></label>
          <label className="props-field"><span className="field-label">{t(language, "week of", "สัปดาห์ของวันที่")}</span><input className="input" type="date" value={draft.weekDate} onChange={(event) => set({ weekDate: event.target.value })} /></label>
          <label className="props-field"><span className="field-label">{t(language, "duration (minutes)", "ระยะเวลา (นาที)")}</span><input className="input" inputMode="numeric" value={draft.durationMin} onChange={(event) => set({ durationMin: event.target.value.replace(/\D/g, "").slice(0, 3) })} /></label>
        </div>
        <label className="props-field"><span className="field-label">{t(language, "notes (admin only)", "บันทึก (เฉพาะผู้ดูแล)")}</span><textarea className="input" rows={3} maxLength={2000} value={draft.notes} onChange={(event) => set({ notes: event.target.value })} /></label>
      </TerminalWindow>
      <TerminalWindow title="prompt-battle.challenge">
        <p className="hint">{t(language, "Shown to participants and on challenge slides. Thai is optional (falls back to English).", "แสดงให้ผู้เข้าร่วมและบนสไลด์โจทย์ ภาษาไทยไม่บังคับ (ใช้ภาษาอังกฤษแทน)")}</p>
        <div className="geometry geometry--2">
          <label className="props-field"><span className="field-label">title (EN)</span><input className="input" maxLength={80} value={draft.challenge.titleEn} onChange={(event) => setChallenge("titleEn", event.target.value)} /></label>
          <label className="props-field"><span className="field-label">title (TH)</span><input className="input" maxLength={80} value={draft.challenge.titleTh} onChange={(event) => setChallenge("titleTh", event.target.value)} /></label>
          <label className="props-field"><span className="field-label">scenario (EN)</span><textarea className="input" rows={3} maxLength={600} value={draft.challenge.scenarioEn} onChange={(event) => setChallenge("scenarioEn", event.target.value)} /></label>
          <label className="props-field"><span className="field-label">scenario (TH)</span><textarea className="input" rows={3} maxLength={600} value={draft.challenge.scenarioTh} onChange={(event) => setChallenge("scenarioTh", event.target.value)} /></label>
          <label className="props-field"><span className="field-label">task (EN)</span><textarea className="input" rows={3} maxLength={600} value={draft.challenge.taskEn} onChange={(event) => setChallenge("taskEn", event.target.value)} /></label>
          <label className="props-field"><span className="field-label">task (TH)</span><textarea className="input" rows={3} maxLength={600} value={draft.challenge.taskTh} onChange={(event) => setChallenge("taskTh", event.target.value)} /></label>
        </div>
      </TerminalWindow>
    </div>

    <SituationsEditor situations={draft.situations} onChange={(situations) => set({ situations })} language={language} />
    <FeedbackEditor questions={draft.feedbackQuestions} onChange={(feedbackQuestions) => set({ feedbackQuestions })} language={language} />

    <div className="plan-builder">
      <TerminalWindow title={`plan.slides (${draft.slides.length})`}>
        {draft.slides.length ? <ol className="plan-slides">
          {draft.slides.map((slide, index) => <li key={`${slide.slideId}-${index}`}>
            <span className="slide-num">{String(index + 1).padStart(2, "0")}</span>
            <div className="plan-thumb" onClick={() => setPreview(asPreviewSlides(draft.slides).slice(index))}><SlideStage><SlideRenderer doc={slide.doc} /></SlideStage></div>
            <div className="plan-slide-text"><b>{slide.title || t(language, "Untitled", "ไม่มีชื่อ")}</b><span className="mono-dim">{slide.lessonTitle}</span></div>
            <div className="icon-row">
              <button className="icon-button" disabled={index === 0} onClick={() => moveSlide(index, -1)} aria-label={t(language, "Move up", "เลื่อนขึ้น")}><ArrowUp size={14} /></button>
              <button className="icon-button" disabled={index === draft.slides.length - 1} onClick={() => moveSlide(index, 1)} aria-label={t(language, "Move down", "เลื่อนลง")}><ArrowDown size={14} /></button>
              <button className="icon-button" onClick={() => set({ slides: draft.slides.filter((_, i) => i !== index) })} aria-label={t(language, "Remove from plan", "เอาออกจากแผน")}><X size={14} /></button>
            </div>
          </li>)}
        </ol> : <p className="mono-dim">{t(language, "> add slides from the library →", "> เพิ่มสไลด์จากคลัง →")}</p>}
      </TerminalWindow>
      <TerminalWindow title="library">
        <select className="input" value={lesson?.id ?? ""} onChange={(event) => {
          const id = event.target.value;
          if (!id) { setLesson(null); return; }
          adminApi.lesson(id).then(({ lesson: detail }) => setLesson(detail)).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the lesson."));
        }} aria-label={t(language, "Choose a lesson", "เลือกบทเรียน")}>
          <option value="">{t(language, "Choose a lesson…", "เลือกบทเรียน…")}</option>
          {lessons.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.slideCount})</option>)}
        </select>
        {lesson && <>
          <button className="btn btn--ghost" disabled={!lesson.slides.length} onClick={() => set({ slides: [...draft.slides, ...lesson.slides.map((slide) => ({ slideId: slide.id, title: slide.title, lessonTitle: lesson.title, doc: slide.doc }))] })}><Plus size={14} />{t(language, "Add all slides", "เพิ่มทุกสไลด์")}</button>
          <div className="library-picks">
            {lesson.slides.map((slide, index) => <button key={slide.id} className="library-pick" onClick={() => set({ slides: [...draft.slides, { slideId: slide.id, title: slide.title, lessonTitle: lesson.title, doc: slide.doc }] })} title={t(language, "Add to plan", "เพิ่มในแผน")}>
              <SlideStage><SlideRenderer doc={slide.doc} /></SlideStage>
              <span><span className="slide-num">{String(index + 1).padStart(2, "0")}</span> {slide.title || t(language, "Untitled", "ไม่มีชื่อ")}</span>
              <Plus size={14} className="library-pick-plus" />
            </button>)}
          </div>
        </>}
      </TerminalWindow>
    </div>

    <TerminalWindow title="published.versions">
      {plan.snapshots.length ? <ul className="versions">
        {plan.snapshots.map((snapshot, index) => <li key={snapshot.id}>
          <span className="mono">v{snapshot.version}</span>
          <span className="mono-dim">{new Date(snapshot.publishedAt).toLocaleString()} · {Math.ceil(snapshot.bytes / 1024)} KB</span>
          {index === 0 && <span className="mini-tag mini-tag--live">latest</span>}
          <div className="button-row button-row--tight" style={{ marginLeft: "auto" }}>
            <button className="btn btn--ghost" onClick={() => void run(async () => { const { snapshot: full } = await adminApi.snapshot(snapshot.id); setPreview(asPreviewSlides(full.deck.slides)); })}><Eye size={14} />{t(language, "Preview", "ตัวอย่าง")}</button>
            <button className="btn btn--accent" disabled={busy} onClick={() => void run(async () => { const code = await startLiveSession(snapshot.id); setNotice(t(language, `Live session ${code} started in a new tab.`, `เริ่มห้องเรียนสด ${code} ในแท็บใหม่แล้ว`)); })}><Radio size={14} />{t(language, "Start live session", "เริ่มห้องเรียนสด")}</button>
          </div>
        </li>)}
      </ul> : <p className="mono-dim">{t(language, "> not published yet. Publishing freezes the slides and challenge for teaching.", "> ยังไม่เผยแพร่ การเผยแพร่จะล็อกสไลด์และโจทย์สำหรับการสอน")}</p>}
      {!plan.snapshots.length && <button className="btn btn--danger" disabled={busy} onClick={() => void run(async () => {
        if (!window.confirm(t(language, "Delete this draft plan?", "ลบแผนฉบับร่างนี้?"))) return;
        await adminApi.deletePlan(plan.id);
        onOpen(null);
      })}><Trash2 size={14} />{t(language, "Delete draft", "ลบฉบับร่าง")}</button>}
    </TerminalWindow>

    {preview && <PreviewModal slides={preview} start={0} language={language} onClose={() => setPreview(null)} />}
  </>;
}
