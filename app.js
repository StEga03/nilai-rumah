/* ═══════════════════════════════════════════════
   Nilai Rumah — seluruh logika aplikasi.
   Tanpa framework, tanpa build step: file ini
   persis yang jalan di HP.
   ═══════════════════════════════════════════════ */

'use strict';

const KEY = 'nilai-rumah/v1';
const MAX = 5; // skor tertinggi per kriteria

const KRITERIA_AWAL = [
  'Harga & ruang nego',
  'Luas & jumlah kamar',
  'Kondisi bangunan (retak, bocor, cat)',
  'Air (lancar, jernih, sumber)',
  'Listrik (daya & instalasi)',
  'Kamar mandi',
  'Dapur',
  'Parkir motor / mobil',
  'Keamanan lingkungan',
  'Kebisingan',
  'Akses jalan / lebar gang',
  'Tetangga & lingkungan',
  'Jarak ke tempat kerja',
];

/* ── Keadaan ──────────────────────────────────── */

let state = muat();
let houseId = null; // rumah yang sedang dibuka

function bikinAwal() {
  return {
    version: 1,
    raters: ['Saya', 'Istri'],
    criteria: KRITERIA_AWAL.map((name) => ({ id: uid(), name })),
    houses: [],
  };
}

function muat() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return bikinAwal();
    const data = JSON.parse(raw);
    return rapikan(data);
  } catch (e) {
    console.warn('Data tersimpan tidak terbaca, mulai dari awal.', e);
    return bikinAwal();
  }
}

// Menerima data dari mana pun (backup lama, hasil tempel yang dipotong)
// dan mengembalikan bentuk yang aman dipakai render.
function rapikan(d) {
  const dasar = bikinAwal();
  if (!d || typeof d !== 'object') return dasar;

  const raters = Array.isArray(d.raters) && d.raters.length === 2
    ? d.raters.map((r, i) => String(r || dasar.raters[i]).slice(0, 12))
    : dasar.raters;

  const criteria = Array.isArray(d.criteria) && d.criteria.length
    ? d.criteria
        .filter((c) => c && c.name)
        .map((c) => ({ id: String(c.id || uid()), name: String(c.name) }))
    : dasar.criteria;

  const houses = Array.isArray(d.houses)
    ? d.houses.filter(Boolean).map((h) => ({
        id: String(h.id || uid()),
        name: String(h.name || ''),
        price: Number(h.price) || 0,
        period: h.period === 'tahun' ? 'tahun' : 'bulan',
        notes: String(h.notes || ''),
        scores: h.scores && typeof h.scores === 'object' ? h.scores : {},
        createdAt: Number(h.createdAt) || Date.now(),
      }))
    : [];

  return { version: 1, raters, criteria, houses };
}

function simpan() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // Kuota penuh atau localStorage diblokir (mode private).
    // Diam-diam gagal = data hilang tanpa sadar, jadi harus berisik.
    alertSekali('Data GAGAL tersimpan. Buka menu Backup dan salin datanya sekarang juga.');
    console.error(e);
  }
}

let sudahDiperingatkan = false;
function alertSekali(pesan) {
  if (sudahDiperingatkan) return;
  sudahDiperingatkan = true;
  const el = document.createElement('p');
  el.className = 'backup-msg';
  el.dataset.err = '1';
  el.style.cssText = 'position:fixed;inset:auto 12px 12px;z-index:200;background:#F7F2E8;border:2px solid #C13A16;border-radius:4px;padding:12px;margin:0';
  el.textContent = pesan;
  document.body.appendChild(el);
}

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

/* ── Hitungan ─────────────────────────────────── */

// Rata-rata seluruh skor yang SUDAH diisi. Kriteria yang belum
// dinilai tidak dianggap nol — kalau dianggap nol, rumah yang baru
// dinilai separuh akan selalu kalah dari rumah yang sudah lengkap.
function skorRumah(h) {
  const nilai = [];
  for (const c of state.criteria) {
    const pasangan = h.scores[c.id];
    if (!Array.isArray(pasangan)) continue;
    for (const n of pasangan) {
      if (typeof n === 'number' && n >= 1 && n <= MAX) nilai.push(n);
    }
  }
  if (!nilai.length) return null;
  return nilai.reduce((a, b) => a + b, 0) / nilai.length;
}

