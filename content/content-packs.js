// ============================================================
// Picture Hunt — Complete Content Pack Registry
// All categories in one file for easy import into app.js
// Drop-in: load this before app.js, then use window.CONTENT_PACKS
// ============================================================

var CONTENT_PACKS = (function() {

  // ─────────────────────────────────────────────────────────────
  // ANIMALS (11 items)
  // ─────────────────────────────────────────────────────────────
  var animals = {
    id: 'animals',
    name: 'Animals',
    emoji: '🦁',
    color: '#FF9800',
    gradient: 'linear-gradient(135deg, #FF9800, #FF6F00)',
    description: 'Find real pets, plushies, toys, or pictures of animals in books!',
    promptTemplate: 'Look at this photo. Is there a [TARGET_ITEM] in this image? Accept real animals, toy animals, plushies, figurines, or clear pictures of the animal in a book or on a screen. Respond with \'Yes\' or \'No\' on the first line. Then, on the second line, concisely describe what you see.',
    items: [
      { id: 'dog',      name: 'Dog',       emoji: '🐶', synonyms: ['puppy','hound','doggy','pup'],            aiHint: 'Accept any breed of dog, real or stuffed/toy.', d: 1 },
      { id: 'cat',      name: 'Cat',       emoji: '🐱', synonyms: ['kitty','kitten','feline'],               aiHint: 'Accept any cat, real or stuffed/toy.', d: 1 },
      { id: 'duck',     name: 'Duck',      emoji: '🦆', synonyms: ['duckling','rubber duck'],                aiHint: 'Accept real ducks or rubber ducks/toys.', d: 1 },
      { id: 'pig',      name: 'Pig',       emoji: '🐷', synonyms: ['piglet','swine'],                        aiHint: 'Accept pig toys, plushies, or pictures.', d: 1 },
      { id: 'rabbit',   name: 'Rabbit',    emoji: '🐰', synonyms: ['bunny','hare'],                          aiHint: 'Accept bunny plushies, toys, or pictures. Look for long ears.', d: 1 },
      { id: 'dinosaur', name: 'Dinosaur',  emoji: '🦖', synonyms: ['t-rex','triceratops','stegosaurus','dino'], aiHint: 'Accept any type of dinosaur toy, plush, or picture.', d: 2 },
      { id: 'elephant', name: 'Elephant',  emoji: '🐘', synonyms: ['mammoth'],                               aiHint: 'Look for a trunk. Accept toys, plushies, or pictures.', d: 2 },
      { id: 'lion',     name: 'Lion',      emoji: '🦁', synonyms: ['cub'],                                   aiHint: 'Look for a mane for males, or just lion-like features for toys/plushies.', d: 2 },
      { id: 'frog',     name: 'Frog',      emoji: '🐸', synonyms: ['toad','tadpole'],                        aiHint: 'Accept frog toys, plushies, or pictures.', d: 2 },
      { id: 'bird',     name: 'Bird',      emoji: '🐦', synonyms: ['parrot','pigeon','eagle','chicken','owl','penguin'], aiHint: 'Accept any type of bird, real, toy, or picture.', d: 2 },
      { id: 'fish',     name: 'Fish',      emoji: '🐟', synonyms: ['goldfish','shark','whale','dolphin'],    aiHint: 'Accept any fish or marine animal toy, plush, or picture.', d: 2 }
    ],
    audio: {
      intro: "Let's find some animals!",
      items: {
        dog: 'Can you find a dog?', cat: 'Can you find a cat?', duck: 'Can you find a duck?',
        dinosaur: 'Can you find a dinosaur?', elephant: 'Can you find an elephant?', lion: 'Can you find a lion?',
        pig: 'Can you find a pig?', frog: 'Can you find a frog?', rabbit: 'Can you find a rabbit?',
        bird: 'Can you find a bird?', fish: 'Can you find a fish?'
      },
      success: {
        dog: 'Woof woof! You found the dog!', cat: 'Meow! You found the cat!', duck: 'Quack quack! You found the duck!',
        dinosaur: 'Roar! You found a dinosaur!', elephant: 'You found the elephant! So big!',
        lion: 'You found the lion! King of the jungle!', pig: 'Oink oink! You found the pig!',
        frog: 'Ribbit! You found the frog!', rabbit: 'Hoppity hop! You found the rabbit!',
        bird: 'Tweet tweet! You found a bird!', fish: 'Splish splash! You found a fish!'
      }
    }
  };

  // ─────────────────────────────────────────────────────────────
  // FOOD (11 items)
  // ─────────────────────────────────────────────────────────────
  var food = {
    id: 'food',
    name: 'Food',
    emoji: '🍎',
    color: '#E91E63',
    gradient: 'linear-gradient(135deg, #E91E63, #C2185B)',
    description: 'Find yummy food in your kitchen, fridge, or pantry!',
    promptTemplate: 'Look at this photo. Is there a [TARGET_ITEM] in this image? Accept the real food item, the food in its packaging, a toy/play food version, or a clear picture of it in a book or on a screen. For packaged items (cereal box, milk, yogurt, juice), accept any brand as long as the item type is correct. Respond with \'Yes\' or \'No\' on the first line. Then, on the second line, concisely describe what you see.',
    items: [
      { id: 'apple',      name: 'Apple',       emoji: '🍎', synonyms: ['red apple','green apple','granny smith'], aiHint: 'Accept any color apple — red, green, yellow. Real or toy.', d: 1 },
      { id: 'banana',     name: 'Banana',      emoji: '🍌', synonyms: ['plantain'],                              aiHint: 'Accept any banana — yellow, green, or brown. Peeled or unpeeled.', d: 1 },
      { id: 'orange',     name: 'Orange',      emoji: '🍊', synonyms: ['tangerine','mandarin','clementine'],       aiHint: 'Accept oranges, tangerines, clementines, mandarins — any round citrus fruit.', d: 1 },
      { id: 'bread',      name: 'Bread',       emoji: '🍞', synonyms: ['toast','loaf','sandwich bread','bun','roll'], aiHint: 'Accept any type of bread — sliced, loaf, bun, roll, toast. In a bag or on a plate.', d: 1 },
      { id: 'cookie',     name: 'Cookie',      emoji: '🍪', synonyms: ['biscuit','cookies'],                     aiHint: 'Accept any type of cookie or biscuit — packaged or on a plate.', d: 1 },
      { id: 'cereal_box', name: 'Cereal Box',  emoji: '🥣', synonyms: ['cereal','breakfast cereal'],             aiHint: 'Accept any cereal box or cereal bag — any brand. The box shape is the key identifier.', d: 1 },
      { id: 'milk',       name: 'Milk',        emoji: '🥛', synonyms: ['milk carton','milk jug','milk bottle'],  aiHint: 'Accept milk in any container — jug, carton, bottle. Any type of milk.', d: 1 },
      { id: 'juice',      name: 'Juice',       emoji: '🧃', synonyms: ['juice box','juice pouch','juice bottle','juice carton'], aiHint: 'Accept any juice container — box, pouch, bottle, carton. Any flavor.', d: 1 },
      { id: 'egg',        name: 'Egg',         emoji: '🥚', synonyms: ['eggs'],                                  aiHint: 'Accept eggs in a carton, on a plate, or loose. Raw or cooked.', d: 2 },
      { id: 'carrot',     name: 'Carrot',      emoji: '🥕', synonyms: ['carrots','baby carrot'],                 aiHint: 'Accept whole carrots, baby carrots, or chopped carrots. In a bag or loose.', d: 2 },
      { id: 'yogurt',     name: 'Yogurt',      emoji: '🫙', synonyms: ['yoghurt','yogurt cup'],                  aiHint: 'Accept any yogurt container — single cup, tube, or tub. Any brand.', d: 2 }
    ],
    audio: {
      intro: "Let's find some yummy food! Look around your kitchen!",
      items: {
        apple: 'Can you find an apple?', banana: 'Can you find a banana?', orange: 'Can you find an orange?',
        bread: 'Can you find some bread?', egg: 'Can you find an egg?', carrot: 'Can you find a carrot?',
        cookie: 'Can you find a cookie?', cereal_box: 'Can you find a cereal box?', milk: 'Can you find some milk?',
        yogurt: 'Can you find some yogurt?', juice: 'Can you find some juice?'
      },
      success: {
        apple: 'Yay! You found the apple! Apples are so yummy!', banana: 'Great job! You found the banana!',
        orange: 'Wonderful! You found the orange!', bread: 'You found the bread! Good eye!',
        egg: 'You found an egg! Eggs are amazing!', carrot: 'Yay! You found a carrot! Carrots help you see!',
        cookie: 'Mmm, you found a cookie! Yummy!', cereal_box: 'You found the cereal box! Breakfast time!',
        milk: 'You found the milk! Great job!', yogurt: 'Wonderful! You found the yogurt!',
        juice: 'You found the juice! So refreshing!'
      }
    }
  };

  // ─────────────────────────────────────────────────────────────
  // FURNITURE (9 items)
  // ─────────────────────────────────────────────────────────────
  var furniture = {
    id: 'furniture',
    name: 'Furniture',
    emoji: '🪑',
    color: '#795548',
    gradient: 'linear-gradient(135deg, #795548, #5D4037)',
    description: 'Find big things in your house!',
    promptTemplate: 'Look at this photo. Is there a [TARGET_ITEM] in this image? Accept the real furniture item, a toy/miniature version, or a clear picture of it in a book or on a screen. Respond with \'Yes\' or \'No\' on the first line. Then, on the second line, concisely describe what you see.',
    items: [
      { id: 'chair',  name: 'Chair',  emoji: '🪑', synonyms: ['seat','stool'],           aiHint: 'Accept any chair — dining, office, rocking, or toy chair.', d: 1 },
      { id: 'table',  name: 'Table',  emoji: '🪵', synonyms: ['desk','dining table'],    aiHint: 'Accept any table — dining, coffee, side, or toy table.', d: 1 },
      { id: 'couch',  name: 'Couch',  emoji: '🛋️', synonyms: ['sofa','loveseat'],        aiHint: 'Accept couch, sofa, loveseat, or miniature/toy version.', d: 1 },
      { id: 'bed',    name: 'Bed',    emoji: '🛏️', synonyms: ['bunk bed','crib'],        aiHint: 'Accept any bed — twin, bunk, crib, or toy bed.', d: 1 },
      { id: 'tv',     name: 'TV',     emoji: '📺', synonyms: ['television','screen','monitor'], aiHint: 'Accept TV, monitor, tablet screen, or picture of a TV.', d: 1 },
      { id: 'door',   name: 'Door',   emoji: '🚪', synonyms: ['gate','entrance'],        aiHint: 'Accept any door — interior, exterior, closet, or toy door.', d: 1 },
      { id: 'window', name: 'Window', emoji: '🪟', synonyms: ['skylight'],               aiHint: 'Accept any window or picture of a window.', d: 2 },
      { id: 'shelf',  name: 'Shelf',  emoji: '📚', synonyms: ['bookshelf','bookcase'],   aiHint: 'Accept shelf, bookshelf, bookcase, or toy version.', d: 2 },
      { id: 'lamp',   name: 'Lamp',   emoji: '🛋️', synonyms: ['light','light fixture'],  aiHint: 'Accept any lamp — table, floor, ceiling, or toy lamp.', d: 2 }
    ],
    audio: {
      intro: "Let's find furniture in your house!",
      items: {
        chair: 'Can you find a chair?', table: 'Can you find a table?', couch: 'Can you find a couch?',
        bed: 'Can you find a bed?', tv: 'Can you find a TV?', door: 'Can you find a door?',
        window: 'Can you find a window?', shelf: 'Can you find a shelf?', lamp: 'Can you find a lamp?'
      },
      success: {
        chair: 'You found the chair! Have a seat!', table: 'You found the table! Nice!',
        couch: 'You found the couch! So comfy!', bed: 'You found the bed! Time to rest!',
        tv: 'You found the TV! Beep boop!', door: 'You found the door! Knock knock!',
        window: 'You found the window! Look outside!', shelf: 'You found the shelf! So many things!',
        lamp: 'You found the lamp! Let there be light!'
      }
    }
  };

  // ─────────────────────────────────────────────────────────────
  // CLOTHING (8 items)
  // ─────────────────────────────────────────────────────────────
  var clothing = {
    id: 'clothing',
    name: 'Clothing',
    emoji: '👕',
    color: '#2196F3',
    gradient: 'linear-gradient(135deg, #2196F3, #1565C0)',
    description: 'Find clothes in your closet, dresser, or laundry!',
    promptTemplate: 'Look at this photo. Is there a [TARGET_ITEM] in this image? Accept the real clothing item, a toy/doll version, or a clear picture of it in a book or on a screen. Respond with \'Yes\' or \'No\' on the first line. Then, on the second line, concisely describe what you see.',
    items: [
      { id: 'shirt',  name: 'Shirt',  emoji: '👕', synonyms: ['t-shirt','blouse','top'], aiHint: 'Accept any shirt — t-shirt, button-up, blouse, or toy shirt.', d: 1 },
      { id: 'pants',  name: 'Pants',  emoji: '👖', synonyms: ['trousers','jeans','shorts'], aiHint: 'Accept pants, jeans, trousers, shorts, or toy version.', d: 1 },
      { id: 'dress',  name: 'Dress',  emoji: '👗', synonyms: ['gown','skirt'],           aiHint: 'Accept any dress, gown, or toy dress.', d: 1 },
      { id: 'jacket', name: 'Jacket', emoji: '🧥', synonyms: ['coat','sweater','hoodie'], aiHint: 'Accept jacket, coat, sweater, hoodie, or toy version.', d: 1 },
      { id: 'hat',    name: 'Hat',    emoji: '🧢', synonyms: ['cap','beanie'],           aiHint: 'Accept any hat — baseball cap, beanie, sun hat, or toy hat.', d: 1 },
      { id: 'glove',  name: 'Glove',  emoji: '🧤', synonyms: ['mittens'],                aiHint: 'Accept gloves or mittens, real or toy.', d: 2 },
      { id: 'scarf',  name: 'Scarf',  emoji: '🧣', synonyms: ['wrap','shawl'],           aiHint: 'Accept any scarf, wrap, or toy version.', d: 2 },
      { id: 'sock',   name: 'Sock',   emoji: '🧦', synonyms: ['socks','stockings'],      aiHint: 'Accept any sock, stocking, or toy version.', d: 2 }
    ],
    audio: {
      intro: "Let's find clothes! Check your closet!",
      items: {
        shirt: 'Can you find a shirt?', pants: 'Can you find some pants?', dress: 'Can you find a dress?',
        jacket: 'Can you find a jacket?', hat: 'Can you find a hat?', glove: 'Can you find a glove?',
        scarf: 'Can you find a scarf?', sock: 'Can you find a sock?'
      },
      success: {
        shirt: 'You found a shirt! Looking good!', pants: 'You found pants! Great job!',
        dress: 'You found a dress! So pretty!', jacket: 'You found a jacket! Warm and cozy!',
        hat: 'You found a hat! Looking snazzy!', glove: 'You found a glove! High five!',
        scarf: 'You found a scarf! Nice and warm!', sock: 'You found a sock! Footastic!'
      }
    }
  };

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────
  return {
    animals: animals,
    food: food,
    furniture: furniture,
    clothing: clothing,
    all: [animals, food, furniture, clothing],
    byId: { animals: animals, food: food, furniture: furniture, clothing: clothing }
  };

})();
