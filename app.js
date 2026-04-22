// ============================================================
// Picture Hunt! — A visual scavenger hunt for toddlers
// ============================================================

// ═══════════════════════════════════════════════════════════════
// API CONFIGURATION
// ═══════════════════════════════════════════════════════════════
// Proxy URL — set this to your Cloudflare Worker URL to skip API key setup
// Leave empty string to use direct Gemini API with localStorage key
var PROXY_URL = 'https://picture-hunt-api.aidevlab3.workers.dev/';

// ═══════════════════════════════════════════════════════════════
// API KEY MANAGEMENT (only needed when no proxy)
// ═══════════════════════════════════════════════════════════════
(function() {
  var h = location.hash;
  if (h && h.indexOf('#key=') === 0) {
    var k = h.substring(5);
    if (k) {
      localStorage.setItem('PH_KEY', k);
      location.replace(location.pathname + location.search);
      return;
    }
  }
})();

let GEMINI_API_KEY = localStorage.getItem('PH_KEY') || '';

function hasApiAccess() {
  return PROXY_URL || GEMINI_API_KEY;
}

function showKeySetup() {
  document.getElementById('splash').querySelector('.splash-content').innerHTML =
    '<h1 style="font-size:2.5rem;margin-bottom:1rem;">🔧 Parent Setup</h1>'
    + '<p style="font-size:1.1rem;margin-bottom:1rem;color:rgba(255,255,255,0.7);">Paste your Gemini API key</p>'
    + '<input type="text" id="key-input" placeholder="API key"'
    + ' style="width:80%;padding:14px;font-size:1rem;border-radius:12px;border:2px solid #555;background:#2a2a4a;color:white;margin-bottom:1rem;">'
    + '<br>'
    + '<button onclick="saveKey()" class="big-btn play-btn">Save & Play! 🎮</button>';
}

function saveKey() {
  var k = document.getElementById('key-input').value.trim();
  if (k) {
    localStorage.setItem('PH_KEY', k);
    GEMINI_API_KEY = k;
    location.reload();
  }
}

if (!hasApiAccess()) {
  window.addEventListener('DOMContentLoaded', showKeySetup);
}

