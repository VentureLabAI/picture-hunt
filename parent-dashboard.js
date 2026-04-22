/**
 * Picture Hunt — Parent Progress Dashboard
 * ==========================================
 * Drop-in module: adds a 📊 Stats button to the splash screen.
 * Parents tap it to see their child's progress across all categories,
 * achievements unlocked, and play session history.
 *
 * READS FROM (existing localStorage — no new storage needed):
 *   - PH_PROGRESS: { catId: ["item1", "item2", ...], ... }
 *   - PH_SELECTED: { catId: ["item1", ...], ... }
 *   - PH_STATS: { sessions: [...], firstPlay: ISO, ... } (NEW — this module creates it)
 *
 * USAGE:
 *   1. Include this file: <script src="parent-dashboard.js?v=1"></script>
 *   2. Include parent-dashboard.css (or paste styles into style.css)
 *   3. Call initDashboard() after initDomRefs() in app init
 *
 * The dashboard auto-injects a 📊 button on the splash screen.
 * No changes needed to index.html beyond the script tag.
 *
 * DEPENDS ON (from app.js — already global):
 *   - CATEGORIES object
 *   - CATEGORY_ORDER array
 *   - getProgress() function
 *   - getSelectedNames() function
 *   - showScreen() function
 */

// ═══════════════════════════════════════════════════════════════
// STATS TRACKING (lightweight session logger)
// ═══════════════════════════════════════════════════════════════
// Records play sessions so the dashboard can show activity trends.
// Each session entry: { date: ISO, category: catId, found: N, duration: seconds }

var PH_STATS_KEY = 'PH_STATS';

function _getStats() {
  try { return JSON.parse(localStorage.getItem(PH_STATS_KEY) || '{}'); } catch(e) { return {}; }
}

function _saveStats(s) {
  localStorage.setItem(PH_STATS_KEY, JSON.stringify(s));
}

/**
 * Call when a game round starts. Returns a session object to pass to endSession().
 */
function dashboardStartSession(catId) {
  return { category: catId, startTime: Date.now(), found: 0 };
}

/**
 * Call when a game round ends (victory or home button).
 * @param {Object} session - from dashboardStartSession()
 * @param {number} itemsFound - how many items found this round
 */
function dashboardEndSession(session, itemsFound) {
  if (!session || !session.startTime) return;
  var stats = _getStats();
  if (!stats.firstPlay) stats.firstPlay = new Date().toISOString();
  if (!stats.sessions) stats.sessions = [];

  var entry = {
    date: new Date().toISOString(),
    category: session.category,
    found: itemsFound || 0,
    duration: Math.round((Date.now() - session.startTime) / 1000)
  };

  stats.sessions.push(entry);
  // Keep last 100 sessions max
  if (stats.sessions.length > 100) stats.sessions = stats.sessions.slice(-100);
  stats.lastPlay = entry.date;
  _saveStats(stats);
}


// ═══════════════════════════════════════════════════════════════
// ACHIEVEMENTS
// ═══════════════════════════════════════════════════════════════

var ACHIEVEMENTS = [
  { id: 'first_find',   emoji: '🌟', name: 'First Find!',       desc: 'Found your very first item',          check: function(p) { return _totalFound(p) >= 1; } },
  { id: 'five_finds',   emoji: '⭐', name: 'Explorer',           desc: 'Found 5 different items',              check: function(p) { return _totalFound(p) >= 5; } },
  { id: 'ten_finds',    emoji: '🔥', name: 'Super Explorer',     desc: 'Found 10 different items',             check: function(p) { return _totalFound(p) >= 10; } },
  { id: 'twenty_finds', emoji: '🚀', name: 'Discovery Master',   desc: 'Found 20 different items',             check: function(p) { return _totalFound(p) >= 20; } },
  { id: 'fifty_finds',  emoji: '👑', name: 'Picture Hunt Champion', desc: 'Found 50 different items',          check: function(p) { return _totalFound(p) >= 50; } },
  { id: 'cat_complete',  emoji: '🏆', name: 'Category Champion', desc: 'Completed an entire category',         check: function(p) { return _anyCatComplete(p); } },
  { id: 'two_cats',     emoji: '🎯', name: 'Multi-Talent',       desc: 'Played 2 different categories',        check: function(p) { return _catsPlayed(p) >= 2; } },
  { id: 'five_cats',    emoji: '🌈', name: 'Rainbow Player',     desc: 'Played 5 different categories',        check: function(p) { return _catsPlayed(p) >= 5; } },
  { id: 'all_cats',     emoji: '🎪', name: 'Try Everything!',    desc: 'Played every category',                check: function(p) { return _catsPlayed(p) >= CATEGORY_ORDER.length; } },
  { id: 'all_complete', emoji: '💎', name: 'Grand Champion',     desc: 'Completed every single category',      check: function(p) { return _allCatsComplete(p); } }
];

