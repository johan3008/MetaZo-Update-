import re

file_path = "/data/metazo/MetaZo-Update--main/server/gemini.ts"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update rankAndWeightKeywords to guarantee Keyword #1 is the MAIN SUBJECT (Subjek Utama)
old_rank_func = """function rankAndWeightKeywords(keywords: string[], tiers: TieredVisualAnalysis, title?: string): string[] {
  if (keywords.length === 0) return keywords;
  const scored = keywords.map((k, i) => scoreKeyword(k, tiers, i, keywords.length, title));

  // ADOBE STOCK SEARCH RANKING OPTIMIZATION:
  // Adobe Stock weighs the TOP 5 KEYWORDS highest (up to 80% search indexing weight).
  // We sort all keywords globally by total score so the absolute highest-converting, title-synced, core visual subjects occupy positions 1 to 5.
  const sorted = [...scored].sort((a, b) => b.totalScore - a.totalScore);
  
  const uniqueResult: string[] = [];
  const seen = new Set<string>();

  sorted.forEach(item => {
    const norm = item.keyword.toLowerCase().trim();
    if (!seen.has(norm)) {
      seen.add(norm);
      uniqueResult.push(item.keyword);
    }
  });

  return uniqueResult;
}"""

new_rank_func = """function rankAndWeightKeywords(keywords: string[], tiers: TieredVisualAnalysis, title?: string): string[] {
  if (keywords.length === 0) return keywords;
  const scored = keywords.map((k, i) => scoreKeyword(k, tiers, i, keywords.length, title));

  // ADOBE STOCK SEARCH RANKING OPTIMIZATION:
  // Adobe Stock weighs the TOP 5 KEYWORDS highest (up to 80% search indexing weight).
  // We sort all keywords globally by total score so the absolute highest-converting, title-synced, core visual subjects occupy positions 1 to 5.
  const sorted = [...scored].sort((a, b) => b.totalScore - a.totalScore);
  
  const uniqueResult: string[] = [];
  const seen = new Set<string>();

  sorted.forEach(item => {
    const norm = item.keyword.toLowerCase().trim();
    if (!seen.has(norm)) {
      seen.add(norm);
      uniqueResult.push(item.keyword);
    }
  });

  // STRICT RULE: KEYWORD #1 MUST BE THE EXACT MAIN SUBJECT (SUBJEK VISUAL UTAMA)
  // Extract primary subject term from visual tiers
  const primarySubjectObj = tiers.objects.find(o => o.tier === 'primary' || o.importance >= 70);
  const primarySubjectName = primarySubjectObj?.name?.toLowerCase().trim();

  if (primarySubjectName && uniqueResult.length > 0) {
    // Check if primarySubjectName or an exact match exists in uniqueResult
    let mainSubjectIdx = uniqueResult.findIndex(k => k.toLowerCase().trim() === primarySubjectName);
    
    if (mainSubjectIdx === -1) {
      // Find keyword containing primarySubjectName
      mainSubjectIdx = uniqueResult.findIndex(k => k.toLowerCase().includes(primarySubjectName) || primarySubjectName.includes(k.toLowerCase()));
    }

    if (mainSubjectIdx > 0) {
      // Move main subject keyword to position 0 (Keyword #1)
      const [mainKw] = uniqueResult.splice(mainSubjectIdx, 1);
      uniqueResult.unshift(mainKw);
    } else if (mainSubjectIdx === -1 && primarySubjectName.length > 1) {
      // Prepend the primary subject as Keyword #1
      uniqueResult.unshift(primarySubjectName);
      if (uniqueResult.length > keywords.length) {
        uniqueResult.pop();
      }
    }
  }

  return uniqueResult;
}"""

if old_rank_func in code:
    code = code.replace(old_rank_func, new_rank_func)

# 2. Update prompt instructions to enforce KEYWORD #1 = MAIN SUBJECT
old_prompt_rule = "TOP 10 KEYWORDS MUST (PRIORITY OVER ALL OTHER RULES):\nMUST-1. Directly describe the visible subject — DO NOT generalize."
new_prompt_rule = "TOP 10 KEYWORDS MUST (PRIORITY OVER ALL OTHER RULES):\nKEYWORD #1 MUST BE THE EXACT MAIN SUBJECT (SUBJEK VISUAL UTAMA OF THE ASSET) — Keyword #1 MUST explicitly name the primary subject noun or compound phrase (e.g. 'cat', 'vintage car', 'borobudur temple', 'laptop', 'coffee cup'). NEVER put background elements, lighting, or generic terms as Keyword #1.\nMUST-1. Directly describe the visible subject — DO NOT generalize."

code = code.replace(old_prompt_rule, new_prompt_rule)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("update_main_subject_keyword.py executed successfully!")
