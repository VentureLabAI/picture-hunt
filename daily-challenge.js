// ============================================================
// Picture Hunt — Daily Challenge Module (Drop-in)
// ============================================================
// A daily challenge gives kids ONE special item to find each day.
// Completing it earns a streak counter and special celebration.
// 
// INTEGRATION:
//   1. Add <script src="daily-challenge.js"></script> before </body>
//   2. Call DailyChallenge.init() after DOM ready
//   3. Add the challenge button to splash screen (see integration guide)
//   4. Requires: CATEGORIES object from app.js, playSound(), showConfetti()
// ============================================================

var DailyChallenge = (function() {
  'use strict';

  // Storage keys
  var STORAGE_KEY = 'PH_DAILY_CHALLENGE';
  var STREAK_KEY = 'PH_DAILY_STREAK';

  // All possible challenge items drawn from every category
  function getAllItems() {
    var items = [];
    if (typeof CATEGORIES === 'undefined') return items;
    var order = typeof CATEGORY_ORDER !== 'undefined' 
      ? CATEGORY_ORDER 
      : Object.keys(CATEGORIES);
    order.forEach(function(catId) {
      var cat = CATEGORIES[catId];
      if (!cat || !cat.items) return;
      cat.items.forEach(function(item) {
        items.push({
          name: item.name,
          emoji: item.emoji,
          img: item.img || null,
          categoryId: catId,
          categoryName: cat.name,
          categoryEmoji: cat.emoji
        });
      });
    });
    return items;
  }

  // Generate a deterministic "random" index from a date string (YYYY-MM-DD)
  // Uses a simple hash so every user gets the same challenge on the same day
  function dateHash(dateStr) {
    var hash = 0;
    for (var i = 0; i < dateStr.length; i++) {
      hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit int
    }
    return Math.abs(hash);
  }

  function getTodayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function getYesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  // Get today's challenge item
  function getTodaysChallenge() {
    var items = getAllItems();
    if (items.length === 0) return null;
    var today = getTodayStr();
    var idx = dateHash(today) % items.length;
    return {
      date: today,
      item: items[idx]
    };
  }

  // Load saved challenge state
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Save challenge state
  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  // Load streak data
  function loadStreak() {
    try {
      var raw = localStorage.getItem(STREAK_KEY);
      return raw ? JSON.parse(raw) : { current: 0, best: 0, lastCompleted: null };
    } catch (e) {
      return { current: 0, best: 0, lastCompleted: null };
    }
  }

  // Save streak data
  function saveStreak(streak) {
    try {
      localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
    } catch (e) {}
  }

  // Check if today's challenge is already completed
  function isTodayCompleted() {
    var state = loadState();
    return state && state.date === getTodayStr() && state.completed === true;
  }

  // Mark today's challenge as completed and update streak
  function completeChallenge() {
    var today = getTodayStr();
    var yesterday = getYesterdayStr();
    
    // Save completion
    saveState({ date: today, completed: true, completedAt: new Date().toISOString() });
    
    // Update streak
    var streak = loadStreak();
    if (streak.lastCompleted === yesterday) {
      // Continuing streak
      streak.current += 1;
    } else if (streak.lastCompleted === today) {
      // Already counted today, no change
    } else {
      // Streak broken or first challenge
      streak.current = 1;
    }
    if (streak.current > streak.best) {
      streak.best = streak.current;
    }
    streak.lastCompleted = today;
    saveStreak(streak);
    
    return streak;
  }

  // Get streak emoji based on length
  function getStreakEmoji(count) {
    if (count >= 30) return '👑';
    if (count >= 14) return '🏆';
    if (count >= 7) return '⭐';
    if (count >= 3) return '🔥';
    return '✨';
  }

  // Build the Daily Challenge splash card HTML
  function renderChallengeCard() {
    var challenge = getTodaysChallenge();
    if (!challenge) return '';
    
    var completed = isTodayCompleted();
    var streak = loadStreak();
    var item = challenge.item;
    
    // Determine visual for the item
    var visual = item.img 
      ? '<img src="' + item.img + '" style="width:80px;height:80px;object-fit:contain;" alt="' + item.name + '">'
      : '<span style="font-size:4rem;">' + item.emoji + '</span>';
    
    var streakDisplay = streak.current > 0
      ? '<div style="font-size:1.1rem;margin-top:8px;color:rgba(255,255,255,0.8);">'
        + getStreakEmoji(streak.current) + ' ' + streak.current + ' day streak!'
        + (streak.best > streak.current ? ' (Best: ' + streak.best + ')' : '')
        + '</div>'
      : '';
    
    if (completed) {
      return '<div class="daily-challenge-card daily-challenge-done" style="'
        + 'background:linear-gradient(135deg, #2d8a4e 0%, #1a5c32 100%);'
        + 'border-radius:20px;padding:20px;margin:12px 0;text-align:center;'
        + 'border:3px solid #4ade80;position:relative;overflow:hidden;">'
        + '<div style="font-size:1.3rem;font-weight:bold;color:#4ade80;">✅ Challenge Complete!</div>'
        + '<div style="margin:10px 0;">' + visual + '</div>'
        + '<div style="font-size:1.1rem;color:white;">You found the ' + item.name + '!</div>'
        + streakDisplay
        + '<div style="font-size:0.9rem;margin-top:8px;color:rgba(255,255,255,0.5);">Come back tomorrow for a new challenge!</div>'
        + '</div>';
    }
    
    return '<div class="daily-challenge-card" style="'
      + 'background:linear-gradient(135deg, #1a1a3e 0%, #2d1b69 100%);'
      + 'border-radius:20px;padding:20px;margin:12px 0;text-align:center;'
      + 'border:3px solid #fbbf24;position:relative;overflow:hidden;cursor:pointer;" '
      + 'onclick="DailyChallenge.startChallenge()">'
      + '<div style="position:absolute;top:-5px;right:-5px;background:#fbbf24;color:#1a1a3e;'
      + 'padding:4px 14px;border-radius:0 16px 0 16px;font-weight:bold;font-size:0.85rem;">TODAY</div>'
      + '<div style="font-size:1.3rem;font-weight:bold;color:#fbbf24;">⚡ Daily Challenge</div>'
      + '<div style="margin:10px 0;">' + visual + '</div>'
      + '<div style="font-size:1.4rem;font-weight:bold;color:white;">Find a ' + item.name + '!</div>'
      + '<div style="font-size:0.95rem;margin-top:4px;color:rgba(255,255,255,0.6);">'
      + item.categoryEmoji + ' from ' + item.categoryName + '</div>'
      + streakDisplay
      + '<div style="margin-top:12px;">'
      + '<span style="background:#fbbf24;color:#1a1a3e;padding:10px 28px;border-radius:30px;'
      + 'font-size:1.1rem;font-weight:bold;display:inline-block;">📸 Let\'s Go!</span>'
      + '</div>'
      + '</div>';
  }

  // Start the daily challenge — opens camera for the specific item
  function startChallenge() {
    var challenge = getTodaysChallenge();
    if (!challenge || isTodayCompleted()) return;
    
    // Store that we're in challenge mode so the result handler knows
    window._dailyChallengeActive = true;
    window._dailyChallengeItem = challenge.item;
    
    // Use the app's existing camera flow
    // Set category and item, then trigger camera
    var cat = CATEGORIES[challenge.item.categoryId];
    if (!cat) return;
    
    // Find the item index in the category
    var itemIdx = -1;
    for (var i = 0; i < cat.items.length; i++) {
      if (cat.items[i].name === challenge.item.name) {
        itemIdx = i;
        break;
      }
    }
    if (itemIdx === -1) return;
    
    // Set game state to this specific category and item
    if (typeof currentCategory !== 'undefined') {
      window.currentCategory = challenge.item.categoryId;
    }
    
    // Show a special challenge prompt screen
    showChallengePrompt(challenge.item);
  }

  // Show the challenge prompt (item to find) with camera button
  function showChallengePrompt(item) {
    var visual = item.img
      ? '<img src="' + item.img + '" style="width:120px;height:120px;object-fit:contain;" alt="' + item.name + '">'
      : '<span style="font-size:6rem;">' + item.emoji + '</span>';
    
    // Create overlay
    var overlay = document.createElement('div');
    overlay.id = 'daily-challenge-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;'
      + 'background:linear-gradient(135deg, #1a1a3e 0%, #2d1b69 80%, #4a1d96 100%);'
      + 'z-index:9999;display:flex;flex-direction:column;align-items:center;'
      + 'justify-content:center;padding:20px;box-sizing:border-box;';
    
    overlay.innerHTML = 
      '<div style="font-size:1.5rem;color:#fbbf24;font-weight:bold;margin-bottom:10px;">⚡ Daily Challenge ⚡</div>'
      + '<div style="margin:20px 0;">' + visual + '</div>'
      + '<div style="font-size:2rem;color:white;font-weight:bold;margin-bottom:8px;">Find a ' + item.name + '!</div>'
      + '<div style="font-size:1rem;color:rgba(255,255,255,0.6);margin-bottom:30px;">'
      + 'Look around and take a photo when you find one</div>'
      + '<button onclick="DailyChallenge.openCamera()" style="'
      + 'background:#fbbf24;color:#1a1a3e;border:none;padding:18px 50px;'
      + 'border-radius:30px;font-size:1.3rem;font-weight:bold;cursor:pointer;'
      + 'min-height:70px;min-width:200px;">📸 Take Photo</button>'
      + '<button onclick="DailyChallenge.cancelChallenge()" style="'
      + 'background:transparent;color:rgba(255,255,255,0.5);border:2px solid rgba(255,255,255,0.2);'
      + 'padding:12px 30px;border-radius:30px;font-size:1rem;cursor:pointer;'
      + 'margin-top:15px;">← Back</button>';
    
    document.body.appendChild(overlay);
    
    // Speak the prompt
    if (typeof speak === 'function') {
      speak('Daily challenge! Can you find a ' + item.name + '?');
    }
  }

  // Open camera input for challenge
  function openCamera() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      handleChallengePhoto(file);
      document.body.removeChild(input);
    };
    
    document.body.appendChild(input);
    input.click();
  }

  // Handle the photo taken for the challenge
  function handleChallengePhoto(file) {
    var challenge = getTodaysChallenge();
    if (!challenge) return;
    var item = challenge.item;
    var cat = CATEGORIES[item.categoryId];
    if (!cat) return;

    // Show loading state
    var overlay = document.getElementById('daily-challenge-overlay');
    if (overlay) {
      overlay.innerHTML = 
        '<div style="font-size:3rem;margin-bottom:20px;">🔍</div>'
        + '<div style="font-size:1.5rem;color:white;font-weight:bold;">Checking...</div>'
        + '<div style="font-size:1rem;color:rgba(255,255,255,0.6);margin-top:10px;">Is that a ' + item.name + '?</div>';
    }

    // Convert file to base64
    var reader = new FileReader();
    reader.onload = function(e) {
      var base64 = e.target.result.split(',')[1];
      var prompt = cat.aiPrompt(item.name);
      
      // Call Gemini API (reuse app's existing method or call directly)
      callGeminiForChallenge(base64, prompt, item);
    };
    reader.readAsDataURL(file);
  }

  // Call Gemini API for challenge verification
  function callGeminiForChallenge(base64Image, prompt, item) {
    var url;
    var headers = { 'Content-Type': 'application/json' };
    
    if (typeof PROXY_URL !== 'undefined' && PROXY_URL) {
      url = PROXY_URL;
    } else {
      var key = localStorage.getItem('PH_KEY') || '';
      url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + key;
    }

    var body = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
        ]
      }],
      generationConfig: { temperature: 0 }
    };

    fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var text = '';
      try {
        text = data.candidates[0].content.parts[0].text;
      } catch (e) {
        text = 'Error';
      }
      
      var firstLine = text.split('\n')[0].trim().toLowerCase();
      var isMatch = firstLine.indexOf('yes') !== -1;
      
      showChallengeResult(isMatch, item, text);
    })
    .catch(function(err) {
      showChallengeResult(false, item, 'Error: ' + err.message);
    });
  }

  // Show result of challenge attempt
  function showChallengeResult(success, item, aiResponse) {
    var overlay = document.getElementById('daily-challenge-overlay');
    if (!overlay) return;

    if (success) {
      // Challenge completed!
      var streak = completeChallenge();
      
      overlay.innerHTML = 
        '<div style="font-size:5rem;margin-bottom:10px;">🎉</div>'
        + '<div style="font-size:2rem;color:#4ade80;font-weight:bold;margin-bottom:10px;">Amazing!</div>'
        + '<div style="font-size:1.3rem;color:white;">You found the ' + item.name + '! ' + item.emoji + '</div>'
        + '<div style="font-size:1.5rem;margin-top:20px;color:#fbbf24;">'
        + getStreakEmoji(streak.current) + ' ' + streak.current + ' day streak!</div>'
        + (streak.current === streak.best && streak.current > 1
          ? '<div style="font-size:1rem;color:#fbbf24;margin-top:5px;">🏅 New record!</div>' : '')
        + '<button onclick="DailyChallenge.closeChallengeOverlay()" style="'
        + 'background:#4ade80;color:#1a1a3e;border:none;padding:18px 50px;'
        + 'border-radius:30px;font-size:1.3rem;font-weight:bold;cursor:pointer;'
        + 'margin-top:30px;min-height:60px;">🏠 Back Home</button>';
      
      // Celebration effects
      if (typeof showConfetti === 'function') showConfetti();
      if (typeof playSound === 'function') playSound('victory');
      if (typeof speak === 'function') {
        speak('Wow! You found the ' + item.name + '! Great job!');
      }
    } else {
      overlay.innerHTML = 
        '<div style="font-size:4rem;margin-bottom:10px;">🤔</div>'
        + '<div style="font-size:1.5rem;color:#fbbf24;font-weight:bold;margin-bottom:10px;">Hmm, not quite!</div>'
        + '<div style="font-size:1.1rem;color:rgba(255,255,255,0.7);margin-bottom:20px;">Keep looking for a ' + item.name + ' ' + item.emoji + '</div>'
        + '<button onclick="DailyChallenge.openCamera()" style="'
        + 'background:#fbbf24;color:#1a1a3e;border:none;padding:18px 50px;'
        + 'border-radius:30px;font-size:1.3rem;font-weight:bold;cursor:pointer;'
        + 'min-height:60px;min-width:200px;">📸 Try Again</button>'
        + '<button onclick="DailyChallenge.parentOverride()" style="'
        + 'background:transparent;color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.2);'
        + 'padding:10px 24px;border-radius:20px;font-size:0.85rem;cursor:pointer;'
        + 'margin-top:12px;">👨‍👩‍👧 Parent: Accept anyway</button>'
        + '<button onclick="DailyChallenge.cancelChallenge()" style="'
        + 'background:transparent;color:rgba(255,255,255,0.4);border:none;'
        + 'padding:10px 24px;font-size:0.9rem;cursor:pointer;'
        + 'margin-top:8px;">← Give up for today</button>';
      
      if (typeof playSound === 'function') playSound('miss');
      if (typeof speak === 'function') {
        speak('Hmm, that doesn\'t look like a ' + item.name + '. Try again!');
      }
    }
  }

  // Parent override — accept the challenge even if AI said no
  function parentOverride() {
    var challenge = getTodaysChallenge();
    if (!challenge) return;
    showChallengeResult(true, challenge.item, 'Parent override');
  }

  // Cancel challenge and go back
  function cancelChallenge() {
    window._dailyChallengeActive = false;
    window._dailyChallengeItem = null;
    closeChallengeOverlay();
  }

  // Remove the overlay
  function closeChallengeOverlay() {
    var overlay = document.getElementById('daily-challenge-overlay');
    if (overlay) {
      overlay.parentNode.removeChild(overlay);
    }
    window._dailyChallengeActive = false;
    window._dailyChallengeItem = null;
  }

  // Public API
  return {
    getTodaysChallenge: getTodaysChallenge,
    isTodayCompleted: isTodayCompleted,
    renderChallengeCard: renderChallengeCard,
    startChallenge: startChallenge,
    openCamera: openCamera,
    cancelChallenge: cancelChallenge,
    closeChallengeOverlay: closeChallengeOverlay,
    parentOverride: parentOverride,
    getStreak: loadStreak,
    init: function() {
      // Auto-inject challenge card into splash screen if container exists
      var container = document.getElementById('daily-challenge-container');
      if (container) {
        container.innerHTML = renderChallengeCard();
      }
    }
  };
})();
