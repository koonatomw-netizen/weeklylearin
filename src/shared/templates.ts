import type { ColorToken, SlideDoc, SlideElement } from "./slideDoc";
import { card, chrome, doc, heading, para, text, widget, type MakeId } from "./slideKit";
import {
  bigNumbersLayout, cardsLayout, checklistLayout, doDontLayout, heroLayout, rulesLayout, statementLayout, timelineLayout,
} from "./layouts";

// The builders live in slideKit.ts; re-exported here because lessons and tests import them from this module.
export { card, chrome, doc, heading, para, text, widget };
export type { MakeId };

export const TEMPLATE_IDS = [
  "title", "title-content", "comparison", "image-text", "step-by-step", "summary",
  "interactive-challenge", "prompt-battle", "leaderboard",
  "hero", "three-cards", "big-statement", "checklist", "do-dont", "big-numbers", "timeline", "game-rules",
] as const;
export type TemplateId = typeof TEMPLATE_IDS[number];

export const TEMPLATE_INFO: Record<TemplateId, { name: string; nameTh: string; live?: boolean }> = {
  "title": { name: "Title", nameTh: "หน้าเปิด" },
  "title-content": { name: "Title + Content", nameTh: "หัวข้อ + เนื้อหา" },
  "comparison": { name: "Comparison", nameTh: "เปรียบเทียบ" },
  "image-text": { name: "Image + Text", nameTh: "รูปภาพ + ข้อความ" },
  "step-by-step": { name: "Step-by-Step", nameTh: "ทีละขั้นตอน" },
  "summary": { name: "Summary", nameTh: "สรุป" },
  "interactive-challenge": { name: "Interactive Challenge", nameTh: "โจทย์สด", live: true },
  "prompt-battle": { name: "Prompt Battle", nameTh: "Prompt Battle", live: true },
  "leaderboard": { name: "Leaderboard", nameTh: "ตารางอันดับ", live: true },
  "hero": { name: "Week Opener", nameTh: "หน้าเปิดสัปดาห์" },
  "three-cards": { name: "Three Cards", nameTh: "การ์ดสามใบ" },
  "big-statement": { name: "Big Statement", nameTh: "ประโยคใหญ่" },
  "checklist": { name: "Checklist + Tip", nameTh: "เช็กลิสต์ + เคล็ดลับ" },
  "do-dont": { name: "Do and Don't", nameTh: "ควรและไม่ควร" },
  "big-numbers": { name: "Big Numbers", nameTh: "ตัวเลขใหญ่" },
  "timeline": { name: "Timeline", nameTh: "ไทม์ไลน์" },
  "game-rules": { name: "Game Rules", nameTh: "กติกาเกม", live: true },
};

// ----------------------------------------------------------------- templates

