/**
 * Picture Hunt — Hint System Module
 * ====================================
 * Drop-in module that gives toddlers helpful clues when they're stuck.
 *
 * DESIGN PHILOSOPHY:
 *   - Hints are AUDIO-FIRST (toddlers can't read)
 *   - Each item has 3 hint tiers: description → location → giveaway
 *   - Hints integrate with the existing inactivity system
 *   - Visual hint button appears after first inactivity nudge
 *   - Never punishing — hints are encouraging, not "you failed"
 *
 * USAGE:
 *   1. Include this file after app.js (or paste contents into app.js)
 *   2. Call initHintSystem() after DOMContentLoaded
 *   3. The system hooks into the existing inactivity flow automatically
 *
 * INTEGRATION POINTS:
 *   - Adds a "💡" hint button to the game screen
 *   - Hooks into startInactivity() to show hint button at 15s
 *   - Uses speak() for audio delivery (pre-generated MP3 or TTS fallback)
 *   - Resets on advanceItem() / showCurrentItem()
 *
 * REQUIRES:
 *   - speak(text, onEnd) function from app.js
 *   - playClick() function from app.js
 *   - CATEGORIES object from app.js
 *   - currentCategory, currentIndex, shuffledItems globals from app.js
 */

// ═══════════════════════════════════════════════════════════════
// HINT DATA — 3 tiers per item across all categories
// ═══════════════════════════════════════════════════════════════
//
// Tier 1: Descriptive clue — what it is/does (vague)
// Tier 2: Location clue — where to find it (specific)
// Tier 3: Giveaway clue — nearly tells them (last resort)
//
// Audio key format: "hint-{category}-{item}-{tier}" e.g. "hint-household-shoe-1"
// If no pre-generated audio exists, falls back to TTS via speak()

