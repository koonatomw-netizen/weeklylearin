import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BarChart3, CalendarDays, LayoutDashboard, Library as LibraryIcon, LogOut, MessageSquareText, PanelsTopLeft, Plus, Radio, ArrowRight, LockKeyhole } from "lucide-react";
import type { Language } from "../shared/types";
import type { Theme } from "../theme";
import { Brand, Cmd, Cursor, LanguageSwitch, Notice, TerminalWindow, ThemeToggle, t } from "../ui";
import { SESSION_ENDED, adminApi, adminToken, type Dashboard } from "./adminApi";
import Library from "./Library";

type Section = "dashboard" | "planner" | "library" | "builder" | "live" | "feedback" | "history";

const SECTIONS: Array<{ id: Section; en: string; th: string; icon: ReactNode; phase?: number }> = [
  { id: "dashboard", en: "Dashboard", th: "ภาพรวม", icon: <LayoutDashboard size={17} /> },
  { id: "planner", en: "Weekly Planner", th: "แผนรายสัปดาห์", icon: <CalendarDays size={17} />, phase: 4 },
  { id: "library", en: "Lesson Library", th: "คลังบทเรียน", icon: <LibraryIcon size={17} /> },
  { id: "builder", en: "Slide Builder", th: "สร้างสไลด์", icon: <PanelsTopLeft size={17} />, phase: 2 },
  { id: "live", en: "Live Sessions", th: "ห้องเรียนสด", icon: <Radio size={17} />, phase: 4 },
  { id: "feedback", en: "Feedback", th: "แบบสอบถาม", icon: <MessageSquareText size={17} />, phase: 5 },
  { id: "history", en: "Training History", th: "ประวัติการอบรม", icon: <BarChart3 size={17} />, phase: 5 },
];

function readSection(): Section {
  const value = new URL(window.location.href).searchParams.get("tab");
  return SECTIONS.some((section) => section.id === value) ? value as Section : "dashboard";
}

export default function AdminApp({ language, onLanguage, theme, onTheme, navigate }: {
  language: Language; onLanguage: (language: Language) => void; theme: Theme; onTheme: () => void; navigate: (url: string) => void;
}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(adminToken.get() ? null : false);
  const [section, setSection] = useState<Section>(readSection);

  useEffect(() => {
    if (signedIn !== null) return;
    adminApi.me().then(() => setSignedIn(true)).catch(() => setSignedIn(false));
  }, [signedIn]);

  useEffect(() => {
    const ended = () => setSignedIn(false);
    window.addEventListener(SESSION_ENDED, ended);
    return () => window.removeEventListener(SESSION_ENDED, ended);
  }, []);

  const go = useCallback((next: Section) => {
    setSection(next);
    window.history.replaceState({}, "", `/?view=admin&tab=${next}`);
  }, []);

  async function logout() {
    try { await adminApi.logout(); } catch { /* the session may already be gone */ }
    adminToken.set(null);
    setSignedIn(false);
  }

  const headerRight = <>
    <LanguageSwitch value={language} onChange={onLanguage} />
    <ThemeToggle theme={theme} onToggle={onTheme} language={language} />
  </>;

  if (signedIn === null) return <main className="center-page"><Brand /><p className="mono-dim">{t(language, "checking admin session…", "กำลังตรวจสอบสิทธิ์…")}</p></main>;
  if (!signedIn) return <AdminLogin language={language} headerRight={headerRight} onSignedIn={() => setSignedIn(true)} navigate={navigate} />;

  return <main className="admin">
    <header className="app-header">
      <Brand compact />
      <div className="app-header-mid"><span className="header-title">Training Studio · {t(language, "Admin workspace", "พื้นที่ผู้ดูแล")}</span></div>
      <div className="app-header-right">
        {headerRight}
        <button className="btn btn--ghost" onClick={() => void logout()}><LogOut size={15} />{t(language, "Sign out", "ออกจากระบบ")}</button>
      </div>
    </header>
    <nav className="admin-nav" aria-label={t(language, "Admin sections", "เมนูผู้ดูแล")}>
      {SECTIONS.map((item) => <button key={item.id} className={section === item.id ? "is-on" : ""} aria-current={section === item.id ? "page" : undefined} onClick={() => go(item.id)}>
        {item.icon}{t(language, item.en, item.th)}{item.phase && <span className="phase-tag">P{item.phase}</span>}
      </button>)}
    </nav>
    <section className="admin-main">
      {section === "dashboard" && <DashboardView language={language} go={go} />}
      {section === "library" && <Library language={language} />}
      {section === "planner" && <Coming language={language} title="Weekly Planner" phase={4} items={[
        "Create a weekly plan: title, date, duration, notes and the Prompt Battle challenge",
        "Pick slides from any lesson and reorder them",
        "Duplicate last week's plan, save draft, preview, publish",
        "Publishing freezes a versioned snapshot, so later library edits never change history",
      ]} />}
      {section === "builder" && <Coming language={language} title="Slide Builder" phase={2} items={[
        "Three-pane editor: slide list · 16:9 canvas · properties",
        "Drag, resize, layer order, text formatting within the 4Seas theme, shapes",
        "Undo/redo, autosave with conflict detection, preview and fullscreen preview",
        "Until then: create, duplicate, reorder, rename and preview slides in the Lesson Library",
      ]} />}
      {section === "live" && <Coming language={language} title="Live Sessions" phase={4} items={[
        "Start a room from a published plan; Presenter Mode will show its snapshot",
        "Today: rooms use the built-in Week 01 deck — create one from the home page",
      ]} action={<button className="btn" onClick={() => navigate("/")}>{t(language, "Open presenter start page", "ไปหน้าเริ่มห้องผู้สอน")}<ArrowRight size={15} /></button>} />}
      {section === "feedback" && <Coming language={language} title="Feedback" phase={5} items={[
        "Completion and average rating across sessions, with management-only individual answers",
        "Today: each session's feedback is in Presenter → Feedback (status, CSV, answers)",
      ]} />}
      {section === "history" && <Coming language={language} title="Training History" phase={5} items={[
        "Past sessions with their frozen slide snapshot, results and feedback exports",
      ]} />}
    </section>
  </main>;
}

