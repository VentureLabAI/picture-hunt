# Picture Hunt — UI/UX Elevation & Mascot Plan

**Owner:** Caleb
**Created:** 2026-06-01
**Status:** Proposed — awaiting approval before implementation.
**Relationship to STRATEGY.md:** This is an *execution* plan for Phase 1 ("Reposition + promote Storyline") polish. It does NOT change any locked strategy (bilingual-first, $19.99 one-time, Storyline-as-backbone, cut modes). It makes the existing, already-polished "Sticker Playground" UI feel App-Store-featured by giving the app an ownable character.

---

## Goal

The app is **not** placeholder — it already has a cohesive, intentional "Sticker Playground" design system (Khan Kids × Duolingo × Toca Boca; Fredoka type; toy-button shadows; mesh gradients). This plan pushes it from *great-indie* to *featured-tier* by adding the one thing it lacks: **an ownable brand character.** A mascot also directly reinforces the locked retention strategy (Storyline = the character giving the child a quest).

## The mascot

**A baby fox explorer** — warm orange fur, blue explorer bucket hat, green backpack, magnifying glass. The "hunt buddy."

- **Why a fox, and the differentiation note:** Fox is a *crowded* choice in under-5 kids' content — **Pinkfong** (a pink fox, ages 1–5) is the dominant brand, and **Little Fox** is a kids language-learning brand. We accept this knowingly: our fox is *orange* and an *explorer with a magnifying glass*, which reads nothing like Pinkfong's pink pop-star fox, and the camera-hunt context separates us. (Considered + rejected for now: raccoon and red panda — more ownable, but Caleb chose the fox after seeing all three.)
- **Personality:** curious, encouraging, never scolding. He *finds things with you*. Speaks through Jessica's voice where audio is involved (no new TTS at runtime — see constraints).

### Where the buddy appears (the through-line)
| Surface | Mascot role | Pose needed |
|---|---|---|
| Marketing landing hero | Brand face / first impression | hero wave |
| App entry screen | Greeter | hero wave |
| Storyline guide | "Help me find my breakfast!" quest-giver | pointing / holding map |
| Game loading ("looking at your photo…") | Searching with you | peering through magnifier |
| Victory screen | Celebration buddy | jumping cheer |
| Locked / empty states | Curious peek | peek / holding key |

## Production approach (no-build / PWA-safe)

- Generate a **reference-locked** character (one approved base), then produce a small set of **static poses/expressions** as PNG (transparent where useful) via Nano Banana Pro using the base as a reference image. Consistency verified before batch generation.
- Drop poses into existing screens as `<img>`. **No framework, no build step, no runtime image generation.** Reuses the existing design-token + animation system (float/bounce/pop already exist in `style.css`).
- Keep asset count lean (~6 poses) — this is an indie app pre-revenue-gate; we are not building a 100-asset library.
- Source/working art lives outside the repo until exported; final web assets go in `play/img/mascot/` (or `assets/`), sized/compressed for web.

## Refinement layer (ships alongside the mascot, not after)

1. **Custom SVG control icons** replacing OS emoji for *controls* (⚙️ settings, 🔊 sound, 🏠 home, ⏭️ skip, 🔁 repeat). Renders consistently across iOS/Android; reads more premium. (Category *illustrations* can stay emoji for now — out of scope unless we go full-custom later.)
2. **Marketing landing contrast + hero:** the amber-on-gold body copy likely fails WCAG 4.5:1 — fix. Strengthen the hero (mascot + a convincing device frame or short play clip).
3. **Install-prompt timing:** the "Add to Home Screen" prompt currently fires immediately and overlaps the category grid on first load. Defer/reposition so it doesn't block content.
4. **Micro-polish:** interaction-state consistency (hover/press/disabled), spacing rhythm, shadow scale, focus-visible states.

## Bugs to fold in (spotted during audit, confirmed live)

- **Grammar: "Can you find a orange?"** on the Daily Challenge card — the a/an logic doesn't handle vowel-initial words. Fix the a/an helper so vowel-initial items get "an". (Confirmed in live DOM 2026-06-01.)

## Phased plan (each phase = one commit → deploy → fresh-session verify)

- **Phase 0 — Lock the mascot.** Approve base fox; verify consistent poses; generate the ~6-pose set; export web-optimized assets. *(No app code yet.)*
- **Phase 1 — Brand integration: landing + entry.** Mascot into the marketing hero + app entry greeter. Ship the landing contrast fix + stronger hero + install-prompt timing fix in the same phase.
- **Phase 2 — Storyline guide + Victory buddy.** Mascot as the quest-giver on the Storyline hero/intro; celebration pose on the Victory screen.
- **Phase 3 — Control-icon system + game/loading polish.** Custom SVG controls across game/setup/paywall/dashboard; searching-fox on the loading state; grammar fix.
- **Phase 4 — Pass + QA.** Cross-device check (375px small phone, tablet, landscape), reduced-motion, dark-surface contrast, safe areas. Update `context_handoff.md`.

## Constraints honored

- Vanilla HTML/CSS/JS, no build step. No framework.
- **Atomic cache-bump every phase that touches `play/` assets:** bump `?v=N` in `play/index.html` + `CACHE_VERSION` in `play/sw.js` + add any new asset to `PRECACHE_URLS`. (Currently v78.)
- Push = deploy (GitHub Pages serves `main`). Verify on a fresh incognito session after each push.
- iOS audio rule untouched (Web Audio buffers only). No re-litigating locked strategy.
- Don't write to the monorepo tombstone (`venture-lab/picture-hunt/`).

## Open questions / decisions still to confirm

- Final pose set (the 6 above) — confirm or adjust.
- Asset directory: `play/img/mascot/`.
- Whether the marketing hero uses a static mascot composition or a short autoplay clip (clip = more effort; decide at Phase 1).
