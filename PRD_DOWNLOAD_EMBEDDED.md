# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Download Embedded Metadata Engine for MetaZo PRO — Adobe Stock Auto-Detection Standard

---

| **Dokumen** | Product Requirements Document (PRD) |
| :--- | :--- |
| **Fitur** | **Download Embedded Metadata (IPTC / XMP / EXIF & Microstock Auto-Detect)** |
| **Aplikasi** | MetaZo PRO (Adobe Stock & Microstock AI Assistant) |
| **Target Rilis** | v1.4.1 (Metadata Integrity & Auto-Detect Milestone) |
| **Status** | **Ready for Review & Implementation** |
| **Kategori** | Core Export & Metadata Engine |
| **Terakhir Diperbarui** | September 2026 |

---

## 1. Executive Summary & Latar Belakang

### 1.1 Ringkasan Eksekutif
Fitur **Download Embedded** di MetaZo PRO memungkinkan kontributor microstock untuk menyematkan (*embed*) data **Judul (Title)**, **Deskripsi (Description)**, dan **Kata Kunci (Keywords)** langsung ke dalam berkas fisik (Gambar JPG/PNG, Vektor EPS/SVG, dan Video MP4/MOV) sebelum diunggah ke agensi microstock.

Tujuan utama dari fitur ini adalah **Zero-Manual Tagging** pada platform **Adobe Stock Contributor**: ketika kontributor mengunggah berkas hasil ekspor MetaZo PRO ke Adobe Stock, seluruh metadata (Title, Description, Category, dan Keywords) **wajib langsung terdeteksi otomatis (*100% auto-detected*)** oleh parser Adobe Stock tanpa perlu mengisi ulang, mengedit kata kunci secara manual, atau mengunggah berkas CSV terpisah.

