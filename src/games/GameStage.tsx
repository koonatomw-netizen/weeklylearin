import type { Language, SessionState } from "../shared/types";
import { formatCode, t } from "../ui";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** The running game on the big screen: the question, the answer options with live or revealed results, or a wall of typed answers. */
export function GameStage({ state, language }: { state: SessionState; language: Language }) {
  const game = state.game;
  if (!game) return null;
  const total = game.counts?.reduce((sum, value) => sum + value, 0) ?? 0;
  const status = game.status === "open"
    ? t(language, `Answers open · ${game.answered}/${game.eligible} answered`, `เปิดรับคำตอบ · ตอบแล้ว ${game.answered}/${game.eligible}`)
    : game.status === "closed" ? t(language, "Answers closed", "ปิดรับคำตอบแล้ว") : t(language, "Results", "ผลลัพธ์");
  return <div className="game-stage">
    <div className="game-top">
      <span>4Seas · live training</span>
      <span className="accent">{t(language, game.title.en, game.title.th)} · {game.questionIndex + 1}/{game.totalQuestions}</span>
    </div>
    <span className={`game-status is-${game.status}`}>{status}</span>
    <h2 className="game-question">{t(language, game.question.text.en, game.question.text.th)}</h2>
    {game.kind !== "open" ? <div className={`game-body${game.top ? " has-side" : ""}`}>
      <ul className="game-options">
        {game.question.options.map((option, index) => {
          const votes = game.counts?.[index] ?? 0;
          const share = total ? Math.round((votes / total) * 100) : 0;
          const isCorrect = game.correct === index;
          const dim = game.correct !== null && !isCorrect;
          return <li key={index} className={`game-option${isCorrect ? " is-correct" : ""}${dim ? " is-dim" : ""}`}>
            {game.counts && <span className="bar" style={{ width: `${share}%` }} />}
            <b className="letter">{LETTERS[index]}</b>
            <span className="label">{t(language, option.en, option.th)}</span>
            {game.counts && <span className="count">{votes}<small> · {share}%</small></span>}
          </li>;
        })}
      </ul>
      {game.top && <aside className="game-leaders">
        <h3>{t(language, "Leaders", "ผู้นำ")}</h3>
        <ol>{game.top.map((row, index) => <li key={`${row.nickname}-${index}`}><span>{row.nickname}</span><b>{row.points}</b></li>)}</ol>
      </aside>}
    </div> : <div className="game-wall">
      {game.texts?.length ? game.texts.map((text, index) => <p key={index} className="game-note">{text}</p>)
        : <p className="game-waiting">{t(language, "Waiting for answers…", "รอคำตอบ…")}</p>}
    </div>}
    <div className="game-foot">{t(language, "Join with room code", "เข้าร่วมด้วยรหัสห้อง")} <b>{formatCode(state.code)}</b></div>
  </div>;
}
