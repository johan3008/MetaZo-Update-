
import copy from 'copy-to-clipboard';

/**
 * Unsurpassed clipboard utility that works across secure (HTTPS) and non-secure contexts
 * by falling back to the legacy document.execCommand('copy') when necessary.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;

    // 1. Primordial Attempt: Navigator Clipboard API (Secure Context only)
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch(e) {
        console.warn('Navigator clipboard failed, falling back to copy-to-clipboard', e);
    }

    try {
        const success = copy(text, {
            debug: process.env.NODE_ENV !== 'production',
            message: 'Press #{key} to copy',
        });
        
        if (success) return true;
        
        return false;
    } catch (err) {
        console.error('[Clipboard] Robust copy failed:', err);
        return false;
    }
};

const PEOPLE_TERMS = new Set([
  'person', 'people', 'human', 'man', 'men', 'woman', 'women', 'girl', 'boy', 'kid', 'kids',
  'child', 'children', 'baby', 'toddler', 'teenager', 'adult', 'elderly', 'senior',
  'model', 'portrait', 'face', 'crowd', 'group', 'family', 'couple', 'worker', 'farmer',
  'doctor', 'nurse', 'chef', 'teacher', 'student', 'engineer', 'businessman', 'businesswoman',
  'entrepreneur', 'athlete', 'runner', 'player', 'dancer', 'artist', 'musician', 'passenger',
  'tourist', 'customer', 'shopper', 'patient', 'user', 'friend', 'friends', 'colleague', 'team'
]);

const PROPERTY_TERMS = new Set([
  'building', 'buildings', 'architecture', 'architectural', 'house', 'home', 'residence',
  'villa', 'mansion', 'cottage', 'cabin', 'apartment', 'condo', 'skyscraper', 'tower',
  'office', 'room', 'interior', 'exterior', 'facade', 'hall', 'lobby', 'hotel', 'resort',
  'restaurant', 'cafe', 'store', 'shop', 'mall', 'supermarket', 'warehouse', 'factory',
  'hospital', 'clinic', 'school', 'university', 'museum', 'temple', 'church', 'mosque',
  'cathedral', 'shrine', 'palace', 'castle', 'monument', 'landmark', 'bridge', 'stadium',
  'airport', 'station', 'harbor', 'port', 'property', 'real estate', 'estate', 'bedroom',
  'kitchen', 'bathroom', 'living room', 'patio', 'balcony', 'terrace', 'garage', 'furniture',
  'car', 'automobile', 'vehicle', 'truck', 'bus', 'motorcycle', 'yacht', 'boat', 'airplane'
]);

export interface FictionalDetectionResult {
  hasPeople: boolean;
  hasProperty: boolean;
  isFictionalEligible: boolean;
  matchedTerms: string[];
}

export const detectFictionalPeopleProperty = (
  title?: string,
  keywords?: string[],
  categoryId?: number | string,
  yoloObjects?: { label: string }[]
): FictionalDetectionResult => {
  const matchedTerms: string[] = [];
  let hasPeople = false;
  let hasProperty = false;

  const catNum = Number(categoryId);
  if (catNum === 13) {
    hasPeople = true;
    matchedTerms.push('Category: People');
  } else if (catNum === 2) {
    hasProperty = true;
    matchedTerms.push('Category: Architecture');
  }

  if (Array.isArray(yoloObjects) && yoloObjects.length > 0) {
    for (const obj of yoloObjects) {
      const lbl = String(obj.label || '').toLowerCase().trim();
      if (['person', 'face', 'man', 'woman', 'child', 'crowd'].some(p => lbl.includes(p))) {
        hasPeople = true;
        matchedTerms.push(`YOLO: ${lbl}`);
      }
      if (['car', 'building', 'house', 'truck', 'bus', 'train', 'airplane', 'boat'].some(p => lbl.includes(p))) {
        hasProperty = true;
        matchedTerms.push(`YOLO: ${lbl}`);
      }
    }
  }

  const titleTokens = String(title || '')
    .toLowerCase()
    .split(/\W+/)
    .filter(t => t.length > 2);

  for (const token of titleTokens) {
    if (PEOPLE_TERMS.has(token)) {
      hasPeople = true;
      matchedTerms.push(`Title: ${token}`);
    }
    if (PROPERTY_TERMS.has(token)) {
      hasProperty = true;
      matchedTerms.push(`Title: ${token}`);
    }
  }

  if (Array.isArray(keywords)) {
    for (const kw of keywords) {
      const cleanKw = String(kw).toLowerCase().trim();
      if (PEOPLE_TERMS.has(cleanKw)) {
        hasPeople = true;
        matchedTerms.push(`Keyword: ${cleanKw}`);
      } else if (PROPERTY_TERMS.has(cleanKw)) {
        hasProperty = true;
        matchedTerms.push(`Keyword: ${cleanKw}`);
      } else {
        const words = cleanKw.split(/\s+/);
        for (const w of words) {
          if (PEOPLE_TERMS.has(w)) {
            hasPeople = true;
            matchedTerms.push(`Keyword: ${cleanKw}`);
            break;
          }
          if (PROPERTY_TERMS.has(w)) {
            hasProperty = true;
            matchedTerms.push(`Keyword: ${cleanKw}`);
            break;
          }
        }
      }
    }
  }

  const isFictionalEligible = hasPeople || hasProperty;
  return {
    hasPeople,
    hasProperty,
    isFictionalEligible,
    matchedTerms: Array.from(new Set(matchedTerms))
  };
};

