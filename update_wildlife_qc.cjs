const fs = require('fs');
let gemini = fs.readFileSync('server/gemini.ts', 'utf8');

const targetStr = `1. GAMBAR BERSIH & SEMPURNA = WAJIB PASS (Skor 85-98, Ready for Adobe Stock):
   - Jika subjek utama tajam sempurna (tack-sharp), pencahayaan alami/seimbang, fisika realistis (sendok menempel rapi di serbet/meja, batang ceri menancap organik, pisang terletak wajar di piring saji), latar belakang bokeh alami/kabur kabut yang bersih, dan tidak ada cacat anatomi/struktur, Anda WAJIB meloloskan aset ini dengan status "PASS", skor tinggi (85-95), dan legal_status "SAFE".`;

const updateStr = `1. GAMBAR BERSIH & SEMPURNA = WAJIB PASS (Skor 85-98, Ready for Adobe Stock):
   - Jika subjek utama tajam sempurna (tack-sharp), pencahayaan alami/seimbang, fisika realistis (alat pengukur/jangka sorong/caliper dipegang wajar oleh peneliti, serbet/sendok menempel rapi, pasir pantai & air laut alami, anatomi penyu & manusia normal dan utuh), latar belakang bokeh alami/kabur kabut yang bersih, dan tidak ada cacat anatomi/struktur, Anda WAJIB meloloskan aset ini dengan status "PASS", skor tinggi (88-96), dan legal_status "SAFE" (dengan requires_model_release: true jika ada orang yang dapat dikenali).`;

if (gemini.includes(targetStr)) {
    gemini = gemini.replace(targetStr, updateStr);
    fs.writeFileSync('server/gemini.ts', gemini);
    console.log("Updated wildlife and field researcher rules successfully!");
} else {
    console.log("Could not find targetStr");
}
