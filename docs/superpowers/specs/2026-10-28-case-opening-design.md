# Case Opening for the Live Prompt Challenge: Design

Date: 2026-10-28. Status: draft for approval.

## Intent and why

Today every session runs the same Live Prompt Challenge: a guest's room is not ready and the writer asks an AI for a polite delay message. The presenter wants the challenge to be a surprise moment that is fun to watch together, like opening a CS:GO case. The presenter opens a case on the projector. A reel spins, slows and lands on one situation. Every participant then writes a prompt for that same situation. Using the same situation keeps Prompt Battle fair, because everyone's prompts are compared on one task.

The situations are all about 4Seas work (hotel, co-living, canteen, events, media, graphics, research, tech, management), so people practise prompting on tasks close to their own jobs.

## Goals

- The presenter can open a case at the start of prompt writing. The result is one situation shared by the whole room.
- A classic reel animation on the projector (horizontal strip, slows to a stop under a yellow line), with rarity colours and a tick and chime sound. Sounds start only after a user click, and there is a mute control.
- Pixel-art icons for each situation (see Icons below), shown on reel tiles and on the revealed card.
- A pool of 14 situations in 4 rarities: Common, Rare, Epic, Legendary. Rarer cases drop less often.
- All participant phones show the chosen situation as soon as the case lands, and the writing flow continues as it does now (up to 3 submissions, pick a final prompt, then Prompt Battle).
- English and Thai text for every situation, matching the existing challenge fields.

## Non-goals

- No AI scoring or AI calls. Prompt Battle remains peer voting only.
- No player inventory, trading, or accounts.
- No editor in the Admin workspace for the pool in this version. The pool lives in code.
- Not changing the five-part checklist, Prompt Battle, results or feedback.

## Anti-goals (a failure even if it technically works)

- Different participants seeing different situations, or the situation changing after a refresh or late join.
- The reel's visual landing disagreeing with the real result.
- Showing people's department or role next to a situation, for example "Tech · Lauren". A person's name may appear inside the scenario sentence (such as the coupon case), but there are no role labels on the reel, tiles or cards.
- The presenter being unable to proceed because of animation or sound problems. Reduced-motion users get a short fade-in instead of the spin, and a "skip" shows the result immediately.

## Constraints

- The existing stack: Vite and React front end, a Cloudflare Worker with a Durable Object (`RoomHub`) and D1. Challenge text already flows through room state as `state.challenge` (title, scenario, task in EN and TH). The chosen situation should use the same `Challenge` shape so the slide, presenter and participant screens need no changes to how they render it.
- The random pick must happen on the server, so every client agrees. Clients only animate toward the server's answer. The result is stored with the room so reloads and late joiners see the same situation.
- Pixel icons are drawn in code as 12×12 grids (a colour per character), rendered on a canvas with nearest-neighbour scaling. No image files. The grids approved in the mockup are the starting point (`.superpowers/brainstorm/*/content/pixel-icons.html`).
- Must work on the projector (large, readable) and on phones (a simple result card, optional mini animation).
- Existing rooms and published plans must keep working. A plan with a fixed challenge behaves as before, and case mode is a presenter choice for the writing step.

## Decisions made together

- Look: classic reel (option A). Crate and slot-machine ideas are dropped.
- Icons: drawn as pixel grids in code. A shaking crate sprite may be added for the idle state.
- No names or roles as labels. Names allowed inside scenario sentences.
- Rarity tiers and rough odds (my first guess at the odds): Common 50%, Rare 30%, Epic 15%, Legendary 5%.

## The pool (English first, Thai to be written during the build and checked by the presenter)

Titles are shown on tiles. Each has a scenario and a task. Details are drafts and may be edited.

Common
1. Wi-Fi Panic: a resident cannot connect 10 minutes before an important video call. Task: a calm step-by-step reply with what to try and who to contact.
2. Menu Change: the most popular lunch dish ran out. Task: a short Thai and English announcement offering two alternatives.
3. Coupon: a co-living resident asks for a food coupon and Sherrie, who gives them out, is not in. Task: a polite reply saying what happens next, with no on-the-spot promise.
4. Wellness Plan: a member asks for a simple weekly routine. Task: a friendly 7-day plan, at most 5 lines per day.
5. Error Message: a colleague sees "Something went wrong" on the booking page. Task: a plain-language reply with the likely cause and one thing to try.

Rare
6. Three Captions: Toto needs a caption for a new event post. Task: 3 options in different tones, each under 25 words.
7. Poster Brief: Nalika needs a poster for a morning yoga session. Task: a prompt that lets an image AI get it right first time (style, colours, text, size).
8. Sort the Facts: three articles disagree about a wellness trend. Task: report only what all three agree on and flag anything uncertain.
9. Rainy Day: a storm cancels a group trip. Task: a message offering a plan B for the same afternoon.

Epic
10. Run Sheet: a messy 3-page brief arrives the night before a big event. Task: a one-page run sheet with times and owners.
11. Workshop in 2 Days: a client wants a 30-person workshop in 2 days. Task: a checklist with deadlines and a short confirmation email.
12. Wrong Room Photo: a resident says the room does not match the website photos. Task: a reply that apologises, explains and offers a fix.

Legendary
13. Upset Partner: a partner is angry about a cancelled event and wants an answer today. Task: a short respectful reply that takes responsibility and makes no promises that cannot be kept.
14. Double Booking: two groups are booked into the same hall on the same night. Task: two messages, one per group, with the same facts and different tones.

15. Room Not Ready (Common): the original challenge. A guest arrives at 4Seas but the room is not ready and the guest waits about 30 minutes. Task: a polite English message explaining the delay and offering a complimentary drink. Decided by the presenter: it is part of the pool, so the pool has 15 situations (6 Common). It also stays the default fixed challenge when case mode is not used.

## Icons

One 12×12 icon per situation, drawn as a grid of single-character colour codes. Palette: dark, white, red, blue, green, yellow, orange, pink, brown, cyan, grey. Rarity colour is the tile border: grey, blue, purple, gold. Approved icon concepts: Wi-Fi with a red dot, a plate with a red X, a ticket with a "?", a heart, a sad browser window, a speech bubble with dots, a palette, a magnifier, a raining cloud, a clipboard with ticks, a calendar with a flame, a cracked picture frame, an angry face, and two keys.

## Left to the builder

- Where to store the drawn situation (a column on the room, or inside the existing room state), and how to broadcast it to participants.
- Exact reel timing, sound assets (small generated or royalty-free tick and chime), and the mute control UI.
- Re-roll is allowed (presenter's decision): the presenter can open the case again, and a new server-side draw replaces the situation. Builder decides the cutoff, such as locking re-rolls once participants have submitted a prompt, so no one loses work.
- How case mode is switched on, such as a button on the presenter's writing step. My guess is a toggle next to "Start prompt submission".
- Thai wording, to be reviewed by the presenter.

## Open questions for the presenter

None. Re-roll allowed and the original challenge in the pool were both confirmed on 2026-10-28.
