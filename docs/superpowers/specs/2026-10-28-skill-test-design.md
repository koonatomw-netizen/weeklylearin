# Skills Segment and Skill Test: Design

Date: 2026-10-28. Status: draft for approval.

## Intent and why

Week 01 teaches prompt engineering. A good prompt is still retyped every week. The presenter wants a short second act that shows the team how to save and reuse instructions as Claude skills: what a skill is, a live example (the grill-me skill by mattpocock), where to find more, and a fast game ("Skill Hunt") in which the room tests whether a skill actually helps. The game has to fit in 10 to 12 minutes, so it is a shared-task, shortlist-based, single before/after test, not an open search.

It also teaches the safety habit: a skill is text (and sometimes scripts) from someone else, so read it before you run it.

## Goals

- Slides (data-only `SlideDoc`s, editable in Training Studio) for the teaching part: what a skill is, a live example, safety (read before you run), the skill test, and a take-home "where to find more".
- A "Skill Test" activity in the live room, placed after the leaderboard and before weekly feedback. Everyone gets the same task, each participant (or pair sharing one phone) picks one skill from a presenter-set shortlist, runs the task in Claude once without the skill and once with it, and pastes both results into the app.
- The room votes anonymously for the result they would rather use. The presenter reveals the top results and a per-skill tally ("which skill won the room").
- The shared task is drawn with the same case-opening reel as the prompt challenge (see `2026-10-28-case-opening-design.md`), so the room gets one fun reveal.
- English and Thai for every new string and slide.
- Whole segment runs in about 10 to 12 minutes: draw 1, pick skill 1, safety glance 2, run and paste 4, vote and reveal 3.

## Non-goals

- The app never installs, runs, or fetches a skill. It only holds text the participants paste.
- No AI scoring and no AI calls. Judging is the room's vote, as in Prompt Battle.
- Not changing Prompt Battle, its tables, or its scoring. The skill test is separate and must not alter battle behaviour.
- No in-app search of skill directories. Finding skills is a take-home slide.
- No per-skill reliability testing (running twice). It may be mentioned as a tip on a slide.

## Anti-goals (a failure even if it technically works)

- Participants pasting confidential 4Seas or guest data into a shared screen. The submit screen carries a clear warning, and results are anonymous until reveal.
- A skill shortlist that nobody has tested. The shortlist ships empty of claims: names and one-line descriptions are placeholders until the presenter fills them in after trying each skill.
- The skill test breaking the existing flow or leaderboard, or being impossible to skip. It must be optional: a room that never starts it behaves exactly as today.
- Presenting unverified claims about third-party skills as fact. In particular, what grill-me does must be checked by the presenter before the session; slide wording about it is marked "verify before presenting".

## Constraints

- Same stack as the app: React and Vite front end, a Worker with the room Durable Object, D1.
- Slides are data only (no HTML or script), use the 4Seas theme tokens, and live widgets are a closed list (`WIDGET_KINDS` in `src/shared/slideDoc.ts`). A new live widget kind (`skill-test`) is needed for the projector view of the activity, and it must also be accepted by the slide validator.
- A separate lightweight store for skill-test entries and votes (new D1 table(s) and a new migration). Do not reuse `prompt_submissions` or the battle tables: they assume a single battle series per room and a 1 to 3 attempt prompt flow.
- The drawn shared task uses the existing `SITUATIONS` pool, stored separately from the prompt challenge's pick so the two never overwrite each other.
- Server decides the draw and tallies the votes. The projector and phones only render.
- Pasted text limits: each result up to 1,500 characters, trimmed, control characters removed (reuse the existing text cleaning approach). One entry per participant, one vote per participant, never for their own entry.
- The existing presenter controls run under `withLock("control")`, so double clicks cannot interleave.

## What the room sees

Presenter flow (each step is a button on the presenter console, like the existing activity controls):
1. **Open skill test.** The projector shows the skill-test widget and the shortlist cards.
2. **Draw task.** The case reel opens and lands on one situation. Everyone's phone shows it.
3. **Open submissions** with a visible countdown (default 4:00, set by the presenter).
4. **Close submissions, then Open voting.** The projector shows entries as anonymous cards with the without-skill and with-skill results side by side.
5. **Reveal.** The top 3 results appear with their skill names, plus a tally of votes per skill.
6. **Continue to feedback.** Weekly feedback works as before.

Participant phone: (a) the drawn task, (b) shortlist cards with a one-line "what it does" and the safety question ("Does it include scripts or ask for access?"), with a tick-box "I read it" (honour system), (c) two paste boxes (without skill, with skill) plus a confidentiality warning, (d) vote screen, (e) a thank-you.

## Slides (new lesson "Week 01 · Part 2: Skills")

1. What is a skill: a recipe card versus telling someone what to cook every time.
2. Example: grill-me (what it is, what it asks Claude to do; presenter verifies wording first).
3. Safety: read it before you run it (two questions, scripts, trusted sources).
4. Skill Test: the live widget.
5. Where to find more: a take-home list of places to browse skills (links as plain text; the presenter fills in).

These are added alongside the existing Week 01 lesson so a plan can include or omit them.

## The skill shortlist

A small list in code (3 to 4 entries), each with an id, English and Thai name, a one-line description, and a source note. The first entry is grill-me. Content other than the grill-me name is placeholder until the presenter has tested the skills. An empty or one-item list must not crash the activity.

## Left to the builder

- The exact table shape, the activity states, and how the new states fit into the existing `activity` field and the presenter's step order.
- Tie-breaking and the exact per-skill tally display.
- Countdown mechanics (server timestamp versus client timer); the server remains the source of truth for when submissions close.
- Whether pairs sharing a phone need any support beyond "one entry per device".
- Thai wording, reviewed by the presenter.

## Open questions

- Which 3 to 4 skills go on the shortlist? (Presenter to test and choose.)
- Should the countdown default be 4:00 as proposed? (Assumed yes.)
