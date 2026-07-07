const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/} else \{\s*\/\/\s*User is not logged in yet[\s\S]*?\/\/\s*Bound to a DIFFERENT device ID!\s*isRejected = true;\s*}\s*}/, '');
fs.writeFileSync('App.tsx', code);
