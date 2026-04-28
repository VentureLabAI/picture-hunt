#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// Picture Hunt — Complete Audio Generator
// ═══════════════════════════════════════════════════════════════
// Generates ALL audio files for Picture Hunt using the custom
// ElevenLabs "Picture Hunt" voice (ID: xgq15iRQWJKOQk9SOixE).
//
// Usage:
//   ELEVENLABS_API_KEY=your_key node generate-all-audio.js [options]
//
// Options:
//   --category=find     Only generate "find" prompts (default: all)
//   --category=hint     Only generate hint audio
//   --category=story    Only generate story audio
//   --category=system   Only generate system prompts
//   --cat=animals       Only generate for specific game category
//   --story=bear        Only generate for specific story (partial match)
//   --dry-run           Show what would be generated, don't call API
//   --skip-existing     Skip files that already exist in audio dir
//
// Output: MP3 files in ./audio/ directory
//
// Voice settings: stability=0.5, similarity_boost=0.75, style=0.6
// These are tuned for a gentle preschool teacher voice — warm, clear,
// never rushed. Style 0.6 adds expressiveness without being theatrical.
//
// Rate limit: 300ms delay between API calls (ElevenLabs free tier:
// 3 requests/minute on free, 30/min on starter). Adjust DELAY_MS
// if you hit rate limits.
// ═══════════════════════════════════════════════════════════════

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'xgq15iRQWJKOQk9SOixE'; // Custom "Picture Hunt" voice
const AUDIO_DIR = path.join(__dirname, 'audio'); // ./audio/ in project root
const DELAY_MS = 350; // Delay between API calls
const MODEL_ID = 'eleven_turbo_v2_5'; // Best quality/speed tradeoff

if (!API_KEY && !process.argv.includes('--dry-run')) {
  console.error('❌ Set ELEVENLABS_API_KEY env variable');
  console.error('   Example: ELEVENLABS_API_KEY=xxx node generate-all-audio.js');
  process.exit(1);
}

// Parse CLI options
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipExisting = args.includes('--skip-existing');
const categoryFilter = (args.find(a => a.startsWith('--category=')) || '').replace('--category=', '') || 'all';
const catFilter = (args.find(a => a.startsWith('--cat=')) || '').replace('--cat=', '') || '';
const storyFilter = (args.find(a => a.startsWith('--story=')) || '').replace('--story=', '') || '';

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════
// AUDIO PROMPTS — All categories, all items
// ═══════════════════════════════════════════════════════════════

