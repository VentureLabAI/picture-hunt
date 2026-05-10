/**
 * Picture Hunt — Seasonal Content Manager
 * =========================================
 * Drop-in module that manages seasonal/holiday content in the app.
 *
 * FEATURES:
 *   - Auto-detects current season/holiday based on date
 *   - Shows seasonal categories on the splash screen when in-season
 *   - Parents can manually enable any seasonal pack year-round
 *   - Seasonal packs appear with a special ✨ badge and themed gradient
 *   - Out-of-season packs hidden by default (reducible via parent toggle)
 *
 * INTEGRATION:
 *   1. Add seasonal category objects to CATEGORIES in app.js
 *   2. Add their IDs to CATEGORY_ORDER
 *   3. Add this script tag to index.html after app.js:
 *      <script src="content/seasonal-manager.js"></script>
 *   4. Add data-seasonal="auto|on|off" attribute support to renderSplash()
 *
 * SEASONAL PACK DATES:
 *   - Halloween: Oct 1–31
 *   - Christmas: Dec 1–26
 *   - Spring:    Mar 20–Jun 20
 *
 * STORAGE:
 *   - localStorage key: PH_SEASONAL_OVERRIDES
 *   - Format: { halloween: 'on', christmas: 'off', spring: 'auto' }
 *   - 'auto' = show only when in-season (default)
 *   - 'on'   = always show
 *   - 'off'  = never show
 */

