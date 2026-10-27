# Case Opening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the presenter open a CS:GO-style case on the projector that deals one random 4Seas situation to the whole room as the prompt challenge.

**Architecture:** A shared pool of 15 situations (each a `Challenge` plus rarity and a 12×12 pixel icon) lives in `src/shared`. A new `open_case` presenter control action makes the server draw weighted-random, store the pick on the `rooms` row (`case_situation_id`, `case_roll`), and `buildEnvelope` then serves that situation as `state.challenge`, so every existing screen shows it unchanged. A projector-side overlay animates a reel toward the stored result when `case_roll` increases.

**Tech Stack:** TypeScript, React 19, Vite, Cloudflare Worker + Durable Object (`RoomHub`) + D1, Vitest, WebAudio.

**Spec:** `docs/superpowers/specs/2026-10-28-case-opening-design.md`

## Global Constraints

- The server draws the result (`secureRandom` in `src/worker/room-hub.ts`); clients only animate to it. Never random on the client.
- The drawn situation is stored on the room so refreshes and late joiners see the same one, and it never replays the spin for them.
- Every situation has non-empty English AND Thai title, scenario and task. Thai must differ from the English text (the existing `validateChallenge` silently copies English into empty Thai fields, so do not rely on it).
- No department or role labels anywhere (reel tiles, cards, presenter panel). A person's name may appear inside scenario text only (the Coupon case names Sherrie).
- Rarity odds: Common 50%, Rare 30%, Epic 15%, Legendary 5%. Rarity colours: grey `#9ca3af`, blue `#3b82f6`, purple `#a855f7`, gold `#fbbf24`.
- Icons are 12×12 grids of single-character colour codes drawn on a canvas with nearest-neighbour scaling. No image files.
- Re-roll is allowed, but only while there are no battles and no submitted prompts (server returns 409 otherwise). A re-roll never returns the situation currently shown.
- `prefers-reduced-motion` users get a fade-in instead of the spin. A Skip button shows the result immediately. A mute control is present and sound starts only after a user click.
- Rooms with no case opened (and all existing rooms and published plans) behave exactly as before: `state.challenge` comes from the deck meta.
- Do not touch Prompt Battle, scoring, results or feedback logic.
- End every commit message with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Stage only the files each task names (the working tree has an unrelated uncommitted `wrangler.jsonc` change; leave it alone).
- Run `pnpm check` (build, worker typecheck, tests) before the final commit of each task that touches app code. Use `pnpm`, not `npm`.

## Review Focus

- Refresh or late join after a case landed: same situation, no spin replay (Task 3 `caseRollSeen` test, Task 4 step 6).
- Re-roll after any prompt was submitted or after battles started: 409 and the pick is unchanged (Task 2 tests).
- `case_situation_id` pointing at an id no longer in the pool (pool edited later): fall back to the deck challenge, do not crash (Task 2 test).
- Double-click on "Open case" or two presenter tabs: one draw per click, serialized by the existing `withLock("control")`, and roll count increases by exactly 1 per call.
- Projector window opened after the roll: shows the result statically (Task 3 `shouldAnimate` test).

---

### Task 1: Situation pool, odds and pixel icons

**Files:**
- Create: `src/shared/situations.ts`
- Create: `src/shared/pixelIcons.ts`
- Test: `tests/situations.test.ts`
- Modify: `.gitignore` (add `.superpowers/`)

**Interfaces:**
- Produces (`src/shared/situations.ts`):
  - `type Rarity = "common" | "rare" | "epic" | "legendary"`
  - `interface Situation { id: string; rarity: Rarity; challenge: Challenge }` (`Challenge` from `./deck`)
  - `const SITUATIONS: readonly Situation[]` (15 entries)
  - `const RARITY_ORDER: readonly Rarity[]` and `const RARITY_WEIGHTS: Record<Rarity, number>` = 50/30/15/5
  - `situationById(id: string | null | undefined): Situation | undefined`
  - `pickSituation(random: () => number, excludeId?: string): Situation`
