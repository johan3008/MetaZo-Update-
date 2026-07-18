/**
 * MetaZo PRO - Microstock SEO Market Intelligence Engine
 * Provides data-driven analysis of search potential, keyword co-occurrence,
 * seasonal market trends, and real-time SEO scoring.
 */

export type SearchVolumeRating = 'HIGH' | 'MEDIUM' | 'LOW';

export interface KeywordInsight {
  keyword: string;
  volumeRating: SearchVolumeRating;
  searchIndex: number; // 0 to 100
  priorityScore: number; // 0 to 100
  categories: string[];
}

// 1. Comprehensive dictionary of high-volume microstock search keywords and their stats
export const MARKET_KEYWORDS_DICTIONARY: Record<string, Omit<KeywordInsight, 'keyword'>> = {
  // Business & Corporate
  'business': { volumeRating: 'HIGH', searchIndex: 98, priorityScore: 95, categories: ['Business', 'Concept'] },
  'office': { volumeRating: 'HIGH', searchIndex: 92, priorityScore: 90, categories: ['Business', 'Interior'] },
  'corporate': { volumeRating: 'HIGH', searchIndex: 88, priorityScore: 85, categories: ['Business'] },
  'team': { volumeRating: 'HIGH', searchIndex: 85, priorityScore: 82, categories: ['Business', 'People'] },
  'meeting': { volumeRating: 'HIGH', searchIndex: 82, priorityScore: 80, categories: ['Business', 'People'] },
  'success': { volumeRating: 'HIGH', searchIndex: 90, priorityScore: 88, categories: ['Concept'] },
  'strategy': { volumeRating: 'MEDIUM', searchIndex: 72, priorityScore: 70, categories: ['Business'] },
  'finance': { volumeRating: 'HIGH', searchIndex: 86, priorityScore: 84, categories: ['Business', 'Finance'] },
  'marketing': { volumeRating: 'HIGH', searchIndex: 89, priorityScore: 86, categories: ['Business'] },
  'colleague': { volumeRating: 'MEDIUM', searchIndex: 78, priorityScore: 75, categories: ['People', 'Business'] },
  'coworker': { volumeRating: 'MEDIUM', searchIndex: 74, priorityScore: 72, categories: ['People', 'Business'] },
  'workspace': { volumeRating: 'HIGH', searchIndex: 84, priorityScore: 82, categories: ['Business', 'Interior'] },
  'startup': { volumeRating: 'HIGH', searchIndex: 87, priorityScore: 85, categories: ['Business'] },

  // Food & Beverage
  'coffee': { volumeRating: 'HIGH', searchIndex: 96, priorityScore: 94, categories: ['Food', 'Lifestyle'] },
  'cafe': { volumeRating: 'HIGH', searchIndex: 89, priorityScore: 87, categories: ['Food', 'Travel'] },
  'cup': { volumeRating: 'HIGH', searchIndex: 82, priorityScore: 78, categories: ['Object'] },
  'morning': { volumeRating: 'HIGH', searchIndex: 91, priorityScore: 89, categories: ['Concept', 'Lifestyle'] },
  'breakfast': { volumeRating: 'HIGH', searchIndex: 85, priorityScore: 83, categories: ['Food', 'Lifestyle'] },
  'food': { volumeRating: 'HIGH', searchIndex: 97, priorityScore: 95, categories: ['Food'] },
  'delicious': { volumeRating: 'HIGH', searchIndex: 84, priorityScore: 80, categories: ['Food', 'Concept'] },
  'healthy': { volumeRating: 'HIGH', searchIndex: 93, priorityScore: 91, categories: ['Food', 'Lifestyle'] },
  'fresh': { volumeRating: 'HIGH', searchIndex: 92, priorityScore: 90, categories: ['Food', 'Nature'] },
  'gourmet': { volumeRating: 'MEDIUM', searchIndex: 76, priorityScore: 72, categories: ['Food'] },
  'cuisine': { volumeRating: 'MEDIUM', searchIndex: 78, priorityScore: 75, categories: ['Food'] },
  'cooking': { volumeRating: 'HIGH', searchIndex: 83, priorityScore: 80, categories: ['Food', 'Lifestyle'] },
  'plate': { volumeRating: 'MEDIUM', searchIndex: 70, priorityScore: 65, categories: ['Food', 'Object'] },
  'beverage': { volumeRating: 'MEDIUM', searchIndex: 72, priorityScore: 68, categories: ['Food'] },
  'tea': { volumeRating: 'HIGH', searchIndex: 84, priorityScore: 81, categories: ['Food'] },
  'drink': { volumeRating: 'HIGH', searchIndex: 88, priorityScore: 84, categories: ['Food'] },

  // Technology & Gadgets
  'laptop': { volumeRating: 'HIGH', searchIndex: 95, priorityScore: 93, categories: ['Tech', 'Business'] },
  'computer': { volumeRating: 'HIGH', searchIndex: 91, priorityScore: 88, categories: ['Tech', 'Business'] },
  'technology': { volumeRating: 'HIGH', searchIndex: 97, priorityScore: 94, categories: ['Tech'] },
  'smartphone': { volumeRating: 'HIGH', searchIndex: 96, priorityScore: 94, categories: ['Tech', 'Lifestyle'] },
  'mobile': { volumeRating: 'HIGH', searchIndex: 92, priorityScore: 89, categories: ['Tech'] },
  'device': { volumeRating: 'MEDIUM', searchIndex: 79, priorityScore: 75, categories: ['Tech'] },
  'internet': { volumeRating: 'HIGH', searchIndex: 91, priorityScore: 88, categories: ['Tech'] },
  'digital': { volumeRating: 'HIGH', searchIndex: 93, priorityScore: 91, categories: ['Tech', 'Concept'] },
  'screen': { volumeRating: 'MEDIUM', searchIndex: 77, priorityScore: 73, categories: ['Tech', 'Object'] },
  'ai': { volumeRating: 'HIGH', searchIndex: 99, priorityScore: 98, categories: ['Tech', 'Concept'] },
  'software': { volumeRating: 'HIGH', searchIndex: 86, priorityScore: 83, categories: ['Tech', 'Business'] },
  'artificial intelligence': { volumeRating: 'HIGH', searchIndex: 95, priorityScore: 92, categories: ['Tech'] },

  // Lifestyle & Wellness
  'lifestyle': { volumeRating: 'HIGH', searchIndex: 94, priorityScore: 92, categories: ['Lifestyle'] },
  'healthy lifestyle': { volumeRating: 'HIGH', searchIndex: 89, priorityScore: 87, categories: ['Lifestyle', 'Fitness'] },
  'fitness': { volumeRating: 'HIGH', searchIndex: 91, priorityScore: 89, categories: ['Fitness', 'Lifestyle'] },
  'workout': { volumeRating: 'HIGH', searchIndex: 88, priorityScore: 85, categories: ['Fitness', 'Lifestyle'] },
  'gym': { volumeRating: 'HIGH', searchIndex: 86, priorityScore: 83, categories: ['Fitness', 'Interior'] },
  'active': { volumeRating: 'HIGH', searchIndex: 84, priorityScore: 81, categories: ['Fitness', 'Lifestyle'] },
  'exercise': { volumeRating: 'HIGH', searchIndex: 87, priorityScore: 84, categories: ['Fitness'] },
  'wellness': { volumeRating: 'HIGH', searchIndex: 89, priorityScore: 87, categories: ['Lifestyle', 'Concept'] },
  'happy': { volumeRating: 'HIGH', searchIndex: 93, priorityScore: 91, categories: ['Concept', 'People'] },
  'smile': { volumeRating: 'HIGH', searchIndex: 88, priorityScore: 85, categories: ['People'] },
  'relax': { volumeRating: 'HIGH', searchIndex: 90, priorityScore: 88, categories: ['Concept', 'Lifestyle'] },
  'yoga': { volumeRating: 'HIGH', searchIndex: 85, priorityScore: 82, categories: ['Fitness', 'Lifestyle'] },

  // Travel & Adventure
  'travel': { volumeRating: 'HIGH', searchIndex: 96, priorityScore: 94, categories: ['Travel'] },
  'tourism': { volumeRating: 'HIGH', searchIndex: 88, priorityScore: 85, categories: ['Travel'] },
  'vacation': { volumeRating: 'HIGH', searchIndex: 93, priorityScore: 91, categories: ['Travel', 'Lifestyle'] },
  'adventure': { volumeRating: 'HIGH', searchIndex: 89, priorityScore: 86, categories: ['Travel', 'Nature'] },
  'explore': { volumeRating: 'MEDIUM', searchIndex: 78, priorityScore: 75, categories: ['Travel'] },
  'trip': { volumeRating: 'MEDIUM', searchIndex: 75, priorityScore: 72, categories: ['Travel'] },
  'destination': { volumeRating: 'MEDIUM', searchIndex: 79, priorityScore: 76, categories: ['Travel'] },
  'journey': { volumeRating: 'MEDIUM', searchIndex: 74, priorityScore: 70, categories: ['Travel', 'Concept'] },
  'summer': { volumeRating: 'HIGH', searchIndex: 97, priorityScore: 95, categories: ['Season', 'Travel'] },
  'beach': { volumeRating: 'HIGH', searchIndex: 95, priorityScore: 93, categories: ['Nature', 'Travel'] },
  'ocean': { volumeRating: 'HIGH', searchIndex: 91, priorityScore: 88, categories: ['Nature'] },
  'sea': { volumeRating: 'HIGH', searchIndex: 89, priorityScore: 86, categories: ['Nature'] },
  'island': { volumeRating: 'HIGH', searchIndex: 84, priorityScore: 80, categories: ['Nature', 'Travel'] },

  // Nature & Environment
  'nature': { volumeRating: 'HIGH', searchIndex: 98, priorityScore: 96, categories: ['Nature'] },
  'landscape': { volumeRating: 'HIGH', searchIndex: 92, priorityScore: 89, categories: ['Nature'] },
  'scenic': { volumeRating: 'HIGH', searchIndex: 85, priorityScore: 82, categories: ['Nature'] },
  'green': { volumeRating: 'HIGH', searchIndex: 88, priorityScore: 84, categories: ['Nature', 'Concept'] },
  'environment': { volumeRating: 'HIGH', searchIndex: 90, priorityScore: 88, categories: ['Nature', 'Concept'] },
  'eco': { volumeRating: 'HIGH', searchIndex: 87, priorityScore: 85, categories: ['Concept'] },
  'outdoor': { volumeRating: 'HIGH', searchIndex: 93, priorityScore: 90, categories: ['Nature'] },
  'forest': { volumeRating: 'HIGH', searchIndex: 88, priorityScore: 85, categories: ['Nature'] },
  'mountain': { volumeRating: 'HIGH', searchIndex: 89, priorityScore: 86, categories: ['Nature'] },
  'tree': { volumeRating: 'HIGH', searchIndex: 86, priorityScore: 82, categories: ['Nature'] },
  'sky': { volumeRating: 'HIGH', searchIndex: 93, priorityScore: 89, categories: ['Nature'] },
  'sunset': { volumeRating: 'HIGH', searchIndex: 94, priorityScore: 92, categories: ['Nature', 'Concept'] },
  'sunrise': { volumeRating: 'HIGH', searchIndex: 89, priorityScore: 87, categories: ['Nature', 'Concept'] },

  // Seasonal Events
  'christmas': { volumeRating: 'HIGH', searchIndex: 99, priorityScore: 98, categories: ['Season', 'Holiday'] },
  'ramadan': { volumeRating: 'HIGH', searchIndex: 95, priorityScore: 94, categories: ['Season', 'Holiday'] },
  'eid': { volumeRating: 'HIGH', searchIndex: 92, priorityScore: 91, categories: ['Season', 'Holiday'] },
  'halloween': { volumeRating: 'HIGH', searchIndex: 96, priorityScore: 95, categories: ['Season', 'Holiday'] },
  'back to school': { volumeRating: 'HIGH', searchIndex: 94, priorityScore: 93, categories: ['Season', 'Education'] },
  'school': { volumeRating: 'HIGH', searchIndex: 92, priorityScore: 89, categories: ['Education'] },
  'thanksgiving': { volumeRating: 'HIGH', searchIndex: 88, priorityScore: 85, categories: ['Season', 'Holiday'] },
  'easter': { volumeRating: 'HIGH', searchIndex: 86, priorityScore: 83, categories: ['Season', 'Holiday'] },
  'new year': { volumeRating: 'HIGH', searchIndex: 94, priorityScore: 92, categories: ['Season', 'Holiday'] },
  'holiday': { volumeRating: 'HIGH', searchIndex: 95, priorityScore: 93, categories: ['Holiday'] },
  'festive': { volumeRating: 'HIGH', searchIndex: 88, priorityScore: 85, categories: ['Holiday', 'Concept'] },
};

