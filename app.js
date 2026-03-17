// ============================================================
// Picture Hunt! — A visual scavenger hunt for toddlers
// ============================================================

// ═══════════════════════════════════════════════════════════════
// API KEY MANAGEMENT
// ═══════════════════════════════════════════════════════════════
// Check URL hash for key (e.g. #key=AIza...) — lets you bookmark it
(function() {
  var h = location.hash;
  if (h && h.indexOf('#key=') === 0) {
    var k = h.substring(5);
    if (k) {
      localStorage.setItem('PH_KEY', k);
      // Reload cleanly so the key setup screen never shows
      location.replace(location.pathname + location.search);
      return;
    }
  }
})();

let GEMINI_API_KEY = localStorage.getItem('PH_KEY') || '';

function showKeySetup() {
  document.getElementById('splash').querySelector('.splash-content').innerHTML = `
    <h1 style="font-size:2.5rem;margin-bottom:1rem;">🔧 Parent Setup</h1>
    <p style="font-size:1.1rem;margin-bottom:1rem;color:rgba(255,255,255,0.7);">Paste your Gemini API key</p>
    <input type="text" id="key-input" placeholder="API key"
      style="width:80%;padding:14px;font-size:1rem;border-radius:12px;border:2px solid #555;background:#2a2a4a;color:white;margin-bottom:1rem;">
    <br>
    <button onclick="saveKey()" class="big-btn play-btn">Save & Play! 🎮</button>
  `;
}

function saveKey() {
  const k = document.getElementById('key-input').value.trim();
  if (k) {
    localStorage.setItem('PH_KEY', k);
    GEMINI_API_KEY = k;
    location.reload();
  }
}

if (!GEMINI_API_KEY) {
  window.addEventListener('DOMContentLoaded', showKeySetup);
}

// ═══════════════════════════════════════════════════════════════
// CATEGORIES & ITEMS
// ═══════════════════════════════════════════════════════════════
const CATEGORIES = {
  household: {
    id: 'household',
    name: 'Things',
    emoji: '🏠',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    speakPrompt: function(name) { return 'Can you find a ' + name + '?'; },
    aiPrompt: function(name) {
      return 'I am playing a scavenger hunt game with a young child. I am looking for: ' + name + '. Does this photo contain a ' + name + ' or something very similar? Reply with ONLY "yes" or "no" on the first line, then on the second line briefly say what you see.';
    },
    items: [
      { name: 'shoe', emoji: '👟' },
      { name: 'cup', emoji: '🥤' },
      { name: 'ball', emoji: '⚽' },
      { name: 'teddy bear', emoji: '🧸' },
      { name: 'book', emoji: '📚' },
      { name: 'spoon', emoji: '🥄' },
      { name: 'pillow', emoji: '🛋️' },
      { name: 'blanket', emoji: '🧶' },
      { name: 'remote control', emoji: '🎛️' },
      { name: 'toothbrush', emoji: '🪥' },
      { name: 'chair', emoji: '🪑' },
      { name: 'sock', emoji: '🧦' },
      { name: 'hat', emoji: '🧢' },
      { name: 'keys', emoji: '🔑' },
      { name: 'water bottle', emoji: '💧' },
      { name: 'crayon', emoji: '✏️' },
      { name: 'plate', emoji: '🍽️' },
      { name: 'towel', emoji: '🏖️' },
      { name: 'lamp', emoji: '💡' },
      { name: 'clock', emoji: '⏰' },
      { name: 'fork', emoji: '🍴' },
      { name: 'brush', emoji: '🪮' }
    ]
  },
  shapes: {
    id: 'shapes',
    name: 'Shapes',
    emoji: '🔷',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    speakPrompt: function(name) { return 'Can you find a ' + name + '?'; },
    aiPrompt: function(name) {
      return 'I am playing a shape-finding game with a young child. We are looking for a ' + name + ' shape. Does this photo contain an object or feature that is shaped like a ' + name + '? Be generous - it does not have to be a perfect geometric shape. Reply with ONLY "yes" or "no" on the first line, then on the second line briefly describe what you see.';
    },
    items: [
      { name: 'circle', emoji: '⭕' },
      { name: 'square', emoji: '🟧' },
      { name: 'triangle', emoji: '🔺' },
      { name: 'star', emoji: '⭐' },
      { name: 'rectangle', emoji: '📱' },
      { name: 'heart', emoji: '❤️' },
      { name: 'diamond', emoji: '🔷' }
    ]
  },
  colors: {
    id: 'colors',
    name: 'Colors',
    emoji: '🌈',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 50%, #feca57 100%)',
    speakPrompt: function(name) { return 'Can you find something ' + name + '?'; },
    aiPrompt: function(name) {
      return 'I am playing a color-finding game with a young child. We are looking for the color ' + name + '. Does this photo contain something that is clearly or predominantly ' + name + ' in color? Be generous with young children. Reply with ONLY "yes" or "no" on the first line, then on the second line briefly describe what you see.';
    },
    items: [
      { name: 'red', emoji: '🔴' },
      { name: 'blue', emoji: '🔵' },
      { name: 'green', emoji: '🟢' },
      { name: 'yellow', emoji: '🟡' },
      { name: 'orange', emoji: '🟠' },
      { name: 'purple', emoji: '🟣' },
      { name: 'pink', emoji: '🩷' },
      { name: 'white', emoji: '⚪' },
      { name: 'black', emoji: '⚫' },
      { name: 'brown', emoji: '🟤' }
    ]
  }
};

