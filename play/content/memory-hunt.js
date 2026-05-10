// ============================================================
// Picture Hunt — Memory Hunt Module (Drop-in)
// ============================================================
// A Simon-says memory game: the app speaks a sequence of items,
// and the child must find them IN ORDER using the camera.
// Starts with 1 item, builds to 2-3 as they succeed.
// Uses the same camera + AI validation as regular hunts.
//
// INTEGRATION:
//   1. Add <script src="content/memory-hunt.js"></script> before </body>
//   2. In onSplashEnter(), add: if (typeof MemoryHunt !== 'undefined') MemoryHunt.addButtonToSplash();
//   3. That's it! The module handles its own UI and game flow.
//   4. Requires: CATEGORIES, speak(), playSuccess(), playMiss(), playClick(),
//      ensureAudioCtx(), playTone(), soundEnabled from app.js
// ============================================================

var MemoryHunt = (function() {
  'use strict';

  // Storage keys
  var BEST_KEY = 'PH_MEMORY_HUNT_BEST';
  var PLAYS_KEY = 'PH_MEMORY_HUNT_PLAYS';

  // State
  var active = false;
  var sequence = [];
  var sequenceIndex = 0;
  var currentLevel = 1;
  var roundScore = 0;
  var totalRounds = 0;
  var maxLevel = 3;
  var itemsPerLevel = { 1: 1, 2: 2, 3: 3 };
  var currentCatId = null;
  var isShowingSequence = false;
  var isWaitingForPhoto = false;

  // DOM
  var overlay = null;

  // ── Utilities ──

  function getBestLevel() {
    try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10); } catch(e) { return 0; }
  }
  function saveBestLevel(lvl) {
    try { var best = getBestLevel(); if (lvl > best) localStorage.setItem(BEST_KEY, String(lvl)); } catch(e) {}
  }
  function getPlays() {
    try { return parseInt(localStorage.getItem(PLAYS_KEY) || '0', 10); } catch(e) { return 0; }
  }
  function savePlays() {
    try { localStorage.setItem(PLAYS_KEY, String(getPlays() + 1)); } catch(e) {}
  }

  // Get random d:1 items from a category (easy items for memory game)
  function getEasyItems(catId, count) {
    if (typeof CATEGORIES === 'undefined' || !CATEGORIES[catId]) return [];
    var cat = CATEGORIES[catId];
    var easy = cat.items.filter(function(i) { return !i.d || i.d <= 2; });
    // Shuffle and take count
    var shuffled = easy.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
    }
    return shuffled.slice(0, count);
  }

  // Pick a random non-seasonal category
  function pickCategory() {
    if (typeof CATEGORIES === 'undefined') return null;
    var order = typeof CATEGORY_ORDER !== 'undefined' ? CATEGORY_ORDER : Object.keys(CATEGORIES);
    var nonSeasonal = order.filter(function(id) { return !CATEGORIES[id].seasonal; });
    return nonSeasonal[Math.floor(Math.random() * nonSeasonal.length)];
  }

  // ── Sound helpers (use app.js globals with typeof guards) ──

  function mhPlayClick() {
    if (typeof playClick === 'function') playClick();
  }
  function mhPlaySuccess() {
    if (typeof playSuccess === 'function') playSuccess();
  }
  function mhPlayMiss() {
    if (typeof playMiss === 'function') playMiss();
  }
  function mhSpeak(text, cb) {
    if (typeof speak === 'function') speak(text, cb);
    else if (cb) cb();
  }

  // Special memory game tones
  function playMemoryTone(index) {
    if (typeof soundEnabled !== 'undefined' && !soundEnabled) return;
    var notes = [523, 659, 784, 880]; // C5, E5, G5, A5
    var freq = notes[index % notes.length];
    if (typeof playTone === 'function') {
      playTone(freq, 0.3, 0, 'sine', 0.3);
    }
  }

  function playMemoryComplete() {
    if (typeof soundEnabled !== 'undefined' && !soundEnabled) return;
    if (typeof playTone === 'function') {
      playTone(523, 0.2, 0, 'triangle', 0.25);
      playTone(659, 0.2, 0.1, 'triangle', 0.25);
      playTone(784, 0.2, 0.2, 'triangle', 0.25);
      playTone(1047, 0.4, 0.3, 'triangle', 0.3);
    }
  }

  // ── UI ──

  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'memory-hunt-overlay';
    overlay.className = 'screen memory-hunt-overlay';
    overlay.innerHTML = '<div class="memory-hunt-content">'
      + '<div class="memory-hunt-header">'
      + '<button class="home-btn" onclick="MemoryHunt.goHome()">🏠</button>'
      + '<div class="memory-hunt-level" id="mh-level"></div>'
      + '</div>'
      + '<div class="memory-hunt-title" id="mh-title">🧠 Memory Hunt!</div>'
      + '<div class="memory-hunt-subtitle" id="mh-subtitle"></div>'
      + '<div class="memory-hunt-sequence" id="mh-sequence"></div>'
      + '<div class="memory-hunt-current" id="mh-current"></div>'
      + '<div class="memory-hunt-feedback" id="mh-feedback"></div>'
      + '<div class="memory-hunt-camera" id="mh-camera">'
      + '<label class="big-btn camera-btn memory-hunt-camera-btn">'
      + '📷'
      + '<input type="file" accept="image/*" capture="environment" id="mh-camera-input" onchange="MemoryHunt.handlePhoto(this)">'
      + '</label>'
      + '</div>'
      + '<div class="memory-hunt-actions" id="mh-actions"></div>'
      + '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function showOverlay() {
    createOverlay();
    overlay.classList.add('active');
  }
  function hideOverlay() {
    if (overlay) overlay.classList.remove('active');
  }

  // ── Sequence Display ──

  function renderSequence() {
    var el = document.getElementById('mh-sequence');
    if (!el) return;
    var html = '<div class="mh-sequence-items">';
    sequence.forEach(function(item, idx) {
      var done = idx < sequenceIndex ? ' done' : '';
      var current = idx === sequenceIndex ? ' current' : '';
      var iconHtml = item.img
        ? '<img src="' + item.img + '" class="mh-item-img" alt="' + item.name + '">'
        : '<span class="mh-item-emoji">' + item.emoji + '</span>';
      html += '<div class="mh-seq-item' + done + current + '" id="mh-seq-' + idx + '">'
        + iconHtml
        + '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  function highlightSeqItem(idx) {
    var el = document.getElementById('mh-seq-' + idx);
    if (el) {
      el.classList.add('flash');
      setTimeout(function() { el.classList.remove('flash'); }, 600);
    }
  }

  function markSeqDone(idx) {
    var el = document.getElementById('mh-seq-' + idx);
    if (el) {
      el.classList.add('done');
      el.classList.remove('current');
    }
    // Mark next as current
    var next = document.getElementById('mh-seq-' + (idx + 1));
    if (next) next.classList.add('current');
  }

  // ── Game Flow ──

  function start() {
    active = true;
    currentLevel = 1;
    roundScore = 0;
    totalRounds = 0;
    currentCatId = pickCategory();
    if (!currentCatId) {
      mhSpeak('Pick a category first!');
      active = false;
      return;
    }
    savePlays();
    showOverlay();
    startRound();
  }

  function startRound() {
    sequenceIndex = 0;
    isShowingSequence = true;
    isWaitingForPhoto = false;

    var count = itemsPerLevel[currentLevel] || 1;
    sequence = getEasyItems(currentCatId, count);

    // Update level display
    var levelEl = document.getElementById('mh-level');
    if (levelEl) levelEl.textContent = 'Level ' + currentLevel + ' ⭐';

    var titleEl = document.getElementById('mh-title');
    var subtitleEl = document.getElementById('mh-subtitle');
    var feedbackEl = document.getElementById('mh-feedback');
    var cameraEl = document.getElementById('mh-camera');
    var actionsEl = document.getElementById('mh-actions');

    if (feedbackEl) feedbackEl.innerHTML = '';
    if (actionsEl) actionsEl.innerHTML = '';
    if (cameraEl) cameraEl.style.display = 'none';

    // Show sequence
    renderSequence();

    if (count === 1) {
      if (titleEl) titleEl.textContent = '🧠 Remember this!';
      if (subtitleEl) subtitleEl.textContent = '';
    } else {
      if (titleEl) titleEl.textContent = '🧠 Remember the order!';
      if (subtitleEl) subtitleEl.textContent = '';
    }

    // Speak each item in sequence with a delay
    speakSequence(0);
  }

  function speakSequence(idx) {
    if (idx >= sequence.length) {
      // Done showing sequence — now let the child find them
      isShowingSequence = false;
      promptCurrentItem();
      return;
    }

    var item = sequence[idx];
    var cat = (typeof CATEGORIES !== 'undefined') ? CATEGORIES[currentCatId] : null;
    var prompt = cat ? cat.speakPrompt(item.name) : 'Can you find a ' + item.name + '?';

    highlightSeqItem(idx);
    playMemoryTone(idx);

    mhSpeak(prompt, function() {
      setTimeout(function() {
        speakSequence(idx + 1);
      }, 500);
    });
  }

  function promptCurrentItem() {
    var item = sequence[sequenceIndex];
    if (!item) return;

    var cat = (typeof CATEGORIES !== 'undefined') ? CATEGORIES[currentCatId] : null;
    var prompt = cat ? cat.speakPrompt(item.name) : 'Can you find a ' + item.name + '?';

    var titleEl = document.getElementById('mh-title');
    var subtitleEl = document.getElementById('mh-subtitle');
    var currentEl = document.getElementById('mh-current');
    var cameraEl = document.getElementById('mh-camera');
    var feedbackEl = document.getElementById('mh-feedback');

    if (titleEl) titleEl.textContent = '📸 Find it!';
    if (subtitleEl) subtitleEl.textContent = '';

    // Show current target big
    var iconHtml = item.img
      ? '<img src="' + item.img + '" class="mh-target-img" alt="' + item.name + '">'
      : '<span class="mh-target-emoji">' + item.emoji + '</span>';
    if (currentEl) {
      currentEl.innerHTML = iconHtml
        + '<div class="mh-target-name">' + prompt + '</div>';
    }

    // Show camera button
    if (cameraEl) {
      cameraEl.style.display = '';
      var cameraInput = document.getElementById('mh-camera-input');
      if (cameraInput) cameraInput.value = '';
    }
    if (feedbackEl) feedbackEl.innerHTML = '';

    isWaitingForPhoto = true;

    mhSpeak('Now find ' + (sequence.length > 1 ? 'number ' + (sequenceIndex + 1) + ': ' : '') + item.name + '!', function() {
      mhSpeak(prompt);
    });
  }

  // ── Photo Handling ──

  var pendingBase64 = null;
  var pendingMimeType = null;

  function handlePhoto(input) {
    if (!isWaitingForPhoto) return;
    var file = input.files && input.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      pendingBase64 = dataUrl.split(',')[1];
      pendingMimeType = file.type || 'image/jpeg';

      var cameraEl = document.getElementById('mh-camera');
      if (cameraEl) cameraEl.style.display = 'none';

      var feedbackEl = document.getElementById('mh-feedback');
      if (feedbackEl) {
        feedbackEl.innerHTML = '<div class="photo-preview">'
          + '<img src="' + dataUrl + '" class="preview-img" alt="Your photo">'
          + '</div>';
      }

      submitPhoto();
    };
    reader.readAsDataURL(file);
  }

  function submitPhoto() {
    if (!pendingBase64) return;
    isWaitingForPhoto = false;

    var item = sequence[sequenceIndex];
    var cat = (typeof CATEGORIES !== 'undefined') ? CATEGORIES[currentCatId] : null;
    var prompt = cat ? cat.aiPrompt(item.name) : 'Does this photo contain a ' + item.name + '?';

    var feedbackEl = document.getElementById('mh-feedback');
    if (feedbackEl) {
      feedbackEl.innerHTML += '<div class="loading"><div class="spinner"></div><p>Looking at your photo...</p></div>';
    }

    // Call Gemini API (same as app.js)
    callGemini(prompt, pendingBase64, pendingMimeType, function(result) {
      pendingBase64 = null;
      pendingMimeType = null;

      if (result) {
        onItemFound();
      } else {
        onItemMiss();
      }
    });
  }

  function callGemini(promptText, base64Data, mimeType, callback) {
    var apiUrl;
    var headers = {};
    var body;

    if (typeof PROXY_URL !== 'undefined' && PROXY_URL) {
      apiUrl = PROXY_URL;
      headers = { 'Content-Type': 'application/json' };
    } else if (typeof GEMINI_API_KEY !== 'undefined' && GEMINI_API_KEY) {
      apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY;
    } else {
      callback(false);
      return;
    }

    body = JSON.stringify({
      contents: [{
        parts: [
          { text: promptText },
          { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } }
        ]
      }],
      generationConfig: { temperature: 0 }
    });

    fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: body
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      try {
        var text = data.candidates[0].content.parts[0].text;
        var yes = text.trim().toLowerCase().indexOf('yes') === 0;
        callback(yes);
      } catch(e) {
        callback(false);
      }
    })
    .catch(function() {
      callback(false);
    });
  }

  function onItemFound() {
    mhPlaySuccess();
    playMemoryTone(sequenceIndex);
    markSeqDone(sequenceIndex);
    sequenceIndex++;
    roundScore++;

    var feedbackEl = document.getElementById('mh-feedback');
    var titleEl = document.getElementById('mh-title');
    var currentEl = document.getElementById('mh-current');
    var actionsEl = document.getElementById('mh-actions');

    if (currentEl) currentEl.innerHTML = '';

    if (sequenceIndex >= sequence.length) {
      // Round complete!
      playMemoryComplete();
      if (titleEl) titleEl.textContent = '🎉 Amazing!';
      if (feedbackEl) feedbackEl.innerHTML = '<div class="mh-success-big">You remembered them all! 🌟</div>';
      if (actionsEl) {
        actionsEl.innerHTML = '<button class="big-btn play-btn" onclick="MemoryHunt.nextRound()">Next Level! ⬆️</button>';
      }

      // Record progress
      if (typeof recordProgress === 'function') {
        sequence.forEach(function(item) {
          recordProgress(currentCatId, item.name);
        });
      }
      // Record sticker
      if (typeof StickerBook !== 'undefined' && typeof StickerBook.recordFind === 'function') {
        sequence.forEach(function(item) {
          StickerBook.recordFind(currentCatId, item.name);
        });
      }

      saveBestLevel(currentLevel);

      mhSpeak('You remembered them all! Amazing!', function() {
        if (currentLevel < maxLevel) {
          mhSpeak('Ready for the next level?');
        }
      });
    } else {
      // Found one, find the next
      if (feedbackEl) feedbackEl.innerHTML = '<div class="mh-success">✅ Great! Now the next one!</div>';
      if (actionsEl) actionsEl.innerHTML = '';

      mhSpeak('You found it! Now find the next one!', function() {
        setTimeout(function() {
          promptCurrentItem();
        }, 500);
      });
    }
  }

  function onItemMiss() {
    mhPlayMiss();

    var feedbackEl = document.getElementById('mh-feedback');
    var titleEl = document.getElementById('mh-title');
    var actionsEl = document.getElementById('mh-actions');

    if (titleEl) titleEl.textContent = '🤔 Hmm...';
    if (feedbackEl) feedbackEl.innerHTML = '<div class="mh-miss">Not quite! Try again or start over.</div>';

    if (actionsEl) {
      actionsEl.innerHTML = ''
        + '<button class="big-btn play-btn" onclick="MemoryHunt.retryCurrent()">🔄 Try Again</button>'
        + '<button class="big-btn" onclick="MemoryHunt.startOver()" style="background:rgba(255,255,255,0.15);margin-top:8px;">🏠 Start Over</button>';
    }

    mhSpeak('Not quite! Try again!');
  }

  function retryCurrent() {
    mhPlayClick();
    var feedbackEl = document.getElementById('mh-feedback');
    var actionsEl = document.getElementById('mh-actions');
    var cameraEl = document.getElementById('mh-camera');

    if (feedbackEl) feedbackEl.innerHTML = '';
    if (actionsEl) actionsEl.innerHTML = '';
    if (cameraEl) {
      cameraEl.style.display = '';
      var cameraInput = document.getElementById('mh-camera-input');
      if (cameraInput) cameraInput.value = '';
    }

    isWaitingForPhoto = true;
    var item = sequence[sequenceIndex];
    var cat = (typeof CATEGORIES !== 'undefined') ? CATEGORIES[currentCatId] : null;
    mhSpeak(cat ? cat.speakPrompt(item.name) : 'Can you find a ' + item.name + '?');
  }

  function nextRound() {
    mhPlayClick();
    totalRounds++;
    if (currentLevel < maxLevel) currentLevel++;
    startRound();
  }

  function startOver() {
    mhPlayClick();
    active = false;
    hideOverlay();
    // Go back to splash
    if (typeof showScreen === 'function') showScreen('splash');
  }

  function goHome() {
    mhPlayClick();
    active = false;
    hideOverlay();
    if (typeof showScreen === 'function') showScreen('splash');
  }

  // ── Splash Button ──

  function addButtonToSplash() {
    var container = document.getElementById('daily-challenge-container');
    if (!container) {
      // Create a container if none exists
      var splashContent = document.querySelector('.splash-content');
      if (!splashContent) return;
      container = document.createElement('div');
      container.id = 'memory-hunt-container';
      var grid = document.getElementById('category-grid');
      if (grid) {
        splashContent.insertBefore(container, grid);
      }
    }

    // Don't add if already there
    if (document.getElementById('mh-splash-btn')) return;

    var best = getBestLevel();
    var bestText = best > 0 ? ' (Best: Level ' + best + ')' : '';

    var btn = document.createElement('button');
    btn.id = 'mh-splash-btn';
    btn.className = 'mh-splash-card';
    btn.innerHTML = '<span class="mh-splash-emoji">🧠</span>'
      + '<span class="mh-splash-info">'
      + '<span class="mh-splash-name">Memory Hunt!</span>'
      + '<span class="mh-splash-sub">Remember & find!' + bestText + '</span>'
      + '</span>';
    btn.onclick = function() {
      mhPlayClick();
      start();
    };

    // Insert before or after the daily challenge card
    container.appendChild(btn);
  }

  // ── Public API ──

  return {
    start: start,
    handlePhoto: handlePhoto,
    nextRound: nextRound,
    retryCurrent: retryCurrent,
    startOver: startOver,
    goHome: goHome,
    addButtonToSplash: addButtonToSplash,
    isActive: function() { return active; },
    getBestLevel: getBestLevel
  };

})();
