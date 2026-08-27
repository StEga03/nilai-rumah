/* Service worker: satu-satunya tugasnya membuat halaman ini tetap
   terbuka tanpa sinyal. Rumah kontrakan sering di gang dalam yang
   sinyalnya mati — tanpa ini, halaman GitHub Pages gagal dimuat
   persis di saat dibutuhkan. */

const CACHE = 'nilai-rumah-v1';

const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !fonts) return;

  // Stale-while-revalidate: langsung sajikan dari cache (jadi tetap
  // jalan offline), sambil diam-diam ambil versi baru untuk kunjungan
  // berikutnya. Cache-first murni bikin perbaikan tidak pernah sampai.
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const segar = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      return cached || (await segar) || new Response('Offline', { status: 503 });
    })
  );
});
