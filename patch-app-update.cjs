const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/updateDoc\(userDocRef, {/g, "setDoc(userDocRef, {");
code = code.replace(/updatedAt: new Date\(\)\.toISOString\(\)\s*}\)\.catch\(/g, "updatedAt: new Date().toISOString()\n              }, { merge: true }).catch(");

fs.writeFileSync('App.tsx', code);
