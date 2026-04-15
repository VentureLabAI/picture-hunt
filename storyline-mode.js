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
    gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    ageRange: '2-3',
    intro: "Oh no! Bear just woke up and his tummy is rumbling! Let's help Bear find his breakfast! Ready? Let's go!",
    steps: [
      { item: 'cup', category: 'household', bridge: "Bear is thirsty! Can you find something for Bear to drink from?", foundText: "Bear can drink his milk! Yum!" },
      { item: 'banana', category: 'food', bridge: "Now Bear wants something sweet and yellow! Can you find a banana for Bear?", foundText: "A banana for Bear! Peeling it now!" },
      { item: 'cereal', category: 'food', bridge: "Bear loves crunchy cereal! Can you find a cereal box?", foundText: "Crunch crunch! Bear is happy!" },
      { item: 'spoon', category: 'household', bridge: "Bear needs something to eat his cereal with! Can you find a spoon?", foundText: "A spoon! Now Bear can eat!" },
      { item: 'cookie', category: 'food', bridge: "One last thing for Bear... a special treat! Can you find a cookie?", foundText: "A cookie! Bear's breakfast is the best!" }
    ],
    outro: "You found everything for Bear's breakfast! Bear is so full and happy! You're the best helper ever!",
    celebrationEmoji: '🍯'
  },
  {
    id: 'space-explorer',
    title: 'Space Explorer',
    emoji: '🚀',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    ageRange: '3-5',
    intro: "3, 2, 1, blast off! You're an astronaut on a space mission! You need to find things for your spaceship! Let's go!",
    steps: [
      { item: 'star', category: 'shapes', bridge: "Look up in the sky! Can you find a star shape for your space map?", foundText: "A star! You're mapping the galaxy!" },
      { item: 'circle', category: 'shapes', bridge: "Your spaceship has round windows! Can you find a circle?", foundText: "A circle! The window is perfect!" },
      { item: 'bottle', category: 'household', bridge: "Astronauts need water in space! Can you find a water bottle?", foundText: "Water bottle secured! No floating away!" },
      { item: 'red', category: 'colors', bridge: "Can you find something red? Like the red button on the control panel!", foundText: "Red found! Don't press that button!" },
      { item: 'book', category: 'household', bridge: "The space manual! Can you find a book?", foundText: "The manual! Now you know which buttons to press!" },
      { item: 'dog', category: 'animals', bridge: "Even astronauts have a co-pilot! Can you find a dog? Woof woof!", foundText: "Space dog! Best co-pilot ever!" }
    ],
    outro: "Mission complete! You found everything for your spaceship! You're a real space explorer now!",
    celebrationEmoji: '🌟'
  },
  {
    id: 'color-garden',
    title: 'Color Garden',
    emoji: '🌺',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    ageRange: '2-3',
    intro: "Welcome to the magic color garden! Every color you find makes a new flower grow! Let's fill the garden with colors!",
    steps: [
      { item: 'red', category: 'colors', bridge: "The garden needs a red flower! Can you find something red?", foundText: "A beautiful red rose grew!" },
      { item: 'yellow', category: 'colors', bridge: "Now the garden needs sunshine! Can you find something yellow?", foundText: "A yellow sunflower popped up!" },
      { item: 'blue', category: 'colors', bridge: "The garden needs a blue flower! Can you find something blue?", foundText: "A blue flower! Like the sky!" },
      { item: 'green', category: 'colors', bridge: "Gardens need leaves! Can you find something green?", foundText: "Green leaves everywhere!" },
      { item: 'purple', category: 'colors', bridge: "One more magic flower! Can you find something purple?", foundText: "A magical purple flower! The garden is complete!" }
    ],
    outro: "Wow! You grew every color flower in the garden! It's the most beautiful garden ever!",
    celebrationEmoji: '🌈'
  },
  {
    id: 'dino-day',
    title: "Dino's Big Day",
    emoji: '🦕',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    ageRange: '3-5',
    intro: "Dino is going on a big adventure today! But first, Dino needs to find some things! Can you help Dino?",
    steps: [
      { item: 'dinosaur', category: 'animals', bridge: "First, we need to find Dino's friend! Can you find a dinosaur?", foundText: "Dino found a friend! Roar!" },
      { item: 'hat', category: 'clothing', bridge: "It's sunny outside! Dino needs a hat! Can you find one?", foundText: "A hat for Dino! Stylish!" },
      { item: 'orange', category: 'food', bridge: "Dino is hungry for a snack! Can you find an orange?", foundText: "An orange! Dino loves fruit!" },
      { item: 'triangle', category: 'shapes', bridge: "Dino's footprints are triangle-shaped! Can you find a triangle?", foundText: "A triangle! Just like Dino's footprints!" },
      { item: 'bird', category: 'animals', bridge: "Dino sees a flying friend! Can you find a bird?", foundText: "A bird! Dino says hello!" },
      { item: 'pillow', category: 'household', bridge: "Adventures make Dino sleepy! Can you find a pillow?", foundText: "A soft pillow! Time for a dino nap!" }
    ],
    outro: "Dino had the best day ever! And it's all because of you! You're an amazing helper!",
    celebrationEmoji: '🦖'
  },
  {
    id: 'bedtime-routine',
    title: 'Bedtime Routine',
    emoji: '🌙',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    ageRange: '2-3',
    intro: "It's almost bedtime! Let's find everything we need to get ready for sleep! Are you ready?",
    steps: [
      { item: 'toothbrush', category: 'household', bridge: "First, we brush our teeth! Can you find a toothbrush?", foundText: "Toothbrush found! Brush brush brush!" },
      { item: 'towel', category: 'household', bridge: "Time to wash up! Can you find a towel?", foundText: "A towel! Nice and clean!" },
      { item: 'teddy bear', category: 'household', bridge: "You need a bedtime buddy! Can you find a teddy bear?", foundText: "Teddy bear! The best snuggle friend!" },
      { item: 'pillow', category: 'household', bridge: "A soft place for your head! Can you find a pillow?", foundText: "Pillow found! So fluffy!" },
      { item: 'blanket', category: 'household', bridge: "One last thing to stay cozy! Can you find a blanket?", foundText: "A blanket! Warm and snuggly!" }
    ],
    outro: "You found everything for bedtime! Now it's time to close your eyes and dream sweet dreams! Goodnight!",
    celebrationEmoji: '⭐'
  },
  {
    id: 'pet-shop',
    title: 'Pet Shop Day',
    emoji: '🐾',
    gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    ageRange: '3-5',
    intro: "Welcome to the pet shop! We need to find things for all the animals! Can you help?",
    steps: [
      { item: 'cat', category: 'animals', bridge: "The kitty needs something to eat! But first, can you find the cat?", foundText: "Meow! Found the cat!" },
      { item: 'fish', category: 'animals', bridge: "The fish is swimming in its tank! Can you find a fish?", foundText: "A fish! Blub blub!" },
      { item: 'dog', category: 'animals', bridge: "Woof woof! Someone wants a walk! Can you find a dog?", foundText: "Dog found! Good boy!" },
      { item: 'rabbit', category: 'animals', bridge: "The bunny is hiding! Can you find a rabbit?", foundText: "A bunny! Hop hop hop!" },
      { item: 'frog', category: 'animals', bridge: "Ribbit! There's a frog in the shop! Can you find it?", foundText: "Found the frog! Ribbit!" },
      { item: 'duck', category: 'animals', bridge: "Quack quack! Last one! Can you find a duck?", foundText: "A duck! Quack quack!" }
    ],
    outro: "You found all the animals in the pet shop! You're the best pet shop helper! All the animals are happy!",
    celebrationEmoji: '🐾'
  },
  {
    id: 'treasure-hunt',
    title: 'Treasure Hunt',
    emoji: '🏴‍☠️',
    gradient: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
    ageRange: '4-5',
    intro: "Ahoy, pirate! You're on a treasure hunt! Find each clue and you'll find the treasure! Are you ready to search?",
    steps: [
      { item: 'key', category: 'household', bridge: "The first clue! Find a key to unlock the treasure chest!", foundText: "A key! One step closer to treasure!" },
      { item: 'diamond', category: 'shapes', bridge: "The map shows a diamond shape! Can you find a diamond?", foundText: "A diamond! The map is working!" },
      { item: 'red', category: 'colors', bridge: "The next clue is something red, like a pirate's flag!", foundText: "Red like a pirate flag! Arr!" },
      { item: 'lamp', category: 'household', bridge: "It's dark in the cave! Can you find a lamp?", foundText: "A lamp to light the way!" },
      { item: 'hat', category: 'clothing', bridge: "Every pirate needs a hat! Can you find one?", foundText: "A pirate hat! Now you look the part!" },
      { item: 'book', category: 'household', bridge: "The treasure map is in a book! Can you find one?", foundText: "The map! X marks the spot!" },
      { item: 'coin', category: 'household', bridge: "Last clue — find something shiny like a gold coin! A plate or a fork will do!", foundText: "Something shiny! The treasure is near!" }
    ],
    outro: "You found all the clues and the treasure! You're the greatest pirate explorer ever! Arr!",
    celebrationEmoji: '💎'
  },
  {
    id: 'dress-up-party',
    title: 'Dress-Up Party',
    emoji: '👗',
    gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
    ageRange: '2-3',
    intro: "It's dress-up party time! Let's find all the clothes and get ready to party!",
    steps: [
      { item: 'shirt', category: 'clothing', bridge: "First, a nice shirt! Can you find a shirt?", foundText: "A shirt! Looking good!" },
      { item: 'pants', category: 'clothing', bridge: "Now we need pants! Can you find some pants?", foundText: "Pants found! Almost ready!" },
      { item: 'hat', category: 'clothing', bridge: "A party hat! Can you find a hat?", foundText: "A hat! So fancy!" },
      { item: 'sock', category: 'clothing', bridge: "Don't forget your socks! Can you find a sock?", foundText: "A sock! Two would be better!" },
      { item: 'shoe', category: 'household', bridge: "Shoes for dancing! Can you find a shoe?", foundText: "A shoe! Time to dance!" }
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

  var html = '<h1 class="home-title">📖 Pick a Story!</h1>';
  html += '<div class="story-grid">';

  STORIES.forEach(function(story) {
    var completed = isStoryCompleted(story.id);
    var count = getStoryCompletedCount(story.id);
    var ageLabel = story.ageRange === '2-3' ? '⭐' : (story.ageRange === '3-5' ? '⭐⭐' : '⭐⭐⭐');

    html += '<button class="story-card' + (completed ? ' story-completed' : '') + '" '
      + 'style="background:' + story.gradient + '" '
      + 'onclick="playStory(\'' + story.id + '\')">'
      + '<div class="story-emoji">' + story.emoji + '</div>'
      + '<div class="story-info">'
      + '<div class="story-name">' + story.title + '</div>'
      + '<div class="story-meta">' + ageLabel + ' · ' + story.steps.length + ' finds'
      + (completed ? ' · ✅ ' + count + 'x' : '')
      + '</div>'
      + '</div></button>';
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
  if (typeof stopAllPulses === 'function') stopAllPulses();

  var story = STORIES.find(function(s) { return s.id === storyId; });
  if (!story) return;

  currentStory = story;
  storyStepIndex = 0;
  storyItemsFound = 0;
  storylineActive = true;

  // Set up the game state to use the story's items
  // We temporarily override the category/item system
  currentCategory = story.steps[0].category;
  shuffledItems = story.steps.map(function(step) {
    // Find the actual item object from CATEGORIES
    var cat = CATEGORIES[step.category];
    var item = cat.items.find(function(i) { return i.name === step.item; });
    if (!item) {
      // Fallback: create a minimal item object
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

  // Speak the story intro, then show first item
  speak(story.intro, function() {
    showStoryItem();
  });
}

function showStoryItem() {
  if (typeof stopAllPulses === 'function') stopAllPulses();
  if (typeof resetInactivity === 'function') resetInactivity();

  if (storyStepIndex >= currentStory.steps.length) {
    finishStory();
    return;
  }

  var step = currentStory.steps[storyStepIndex];
  var cat = CATEGORIES[step.category];
  var item = shuffledItems[storyStepIndex];

  // Temporarily set currentCategory to this step's category for AI prompt
  currentCategory = step.category;

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

  // Show story step indicator
  var stepIndicator = '📖 ' + (storyStepIndex + 1) + '/' + currentStory.steps.length;
  targetText.innerHTML = '<span class="story-badge">' + stepIndicator + '</span> ' + cat.speakPrompt(item.name);
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

  // Speak the bridge text, then the find prompt
  speak(step.bridge, function() {
    speak(cat.speakPrompt(item.name), function() {
      console.log('[PH] Story prompt spoken for: ' + item.name);
      if (typeof startPulse === 'function' && cameraLabel) {
        startPulse(cameraLabel, 'camera');
      }
      if (typeof startInactivity === 'function') startInactivity();
    });
  });
}

function repeatStoryPrompt() {
  if (typeof playClick === 'function') playClick();
  if (typeof stopAllPulses === 'function') stopAllPulses();
  if (typeof resetInactivity === 'function') resetInactivity();

  var step = currentStory.steps[storyStepIndex];
  var cat = CATEGORIES[step.category];
  var item = shuffledItems[storyStepIndex];

  speak(step.bridge, function() {
    speak(cat.speakPrompt(item.name), function() {
      var cameraLabel = document.getElementById('camera-label');
      if (typeof startPulse === 'function' && cameraLabel) {
        startPulse(cameraLabel, 'camera');
      }
      if (typeof startInactivity === 'function') startInactivity();
    });
  });
}

function advanceStoryItem() {
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
  recordStoryComplete(currentStory.id);

  // Record progress for each found item in their categories
  shuffledItems.forEach(function(item, idx) {
    if (idx < storyItemsFound) {
      if (typeof recordProgress === 'function') {
        recordProgress(item._storyCategory, item.name);
      }
    }
  });

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

  // Enhanced celebration
  if (typeof celebrateCombo === 'function') {
    celebrateCombo(5000);
  } else if (typeof fireConfetti === 'function') {
    fireConfetti(5000);
  }
  if (typeof playVictorySound === 'function') playVictorySound();

  speak(currentStory.outro);
}

// ═══════════════════════════════════════════════════════════════
// STORY-SPECIFIC OVERRIDES FOR GAME FLOW
// ═══════════════════════════════════════════════════════════════
// These functions intercept the normal game flow when a story is active.
// They should be called from the existing game flow functions via hooks.

function storylineHandlePhotoSuccess() {
  if (!storylineActive) return false; // Not a story — let normal flow handle it

  storyItemsFound++;
  var step = currentStory.steps[storyStepIndex];

  // Record progress in the item's category
  if (typeof recordProgress === 'function') {
    recordProgress(step.category, step.item);
  }

  // Speak the found text, then auto-advance
  speak(step.foundText);
  if (typeof playSuccess === 'function') setTimeout(function() { playSuccess(); }, 300);

  // Auto-advance after delay
  if (typeof autoAdvanceTimer !== 'undefined') {
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
  }
  setTimeout(function() {
    if (typeof resetCameraUI === 'function') resetCameraUI();
    advanceStoryItem();
  }, 4500);

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
// Attempts to play pre-generated story audio, falls back to TTS
function speakStoryAudio(key, text, onEnd) {
  // Try pre-generated audio first (same system as app.js speak())
  var audioKey = 'story-' + key;
  if (typeof playBuffer === 'function') {
    if (playBuffer(audioKey, onEnd)) return;
  }
  // Try HTML5 Audio fallback
  var src = 'audio/' + audioKey + '.mp3';
  var audio = new Audio(src);
  var done = false;
  function finish() { if (done) return; done = true; if (onEnd) onEnd(); }
  audio.onended = finish;
  audio.onerror = function() {
    // Final fallback: use TTS
    if (typeof speakFallback === 'function') {
      speakFallback(text, onEnd);
    } else if (onEnd) {
      onEnd();
    }
  };
  audio.play().then(function() {
    setTimeout(finish, (audio.duration || 5) * 1000 + 500);
  }).catch(function() {
    if (typeof speakFallback === 'function') {
      speakFallback(text, onEnd);
    } else if (onEnd) {
      onEnd();
    }
  });
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
