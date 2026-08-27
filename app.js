/* ═══════════════════════════════════════════════
   Nilai Rumah — seluruh logika aplikasi.
   Tanpa framework, tanpa build step: file ini
   persis yang jalan di HP.
   ═══════════════════════════════════════════════ */

'use strict';

const KEY = 'nilai-rumah/v1';
const MAX = 5; // skor tertinggi per kriteria

// Angka bulat + setengahnya. Setengah dipakai untuk memecah seri,
// bukan sebagai pilihan sehari-hari — makanya tombolnya lebih sempit.
const SKALA = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

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
        link: String(h.link || ''),
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

// Koma, bukan titik — 3,8 bukan 3.8.
function fmtSkor(n) {
  return n.toFixed(1).replace('.', ',');
}

// Teks bebas yang dijadikan href adalah jalur masuk `javascript:`.
// Cuma http/https yang boleh lewat; sisanya dianggap bukan link.
function linkAman(teks) {
  const t = String(teks || '').trim();
  if (!t || /\s/.test(t)) return null;
  let u;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : 'https://' + t);
  } catch (e) {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  // Host harus benar-benar berbentuk domain. Tanpa ini, catatan biasa
  // seperti "tanya pemiliknya" ikut jadi URL dan memunculkan tombol
  // "Buka" yang dijamin gagal — tombol yang berbohong lebih buruk
  // daripada tombol yang tidak muncul.
  if (!/^[a-z0-9.-]+$/i.test(u.hostname) || !u.hostname.includes('.')) return null;
  return u.href;
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
    skorEl.textContent = fmtSkor(skor);
  }
  const kecil = document.createElement('small');
  kecil.textContent = skor === null ? 'BELUM' : 'DARI ' + MAX;
  skorEl.appendChild(kecil);

  const meta = document.createElement('p');
  meta.className = 'house-meta';
  const bagian = [];
  if (h.price > 0) bagian.push('Rp ' + ringkas(h.price) + '/' + (h.period === 'tahun' ? 'thn' : 'bln'));
  bagian.push(jumlahKriteriaDinilai(h) + '/' + state.criteria.length + ' kriteria');
  if (linkAman(h.link)) bagian.push('↗');
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
  document.getElementById('in-link').value = h.link;
  document.getElementById('in-price').value = h.price ? rupiah(h.price) : '';
  document.getElementById('in-notes').value = h.notes;
  lucutSenjata();
  renderLink();
  renderPeriod();
  renderCriteria();
  renderScoreboard();
  tampilkan('house');
}

