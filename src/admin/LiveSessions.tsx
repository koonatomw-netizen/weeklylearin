import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Radio, RefreshCw } from "lucide-react";
import { tokens } from "../api";
import type { Language } from "../shared/types";
import { Notice, TerminalWindow, formatCode, t } from "../ui";
import { adminApi, type AdminPlan, type AdminSession } from "./adminApi";
import { PlanStatus, startLiveSession } from "./Planner";

/** Start a room from a published plan, and reopen recent rooms from this browser. */
export default function LiveSessions({ language, navigate }: { language: Language; navigate: (url: string) => void }) {
  const [plans, setPlans] = useState<AdminPlan[] | null>(null);
  const [sessions, setSessions] = useState<AdminSession[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError("");
    adminApi.plans().then((result) => setPlans(result.plans.filter((plan) => plan.latestSnapshotId))).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load plans."));
    adminApi.sessions().then((result) => setSessions(result.sessions)).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load sessions."));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function start(plan: AdminPlan) {
    if (!plan.latestSnapshotId || busy) return;
    setBusy(true);
    setError("");
    try {
      const code = await startLiveSession(plan.latestSnapshotId);
      setNotice(t(language, `Room ${formatCode(code)} is live with "${plan.title}" v${plan.latestVersion}. The presenter opened in a new tab.`, `ห้อง ${formatCode(code)} เริ่มแล้วด้วย "${plan.title}" v${plan.latestVersion} หน้าผู้สอนเปิดในแท็บใหม่`));
      load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not start the session."); }
    finally { setBusy(false); }
  }

  return <>
    <div className="admin-title"><div><h1>Live Sessions</h1><p>{t(language, "Each session presents a frozen published version, so the room always sees exactly what you approved.", "ทุกห้องใช้เวอร์ชันที่เผยแพร่และล็อกแล้ว ผู้เข้าร่วมจึงเห็นตรงตามที่อนุมัติ")}</p></div>
      <button className="btn btn--ghost" onClick={load}><RefreshCw size={15} />{t(language, "Refresh", "รีเฟรช")}</button></div>
    {error && <Notice>{error}</Notice>}
    {notice && <Notice kind="success">{notice}</Notice>}
    <TerminalWindow title="published-plans">
      {plans === null ? <p className="mono-dim">loading…</p> : plans.length ? <ul className="versions">
        {plans.map((plan) => <li key={plan.id}>
          <b>{plan.title}</b><span className="mono-dim">{plan.weekDate ?? ""} · {plan.slideCount} {t(language, "slides", "สไลด์")}</span><PlanStatus plan={plan} language={language} />
          <button className="btn btn--accent" style={{ marginLeft: "auto" }} disabled={busy} onClick={() => void start(plan)}><Radio size={14} />{t(language, `Start v${plan.latestVersion}`, `เริ่ม v${plan.latestVersion}`)}</button>
        </li>)}
      </ul> : <p className="mono-dim">{t(language, "> no published plans yet — publish one in the Weekly Planner", "> ยังไม่มีแผนที่เผยแพร่ เผยแพร่ได้ใน Weekly Planner")}</p>}
      {plans?.some((plan) => plan.hasUnpublishedChanges) && <p className="hint">{t(language, "Plans marked \"unpublished changes\" will start with their last published version.", "แผนที่มี \"การแก้ที่ยังไม่เผยแพร่\" จะเริ่มด้วยเวอร์ชันที่เผยแพร่ล่าสุด")}</p>}
    </TerminalWindow>
    <TerminalWindow title="recent-sessions">
      {sessions === null ? <p className="mono-dim">loading…</p> : sessions.length ? <table className="data-table">
        <thead><tr><th>{t(language, "room", "ห้อง")}</th><th>{t(language, "deck", "สไลด์")}</th><th>{t(language, "started", "เริ่ม")}</th><th>{t(language, "stage", "ขั้น")}</th><th>{t(language, "people", "คน")}</th><th>{t(language, "feedback", "แบบสอบถาม")}</th><th /></tr></thead>
        <tbody>{sessions.map((session) => {
          const canOpen = Boolean(tokens.host(session.code));
          return <tr key={session.code}>
            <td className="mono">{formatCode(session.code)}</td>
            <td>{session.title}{session.version ? <span className="mono-dim"> · v{session.version}</span> : <span className="mono-dim"> · built-in</span>}</td>
            <td className="mono-dim">{new Date(session.createdAt).toLocaleString()}</td>
            <td className="mono-dim">{session.activity}</td>
            <td className="mono">{session.participants}</td>
            <td className="mono">{session.feedback}/{session.participants}</td>
            <td>{canOpen
              ? <button className="btn btn--ghost" onClick={() => navigate(`/?view=host&room=${session.code}`)}><ExternalLink size={13} />{t(language, "Presenter", "ผู้สอน")}</button>
              : <span className="mono-dim" title={t(language, "Presenter access stays in the browser that started the room.", "สิทธิ์ผู้สอนอยู่ในเบราว์เซอร์ที่เริ่มห้อง")}>—</span>}</td>
          </tr>;
        })}</tbody>
      </table> : <p className="mono-dim">{t(language, "> no sessions yet", "> ยังไม่มีห้องเรียน")}</p>}
    </TerminalWindow>
  </>;
}