var SeasonalManager = (function() {

  // ═══════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════

  var STORAGE_KEY = 'PH_SEASONAL_OVERRIDES';

  // Seasonal pack date ranges (month is 1-based, day is 1-based)
  var SEASONAL_WINDOWS = {
    halloween: { startMonth: 10, startDay: 1,  endMonth: 10, endDay: 31, displayName: 'Halloween 🎃' },
    christmas: { startMonth: 12, startDay: 1,  endMonth: 12, endDay: 26, displayName: 'Christmas 🎄' },
    spring:    { startMonth: 3,  startDay: 20, endMonth: 6,  endDay: 20, displayName: 'Spring 🌸' }
  };

  // All seasonal category IDs (must match keys in CATEGORIES and SEASONAL_WINDOWS)
  var SEASONAL_IDS = ['halloween', 'christmas', 'spring'];

  // ═══════════════════════════════════════════════════════════
  // DATE UTILITIES
  // ═══════════════════════════════════════════════════════════

  function isDateInRange(month, day, startMonth, startDay, endMonth, endDay) {
    // Handle year-wrap (e.g., Dec 20 → Jan 5)
    if (startMonth <= endMonth) {
      // Normal range within same year
      if (month < startMonth || month > endMonth) return false;
      if (month === startMonth && day < startDay) return false;
      if (month === endMonth && day > endDay) return false;
      return true;
    } else {
      // Wraps around year end
      if (month > endMonth && month < startMonth) return false;
      if (month === startMonth && day < startDay) return false;
      if (month === endMonth && day > endDay) return false;
      return true;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STORAGE
  // ═══════════════════════════════════════════════════════════

  function getOverrides() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch(e) {
      return {};
    }
  }

  function saveOverrides(overrides) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch(e) { /* localStorage full — non-critical */ }
  }

  // ═══════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════

  /**
   * Check if a seasonal pack should be visible right now.
   * @param {string} packId - e.g. 'halloween', 'christmas', 'spring'
   * @returns {boolean}
   */
  function isPackVisible(packId) {
    var overrides = getOverrides();
    var setting = overrides[packId] || 'auto';

    if (setting === 'on') return true;
    if (setting === 'off') return false;

    // 'auto' — check if currently in-season
    var window = SEASONAL_WINDOWS[packId];
    if (!window) return false;

    var now = new Date();
    var month = now.getMonth() + 1; // JS months are 0-based
    var day = now.getDate();

    return isDateInRange(month, day, window.startMonth, window.startDay, window.endMonth, window.endDay);
  }

  /**
   * Get list of seasonal category IDs that should be visible now.
   * @returns {string[]}
   */
  function getVisiblePacks() {
    return SEASONAL_IDS.filter(function(id) { return isPackVisible(id); });
  }

  /**
   * Get list of ALL seasonal category IDs (regardless of visibility).
   * @returns {string[]}
   */
  function getAllPackIds() {
    return SEASONAL_IDS.slice(); // return copy
  }

  /**
   * Check if a category ID is a seasonal pack.
   * @param {string} catId
   * @returns {boolean}
   */
  function isSeasonal(catId) {
    return SEASONAL_IDS.indexOf(catId) >= 0;
  }

  /**
   * Set visibility override for a pack.
   * @param {string} packId
   * @param {string} setting - 'auto' | 'on' | 'off'
   */
  function setOverride(packId, setting) {
    if (SEASONAL_IDS.indexOf(packId) < 0) return;
    if (['auto', 'on', 'off'].indexOf(setting) < 0) return;
    var overrides = getOverrides();
    overrides[packId] = setting;
    saveOverrides(overrides);
  }

  /**
   * Get current override setting for a pack.
   * @param {string} packId
   * @returns {string} 'auto' | 'on' | 'off'
   */
  function getOverride(packId) {
    var overrides = getOverrides();
    return overrides[packId] || 'auto';
  }

  /**
   * Get the seasonal window config for a pack (for UI display).
   * @param {string} packId
   * @returns {object|null}
   */
  function getPackWindow(packId) {
    return SEASONAL_WINDOWS[packId] || null;
  }

  /**
   * Get a human-readable status for a seasonal pack.
   * @param {string} packId
   * @returns {string} e.g. "Available Oct 1–31", "In season! 🎃", "Enabled year-round"
   */
  function getPackStatus(packId) {
    var override = getOverride(packId);
    var window = SEASONAL_WINDOWS[packId];
    if (!window) return '';

    if (override === 'on') return 'Enabled year-round ✨';
    if (override === 'off') return 'Hidden (tap to enable)';

    var now = new Date();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var inSeason = isDateInRange(month, day, window.startMonth, window.startDay, window.endMonth, window.endDay);

    if (inSeason) return 'In season! ' + window.displayName.split(' ')[1];

    // Calculate next occurrence
    var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return 'Available ' + monthNames[window.startMonth - 1] + ' ' + window.startDay + '–' +
           monthNames[window.endMonth - 1] + ' ' + window.endDay;
  }

  /**
   * Generate the seasonal toggle HTML for the parent settings area.
   * Call this from wherever parent settings are rendered.
   * @returns {string} HTML string
   */
  function renderSeasonalToggles() {
    var html = '<div class="seasonal-toggles" style="margin-top:16px;">';
    html += '<h3 style="font-size:18px;margin-bottom:12px;">🎃 Seasonal Hunts</h3>';

    SEASONAL_IDS.forEach(function(packId) {
      var window = SEASONAL_WINDOWS[packId];
      var override = getOverride(packId);
      var visible = isPackVisible(packId);
      var status = getPackStatus(packId);

      html += '<div class="seasonal-toggle-row" style="display:flex;align-items:center;justify-content:space-between;' +
              'padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.1);">';

      html += '<div>';
      html += '<span style="font-size:16px;">' + window.displayName + '</span>';
      html += '<div style="font-size:12px;color:#888;">' + status + '</div>';
      html += '</div>';

      html += '<div style="display:flex;gap:4px;">';
      ['auto','on','off'].forEach(function(val) {
        var label = val === 'auto' ? '🕐' : val === 'on' ? '✅' : '❌';
        var active = override === val || (!override && val === 'auto');
        html += '<button onclick="SeasonalManager.setOverride(\'' + packId + '\',\'' + val + '\');' +
                'SeasonalManager.refreshUI();" ' +
                'style="font-size:18px;padding:6px 10px;border:' + (active ? '2px solid #4CAF50' : '1px solid #ccc') +
                ';border-radius:8px;background:' + (active ? '#E8F5E9' : '#f5f5f5') +
                ';cursor:pointer;">' + label + '</button>';
      });
      html += '</div>';

      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  /**
   * Refresh the splash screen to reflect seasonal visibility changes.
   * Call after any setOverride() change.
   */
  function refreshUI() {
    // Re-render the splash screen categories
    if (typeof renderSplash === 'function') {
      renderSplash();
    }
  }

  /**
   * Filter CATEGORY_ORDER to include only visible seasonal packs.
   * Call this when rendering the category selector.
   * @param {string[]} categoryOrder - The full CATEGORY_ORDER array
   * @returns {string[]} Filtered array with only visible seasonal packs
   */
  function filterVisibleCategories(categoryOrder) {
    return categoryOrder.filter(function(catId) {
      if (!isSeasonal(catId)) return true; // Always show non-seasonal categories
      return isPackVisible(catId);
    });
  }

  /**
   * Add a ✨ badge to seasonal category buttons that are currently in-season.
   * @param {string} catId
   * @returns {string} Badge HTML or empty string
   */
  function getInSeasonBadge(catId) {
    if (!isSeasonal(catId)) return '';
    var override = getOverride(catId);
    var window = SEASONAL_WINDOWS[catId];
    if (!window) return '';

    var now = new Date();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var inSeason = isDateInRange(month, day, window.startMonth, window.startDay, window.endMonth, window.endDay);

    if (override === 'on' || inSeason) {
      return ' <span style="font-size:14px;">✨</span>';
    }
    return '';
  }

  // ═══════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════

  return {
    isPackVisible: isPackVisible,
    getVisiblePacks: getVisiblePacks,
    getAllPackIds: getAllPackIds,
    isSeasonal: isSeasonal,
    setOverride: setOverride,
    getOverride: getOverride,
    getPackWindow: getPackWindow,
    getPackStatus: getPackStatus,
    renderSeasonalToggles: renderSeasonalToggles,
    refreshUI: refreshUI,
    filterVisibleCategories: filterVisibleCategories,
    getInSeasonBadge: getInSeasonBadge,
    SEASONAL_IDS: SEASONAL_IDS,
    STORAGE_KEY: STORAGE_KEY
  };

})();
