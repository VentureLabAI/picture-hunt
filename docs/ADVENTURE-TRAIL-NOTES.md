# Adventure Trail — build notes & decisions for review

**Built:** 2026-06-04 (overnight autonomous build), cache **v101 / ph-v101**.
**Scope you approved:** Adventure Trail storybook UI for Story Quests — the picker
**and** the in-quest experience — for **all 8 quests**; plus "create all the
translations needed so the foreign word plays right after English."

This doc is the stuff I want you to glance at: judgment calls I made on my own,
and one finding that changes the translation ask.

---

## What shipped

**In-quest (the core).** The find-flow is now wrapped in storybook chrome:
- A **cover page** while the intro narration plays (story emoji + title + the fox
  reading the intro in a speech bubble + the full trail). Camera/target hidden
  until the intro finishes, then it "turns" to step 1.
- Each step: **fox + speech bubble** showing the exact `bridge` line the app
  already speaks ("Bear is thirsty — find a cup!"), a **trail of stepping-stones**
  (done = the found item's icon, current = glowing gold with 🦊, upcoming =
  dashed), the find target + Spanish word, and the big camera button.
- On a correct find: fox swaps to the celebrate pose, the bubble shows the
  `foundText`, the current stone checks off, and the fox **hops to the next stone**.
- Distinct warm storybook background so a quest never looks like a category hunt.

**Picker.** "Pick an Adventure!" — each quest is now a **little book** (colored
spine, emoji cover, title, age stars, a row of trail-dots for # of finds, page
edges on the right), instead of category-style tiles. Fox hosts the shelf.

**Verified** in a real browser: cover/step/found states, the trail for both short
(5-step) and long (7-step) quests, all 8 quests render without error, the finale
returns to the victory screen, free vs. premium locking intact, 0 console errors.

---

## Decisions I made on my own (take a look)

1. **Wrapped the existing game screen instead of building a new one.** The quest
   reuses the same camera/photo/iOS-audio plumbing; I only inject a `#quest-chrome`
   panel and a `story-mode` class. Lowest risk, but it means the storybook and the
   regular hunt share one screen. (If you ever want a fully separate quest screen,
   that's a bigger lift.)

2. **The finale reuses the existing Victory screen** (outro narration + confetti +
   "Play Again"/"Home"), rather than a bespoke "The End 📖" page. Kept the victory
   logic intact. **If you want a dedicated storybook closing page, say so** — it's
   an easy add-on.

3. **No new art.** Cover uses `fox-hero`, the guide uses `fox-point`, the found
   state uses `fox-celebrate` — all poses we already had. (This is why we picked
   the Trail over the "Storybook Pages" option, which needed per-scene art.)

4. **Trail done-stones show the found item's icon** (not just a ✓). Reads more
   like "collecting things on a journey." The plain progress bar is hidden during
   quests — the trail replaces it.

5. **Made the story-mode game screen overflow-safe** (top-anchor + safe-center +
   scroll) so the added chrome can never push the camera button off-screen on a
   short phone — same fix used on the splash earlier.

6. **Picker is a 1-column stack of book cards**, and the "🏠 Back" button stays at
   the bottom (you scroll to it). I judged a single column clearer/more book-like
   than a 2-up grid. **Flag if you'd prefer a 2-column shelf or a top/sticky Back
   button.**

7. **Removed the old inline "📖 1/5" badge** from the in-quest prompt text — the
   chrome header ("3 / 5") and the trail show progress now.

---

## The translation ask — important finding

You asked me to "create all the translations needed so the foreign pronunciation
plays right after English." **I audited the whole app and there was nothing to
create — translations are already 100% complete:** all **109 items** have all
**10 languages** (0 gaps), and the 38 unique quest items are all covered.

And the flow already works: in a quest step the app speaks the English prompt,
waits ~400ms, then speaks the foreign word. I verified it fires — e.g. for "cup"
it calls the speech engine with **"taza" (es-ES)**, then the camera arms.

**The one caveat worth your decision:** the foreign word is pronounced by the
**browser's built-in text-to-speech** (`speechSynthesis`), not a recorded MP3
like the English. That's reliable on most Android/Chrome, but **iOS Safari and
the less-common languages can be missing a voice**, in which case the foreign
word won't be *audible* even though the text/badge is correct. The bulletproof
fix is **recorded foreign-language audio** (the way the English prompts are
pre-recorded) — but that's ~100 items × however many languages of voiceover, a
separate project with cost. I did **not** do that. If reliable foreign audio on
iOS matters, that's the next call to make. For now: text is complete, TTS plays
after English, works great where the device has the voice.

---

## Touched files
- `play/storyline-mode.js` — quest chrome (cover/step/found/trail) + wiring into
  the flow; picker rewritten as the book shelf.
- `play/style.css` — `.quest-*` (chrome/trail/cover/motion) + `.story-book` shelf.
- `play/index.html` + `play/sw.js` — cache bump v100→v101.
- No change to the camera/find/AI path, or to translation data (it was complete).

## Not done / possible follow-ups
- Recorded foreign audio (see above) — the big one if iOS TTS is unreliable.
- A dedicated "The End" finale page (currently reuses Victory).
- 2-column shelf / sticky Back button (currently 1-column, bottom Back).
