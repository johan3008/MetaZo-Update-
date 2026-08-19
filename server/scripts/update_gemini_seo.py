import re

file_path = "/data/metazo/MetaZo-Update--main/server/gemini.ts"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Enrich COMMERCIAL_INTENT_TERMS
old_commercial = """const COMMERCIAL_INTENT_TERMS = new Set([
  'business', 'concept', 'technology', 'background', 'growth', 'success',
  'strategy', 'innovation', 'sustainability', 'health', 'finance', 'education',
  'marketing', 'vector', 'illustration', 'design', 'modern', 'banner',
  'template', 'corporate', 'isolated', 'copy space', 'copyspace', 'flatlay'
]);"""

new_commercial = """const COMMERCIAL_INTENT_TERMS = new Set([
  'business', 'concept', 'technology', 'background', 'growth', 'success',
  'strategy', 'innovation', 'sustainability', 'health', 'finance', 'education',
  'marketing', 'vector', 'illustration', 'design', 'modern', 'banner',
  'template', 'corporate', 'isolated', 'copy space', 'copyspace', 'flatlay',
  'landing page', 'top view', 'minimalist', 'abstract', 'pattern', 'element',
  'symbol', 'sign', 'icon', 'graphic', 'presentation', 'advertisement', 'promo',
  'ecommerce', 'e-commerce', 'fintech', 'ai technology', 'artificial intelligence',
  'digital marketing', 'green energy', 'clean energy', 'teamwork', 'partnership',
  'leadership', 'financial growth', 'data analysis', 'cybersecurity', 'workflow',
  'wellbeing', 'wellness', 'lifestyle', 'healthcare', 'medical', 'real estate'
]);"""

if old_commercial in code:
    code = code.replace(old_commercial, new_commercial)
else:
    print("COMMERCIAL_INTENT_TERMS exact match not found, using regex substitution")
    code = re.sub(
        r"const COMMERCIAL_INTENT_TERMS = new Set\(\[\s*[^\]]+\s*\]\);",
        new_commercial,
        code
    )

# 2. Enrich SYNONYM_MAP
old_syn = """const SYNONYM_MAP: Record<string, string[]> = {
  'car': ['automobile', 'vehicle'], 'phone': ['smartphone', 'mobile device'], 'lift': ['elevator'],
  'sidewalk': ['pavement'], 'doctor': ['physician'], 'shop': ['store', 'retail outlet'],
  'big': ['large'], 'small': ['compact'], 'old': ['aged', 'vintage'], 'new': ['modern', 'contemporary'],
  'work': ['job', 'career'], 'home': ['house', 'residence'], 'city': ['urban', 'metropolitan'],
  'nature': ['natural', 'outdoors'], 'food': ['cuisine', 'meal'], 'money': ['finance', 'currency'],
  'idea': ['concept', 'notion'], 'fast': ['quick', 'rapid'], 'happy': ['joyful', 'cheerful']
};"""

new_syn = """const SYNONYM_MAP: Record<string, string[]> = {
  'car': ['automobile', 'vehicle', 'automotive'],
  'phone': ['smartphone', 'mobile phone', 'cellular phone', 'mobile device'],
  'lift': ['elevator'],
  'sidewalk': ['pavement', 'walkway'],
  'doctor': ['physician', 'healthcare worker', 'medical professional'],
  'shop': ['store', 'retail outlet', 'boutique'],
  'computer': ['laptop', 'pc', 'workstation', 'digital device'],
  'big': ['large', 'huge', 'massive'],
  'small': ['compact', 'miniature', 'tiny'],
  'old': ['aged', 'vintage', 'retro', 'antique'],
  'new': ['modern', 'contemporary', 'futuristic'],
  'work': ['job', 'career', 'employment', 'business'],
  'home': ['house', 'residence', 'residential'],
  'city': ['urban', 'metropolitan', 'downtown'],
  'nature': ['natural', 'outdoors', 'environment', 'eco'],
  'food': ['cuisine', 'meal', 'dish', 'refreshment'],
  'money': ['finance', 'currency', 'capital', 'wealth', 'cash'],
  'idea': ['concept', 'notion', 'thought', 'solution'],
  'fast': ['quick', 'rapid', 'speedy', 'express'],
  'happy': ['joyful', 'cheerful', 'delighted', 'smiling'],
  'autumn': ['fall', 'autumnal'],
  'fall': ['autumn', 'autumnal'],
  'trolley': ['shopping cart', 'cart'],
  'subway': ['underground', 'metro', 'transit'],
  'trash': ['garbage', 'rubbish', 'waste'],
  'copyspace': ['copy space', 'text space', 'blank space']
};"""

if old_syn in code:
    code = code.replace(old_syn, new_syn)

