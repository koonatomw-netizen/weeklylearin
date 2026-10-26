# 4Seas Live Training — Implementation Plan

## Goal
Build a usable local MVP for a bilingual, in-person Week 01 workshop, with a real-time room architecture that can later run on Cloudflare Workers, Durable Objects, and D1. Clearly label demo scoring and leave paid AI credentials unset.

## Phases
1. **Project foundation:** React + TypeScript app, Cloudflare Worker/Durable Object/D1 scaffold, local development scripts, and environment example with no secrets.
2. **Training experience:** polished Thai-English host, projection, and participant views; room-code/QR join flow; synchronized slides, prompts, attempts, feedback, and leaderboard.
3. **Week 01 lesson:** 28-minute agenda, fictional 4Seas customer-event brief, two prompt attempts, 100-point rubric, discussion and wrap-up.
4. **Host tools:** editable slide templates with draft/published snapshots, independent host authentication boundary, CSV export, and demo scoring adapter plus server-only provider adapter contracts.
5. **Verification:** run build and focused tests, inspect the experience in a browser if the local preview is available, document setup and honest limitations.

## Scope decisions
- Implement a functioning local real-time room using the Durable Object WebSocket design; use an in-memory local scoring adapter and mark its feedback as demo-only.
- Keep any OpenAI/Claude calls server-side behind explicit configuration; no API keys or live-provider claims are included.
- Keep the implementation focused on the requested training flow, avoiding deployment and unrelated account or analytics features.

## Visual direction

- **Color tokens:** Salt Paper `#F5F4EE` is the warm white canvas; Deep Navy `#173441` carries projection and navigation; Harbor Teal `#247A76` marks the active workshop step; Sea Glass `#C9DED6` supports calm highlights; Brass `#B78A4A` marks time or awards; Charcoal `#26373A` is the reading ink.
- **Type:** Instrument Serif gives English slide titles a quiet editorial voice. IBM Plex Sans Thai carries Thai headings, body copy, controls, and scores so Thai remains clear at a distance. Keep body copy at a comfortable size and keep lines short.
- **Layout:** The presenter console is a three-part workbench: narrow agenda rail, a broad current-slide and speaker-note area, then a compact learner/status strip. The projection view gives one idea the full 16:9 screen, with the join code and QR at the edge. The learner view is a single readable activity column; the prompt field stays separate from the projection stage.
- **Principles:** Use the five prompt parts as the visual signature, like labeled fields on a facilitator's working sheet. Keep one active accent, use alignment and timing to explain sequence, avoid repeated feature cards, and keep learner activity private. A language switch changes content without changing the structure.

### Layout sketches and review

```text
Presenter:  [agenda] [current slide + host notes] [room / learners / next]
Projector:  [large slide idea, bilingual body]                 [join QR]
Learner:    [current activity] [prompt field] [private feedback]
```

The warm-white canvas can look generic if paired with a standard SaaS card grid. Keep the palette because it matches the requested direction, and make the workshop itself distinctive through a typographic slide stage, a slim teal progress rail, and a five-part prompt worksheet. Avoid decorative gradients and repeated rounded cards.
