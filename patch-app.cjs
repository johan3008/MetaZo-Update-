const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');

// The keys table updates in App.tsx
app = app.replace(/updateDoc\(doc\(db, 'keys', k\), {\s*activatedBy: currentEmail,\s*firstActivatedBy: currentEmail,\s*updatedAt: new Date\(\)\.toISOString\(\)\s*}\)/g, 
  "updateDoc(doc(db, 'keys', k), { activatedBy: currentEmail, firstActivatedBy: currentEmail })");

app = app.replace(/updateDoc\(doc\(db, 'keys', k\), {\s*activatedBy: user\.email,\s*firstActivatedBy: user\.email,\s*updatedAt: new Date\(\)\.toISOString\(\)\s*}\)/g, 
  "updateDoc(doc(db, 'keys', k), { activatedBy: user.email, firstActivatedBy: user.email })");

fs.writeFileSync('App.tsx', app);
