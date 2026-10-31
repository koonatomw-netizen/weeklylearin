import type { GameDef } from "./games";
import type { WeekSpec } from "./curriculum";

const b = (en: string, th: string) => ({ en, th });
const opt = b;
const SAFE = b("Practice data only. Invented names, no real guests or colleagues.", "ใช้ข้อมูลฝึกเท่านั้น ชื่อสมมติ ไม่ใช้แขกหรือเพื่อนร่วมงานจริง");

const quiz = (id: string, title: ReturnType<typeof b>, questions: GameDef["questions"]): GameDef => ({ id, kind: "quiz", title, questions });

/** Weeks 3 to 7 of the 12-week course. Weeks 1 and 2 live in templates.ts and week02.ts. */
export const WEEKS_A: WeekSpec[] = [
  // ------------------------------------------------------------------ week 3
  {
    number: 3, title: "Make AI Write Like You", category: "Everyday AI", durationMin: 50,
    outcome: b("Adjust the tone and format of a message so it suits the reader.", "ปรับโทนและรูปแบบข้อความให้เหมาะกับผู้รับ"),
    lines: ["learn: tone and format", "play: Tone Battle", "wow: one message, 4 tones", "time: 50 minutes"],
    wow: b("one message in four tones and three languages", "ข้อความเดียว สี่โทน สามภาษา"),
    checkIn: b("Which chore did you hand to AI last week, and how many minutes did it save?", "งานซ้ำที่คุณให้ AI ช่วยสัปดาห์ที่แล้วคืออะไร ประหยัดไปกี่นาที?"),
    concepts: [
      { layout: "statement", eyebrow: "why tone matters", big: b("Same words. Different reader. Different message.", "คำเดียวกัน ผู้อ่านต่างกัน ข้อความก็ควรต่างกัน"),
        sub: b("A message is judged by how it lands, not how it sounds to you.", "ข้อความวัดจากที่ผู้อ่านรู้สึก ไม่ใช่ที่เราคิดว่าเพราะ"),
        notes: "เปิดด้วยตัวอย่างประโยค 'ส่งรายงานมาเดี๋ยวนี้' ถามห้องว่าถ้าเป็นหัวหน้าพูดกับเรา รู้สึกอย่างไร" },
      { layout: "cards", eyebrow: "three dials", title: "Three Dials You Can Turn", titleTh: "สามอย่างที่ปรับได้", numbered: true,
        cards: [
          { title: "Reader", body: b("Who reads it: a guest, a boss, a new colleague.", "ใครอ่าน: แขก หัวหน้า เพื่อนร่วมงานใหม่") },
          { title: "Tone", body: b("How it should feel: warm, firm, calm.", "ให้รู้สึกอย่างไร: อบอุ่น หนักแน่น สงบ") },
          { title: "Format", body: b("Where it goes: LINE, email, a notice board.", "ส่งที่ไหน: LINE อีเมล ป้ายประกาศ") },
        ],
        bar: b("Tell the AI all three dials in one sentence.", "บอก AI ทั้งสามอย่างในประโยคเดียว"),
        notes: "ให้ห้องยกตัวอย่างผู้อ่านสองคนที่ต้องเขียนถึงต่างโทนกัน" },
      { layout: "compare", eyebrow: "before and after", title: "Blunt vs Kind", titleTh: "ห้วนกับสุภาพ",
        left: { title: "too blunt.txt", text: b("Send me the report now.", "ส่งรายงานมาเดี๋ยวนี้") },
        right: { title: "clear and kind.txt", text: b("Hi Mia, could you send me the report by 3 pm today? Thank you!", "สวัสดีมีย์ ช่วยส่งรายงานภายใน 15:00 วันนี้ได้ไหม ขอบคุณค่ะ") },
        caption: b("Same request. Only the second one keeps the relationship.", "คำขอเดียวกัน แต่แบบที่สองรักษาความสัมพันธ์ไว้ด้วย") },
      { layout: "checklist", eyebrow: "tone words", title: "Tone Words To Ask For", titleTh: "คำบอกโทนที่ใช้ได้",
        items: [
          b("Warm: like a friendly host", "อบอุ่น เหมือนเจ้าบ้านที่เป็นมิตร"),
          b("Formal: for managers and partners", "ทางการ สำหรับผู้บริหารและคู่ค้า"),
          b("Brief: short and to the point", "กระชับ ตรงประเด็น"),
          b("Apologetic: own the problem", "ขออภัย ยอมรับว่าเกิดปัญหา"),
          b("Confident: clear, no hedging", "มั่นใจ ชัดเจน ไม่อ้อมค้อม"),
        ],
        tip: { title: "Tip", body: b("Add a number too: under 60 words, two sentences.", "ใส่ตัวเลขด้วย เช่น ไม่เกิน 60 คำ สองประโยค") } },
      { layout: "timeline", eyebrow: "your own voice", title: "Teach AI Your Voice", titleTh: "สอน AI ให้เขียนเหมือนคุณ",
        steps: [
          { label: "Show", body: b("Paste two short messages you wrote yourself.", "วางข้อความสั้น ๆ สองฉบับที่คุณเขียนเอง") },
          { label: "Ask", body: b("Say: write the next one in the same style.", "สั่ง: เขียนฉบับต่อไปในสไตล์เดียวกัน") },
          { label: "Edit", body: b("Fix names and facts. Keep your own greeting.", "แก้ชื่อและข้อเท็จจริง ใช้คำทักทายแบบคุณ") },
        ],
        bar: "AI drafts. You decide what goes out under your name." },
    ],
    demo: {
      eyebrow: "wow moment", title: "Watch: One Message, Four Tones", titleTh: "ดูสด: ข้อความเดียว สี่โทน", windowTitle: "live demo: one message, four tones",
      steps: [b("Paste: 'Your order is two days late.'", "วางข้อความ: ออเดอร์ของคุณล่าช้าสองวัน"), b("Ask for warm, formal, brief and playful.", "ขอสี่โทน: อบอุ่น ทางการ กระชับ สนุก"), b("Now translate each into Thai and Japanese.", "แปลทุกโทนเป็นไทยและญี่ปุ่นต่อทันที")],
      watch: { title: "Watch for", bullets: [b("Same facts in every version", "ข้อเท็จจริงเหมือนกันทุกฉบับ"), b("Which tone would you send?", "คุณจะส่งโทนไหน"), b("What the AI got wrong", "ส่วนที่ AI พลาด")] },
    },
    safety: {
      eyebrow: "before you send", title: "Read It Before You Send It", titleTh: "อ่านก่อนส่งทุกครั้ง",
      donts: [b("Send the draft unchanged", "ส่งร่างโดยไม่แก้"), b("Paste a real customer's name", "วางชื่อลูกค้าจริง"), b("Let AI promise what you can't", "ให้ AI สัญญาเกินที่ทำได้")],
      dos: [b("Read it out loud once", "อ่านออกเสียงหนึ่งรอบ"), b("Check names, dates and prices", "เช็กชื่อ วันที่ และราคา"), b("Keep your own greeting", "ใส่คำทักทายแบบของคุณ")],
      bar: "AI drafts. You own the message.",
    },
    game: {
      title: "Game: Tone Battle", titleTh: "เกม: Tone Battle",
      rules: [b("First a quick tone quiz on your phone.", "เริ่มด้วยควิซจับโทนบนมือถือ"), b("Then write a prompt for the live challenge.", "จากนั้นเขียนพรอมป์สำหรับโจทย์สด"), b("The room votes for the prompt it would use.", "ห้องโหวตพรอมป์ที่อยากใช้จริง")],
      scoring: b("100 per quiz answer; votes decide the battle", "ควิซละ 100 คะแนน พรอมป์ตัดสินด้วยการโหวต"),
    },
    challenge: {
      titleEn: "Upset customer", titleTh: "ลูกค้าไม่พอใจ",
      scenarioEn: "A customer is upset because their order is two days late. You must reply today.", scenarioTh: "ลูกค้าไม่พอใจเพราะออเดอร์ล่าช้าสองวัน คุณต้องตอบกลับวันนี้",
      taskEn: "Write a prompt that gets an AI to draft a short, calm, apologetic reply. Do not invent a new delivery date.", taskTh: "เขียนพรอมป์ให้ AI ร่างข้อความตอบกลับสั้น ๆ สงบ และขออภัย ห้ามแต่งวันส่งใหม่",
    },
    games: [quiz("tone-match", b("Tone match", "จับโทนให้ตรง"), [
      { text: b("A guest waited 30 minutes for a room. Which tone fits the message?", "แขกรอห้อง 30 นาที โทนไหนเหมาะกับข้อความถึงแขก?"), options: [opt("Warm and apologetic", "อบอุ่นและขออภัย"), opt("Cold and short", "เย็นชาและสั้น"), opt("Jokey and casual", "ตลกและเป็นกันเอง")], correct: 0 },
      { text: b("A colleague is two days late with a report. Best tone for the reminder?", "เพื่อนร่วมงานส่งรายงานช้าสองวัน โทนไหนเหมาะกับข้อความเตือน?"), options: [opt("Friendly but clear", "เป็นมิตรแต่ชัดเจน"), opt("Angry, in capitals", "โกรธ ตัวพิมพ์ใหญ่"), opt("So polite the deadline vanishes", "สุภาพจนเส้นตายหายไป")], correct: 0 },
      { text: b("A new rule for the whole team. Which style works?", "กฎใหม่สำหรับทั้งทีม สไตล์ไหนเหมาะ?"), options: [opt("Short, clear, neutral", "สั้น ชัด เป็นกลาง"), opt("A long personal story", "เรื่องส่วนตัวยาว ๆ"), opt("Slang and emojis only", "ภาษาแสลงและอีโมจิล้วน")], correct: 0 },
      { text: b("Which instruction gives the AI the best tone guidance?", "คำสั่งไหนบอกโทนให้ AI ได้ดีที่สุด?"), options: [opt("Make it better", "ทำให้ดีขึ้น"), opt("Write it warm and polite, under 60 words", "เขียนให้อบอุ่น สุภาพ ไม่เกิน 60 คำ"), opt("Write it nicely", "เขียนให้ดี ๆ")], correct: 1 },
    ])],
    takeHome: {
      cards: [
        { title: "Pick a message", body: b("Choose one practice message you need to send this week.", "เลือกข้อความฝึกหนึ่งฉบับที่ต้องส่งสัปดาห์นี้") },
        { title: "Set the dials", body: b("Tell the AI the reader, the tone and the format.", "บอก AI ผู้อ่าน โทน และรูปแบบ") },
        { title: "Edit and send", body: b("Fix facts, add your voice, send it, note the reply.", "แก้ข้อเท็จจริง ใส่สไตล์คุณ ส่ง และจดผลตอบรับ") },
      ],
      next: b("Next week: AI Can Read That! Bring a practice PDF or photo.", "สัปดาห์หน้า: AI อ่านเอกสารให้ได้ เตรียม PDF หรือรูปตัวอย่างมา"),
    },
    planNotes: "Week 03 of 12. Goal: match tone and format to the reader. Run order: check-in, concepts, live demo, safety, tone quiz, live challenge, battle, results, take-home. About 50 minutes. " + SAFE.en,
    notes: {
      opener: "ต้อนรับ ให้ทุกคนสแกน QR เข้าห้อง บอกว่าวันนี้จะเปลี่ยนข้อความเดียวให้เป็นหลายโทน",
      checkIn: "ให้เล่าเรื่องงานซ้ำที่ลองให้ AI ช่วยสัปดาห์ก่อน เลือก 2 คนมาเล่า ไม่ต้องบอกข้อมูลจริง",
      demo: "เดโมสด: วางประโยค 'ออเดอร์ของคุณล่าช้าสองวัน' ขอสี่โทน แล้วแปลเป็นไทยและญี่ปุ่น ให้ห้องเลือกโทนที่จะส่ง",
      safety: "ย้ำว่า AI เขียนร่างให้ แต่ชื่อเราอยู่บนข้อความ ต้องอ่านก่อนส่งเสมอ",
      game: "เปิด Game Hub: Tone match ก่อน แล้วไปสไลด์ถัดไปเพื่อเริ่มโจทย์สด",
      takeHome: "ให้ทุกคนจดข้อความที่จะลองสัปดาห์นี้ สัปดาห์หน้าจะถามผล",
    },
  },

  // ------------------------------------------------------------------ week 4
  {
    number: 4, title: "AI Can Read That!", category: "Everyday AI", durationMin: 50,
    outcome: b("Hand AI a PDF, photo or table and get answers, summaries and checks back.", "ให้ AI ช่วยอ่าน PDF รูปภาพ และตาราง แล้วสรุปหรือตรวจให้"),
    lines: ["learn: reading documents", "play: Document Detective", "wow: ask a 60-page PDF", "time: 50 minutes"],
    wow: b("ask a long PDF a question and get the page number", "ถามจาก PDF ยาว ๆ แล้วได้เลขหน้ากลับมา"),
    checkIn: b("What message did you improve with AI, and what did the reader say?", "ข้อความที่คุณปรับด้วย AI คืออะไร และผู้รับตอบกลับว่าอย่างไร?"),
    concepts: [
      { layout: "cards", eyebrow: "what AI can read", title: "What AI Can Read", titleTh: "AI อ่านอะไรได้บ้าง",
        cards: [
          { title: "PDF and text", body: b("Policies, menus, long emails: ask for a summary.", "นโยบาย เมนู อีเมลยาว: ขอสรุปได้"), tone: "context" },
          { title: "Photos and scans", body: b("Receipts, whiteboards, printed forms.", "ใบเสร็จ ไวต์บอร์ด แบบฟอร์มที่พิมพ์"), tone: "goal" },
          { title: "Tables and sheets", body: b("Rows of numbers: ask for totals and odd ones out.", "ตารางตัวเลข: ขอผลรวมและค่าที่ผิดปกติ"), tone: "audience" },
        ],
        bar: b("You supply the document. AI reads it. You check the answer.", "คุณให้เอกสาร AI อ่าน คุณตรวจคำตอบ"),
        notes: "ถามห้องว่าเอกสารแบบไหนที่ต้องอ่านบ่อยที่สุดในงาน" },
      { layout: "timeline", eyebrow: "how to ask", title: "Four Steps To Ask A Document", titleTh: "สี่ขั้นถามเอกสาร",
        steps: [
          { label: "Give", body: b("Attach or paste the document.", "แนบหรือวางเอกสาร") },
          { label: "Ask", body: b("Say exactly what you want from it.", "บอกชัดว่าต้องการอะไร") },
          { label: "Cite", body: b("Ask which page each answer came from.", "ขอให้บอกหน้าที่เป็นที่มา") },
          { label: "Check", body: b("Open the source and confirm one fact.", "เปิดต้นฉบับ ตรวจหนึ่งข้อ") },
        ],
        bar: "Never trust a number you did not check at the source." },
      { layout: "compare", eyebrow: "before and after", title: "Vague vs Specific Ask", titleTh: "ถามกว้างกับถามเจาะจง",
        left: { title: "vague.txt", text: b("Read this and tell me about it.", "อ่านนี่แล้วเล่าให้ฟังหน่อย") },
        right: { title: "specific.txt", text: b("List every date and amount in this invoice as a table, with the line each came from.", "ลิสต์ทุกวันที่และจำนวนเงินในใบแจ้งหนี้เป็นตาราง พร้อมบรรทัดที่มา") },
        caption: b("Specific asks get answers you can check.", "คำขอที่เจาะจงให้คำตอบที่ตรวจสอบได้") },
      { layout: "numbers", eyebrow: "why check", title: "Why Check The Source", titleTh: "ทำไมต้องเปิดต้นฉบับ",
        stats: [
          { value: "1", label: b("key fact to verify, every time", "ข้อเท็จจริงสำคัญที่ต้องตรวจทุกครั้ง"), tone: "accent" },
          { value: "3", label: b("practice documents in today's game", "เอกสารฝึกในเกมวันนี้"), tone: "success" },
          { value: "0", label: b("real documents we paste today", "เอกสารจริงที่เราวางวันนี้"), tone: "danger" },
        ],
        bar: b("Today we only use invented documents.", "วันนี้ใช้เอกสารสมมติเท่านั้น") },
    ],
    demo: {
      eyebrow: "wow moment", title: "Watch: Ask A 60-Page PDF", titleTh: "ดูสด: ถามจาก PDF 60 หน้า", windowTitle: "live demo: ask a long pdf",
      steps: [b("Open a 60-page practice PDF.", "เปิด PDF ฝึก 60 หน้า"), b("Ask which clause covers late fees. Cite the page.", "ถามว่าข้อไหนพูดถึงค่าปรับ ให้ระบุหน้า"), b("Open that page. Is the answer right?", "เปิดหน้านั้นดู คำตอบถูกไหม")],
      watch: { title: "Watch for", bullets: [b("Page numbers in the answer", "เลขหน้าในคำตอบ"), b("How fast it found the clause", "หาข้อนั้นได้เร็วแค่ไหน"), b("What it could not find", "สิ่งที่หาไม่เจอ")] },
    },
    safety: {
      eyebrow: "documents are data", title: "Documents Are Data", titleTh: "เอกสารคือข้อมูล",
      donts: [b("Paste contracts with real prices", "วางสัญญาที่มีราคาจริง"), b("Upload IDs or passports", "อัปโหลดบัตรหรือพาสปอร์ต"), b("Trust a number you didn't check", "เชื่อตัวเลขที่ไม่ได้ตรวจ")],
      dos: [b("Use invented practice documents", "ใช้เอกสารสมมติเพื่อฝึก"), b("Hide names before you upload", "ซ่อนชื่อก่อนอัปโหลด"), b("Follow your workplace AI policy", "ทำตามนโยบาย AI ของที่ทำงาน")],
      bar: "If you would not post it publicly, do not paste it.",
    },
    game: {
      title: "Game: Document Detective", titleTh: "เกม: Document Detective",
      rules: [b("Three practice documents come next.", "ต่อไปคือเอกสารฝึกสามฉบับ"), b("Find the detail each question asks for.", "หารายละเอียดที่คำถามต้องการ"), b("One document has a planted mistake.", "มีเอกสารหนึ่งฉบับที่ใส่ข้อผิดไว้")],
      scoring: b("100 per correct answer", "ตอบถูกได้ข้อละ 100 คะแนน"),
    },
    gameSlides: [
      { eyebrow: "document 1", title: "Document 1: Receipt", titleTh: "เอกสาร 1: ใบเสร็จ", windowTitle: "receipt.txt (practice)",
        lines: ["CAFE NIMMAN - PRACTICE RECEIPT", "Date: 14 Nov 2026    Table: 5", "", "Latte x2 ............... 120", "Iced tea x1 ............  45", "Cake x1 ................  85", "", "TOTAL ................. 295"],
        hint: { title: "Look for", bullets: [b("Do the lines add up?", "แต่ละบรรทัดรวมกันถูกไหม"), b("Which item is cheapest each?", "ชิ้นไหนถูกที่สุดต่อหน่วย")] } },
      { eyebrow: "document 2", title: "Document 2: Shift Plan", titleTh: "เอกสาร 2: ตารางเวร", windowTitle: "shifts.txt (practice)",
        lines: ["NIMMAN FRONT DESK - SHIFT PLAN", "", "Mon   Ann   Bo", "Tue   Bo", "Wed   Ann   Bo   Cam", "Thu   Cam   Bo", "Fri   Ann"],
        hint: { title: "Look for", bullets: [b("Days with only one person", "วันที่มีคนเดียว"), b("Who works the most shifts", "ใครทำเวรมากที่สุด")] } },
      { eyebrow: "document 3", title: "Document 3: Invoice", titleTh: "เอกสาร 3: ใบแจ้งหนี้", windowTitle: "invoice.txt (practice)",
        lines: ["INVOICE 0231 (PRACTICE)", "Issued: 2 Nov 2026", "Due:    30 Nov 2026", "", "Item:   Printing 200 flyers", "Amount: 1,800 THB + 7% VAT", "Pay to: Example Print Co."],
        hint: { title: "Look for", bullets: [b("The due date", "วันครบกำหนด"), b("How much the VAT is", "ภาษีมูลค่าเพิ่มเท่าไร")] } },
    ],
    games: [quiz("document-detective", b("Document Detective", "นักสืบเอกสาร"), [
      { text: b("Document 1: what is the correct total?", "เอกสาร 1: ยอดรวมที่ถูกต้องคือเท่าไร"), options: [opt("250", "250"), opt("295", "295"), opt("205", "205"), opt("240", "240")], correct: 0 },
      { text: b("Document 1: which item is cheapest per unit?", "เอกสาร 1: ชิ้นไหนถูกที่สุดต่อหน่วย"), options: [opt("Latte", "ลาเต้"), opt("Iced tea", "ชาเย็น"), opt("Cake", "เค้ก")], correct: 1 },
      { text: b("Document 2: which days have only one person?", "เอกสาร 2: วันไหนมีคนเดียว"), options: [opt("Tue and Fri", "อังคารและศุกร์"), opt("Mon and Wed", "จันทร์และพุธ"), opt("Thu only", "พฤหัสบดีเท่านั้น"), opt("Wed and Fri", "พุธและศุกร์")], correct: 0 },
      { text: b("Document 2: who works the most shifts?", "เอกสาร 2: ใครทำเวรมากที่สุด"), options: [opt("Ann", "แอน"), opt("Bo", "โบ"), opt("Cam", "แคม")], correct: 1 },
      { text: b("Document 3: what is the due date?", "เอกสาร 3: วันครบกำหนดคือเมื่อไร"), options: [opt("2 Nov 2026", "2 พ.ย. 2026"), opt("30 Nov 2026", "30 พ.ย. 2026"), opt("7 Nov 2026", "7 พ.ย. 2026")], correct: 1 },
      { text: b("Document 3: how much is the 7% VAT?", "เอกสาร 3: ภาษี 7% เท่าไร"), options: [opt("126 THB", "126 บาท"), opt("180 THB", "180 บาท"), opt("1,926 THB", "1,926 บาท"), opt("7 THB", "7 บาท")], correct: 0 },
    ])],
    takeHome: {
      cards: [
        { title: "Pick a document", body: b("Choose a practice PDF or photo you could use.", "เลือก PDF หรือรูปฝึกที่ใช้ได้") },
        { title: "Ask and cite", body: b("Ask a specific question and require the page.", "ถามให้เจาะจงและขอเลขหน้า") },
        { title: "Check one fact", body: b("Open the source and confirm one number.", "เปิดต้นฉบับแล้วตรวจตัวเลขหนึ่งตัว") },
      ],
      next: b("Next week: Think Better with AI. Bring a small real-style decision.", "สัปดาห์หน้า: คิดให้ดีขึ้นกับ AI เตรียมการตัดสินใจเล็ก ๆ มา"),
    },
    planNotes: "Week 04 of 12. Goal: ask documents precise questions and check the source. Run order: check-in, concepts, wow demo, safety, Document Detective (documents on the slides, questions in the Game Hub), take-home. About 50 minutes. " + SAFE.en,
    notes: {
      opener: "วันนี้ให้ AI อ่านเอกสารแทนเรา แต่เรายังเป็นคนตรวจ",
      checkIn: "ถามผลของข้อความที่ปรับโทนสัปดาห์ก่อน ผู้รับตอบอย่างไร",
      demo: "ใช้ PDF ฝึกยาว 60 หน้าที่เตรียมไว้ล่วงหน้า (ข้อมูลสมมติ) ถามหาข้อค่าปรับล่าช้า แล้วเปิดหน้าที่อ้างให้ห้องดูจริง",
      safety: "ย้ำกฎ: ถ้าไม่โพสต์ให้คนนอกเห็น ก็ไม่วางลงแชต",
      game: "เปิดเกม Document Detective ใน Game Hub ค้างสไลด์เอกสารไว้ที่จอระหว่างตอบแต่ละข้อ",
      takeHome: "ให้เลือกเอกสารฝึกหนึ่งฉบับไว้ลองสัปดาห์นี้",
    },
  },

  // ------------------------------------------------------------------ week 5
  {
    number: 5, title: "Think Better with AI", category: "Everyday AI", durationMin: 50,
    outcome: b("Use AI as a thinking partner: compare options, spot risks, then decide.", "ใช้ AI เป็นคู่คิด เปรียบเทียบทางเลือก มองความเสี่ยง แล้วตัดสินใจ"),
    lines: ["learn: compare and decide", "play: Decision Challenge", "wow: red team my plan", "time: 50 minutes"],
    wow: b("AI attacks your plan so you can fix it first", "ให้ AI ช่วยโจมตีแผน เพื่อแก้ก่อนใช้จริง"),
    checkIn: b("Which document did you ask AI to read, and what did you check at the source?", "คุณให้ AI อ่านเอกสารอะไร และตรวจอะไรกับต้นฉบับ?"),
    concepts: [
      { layout: "statement", eyebrow: "the big idea", big: b("AI is a thinking partner, not the decision-maker.", "AI เป็นคู่คิด ไม่ใช่ผู้ตัดสินใจ"),
        sub: b("You know the people, budget and risks. AI does not.", "คุณรู้จักคน งบประมาณ และความเสี่ยง AI ไม่รู้"), notes: "ถามห้อง: การตัดสินใจครั้งล่าสุดที่ต้องเลือกระหว่างหลายทาง คืออะไร" },
      { layout: "timeline", eyebrow: "four moves", title: "A Decision In Four Moves", titleTh: "ตัดสินใจใน 4 ก้าว",
        steps: [
          { label: "Frame", body: b("Say the goal and the limits.", "บอกเป้าหมายและข้อจำกัด") },
          { label: "Options", body: b("Ask for three real options.", "ขอสามทางเลือกที่ทำได้จริง") },
          { label: "Compare", body: b("Pros, cons and risks in a table.", "ข้อดี ข้อเสีย ความเสี่ยงเป็นตาราง") },
          { label: "Decide", body: b("You choose and say why.", "คุณเลือกและบอกเหตุผล") },
        ],
        bar: "AI widens your view. You make the call." },
      { layout: "checklist", eyebrow: "good questions", title: "Questions To Ask AI", titleTh: "คำถามที่ควรถาม AI",
        items: [
          b("What am I missing?", "ฉันมองข้ามอะไรไป"), b("What could go wrong?", "อะไรอาจผิดพลาด"), b("What would change your answer?", "อะไรจะทำให้คำตอบเปลี่ยน"), b("Argue the opposite side.", "ลองโต้แย้งอีกด้าน"),
        ],
        tip: { title: "Tip", body: b("Ask for three options, never just one.", "ขอสามทางเลือกเสมอ ไม่ใช่แค่ทางเดียว") }, tone: "accent" },
      { layout: "compare", eyebrow: "before and after", title: "One Answer vs Three Options", titleTh: "คำตอบเดียวกับสามทางเลือก",
        left: { title: "one-answer.txt", text: b("What should we do about late reports?", "เราควรทำอย่างไรกับรายงานที่ส่งช้า") },
        right: { title: "three-options.txt", text: b("Give three ways to fix late reports. Compare cost, effort and risk in a table.", "ขอสามวิธีแก้รายงานช้า เปรียบเทียบต้นทุน แรงงาน ความเสี่ยงเป็นตาราง") },
        caption: b("Options make you think. One answer lets you stop thinking.", "ทางเลือกทำให้เราคิด คำตอบเดียวทำให้เราหยุดคิด") },
    ],
    demo: {
      eyebrow: "wow moment", title: "Watch: Red Team My Plan", titleTh: "ดูสด: ให้ AI ช่วยโจมตีแผน", windowTitle: "live demo: red team",
      steps: [b("Paste a practice plan: a team lunch for 12.", "วางแผนตัวอย่าง: ปาร์ตี้ทีม 12 คน"), b("Ask: act as a critic, find five weak points.", "สั่ง: เป็นผู้วิจารณ์ หาจุดอ่อนห้าข้อ"), b("Pick the two that scare you and fix them.", "เลือกสองข้อที่น่ากลัวแล้วแก้")],
      watch: { title: "Watch for", bullets: [b("Risks you had not thought of", "ความเสี่ยงที่ไม่เคยคิด"), b("Which ones are not real", "ข้อไหนไม่จริง"), b("Your final call", "การตัดสินใจสุดท้าย")] },
    },
    safety: {
      eyebrow: "your decision", title: "Your Decision, Your Name", titleTh: "คุณตัดสิน ชื่อคุณรับผิดชอบ",
      donts: [b("Let AI decide for you", "ให้ AI ตัดสินใจแทน"), b("Share staff or guest details", "แชร์ข้อมูลพนักงานหรือแขก"), b("Treat one answer as the truth", "เชื่อคำตอบเดียวเป็นความจริง")],
      dos: [b("Ask for the opposite view", "ขอมุมมองตรงข้าม"), b("Check costs with your own numbers", "ตรวจต้นทุนด้วยตัวเลขของคุณ"), b("Write down why you chose", "จดเหตุผลที่เลือก")],
      bar: "AI gives options. Responsibility stays with you.",
    },
    game: {
      title: "Game: Decision Challenge", titleTh: "เกม: Decision Challenge",
      rules: [b("Vote for the problem to fix first.", "โหวตปัญหาที่ควรแก้ก่อน"), b("Type one reason. No names.", "พิมพ์เหตุผลหนึ่งข้อ ไม่ใส่ชื่อ"), b("We read the best reasons aloud.", "เราอ่านเหตุผลที่ดีออกเสียง")],
      scoring: b("no points: this one is about thinking", "ไม่มีคะแนน เกมนี้เน้นการคิด"),
    },
    games: [
      { id: "decision-vote", kind: "poll", title: b("Which problem first?", "ปัญหาไหนก่อน"), questions: [{
        text: b("Your team can fix only one problem this month. Which first?", "ทีมแก้ได้เดือนละหนึ่งปัญหา จะแก้ปัญหาไหนก่อน"),
        options: [opt("Slow replies to guests", "ตอบแขกช้า"), opt("Messy shift swaps", "แลกเวรยุ่งเหยิง"), opt("Late weekly reports", "รายงานประจำสัปดาห์ช้า"), opt("Missing supplies list", "รายการของใช้ไม่ครบ")] }] },
      { id: "decision-reason", kind: "open", title: b("One reason", "เหตุผลหนึ่งข้อ"), questions: [{ text: b("Write one reason for your pick. No names.", "เขียนเหตุผลหนึ่งข้อของคุณ ไม่ใส่ชื่อ"), options: [] }] },
    ],
    takeHome: {
      cards: [
        { title: "Pick a decision", body: b("Choose a small real choice you face this week.", "เลือกการตัดสินใจเล็ก ๆ ที่ต้องทำสัปดาห์นี้") },
        { title: "Ask for options", body: b("Get three options in a table, then ask what could go wrong.", "ขอสามทางเลือกเป็นตาราง แล้วถามว่าอะไรอาจพลาด") },
        { title: "Decide and note", body: b("Write your choice and one reason in two lines.", "เขียนสิ่งที่เลือกและเหตุผลใน 2 บรรทัด") },
      ],
      next: b("Next week: One Prompt, Many Results. Bring five lines of practice notes.", "สัปดาห์หน้า: พรอมป์เดียวได้หลายผลลัพธ์ เตรียมโน้ตตัวอย่างห้าบรรทัด"),
    },
    planNotes: "Week 05 of 12. Goal: use AI to compare options and decide. Run order: check-in, concepts, red-team demo, safety, vote and reasons in the Game Hub, take-home. Optional: run the Head-to-Head segment (ChatGPT vs Claude) after the demo. About 50 minutes. " + SAFE.en,
    notes: {
      opener: "วันนี้ AI เป็นคู่คิด ไม่ใช่คนตัดสินใจ",
      checkIn: "ถามว่าสัปดาห์ก่อนใครเปิดต้นฉบับตรวจเอกสารแล้วเจออะไรไม่ตรง",
      demo: "ใช้แผนปาร์ตี้ทีมตัวอย่าง ให้ AI หาจุดอ่อนห้าข้อ ถามห้องว่าข้อไหนไม่จริง ถ้ามีเวลาใช้ส่วน Head-to-Head ต่อทันที",
      safety: "ย้ำว่า AI ไม่รู้งบ ไม่รู้คน และไม่ต้องรับผิดชอบแทนเรา",
      game: "เปิดโพลก่อน แล้วเปิดเกมพิมพ์เหตุผล อ่านเหตุผลที่ดีออกเสียงโดยไม่บอกชื่อ",
      takeHome: "ให้จดการตัดสินใจที่จะลองสัปดาห์นี้",
    },
  },

  // ------------------------------------------------------------------ week 6
  {
    number: 6, title: "One Prompt, Many Results", category: "Everyday AI", durationMin: 55,
    outcome: b("Turn one set of notes into an email, a checklist and a table.", "เปลี่ยนข้อมูลชุดเดียวเป็นอีเมล เช็กลิสต์ และตาราง"),
    lines: ["learn: ask for a format", "play: Format Race", "wow: one file, 3 formats", "time: 55 minutes"],
    wow: b("one set of notes becomes a spreadsheet, a doc and a slide", "โน้ตชุดเดียวกลายเป็นสเปรดชีต เอกสาร และสไลด์"),
    checkIn: b("What decision did you make with AI as a partner, and what was your reason?", "การตัดสินใจที่คุณทำกับ AI คืออะไร และเหตุผลคืออะไร?"),
    concepts: [
      { layout: "cards", eyebrow: "pick a format", title: "Pick The Right Format", titleTh: "เลือกรูปแบบให้ถูก",
        cards: [
          { title: "Email", body: b("To one person, with a clear ask.", "ถึงคนเดียว พร้อมสิ่งที่ขอชัดเจน"), tone: "context" },
          { title: "Checklist", body: b("Steps you tick off one by one.", "ขั้นตอนที่ติ๊กทีละข้อ"), tone: "goal" },
          { title: "Table", body: b("Compare things side by side.", "เปรียบเทียบเคียงข้างกัน"), tone: "audience" },
          { title: "Summary", body: b("Five lines for people in a hurry.", "ห้าบรรทัดสำหรับคนที่รีบ"), tone: "constraints" },
        ],
        bar: b("Name the format in your prompt. AI does not guess well.", "ระบุรูปแบบในพรอมป์ AI เดาได้ไม่ดี") },
      { layout: "compare", eyebrow: "before and after", title: "Ask For The Shape", titleTh: "บอกรูปร่างของผลลัพธ์",
        left: { title: "no-format.txt", text: b("Here are my notes. Make something useful.", "นี่คือโน้ตของฉัน ช่วยทำให้มีประโยชน์") },
        right: { title: "with-format.txt", text: b("Turn these notes into a table with columns: task, owner, due date.", "แปลงโน้ตเป็นตาราง คอลัมน์: งาน ผู้รับผิดชอบ กำหนดส่ง") },
        caption: b("A named format gives a result you can paste straight in.", "ระบุรูปแบบแล้วได้ผลที่วางใช้ได้เลย") },
      { layout: "checklist", eyebrow: "what to say", title: "What To Say About Format", titleTh: "บอกอะไรเรื่องรูปแบบ",
        items: [
          b("The type: email, list or table", "ประเภท: อีเมล รายการ หรือตาราง"), b("The columns or sections", "คอลัมน์หรือหัวข้อ"), b("The length: words, rows, lines", "ความยาว: คำ แถว บรรทัด"), b("The reader and the tone", "ผู้อ่านและโทน"),
        ],
        tip: { title: "Tip", body: b("Paste the notes once. Ask for every format in one go.", "วางโน้ตครั้งเดียว ขอทุกรูปแบบพร้อมกัน") } },
      { layout: "numbers", eyebrow: "one source", title: "One Source, Three Outputs", titleTh: "ต้นทางเดียว ได้สามผลลัพธ์",
        stats: [
          { value: "1", label: b("prompt to write", "พรอมป์ที่ต้องเขียน"), tone: "accent" },
          { value: "3", label: b("results at once", "ผลลัพธ์พร้อมกัน"), tone: "success" },
          { value: "0", label: b("times you retype the notes", "ครั้งที่ต้องพิมพ์โน้ตใหม่"), tone: "context" },
        ],
        bar: b("Save the prompt. Next week you only swap the notes.", "บันทึกพรอมป์ สัปดาห์หน้าเปลี่ยนแค่โน้ต") },
    ],
    demo: {
      eyebrow: "wow moment", title: "Watch: One Set Of Notes, Three Files", titleTh: "ดูสด: โน้ตชุดเดียว สามไฟล์", windowTitle: "live demo: notes to files",
      steps: [b("Paste five lines of practice notes.", "วางโน้ตตัวอย่างห้าบรรทัด"), b("Ask: a spreadsheet, a short doc and one slide.", "สั่ง: สเปรดชีต เอกสารสั้น และสไลด์หนึ่งหน้า"), b("Open each file. Fix one thing in each.", "เปิดแต่ละไฟล์ แก้อย่างละหนึ่งจุด")],
      watch: { title: "Watch for", bullets: [b("Real files you can download", "ไฟล์จริงที่ดาวน์โหลดได้"), b("Where formulas or names slip", "จุดที่สูตรหรือชื่อพลาด"), b("Time it takes by hand", "เวลาที่ใช้ถ้าทำเอง")] },
    },
    safety: {
      eyebrow: "check the output", title: "Check The Output", titleTh: "ตรวจผลลัพธ์ก่อนใช้",
      donts: [b("Send a file you never opened", "ส่งไฟล์ที่ไม่ได้เปิดดู"), b("Trust formulas you didn't test", "เชื่อสูตรที่ไม่ได้ทดสอบ"), b("Upload real payroll or guest lists", "อัปโหลดเงินเดือนหรือรายชื่อแขกจริง")],
      dos: [b("Open every file before sharing", "เปิดทุกไฟล์ก่อนแชร์"), b("Spot-check two numbers by hand", "ตรวจตัวเลขสองจุดด้วยมือ"), b("Use invented sample data", "ใช้ข้อมูลสมมติ")],
      bar: "A file that looks neat can still be wrong.",
    },
    game: {
      title: "Game: Format Race", titleTh: "เกม: Format Race",
      rules: [b("Four quick questions: which prompt gets the format?", "สี่ข้อเร็ว ๆ: พรอมป์ไหนได้รูปแบบที่ต้องการ"), b("Then write one prompt for three formats.", "จากนั้นเขียนพรอมป์เดียวให้ได้สามรูปแบบ"), b("The room votes for the clearest prompt.", "ห้องโหวตพรอมป์ที่ชัดที่สุด")],
      scoring: b("100 per quiz answer; votes decide the battle", "ควิซละ 100 คะแนน พรอมป์ตัดสินด้วยการโหวต"),
    },
    challenge: {
      titleEn: "Notes to three formats", titleTh: "จากโน้ตเป็นสามรูปแบบ",
      scenarioEn: "After a meeting you have five lines of notes: set the date, book the room, send the menu, tell the team, confirm the budget.", scenarioTh: "หลังประชุมคุณมีโน้ตห้าบรรทัด: ตกลงวัน จองห้อง ส่งเมนู แจ้งทีม ยืนยันงบ",
      taskEn: "Write one prompt that turns the notes into an email to the team, a checklist and a small table. Use invented names only.", taskTh: "เขียนพรอมป์เดียวให้ AI สร้างอีเมลถึงทีม เช็กลิสต์ และตารางเล็ก ใช้ชื่อสมมติเท่านั้น",
    },
    games: [quiz("format-race", b("Format Race", "Format Race"), [
      { text: b("You want a table of three options with price and pros. Which ask works best?", "ต้องการตารางสามตัวเลือกพร้อมราคาและข้อดี ข้อไหนดีที่สุด"), options: [opt("Tell me about the options", "เล่าเรื่องตัวเลือกให้ฟัง"), opt("Compare them in a table: option, price, pros", "เทียบเป็นตาราง: ตัวเลือก ราคา ข้อดี"), opt("Make it nice", "ทำให้ดู ๆ")], correct: 1 },
      { text: b("You need steps you can tick off. What do you ask for?", "ต้องการขั้นตอนที่ติ๊กได้ ควรขออะไร"), options: [opt("A checklist, one action per line", "เช็กลิสต์ หนึ่งบรรทัดหนึ่งการกระทำ"), opt("A long story", "เรื่องเล่ายาว ๆ"), opt("A poem", "บทกวี")], correct: 0 },
      { text: b("You want an email ready to send. What should the prompt include?", "ต้องการอีเมลพร้อมส่ง พรอมป์ควรมีอะไร"), options: [opt("Reader, purpose, tone and length", "ผู้รับ จุดประสงค์ โทน ความยาว"), opt("Only the word email", "คำว่าอีเมลคำเดียว"), opt("Nothing, AI will guess", "ไม่ต้องบอก AI เดาเอง")], correct: 0 },
      { text: b("Same notes, three formats. Smartest move?", "โน้ตเดียวกัน สามรูปแบบ วิธีไหนฉลาดที่สุด"), options: [opt("Paste once, ask for all three", "วางครั้งเดียว ขอทั้งสามรูปแบบ"), opt("Retype the notes three times", "พิมพ์โน้ตซ้ำสามรอบ"), opt("Ask for one and hope", "ขออย่างเดียวแล้วหวังว่าจะดี")], correct: 0 },
    ])],
    takeHome: {
      cards: [
        { title: "Pick a report", body: b("Choose a weekly update you write by hand.", "เลือกรายงานที่คุณเขียนเองทุกสัปดาห์") },
        { title: "Name the format", body: b("Paste practice notes and say the format you want.", "วางโน้ตตัวอย่างและระบุรูปแบบ") },
        { title: "Save the prompt", body: b("Keep it. Next week only the notes change.", "บันทึกพรอมป์ สัปดาห์หน้าเปลี่ยนแค่โน้ต") },
      ],
      next: b("Next week: Plan Anything with AI.", "สัปดาห์หน้า: วางแผนอะไรก็ได้กับ AI"),
    },
    planNotes: "Week 06 of 12. Goal: ask for the right format and get several outputs from one source. Run order: check-in, concepts, file demo, safety, Format Race quiz, live challenge, battle, results, take-home. About 55 minutes. This is a good week for a mid-course recap and leaderboard. " + SAFE.en,
    notes: {
      opener: "สัปดาห์กลางคอร์ส เปิดด้วยการทบทวนสั้น ๆ ว่าเรียนอะไรมาแล้วห้าสัปดาห์",
      checkIn: "ให้เล่าการตัดสินใจที่ใช้ AI เป็นคู่คิด และเหตุผลที่เลือก",
      demo: "เตรียมโน้ตตัวอย่างห้าบรรทัด ขอไฟล์สเปรดชีต เอกสาร และสไลด์ เปิดแต่ละไฟล์ให้ห้องดูและแก้หนึ่งจุด ถ้าเครื่องมือของคุณไม่สร้างไฟล์ได้ ใช้ตารางและอีเมลในแชตแทน",
      safety: "ไฟล์ที่ดูเรียบร้อยอาจผิดได้ ต้องเปิดตรวจทุกครั้ง",
      game: "เล่นควิซ Format Race ก่อน แล้วไปสไลด์ AI feedback และโจทย์สด",
      takeHome: "ให้เลือกรายงานที่จะทำเป็นพรอมป์บันทึกไว้",
    },
  },

  // ------------------------------------------------------------------ week 7
  {
    number: 7, title: "Plan Anything with AI", category: "Everyday AI", durationMin: 55,
    outcome: b("Turn a goal into a timeline, a task list and a prep checklist.", "เปลี่ยนเป้าหมายเป็นไทม์ไลน์ รายการงาน และเช็กลิสต์เตรียมงาน"),
    lines: ["learn: plan with AI", "play: Planning Mission", "wow: an app built live", "time: 55 minutes"],
    wow: b("AI builds a tiny planner app while we watch", "AI สร้างแอปวางแผนเล็ก ๆ ให้ดูสด"),
    checkIn: b("Which report did you turn into a saved prompt, and how long did it take?", "รายงานไหนที่คุณทำเป็นพรอมป์ที่บันทึกไว้ และใช้เวลาเท่าไร?"),
    concepts: [
      { layout: "statement", eyebrow: "the big idea", big: b("A goal without a date is just a wish.", "เป้าหมายที่ไม่มีวันที่ ก็แค่ความฝัน"), sub: b("Give AI the goal, the deadline and who helps.", "บอก AI เป้าหมาย เส้นตาย และคนที่ช่วย"), notes: "ถามห้องว่ามีเป้าหมายอะไรที่ค้างอยู่เพราะไม่เคยตั้งวัน" },
      { layout: "timeline", eyebrow: "five parts", title: "A Plan In Five Parts", titleTh: "แผนห้าส่วน",
        steps: [
          { label: "Goal", body: b("What done looks like.", "ผลสำเร็จหน้าตาเป็นอย่างไร") }, { label: "Deadline", body: b("The date it must be ready.", "วันที่ต้องพร้อม") },
          { label: "People", body: b("Who does what.", "ใครทำอะไร") }, { label: "Tasks", body: b("Steps in order.", "ขั้นตอนตามลำดับ") }, { label: "Risks", body: b("What could slip.", "อะไรอาจพลาด") },
        ],
        bar: "Ask for all five parts and get a first draft in seconds." },
      { layout: "cards", eyebrow: "what AI drafts", title: "Plans AI Can Draft", titleTh: "แผนที่ AI ร่างให้ได้",
        cards: [
          { title: "Timeline", body: b("Dates working back from the deadline.", "วันที่ไล่ย้อนจากเส้นตาย"), tone: "context" },
          { title: "Task list", body: b("Who does what, in order.", "ใครทำอะไร ตามลำดับ"), tone: "goal" },
          { title: "Prep checklist", body: b("What to bring, book and confirm.", "สิ่งที่ต้องเตรียม จอง ยืนยัน"), tone: "audience" },
        ],
        bar: b("Always give the real deadline. AI does not know it.", "ใส่เส้นตายจริงเสมอ AI ไม่รู้") },
      { layout: "compare", eyebrow: "before and after", title: "Wish vs Plan", titleTh: "ความฝันกับแผน",
        left: { title: "wish.txt", text: b("Plan a team lunch.", "วางแผนปาร์ตี้ทีม") },
        right: { title: "plan.txt", text: b("Plan a lunch for 12 next Friday. Give a timeline, shopping list and who does what.", "วางแผนมื้อกลางวัน 12 คนวันศุกร์หน้า ขอไทม์ไลน์ รายการซื้อ และใครทำอะไร") },
        caption: b("More facts in, a plan you can actually use out.", "ข้อมูลยิ่งครบ ได้แผนที่ใช้จริงได้") },
    ],
    demo: {
      eyebrow: "wow moment", title: "Watch: AI Builds A Planner", titleTh: "ดูสด: AI สร้างแอปวางแผน", windowTitle: "live demo: a tiny planner app",
      steps: [b("Ask: make a checklist app for our team lunch.", "สั่ง: ทำแอปเช็กลิสต์สำหรับมื้อกลางวันทีม"), b("Open it on a phone and tick two items.", "เปิดบนมือถือแล้วติ๊กสองข้อ"), b("Ask for one change: add who is responsible.", "ขอแก้หนึ่งอย่าง: เพิ่มช่องผู้รับผิดชอบ")],
      watch: { title: "Watch for", bullets: [b("How fast it appears", "ใช้เวลาไม่นาน"), b("The change you can ask for", "สิ่งที่ขอแก้ได้"), b("What it cannot know", "สิ่งที่มันไม่รู้")] },
    },
    safety: {
      eyebrow: "real facts", title: "Plans Need Real Facts", titleTh: "แผนต้องใช้ข้อเท็จจริง",
      donts: [b("Let AI invent venues or prices", "ให้ AI แต่งสถานที่หรือราคา"), b("Skip the backup plan", "ข้ามแผนสำรอง"), b("Share staff phone numbers", "แชร์เบอร์โทรพนักงาน")],
      dos: [b("Add real dates and budget yourself", "ใส่วันที่และงบจริงเอง"), b("Ask what could slip", "ถามว่าอะไรอาจพลาด"), b("Confirm bookings by hand", "ยืนยันการจองด้วยตัวเอง")],
      bar: "AI makes the draft. You confirm the facts.",
    },
    game: {
      title: "Game: Planning Mission", titleTh: "เกม: Planning Mission",
      rules: [b("Type the first three steps, in order.", "พิมพ์สามขั้นตอนแรกตามลำดับ"), b("We read them out, no names.", "เราอ่านออกเสียงโดยไม่บอกชื่อ"), b("Then a battle: the best planning prompt wins.", "จากนั้นแบทเทิล: พรอมป์วางแผนที่ดีที่สุดชนะ")],
      scoring: b("votes decide the battle", "ผลโหวตตัดสินแบทเทิล"),
    },
    challenge: {
      titleEn: "Plan a team lunch", titleTh: "วางแผนมื้อกลางวันทีม",
      scenarioEn: "Your team of 12 has a lunch next Friday. Two people do not eat meat and one has a nut allergy.", scenarioTh: "ทีม 12 คนมีมื้อกลางวันวันศุกร์หน้า สองคนไม่กินเนื้อและหนึ่งคนแพ้ถั่ว",
      taskEn: "Write a prompt for a one-page plan: timeline, shopping list and who does what. Do not invent a venue or a price.", taskTh: "เขียนพรอมป์ขอแผนหนึ่งหน้า: ไทม์ไลน์ รายการซื้อ ใครทำอะไร ห้ามแต่งสถานที่หรือราคา",
    },
    games: [
      { id: "plan-steps", kind: "open", title: b("First three steps", "สามขั้นตอนแรก"), questions: [{ text: b("Type the first three steps of your plan, in order. No names.", "พิมพ์สามขั้นตอนแรกของแผน ตามลำดับ ไม่ใส่ชื่อ"), options: [] }] },
      { id: "plan-weak", kind: "poll", title: b("What do we forget?", "เรามักลืมอะไร"), questions: [{ text: b("Which part of a plan do you forget most?", "ส่วนไหนของแผนที่คุณลืมบ่อยที่สุด"), options: [opt("Who does what", "ใครทำอะไร"), opt("Deadlines", "เส้นตาย"), opt("Materials list", "รายการของที่ต้องใช้"), opt("Backup plan", "แผนสำรอง")] }] },
    ],
    takeHome: {
      cards: [
        { title: "Pick a goal", body: b("Choose one small goal for the next two weeks.", "เลือกเป้าหมายเล็ก ๆ สำหรับสองสัปดาห์") },
        { title: "Ask for the plan", body: b("Give the goal, the deadline and your helpers.", "บอกเป้าหมาย เส้นตาย และผู้ช่วย") },
        { title: "Do step one today", body: b("Start the first task before you close the page.", "เริ่มงานแรกวันนี้เลย") },
      ],
      next: b("Next week: AI as Your Second Pair of Eyes.", "สัปดาห์หน้า: AI เป็นดวงตาคู่ที่สอง"),
    },
    planNotes: "Week 07 of 12. Goal: turn a goal into a plan with dates, owners and risks. Run order: check-in, concepts, app demo, safety, plan-steps and poll in the Game Hub, live challenge, battle, results, take-home. About 55 minutes. " + SAFE.en,
    notes: {
      opener: "วันนี้เปลี่ยนเป้าหมายให้เป็นแผนที่มีวันที่และชื่อคนรับผิดชอบ",
      checkIn: "ถามว่าใครบันทึกพรอมป์รายงานไว้แล้ว ใช้เวลากี่นาที",
      demo: "ขอให้ AI สร้างแอปเช็กลิสต์เล็ก ๆ เปิดบนมือถือของคุณให้ห้องดู ขอแก้หนึ่งอย่างสด ถ้าเครื่องมือสร้างแอปไม่ได้ ให้สร้างตารางแผนแทน",
      safety: "แผนที่ AI ร่างอาจมีสถานที่หรือราคาที่แต่งขึ้น ต้องใส่ข้อเท็จจริงจริงเอง",
      game: "เปิดเกมพิมพ์สามขั้นตอนก่อน แล้วโพล แล้วไปสไลด์โจทย์สดและแบทเทิล",
      takeHome: "ให้ตั้งเป้าหมายเล็กหนึ่งอย่างแล้วทำขั้นแรกวันนี้",
    },
  },
];