### 1.2 Masalah Saat Ini (*Current Pain Points & Gap Analysis*)
Berdasarkan audit teknis terhadap implementasi saat ini di [`App.tsx`](file:///d:/hasil%20generate/Piclumen/Banner/png/Mau%20Upscale/Colorful%20popsicle%20stack/New%20folder/New%20folder/A1D/TIDAK%20LOLOS/LOLOS/LOLOS/LOLOS/MetaZo-Update--main%20(43)/MetaZo-Update--main/App.tsx#L4382) dan [`server.ts`](file:///d:/hasil%20generate/Piclumen/Banner/png/Mau%20Upscale/Colorful%20popsicle%20stack/New%20folder/New%20folder/A1D/TIDAK%20LOLOS/LOLOS/LOLOS/LOLOS/MetaZo-Update--main%20%2843%29/MetaZo-Update--main/server.ts#L1619), ditemukan beberapa kendala kritis:

1. **Kegagalan Deteksi pada Client Fallback (`piexifjs`)**:
   - Jika panggilan server `/api/embed-metadata` gagal atau timeout, sistem melakukan fallback di sisi browser menggunakan pustaka `piexifjs`.
   - `piexifjs` **hanya menulis tag EXIF Windows (`XPTitle`, `XPKeywords`, `ImageDescription`)**.
   - **Adobe Stock sepenuhnya mengabaikan tag `XPKeywords` dan `XPTitle`**. Adobe Stock mewajibkan standar **IPTC-IIM** (Application Record 2) dan **Adobe XMP Dublin Core** (`dc:title`, `dc:subject`). Akibatnya, file yang diproses lewat client fallback masuk ke Adobe Stock dalam kondisi *kosong melompong* (*no keywords detected*).
2. **Browser Pop-up & Download Throttling pada Unduhan Batch**:
   - Pada `App.tsx` (baris 4392–4445), proses unduhan dilakukan melalui loop `for` yang memanggil `a.click()` secara beruntun.
   - Browser modern (Chrome, Edge, Firefox) secara default **memblokir unduhan otomatis berulang** setelah berkas ke-2 atau ke-3 dengan peringatan *"This site is attempting to download multiple files"*. Hal ini membuat pengguna hanya mendapatkan 1-2 berkas dari puluhan file yang diproses.
3. **Standar Khusus Vektor EPS Adobe Stock**:
   - Adobe Stock membutuhkan berkas EPS (EPS 8/10) yang disertai paket XMP terkompilasi, atau pasangan berkas *Companion JPEG* dengan nama persis sama (`file.eps` + `file.jpg`).
   - Penulisan komentar PostScript murni (`%%Title:`, `%%Keywords:`) sering dilewati oleh sistem ingestion otomatis Adobe Stock modern.
4. **Format Struktur Keywords (Array vs String)**:
   - Adobe Stock mewajibkan keywords terdaftar sebagai entri individual terpisah (IPTC Repeatable Keyword entries atau XMP `rdf:Bag`), bukan satu string panjang yang digabung koma. Format string tunggal menyebabkan Adobe Stock membaca seluruh 50 kata kunci sebagai 1 kata kunci raksasa yang gagal divalidasi.
5. **Karakter Non-ASCII & Encoding IPTC**:
   - Jika IPTC tidak di-encode dengan penanda karakter escape UTF-8 (`\x1b%G` / `IPTC:CodedCharacterSet = 'UTF8'`), karakter aksen atau simbol khusus menyebabkan korupsi metadata dan penolakan file oleh sistem Adobe.

---

## 2. Tujuan & Sasaran (*Goals & Objectives*)

### 2.1 Tujuan Utama
1. **100% Auto-Detection di Adobe Stock**: Seluruh berkas (JPG, PNG, EPS, SVG, MP4) yang diunduh melalui tombol *Download Embedded* langsung terisi Title dan 5–49 Keywords saat di-drag & drop ke Adobe Stock Contributor Portal.
2. **Paket Unduhan Lengkap (ZIP Batch & Sequential Queue)**: Mengeliminasi pemblokiran unduhan browser dengan menyediakan opsi unduhan arsip **ZIP Package** atau antrean berurutan dengan indikator progres live.
3. **Triple-Standard Redundancy**: Menulis metadata secara serentak ke 3 standar industri: **XMP (Dublin Core)**, **IPTC Core / IIM**, dan **EXIF**.
4. **Dukungan Khusus Vektor**: Menyediakan pembuatan otomatis *Companion Thumbnail JPG* ber-metadata untuk berkas EPS guna menjamin kepatuhan 100% pada portal Adobe Stock Vector.

### 2.2 Metrik Keberhasilan (*Success Metrics*)
- **Tingkat Deteksi Adobe Stock**: 100% dari 50 sampel file uji terdeteksi judul dan kata kuncinya secara instan tanpa warning error.
- **Keberhasilan Unduhan Batch**: 0 file yang terlewat atau terblokir pop-up browser saat mengunduh hingga 100 file sekaligus.
- **Kecepatan Proses**: Embedding metadata per file < 500 ms di server.

---

## 3. Matriks Pemetaan Metadata Standar Microstock

Tabel berikut adalah standar mutlak yang harus ditulis ke setiap berkas agar terdeteksi sempurna di Adobe Stock dan platform microstock terkemuka lainnya:

| Metadata Field | Adobe Stock Field | Standard Tag Target (ExifTool / Native) | Format Data |
| :--- | :--- | :--- | :--- |
| **Title / Judul** | Title / Asset Name | `XMP-dc:Title`<br>`IPTC:ObjectName`<br>`IPTC:Headline`<br>`XMP-photoshop:Headline`<br>`EXIF:ImageDescription` | String UTF-8 (5–200 karakter, direkomendasikan 50–120 karakter) |
| **Description** | Description | `XMP-dc:Description`<br>`IPTC:Caption-Abstract`<br>`XMP-photoshop:Caption`<br>`EXIF:ImageDescription` | String UTF-8 (Deskripsi sinematik informatif) |
| **Keywords** | Keywords (Tags) | `XMP-dc:Subject`<br>`IPTC:Keywords`<br>`XMP:Subject` | **Array of Strings** (5–49 entri unik, tanpa tag HTML, tanpa duplikasi) |
| **Category ID** | Category Dropdown | `IPTC:Category`<br>`XMP-photoshop:Category`<br>`XMP:Category` | Nilai ID Kategori Adobe Stock (1–21) & Nama Kategori |
| **Character Set** | Encoding | `IPTC:CodedCharacterSet = 'UTF8'`<br>`ExifByteOrder = LittleEndian` | UTF-8 murni dengan escape sequence `\x1b%G` |
| **Video Title** | Clip Title | `QuickTime:Title`<br>`UserData:©nam`<br>`ItemList:Title` | String UTF-8 |
| **Video Keywords** | Clip Keywords | `QuickTime:Keywords`<br>`UserData:©key`<br>`ItemList:Keyword` | Array / Comma-separated |

### 3.1 Integrasi Presisi dengan Hasil MetadataGen (100% Sesuai Input/Output Generator)

Untuk menjamin bahwa data yang tertanam **100% sinkron dan sesuai dengan hasil MetadataGen** (termasuk hasil edit pengguna di Review Queue):

1. **Title (Judul) dari MetadataGen**:
   - Mengambil nilai `item.title` persis seperti yang dihasilkan oleh AI atau yang telah diedit secara manual oleh pengguna di tabel *ReviewQueue*.
   - Jika `item.title` kosong, fallback otomatis ke kalimat pertama `item.description`.
   - Nama berkas unduhan (`exportName`) otomatis diselaraskan dengan judul bersih: `[Title_Asset].[ext]`.
2. **Keywords (Kata Kunci) dari MetadataGen & Preservasi Urutan Ranking**:
   - Mengambil array `item.keywords` hasil analisis AI (atau hasil re-order/tambah kata kunci manual di Review Queue).
   - **PENTING**: Urutan kata kunci **TIDAK BOLEH diacak atau diurutkan abjad (alphabetical)**. Algoritma pencarian Adobe Stock memprioritaskan 5–10 kata kunci pertama. Oleh karena itu, urutan ranking kata kunci relevansi tertinggi dari MetadataGen **wajib dipertahankan 100%**.
   - Melakukan filter deduplikasi tanpa merusak indeks urutan (`preserve insertion order`).
   - Batas kata kunci dijaga ketat pada **maksimal 49 kata kunci** untuk menghindari penolakan kuota Adobe Stock.
3. **Kategori Adobe Stock dari MetadataGen**:
   - Mengambil nilai `item.adobeCategoryId` yang dipilihkan oleh MetadataGen (misal: `3` untuk *Animals*, `4` untuk *Buildings*, `11` untuk *Nature*).
   - Menyematkan nama kategori resmi Adobe ke dalam tag IPTC/XMP (`IPTC:Category`, `XMP-photoshop:Category`).
4. **Dukungan Seluruh Format Alat MetadataGen**:
   - **Image Tool (`ToolType.IMAGE`)**: Berkas JPG, JPEG, PNG, WEBP ditanamkan IPTC, XMP Dublin Core, dan EXIF.
   - **Video Tool (`ToolType.VIDEO`)**: Berkas MP4, MOV ditanamkan atom QuickTime metadata (`moov/udta/©nam`, `©des`, `©key`) dan XMP video track.
   - **Vector Tool (`ToolType.VECTOR`)**: Berkas EPS, SVG, AI disuntikkan paket XMP, DSC header, serta pembuatan *Companion JPG* ber-metadata kembar.

### 3.2 Dukungan Lintas Agensi Microstock Lengkap (Multi-Platform Microstock Engine)

Selain Adobe Stock, berkas yang diunduh dengan opsi *Download Embedded* dijamin mematuhi aturan spesifik platform microstock berikut:

1. **Shutterstock (Foto, Vektor & Footage)**:
   - **Aturan Panjang Deskripsi**: Shutterstock menolak metadata jika deskripsi kurang dari 5 kata. Mesin penanam metadata otomatis memvalidasi `description`: jika < 5 kata, sistem menggabungkan judul atau memperluasnya sehingga minimal 5–8 kata bermakna komersial.
   - **Dual Categories**: Menyematkan `shutterstockCategory1` dan `shutterstockCategory2` dari MetadataGen ke dalam `IPTC:SupplementalCategories` dan `XMP-shutterstock:Category1/Category2`.
   - **Batas Keywords**: 7 hingga 50 kata kunci di dalam `IPTC:Keywords` dan `XMP-dc:Subject`.
2. **Freepik (Gambar AI, Foto & Ilustrasi Vektor)**:
   - Membaca `XMP-dc:Title` dan `XMP-dc:Subject`.
   - Menjamin kata kunci bersih tanpa tag koma ganda atau spasi kosong.
3. **Vecteezy (Vektor EPS, SVG & Foto)**:
   - Menginjeksi komentar PostScript DSC (`%%Title:` dan `%%Keywords:`) ke dalam header EPS.
   - Menyediakan paket XMP terstandarisasi untuk pembacaan instan oleh parser Vecteezy.
4. **Pond5 & Video Stock (Shutterstock Video, Storyblocks)**:
   - Menginjeksi seluruh atom QuickTime: `QuickTime:Title`, `QuickTime:Description`, `QuickTime:Keywords`, `QuickTime:Comment`, `UserData:©nam`, `UserData:©des`, `UserData:©key`, dan `Keys:DisplayName`.
   - Menghasilkan file MP4/MOV yang langsung terbaca judul dan kata kuncinya saat diunggah ke FTP atau portal web Pond5.
5. **Getty Images / iStock & Alamy**:
   - Menuliskan informasi atribusi standar industri:
     - `IPTC:By-line` & `XMP-dc:Creator`: `['MetaZo Contributor']`
     - `IPTC:Credit` & `XMP-photoshop:Credit`: `'MetaZo AI Stock Assistant'`
     - `IPTC:Source` & `XMP-photoshop:Source`: `'MetaZo'`
     - `XMP-xmpRights:Marked`: `True`
6. **DepositPhotos & 123RF**:
   - Membaca standar universal `IPTC:ObjectName` dan `IPTC:Caption-Abstract` serta `IPTC:Keywords`.
7. **MiriCanvas & Canva**:
   - Kompatibel dengan pembacaan tag UTF-8 internasional dan representasi kata kunci komersial.

## 4. Arsitektur Solusi & Alur Data (*System Architecture*)

```mermaid
flowchart TD
    subgraph Client_App["MetaZo PRO Client (App.tsx & ExportPanel.tsx)"]
        UserClick["User Clicks 'Download Embedded Files'"] --> ChoiceModal{"Pilihan Unduhan"}
        ChoiceModal -->|Opsi 1: ZIP Archive| ReqZip["Request POST /api/embed-metadata-zip"]
        ChoiceModal -->|Opsi 2: Direct Single/Multi| ReqSingle["Sequential Queue (with delay & progress)"]
    end

    subgraph Server_Pipeline["Server-Side Metadata Engine (server.ts)"]
        ReqZip --> MulterZip["Multer Memory / Temp Storage"]
        ReqSingle --> MulterSingle["Multer Single Upload (/api/embed-metadata)"]
        
        MulterZip --> ValidationEngine["Sanitization & Validation Engine"]
        MulterSingle --> ValidationEngine
        
        ValidationEngine --> TypeRouter{"File Type Router"}
        
        TypeRouter -->|Image (JPG/PNG)| ExifToolImage["ExifTool Engine: XMP-dc + IPTC-IIM + EXIF"]
        TypeRouter -->|Vector (EPS/AI)| ExifToolEPS["EPS XMP Stream Injection + Companion JPG Generator"]
        TypeRouter -->|Vector (SVG)| SVGXmlInject["SVG Dublin Core XML Metadata Injection"]
        TypeRouter -->|Video (MP4/MOV)| VideoTool["ExifTool QuickTime UserData & Keys Injection"]
        
        ExifToolImage --> Packager["Response Packager"]
        ExifToolEPS --> Packager
        SVGXmlInject --> Packager
        VideoTool --> Packager
        
        Packager -->|If ZIP| ArchiverStream["Archiver ZIP Stream (embedded_assets.zip)"]
        Packager -->|If Single| DirectStream["Direct Stream (.jpg / .eps / .mp4)"]
    end

    subgraph Client_Delivery["Client Delivery & Verification"]
        ArchiverStream --> AutoSaveZip["Browser Auto-Save ZIP (No Pop-up Blocker)"]
        DirectStream --> AutoSaveSingle["Direct File Save"]
        AutoSaveZip --> AdobeUpload["Ready for Adobe Stock Drag & Drop"]
        AutoSaveSingle --> AdobeUpload
    end
```

---

## 5. Spesifikasi Kebutuhan Fungsional (*Functional Requirements*)

### 5.1 FR-1: Sanitasi & Validasi Metadata Ketat (Adobe Stock Compliance)
Sebelum metadata disuntikkan ke file, backend wajib menjalankan fungsi pembersihan (*sanitizer*):
1. **Title Sanitization**:
   - Batas maksimal 180 karakter (Adobe Stock batas mutlak 200 karakter).
   - Menghapus karakter terlarang: `< > : " / \ | ? *` serta simbol non-cetak.
   - Menghilangkan ekstensi file di judul (misal: menghapus `.jpg` atau `.png` yang sering terbawa di judul).
   - Huruf kapital awal kata atau Sentence case bersih.
2. **Keywords Sanitization**:
   - Memastikan jumlah kata kunci berada di antara **5 hingga 49 kata** (Adobe Stock membatasi maksimal 49/50 kata kunci; kata kunci ke-50 ke atas akan menyebabkan warning).
   - Setiap kata kunci dibersihkan dari spasi berlebih, tanda kutip ganda/tunggal, dan simbol aneh.
   - Menghilangkan kata kunci duplikat (*case-insensitive deduplication*).
   - Memecah kata kunci jika ada yang masih tergabung dengan koma menjadi item array mandiri.

### 5.2 FR-2: Engine Penyematan Metadata Server Berkelanjutan (Triple-Layer)
Di [`server.ts`](file:///d:/hasil%20generate/Piclumen/Banner/png/Mau%20Upscale/Colorful%20popsicle%20stack/New%20folder/New%20folder/A1D/TIDAK%20LOLOS/LOLOS/LOLOS/LOLOS/MetaZo-Update--main%20%2843%29/MetaZo-Update--main/server.ts#L1619), fungsi `embedMetadataForAdobe()` ditingkatkan dengan parameter eksklusif ExifTool:

```typescript
// Parameter Wajib ExifTool untuk Deteksi 100% Adobe Stock
const exifToolArgs = [
  '-overwrite_original',
  '-ignoreMinorErrors',
  '-m',
  '-charset', 'iptc=utf8',
  '-charset', 'exif=utf8',
  '-codedcharacterset=utf8',  // Menulis marker UTF-8 wajib IPTC (\x1b%G)
  '-sep', ', ',               // Menjaga agar array tags dipecah menjadi tag individual
  
  // 1. XMP Dublin Core (Prioritas Utama Adobe Ingestion Engine)
  `-XMP-dc:Title=${cleanTitle}`,
  `-XMP-dc:Description=${cleanDescription}`,
  ...uniqueKeywords.map(k => `-XMP-dc:Subject=${k}`),
  
  // 2. IPTC Core / IIM (Standar Universal Microstock)
  `-IPTC:ObjectName=${cleanTitle}`,
  `-IPTC:Headline=${cleanTitle}`,
  `-IPTC:Caption-Abstract=${cleanDescription}`,
  ...uniqueKeywords.map(k => `-IPTC:Keywords=${k}`),
  
  // 3. Photoshop & EXIF Standard (OS Preview & Bridge Compatibility)
  `-XMP-photoshop:Headline=${cleanTitle}`,
  `-XMP-photoshop:Caption=${cleanDescription}`,
  `-ImageDescription=${cleanTitle}`,
  `-XPTitle=${cleanTitle}`,
  `-XPComment=${cleanDescription}`,
  `-XPKeywords=${uniqueKeywords.join('; ')}`
];
```

### 5.3 FR-3: Dukungan Khusus Vektor (EPS + Companion JPG)
Adobe Stock Vector memiliki aturan bahwa unggahan EPS sering kali memerlukan file JPEG pratinjau pendamping dengan nama berkas yang identik:
- Sistem menyediakan opsi otomatis: **"Generate Companion Preview JPG for EPS"**.
- Saat berkas `vector_flower.eps` di-embed, sistem sekaligus mengekspor thumbnail JPEG `vector_flower.jpg` dengan metadata IPTC/XMP yang persis sama.
- Kontributor dapat mengunggah kedua berkas tersebut secara bersamaan ke Adobe Stock, dan sistem Adobe secara otomatis menggabungkannya menjadi 1 aset vektor ber-metadata lengkap.

### 5.4 FR-4: Pengunduhan Berkelompok Bebas Blokir (*Batch ZIP Export*)
Untuk mengatasi masalah terblokirnya unduhan browser:
1. **Opsi "Download as ZIP Package (Recommended)"**:
   - Seluruh file yang selesai diberi metadata dikemas ke dalam 1 berkas arsip `.zip` di server menggunakan pustaka `archiver`.
   - Browser pengguna hanya menerima **1 file unduhan tunggal** berukuran optimal, sehingga tidak pernah diblokir pop-up blocker.
2. **Opsi "Download Individual Files (Sequential)"**:
   - Jika pengguna memilih unduhan berkas terpisah, sistem menerapkan *delay interleave* (500–800 ms per file) dengan progress counter transparan:
     `[Mengunduh Berkas 3 dari 15: sunset_beach.jpg...]`.

### 5.5 FR-5: Enhanced Client-Side Fallback (ExifTool WebAssembly / True IPTC Writer)
Jika server lokal tidak merespons:
- Ganti fallback `piexifjs` yang hanya mendukung EXIF dengan pustaka penginjeksi **IPTC-IIM / XMP berbasis Binary buffer** di browser (seperti penulisan segmen JPEG `APP13` Photoshop IRB untuk IPTC dan `APP1` untuk XMP).
- Hal ini menjamin bahwa jika server offline sekalipun, file JPG yang di-generate di sisi klien tetap memuat segmen IPTC/XMP yang terbaca oleh Adobe Stock.

---

## 6. Rencana Desain Antarmuka Pengguna (*UI/UX Specifications*)

### 6.1 Peningkatan pada [`ExportPanel.tsx`](file:///d:/hasil%20generate/Piclumen/Banner/png/Mau%20Upscale/Colorful%20popsicle%20stack/New%20folder/New%20folder/A1D/TIDAK%20LOLOS/LOLOS/LOLOS/LOLOS/MetaZo-Update--main%20%2843%29/MetaZo-Update--main/src/components/ExportPanel.tsx#L288)
Pada area tombol tindakan *Download Embedded*:
1. **Tombol Primer**: `Download Embedded (ZIP Package)` bergradasi hijau zamrud (*Emerald*) dengan icon `.zip` / archive.
2. **Menu Dropdown / Toggle**:
   - `[x] Pack as single ZIP archive (Bebas blokir browser)` *(Default: AKTIF)*
   - `[x] Include Companion JPG for Vector EPS` *(Khusus tab Vector)*
   - `[ ] Sequential separate file download`
3. **Modal Progress Dialog**:
   - Menampilkan modal overlay halus saat proses berlangsung:
     - Indikator progres: `Memproses metadata IPTC/XMP berkas 12 / 40 (30%)...`
     - Status bar bertahap: *Sanitizing tags -> Embedding IPTC/XMP -> Compressing ZIP -> Complete!*

---

## 7. Rencana Tindakan & Langkah Implementasi (*Action Plan*)

### Tahap 1: Peningkatan Sanitizer & ExifTool Engine di [`server.ts`](file:///d:/hasil%20generate/Piclumen/Banner/png/Mau%20Upscale/Colorful%20popsicle%20stack/New%20folder/New%20folder/A1D/TIDAK%20LOLOS/LOLOS/LOLOS/LOLOS/MetaZo-Update--main%20%2843%29/MetaZo-Update--main/server.ts)
- Perbaiki `embedMetadataForAdobe()`:
  - Tulis array keywords ke tag XMP dan IPTC secara individual (bukan string gabungan koma tunggal).
  - Pastikan `-codedcharacterset=utf8` dan `-charset iptc=utf8` selalu dieksekusi.
  - Tambahkan penulisan XMP packet langsung ke berkas EPS.

### Tahap 2: Buat Endpoint Batch ZIP `/api/embed-metadata-zip`
- Tambahkan endpoint Express baru di `server.ts`:
  - Menerima multi-files upload via `upload.array('files')` beserta array metadata JSON.
  - Memproses metadata masing-masing berkas dengan ExifTool secara paralel/antrean cepat.
  - Mengalirkan (*stream*) hasil akhir ke dalam satu file ZIP terkompresi `MetaZo_Embedded_Assets.zip`.

### Tahap 3: Modifikasi [`App.tsx`](file:///d:/hasil%20generate/Piclumen/Banner/png/Mau%20Upscale/Colorful%20popsicle%20stack/New%20folder/New%20folder/A1D/TIDAK%20LOLOS/LOLOS/LOLOS/LOLOS/MetaZo-Update--main%20%2843%29/MetaZo-Update--main/App.tsx#L4382)
- Perbarui fungsi `handleDownloadEmbedded()`:
  - Kirimkan seluruh berkas yang telah selesai di-generate langsung ke endpoint `/api/embed-metadata-zip`.
  - Jika pengguna memilih ZIP, unduh 1 kali file `.zip`.
  - Jika memilih berkas satuan, gunakan antrean `Promise` berurutan dengan jeda 600 ms antar berkas agar tidak memicu pop-up blocker browser.

### Tahap 4: Penguatan Client-Side Binary IPTC Writer (Fallback)
- Perbarui logika client-side fallback: Jangan hanya menulis EXIF IFD0 via `piexifjs`, melainkan sertakan penulisan segment IPTC `APP13` dasar ke header JPEG agar darurat offline tetap membawa data keywords Adobe Stock.

### Tahap 5: Pengujian Langsung ke Portal Adobe Stock Contributor
- Lakukan pengujian langsung (*live testing*) dengan mengunggah 5 file hasil embed (JPG, PNG, EPS, MP4) ke portal kontributor Adobe Stock dan verifikasi deteksi instan judul serta kata kuncinya.

---

## 8. Protokol Pengujian (*Verification & QA Checklist*)

| Kode Uji | Skenario Pengujian | Kriteria Lolos (Pass Criteria) |
| :--- | :--- | :--- |
| **QA-01** | Pengguna menekan tombol "Download Embedded" untuk 10 gambar JPG. | Berkas terunduh dalam paket ZIP atau berkas terpisah tanpa ada satu pun yang diblokir oleh browser. |
| **QA-02** | Pemeriksaan berkas unduhan via ExifTool CLI (`exiftool -G -a -s file.jpg`). | Terlihat tag `[IPTC] ObjectName`, `[IPTC] Keywords` (berisi 5–49 kata terpisah), dan `[XMP-dc] Subject` terisi lengkap dengan encoding UTF-8. |
| **QA-03** | **Uji Unggah ke Adobe Stock (Drag & Drop)**. | Berkas JPG diunggah ke Adobe Stock Contributor: **Kolom Title otomatis terisi**, **Kolom Keywords langsung memuat seluruh kata kunci**, dan status siap di-submit. |
| **QA-04** | Pengujian Berkas Vektor EPS. | Berkas EPS yang diunduh (disertai Companion JPG) terdeteksi judul dan kata kuncinya secara otomatis di Adobe Stock. |
| **QA-05** | Pengujian Berkas Video MP4. | Berkas video MP4 yang diunduh menampilkan Title dan Keywords di tab metadata video Adobe Stock. |

---

## 9. Kesimpulan
Dengan mengimplementasikan PRD ini, fitur **Download Embedded** di MetaZo PRO akan bertransformasi dari sekadar eksportir dasar menjadi **mesin penanam metadata microstock berstandar industri (*enterprise microstock metadata engine*)**. Masalah file tidak terdeteksi di Adobe Stock akan teratasi 100% karena kepatuhan penuh terhadap standar IPTC-IIM dan Adobe XMP Dublin Core.
