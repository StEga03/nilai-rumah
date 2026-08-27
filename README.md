# Nilai Rumah

Catatan penilaian rumah kontrakan untuk dipakai berdua sambil survey di lokasi.

**Live:** https://stega03.github.io/nilai-rumah/

## Cara pakai

1. **+ Rumah baru** — isi nama/alamat, harga sewa, dan (opsional) link iklannya.
2. Layar penilaian punya tiga bagian: **Pencatatan** (nama, link, harga),
   **Penilaian Kriteria** (semua kriteria, urutannya persis seperti yang
   disusun di layar Kriteria), dan **Catatan** (teks bebas).
3. Kembali ke daftar — rumah otomatis terurut dari skor tertinggi.
4. **Kriteria** — tambah, ubah, hapus, ganti tipe, atau **urutkan ulang** kapan pun,
   termasuk di lokasi. Tahan pegangan ⠿ lalu tarik; layar ikut menggulir
   sendiri kalau ditarik sampai pinggir. Panah atas/bawah di keyboard juga
   memindahkan baris kalau pegangannya sedang difokus.

Urutan kriteria adalah urutan yang muncul di layar penilaian, **apa pun
tipenya** — susun sesuai rute jalan kaki keliling rumah supaya tinggal turun
tanpa lompat-lompat.
Mengurutkan ulang **tidak menggeser skor rumah mana pun**: skor menempel ke
identitas kriteria, bukan ke posisinya.

## Tipe kriteria

Tiap kriteria punya tipe, diatur di layar Kriteria:

| Tipe | Isian | Ikut skor? |
|---|---|---|
| **Skor 1–10** | tombol 1–10 per penilai; ketuk lagi untuk mengosongkan | ✅ satu-satunya yang dihitung |
| **Ya / Tidak** | dua tombol; ketuk lagi untuk mengosongkan | ❌ dihitung terpisah jadi `6/9 fasilitas` |
| **Rupiah** | angka, pemisah ribuan otomatis | ❌ dicatat |
| **Teks** | teks bebas | ❌ dicatat |
| **Daftar** | chip: ketik lalu Enter, atau ketuk saran | ❌ dicatat |

**Ya/Tidak sengaja tidak masuk rata-rata.** Kalau ikut dihitung, satu jawaban
"Ya" berbobot sama dengan satu penilaian penuh — sembilan pertanyaan fasilitas
akan lebih berat daripada seluruh penilaian kondisi rumah, dan karena isinya
seragam justru *melumatkan* perbedaan antar-rumah. Kalau suatu fasilitas
memang penting, buat kriteria tipe Skor untuk itu.

**Saran chip belajar dari rumah lain.** Apa pun yang pernah diketik untuk
kriteria yang sama di rumah mana pun muncul sebagai tawaran satu-ketuk di
rumah berikutnya — jadi daftar furniture cuma perlu diketik sekali.

**Ganti tipe menghapus data kriteria itu** di semua rumah, dengan sengaja:
angka rupiah tidak punya arti sebagai Ya/Tidak. Kriteria lain tidak tersentuh.

**Kriteria Skor bisa ditambah kapan saja.** Beberapa hal di daftar pencatatan
sebenarnya layak dinilai juga, dan tinggal ditambahkan sendiri kalau terasa
perlu — misalnya *Warna & tampilan interior* (mencatat "krem" saja tidak
menjawab apakah kalian suka), *Kedekatan fasilitas umum* (empat pertanyaan
"dekat" tidak punya definisi jarak), *Cahaya & panas matahari* (arah hadap
baru berarti lewat akibatnya), atau *Kelengkapan furniture*.

## Yang perlu diketahui

**Datanya cuma ada di browser HP yang dipakai.** Tidak ada server, tidak ada
akun, tidak ada yang terkirim ke mana pun. Repo ini publik, tapi isinya cuma
kode — penilaian rumah tidak pernah masuk ke sini.

Konsekuensinya: kalau data browser dibersihkan, atau halaman dibuka di HP lain
atau di mode incognito, datanya tidak ada. Karena itu ada menu **Backup** —
salin teksnya dan tempel ke WhatsApp diri sendiri di akhir hari.

**Skornya rata-rata semua kriteria, bobotnya sama rata.** Kriteria yang belum
dinilai tidak dihitung nol, jadi rumah yang baru dinilai separuh tidak
otomatis kalah dari yang sudah lengkap.

**Link cuma dibuka kalau `http://` atau `https://`.** Kalau host-nya tidak
berbentuk domain, tombol "Buka" tidak muncul — tombol yang berbohong lebih
buruk daripada tombol yang tidak ada. Tanpa protokol otomatis jadi `https://`.

**Harga sengaja tidak ikut dihitung ke skor.** Ditampilkan di sebelah skor
supaya "skor tinggi tapi mahal" kelihatan, tapi keputusan worth-it-nya milik
manusia, bukan rumus.

## Sebelum berangkat survey

Buka halamannya sekali di rumah saat masih ada WiFi. Service worker akan
menyimpan halaman + fontnya, jadi tetap kebuka di gang yang sinyalnya mati.

## Teknis

HTML/CSS/JS polos. Tidak ada dependency, tidak ada build step — file yang ada
di repo persis file yang jalan. Untuk mengetes lokal:

```
python3 -m http.server 8000
```

lalu buka `http://localhost:8000`. (Perlu server, bukan `file://`, karena
service worker tidak jalan di `file://`.)
