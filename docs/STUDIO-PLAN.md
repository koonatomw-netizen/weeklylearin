# 4Seas Training Studio — Assessment & Plan

Status: **Phases 1–2 implemented** (approved with option A admin sessions; R2 planned for Phase 3). Phases 3–6 are still proposals unless marked delivered below.

## Phase 2 — delivered

- **Slide Builder** (`src/admin/Builder.tsx`, `Properties.tsx`): slide list, 16:9 canvas and properties panel. It reuses `SlideRenderer`, so the editor draws slides exactly as Presenter Mode will.
- **Canvas:** click to select, Shift-click to multi-select, Ctrl+A for all. Drag to move with snapping to canvas edges and centre and to other elements (Alt turns it off). Eight resize handles with edge snapping (Shift keeps the aspect ratio). Arrow-key nudges (Shift moves 10). Double-click or Enter edits text inline; Ctrl+Enter or clicking away commits, Esc cancels.
- **Insert:** text, rectangle, rounded rectangle, ellipse, line, terminal window, and the 6 live widgets. The image button is disabled until Phase 3.
- **Properties:** x, y, w and h; align to canvas or to the selection; reveal step; lock; layer order; duplicate and delete. Text: font, size, A−/A+ (keeps hierarchy), bold, italic, bullets, horizontal and vertical alignment, colour. Shape: kind, fill, stroke, width, opacity. Window title and border. Widget kind. Slide title, background and presenter notes. A layers list (top first) with lock toggles.
- **Undo/redo** (100 steps). A whole drag counts as one step.
- **Autosave:** 0.9 s debounce, saves serialised, with a visible status. Saves are optimistically locked; a conflict offers "Load theirs" or "Keep mine". The browser warns before closing with unsaved work, and pending work is flushed when you switch slides.
- **Preview** and fullscreen preview with reveal steps. The Library has Edit and Open in Builder entry points.
- **Tests:** 11 new unit tests for the editor operations (move, duplicate, layers, align, snap, resize, text round-trip, validator compatibility). Browser-verified: select, drag (saved as v2), undo (v3), inline text edit (v4), insert and recolour an ellipse (v6), the conflict banner, Load theirs, and preview.
- **Limits:** formatting applies to a whole text box; individual words can't be styled in the editor yet, although existing mixed-colour words are preserved unless that line is edited. No rotation, copy/paste between slides, or drag-to-reorder thumbnails yet.
Baseline: commit `9d88a05` on `main`, local D1 at migrations 0001–0003.

## Phase 1 — delivered

- **Migration `0004_training_studio.sql`** (additive): `admin_sessions`, `admin_actions`, `lessons`, `slides`, `slide_assets`, `training_plans`, `training_plan_slides`, `training_snapshots` (immutable via trigger), `rooms.snapshot_id` (NULL for every existing room). Applied to local D1 only.
- **Admin auth:** `ADMIN_PASSPHRASE` secret, separate from `HOST_PASSPHRASE` (the presenter passphrase is refused). It issues a 12-hour session token, stored only as a SHA-256 hash. Logins are rate-limited, logout revokes the session, and every `/api/admin/*` route checks the session server-side. Mutations are written to `admin_actions`.
- **Slide model:** `src/shared/slideDoc.ts` defines the types and a validator shared by client and server. Text, image, shape, window and widget elements; theme color tokens and a fixed font-size scale; reveal steps; limits. Unknown keys are dropped and text is stored as plain text.
- **Renderer:** `src/slides/SlideRenderer.tsx` draws onto the existing 1600×900 `SlideStage`, using React text nodes only. Live widgets render as labelled placeholders until Phase 4.
- **Templates:** the 9 templates (`src/shared/templates.ts`) and the 7-slide Week 01 deck converted into an importable starter lesson.
- **API:** `src/worker/admin.ts` covers login, logout and me; the dashboard; lessons (list, create, update, archive and restore); slides (create from a template or by duplicating, insert-after, update with optimistic version locking, delete, reorder); and the idempotent Week 01 import.
- **UI:** `?view=admin`, lazy-loaded as a separate ~11 KB gzipped chunk. Sign-in, the 7-section nav (later phases marked P2/P4/P5), Dashboard, and a Lesson Library with thumbnails, template picker, rename, reorder, duplicate, insert, delete, archive, and a preview with reveal steps and fullscreen.
- **Tests:** 21 unit tests (7 new for the validator, templates and seed); `scripts/smoke-admin.mjs` with 53 API assertions; the existing 185-assertion room smoke test still passes. Browser-checked at 1440×900 and 375×812 with no console errors from the new code.
- **Not in Phase 1 (by plan):** the visual editor (drag, resize, text editing, undo, autosave — Phase 2), image upload (Phase 3), planner, publishing and Presenter Mode using JSON slides (Phase 4). Rotation was dropped from the element model to keep the first editor simple. Admin UI labels are bilingual only for navigation and key actions.

