import fs from 'fs';

let content = fs.readFileSync('src/components/SaaSPortal.tsx', 'utf8');

// Replace handleGenerateKeys fallback
content = content.replace(
  /catch \(err\) \{\s*console\.error\('Failed to generate keys in Firestore.*?alert\(`Firestore Quota Terlampaui.*?`\);\s*\}/s,
  `catch (err: any) {
      console.error('Failed to generate keys in database:', err);
      alert('Gagal generate key: Database belum dikonfigurasi dengan benar atau tabel tidak ditemukan. Silakan jalankan script SQL di Supabase Anda.\\n\\nError: ' + err.message);
    }`
);

fs.writeFileSync('src/components/SaaSPortal.tsx', content, 'utf8');
