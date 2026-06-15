/**
 * Picture Hunt — Storyline Mode Module
 * ======================================
 * A guided narrative game mode where each "find" advances a story.
 * Instead of random item order, the child follows a themed adventure
 * with story prompts between each find.
 *
 * DESIGN PHILOSOPHY:
 *   - Story-driven: items are sequenced to tell a story
 *   - Audio-first: narrative prompts between finds (pre-reader friendly)
 *   - Themed adventures: "Help Bear find breakfast", "Space explorer", etc.
 *   - Rewarding: story conclusion celebrates the full adventure
 *   - Same AI recognition engine — just different item order + narrative
 *
 * USAGE:
 *   1. Include this file after app.js
 *   2. Call initStorylineMode() after DOMContentLoaded
 *   3. Storyline button appears on splash screen
 *   4. Selecting a story launches the game with narrative flow
 *
 * INTEGRATION POINTS:
 *   - Adds "📖 Story" button to splash screen
 *   - Overrides playCategory() flow when storyline is active
 *   - Uses speak() for narrative audio
 *   - Uses existing game screen, victory screen
 *   - Progress tracked per-story in localStorage
 *
 * REQUIRES:
 *   - speak(text, onEnd) from app.js
 *   - playClick() from app.js
 *   - CATEGORIES from app.js
 *   - showScreen(), showVictory() from app.js
 *   - Web Audio API for sound effects
 */

// ═══════════════════════════════════════════════════════════════
// STORY DEFINITIONS
// ═══════════════════════════════════════════════════════════════
// Each story has:
//   id: unique identifier
//   title: display name
//   emoji: visual anchor
//   gradient: card background
//   ageRange: "2-3", "3-5", "4-5" (determines complexity)
//   intro: opening narrative (spoken when story starts)
//   steps: ordered items with narrative bridge text
//   outro: closing narrative (spoken at victory)
//   celebrationEmoji: emoji used in confetti/celebrations
//
// Each step has:
//   item: name matching a CATEGORIES item
//   category: which category the item belongs to
//   bridge: narrative text spoken BEFORE the "can you find" prompt
//   foundText: brief celebration line spoken AFTER finding it

