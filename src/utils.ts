
/**
 * Unsurpassed clipboard utility that works across secure (HTTPS) and non-secure contexts
 * by falling back to the legacy document.execCommand('copy') when necessary.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;

    // 1. Primordial Attempt: Navigator Clipboard API (Secure Context only)
    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined' && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch(e) {
        console.warn('Navigator clipboard failed, falling back to copy-to-clipboard', e);
    }

    try {
        const copyModule: any = await import('copy-to-clipboard').catch(() => null);
        const copyFn = copyModule?.default || copyModule;
        if (typeof copyFn === 'function') {
            const success = copyFn(text, {
                debug: process.env.NODE_ENV !== 'production',
                message: 'Press #{key} to copy',
            });
            if (success) return true;
        }
        return false;
    } catch (err) {
        console.error('[Clipboard] Robust copy failed:', err);
        return false;
    }
};

const PEOPLE_TERMS = new Set([
  'person', 'people', 'human', 'humans', 'man', 'men', 'woman', 'women', 'girl', 'girls', 'boy', 'boys', 'kid', 'kids',
  'child', 'children', 'baby', 'babies', 'toddler', 'toddlers', 'teenager', 'teenagers', 'teen', 'teens', 'adult', 'adults', 'elderly', 'senior', 'seniors',
  'model', 'models', 'portrait', 'portraits', 'face', 'faces', 'crowd', 'crowds', 'group', 'groups', 'family', 'families', 'couple', 'couples', 'worker', 'workers', 'farmer', 'farmers',
  'doctor', 'doctors', 'nurse', 'nurses', 'chef', 'chefs', 'teacher', 'teachers', 'student', 'students', 'engineer', 'engineers', 'businessman', 'businesswoman', 'businessperson',
  'entrepreneur', 'entrepreneurs', 'athlete', 'athletes', 'runner', 'runners', 'player', 'players', 'dancer', 'dancers', 'artist', 'artists', 'musician', 'musicians', 'passenger', 'passengers',
  'tourist', 'tourists', 'customer', 'customers', 'shopper', 'shoppers', 'patient', 'patients', 'user', 'users', 'friend', 'friends', 'colleague', 'colleagues', 'team', 'teams',
  'avatar', 'character', 'characters', 'figure', 'figures', 'pedestrian', 'pedestrians', 'citizen', 'citizens', 'individual', 'individuals', 'male', 'female', 'guy', 'guys', 'lady', 'ladies',
  'gentleman', 'gentlemen', 'youth', 'infant', 'infants',
  // Indonesian people terms
  'orang', 'manusia', 'pria', 'wanita', 'lelaki', 'perempuan', 'anak', 'bayi', 'balita', 'remaja', 'dewasa', 'lansia', 'kakek', 'nenek', 'ibu', 'ayah', 'keluarga', 'pasangan', 'pekerja', 'petani', 'dokter', 'guru', 'murid', 'siswa'
]);

const PROPERTY_TERMS = new Set([
  // 1. Electronic Devices, Gadgets, Computers & Hardware (Alat-alat Elektronik & Gawai)
  'electronic', 'electronics', 'gadget', 'gadgets', 'device', 'devices', 'appliance', 'appliances', 'hardware', 'tech', 'technology',
  'smartphone', 'smartphones', 'phone', 'phones', 'cellphone', 'cellphones', 'cell', 'mobile', 'iphone', 'android',
  'tablet', 'tablets', 'ipad', 'ipads', 'touchscreen',
  'computer', 'computers', 'pc', 'desktop', 'desktops', 'laptop', 'laptops', 'notebook', 'notebooks', 'macbook', 'chromebook', 'workstation', 'server', 'servers',
  'monitor', 'monitors', 'screen', 'screens', 'display', 'displays',
  'keyboard', 'keyboards', 'mouse', 'trackpad', 'touchpad', 'webcam',
  'camera', 'cameras', 'dslr', 'mirrorless', 'camcorder', 'lens', 'lenses', 'tripod', 'gimbal',
  'headphone', 'headphones', 'earphone', 'earphones', 'earbud', 'earbuds', 'headset', 'headsets', 'airpods', 'audio',
  'speaker', 'speakers', 'soundbar', 'subwoofer', 'amplifier', 'microphone', 'microphones', 'mic', 'mics', 'radio',
  'television', 'televisions', 'tv', 'tvs', 'projector', 'projectors',
  'console', 'consoles', 'playstation', 'xbox', 'nintendo', 'joystick', 'gamepad', 'controller',
  'smartwatch', 'smartwatches', 'watch', 'watches', 'clock', 'clocks', 'wearable', 'wearables',
  'drone', 'drones', 'quadcopter', 'robot', 'robots', 'robotics', 'cyborg',
  'printer', 'printers', 'scanner', 'scanners', 'copier', 'router', 'modem', 'cable', 'cables', 'wire', 'wires', 'charger', 'chargers', 'adapter', 'adapters', 'powerbank', 'battery', 'batteries',
  'processor', 'cpu', 'gpu', 'microchip', 'chip', 'motherboard', 'circuit',

  // 2. Home Appliances & Kitchen Equipment (Peralatan Rumah Tangga & Dapur)
  'refrigerator', 'refrigerators', 'fridge', 'freezer', 'microwave', 'microwaves', 'oven', 'ovens', 'stove', 'stoves', 'cooker', 'cooktop',
  'blender', 'blenders', 'toaster', 'toasters', 'mixer', 'mixers', 'juicer', 'kettle', 'dishwasher', 'washer', 'dryer',
  'vacuum', 'iron', 'heater', 'purifier', 'humidifier', 'fan', 'fans',
  'lamp', 'lamps', 'lighting', 'lightbulb', 'chandelier', 'lantern',

  // 3. Furniture, Interior & Home Fixtures (Perabot, Furnitur & Properti Interior)
  'furniture', 'furnishing', 'chair', 'chairs', 'armchair', 'armchairs', 'sofa', 'sofas', 'couch', 'couches', 'loveseat', 'settee', 'stool', 'stools', 'bench', 'benches', 'ottoman',
  'table', 'tables', 'desk', 'desks', 'counter', 'countertop', 'worktop', 'workbench',
  'bed', 'beds', 'mattress', 'headboard', 'crib',
  'wardrobe', 'wardrobes', 'closet', 'closets', 'cabinet', 'cabinets', 'cupboard', 'cupboards', 'shelf', 'shelves', 'bookshelf', 'bookshelves', 'bookcase', 'bookcases', 'sideboard', 'drawer', 'drawers', 'dresser',
  'mirror', 'mirrors', 'carpet', 'carpets', 'rug', 'rugs', 'curtain', 'curtains', 'blinds', 'wallpaper',
  'sink', 'sinks', 'faucet', 'tap', 'bathtub', 'tub', 'shower', 'toilet', 'plumbing',
  'bedroom', 'kitchen', 'bathroom', 'restroom', 'washroom', 'livingroom', 'diningroom', 'basement', 'attic', 'patio', 'balcony', 'terrace', 'veranda', 'deck', 'porch', 'garage',

  // 4. Vehicles & Transportation (Semua Kendaraan & Alat Transportasi)
  'car', 'cars', 'automobile', 'automobiles', 'vehicle', 'vehicles', 'truck', 'trucks', 'lorry', 'bus', 'buses', 'van', 'vans', 'suv', 'sedan', 'coupe', 'convertible', 'pickup',
  'motorcycle', 'motorcycles', 'motorbike', 'motorbikes', 'scooter', 'scooters', 'moped', 'vespa', 'bicycle', 'bicycles', 'bike', 'bikes', 'skateboard', 'hoverboard', 'segway',
  'trailer', 'camper', 'caravan', 'rv', 'ambulance', 'taxi', 'cab', 'tractor', 'forklift', 'excavator', 'bulldozer', 'crane',
  'train', 'trains', 'locomotive', 'subway', 'metro', 'tram', 'trolley', 'railway', 'monorail', 'wagon', 'carriage',
  'airplane', 'airplanes', 'aircraft', 'aeroplane', 'plane', 'planes', 'jet', 'jets', 'airliner', 'helicopter', 'helicopters', 'chopper', 'glider', 'blimp', 'airship', 'spacecraft', 'spaceship', 'rocket', 'satellite',
  'boat', 'boats', 'ship', 'ships', 'yacht', 'yachts', 'vessel', 'vessels', 'ferry', 'ferries', 'sailboat', 'sailboats', 'speedboat', 'speedboats', 'canoe', 'kayak', 'catamaran', 'submarine', 'jetski',

  // 5. Buildings, Architecture, Real Estate & Infrastructure (Bangunan, Arsitektur & Properti)
  'building', 'buildings', 'architecture', 'architectural', 'house', 'houses', 'home', 'homes', 'residence', 'residential', 'villa', 'villas', 'mansion', 'mansions', 'cottage', 'cottages', 'cabin', 'cabins', 'chalet', 'bungalow',
  'apartment', 'apartments', 'condo', 'condos', 'condominium', 'skyscraper', 'skyscrapers', 'tower', 'towers',
  'office', 'offices', 'workplace', 'room', 'rooms', 'interior', 'interiors', 'exterior', 'exteriors', 'facade', 'facades', 'hall', 'hallway', 'corridor', 'lobby',
  'hotel', 'hotels', 'motel', 'hostel', 'resort', 'resorts', 'restaurant', 'restaurants', 'cafe', 'cafes', 'bistro', 'bar', 'pub',
  'store', 'stores', 'shop', 'shops', 'boutique', 'mall', 'malls', 'supermarket', 'supermarkets', 'warehouse', 'warehouses', 'factory', 'factories', 'plant', 'workshop', 'hangar', 'barn', 'silo', 'greenhouse',
  'hospital', 'hospitals', 'clinic', 'clinics', 'school', 'schools', 'classroom', 'university', 'campus', 'college', 'library', 'libraries', 'museum', 'museums', 'gallery', 'galleries', 'theater', 'theatre', 'cinema', 'auditorium', 'stadium', 'stadiums', 'arena', 'gym',
  'temple', 'temples', 'church', 'churches', 'mosque', 'mosques', 'cathedral', 'cathedrals', 'shrine', 'shrines', 'chapel', 'synagogue', 'pagoda', 'monastery', 'palace', 'palaces', 'castle', 'castles', 'fortress', 'fort', 'monument', 'monuments', 'landmark', 'landmarks',
  'bridge', 'bridges', 'pier', 'dock', 'wharf', 'dam', 'tunnel', 'highway', 'road', 'street', 'avenue', 'crosswalk', 'sidewalk', 'pavement', 'plaza', 'square',
  'airport', 'airports', 'terminal', 'runway', 'station', 'stations', 'harbor', 'harbors', 'port', 'ports', 'marina', 'property', 'estate', 'estates',
  'gazebo', 'pergola', 'pool', 'fountain', 'fence', 'gate', 'rooftop', 'roof',

  // 6. Tools, Industrial Machinery & Manufactured Products (Mesin, Peralatan & Barang Komersial)
  'machinery', 'machine', 'machines', 'engine', 'motor', 'generator', 'turbine', 'pump', 'compressor', 'conveyor', 'equipment', 'apparatus', 'instrument', 'instruments',
  'tool', 'tools', 'toolbox', 'drill', 'saw', 'hammer', 'wrench', 'screwdriver', 'pliers', 'cutter',
  'guitar', 'piano', 'violin', 'drums', 'saxophone', 'trumpet', 'flute', 'cello', 'synthesizer',
  'product', 'products', 'packaging', 'package', 'packages', 'box', 'boxes', 'carton', 'cartons', 'bottle', 'bottles', 'can', 'cans', 'jar', 'jars', 'container', 'containers',
  'fashion', 'apparel', 'clothing', 'shoe', 'shoes', 'sneaker', 'sneakers', 'boot', 'boots', 'heel', 'heels', 'sandal', 'sandals', 'bag', 'bags', 'handbag', 'handbags', 'purse', 'backpack', 'backpacks', 'suitcase', 'suitcases', 'luggage', 'briefcase', 'wallet',
  'jewelry', 'jewellery', 'ring', 'necklace', 'bracelet', 'earring', 'earrings', 'pendant',
  'artwork', 'sculpture', 'sculptures', 'statue', 'statues', 'painting', 'paintings', 'figurine', 'toy', 'toys', 'doll', 'dolls', 'lego',
  'book', 'books', 'notebook', 'stationery', 'pen', 'pencil',

  // 7. Indonesian Terms for Electronics, Property, Appliances & Vehicles
  'elektronik', 'gawai', 'perangkat', 'ponsel', 'handphone', 'hp', 'telepon', 'komputer', 'laptop', 'layar', 'televisi', 'kamera', 'headphone', 'earphone', 'kabel', 'robot', 'printer',
  'perabot', 'furnitur', 'kursi', 'meja', 'lemari', 'sofa', 'kasur',
  'rumah', 'gedung', 'bangunan', 'kantor', 'kamar', 'dapur', 'ruangan',
  'mobil', 'motor', 'sepeda', 'pesawat', 'kapal', 'kereta', 'truk', 'bus', 'kendaraan',
  'properti', 'alat', 'peralatan', 'mesin', 'pakaian', 'tas', 'sepatu', 'jam', 'perhiasan'
]);

// Multi-word compound phrases representing property, electronic gadgets, or structures
const COMPOUND_PROPERTY_PHRASES = [
  'cell phone', 'mobile phone', 'smart phone', 'smart watch', 'smart tv', 'vr headset', 'ar glasses', 'smart glasses',
  'fitness tracker', 'hard drive', 'flash drive', 'power bank', 'game console', 'sound system', 'home theater', 'audio system',
  'coffee maker', 'espresso machine', 'washing machine', 'vacuum cleaner', 'air conditioner', 'air conditioning', 'microwave oven', 'food processor',
  'dining table', 'coffee table', 'bedside table', 'living room', 'dining room', 'master bedroom', 'bunk bed', 'book shelf',
  'real estate', 'apartment building', 'office building', 'shopping mall', 'swimming pool', 'train station', 'bus stop', 'subway station',
  'police car', 'fire truck', 'sports car', 'electric vehicle', 'electric car', 'cruise ship', 'jet ski', 'pickup truck',
  'musical instrument', 'power tool', 'action figure', 'board game',
  'alat elektronik', 'telepon genggam', 'jam tangan', 'pendingin ruangan', 'mesin cuci', 'meja makan', 'ruang tamu', 'ruang keluarga', 'kamar tidur', 'tempat tidur'
];

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
  yoloObjects?: { label?: string; name?: string }[],
  description?: string
): FictionalDetectionResult => {
  const matchedTerms: string[] = [];
  let hasPeople = false;
  let hasProperty = false;

  // 1. Category-based Detection
  // Adobe Stock Categories:
  // ID 13: People
  // ID 2: Buildings and Architecture
  // ID 10: Industry (Machinery, industrial structures, factories)
  // ID 19: Technology (Electronics, computers, gadgets, devices)
  // ID 20: Transport (Vehicles, cars, airplanes, trains, infrastructure)
  const catNum = Number(categoryId);
  if (catNum === 13) {
    hasPeople = true;
    matchedTerms.push('Category: People');
  } else if (catNum === 2) {
    hasProperty = true;
    matchedTerms.push('Category: Architecture');
  } else if (catNum === 19) {
    hasProperty = true;
    matchedTerms.push('Category: Technology (Electronics/Gadgets)');
  } else if (catNum === 20) {
    hasProperty = true;
    matchedTerms.push('Category: Transport (Vehicles)');
  } else if (catNum === 10) {
    hasProperty = true;
    matchedTerms.push('Category: Industry (Machinery/Equipment)');
  }

  // String Category Fallback (Adobe, Shutterstock, Freepik category names)
  if (typeof categoryId === 'string' && categoryId.trim()) {
    const catLower = categoryId.toLowerCase().trim();
    if (catLower.includes('people') || catLower.includes('portrait')) {
      hasPeople = true;
      matchedTerms.push(`Category: ${categoryId}`);
    }
    if (
      catLower.includes('architecture') ||
      catLower.includes('building') ||
      catLower.includes('technology') ||
      catLower.includes('transport') ||
      catLower.includes('interior') ||
      catLower.includes('industrial') ||
      catLower.includes('object')
    ) {
      hasProperty = true;
      matchedTerms.push(`Category: ${categoryId}`);
    }
  }

  // 2. YOLO / AI Vision Detected Objects Grounding
  if (Array.isArray(yoloObjects) && yoloObjects.length > 0) {
    const yoloPeopleClasses = ['person', 'people', 'man', 'woman', 'child', 'kid', 'boy', 'girl', 'baby', 'toddler', 'face', 'crowd', 'human', 'pedestrian'];
    const yoloPropertyClasses = [
      // Electronics, Gadgets & Appliances
      'cell phone', 'phone', 'telephone', 'smartphone', 'laptop', 'computer', 'pc', 'tv', 'television', 'monitor', 'screen', 'remote',
      'keyboard', 'mouse', 'camera', 'headphone', 'headphones', 'speaker', 'speakers', 'clock', 'watch', 'smartwatch', 'tablet', 'drone', 'robot',
      'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'fridge', 'blender', 'appliance',
      // Vehicles & Transport
      'car', 'truck', 'bus', 'train', 'airplane', 'boat', 'bicycle', 'motorcycle', 'vehicle', 'aircraft', 'ship', 'yacht', 'scooter', 'van', 'helicopter',
      // Furniture & Interior
      'chair', 'couch', 'sofa', 'bed', 'dining table', 'table', 'desk', 'toilet', 'bench', 'furniture', 'shelf', 'cabinet', 'cupboard',
      // Structures & Buildings
      'building', 'house', 'home', 'apartment', 'tower', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bridge',
      // Products & Accessories
      'backpack', 'umbrella', 'handbag', 'purse', 'tie', 'suitcase', 'luggage', 'bottle', 'cup', 'bowl', 'book', 'scissors', 'vase', 'guitar'
    ];

    for (const obj of yoloObjects) {
      const lbl = String(obj.label || obj.name || '').toLowerCase().trim();
      if (!lbl) continue;
      if (yoloPeopleClasses.some(p => lbl.includes(p))) {
        hasPeople = true;
        matchedTerms.push(`YOLO: ${lbl}`);
      }
      if (yoloPropertyClasses.some(p => lbl.includes(p))) {
        hasProperty = true;
        matchedTerms.push(`YOLO: ${lbl}`);
      }
    }
  }

  // 3. Multi-word Compound Phrases Check (Title, Description, Keywords)
  const fullTitle = String(title || '').toLowerCase();
  const fullDesc = String(description || '').toLowerCase();
  const joinedKw = Array.isArray(keywords) ? keywords.map(k => String(k).toLowerCase()).join(' ') : '';
  const combinedCorpus = `${fullTitle} ${fullDesc} ${joinedKw}`;

  for (const phrase of COMPOUND_PROPERTY_PHRASES) {
    if (combinedCorpus.includes(phrase)) {
      hasProperty = true;
      matchedTerms.push(`Phrase: ${phrase}`);
    }
  }

  // 4. Title Tokenization & Matching
  const titleTokens = fullTitle
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

  // 5. Description Tokenization & Matching (if provided)
  if (description) {
    const descTokens = fullDesc
      .split(/\W+/)
      .filter(t => t.length > 2);

    for (const token of descTokens) {
      if (PEOPLE_TERMS.has(token)) {
        hasPeople = true;
        matchedTerms.push(`Description: ${token}`);
      }
      if (PROPERTY_TERMS.has(token)) {
        hasProperty = true;
        matchedTerms.push(`Description: ${token}`);
      }
    }
  }

  // 6. Keywords Matching
  if (Array.isArray(keywords)) {
    for (const kw of keywords) {
      const cleanKw = String(kw).toLowerCase().trim();
      if (!cleanKw) continue;
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

/**
 * Heuristically detects the official MiriCanvas category ('Background', 'Frame', 'Object', 'Icon', 'Line', 'Photo', 'Text', 'Template').
 */