const CATEGORY_ORDER = ['household', 'shapes', 'colors'];

// ═══════════════════════════════════════════════════════════════
// SOUND EFFECTS (Web Audio API)
// ═══════════════════════════════════════════════════════════════
let audioCtx = null;
let soundEnabled = localStorage.getItem('PH_SOUND') !== 'off';

function ensureAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, delay, type, vol) {
  if (!soundEnabled) return;
  try {
    var ctx = ensureAudioCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    var t = ctx.currentTime + (delay || 0);
    gain.gain.setValueAtTime(vol || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch(e) { /* audio not available */ }
}

function playSuccess() {
  playTone(523, 0.25, 0, 'sine', 0.25);
  playTone(659, 0.25, 0.1, 'sine', 0.25);
  playTone(784, 0.35, 0.2, 'sine', 0.3);
}

function playMiss() {
  if (!soundEnabled) return;
  try {
    var ctx = ensureAudioCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch(e) {}
}

function playVictorySound() {
  playTone(523, 0.3, 0, 'triangle', 0.3);
  playTone(659, 0.3, 0.15, 'triangle', 0.3);
  playTone(784, 0.3, 0.3, 'triangle', 0.3);
  playTone(1047, 0.5, 0.45, 'triangle', 0.35);
}

function playClick() {
  playTone(800, 0.06, 0, 'sine', 0.12);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('PH_SOUND', soundEnabled ? 'on' : 'off');
  var btn = document.getElementById('sound-toggle');
  if (btn) btn.textContent = soundEnabled ? '🔊' : '🔇';
  if (soundEnabled) playClick();
}

// ═══════════════════════════════════════════════════════════════
// PROGRESS TRACKING
// ═══════════════════════════════════════════════════════════════
function getProgress() {
  try { return JSON.parse(localStorage.getItem('PH_PROGRESS') || '{}'); }
  catch(e) { return {}; }
}

function saveProgress(p) {
  localStorage.setItem('PH_PROGRESS', JSON.stringify(p));
}

function recordProgress(catId, itemName) {
  var p = getProgress();
  if (!p[catId]) p[catId] = [];
  if (p[catId].indexOf(itemName) === -1) {
    p[catId].push(itemName);
    saveProgress(p);
  }
}

function getCategoryProgress(catId) {
  var p = getProgress();
  return (p[catId] || []).length;
}

// ═══════════════════════════════════════════════════════════════
// ITEM SELECTION (per category)
// ═══════════════════════════════════════════════════════════════
function getSelectedNames(catId) {
  try {
    var all = JSON.parse(localStorage.getItem('PH_SELECTED') || '{}');
    var names = all[catId];
    if (Array.isArray(names) && names.length >= 3) return names;
  } catch(e) {}
  // Default: all items selected
  return CATEGORIES[catId].items.map(function(i) { return i.name; });
}

function getSelectedItems(catId) {
  var names = getSelectedNames(catId);
  return CATEGORIES[catId].items.filter(function(i) { return names.indexOf(i.name) >= 0; });
}

function saveSelectedNames(catId, names) {
  var all;
  try { all = JSON.parse(localStorage.getItem('PH_SELECTED') || '{}'); }
  catch(e) { all = {}; }
  all[catId] = names;
  localStorage.setItem('PH_SELECTED', JSON.stringify(all));
}

function migrateOldData() {
  // Migrate old PICTURE_HUNT_SELECTED → PH_SELECTED.household
  var old = localStorage.getItem('PICTURE_HUNT_SELECTED');
  if (old) {
    try {
      var names = JSON.parse(old);
      if (Array.isArray(names) && names.length > 0) {
        saveSelectedNames('household', names);
      }
    } catch(e) {}
    localStorage.removeItem('PICTURE_HUNT_SELECTED');
  }
  // Migrate old PH_GAME_STATE without category
  var gs = localStorage.getItem('PH_GAME_STATE');
  if (gs) {
    try {
      var state = JSON.parse(gs);
      if (state && !state.category) {
        state.category = 'household';
        localStorage.setItem('PH_GAME_STATE', JSON.stringify(state));
      }
    } catch(e) {}
  }
}

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════
var currentCategory = null;
var currentIndex = 0;
var shuffledItems = [];

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
  Object.values(screens).forEach(function(s) { s.classList.remove('active'); });
  screens[name].classList.add('active');
  if (name === 'splash') renderSplash();
}

// ═══════════════════════════════════════════════════════════════
// SPLASH SCREEN
// ═══════════════════════════════════════════════════════════════
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
      + '</div>'
      + '</div>'
      + '</button>';
  });
  grid.innerHTML = html;

  // Update sound toggle
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
  renderSetupTabs();
  renderSetupGrid();
  showScreen('setup');
}

