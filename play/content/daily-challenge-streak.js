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
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch(e) { return {}; }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ═══════════════════════════════════════════════════════════════
  // DATE HELPERS
  // ═══════════════════════════════════════════════════════════════
  function todayStr() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  function yesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
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
      saveData(data);
      return data;
    }

    // Already updated today
    if (data.lastDate === today) {
      return data;
    }

    // Check if streak should continue or break
    var gap = daysBetween(data.lastDate, today);

    if (gap === 1) {
      // Yesterday was the last activity — streak continues if today is completed
      // Don't increment yet, just mark today as not done
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
    } else if (daysBetween(data.lastDate, today) === 2 && data.freezes >= 0) {
      // Used a freeze (already decremented in checkAndUpdateStreak)
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
    if (typeof CATEGORIES === 'undefined') return null;

    // Simple hash of date for deterministic selection
    var today = todayStr();
    var hash = 0;
    for (var i = 0; i < today.length; i++) {
      hash = ((hash << 5) - hash) + today.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit int
    }

    // Flatten all items across all categories
    var allItems = [];
    if (typeof CATEGORY_ORDER !== 'undefined') {
      CATEGORY_ORDER.forEach(function(catId) {
        var cat = CATEGORIES[catId];
        if (cat && cat.items) {
          cat.items.forEach(function(item) {
            allItems.push({ catId: catId, item: item, cat: cat });
          });
        }
      });
    }

    if (allItems.length === 0) return null;

    // Pick item based on hash (same item all day)
    var idx = Math.abs(hash) % allItems.length;
    return allItems[idx];
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
      speak(milestone + ' day streak! Amazing!');
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
        // Route through playCategory so the paywall + daily-cap gate applies — a
        // date-seeded daily item often lands in a premium category.
        if (typeof playCategory === 'function') {
          playCategory(daily.catId);
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
