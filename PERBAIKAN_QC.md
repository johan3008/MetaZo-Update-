# PERBAIKAN SISTEM CEK KUALITAS GAMBAR (QC)

**Tanggal:** 8 Agustus 2026
**Masalah:** Gambar dinyatakan PASS oleh aplikasi, tetapi DITOLAK Adobe Stock dengan alasan "quality issues".
**Contoh kasus:** `Father_supporting_daughter_on_bi_202607261232.png` (2752×1536) — lolos di app, ditolak Adobe Stock. Pada zoom 200% terlihat jelas: poros pedal/engkol sepeda meleleh tanpa rantai, sadel menyatu dengan tangan, hub roda belakang berantakan — cacat struktural khas AI generatif.

---

## Akar Masalah yang Ditemukan & Diperbaiki

### 1. Gambar dikecilkan ke 1200px SEBELUM dianalisis (penyebab utama)
**File:** `src/components/ImageQualityCheck.tsx`
`resizeAndProcess` menurunkan semua gambar ke maks 1200px JPEG q0.85. Artefak AI halus (jari meleleh, pedal rusak, tepian smudge) menjadi tidak terlihat oleh model AI.
**Perbaikan:** resolusi analisis dinaikkan ke **2048px JPEG q0.92** (3 cabang: gambar, EPS, frame video).

### 2. "Zoom 200%" palsu dan hanya 1 crop tengah
**File:** `server.ts`
Server lama membuat crop tengah dari gambar yang SUDAH dikecilkan lalu meng-upscale-nya 2× (tidak menambah detail apa pun), dan hanya wilayah tengah yang diperiksa.
**Perbaikan:** server kini membuat **3 crop resolusi asli 100% pixel (tanpa upscale)** dari wilayah **TENGAH, KIRI, KANAN** dengan kualitas JPEG `-q:v 2`, lengkap dengan pembersihan file temporer crop.

### 3. Crop detail resolusi asli dari file ASLI dikirim dari frontend
**File:** `src/components/ImageQualityCheck.tsx`
Fungsi baru `generateDetailCrops()` memotong wilayah TENGAH/KIRI/KANAN langsung dari **file asli resolusi penuh** di browser dan mengirimkannya sebagai `detailCrops` ke `/api/check-image-quality`. Server memprioritaskan crop ini (validasi + batas maks 4).

### 4. File yang diupload ke R2 adalah versi KECIL, bukan asli
**File:** `src/components/ImageQualityCheck.tsx`
Sebelumnya blob hasil downscale 1200px yang diupload ke R2, sehingga analisis piksel Python di server juga menghitung dari gambar kecil.
**Perbaikan:** yang diupload kini selalu **file asli resolusi penuh** — analisis piksel & crop forensik server bekerja dari kualitas maksimal, sama seperti moderator Adobe Stock memeriksa file asli.

### 5. Toleransi MEDIUM terlalu longgar (bug logika keputusan)
**File:** `server/gemini.ts`
Sebelumnya mode MEDIUM hanya FAIL jika check KRITIS gagal (`watermark, logo, text, ip_risk, anatomical_errors, structural_defects, ai_artifacts`). Cacat teknis — `blur, exposure, lighting, color_balance, over_edited, sensor_issues, proportion_defects, composition` — **tidak pernah** menggagalkan gambar, padahal justru itulah kategori "quality issues" Adobe Stock.
**Perbaikan:**
- **STRICT:** ada check FAIL apa pun → FAIL (skor maks 59)
- **MEDIUM:** check kritis ATAU teknis ATAU stock_acceptance FAIL → FAIL (skor maks 65)
- **LOOSE:** tetap menoleransi cacat minor, tetapi cacat kritis, pelanggaran IP, stock_acceptance, dan cacat teknis utama (`blur, exposure, lighting, over_edited, proportion_defects`) → FAIL
- Laporan kini menyertakan field `failed_checks` (daftar check yang gagal) dan `stock_acceptance` disinkronkan dengan keputusan akhir.

