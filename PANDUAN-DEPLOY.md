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
| DNS apex — 4 record `A` + 4 record `AAAA` | ✅ Selesai |
| DNS `www` — record `CNAME` | ✅ Selesai |
| Sertifikat HTTPS (Let's Encrypt) | ✅ Terbit |
| Enforce HTTPS | ✅ Aktif |
| Redirect `http` → `https` & `www` → apex | ✅ Berfungsi |
| **Verifikasi kepemilikan domain (record TXT)** | ⛔ **Belum — disarankan** |

**Bukti verifikasi akhir:**

```
SERTIFIKAT
  subject  : /CN=indonesiakompeten.web.id
  issuer   : /C=US/O=Let's Encrypt/CN=YR1
  SAN      : DNS:indonesiakompeten.web.id, DNS:www.indonesiakompeten.web.id
  berlaku  : 17 Sep 2026  ->  16 Des 2026   (diperbarui otomatis)

REDIRECT (semua menuju kanonik https://indonesiakompeten.web.id/)
  http://indonesiakompeten.web.id/       301  ->  https://indonesiakompeten.web.id/
  http://www.indonesiakompeten.web.id/   301  ->  https://indonesiakompeten.web.id/
  https://www.indonesiakompeten.web.id/  301  ->  https://indonesiakompeten.web.id/

SEMUA HALAMAN VIA HTTPS: 200 OK
  /  tentang.html  layanan.html  alur.html  faq.html  kontak.html
  sitemap.xml  robots.txt
```

> **Catatan proses:** sertifikat awalnya tidak terbit karena pemeriksaan DNS
> pertama GitHub dijalankan *sebelum* DNS aktif, sehingga gagal dan tidak
> diulang. Perbaikan sesuai dokumentasi GitHub: hapus custom domain lalu
> daftarkan ulang untuk merestart proses penerbitan. Setelah itu sertifikat
> terbit dalam waktu sekitar satu menit.

---

## 🔴 Satu Hal yang Disarankan: Verifikasi Kepemilikan Domain

Website **sudah berjalan penuh**, tetapi status domain di GitHub masih
`unverified`. Ini bukan penghalang fungsi, melainkan soal keamanan: bila suatu
saat GitHub Pages dinonaktifkan, domain Anda berisiko diambil alih orang lain.

### 1. Tambahkan record TXT berikut di panel DNS Sumopod

| Jenis | Nama / Host | Nilai |
|---|---|---|
| `TXT` | `_github-pages-challenge-muhrafihdr` | `a23db9dc0f98e448c6f99c375561c7` |

- Kolom **Nama/Host** cukup diisi `_github-pages-challenge-muhrafihdr`
  (panel akan menambahkan `.indonesiakompeten.web.id` otomatis).
- Bila panel meminta nama lengkap, isi:
  `_github-pages-challenge-muhrafihdr.indonesiakompeten.web.id`
- **Nilai:** `a23db9dc0f98e448c6f99c375561c7` (tanpa tanda kutip)

### 2. Klik Verify di GitHub

Buka **https://github.com/settings/pages** → **Add a domain** → isi
`indonesiakompeten.web.id` → **Verify**. Tunggu 5–30 menit setelah record TXT
ditambahkan agar DNS tersebar lebih dulu.

### 3. Periksa hasilnya

```bash
dig +short TXT _github-pages-challenge-muhrafihdr.indonesiakompeten.web.id @8.8.8.8
# harus menampilkan: "a23db9dc0f98e448c6f99c375561c7"
```

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
| Sertifikat lama tidak kunjung terbit padahal DNS sudah benar | Pemeriksaan DNS pertama GitHub berjalan sebelum DNS aktif. **Solusi resmi:** Settings → Pages → klik **Remove** pada custom domain, ketik ulang `indonesiakompeten.web.id`, lalu **Save**. Sertifikat biasanya terbit dalam 1 menit. (Ini yang akhirnya berhasil pada 17 Sep 2026.) |
| `https://` menampilkan peringatan "not secure" | Cek sertifikat dengan `echo \| openssl s_client -servername indonesiakompeten.web.id -connect 185.199.108.153:443 2>/dev/null \| openssl x509 -noout -subject`. Harus `/CN=indonesiakompeten.web.id`, bukan `*.github.io`. |
| "Domain is already taken" | Domain masih terpasang di repository lain. Hapus dari sana, atau verifikasi kepemilikan domain (bagian C2). |
| Halaman 404 tampil untuk semua tautan | Cek `.nojekyll` ada di root, dan pastikan Pages di-deploy dari `/ (root)`. |
| Perubahan tidak muncul | Tunggu 1–2 menit, lalu lakukan *hard refresh* (Ctrl/Cmd + Shift + R). |
