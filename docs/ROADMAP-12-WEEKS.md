# AI Weekly Training Roadmap: 12 Weeks (DRAFT for review)

Status: proposal only. Nothing below Week 02 is built yet. Wording and order are open to change.

Rules for every game: it must run in the web app (participants join on a phone), and it must not need a live AI key. Answers are judged by the room (votes) or by answers written in advance.

Game types available today: `poll`, `quiz`, `open`, Prompt Battle (peer voting). Source: `src/shared/games.ts`.

## Overview

| Wk | Lesson | What staff can do (ไทย) | Web game | Game type | Engine work |
|---|---|---|---|---|---|
| 01 | Prompt Engineering | สั่ง AI ให้เข้าใจสิ่งที่ต้องการ | Prompt Battle + Prompt basics quiz | existing | none. **Built** |
| 02 | Find Time: Automate the Boring Parts | เปลี่ยนงานซ้ำ ๆ เป็นขั้นตอนที่ทำง่ายขึ้น | Messy Notes Challenge + Task audit + Safe to paste? | existing | none. **Built (starter)** |
| 03 | Make AI Write Like You | ปรับโทนและรูปแบบข้อความให้เหมาะกับผู้รับ | Tone Battle: one message in 3 tones, room votes which fits the reader | poll | none |
| 04 | AI Can Read That! | ให้ AI ช่วยอ่าน PDF รูปภาพ และเอกสาร | Document Detective: a document image on screen, find the hidden detail | quiz + image | check that quiz questions can show an image |
| 05 | Think Better with AI | ใช้ AI ช่วยเปรียบเทียบทางเลือกและคิดแก้ปัญหา | Decision Challenge: pick an option, write the reason, room votes the best reason. Plus Head-to-Head (below) | open + vote | small: voting on open answers |
| 06 | One Prompt, Many Results | เปลี่ยนข้อมูลชุดเดียวเป็นอีเมล Checklist และตาราง | Format Race: which prompt produces the table, the email, the checklist | quiz | none |
| 07 | Plan Anything with AI | สร้างแผนงาน Timeline และรายการเตรียมงาน | Planning Mission: write the steps in order, room votes the most doable plan | open + vote | small: same voting as Wk 05 |
| 08 | AI as Your Second Pair of Eyes | ใช้ AI ช่วยตรวจข้อความและหาข้อมูลที่ตกหล่น | Spot the Mistake: AI answer with a planted error, pick the wrong line | quiz | none |
| 09 | Create Better Visuals | เขียน Prompt เพื่อสร้างภาพหรือสื่อประกอบงาน | Guess the Prompt: see an image, pick the prompt that made it (replaces Image Prompt Battle) | quiz + image | same image support as Wk 04 |
| 10 | Can You Trust AI? | ตรวจสอบคำตอบ AI และรู้ว่าเมื่อไรไม่ควรเชื่อทันที | AI Fact or Fiction: true or false with the source shown at reveal | quiz | none |
| 11 | Build Your Own AI Workflow | สร้างชุดคำสั่งที่นำกลับมาใช้ซ้ำได้ | Workflow Builder: build a prompt from parts (role, material, format), share with the room | new form | **new**: builder form and share wall |
| 12 | AI Skills Championship | รวมทักษะทั้งหมดมาแก้โจทย์จริง | Team Mission: teams answer the same scenario, room votes | team vote | **new**: teams |

## Presenter "wow moment" (one live demo per week)

The demo is run by the presenter on the projector. It is not part of the web game. Try each demo on the account you will present from, because some features depend on the plan.

| Wk | Demo |
|---|---|
| 01 | Save a skill once, reuse it (already in Part 2: Skills) |
| 02 | Messy list in chat, a real `.xlsx` file out |
| 03 | One message written in 4 tones and 3 languages |
| 04 | Ask a 60-page PDF a question, answer cites the page. Compare 3 quotes side by side |
| 05 | "Red Team my plan": Claude finds the 3 weakest points. Hard problem with deep thinking on |
| 06 | One data set turned into `.xlsx`, `.docx` and `.pptx` |
| 07 | Claude builds a small checklist or countdown app live, the room opens it on phones |
| 08 | Paste a draft, Claude lists what is missing |
| 09 | An image tool makes the picture, Claude writes and improves the prompt |
| 10 | Claude searches the web and cites sources. Compare two tools on the same question |
| 11 | A saved workflow plus a scheduled weekly task |
| 12 | Claude builds a quick game live, then "beat the AI" |

## ChatGPT vs Claude (comparison segment)

Goal: teach staff to try the same task in two tools and choose, not to declare a winner. Tools change every quarter.

- **Wk 05, Head-to-Head game:** same prompt, two answers prepared in advance (one from each tool), shown unlabelled, the room votes, then the labels are revealed. No live API needed.
- **Wk 09:** ChatGPT creates the image (Claude cannot generate images), Claude helps write the prompt.
- **Wk 10:** put the two tools' answers side by side. If they disagree, check the facts yourself.
- **Wk 12:** each team picks its tool and explains why.
- Check with IT which tool and plan the company allows before any demo that uses real documents.

## Changes I made to the ChatGPT draft

1. Wk 09: **Image Prompt Battle** becomes **Guess the Prompt**. The web app cannot generate images live.
2. Wk 05: added the Head-to-Head game.
3. Privacy: "what never to paste" is taught from Wk 02 (the Safe to paste? game already exists), so Wk 04 documents are not the first time it comes up.
4. Wk 08 and Wk 10 overlap. Suggested split: Wk 08 is checking **your own draft** (gaps, errors), Wk 10 is **trusting AI** (hallucination, sources, privacy).

## Questions for review

1. Is the order right? Should Document Detective (Wk 04) move later because it needs images?
2. Should Wk 08 and Wk 10 stay separate, or merge and free a week?
3. 12 weeks is long. Add a mid-point recap with a leaderboard at Wk 06 for people who missed weeks?
4. Session length: assumed 45 to 60 minutes. Right for 12 weeks?
5. Are the weeks locked in order, or can a presenter run any week?
6. Are Wk 11 and Wk 12 worth the new engine work, or use simple versions (open answers) first?
7. Should the slides and games be fully bilingual (Thai and English) as in Weeks 01 and 02?
8. Which tools and plans do attendees actually have? That decides which wow demos are safe.

## Suggested build order

1. Add the roadmap to the repo, update the older 5-week plan to point here.
2. Weeks that need no new engine: 03, 06, 08, 10.
3. Check image support in quiz, then Weeks 04 and 09.
4. Voting on open answers, then Weeks 05 and 07.
5. Workflow Builder (Wk 11) and teams (Wk 12) last, after piloting earlier weeks.
