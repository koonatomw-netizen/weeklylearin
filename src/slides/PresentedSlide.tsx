import { useEffect, useState } from "react";
import { getDeck } from "../api";
import { GameStage } from "../games/GameStage";
import { CaseReelOverlay } from "../case/CaseReelOverlay";
import type { PublishedDeck } from "../shared/deck";
import type { Language, SessionState } from "../shared/types";
import { Slide, type BattleCommand } from "./Deck";
import { LiveWidget } from "./LiveWidgets";
import { SlideRenderer } from "./SlideRenderer";

/** Loads the frozen deck for a snapshot room once (it never changes), or nothing for legacy rooms. */
export function useDeck(code: string, token: string, snapshotId: string | null | undefined) {
  const [deck, setDeck] = useState<PublishedDeck | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!snapshotId) { setDeck(null); return; }
    let active = true;
    const load = (attempt: number) => {
      getDeck(code, token, snapshotId)
        .then((result) => { if (active) { setDeck(result.deck); setError(""); } })
        .catch((caught) => {
          if (!active) return;
          setError(caught instanceof Error ? caught.message : "Could not load the slides.");
          if (attempt < 5) window.setTimeout(() => load(attempt + 1), 1500 * (attempt + 1));
        });
    };
    load(0);
    return () => { active = false; };
  }, [code, token, snapshotId]);
  return { deck, error };
}

/** The slide currently presented: a published JSON slide with live widgets, or the built-in Week 01 deck. */
/** The slide currently presented, with the case-opening overlay on top so the projector and presenter stage both show it. */
export function PresentedSlide(props: Parameters<typeof PresentedSlideBody>[0]) {
  // While a Game Hub game runs, the big screen shows the game instead of the slide.
  if (props.state.activity === "game" && props.state.game) return <GameStage state={props.state} language={props.language} />;
  return <>
    <PresentedSlideBody {...props} />
    <CaseReelOverlay state={props.state} language={props.language} />
  </>;
}

function PresentedSlideBody({ state, deck, language, joinUrl, onCommand, busy }: {
  state: SessionState; deck: PublishedDeck | null; language: Language; joinUrl: string; onCommand?: (command: BattleCommand) => void; busy?: boolean;
}) {
  if (!state.snapshotId) return <Slide index={state.currentSlide} step={state.slideStep} language={language} state={state} joinUrl={joinUrl} onCommand={onCommand} busy={busy} />;
  const slide = deck?.slides[state.currentSlide];
  if (!slide) return <div className="slide-loading mono-dim">loading slides…</div>;
  return <div className="slide" key={state.currentSlide}>
    <SlideRenderer doc={slide.doc} step={state.slideStep}
      renderWidget={(kind, element) => <LiveWidget kind={kind} element={element} state={state} joinUrl={joinUrl} language={language} onCommand={onCommand} busy={busy} />} />
  </div>;
}
