import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_FEEDBACK_QUESTIONS, FEEDBACK_SLOTS, type Challenge, type FeedbackQuestions, type FeedbackSlot } from "../shared/deck";
import { RARITY_ORDER, SITUATIONS, type Rarity, type Situation } from "../shared/situations";
import type { Language } from "../shared/types";
import { TerminalWindow, t } from "../ui";

const SLOT_LABEL: Record<FeedbackSlot, [string, string]> = {
  trainingRating: ["1. rating (1–5, required)", "1. ให้คะแนน (1–5 จำเป็น)"],
  workChallenges: ["2. text answer (required)", "2. คำตอบข้อความ (จำเป็น)"],
  supportNeeded: ["3. text answer (required)", "3. คำตอบข้อความ (จำเป็น)"],
  trainingRequests: ["4. text answer (required)", "4. คำตอบข้อความ (จำเป็น)"],
  otherComments: ["5. text answer (optional)", "5. คำตอบข้อความ (ไม่บังคับ)"],
};

type Mode = "builtin" | "custom" | "off";
const modeOf = (situations: Situation[] | null): Mode => (situations === null ? "builtin" : situations.length ? "custom" : "off");

/** The plan's case-opening pool: the built-in cases, its own list, or no case opening at all. */
export function SituationsEditor({ situations, onChange, language }: { situations: Situation[] | null; onChange: (next: Situation[] | null) => void; language: Language }) {
  const mode = modeOf(situations);
  const blank = (index: number): Situation => ({
    id: `case-${index + 1}`, rarity: "common",
    challenge: { titleEn: "", titleTh: "", scenarioEn: "", scenarioTh: "", taskEn: "", taskTh: "" },
  });
  const update = (index: number, patch: Partial<Situation>) => onChange((situations ?? []).map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const updateChallenge = (index: number, key: keyof Challenge, value: string) => {
    const item = (situations ?? [])[index];
    update(index, { challenge: { ...item.challenge, [key]: value } });
  };
  const choose = (next: Mode) => {
    if (next === "builtin") onChange(null);
    else if (next === "off") onChange([]);
    else onChange(situations?.length ? situations : [blank(0)]);
  };

  return <TerminalWindow title="case-opening.pool">
    <p className="hint">{t(language, "The cases the presenter's \"Open case\" button can draw. Each plan can use its own cases, so a new week never needs code changes.", "เคสที่ปุ่ม \"เปิดเคส\" ของผู้สอนสุ่มได้ แต่ละแผนมีเคสของตัวเองได้ จึงไม่ต้องแก้โค้ดเมื่อเปลี่ยนสัปดาห์")}</p>
    <select className="input" value={mode} onChange={(event) => choose(event.target.value as Mode)} aria-label={t(language, "Case pool", "ชุดเคส")}>
      <option value="builtin">{t(language, "Built-in cases (guest and resident scenarios)", "เคสมาตรฐาน (สถานการณ์แขกและผู้พัก)")}</option>
      <option value="custom">{t(language, "This plan's own cases", "เคสของแผนนี้")}</option>
      <option value="off">{t(language, "No case opening (use the challenge above)", "ไม่ใช้การเปิดเคส (ใช้โจทย์ด้านบน)")}</option>
    </select>
    {mode === "custom" && <>
      <button className="btn btn--ghost" onClick={() => onChange(SITUATIONS.map((item) => ({ ...item, challenge: { ...item.challenge } })))}>
        {t(language, "Start from the built-in cases", "เริ่มจากเคสมาตรฐาน")}
      </button>
      <ol className="plan-slides">
        {(situations ?? []).map((item, index) => <li key={index} style={{ display: "block" }}>
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
          <button className="btn btn--ghost" onClick={() => { const rest = (situations ?? []).filter((_, i) => i !== index); onChange(rest.length ? rest : [blank(0)]); }}><Trash2 size={14} />{t(language, "Remove case", "ลบเคส")}</button>
        </li>)}
      </ol>
      <button className="btn" disabled={(situations?.length ?? 0) >= 30} onClick={() => onChange([...(situations ?? []), blank(situations?.length ?? 0)])}><Plus size={14} />{t(language, "Add a case", "เพิ่มเคส")}</button>
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