// 2. Co-occurrence (Hubungan antar-keyword) Dictionary
// Mapping a trigger keyword to other highly search-correlated terms.
export const CO_OCCURRENCE_MAP: Record<string, string[]> = {
  'coffee': ['morning', 'cafe', 'cup', 'breakfast', 'aroma', 'mug', 'caffeine', 'espresso', 'lifestyle', 'beans'],
  'business': ['corporate', 'office', 'team', 'success', 'strategy', 'finance', 'meeting', 'colleague', 'professional', 'startup'],
  'laptop': ['workspace', 'office', 'work', 'technology', 'computer', 'business', 'freelance', 'keyboard', 'screen', 'desk'],
  'christmas': ['holiday', 'festive', 'winter', 'celebration', 'decoration', 'snow', 'gifts', 'merry', 'xmas', 'lights', 'family'],
  'ramadan': ['eid', 'mubarak', 'muslim', 'mosque', 'fasting', 'crescent', 'prayer', 'islamic', 'lantern', 'iftar', 'holy month'],
  'eid': ['mubarak', 'ramadan', 'muslim', 'mosque', 'celebration', 'islamic', 'family', 'feast', 'traditional'],
  'halloween': ['spooky', 'pumpkin', 'autumn', 'scary', 'ghost', 'celebration', 'night', 'bat', 'witch', 'october', 'costume'],
  'school': ['education', 'learning', 'student', 'classroom', 'books', 'teacher', 'study', 'back to school', 'pencils', 'backpack'],
  'back to school': ['education', 'school', 'student', 'learning', 'classroom', 'books', 'supplies', 'pencils', 'backpack'],
  'fitness': ['healthy', 'workout', 'gym', 'exercise', 'active', 'athlete', 'training', 'wellness', 'muscles', 'sports'],
  'nature': ['outdoor', 'landscape', 'scenic', 'green', 'travel', 'environment', 'beautiful', 'forest', 'wildlife', 'trees'],
  'travel': ['tourism', 'vacation', 'adventure', 'explore', 'trip', 'destination', 'journey', 'luggage', 'passport', 'flight'],
  'food': ['delicious', 'fresh', 'healthy', 'gourmet', 'cuisine', 'cooking', 'plate', 'tasty', 'dish', 'dinner'],
  'sunset': ['sunrise', 'sky', 'beautiful', 'scenic', 'outdoor', 'nature', 'landscape', 'horizon', 'orange', 'dusk'],
  'startup': ['business', 'innovation', 'technology', 'finance', 'growth', 'creative', 'leadership', 'teamwork', 'modern'],
  'office': ['desk', 'chair', 'paperwork', 'employee', 'computer', 'work', 'corporate', 'meeting room', 'modern office'],
  'beach': ['summer', 'vacation', 'ocean', 'sand', 'sunshine', 'tropical', 'waves', 'travel', 'sea', 'relaxation'],
  'yoga': ['mindfulness', 'meditation', 'wellness', 'stretch', 'flexible', 'healthy', 'zen', 'relaxation', 'lifestyle'],
  'ai': ['artificial intelligence', 'future', 'robot', 'cyber', 'code', 'neural', 'brain', 'automation', 'tech', 'machine learning'],
  'finance': ['money', 'investment', 'economy', 'growth', 'savings', 'banking', 'wealth', 'stock market', 'analytics'],
};

