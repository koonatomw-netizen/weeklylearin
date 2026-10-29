import type { Challenge, FeedbackQuestions } from "./deck";
import type { Situation } from "./situations";
import type { SlideDoc } from "./slideDoc";
import { card, chrome, doc, heading, para, text, widget, type MakeId } from "./templates";

/**
 * Week 02 starter: "Find Time: Automate the Boring Parts". It moves people who only ask AI questions
 * towards giving it their own material, getting structured results, and saving what works.
 * All sample data is invented; the session never asks anyone to paste real company or guest data.
 */

export const WEEK02_TITLE = "Week 02 · Find Time: Automate the Boring Parts";

export const WEEK02_CHALLENGE: Challenge = {
  titleEn: "Messy Notes to Action List",
  titleTh: "จากโน้ตยุ่ง ๆ เป็นรายการงาน",
  scenarioEn: "Your supervisor sends rough notes from a team call: \"linen late again, Ann chase by Fri, budget maybe 20k, Songkran rota ask Bo, invoice 4471 still unpaid\". The notes are messy and incomplete.",
  scenarioTh: "หัวหน้าส่งโน้ตหยาบ ๆ จากการประชุมทีม: \"ผ้าปูส่งช้าอีกแล้ว แอนตามวันศุกร์ งบประมาณประมาณสองหมื่น ตารางเวรสงกรานต์ถามโบ ใบแจ้งหนี้ 4471 ยังไม่จ่าย\" โน้ตไม่เป็นระเบียบและไม่ครบ",
  taskEn: "Write a prompt for an AI assistant to turn these notes into a clear action list with task, owner and due date, and to flag anything that is unclear instead of guessing.",
  taskTh: "เขียนพรอมป์สั่งให้ AI เปลี่ยนโน้ตนี้เป็นรายการงานที่ชัดเจน มีงาน ผู้รับผิดชอบ และกำหนดส่ง และให้ระบุสิ่งที่ไม่ชัดเจนแทนการเดา",
};

const situation = (id: string, rarity: Situation["rarity"], titleEn: string, titleTh: string, scenarioEn: string, scenarioTh: string, taskEn: string, taskTh: string): Situation =>
  ({ id, rarity, challenge: { titleEn, titleTh, scenarioEn, scenarioTh, taskEn, taskTh } });

