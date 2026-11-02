# Gap analysis: what still needs a code change, and what could be self-service

Scope: read from the code and the admin API as of 2 Nov 2026. Nothing here was tested with real participants. "Today" means what an admin can do in the app without a developer.

The test for each item: **would an admin or presenter have to ask for a code change or run a script to do it?** The items that say yes are the gaps.

## A. Content changes that need code today

| # | Gap | Why it matters | Suggested fix | Effort |
|---|---|---|---|---|
| A1 | **Starter lessons only import once.** Seeds skip anything that already exists, so improved slides (new colours, layouts, fixes) never reach a lesson that was imported earlier. The AI slide needed its own script for this reason. | Every content fix means a script or a manual delete and re-import. | A "Re-import as a new copy" button per starter lesson. It creates "Week 03 (v2)" next to the old one and leaves the old one alone. | Medium |
| A2 | **No export or import of a lesson or plan.** The only way to move content between local and production is the seed endpoints and scripts. | Cannot back up one lesson, share it, edit it offline, or promote local edits to production. | Export lesson or plan as one JSON file, and import from a JSON file. This would replace the seed scripts. | Medium |
| A3 | **New layouts are not in Studio.** Sidebar, Grid, Spotlight and the per-week colour and flip exist only in the generated weeks. | Admins cannot build a slide in those looks or recolour a slide by hand. | Add them to the template list, and a "colour" picker that recolours a whole slide or lesson. | Small |
| A4 | **No "copy lesson".** Plans can be copied, lessons cannot. | Making a variant of a week means rebuilding it. | Copy lesson with all slides. | Small |
| A5 | **Teaching scripts live only in `docs/`.** The presenter screen shows slide notes, not the full script. | Presenter needs a second window. | Load each week's per-slide script into slide notes, from the same data. | Small |

## B. Settings that are fixed in code

| # | Gap | Where it is now | Suggested fix | Effort |
|---|---|---|---|---|
| B1 | **AI on/off, model and limits.** 6 requests per person per minute, 150 per room per 10 minutes, 4 at once. Model comes from an environment variable. | `room-hub.ts`, `ai.ts` | A Settings page backed by a small settings table. A kill switch for AI is the most useful part. | Medium |
| B2 | **Room rules.** Max participants, attempts, prompt min and max length. | `shared/` constants | Same Settings page. | Small |
| B3 | **Branding.** The footer "4Seas Nimman · Chiang Mai" and the "4Seas · live training" line are written into every template. | `slideKit.ts` and others | Make them settings and read them when slides are created. Existing slides keep their text. | Small |

## C. Operations

| # | Gap | Suggested fix | Effort |
|---|---|---|---|
| C1 | **No way to check the AI connection.** The misnamed secret earlier was only found by listing secrets in a terminal. | A "Check AI" button in admin that sends one tiny test request and reports ok, busy, or key missing. Highest value per effort in this list. | Small |
| C2 | **No visibility into AI use.** Token Me has a budget of $5 per day and 5 requests at once, and the app shows neither. | Count calls, failures and busy responses per day on the Dashboard. | Medium |
| C3 | **Session cleanup is manual.** Delete and "delete finished" were added today. Old test rooms still pile up if nobody clicks. | Optional automatic delete after N days, from Settings. | Small |
| C4 | **No backup button.** Database export is a command-line step. | "Download backup" in admin, or a scheduled export. | Medium |
| C5 | **Deploys are manual and `main` is out of date.** There is no CI. The GitHub account on this machine cannot push to `main`, so production is running code that is not on `main`. | Fix GitHub access, merge, then add a CI job for typecheck and tests. Deploy stays manual on purpose. | Small once access is fixed |
| C6 | **Secrets are not visible in the app.** Which of `ADMIN_PASSPHRASE`, `HOST_PASSPHRASE`, `TOKENME_API_KEY` is set can only be seen with wrangler. | An environment panel showing set or missing, never the values. | Small |

## D. Engine features the roadmap still needs

Taken from `docs/ROADMAP-12-WEEKS.md`. The weeks are playable today with workarounds.

| # | Gap | Weeks affected | Today's workaround |
|---|---|---|---|
| D1 | Voting on open answers | 5, 7 | Prompt Battle votes on prompts instead |
| D2 | Teams (one phone per team, team name on the leaderboard) | 12 | Teams share one phone and the name they typed |
| D3 | Images in quiz questions | 4, 9 | Show the image on the slide and ask on the phone |
| D4 | Workflow Builder form and share wall | 11 | A typed game answer wall |
| D5 | Live Head-to-Head between two AI models | 5, 10 | Answers prepared in advance |

## E. Quality and risk

- **Only shared logic is tested.** The 187 tests cover slide rules, layouts, games and AI parsing. The worker routes, the admin screens and the participant flow have only the smoke scripts in `scripts/`, which are not run automatically. The delete-session endpoint was checked against the local database (children are removed with the room), but its button has not been clicked in a browser.
- **Slides were checked mechanically, not by people.** The overlap and fit checks pass on all 129 generated slides, and about 12 were looked at by eye. Nobody has run a week with real participants.
- **Thai wording has had no native review.** The Thai text was written by the assistant.
- **Data policy for Token Me is unreviewed.** Participants should use practice data only. This is a business decision, not a code change.

## Suggested order

1. **C1 Check AI button** and **C6 environment panel**: small, and they would have caught this week's secret mistake.
2. **A2 Export and import** and **A1 Re-import as copy**: they remove the need for seed scripts and for asking for code changes after each content fix.
3. **B1, B2, B3 Settings page**: one table and one screen cover all three.
4. **A3 and A4**: small additions to Studio.
5. **C5**: fix access and merge before anything else is deployed.
6. **D1 to D4**: only after a pilot shows which weeks people actually use.