- Produces (`src/shared/pixelIcons.ts`):
  - `const ICON_PALETTE: Record<string, string>` (keys `k w r b g y o p n c a`, values hex)
  - `const SITUATION_ICONS: Record<string, readonly string[]>` keyed by situation id, each value 12 strings of 12 chars from the palette keys or `.`

- [ ] **Step 1: Write the failing tests** in `tests/situations.test.ts`:
  - `it("has 15 situations with unique ids and the spec's rarity counts")`: 15 total; counts common 6, rare 4, epic 3, legendary 2; ids unique; ids exactly `wifi-panic, menu-change, coupon, wellness-plan, error-message, room-not-ready, three-captions, poster-brief, sort-the-facts, rainy-day, run-sheet, workshop-2-days, wrong-room-photo, upset-partner, double-booking` (any order).
  - `it("gives every situation complete Thai and English text")`: for each, `validateChallenge(situation.challenge).ok === true`; all six fields non-empty; `titleTh !== titleEn`, `scenarioTh !== scenarioEn`, `taskTh !== taskEn`.
  - `it("keeps the original challenge text for room-not-ready")`: its `scenarioEn` equals `WEEK01_CHALLENGE.scenarioEn` and `taskEn` equals `WEEK01_CHALLENGE.taskEn`.
  - `it("has a valid 12x12 icon for every situation")`: `SITUATION_ICONS[id]` has 12 rows of length 12 and every char is `.` or a key of `ICON_PALETTE`; icon keys equal situation ids exactly.
  - `it("never shows a department or role label")`: no situation `titleEn`/`titleTh` contains `" · "`.
  - `it("picks the rarity by the first random number")`: with a helper `seq(...nums)` returning those numbers in order, `pickSituation(seq(0.49, 0)).rarity === "common"`, `0.5 → "rare"`, `0.8 → "epic"`, `0.95 → "legendary"`, `0.999 → "legendary"`.
  - `it("picks within the rarity by the second random number")`: `pickSituation(seq(0, 0))` is the first Common in `SITUATIONS` order; `pickSituation(seq(0.999, 0.999))` is the last Legendary.
  - `it("never returns the excluded situation")`: for every situation id and 200 draws from a seeded LCG, `pickSituation(rng, id).id !== id`.
  - `it("follows the odds over many draws")`: 20 000 draws from the seeded LCG land within ±2 percentage points of 50/30/15/5.

- [ ] **Step 2: Run to verify failure:** `pnpm vitest run tests/situations.test.ts`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `src/shared/situations.ts`.** Copy English text from the spec's pool section (titles are the bold names: Wi-Fi Panic, Menu Change, Coupon, Wellness Plan, Error Message, Three Captions, Poster Brief, Sort the Facts, Rainy Day, Run Sheet, Workshop in 2 Days, Wrong Room Photo, Upset Partner, Double Booking, Room Not Ready). Scenario and task are separate fields, written as in `WEEK01_CHALLENGE` (scenario states the situation, task starts with "Write a prompt…"). Write natural Thai for all six fields. Room Not Ready reuses `WEEK01_CHALLENGE` verbatim. `pickSituation`: first draw picks rarity by cumulative `RARITY_WEIGHTS` over `RARITY_ORDER`, second draw picks `floor(r * n)` among that rarity's situations (after removing `excludeId`; if that empties the rarity, fall through to the next rarity in order).

- [ ] **Step 4: Implement `src/shared/pixelIcons.ts`.** Palette: `k #111827, w #f9fafb, r #ef4444, b #3b82f6, g #22c55e, y #facc15, o #f97316, p #ec4899, n #92400e, c #67e8f9, a #9ca3af`. Copy the 14 approved grids from the mockup `.superpowers/brainstorm/265-1793131725/content/pixel-icons.html` (the `S` array), mapping titles to ids (Coupon → `coupon`, Wellness Plan → `wellness-plan`, etc.). Draw one new 12×12 icon for `room-not-ready` (a key card with a small clock).

- [ ] **Step 5: Add `.superpowers/` to `.gitignore`.**

- [ ] **Step 6: Run `pnpm vitest run tests/situations.test.ts`.** Expected: PASS.

