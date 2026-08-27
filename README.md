# Nilai Rumah

Catatan penilaian rumah kontrakan untuk dipakai berdua sambil survey di lokasi.

**Live:** https://stega03.github.io/nilai-rumah/

## Cara pakai

1. **+ Rumah baru** — isi nama/alamat, harga sewa, dan (opsional) link iklannya.
2. Tiap kriteria punya dua baris skor: satu untuk masing-masing penilai.
   Angka bulat 1–5 tombolnya lebar; **½** di antaranya untuk nilai tengah
   (1½, 2½, 3½, 4½). Ketuk pilihan yang sama sekali lagi untuk membatalkan.
3. Kembali ke daftar — rumah otomatis terurut dari skor tertinggi.
4. **Kriteria** — tambah, ubah, hapus, atau **urutkan ulang** kapan pun,
   termasuk di lokasi. Tahan pegangan ⠿ lalu tarik; layar ikut menggulir
   sendiri kalau ditarik sampai pinggir. Panah atas/bawah di keyboard juga
   memindahkan baris kalau pegangannya sedang difokus.

Urutan kriteria adalah urutan yang muncul di layar penilaian — susun sesuai
rute jalan kaki keliling rumah supaya besok tinggal turun tanpa lompat-lompat.
Mengurutkan ulang **tidak menggeser skor rumah mana pun**: skor menempel ke
identitas kriteria, bukan ke posisinya.

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