export const detectMiriCanvasCategory = (
  title?: string,
  keywords?: string[],
  adobeCategoryId?: number | '',
  toolType?: string,
  yoloObjects?: Array<{ label?: string; name?: string }>
): string => {
  const t = String(title || '').toLowerCase();
  const kw = (keywords || []).map(k => String(k).toLowerCase());
  const hasPattern = (patterns: string[]): boolean => {
    return patterns.some(pattern => {
      // Check as whole word / whole keyword
      const regex = new RegExp(`(^|[\\s,.-])${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s,.-]|$)`, 'i');
      return regex.test(t) || kw.some(k => k === pattern || regex.test(k));
    });
  };

  // 1. Text & Typography check (priority before icon)
  const textPatterns = ['typography', 'lettering', 'calligraphy', 'quote', 'quotes', 'font', 'fonts', 'typeface', 'word art', 'text art', 'tulisan', 'kaligrafi'];
  if (hasPattern(textPatterns)) {
    return 'Text';
  }

  // 2. Icon & Symbol check
  const iconPatterns = ['icon', 'icons', 'symbol', 'symbols', 'pictogram', 'glyph', 'logo', 'badge', 'sign', 'emblem', 'lambang', 'simbol', 'ikon'];
  if (hasPattern(iconPatterns)) {
    return 'Icon';
  }

  // 3. Line & Divider check
  const linePatterns = ['divider', 'dividers', 'line', 'lines', 'border line', 'dashed line', 'separator', 'stroke', 'swirl', 'garis', 'pembatas'];
  if (hasPattern(linePatterns)) {
    return 'Line';
  }

  // 4. Frame & Border check
  const framePatterns = ['frame', 'frames', 'border', 'borders', 'photo frame', 'floral frame', 'corner', 'wreath', 'bingkai', 'pigura'];
  if (hasPattern(framePatterns)) {
    return 'Frame';
  }

  // 5. Template check
  const templatePatterns = ['template', 'templates', 'flyer', 'flyers', 'banner', 'banners', 'poster', 'posters', 'brochure', 'invitation', 'business card', 'layout', 'undangan', 'brosur'];
  if (hasPattern(templatePatterns)) {
    return 'Template';
  }

  // 6. Object check (isolated items, cutouts, animals, food, products, electronics, etc.)
  const objectPatterns = ['isolated', 'white background', 'transparent background', 'object', 'objects', 'cutout', 'item', 'items', '3d render', 'illustration', 'clipart', 'benda', 'barang'];
  if (
    hasPattern(objectPatterns) ||
    (yoloObjects && yoloObjects.length > 0) ||
    adobeCategoryId === 1 || // Animals
    adobeCategoryId === 4 || // Drinks
    adobeCategoryId === 7 || // Food
    adobeCategoryId === 14 || // Plants and Flowers
    adobeCategoryId === 18 || // Sports
    adobeCategoryId === 19 || // Technology
    adobeCategoryId === 20 || // Transport
    toolType === 'vector'
  ) {
    return 'Object';
  }

  // 7. Background check (patterns, textures, wallpapers, landscapes, abstract backdrops)
  const bgPatterns = ['background', 'backgrounds', 'texture', 'textures', 'pattern', 'patterns', 'wallpaper', 'wallpapers', 'backdrop', 'abstract', 'gradient', 'seamless', 'landscape', 'scenery', 'latar belakang', 'pola', 'tekstur'];
  if (hasPattern(bgPatterns) || adobeCategoryId === 8 || adobeCategoryId === 11) {
    return 'Background';
  }

  // 8. Photo check (people, lifestyle, real world photos)
  const photoPatterns = ['photo', 'photograph', 'portrait', 'realistic', 'camera', 'man', 'woman', 'people', 'foto'];
  if (hasPattern(photoPatterns) || adobeCategoryId === 13 || adobeCategoryId === 12) {
    return 'Photo';
  }

  // Default fallback
  return toolType === 'vector' ? 'Object' : 'Photo';
};


