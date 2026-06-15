// Picture Hunt — Cross-Device Progress Sync (premium feature)
//
// On unlock or app load (premium only):
//   1. Download remote progress, merge into local
//   2. After every progress change, debounce-upload local
//
// Sync strategy: union-merge for collected items (you can never UN-collect a
// sticker). Last-write-wins for everything else. Local always wins on initial
// merge — the user's most recent device is the source of truth.
//
// Synced keys:
//   PH_PROGRESS  — items found per category
//   PH_STICKERS  — sticker book contents
//   PH_DAILY     — daily challenge streak
//   PH_SELECTED  — picked items per category
//
// NOT synced:
//   PH_GAME_STATE, PH_PLAY_LOG, PH_SOUND, PH_DIFFICULTY, PH_LANG, PH_PREMIUM

var ProgressSync = (function() {
  'use strict';

  var SYNC_URL = 'https://picture-hunt-api.aidevlab3.workers.dev/sync-progress';
  var SYNCED_KEYS = ['PH_PROGRESS', 'PH_STICKERS', 'PH_DAILY', 'PH_SELECTED'];
  var DEBOUNCE_MS = 3000;
  var uploadTimer = null;
  var initialized = false;
  var syncReady = false;     // becomes true once the initial download+merge reconciles
  var pendingUpload = false;  // a local change was made before ready, or an upload failed
  var hookInstalled = false;  // setItem hook + online listener installed exactly once

  function getCode() {
    if (typeof Paywall === 'undefined' || !Paywall.isPremium()) return null;
    var raw = localStorage.getItem('PH_PREMIUM');
    try { var s = JSON.parse(raw); return s && s.code ? s.code : null; } catch(e) { return null; }
  }

  function snapshot() {
    var snap = {};
    SYNCED_KEYS.forEach(function(k) {
      var v = localStorage.getItem(k);
      if (v !== null) {
        try { snap[k] = JSON.parse(v); } catch(e) { snap[k] = v; }
      }
    });
    return snap;
  }

  function upload() {
    var code = getCode();
    if (!code) return;
    fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, action: 'upload', data: snapshot() })
    }).then(function(r) { return r.json(); })
      .then(function(j) {
        if (j && j.ok) { pendingUpload = false; }
        else { pendingUpload = true; if (window.PH_DEBUG) console.log('[Sync] upload failed:', j && j.error); }
      })
      .catch(function() { pendingUpload = true; /* offline — flushed on next change or 'online' */ });
  }

  // Debounced upload — schedule on next change
  function scheduleUpload() {
    if (!getCode()) return;
    // Defer ALL uploads until the initial download+merge has reconciled, or a write
    // made during boot would upload local-only data and clobber newer remote KV we
    // hadn't pulled yet. The deferred change is flushed when syncReady flips true.
    if (!syncReady) { pendingUpload = true; return; }
    if (uploadTimer) clearTimeout(uploadTimer);
    uploadTimer = setTimeout(upload, DEBOUNCE_MS);
  }

  function downloadAndMerge() {
    var code = getCode();
    if (!code) return Promise.resolve(false);
    return fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, action: 'download' })
    }).then(function(r) { return r.json(); })
      .then(function(j) {
        if (!j.ok || !j.data) return false;
        return mergeRemote(j.data);
      })
      .catch(function() { return false; });
  }

  // Union-merge collected items, last-write-wins for everything else
  function mergeRemote(remote) {
    if (!remote || typeof remote !== 'object') return false;
    var changed = false;

    // PH_PROGRESS: { catId: [item1, item2, ...] } — union by item name
    if (remote.PH_PROGRESS) {
      var localProg = {};
      try { localProg = JSON.parse(localStorage.getItem('PH_PROGRESS') || '{}'); } catch(e) {}
      Object.keys(remote.PH_PROGRESS).forEach(function(catId) {
        var rArr = Array.isArray(remote.PH_PROGRESS[catId]) ? remote.PH_PROGRESS[catId] : [];
        var lArr = Array.isArray(localProg[catId]) ? localProg[catId] : [];
        var merged = lArr.slice();
        rArr.forEach(function(item) {
          if (merged.indexOf(item) === -1) { merged.push(item); changed = true; }
        });
        if (merged.length !== lArr.length) localProg[catId] = merged;
      });
      if (changed) localStorage.setItem('PH_PROGRESS', JSON.stringify(localProg));
    }

    // PH_STICKERS: { catId: { item: true } } — union by key
    if (remote.PH_STICKERS) {
      var localStick = {};
      try { localStick = JSON.parse(localStorage.getItem('PH_STICKERS') || '{}'); } catch(e) {}
      var stickChanged = false;
      Object.keys(remote.PH_STICKERS).forEach(function(catId) {
        var rCat = remote.PH_STICKERS[catId] || {};
        if (!localStick[catId]) localStick[catId] = {};
        Object.keys(rCat).forEach(function(item) {
          if (rCat[item] && !localStick[catId][item]) {
            localStick[catId][item] = true;
            stickChanged = true;
          }
        });
      });
      if (stickChanged) {
        localStorage.setItem('PH_STICKERS', JSON.stringify(localStick));
        changed = true;
      }
    }

    // PH_DAILY: adopt whichever record is MORE RECENT (its streak is the true
    // current one), not whichever streak is bigger. Picking the higher streak could
    // install a stale older record (higher streak, week-old lastDate); the next
    // checkAndUpdateStreak then sees a huge gap and resets to 0 — so syncing would
    // DESTROY an active streak instead of preserving it. lastDate is YYYY-MM-DD, so
    // string compare is chronological; on a same-date tie keep the higher streak.
    if (remote.PH_DAILY) {
      var localDaily = {};
      try { localDaily = JSON.parse(localStorage.getItem('PH_DAILY') || '{}'); } catch(e) {}
      var rDate = remote.PH_DAILY.lastDate || '';
      var lDate = localDaily.lastDate || '';
      var takeRemote = (rDate > lDate) || (rDate === lDate && (remote.PH_DAILY.streak || 0) > (localDaily.streak || 0));
      if (takeRemote) {
        localStorage.setItem('PH_DAILY', JSON.stringify(remote.PH_DAILY));
        changed = true;
      }
    }

    // PH_SELECTED: prefer local (it's a per-device parent preference, but if
    // the device has no selections at all, accept remote as a starting point)
    if (remote.PH_SELECTED) {
      var localSel = localStorage.getItem('PH_SELECTED');
      if (!localSel) {
        localStorage.setItem('PH_SELECTED', JSON.stringify(remote.PH_SELECTED));
        changed = true;
      }
    }

    return changed;
  }

  // Patch localStorage.setItem to auto-schedule upload on synced-key writes.
  // This is the only way to catch every write site without modifying every
  // module that touches progress.
  function installSetItemHook() {
    if (hookInstalled) return; // idempotent — onUnlock re-runs init(); don't nest wrappers
    hookInstalled = true;
    var orig = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value) {
      var rv = orig(key, value);
      if (SYNCED_KEYS.indexOf(key) !== -1) scheduleUpload();
      return rv;
    };
    // Flush deferred/failed uploads when connectivity returns (added once).
    window.addEventListener('online', function() { if (getCode() && pendingUpload) scheduleUpload(); });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    if (!getCode()) return;  // Free user — no sync.
    syncReady = false;       // re-gate uploads until this run's merge reconciles
    installSetItemHook();
    downloadAndMerge().then(function(merged) {
      // Initial reconcile done — uploads are now safe (won't clobber unpulled KV).
      syncReady = true;
      if (pendingUpload) scheduleUpload(); // flush any change deferred during boot
      if (merged && typeof renderSplash === 'function') {
        // Refresh splash so newly-synced progress + stickers reflect immediately
        renderSplash();
        if (typeof StickerBook !== 'undefined' && StickerBook.addButtonToSplash) StickerBook.addButtonToSplash();
      }
    });
  }

  // Public hook for the paywall: when a new code is redeemed, kick off sync.
  function onUnlock() {
    initialized = false;
    init();
  }

  return {
    init: init,
    onUnlock: onUnlock,
    upload: upload  // Manual trigger for testing
  };
})();
