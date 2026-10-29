import { useState } from "react";
import { ArrowRight, LockKeyhole, Smartphone } from "lucide-react";
import { createRoom, getPresenterPlans, tokens, type PresenterPlan } from "./api";
import { PixelIcon } from "./case/PixelIcon";
import type { Language } from "./shared/types";
import type { Theme } from "./theme";
import { Brand, Cmd, Cursor, LanguageSwitch, Notice, TerminalWindow, ThemeToggle, t } from "./ui";

export default function Landing({ language, onLanguage, theme, onTheme, hostReady, navigate }: {
  language: Language;
  onLanguage: (language: Language) => void;
  theme: Theme;
  onTheme: () => void;
  hostReady: boolean | null;
  navigate: (url: string) => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState<PresenterPlan[] | null>(null);
  const [planId, setPlanId] = useState("");

  async function startSession(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      // Step 1: check the passphrase and load the published plans. Step 2: start a room from the chosen one.
      if (plans === null) {
        const { plans: available } = await getPresenterPlans(passphrase);
        setPlans(available);
        setPlanId(available[0]?.snapshotId ?? "");
        return;
      }
      const created = await createRoom(passphrase, planId);
      tokens.setHost(created.roomCode, created.hostToken);
      navigate(`/?view=host&room=${created.roomCode}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the room.");
    } finally { setBusy(false); }
  }

  function goJoin(event: React.FormEvent) {
    event.preventDefault();
    if (roomCode.length === 6) navigate(`/?view=join&room=${roomCode}`);
  }

  return <main className="landing">
    <header className="app-header">
      <Brand />
      <div className="app-header-right">
        <span className="mono-dim hide-sm">4Seas Nimman · Chiang Mai</span>
        <LanguageSwitch value={language} onChange={onLanguage} />
        <ThemeToggle theme={theme} onToggle={onTheme} language={language} />
      </div>
    </header>

    <section className="landing-hero">
      <TerminalWindow title="4seas — live-training — zsh" className="hero-term">
        <Cmd>whoami</Cmd>
        <p className="mono-dim">{t(language, "4Seas team member, ready to level up", "ทีม 4Seas พร้อมพัฒนาฝีมือ")}</p>
        <Cmd>cat today.md</Cmd>
        {theme === "halloween"
          ? <>
            <h1 className="hero-title hero-title--hw"><PixelIcon situationId="pumpkin" size={64} /><span>{t(language, "Trick or Prompt", "หลอกหรือพรอมป์")}<span className="accent">?</span></span></h1>
            <p className="hero-sub">{t(language, "A spooky-season session for the 4Seas team: learn on the big screen, then join from your phone with the room code.", "เวิร์กช็อปรับฮาโลวีนของทีม 4Seas: เรียนรู้บนจอใหญ่ แล้วเข้าร่วมจากมือถือด้วยรหัสห้อง")}</p>
          </>
          : <>
            <h1 className="hero-title">{t(language, "Live Training", "อบรมสด")}<span className="accent">.</span></h1>
            <p className="hero-sub">{t(language, "Weekly hands-on sessions for the 4Seas team: learn together on the big screen, join from your phone with a room code.", "เวิร์กช็อปสดรายสัปดาห์ของทีม 4Seas: เรียนรู้ร่วมกันบนจอใหญ่ และเข้าร่วมจากมือถือด้วยรหัสห้อง")}</p>
          </>}
        <ol className="hero-flow mono">
          {["join", "learn", "try", "vote", "feedback"].map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
        </ol>
        <Cmd><Cursor /></Cmd>
      </TerminalWindow>
    </section>

    {error && <div className="landing-notice"><Notice>{error}</Notice></div>}

    <section className="entry-grid">
      <TerminalWindow title="join.sh" className="entry entry--join">
        <form onSubmit={goJoin}>
          <h2><Smartphone size={20} />{t(language, "Join a session", "เข้าร่วมเซสชัน")}</h2>
          <p className="hint">{t(language, "Enter the six-digit room code on the screen. No account needed.", "ใส่รหัสห้อง 6 หลักที่แสดงบนจอ ไม่ต้องมีบัญชี")}</p>
          <label className="field-label" htmlFor="room-code">room code</label>
          <input id="room-code" className="input code-input" inputMode="numeric" autoComplete="off" pattern="\d{6}" maxLength={6}
            value={roomCode} onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" />
          <button className="btn btn--accent btn--block" type="submit" disabled={roomCode.length !== 6}>{t(language, "Continue", "ต่อไป")}<ArrowRight size={16} /></button>
        </form>
      </TerminalWindow>
      <TerminalWindow title="presenter.sh" className="entry">
        <form onSubmit={startSession}>
          <h2><LockKeyhole size={20} />{t(language, "Presenter", "ผู้สอน")}</h2>
          <p className="hint">{t(language, "Pick a published session and run it: slides, activities and results.", "เลือกเซสชันที่เผยแพร่แล้วและควบคุมสไลด์ กิจกรรม และผลลัพธ์")}</p>
          {hostReady === false && <Notice kind="info">{t(language, "Presenter setup needed: set HOST_PASSPHRASE (in .dev.vars locally, or as a Worker secret).", "ต้องตั้งค่า HOST_PASSPHRASE ก่อน (ใน .dev.vars หรือเป็น secret ของ Worker)")}</Notice>}
          <label className="field-label" htmlFor="host-passphrase">{t(language, "presenter passphrase", "รหัสผู้สอน")}</label>
          <input id="host-passphrase" className="input" type="password" autoComplete="current-password" value={passphrase} readOnly={plans !== null}
            onChange={(event) => setPassphrase(event.target.value)} required />
          {plans !== null && (plans.length ? <>
            <label className="field-label" htmlFor="plan-pick">{t(language, "session to run", "เซสชันที่จะสอน")}</label>
            <select id="plan-pick" className="input" value={planId} onChange={(event) => setPlanId(event.target.value)}>
              {plans.map((plan) => <option key={plan.snapshotId} value={plan.snapshotId}>{plan.weekDate ? `${plan.weekDate} · ` : ""}{plan.title} (v{plan.version})</option>)}
            </select>
          </> : <Notice kind="info">{t(language, "No published plans yet. Publish one in the Training Studio, then come back.", "ยังไม่มีแผนที่เผยแพร่ เผยแพร่ใน Training Studio ก่อนแล้วกลับมาที่นี่")}</Notice>)}
          <button className="btn btn--block" type="submit" disabled={busy || hostReady === false || !passphrase || (plans !== null && !planId)}>
            {busy ? t(language, "Working…", "กำลังทำงาน…") : plans === null ? t(language, "Continue", "ต่อไป") : t(language, "Create room", "สร้างห้อง")}<ArrowRight size={16} /></button>
          {plans !== null && <button type="button" className="link-button" onClick={() => { setPlans(null); setError(""); }}>{t(language, "Use a different passphrase", "ใช้รหัสอื่น")}</button>}
        </form>
      </TerminalWindow>
    </section>

    <footer className="landing-foot mono-dim"><button className="link-button" style={{ display: "inline-flex" }} onClick={() => navigate("/?view=admin")}>{t(language, "Training Studio (admin)", "Training Studio (ผู้ดูแล)")}</button></footer>
  </main>;
}
