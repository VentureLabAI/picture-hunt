# Picture Hunt — Product Strategy

**Owner:** Caleb
**Last updated:** 2026-06-04
**Status:** Strategy locked. Execution sequenced below. (Pricing model revised
2026-06-04 → freemium funnel + one-time $24.99; see Pricing + decision log.)

This is the north-star doc. When a session is unsure whether to build something,
the answer is here. If it's not here, it probably shouldn't be built yet.

---

## The one-sentence thesis

**Picture Hunt is "Lingokids meets the real world" — a kid learns a second
language by going on AI-guided treasure hunts for real objects in their home.**

The camera is the *mechanic*. Bilingual vocabulary is the *product*. Story is the
*retention engine*. All three matter; they're not interchangeable.

---

## Why this framing (and not "camera scavenger hunt")

- **Camera-hunt alone is a novelty.** Novelties spike and die. There is no
  durable reason for a parent to keep paying or a kid to keep playing.
- **Bilingual learning is durable + premium.** The under-5 bilingual segment is
  the highest willingness-to-pay corner of kids' EdTech (Lingokids $7.99/mo,
  Gus on the Go $4.99, Duolingo Kids). Ages 2-5 is the scientifically ideal
  language-acquisition window — that's the parent's emotional purchase trigger.
- **Story is what beats the toddler attention span.** See the next section —
  this is load-bearing, not decorative.

We are not the cheapest camera game. We are the only app that combines (1) AI
camera validation, (2) toddler-first audio-only UX, and (3) real-world bilingual
vocabulary acquisition wrapped in (4) regenerating story quests. Nobody else
occupies that intersection.

---

## The retention problem, and why Storyline is the answer (not a cut)

**The core failure mode of this app is toddler boredom.** A 3-year-old does not
replay for mastery or completion — they replay for novelty and story. The base
loop — "find X → yay → find Y → yay" — is a variable-reward treadmill. That
retains adults (slot machines) but burns out toddlers fast, because there's no
arc, no tension, no "what happens next." Adding more *categories* does not fix
this; it's the same treadmill with different items.

**Story converts a chore list into a quest.** "Help Bear find his breakfast —
where could the milk be?" is a fundamentally more engaging frame than "find milk."
The child is now an agent in a narrative, not a worker completing a checklist.
This was Boss Man's correction to an earlier draft that wrongly put Storyline on
the cut list, and it's right: **Storyline is the most defensible feature in the
app, not a side mode.**

### The critical nuance: deplete vs. regenerate

The *current* Storyline implementation (8 hand-authored stories) does NOT fully
solve the boredom problem — it just delays it. A kid plays "Bear's Breakfast"
once or twice, then it's the treadmill again with a narrator. Hand-authored
stories are **content that depletes**.

The real fix is **story that regenerates**: a small set of story *templates*
(rescue / party-prep / journey / treasure-map / bedtime) × characters × the
existing item pool = effectively infinite quests from a finite, pre-recorded
audio set. You record the connective tissue once with slot-filling
("Oh no, [character] lost their [item]!") rather than authoring N bespoke
scripts. This is **content that compounds**.

Constraint tension to respect: slot-filled audio fights the "pre-generated MP3,
no streaming, consistent Jessica voice" rule (see LESSONS-LEARNED / the 6,500
credits spent on the Jessica swap). So the template engine records its
connective clips in the same Jessica voice up front; it does not stream TTS at
runtime.

---

## Mode decisions (locked)

| Mode | Decision | Why |
|---|---|---|
| **Regular Hunt** | KEEP | The core engine. Everything else rides on it. |
| **Daily Challenge** | KEEP | Retention hook — one curated item/day + streak. Cheap, effective. |
| **Storyline Mode** | KEEP + PROMOTE + INVEST | The retention backbone. Promote from buried button to primary entry point. Phase 2: build the template engine. |
| **Memory Hunt** | CUT | Simon-Says-with-photos. Assumes attention span the user doesn't have. |
| **Review Mode** | CUT | Spaced repetition assumes the kid played enough to need review. Most never get there. |
| **Sorting Safari** | CUT | Weakest engagement, heaviest code. Categorization drill, not a quest. |

**Cut rationale:** the three cut modes are *mechanical drills*, not narrative
engagement. They inflate code surface, bug area, splash clutter, and audio
dependencies while contributing little to the kid's actual playtime. Cutting them
shrinks the maintenance surface ~30% and lets iteration focus on the bilingual +
story spine.

**Audio note:** the Jessica-voiced MP3s for cut modes are sunk cost. Deleting the
UI is free; leave the audio files or prune them in a later cleanup — not worth a
dedicated pass.

---

## Pricing (locked — freemium funnel → one-time unlock)

**Freemium: a real free tier WITH the bilingual hook, then a one-time $24.99
unlock for everything. NOT a subscription.**

Freemium because the bilingual learning IS the differentiator, and you can't sell
a differentiator a parent hasn't felt yet. Give it away as the hook — let them
watch their kid find an apple and hear "manzana" — then charge for breadth.

**Why one-time, not subscription (decided 2026-06-04):**
- **The retention engine isn't built yet.** Toddler boredom is the #1 risk and
  the fix (the regenerating story-template engine) is still Phase 2. A
  subscription promises *ongoing* value; charging monthly for a currently-finite
  experience = churn + cancellations + "got boring after a month" reviews. A
  one-time matches what the app is today: a great toddler-phase purchase.
- **Churn is the silent killer for toddler apps** — kids age out of any single
  app fast. One-time has zero churn by definition.
- **No acquisition budget** → subscription LTV-over-CAC math doesn't apply.
  Organic-only, you just want to capture each interested parent's
  willingness-to-pay now; a one-time does that in one tap.