---

## 1. Repository assessment

### Stack
- React 19 + TypeScript + Vite. Query-string routing (`?view=host|projector|join|participant`). One CSS file with design tokens for dark and light themes.
- Cloudflare Worker (`src/worker/index.ts`), one `RoomHub` Durable Object per room (`room-hub.ts`, rules + WebSocket push), D1 for all records. Static assets are served by Workers Assets.
- Not deployed. `wrangler.jsonc` still has a placeholder `database_id`. No R2 bucket.

### What exists and is verified locally
I checked these against the code and the test suite rather than assuming them: 14 unit tests, plus a smoke test with 185 assertions run against `wrangler dev`.

| Feature | Where | Verified |
|---|---|---|
| Six-digit room code, QR join, nameable participants | `index.ts`, `JoinScreen`, `ui.tsx QRStamp` | smoke test |
| Presenter navigation (slide + reveal step, synced projector, fullscreen) | `PresenterScreen`, `ProjectorScreen`, `rooms.current_slide/slide_step` | smoke test + browser |
| Prompt writing (3 attempts), self-check, final pick | `room-hub.ts submit/checklist/final` | smoke test |
| Mini battles, voting, reveal, Grand Final, ties, manual resolve | `room-hub.ts applyControl`, `shared/battle.ts` | smoke test + unit |
| Leaderboard, battle CSV | `view.ts`, `exportCsv` | smoke test |
| Mandatory weekly feedback, completion dashboard, management-only answers, CSV | `FeedbackForm`, `weekly_feedback`, `/responses`, `/feedbackcsv` | smoke test + browser |
| Not verified | real phones, a real projector, production deploy | — |

### Current limits that this upgrade has to change
1. **The slides are code.** The 7 slides are hand-written React in `src/slides/Deck.tsx`, and the Week 01 challenge text is hard-coded in `shared/challenge.ts`. `SLIDE_STEPS`/`TOTAL_SLIDES` are compile-time constants, and the server validates `current_slide` against them.
2. **There is no admin identity.** One shared `HOST_PASSPHRASE` mints a per-room host token. There is no admin session, no roles, and no per-person audit.
3. **There is no object storage**, so images can't be uploaded today.
4. **Feedback and results are per room.** Nothing groups rooms into "weeks" or "plans", so history means listing rooms.

### Reusable as-is
- `SlideStage`: a 1600×900 fixed canvas scaled to fit. This is the key to editor and presenter rendering matching exactly.
- All live room machinery: `RoomHub`, tickets/WebSocket/polling (`useRoom`), voting rules, DB triggers, feedback endpoints.
- The live slide components (join panel + QR, live stats, battle board, results table). They become **widgets** inside the new slide model.
- The design system (tokens, `TerminalWindow`, buttons, inputs), CSV helpers, rate limiter, `cleanText`, hashed tokens.
- The legacy `slide_templates`/`template_versions` tables stay untouched but go unused (they hold the old text-slide format).

---

## 2. Proposed architecture

```
/?view=admin&tab=…   (new, lazy-loaded bundle)
 ├─ Dashboard        next session, drafts, recent feedback completion
 ├─ Planner          training_plans → pick lesson slides → order → publish snapshot
 ├─ Library          lessons → slides (JSON) → Slide Builder
 ├─ Slide Builder    3-pane editor: slide list · canvas · properties
 ├─ Live Sessions    start a room from a published plan → existing Presenter
 ├─ Feedback         cross-session completion + management-only answers
 └─ History          past sessions, snapshot replay, CSV exports

Worker
 ├─ /api/admin/*     admin-session protected CRUD (lessons, slides, assets, plans, publish, reports)
 ├─ /api/assets/:id  serves uploaded images from R2 (immutable, correct content-type)
 └─ /api/rooms/*     unchanged; rooms optionally point at a published snapshot
```

### 2.1 Admin authentication — **decision needed**
| Option | How | Trade-off |
|---|---|---|
| **A. Admin session (recommended for Phase 1)** | `POST /api/admin/login` with `ADMIN_PASSPHRASE` (a Worker secret, separate from the presenter passphrase) issues a random token, stored as a SHA-256 hash in `admin_sessions` with a 12-hour expiry. It is sent as `Authorization: Bearer`, rate-limited, and supports logout and revocation. Every `/api/admin/*` route checks it server-side. | No new services and works locally. It's still one shared credential, so the audit log can only say "an admin", not which person. |
| B. Cloudflare Access in front of `/admin` | Zero Trust policy by email (free for small teams); the Worker verifies the `Cf-Access-Jwt-Assertion`. | Real per-person identity and audit. Needs dashboard setup and only applies to the deployed site; local dev falls back to A. |

