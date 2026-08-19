import re

file_path = "/data/metazo/MetaZo-Update--main/server/gemini.ts"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add/Enhance sanitizeForIndexing function
sanitize_func = """
/**
 * Sanitasi mendalam khusus untuk memastikan kata kunci 100% ramah indeksasi (Indexable)
 * pada algoritma mesin pencari microstock (Adobe Stock, Shutterstock, Freepik, Getty).
 */
function sanitizeForIndexing(kw: string): string {
  if (!kw) return '';
  let clean = kw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\\s-]/g, '') // Hapus simbol, kutip, bracket, emoji, titik koma
    .replace(/\\s+/g, ' ')          # Normalisasi spasi
    .trim();

  // Filter stop-words/noise tunggal yang mengganggu indeksasi
  const stopWords = new Set(['a', 'an', 'the', 'at', 'in', 'on', 'of', 'to', 'by', 'is', 'it', 'or', 'and', 'as', 'for', 'with']);
  const words = clean.split(' ').filter(w => w.length >= 2 && !stopWords.has(w));
  
  return words.join(' ');
}
"""

if "function sanitizeForIndexing" not in code:
    pos = code.find("function semanticKeySignature")
    if pos != -1:
        code = code[:pos] + sanitize_func + "\n" + code[pos:]

# 2. Add indexing prompt directives to system instructions
indexing_directives = """
MICROSTOCK KEYWORD INDEXING ENGINE DIRECTIVES (CRITICAL FOR ADOBE STOCK INDEXING):
1. CLEAN INDEXABLE SYNTAX: Every keyword MUST be 100% clean, lowercase, without special symbols, hashtags, or emojis.
2. NO SINGULAR/PLURAL REDUNDANCY: Do NOT list both singular and plural forms of the same root word (e.g. avoid 'car' AND 'cars', 'tree' AND 'trees') as stock search engines automatically stem root words. Duplicate roots waste valuable indexing capacity.
3. HIGH-CONVERSION COMPOUND PHRASES: Generate 1-to-3 word compound terms (e.g. 'copy space', 'landing page', 'digital marketing', 'green energy', 'isolated background') which Adobe Stock indexes both as exact compound phrases and individual token words, doubling search visibility.
4. FULL INDEX CAPACITY: Maximize unique search term coverage across all keyword slots up to the target count, blending core subject nouns, action verbs, environmental setting, commercial intent, regional synonyms, and target industry use-cases.
5. KEYWORD #1 STRICT MAIN SUBJECT: Keyword #1 MUST strictly be the main visual subject (Subjek Utama).
"""

# Insert indexing_directives into genSystemInstruction and validatorSystemInstruction
code = code.replace(
    "MICROSTOCK ALGORITHMIC SEO & DISCOVERABILITY RULES:",
    indexing_directives + "\nMICROSTOCK ALGORITHMIC SEO & DISCOVERABILITY RULES:"
)

# 3. Ensure ensureKeywordCount uses sanitizeForIndexing
code = code.replace(
    "const clean = k.toLowerCase().replace(/[^a-z0-9\\s-]/g, '').replace(/\\s+/g, ' ').trim();",
    "const clean = sanitizeForIndexing(k);"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("update_indexing_optimization.py executed successfully!")