var HINT_DATA = {
  household: {
    'shoe':            ['You wear it on your foot!', 'Look by the door!', 'It goes on your foot to go outside!'],
    'cup':             ['You drink from it!', 'Check the kitchen!', 'It holds your water or juice!'],
    'ball':            ['It bounces and rolls!', 'Look in your toy box!', 'It is round and you can throw it!'],
    'teddy bear':      ['It is soft and cuddly!', 'Check your bed or toy box!', 'It is a stuffed animal you can hug!'],
    'book':            ['It has pages with pictures!', 'Look on a shelf!', 'You read stories in it!'],
    'spoon':           ['You eat with it!', 'Check the kitchen drawer!', 'You use it to eat cereal or soup!'],
    'pillow':          ['You put your head on it!', 'Look on the bed or couch!', 'It is soft and squishy on the bed!'],
    'blanket':         ['It keeps you warm!', 'Look on the bed or couch!', 'You cover up with it at bedtime!'],
    'remote control':  ['It has lots of buttons!', 'Look near the TV!', 'You press buttons to change the TV!'],
    'toothbrush':      ['You use it every morning and night!', 'Check the bathroom!', 'You clean your teeth with it!'],
    'chair':           ['You sit on it!', 'Look around the table!', 'It has legs and a seat!'],
    'sock':            ['You wear it on your foot!', 'Check the laundry or dresser!', 'It goes on before your shoe!'],
    'hat':             ['You wear it on your head!', 'Check by the door or closet!', 'It keeps the sun off your head!'],
    'keys':            ['They make a jingly sound!', 'Check near the door or a purse!', 'You use them to open doors!'],
    'water bottle':    ['You drink from it!', 'Check the fridge or your bag!', 'It holds water and has a lid!'],
    'crayon':          ['You draw and color with it!', 'Look in your art supplies!', 'It is colorful and you draw pictures!'],
    'plate':           ['You put food on it!', 'Check the kitchen!', 'It is flat and round for eating!'],
    'towel':           ['You dry off with it!', 'Check the bathroom!', 'You use it after a bath!'],
    'lamp':            ['It makes light!', 'Look on a table or desk!', 'You turn it on when it is dark!'],
    'clock':           ['It tells you the time!', 'Look on the wall!', 'It has numbers in a circle!'],
    'fork':            ['You eat with it!', 'Check the kitchen drawer!', 'It has pointy parts to poke food!'],
    'brush':           ['You use it on your hair!', 'Check the bathroom or dresser!', 'It makes your hair neat and smooth!']
  },
  shapes: {
    'circle':    ['It is round with no corners!', 'Look for plates, wheels, or clocks!', 'It goes round and round like a ball!'],
    'square':    ['It has four sides the same size!', 'Look for boxes, windows, or blocks!', 'All four sides are the same!'],
    'triangle':  ['It has three sides and three points!', 'Look for pizza slices or roof tops!', 'It has three corners!'],
    'star':      ['It has points sticking out!', 'Look for stickers, decorations, or the sky!', 'It shines in the sky at night!'],
    'rectangle': ['It has four sides, two long and two short!', 'Look for doors, books, or phones!', 'It is like a stretched out square!'],
    'heart':     ['It is the shape of love!', 'Look for stickers, cards, or decorations!', 'You see it on valentines!'],
    'diamond':   ['It looks like a square turned sideways!', 'Look for playing cards or jewelry!', 'It is pointy at the top and bottom!']
  },
  colors: {
    'red':    ['It is the color of a fire truck!', 'Look for toys, clothes, or food!', 'Apples and strawberries are this color!'],
    'blue':   ['It is the color of the sky!', 'Look up, or find something to wear!', 'The sky and the ocean are this color!'],
    'green':  ['It is the color of grass!', 'Look outside or for a toy!', 'Leaves and frogs are this color!'],
    'yellow': ['It is the color of the sun!', 'Look for bananas or bright toys!', 'Bananas and the sun are this color!'],
    'orange': ['It is the color of a pumpkin!', 'Look for fruit or bright things!', 'Oranges and carrots are this color!'],
    'purple': ['It is the color of grapes!', 'Look for toys, clothes, or crayons!', 'Grapes and some flowers are this color!'],
    'pink':   ['It is a light, pretty color!', 'Look for toys, clothes, or flowers!', 'It is like a light red, very pretty!'],
    'white':  ['It is the color of snow!', 'Look for paper, walls, or milk!', 'Snow and clouds are this color!'],
    'black':  ['It is the color of nighttime!', 'Look for shoes, electronics, or shadows!', 'It is very dark, like the night sky!'],
    'brown':  ['It is the color of chocolate!', 'Look for wood, dirt, or teddy bears!', 'Chocolate and tree trunks are this color!']
  },
  animals: {
    'dog':      ['It says woof woof!', 'It might be a toy or a real pet!', 'It barks and wags its tail!'],
    'cat':      ['It says meow!', 'It might be a toy or a real pet!', 'It purrs and has whiskers!'],
    'duck':     ['It says quack quack!', 'Look for a rubber one in the bath!', 'It swims in the water and quacks!'],
    'dinosaur': ['It is a big creature from long ago!', 'Check your toy box!', 'It is a big lizard from long long ago!'],
    'elephant': ['It has a very long nose!', 'Check your toy box or a book!', 'It is big and gray with a long trunk!'],
    'lion':     ['It says roar!', 'Check your toy box or a book!', 'It is the king of the jungle!'],
    'pig':      ['It says oink oink!', 'Check your toy box or a book!', 'It is pink and lives on a farm!'],
    'frog':     ['It says ribbit!', 'Check your toy box or a book!', 'It is green and hops around!'],
    'rabbit':   ['It has long ears!', 'Check your toy box or a book!', 'It has long ears and hops!'],
    'bird':     ['It can fly in the sky!', 'Look outside or find a toy one!', 'It has wings and feathers!'],
    'fish':     ['It lives in the water!', 'Look for a toy or picture!', 'It swims with fins and a tail!']
  },
  food: {
    'apple':   ['It is a crunchy fruit!', 'Check the kitchen or fridge!', 'It is red or green and crunchy!'],
    'banana':  ['It is a yellow fruit!', 'Check the kitchen counter!', 'It is long, yellow, and you peel it!'],
    'orange':  ['It is a round citrus fruit!', 'Check the kitchen or fridge!', 'It is round and orange and juicy!'],
    'bread':   ['You make sandwiches with it!', 'Check the kitchen counter!', 'It comes in a loaf and you can toast it!'],
    'egg':     ['It comes from a chicken!', 'Check the fridge!', 'It is oval and you crack it open!'],
    'carrot':  ['Rabbits love to eat it!', 'Check the fridge!', 'It is long and orange!'],
    'cookie':  ['It is a yummy sweet treat!', 'Check the kitchen or pantry!', 'It is round and sweet and sometimes has chocolate chips!'],
    'cereal':  ['You eat it with milk for breakfast!', 'Check the pantry or kitchen!', 'It comes in a box and you pour it in a bowl!'],
    'milk':    ['It is white and you drink it!', 'Check the fridge!', 'It comes in a jug or carton and is white!'],
    'yogurt':  ['It is creamy and comes in a cup!', 'Check the fridge!', 'It is smooth and creamy and sometimes fruity!'],
    'juice':   ['It is a yummy drink!', 'Check the fridge!', 'It comes in a box or bottle and is fruity!']
  },
  furniture: {
    'chair':   ['You sit on it!', 'Look around the table!', 'It has four legs and a seat!'],
    'table':   ['You put things on top of it!', 'Look in the kitchen or living room!', 'You eat dinner on it!'],
    'couch':   ['It is big and soft for sitting!', 'Look in the living room!', 'The whole family can sit on it!'],
    'bed':     ['You sleep on it!', 'Look in the bedroom!', 'You lay down and sleep on it at night!'],
    'TV':      ['You watch shows on it!', 'Look in the living room!', 'It has a big screen for cartoons!'],
    'door':    ['You open it to go in and out!', 'Every room has one!', 'You push or pull it to go through!'],
    'window':  ['You can see outside through it!', 'Look at the walls!', 'It is made of glass and lets light in!'],
    'shelf':   ['Things sit on it!', 'Look on the wall or in a bookcase!', 'Books and toys sit on it!'],
    'lamp':    ['It makes light!', 'Look on a table or in the corner!', 'You turn it on when it gets dark!']
  },
  clothing: {
    'shirt':   ['You wear it on your top half!', 'Check the closet or dresser!', 'It covers your chest and arms!'],
    'pants':   ['You wear them on your legs!', 'Check the closet or dresser!', 'They cover both of your legs!'],
    'dress':   ['It is one piece you wear!', 'Check the closet!', 'Girls wear it and it goes down to the knees!'],
    'jacket':  ['You wear it when it is cold!', 'Check by the door or closet!', 'It keeps you warm when you go outside!'],
    'hat':     ['You wear it on your head!', 'Check by the door or closet!', 'It keeps the sun off your head!'],
    'glove':   ['You wear them on your hands!', 'Check by the door or closet!', 'They keep your hands warm in winter!'],
    'scarf':   ['You wear it around your neck!', 'Check the closet!', 'It wraps around your neck when it is cold!'],
    'sock':    ['You wear it inside your shoe!', 'Check the dresser or laundry!', 'It goes on your foot before the shoe!']
  }
};

