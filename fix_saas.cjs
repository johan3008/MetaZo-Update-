const fs = require('fs');
let code = fs.readFileSync('src/components/SaaSPortal.tsx', 'utf8');

code = code.replace(/const keysList: LicenseKeyBackend\[\] = \[\];\s*qSnap\.forEach\(\(doc\) => {/g, 
`const keysList: LicenseKeyBackend[] = [];
      qSnap.forEach((doc) => {
        let activatedBy = doc.data().activatedBy || '';
        const firstActivatedBy = doc.data().firstActivatedBy || '';
        let ownerId = firstActivatedBy || activatedBy;
        if (userId && userEmail && ownerId === userId) {
           activatedBy = userEmail;
           // Automatically heal the database for this user
           updateDoc(doc.ref, { activatedBy: userEmail, firstActivatedBy: userEmail }).catch(()=>{});
        }`);

fs.writeFileSync('src/components/SaaSPortal.tsx', code);
