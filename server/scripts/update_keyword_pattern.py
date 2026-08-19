import re

file_path = "/data/metazo/MetaZo-Update--main/server/gemini.ts"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# ============================================================================
# 1. REPLACE rankAndWeightKeywords WITH 9-STAGE STRUCTURED PATTERN
# ============================================================================
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

new_rank_func = """/**
 * METAZO 9-STAGE STRUCTURED KEYWORD PATTERN (SEO-Friendly for Adobe Stock Indexing):
 * [Exact Main Subject] -> [Specific Attributes] -> [Action] -> [Concept] ->
 * [Context] -> [Technique] -> [Industry] -> [Use Case] -> [Composition]
 *
 * Setiap kata kunci dikelompokkan ke dalam 9 tahap struktural berdasarkan
 * kedekatan semantik dengan setiap kategori. Urutan ini dirancang untuk
 * memaksimalkan bobot SEO di Adobe Stock, Shutterstock, dan marketplace lainnya.
 */
function rankAndWeightKeywords(keywords: string[], tiers: TieredVisualAnalysis, title?: string): string[] {
  if (keywords.length === 0) return keywords;

  const lower = (s: string) => s.toLowerCase().trim();

  // Ekstrak elemen visual dari tiers
  const primarySubjects = tiers.objects
    .filter(o => o.tier === 'primary')
    .map(o => lower(o.name));
  const allSubjects = tiers.objects.map(o => lower(o.name));
  const attributes = tiers.attributes.map(a => lower(String(a)));
  const scene = tiers.scene.map(s => lower(String(s)));
  const concepts = tiers.concepts.map(c => lower(String(c)));

  // --- Stage classification helpers ---
  const matchesSubject = (kw: string): boolean =>
    allSubjects.some(s => s.includes(kw) || kw.includes(s));

  const matchesAttribute = (kw: string): boolean =>
    attributes.some(a => kw.includes(a) || a.includes(kw));

  const matchesScene = (kw: string): boolean =>
    scene.some(s => kw.includes(s) || s.includes(kw));

  const matchesConcept = (kw: string): boolean =>
    concepts.some(c => kw.includes(c) || c.includes(kw));

  // Action verbs (gerakan / aksi)
  const ACTION_TERMS = new Set([
    'running', 'walking', 'jumping', 'sitting', 'standing', 'flying', 'swimming',
    'dancing', 'holding', 'reaching', 'lifting', 'working', 'typing', 'driving',
    'reading', 'writing', 'cooking', 'eating', 'drinking', 'sleeping', 'talking',
    'laughing', 'smiling', 'looking', 'watching', 'listening', 'thinking',
    'playing', 'climbing', 'falling', 'floating', 'rising', 'flowing', 'moving',
    'growing', 'blooming', 'shining', 'glowing', 'reflecting', 'spinning',
    'exercise', 'workout', 'yoga', 'meditation', 'training', 'practice',
    'traveling', 'exploring', 'hiking', 'surfing', 'cycling', 'commuting'
  ]);

  const isAction = (kw: string): boolean => {
    const w = lower(kw);
    if (ACTION_TERMS.has(w)) return true;
    return Array.from(ACTION_TERMS).some(a => w.includes(a) || a.includes(w));
  };

  // Technique / style terms
  const TECHNIQUE_TERMS = new Set([
    'watercolor', 'oil painting', 'sketch', 'line art', 'vector', 'flat design',
    '3d render', 'cinematic', 'macro', 'close-up', 'wide shot', 'aerial view',
    'drone shot', 'long exposure', 'bokeh', 'depth of field', 'grainy', 'vintage',
    'retro', 'minimalist', 'abstract', 'geometric', 'isometric', 'gradient',
    'monochrome', 'black and white', 'sepia', 'duotone', 'vibrant', 'pastel',
    'high contrast', 'soft focus', 'flat lay', 'top view', 'panoramic',
    'portrait orientation', 'landscape orientation', 'square format',
    'high key', 'low key', 'rim lighting', 'backlit', 'silhouette', 'shadow play',
    'golden hour', 'blue hour', 'night', 'daylight', 'natural light', 'studio light'
  ]);

  const isTechnique = (kw: string): boolean => {
    const w = lower(kw);
    if (TECHNIQUE_TERMS.has(w)) return true;
    return Array.from(TECHNIQUE_TERMS).some(t => w.includes(t) || t.includes(w));
  };

  // Industry terms
  const INDUSTRY_TERMS = new Set([
    'healthcare', 'medical', 'technology', 'fintech', 'finance', 'education',
    'marketing', 'advertising', 'real estate', 'hospitality', 'food industry',
    'fashion', 'beauty', 'fitness', 'wellness', 'automotive', 'construction',
    'agriculture', 'manufacturing', 'retail', 'e-commerce', 'entertainment',
    'media', 'publishing', 'legal', 'insurance', 'travel', 'tourism',
    'sustainability', 'green energy', 'renewable', 'corporate', 'startup',
    'nonprofit', 'government', 'transportation', 'logistics', 'science', 'research'
  ]);

  const isIndustry = (kw: string): boolean => {
    const w = lower(kw);
    if (INDUSTRY_TERMS.has(w)) return true;
    return Array.from(INDUSTRY_TERMS).some(ind => w.includes(ind) || ind.includes(w));
  };

  // Use Case terms
  const USECASE_TERMS = new Set([
    'banner', 'landing page', 'presentation', 'brochure', 'flyer', 'poster',
    'social media', 'instagram', 'facebook', 'website', 'blog', 'magazine',
    'newsletter', 'annual report', 'billboard', 'packaging', 'product label',
    'app design', 'ui design', 'wallpaper', 'background', 'cover photo',
    'header', 'thumbnail', 'icon', 'logo', 'infographic', 'editorial',
    'commercial', 'advertisement', 'promo', 'catalog', 'menu', 'invitation',
    'greeting card', 'calendar', 'textbook', 'wall art', 'canvas print',
    'copy space', 'text space', 'isolated', 'template', 'mockup'
  ]);

  const isUseCase = (kw: string): boolean => {
    const w = lower(kw);
    if (USECASE_TERMS.has(w)) return true;
    return Array.from(USECASE_TERMS).some(u => w.includes(u) || u.includes(w));
  };

  // Composition terms
  const COMPOSITION_TERMS = new Set([
    'rule of thirds', 'symmetry', 'asymmetry', 'leading lines', 'diagonal',
    'framing', 'negative space', 'positive space', 'foreground', 'background',
    'midground', 'layered', 'depth', 'perspective', 'vanishing point',
    'balanced', 'unbalanced', 'centered', 'off-center', 'isolated subject',
    'group composition', 'single object', 'pattern', 'texture', 'repetition',
    'contrast', 'harmony', 'minimal', 'clean', 'uncluttered', 'cluttered',
    'spacious', 'tight crop', 'full frame', 'environmental portrait'
  ]);

  const isComposition = (kw: string): boolean => {
    const w = lower(kw);
    if (COMPOSITION_TERMS.has(w)) return true;
    return Array.from(COMPOSITION_TERMS).some(c => w.includes(c) || c.includes(w));
  };

  // --- Classify each keyword into stage buckets ---
  const stages: { stage: number; label: string; items: string[] }[] = [
    { stage: 1, label: 'Exact Main Subject', items: [] },
    { stage: 2, label: 'Specific Attributes', items: [] },
    { stage: 3, label: 'Action', items: [] },
    { stage: 4, label: 'Concept', items: [] },
    { stage: 5, label: 'Context', items: [] },
    { stage: 6, label: 'Technique', items: [] },
    { stage: 7, label: 'Industry', items: [] },
    { stage: 8, label: 'Use Case', items: [] },
    { stage: 9, label: 'Composition', items: [] },
  ];

  const seen = new Set<string>();

  for (const kw of keywords) {
    const k = lower(kw);
    if (!k || k.length < 2 || seen.has(k)) continue;
    seen.add(k);

    // STAGE 1: Exact Main Subject
    if (primarySubjects.some(s => s === k || k === s)) {
      stages[0].items.push(kw);
      continue;
    }
    if (matchesSubject(k) && allSubjects.length > 0) {
      stages[0].items.push(kw);
      continue;
    }

    // STAGE 2: Specific Attributes (warna, ukuran, material, sifat fisik)
    if (matchesAttribute(k)) {
      stages[1].items.push(kw);
      continue;
    }

    // STAGE 3: Action
    if (isAction(k)) {
      stages[2].items.push(kw);
      continue;
    }

    // STAGE 4: Concept (emosi, ide, metafora, tema abstrak)
    if (matchesConcept(k)) {
      stages[3].items.push(kw);
      continue;
    }

    // STAGE 5: Context (lingkungan, setting, suasana, lokasi)
    if (matchesScene(k)) {
      stages[4].items.push(kw);
      continue;
    }

    // STAGE 6: Technique
    if (isTechnique(k)) {
      stages[5].items.push(kw);
      continue;
    }

    // STAGE 7: Industry
    if (isIndustry(k)) {
      stages[6].items.push(kw);
      continue;
    }

    // STAGE 8: Use Case
    if (isUseCase(k)) {
      stages[7].items.push(kw);
      continue;
    }

    // STAGE 9: Composition
    if (isComposition(k)) {
      stages[8].items.push(kw);
      continue;
    }

    // Fallback: assign to most semantically relevant stage
    // Shorter / noun-like -> Stage 1 or 2; longer phrases -> stage 4 or 5
    const words = k.split(/\s+/).length;
    if (words === 1) {
      // Single word: likely an attribute or subject synonym
      stages[1].items.push(kw);
    } else if (words === 2) {
      stages[3].items.push(kw);
    } else {
      stages[4].items.push(kw);
    }
  }

  // --- Build final ordered keyword list ---
  const result: string[] = [];
  for (const stage of stages) {
    result.push(...stage.items);
  }

  // Ensure Keyword #1 is EXACT MAIN SUBJECT
  if (primarySubjects.length > 0 && result.length > 0) {
    const mainSubj = primarySubjects[0];
    const idx = result.findIndex(k => lower(k) === mainSubj || lower(k).includes(mainSubj) || mainSubj.includes(lower(k)));
    if (idx > 0) {
      const [main] = result.splice(idx, 1);
      result.unshift(main);
    } else if (idx === -1 && mainSubj.length > 1) {
      result.unshift(mainSubj);
    }
  }

  return result;
}"""