function jumlahKriteriaDinilai(h) {
  return state.criteria.filter((c) => {
    const p = h.scores[c.id];
    return Array.isArray(p) && p.some((n) => typeof n === 'number');
  }).length;
}

function rupiah(n) {
  return n.toLocaleString('id-ID');
}

function ringkas(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(n % 1e9 ? 1 : 0).replace('.', ',') + ' M';
  if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace('.', ',') + ' jt';
  if (n >= 1e3) return Math.round(n / 1e3) + ' rb';
  return String(n);
}

/* ── Pindah layar ─────────────────────────────── */

const views = {
  list: document.getElementById('view-list'),
  house: document.getElementById('view-house'),
  criteria: document.getElementById('view-criteria'),
  backup: document.getElementById('view-backup'),
};

function tampilkan(nama) {
  for (const [k, el] of Object.entries(views)) el.hidden = k !== nama;
  window.scrollTo(0, 0);
  if (nama === 'list') renderList();
  if (nama === 'criteria') renderCriteriaEditor();
  if (nama === 'backup') renderBackup();
}

/* ── Layar: daftar rumah ──────────────────────── */

function renderList() {
  const wrap = document.getElementById('house-list');
  const urut = [...state.houses].sort((a, b) => {
    const sa = skorRumah(a);
    const sb = skorRumah(b);
    if (sa === null && sb === null) return a.createdAt - b.createdAt;
    if (sa === null) return 1; // yang belum dinilai selalu di bawah
    if (sb === null) return -1;
    return sb - sa;
  });

  wrap.textContent = '';
  for (let i = 0; i < urut.length; i++) {
    wrap.appendChild(kartuRumah(urut[i], i + 1));
  }

  document.getElementById('empty-note').hidden = urut.length > 0;
  document.getElementById('meta-count').textContent = urut.length + ' rumah';
  document.getElementById('meta-date').textContent =
    new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function kartuRumah(h, rank) {
  const skor = skorRumah(h);
  const el = document.createElement('button');
  el.className = 'house';
  el.type = 'button';
  el.addEventListener('click', () => bukaRumah(h.id));

  const num = document.createElement('span');
  num.className = 'house-rank';
  num.textContent = String(rank).padStart(2, '0');

  const nama = document.createElement('h2');
  nama.className = 'house-name';
  nama.textContent = h.name || 'Rumah tanpa nama';

  const skorEl = document.createElement('div');
  skorEl.className = 'house-score';
  if (skor === null) {
    skorEl.dataset.none = '1';
    skorEl.textContent = '–';
  } else {
    skorEl.textContent = skor.toFixed(1);
  }
  const kecil = document.createElement('small');
  kecil.textContent = skor === null ? 'BELUM' : 'DARI ' + MAX;
  skorEl.appendChild(kecil);

  const meta = document.createElement('p');
  meta.className = 'house-meta';
  const bagian = [];
  if (h.price > 0) bagian.push('Rp ' + ringkas(h.price) + '/' + (h.period === 'tahun' ? 'thn' : 'bln'));
  bagian.push(jumlahKriteriaDinilai(h) + '/' + state.criteria.length + ' kriteria');
  meta.textContent = bagian.join('  ·  ');

  const bar = document.createElement('div');
  bar.className = 'bar';
  const isi = document.createElement('span');
  isi.style.width = skor === null ? '0%' : (skor / MAX) * 100 + '%';
  bar.appendChild(isi);

  el.append(num, nama, skorEl, meta, bar);
  return el;
}

/* ── Layar: nilai satu rumah ──────────────────── */

function rumahAktif() {
  return state.houses.find((h) => h.id === houseId) || null;
}

function bukaRumah(id) {
  houseId = id;
  const h = rumahAktif();
  if (!h) return tampilkan('list');

  document.getElementById('in-name').value = h.name;
  document.getElementById('in-price').value = h.price ? rupiah(h.price) : '';
  document.getElementById('in-notes').value = h.notes;
  lucutSenjata();
  renderPeriod();
  renderCriteria();
  renderScoreboard();
  tampilkan('house');
}

function renderPeriod() {
  const h = rumahAktif();
  if (!h) return;
  for (const b of document.querySelectorAll('#seg-period button')) {
    b.setAttribute('aria-pressed', String(b.dataset.period === h.period));
  }
  const note = document.getElementById('price-note');
  if (!h.price) {
    note.hidden = true;
    return;
  }
  note.hidden = false;
  note.textContent = h.period === 'tahun'
    ? '≈ Rp ' + ringkas(Math.round(h.price / 12)) + ' per bulan'
    : '≈ Rp ' + ringkas(h.price * 12) + ' per tahun';
}

function renderScoreboard() {
  const h = rumahAktif();
  if (!h) return;
  const skor = skorRumah(h);
  const num = document.getElementById('house-score');
  num.textContent = skor === null ? 'belum' : skor.toFixed(1);
  if (skor === null) num.dataset.none = '1';
  else delete num.dataset.none;
  document.getElementById('house-progress').textContent =
    jumlahKriteriaDinilai(h) + ' dari ' + state.criteria.length + ' kriteria dinilai';
}

function renderCriteria() {
  const h = rumahAktif();
  const wrap = document.getElementById('criteria-list');
  wrap.textContent = '';
  if (!h) return;

  for (const c of state.criteria) {
    const box = document.createElement('div');
    box.className = 'crit';

    const judul = document.createElement('h3');
    judul.className = 'crit-name';
    judul.textContent = c.name;
    box.appendChild(judul);

    for (let r = 0; r < 2; r++) {
      const baris = document.createElement('div');
      baris.className = 'rater';

      const tag = document.createElement('span');
      tag.className = 'rater-tag';
      tag.textContent = state.raters[r];

      const dots = document.createElement('div');
      dots.className = 'dots';
      dots.setAttribute('role', 'group');
      dots.setAttribute('aria-label', c.name + ' — ' + state.raters[r]);

      for (let n = 1; n <= MAX; n++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = String(n);
        b.setAttribute('aria-pressed', String(nilaiSaatIni(h, c.id, r) === n));
        b.addEventListener('click', () => setSkor(c.id, r, n));
        dots.appendChild(b);
      }

      baris.append(tag, dots);
      box.appendChild(baris);
    }

    wrap.appendChild(box);
  }
}

function nilaiSaatIni(h, critId, r) {
  const p = h.scores[critId];
  return Array.isArray(p) ? p[r] : undefined;
}

function setSkor(critId, r, n) {
  const h = rumahAktif();
  if (!h) return;
  if (!Array.isArray(h.scores[critId])) h.scores[critId] = [null, null];
  // Ketuk angka yang sama = batalkan. Penting: tanpa ini, salah
  // ketuk tidak bisa dibersihkan, cuma bisa diganti angka lain.
  h.scores[critId][r] = h.scores[critId][r] === n ? null : n;
  simpan();
  renderCriteria();
  renderScoreboard();
}

/* ── Layar: kriteria ──────────────────────────── */

function renderCriteriaEditor() {
  document.getElementById('in-rater-0').value = state.raters[0];
  document.getElementById('in-rater-1').value = state.raters[1];

  const ol = document.getElementById('crit-editor');
  ol.textContent = '';

  for (const c of state.criteria) {
    const li = document.createElement('li');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = c.name;
    input.addEventListener('input', () => {
      c.name = input.value;
      simpan();
    });

    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'x';
    x.textContent = '×';
    x.setAttribute('aria-label', 'Hapus kriteria ' + c.name);
    duaLangkah(x, () => hapusKriteria(c.id));

    li.append(input, x);
    ol.appendChild(li);
  }
}

function hapusKriteria(id) {
  state.criteria = state.criteria.filter((c) => c.id !== id);
  for (const h of state.houses) delete h.scores[id];
  simpan();
  renderCriteriaEditor();
}

/* ── Layar: backup ────────────────────────────── */

function renderBackup() {
  document.getElementById('backup-box').value = JSON.stringify(state);
  pesanBackup('', false);
}

function pesanBackup(teks, error) {
  const el = document.getElementById('backup-msg');
  el.hidden = !teks;
  el.textContent = teks;
  if (error) el.dataset.err = '1';
  else delete el.dataset.err;
}

/* ── Tombol dua langkah (ganti confirm()) ─────── */

const timers = new WeakMap();

function duaLangkah(el, aksi) {
  el.addEventListener('click', () => {
    if (el.dataset.armed === '1') {
      clearTimeout(timers.get(el));
      delete el.dataset.armed;
      aksi();
      return;
    }
    el.dataset.armed = '1';
    el.dataset.label = el.textContent;
    if (el.classList.contains('del')) el.textContent = 'Yakin?';
    timers.set(el, setTimeout(() => lucutSatu(el), 3500));
  });
}

function lucutSatu(el) {
  if (el.dataset.armed !== '1') return;
  delete el.dataset.armed;
  if (el.dataset.label) el.textContent = el.dataset.label;
}

function lucutSenjata() {
  for (const el of document.querySelectorAll('[data-armed]')) lucutSatu(el);
}

/* ── Pemasangan ───────────────────────────────── */

function pasang() {
  // Navigasi & aksi berbasis data-act
  document.body.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    if (act === 'go-list') tampilkan('list');
    if (act === 'go-criteria') tampilkan('criteria');
    if (act === 'go-backup') tampilkan('backup');
    if (act === 'new-house') rumahBaru();
    if (act === 'copy-backup') salinBackup();
    if (act === 'import-backup') pulihkanBackup();
  });

  duaLangkah(document.querySelector('[data-act="delete-house"]'), hapusRumah);

  // Isian rumah — simpan tiap ketikan
  const nama = document.getElementById('in-name');
  nama.addEventListener('input', () => {
    const h = rumahAktif();
    if (!h) return;
    h.name = nama.value;
    simpan();
  });

  const harga = document.getElementById('in-price');
  harga.addEventListener('input', () => {
    const h = rumahAktif();
    if (!h) return;
    const angka = harga.value.replace(/\D/g, '');
    h.price = angka ? parseInt(angka, 10) : 0;
    // Tulis ulang dengan pemisah ribuan sambil menjaga kursor di ujung:
    // di HP kursor praktis selalu di akhir, jadi ini aman.
    harga.value = h.price ? rupiah(h.price) : '';
    simpan();
    renderPeriod();
  });

  const catatan = document.getElementById('in-notes');
  catatan.addEventListener('input', () => {
    const h = rumahAktif();
    if (!h) return;
    h.notes = catatan.value;
    simpan();
  });

  document.getElementById('seg-period').addEventListener('click', (e) => {
    const b = e.target.closest('[data-period]');
    const h = rumahAktif();
    if (!b || !h) return;
    h.period = b.dataset.period;
    simpan();
    renderPeriod();
  });

  // Nama penilai
  for (const i of [0, 1]) {
    const el = document.getElementById('in-rater-' + i);
    el.addEventListener('input', () => {
      state.raters[i] = el.value || (i === 0 ? 'Saya' : 'Istri');
      simpan();
    });
  }

  // Tambah kriteria
  document.getElementById('form-add-crit').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('in-new-crit');
    const teks = input.value.trim();
    if (!teks) return;
    state.criteria.push({ id: uid(), name: teks });
    input.value = '';
    simpan();
    renderCriteriaEditor();
    input.focus();
  });
}

