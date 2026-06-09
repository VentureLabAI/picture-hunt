// ============================================================
// Picture Hunt — Sticker Book 📕✨
// A collectible sticker album that tracks every item found.
// Each found item becomes a sticker in the album.
// Closes the core gameplay loop: find → celebrate → COLLECT.
// ============================================================
//
// HOW IT WORKS:
// - Every time a kid finds an item, it gets a sticker in their album
// - Stickers show the item emoji + a sparkle animation when first earned
// - The Sticker Book screen shows all categories with progress
// - Tapping a category shows all stickers (found = colorful, not found = silhouette)
// - Total sticker count shown on splash screen as persistent motivation
//
// STORAGE:
// - Uses PH_STICKERS in localStorage (same pattern as PH_PROGRESS)
// - Format: { household: { shoe: true, cup: true }, animals: { dog: true } }
// - This is SEPARATE from PH_PROGRESS — stickers persist forever,
//   progress can be reset per round. Stickers are the permanent collection.
//
// INTEGRATION:
// 1. Add <script src="content/sticker-book.js?v=55"></script> to index.html
// 2. Call StickerBook.init() in the DOMContentLoaded handler
// 3. Call StickerBook.earn(catId, itemName) when an item is found
// 4. Add sticker-book.css to index.html <head>
// 5. Call StickerBook.addButtonToSplash() after renderSplash()
// ============================================================

