import { useState, type ReactNode } from "react";
import { ChevronRight, Eye, Play, Square, X } from "lucide-react";
import type { GameKind } from "../shared/games";
import type { ControlAction, HostState, Language } from "../shared/types";
import { TerminalWindow, t } from "../ui";

const KIND_LABEL: Record<GameKind | "battle", [string, string]> = {
  battle: ["Prompt Battle", "Prompt Battle"],
  poll: ["Poll", "โพล"],
  quiz: ["Quiz", "ควิซ"],
  open: ["Open answers", "ตอบอิสระ"],
};
const KIND_HELP: Record<GameKind, [string, string]> = {
  poll: ["Everyone picks one option and the room watches the split live. No scores.", "ทุกคนเลือกหนึ่งตัวเลือกและเห็นสัดส่วนสดบนจอ ไม่มีคะแนน"],
  quiz: ["Each question has one right answer worth 100 points. Reveal shows the answer and this game's leaders.", "แต่ละข้อมีคำตอบที่ถูกหนึ่งข้อ ข้อละ 100 คะแนน เฉลยแล้วแสดงคำตอบและผู้นำของเกมนี้"],
  open: ["Everyone types a short answer and the answers appear together on the big screen, without names.", "ทุกคนพิมพ์คำตอบสั้นๆ และคำตอบทั้งหมดแสดงบนจอใหญ่โดยไม่ระบุชื่อ"],
};

/** The host's game picker. Prompt Battle is one card; the plan's own games are the others. */
export function GameHub({ state, language, busy, send, battlePanel }: {
  state: HostState; language: Language; busy: boolean; send: (action: ControlAction) => Promise<void>; battlePanel: ReactNode;
}) {
  const [selected, setSelected] = useState<string>(state.game?.id ?? "battle");
  const running = state.game;
  const chosen = state.games.find((game) => game.id === selected);
  const blocked = state.activity === "writing" || state.activity === "battle" || state.activity === "feedback";

  return <section>
    <div className="game-cards" role="list">
      <button role="listitem" className={`game-card${selected === "battle" ? " is-on" : ""}`} onClick={() => setSelected("battle")}>
        <span className="kind">{t(language, KIND_LABEL.battle[0], KIND_LABEL.battle[1])}</span>
        <b>{t(language, "Prompt Battle", "Prompt Battle")}</b>
        <span className="mono-dim">{t(language, "Write, vote, grand final", "เขียน โหวต รอบชิง")}</span>
      </button>
      {state.games.map((game) => <button key={game.id} role="listitem" className={`game-card${selected === game.id ? " is-on" : ""}${running?.id === game.id ? " is-live" : ""}`} onClick={() => setSelected(game.id)}>
        <span className="kind">{t(language, KIND_LABEL[game.kind][0], KIND_LABEL[game.kind][1])}</span>
        <b>{t(language, game.title.en, game.title.th)}</b>
        <span className="mono-dim">{game.questions} {t(language, game.questions === 1 ? "question" : "questions", "ข้อ")}</span>
        {running?.id === game.id && <span className="live">● {t(language, "running now", "กำลังเล่น")}</span>}
      </button>)}
    </div>
    {!state.games.length && <p className="hint">{t(language, "Add more games to this session in the Weekly Planner (Games section), then publish it.", "เพิ่มเกมของเซสชันนี้ได้ใน Weekly Planner (ส่วน Games) แล้วเผยแพร่")}</p>}

    {selected === "battle" && battlePanel}

    {chosen && running?.id === chosen.id && <TerminalWindow title="game.control" right={<span className={`status-chip is-${running.status === "open" ? "open" : "pending"}`}><i />{running.status}</span>}>
      <p className="lead">{t(language, running.question.text.en, running.question.text.th)}</p>
      <div className="stat-row">
        <div className="stat"><span>{t(language, "question", "ข้อที่")}</span><b>{running.questionIndex + 1}/{running.totalQuestions}</b></div>
        <div className="stat"><span>{t(language, "answered", "ตอบแล้ว")}</span><b>{running.answered}/{running.eligible}</b></div>
      </div>
      <div className="button-row">
        {running.status === "open" && <button className="btn btn--danger" disabled={busy} onClick={() => void send({ action: "game_close" })}><Square size={14} />{t(language, "Close answers", "ปิดรับคำตอบ")}</button>}
        {running.status === "closed" && <button className="btn btn--accent" disabled={busy} onClick={() => void send({ action: "game_reveal" })}><Eye size={15} />{running.kind === "quiz" ? t(language, "Reveal answer", "เฉลย") : t(language, "Show results", "แสดงผล")}</button>}
        {running.status !== "open" && (running.kind !== "quiz" || running.status === "revealed") && !running.isLast && <button className="btn btn--accent" disabled={busy} onClick={() => void send({ action: "game_next" })}><ChevronRight size={15} />{t(language, "Next question", "ข้อถัดไป")}</button>}
        <button className="btn btn--ghost" disabled={busy} onClick={() => void send({ action: "game_stop" })}><X size={15} />{t(language, "Stop game, back to slides", "จบเกม กลับไปสไลด์")}</button>
      </div>
      {running.isLast && running.status === "revealed" && <p className="hint">{t(language, "That was the last question.", "นี่คือข้อสุดท้าย")}</p>}
    </TerminalWindow>}

    {chosen && running?.id !== chosen.id && <TerminalWindow title="game.start">
      <p className="lead">{t(language, chosen.title.en, chosen.title.th)}</p>
      <p>{t(language, KIND_HELP[chosen.kind][0], KIND_HELP[chosen.kind][1])}</p>
      {blocked && <p className="hint">{t(language, "Close prompt writing, battles or feedback before starting a game.", "ปิดการเขียนพรอมป์ แบทเทิล หรือแบบสอบถามก่อนเริ่มเกม")}</p>}
      <div className="button-row">
        <button className="btn btn--accent" disabled={busy || blocked} onClick={() => void send({ action: "game_start", gameId: chosen.id })}><Play size={15} />{running ? t(language, "Switch to this game", "เปลี่ยนมาเล่นเกมนี้") : t(language, "Start game", "เริ่มเกม")}</button>
      </div>
    </TerminalWindow>}
  </section>;
}
