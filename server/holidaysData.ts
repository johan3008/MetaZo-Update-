export interface HolidayEvent {
  name: string;
  date: string;
  location: string;
  commercial_potential: string;
  suggested_topics: string[];
}

export const HOLIDAYS_DATA: Record<string, HolidayEvent[]> = {
  january: [
    {
      name: "New Year's Day",
      date: "1 January 2026",
      location: "Global/World",
      commercial_potential: "High demand for celebratory themes, clocks striking midnight, sparkling toasts, family resolution planning, and fresh calendar layouts.",
      suggested_topics: ["new year celebration", "toast", "clock midnight", "family resolution", "fresh calendar"]
    },
    {
      name: "World Braille Day",
      date: "4 January 2026",
      location: "Global/UN",
      commercial_potential: "Commercial interest in accessibility features, education, inclusive school setups, tactile reading, and supportive learning technologies.",
      suggested_topics: ["braille reading", "accessibility", "inclusive education", "tactile writing", "supportive learning"]
    },
    {
      name: "Epiphany / Three Kings Day",
      date: "6 January 2026",
      location: "Spain, Mexico, Latin America, Europe",
      commercial_potential: "Strong demand for traditional Roscon de Reyes cake, three kings crown iconography, kids receiving gifts, and vibrant family dinners.",
      suggested_topics: ["roscon de reyes", "three kings crown", "gift giving", "family dinner", "traditional parade"]
    },
    {
      name: "Orthodox Christmas",
      date: "7 January 2026",
      location: "Eastern Europe, Russia, Greece",
      commercial_potential: "Demand for cozy religious winter holidays, family feasts, traditional candlelight services, and rustic wooden dining tables.",
      suggested_topics: ["orthodox christmas", "family feast", "candlelight service", "winter holiday", "rustic dining"]
    },
    {
      name: "National Youth Day",
      date: "12 January 2026",
      location: "India",
      commercial_potential: "High demand for young entrepreneurs, dynamic student collaboration, local youth development seminars, and sports training graphics.",
      suggested_topics: ["young entrepreneurs", "student collaboration", "youth development", "sports training", "vibrant youth"]
    },
    {
      name: "World Snow Day",
      date: "15 January 2026",
      location: "Global/World",
      commercial_potential: "Excellent potential for winter sports equipment, snowboarding, family ski vacations, and cozy winter travel flatlays.",
      suggested_topics: ["snowboarding", "ski vacation", "winter sports", "snowy mountain", "cozy winter travel"]
    },
    {
      name: "Martin Luther King Jr. Day",
      date: "19 January 2026",
      location: "USA",
      commercial_potential: "High demand for diversity, human rights graphics, unity concept photos, social justice campaigns, and educational materials.",
      suggested_topics: ["human rights", "diversity", "unity concept", "social justice", "mlk memorial"]
    },
    {
      name: "International Day of Education",
      date: "24 January 2026",
      location: "Global/UNESCO",
      commercial_potential: "Commercial demand for digital learning, modern classroom setups, remote tutoring, student laptops, and teacher-student collaboration.",
      suggested_topics: ["digital learning", "modern classroom", "remote tutoring", "student laptop", "teacher student"]
    },
    {
      name: "Republic Day of India",
      date: "26 January 2026",
      location: "India",
      commercial_potential: "Massive demand for Indian national tricolor (saffron, white, green) graphics, patriotic parades, community celebrations, and heritage photos.",
      suggested_topics: ["indian tricolor", "patriotic parade", "republic day", "delhi parade", "national pride"]
    },
    {
      name: "Australia Day",
      date: "26 January 2026",
      location: "Australia",
      commercial_potential: "High demand for summer backyard barbecues, beach gatherings, Australian flag iconography, and happy outdoor lifestyles.",
      suggested_topics: ["backyard barbecue", "beach gathering", "australian flag", "outdoor lifestyle", "summer vibe"]
    },
    {
      name: "International Customs Day",
      date: "26 January 2026",
      location: "Global",
      commercial_potential: "Demand for global logistics, shipping containers, border control officer assets, and digital trade documentation models.",
      suggested_topics: ["global logistics", "shipping container", "border control", "trade documentation", "supply chain"]
    },
    {
      name: "International Holocaust Remembrance Day",
      date: "27 January 2026",
      location: "Global/UN",
      commercial_potential: "Demand for historical education, candles of remembrance, memorial graphics, and human rights history assets.",
      suggested_topics: ["holocaust remembrance", "remembrance candle", "memorial graphic", "history education", "never forget"]
    },
    {
      name: "Data Privacy Day",
      date: "28 January 2026",
      location: "Global",
      commercial_potential: "Crucial demand for cybersecurity concepts, encrypted folders, digital key icons, locked laptop graphics, and biometric protection.",
      suggested_topics: ["cybersecurity", "encrypted folder", "biometric protection", "locked laptop", "data privacy"]
    }
  ],
  february: [
    {
      name: "World Cancer Day",
      date: "4 February 2026",
      location: "Global/UN",
      commercial_potential: "Strong demand for lavender and pink ribbon graphics, medical support, oncology researchers, patient counseling, and wellness themes.",
      suggested_topics: ["lavender ribbon", "cancer support", "medical research", "patient counseling", "wellness care"]
    },
    {
      name: "International Day of Women and Girls in Science",
      date: "11 February 2026",
      location: "Global/UN",
      commercial_potential: "High demand for female scientists in futuristic laboratory setups, microscopy work, biotech research, and coding workshops.",
      suggested_topics: ["female scientist", "laboratory research", "microscopy work", "biotech research", "women in tech"]
    },
    {
      name: "World Radio Day",
      date: "13 February 2026",
      location: "Global/UNESCO",
      commercial_potential: "Niche demand for podcasting setups, audio microphones, vintage radio illustrations, audio wave graphs, and modern broadcasting gear.",
      suggested_topics: ["podcasting setup", "audio microphone", "vintage radio", "broadcasting gear", "sound wave"]
    },
    {
      name: "Ascension of Prophet Muhammad (Isra Mi'raj)",
      date: "14 February 2026",
      location: "Indonesia, Malaysia, Global/Islamic",
      commercial_potential: "Strong demand for serene mosque silhouette art, prayer mats, Islamic calligraphy vector files, and religious community gatherings.",
      suggested_topics: ["mosque silhouette", "prayer mat", "islamic calligraphy", "community prayer", "spiritual evening"]
    },
    {
      name: "Valentine's Day",
      date: "14 February 2026",
      location: "Global/World",
      commercial_potential: "Extremely high demand for sweet gifts, red roses, heart chocolate boxes, romantic candlelight dinners, couples portraits, and love greetings.",
      suggested_topics: ["romantic dinner", "heart chocolate", "red rose", "couples portrait", "love greeting"]
    },
    {
      name: "Chinese New Year / Lunar New Year (Imlek)",
      date: "17 February 2026",
      location: "China, Singapore, Indonesia, Global",
      commercial_potential: "Massive commercial value for Year of the Horse (2026) red envelopes, lion dance parades, family reunion feasts, mandarin oranges, and red lanterns.",
      suggested_topics: ["year of the horse", "red envelope", "lion dance", "reunion feast", "mandarin oranges", "red lantern"]
    },
    {
      name: "Ramadan Begins",
      date: "18 February 2026",
      location: "Global/Islamic",
      commercial_potential: "Incredible commercial potential for crescent moon decor, dates (fruits) flatlays, family iftar preparation, and glowing ramadan lanterns.",
      suggested_topics: ["ramadan lantern", "crescent moon", "dates fruit", "iftar dinner", "family prayer"]
    },
    {
      name: "World Day of Social Justice",
      date: "20 February 2026",
      location: "Global/UN",
      commercial_potential: "Demand for diversity and inclusion concepts, fair trade products, community advocacy, and human equality vector illustrations.",
      suggested_topics: ["diversity inclusion", "fair trade", "community advocacy", "human equality", "social justice"]
    },
    {
      name: "International Mother Language Day",
      date: "21 February 2026",
      location: "Global/UNESCO",
      commercial_potential: "Demand for multilingual greeting cards, language learning software interfaces, global diversity icons, and translation services.",
      suggested_topics: ["multilingual greeting", "language learning", "diversity icon", "translation service", "mother tongue"]
    },
    {
      name: "Super Bowl Sunday",
      date: "15 February 2026",
      location: "USA",
      commercial_potential: "Huge demand for american football tailgating, chicken wings platters, group cheers around TVs, sports apparel, and snack tables.",
      suggested_topics: ["american football", "tailgating food", "group cheers", "snack platter", "game day"]
    },
    {
      name: "President's Day",
      date: "16 February 2026",
      location: "USA",
      commercial_potential: "Commercial interest in patriotic sales banners, travel deals, US national monuments, and official federal office backdrops.",
      suggested_topics: ["patriotic sale", "travel deal", "national monument", "us flag", "historic memorial"]
    },
    {
      name: "Carnival of Rio de Janeiro / Venice Carnival",
      date: "19-24 February 2026",
      location: "Brazil, Italy, Global",
      commercial_potential: "Sensational demand for colorful Venetian masks, samba costume photography, confetti bursts, dynamic dance street parades, and party themes.",
      suggested_topics: ["venetian mask", "samba costume", "confetti burst", "street parade", "carnival dance"]
    }
  ],
  march: [
    {
      name: "World Wildlife Day",
      date: "3 March 2026",
      location: "Global/UN",
      commercial_potential: "Demand for pristine nature photography, endangered species vector patterns, wildlife conservation ranger shoots, and green ecology.",
      suggested_topics: ["wildlife conservation", "endangered species", "nature photography", "green ecology", "forest wildlife"]
    },
    {
      name: "International Women's Day",
      date: "8 March 2026",
      location: "Global/World",
      commercial_potential: "Extremely high value for women leadership portraits, female empower slogans, beautiful violet flowers, and women collaborating in corporate setups.",
      suggested_topics: ["women empowerment", "female leadership", "violet flower", "corporate collaboration", "gender equality"]
    },
    {
      name: "Pi Day / International Day of Mathematics",
      date: "14 March 2026",
      location: "Global/UNESCO",
      commercial_potential: "Demand for math formulas, education assets, pi symbol vectors, bakery pie flatlays, and STEM education themes.",
      suggested_topics: ["math formulas", "pi symbol", "bakery pie", "stem education", "school learning"]
    },
    {
      name: "World Consumer Rights Day",
      date: "15 March 2026",
      location: "Global/World",
      commercial_potential: "Demand for quality guarantee tags, shopping cart safety illustrations, online payment protection, and customer service flatlays.",
      suggested_topics: ["quality guarantee", "online payment protection", "customer service", "shopping cart", "retail rights"]
    },
    {
      name: "St. Patrick's Day",
      date: "17 March 2026",
      location: "Ireland, USA, Global",
      commercial_potential: "Huge seasonal market for green beer mugs, shamrocks vectors, gold coin pots, Irish traditional pub flatlays, and green parades.",
      suggested_topics: ["green beer", "shamrock vector", "gold coins", "irish pub", "st patricks day"]
    },
    {
      name: "Nyepi / Balinese Day of Silence",
      date: "19 March 2026",
      location: "Indonesia (Bali)",
      commercial_potential: "Niche, high-value demand for tranquil night skies, starry constellation shots, Ogoh-ogoh parade statues, and peaceful meditation layouts.",
      suggested_topics: ["starry night sky", "ogoh ogoh parade", "meditation layout", "bali silence", "tranquility"]
    },
    {
      name: "Hari Raya Idul Fitri (Eid al-Fitr)",
      date: "20 March 2026",
      location: "Indonesia, Malaysia, Global/Islamic",
      commercial_potential: "Massive global demand for Ketupat weave illustrations, traditional Mudik travel photos, family gathering dinners, and Eid Mubarak greeting designs.",
      suggested_topics: ["ketupat weave", "mudik travel", "family gathering", "eid mubarak card", "traditional dress"]
    },
    {
      name: "Spring Equinox",
      date: "20 March 2026",
      location: "Northern Hemisphere",
      commercial_potential: "Strong demand for blooming cherry blossoms, garden preparation, fresh spring apparel lookbooks, and nature rebirth themes.",
      suggested_topics: ["blooming blossom", "spring garden", "spring apparel", "nature rebirth", "green forest"]
    },
    {
      name: "World Poetry Day",
      date: "21 March 2026",
      location: "Global/UNESCO",
      commercial_potential: "Quiet aesthetic demand for fountain pens on notebook paper, vintage typewriter closeups, ink splatters, and reading cozy spaces.",
      suggested_topics: ["fountain pen", "vintage typewriter", "ink splatter", "cozy reading space", "poetry journal"]
    },
    {
      name: "World Water Day",
      date: "22 March 2026",
      location: "Global/UN",
      commercial_potential: "Excellent potential for fresh water droplets, clean glass pours, plumbing utility workers, eco water filtration, and hydration health themes.",
      suggested_topics: ["water droplet", "eco water filtration", "hydration health", "plumbing worker", "clean water pour"]
    },
    {
      name: "Cherry Blossom Season (Sakura)",
      date: "late March 2026",
      location: "Japan, South Korea, USA",
      commercial_potential: "Incredible commercial request for pink cherry blossoms, families having picnics under sakura trees, and spring travel photography.",
      suggested_topics: ["cherry blossom", "sakura picnic", "spring travel", "tokyo street", "blossom branch"]
    },
    {
      name: "Holi Festival",
      date: "22-23 March 2026",
      location: "India, Global",
      commercial_potential: "Vast commercial volume for explosion of powder color splashes, friends covered in gulal color, energetic festival dancing, and joy.",
      suggested_topics: ["powder color splash", "gulal powder", "festival dancing", "holi joy", "colorful portraits"]
    }
  ],
  april: [
    {
      name: "April Fools' Day",
      date: "1 April 2026",
      location: "Global/World",
      commercial_potential: "Demand for comedy emojis, gag gift concepts, humorous office pranks, laughing faces, and playful cartoon graphics.",
      suggested_topics: ["comedy emoji", "office prank", "laughing face", "playful cartoon", "april fools"]
    },
    {
      name: "Good Friday",
      date: "3 April 2026",
      location: "Global/Christian",
      commercial_potential: "High demand for church services, cross silhouette against sunset, serene candle displays, and Easter communion concepts.",
      suggested_topics: ["cross silhouette", "church service", "candle display", "communion bread", "holy week"]
    },
    {
      name: "Easter Sunday",
      date: "5 April 2026",
      location: "Global/Christian",
      commercial_potential: "Extremely high commercial value for Easter egg hunt photos, colorful painted eggs, cute easter rabbits, spring brunch tables, and kids' joy.",
      suggested_topics: ["easter egg hunt", "painted egg", "easter rabbit", "spring brunch", "kids easter"]
    },
    {
      name: "World Health Day",
      date: "7 April 2026",
      location: "Global/WHO",
      commercial_potential: "High demand for medical checkup vectors, smiling doctors, fitness tracking watches, stethoscopes with green leaves, and healthy meal preps.",
      suggested_topics: ["medical checkup", "fitness tracker", "stethoscope leaf", "healthy meal prep", "smiling doctor"]
    },
    {
      name: "Songkran Water Festival",
      date: "13-15 April 2026",
      location: "Thailand",
      commercial_potential: "Fantastic potential for water splashes, water guns, smiling people in floral shirts, and traditional temple ritual water pouring.",
      suggested_topics: ["water splash", "water gun fight", "floral shirt", "temple ritual", "songkran celebration"]
    },
    {
      name: "World Heritage Day",
      date: "18 April 2026",
      location: "Global/UNESCO",
      commercial_potential: "Demand for landmark monuments, global travel maps, ancient architecture photography, and heritage conservation concepts.",
      suggested_topics: ["landmark monument", "global travel map", "ancient architecture", "heritage conservation", "historic landmark"]
    },
    {
      name: "Kartini Day",
      date: "21 April 2026",
      location: "Indonesia",
      commercial_potential: "High national demand for modern women in traditional Kebaya dress, professional female role models, and Indonesian heritage designs.",
      suggested_topics: ["kebaya dress", "indonesian heritage", "female role model", "traditional costume", "kartini day"]
    },
    {
      name: "Earth Day / International Mother Earth Day",
      date: "22 April 2026",
      location: "Global/UN",
      commercial_potential: "Very high demand for tree planting, environmental recycling icons, hands holding soil, renewable solar energy, and clear green globes.",
      suggested_topics: ["tree planting", "recycling icons", "solar energy", "globe in hands", "green environment"]
    },
    {
      name: "World Book and Copyright Day",
      date: "23 April 2026",
      location: "Global/UNESCO",
      commercial_potential: "High demand for student reading in library, stack of books vector, reading cozy lounge, copyright law assets, and paper crafts.",
      suggested_topics: ["student reading", "stack of books", "library study", "copyright law", "cozy lounge"]
    },
    {
      name: "Anzac Day",
      date: "25 April 2026",
      location: "Australia, New Zealand",
      commercial_potential: "High local demand for red poppy flower iconography, dawn service silhouettes, war memorial wreaths, and anzac biscuits.",
      suggested_topics: ["red poppy flower", "dawn service", "war memorial", "anzac biscuit", "remembrance wreath"]
    },
    {
      name: "King's Day / Koningsdag",
      date: "27 April 2026",
      location: "Netherlands",
      commercial_potential: "Strong demand for vibrant orange clothing, open air street market, canal boat parties, and Netherlands royal flag decoration.",
      suggested_topics: ["orange clothing", "street market", "canal boat party", "royal flag", "amsterdam canals"]
    },
    {
      name: "International Jazz Day",
      date: "30 April 2026",
      location: "Global/UNESCO",
      commercial_potential: "Demand for saxophone silhouette, retro neon jazz club sign, musicians playing double bass, brass instrument details, and music flyers.",
      suggested_topics: ["saxophone silhouette", "neon jazz club", "double bass player", "brass instrument", "music poster"]
    }
  ],
  may: [
    {
      name: "International Workers' Day / May Day",
      date: "1 May 2026",
      location: "Global/World",
      commercial_potential: "High demand for safety helmet vectors, union laborers, career banners, building site tools, and worker empowerment imagery.",
      suggested_topics: ["safety helmet", "union laborer", "career banner", "building tools", "workers day"]
    },
    {
      name: "World Press Freedom Day",
      date: "3 May 2026",
      location: "Global/UN",
      commercial_potential: "Demand for microphones and voice recorders, notepad with pen, journalists in action, media freedom concepts, and typography.",
      suggested_topics: ["journalism microphone", "voice recorder", "media freedom", "press badge", "newspaper stack"]
    },
    {
      name: "Cinco de Mayo",
      date: "5 May 2026",
      location: "Mexico, USA",
      commercial_potential: "Vibrant sales for taco plates, guacamole flatlays, mariachi hats, colorful serape patterns, pinatas, and margarita cocktails.",
      suggested_topics: ["taco platter", "guacamole", "mariachi hat", "serape pattern", "margarita cocktail", "pinata"]
    },
    {
      name: "Mother's Day",
      date: "10 May 2026",
      location: "Global/World",
      commercial_potential: "Extremely high commercial requirement for mother and daughter hugging, breakfast in bed trays, handmade mother's day cards, and bouquets of pink carnations.",
      suggested_topics: ["mother daughter hug", "breakfast in bed", "handmade card", "carnation bouquet", "family affection"]
    },
    {
      name: "Ascension Day of Jesus Christ",
      date: "14 May 2026",
      location: "Indonesia, Europe, Global",
      commercial_potential: "Local national holiday demand for church services, Christian cross graphics, serene sky backgrounds, and holy day announcements.",
      suggested_topics: ["church service", "christian cross", "serene sky", "holy day", "prayer time"]
    },
    {
      name: "International Museum Day",
      date: "18 May 2026",
      location: "Global/ICOM",
      commercial_potential: "Demand for classic gallery halls, museum curators guiding tours, modern exhibitions, classical statue museum interiors, and interactive exhibits.",
      suggested_topics: ["gallery hall", "museum guide", "modern exhibition", "classical statue", "interactive museum"]
    },
    {
      name: "Eid al-Adha (Hari Raya Haji / Qurban)",
      date: "27 May 2026",
      location: "Global/Islamic, Indonesia, Singapore",
      commercial_potential: "Extremely high value for goat/sheep qurban vector icons, Kaaba pilgrimage graphics, clean family festive clothing, and Eid Mubarak greetings.",
      suggested_topics: ["qurban goat sheep", "kaaba pilgrimage", "festive clothing", "eid al adha card", "traditional greeting"]
    },
    {
      name: "Vesak Day / Hari Waisak",
      date: "31 May 2026",
      location: "Global/Buddhist, Thailand, Indonesia",
      commercial_potential: "Strong demand for Buddha statue silhouettes, lotus flower vectors, lighting lanterns, Buddhist monks walking in temples, and serene layout.",
      suggested_topics: ["buddha statue", "lotus flower", "lighting lantern", "buddhist monk", "temple serenity"]
    },
    {
      name: "Memorial Day",
      date: "25 May 2026",
      location: "USA",
      commercial_potential: "Excellent potential for military graves poppy wreaths, american national flags, patriotic parade, family barbecues, and summer season startup.",
      suggested_topics: ["military cemetery", "american national flag", "patriotic parade", "backyard barbecue", "summer season"]
    },
    {
      name: "Cannes Film Festival",
      date: "12-23 May 2026",
      location: "France, Global",
      commercial_potential: "Commercial focus on red carpet spotlights, golden award vectors, paparazzi cameras, luxurious evening gowns, and film roll flatlays.",
      suggested_topics: ["red carpet", "golden award", "paparazzi camera", "evening gown", "film strip"]
    }
  ],
  june: [
    {
      name: "Global Day of Parents",
      date: "1 June 2026",
      location: "Global/UN",
      commercial_potential: "High demand for multiracial parents playing with kids, parents walking in sunset park, family care, and heartwarming illustrations.",
      suggested_topics: ["parents and kids", "sunset park", "family care", "loving parents", "heartwarming family"]
    },
    {
      name: "World Environment Day",
      date: "5 June 2026",
      location: "Global/UNEP",
      commercial_potential: "Extremely high request for organic recycling bags, eco green seedling growth, electric vehicle chargers, ocean cleanups, and green lifestyle.",
      suggested_topics: ["organic recycling bag", "seedling growth", "electric vehicle", "ocean cleanup", "green lifestyle"]
    },
    {
      name: "World Oceans Day",
      date: "8 June 2026",
      location: "Global/UN",
      commercial_potential: "Excellent potential for ocean coral reef life, marine biologist research, marine turtle protection, scuba cleanup crews, and waves.",
      suggested_topics: ["coral reef", "marine turtle", "scuba cleanup", "ocean waves", "underwater marine"]
    },
    {
      name: "World Blood Donor Day",
      date: "14 June 2026",
      location: "Global/WHO",
      commercial_potential: "Strong demand for blood bag vectors, doctor prep syringe, happy patient donors, blood drop icons, and community medical care.",
      suggested_topics: ["blood bag", "doctor syringe", "patient donor", "blood drop icon", "medical care"]
    },
    {
      name: "Father's Day",
      date: "21 June 2026",
      location: "Global/World",
      commercial_potential: "High demand for father and son outdoor camping, custom necktie greeting cards, tool box gifts, and daughters giving custom gifts.",
      suggested_topics: ["outdoor camping", "necktie card", "tool box gift", "father daughter", "dad portrait"]
    },
    {
      name: "Juneteenth",
      date: "19 June 2026",
      location: "USA",
      commercial_potential: "High demand for African American liberty flags, community parade, freedom quotes, historical education, and local unity events.",
      suggested_topics: ["juneteenth flag", "community parade", "freedom quotes", "african american", "unity event"]
    },
    {
      name: "Summer Solstice / Midsummer",
      date: "21 June 2026",
      location: "Northern Hemisphere",
      commercial_potential: "Huge demand for bonfire lighting, floral head crown girls, midnight sun photography, camping gear, and beach sunrise landscapes.",
      suggested_topics: ["bonfire lighting", "floral head crown", "midnight sun", "camping gear", "beach sunrise"]
    },
    {
      name: "International Yoga Day",
      date: "21 June 2026",
      location: "Global/UN",
      commercial_potential: "High demand for woman doing zen meditation on mountain, pink yoga mat flatlays, yoga studio lighting, and serene exercise models.",
      suggested_topics: ["zen meditation", "yoga mat flatlay", "yoga studio", "serene model", "mindful exercise"]
    },
    {
      name: "World Music Day / Fête de la Musique",
      date: "21 June 2026",
      location: "Global/World",
      commercial_potential: "Strong request for street acoustic guitar players, youth crowd concerts, vinyl records flatlays, and retro rock bands.",
      suggested_topics: ["street guitar player", "crowd concert", "vinyl record", "rock band", "musical instrument"]
    },
    {
      name: "Global Pride Month",
      date: "all June 2026",
      location: "Global/World",
      commercial_potential: "Massive commercial market for rainbow pride flag graphics, LGBTQ+ couples portraits, community street parade, and colorful banners.",
      suggested_topics: ["rainbow flag", "lgbtq couple", "street parade", "pride march", "colorful pride banner"]
    }
  ],
  july: [
    {
      name: "Canada Day",
      date: "1 July 2026",
      location: "Canada",
      commercial_potential: "High demand for maple leaf graphics, red and white flags, fireworks over city, backyard gatherings, and outdoor barbecues.",
      suggested_topics: ["maple leaf flag", "city fireworks", "backyard barbecue", "canadian parade", "red white outfits"]
    },
    {
      name: "Independence Day / 4th of July",
      date: "4 July 2026",
      location: "USA",
      commercial_potential: "Extremely high seasonal demand for stars and stripes, sparklers in hand, city spectacular fireworks, backyard burgers, and patriotic picnics.",
      suggested_topics: ["stars and stripes", "sparkler hand", "spectacular fireworks", "backyard burger", "patriotic picnic"]
    },
    {
      name: "World Population Day",
      date: "11 July 2026",
      location: "Global/UN",
      commercial_potential: "Demand for multi-ethnic global faces collages, density city crowds, world globe maps, and community demography infographics.",
      suggested_topics: ["multiethnic face", "city crowd", "world globe map", "community infographic", "demography"]
    },
    {
      name: "Bastille Day",
      date: "14 July 2026",
      location: "France",
      commercial_potential: "High demand for blue-white-red French tricolor flag graphics, Eiffel Tower fireworks, street parades, baguettes and croissants flatlays.",
      suggested_topics: ["french flag", "eiffel tower fireworks", "street parade", "croissant flatlay", "paris holiday"]
    },
    {
      name: "Islamic New Year (Tahun Baru Islam 1448H)",
      date: "16 July 2026",
      location: "Indonesia, Malaysia, Global/Islamic",
      commercial_potential: "Excellent potential for elegant mosque arches, islamic calendar illustrations, crescent moon graphics, and prayer beads (tasbih).",
      suggested_topics: ["mosque arch", "islamic calendar", "crescent moon", "tasbih prayer beads", "spiritual background"]
    },
    {
      name: "World Emoji Day",
      date: "17 July 2026",
      location: "Global/World",
      commercial_potential: "Strong commercial value for vector smiley icons, dynamic messaging app mockups, social media marketing flatlays, and cartoon faces.",
      suggested_topics: ["smiley icons", "messaging mockup", "social media flatlay", "cartoon faces", "emoji graphics"]
    },
    {
      name: "Nelson Mandela International Day",
      date: "18 July 2026",
      location: "Global/UN",
      commercial_potential: "Demand for inspirational social justice quote graphics, civil rights education, community volunteer work, and African solidarity icons.",
      suggested_topics: ["social justice quotes", "civil rights education", "volunteer work", "african solidarity", "equality advocate"]
    },
    {
      name: "Hari Asyura / Ashura",
      date: "25 July 2026",
      location: "Global/Islamic",
      commercial_potential: "Serene religious vector graphics, islamic history assets, fasting dates flatlay, and spiritual reflection.",
      suggested_topics: ["islamic history", "reflection", "serene mosque", "spiritual fasting", "traditional prayer"]
    },
    {
      name: "World Drowning Prevention Day",
      date: "25 July 2026",
      location: "Global/UN",
      commercial_potential: "Demand for professional beach lifeguards, red-orange rescue buoy rings, poolside safety signs, and outdoor swimming rules icons.",
      suggested_topics: ["beach lifeguard", "rescue buoy ring", "poolside safety sign", "swimming safety", "swimming pool guard"]
    },
    {
      name: "International Day of Friendship",
      date: "30 July 2026",
      location: "Global/UN",
      commercial_potential: "High commercial demand for diverse best friends taking selfies, campfire gatherings, holding hands concepts, and heartfelt group hugs.",
      suggested_topics: ["friends selfie", "campfire gathering", "holding hands", "group hug", "friendship concept"]
    },
    {
      name: "Summer Travel and Beach Vacation Vibe",
      date: "all July 2026",
      location: "Global/World",
      commercial_potential: "High continuous request for pool floats, tropical cocktails, sunglasses with sunscreen layout, turquoise ocean waves, and suitcase packing.",
      suggested_topics: ["pool float", "tropical cocktail", "sunscreen sunglasses", "ocean waves", "suitcase packing", "beach travel"]
    }
  ],
  august: [
    {
      name: "Singapore National Day",
      date: "9 August 2026",
      location: "Singapore",
      commercial_potential: "High demand for red and white Singapore flag decorations, skyline fireworks over Marina Bay, local parade photos, and heritage foods.",
      suggested_topics: ["singapore flag", "marina bay fireworks", "national day parade", "singapore skyline", "merlion icon"]
    },
    {
      name: "International Youth Day",
      date: "12 August 2026",
      location: "Global/UN",
      commercial_potential: "High value for young generation innovators, digital nomads working outdoors, skateboard park lifestyles, and collaborative youth activism.",
      suggested_topics: ["young innovators", "digital nomad", "skateboard lifestyle", "youth activism", "modern students"]
    },
    {
      name: "Independence Day of India",
      date: "15 August 2026",
      location: "India",
      commercial_potential: "Massive seasonal value for Indian flag flypasts, tricolor independence day banners, happy patriotic citizen graphics, and historical monuments.",
      suggested_topics: ["indian flag", "independence banner", "patriotic citizen", "historic monument", "india independence"]
    },
    {
      name: "Hari Kemerdekaan Republik Indonesia (17 Agustus)",
      date: "17 August 2026",
      location: "Indonesia",
      commercial_potential: "Incredible national demand for Panjat Pinang competitions, red-white flag raising ceremonies, local village sports, and Merdeka banners.",
      suggested_topics: ["panjat pinang", "red white flag raising", "village sports", "merdeka banner", "indonesian independence"]
    },
    {
      name: "World Photography Day",
      date: "19 August 2026",
      location: "Global/World",
      commercial_potential: "Strong demand for vintage cameras, photographers taking sunset landscape photos, flatlays of camera lens gear, and photo editing screens.",
      suggested_topics: ["vintage camera", "photographer sunset", "camera gear flatlay", "photo editing", "shutter dial"]
    },
    {
      name: "World Humanitarian Day",
      date: "19 August 2026",
      location: "Global/UN",
      commercial_potential: "Demand for international aid food box deliveries, global volunteer workers, red cross medical aid camps, and social care concepts.",
      suggested_topics: ["aid food box", "volunteer worker", "medical aid camp", "social care", "humanitarian helper"]
    },
    {
      name: "Mawlid al-Nabi (Maulid Nabi Muhammad)",
      date: "25 August 2026",
      location: "Indonesia, Global/Islamic",
      commercial_potential: "High demand for beautiful glowing green mosque lighting, Quran open pages, warm family gatherings, and Islamic festive invitations.",
      suggested_topics: ["mosque lighting", "quran open page", "family gathering", "islamic invitation", "maulid nabi"]
    },
    {
      name: "Women's Equality Day",
      date: "26 August 2026",
      location: "USA",
      commercial_potential: "Commercial focus on female leadership graphics, suffragette history assets, boardroom diversity, and women empowerment vectors.",
      suggested_topics: ["female leadership", "boardroom diversity", "women empowerment", "equality advocate", "feminist graphic"]
    },
    {
      name: "La Tomatina Festival",
      date: "26 August 2026",
      location: "Spain",
      commercial_potential: "Sensational stock visual value for massive crushed red tomato splash battles, crowds covered in red tomato pulp, and festive chaos.",
      suggested_topics: ["tomato splash battle", "tomato pulp crowd", "festive chaos", "buñol spain", "la tomatina"]
    },
    {
      name: "Back-To-School Season Starts",
      date: "all August 2026",
      location: "Global/World",
      commercial_potential: "Extremely high commercial requirement for school backpack flatlays, kids writing on blackboard, colorful school stationeries, and bus pickups.",
      suggested_topics: ["school backpack", "classroom blackboard", "school stationery", "school bus pickup", "back to school"]
    }
  ],
  september: [
    {
      name: "Labor Day",
      date: "7 September 2026",
      location: "USA, Canada",
      commercial_potential: "High demand for end-of-summer sales, beach closures, backyard grilling with family, local parades, and autumn seasonal clothing deals.",
      suggested_topics: ["labor day sale", "backyard grill", "family parade", "summer closure", "autumn clothing"]
    },
    {
      name: "International Literacy Day",
      date: "8 September 2026",
      location: "Global/UNESCO",
      commercial_potential: "Strong demand for elementary kids reading, stack of books vectors, digital tablet tutoring software, libraries, and book lovers flatlays.",
      suggested_topics: ["kids reading", "stack of books", "digital tutoring", "library book", "literacy concept"]
    },
    {
      name: "Rosh Hashanah (Jewish New Year)",
      date: "11-13 September 2026",
      location: "Israel, Global/Jewish",
      commercial_potential: "Demand for apple slices dipped in honey bowls, pomegranate fruits, traditional shofar horn blowing, and sweet holiday dinners.",
      suggested_topics: ["apple honey bowl", "pomegranate fruit", "shofar horn", "holiday dinner", "rosh hashanah"]
    },
    {
      name: "Yom Kippur",
      date: "20-21 September 2026",
      location: "Israel, Global/Jewish",
      commercial_potential: "Niche religious interest in white clothing prayer books, tallit prayer shawl, quiet synagogue interior candles, and fasting themes.",
      suggested_topics: ["white clothing prayer", "tallit prayer shawl", "synagogue candle", "fasting theme", "yom kippur"]
    },
    {
      name: "International Day of Peace",
      date: "21 September 2026",
      location: "Global/UN",
      commercial_potential: "Very high demand for white dove vectors, hands forming peace gestures, paper crane graphics, and multicultural unity concepts.",
      suggested_topics: ["white dove vector", "peace gesture", "paper crane", "multicultural unity", "peace day"]
    },
    {
      name: "Autumn Equinox",
      date: "22 September 2026",
      location: "Northern Hemisphere",
      commercial_potential: "High demand for warm orange falling maple leaves, pumpkin spice layouts, cozy knitted sweaters, apple cider, and autumn hiking.",
      suggested_topics: ["orange maple leaves", "pumpkin spice flatlay", "knitted sweater", "apple cider", "autumn hiking"]
    },
    {
      name: "National Day of Saudi Arabia",
      date: "23 September 2026",
      location: "Saudi Arabia",
      commercial_potential: "High demand for green Saudi flags decorations, modern Riyadh skyline fireworks, national day sales banners, and heritage food photos.",
      suggested_topics: ["saudi flag", "riyadh skyline", "national day sale", "riyadh fireworks", "saudi national day"]
    },
    {
      name: "Mid-Autumn Festival (Mooncake Festival)",
      date: "25 September 2026",
      location: "China, Singapore, East Asia",
      commercial_potential: "Massive commercial market for traditional sweet mooncakes on wooden trays, glowing lantern walks, family reunion dinner, and full moon background.",
      suggested_topics: ["traditional mooncake", "glowing lanterns", "family reunion dinner", "full moon night", "mid autumn festival"]
    },
    {
      name: "World Tourism Day",
      date: "27 September 2026",
      location: "Global/UNWTO",
      commercial_potential: "High demand for global passports and sunglasses, travel planning mobile app UI, flight ticket mockups, and backpack travel photos.",
      suggested_topics: ["passport sunglasses", "travel mobile app", "flight ticket mockup", "backpack travel", "world landmarks"]
    },
    {
      name: "Oktoberfest Starts",
      date: "mid September 2026",
      location: "Germany, Global",
      commercial_potential: "Huge seasonal potential for large foaming beer mugs, traditional Bavarian dirndl and lederhosen clothing, soft salty pretzels, and festival tents.",
      suggested_topics: ["foaming beer mug", "bavarian dirndl", "lederhosen dress", "salty pretzel", "oktoberfest tent"]
    }
  ],
  october: [
    {
      name: "International Coffee Day",
      date: "1 October 2026",
      location: "Global/World",
      commercial_potential: "Excellent continuous demand for coffee bean flatlays, latte art coffee pours, roasting beans closeups, cozy cafe shop windows, and espresso cups.",
      suggested_topics: ["coffee bean flatlay", "latte art pour", "coffee roasting", "cafe shop window", "espresso cup"]
    },
    {
      name: "Hari Batik Nasional",
      date: "2 October 2026",
      location: "Indonesia",
      commercial_potential: "High national demand for authentic batik pattern fabrics, corporate employees wearing modern batik shirt outfits, and cultural designs.",
      suggested_topics: ["batik fabric pattern", "corporate batik shirt", "indonesian batik", "cultural fashion", "java batik"]
    },
    {
      name: "Golden Week National Holiday",
      date: "1-7 October 2026",
      location: "China",
      commercial_potential: "High demand for golden week shopping discount banners, high-speed train travels, packing suitcases, and national holiday sales graphics.",
      suggested_topics: ["shopping discount banner", "high speed train travel", "packing suitcase", "national holiday sale", "tourism china"]
    },
    {
      name: "World Teachers' Day",
      date: "5 October 2026",
      location: "Global/UNESCO",
      commercial_potential: "Strong demand for happy teacher in classroom, thanking card layouts, school apples, teachers grading notebooks, and modern teaching tech.",
      suggested_topics: ["happy teacher", "thank you teacher", "classroom lesson", "notebook grading", "teaching technology"]
    },
    {
      name: "World Mental Health Day",
      date: "10 October 2026",
      location: "Global/WHO",
      commercial_potential: "High demand for green ribbon graphics, peaceful meditation poses, psychological therapy desks, mindfulness, and self-care flatlays.",
      suggested_topics: ["green ribbon concept", "peaceful meditation", "therapy session", "mindfulness self care", "supportive hand"]
    },
    {
      name: "Thanksgiving Day in Canada",
      date: "12 October 2026",
      location: "Canada",
      commercial_potential: "Strong seasonal market for family roasted turkey dinners, maple leaf dining table decors, autumn pumpkin pie, and harvest themes.",
      suggested_topics: ["roasted turkey dinner", "maple leaf table", "canadian thanksgiving", "pumpkin pie slice", "autumn harvest"]
    },
    {
      name: "World Food Day",
      date: "16 October 2026",
      location: "Global/FAO",
      commercial_potential: "High request for fresh organic vegetable baskets, sustainable food agriculture farming, hunger relief aid, and home cooking flatlays.",
      suggested_topics: ["organic vegetable basket", "sustainable farming", "hunger relief aid", "home cooking flatlay", "fresh ingredients"]
    },
    {
      name: "United Nations Day",
      date: "24 October 2026",
      location: "Global/UN",
      commercial_potential: "Demand for world flags circular icons, multicultural people shaking hands, international unity campaigns, and global maps.",
      suggested_topics: ["world flags circle", "multicultural shake hands", "international unity", "global map graphic", "diplomacy"]
    },
    {
      name: "Hari Sumpah Pemuda",
      date: "28 October 2026",
      location: "Indonesia",
      commercial_potential: "High demand for Indonesian youth holding red and white flags, youth pledge text layouts, patriotic youth groups, and heritage graphics.",
      suggested_topics: ["indonesian youth flag", "youth pledge text", "patriotic group", "red and white youth", "sumpah pemuda"]
    },
    {
      name: "Halloween",
      date: "31 October 2026",
      location: "Global/World",
      commercial_potential: "Sensational market for carved glowing jack o lanterns, spooky spiderweb backgrounds, kids in creative ghost outfits, and orange candy baskets.",
      suggested_topics: ["carved jack o lantern", "spooky spiderweb", "ghost outfit kids", "halloween candy", "trick or treat"]
    }
  ],
  november: [
    {
      name: "Día de los Muertos (Day of the Dead)",
      date: "1-2 November 2026",
      location: "Mexico, Latin America",
      commercial_potential: "Massive artistic demand for colorful painted sugar skull makeups, bright orange marigold flower arrangements, candlelit altars (ofrendas).",
      suggested_topics: ["painted sugar skull", "marigold flowers", "candlelit altar ofrenda", "mexican traditional holiday", "catrina makeup"]
    },
    {
      name: "Diwali / Deepavali (Festival of Lights)",
      date: "8 November 2026",
      location: "India, Singapore, Malaysia, Global",
      commercial_potential: "Colossal commercial potential for glowing clay diya lamps, colorful rangoli sand patterns, sparkling fireworks, family festive attire, and sweets.",
      suggested_topics: ["glowing clay diya", "colorful rangoli sand", "sparkling fireworks", "family festive attire", "indian sweets platter"]
    },
    {
      name: "Hari Pahlawan (National Heroes Day)",
      date: "10 November 2026",
      location: "Indonesia",
      commercial_potential: "Strong demand for historic bamboo spear vectors, red and white flag parade, patriotic veteran silhouettes, and national monument graphics.",
      suggested_topics: ["bamboo spear vector", "red white flag parade", "veteran silhouette", "national monument", "hero remembrance"]
    },
    {
      name: "Veterans Day / Remembrance Day",
      date: "11 November 2026",
      location: "USA, Canada, UK",
      commercial_potential: "High demand for military soldier silhouettes, red poppy flower badges, american veteran parades, and patriotic salute vectors.",
      suggested_topics: ["military soldier silhouette", "red poppy badge", "veteran parade", "patriotic salute", "poppy wreath"]
    },
    {
      name: "World Children's Day",
      date: "20 November 2026",
      location: "Global/UNICEF",
      commercial_potential: "High demand for kids playing joyfully in playground, handprints with watercolors, protective parents, and diverse kids smiling.",
      suggested_topics: ["kids playground joy", "watercolor handprints", "protective parenting", "diverse kids smiling", "children protection"]
    },
    {
      name: "Thanksgiving Day in USA",
      date: "26 November 2026",
      location: "USA",
      commercial_potential: "Incredible market value for roasting big turkey tables, family dining gratitude toast, pumpkin pies, cozy home dining, and warm lighting.",
      suggested_topics: ["roasting turkey table", "family gratitude toast", "pumpkin pie thanksgiving", "cozy dining room", "autumn dinner"]
    },
    {
      name: "Black Friday & Cyber Monday",
      date: "27-30 November 2026",
      location: "Global/World",
      commercial_potential: "Extremely high request for red retail discount banners, online delivery boxes, card checkout screen mockups, shopping bags, and fast courier shipping.",
      suggested_topics: ["retail discount banner", "online delivery box", "card checkout screen", "shopping bags flatlay", "cyber monday tech"]
    },
    {
      name: "Movember (Men's Health Awareness)",
      date: "all November 2026",
      location: "Global/World",
      commercial_potential: "Commercial demand for stylish moustache vectors, barber shop grooming flatlays, men's fitness workouts, and healthcare checklist assets.",
      suggested_topics: ["moustache vector", "barber shop grooming", "mens health workout", "mens healthcare checklist", "movember"]
    }
  ],
  december: [
    {
      name: "World AIDS Day",
      date: "1 December 2026",
      location: "Global/UN",
      commercial_potential: "High demand for red ribbon graphics, medical support groups, healthy lifestyle vectors, and healthcare awareness banners.",
      suggested_topics: ["red ribbon graphic", "medical support group", "healthy lifestyle vector", "aids awareness banner", "healthcare aid"]
    },
    {
      name: "Hanukkah (Festival of Lights)",
      date: "4-12 December 2026",
      location: "Global/Jewish",
      commercial_potential: "High demand for beautiful silver menorah candelabras, blue star of david patterns, traditional potato latkes platters, and wooden dreidels.",
      suggested_topics: ["menorah candelabra", "star of david blue", "potato latkes platter", "wooden dreidel", "hanukkah lighting"]
    },
    {
      name: "Human Rights Day",
      date: "10 December 2026",
      location: "Global/UN",
      commercial_potential: "High demand for raised hands vector art, globe with justice scales, equality campaigns, and community diversity graphics.",
      suggested_topics: ["raised hands vector", "justice scales globe", "equality campaign", "diversity graphic", "human rights"]
    },
    {
      name: "Hari Ibu (National Mother's Day)",
      date: "22 December 2026",
      location: "Indonesia",
      commercial_potential: "Massive national demand for mother and child portraits, warm flower gifts, heartwarming greeting cards, and family breakfast cooking.",
      suggested_topics: ["mother child portrait", "warm flower gift", "heartwarming card", "family breakfast", "hari ibu merdeka"]
    },
    {
      name: "Christmas Eve & Christmas Day",
      date: "24-25 December 2026",
      location: "Global/World",
      commercial_potential: "Peak global commercial value for decorated pine trees, glowing warm fireplace stockings, opening gift surprises, family christmas dinners, and gingerbread houses.",
      suggested_topics: ["decorated pine tree", "fireplace stockings", "opening gifts surprise", "christmas dinner table", "gingerbread house baking"]
    },
    {
      name: "Boxing Day",
      date: "26 December 2026",
      location: "UK, Canada, Australia",
      commercial_potential: "High seasonal demand for electronic retail sales promotions, long queues at mall counters, returns and exchanges, and boxing day packages.",
      suggested_topics: ["electronic retail sale", "mall checkout queue", "returns exchange", "boxing day parcel", "post holiday shopping"]
    },
    {
      name: "New Year's Eve",
      date: "31 December 2026",
      location: "Global/World",
      commercial_potential: "Immense demand for glowing gold number year graphics, sparkling fireworks above landmarks, champagne flute pours, and party glitters.",
      suggested_topics: ["gold new year graphics", "spectacular fireworks city", "champagne pour glass", "party glitter confetti", "nye countdown"]
    },
    {
      name: "Winter Sports & Cold Climate Scenic",
      date: "all December 2026",
      location: "Global/World",
      commercial_potential: "High demand for cozy winter wood cabin, warm winter socks drinking cocoa, snowy evergreen forest landscapes, and skiing setups.",
      suggested_topics: ["cozy wood cabin", "winter socks cocoa", "snowy forest landscape", "skiing snow setup", "frozen winter lake"]
    }
  ]
};
