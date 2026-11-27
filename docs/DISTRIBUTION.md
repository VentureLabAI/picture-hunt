# Picture Hunt — Distribution Playbook

**Owner:** Caleb
**Last updated:** 2026-11-26
**Status:** measurement and free-pass codes are built (see "Links to use" and
"Measurement"). Checkout is not live yet, so for now this playbook proves reach and
engagement, not sales.

## Links to use (each one is counted separately)

| Where you post it | Link |
|---|---|
| TikTok bio | `https://picturehunt.app/?c=tiktok` |
| Instagram bio | `https://picturehunt.app/?c=instagram` |
| YouTube Shorts | `https://picturehunt.app/?c=youtube` |
| Anywhere else | `https://picturehunt.app/?c=<short-name>` (lowercase letters, digits, dashes) |
| A preschool | free-pass link + QR image from `node worker/mint-code.mjs <preschool-name>` |
| One creator | `node worker/mint-code.mjs creator-<name> --personal` |

The label after `?c=` is all that is recorded: no personal data. A plain
`picturehunt.app` link still works; it just shows up as "(no label)".

The goal of Phase 3 (see STRATEGY.md) is cheap, organic proof that this product
can be distributed at all. We are NOT buying ads yet. The 30-day signal is one
piece of content over 50k views; the 60-day signal is 30+ paying customers from
organic traffic.

Positioning to lead with everywhere: **"My toddler is learning Spanish by going
on scavenger hunts around the house."** The bilingual angle is the hook; the
camera is the wow; the kid-on-their-feet is the differentiator.

---

## Channel 1 — TikTok / Instagram Reels / YouTube Shorts (primary)

This is the highest-leverage channel because the product is inherently
filmable: a real kid running around finding things and a tablet talking back in
Spanish is native short-form content, not an ad.

**Cadence:** aim for 10 videos over 2-3 weeks. Most will flop; you're fishing
for the one that hits the algorithm. Post the same video to all three platforms.

**Format rules:**
- Vertical 9:16, shot on a phone, natural light. Polished = scrolls past.
- Hook in the first 2 seconds (text on screen + the kid already in motion).
- Show the kid's hands/back, never the face (privacy + relatability).
- Real tablet audio audible — the fox's voice saying "¿Una manzana?" is the moment.
- 15-30 seconds. End on the celebration (confetti + sticker).
- Caption is a sentence, not a pitch. Link in bio.

### Ten hook scripts (text-on-screen + what's happening)

1. **"POV: your 3yo is learning Spanish and doesn't know it"** — kid hears "find an apple — una manzana," runs to kitchen, snaps apple, confetti. Caption: "She thinks it's a game. It's a Spanish lesson. 🍎"
2. **"Apps I actually let my toddler use 🧵"** — quick montage of 3 finds in Spanish. Caption: "No ads, no creepy data, and she's picking up Spanish words. Link in bio."
3. **"My kid won't sit still for learning apps. So we made one she has to run around for."** — wide shot of kid sprinting across room with tablet. Caption: "Scavenger hunt + AI camera + Spanish. Free to try."
4. **"Testing if my 2yo can find 5 things in Spanish 👀"** — challenge format, counter on screen, she gets 4/5. Caption: "Better than I did at her age."
5. **"Things my kid learned this week without a worksheet:"** — text list overlay (manzana, pelota, perro...) over gameplay. Caption: "Real objects > flashcards at this age."
6. **"Screen time I don't feel guilty about"** — the kid is physically moving the whole clip. Caption: "She's on her feet the entire time. That was the whole point."
7. **"The app is in English AND Spanish and I don't even speak Spanish"** — parent voiceover, app does the talking. Caption: "I'm learning it too tbh."
8. **"Grandma asked how the baby knows Spanish words now"** — cut between gameplay and a text-reveal of the answer. Caption: "Free to try. Link in bio."
9. **"Rainy day = indoor scavenger hunt in Spanish"** — cozy indoor vibe. Caption: "Saved our whole afternoon."
10. **"Stitch this with your kid's app screen time"** — duet/stitch bait. Caption: "Show me yours, here's ours."

**What to track:** views, saves (saves > likes for this niche — parents save to
try later), profile clicks, link-in-bio clicks. A video with high saves but low
views is worth re-cutting and reposting.

---

## Channel 2 — Preschool free-pass program

Local credibility + testimonials + word-of-mouth among the exact buyer.

