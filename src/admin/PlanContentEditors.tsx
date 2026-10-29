import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_FEEDBACK_QUESTIONS, FEEDBACK_SLOTS, type Challenge, type FeedbackQuestions, type FeedbackSlot } from "../shared/deck";
import { RARITY_ORDER, SITUATIONS, type Rarity, type Situation } from "../shared/situations";
import { GAME_KINDS, GAME_LIMITS, MIN_OPTIONS, type GameDef, type GameKind, type GameQuestion } from "../shared/games";
import type { Language } from "../shared/types";
import { TerminalWindow, t } from "../ui";
import { adminApi, type CaseSet } from "./adminApi";

const SLOT_LABEL: Record<FeedbackSlot, [string, string]> = {
  trainingRating: ["1. rating (1–5, required)", "1. ให้คะแนน (1–5 จำเป็น)"],
  workChallenges: ["2. text answer (required)", "2. คำตอบข้อความ (จำเป็น)"],
  supportNeeded: ["3. text answer (required)", "3. คำตอบข้อความ (จำเป็น)"],
  trainingRequests: ["4. text answer (required)", "4. คำตอบข้อความ (จำเป็น)"],
  otherComments: ["5. text answer (optional)", "5. คำตอบข้อความ (ไม่บังคับ)"],
};

type Mode = "builtin" | "custom" | "off";
const modeOf = (situations: Situation[] | null): Mode => (situations === null ? "builtin" : situations.length ? "custom" : "off");

const blankCase = (index: number): Situation => ({
  id: `case-${index + 1}`, rarity: "common",
  challenge: { titleEn: "", titleTh: "", scenarioEn: "", scenarioTh: "", taskEn: "", taskTh: "" },
});