function renderSetupTabs() {
  var tabsEl = document.getElementById('category-tabs');
  if (!tabsEl) return;
  var html = '';
  CATEGORY_ORDER.forEach(function(catId) {
    var cat = CATEGORIES[catId];
    html += '<button class="cat-tab' + (catId === setupCategory ? ' active' : '') + '" '
      + 'onclick="switchSetupTab(\'' + catId + '\')">'
      + cat.emoji + ' ' + cat.name
      + '</button>';
  });
  tabsEl.innerHTML = html;
}

function switchSetupTab(catId) {
  // Save current selection before switching
  if (setupSelection.size >= 3) {
    saveSelectedNames(setupCategory, Array.from(setupSelection));
  }
  setupCategory = catId;
  setupSelection = new Set(getSelectedNames(catId));
  renderSetupTabs();
  renderSetupGrid();
}

function renderSetupGrid() {
  var cat = CATEGORIES[setupCategory];
  setupGrid.innerHTML = '';
  cat.items.forEach(function(item) {
    var card = document.createElement('div');
    card.className = 'setup-card' + (setupSelection.has(item.name) ? ' selected' : '');
    card.innerHTML = '<span class="setup-card-emoji">' + item.emoji + '</span>'
      + '<span class="setup-card-name">' + item.name + '</span>';
    card.addEventListener('click', function() {
      playClick();
      if (setupSelection.has(item.name)) {
        setupSelection.delete(item.name);
      } else {
        setupSelection.add(item.name);
      }
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
  if (count < 3) {
    setupMsg.textContent = 'Pick at least 3! (' + count + ' selected)';
    setupMsg.classList.add('warn');
    setupDoneBtn.disabled = true;
  } else {
    setupMsg.textContent = count + ' items selected';
    setupMsg.classList.remove('warn');
    setupDoneBtn.disabled = false;
  }
}

function setupSelectAll() {
  playClick();
  setupSelection = new Set(CATEGORIES[setupCategory].items.map(function(i) { return i.name; }));
  renderSetupGrid();
}

function setupClearAll() {
  playClick();
  setupSelection = new Set();
  renderSetupGrid();
}

function setupDone() {
  if (setupSelection.size < 3) return;
  playClick();
  saveSelectedNames(setupCategory, Array.from(setupSelection));
  // Clear saved game for this category since items may have changed
  var gs = null;
  try { gs = JSON.parse(localStorage.getItem('PH_GAME_STATE')); } catch(e) {}
  if (gs && gs.category === setupCategory) {
    localStorage.removeItem('PH_GAME_STATE');
  }
  showScreen('splash');
}

// ═══════════════════════════════════════════════════════════════
// SPEECH
// ═══════════════════════════════════════════════════════════════
function speak(text, onEnd) {
  if (!soundEnabled || !('speechSynthesis' in window)) { if (onEnd) onEnd(); return; }
  window.speechSynthesis.cancel();
  var utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.85;
  utter.pitch = 1.2;
  utter.volume = 1;
  var voices = speechSynthesis.getVoices();
  var preferred = voices.find(function(v) { return v.name.indexOf('Samantha') >= 0; }) ||
                  voices.find(function(v) { return v.lang.indexOf('en') === 0 && v.localService; });
  if (preferred) utter.voice = preferred;
  if (onEnd) utter.onend = onEnd;
  speechSynthesis.speak(utter);
}

if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = function() { speechSynthesis.getVoices(); };
}

// ═══════════════════════════════════════════════════════════════
// SHUFFLE
// ═══════════════════════════════════════════════════════════════
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// ═══════════════════════════════════════════════════════════════
// GAME FLOW
// ═══════════════════════════════════════════════════════════════
function playCategory(catId) {
  playClick();
  currentCategory = catId;

  // Check for saved game in this category
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem('PH_GAME_STATE')); } catch(e) {}

  if (saved && saved.category === catId) {
    // Resume saved game
    var catItems = CATEGORIES[catId].items;
    shuffledItems = saved.items.map(function(name) {
      return catItems.find(function(i) { return i.name === name; });
    }).filter(Boolean);
    currentIndex = saved.index;
    if (shuffledItems.length > 0 && currentIndex < shuffledItems.length) {
      showScreen('game');
      showCurrentItem();
      return;
    }
  }

  // Start new game
  startNewGame(catId);
}

function startNewGame(catId) {
  localStorage.removeItem('PH_GAME_STATE');
  currentCategory = catId || currentCategory;
  var selected = getSelectedItems(currentCategory);
  shuffledItems = shuffle(selected);
  currentIndex = 0;
  showScreen('game');
  showCurrentItem();
}

function startGame() {
  // Legacy — start household by default
  playCategory('household');
}

function resetGame() {
  stopConfetti();
  localStorage.removeItem('PH_GAME_STATE');
  showScreen('splash');
}

function showCurrentItem() {
  var item = shuffledItems[currentIndex];
  var cat = CATEGORIES[currentCategory];
  targetEmoji.textContent = item.emoji;
  targetText.textContent = cat.speakPrompt(item.name);
  feedbackArea.innerHTML = '';
  progressFill.style.width = ((currentIndex / shuffledItems.length) * 100) + '%';

  cameraInput.value = '';
  cameraLabel.style.display = '';
  cameraLabel.style.pointerEvents = 'auto';
  cameraLabel.style.opacity = '1';
  var skipArea = document.querySelector('.skip-area');
  if (skipArea) skipArea.style.display = '';

  speak(cat.speakPrompt(item.name));
}

function repeatPrompt() {
  playClick();
  var item = shuffledItems[currentIndex];
  var cat = CATEGORIES[currentCategory];
  speak(cat.speakPrompt(item.name));
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
  playClick();
  speak("Let's try another one!");
  advanceItem();
}

function advanceItem() {
  currentIndex++;
  if (currentIndex >= shuffledItems.length) {
    showVictory();
  } else {
    showCurrentItem();
  }
}

function showVictory() {
  localStorage.removeItem('PH_GAME_STATE');
  var cat = CATEGORIES[currentCategory];
  var found = getCategoryProgress(currentCategory);
  var total = cat.items.length;
  var complete = found >= total;

  var subEl = document.getElementById('victory-sub');
  var statsEl = document.getElementById('victory-stats');

  subEl.textContent = complete
    ? 'You\'re a ' + cat.name + ' champion!'
    : 'You found everything!';

  statsEl.innerHTML = '<div class="victory-stat">'
    + cat.emoji + ' ' + found + '/' + total + ' unique ' + cat.name.toLowerCase() + ' found!'
    + (complete ? ' 🏆' : '')
    + '</div>';

  showScreen('victory');
  fireConfetti(4000);
  playVictorySound();
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

  var reader = new FileReader();
  reader.onload = function() {
    var dataUrl = reader.result;
    pendingBase64 = dataUrl.split(',')[1];
    pendingMimeType = file.type || 'image/jpeg';

    cameraLabel.style.display = 'none';
    var skipArea = document.querySelector('.skip-area');
    if (skipArea) skipArea.style.display = 'none';

    feedbackArea.innerHTML = '<div class="photo-preview">'
      + '<img src="' + dataUrl + '" class="preview-img" alt="Your photo">'
      + '</div>'
      + '<div class="preview-buttons">'
      + '<button class="preview-btn preview-retake" onclick="retakePreview()">📷<br><span class="preview-label">Again</span></button>'
      + '<button class="preview-btn preview-submit" onclick="submitPhoto()">✅<br><span class="preview-label">Yes!</span></button>'
      + '<button class="preview-btn preview-cancel" onclick="cancelPreview()">❌<br><span class="preview-label">No</span></button>'
      + '</div>';
  };
  reader.readAsDataURL(file);
}

function retakePreview() {
  playClick();
  pendingBase64 = null;
  pendingMimeType = null;
  resetCameraUI();
  cameraInput.value = '';
  cameraInput.click();
}

function cancelPreview() {
  playClick();
  pendingBase64 = null;
  pendingMimeType = null;
  resetCameraUI();
}

async function submitPhoto() {
  if (!pendingBase64) return;
  playClick();

  feedbackArea.innerHTML = '';
  loadingOverlay.classList.remove('hidden');

  try {
    var response = await identifyObject(pendingBase64, pendingMimeType);
    var firstLine = response.split('\n')[0].toLowerCase().trim();
    var matched = firstLine.indexOf('yes') >= 0;

    loadingOverlay.classList.add('hidden');
    pendingBase64 = null;
    pendingMimeType = null;

    if (matched) {
      recordProgress(currentCategory, shuffledItems[currentIndex].name);
      showResultButtons('found');
      fireConfetti(1500);
      playSuccess();
      speak('You found it! Great job!');
    } else {
      showResultButtons('notfound');
      playMiss();
      speak('Hmm, try again!');
    }
  } catch (err) {
    console.error('Error:', err);
    loadingOverlay.classList.add('hidden');
    showResultButtons('error');
    pendingBase64 = null;
    pendingMimeType = null;
  }
}

// ═══════════════════════════════════════════════════════════════
// GEMINI API
// ═══════════════════════════════════════════════════════════════
async function identifyObject(base64Data, mimeType) {
  var cat = CATEGORIES[currentCategory];
  var item = shuffledItems[currentIndex];
  var prompt = cat.aiPrompt(item.name);

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY;

  var body = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } }
      ]
    }]
  };

  var resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    var errText = await resp.text();
    throw new Error('Gemini API error ' + resp.status + ': ' + errText);
  }

  var data = await resp.json();
  var text = (data.candidates && data.candidates[0] && data.candidates[0].content &&
    data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text) || '';
  console.log('Gemini response:', text);
  console.log('Looking for:', item.name, '(category:', currentCategory + ')');
  return text.trim().toLowerCase();
}

