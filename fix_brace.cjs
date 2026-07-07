const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/} else \{\s*if \(ownerId && isEmail\(ownerId\)\) \{\s*setIsMzLicensed\(false\);\s*setIsCheckingLicense\(false\);\s*return;\s*} else if \(ownerId && ownerId !== devId\) \{\s*isRejected = true;\s*}\s*const clearLicenseKey/g, 
`} else {
              if (ownerId && isEmail(ownerId)) {
                setIsMzLicensed(false);
                setIsCheckingLicense(false);
                return;
              } else if (ownerId && ownerId !== devId) {
                isRejected = true;
              }
            }
            const clearLicenseKey`);

code = code.replace(/(!ownerEmail || !isEmail\(ownerEmail\))/g, '(!ownerId || !isEmail(ownerId))');

fs.writeFileSync('App.tsx', code);
