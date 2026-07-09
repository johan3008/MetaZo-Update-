const fs = require('fs');
let code = fs.readFileSync('src/components/SaaSPortal.tsx', 'utf8');

code = code.replace(/qSnap\.forEach\(\(doc\) => \{/g, "qSnap.forEach((d) => {");
code = code.replace(/let activatedBy = doc\.data\(\)\.activatedBy \|\| '';/g, "let activatedBy = d.data().activatedBy || '';");
code = code.replace(/const firstActivatedBy = doc\.data\(\)\.firstActivatedBy \|\| '';/g, "const firstActivatedBy = d.data().firstActivatedBy || '';");
code = code.replace(/updateDoc\(doc\(db, 'keys', doc\.id\),/g, "updateDoc(doc(db, 'keys', d.id),");
code = code.replace(/const data = doc\.data\(\);/g, "const data = d.data();");
code = code.replace(/key: doc\.id,/g, "key: d.id,");

fs.writeFileSync('src/components/SaaSPortal.tsx', code);
