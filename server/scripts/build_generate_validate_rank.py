"""
METAZO — Generate Broadly, Validate Strictly, Rank Commercially
Tiga fase pipeline keyword:
  1. GENERATE BROADLY — AI diminta menghasilkan kandidat 50% lebih banyak
  2. VALIDATE STRICTLY — hanya keyword dengan visual grounding + search intent lolos
  3. RANK COMMERCIALLY — urutkan berdasarkan commercial search intent buyer
"""

file_path = "/data/metazo/MetaZo-Update--main/server/gemini.ts"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# ========================================================================
# 1. INCREASE AI BUFFER: +10 -> +50% agar GENERATE BROADLY
# ========================================================================

code = code.replace(
    "const aiRequestCount = targetCount + 10; // Buffer +10 agar array tetap gemuk setelah deduplikasi",
    "const aiRequestCount = Math.round(targetCount * 1.5); // GENERATE BROADLY: Buffer +50% agar AI menghasilkan banyak kandidat sebelum validasi ketat"
)

# Also fix batch variant
code = code.replace(
    "const aiRequestCount = targetCount   // Rules for keywords depending on keywordMode for batch",
    "const aiRequestCount = Math.round(targetCount * 1.5); // GENERATE BROADLY batch: buffer +50%"
)

# ========================================================================
# 2. BUILD VALIDATION ENGINE — VISUAL GROUNDING + SEARCH INTENT
# ========================================================================

