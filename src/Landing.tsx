import { useState } from "react";
import { ArrowRight, LockKeyhole, Smartphone } from "lucide-react";
import { createRoom, tokens } from "./api";
import { FIVE_PARTS } from "./shared/challenge";
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

  async function startSession(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const created = await createRoom(passphrase);
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
        <h1 className="hero-title">Prompt Engineering<span className="accent">.</span></h1>
        <p className="hero-sub">{t(language, "A live, hands-on session: write prompts, check your own work, then battle it out with peer voting.", "เวิร์กช็อปสด: เขียนพรอมป์ เช็กงานตัวเอง แล้วแข่งกันด้วยการโหวตของเพื่อนร่วมทีม")}</p>
        <ol className="hero-flow mono">
          {["write", "self-check", "improve", "select", "battle", "vote", "reveal"].map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
        </ol>
        <Cmd><Cursor /></Cmd>
      </TerminalWindow>
      <aside className="hero-parts">
        <p className="field-label">// {t(language, "the five-part formula", "สูตร 5 ส่วน")}</p>
        <ol>{FIVE_PARTS.map((part, index) => <li key={part.key}><span className="mono accent">0{index + 1}</span><b>{part.en}</b><small>{part.th}</small></li>)}</ol>
      </aside>
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
          <p className="hint">{t(language, "Create a room and run slides, writing, battles and results.", "สร้างห้อง แล้วควบคุมสไลด์ การเขียน แบทเทิล และผลลัพธ์")}</p>
          {hostReady === false && <Notice kind="info">{t(language, "Presenter setup needed: set HOST_PASSPHRASE (in .dev.vars locally, or as a Worker secret).", "ต้องตั้งค่า HOST_PASSPHRASE ก่อน (ใน .dev.vars หรือเป็น secret ของ Worker)")}</Notice>}
          <label className="field-label" htmlFor="host-passphrase">{t(language, "presenter passphrase", "รหัสผู้สอน")}</label>
          <input id="host-passphrase" className="input" type="password" autoComplete="current-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} required />
          <button className="btn btn--block" type="submit" disabled={busy || hostReady === false || !passphrase}>{busy ? t(language, "Creating…", "กำลังสร้าง…") : t(language, "Create room", "สร้างห้อง")}<ArrowRight size={16} /></button>
        </form>
      </TerminalWindow>
    </section>

    <footer className="landing-foot mono-dim">{t(language, "No AI judge — the room decides by vote.", "ไม่มี AI ตัดสิน — ทุกคนในห้องโหวตตัดสินเอง")} · <button className="link-button" style={{ display: "inline-flex" }} onClick={() => navigate("/?view=admin")}>{t(language, "Training Studio (admin)", "Training Studio (ผู้ดูแล)")}</button></footer>
  </main>;
}
