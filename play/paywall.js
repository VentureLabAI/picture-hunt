// Picture Hunt — Paywall + Free-Tier Gating
//
// Freemium (2026-06-04): the free tier deliberately INCLUDES the bilingual hook.
// Free tier: 3 real-object categories (household, animals, food), Spanish
//   bilingual ON, Daily Challenge, 1 sample Story Quest, 5 plays/day.
// Full Access: one-time $24.99 unlock — all 10 categories, all 10 languages,
//   all Story Quests, unlimited plays, every device, forever.
//
// Full Access is unlocked by entering a code that the worker validates against KV.
// The worker still returns a `validUntil` (we set it far in the future for the
// lifetime product); this module stores the latest validation result.
//
// localStorage keys:
//   PH_PREMIUM = { code, validUntil (ISO), validatedAt (ISO), email? }
//   PH_PLAY_LOG = { "YYYY-MM-DD": <count> }   // free-tier daily play counter

var Paywall = (function() {
  'use strict';

  var STORE_KEY = 'PH_PREMIUM';
  var PLAY_LOG_KEY = 'PH_PLAY_LOG';
  var FREE_CATEGORIES = ['household', 'animals', 'food'];
  var FREE_LANGUAGE = 'es';            // Spanish is the free bilingual hook
  var FREE_STORY = 'bear-breakfast';   // one Story Quest free as a sample
  var FREE_DAILY_CAP = 5;

  // Worker endpoint. Same origin as the AI proxy — extends with /validate-code path.
  // Falls back to client-side acceptance of a small allowlist if the worker is
  // unreachable (e.g. Boss Man hasn't deployed the new worker yet).
  var VALIDATE_URL = 'https://picture-hunt-api.aidevlab3.workers.dev/validate-code';

  // Stripe Payment Link for the one-time $24.99 Full Access unlock.
  // REPLACE the placeholder with the real Payment Link from the Stripe dashboard
  // (create a one-time, non-recurring product). See docs/PAYWALL-DEPLOY.md.
  var STRIPE_LINK = 'https://buy.stripe.com/PLACEHOLDER_LIFETIME';

  // Codes accepted client-side as a fallback when the worker is unreachable.
  // Boss Man can use these for personal testing or the first paying customer.
  // Real codes should always go through the worker — these are training wheels.
  var FALLBACK_CODES = ['LAUNCH2026', 'FOUNDERSPECIAL'];

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function getStored() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch(e) { return null; }
  }

  function setStored(obj) {
    if (obj) localStorage.setItem(STORE_KEY, JSON.stringify(obj));
    else localStorage.removeItem(STORE_KEY);
  }

  function getPlayLog() {
    try { return JSON.parse(localStorage.getItem(PLAY_LOG_KEY) || '{}'); } catch(e) { return {}; }
  }

  function setPlayLog(log) {
    localStorage.setItem(PLAY_LOG_KEY, JSON.stringify(log));
  }

  // ── Public API ──

  function isPremium() {
    var s = getStored();
    if (!s || !s.validUntil) return false;
    return new Date(s.validUntil) > new Date();
  }

  function isFreeCategory(catId) {
    return FREE_CATEGORIES.indexOf(catId) !== -1;
  }

  function isFreeLanguage(code) { return code === FREE_LANGUAGE; }
  function isFreeStory(id) { return id === FREE_STORY; }

  function playsToday() {
    return getPlayLog()[todayKey()] || 0;
  }

  function playsRemaining() {
    if (isPremium()) return Infinity;
    return Math.max(0, FREE_DAILY_CAP - playsToday());
  }

  function recordPlay() {
    if (isPremium()) return;
    var log = getPlayLog();
    var k = todayKey();
    log[k] = (log[k] || 0) + 1;
    // Trim old entries — keep last 14 days for any future analytics
    var keys = Object.keys(log).sort();
    while (keys.length > 14) {
      delete log[keys.shift()];
    }
    setPlayLog(log);
  }

  // Returns { ok: true } or { ok: false, reason: 'locked-category'|'daily-cap' }.
  // opts.allowOverCap lets the Daily Challenge launch even past the 5/day cap so
  // the streak (the free tier's retention anchor) is always keepable; the
  // locked-category gate still applies. The daily card goes inert once today's
  // item is found, so this can't become an unlimited-play loophole.
  function canPlay(catId, opts) {
    if (isPremium()) return { ok: true };
    if (!isFreeCategory(catId)) return { ok: false, reason: 'locked-category', catId: catId };
    if (!(opts && opts.allowOverCap) && playsToday() >= FREE_DAILY_CAP) return { ok: false, reason: 'daily-cap' };
    return { ok: true };
  }

  // ── UI ──

  function show(reason, catId) {
    if (document.getElementById('paywall-overlay')) return;

    var headline, sub;
    if (reason === 'locked-category') {
      headline = '🔒 Premium Category';
      var catName = (typeof CATEGORIES !== 'undefined' && catId && CATEGORIES[catId])
        ? CATEGORIES[catId].name : 'this category';
      sub = 'Unlock <b>' + catName + '</b> and all 10 categories with Premium.';
    } else if (reason === 'daily-cap') {
      headline = '🌙 That\'s 5 plays today!';
      sub = 'Free plays reset tomorrow, or unlock unlimited play with Premium.';
    } else if (reason === 'storyline') {
      headline = '🗺️ More Story Quests';
      sub = 'You\'ve played the free quest! Unlock <b>all</b> the Story Quests — guided treasure-hunt adventures in your language — with Full Access.';
    } else if (reason === 'language' || reason === 'bilingual') {
      headline = '🌍 All 10 Languages';
      sub = '<b>Spanish is free.</b> Unlock French, Mandarin, Japanese and 7 more — all 10 languages — with Full Access.';
    } else {
      headline = '⭐ Unlock Everything';
      sub = 'All 10 categories, all 10 languages, every Story Quest, and unlimited play — one time, yours forever.';
    }

    var overlay = document.createElement('div');
    overlay.id = 'paywall-overlay';
    overlay.className = 'paywall-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) close(); };

    // If the Stripe links haven't been swapped from placeholders yet, render a
    // "checkout coming soon" notice instead of buttons that 404. The codes flow
    // still works, so users with a code can unlock.
    var stripeReady = STRIPE_LINK.indexOf('PLACEHOLDER') === -1;

    var plansBlock = stripeReady
      ? ''
        + '<a class="paywall-buy" href="' + STRIPE_LINK + '" target="_blank" rel="noopener" aria-label="Unlock everything for $24.99, one time"'
        +   ' onclick="this.classList.add(\'is-loading\'); var l=this.querySelector(\'.paywall-buy-label\'); if(l)l.textContent=\'Opening checkout…\';">'
        +   '<span class="paywall-buy-price">$24.99</span>'
        +   '<span class="paywall-buy-label">Unlock everything — one time</span>'
        + '</a>'
        + '<p class="paywall-buy-note">No subscription. Yours forever, on every device.</p>'
      : ''
        + '<div class="paywall-coming-soon">'
        +   '<p><b>Checkout opens soon.</b> Email <a href="mailto:hello@venturelab.ai?subject=Picture+Hunt+early+access">hello@venturelab.ai</a> to be first in line — we\'ll send you an unlock code as soon as we open up.</p>'
        + '</div>';

    overlay.innerHTML = ''
      + '<div class="paywall-modal">'
      +   '<button class="paywall-close" onclick="Paywall.close()" aria-label="Close">×</button>'
      +   '<img class="paywall-fox" src="img/mascot/fox-key.png" alt="" aria-hidden="true">'
      +   '<h2 class="paywall-headline">' + headline + '</h2>'
      +   '<p class="paywall-sub">' + sub + '</p>'

      +   '<div class="paywall-features">'
      +     '<div class="pf">🌍 All 10 languages</div>'
      +     '<div class="pf">✨ All 10 categories (100+ items)</div>'
      +     '<div class="pf">🗺️ Story quests</div>'
      +     '<div class="pf">📅 Daily challenge + streak</div>'
      +     '<div class="pf">♾️ Unlimited plays</div>'
      +     '<div class="pf">📲 Works on all your devices</div>'
      +   '</div>'

      +   plansBlock

      +   '<div class="paywall-code">'
      +     '<p class="paywall-code-label">Already paid? Enter your unlock code:</p>'
      +     '<div class="paywall-code-row">'
      +       '<input type="text" id="paywall-code-input" aria-label="Unlock code" placeholder="ABC123" maxlength="20" autocapitalize="characters" autocomplete="off">'
      +       '<button onclick="Paywall.redeem()" class="paywall-redeem-btn">Unlock</button>'
      +     '</div>'
      +     '<p id="paywall-code-msg" class="paywall-code-msg" role="status" aria-live="polite"></p>'
      +   '</div>'

      + '</div>';

    document.body.appendChild(overlay);
    setTimeout(function() {
      var input = document.getElementById('paywall-code-input');
      if (input && reason === 'has-code') input.focus();
    }, 50);
  }

  function close() {
    var el = document.getElementById('paywall-overlay');
    if (el) el.remove();
  }

  function setMsg(text, kind) {
    var el = document.getElementById('paywall-code-msg');
    if (!el) return;
    el.textContent = text;
    el.className = 'paywall-code-msg' + (kind ? ' ' + kind : '');
  }

  function redeem() {
    var input = document.getElementById('paywall-code-input');
    if (!input) return;
    var code = input.value.trim().toUpperCase();
    if (!code) { setMsg('Please enter your code.', 'err'); return; }

    setMsg('Checking…');

    fetch(VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code })
    }).then(function(r) {
      return r.json().then(function(data) { return { status: r.status, data: data }; });
    }).then(function(res) {
      if (res.status === 200 && res.data && res.data.valid) {
        unlock(code, res.data.validUntil, res.data.email);
      } else {
        // Worker is authoritative — if it says invalid, it's invalid. Promo
        // codes (LAUNCH2026 etc.) now validate server-side, so we no longer
        // override the verdict here. FALLBACK_CODES is purely an offline safety
        // net — see the .catch below.
        setMsg('That code didn\'t work. Double-check and try again, or email hello@venturelab.ai.', 'err');
      }
    }).catch(function() {
      // Worker unreachable — accept the offline fallback codes so a known code
      // still works with no connection.
      if (FALLBACK_CODES.indexOf(code) !== -1) {
        unlockWithFallback(code);
      } else {
        setMsg('Couldn\'t reach the unlock server. Check your internet and try again.', 'err');
      }
    });
  }

  function refreshSplashAfterUnlock() {
    // renderSplash() re-renders the Storyline hero + premium badge for the
    // now-unlocked user. Memory/Review/Sorting were cut 2026-05-18.
    if (typeof renderSplash === 'function') renderSplash();
  }

  function unlock(code, validUntil, email) {
    setStored({
      code: code,
      validUntil: validUntil || new Date(Date.now() + 31*24*3600*1000).toISOString(),
      validatedAt: new Date().toISOString(),
      email: email || null
    });
    setMsg('Unlocked! Enjoy.', 'ok');
    if (typeof ProgressSync !== 'undefined' && ProgressSync.onUnlock) ProgressSync.onUnlock();
    setTimeout(function() {
      close();
      refreshSplashAfterUnlock();
    }, 800);
  }

  function unlockWithFallback(code) {
    // Fallback gives 30 days while we wait for the proper worker. Boss Man can
    // re-enter their real code later when the worker is deployed.
    var until = new Date(Date.now() + 30*24*3600*1000).toISOString();
    setStored({
      code: code,
      validUntil: until,
      validatedAt: new Date().toISOString(),
      fallback: true
    });
    setMsg('Unlocked! (offline mode — will sync next time online)', 'ok');
    setTimeout(function() {
      close();
      refreshSplashAfterUnlock();
    }, 1000);
  }

  function init() {
    // ?upgrade=1 → open the paywall on load (linked from landing page)
    // ?code=XYZ  → auto-validate and unlock (delivered in Stripe receipt URL)
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('upgrade') === '1') {
        // Defer until app is ready
        setTimeout(function() { show('upgrade'); }, 1200);
      }
      var urlCode = params.get('code');
      if (urlCode) {
        // Strip the param so refreshes don't re-validate
        var clean = window.location.pathname + window.location.hash;
        history.replaceState(null, '', clean);
        // Open paywall, prefill code, and auto-redeem
        setTimeout(function() {
          show('has-code');
          setTimeout(function() {
            var inp = document.getElementById('paywall-code-input');
            if (inp) { inp.value = urlCode; redeem(); }
          }, 100);
        }, 800);
      }
    } catch(e) {}
  }

  return {
    init: init,
    isPremium: isPremium,
    isFreeCategory: isFreeCategory,
    isFreeLanguage: isFreeLanguage,
    isFreeStory: isFreeStory,
    canPlay: canPlay,
    recordPlay: recordPlay,
    playsRemaining: playsRemaining,
    show: show,
    close: close,
    redeem: redeem
  };
})();