validation_engine = """
// ============================================================================
// PHASE 2: VALIDATE STRICTLY — Keyword Validation Engine
// Prinsip: "Hanya keyword yang benar-benar didukung visual + punya search
//          intent yang masuk akal yang lolos ke output akhir."
// ============================================================================

/**
 * Dataset kata/frasa yang memiliki SEARCH INTENT nyata dari buyer komersial.
 * Keyword yang tidak masuk kategori ini atau tidak grounded secara visual akan ditolak.
 */
const VALID_SEARCH_INTENT_PATTERNS: { pattern: RegExp; weight: number; label: string }[] = [
  // Core subject nouns (weight tertinggi — buyer mencari ini langsung)
  { pattern: /^(animal|bird|fish|insect|flower|tree|fruit|vegetable|food|drink|person|man|woman|child|baby|dog|cat|horse|car|motorcycle|bicycle|boat|plane|house|building|bridge|road|mountain|river|lake|ocean|beach|forest|sky|sun|moon|star|cloud|rain|snow|wind|fire|water|earth|stone|wood|metal|glass|paper|fabric|leather|plastic|rubber|gold|silver|bronze|iron|steel|copper|diamond|crystal|pearl|coral|shell|feather|fur|scale|leaf|petal|seed|root|branch|trunk|vine|grass|moss|fungus|mushroom|coral|algae|bacteria|virus|cell|dna|atom|molecule|crystal|liquid|gas|plasma|energy|light|shadow|color|pattern|texture|shape|form|line|curve|angle|edge|surface|volume|space|time|motion|force|gravity|magnetism|electricity|sound|music|voice|noise|silence|smell|taste|touch|temperature|pressure|pain|pleasure|emotion|thought|memory|dream|idea|concept|theory|fact|truth|lie|story|myth|legend|history|future|past|present|reality|fantasy|fiction|science|art|philosophy|religion|politics|economics|culture|society|family|friend|enemy|stranger|lover|partner|team|group|crowd|audience|market|customer|client|user|player|student|teacher|doctor|nurse|engineer|artist|musician|writer|actor|director|producer|manager|leader|boss|worker|employee|volunteer|citizen|immigrant|tourist|traveler|explorer|adventurer|hero|villain|victim|survivor|witness|suspect|criminal|police|soldier|firefighter|pilot|driver|captain|chef|waiter|barista|baker|butcher|farmer|gardener|fisher|hunter|miner|builder|carpenter|plumber|electrician|painter|sculptor|potter|weaver|tailor|designer|architect|programmer|developer|analyst|consultant|coach|trainer|mentor|advisor|expert|specialist|professional|amateur|beginner|novice|master|veteran|senior|junior|adult|teenager|child|infant|elder|ancestor|descendant|relative|neighbor|colleague|competitor|ally|opponent|rival|partner|spouse|parent|sibling|cousin|uncle|aunt|nephew|niece|grandparent|grandchild)$/, weight: 100, label: 'core-subject' },

  // High-volume commercial compound phrases (buyer search queries)
  { pattern: /^(business|office|corporate|workplace|meeting|conference|presentation|seminar|workshop|training|classroom|lecture|exam|graduation|ceremony|celebration|festival|holiday|vacation|travel|trip|journey|tour|excursion|adventure|expedition|campaign|mission|project|task|assignment|goal|target|objective|strategy|plan|schedule|timeline|deadline|budget|report|analysis|research|study|survey|experiment|test|trial|evaluation|review|audit|inspection|check|quality|performance|efficiency|productivity|innovation|creativity|solution|improvement|optimization|transformation|revolution|evolution|growth|development|progress|advancement|achievement|success|victory|triumph|breakthrough|discovery|invention|creation|design|engineering|technology|science|medicine|health|wellness|fitness|nutrition|diet|exercise|sport|game|competition|championship|tournament|race|match|contest|challenge|achievement|record|medal|trophy|award|prize|recognition|honor|respect|trust|loyalty|commitment|dedication|passion|enthusiasm|motivation|inspiration|aspiration|ambition|vision|mission|purpose|meaning|value|principle|ethic|moral|standard|quality|excellence|perfection|mastery|skill|talent|ability|capability|potential|opportunity|possibility|future|trend|change|shift|transition|adaptation|transformation|disruption|revolution|evolution|innovation|breakthrough|milestone|landmark|benchmark|indicator|metric|measurement|assessment|evaluation|analysis|review|feedback|insight|wisdom|knowledge|understanding|awareness|consciousness|mindfulness|focus|concentration|attention|perception|cognition|intelligence|wisdom|learning|education|training|development|growth|progress|improvement|advancement|evolution|maturity|experience|expertise|specialization|professionalism|leadership|management|administration|coordination|organization|planning|execution|implementation|operation|maintenance|support|service|assistance|guidance|counseling|coaching|mentoring|teaching|instruction|direction|supervision|oversight|control|regulation|compliance|governance|policy|procedure|protocol|standard|guideline|framework|structure|system|process|workflow|pipeline|infrastructure|architecture|platform|ecosystem|network|community|society|culture|civilization|humanity|world|planet|earth|nature|environment|ecology|climate|weather|season|atmosphere|universe|cosmos|galaxy|star|planet|moon|asteroid|comet|meteor|nebula|black hole|wormhole|dimension|reality|existence|life|death|birth|creation|destruction|transformation|cycle|balance|harmony|chaos|order|entropy|energy|matter|force|field|wave|particle|quantum|relativity|gravity|electromagnetism|radiation|light|sound|heat|cold|temperature|pressure|density|volume|mass|weight|speed|velocity|acceleration|momentum|inertia|resistance|friction|tension|compression|expansion|contraction|vibration|oscillation|resonance|frequency|amplitude|wavelength|phase|polarization|diffraction|refraction|reflection|absorption|emission|transmission|conduction|convection|radiation|insulation|isolation|integration|connection|relation|interaction|communication|collaboration|cooperation|coordination|synchronization|alignment|integration|unification|consolidation|merger|acquisition|partnership|alliance|coalition|federation|union|association|organization|institution|corporation|company|enterprise|business|startup|venture|investment|finance|banking|insurance|accounting|auditing|taxation|regulation|compliance|legal|law|justice|rights|freedom|liberty|equality|diversity|inclusion|accessibility|sustainability|conservation|preservation|protection|safety|security|privacy|confidentiality|integrity|authenticity|transparency|accountability|responsibility|ethics|morality|values|principles|standards|norms|rules|regulations|laws|policies|procedures|protocols|guidelines|frameworks|structures|systems|processes|workflows|pipelines|operations|functions|services|products|solutions|applications|platforms|tools|technologies|innovations|inventions|discoveries|breakthroughs|advancements|improvements|enhancements|upgrades|updates|patches|fixes|releases|versions|editions|iterations|generations|cycles|phases|stages|steps|levels|layers|dimensions|aspects|facets|elements|components|parts|pieces|units|modules|segments|sections|divisions|departments|branches|subsidiaries|affiliates|partners|associates|members|stakeholders|shareholders|investors|owners|founders|entrepreneurs|leaders|managers|directors|executives|officers|administrators|coordinators|supervisors|overseers|controllers|regulators|auditors|inspectors|reviewers|evaluators|assessors|analysts|researchers|scientists|engineers|designers|developers|programmers|coders|testers|debuggers|optimizers|integrators|implementers|operators|maintainers|supporters|helpers|assistants|aides|advisors|consultants|counselors|coaches|mentors|trainers|teachers|instructors|educators|professors|lecturers|tutors|guides|facilitators|moderators|mediators|arbitrators|judges|referees|umpires|officials|authorities|experts|specialists|professionals|practitioners|technicians|artisans|craftsmen|tradesmen|workers|laborers|employees|staff|personnel|crew|team|squad|unit|force|corps|brigade|division|regiment|battalion|company|platoon|squadron|fleet|flotilla|armada|navy|army|air force|marine corps|coast guard|national guard|reserve|militia|volunteer|recruit|trainee|cadet|apprentice|intern|fellow|scholar|student|pupil|learner|beginner|novice|rookie|newcomer|freshman|sophomore|junior|senior|graduate|postgraduate|doctorate|candidate|applicant|nominee|finalist|winner|champion|victor|conqueror|master|expert|authority|specialist|professional|veteran|legend|icon|star|celebrity|hero|idol|role model|mentor|coach|teacher|guide|leader|pioneer|trailblazer|innovator|inventor|creator|founder|builder|maker|producer|director|manager|executive|administrator|organizer|planner|strategist|tactician|analyst|advisor|consultant|expert|specialist)$/, weight: 90, label: 'commercial-phrase' },

  // High-value compound phrases 2-3 words (long-tail buyer queries)
  { pattern: /(copy space|copyspace|text space|blank space|white space|negative space|empty space|clean background|plain background|solid background|isolated background|white background|black background|transparent background|studio background|minimal background|simple background|neutral background|gradient background|blurred background|soft background|dark background|bright background|colorful background|abstract background|geometric background|pattern background|texture background|vintage background|retro background|modern background|contemporary background|futuristic background|natural background|organic background|artificial background|digital background|analog background|urban background|rural background|indoor background|outdoor background|office background|home background|kitchen background|bathroom background|bedroom background|living room|dining room|meeting room|conference room|classroom|laboratory|workshop|studio|gallery|museum|library|hospital|clinic|pharmacy|laboratory|factory|warehouse|store|shop|boutique|market|mall|supermarket|restaurant|cafe|bar|hotel|resort|spa|gym|pool|beach|park|garden|forest|mountain|lake|river|ocean|sea|coast|island|desert|jungle|savanna|tundra|arctic|antarctic|tropical|temperate|subtropical|mediterranean|continental|maritime|alpine|coastal|inland|urban|suburban|rural|remote|isolated|crowded|busy|quiet|peaceful|serene|tranquil|calm|relaxing|stressful|chaotic|messy|organized|structured|systematic|methodical|disciplined|focused|distracted|engaged|bored|interested|curious|fascinated|captivated|enchanted|mesmerized|hypnotized|entranced|spellbound|riveted|absorbed|immersed|involved|participating|contributing|collaborating|cooperating|coordinating|communicating|interacting|connecting|relating|bonding|sharing|giving|receiving|exchanging|trading|buying|selling|marketing|advertising|promoting|branding|positioning|targeting|segmenting|analyzing|researching|studying|investigating|exploring|discovering|uncovering|revealing|exposing|highlighting|showcasing|displaying|exhibiting|presenting|demonstrating|illustrating|exemplifying|representing|symbolizing|signifying|indicating|suggesting|implying|inferring|concluding|deciding|choosing|selecting|picking|opting|preferring|favoring|recommending|suggesting|proposing|offering|providing|supplying|delivering|distributing|allocating|assigning|delegating|outsourcing|contracting|partnering|collaborating|cooperating|coordinating|synchronizing|aligning|integrating|unifying|consolidating|merging|acquiring|investing|funding|financing|budgeting|planning|scheduling|organizing|managing|leading|directing|guiding|coaching|mentoring|teaching|training|educating|informing|updating|notifying|alerting|warning|cautioning|advising|counseling|consulting|recommending|suggesting|proposing|presenting|pitching|selling|negotiating|closing|finalizing|completing|finishing|accomplishing|achieving|succeeding|winning|triumphing|prevailing|overcoming|conquering|mastering|dominating|excelling|outperforming|surpassing|exceeding|transcending|going beyond|breaking through|pushing forward|moving ahead|advancing|progressing|developing|growing|expanding|scaling|multiplying|increasing|rising|climbing|soaring|skyrocketing|booming|flourishing|thriving|prospering|blooming|blossoming|flowering|fruiting|harvesting|reaping|gathering|collecting|accumulating|amassing|hoarding|stockpiling|reserving|saving|conserving|preserving|protecting|guarding|defending|securing|shielding|sheltering|housing|accommodating|hosting|entertaining|welcoming|greeting|receiving|accepting|embracing|including|involving|engaging|participating|contributing|sharing|giving|donating|volunteering|helping|assisting|supporting|aiding|serving|caring|nurturing|nourishing|feeding|sustaining|maintaining|keeping|holding|retaining|preserving|protecting|conserving|saving|rescuing|recovering|restoring|repairing|fixing|mending|healing|curing|treating|medicating|vaccinating|immunizing|preventing|avoiding|escaping|evading|dodging|ducking|weaving|zigzagging|maneuvering|navigating|steering|piloting|driving|riding|flying|sailing|cruising|traveling|journeying|voyaging|exploring|adventuring|expeditioning|trekking|hiking|climbing|mountaineering|skiing|snowboarding|surfing|swimming|diving|snorkeling|scuba diving|free diving|deep sea|shallow water|fresh water|salt water|brackish water|mineral water|spring water|tap water|bottled water|filtered water|purified water|distilled water|carbonated water|sparkling water|still water|flat water|ice water|cold water|hot water|warm water|lukewarm water|boiling water|freezing water|icy water|frosty water|chilly water|cool water|refreshing water|invigorating water|energizing water|revitalizing water|rejuvenating water|restoring water|healing water|therapeutic water|medicinal water|curative water|remedial water|restorative water|recuperative water|convalescent water|palliative water|soothing water|calming water|relaxing water|tranquil water|peaceful water|serene water|quiet water|still water|motionless water|stagnant water|flowing water|running water|streaming water|cascading water|waterfall|rapids|whitewater|torrent|flood|deluge|downpour|rainfall|precipitation|drizzle|mist|fog|haze|smog|pollution|contamination|purification|filtration|distillation|evaporation|condensation|precipitation|collection|storage|distribution|consumption|usage|utilization|application|implementation|execution|operation|function|performance|efficiency|effectiveness|productivity|output|throughput|capacity|capability|potential|possibility|probability|likelihood|chance|opportunity|risk|threat|danger|hazard|peril|jeopardy|vulnerability|weakness|strength|advantage|benefit|gain|profit|return|yield|dividend|interest|revenue|income|earnings|salary|wage|compensation|remuneration|payment|fee|charge|cost|expense|price|value|worth|wealth|fortune|treasure|riches|abundance|plenty|prosperity|affluence|opulence|luxury|comfort|convenience|ease|simplicity|efficiency|effectiveness|productivity|performance|quality|excellence|superiority|supremacy|dominance|leadership|authority|power|control|influence|impact|effect|result|outcome|consequence|implication|significance|importance|relevance|meaning|purpose|intention|goal|objective|target|aim|mission|vision|dream|aspiration|ambition|desire|wish|hope|expectation|anticipation|prediction|forecast|projection|estimation|calculation|computation|measurement|assessment|evaluation|analysis|review|inspection|examination|investigation|exploration|discovery|uncovering|revelation|disclosure|exposure|publication|dissemination|distribution|circulation|propagation|spread|diffusion|dispersion|scattering|broadcasting|transmission|communication|notification|announcement|declaration|statement|report|account|description|explanation|interpretation|translation|adaptation|transformation|conversion|modification|alteration|change|adjustment|correction|improvement|enhancement|upgrade|update|revision|edition|version|release|publication|issue|volume|number|copy|duplicate|replica|reproduction|imitation|simulation|emulation|representation|depiction|portrayal|illustration|demonstration|exhibition|display|showcase|presentation|performance|execution|implementation|operation|function|activity|action|behavior|conduct|practice|habit|routine|custom|tradition|convention|norm|standard|rule|regulation|law|policy|procedure|protocol|guideline|framework|structure|system|process|method|technique|approach|strategy|tactic|plan|scheme|design|model|pattern|template|format|layout|arrangement|organization|composition|configuration|setup|installation|deployment|distribution|allocation|assignment|designation|appointment|nomination|selection|election|choice|option|alternative|substitute|replacement|standby|backup|reserve|spare|extra|additional|supplementary|complementary|auxiliary|supporting|assisting|helping|aiding|serving|facilitating|enabling|empowering|strengthening|reinforcing|bolstering|boosting|enhancing|improving|upgrading|advancing|promoting|furthering|developing|cultivating|nurturing|fostering|encouraging|stimulating|motivating|inspiring|driving|pushing|propelling|moving|advancing|progressing|developing|growing|expanding|extending|broadening|widening|deepening|enriching|enhancing|augmenting|amplifying|magnifying|intensifying|strengthening|fortifying|reinforcing|consolidating|solidifying|stabilizing|securing|protecting|defending|guarding|shielding|safeguarding|preserving|conserving|maintaining|sustaining|supporting|upholding|endorsing|backing|sponsoring|funding|financing|investing|contributing|donating|giving|providing|supplying|delivering|distributing|allocating|assigning|designating|appointing|nominating|selecting|choosing|electing|voting|deciding|determining|resolving|settling|concluding|finalizing|completing|finishing|accomplishing|achieving|attaining|reaching|gaining|acquiring|obtaining|securing|winning|earning|deserving|meriting|warranting|justifying|validating|confirming|verifying|authenticating|certifying|attesting|witnessing|testifying|declaring|stating|asserting|claiming|professing|avowing|acknowledging|admitting|confessing|disclosing|revealing|exposing|uncovering|discovering|finding|locating|identifying|recognizing|detecting|noticing|observing|seeing|watching|viewing|looking|gazing|staring|glancing|peeking|peering|inspecting|examining|scrutinizing|analyzing|studying|investigating|researching|exploring|probing|searching|seeking|hunting|pursuing|chasing|following|tracking|tracing|monitoring|surveying|scanning|screening|checking|testing|trying|experimenting|trialing|piloting|sampling|measuring|weighing|calculating|computing|estimating|approximating|guessing|predicting|forecasting|projecting|planning|preparing|arranging|organizing|coordinating|managing|administering|directing|leading|guiding|steering|navigating|piloting|driving|riding|flying|sailing|traveling|journeying|moving|going|coming|arriving|departing|leaving|entering|exiting|approaching|receding|advancing|retreating|withdrawing|pulling back|falling back|giving up|surrendering|yielding|submitting|complying|obeying|following|adhering|conforming|abiding|observing|respecting|honoring|upholding|maintaining|preserving|protecting|defending|guarding|securing|ensuring|guaranteeing|promising|committing|pledging|vowing|swearing|oathing|declaring|announcing|proclaiming|pronouncing|stating|asserting|claiming|maintaining|insisting|contending|arguing|debating|discussing|negotiating|bargaining|haggling|trading|dealing|transacting|conducting|performing|executing|implementing|carrying out|putting into effect|bringing about|effecting|causing|producing|generating|creating|making|building|constructing|assembling|manufacturing|fabricating|producing|developing|designing|engineering|planning|organizing|arranging|setting up|establishing|instituting|founding|launching|starting|beginning|initiating|commencing|opening|unveiling|revealing|disclosing|announcing|introducing|presenting|showcasing|exhibiting|displaying|demonstrating|illustrating|exemplifying|representing|depicting|portraying|describing|explaining|clarifying|elucidating|illuminating|enlightening|informing|educating|teaching|training|coaching|mentoring|guiding|advising|counseling|consulting|recommending|suggesting|proposing|offering|providing|supplying|delivering|giving|donating|contributing|sharing|distributing|allocating|assigning|delegating|transferring|conveying|transmitting|sending|forwarding|relaying|passing|handing|delivering|bringing|carrying|transporting|shipping|mailing|posting|couriering|dispatching|routing|directing|channeling|funneling|filtering|screening|sorting|classifying|categorizing|grouping|organizing|arranging|ordering|ranking|rating|scoring|grading|evaluating|assessing|judging|appraising|valuing|estimating|calculating|measuring|weighing|quantifying|qualifying|characterizing|defining|describing|identifying|naming|labeling|tagging|marking|branding|stamping|sealing|signing|endorsing|approving|authorizing|permitting|allowing|granting|giving|bestowing|conferring|awarding|presenting|offering|providing|supplying|furnishing|equipping|outfitting|arming|preparing|readying|priming|conditioning|training|coaching|teaching|instructing|educating|informing|briefing|debriefing|updating|notifying|alerting|warning|advising|cautioning|counseling|guiding|directing|leading|steering|navigating|piloting)|$/i, weight: 80, label: 'compound-phrase' },

  // Action verbs with visual + commercial significance
  { pattern: /^(running|walking|jumping|sitting|standing|lying|sleeping|eating|drinking|cooking|cleaning|washing|reading|writing|typing|drawing|painting|singing|dancing|playing|working|studying|learning|teaching|speaking|talking|listening|watching|looking|searching|finding|building|creating|designing|developing|programming|coding|testing|debugging|fixing|repairing|maintaining|operating|driving|flying|swimming|diving|climbing|hiking|camping|traveling|exploring|discovering|researching|analyzing|evaluating|planning|organizing|managing|leading|directing|guiding|coaching|mentoring|training|exercising|practicing|performing|competing|winning|losing|fighting|defending|protecting|helping|supporting|caring|nurturing|loving|kissing|hugging|holding|carrying|lifting|pushing|pulling|throwing|catching|kicking|hitting|striking|cutting|chopping|slicing|dicing|mixing|stirring|pouring|filling|emptying|opening|closing|connecting|disconnecting|plugging|unplugging|charging|discharging|loading|unloading|packing|unpacking|shipping|receiving|sending|delivering|buying|selling|trading|exchanging|investing|saving|spending|earning|paying|borrowing|lending|giving|taking|sharing|donating|volunteering|contributing|participating|engaging|involving|attending|joining|leaving|entering|exiting|arriving|departing|moving|staying|living|residing|visiting|vacationing|relaxing|resting|meditating|praying|worshipping|celebrating|partying|enjoying|suffering|struggling|surviving|thriving|flourishing|growing|developing|evolving|changing|adapting|transforming|transitioning|converting|modifying|updating|upgrading|improving|enhancing|optimizing|maximizing|minimizing|reducing|increasing|expanding|extending|broadening|deepening|strengthening|weakening|intensifying|softening|hardening|solidifying|liquefying|gasifying|vaporizing|condensing|freezing|melting|boiling|evaporating|dissolving|mixing|separating|combining|uniting|dividing|splitting|breaking|shattering|crushing|grinding|pulverizing|powdering|dusting|sweeping|mopping|scrubbing|polishing|shining|buffing|waxing|oiling|greasing|lubricating|rusting|corroding|decaying|rotting|molding|spoiling|aging|maturing|ripening|blooming|flowering|fruiting|seeding|germinating|sprouting|growing|developing|evolving|maturing|ripening|harvesting|reaping|gathering|collecting|picking|plucking|pruning|trimming|cutting|mowing|watering|fertilizing|feeding|nourishing|sustaining|maintaining|caring|protecting|guarding|defending|shielding|sheltering|housing|accommodating|hosting|entertaining|welcoming|greeting|receiving|accepting|rejecting|refusing|denying|declining|dismissing|ignoring|neglecting|abandoning|leaving|forsaking|deserting|betraying|cheating|lying|deceiving|tricking|fooling|misleading|manipulating|controlling|dominating|oppressing|suppressing|repressing|depressing|saddening|angering|enraging|infuriating|maddening|crazing|insaning|driving crazy|making mad|provoking|instigating|inciting|stirring|arousing|awakening|waking|rising|lifting|elevating|raising|increasing|boosting|amplifying|magnifying|enhancing|enriching|improving|bettering|perfecting|refining|polishing|finishing|completing|accomplishing|achieving|succeeding|winning|triumphing|prevailing|overcoming|conquering|mastering|dominating|excelling|outperforming|surpassing|exceeding|transcending|going beyond|breaking through|pushing forward|moving ahead|advancing|progressing)$/i, weight: 70, label: 'action-verb' },

  // Emotional/conceptual terms with commercial search volume
  { pattern: /^(love|hate|fear|anger|joy|sadness|happiness|pleasure|pain|hope|despair|faith|doubt|trust|mistrust|confidence|anxiety|peace|conflict|harmony|discord|unity|division|togetherness|loneliness|connection|isolation|belonging|alienation|acceptance|rejection|inclusion|exclusion|diversity|uniformity|freedom|captivity|liberty|oppression|justice|injustice|equality|inequality|fairness|unfairness|honesty|dishonesty|integrity|corruption|authenticity|fakeness|reality|illusion|truth|lie|fact|fiction|certainty|uncertainty|clarity|confusion|order|chaos|stability|instability|security|insecurity|safety|danger|comfort|discomfort|ease|difficulty|simplicity|complexity|beauty|ugliness|elegance|crudeness|refinement|roughness|sophistication|primitiveness|modernity|tradition|innovation|conservation|progress|regression|growth|decline|development|stagnation|evolution|devolution|creation|destruction|construction|deconstruction|building|breaking|making|unmaking|forming|deforming|shaping|misshaping|organizing|disorganizing|structuring|destructuring|systematizing|chaotizing|ordering|disordering|arranging|disarranging|tidying|messying|cleaning|dirtying|purifying|polluting|healing|hurting|curing|harming|helping|hindering|supporting|undermining|strengthening|weakening|empowering|disempowering|enabling|disabling|facilitating|obstructing|promoting|demoting|advancing|retarding|accelerating|decelerating|speeding|slowing|quickening|delaying|hastening|prolonging|shortening|extending|reducing|expanding|contracting|inflating|deflating|rising|falling|ascending|descending|climbing|diving|soaring|plummeting|surging|crashing|booming|busting|thriving|declining|flourishing|withering|blooming|wilting|growing|shrinking|multiplying|dividing|uniting|separating|merging|splitting|combining|isolating|integrating|disintegrating|coalescing|dispersing|gathering|scattering|collecting|distributing|centralizing|decentralizing|concentrating|diffusing|focusing|blurring|sharpening|dulling|brightening|darkening|lightening|deepening|flattening|illuminating|shadowing|revealing|hiding|exposing|concealing|discovering|covering|uncovering|masking|unmasking|showing|hiding|displaying|withholding|presenting|removing|giving|taking|offering|refusing|accepting|rejecting|welcoming|excluding|including|embracing|pushing away|pulling close|attracting|repelling|drawing in|pushing out|engaging|disengaging|connecting|disconnecting|linking|unlinking|tying|untying|binding|unbinding|fastening|unfastening|locking|unlocking|opening|closing|starting|stopping|beginning|ending|initiating|terminating|launching|landing|taking off|touching down|departing|arriving|leaving|staying|going|coming)$/i, weight: 60, label: 'conceptual' },

  // Industry/professional terms with buyer intent
  { pattern: /(healthcare|medical|hospital|clinic|pharmacy|doctor|nurse|patient|treatment|therapy|surgery|medicine|drug|prescription|diagnosis|symptom|disease|illness|condition|disorder|syndrome|infection|injury|wound|fracture|burn|cut|bruise|swelling|inflammation|pain|ache|discomfort|relief|recovery|rehabilitation|physical therapy|occupational therapy|speech therapy|mental health|psychology|psychiatry|counseling|therapy|wellness|fitness|nutrition|diet|exercise|workout|training|gym|yoga|meditation|mindfulness|relaxation|stress management|sleep|rest|recovery|regeneration|rejuvenation|revitalization|detox|cleanse|fast|juice|smoothie|supplement|vitamin|mineral|herb|spice|superfood|organic|natural|holistic|alternative|complementary|integrative|functional|preventive|curative|palliative|rehabilitative|restorative|regenerative|therapeutic|medicinal|pharmaceutical|biotechnology|genetics|genomics|proteomics|metabolomics|bioinformatics|computational biology|systems biology|synthetic biology|molecular biology|cell biology|developmental biology|evolutionary biology|ecology|environmental science|climate science|earth science|geology|oceanography|meteorology|astronomy|astrophysics|cosmology|physics|chemistry|mathematics|statistics|data science|computer science|information technology|artificial intelligence|machine learning|deep learning|neural networks|natural language processing|computer vision|robotics|automation|internet of things|blockchain|cryptocurrency|fintech|financial technology|banking|insurance|investment|wealth management|asset management|portfolio management|risk management|compliance|regulation|governance|policy|law|legal|justice|courts|litigation|arbitration|mediation|negotiation|contract|agreement|partnership|corporation|llc|nonprofit|ngo|charity|foundation|social enterprise|startup|venture capital|private equity|hedge fund|mutual fund|etf|index fund|bond|stock|share|equity|debt|credit|loan|mortgage|lease|rent|buy|sell|trade|exchange|market|exchange|platform|broker|dealer|trader|investor|lender|borrower|saver|spender|consumer|producer|manufacturer|distributor|wholesaler|retailer|merchant|vendor|supplier|buyer|seller|customer|client|user|subscriber|member|patron|donor|sponsor|benefactor|philanthropist|volunteer|activist|advocate|campaigner|organizer|leader|follower|supporter|opponent|critic|analyst|commentator|journalist|reporter|editor|publisher|broadcaster|anchor|host|guest|speaker|presenter|performer|entertainer|artist|musician|actor|actress|director|producer|writer|author|poet|playwright|screenwriter|novelist|essayist|journalist|columnist|blogger|vlogger|influencer|creator|maker|builder|designer|architect|engineer|developer|programmer|coder|hacker|technologist|scientist|researcher|scholar|academic|professor|teacher|instructor|educator|trainer|coach|mentor|advisor|consultant|expert|specialist|professional|practitioner|technician|artisan|craftsman|tradesman|worker|laborer|employee|staff|executive|manager|director|officer|president|ceo|cfo|coo|cto|cio|cmo|chro|vp|svp|evp|md|gm|head|chief|lead|senior|junior|associate|assistant|aide|clerk|secretary|receptionist|administrator|coordinator|planner|scheduler|organizer|analyst|strategist|planner|architect|designer|developer|engineer|technician|specialist|expert|consultant|advisor|counselor|coach|mentor|trainer|teacher|instructor|educator|professor|lecturer|tutor|facilitator|moderator|mediator|arbitrator|negotiator|diplomat|ambassador|representative|delegate|envoy|emissary|agent|broker|intermediary|middleman|liaison|coordinator|connector|networker|relationship manager|account manager|project manager|product manager|program manager|portfolio manager|operations manager|general manager|regional manager|district manager|branch manager|store manager|team leader|team lead|supervisor|foreman|overseer|inspector|auditor|reviewer|evaluator|assessor|appraiser|valuer|estimator|surveyor|examiner|investigator|detective|inspector|agent|officer|patrol|guard|watchman|sentinel|sentry|lookout|scout|ranger|warden|keeper|custodian|janitor|cleaner|maid|housekeeper|butler|servant|attendant|assistant|aide|helper|supporter|carer|caregiver|nurse|doctor|physician|surgeon|specialist|consultant|therapist|counselor|psychologist|psychiatrist|social worker|case worker|probation officer|parole officer|correctional officer|police officer|detective|investigator|agent|fbi|cia|nsa|secret service|military|army|navy|air force|marine corps|coast guard|national guard|reserve|veteran|soldier|sailor|airman|marine|guardsman|reservist|militia|volunteer|recruit|cadet|officer candidate|trainee|student|pupil|learner|apprentice|intern|fellow|resident|attending|physician|surgeon|nurse|practitioner|clinician|therapist|technician|technologist|scientist|researcher|investigator|scholar|academic|professor|teacher|instructor|educator|faculty|staff|administration|management|leadership|governance|board|committee|council|panel|task force|working group|team|squad|unit|division|department|branch|office|bureau|agency|authority|commission|board|council|committee|panel|task force|working group|advisory board|steering committee|executive committee|management committee|operations committee|finance committee|audit committee|risk committee|compliance committee|ethics committee|governance committee|nomination committee|remuneration committee|compensation committee|benefits committee|pension committee|retirement committee|investment committee|strategy committee|planning committee|budget committee|project committee|program committee|portfolio committee|product committee|service committee|quality committee|safety committee|security committee|environmental committee|sustainability committee|diversity committee|inclusion committee|accessibility committee|wellness committee|health committee|safety committee|security committee|emergency committee|crisis committee|disaster committee|recovery committee|continuity committee|resilience committee)$/i, weight: 55, label: 'industry' },
];

/**
 * Memvalidasi apakah sebuah keyword memiliki SEARCH INTENT yang masuk akal.
 * Keyword tanpa search intent (noise, filler, terlalu generik) akan ditolak.
 */
function hasValidSearchIntent(keyword: string): boolean {
  const k = keyword.toLowerCase().trim();
  if (k.length < 3) return false;

  // Explicitly rejected: filler / noise terms that buyers never search
  const NOISE_TERMS = new Set([
    'image', 'picture', 'photo', 'photograph', 'stock', 'asset', 'file',
    'download', 'free', 'royalty', 'royalty free', 'high quality', 'premium',
    'best', 'beautiful', 'stunning', 'amazing', 'awesome', 'great', 'nice',
    'good', 'excellent', 'perfect', 'wonderful', 'fantastic', 'incredible',
    'thing', 'object', 'item', 'stuff', 'something', 'anything', 'nothing',
    'view', 'scene', 'scenery', 'landscape', 'background', 'wallpaper',
    'hd', '4k', '8k', 'ultra hd', 'full hd', 'high resolution', 'high res',
    'no person', 'nobody', 'empty', 'blank'
  ]);
  if (NOISE_TERMS.has(k)) return false;

  // Check against VALID_SEARCH_INTENT_PATTERNS
  for (const { pattern } of VALID_SEARCH_INTENT_PATTERNS) {
    if (pattern.test(k)) return true;
  }

  // If the keyword is a descriptive compound (2+ words), assume it has some search intent
  if (k.split(/\s+/).length >= 2) return true;

  // Single words that don't match any pattern are likely noise
  return false;
}

/**
 * Menghitung COMMERCIAL SEARCH INTENT SCORE suatu keyword.
 * Semakin tinggi skor, semakin besar kemungkinan keyword tersebut
 * adalah query pencarian yang diketik oleh buyer sungguhan.
 */
function computeCommercialScore(keyword: string, tiers?: TieredVisualAnalysis): number {
  const k = keyword.toLowerCase().trim();
  let score = 0;

  // 1. Check against known commercial patterns
  for (const { pattern, weight } of VALID_SEARCH_INTENT_PATTERNS) {
    if (pattern.test(k)) {
      score = weight;
      break;
    }
  }

  // 2. Visual grounding bonus: keyword matches detected visual elements
  if (tiers) {
    const allObjects = tiers.objects.map(o => o.name.toLowerCase());
    const allAttributes = tiers.attributes.map(a => String(a).toLowerCase());
    const allScene = tiers.scene.map(s => String(s).toLowerCase());
    const allConcepts = tiers.concepts.map(c => String(c).toLowerCase());
    const allVisual = [...allObjects, ...allAttributes, ...allScene, ...allConcepts];

    const hasVisualGrounding = allVisual.some(v => k.includes(v) || v.includes(k));
    if (hasVisualGrounding) score += 25;
    else score = Math.max(0, score - 30); // Penalize ungrounded keywords
  }

  // 3. Compound phrase bonus (2+ word phrases = higher buyer intent)
  const wordCount = k.split(/\s+/).length;
  if (wordCount >= 2 && wordCount <= 4) score += 15;

  // 4. Length penalty for overly short or overly long
  if (k.length < 4) score -= 10;
  if (k.length > 30) score -= 10;

  return Math.max(0, Math.min(150, score));
}

/**
 * PHASE 2 — VALIDATE STRICTLY:
 * Hanya keyword dengan VISUAL GROUNDING + VALID SEARCH INTENT yang lolos.
 * Hasil: keyword coverage TANPA semantic noise.
 */
function validateStrictly(keywords: string[], tiers: TieredVisualAnalysis, title?: string): string[] {
  const validated: string[] = [];
  const seen = new Set<string>();

  // Build visual grounding reference
  const allObjects = tiers.objects.map(o => o.name.toLowerCase());
  const allAttributes = tiers.attributes.map(a => String(a).toLowerCase());
  const allScene = tiers.scene.map(s => String(s).toLowerCase());
  const allConcepts = tiers.concepts.map(c => String(c).toLowerCase());
  const visualRef = [...allObjects, ...allAttributes, ...allScene, ...allConcepts];

  for (const kw of keywords) {
    const k = sanitizeForIndexing(kw);
    if (!k || k.length < 3 || seen.has(k)) continue;
    if (isProhibitedKeyword(k)) continue;

    // CHECK 1: Visual Grounding — keyword MUST relate to something detected in the image
    const hasVisualGrounding = visualRef.length === 0 ||
      visualRef.some(v => k.includes(v) || v.includes(k)) ||
      k.split(/\s+/).some(word => word.length > 3 && visualRef.some(v => v.includes(word)));

    if (!hasVisualGrounding) continue;

    // CHECK 2: Valid Search Intent — keyword must be something a real buyer would search
    if (!hasValidSearchIntent(k)) continue;

    seen.add(k);
    validated.push(k);
  }

  return validated;
}

/**
 * PHASE 3 — RANK COMMERCIALLY:
 * Urutkan keyword berdasarkan COMMERCIAL SEARCH INTENT (skor buyer).
 * Keyword #1 = commercial intent tertinggi + main subject synergy.
 */
function rankCommercially(keywords: string[], tiers: TieredVisualAnalysis, title?: string): string[] {
  if (keywords.length === 0) return keywords;

  const primarySubject = tiers.objects
    .find(o => o.tier === 'primary' || o.importance >= 70)
    ?.name?.toLowerCase();

  // Score each keyword by commercial intent
  const scored = keywords.map(k => ({
    keyword: k,
    score: computeCommercialScore(k, tiers),
    isSubject: primarySubject ? k.toLowerCase().includes(primarySubject) || primarySubject.includes(k.toLowerCase()) : false,
  }));

  // Sort: subject match first, then commercial score descending
  scored.sort((a, b) => {
    if (a.isSubject && !b.isSubject) return -1;
    if (!a.isSubject && b.isSubject) return 1;
    return b.score - a.score;
  });

  return scored.map(s => s.keyword);
}

"""

