// Picture Hunt — PWA Install Prompt
//
// Shows a small "Add to Home Screen" pill on the splash screen for users who
// haven't installed yet. Standard beforeinstallprompt handling on Chrome/Edge/
// Android. For iOS Safari (which doesn't fire beforeinstallprompt), shows a
// short instruction toast on first visit.
//
// Storage:
//   PH_INSTALL_DISMISSED — set to '1' if user explicitly dismissed
//   PH_INSTALL_LAST_SHOWN — ISO date, throttle to once per 7 days

var InstallPrompt = (function() {
  'use strict';

  var deferredPrompt = null;
  var DISMISSED_KEY = 'PH_INSTALL_DISMISSED';
  var LAST_SHOWN_KEY = 'PH_INSTALL_LAST_SHOWN';
  var THROTTLE_DAYS = 7;
  var DISMISS_DAYS = 45;       // explicit dismissal cools down, doesn't kill forever
  var pillPollTimer = null;    // single tracked poll instead of stacking timers

  function isInstalled() {
    // Standalone display mode → already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.navigator && window.navigator.standalone === true) return true;
    return false;
  }

  function dismissed() {
    var v = localStorage.getItem(DISMISSED_KEY);
    if (!v) return false;
    if (v === '1') return true; // permanent: set on actual install (appinstalled)
    // Otherwise it's an ISO timestamp from an explicit dismiss — expire after a long
    // cooldown so a one-off "×" doesn't kill the install path forever.
    var age = Date.now() - new Date(v).getTime();
    return age < DISMISS_DAYS * 24 * 3600 * 1000;
  }

  function recentlyShown() {
    var last = localStorage.getItem(LAST_SHOWN_KEY);
    if (!last) return false;
    var diff = Date.now() - new Date(last).getTime();
    return diff < THROTTLE_DAYS * 24 * 3600 * 1000;
  }

  function isIOS() {
    if (window.MSStream) return false;
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
    // iPadOS 13+ reports a desktop 'Macintosh' UA but is touch-capable — without this
    // iPad users never see the Share -> Add to Home Screen hint.
    return navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent);
  }

  function captureBeforeInstall() {
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      deferredPrompt = e;
      // Surface our own pill once we have a prompt to fire
      maybeShowPill();
    });
    window.addEventListener('appinstalled', function() {
      deferredPrompt = null;
      removePill();
      // Don't bother them again
      localStorage.setItem(DISMISSED_KEY, '1');
    });
  }

  function maybeShowPill() {
    if (isInstalled() || dismissed() || recentlyShown()) return;
    if (!deferredPrompt && !isIOS()) return;
    // Don't pop the pill over a higher-priority first-run card / fox greeting — those
    // are one-time and must not be obscured. Re-check shortly after they dismiss.
    if (document.getElementById('first-run-setup') || document.getElementById('home-greeting')) {
      if (pillPollTimer) clearTimeout(pillPollTimer);
      pillPollTimer = setTimeout(maybeShowPill, 500);
      return;
    }
    var splash = document.getElementById('splash');
    if (!splash || !splash.classList.contains('active')) {
      // Wait for splash to become active (single tracked timer, not a stacking loop).
      if (pillPollTimer) clearTimeout(pillPollTimer);
      pillPollTimer = setTimeout(maybeShowPill, 500);
      return;
    }
    if (pillPollTimer) { clearTimeout(pillPollTimer); pillPollTimer = null; }
    showPill();
  }

  function showPill() {
    if (document.getElementById('install-pill')) return;

    var pill = document.createElement('div');
    pill.id = 'install-pill';
    pill.className = 'install-pill';

    if (deferredPrompt) {
      pill.innerHTML = '<span class="install-pill-text">📲 Add to Home Screen for fullscreen play</span>'
        + '<button class="install-pill-btn" onclick="InstallPrompt.fire()">Add</button>'
        + '<button class="install-pill-x" onclick="InstallPrompt.dismiss()" aria-label="Dismiss">×</button>';
    } else if (isIOS()) {
      pill.innerHTML = '<span class="install-pill-text">📲 Tap <b>Share</b> → <b>Add to Home Screen</b> for fullscreen play</span>'
        + '<button class="install-pill-x" onclick="InstallPrompt.dismiss()" aria-label="Dismiss">×</button>';
    } else {
      return;
    }

    document.body.appendChild(pill);
    // Arm the 7-day throttle only now that the pill actually rendered (was set in
    // maybeShowPill even on paths that returned without showing anything).
    localStorage.setItem(LAST_SHOWN_KEY, new Date().toISOString());
    document.body.classList.add('ph-install-open');
    setTimeout(function() { pill.classList.add('install-pill-visible'); }, 50);
    // Reserve exactly the pill's real (text-wrapped) height on the splash scroll
    // content so it never covers the bottom controls (sticker book / settings /
    // sound / daily card). offsetHeight is transform-independent (the entrance
    // animation uses translate); +64 covers the bottom offset + home indicator
    // + a small gap. The CSS rule is a generous static fallback.
    var sc = document.querySelector('#splash .splash-content');
    if (sc) sc.style.paddingBottom = (pill.offsetHeight + 64) + 'px';
  }

  function fire() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(choice) {
      // On accept, appinstalled cleans up. On dismiss, KEEP the pill so the parent
      // can retry instead of losing the install path for the throttle window.
      if (choice && choice.outcome === 'accepted') removePill();
      deferredPrompt = null;
    });
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    removePill();
  }

  function removePill() {
    var p = document.getElementById('install-pill');
    if (p) p.remove();
    document.body.classList.remove('ph-install-open');
    var sc = document.querySelector('#splash .splash-content');
    if (sc) sc.style.paddingBottom = '';
  }

  function init() {
    if (isInstalled()) return;
    captureBeforeInstall();
    // For iOS or browsers that already fired beforeinstallprompt at load.
    // Delayed so the splash content lands first instead of the pill popping over it.
    setTimeout(maybeShowPill, 3200);
  }

  return {
    init: init,
    fire: fire,
    dismiss: dismiss
  };
})();
