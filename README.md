# 4Seas Live Training

A live, interactive presentation and **Prompt Battle** platform for staff training at 4Seas Nimman, Chiang Mai. It is one website with native 16:9 web slides, presenter-controlled activities, and phone-based participation through a six-digit room code or QR code. Participants don't need accounts. There's no AI judge: participants vote for the prompts they think work best.

**Flow:** Write → Self-Check → Improve → Select Final Prompt → Battle → Vote → Reveal → Grand Final → Leaderboard → Mandatory Weekly Feedback → Session Complete

Stack: React 19 + TypeScript + Vite (CSS custom-property design system), Cloudflare Worker, D1 (SQLite), and one Durable Object per room for WebSocket push. Clients fall back to short polling when a socket drops.

## Run locally

Requirements: Node.js 20+ and pnpm (or use `pnpm-local.cmd` / `npx`).

1. `pnpm install`
2. Copy `.dev.vars.example` to `.dev.vars` and set `HOST_PASSPHRASE`.
3. `pnpm dev` applies local D1 migrations, then runs Wrangler on :8787 and Vite on :5173.
4. Open `http://localhost:5173`, enter the passphrase, and create a room.

For phones on the same Wi-Fi, open **Waiting Room** in the presenter console and set the participant link origin to this computer's LAN address (for example `http://192.168.1.20:5173`). The QR code updates automatically.

## Running a session

| Presenter mode | What it does |
|---|---|
| **Slides** | 7 native slides with ← → / Space / PageUp/Down navigation, progressive reveal steps, **F** for fullscreen, and a separate projector window that stays in sync |
| **Waiting Room** | Room code, QR code, join link, and live participant list |
| **Prompt Writing** | Start, close, or reopen submission; see attempts and final picks per person; read all prompts |
| **Battle Control** | Generate groups, start/close voting, reveal results, move to the next battle, start the Grand Final or a tie-break, accept shared winners, resolve a battle manually (a reason is required) |
| **Results** | Final leaderboard, Show Final Leaderboard, Export CSV, presenter action log, **Next: weekly feedback** |
| **Feedback** | Start weekly feedback; participants / submitted / pending / completion % / average rating; per-person status; feedback CSV; individual answers in a separate, on-demand **management-only** panel |

### Mandatory weekly feedback

After the leaderboard, the presenter opens weekly feedback and every phone switches to **Before You Leave…**. There is no skip button. The form is **identified, not anonymous**: the name comes from the participant's join token, and any name sent by the browser is ignored. It has four required answers (a 1–5 rating, work challenges, support needed, and what to learn next; "None" or "ไม่มี" is accepted) plus optional comments. Answers are stored in `weekly_feedback`, separate from the Prompt Battle data, one per participant per session (`UNIQUE(session_id, participant_id)`). The draft is saved on the device, so a refresh or dropped connection resumes where the participant left off, and after submitting they see a confirmation and "session complete".

Privacy: the live state broadcast to presenter and projector carries only completion status and the average rating, never answers. Individual answers are only available through `GET /api/rooms/:code/responses` and `/feedbackcsv`, and both require the presenter token. The form tells participants who can read their answers and why.

Slides 5–7 are live screens. Slide 5 shows the challenge, room code, QR code and counts. Slide 6 shows the active battle with vote progress and a context button (Start voting → Close → Reveal → Next). Slide 7 shows the winner, rankings, and takeaways.

### Rules enforced on the server

- Up to **3 prompt submissions** per participant (20–1,200 characters). Every version is stored. Retries and double-clicks are deduplicated with a request id, and identical resubmissions are rejected.
- The self-check (Context, Goal, Audience, Constraints, Format) is stored for learning only. It never produces a score.
- Each participant selects one final prompt. Anyone who submitted but didn't pick gets their latest prompt when groups are generated. Selections lock once groups exist.
- **Groups of 3 or 4**, randomly allocated with a CSPRNG, randomly ordered, and saved (a refresh never reshuffles). Edge cases: 5 prompts → 3 + 2, 2 prompts → one pair. Groups can be regenerated until the first vote opens.
- **One vote per eligible participant per battle**. Competitors can't vote in their own battle. Votes are final. The database enforces this too (unique index plus triggers for self-votes, closed battles, and vote updates).
- Authors and vote counts stay hidden from everyone, presenter included, until **Reveal**.
- **Battle Score = votes received ÷ eligible voters × 100**. Eligible voters means everyone in the room except that battle's competitors, frozen when voting closes. Raw votes and votes cast are shown alongside. Ties share a rank.
- Mini-battle ties: every tied leader advances. Grand Final ties: run a tie-break round, accept shared winners, or resolve manually. With a single finalist, that finalist wins by default. A battle with zero eligible voters is flagged and must be resolved manually with a recorded reason.

## Checks

- `pnpm test` runs unit tests for grouping, scoring, ranking, and per-role visibility.
- `pnpm typecheck:worker` typechecks the Worker and Durable Object.
- `pnpm build` typechecks and builds the browser app.
- `pnpm smoke` runs the end-to-end HTTP + WebSocket workflow against a **local** `wrangler dev`. Set `SMOKE_HOST_PASSPHRASE` first. It refuses to run against non-local hosts.

## Deploy to Cloudflare

Nothing has been deployed yet. `wrangler.jsonc` still holds a placeholder `database_id`.

1. `npx wrangler login`
2. Create the production database (first deploy only): `npx wrangler d1 create 4seas-training`, then copy the printed `database_id` into `wrangler.jsonc`.
3. Apply migrations: `pnpm db:migrate:remote`. `0002` and `0003` are additive: they only add tables, triggers, and columns, so existing rooms and legacy submissions are kept. Back up first with `npx wrangler d1 export 4seas-training --remote --output backup.sql`.
4. Set the presenter passphrase as a secret: `npx wrangler secret put HOST_PASSPHRASE`
5. `pnpm deploy` builds the SPA into `dist/` and deploys the Worker, assets, and the `RoomHub` Durable Object.
6. Open the `*.workers.dev` URL (or attach a custom domain in the dashboard), create a room, and test with a phone.

Free-plan notes: D1 and SQLite-backed Durable Objects are both available on the Workers Free plan. No paid services or AI APIs are used.

## Project structure

```
migrations/            0001_init.sql (original) · 0002_prompt_battle.sql · 0003_weekly_feedback.sql (both additive)
src/shared/            types.ts · battle.ts (grouping, scoring, ranking) · challenge.ts (Week 01 content)
src/worker/            index.ts (routing, room creation) · room-hub.ts (Durable Object: rules, voting, export) · view.ts (per-role state)
src/slides/Deck.tsx    16:9 canvas and the 7 native slides
src/PresenterScreen.tsx · ProjectorScreen.tsx · ParticipantScreen.tsx · FeedbackForm.tsx · Landing.tsx · JoinScreen.tsx
src/ui.tsx · theme.ts · useRoom.ts · api.ts · styles.css
tests/                 Vitest unit tests
scripts/smoke-room.mjs End-to-end local workflow test
legacy/                Retired AI scoring, slide-template editor and old planning docs (not built)
docs/REFACTOR.md       Audit, plan and change summary
```
