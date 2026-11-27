// Make a free-pass unlock code for a preschool, a creator, or any channel, so its
// use can be attributed.
//
//   node worker/mint-code.mjs <label>                 one shared code, valid 10 years
//   node worker/mint-code.mjs <label> --days 90       expires after 90 days
//   node worker/mint-code.mjs <label> --personal      for ONE family (keeps cross-device sync)
//   node worker/mint-code.mjs --list                  show every minted code and its label
//
// <label> is a short name in lowercase letters, digits and dashes, for example
// "sunny-days-preschool" or "creator-maria". It names a place or a channel, never
// a child. `node worker/stats.mjs` then shows how many times each label's code
// was used.
//
// A shared code (the default) can be used by a whole classroom. Shared codes do
// not sync progress between devices, because sync is keyed by code and would mix
// different families' progress together.
//
// Prints the code, a link that unlocks the app in one tap, and saves a QR code
// image for a flyer. Uses the saved Cloudflare login (same as `npx wrangler deploy`).
// Codes live only in Cloudflare KV. Nothing is written to this (public) repo.
import { execSync, execFileSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const QR_DIR = 'C:/assets/ventures/picture-hunt/free-pass-qr';
const args = process.argv.slice(2);

function wrangler(a) {
  return execSync('npx wrangler ' + a.join(' '), { cwd: HERE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

if (args.includes('--list')) {
  const keys = JSON.parse(wrangler(['kv', 'key', 'list', '--binding', 'UNLOCK_CODES', '--remote']));
  const codes = keys.map(k => k.name).filter(n => /^[A-Z0-9]{8}$/.test(n));
  if (!codes.length) { console.log('No codes minted yet.'); process.exit(0); }
  console.log('code      label                     kind      valid until');
  for (const code of codes) {
    let e = {};
    try { e = JSON.parse(wrangler(['kv', 'key', 'get', code, '--binding', 'UNLOCK_CODES', '--remote'])); } catch (err) {}
    console.log(code + '  ' + String(e.label || 'paid').padEnd(26) + (e.shared ? 'shared' : 'personal').padEnd(10) + String(e.validUntil || '').slice(0, 10));
  }
  process.exit(0);
}

const label = args.find(a => !a.startsWith('--') && !/^\d+$/.test(a));
if (!label || !/^[a-z0-9][a-z0-9-]{0,23}$/.test(label)) {
  console.error('Give a label: lowercase letters, digits and dashes, up to 24 characters.\nExample: node worker/mint-code.mjs sunny-days-preschool');
  process.exit(1);
}
const daysAt = args.indexOf('--days');
const days = daysAt >= 0 ? parseInt(args[daysAt + 1], 10) : 3650;
if (!days || days < 1) { console.error('--days needs a number'); process.exit(1); }
const shared = !args.includes('--personal');

// Same look-alike-free alphabet the Worker uses for purchased codes.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
let code = '';
for (let i = 0; i < 8; i++) code += ALPHABET[randomInt(ALPHABET.length)];

const entry = { validUntil: new Date(Date.now() + days * 86400000).toISOString(), plan: 'free-pass', label, shared };
const tmp = path.join(HERE, '.wrangler-mint-' + code + '.json');
fs.writeFileSync(tmp, JSON.stringify(entry));
try {
  wrangler(['kv', 'key', 'put', code, '--binding', 'UNLOCK_CODES', '--remote', '--path', '"' + tmp + '"']);
} finally {
  fs.rmSync(tmp, { force: true });
}

const link = 'https://picturehunt.app/play/?code=' + code;
let qr = '';
try {
  fs.mkdirSync(QR_DIR, { recursive: true });
  qr = QR_DIR + '/' + label + '-' + code + '.png';
  execFileSync('python', ['-c', 'import qrcode,sys; qrcode.make(sys.argv[1], box_size=12, border=3).save(sys.argv[2])', link, qr], { stdio: 'ignore' });
} catch (e) { qr = '(QR image not created: python qrcode module missing)'; }

console.log('\nFree pass created');
console.log('  label:       ' + label + (shared ? '  (shared: a whole class can use it)' : '  (personal: one family)'));
console.log('  code:        ' + code);
console.log('  valid until: ' + entry.validUntil.slice(0, 10));
console.log('  one-tap link: ' + link);
console.log('  QR image:    ' + qr);
console.log('\nSee how often it is used: node worker/stats.mjs\n');
