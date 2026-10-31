import type { GameDef } from "./games";
import type { WeekSpec } from "./curriculum";

const b = (en: string, th: string) => ({ en, th });
const opt = b;
const SAFE = "Practice data only. Invented names, no real guests or colleagues.";

const quiz = (id: string, title: ReturnType<typeof b>, questions: GameDef["questions"]): GameDef => ({ id, kind: "quiz", title, questions });
const factOrFiction = (en: string, th: string, fact: boolean): GameDef["questions"][number] =>
  ({ text: b(en, th), options: [opt("Fact", "จริง"), opt("Fiction", "เท็จ")], correct: fact ? 0 : 1 });

/** Weeks 8 to 12 of the 12-week course. */
export const WEEKS_B: WeekSpec[] = [
  // ------------------------------------------------------------------ week 8
  {
    number: 8, title: "AI as Your Second Pair of Eyes", category: "Everyday AI", durationMin: 50,
    outcome: b("Use AI to proofread and find what is missing, then check the AI too.", "ใช้ AI ตรวจข้อความและหาสิ่งที่ตกหล่น แล้วตรวจ AI อีกที"),
    lines: ["learn: review and proofread", "play: Spot the Mistake", "wow: what did I forget?", "time: 50 minutes"],
    wow: b("paste a draft and AI lists what it forgot", "วางร่างแล้ว AI บอกสิ่งที่ลืม"),
    checkIn: b("What plan did you ask AI to draft, and which step did you start first?", "แผนที่คุณให้ AI ร่างคืออะไร และคุณเริ่มขั้นไหนก่อน?"),
    concepts: [
      { layout: "statement", eyebrow: "the big idea", big: b("A good reviewer sees what you stopped seeing.", "ผู้ตรวจที่ดีเห็นสิ่งที่เราเลิกมองเห็นแล้ว"), sub: b("AI is fast and patient. You know the facts.", "AI เร็วและใจเย็น คุณรู้ข้อเท็จจริง"), notes: "ถามห้องว่าเคยส่งข้อความที่มีคำผิดโดยไม่รู้ตัวไหม" },
      { layout: "cards", eyebrow: "three jobs", title: "Three Jobs For A Reviewer", titleTh: "งานสามอย่างของผู้ตรวจ",
        cards: [
          { title: "Proofread", body: b("Spelling, grammar and tone slips.", "คำผิด ไวยากรณ์ และโทนที่พลาด"), tone: "context" },
          { title: "Find gaps", body: b("What the message forgot to say.", "สิ่งที่ข้อความลืมบอก"), tone: "goal" },
          { title: "Check logic", body: b("Dates, totals and promises that clash.", "วันที่ ผลรวม คำสัญญาที่ขัดกัน"), tone: "constraints" },
        ],
        bar: b("Say which job you want. 'Review this' is too vague.", "บอกว่าต้องการงานไหน 'ตรวจนี่ให้หน่อย' กว้างเกินไป") },
      { layout: "compare", eyebrow: "before and after", title: "Vague Review vs Line By Line", titleTh: "ตรวจกว้าง ๆ กับตรวจทีละบรรทัด",
        left: { title: "vague.txt", text: b("Is this good?", "อันนี้ดีไหม") },
        right: { title: "line-by-line.txt", text: b("List what is missing, wrong or unclear, line by line.", "บอกสิ่งที่ขาด ผิด หรือไม่ชัด ทีละบรรทัด") },
        caption: b("Ask for problems. 'Is it good?' only gets praise.", "ขอให้บอกปัญหา ถามว่าดีไหมจะได้แต่คำชม") },
    ],
    demo: {
      eyebrow: "wow moment", title: "Watch: What Did I Forget?", titleTh: "ดูสด: ฉันลืมอะไร", windowTitle: "live demo: review a draft",
      steps: [b("Paste a short practice announcement.", "วางประกาศตัวอย่างสั้น ๆ"), b("Ask: list what is missing, wrong or unclear.", "สั่ง: บอกสิ่งที่ขาด ผิด หรือไม่ชัด"), b("Accept two fixes, reject one, say why.", "รับสองข้อ ปฏิเสธหนึ่งข้อ พร้อมเหตุผล")],
      watch: { title: "Watch for", bullets: [b("Things you stopped seeing", "สิ่งที่เรามองไม่เห็นแล้ว"), b("Advice you should ignore", "คำแนะนำที่ควรปฏิเสธ"), b("Mistakes the AI added", "ข้อผิดที่ AI เพิ่มเอง")] },
    },
    safety: {
      eyebrow: "ai makes mistakes", title: "AI Makes Mistakes Too", titleTh: "AI ก็ผิดได้",
      donts: [b("Trust a source you didn't open", "เชื่อแหล่งที่ไม่ได้เปิดดู"), b("Accept every suggested change", "รับทุกคำแนะนำโดยไม่คิด"), b("Review real guest complaints", "ตรวจข้อร้องเรียนจริงของแขก")],
      dos: [b("Ask for line-by-line feedback", "ขอฟีดแบ็กทีละบรรทัด"), b("Verify numbers by hand", "ตรวจตัวเลขด้วยมือ"), b("Keep the final say", "คุณเป็นคนตัดสินสุดท้าย")],
      bar: "The reviewer needs a reviewer.",
    },
    game: {
      title: "Game: Spot the Mistake", titleTh: "เกม: Spot the Mistake",
      rules: [b("An AI answer appears on the screen.", "คำตอบของ AI จะขึ้นบนจอ"), b("Tap the line that has the mistake.", "แตะบรรทัดที่ผิด"), b("Is it a number, a clash or an invention?", "ผิดแบบไหน ตัวเลข ขัดกัน หรือแต่งขึ้น")],
      scoring: b("100 per correct answer", "ตอบถูกได้ข้อละ 100 คะแนน"),
    },
    gameSlides: [
      { eyebrow: "ai answer 1", title: "AI Answer 1", titleTh: "คำตอบ AI 1", windowTitle: "ai_answer_1.txt",
        lines: ["Line 1: The workshop is on Thursday.", "Line 2: Guests arrive at 9:00. We start at 9:30.", "Line 3: Please join us for the Friday workshop.", "Line 4: Lunch is included for everyone."],
        hint: { title: "Which line?", bullets: [b("Read all four lines first", "อ่านครบทั้งสี่บรรทัดก่อน"), b("Does any line clash?", "มีบรรทัดไหนขัดกันไหม")] } },
      { eyebrow: "ai answer 2", title: "AI Answer 2", titleTh: "คำตอบ AI 2", windowTitle: "ai_answer_2.txt",
        lines: ["Line 1: 12 guests x 150 baht = 1,800 baht.", "Line 2: Service charge 10% = 180 baht.", "Line 3: Total = 2,080 baht.", "Line 4: Payment is due on arrival."],
        hint: { title: "Which line?", bullets: [b("Do the sums yourself", "คำนวณเองด้วย"), b("Add line 1 and line 2", "บวกบรรทัด 1 กับ 2")] } },
      { eyebrow: "ai answer 3", title: "AI Answer 3", titleTh: "คำตอบ AI 3", windowTitle: "ai_answer_3.txt",
        lines: ["We gave the AI one rule only:", "'Refunds take 7 days, through the front desk.'", "", "Line 1: Refunds are processed within 7 days.", "Line 2: See section 9.4 of the Guest Policy Handbook.", "Line 3: Contact the front desk to start a refund.", "Line 4: Refunds return to the original payment method."],
        hint: { title: "Which line?", bullets: [b("Which line did we never give?", "บรรทัดไหนที่เราไม่เคยให้"), b("Could the source be invented?", "แหล่งอ้างอิงอาจถูกแต่งไหม")] } },
    ],
    games: [quiz("spot-the-mistake", b("Spot the Mistake", "จับผิดคำตอบ AI"), [
      { text: b("AI Answer 1: which line clashes with the others?", "คำตอบ AI 1: บรรทัดไหนขัดกับบรรทัดอื่น"), options: [opt("Line 1", "บรรทัด 1"), opt("Line 2", "บรรทัด 2"), opt("Line 3", "บรรทัด 3"), opt("Line 4", "บรรทัด 4")], correct: 2 },
      { text: b("AI Answer 2: which line has the wrong number?", "คำตอบ AI 2: บรรทัดไหนตัวเลขผิด"), options: [opt("Line 1", "บรรทัด 1"), opt("Line 2", "บรรทัด 2"), opt("Line 3", "บรรทัด 3"), opt("Line 4", "บรรทัด 4")], correct: 2 },
      { text: b("AI Answer 3: which line invents something we never gave the AI?", "คำตอบ AI 3: บรรทัดไหนแต่งสิ่งที่เราไม่เคยให้ AI"), options: [opt("Line 1", "บรรทัด 1"), opt("Line 2", "บรรทัด 2"), opt("Line 3", "บรรทัด 3"), opt("Line 4", "บรรทัด 4")], correct: 1 },
      { text: b("AI cites 'Hotel Policy 2025'. What do you do first?", "AI อ้าง 'Hotel Policy 2025' คุณควรทำอะไรก่อน"), options: [opt("Trust it", "เชื่อเลย"), opt("Open the source and check", "เปิดแหล่งที่มาตรวจ"), opt("Ask the AI to repeat it", "ให้ AI พูดซ้ำ")], correct: 1 },
      { text: b("Which prompt reviews your own draft best?", "พรอมป์ไหนตรวจร่างของคุณได้ดีที่สุด"), options: [opt("Is this good?", "อันนี้ดีไหม"), opt("List what is missing, wrong or unclear, line by line", "บอกสิ่งที่ขาด ผิด ไม่ชัด ทีละบรรทัด"), opt("Make it longer", "ทำให้ยาวขึ้น")], correct: 1 },
    ])],
    takeHome: {
      cards: [
        { title: "Pick a draft", body: b("Choose a message or report you wrote yourself.", "เลือกข้อความหรือรายงานที่คุณเขียนเอง") },
        { title: "Ask for a review", body: b("List what is missing, wrong or unclear.", "ขอให้บอกสิ่งที่ขาด ผิด หรือไม่ชัด") },
        { title: "Fix and check", body: b("Accept what helps, then verify every number.", "รับสิ่งที่ช่วย แล้วตรวจทุกตัวเลข") },
      ],
      next: b("Next week: Create Better Visuals.", "สัปดาห์หน้า: สร้างภาพให้ดีขึ้น"),
    },
    planNotes: "Week 08 of 12. Goal: use AI to review drafts and learn to catch the AI's own mistakes. Run order: check-in, concepts, review demo, safety, Spot the Mistake (AI answers on the slides, questions in the Game Hub), take-home. About 50 minutes. " + SAFE,
    notes: {
      opener: "วันนี้ให้ AI เป็นดวงตาคู่ที่สอง แล้วเราก็ต้องเป็นดวงตาคู่ที่สองของ AI ด้วย",
      checkIn: "ถามว่าแผนที่ให้ AI ร่างสัปดาห์ก่อนมีขั้นไหนที่ต้องแก้ข้อเท็จจริง",
      demo: "วางประกาศตัวอย่างที่มีจุดหลุด ขอให้ AI ลิสต์สิ่งที่ขาด ผิด หรือไม่ชัด ให้ห้องช่วยเลือกว่าจะรับข้อไหน",
      safety: "ย้ำว่าผู้ตรวจก็ผิดได้ ต้องมีคนตรวจผู้ตรวจ",
      game: "เล่นสไลด์เกมให้ครบสามคำตอบ AI แล้วเปิดเกม Spot the Mistake ค้างสไลด์คำตอบไว้ระหว่างตอบ",
      takeHome: "ให้เลือกร่างของตัวเองหนึ่งฉบับไว้ให้ AI ตรวจ",
    },
  },

  // ------------------------------------------------------------------ week 9
  {
    number: 9, title: "Create Better Visuals", category: "Everyday AI", durationMin: 55,
    outcome: b("Write prompts for posters and visuals that look the way you imagine.", "เขียนพรอมป์สร้างภาพหรือสื่อประกอบงานให้ได้ตามที่คิด"),
    lines: ["learn: describe a visual", "play: Poster Prompt Duel", "wow: prompt to poster", "time: 55 minutes"],
    wow: b("an image tool turns our prompt into a poster", "เครื่องมือสร้างภาพเปลี่ยนพรอมป์เป็นโปสเตอร์"),
    checkIn: b("What draft did you review with AI, and what did you change?", "ร่างที่คุณให้ AI ตรวจคืออะไร และคุณแก้อะไร?"),
    concepts: [
      { layout: "cards", eyebrow: "four parts", title: "Describe A Visual In Four Parts", titleTh: "บรรยายภาพสี่ส่วน",
        cards: [
          { title: "Subject", body: b("What is in the picture.", "ในภาพมีอะไร"), tone: "context" },
          { title: "Style", body: b("Photo, flat, watercolour, pixel.", "ภาพถ่าย ภาพแบน สีน้ำ พิกเซล"), tone: "goal" },
          { title: "Colours", body: b("Two or three, by name.", "สองถึงสามสี ระบุชื่อ"), tone: "audience" },
          { title: "Layout", body: b("Where the words and space go.", "ข้อความและที่ว่างอยู่ตรงไหน"), tone: "format" },
        ],
        bar: b("A picture is only as clear as the words you give it.", "ภาพจะชัดเท่าคำที่คุณให้") },
      { layout: "compare", eyebrow: "before and after", title: "Vague vs Precise", titleTh: "กว้างกับแม่นยำ",
        left: { title: "vague.txt", text: b("A poster for our coffee morning.", "โปสเตอร์งานกาแฟยามเช้า") },
        right: { title: "precise.txt", text: b("Flat art, steaming cup, orange and cream. Title 'Coffee Morning' on top, space for a date.", "ภาพแบน แก้วกาแฟมีควัน สีส้มครีม ชื่อ 'Coffee Morning' ด้านบน เว้นที่ใส่วันที่") },
        caption: b("Details remove the guesswork and the retries.", "รายละเอียดช่วยลดการเดาและการลองซ้ำ") },
      { layout: "checklist", eyebrow: "helpful words", title: "Words That Help A Picture", titleTh: "คำที่ช่วยให้ภาพตรงใจ",
        items: [
          b("Style: flat, photo, watercolour", "สไตล์: ภาพแบน ภาพถ่าย สีน้ำ"), b("Mood: calm, bold, playful", "อารมณ์: สงบ เด็ดขาด สนุก"), b("Colours: name two or three", "สี: ระบุสองถึงสามสี"), b("Text: write the exact words", "ข้อความ: เขียนคำให้ตรงตัว"), b("Size: poster, square, banner", "ขนาด: โปสเตอร์ สี่เหลี่ยม แบนเนอร์"),
        ],
        tip: { title: "Tip", body: b("AI often misspells words in images. Add text by hand later.", "AI มักสะกดคำในภาพผิด ใส่ข้อความเองทีหลัง") } },
      { layout: "statement", eyebrow: "the big idea", big: b("Use AI for the first draft of a picture, not the last.", "ให้ AI ร่างภาพแรก ไม่ใช่ภาพสุดท้าย"), sub: b("Check brand colours, spelling, faces and rights.", "ตรวจสีแบรนด์ ตัวสะกด ใบหน้า และลิขสิทธิ์"), notes: "ย้ำว่าภาพสุดท้ายต้องผ่านการตรวจโดยคน" },
    ],
    demo: {
      eyebrow: "wow moment", title: "Watch: From Prompt To Poster", titleTh: "ดูสด: จากพรอมป์เป็นโปสเตอร์", windowTitle: "live demo: image tool",
      steps: [b("Write a four-part prompt for a poster.", "เขียนพรอมป์สี่ส่วนสำหรับโปสเตอร์"), b("Generate it, then change only the colours.", "สร้างภาพ แล้วเปลี่ยนแค่สี"), b("Ask Claude to improve the prompt and retry.", "ให้ Claude ช่วยปรับพรอมป์ แล้วลองใหม่")],
      watch: { title: "Watch for", bullets: [b("Which words changed the picture", "คำไหนเปลี่ยนภาพ"), b("Misspelled text in the image", "ตัวอักษรในภาพที่สะกดผิด"), b("How many tries it took", "ลองกี่รอบ")] },
    },
    safety: {
      eyebrow: "visuals have rules", title: "Visuals Have Rules Too", titleTh: "ภาพก็มีกติกา",
      donts: [b("Copy a real person's face or style", "เลียนแบบใบหน้าหรือสไตล์คนจริง"), b("Use logos you do not own", "ใช้โลโก้ที่ไม่ใช่ของเรา"), b("Post it without a check", "โพสต์โดยไม่ตรวจ")],
      dos: [b("Say it was made with AI if asked", "บอกว่าสร้างด้วย AI เมื่อถูกถาม"), b("Check spelling and brand colours", "ตรวจตัวสะกดและสีแบรนด์"), b("Follow your company's image rules", "ทำตามกฎการใช้ภาพของบริษัท")],
      bar: "If it shows a person or a logo, check the rules first.",
    },
    game: {
      title: "Game: Poster Prompt Duel", titleTh: "เกม: Poster Prompt Duel",
      rules: [b("Four duels: pick the stronger prompt.", "สี่ดวล: เลือกพรอมป์ที่แรงกว่า"), b("Then write your own poster prompt.", "จากนั้นเขียนพรอมป์โปสเตอร์ของคุณเอง"), b("The room votes for the one they would use.", "ห้องโหวตอันที่อยากใช้จริง")],
      scoring: b("100 per duel; votes decide the battle", "ดวลละ 100 คะแนน แบทเทิลตัดสินด้วยโหวต"),
    },
    challenge: {
      titleEn: "Coffee morning poster", titleTh: "โปสเตอร์งานกาแฟยามเช้า",
      scenarioEn: "Your office is holding a coffee morning next week and needs a poster.", scenarioTh: "ออฟฟิศจัดงานกาแฟยามเช้าสัปดาห์หน้าและต้องการโปสเตอร์",
      taskEn: "Write a prompt for an image tool. Include the subject, style, colours, the exact words and the size.", taskTh: "เขียนพรอมป์สำหรับเครื่องมือสร้างภาพ ระบุหัวเรื่อง สไตล์ สี ข้อความที่ต้องการ และขนาด",
    },
    games: [quiz("poster-duel", b("Poster Prompt Duel", "ดวลพรอมป์โปสเตอร์"), [
      { text: b("Which prompt gives a clearer poster?", "พรอมป์ไหนได้โปสเตอร์ที่ชัดกว่า"), options: [opt("A poster for a party", "โปสเตอร์งานปาร์ตี้"), opt("Flat art, cake, pink and gold, title 'Party' on top", "ภาพแบน เค้ก ชมพูทอง ชื่อ 'Party' ด้านบน")], correct: 1 },
      { text: b("Which prompt gives a clearer logo?", "พรอมป์ไหนได้โลโก้ที่ชัดกว่า"), options: [opt("A logo for a cafe", "โลโก้สำหรับคาเฟ่"), opt("Simple logo: coffee bean, dark green, white background", "โลโก้เรียบ: เมล็ดกาแฟ สีเขียวเข้ม พื้นขาว")], correct: 1 },
      { text: b("Which prompt gives a calmer picture?", "พรอมป์ไหนได้ภาพที่สงบกว่า"), options: [opt("Make it look nice", "ทำให้ดูดี"), opt("Watercolour hills, soft blue, calm mood, wide banner", "สีน้ำภูเขา ฟ้าอ่อน อารมณ์สงบ แบนเนอร์กว้าง")], correct: 1 },
      { text: b("'Bold style, red and black, title SALE'. What is still missing?", "'สไตล์เด็ดขาด แดงดำ ชื่อ SALE' ยังขาดอะไร"), options: [opt("The size or shape", "ขนาดหรือรูปทรง"), opt("The title", "ชื่อเรื่อง"), opt("The colours", "สี")], correct: 0 },
    ])],
    takeHome: {
      cards: [
        { title: "Pick a visual", body: b("Choose a poster, slide or banner you need soon.", "เลือกโปสเตอร์ สไลด์ หรือแบนเนอร์ที่ต้องใช้เร็ว ๆ นี้") },
        { title: "Write four parts", body: b("Subject, style, colours, layout. Then try it.", "หัวเรื่อง สไตล์ สี เลย์เอาต์ แล้วลองดู") },
        { title: "Fix text by hand", body: b("Add exact words and logos yourself.", "ใส่ข้อความและโลโก้เอง") },
      ],
      next: b("Next week: Can You Trust AI?", "สัปดาห์หน้า: เชื่อ AI ได้แค่ไหน"),
    },
    planNotes: "Week 09 of 12. Goal: describe a visual clearly. The web app cannot generate images live, so the presenter demonstrates with an image tool and the room votes on written prompts. Run order: check-in, concepts, image demo, safety, Poster Prompt Duel quiz, live challenge, battle, results, take-home. About 55 minutes. " + SAFE,
    notes: {
      opener: "วันนี้เขียนพรอมป์ให้ภาพ ห้องจะโหวตที่ตัวพรอมป์ ไม่ต้องสร้างภาพสดในเว็บ",
      checkIn: "ให้เล่าว่าตรวจร่างด้วย AI แล้วแก้อะไรและปฏิเสธคำแนะนำอะไร",
      demo: "ใช้เครื่องมือสร้างภาพที่คุณมี (เช่น ChatGPT) สร้างโปสเตอร์ แล้วให้ Claude ช่วยปรับพรอมป์ ให้ห้องดูว่าคำไหนเปลี่ยนภาพ เตรียมภาพสำรองไว้ในกรณีเครื่องมือช้า",
      safety: "ย้ำเรื่องใบหน้า โลโก้ และการบอกว่าสร้างด้วย AI",
      game: "เล่นควิซดวลพรอมป์ก่อน แล้วไปสไลด์ AI feedback และโจทย์สด",
      takeHome: "ให้เลือกสื่อที่ต้องใช้จริงหนึ่งชิ้น",
    },
  },

  // ----------------------------------------------------------------- week 10
  {
    number: 10, title: "Can You Trust AI?", category: "Everyday AI", durationMin: 50,
    outcome: b("Check AI answers and know when not to trust them straight away.", "ตรวจสอบคำตอบ AI และรู้ว่าเมื่อไรไม่ควรเชื่อทันที"),
    lines: ["learn: verify answers", "play: AI Fact or Fiction", "wow: show me your sources", "time: 50 minutes"],
    wow: b("Claude searches the web and shows its sources", "Claude ค้นเว็บและแสดงแหล่งอ้างอิง"),
    checkIn: b("What visual did you make with AI, and what did you fix by hand?", "ภาพที่คุณสร้างด้วย AI คืออะไร และคุณแก้อะไรด้วยมือ?"),
    concepts: [
      { layout: "statement", eyebrow: "the big idea", big: b("AI can sound sure and still be wrong.", "AI พูดมั่นใจได้ แม้จะผิด"), sub: b("Sounding confident is not the same as being correct.", "น้ำเสียงมั่นใจ ไม่ได้แปลว่าถูก"), notes: "ถามห้องว่าเคยเจอ AI ตอบมั่นใจแต่ผิดไหม ให้เล่าสั้น ๆ" },
      { layout: "cards", eyebrow: "where it goes wrong", title: "Where AI Goes Wrong", titleTh: "AI พลาดตรงไหน",
        cards: [
          { title: "Made-up facts", body: b("Invents names, numbers and sources.", "แต่งชื่อ ตัวเลข และแหล่งที่มา"), tone: "danger" },
          { title: "Old facts", body: b("Knows less about recent events.", "รู้น้อยเรื่องเหตุการณ์ล่าสุด"), tone: "constraints" },
          { title: "Your facts", body: b("Cannot know your prices, rules or guests.", "ไม่รู้ราคา กฎ หรือแขกของคุณ"), tone: "audience" },
        ],
        bar: b("Check anything that could cost money, trust or safety.", "ตรวจทุกอย่างที่อาจเสียเงิน เสียความไว้ใจ หรืออันตราย") },
      { layout: "checklist", eyebrow: "four checks", title: "Four Checks Before You Rely On It", titleTh: "สี่ข้อตรวจก่อนเชื่อ",
        items: [b("Ask for the source", "ขอแหล่งที่มา"), b("Open the source yourself", "เปิดแหล่งที่มาดูเอง"), b("Cross-check with a second source", "เทียบกับแหล่งที่สอง"), b("Ask the same thing twice", "ถามเรื่องเดียวกันสองครั้ง")],
        tip: { title: "Tip", body: b("If two answers disagree, stop and check by hand.", "ถ้าสองคำตอบไม่ตรงกัน หยุดแล้วตรวจเอง") }, tone: "accent" },
      { layout: "numbers", eyebrow: "how much to check", title: "How Much To Check", titleTh: "ควรตรวจแค่ไหน",
        stats: [
          { value: "2", label: b("sources for anything important", "แหล่งสำหรับเรื่องสำคัญ"), tone: "accent" },
          { value: "1", label: b("number checked by hand, at least", "ตัวเลขที่ตรวจด้วยมือ อย่างน้อย"), tone: "success" },
          { value: "0", label: b("secrets to paste into a chat", "ความลับที่ควรวางในแชต"), tone: "danger" },
        ],
        bar: b("Small habits make AI safe to use at work.", "นิสัยเล็ก ๆ ทำให้ใช้ AI ที่ทำงานได้อย่างปลอดภัย") },
    ],
    demo: {
      eyebrow: "wow moment", title: "Watch: Show Me Your Sources", titleTh: "ดูสด: ขอดูแหล่งที่มา", windowTitle: "live demo: sources",
      steps: [b("Ask a question that needs today's facts.", "ถามเรื่องที่ต้องใช้ข้อมูลล่าสุด"), b("Ask Claude to search and cite each claim.", "ให้ Claude ค้นและอ้างอิงทุกข้อ"), b("Open two links. Does each one say that?", "เปิดสองลิงก์ ตรงกับที่อ้างไหม")],
      watch: { title: "Watch for", bullets: [b("Claims with no source", "ข้อความที่ไม่มีแหล่งที่มา"), b("Links that don't say it", "ลิงก์ที่ไม่ได้พูดแบบนั้น"), b("Two tools that disagree", "สองเครื่องมือที่ตอบไม่ตรงกัน")] },
    },
    safety: {
      eyebrow: "privacy", title: "What Never To Paste", titleTh: "สิ่งที่ไม่ควรวาง",
      donts: [b("Passwords, IDs, card numbers", "รหัสผ่าน บัตรประชาชน เลขบัตร"), b("Guest or staff personal details", "ข้อมูลส่วนตัวของแขกหรือพนักงาน"), b("Contracts and real finance figures", "สัญญาและตัวเลขการเงินจริง")],
      dos: [b("Use invented or shortened details", "ใช้ข้อมูลสมมติหรือย่อ"), b("Check your workplace AI policy", "ตรวจนโยบาย AI ของที่ทำงาน"), b("Ask IT when unsure", "ไม่แน่ใจให้ถาม IT")],
      bar: "When in doubt, leave it out.",
    },
    game: {
      title: "Game: AI Fact or Fiction", titleTh: "เกม: AI Fact or Fiction",
      rules: [b("A statement about AI appears.", "ข้อความเกี่ยวกับ AI จะขึ้นบนจอ"), b("Tap Fact or Fiction on your phone.", "แตะ จริง หรือ เท็จ บนมือถือ"), b("We reveal the answer and why.", "เราเฉลยพร้อมเหตุผล")],
      scoring: b("100 per correct answer", "ตอบถูกได้ข้อละ 100 คะแนน"),
    },
    games: [quiz("fact-or-fiction", b("AI Fact or Fiction", "AI จริงหรือเท็จ"), [
      factOrFiction("AI can sound confident and still be wrong.", "AI พูดมั่นใจได้ แม้จะผิด", true),
      factOrFiction("If AI gives a source, that source always exists.", "ถ้า AI ให้แหล่งที่มา แหล่งนั้นต้องมีอยู่จริงเสมอ", false),
      factOrFiction("It is safe to paste a customer's ID number into a popular AI tool.", "วางเลขบัตรประชาชนลูกค้าในเครื่องมือ AI ยอดนิยมได้อย่างปลอดภัย", false),
      factOrFiction("Asking the same question twice can give different answers.", "ถามคำถามเดิมสองครั้งอาจได้คำตอบต่างกัน", true),
      factOrFiction("AI always knows what happened this morning.", "AI รู้เสมอว่าเช้านี้เกิดอะไรขึ้น", false),
      factOrFiction("Checking one key fact is better than checking nothing.", "ตรวจข้อเท็จจริงสำคัญหนึ่งข้อ ดีกว่าไม่ตรวจเลย", true),
    ])],
    takeHome: {
      cards: [
        { title: "Pick an AI answer", body: b("Choose one answer you were about to use.", "เลือกคำตอบ AI ที่กำลังจะใช้") },
        { title: "Check it", body: b("Find the source, open it and compare.", "หาแหล่งที่มา เปิดดู แล้วเทียบ") },
        { title: "Write your list", body: b("Five things you will never paste into a chat.", "ห้าอย่างที่จะไม่วางลงแชต") },
      ],
      next: b("Next week: Build Your Own AI Workflow.", "สัปดาห์หน้า: สร้างเวิร์กโฟลว์ AI ของคุณเอง"),
    },
    planNotes: "Week 10 of 12. Goal: verify answers and know what never to paste. Run order: check-in, concepts, sources demo, safety, AI Fact or Fiction quiz, take-home. Optional: run the Head-to-Head segment again with the same prompt in two tools and look at where they disagree. About 50 minutes. " + SAFE,
    notes: {
      opener: "สัปดาห์นี้เรื่องความน่าเชื่อถือ ไม่ได้มาทำให้กลัว AI แต่ให้ใช้อย่างรู้เท่าทัน",
      checkIn: "ให้เล่าภาพที่สร้างและสิ่งที่ต้องแก้ด้วยมือ เช่น ตัวอักษรที่สะกดผิด",
      demo: "ถามเรื่องที่ต้องใช้ข้อมูลล่าสุด ให้ Claude ค้นเว็บและอ้างแหล่งที่มา เปิดสองลิงก์ให้ห้องดูว่าตรงกับที่อ้างไหม ถ้ามีเวลาถามสองเครื่องมือแล้วเทียบ",
      safety: "ใช้สไลด์นี้เป็นกฎของห้อง: ข้อมูลจริงไม่วางลงแชต",
      game: "เปิดเกม AI Fact or Fiction แล้วเฉลยทีละข้อพร้อมเหตุผลสั้น ๆ",
      takeHome: "ให้เขียนรายการห้ามวางห้าข้อ แล้วเก็บไว้ใกล้ที่ทำงาน",
    },
  },

  // ----------------------------------------------------------------- week 11
  {
    number: 11, title: "Build Your Own AI Workflow", category: "Everyday AI", durationMin: 55,
    outcome: b("Build a reusable prompt you can run again every week.", "สร้างชุดคำสั่งที่นำกลับมาใช้ซ้ำได้ทุกสัปดาห์"),
    lines: ["learn: reusable prompts", "play: Workflow Builder", "wow: save once, reuse", "time: 55 minutes"],
    wow: b("a saved workflow runs on new notes in seconds", "workflow ที่บันทึกไว้ใช้กับโน้ตใหม่ได้ในไม่กี่วินาที"),
    checkIn: b("What did you check by hand, and what is on your do-not-paste list?", "คุณตรวจอะไรด้วยมือ และรายการห้ามวางของคุณมีอะไรบ้าง?"),
    concepts: [
      { layout: "statement", eyebrow: "the big idea", big: b("If you do it twice, write it down once.", "ถ้าต้องทำซ้ำ ก็เขียนไว้ครั้งเดียว"), sub: b("A saved prompt is a small tool that works every week.", "พรอมป์ที่บันทึกไว้คือเครื่องมือเล็ก ๆ ที่ใช้ได้ทุกสัปดาห์"), notes: "ถามห้องว่ามีงานอะไรที่ทำครั้งที่สามแล้วยังพิมพ์ใหม่ทุกครั้ง" },
      { layout: "timeline", eyebrow: "four steps", title: "Build A Workflow In Four Steps", titleTh: "สร้างเวิร์กโฟลว์สี่ขั้น",
        steps: [
          { label: "Pick", body: b("A task you repeat weekly.", "งานที่ทำซ้ำทุกสัปดาห์") }, { label: "Write", body: b("A prompt with blanks to fill.", "พรอมป์ที่มีช่องว่างให้เติม") },
          { label: "Test", body: b("Run it on two practice cases.", "ลองกับสองกรณีตัวอย่าง") }, { label: "Save", body: b("Name it and keep it where you can find it.", "ตั้งชื่อและเก็บไว้ในที่หาเจอ") },
        ],
        bar: "Good workflows are small, boring and used every week." },
      { layout: "compare", eyebrow: "before and after", title: "One-Off vs Reusable", titleTh: "ใช้ครั้งเดียวกับใช้ซ้ำ",
        left: { title: "one-off.txt", text: b("Write this week's status update for my manager.", "เขียนรายงานสถานะสัปดาห์นี้ให้หัวหน้า") },
        right: { title: "reusable.txt", text: b("Write a status update from [this week's notes], under 100 words, for [my manager].", "เขียนรายงานสถานะจาก [โน้ตสัปดาห์นี้] ไม่เกิน 100 คำ สำหรับ [หัวหน้า]") },
        caption: b("Blanks in [brackets] are what you swap each week.", "ช่องใน [วงเล็บ] คือสิ่งที่เปลี่ยนทุกสัปดาห์") },
      { layout: "cards", eyebrow: "where to keep it", title: "Where To Keep It", titleTh: "เก็บไว้ที่ไหน",
        cards: [
          { title: "A saved note", body: b("A prompt you copy and paste.", "พรอมป์ที่คัดลอกมาใช้"), tone: "context" },
          { title: "A project", body: b("Instructions the AI remembers.", "คำแนะนำที่ AI จำไว้"), tone: "goal" },
          { title: "A skill", body: b("Packaged steps your team can share.", "ขั้นตอนที่แชร์ให้ทีมได้"), tone: "audience" },
        ],
        bar: b("Start with a note. Upgrade when you use it every week.", "เริ่มจากโน้ต อัปเกรดเมื่อใช้ทุกสัปดาห์") },
    ],
    demo: {
      eyebrow: "wow moment", title: "Watch: Save Once, Run Often", titleTh: "ดูสด: บันทึกครั้งเดียว ใช้ได้บ่อย", windowTitle: "live demo: a saved workflow",
      steps: [b("Show a saved status-update prompt.", "แสดงพรอมป์รายงานสถานะที่บันทึกไว้"), b("Swap in this week's practice notes.", "เปลี่ยนเป็นโน้ตตัวอย่างสัปดาห์นี้"), b("Run it. Then schedule it for Fridays.", "รัน แล้วตั้งเวลาให้ทุกวันศุกร์")],
      watch: { title: "Watch for", bullets: [b("Seconds, not minutes", "วินาที ไม่ใช่นาที"), b("What still needs your eyes", "ส่วนที่ยังต้องตรวจเอง"), b("How to share it with a team", "แชร์ให้ทีมอย่างไร")] },
    },
    safety: {
      eyebrow: "share workflows", title: "Share Workflows, Not Secrets", titleTh: "แชร์เวิร์กโฟลว์ ไม่ใช่ความลับ",
      donts: [b("Hide real names inside prompts", "ฝังชื่อจริงไว้ในพรอมป์"), b("Share a prompt with private data", "แชร์พรอมป์ที่มีข้อมูลส่วนตัว"), b("Run it without reading the result", "รันโดยไม่อ่านผลลัพธ์")],
      dos: [b("Keep blanks for names and numbers", "เว้นช่องว่างสำหรับชื่อและตัวเลข"), b("Label versions: v1, v2", "ระบุเวอร์ชัน v1 v2"), b("Re-test when the tool changes", "ทดสอบใหม่เมื่อเครื่องมือเปลี่ยน")],
      bar: "A workflow saves time only if it stays correct.",
    },
    game: {
      title: "Game: Workflow Builder", titleTh: "เกม: Workflow Builder",
      rules: [b("Name one task you repeat every week.", "ตั้งชื่องานที่ทำซ้ำทุกสัปดาห์หนึ่งงาน"), b("Write a prompt with [blanks].", "เขียนพรอมป์ที่มีช่อง [ ]"), b("The room votes for the most reusable one.", "ห้องโหวตอันที่ใช้ซ้ำได้ดีที่สุด")],
      scoring: b("100 per quiz answer; votes decide the battle", "ควิซละ 100 คะแนน แบทเทิลตัดสินด้วยโหวต"),
    },
    challenge: {
      titleEn: "Friday status update", titleTh: "รายงานสถานะวันศุกร์",
      scenarioEn: "Every Friday you send your manager a short status update from your week's notes.", scenarioTh: "ทุกวันศุกร์คุณส่งรายงานสถานะสั้น ๆ ให้หัวหน้าจากโน้ตของสัปดาห์",
      taskEn: "Write a reusable prompt with [blanks] for the notes, the reader and the length. Use invented examples only.", taskTh: "เขียนพรอมป์ใช้ซ้ำที่มีช่อง [ ] สำหรับโน้ต ผู้อ่าน และความยาว ใช้ตัวอย่างสมมติเท่านั้น",
    },
    games: [
      { id: "weekly-chore", kind: "open", title: b("My weekly task", "งานประจำของฉัน"), questions: [{ text: b("Name one task you repeat every week. No names or data.", "ตั้งชื่องานที่ทำซ้ำทุกสัปดาห์หนึ่งงาน ไม่ใส่ชื่อหรือข้อมูลจริง"), options: [] }] },
      quiz("reusable-prompt", b("Reusable prompts", "พรอมป์ใช้ซ้ำ"), [
        { text: b("Which part should be a [blank] in a reusable prompt?", "ส่วนไหนควรเป็นช่อง [ ] ในพรอมป์ใช้ซ้ำ"), options: [opt("The weekly notes", "โน้ตประจำสัปดาห์"), opt("The format you always want", "รูปแบบที่ต้องการเสมอ"), opt("The tone you always use", "โทนที่ใช้เสมอ")], correct: 0 },
        { text: b("Where do you keep a prompt you use every week?", "เก็บพรอมป์ที่ใช้ทุกสัปดาห์ไว้ที่ไหน"), options: [opt("In your head", "ในหัว"), opt("In a saved note or project", "ในโน้ตหรือโปรเจกต์"), opt("In an old chat", "ในแชตเก่า")], correct: 1 },
        { text: b("The AI tool changes its style. What do you do?", "เครื่องมือ AI เปลี่ยนสไตล์ คุณควรทำอะไร"), options: [opt("Nothing", "ไม่ต้องทำอะไร"), opt("Re-test the prompt on two cases", "ทดสอบพรอมป์ใหม่กับสองกรณี"), opt("Delete it", "ลบทิ้ง")], correct: 1 },
      ]),
    ],
    takeHome: {
      cards: [
        { title: "Pick a weekly task", body: b("The one you did most often this month.", "งานที่ทำบ่อยที่สุดในเดือนนี้") },
        { title: "Write and test it", body: b("Use [blanks] and test it twice.", "ใช้ช่อง [ ] และทดสอบสองรอบ") },
        { title: "Save and share", body: b("Keep it where you can find it. Share one.", "เก็บไว้ในที่หาเจอ และแชร์หนึ่งอัน") },
      ],
      next: b("Next week: the AI Skills Championship. Bring your saved prompt.", "สัปดาห์หน้า: AI Skills Championship เอาพรอมป์ที่บันทึกไว้มาด้วย"),
    },
    planNotes: "Week 11 of 12. Goal: turn a weekly task into a reusable prompt. Run order: check-in, concepts, saved-workflow demo, safety, quiz and weekly-task wall in the Game Hub, live challenge, battle, results, take-home. About 55 minutes. " + SAFE,
    notes: {
      opener: "สัปดาห์ก่อนสุดท้าย วันนี้ทุกคนจะออกไปพร้อมเครื่องมือของตัวเองหนึ่งชิ้น",
      checkIn: "ถามรายการห้ามวางของแต่ละคน ให้เล่า 1 ข้อที่ไม่เคยคิดว่าไม่ควรวาง",
      demo: "ใช้พรอมป์รายงานสถานะที่เตรียมไว้ วางโน้ตตัวอย่างสัปดาห์นี้ แล้วรัน ถ้าเครื่องมือมีงานตั้งเวลา ให้ตั้งทุกวันศุกร์ให้ดู",
      safety: "ย้ำว่าพรอมป์ที่แชร์ต้องไม่มีข้อมูลส่วนตัว ใช้ช่องว่างแทนชื่อและตัวเลข",
      game: "เปิดกำแพงงานประจำก่อน แล้วควิซ แล้วไปโจทย์สดและแบทเทิล",
      takeHome: "สัปดาห์หน้าให้เอาพรอมป์ที่บันทึกไว้มาแข่งในทีม",
    },
  },

  // ----------------------------------------------------------------- week 12
  {
    number: 12, title: "AI Skills Championship", category: "Everyday AI", durationMin: 60,
    outcome: b("Bring every skill together to solve a real-style challenge as a team.", "รวมทักษะทั้งหมดมาแก้โจทย์สไตล์งานจริงเป็นทีม"),
    lines: ["learn: put it all together", "play: Team Mission", "wow: beat the AI", "time: 60 minutes"],
    wow: b("teams race against an AI-written answer", "ทีมแข่งกับคำตอบที่ AI เขียน"),
    checkIn: b("Which workflow did you save, and who else could use it?", "เวิร์กโฟลว์ที่คุณบันทึกไว้คืออะไร และใครอีกที่ใช้ได้?"),
    concepts: [
      { layout: "timeline", eyebrow: "what you can do now", title: "What You Can Do Now", titleTh: "ตอนนี้คุณทำอะไรได้บ้าง",
        steps: [
          { label: "Ask", body: b("Clear prompts with five parts.", "พรอมป์ชัดเจนห้าส่วน") }, { label: "Automate", body: b("Hand AI the boring work.", "ให้ AI ทำงานซ้ำ ๆ") },
          { label: "Write", body: b("Tone, format and visuals.", "โทน รูปแบบ และภาพ") }, { label: "Check", body: b("Verify and stay safe.", "ตรวจสอบและปลอดภัย") }, { label: "Reuse", body: b("Save your workflows.", "บันทึกเวิร์กโฟลว์") },
        ],
        bar: "Every one of these is a skill you practised." },
      { layout: "cards", eyebrow: "how it works", title: "How Team Mission Works", titleTh: "Team Mission เล่นอย่างไร",
        cards: [
          { title: "Form teams", body: b("Groups of three share one phone.", "กลุ่มละสามคนใช้มือถือเครื่องเดียว") },
          { title: "Read the case", body: b("A real-style case, invented data only.", "โจทย์สไตล์งานจริง ใช้ข้อมูลสมมติ") },
          { title: "Write one prompt", body: b("One team prompt in eight minutes.", "พรอมป์ทีมหนึ่งอันใน 8 นาที") },
        ],
        numbered: true, bar: b("The room votes. The best prompt is the champion.", "ห้องโหวต พรอมป์ที่ดีที่สุดคือแชมป์") },
      { layout: "checklist", eyebrow: "winning checklist", title: "Your Winning Checklist", titleTh: "เช็กลิสต์ผู้ชนะ",
        items: [
          b("Context: who is the AI?", "บริบท: AI รับบทอะไร"), b("Goal: exactly what do we need?", "เป้าหมาย: ต้องการอะไรแน่"), b("Reader and tone are named", "ระบุผู้อ่านและโทน"), b("Format and length are set", "กำหนดรูปแบบและความยาว"), b("Nothing invented, no real data", "ไม่แต่งข้อมูล ไม่ใช้ข้อมูลจริง"),
        ],
        tip: { title: "Tip", body: b("Read it aloud. If a stranger could follow it, submit.", "อ่านออกเสียง ถ้าคนแปลกหน้าทำตามได้ ส่งได้") } },
    ],
    demo: {
      eyebrow: "wow moment", title: "Watch: Beat The AI", titleTh: "ดูสด: ชนะ AI ให้ได้", windowTitle: "live demo: beat the ai",
      steps: [b("Claude answers the case with one short prompt.", "Claude ตอบโจทย์ด้วยพรอมป์สั้น ๆ"), b("Does your team's prompt get a better result?", "พรอมป์ของทีมให้ผลดีกว่าไหม"), b("The room decides which one it would send.", "ห้องตัดสินว่าจะส่งอันไหน")],
      watch: { title: "Watch for", bullets: [b("The detail that made the difference", "รายละเอียดที่สร้างความต่าง"), b("Where AI was good enough", "จุดที่ AI ทำได้ดีพอ"), b("What only you knew", "สิ่งที่มีแค่คุณที่รู้")] },
    },
    safety: {
      eyebrow: "fair play", title: "Competition, Not Real Data", titleTh: "แข่งกัน ไม่ใช้ข้อมูลจริง",
      donts: [b("Use real guest or staff details", "ใช้ข้อมูลแขกหรือพนักงานจริง"), b("Copy another team's prompt", "คัดลอกพรอมป์ของทีมอื่น"), b("Rush without reading the case", "รีบโดยไม่อ่านโจทย์")],
      dos: [b("Use invented names and numbers", "ใช้ชื่อและตัวเลขสมมติ"), b("Split roles: writer, checker, reader", "แบ่งบทบาท: เขียน ตรวจ อ่าน"), b("Cheer for every team", "เชียร์ทุกทีม")],
      bar: "Win the room with a clear prompt, not a clever trick.",
    },
    game: {
      title: "Game: Team Mission", titleTh: "เกม: Team Mission",
      rules: [b("Teams of three, one phone per team.", "ทีมละสามคน ใช้มือถือหนึ่งเครื่อง"), b("Eight minutes to write one team prompt.", "แปดนาทีเขียนพรอมป์ทีมหนึ่งอัน"), b("The room votes for the best prompt.", "ห้องโหวตพรอมป์ที่ดีที่สุด")],
      scoring: b("votes decide the champion", "ผลโหวตตัดสินแชมป์"),
    },
    challenge: {
      titleEn: "Wi-Fi complaint, start to finish", titleTh: "ร้องเรียน Wi-Fi ตั้งแต่ต้นจนจบ",
      scenarioEn: "A guest says the Wi-Fi was down during an important meeting. You need a reply, an internal note and a follow-up checklist.", scenarioTh: "แขกแจ้งว่า Wi-Fi ล่มระหว่างประชุมสำคัญ คุณต้องมีข้อความตอบ บันทึกภายใน และเช็กลิสต์ติดตามผล",
      taskEn: "Write one team prompt that produces all three, in the right tone, with no invented facts or real data.", taskTh: "เขียนพรอมป์ทีมเดียวที่ได้ครบสามอย่างในโทนที่เหมาะสม ไม่แต่งข้อเท็จจริง ไม่ใช้ข้อมูลจริง",
    },
    games: [
      quiz("series-quiz", b("Series quiz", "ควิซทบทวนทั้งคอร์ส"), [
        { text: b("Which is NOT one of the five parts of a prompt?", "ข้อไหนไม่ใช่หนึ่งในห้าส่วนของพรอมป์"), options: [opt("Context", "บริบท"), opt("Goal", "เป้าหมาย"), opt("Luck", "โชค"), opt("Format", "รูปแบบ")], correct: 2 },
        { text: b("A message to an upset customer should be...", "ข้อความถึงลูกค้าที่ไม่พอใจควร..."), options: [opt("Calm and apologetic", "สงบและขออภัย"), opt("Short and cold", "สั้นและเย็นชา"), opt("Full of jokes", "เต็มไปด้วยมุก")], correct: 0 },
        { text: b("AI read a contract for you. What next?", "AI อ่านสัญญาให้แล้ว ต่อไปควรทำอะไร"), options: [opt("Check the cited page", "เปิดหน้าที่อ้างอิงตรวจ"), opt("Send it on", "ส่งต่อเลย"), opt("Forward it to the team", "ส่งให้ทีม")], correct: 0 },
        { text: b("Where is a reusable prompt best kept?", "พรอมป์ใช้ซ้ำควรเก็บไว้ที่ไหน"), options: [opt("In a saved note or project", "ในโน้ตหรือโปรเจกต์"), opt("In your head", "ในหัว"), opt("On a sticky note", "บนกระดาษโน้ต")], correct: 0 },
        { text: b("Which is safe to paste into an AI tool?", "อะไรวางลงเครื่องมือ AI ได้อย่างปลอดภัย"), options: [opt("A customer's ID number", "เลขบัตรประชาชนลูกค้า"), opt("Invented practice notes", "โน้ตฝึกที่แต่งขึ้น"), opt("A real contract with prices", "สัญญาจริงที่มีราคา")], correct: 1 },
        { text: b("Two AI answers disagree. What do you do?", "คำตอบ AI สองอันไม่ตรงกัน คุณทำอะไร"), options: [opt("Pick the longer one", "เลือกอันที่ยาวกว่า"), opt("Check by hand", "ตรวจด้วยมือ"), opt("Ignore both", "ไม่สนใจทั้งสอง")], correct: 1 },
      ]),
      { id: "habit", kind: "open", title: b("My 30-day habit", "นิสัย 30 วันของฉัน"), questions: [{ text: b("One AI habit I will keep for 30 days. No names.", "นิสัยการใช้ AI หนึ่งอย่างที่ฉันจะทำต่อ 30 วัน ไม่ใส่ชื่อ"), options: [] }] },
    ],
    takeHome: {
      cards: [
        { title: "Commit to a habit", body: b("Pick one AI habit for the next 30 days.", "เลือกนิสัยการใช้ AI หนึ่งอย่างสำหรับ 30 วัน") },
        { title: "Teach one person", body: b("Show one colleague one skill from the course.", "สอนเพื่อนร่วมงานหนึ่งคนหนึ่งทักษะ") },
        { title: "Review in 30 days", body: b("Set a reminder and check how it went.", "ตั้งเตือนและกลับมาดูผล") },
      ],
      next: b("Thank you! Keep your workflows and keep learning every week.", "ขอบคุณครับ! เก็บเวิร์กโฟลว์ไว้และเรียนรู้ต่อทุกสัปดาห์"),
    },
    planNotes: "Week 12 of 12. Goal: put every skill together as teams. Run order: check-in, recap, how it works, beat-the-AI demo, safety, series quiz and habit wall, team live challenge, battle, results, final feedback. About 60 minutes. Teams of three share one phone and submit one prompt. " + SAFE,
    notes: {
      opener: "สัปดาห์สุดท้าย เปิดด้วยการขอบคุณทุกคนที่มาครบหรือแวะมาได้ ฉลองสิ่งที่ทำได้แล้ว",
      checkIn: "ให้แต่ละคนบอกเวิร์กโฟลว์ที่บันทึกไว้และคนที่น่าจะใช้ต่อได้",
      demo: "ให้ Claude ตอบโจทย์ด้วยพรอมป์สั้นก่อน แล้วโชว์ผลลัพธ์ จากนั้นให้ทีมเขียนพรอมป์ที่ดีกว่าและเทียบกัน ห้องตัดสินว่าอันไหนส่งได้จริง",
      safety: "เน้นความยุติธรรม แข่งกันด้วยพรอมป์ที่ชัด ไม่ใช่เล่ห์เหลี่ยม",
      game: "เล่นควิซทบทวนและกำแพงนิสัย 30 วันก่อน แล้วไปโจทย์สดแบบทีม แบทเทิล และผลรวม",
      takeHome: "เปิดแบบสอบถามท้ายคอร์ส ขอให้ทุกคนบอกว่าอยากเรียนอะไรต่อ",
    },
  },
];