- [ ] **Step 7: Commit** the spec, this plan, `.gitignore`, `src/shared/situations.ts`, `src/shared/pixelIcons.ts`, `tests/situations.test.ts` with message `feat: add case-opening situation pool and pixel icons`.

---

### Task 2: Server-side case drawing and challenge override

**Files:**
- Create: `migrations/0006_case_opening.sql`
- Modify: `src/worker/view.ts` (`RoomRow`, `buildEnvelope`, new `caseBlockReason`)
- Modify: `src/shared/types.ts` (`SessionState`, `ControlAction`, new `CaseRollInfo`)
- Modify: `src/worker/room-hub.ts` (both `SELECT code, title, host_token_hash, …` queries at `getRoom` and `snapshot`; `applyControl`)
- Test: `tests/view.test.ts` (extend), `tests/caseControl.test.ts`

**Interfaces:**
- Consumes: `SITUATIONS`, `situationById`, `pickSituation`, `Rarity` from Task 1.
- Produces:
  - `RoomRow` gains `case_situation_id: string | null; case_roll: number`.
  - `interface CaseRollInfo { situationId: string; roll: number; rarity: Rarity }` exported from `src/shared/types.ts`; `SessionState` gains `caseRoll: CaseRollInfo | null`.
  - `ControlAction` gains `{ action: "open_case" }`.
  - `caseBlockReason(s: Snapshot): string | null` exported from `src/worker/view.ts`; returns a message when `s.battles.length > 0` or `s.submissions.length > 0`, else `null`.
  - `buildEnvelope` sets `state.challenge` to the stored situation's `challenge` when `case_situation_id` resolves, else `s.meta.challenge`; sets `state.caseRoll` accordingly.

- [ ] **Step 1: Write the failing tests.** Update the `snapshot()` fixture in `tests/view.test.ts` so `room` includes `case_situation_id: null, case_roll: 0`, then add:
  - `it("serves the deck challenge and a null caseRoll when no case was opened")`: `state.challenge` equals `LEGACY_META.challenge`; `state.caseRoll === null`.
  - `it("serves the drawn situation as the challenge")`: room with `case_situation_id: "wifi-panic", case_roll: 2` → `state.challenge` deep-equals that situation's `challenge`; `state.caseRoll` equals `{ situationId: "wifi-panic", roll: 2, rarity: "common" }` for both host and participant envelopes.
  - `it("falls back to the deck challenge for an unknown situation id")`: `case_situation_id: "gone"` → deck challenge and `caseRoll === null`.
  In `tests/caseControl.test.ts`: `it("blocks opening a case once a prompt was submitted")` (`caseBlockReason(snapshot({ battles: [] }))` with one submission returns a non-empty string), `it("blocks opening a case once battles started")`, `it("allows opening a case with no submissions and no battles")` (returns `null`). Export or re-create a minimal snapshot helper so this test file does not duplicate the fixture (move `snapshot()` into `tests/helpers/snapshot.ts` and import it from both).

- [ ] **Step 2: Run to verify failure:** `pnpm vitest run tests/view.test.ts tests/caseControl.test.ts`. Expected: FAIL (types/fields missing).

- [ ] **Step 3: Add `migrations/0006_case_opening.sql`:** two `ALTER TABLE rooms ADD COLUMN` statements: `case_situation_id TEXT` and `case_roll INTEGER NOT NULL DEFAULT 0`.

- [ ] **Step 4: Implement types and view.** Add `case_situation_id`, `case_roll` to `RoomRow`; add `CaseRollInfo`, `caseRoll` and `open_case` to `src/shared/types.ts`; implement `caseBlockReason`; make `buildEnvelope` resolve the situation via `situationById` and populate `challenge` and `caseRoll`.

- [ ] **Step 5: Implement `open_case` in `applyControl`** in `src/worker/room-hub.ts`: throw `HttpError(409, caseBlockReason(s))` when blocked; otherwise `pickSituation(secureRandom, room.case_situation_id ?? undefined)`, then `db.batch([setRoom("case_situation_id = ?, case_roll = case_roll + 1", pick.id), this.logAction("open_case", { situation: pick.id, rarity: pick.rarity })])`. Add `case_situation_id, case_roll` to both room `SELECT` column lists.

