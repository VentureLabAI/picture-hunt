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
      return 'Is the primary object in this photo a ' + n + ', or a very similar common variation of it? A sippy cup counts as a cup, a sandal counts as a shoe, a sofa counts as a chair. But a hat does not count as a shoe. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'shoe', emoji: '👟' }, { name: 'cup', emoji: '🥤' },
      { name: 'ball', emoji: '⚽' }, { name: 'teddy bear', emoji: '🧸' },
      { name: 'book', emoji: '📚' }, { name: 'spoon', emoji: '🥄' },
      { name: 'pillow', emoji: '🛏️', img: 'img/pillow.png' }, { name: 'blanket', emoji: '🧣', img: 'img/blanket.png' },
      { name: 'remote control', emoji: '📺', img: 'img/remote-control.png' }, { name: 'toothbrush', emoji: '🪥' },
      { name: 'chair', emoji: '🪑' }, { name: 'sock', emoji: '🧦' },
      { name: 'hat', emoji: '🧢' }, { name: 'keys', emoji: '🔑' },
      { name: 'water bottle', emoji: '🍼', img: 'img/water-bottle.png' }, { name: 'crayon', emoji: '🖍️' },
      { name: 'plate', emoji: '🍽️' }, { name: 'towel', emoji: '🧻', img: 'img/towel.png' },
      { name: 'lamp', emoji: '💡', img: 'img/lamp.png' }, { name: 'clock', emoji: '⏰' },
      { name: 'fork', emoji: '🍴', img: 'img/fork.png' }, { name: 'brush', emoji: '💇', img: 'img/brush.png' }
    ]
  },
  shapes: {
    id: 'shapes', name: 'Shapes', emoji: '🔷',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    speakPrompt: function(n) { return 'Can you find a ' + n + '?'; },
    speakName: 'Shapes! Find circles, squares, and more!',
    aiPrompt: function(n) {
      return 'Does the main object in this photo predominantly have the shape of a ' + n + '? It does not need to be perfectly geometric — real objects have rounded edges, imperfections, and may appear stretched due to camera angle. Ovals and elongated circles still count as circles. A plate is a circle, a book is a rectangle, a pizza slice is a triangle. But completely different shapes should be rejected (a square is not a circle). Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'circle', emoji: '⭕' }, { name: 'square', emoji: '🟦', img: 'img/square.png' },
      { name: 'triangle', emoji: '🔺' }, { name: 'star', emoji: '⭐' },
      { name: 'rectangle', emoji: '🟫', img: 'img/rectangle.png' }, { name: 'heart', emoji: '❤️' },
      { name: 'diamond', emoji: '🔷' }
    ]
  },
  colors: {
    id: 'colors', name: 'Colors', emoji: '🌈',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 50%, #feca57 100%)',
    speakPrompt: function(n) { return 'Can you find something ' + n + '?'; },
    speakName: 'Colors! Find red, blue, green, and more!',
    aiPrompt: function(n) {
      return 'Is the predominant color of the main object in this photo ' + n + '? This includes all shades, tints, and variations of ' + n + ' (e.g. light blue, dark blue, and navy all count as blue). However, colors from a completely different color family must be rejected — green is not brown, purple is not red. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see and its color.';
    },
    items: [
      { name: 'red', emoji: '🔴' }, { name: 'blue', emoji: '🔵' },
      { name: 'green', emoji: '🟢' }, { name: 'yellow', emoji: '🟡' },
      { name: 'orange', emoji: '🟠' }, { name: 'purple', emoji: '🟣' },
      { name: 'pink', emoji: '🩷' }, { name: 'white', emoji: '⚪' },
      { name: 'black', emoji: '⚫' }, { name: 'brown', emoji: '🟤' }
    ]
  },
  animals: {
    id: 'animals', name: 'Animals', emoji: '🐾',
    gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    speakPrompt: function(n) { return 'Can you find a ' + n + '?'; },
    speakName: 'Animals! Find dogs, cats, and more!',
    aiPrompt: function(n) {
      return 'Is the primary subject in this photo a ' + n + ', or a toy/stuffed animal version of a ' + n + '? Stuffed animals, figurines, and pictures of the animal all count. But a completely different animal should be rejected — a cat is not a dog. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'dog', emoji: '🐕' }, { name: 'cat', emoji: '🐱' },
      { name: 'duck', emoji: '🦆' }, { name: 'dinosaur', emoji: '🦕' },
      { name: 'elephant', emoji: '🐘' }, { name: 'lion', emoji: '🦁' },
      { name: 'pig', emoji: '🐷' }, { name: 'frog', emoji: '🐸' },
      { name: 'rabbit', emoji: '🐰' }, { name: 'bird', emoji: '🐦' },
      { name: 'fish', emoji: '🐟' }
    ]
  },
  food: {
    id: 'food', name: 'Food', emoji: '🍎',
    gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    speakPrompt: function(n) { if (n === 'cereal') return 'Can you find a cereal box?'; return 'Can you find ' + (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n + '?'; },
    speakName: 'Food! Find yummy things to eat!',
    aiPrompt: function(n) {
      return 'Is the primary object in this photo ' + n + ', or a container/package of ' + n + '? A juice box counts as juice, a milk carton counts as milk. But completely different foods should be rejected — a banana is not an apple. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'apple', emoji: '🍎' }, { name: 'banana', emoji: '🍌' },
      { name: 'orange', emoji: '🍊' }, { name: 'bread', emoji: '🍞' },
      { name: 'egg', emoji: '🥚' }, { name: 'carrot', emoji: '🥕' },
      { name: 'cookie', emoji: '🍪' }, { name: 'cereal', emoji: '🥣' },
      { name: 'milk', emoji: '🥛' }, { name: 'yogurt', emoji: '🫙' },
      { name: 'juice', emoji: '🧃' }
    ]
  },
  furniture: {
    id: 'furniture', name: 'Furniture', emoji: '🛋️',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    speakPrompt: function(n) { return 'Can you find a ' + n + '?'; },
    speakName: 'Furniture! Find things around the house!',
    aiPrompt: function(n) {
      return 'Is the primary object in this photo a ' + n + ', or a very similar common variation of it? A sofa counts as a couch, a monitor counts as a TV. But completely different furniture should be rejected — a table is not a chair. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'chair', emoji: '🪑' }, { name: 'table', emoji: '🪵' },
      { name: 'couch', emoji: '🛋️' }, { name: 'bed', emoji: '🛏️' },
      { name: 'TV', emoji: '📺' }, { name: 'door', emoji: '🚪' },
      { name: 'window', emoji: '🪟' }, { name: 'shelf', emoji: '📚' },
      { name: 'lamp', emoji: '💡', img: 'img/lamp.png' }
    ]
  },
  clothing: {
    id: 'clothing', name: 'Clothing', emoji: '👕',
    gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
    speakPrompt: function(n) { return 'Can you find a ' + n + '?'; },
    speakName: 'Clothing! Find things you can wear!',
    aiPrompt: function(n) {
      return 'Is the primary object in this photo a ' + n + ', or a very similar common variation of it? A t-shirt counts as a shirt, jeans count as pants, a coat counts as a jacket. But completely different clothing should be rejected — a shirt is not pants. Respond with ONLY "Yes" or "No" on the first line. On the second line, describe what you see.';
    },
    items: [
      { name: 'shirt', emoji: '👕' }, { name: 'pants', emoji: '👖' },
      { name: 'dress', emoji: '👗' }, { name: 'jacket', emoji: '🧥' },
      { name: 'hat', emoji: '🧢' }, { name: 'glove', emoji: '🧤' },
      { name: 'scarf', emoji: '🧣' }, { name: 'sock', emoji: '🧦' }
    ]
  }
};

