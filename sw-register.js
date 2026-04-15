// ============================================================
// Picture Hunt! — Service Worker Registration
// ============================================================
// DROP-IN INSTRUCTIONS:
//
// Option A: Add this snippet to the BOTTOM of app.js (before the closing comment):
//
//   // --- copy everything below this line into app.js ---
//
// Option B: Add as a separate <script> tag in index.html:
//   <script src="sw-register.js?v=52"></script>
//
// Either way, copy sw.js to the app/ root directory first.
// ============================================================

// Register the service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js')
      .then(function(registration) {
        console.log('[PH] Service worker registered, scope:', registration.scope);

        // Check for updates periodically (every 60 minutes)
        setInterval(function() {
          registration.update();
        }, 60 * 60 * 1000);

        // Handle updates — new SW waiting
        registration.addEventListener('updatefound', function() {
          var newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available — auto-activate on next visit
              // Don't prompt the user (toddler UX — no modals)
              console.log('[PH] New version available — will activate on next visit');

              // Optional: force immediate update (skip waiting)
              // Uncomment if you want instant updates:
              // newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(function(error) {
        // Service worker registration failed — not critical, app still works
        console.log('[PH] Service worker registration failed:', error);
      });
  });

  // When a new SW takes over, reload to get fresh assets
  var refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (!refreshing) {
      refreshing = true;
      // Only auto-reload if we're on the landing screen (not mid-game)
      var landing = document.getElementById('landing');
      if (landing && landing.classList.contains('active')) {
        window.location.reload();
      }
    }
  });
}

// ============================================================
// OFFLINE DETECTION — Show friendly message when AI can't reach server
// ============================================================
// This patches into the existing error handling. When the service worker
// returns the offline JSON error (503), the app can detect it and show
// a toddler-friendly message instead of a cryptic error.
//
// To integrate: in app.js, wherever you handle the Gemini API response,
// add this check:
//
//   if (data.error === 'offline') {
//     showOfflineMessage();
//     return;
//   }
//
// The function below creates and manages the offline UI:

function showOfflineMessage() {
  // Don't show if already showing
  if (document.getElementById('offline-msg')) return;

  var msg = document.createElement('div');
  msg.id = 'offline-msg';
  msg.style.cssText = [
    'position: fixed',
    'top: 50%',
    'left: 50%',
    'transform: translate(-50%, -50%)',
    'background: linear-gradient(135deg, #2a2a4a, #1a1a2e)',
    'border: 3px solid #feca57',
    'border-radius: 24px',
    'padding: 32px 24px',
    'text-align: center',
    'z-index: 9999',
    'max-width: 320px',
    'width: 85%',
    'box-shadow: 0 8px 32px rgba(0,0,0,0.5)',
    'animation: fadeIn 0.3s ease'
  ].join(';');

  msg.innerHTML = [
    '<div style="font-size: 4rem; margin-bottom: 12px;">📡</div>',
    '<h2 style="color: #feca57; font-size: 1.5rem; margin: 0 0 8px;">No Internet!</h2>',
    '<p style="color: rgba(255,255,255,0.8); font-size: 1.1rem; margin: 0 0 20px;">',
    'We need the internet to check your photo.<br>Try again in a moment!</p>',
    '<button onclick="this.parentElement.remove()" ',
    'style="background: #feca57; color: #1a1a2e; border: none; border-radius: 16px; ',
    'padding: 16px 40px; font-size: 1.3rem; font-weight: bold; cursor: pointer; ',
    'min-height: 60px;">OK! 👍</button>'
  ].join('');

  document.body.appendChild(msg);

  // Auto-dismiss after 5 seconds
  setTimeout(function() {
    var el = document.getElementById('offline-msg');
    if (el) el.remove();
  }, 5000);
}