var STORIES = [
  {
    id: 'bear-breakfast',
    title: "Bear's Breakfast",
    emoji: '🐻',
    gradient: 'linear-gradient(140deg, #FFC93C 0%, #FF8A3D 100%)',
    ageRange: '2-3',
    intro: "Oh no! Bear just woke up and his tummy is rumbling! Let's help Bear find his breakfast! Ready? Let's go!",
    steps: [
      { item: 'cup', category: 'household', bridge: "Bear is thirsty!", foundText: "Bear can drink his milk! Yum!" },
      { item: 'banana', category: 'food', bridge: "Now Bear wants something sweet and yellow!", foundText: "A banana for Bear! Peeling it now!" },
      { item: 'cereal', category: 'food', bridge: "Bear loves crunchy cereal!", foundText: "Crunch crunch! Bear is happy!" },
      { item: 'spoon', category: 'household', bridge: "Bear needs something to eat his cereal with!", foundText: "A spoon! Now Bear can eat!" },
      { item: 'cookie', category: 'food', bridge: "One last thing for Bear... a special treat!", foundText: "A cookie! Bear's breakfast is the best!" }
    ],
    outro: "You found everything for Bear's breakfast! Bear is so full and happy! You're the best helper ever!",
    celebrationEmoji: '🍯'
  },
  {
    id: 'space-explorer',
    title: 'Space Explorer',
    emoji: '🚀',
    gradient: 'linear-gradient(140deg, #4CC9FF 0%, #6F4BFF 100%)',
    ageRange: '3-5',
    intro: "3, 2, 1, blast off! You're an astronaut on a space mission! You need to find things for your spaceship! Let's go!",
    steps: [
      { item: 'star', category: 'shapes', bridge: "Look up in the sky!", foundText: "A star! You're mapping the galaxy!" },
      { item: 'circle', category: 'shapes', bridge: "Your spaceship has round windows!", foundText: "A circle! The window is perfect!" },
      { item: 'water bottle', category: 'household', bridge: "Astronauts need water in space!", foundText: "Water bottle secured! No floating away!" },
      { item: 'red', category: 'colors', bridge: "Look at the red button on the control panel!", foundText: "Red found! Don't press that button!" },
      { item: 'book', category: 'household', bridge: "The space manual!", foundText: "The manual! Now you know which buttons to press!" },
      { item: 'dog', category: 'animals', bridge: "Even astronauts have a co-pilot! Woof woof!", foundText: "Space dog! Best co-pilot ever!" }
    ],
    outro: "Mission complete! You found everything for your spaceship! You're a real space explorer now!",
    celebrationEmoji: '🌟'
  },
  {
    id: 'color-garden',
    title: 'Color Garden',
    emoji: '🌺',
    gradient: 'linear-gradient(140deg, #2DD4A4 0%, #4CC9FF 100%)',
    ageRange: '2-3',
    intro: "Welcome to the magic color garden! Every color you find makes a new flower grow! Let's fill the garden with colors!",
    steps: [
      { item: 'red', category: 'colors', bridge: "The garden needs a red flower!", foundText: "A beautiful red rose grew!" },
      { item: 'yellow', category: 'colors', bridge: "Now the garden needs sunshine!", foundText: "A yellow sunflower popped up!" },
      { item: 'blue', category: 'colors', bridge: "The garden needs a blue flower!", foundText: "A blue flower! Like the sky!" },
      { item: 'green', category: 'colors', bridge: "Gardens need leaves!", foundText: "Green leaves everywhere!" },
      { item: 'purple', category: 'colors', bridge: "One more magic flower!", foundText: "A magical purple flower! The garden is complete!" }
    ],
    outro: "Wow! You grew every color flower in the garden! It's the most beautiful garden ever!",
    celebrationEmoji: '🌈'
  },
  {
    id: 'dino-day',
    title: "Dino's Big Day",
    emoji: '🦕',
    gradient: 'linear-gradient(140deg, #FF8A3D 0%, #FF4FA8 100%)',
    ageRange: '3-5',
    intro: "Dino is going on a big adventure today! But first, Dino needs to find some things! Can you help Dino?",
    steps: [
      { item: 'dinosaur', category: 'animals', bridge: "First, we need to find Dino's friend!", foundText: "Dino found a friend! Roar!" },
      { item: 'hat', category: 'clothing', bridge: "It's sunny outside! Dino needs a hat!", foundText: "A hat for Dino! Stylish!" },
      { item: 'orange', category: 'food', bridge: "Dino is hungry for a snack!", foundText: "An orange! Dino loves fruit!" },
      { item: 'triangle', category: 'shapes', bridge: "Dino's footprints are triangle-shaped!", foundText: "A triangle! Just like Dino's footprints!" },
      { item: 'bird', category: 'animals', bridge: "Dino sees a flying friend!", foundText: "A bird! Dino says hello!" },
      { item: 'pillow', category: 'household', bridge: "Adventures make Dino sleepy!", foundText: "A soft pillow! Time for a dino nap!" }
    ],
    outro: "Dino had the best day ever! And it's all because of you! You're an amazing helper!",
    celebrationEmoji: '🦖'
  },
  {
    id: 'bedtime-routine',
    title: 'Bedtime Routine',
    emoji: '🌙',
    gradient: 'linear-gradient(140deg, #B79CFF 0%, #FF4FA8 100%)',
    ageRange: '2-3',
    intro: "It's almost bedtime! Let's find everything we need to get ready for sleep! Are you ready?",
    steps: [
      { item: 'toothbrush', category: 'household', bridge: "First, we brush our teeth!", foundText: "Toothbrush found! Brush brush brush!" },
      { item: 'towel', category: 'household', bridge: "Time to wash up!", foundText: "A towel! Nice and clean!" },
      { item: 'teddy bear', category: 'household', bridge: "You need a bedtime buddy!", foundText: "Teddy bear! The best snuggle friend!" },
      { item: 'pillow', category: 'household', bridge: "A soft place for your head!", foundText: "Pillow found! So fluffy!" },
      { item: 'blanket', category: 'household', bridge: "One last thing to stay cozy!", foundText: "A blanket! Warm and snuggly!" }
    ],
    outro: "You found everything for bedtime! Now it's time to close your eyes and dream sweet dreams! Goodnight!",
    celebrationEmoji: '⭐'
  },
  {
    id: 'pet-shop',
    title: 'Pet Shop Day',
    emoji: '🐾',
    gradient: 'linear-gradient(140deg, #FF6B6B 0%, #FF4FA8 100%)',
    ageRange: '3-5',
    intro: "Welcome to the pet shop! We need to find things for all the animals! Can you help?",
    steps: [
      { item: 'cat', category: 'animals', bridge: "The kitty needs something to eat!", foundText: "Meow! Found the cat!" },
      { item: 'fish', category: 'animals', bridge: "The fish is swimming in its tank!", foundText: "A fish! Blub blub!" },
      { item: 'dog', category: 'animals', bridge: "Woof woof! Someone wants a walk!", foundText: "Dog found! Good boy!" },
      { item: 'rabbit', category: 'animals', bridge: "The bunny is hiding!", foundText: "A bunny! Hop hop hop!" },
      { item: 'frog', category: 'animals', bridge: "Ribbit! There's a frog in the shop!", foundText: "Found the frog! Ribbit!" },
      { item: 'duck', category: 'animals', bridge: "Quack quack! Last one!", foundText: "A duck! Quack quack!" }
    ],
    outro: "You found all the animals in the pet shop! You're the best pet shop helper! All the animals are happy!",
    celebrationEmoji: '🐾'
  },
  {
    id: 'treasure-hunt',
    title: 'Treasure Hunt',
    emoji: '🏴‍☠️',
    gradient: 'linear-gradient(140deg, #FFC93C 0%, #E04545 100%)',
    ageRange: '4-5',
    intro: "Ahoy, pirate! You're on a treasure hunt! Find each clue and you'll find the treasure! Are you ready to search?",
    steps: [
      { item: 'keys', category: 'household', bridge: "The first clue to unlock the treasure chest!", foundText: "A key! One step closer to treasure!" },
      { item: 'diamond', category: 'shapes', bridge: "The map shows a diamond shape!", foundText: "A diamond! The map is working!" },
      { item: 'red', category: 'colors', bridge: "The next clue is something red, like a pirate's flag!", foundText: "Red like a pirate flag! Arr!" },
      { item: 'lamp', category: 'household', bridge: "It's dark in the cave!", foundText: "A lamp to light the way!" },
      { item: 'hat', category: 'clothing', bridge: "Every pirate needs a hat!", foundText: "A pirate hat! Now you look the part!" },
      { item: 'book', category: 'household', bridge: "The treasure map is in a book!", foundText: "The map! X marks the spot!" },
      { item: 'plate', category: 'household', bridge: "Last clue — something shiny like a gold coin! A plate or a fork will do!", foundText: "Something shiny! The treasure is near!" }
    ],
    outro: "You found all the clues and the treasure! You're the greatest pirate explorer ever! Arr!",
    celebrationEmoji: '💎'
  },
  {
    id: 'dress-up-party',
    title: 'Dress-Up Party',
    emoji: '👗',
    gradient: 'linear-gradient(140deg, #4CC9FF 0%, #2DD4A4 100%)',
    ageRange: '2-3',
    intro: "It's dress-up party time! Let's find all the clothes and get ready to party!",
    steps: [
      { item: 'shirt', category: 'clothing', bridge: "First, a nice shirt!", foundText: "A shirt! Looking good!" },
      { item: 'pants', category: 'clothing', bridge: "Now we need pants!", foundText: "Pants found! Almost ready!" },
      { item: 'hat', category: 'clothing', bridge: "A party hat!", foundText: "A hat! So fancy!" },
      { item: 'sock', category: 'clothing', bridge: "Don't forget your socks!", foundText: "A sock! Two would be better!" },
      { item: 'shoe', category: 'household', bridge: "Shoes for dancing!", foundText: "A shoe! Time to dance!" }
    ],
    outro: "You found everything for the dress-up party! You look amazing! Let's dance!",
    celebrationEmoji: '🎉'
  }
];

