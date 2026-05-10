/**
 * Picture Hunt — Sorting Safari Module
 * ======================================
 * A critical thinking game that teaches categorization.
 * The app shows an item (emoji + audio) and the child sorts
 * it into the right category bucket by tapping.
 *
 * HOW IT WORKS:
 *   1. Child taps "🧩 Sorting Safari" on splash screen
 *   2. App picks 2-3 categories the child has found items in
 *   3. Shows one item at a time: "Where does the DOG go?"
 *   4. Child taps the right category bucket
 *   5. Correct → "Yes! A dog is an ANIMAL! 🎉"
 *   6. Wrong  → "Hmm, that's an animal! Try again! 🐾"
 *   7. Sort all items → celebration!
 *
 * LEVEL PROGRESSION:
 *   - Level 1: 2 buckets, 4 items (easy, familiar categories)
 *   - Level 2: 2 buckets, 6 items (more items)
 *   - Level 3: 3 buckets, 6 items (harder sorting)
 *   - Level 4: 3 buckets, 8 items (expert)
 *
 * WHY THIS HELPS A 3-YEAR-OLD:
 *   - Categorization is a fundamental thinking skill
 *   - Ages 2-5 is the prime window for learning "what goes with what"
 *   - Builds vocabulary by connecting items to their group names
 *   - Confidence boost: "I KNOW a dog is an animal!"
 *   - No camera needed — quick play sessions, zero frustration
 *   - Audio-first: the category names are spoken aloud
 *
 * INTEGRATION:
 *   1. Add CSS: <link rel="stylesheet" href="content/sorting-safari.css?v=N">
 *   2. Add JS:  <script src="content/sorting-safari.js?v=N"></script>
 *   3. In app.js onSplashEnter(): if (typeof SortingSafari !== 'undefined') SortingSafari.addButtonToSplash();
 *   4. Bump cache ?v=N on all script/style tags
 *
 * REQUIRES:
 *   - speak(text, onEnd) from app.js
 *   - playClick() from app.js
 *   - playSuccess() from app.js
 *   - playMiss() from app.js
 *   - CATEGORIES or CONTENT_PACKS from app.js
 *   - getProgress() from app.js
 *   - soundEnabled (boolean) from app.js
 *   - ensureAudioCtx() from app.js
 */

