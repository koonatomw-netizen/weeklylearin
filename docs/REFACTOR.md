# 4Seas Live Training — Refactor Notes

## 1. Codebase audit (before refactor)

| Area | What existed | Verdict |
|---|---|---|
| Stack | React 19 + Vite + TypeScript, plain CSS (`styles.css`), `lucide-react`, `qrcode` | Kept. Tailwind was **not** introduced: the existing app uses a token-based stylesheet and switching would be a full rewrite with no functional gain. The new design system uses CSS custom properties for both themes. |
| Worker | `src/worker/index.ts` — routes `/api/*`, creates rooms with `HOST_PASSPHRASE`, serves SPA assets | Kept, routes updated, AI config removed, basic rate limiting added. |
| Real-time | `RoomHub` Durable Object, hibernating WebSockets, one-time socket tickets, per-role state envelopes | Kept. Broadcast now builds one DB snapshot per change instead of one per socket. Client gained a short-polling fallback. |
| Database | D1: `rooms`, `participants`, `submissions` (2 attempts, AI rubric), `slide_templates`, `template_versions` | All tables and data kept. New tables added by an additive migration (`0002`). Local D1 had 1 room / 1 participant / 1 submission at audit time. |
| AI evaluation | `scoring.ts` (OpenRouter / OpenAI / Anthropic + demo heuristic), `scoring-demo.ts`, scoring tests, `try-live-scoring.mjs`, `SCORING_PROVIDER` var | Removed from the build and moved to `legacy/ai-scoring/`. No AI endpoints or keys are needed. |
| Auth | Host passphrase → random host token (SHA-256 hash in D1); participant tokens hashed in D1 | Kept. Presenter actions still checked server-side on every request. |
| Room code | 6 alphanumeric chars | New rooms use **6 digits**. Old alphanumeric codes still resolve. |
| Slides | 8 text slides stored as editable bilingual JSON templates + `SlideEditor` | Replaced with 7 native React slides. Editor moved to `legacy/`; template tables untouched. |
| Views | Landing, Join, Host, Projector, Participant | Rebuilt on the new design system with the same routes (`?view=host|projector|join|participant`). |
| Leaderboard | Rank by AI score + "most improved" | Replaced by peer-vote battle ranking. |
| Tests | Vitest unit tests (scoring, leaderboard), `scripts/smoke-room.mjs` | New unit tests for grouping/scoring/ranking; smoke script rewritten for the battle flow. |

## 2. Refactoring plan

1. **Data model** — migration `0002_prompt_battle.sql`: `prompt_submissions` (max 3, request-id idempotency), `final_selections`, `battles`, `battle_entries`, `votes` (unique per voter per battle, triggers block self-votes and voting on closed battles), `presenter_actions`. New `rooms` columns: `activity`, `slide_step`, `active_battle_id`.
2. **Backend** — `RoomHub` rewritten around the flow *Write → Self-Check → Improve → Select Final → Battle → Vote → Reveal*, with a single `/control` endpoint for presenter actions.
3. **Shared logic** — `src/shared/battle.ts`: grouping (3–4 per group), battle score, ties, final leaderboard. Pure functions, unit-tested.
4. **UI** — dark/light terminal-inspired design system, 16:9 scaled slide canvas, presenter modes, mobile-first participant flow.
5. **Testing** — unit tests + end-to-end HTTP/WebSocket smoke test + browser checks.

See `README.md` for running, testing and deployment.

## 3. Summary of changes

**Removed (moved to `legacy/`, excluded from build):** AI scoring providers and demo heuristic (`scoring.ts`, `scoring-demo.ts`), scoring tests, `try-live-scoring.mjs`, AI-score leaderboard, `SCORING_PROVIDER` var, AI score/feedback UI, slide-template editor and its API routes, old planning docs.

**Retained:** Worker + D1 + `RoomHub` Durable Object architecture, hashed host/participant tokens, one-time WebSocket tickets, CSV formula-injection escaping, EN/TH language switch, projector window, LAN join-origin setting, all existing tables and rows (`rooms`, `participants`, `submissions`, `slide_templates`, `template_versions`).

**Added:** migration `0002`; six-digit numeric room codes; 3-attempt submissions with idempotent request ids; self-check checklist; final prompt selection (auto-fill latest); randomized persistent 3–4 groups; peer voting with DB-level guards; presenter-controlled reveal; vote-share bars; tie handling (mini: all tied advance; final: tie-break / shared / manual with reason); Grand Final; final leaderboard; presenter action log; new CSV export; basic rate limits; polling fallback and reconnect with backoff; dark/light theme with persistence; terminal-inspired design system; 7 native 16:9 slides with progressive reveal and fullscreen; mobile-first participant flow.

## 4. Test results (local, 2026-10-26)

- `vitest`: 13/13 passed (grouping 3–80, edge sizes, scoring, ties, leaderboard order, per-role visibility).
- `scripts/smoke-room.mjs`: 150/150 assertions passed against `wrangler dev`: room creation, 7 joins, duplicate names, presenter-only endpoints, early/late submissions, double-click dedup, 4th attempt, concurrent submission race, checklist, final selection (own only), auto-fill, 3+3 grouping, refresh persistence, finals lock, vote before open, competitor vote, host-token vote, duplicate and changed votes, idempotent retry, hidden counts, late vote, 2/4 = 50 score, mini tie, Grand Final tie → tie-break, manual resolution with reason, leaderboard visibility, CSV escaping, WebSocket push.
- Direct SQL against local D1: self-vote and vote-update triggers abort as expected; the legacy room `5MG9DX` and its submission are intact.
- Browser (in-app, emulated): all 7 slides at 1440×900 in dark and light, presenter tabs, 375×812 participant writing → self-check and voting → confirmation, results screen; no horizontal overflow; no console errors.
- `wrangler deploy --dry-run`: bundles successfully (12.6 KB gzip) with `DB` and `ROOMS` bindings.

**Not verified:** real phones and a real projector, actual Fullscreen API entry (only the code path), forced network disconnection in a browser (the polling fallback is implemented but was not exercised), and a production deployment.

## 4b. Mandatory weekly feedback (added 2026-10-26)

- Changes: migration `0003_weekly_feedback.sql`; `feedback` activity plus a `start_feedback` presenter action; `POST /feedback`, presenter-only `GET /responses` and `GET /feedbackcsv`; `FeedbackForm.tsx`; a presenter **Feedback** tab.
- Answers never enter the broadcast snapshot; only status and rating do. Identity comes from the token. The table has no link to battle data.
- Tests: 14/14 unit tests; the smoke test now has 185 assertions (35 new). The new checks cover feedback before open, participant opening feedback, missing/invalid/whitespace/too-long fields, "None" and "ไม่มี", duplicates and a concurrent double-submit, a spoofed name and participant id, state after refresh, completion counts and average, answers absent from host and participant state, 401 on responses and CSV for participant or no token, the CSV with pending rows, Thai text and formula escaping.
- Browser (375×812): validation messages, draft restored after a reload, submission, confirmation after a reload, and the presenter dashboard with the management panel.
- Not verified: real phones, and a production migration.

## 5. Known limitations

- Rate limiting is in-memory per Durable Object / Worker isolate: enough to stop accidental floods and passphrase guessing bursts, not a distributed limiter.
- Presenter access is a bearer token in that browser's localStorage. Anyone at that browser can control the room.
- The presenter's optional "show authors" toggle in Battle Control matches entries to authors by prompt text.
- The bilingual slide-template editor was retired; slides are now code (`src/slides/Deck.tsx`, `src/shared/challenge.ts`).
