import { useEffect, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import { Moon, Sun } from "lucide-react";
import type { Language } from "./shared/types";
import type { Theme } from "./theme";

export function t(language: Language, english: string, thai: string): string {
  return language === "th" ? thai : english;
}

/** Original 4Seas mark: four stacked "sea" waves inside a rounded tile. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--accent)" />
    {[9, 14, 19, 24].map((y, index) => (
      <path key={y} d={`M7 ${y} q3 -3 6 0 t6 0 t6 0`} fill="none" stroke="var(--on-accent)" strokeWidth="2" strokeLinecap="round" opacity={1 - index * 0.18} />
    ))}
  </svg>;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand${compact ? " brand--compact" : ""}`}>
    <BrandMark size={compact ? 24 : 30} />
    <span className="brand-wordmark"><strong>4Seas</strong><small>live training</small></span>
  </div>;
}

export function WindowDots() {
  return <span className="window-dots" aria-hidden="true"><i /><i /><i /></span>;
}

export function TerminalWindow({ title, right, children, className = "", bodyClassName = "" }: {
  title: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return <section className={`term ${className}`}>
    <header className="term-head"><WindowDots /><span className="term-title">{title}</span>{right && <span className="term-right">{right}</span>}</header>
    <div className={`term-body ${bodyClassName}`}>{children}</div>
  </section>;
}

export function Cursor() {
  return <span className="cursor" aria-hidden="true" />;
}

export function Cmd({ children, user = "4seas", path = "~/training" }: { children: ReactNode; user?: string; path?: string }) {
  return <div className="cmd"><span className="cmd-user">{user}</span><span className="cmd-path">:{path}</span><span className="cmd-sigil">$</span> <span className="cmd-text">{children}</span></div>;
}

export function ThemeToggle({ theme, onToggle, language }: { theme: Theme; onToggle: () => void; language: Language }) {
  const label = theme === "dark" ? t(language, "Switch to light theme", "เปลี่ยนเป็นธีมสว่าง") : t(language, "Switch to dark theme", "เปลี่ยนเป็นธีมมืด");
  return <button className="icon-button" onClick={onToggle} aria-label={label} title={label}>
    {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
  </button>;
}

export function LanguageSwitch({ value, onChange }: { value: Language; onChange: (value: Language) => void }) {
  return <div className="segmented" role="group" aria-label="Display language">
    <button className={value === "en" ? "is-on" : ""} onClick={() => onChange("en")} aria-pressed={value === "en"}>EN</button>
    <button className={value === "th" ? "is-on" : ""} onClick={() => onChange("th")} aria-pressed={value === "th"}>ไทย</button>
  </div>;
}

export function LiveDot({ live, language }: { live: boolean; language: Language }) {
  return <span className={`live-dot${live ? " is-live" : ""}`} role="status"><i />{live ? t(language, "live", "สด") : t(language, "reconnecting", "กำลังเชื่อมต่อ")}</span>;
}

/** QR codes always render dark-on-light so phone cameras read them in either theme. */
export function QRStamp({ value, size = 156, label }: { value: string; size?: number; label?: string }) {
  const [source, setSource] = useState("");
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: "M", color: { dark: "#171717", light: "#ffffff" } })
      .then((data) => { if (active) setSource(data); })
      .catch(() => { if (active) setSource(""); });
    return () => { active = false; };
  }, [size, value]);
  return <figure className="qr" style={{ width: size }}>
    {source ? <img src={source} width={size} height={size} alt={label ?? "QR code to join this training room"} />
      : <div className="qr-fallback" style={{ width: size, height: size }} aria-label="QR code loading" />}
    {label && <figcaption>{label}</figcaption>}
  </figure>;
}

export function Notice({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: ReactNode }) {
  return <div className={`notice notice--${kind}`} role={kind === "error" ? "alert" : "status"}>{children}</div>;
}

export function formatCode(code: string): string {
  return /^\d{6}$/.test(code) ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}
