# Stop Session and 5-Week Curriculum: Plan

Date: 2026-10-29. Status: draft for approval. No code written yet.

## Part A. Stop session (end room for everyone)

**Behaviour.** The presenter can end a room at any time (for example a room created by mistake). Ending is final: the code stops working and everyone sees an "ended" screen. Results already saved (submissions, votes, feedback) stay in the database for admin reports.

**Data.** New migration `0007_room_ended.sql` (additive): `rooms.ended_at TEXT NULL`, `rooms.ended_reason TEXT NOT NULL DEFAULT ''`. Existing rooms stay NULL = running.

**Worker** (`src/worker/room-hub.ts`, `index.ts`, `view.ts`)
- New control action `end_room` under `withLock("control")`, presenter token only. Sets `ended_at`, logs the action, broadcasts state, then closes sockets with a normal code. Idempotent: ending twice is a no-op.
- Room state gains `ended: boolean`. After ending, every mutating call (join, submit, vote, control, feedback) returns 409 "This session has ended." Read-only state still works so clients can render the ended screen.
- `rooms` lookup for `join` refuses ended rooms with a clear message.
- Live Sessions admin table shows "Ended" stage plus time; a stale room that never started can also be ended from admin (admin session guard, audited in `admin_actions`).

**UI**
- Presenter: "End session" button in the console (away from "Next"), with a two-step confirm ("End for everyone? This can't be undone"). EN/TH strings.
- Participant and projector: full-screen "Session ended, thank you" state; participant keeps the feedback form link only if feedback was open.
- Landing: a stored host token for an ended room is cleared, so it doesn't offer to resume.

**Tests**
- Unit: state view includes `ended`; mutation guards.
- Extend `scripts/smoke-room.mjs`: end mid-writing, mid-voting, before anyone joins; assert join, submit, vote and advance all return 409 afterwards; assert double-end is safe; assert reports still show the data.

## Part B. 5-week curriculum (office workers adapting to change, with AI)

Principle: each week is one 45 to 60 minute live session built from the existing room engine (slides, live widgets, activity). Each week has a different theme, a different activity, and ends with one "use it at work this week" task and a 2-minute check-in at the start of the next week. Content must be generic to office roles; participants do not paste confidential company or guest data.

| Week | Theme | Core idea | Live activity | Take-home at work |
|---|---|---|---|---|
| 1 | Ask better: prompting (exists) + reusable skills | A clear prompt beats a clever one; save what works | Prompt Battle, case-opening draw, Skill Hunt | Save one prompt you reuse |
| 2 | Find time: automate the boring parts | Spot repetitive tasks (emails, reports, meeting notes) and hand them to AI safely | "Task audit" poll: each person lists a weekly chore, room votes the most automatable; presenter live-converts one into a prompt | Automate one 15-minute chore, note time saved |
| 3 | Check the work: trust, accuracy, privacy | AI is confidently wrong sometimes; verify, and know what never to paste | "Spot the mistake": show AI answers with planted errors, participants vote which line is wrong; privacy sort (safe / not safe to paste) | Fact-check one AI output; write your own do-not-paste list |
| 4 | Work together: communication and teamwork | Use AI to draft, summarise and tone-check messages, then add your own voice | "Rewrite relay": same awkward message rewritten for boss, colleague, customer; room votes best tone | Send one improved message; get feedback |
| 5 | Keep adapting: your learning habit | Tools change; a small weekly learning routine beats cramming. Build your personal plan | "My 30-day plan" form: pick a role task, a tool, a habit; share anonymised highlights; final feedback and recap leaderboard | Commit to one habit; review in 30 days |

**Build approach.** Weeks 2 to 5 are authored as lessons in Training Studio (data-only `SlideDoc`s), then assembled into one plan per week and published as snapshots, so no engine changes are required except:
- New live widgets as needed, kept to a closed list in `WIDGET_KINDS`: `poll` (Week 2 task audit, Week 3 spot-the-mistake, Week 4 tone vote) and `commit-form` (Week 5). One generic anonymous poll widget serves three weeks; this is the main new engine work. Reuse Prompt Battle for any week that needs free text.
- A "series" tag on plans (title "Week N of 5") shown in Live Sessions so the five weeks are listed in order. No schema change needed if the title carries it; a `series_week` column is optional.
- EN/TH for every slide and string.

## Suggested order of work
1. Part A (small, self-contained, valuable immediately).
2. Generic `poll` widget and tests.
3. Author Week 2, then 3, 4, 5 slides in Studio, one PR per week for easy review.
4. Pilot Week 2 with a small group, adjust timing before authoring the rest.

## Open questions
- Session length per week (assumed 45 to 60 minutes)?
- Do you want Thai-first or English-first slide copy?
- Should the weeks be locked in order, or can a presenter run any week?