// ═══════════════════════════════════════════════════════════════
// CATEGORIES & ITEMS
// ═══════════════════════════════════════════════════════════════
var CATEGORIES = {
  household: {
    id: 'household', name: 'Things', emoji: '🏠',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    speakPrompt: function(n) { return 'Can you find a ' + n + '?'; },
    speakName: 'Things! Find stuff around the house!',
    aiPrompt: function(n) {
      // Item-specific overrides for tricky items
      // NOTE: All prompts use "does this photo contain" not "is the primary object"
      // because a 3-year-old will not center or isolate the object.
      var overrides = {
        'remote control': 'Does this photo contain a TV remote control or any type of remote control device anywhere in the frame? This includes smart remotes, streaming remotes (Roku, Fire TV), game controllers, or universal remotes. The remote does not need to be centered or the only object. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'water bottle': 'Does this photo contain a water bottle, drinking bottle, or any type of bottle that holds a beverage anywhere in the frame? A branded water bottle (Ozarka, Dasani, etc.), sports bottle, squeeze bottle, or reusable water bottle all count. It does not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'keys': 'Does this photo contain a key or set of keys anywhere in the frame? Car keys, house keys, key fobs, or keychains all count. They do not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'brush': 'Does this photo contain a brush of any kind anywhere in the frame — hairbrush, paintbrush, scrub brush, or cleaning brush? It does not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'towel': 'Does this photo contain a towel, washcloth, hand towel, or bath towel anywhere in the frame? It does not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'lamp': 'Does this photo contain a lamp, table lamp, floor lamp, or desk lamp anywhere in the frame? A light fixture that sits on a surface or floor counts. It does not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'clock': 'Does this photo contain a clock anywhere in the frame — wall clock, alarm clock, digital clock, or any device primarily showing the time? It does not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'fork': 'Does this photo contain a fork anywhere in the frame, including dinner forks, salad forks, or plastic forks? It does not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'blanket': 'Does this photo contain a blanket, throw blanket, quilt, or comforter anywhere in the frame? A fabric covering used for warmth counts. It does not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'pillow': 'Does this photo contain a pillow, throw pillow, or cushion anywhere in the frame? It does not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'toothbrush': 'Does this photo contain a toothbrush anywhere in the frame? It does not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'crayon': 'Does this photo contain a crayon or crayons anywhere in the frame? A single crayon or a box of crayons both count. They do not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'spoon': 'Does this photo contain a spoon anywhere in the frame, including teaspoons, tablespoons, or plastic spoons? It does not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'sock': 'Does this photo contain a sock or socks anywhere in the frame? Any type of sock — ankle, crew, fuzzy — counts. They do not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'hat': 'Does this photo contain a hat or cap of any kind anywhere in the frame — baseball cap, beanie, sun hat, winter hat? It does not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.',
        'plate': 'Does this photo contain a plate or dinner plate anywhere in the frame? A plastic plate, paper plate, or ceramic plate all count. It does not need to be centered. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.'
      };
      if (overrides[n]) return overrides[n];
      return 'Does this photo contain a ' + n + ' anywhere in the frame, or a very similar common variation of it? A sippy cup counts as a cup, a sandal counts as a shoe. The object does not need to be centered or the only item visible — a toddler took this photo. But a completely different object should be rejected. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'shoe', emoji: '👟', d: 1 }, { name: 'cup', emoji: '🥤', d: 1 },
      { name: 'ball', emoji: '⚽', d: 1 }, { name: 'teddy bear', emoji: '🧸', d: 1 },
      { name: 'book', emoji: '📚', d: 1 }, { name: 'spoon', emoji: '🥄', d: 2 },
      { name: 'pillow', emoji: '🛏️', img: 'img/pillow.png', d: 1 }, { name: 'blanket', emoji: '🧣', img: 'img/blanket.png', d: 2 },
      { name: 'remote control', emoji: '📺', img: 'img/remote-control.png', d: 2 }, { name: 'toothbrush', emoji: '🪥', d: 1 },
      { name: 'chair', emoji: '🪑', d: 1 }, { name: 'sock', emoji: '🧦', d: 1 },
      { name: 'hat', emoji: '🧢', d: 1 }, { name: 'keys', emoji: '🔑', d: 2 },
      { name: 'water bottle', emoji: '🍼', img: 'img/water-bottle.png', d: 2 }, { name: 'crayon', emoji: '🖍️', d: 2 },
      { name: 'plate', emoji: '🍽️', d: 2 }, { name: 'towel', emoji: '🧻', img: 'img/towel.png', d: 2 },
      { name: 'lamp', emoji: '💡', img: 'img/lamp.png', d: 3 }, { name: 'clock', emoji: '⏰', d: 3 },
      { name: 'fork', emoji: '🍴', img: 'img/fork.png', d: 3 }, { name: 'brush', emoji: '💇', img: 'img/brush.png', d: 3 }
    ]
  },
  shapes: {
    id: 'shapes', name: 'Shapes', emoji: '🔷',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    speakPrompt: function(n) { return 'Can you find a ' + n + '?'; },
    speakName: 'Shapes! Find circles, squares, and more!',
    aiPrompt: function(n) {
      return 'Does this photo contain an object that has the shape of a ' + n + ' anywhere in the frame? It does not need to be perfectly geometric or centered — a toddler took this photo. Real objects have rounded edges and may appear at an angle. Ovals count as circles, elongated shapes count as rectangles. A plate is a circle, a book is a rectangle, a pizza slice is a triangle. But completely different shapes should be rejected. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'circle', emoji: '⭕', d: 1 }, { name: 'square', emoji: '🟦', img: 'img/square.png', d: 1 },
      { name: 'triangle', emoji: '🔺', d: 1 }, { name: 'star', emoji: '⭐', d: 1 },
      { name: 'rectangle', emoji: '🟫', img: 'img/rectangle.png', d: 2 }, { name: 'heart', emoji: '❤️', d: 2 },
      { name: 'diamond', emoji: '🔷', d: 3 }
    ]
  },
  colors: {
    id: 'colors', name: 'Colors', emoji: '🌈',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 50%, #feca57 100%)',
    speakPrompt: function(n) { return 'Can you find something ' + n + '?'; },
    speakName: 'Colors! Find red, blue, green, and more!',
    aiPrompt: function(n) {
      return 'Does this photo contain any object that is clearly ' + n + ' in color anywhere in the frame? The object does not need to be centered or the only thing visible — a toddler took this photo. Accept all shades and tints of ' + n + ' (light blue, dark blue, and navy all count as blue). Reject only if there is truly nothing ' + n + ' visible anywhere. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see and its color.';
    },
    items: [
      { name: 'red', emoji: '🔴', d: 1 }, { name: 'blue', emoji: '🔵', d: 1 },
      { name: 'green', emoji: '🟢', d: 1 }, { name: 'yellow', emoji: '🟡', d: 1 },
      { name: 'orange', emoji: '🟠', d: 2 }, { name: 'purple', emoji: '🟣', d: 2 },
      { name: 'pink', emoji: '🩷', d: 2 }, { name: 'white', emoji: '⚪', d: 3 },
      { name: 'black', emoji: '⚫', d: 3 }, { name: 'brown', emoji: '🟤', d: 3 }
    ]
  },
  animals: {
    id: 'animals', name: 'Animals', emoji: '🐾',
    gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    speakPrompt: function(n) { return 'Can you find a ' + n + '?'; },
    speakName: 'Animals! Find dogs, cats, and more!',
    aiPrompt: function(n) {
      return 'Does this photo contain a ' + n + ' anywhere in the frame? This includes real animals, stuffed animals, toys, figurines, or pictures/images of a ' + n + '. The animal does not need to be centered — a toddler took this photo. But a completely different animal should be rejected. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'dog', emoji: '🐕', d: 1 }, { name: 'cat', emoji: '🐱', d: 1 },
      { name: 'duck', emoji: '🦆', d: 1 }, { name: 'dinosaur', emoji: '🦕', d: 1 },
      { name: 'elephant', emoji: '🐘', d: 2 }, { name: 'lion', emoji: '🦁', d: 2 },
      { name: 'pig', emoji: '🐷', d: 2 }, { name: 'frog', emoji: '🐸', d: 2 },
      { name: 'rabbit', emoji: '🐰', d: 2 }, { name: 'bird', emoji: '🐦', d: 3 },
      { name: 'fish', emoji: '🐟', d: 3 }
    ]
  },
  food: {
    id: 'food', name: 'Food', emoji: '🍎',
    gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    speakPrompt: function(n) { if (n === 'cereal') return 'Can you find a cereal box?'; return 'Can you find ' + (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n + '?'; },
    speakName: 'Food! Find yummy things to eat!',
    aiPrompt: function(n) {
      return 'Does this photo contain ' + n + ' anywhere in the frame, or a container/package of ' + n + '? A juice box counts as juice, a milk carton counts as milk, a cereal box counts as cereal. The food does not need to be centered — a toddler took this photo. But a completely different food should be rejected. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'apple', emoji: '🍎', d: 1 }, { name: 'banana', emoji: '🍌', d: 1 },
      { name: 'orange', emoji: '🍊', d: 1 }, { name: 'bread', emoji: '🍞', d: 1 },
      { name: 'egg', emoji: '🥚', d: 1 }, { name: 'carrot', emoji: '🥕', d: 2 },
      { name: 'cookie', emoji: '🍪', d: 2 }, { name: 'cereal', emoji: '🥣', d: 2 },
      { name: 'milk', emoji: '🥛', d: 2 }, { name: 'yogurt', emoji: '🫙', d: 3 },
      { name: 'juice', emoji: '🧃', d: 3 }
    ]
  },
  furniture: {
    id: 'furniture', name: 'Furniture', emoji: '🛋️',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    speakPrompt: function(n) { return 'Can you find a ' + n + '?'; },
    speakName: 'Furniture! Find things around the house!',
    aiPrompt: function(n) {
      return 'Does this photo contain a ' + n + ' anywhere in the frame, or a very similar common variation of it? A sofa counts as a couch, a monitor or flatscreen counts as a TV. The furniture does not need to be centered or the only thing visible — a toddler took this photo. But a completely different piece of furniture should be rejected. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'chair', emoji: '🪑', d: 1 }, { name: 'table', emoji: '🪵', d: 1 },
      { name: 'couch', emoji: '🛋️', d: 1 }, { name: 'bed', emoji: '🛏️', d: 1 },
      { name: 'TV', emoji: '📺', d: 1 }, { name: 'door', emoji: '🚪', d: 2 },
      { name: 'window', emoji: '🪟', d: 2 }, { name: 'shelf', emoji: '📚', d: 3 },
      { name: 'lamp', emoji: '💡', img: 'img/lamp.png', d: 3 }
    ]
  },
  clothing: {
    id: 'clothing', name: 'Clothing', emoji: '👕',
    gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
    speakPrompt: function(n) { return 'Can you find a ' + n + '?'; },
    speakName: 'Clothing! Find things you can wear!',
    aiPrompt: function(n) {
      return 'Does this photo contain a ' + n + ' anywhere in the frame, or a very similar common variation? A t-shirt counts as a shirt, jeans count as pants, a coat counts as a jacket. The clothing does not need to be centered or the only thing visible — a toddler took this photo. It can be worn by someone or lying on a surface. But a completely different type of clothing should be rejected. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'shirt', emoji: '👕', d: 1 }, { name: 'pants', emoji: '👖', d: 1 },
      { name: 'dress', emoji: '👗', d: 1 }, { name: 'jacket', emoji: '🧥', d: 1 },
      { name: 'hat', emoji: '🧢', d: 2 }, { name: 'glove', emoji: '🧤', d: 2 },
      { name: 'scarf', emoji: '🧣', d: 3 }, { name: 'sock', emoji: '🧦', d: 2 }
    ]
  },
  halloween: {
    id: 'halloween', name: 'Halloween', emoji: '🎃',
    gradient: 'linear-gradient(135deg, #FF6B00 0%, #1A0033 50%, #FFD700 100%)',
    speakPrompt: function(n) { return 'Can you find a ' + n + '?'; },
    speakName: 'Halloween Hunt! Find spooky things!',
    aiPrompt: function(n) {
      return 'Does this photo contain a ' + n + ' anywhere in the frame? This includes real items, decorations, toys, plushies, costumes, or pictures/drawings. The item does not need to be centered — a toddler took this photo during a Halloween activity. But a completely different object should be rejected. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'pumpkin', emoji: '🎃', d: 1 }, { name: 'ghost', emoji: '👻', d: 1 },
      { name: 'candy', emoji: '🍬', d: 1 }, { name: 'witch hat', emoji: '🧙', d: 1 },
      { name: 'spider', emoji: '🕷️', d: 2 }, { name: 'spider web', emoji: '🕸️', d: 2 },
      { name: 'black cat', emoji: '🐱', d: 2 }, { name: 'bat', emoji: '🦇', d: 2 },
      { name: 'skeleton', emoji: '💀', d: 3 }, { name: 'treat bag', emoji: '🎒', d: 1 }
    ],
    seasonal: true
  },
  christmas: {
    id: 'christmas', name: 'Christmas', emoji: '🎄',
    gradient: 'linear-gradient(135deg, #C8102E 0%, #006747 50%, #FFD700 100%)',
    speakPrompt: function(n) { return 'Can you find a ' + n + '?'; },
    speakName: 'Christmas Hunt! Find holiday magic!',
    aiPrompt: function(n) {
      return 'Does this photo contain a ' + n + ' anywhere in the frame? This includes real items, decorations, toys, ornaments, wrapping, or pictures. The item does not need to be centered — a toddler took this photo during the Christmas season. But a completely different object should be rejected. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'Christmas tree', emoji: '🎄', d: 1 }, { name: 'ornament', emoji: '🔮', d: 1 },
      { name: 'star', emoji: '⭐', d: 1 }, { name: 'stocking', emoji: '🧦', d: 1 },
      { name: 'Christmas lights', emoji: '💡', d: 1 }, { name: 'Santa', emoji: '🎅', d: 1 },
      { name: 'gift', emoji: '🎁', d: 1 }, { name: 'wreath', emoji: '💚', d: 2 },
      { name: 'snowman', emoji: '⛄', d: 2 }, { name: 'candy cane', emoji: '🍭', d: 2 },
      { name: 'reindeer', emoji: '🦌', d: 3 }
    ],
    seasonal: true
  },
  spring: {
    id: 'spring', name: 'Spring', emoji: '🌸',
    gradient: 'linear-gradient(135deg, #FF69B4 0%, #4CAF50 50%, #FFD700 100%)',
    speakPrompt: function(n) { return 'Can you find a ' + n + '?'; },
    speakName: 'Spring Hunt! Find signs of spring!',
    aiPrompt: function(n) {
      return 'Does this photo contain a ' + n + ' anywhere in the frame? This includes real items, decorations, toys, stuffed animals, or pictures/drawings. The item does not need to be centered — a toddler took this photo exploring springtime. But a completely different object should be rejected. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'flower', emoji: '🌸', d: 1 }, { name: 'butterfly', emoji: '🦋', d: 2 },
      { name: 'bird', emoji: '🐦', d: 2 }, { name: 'rainbow', emoji: '🌈', d: 1 },
      { name: 'umbrella', emoji: '☂️', d: 1 }, { name: 'rain boots', emoji: '🥾', d: 1 },
      { name: 'bee', emoji: '🐝', d: 2 }, { name: 'Easter egg', emoji: '🥚', d: 1 },
      { name: 'bunny', emoji: '🐰', d: 1 }, { name: 'sunshine', emoji: '☀️', d: 1 }
    ],
    seasonal: true
  }
};

var CATEGORY_ORDER = ['household', 'animals', 'food', 'shapes', 'colors', 'furniture', 'clothing', 'halloween', 'christmas', 'spring'];

// ═══════════════════════════════════════════════════════════════
// SOUND EFFECTS (Web Audio API)
// ═══════════════════════════════════════════════════════════════
var audioCtx = null;
var soundEnabled = localStorage.getItem('PH_SOUND') !== 'off';

function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, dur, delay, type, vol) {
  if (!soundEnabled) return;
  try {
    var c = ensureAudioCtx(), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    var t = c.currentTime + (delay || 0);
    g.gain.setValueAtTime(vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur);
  } catch(e) {}
}