// ═══════════════════════════════════════════════════════════════
// RESULT HANDLING
// ═══════════════════════════════════════════════════════════════
function showResultButtons(result) {
  cameraLabel.style.display = 'none';
  var skipArea = document.querySelector('.skip-area');
  if (skipArea) skipArea.style.display = 'none';

  if (result === 'found') {
    feedbackArea.innerHTML = '<div class="result-msg success">🎉 You found it!</div>'
      + '<div class="result-buttons">'
      + '<button class="result-btn result-green" onclick="acceptResult()"><span class="result-icon">✓</span></button>'
      + '<button class="result-btn result-yellow" onclick="retakePhoto()"><span class="result-icon">↻</span></button>'
      + '</div>';
  } else {
    feedbackArea.innerHTML = '<div class="result-msg fail">'
      + (result === 'error' ? '😅 Oops!' : '🤔 Not quite!') + '</div>'
      + '<div class="result-buttons">'
      + '<button class="result-btn result-green" onclick="forceAccept()"><span class="result-icon">✓</span></button>'
      + '<button class="result-btn result-red" onclick="dismissResult()"><span class="result-icon">✗</span></button>'
      + '<button class="result-btn result-yellow" onclick="retakePhoto()"><span class="result-icon">↻</span></button>'
      + '</div>';
  }
}

