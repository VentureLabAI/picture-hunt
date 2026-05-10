/**
 * Picture Hunt — Rich Sound Effects Module
 * ==========================================
 * Drop-in replacement for the basic oscillator tones in app.js.
 * Uses Web Audio API to create richer, more engaging sounds
 * that feel like real sound effects — not just beeps.
 *
 * SOUNDS:
 *   1. playRichSuccess()  — Bright ascending chime with shimmer
 *   2. playRichMiss()     — Gentle "whoops" (not harsh buzzer)
 *   3. playRichVictory()  — Triumphant fanfare with harmony
 *   4. playRichClick()    — Soft satisfying pop/tick
 *   5. playRichSkip()    — Sweeping "swoosh" away
 *   6. playRichHint()    — Magical twinkle (hint available)
 *   7. playRichStreak()  — Escalating cheer (3+ in a row)
 *
 * USAGE:
 *   // Replace existing sound functions in app.js:
 *   // playSuccess()  → playRichSuccess()
 *   // playMiss()     → playRichMiss()
 *   // playVictorySound() → playRichVictory()
 *   // playClick()    → playRichClick()
 *
 *   // New sounds (call from appropriate places):
 *   // playRichSkip()  — when skip button pressed
 *   // playRichHint()  — when hint button pulses/appears
 *   // playRichStreak() — after 3+ consecutive finds
 *
 * DESIGN PRINCIPLES:
 *   - Toddler-friendly: no harsh/jarring sounds
 *   - Musical intervals (not random beeps)
 *   - Each sound has a "shape" — attack, sustain, release
 *   - Layered oscillators for richness (not single sine waves)
 *   - All sounds under 1.5 seconds (toddlers lose attention)
 *   - Graceful fallback if Web Audio unavailable
 *
 * TECHNICAL NOTES:
 *   - Uses OscillatorNode + GainNode + BiquadFilterNode
 *   - No external audio files needed
 *   - Compatible with iOS/Silk (same AudioContext unlock as existing code)
 *   - Respects existing soundEnabled / toggleSound() system
 */

// ═══════════════════════════════════════════════════════════════
// DEPENDENCY: Uses the existing audioCtx + soundEnabled + ensureAudioCtx
// from app.js. If those aren't available, define fallbacks.
// ═══════════════════════════════════════════════════════════════
var _richAudioCtx = null;
var _richSoundEnabled = true;

function _getAudioCtx() {
  // Use app.js context if available
  if (typeof audioCtx !== 'undefined' && audioCtx) return audioCtx;
  if (typeof ensureAudioCtx === 'function') return ensureAudioCtx();
  // Fallback: create our own
  if (!_richAudioCtx) {
    _richAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_richAudioCtx.state === 'suspended') _richAudioCtx.resume();
  return _richAudioCtx;
}

function _isSoundOn() {
  if (typeof soundEnabled !== 'undefined') return soundEnabled;
  return _richSoundEnabled;
}


