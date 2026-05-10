// ============================================================
// Picture Hunt — Review Mode Module (Drop-in)
// ============================================================
// "Practice Time!" — A learning reinforcement mode that re-tests
// items the child has already found, using spaced repetition:
//   - New finds need more practice (appear often)
//   - Reviewed items need less practice (appear less)
//   - After 3 successful reviews, an item is "Mastered" ⭐
//
// WHY: Toddlers learn through repetition. Reviewing found items
// reinforces vocabulary, builds confidence, and turns passive
// progress into active mastery. Mixed categories keep it fresh.
//
// INTEGRATION:
//   1. Add <link rel="stylesheet" href="content/review-mode.css?v=N">
//   2. Add <script src="content/review-mode.js?v=N"></script> before </body>
//   3. In onSplashEnter(), add:
//        if (typeof ReviewMode !== 'undefined') ReviewMode.addButtonToSplash();
//   4. That's it! The module handles its own UI and game flow.
//   5. Requires: CATEGORIES, speak(), playSuccess(), playMiss(),
//      playClick(), ensureAudioCtx(), playTone(), soundEnabled,
//      recordProgress(), getProgress(), StickerBook from app.js
// ============================================================

var ReviewMode = (function() {
  'use strict';

  // ── Storage keys ──
  var REVIEW_DATA_KEY = 'PH_REVIEW_DATA';    // { "catId:itemName": { count, lastReview } }
  var MASTERED_KEY = 'PH_MASTERED_ITEMS';     // { "catId:itemName": true }
  var PLAYS_KEY = 'PH_REVIEW_PLAYS';

  // ── Config ──
  var REVIEW_TO_MASTER = 3;      // reviews needed to master an item
  var ROUND_SIZE = 4;            // items per review round
  var MAX_ROUNDS = 3;            // max rounds before victory

  // ── State ──
  var active = false;
  var roundItems = [];           // items in current round
  var currentIndex = 0;          // which item we're on
  var currentRound = 1;
  var totalMasteredThisSession = 0;
  var overlay = null;

  // ── Persistence helpers ──

  function getReviewData() {
    try { return JSON.parse(localStorage.getItem(REVIEW_DATA_KEY) || '{}'); } catch(e) { return {}; }
  }
  function saveReviewData(d) {
    try { localStorage.setItem(REVIEW_DATA_KEY, JSON.stringify(d)); } catch(e) {}
  }
  function getMastered() {
    try { return JSON.parse(localStorage.getItem(MASTERED_KEY) || '{}'); } catch(e) { return {}; }
  }
  function saveMastered(m) {
    try { localStorage.setItem(MASTERED_KEY, JSON.stringify(m)); } catch(e) {}
  }
  function getPlays() {
    try { return parseInt(localStorage.getItem(PLAYS_KEY) || '0', 10); } catch(e) { return 0; }
  }
  function savePlays() {
    try { localStorage.setItem(PLAYS_KEY, String(getPlays() + 1)); } catch(e) {}
  }

  function itemKey(catId, name) { return catId + ':' + name; }

  function recordReview(catId, name) {
    var key = itemKey(catId, name);
    var data = getReviewData();
    if (!data[key]) data[key] = { count: 0, lastReview: 0 };
    data[key].count++;
    data[key].lastReview = Date.now();
    saveReviewData(data);

    // Check mastery
    if (data[key].count >= REVIEW_TO_MASTER) {
      var mastered = getMastered();
      if (!mastered[key]) {
        mastered[key] = true;
        saveMastered(mastered);
        return true; // newly mastered!
      }
    }
    return false;
  }

  function getReviewCount(catId, name) {
    var data = getReviewData();
    var key = itemKey(catId, name);
    return (data[key] && data[key].count) || 0;
  }

  function isMastered(catId, name) {
    var mastered = getMastered();
    return !!mastered[itemKey(catId, name)];
  }

  // ── Item selection with spaced repetition ──

  function selectReviewItems() {
    if (typeof CATEGORIES === 'undefined') return [];
    var progress = (typeof getProgress === 'function') ? getProgress() : {};
    var reviewData = getReviewData();
    var mastered = getMastered();

    // Collect all found items across all categories
    var candidates = [];
    Object.keys(progress).forEach(function(catId) {
      var cat = CATEGORIES[catId];
      if (!cat) return;
      var foundNames = progress[catId] || [];
      foundNames.forEach(function(name) {
        var item = null;
        for (var i = 0; i < cat.items.length; i++) {
          if (cat.items[i].name === name) { item = cat.items[i]; break; }
        }
        if (!item) return;
        var key = itemKey(catId, name);
        var rd = reviewData[key];
        var reviewCount = rd ? rd.count : 0;
        var lastReview = rd ? rd.lastReview : 0;
        var isM = !!mastered[key];

        // Priority score: lower = should review sooner
        // Not mastered + few reviews = high priority (low score)
        // Mastered items = very low priority (high score)
        var priority;
        if (isM) {
          priority = 1000 + (Date.now() - lastReview) / 86400000; // mastered: only if very stale
        } else {
          priority = reviewCount * 10 + (Date.now() - lastReview) / 86400000;
          // Few reviews + long time since last = low score = high priority
          // Many reviews + recent = high score = low priority
        }

        candidates.push({
          catId: catId,
          item: item,
          reviewCount: reviewCount,
          isMastered: isM,
          priority: priority
        });
      });
    });

    // Sort by priority ascending (most-needy first)
    candidates.sort(function(a, b) { return a.priority - b.priority; });

    // Prefer non-mastered items, but include mastered if we need more
    var nonMastered = candidates.filter(function(c) { return !c.isMastered; });
    var masteredCandidates = candidates.filter(function(c) { return c.isMastered; });

    var selected = [];

    // Take up to ROUND_SIZE from non-mastered
    for (var i = 0; i < Math.min(ROUND_SIZE, nonMastered.length); i++) {
      selected.push(nonMastered[i]);
    }

    // Fill remaining with mastered items (only if stale > 3 days)
    var staleMastered = masteredCandidates.filter(function(c) {
      return (Date.now() - (reviewData[itemKey(c.catId, c.item.name)] || {}).lastReview) > 3 * 86400000;
    });
    for (var j = 0; selected.length < ROUND_SIZE && j < staleMastered.length; j++) {
      selected.push(staleMastered[j]);
    }

    // If still not enough, just take whatever we have
    if (selected.length < 3 && candidates.length >= 3) {
      // Relax and take any candidates
      for (var k = 0; selected.length < ROUND_SIZE && k < candidates.length; k++) {
        var alreadyIn = selected.some(function(s) { return s.catId === candidates[k].catId && s.item.name === candidates[k].item.name; });
        if (!alreadyIn) selected.push(candidates[k]);
      }
    }

    // Shuffle the selected items for variety (don't just play in priority order)
    for (var s = selected.length - 1; s > 0; s--) {
      var r = Math.floor(Math.random() * (s + 1));
      var tmp = selected[s]; selected[s] = selected[r]; selected[r] = tmp;
    }

    return selected;
  }

  // ── Sound helpers ──

  function rmPlayClick() { if (typeof playClick === 'function') playClick(); }
  function rmPlaySuccess() { if (typeof playSuccess === 'function') playSuccess(); }
  function rmPlayMiss() { if (typeof playMiss === 'function') playMiss(); }
  function rmSpeak(text, cb) {
    if (typeof speak === 'function') speak(text, cb);
    else if (cb) cb();
  }

  function playMasteredFanfare() {
    if (typeof soundEnabled !== 'undefined' && !soundEnabled) return;
    if (typeof playTone === 'function') {
      playTone(523, 0.15, 0, 'triangle', 0.3);
      playTone(659, 0.15, 0.1, 'triangle', 0.3);
      playTone(784, 0.15, 0.2, 'triangle', 0.3);
      playTone(1047, 0.4, 0.3, 'triangle', 0.4);
    }
  }

  function playReviewTone() {
    if (typeof soundEnabled !== 'undefined' && !soundEnabled) return;
    if (typeof playTone === 'function') {
      playTone(440, 0.12, 0, 'sine', 0.2);
      playTone(554, 0.12, 0.08, 'sine', 0.2);
    }
  }

  // ── UI ──

  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'review-mode-overlay';
    overlay.className = 'screen review-mode-overlay';
    overlay.innerHTML =
      '<div class="review-mode-content">'
      + '<div class="review-mode-header">'
      + '<button class="home-btn" onclick="ReviewMode.goHome()">🏠</button>'
      + '<div class="review-mode-level" id="rm-round"></div>'
      + '</div>'
      + '<div class="review-mode-title" id="rm-title">🔁 Practice Time!</div>'
      + '<div class="review-mode-subtitle" id="rm-subtitle"></div>'
      + '<div class="review-mode-progress" id="rm-progress"></div>'
      + '<div class="review-mode-target" id="rm-target"></div>'
      + '<div class="review-mode-feedback" id="rm-feedback"></div>'
      + '<div class="review-mode-camera" id="rm-camera">'
      + '<label class="big-btn camera-btn review-mode-camera-btn">'
      + '📷'
      + '<input type="file" accept="image/*" capture="environment" id="rm-camera-input" onchange="ReviewMode.handlePhoto(this)">'
      + '</label>'
      + '</div>'
      + '<div class="review-mode-actions" id="rm-actions"></div>'
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

  // ── Progress display ──

  function renderProgress() {
    var el = document.getElementById('rm-progress');
    if (!el) return;
    var html = '<div class="rm-progress-dots">';
    for (var i = 0; i < roundItems.length; i++) {
      var cls = 'rm-dot';
      if (i < currentIndex) cls += ' rm-dot-done';
      else if (i === currentIndex) cls += ' rm-dot-current';
      html += '<div class="' + cls + '">⭐</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  }

  // ── Game Flow ──

  function start() {
    active = true;
    currentRound = 1;
    totalMasteredThisSession = 0;

    // Need at least 3 found items to review
    var items = selectReviewItems();
    if (items.length < 3) {
      rmSpeak('Find more things first, then come practice!');
      active = false;
      return;
    }

    savePlays();
    showOverlay();
    startRound();
  }

  function startRound() {
    roundItems = selectReviewItems();
    if (roundItems.length < 3) {
      endReview();
      return;
    }

    currentIndex = 0;

    var roundEl = document.getElementById('rm-round');
    var titleEl = document.getElementById('rm-title');
    var subtitleEl = document.getElementById('rm-subtitle');
    var feedbackEl = document.getElementById('rm-feedback');
    var cameraEl = document.getElementById('rm-camera');
    var actionsEl = document.getElementById('rm-actions');

    if (roundEl) roundEl.textContent = 'Round ' + currentRound + '/' + MAX_ROUNDS;
    if (titleEl) titleEl.textContent = '🔁 Practice Time!';
    if (subtitleEl) subtitleEl.textContent = '';
    if (feedbackEl) feedbackEl.innerHTML = '';
    if (actionsEl) actionsEl.innerHTML = '';
    if (cameraEl) cameraEl.style.display = 'none';

    renderProgress();
    promptCurrentItem();
  }

  function promptCurrentItem() {
    if (currentIndex >= roundItems.length) {
      onRoundComplete();
      return;
    }

    var entry = roundItems[currentIndex];
    var item = entry.item;
    var cat = (typeof CATEGORIES !== 'undefined') ? CATEGORIES[entry.catId] : null;
    var prompt = cat ? cat.speakPrompt(item.name) : 'Can you find a ' + item.name + '?';

    var titleEl = document.getElementById('rm-title');
    var subtitleEl = document.getElementById('rm-subtitle');
    var targetEl = document.getElementById('rm-target');
    var cameraEl = document.getElementById('rm-camera');
    var feedbackEl = document.getElementById('rm-feedback');
    var actionsEl = document.getElementById('rm-actions');

    // Show category hint
    var catEmoji = cat ? cat.emoji : '🔍';
    var reviewCount = entry.reviewCount;
    var mastered = entry.isMastered;
    var masteryLabel = mastered ? ' ⭐' : (reviewCount > 0 ? ' (' + reviewCount + '/' + REVIEW_TO_MASTER + ')' : '');

    if (titleEl) titleEl.textContent = '📸 Find it again!';
    if (subtitleEl) subtitleEl.innerHTML = catEmoji + ' ' + (cat ? cat.name : '') + masteryLabel;

    // Show target
    var iconHtml = item.img
      ? '<img src="' + item.img + '" class="rm-target-img" alt="' + item.name + '">'
      : '<span class="rm-target-emoji">' + item.emoji + '</span>';
    if (targetEl) {
      targetEl.innerHTML = iconHtml
        + '<div class="rm-target-name">' + prompt + '</div>';
    }

    if (cameraEl) {
      cameraEl.style.display = '';
      var cameraInput = document.getElementById('rm-camera-input');
      if (cameraInput) cameraInput.value = '';
    }
    if (feedbackEl) feedbackEl.innerHTML = '';
    if (actionsEl) actionsEl.innerHTML = '';

    renderProgress();
    playReviewTone();
    rmSpeak('Find ' + item.name + ' again!', function() {
      rmSpeak(prompt);
    });
  }

  // ── Photo handling ──

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

      var cameraEl = document.getElementById('rm-camera');
      if (cameraEl) cameraEl.style.display = 'none';

      var feedbackEl = document.getElementById('rm-feedback');
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

    var entry = roundItems[currentIndex];
    var item = entry.item;
    var cat = (typeof CATEGORIES !== 'undefined') ? CATEGORIES[entry.catId] : null;
    var prompt = cat ? cat.aiPrompt(item.name) : 'Does this photo contain a ' + item.name + '?';

    var feedbackEl = document.getElementById('rm-feedback');
    if (feedbackEl) {
      feedbackEl.innerHTML += '<div class="loading"><div class="spinner"></div><p>Looking at your photo...</p></div>';
    }

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
    rmPlaySuccess();
    var entry = roundItems[currentIndex];
    var newlyMastered = recordReview(entry.catId, entry.item.name);

    // Also record regular progress + sticker
    if (typeof recordProgress === 'function') recordProgress(entry.catId, entry.item.name);
    if (typeof StickerBook !== 'undefined' && typeof StickerBook.recordFind === 'function') {
      StickerBook.recordFind(entry.catId, entry.item.name);
    }

    var targetEl = document.getElementById('rm-target');
    var feedbackEl = document.getElementById('rm-feedback');
    var actionsEl = document.getElementById('rm-actions');

    if (targetEl) targetEl.innerHTML = '';

    if (newlyMastered) {
      totalMasteredThisSession++;
      playMasteredFanfare();
      if (feedbackEl) {
        feedbackEl.innerHTML = '<div class="rm-mastered">⭐ MASTERED! ⭐</div>'
          + '<div class="rm-mastered-name">' + entry.item.emoji + ' ' + entry.item.name + '</div>';
      }
      rmSpeak('You mastered ' + entry.item.name + '! Amazing!', function() {
        advanceItem();
      });
      // Auto-advance after mastery celebration
      setTimeout(function() {
        advanceItem();
      }, 2500);
    } else {
      var reviewCount = getReviewCount(entry.catId, entry.item.name);
      var remaining = REVIEW_TO_MASTER - reviewCount;
      if (remaining < 0) remaining = 0;

      if (feedbackEl) {
        feedbackEl.innerHTML = '<div class="rm-success">✅ Great job!</div>'
          + '<div class="rm-review-count">' + entry.item.emoji + ' ' + remaining + ' more to master!</div>';
      }

      rmSpeak('You found it! Great job!', function() {
        setTimeout(function() {
          advanceItem();
        }, 800);
      });
    }
  }

  var _advancing = false;
  function advanceItem() {
    if (_advancing) return;
    _advancing = true;
    currentIndex++;
    setTimeout(function() {
      _advancing = false;
      promptCurrentItem();
    }, 300);
  }

  function onItemMiss() {
    rmPlayMiss();

    var feedbackEl = document.getElementById('rm-feedback');
    var actionsEl = document.getElementById('rm-actions');

    if (feedbackEl) feedbackEl.innerHTML = '<div class="rm-miss">🤔 Not quite!</div>';

    if (actionsEl) {
      actionsEl.innerHTML = ''
        + '<button class="big-btn play-btn" onclick="ReviewMode.retryCurrent()">🔄 Try Again</button>'
        + '<button class="big-btn" onclick="ReviewMode.skipItem()" style="background:rgba(255,255,255,0.15);margin-top:8px;">⏭️ Skip</button>';
    }

    rmSpeak('Not quite! Try again!');
  }

  function retryCurrent() {
    rmPlayClick();
    var feedbackEl = document.getElementById('rm-feedback');
    var actionsEl = document.getElementById('rm-actions');
    var cameraEl = document.getElementById('rm-camera');

    if (feedbackEl) feedbackEl.innerHTML = '';
    if (actionsEl) actionsEl.innerHTML = '';
    if (cameraEl) {
      cameraEl.style.display = '';
      var cameraInput = document.getElementById('rm-camera-input');
      if (cameraInput) cameraInput.value = '';
    }

    var entry = roundItems[currentIndex];
    var cat = (typeof CATEGORIES !== 'undefined') ? CATEGORIES[entry.catId] : null;
    rmSpeak(cat ? cat.speakPrompt(entry.item.name) : 'Can you find a ' + entry.item.name + '?');
  }

  function skipItem() {
    rmPlayClick();
    currentIndex++;
    promptCurrentItem();
  }

  function onRoundComplete() {
    var titleEl = document.getElementById('rm-title');
    var subtitleEl = document.getElementById('rm-subtitle');
    var feedbackEl = document.getElementById('rm-feedback');
    var actionsEl = document.getElementById('rm-actions');
    var targetEl = document.getElementById('rm-target');
    var cameraEl = document.getElementById('rm-camera');

    if (targetEl) targetEl.innerHTML = '';
    if (cameraEl) cameraEl.style.display = 'none';

    if (currentRound >= MAX_ROUNDS) {
      endReview();
      return;
    }

    if (titleEl) titleEl.textContent = '🎉 Round Complete!';
    if (subtitleEl) subtitleEl.textContent = totalMasteredThisSession > 0
      ? '⭐ ' + totalMasteredThisSession + ' mastered this session!'
      : 'Great practice!';
    if (feedbackEl) feedbackEl.innerHTML = '<div class="rm-round-done">🌟🌟🌟</div>';

    if (actionsEl) {
      actionsEl.innerHTML = '<button class="big-btn play-btn" onclick="ReviewMode.nextRound()">Next Round! ⬆️</button>';
    }

    rmSpeak('Round complete! Great practice!');
  }

  function nextRound() {
    rmPlayClick();
    currentRound++;
    startRound();
  }

  function endReview() {
    var titleEl = document.getElementById('rm-title');
    var subtitleEl = document.getElementById('rm-subtitle');
    var feedbackEl = document.getElementById('rm-feedback');
    var actionsEl = document.getElementById('rm-actions');
    var targetEl = document.getElementById('rm-target');
    var cameraEl = document.getElementById('rm-camera');

    if (targetEl) targetEl.innerHTML = '';
    if (cameraEl) cameraEl.style.display = 'none';

    var mastered = getMastered();
    var masteredCount = Object.keys(mastered).length;

    if (titleEl) titleEl.textContent = '🏆 Practice Done!';
    if (subtitleEl) subtitleEl.textContent = masteredCount + ' items mastered total!';

    if (feedbackEl) {
      feedbackEl.innerHTML = '<div class="rm-victory">'
        + '<div class="rm-victory-stars">⭐⭐⭐</div>'
        + '<div class="rm-victory-mastered">' + totalMasteredThisSession + ' newly mastered!</div>'
        + '<div class="rm-victory-total">' + masteredCount + ' total ⭐</div>'
        + '</div>';
    }

    if (actionsEl) {
      actionsEl.innerHTML = ''
        + '<button class="big-btn play-btn" onclick="ReviewMode.start()">🔄 Play Again</button>'
        + '<button class="big-btn" onclick="ReviewMode.goHome()" style="background:rgba(255,255,255,0.15);margin-top:8px;">🏠 Home</button>';
    }

    if (totalMasteredThisSession > 0) {
      playMasteredFanfare();
    } else {
      rmPlaySuccess();
    }

    rmSpeak('Practice complete! You did great!');
  }

  function goHome() {
    rmPlayClick();
    active = false;
    hideOverlay();
    if (typeof showScreen === 'function') showScreen('splash');
  }

  // ── Splash Button ──

  function addButtonToSplash() {
    // Need at least 3 found items to show the button
    var progress = (typeof getProgress === 'function') ? getProgress() : {};
    var totalFound = 0;
    Object.keys(progress).forEach(function(catId) {
      totalFound += (progress[catId] || []).length;
    });
    if (totalFound < 3) return; // don't show until child has found enough

    var container = document.getElementById('daily-challenge-container');
    if (!container) {
      var splashContent = document.querySelector('.splash-content');
      if (!splashContent) return;
      container = document.createElement('div');
      container.id = 'daily-challenge-container';
      var grid = document.getElementById('category-grid');
      if (grid) splashContent.insertBefore(container, grid);
    }

    if (document.getElementById('rm-splash-btn')) return;

    var mastered = getMastered();
    var masteredCount = Object.keys(mastered).length;
    var masteredText = masteredCount > 0 ? ' (' + masteredCount + ' ⭐)' : '';

    var btn = document.createElement('button');
    btn.id = 'rm-splash-btn';
    btn.className = 'rm-splash-card';
    btn.innerHTML = '<span class="rm-splash-emoji">🔁</span>'
      + '<span class="rm-splash-info">'
      + '<span class="rm-splash-name">Practice Time!</span>'
      + '<span class="rm-splash-sub">Review what you know' + masteredText + '</span>'
      + '</span>';
    btn.onclick = function() {
      rmPlayClick();
      start();
    };

    // Insert after Memory Hunt button if it exists, otherwise just append
    var mhBtn = document.getElementById('mh-splash-btn');
    if (mhBtn && mhBtn.nextSibling) {
      container.insertBefore(btn, mhBtn.nextSibling);
    } else {
      container.appendChild(btn);
    }
  }

  // ── Public API ──

  return {
    start: start,
    handlePhoto: handlePhoto,
    retryCurrent: retryCurrent,
    skipItem: skipItem,
    nextRound: nextRound,
    goHome: goHome,
    addButtonToSplash: addButtonToSplash,
    isActive: function() { return active; },
    getMasteredCount: function() { return Object.keys(getMastered()).length; },
    getMastered: getMastered,
    isItemMastered: isMastered,
    getReviewCount: getReviewCount
  };

})();