function _totalFound(progress) {
  var total = 0;
  for (var cat in progress) { total += (progress[cat] || []).length; }
  return total;
}

function _catsPlayed(progress) {
  var count = 0;
  for (var cat in progress) { if ((progress[cat] || []).length > 0) count++; }
  return count;
}

function _anyCatComplete(progress) {
  for (var i = 0; i < CATEGORY_ORDER.length; i++) {
    var catId = CATEGORY_ORDER[i];
    var cat = CATEGORIES[catId];
    if (!cat) continue;
    var found = (progress[catId] || []).length;
    if (found >= cat.items.length) return true;
  }
  return false;
}

function _allCatsComplete(progress) {
  for (var i = 0; i < CATEGORY_ORDER.length; i++) {
    var catId = CATEGORY_ORDER[i];
    var cat = CATEGORIES[catId];
    if (!cat) continue;
    // Skip seasonal packs that aren't visible — shouldn't need to complete out-of-season packs
    if (cat.seasonal && typeof SeasonalManager !== 'undefined' && !SeasonalManager.isPackVisible(catId)) continue;
    if ((progress[catId] || []).length < cat.items.length) return false;
  }
  return true;
}


// ═══════════════════════════════════════════════════════════════
// DASHBOARD UI
// ═══════════════════════════════════════════════════════════════

function initDashboard() {
  // Inject the stats button on the splash screen
  var splash = document.getElementById('splash');
  if (!splash) return;

  // Find the title area to place button near it
  var statsBtn = document.createElement('button');
  statsBtn.id = 'dashboard-btn';
  statsBtn.className = 'dashboard-open-btn';
  statsBtn.textContent = '📊';
  statsBtn.setAttribute('aria-label', 'View progress stats');
  statsBtn.onclick = function() { showDashboard(); };
  splash.appendChild(statsBtn);

  // Create dashboard screen (hidden by default)
  _createDashboardScreen();
}

function _createDashboardScreen() {
  var screen = document.createElement('div');
  screen.id = 'dashboard-screen';
  screen.className = 'dashboard-screen';
  screen.style.display = 'none';

  screen.innerHTML = '<div class="dashboard-container">'
    + '<div class="dashboard-header">'
    + '  <button class="dashboard-back-btn" onclick="closeDashboard()">🏠</button>'
    + '  <h1 class="dashboard-title">📊 Progress</h1>'
    + '</div>'
    + '<div id="dashboard-content" class="dashboard-content"></div>'
    + '</div>';

  document.body.appendChild(screen);
}

function showDashboard() {
  var screen = document.getElementById('dashboard-screen');
  if (!screen) return;

  // Hide other screens
  var allScreens = document.querySelectorAll('.screen');
  allScreens.forEach(function(s) { s.classList.remove('active'); });

  screen.style.display = 'flex';
  _renderDashboard();
}

function closeDashboard() {
  var screen = document.getElementById('dashboard-screen');
  if (screen) screen.style.display = 'none';
  if (typeof showScreen === 'function') showScreen('splash');
}

