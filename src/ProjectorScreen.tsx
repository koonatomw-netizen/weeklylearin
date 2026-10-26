import { useEffect } from "react";
import { Maximize } from "lucide-react";
import { joinUrlFor, useFullscreen } from "./PresenterScreen";
import { Slide, SlideStage } from "./slides/Deck";
import type { Language } from "./shared/types";
import { useRoom } from "./useRoom";
import { Brand, Notice, t } from "./ui";

/** Audience display: mirrors the presenter's slide and step, with no controls. */
export default function ProjectorScreen({ code, token, language }: { code: string; token: string; language: Language }) {
  const { room, error, expired } = useRoom(code, token);
  const fullscreen = useFullscreen();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "f" || event.key === "F") fullscreen.toggle(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  if (expired) return <main className="center-page"><Brand /><Notice>{t(language, "Open the projector from the presenter console on this computer.", "เปิดหน้าจอโปรเจกเตอร์จากหน้าผู้สอนบนเครื่องนี้")}</Notice></main>;
  if (!room) return <main className="center-page"><Brand /><p className="mono-dim">{error || t(language, "connecting to live slides…", "กำลังเชื่อมต่อสไลด์…")}</p></main>;

  return <main><div className="projector" ref={fullscreen.ref}>
    <SlideStage className="stage--full">
      <Slide index={room.state.currentSlide} step={room.state.slideStep} language={language} state={room.state} joinUrl={joinUrlFor(code)} />
    </SlideStage>
    {!fullscreen.active && <button className="btn projector-fs" onClick={fullscreen.toggle}><Maximize size={15} />{t(language, "Fullscreen (F)", "เต็มจอ (F)")}</button>}
  </div></main>;
}