# Insert the validation engine before the existing rankAndWeightKeywords function
pos = code.find("function rankAndWeightKeywords")
if pos != -1:
    code = code[:pos] + validation_engine + "\n" + code[pos:]

# ========================================================================
# 3. REPLACE rankAndWeightKeywords WITH COMMERCIAL RANKING PASSTHROUGH
# ========================================================================

old_rank = """function rankAndWeightKeywords(keywords: string[], tiers: TieredVisualAnalysis, title?: string): string[] {
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
}"""

new_rank = """function rankAndWeightKeywords(keywords: string[], tiers: TieredVisualAnalysis, title?: string): string[] {
  // PHASE 2 + 3: Validate Strictly, then Rank Commercially
  const validated = validateStrictly(keywords, tiers, title);
  const ranked = rankCommercially(validated, tiers, title);

  // KEYWORD #1 MUST ALWAYS BE MAIN SUBJECT (lock)
  const primarySubject = tiers.objects
    .find(o => o.tier === "primary" || o.importance >= 70)
    ?.name?.toLowerCase().trim();

  if (primarySubject && primarySubject.length > 1 && ranked.length > 0) {
    let pos = ranked.findIndex(k => k.toLowerCase().includes(primarySubject) || primarySubject.includes(k.toLowerCase()));
    if (pos > 0) {
      const [main] = ranked.splice(pos, 1);
      ranked.unshift(main);
    } else if (pos === -1) {
      ranked.unshift(primarySubject);
    }
  }

  return ranked;
}"""

