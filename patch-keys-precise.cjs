const fs = require('fs');

// Patch SaaSPortal.tsx
let saas = fs.readFileSync('src/components/SaaSPortal.tsx', 'utf8');

// Replace "cancelled: false,"
saas = saas.replace(/cancelled:\s*false,/g, "");

fs.writeFileSync('src/components/SaaSPortal.tsx', saas);

