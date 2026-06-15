// ============================================================
// Picture Hunt! — A visual scavenger hunt for toddlers
// ============================================================

// ═══════════════════════════════════════════════════════════════
// API CONFIGURATION
// ═══════════════════════════════════════════════════════════════
// Proxy URL — set this to your Cloudflare Worker URL to skip API key setup
// Leave empty string to use direct Gemini API with localStorage key
var PROXY_URL = 'https://picture-hunt-api.aidevlab3.workers.dev/';
// Shared client token sent with proxy requests. NOTE: this ships in public JS, so
// it is a speed-bump, not a true secret — the real abuse protections are the
// Worker's Origin allow-list, per-IP rate limit, and payload size cap.
var PH_PROXY_TOKEN = 'ph_pub_2k9Qx7mZr4Tn8Wv5';

// ═══════════════════════════════════════════════════════════════
// API KEY MANAGEMENT (only needed when no proxy)
// ═══════════════════════════════════════════════════════════════
// (Removed: a #key= URL-hash handler that persisted an arbitrary Gemini key from
// the address bar into localStorage. The app always uses the Worker proxy, so
// reading a network credential off an untrusted URL was a needless abuse vector.)

// Storage-safe accessors: localStorage getters/setters throw a SecurityError in
// some environments (Safari "Block All Cookies", locked-down in-app webviews,
// kiosk modes). An UNGUARDED read at top-level would abort all of app.js before
// DOMContentLoaded, leaving the landing button's handler undefined (dead first
// launch). Always go through these.
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

