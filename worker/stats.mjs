// Show Picture Hunt's anonymous daily totals.
//
//   node worker/stats.mjs          last 14 days
//   node worker/stats.mjs 30       last 30 days
//
// LANDING PAGE
//   visits      landing page opened (at most once per browser per day)
//   try free    a "Try Free" / "Start" button tapped on the landing page
// GAME
//   opened      browsers that opened the game that day
//   new         of those, first time ever
//   found       browsers that found at least one item that day
//   photos      photo checks the Worker ran (health checks excluded)
//   matched     how many of those the AI said yes to
//   failed      checks where both models failed (child saw "Camera Nap")
//   unlock      browsers that saw the unlock screen that day
//   codes       unlock codes accepted
// COMING BACK (the number the free launch has to prove)
//   of the browsers that played for the first time in the period, how many
//   opened the game again the next day, within a week, or later. Totals only:
//   nothing here identifies a family. People who played before 2026-11-26 are
//   left out on purpose.
//
// Uses the saved Cloudflare login (same as `npx wrangler deploy`).
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const days = Math.max(1, parseInt(process.argv[2] || '14', 10) || 14);

function query(sql) {
  // The SQL uses only single quotes, so wrapping it in double quotes keeps it one
  // argument on Windows and elsewhere.
  const out = execSync('npx wrangler d1 execute picture-hunt-stats --remote --json --command "' + sql + '"',
    { cwd: HERE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(out.slice(out.indexOf('[')))[0].results || [];
}

const rows = query(`SELECT day, event, channel, n FROM counts WHERE day >= date('now', '-${days} days') ORDER BY day`);
if (!rows.length) { console.log('No activity recorded in the last ' + days + ' days.'); process.exit(0); }

const blank = () => ({ visit: 0, try_free: 0, play_open: 0, play_new: 0, find_day: 0, first_find: 0, photos: 0, matched: 0, failed: 0,
  paywall_view: 0, codes: 0, back_d1: 0, back_week: 0, back_later: 0, fallback: 0, old: 0 });
const CHANNEL_EVENTS = ['visit', 'try_free', 'play_new', 'first_find', 'back_d1', 'back_week'];
const byDay = {}, byChannel = {}, byCode = {}, tot = blank();
for (const r of rows) {
  const d = (byDay[r.day] = byDay[r.day] || blank());
  const add = (k, n) => { d[k] += n; tot[k] += n; };
  if (r.event in d && !['photos', 'matched', 'failed', 'codes', 'fallback', 'old'].includes(r.event)) add(r.event, r.n);
  else if (r.event === 'check_yes') { add('photos', r.n); add('matched', r.n); }
  else if (r.event === 'check_no' || r.event === 'check_unclear') add('photos', r.n);
  else if (r.event === 'check_fail') { add('photos', r.n); add('failed', r.n); }
  else if (r.event === 'check_fallback') add('fallback', r.n);
  else if (r.event === 'check_old_app') add('old', r.n);
  else if (r.event === 'code_ok') { add('codes', r.n); byCode[r.channel || 'paid'] = (byCode[r.channel || 'paid'] || 0) + r.n; }
  if (CHANNEL_EVENTS.includes(r.event)) {
    const key = r.channel || '(no label)';
    const c = (byChannel[key] = byChannel[key] || Object.fromEntries(CHANNEL_EVENTS.map(e => [e, 0])));
    c[r.event] += r.n;
  }
}

const pad = (v, w) => String(v).padStart(w);
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '-');
console.log('\nPicture Hunt, last ' + days + ' days (days are US Central)\n');
console.log('             LANDING             GAME');
console.log('day          visits  try free    opened   new  found  photos  matched  failed  unlock  codes');
const line = (label, d) => label + pad(d.visit, 8) + pad(d.try_free, 10) + pad(d.play_open, 10) + pad(d.play_new, 6) + pad(d.find_day, 7)
  + pad(d.photos, 8) + pad(d.matched, 9) + pad(d.failed, 8) + pad(d.paywall_view, 8) + pad(d.codes, 7);
for (const [day, d] of Object.entries(byDay)) console.log(line(day, d));
console.log(line('TOTAL     ', tot));

console.log('\nFunnel for the period');
console.log('  landing visits                 ' + pad(tot.visit, 6));
console.log('  tapped Try Free                ' + pad(tot.try_free, 6) + '   ' + pct(tot.try_free, tot.visit) + ' of visits');
console.log('  played for the first time      ' + pad(tot.play_new, 6));
console.log('  found their first item         ' + pad(tot.first_find, 6) + '   ' + pct(tot.first_find, tot.play_new) + ' of new players');
console.log('\nComing back (of the ' + tot.play_new + ' who played for the first time)');
console.log('  the next day                   ' + pad(tot.back_d1, 6) + '   ' + pct(tot.back_d1, tot.play_new));
console.log('  within a week                  ' + pad(tot.back_week, 6) + '   ' + pct(tot.back_week, tot.play_new));
console.log('  8 or more days later           ' + pad(tot.back_later, 6) + '   ' + pct(tot.back_later, tot.play_new));
if (tot.play_new && tot.play_new < 30) console.log('  (fewer than 30 new players: treat these rates as a rough signal, not a result)');
console.log('  Note: recent first-timers have not had time to come back yet, so the rates for a short period read low.');

console.log('\nBy link label (links like https://picturehunt.app/?c=tiktok)');
console.log('label                     visits  try free  new players  first find  back next day  back in a week');
for (const [ch, c] of Object.entries(byChannel).sort((a, b) => (b[1].visit + b[1].play_new) - (a[1].visit + a[1].play_new))) {
  console.log(ch.padEnd(24) + pad(c.visit, 8) + pad(c.try_free, 10) + pad(c.play_new, 13) + pad(c.first_find, 12) + pad(c.back_d1, 15) + pad(c.back_week, 16));
}
if (Object.keys(byCode).length) {
  console.log('\nUnlock codes accepted, by code label');
  for (const [label, n] of Object.entries(byCode).sort((a, b) => b[1] - a[1])) console.log(label.padEnd(24) + pad(n, 8));
}
if (tot.fallback) console.log('\nNote: ' + tot.fallback + ' photo checks were answered by the backup model. If this keeps happening, the primary model is failing.');
if (tot.old) console.log('Note: ' + tot.old + ' photo checks came from older app versions (pre-v152).');
console.log('');
