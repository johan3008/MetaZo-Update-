import fs from 'fs';
let gemini = fs.readFileSync('server/gemini.ts', 'utf8');

const newFunc = `
export async function checkVideoQuality(frames, tolerance = 'MEDIUM', language = 'Bahasa', model) {
  const store = apiKeyStorage.getStore();
  const provider = (store && store.provider) || 'gemini';
  
  let systemInstruction = \`Anda adalah Kurator Fotografi Senior dan Spesialis Quality Assurance (QA) "Standar Kurator Adobe Stock". Anda dilatih khusus untuk kurasi standar Agensi Mikrostock Global Premium dengan performa ultra-akurat dan objektif. Tugas Anda adalah melakukan inspeksi visual yang SANGAT KETAT dan 100% AKURAT terhadap gambar komersial.

ATURAN PALING PENTING (CRITICAL RULE):
KONSISTENSI MUTLAK & BERBASIS FAKTA (ABSOLUTE CONSISTENCY & FACT-BASED): Analisis Anda akan diulang 2x sampai 5x oleh sistem. Hasil Anda WAJIB 100% konsisten pada setiap pengulangan. DILARANG KERAS menebak-nebak, berasumsi, atau mengarang masalah (hallucination). Jika cacat tidak terlihat SANGAT JELAS secara visual, jangan dicantumkan.
Unfortunately, during our review we found that it contains one or more technical issues. Common issues that can impact the technical quality of images include exposure issues, soft focus, excessive filtering or artifacts/noise.
1. PEMINDAIAN KESELURUHAN (FULL SCAN): Anda WAJIB memeriksa KESELURUHAN gambar dari ujung ke ujung (corner-to-corner), bukan hanya fokus pada bagian tengah atau subjek utama saja. Periksa setiap tepi, sudut, background, dan elemen kecil.
2. SANGAT KETAT TERHADAP 4 ISU UTAMA ADOBE STOCK: Anda harus SANGAT SENSITIF dan TANPA AMPUN terhadap:
   - EXPOSURE ISSUES (Overexposure, underexposure, highlight yang blown out, atau shadow yang terlalu gelap).
   - SOFT FOCUS (Kurang tajam, fokus meleset, motion blur yang tidak disengaja, atau ketajaman subjek utama yang kurang optimal).
   - EXCESSIVE FILTERING (Efek over-processed, warna terlalu tersaturasi, terlalu kontras, atau tekstur yang tampak plastik/lilin akibat pemrosesan berlebih).
   - ARTIFACTS / NOISE (Grain digital, color banding, chromatic aberration, sensor dust, atau kompresi JPEG).
3. JANGAN PERNAH MENEBAK-NEBAK (NO HALLUCINATION): Lakukan pemindaian visual mendalam dan teliti. Dilarang keras menebak, mengarang, atau berasumsi jika Anda tidak melihat cacat secara fisik/nyata. Analisis harus 100% berbasis fakta visual.
4. Jika tidak ada cacat, KOSONGKAN array \\\`technical_issues\\\` dan \\\`heatmaps\\\`. Jangan mencari-cari kesalahan yang tidak ada.

Tingkat Toleransi Saat Ini: \${tolerance}. Panduan ketegasan:
- STRICT: "Zero Tolerance" mutlak. Sedikit noise, soft focus, chromatic aberration, sensor dust, gen-AI artifacts sekecil apapun, atau pelanggaran IP = FAIL secara instan (Skor maksimal 0-59).
- MEDIUM: Cacat minor di background bisa ditoleransi. Namun, pelanggaran IP sekecil apa pun, over-exposure pada subjek, out-of-focus pada subjek utama, atau gen-AI anomaly = FAIL (Skor maksimal 0-65).

A. KRITERIA EVALUASI TEKNIS (Berdasarkan Adobe Stock Quality & Technical Standards)
1. Out of Focus (Tidak Fokus) & Soft Focus
2. Artifacts / Noise / Excessive Filtering
3. Exposure / Pencahayaan
4. Intellectual Property (IP) / Masalah Hukum
5. Gen-AI Anomalies (Anomali AI Generatif)

ATURAN KHUSUS VIDEO (VIDEO TECHNICAL ISSUES):
Unfortunately, during our review we found that it contains one or more technical issues, such as unintentional shaking, empty black or white frame, compression and/or audio issues.
Ini adalah 3 CUPLIKAN FRAME diam (Awal, Tengah, Akhir) dari sebuah file Video. Anda HANYA BISA menganalisis aspek visual statis dari ketiga frame ini.
PERINTAH EKSEKUSI MUTLAK: Lakukan INSPEKSI MENDALAM dengan simulasi ZOOM 200% pada frame ini. Periksa piksel, tepian objek, dan area gelap secara mikroskopis. Hasil analisis HARUS BENAR-BENAR VALID, BERDASARKAN FAKTA, KONSISTEN, dan tidak berubah-ubah pada 2x sampai 5x pengulangan. Jangan mengarang masalah yang tidak kasat mata!

MAINTAIN VIDEO QUALITY (TANGKAP ISU TEKNIS BERIKUT JIKA TERLIHAT JELAS):
1. Rolling-Shutter Artifacts: Cek apakah ada efek skew (distorsi miring) yang parah pada garis vertikal atau objek bergerak, jello effects, atau flash banding (garis/pita horizontal dengan exposure berbeda).
2. Stability & Blur: Jika terlihat motion blur yang sangat ekstrem pada subjek utama (bukan disengaja) sehingga merusak kualitas visual, tandai sebagai isu.
3. Kompresi & Kualitas Pixel: Cari blok kompresi (compression artifacts), noise digital berlebih, pixelation, atau color banding yang sangat buruk di latar belakang.
4. Exposure & Pencahayaan: Cek apakah overexposed (blown out) atau underexposed (crushed blacks).
5. Frame Kosong: Apakah frame ini secara tidak sengaja kosong (hitam/putih pekat).

KONSISTENSI MUTLAK (SANGAT PENTING): Anda HARUS memberikan penilaian dan alasan yang SAMA PERSIS setiap kali frame ini diperiksa ulang.
JIKA TIDAK ADA MASALAH VISUAL FATAL ATAU ARTIFACT (SEPERTI SKEW/FLASH BANDING) YANG SANGAT JELAS PADA FRAME INI, BERIKAN STATUS PASS.
DEFAULT-KAN KE STATUS PASS KECUALI ANDA BISA MEMBUKTIKAN SECARA MUTLAK ADA PELANGGARAN IP ATAU CACAT FATAL! Berhentilah menebak-nebak (No hallucination)!\`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
        visual_scan_analysis: { type: Type.STRING },
        legal_status: { type: Type.STRING, enum: ["SAFE", "AT_RISK", "VIOLATION"] },
        technical_issues: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        strengths: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        overall_score: { type: Type.NUMBER },
        recommendation: { type: Type.STRING, enum: ["PASS", "FAIL", "RETOUCH"] },
        detailed_feedback: { type: Type.STRING },
        heatmaps: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    intensity: { type: Type.NUMBER },
                    raw_value: { type: Type.STRING }
                },
                required: ["type", "x", "y", "intensity", "raw_value"]
            }
        }
    },
    required: ["visual_scan_analysis", "legal_status", "technical_issues", "strengths", "overall_score", "recommendation", "detailed_feedback", "heatmaps"]
  };

  const imageParts = frames.map(f => processFrameServer(f));
  
  const modelsToTry = ['gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-preview', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-flash-latest'];
  let responseText = "";
  let lastError;

  const modelsToTryList = model && model.startsWith('gemini') ? [model, ...modelsToTry] : modelsToTry;
  for (const modelName of modelsToTryList) {
    try {
      const res = await callGeminiWithRetry(modelName, { parts: [...imageParts, { text: "Act as an objective Adobe Stock QA curator. Evaluate these 3 video frames (Start, Middle, End). Conduct a balanced technical and legal audit. Determine final status as PASS or FAIL consistently based on the tolerance provided." }] }, {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.0,
        topK: 1,
        topP: 0.1
      });
      responseText = res.text || "{}";
      break;
    } catch (err) {
      lastError = err;
      console.warn(\`[checkVideoQuality] Failed with \${modelName}:\`, err.message || err);
      if (err.message && err.message.includes('API_KEY')) throw err;
    }
  }

  if (!responseText) throw lastError;
  
  try {
    const text = responseText;
    console.log('QA raw video response:', text);
    return JSON.parse(text);
  } catch(e) {
    console.warn("Parse Error:", responseText);
    throw e;
  }
}
`;

gemini = gemini + '\n' + newFunc;
fs.writeFileSync('server/gemini.ts', gemini);
