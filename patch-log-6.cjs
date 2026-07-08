const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  "console.warn('MUTE VIDEO CAUGHT ERROR:', e);",
  "console.warn('MUTE VIDEO CAUGHT ERROR:', e, e.message); require('fs').writeFileSync('/tmp/exact-error.log', e.message);"
);
fs.writeFileSync('server.ts', code);