function AdminLogin({ language, headerRight, onSignedIn, navigate }: { language: Language; headerRight: ReactNode; onSignedIn: () => void; navigate: (url: string) => void }) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { token } = await adminApi.login(passphrase);
      adminToken.set(token);
      setPassphrase("");
      onSignedIn();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }
  return <main>
    <header className="app-header"><Brand /><div className="app-header-right">{headerRight}</div></header>
    <div className="admin-login">
      <TerminalWindow title="studio — admin sign-in">
        <form onSubmit={submit}>
          <Cmd>sudo studio --admin<Cursor /></Cmd>
          <h1 className="p-title"><LockKeyhole size={20} />4Seas Training Studio</h1>
          <p className="hint">{t(language, "For training admins. Sessions last 12 hours on this device.", "สำหรับผู้ดูแลการอบรม ระบบจะจำการเข้าสู่ระบบบนเครื่องนี้ 12 ชั่วโมง")}</p>
          <label className="field-label" htmlFor="admin-pass">{t(language, "admin passphrase", "รหัสผู้ดูแล")}</label>
          <input id="admin-pass" className="input" type="password" autoComplete="current-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoFocus />
          {error && <Notice>{error}</Notice>}
          <button className="btn btn--accent btn--block" type="submit" disabled={busy || !passphrase}>{busy ? t(language, "Signing in…", "กำลังเข้าสู่ระบบ…") : t(language, "Sign in", "เข้าสู่ระบบ")}</button>
          <button type="button" className="link-button" onClick={() => navigate("/")}>{t(language, "← Back to live training", "← กลับหน้าอบรมสด")}</button>
        </form>
      </TerminalWindow>
    </div>
  </main>;
}

function DashboardView({ language, go }: { language: Language; go: (section: Section) => void }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { adminApi.dashboard().then(setData).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the dashboard.")); }, []);
  return <>
    <div className="admin-title"><div><h1>Dashboard</h1><p>{t(language, "Plan, build and review weekly training.", "วางแผน สร้าง และทบทวนการอบรมรายสัปดาห์")}</p></div>
      <div className="button-row"><button className="btn btn--accent" onClick={() => go("library")}><Plus size={15} />{t(language, "New lesson", "บทเรียนใหม่")}</button></div></div>
    {error && <Notice>{error}</Notice>}
    <div className="card-grid">
      {[["lessons", data?.lessons, "บทเรียน"], ["slides", data?.slides, "สไลด์"], ["sessions", data?.sessions, "ห้องเรียน"], ["feedback replies", data?.feedback, "คำตอบแบบสอบถาม"]].map(([label, value, th]) =>
        <div className="stat" key={label as string}><span>{t(language, label as string, th as string)}</span><b>{value ?? "—"}</b></div>)}
    </div>
    <TerminalWindow title="admin.log">
      {data?.recent.length ? <ul className="log">{data.recent.map((row, index) => <li key={index}><span className="mono-dim">{new Date(row.createdAt).toLocaleString()}</span> <b>{row.action}</b></li>)}</ul>
        : <p className="mono-dim">{t(language, "> no admin activity yet", "> ยังไม่มีกิจกรรม")}</p>}
    </TerminalWindow>
  </>;
}

function Coming({ language, title, phase, items, action }: { language: Language; title: string; phase: number; items: string[]; action?: ReactNode }) {
  return <>
    <div className="admin-title"><div><h1>{title}</h1><p>{t(language, `Arrives in Phase ${phase}.`, `จะมาในเฟส ${phase}`)}</p></div></div>
    <TerminalWindow title={`phase-${phase}.md`} className="coming"><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>{action}</TerminalWindow>
  </>;
}