var StickerBook = (function() {

  // ═══════════════════════════════════════════════════════════════
  // STORAGE
  // ═══════════════════════════════════════════════════════════════
  var STORAGE_KEY = 'PH_STICKERS';

  function getAll() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) { return {}; }
  }

  function saveAll(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function hasSticker(catId, itemName) {
    var data = getAll();
    return !!(data[catId] && data[catId][itemName]);
  }

  function earnSticker(catId, itemName) {
    var data = getAll();
    if (!data[catId]) data[catId] = {};
    var isNew = !data[catId][itemName];
    data[catId][itemName] = true;
    saveAll(data);
    return isNew; // returns true if this is a NEW sticker (first time found)
  }

  function getCategoryCount(catId) {
    var data = getAll();
    return data[catId] ? Object.keys(data[catId]).length : 0;
  }

  function getTotalCount() {
    var data = getAll();
    var total = 0;
    Object.keys(data).forEach(function(catId) {
      total += Object.keys(data[catId]).length;
    });
    return total;
  }

  function getTotalPossible() {
    var total = 0;
    if (typeof CATEGORIES !== 'undefined') {
      Object.keys(CATEGORIES).forEach(function(catId) {
        total += CATEGORIES[catId].items.length;
      });
    }
    return total;
  }

  // ═══════════════════════════════════════════════════════════════
  // EARN ANIMATION — pop-in sticker when found during gameplay
  // ═══════════════════════════════════════════════════════════════
  function showEarnAnimation(emoji, itemName, img) {
    var el = document.createElement('div');
    el.className = 'sticker-earn-popup';
    el.innerHTML = '<div class="sticker-earn-icon">📕</div>'
      + '<div class="sticker-earn-emoji">'
        + (img ? '<img src="' + img + '" class="sticker-earn-img" alt="">' : emoji)
        + '</div>'
      + '<div class="sticker-earn-label">Sticker!</div>';
    document.body.appendChild(el);

    // Auto-remove after animation
    setTimeout(function() { el.remove(); }, 2200);
  }

  // ═══════════════════════════════════════════════════════════════
  // STICKER BOOK SCREEN — full album view
  // ═══════════════════════════════════════════════════════════════
  function openBook() {
    if (typeof playClick === 'function') playClick();

    // Remove existing if any
    var existing = document.getElementById('sticker-book-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'sticker-book-overlay';
    overlay.className = 'sticker-book-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) closeBook(); };

    var modal = document.createElement('div');
    modal.className = 'sticker-book-modal';

    // Header
    var totalCount = getTotalCount();
    var totalPossible = getTotalPossible();
    var header = document.createElement('div');
    header.className = 'sticker-book-header';
    header.innerHTML = '<div class="sticker-book-title">📕 My Stickers</div>'
      + '<div class="sticker-book-count">' + totalCount + '/' + totalPossible + '</div>'
      + '<div class="sticker-book-progress-bar"><div class="sticker-book-progress-fill" style="width:'
      + (totalPossible > 0 ? Math.round((totalCount / totalPossible) * 100) : 0) + '%"></div></div>';
    modal.appendChild(header);

    // Category sections
    if (typeof CATEGORIES !== 'undefined' && typeof CATEGORY_ORDER !== 'undefined') {
      CATEGORY_ORDER.forEach(function(catId) {
        var cat = CATEGORIES[catId];
        var catCount = getCategoryCount(catId);
        var catTotal = cat.items.length;

        var section = document.createElement('div');
        section.className = 'sticker-category-section';

        // Category header — tappable to expand
        var catHeader = document.createElement('button');
        catHeader.className = 'sticker-cat-header';
        catHeader.style.background = cat.gradient;
        catHeader.innerHTML = '<span class="sticker-cat-emoji">' + cat.emoji + '</span>'
          + '<span class="sticker-cat-name">' + cat.name + '</span>'
          + '<span class="sticker-cat-count">' + catCount + '/' + catTotal + '</span>';
        catHeader.onclick = function() { toggleCategory(section); };
        section.appendChild(catHeader);

        // Sticker grid (collapsed by default for performance)
        var grid = document.createElement('div');
        grid.className = 'sticker-grid collapsed';

        cat.items.forEach(function(item) {
          var found = hasSticker(catId, item.name);
          var slot = document.createElement('div');
          slot.className = 'sticker-slot' + (found ? ' found' : ' unfound');
          // Show the real illustration when collected (emoji fallback); locked = ❓
          var face = found
            ? (item.img ? '<img src="' + item.img + '" class="sticker-img" alt="' + item.name + '">' : item.emoji)
            : '❓';
          slot.innerHTML = '<div class="sticker-emoji">' + face + '</div>'
            + '<div class="sticker-name">' + (found ? item.name : '???') + '</div>';
          if (found && item.d >= 3) {
            slot.classList.add('rare');
            slot.innerHTML = '<div class="sticker-emoji">' + face + '</div>'
              + '<div class="sticker-name">' + item.name + '</div>'
              + '<div class="sticker-rarity">⭐⭐⭐</div>';
          } else if (found && item.d === 2) {
            slot.classList.add('uncommon');
          }
          grid.appendChild(slot);
        });

        section.appendChild(grid);
        modal.appendChild(section);
      });
    }

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'sticker-close-btn';
    closeBtn.textContent = '🏠 Home';
    closeBtn.onclick = closeBook;
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Voice announcement
    if (typeof speak === 'function') {
      if (totalCount >= totalPossible && totalPossible > 0) {
        speak('You collected all the stickers! Amazing!');
      } else if (totalCount > 0) {
        speak('You have ' + totalCount + ' stickers! Keep hunting!');
      } else {
        speak('Your sticker book is empty! Find items to earn stickers!');
      }
    }
  }

  function toggleCategory(section) {
    if (typeof playClick === 'function') playClick();
    var grid = section.querySelector('.sticker-grid');
    if (grid) {
      grid.classList.toggle('collapsed');
    }
  }

  function closeBook() {
    var el = document.getElementById('sticker-book-overlay');
    if (el) el.remove();
  }

  // ═══════════════════════════════════════════════════════════════
  // SPLASH SCREEN INTEGRATION — sticker count badge + book button
  // ═══════════════════════════════════════════════════════════════
  function addButtonToSplash() {
    var totalCount = getTotalCount();

    // Sticker book button in the splash bottom bar (create once). This is the
    // reachable entry point — the title badge below sits on .home-title, which the
    // vertically-centered splash can clip off-screen, so the live count rides on
    // the button too.
    var bottom = document.querySelector('.splash-bottom');
    if (bottom && !document.getElementById('sticker-book-btn')) {
      // Own labeled row, stacked BELOW the Settings/Sound icons, so the "book"
      // clearly reads as the kid's sticker collection (not a generic book icon).
      var shelf = document.createElement('div');
      shelf.className = 'sticker-shelf';
      var btn = document.createElement('button');
      btn.id = 'sticker-book-btn';
      btn.className = 'sticker-shelf-btn';
      btn.setAttribute('aria-label', 'Stickers — your collection album');
      btn.innerHTML = '<span class="sticker-shelf-icon" aria-hidden="true">📕</span>'
        + '<span class="sticker-shelf-label">Stickers</span>'
        + '<span class="sticker-btn-count" hidden></span>';
      btn.onclick = openBook;
      shelf.appendChild(btn);
      bottom.parentNode.insertBefore(shelf, bottom.nextSibling);
    }
    // Live count bubble on the book button.
    var btnCount = document.querySelector('#sticker-book-btn .sticker-btn-count');
    if (btnCount) {
      if (totalCount > 0) { btnCount.textContent = totalCount; btnCount.hidden = false; }
      else { btnCount.hidden = true; }
    }

    // Sticker count badge on the home title. This MUST refresh on every call —
    // it can NOT be gated behind the book-button guard above, or it never appears
    // once the button exists (the common path: kid starts at 0 stickers, earns
    // some, returns to splash — the early-return used to skip this entirely).
    var title = document.querySelector('.home-title');
    if (title) {
      var badge = document.getElementById('sticker-count-badge');
      if (totalCount > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.id = 'sticker-count-badge';
          badge.className = 'sticker-count-badge';
          badge.onclick = openBook;
          title.appendChild(badge);
        }
        badge.textContent = '📕' + totalCount; // keep the count live as it grows
      } else if (badge) {
        badge.remove();
      }
    }

    // Per-category sticker counts on the category cards (also refreshed every call).
    updateCategoryCardBadges();
  }

  function updateCategoryCardBadges() {
    if (typeof CATEGORIES === 'undefined' || typeof CATEGORY_ORDER === 'undefined') return;
    var cards = document.querySelectorAll('.category-card');
    cards.forEach(function(card, idx) {
      if (idx >= CATEGORY_ORDER.length) return;
      var catId = CATEGORY_ORDER[idx];
      var catCount = getCategoryCount(catId);
      var existing = card.querySelector('.sticker-cat-badge');
      if (catCount > 0) {
        if (!existing) {
          existing = document.createElement('div');
          existing.className = 'sticker-cat-badge';
          card.appendChild(existing);
        }
        existing.textContent = '📕' + catCount; // keep per-category count live
      } else if (existing) {
        existing.remove();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // VICTORY SCREEN INTEGRATION — show new stickers earned this round
  // ═══════════════════════════════════════════════════════════════
  function addStickersToVictory(catId) {
    var statsEl = document.getElementById('victory-stats');
    if (!statsEl) return;

    var catCount = getCategoryCount(catId);
    var catTotal = (typeof CATEGORIES !== 'undefined' && CATEGORIES[catId]) ? CATEGORIES[catId].items.length : 0;

    var stickerDiv = document.createElement('div');
    stickerDiv.className = 'victory-sticker-row';
    stickerDiv.innerHTML = '<span class="victory-sticker-icon">📕</span> '
      + catCount + '/' + catTotal + ' stickers collected';

    if (catCount >= catTotal) {
      stickerDiv.innerHTML += ' 🏆 Complete!';
      stickerDiv.classList.add('complete');
    }

    statsEl.appendChild(stickerDiv);
  }

  // ═══════════════════════════════════════════════════════════════
  // INIT — call from DOMContentLoaded
  // ═══════════════════════════════════════════════════════════════
  function init() {
    // Hook into the existing recordProgress to auto-earn stickers
    var originalRecordProgress = typeof recordProgress === 'function' ? recordProgress : null;

    if (originalRecordProgress) {
      // Override recordProgress to also earn stickers
      // We do this carefully — save the original and wrap it
      window._originalRecordProgress = originalRecordProgress;
      window.recordProgress = function(catId, itemName) {
        // Call original first
        window._originalRecordProgress(catId, itemName);
        // Then earn sticker
        var isNew = earnSticker(catId, itemName);
        if (isNew) {
          // Find the item's illustration (emoji fallback) for the earn animation
          var emoji = '⭐';
          var img = null;
          if (typeof CATEGORIES !== 'undefined' && CATEGORIES[catId]) {
            var item = CATEGORIES[catId].items.find(function(i) { return i.name === itemName; });
            if (item) { emoji = item.emoji; img = item.img || null; }
          }
          // Show sticker earn popup (short, doesn't block gameplay)
          showEarnAnimation(emoji, itemName, img);
        }
      };
    }

    // Add button to splash on init
    // (also called after renderSplash, which rebuilds the DOM)
    addButtonToSplash();

    console.log('[StickerBook] Initialized — ' + getTotalCount() + ' stickers collected');
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    init: init,
    earn: earnSticker,
    has: hasSticker,
    getCount: getCategoryCount,
    getTotal: getTotalCount,
    open: openBook,
    close: closeBook,
    addButtonToSplash: addButtonToSplash,
    addStickersToVictory: addStickersToVictory,
    showEarnAnimation: showEarnAnimation
  };

})();
