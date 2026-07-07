import fs from 'fs';

let content = fs.readFileSync('src/components/SaaSPortal.tsx', 'utf8');

// Replace handleGenerateKeys catch block
content = content.replace(
  /\} catch \(err: any\) \{\s*console\.error\('Failed to generate keys in database:', err\);\s*alert\('Gagal generate key: Database belum dikonfigurasi.*?\\n\\nError: ' \+ err\.message\);\s*\}/s,
  `} catch (err: any) {
      console.warn('Failed to generate keys in database, falling back:', err);
    }`
);

// Replace fetchBackendKeys catch block
content = content.replace(
  /\} catch \(err: any\) \{\s*console\.error\('Failed to fetch keys from database:', err\);\s*alert\('Gagal mengambil daftar key: Database belum dikonfigurasi.*?\\n\\nError: ' \+ err\.message\);\s*\}/s,
  `} catch (err: any) {
      console.warn('Failed to fetch keys from database, falling back:', err);
      let cached = localStorage.getItem('mz_backend_keys_cache');
      if (cached) {
        try { setBackendKeys(JSON.parse(cached)); } catch(e) {}
      }
    }`
);

// Replace activate catch block
content = content.replace(
  /\} catch \(err: any\) \{\s*console\.error\('Database activate check error:', err\);\s*setActivationError\('Koneksi database\/lisensi bermasalah: ' \+ err\.message \+ '\\nSilakan jalankan script SQL\.'\);\s*\}/s,
  `} catch (err: any) {
      console.warn('Database activate check error, falling back:', err);
      // Fallback check against cached keys
      let cachedKeys = localStorage.getItem('mz_backend_keys_cache');
      let foundInCache: any = null;
      if (cachedKeys) {
        try {
          const list: any[] = JSON.parse(cachedKeys);
          foundInCache = list.find(k => k.key === targetKeyFormatted);
        } catch(e) {}
      }
      if (foundInCache) {
        const ownerId = foundInCache.firstActivatedBy || foundInCache.activatedBy || '';
        let offlineRejected = false;
        if (ownerId) {
          const isOwner = (ownerId === devId || (userId && ownerId === userId) || (userEmail && ownerId.toLowerCase() === userEmail.toLowerCase()));
          if (!isOwner) offlineRejected = true;
        }
        if (offlineRejected) {
          setActivationError(localStorage.getItem('mz_language') === 'Bahasa'
            ? 'Kunci lisensi ini sudah terdaftar oleh akun lain! (Offline Mode)'
            : 'This license key is already registered to another account! (Offline Mode)');
          setIsActivating(false);
          return;
        }
        foundInCache.activated = true;
        foundInCache.cancelled = false;
        foundInCache.activatedBy = userEmail || devId;
        if (!foundInCache.firstActivatedBy) foundInCache.firstActivatedBy = userEmail || devId;
        if (!foundInCache.activatedAt) foundInCache.activatedAt = new Date().toISOString();
        
        let cachedKeys2 = localStorage.getItem('mz_backend_keys_cache');
        if (cachedKeys2) {
          try {
            let list2: any[] = JSON.parse(cachedKeys2);
            const updated = list2.map(k => k.key === targetKeyFormatted ? foundInCache : k);
            localStorage.setItem('mz_backend_keys_cache', JSON.stringify(updated));
            setBackendKeys(updated);
          } catch(e) {}
        }
        
        localStorage.setItem('mz_license_key', targetKeyFormatted);
        await syncUserDb(targetKeyFormatted);
        setLicenseKey(targetKeyFormatted);
        setActivationSuccess(true);
        setActivationError('');
        setTimeout(() => {
          setActivationSuccess(false);
          setShowActivation(false);
        }, 2500);
      } else {
        setActivationError('Koneksi database/lisensi bermasalah, dan serial key Anda tidak terdaftar untuk aktivasi offline.');
      }
    }`
);

fs.writeFileSync('src/components/SaaSPortal.tsx', content, 'utf8');
