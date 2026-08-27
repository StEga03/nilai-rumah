/* ═══════════════════════════════════════════════
   Nilai Rumah — seluruh logika aplikasi.
   Tanpa framework, tanpa build step: file ini
   persis yang jalan di HP.
   ═══════════════════════════════════════════════ */

'use strict';

const KEY = 'nilai-rumah/v1';
const VERSI = 2;
const MAX = 10; // skor tertinggi per kriteria

const SKALA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Tipe kriteria. Hanya `skor` yang masuk rata-rata: kalau "ada gym = Ya"
// ikut dihitung, satu jawaban Ya berbobot sama dengan satu penilaian
// penuh, dan blok fasilitas yang isinya seragam justru MELUMATKAN
// perbedaan antar-rumah — kebalikan dari guna alat ini.
const TIPE = {
  skor: 'Skor 1–10',
  yatidak: 'Ya / Tidak',
  rupiah: 'Rupiah',
  teks: 'Teks',
  daftar: 'Daftar',
};

const TIPE_BAWAAN = 'skor';

// Bawaan gelombang 1 — semuanya penilaian.
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
].map((name) => ({ name, type: 'skor' }));

// Bawaan gelombang 2 — daftar pencatatan, ditambahkan juga ke data
// yang sudah ada supaya tidak perlu diketik ulang satu per satu.
const KRITERIA_CATATAN = [
  { name: 'Furniture yang dikasih', type: 'daftar', opsi: [
    'AC', 'Kasur', 'Lemari', 'Sofa', 'Meja makan', 'Kursi makan', 'Kulkas',
    'Mesin cuci', 'Kompor', 'Water heater', 'Gorden', 'TV', 'Dispenser', 'Rak sepatu',
  ] },
  { name: 'Bisa bayar per berapa', type: 'daftar', opsi: [
    'Per bulan', 'Per 3 bulan', 'Per 6 bulan', 'Per tahun', 'Per 2 tahun',
  ] },
  { name: 'Biaya IPKL (per bulan)', type: 'rupiah' },
  { name: 'Biaya deposit', type: 'rupiah' },
  { name: 'Listrik (VA)', type: 'teks' },
  { name: 'Luas tanah (m²)', type: 'teks' },
  { name: 'Luas bangunan (m²)', type: 'teks' },
  { name: 'Jumlah lantai', type: 'teks' },
  { name: 'Jumlah kamar', type: 'teks' },
  { name: 'Jumlah kamar mandi', type: 'teks' },
  { name: 'Nama cluster', type: 'teks' },
  { name: 'Rumah hadap ke mana', type: 'teks' },
  { name: 'Warna tembok', type: 'teks' },
  { name: 'Ada gym?', type: 'yatidak' },
  { name: 'Ada kolam renang?', type: 'yatidak' },
  { name: 'Dekat rumah sakit?', type: 'yatidak' },
  { name: 'Dekat pasar?', type: 'yatidak' },
  { name: 'Dekat area komersil?', type: 'yatidak' },
  { name: 'Dekat tol?', type: 'yatidak' },
  { name: 'Ada kanopi?', type: 'yatidak' },
  { name: 'Ada backyard?', type: 'yatidak' },
  { name: 'Teras muat 2 mobil?', type: 'yatidak' },
];

/* ── Keadaan ──────────────────────────────────── */

let state = muat();
let houseId = null; // rumah yang sedang dibuka

function bikinAwal() {
  return {
    version: VERSI,
    raters: ['Saya', 'Istri'],
    criteria: [...KRITERIA_AWAL, ...KRITERIA_CATATAN].map(bikinKriteria),
    houses: [],
  };
}

function bikinKriteria(k) {
  const c = { id: uid(), name: String(k.name), type: TIPE[k.type] ? k.type : TIPE_BAWAAN };
  if (c.type === 'daftar') c.opsi = Array.isArray(k.opsi) ? k.opsi.map(String) : [];
  return c;
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

  // Data sebelum VERSI 2 memakai skala 1–5 (dengan setengahan) dan
  // kriteria tanpa tipe. Dikenali dari nomor versinya, bukan dari
  // menebak isi — tebakan akan salah pada data yang kebetulan
  // seluruh skornya bernilai rendah.
  const lama = (Number(d.version) || 1) < 2;

  const criteria = Array.isArray(d.criteria) && d.criteria.length
    ? d.criteria.filter((c) => c && c.name).map((c) => {
        const baru = bikinKriteria({ name: c.name, type: c.type, opsi: c.opsi });
        // id asli WAJIB dipertahankan: skor dan data menempel padanya.
        if (c.id) baru.id = String(c.id);
        return baru;
      })
    : dasar.criteria;

  const houses = Array.isArray(d.houses)
    ? d.houses.filter(Boolean).map((h) => ({
        id: String(h.id || uid()),
        name: String(h.name || ''),
        link: String(h.link || ''),
        price: Number(h.price) || 0,
        period: h.period === 'tahun' ? 'tahun' : 'bulan',
        notes: String(h.notes || ''),
        scores: bersihkanSkor(h.scores, lama),
        data: bersihkanData(h.data, criteria),
        createdAt: Number(h.createdAt) || Date.now(),
      }))
    : [];

  const hasil = { version: VERSI, raters, criteria, houses };
  if (lama) tambahKriteriaCatatan(hasil);
  return hasil;
}