function acceptResult() {
  playClick();
  resetCameraUI();
  advanceItem();
}

function forceAccept() {
  playClick();
  recordProgress(currentCategory, shuffledItems[currentIndex].name);
  fireConfetti(1000);
  playSuccess();
  speak('Great job!');
  resetCameraUI();
  setTimeout(advanceItem, 800);
}

function dismissResult() {
  playClick();
  resetCameraUI();
  speak('Try again!');
}

function retakePhoto() {
  playClick();
  resetCameraUI();
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
// CONFETTI 🎊
// ═══════════════════════════════════════════════════════════════
var confettiPieces = [];
var confettiAnimId = null;

function resizeCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function fireConfetti(durationMs) {
  durationMs = durationMs || 2000;
  confettiPieces = [];
  var colors = ['#f5576c', '#43e97b', '#feca57', '#667eea', '#f093fb', '#38f9d7', '#ff6b6b', '#48dbfb'];
  for (var i = 0; i < 120; i++) {
    confettiPieces.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      w: Math.random() * 12 + 6,
      h: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 10
    });
  }
  var start = Date.now();
  function loop() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    var elapsed = Date.now() - start;
    var fade = elapsed > durationMs - 500 ? Math.max(0, (durationMs - elapsed) / 500) : 1;

    for (var j = 0; j < confettiPieces.length; j++) {
      var p = confettiPieces[j];
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      p.vy += 0.05;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = fade;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (elapsed < durationMs) {
      confettiAnimId = requestAnimationFrame(loop);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      confettiAnimId = null;
    }
  }
  if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
  loop();
}

function stopConfetti() {
  if (confettiAnimId) {
    cancelAnimationFrame(confettiAnimId);
    confettiAnimId = null;
  }
  if (ctx) ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', function() {
  if (!GEMINI_API_KEY) return; // showKeySetup handles this case

  initDomRefs();
  migrateOldData();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Wire setup buttons
  selectAllBtn.addEventListener('click', setupSelectAll);
  clearAllBtn.addEventListener('click', setupClearAll);
  setupDoneBtn.addEventListener('click', setupDone);

  // Restore saved game state for splash display
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem('PH_GAME_STATE')); } catch(e) {}
  if (saved && saved.category) {
    currentCategory = saved.category;
    var catItems = CATEGORIES[saved.category].items;
    shuffledItems = saved.items.map(function(name) {
      return catItems.find(function(i) { return i.name === name; });
    }).filter(Boolean);
    currentIndex = saved.index || 0;
  }

  renderSplash();
});