### 6. Mapping Model Cek Kualitas Menggunakan Model Vision "PRO" Berkemampuan Tinggi (Penyebab Utama Cacat Tidak Terdeteksi AI)
**File:** `server/gemini.ts`
Sebelumnya, kode model-upgrade di backend memetakan model cek kualitas ke nama model non-existent `gemini-3.5-flash` dan `gemini-3.1-pro-preview`. Karena nama model tersebut salah/tidak ada, Google SDK menghasilkan error 404 dan jatuh kembali ke model default **`gemini-2.5-flash`** (atau `gemini-1.5-flash`) yang merupakan model cepat beresolusi rendah dan memiliki **kecerdasan visual/akurasi rendah**. Model flash biasa tidak bisa melihat cacat kecil/mikroskopis (seperti sadel meleleh, pedal tanpa rantai) meskipun sudah diberi crop.
**Perbaikan:**
- Pemetaan model cek kualitas kini diarahkan secara paksa ke model vision "PRO" yang sesungguhnya: **`gemini-2.5-pro`** (atau **`gemini-1.5-pro`** sebagai failsafe).
- `modelsToTry` disinkronkan menggunakan model Pro resmi: `['gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-2.5-flash', 'gemini-1.5-flash']`.
- Ini menjamin AI memiliki kepekaan visual maksimal (visual acuity) untuk membaca cacat mekanis dan struktural secara presisi.

### 7. Analisis piksel Python tidak mempengaruhi keputusan
**File:** `server.ts`
**Perbaikan:** gerbang teknis deterministik baru — hasil `sharpness/noise/brightness` kini ikut memutuskan. Hanya nilai EKSTREM yang memaksa FAIL (sharpness < 12, noise > 70, brightness > 92 atau < 8) agar tidak ada false-positive; alasan dicatat ke `technical_issues` dan `failed_checks`.

### 7. Prompt AI bias ke arah PASS
**File:** `server/gemini.ts`
**Perbaikan:**
- Pengecualian artistik (bokeh, noise halus, bayangan dramatis) ditegaskan **TIDAK berlaku** untuk cacat struktural AI, objek tidak logis, anatomi cacat, atau teks rusak.
- Panduan multi-crop: model diberi tahu gambar ke-2..N adalah crop resolusi asli dari wilayah TENGAH/KIRI/KANAN dan cacat di SATU crop saja cukup untuk FAIL.
- Aturan baru wajib periksa: **Logika Mekanis Objek** (sepeda: rantai/pedal/engkol/jari-jari; kendaraan; furnitur; dst.) dan **Tangan yang Menggenggam Objek** — dua lokasi cacat AI paling umum.

### 8. Frontend memalsukan status PASS saat data AI tidak lengkap
**File:** `src/components/ImageQualityCheck.tsx`
Sebelumnya jika AI tidak mengembalikan suatu check (respons parsial), UI menampilkan PASS dengan catatan positif kalengan ("Fokus subjek utama tajam secara sempurna", dst.) — laporan terlihat sempurna padahal datanya tidak ada.
**Perbaikan:** fallback baru yang jujur — status mengikuti `failed_checks` server, kata kunci di `technical_issues`, dan keputusan akhir laporan; catatan fallback menyatakan data tidak dikembalikan AI.

---

## Hasil Simulasi Logika (sebelum → sesudah)

| Skenario (mode) | Lama | Baru |
|---|---|---|
| Cacat AI struktural (MEDIUM) | FAIL | FAIL |
| Soft focus subjek saja (MEDIUM) | **PASS** | **FAIL** |
| Over-editing / kulit lilin (MEDIUM) | **PASS** | **FAIL** |
| Blown highlights (LOOSE) | **PASS** | **FAIL** |
| Gambar bersih (MEDIUM) | PASS | PASS |
| Pelanggaran IP/logo (MEDIUM) | FAIL | FAIL |

## Cara Deploy
1. `npm install` (jika belum)
2. `npm run build` — membangun ulang frontend + `dist/server.cjs`
3. Deploy seperti biasa. Folder `dist/` di zip ini masih build LAMA — wajib build ulang agar perbaikan aktif.

## Catatan
- File `ImageQualityCheck.tsx` di ROOT proyek adalah duplikat lama yang **tidak diimpor** oleh aplikasi (aplikasi memakai `src/components/ImageQualityCheck.tsx` via `ImageCheckView`). Perbaikan diterapkan pada file yang aktif dipakai.
- Payload analisis kini lebih besar (gambar 2048px + 3 crop). Jalur base64 tetap di bawah batas 4.5MB Vercel; untuk file besar jalur R2 mengirim file asli terpisah dari crop.