// Skala 1–5 (+setengahan) menjadi 1–10 dengan dikali dua: 4½ → 9,
// 3 → 6. Pemetaannya pas, tidak ada yang hilang. Efek sampingnya
// jujur: skor lama tidak akan pernah menjadi 1, paling rendah 2.
function bersihkanSkor(scores, lama) {
  const keluar = {};
  if (!scores || typeof scores !== 'object') return keluar;
  for (const [id, pasangan] of Object.entries(scores)) {
    if (!Array.isArray(pasangan)) continue;
    keluar[id] = [0, 1].map((i) => {
      const n = pasangan[i];
      if (typeof n !== 'number' || !isFinite(n)) return null;
      const v = lama ? n * 2 : n;
      return v >= 1 && v <= MAX ? Math.round(v) : null;
    });
  }
  return keluar;
}

function bersihkanData(data, criteria) {
  const keluar = {};
  if (!data || typeof data !== 'object') return keluar;
  const tipeDari = {};
  for (const c of criteria) tipeDari[c.id] = c.type;
  for (const [id, nilai] of Object.entries(data)) {
    const t = tipeDari[id];
    if (!t) continue; // kriteria sudah dihapus — buang datanya juga
    if (t === 'yatidak') keluar[id] = nilai === true ? true : nilai === false ? false : null;
    else if (t === 'rupiah') keluar[id] = Number(nilai) || 0;
    else if (t === 'teks') keluar[id] = String(nilai == null ? '' : nilai);
    else if (t === 'daftar') keluar[id] = Array.isArray(nilai) ? nilai.map(String) : [];
  }
  return keluar;
}

