const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.split('(!ownerId || !isEmail(ownerId))').join('');
fs.writeFileSync('App.tsx', code);
