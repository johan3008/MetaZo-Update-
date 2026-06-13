const fs = require('fs');
let content = fs.readFileSync('server/gemini.ts', 'utf8');

const targetTitleRule = '2. SEO-OPTIMIZED VOCABULARY: Prioritize high-volume commercial search terms over generic words when describing literal elements (e.g., use "abandoned building" instead of "room", "worn work glove" instead of "single work glove", "sunlight" instead of just "window"). Combine natural phrasing with strong microstock keywords.';

const replaceTitleRule = '2. SEO-FRIENDLY & OPTIMIZED VOCABULARY: Make the title highly SEO Friendly for microstock platforms. Prioritize high-volume commercial search terms over generic words when describing literal elements (e.g., use "abandoned building" instead of "room", "worn work glove" instead of "single work glove", "sunlight" instead of just "window"). Combine natural phrasing with strong, specific microstock keywords.';

content = content.split(targetTitleRule).join(replaceTitleRule);

fs.writeFileSync('server/gemini.ts', content);
console.log('SEO-Friendly title rules updated');