// 3. Seasonal Market Events Calendar
export interface SeasonalEvent {
  id: string;
  name: string;
  nameIndo: string;
  months: number[]; // 0-indexed (0: Jan, 11: Dec)
  popularKeywords: string[];
  description: string;
  descriptionIndo: string;
  peakDemand: string;
  peakDemandIndo: string;
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'christmas',
    name: 'Christmas & New Year Celebration',
    nameIndo: 'Natal & Tahun Baru',
    months: [10, 11, 0], // Nov, Dec, Jan
    popularKeywords: ['christmas', 'holiday', 'winter', 'festive', 'celebration', 'gifts', 'decoration', 'family', 'merry', 'xmas', 'new year', 'santa claus', 'snowflakes', 'pine tree'],
    description: 'High commercial demand for shopping, family gatherings, greeting cards, winter vibes, and festive retail promotions.',
    descriptionIndo: 'Permintaan komersial tinggi untuk belanja, kumpul keluarga, kartu ucapan, nuansa musim dingin, dan promosi retail meriah.',
    peakDemand: 'October to December',
    peakDemandIndo: 'Oktober s.d. Desember'
  },
  {
    id: 'ramadan',
    name: 'Ramadan & Eid Mubarak',
    nameIndo: 'Ramadhan & Idul Fitri',
    months: [1, 2, 3, 4], // Feb to May (typically peaks in this range depending on lunar calendar)
    popularKeywords: ['ramadan', 'eid', 'mubarak', 'fasting', 'mosque', 'islamic', 'crescent', 'prayer', 'celebration', 'lanterns', 'family feast', 'iftar', 'muslim', 'arabesque', 'ketupat'],
    description: 'Immense regional demand in Southeast Asia and Middle East for Eid greeting cards, food/culinary assets, and family devotion scenes.',
    descriptionIndo: 'Permintaan regional sangat besar di Asia Tenggara & Timur Tengah untuk ucapan Lebaran, kuliner/makanan, dan kumpul keluarga muslim.',
    peakDemand: '2 months before Ramadan starts',
    peakDemandIndo: '2 bulan sebelum Ramadhan dimulai'
  },
  {
    id: 'halloween',
    name: 'Halloween Spooky Season',
    nameIndo: 'Musim Halloween',
    months: [8, 9, 10], // Sep, Oct, Nov
    popularKeywords: ['halloween', 'spooky', 'pumpkin', 'scary', 'witch', 'ghost', 'autumn', 'custom', 'dark', 'october', 'candy', 'haunted', 'black cat', 'bat'],
    description: 'Popular for party decorations, scary visual assets, promotional campaigns, costumes, and children theme contents.',
    descriptionIndo: 'Populer untuk dekorasi pesta, aset visual menyeramkan, kampanye promosi, kostum, dan tema rekreasi anak.',
    peakDemand: 'August to October',
    peakDemandIndo: 'Agustus s.d. Oktober'
  },
  {
    id: 'back_to_school',
    name: 'Back to School Campaign',
    nameIndo: 'Kampanye Kembali ke Sekolah',
    months: [5, 6, 7, 8], // Jun to Sep
    popularKeywords: ['back to school', 'education', 'school', 'student', 'learning', 'classroom', 'teacher', 'books', 'pencils', 'backpack', 'study', 'stationery', 'desk', 'college'],
    description: 'Core retail season for textbooks, stationary items, young students, parents shopping, online classes, and education tech.',
    descriptionIndo: 'Musim retail utama untuk buku, alat tulis, siswa muda, belanja orang tua, kelas online, dan teknologi edukasi.',
    peakDemand: 'June to August',
    peakDemandIndo: 'Juni s.d. Agustus'
  },
  {
    id: 'summer_holiday',
    name: 'Summer Vacation & Tourism',
    nameIndo: 'Liburan Musim Panas',
    months: [4, 5, 6, 7], // May to Aug
    popularKeywords: ['summer', 'beach', 'vacation', 'travel', 'sunshine', 'tropical', 'sea', 'ocean', 'holiday', 'active', 'tourism', 'swimming pool', 'island', 'traveler', 'bikini'],
    description: 'Massive searches for outdoor recreation, travel destinations, beach aesthetics, sun protection, adventure, and pool parties.',
    descriptionIndo: 'Pencarian besar-besaran untuk rekreasi luar ruangan, destinasi wisata, pantai tropis, petualangan, dan pesta kolam renang.',
    peakDemand: 'April to July',
    peakDemandIndo: 'April s.d. Juli'
  },
  {
    id: 'spring_season',
    name: 'Spring Renewal & Easter',
    nameIndo: 'Musim Semi & Paskah',
    months: [2, 3, 4], // Mar, Apr, May
    popularKeywords: ['spring', 'flowers', 'nature', 'bloom', 'fresh', 'garden', 'green', 'easter', 'outdoor', 'blossom', 'tulips', 'easter egg', 'renewal', 'butterfly'],
    description: 'Aesthetic shift to bright pastel colors, blooming flora, gardening themes, Easter activities, and clean outdoor vibes.',
    descriptionIndo: 'Pergeseran estetika ke warna pastel cerah, bunga bermekaran, tema berkebun, aktivitas Paskah, dan nuansa bersih luar ruangan.',
    peakDemand: 'February to April',
    peakDemandIndo: 'Februari s.d. April'
  },
  {
    id: 'autumn_thanksgiving',
    name: 'Autumn Harvest & Thanksgiving',
    nameIndo: 'Musim Gugur & Thanksgiving',
    months: [8, 9, 10], // Sep, Oct, Nov
    popularKeywords: ['autumn', 'leaves', 'fall', 'foliage', 'cozy', 'thanksgiving', 'harvest', 'orange', 'warm', 'sweater weather', 'pumpkin spice', 'turkey', 'maple', 'golden'],
    description: 'Warm color palettes, foliage landscapes, cozy interior concepts, Thanksgiving dinners, and harvest seasons.',
    descriptionIndo: 'Palet warna hangat, pemandangan daun gugur, konsep interior nyaman, makan malam Thanksgiving, dan musim panen.',
    peakDemand: 'August to November',
    peakDemandIndo: 'Agustus s.d. November'
  }
];

