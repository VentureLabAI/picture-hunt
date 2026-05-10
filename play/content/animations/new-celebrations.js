/**
 * Picture Hunt — Enhanced Celebration Animations
 * ================================================
 * Drop-in module: 3 new toddler-friendly celebration effects.
 *
 * ANIMATIONS:
 *   1. Emoji Rain    — Falling stars, hearts, sparkles (replaces plain confetti)
 *   2. Sticker Pop   — Giant emoji pops center-screen, wiggles, floats away
 *   3. Fireworks     — Colorful particle bursts from random screen positions
 *
 * USAGE:
 *   // After including this file (or pasting into app.js):
 *   celebrateEmojiRain(3000);         // 3-second emoji rain
 *   celebrateStickerPop('⭐');        // giant star pop
 *   celebrateFireworks(3000);          // 3-second fireworks
 *   celebrateCombo(3500);              // all 3 together (for victory screen)
 *   stopAllCelebrations();             // clean up everything
 *
 * REQUIREMENTS:
 *   - An existing <canvas id="confetti-canvas"> (reuses the app's canvas)
 *   - CSS from new-celebrations.css (or paste the styles into style.css)
 *
 * TODDLER UX NOTES:
 *   - Big, colorful, recognizable shapes (emojis, not abstract particles)
 *   - Short durations (2-4 seconds) — holds attention without overstaying
 *   - No rapid flashing or strobing (safe for photosensitive kids)
 *   - Gentle motion curves, nothing jarring
 */

// ═══════════════════════════════════════════════════════════════
// SHARED STATE
// ═══════════════════════════════════════════════════════════════
var _celebrationTimers = [];
var _celebrationAnimFrames = [];

function _addTimer(id) { _celebrationTimers.push(id); }
function _addFrame(id) { _celebrationAnimFrames.push(id); }

function stopAllCelebrations() {
  _celebrationTimers.forEach(function(id) { clearTimeout(id); });
  _celebrationAnimFrames.forEach(function(id) { cancelAnimationFrame(id); });
  _celebrationTimers = [];
  _celebrationAnimFrames = [];
  // Clear canvas
  var canvas = document.getElementById('confetti-canvas');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  // Remove any sticker pop elements
  document.querySelectorAll('.sticker-pop-overlay').forEach(function(el) { el.remove(); });
}


// ═══════════════════════════════════════════════════════════════
// 1. EMOJI RAIN 🌟
// ═══════════════════════════════════════════════════════════════
// Instead of colored rectangles, rain recognizable emojis.
// Kids respond to stars, hearts, and sparkles — they "mean" something.

function celebrateEmojiRain(durationMs) {
  durationMs = durationMs || 3000;
  var canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  var emojis = ['⭐', '🌟', '💛', '💚', '💜', '❤️', '✨', '🎉', '🎊', '💫'];
  var pieces = [];
  var count = 60; // fewer than confetti rectangles, but bigger and more meaningful

  for (var i = 0; i < count; i++) {
    pieces.push({
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height,          // start above viewport
      size: Math.random() * 20 + 18,              // 18-38px — big enough for toddlers to see
      vy: Math.random() * 2.5 + 1.5,              // gentle fall speed
      vx: (Math.random() - 0.5) * 1.5,            // slight horizontal drift
      wobble: Math.random() * Math.PI * 2,         // phase offset for wobble
      wobbleSpeed: Math.random() * 0.03 + 0.02
    });
  }

  var start = Date.now();
  function loop() {
    var elapsed = Date.now() - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fade out in last 500ms
    var fade = elapsed > durationMs - 500 ? Math.max(0, (durationMs - elapsed) / 500) : 1;
    ctx.globalAlpha = fade;

    for (var j = 0; j < pieces.length; j++) {
      var p = pieces[j];
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.wobble) * 0.5;  // gentle sine wobble
      p.wobble += p.wobbleSpeed;

      ctx.font = p.size + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, p.x, p.y);

      // Recycle pieces that fall off-screen (during active phase only)
      if (p.y > canvas.height + 40 && elapsed < durationMs - 800) {
        p.y = -30;
        p.x = Math.random() * canvas.width;
      }
    }

    ctx.globalAlpha = 1;
    if (elapsed < durationMs) {
      var frameId = requestAnimationFrame(loop);
      _addFrame(frameId);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  loop();
}


// ═══════════════════════════════════════════════════════════════
// 2. STICKER POP 🏆
// ═══════════════════════════════════════════════════════════════
// A giant emoji appears center-screen with a satisfying pop-and-wiggle,
// then gently floats upward and fades out. Simple, delightful, toddler-perfect.
//
// Uses a DOM element (not canvas) so the emoji renders at full quality
// on all devices including Fire tablet Silk browser.

function celebrateStickerPop(emoji, durationMs) {
  emoji = emoji || '⭐';
  durationMs = durationMs || 2500;

  // Create overlay
  var overlay = document.createElement('div');
  overlay.className = 'sticker-pop-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  var sticker = document.createElement('div');
  sticker.className = 'sticker-pop-emoji';
  sticker.textContent = emoji;
  overlay.appendChild(sticker);
  document.body.appendChild(overlay);

  // Trigger animation on next frame (so CSS transition kicks in)
  requestAnimationFrame(function() {
    sticker.classList.add('sticker-pop-active');
  });

  // Float up and fade after a beat
  var floatTimer = setTimeout(function() {
    sticker.classList.add('sticker-pop-float');
  }, durationMs * 0.5);
  _addTimer(floatTimer);

  // Remove from DOM
  var removeTimer = setTimeout(function() {
    overlay.remove();
  }, durationMs);
  _addTimer(removeTimer);
}

