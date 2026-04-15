// ============================================================
// Picture Hunt! — Service Worker for Offline PWA Support
// ============================================================
// Drop-in: copy to app/ root (same directory as index.html)
// Then add registration code from sw-register.js to index.html
//
// STRATEGY:
//   - Cache-first for static assets (HTML, CSS, JS, audio, images)
//   - Network-only for API calls (Gemini/proxy — can't work offline)
//   - Stale-while-revalidate for manifest/icons
//
// WHAT WORKS OFFLINE:
//   - Full app UI loads and renders
//   - All audio prompts play
//   - Category selection, setup screen, game flow
//   - Sound effects (Web Audio API synth — no network needed)
//
// WHAT DOESN'T WORK OFFLINE:
//   - AI photo recognition (requires Gemini API)
//   - The app shows a friendly "no internet" message when AI fails
//
// CACHE VERSIONING:
//   Bump CACHE_VERSION when deploying new code.
//   Old caches are auto-deleted on activation.
// ============================================================

var CACHE_VERSION = 'ph-v2';
var CACHE_NAME = CACHE_VERSION + '-static';

// All files to pre-cache on install
var PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './hint-system.js',
  './daily-challenge.js',
  './parent-dashboard.js',
  './parent-dashboard.css',
  './content/animations/new-celebrations.js',
  './content/animations/new-celebrations.css',
  './content/translations/languages-config.js',
  './content/translations/all-translations.js',
  './sw-register.js',
  // Custom item images
  './img/blanket.png',
  './img/brush.png',
  './img/fork.png',
  './img/lamp.png',
  './img/pillow.png',
  './img/rectangle.png',
  './img/remote-control.png',
  './img/square.png',
  './img/towel.png',
  './img/water-bottle.png',
  // Audio — category intros
  './audio/cat-animals.mp3',
  './audio/cat-clothing.mp3',
  './audio/cat-colors.mp3',
  './audio/cat-food.mp3',
  './audio/cat-furniture.mp3',
  './audio/cat-shapes.mp3',
  './audio/cat-things.mp3',
  // Audio — system prompts
  './audio/champion.mp3',
  './audio/great-job.mp3',
  './audio/lets-try-another.mp3',
  './audio/pick-a-game.mp3',
  './audio/tap-to-hear.mp3',
  './audio/try-again.mp3',
  './audio/you-did-it.mp3',
  './audio/you-found-it.mp3',
  // Audio — item prompts (Things)
  './audio/find-ball.mp3',
  './audio/find-blanket.mp3',
  './audio/find-book.mp3',
  './audio/find-brush.mp3',
  './audio/find-chair.mp3',
  './audio/find-clock.mp3',
  './audio/find-crayon.mp3',
  './audio/find-cup.mp3',
  './audio/find-fork.mp3',
  './audio/find-hat.mp3',
  './audio/find-keys.mp3',
  './audio/find-lamp.mp3',
  './audio/find-pillow.mp3',
  './audio/find-plate.mp3',
  './audio/find-remote-control.mp3',
  './audio/find-shoe.mp3',
  './audio/find-sock.mp3',
  './audio/find-spoon.mp3',
  './audio/find-teddy-bear.mp3',
  './audio/find-toothbrush.mp3',
  './audio/find-towel.mp3',
  './audio/find-water-bottle.mp3',
  // Audio — item prompts (Animals)
  './audio/find-bird.mp3',
  './audio/find-cat.mp3',
  './audio/find-dinosaur.mp3',
  './audio/find-dog.mp3',
  './audio/find-duck.mp3',
  './audio/find-elephant.mp3',
  './audio/find-fish.mp3',
  './audio/find-frog.mp3',
  './audio/find-lion.mp3',
  './audio/find-pig.mp3',
  './audio/find-rabbit.mp3',
  // Audio — item prompts (Food)
  './audio/find-apple.mp3',
  './audio/find-banana.mp3',
  './audio/find-bread.mp3',
  './audio/find-carrot.mp3',
  './audio/find-cereal.mp3',
  './audio/find-cookie.mp3',
  './audio/find-egg.mp3',
  './audio/find-juice.mp3',
  './audio/find-milk.mp3',
  './audio/find-orange.mp3',
  './audio/find-yogurt.mp3',
  // Audio — item prompts (Shapes)
  './audio/find-circle.mp3',
  './audio/find-diamond.mp3',
  './audio/find-heart.mp3',
  './audio/find-rectangle.mp3',
  './audio/find-square.mp3',
  './audio/find-star.mp3',
  './audio/find-triangle.mp3',
  // Audio — item prompts (Colors)
  './audio/find-black.mp3',
  './audio/find-blue.mp3',
  './audio/find-brown.mp3',
  './audio/find-green.mp3',
  './audio/find-orange.mp3',
  './audio/find-pink.mp3',
  './audio/find-purple.mp3',
  './audio/find-red.mp3',
  './audio/find-white.mp3',
  './audio/find-yellow.mp3',
  // Audio — item prompts (Furniture)
  './audio/find-bed.mp3',
  './audio/find-couch.mp3',
  './audio/find-door.mp3',
  './audio/find-shelf.mp3',
  './audio/find-table.mp3',
  './audio/find-tv.mp3',
  './audio/find-window.mp3',
  // Audio — item prompts (Clothing)
  './audio/find-dress.mp3',
  './audio/find-glove.mp3',
  './audio/find-jacket.mp3',
  './audio/find-pants.mp3',
  './audio/find-scarf.mp3',
  './audio/find-shirt.mp3'
  // Note: find-chair, find-lamp, find-hat, find-sock already listed above (shared with Things)
];

// ═══════════════════════════════════════════════════════════════
// INSTALL — Pre-cache all static assets
// ═══════════════════════════════════════════════════════════════
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Use addAll — if any file fails, the whole install fails
      // This ensures we only go offline-ready when EVERYTHING is cached
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      // Skip waiting so new SW activates immediately
      return self.skipWaiting();
    })
  );
});

// ═══════════════════════════════════════════════════════════════
// ACTIVATE — Clean up old caches
// ═══════════════════════════════════════════════════════════════
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          // Delete any cache that doesn't match current version
          return name !== CACHE_NAME;
        }).map(function(name) {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
      );
    }).then(function() {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// ═══════════════════════════════════════════════════════════════
// FETCH — Cache-first for assets, network-only for API
// ═══════════════════════════════════════════════════════════════
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Network-only for API calls (Gemini proxy, direct Gemini API)
  if (url.hostname === 'picture-hunt-api.aidevlab3.workers.dev' ||
      url.hostname === 'generativelanguage.googleapis.com') {
    event.respondWith(
      fetch(event.request).catch(function() {
        // Return a JSON error so the app can show a friendly message
        return new Response(
          JSON.stringify({
            error: 'offline',
            message: 'No internet connection. Take a photo and try again when you are online!'
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // Cache-first for everything else (app assets, audio, images)
  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) {
        // Return cached version immediately
        // Also update the cache in the background (stale-while-revalidate)
        var fetchPromise = fetch(event.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            var responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(function() {
          // Network failed, that's fine — we already returned cached
        });
        return cachedResponse;
      }

      // Not in cache — fetch from network and cache it
      return fetch(event.request).then(function(networkResponse) {
        // Only cache successful same-origin responses
        if (networkResponse && networkResponse.status === 200 &&
            url.origin === self.location.origin) {
          var responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(function() {
        // Both cache and network failed
        // For navigation requests, return the cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        // For other requests, just fail
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ═══════════════════════════════════════════════════════════════
// MESSAGE — Handle cache updates from the app
// ═══════════════════════════════════════════════════════════════
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
