const fs = require('fs');
let code = fs.readFileSync('server/gemini.ts', 'utf8');

// 1. Fix ensureTitleLength
code = code.replace(
`function ensureTitleLength(title: string, keywords: string[], description: string): string {
  if (!title) title = "Stock asset";
  else title = String(title);`,
`function ensureTitleLength(title: string, keywords: string[], description: string): string {
  if (!title || title.trim() === "") {
    if (description && description.trim().length > 10) title = description;
    else if (keywords && keywords.length >= 3) title = keywords.slice(0, 5).join(' ');
    else title = "Stock asset";
  } else {
    title = String(title);
  }`
);

// 2. Fix target count constraints in keywords
code = code.replace(/List of exactly \$\{aiRequestCount\}/g, 'List of UP TO ${aiRequestCount} highly-relevant');

// 3. Fix prompt to explicitly demand full output
code = code.replace(
`OUTPUT MUST BE IN ENGLISH for titles and keywords.`,
`OUTPUT MUST BE IN ENGLISH for titles and keywords. YOU MUST FULLY POPULATE THE TITLE AND DESCRIPTION FIELDS. NEVER LEAVE THEM EMPTY.`
);

fs.writeFileSync('server/gemini.ts', code);
