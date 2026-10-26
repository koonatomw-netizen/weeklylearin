import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { getConfig, tokens } from "./api";
import JoinScreen from "./JoinScreen";
import Landing from "./Landing";
import ParticipantScreen from "./ParticipantScreen";
import PresenterScreen from "./PresenterScreen";
import ProjectorScreen from "./ProjectorScreen";
import type { Language } from "./shared/types";
import { useTheme } from "./theme";
import { Brand, Notice, t } from "./ui";

// The admin workspace is a separate chunk so phones never download the editor.
const AdminApp = lazy(() => import("./admin/AdminApp"));

interface PageLocation { view: string; room: string }

function readLocation(): PageLocation {
  const url = new URL(window.location.href);
  return { view: url.searchParams.get("view") ?? "home", room: (url.searchParams.get("room") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "") };
}

export default function App() {
  const [page, setPage] = useState<PageLocation>(readLocation);
  const [language, setLanguage] = useState<Language>(() => { try { return localStorage.getItem("4seas:language") === "th" ? "th" : "en"; } catch { return "en"; } });
  const [hostReady, setHostReady] = useState<boolean | null>(null);
  const presenterView = page.view === "host" || page.view === "projector" || page.view === "admin";
  const { theme, toggle } = useTheme(presenterView ? "dark" : undefined);

  useEffect(() => {
    const handlePop = () => setPage(readLocation());
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => { void getConfig().then((config) => setHostReady(config.hostReady)).catch(() => setHostReady(null)); }, []);

  const navigate = useCallback((url: string) => {
    window.history.pushState({}, "", url);
    setPage(readLocation());
    window.scrollTo(0, 0);
  }, []);

  const changeLanguage = useCallback((next: Language) => {
    setLanguage(next);
    try { localStorage.setItem("4seas:language", next); } catch { /* storage blocked */ }
  }, []);

  const common = { language, onLanguage: changeLanguage, theme, onTheme: toggle, navigate };
  const code = page.room;

  if (page.view === "admin") {
    return <Suspense fallback={<main className="center-page"><Brand /><p className="mono-dim">loading training studio…</p></main>}><AdminApp {...common} /></Suspense>;
  }
  if (presenterView && code) {
    const hostToken = tokens.host(code);
    if (!hostToken) return <main className="center-page"><Brand /><Notice>{t(language, "This browser does not hold presenter access for that room. Create a room from the home page.", "เบราว์เซอร์นี้ไม่มีสิทธิ์ผู้สอนของห้องนี้ กรุณาสร้างห้องจากหน้าแรก")}</Notice><button className="btn" onClick={() => navigate("/")}>{t(language, "Home", "หน้าแรก")}</button></main>;
    return page.view === "host"
      ? <PresenterScreen code={code} token={hostToken} {...common} />
      : <ProjectorScreen code={code} token={hostToken} language={language} />;
  }
  if ((page.view === "participant" || page.view === "join") && code) {
    const participantToken = tokens.participant(code);
    return participantToken
      ? <ParticipantScreen code={code} token={participantToken} {...common} />
      : <JoinScreen code={code} {...common} />;
  }
  return <Landing {...common} hostReady={hostReady} />;
}