- **Ops/infra:** the worker/KV/paywall are already built for one-time unlock
  codes + a single Stripe link. Subscriptions add renewals, dunning, cancel
  flows, refund exposure, periodic re-validation — permanent solo-builder
  overhead.

**Price: $24.99** (up from $19.99). Freemium de-risks the buy (they try it
first), so there's room to raise. The "don't discount to chase conversion" rule
still holds — freemium lifts conversion through the funnel, not the price.

**Keep it ONE unlock.** À-la-carte packages cause decision paralysis on a ~$20
product. One "Unlock Everything," with at most one later upsell ("All Languages
Pack +$X") once demand for specific languages shows.

**When subscription becomes right (Phase 2+):** once the story-template engine
ships (regenerating quests = genuine ongoing value) AND there's a channel
bringing steady new users, "monthly OR lifetime" can capture more LTV. Not
before — it lines up with the revenue-validation gate below.

The paywall *infrastructure* (Stripe, KV codes, gating) is reused as-is; only the
free/paid line + price config changed.

---

## Free vs. Paid line (revised 2026-06-04 — bilingual is the HOOK, not the wall)

- **Free:** 3 universal categories (household, animals, food — real, illustrated
  objects), **Spanish bilingual ON**, the Daily Challenge, and **1 sample Story
  Quest** (Bear's Breakfast). ~5 plays/day. Enough to feel the bilingual magic
  and build a habit.
- **Paid ($24.99 one-time):** all 10 categories, **all 10 languages**, **all
  Story Quests**, unlimited plays, cross-device sync.

This REVERSES the earlier "bilingual is paid-only" line. Gating the
differentiator is backwards for a freemium funnel — parents won't pay for a value
they haven't experienced. So bilingual (Spanish) is the free hook; you monetize
breadth: more languages, more categories, more stories.

---

## Roadmap (sequenced)

### Phase 0 — Ship what exists (BLOCKER, no new code)
- Deploy the marketability stack (Stripe + KV + webhook). See `docs/PAYWALL-DEPLOY.md`.
- ~~Switch paywall config to one-time $19.99.~~ Done 2026-06-04: freemium funnel → one-time **$24.99** (Spanish bilingual is the free hook).
- This is the gate. Nothing below matters until the app can take money.

### Phase 1 — Reposition + promote Storyline (small, do alongside Phase 0)
- Landing page + store copy → bilingual-first ("Your kid learns Spanish by
  finding real things in the house").
- Promote Storyline from a side button to a primary entry on the splash.
- Bilingual word spoken at prompt time (shipped 2026-05-18 — "Can you find an
  apple? Una manzana?").
- Grammar fixes for mass/proper nouns (shipped 2026-05-18).

### Phase 2 — Story template engine (the retention compounding play)
- ONLY after revenue validates (see decision gate).
- Record ~30 slot-fill connective clips in Jessica voice.
- Build template × character × item generator → dozens of quests from finite audio.
- This is the single highest-retention investment available. It's also the most
  expensive in credits/time, which is why it's gated behind revenue proof.

### Phase 3 — Distribution
- TikTok organic ("I built an app so my 3yo learns Spanish" — show the kid playing).
- Preschool free-pass-for-testimonial.
- Mom-influencer code seeding (1k-10k follower accounts).
- NOT r/toddlers / r/parenting — those communities downvote "I built an app."

### Phase 4 — App Store presence
- Capacitor-wrap the existing PWA (≈1 week). Do NOT rebuild in React Native.

---

## Decision gate (60 days after paywall goes live)

- **30-day signal:** at least one piece of organic content >50k views (proves
  distribution is possible at all).
- **60-day signal:** 30+ paying customers from organic traffic (proves PMF at
  this positioning + price).
- **Hit both →** invest in paid acquisition + build Phase 2 template engine.
- **Miss →** freeze. Bank the revenue + lessons. Do not pivot into a different app.

---

## What we will NOT build (anti-creep guard, still in force)

- No new content categories (10 is enough).
- No new mechanical game modes (we're cutting 3, not adding).
- No achievement badges (Sticker Book covers collection psychology).
- No multi-language audio for languages with no users (keep Spanish/French/
  Mandarin live; the other 7 stay TTS-only until someone asks).
- No feature whose justification is "kids might like it" or "more variety." The
  only valid justification is "this makes a parent more likely to pay or a kid
  more likely to come back tomorrow."

## What changed Boss Man's mind / mine (decision log)

- **2026-05-18:** Initial strategy draft cut Storyline. Boss Man pushed back:
  toddler attention span is the core risk, and story is the proven antidote to
  "same toy gets boring." Correct. Storyline moved from CUT to KEEP+INVEST, and
  the cut list narrowed to the three mechanical drill modes. The deeper insight
  that fell out of it: the real axis isn't "how many modes" but "depleting vs.
  regenerating content" — which is why Phase 2 is the template engine, not more
  hand-authored stories.
- **2026-06-04:** Pricing pivoted from "$19.99 one-time unlocks everything, with
  bilingual paid-only" to a **freemium funnel → $24.99 one-time**, with the
  bilingual hook (Spanish) FREE. Trigger: bilingual is the differentiator, so it
  has to be experienced before a parent will pay — gating it killed the funnel.
  Freemium gives away the hook (Spanish + 3 real-object categories + 1 story) and
  monetizes breadth (all languages/categories/stories). Stayed one-time (not
  subscription): the retention engine is unbuilt, churn is brutal for toddler
  apps, there's no ad budget to amortize, and the infra is one-time already.
  Subscription revisited in Phase 2 once the story-template engine ships.
