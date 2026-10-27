import { stepCount } from "./slideDoc";
import { skillsLesson } from "./templates";
import type { ChecklistKey } from "./types";

export const SESSION_TITLE = "Week 01 · Prompt Engineering";

export const WEEK01_CHALLENGE = {
  titleEn: "Guest Communication",
  titleTh: "การสื่อสารกับแขก",
  scenarioEn: "A guest arrives at 4Seas, but their room is not ready. The guest needs to wait approximately 30 minutes.",
  scenarioTh: "แขกมาถึง 4Seas แต่ห้องพักยังไม่พร้อม แขกต้องรอประมาณ 30 นาที",
  taskEn: "Write a prompt instructing an AI assistant to create a polite English message explaining the delay and offering a complimentary drink.",
  taskTh: "เขียนพรอมป์สั่งให้ AI สร้างข้อความภาษาอังกฤษที่สุภาพ อธิบายเรื่องความล่าช้า และเสนอเครื่องดื่มฟรีให้แขก",
};

export const FIVE_PARTS: Array<{
  key: ChecklistKey;
  en: string;
  th: string;
  questionEn: string;
  questionTh: string;
  explainEn: string;
  explainTh: string;
  example: string;
}> = [
  {
    key: "context", en: "Context", th: "บริบท",
    questionEn: "Did I explain the situation and who the AI is?", questionTh: "บอกสถานการณ์และบทบาทของ AI แล้วหรือยัง?",
    explainEn: "The situation, the role the AI plays, and the facts it needs.", explainTh: "สถานการณ์ บทบาทของ AI และข้อมูลที่ AI ต้องรู้",
    example: "You are a receptionist at 4Seas Nimman. A guest's room is not ready yet.",
  },
  {
    key: "goal", en: "Goal", th: "เป้าหมาย",
    questionEn: "Did I say exactly what the AI should produce?", questionTh: "บอกชัดหรือยังว่าต้องการให้ AI สร้างอะไร?",
    explainEn: "The specific result you want back.", explainTh: "ผลลัพธ์ที่ต้องการอย่างเจาะจง",
    example: "Write a message explaining a 30-minute delay and offering a complimentary drink.",
  },
  {
    key: "audience", en: "Audience", th: "ผู้รับสาร",
    questionEn: "Did I describe who will read it and the right tone?", questionTh: "บอกหรือยังว่าใครจะอ่าน และควรใช้น้ำเสียงแบบไหน?",
    explainEn: "Who reads the answer, and the tone that suits them.", explainTh: "ใครจะอ่านคำตอบ และน้ำเสียงที่เหมาะกับเขา",
    example: "The guest just arrived after a long flight and may be tired.",
  },
  {
    key: "constraints", en: "Constraints", th: "ข้อกำหนด",
    questionEn: "Did I set limits — length, language, what to avoid?", questionTh: "กำหนดขอบเขตหรือยัง เช่น ความยาว ภาษา สิ่งที่ห้ามทำ?",
    explainEn: "Boundaries: length, language, facts to include or avoid.", explainTh: "ขอบเขต: ความยาว ภาษา ข้อมูลที่ต้องมีหรือห้ามมี",
    example: "Keep it under 80 words. Do not promise an exact time.",
  },
  {
    key: "format", en: "Format", th: "รูปแบบ",
    questionEn: "Did I describe how the answer should look?", questionTh: "บอกหรือยังว่าคำตอบควรมีหน้าตาแบบไหน?",
    explainEn: "The shape of the finished answer.", explainTh: "หน้าตาของคำตอบที่เสร็จแล้ว",
    example: "English, a greeting, two short sentences, and a warm closing line.",
  },
];

/** Slides 1-7 of the built-in deck are React components; the skills segment (Part 2) is appended as JSON slides. */
export const BUILT_IN_SLIDE_COUNT = 7;
let skillSlideId = 0;
export const LEGACY_SKILL_SLIDES = skillsLesson(() => `sk${++skillSlideId}`);

/** Number of presenter reveal steps on each slide (0 = no progressive reveal). */
export const SLIDE_STEPS = [0, 5, 2, 5, 0, 0, 0, ...LEGACY_SKILL_SLIDES.map((slide) => stepCount(slide.doc))];
export const SLIDE_TITLES = [
  "Welcome",
  "The Five-Part Formula",
  "Bad vs Good Prompt",
  "Prompt Anatomy",
  "Live Prompt Challenge",
  "Prompt Battle",
  "Final Results",
  ...LEGACY_SKILL_SLIDES.map((slide) => slide.title),
];
export const TOTAL_SLIDES = SLIDE_STEPS.length;