if old_rank_func in code:
    code = code.replace(old_rank_func, new_rank_func)

# ============================================================================
# 2. REPLACE ALL 9-STAGE KEYWORD PROMPT INSTRUCTIONS IN genSystemInstruction
#    (3 occurrence patterns: mixed, single, multi keyword modes)
# ============================================================================

# Replace the "CRITICAL KEYWORD STRUCTURE & ORDER" section with the 9-stage pattern
old_structure_rule = """11. CRITICAL KEYWORD STRUCTURE & ORDER (proportionally scaled to the requested target count ${targetCount}):
    - Keywords 1 to ${Math.max(1, Math.round(targetCount * 0.15))}: Primary Subject Synonyms & Core Concepts
    - Keywords ${Math.max(1, Math.round(targetCount * 0.15)) + 1} to ${Math.max(2, Math.round(targetCount * 0.35))}: Technical Terms, Direct Subject SEO Variations, Popular Industry Synonyms
    - Keywords ${Math.max(2, Math.round(targetCount * 0.35)) + 1} to ${Math.max(3, Math.round(targetCount * 0.55))}: Cultural or Atmospheric Associations, Ambient & Conceptual Descriptors, Contextual Backdrop Terms
    - Keywords ${Math.max(3, Math.round(targetCount * 0.55)) + 1} to ${Math.max(4, Math.round(targetCount * 0.75))}: Action, Commercial Utility, Functional Business Applications
    - Keywords ${Math.max(4, Math.round(targetCount * 0.75)) + 1} to ${targetCount}: Psychological Metaphors, Emotional/Conceptual Keywords, Symbolic Representations, Advanced Market Categories.
    NOTE: DO NOT pad with irrelevant keywords just to reach the target count. All keywords must be highly relevant to the asset."""