// ═══════════════════════════════════════════════════════════════
// STORYLINE STATE
// ═══════════════════════════════════════════════════════════════
var storylineActive = false;
var currentStory = null;
var storyStepIndex = 0;
var storyItemsFound = 0;

// ═══════════════════════════════════════════════════════════════
// STORY PROGRESS TRACKING
// ═══════════════════════════════════════════════════════════════
function getStoryProgress() {
  try { return JSON.parse(localStorage.getItem('PH_STORY_PROGRESS') || '{}'); } catch(e) { return {}; }
}
function saveStoryProgress(data) { localStorage.setItem('PH_STORY_PROGRESS', JSON.stringify(data)); }
function recordStoryComplete(storyId) {
  var p = getStoryProgress();
  if (!p[storyId]) p[storyId] = { completed: 0, lastCompleted: null };
  p[storyId].completed++;
  p[storyId].lastCompleted = new Date().toISOString();
  saveStoryProgress(p);
}
function isStoryCompleted(storyId) {
  var p = getStoryProgress();
  return p[storyId] && p[storyId].completed > 0;
}
function getStoryCompletedCount(storyId) {
  var p = getStoryProgress();
  return (p[storyId] && p[storyId].completed) || 0;
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════
function initStorylineMode() {
  // Add storyline button to splash screen after category grid
  console.log('[PH] Storyline mode initialized');
}

// ═══════════════════════════════════════════════════════════════
// ADVENTURE TRAIL — storybook chrome wrapped around the find flow
// (fox narrator + speech bubble + a trail of step "stones"). Injected into the
// #game screen only while a story is active; the regular hunt is untouched.
// See docs/ADVENTURE-TRAIL-NOTES.md.
// ═══════════════════════════════════════════════════════════════
function questFoxSrc(pose) {
  if (pose === 'celebrate') return 'img/mascot/fox-celebrate.png';
  if (pose === 'cover') return 'img/mascot/fox-hero.png';
  return 'img/mascot/fox-point.png'; // 'guide'
}

function ensureQuestChrome() {
  var game = document.getElementById('game');
  if (!game) return null;
  var chrome = document.getElementById('quest-chrome');
  if (!chrome) {
    chrome = document.createElement('div');
    chrome.id = 'quest-chrome';
    chrome.className = 'quest-chrome';
    var targetArea = document.getElementById('target-area');
    if (targetArea) game.insertBefore(chrome, targetArea);
    else game.appendChild(chrome);
  }
  return chrome;
}

// doneCount = how many stones are checked off. The fox marker sits on the stone
// at index === doneCount (the current find, or the next one mid-celebration so
// the fox visibly "hops" forward on a success).
function renderQuestTrail(foundCurrent) {
  if (!currentStory) return '';
  var n = currentStory.steps.length;
  var doneCount = storyStepIndex + (foundCurrent ? 1 : 0);
  var html = '<div class="quest-trail" role="img" aria-label="Adventure progress: '
    + doneCount + ' of ' + n + ' found">';
  for (var i = 0; i < n; i++) {
    if (i > 0) html += '<span class="trail-link' + (i <= doneCount ? ' lit' : '') + '"></span>';
    if (i < doneCount) {
      var it = shuffledItems[i];
      var face = (it && it.img) ? '<img src="' + it.img + '" alt="">'
        : '<span class="trail-emoji">' + ((it && it.emoji) ? it.emoji : '⭐') + '</span>';
      html += '<span class="trail-node done">' + face + '</span>';
    } else if (i === doneCount) {
      html += '<span class="trail-node current"><span class="trail-fox">🦊</span></span>';
    } else {
      html += '<span class="trail-node todo"></span>';
    }
  }
  html += '</div>';
  return html;
}

// Storybook "cover page" shown while the intro narration plays (before step 1).
function renderQuestCover() {
  if (!currentStory) return;
  var chrome = ensureQuestChrome();
  if (!chrome) return;
  var game = document.getElementById('game');
  if (game) { game.classList.add('story-mode'); game.classList.add('quest-cover'); }
  chrome.innerHTML =
    '<div class="quest-cover-art">' + currentStory.emoji + '</div>'
    + '<div class="quest-cover-title">' + currentStory.title + '</div>'
    + '<div class="quest-narrator">'
    +   '<img class="quest-fox" src="' + questFoxSrc('cover') + '" alt="" aria-hidden="true">'
    +   '<div class="quest-bubble">' + currentStory.intro + '</div>'
    + '</div>'
    + renderQuestTrail(false);
}

// Per-step chrome: fox guide + bridge line + the trail (current stone glowing).
function renderQuestStep() {
  if (!currentStory) return;
  var chrome = ensureQuestChrome();
  if (!chrome) return;
  var game = document.getElementById('game');
  if (game) { game.classList.add('story-mode'); game.classList.remove('quest-cover'); }
  var step = currentStory.steps[storyStepIndex];
  chrome.innerHTML =
    '<div class="quest-header">'
    +   '<span class="quest-title">' + currentStory.emoji + ' ' + currentStory.title + '</span>'
    +   '<span class="quest-step">' + (storyStepIndex + 1) + ' / ' + currentStory.steps.length + '</span>'
    + '</div>'
    + '<div class="quest-narrator">'
    +   '<img class="quest-fox" src="' + questFoxSrc('guide') + '" alt="" aria-hidden="true">'
    +   '<div class="quest-bubble">' + step.bridge + '</div>'
    + '</div>'
    + renderQuestTrail(false);
  // page-turn-in animation (restart it each step)
  chrome.classList.remove('quest-turn');
  void chrome.offsetWidth;
  chrome.classList.add('quest-turn');
}

// On a correct find: fox celebrates, bubble shows the foundText, the current
// stone checks off and the fox hops to the next.
function renderQuestFound() {
  if (!currentStory) return;
  var chrome = document.getElementById('quest-chrome');
  if (!chrome) return;
  var step = currentStory.steps[storyStepIndex];
  var fox = chrome.querySelector('.quest-fox');
  var bubble = chrome.querySelector('.quest-bubble');
  if (fox) { fox.src = questFoxSrc('celebrate'); fox.classList.add('quest-fox-pop'); }
  if (bubble) bubble.textContent = step.foundText;
  var trail = chrome.querySelector('.quest-trail');
  if (trail) {
    var wrap = document.createElement('div');
    wrap.innerHTML = renderQuestTrail(true);
    if (wrap.firstChild) trail.replaceWith(wrap.firstChild);
  }
}

function clearQuestChrome() {
  var game = document.getElementById('game');
  if (game) { game.classList.remove('story-mode'); game.classList.remove('quest-cover'); }
  var chrome = document.getElementById('quest-chrome');
  if (chrome) chrome.remove();
}

// ═══════════════════════════════════════════════════════════════
// RENDER STORY SELECTOR
// ═══════════════════════════════════════════════════════════════
function renderStorySelector() {
  // Hide the regular splash content, show story picker
  var splashContent = document.querySelector('#splash .splash-content');
  if (!splashContent) return;

  // Save original content so we can restore it
  if (!splashContent._originalHTML) {
    splashContent._originalHTML = splashContent.innerHTML;
  }

  var premium = (typeof Paywall === 'undefined') || Paywall.isPremium();

  // Storybook "shelf" — each quest is a little book (spine + cover + page edges),
  // distinct from the category tiles. Fox hosts the shelf.
  var html = ''
    + '<div class="shelf-header">'
    +   '<img class="shelf-fox" src="img/mascot/fox-point.png" alt="" aria-hidden="true">'
    +   '<h1 class="home-title shelf-title">Pick an Adventure!</h1>'
    + '</div>';
  html += '<div class="story-shelf">';

  STORIES.forEach(function(story) {
    var completed = isStoryCompleted(story.id);
    var count = getStoryCompletedCount(story.id);
    var ageStars = story.ageRange === '2-3' ? '⭐' : (story.ageRange === '3-5' ? '⭐⭐' : '⭐⭐⭐');
    var ageLabel = ageStars + ' Ages ' + story.ageRange; // stars alone read as difficulty/quality; label it
    var locked = !premium && !(typeof Paywall !== 'undefined' && Paywall.isFreeStory(story.id));
    var dots = '';
    for (var d = 0; d < story.steps.length; d++) dots += '<span class="book-dot"></span>';

    html += '<button class="story-book' + (completed ? ' story-completed' : '') + (locked ? ' locked' : '') + '" '
      + 'onclick="playStory(\'' + story.id + '\')" aria-label="' + story.title + ' (Ages ' + story.ageRange + ')' + (locked ? ' (locked)' : '') + '">'
      + '<span class="book-spine" style="background:' + story.gradient + '"></span>'
      + '<span class="book-cover" style="background:' + story.gradient + '"><span class="book-emoji">' + story.emoji + '</span></span>'
      + '<span class="book-info">'
      +   '<span class="book-title">' + story.title + (locked ? ' 🔒' : '') + '</span>'
      +   '<span class="book-meta">' + ageLabel + ' · ' + story.steps.length + ' finds'
      +     (completed ? ' · ✅ ' + count + 'x' : '') + '</span>'
      +   '<span class="book-dots">' + dots + '</span>'
      + '</span>'
      + (completed ? '<span class="book-ribbon">✓</span>' : '')
      + '</button>';
  });

  html += '</div>';
  html += '<div class="splash-bottom">'
    + '<button class="big-btn back-btn" onclick="closeStorySelector()">🏠 Back</button>'
    + '</div>';

  splashContent.innerHTML = html;
}

function closeStorySelector() {
  var splashContent = document.querySelector('#splash .splash-content');
  if (splashContent && splashContent._originalHTML) {
    splashContent.innerHTML = splashContent._originalHTML;
    delete splashContent._originalHTML;
    // Re-render categories
    if (typeof renderSplash === 'function') renderSplash();
  }
  if (typeof playClick === 'function') playClick();
}

function openStorySelector() {
  if (typeof playClick === 'function') playClick();
  renderStorySelector();
}

// ═══════════════════════════════════════════════════════════════
// STORY GAME FLOW
// ═══════════════════════════════════════════════════════════════
function playStory(storyId) {
  if (typeof playClick === 'function') playClick();
  // Freemium gate: 1 sample quest is free, the rest are Full Access.
  if (typeof Paywall !== 'undefined' && !Paywall.isPremium() && !Paywall.isFreeStory(storyId)) {
    Paywall.show('storyline');
    return;
  }
  if (typeof stopAllPulses === 'function') stopAllPulses();

  var story = STORIES.find(function(s) { return s.id === storyId; });
  if (!story) return;

  currentStory = story;
  storyStepIndex = 0;
  storyItemsFound = 0;
  storylineActive = true;

  // Open a parent-dashboard session so story play time + per-session finds show up
  // in Recent Activity (normal hunts do this in playCategory; story mode didn't, so
  // the dashboard timeline was blank for stories). _currentSession is an app.js global.
  if (typeof dashboardStartSession === 'function') _currentSession = dashboardStartSession(story.steps[0].category);

  // Warm this story's narration clips so the first line isn't a TTS-then-buffer
  // stutter (story-* keys aren't in the global preload list).
  if (typeof preloadAudio === 'function') {
    preloadAudio('story-' + story.id + '-intro');
    preloadAudio('story-' + story.id + '-outro');
    story.steps.forEach(function(step, idx) {
      preloadAudio('story-' + story.id + '-step' + (idx + 1) + '-bridge');
      preloadAudio('story-' + story.id + '-step' + (idx + 1) + '-found');
    });
  }

  // Set up the game state to use the story's items
  // We temporarily override the category/item system
  currentCategory = story.steps[0].category;
  shuffledItems = story.steps.map(function(step) {
    // Find the actual item object from CATEGORIES
    var cat = CATEGORIES[step.category];
    var item = cat.items.find(function(i) { return i.name === step.item; });
    if (!item) {
      // Fallback: minimal item object. This should NOT happen — it means a story
      // step references a name that isn't in CATEGORIES and the child sees a ❓.
      // Surface it loudly so a future story edit can't silently regress.
      console.warn('[PH] Story "' + story.id + '" step item not in CATEGORIES: "' + step.item + '" — showing ❓.');
      item = { name: step.item, emoji: '❓' };
    }
    // Attach story metadata
    item._storyStep = step;
    item._storyCategory = step.category;
    return item;
  });
  currentIndex = 0;

  // Show game screen
  if (typeof showScreen === 'function') showScreen('game');

  // Storybook cover page while the intro narration plays
  renderQuestCover();
  // Speak the story intro (recorded voice), then show first item
  // Decode the intro clip BEFORE speaking it, so the first story line is the
  // recorded fox voice — not a lag or the robot-TTS fallback that wins the cold
  // 1200ms race when story clips aren't precached/warmed yet (owner-reported).
  var advanced = false;
  // Guard against firing after the child left the story (goHome nulls currentStory
  // + clears storylineActive). This single guard neutralizes BOTH advance paths:
  // the intro clip's onEnd AND the 12s safety timer below.
  var goFirstItem = function() { if (advanced || !storylineActive || !currentStory) return; advanced = true; showStoryItem(); };
  var speakIntro = function() {
    speakStoryAudio(story.id + '-intro', story.intro, goFirstItem);
  };
  if (typeof preloadAudio === 'function') {
    preloadAudio('story-' + story.id + '-intro').then(speakIntro).catch(speakIntro);
  } else {
    speakIntro();
  }
  // Safety: never strand the child on the cover page if the intro narration's
  // onEnd never fires (rare TTS edge) — advance to the first item after 12s.
  // Assign to autoAdvanceTimer so showScreen/goHome's cleanup cancels it on exit
  // (otherwise this orphaned timer fires goFirstItem after the child left).
  autoAdvanceTimer = setTimeout(goFirstItem, 12000);
}

function showStoryItem() {
  if (!currentStory) return; // belt-and-suspenders: child exited before this fired
  if (typeof stopAllPulses === 'function') stopAllPulses();
  if (typeof resetInactivity === 'function') resetInactivity();
  // Per-step hint reset. The hint system monkey-patches showCurrentItem (regular
  // hunts) but story mode uses showStoryItem, so without this the hint button
  // stays disabled/✅ for the rest of the quest after one use.
  if (typeof resetHints === 'function') resetHints();

  if (storyStepIndex >= currentStory.steps.length) {
    finishStory();
    return;
  }

  var step = currentStory.steps[storyStepIndex];
  var cat = CATEGORIES[step.category];
  var item = shuffledItems[storyStepIndex];

  // Temporarily set currentCategory + currentIndex to this step's target. The AI
  // recognition path (identifyObject) and the hint path both read
  // shuffledItems[currentIndex]; story mode advances storyStepIndex, so without
  // this sync every photo from step 2 on is checked against step 1's item.
  currentCategory = step.category;
  currentIndex = storyStepIndex;

  // Storybook chrome for this step (fox + bridge line + trail)
  renderQuestStep();

  // Update UI
  var targetEmoji = document.getElementById('target-emoji');
  var targetText = document.getElementById('target-text');
  var feedbackArea = document.getElementById('feedback-area');
  var progressFill = document.getElementById('progress-fill');

  if (item.img) {
    targetEmoji.innerHTML = '<img src="' + item.img + '" class="target-img" alt="' + item.name + '">';
  } else {
    targetEmoji.textContent = item.emoji;
  }

  // Find prompt + (bilingual) foreign-word badge. The step count + progress now
  // live in the quest chrome (header + trail), so there's no inline 📖 badge here.
  var promptText = (typeof promptFor === 'function') ? promptFor(item, cat) : cat.speakPrompt(item.name);
  var storyTrans = (typeof bilingualActive === 'function' && bilingualActive() && typeof getTranslationByName === 'function')
    ? getTranslationByName((typeof phTranslationLookupName === 'function') ? phTranslationLookupName(item.name, step.category) : item.name)
    : null;
  targetText.innerHTML = promptText
    + (storyTrans ? '<span class="target-translation">' + storyTrans.emoji + ' ' + storyTrans.word + '</span>' : '');
  feedbackArea.innerHTML = '';
  progressFill.style.width = ((storyStepIndex / currentStory.steps.length) * 100) + '%';

  // Reset camera UI
  var cameraInput = document.getElementById('camera-input');
  var cameraLabel = document.getElementById('camera-label');
  if (cameraInput) cameraInput.value = '';
  if (cameraLabel) {
    cameraLabel.style.display = '';
    cameraLabel.style.pointerEvents = 'auto';
    cameraLabel.style.opacity = '1';
  }
  var skipArea = document.querySelector('.skip-area');
  if (skipArea) skipArea.style.display = '';

  // Speak the bridge (recorded story voice) → find prompt (handles speakOverride
  // items like "keys") → foreign word in bilingual mode, then arm the camera.
  speakStoryAudio(currentStory.id + '-step' + (storyStepIndex + 1) + '-bridge', step.bridge, function() {
    var arm = function() {
      if (typeof startPulse === 'function' && cameraLabel) startPulse(cameraLabel, 'camera');
      if (typeof startInactivity === 'function') startInactivity();
    };
    if (typeof speakItem === 'function') {
      speakItem(item, cat, function() {
        if (typeof speakForeignWordForItem === 'function') speakForeignWordForItem(item, arm);
        else arm();
      });
    } else { arm(); }
  });
}

function repeatStoryPrompt() {
  if (typeof playClick === 'function') playClick();
  if (typeof stopAllPulses === 'function') stopAllPulses();
  if (typeof resetInactivity === 'function') resetInactivity();

  var step = currentStory.steps[storyStepIndex];
  var cat = CATEGORIES[step.category];
  var item = shuffledItems[storyStepIndex];

  speakStoryAudio(currentStory.id + '-step' + (storyStepIndex + 1) + '-bridge', step.bridge, function() {
    var cameraLabel = document.getElementById('camera-label');
    var arm = function() {
      if (typeof startPulse === 'function' && cameraLabel) startPulse(cameraLabel, 'camera');
      if (typeof startInactivity === 'function') startInactivity();
    };
    if (typeof speakItem === 'function') {
      speakItem(item, cat, function() {
        if (typeof speakForeignWordForItem === 'function') speakForeignWordForItem(item, arm);
        else arm();
      });
    } else { arm(); }
  });
}

function advanceStoryItem() {
  if (!currentStory) return; // child left the story (goHome nulled it) before this fired
  storyStepIndex++;
  if (storyStepIndex >= currentStory.steps.length) {
    finishStory();
  } else {
    showStoryItem();
  }
}

function skipStoryItem() {
  if (typeof playClick === 'function') playClick();
  if (typeof stopAllPulses === 'function') stopAllPulses();
  if (typeof resetInactivity === 'function') resetInactivity();
  speak("Let's try the next one!");
  advanceStoryItem();
}

function finishStory() {
  storylineActive = false;
  clearQuestChrome();
  // End the dashboard session here too — the victory "Home" button routes through
  // resetGame (not goHome), so without this the story session would dangle and
  // never be recorded.
  if (typeof dashboardEndSession === 'function' && typeof _currentSession !== 'undefined' && _currentSession) {
    dashboardEndSession(_currentSession, storyItemsFound);
    _currentSession = null;
  }
  recordStoryComplete(currentStory.id);

  // Progress is already recorded per-find in storylineHandlePhotoSuccess with the
  // correct category+item. The old `idx < storyItemsFound` loop here mis-credited
  // SKIPPED steps (e.g. skip step 2, find 3-5 → it credited 1,2,3 instead of the
  // real finds) — removed; recordProgress dedupes the genuine ones anyway.

  // Show victory with story outro
  var cat = CATEGORIES[currentStory.steps[0].category]; // primary category for display
  var found = storyItemsFound;
  var total = currentStory.steps.length;

  var subEl = document.getElementById('victory-sub');
  var statsEl = document.getElementById('victory-stats');

  subEl.textContent = currentStory.title + ' — Complete!';
  statsEl.innerHTML = '<div class="victory-stat">' + currentStory.emoji + ' ' + found + '/' + total
    + ' items found!' + (found >= total ? ' 🏆' : '') + '</div>';

  if (typeof showScreen === 'function') showScreen('victory');

  // Make the victory buttons story-aware: "Play Again" replays THIS story (not a
  // generic game in the last step's category); "Home" returns to the splash.
  var sid = currentStory.id;
  var againBtn = document.querySelector('#victory .victory-buttons .play-btn');
  var homeBtn = document.querySelector('#victory .victory-buttons .setup-btn');
  if (againBtn) { againBtn.innerHTML = '🔄 Play Again!'; againBtn.onclick = function() { playStory(sid); }; }
  if (homeBtn) { homeBtn.onclick = function() { if (typeof resetGame === 'function') resetGame(); }; }

  // Only celebrate "you found everything" when they actually did. A skipped/partial
  // run shows the honest "N/total" stat with no trophy (above), so the spoken outro
  // ("You found everything!") must not contradict it. On a partial run, play just
  // the victory chime — no full confetti, no celebratory outro (and no new spoken
  // line, which would fall to the robot voice per the audio convention).
  if (found >= total) {
    if (typeof celebrateCombo === 'function') {
      celebrateCombo(5000);
    } else if (typeof fireConfetti === 'function') {
      fireConfetti(5000);
    }
    if (typeof playVictorySound === 'function') playVictorySound();
    speakStoryAudio(currentStory.id + '-outro', currentStory.outro);
  } else {
    if (typeof playVictorySound === 'function') playVictorySound();
  }
}

// ═══════════════════════════════════════════════════════════════
// STORY-SPECIFIC OVERRIDES FOR GAME FLOW
// ═══════════════════════════════════════════════════════════════
// These functions intercept the normal game flow when a story is active.
// They should be called from the existing game flow functions via hooks.

function storylineHandlePhotoSuccess() {
  if (!storylineActive) return false; // Not a story — let normal flow handle it
  // Clear the hint 💡 immediately on a find. Normal hunts do this (app.js
  // hideHintButton — "don't let the 💡 linger through the celebration"); the story
  // branch returns before that call, so the button hung through the celebration.
  if (typeof hideHintButton === 'function') hideHintButton();

  storyItemsFound++;
  if (typeof _currentSession !== 'undefined' && _currentSession) _currentSession.found++;
  var step = currentStory.steps[storyStepIndex];

  // Storybook: fox celebrates, bubble shows the found line, trail stone checks off
  renderQuestFound();

  // Record progress in the item's category
  if (typeof recordProgress === 'function') {
    recordProgress(step.category, step.item);
  }

  // Story finds count toward the Daily Challenge streak too.
  if (typeof DailyStreak !== 'undefined' && DailyStreak.onItemFound) DailyStreak.onItemFound(step.category, step.item);

  // Bilingual echo on success — parity with normal hunts (app.js): after the found
  // line, replay the foreign word in the recorded coral voice + show the badge, so
  // the free Spanish hook is reinforced inside the story too. Chained on the found
  // clip's onEnd so it never overlaps (single audio channel); the auto-advance is
  // extended by the echo duration so the word isn't cut off.
  var echoItem = shuffledItems[storyStepIndex];
  var echo = (typeof bilingualActive === 'function' && bilingualActive() && typeof getTranslationByName === 'function')
    ? getTranslationByName(phTranslationLookupName(step.item, step.category)) : null;
  var echoMs = echo ? 4000 : 0;
  speakStoryAudio(currentStory.id + '-step' + (storyStepIndex + 1) + '-found', step.foundText, function() {
    if (echo && typeof speakForeignWordForItem === 'function') {
      var bubble = document.querySelector('#quest-chrome .quest-bubble');
      if (bubble) bubble.innerHTML = step.foundText + ' <span class="translation-echo">' + echo.emoji + ' ' + echo.word + '</span>';
      speakForeignWordForItem(echoItem, function(){});
    }
  });
  if (typeof playSuccess === 'function') setTimeout(function() { playSuccess(); }, 300);

  // Auto-advance after delay. Assign to autoAdvanceTimer (NOT an anonymous timer)
  // so showScreen/goHome's existing cleanup cancels it — otherwise tapping Home
  // within the window of a find fires advanceStoryItem after currentStory is nulled
  // (uncaught TypeError). The advanceStoryItem null-guard backs this up.
  if (typeof autoAdvanceTimer !== 'undefined' && autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
  autoAdvanceTimer = setTimeout(function() {
    if (typeof resetCameraUI === 'function') resetCameraUI();
    advanceStoryItem();
  }, 4500 + echoMs);

  return true; // Handled by storyline
}

function storylineHandleSkip() {
  if (!storylineActive) return false;
  skipStoryItem();
  return true;
}

function storylineHandleGoHome() {
  if (!storylineActive) return false;
  storylineActive = false;
  clearQuestChrome();
  currentStory = null;
  return false; // Let normal goHome handle the rest
}

function storylineHandleRepeat() {
  if (!storylineActive) return false;
  repeatStoryPrompt();
  return true;
}

function storylineHandleVictory() {
  if (!storylineActive) return false;
  finishStory();
  return true;
}

// ═══════════════════════════════════════════════════════════════
// STORY SOUND EFFECTS
// ═══════════════════════════════════════════════════════════════
function playStoryChime() {
  // A magical sparkly chime for story events
  if (typeof soundEnabled !== 'undefined' && !soundEnabled) return;
  try {
    if (typeof ensureAudioCtx === 'function') {
      var c = ensureAudioCtx();
      var notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
      notes.forEach(function(freq, i) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        var t = c.currentTime + i * 0.15;
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        o.connect(g); g.connect(c.destination);
        o.start(t); o.stop(t + 0.4);
      });
    }
  } catch(e) {}
}

function playPageTurnSound() {
  // A soft "page turn" sound for story step transitions
  if (typeof soundEnabled !== 'undefined' && !soundEnabled) return;
  try {
    if (typeof ensureAudioCtx === 'function') {
      var c = ensureAudioCtx();
      // White noise burst, filtered to sound like a page turn
      var bufferSize = c.sampleRate * 0.08; // 80ms
      var buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      var src = c.createBufferSource();
      src.buffer = buffer;
      var filter = c.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      var g = c.createGain();
      g.gain.value = 0.08;
      src.connect(filter);
      filter.connect(g);
      g.connect(c.destination);
      src.start();
    }
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════════
// AUDIO SCRIPT GENERATOR (for ElevenLabs pre-generation)
// ═══════════════════════════════════════════════════════════════
// This generates the list of all audio scripts that need to be
// pre-generated for storyline mode. Boss Man can feed these to
// ElevenLabs in batch.

function generateStoryAudioScripts() {
  var scripts = [];

  STORIES.forEach(function(story) {
    // Story intro
    scripts.push({
      key: 'story-' + story.id + '-intro',
      text: story.intro,
      voiceId: 'xgq15iRQWJKOQk9SOixE' // Picture Hunt voice
    });

    // Each step's bridge + found text
    story.steps.forEach(function(step, idx) {
      scripts.push({
        key: 'story-' + story.id + '-step' + (idx + 1) + '-bridge',
        text: step.bridge,
        voiceId: 'xgq15iRQWJKOQk9SOixE'
      });
      scripts.push({
        key: 'story-' + story.id + '-step' + (idx + 1) + '-found',
        text: step.foundText,
        voiceId: 'xgq15iRQWJKOQk9SOixE'
      });
    });

    // Story outro
    scripts.push({
      key: 'story-' + story.id + '-outro',
      text: story.outro,
      voiceId: 'xgq15iRQWJKOQk9SOixE'
    });
  });

  return scripts;
}

// Call this from console to get the full list:
// JSON.stringify(generateStoryAudioScripts(), null, 2)

// ═══════════════════════════════════════════════════════════════
// STORY AUDIO PLAYBACK
// ═══════════════════════════════════════════════════════════════
// Play pre-generated story audio, fall back to speechSynthesis.
// Never use new Audio() — fails on iOS outside user gesture (LESSONS-LEARNED).
function speakStoryAudio(key, text, onEnd) {
  var audioKey = 'story-' + key;
  // Already decoded → play immediately.
  if (typeof audioBufferCache !== 'undefined' && audioBufferCache[audioKey] && typeof playBuffer === 'function') {
    playBuffer(audioKey, onEnd);
    return;
  }
  // Not ready yet → wait briefly for the buffer, then play; fall back to TTS.
  // (Same cold-start-safe path the main prompts use, so the first story line
  // isn't a robotic-voice stutter.)
  if (typeof playKeyWhenReady === 'function') {
    playKeyWhenReady(audioKey, text, onEnd);
    return;
  }
  if (typeof preloadAudio === 'function') preloadAudio(audioKey);
  if (typeof speakFallback === 'function') speakFallback(text, onEnd);
  else if (onEnd) onEnd();
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS (for integration into app.js)
// ═══════════════════════════════════════════════════════════════
// These are global functions that app.js can call for integration.
// See memory/research/storyline-integration.md for exact code changes.

// Already defined above as global functions:
// - initStorylineMode()
// - openStorySelector()
// - closeStorySelector()
// - playStory(storyId)
// - showStoryItem()
// - advanceStoryItem()
// - skipStoryItem()
// - finishStory()
// - storylineHandlePhotoSuccess() → returns true if story handled it
// - storylineHandleSkip() → returns true if story handled it
// - storylineHandleGoHome() → returns true if story handled it
// - storylineHandleRepeat() → returns true if story handled it
// - generateStoryAudioScripts() → returns array of audio scripts
// - playStoryChime() → sparkly chime sound
// - playPageTurnSound() → page turn sound