export function createFromTemplate(template: TemplateId, id: MakeId): SlideDoc {
  switch (template) {
    case "title":
      return doc([
        ...chrome(id, "welcome"),
        { id: id(), type: "window", title: "4seas — training — zsh", x: 64, y: 140, w: 1472, h: 620 },
        text(id, 120, 230, 1360, 40, [para("4seas:~/training $ start --lesson", 24, { font: "mono", color: "success" })]),
        text(id, 120, 330, 1360, 140, [para("Lesson Title", 96, { font: "mono", bold: true, color: "accent" })]),
        text(id, 120, 480, 1360, 70, [para("Subtitle goes here", 40)]),
      ]);
    case "title-content":
      return doc([
        ...chrome(id, "lesson"),
        ...heading(id, "section", "Slide title"),
        text(id, 64, 270, 1472, 520, [
          para("First key point", 32, { bullet: true }),
          para("Second key point", 32, { bullet: true }),
          para("Third key point", 32, { bullet: true }),
        ]),
      ]);
    case "comparison":
      return doc([
        ...chrome(id, "compare"),
        ...heading(id, "same task, two approaches", "Before vs After"),
        { id: id(), type: "window", title: "before.txt", border: "danger", x: 64, y: 270, w: 716, h: 520 },
        text(id, 100, 340, 644, 420, [para("Before", 28, { font: "mono", color: "danger", bold: true }), para("Describe the weaker example here.", 28)]),
        { id: id(), type: "window", title: "after.txt", border: "success", x: 820, y: 270, w: 716, h: 520 },
        text(id, 856, 340, 644, 420, [para("After", 28, { font: "mono", color: "success", bold: true }), para("Describe the stronger example here.", 28)]),
      ]);
    case "image-text":
      return doc([
        ...chrome(id, "lesson"),
        ...heading(id, "illustrated", "Image + Text"),
        { id: id(), type: "shape", shape: "rounded", x: 64, y: 270, w: 720, h: 520, fill: "surface", stroke: "border", strokeWidth: 2 },
        text(id, 64, 500, 720, 60, [para("Image placeholder — uploads arrive in Phase 3", 24, { align: "center", color: "text-2" })]),
        text(id, 840, 290, 696, 480, [para("Explain what the image shows and why it matters.", 32)]),
      ]);
    case "step-by-step":
      return doc([
        ...chrome(id, "steps"),
        ...heading(id, "how to", "Step-by-Step"),
        ...[0, 1, 2, 3].flatMap((index): SlideElement[] => [
          { id: id(), type: "shape", shape: "rounded", x: 64 + index * 372, y: 290, w: 348, h: 460, fill: "surface", stroke: "border", strokeWidth: 2, step: index + 1 },
          text(id, 96 + index * 372, 320, 284, 400, [para(`0${index + 1}`, 32, { font: "mono", color: "accent" }), para(`Step ${index + 1}`, 32, { font: "mono", bold: true }), para("Describe this step.", 24, { color: "text-2" })], { step: index + 1 }),
        ]),
      ], "Each step appears as you press → in Presenter Mode.");
    case "summary":
      return doc([
        ...chrome(id, "summary"),
        ...heading(id, "key takeaways", "Summary"),
        text(id, 64, 280, 1472, 500, [
          para("01  First takeaway", 40, { font: "mono" }),
          para("02  Second takeaway", 40, { font: "mono" }),
          para("03  Third takeaway", 40, { font: "mono" }),
        ]),
      ]);
    case "interactive-challenge":
      return doc([
        ...chrome(id, "live challenge"),
        ...heading(id, "live activity", "Live Prompt Challenge", 1000),
        widget(id, 64, 260, 1000, 400, "challenge"),
        widget(id, 64, 680, 1000, 130, "live-stats"),
        widget(id, 1104, 140, 432, 670, "join"),
      ], "Live slide: shows the session's challenge, join QR and progress. Start prompt submission from the presenter controls.");
    case "prompt-battle":
      return doc([
        ...chrome(id, "prompt battle"),
        widget(id, 64, 100, 1472, 710, "battle"),
      ], "Live slide: shows the active battle, vote progress and the presenter's next action button.");
    case "leaderboard":
      return doc([
        ...chrome(id, "final results"),
        ...heading(id, "community vote", "Final Rankings"),
        widget(id, 64, 260, 1472, 560, "leaderboard"),
      ], "Live slide: champion and rankings appear once the Grand Final is complete.");
    case "hero":
      return heroLayout(id, {
        kicker: "week opener", number: "03", title: "Lesson title goes here",
        outcome: { en: "What people will be able to do after this session.", th: "สิ่งที่ผู้เรียนจะทำได้หลังจบสัปดาห์นี้" },
        lines: ["learn: one new skill", "play: one live game", "time: 50 minutes"],
        wow: { en: "the live demo everyone will remember", th: "เดโมสดที่ทุกคนจะจำได้" },
      });
    case "three-cards":
      return cardsLayout(id, {
        kicker: "lesson", eyebrow: "three ideas", title: "Three things to remember", titleTh: "สามเรื่องที่ควรจำ", numbered: true,
        cards: [1, 2, 3].map((n) => ({ title: `Idea ${n}`, body: { en: "Explain it in one short sentence.", th: "อธิบายใน 1 ประโยคสั้น ๆ" } })),
        bar: { en: "One line that ties the three together.", th: "ประโยคเดียวที่สรุปทั้งสามข้อ" },
      });
    case "big-statement":
      return statementLayout(id, {
        kicker: "lesson", eyebrow: "the big idea",
        big: { en: "One idea, said big.", th: "ประโยคสำคัญหนึ่งประโยค พูดให้ชัด" },
        sub: { en: "Say why it matters.", th: "บอกว่าทำไมจึงสำคัญ" },
      });
    case "checklist":
      return checklistLayout(id, {
        kicker: "lesson", eyebrow: "before you send", title: "A short checklist", titleTh: "เช็กลิสต์สั้น ๆ",
        items: [1, 2, 3].map((n) => ({ en: `Check number ${n}`, th: `ข้อที่ ${n}` })),
        tip: { title: "Tip", body: { en: "One practical tip people can use today.", th: "เคล็ดลับที่ใช้ได้ทันที" } },
      });
    case "do-dont":
      return doDontLayout(id, {
        kicker: "lesson", eyebrow: "good habits", title: "Do and Don't", titleTh: "ควรและไม่ควร",
        donts: [{ en: "Something to avoid", th: "สิ่งที่ควรเลี่ยง" }],
        dos: [{ en: "Something to do instead", th: "สิ่งที่ควรทำแทน" }],
        bar: "A one-line reminder.",
      });
    case "big-numbers":
      return bigNumbersLayout(id, {
        kicker: "lesson", eyebrow: "in numbers", title: "Numbers to remember", titleTh: "ตัวเลขที่ควรจำ",
        stats: [{ value: "3", label: { en: "tries", th: "ครั้ง" } }, { value: "60", label: { en: "seconds", th: "วินาที" } }, { value: "1", label: { en: "habit", th: "นิสัย" } }],
        bar: { en: "What the numbers mean together.", th: "ตัวเลขเหล่านี้รวมกันหมายถึงอะไร" },
      });
    case "timeline":
      return timelineLayout(id, {
        kicker: "lesson", eyebrow: "step by step", title: "How it flows", titleTh: "ลำดับขั้นตอน",
        steps: ["Start", "Check", "Send"].map((label) => ({ label, body: { en: "What happens in this step.", th: "เกิดอะไรขึ้นในขั้นนี้" } })),
        bar: "A one-line summary of the flow.",
      });
    case "game-rules":
      return rulesLayout(id, {
        kicker: "game time", title: "Game: Name It", titleTh: "เกม: ตั้งชื่อเกม",
        rules: [{ en: "Join with the code on the right.", th: "เข้าร่วมด้วยรหัสทางขวา" }, { en: "Answer on your phone.", th: "ตอบบนมือถือ" }],
        scoring: { en: "100 points per correct answer", th: "ตอบถูกได้ 100 คะแนน" },
      });
  }
}

