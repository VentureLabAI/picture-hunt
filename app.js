// ============================================================
// Picture Hunt! — A visual scavenger hunt for toddlers
// ============================================================

// 🔑 Gemini API Key
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

// ── Items & Synonyms ──────────────────────────────────────────
const ITEMS = [
  {
    name: 'shoe',
    emoji: '👟',
    synonyms: ['shoe', 'shoes', 'sneaker', 'sneakers', 'boot', 'boots', 'footwear', 'sandal', 'sandals', 'slipper', 'slippers', 'loafer', 'flip flop', 'croc', 'crocs']
  },
  {
    name: 'cup',
    emoji: '🥤',
    synonyms: ['cup', 'cups', 'mug', 'mugs', 'glass', 'tumbler', 'sippy cup', 'drinking glass', 'goblet', 'beaker', 'chalice']
  },
  {
    name: 'ball',
    emoji: '⚽',
    synonyms: ['ball', 'balls', 'sphere', 'basketball', 'soccer ball', 'football', 'tennis ball', 'bouncy ball', 'baseball']
  },
  {
    name: 'teddy bear',
    emoji: '🧸',
    synonyms: ['teddy bear', 'teddy', 'bear', 'stuffed animal', 'stuffed bear', 'plush', 'plushie', 'soft toy', 'stuffed toy', 'cuddly toy']
  },
  {
    name: 'book',
    emoji: '📚',
    synonyms: ['book', 'books', 'notebook', 'magazine', 'novel', 'textbook', 'picture book', 'storybook']
  },
  {
    name: 'spoon',
    emoji: '🥄',
    synonyms: ['spoon', 'spoons', 'tablespoon', 'teaspoon', 'ladle', 'utensil', 'silverware', 'cutlery']
  },
  {
    name: 'pillow',
    emoji: '🛋️',
    synonyms: ['pillow', 'pillows', 'cushion', 'cushions', 'throw pillow']
  },
  {
    name: 'blanket',
    emoji: '🧶',
    synonyms: ['blanket', 'throw', 'comforter', 'quilt']
  },
  {
    name: 'remote control',
    emoji: '🎛️',
    synonyms: ['remote', 'remote control', 'tv remote', 'controller']
  },
  {
    name: 'toothbrush',
    emoji: '🪥',
    synonyms: ['toothbrush', 'tooth brush']
  },
  {
    name: 'chair',
    emoji: '🪑',
    synonyms: ['chair', 'seat', 'stool', 'dining chair']
  },
  {
    name: 'sock',
    emoji: '🧦',
    synonyms: ['sock', 'socks']
  },
  {
    name: 'hat',
    emoji: '🧢',
    synonyms: ['hat', 'cap', 'beanie', 'bonnet']
  },
  {
    name: 'keys',
    emoji: '🔑',
    synonyms: ['key', 'keys', 'keychain', 'key chain']
  },
  {
    name: 'water bottle',
    emoji: '💧',
    synonyms: ['water bottle', 'bottle', 'sippy cup', 'drink']
  },
  {
    name: 'crayon',
    emoji: '✏️',
    synonyms: ['crayon', 'crayons', 'marker', 'markers', 'colored pencil', 'pencil', 'pen']
  },
  {
    name: 'plate',
    emoji: '🍽️',
    synonyms: ['plate', 'dish', 'saucer']
  },
  {
    name: 'towel',
    emoji: '🏖️',
    synonyms: ['towel', 'washcloth', 'hand towel', 'bath towel']
  },
  {
    name: 'lamp',
    emoji: '💡',
    synonyms: ['lamp', 'light', 'desk lamp', 'table lamp']
  },
  {
    name: 'clock',
    emoji: '⏰',
    synonyms: ['clock', 'watch', 'timer', 'alarm clock']
  },
  {
    name: 'fork',
    emoji: '🍴',
    synonyms: ['fork', 'forks']
  },
  {
    name: 'brush',
    emoji: '🪮',
    synonyms: ['brush', 'hairbrush', 'hair brush', 'comb']
  }
];

// ── Setup / Item Selection ────────────────────────────────────
const STORAGE_KEY = 'PICTURE_HUNT_SELECTED';

