const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/\(!ownerEmail \|\| !isEmail\(ownerEmail\)\)/g, '(!ownerId || !isEmail(ownerId))');
fs.writeFileSync('App.tsx', code);