// ------------------------------------------------------- Week 01 starter lesson

const FORMULA: Array<[string, string, ColorToken, string]> = [
  ["Context", "บริบท", "context", "You are a receptionist at 4Seas Nimman. A guest's room is not ready yet."],
  ["Goal", "เป้าหมาย", "goal", "Write a message explaining a 30-minute delay and offering a complimentary drink."],
  ["Audience", "ผู้รับสาร", "audience", "The guest just arrived after a long flight and may be tired."],
  ["Constraints", "ข้อกำหนด", "constraints", "Keep it under 80 words. Do not promise an exact time."],
  ["Format", "รูปแบบ", "format", "English, a greeting, two short sentences, and a warm closing line."],
];

/** The built-in Week 01 deck, re-expressed as editable JSON slides. */
export function week01Lesson(id: MakeId): Array<{ title: string; doc: SlideDoc }> {
  return [
    {
      title: "Welcome",
      doc: doc([
        ...chrome(id, "welcome"),
        { id: id(), type: "window", title: "4seas — training — 120×30", x: 64, y: 110, w: 1472, h: 690 },
        text(id, 120, 200, 1360, 40, [para('4seas:~/training $ train --week 01 --topic "prompt-engineering"', 24, { font: "mono", color: "success" })]),
        text(id, 120, 260, 1360, 130, [
          para("✓ Scenario loaded: guest-communication", 24, { font: "mono", color: "text-2" }),
          para("✓ Five-part prompt formula ready", 24, { font: "mono", color: "text-2" }),
          para("✓ Prompt Battle armed — no AI judge, you vote", 24, { font: "mono", color: "text-2" }),
        ]),
        text(id, 120, 410, 1360, 160, [para("Prompt Engineering", 120, { font: "mono", bold: true, color: "accent" })]),
        text(id, 120, 590, 1360, 120, [para("How to communicate better with AI", 40), para("สื่อสารกับ AI ให้ได้ผลลัพธ์ที่ดีขึ้น", 28, { color: "text-2" })]),
      ], "Welcome everyone and let them join with the QR code."),
    },
    {
      title: "The Five-Part Formula",
      doc: doc([
        ...chrome(id, "the formula"),
        ...heading(id, "five parts of a clear prompt", "The Five-Part Prompt Formula"),
        ...FORMULA.flatMap(([en, th, color, example], index): SlideElement[] => [
          { id: id(), type: "shape", shape: "rounded", x: 64 + index * 296, y: 270, w: 276, h: 540, fill: "surface", stroke: color, strokeWidth: 2, step: index + 1 },
          text(id, 88 + index * 296, 294, 228, 500, [
            para(`0${index + 1}`, 28, { font: "mono", color }),
            para(en, 32, { font: "mono", bold: true }),
            para(th, 24, { color: "text-2" }),
            para(example, 20, { font: "mono" }),
          ], { step: index + 1 }),
        ]),
      ], "Press → to reveal each part."),
    },
    {
      title: "Bad vs Good Prompt",
      doc: doc([
        ...chrome(id, "compare"),
        ...heading(id, "same task, two prompts", "Bad Prompt vs Good Prompt"),
        { id: id(), type: "window", title: "prompt_v1.txt  ✗ vague", border: "danger", x: 64, y: 260, w: 620, h: 420 },
        text(id, 100, 330, 548, 330, [
          para('"Write a message to a guest."', 28, { font: "mono" }),
          para("✗ No role or situation", 24, { color: "text-2" }),
          para("✗ No goal", 24, { color: "text-2" }),
          para("✗ No tone, length, or language", 24, { color: "text-2" }),
        ]),
        { id: id(), type: "window", title: "prompt_v2.txt  ✓ specific", border: "success", x: 724, y: 260, w: 812, h: 420 },
        text(id, 760, 330, 740, 330, [{
          font: "mono", size: 28, runs: [
            { text: '"' }, { text: "You are a hotel receptionist.", color: "context", bold: true }, { text: " Write a " },
            { text: "polite", color: "audience", bold: true }, { text: " " }, { text: "English message", color: "format", bold: true }, { text: " " },
            { text: "explaining a 30-minute room delay and offer a complimentary drink.", color: "goal", bold: true }, { text: " " },
            { text: "Keep it under 80 words.", color: "constraints", bold: true }, { text: '"' },
          ],
        }], { step: 1 }),
        text(id, 64, 710, 1472, 100, [para("The second prompt tells the AI who it is, what to write, for whom, and within what limits — so the first draft is usable.", 28)], { step: 2 }),
      ]),
    },
    {
      title: "Prompt Anatomy",
      doc: doc([
        ...chrome(id, "anatomy"),
        ...heading(id, "a complete prompt, dissected", "Prompt Anatomy"),
        { id: id(), type: "window", title: "guest_delay.prompt", x: 64, y: 260, w: 960, h: 550 },
        ...[
          ["context", "You are the front-desk assistant at 4Seas Nimman, a boutique hotel in Chiang Mai."],
          ["goal", "Write a message telling a guest their room will be ready in about 30 minutes, and offer a complimentary drink."],
          ["audience", "The guest has just arrived after a long trip and may be tired."],
          ["constraints", "Be warm and apologetic. Keep it under 80 words. Do not promise an exact time."],
          ["format", "Reply in English: a greeting, two short sentences, and a friendly closing line."],
        ].flatMap(([key, line], index): SlideElement[] => [
          { id: id(), type: "shape", shape: "rect", x: 80, y: 320 + index * 94, w: 6, h: 84, fill: key as ColorToken, step: index + 1 },
          text(id, 104, 320 + index * 94, 900, 84, [para(line, 20, { font: "mono" })], { valign: "middle" }),
          text(id, 1064, 300 + index * 100, 472, 90, [para(`${index + 1}  ${FORMULA[index][0]}`, 28, { font: "mono", bold: true, color: key as ColorToken }), para(FORMULA[index][1], 20, { color: "text-2" })], { step: index + 1 }),
        ]),
      ]),
    },
    aiFeedbackSlide(id),
    { title: "Live Prompt Challenge", doc: createFromTemplate("interactive-challenge", id) },
    { title: "Prompt Battle", doc: createFromTemplate("prompt-battle", id) },
    {
      title: "Final Results",
      doc: doc([
        ...chrome(id, "final results"),
        widget(id, 64, 100, 900, 720, "leaderboard"),
        text(id, 1000, 140, 536, 60, [para("Key takeaways", 40, { font: "mono", bold: true })]),
        text(id, 1000, 220, 536, 560, [
          para("01  Give context and a role before the task.", 28),
          para("02  Name the goal, the reader, and the tone.", 28),
          para("03  Set limits and a format — then iterate.", 28),
        ]),
      ]),
    },
    ...skillsLesson(id),
  ];
}

