/**
 * Difficulty Levels UI Implementation
 * Drop this code into app.js and style.css as indicated.
 */

/* =====================================================================
   CSS (Add to style.css)
   ===================================================================== */
/*
.difficulty-selector {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 10px 0 20px;
}

.diff-btn {
  background: rgba(255, 255, 255, 0.5);
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 25px;
  padding: 12px 20px;
  font-size: 1.2rem;
  font-family: inherit;
  font-weight: bold;
  color: #555;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.diff-btn.active {
  background: #fffbce;
  border-color: #ff9800;
  color: #d35400;
  transform: scale(1.1);
  box-shadow: 0 6px 15px rgba(255, 152, 0, 0.3);
}
*/

/* =====================================================================
   JAVASCRIPT (Add to app.js)
   ===================================================================== */

// 1. Add global state tracking (near the top with other globals)
// var currentDifficulty = localStorage.getItem('PH_DIFFICULTY') || 'medium';

// 2. Add setter function (anywhere in app.js)
window.setDifficulty = function(level) {
  if (typeof currentDifficulty !== 'undefined') {
    currentDifficulty = level;
    localStorage.setItem('PH_DIFFICULTY', level);
    if (typeof playUiSound === 'function') playUiSound();
    
    // Optional: play a sound clip based on difficulty
    // if (level === 'easy') speak('Easy mode!');
    // else if (level === 'medium') speak('Medium mode!');
    // else speak('Hard mode!');
    
    renderSplash(); // Re-render the splash screen to highlight the button
  }
};

// 3. Inject into renderSplash() 
// In the function `renderSplash()`, locate where `var html = '';` starts.
// Add this block before rendering the category grid:
/*
  var diffHtml = `
    <div class="difficulty-selector">
      <button class="diff-btn ${currentDifficulty === 'easy' ? 'active' : ''}" onclick="setDifficulty('easy')">⭐ Easy</button>
      <button class="diff-btn ${currentDifficulty === 'medium' ? 'active' : ''}" onclick="setDifficulty('medium')">⭐⭐ Medium</button>
      <button class="diff-btn ${currentDifficulty === 'hard' ? 'active' : ''}" onclick="setDifficulty('hard')">⭐⭐⭐ Hard</button>
    </div>
  `;
  
  // Then inject `diffHtml` into the DOM, e.g., below `<h1 class="home-title">Choose a Category</h1>`
  // Example: document.querySelector('.home-title').insertAdjacentHTML('afterend', diffHtml);
*/

// 4. Update the queue limit in startCategory()
/*
  // Inside startCategory(catId), replace `var q = [].concat(cat.items);` with:
  
  var q = [].concat(cat.items);
  // Shuffle to ensure variety
  q.sort(function() { return Math.random() - 0.5; });
  
  var limit = q.length;
  if (currentDifficulty === 'easy') limit = 5;
  if (currentDifficulty === 'medium') limit = 10;
  // hard uses all items
  
  activeGame.queue = q.slice(0, Math.min(limit, q.length));
  
  // Note: if you want to filter items by difficulty later, you could do:
  // q = q.filter(item => !item.level || item.level === currentDifficulty);
*/