function playSuccess() {
  playTone(523,0.25,0,'sine',0.25); playTone(659,0.25,0.1,'sine',0.25); playTone(784,0.35,0.2,'sine',0.3);
}
function playMiss() {
  if (!soundEnabled) return;
  try {
    var c = ensureAudioCtx(), o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(350, c.currentTime);
    o.frequency.linearRampToValueAtTime(220, c.currentTime + 0.3);
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.35);
  } catch(e) {}
}
function playVictorySound() {
  playTone(523,0.3,0,'triangle',0.3); playTone(659,0.3,0.15,'triangle',0.3);
  playTone(784,0.3,0.3,'triangle',0.3); playTone(1047,0.5,0.45,'triangle',0.35);
}
function playClick() { playTone(800,0.06,0,'sine',0.12); }

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('PH_SOUND', soundEnabled ? 'on' : 'off');
  var btn = document.getElementById('sound-toggle');
  if (btn) btn.textContent = soundEnabled ? '🔊' : '🔇';
  if (soundEnabled) playClick();
}

// ═══════════════════════════════════════════════════════════════
// PULSE ANIMATION SYSTEM
// ═══════════════════════════════════════════════════════════════
var activePulses = {};

function startPulse(el, id) {
  if (!el) return;
  el.classList.add('pulse');
  activePulses[id] = el;
}

function stopPulse(id) {
  var el = activePulses[id];
  if (el) el.classList.remove('pulse');
  delete activePulses[id];
}

function stopAllPulses() {
  Object.keys(activePulses).forEach(function(id) { stopPulse(id); });
}

// Sequential pulse across category cards on splash
function pulseCategories() {
  var cards = document.querySelectorAll('.category-card');
  if (!cards.length) return;
  var i = 0;
  function next() {
    if (i > 0) cards[i - 1].classList.remove('pulse-once');
    if (i < cards.length) {
      cards[i].classList.add('pulse-once');
      i++;
      setTimeout(next, 800);
    }
  }
  next();
}

// ═══════════════════════════════════════════════════════════════
// INACTIVITY SYSTEM — simple interval-based
// ═══════════════════════════════════════════════════════════════
var inactivityInterval = null;
var inactivitySeconds = 0;
var inactivityActive = false;

function resetInactivity() {
  stopInactivity();
  inactivitySeconds = 0;
}

function stopInactivity() {
  if (inactivityInterval) { clearInterval(inactivityInterval); inactivityInterval = null; }
  inactivityActive = false;
}

function startInactivity() {
  stopInactivity();
  inactivitySeconds = 0;
  inactivityActive = true;
  inactivityInterval = setInterval(function() {
    if (!inactivityActive) return;
    inactivitySeconds++;

    // At 12s: stop camera pulse, say "tap to hear again", pulse repeat button
    if (inactivitySeconds === 12) {
      console.log('[PH] Inactivity 12s: nudge hear-again');
      stopPulse('camera');
      speak('Tap here to hear it again!');
      var repeatBtn = document.querySelector('.repeat-btn');
      if (repeatBtn) startPulse(repeatBtn, 'repeat');
    }

    // At 25s: stop repeat pulse, say "try again or skip"
    if (inactivitySeconds === 25) {
      console.log('[PH] Inactivity 25s: nudge try/skip');
      stopPulse('repeat');
      speak('Try again, or skip to the next one!');
      var skipBtn = document.querySelector('.skip-btn');
      if (skipBtn) startPulse(skipBtn, 'skip');
    }

    // At 40s: go quiet, stop everything
    if (inactivitySeconds >= 40) {
      console.log('[PH] Inactivity 40s: going quiet');
      stopAllPulses();
      stopInactivity();
    }
  }, 1000);
}