new_structure_rule = """11. CRITICAL 9-STAGE STRUCTURED KEYWORD PATTERN (STRICT SEO ORDER — Adobe Stock Indexing Algorithm):
    Every keyword MUST be placed in this EXACT structural order. The pattern is:
    [Exact Main Subject] -> [Specific Attributes] -> [Action] -> [Concept] -> [Context] -> [Technique] -> [Industry] -> [Use Case] -> [Composition]

    STAGE 1 — EXACT MAIN SUBJECT (Keywords ~1 to ~5):
    The core visual subject noun(s). What is the buyer actually searching for?
    Examples: 'cat', 'vintage car', 'borobudur temple', 'coffee cup', 'laptop', 'rose flower', 'office building', 'guitar', 'sunset beach', 'puppy'.
    These MUST be the first keywords a buyer types into the Adobe Stock search bar.

    STAGE 2 — SPECIFIC ATTRIBUTES (Keywords ~6 to ~10):
    Distinct physical traits of the main subject: material, texture, color family, size, shape, condition, distinctive features.
    Examples: 'wooden', 'metallic', 'glossy', 'matte', 'rough texture', 'smooth', 'curved', 'rectangular', 'round', 'transparent', 'opaque', 'worn', 'polished', 'rustic', 'modern design'.

    STAGE 3 — ACTION (Keywords ~11 to ~15):
    What is the subject actively doing OR what action is happening in the scene?
    Examples: 'running', 'jumping', 'sitting', 'flying', 'swimming', 'working', 'typing', 'cooking', 'dancing', 'reading', 'driving', 'holding', 'reaching', 'talking', 'laughing'.

    STAGE 4 — CONCEPT (Keywords ~16 to ~20):
    Abstract ideas, emotions, metaphors, or themes represented in the asset.
    Examples: 'freedom', 'success', 'innovation', 'growth', 'peace', 'love', 'teamwork', 'leadership', 'happiness', 'focus', 'creativity', 'sustainability', 'strength', 'balance', 'transformation'.

    STAGE 5 — CONTEXT (Keywords ~21 to ~25):
    Environment, setting, atmosphere, season, time of day, location, or weather.
    Examples: 'office', 'home', 'outdoors', 'urban', 'nature', 'beach', 'forest', 'mountain', 'studio', 'cafe', 'morning', 'sunset', 'golden hour', 'night scene', 'autumn season', 'rainy day'.

    STAGE 6 — TECHNIQUE (Keywords ~26 to ~30):
    Artistic style, visual technique, camera setup, lighting, or rendering method.
    Examples: 'macro', 'close-up', 'aerial view', 'flat lay', 'top view', 'watercolor', 'line art', '3d render', 'cinematic', 'bokeh', 'depth of field', 'natural light', 'studio lighting', 'golden hour light', 'minimalist style'.

    STAGE 7 — INDUSTRY (Keywords ~31 to ~35):
    Target industry, professional sector, or market where this asset is most usable.
    Examples: 'healthcare', 'technology', 'finance', 'education', 'marketing', 'real estate', 'hospitality', 'fashion', 'fitness', 'wellness', 'travel', 'food industry', 'corporate', 'startup', 'e-commerce'.

    STAGE 8 — USE CASE (Keywords ~36 to ~40):
    Where and how the buyer will use the asset — commercial applications, media formats, or design contexts.
    Examples: 'banner', 'landing page', 'presentation', 'social media', 'website', 'brochure', 'poster', 'magazine', 'blog', 'newsletter', 'advertisement', 'packaging', 'cover photo', 'header', 'copy space'.

    STAGE 9 — COMPOSITION (Keywords ~41 to ~49):
    Visual layout, framing, spatial arrangement, and design principles used in the image.
    Examples: 'rule of thirds', 'symmetry', 'negative space', 'isolated subject', 'centered', 'off-center', 'layered', 'depth', 'perspective', 'minimal', 'clean', 'uncluttered', 'spacious', 'framing', 'leading lines'.

    STRICT RELEVANCE RULE: Every single keyword MUST be 100% visible in or directly related to the actual visual content. NEVER add keywords just to fill a stage. If a stage has genuinely zero relevant terms, skip it. Quality over quantity ALWAYS."""

