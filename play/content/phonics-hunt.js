// ============================================================
// Picture Hunt — Phonics Hunt Module (Drop-in)
// ============================================================
// Teaches letter-sound correspondence: the #1 pre-reading skill.
// Shows a letter, plays its sound ("B says buh!"), then asks
// "Can you find something that starts with B?" The kid takes a
// photo, and the AI validates the object starts with that sound.
//
// INTEGRATION:
//   1. Add <link rel="stylesheet" href="content/phonics-hunt.css?v=N">
//      and <script src="content/phonics-hunt.js?v=N"></script> to index.html
//   2. In onSplashEnter(), add:
//      if (typeof PhonicsHunt !== 'undefined') PhonicsHunt.addButtonToSplash();
//   3. That's it! The module handles its own UI and game flow.
//   4. Requires: CATEGORIES, speak(), playSuccess(), playMiss(),
//      playClick(), ensureAudioCtx(), playTone(), soundEnabled,
//      PROXY_URL, GEMINI_API_KEY from app.js
// ============================================================

var PhonicsHunt = (function() {
  'use strict';

  // ── Storage keys ──
  var BEST_KEY = 'PH_PHONICS_BEST_LEVEL';
  var PLAYS_KEY = 'PH_PHONICS_PLAYS';
  var LETTERS_FOUND_KEY = 'PH_PHONICS_LETTERS_FOUND';

  // ── Letter data ──
  // Each letter: sound (phoneme), examples (common findable objects), color
  var LETTERS = {
    B: { sound: 'buh', examples: ['ball','banana','book','bed','brush','bear','blanket','bottle'], color: '#e91e63', emoji: '🅱️' },
    C: { sound: 'kuh', examples: ['car','cat','cookie','cup','chair','crayon','clock','candle'], color: '#9c27b0', emoji: '©️' },
    D: { sound: 'duh', examples: ['dog','duck','door','dinosaur','doll','drum','dress'], color: '#ff9800', emoji: '🇩' },
    F: { sound: 'fff', examples: ['flower','fork','fish','frog','fan','flag','food'], color: '#4caf50', emoji: '🇫' },
    H: { sound: 'huh', examples: ['hat','house','heart','horse','hammer','hand'], color: '#00bcd4', emoji: '🅷' },
    J: { sound: 'juh', examples: ['juice','jacket','jar','jelly','jump rope'], color: '#ff5722', emoji: '🇯' },
    K: { sound: 'kuh', examples: ['key','kite','kitchen','king','kitten','kettle'], color: '#795548', emoji: '🇰' },
    L: { sound: 'luh', examples: ['lamp','leaf','lemon','lollipop','lock','lego'], color: '#3f51b5', emoji: '🇱' },
    M: { sound: 'mmm', examples: ['milk','moon','mirror','monkey','mug','marker','mango'], color: '#e040fb', emoji: '🇲' },
    N: { sound: 'nnn', examples: ['napkin','nose','necklace','nut','nest','nickel'], color: '#607d8b', emoji: '🇳' },
    P: { sound: 'puh', examples: ['pillow','pig','plate','pizza','pen','potato','purse'], color: '#f44336', emoji: '🅿️' },
    R: { sound: 'rrr', examples: ['robot','rainbow','ring','rabbit','rock','remote','rose'], color: '#ff6f00', emoji: '🇷' },
    S: { sound: 'sss', examples: ['shoe','star','spoon','sock','sun','strawberry','soap','shirt'], color: '#2196f3', emoji: '🇸' },
    T: { sound: 'tuh', examples: ['tree','turtle','toothbrush','teddy bear','towel','toy','truck','tomato'], color: '#009688', emoji: '🇹' },
    W: { sound: 'wuh', examples: ['water bottle','window','watch','whale','wand','wagon'], color: '#8bc34a', emoji: '🇼' },
    A: { sound: 'ahh', examples: ['apple','ant','alligator','airplane','anchor'], color: '#f44336', emoji: '🅰️' },
    E: { sound: 'ehh', examples: ['egg','elephant','elbow','envelope','earring'], color: '#2196f3', emoji: '🇪' },
    O: { sound: 'ahh', examples: ['orange','olive','ostrich','oven','otter'], color: '#ff9800', emoji: '🅾️' }
  };

  // Level configs: which letters + how many to find per round
  var LEVELS = [
    { letters: ['B','M','S'], findCount: 2 },                    // L1: 3 easiest
    { letters: ['B','M','S','D','P'], findCount: 3 },              // L2: 5 letters
    { letters: ['B','M','S','D','P','C','H','R'], findCount: 4 },  // L3: 8 letters
    { letters: ['B','M','S','D','P','C','H','R','T','L','F','W'], findCount: 5 }, // L4: 12
    { letters: Object.keys(LETTERS), findCount: 6 }               // L5: all 18
  ];

  // ── State ──
  var active = false;
  var currentLevel = 1;
  var currentLetterIdx = 0;
  var roundLetters = [];
  var foundThisRound = [];
  var roundScore = 0;
  var totalRounds = 0;
  var isWaitingForPhoto = false;

  // DOM
  var overlay = null;

  // ── Utilities ──

  function getBestLevel() {
    try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10); } catch(e) { return 0; }
  }
  function saveBestLevel(lvl) {
    try { var best = getBestLevel(); if (lvl > best) localStorage.setItem(BEST_KEY, String(lvl)); } catch(e) {}
  }
  function getPlays() {
    try { return parseInt(localStorage.getItem(PLAYS_KEY) || '0', 10); } catch(e) { return 0; }
  }
  function savePlays() {
    try { localStorage.setItem(PLAYS_KEY, String(getPlays() + 1)); } catch(e) {}
  }
  function getLettersFound() {
    try { return JSON.parse(localStorage.getItem(LETTERS_FOUND_KEY) || '[]'); } catch(e) { return []; }
  }
  function saveLetterFound(letter) {
    try {
      var found = getLettersFound();
      if (found.indexOf(letter) === -1) { found.push(letter); localStorage.setItem(LETTERS_FOUND_KEY, JSON.stringify(found)); }
    } catch(e) {}
  }

  // ── Sound helpers ──

  function phPlayClick() { if (typeof playClick === 'function') playClick(); }
  function phPlaySuccess() { if (typeof playSuccess === 'function') playSuccess(); }
  function phPlayMiss() { if (typeof playMiss === 'function') playMiss(); }
  function phSpeak(text, cb) { if (typeof speak === 'function') speak(text, cb); else if (cb) cb(); }

  // Play the letter sound as a tone (phonics reinforcement)
  function playLetterTone(letter) {
    if (typeof soundEnabled !== 'undefined' && !soundEnabled) return;
    // Different pitch per letter to make it musical
    var baseNote = 523; // C5
    var idx = Object.keys(LETTERS).indexOf(letter);
    if (idx < 0) idx = 0;
    var freq = baseNote + (idx * 40); // step up by ~semitone
    if (typeof playTone === 'function') {
      playTone(freq, 0.4, 0, 'triangle', 0.3);
    }
  }

  // Play a "phonics fanfare" for letter completion
  function playPhonicsFanfare() {
    if (typeof soundEnabled !== 'undefined' && !soundEnabled) return;
    if (typeof playTone === 'function') {
      playTone(523, 0.15, 0, 'sine', 0.2);
      playTone(659, 0.15, 0.1, 'sine', 0.2);
      playTone(784, 0.15, 0.2, 'sine', 0.2);
      playTone(1047, 0.3, 0.3, 'sine', 0.25);
    }
  }

  // ── AI Validation ──

  function buildPhonicsPrompt(letter) {
    var data = LETTERS[letter];
    if (!data) return '';
    var examples = data.examples.join(', ');
    // The AI needs to check: does the photographed object's name START with this letter sound?
    return 'Does the main object in this photo have a name that starts with the letter ' + letter + ' (the ' + data.sound + ' sound)? '
      + 'For example, ' + examples + ' all start with ' + letter + '. '
      + 'The object can be a real item, a toy, a stuffed animal, a picture in a book, or a drawing. '
      + 'The object does not need to be centered — a toddler took this photo. '
      + 'But if the object clearly starts with a different letter sound, say No. '
      + 'Respond with ONLY "Yes" or "No" on the first line. On the second line, name the object you see and which letter it starts with.';
  }

  function callGemini(base64img, letter, callback) {
    var apiKey = '';
    var endpoint = '';

    if (typeof PROXY_URL !== 'undefined' && PROXY_URL) {
      endpoint = PROXY_URL;
    } else if (typeof GEMINI_API_KEY !== 'undefined' && GEMINI_API_KEY) {
      apiKey = GEMINI_API_KEY;
      endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    } else {
      callback({ yes: false, text: 'No API access' });
      return;
    }

    var prompt = buildPhonicsPrompt(letter);
    var payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: base64img } }
        ]
      }],
      generationConfig: { temperature: 0 }
    };

    var headers = { 'Content-Type': 'application/json' };
    var url = endpoint;

    if (endpoint.indexOf('generativelanguage.googleapis.com') !== -1) {
      // Direct API call
    } else {
      // Worker call — send as JSON body
      headers['X-Letter'] = letter;
    }

    fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      try {
        var text = '';
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          var parts = data.candidates[0].content.parts;
          for (var i = 0; i < parts.length; i++) {
            if (parts[i].text) text += parts[i].text;
          }
        } else if (data.error) {
          callback({ yes: false, text: 'API error: ' + (data.error.message || JSON.stringify(data.error)) });
          return;
        }
        var firstLine = text.split('\n')[0].trim().toLowerCase();
        var yes = firstLine.indexOf('yes') === 0;
        callback({ yes: yes, text: text });
      } catch(e) {
        callback({ yes: false, text: 'Parse error' });
      }
    })
    .catch(function(err) {
      callback({ yes: false, text: 'Network error: ' + err.message });
    });
  }

  // ── UI ──

  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'phonics-hunt-overlay';
    overlay.className = 'screen phonics-hunt-overlay';
    overlay.innerHTML = '<div class="phonics-screen">'
      // Intro
      + '<div class="phonics-intro" id="ph-intro">'
      + '<button class="home-btn" onclick="PhonicsHunt.goHome()">🏠</button>'
      + '<div class="phonics-title">🔤 Phonics Hunt!</div>'
      + '<div class="phonics-subtitle">Find things that start with each letter!</div>'
      + '<div class="phonics-level-badge" id="ph-level-badge"></div>'
      + '<div class="phonics-letters-preview" id="ph-letters-preview"></div>'
      + '<button class="phonics-btn phonics-start-btn" onclick="PhonicsHunt.startGame()">🔤 Let\'s Hunt Letters!</button>'
      + '<button class="phonics-btn phonics-quit-btn" onclick="PhonicsHunt.goHome()">🏠 Home</button>'
      + '</div>'
      // Game
      + '<div class="phonics-game hidden" id="ph-game">'
      + '<div class="phonics-game-header">'
      + '<button class="home-btn" onclick="PhonicsHunt.goHome()">🏠</button>'
      + '<div class="phonics-progress-text" id="ph-progress"></div>'
      + '</div>'
      + '<div class="phonics-progress-bar"><div class="phonics-progress-fill" id="ph-progress-fill"></div></div>'
      + '<div class="phonics-letter-display" id="ph-letter-display"></div>'
      + '<div class="phonics-sound-text" id="ph-sound-text"></div>'
      + '<div class="phonics-examples" id="ph-examples"></div>'
      + '<div class="phonics-prompt" id="ph-prompt"></div>'
      + '<div class="phonics-feedback" id="ph-feedback"></div>'
      + '<div class="phonics-camera" id="ph-camera">'
      + '<label class="big-btn camera-btn phonics-camera-btn">'
      + '📷'
      + '<input type="file" accept="image/*" capture="environment" id="ph-camera-input" onchange="PhonicsHunt.handlePhoto(this)">'
      + '</label>'
      + '</div>'
      + '<div class="phonics-photo-preview hidden" id="ph-photo-preview">'
      + '<img id="ph-preview-img">'
      + '<div class="phonics-preview-btns">'
      + '<button class="phonics-btn phonics-submit-btn" onclick="PhonicsHunt.submitPhoto()">✅ Yes!</button>'
      + '<button class="phonics-btn phonics-redo-btn" onclick="PhonicsHunt.retakePhoto()">📷 Try Again</button>'
      + '</div>'
      + '</div>'
      + '<div class="phonics-loading hidden" id="ph-loading">'
      + '<div class="spinner"></div>'
      + '<p>Looking at your photo...</p>'
      + '</div>'
      + '</div>'
      // Victory
      + '<div class="phonics-victory hidden" id="ph-victory">'
      + '<div class="phonics-victory-title">🎉 Super Speller! 🎉</div>'
      + '<div class="phonics-victory-emoji">🔤⭐🔤</div>'
      + '<div class="phonics-victory-sub" id="ph-victory-sub"></div>'
      + '<div class="phonics-victory-letters" id="ph-victory-letters"></div>'
      + '<div class="phonics-victory-stats" id="ph-victory-stats"></div>'
      + '<button class="phonics-btn phonics-again-btn" onclick="PhonicsHunt.playAgain()">🔄 Play Again!</button>'
      + '<button class="phonics-btn phonics-quit-btn" onclick="PhonicsHunt.goHome()">🏠 Home</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function showOverlay() {
    createOverlay();
    overlay.classList.add('active');
  }
  function hideOverlay() {
    if (overlay) overlay.classList.remove('active');
  }
  function showSection(id) {
    ['ph-intro', 'ph-game', 'ph-victory'].forEach(function(sid) {
      var el = document.getElementById(sid);
      if (el) el.classList.toggle('hidden', sid !== id);
    });
  }

  // ── Intro / Level Select ──

  function renderIntro() {
    var badge = document.getElementById('ph-level-badge');
    if (badge) badge.textContent = 'Level ' + currentLevel;

    var preview = document.getElementById('ph-letters-preview');
    if (preview) {
      var letters = LEVELS[currentLevel - 1].letters;
      var html = '<div class="phonics-preview-letters">';
      letters.forEach(function(l) {
        var d = LETTERS[l];
        html += '<div class="phonics-preview-letter" style="border-color:' + d.color + '">'
          + '<span class="phonics-preview-char" style="color:' + d.color + '">' + l + '</span>'
          + '<span class="phonics-preview-emoji">' + d.emoji + '</span>'
          + '</div>';
      });
      html += '</div>';
      preview.innerHTML = html;
    }
  }

  // ── Game Flow ──

  function startGame() {
    active = true;
    foundThisRound = [];
    currentLetterIdx = 0;
    roundScore = 0;
    totalRounds = 0;

    var levelConfig = LEVELS[currentLevel - 1];
    // Shuffle letters for variety
    roundLetters = levelConfig.letters.slice();
    for (var i = roundLetters.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = roundLetters[i]; roundLetters[i] = roundLetters[j]; roundLetters[j] = t;
    }

    // Only need to find `findCount` letters (picks from the full set)
    roundLetters = roundLetters.slice(0, levelConfig.findCount);

    showSection('ph-game');
    presentLetter();
    savePlays();
  }

  function presentLetter() {
    if (currentLetterIdx >= roundLetters.length) {
      showVictory();
      return;
    }

    var letter = roundLetters[currentLetterIdx];
    var data = LETTERS[letter];
    isWaitingForPhoto = true;

    // Update progress
    var prog = document.getElementById('ph-progress');
    if (prog) prog.textContent = (currentLetterIdx + 1) + ' of ' + roundLetters.length;

    var fill = document.getElementById('ph-progress-fill');
    if (fill) fill.style.width = ((currentLetterIdx / roundLetters.length) * 100) + '%';

    // Show big letter
    var display = document.getElementById('ph-letter-display');
    if (display) {
      display.innerHTML = '<span class="phonics-big-letter" style="color:' + data.color + '">' + letter + '</span>';
    }

    // Show sound text
    var soundText = document.getElementById('ph-sound-text');
    if (soundText) {
      soundText.textContent = letter + ' says "' + data.sound + '"!';
    }

    // Show example hints (2-3 examples as emojis or text)
    var exEl = document.getElementById('ph-examples');
    if (exEl) {
      var hints = data.examples.slice(0, 3);
      var hintHtml = '<div class="phonics-hint-label">Like:</div><div class="phonics-hints">';
      hints.forEach(function(h) {
        hintHtml += '<span class="phonics-hint-item">' + h + '</span>';
      });
      hintHtml += '</div>';
      exEl.innerHTML = hintHtml;
    }

    // Prompt
    var promptEl = document.getElementById('ph-prompt');
    if (promptEl) {
      promptEl.textContent = 'Can you find something that starts with ' + letter + '?';
    }

    // Reset feedback and camera
    var fb = document.getElementById('ph-feedback');
    if (fb) fb.innerHTML = '';

    var cam = document.getElementById('ph-camera');
    if (cam) cam.classList.remove('hidden');

    var preview = document.getElementById('ph-photo-preview');
    if (preview) preview.classList.add('hidden');

    var loading = document.getElementById('ph-loading');
    if (loading) loading.classList.add('hidden');

    // Audio: play letter sound + prompt
    playLetterTone(letter);
    setTimeout(function() {
      phSpeak(letter + ' says ' + data.sound + '!', function() {
        setTimeout(function() {
          phSpeak('Can you find something that starts with ' + letter + '?');
        }, 300);
      });
    }, 500);
  }

  // ── Photo handling ──

  var currentPhotoBase64 = null;

  function handlePhoto(input) {
    if (!input.files || !input.files[0]) return;
    phPlayClick();

    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      var dataUrl = e.target.result;
      currentPhotoBase64 = dataUrl.split(',')[1]; // strip data:image/...;base64,

      // Show preview
      var img = document.getElementById('ph-preview-img');
      if (img) img.src = dataUrl;

      var cam = document.getElementById('ph-camera');
      if (cam) cam.classList.add('hidden');

      var preview = document.getElementById('ph-photo-preview');
      if (preview) preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be retaken
    input.value = '';
  }

  function retakePhoto() {
    phPlayClick();
    currentPhotoBase64 = null;
    var cam = document.getElementById('ph-camera');
    if (cam) cam.classList.remove('hidden');
    var preview = document.getElementById('ph-photo-preview');
    if (preview) preview.classList.add('hidden');
  }

  function submitPhoto() {
    if (!currentPhotoBase64 || !isWaitingForPhoto) return;
    phPlayClick();
    isWaitingForPhoto = false;

    var letter = roundLetters[currentLetterIdx];

    // Hide preview, show loading
    var preview = document.getElementById('ph-photo-preview');
    if (preview) preview.classList.add('hidden');
    var loading = document.getElementById('ph-loading');
    if (loading) loading.classList.remove('hidden');

    callGemini(currentPhotoBase64, letter, function(result) {
      var loading2 = document.getElementById('ph-loading');
      if (loading2) loading2.classList.add('hidden');

      var fb = document.getElementById('ph-feedback');
      if (result.yes) {
        // Success!
        phPlaySuccess();
        roundScore++;
        totalRounds++;
        saveLetterFound(letter);
        foundThisRound.push(letter);

        if (fb) {
          fb.innerHTML = '<div class="phonics-feedback-success">✅ Yes! That starts with ' + letter + '! 🎉</div>';
        }

        phSpeak('Yes! That starts with ' + letter + '!', function() {
          setTimeout(function() {
            currentLetterIdx++;
            currentPhotoBase64 = null;
            presentLetter();
          }, 1500);
        });
      } else {
        // Miss
        phPlayMiss();
        totalRounds++;
        if (fb) {
          fb.innerHTML = '<div class="phonics-feedback-miss">❌ Hmm, try again! Find something starting with ' + letter + '</div>';
        }
        phSpeak('Hmm, try again! Find something that starts with ' + letter, function() {
          isWaitingForPhoto = true;
          var cam = document.getElementById('ph-camera');
          if (cam) cam.classList.remove('hidden');
          currentPhotoBase64 = null;
        });
      }
    });
  }

  // ── Victory ──

  function showVictory() {
    active = false;
    showSection('ph-victory');

    var levelConfig = LEVELS[currentLevel - 1];
    var perfect = roundScore === roundLetters.length;

    playPhonicsFanfare();
    if (typeof triggerCelebration === 'function') triggerCelebration();

    var sub = document.getElementById('ph-victory-sub');
    if (sub) sub.textContent = perfect
      ? 'Perfect! You found all ' + roundScore + ' letters! ⭐'
      : 'You found ' + roundScore + ' out of ' + roundLetters.length + ' letters!';

    var lettersEl = document.getElementById('ph-victory-letters');
    if (lettersEl) {
      var html = '';
      foundThisRound.forEach(function(l) {
        var d = LETTERS[l];
        html += '<div class="phonics-victory-letter" style="border-color:' + d.color + ';color:' + d.color + '">' + l + '</div>';
      });
      lettersEl.innerHTML = html;
    }

    var stats = document.getElementById('ph-victory-stats');
    if (stats) {
      var totalFound = getLettersFound().length;
      var totalLetters = Object.keys(LETTERS).length;
      stats.innerHTML = '<div class="phonics-stat">Letters you\'ve found: ' + totalFound + ' / ' + totalLetters + '</div>';
    }

    // Level up?
    if (perfect && currentLevel < LEVELS.length) {
      currentLevel++;
      saveBestLevel(currentLevel);
      var levelUpHtml = '<div class="phonics-level-up">🌟 Level ' + currentLevel + ' unlocked! 🌟</div>';
      if (stats) stats.innerHTML += levelUpHtml;
      phSpeak('Level ' + currentLevel + ' unlocked! Amazing!');
    } else {
      saveBestLevel(currentLevel);
      phSpeak('Great job! You found ' + roundScore + ' letters!');
    }
  }

  // ── Navigation ──

  function playAgain() {
    phPlayClick();
    startGame();
  }

  function goHome() {
    phPlayClick();
    active = false;
    hideOverlay();
    if (typeof navigate === 'function') navigate('splash');
  }

  // ── Splash button ──

  function addButtonToSplash() {
    var grid = document.getElementById('category-grid');
    if (!grid) return;
    // Don't add duplicate
    if (document.getElementById('phonics-hunt-splash-btn')) return;

    var best = getBestLevel();
    var label = best > 0 ? '🔤 Phonics L' + (best + 1) : '🔤 Phonics Hunt';

    var btn = document.createElement('button');
    btn.id = 'phonics-hunt-splash-btn';
    btn.className = 'phonics-splash-btn';
    btn.innerHTML = label + '<span>Find things by letter sound!</span>';
    btn.onclick = function() {
      phPlayClick();
      currentLevel = Math.min(getBestLevel() + 1, LEVELS.length);
      showOverlay();
      renderIntro();
      showSection('ph-intro');
      phSpeak('Phonics Hunt! Find things that start with each letter!');
    };
    // Insert after categories, before any other game mode buttons
    grid.appendChild(btn);
  }

  // ── Public API ──

  return {
    addButtonToSplash: addButtonToSplash,
    startGame: startGame,
    handlePhoto: handlePhoto,
    submitPhoto: submitPhoto,
    retakePhoto: retakePhoto,
    playAgain: playAgain,
    goHome: goHome
  };
})();
