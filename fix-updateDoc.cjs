const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/updateDoc\(userRef, \{\s*\[\`dailyUsage\.\$\{dateStr\}\.\$\{type\}\`\]: newVal,\s*updatedAt: new Date\(\)\.toISOString\(\)\s*\}, \{ merge: true \}\)\.catch/g, `updateDoc(userRef, {
        [\`dailyUsage.\${dateStr}.\${type}\`]: newVal,
        updatedAt: new Date().toISOString()
      }).catch`);

code = code.replace(/updateDoc\(userRef, \{\s*licenseKey: '',\s*updatedAt: new Date\(\)\.toISOString\(\)\s*\}, \{ merge: true \}\)\.catch/g, `updateDoc(userRef, {
          licenseKey: '',
          updatedAt: new Date().toISOString()
        }).catch`);

fs.writeFileSync('App.tsx', code);
