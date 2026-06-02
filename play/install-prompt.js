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

  function isInstalled() {
    // Standalone display mode → already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.navigator && window.navigator.standalone === true) return true;
    return false;
  }

  function dismissed() {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  }

  function recentlyShown() {
    var last = localStorage.getItem(LAST_SHOWN_KEY);
    if (!last) return false;
    var diff = Date.now() - new Date(last).getTime();
    return diff < THROTTLE_DAYS * 24 * 3600 * 1000;
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
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
    var splash = document.getElementById('splash');
    if (!splash || !splash.classList.contains('active')) {
      // Wait for splash to become active
      setTimeout(maybeShowPill, 500);
      return;
    }
    showPill();
  }

  function showPill() {
    if (document.getElementById('install-pill')) return;
    localStorage.setItem(LAST_SHOWN_KEY, new Date().toISOString());

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
    document.body.classList.add('ph-install-open');
    setTimeout(function() { pill.classList.add('install-pill-visible'); }, 50);
  }

  function fire() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function() {
      removePill();
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
