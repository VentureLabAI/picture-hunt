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

var CACHE_VERSION = 'ph-v139';
var CACHE_NAME = CACHE_VERSION + '-static';

// All files to pre-cache on install
var PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './hint-system.js',
  './storyline-mode.js',
  './parent-dashboard.js',
  './parent-dashboard.css',
  './content/rich-sound-fx.js',
  './content/seasonal-manager.js',
  './content/sticker-book.js',
  './content/sticker-book.css',
  './content/daily-challenge-streak.js',
  './content/daily-challenge-streak.css',
  './content/animations/new-celebrations.js',
  './content/animations/new-celebrations.css',
  './content/translations/languages-config.js',
  './content/translations/all-translations.js',
  './content/translations/foreign-audio-manifest.js',
  './paywall.js',
  './paywall.css',
  './progress-sync.js',
  './install-prompt.js',
  './sw-register.js',
  // Shape PNGs — Shapes/Colors stay on emoji except square/rectangle, which keep
  // their root img/<name>.png path (applyItemIllustrations skips those categories).
  './img/square.png',
  './img/rectangle.png',
  // Custom item illustrations — the ACTUAL paths the app requests. app.js
  // applyItemIllustrations() rewrites each illustrated item's img to
  // img/items/<slug>.png, so the old './img/<name>.png' entries never matched and
  // these were missing from the cache. Generated from the on-disk img/items/ set.
  './img/items/apple.png',
  './img/items/ball.png',
  './img/items/banana.png',
  './img/items/bat.png',
  './img/items/bed.png',
  './img/items/bee.png',
  './img/items/bird.png',
  './img/items/black-cat.png',
  './img/items/blanket.png',
  './img/items/book.png',
  './img/items/bread.png',
  './img/items/brush.png',
  './img/items/bunny.png',
  './img/items/butterfly.png',
  './img/items/candy-cane.png',
  './img/items/candy.png',
  './img/items/carrot.png',
  './img/items/cat.png',
  './img/items/cereal.png',
  './img/items/chair.png',
  './img/items/christmas-lights.png',
  './img/items/christmas-tree.png',
  './img/items/clock.png',
  './img/items/cookie.png',
  './img/items/couch.png',
  './img/items/crayon.png',
  './img/items/cup.png',
  './img/items/dinosaur.png',
  './img/items/dog.png',
  './img/items/door.png',
  './img/items/dress.png',
  './img/items/duck.png',
  './img/items/easter-egg.png',
  './img/items/egg.png',
  './img/items/elephant.png',
  './img/items/fish.png',
  './img/items/flower.png',
  './img/items/fork.png',
  './img/items/frog.png',
  './img/items/ghost.png',
  './img/items/gift.png',
  './img/items/glove.png',
  './img/items/hat.png',
  './img/items/jacket.png',
  './img/items/juice.png',
  './img/items/keys.png',
  './img/items/lamp.png',
  './img/items/lion.png',
  './img/items/milk.png',
  './img/items/orange.png',
  './img/items/ornament.png',
  './img/items/pants.png',
  './img/items/pig.png',
  './img/items/pillow.png',
  './img/items/plate.png',
  './img/items/pumpkin.png',
  './img/items/rabbit.png',
  './img/items/rain-boots.png',
  './img/items/rainbow.png',
  './img/items/reindeer.png',
  './img/items/remote-control.png',
  './img/items/santa.png',
  './img/items/scarf.png',
  './img/items/shelf.png',
  './img/items/shirt.png',
  './img/items/shoe.png',
  './img/items/skeleton.png',
  './img/items/snowman.png',
  './img/items/sock.png',
  './img/items/spider-web.png',
  './img/items/spider.png',
  './img/items/spoon.png',
  './img/items/star.png',
  './img/items/stocking.png',
  './img/items/sunshine.png',
  './img/items/table.png',
  './img/items/teddy-bear.png',
  './img/items/toothbrush.png',
  './img/items/towel.png',
  './img/items/treat-bag.png',
  './img/items/tv.png',
  './img/items/umbrella.png',
  './img/items/water-bottle.png',
  './img/items/window.png',
  './img/items/witch-hat.png',
  './img/items/wreath.png',
  './img/items/yogurt.png',
  // Mascot — Hunt-buddy fox poses
  './img/mascot/fox-hero.png',
  './img/mascot/fox-celebrate.png',
  './img/mascot/fox-point.png',
  './img/mascot/fox-search.png',
  './img/mascot/fox-key.png',
  './img/mascot/fox-think.png',
  // App icons
  './img/icon-192.png',
  './img/icon-512.png',
  './img/icon-180.png',
  './img/icon-32.png',
  './img/icon-16.png',
  // Category tiles (custom illustrations)
  './img/tiles/household.png', './img/tiles/animals.png', './img/tiles/food.png',
  './img/tiles/shapes.png', './img/tiles/colors.png', './img/tiles/furniture.png',
  './img/tiles/clothing.png', './img/tiles/halloween.png', './img/tiles/christmas.png',
  './img/tiles/spring.png',
  // Audio — category intros
  './audio/cat-animals.mp3',
  './audio/cat-clothing.mp3',
  './audio/cat-colors.mp3',
  './audio/cat-food.mp3',
  './audio/cat-furniture.mp3',
  './audio/cat-shapes.mp3',
  './audio/cat-things.mp3',
  './audio/cat-halloween.mp3',
  './audio/cat-christmas.mp3',
  './audio/cat-spring.mp3',
  // Audio — system prompts
  './audio/champion.mp3',
  './audio/great-job.mp3',
  './audio/lets-try-another.mp3',
  './audio/home-greeting.mp3',
  './audio/tap-to-hear.mp3',
  './audio/try-again.mp3',
  './audio/you-did-it.mp3',
  './audio/you-found-it.mp3',
  './audio/halloween-victory.mp3',
  './audio/christmas-victory.mp3',
  './audio/spring-victory.mp3',
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
  './audio/find-cereal-box.mp3',
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
  './audio/find-color-orange.mp3',
  './audio/find-black.mp3',
  './audio/find-blue.mp3',
  './audio/find-brown.mp3',
  './audio/find-green.mp3',
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
  './audio/find-shirt.mp3',
  './audio/hint-tap-lightbulb.mp3',
  './audio/keep-looking.mp3',
  './audio/lets-try-next.mp3',
  './audio/pick-category-first.mp3',
  './audio/ready-next-level.mp3',
  './audio/found-now-next.mp3',
  './audio/not-quite.mp3',
  './audio/sticker-book-empty.mp3',
  './audio/sticker-book-some.mp3',
  './audio/streak-milestone.mp3',
  './audio/stickers-amazing.mp3'
  // Removed dead cut-mode clips (sorting-safari / phonics-hunt / memory / practice /
  // round-complete) — those modules aren't loaded by index.html. Wave 10.
  // Note: find-chair, find-lamp, find-hat, find-sock already listed above (shared with Things)
];

// ═══════════════════════════════════════════════════════════════
// INSTALL — Pre-cache all static assets
// ═══════════════════════════════════════════════════════════════
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Tolerant precache: cache each asset individually so a single missing/404
      // file can't abort the entire install (which would break offline-readiness
      // and wedge the cache-version upgrade). Skips are logged, not fatal.
      return Promise.all(PRECACHE_URLS.map(function(u) {
        return cache.add(u).catch(function(e) { console.warn('[SW] precache skip:', u, e && e.message); });
      }));
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
          if (networkResponse && networkResponse.status === 200 &&
              url.origin === self.location.origin) {
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
