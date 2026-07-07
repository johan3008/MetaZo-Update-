import fs from 'fs';

let content = fs.readFileSync('src/components/SaaSPortal.tsx', 'utf8');

content = content.replace(
  /\} catch \(err\) \{\s*console\.warn\('Firestore activate check error.*?setActivationError\('Koneksi database\/lisensi bermasalah, dan serial key Anda tidak terdaftar untuk aktivasi offline\.'\);\s*\}\s*\} finally \{/s,
  `} catch (err: any) {
      console.error('Database activate check error:', err);
      setActivationError('Koneksi database/lisensi bermasalah: ' + err.message + '\\nSilakan jalankan script SQL.');
    } finally {`
);

fs.writeFileSync('src/components/SaaSPortal.tsx', content, 'utf8');