// ═══════════════════════════════════════════════════════════════
// HELPER: Create an oscillator note with envelope
// ═══════════════════════════════════════════════════════════════
function _note(freq, dur, delay, opts) {
  if (!_isSoundOn()) return;
  opts = opts || {};
  try {
    var c = _getAudioCtx();
    var t = c.currentTime + (delay || 0);
    var o = c.createOscillator();
    var g = c.createGain();
    var type = opts.type || 'sine';
    var vol = opts.vol || 0.2;
    var attack = opts.attack || 0.01;
    var decay = opts.decay || 0.05;
    var sustain = opts.sustain || vol * 0.7;
    var release = opts.release || (dur * 0.3);

    o.type = type;
    o.frequency.value = freq;

    // ADSR-like envelope
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.linearRampToValueAtTime(sustain, t + attack + decay);
    g.gain.setValueAtTime(sustain, t + dur - release);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    // Optional: slight detune for richness
    if (opts.detune) o.detune.value = opts.detune;

    // Optional: frequency sweep
    if (opts.freqEnd) {
      o.frequency.setValueAtTime(freq, t);
      o.frequency.linearRampToValueAtTime(opts.freqEnd, t + dur);
    }

    // Optional: vibrato
    if (opts.vibrato) {
      var lfo = c.createOscillator();
      var lfoGain = c.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = opts.vibrato.rate || 5;
      lfoGain.gain.value = opts.vibrato.depth || 3;
      lfo.connect(lfoGain);
      lfoGain.connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur);
    }

    o.connect(g);

    // Optional: filter for warmth
    if (opts.filter) {
      var f = c.createBiquadFilter();
      f.type = opts.filter.type || 'lowpass';
      f.frequency.value = opts.filter.freq || 2000;
      f.Q.value = opts.filter.Q || 1;
      g.connect(f);
      f.connect(c.destination);
    } else {
      g.connect(c.destination);
    }

    o.start(t);
    o.stop(t + dur + 0.05);
  } catch(e) {}
}


// ═══════════════════════════════════════════════════════════════
// 1. SUCCESS CHIME ✨
// ═══════════════════════════════════════════════════════════════
// Bright C-E-G ascending triad with a shimmer overlay.
// The shimmer (high harmonic) makes it feel magical, not just musical.

function playRichSuccess() {
  // Main triad: C5, E5, G5
  _note(523.25, 0.35, 0,    { type: 'sine', vol: 0.22, attack: 0.01, sustain: 0.15 });
  _note(659.25, 0.35, 0.08, { type: 'sine', vol: 0.22, attack: 0.01, sustain: 0.15 });
  _note(783.99, 0.45, 0.16, { type: 'sine', vol: 0.25, attack: 0.01, sustain: 0.18 });

  // Shimmer layer: one octave up, quieter, triangle wave
  _note(1046.50, 0.30, 0.18, { type: 'triangle', vol: 0.08, attack: 0.02, sustain: 0.05 });
  _note(1318.51, 0.25, 0.24, { type: 'triangle', vol: 0.06, attack: 0.02, sustain: 0.03 });

  // Subtle "sparkle" at the end — very high, very quiet, very short
  _note(2093, 0.15, 0.35, { type: 'sine', vol: 0.04, attack: 0.01, sustain: 0.02 });
}


// ═══════════════════════════════════════════════════════════════
// 2. MISS SOUND — GENTLE WHOOPS 🫢
// ═══════════════════════════════════════════════════════════════
// A soft descending "wobble" — like a cartoon boing in reverse.
// Not a buzzer, not harsh. Just a friendly "try again!"
// Uses a pitch bend down + subtle vibrato for the "whoops" feel.

function playRichMiss() {
  // Descending wobble
  _note(400, 0.35, 0, {
    type: 'sine',
    vol: 0.18,
    attack: 0.02,
    sustain: 0.08,
    freqEnd: 280,
    vibrato: { rate: 6, depth: 8 }
  });

  // Soft second tap — the "bounce"
  _note(300, 0.15, 0.18, {
    type: 'sine',
    vol: 0.10,
    attack: 0.01,
    sustain: 0.05,
    freqEnd: 250
  });
}


// ═══════════════════════════════════════════════════════════════
// 3. VICTORY FANFARE 🏆
// ═══════════════════════════════════════════════════════════════
// Triumphant 4-note fanfare with harmony.
// C-E-G-C (octave up) with a parallel third harmony below.
// Triangle wave for warmth, filtered for polish.

