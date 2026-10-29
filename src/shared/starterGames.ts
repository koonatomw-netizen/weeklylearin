import type { GameDef } from "./games";

const b = (en: string, th: string) => ({ en, th });

/** Games that ship with the Week 01 starter plan. Editable in the Weekly Planner like any other game. */
export const WEEK01_GAMES: GameDef[] = [
  {
    id: "prompt-basics", kind: "quiz", title: b("Prompt basics quiz", "ควิซพื้นฐานพรอมป์"),
    questions: [
      {
        text: b("Which part tells the AI the situation and the role it plays?", "ส่วนไหนบอก AI ว่าสถานการณ์คืออะไรและต้องรับบทบาทอะไร?"),
        options: [b("Context", "บริบท"), b("Format", "รูปแบบ"), b("Audience", "ผู้รับสาร"), b("Constraints", "ข้อกำหนด")], correct: 0,
      },
      {
        text: b("\"Keep it under 80 words\" is which part of the prompt?", "\"เขียนไม่เกิน 80 คำ\" คือส่วนไหนของพรอมป์?"),
        options: [b("Goal", "เป้าหมาย"), b("Audience", "ผู้รับสาร"), b("Constraints", "ข้อกำหนด"), b("Format", "รูปแบบ")], correct: 2,
      },
      {
        text: b("\"The guest is tired after a long flight\" tells the AI about the...", "\"แขกเหนื่อยหลังเดินทางไกล\" บอก AI เรื่อง..."),
        options: [b("Audience", "ผู้รับสาร"), b("Format", "รูปแบบ"), b("Goal", "เป้าหมาย")], correct: 0,
      },
    ],
  },
];

/** Games that ship with the Week 02 starter plan. */
export const WEEK02_GAMES: GameDef[] = [
  {
    id: "task-audit", kind: "poll", title: b("Task audit", "สำรวจงานประจำ"),
    questions: [{
      text: b("Which weekly chore costs you the most time?", "งานประจำอะไรใช้เวลาคุณมากที่สุดในแต่ละสัปดาห์?"),
      options: [
        b("Emails and replies", "อีเมลและการตอบกลับ"), b("Meeting notes", "จดและสรุปประชุม"), b("Weekly reports", "รายงานประจำสัปดาห์"),
        b("Scheduling and rotas", "จัดตารางและเวร"), b("Data entry", "กรอกข้อมูล"), b("Something else", "อย่างอื่น"),
      ],
    }],
  },
  {
    id: "chore-wall", kind: "open", title: b("Chores for AI", "งานที่จะให้ AI ช่วย"),
    questions: [{ text: b("One repeating chore you would hand to AI. No real names or data.", "งานซ้ำๆ หนึ่งอย่างที่คุณจะให้ AI ช่วย ห้ามใส่ชื่อหรือข้อมูลจริง"), options: [] }],
  },
  {
    id: "safe-to-paste", kind: "quiz", title: b("Safe to paste?", "วางได้ไหม?"),
    questions: [
      { text: b("Can you paste a guest's name and phone number into an AI tool?", "วางชื่อและเบอร์โทรของแขกลงในเครื่องมือ AI ได้ไหม?"), options: [b("Yes", "ได้"), b("No", "ไม่ได้")], correct: 1 },
      { text: b("Is it fine to use invented sample notes to practise?", "ใช้โน้ตตัวอย่างที่แต่งขึ้นเพื่อฝึกได้ไหม?"), options: [b("Yes", "ได้"), b("No", "ไม่ได้")], correct: 0 },
      { text: b("Can you paste a real supplier contract with prices?", "วางสัญญาซัพพลายเออร์จริงที่มีราคาได้ไหม?"), options: [b("Yes", "ได้"), b("No", "ไม่ได้")], correct: 1 },
    ],
  },
];