let GEMINI_API_KEY = lsGet('PH_KEY') || '';

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
    gradient: 'linear-gradient(140deg, #FF8A3D 0%, #FF4FA8 100%)',
    speakPrompt: function(n) { return 'Can you find ' + (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n + '?'; },
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
      { name: 'hat', emoji: '🧢', d: 1 }, { name: 'keys', emoji: '🔑', d: 2, speakOverride: 'Can you find keys?' },
      { name: 'water bottle', emoji: '🍼', img: 'img/water-bottle.png', d: 2 }, { name: 'crayon', emoji: '🖍️', d: 2 },
      { name: 'plate', emoji: '🍽️', d: 2 }, { name: 'towel', emoji: '🧻', img: 'img/towel.png', d: 2 },
      { name: 'lamp', emoji: '💡', img: 'img/lamp.png', d: 3 }, { name: 'clock', emoji: '⏰', d: 3 },
      { name: 'fork', emoji: '🍴', img: 'img/fork.png', d: 3 }, { name: 'brush', emoji: '💇', img: 'img/brush.png', d: 3 }
    ]
  },
  shapes: {
    id: 'shapes', name: 'Shapes', emoji: '🔷',
    gradient: 'linear-gradient(140deg, #4CC9FF 0%, #6F4BFF 100%)',
    speakPrompt: function(n) { return 'Can you find ' + (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n + '?'; },
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
    gradient: 'linear-gradient(140deg, #2DD4A4 0%, #4CC9FF 100%)',
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
    gradient: 'linear-gradient(140deg, #FFC93C 0%, #FF8A3D 100%)',
    speakPrompt: function(n) { return 'Can you find ' + (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n + '?'; },
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
    gradient: 'linear-gradient(140deg, #FF6B6B 0%, #FF4FA8 100%)',
    speakPrompt: function(n) { if (n === 'cereal') return 'Can you find a cereal box?'; return 'Can you find ' + (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n + '?'; },
    speakName: 'Food! Find yummy things to eat!',
    aiPrompt: function(n) {
      return 'Does this photo contain ' + n + ' anywhere in the frame, or a container/package of ' + n + '? A juice box counts as juice, a milk carton counts as milk, a cereal box counts as cereal. The food does not need to be centered — a toddler took this photo. But a completely different food should be rejected. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'apple', emoji: '🍎', d: 1 }, { name: 'banana', emoji: '🍌', d: 1 },
      { name: 'orange', emoji: '🍊', d: 1 }, { name: 'bread', emoji: '🍞', d: 1, speakOverride: 'Can you find bread?' },
      { name: 'egg', emoji: '🥚', d: 1 }, { name: 'carrot', emoji: '🥕', d: 2 },
      { name: 'cookie', emoji: '🍪', d: 2 }, { name: 'cereal', emoji: '🥣', d: 2 },
      { name: 'milk', emoji: '🥛', d: 2, speakOverride: 'Can you find milk?' }, { name: 'yogurt', emoji: '🫙', d: 3, speakOverride: 'Can you find yogurt?' },
      { name: 'juice', emoji: '🧃', d: 3, speakOverride: 'Can you find juice?' }
    ]
  },
  furniture: {
    id: 'furniture', name: 'Furniture', emoji: '🛋️',
    gradient: 'linear-gradient(140deg, #B79CFF 0%, #FF4FA8 100%)',
    speakPrompt: function(n) { return 'Can you find ' + (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n + '?'; },
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
    gradient: 'linear-gradient(140deg, #4CC9FF 0%, #2DD4A4 100%)',
    speakPrompt: function(n) { return 'Can you find ' + (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n + '?'; },
    speakName: 'Clothing! Find things you can wear!',
    aiPrompt: function(n) {
      return 'Does this photo contain a ' + n + ' anywhere in the frame, or a very similar common variation? A t-shirt counts as a shirt, jeans count as pants, a coat counts as a jacket. The clothing does not need to be centered or the only thing visible — a toddler took this photo. It can be worn by someone or lying on a surface. But a completely different type of clothing should be rejected. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'shirt', emoji: '👕', d: 1 }, { name: 'pants', emoji: '👖', d: 1, speakOverride: 'Can you find pants?' },
      { name: 'dress', emoji: '👗', d: 1 }, { name: 'jacket', emoji: '🧥', d: 1 },
      { name: 'hat', emoji: '🧢', d: 2 }, { name: 'glove', emoji: '🧤', d: 2 },
      { name: 'scarf', emoji: '🧣', d: 3 }, { name: 'sock', emoji: '🧦', d: 2 }
    ]
  },
  halloween: {
    id: 'halloween', name: 'Halloween', emoji: '🎃',
    gradient: 'linear-gradient(140deg, #FF7A1A 0%, #2B0B5C 100%)',
    speakPrompt: function(n) { return 'Can you find ' + (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n + '?'; },
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
    gradient: 'linear-gradient(140deg, #E63946 0%, #006E3C 100%)',
    speakPrompt: function(n) { return 'Can you find ' + (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n + '?'; },
    speakName: 'Christmas Hunt! Find holiday magic!',
    aiPrompt: function(n) {
      return 'Does this photo contain a ' + n + ' anywhere in the frame? This includes real items, decorations, toys, ornaments, wrapping, or pictures. The item does not need to be centered — a toddler took this photo during the Christmas season. But a completely different object should be rejected. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'Christmas tree', emoji: '🎄', d: 1 }, { name: 'ornament', emoji: '🔮', d: 1 },
      { name: 'star', emoji: '⭐', d: 1 }, { name: 'stocking', emoji: '🧦', d: 1 },
      { name: 'Christmas lights', emoji: '💡', d: 1, speakOverride: 'Can you find Christmas lights?' }, { name: 'Santa', emoji: '🎅', d: 1, speakOverride: 'Can you find Santa?' },
      { name: 'gift', emoji: '🎁', d: 1 }, { name: 'wreath', emoji: '💚', d: 2 },
      { name: 'snowman', emoji: '⛄', d: 2 }, { name: 'candy cane', emoji: '🍭', d: 2 },
      { name: 'reindeer', emoji: '🦌', d: 3 }
    ],
    seasonal: true
  },
  spring: {
    id: 'spring', name: 'Spring', emoji: '🌸',
    gradient: 'linear-gradient(140deg, #95F0B5 0%, #FF7AB6 100%)',
    speakPrompt: function(n) { return 'Can you find ' + (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n + '?'; },
    speakName: 'Spring Hunt! Find signs of spring!',
    aiPrompt: function(n) {
      return 'Does this photo contain a ' + n + ' anywhere in the frame? This includes real items, decorations, toys, stuffed animals, or pictures/drawings. The item does not need to be centered — a toddler took this photo exploring springtime. But a completely different object should be rejected. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'flower', emoji: '🌸', d: 1 }, { name: 'butterfly', emoji: '🦋', d: 2 },
      { name: 'bird', emoji: '🐦', d: 2 }, { name: 'rainbow', emoji: '🌈', d: 1 },
      { name: 'umbrella', emoji: '☂️', d: 1 }, { name: 'rain boots', emoji: '🥾', d: 1, speakOverride: 'Can you find rain boots?' },
      { name: 'bee', emoji: '🐝', d: 2 }, { name: 'Easter egg', emoji: '🥚', d: 1 },
      { name: 'bunny', emoji: '🐰', d: 1 }, { name: 'sunshine', emoji: '☀️', d: 1, speakOverride: 'Can you find sunshine?' }
    ],
    seasonal: true
  }
};

var CATEGORY_ORDER = ['household', 'animals', 'food', 'shapes', 'colors', 'furniture', 'clothing', 'halloween', 'christmas', 'spring'];

// ─── Custom item illustrations ──────────────────────────────────
// Items whose flat-sticker illustration exists at img/items/<slug>.png.
// Grown as the illustration set is produced; any item NOT listed falls back
// to its emoji (so there are never broken-image 404s). Shared item names
// (chair, lamp, hat, sock, bird, star) light up across every category at once.
function phSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
var ITEM_ILLUSTRATIONS = {
  'shoe':1, 'cup':1, 'ball':1, 'teddy-bear':1, 'book':1, 'spoon':1, 'pillow':1,
  'blanket':1, 'remote-control':1, 'toothbrush':1, 'chair':1, 'sock':1, 'hat':1,
  'keys':1, 'water-bottle':1, 'crayon':1, 'plate':1, 'towel':1, 'lamp':1, 'clock':1,
  'fork':1, 'brush':1,
  'dog':1, 'cat':1, 'duck':1, 'dinosaur':1, 'elephant':1, 'lion':1, 'pig':1, 'frog':1, 'rabbit':1, 'bird':1, 'fish':1,
  'apple':1, 'banana':1, 'orange':1, 'bread':1, 'egg':1, 'carrot':1, 'cookie':1, 'cereal':1, 'milk':1, 'yogurt':1, 'juice':1,
  // furniture (chair, lamp already shared from above)
  'table':1, 'couch':1, 'bed':1, 'tv':1, 'door':1, 'window':1, 'shelf':1,
  // clothing (hat, sock already shared from above)
  'shirt':1, 'pants':1, 'dress':1, 'jacket':1, 'glove':1, 'scarf':1,
  // halloween
  'pumpkin':1, 'ghost':1, 'candy':1, 'witch-hat':1, 'spider':1, 'spider-web':1, 'black-cat':1, 'bat':1, 'skeleton':1, 'treat-bag':1,
  // christmas
  'christmas-tree':1, 'ornament':1, 'star':1, 'stocking':1, 'christmas-lights':1, 'santa':1, 'gift':1, 'wreath':1, 'snowman':1, 'candy-cane':1, 'reindeer':1,
  // spring (bird already shared from above)
  'flower':1, 'butterfly':1, 'rainbow':1, 'umbrella':1, 'rain-boots':1, 'bee':1, 'easter-egg':1, 'bunny':1, 'sunshine':1
};
(function applyItemIllustrations() {
  Object.keys(CATEGORIES).forEach(function(cid) {
    // Shapes & Colors intentionally stay on emoji (clean abstract icons beat
    // hand-drawn). Skipping them here also prevents shared slugs from leaking an
    // illustration into them (e.g. food 'orange' vs the colour 'orange').
    if (cid === 'shapes' || cid === 'colors') return;
    (CATEGORIES[cid].items || []).forEach(function(it) {
      var s = phSlug(it.name);
      if (ITEM_ILLUSTRATIONS[s]) it.img = 'img/items/' + s + '.png';
    });
  });
})();

// Items can set speakOverride to bypass the category-level speakPrompt logic
// (used for mass nouns, plurale tantum, and proper nouns where article rules
// break — e.g. "Can you find bread?" not "Can you find a bread?"). When an
// override is present, audio uses speechSynthesis instead of the cached MP3,
// because the cached file still has the old wording until re-recorded.
function promptFor(item, cat) {
  return item.speakOverride || cat.speakPrompt(item.name);
}
function speakItem(item, cat, onEnd) {
  // Every item — including the former speakOverride mass/proper nouns (keys,
  // bread, milk, Santa, …) — now has a correctly-worded recorded clip, so route
  // them all through speak() → cached MP3 (TTS stays only as the load fallback).
  speak(promptFor(item, cat), onEnd);
}

// ── Bilingual helpers ───────────────────────────────────────────
// Bilingual mode is a Premium feature (see docs/STRATEGY.md). It is "active"
// only when a language is selected AND the user is premium; otherwise the
// foreign word/badge is hidden and the picker routes to the paywall.
function bilingualActive() {
  if (typeof getSelectedLanguage !== 'function') return false;
  var code = getSelectedLanguage().code;
  if (code === 'none') return false;
  // Spanish is the free bilingual hook; the other 9 languages are Premium.
  if (typeof Paywall !== 'undefined' && !Paywall.isPremium() && !Paywall.isFreeLanguage(code)) return false;
  return true;
}
// Colors → "orange" must resolve to the colour word, not the fruit (both exist
// in the translation table under different keys).
function phTranslationLookupName(itemName, catId) {
  if (catId === 'colors' && itemName === 'orange') return 'orange (color)';
  return itemName;
}

// ═══════════════════════════════════════════════════════════════
// SOUND EFFECTS (Web Audio API)
// ═══════════════════════════════════════════════════════════════
var audioCtx = null;
var soundEnabled = lsGet('PH_SOUND') !== 'off';

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

// Inline SVG icons for the sound toggle (consistent across platforms vs emoji)
var SVG_VOL_ON = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M19 5a10 10 0 0 1 0 14"></path></svg>';
var SVG_VOL_OFF = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';

function toggleSound() {
  soundEnabled = !soundEnabled;
  lsSet('PH_SOUND', soundEnabled ? 'on' : 'off');
  var btn = document.getElementById('sound-toggle');
  if (btn) {
    btn.innerHTML = soundEnabled ? SVG_VOL_ON : SVG_VOL_OFF;
    // Expose state to assistive tech — the icon swap alone is invisible to screen readers.
    btn.setAttribute('aria-pressed', soundEnabled);
    btn.setAttribute('aria-label', soundEnabled ? 'Sound on' : 'Sound off');
  }
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
var currentDifficulty = lsGet('PH_DIFFICULTY') || 'medium';
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
  // Move focus into the new screen so keyboard / screen-reader users follow the
  // transition instead of being stranded on the now-hidden previous screen.
  try {
    var focusTarget = el.querySelector('h1') || el;
    focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
  } catch (e) {}
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
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
  } catch(e) {}
  // Warm the very first prompt the child will hear FIRST, then everything else,
  // so the home greeting is decoded before onSplashEnter tries to play it.
  preloadAudio('home-greeting');
  // Also warm the free Story Quest's opening line so its first narration plays in
  // the recorded fox voice instantly (story-* clips aren't in preloadAllAudio).
  preloadAudio('story-bear-breakfast-intro');
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
  if (typeof StickerBook !== 'undefined') StickerBook.addButtonToSplash();
  if (typeof DailyStreak !== 'undefined') DailyStreak.addCardToSplash();
  // Memory Hunt / Review Mode / Sorting Safari were cut 2026-05-18 (mechanical
  // drills, low retention). Storyline is now the primary engagement mode and is
  // rendered as a prominent card in renderSplash().
  // Block ghost taps for 400ms after landing (touch bleed from landing screen)
  var splash = document.getElementById('splash');
  if (splash) {
    splash.style.pointerEvents = 'none';
    setTimeout(function() { splash.style.pointerEvents = ''; }, 400);
  }
  // First time into the home hub this session: the fox pops up as a centerpoint
  // and greets the child (showHomeGreeting plays the greeting, then pulses). On
  // later returns from a game, just pulse the categories — no repeat greeting.
  setTimeout(function() {
    if (!window._homeGreeted) {
      window._homeGreeted = true;
      // First run ever: a one-time parent card (privacy notice + "want Spanish?"
      // choice) precedes the kid-facing fox greeting. After that it never shows
      // again; later sessions go straight to the greeting (once per session).
      var firstRun = false;
      try { firstRun = !localStorage.getItem('PH_FIRST_RUN_DONE'); } catch(e) {}
      if (firstRun && typeof showFirstRunSetup === 'function') {
        showFirstRunSetup(showHomeGreeting);
      } else {
        showHomeGreeting();
      }
    } else {
      pulseCategories();
    }
  }, 400);
}

// Friendly fox welcome the first time the child reaches the home hub. The fox is
// the centerpoint and speaks the greeting (recorded coral clip → TTS fallback),
// then reveals the picker + pulses the categories. Tap to skip.
function showHomeGreeting() {
  if (document.getElementById('home-greeting')) { pulseCategories(); return; }
  var GREETING = "Hi! I'm your adventure guide! Are you ready for an adventure? Let's pick one!";
  var ov = document.createElement('div');
  ov.id = 'home-greeting';
  ov.className = 'home-greeting';
  ov.innerHTML =
    '<img class="home-greeting-fox" src="img/mascot/fox-hero.png" alt="" aria-hidden="true">'
    + '<div class="home-greeting-bubble">' + GREETING + '</div>'
    + '<div class="home-greeting-skip">tap to continue</div>';
  document.body.appendChild(ov);

  var done = false;
  function dismiss() {
    if (done) return;
    done = true;
    ov.classList.add('home-greeting-out');
    setTimeout(function() { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 320);
    pulseCategories();
  }
  ov.addEventListener('click', dismiss);
  if (typeof soundEnabled !== 'undefined' && soundEnabled) {
    speak(GREETING, dismiss);
    setTimeout(dismiss, 8000); // safety: never get stuck if audio onEnd doesn't fire
  } else {
    setTimeout(dismiss, 4200); // muted: still show the visual welcome
  }
}

// First-run parent card: shown ONCE ever, before the kid-facing greeting. Two
// jobs in one parent-facing step: (1) the COPPA-style privacy notice (photos go
// to Google's vision AI to match, then are discarded; aim at things, not people)
// and (2) the bilingual opt-in the owner approved. Either button records an
// explicit PH_LANG choice and sets PH_FIRST_RUN_DONE so it never shows again.
// Uses the scroll/safe-center overlay pattern (LESSONS-LEARNED).
function showFirstRunSetup(onDone) {
  if (document.getElementById('first-run-setup')) { if (onDone) onDone(); return; }
  var ov = document.createElement('div');
  ov.id = 'first-run-setup';
  ov.className = 'first-run-overlay';
  ov.innerHTML =
    '<div class="first-run-card" role="dialog" aria-modal="true" aria-label="Welcome, grown-ups">'
    + '<img class="first-run-fox" src="img/mascot/fox-hero.png" alt="" aria-hidden="true">'
    + '<h2 class="first-run-title">Welcome, grown-ups! 👋</h2>'
    + '<p class="first-run-privacy">Picture Hunt sends each photo to Google\'s vision AI just to find a match, then it\'s gone — <b>never stored</b>. Best pointed at things, not people.</p>'
    + '<div class="first-run-divider"></div>'
    + '<p class="first-run-q">Want your child to hear everyday words in <b>Spanish</b> too, as they play? <span class="first-run-free">Free</span></p>'
    + '<button class="first-run-yes" id="first-run-yes" type="button">Sí, add Spanish! 🇪🇸</button>'
    + '<button class="first-run-no" id="first-run-no" type="button">Maybe later</button>'
    + '</div>';
  document.body.appendChild(ov);

  var done = false;
  function finish(langCode) {
    if (done) return;
    done = true;
    if (typeof setSelectedLanguage === 'function') setSelectedLanguage(langCode);
    try { localStorage.setItem('PH_FIRST_RUN_DONE', '1'); } catch(e) {}
    if (typeof renderSplash === 'function') renderSplash(); // refresh the lang bar to match the choice
    ov.classList.add('first-run-out');
    setTimeout(function() {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      if (onDone) onDone();
    }, 300);
  }
  var yes = document.getElementById('first-run-yes');
  var no = document.getElementById('first-run-no');
  if (yes) yes.onclick = function() { if (typeof playClick === 'function') playClick(); finish('es'); };
  if (no) no.onclick = function() { if (typeof playClick === 'function') playClick(); finish('none'); };
}

function renderSplash() {
  var grid = document.getElementById('category-grid');
  if (!grid) return;

  // Difficulty selector HTML (above categories)
  var diffHtml = '<div class="difficulty-selector" role="group" aria-label="Difficulty">'
    + '<button class="diff-btn' + (currentDifficulty === 'easy' ? ' active' : '') + '" aria-pressed="' + (currentDifficulty === 'easy') + '" onclick="setDifficulty(\'easy\')">⭐ Easy</button>'
    + '<button class="diff-btn' + (currentDifficulty === 'medium' ? ' active' : '') + '" aria-pressed="' + (currentDifficulty === 'medium') + '" onclick="setDifficulty(\'medium\')">⭐⭐ Medium</button>'
    + '<button class="diff-btn' + (currentDifficulty === 'hard' ? ' active' : '') + '" aria-pressed="' + (currentDifficulty === 'hard') + '" onclick="setDifficulty(\'hard\')">⭐⭐⭐ Hard</button>'
    + '</div>';

  // Language selector — bilingual mode is a core feature, copy reflects that
  var langHtml = '';
  if (typeof SUPPORTED_LANGUAGES !== 'undefined') {
    var langPrem = (typeof Paywall === 'undefined') || Paywall.isPremium();
    var currentLang = typeof getSelectedLanguage === 'function' ? getSelectedLanguage() : { code: 'none', emoji: '🚫', name: 'Off' };
    // Spanish (the free hook) is always available; the other 9 are Premium.
    var langLabel, langSubLabel;
    if (currentLang.code !== 'none') {
      langLabel = currentLang.emoji + ' Learning ' + currentLang.name;
      langSubLabel = (!langPrem && typeof Paywall !== 'undefined' && Paywall.isFreeLanguage(currentLang.code))
        ? 'Free · tap for 9 more'
        : 'Tap to change';
    } else {
      langLabel = '🌍 Learn a Language';
      langSubLabel = langPrem ? 'Tap to add bilingual mode' : 'Spanish free · tap to start';
    }
    langHtml = '<div class="lang-selector">'
      + '<button class="lang-btn" onclick="openLangPicker()">' + langLabel + '</button>'
      + '<div class="lang-sub">' + langSubLabel + '</div>'
      + '</div>';
  }

  // Insert difficulty + lang before the grid (first render). On re-render, update
  // the difficulty active state AND refresh the lang selector so a premium
  // unlock/lock change (e.g. right after redeeming a code) shows up immediately.
  var title = document.querySelector('.home-title');
  if (title && !document.querySelector('.difficulty-selector')) {
    title.insertAdjacentHTML('afterend', diffHtml + langHtml);
  } else if (title) {
    document.querySelectorAll('.diff-btn').forEach(function(btn, idx) {
      var isActive = ['easy','medium','hard'][idx] === currentDifficulty;
      btn.className = 'diff-btn' + (isActive ? ' active' : '');
      btn.setAttribute('aria-pressed', isActive);
    });
    var existingLang = document.querySelector('.lang-selector');
    if (existingLang) { existingLang.outerHTML = langHtml; }
    else if (langHtml) { var ds = document.querySelector('.difficulty-selector'); if (ds) ds.insertAdjacentHTML('afterend', langHtml); }
  }

  var savedGame = null;
  try { savedGame = JSON.parse(localStorage.getItem('PH_GAME_STATE')); } catch(e) {}

  // Filter: only show seasonal packs that are currently in-season or manually enabled
  var visibleCategories = (typeof SeasonalManager !== 'undefined')
    ? SeasonalManager.filterVisibleCategories(CATEGORY_ORDER)
    : CATEGORY_ORDER.filter(function(catId) { return !CATEGORIES[catId].seasonal; });

  var premium = (typeof Paywall === 'undefined') || Paywall.isPremium();

  var html = '';
  visibleCategories.forEach(function(catId) {
    var cat = CATEGORIES[catId];
    var found = getCategoryProgress(catId);
    var total = cat.items.length;
    var hasContinue = savedGame && savedGame.category === catId;
    var complete = found >= total;
    var badge = (typeof SeasonalManager !== 'undefined') ? SeasonalManager.getInSeasonBadge(catId) : '';
    var locked = !premium && typeof Paywall !== 'undefined' && !Paywall.isFreeCategory(catId);
    var classes = 'category-card' + (hasContinue ? ' has-continue' : '') + (locked ? ' locked' : '');

    html += '<button class="' + classes + '" '
      + 'style="background:' + cat.gradient + '" '
      + (locked ? 'aria-label="' + cat.name + ', premium — tap to unlock" ' : '')
      + 'onclick="playCategory(\'' + catId + '\')">'
      + '<div class="cat-emoji"><img class="cat-tile-img" src="img/tiles/' + catId + '.png" alt="" loading="lazy"></div>'
      + '<div class="cat-info">'
      + '<div class="cat-name">' + cat.name + badge + '</div>'
      + '<div class="cat-progress">'
      + (hasContinue ? '▶️ Continue!' : (complete ? '🏆 ' + found + '/' + total : found + '/' + total + ' ⭐'))
      + '</div></div></button>';
  });
  grid.innerHTML = html;

  // The Daily Challenge card lives INSIDE #category-grid, so the innerHTML rebuild
  // above wipes it. Re-add it on every render (addCardToSplash is dedupe-guarded)
  // so it survives unlock / difficulty / language / seasonal-toggle re-renders
  // instead of vanishing until the next home re-entry.
  if (typeof DailyStreak !== 'undefined' && DailyStreak.addCardToSplash) DailyStreak.addCardToSplash();

  // Free-tier play meter + upgrade CTA. Re-render-safe (uses fixed IDs).
  var meter = document.getElementById('play-meter');
  if (meter) meter.remove();
  var upBtn = document.getElementById('upgrade-cta');
  if (upBtn) upBtn.remove();
  var pBadge = document.getElementById('premium-badge');
  if (pBadge) pBadge.remove();

  // Promoted Storyline entry (replaces the old buried 📖 icon + More-games drawer)
  renderStorylineFeature(premium);

  if (typeof Paywall !== 'undefined') {
    if (premium) {
      var pb = document.createElement('div');
      pb.id = 'premium-badge';
      pb.className = 'premium-badge';
      pb.style.textAlign = 'center';
      pb.textContent = '⭐ PREMIUM';
      grid.parentNode.insertBefore(pb, grid);
    } else {
      var remaining = Paywall.playsRemaining();
      var btn = document.createElement('button');
      btn.id = 'upgrade-cta';
      btn.className = 'upgrade-cta';
      btn.textContent = '⭐ Unlock Everything';
      btn.onclick = function() { if (typeof Paywall !== 'undefined') Paywall.show('upgrade'); };
      grid.parentNode.insertBefore(btn, grid);

      var pm = document.createElement('div');
      pm.id = 'play-meter';
      pm.className = 'play-meter' + (remaining <= 1 ? ' warn' : '');
      pm.textContent = remaining === 0
        ? 'No free finds left today — come back tomorrow, or unlock premium ↑'
        : remaining + ' free find' + (remaining === 1 ? '' : 's') + ' left today';
      grid.parentNode.insertBefore(pm, grid);
    }
  }

  var btn = document.getElementById('sound-toggle');
  if (btn) btn.innerHTML = soundEnabled ? SVG_VOL_ON : SVG_VOL_OFF;

}

// Storyline is the primary engagement mode (the "treasure hunt" framing that
// beats toddler boredom — see docs/STRATEGY.md). It renders as a prominent
// hero card above the category grid, visible to everyone. Everyone can open it;
// free users get 1 sample quest, the rest unlock with Full Access.
function renderStorylineFeature(premium) {
  var container = document.getElementById('storyline-feature');
  if (!container) return;
  if (typeof STORIES === 'undefined' || typeof openStorySelector !== 'function') {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = '<button class="storyline-hero" id="storyline-hero-btn">'
    + '<img class="storyline-hero-fox" src="img/mascot/fox-point.png" alt="">'
    + '<span class="storyline-hero-text">'
    + '<span class="storyline-hero-title">Story Quests</span>'
    + '<span class="storyline-hero-sub">' + (premium ? 'Go on an adventure to find things!' : 'Go on an adventure — first quest free!') + '</span>'
    + '</span>'
    + '</button>';
  var heroBtn = document.getElementById('storyline-hero-btn');
  if (heroBtn) {
    heroBtn.onclick = function() {
      playClick();
      openStorySelector();
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// SETUP SCREEN
// ═══════════════════════════════════════════════════════════════
var setupCategory = 'household';
var setupSelection = new Set();

function openSetup() {
  setupCategory = 'household';  // always a free category, safe under paywall
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
  // Free tier: only show free categories in the setup picker.
  if (typeof Paywall !== 'undefined' && !Paywall.isPremium()) {
    visibleTabs = visibleTabs.filter(function(catId) { return Paywall.isFreeCategory(catId); });
  }
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
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', item.name);
    card.setAttribute('aria-pressed', setupSelection.has(item.name) ? 'true' : 'false');
    var iconHtml = item.img
      ? '<img src="' + item.img + '" class="setup-card-img" alt="' + item.name + '">'
      : '<span class="setup-card-emoji">' + item.emoji + '</span>';
    var setupTranslation = bilingualActive() ? getTranslationByName(phTranslationLookupName(item.name, setupCategory)) : null;
    var setupNameHtml = '<span class="setup-card-name">' + item.name
      + (setupTranslation ? '<br><span class="setup-card-translation">' + setupTranslation.word + '</span>' : '')
      + '</span>';
    card.innerHTML = iconHtml + setupNameHtml;
    card.addEventListener('click', function() {
      playClick();
      if (setupSelection.has(item.name)) setupSelection.delete(item.name);
      else setupSelection.add(item.name);
      card.classList.toggle('selected');
      card.setAttribute('aria-pressed', setupSelection.has(item.name) ? 'true' : 'false');
      card.classList.add('bounce-tap');
      setTimeout(function() { card.classList.remove('bounce-tap'); }, 300);
      updateSetupMsg();
    });
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
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

// Preload audio files into Web Audio API buffers (bypasses iOS autoplay restrictions).
// Returns a promise that resolves when the clip is decoded, and de-dupes in-flight
// loads so callers can await a specific clip before playing it.
var audioLoadPromises = {};
function preloadAudio(key) {
  if (audioBufferCache[key]) return Promise.resolve(audioBufferCache[key]);
  if (audioLoadPromises[key]) return audioLoadPromises[key];
  var src = 'audio/' + key + '.mp3';
  var p = fetch(src).then(function(r) { return r.arrayBuffer(); }).then(function(buf) {
    var ctx = ensureAudioCtx();
    return ctx.decodeAudioData(buf);
  }).then(function(decoded) {
    audioBufferCache[key] = decoded;
    delete audioLoadPromises[key];
    return decoded;
  }).catch(function(err) {
    delete audioLoadPromises[key];
    // Don't swallow silently — a missing/renamed file should surface in console.
    console.warn('[PH] audio load failed:', key, err && err.message);
    throw err;
  });
  audioLoadPromises[key] = p;
  return p;
}

function preloadAllAudio() {
  var keys = [
    'home-greeting','you-found-it','try-again','lets-try-another','great-job',
    'tap-to-hear','you-did-it','champion','cat-things','cat-shapes','cat-colors',
    'cat-animals','cat-food','cat-furniture','cat-clothing',
    'cat-halloween','cat-christmas','cat-spring',
    'halloween-victory','christmas-victory','spring-victory','hint-tap-lightbulb','keep-looking','lets-try-next','pick-category-first','ready-next-level','found-now-next','not-quite','sticker-book-empty','sticker-book-some','streak-milestone','sort-need-more','sorting-victory','sorting-safari-intro','phonics-hunt-intro','practice-need-more','practice-complete','round-complete','stickers-amazing','memory-amazing'
  ];
  // Preload all find prompts (skip items with speakOverride — those use TTS)
  Object.keys(CATEGORIES).forEach(function(catId) {
    var cat = CATEGORIES[catId];
    cat.items.forEach(function(item) {
      if (item.speakOverride) return;
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

  function startIt() {
    // Stop current
    if (currentAudioSource) { try { currentAudioSource.stop(); } catch(e) {} }
    var source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(ctx.destination);
    source.onended = function() { if (currentAudioSource === source) currentAudioSource = null; if (onEnd) onEnd(); };
    try { source.start(0); } catch(e) { currentAudioSource = null; if (onEnd) onEnd(); return; }
    currentAudioSource = source;
  }

  // iOS/Safari can leave the context 'suspended' (cold start, after backgrounding).
  // resume() is async — start playback only once it's actually running, or the
  // first sound after unlock gets silently dropped.
  if (ctx.state !== 'running' && ctx.resume) {
    ctx.resume().then(startIt).catch(startIt);
  } else {
    startIt();
  }
  return true;
}

// Map text → audio file key
function textToAudioKey(text) {
  var map = {
    "Hi! I'm your adventure guide! Are you ready for an adventure? Let's pick one!": 'home-greeting',
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
    'Spring Hunt! Find signs of spring!': 'cat-spring',
    'You found all the spooky things! Happy Halloween!': 'halloween-victory',
    'You found all the holiday magic! Merry Christmas!': 'christmas-victory',
    'You found all the signs of spring! Great job!': 'spring-victory',
    'Need a hint? Tap the light bulb!': 'hint-tap-lightbulb',
    'Keep looking! You can do it!': 'keep-looking',
    "Let's try the next one!": 'lets-try-next',
    'Pick a category first!': 'pick-category-first',
    'Ready for the next level?': 'ready-next-level',
    'You found it! Now find the next one!': 'found-now-next',
    'Not quite! Try again!': 'not-quite',
    'Your sticker book is empty! Find items to earn stickers!': 'sticker-book-empty',
    'Here are your stickers! Keep hunting!': 'sticker-book-some',
    'Amazing! What a streak! Keep it up!': 'streak-milestone',
    'Find more things first, then come sort them!': 'sort-need-more',
    'Great sorting! You put everything in the right group!': 'sorting-victory',
    'Sorting Safari! Put things in the right group!': 'sorting-safari-intro',
    'Phonics Hunt! Find things that start with each letter!': 'phonics-hunt-intro',
    'Find more things first, then come practice!': 'practice-need-more',
    'Practice complete! You did great!': 'practice-complete',
    'Round complete! Great practice!': 'round-complete',
    'You collected all the stickers! Amazing!': 'stickers-amazing',
    'You remembered them all! Amazing!': 'memory-amazing'
  };
  if (map[text]) return map[text];
  // Champion messages
  if (text.indexOf('champion') >= 0) return 'champion';
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

  // Web Audio buffer first (works on iOS without user gesture).
  // NEVER use new Audio() — fails on iOS Safari outside user gesture (LESSONS-LEARNED).
  var key = textToAudioKey(text);
  if (key) {
    if (audioBufferCache[key]) { playBuffer(key, onEnd); return; }
    // Buffer not decoded yet (cold start). Wait briefly for THIS clip rather than
    // racing straight to (often-silent) speechSynthesis — this is the root-cause
    // fix for "the voice plays sometimes, sometimes it doesn't."
    playKeyWhenReady(key, text, onEnd);
    return;
  }

  speakFallback(text, onEnd);
}

// Load one clip's buffer, then play it; if it isn't ready within a short window
// (or fails to load), fall back to speechSynthesis so we never hang silently.
function playKeyWhenReady(key, text, onEnd) {
  var settled = false;
  var to = setTimeout(function() {
    if (settled) return; settled = true;
    speakFallback(text, onEnd);
  }, 1200);
  preloadAudio(key).then(function() {
    if (settled) return; settled = true; clearTimeout(to);
    if (!playBuffer(key, onEnd)) speakFallback(text, onEnd);
  }).catch(function() {
    if (settled) return; settled = true; clearTimeout(to);
    speakFallback(text, onEnd);
  });
}

function speakFallback(text, onEnd) {
  if (!('speechSynthesis' in window)) { if (onEnd) onEnd(); return; }
  var utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.85; utter.pitch = 1.2; utter.volume = 1;
  var voices = speechSynthesis.getVoices();
  var preferred = voices.find(function(v) { return v.name.indexOf('Samantha') >= 0; }) ||
                  voices.find(function(v) { return v.name.indexOf('Zira') >= 0; }) ||
                  voices.find(function(v) { return /female/i.test(v.name) && v.lang.indexOf('en') === 0; }) ||
                  voices.find(function(v) { return v.lang.indexOf('en') === 0 && v.localService; });
  if (preferred) utter.voice = preferred;
  if (onEnd) utter.onend = onEnd;
  speechSynthesis.speak(utter);
}
if ('speechSynthesis' in window) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = function() { speechSynthesis.getVoices(); }; }

// Re-arm the audio context when returning from background (iOS auto-suspends it),
// so the next prompt after a tab-switch isn't dropped.
document.addEventListener('visibilitychange', function() {
  if (!document.hidden && audioCtx && audioCtx.state === 'suspended' && audioCtx.resume) audioCtx.resume();
});

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
function playCategory(catId, opts) {
  playClick();
  // Paywall gate — locked category or daily cap exceeded. opts.allowOverCap (set
  // by the Daily Challenge card) bypasses only the daily-cap part.
  if (typeof Paywall !== 'undefined') {
    var gate = Paywall.canPlay(catId, opts);
    if (!gate.ok) {
      Paywall.show(gate.reason, gate.catId);
      return;
    }
  }
  stopAllPulses();
  currentCategory = catId;
  var cat = CATEGORIES[catId];

  // Announce category name, then start game
  speak(cat.speakName, function() {
    var saved = null;
    try { saved = JSON.parse(lsGet('PH_GAME_STATE')); } catch(e) {}
    // Skip resume for a forced-item launch (Daily Challenge) — we want a fresh
    // hunt guaranteed to include today's item.
    if (!(opts && opts.forceItem) && saved && saved.category === catId && CATEGORIES[catId] && Array.isArray(saved.items)) {
      var catItems = CATEGORIES[catId].items;
      shuffledItems = saved.items.map(function(name) { return catItems.find(function(i) { return i.name === name; }); }).filter(Boolean);
      currentIndex = saved.index;
      if (shuffledItems.length > 0 && currentIndex < shuffledItems.length) {
        showScreen('game'); showCurrentItem(); return;
      }
    }
    startNewGame(catId, opts);
  });
}

function startNewGame(catId, opts) {
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

  // Sort by difficulty ascending — easy items first for early success
  shuffledItems.sort(function(a, b) { return (a.d || 1) - (b.d || 1); });

  // Daily Challenge: guarantee today's item is present AND first, even if the
  // difficulty filter or the parent's item selection would have excluded it —
  // otherwise the "Find this today!" item never appears in the hunt and the
  // streak can't be completed (e.g. a d:3 item on Medium).
  if (opts && opts.forceItem && CATEGORIES[currentCategory]) {
    var forced = (CATEGORIES[currentCategory].items || []).find(function(i) { return i.name === opts.forceItem; });
    if (forced) {
      shuffledItems = shuffledItems.filter(function(i) { return i.name !== opts.forceItem; });
      shuffledItems.unshift(forced);
    }
  }

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
  var displayPrompt = promptFor(item, cat);
  var langResult = bilingualActive() ? getTranslationByName(phTranslationLookupName(item.name, currentCategory)) : null;
  if (langResult) {
    targetText.innerHTML = displayPrompt
      + '<span class="target-translation">' + langResult.emoji + ' ' + langResult.word + '</span>';
  } else {
    targetText.textContent = displayPrompt;
  }
  feedbackArea.innerHTML = '';
  var progressPct = Math.round((currentIndex / shuffledItems.length) * 100);
  progressFill.style.width = progressPct + '%';
  if (progressFill.parentElement) progressFill.parentElement.setAttribute('aria-valuenow', progressPct);

  cameraInput.value = '';
  cameraLabel.style.display = '';
  cameraLabel.style.pointerEvents = 'auto';
  cameraLabel.style.opacity = '1';
  var skipArea = document.querySelector('.skip-area');
  if (skipArea) skipArea.style.display = '';

  // Speak the prompt, then (in bilingual mode) speak the foreign word, then
  // start pulsing camera + inactivity.
  speakItem(item, cat, function() {
    console.log('[PH] Prompt spoken, starting camera pulse + inactivity');
    speakForeignWordForItem(item, function() {
      startPulse(cameraLabel, 'camera');
      startInactivity();
    });
  });
}

// Speak the target-language word for `item` if bilingual mode is on. No-op
// otherwise. Calls onEnd in all cases.
function speakForeignWordForItem(item, onEnd) {
  if (!bilingualActive() || typeof speakTranslation !== 'function') {
    if (onEnd) onEnd();
    return;
  }
  var lookupName = phTranslationLookupName(item.name, currentCategory);
  var trans = getTranslationByName(lookupName);
  if (!trans) { if (onEnd) onEnd(); return; }
  var lang = getSelectedLanguage();
  // Brief gap after English so the words don't run together
  setTimeout(function() {
    // Prefer the recorded coral-voice clip (same fox voice, reliable on iOS);
    // fall back to browser TTS for any word/language not yet recorded.
    var slug = (typeof phSlug === 'function') ? phSlug(lookupName) : lookupName;
    playForeignClip('lang/' + lang.code + '/' + slug, trans.word, trans.speechLang, onEnd);
  }, 400);
}

// Play a recorded foreign-word clip (coral voice) the iOS-safe Web Audio way,
// falling back to browser speech synthesis when there's no recorded clip yet.
function foreignClipAvailable(key) {
  // key = 'lang/<code>/<slug>'. Consult the manifest so we only fetch clips that
  // exist (no 404s) — everything else uses browser TTS.
  if (typeof FOREIGN_AUDIO === 'undefined') return false;
  var parts = key.split('/');
  var byLang = FOREIGN_AUDIO[parts[1]];
  return !!(byLang && byLang[parts[2]]);
}

function playForeignClip(key, word, speechLang, onEnd) {
  if (!soundEnabled) { if (onEnd) onEnd(); return; }
  var done = false;
  var finish = function() { if (done) return; done = true; if (onEnd) onEnd(); };
  if (foreignClipAvailable(key)) {
    preloadAudio(key).then(function() {
      playBuffer(key, function() { setTimeout(finish, 150); });
    }).catch(function() { speakTranslation(word, speechLang); setTimeout(finish, 1500); });
  } else {
    speakTranslation(word, speechLang);   // recorded clip not (yet) available
    setTimeout(finish, 1500);
  }
}

function repeatPrompt() {
  playClick();
  stopAllPulses();
  resetInactivity();
  if (typeof storylineActive !== 'undefined' && storylineActive && typeof storylineHandleRepeat === 'function' && storylineHandleRepeat()) return;
  var item = shuffledItems[currentIndex];
  var cat = CATEGORIES[currentCategory];
  speakItem(item, cat, function() {
    speakForeignWordForItem(item, function() {
      startPulse(cameraLabel, 'camera');
      startInactivity();
    });
  });
}

function goHome() {
  playClick();
  // Exit storyline mode if active. A story's shuffledItems are cross-category
  // (and can include placeholder items), so saving them as a normal "Continue"
  // record yields a scrambled resume — skip the save when leaving a story.
  var wasStory = (typeof storylineActive !== 'undefined' && storylineActive);
  if (wasStory) { storylineActive = false; currentStory = null; }
  // End dashboard session if mid-game
  if (typeof dashboardEndSession === 'function' && _currentSession) {
    dashboardEndSession(_currentSession, _currentSession.found);
    _currentSession = null;
  }
  if (wasStory) {
    localStorage.removeItem('PH_GAME_STATE');
  } else {
    localStorage.setItem('PH_GAME_STATE', JSON.stringify({
      category: currentCategory,
      items: shuffledItems.map(function(i) { return i.name; }),
      index: currentIndex
    }));
  }
  showScreen('splash');
}

function skipItem() {
  if (typeof playRichSkip === 'function') { playRichSkip(); } else { playClick(); }
  stopAllPulses(); resetInactivity();
  if (typeof storylineActive !== 'undefined' && storylineActive && typeof storylineHandleSkip === 'function' && storylineHandleSkip()) return;
  // Chain the advance so the reassurance clip plays fully before the next prompt
  // interrupts it (single audio channel). onEnd always fires — incl. when muted.
  speak("Let's try another one!", advanceItem);
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
    dashboardEndSession(_currentSession, _currentSession.found);
    _currentSession = null;
  }

  var subEl = document.getElementById('victory-sub');
  var statsEl = document.getElementById('victory-stats');
  subEl.textContent = complete ? 'You\'re a ' + cat.name + ' champion!' : 'You found everything!';
  statsEl.innerHTML = '<div class="victory-stat">' + cat.emoji + ' ' + found + '/' + total
    + ' unique ' + cat.name.toLowerCase() + ' found!' + (complete ? ' 🏆' : '') + '</div>';
  if (typeof StickerBook !== 'undefined') StickerBook.addStickersToVictory(currentCategory);

  showScreen('victory');
  // Reset the victory buttons to default — a story victory rebinds them, so make
  // sure a normal game's "Play Again" starts a normal game, not the last story.
  var vAgain = document.querySelector('#victory .victory-buttons .play-btn');
  var vHome = document.querySelector('#victory .victory-buttons .setup-btn');
  if (vAgain) { vAgain.innerHTML = '🔄 Play Again!'; vAgain.onclick = function() { startNewGame(); }; }
  if (vHome) { vHome.onclick = function() { resetGame(); }; }
  // Use enhanced celebrations if available, fallback to confetti
  if (typeof celebrateCombo === 'function') {
    celebrateCombo(4000);
  } else {
    fireConfetti(4000);
  }
  if (typeof playRichVictory === 'function') { playRichVictory(); } else { playVictorySound(); }
  // Seasonal victory messages — use category-specific audio
  var seasonalVictory = {
    halloween: 'You found all the spooky things! Happy Halloween!',
    christmas: 'You found all the holiday magic! Merry Christmas!',
    spring: 'You found all the signs of spring! Great job!'
  };
  if (seasonalVictory[currentCategory]) {
    speak(seasonalVictory[currentCategory]);
  } else {
    speak(complete
      ? 'Amazing! You found every single ' + cat.name.toLowerCase().replace(/s$/, '') + '! You are a champion!'
      : 'You did it! You found everything! Great job!');
  }
}

// ═══════════════════════════════════════════════════════════════
// PHOTO HANDLING
// ═══════════════════════════════════════════════════════════════
var pendingBase64 = null;
var pendingMimeType = null;

// Cap the photo at 1024px on the long edge and re-encode as JPEG before it ever
// leaves the device. This (a) cuts Gemini image-token cost ~6-12x, (b) strips the
// EXIF/GPS metadata the camera embeds (privacy), (c) shrinks the upload on
// cellular, and (d) keeps big iPhone JPEGs under the worker's 8MB cap. 1024px is
// well above Gemini's 768px tiling, so recognition is unaffected. Falls back to
// the raw file if the image can't be decoded (e.g. an unexpected format).
var PHOTO_MAX_EDGE = 1024;
function downscalePhoto(file, done) {
  var reader = new FileReader();
  reader.onload = function() {
    var rawDataUrl = reader.result;
    var img = new Image();
    img.onload = function() {
      try {
        var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        var scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
        done(canvas.toDataURL('image/jpeg', 0.8), 'image/jpeg');
      } catch (e) {
        console.warn('[PH] photo downscale failed, sending original', e);
        done(rawDataUrl, file.type || 'image/jpeg');
      }
    };
    img.onerror = function() {
      console.warn('[PH] photo decode failed, sending original');
      done(rawDataUrl, file.type || 'image/jpeg');
    };
    img.src = rawDataUrl;
  };
  reader.readAsDataURL(file);
}

function handlePhoto(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  stopAllPulses(); resetInactivity();

  cameraLabel.style.display = 'none';
  var skipArea = document.querySelector('.skip-area');
  if (skipArea) skipArea.style.display = 'none';

  downscalePhoto(file, function(dataUrl, mime) {
    pendingBase64 = dataUrl.split(',')[1];
    pendingMimeType = mime;
    feedbackArea.innerHTML = '<div class="photo-preview">'
      + '<img src="' + dataUrl + '" class="preview-img" alt="Your photo"></div>';
    submitPhoto();
  });
}

async function submitPhoto() {
  if (!pendingBase64) return;
  loadingOverlay.classList.remove('hidden');

  try {
    var response = await identifyObject(pendingBase64, pendingMimeType);
    var firstLine = response.split('\n')[0].toLowerCase().trim();
    // Anchor on the leading token so a "No, …" that happens to contain "yes"
    // can't false-positive a celebration on stage.
    var matched = /^\s*yes\b/.test(firstLine);
    loadingOverlay.classList.add('hidden');
    pendingBase64 = null; pendingMimeType = null;

    if (matched) {
      // Storyline mode: handle success in story context
      if (typeof storylineActive !== 'undefined' && storylineActive && typeof storylineHandlePhotoSuccess === 'function' && storylineHandlePhotoSuccess()) return;
      if (typeof hideHintButton === 'function') hideHintButton(); // don't let the 💡 linger through the celebration
      recordProgress(currentCategory, shuffledItems[currentIndex].name);
      if (_currentSession) _currentSession.found++; // count real finds (not skips) for the dashboard session log
      if (typeof Paywall !== 'undefined') Paywall.recordPlay();
      // Streak sound: fire after 3+ consecutive finds
      if (!window._phStreak) window._phStreak = 0;
      window._phStreak++;
      if (window._phStreak >= 3 && typeof playRichStreak === 'function') {
        setTimeout(playRichStreak, 800);
      }
      // Daily challenge: check if this matches today's item
      if (typeof DailyStreak !== 'undefined') DailyStreak.onItemFound(currentCategory, shuffledItems[currentIndex].name);
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
      // Bilingual echo: AFTER the celebration line finishes, replay the word in the
      // recorded coral voice (speakForeignWordForItem → recorded clip, iOS-reliable)
      // and show the badge. The old playVictoryEcho fired 800ms in — cutting "You
      // found it!" off — and spoke an UNRECORDED "How do you say…" TTS line that is
      // silent/robotic on iOS, then a TTS foreign word whose speechSynthesis.cancel()
      // chopped the audio. That was the "starts, cuts off, says the Spanish word" bug.
      var foundItem = shuffledItems[currentIndex];
      var hasLang = bilingualActive();
      var echoResult = (hasLang && typeof getTranslationByName === 'function')
        ? getTranslationByName(phTranslationLookupName(foundItemName, currentCategory)) : null;
      var echoDuration = echoResult ? 4000 : 0;

      speak('You found it! Great job!', function() {
        if (echoResult) {
          feedbackArea.innerHTML = '<div class="result-msg success">🎉 You found it!</div>'
            + '<div class="translation-echo">' + echoResult.emoji + ' ' + echoResult.word + '</div>';
          if (typeof speakForeignWordForItem === 'function') speakForeignWordForItem(foundItem, function(){});
        }
      });
      setTimeout(typeof playRichSuccess === 'function' ? playRichSuccess : playSuccess, 300);

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
    // For every service/connectivity outcome below, RESTORE the camera + skip UI
    // (resetCameraUI) before returning — handlePhoto hid them and showed the photo
    // preview, so without this the child is stranded on a dead preview with no way
    // to retake or skip once the card is dismissed.
    // Offline card already shown by identifyObject's 503 path.
    if (err && err.message === 'offline') { resetCameraUI(); return; }
    // A backend/service error (bad key, quota, oversized, 5xx) is NOT a wrong
    // photo — never show "Not quite!" and never reset the streak. Show a friendly
    // "the camera's napping" card so a kid keeps a correct object on screen instead
    // of being told they failed when the service failed.
    if (err && err.message === 'service') {
      if (typeof showOfflineMessage === 'function') {
        showOfflineMessage({ emoji: '😴', title: 'Camera Nap!', body: "The magic camera is taking a little nap.<br>Try again in a minute!" });
      }
      resetCameraUI();
      return;
    }
    // First-load (service worker not yet controlling) or timeout/abort: this is
    // a connectivity problem, not a wrong photo — show the friendly offline card.
    if (!navigator.onLine || (err && err.name === 'AbortError')) {
      if (typeof showOfflineMessage === 'function') showOfflineMessage();
      resetCameraUI();
      return;
    }
    showMissResult();
  }
}

function showMissResult() {
  cameraLabel.style.display = 'none';
  var skipArea = document.querySelector('.skip-area');
  if (skipArea) skipArea.style.display = 'none';

  feedbackArea.innerHTML = '<img class="miss-fox" src="img/mascot/fox-think.png" alt="" aria-hidden="true">'
    + '<div class="result-msg fail">Not quite! Let\'s try again.</div>'
    + '<div class="result-buttons">'
    + '<button class="result-btn result-green" onclick="retakeFromMiss()" aria-label="Retake photo" title="Tap to retake · parents: hold to mark correct"><span class="result-icon" aria-hidden="true">📷</span></button>'
    + '<button class="result-btn result-yellow" onclick="skipFromMiss()" aria-label="Skip to the next one"><span class="result-icon" aria-hidden="true">⏭️</span></button>'
    + '</div>';

  // Parent override: hold the green button to mark a wrongly-rejected photo as
  // correct. (The AI isn't perfect on toddler photos — don't frustrate the child.)
  var greenBtn = feedbackArea.querySelector('.result-green');
  if (greenBtn) {
    var lpTimer = null, lpFired = false;
    var startLP = function() { lpFired = false; lpTimer = setTimeout(function() { lpFired = true; forceAccept(); }, 650); };
    var cancelLP = function() { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } };
    greenBtn.addEventListener('touchstart', startLP, { passive: true });
    greenBtn.addEventListener('touchend', cancelLP);
    greenBtn.addEventListener('touchmove', cancelLP, { passive: true });
    greenBtn.addEventListener('mousedown', startLP);
    greenBtn.addEventListener('mouseup', cancelLP);
    greenBtn.addEventListener('mouseleave', cancelLP);
    // If the hold fired forceAccept, swallow the trailing retake click.
    greenBtn.addEventListener('click', function(e) {
      if (lpFired) { e.preventDefault(); e.stopImmediatePropagation(); lpFired = false; }
    }, true);
  }

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
  speak("Let's try another one!", advanceItem);
}

// Parent override: long-press green button on miss screen
function forceAccept() {
  playClick();
  if (typeof hideHintButton === 'function') hideHintButton();
  // Story mode: route the override through the story success path so the child
  // stays in the storybook chrome and the quest advances via advanceStoryItem,
  // instead of dropping into the normal advanceItem flow.
  if (typeof storylineActive !== 'undefined' && storylineActive && typeof storylineHandlePhotoSuccess === 'function') {
    storylineHandlePhotoSuccess();
    return;
  }
  recordProgress(currentCategory, shuffledItems[currentIndex].name);
  if (_currentSession) _currentSession.found++; // parent-override find also counts in the session log
  // Use sticker pop for parent override
  if (typeof celebrateStickerPop === 'function') {
    celebrateStickerPop('👏', 1500);
  } else {
    fireConfetti(1000);
  }
  playSuccess(); speak('Great job!');
  resetCameraUI();
  // Track the timer (reuse autoAdvanceTimer) so navigating Home during the 800ms
  // window clears it — showScreen() clears autoAdvanceTimer — instead of firing
  // advanceItem against a screen the child already left.
  autoAdvanceTimer = setTimeout(advanceItem, 800);
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
  // Bound the round-trip so a stalled Worker can't leave "Looking at your
  // photo…" on screen forever (worst case for a 2-year-old).
  var ctrl = new AbortController();
  var timeoutId = setTimeout(function() { ctrl.abort(); }, 15000);
  var reqHeaders = { 'Content-Type': 'application/json' };
  if (PROXY_URL) reqHeaders['X-PH-Token'] = PH_PROXY_TOKEN;
  var resp;
  try {
    resp = await fetch(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(body), signal: ctrl.signal });
  } finally {
    clearTimeout(timeoutId);
  }
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
    // Any other non-OK status (revoked/invalid key 400/403, quota 429, oversized
    // 413, worker/Gemini 5xx) is a SERVICE failure, NOT a wrong photo. Log the
    // real status for the owner and tag the error so submitPhoto shows a friendly
    // "camera nap" card instead of telling the child "Not quite!" (the 2026-06-09
    // outage shape: a dead key silently failed every photo as a miss).
    var e = await resp.text();
    console.error('[PH] recognition service error ' + resp.status + ': ' + e);
    var svcErr = new Error('service'); svcErr.status = resp.status; throw svcErr;
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
  // Respect reduced-motion: skip the full-screen particle storm (success is
  // still conveyed by audio + the on-screen message).
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
  // Spanish is the free bilingual hook; the other languages are Premium. Free
  // users can still open the picker (Off or Spanish); a locked language routes
  // to the paywall.
  var premium = (typeof Paywall === 'undefined') || Paywall.isPremium();
  var existing = document.getElementById('lang-picker-overlay');
  if (existing) existing.remove();

  var current = getSelectedLanguage();
  var overlay = document.createElement('div');
  overlay.id = 'lang-picker-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) closeLangPicker(); };

  var modal = document.createElement('div');
  modal.className = 'lang-picker-modal';
  // The modal is the full-screen dim layer (it covers the overlay, so
  // overlay.onclick can never fire). Close when the tap lands on the dim area
  // itself rather than on an option.
  modal.onclick = function(e) { if (e.target === modal) closeLangPicker(); };
  modal.innerHTML = ''
    + '<div class="lang-picker-title">Bilingual Mode</div>'
    + '<div class="lang-picker-sub">Your child hears each prompt in English and the target language, and sees the foreign word on screen. <b>Spanish is free</b> — unlock the rest with Full Access.</div>';

  SUPPORTED_LANGUAGES.forEach(function(lang) {
    var isFree = lang.code === 'none' || (typeof Paywall !== 'undefined' && Paywall.isFreeLanguage(lang.code));
    var locked = !premium && !isFree;
    var btn = document.createElement('button');
    btn.className = 'lang-picker-option' + (lang.code === current.code ? ' selected' : '') + (locked ? ' locked' : '');
    btn.textContent = lang.emoji + ' ' + lang.name
      + (locked ? ' 🔒' : (!premium && isFree && lang.code !== 'none' ? ' · Free' : ''));
    btn.onclick = function() {
      if (locked) { closeLangPicker(); if (typeof Paywall !== 'undefined') Paywall.show('language'); return; }
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
  try { saved = JSON.parse(lsGet('PH_GAME_STATE')); } catch(e) {}
  // Guard the SHAPE, not just the parse: a stale save pointing at a category that
  // no longer exists (renamed/removed/seasonal-not-loaded) would throw on
  // CATEGORIES[saved.category].items and abort the entire startup init.
  if (saved && saved.category && CATEGORIES[saved.category] && Array.isArray(saved.items)) {
    currentCategory = saved.category;
    var catItems = CATEGORIES[saved.category].items;
    shuffledItems = saved.items.map(function(name) { return catItems.find(function(i) { return i.name === name; }); }).filter(Boolean);
    currentIndex = saved.index || 0;
  }
  // Initialize drop-in modules
  if (typeof initDashboard === 'function') initDashboard();
  if (typeof initHintSystem === 'function') initHintSystem();
  if (typeof initStorylineMode === 'function') initStorylineMode();
  if (typeof StickerBook !== 'undefined') StickerBook.init();
  if (typeof DailyStreak !== 'undefined') DailyStreak.init();
  if (typeof Paywall !== 'undefined') Paywall.init();
  if (typeof ProgressSync !== 'undefined') ProgressSync.init();
  if (typeof InstallPrompt !== 'undefined') InstallPrompt.init();
});