// Menambahkan daftar pencatatan ke data yang SUDAH ada, sekali saja.
// Tanpa ini, orang yang sudah memakai versi lama harus mengetik 22
// kriteria satu per satu — dan seluruh gunanya hilang.
function tambahKriteriaCatatan(s) {
  const sudahAda = new Set(s.criteria.map((c) => c.name.trim().toLowerCase()));
  for (const k of KRITERIA_CATATAN) {
    if (sudahAda.has(k.name.trim().toLowerCase())) continue;
    s.criteria.push(bikinKriteria(k));
  }
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
function kriteriaSkor() {
  return state.criteria.filter((c) => c.type === 'skor');
}

function kriteriaCatatan() {
  return state.criteria.filter((c) => c.type !== 'skor');
}

function skorRumah(h) {
  const nilai = [];
  for (const c of kriteriaSkor()) {
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
  return kriteriaSkor().filter((c) => {
    const p = h.scores[c.id];
    return Array.isArray(p) && p.some((n) => typeof n === 'number');
  }).length;
}

// Ya/Tidak dihitung TERPISAH dan ditampilkan di sebelah skor, tidak
// dicampur ke rata-rata. Yang belum dijawab tidak dianggap "Tidak" —
// belum dicek dan tidak ada itu dua hal berbeda.
function fasilitasRumah(h) {
  const semua = state.criteria.filter((c) => c.type === 'yatidak');
  if (!semua.length) return null;
  const dijawab = semua.filter((c) => typeof h.data[c.id] === 'boolean');
  if (!dijawab.length) return null;
  return { ya: dijawab.filter((c) => h.data[c.id] === true).length, dari: semua.length };
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
  bagian.push(jumlahKriteriaDinilai(h) + '/' + kriteriaSkor().length + ' kriteria');
  const f = fasilitasRumah(h);
  if (f) bagian.push(f.ya + '/' + f.dari + ' fasilitas');
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
    jumlahKriteriaDinilai(h) + ' dari ' + kriteriaSkor().length + ' dinilai';

  const f = fasilitasRumah(h);
  const sel = document.getElementById('cell-fasilitas');
  sel.hidden = !f;
  if (f) document.getElementById('house-fasilitas').textContent = f.ya + '/' + f.dari;
}

function renderCriteria() {
  const h = rumahAktif();
  const nilai = document.getElementById('criteria-list');
  const catat = document.getElementById('catatan-list');
  nilai.textContent = '';
  catat.textContent = '';
  if (!h) return;

  const daftarNilai = kriteriaSkor();
  const daftarCatat = kriteriaCatatan();

  // Judul blok disembunyikan kalau bloknya kosong — kepala tanpa isi
  // terbaca seperti sesuatu yang gagal dimuat.
  document.getElementById('blok-nilai').hidden = !daftarNilai.length;
  document.getElementById('blok-catat').hidden = !daftarCatat.length;

  for (const c of daftarNilai) nilai.appendChild(kotakKriteria(h, c));
  for (const c of daftarCatat) catat.appendChild(kotakKriteria(h, c));

  renderHitungBlok();
}

// Dipanggil terpisah dari renderCriteria supaya isian teks bisa
// memperbarui penghitungnya TANPA menggambar ulang seluruh layar —
// menggambar ulang akan melempar kursor keluar dari kolom ketik.
function renderHitungBlok() {
  const h = rumahAktif();
  if (!h) return;
  const catat = kriteriaCatatan();
  document.getElementById('n-nilai').textContent =
    jumlahKriteriaDinilai(h) + '/' + kriteriaSkor().length;
  document.getElementById('n-catat').textContent =
    catat.filter((c) => sudahDicatat(h, c)).length + '/' + catat.length;
}

function sudahDicatat(h, c) {
  const v = h.data[c.id];
  if (c.type === 'yatidak') return typeof v === 'boolean';
  if (c.type === 'rupiah') return typeof v === 'number' && v > 0;
  if (c.type === 'teks') return typeof v === 'string' && v.trim() !== '';
  if (c.type === 'daftar') return Array.isArray(v) && v.length > 0;
  return false;
}

function kotakKriteria(h, c) {
  const box = document.createElement('div');
  box.className = 'crit';

  const judul = document.createElement('h3');
  judul.className = 'crit-name';
  judul.textContent = c.name;
  box.appendChild(judul);

  if (c.type === 'skor') isiSkor(box, h, c);
  else if (c.type === 'yatidak') isiYaTidak(box, h, c);
  else if (c.type === 'rupiah') isiRupiah(box, h, c);
  else if (c.type === 'teks') isiTeks(box, h, c);
  else if (c.type === 'daftar') isiDaftar(box, h, c);

  return box;
}

function isiSkor(box, h, c) {
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
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = String(n);
      b.setAttribute('aria-label', n + ' dari ' + MAX);
      b.setAttribute('aria-pressed', String(nilaiSaatIni(h, c.id, r) === n));
      b.addEventListener('click', () => setSkor(c.id, r, n));
      dots.appendChild(b);
    }

    baris.append(tag, dots);
    box.appendChild(baris);
  }
}

