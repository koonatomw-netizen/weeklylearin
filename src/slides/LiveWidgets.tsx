import type { SlideElement, WidgetKind } from "../shared/slideDoc";
import type { HostState, Language, SessionState } from "../shared/types";
import { Cmd, QRStamp, formatCode, t } from "../ui";
import { BattleBoard, ResultsBoard, activityLabel, type BattleCommand } from "./Deck";

/**
 * Live building blocks placed on JSON slides. They read the room's real state, so a published
 * deck shows the actual room code, submissions, battles and results. Presenter-only actions
 * (the next-step button) appear only when `onCommand` is given, never on the projector.
 */
export interface LiveWidgetProps {
  kind: WidgetKind;
  element: SlideElement;
  state: SessionState;
  joinUrl: string;
  language: Language;
  onCommand?: (command: BattleCommand) => void;
  busy?: boolean;
}

export function LiveWidget(props: LiveWidgetProps) {
  return <div className={`lw lw--${props.kind}`}>{body(props)}</div>;
}

function body({ kind, element, state, joinUrl, language, onCommand, busy }: LiveWidgetProps) {
  switch (kind) {
    case "join": {
      const qr = Math.max(120, Math.min(element.w - 60, element.h - 220, 420));
      return <div className="join-card lw-fill">
        <p className="join-label">{t(language, "join on your phone", "เข้าร่วมด้วยมือถือ")}</p>
        <QRStamp value={joinUrl} size={qr} />
        <p className="join-label">room code</p>
        <p className="join-code">{formatCode(state.code)}</p>
        {element.h > 560 && <p className="join-url mono-dim">{joinUrl.replace(/^https?:\/\//, "").replace(/\/\?.*$/, "")}</p>}
      </div>;
    }
    case "live-stats":
      return <div className="live-stats lw-fill">
        <div className="live-stat"><span>{t(language, "participants", "ผู้เข้าร่วม")}</span><strong>{state.participantCount}</strong></div>
        <div className="live-stat"><span>{t(language, "submitted", "ส่งแล้ว")}</span><strong>{state.submittedCount}<small>/{state.participantCount}</small></strong></div>
        <div className="live-stat"><span>{t(language, "prompts", "พรอมป์ทั้งหมด")}</span><strong>{state.totalSubmissions}</strong></div>
        <div className={`live-stat live-stat--status is-${state.activity}`}><span>status</span><strong><i />{activityLabel(state, language)}</strong></div>
      </div>;
    case "challenge":
      return <div className="lw-challenge lw-fill">
        <div className="sr-window-head"><span className="window-dots" aria-hidden="true"><i /><i /><i /></span><span>challenge.md · {state.challenge.titleEn}</span></div>
        <div className="lw-challenge-body">
          <p className="challenge-scenario">{t(language, state.challenge.scenarioEn, state.challenge.scenarioTh)}</p>
          <Cmd>{t(language, "task", "โจทย์")}</Cmd>
          <p className="challenge-task">{t(language, state.challenge.taskEn, state.challenge.taskTh)}</p>
          <p className="challenge-rules mono-dim">max 3 attempts · self-check · pick your best · battle</p>
        </div>
      </div>;
    case "battle":
      return <div className="lw-board lw-fill"><BattleBoard state={state} language={language} onCommand={onCommand} busy={busy} /></div>;
    case "leaderboard":
      return <div className="lw-board lw-fill"><ResultsBoard state={state} language={language} onCommand={onCommand} busy={busy} /></div>;
    case "feedback-status": {
      // Completion only. Individual answers never reach any slide.
      const feedback = (state as Partial<HostState>).feedback;
      return <div className="lw-feedback lw-fill">
        <p className="join-label">{t(language, "weekly feedback", "แบบสอบถามประจำสัปดาห์")}</p>
        {feedback ? <>
          <strong className="lw-feedback-pct">{feedback.completion}%</strong>
          <div className="completion-bar"><span style={{ width: `${feedback.completion}%` }} /></div>
          <p className="mono-dim">{feedback.submitted}/{state.participantCount} {t(language, "submitted", "ส่งแล้ว")}</p>
        </> : <p className="mono-dim">—</p>}
        {onCommand && state.activity !== "feedback" && <button className="btn btn--accent btn--lg" disabled={busy} onClick={() => onCommand("start_feedback")}>{t(language, "Start weekly feedback", "เริ่มแบบสอบถาม")}</button>}
        {state.activity === "feedback" && <p className="lw-feedback-hint">{t(language, "Please complete the form on your phone before you leave.", "กรุณาตอบแบบสอบถามบนมือถือก่อนกลับ")}</p>}
      </div>;
    }
  }
}
