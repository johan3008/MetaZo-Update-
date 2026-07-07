const fs = require('fs');
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf8');

// replace onClick={() => setShowGoogleChoice(true)} with onClick={handleGoogleLogin}
code = code.replace(/onClick=\{\(\) => setShowGoogleChoice\(true\)\}/g, 'onClick={handleGoogleLogin}');

// remove the entire modal
const modalStart = code.indexOf('{/* GOOGLE SIGN IN METHOD SELECTION MODAL */}');
if (modalStart !== -1) {
  const modalEnd = code.lastIndexOf('</AnimatePresence>');
  if (modalEnd !== -1) {
    code = code.substring(0, modalStart) + code.substring(modalEnd + '</AnimatePresence>'.length);
  }
}

// remove showGoogleChoice, setShowGoogleChoice
code = code.replace(/const \[showGoogleChoice, setShowGoogleChoice\] = useState\(false\);/g, '');
code = code.replace(/setShowGoogleChoice\(true\);/g, '');
code = code.replace(/setShowGoogleChoice\(false\);/g, '');

// remove showManualTokenInput, setShowManualTokenInput
code = code.replace(/const \[showManualTokenInput, setShowManualTokenInput\] = useState\(false\);/g, '');
code = code.replace(/setShowManualTokenInput\(true\);/g, '');
code = code.replace(/setShowManualTokenInput\(false\);/g, '');

fs.writeFileSync('src/components/LoginScreen.tsx', code);