// ═══════════════════════════════════════════════════════════════
// PROGRESS TRACKING
// ═══════════════════════════════════════════════════════════════
function getProgress() {
  try { return JSON.parse(localStorage.getItem('PH_PROGRESS') || '{}'); } catch(e) { return {}; }
}
function saveProgress(p) { localStorage.setItem('PH_PROGRESS', JSON.stringify(p)); }
function recordProgress(catId, itemName) {
  var p = getProgress();
  if (!p[catId]) p[catId] = [];
  if (p[catId].indexOf(itemName) === -1) { p[catId].push(itemName); saveProgress(p); }
}
function getCategoryProgress(catId) { var p = getProgress(); return (p[catId] || []).length; }

// ═══════════════════════════════════════════════════════════════
// ITEM SELECTION (per category)
// ═══════════════════════════════════════════════════════════════
function getSelectedNames(catId) {
  try {
    var all = JSON.parse(localStorage.getItem('PH_SELECTED') || '{}');
    var names = all[catId];
    if (Array.isArray(names) && names.length >= 3) return names;
  } catch(e) {}
  return CATEGORIES[catId].items.map(function(i) { return i.name; });
}
function getSelectedItems(catId) {
  var names = getSelectedNames(catId);
  return CATEGORIES[catId].items.filter(function(i) { return names.indexOf(i.name) >= 0; });
}
function saveSelectedNames(catId, names) {
  var all; try { all = JSON.parse(localStorage.getItem('PH_SELECTED') || '{}'); } catch(e) { all = {}; }
  all[catId] = names; localStorage.setItem('PH_SELECTED', JSON.stringify(all));
}
function migrateOldData() {
  var old = localStorage.getItem('PICTURE_HUNT_SELECTED');
  if (old) {
    try { var n = JSON.parse(old); if (Array.isArray(n) && n.length > 0) saveSelectedNames('household', n); } catch(e) {}
    localStorage.removeItem('PICTURE_HUNT_SELECTED');
  }
  var gs = localStorage.getItem('PH_GAME_STATE');
  if (gs) { try { var s = JSON.parse(gs); if (s && !s.category) { s.category = 'household'; localStorage.setItem('PH_GAME_STATE', JSON.stringify(s)); } } catch(e) {} }
}

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════
var currentCategory = null;
var currentIndex = 0;
var shuffledItems = [];
var autoAdvanceTimer = null;
var currentDifficulty = localStorage.getItem('PH_DIFFICULTY') || 'medium';
var _currentSession = null; // Dashboard session tracking

// ═══════════════════════════════════════════════════════════════
// DOM REFS
// ═══════════════════════════════════════════════════════════════
var screens = {};
var targetEmoji, targetText, feedbackArea, progressFill;
var cameraInput, cameraLabel, loadingOverlay;
var confettiCanvas, ctx;
var setupGrid, setupMsg, setupDoneBtn, selectAllBtn, clearAllBtn;

function initDomRefs() {
  screens = {
    landing: document.getElementById('landing'),
    splash: document.getElementById('splash'),
    setup: document.getElementById('setup'),
    game: document.getElementById('game'),
    victory: document.getElementById('victory')
  };
  targetEmoji = document.getElementById('target-emoji');
  targetText = document.getElementById('target-text');
  feedbackArea = document.getElementById('feedback-area');
  progressFill = document.getElementById('progress-fill');
  cameraInput = document.getElementById('camera-input');
  cameraLabel = document.getElementById('camera-label');
  loadingOverlay = document.getElementById('loading');
  confettiCanvas = document.getElementById('confetti-canvas');
  ctx = confettiCanvas.getContext('2d');
  setupGrid = document.getElementById('setup-grid');
  setupMsg = document.getElementById('setup-msg');
  setupDoneBtn = document.getElementById('setup-done-btn');
  selectAllBtn = document.getElementById('select-all-btn');
  clearAllBtn = document.getElementById('clear-all-btn');
}

// ═══════════════════════════════════════════════════════════════
// SCREEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function showScreen(name) {
  stopAllPulses();
  resetInactivity();
  if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
  Object.values(screens).forEach(function(s) { s.classList.remove('active'); });
  var el = screens[name];
  el.classList.add('active');
  // Brief ghost-tap guard on ALL screen transitions
  el.style.pointerEvents = 'none';
  setTimeout(function() { el.style.pointerEvents = ''; }, 350);
  if (name === 'splash') onSplashEnter();
}

// ═══════════════════════════════════════════════════════════════
// SPLASH SCREEN
// ═══════════════════════════════════════════════════════════════
var audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  // Unlock Web Audio context with a silent buffer (required for iOS)
  try {
    var ctx = ensureAudioCtx();
    var buf = ctx.createBuffer(1, 1, 22050);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch(e) {}
  // Start preloading all audio files into Web Audio buffers
  preloadAllAudio();
}

function startFromLanding() {
  unlockAudio();
  // Hide landing, show home
  document.getElementById('landing').classList.remove('active');
  showScreen('splash');
}

function onSplashEnter() {
  renderSplash();
  // Block ghost taps for 400ms after landing (touch bleed from landing screen)
  var splash = document.getElementById('splash');
  if (splash) {
    splash.style.pointerEvents = 'none';
    setTimeout(function() { splash.style.pointerEvents = ''; }, 400);
  }
  // Full audio + pulse every time we enter the home screen
  setTimeout(function() {
    speak('Pick a game!', function() {
      pulseCategories();
    });
  }, 400);
}