Plan: build A now, structured so B can be added later without changing the routes (`adminId` comes from either source).

### 2.2 Slide document model (JSON, never HTML or JS)
```ts
interface SlideDoc {
  schema: 1;
  background: { token: "bg" | "surface" | "accent-soft" } | { assetId: string };
  elements: SlideElement[];          // array order = layer order (last is top)
  notes?: string;                    // presenter-only, stripped for participants
}
type SlideElement = Base & (
  | { type: "text"; paragraphs: Array<{ runs: Array<{ text: string; bold?: boolean; italic?: boolean; color?: ColorToken }>; align?: "left"|"center"|"right"; size: FontSize; font: "sans"|"mono" }> }
  | { type: "image"; assetId: string; fit: "cover"|"contain"; alt: string }
  | { type: "shape"; shape: "rect"|"rounded"|"ellipse"|"line"; fill?: ColorToken; stroke?: ColorToken; strokeWidth?: 1|2|4 }
  | { type: "window"; title: string }                     // terminal-window frame
  | { type: "widget"; widget: WidgetKind }                // live, see 2.3
);
interface Base { id: string; x: number; y: number; w: number; h: number; rotation?: 0|90|180|270; step?: number /* appears at reveal step n */; locked?: boolean }
```
- Coordinates are in **1600×900 canvas units**, so the editor, presenter and projector all render through the same `SlideRenderer` inside `SlideStage`. Each layout is computed once.
- **Theme constraints:** colors are tokens (`text`, `text-2`, `accent`, `success`, `danger`, the five formula colors…) and font sizes come from a fixed scale (20–120). Raw CSS is never stored.
- **Sanitising:** a hand-written server validator (shared with the client) rejects unknown keys and types, clamps numbers, caps text length and element count (≤ 60), and only accepts `assetId`s that exist in `slide_assets`. Text is rendered as React text nodes, so there is no `dangerouslySetInnerHTML` anywhere.
- **Progressive reveal:** `element.step` replaces the hard-coded `SLIDE_STEPS`. A slide's step count is `max(step)`, which the server now reads from the snapshot instead of a constant.

### 2.3 Interactive widgets (live, not mockups)
| Widget | Bound to | Server actions it uses |
|---|---|---|
| `join` | room code, QR, join URL | — |
| `live-stats` | participants / submitted / status | — |
| `challenge` | the plan's challenge text (title, scenario, task) | `activity: writing` |
| `battle` | active battle, vote progress, reveal bars | open / close / reveal / next / final |
| `leaderboard` | final rankings | `show_results` |
| `feedback-status` | completion % only (never answers) | `start_feedback` |

Widgets reuse today's components. In the editor they render with sample data under a "LIVE" badge; in Presenter mode they read `room.state`. The **Prompt Battle challenge moves out of code** into the plan (`training_plans.challenge_json`) and is copied into the snapshot, then into the room.

### 2.4 Data model — migration `0004_training_studio.sql` (additive only)
| Table | Purpose | Key columns |
|---|---|---|
| `admin_sessions` | admin login sessions | `token_hash` PK, `created_at`, `expires_at`, `revoked_at` |
| `lessons` | library items | `id`, `title`, `category`, `description`, `created_at`, `updated_at`, `archived_at` |
| `slides` | editable slides | `id`, `lesson_id` FK, `position`, `title`, `doc_json` (SlideDoc), `version` (optimistic lock), `updated_at` |
| `slide_assets` | uploaded images | `id`, `r2_key`, `mime`, `bytes`, `width`, `height`, `sha256`, `created_at` |
| `training_plans` | weekly plan | `id`, `title`, `week_date`, `duration_min`, `notes`, `challenge_json`, `status` (draft/published), `copied_from`, timestamps |
| `training_plan_slides` | ordered selection | `plan_id`, `slide_id`, `position` — `UNIQUE(plan_id, position)` |
| `training_snapshots` | immutable published deck | `id`, `plan_id`, `version`, `deck_json` (slides + challenge, frozen), `published_at` — `UNIQUE(plan_id, version)`, plus a trigger that blocks UPDATE |
| `rooms` (+ column) | link a session to a snapshot | `snapshot_id` NULL; **NULL keeps today's built-in Week 01 deck** |
| `admin_actions` | audit | `id`, `action`, `detail_json`, `created_at` |

- **Snapshot stability:** publishing copies the slide docs into `deck_json`. Rooms reference the snapshot id, never library slides, so editing a library slide later can't change history. Assets are immutable (content-addressed by `sha256`) and are never deleted while any snapshot references them.
- **Size:** D1 rows are limited to about 2 MB. A 40-slide deck of JSON is about 100–300 KB, which is fine. Images live in R2, not D1.
- **Delivery:** the deck is **not** sent in the per-change WebSocket broadcast. Clients fetch `GET /api/rooms/:code/deck` once; the response is immutable and cacheable, and the presenter notes are stripped for participants.