var SortingSafari = (function() {
  'use strict';

  // ── Storage keys ─────────────────────────────────────────────
  var LEVEL_KEY = 'PH_SORTING_LEVEL';
  var PLAYS_KEY = 'PH_SORTING_PLAYS';
  var BEST_KEY  = 'PH_SORTING_BEST';

  // ── Config ───────────────────────────────────────────────────
  var LEVEL_CONFIG = {
    1: { buckets: 2, items: 4 },
    2: { buckets: 2, items: 6 },
    3: { buckets: 3, items: 6 },
    4: { buckets: 3, items: 8 }
  };
  var MAX_LEVEL = 4;

  // Categories suitable for sorting (exclude abstract/seasonal)
  var SORTABLE_CATEGORIES = ['things', 'animals', 'food', 'shapes', 'colors', 'furniture', 'clothing'];

  // ── State ────────────────────────────────────────────────────
  var state = {
    active: false,
    level: 1,
    bucketCats: [],      // category objects used as buckets this round
    sortItems: [],       // items to sort
    currentIdx: 0,       // which item we're on
    sorted: 0,           // how many sorted correctly
    wrongAttempts: 0,    // total wrong taps this round
    totalItems: 0
  };

  var overlay = null;

  // ── Helpers ──────────────────────────────────────────────────

  function getLevel() {
    try { return parseInt(localStorage.getItem(LEVEL_KEY)) || 1; } catch(e) { return 1; }
  }
  function saveLevel(l) {
    try { localStorage.setItem(LEVEL_KEY, String(l)); } catch(e) {}
  }
  function getPlays() {
    try { return parseInt(localStorage.getItem(PLAYS_KEY)) || 0; } catch(e) { return 0; }
  }
  function savePlays(n) {
    try { localStorage.setItem(PLAYS_KEY, String(n)); } catch(e) {}
  }
  function getBest() {
    try { return parseInt(localStorage.getItem(BEST_KEY)) || 0; } catch(e) { return 0; }
  }
  function saveBest(n) {
    try { localStorage.setItem(BEST_KEY, String(n)); } catch(e) {}
  }

  function getCategories() {
    if (typeof CONTENT_PACKS !== 'undefined') return CONTENT_PACKS;
    if (typeof CATEGORIES !== 'undefined') return CATEGORIES;
    return [];
  }

  function getProgress() {
    if (typeof window.getProgress === 'function') return window.getProgress();
    // Fallback: read from localStorage directly
    try {
      return JSON.parse(localStorage.getItem('PH_PROGRESS') || '{}');
    } catch(e) { return {}; }
  }

  function speak(text, onEnd) {
    if (typeof window.speak === 'function') {
      window.speak(text, onEnd);
    } else if (typeof window.speechSynthesis !== 'undefined') {
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 0.85;
      u.pitch = 1.15;
      if (onEnd) u.onend = onEnd;
      window.speechSynthesis.speak(u);
    }
  }

  function playClick() {
    if (typeof window.playClick === 'function') window.playClick();
    else if (typeof window.ensureAudioCtx === 'function') { window.ensureAudioCtx(); if (typeof window.playTone === 'function') window.playTone(600, 0.05); }
  }

  function playSuccess() {
    if (typeof window.playSuccess === 'function') window.playSuccess();
    else if (typeof window.ensureAudioCtx === 'function') { window.ensureAudioCtx(); if (typeof window.playTone === 'function') { window.playTone(523, 0.1); setTimeout(function(){ window.playTone(659, 0.1); }, 100); setTimeout(function(){ window.playTone(784, 0.15); }, 200); } }
  }

  function playMiss() {
    if (typeof window.playMiss === 'function') window.playMiss();
    else if (typeof window.ensureAudioCtx === 'function') { window.ensureAudioCtx(); if (typeof window.playTone === 'function') window.playTone(200, 0.15); }
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Get categories the child has found at least 1 item in
  function getCategoriesWithProgress() {
    var cats = getCategories();
    var progress = getProgress();
    var result = [];
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i];
      if (SORTABLE_CATEGORIES.indexOf(c.id) === -1) continue;
      var catProgress = progress[c.id];
      if (catProgress && Object.keys(catProgress).length > 0) {
        // Has at least some found items
        var foundCount = 0;
        for (var key in catProgress) {
          if (catProgress[key]) foundCount++;
        }
        if (foundCount > 0) result.push(c);
      }
    }
    return result;
  }

  // Get found items for a category (from progress)
  function getFoundItems(cat) {
    var progress = getProgress();
    var catProgress = progress[cat.id] || {};
    var found = [];
    for (var i = 0; i < cat.items.length; i++) {
      var item = cat.items[i];
      if (catProgress[item.id] || catProgress[item.name]) {
        found.push({ item: item, cat: cat });
      }
    }
    return found;
  }

  // ── Build a round ────────────────────────────────────────────

  function buildRound() {
    var level = state.level;
    var config = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];
    var numBuckets = config.buckets;
    var numItems = config.items;

    // Get categories with progress
    var catsWithProgress = getCategoriesWithProgress();

    // If not enough categories with progress, fall back to all sortable cats
    if (catsWithProgress.length < numBuckets) {
      var allCats = getCategories().filter(function(c) {
        return SORTABLE_CATEGORIES.indexOf(c.id) !== -1;
      });
      catsWithProgress = allCats.length >= numBuckets ? allCats : allCats.concat(
        getCategories().filter(function(c) { return SORTABLE_CATEGORIES.indexOf(c.id) === -1; })
      );
    }

    // If still not enough, we can't play
    if (catsWithProgress.length < 2) {
      return false;
    }

    // Pick bucket categories
    state.bucketCats = shuffle(catsWithProgress).slice(0, numBuckets);

    // Collect found items from bucket categories
    var allItems = [];
    for (var i = 0; i < state.bucketCats.length; i++) {
      var found = getFoundItems(state.bucketCats[i]);
      // If no found items, use first few items from the category
      if (found.length === 0) {
        var cat = state.bucketCats[i];
        var items = cat.items.slice(0, Math.min(4, cat.items.length));
        for (var j = 0; j < items.length; j++) {
          allItems.push({ item: items[j], cat: cat });
        }
      } else {
        allItems = allItems.concat(found);
      }
    }

    // Shuffle and pick the right number of items
    // Try to balance across buckets
    var itemsPerBucket = Math.ceil(numItems / numBuckets);
    var selected = [];
    for (var b = 0; b < state.bucketCats.length; b++) {
      var bucketItems = allItems.filter(function(si) { return si.cat.id === state.bucketCats[b].id; });
      var shuffled = shuffle(bucketItems);
      selected = selected.concat(shuffled.slice(0, itemsPerBucket));
    }
    selected = shuffle(selected).slice(0, numItems);

    // If not enough items, just use what we have
    if (selected.length < 2) return false;

    state.sortItems = selected;
    state.totalItems = selected.length;
    state.currentIdx = 0;
    state.sorted = 0;
    state.wrongAttempts = 0;

    return true;
  }

  // ── UI Rendering ─────────────────────────────────────────────

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'sorting-safari-overlay';
    overlay.className = 'sorting-overlay';
    document.body.appendChild(overlay);
  }

  function removeOverlay() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    overlay = null;
  }

  function showIntro() {
    if (!overlay) return;
    var level = state.level;
    var config = LEVEL_CONFIG[level];

    overlay.innerHTML =
      '<div class="sorting-screen sorting-intro">' +
        '<div class="sorting-title">🧩 Sorting Safari!</div>' +
        '<div class="sorting-subtitle">Put things in the right group!</div>' +
        '<div class="sorting-level-badge">Level ' + level + '</div>' +
        '<div class="sorting-bucket-preview">' +
          state.bucketCats.map(function(c) {
            return '<div class="sorting-preview-bucket" style="background:' + c.color + '">' +
              c.emoji + ' ' + c.name +
            '</div>';
          }).join('') +
        '</div>' +
        '<button class="sorting-btn sorting-start-btn" id="sorting-start">Let\'s Sort! 🧩</button>' +
        '<button class="sorting-btn sorting-back-btn" id="sorting-back">← Back</button>' +
      '</div>';

    document.getElementById('sorting-start').addEventListener('click', function() {
      playClick();
      showSortScreen();
    });
    document.getElementById('sorting-back').addEventListener('click', function() {
      playClick();
      exitSafari();
    });

    speak("Sorting Safari! Put things in the right group!");
  }

  function showSortScreen() {
    if (!overlay) return;
    if (state.currentIdx >= state.sortItems.length) {
      showVictory();
      return;
    }

    var si = state.sortItems[state.currentIdx];
    var item = si.item;
    var correctCat = si.cat;

    overlay.innerHTML =
      '<div class="sorting-screen sorting-game">' +
        '<div class="sorting-progress">' +
          '<span class="sorting-count">' + (state.currentIdx + 1) + ' / ' + state.sortItems.length + '</span>' +
          '<div class="sorting-progress-bar"><div class="sorting-progress-fill" style="width:' + (state.sorted / state.totalItems * 100) + '%"></div></div>' +
        '</div>' +
        '<div class="sorting-item-display">' +
          '<div class="sorting-item-emoji">' + item.emoji + '</div>' +
          '<div class="sorting-item-name">' + item.name + '</div>' +
        '</div>' +
        '<div class="sorting-question">Where does this go?</div>' +
        '<div class="sorting-buckets">' +
          state.bucketCats.map(function(c, idx) {
            return '<button class="sorting-bucket-btn" data-cat-id="' + c.id + '" style="background:' + c.color + ';border-color:' + c.color + '">' +
              '<span class="sorting-bucket-emoji">' + c.emoji + '</span>' +
              '<span class="sorting-bucket-name">' + c.name + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<button class="sorting-btn sorting-quit-btn" id="sorting-quit">← Quit</button>' +
      '</div>';

    // Wire up bucket taps
    var buckets = overlay.querySelectorAll('.sorting-bucket-btn');
    for (var i = 0; i < buckets.length; i++) {
      buckets[i].addEventListener('click', handleBucketTap);
    }
    document.getElementById('sorting-quit').addEventListener('click', function() {
      playClick();
      exitSafari();
    });

    // Speak the prompt
    speak("Where does the " + item.name.toLowerCase() + " go?");
  }

  function handleBucketTap(e) {
    var btn = e.currentTarget;
    var tappedCatId = btn.getAttribute('data-cat-id');
    var si = state.sortItems[state.currentIdx];

    if (tappedCatId === si.cat.id) {
      // CORRECT!
      btn.classList.add('sorting-bucket-correct');
      state.sorted++;
      playSuccess();

      var itemName = si.item.name.toLowerCase();
      var catName = si.cat.name.toLowerCase();
      speak("Yes! A " + itemName + " is " + (catName.match(/^[aeiou]/i) ? "an " : "") + catName + "!", function() {
        state.currentIdx++;
        setTimeout(function() {
          showSortScreen();
        }, 400);
      });
    } else {
      // WRONG — gentle nudge
      btn.classList.add('sorting-bucket-wrong');
      state.wrongAttempts++;
      playMiss();

      // Remove the shake animation after it plays
      setTimeout(function() { btn.classList.remove('sorting-bucket-wrong'); }, 500);

      var catName = si.cat.name.toLowerCase();
      speak("Hmm, that's " + (catName.match(/^[aeiou]/i) ? "an " : "") + catName + "! Try again!");
    }
  }

  function showVictory() {
    if (!overlay) return;
    var perfect = state.wrongAttempts === 0;
    var level = state.level;

    // Level up if perfect or low errors
    if (perfect && level < MAX_LEVEL) {
      level = level + 1;
      saveLevel(level);
    }

    // Track plays
    var plays = getPlays() + 1;
    savePlays(plays);
    var best = getBest();
    if (state.sorted > best) saveBest(state.sorted);

    // Record progress for sorted items (so sticker book picks them up)
    if (typeof window.recordProgress === 'function') {
      for (var i = 0; i < state.sortItems.length; i++) {
        var si = state.sortItems[i];
        window.recordProgress(si.cat.id, si.item.id || si.item.name);
      }
    }

    overlay.innerHTML =
      '<div class="sorting-screen sorting-victory">' +
        '<div class="sorting-victory-title">🎉 Great Sorting!</div>' +
        '<div class="sorting-victory-emoji">🧩</div>' +
        '<div class="sorting-victory-stats">' +
          '<div class="sorting-stat">' + state.sorted + ' items sorted!</div>' +
          (perfect ? '<div class="sorting-stat-perfect">⭐ Perfect! No mistakes!</div>' : '') +
          (state.wrongAttempts > 0 ? '<div class="sorting-stat-ok">Only ' + state.wrongAttempts + ' little mix-ups!</div>' : '') +
        '</div>' +
        (level > state.level ? '<div class="sorting-level-up">🌟 Level Up! Level ' + level + '!</div>' : '') +
        '<div class="sorting-victory-items">' +
          state.sortItems.map(function(si) {
            return '<span class="sorting-victory-item" title="' + si.item.name + ' → ' + si.cat.name + '">' +
              si.item.emoji +
            '</span>';
          }).join('') +
        '</div>' +
        '<button class="sorting-btn sorting-again-btn" id="sorting-again">Play Again! 🧩</button>' +
        '<button class="sorting-btn sorting-back-btn" id="sorting-done">← Done</button>' +
      '</div>';

    document.getElementById('sorting-again').addEventListener('click', function() {
      playClick();
      state.level = getLevel();
      if (buildRound()) {
        showIntro();
      } else {
        showNeedMore();
      }
    });
    document.getElementById('sorting-done').addEventListener('click', function() {
      playClick();
      exitSafari();
    });

    playSuccess();
    setTimeout(function() { playSuccess(); }, 300);
    speak("Great sorting! You put everything in the right group!");
  }

  function showNeedMore() {
    if (!overlay) return;
    overlay.innerHTML =
      '<div class="sorting-screen sorting-need-more">' +
        '<div class="sorting-title">🧩 More to Find!</div>' +
        '<div class="sorting-subtitle">Find more things in regular hunts first, then come sort them!</div>' +
        '<button class="sorting-btn sorting-back-btn" id="sorting-ok">OK!</button>' +
      '</div>';

    document.getElementById('sorting-ok').addEventListener('click', function() {
      playClick();
      exitSafari();
    });

    speak("Find more things first, then come sort them!");
  }

  // ── Public API ───────────────────────────────────────────────

  function start() {
    state.level = getLevel();
    state.active = true;
    createOverlay();

    if (!buildRound()) {
      showNeedMore();
      return;
    }

    showIntro();
  }

  function exitSafari() {
    state.active = false;
    removeOverlay();
  }

  function addButtonToSplash() {
    var splash = document.getElementById('screen-splash') || document.querySelector('.splash-screen');
    if (!splash) return;

    // Check if button already exists
    if (document.getElementById('sorting-safari-btn')) return;

    // Find a good spot — after daily challenge, before other buttons
    var container = splash.querySelector('.category-buttons') || splash.querySelector('.game-modes') || splash;

    var btn = document.createElement('button');
    btn.id = 'sorting-safari-btn';
    btn.className = 'sorting-splash-btn';
    btn.innerHTML = '🧩<span>Sorting Safari</span>';
    btn.addEventListener('click', function() {
      playClick();
      start();
    });

    // Try to insert after daily challenge button if it exists
    var dailyBtn = document.getElementById('daily-challenge-btn') || document.querySelector('[data-mode="daily"]');
    if (dailyBtn && dailyBtn.nextSibling) {
      dailyBtn.parentNode.insertBefore(btn, dailyBtn.nextSibling);
    } else if (dailyBtn) {
      dailyBtn.parentNode.appendChild(btn);
    } else {
      container.appendChild(btn);
    }
  }

  function isActive() {
    return state.active;
  }

  return {
    start: start,
    addButtonToSplash: addButtonToSplash,
    isActive: isActive
  };

})();
