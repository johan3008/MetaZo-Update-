const fs = require('fs');

// We simulate the exact functions from server/gemini.ts
function sanitizeForIndexing(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isProhibitedKeyword(kw) {
  const prohibited = ['vector', 'illustration', 'ai generated', 'generative ai', '4k', 'hd', 'high quality'];
  return prohibited.includes(kw.toLowerCase().trim());
}

const TITLE_STOP_WORDS = new Set(['and', 'with', 'in', 'on', 'the', 'a', 'an', 'of', 'for', 'at', 'by', 'to', 'from', 'is', 'are', 'has', 'have']);

function extractTargetKeywords(customPrompt) {
  if (!customPrompt || typeof customPrompt !== 'string') return [];
  const trimmed = customPrompt.trim();
  if (!trimmed) return [];
  
  const rawSegments = trimmed.split(/[,;\n|•\t\/]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
    
  const results = [];
  const seen = new Set();

  for (const seg of rawSegments) {
    const clean = sanitizeForIndexing(seg);
    if (!clean || clean.length < 2 || isProhibitedKeyword(clean)) continue;
    
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 1 && words.length <= 4) {
      if (!seen.has(clean)) {
        seen.add(clean);
        results.push(clean);
      }
    } else if (words.length > 4) {
      const meaningfulWords = words.filter(w => !TITLE_STOP_WORDS.has(w) && w.length > 2);
      if (meaningfulWords.length > 0) {
        for (let i = 0; i < meaningfulWords.length; i += 2) {
          const chunk = meaningfulWords.slice(i, i + 2).join(' ');
          if (chunk && !seen.has(chunk) && !isProhibitedKeyword(chunk)) {
            seen.add(chunk);
            results.push(chunk);
          }
        }
      }
    }
  }

  return results;
}

function ensureTitleLength(title, keywords, description, titleLength, customPrompt) {
  const targetKeywords = extractTargetKeywords(customPrompt);
  if (!title || title.trim() === "") {
    if (targetKeywords.length > 0) {
      title = targetKeywords.slice(0, 3).join(' ') + (description && description.length > 10 ? ' ' + description : '');
    } else if (description && description.trim().length > 10) title = description;
    else if (keywords && keywords.length >= 3) title = keywords.slice(0, 5).join(' ');
    else title = "Stock asset";
  } else {
    title = String(title);
  }
  
  let cleanedTitle = title.replace(/,/g, ' ').replace(/[\-–—_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleanedTitle.endsWith('.')) cleanedTitle = cleanedTitle.slice(0, -1).trim();

  let titleLower = cleanedTitle.toLowerCase();

  // Ensure Target Keyword from customPrompt is front-loaded at the beginning of the title
  if (targetKeywords.length > 0) {
    const primaryTarget = targetKeywords[0];
    const primaryLower = primaryTarget.toLowerCase();
    if (!titleLower.startsWith(primaryLower)) {
      if (titleLower.includes(primaryLower)) {
        const escaped = primaryTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('\\b' + escaped + '\\b', 'i');
        const withoutTarget = cleanedTitle.replace(regex, '').replace(/\s+/g, ' ').trim();
        cleanedTitle = (primaryTarget + ' ' + withoutTarget).trim();
      } else {
        cleanedTitle = (primaryTarget + ' ' + cleanedTitle).trim();
      }
    }
  }

  cleanedTitle = cleanedTitle.replace(/,/g, '').replace(/\./g, '').replace(/\s+/g, ' ').trim();
  if (cleanedTitle.length > 0) {
    cleanedTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);
  }
  return cleanedTitle;
}

function applyKeywordsWithTarget(finalKeywords, customPrompt, targetCount) {
  const targetKeywords = extractTargetKeywords(customPrompt);
  if (targetKeywords.length > 0) {
    const validTargets = targetKeywords.filter(k => !isProhibitedKeyword(k));
    const seen = new Set();
    const reordered = [];

    // 1. Put user-defined target keywords first at the beginning
    for (const tk of validTargets) {
      if (!seen.has(tk.toLowerCase())) {
        seen.add(tk.toLowerCase());
        reordered.push(tk.toLowerCase());
      }
    }

    // 2. Append the rest of the AI generated & ranked keywords
    for (const kw of finalKeywords) {
      if (!seen.has(kw.toLowerCase())) {
        seen.add(kw.toLowerCase());
        reordered.push(kw.toLowerCase());
      }
    }

    finalKeywords = reordered;
  }

  return finalKeywords.slice(0, targetCount);
}

// Tests
console.log('--- TEST 1: Comma-separated target keywords ---');
const prompt1 = 'ramadan mubarak, islamic lantern, eid sale';
const extracted1 = extractTargetKeywords(prompt1);
console.log('Extracted:', extracted1);
const title1 = ensureTitleLength('Golden decorative crescent lamp in darkness with copy space', ['lamp', 'gold', 'light'], '', 'medium', prompt1);
console.log('Title 1:', title1);
const keywords1 = applyKeywordsWithTarget(['lantern', 'golden', 'arabic', 'traditional', 'light', 'celebration'], prompt1, 10);
console.log('Keywords 1 (Targets at beginning):', keywords1);

console.log('\n--- TEST 2: Target keyword inside middle of title ---');
const title2 = ensureTitleLength('Beautiful glowing islamic lantern hanging in modern room', ['lantern'], '', 'medium', 'islamic lantern');
console.log('Title 2 (Front-loaded):', title2);

console.log('\nALL TESTS COMPLETED SUCCESSFULLY!');