/**
 * Explains the private AI feedback button on the self-check screen, before the live writing round.
 * Shared by the Week 01 and Week 02 lessons. It must keep saying that the feedback is not a score.
 */
export function aiFeedbackSlide(id: MakeId): { title: string; doc: SlideDoc } {
  const steps: Array<[string, string, string, ColorToken]> = [
    ["Submit your prompt", "Write it, send it, then open the self-check.", "เขียนพรอมป์ ส่ง แล้วเปิดหน้าเช็กตัวเอง", "accent"],
    ["Tap Get AI feedback", "A private score and tips appear in about ten seconds.", "ขอฟีดแบ็กจาก AI จะเห็นคะแนนและคำแนะนำส่วนตัวในราว 10 วินาที", "accent"],
    ["Improve and resend", "You have three attempts. Fix the weakest part first.", "ส่งได้ 3 ครั้ง แก้ส่วนที่อ่อนที่สุดก่อน", "success"],
  ];
  const gap = 24;
  const width = Math.floor((1472 - gap * 2) / 3);
  return {
    title: "Check Your Prompt (Privately)",
    doc: doc([
      ...chrome(id, "ai feedback"),
      ...heading(id, "after you submit", "Check Your Prompt (Privately)"),
      ...steps.flatMap(([title, body, bodyTh, color], index): SlideElement[] => {
        const x = 64 + index * (width + gap);
        return [
          card(id, x, 270, width, 440, "border", index + 1),
          text(id, x + 28, 298, width - 56, 390, [
            para(`0${index + 1}`, 32, { font: "mono", color }),
            para(title, 32, { font: "mono", bold: true }),
            para(body, 28),
            para(bodyTh, 24, { color: "text-2" }),
          ], { step: index + 1 }),
        ];
      }),
      text(id, 64, 730, 1472, 90, [
        para("Only you can see it. It is a guide, not a score. Votes decide the winner.", 28, { font: "mono", color: "accent" }),
        para("Practice data only: your prompt is sent to an AI service. มีแค่คุณที่เห็น เป็นแนวทาง ไม่ใช่คะแนน", 24, { color: "text-2" }),
      ]),
    ], "Show where the button is. Stress that the AI gives private tips only; the room's votes still decide the Prompt Battle. If the AI is busy, the self-check list still works. Remind people to use practice data only."),
  };
}