const FIND_PROMPTS = {
  // ── Household (Things) ─────────────────────────────────────
  household: {
    'find-shoe': 'Can you find a shoe?',
    'find-cup': 'Can you find a cup?',
    'find-ball': 'Can you find a ball?',
    'find-teddy-bear': 'Can you find a teddy bear?',
    'find-book': 'Can you find a book?',
    'find-spoon': 'Can you find a spoon?',
    'find-pillow': 'Can you find a pillow?',
    'find-blanket': 'Can you find a blanket?',
    'find-remote-control': 'Can you find a remote control?',
    'find-toothbrush': 'Can you find a toothbrush?',
    'find-chair': 'Can you find a chair?',
    'find-sock': 'Can you find a sock?',
    'find-hat': 'Can you find a hat?',
    'find-keys': 'Can you find some keys?',
    'find-water-bottle': 'Can you find a water bottle?',
    'find-crayon': 'Can you find a crayon?',
    'find-plate': 'Can you find a plate?',
    'find-towel': 'Can you find a towel?',
    'find-lamp': 'Can you find a lamp?',
    'find-clock': 'Can you find a clock?',
    'find-fork': 'Can you find a fork?',
    'find-brush': 'Can you find a brush?',
  },

  // ── Shapes ────────────────────────────────────────────────
  shapes: {
    'find-circle': 'Can you find a circle?',
    'find-square': 'Can you find a square?',
    'find-triangle': 'Can you find a triangle?',
    'find-star': 'Can you find a star?',
    'find-rectangle': 'Can you find a rectangle?',
    'find-heart': 'Can you find a heart?',
    'find-diamond': 'Can you find a diamond?',
  },

  // ── Colors ────────────────────────────────────────────────
  colors: {
    'find-red': 'Can you find something red?',
    'find-blue': 'Can you find something blue?',
    'find-green': 'Can you find something green?',
    'find-yellow': 'Can you find something yellow?',
    'find-orange': 'Can you find something orange?',
    'find-purple': 'Can you find something purple?',
    'find-pink': 'Can you find something pink?',
    'find-white': 'Can you find something white?',
    'find-black': 'Can you find something black?',
    'find-brown': 'Can you find something brown?',
  },

  // ── Animals ───────────────────────────────────────────────
  animals: {
    'find-dog': 'Can you find a dog?',
    'find-cat': 'Can you find a cat?',
    'find-duck': 'Can you find a duck?',
    'find-dinosaur': 'Can you find a dinosaur?',
    'find-elephant': 'Can you find an elephant?',
    'find-lion': 'Can you find a lion?',
    'find-pig': 'Can you find a pig?',
    'find-frog': 'Can you find a frog?',
    'find-rabbit': 'Can you find a rabbit?',
    'find-bird': 'Can you find a bird?',
    'find-fish': 'Can you find a fish?',
  },

  // ── Food ──────────────────────────────────────────────────
  food: {
    'find-apple': 'Can you find an apple?',
    'find-banana': 'Can you find a banana?',
    'find-orange': 'Can you find an orange?',
    'find-bread': 'Can you find some bread?',
    'find-egg': 'Can you find an egg?',
    'find-carrot': 'Can you find a carrot?',
    'find-cookie': 'Can you find a cookie?',
    'find-cereal': 'Can you find a cereal box?',
    'find-milk': 'Can you find some milk?',
    'find-yogurt': 'Can you find some yogurt?',
    'find-juice': 'Can you find some juice?',
  },

  // ── Furniture ─────────────────────────────────────────────
  furniture: {
    'find-chair': 'Can you find a chair?',
    'find-table': 'Can you find a table?',
    'find-couch': 'Can you find a couch?',
    'find-bed': 'Can you find a bed?',
    'find-tv': 'Can you find a TV?',
    'find-door': 'Can you find a door?',
    'find-window': 'Can you find a window?',
    'find-shelf': 'Can you find a shelf?',
    'find-lamp-furniture': 'Can you find a lamp?', // avoid collision with household lamp
  },

  // ── Clothing ──────────────────────────────────────────────
  clothing: {
    'find-shirt': 'Can you find a shirt?',
    'find-pants': 'Can you find some pants?',
    'find-dress': 'Can you find a dress?',
    'find-jacket': 'Can you find a jacket?',
    'find-hat-clothing': 'Can you find a hat?', // avoid collision with household hat
    'find-glove': 'Can you find a glove?',
    'find-scarf': 'Can you find a scarf?',
    'find-sock-clothing': 'Can you find a sock?', // avoid collision with household sock
  },
};

// Category intro prompts (spoken when selecting a category)
const CATEGORY_INTROS = {
  'cat-things': 'Things! Find stuff around the house!',
  'cat-shapes': 'Shapes! Find circles, squares, and more!',
  'cat-colors': 'Colors! Find red, blue, green, and more!',
  'cat-animals': 'Animals! Find dogs, cats, and more!',
  'cat-food': 'Food! Find yummy things to eat!',
  'cat-furniture': 'Furniture! Find things around the house!',
  'cat-clothing': 'Clothing! Find things you can wear!',
};

// System prompts (used throughout the app)
const SYSTEM_PROMPTS = {
  'pick-a-game': 'Pick a game!',
  'you-found-it': 'You found it! Great job!',
  'try-again': 'Try again, or skip to the next one!',
  'lets-try-another': "Let's try another one!",
  'great-job': 'Great job!',
  'tap-to-hear': 'Tap here to hear it again!',
  'you-did-it': 'You did it! You found everything! Great job!',
  'champion': 'Amazing! You are a champion!',
  'need-hint': 'Need a hint? Tap the light bulb!',
  'hint-used-up': "You've used all your hints! Keep looking!",
};