function renderSplash() {
  var grid = document.getElementById('category-grid');
  if (!grid) return;

  // Difficulty selector HTML (above categories)
  var diffHtml = '<div class="difficulty-selector">'
    + '<button class="diff-btn' + (currentDifficulty === 'easy' ? ' active' : '') + '" onclick="setDifficulty(\'easy\')">⭐ Easy</button>'
    + '<button class="diff-btn' + (currentDifficulty === 'medium' ? ' active' : '') + '" onclick="setDifficulty(\'medium\')">⭐⭐ Medium</button>'
    + '<button class="diff-btn' + (currentDifficulty === 'hard' ? ' active' : '') + '" onclick="setDifficulty(\'hard\')">⭐⭐⭐ Hard</button>'
    + '</div>';

  // Language selector HTML (below difficulty)
  var langHtml = '';
  if (typeof SUPPORTED_LANGUAGES !== 'undefined') {
    var currentLang = typeof getSelectedLanguage === 'function' ? getSelectedLanguage() : { code: 'none', emoji: '🚫', name: 'Off' };
    langHtml = '<div class="lang-selector">'
      + '<button class="lang-btn" onclick="openLangPicker()">' + currentLang.emoji + ' ' + (currentLang.code === 'none' ? 'Language' : currentLang.name) + '</button>'
      + '</div>';
  }

  // Insert difficulty + lang before the grid
  var title = document.querySelector('.home-title');
  if (title && !document.querySelector('.difficulty-selector')) {
    title.insertAdjacentHTML('afterend', diffHtml + langHtml);
  } else if (title) {
    // Update active state
    document.querySelectorAll('.diff-btn').forEach(function(btn, idx) {
      btn.className = 'diff-btn' + (['easy','medium','hard'][idx] === currentDifficulty ? ' active' : '');
    });
  }

  var savedGame = null;
  try { savedGame = JSON.parse(localStorage.getItem('PH_GAME_STATE')); } catch(e) {}

  // Filter: only show seasonal packs that are currently in-season or manually enabled
  var visibleCategories = (typeof SeasonalManager !== 'undefined')
    ? SeasonalManager.filterVisibleCategories(CATEGORY_ORDER)
    : CATEGORY_ORDER.filter(function(catId) { return !CATEGORIES[catId].seasonal; });

  var html = '';
  visibleCategories.forEach(function(catId) {
    var cat = CATEGORIES[catId];
    var found = getCategoryProgress(catId);
    var total = cat.items.length;
    var hasContinue = savedGame && savedGame.category === catId;
    var complete = found >= total;
    var badge = (typeof SeasonalManager !== 'undefined') ? SeasonalManager.getInSeasonBadge(catId) : '';

    html += '<button class="category-card' + (hasContinue ? ' has-continue' : '') + '" '
      + 'style="background:' + cat.gradient + '" '
      + 'onclick="playCategory(\'' + catId + '\')">'
      + '<div class="cat-emoji">' + cat.emoji + '</div>'
      + '<div class="cat-info">'
      + '<div class="cat-name">' + cat.name + badge + '</div>'
      + '<div class="cat-progress">'
      + (hasContinue ? '▶️ Continue!' : (complete ? '🏆 ' + found + '/' + total : found + '/' + total + ' ⭐'))
      + '</div></div></button>';
  });
  grid.innerHTML = html;

  // Storyline mode button
  var storyBtn = document.getElementById('story-btn');
  if (!storyBtn) {
    var btnContainer = document.querySelector('.splash-bottom');
    if (btnContainer) {
      storyBtn = document.createElement('button');
      storyBtn.id = 'story-btn';
      storyBtn.className = 'setup-icon-btn';
      storyBtn.textContent = '📖';
      storyBtn.onclick = function() { if (typeof openStorySelector === 'function') openStorySelector(); };
      btnContainer.insertBefore(storyBtn, btnContainer.firstChild);
    }
  }

  var btn = document.getElementById('sound-toggle');
  if (btn) btn.textContent = soundEnabled ? '🔊' : '🔇';

}

// ═══════════════════════════════════════════════════════════════
// SETUP SCREEN
// ═══════════════════════════════════════════════════════════════
var setupCategory = 'household';
var setupSelection = new Set();

function openSetup() {
  setupCategory = 'household';
  setupSelection = new Set(getSelectedNames(setupCategory));
  renderSetupTabs(); renderSetupGrid(); showScreen('setup');
}
function renderSetupTabs() {
  var tabsEl = document.getElementById('category-tabs');
  if (!tabsEl) return;
  var html = '';
  var visibleTabs = (typeof SeasonalManager !== 'undefined')
    ? SeasonalManager.filterVisibleCategories(CATEGORY_ORDER)
    : CATEGORY_ORDER.filter(function(catId) { return !CATEGORIES[catId].seasonal; });
  visibleTabs.forEach(function(catId) {
    var cat = CATEGORIES[catId];
    html += '<button class="cat-tab' + (catId === setupCategory ? ' active' : '') + '" '
      + 'onclick="switchSetupTab(\'' + catId + '\')">' + cat.emoji + ' ' + cat.name + '</button>';
  });
  tabsEl.innerHTML = html;
}
function switchSetupTab(catId) {
  if (setupSelection.size >= 3) saveSelectedNames(setupCategory, Array.from(setupSelection));
  setupCategory = catId;
  setupSelection = new Set(getSelectedNames(catId));
  renderSetupTabs(); renderSetupGrid();
}
function renderSetupGrid() {
  var cat = CATEGORIES[setupCategory];
  setupGrid.innerHTML = '';
  cat.items.forEach(function(item) {
    var card = document.createElement('div');
    card.className = 'setup-card' + (setupSelection.has(item.name) ? ' selected' : '');
    var iconHtml = item.img
      ? '<img src="' + item.img + '" class="setup-card-img" alt="' + item.name + '">'
      : '<span class="setup-card-emoji">' + item.emoji + '</span>';
    var setupTranslation = (typeof getTranslationByName === 'function') ? getTranslationByName(item.name) : null;
    var setupNameHtml = '<span class="setup-card-name">' + item.name
      + (setupTranslation ? '<br><span class="setup-card-translation">' + setupTranslation.word + '</span>' : '')
      + '</span>';
    card.innerHTML = iconHtml + setupNameHtml;
    card.addEventListener('click', function() {
      playClick();
      if (setupSelection.has(item.name)) setupSelection.delete(item.name);
      else setupSelection.add(item.name);
      card.classList.toggle('selected');
      card.classList.add('bounce-tap');
      setTimeout(function() { card.classList.remove('bounce-tap'); }, 300);
      updateSetupMsg();
    });
    setupGrid.appendChild(card);
  });
  updateSetupMsg();
}
function updateSetupMsg() {
  var count = setupSelection.size;
  if (count < 3) { setupMsg.textContent = 'Pick at least 3! (' + count + ' selected)'; setupMsg.classList.add('warn'); setupDoneBtn.disabled = true; }
  else { setupMsg.textContent = count + ' items selected'; setupMsg.classList.remove('warn'); setupDoneBtn.disabled = false; }
}
function setupSelectAll() { playClick(); setupSelection = new Set(CATEGORIES[setupCategory].items.map(function(i) { return i.name; })); renderSetupGrid(); }
function setupClearAll() { playClick(); setupSelection = new Set(); renderSetupGrid(); }
function setupDone() {
  if (setupSelection.size < 3) return;
  playClick(); saveSelectedNames(setupCategory, Array.from(setupSelection));
  var gs = null; try { gs = JSON.parse(localStorage.getItem('PH_GAME_STATE')); } catch(e) {}
  if (gs && gs.category === setupCategory) localStorage.removeItem('PH_GAME_STATE');
  showScreen('splash');
}

// ═══════════════════════════════════════════════════════════════
// SPEECH (Pre-generated audio with Web Speech API fallback)
// ═══════════════════════════════════════════════════════════════
var audioBufferCache = {};
var currentAudioSource = null;

// Preload audio files into Web Audio API buffers (bypasses iOS autoplay restrictions)
function preloadAudio(key) {
  if (audioBufferCache[key]) return;
  var src = 'audio/' + key + '.mp3';
  fetch(src).then(function(r) { return r.arrayBuffer(); }).then(function(buf) {
    var ctx = ensureAudioCtx();
    return ctx.decodeAudioData(buf);
  }).then(function(decoded) {
    audioBufferCache[key] = decoded;
  }).catch(function() {});
}

function preloadAllAudio() {
  var keys = [
    'pick-a-game','you-found-it','try-again','lets-try-another','great-job',
    'tap-to-hear','you-did-it','champion','cat-things','cat-shapes','cat-colors',
    'cat-animals','cat-food','cat-furniture','cat-clothing',
    'cat-halloween','cat-christmas','cat-spring'
  ];
  // Preload all find prompts
  Object.keys(CATEGORIES).forEach(function(catId) {
    var cat = CATEGORIES[catId];
    cat.items.forEach(function(item) {
      var k = textToAudioKey(cat.speakPrompt(item.name));
      if (k) keys.push(k);
    });
  });
  keys.forEach(preloadAudio);
}