function playRichVictory() {
  // Main melody: C5 - E5 - G5 - C6
  _note(523.25, 0.25, 0,     { type: 'triangle', vol: 0.25, attack: 0.01, sustain: 0.18, filter: { type: 'lowpass', freq: 3000 } });
  _note(659.25, 0.25, 0.12,  { type: 'triangle', vol: 0.25, attack: 0.01, sustain: 0.18, filter: { type: 'lowpass', freq: 3000 } });
  _note(783.99, 0.25, 0.24,  { type: 'triangle', vol: 0.25, attack: 0.01, sustain: 0.18, filter: { type: 'lowpass', freq: 3000 } });
  _note(1046.50, 0.6, 0.36,  { type: 'triangle', vol: 0.30, attack: 0.01, sustain: 0.22, filter: { type: 'lowpass', freq: 3500 } });

  // Harmony: a third below each note (gives that "triumphant" feel)
  _note(440.00, 0.25, 0,     { type: 'sine', vol: 0.10, attack: 0.02, sustain: 0.07 });
  _note(523.25, 0.25, 0.12,  { type: 'sine', vol: 0.10, attack: 0.02, sustain: 0.07 });
  _note(587.33, 0.25, 0.24,  { type: 'sine', vol: 0.10, attack: 0.02, sustain: 0.07 });
  _note(783.99, 0.6, 0.36,   { type: 'sine', vol: 0.12, attack: 0.02, sustain: 0.08 });

  // Final sparkle
  _note(1568, 0.4, 0.55, { type: 'sine', vol: 0.06, attack: 0.01, sustain: 0.03 });
  _note(2093, 0.3, 0.65, { type: 'sine', vol: 0.04, attack: 0.01, sustain: 0.02 });
}


// ═══════════════════════════════════════════════════════════════
// 4. CLICK / TAP — SOFT POP 👆
// ═══════════════════════════════════════════════════════════════
// A quick "pop" — like tapping a bubble.
// Very short noise burst filtered through a resonant bandpass.

function playRichClick() {
  if (!_isSoundOn()) return;
  try {
    var c = _getAudioCtx();
    var t = c.currentTime;

    // Short noise burst → bandpass filter = "pop"
    var bufferSize = c.sampleRate * 0.04; // 40ms of noise
    var buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3); // decaying noise
    }

    var noise = c.createBufferSource();
    noise.buffer = buffer;

    var filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 2;

    var gain = c.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    noise.start(t);
    noise.stop(t + 0.05);

    // Tonal "body" of the click
    _note(800, 0.06, 0, { type: 'sine', vol: 0.08, attack: 0.005, sustain: 0.03 });
  } catch(e) {}
}


// ═══════════════════════════════════════════════════════════════
// 5. SKIP — SWOOSH 💨
// ═══════════════════════════════════════════════════════════════
// A quick ascending sweep — "moving on" feeling.
// White noise + rising tone.

function playRichSkip() {
  if (!_isSoundOn()) return;
  try {
    var c = _getAudioCtx();
    var t = c.currentTime;

    // Noise sweep
    var bufferSize = c.sampleRate * 0.2;
    var buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      var env = Math.pow(1 - i / bufferSize, 2);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    var noise = c.createBufferSource();
    noise.buffer = buffer;

    var hpFilter = c.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(400, t);
    hpFilter.frequency.linearRampToValueAtTime(3000, t + 0.18);
    hpFilter.Q.value = 0.7;

    var gain = c.createGain();
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    noise.connect(hpFilter);
    hpFilter.connect(gain);
    gain.connect(c.destination);
    noise.start(t);
    noise.stop(t + 0.22);

    // Tonal sweep
    _note(400, 0.2, 0, { type: 'sine', vol: 0.08, freqEnd: 900, attack: 0.01, sustain: 0.04 });
  } catch(e) {}
}


// ═══════════════════════════════════════════════════════════════
// 6. HINT — MAGICAL TWINKLE ✨
// ═══════════════════════════════════════════════════════════════
// Quick ascending sparkle — "something magical is happening!"
// Three very short high notes with a delay between them.

