import fs from 'fs';

let file = fs.readFileSync('src/components/SaaSPortal.tsx', 'utf8');

file = file.replace(
  "const [pakasirProject, setPakasirProject] = useState(() => localStorage.getItem('mz_pakasir_project') || '');",
  "const [pakasirProject, setPakasirProject] = useState(() => import.meta.env.VITE_PAKASIR_PROJECT_SLUG || localStorage.getItem('mz_pakasir_project') || '');"
);

file = file.replace(
  "const [pakasirApiKey, setPakasirApiKey] = useState(() => localStorage.getItem('mz_pakasir_apikey') || '');",
  "const [pakasirApiKey, setPakasirApiKey] = useState(() => import.meta.env.VITE_PAKASIR_API_KEY || localStorage.getItem('mz_pakasir_apikey') || '');"
);

file = file.replace(
  "const [tempPakasirProject, setTempPakasirProject] = useState(() => localStorage.getItem('mz_pakasir_project') || '');",
  "const [tempPakasirProject, setTempPakasirProject] = useState(() => import.meta.env.VITE_PAKASIR_PROJECT_SLUG || localStorage.getItem('mz_pakasir_project') || '');"
);

file = file.replace(
  "const [tempPakasirApiKey, setTempPakasirApiKey] = useState(() => localStorage.getItem('mz_pakasir_apikey') || '');",
  "const [tempPakasirApiKey, setTempPakasirApiKey] = useState(() => import.meta.env.VITE_PAKASIR_API_KEY || localStorage.getItem('mz_pakasir_apikey') || '');"
);

fs.writeFileSync('src/components/SaaSPortal.tsx', file);
