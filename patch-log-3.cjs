const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  "console.warn('MUTE VIDEO CAUGHT ERROR:', e, e.stack);",
  "require('fs').writeFileSync('/tmp/mute-error.log', e.stack || e.toString());"
);
fs.writeFileSync('server.ts', code);
