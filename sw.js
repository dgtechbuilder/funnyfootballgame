// ============================================================================
//  SERVICE WORKER: makes the game load instantly and play with no connection.
//
//  The published build (tools/build.mjs) fills in VERSION and PRECACHE: one
//  bundled script, the fonts, the icons and the page. The first visit stores
//  all of it in one go; after that the game starts from the device, never
//  waits on the network, and works in airplane mode. New versions download
//  quietly in the background and are used from the next launch, so a match
//  is never interrupted and a half-downloaded update is never used.
//
//  Running from the source folder (no build), VERSION stays a placeholder and
//  the worker goes network-first, so edits show up on reload.
// ============================================================================

const VERSION = '__VERSION__';
const PRECACHE = ['./', 'index.html']; // replaced by the build
const DEV = VERSION.indexOf('__') === 0;
const CACHE = 'monate-' + (DEV ? 'dev' : VERSION);
const PAGE = 'index.html';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // The page itself must be fresh (it names the script to load); everything else has a
    // content hash in its name or never changes, so the copy the browser just downloaded is fine.
    await Promise.all(PRECACHE.map(async url => {
      const fresh = url === './' || url === PAGE;
      const res = await fetch(new Request(url, { cache: fresh ? 'reload' : 'default' }));
      if (!res.ok) throw new Error(`precache ${url}: ${res.status}`);
      await cache.put(url, res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('monate-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(DEV ? networkFirst(req) : cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  // any page load (index.html?gfx=low, the bare folder URL, ...) gets the stored page
  if (req.mode === 'navigate') {
    const page = await cache.match(PAGE) || await cache.match('./');
    if (page) return page;
  }
  const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch (err) {
    if (req.mode === 'navigate') return new Response(OFFLINE_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    throw err;
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' && await cache.match(PAGE));
    if (hit) return hit;
    throw err;
  }
}

const OFFLINE_PAGE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Monate Cup</title><body style="margin:0;height:100vh;display:grid;place-items:center;background:#07091a;color:#fff;font:700 18px system-ui,sans-serif;text-align:center">
<div><div style="font-size:64px">⚽📶</div><p>No connection, and the game has not finished downloading yet.</p>
<p style="color:#ffe066">Connect once for a minute and it will play offline after that.</p>
<button onclick="location.reload()" style="font:inherit;padding:12px 22px;border-radius:12px;border:0;background:#2b8a3e;color:#fff">Try again</button></div>`;