// ------------------------------------------------------- head-to-head segment

const ROUND_SAMPLES: Array<{ prompt: string; promptTh: string }> = [
  { prompt: "Write a polite message telling a guest their room will be ready in 30 minutes. Keep it under 60 words.", promptTh: "เขียนข้อความสุภาพบอกแขกว่าห้องจะพร้อมในอีก 30 นาที ไม่เกิน 60 คำ" },
  { prompt: "Explain in two sentences why people should back up their files.", promptTh: "อธิบายใน 2 ประโยคว่าทำไมควรสำรองไฟล์" },
  { prompt: "Rewrite \"Send me the report now\" so it sounds friendly but still clear.", promptTh: "เขียน \"ส่งรายงานมาเดี๋ยวนี้\" ใหม่ให้เป็นมิตรแต่ยังชัดเจน" },
];

function headToHeadRound(id: MakeId, round: number): { title: string; doc: SlideDoc } {
  const sample = ROUND_SAMPLES[round - 1];
  return {
    title: `Head-to-Head: Round ${round}`,
    doc: doc([
      ...chrome(id, `head-to-head · round ${round}`),
      ...heading(id, "same prompt, two answers", `Round ${round}: Which Is Better?`),
      { id: id(), type: "window", title: "prompt.txt", x: 64, y: 240, w: 1472, h: 172 },
      text(id, 96, 308, 1408, 100, [para(sample.prompt, 24, { font: "mono" }), para(sample.promptTh, 20, { color: "text-2" })]),
      { id: id(), type: "window", title: "answer_A.txt", x: 64, y: 432, w: 716, h: 300 },
      text(id, 96, 504, 652, 210, [para("[Paste answer A here, about 60 words. Do not edit it.]", 24)]),
      { id: id(), type: "window", title: "answer_B.txt", x: 820, y: 432, w: 716, h: 300 },
      text(id, 852, 504, 652, 210, [para("[Paste answer B here, about 60 words. Do not edit it.]", 24)]),
      text(id, 64, 748, 1472, 64, [para("Reveal: A = [ChatGPT or Claude]   B = [the other one]", 28, { font: "mono", color: "accent" })], { step: 1 }),
    ], "Prepare before the session: send the same prompt to ChatGPT and to Claude, paste both answers unedited, and note the tool and version. Choose at random which one is A. Open the Head-to-Head poll in the Game Hub, let the room vote on their phones, then press next to reveal who wrote which. Practice prompts only, never real names or data."),
  };
}