// ═══════════════════════════════════════════════════════════════
// HINT AUDIO — 3 tiers per item across all categories
// ═══════════════════════════════════════════════════════════════
// Key format: hint-{category}-{item}-{tier}
// File format: hint-{category}-{item}-{tier}.mp3

const HINT_PROMPTS = {
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
    'brush':           ['You use it on your hair!', 'Check the bathroom or dresser!', 'It makes your hair neat and smooth!'],
  },
  shapes: {
    'circle':    ['It is round with no corners!', 'Look for plates, wheels, or clocks!', 'It goes round and round like a ball!'],
    'square':    ['It has four sides the same size!', 'Look for boxes, windows, or blocks!', 'All four sides are the same!'],
    'triangle':  ['It has three sides and three points!', 'Look for pizza slices or roof tops!', 'It has three corners!'],
    'star':      ['It has points sticking out!', 'Look for stickers, decorations, or the sky!', 'It shines in the sky at night!'],
    'rectangle': ['It has four sides, two long and two short!', 'Look for doors, books, or phones!', 'It is like a stretched out square!'],
    'heart':     ['It is the shape of love!', 'Look for stickers, cards, or decorations!', 'You see it on valentines!'],
    'diamond':   ['It looks like a square turned sideways!', 'Look for playing cards or jewelry!', 'It is pointy at the top and bottom!'],
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
    'brown':  ['It is the color of chocolate!', 'Look for wood, dirt, or teddy bears!', 'Chocolate and tree trunks are this color!'],
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
    'fish':     ['It lives in the water!', 'Look for a toy or picture!', 'It swims with fins and a tail!'],
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
    'juice':   ['It is a yummy drink!', 'Check the fridge!', 'It comes in a box or bottle and is fruity!'],
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
    'lamp':    ['It makes light!', 'Look on a table or in the corner!', 'You turn it on when it gets dark!'],
  },
  clothing: {
    'shirt':   ['You wear it on your top half!', 'Check the closet or dresser!', 'It covers your chest and arms!'],
    'pants':   ['You wear them on your legs!', 'Check the closet or dresser!', 'They cover both of your legs!'],
    'dress':   ['It is one piece you wear!', 'Check the closet!', 'Girls wear it and it goes down to the knees!'],
    'jacket':  ['You wear it when it is cold!', 'Check by the door or closet!', 'It keeps you warm when you go outside!'],
    'hat':     ['You wear it on your head!', 'Check by the door or closet!', 'It keeps the sun off your head!'],
    'glove':   ['You wear them on your hands!', 'Check by the door or closet!', 'They keep your hands warm in winter!'],
    'scarf':   ['You wear it around your neck!', 'Check the closet!', 'It wraps around your neck when it is cold!'],
    'sock':    ['You wear it inside your shoe!', 'Check the dresser or laundry!', 'It goes on your foot before the shoe!'],
  },
};

// ═══════════════════════════════════════════════════════════════
// STORY AUDIO — All 8 stories + intro/outro/bridge/foundText
// ═══════════════════════════════════════════════════════════════

