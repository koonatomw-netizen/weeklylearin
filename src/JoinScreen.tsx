import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { joinRoom, tokens } from "./api";
import type { Language } from "./shared/types";
import type { Theme } from "./theme";
import { Brand, Cmd, LanguageSwitch, Notice, TerminalWindow, ThemeToggle, formatCode, t } from "./ui";

export default function JoinScreen({ code, language, onLanguage, theme, onTheme, navigate }: {
  code: string;
  language: Language;
  onLanguage: (language: Language) => void;
  theme: Theme;
  onTheme: () => void;
  navigate: (url: string) => void;
}) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = /^[A-Z0-9]{6}$/.test(code);

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const joined = await joinRoom(code, nickname);
      tokens.setParticipant(code, joined.participantToken);
      navigate(`/?view=participant&room=${code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join this room.");
    } finally { setBusy(false); }
  }

  return <main className="join">
    <header className="app-header app-header--compact">
      <Brand compact />
      <div className="app-header-right"><LanguageSwitch value={language} onChange={onLanguage} /><ThemeToggle theme={theme} onToggle={onTheme} language={language} /></div>
    </header>
    <div className="join-wrap">
      <TerminalWindow title={`join ${formatCode(code)}`} className="p-card">
        <form onSubmit={handleJoin} className="join-form">
          <Cmd>join --room {code || "??????"}</Cmd>
          <h1 className="p-title">{t(language, "What should we call you?", "ให้เราเรียกคุณว่าอะไรดี?")}</h1>
          <p className="p-copy">{t(language, "Your name appears only when results are revealed. No account needed.", "ชื่อของคุณจะแสดงเมื่อเปิดผลเท่านั้น ไม่ต้องมีบัญชี")}</p>
          <label className="field-label" htmlFor="nickname">{t(language, "your name", "ชื่อของคุณ")}</label>
          <input id="nickname" className="input input--lg" value={nickname} maxLength={24} minLength={2} autoComplete="nickname" autoFocus
            onChange={(event) => setNickname(event.target.value)} placeholder={t(language, "e.g. Ploy", "เช่น พลอย")} required />
          {!valid && <Notice>{t(language, "This link has no valid room code.", "ลิงก์นี้ไม่มีรหัสห้องที่ถูกต้อง")}</Notice>}
          {error && <Notice>{error}</Notice>}
          <button className="btn btn--accent btn--block" type="submit" disabled={busy || !valid || nickname.trim().length < 2}>
            {busy ? t(language, "Joining…", "กำลังเข้าห้อง…") : t(language, "Join room", "เข้าห้อง")}<ArrowRight size={16} />
          </button>
        </form>
      </TerminalWindow>
      <button className="link-button" onClick={() => navigate("/")}><ArrowLeft size={14} />{t(language, "Enter a different code", "ใส่รหัสอื่น")}</button>
    </div>
  </main>;
}
