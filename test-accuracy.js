#!/usr/bin/env node
// ============================================================
// Picture Hunt — Accuracy & Tolerance Test Harness v2
// Tests AI prompts against generated + real-world images
// Usage: GEMINI_API_KEY=xxx node test-accuracy.js
// ============================================================

const https = require('https');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('Set GEMINI_API_KEY env var'); process.exit(1); }

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// ── Prompts (exact copy from app.js) ──────────────────────────
function thingsPrompt(name) {
  return 'Is the primary object in this photo a ' + name + ', or a very similar common variation of it? A sippy cup counts as a cup, a sandal counts as a shoe, a sofa counts as a chair. But a hat does not count as a shoe. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
}
function shapesPrompt(name) {
  return 'Does the main object in this photo predominantly have the shape of a ' + name + '? It does not need to be perfectly geometric — real objects have rounded edges, imperfections, and may appear stretched due to camera angle. Ovals and elongated circles still count as circles. A plate is a circle, a book is a rectangle, a pizza slice is a triangle. But completely different shapes should be rejected (a square is not a circle). Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
}
function colorsPrompt(name) {
  return 'Is the predominant color of the main object in this photo ' + name + '? This includes all shades, tints, and variations of ' + name + ' (e.g. light blue, dark blue, and navy all count as blue). However, colors from a completely different color family must be rejected — green is not brown, purple is not red. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see and its color.';
}

// ── Image generation ──────────────────────────────────────────
function colorImage(r, g, b, size) {
  size = size || 200;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);
  return { base64: canvas.toBuffer('image/jpeg').toString('base64'), mime: 'image/jpeg' };
}

// Two-tone image: main object one color on a different background
function colorObjectOnBg(objR, objG, objB, bgR, bgG, bgB) {
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
  ctx.fillRect(0, 0, 200, 200);
  // Big circle as "the object"
  ctx.fillStyle = `rgb(${objR},${objG},${objB})`;
  ctx.beginPath(); ctx.arc(100, 100, 70, 0, Math.PI * 2); ctx.fill();
  return { base64: canvas.toBuffer('image/jpeg').toString('base64'), mime: 'image/jpeg' };
}

function shapeImage(shape, opts) {
  opts = opts || {};
  const size = 200;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = opts.bg || 'white';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = opts.color || '#333';
  const cx = size / 2, cy = size / 2, r = opts.radius || 70;

  switch (shape) {
    case 'circle': ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); break;
    case 'square': ctx.fillRect(cx - r, cy - r, r * 2, r * 2); break;
    case 'triangle':
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy + r); ctx.lineTo(cx - r, cy + r); ctx.closePath(); ctx.fill(); break;
    case 'rectangle': ctx.fillRect(cx - r, cy - r * 0.5, r * 2, r); break;
    case 'star': drawStar(ctx, cx, cy, 5, r, r * 0.4); ctx.fill(); break;
    case 'heart': drawHeart(ctx, cx, cy, r); ctx.fill(); break;
    case 'diamond':
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.6, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.6, cy); ctx.closePath(); ctx.fill(); break;
    // Imperfect shapes for tolerance testing
    case 'oval':
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.65, 0, 0, Math.PI * 2); ctx.fill(); break;
    case 'rounded-rect':
      roundRect(ctx, cx - r, cy - r * 0.5, r * 2, r, 20); ctx.fill(); break;
    case 'wonky-circle':
      // Slightly irregular circle
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.1) {
        const rr = r + Math.sin(a * 3) * 8 + Math.cos(a * 5) * 5;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill(); break;
    case 'wide-diamond':
      ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.7); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r * 0.7); ctx.lineTo(cx - r, cy); ctx.closePath(); ctx.fill(); break;
  }
  return { base64: canvas.toBuffer('image/jpeg').toString('base64'), mime: 'image/jpeg' };
}