/**
 * A short segment for any week: the room votes blind between two prepared answers (for example ChatGPT and Claude),
 * then the authors are revealed. The answers are pasted in by the presenter, so no live AI call is needed.
 */
export function headToHeadLesson(id: MakeId): Array<{ title: string; doc: SlideDoc }> {
  return [
    {
      title: "Head-to-Head: Which Answer Wins?",
      doc: doc([
        ...chrome(id, "head-to-head"),
        ...heading(id, "blind vote", "Head-to-Head: Which Answer Wins?"),
        text(id, 64, 270, 1472, 400, [
          para("Same prompt. Two AI tools. You do not know who wrote which.", 32, { font: "mono", bold: true }),
          para("Read both answers, then vote on your phone.", 28, { bullet: true }),
          para("Pick the one you would actually use at work.", 28, { bullet: true }),
          para("After the vote we reveal the authors.", 28, { bullet: true }),
          para("อ่านทั้งสองคำตอบ แล้วโหวตบนมือถือ เลือกอันที่คุณจะใช้จริงในงาน", 24, { color: "text-2" }),
        ]),
        text(id, 64, 700, 1472, 100, [para("Practice prompts only. Both answers were prepared before the session.", 24, { font: "mono", color: "accent" })]),
      ], "Explain the rules. Both answers were generated before the session from the same prompt and pasted in without editing."),
    },
    ...ROUND_SAMPLES.map((_, index) => headToHeadRound(id, index + 1)),
    {
      title: "Head-to-Head: What Did We Learn?",
      doc: doc([
        ...chrome(id, "head-to-head · recap"),
        ...heading(id, "recap", "What Did We Learn?"),
        text(id, 64, 270, 1472, 500, [
          para("01  No tool wins every task. Try the same task in two tools.", 28),
          para("02  Choose by the result you can use, not by the brand.", 28),
          para("03  Tools change often: check again every few months.", 28),
          para("04  Always read and fact-check before you send.", 28),
          para("ไม่มีเครื่องมือไหนชนะทุกงาน ลองงานเดียวกันกับสองตัวแล้วเลือกจากผลที่ใช้ได้จริง", 24, { color: "text-2" }),
        ]),
      ], "Ask two people to say why they voted the way they did. Link it to next week's task."),
    },
  ];
}

// ------------------------------------------------------------ skills segment

/**
 * Part 2 of Week 01: reusable skills. Appended after Final Results in both the built-in deck and the
 * Studio lesson. The grill-me and grilling quotes are the real SKILL.md text, so keep them verbatim.
 */
