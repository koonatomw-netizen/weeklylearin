import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, ClipboardCopy, ClipboardList, Check, Download, Lock, RefreshCw, ExternalLink, Eye, EyeOff, Maximize, Minimize,
  Monitor, Play, Plus, Shuffle, Square, Users,
} from "lucide-react";
import { control, exportResults, getFeedbackResponses } from "./api";
import { groupSizes } from "./shared/battle";
import { BUILT_IN_SLIDE_COUNT, SLIDE_TITLES } from "./shared/challenge";
import { PresentedSlide, useDeck } from "./slides/PresentedSlide";
import type { BattleView, ControlAction, FeedbackResponse, HostState, Language, RoomEnvelope } from "./shared/types";
import { MAX_ATTEMPTS } from "./shared/types";
import { SlideStage, battleTitle, nextCommand, statusLabel, type BattleCommand } from "./slides/Deck";
import type { Theme } from "./theme";
import { useRoom } from "./useRoom";
import { Brand, LanguageSwitch, LiveDot, Notice, QRStamp, TerminalWindow, ThemeToggle, formatCode, t } from "./ui";

type Mode = "slides" | "waiting" | "writing" | "battle" | "results" | "feedback";

export function joinUrlFor(code: string): string {
  let origin = window.location.origin;
  try { origin = localStorage.getItem("4seas:join-origin") || origin; } catch { /* storage blocked */ }
  return `${origin.trim().replace(/\/$/, "")}/?view=join&room=${code}`;
}

export function useFullscreen() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const update = () => setActive(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void ref.current?.requestFullscreen?.().catch(() => undefined);
  }, []);
  return { ref, active, toggle };
}

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(element && (element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)));
}

