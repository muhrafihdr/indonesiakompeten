# Panduan Deploy — GitHub Pages + Domain indonesiakompeten.web.id

## ✅ Status Saat Ini (sudah dikerjakan)

| Langkah | Status |
|---|---|
| Website dibuat (6 halaman + 404) | ✅ Selesai |
| Berkas di-commit & di-push ke branch `main` | ✅ Selesai |
| GitHub Pages diaktifkan (source: `main` / root) | ✅ Selesai |
| Custom domain didaftarkan di GitHub | ✅ Selesai |
| Build GitHub Pages | ✅ Berhasil (`built`, tanpa error) |
| Konten terverifikasi ter-deploy | ✅ Selesai (semua halaman 200) |
| DNS apex — 4 record `A` + 4 record `AAAA` | ✅ Selesai & sudah tersebar |
| **DNS `www` — record `CNAME`** | ⛔ **BELUM — ini tugas Anda** |
| **Sertifikat HTTPS** | ⏳ Sedang diproses GitHub (maks. 24 jam) |
| Enforce HTTPS | ⏳ Menunggu sertifikat terbit |

**Hasil pengecekan terakhir (health check GitHub):**

```
apex  indonesiakompeten.web.id
  dns_resolves            : true
  is_pointed_to_gh_pages  : true
  is_served_by_pages      : true
  is_https_eligible       : true
  caa_error               : null        (tidak ada CAA yang menghalangi)
  responds_to_https       : false       <-- sertifikat belum terbit

www   www.indonesiakompeten.web.id
  dns_resolves            : false       <-- record CNAME belum dibuat
  reason                  : Domain's DNS record could not be retrieved
```

---

## 🔴 Yang Perlu Anda Lakukan Sekarang

### 1. Tambahkan record `www` (belum ada)

Apex domain sudah benar, tetapi `www` belum punya record. Buka panel DNS
Sumopod, tambahkan **satu** record berikut:

| Jenis | Nama | Nilai |
|---|---|---|
| CNAME | `www` | `muhrafihdr.github.io` |

Tanpa record ini, `www.indonesiakompeten.web.id` tidak bisa dibuka dan
redirect otomatis `www` → domain utama tidak akan berjalan.

### 2. Tunggu sertifikat HTTPS, lalu aktifkan Enforce HTTPS

Saat ini nama domain Anda masih menyajikan sertifikat `*.github.io`, sehingga
`https://indonesiakompeten.web.id` belum bisa dibuka (sementara `http://`
sudah normal). GitHub sedang memproses penerbitan sertifikat Let's Encrypt —
biasanya 15–60 menit setelah DNS benar, maksimal 24 jam.

Setelah sertifikat terbit, aktifkan HTTPS:

1. Repository → **Settings** → **Pages**
2. Centang **Enforce HTTPS**

Untuk memeriksa statusnya kapan saja:

```bash
# Buka https://github.com/muhrafihdr/indonesiakompeten/settings/pages
# — atau lewat API:
gh api repos/muhrafihdr/indonesiakompeten/pages -q '.https_enforced'

# Cek sertifikat yang sedang disajikan
curl -sI https://indonesiakompeten.web.id/ | head -3
```

### 3. (Disarankan) Verifikasi kepemilikan domain

Lihat **Bagian C2** — mencegah orang lain memakai domain Anda di GitHub Pages.

---

Panduan ini menjelaskan cara mempublikasikan website Indonesia Kompeten ke
GitHub Pages dan menghubungkannya dengan domain **indonesiakompeten.web.id**.

Perkiraan waktu: 15 menit untuk pengaturan, lalu 10 menit – 24 jam untuk
propagasi DNS dan penerbitan sertifikat HTTPS.

---

## Bagian A — Publikasi Website ke GitHub

### A1. Unggah berkas ke repository

Repository: `https://github.com/muhrafihdr/indonesiakompeten`

Jalankan dari folder proyek:

```bash
git init
git branch -M main
git add .
git commit -m "Website Indonesia Kompeten"
git remote add origin https://github.com/muhrafihdr/indonesiakompeten.git
git push -u origin main
```

Jika repository sudah punya branch `main`, cukup:

```bash
git add .
git commit -m "Website Indonesia Kompeten"
git push origin main
```

