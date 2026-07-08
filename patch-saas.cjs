const fs = require('fs');
let code = fs.readFileSync('src/components/SaaSPortal.tsx', 'utf8');

code = code.replace(/activatedBy: userEmail \|\| devId,\s*firstActivatedBy: userEmail \|\| devId,\s*updatedAt: new Date\(\)\.toISOString\(\)/g,
  "activatedBy: userEmail || devId,\n              firstActivatedBy: userEmail || devId");

code = code.replace(/activatedAt: new Date\(\)\.toISOString\(\),\s*updatedAt: new Date\(\)\.toISOString\(\)/g,
  "activatedAt: new Date().toISOString()");

code = code.replace(/activatedBy: '',\s*activatedAt: '',\s*updatedAt: new Date\(\)\.toISOString\(\)/g,
  "activatedBy: '',\n          activatedAt: ''");

fs.writeFileSync('src/components/SaaSPortal.tsx', code);