// ═══════════════════════════════════════════════════════════════
// HINT STATE
// ═══════════════════════════════════════════════════════════════
var hintTier = 0;          // 0 = no hints used, 1-3 = which tier shown
var hintBtnVisible = false;
var hintCooldown = false;  // Prevent rapid tapping

// ═══════════════════════════════════════════════════════════════
// HINT UI
// ═══════════════════════════════════════════════════════════════

/**
 * Creates the hint button element and appends it to the game screen.
 * Call once during init. The button starts hidden.
 */
function createHintButton() {
  // Don't duplicate
  if (document.getElementById('hint-btn')) return;

  var btn = document.createElement('button');
  btn.id = 'hint-btn';
  btn.className = 'hint-btn';
  btn.innerHTML = '💡';
  btn.title = 'Get a hint!';
  btn.style.display = 'none';
  btn.addEventListener('click', onHintTap);

  // Insert into the game screen, after the skip area
  var gameScreen = document.getElementById('game');
  if (gameScreen) {
    gameScreen.appendChild(btn);
  }
}

/**
 * Shows the hint button with a gentle fade-in + bounce.
 */
function showHintButton() {
  var btn = document.getElementById('hint-btn');
  if (!btn) return;
  hintBtnVisible = true;
  btn.style.display = '';
  btn.classList.remove('hint-btn-exit');
  btn.classList.add('hint-btn-enter');

  // Speak encouragement on first appearance
  if (hintTier === 0) {
    speak('Need a hint? Tap the light bulb!');
  }
}

/**
 * Hides the hint button.
 */
function hideHintButton() {
  var btn = document.getElementById('hint-btn');
  if (!btn) return;
  hintBtnVisible = false;
  btn.classList.remove('hint-btn-enter');
  btn.classList.add('hint-btn-exit');
  setTimeout(function() {
    if (!hintBtnVisible) btn.style.display = 'none';
  }, 300);
}

/**
 * Resets hint state for a new item. Call from showCurrentItem().
 */
function resetHints() {
  hintTier = 0;
  hintCooldown = false;
  hideHintButton();
}

// ═══════════════════════════════════════════════════════════════
// HINT LOGIC
// ═══════════════════════════════════════════════════════════════

/**
 * Called when the hint button is tapped.
 */