const STORY_PROMPTS = {
  'bear-breakfast': {
    'story-bear-breakfast-intro': "Oh no! Bear just woke up and his tummy is rumbling! Let's help Bear find his breakfast! Ready? Let's go!",
    'story-bear-breakfast-step1-bridge': "Bear is thirsty! Can you find something for Bear to drink from?",
    'story-bear-breakfast-step1-found': "Bear can drink his milk! Yum!",
    'story-bear-breakfast-step2-bridge': "Now Bear wants something sweet and yellow! Can you find a banana for Bear?",
    'story-bear-breakfast-step2-found': "A banana for Bear! Peeling it now!",
    'story-bear-breakfast-step3-bridge': "Bear loves crunchy cereal! Can you find a cereal box?",
    'story-bear-breakfast-step3-found': "Crunch crunch! Bear is happy!",
    'story-bear-breakfast-step4-bridge': "Bear needs something to eat his cereal with! Can you find a spoon?",
    'story-bear-breakfast-step4-found': "A spoon! Now Bear can eat!",
    'story-bear-breakfast-step5-bridge': "One last thing for Bear... a special treat! Can you find a cookie?",
    'story-bear-breakfast-step5-found': "A cookie! Bear's breakfast is the best!",
    'story-bear-breakfast-outro': "You found everything for Bear's breakfast! Bear is so full and happy! You're the best helper ever!",
  },
  'space-explorer': {
    'story-space-explorer-intro': "3, 2, 1, blast off! You're an astronaut on a space mission! You need to find things for your spaceship! Let's go!",
    'story-space-explorer-step1-bridge': "First, your spaceship needs a window to see the stars! Can you find a window?",
    'story-space-explorer-step1-found': "A window! Now you can see Earth from space!",
    'story-space-explorer-step2-bridge': "An astronaut needs a special chair for launch! Can you find a chair?",
    'story-space-explorer-step2-found': "Strap in! Your chair is ready for blast off!",
    'story-space-explorer-step3-bridge': "The control panel has a screen! Can you find something that shows pictures, like a TV?",
    'story-space-explorer-step3-found': "Mission control on the screen! Looking good!",
    'story-space-explorer-step4-bridge': "Space is dark! You need something that makes light! Can you find a lamp?",
    'story-space-explorer-step4-found': "Lamp on! Now you can see all the buttons!",
    'story-space-explorer-step5-bridge': "Astronauts write logs in books! Can you find a book?",
    'story-space-explorer-step5-found': "Captain's log, day one in space!",
    'story-space-explorer-step6-bridge': "Time for a space snack! Can you find a water bottle?",
    'story-space-explorer-step6-found': "Hydration check! Space water is fun to drink!",
    'story-space-explorer-outro': "Your spaceship is ready! You're a real astronaut now! To infinity and beyond!",
  },
  'color-rainbow': {
    'story-color-rainbow-intro': "A rainbow lost its colors! Can you help paint it back? Find each color to make the rainbow whole again!",
    'story-color-rainbow-step1-bridge': "The first color is the color of a fire truck! Can you find something red?",
    'story-color-rainbow-step1-found': "Red! That's the first stripe of the rainbow!",
    'story-color-rainbow-step2-bridge': "Next is the color of the sun! Can you find something yellow?",
    'story-color-rainbow-step2-found': "Yellow! The rainbow is getting brighter!",
    'story-color-rainbow-step3-bridge': "Now find the color of grass! Can you find something green?",
    'story-color-rainbow-step3-found': "Green! Almost halfway there!",
    'story-color-rainbow-step4-bridge': "The color of the sky! Can you find something blue?",
    'story-color-rainbow-step4-found': "Blue! The sky stripe is back!",
    'story-color-rainbow-step5-bridge': "A royal color, like grapes! Can you find something purple?",
    'story-color-rainbow-step5-found': "Purple! So fancy!",
    'story-color-rainbow-outro': "You painted the whole rainbow! It's the most beautiful one ever! You're a rainbow artist!",
  },
  'pet-parade': {
    'story-pet-parade-intro': "Welcome to the pet parade! All the animals are lining up! Can you find each one to join the parade?",
    'story-pet-parade-step1-bridge': "First up, a furry friend that barks! Can you find a dog?",
    'story-pet-parade-step1-found': "Woof woof! Doggy is in the parade!",
    'story-pet-parade-step2-bridge': "Next, a soft friend that purrs! Can you find a cat?",
    'story-pet-parade-step2-found': "Meow! Kitty joins the parade!",
    'story-pet-parade-step3-bridge': "A quacky friend! Can you find a duck?",
    'story-pet-parade-step3-found': "Quack quack! Duck waddles in!",
    'story-pet-parade-step4-bridge': "A hoppy friend with long ears! Can you find a rabbit?",
    'story-pet-parade-step4-found': "Hop hop! Bunny is here!",
    'story-pet-parade-step5-bridge': "A tiny green friend that says ribbit! Can you find a frog?",
    'story-pet-parade-step5-found': "Ribbit! Frog hops into the parade!",
    'story-pet-parade-step6-bridge': "Last but not least, a friend that swims! Can you find a fish?",
    'story-pet-parade-step6-found': "Blub blub! Fish swims along!",
    'story-pet-parade-outro': "All the pets are in the parade! What a wonderful sight! You made the best pet parade ever!",
  },
  'kitchen-chef': {
    'story-kitchen-chef-intro': "You're a chef today! Let's cook something yummy! Find all the things we need in the kitchen!",
    'story-kitchen-chef-step1-bridge': "Every chef needs a hat! Can you find something you wear on your head?",
    'story-kitchen-chef-step1-found': "Chef's hat on! You look like a real chef!",
    'story-kitchen-chef-step2-bridge': "We need something to stir with! Can you find a spoon?",
    'story-kitchen-chef-step2-found': "Stir stir stir! The spoon is ready!",
    'story-kitchen-chef-step3-bridge': "Something to hold our food! Can you find a plate?",
    'story-kitchen-chef-step3-found': "Plate ready! What will we put on it?",
    'story-kitchen-chef-step4-bridge': "We need something round and red! Can you find an apple?",
    'story-kitchen-chef-step4-found': "Apple on the plate! Looking delicious!",
    'story-kitchen-chef-step5-bridge': "A drink to go with our meal! Can you find some milk?",
    'story-kitchen-chef-step5-found': "Milk to drink! The chef's meal is almost ready!",
    'story-kitchen-chef-outro': "The chef's meal is complete! You're an amazing chef! Bon appetit!",
  },
  'bedtime-buddy': {
    'story-bedtime-buddy-intro': "It's almost bedtime! Let's find everything we need to get ready for sleep! Shhh, let's be cozy!",
    'story-bedtime-buddy-step1-bridge': "First, where will you sleep? Can you find a bed?",
    'story-bedtime-buddy-step1-found': "A cozy bed! All ready for sleeping!",
    'story-bedtime-buddy-step2-bridge': "Something soft for your head! Can you find a pillow?",
    'story-bedtime-buddy-step2-found': "Fluffy pillow! So squishy!",
    'story-bedtime-buddy-step3-bridge': "Something to keep you warm! Can you find a blanket?",
    'story-bedtime-buddy-step3-found': "Snuggly blanket! Nice and warm!",
    'story-bedtime-buddy-step4-bridge': "A cuddly friend to sleep with! Can you find a teddy bear?",
    'story-bedtime-buddy-step4-found': "Teddy is ready for bedtime hugs!",
    'story-bedtime-buddy-step5-bridge': "One last story before sleep! Can you find a book?",
    'story-bedtime-buddy-step5-found': "Story time! Then it's sweet dreams!",
    'story-bedtime-buddy-outro': "Everything is ready for the best sleep ever! Sweet dreams, little one! Goodnight!",
  },
  'safari-adventure': {
    'story-safari-adventure-intro': "Grab your binoculars! We're going on a safari to find wild animals! Keep your eyes open!",
    'story-safari-adventure-step1-bridge': "Something big with a long trunk! Can you find an elephant?",
    'story-safari-adventure-step1-found': "An elephant! It's so big! Trumpet!",
    'story-safari-adventure-step2-bridge': "The king of the jungle! Can you find a lion?",
    'story-safari-adventure-step2-found': "Roar! The lion is majestic!",
    'story-safari-adventure-step3-bridge': "A long necked friend! No wait, a tiny hoppy one! Can you find a frog?",
    'story-safari-adventure-step3-found': "Ribbit! Found one by the pond!",
    'story-safari-adventure-step4-bridge': "A prehistoric friend! Can you find a dinosaur?",
    'story-safari-adventure-step4-found': "Rawr! A dinosaur! From long, long ago!",
    'story-safari-adventure-step5-bridge': "Something that flies high! Can you find a bird?",
    'story-safari-adventure-step5-found': "Tweet tweet! A beautiful bird!",
    'story-safari-adventure-step6-bridge': "Our last safari friend! Can you find a pig?",
    'story-safari-adventure-step6-found': "Oink oink! A safari pig! How silly!",
    'story-safari-adventure-outro': "Amazing safari! You found all the animals! You're the greatest explorer!",
  },
  'rainy-day': {
    'story-rainy-day-intro': "It's raining outside! But we can still have fun indoors! Let's find things to play with!",
    'story-rainy-day-step1-bridge': "Let's build something! Can you find a book?",
    'story-rainy-day-step1-found': "A book! Let's read a story!",
    'story-rainy-day-step2-bridge': "Time to color! Can you find a crayon?",
    'story-rainy-day-step2-found': "Crayon found! What should we draw?",
    'story-rainy-day-step3-bridge': "Something warm to wear! Can you find a blanket?",
    'story-rainy-day-step3-found': "Cozy blanket! Perfect for a rainy day!",
    'story-rainy-day-step4-bridge': "A bouncy toy! Can you find a ball?",
    'story-rainy-day-step4-found': "Ball found! Roll it across the room!",
    'story-rainy-day-step5-bridge': "A cuddly friend! Can you find a teddy bear?",
    'story-rainy-day-step5-found': "Teddy wants to play too!",
    'story-rainy-day-step6-bridge': "Let's have a snack! Can you find a cup?",
    'story-rainy-day-step6-found': "A cup for juice! Yummy!",
    'story-rainy-day-outro': "Rainy days are the best! You found so many fun things! The sun will come out tomorrow!",
  },
};

