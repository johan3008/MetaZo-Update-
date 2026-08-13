file_path = "/data/metazo/MetaZo-Update--main/server/gemini.ts"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# ============================================================================
# 1. REPLACE rankAndWeightKeywords - SIMPLE, NATURAL, SCORE-BASED (NO PATTERN)
# ============================================================================

old_rank_start = "/**\n * METAZO 9-STAGE STRUCTURED KEYWORD PATTERN"

pos = code.find(old_rank_start)
if pos == -1:
    print("ERROR: Could not find rank function start")
else:
    end = code.find("\n// ---- LAPISAN 4:", pos)
    if end == -1:
        print("ERROR: Could not find rank function end")
    else:
        new_rank = """function rankAndWeightKeywords(keywords: string[], tiers: TieredVisualAnalysis, title?: string): string[] {
  if (keywords.length === 0) return keywords;
  const scored = keywords.map((k, i) => scoreKeyword(k, tiers, i, keywords.length, title));

  // Sort by total relevance score - highest first
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

  // KEYWORD #1 MUST BE MAIN SUBJECT
  const primarySubjectObj = tiers.objects.find(o => o.tier === "primary" || o.importance >= 70);
  const primarySubjectName = primarySubjectObj?.name?.toLowerCase().trim();

  if (primarySubjectName && uniqueResult.length > 0) {
    let mainSubjectIdx = uniqueResult.findIndex(k => k.toLowerCase().trim() === primarySubjectName);
    if (mainSubjectIdx === -1) {
      mainSubjectIdx = uniqueResult.findIndex(k => k.toLowerCase().includes(primarySubjectName) || primarySubjectName.includes(k.toLowerCase()));
    }
    if (mainSubjectIdx > 0) {
      const [mainKw] = uniqueResult.splice(mainSubjectIdx, 1);
      uniqueResult.unshift(mainKw);
    } else if (mainSubjectIdx === -1 && primarySubjectName.length > 1) {
      uniqueResult.unshift(primarySubjectName);
      if (uniqueResult.length > keywords.length) uniqueResult.pop();
    }
  }

  return uniqueResult;
}

"""
        code = code[:pos] + new_rank + code[end:]

# ============================================================================
# 2. REPLACE 9-STAGE PATTERN INSTRUCTIONS WITH SIMPLE SEO RULES
# ============================================================================

old_stage = "11. CRITICAL 9-STAGE STRUCTURED KEYWORD PATTERN"

while old_stage in code:
    pos = code.find(old_stage)
    # Find closing boundary
    end = code.find("12. PROHIBITED TERMS RULE", pos)
    if end == -1:
        end = code.find("\n  const noMediaFormatRule", pos)
    if end == -1:
        end = code.find("\n12. PROHIBITED", pos)
    if end == -1:
        print("WARNING: could not find end boundary at pos", pos)
        break

    new_rule = """11. SEO-FRIENDLY KEYWORD ORDER (Adobe Stock Search Algorithm):
    - Urutkan keyword dari yang paling deskriptif & relevan ke yang paling umum.
    - Keyword #1 WAJIB subjek visual utama.
    - Setelah itu, urutkan secara alami: deskripsi spesifik -> aksi -> konteks -> konsep -> industri -> use case.
    - Jangan paksakan pola kaku. Biarkan relevansi dan maksud pencarian buyer yang memandu urutan.
    - Setiap keyword HARUS 100% relevan dengan konten visual aset."""

    code = code[:pos] + new_rule + code[end:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("revert_pattern.py executed successfully!")
