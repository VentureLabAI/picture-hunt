// ============================================================
// Picture Hunt! — A visual scavenger hunt for toddlers
// ============================================================

// 🔑 Gemini API Key
let GEMINI_API_KEY = localStorage.getItem('PH_KEY') || '';

function showKeySetup() {
  document.getElementById('splash').querySelector('.splash-content').innerHTML = \`
    <h1 style="font-size:2.5rem;margin-bottom:1rem;">🔧 Parent Setup</h1>
    <p style="font-size:1.1rem;margin-bottom:1rem;color:rgba(255,255,255,0.7);">Paste your Gemini API key</p>
    <input type="text" id="key-input" placeholder="API key"
      style="width:80%;padding:14px;font-size:1rem;border-radius:12px;border:2px solid #555;background:#2a2a4a;color:white;margin-bottom:1rem;">
    <br>
    <button onclick="saveKey()" class="big-btn play-btn">Save & Play! 🎮</button>
  \`;
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
  const selected = getSelectedItems();
  shuffledItems = shuffle(selected);
  currentIndex = 0;
  showScreen('game');
  showCurrentItem();
}

function resetGame() {
  stopConfetti();
  showScreen('splash');
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
async function handlePhoto(input) {
  const file = input.files?.[0];
  if (!file) return;

  // Disable camera while processing
  cameraLabel.style.pointerEvents = 'none';
  cameraLabel.style.opacity = '0.5';
  loadingOverlay.classList.remove('hidden');
  feedbackArea.innerHTML = '';

  try {
    const base64 = await fileToBase64(file);
    const response = await identifyObject(base64, file.type);
    const firstLine = response.split('\n')[0].toLowerCase().trim();
    const matched = firstLine.includes('yes');

    loadingOverlay.classList.add('hidden');

    if (matched) {
      showFeedback('🎉 You found it!', 'success');
      fireConfetti(1500);
      speak('You found it! Great job!', () => {
        setTimeout(advanceItem, 800);
      });
    } else {
      showFeedback('🤔 Hmm, try again!', 'fail');
      speak('Hmm, try again!');
      // Re-enable camera
      cameraLabel.style.pointerEvents = 'auto';
      cameraLabel.style.opacity = '1';
      cameraInput.value = '';
    }
  } catch (err) {
    console.error('Error:', err);
    loadingOverlay.classList.add('hidden');
    showFeedback('😅 Oops! Try again!', 'fail');
    cameraLabel.style.pointerEvents = 'auto';
    cameraLabel.style.opacity = '1';
    cameraInput.value = '';
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