function renderLink() {
  const h = rumahAktif();
  if (!h) return;
  const a = document.getElementById('btn-link');
  const note = document.getElementById('link-note');
  const url = linkAman(h.link);

  if (url) {
    a.href = url;
    a.hidden = false;
  } else {
    // href dicabut, bukan cuma disembunyikan — supaya tidak ada
    // sisa alamat lama yang masih bisa terbuka.
    a.removeAttribute('href');
    a.hidden = true;
  }

  const adaIsi = h.link.trim().length > 0;
  note.hidden = !adaIsi || !!url;
  if (!note.hidden) note.textContent = 'Belum kebaca sebagai link. Pastikan tersalin utuh.';
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
  num.textContent = skor === null ? 'belum' : fmtSkor(skor);
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

      for (const n of SKALA) {
        const setengah = n % 1 !== 0;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = setengah ? 'half' : 'whole';
        // Tombol setengah cuma memuat "½" — angka penuhnya tidak
        // cukup ruang. Nilai sebenarnya tetap diumumkan lewat label.
        b.textContent = setengah ? '½' : String(n);
        b.setAttribute('aria-label', fmtSkor(n) + ' dari ' + MAX);
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

// Diisi sesaat sebelum render ulang supaya fokus keyboard tidak
// hilang setiap kali baris dipindahkan pakai panah.
let fokusPegangan = null;

function renderCriteriaEditor() {
  document.getElementById('in-rater-0').value = state.raters[0];
  document.getElementById('in-rater-1').value = state.raters[1];

  const ol = document.getElementById('crit-editor');
  ol.textContent = '';

  state.criteria.forEach((c, i) => {
    const li = document.createElement('li');
    li.dataset.id = c.id;

    const grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'grip';
    grip.textContent = '⠿';
    grip.setAttribute('aria-label', 'Pindahkan ' + c.name + '. Pakai panah atas/bawah, atau tarik.');
    grip.addEventListener('pointerdown', (e) => mulaiSeret(e, li, i));
    grip.addEventListener('keydown', (e) => {
      const arah = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (!arah) return;
      e.preventDefault();
      pindahKriteria(i, i + arah);
    });

    const no = document.createElement('span');
    no.className = 'no';
    no.textContent = String(i + 1).padStart(2, '0');

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

    li.append(grip, no, input, x);
    ol.appendChild(li);

    if (fokusPegangan === c.id) grip.focus();
  });

  fokusPegangan = null;
}

// Satu-satunya tempat urutan kriteria berubah — seret maupun panah
// keyboard sama-sama lewat sini.
function pindahKriteria(dari, ke) {
  if (ke < 0 || ke >= state.criteria.length || dari === ke) return;
  const [item] = state.criteria.splice(dari, 1);
  state.criteria.splice(ke, 0, item);
  simpan();
  fokusPegangan = item.id;
  renderCriteriaEditor();
}

/* ── Seret untuk mengurutkan ───────────────────
   Pointer Events, bukan touch/mouse terpisah: satu jalur kode yang
   sama melayani jari di HP dan mouse di laptop, jadi tidak ada
   cabang yang jarang teruji.
   Semua perhitungan pakai koordinat HALAMAN (clientY + scrollY),
   bukan koordinat layar — supaya gulir otomatis tidak mengacaukan
   posisi baris yang sedang ditarik. */

const TEPI_GULIR = 90; // jarak dari pinggir layar yang memicu gulir

let seret = null;

function mulaiSeret(e, li, index) {
  if (seret || !e.isPrimary) return;
  e.preventDefault();

  const ol = document.getElementById('crit-editor');
  const baris = [...ol.children];
  const rects = baris.map((el) => {
    const r = el.getBoundingClientRect();
    return { atas: r.top + window.scrollY, tinggi: r.height };
  });

  seret = {
    baris,
    rects,
    dariIndex: index,
    keIndex: index,
    tinggi: rects[index].tinggi,
    mulaiHalamanY: e.clientY + window.scrollY,
    terakhirClientY: e.clientY,
    raf: 0,
  };

  // Pointer dikunci ke pegangan: jari boleh keluar dari elemennya
  // tanpa seretan putus di tengah jalan.
  // Gagal mengunci pointer bukan alasan seretan batal — pendengar
  // pointermove sudah dipasang di window, jadi tanpa kunci pun
  // seretannya tetap jalan.
  try {
    e.target.setPointerCapture(e.pointerId);
  } catch (err) {
    /* abaikan */
  }
  li.classList.add('seret');
  document.body.classList.add('sedang-seret');
}

function gerakSeret(e) {
  if (!seret || !e.isPrimary) return;
  e.preventDefault();
  seret.terakhirClientY = e.clientY;
  perbaruiSeret();
}

function perbaruiSeret() {
  terapkanPosisi();
  aturGulir();
}

function terapkanPosisi() {
  const s = seret;
  if (!s) return;

  const dy = s.terakhirClientY + window.scrollY - s.mulaiHalamanY;
  const pusat = s.rects[s.dariIndex].atas + s.tinggi / 2 + dy;

  // Bandingkan dengan titik tengah baris TETANGGA, satu per satu ke
  // arah geseran — bukan dengan seluruh daftar sekaligus. Cara yang
  // kedua ikut menghitung titik tengah baris yang sedang ditarik itu
  // sendiri, sehingga geseran beberapa piksel pun sudah dianggap
  // tukar posisi.
  const tengah = (i) => s.rects[i].atas + s.rects[i].tinggi / 2;
  let ke = s.dariIndex;
  if (dy > 0) {
    while (ke < s.rects.length - 1 && pusat > tengah(ke + 1)) ke++;
  } else {
    while (ke > 0 && pusat < tengah(ke - 1)) ke--;
  }
  s.keIndex = ke;

  for (let j = 0; j < s.baris.length; j++) {
    if (j === s.dariIndex) {
      s.baris[j].style.transform = 'translateY(' + dy + 'px)';
      continue;
    }
    let geser = 0;
    if (s.dariIndex < ke && j > s.dariIndex && j <= ke) geser = -s.tinggi;
    else if (s.dariIndex > ke && j >= ke && j < s.dariIndex) geser = s.tinggi;
    s.baris[j].style.transform = geser ? 'translateY(' + geser + 'px)' : '';
  }
}

// Tanpa gulir otomatis, 13 kriteria lebih tinggi dari layar HP dan
// baris paling bawah tidak akan pernah bisa ditarik ke paling atas.
function kecepatanGulir() {
  const s = seret;
  if (!s) return 0;
  const y = s.terakhirClientY;
  const bawah = window.innerHeight - TEPI_GULIR;
  if (y < TEPI_GULIR) return -Math.ceil((TEPI_GULIR - y) / 5);
  if (y > bawah) return Math.ceil((y - bawah) / 5);
  return 0;
}

// Loop rAF HANYA hidup selama jari benar-benar di dekat tepi.
// Membiarkannya berputar sepanjang seretan bikin timer kelaparan dan
// HP bekerja terus-menerus untuk menghitung nol.
function aturGulir() {
  const s = seret;
  if (!s) return;
  const perlu = kecepatanGulir() !== 0;
  if (perlu && !s.raf) s.raf = requestAnimationFrame(gulirOtomatis);
  else if (!perlu && s.raf) {
    cancelAnimationFrame(s.raf);
    s.raf = 0;
  }
}

function gulirOtomatis() {
  const s = seret;
  if (!s) return;
  const d = kecepatanGulir();
  if (!d) {
    s.raf = 0;
    return;
  }
  const sebelum = window.scrollY;
  window.scrollBy(0, d);
  if (window.scrollY !== sebelum) terapkanPosisi();
  s.raf = requestAnimationFrame(gulirOtomatis);
}

function selesaiSeret(e) {
  const s = seret;
  if (!s || (e && !e.isPrimary)) return;
  seret = null;
  if (s.raf) cancelAnimationFrame(s.raf);

  document.body.classList.remove('sedang-seret');
  for (const el of s.baris) {
    el.style.transform = '';
    el.classList.remove('seret');
  }

  if (s.keIndex !== s.dariIndex) {
    pindahKriteria(s.dariIndex, s.keIndex);
  } else {
    renderCriteriaEditor();
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

  // Dipasang di window, bukan di pegangannya: pointercancel bisa
  // datang dari mana saja (telepon masuk, gestur sistem), dan kalau
  // terlewat, barisnya nyangkut menggantung selamanya.
  window.addEventListener('pointermove', gerakSeret, { passive: false });
  window.addEventListener('pointerup', selesaiSeret);
  window.addEventListener('pointercancel', selesaiSeret);

  // Isian rumah — simpan tiap ketikan
  const nama = document.getElementById('in-name');
  nama.addEventListener('input', () => {
    const h = rumahAktif();
    if (!h) return;
    h.name = nama.value;
    simpan();
  });

  const link = document.getElementById('in-link');
  link.addEventListener('input', () => {
    const h = rumahAktif();
    if (!h) return;
    h.link = link.value;
    simpan();
    renderLink();
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
    link: '',
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
