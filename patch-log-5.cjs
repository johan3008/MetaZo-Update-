const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  "require('fs').writeFileSync('/tmp/mute-called.log', 'CALLED');",
  ""
);
code = code.replace(
  "require('fs').writeFileSync('/tmp/mute-error.log', e.stack || e.toString());",
  "console.warn('MUTE VIDEO CAUGHT ERROR:', e);"
);
fs.writeFileSync('server.ts', code);