if old_rank in code:
    code = code.replace(old_rank, new_rank)

# ========================================================================
# 4. UPDATE POST-PROCESSING PIPELINE TO USE validateStrictly
# ========================================================================

# Replace the old rigorous filter with the new validateStrictly call
old_filter = """      // Rule 5: Tambahkan Keyword Validator (Hanya lolos jika keyword memiliki kecocokan kata)
      const rigorouslyFilteredKeywords = uniqueKeywords.filter((keyword: string) => {
        if (!allowedTerms || allowedTerms.length < 5) return true;
        const words = keyword.split(/\\s+/);
        const hasMatchingWord = words.some(w => allowedTerms.includes(w));
        return hasMatchingWord && !isProhibitedKeyword(keyword);
      });

       // Priority: rigorously filtered first, then pad with remaining keywords to approach target count
      const remainingKeywords = uniqueKeywords.filter((k: string) => !rigorouslyFilteredKeywords.includes(k) && !isProhibitedKeyword(k));
      let finalKeywordList = [...rigorouslyFilteredKeywords, ...remainingKeywords];
"""

new_filter = """      // PHASE 2 — VALIDATE STRICTLY: Hanya keyword dengan visual grounding + search intent yang lolos
      const validatedKeywords = validateStrictly(
        uniqueKeywords.filter((k: string) => !isProhibitedKeyword(k)),
        tieredVisual,
        data.title
      );
      let finalKeywordList = validatedKeywords;
"""

