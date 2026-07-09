const fs = require('fs');
const p = './src/components/SaaSPortal.tsx';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace(`                   body: JSON.stringify({
                     email: userEmail,
                     licenseKey: newKey,
            cancelledSubscription: false,
                   })`, `                   body: JSON.stringify({
                     email: userEmail,
                     licenseKey: newKey,
                     appName: tempAppName || 'MetaZo PRO',
                     caption: \`Terima kasih atas pembayaran Anda! Akun Anda kini berstatus PRO dengan paket \${duration === '30days' ? '30 Hari' : 'Unlimited'}. Berikut adalah salinan License Key Anda.\`
                   })`);

txt = txt.replace(`               body: JSON.stringify({
                 email: userEmail,
                 licenseKey: newKey,
            cancelledSubscription: false,
               })`, `               body: JSON.stringify({
                 email: userEmail,
                 licenseKey: newKey,
                 appName: tempAppName || 'MetaZo PRO',
                 caption: \`Terima kasih atas pembayaran Anda! Akun Anda kini berstatus PRO dengan paket \${duration === '30days' ? '30 Hari' : 'Unlimited'}. Berikut adalah salinan License Key Anda.\`
               })`);

fs.writeFileSync(p, txt);
