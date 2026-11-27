// Show Picture Hunt's anonymous daily totals.
//
//   node worker/stats.mjs          last 14 days
//   node worker/stats.mjs 30       last 30 days
//
// What the columns mean:
//   visits      landing page opened (at most once per browser per day)
//   try free    a "Try Free" / "Start" button tapped on the landing page
//   photos      photo checks the Worker ran for real play (health checks excluded)
//   found       how many of those the AI said yes to
//   failed      checks where both models failed (child saw "Camera Nap")
//   codes       unlock codes accepted
// Then the same visits / try-free numbers split by campaign label (?c=<label>),
// and code use split by code label.
//
// Uses the saved Cloudflare login (same as `npx wrangler deploy`).
import { execSync, execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const days = Math.max(1, parseInt(process.argv[2] || '14', 10) || 14);

function query(sql) {
  // The SQL uses only single quotes, so wrapping it in double quotes keeps it one
  // argument on Windows and elsewhere.
  const out = execSync('npx wrangler d1 execute picture-hunt-stats --remote --json --command "' + sql + '"',
    { cwd: HERE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const parsed = JSON.parse(out.slice(out.indexOf('[')));
  return parsed[0].results || [];
}

const rows = query(`SELECT day, event, channel, n FROM counts WHERE day >= date('now', '-${days} days') ORDER BY day`);
if (!rows.length) { console.log('No activity recorded in the last ' + days + ' days.'); process.exit(0); }

const byDay = {}, byChannel = {}, byCode = {};
for (const r of rows) {
  const d = (byDay[r.day] = byDay[r.day] || { visit: 0, try_free: 0, photos: 0, found: 0, failed: 0, codes: 0, fallback: 0, old: 0 });
  if (r.event === 'visit' || r.event === 'try_free') {
    d[r.event] += r.n;
    const c = (byChannel[r.channel || '(no label)'] = byChannel[r.channel || '(no label)'] || { visit: 0, try_free: 0 });
    c[r.event] += r.n;
  } else if (r.event === 'check_yes') { d.photos += r.n; d.found += r.n; }
  else if (r.event === 'check_no' || r.event === 'check_unclear') d.photos += r.n;
  else if (r.event === 'check_fail') { d.photos += r.n; d.failed += r.n; }
  else if (r.event === 'check_fallback') d.fallback += r.n;
  else if (r.event === 'check_old_app') d.old += r.n;
  else if (r.event === 'code_ok') { d.codes += r.n; byCode[r.channel || 'paid'] = (byCode[r.channel || 'paid'] || 0) + r.n; }
}

const pad = (v, w) => String(v).padStart(w);
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '-');
console.log('\nPicture Hunt, last ' + days + ' days (days are US Central)\n');
console.log('day          visits  try free   rate   photos  found  failed  codes');
const tot = { visit: 0, try_free: 0, photos: 0, found: 0, failed: 0, codes: 0, fallback: 0, old: 0 };
for (const [day, d] of Object.entries(byDay)) {
  for (const k of Object.keys(tot)) tot[k] += d[k];
  console.log(day + pad(d.visit, 9) + pad(d.try_free, 10) + pad(pct(d.try_free, d.visit), 7) + pad(d.photos, 9) + pad(d.found, 7) + pad(d.failed, 8) + pad(d.codes, 7));
}
console.log('TOTAL     ' + pad(tot.visit, 9) + pad(tot.try_free, 10) + pad(pct(tot.try_free, tot.visit), 7) + pad(tot.photos, 9) + pad(tot.found, 7) + pad(tot.failed, 8) + pad(tot.codes, 7));

console.log('\nBy campaign label (links like https://picturehunt.app/?c=tiktok)');
console.log('label                     visits  try free   rate');
for (const [ch, c] of Object.entries(byChannel).sort((a, b) => b[1].visit - a[1].visit)) {
  console.log(ch.padEnd(24) + pad(c.visit, 8) + pad(c.try_free, 10) + pad(pct(c.try_free, c.visit), 7));
}
if (Object.keys(byCode).length) {
  console.log('\nUnlock codes accepted, by code label');
  for (const [label, n] of Object.entries(byCode).sort((a, b) => b[1] - a[1])) console.log(label.padEnd(24) + pad(n, 8));
}
if (tot.fallback) console.log('\nNote: ' + tot.fallback + ' photo checks were answered by the backup model. If this keeps happening, the primary model is failing.');
if (tot.old) console.log('Note: ' + tot.old + ' photo checks came from older app versions (pre-v152).');
console.log('');