- [ ] **Step 6: Run `pnpm check`.** Expected: build, worker typecheck and all tests PASS. Fix any `SessionState` constructors the typecheck reports.

- [ ] **Step 7: Verify the migration locally:** `pnpm db:apply`. Expected: `0006_case_opening.sql ✅`.

- [ ] **Step 8: Commit** with message `feat: server draws and stores the case situation`.

---

### Task 3: Reel logic, pixel icon and sound (no UI wiring yet)

**Files:**
- Create: `src/case/reel.ts`
- Create: `src/case/sound.ts`
- Create: `src/case/PixelIcon.tsx`
- Test: `tests/reel.test.ts`

**Interfaces:**
- Consumes: `Situation`, `SITUATIONS`, `RARITY_WEIGHTS`, `Rarity` (Task 1); `CaseRollInfo` (Task 2).
- Produces (`src/case/reel.ts`):
  - `const REEL_LENGTH = 40`, `const LANDING_INDEX = 32`, `const REEL_MS = 5200`
  - `buildReelStrip(winner: Situation, random: () => number): Situation[]` (length `REEL_LENGTH`, element at `LANDING_INDEX` is `winner`, decoys drawn with the rarity odds, no two adjacent identical ids)
  - `shouldAnimate(seenRoll: number, current: CaseRollInfo | null, reducedMotion: boolean): "spin" | "fade" | "none"`
- Produces (`src/case/sound.ts`): `playTick(): void`, `playChime(rarity: Rarity): void`, `isMuted(): boolean`, `setMuted(value: boolean): void` (persisted in `localStorage` inside try/catch; never throws).
- Produces (`src/case/PixelIcon.tsx`): `PixelIcon({ situationId, size }: { situationId: string; size?: number })` renders the 12×12 grid on a `<canvas>` with `image-rendering: pixelated`; renders nothing for an unknown id.

- [ ] **Step 1: Write the failing tests** in `tests/reel.test.ts`:
  - `it("builds a strip of REEL_LENGTH with the winner at LANDING_INDEX")`.
  - `it("never repeats a situation back to back")` over 100 seeded strips.
  - `it("only animates when the roll increased")`: `shouldAnimate(0, {situationId:"coupon", roll:1, rarity:"common"}, false) === "spin"`; same roll seen (`seenRoll = 1`) → `"none"`; `current === null` → `"none"`; `reducedMotion = true` with an increased roll → `"fade"`.
  - `it("does not animate on first load of an already-rolled room")`: caller passes `seenRoll` initialised from the current roll, so `shouldAnimate(roll, current, false) === "none"` (documents the contract the overlay relies on).