// Convenience: random celebration emoji
function celebrateStickerPopRandom(durationMs) {
  var pool = ['⭐', '🌟', '🏆', '🎉', '👏', '💪', '🦁', '🐸', '🎈', '🌈'];
  celebrateStickerPop(pool[Math.floor(Math.random() * pool.length)], durationMs);
}


// ═══════════════════════════════════════════════════════════════
// 3. FIREWORKS 🎆
// ═══════════════════════════════════════════════════════════════
// Colorful particle bursts from random screen positions.
// No rapid flashing — each burst is a smooth expansion + fade.
// Uses the existing confetti canvas.

function celebrateFireworks(durationMs) {
  durationMs = durationMs || 3000;
  var canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  var bursts = [];
  var burstColors = [
    ['#f5576c', '#ff8a80', '#ffcdd2'],  // pink/red
    ['#43e97b', '#66bb6a', '#a5d6a7'],  // green
    ['#667eea', '#7986cb', '#c5cae9'],  // blue/purple
    ['#feca57', '#ffee58', '#fff9c4'],  // yellow/gold
    ['#f093fb', '#ce93d8', '#e1bee7'],  // magenta
    ['#38f9d7', '#4dd0e1', '#b2ebf2']   // cyan
  ];

  // Schedule 4-6 bursts spread across the duration
  var burstCount = 4 + Math.floor(Math.random() * 3);
  for (var b = 0; b < burstCount; b++) {
    var delay = (b / burstCount) * (durationMs * 0.7); // spread across 70% of duration
    (function(d) {
      var t = setTimeout(function() { spawnBurst(); }, d);
      _addTimer(t);
    })(delay);
  }

  function spawnBurst() {
    var colorSet = burstColors[Math.floor(Math.random() * burstColors.length)];
    var cx = canvas.width * 0.15 + Math.random() * canvas.width * 0.7; // avoid edges
    var cy = canvas.height * 0.15 + Math.random() * canvas.height * 0.5; // upper 65%
    var particleCount = 30 + Math.floor(Math.random() * 20);
    var particles = [];

    for (var i = 0; i < particleCount; i++) {
      var angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
      var speed = Math.random() * 3 + 2;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colorSet[Math.floor(Math.random() * colorSet.length)],
        size: Math.random() * 4 + 3,
        life: 1.0,
        decay: Math.random() * 0.015 + 0.012
      });
    }

    bursts.push({ particles: particles, born: Date.now() });
  }

  var start = Date.now();
  function loop() {
    var elapsed = Date.now() - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var b = bursts.length - 1; b >= 0; b--) {
      var burst = bursts[b];
      var alive = false;
      for (var i = 0; i < burst.particles.length; i++) {
        var p = burst.particles[i];
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;     // gentle gravity
        p.vx *= 0.99;     // air resistance
        p.life -= p.decay;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fill();
      }
      if (!alive) bursts.splice(b, 1);
    }

    ctx.globalAlpha = 1;
    if (elapsed < durationMs || bursts.length > 0) {
      var frameId = requestAnimationFrame(loop);
      _addFrame(frameId);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  loop();
}


// ═══════════════════════════════════════════════════════════════
// COMBO: ALL THREE TOGETHER (for victory screen)
// ═══════════════════════════════════════════════════════════════
// Layer all 3 effects for the ultimate toddler celebration.
// Sticker pop appears first, then emoji rain + fireworks behind it.

function celebrateCombo(durationMs) {
  durationMs = durationMs || 4000;
  celebrateStickerPop('🏆', durationMs);
  var rainDelay = setTimeout(function() {
    celebrateEmojiRain(durationMs - 300);
    celebrateFireworks(durationMs - 300);
  }, 300);
  _addTimer(rainDelay);
}


// ═══════════════════════════════════════════════════════════════
// INTEGRATION GUIDE
// ═══════════════════════════════════════════════════════════════
/*
  HOW TO ADD TO PICTURE HUNT:

  Option A: Include as separate file
  ----------------------------------
  In index.html, add before closing </body>:
    <script src="new-celebrations.js?v=1"></script>

  Option B: Paste into app.js
  ----------------------------------
  Copy everything above into app.js, replacing or supplementing
  the existing fireConfetti() function.

  THEN UPDATE THE CELEBRATION CALLS:

  1. Normal match (line ~851 in current app.js):
     BEFORE:  fireConfetti(3500);
     AFTER:   celebrateEmojiRain(3500);
              celebrateStickerPopRandom(2500);
     (or keep fireConfetti and ADD the sticker pop for variety)

  2. Victory screen (line ~803):
     BEFORE:  fireConfetti(4000);
     AFTER:   celebrateCombo(4000);

  3. Parent override accept (line ~906):
     BEFORE:  fireConfetti(1000);
     AFTER:   celebrateStickerPop('👏', 1500);

  4. Add to stopConfetti() so cleanup catches everything:
     function stopConfetti() {
       // ...existing cleanup...
       stopAllCelebrations();
     }

  CSS REQUIRED:
  Add the contents of new-celebrations.css to style.css.
  See that file for the sticker pop animations.
*/