code = code.replace(old_structure_rule, new_structure_rule)

# ============================================================================
# 3. ADD "MUST BE RELEVANT TO ASSET" AS TOP PRIORITY IN PROMPT
# ============================================================================

# Add a STRICT RELEVANCE RULE at the very top of keyword rules
old_top_keywords = "TOP 10 KEYWORDS MUST (PRIORITY OVER ALL OTHER RULES):"
new_top_keywords = """TOP 10 KEYWORDS MUST (PRIORITY OVER ALL OTHER RULES):
MUST-0. 100% VISUAL RELEVANCE: Every single keyword MUST be visible in or directly derived from the actual visual asset. If a keyword is not literally visible or conceptually tied to the scene, DO NOT include it. Buyer trust and Adobe Stock curation depend on accurate, truthful keywords. NO HALLUCINATED TERMS."""

code = code.replace(old_top_keywords, new_top_keywords)

# Also add to generateBatchStockMetadata's genSystemInstruction (second occurrence)
# Find and replace the second occurrence too
count = 0
pos = 0
while True:
    pos = code.find(old_top_keywords, pos)
    if pos == -1:
        break
    count += 1
    pos += len(new_top_keywords)  # Skip past the already-replaced one
    if count > 2:
        break

# ============================================================================
# 4. ENSURE ensureKeywordCount respects the 9-stage pattern
# ============================================================================

old_ensure_keyword = """function ensureKeywordCount(
  keywords: string[],
  targetCount: number,
  visualFacts: any,
  title?: string,
  description?: string,
  categoryId?: number,
  keywordMode?: 'mixed' | 'single' | 'multi'
): string[] {"""

new_ensure_keyword = """function ensureKeywordCount(
  keywords: string[],
  targetCount: number,
  visualFacts: any,
  title?: string,
  description?: string,
  categoryId?: number,
  keywordMode?: 'mixed' | 'single' | 'multi'
): string[] {
  // STRICT RELEVANCE FILTER: Only keep keywords with direct visual connection.
  // Keywords that don't match any detected visual element are discarded."""

if old_ensure_keyword in code:
    code = code.replace(old_ensure_keyword, new_ensure_keyword)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("update_keyword_pattern.py executed successfully!")