/** The plan's own case pool for "Open case": everyday chores that AI can take over. */
export const WEEK02_SITUATIONS: Situation[] = [
  situation("email-thread", "common", "Long Email Thread", "อีเมลเธรดยาว",
    "A manager has one minute before a meeting and a 20-message email thread about a delayed delivery.",
    "ผู้จัดการมีเวลาหนึ่งนาทีก่อนประชุม และมีอีเมลเธรด 20 ข้อความเรื่องการส่งของล่าช้า",
    "Write a prompt for an AI assistant to summarise the thread in five lines: what happened, what is decided, and what is still open.",
    "เขียนพรอมป์สั่งให้ AI สรุปเธรดใน 5 บรรทัด: เกิดอะไรขึ้น ตัดสินใจอะไรแล้ว และอะไรยังค้างอยู่"),
  situation("weekly-report", "common", "Weekly Report", "รายงานประจำสัปดาห์",
    "Every Friday you turn a pile of bullet notes into a report for your supervisor, and it takes an hour.",
    "ทุกวันศุกร์คุณต้องเปลี่ยนโน้ตหัวข้อย่อยเป็นรายงานให้หัวหน้า และใช้เวลาหนึ่งชั่วโมง",
    "Write a prompt for an AI assistant to turn rough bullet notes into a report with the headings Done, Next and Blockers, under 150 words.",
    "เขียนพรอมป์สั่งให้ AI เปลี่ยนโน้ตหยาบ ๆ เป็นรายงานที่มีหัวข้อ เสร็จแล้ว ต่อไป และอุปสรรค ไม่เกิน 150 คำ"),
  situation("meeting-notes", "common", "Meeting Notes", "โน้ตประชุม",
    "You wrote messy notes during a 30-minute meeting and now need to share what everyone agreed to do.",
    "คุณจดโน้ตยุ่ง ๆ ระหว่างประชุม 30 นาที และต้องแจ้งทุกคนว่าตกลงทำอะไรกันบ้าง",
    "Write a prompt for an AI assistant to list the tasks with owner and due date, and mark anything missing as \"unclear\".",
    "เขียนพรอมป์สั่งให้ AI สรุปงาน พร้อมผู้รับผิดชอบและกำหนดส่ง และทำเครื่องหมาย \"ไม่ชัดเจน\" ในสิ่งที่ขาดไป"),
  situation("duty-rota", "rare", "Duty Rota", "ตารางเวร",
    "Five team members sent their availability in five different formats and you must build next week's rota.",
    "สมาชิกทีม 5 คนส่งเวลาที่ว่างมาใน 5 รูปแบบ และคุณต้องทำตารางเวรสัปดาห์หน้า",
    "Write a prompt for an AI assistant to build a one-week rota table from pasted availability and flag any shift nobody can cover.",
    "เขียนพรอมป์สั่งให้ AI ทำตารางเวรหนึ่งสัปดาห์จากเวลาที่ว่างที่วางให้ และระบุกะที่ไม่มีใครรับได้"),
  situation("supplier-quotes", "rare", "Supplier Quotes", "ใบเสนอราคา",
    "Three suppliers sent quotes for the same cleaning supplies, each with a different layout.",
    "ซัพพลายเออร์สามรายส่งใบเสนอราคาสำหรับอุปกรณ์ทำความสะอาดชุดเดียวกัน แต่ละรายใช้รูปแบบต่างกัน",
    "Write a prompt for an AI assistant to compare the quotes in one table and point out the cheapest option and any hidden costs.",
    "เขียนพรอมป์สั่งให้ AI เปรียบเทียบใบเสนอราคาในตารางเดียว ชี้ตัวเลือกที่ถูกที่สุด และค่าใช้จ่ายแอบแฝง"),
  situation("reply-drafts", "epic", "Three Reply Drafts", "ร่างตอบสามแบบ",
    "A customer sent a long, frustrated message about a late order, and you are not sure what tone to use.",
    "ลูกค้าส่งข้อความยาวด้วยอารมณ์หงุดหงิดเรื่องออเดอร์ล่าช้า และคุณไม่แน่ใจว่าควรใช้น้ำเสียงแบบไหน",
    "Write a prompt for an AI assistant to draft three replies (formal, friendly, very short) that apologise without admitting what you cannot confirm.",
    "เขียนพรอมป์สั่งให้ AI ร่างคำตอบสามแบบ (ทางการ เป็นกันเอง สั้นมาก) ที่ขอโทษโดยไม่ยอมรับสิ่งที่ยังยืนยันไม่ได้"),
];

export const WEEK02_FEEDBACK: FeedbackQuestions = {
  trainingRating: { en: "How useful was this session for saving you time?", th: "เซสชันนี้ช่วยให้ประหยัดเวลาได้มากแค่ไหน?" },
  workChallenges: { en: "Which chore takes you the most time each week?", th: "งานประจำอะไรที่ใช้เวลามากที่สุดในแต่ละสัปดาห์?" },
  supportNeeded: { en: "What would help you hand that chore to AI?", th: "อะไรจะช่วยให้คุณส่งงานนั้นให้ AI ทำได้?" },
  trainingRequests: { en: "Which task should we automate next?", th: "งานไหนที่เราควรทำให้อัตโนมัติต่อไป?" },
  otherComments: { en: "Other comments", th: "ความคิดเห็นอื่นๆ" },
};

export const WEEK02_NOTES = "Week 02 of 5. Goal: move from asking AI questions to handing it real work. Run order: check-in, concepts, task audit, safety, live challenge, battle, results, take-home. About 50 minutes.";

const stepCard = (id: MakeId, index: number, count: number, title: string, body: string, bodyTh: string, color: "accent" | "success" | "danger" = "accent") => {
  const gap = 24;
  const width = Math.floor((1472 - gap * (count - 1)) / count);
  const x = 64 + index * (width + gap);
  return [
    card(id, x, 280, width, 480, "border", index + 1),
    text(id, x + 28, 308, width - 56, 430, [
      para(`0${index + 1}`, 32, { font: "mono", color }),
      para(title, 32, { font: "mono", bold: true }),
      para(body, 28),
      para(bodyTh, 24, { color: "text-2" }),
    ], { step: index + 1 }),
  ];
};

