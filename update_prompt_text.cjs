const fs = require('fs');
let gemini = fs.readFileSync('server/gemini.ts', 'utf8');

// Update promptText in checkImageQuality to be much more strict
const targetPromptStr = `let promptText = \`Act as an objective Adobe Stock QA curator. Conduct a balanced technical and legal audit. Determine final status as PASS or FAIL consistently based on the tolerance provided. CRITICAL: Ensure your ENTIRE JSON response is written in the requested language: \${targetLanguageName} (Do NOT slip into English).\`;`;

const newPromptStr = `let promptText = \`Anda adalah Senior Adobe Stock & Shutterstock Content Inspector. Lakukan audit mikro-forensik yang SANGAT KETAT.
PERINGATAN KERAS: JANGAN PERNAH meloloskan (PASS) gambar yang memiliki cacat Generative AI, ketidaksesuaian mekanika/fisika (kabel melayang, sendok melayang, pin bengkok, ornamen tanpa tali, refleksi hantu, atau diagram kimia rusak), distorsi anatomi sekecil apa pun, teks cacat, atau overexposure glow. Jika ditemukan satu saja masalah di atas, Anda WAJIB memberikan rekomendasi: "FAIL", skor keseluruhan < 60, dan tandai check terkait sebagai FAIL. Pastikan SELURUH respons JSON ditulis dalam bahasa: \${targetLanguageName}.\`;`;

if (gemini.includes(targetPromptStr)) {
    gemini = gemini.replace(targetPromptStr, newPromptStr);
    fs.writeFileSync('server/gemini.ts', gemini);
    console.log("Updated promptText in checkImageQuality successfully!");
} else {
    console.log("Could not find targetPromptStr");
}