**The offer:** free lifetime access for the classroom in exchange for (a) a short
testimonial and (b) permission to say "Used by [Preschool Name]." Optionally a
printable flyer for the take-home folder.

**Target:** 10 local preschools / daycares / Montessori programs. Start with any
your kid attends or you know personally.

**Email template:**

> Subject: Free Spanish-learning app for your classroom (local, no catch)
>
> Hi [Name],
>
> I'm a local dad — I built a little app called Picture Hunt for my 3-year-old.
> It's a scavenger hunt where kids find real objects with a tablet camera, and
> it says each word in English and Spanish as they go. She's picked up a
> surprising number of Spanish words just by playing.
>
> I'd love to give [Preschool Name] free lifetime access for the classroom — no
> cost, no strings. If the kids enjoy it, all I'd ask is a sentence or two I
> could quote, and your OK to mention that [Preschool Name] uses it.
>
> Want me to send over access codes? Happy to swing by and show you how it works
> in 5 minutes.
>
> Thanks,
> Caleb
> [link]

**Fulfillment (built 2026-11-26):** one command per preschool.

```
node worker/mint-code.mjs sunny-days-preschool
```

It prints one code the whole class can share, a link that unlocks the app in one
tap, and saves a QR image for the take-home flyer in
`C:/assets/ventures/picture-hunt/free-pass-qr/`. `node worker/stats.mjs` then shows
how many times each preschool's code was used, so you know who to ask for a
testimonial. `node worker/mint-code.mjs --list` shows every code handed out.

A shared class code does not sync progress between devices (it would mix
different families' progress). Each family's progress stays on their own device.

---

## Channel 3 — Mom / parent micro-influencer seeding

Cheap reach + authentic demos. Micro (1k-10k followers) convert better than big
accounts for niche products and many will post for a free unlock.

**Target:** 50 accounts. Filter for: toddler-parent content, bilingual/Latina
parenting accounts (highest intent for the Spanish angle), Montessori/gentle-
parenting/screen-time-conscious niches.

**DM template:**

> Hi [Name]! I'm a dad who built a tiny app — Picture Hunt — that has toddlers
> learn Spanish by finding real objects around the house with the tablet camera.
> No ads, no accounts, no subscription.
>
> I'd love to give you a free lifetime unlock to try with [kid's name] — zero
> obligation. If you end up liking it and want to share, that'd mean the world,
> but truly no pressure. Want a code?

**Rules:** lead with the free gift, not the ask. Never require a post. The ones
who post unprompted are the authentic signal you want. Give each a unique code so
you can see which influencers actually drive installs.

---

## What NOT to do

- **Do not post "I built an app" to r/toddlers, r/parenting, r/Mommit, etc.**
  Those subs reflexively downvote/remove self-promotion and you'll burn the
  account. (If you ever do Reddit, it's by being a genuinely helpful member for
  weeks first, then mentioning it once when directly relevant — not a launch
  channel.)
- **Do not buy ads yet.** Acquisition spend before organic proof is how indie
  apps die. Paid comes only after a video proves the concept can travel.
- **Do not lower the $24.99 price to chase conversions.** If conversion is low,
  the fix is the channel/message, not the price (see STRATEGY decision gate).

---

## Measurement (set up before posting)

Built 2026-11-26, no paid service and no outside tracker. Run:

```
node worker/stats.mjs        # last 14 days
node worker/stats.mjs 30     # last 30 days
```

(or ask Claude in this folder "how is the funnel"). It shows, per day and per
link label: landing visits, Try Free taps and the rate between them, photo checks
run and found, and unlock codes used by label.

- **What it can tell you:** which channel sends people, whether they tap Try
  Free, and whether play volume is growing.
- **Coming back (added 2026-11-26):** of the browsers that played for the first
  time, how many opened the game again the next day, within a week, or later.
  This is the number the free launch has to prove.
- **What it cannot tell you:** anything about one particular family. There are
  no IDs, only totals. People who played before 2026-11-26 are left out of the
  coming-back numbers on purpose.
- **Weekly review:** views → profile/bio clicks (from the platform) → landing
  visits → Try Free → photos checked. Find the biggest drop-off and fix that one
  step.

---

## Sequencing

1. Play one round on your own iPhone on the current version.
2. Film + post the first 3-5 videos, with the labelled link in each bio.
3. Send the preschool emails (batch of 10), each with its own free pass.
4. Seed 50 creator DMs.
5. Run the stats once a week for 30 days → hit/miss the signals in STRATEGY.md.
