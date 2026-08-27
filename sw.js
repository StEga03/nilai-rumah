/* Service worker: satu-satunya tugasnya membuat halaman ini tetap
   terbuka tanpa sinyal. Rumah kontrakan sering di gang dalam yang
   sinyalnya mati — tanpa ini, halaman GitHub Pages gagal dimuat
   persis di saat dibutuhkan. */

// Naikkan nomornya setiap kali index/app/style berubah.
const CACHE = 'nilai-rumah-v6';

// `./index.html` SENGAJA tidak ada di sini walau filenya ada.
// Menyimpan halaman yang sama di dua alamat (`./` dan `./index.html`)
// membuat CDN GitHub memperlakukannya sebagai dua sumber terpisah
// yang bisa berbeda versi — dan itu benar-benar terjadi: `./`
// menyajikan versi lama sementara `./index.html` sudah baru.
// Tidak ada yang meminta `index.html` langsung, jadi satu alamat saja.
const SHELL = ['./', './style.css', './app.js'];

// `cache: 'reload'` memaksa lewat jaringan, melewati cache HTTP
// browser. Tanpa ini, pemasangan versi baru bisa mengisi cache-nya
// dengan berkas LAMA yang masih dipegang browser — versinya naik,
// tapi isinya tidak pernah sampai ke layar.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(async (cache) => {
        for (const u of SHELL) {
          const res = await fetch(new Request(u, { cache: 'reload' }));
          if (res && res.ok) await cache.put(u, res);
        }
      })
      .then(() => self.skipWaiting())
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
  const sendiri = url.origin === self.location.origin;
  if (!sendiri && !fonts) return;

  // Stale-while-revalidate: langsung sajikan dari cache (jadi tetap
  // jalan offline), sambil diam-diam ambil versi baru untuk kunjungan
  // berikutnya. Cache-first murni bikin perbaikan tidak pernah sampai.
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);

      // Penyegaran berkas sendiri WAJIB melewati cache HTTP browser.
      // Kalau tidak, header max-age dari GitHub Pages membuat browser
      // menyajikan salinan lama berulang kali, dan halamannya tidak
      // pernah diperbarui betapapun sering dimuat ulang.
      const permintaan = sendiri ? new Request(req.url, { cache: 'no-cache' }) : req;

      const segar = fetch(permintaan)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);

      return cached || (await segar) || new Response('Offline', { status: 503 });
    })
  );
});