/** Editable list of cases (rarity, English and Thai title, scenario and task). Used by plans and by the Case Sets page. */
export function CaseListEditor({ situations, onChange, language }: { situations: Situation[]; onChange: (next: Situation[]) => void; language: Language }) {
  const update = (index: number, patch: Partial<Situation>) => onChange(situations.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const updateChallenge = (index: number, key: keyof Challenge, value: string) => update(index, { challenge: { ...situations[index].challenge, [key]: value } });
  return <>
    <ol className="plan-slides">
      {situations.map((item, index) => <li key={index} style={{ display: "block" }}>
        <div className="geometry geometry--2">
          <label className="props-field"><span className="field-label">{t(language, "rarity", "ความหายาก")}</span>
            <select className="input" value={item.rarity} onChange={(event) => update(index, { rarity: event.target.value as Rarity })}>
              {RARITY_ORDER.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
            </select></label>
          <span />
          <label className="props-field"><span className="field-label">title (EN)</span><input className="input" maxLength={80} value={item.challenge.titleEn} onChange={(event) => updateChallenge(index, "titleEn", event.target.value)} /></label>
          <label className="props-field"><span className="field-label">title (TH)</span><input className="input" maxLength={80} value={item.challenge.titleTh} onChange={(event) => updateChallenge(index, "titleTh", event.target.value)} /></label>
          <label className="props-field"><span className="field-label">scenario (EN)</span><textarea className="input" rows={2} maxLength={600} value={item.challenge.scenarioEn} onChange={(event) => updateChallenge(index, "scenarioEn", event.target.value)} /></label>
          <label className="props-field"><span className="field-label">scenario (TH)</span><textarea className="input" rows={2} maxLength={600} value={item.challenge.scenarioTh} onChange={(event) => updateChallenge(index, "scenarioTh", event.target.value)} /></label>
          <label className="props-field"><span className="field-label">task (EN)</span><textarea className="input" rows={2} maxLength={600} value={item.challenge.taskEn} onChange={(event) => updateChallenge(index, "taskEn", event.target.value)} /></label>
          <label className="props-field"><span className="field-label">task (TH)</span><textarea className="input" rows={2} maxLength={600} value={item.challenge.taskTh} onChange={(event) => updateChallenge(index, "taskTh", event.target.value)} /></label>
        </div>
        <button className="btn btn--ghost" onClick={() => onChange(situations.filter((_, i) => i !== index))}><Trash2 size={14} />{t(language, "Remove case", "ลบเคส")}</button>
      </li>)}
    </ol>
    <button className="btn" disabled={situations.length >= 30} onClick={() => onChange([...situations, blankCase(situations.length)])}><Plus size={14} />{t(language, "Add a case", "เพิ่มเคส")}</button>
  </>;
}

/** The plan's case-opening pool: the built-in cases, its own list (optionally copied from a saved set), or no case opening at all. */
export function SituationsEditor({ situations, onChange, language }: { situations: Situation[] | null; onChange: (next: Situation[] | null) => void; language: Language }) {
  const mode = modeOf(situations);
  const [sets, setSets] = useState<CaseSet[]>([]);
  useEffect(() => { adminApi.caseSets().then((result) => setSets(result.sets)).catch(() => undefined); }, []);
  const choose = (next: Mode) => {
    if (next === "builtin") onChange(null);
    else if (next === "off") onChange([]);
    else onChange(situations?.length ? situations : [blankCase(0)]);
  };

  return <TerminalWindow title="case-opening.pool">
    <p className="hint">{t(language, "The cases the presenter's \"Open case\" button can draw. Each plan can use its own cases, so a new week never needs code changes.", "เคสที่ปุ่ม \"เปิดเคส\" ของผู้สอนสุ่มได้ แต่ละแผนมีเคสของตัวเองได้ จึงไม่ต้องแก้โค้ดเมื่อเปลี่ยนสัปดาห์")}</p>
    <select className="input" value={mode} onChange={(event) => choose(event.target.value as Mode)} aria-label={t(language, "Case pool", "ชุดเคส")}>
      <option value="builtin">{t(language, "Built-in cases (guest and resident scenarios)", "เคสมาตรฐาน (สถานการณ์แขกและผู้พัก)")}</option>
      <option value="custom">{t(language, "This plan's own cases", "เคสของแผนนี้")}</option>
      <option value="off">{t(language, "No case opening (use the challenge above)", "ไม่ใช้การเปิดเคส (ใช้โจทย์ด้านบน)")}</option>
    </select>
    {mode === "custom" && <>
      <div className="button-row button-row--tight">
        <button className="btn btn--ghost" onClick={() => onChange(SITUATIONS.map((item) => ({ ...item, challenge: { ...item.challenge } })))}>
          {t(language, "Start from the built-in cases", "เริ่มจากเคสมาตรฐาน")}
        </button>
        {sets.length > 0 && <select className="input" value="" aria-label={t(language, "Copy cases from a saved set", "คัดลอกเคสจากชุดที่บันทึกไว้")}
          onChange={(event) => { const picked = sets.find((item) => item.id === event.target.value); if (picked) onChange(picked.situations.map((item) => ({ ...item, challenge: { ...item.challenge } }))); }}>
          <option value="">{t(language, "Copy cases from a saved set…", "คัดลอกเคสจากชุดที่บันทึกไว้…")}</option>
          {sets.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.situations.length})</option>)}
        </select>}
      </div>
      <CaseListEditor situations={situations ?? []} onChange={(next) => onChange(next.length ? next : [blankCase(0)])} language={language} />
    </>}
  </TerminalWindow>;
}

/** The wording of the end-of-session feedback form for this plan. */
export function FeedbackEditor({ questions, onChange, language }: { questions: FeedbackQuestions | null; onChange: (next: FeedbackQuestions | null) => void; language: Language }) {
  const set = (slot: FeedbackSlot, lang: "en" | "th", value: string) => onChange({ ...(questions ?? DEFAULT_FEEDBACK_QUESTIONS), [slot]: { ...(questions ?? DEFAULT_FEEDBACK_QUESTIONS)[slot], [lang]: value } });
  return <TerminalWindow title="weekly-feedback.questions">
    <p className="hint">{t(language, "Reword the five feedback questions for this week. The answer types stay the same, and reports keep the same columns.", "ปรับถ้อยคำคำถามแบบสอบถามทั้ง 5 ข้อของสัปดาห์นี้ ประเภทคำตอบและคอลัมน์รายงานยังเหมือนเดิม")}</p>
    <select className="input" value={questions ? "custom" : "default"} onChange={(event) => onChange(event.target.value === "custom" ? { ...DEFAULT_FEEDBACK_QUESTIONS } : null)} aria-label={t(language, "Feedback wording", "ถ้อยคำแบบสอบถาม")}>
      <option value="default">{t(language, "Default wording", "ถ้อยคำมาตรฐาน")}</option>
      <option value="custom">{t(language, "Custom wording for this plan", "ถ้อยคำเฉพาะแผนนี้")}</option>
    </select>
    {questions && FEEDBACK_SLOTS.map((slot) => <div key={slot} className="geometry geometry--2">
      <label className="props-field"><span className="field-label">{t(language, SLOT_LABEL[slot][0], SLOT_LABEL[slot][1])} (EN)</span><input className="input" maxLength={160} value={questions[slot].en} onChange={(event) => set(slot, "en", event.target.value)} /></label>
      <label className="props-field"><span className="field-label">(TH)</span><input className="input" maxLength={160} value={questions[slot].th} onChange={(event) => set(slot, "th", event.target.value)} /></label>
    </div>)}
  </TerminalWindow>;
}

