# เริ่มใช้ 4Seas Live Training

เว็บสำหรับอบรมสด มีสไลด์บนเว็บ 7 หน้า ผู้เข้าร่วมใช้มือถือเข้าห้องด้วยรหัส 6 หลักหรือ QR Code แล้วเขียนพรอมป์ เช็กงานตัวเอง เลือกพรอมป์ที่ดีที่สุด และโหวตแข่งกันใน Prompt Battle ไม่ต้องใช้ AI และไม่ต้องมี API key

## เปิดใช้บนเครื่องนี้

1. เปิดโฟลเดอร์ `weeklylearin` ใน PowerShell ถ้าเครื่องไม่รู้จัก `pnpm` ให้ใช้ `pnpm-local.cmd` แทน
2. คัดลอกไฟล์ตั้งค่า แล้วตั้งรหัสผู้สอน:

   ```powershell
   if (!(Test-Path .dev.vars)) { Copy-Item .dev.vars.example .dev.vars }
   notepad .dev.vars
   ```

3. ติดตั้งและเปิดโปรแกรม:

   ```powershell
   .\pnpm-local.cmd install --frozen-lockfile
   .\pnpm-local.cmd dev
   ```

4. เปิด `http://localhost:5173` ใส่รหัสผู้สอน แล้วกด Create room

ครั้งต่อไปดับเบิลคลิก `start-local.cmd` ได้เลย

## ขั้นตอนในห้องเรียน

1. **Slides** — นำเสนอสไลด์ 1–4 (กด → เพื่อเลื่อน กด F เพื่อเต็มจอ)
2. **Waiting Room** — ให้ทุกคนสแกน QR (ถ้าใช้ Wi-Fi ในเครื่อง ให้ใส่ IP ของเครื่องนี้ในช่อง Participant link origin)
3. **Prompt Writing** — กด Start prompt submission ผู้เข้าร่วมส่งได้สูงสุด 3 ครั้ง แล้วเลือกพรอมป์สุดท้าย
4. **Battle Control** — กด Generate battle groups แล้วเปิดโหวต ปิดโหวต เปิดผล ทีละแบทเทิล จากนั้นเริ่มรอบชิง
5. **Results** — กด Show final leaderboard แล้ว Export CSV
6. **Feedback** — กด Start weekly feedback ทุกคนต้องตอบแบบสอบถาม (ไม่มีปุ่มข้าม ตอบว่า "ไม่มี" ได้) ดูได้ว่าใครส่งแล้ว/ยังไม่ส่ง และ Export feedback CSV สำหรับประชุมผู้บริหาร คำตอบรายบุคคลเปิดดูได้เฉพาะในแท็บ Feedback ห้ามแสดงบนจอโปรเจกเตอร์

คะแนน = จำนวนโหวต ÷ จำนวนผู้มีสิทธิ์โหวต × 100 เป็นความชอบของกลุ่ม ไม่ใช่คะแนนคุณภาพจาก AI

หมายเหตุ: ถ้าไฟล์ `.dev.vars` เดิมยังมี `OPENROUTER_API_KEY` หรือ `SCORING_PROVIDER` สามารถลบออกได้ เพราะโปรแกรมไม่ได้ใช้แล้ว