// ═══════════════════════════════════════════════════════════════
// BUILD THE COMPLETE QUEUE
// ═══════════════════════════════════════════════════════════════

function buildQueue() {
  const queue = []; // { key, text, group }

  // Find prompts
  if (categoryFilter === 'all' || categoryFilter === 'find') {
    Object.keys(FIND_PROMPTS).forEach(catId => {
      if (catFilter && catId !== catFilter) return;
      Object.keys(FIND_PROMPTS[catId]).forEach(key => {
        queue.push({ key, text: FIND_PROMPTS[catId][key], group: `find-${catId}` });
      });
    });

    // Category intros
    Object.keys(CATEGORY_INTROS).forEach(key => {
      if (catFilter) {
        // Map cat filter to intro key
        const introMap = {
          household: 'cat-things', shapes: 'cat-shapes', colors: 'cat-colors',
          animals: 'cat-animals', food: 'cat-food', furniture: 'cat-furniture', clothing: 'cat-clothing'
        };
        if (introMap[catFilter] !== key) return;
      }
      queue.push({ key, text: CATEGORY_INTROS[key], group: 'category-intros' });
    });

    // System prompts
    Object.keys(SYSTEM_PROMPTS).forEach(key => {
      queue.push({ key, text: SYSTEM_PROMPTS[key], group: 'system' });
    });
  }

  // Hint prompts
  if (categoryFilter === 'all' || categoryFilter === 'hint') {
    Object.keys(HINT_PROMPTS).forEach(catId => {
      if (catFilter && catId !== catFilter) return;
      Object.keys(HINT_PROMPTS[catId]).forEach(itemName => {
        for (let tier = 1; tier <= 3; tier++) {
          const key = 'hint-' + catId + '-' + itemName.replace(/ /g, '-') + '-' + tier;
          const text = HINT_PROMPTS[catId][itemName][tier - 1];
          queue.push({ key, text, group: `hint-${catId}` });
        }
      });
    });
  }

  // Story prompts
  if (categoryFilter === 'all' || categoryFilter === 'story') {
    Object.keys(STORY_PROMPTS).forEach(storyId => {
      if (storyFilter && !storyId.includes(storyFilter)) return;
      Object.keys(STORY_PROMPTS[storyId]).forEach(key => {
        queue.push({ key, text: STORY_PROMPTS[storyId][key], group: `story-${storyId}` });
      });
    });
  }

  return queue;
}

