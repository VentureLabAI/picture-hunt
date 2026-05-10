# 📸 Picture Hunt!

A visual scavenger hunt app for toddlers. Shows a picture of a household object, kid takes a photo of it with the iPad camera, and Gemini AI checks if they found the right thing.

## Setup

1. **Add your Gemini API key** — open `app.js` and replace `YOUR_API_KEY` with your actual key:
   ```js
   const GEMINI_API_KEY = 'your-actual-key-here';
   ```

2. **Start the server** from this directory:
   ```bash
   cd /Users/aidevlab/.openclaw/workspace/projects/picture-hunt
   python3 -m http.server 8880
   ```

3. **Open on iPad** — navigate to `http://<your-imac-tailscale-ip>:8880` in Safari.

## How It Works

1. Kid taps **Play**
2. A big emoji + audio prompt says "Can you find a [thing]?"
3. Kid taps the camera button, takes a photo
4. Photo is sent to Gemini 2.0 Flash for identification
5. ✅ Match → confetti + cheer → next item
6. ❌ No match → gentle "try again" + wiggle animation
7. After all 8 items → big celebration screen

## Items

Shoe, Cup, Ball, Teddy Bear, Book, Apple, Spoon, Pillow

Each item has a fuzzy synonym map (e.g., "shoe" also matches "sneaker", "boot", "footwear", etc.)

## Tech

- **Camera:** Uses `<input type="file" capture="environment">` for iPad Safari compatibility
- **AI:** Gemini 2.0 Flash vision API (REST, base64 image)
- **Audio:** Web Speech API (`speechSynthesis`) — no audio files needed
- **Animations:** CSS animations + canvas confetti

## Requirements

- A Gemini API key (free tier works fine)
- Any machine to serve the files (Python 3 built-in server)
- iPad with Safari for the best experience
