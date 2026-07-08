const fs = require('fs');
let app = fs.readFileSync('App.tsx', 'utf8');
app = app.replace(/\/\* updatedAt removed for keys \*\//g, "updatedAt: new Date().toISOString()");
fs.writeFileSync('App.tsx', app);

let saas = fs.readFileSync('src/components/SaaSPortal.tsx', 'utf8');
saas = saas.replace(/\/\* updatedAt removed \*\//g, "updatedAt: new Date().toISOString()");
fs.writeFileSync('src/components/SaaSPortal.tsx', saas);