var CATEGORY_ORDER = ['household', 'animals', 'food', 'shapes', 'colors', 'furniture', 'clothing'];

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
  screens[name].classList.add('active');
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

  var savedGame = null;
  try { savedGame = JSON.parse(localStorage.getItem('PH_GAME_STATE')); } catch(e) {}

  var html = '';
  CATEGORY_ORDER.forEach(function(catId) {
    var cat = CATEGORIES[catId];
    var found = getCategoryProgress(catId);
    var total = cat.items.length;
    var hasContinue = savedGame && savedGame.category === catId;
    var complete = found >= total;

    html += '<button class="category-card' + (hasContinue ? ' has-continue' : '') + '" '
      + 'style="background:' + cat.gradient + '" '
      + 'onclick="playCategory(\'' + catId + '\')">'
      + '<div class="cat-emoji">' + cat.emoji + '</div>'
      + '<div class="cat-info">'
      + '<div class="cat-name">' + cat.name + '</div>'
      + '<div class="cat-progress">'
      + (hasContinue ? '▶️ Continue!' : (complete ? '🏆 ' + found + '/' + total : found + '/' + total + ' ⭐'))
      + '</div></div></button>';
  });
  grid.innerHTML = html;

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
  CATEGORY_ORDER.forEach(function(catId) {
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
    card.innerHTML = iconHtml + '<span class="setup-card-name">' + item.name + '</span>';
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
    'cat-animals','cat-food','cat-furniture','cat-clothing'
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
    'Clothing! Find things you can wear!': 'cat-clothing'
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
  currentIndex = 0;
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
  targetText.textContent = cat.speakPrompt(item.name);
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
  var item = shuffledItems[currentIndex];
  var cat = CATEGORIES[currentCategory];
  speak(cat.speakPrompt(item.name), function() {
    startPulse(cameraLabel, 'camera');
    startInactivity();
  });
}

function goHome() {
  playClick();
  localStorage.setItem('PH_GAME_STATE', JSON.stringify({
    category: currentCategory,
    items: shuffledItems.map(function(i) { return i.name; }),
    index: currentIndex
  }));
  showScreen('splash');
}

function skipItem() {
  playClick(); stopAllPulses(); resetInactivity();
  speak("Let's try another one!");
  advanceItem();
}

function advanceItem() {
  currentIndex++;
  if (currentIndex >= shuffledItems.length) showVictory();
  else showCurrentItem();
}

function showVictory() {
  localStorage.removeItem('PH_GAME_STATE');
  var cat = CATEGORIES[currentCategory];
  var found = getCategoryProgress(currentCategory);
  var total = cat.items.length;
  var complete = found >= total;

  var subEl = document.getElementById('victory-sub');
  var statsEl = document.getElementById('victory-stats');
  subEl.textContent = complete ? 'You\'re a ' + cat.name + ' champion!' : 'You found everything!';
  statsEl.innerHTML = '<div class="victory-stat">' + cat.emoji + ' ' + found + '/' + total
    + ' unique ' + cat.name.toLowerCase() + ' found!' + (complete ? ' 🏆' : '') + '</div>';

  showScreen('victory');
  fireConfetti(4000); playVictorySound();
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
      recordProgress(currentCategory, shuffledItems[currentIndex].name);
      // AUTO-ADVANCE: celebrate then move on
      feedbackArea.innerHTML = '<div class="result-msg success">🎉 You found it!</div>';
      fireConfetti(3500);
      // Play voice FIRST, then chime after a beat — iOS can't play both simultaneously
      speak('You found it! Great job!');
      setTimeout(playSuccess, 300);
      autoAdvanceTimer = setTimeout(function() {
        resetCameraUI();
        advanceItem();
      }, 4500);
    } else {
      playMiss();
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
  fireConfetti(1000); playSuccess(); speak('Great job!');
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
  if (!resp.ok) { var e = await resp.text(); throw new Error('Gemini API error ' + resp.status + ': ' + e); }
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
  // Stay on landing screen — user taps "Let's Play!" to unlock audio and enter home
});