// 4. Algorithms to retrieve SEO insights based on current keywords & title
export interface SeoMetricsResult {
  score: number; // 0-100
  rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  ratingsColor: string;
  feedback: string[];
  feedbackIndo: string[];
  keywordInsights: KeywordInsight[];
  suggestedCoOccurrences: string[]; // Keywords to offer for addition
  relevantSeasonalEvents: SeasonalEvent[];
}

/**
 * Main parser to get complete real-time market data-driven SEO metrics
 */
export const analyzeAssetSeo = (
  title: string,
  keywords: string[]
): SeoMetricsResult => {
  const normalizedKws = keywords.map(k => k.toLowerCase().trim()).filter(Boolean);
  const titleLower = (title || '').toLowerCase().trim();

  // 1. Compute Individual Keyword Insights
  const keywordInsights: KeywordInsight[] = keywords.map(kw => {
    const norm = kw.toLowerCase().trim();
    const dictionaryData = MARKET_KEYWORDS_DICTIONARY[norm];

    if (dictionaryData) {
      return {
        keyword: kw,
        volumeRating: dictionaryData.volumeRating,
        searchIndex: dictionaryData.searchIndex,
        priorityScore: dictionaryData.priorityScore,
        categories: dictionaryData.categories
      };
    }

    // Heuristics for unknown keywords
    let volumeRating: SearchVolumeRating = 'LOW';
    let searchIndex = 30;
    let priorityScore = 40;

    // Give higher score to generic common single/double word terms
    if (norm.length > 2 && norm.length < 15 && !norm.includes(' ') && !/\d/.test(norm)) {
      volumeRating = 'MEDIUM';
      searchIndex = 55;
      priorityScore = 50;
    }

    return {
      keyword: kw,
      volumeRating,
      searchIndex,
      priorityScore,
      categories: ['Generic']
    };
  });

  // 2. Co-occurrence Logic (Hubungan antar-keyword)
  const coOccurrencesFound = new Set<string>();
  const coOccurrenceSuggestions: string[] = [];

  normalizedKws.forEach(kw => {
    const matches = CO_OCCURRENCE_MAP[kw];
    if (matches) {
      matches.forEach(m => {
        if (!normalizedKws.includes(m)) {
          coOccurrencesFound.add(m);
        }
      });
    }
  });

  // Also match co-occurrence from title words
  const titleWords = titleLower.split(/[^a-zA-Z0-9]/).map(w => w.trim()).filter(w => w.length > 3);
  titleWords.forEach(word => {
    const matches = CO_OCCURRENCE_MAP[word];
    if (matches) {
      matches.forEach(m => {
        if (!normalizedKws.includes(m)) {
          coOccurrencesFound.add(m);
        }
      });
    }
  });

  // Convert Set to array and slice top 10 unique recommendations
  Array.from(coOccurrencesFound).forEach(s => {
    coOccurrenceSuggestions.push(s);
  });

  // 3. Relevant Seasonal Events (based on current date and matching tags)
  const currentMonth = new Date().getMonth(); // 0-11
  const relevantSeasonalEvents = SEASONAL_EVENTS.filter(event => {
    // Check if current month matches event focus months
    const isCurrentSeason = event.months.includes(currentMonth);

    // Or check if current keywords contain event tags
    const hasKeywordMatch = event.popularKeywords.some(tag => normalizedKws.includes(tag));

    return isCurrentSeason || hasKeywordMatch;
  });

  // 4. Calculate SEO Score & Feedback
  let scorePoints = 0;
  const feedback: string[] = [];
  const feedbackIndo: string[] = [];

  // A. Keyword Count (Optimal: 35-49)
  const kwCount = normalizedKws.length;
  if (kwCount >= 35 && kwCount <= 50) {
    scorePoints += 30;
  } else if (kwCount >= 20 && kwCount < 35) {
    scorePoints += 20;
    feedback.push(`Keywords count is ${kwCount}. Aim for 35-49 tags for maximum search indexing.`);
    feedbackIndo.push(`Jumlah kata kunci baru ${kwCount}. Targetkan 35-49 tag untuk indeks pencarian maksimal.`);
  } else if (kwCount > 50) {
    scorePoints += 15;
    feedback.push(`Keywords count is ${kwCount}. Stock platforms strictly limit tags. Trim down to 49 for safety.`);
    feedbackIndo.push(`Kata kunci berjumlah ${kwCount}. Platform microstock membatasi maksimal 49-50 tag agar aman dari spam.`);
  } else {
    scorePoints += 5;
    feedback.push(`Critical: Very low keyword count (${kwCount}). Add more tags to enhance discoverability.`);
    feedbackIndo.push(`Kritis: Jumlah kata kunci terlalu sedikit (${kwCount}). Tambah tag agar pembeli bisa menemukan aset Anda.`);
  }

  // B. Title Optimization (Optimal Length: 50-120 characters, Rich Vocab)
  const titleLen = title.trim().length;
  if (titleLen >= 50 && titleLen <= 130) {
    scorePoints += 30;
  } else if (titleLen > 0 && titleLen < 50) {
    scorePoints += 15;
    feedback.push(`Title is short (${titleLen} chars). Expand it with high-value descriptive microstock keywords.`);
    feedbackIndo.push(`Judul terlalu pendek (${titleLen} kar). Perluas dengan menambahkan kata kunci deskriptif microstock bernilai tinggi.`);
  } else if (titleLen > 130 && titleLen <= 200) {
    scorePoints += 20;
    feedback.push(`Title is slightly long (${titleLen} chars). Ensure the most critical keywords are front-loaded.`);
    feedbackIndo.push(`Judul agak terlalu panjang (${titleLen} kar). Pastikan kata kunci paling kritis berada di bagian depan.`);
  } else if (titleLen > 200) {
    scorePoints += 5;
    feedback.push(`Title exceeds 200 characters limit and will be truncated or rejected by platforms.`);
    feedbackIndo.push(`Judul melebihi batas 200 karakter dan berisiko ditolak atau dipotong otomatis oleh agensi.`);
  } else {
    feedback.push(`Critical: Missing title. Enter a high-value search friendly title.`);
    feedbackIndo.push(`Kritis: Judul masih kosong. Buat judul komersial yang bersahabat dengan pencarian.`);
  }

  // C. Search Volume / Market Dict Presence
  const highVolumeCount = keywordInsights.filter(k => k.volumeRating === 'HIGH').length;
  const mediumVolumeCount = keywordInsights.filter(k => k.volumeRating === 'MEDIUM').length;

  if (highVolumeCount >= 8) {
    scorePoints += 25;
  } else if (highVolumeCount >= 4) {
    scorePoints += 15;
    feedback.push(`Good keyword volume. Boost discoverability further by including more high-volume market tags.`);
    feedbackIndo.push(`Volume kata kunci sudah cukup baik. Tambah tag populer untuk meningkatkan lalu lintas pencarian.`);
  } else {
    scorePoints += 5;
    feedback.push(`Low density of high-volume keywords. Review recommendations to inject trending market tags.`);
    feedbackIndo.push(`Kepadatan kata kunci populer rendah. Tambah kata kunci pasar yang disarankan di bawah.`);
  }

  // D. Co-occurrence Strength
  const overlappingCoOccurrences = keywords.filter(kw => {
    const norm = kw.toLowerCase().trim();
    // Check if it appears as suggestion for OTHER keywords
    return keywords.some(other => {
      const otherNorm = other.toLowerCase().trim();
      if (otherNorm === norm) return false;
      return CO_OCCURRENCE_MAP[otherNorm]?.includes(norm);
    });
  }).length;

  if (overlappingCoOccurrences >= 5) {
    scorePoints += 15;
  } else {
    scorePoints += 5;
    feedback.push(`Lacks interconnected semantic tags (co-occurrence clusters). Use 'Suggested Associations' below.`);
    feedbackIndo.push(`Kurang memiliki klaster kata kunci yang saling berhubungan (semantik). Gunakan 'Saran Asosiasi' di bawah.`);
  }

  // Keep score bounded 0 to 100
  const finalScore = Math.min(100, Math.max(10, scorePoints));

  let rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' = 'POOR';
  let ratingsColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';

  if (finalScore >= 90) {
    rating = 'EXCELLENT';
    ratingsColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  } else if (finalScore >= 75) {
    rating = 'GOOD';
    ratingsColor = 'text-violet-500 bg-violet-500/10 border-violet-500/20';
  } else if (finalScore >= 50) {
    rating = 'FAIR';
    ratingsColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  }

  return {
    score: finalScore,
    rating,
    ratingsColor,
    feedback: feedback.length > 0 ? feedback : ['Your metadata is exceptionally optimized for first-page ranking!'],
    feedbackIndo: feedbackIndo.length > 0 ? feedbackIndo : ['Metadata Anda sudah dioptimasi dengan sempurna untuk peringkat halaman pertama!'],
    keywordInsights,
    suggestedCoOccurrences: coOccurrenceSuggestions.slice(0, 12),
    relevantSeasonalEvents
  };
};