export function skillsLesson(id: MakeId): Array<{ title: string; doc: SlideDoc }> {
  return [
    {
      title: "Skills: Write It Once",
      doc: doc([
        ...chrome(id, "skills"),
        ...heading(id, "part 2 · reusable instructions", "Skills: Write It Once"),
        card(id, 64, 270, 716, 440, "danger"),
        text(id, 96, 300, 652, 380, [
          para("A prompt", 40, { font: "mono", bold: true, color: "danger" }),
          para("Telling someone what to cook every single time.", 32),
          para("พรอมป์ = บอกทุกครั้งว่าจะให้ทำอะไร", 24, { color: "text-2" }),
        ]),
        card(id, 820, 270, 716, 440, "success"),
        text(id, 852, 300, 652, 380, [
          para("A skill", 40, { font: "mono", bold: true, color: "success" }),
          para("A recipe card: write it once, use it again.", 32),
          para("สกิล = สูตรที่เขียนครั้งเดียว ใช้ซ้ำได้ตลอด", 24, { color: "text-2" }),
        ]),
        text(id, 64, 740, 1472, 70, [para("Your best Prompt Battle prompt could become a skill.", 28, { font: "mono", color: "accent" })]),
      ], "Open with the recipe-card idea. Prompts are one-off; skills are saved and reused."),
    },
    {
      title: "What Is a Skill?",
      doc: doc([
        ...chrome(id, "skills"),
        ...heading(id, "part 2 · reusable instructions", "What Is a Skill?"),
        { id: id(), type: "window", title: "my-skill/", x: 64, y: 270, w: 700, h: 520 },
        text(id, 100, 340, 628, 100, [para("my-skill/", 28, { font: "mono" }), para("└── SKILL.md", 28, { font: "mono", color: "accent" })]),
        text(id, 100, 470, 628, 290, [
          para("name: what it is called", 24, { font: "mono", color: "text-2" }),
          para("description: when to use it", 24, { font: "mono", color: "text-2" }),
          para("instructions: what Claude should do", 24, { font: "mono", color: "text-2" }),
        ]),
        text(id, 804, 270, 732, 520, [
          para("A folder with one file: SKILL.md.", 32, { bullet: true }),
          para("โฟลเดอร์ที่มีไฟล์เดียว: SKILL.md", 24, { color: "text-2" }),
          para("Name + one-line description + plain-text instructions.", 32, { bullet: true }),
          para("ชื่อ + คำอธิบายหนึ่งบรรทัด + คำสั่งแบบข้อความ", 24, { color: "text-2" }),
          para("Claude loads it when it is relevant, or you call it by name, like /grill-me.", 32, { bullet: true }),
          para("Claude โหลดเมื่อเกี่ยวข้อง หรือเรียกด้วยชื่อ เช่น /grill-me", 24, { color: "text-2" }),
        ]),
      ], "A skill is just text. Nothing magic: a folder, a file, and instructions."),
    },
    {
      title: "Example: grill-me",
      doc: doc([
        ...chrome(id, "skills"),
        ...heading(id, "a real skill, two real files", "Example: grill-me"),
        { id: id(), type: "window", title: "grill-me/SKILL.md", x: 64, y: 260, w: 720, h: 420 },
        text(id, 100, 330, 648, 330, [
          para("---", 24, { font: "mono", color: "text-2" }),
          para("name: grill-me", 24, { font: "mono" }),
          para("description: A relentless interview to sharpen a plan or design.", 24, { font: "mono" }),
          para("---", 24, { font: "mono", color: "text-2" }),
          para('Call the Skill tool with "grilling".', 24, { font: "mono", color: "accent" }),
        ]),
        { id: id(), type: "window", title: "grilling/SKILL.md (what it does)", x: 824, y: 260, w: 712, h: 420 },
        text(id, 860, 330, 640, 330, [
          para('"Interview the user relentlessly until you reach a shared understanding."', 24, { font: "mono" }),
          para('"Ask the whole frontier in one round: number each question and give your recommended answer."', 24, { font: "mono" }),
          para('"Do not act on it until the user confirms you have reached a shared understanding."', 24, { font: "mono" }),
        ]),
        text(id, 64, 710, 1472, 100, [
          para("grill-me hands over to grilling, so one skill can load another.", 28, { font: "mono", color: "accent" }),
          para("grill-me ส่งต่อให้ grilling ทำงาน สกิลหนึ่งเรียกอีกสกิลได้", 24, { color: "text-2" }),
        ]),
      ], "Verify these two files against the repository before presenting. Point out how short they are."),
    },
    {
      title: "Live Demo",
      doc: doc([
        ...chrome(id, "skills"),
        ...heading(id, "switch to Claude Code", "Live Demo"),
        card(id, 64, 260, 1472, 150, "accent", 1),
        text(id, 100, 274, 1400, 128, [
          para("01  The task", 32, { font: "mono", bold: true, color: "accent" }),
          para("Plan a 30-person workshop for next Thursday.", 28),
          para("วางแผนเวิร์กชอป 30 คนสำหรับวันพฤหัสบดีหน้า", 20, { color: "text-2" }),
        ], { step: 1 }),
        card(id, 64, 424, 1472, 150, "danger", 2),
        text(id, 100, 438, 1400, 128, [
          para("02  Round 1 · no skill", 32, { font: "mono", bold: true, color: "danger" }),
          para("Just ask Claude for the plan.", 28),
          para("ขอแผนจาก Claude ตรง ๆ โดยไม่ใช้สกิล", 20, { color: "text-2" }),
        ], { step: 2 }),
        card(id, 64, 588, 1472, 150, "success", 3),
        text(id, 100, 602, 1400, 128, [
          para("03  Round 2 · with the skill", 32, { font: "mono", bold: true, color: "success" }),
          para("Type /grill-me, then give the same task.", 28),
          para("พิมพ์ /grill-me แล้วให้โจทย์เดิม", 20, { color: "text-2" }),
        ], { step: 3 }),
        text(id, 64, 750, 1472, 60, [para("What did round 2 ask that round 1 never did?", 32, { font: "mono", color: "accent" })]),
      ], "Run both rounds in your own Claude Code. Install grill-me AND grilling first, and rehearse once. Keep a screenshot as backup."),
    },
    {
      title: "Safety: Read Before You Run",
      doc: doc([
        ...chrome(id, "skills"),
        ...heading(id, "a skill is someone else's instructions", "Safety: Read Before You Run"),
        ...[
          ["01  What does it tell Claude to do?", "มันสั่งให้ Claude ทำอะไร?"],
          ["02  Does it run scripts or commands?", "มีสคริปต์หรือคำสั่งให้รันไหม?"],
          ["03  Does it touch files or the network?", "แตะไฟล์หรืออินเทอร์เน็ตไหม?"],
          ["04  Who made it, and do you trust them?", "ใครเป็นคนทำ และเชื่อใจได้ไหม?"],
        ].flatMap(([en, th], index): SlideElement[] => {
          const x = index % 2 === 0 ? 64 : 812;
          const y = index < 2 ? 260 : 510;
          return [
            card(id, x, y, 724, 230, "accent", index + 1),
            text(id, x + 32, y + 24, 660, 190, [para(en, 32, { font: "mono", bold: true }), para(th, 24, { color: "text-2" })], { step: index + 1, valign: "middle" }),
          ];
        }),
        text(id, 64, 760, 1472, 60, [para("Note: grill-me calls grilling, so read both files.", 28, { font: "mono", color: "danger" })]),
      ], "Even official skills can include scripts. Read SKILL.md first, and read any skill it calls."),
    },
    {
      title: "Where to Find More",
      doc: doc([
        ...chrome(id, "skills"),
        ...heading(id, "take-home", "Where to Find More"),
        card(id, 64, 260, 716, 250, "accent"),
        text(id, 96, 284, 652, 210, [
          para("Matt Pocock's skills", 32, { font: "mono", bold: true, color: "accent" }),
          para("github.com/mattpocock/skills", 28, { font: "mono" }),
        ]),
        card(id, 820, 260, 716, 250, "success"),
        text(id, 852, 284, 652, 210, [
          para("Anthropic's official skills", 32, { font: "mono", bold: true, color: "success" }),
          para("github.com/anthropics/skills", 28, { font: "mono" }),
        ]),
        { id: id(), type: "window", title: "in Claude Code", x: 64, y: 550, w: 1472, h: 240 },
        text(id, 100, 620, 1400, 150, [
          para("/plugin marketplace add anthropics/skills", 32, { font: "mono", color: "success" }),
          para("เพิ่มคลังสกิลทางการของ Anthropic ใน Claude Code", 24, { color: "text-2" }),
        ]),
      ], "Take-home slide. Remind everyone to read SKILL.md before installing anything."),
    },
  ];
}