// ═══════════════════════════════════════════════════════════════
// API CALL
// ═══════════════════════════════════════════════════════════════

function generateAudio(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text: text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.6,
        use_speaker_boost: true
      }
    });
    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: '/v1/text-to-speech/' + VOICE_ID,
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => reject(new Error('API ' + res.statusCode + ': ' + d.substring(0, 300))));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  const queue = buildQueue();

  console.log('════════════════════════════════════════════════════════');
  console.log('  Picture Hunt — Audio Generator');
  console.log('  Voice: "Picture Hunt" (Custom ElevenLabs)');
  console.log('  Model: ' + MODEL_ID);
  console.log('════════════════════════════════════════════════════════');
  console.log();

  // Count by group
  const groups = {};
  queue.forEach(item => {
    groups[item.group] = (groups[item.group] || 0) + 1;
  });
  console.log('Queue summary:');
  Object.keys(groups).sort().forEach(g => {
    console.log('  ' + g + ': ' + groups[g] + ' files');
  });
  console.log('  TOTAL: ' + queue.length + ' files');
  console.log();

  // Count existing files
  let existingCount = 0;
  let newCount = 0;
  queue.forEach(item => {
    const filePath = path.join(AUDIO_DIR, item.key + '.mp3');
    if (fs.existsSync(filePath)) {
      existingCount++;
    } else {
      newCount++;
    }
  });
  console.log('Already exist: ' + existingCount);
  console.log('Need to generate: ' + newCount);
  console.log();

  if (dryRun) {
    console.log('── DRY RUN ──');
    console.log();
    let currentGroup = '';
    queue.forEach(item => {
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        console.log('[' + currentGroup + ']');
      }
      const filePath = path.join(AUDIO_DIR, item.key + '.mp3');
      const exists = fs.existsSync(filePath);
      const prefix = exists ? '  ✓' : '  →';
      console.log(prefix + ' ' + item.key + '.mp3  "' + item.text + '"');
    });
    console.log();
    console.log('Run without --dry-run to generate missing files.');
    return;
  }

  // Generate
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const filePath = path.join(AUDIO_DIR, item.key + '.mp3');

    // Skip existing
    if (skipExisting && fs.existsSync(filePath)) {
      skipped++;
      continue;
    }

    process.stdout.write('  [' + (i + 1) + '/' + queue.length + '] ' + item.key + '... ');
    try {
      const audio = await generateAudio(item.text);
      fs.writeFileSync(filePath, audio);
      generated++;
      console.log('OK ' + (audio.length / 1024).toFixed(1) + 'KB');
    } catch (err) {
      failed++;
      console.log('FAIL: ' + err.message);
      // If rate limited, wait longer
      if (err.message.includes('429') || err.message.includes('rate')) {
        console.log('  ⏳ Rate limited — waiting 10 seconds...');
        await new Promise(r => setTimeout(r, 10000));
      }
    }

    // Rate limit delay
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log();
  console.log('════════════════════════════════════════════════════════');
  console.log('  Done! Generated: ' + generated + ' | Skipped: ' + skipped + ' | Failed: ' + failed);
  console.log('════════════════════════════════════════════════════════');

  // Total size
  const files = fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3'));
  const totalKB = files.reduce((sum, f) => sum + fs.statSync(path.join(AUDIO_DIR, f)).size, 0) / 1024;
  console.log('Audio directory: ' + files.length + ' files, ' + (totalKB / 1024).toFixed(1) + 'MB total');
}

main().catch(console.error);