function playRichHint() {
  var notes = [1318.51, 1567.98, 2093]; // E6, G6, C7
  for (var i = 0; i < notes.length; i++) {
    _note(notes[i], 0.12, i * 0.08, {
      type: 'sine',
      vol: 0.10 - i * 0.01,
      attack: 0.005,
      sustain: 0.04,
      detune: Math.random() * 10 - 5 // slight random detune = shimmer
    });
    // Harmonic echo (one octave up, very quiet)
    _note(notes[i] * 2, 0.08, i * 0.08 + 0.02, {
      type: 'sine',
      vol: 0.03,
      attack: 0.005,
      sustain: 0.01
    });
  }
}


// ═══════════════════════════════════════════════════════════════
// 7. STREAK — ESCALATING CHEER 🎉
// ═══════════════════════════════════════════════════════════════
// Play after 3+ consecutive correct finds.
// Quick ascending arpeggio that gets faster and higher.
// Rewards persistence with musical excitement.

function playRichStreak(count) {
  count = Math.min(count || 3, 8); // cap at 8
  var baseFreq = 523.25; // C5
  var scale = [1, 1.25, 1.5, 1.667, 2, 2.25, 2.5, 2.667]; // pentatonic-ish

  for (var i = 0; i < count; i++) {
    var freq = baseFreq * scale[i % scale.length];
    var delay = i * (0.07 - Math.min(i * 0.005, 0.03)); // accelerating
    _note(freq, 0.12, delay, {
      type: i < 4 ? 'sine' : 'triangle',
      vol: 0.18 + i * 0.02,
      attack: 0.005,
      sustain: 0.06,
      detune: Math.random() * 6 - 3
    });
  }

  // Final high note
  _note(baseFreq * 3, 0.2, count * 0.05, {
    type: 'triangle',
    vol: 0.12,
    attack: 0.01,
    sustain: 0.05
  });
}


// ═══════════════════════════════════════════════════════════════
// INTEGRATION GUIDE
// ═══════════════════════════════════════════════════════════════
/*

  HOW TO UPGRADE PICTURE HUNT SOUNDS:

  Step 1: Include the module
  ---------------------------
  In index.html, add before closing </body>:
    <script src="content/rich-sound-fx.js?v=1"></script>

  Step 2: Replace the 4 existing sound functions in app.js
  ---------------------------------------------------------
  Find and replace these function definitions:

    function playSuccess() { ... }
    →  function playSuccess() { playRichSuccess(); }

    function playMiss() { ... }
    →  function playMiss() { playRichMiss(); }

    function playVictorySound() { ... }
    →  function playVictorySound() { playRichVictory(); }

    function playClick() { ... }
    →  function playClick() { playRichClick(); }

  Step 3: Add the 3 new sound triggers
  ------------------------------------
  a) Skip button handler — add playRichSkip():
     Find where skip is handled (the skipItem function or onclick for skip).
     Add: playRichSkip();

  b) Hint system — add playRichHint():
     Where hint button becomes visible or pulses, add:
     playRichHint();

  c) Streak tracking — add playRichStreak():
     Add a streak counter near the top of app.js:
       var currentStreak = 0;

     In the success handler (where playSuccess is called):
       currentStreak++;
       if (currentStreak >= 3) playRichStreak(currentStreak);

     In the miss handler (where playMiss is called):
       currentStreak = 0;

     In startCategory or renderSplash (game start):
       currentStreak = 0;

  Step 4: Keep or remove the playTone() helper
  ---------------------------------------------
  The old playTone() helper can stay — it doesn't conflict.
  The new _note() function is self-contained.
  You can delete playTone if you want to keep things clean,
  but it's safe to leave it.

  NOTES:
  - The rich sounds use the SAME audioCtx as the existing code,
    so iOS/Silk unlock behavior is unchanged.
  - All sounds respect the existing soundEnabled toggle.
  - No external files or network requests needed.
  - If you want to later replace with real recorded MP3s,
    just swap the function bodies to play <audio> elements.
*/