function playBuffer(key, onEnd) {
  var ctx = ensureAudioCtx();
  var buf = audioBufferCache[key];
  if (!buf) { if (onEnd) onEnd(); return false; }

  // Stop current
  if (currentAudioSource) {
    try { currentAudioSource.stop(); } catch(e) {}
  }

  var source = ctx.createBufferSource();
  source.buffer = buf;
  source.connect(ctx.destination);
  source.onended = function() { currentAudioSource = null; if (onEnd) onEnd(); };
  source.start(0);
  currentAudioSource = source;
  return true;
}

// Map text → audio file key
function textToAudioKey(text) {
  var map = {
    'Pick a game!': 'pick-a-game',
    'You found it! Great job!': 'you-found-it',
    'Try again, or skip to the next one!': 'try-again',
    "Let's try another one!": 'lets-try-another',
    'Great job!': 'great-job',
    'Tap here to hear it again!': 'tap-to-hear',
    'You did it! You found everything! Great job!': 'you-did-it',
    'Tap the camera to try again, or the arrow to skip!': 'try-again',
    'Things! Find stuff around the house!': 'cat-things',
    'Shapes! Find circles, squares, and more!': 'cat-shapes',
    'Colors! Find red, blue, green, and more!': 'cat-colors',
    'Animals! Find dogs, cats, and more!': 'cat-animals',
    'Food! Find yummy things to eat!': 'cat-food',
    'Furniture! Find things around the house!': 'cat-furniture',
    'Clothing! Find things you can wear!': 'cat-clothing',
    'Halloween Hunt! Find spooky things!': 'cat-halloween',
    'Christmas Hunt! Find holiday magic!': 'cat-christmas',
    'Spring Hunt! Find signs of spring!': 'cat-spring'
  };
  if (map[text]) return map[text];
  // Champion messages
  if (text.indexOf('champion') >= 0 || text.indexOf('Amazing') >= 0) return 'champion';
  if (text.indexOf('You did it') >= 0) return 'you-did-it';
  // Find prompts: "Can you find a shoe?" → "find-shoe"
  var m = text.match(/^Can you find (?:a |an |some |something )?(.+)\?$/);
  if (m) return 'find-' + m[1].replace(/ /g, '-').toLowerCase();
  return null;
}

function speak(text, onEnd) {
  console.log('[PH] speak("' + text.substring(0, 30) + '...")');
  if (!soundEnabled) { if (onEnd) onEnd(); return; }

  // Stop any current audio
  if (currentAudioSource) { try { currentAudioSource.stop(); } catch(e) {} currentAudioSource = null; }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();

  // Try Web Audio buffer first (works on iOS without user gesture)
  var key = textToAudioKey(text);
  if (key) {
    if (playBuffer(key, onEnd)) return;
    // Buffer not loaded yet — try loading and playing
    preloadAudio(key);
    // Fallback: try HTML5 Audio
    var src = 'audio/' + key + '.mp3';
    var audio = new Audio(src);
    var done = false;
    function finish() { if (done) return; done = true; if (onEnd) onEnd(); }
    audio.onended = finish;
    audio.onerror = finish;
    audio.play().then(function() {
      setTimeout(finish, (audio.duration || 5) * 1000 + 500);
    }).catch(finish);
    return;
  }

  speakFallback(text, onEnd);
}

function speakFallback(text, onEnd) {
  if (!('speechSynthesis' in window)) { if (onEnd) onEnd(); return; }
  var utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.85; utter.pitch = 1.2; utter.volume = 1;
  var voices = speechSynthesis.getVoices();
  var preferred = voices.find(function(v) { return v.name.indexOf('Samantha') >= 0; }) ||
                  voices.find(function(v) { return v.lang.indexOf('en') === 0 && v.localService; });
  if (preferred) utter.voice = preferred;
  if (onEnd) utter.onend = onEnd;
  speechSynthesis.speak(utter);
}
if ('speechSynthesis' in window) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = function() { speechSynthesis.getVoices(); }; }

// ═══════════════════════════════════════════════════════════════
// SHUFFLE
// ═══════════════════════════════════════════════════════════════
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

// ═══════════════════════════════════════════════════════════════
// GAME FLOW
// ═══════════════════════════════════════════════════════════════
function playCategory(catId) {
  playClick();
  stopAllPulses();
  currentCategory = catId;
  var cat = CATEGORIES[catId];

  // Announce category name, then start game
  speak(cat.speakName, function() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem('PH_GAME_STATE')); } catch(e) {}
    if (saved && saved.category === catId) {
      var catItems = CATEGORIES[catId].items;
      shuffledItems = saved.items.map(function(name) { return catItems.find(function(i) { return i.name === name; }); }).filter(Boolean);
      currentIndex = saved.index;
      if (shuffledItems.length > 0 && currentIndex < shuffledItems.length) {
        showScreen('game'); showCurrentItem(); return;
      }
    }
    startNewGame(catId);
  });
}

function startNewGame(catId) {
  localStorage.removeItem('PH_GAME_STATE');
  currentCategory = catId || currentCategory;
  shuffledItems = shuffle(getSelectedItems(currentCategory));

  // Apply difficulty: filter by item complexity rating (d: 1=Easy, 2=Medium, 3=Hard)
  // Easy shows only d:1 items; Medium shows d:1+2; Hard shows all
  if (currentDifficulty === 'easy') {
    var easyItems = shuffledItems.filter(function(i) { return !i.d || i.d === 1; });
    if (easyItems.length >= 3) shuffledItems = easyItems; // only filter if we have enough
  } else if (currentDifficulty === 'medium') {
    var medItems = shuffledItems.filter(function(i) { return !i.d || i.d <= 2; });
    if (medItems.length >= 3) shuffledItems = medItems;
  }
  // hard uses all items

  currentIndex = 0;

  // Start dashboard session tracking
  if (typeof dashboardStartSession === 'function') {
    _currentSession = dashboardStartSession(currentCategory);
  }

  showScreen('game'); showCurrentItem();
}

function startGame() { playCategory('household'); }

function resetGame() { stopConfetti(); localStorage.removeItem('PH_GAME_STATE'); showScreen('splash'); }

function showCurrentItem() {
  stopAllPulses();
  resetInactivity();
  var item = shuffledItems[currentIndex];
  var cat = CATEGORIES[currentCategory];
  if (item.img) {
    targetEmoji.innerHTML = '<img src="' + item.img + '" class="target-img" alt="' + item.name + '">';
  } else {
    targetEmoji.textContent = item.emoji;
  }
  // Show English prompt + foreign word if language mode active
  var langResult = (typeof getTranslationByName === 'function') ? getTranslationByName(item.name) : null;
  if (langResult) {
    targetText.innerHTML = cat.speakPrompt(item.name)
      + '<span class="target-translation">' + langResult.emoji + ' ' + langResult.word + '</span>';
  } else {
    targetText.textContent = cat.speakPrompt(item.name);
  }
  feedbackArea.innerHTML = '';
  progressFill.style.width = ((currentIndex / shuffledItems.length) * 100) + '%';

  cameraInput.value = '';
  cameraLabel.style.display = '';
  cameraLabel.style.pointerEvents = 'auto';
  cameraLabel.style.opacity = '1';
  var skipArea = document.querySelector('.skip-area');
  if (skipArea) skipArea.style.display = '';

  // Speak the prompt, then start pulsing camera + inactivity
  speak(cat.speakPrompt(item.name), function() {
    console.log('[PH] Prompt spoken, starting camera pulse + inactivity');
    startPulse(cameraLabel, 'camera');
    startInactivity();
  });
}