### 2.5 Image storage — **decision needed**
- Recommended: **Cloudflare R2** bucket `4seas-training-assets` bound as `ASSETS_BUCKET`. The free tier covers 10 GB, which is plenty, but Cloudflare asks for a payment method on file before R2 can be enabled.
- Upload rules: admin only; PNG, JPEG or WebP only, checked by magic bytes and not the file extension; at most 5 MB; SVG refused (it can carry script). Files are served through the Worker with `Content-Type` set from the stored mime, `X-Content-Type-Options: nosniff` and immutable caching.
- Local dev uses Wrangler's local R2 emulation, so nothing touches the cloud.
- Fallback if you don't want R2: images up to about 1 MB stored in a D1 table. This works, but it isn't recommended past a handful of images.

---

## 3. Implementation phases (each ends with tests and a commit)

| Phase | Scope | Done when |
|---|---|---|
| **1 — Foundation** | Migration `0004`; admin login/logout (option A); `/api/admin/*` guard + audit; shared `SlideDoc` types + validator; `SlideRenderer` (text, shape, window, widget placeholders) inside `SlideStage`; **Admin shell** (nav: Dashboard, Planner, Library, Builder, Live, Feedback, History; unfinished sections clearly marked); **Lesson Library CRUD** (create/rename/archive lessons; add/duplicate/delete/reorder slides; create from the 9 templates); slide thumbnails via the renderer; the seven Week 01 slides converted into a seed lesson | Unit tests (validator, templates, renderer smoke), API tests (auth required, CRUD, rejected payloads, optimistic version conflict), existing 185 smoke assertions still pass |
| 2 — Visual Slide Builder | 3-pane editor; select / multi-select; drag, resize with handles and snapping; inline text editing (runs, bold/italic, size, align, color tokens); shapes; layer order; reveal step per element; undo/redo (command history, 100 steps); debounced autosave with version check and "saved/unsaved" status; preview + fullscreen preview; keyboard shortcuts | Editor round-trip tests: edit → save → reload gives an identical doc, and editor vs presenter render the same DOM geometry |
| 3 — Images | R2 binding, upload endpoint + validation, asset picker, image element, background images | Upload rejects SVG/oversize/mismatched types; asset URLs are served with nosniff |
| 4 — Planner + Live integration | Plans CRUD, pick and reorder slides across lessons, challenge editor, duplicate last week, draft/preview/publish → snapshot; Live Sessions starts a room bound to a snapshot; Presenter/Projector/participants render the snapshot; step counts from the snapshot; interactive widgets wired to live state; legacy rooms keep the built-in deck | **Snapshot stability test:** publish → edit library slide → room deck unchanged. Full live smoke test run on a snapshot-backed room |
| 5 — Feedback & History | Cross-session feedback dashboard (completion, average rating, management-only answers), history list with snapshot replay, combined CSV exports, simple manual tagging of recurring issues | Access-control tests on every report endpoint |
| 6 — Hardening | Mobile/admin responsive pass, accessibility pass, load check (~60 participants), deploy guide update | Checklist signed off; still no production deploy without your go-ahead |

---

## 4. Risks & compatibility notes

- **Backward compatibility:** every existing room keeps working. `snapshot_id IS NULL` means the bundled Week 01 deck plus the hard-coded challenge, exactly as today. All migrations are additive. Legacy tables and rows are left alone.
- **Rendering fidelity:** using a fixed 1600×900 coordinate space and one renderer for both editor and presenter removes most drift. The residual risk is Thai line-breaking and font loading differing between browsers. Mitigation: fonts are bundled through Google Fonts with `display=swap` and awaited before measuring, and the editor shows a text-overflow warning.
- **Losing the bespoke animations:** the hand-built Week 01 interactions (expanding formula cards, animated highlights) become simpler element-level reveal steps when converted to JSON. The original code deck stays available for legacy rooms.
- **Shared admin credential (option A):** no per-person audit until Cloudflare Access (option B) is added.
- **Concurrent editing:** two admins on the same slide would get version-conflict errors (optimistic locking) rather than real-time co-editing. This is acceptable for a small team.
- **R2 enablement** needs a payment method on the Cloudflare account, even within the free tier.
- **Bundle size:** the editor will roughly double the JS, so the admin area is lazy-loaded and phones only download the participant code.
- **Scope:** this is a practical editor (text, images, shapes, layers, reveal steps), not a PowerPoint clone. No tables, charts, animations timeline, or real-time collaboration in this plan.
- **Production:** no deploy and no remote migrations without your explicit confirmation. The README already documents backing up the database before a migration.