export function week02Lesson(id: MakeId): Array<{ title: string; doc: SlideDoc }> {
  return [
    {
      title: "Find Time: Automate the Boring Parts",
      doc: doc([
        ...chrome(id, "week 02"),
        { id: id(), type: "window", title: "4seas — training — zsh", x: 64, y: 140, w: 1472, h: 620 },
        text(id, 120, 230, 1360, 40, [para("4seas:~/training $ start --week 02", 24, { font: "mono", color: "success" })]),
        text(id, 120, 320, 1360, 140, [para("Find Time", 96, { font: "mono", bold: true, color: "accent" })]),
        text(id, 120, 470, 1360, 70, [para("Automate the boring parts", 40)]),
        text(id, 120, 550, 1360, 60, [para("ให้ AI ช่วยทำงานซ้ำ ๆ ที่น่าเบื่อ", 28, { color: "text-2" })]),
      ], "Welcome people back. Today is about handing AI real work, not just asking it questions."),
    },
    {
      title: "Check-in: Last Week's Prompt",
      doc: doc([
        ...chrome(id, "week 02"),
        ...heading(id, "two minutes", "Check-in: Last Week"),
        text(id, 64, 280, 1472, 480, [
          para("Who saved a prompt and used it again?", 40, { bullet: true }),
          para("ใครบันทึกพรอมป์ไว้และเอามาใช้ซ้ำบ้าง?", 28, { color: "text-2" }),
          para("What was it for?", 40, { bullet: true }),
          para("ใช้ทำอะไร?", 28, { color: "text-2" }),
          para("What happened when you used it at work?", 40, { bullet: true }),
          para("พอใช้จริงที่ทำงาน เกิดอะไรขึ้น?", 28, { color: "text-2" }),
        ]),
      ], "Ask for two or three quick answers. No one has to share. Keep it under two minutes."),
    },
    {
      title: "From Answers to Doing the Work",
      doc: doc([
        ...chrome(id, "the shift"),
        ...heading(id, "same tool, bigger job", "From Answers to Doing the Work"),
        card(id, 64, 270, 716, 440, "danger"),
        text(id, 96, 300, 652, 380, [
          para("Asking", 40, { font: "mono", bold: true, color: "danger" }),
          para("Ask a question → read the answer → close the tab.", 32),
          para("ถามคำถาม → อ่านคำตอบ → ปิดหน้า", 24, { color: "text-2" }),
        ]),
        card(id, 820, 270, 716, 440, "success", 1),
        text(id, 852, 300, 652, 380, [
          para("Doing the work", 40, { font: "mono", bold: true, color: "success" }),
          para("Give it your material → get something you can use → save how you did it.", 32),
          para("ให้ข้อมูลของคุณ → ได้ผลที่ใช้งานได้ → บันทึกวิธีไว้", 24, { color: "text-2" }),
        ], { step: 1 }),
        text(id, 64, 740, 1472, 70, [para("Today: three habits that save real time.", 28, { font: "mono", color: "accent" })]),
      ], "Most people use AI like a search box. Today's three habits: give it your material, ask for a structured result, save what worked."),
    },
    {
      title: "Give It Your Material",
      doc: doc([
        ...chrome(id, "habit 1"),
        ...heading(id, "habit 1", "Give It Your Material"),
        ...stepCard(id, 0, 3, "Paste or upload", "An email thread, meeting notes, a report.", "เธรดอีเมล โน้ตประชุม หรือรายงาน"),
        ...stepCard(id, 1, 3, "Say what you want", "A summary, an action list, a reply draft.", "สรุป รายการงาน หรือร่างคำตอบ"),
        ...stepCard(id, 2, 3, "Check, then use", "Read it, fix it, then send it.", "อ่าน แก้ แล้วค่อยส่ง", "success"),
      ], "The AI only knows what you give it. Material in, better answer out. Remind people: practice data only."),
    },
    {
      title: "Messy In, Structured Out",
      doc: doc([
        ...chrome(id, "habit 2"),
        ...heading(id, "habit 2", "Messy In, Structured Out"),
        { id: id(), type: "window", title: "meeting-notes.txt", border: "danger", x: 64, y: 260, w: 716, h: 400 },
        text(id, 100, 322, 644, 320, [
          para("mon call w/ supplier - linen late again??", 24, { font: "mono" }),
          para("ann to chase by fri", 24, { font: "mono" }),
          para("budget ok maybe 20k", 24, { font: "mono" }),
          para("need rota for songkran, ask bo", 24, { font: "mono" }),
          para("invoice 4471 not paid", 24, { font: "mono" }),
        ]),
        { id: id(), type: "window", title: "action-list.md", border: "success", x: 820, y: 260, w: 716, h: 400, step: 1 },
        text(id, 856, 322, 644, 320, [
          para("Ann · chase linen supplier · Fri", 24, { font: "mono" }),
          para("Bo · draft Songkran rota · date unclear", 24, { font: "mono" }),
          para("Finance · confirm budget (~20k) · unclear", 24, { font: "mono" }),
          para("Owner unclear · pay invoice 4471 · date unclear", 24, { font: "mono" }),
        ], { step: 1 }),
        text(id, 64, 690, 1472, 120, [
          para("Turn these notes into an action list: task, owner, due date. Mark anything unclear.", 28, { font: "mono", color: "accent" }),
          para("เปลี่ยนโน้ตเป็นรายการงาน: งาน ผู้รับผิดชอบ กำหนดส่ง ถ้าไม่ชัดให้ระบุว่าไม่ชัดเจน", 24, { color: "text-2" }),
        ], { step: 1 }),
      ], "Invented sample. Point out that the AI flagged what was missing instead of guessing. You can ask for a table, a checklist, a short email, or JSON."),
    },
    {
      title: "Let AI Interview You",
      doc: doc([
        ...chrome(id, "habit 2"),
        ...heading(id, "when you don't know what to ask", "Let AI Interview You"),
        { id: id(), type: "window", title: "prompt.txt", x: 64, y: 270, w: 1472, h: 280 },
        text(id, 100, 336, 1400, 200, [
          para("I need to write [the weekly report for my supervisor].", 28, { font: "mono" }),
          para("Ask me questions one at a time until you have enough, then write it.", 28, { font: "mono", color: "accent" }),
        ]),
        text(id, 64, 590, 1472, 220, [
          para("You don't need a perfect prompt. The AI finds what is missing.", 32, { bullet: true }),
          para("ไม่ต้องเขียนพรอมป์สมบูรณ์แบบ AI จะถามสิ่งที่ขาดไปเอง", 24, { color: "text-2" }),
          para("Great for reports, emails and plans you keep putting off.", 32, { bullet: true }),
          para("เหมาะกับรายงาน อีเมล และแผนที่เลื่อนมานาน", 24, { color: "text-2" }),
        ]),
      ], "Optional mini demo: do this live with an invented task and answer three of its questions."),
    },
    {
      title: "Save the Prompt That Worked",
      doc: doc([
        ...chrome(id, "habit 3"),
        ...heading(id, "habit 3", "Save the Prompt That Worked"),
        { id: id(), type: "window", title: "weekly-report-template.txt", x: 64, y: 270, w: 820, h: 520 },
        text(id, 100, 336, 748, 420, [
          para("Turn the notes below into a weekly report for [WHO].", 24, { font: "mono" }),
          para("Use these headings: Done, Next, Blockers.", 24, { font: "mono" }),
          para("Keep it under [150] words. Plain, friendly tone.", 24, { font: "mono" }),
          para("Notes:", 24, { font: "mono", color: "accent" }),
          para("[PASTE NOTES HERE]", 24, { font: "mono", color: "accent" }),
        ]),
        text(id, 924, 290, 612, 480, [
          para("Keep the parts that change in [brackets].", 32, { bullet: true }),
          para("ส่วนที่เปลี่ยนทุกครั้งให้ใส่ใน [วงเล็บ]", 24, { color: "text-2" }),
          para("Save it where you will find it: a note, a doc, or a skill.", 32, { bullet: true }),
          para("เก็บไว้ในที่ที่หาเจอ เช่น โน้ต เอกสาร หรือสกิล", 24, { color: "text-2" }),
        ]),
      ], "This is the habit that actually saves time. The template is the thing that gets reused every week."),
    },
    {
      title: "Task Audit: What Can Go?",
      doc: doc([
        ...chrome(id, "task audit"),
        ...heading(id, "your own week", "Task Audit: What Can Go?"),
        ...stepCard(id, 0, 4, "Repeats?", "Do you do it every week?", "ทำทุกสัปดาห์หรือไม่"),
        ...stepCard(id, 1, 4, "15+ minutes?", "Does it take a quarter hour or more?", "ใช้เวลา 15 นาทีขึ้นไปหรือไม่"),
        ...stepCard(id, 2, 4, "Clear rules?", "Could you explain the steps to a new colleague?", "อธิบายขั้นตอนให้เพื่อนใหม่ได้หรือไม่"),
        ...stepCard(id, 3, 4, "Safe to share?", "No guest names, IDs or confidential figures?", "ไม่มีชื่อแขก เลขบัตร หรือตัวเลขลับใช่ไหม", "success"),
      ], "Give two minutes: each person lists three weekly chores and ticks the four questions. Four yeses means try it this week."),
    },
    {
      title: "Safety First: Practice Data Only",
      doc: doc([
        ...chrome(id, "safety"),
        ...heading(id, "before you paste anything", "Safety First"),
        card(id, 64, 270, 716, 460, "danger"),
        text(id, 96, 300, 652, 400, [
          para("Never paste", 40, { font: "mono", bold: true, color: "danger" }),
          para("Guest or staff names and contact details", 28, { bullet: true }),
          para("ID or passport numbers, passwords", 28, { bullet: true }),
          para("Contracts and real finance figures", 28, { bullet: true }),
          para("ห้ามวางข้อมูลจริงเหล่านี้", 24, { color: "text-2" }),
        ]),
        card(id, 820, 270, 716, 460, "success"),
        text(id, 852, 300, 652, 400, [
          para("Use instead", 40, { font: "mono", bold: true, color: "success" }),
          para("Invented names and shortened details", 28, { bullet: true }),
          para("Sample notes shown in this session", 28, { bullet: true }),
          para("Follow your workplace policy for the rest", 28, { bullet: true }),
          para("ใช้ข้อมูลสมมติแทน และทำตามนโยบายที่ทำงาน", 24, { color: "text-2" }),
        ]),
        text(id, 64, 760, 1472, 56, [para("Next week: how to check what AI gives you.", 28, { font: "mono", color: "accent" })]),
      ], "Say it plainly: during this session we use only invented material. Mention the company's own AI policy if there is one."),
    },
    {
      title: "Live Prompt Challenge",
      doc: doc([
        ...chrome(id, "live challenge"),
        ...heading(id, "live activity", "Live Prompt Challenge"),
        widget(id, 64, 260, 1000, 400, "challenge"),
        widget(id, 64, 680, 1000, 130, "live-stats"),
        widget(id, 1104, 140, 432, 670, "join"),
      ], "Live slide. Use Open case to draw a chore, or skip it and use the plan's challenge. Start prompt submission from the presenter controls."),
    },
    {
      title: "Prompt Battle",
      doc: doc([
        ...chrome(id, "prompt battle"),
        widget(id, 64, 100, 1472, 710, "battle"),
      ], "Live slide: the active battle, vote progress and the presenter's next action button."),
    },
    {
      title: "Final Results",
      doc: doc([
        ...chrome(id, "final results"),
        ...heading(id, "community vote", "Final Rankings"),
        widget(id, 64, 260, 1472, 560, "leaderboard"),
      ], "Live slide: champion and rankings appear once the Grand Final is complete."),
    },
    {
      title: "Take It to Work",
      doc: doc([
        ...chrome(id, "this week"),
        ...heading(id, "your 15-minute challenge", "Take It to Work"),
        ...stepCard(id, 0, 3, "Pick one chore", "Choose a safe, repeating task from your audit.", "เลือกงานซ้ำที่ปลอดภัยหนึ่งอย่างจากการสำรวจ"),
        ...stepCard(id, 1, 3, "Try it, then fix it", "Give AI practice material and edit what comes back.", "ให้ข้อมูลตัวอย่างกับ AI แล้วแก้ผลที่ได้"),
        ...stepCard(id, 2, 3, "Save and note the time", "Keep the prompt. Write down the minutes saved.", "บันทึกพรอมป์ และจดว่าประหยัดไปกี่นาที", "success"),
      ], "Next week is Check the Work: accuracy, trust and privacy. Ask people to bring one AI answer they weren't sure about."),
    },
  ];
}
