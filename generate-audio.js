#!/usr/bin/env node
// Generate all voice prompts for Picture Hunt using OpenAI TTS
// Usage: OPENAI_API_KEY=xxx node generate-audio.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) { console.error('Set OPENAI_API_KEY'); process.exit(1); }

const AUDIO_DIR = path.join(__dirname, 'audio');
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR);

// Voice: "nova" is warm and friendly, great for kids
const VOICE = 'nova';
const MODEL = 'tts-1';

const prompts = {
  // Game prompts
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
  // Shapes
  'find-circle': 'Can you find a circle?',
  'find-square': 'Can you find a square?',
  'find-triangle': 'Can you find a triangle?',
  'find-star': 'Can you find a star?',
  'find-rectangle': 'Can you find a rectangle?',
  'find-heart': 'Can you find a heart?',
  'find-diamond': 'Can you find a diamond?',
  // Colors
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
  // UI feedback
  'pick-a-game': 'Pick a game!',
  'you-found-it': 'You found it! Great job!',
  'try-again': 'Try again, or skip to the next one!',
  'lets-try-another': "Let's try another one!",
  'great-job': 'Great job!',
  'tap-to-hear': 'Tap here to hear it again!',
  'you-did-it': 'You did it! You found everything! Great job!',
  'champion': 'Amazing! You are a champion!',
  // Category announcements
  'cat-things': 'Things! Find stuff around the house!',
  'cat-shapes': 'Shapes! Find circles, squares, and more!',
  'cat-colors': 'Colors! Find red, blue, green, and more!',
};

function generateAudio(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      input: text,
      voice: VOICE,
      speed: 0.95,
      response_format: 'mp3'
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/audio/speech',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => reject(new Error(`API ${res.statusCode}: ${data}`)));
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

async function main() {
  const entries = Object.entries(prompts);
  console.log(`Generating ${entries.length} audio files with OpenAI TTS (voice: ${VOICE})...\n`);

  for (let i = 0; i < entries.length; i++) {
    const [key, text] = entries[i];
    const file = path.join(AUDIO_DIR, `${key}.mp3`);

    if (fs.existsSync(file)) {
      console.log(`  [${i+1}/${entries.length}] ${key} — exists, skipping`);
      continue;
    }

    process.stdout.write(`  [${i+1}/${entries.length}] ${key}... `);
    try {
      const audio = await generateAudio(text);
      fs.writeFileSync(file, audio);
      const kb = (audio.length / 1024).toFixed(1);
      console.log(`✅ ${kb}KB`);
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.log(`❌ ${err.message}`);
    }
  }

  // Total size
  const files = fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3'));
  const totalKB = files.reduce((sum, f) => sum + fs.statSync(path.join(AUDIO_DIR, f)).size, 0) / 1024;
  console.log(`\n✅ Done! ${files.length} files, ${(totalKB/1024).toFixed(1)}MB total`);
}

main().catch(console.error);
