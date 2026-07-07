import fs from 'fs';

let content = fs.readFileSync('src/components/SaaSPortal.tsx', 'utf8');

content = content.replace(
  /\} catch \(err\) \{\s*if \(err\.message && err\.message\.includes\('Quota exceeded'\)\)[\s\S]*?setIsKeysLoading\(false\);\s*\}/s,
  `} catch (err: any) {
      console.error("Failed to fetch keys from database:", err);
      alert('Gagal mengambil daftar key: Database belum dikonfigurasi dengan benar atau tabel tidak ditemukan. Silakan jalankan script SQL di Supabase Anda.\\n\\nError: ' + err.message);
    } finally {
      setIsKeysLoading(false);
    }`
);

fs.writeFileSync('src/components/SaaSPortal.tsx', content, 'utf8');
