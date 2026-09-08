# MetaZo Convert VectorGen - Inkscape CLI Vector Engine

Layanan microservice khusus untuk memproses dan mengonversi format grafis vektor berstandar industri (SVG $\rightarrow$ EPS 10 Adobe Stock, AI, PDF, SVG).

## 🚀 Fitur Utama
1. **Engine Inkscape CLI**: Konversi vektor asli PostScript Level 2/3, bukan sekadar render raster atau regex text.
2. **Adobe Stock EPS 10 Compliant**: Header PostScript terstandarisasi (`%AI5_FileFormat 2.0`, `%%BoundingBox`, `%%HiResBoundingBox`), membuka dengan sempurna di Adobe Illustrator, CorelDraw, Affinity Designer, dan Photopea.
3. **Text to Path**: Mengonversi teks ke path kurva vektor secara otomatis (mencegah penolakan missing font di Adobe Stock).
4. **Artboard Resizer (4MP - 25MP)**: Auto-centering, safe margin padding, dan penyesuaian resolusi standard (5000x5000 px, 4000x4000 px).
5. **Dual-Mode Execution**:
   - Berjalan di dalam **Docker container** (port `8089`).
   - Atau langsung di host jika Inkscape terpasang di sistem (`C:\Program Files\Inkscape\bin\inkscape.com`).

---

## 🐳 Cara Menjalankan dengan Docker

### 1. Menggunakan Docker Compose (Direkomendasikan)
```bash
docker compose -f docker-compose.vector.yml up -d --build
```

### 2. Menggunakan Docker Build & Run Manual
```bash
docker build -t metazo-vector-engine -f server/Dockerfile.vector .
docker run -d -p 8089:8089 --name metazo-vector-engine metazo-vector-engine
```

### 3. Cek Status Kesehatan
Buka di browser atau terminal:
```bash
curl http://localhost:8089/health
```

---

## 💻 Menjalankan Tanpa Docker (Host Python Langsung)

Jika ingin menjalankan tanpa Docker:
```bash
cd server
pip install -r requirements-vector.txt
python vector_service.py
```
*(Server otomatis mendeteksi instalasi Inkscape pada host Windows/Linux).*
