// ============================================================
// Picture Hunt — Daily Challenge with Streak 🔥📅
// One curated item per day. Streak counter with freeze.
// Works WITH the Sticker Book (both reinforce daily engagement).
// ============================================================
//
// HOW IT WORKS:
// - Each day, one item is chosen (seeded by date for consistency)
// - Kid finds the item, earns a streak day
// - Streak counter shows on splash screen
// - Miss a day? Streak freezes let you keep it (1 free freeze per week)
// - Streak milestones: badges at 3, 7, 14, 30 days
// - Daily challenge item shows as a special card on the splash
//
// STORAGE:
// - PH_DAILY in localStorage
// - { streak: N, lastDate: "YYYY-MM-DD", freezes: N, badges: [...] }
//
// INTEGRATION:
// 1. Add <script src="content/daily-challenge-streak.js?v=63"></script>
// 2. Call DailyStreak.init() in DOMContentLoaded
// 3. Call DailyStreak.addCardToSplash() after renderSplash()
// 4. Call DailyStreak.onItemFound(catId, itemName) when an item is found
// 5. Add daily-challenge-streak.css to index.html <head>
// ============================================================

var DailyStreak = (function() {

  var STORAGE_KEY = 'PH_DAILY';
  var STREAK_MILESTONES = [3, 7, 14, 30];
  var FREEZES_PER_WEEK = 1;

  // Respect per-item speakOverride so mass/proper nouns read correctly
  // ("Can you find bread?" not "a bread"). Falls back to "Can you find a X?".
  function dailyPromptText(item) {
    if (item && item.speakOverride) return item.speakOverride;
    var n = item ? item.name : '';
    return 'Can you find ' + (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n + '?';
  }

  // ═══════════════════════════════════════════════════════════════
  // STORAGE
  // ═══════════════════════════════════════════════════════════════
  function getData() {
    var data;
    try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch(e) { data = {}; }
    if (!data || typeof data !== 'object') data = {};
    // Normalize the shape so the streak logic never crashes on partial, migrated,
    // or cross-version sync data (e.g. completeToday's data.badges.indexOf threw
    // when badges was absent). Missing fields get safe defaults.
    if (typeof data.streak !== 'number') data.streak = 0;
    if (!Array.isArray(data.badges)) data.badges = [];
    if (typeof data.freezes !== 'number') data.freezes = FREEZES_PER_WEEK;
    if (typeof data.todayDone !== 'boolean') data.todayDone = false;
    return data;
  }

  function saveData(data) {
    // Storage-safe: setItem throws in private/quota-full/storage-disabled contexts.
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
  }

  // ═══════════════════════════════════════════════════════════════
  // DATE HELPERS
  // ═══════════════════════════════════════════════════════════════
  // Use the LOCAL calendar day, not UTC. toISOString() is UTC, so in US time
  // zones the "day" flipped at 5-8pm local — an evening find could log under
  // tomorrow's date (silently breaking the streak) and the daily item visibly
  // changed mid-evening. localDateStr keeps the boundary at the child's midnight.
  function localDateStr(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function todayStr() {
    return localDateStr(new Date());
  }

  function yesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return localDateStr(d);
  }

  function daysBetween(dateStr1, dateStr2) {
    var d1 = new Date(dateStr1);
    var d2 = new Date(dateStr2);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  // ═══════════════════════════════════════════════════════════════
  // STREAK LOGIC
  // ═══════════════════════════════════════════════════════════════
  function checkAndUpdateStreak() {
    var data = getData();
    var today = todayStr();
    var yesterday = yesterdayStr();

    if (!data.lastDate) {
      // First time ever
      data.streak = 0;
      data.lastDate = null;
      data.freezes = FREEZES_PER_WEEK;
      data.badges = [];
      data.todayDone = false;
      data.lastFreezeRefill = today; // seed so the first miss doesn't trigger an instant refill
      data.lastCheck = today;
      saveData(data);
      return data;
    }

    // IDEMPOTENCY GUARD: evaluate the gap at most once per calendar day. This
    // function runs several times per page load (startup init + every renderSplash
    // re-render), and the gap===2 branch decremented a freeze on EVERY call without
    // advancing lastDate — so a single missed day burned ALL freezes across the
    // repeated calls and then broke the streak. lastCheck makes the evaluation
    // happen once per day regardless of how many times it's called.
    if (data.lastCheck === today) {
      return data;
    }

    // Already completed today — nothing to evaluate, just mark today's check done.
    if (data.lastDate === today) {
      data.lastCheck = today;
      saveData(data);
      return data;
    }

    // Check if streak should continue or break
    var gap = daysBetween(data.lastDate, today);

    if (gap <= 1) {
      // gap === 1: yesterday was the last activity — streak continues if today is
      // completed (don't increment yet). gap < 1: the device clock moved backward
      // (or timezone travel) — do NOT penalize an innocent child by wiping the
      // streak; just wait for today's completion.
      data.todayDone = false;
    } else if (gap === 2) {
      // Missed one day — try to use a freeze
      if (data.freezes > 0) {
        data.freezes--;
        data.todayDone = false;
        // Streak preserved (didn't reset)
      } else {
        // No freeze available — streak breaks
        data.streak = 0;
        data.todayDone = false;
        data.badges = []; // lose badges on streak break
      }
    } else {
      // Missed multiple days — streak breaks
      data.streak = 0;
      data.todayDone = false;
      data.badges = [];
    }

    // Refill freezes weekly
    if (!data.lastFreezeRefill || daysBetween(data.lastFreezeRefill, today) >= 7) {
      data.freezes = FREEZES_PER_WEEK;
      data.lastFreezeRefill = today;
    }

    data.lastCheck = today;
    saveData(data);
    return data;
  }

  function completeToday() {
    var data = getData();
    if (data.todayDone) return data; // already done

    var today = todayStr();

    if (data.lastDate === today) {
      // Already counted
      return data;
    }

    if (data.lastDate === yesterdayStr() || !data.lastDate) {
      // Continuing streak or first ever
      data.streak++;
    } else if (daysBetween(data.lastDate, today) === 2) {
      // Gap of one day: either a freeze preserved the streak (already decremented in
      // checkAndUpdateStreak) or it was reset to 0 there; either way we advance/seed
      // here. (Dropped the always-true `data.freezes >= 0` guard — freezes never goes
      // negative, so it was dead/misleading.)
      data.streak++;
    }
    // else: streak was already reset to 0 in checkAndUpdateStreak, start fresh
    // Actually if streak was 0 and they complete today, start at 1
    if (data.streak === 0) data.streak = 1;

    data.lastDate = today;
    data.todayDone = true;

    // Check for milestone badges
    STREAK_MILESTONES.forEach(function(m) {
      if (data.streak >= m && data.badges.indexOf(m) === -1) {
        data.badges.push(m);
        // Show badge notification
        showBadgeNotification(m);
      }
    });

    saveData(data);
    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // DAILY ITEM SELECTION — seeded by date for consistency
  // ═══════════════════════════════════════════════════════════════
  function getDailyItem() {
    if (typeof CATEGORIES === 'undefined' || typeof CATEGORY_ORDER === 'undefined') return null;

    // Build the pool of ELIGIBLE categories before picking:
    //   1. In-season only — so the daily challenge never demands an out-of-season
    //      item (e.g. "find Santa" in June), which is impossible and silently
    //      burns the streak.
    //   2. Free users → free categories only — otherwise a date-seeded item lands
    //      in a premium category ~60% of days and the daily card routes straight
    //      into the paywall, so a free family can never keep the streak.
    var order = CATEGORY_ORDER.slice();
    if (typeof SeasonalManager !== 'undefined' && SeasonalManager.filterVisibleCategories) {
      order = SeasonalManager.filterVisibleCategories(order);
    }
    if (typeof Paywall !== 'undefined' && Paywall.isPremium && !Paywall.isPremium() && Paywall.isFreeCategory) {
      var freeOnly = order.filter(function(catId) { return Paywall.isFreeCategory(catId); });
      if (freeOnly.length) order = freeOnly;
    }

    function flatten(cats) {
      var out = [];
      cats.forEach(function(catId) {
        var cat = CATEGORIES[catId];
        if (cat && cat.items) cat.items.forEach(function(item) { out.push({ catId: catId, item: item, cat: cat }); });
      });
      return out;
    }
    var allItems = flatten(order);
    // Safety net: never return null just because filtering emptied the pool.
    if (allItems.length === 0) allItems = flatten(CATEGORY_ORDER);
    if (allItems.length === 0) return null;

    // Deterministic date-seeded pick — same item all day for a given tier/season.
    var today = todayStr();
    var hash = 0;
    for (var i = 0; i < today.length; i++) {
      hash = ((hash << 5) - hash) + today.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit int
    }
    return allItems[Math.abs(hash) % allItems.length];
  }

  // ═══════════════════════════════════════════════════════════════
  // BADGE NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════
  function showBadgeNotification(milestone) {
    var el = document.createElement('div');
    el.className = 'streak-badge-popup';
    var emoji = milestone >= 30 ? '👑' : milestone >= 14 ? '🔥' : milestone >= 7 ? '⭐' : '🌟';
    el.innerHTML = '<div class="streak-badge-emoji">' + emoji + '</div>'
      + '<div class="streak-badge-text">' + milestone + ' Day Streak!</div>';
    document.body.appendChild(el);
    setTimeout(function() { el.remove(); }, 3000);

    if (typeof speak === 'function') {
      // The milestone is reached DURING a find, so "You found it!" + the bilingual
      // echo are about to play on the single audio channel and would cut this off
      // (it fired immediately before). Wait until the channel is actually free, then
      // speak — robust across bilingual (longer) and non-bilingual (shorter) timing.
      var tries = 0;
      var sayMilestone = function() {
        if (typeof currentAudioSource !== 'undefined' && currentAudioSource && tries < 24) {
          tries++; setTimeout(sayMilestone, 500); return;
        }
        speak('Amazing! What a streak! Keep it up!');
      };
      setTimeout(sayMilestone, 1500); // let "You found it!" start first, then poll for silence
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SPLASH SCREEN — daily challenge card
  // ═══════════════════════════════════════════════════════════════
  function addCardToSplash() {
    var grid = document.getElementById('category-grid');
    if (!grid || document.getElementById('daily-challenge-card')) return;

    var data = checkAndUpdateStreak();
    var daily = getDailyItem();
    if (!daily) return;

    var card = document.createElement('div');
    card.id = 'daily-challenge-card';
    card.className = 'daily-challenge-card';

    var streakEmoji = data.streak >= 14 ? '🔥🔥' : data.streak >= 7 ? '🔥' : data.streak >= 3 ? '🌟' : '📅';

    var statusHtml = data.todayDone
      ? '<div class="daily-status done">✅ Done!</div>'
      : '<div class="daily-status pending">Find this today!</div>';

    card.innerHTML = '<div class="daily-header">'
      + '<span class="daily-label">' + streakEmoji + ' Daily Challenge</span>'
      + '<span class="daily-streak">🔥 ' + data.streak + '</span>'
      + '</div>'
      + '<div class="daily-item">'
      + (daily.item.img
          ? '<img src="' + daily.item.img + '" class="daily-img" alt="">'
          : '<span class="daily-emoji">' + daily.item.emoji + '</span>')
      + '<span class="daily-name">' + (daily.item.name.charAt(0).toUpperCase() + daily.item.name.slice(1)) + '</span>'
      + '</div>'
      + statusHtml;

    if (!data.todayDone) {
      card.onclick = function() {
        if (typeof playClick === 'function') playClick();
        // Route through playCategory. Free users now only ever get a daily item
        // from a free category (see getDailyItem), so this no longer dead-ends in
        // the locked-category paywall. allowOverCap keeps the daily challenge
        // playable even past the 5/day cap so the streak is always keepable.
        if (typeof playCategory === 'function') {
          playCategory(daily.catId, { allowOverCap: true, forceItem: daily.item.name });
        } else if (typeof startNewGame === 'function') {
          startNewGame(daily.catId);
        }
      };
      card.style.cursor = 'pointer';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', 'Daily challenge: ' + dailyPromptText(daily.item));
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.onclick(); }
      });
    }

    grid.insertBefore(card, grid.firstChild);
  }

  // ═══════════════════════════════════════════════════════════════
  // ON ITEM FOUND — check if it matches the daily challenge
  // ═══════════════════════════════════════════════════════════════
  function onItemFound(catId, itemName) {
    var data = getData();
    if (data.todayDone) return; // already done today

    var daily = getDailyItem();
    if (!daily) return;

    // Check if the found item matches the daily challenge
    if (daily.catId === catId && daily.item.name === itemName) {
      var updatedData = completeToday();
      // Update the card on splash if visible
      var card = document.getElementById('daily-challenge-card');
      if (card) {
        var statusEl = card.querySelector('.daily-status');
        if (statusEl) {
          statusEl.className = 'daily-status done';
          statusEl.textContent = '✅ Done!';
        }
        // Also refresh the streak count + header emoji — completeToday() just bumped
        // the streak, but only the status text was updated, so the card showed a
        // stale "🔥 N" until the next full re-render.
        var streakEl = card.querySelector('.daily-streak');
        if (streakEl) streakEl.textContent = '🔥 ' + updatedData.streak;
        var labelEl = card.querySelector('.daily-label');
        if (labelEl) {
          var em = updatedData.streak >= 14 ? '🔥🔥' : updatedData.streak >= 7 ? '🔥' : updatedData.streak >= 3 ? '🌟' : '📅';
          labelEl.textContent = em + ' Daily Challenge';
        }
        card.onclick = null;
        card.style.cursor = 'default';
      }
      // Play streak celebration if applicable
      if (updatedData.streak > 1 && typeof playRichStreak === 'function') {
        setTimeout(playRichStreak, 1200);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════
  function init() {
    checkAndUpdateStreak();
    console.log('[DailyStreak] Initialized — streak: ' + getData().streak + ', today: ' + (getData().todayDone ? 'done' : 'pending'));
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    init: init,
    addCardToSplash: addCardToSplash,
    onItemFound: onItemFound,
    getData: getData,
    getDailyItem: getDailyItem,
    getStreak: function() { return getData().streak; },
    isDoneToday: function() { return getData().todayDone; }
  };

})();
