// Anonymous play counts. Besides the photo check, code check and premium sync,
// EVERYTHING the game sends is in this one file, so it is easy to audit.
//
// What it sends: a single word, such as "play_open", plus the campaign label if
// this browser first arrived through a labelled link (?c=tiktok). That is all.
// No ID of any kind, no name, no item names, no photo, no location. The Worker
// stores only a running total per day (worker/worker.js, "Anonymous daily
// totals"). Nothing here can follow a child or a family from one day to the next
// on the server: the "came back" counts are worked out HERE, on the device, from
// a date kept in this browser's own storage, and only the word "back_d1" is sent.
//
// The counts (each sent at most once per day, or once ever, per browser):
//   play_open     the game was opened today
//   play_new      first time ever on this browser
//   first_find    the first item ever found
//   find_day      something was found today
//   back_d1       opened again the day after the first play
//   back_week     opened again within 7 days of the first play
//   back_later    opened again 8 or more days after the first play
//   paywall_view  the unlock screen was shown today
//
// Why: the free launch has to prove that families come back before anything is
// charged for. Disclosed in privacy.html under "Anonymous totals". Owner approved
// 2026-11-26. Any new count must stay identifier-free and be added to that text.
(function () {
  var api = { find: function () {}, paywall: function () {} };
  window.PHCount = api;

  // Count the real site only, so local previews and tests never show up as players.
  if (!/^(www\.)?picturehunt\.app$/.test(location.hostname)) return;

  var API = 'https://picture-hunt-api.aidevlab3.workers.dev/event';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function dayString(d) { return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()); }
  function daysBetween(a, b) {
    var pa = a.split('-'), pb = b.split('-');
    return Math.round((new Date(+pb[0], pb[1] - 1, +pb[2]) - new Date(+pa[0], pa[1] - 1, +pa[2])) / 86400000);
  }

  var channel = get('PH_CH') || '';
  var inFlight = {};
  // The "already sent" note is written only after the Worker confirms, so a count
  // made while offline is retried on the next visit instead of being lost.
  function send(key, name, value) {
    if (inFlight[key]) return;
    inFlight[key] = true;
    try {
      fetch(API, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ e: name, c: channel })
      }).then(function (r) {
        if (r && r.status === 204) set(key, value);
        inFlight[key] = false;
      }).catch(function () { inFlight[key] = false; });
    } catch (e) { inFlight[key] = false; }
  }
  function once(key, name) { if (!get(key)) send(key, name, '1'); }
  function daily(key, name, today) { if (get(key) !== today) send(key, name, today); }

  // The date of the first play, kept on this device only. A browser that already
  // has Picture Hunt data from before these counts existed is marked "before" and
  // never counted as new or as coming back, so old players do not skew the rates.
  var first = get('PH_C_FIRST');
  if (!first) {
    var playedBefore = get('PH_FIRST_RUN_DONE') || get('PH_PROGRESS') || get('PH_LANG') || get('PH_DAILY');
    first = playedBefore ? 'before' : dayString(new Date());
    set('PH_C_FIRST', first);
  }
  var isCohort = /^\d{4}-\d{2}-\d{2}$/.test(first);

  function opened() {
    var today = dayString(new Date());
    daily('PH_C_OPEN', 'play_open', today);
    if (!isCohort) return;
    once('PH_C_NEW', 'play_new');
    var n = daysBetween(first, today);
    if (n === 1) once('PH_C_D1', 'back_d1');
    if (n >= 1 && n <= 7) once('PH_C_WK', 'back_week');
    if (n >= 8) once('PH_C_LATER', 'back_later');
  }

  api.find = function () {
    if (isCohort) once('PH_C_FF', 'first_find');
    daily('PH_C_FIND', 'find_day', dayString(new Date()));
  };
  api.paywall = function () {
    daily('PH_C_PW', 'paywall_view', dayString(new Date()));
  };

  opened();
  // An installed app is often resumed the next day without reloading the page.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') opened();
  });
})();