function _renderDashboard() {
  var content = document.getElementById('dashboard-content');
  if (!content) return;

  var progress = (typeof getProgress === 'function') ? getProgress() : {};
  var stats = _getStats();
  var totalItems = 0;
  var totalFound = _totalFound(progress);

  // Count total possible items
  CATEGORY_ORDER.forEach(function(catId) {
    var cat = CATEGORIES[catId];
    if (cat) totalItems += cat.items.length;
  });

  var html = '';

  // ── Overall Progress ──
  var overallPct = totalItems > 0 ? Math.round((totalFound / totalItems) * 100) : 0;
  html += '<div class="dashboard-section">';
  html += '  <div class="dashboard-overall">';
  html += '    <div class="dashboard-big-number">' + totalFound + '<span class="dashboard-total">/' + totalItems + '</span></div>';
  html += '    <div class="dashboard-big-label">Items Discovered</div>';
  html += '    <div class="dashboard-progress-bar"><div class="dashboard-progress-fill" style="width:' + overallPct + '%"></div></div>';
  html += '    <div class="dashboard-pct">' + overallPct + '% Complete</div>';
  html += '  </div>';
  html += '</div>';

  // ── Category Breakdown ──
  html += '<div class="dashboard-section">';
  html += '  <h2 class="dashboard-section-title">Categories</h2>';
  html += '  <div class="dashboard-categories">';

  var dashCategories = CATEGORY_ORDER.filter(function(catId) {
    // Always show non-seasonal categories
    if (!CATEGORIES[catId] || !CATEGORIES[catId].seasonal) return true;
    // Show seasonal categories if they have any progress or are currently visible
    var hasProgress = (progress[catId] || []).length > 0;
    var isVisible = (typeof SeasonalManager !== 'undefined') && SeasonalManager.isPackVisible(catId);
    return hasProgress || isVisible;
  });

  dashCategories.forEach(function(catId) {
    var cat = CATEGORIES[catId];
    if (!cat) return;
    var found = (progress[catId] || []).length;
    var total = cat.items.length;
    var pct = total > 0 ? Math.round((found / total) * 100) : 0;
    var isComplete = found >= total;

    html += '<div class="dashboard-cat-card' + (isComplete ? ' complete' : '') + '">';
    html += '  <div class="dashboard-cat-emoji">' + cat.emoji + '</div>';
    html += '  <div class="dashboard-cat-info">';
    html += '    <div class="dashboard-cat-name">' + cat.name + (isComplete ? ' 🏆' : '') + '</div>';
    html += '    <div class="dashboard-cat-bar"><div class="dashboard-cat-fill" style="width:' + pct + '%;background:' + cat.gradient + '"></div></div>';
    html += '    <div class="dashboard-cat-count">' + found + '/' + total + '</div>';
    html += '  </div>';
    html += '</div>';

    // Show which items are found/missing (collapsed by default, tap to expand)
    html += '<div class="dashboard-cat-items" id="dash-items-' + catId + '" style="display:none">';
    var foundNames = progress[catId] || [];
    cat.items.forEach(function(item) {
      var isFound = foundNames.indexOf(item.name) >= 0;
      html += '<span class="dashboard-item' + (isFound ? ' found' : ' missing') + '">'
        + item.emoji + ' ' + item.name
        + (isFound ? ' ✓' : '')
        + '</span>';
    });
    html += '</div>';
  });

  html += '  </div>';
  html += '</div>';

  // ── Achievements ──
  html += '<div class="dashboard-section">';
  html += '  <h2 class="dashboard-section-title">🏅 Achievements</h2>';
  html += '  <div class="dashboard-achievements">';

  var unlockedCount = 0;
  ACHIEVEMENTS.forEach(function(ach) {
    var unlocked = ach.check(progress);
    if (unlocked) unlockedCount++;
    html += '<div class="dashboard-achievement' + (unlocked ? ' unlocked' : ' locked') + '">';
    html += '  <div class="dashboard-ach-emoji">' + (unlocked ? ach.emoji : '🔒') + '</div>';
    html += '  <div class="dashboard-ach-info">';
    html += '    <div class="dashboard-ach-name">' + ach.name + '</div>';
    html += '    <div class="dashboard-ach-desc">' + ach.desc + '</div>';
    html += '  </div>';
    html += '</div>';
  });

  html += '  </div>';
  html += '  <div class="dashboard-ach-summary">' + unlockedCount + '/' + ACHIEVEMENTS.length + ' unlocked</div>';
  html += '</div>';

  // ── Play History ──
  if (stats.sessions && stats.sessions.length > 0) {
    html += '<div class="dashboard-section">';
    html += '  <h2 class="dashboard-section-title">📅 Recent Activity</h2>';

    // Activity heatmap (last 7 days)
    var dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var dayCounts = [0, 0, 0, 0, 0, 0, 0];
    var now = Date.now();
    var weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    stats.sessions.forEach(function(s) {
      var d = new Date(s.date);
      if (d.getTime() >= weekAgo) {
        dayCounts[d.getDay()]++;
      }
    });

    html += '  <div class="dashboard-week">';
    for (var d = 0; d < 7; d++) {
      var intensity = Math.min(dayCounts[d], 5); // cap at 5 for color
      html += '<div class="dashboard-day level-' + intensity + '">'
        + '<div class="dashboard-day-label">' + dayLabels[d] + '</div>'
        + '<div class="dashboard-day-dot"></div>'
        + (dayCounts[d] > 0 ? '<div class="dashboard-day-count">' + dayCounts[d] + '</div>' : '')
        + '</div>';
    }
    html += '  </div>';

    // Last 5 sessions
    html += '  <div class="dashboard-recent">';
    var recent = stats.sessions.slice(-5).reverse();
    recent.forEach(function(s) {
      var cat = CATEGORIES[s.category];
      var dateStr = new Date(s.date).toLocaleDateString();
      var mins = Math.round(s.duration / 60);
      html += '<div class="dashboard-session-entry">';
      html += '  <span class="dashboard-session-cat">' + (cat ? cat.emoji : '❓') + '</span>';
      html += '  <span class="dashboard-session-info">' + (cat ? cat.name : s.category)
        + ' — ' + s.found + ' found'
        + (mins > 0 ? ' — ' + mins + ' min' : '')
        + '</span>';
      html += '  <span class="dashboard-session-date">' + dateStr + '</span>';
      html += '</div>';
    });
    html += '  </div>';

    // Total playtime
    var totalSecs = 0;
    stats.sessions.forEach(function(s) { totalSecs += (s.duration || 0); });
    var totalMins = Math.round(totalSecs / 60);
    html += '  <div class="dashboard-playtime">Total playtime: ' + (totalMins >= 60 ? Math.floor(totalMins / 60) + 'h ' + (totalMins % 60) + 'm' : totalMins + ' minutes') + '</div>';

    html += '</div>';
  }

  // ── Seasonal Pack Toggles ──
  if (typeof SeasonalManager !== 'undefined') {
    html += '<div class="dashboard-section">';
    html += '  <h2 class="dashboard-section-title">🎃 Seasonal Hunts</h2>';
    html += SeasonalManager.renderSeasonalToggles();
    html += '</div>';
  }

  // ── Reset Button (parent-only, small and unobtrusive) ──
  html += '<div class="dashboard-section dashboard-reset-section">';
  html += '  <button class="dashboard-reset-btn" onclick="_confirmReset()">🗑️ Reset All Progress</button>';
  html += '</div>';

  content.innerHTML = html;

  // Wire up category card tap-to-expand
  var catCards = content.querySelectorAll('.dashboard-cat-card');
  catCards.forEach(function(card, idx) {
    card.onclick = function() {
      var catId = dashCategories[idx];
      var items = document.getElementById('dash-items-' + catId);
      if (items) {
        items.style.display = items.style.display === 'none' ? 'flex' : 'none';
      }
    };
  });
}

function _confirmReset() {
  // Double-tap protection: create a confirm overlay
  var existing = document.getElementById('dashboard-confirm-reset');
  if (existing) { existing.remove(); return; }

  var overlay = document.createElement('div');
  overlay.id = 'dashboard-confirm-reset';
  overlay.className = 'dashboard-confirm-overlay';
  overlay.innerHTML = '<div class="dashboard-confirm-box">'
    + '<div class="dashboard-confirm-text">Reset ALL progress?<br>This cannot be undone.</div>'
    + '<button class="dashboard-confirm-yes" onclick="_doReset()">Yes, Reset</button>'
    + '<button class="dashboard-confirm-no" onclick="document.getElementById(\'dashboard-confirm-reset\').remove()">Cancel</button>'
    + '</div>';
  document.body.appendChild(overlay);
}

function _doReset() {
  localStorage.removeItem('PH_PROGRESS');
  localStorage.removeItem('PH_STATS');
  localStorage.removeItem('PH_GAME_STATE');
  var overlay = document.getElementById('dashboard-confirm-reset');
  if (overlay) overlay.remove();
  _renderDashboard(); // re-render with empty state
}