code = code.replace(old_filter, new_filter)

# ========================================================================
# 5. UPDATE PROMPT INSTRUCTIONS — "GENERATE BROADLY"
# ========================================================================

old_prompt_count = "List of UP TO ${aiRequestCount} highly-relevant high-volume keywords"
new_prompt_count = "Generate BROADLY: List of UP TO ${aiRequestCount} keyword candidates (high-volume, diverse, covering all visual aspects of the asset). Quality will be validated strictly afterwards — focus on maximum relevant coverage now."

code = code.replace(old_prompt_count, new_prompt_count)

# Update single-word mode prompt too
old_single_prompt = "List of UP TO ${aiRequestCount} highly-relevant high-volume SINGLE-WORD keywords"
new_single_prompt = "Generate BROADLY: List of UP TO ${aiRequestCount} SINGLE-WORD keyword candidates. Quality will be validated strictly afterwards."
code = code.replace(old_single_prompt, new_single_prompt)

# Update multi-word mode prompt
old_multi_prompt = "List of UP TO ${aiRequestCount} highly-relevant high-volume MULTI-WORD phrase keywords"
new_multi_prompt = "Generate BROADLY: List of UP TO ${aiRequestCount} MULTI-WORD phrase keyword candidates. Quality will be validated strictly afterwards."
code = code.replace(old_multi_prompt, new_multi_prompt)

# ========================================================================
# 6. UPDATE "Rules for Keywords" TO MATCH NEW PRINCIPLE
# ========================================================================

old_keyword_rules_header = "Rules for Keywords:\n1. Start with the most important, high-converting commercial descriptors. Sort them in descending order of relevance."
new_keyword_rules_header = "Rules for Keywords:\n1. GENERATE BROADLY — include ALL potentially relevant terms. Do NOT self-censor. The system will validate and rank them afterwards. Focus on maximum visual coverage and buyer search vocabulary."

code = code.replace(old_keyword_rules_header, new_keyword_rules_header)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("build_generate_validate_rank.py executed successfully!")