### A2. Aktifkan GitHub Pages

1. Buka repository → tab **Settings**.
2. Menu kiri → **Pages**.
3. Pada **Build and deployment → Source**, pilih **Deploy from a branch**.
4. **Branch:** `main` — **Folder:** `/ (root)` → klik **Save**.
5. Tunggu 1–2 menit. Situs akan tersedia di:
   `https://muhrafihdr.github.io/indonesiakompeten/`

> Berkas `CNAME` sudah ada di repository, jadi langkah berikutnya
> (custom domain) bisa langsung dilanjutkan.

---

## Bagian B — Menghubungkan Domain indonesiakompeten.web.id

### B1. Tambahkan domain di GitHub (lakukan ini lebih dulu)

> Urutan ini penting. Menambah DNS sebelum domain didaftarkan di GitHub dapat
> membuka celah *domain takeover*.

1. Repository → **Settings** → **Pages**.
2. Pada **Custom domain**, isi: `indonesiakompeten.web.id`
3. Klik **Save**.

GitHub akan memeriksa DNS. Selama DNS belum diatur, akan muncul peringatan —
itu normal. Lanjutkan ke langkah B2.

### B2. Atur DNS di penyedia domain

**Informasi domain Anda (hasil pengecekan):**

| Item | Nilai |
|---|---|
| Registrar | PT Exabytes Network Indonesia — https://exabytes.co.id (pendaftaran: daftarnama.id) |
| Nameserver | `NS1.SUMOPOD.COM`, `NS2.SUMOPOD.COM` |
| Pengelola DNS | **Panel Sumopod** (karena nameserver mengarah ke Sumopod) |
| Status domain | ACTIVE, berlaku sampai 17 September 2027 |
| Kondisi saat ini | **Belum ada record A/AAAA/CNAME** — inilah sebabnya domain belum bisa dibuka |

Jadi, record DNS harus ditambahkan di **panel kontrol Sumopod**. Bila Anda tidak
memiliki aksesnya, hubungi tim Sumopod atau Exabytes dengan menyebutkan bahwa
Anda ingin mengarahkan domain ke GitHub Pages.

Setelah masuk ke panel DNS, ikuti tabel di bawah.

**Hapus dulu** record `A` atau `CNAME` bawaan yang menunjuk ke parkir domain.

Kemudian buat record berikut (`@` berarti domain utama):

#### Untuk domain utama (apex) — 4 record A

| Jenis | Nama | Nilai | TTL |
|---|---|---|---|
| A | `@` | `185.199.108.153` | 3600 (atau Automatic) |
| A | `@` | `185.199.109.153` | 3600 |
| A | `@` | `185.199.110.153` | 3600 |
| A | `@` | `185.199.111.153` | 3600 |

#### Untuk IPv6 (opsional, disarankan) — 4 record AAAA

| Jenis | Nama | Nilai |
|---|---|---|
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

#### Untuk subdomain www — 1 record CNAME

| Jenis | Nama | Nilai |
|---|---|---|
| CNAME | `www` | `muhrafihdr.github.io` |

> **Catatan penting:**
> - Nilai CNAME **hanya** `muhrafihdr.github.io` — jangan ditambah nama repository.
> - **Jangan** memakai wildcard `*` — berisiko domain takeover.
> - Bila penyedia DNS mendukung `ALIAS`/`ANAME`, record itu bisa menggantikan
>   4 record `A` (tetap tambahkan AAAA bila tersedia).
> - Jika memakai Cloudflare, matikan sementara **Proxy (awan oranye)** atau
>   set ke **DNS only** selama proses verifikasi.

---

## Bagian C — Verifikasi & Verifikasi Domain (Disarankan)

### C1. Cek DNS sudah benar

```bash
dig indonesiakompeten.web.id +noall +answer -t A
```

Harus menampilkan keempat IP GitHub Pages:

```
indonesiakompeten.web.id. 3600 IN A 185.199.108.153
indonesiakompeten.web.id. 3600 IN A 185.199.109.153
indonesiakompeten.web.id. 3600 IN A 185.199.110.153
indonesiakompeten.web.id. 3600 IN A 185.199.111.153
```

Untuk `www`:

