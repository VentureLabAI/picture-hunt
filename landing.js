// Landing page only. Two anonymous counts and a campaign label, nothing else.
//
// What leaves the browser: the word "visit" (at most once a day) or "try_free"
// (when a button that opens the game is tapped), plus the label from a link such
// as https://picturehunt.app/?c=tiktok if you arrived through one. No ID, no
// cookie, no IP is stored (worker/worker.js, "Anonymous daily totals"). The game
// has its own, equally anonymous counts in play/counts.js.
(function () {
  // Count the real site only, so local previews and tests never show up as visitors.
  if (!/^(www\.)?picturehunt\.app$/.test(location.hostname)) return;
  var API = 'https://picture-hunt-api.aidevlab3.workers.dev/event';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // Campaign label: ?c=tiktok (also accepts ?ref= and ?utm_source=). The first
  // label a browser ever arrives with is kept, so a later direct visit still
  // counts toward the channel that introduced it.
  var m = /[?&](?:c|ref|utm_source)=([^&#]+)/i.exec(location.search);
  var fromLink = '';
  if (m) {
    try { fromLink = decodeURIComponent(m[1]); } catch (e) { fromLink = m[1]; }
    fromLink = fromLink.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  }
  if (fromLink && !get('PH_CH')) set('PH_CH', fromLink);
  var channel = get('PH_CH') || fromLink || '';

  function send(name) {
    try {
      // text/plain keeps this a "simple" request, so no extra preflight round trip.
      fetch(API, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ e: name, c: channel })
      }).catch(function () {});
    } catch (e) {}
  }

  // One visit per browser per day, remembered on the device (not on a server).
  var d = new Date();
  var today = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  if (get('PH_LV') !== today) { set('PH_LV', today); send('visit'); }

  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('a[href^="play/"]');
    if (a) send('try_free');
  });
})();