function repeatPrompt() {
  playClick();
  stopAllPulses();
  resetInactivity();
  if (typeof storylineActive !== 'undefined' && storylineActive && typeof storylineHandleRepeat === 'function' && storylineHandleRepeat()) return;
  var item = shuffledItems[currentIndex];
  var cat = CATEGORIES[currentCategory];
  speak(cat.speakPrompt(item.name), function() {
    startPulse(cameraLabel, 'camera');
    startInactivity();
  });
}

function goHome() {
  playClick();
  // Exit storyline mode if active
  if (typeof storylineActive !== 'undefined' && storylineActive) { storylineActive = false; currentStory = null; }
  // End dashboard session if mid-game
  if (typeof dashboardEndSession === 'function' && _currentSession) {
    dashboardEndSession(_currentSession, currentIndex);
    _currentSession = null;
  }
  localStorage.setItem('PH_GAME_STATE', JSON.stringify({
    category: currentCategory,
    items: shuffledItems.map(function(i) { return i.name; }),
    index: currentIndex
  }));
  showScreen('splash');
}

function skipItem() {
  if (typeof playRichSkip === 'function') { playRichSkip(); } else { playClick(); }
  stopAllPulses(); resetInactivity();
  if (typeof storylineActive !== 'undefined' && storylineActive && typeof storylineHandleSkip === 'function' && storylineHandleSkip()) return;
  speak("Let's try another one!");
  advanceItem();
}

function advanceItem() {
  currentIndex++;
  if (currentIndex >= shuffledItems.length) showVictory();
  else showCurrentItem();
}

function showVictory() {
  // Storyline mode: handle victory in story context
  if (typeof storylineActive !== 'undefined' && storylineActive && typeof storylineHandleVictory === 'function' && storylineHandleVictory()) return;
  localStorage.removeItem('PH_GAME_STATE');
  var cat = CATEGORIES[currentCategory];
  var found = getCategoryProgress(currentCategory);
  var total = cat.items.length;
  var complete = found >= total;

  // End dashboard session
  if (typeof dashboardEndSession === 'function' && _currentSession) {
    dashboardEndSession(_currentSession, shuffledItems.length);
    _currentSession = null;
  }

  var subEl = document.getElementById('victory-sub');
  var statsEl = document.getElementById('victory-stats');
  subEl.textContent = complete ? 'You\'re a ' + cat.name + ' champion!' : 'You found everything!';
  statsEl.innerHTML = '<div class="victory-stat">' + cat.emoji + ' ' + found + '/' + total
    + ' unique ' + cat.name.toLowerCase() + ' found!' + (complete ? ' 🏆' : '') + '</div>';

  showScreen('victory');
  // Use enhanced celebrations if available, fallback to confetti
  if (typeof celebrateCombo === 'function') {
    celebrateCombo(4000);
  } else {
    fireConfetti(4000);
  }
  if (typeof playRichVictory === 'function') { playRichVictory(); } else { playVictorySound(); }
  speak(complete
    ? 'Amazing! You found every single ' + cat.name.toLowerCase().replace(/s$/, '') + '! You are a champion!'
    : 'You did it! You found everything! Great job!');
}

// ═══════════════════════════════════════════════════════════════
// PHOTO HANDLING
// ═══════════════════════════════════════════════════════════════
var pendingBase64 = null;
var pendingMimeType = null;

function handlePhoto(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  stopAllPulses(); resetInactivity();

  var reader = new FileReader();
  reader.onload = function() {
    var dataUrl = reader.result;
    pendingBase64 = dataUrl.split(',')[1];
    pendingMimeType = file.type || 'image/jpeg';

    cameraLabel.style.display = 'none';
    var skipArea = document.querySelector('.skip-area');
    if (skipArea) skipArea.style.display = 'none';

    feedbackArea.innerHTML = '<div class="photo-preview">'
      + '<img src="' + dataUrl + '" class="preview-img" alt="Your photo"></div>';
    submitPhoto();
  };
  reader.readAsDataURL(file);
}

async function submitPhoto() {
  if (!pendingBase64) return;
  loadingOverlay.classList.remove('hidden');

  try {
    var response = await identifyObject(pendingBase64, pendingMimeType);
    var firstLine = response.split('\n')[0].toLowerCase().trim();
    var matched = firstLine.indexOf('yes') >= 0;
    loadingOverlay.classList.add('hidden');
    pendingBase64 = null; pendingMimeType = null;

    if (matched) {
      // Storyline mode: handle success in story context
      if (typeof storylineActive !== 'undefined' && storylineActive && typeof storylineHandlePhotoSuccess === 'function' && storylineHandlePhotoSuccess()) return;
      recordProgress(currentCategory, shuffledItems[currentIndex].name);
      // Streak sound: fire after 3+ consecutive finds
      if (!window._phStreak) window._phStreak = 0;
      window._phStreak++;
      if (window._phStreak >= 3 && typeof playRichStreak === 'function') {
        setTimeout(playRichStreak, 800);
      }
      // AUTO-ADVANCE: celebrate then move on
      var foundItemName = shuffledItems[currentIndex].name;
      feedbackArea.innerHTML = '<div class="result-msg success">🎉 You found it!</div>';
      // Use enhanced celebrations if available
      if (typeof celebrateEmojiRain === 'function') {
        celebrateEmojiRain(3500);
        if (typeof celebrateStickerPopRandom === 'function') celebrateStickerPopRandom(2500);
      } else {
        fireConfetti(3500);
      }
      // Play voice FIRST, then chime after a beat — iOS can't play both simultaneously
      speak('You found it! Great job!');
      setTimeout(typeof playRichSuccess === 'function' ? playRichSuccess : playSuccess, 300);

      // Victory Echo: 'How do you say X in Spanish? ... zapato!'
      var hasLang = (typeof getSelectedLanguage === 'function') && getSelectedLanguage().code !== 'none';
      var echoDuration = 0;
      if (hasLang && typeof playVictoryEcho === 'function') {
        // Show translation badge in feedback area
        var echoResult = (typeof getTranslationByName === 'function') ? getTranslationByName(foundItemName) : null;
        if (echoResult) {
          echoDuration = 4000; // extra time for echo
          setTimeout(function() {
            feedbackArea.innerHTML = '<div class="result-msg success">🎉 You found it!</div>'
              + '<div class="translation-echo">' + echoResult.emoji + ' ' + echoResult.word + '</div>';
            playVictoryEcho(foundItemName);
          }, 800);
        }
      }

      autoAdvanceTimer = setTimeout(function() {
        resetCameraUI();
        advanceItem();
      }, 4500 + echoDuration);
    } else {
      if (typeof playRichMiss === 'function') { playRichMiss(); } else { playMiss(); }
      window._phStreak = 0; // reset streak on miss
      showMissResult();
    }
  } catch (err) {
    console.error('Error:', err);
    loadingOverlay.classList.add('hidden');
    pendingBase64 = null; pendingMimeType = null;
    showMissResult();
  }
}