function onHintTap() {
  if (hintCooldown) return;
  if (typeof playClick === 'function') playClick();

  var cat = CATEGORIES[currentCategory];
  var item = shuffledItems[currentIndex];
  if (!item) return;

  var catHints = HINT_DATA[currentCategory];
  var itemHints = catHints ? catHints[item.name] : null;
  if (!itemHints) {
    // Fallback generic hint
    speak('Keep looking! You can do it!');
    return;
  }

  // Advance to next tier (max 3)
  if (hintTier < 3) hintTier++;

  var hintText = itemHints[hintTier - 1];
  hintCooldown = true;

  // Show visual hint bubble
  showHintBubble(hintText, hintTier);

  // Speak the hint
  speak(hintText, function() {
    hintCooldown = false;

    // After tier 3, disable further hints for this item
    if (hintTier >= 3) {
      var btn = document.getElementById('hint-btn');
      if (btn) {
        btn.innerHTML = '✅';
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
      }
    } else {
      // Update button to show remaining hints
      updateHintButton();
    }
  });
}

/**
 * Displays a visual hint bubble on screen (fades out after a few seconds).
 */
function showHintBubble(text, tier) {
  // Remove old bubble
  var old = document.getElementById('hint-bubble');
  if (old) old.remove();

  var bubble = document.createElement('div');
  bubble.id = 'hint-bubble';
  bubble.className = 'hint-bubble hint-tier-' + tier;

  // Tier emoji indicator
  var tierEmojis = ['💡', '🔍', '🎯'];
  bubble.innerHTML = '<span class="hint-emoji">' + tierEmojis[tier - 1] + '</span>'
    + '<span class="hint-text">' + text + '</span>';

  var gameScreen = document.getElementById('game');
  if (gameScreen) gameScreen.appendChild(bubble);

  // Animate in
  requestAnimationFrame(function() {
    bubble.classList.add('hint-bubble-show');
  });

  // Fade out after delay (longer for higher tiers — more to process)
  var displayTime = 3000 + (tier * 1000);
  setTimeout(function() {
    bubble.classList.remove('hint-bubble-show');
    bubble.classList.add('hint-bubble-hide');
    setTimeout(function() { bubble.remove(); }, 500);
  }, displayTime);
}

/**
 * Updates hint button appearance based on remaining hints.
 */
function updateHintButton() {
  var btn = document.getElementById('hint-btn');
  if (!btn) return;

  var remaining = 3 - hintTier;
  if (remaining <= 0) {
    btn.innerHTML = '✅';
    btn.style.opacity = '0.5';
  } else {
    // Show dots for remaining hints
    btn.innerHTML = '💡' + '<span class="hint-dots">' + '•'.repeat(remaining) + '</span>';
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
  }
}

// ═══════════════════════════════════════════════════════════════
// INACTIVITY INTEGRATION
// ═══════════════════════════════════════════════════════════════
//
// The existing inactivity system fires nudges at 12s, 25s, 40s.
// The hint system hooks in at 15s to show the hint button.
//
// To integrate, add this call inside the existing inactivity interval:
//
//   if (inactivitySeconds === 15 && !hintBtnVisible) {
//     showHintButton();
//   }
//
// OR: replace the startInactivity function entirely with this enhanced version:

/**
 * Enhanced inactivity handler that includes hint button.
 * Drop-in replacement for the existing startInactivity().
 *
 * To use: rename the original startInactivity to _startInactivityOriginal,
 * then set startInactivity = startInactivityWithHints;
 */
function startInactivityWithHints() {
  // Use existing stop/reset logic
  if (typeof stopInactivity === 'function') stopInactivity();
  inactivitySeconds = 0;
  inactivityActive = true;

  inactivityInterval = setInterval(function() {
    if (!inactivityActive) return;
    inactivitySeconds++;

    // 12s: existing nudge — hear again
    if (inactivitySeconds === 12) {
      if (typeof stopPulse === 'function') stopPulse('camera');
      speak('Tap here to hear it again!');
      var repeatBtn = document.querySelector('.repeat-btn');
      if (repeatBtn && typeof startPulse === 'function') startPulse(repeatBtn, 'repeat');
    }

    // 15s: NEW — show hint button
    if (inactivitySeconds === 15 && !hintBtnVisible) {
      showHintButton();
    }

    // 25s: existing nudge — try again or skip
    if (inactivitySeconds === 25) {
      if (typeof stopPulse === 'function') stopPulse('repeat');
      speak('Try again, or skip to the next one!');
      var skipBtn = document.querySelector('.skip-btn');
      if (skipBtn && typeof startPulse === 'function') startPulse(skipBtn, 'skip');
    }

    // 40s: go quiet
    if (inactivitySeconds >= 40) {
      if (typeof stopAllPulses === 'function') stopAllPulses();
      if (typeof stopInactivity === 'function') stopInactivity();
    }
  }, 1000);
}

// ═══════════════════════════════════════════════════════════════
// CSS STYLES (inject programmatically)
// ═══════════════════════════════════════════════════════════════

