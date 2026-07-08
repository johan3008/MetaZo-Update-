const fs = require('fs');
let code = fs.readFileSync('src/components/SaaSPortal.tsx', 'utf8');

code = code.replace(/promoCode: cleanPromo,/g, "");

fs.writeFileSync('src/components/SaaSPortal.tsx', code);