- [ ] **Step 2: Run to verify failure:** `pnpm vitest run tests/reel.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement `src/case/reel.ts`** per the interfaces. Decoys use the same weighted rarity draw as `pickSituation` (reuse by calling it with the given `random`), re-drawing when equal to the previous tile.

- [ ] **Step 4: Implement `src/case/sound.ts`.** One shared `AudioContext` created lazily on first call; `playTick` is a ~30 ms square-wave blip, `playChime` a short rising two-note tone whose pitch rises with rarity. Both are no-ops when muted or when the context cannot start.

- [ ] **Step 5: Implement `src/case/PixelIcon.tsx`** using `SITUATION_ICONS` and `ICON_PALETTE`; draw each cell as `size/12` px squares (default `size` 72).

- [ ] **Step 6: Run `pnpm vitest run tests/reel.test.ts` and `pnpm build`.** Expected: PASS and build OK.

- [ ] **Step 7: Commit** with message `feat: add case reel logic, sound and pixel icon component`.

---

### Task 4: Projector overlay, presenter button and participant card

**Files:**
- Create: `src/case/CaseReelOverlay.tsx`
- Modify: `src/slides/PresentedSlide.tsx` (mount the overlay in both return paths of `PresentedSlide`, lines ~32-42)
- Modify: `src/PresenterScreen.tsx` (`WritingControl` button row, ~line 261)
- Modify: `src/ParticipantScreen.tsx` (`ChallengeCard`, ~line 77)
- Modify: `src/styles.css` (new `.case-*` rules)

**Interfaces:**
- Consumes: everything from Tasks 1-3; `state.caseRoll`, `state.challenge`, `ControlAction` `open_case`.
- Produces: `CaseReelOverlay({ state, language }: { state: SessionState; language: Language })` which renders nothing unless animating; no props leak into other components.

- [ ] **Step 1: Implement `CaseReelOverlay`.** Keep a ref `seenRoll` initialised to `state.caseRoll?.roll ?? 0` on mount; when `shouldAnimate(seenRoll, state.caseRoll, reducedMotion)` returns `"spin"`, set `seenRoll` to the new roll, render a full-stage overlay with the horizontal strip from `buildReelStrip`, tiles showing `PixelIcon` + title only (language-aware, no department or names) with a rarity-coloured bottom border, a yellow centre line, tick sound on each tile crossing the line, and a CSS transform transition of `REEL_MS` ease-out landing on `LANDING_INDEX`. On landing, play `playChime(rarity)`, show a reveal card (rarity badge, icon, title, scenario) for 4 s, then dismiss; Esc, click, or a Skip button dismisses immediately; `"fade"` shows only the reveal card with a fade. Include a mute toggle button.

- [ ] **Step 2: Mount it** inside `PresentedSlide` so it appears on both the presenter stage and the `?view=projector` window (wrap each return in a fragment with the overlay).

- [ ] **Step 3: Add the presenter button** in `WritingControl`: `btn btn--accent` labelled "Open case" (Thai "เปิดเคส") when `state.caseRoll === null`, "Re-roll case" (Thai "สุ่มใหม่") otherwise, sending `{ action: "open_case" }`; `disabled={busy || locked || state.totalSubmissions > 0}` with a `hint` line explaining why when disabled by submissions.

- [ ] **Step 4: Update `ChallengeCard`** to show `PixelIcon` and a rarity-coloured border class (`case-card--common|rare|epic|legendary`) when `state.caseRoll` is set; no change otherwise.

- [ ] **Step 5: Add CSS** for the overlay, strip, tiles, rarity borders, reveal card, fade and Skip/mute controls. Include `@media (prefers-reduced-motion: reduce)` rules disabling the strip transition.

- [ ] **Step 6: Manual verification** with `pnpm dev` (Node 20+, `.dev.vars` present):
  1. Open `http://localhost:5173`, create a room, open the projector window from the presenter screen.
  2. Open the join link in a second browser window as a participant.
  3. On the presenter's Prompt Writing tab click **Open case**. Expected: reel spins on the projector and presenter stage, tick sound, chime at the stop, reveal card, then the participant phone shows the same title/scenario/task with the rarity border and icon.
  4. Click **Re-roll case**. Expected: a different situation, participant updates.
  5. Refresh the projector window. Expected: the result shows static (no replay).
  6. Submit a prompt as the participant. Expected: **Re-roll case** is now disabled.
  7. Enable OS "reduce motion" or emulate it in devtools and re-roll before submitting. Expected: fade, no spin.
  8. Confirm no screen shows any department or role label.
  Fix anything that fails before moving on.

- [ ] **Step 7: Run `pnpm check`.** Expected: PASS.

- [ ] **Step 8: Commit** with message `feat: case-opening overlay, presenter button and participant card`.

---

### Task 5: Release (needs presenter approval before running)

**Files:** none.

- [ ] **Step 1: Ask the presenter to approve deploying** to `https://4seas-live-training.koonatomw.workers.dev` (the change is public and runs a remote migration).
- [ ] **Step 2: After approval:** `pnpm db:migrate:remote` then `pnpm deploy`. Expected: `0006_case_opening.sql ✅` and `Deployed 4seas-live-training`.
- [ ] **Step 3: Smoke test the live site:** repeat Task 4 steps 3-5 against the deployed URL with a throwaway room.
- [ ] **Step 4: Ask the presenter to review the Thai wording** in `src/shared/situations.ts` and list any edits they want.
