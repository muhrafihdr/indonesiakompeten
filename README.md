# Indonesia Kompeten — Website Lembaga Sertifikasi

Website resmi **Indonesia Kompeten**, lembaga sertifikasi profesi.
Dibuat sebagai situs statis (HTML + CSS + JavaScript) tanpa proses build,
sehingga dapat langsung di-hosting gratis di **GitHub Pages**.

- **Domain:** https://indonesiakompeten.web.id
- **Repository:** https://github.com/muhrafihdr/indonesiakompeten
- **Hosting:** GitHub Pages (branch `main`, folder root)

---

## 1. Struktur Berkas

```
.
├── index.html              # Beranda
├── tentang.html            # Profil, visi misi, nilai, legalitas
├── layanan.html            # Daftar skema + layanan + persyaratan
├── alur.html               # Alur sertifikasi 8 tahap
├── faq.html                # Pertanyaan umum
├── kontak.html             # Informasi kontak + formulir pendaftaran
├── 404.html                # Halaman error (otomatis dipakai GitHub Pages)
│
├── CNAME                   # Domain kustom untuk GitHub Pages
├── .nojekyll               # Mematikan pemrosesan Jekyll
├── robots.txt              # Instruksi mesin pencari
├── sitemap.xml             # Peta situs
├── site.webmanifest        # Metadata aplikasi web
│
└── assets/
    ├── css/style.css       # Seluruh tampilan (satu berkas)
    ├── js/main.js          # Seluruh interaksi + PENGATURAN PENTING
    └── img/
        ├── logo.svg        # Logo lembaga
        ├── favicon.svg     # Ikon tab peramban
        └── hero.svg        # Ilustrasi halaman beranda
```

Tidak ada framework, tidak ada `npm install`, tidak ada build. Cukup unggah
berkasnya dan situs langsung berjalan.

---

## 2. Menjalankan di Komputer Sendiri

Cara paling sederhana: klik dua kali `index.html`.

Agar lebih mendekati kondisi asli (dan agar tautan absolut seperti di `404.html`
bekerja), jalankan server lokal:

```bash
# Pilih salah satu
python3 -m http.server 8000
# atau
npx serve .
```

Lalu buka http://localhost:8000

---

## 3. Yang WAJIB Diubah Sebelum Dipublikasikan

Cari dan ganti semua teks di dalam tanda `[ ]`. Daftar lengkapnya:

| Lokasi | Teks yang harus diganti |
|---|---|
| `assets/js/main.js` (bagian `SITE`) | `whatsapp` — nomor WA, format `62812...` tanpa `+` dan tanpa spasi |
| `assets/js/main.js` (bagian `SITE`) | `email` — alamat email resmi |
| Semua halaman, bagian footer | `Jl. [Nama Jalan] No. [Nomor], [Kota], [Provinsi] [Kode Pos]` |
| Semua halaman, bagian footer & kontak | Nomor telepon tampilan `+62 812-3456-7890` |
| `tentang.html` bagian **Legalitas** | Akta pendirian, SK Kemenkumham, NIB, NPWP, lisensi BNSP, ruang lingkup |
| `layanan.html` | Pastikan daftar skema benar-benar tersedia/dilisensikan |
| `kontak.html` | Alamat, jam layanan, peta Google Maps, nomor rekening resmi |

> **Penting:** jangan mencantumkan nomor lisensi, akreditasi, atau skema yang
> belum benar-benar dimiliki lembaga. Informasi yang tidak akurat pada situs
> lembaga sertifikasi dapat menimbulkan masalah hukum.

Ada juga komentar penanda `<!-- CATATAN PENGELOLA: ... -->` di dalam kode pada
titik-titik yang perlu disesuaikan.

### Cara mengganti warna

Semua warna diatur di satu tempat: bagian `:root` pada `assets/css/style.css`.

```css
--blue-600: #1565d8;   /* warna utama */
--red-600:  #d62828;   /* warna aksen */
--gold-500: #f2a93b;   /* warna sorotan */
--navy-900: #071e33;   /* warna teks judul */
```

---

## 4. Formulir Pendaftaran

Formulir di `kontak.html` bekerja **tanpa server** dengan dua pilihan:

1. **Mode WhatsApp (bawaan).** Saat peserta menekan kirim, jawaban mereka
   dirangkai otomatis menjadi pesan WhatsApp ke nomor lembaga.
   Atur nomor di `assets/js/main.js` → `SITE.whatsapp`.

2. **Mode email (opsional).** Daftar gratis di [Formspree](https://formspree.io)
   atau layanan sejenis, lalu isi:

   ```js
   formEndpoint: "https://formspree.io/f/xxxxxxxx"
   ```

   Bila `formEndpoint` diisi, formulir akan dikirim sebagai email biasa.

---

## 5. Publikasi ke GitHub Pages

> **Status: sudah LIVE.** Website aktif penuh di **https://indonesiakompeten.web.id**
> dengan HTTPS, redirect `www` → domain utama, dan redirect `http` → `https`.
> Rincian lengkap ada di **[PANDUAN-DEPLOY.md](PANDUAN-DEPLOY.md)**.

Langkah yang sudah dikerjakan:

1. ✅ Unggah seluruh berkas ke branch `main`.
2. ✅ GitHub → **Settings → Pages** — Source: **Deploy from a branch** → `main` → `/ (root)`.
3. ✅ Isi **Custom domain**: `indonesiakompeten.web.id`.
4. ✅ Atur DNS di panel Sumopod (4 record `A`, 4 record `AAAA`, 1 record `CNAME` untuk `www`).
5. ✅ Aktifkan **Enforce HTTPS**.

Yang masih disarankan: **verifikasi kepemilikan domain** dengan record `TXT`
(lihat PANDUAN-DEPLOY.md → bagian verifikasi domain).

---

## 6. Ringkasan Fitur

- **Responsif** — nyaman dibaca di ponsel, tablet, dan desktop.
- **Cepat** — tanpa framework, tanpa gambar berat, seluruh ilustrasi berupa SVG.
- **Aksesibel** — struktur heading benar, ada *skip link*, fokus keyboard jelas,
  dan menghormati pengaturan *prefers-reduced-motion*.
- **Ramah SEO** — judul & deskripsi unik per halaman, `sitemap.xml`,
  `robots.txt`, Open Graph, dan data terstruktur Schema.org.
- **Navigasi mudah** — maksimal 6 menu, istilah sederhana, alur dijelaskan
  bertahap.
- **Penyaring skema** — peserta dapat menyaring skema berdasarkan bidang.
- **Tombol WhatsApp mengambang** — kanal komunikasi yang paling familiar.

---

## 7. Lisensi & Kepemilikan

Seluruh isi dan kode website ini milik **Indonesia Kompeten**.
