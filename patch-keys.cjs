const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');
app = app.replace(/updatedAt:\s*new Date\(\)\.toISOString\(\)/g, "/* updatedAt removed for keys */");
fs.writeFileSync('App.tsx', app);

let saas = fs.readFileSync('src/components/SaaSPortal.tsx', 'utf8');
saas = saas.replace(/cancelled:\s*false,/g, "");
saas = saas.replace(/updatedAt:\s*new Date\(\)\.toISOString\(\)/g, "/* updatedAt removed */");
fs.writeFileSync('src/components/SaaSPortal.tsx', saas);
