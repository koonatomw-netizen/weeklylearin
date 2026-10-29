import { useEffect, useState } from "react";
import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import { submitGameAnswer } from "../api";
import { GAME_LIMITS } from "../shared/games";
import type { Language, ParticipantSelf, RoomEnvelope, SessionState } from "../shared/types";
import { Notice, TerminalWindow, t } from "../ui";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** A participant's view of the running Game Hub game: answer the current question, then see the results the host reveals. */
export function GamePlay({ state, me, code, token, language, setRoom }: {
  state: SessionState; me: ParticipantSelf; code: string; token: string; language: Language; setRoom: (room: RoomEnvelope) => void;
}) {
  const game = state.game;
  const mine = me.game;
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setText(""); setError(""); }, [game?.id, game?.questionIndex]);

  if (!game) return <TerminalWindow title="game.sh" className="p-card"><p className="p-copy">{t(language, "The game has ended. Back to the main screen…", "จบเกมแล้ว กลับไปที่หน้าจอหลัก…")}</p></TerminalWindow>;

  const answered = Boolean(mine && (mine.choice !== null || mine.text !== null));
  const open = game.status === "open";
  const total = game.counts?.reduce((sum, value) => sum + value, 0) ?? 0;

  async function send(payload: { choice?: number; text?: string }) {
    if (sending || !game) return;
    setSending(true);
    setError("");
    try { setRoom(await submitGameAnswer(code, token, { gameId: game.id, questionIndex: game.questionIndex, ...payload })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Your answer could not be sent."); }
    finally { setSending(false); }
  }

  return <TerminalWindow title={`game · ${game.questionIndex + 1}/${game.totalQuestions}`} className="p-card"
    right={<span className="mono-dim">{t(language, game.title.en, game.title.th)}</span>}>
    <h1 className="p-title">{t(language, game.question.text.en, game.question.text.th)}</h1>

    {game.kind === "open" ? <>
      {!answered && open && <form onSubmit={(event) => { event.preventDefault(); if (text.trim()) void send({ text: text.trim() }); }}>
        <textarea className="input" rows={3} maxLength={GAME_LIMITS.answer} value={text} onChange={(event) => setText(event.target.value)}
          placeholder={t(language, "Type your answer", "พิมพ์คำตอบของคุณ")} aria-label={t(language, "Your answer", "คำตอบของคุณ")} />
        <button className="btn btn--accent btn--block" type="submit" disabled={sending || !text.trim()}>
          {sending ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}{t(language, "Send answer", "ส่งคำตอบ")}
        </button>
      </form>}
      {answered && <p className="p-copy"><CircleCheck size={16} className="ok" /> {t(language, "Sent:", "ส่งแล้ว:")} {mine?.text}</p>}
      {!answered && !open && <p className="p-copy">{t(language, "Answers are closed.", "ปิดรับคำตอบแล้ว")}</p>}
      {!open && game.texts && game.texts.length > 0 && <div className="game-wall-mini">{game.texts.slice(0, 20).map((entry, index) => <p key={index}>{entry}</p>)}</div>}
    </> : <>
      <div className="game-choices">
        {game.question.options.map((option, index) => {
          const votes = game.counts?.[index] ?? 0;
          const isMine = mine?.choice === index;
          const cls = ["game-choice", isMine ? "is-mine" : "", game.correct === index ? "is-correct" : "", game.correct !== null && isMine && game.correct !== index ? "is-wrong" : ""].join(" ");
          return <button key={index} className={cls} disabled={sending || answered || !open} onClick={() => void send({ choice: index })}>
            {game.counts && total > 0 && <span className="bar" style={{ width: `${Math.round((votes / total) * 100)}%` }} />}
            <b className="letter">{LETTERS[index]}</b><span>{t(language, option.en, option.th)}</span>
            {game.counts && <span style={{ marginLeft: "auto" }}>{votes}</span>}
          </button>;
        })}
      </div>
      {answered && open && <p className="p-copy"><CircleCheck size={16} className="ok" /> {t(language, "Answer sent. Waiting for the others…", "ส่งคำตอบแล้ว รอคนอื่น…")}</p>}
      {!answered && !open && <p className="p-copy">{t(language, "Answers are closed.", "ปิดรับคำตอบแล้ว")}</p>}
      {game.kind === "quiz" && game.status === "revealed" && mine && <p className="p-copy">
        {mine.correct === true ? t(language, "Correct! +100 points", "ถูกต้อง! +100 คะแนน") : mine.correct === false ? t(language, "Not this time.", "คราวนี้ยังไม่ถูก")
          : t(language, "You didn't answer this one.", "คุณไม่ได้ตอบข้อนี้")} {t(language, `Your points: ${mine.points}`, `คะแนนของคุณ: ${mine.points}`)}
      </p>}
      {game.top && <ol className="people">{game.top.map((row, index) => <li key={`${row.nickname}-${index}`}><b>{index + 1}.</b> {row.nickname}<span className="mono-dim">{row.points}</span></li>)}</ol>}
    </>}
    {error && <Notice>{error}</Notice>}
  </TerminalWindow>;
}