// Draw real-world-ish objects for "Things" category
function drawObject(type) {
  const size = 300;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Slightly noisy background (like a real photo)
  ctx.fillStyle = '#e8e0d0';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(${120+Math.random()*40},${110+Math.random()*40},${100+Math.random()*30},0.1)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
  }

  const cx = size / 2, cy = size / 2;

  switch (type) {
    case 'cup':
      // Trapezoid cup shape
      ctx.fillStyle = '#3498db';
      ctx.beginPath(); ctx.moveTo(100, 80); ctx.lineTo(200, 80); ctx.lineTo(190, 220); ctx.lineTo(110, 220); ctx.closePath(); ctx.fill();
      // Handle
      ctx.strokeStyle = '#3498db'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(205, 150, 25, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      break;
    case 'book':
      // Rectangular book
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(70, 60, 160, 200);
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(70, 60, 15, 200); // spine
      // Title lines
      ctx.fillStyle = '#f5f5f0';
      ctx.fillRect(110, 120, 90, 8);
      ctx.fillRect(120, 145, 70, 6);
      break;
    case 'shoe':
      // Side-view shoe shape
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath(); ctx.moveTo(50, 200); ctx.lineTo(50, 160); ctx.quadraticCurveTo(80, 100, 150, 110);
      ctx.quadraticCurveTo(220, 115, 260, 140); ctx.lineTo(260, 200); ctx.closePath(); ctx.fill();
      // Sole
      ctx.fillStyle = '#ecf0f1';
      ctx.fillRect(45, 195, 220, 15);
      break;
    case 'ball':
      ctx.fillStyle = '#f39c12';
      ctx.beginPath(); ctx.arc(cx, cy, 80, 0, Math.PI * 2); ctx.fill();
      // Curved lines for soccer/basketball look
      ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 80, 0.3, 1.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 80, 2.5, 3.8); ctx.stroke();
      break;
    case 'spoon':
      ctx.fillStyle = '#bdc3c7';
      // Bowl of spoon (oval)
      ctx.beginPath(); ctx.ellipse(cx, 100, 35, 50, 0, 0, Math.PI * 2); ctx.fill();
      // Handle
      ctx.fillRect(cx - 6, 140, 12, 120);
      // Rounded bottom
      ctx.beginPath(); ctx.arc(cx, 260, 6, 0, Math.PI * 2); ctx.fill();
      break;
    case 'hat':
      // Baseball cap
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath(); ctx.arc(cx, 160, 70, Math.PI, 0); ctx.fill(); // dome
      ctx.fillRect(cx - 70, 155, 140, 15); // band
      // Brim
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.ellipse(cx + 20, 168, 80, 15, 0.15, -Math.PI, 0); ctx.fill();
      break;
    case 'key':
      ctx.fillStyle = '#f1c40f';
      // Head (circle with hole)
      ctx.beginPath(); ctx.arc(120, 120, 35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8e0d0';
      ctx.beginPath(); ctx.arc(120, 120, 15, 0, Math.PI * 2); ctx.fill();
      // Shaft
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(150, 113, 100, 14);
      // Teeth
      ctx.fillRect(220, 127, 12, 18);
      ctx.fillRect(238, 127, 12, 14);
      break;
    case 'lamp':
      // Lampshade (trapezoid)
      ctx.fillStyle = '#f5deb3';
      ctx.beginPath(); ctx.moveTo(100, 60); ctx.lineTo(200, 60); ctx.lineTo(220, 160); ctx.lineTo(80, 160); ctx.closePath(); ctx.fill();
      // Pole
      ctx.fillStyle = '#888';
      ctx.fillRect(cx - 5, 160, 10, 70);
      // Base
      ctx.fillStyle = '#666';
      ctx.beginPath(); ctx.ellipse(cx, 235, 40, 12, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'clock':
      // Round clock
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#333'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, cy, 80, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Hour marks
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        ctx.fillStyle = '#333';
        ctx.fillRect(cx + Math.cos(a) * 65 - 3, cy + Math.sin(a) * 65 - 3, 6, 6);
      }
      // Hands
      ctx.strokeStyle = '#333'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 30, cy - 35); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 15, cy - 55); ctx.stroke();
      break;
    case 'plate':
      // Top-down plate (circle with inner ring)
      ctx.fillStyle = '#f5f5f5';
      ctx.beginPath(); ctx.arc(cx, cy, 90, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'fork':
      ctx.fillStyle = '#bdc3c7';
      // Tines
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(cx - 24 + i * 16, 60, 6, 80);
      }
      // Connector
      ctx.fillRect(cx - 24, 130, 54, 12);
      // Handle
      ctx.fillRect(cx - 5, 142, 10, 110);
      ctx.beginPath(); ctx.arc(cx, 252, 5, 0, Math.PI * 2); ctx.fill();
      break;
    default:
      // Generic colored rectangle as fallback
      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(70, 70, 160, 160);
  }
  return { base64: canvas.toBuffer('image/jpeg').toString('base64'), mime: 'image/jpeg' };
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    if (i === 0) ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    else ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  ctx.closePath();
}
function drawHeart(ctx, cx, cy, size) {
  const s = size * 0.6;
  ctx.beginPath(); ctx.moveTo(cx, cy + s);
  ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.5, cx - s * 0.5, cy - s * 1.5, cx, cy - s * 0.5);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s * 1.5, cx + s * 1.5, cy - s * 0.5, cx, cy + s);
  ctx.closePath();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