const KIND_NAME: Record<GameKind, [string, string]> = { poll: ["Poll", "โพล"], quiz: ["Quiz (right answers score points)", "ควิซ (ตอบถูกได้คะแนน)"], open: ["Open answers", "ตอบอิสระ"] };
const blankText = { en: "", th: "" };
const blankQuestion = (kind: GameKind): GameQuestion => kind === "open"
  ? { text: { ...blankText }, options: [] }
  : { text: { ...blankText }, options: [{ ...blankText }, { ...blankText }], ...(kind === "quiz" ? { correct: 0 } : {}) };

/** Re-shape a game's questions when its type changes, keeping the wording the author already typed. */
function convertKind(game: GameDef, kind: GameKind): GameDef {
  return {
    ...game, kind,
    questions: game.questions.map((question) => {
      if (kind === "open") return { text: question.text, options: [] };
      const options = question.options.length >= MIN_OPTIONS ? question.options : [{ ...blankText }, { ...blankText }];
      return kind === "quiz" ? { text: question.text, options, correct: Math.min(question.correct ?? 0, options.length - 1) } : { text: question.text, options };
    }),
  };
}

/** Game Hub games for this plan: polls, quizzes and open-answer games, written entirely in the studio. */
export function GamesEditor({ games, onChange, language }: { games: GameDef[]; onChange: (next: GameDef[]) => void; language: Language }) {
  const setGame = (index: number, next: GameDef) => onChange(games.map((game, i) => (i === index ? next : game)));
  const setQuestion = (gameIndex: number, questionIndex: number, next: GameQuestion) =>
    setGame(gameIndex, { ...games[gameIndex], questions: games[gameIndex].questions.map((q, i) => (i === questionIndex ? next : q)) });

  return <TerminalWindow title="game-hub.games">
    <p className="hint">{t(language, "Games the host can start from the Game Hub tab, besides Prompt Battle. Add questions and options in English and Thai; Thai falls back to English.", "เกมที่ผู้สอนเริ่มได้จากแท็บ Game Hub นอกเหนือจาก Prompt Battle ใส่คำถามและตัวเลือกเป็นอังกฤษและไทย ถ้าไม่ใส่ไทยจะใช้อังกฤษ")}</p>
    <ol className="plan-slides">
      {games.map((game, gameIndex) => <li key={gameIndex} style={{ display: "block" }}>
        <div className="geometry geometry--2">
          <label className="props-field"><span className="field-label">{t(language, "type", "ประเภท")}</span>
            <select className="input" value={game.kind} onChange={(event) => setGame(gameIndex, convertKind(game, event.target.value as GameKind))}>
              {GAME_KINDS.map((kind) => <option key={kind} value={kind}>{t(language, KIND_NAME[kind][0], KIND_NAME[kind][1])}</option>)}
            </select></label>
          <span />
          <label className="props-field"><span className="field-label">game title (EN)</span><input className="input" maxLength={GAME_LIMITS.title} value={game.title.en} onChange={(event) => setGame(gameIndex, { ...game, title: { ...game.title, en: event.target.value } })} /></label>
          <label className="props-field"><span className="field-label">game title (TH)</span><input className="input" maxLength={GAME_LIMITS.title} value={game.title.th} onChange={(event) => setGame(gameIndex, { ...game, title: { ...game.title, th: event.target.value } })} /></label>
        </div>
        {game.questions.map((question, questionIndex) => <fieldset key={questionIndex} className="game-question-edit">
          <legend className="field-label">{t(language, `question ${questionIndex + 1}`, `ข้อ ${questionIndex + 1}`)}</legend>
          <div className="geometry geometry--2">
            <label className="props-field"><span className="field-label">text (EN)</span><input className="input" maxLength={GAME_LIMITS.text} value={question.text.en} onChange={(event) => setQuestion(gameIndex, questionIndex, { ...question, text: { ...question.text, en: event.target.value } })} /></label>
            <label className="props-field"><span className="field-label">text (TH)</span><input className="input" maxLength={GAME_LIMITS.text} value={question.text.th} onChange={(event) => setQuestion(gameIndex, questionIndex, { ...question, text: { ...question.text, th: event.target.value } })} /></label>
          </div>
          {game.kind !== "open" && question.options.map((option, optionIndex) => <div key={optionIndex} className="geometry geometry--2" style={{ alignItems: "end" }}>
            <label className="props-field"><span className="field-label">{t(language, `option ${optionIndex + 1} (EN)`, `ตัวเลือก ${optionIndex + 1} (EN)`)}</span><input className="input" maxLength={GAME_LIMITS.title} value={option.en} onChange={(event) => setQuestion(gameIndex, questionIndex, { ...question, options: question.options.map((o, i) => (i === optionIndex ? { ...o, en: event.target.value } : o)) })} /></label>
            <div className="button-row button-row--tight">
              <label className="props-field" style={{ flex: 1 }}><span className="field-label">(TH)</span><input className="input" maxLength={GAME_LIMITS.title} value={option.th} onChange={(event) => setQuestion(gameIndex, questionIndex, { ...question, options: question.options.map((o, i) => (i === optionIndex ? { ...o, th: event.target.value } : o)) })} /></label>
              {game.kind === "quiz" && <label className="hint" style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="radio" name={`correct-${gameIndex}-${questionIndex}`} checked={question.correct === optionIndex} onChange={() => setQuestion(gameIndex, questionIndex, { ...question, correct: optionIndex })} />{t(language, "right answer", "คำตอบที่ถูก")}</label>}
              <button className="icon-button" disabled={question.options.length <= MIN_OPTIONS} onClick={() => { const options = question.options.filter((_, i) => i !== optionIndex); setQuestion(gameIndex, questionIndex, { ...question, options, ...(game.kind === "quiz" ? { correct: Math.min(question.correct === undefined ? 0 : question.correct > optionIndex ? question.correct - 1 : question.correct, options.length - 1) } : {}) }); }} aria-label={t(language, "Remove option", "ลบตัวเลือก")}><Trash2 size={14} /></button>
            </div>
          </div>)}
          <div className="button-row button-row--tight">
            {game.kind !== "open" && <button className="btn btn--ghost" disabled={question.options.length >= GAME_LIMITS.options} onClick={() => setQuestion(gameIndex, questionIndex, { ...question, options: [...question.options, { ...blankText }] })}><Plus size={14} />{t(language, "Add option", "เพิ่มตัวเลือก")}</button>}
            <button className="btn btn--ghost" disabled={game.questions.length <= 1} onClick={() => setGame(gameIndex, { ...game, questions: game.questions.filter((_, i) => i !== questionIndex) })}><Trash2 size={14} />{t(language, "Remove question", "ลบข้อนี้")}</button>
          </div>
        </fieldset>)}
        <div className="button-row">
          <button className="btn" disabled={game.questions.length >= GAME_LIMITS.questions} onClick={() => setGame(gameIndex, { ...game, questions: [...game.questions, blankQuestion(game.kind)] })}><Plus size={14} />{t(language, "Add a question", "เพิ่มคำถาม")}</button>
          <button className="btn btn--danger" onClick={() => onChange(games.filter((_, i) => i !== gameIndex))}><Trash2 size={14} />{t(language, "Remove game", "ลบเกม")}</button>
        </div>
      </li>)}
    </ol>
    <button className="btn btn--accent" disabled={games.length >= GAME_LIMITS.games} onClick={() => onChange([...games, { id: `game-${games.length + 1}`, kind: "poll", title: { ...blankText }, questions: [blankQuestion("poll")] }])}><Plus size={14} />{t(language, "Add a game", "เพิ่มเกม")}</button>
  </TerminalWindow>;
}
