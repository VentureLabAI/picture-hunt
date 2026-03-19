#!/usr/bin/env node
// Generate all voice prompts using ElevenLabs TTS - Bella voice
// Usage: ELEVENLABS_API_KEY=xxx node generate-audio-eleven.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) { console.error('Set ELEVENLABS_API_KEY'); process.exit(1); }

const VOICE_ID = 'hpp4J3VqNfWAUOO0d1Us'; // Bella - Professional, Bright, Warm
const AUDIO_DIR = path.join(__dirname, 'audio');
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR);

const prompts = {
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
  'find-circle': 'Can you find a circle?',
  'find-square': 'Can you find a square?',
  'find-triangle': 'Can you find a triangle?',
  'find-star': 'Can you find a star?',
  'find-rectangle': 'Can you find a rectangle?',
  'find-heart': 'Can you find a heart?',
  'find-diamond': 'Can you find a diamond?',
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
  'pick-a-game': 'Pick a game!',
  'you-found-it': 'You found it! Great job!',
  'try-again': 'Try again, or skip to the next one!',
  'lets-try-another': "Let's try another one!",
  'great-job': 'Great job!',
  'tap-to-hear': 'Tap here to hear it again!',
  'you-did-it': 'You did it! You found everything! Great job!',
  'champion': 'Amazing! You are a champion!',
  'cat-things': 'Things! Find stuff around the house!',
  'cat-shapes': 'Shapes! Find circles, squares, and more!',
  'cat-colors': 'Colors! Find red, blue, green, and more!',
};

function generateAudio(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text: text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.5 }
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
        res.on('end', () => reject(new Error('API ' + res.statusCode + ': ' + d.substring(0, 200))));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function main() {
  const entries = Object.entries(prompts);
  console.log('Generating ' + entries.length + ' audio files with ElevenLabs Bella voice...\n');

  for (let i = 0; i < entries.length; i++) {
    const [key, text] = entries[i];
    const file = path.join(AUDIO_DIR, key + '.mp3');

    process.stdout.write('  [' + (i+1) + '/' + entries.length + '] ' + key + '... ');
    try {
      const audio = await generateAudio(text);
      fs.writeFileSync(file, audio);
      console.log('OK ' + (audio.length / 1024).toFixed(1) + 'KB');
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log('FAIL: ' + err.message);
    }
  }

  const files = fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3'));
  const totalKB = files.reduce((sum, f) => sum + fs.statSync(path.join(AUDIO_DIR, f)).size, 0) / 1024;
  console.log('\nDone! ' + files.length + ' files, ' + (totalKB / 1024).toFixed(1) + 'MB total');
}

main().catch(console.error);