// ── API call ──────────────────────────────────────────────────
function callGemini(prompt, imageBase64, imageMime) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [
        { text: prompt },
        { inlineData: { mimeType: imageMime, data: imageBase64 } }
      ]}],
      generationConfig: { temperature: 0 }
    });
    const url = new URL(API_URL);
    const options = {
      hostname: url.hostname, path: url.pathname + url.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) { reject(new Error(json.error.message)); return; }
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const firstLine = text.split('\n')[0].toLowerCase().trim();
          resolve({ answer: firstLine.includes('yes') ? 'yes' : 'no', raw: text.trim() });
        } catch(e) { reject(new Error('Parse error: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

// ── Test definitions ──────────────────────────────────────────
const tests = [];
function t(cat, target, imageFn, expect, desc) {
  tests.push({ category: cat, target, image: imageFn, expect, desc });
}

// ═══════════════════════════════════════════════════════════════
// COLOR TESTS
// ═══════════════════════════════════════════════════════════════
console.log('Building test suite...');

// Exact matches
t('colors', 'red', () => colorImage(220,30,30), 'yes', 'red block → red');
t('colors', 'blue', () => colorImage(30,60,220), 'yes', 'blue block → blue');
t('colors', 'green', () => colorImage(30,180,30), 'yes', 'green block → green');
t('colors', 'yellow', () => colorImage(240,220,20), 'yes', 'yellow block → yellow');
t('colors', 'orange', () => colorImage(240,140,20), 'yes', 'orange block → orange');
t('colors', 'purple', () => colorImage(140,30,180), 'yes', 'purple block → purple');
t('colors', 'pink', () => colorImage(240,130,170), 'yes', 'pink block → pink');
t('colors', 'white', () => colorImage(245,245,245), 'yes', 'white block → white');
t('colors', 'black', () => colorImage(20,20,20), 'yes', 'black block → black');
t('colors', 'brown', () => colorImage(130,70,30), 'yes', 'brown block → brown');

// Shade tolerance (should accept)
t('colors', 'blue', () => colorImage(130,180,240), 'yes', 'light blue → blue');
t('colors', 'blue', () => colorImage(10,20,100), 'yes', 'dark blue → blue');
t('colors', 'blue', () => colorImage(0,0,80), 'yes', 'navy → blue');
t('colors', 'blue', () => colorImage(70,130,200), 'yes', 'steel blue → blue');
t('colors', 'green', () => colorImage(0,80,0), 'yes', 'dark green → green');
t('colors', 'green', () => colorImage(120,240,120), 'yes', 'light green → green');
t('colors', 'green', () => colorImage(0,128,0), 'yes', 'forest green → green');
t('colors', 'red', () => colorImage(120,10,10), 'yes', 'dark red / maroon → red');
t('colors', 'red', () => colorImage(255,80,80), 'yes', 'light red / salmon → red');
t('colors', 'pink', () => colorImage(255,50,120), 'yes', 'hot pink → pink');
t('colors', 'pink', () => colorImage(255,182,193), 'yes', 'light pink → pink');
t('colors', 'orange', () => colorImage(255,165,0), 'yes', 'bright orange → orange');
t('colors', 'orange', () => colorImage(200,100,20), 'yes', 'burnt orange → orange');
t('colors', 'purple', () => colorImage(75,0,130), 'yes', 'indigo → purple');
t('colors', 'purple', () => colorImage(200,130,240), 'yes', 'lavender-ish → purple');
t('colors', 'yellow', () => colorImage(255,255,100), 'yes', 'pale yellow → yellow');
t('colors', 'brown', () => colorImage(90,50,20), 'yes', 'dark brown → brown');
t('colors', 'brown', () => colorImage(180,120,60), 'yes', 'tan/light brown → brown');

// Wrong color rejections (must reject)
t('colors', 'brown', () => colorImage(30,180,30), 'no', 'green → brown REJECT');
t('colors', 'blue', () => colorImage(220,30,30), 'no', 'red → blue REJECT');
t('colors', 'yellow', () => colorImage(140,30,180), 'no', 'purple → yellow REJECT');
t('colors', 'red', () => colorImage(30,180,30), 'no', 'green → red REJECT');
t('colors', 'white', () => colorImage(20,20,20), 'no', 'black → white REJECT');
t('colors', 'orange', () => colorImage(30,60,220), 'no', 'blue → orange REJECT');
t('colors', 'green', () => colorImage(220,30,30), 'no', 'red → green REJECT');
t('colors', 'pink', () => colorImage(30,60,220), 'no', 'blue → pink REJECT');
t('colors', 'purple', () => colorImage(240,220,20), 'no', 'yellow → purple REJECT');

// Edge case: colored object on different colored background
t('colors', 'red', () => colorObjectOnBg(220,30,30, 200,200,200), 'yes', 'red ball on gray bg → red');
t('colors', 'blue', () => colorObjectOnBg(30,60,220, 240,240,200), 'yes', 'blue ball on beige bg → blue');

// ═══════════════════════════════════════════════════════════════
// SHAPE TESTS
// ═══════════════════════════════════════════════════════════════
// Exact matches
['circle','square','triangle','rectangle','star','heart','diamond'].forEach(s => {
  t('shapes', s, () => shapeImage(s), 'yes', `${s} → ${s}`);
});

// Tolerance: imperfect shapes (should still match)
t('shapes', 'circle', () => shapeImage('wonky-circle'), 'yes', 'wonky circle → circle');
t('shapes', 'circle', () => shapeImage('circle', {radius: 40}), 'yes', 'small circle → circle');
t('shapes', 'rectangle', () => shapeImage('rounded-rect'), 'yes', 'rounded rectangle → rectangle');
t('shapes', 'diamond', () => shapeImage('wide-diamond'), 'yes', 'wide diamond → diamond');
t('shapes', 'circle', () => shapeImage('oval'), 'yes', 'oval → circle (generous)');

// Colored shapes (should still match shape)
t('shapes', 'circle', () => shapeImage('circle', {color: 'red', bg: '#eee'}), 'yes', 'red circle → circle');
t('shapes', 'square', () => shapeImage('square', {color: 'blue', bg: '#eee'}), 'yes', 'blue square → square');

// Wrong shape rejections
t('shapes', 'circle', () => shapeImage('square'), 'no', 'square → circle REJECT');
t('shapes', 'triangle', () => shapeImage('circle'), 'no', 'circle → triangle REJECT');
t('shapes', 'square', () => shapeImage('triangle'), 'no', 'triangle → square REJECT');
t('shapes', 'star', () => shapeImage('circle'), 'no', 'circle → star REJECT');
t('shapes', 'heart', () => shapeImage('square'), 'no', 'square → heart REJECT');
t('shapes', 'diamond', () => shapeImage('circle'), 'no', 'circle → diamond REJECT');

// ═══════════════════════════════════════════════════════════════
// THINGS (OBJECTS) TESTS
// ═══════════════════════════════════════════════════════════════
// Should match
t('things', 'cup', () => drawObject('cup'), 'yes', 'drawn cup → cup');
t('things', 'book', () => drawObject('book'), 'yes', 'drawn book → book');
t('things', 'shoe', () => drawObject('shoe'), 'yes', 'drawn shoe → shoe');
t('things', 'ball', () => drawObject('ball'), 'yes', 'drawn ball → ball');
t('things', 'spoon', () => drawObject('spoon'), 'yes', 'drawn spoon → spoon');
t('things', 'hat', () => drawObject('hat'), 'yes', 'drawn hat → hat');
t('things', 'keys', () => drawObject('key'), 'yes', 'drawn key → keys');
t('things', 'lamp', () => drawObject('lamp'), 'yes', 'drawn lamp → lamp');
t('things', 'clock', () => drawObject('clock'), 'yes', 'drawn clock → clock');
t('things', 'plate', () => drawObject('plate'), 'yes', 'drawn plate → plate');
t('things', 'fork', () => drawObject('fork'), 'yes', 'drawn fork → fork');

// Cross-object rejections (should NOT match)
t('things', 'shoe', () => drawObject('hat'), 'no', 'drawn hat → shoe REJECT');
t('things', 'cup', () => drawObject('shoe'), 'no', 'drawn shoe → cup REJECT');
t('things', 'book', () => drawObject('ball'), 'no', 'drawn ball → book REJECT');
t('things', 'spoon', () => drawObject('fork'), 'no', 'drawn fork → spoon REJECT');
t('things', 'lamp', () => drawObject('clock'), 'no', 'drawn clock → lamp REJECT');
t('things', 'hat', () => drawObject('cup'), 'no', 'drawn cup → hat REJECT');
t('things', 'clock', () => drawObject('lamp'), 'no', 'drawn lamp → clock REJECT');

// Similar object tolerance (should accept)
// plate looks like a circle → should still match "plate"
t('things', 'plate', () => shapeImage('circle', {color: '#f5f5f5', bg: '#e8e0d0'}), 'yes', 'white circle on beige → plate (generous)');

// ═══════════════════════════════════════════════════════════════
// RUN TESTS
// ═══════════════════════════════════════════════════════════════
async function runTests() {
  const sections = {
    colors: tests.filter(t => t.category === 'colors'),
    shapes: tests.filter(t => t.category === 'shapes'),
    things: tests.filter(t => t.category === 'things')
  };

  console.log(`\n🎯 Picture Hunt Accuracy Test Harness v2`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`${tests.length} tests total: ${sections.colors.length} colors, ${sections.shapes.length} shapes, ${sections.things.length} things\n`);

  let totalPassed = 0, totalFailed = 0, totalErrors = 0;
  const allFailures = [];

  for (const [section, sectionTests] of Object.entries(sections)) {
    console.log(`\n── ${section.toUpperCase()} ${'─'.repeat(50)}`);
    let passed = 0, failed = 0;

    for (let i = 0; i < sectionTests.length; i++) {
      const tt = sectionTests[i];
      const img = tt.image();
      const prompt = tt.category === 'colors' ? colorsPrompt(tt.target)
        : tt.category === 'shapes' ? shapesPrompt(tt.target)
        : thingsPrompt(tt.target);

      process.stdout.write(`  [${i + 1}/${sectionTests.length}] ${tt.desc}... `);

      try {
        const result = await callGemini(prompt, img.base64, img.mime);
        const ok = result.answer === tt.expect;

        if (ok) {
          console.log(`✅ ${result.answer.toUpperCase()}`);
          passed++; totalPassed++;
        } else {
          console.log(`❌ Got ${result.answer.toUpperCase()} (expected ${tt.expect.toUpperCase()})`);
          console.log(`     AI: ${result.raw.split('\n').slice(0, 2).join(' | ')}`);
          failed++; totalFailed++;
          allFailures.push(`[${section}] ${tt.desc}`);
        }
        await new Promise(r => setTimeout(r, 250));
      } catch (err) {
        console.log(`⚠️ ERROR: ${err.message.substring(0, 100)}`);
        totalErrors++;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    console.log(`  ${section}: ${passed}/${passed + failed} passed`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  const total = totalPassed + totalFailed;
  console.log(`📊 TOTAL: ${totalPassed} passed, ${totalFailed} failed, ${totalErrors} errors out of ${tests.length} tests`);
  console.log(`   Accuracy: ${total > 0 ? ((totalPassed / total) * 100).toFixed(1) : 0}%`);

  if (allFailures.length) {
    console.log(`\n❌ Failures:`);
    allFailures.forEach(f => console.log(`   - ${f}`));
  }
  console.log('');
  process.exit(totalFailed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error(e); process.exit(1); });