export default function PresenterScreen({ code, token, language, onLanguage, theme, onTheme, navigate }: {
  code: string;
  token: string;
  language: Language;
  onLanguage: (language: Language) => void;
  theme: Theme;
  onTheme: () => void;
  navigate: (url: string) => void;
}) {
  const { room, setRoom, connected, error: syncError, expired } = useRoom(code, token);
  const [mode, setMode] = useState<Mode>("slides");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [joinUrl, setJoinUrl] = useState(() => joinUrlFor(code));
  const sequence = useRef(0);
  const fullscreen = useFullscreen();
  const state = room?.state as HostState | undefined;
  const { deck, error: deckError } = useDeck(code, token, state?.snapshotId);

  const send = useCallback(async (action: ControlAction, optimistic?: (current: RoomEnvelope) => RoomEnvelope) => {
    const id = ++sequence.current;
    if (optimistic) setRoom((current) => (current ? optimistic(current) : current));
    else setBusy(true);
    setToast("");
    try {
      const next = await control(code, token, action);
      if (id === sequence.current) setRoom(next);
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : "That action failed.");
    } finally {
      if (!optimistic) setBusy(false);
    }
  }, [code, token, setRoom]);

  const goTo = useCallback((index: number, step: number) => {
    void send({ action: "slide", index, step }, (current) => ({ ...current, state: { ...current.state, currentSlide: index, slideStep: step } }));
  }, [send]);

  const stepSlide = useCallback((direction: 1 | -1) => {
    if (!state) return;
    const { currentSlide: index, slideStep: step, slideSteps, totalSlides } = state;
    if (direction === 1) {
      if (step < (slideSteps[index] ?? 0)) goTo(index, step + 1);
      else if (index < totalSlides - 1) goTo(index + 1, 0);
    } else if (step > 0) goTo(index, step - 1);
    else if (index > 0) goTo(index - 1, slideSteps[index - 1] ?? 0);
  }, [state, goTo]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (mode !== "slides" && !fullscreen.active) return;
      if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); stepSlide(1); }
      else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); stepSlide(-1); }
      else if (event.key === "f" || event.key === "F") { event.preventDefault(); fullscreen.toggle(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, stepSlide, fullscreen]);

  const command = useCallback((name: BattleCommand) => void send({ action: name } as ControlAction), [send]);

  if (expired) return <main className="center-page"><Brand /><Notice>{t(language, "This presenter session has expired in this browser. Create a new room from the home page.", "สิทธิ์ผู้สอนในเบราว์เซอร์นี้หมดอายุ กรุณาสร้างห้องใหม่จากหน้าแรก")}</Notice><button className="btn" onClick={() => navigate("/")}>{t(language, "Home", "หน้าแรก")}</button></main>;
  if (!state) return <main className="center-page"><Brand /><p className="mono-dim">{syncError || t(language, "connecting to the live room…", "กำลังเชื่อมต่อห้องเรียนสด…")}</p></main>;

  const modes: Array<{ id: Mode; en: string; th: string }> = [
    { id: "slides", en: "Slides", th: "สไลด์" },
    { id: "waiting", en: "Waiting Room", th: "ห้องรอ" },
    { id: "writing", en: "Prompt Writing", th: "เขียนพรอมป์" },
    { id: "battle", en: "Battle Control", th: "ควบคุมแบทเทิล" },
    { id: "results", en: "Results", th: "ผลลัพธ์" },
    { id: "feedback", en: "Feedback", th: "แบบสอบถาม" },
  ];

  const total = state.totalSlides;
  const stepsHere = state.slideSteps[state.currentSlide] ?? 0;
  const slideTitles = deck ? deck.slides.map((slide) => slide.title || "Untitled") : SLIDE_TITLES;
  const isLive = (index: number) => (deck ? deck.slides[index]?.doc.elements.some((element) => element.type === "widget") : index >= 4 && index < BUILT_IN_SLIDE_COUNT);
  const notes = deck?.slides[state.currentSlide]?.doc.notes;

  async function downloadCsv(kind: "export" | "feedbackcsv" = "export") {
    try {
      const file = await exportResults(code, token, kind);
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = kind === "export" ? `4seas-${code}-prompt-battle.csv` : `4seas-${code}-weekly-feedback.csv`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (caught) { setToast(caught instanceof Error ? caught.message : "CSV export failed."); }
  }

  if (state.endedAt) {
    return <main className="center-page"><Brand />
      <Notice kind="info">{t(language, "This session has ended for everyone. Results are saved and can be downloaded below.", "จบเซสชันสำหรับทุกคนแล้ว ผลลัพธ์ถูกบันทึกไว้และดาวน์โหลดได้ด้านล่าง")}</Notice>
      {toast && <Notice>{toast}</Notice>}
      <div className="slide-controls-right">
        <button className="btn" onClick={() => void downloadCsv("export")}><Download size={16} />{t(language, "Battle results CSV", "ผลแบทเทิล CSV")}</button>
        <button className="btn" onClick={() => void downloadCsv("feedbackcsv")}><Download size={16} />{t(language, "Feedback CSV", "แบบสอบถาม CSV")}</button>
        <button className="btn btn--accent" onClick={() => navigate("/")}>{t(language, "Home", "หน้าแรก")}</button>
      </div>
    </main>;
  }

  return <main className="presenter">
    <header className="app-header">
      <Brand compact />
      <div className="app-header-mid">
        <span className="header-title">{state.snapshotId ? state.title : t(language, "Week 01 · Prompt Engineering", "สัปดาห์ที่ 1 · Prompt Engineering")}</span>
        <span className="code-chip" title={t(language, "Room code", "รหัสห้อง")}>{formatCode(code)}</span>
      </div>
      <div className="app-header-right">
        <span className="count-chip"><Users size={14} />{state.participantCount}</span>
        <LiveDot live={connected} language={language} />
        {confirmEnd
          ? <span className="end-confirm" role="alertdialog" aria-label={t(language, "Confirm end session", "ยืนยันการจบเซสชัน")}>
            <span>{t(language, "End for everyone? This can't be undone.", "จบสำหรับทุกคน? ย้อนกลับไม่ได้")}</span>
            <button className="btn btn--danger" disabled={busy} onClick={() => void send({ action: "end_room" })}><Square size={14} />{t(language, "End now", "จบเลย")}</button>
            <button className="btn btn--ghost" onClick={() => setConfirmEnd(false)}>{t(language, "Cancel", "ยกเลิก")}</button>
          </span>
          : <button className="btn btn--ghost" onClick={() => setConfirmEnd(true)}><Square size={14} />{t(language, "End session", "จบเซสชัน")}</button>}
        <LanguageSwitch value={language} onChange={onLanguage} />
        <ThemeToggle theme={theme} onToggle={onTheme} language={language} />
      </div>
    </header>

    <nav className="mode-tabs" role="tablist" aria-label={t(language, "Presenter modes", "โหมดผู้สอน")}>
      {modes.map((item, index) => <button key={item.id} role="tab" aria-selected={mode === item.id} className={mode === item.id ? "is-on" : ""} onClick={() => setMode(item.id)}>
        <span className="mode-num">{index + 1}</span>{t(language, item.en, item.th)}
      </button>)}
    </nav>

    {toast && <div className="toast-row"><Notice>{toast}</Notice></div>}
    {syncError && !connected && <div className="toast-row"><Notice kind="info">{syncError}</Notice></div>}
    {deckError && !deck && <div className="toast-row"><Notice kind="info">{deckError}</Notice></div>}

    {mode === "slides" && <section className="slides-mode">
      <div className="slides-main">
        <div className={`stage-shell${fullscreen.active ? " is-fullscreen" : ""}`} ref={fullscreen.ref}>
          <SlideStage>
            <PresentedSlide state={state} deck={deck} language={language} joinUrl={joinUrl} onCommand={command} busy={busy} />
          </SlideStage>
          {fullscreen.active && <div className="fs-controls">
            <button className="icon-button" onClick={() => stepSlide(-1)} aria-label="Previous"><ChevronLeft size={18} /></button>
            <span>{state.currentSlide + 1}/{total}</span>
            <button className="icon-button" onClick={() => stepSlide(1)} aria-label="Next"><ChevronRight size={18} /></button>
            <button className="icon-button" onClick={fullscreen.toggle} aria-label="Exit fullscreen"><Minimize size={16} /></button>
          </div>}
        </div>
        <div className="slide-controls">
          <button className="btn" onClick={() => stepSlide(-1)} disabled={state.currentSlide === 0 && state.slideStep === 0}><ChevronLeft size={16} />{t(language, "Previous", "ก่อนหน้า")}</button>
          <div className="slide-position">
            <span className="mono">{String(state.currentSlide + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}</span>
            {stepsHere > 0 && <span className="step-dots" aria-label={`step ${state.slideStep} of ${stepsHere}`}>
              {Array.from({ length: stepsHere }, (_, index) => <i key={index} className={index < state.slideStep ? "is-on" : ""} />)}
            </span>}
            <span className="mono-dim kbd-hint">← → · F</span>
          </div>
          <div className="slide-controls-right">
            <button className="btn btn--ghost" onClick={() => window.open(`${window.location.origin}/?view=projector&room=${code}`, `4seas-projector-${code}`)}><Monitor size={16} />{t(language, "Projector window", "หน้าต่างโปรเจกเตอร์")}<ExternalLink size={13} /></button>
            <button className="btn btn--ghost" onClick={fullscreen.toggle}><Maximize size={16} />{t(language, "Fullscreen", "เต็มจอ")}</button>
            <button className="btn btn--accent" onClick={() => stepSlide(1)} disabled={state.currentSlide === total - 1 && state.slideStep >= stepsHere}>{t(language, "Next", "ถัดไป")}<ChevronRight size={16} /></button>
          </div>
        </div>
        {notes && <div className="notes-box"><b>{t(language, "Presenter notes", "บันทึกผู้สอน")}:</b> {notes}</div>}
      </div>
      <aside className="slide-list" aria-label={t(language, "Slides", "สไลด์")}>
        {slideTitles.map((title, index) => <button key={index} className={index === state.currentSlide ? "is-on" : ""} onClick={() => goTo(index, 0)} aria-current={index === state.currentSlide ? "true" : undefined}>
          <span className="mono">{String(index + 1).padStart(2, "0")}</span>{title}{isLive(index) && <em className="live-tag">live</em>}
        </button>)}
      </aside>
    </section>}

    {mode === "waiting" && <WaitingRoom state={state} code={code} joinUrl={joinUrl} onJoinUrl={setJoinUrl} language={language} navigate={navigate} />}
    {mode === "writing" && <WritingControl state={state} language={language} busy={busy} send={send} />}
    {mode === "battle" && <BattleControl state={state} language={language} busy={busy} send={send} command={command} />}
    {mode === "results" && <ResultsPanel state={state} language={language} busy={busy} command={command} onExport={() => void downloadCsv()} onFeedback={() => { setMode("feedback"); void send({ action: "start_feedback" }); }} />}
    {mode === "feedback" && <FeedbackPanel state={state} code={code} token={token} language={language} busy={busy} onStart={() => void send({ action: "start_feedback" })} onExport={() => void downloadCsv("feedbackcsv")} />}
  </main>;
}

// ------------------------------------------------------------- waiting room

function WaitingRoom({ state, code, joinUrl, onJoinUrl, language, navigate }: { state: HostState; code: string; joinUrl: string; onJoinUrl: (value: string) => void; language: Language; navigate: (url: string) => void }) {
  const [origin, setOrigin] = useState(() => new URL(joinUrl).origin);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    try { localStorage.setItem("4seas:join-origin", origin); } catch { /* storage blocked */ }
    onJoinUrl(joinUrlFor(code));
  }, [origin, code, onJoinUrl]);
  return <section className="panel-grid panel-grid--waiting">
    <TerminalWindow title="join.sh" className="join-panel">
      <div className="join-panel-body">
        <QRStamp value={joinUrl} size={220} label={t(language, "Scan to join", "สแกนเพื่อเข้าร่วม")} />
        <div>
          <p className="field-label">room code</p>
          <p className="big-code">{formatCode(code)}</p>
          <p className="mono-dim break">{joinUrl}</p>
          <button className="btn btn--ghost" onClick={() => void navigator.clipboard?.writeText(joinUrl).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }).catch(() => undefined)}>
            {copied ? <Check size={15} /> : <ClipboardCopy size={15} />}{t(language, "Copy join link", "คัดลอกลิงก์")}
          </button>
        </div>
      </div>
      <label className="field-label" htmlFor="join-origin">{t(language, "Participant link origin", "ลิงก์หลักสำหรับผู้เข้าร่วม")}</label>
      <input id="join-origin" className="input mono" value={origin} onChange={(event) => setOrigin(event.target.value)} spellCheck={false} />
      <p className="hint">{t(language, "On local Wi-Fi, use this computer's LAN address (e.g. http://192.168.1.20:5173) instead of localhost.", "ถ้าใช้ Wi-Fi ในเครื่อง ให้ใช้ IP ของเครื่องนี้ (เช่น http://192.168.1.20:5173) แทน localhost")}</p>
      <button className="btn btn--ghost" onClick={() => navigate("/")}><Plus size={15} />{t(language, "Create another room", "สร้างห้องใหม่")}</button>
    </TerminalWindow>
    <TerminalWindow title={`participants (${state.participantCount})`}>
      {state.participants.length ? <ul className="people">
        {state.participants.map((participant) => <li key={participant.id}><span className="avatar">{participant.nickname.slice(0, 1).toUpperCase()}</span>{participant.nickname}<span className="mono-dim">{new Date(participant.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></li>)}
      </ul> : <p className="mono-dim">{t(language, "> waiting for participants to scan the QR code…", "> รอผู้เข้าร่วมสแกน QR…")}</p>}
    </TerminalWindow>
  </section>;
}

// ----------------------------------------------------------- prompt writing

function WritingControl({ state, language, busy, send }: { state: HostState; language: Language; busy: boolean; send: (action: ControlAction) => Promise<void> }) {
  const [showAll, setShowAll] = useState(false);
  const locked = state.battles.length > 0;
  const status = { waiting: t(language, "not started", "ยังไม่เริ่ม"), writing: t(language, "open", "เปิดอยู่"), writing_closed: t(language, "closed", "ปิดแล้ว"), battle: t(language, "locked — battles started", "ล็อกแล้ว — เริ่มแบทเทิล"), results: t(language, "locked", "ล็อกแล้ว"), feedback: t(language, "locked", "ล็อกแล้ว") }[state.activity];
  const submissions = [...state.submissions].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return <section className="panel-grid">
    <TerminalWindow title="challenge.md" right={<span className={`status-chip is-${state.activity === "writing" ? "open" : "pending"}`}><i />{status}</span>}>
      <p className="lead">{t(language, state.challenge.scenarioEn, state.challenge.scenarioTh)}</p>
      <p>{t(language, state.challenge.taskEn, state.challenge.taskTh)}</p>
      <div className="stat-row">
        <div className="stat"><span>{t(language, "joined", "เข้าร่วม")}</span><b>{state.participantCount}</b></div>
        <div className="stat"><span>{t(language, "submitted", "ส่งแล้ว")}</span><b>{state.submittedCount}</b></div>
        <div className="stat"><span>{t(language, "prompts", "พรอมป์")}</span><b>{state.totalSubmissions}</b></div>
        <div className="stat"><span>{t(language, "final picked", "เลือกแล้ว")}</span><b>{state.finalSelectedCount}</b></div>
      </div>
      {state.totalSubmissions > 0 && !locked && <p className="hint">{t(language, "A new case can't be opened once prompts have been submitted.", "เปิดเคสใหม่ไม่ได้แล้ว เพราะมีผู้ส่งพรอมป์แล้ว")}</p>}
      <div className="button-row">
        {state.activity !== "battle" && state.casePool?.length !== 0 && <button className="btn btn--ghost" disabled={busy || locked || state.totalSubmissions > 0} onClick={() => void send({ action: "open_case" })}><Shuffle size={15} />{state.caseRoll ? t(language, "Re-roll case", "สุ่มใหม่") : t(language, "Open case", "เปิดเคส")}</button>}
        {state.activity !== "writing" && <button className="btn btn--accent" disabled={busy || locked} onClick={() => void send({ action: "activity", activity: "writing" })}><Play size={15} />{state.activity === "writing_closed" ? t(language, "Reopen submission", "เปิดรับอีกครั้ง") : t(language, "Start prompt submission", "เริ่มรับพรอมป์")}</button>}
        {state.activity === "writing" && <button className="btn btn--danger" disabled={busy} onClick={() => void send({ action: "activity", activity: "writing_closed" })}><Square size={14} />{t(language, "Close prompt submission", "ปิดรับพรอมป์")}</button>}
        {(state.activity === "writing" || state.activity === "writing_closed") && <button className="btn btn--ghost" disabled={busy} onClick={() => void send({ action: "activity", activity: "waiting" })}>{t(language, "Back to waiting screen", "กลับหน้ารอ")}</button>}
      </div>
    </TerminalWindow>
    <TerminalWindow title="progress" right={<button className="link-button" onClick={() => setShowAll(!showAll)}>{showAll ? t(language, "hide prompts", "ซ่อนพรอมป์") : t(language, "show prompts", "ดูพรอมป์")}</button>}>
      {showAll ? (submissions.length ? <ul className="submission-list">
        {submissions.map((submission) => <li key={submission.id}><header><b>{submission.nickname}</b><span className="mono-dim">#{submission.attempt}{submission.isFinal ? " · final" : ""}</span></header><p className="prompt-text">{submission.promptText}</p></li>)}
      </ul> : <p className="mono-dim">{t(language, "> no prompts yet", "> ยังไม่มีพรอมป์")}</p>) : <table className="data-table">
        <thead><tr><th>{t(language, "name", "ชื่อ")}</th><th>{t(language, "attempts", "ครั้งที่ส่ง")}</th><th>{t(language, "final", "พรอมป์สุดท้าย")}</th></tr></thead>
        <tbody>{state.participants.map((participant) => <tr key={participant.id}>
          <td>{participant.nickname}</td>
          <td><span className="attempt-dots">{Array.from({ length: MAX_ATTEMPTS }, (_, index) => <i key={index} className={index < participant.attempts ? "is-on" : ""} />)}</span></td>
          <td>{participant.finalSubmissionId ? (participant.finalAuto ? <span className="mono-dim">auto</span> : <Check size={16} className="ok" />) : <span className="mono-dim">—</span>}</td>
        </tr>)}</tbody>
      </table>}
    </TerminalWindow>
  </section>;
}

// ----------------------------------------------------------- battle control

function BattleControl({ state, language, busy, send, command }: { state: HostState; language: Language; busy: boolean; send: (action: ControlAction) => Promise<void>; command: (name: BattleCommand) => void }) {
  const [showAuthors, setShowAuthors] = useState(false);
  const pendingOnly = state.battles.length > 0 && state.battles.every((battle) => battle.status === "pending");
  const candidates = useMemo(() => state.participants.filter((participant) => participant.finalSubmissionId || participant.attempts > 0).length, [state.participants]);
  const missingFinal = state.participants.filter((participant) => !participant.finalSubmissionId && participant.attempts > 0).length;
  const authorOf = useMemo(() => {
    const byId = new Map(state.submissions.map((submission) => [submission.promptText, submission.nickname]));
    return (text: string) => byId.get(text) ?? "—";
  }, [state.submissions]);
  const next = nextCommand(state);
  const active = state.battles.find((battle) => battle.id === state.activeBattleId);
  return <section className="battle-control">
    <TerminalWindow title="battle.config" right={<button className="link-button" onClick={() => setShowAuthors(!showAuthors)}>{showAuthors ? <EyeOff size={14} /> : <Eye size={14} />}{showAuthors ? t(language, "hide authors", "ซ่อนชื่อ") : t(language, "show authors (presenter only)", "แสดงชื่อ (เฉพาะผู้สอน)")}</button>}>
      {(state.battles.length === 0 || pendingOnly) && <div className="generate">
        <p>{t(language, `${candidates} participants have a prompt → groups of`, `${candidates} คนมีพรอมป์ → แบ่งกลุ่มเป็น`)} <b className="mono">{groupSizes(candidates).join(" + ") || "—"}</b></p>
        {missingFinal > 0 && <p className="hint">{t(language, `${missingFinal} participant(s) have not picked a final prompt; their latest submission will be used.`, `${missingFinal} คนยังไม่เลือกพรอมป์สุดท้าย ระบบจะใช้พรอมป์ล่าสุดแทน`)}</p>}
        {candidates > 0 && candidates < 3 && <p className="hint hint--warn">{t(language, "Fewer than 3 prompts: one small battle will be created.", "พรอมป์น้อยกว่า 3: จะมีแบทเทิลเล็กเพียงหนึ่งกลุ่ม")}</p>}
        <button className="btn btn--accent" disabled={busy || candidates < 2} onClick={() => void send({ action: "generate_battles" })}><Shuffle size={15} />{pendingOnly ? t(language, "Regenerate battle groups", "สุ่มกลุ่มใหม่") : t(language, "Generate battle groups", "สร้างกลุ่มแบทเทิล")}</button>
        {state.activity === "writing" && <p className="hint">{t(language, "Generating groups closes prompt submission.", "การสร้างกลุ่มจะปิดรับพรอมป์อัตโนมัติ")}</p>}
      </div>}
      {state.battles.length > 0 && <div className="flow-bar">
        <span className="mono-dim">{active ? `${battleTitle(active, state, language)} · ${statusLabel(active, language)}` : "—"}</span>
        <div className="button-row">
          {next && <button className="btn btn--accent" disabled={busy} onClick={() => command(next.command)}>{t(language, next.en, next.th)}</button>}
          {state.finalStatus === "tie" && <button className="btn" disabled={busy} onClick={() => command("accept_shared")}>{t(language, "Accept shared winners", "ยอมรับแชมป์ร่วม")}</button>}
        </div>
      </div>}
    </TerminalWindow>
    <div className="battle-list">
      {state.battles.map((battle) => <BattleAdmin key={battle.id} battle={battle} state={state} language={language} busy={busy} showAuthors={showAuthors} authorOf={authorOf} send={send} />)}
    </div>
  </section>;
}

function BattleAdmin({ battle, state, language, busy, showAuthors, authorOf, send }: {
  battle: BattleView; state: HostState; language: Language; busy: boolean; showAuthors: boolean;
  authorOf: (text: string) => string; send: (action: ControlAction) => Promise<void>;
}) {
  const [resolving, setResolving] = useState(false);
  const [winners, setWinners] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const isActive = battle.id === state.activeBattleId;
  const lockedMini = battle.round === "mini" && state.battles.some((item) => item.round === "final");
  const latestFinal = battle.round === "final" && !state.battles.some((item) => item.round === "final" && item.sequence > battle.sequence);
  const canResolve = battle.status === "revealed" && !lockedMini && (battle.round === "mini" || latestFinal);
  return <TerminalWindow className={`battle-admin${isActive ? " is-active" : ""}`} title={battleTitle(battle, state, language)} right={<span className={`status-chip is-${battle.status}`}><i />{statusLabel(battle, language)}</span>}>
    <div className="vote-progress"><div className="vote-progress-bar"><span style={{ width: `${battle.eligibleVoters ? (battle.votesCast / battle.eligibleVoters) * 100 : 0}%` }} /></div><span><b>{battle.votesCast}</b>/{battle.eligibleVoters} {t(language, "votes", "เสียง")}</span></div>
    {battle.eligibleVoters === 0 && battle.status !== "revealed" && <p className="hint hint--warn">{t(language, "No eligible voters for this battle. Reveal it, then resolve it manually with a reason.", "แบทเทิลนี้ไม่มีผู้มีสิทธิ์โหวต ให้เปิดผลแล้วตัดสินเองพร้อมระบุเหตุผล")}</p>}
    <ol className="admin-entries">
      {battle.entries.map((entry) => <li key={entry.id} className={entry.result?.isWinner ? "is-winner" : ""}>
        <span className="entry-label">{entry.label}</span>
        <span className="entry-text">{entry.promptText}</span>
        <span className="entry-meta">
          {entry.result ? <><b>{entry.result.votes}</b> · {entry.result.score} · {entry.result.nickname}{entry.result.isWinner && " ★"}</> : showAuthors ? authorOf(entry.promptText) : ""}
        </span>
        {resolving && <input type="checkbox" aria-label={`winner ${entry.label}`} checked={winners.includes(entry.id)} onChange={(event) => setWinners(event.target.checked ? [...winners, entry.id] : winners.filter((id) => id !== entry.id))} />}
      </li>)}
    </ol>
    {battle.resolutionNote && <p className="hint">{battle.resolutionNote}</p>}
    {battle.tie && !battle.resolutionNote && <p className="hint hint--warn">{battle.round === "mini" ? t(language, "Tie — all tied prompts advance to the Grand Final unless you resolve it.", "เสมอ — พรอมป์ที่เสมอเข้ารอบชิงทั้งหมด เว้นแต่ผู้สอนตัดสิน") : t(language, "Tie in the final — run a tie-break, accept shared winners, or resolve manually.", "รอบชิงเสมอ — เลือกตัดสินเสมอ ยอมรับแชมป์ร่วม หรือตัดสินเอง")}</p>}
    {canResolve && (resolving ? <div className="resolve-form">
      <label className="field-label" htmlFor={`reason-${battle.id}`}>{t(language, "Reason (recorded in the log and CSV)", "เหตุผล (บันทึกใน log และ CSV)")}</label>
      <input id={`reason-${battle.id}`} className="input" value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} placeholder={t(language, "e.g. no eligible voters; decided by show of hands", "เช่น ไม่มีผู้มีสิทธิ์โหวต ตัดสินโดยยกมือ")} />
      <div className="button-row">
        <button className="btn btn--accent" disabled={busy || !winners.length || reason.trim().length < 3} onClick={() => void send({ action: "resolve", battleId: battle.id, winnerEntryIds: winners, reason }).then(() => setResolving(false))}>{t(language, "Save decision", "บันทึกการตัดสิน")}</button>
        <button className="btn btn--ghost" onClick={() => setResolving(false)}>{t(language, "Cancel", "ยกเลิก")}</button>
      </div>
    </div> : <button className="link-button" onClick={() => { setResolving(true); setWinners(battle.entries.filter((entry) => entry.result?.isWinner).map((entry) => entry.id)); }}>{t(language, "Resolve manually…", "ตัดสินเอง…")}</button>)}
  </TerminalWindow>;
}

// --------------------------------------------------------------- results

function ResultsPanel({ state, language, busy, command, onExport, onFeedback }: { state: HostState; language: Language; busy: boolean; command: (name: BattleCommand) => void; onExport: () => void; onFeedback: () => void }) {
  const finalLabel = { not_ready: t(language, "mini battles in progress", "แบทเทิลรอบแรกยังไม่จบ"), ready: t(language, "ready for the Grand Final", "พร้อมเริ่มรอบชิง"), running: t(language, "Grand Final running", "กำลังแข่งรอบชิง"), tie: t(language, "Grand Final tied", "รอบชิงเสมอ"), complete: t(language, "complete", "เสร็จสิ้น") }[state.finalStatus];
  return <section className="panel-grid">
    <TerminalWindow title="leaderboard" right={<span className={`status-chip is-${state.finalStatus === "complete" ? "revealed" : "pending"}`}><i />{finalLabel}</span>}>
      {state.champions.length > 0 && <p className="champion-line">🏆 {state.champions.map((champion) => champion.nickname).join(" & ")}{state.champions[0].shared ? ` (${t(language, "shared", "แชมป์ร่วม")})` : ""}</p>}
      {state.leaderboard.length ? <table className="data-table">
        <thead><tr><th>#</th><th>{t(language, "name", "ชื่อ")}</th><th>{t(language, "stage", "รอบ")}</th><th>{t(language, "battle", "แบทเทิล")}</th><th>{t(language, "final", "รอบชิง")}</th></tr></thead>
        <tbody>{state.leaderboard.map((row) => <tr key={row.participantId}>
          <td>{row.rank}</td><td>{row.nickname}</td><td>{row.stage}</td>
          <td className="mono">{row.battleVotes}/{row.battleEligible} · {row.battleScore}</td>
          <td className="mono">{row.finalScore === null ? "—" : `${row.finalVotes}/${row.finalEligible} · ${row.finalScore}`}</td>
        </tr>)}</tbody>
      </table> : <p className="mono-dim">{t(language, "> the leaderboard appears once the Grand Final is complete", "> ตารางอันดับจะแสดงเมื่อรอบชิงเสร็จสิ้น")}</p>}
      <div className="button-row">
        <button className="btn btn--accent" disabled={busy || state.finalStatus !== "complete" || state.activity === "results"} onClick={() => command("show_results")}>{state.activity === "results" ? t(language, "Leaderboard is showing", "กำลังแสดงผล") : t(language, "Show final leaderboard", "แสดงผลสุดท้าย")}</button>
        <button className="btn" onClick={onExport}><Download size={15} />{t(language, "Export CSV", "ส่งออก CSV")}</button>
        {state.activity === "results" && <button className="btn btn--accent" disabled={busy} onClick={onFeedback}><ClipboardList size={15} />{t(language, "Next: weekly feedback", "ถัดไป: แบบสอบถาม")}</button>}
      </div>
    </TerminalWindow>
    <TerminalWindow title="presenter.log">
      {state.actions.length ? <ul className="log">{state.actions.map((action, index) => <li key={index}><span className="mono-dim">{new Date(action.createdAt).toLocaleTimeString()}</span> <b>{action.action}</b> <span className="mono-dim">{action.detail === "{}" ? "" : action.detail}</span></li>)}</ul>
        : <p className="mono-dim">{t(language, "> no actions yet", "> ยังไม่มีการดำเนินการ")}</p>}
    </TerminalWindow>
  </section>;
}

// --------------------------------------------------------- weekly feedback

function FeedbackPanel({ state, code, token, language, busy, onStart, onExport }: {
  state: HostState; code: string; token: string; language: Language; busy: boolean; onStart: () => void; onExport: () => void;
}) {
  const summary = state.feedback;
  const open = state.activity === "feedback";
  const [responses, setResponses] = useState<FeedbackResponse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadResponses() {
    setLoading(true);
    setError("");
    try { setResponses((await getFeedbackResponses(code, token)).responses); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load responses."); }
    finally { setLoading(false); }
  }

  return <section className="panel-grid feedback-panel">
    <TerminalWindow title="feedback-collection" right={<span className={`status-chip is-${open ? "open" : "pending"}`}><i />{open ? t(language, "collecting", "กำลังรับ") : t(language, "not started", "ยังไม่เริ่ม")}</span>}>
      <div className="stat-row">
        <div className="stat"><span>{t(language, "participants", "ผู้เข้าร่วม")}</span><b>{state.participantCount}</b></div>
        <div className="stat"><span>{t(language, "submitted", "ส่งแล้ว")}</span><b>{summary.submitted}</b></div>
        <div className="stat"><span>{t(language, "pending", "ยังไม่ส่ง")}</span><b>{summary.pending}</b></div>
        <div className="stat"><span>{t(language, "avg rating", "คะแนนเฉลี่ย")}</span><b>{summary.averageRating ?? "—"}<small className="mono-dim">/5</small></b></div>
      </div>
      <div className="completion-bar" role="progressbar" aria-valuenow={summary.completion} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${summary.completion}%` }} /></div>
      <p className="mono-dim">{t(language, "completion rate", "อัตราการส่ง")} · <b>{summary.completion}%</b></p>
      <div className="button-row">
        {!open && <button className="btn btn--accent" disabled={busy} onClick={onStart}><ClipboardList size={15} />{t(language, "Start weekly feedback", "เริ่มแบบสอบถามประจำสัปดาห์")}</button>}
        <button className="btn" onClick={onExport}><Download size={15} />{t(language, "Export feedback CSV", "ส่งออก CSV แบบสอบถาม")}</button>
      </div>
      {!open && <p className="hint">{t(language, "Phones switch to the feedback form. There is no skip button; participants can resume after a refresh or reconnect.", "มือถือทุกเครื่องจะเปลี่ยนเป็นหน้าแบบสอบถาม ไม่มีปุ่มข้าม และกลับมาทำต่อได้หลังรีเฟรชหรือหลุดการเชื่อมต่อ")}</p>}
      <table className="data-table">
        <thead><tr><th>{t(language, "name", "ชื่อ")}</th><th>{t(language, "status", "สถานะ")}</th></tr></thead>
        <tbody>{summary.statuses.map((row) => <tr key={row.participantId}>
          <td>{row.nickname}</td>
          <td>{row.submittedAt ? <span className="status-pill is-done">{t(language, "submitted", "ส่งแล้ว")}</span> : <span className="status-pill">{t(language, "pending", "ยังไม่ส่ง")}</span>}</td>
        </tr>)}</tbody>
      </table>
    </TerminalWindow>
    <TerminalWindow title="responses · management only" right={<Lock size={14} />}>
      <p className="hint hint--warn">{t(language, "Individual answers are confidential. Do not show this panel on the projector.", "คำตอบรายบุคคลเป็นความลับ ห้ามแสดงบนจอโปรเจกเตอร์")}</p>
      {error && <Notice>{error}</Notice>}
      <div className="button-row">
        {responses === null
          ? <button className="btn" disabled={loading} onClick={() => void loadResponses()}><Eye size={15} />{t(language, "Show individual responses", "แสดงคำตอบรายบุคคล")}</button>
          : <>
            <button className="btn btn--ghost" onClick={() => setResponses(null)}><EyeOff size={15} />{t(language, "Hide", "ซ่อน")}</button>
            <button className="btn btn--ghost" disabled={loading} onClick={() => void loadResponses()}><RefreshCw size={15} />{t(language, "Refresh", "รีเฟรช")}</button>
          </>}
      </div>
      {responses && (responses.length ? <div className="fb-responses">{responses.map((response) => <article key={response.nickname + response.submittedAt} className="fb-response">
        <header><b>{response.nickname}</b><span className="mono-dim">★ {response.trainingRating}/5 · {new Date(response.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></header>
        <dl>
          <dt>{t(language, "challenges", "ปัญหา")}</dt><dd>{response.workChallenges}</dd>
          <dt>{t(language, "support needed", "ความช่วยเหลือ")}</dt><dd>{response.supportNeeded}</dd>
          <dt>{t(language, "learn next", "อยากเรียน")}</dt><dd>{response.trainingRequests}</dd>
          {response.otherComments && <><dt>{t(language, "other", "อื่นๆ")}</dt><dd>{response.otherComments}</dd></>}
        </dl>
      </article>)}</div> : <p className="mono-dim">{t(language, "> no responses yet", "> ยังไม่มีคำตอบ")}</p>)}
    </TerminalWindow>
  </section>;
}
