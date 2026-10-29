import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { situationById, type Rarity, type Situation } from "../shared/situations";
import type { Language, SessionState } from "../shared/types";
import { t } from "../ui";
import { PixelIcon } from "./PixelIcon";
import { LANDING_INDEX, REEL_MS, buildReelStrip, shouldAnimate } from "./reel";
import { isMuted, playChime, playTick, setMuted } from "./sound";

const TILE = 150;
const GAP = 10;
const REVEAL_MS = 4000;
const RARITY_LABEL: Record<Rarity, [string, string]> = {
  common: ["Common", "ทั่วไป"], rare: ["Rare", "หายาก"], epic: ["Epic", "เอพิค"], legendary: ["Legendary", "ในตำนาน"],
};

interface Run { mode: "spin" | "fade"; winner: Situation; strip: Situation[] }

/** Fullscreen case opening: a reel that slows onto the situation the server drew, then a reveal card. */
export function CaseReelOverlay({ state, language }: { state: SessionState; language: Language }) {
  // Seeded from the room's current roll so a reload or a late-opened projector shows the result without a spin.
  const seen = useRef(state.caseRoll?.roll ?? 0);
  const [run, setRun] = useState<Run | null>(null);
  const [go, setGo] = useState(false);
  const [landed, setLanded] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const strip = useRef<HTMLDivElement>(null);
  const roll = state.caseRoll;

  useEffect(() => {
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mode = shouldAnimate(seen.current, roll, reduced);
    if (mode === "none" || !roll) return;
    seen.current = roll.roll;
    // A plan's own pool arrives as titles only; the drawn case's full text is the room's current challenge.
    const custom = state.casePool?.map((tile): Situation => ({ id: tile.id, rarity: tile.rarity, challenge: { titleEn: tile.titleEn, titleTh: tile.titleTh, scenarioEn: "", scenarioTh: "", taskEn: "", taskTh: "" } }));
    const found = situationById(roll.situationId, custom);
    const winner = found && custom ? { ...found, challenge: state.challenge } : found;
    if (!winner) return;
    setRun({ mode, winner, strip: buildReelStrip(winner, Math.random, custom) });
    setGo(false);
    setSkipped(false);
    setLanded(mode === "fade");
  }, [roll?.roll, roll?.situationId]);

  // Start the slide on the next frame so the browser sees the start position first, then tick as tiles pass the line.
  useEffect(() => {
    if (!run || run.mode !== "spin" || skipped) return;
    let frame = 0;
    let lastIndex = -1;
    const started = performance.now();
    const start = window.requestAnimationFrame(() => setGo(true));
    const watch = () => {
      const element = strip.current;
      if (element) {
        const x = new DOMMatrixReadOnly(getComputedStyle(element).transform).m41;
        const index = Math.floor((-x + TILE / 2) / (TILE + GAP));
        if (index !== lastIndex && index >= 0) { lastIndex = index; if (performance.now() - started > 50) playTick(); }
      }
      frame = window.requestAnimationFrame(watch);
    };
    frame = window.requestAnimationFrame(watch);
    const done = window.setTimeout(() => setLanded(true), REEL_MS + 300);
    return () => { window.cancelAnimationFrame(start); window.cancelAnimationFrame(frame); window.clearTimeout(done); };
  }, [run, skipped]);

  useEffect(() => {
    if (!run || !landed) return;
    playChime(run.winner.rarity);
    const timer = window.setTimeout(() => setRun(null), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [run, landed]);

  const advance = () => { if (!landed) { setSkipped(true); setLanded(true); } else setRun(null); };
  useEffect(() => {
    if (!run) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") advance(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!run) return null;
  const { winner } = run;
  const rarity = winner.rarity;
  const offset = go ? LANDING_INDEX * (TILE + GAP) + TILE / 2 : TILE / 2;
  const showStrip = run.mode === "spin" && !skipped;
  const toggleMute = () => { setMuted(!muted); setMutedState(!muted); };
  const title = (situation: Situation) => t(language, situation.challenge.titleEn, situation.challenge.titleTh);

  return <div className="case-overlay" role="dialog" aria-label={t(language, "Case opening", "เปิดเคส")} onClick={advance}>
    <div className="case-controls" onClick={(event) => event.stopPropagation()}>
      <button className="icon-button" onClick={toggleMute} aria-label={muted ? t(language, "Unmute", "เปิดเสียง") : t(language, "Mute", "ปิดเสียง")}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
      <button className="btn btn--ghost" onClick={advance}>{landed ? t(language, "Close", "ปิด") : t(language, "Skip", "ข้าม")}</button>
    </div>
    {showStrip && <div className="case-viewport">
      <div className="case-line" />
      <div ref={strip} className="case-strip" style={{ transform: `translateX(${-offset}px)`, transition: go ? `transform ${REEL_MS}ms cubic-bezier(0.08, 0.6, 0.12, 1)` : "none" }}>
        {run.strip.map((situation, index) => <div key={index} className={`case-tile case-tile--${situation.rarity}`} style={{ width: TILE }}>
          <PixelIcon situationId={situation.id} size={64} />
          <span>{title(situation)}</span>
        </div>)}
      </div>
    </div>}
    {landed && <div className={`case-reveal case-reveal--${rarity}${run.mode === "fade" || skipped ? " is-fade" : ""}`} onClick={(event) => event.stopPropagation()}>
      <span className={`case-badge case-badge--${rarity}`}>{t(language, RARITY_LABEL[rarity][0], RARITY_LABEL[rarity][1])}</span>
      <PixelIcon situationId={winner.id} size={96} />
      <h2>{title(winner)}</h2>
      <p>{t(language, winner.challenge.scenarioEn, winner.challenge.scenarioTh)}</p>
    </div>}
  </div>;
}