```bash
dig www.indonesiakompeten.web.id +nostats +nocomments +nocmd
```

Harus berakhir menunjuk ke `muhrafihdr.github.io`.

### C2. Kunci domain agar tidak bisa diambil orang lain

1. Buka **https://github.com/settings/pages**
2. Klik **Add a domain**, isi `indonesiakompeten.web.id`.
3. GitHub akan menampilkan sebuah record **TXT**, contoh formatnya:

   | Jenis | Nama | Nilai |
   |---|---|---|
   | TXT | `_github-pages-challenge-muhrafihdr.indonesiakompeten.web.id` | *(kode unik dari GitHub)* |

4. Salin kode tersebut ke panel DNS Anda (nama dan nilai harus persis).
5. Kembali ke halaman GitHub, klik **Verify**.

### C3. Aktifkan HTTPS

1. Repository → **Settings** → **Pages**.
2. Tunggu hingga status custom domain berubah menjadi hijau
   (*"DNS check successful"*). Bisa sampai 24 jam.
3. Centang **Enforce HTTPS**.

Sertifikat SSL dari Let's Encrypt akan diterbitkan otomatis. Setelah aktif,
situs dapat diakses melalui `https://indonesiakompeten.web.id`.

---

## Bagian D — Hasil Akhir

| Alamat | Hasil |
|---|---|
| `https://indonesiakompeten.web.id` | Situs utama |
| `https://www.indonesiakompeten.web.id` | Dialihkan otomatis ke domain utama |
| `http://...` | Dialihkan otomatis ke `https://` (setelah Enforce HTTPS) |
| `https://muhrafihdr.github.io/indonesiakompeten/` | Dialihkan ke domain kustom |

---

## Bagian E — Memperbarui Website

Setiap kali ada perubahan berkas, cukup jalankan:

```bash
git add .
git commit -m "Perbarui konten"
git push origin main
```

GitHub Pages akan otomatis membangun ulang situs dalam 1–2 menit.

---

## Bagian F — Pemeriksaan Setelah Live

Lakukan pengecekan berikut pada hari pertama:

- [ ] Semua menu di header membuka halaman yang benar.
- [ ] Menu berfungsi di ponsel (tombol garis tiga).
- [ ] Tombol WhatsApp membuka chat dengan nomor yang benar.
- [ ] Formulir pendaftaran meneruskan data ke WhatsApp dengan rapi.
- [ ] Alamat, telepon, dan email sudah bukan teks contoh.
- [ ] Bagian Legalitas di `tentang.html` sudah diisi data resmi.
- [ ] Daftar skema di `layanan.html` sudah sesuai skema yang benar-benar ada.
- [ ] Gembok HTTPS muncul di peramban.
- [ ] Buka `https://indonesiakompeten.web.id/sitemap.xml` — harus tampil.
- [ ] Kirim `sitemap.xml` ke [Google Search Console](https://search.google.com/search-console)
      agar situs cepat terindeks.

---

## Bagian G — Jika Ada Masalah

| Gejala | Penyebab & solusi |
|---|---|
| Domain belum bisa dibuka sama sekali (NXDOMAIN) | Record A/AAAA belum dibuat di panel Sumopod. Lihat bagian B2. |
| "Domain's DNS record could not be retrieved" | DNS belum menyebar. Tunggu 1–24 jam, cek dengan `dig`. |
| "InvalidDNSError" | Record CNAME salah arah. Pastikan ke `muhrafihdr.github.io` tanpa nama repo. |
| Situs tampil tetapi tanpa gaya (CSS) | Pastikan folder `assets/` ikut terunggah dan huruf besar/kecil nama berkas sama persis. |
| HTTPS tidak bisa dicentang | Tunggu sertifikat terbit (maks. 24 jam). Pastikan DNS di Cloudflare tidak di-proxy. |
| "Domain is already taken" | Domain masih terpasang di repository lain. Hapus dari sana, atau verifikasi kepemilikan domain (bagian C2). |
| Halaman 404 tampil untuk semua tautan | Cek `.nojekyll` ada di root, dan pastikan Pages di-deploy dari `/ (root)`. |
| Perubahan tidak muncul | Tunggu 1–2 menit, lalu lakukan *hard refresh* (Ctrl/Cmd + Shift + R). |
