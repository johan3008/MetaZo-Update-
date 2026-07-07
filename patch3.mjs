import fs from 'fs';

let content = fs.readFileSync('src/components/SaaSPortal.tsx', 'utf8');

// Replace fetchBackendKeys fallback
content = content.replace(
  /const fetchBackendKeys = async \(\) => \{.*?\} catch \(e\) \{.*?console\.error\("Failed to fetch keys from Supabase:", e\);.*?\}[\s\S]*?\};/s,
  `const fetchBackendKeys = async () => {
    try {
      const q = query(collection(db, 'keys'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: LicenseKeyBackend[] = [];
      snapshot.forEach(doc => list.push(doc.data() as LicenseKeyBackend));
      setBackendKeys(list);
      localStorage.setItem('mz_backend_keys_cache', JSON.stringify(list));
    } catch (e: any) {
      console.error("Failed to fetch keys from Supabase:", e);
      alert('Gagal mengambil daftar key: Database belum dikonfigurasi dengan benar atau tabel "keys" tidak ditemukan. Silakan jalankan script SQL di Supabase Anda.\\n\\nError: ' + e.message);
    }
  };`
);

fs.writeFileSync('src/components/SaaSPortal.tsx', content, 'utf8');