function getSelectedItems() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const names = JSON.parse(saved);
      if (Array.isArray(names) && names.length >= 4) {
        return ITEMS.filter(i => names.includes(i.name));
      }
    } catch (e) { /* fall through to default */ }
  }
  // Default: all selected
  return [...ITEMS];
}

function getSelectedNames() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const names = JSON.parse(saved);
      if (Array.isArray(names) && names.length >= 4) return names;
    } catch (e) { /* fall through */ }
  }
  return ITEMS.map(i => i.name);
}

function saveSelectedNames(names) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
}

// ── State ─────────────────────────────────────────────────────
let currentIndex = 0;
let shuffledItems = [];

// ── DOM Refs ──────────────────────────────────────────────────
const screens = {
  splash: document.getElementById('splash'),
  setup: document.getElementById('setup'),
  game: document.getElementById('game'),
  victory: document.getElementById('victory')
};
const targetEmoji = document.getElementById('target-emoji');
const targetText = document.getElementById('target-text');
const feedbackArea = document.getElementById('feedback-area');
const progressFill = document.getElementById('progress-fill');
const cameraInput = document.getElementById('camera-input');
const cameraLabel = document.getElementById('camera-label');
const loadingOverlay = document.getElementById('loading');
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');

// Setup DOM refs
const setupGrid = document.getElementById('setup-grid');
const setupMsg = document.getElementById('setup-msg');
const selectAllBtn = document.getElementById('select-all-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const setupDoneBtn = document.getElementById('setup-done-btn');

// ── Screen Management ─────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ── Setup Screen ──────────────────────────────────────────────
let setupSelection = new Set();

function openSetup() {
  setupSelection = new Set(getSelectedNames());
  renderSetupGrid();
  showScreen('setup');
}

function renderSetupGrid() {
  setupGrid.innerHTML = '';
  ITEMS.forEach(item => {
    const card = document.createElement('div');
    card.className = 'setup-card' + (setupSelection.has(item.name) ? ' selected' : '');
    card.innerHTML = `<span class="setup-card-emoji">${item.emoji}</span><span class="setup-card-name">${item.name}</span>`;
    card.addEventListener('click', () => {
      if (setupSelection.has(item.name)) {
        setupSelection.delete(item.name);
      } else {
        setupSelection.add(item.name);
      }
      card.classList.toggle('selected');
      card.classList.add('bounce-tap');
      setTimeout(() => card.classList.remove('bounce-tap'), 300);
      updateSetupMsg();
    });
    setupGrid.appendChild(card);
  });
  updateSetupMsg();
}

function updateSetupMsg() {
  const count = setupSelection.size;
  if (count < 4) {
    setupMsg.textContent = `Pick at least 4 items! (${count} selected)`;
    setupMsg.classList.add('warn');
    setupDoneBtn.disabled = true;
  } else {
    setupMsg.textContent = `${count} items selected`;
    setupMsg.classList.remove('warn');
    setupDoneBtn.disabled = false;
  }
}

function setupSelectAll() {
  setupSelection = new Set(ITEMS.map(i => i.name));
  renderSetupGrid();
}

function setupClearAll() {
  setupSelection = new Set();
  renderSetupGrid();
}

function setupDone() {
  if (setupSelection.size < 4) return;
  saveSelectedNames([...setupSelection]);
  showScreen('splash');
}

// Wire up setup buttons
selectAllBtn.addEventListener('click', setupSelectAll);
clearAllBtn.addEventListener('click', setupClearAll);
setupDoneBtn.addEventListener('click', setupDone);

// ── Speech ────────────────────────────────────────────────────
function speak(text, onEnd) {
  if (!('speechSynthesis' in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.85;
  utter.pitch = 1.2;
  utter.volume = 1;
  // Try to pick a friendly English voice
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Samantha')) ||
                    voices.find(v => v.lang.startsWith('en') && v.localService);
  if (preferred) utter.voice = preferred;
  if (onEnd) utter.onend = onEnd;
  speechSynthesis.speak(utter);
}

// Preload voices (Safari needs this)
if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

// ── Shuffle ───────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Game Flow ─────────────────────────────────────────────────
function startGame() {
  localStorage.removeItem('PH_GAME_STATE');
  const selected = getSelectedItems();
  shuffledItems = shuffle(selected);
  currentIndex = 0;
  showScreen('game');
  showCurrentItem();
}

function resetGame() {
  stopConfetti();
  localStorage.removeItem('PH_GAME_STATE');
  showScreen('splash');
  updateSplashButtons();
}

function showCurrentItem() {
  const item = shuffledItems[currentIndex];
  targetEmoji.textContent = item.emoji;
  targetText.textContent = `Find a ${item.name}!`;
  feedbackArea.innerHTML = '';
  progressFill.style.width = `${(currentIndex / shuffledItems.length) * 100}%`;

  // Reset camera input so the same file can be re-selected
  cameraInput.value = '';
  cameraLabel.style.pointerEvents = 'auto';
  cameraLabel.style.opacity = '1';

  // Speak the prompt
  speak(`Can you find a ${item.name}?`);
}

function repeatPrompt() {
  const item = shuffledItems[currentIndex];
  speak("Can you find a " + item.name + "?");
}

function goHome() {
  // Save state for continue
  localStorage.setItem('PH_GAME_STATE', JSON.stringify({
    items: shuffledItems.map(i => i.name),
    index: currentIndex
  }));
  showScreen('splash');
  updateSplashButtons();
}

function continueGame() {
  showScreen('game');
  showCurrentItem();
}

function updateSplashButtons() {
  const saved = localStorage.getItem('PH_GAME_STATE');
  const playBtn = document.getElementById('play-btn');
  const contBtn = document.getElementById('continue-btn');
  const newBtn = document.getElementById('newgame-btn');
  
  if (saved && shuffledItems.length > 0 && currentIndex < shuffledItems.length) {
    playBtn.style.display = 'none';
    contBtn.style.display = '';
    newBtn.style.display = '';
  } else {
    playBtn.style.display = '';
    contBtn.style.display = 'none';
    newBtn.style.display = 'none';
  }
}

function skipItem() {
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
  showScreen('victory');
  fireConfetti(4000);
  speak('You did it! You found everything! Great job!');
}

// ── Photo Handling ────────────────────────────────────────────
let pendingBase64 = null;
let pendingMimeType = null;

async function handlePhoto(input) {
  const file = input.files?.[0];
  if (!file) return;

  // Convert to base64 and show preview
  const reader = new FileReader();
  reader.onload = function() {
    const dataUrl = reader.result;
    pendingBase64 = dataUrl.split(',')[1];
    pendingMimeType = file.type || 'image/jpeg';
    
    // Hide camera and skip, show preview with 3 buttons
    cameraLabel.style.display = 'none';
    const skipArea = document.querySelector('.skip-area');
    if (skipArea) skipArea.style.display = 'none';
    
    feedbackArea.innerHTML = `
      <div class="photo-preview">
        <img src="${dataUrl}" class="preview-img" alt="Your photo">
      </div>
      <div class="preview-buttons">
        <button class="preview-btn preview-retake" onclick="retakePreview()">
          📷<br><span class="preview-label">Again</span>
        </button>
        <button class="preview-btn preview-submit" onclick="submitPhoto()">
          ✅<br><span class="preview-label">Yes!</span>
        </button>
        <button class="preview-btn preview-cancel" onclick="cancelPreview()">
          ❌<br><span class="preview-label">No</span>
        </button>
      </div>
    `;
  };
  reader.readAsDataURL(file);
}

function retakePreview() {
  pendingBase64 = null;
  pendingMimeType = null;
  resetCameraUI();
  // Trigger camera again
  cameraInput.value = '';
  cameraInput.click();
}

function cancelPreview() {
  pendingBase64 = null;
  pendingMimeType = null;
  resetCameraUI();
}

async function submitPhoto() {
  if (!pendingBase64) return;

  feedbackArea.innerHTML = '';
  loadingOverlay.classList.remove('hidden');

  try {
    const response = await identifyObject(pendingBase64, pendingMimeType);
    const firstLine = response.split('\n')[0].toLowerCase().trim();
    const matched = firstLine.includes('yes');

    loadingOverlay.classList.add('hidden');
    pendingBase64 = null;
    pendingMimeType = null;

    if (matched) {
      showResultButtons('found');
      fireConfetti(1500);
      speak('You found it! Great job!');
    } else {
      showResultButtons('notfound');
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Strip the data:...;base64, prefix
      const result = reader.result.split(',')[1];
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Gemini API ────────────────────────────────────────────────
async function identifyObject(base64Data, mimeType) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{
      parts: [
        {
          text: `I am playing a scavenger hunt game. I am looking for: ${shuffledItems[currentIndex].name}. Does this photo contain a ${shuffledItems[currentIndex].name} or something very similar? Reply with ONLY "yes" or "no" on the first line, then on the second line briefly say what you see.`
        },
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: base64Data
          }
        }
      ]
    }]
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('Gemini response:', text);
  console.log('Looking for:', shuffledItems[currentIndex]?.name);
  return text.trim().toLowerCase();
}

// ── Matching ──────────────────────────────────────────────────
function matchItem(detected, item) {
  const d = detected.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  // Check if detected text contains any synonym
  for (const syn of item.synonyms) {
    if (d.includes(syn) || syn.includes(d)) return true;
  }
  // Also check if any word in the response matches
  const words = d.split(/\s+/);
  for (const word of words) {
    for (const syn of item.synonyms) {
      if (syn.includes(word) || word.includes(syn)) return true;
    }
  }
  return false;
}

// ── Feedback ──────────────────────────────────────────────────
function showFeedback(text, type) {
  feedbackArea.innerHTML = `<div class="feedback ${type}">${text}</div>`;
}

function showResultButtons(result) {
  // Hide camera button
  cameraLabel.style.display = 'none';
  document.querySelector('.skip-area').style.display = 'none';
  
  if (result === 'found') {
    feedbackArea.innerHTML = `
      <div class="result-msg success">🎉 You found it!</div>
      <div class="result-buttons">
        <button class="result-btn result-green" onclick="acceptResult()">
          <span class="result-icon">✓</span>
        </button>
        <button class="result-btn result-yellow" onclick="retakePhoto()">
          <span class="result-icon">↻</span>
        </button>
      </div>
    `;
  } else {
    feedbackArea.innerHTML = `
      <div class="result-msg fail">${result === 'error' ? '😅 Oops!' : '🤔 Not quite!'}</div>
      <div class="result-buttons">
        <button class="result-btn result-green" onclick="forceAccept()">
          <span class="result-icon">✓</span>
        </button>
        <button class="result-btn result-red" onclick="dismissResult()">
          <span class="result-icon">✗</span>
        </button>
        <button class="result-btn result-yellow" onclick="retakePhoto()">
          <span class="result-icon">↻</span>
        </button>
      </div>
    `;
  }
}

function acceptResult() {
  resetCameraUI();
  advanceItem();
}

function forceAccept() {
  // Parent override - accept even if AI said no
  fireConfetti(1000);
  speak('Great job!');
  resetCameraUI();
  setTimeout(advanceItem, 800);
}

function dismissResult() {
  resetCameraUI();
  speak('Try again!');
}

function retakePhoto() {
  resetCameraUI();
}

function resetCameraUI() {
  feedbackArea.innerHTML = '';
  cameraLabel.style.display = '';
  cameraLabel.style.pointerEvents = 'auto';
  cameraLabel.style.opacity = '1';
  cameraInput.value = '';
  const skipArea = document.querySelector('.skip-area');
  if (skipArea) skipArea.style.display = '';
}

// ── Confetti 🎊 ──────────────────────────────────────────────
let confettiPieces = [];
let confettiAnimId = null;

function resizeCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function fireConfetti(durationMs = 2000) {
  confettiPieces = [];
  const colors = ['#f5576c', '#43e97b', '#feca57', '#667eea', '#f093fb', '#38f9d7', '#ff6b6b', '#48dbfb'];
  for (let i = 0; i < 120; i++) {
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
  const start = Date.now();
  function loop() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    const elapsed = Date.now() - start;
    const fade = elapsed > durationMs - 500 ? Math.max(0, (durationMs - elapsed) / 500) : 1;

    for (const p of confettiPieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      p.vy += 0.05; // gravity

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
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

// Check for saved game on load
window.addEventListener('DOMContentLoaded', function() {
  const saved = localStorage.getItem('PH_GAME_STATE');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      const selectedItems = getSelectedItems();
      shuffledItems = state.items.map(name => selectedItems.find(i => i.name === name)).filter(Boolean);
      currentIndex = state.index;
      if (shuffledItems.length > 0 && currentIndex < shuffledItems.length) {
        updateSplashButtons();
      }
    } catch(e) { localStorage.removeItem('PH_GAME_STATE'); }
  }
});