function showMissResult() {
  cameraLabel.style.display = 'none';
  var skipArea = document.querySelector('.skip-area');
  if (skipArea) skipArea.style.display = 'none';

  feedbackArea.innerHTML = '<div class="result-msg fail">🤔 Not quite!</div>'
    + '<div class="result-buttons">'
    + '<button class="result-btn result-green" onclick="retakeFromMiss()"><span class="result-icon">📷</span></button>'
    + '<button class="result-btn result-yellow" onclick="skipFromMiss()"><span class="result-icon">⏭️</span></button>'
    + '</div>';

  // Voice guide + pulse
  speak('Try again, or skip to the next one!', function() {
    var btns = document.querySelectorAll('.result-btn');
    if (btns[0]) startPulse(btns[0], 'retry');
  });
}

function retakeFromMiss() {
  playClick(); stopAllPulses(); resetInactivity();
  resetCameraUI();
}

function skipFromMiss() {
  playClick(); stopAllPulses(); resetInactivity();
  resetCameraUI();
  speak("Let's try another one!");
  advanceItem();
}

// Parent override: long-press green button on miss screen
function forceAccept() {
  playClick();
  recordProgress(currentCategory, shuffledItems[currentIndex].name);
  // Use sticker pop for parent override
  if (typeof celebrateStickerPop === 'function') {
    celebrateStickerPop('👏', 1500);
  } else {
    fireConfetti(1000);
  }
  playSuccess(); speak('Great job!');
  resetCameraUI();
  setTimeout(advanceItem, 800);
}

function resetCameraUI() {
  feedbackArea.innerHTML = '';
  cameraLabel.style.display = '';
  cameraLabel.style.pointerEvents = 'auto';
  cameraLabel.style.opacity = '1';
  cameraInput.value = '';
  var skipArea = document.querySelector('.skip-area');
  if (skipArea) skipArea.style.display = '';
}

// ═══════════════════════════════════════════════════════════════
// GEMINI API
// ═══════════════════════════════════════════════════════════════
async function identifyObject(base64Data, mimeType) {
  var cat = CATEGORIES[currentCategory];
  var item = shuffledItems[currentIndex];
  var url = PROXY_URL
    ? PROXY_URL
    : 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY;
  var body = {
    contents: [{ parts: [
      { text: cat.aiPrompt(item.name) },
      { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } }
    ]}],
    generationConfig: { temperature: 0 }
  };
  var resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!resp.ok) {
    // Check for offline response from service worker
    if (resp.status === 503) {
      var errData = null;
      try { errData = await resp.json(); } catch(e) {}
      if (errData && errData.error === 'offline') {
        if (typeof showOfflineMessage === 'function') showOfflineMessage();
        throw new Error('offline');
      }
    }
    var e = await resp.text(); throw new Error('Gemini API error ' + resp.status + ': ' + e);
  }
  var data = await resp.json();
  var text = (data.candidates && data.candidates[0] && data.candidates[0].content &&
    data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text) || '';
  console.log('Gemini:', text, '| Looking for:', item.name, '(' + currentCategory + ')');
  return text.trim().toLowerCase();
}

// ═══════════════════════════════════════════════════════════════
// CONFETTI 🎊
// ═══════════════════════════════════════════════════════════════
var confettiPieces = [];
var confettiAnimId = null;

function resizeCanvas() { confettiCanvas.width = window.innerWidth; confettiCanvas.height = window.innerHeight; }

function fireConfetti(durationMs) {
  durationMs = durationMs || 2000;
  confettiPieces = [];
  var colors = ['#f5576c','#43e97b','#feca57','#667eea','#f093fb','#38f9d7','#ff6b6b','#48dbfb'];
  for (var i = 0; i < 120; i++) {
    confettiPieces.push({
      x: Math.random() * confettiCanvas.width, y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      w: Math.random() * 12 + 6, h: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4, vy: Math.random() * 4 + 2,
      rot: Math.random() * 360, rotV: (Math.random() - 0.5) * 10
    });
  }
  var start = Date.now();
  function loop() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    var elapsed = Date.now() - start;
    var fade = elapsed > durationMs - 500 ? Math.max(0, (durationMs - elapsed) / 500) : 1;
    for (var j = 0; j < confettiPieces.length; j++) {
      var p = confettiPieces[j];
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV; p.vy += 0.05;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = fade; ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
    if (elapsed < durationMs) confettiAnimId = requestAnimationFrame(loop);
    else { ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height); confettiAnimId = null; }
  }
  if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
  loop();
}

function stopConfetti() {
  if (confettiAnimId) { cancelAnimationFrame(confettiAnimId); confettiAnimId = null; }
  if (ctx) ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  // Also stop enhanced celebrations
  if (typeof stopAllCelebrations === 'function') stopAllCelebrations();
}

// ═══════════════════════════════════════════════════════════════
// DIFFICULTY LEVELS
// ═══════════════════════════════════════════════════════════════
function setDifficulty(level) {
  currentDifficulty = level;
  localStorage.setItem('PH_DIFFICULTY', level);
  playClick();
  renderSplash();
}

// ═══════════════════════════════════════════════════════════════
// MULTI-LANGUAGE VOCABULARY
// ═══════════════════════════════════════════════════════════════
function cycleLanguage() {
  // Kept for backward compat but now just opens the picker
  openLangPicker();
}

function openLangPicker() {
  if (typeof SUPPORTED_LANGUAGES === 'undefined') return;
  playClick();
  // Remove any existing picker
  var existing = document.getElementById('lang-picker-overlay');
  if (existing) existing.remove();

  var current = getSelectedLanguage();
  var overlay = document.createElement('div');
  overlay.id = 'lang-picker-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) closeLangPicker(); };

  var modal = document.createElement('div');
  modal.className = 'lang-picker-modal';
  modal.innerHTML = '<div class="lang-picker-title">Choose a Language</div>';

  SUPPORTED_LANGUAGES.forEach(function(lang) {
    var btn = document.createElement('button');
    btn.className = 'lang-picker-option' + (lang.code === current.code ? ' selected' : '');
    btn.textContent = lang.emoji + ' ' + lang.name;
    btn.onclick = function() {
      setSelectedLanguage(lang.code);
      playClick();
      closeLangPicker();
      renderSplash();
    };
    modal.appendChild(btn);
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function closeLangPicker() {
  var el = document.getElementById('lang-picker-overlay');
  if (el) el.remove();
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', function() {
  if (!hasApiAccess()) return;
  initDomRefs(); migrateOldData(); resizeCanvas();
  // Start preloading audio buffers (will fully work after first tap on iOS)
  try { preloadAllAudio(); } catch(e) {}
  window.addEventListener('resize', resizeCanvas);
  selectAllBtn.addEventListener('click', setupSelectAll);
  clearAllBtn.addEventListener('click', setupClearAll);
  setupDoneBtn.addEventListener('click', setupDone);

  var saved = null;
  try { saved = JSON.parse(localStorage.getItem('PH_GAME_STATE')); } catch(e) {}
  if (saved && saved.category) {
    currentCategory = saved.category;
    var catItems = CATEGORIES[saved.category].items;
    shuffledItems = saved.items.map(function(name) { return catItems.find(function(i) { return i.name === name; }); }).filter(Boolean);
    currentIndex = saved.index || 0;
  }
  // Initialize drop-in modules
  if (typeof initDashboard === 'function') initDashboard();
  if (typeof DailyChallenge !== 'undefined') DailyChallenge.init();
  if (typeof initHintSystem === 'function') initHintSystem();
  if (typeof initStorylineMode === 'function') initStorylineMode();
});
