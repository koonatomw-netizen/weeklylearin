import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Plus, Trash2 } from "lucide-react";
import type { Language } from "../shared/types";
import { SlideRenderer } from "../slides/SlideRenderer";
import { SlideStage } from "../slides/Deck";
import { Notice, TerminalWindow, formatCode, t } from "../ui";
import { adminApi, type FeedbackReportRow, type RecurringIssue, type SessionHistory } from "./adminApi";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function FeedbackReports({ language }: { language: Language }) {
  const [sessions, setSessions] = useState<FeedbackReportRow[] | null>(null);
  const [selected, setSelected] = useState<SessionHistory | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { adminApi.feedbackReport().then((result) => setSessions(result.sessions)).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load feedback.")); }, []);
  const totals = useMemo(() => {
    const rows = sessions ?? [];
    const replies = rows.reduce((sum, row) => sum + row.responses, 0);
    const invited = rows.reduce((sum, row) => sum + row.participants, 0);
    const rated = rows.filter((row) => row.averageRating !== null);
    const ratings = rated.reduce((sum, row) => sum + (row.averageRating ?? 0) * row.responses, 0);
    return { replies, invited, rating: replies ? (ratings / replies).toFixed(2) : "—" };
  }, [sessions]);
  async function select(code: string) {
    setError("");
    try { setSelected((await adminApi.sessionHistory(code)).session); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load answers."); }
  }
  async function exportCsv() {
    setBusy(true); setError("");
    try { download(await adminApi.downloadFeedbackCsv(), "4seas-training-feedback.csv"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not export feedback."); }
    finally { setBusy(false); }
  }
  return <>
    <div className="admin-title"><div><h1>{t(language, "Feedback", "แบบสอบถาม")}</h1><p>{t(language, "Completion and ratings across sessions. Individual answers are visible to signed-in admins.", "สรุปการตอบและคะแนนทุกห้อง ผู้ดูแลที่เข้าสู่ระบบดูคำตอบรายบุคคลได้")}</p></div>
      <button className="btn btn--accent" disabled={busy} onClick={() => void exportCsv()}><Download size={15} />{t(language, "Export all feedback", "ส่งออกคำตอบทั้งหมด")}</button></div>
    {error && <Notice>{error}</Notice>}
    <div className="card-grid"><div className="stat"><span>{t(language, "responses", "คำตอบ")}</span><b>{sessions ? totals.replies : "—"}</b></div><div className="stat"><span>{t(language, "participants", "ผู้เข้าร่วม")}</span><b>{sessions ? totals.invited : "—"}</b></div><div className="stat"><span>{t(language, "average rating", "คะแนนเฉลี่ย")}</span><b>{sessions ? totals.rating : "—"}<small>/ 5</small></b></div></div>
    <TerminalWindow title="feedback-by-session">
      {sessions === null ? <p className="mono-dim">loading…</p> : sessions.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>{t(language, "session", "ห้อง")}</th><th>{t(language, "date", "วันที่")}</th><th>{t(language, "completion", "ตอบแล้ว")}</th><th>{t(language, "average rating", "คะแนนเฉลี่ย")}</th><th /></tr></thead><tbody>{sessions.map((row) => <tr key={row.code}>
        <td><b>{row.title}</b><span className="mono-dim"> · {formatCode(row.code)}{row.version ? ` · v${row.version}` : ""}</span></td><td className="mono-dim">{new Date(row.createdAt).toLocaleDateString()}</td>
        <td className="mono">{row.responses}/{row.participants}{row.participants ? ` · ${Math.round(row.responses * 100 / row.participants)}%` : ""}</td><td className="mono">{row.averageRating?.toFixed(2) ?? "—"}</td>
        <td><button className="btn btn--ghost" onClick={() => void select(row.code)}><Eye size={14} />{t(language, "View answers", "ดูคำตอบ")}</button></td>
      </tr>)}</tbody></table></div> : <p className="mono-dim">{t(language, "> no sessions yet", "> ยังไม่มีห้องเรียน")}</p>}
    </TerminalWindow>
    {selected && <TerminalWindow title={`answers · ${selected.code}`} right={<button className="icon-button" onClick={() => setSelected(null)} aria-label={t(language, "Close answers", "ปิดคำตอบ")}>×</button>}>
      <h2 className="report-subtitle">{selected.title} · {selected.feedback.length}/{selected.participants} {t(language, "responses", "คำตอบ")}</h2>
      {selected.feedback.length ? <div className="answer-list">{selected.feedback.map((answer, index) => <article className="answer-card" key={`${answer.nickname}-${answer.submittedAt}-${index}`}>
        <header><b>{answer.nickname}</b><span className="mono-dim">{new Date(answer.submittedAt).toLocaleString()}</span><span className="rating-pill">{answer.trainingRating}/5</span></header>
        <dl>
          <dt>{t(language, "Work challenges", "ความท้าทายในการทำงาน")}</dt><dd>{answer.workChallenges}</dd>
          <dt>{t(language, "Support needed", "การสนับสนุนที่ต้องการ")}</dt><dd>{answer.supportNeeded}</dd>
          <dt>{t(language, "Learn next", "อยากเรียนรู้ต่อ")}</dt><dd>{answer.trainingRequests}</dd>
          {answer.otherComments ? <><dt>{t(language, "Other comments", "ความคิดเห็นเพิ่มเติม")}</dt><dd>{answer.otherComments}</dd></> : null}
        </dl>
      </article>)}</div> : <p className="mono-dim">{t(language, "> no submitted answers", "> ยังไม่มีคำตอบที่ส่งแล้ว")}</p>}
    </TerminalWindow>}
  </>;
}

export function TrainingHistory({ language }: { language: Language }) {
  const [sessions, setSessions] = useState<FeedbackReportRow[] | null>(null);
  const [issues, setIssues] = useState<RecurringIssue[] | null>(null);
  const [selected, setSelected] = useState<SessionHistory | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [tag, setTag] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    adminApi.feedbackReport().then((result) => setSessions(result.sessions)).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load history."));
    adminApi.recurringIssues().then((result) => setIssues(result.issues)).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load issue tags."));
  }, []);
  async function open(code: string) {
    setError("");
    try { setSelected((await adminApi.sessionHistory(code)).session); setSlideIndex(0); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load session history."); }
  }
  async function addTag(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !tag.trim() || busy) return;
    setBusy(true); setError("");
    try { const result = await adminApi.addSessionTag(selected.code, { tag: tag.trim(), note: note.trim() }); setSelected({ ...selected, tags: result.tags }); setTag(""); setNote(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save tag."); }
    finally { setBusy(false); }
  }
  async function removeTag(id: string) {
    if (!selected) return;
    try { const result = await adminApi.deleteSessionTag(selected.code, id); setSelected({ ...selected, tags: result.tags }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not remove tag."); }
  }
  return <>
    <div className="admin-title"><div><h1>{t(language, "Training History", "ประวัติการอบรม")}</h1><p>{t(language, "Review frozen decks, session outcomes, feedback and recurring issue tags.", "ดูสไลด์เวอร์ชันที่ใช้ ผลการอบรม แบบสอบถาม และแท็กปัญหาที่พบซ้ำ")}</p></div></div>
    {error && <Notice>{error}</Notice>}
    <TerminalWindow title="past-sessions">
      {sessions === null ? <p className="mono-dim">loading…</p> : sessions.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>{t(language, "session", "ห้อง")}</th><th>{t(language, "started", "เริ่ม")}</th><th>{t(language, "participants", "ผู้เข้าร่วม")}</th><th>{t(language, "feedback", "แบบสอบถาม")}</th><th /></tr></thead><tbody>{sessions.map((row) => <tr key={row.code}>
        <td><b>{row.title}</b><span className="mono-dim"> · {formatCode(row.code)}{row.version ? ` · v${row.version}` : " · built-in"}</span></td><td className="mono-dim">{new Date(row.createdAt).toLocaleString()}</td><td className="mono">{row.participants}</td><td className="mono">{row.responses}/{row.participants}</td><td><button className="btn btn--ghost" onClick={() => void open(row.code)}><Eye size={14}/>{t(language, "Review", "ทบทวน")}</button></td>
      </tr>)}</tbody></table></div> : <p className="mono-dim">{t(language, "> no training sessions yet", "> ยังไม่มีประวัติการอบรม")}</p>}
    </TerminalWindow>
    <TerminalWindow title="recurring-issues">
      <h2 className="report-subtitle">{t(language, "Issues tagged across sessions", "ประเด็นที่ติดแท็กในหลายห้อง")}</h2>
      {issues === null ? <p className="mono-dim">loading…</p> : issues.length ? <div className="recurring-issue-list">{issues.map((issue) => <article className="recurring-issue" key={issue.tag.toLocaleLowerCase()}>
        <header><b>{issue.tag}</b><span className="mono-dim">{issue.sessions.length} {t(language, "sessions", "ห้อง")}</span></header>
        <div>{issue.sessions.map((item, index) => <button className="link-button" key={`${item.code}-${index}`} onClick={() => void open(item.code)}>{item.title} · {formatCode(item.code)}{item.note ? ` — ${item.note}` : ""}</button>)}</div>
      </article>)}</div> : <p className="mono-dim">{t(language, "> add issue tags to sessions to spot recurring themes", "> เพิ่มแท็กในประวัติห้องเพื่อค้นหาประเด็นที่พบซ้ำ")}</p>}
    </TerminalWindow>
    {selected && <>
      <TerminalWindow title={`session · ${selected.code}`}>
        <div className="history-summary"><div><h2>{selected.title}</h2><p className="mono-dim">{new Date(selected.createdAt).toLocaleString()} · {selected.participants} {t(language, "participants", "ผู้เข้าร่วม")} · {selected.feedback.length} {t(language, "feedback replies", "คำตอบแบบสอบถาม")}</p>
          {selected.snapshotId && <p className="mono-dim">snapshot v{selected.version} · {t(language, "published", "เผยแพร่")} {selected.publishedAt ? new Date(selected.publishedAt).toLocaleDateString() : ""}</p>}
        </div><button className="btn btn--ghost" onClick={() => setSelected(null)}>{t(language, "Close", "ปิด")}</button></div>
        {!selected.deck && <Notice kind="info">{t(language, "This legacy session used the built-in Week 01 deck; no frozen JSON snapshot is available.", "ห้องรุ่นเก่านี้ใช้สไลด์ Week 01 ที่ฝังในระบบ จึงไม่มี JSON snapshot ให้เรียกดู")}</Notice>}
        {selected.deck && selected.deck.slides.length > 0 && <div className="history-preview">
          <nav aria-label={t(language, "Snapshot slides", "สไลด์ใน Snapshot")} className="history-slide-list">{selected.deck.slides.map((slide, index) => <button key={`${slide.sourceSlideId}-${index}`} className={slideIndex === index ? "is-on" : ""} aria-current={slideIndex === index ? "step" : undefined} onClick={() => setSlideIndex(index)}>{index + 1}. {slide.title || t(language, "Untitled slide", "สไลด์ไม่มีชื่อ")}</button>)}</nav>
          <div><h3>{selected.deck.slides[slideIndex]?.title}</h3><SlideStage><SlideRenderer doc={selected.deck.slides[slideIndex].doc} /></SlideStage><p className="hint">{t(language, "Presenter notes", "บันทึกผู้สอน")}: {selected.deck.slides[slideIndex].doc.notes || t(language, "No notes", "ไม่มีบันทึก")}</p></div>
        </div>}
      </TerminalWindow>
      <TerminalWindow title="session-review">
        <h2 className="report-subtitle">{t(language, "Prompt Battle results", "ผล Prompt Battle")}</h2>
        {selected.battles.length ? <div className="battle-review-list">{selected.battles.map((battle) => <article className="battle-review" key={battle.id}><h3>{battle.round} #{battle.sequence} <span className="mono-dim">· {battle.status}</span></h3>{battle.entries.map((entry) => <div key={`${entry.nickname}-${entry.prompt}`} className={entry.winner ? "battle-review-entry is-winner" : "battle-review-entry"}><b>{entry.nickname}{entry.winner ? ` · ${t(language, "winner", "ผู้ชนะ")}` : ""}</b><span className="mono-dim">{entry.votes} {t(language, "votes", "คะแนน")}</span><p>{entry.prompt}</p></div>)}{battle.resolutionNote && <p className="hint">{t(language, "Resolution", "บันทึกการตัดสิน")}: {battle.resolutionNote}</p>}</article>)}</div> : <p className="mono-dim">{t(language, "> no battle results recorded", "> ไม่มีผลแบทเทิล")}</p>}
      </TerminalWindow>
      <TerminalWindow title="recurring-issues">
        <h2 className="report-subtitle">{t(language, "Issue tags", "แท็กประเด็น")}</h2>
        <div className="tag-list">{selected.tags.map((item) => <div className="issue-tag" key={item.id}><b>{item.tag}</b>{item.note && <span>{item.note}</span>}<button className="icon-button" onClick={() => void removeTag(item.id)} aria-label={t(language, `Remove ${item.tag}`, `ลบ ${item.tag}`)}><Trash2 size={14}/></button></div>)}{!selected.tags.length && <p className="mono-dim">{t(language, "> no issue tags", "> ยังไม่มีแท็กประเด็น")}</p>}</div>
        <form className="issue-tag-form" onSubmit={(event) => void addTag(event)}><label className="field"><span>{t(language, "Tag", "แท็ก")}</span><input className="input" value={tag} maxLength={40} onChange={(event) => setTag(event.target.value)} required placeholder={t(language, "e.g. check-in policy", "เช่น นโยบายเช็กอิน")}/></label><label className="field"><span>{t(language, "Note (optional)", "หมายเหตุ (ไม่บังคับ)")}</span><input className="input" value={note} maxLength={240} onChange={(event) => setNote(event.target.value)}/></label><button className="btn btn--accent" disabled={busy || !tag.trim()}><Plus size={14}/>{t(language, "Add tag", "เพิ่มแท็ก")}</button></form>
      </TerminalWindow>
    </>}
  </>;
}