function injectHintStyles() {
  if (document.getElementById('hint-system-styles')) return;

  var css = document.createElement('style');
  css.id = 'hint-system-styles';
  css.textContent = `
    /* Hint Button */
    .hint-btn {
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #ffd93d 0%, #ff9500 100%);
      font-size: 2rem;
      cursor: pointer;
      z-index: 100;
      box-shadow: 0 4px 15px rgba(255, 149, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      transition: transform 0.2s ease, opacity 0.3s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .hint-btn:active {
      transform: scale(0.9);
    }

    .hint-btn-enter {
      animation: hintBounceIn 0.5s ease forwards;
    }

    .hint-btn-exit {
      animation: hintFadeOut 0.3s ease forwards;
    }

    @keyframes hintBounceIn {
      0% { transform: scale(0); opacity: 0; }
      60% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }

    @keyframes hintFadeOut {
      to { transform: scale(0.5); opacity: 0; }
    }

    .hint-dots {
      display: block;
      font-size: 0.7rem;
      line-height: 1;
      color: rgba(255,255,255,0.9);
      margin-top: -4px;
    }

    /* Hint Bubble */
    .hint-bubble {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.8);
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 20px 28px;
      border-radius: 24px;
      font-size: 1.3rem;
      text-align: center;
      z-index: 200;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      max-width: 85vw;
      line-height: 1.4;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      pointer-events: none;
    }

    .hint-bubble-show {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }

    .hint-bubble-hide {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8);
    }

    .hint-emoji {
      display: block;
      font-size: 2.5rem;
      margin-bottom: 8px;
    }

    .hint-text {
      display: block;
      font-weight: 600;
    }

    /* Tier colors — progressively warmer */
    .hint-tier-1 {
      border: 3px solid #ffd93d;
    }
    .hint-tier-2 {
      border: 3px solid #ff9500;
    }
    .hint-tier-3 {
      border: 3px solid #ff3b30;
    }

    /* Pulse animation on hint button when first shown */
    .hint-btn-enter {
      animation: hintBounceIn 0.5s ease forwards, hintPulse 2s ease-in-out 0.5s infinite;
    }

    @keyframes hintPulse {
      0%, 100% { box-shadow: 0 4px 15px rgba(255, 149, 0, 0.4); }
      50% { box-shadow: 0 4px 25px rgba(255, 149, 0, 0.8); }
    }
  `;
  document.head.appendChild(css);
}

// ═══════════════════════════════════════════════════════════════
// AUDIO KEY MAPPING (for pre-generated hint audio files)
// ═══════════════════════════════════════════════════════════════
//
// Audio files should be named: hint-{category}-{item}-{tier}.mp3
// Example: audio/hint-household-shoe-1.mp3
//
// To generate these, use the ElevenLabs scripts in:
//   memory/research/hint-audio-scripts.md
//
// For now, hints use the TTS fallback via speak() which works fine.
// Pre-generated audio can be added later for a more polished voice.

/**
 * Returns the audio key for a hint, for use with textToAudioKey/preloadAudio.
 * Add these mappings to the textToAudioKey function in app.js.
 */
function getHintAudioKey(category, itemName, tier) {
  return 'hint-' + category + '-' + itemName.replace(/ /g, '-') + '-' + tier;
}

/**
 * Returns all hint audio keys for preloading.
 */
function getAllHintAudioKeys() {
  var keys = [];
  Object.keys(HINT_DATA).forEach(function(catId) {
    Object.keys(HINT_DATA[catId]).forEach(function(itemName) {
      for (var t = 1; t <= 3; t++) {
        keys.push(getHintAudioKey(catId, itemName, t));
      }
    });
  });
  return keys;
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize the hint system. Call after DOMContentLoaded.
 */
function initHintSystem() {
  injectHintStyles();
  createHintButton();

  // Monkey-patch showCurrentItem to reset hints
  if (typeof showCurrentItem === 'function') {
    var _origShowCurrentItem = showCurrentItem;
    showCurrentItem = function() {
      resetHints();
      _origShowCurrentItem.apply(this, arguments);
    };
  }

  // Monkey-patch startInactivity to include hint system
  if (typeof startInactivity === 'function') {
    startInactivity = startInactivityWithHints;
  }

  console.log('[PH] Hint system initialized — 3-tier hints for ' +
    Object.keys(HINT_DATA).length + ' categories');
}

// Auto-init if loaded after DOMContentLoaded
if (document.readyState !== 'loading') {
  initHintSystem();
} else {
  document.addEventListener('DOMContentLoaded', initHintSystem);
}