function isiYaTidak(box, h, c) {
  const baris = document.createElement('div');
  baris.className = 'yatidak';
  const sekarang = h.data[c.id];

  for (const [nilai, label] of [[true, 'Ya'], [false, 'Tidak']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.nilai = String(nilai);
    b.setAttribute('aria-pressed', String(sekarang === nilai));
    b.addEventListener('click', () => {
      // Ketuk pilihan yang sama = kosongkan lagi. "Belum dicek" dan
      // "tidak ada" itu dua hal berbeda, dan keduanya harus bisa
      // dinyatakan.
      h.data[c.id] = h.data[c.id] === nilai ? null : nilai;
      simpan();
      renderCriteria();
      renderScoreboard();
    });
    baris.appendChild(b);
  }
  box.appendChild(baris);
}

function isiRupiah(box, h, c) {
  const bungkus = document.createElement('div');
  bungkus.className = 'money';

  const pre = document.createElement('span');
  pre.className = 'money-pre';
  pre.textContent = 'Rp';

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.placeholder = '0';
  input.autocomplete = 'off';
  input.setAttribute('aria-label', c.name);
  input.value = h.data[c.id] ? rupiah(h.data[c.id]) : '';
  input.addEventListener('input', () => {
    const angka = input.value.replace(/\D/g, '');
    h.data[c.id] = angka ? parseInt(angka, 10) : 0;
    input.value = h.data[c.id] ? rupiah(h.data[c.id]) : '';
    simpan();
    renderHitungBlok();
  });

  bungkus.append(pre, input);
  box.appendChild(bungkus);
}

function isiTeks(box, h, c) {
  const input = document.createElement('input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.setAttribute('aria-label', c.name);
  input.value = h.data[c.id] || '';
  input.addEventListener('input', () => {
    h.data[c.id] = input.value;
    simpan();
    renderHitungBlok();
  });
  box.appendChild(input);
}

// Saran = pilihan bawaan kriteria + apa pun yang pernah diketik di
// rumah LAIN untuk kriteria yang sama. Itu yang menghapus keharusan
// mengetik ulang daftar barang yang sama di tiap rumah.
function saranDaftar(c, terpakai) {
  const sudah = new Set(terpakai.map((v) => v.trim().toLowerCase()));
  const keluar = [];
  const tambah = (v) => {
    const k = String(v).trim();
    if (!k || sudah.has(k.toLowerCase())) return;
    sudah.add(k.toLowerCase());
    keluar.push(k);
  };
  for (const o of c.opsi || []) tambah(o);
  for (const h of state.houses) {
    const v = h.data[c.id];
    if (Array.isArray(v)) for (const x of v) tambah(x);
  }
  return keluar;
}

function isiDaftar(box, h, c) {
  if (!Array.isArray(h.data[c.id])) h.data[c.id] = [];

  const chips = document.createElement('div');
  chips.className = 'chips';

  const form = document.createElement('form');
  form.className = 'chip-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.placeholder = 'ketik lalu Enter';
  input.setAttribute('aria-label', 'Tambah ke ' + c.name);
  const tombol = document.createElement('button');
  tombol.type = 'submit';
  tombol.className = 'btn btn-primary btn-sm';
  tombol.textContent = '+';
  form.append(input, tombol);

  const saran = document.createElement('div');
  saran.className = 'chips chips-saran';

  const tambah = (teks) => {
    const v = String(teks).trim();
    if (!v) return;
    const ada = h.data[c.id].some((x) => x.trim().toLowerCase() === v.toLowerCase());
    if (!ada) h.data[c.id].push(v);
    simpan();
    gambar();
    renderHitungBlok();
  };

  const buang = (i) => {
    h.data[c.id].splice(i, 1);
    simpan();
    gambar();
    renderHitungBlok();
  };

  // Menggambar ulang HANYA isi kotak ini, bukan seluruh layar —
  // supaya kursor tidak lompat keluar dari kolom ketiknya.
  function gambar() {
    chips.textContent = '';
    h.data[c.id].forEach((v, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.setAttribute('aria-label', 'Hapus ' + v + ' dari ' + c.name);
      const teks = document.createElement('span');
      teks.textContent = v;
      const x = document.createElement('span');
      x.className = 'chip-x';
      x.textContent = '×';
      chip.append(teks, x);
      chip.addEventListener('click', () => buang(i));
      chips.appendChild(chip);
    });

    saran.textContent = '';
    const daftarSaran = saranDaftar(c, h.data[c.id]).slice(0, 24);
    for (const s of daftarSaran) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip chip-saran';
      b.textContent = '+ ' + s;
      b.setAttribute('aria-label', 'Tambah ' + s + ' ke ' + c.name);
      b.addEventListener('click', () => tambah(s));
      saran.appendChild(b);
    }
    saran.hidden = !daftarSaran.length;
    chips.hidden = !h.data[c.id].length;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    tambah(input.value);
    input.value = '';
    input.focus();
  });

  gambar();
  box.append(chips, form, saran);
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

    const sel = document.createElement('select');
    sel.className = 'tipe';
    sel.setAttribute('aria-label', 'Tipe untuk ' + c.name);
    for (const [nilai, label] of Object.entries(TIPE)) {
      const o = document.createElement('option');
      o.value = nilai;
      o.textContent = label;
      o.selected = c.type === nilai;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => gantiTipe(c, sel.value));

    const atas = document.createElement('div');
    atas.className = 'crit-atas';
    atas.append(grip, no, input, x);

    const bawah = document.createElement('div');
    bawah.className = 'crit-bawah';
    bawah.append(sel);

    li.append(atas, bawah);
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
  for (const h of state.houses) {
    delete h.scores[id];
    delete h.data[id];
  }
  simpan();
  renderCriteriaEditor();
}

// Ganti tipe = data lama untuk kriteria itu tidak lagi berbentuk
// benar (angka rupiah menjadi tipe Ya/Tidak, dsb). Dibuang secara
// sadar dan hanya untuk kriteria itu — menyimpannya diam-diam akan
// muncul lagi sebagai nilai aneh kalau tipenya dikembalikan.
function gantiTipe(c, tipeBaru) {
  if (!TIPE[tipeBaru] || c.type === tipeBaru) return;
  c.type = tipeBaru;
  if (tipeBaru === 'daftar' && !Array.isArray(c.opsi)) c.opsi = [];
  for (const h of state.houses) {
    delete h.scores[c.id];
    delete h.data[c.id];
  }
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
    state.criteria.push(bikinKriteria({ name: teks, type: TIPE_BAWAAN }));
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
    data: {},
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
