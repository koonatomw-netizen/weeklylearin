import type { Evaluation, RubricScores } from "../shared/types";

const cues = {
  context: ["4seas", "nimman", "event", "งาน", "แขก", "guest", "ลูกค้า"],
  goal: ["draft", "write", "create", "ร่าง", "เขียน", "สร้าง", "เชิญ"],
  audience: ["guest", "customer", "แขก", "ลูกค้า", "ผู้เข้าพัก"],
  constraints: ["do not", "don't", "must", "avoid", "ไม่", "ห้าม", "เท่านั้น", "คำ", "สั้น"],
  format: ["line", "message", "ข้อความ", "ภาษาไทย", "english", "bullet", "ประโยค"],
} as const;

function hasAny(text: string, terms: readonly string[]): boolean {
  const normalized = text.toLocaleLowerCase();
  return terms.some((term) => normalized.includes(term.toLocaleLowerCase()));
}

export function scorePromptDemo(prompt: string): Evaluation {
  const trimmed = prompt.trim();
  const longEnough = trimmed.length >= 80;
  const hasSpecifics = trimmed.length >= 170;
  const rubric: RubricScores = {
    context: hasAny(trimmed, cues.context) ? (hasSpecifics ? 20 : 14) : 4,
    goal: hasAny(trimmed, cues.goal) ? (longEnough ? 25 : 18) : 5,
    audience: hasAny(trimmed, cues.audience) ? 15 : 3,
    constraints: hasAny(trimmed, cues.constraints) ? (hasSpecifics ? 20 : 14) : 4,
    format: hasAny(trimmed, cues.format) ? (longEnough ? 20 : 14) : 4,
  };
  const total = Object.values(rubric).reduce((sum, points) => sum + points, 0);
  const missed = Object.entries(rubric).filter(([, points]) => points < 20)
    .map(([key]) => key);
  const strengths = Object.entries(rubric).filter(([, points]) => points >= 14).map(([key]) => key);
  const nextSteps = missed.slice(0, 3);
  const feedbackEn = trimmed.length < 20
    ? "Add a little more detail so the five-part rubric can assess your intent. This is demo feedback."
    : `Your prompt includes ${strengths.length} clear rubric areas. Try adding detail for ${nextSteps.join(", ") || "a more specific format"}. This is demo feedback.`;
  const feedbackTh = trimmed.length < 20
    ? "เพิ่มรายละเอียดอีกเล็กน้อย เพื่อให้ประเมินตามกรอบทั้ง 5 ข้อได้ นี่คือคะแนนตัวอย่าง"
    : `พรอมป์ของคุณมีจุดที่ชัดเจน ${strengths.length} ด้าน ลองเพิ่มรายละเอียดเรื่อง ${nextSteps.join(", ") || "รูปแบบที่ชัดเจนขึ้น"} นี่คือคะแนนตัวอย่าง`;

  return { mode: "demo", total, rubric, feedbackEn, feedbackTh, strengths, nextSteps };
}