function rumahBaru() {
  const h = {
    id: uid(),
    name: '',
    price: 0,
    period: 'bulan',
    notes: '',
    scores: {},
    createdAt: Date.now(),
  };
  state.houses.push(h);
  simpan();
  bukaRumah(h.id);
  document.getElementById('in-name').focus();
}

function hapusRumah() {
  state.houses = state.houses.filter((h) => h.id !== houseId);
  houseId = null;
  simpan();
  tampilkan('list');
}

async function salinBackup() {
  const box = document.getElementById('backup-box');
  const teks = box.value;
  try {
    await navigator.clipboard.writeText(teks);
    pesanBackup('Tersalin. Tempel ke WhatsApp diri sendiri sekarang.', false);
  } catch (e) {
    // clipboard API butuh HTTPS & izin; kalau gagal, biarkan
    // penggunanya menyalin manual daripada mengira sudah tersalin.
    box.focus();
    box.select();
    pesanBackup('Otomatis gagal. Teksnya sudah disorot — salin manual.', true);
  }
}

function pulihkanBackup() {
  const box = document.getElementById('backup-box');
  let data;
  try {
    data = JSON.parse(box.value);
  } catch (e) {
    pesanBackup('Teksnya tidak terbaca. Pastikan tersalin utuh dari awal { sampai } terakhir.', true);
    return;
  }
  state = rapikan(data);
  simpan();
  pesanBackup('Pulih: ' + state.houses.length + ' rumah, ' + state.criteria.length + ' kriteria.', false);
  renderList();
}

/* ── Jalan ────────────────────────────────────── */

pasang();
tampilkan('list');

// Service worker: supaya halaman tetap kebuka waktu di gang
// tanpa sinyal. Gagal daftar bukan alasan aplikasi tidak jalan.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW gagal:', e));
  });
}
