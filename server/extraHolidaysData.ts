export interface ExtraHolidayEvent {
  name: string;
  date: string;
  location: string;
  commercial_potential: string;
  suggested_topics: string[];
}

export const EXTRA_HOLIDAYS_DATA: Record<string, ExtraHolidayEvent[]> = {
  january: [
    {
      name: "Global Family Day",
      date: "1 January 2026",
      location: "Global",
      commercial_potential: "Warm lifestyle illustrations of multi-generational families sharing healthy breakfasts, warm embraces, and cozy indoor home activities.",
      suggested_topics: ["family breakfast", "multigenerational home", "cozy lifestyle", "family hug", "warm home"]
    },
    {
      name: "National Science Fiction Day",
      date: "2 January 2026",
      location: "USA, Global",
      commercial_potential: "High demand for futuristic neon-lit cityscapes, humanoid AI robot models, spacecraft travel, and sci-fi cosplay costume portraits.",
      suggested_topics: ["sci fi city", "neon robot", "spacecraft travel", "cyberspace vector", "futuristic tech"]
    },
    {
      name: "World Religion Day",
      date: "18 January 2026",
      location: "Global",
      commercial_potential: "Interfaith harmony illustrations, handshakes of global diverse religious communities, spiritual symbols of peace and tolerance.",
      suggested_topics: ["interfaith harmony", "religious symbols", "global peace", "spiritual unity", "tolerance banner"]
    },
    {
      name: "International Day of Clean Energy",
      date: "26 January 2026",
      location: "Global/UN",
      commercial_potential: "Strong demand for blue solar panel flatlays, turning wind turbine hills, electric car chargers, and clean green eco technology.",
      suggested_topics: ["solar panel flatlay", "wind turbine hill", "electric car charger", "clean eco tech", "green energy"]
    },
    {
      name: "Harbin Ice and Snow Festival",
      date: "5 January 2026",
      location: "China",
      commercial_potential: "Spectacular ice and snow sculptures with colorful nighttime lights, winter tourism adventure, and cold climate traveling lifestyle.",
      suggested_topics: ["ice sculpture", "winter tourism", "snow palace", "cold adventure", "harbin travel"]
    }
  ],
  february: [
    {
      name: "Groundhog Day",
      date: "2 February 2026",
      location: "USA, Canada",
      commercial_potential: "Winter-to-spring predictions, shadow silhouettes, and cozy early morning outdoor outerwear.",
      suggested_topics: ["groundhog prediction", "shadow silhouette", "early morning outdoor", "winter to spring", "weather forecast"]
    },
    {
      name: "World Wetlands Day",
      date: "2 February 2026",
      location: "Global/UN",
      commercial_potential: "Scenic swamp landscapes, green biodiversity, eco-tourism, and fresh water preservation illustrations.",
      suggested_topics: ["wetlands landscape", "biodiversity", "eco tourism", "fresh water preservation", "nature reserve"]
    },
    {
      name: "Safer Internet Day",
      date: "10 February 2026",
      location: "Global",
      commercial_potential: "Parental control screens, secure web browsing illustrations, online safety for kids vectors, and cyber protection.",
      suggested_topics: ["parental control", "secure browsing", "online safety kids", "cyber protection", "data security"]
    },
    {
      name: "National Pizza Day",
      date: "9 February 2026",
      location: "Global/US",
      commercial_potential: "Wood-fired pizza ovens, stringy cheese pulls, restaurant kitchen backgrounds, and family pizza nights.",
      suggested_topics: ["wood fired pizza", "cheese pull", "pizzeria kitchen", "family pizza night", "mozzarella"]
    },
    {
      name: "International Polar Bear Day",
      date: "27 February 2026",
      location: "Global",
      commercial_potential: "Arctic wildlife photography, climate change icons, melting icecaps concepts, and polar bear families.",
      suggested_topics: ["arctic wildlife", "climate change concept", "melting icecap", "polar bear family", "glacier preservation"]
    }
  ],
  march: [
    {
      name: "Employee Appreciation Day",
      date: "6 March 2026",
      location: "USA, Global",
      commercial_potential: "Corporate teamwork, managers giving gifts and thanking staff, high morale office sessions, and award graphics.",
      suggested_topics: ["employee gift", "corporate teamwork", "manager thanks staff", "office high morale", "business recognition"]
    },
    {
      name: "International Day of Happiness",
      date: "20 March 2026",
      location: "Global/UN",
      commercial_potential: "Bright smiling group portraits, yellow balloons, joyful jumps, and uplifting lifestyle visuals.",
      suggested_topics: ["smiling group portrait", "yellow balloon", "joyful jump", "uplifting lifestyle", "happiness concept"]
    },
    {
      name: "World Oral Health Day",
      date: "20 March 2026",
      location: "Global",
      commercial_potential: "Pediatric dentistry, clean teeth models, toothpaste flatlays, and dental hygiene icons.",
      suggested_topics: ["pediatric dentistry", "clean teeth model", "toothpaste flatlay", "dental hygiene", "healthy smile"]
    },
    {
      name: "Earth Hour",
      date: "28 March 2026",
      location: "Global",
      commercial_potential: "Candle-lit cozy rooms, turned-off city skylines, energy saving icons, and green lifestyle illustrations.",
      suggested_topics: ["candle lit room", "dark city skyline", "energy saving icon", "green lifestyle", "climate action"]
    },
    {
      name: "National Doctors' Day",
      date: "30 March 2026",
      location: "Global/US",
      commercial_potential: "Medical stethoscopes, clinic staff posing confidently, and medical research lab backgrounds.",
      suggested_topics: ["stethoscope check", "doctors confident pose", "clinical research", "healthcare worker", "medical team"]
    }
  ],
  april: [
    {
      name: "World Autism Awareness Day",
      date: "2 April 2026",
      location: "Global/UN",
      commercial_potential: "Colorful puzzle piece graphics, hands holding in solidarity, and inclusive classroom learning activities.",
      suggested_topics: ["puzzle piece graphic", "hands holding solidarity", "inclusive classroom", "neurodiversity", "acceptance banner"]
    },
    {
      name: "World Art Day",
      date: "15 April 2026",
      location: "Global/UNESCO",
      commercial_potential: "Oil paint splatters, easel setups, artists painting in studios, and creative workshops.",
      suggested_topics: ["oil paint splatter", "easel setup", "artist studio", "creative workshop", "fine art painting"]
    },
    {
      name: "National Pet Day",
      date: "11 April 2026",
      location: "Global",
      commercial_potential: "Happy dogs and cats playing, veterinary checkup diagnostics, and organic pet food bowls.",
      suggested_topics: ["happy dog cat", "veterinary checkup", "pet food bowl", "dog grooming", "animal friendship"]
    },
    {
      name: "Poila Baisakh (Bengali New Year)",
      date: "14 April 2026",
      location: "India, Bangladesh",
      commercial_potential: "Traditional red-white sarees, festive sweet boxes, community folk parades, and cultural kolam drawings.",
      suggested_topics: ["red white saree", "bengali sweet box", "folk parade", "cultural kolam", "new year festival"]
    },
    {
      name: "Spring Cleaning Season",
      date: "all April 2026",
      location: "Global",
      commercial_potential: "Vacuuming carpets, washing high windows, organic cleaning sprays, and neatly organized cupboards.",
      suggested_topics: ["vacuum carpet", "wash window", "organic cleaning spray", "tidy cupboard", "home organization"]
    }
  ],
  may: [
    {
      name: "World Red Cross Day",
      date: "8 May 2026",
      location: "Global",
      commercial_potential: "First aid training kits, blood donation boxes, humanitarian volunteers, and emergency assistance symbols.",
      suggested_topics: ["first aid kit", "blood donation box", "humanitarian volunteer", "emergency help", "red cross support"]
    },
    {
      name: "World Bee Day",
      date: "20 May 2026",
      location: "Global/UN",
      commercial_potential: "Golden honeycomb structures, wild bees pollinating flowers, and sustainable beekeeping protective suits.",
      suggested_topics: ["golden honeycomb", "bee on flower", "beekeeping suit", "sustainable honey", "ecosystem protector"]
    },
    {
      name: "International Day for Biological Diversity",
      date: "22 May 2026",
      location: "Global/UN",
      commercial_potential: "Lush green rainforest canopies, diverse wild animal illustrations, and eco-research imagery.",
      suggested_topics: ["rainforest canopy", "wild animal illustrations", "eco research", "green biodiversity", "flora fauna"]
    },
    {
      name: "World No Tobacco Day",
      date: "31 May 2026",
      location: "Global/WHO",
      commercial_potential: "Broken cigarette vectors, clean healthy lung graphics, and fitness motivation illustrations.",
      suggested_topics: ["broken cigarette", "healthy lung graphic", "fitness motivation", "quit smoking", "anti tobacco campaign"]
    },
    {
      name: "Graduation Season Begins",
      date: "late May 2026",
      location: "Global",
      commercial_potential: "Graduation caps thrown in air, diplomas held proudly, and happy family celebration dinners.",
      suggested_topics: ["graduation cap toss", "diploma proud pose", "family dinner party", "college graduate", "academic success"]
    },
    {
      name: "World Turtle Day",
      date: "23 May 2026",
      location: "Global",
      commercial_potential: "Sea turtles swimming underwater, beach cleanups, and eco-friendly conservation graphics.",
      suggested_topics: ["sea turtle swim", "beach cleanup", "ocean conservation", "wildlife protector", "turtle icon"]
    }
  ],
  june: [
    {
      name: "World Bicycle Day",
      date: "3 June 2026",
      location: "Global/UN",
      commercial_potential: "City bicycle commuters, green transport lanes, mountain biking tracks, and eco-friendly urban transit vectors.",
      suggested_topics: ["city bicycle commuter", "green transit lane", "mountain bike track", "eco urban transit", "healthy cycling"]
    },
    {
      name: "World Food Safety Day",
      date: "7 June 2026",
      location: "Global/WHO",
      commercial_potential: "Commercial kitchen sanitizing, lab safety tests on fresh food, and handwashing health posters.",
      suggested_topics: ["kitchen sanitizing", "food lab test", "handwashing poster", "hygiene standards", "safe eating"]
    },
    {
      name: "Micro-, Small and Medium-Sized Enterprises Day",
      date: "27 June 2026",
      location: "Global/UN",
      commercial_potential: "Local bakery owners, custom tailor shops, small business tech integration, and neighborhood deliveries.",
      suggested_topics: ["local bakery owner", "tailor shop", "small business technology", "neighborhood delivery", "entrepreneurship"]
    },
    {
      name: "Dragon Boat Festival (Duanwu)",
      date: "19 June 2026",
      location: "China, Singapore, Global",
      commercial_potential: "Thrilling dragon boat races, sticky rice dumplings (zongzi) wrapped in bamboo leaves, and cultural ornaments.",
      suggested_topics: ["dragon boat racing", "rice dumpling zongzi", "bamboo leaves food", "cultural festival", "paddlers teamwork"]
    },
    {
      name: "Summer Weddings & Bridal Season",
      date: "all June 2026",
      location: "Global",
      commercial_potential: "Wedding ring closeups, elegant white bridal gowns, outdoor garden ceremony setups, and champagne toasts.",
      suggested_topics: ["wedding ring closeup", "white bridal gown", "garden wedding setup", "champagne toast", "romantic marriage"]
    }
  ],
  july: [
    {
      name: "World Chocolate Day",
      date: "7 July 2026",
      location: "Global",
      commercial_potential: "Melting dark chocolate splashes, premium cocoa bean piles, handmade chocolate truffles, and holiday baking.",
      suggested_topics: ["melting dark chocolate", "cocoa bean pile", "handmade chocolate truffle", "sweet dessert baking", "chocolatier"]
    },
    {
      name: "World Youth Skills Day",
      date: "15 July 2026",
      location: "Global/UN",
      commercial_potential: "Hands-on vocational training, engineering apprenticeships, and young carpenters or coders in action.",
      suggested_topics: ["vocational training", "engineering apprentice", "young coder office", "craftsman workshop", "skills development"]
    },
    {
      name: "World Brain Day",
      date: "22 July 2026",
      location: "Global",
      commercial_potential: "Mental wellness icons, brain scan graphics, puzzle logic vectors, and concentration/memory exercise illustrations.",
      suggested_topics: ["mental wellness", "brain scan graphic", "puzzle logic vector", "memory exercise", "cognitive health"]
    },
    {
      name: "International Tiger Day",
      date: "29 July 2026",
      location: "Global",
      commercial_potential: "Majestic tigers in natural habitats, wildlife reservation photo shoots, and wild cat conservation campaigns.",
      suggested_topics: ["majestic tiger habitat", "wildlife reservation", "tiger conservation", "bengal tiger", "endangered species protective"]
    },
    {
      name: "Ice Cream Social Season",
      date: "all July 2026",
      location: "Global",
      commercial_potential: "Crispy waffle cones with dripping ice cream scoops, colorful scoopers, and kids enjoying cold summer treats.",
      suggested_topics: ["dripping ice cream cone", "colorful scoopers", "kids summer treat", "gelato flatlay", "sweet scoop"]
    }
  ],
  august: [
    {
      name: "International Day of the World's Indigenous Peoples",
      date: "9 August 2026",
      location: "Global/UN",
      commercial_potential: "Traditional clothing and arts, global native cultural celebrations, and heritage conservation banners.",
      suggested_topics: ["traditional indigenous art", "native cultural celebration", "heritage conservation", "ethnic diversity", "global tribes"]
    },
    {
      name: "World Elephant Day",
      date: "12 August 2026",
      location: "Global",
      commercial_potential: "African elephants bathing in rivers, sanctuary tourism, and giant wildlife conservation photography.",
      suggested_topics: ["elephant river bath", "sanctuary tourism", "wildlife photography", "elephant preservation", "savannah giant"]
    },
    {
      name: "International Left-Handers Day",
      date: "13 August 2026",
      location: "Global",
      commercial_potential: "Left-handed writing, custom office scissors for lefties, and left-handed guitarists.",
      suggested_topics: ["left handed writing", "lefty scissor", "left handed guitarist", "office desk setup", "unique skill"]
    },
    {
      name: "National Aviation Day",
      date: "19 August 2026",
      location: "USA, Global",
      commercial_potential: "Commercial airplane cockpits, planes flying above clouds, airport runway lights, and pilot gear.",
      suggested_topics: ["airplane cockpit", "plane above clouds", "runway lights", "pilot sunglasses", "aviation history"]
    },
    {
      name: "International Dog Day",
      date: "26 August 2026",
      location: "Global",
      commercial_potential: "Golden retrievers playing in gardens, pet food product styling, and professional dog grooming services.",
      suggested_topics: ["golden retriever garden", "pet food styling", "dog grooming service", "man's best friend", "happy puppy"]
    }
  ],
  september: [
    {
      name: "Teachers' Day in India",
      date: "5 September 2026",
      location: "India",
      commercial_potential: "Happy students gifting flowers, class whiteboard thank-you messages, and classroom mentorship scenes.",
      suggested_topics: ["student flower gift", "whiteboard thank you", "classroom mentor", "indian school", "teacher gratitude"]
    },
    {
      name: "World First Aid Day",
      date: "12 September 2026",
      location: "Global",
      commercial_potential: "Emergency bandages, first aid box medical flatlays, and CPR training mannequin setups.",
      suggested_topics: ["emergency bandage", "first aid flatlay", "cpr training", "medical emergency kit", "paramedic nurse"]
    },
    {
      name: "World Ozone Day",
      date: "16 September 2026",
      location: "Global/UN",
      commercial_potential: "Earth atmosphere graphics, eco-friendly protection badges, and green clean air campaign banners.",
      suggested_topics: ["earth atmosphere", "eco protection badge", "clean air campaign", "climate save", "ozone layer"]
    },
    {
      name: "World Heart Day",
      date: "29 September 2026",
      location: "Global/WHF",
      commercial_potential: "Heart-rate tracking smartwatches, cardiovascular exercises, and doctors holding red heart icons.",
      suggested_topics: ["heart rate tracker", "cardio exercise gym", "red heart icon doctor", "stethoscopes checkup", "healthy lifestyle"]
    },
    {
      name: "Autumn Home Decoration & Warm Cozy Vibe",
      date: "all September 2026",
      location: "Global",
      commercial_potential: "Pumpkin room decorations, scented soy candles, thick soft pillows, and warm ambient indoor lighting.",
      suggested_topics: ["pumpkin room decoration", "scented soy candle", "soft pillow couch", "warm ambient lighting", "cozy autumn interior"]
    }
  ],
  october: [
    {
      name: "International Day of Older Persons",
      date: "1 October 2026",
      location: "Global/UN",
      commercial_potential: "Active grandparents playing with grandchildren, digital tablet tutorial sessions for seniors, and healthy elderly exercise.",
      suggested_topics: ["grandparents playing grandkids", "senior tablet tutorial", "elderly health exercise", "active aging", "retirement lifestyle"]
    },
    {
      name: "World Animal Day",
      date: "4 October 2026",
      location: "Global",
      commercial_potential: "Animal shelter pet adoptions, veterinary diagnostics, and diverse wildlife conservation graphics.",
      suggested_topics: ["shelter pet adoption", "veterinary diagnostics", "wildlife conservation", "cat adoption", "animal welfare"]
    },
    {
      name: "World Space Week",
      date: "4-10 October 2026",
      location: "Global",
      commercial_potential: "Deep space observatory telescopes, complex galaxy vector art, and space shuttle launching pads.",
      suggested_topics: ["observatory telescope", "galaxy vector art", "space shuttle launch", "cosmic galaxy", "astronomy science"]
    },
    {
      name: "International Day of the Girl Child",
      date: "11 October 2026",
      location: "Global/UN",
      commercial_potential: "Young girls learning to code on laptops, active youth sports teams, and modern classroom leadership illustrations.",
      suggested_topics: ["girl coding laptop", "youth sport team", "classroom leader", "girl empowerment", "education right"]
    },
    {
      name: "International Artists Day",
      date: "25 October 2026",
      location: "Global",
      commercial_potential: "Palette knives, acrylic paint tube flatlays, art gallery exhibitions, and abstract canvas painters.",
      suggested_topics: ["palette knife painting", "acrylic tube flatlay", "gallery exhibition", "abstract painter canvas", "creative artist"]
    }
  ],
  november: [
    {
      name: "World Science Day for Peace and Development",
      date: "10 November 2026",
      location: "Global/UNESCO",
      commercial_potential: "High-tech lab microscopes, green energy clean solutions, and futuristic biology researchers.",
      suggested_topics: ["lab microscope", "green clean energy", "biology researcher", "science development", "scientific experiment"]
    },
    {
      name: "World Kindness Day",
      date: "13 November 2026",
      location: "Global",
      commercial_potential: "Community charity and volunteering acts, supportive warm smiles, and heart-shaped gift illustrations.",
      suggested_topics: ["community volunteering", "supportive smile", "heart gift illustration", "kindness act", "human connection"]
    },
    {
      name: "International Men's Day",
      date: "19 November 2026",
      location: "Global",
      commercial_potential: "Father-son quality time bonding, male mental health support sessions, and professional modern business portraits.",
      suggested_topics: ["father son bond", "men mental health", "business portrait", "paternity leave", "healthy manhood"]
    },
    {
      name: "Loy Krathong Lantern Festival",
      date: "24 November 2026",
      location: "Thailand",
      commercial_potential: "Traditional floating flower krathongs, sparkling candlelights on river surfaces, and beautiful golden lantern launches.",
      suggested_topics: ["floating flower krathong", "candlelight river", "golden lantern launch", "thailand festival", "cultural lights"]
    },
    {
      name: "Cozy Winter Wardrobe Transition",
      date: "all November 2026",
      location: "Northern Hemisphere",
      commercial_potential: "Thick wool winter coats, leather boots, soft knit scarves, and walking in light falling snow.",
      suggested_topics: ["wool winter coat", "leather boots walk", "soft knit scarf", "falling snow walk", "cozy winter fashion"]
    },
    {
      name: "St. Andrew's Day",
      date: "30 November 2026",
      location: "Scotland, UK",
      commercial_potential: "Blue and white Scottish saltire flags, traditional bagpipe players, and purple thistle icons.",
      suggested_topics: ["scottish saltire flag", "bagpipe player", "scottish thistle icon", "edinburgh castle", "scotland culture"]
    }
  ],
  december: [
    {
      name: "International Day of Persons with Disabilities",
      date: "3 December 2026",
      location: "Global/UN",
      commercial_potential: "Wheelchair sports champions, office accessibility adaptations, smart braille reading tech, and inclusivity illustrations.",
      suggested_topics: ["wheelchair athlete", "office accessibility", "braille reader tech", "inclusivity vector", "equal opportunity"]
    },
    {
      name: "World Soil Day",
      date: "5 December 2026",
      location: "Global/UN",
      commercial_potential: "Rich dark soil with fresh seedlings, agricultural organic composting, and sustainable farming soil diagnostics.",
      suggested_topics: ["soil seedling", "organic compost", "sustainable farming", "earth soil health", "agriculture study"]
    },
    {
      name: "International Mountain Day",
      date: "11 December 2026",
      location: "Global/UN",
      commercial_potential: "Snow-capped mountain peaks, trekking trails, alpine log cabins, and mountain adventure tourism.",
      suggested_topics: ["snow capped peak", "trekking trail", "alpine log cabin", "mountain adventure", "winter peak view"]
    },
    {
      name: "Kwanzaa Celebrations",
      date: "26 December 2026 - 1 January 2027",
      location: "USA, Global",
      commercial_potential: "Glowing kinara candelabras with red-green-black candles, traditional fruits baskets, and cultural unity flags.",
      suggested_topics: ["kinara candelabra", "red green black candle", "fruits basket kwanzaa", "cultural unity flag", "african heritage"]
    },
    {
      name: "Cozy Cabin Getaways & Alpine Tourism",
      date: "all December 2026",
      location: "Global",
      commercial_potential: "Glazed A-frame mountain cabins, enjoying steaming hot cocoa by frozen windows, and pristine snow-covered evergreen forests.",
      suggested_topics: ["a frame cabin snow", "hot cocoa window", "snowy evergreen forest", "cozy winter retreat", "alpine tourism"]
    },
    {
      name: "Gingerbread House & Holiday Baking Season",
      date: "all December 2026",
      location: "Global",
      commercial_potential: "Rolling pins with festive cookie cutters, gingerbread cookie icing decorations, and kids baking together.",
      suggested_topics: ["gingerbread house bake", "cookie cutter flatlay", "icing icing decoration", "kids baking holiday", "christmas kitchen"]
    }
  ]
};