# 3. Update scoreKeyword & rankAndWeightKeywords
old_score_func = """function scoreKeyword(keyword: string, tiers: TieredVisualAnalysis, position: number, total: number): KeywordScore {
  const lower = keyword.toLowerCase();
  const wordCount = lower.split(/\\s+/).length;

  const objectMatch = tiers.objects.find(o => o.name.toLowerCase().includes(lower) || lower.includes(o.name.toLowerCase()));
  const attributeMatch = tiers.attributes.some(a => a.toLowerCase().includes(lower) || lower.includes(a.toLowerCase()));
  const visualScore = objectMatch ? Math.min(100, objectMatch.importance + 10) : (attributeMatch ? 60 : 25);

  const positionFactor = 1 - (position / Math.max(1, total));
  const seoScore = Math.round((wordCount <= 3 ? 70 : 40) * 0.6 + positionFactor * 40);

  const commercialScore = (COMMERCIAL_INTENT_TERMS.has(lower) || Array.from(COMMERCIAL_INTENT_TERMS).some(t => lower.includes(t))) ? 90 : 35;
  const trendScore = Array.from(TREND_TERMS).some(t => lower.includes(t)) ? 85 : 30;

  const totalScore = Math.round(visualScore * 0.4 + seoScore * 0.3 + commercialScore * 0.15 + trendScore * 0.15);

  return { keyword, seoScore, visualScore, commercialScore, trendScore, totalScore };
}"""

new_score_func = """function scoreKeyword(keyword: string, tiers: TieredVisualAnalysis, position: number, total: number, title?: string): KeywordScore {
  const lower = keyword.toLowerCase().trim();
  const wordCount = lower.split(/\\s+/).length;

  const objectMatch = tiers.objects.find(o => o.name.toLowerCase().includes(lower) || lower.includes(o.name.toLowerCase()));
  const attributeMatch = tiers.attributes.some(a => a.toLowerCase().includes(lower) || lower.includes(a.toLowerCase()));
  const visualScore = objectMatch ? Math.min(100, objectMatch.importance + 20) : (attributeMatch ? 70 : 30);

  const positionFactor = 1 - (position / Math.max(1, total));
  const seoScore = Math.round((wordCount >= 1 && wordCount <= 3 ? 85 : 40) * 0.6 + positionFactor * 40);

  const commercialScore = (COMMERCIAL_INTENT_TERMS.has(lower) || Array.from(COMMERCIAL_INTENT_TERMS).some(t => lower.includes(t))) ? 95 : 35;
  const trendScore = Array.from(TREND_TERMS).some(t => lower.includes(t)) ? 90 : 30;

  // Title-Keyword Synergy Bonus for Adobe Stock Ranking: Top keywords MUST align with main title words
  let titleBonus = 0;
  if (title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes(lower)) {
      titleBonus = 40;
    } else {
      const kwWords = lower.split(/\\s+/);
      const matchingWords = kwWords.filter(w => w.length > 2 && titleLower.includes(w));
      if (matchingWords.length > 0) {
        titleBonus = matchingWords.length * 15;
      }
    }
  }

  const totalScore = Math.round((visualScore * 0.35 + seoScore * 0.25 + commercialScore * 0.25 + trendScore * 0.15) + titleBonus);

  return { keyword, seoScore, visualScore, commercialScore, trendScore, totalScore };
}"""

if old_score_func in code:
    code = code.replace(old_score_func, new_score_func)

old_rank_func = """function rankAndWeightKeywords(keywords: string[], tiers: TieredVisualAnalysis): string[] {
  if (keywords.length === 0) return keywords;
  const scored = keywords.map((k, i) => scoreKeyword(k, tiers, i, keywords.length));

  const quintileSize = Math.max(1, Math.ceil(scored.length / 5));
  const result: string[] = [];
  for (let q = 0; q < 5; q++) {
    const slice = scored.slice(q * quintileSize, (q + 1) * quintileSize);
    slice.sort((a, b) => b.totalScore - a.totalScore);
    result.push(...slice.map(s => s.keyword));
  }
  return result;
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

  return uniqueResult;
}"""

if old_rank_func in code:
    code = code.replace(old_rank_func, new_rank_func)

# 4. Update callers of rankAndWeightKeywords in generateStockMetadata and generateBatchStockMetadata
code = code.replace(
    "data.keywords = rankAndWeightKeywords(data.keywords, tieredVisual);",
    "data.keywords = rankAndWeightKeywords(data.keywords, tieredVisual, data.title);"
)
code = code.replace(
    "metadata.keywords = rankAndWeightKeywords(metadata.keywords, tieredVisual);",
    "metadata.keywords = rankAndWeightKeywords(metadata.keywords, tieredVisual, metadata.title);"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("update_gemini_seo.py executed successfully!")
