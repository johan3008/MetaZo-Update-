const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const regex = /const ownerEmail = firstActivatedBy \|\| keyActivatedBy;[\s\S]*?isRejected = true;\s*}\s*}/;

const replacement = `const ownerId = firstActivatedBy || keyActivatedBy;
            const isEmail = (str: string) => str.includes('@');
            let isRejected = false;

            if (user) {
              if (ownerId.toLowerCase() === currentEmail.toLowerCase() || ownerId === user.uid) {
                // Valid! If it's a UID, upgrade it to email
                if (ownerId === user.uid && currentEmail) {
                  updateDoc(doc(db, 'keys', k), {
                    activatedBy: currentEmail,
                    firstActivatedBy: currentEmail,
                    updatedAt: new Date().toISOString()
                  }).catch(e => console.info('db_op', e));
                }
              } else if (ownerId === devId) {
                if (currentEmail) {
                  updateDoc(doc(db, 'keys', k), {
                    activatedBy: currentEmail,
                    firstActivatedBy: currentEmail,
                    updatedAt: new Date().toISOString()
                  }).catch(e => console.info('db_op', e));
                }
              } else {
                isRejected = true;
              }
            } else {
              if (ownerId && isEmail(ownerId)) {
                setIsMzLicensed(false);
                setIsCheckingLicense(false);
                return;
              } else if (ownerId && ownerId !== devId) {
                isRejected = true;
              }
            }`;

code = code.replace(regex, replacement);
fs.writeFileSync('App.tsx', code);
