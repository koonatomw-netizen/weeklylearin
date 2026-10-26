import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, ClipboardCopy, Download, ExternalLink, LoaderCircle, Monitor, Play, Radio, Users } from "lucide-react";
import { advanceSlide, exportResults } from "./api";
import type { HostRoomState, Language, Participant } from "./shared/types";
import { useRoom } from "./useRoom";
import { Brand, ErrorNotice, LanguageSwitch, PhasePill, QRStamp, SuccessNotice, t } from "./ui";
import SlideEditor from "./SlideEditor";

export default function HostScreen({ code, language, onLanguage, navigate }: {
  code: string;
  language: Language;
  onLanguage: (language: Language) => void;
  navigate: (url: string) => void;
}) {
  const token = sessionStorage.getItem(`4seas:host:${code}`);
  const { room, setRoom, connected, error: syncError } = useRoom(code, token);
  const [panel, setPanel] = useState<"session" | "slides">("session");
  const [joinOrigin, setJoinOrigin] = useState(() => localStorage.getItem("4seas:join-origin") || window.location.origin);
  const [copyDone, setCopyDone] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const state = room?.state as HostRoomState | undefined;
  const slide = room?.activeSlide;
  const safeOrigin = joinOrigin.trim().replace(/\/$/, "");
  const joinUrl = `${safeOrigin}/?view=join&room=${code}`;
  const revealed = state?.phase === "discussion" || state?.phase === "wrap";
  const counts = useMemo(() => {
    const summary = new Map<string, { one: boolean; two: boolean; scoreOne?: number; scoreTwo?: number }>();
    for (const submission of state?.submissions ?? []) {
      const value = summary.get(submission.participantId) ?? { one: false, two: false };
      if (submission.attempt === 1) { value.one = true; value.scoreOne = submission.evaluation.total; }
      if (submission.attempt === 2) { value.two = true; value.scoreTwo = submission.evaluation.total; }
      summary.set(submission.participantId, value);
    }
    return summary;
  }, [state?.submissions]);

  useEffect(() => {
    localStorage.setItem("4seas:join-origin", joinOrigin);
  }, [joinOrigin]);

  if (!token) return <main className="room-error-page"><Brand /><ErrorNotice>{t(language, "This presenter session is not available in this browser tab. Return to the home page and open a new host room.", "ไม่พบสิทธิ์ผู้สอนในแท็บนี้ กลับหน้าแรกแล้วเปิดห้องผู้สอนใหม่")}</ErrorNotice><button className="button button--navy" onClick={() => navigate("/")}><ArrowLeft size={15} />{t(language, "Workshop home", "หน้าเวิร์กช็อป")}</button></main>;
  if (!room || !state || !slide) return <main className="loading-page"><Brand /><LoaderCircle className="spin" /><p>{syncError || t(language, "Connecting to the live room…", "กำลังเชื่อมต่อห้องเรียนสด…")}</p></main>;

  async function goTo(index: number) {
    if (!token) return;
    setBusy(true);
    setToast("");
    try { setRoom(await advanceSlide(code, token, index)); }
    catch (caught) { setToast(caught instanceof Error ? caught.message : "Slide update failed."); }
    finally { setBusy(false); }
  }

  async function downloadCsv() {
    if (!token) return;
    try {
      const file = await exportResults(code, token);
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `4seas-${code.toLowerCase()}-results.csv`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (caught) { setToast(caught instanceof Error ? caught.message : "CSV export failed."); }
  }

  async function copyJoinLink() {
    try { await navigator.clipboard.writeText(joinUrl); setCopyDone(true); window.setTimeout(() => setCopyDone(false), 1600); }
    catch { setToast(t(language, "Clipboard access was blocked. Copy the link from the field below.", "คัดลอกอัตโนมัติไม่ได้ ให้คัดลอกจากช่องลิงก์ด้านล่าง")); }
  }

  function openProjector() {
    const page = `${window.location.origin}/?view=projector&room=${code}`;
    window.open(page, `4seas-projector-${code}`);
  }

  const body = language === "th" ? slide.bodyTh : slide.bodyEn;
  const rows = state.participants;

  return <main className="host-page">
    <header className="room-header">
      <Brand compact />
      <div className="room-header-center"><span>{t(language, "Week 01 · Prompting with purpose", "สัปดาห์ที่ 1 · เขียนพรอมป์ให้ตรงเป้าหมาย")}</span><i />{code}</div>
      <div className="header-right">
        <span className={`connection-indicator${connected ? " is-connected" : ""}`}><i />{connected ? t(language, "Live", "ถ่ายทอดสด") : t(language, "Reconnecting", "กำลังเชื่อมต่อ")}</span>
        <LanguageSwitch value={language} onChange={onLanguage} />
      </div>
    </header>

    <div className="host-topline">
      <div className="host-tabs" role="tablist">
        <button className={panel === "session" ? "is-active" : ""} onClick={() => setPanel("session")} role="tab" aria-selected={panel === "session"}>{t(language, "Live session", "ห้องเรียนสด")}</button>
        <button className={panel === "slides" ? "is-active" : ""} onClick={() => setPanel("slides")} role="tab" aria-selected={panel === "slides"}>{t(language, "Slide templates", "เทมเพลตสไลด์")}</button>
      </div>
      <div className="host-top-actions"><span className="session-length"><span>28</span> {t(language, "min session", "นาที")}</span><button className="button button--outline" onClick={() => void downloadCsv()}><Download size={15} />{t(language, "Export CSV", "ส่งออก CSV")}</button><button className="button button--teal" onClick={openProjector}><Monitor size={15} />{t(language, "Open projection", "เปิดจอโปรเจกเตอร์")} <ExternalLink size={13} /></button></div>
    </div>

    {syncError && <div className="host-sync-warning"><Radio size={14} />{syncError}</div>}
    {toast && <ErrorNotice>{toast}</ErrorNotice>}
    {panel === "slides" ? <SlideEditor token={token} language={language} /> : <>
      <section className="host-workbench">
        <aside className="agenda-panel">
          <div className="panel-heading"><div><p className="eyebrow">{t(language, "28 minutes", "28 นาที")}</p><h2>{t(language, "Workshop flow", "ลำดับเวิร์กช็อป")}</h2></div><span>{String(state.currentSlide + 1).padStart(2, "0")}/{String(state.totalSlides).padStart(2, "0")}</span></div>
          <ol className="agenda-list">{state.slides.map((item, index) => <AgendaItem key={item.id} slide={item} index={index} current={state.currentSlide} language={language} onSelect={() => void goTo(index)} locked={busy} />)}</ol>
          <div className="agenda-tip"><span className="tip-stem" /><p>{t(language, "Move one slide at a time. Prompt rounds open only when you move to their slide.", "เลื่อนไปทีละสไลด์ รอบส่งพรอมป์จะเปิดตามสไลด์กิจกรรม")}</p></div>
        </aside>

        <section className="host-stage-column">
          <article className="host-slide-preview">
            <div className="stage-meta"><PhasePill phase={state.phase} language={language} /><span><Clock3Icon />{slide.minutes} {t(language, "minutes", "นาที")}</span><span>{t(language, `Slide ${state.currentSlide + 1}`, `สไลด์ ${state.currentSlide + 1}`)}</span></div>
            <div className="host-slide-copy"><p className="eyebrow">4Seas Nimman · Week 01</p><h1>{language === "th" ? slide.titleTh : slide.titleEn}</h1><p className="host-slide-subtitle">{language === "th" ? slide.subtitleTh : slide.subtitleEn}</p><ul>{body.map((line, index) => <li key={index}>{line}</li>)}</ul>
              {(state.phase === "attempt1" || state.phase === "attempt2") && <div className="host-activity-prompt"><span>{t(language, "Learner activity", "กิจกรรมผู้เรียน")}</span><p>{language === "th" ? slide.promptTh : slide.promptEn}</p></div>}
            </div>
            <div className="host-stage-footer"><span>{t(language, "Published snapshot v", "สไลด์ที่เผยแพร่ v")}{state.templateVersion}</span><span className="stage-progress"><i style={{ width: `${((state.currentSlide + 1) / state.totalSlides) * 100}%` }} /></span><span>{state.currentSlide + 1}/{state.totalSlides}</span></div>
          </article>
          <section className="host-notes">
            <div className="notes-mark"><span>✳</span></div><div><p>{t(language, "Presenter notes", "บันทึกผู้สอน")}</p><span>{slide.speakerNotes || t(language, "No notes on this slide.", "สไลด์นี้ไม่มีบันทึก")}</span></div>
          </section>
          <div className="host-slide-controls">
            <button className="button button--outline" disabled={busy || state.currentSlide === 0} onClick={() => void goTo(state.currentSlide - 1)}><ChevronLeft size={16} />{t(language, "Previous", "ก่อนหน้า")}</button>
            <span>{t(language, "This slide is synced to all learners.", "สไลด์นี้แสดงพร้อมกันทุกคน")}</span>
            <button className="button button--navy" disabled={busy || state.currentSlide >= state.totalSlides - 1} onClick={() => void goTo(state.currentSlide + 1)}>{t(language, "Next slide", "สไลด์ถัดไป")}<ChevronRight size={16} /></button>
          </div>
        </section>

        <aside className="room-side-panel">
          <section className="room-access-panel">
            <div className="panel-heading panel-heading--tight"><div><p className="eyebrow">{t(language, "Join this room", "เข้าร่วมห้องนี้")}</p><h2>{code}</h2></div><button className="copy-room-code" onClick={() => void copyJoinLink()} title={t(language, "Copy join link", "คัดลอกลิงก์เข้าห้อง")}>{copyDone ? <Check size={16} /> : <ClipboardCopy size={16} />}</button></div>
            <div className="room-qr-row"><QRStamp value={joinUrl} size={112} label={t(language, "Scan to join", "สแกนเพื่อเข้าร่วม")} /><div className="room-access-copy"><strong>{rows.length}<small>/10</small></strong><span>{t(language, "learners in room", "ผู้เรียนในห้อง")}</span><div className="people-dots">{Array.from({ length: Math.min(10, Math.max(0, rows.length)) }, (_, index) => <i key={index} />)}</div></div></div>
            <label className="join-origin-label" htmlFor="join-origin">{t(language, "Participant link origin", "ลิงก์หลักสำหรับผู้เรียน")}</label>
            <input id="join-origin" className="join-origin-input" value={joinOrigin} onChange={(event) => setJoinOrigin(event.target.value)} spellCheck={false} />
            <p className="origin-hint">{t(language, "For phones, use this computer’s Wi-Fi address instead of localhost.", "สำหรับมือถือ ให้ใช้ IP เครื่องนี้ใน Wi-Fi แทน localhost")}</p>
          </section>

          <section className="roster-panel">
            <div className="panel-heading panel-heading--tight"><div><p className="eyebrow">{t(language, "In the room", "ในห้อง")}</p><h2>{t(language, "Learners", "ผู้เรียน")}</h2></div><span className="roster-count"><Users size={14} />{rows.length}</span></div>
            {rows.length ? <ol className="roster-list">{rows.map((learner) => <LearnerRow key={learner.id} participant={learner} progress={counts.get(learner.id)} revealed={Boolean(revealed)} language={language} />)}</ol>
              : <div className="empty-roster"><span>✳</span><p>{t(language, "Share the QR code. Learners appear here as they join.", "แชร์ QR Code แล้วชื่อผู้เรียนจะแสดงที่นี่")}</p></div>}
          </section>

          {revealed && <section className="host-award-panel"><span className="award-star">✦</span><div><p>{t(language, "Improvement award", "รางวัลพัฒนาการ")}</p><strong>{state.improvementAward.length ? state.improvementAward.map((winner) => winner.nickname).join(", ") : "—"}</strong>{state.improvementAward.length > 0 && <small>+{state.improvementAward[0].points} {t(language, "points", "คะแนน")}</small>}</div></section>}
        </aside>
      </section>
    </>}
  </main>;
}

function AgendaItem({ slide, index, current, language, onSelect, locked }: { slide: HostRoomState["slides"][number]; index: number; current: number; language: Language; onSelect: () => void; locked: boolean }) {
  return <li className={`${index === current ? "is-current" : ""} ${index < current ? "is-past" : ""}`}>
    <button onClick={onSelect} disabled={locked} aria-current={index === current ? "step" : undefined}>
      <span className="agenda-index">{index < current ? <Check size={12} /> : String(index + 1).padStart(2, "0")}</span>
      <span className="agenda-item-copy"><strong>{language === "th" ? slide.titleTh : slide.titleEn}</strong><small>{slide.minutes} {t(language, "min", "นาที")}<em> · </em><PhasePill phase={slide.phase} language={language} /></small></span>
    </button>
  </li>;
}

function LearnerRow({ participant, progress, revealed, language }: { participant: Participant; progress?: { one: boolean; two: boolean; scoreOne?: number; scoreTwo?: number }; revealed: boolean; language: Language }) {
  return <li className="roster-row">
    <span className="avatar-badge">{participant.nickname.slice(0, 1).toLocaleUpperCase()}</span>
    <span className="roster-name">{participant.nickname}<small>{progress?.two ? t(language, "2 attempts", "ส่งแล้ว 2 รอบ") : progress?.one ? t(language, "1 attempt", "ส่งแล้ว 1 รอบ") : t(language, "Joined", "เข้าร่วมแล้ว")}</small></span>
    {revealed && progress?.scoreTwo !== undefined ? <strong className="roster-score">{progress.scoreTwo}</strong> : <span className="attempt-dots"><i className={progress?.one ? "is-filled" : ""} /><i className={progress?.two ? "is-filled" : ""} /></span>}
  </li>;
}

function Clock3Icon() { return <span className="clock-icon">◷</span>; }
