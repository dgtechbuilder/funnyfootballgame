// ============================================================================
//  MONATE CUP — game data: captains, stadiums, items, commentary
//  Africa's most ridiculous football tournament.
// ============================================================================

const GAME_NAME = 'MONATE CUP';
const GAME_MEANING = '"Monate" means fun in Sesotho, Setswana & Sepedi';
const GAME_TAGLINE = "AFRICA'S MOST RIDICULOUS FOOTBALL TOURNAMENT";

const CAPTAINS = [
  {
    id: 'dayo', name: 'Oga Dayo Danfo', short: 'Dayo', nick: 'King of the Lagos Bus Stop', country: 'Nigeria', flag: '🇳🇬',
    team: 'Danfo Demolition FC', color: '#ffcc00', alt: '#7a5c00', color2: '#111111', skin: '#5a3825',
    speed: 0.9, power: 1.25, tackle: 1.4, size: 1.22,
    superType: 'boulder', superName: 'DANFO DASH', sidekickHat: 'flatcap',
    signature: { name: 'HONK HONK!', icon: '📯', desc: 'Blasts the danfo horn: everyone in front gets blown away.' },
    squad: { name: 'OSHOFREE!', icon: '💨', desc: 'Conductor shout: burst of speed and a shoulder barge.' },
    blurb: 'Drives a yellow danfo bus by day. Drives defenders into the ground by night. "Enter with your change!"',
    quips: ['OSHOFREE!', 'ENTER WITH YOUR CHANGE!', 'NO SHAKING!', 'OGA AT THE TOP!'],
  },
  {
    id: 'kip', name: "Kip 'The Wind' Kiprotich", short: 'Kip', nick: 'Faster Than Nairobi Gossip', country: 'Kenya', flag: '🇰🇪',
    team: 'Rift Valley Rockets', color: '#d62828', alt: '#6b0f0f', color2: '#ffffff', skin: '#4a2e1c',
    speed: 1.24, power: 0.92, tackle: 0.85, size: 0.94,
    superType: 'zigzag', superName: 'RIFT VALLEY LIGHTNING', sidekickHat: 'headband',
    signature: { name: 'SECOND WIND', icon: '🌪️', desc: 'Turbo marathon mode: huge speed and nobody can tackle you.' },
    squad: { name: 'SPRINT', icon: '👟', desc: 'Short burst of Kenyan pace.' },
    blurb: 'Ran a marathon to the stadium, scored a hat-trick, then ran home for lunch. Has never been tired.',
    quips: ['TOO FAST!', 'SAWA SAWA!', 'CATCH ME IF YOU CAN!', 'POLE POLE? NEVER!'],
  },
  {
    id: 'ama', name: 'Auntie Ama Makola', short: 'Auntie Ama', nick: 'Queen of Makola Market', country: 'Ghana', flag: '🇬🇭',
    team: 'Black Star Bandits', color: '#1b8a3c', alt: '#0c4a1f', color2: '#fcd116', skin: '#6b4226',
    speed: 0.96, power: 1.12, tackle: 1.25, size: 0.95,
    superType: 'split', superName: 'MARKET DAY MADNESS', sidekickHat: 'headwrap',
    signature: { name: 'WOODEN SPOON', icon: '🥄', desc: 'Spins her spoon: whacks everyone nearby and steals the ball.' },
    squad: { name: 'LAST PRICE!', icon: '💰', desc: 'Haggle shield: tackles bounce right off.' },
    blurb: 'Runs the busiest stall in Makola Market and haggles with referees. Carries a wooden spoon. Uses it.',
    quips: ['AH! YOU THINK?!', 'CHALE!', 'COME AND CHOP!', 'NO DISCOUNT!'],
  },
  {
    id: 'hamada', name: 'Uncle Hamada', short: 'Hamada', nick: 'The Pharaoh of the Penalty Box', country: 'Egypt', flag: '🇪🇬',
    team: 'Nile Crocodiles', color: '#c8102e', alt: '#5e0715', color2: '#f2c14e', skin: '#a8714a',
    speed: 0.88, power: 1.22, tackle: 1.35, size: 1.3,
    superType: 'sky', superName: 'PYRAMID PUNT', sidekickHat: 'fez',
    signature: { name: 'BELLY BOWLING', icon: '🎳', desc: 'Inflates his belly and rolls through the defence like a bowling ball.' },
    squad: { name: 'BELLY BUMP', icon: '🫃', desc: 'Bumps everyone close by onto the floor.' },
    blurb: 'Runs the best koshary cart in Cairo. His belly is load-bearing. His moustache is a national monument.',
    quips: ['YALLA!', 'HABIBI, NO!', 'MASHALLAH!', 'FROM THE TOP OF THE PYRAMID!'],
  },
  {
    id: 'wahala', name: 'Doctor Wahala', short: 'Dr Wahala', nick: 'Professor of Trouble', country: 'Cameroon', flag: '🇨🇲',
    team: 'Wahala Labs United', color: '#5cb85c', alt: '#245724', color2: '#ffe14d', skin: '#4f3220',
    speed: 1.02, power: 1.05, tackle: 0.95, size: 1.0,
    superType: 'teleport', superName: 'WAHALA WARP', sidekickHat: 'goggles',
    signature: { name: 'PORTAL GUN', icon: '🌀', desc: 'Teleports far ahead, ball and all.' },
    squad: { name: 'SMOKE BOMB', icon: '💨', desc: 'Poof! Vanishes and reappears to the side.' },
    blurb: 'Invented a ball that teleports. Also invented three hundred things that exploded. No wahala!',
    quips: ['NO WAHALA!', 'FOR SCIENCE!', 'EUREKA!', 'IT IS WORKING!'],
  },
  {
    id: 'ataya', name: 'Madame Fatou Ataya', short: 'Madame Fatou', nick: 'Grand Mistress of Tea', country: 'Senegal', flag: '🇸🇳',
    team: 'Teranga Tea Party', color: '#00853f', alt: '#7ddc9a', color2: '#e31b23', skin: '#3d2516',
    speed: 1.0, power: 1.12, tackle: 1.0, size: 1.05,
    superType: 'curve', superName: 'ATAYA TWISTER', sidekickHat: 'kufi',
    signature: { name: 'TEA BREAK', icon: '🫖', desc: 'Nearby rivals simply must stop for a cup of tea.' },
    squad: { name: 'TEA SPLASH', icon: '☕', desc: 'Throws hot tea at the nearest rival. They slip and spin.' },
    blurb: 'Pours mint tea from two metres high without spilling a drop. Bends free kicks the same way.',
    quips: ['TERANGA!', 'MORE TEA?', 'SO ELEGANT!', 'NA NGA DEF?'],
  },
  {
    id: 'sipho', name: 'Sipho Vuvuzela', short: 'Sipho', nick: 'The Amapiano Maestro', country: 'South Africa', flag: '🇿🇦',
    team: 'Soweto Groove Machine', color: '#ff7a00', alt: '#8a3d00', color2: '#1d3fbb', skin: '#5e3b26',
    speed: 1.08, power: 1.0, tackle: 0.95, size: 1.0,
    superType: 'dance', superName: 'AMAPIANO BLAST', sidekickHat: 'bucket',
    signature: { name: 'VUVUZELA BLAST', icon: '📢', desc: 'Deafening horn blast: rivals in front cover their ears.' },
    squad: { name: 'GWARA GWARA', icon: '🕺', desc: 'Dance-spin past defenders; anyone close starts dancing.' },
    blurb: 'Brings a vuvuzela to every match. And every funeral. And every job interview. Eish.',
    quips: ['EISH!', 'SHARP SHARP!', 'HAYIBO!', 'FEEL THE LOG DRUM!'],
  },
  {
    id: 'juma', name: 'Ranger Juma', short: 'Juma', nick: 'Lord of the Serengeti', country: 'Tanzania', flag: '🇹🇿',
    team: 'Serengeti Stampede', color: '#1eb53a', alt: '#00a3dd', color2: '#fcd116', skin: '#3f2618',
    speed: 0.95, power: 1.2, tackle: 1.18, size: 1.12,
    superType: 'cannon', superName: 'KILIMANJARO CANNON', sidekickHat: 'safari',
    signature: { name: 'STAMPEDE!', icon: '🦓', desc: 'Calls a herd of zebras and wildebeest to charge across the pitch.' },
    squad: { name: 'LION ROAR', icon: '🦁', desc: 'ROAR! Nearby rivals panic and run away.' },
    blurb: 'Once out-stared a lion. The lion apologised. Kicks the ball like an angry elephant.',
    quips: ['HAKUNA MATATA!', 'TWENDE!', 'POA KABISA!', 'MAMBO!'],
  },
  {
    id: 'amara', name: 'Little Amara Afropuff', short: 'Amara', nick: 'The Puff Princess of Kampala', country: 'Uganda', flag: '🇺🇬',
    team: 'Kampala Kids XI', color: '#f7a24b', alt: '#8a4a12', color2: '#3f5e96', skin: '#8d5236',
    speed: 1.1, power: 0.9, tackle: 0.9, size: 0.86,
    superType: 'sky', superName: 'PUFF PUFF PARACHUTE', sidekickHat: 'puffs',
    signature: { name: 'PUFF BOUNCE', icon: '🎈', desc: 'Boings over the defence on her afro puffs, bonking anyone close.' },
    squad: { name: 'SKIPPING ROPE', icon: '🪢', desc: 'Trips up the nearest rival. Double dutch!' },
    blurb: 'Eight years old. Undefeated at skipping, hopscotch and telling the referee he is wrong. Her puffs are bouncier than the ball.',
    quips: ['MY PUFFS!', 'NOT FAIR!', 'I TOLD YOU!', 'BOING BOING!'],
  },
  {
    id: 'tendai', name: "Tendai 'Turbo' Moyo", short: 'Tendai', nick: 'Late for School Again', country: 'Zimbabwe', flag: '🇿🇼',
    team: 'Bulawayo Bolts', color: '#1f6fe0', alt: '#0b2f66', color2: '#5f7a3a', skin: '#6b3d25',
    speed: 1.22, power: 0.92, tackle: 0.95, size: 0.86,
    superType: 'zigzag', superName: 'HOME TIME HURRICANE', sidekickHat: 'afro',
    signature: { name: "TAG, YOU'RE IT!", icon: '🏃', desc: 'Zooms off and tags every rival close by. They spin around looking for him.' },
    squad: { name: 'RACE YOU!', icon: '👟', desc: 'Playground sprint: a burst of speed and nobody can tackle you.' },
    blurb: 'Has never once walked anywhere. Runs to school, runs home, runs in his sleep. Mum says sit down. He cannot.',
    quips: ['RACE YOU!', 'TOO SLOW!', 'CATCH ME!', 'HOME TIME!'],
  },
];

const STADIUMS = [
  {
    id: 'lagos', name: 'Lagos Power Arena', desc: 'Generator-powered electric fences. Lightning. And NEPA may take light at any time.',
    grassA: '#2f9e44', grassB: '#38b04f', line: 'rgba(255,255,255,0.85)', bg: '#0b1026', bg2: '#1f2a66',
    wall: '#3ae0ff', wallDark: '#0d3a5c', wallFx: 'zap', hazard: 'lightning', creatures: ['goat'],
    crowd: ['#008751', '#ffffff', '#ffcc00', '#008751', '#e8433a', '#74c0fc'],
    playerGrip: 1, ballFric: 1, grav: 1, night: true,
  },
  {
    id: 'goma', name: 'Nyiragongo Bowl', desc: 'A pitch on the edge of a volcano in Goma. Meteors at no extra charge.',
    grassA: '#55752a', grassB: '#628733', line: 'rgba(255,230,200,0.8)', bg: '#1d0703', bg2: '#6b1a07',
    wall: '#ff6a00', wallDark: '#4a1500', wallFx: 'burn', hazard: 'meteor', creatures: ['goat'],
    crowd: ['#007fff', '#f7d618', '#ce1021', '#ffffff', '#ff922b'],
    playerGrip: 1, ballFric: 1, grav: 1, night: true,
  },
  {
    id: 'kili', name: 'Kilimanjaro Summit', desc: 'The roof of Africa is pure ice. Some Cape Town penguins took a very wrong turn.',
    grassA: '#d7f1fb', grassB: '#c3e7f7', line: 'rgba(40,110,190,0.75)', bg: '#6fb6e0', bg2: '#e6f6ff',
    wall: '#ffffff', wallDark: '#8cc4e6', wallFx: 'snow', hazard: 'penguin', creatures: ['penguin', 'goat'],
    crowd: ['#1eb53a', '#fcd116', '#00a3dd', '#000000', '#ffffff'],
    playerGrip: 0.28, ballFric: 0.45, grav: 1, night: false,
  },
  {
    id: 'mara', name: 'Maasai Mara Savannah', desc: 'Acacia trees, thorn-bush walls and elephants who refuse to leave the pitch.',
    grassA: '#a3b84a', grassB: '#b2c656', line: 'rgba(255,255,255,0.9)', bg: '#ffb347', bg2: '#ffe0a3',
    wall: '#8a6a2f', wallDark: '#5c4319', wallFx: 'hay', hazard: 'animals', creatures: ['elephant', 'giraffe', 'zebra'],
    crowd: ['#d62828', '#000000', '#006600', '#ffffff', '#ff7a00', '#1d3fbb'],
    playerGrip: 1, ballFric: 1.15, grav: 1, night: false,
  },
  {
    id: 'sahara', name: 'Sahara Oasis', desc: 'Sand-dune walls swallow you up. Camel caravans have right of way.',
    grassA: '#e9c98b', grassB: '#e2bf7c', line: 'rgba(120,70,20,0.65)', bg: '#f3a35c', bg2: '#ffe3b0',
    wall: '#f0c27b', wallDark: '#b07d3a', wallFx: 'sand', hazard: 'animals', creatures: ['camel', 'goat'],
    crowd: ['#c1272d', '#006233', '#ffffff', '#000000', '#f2c14e'],
    playerGrip: 0.85, ballFric: 1.35, grav: 1, night: false,
  },
  {
    id: 'afronaut', name: 'Afronaut Launchpad', desc: 'Africa\'s space programme finally made it! Low gravity. Occasional alien abductions.',
    grassA: '#35266a', grassB: '#40307e', line: 'rgba(130,255,235,0.85)', bg: '#03010c', bg2: '#1a0b3a',
    wall: '#b26bff', wallDark: '#3b1470', wallFx: 'zap', hazard: 'ufo', creatures: ['goat'],
    crowd: ['#198a00', '#ef7d00', '#de2010', '#000000', '#ffffff'],
    playerGrip: 0.9, ballFric: 0.8, grav: 0.38, night: true,
  },
];

const ITEMS = {
  banana:  { name: 'Plantain Peel',     short: 'PEEL', icon: '🍌', weight: 3, desc: 'Drops behind you. Comedy gold.' },
  chicken: { name: 'Market Chicken',    short: 'CHICKEN', icon: '🐔', weight: 3, desc: 'An angry homing chicken.' },
  bomb:    { name: 'Coconut Bomb',      short: 'BOMB', icon: '🥥', weight: 2, desc: 'Throw it. Run. Hits everyone.' },
  chili:   { name: 'Scotch Bonnet',     short: 'CHILLI', icon: '🌶️', weight: 2, desc: 'Fire feet! Burn past anyone.' },
  mega:    { name: 'Puff-Puff Power',   short: 'PUFF-PUFF', icon: '🍩', weight: 2, desc: 'Too much puff-puff. Become ENORMOUS.' },
  freeze:  { name: 'Harmattan Freeze',  short: 'FREEZE', icon: '❄️', weight: 2, desc: 'Freezing Harmattan wind. Rivals turn to ice.' },
  shrink:  { name: 'Tiny Tonic',        short: 'SHRINK', icon: '🧪', weight: 2, desc: 'Rivals go tiny and squeaky.' },
  bees:    { name: 'Killer Bees',       short: 'BEES', icon: '🐝', weight: 2, desc: 'African bees. Very angry. Very fast.' },
  wave:    { name: 'Talking Drum Shockwave', short: 'SHOCKWAVE', icon: '🥁', weight: 2, desc: 'BOOM! Blasts rivals away, then keeps them back for 3 seconds. Nobody can tackle you.' },
};
const ITEM_KEYS = Object.keys(ITEMS);

const PAIN_WORDS = ['CHAI!', 'EISH!', 'WAHALA!', 'MY ANKLE O!', 'HABA!', 'YEH!', 'MAMA O!', 'AYEEE!', 'NAWA O!', 'WHY NOW?!', 'MY BACK!', 'OUCH!'];
const KEEPER_SAVE_WORDS = ['NOT TODAY!', 'NO ENTRY!', 'MINE!', 'GO BACK!', 'GOTCHA!', 'NICE TRY O!'];
const KEEPER_FAIL_WORDS = ['CHAI...', 'BUTTERFINGERS', 'MY BAD', 'EISH', 'I BLINKED'];

const SPONSORS = ['SUYA & SONS', 'MAMA PUT DINER', 'UP NEPA!', 'FUFU FUEL', 'UGALI BANK', 'KENKEY KINGS', 'DANFO TRANSPORT', 'INJERA INSURANCE', 'PEPPER SOUP CO.', 'CHAPATI EXPRESS', 'OGA TELECOM', 'PUFF-PUFF PALACE'];

const COMMENTARY = {
  kickoff: ['Here we go! Let the wahala begin!', 'And we\'re off! Hold on to your hats!', 'Kick off! The physio is already warming up.', 'The whistle blows. Somewhere, a referee is praying.'],
  goal: [
    'GOOOOOAAAAL! {p} has disgraced that net!',
    '{p} SCORES! The keeper is checking flights out of the country!',
    'GOAL! Somebody bring that net some pepper soup!',
    'WHAT A STRIKE FROM {p}! I spilled my drink! ALL of my drink!',
    'GOAL for {t}! Chai! The keeper\'s mother is watching!',
    '{p}! YOU BEAUTIFUL MADNESS!',
    'IT\'S IN! {o} are shaking like a danfo on a pothole!',
  ],
  ownGoal: ['OWN GOAL! {p} has scored for the wrong team. Haba!', 'Ah ah! {p} just scored... for {t}. Na wa o!', 'OWN GOAL! {p} will be eating lunch alone today.'],
  superGoal: ['THE {s}! UNSTOPPABLE! THE KEEPER IS IN ANOTHER COUNTRY!', '{p} AND THE {s}! PHYSICS HAS LEFT THE STADIUM!', 'THAT {s} SHOULD BE ILLEGAL! EISH!'],
  super: ['Oh no. OH NO. {p} is charging the {s}!', '{p} unleashes the {s}!', 'Here comes the {s}! Everybody run!'],
  superSave: ['SAVED?! The keeper stopped the {s}! Is that allowed?!', 'The keeper survived the {s}! Give that person a goat!'],
  save: ['Great save! Big gloves, bigger heart.', 'The keeper says: NO ENTRY.', 'SAVED! Absolute octopus of a goalkeeper!', 'What a stop! Those gloves deserve a chieftaincy title!'],
  post: ['OFF THE POST! The post felt that one.', 'CLANG! The woodwork saves the day!', 'Off the frame! So close I can taste it. Tastes like metal.'],
  tackle: ['{p} goes in studs-first and sorry-later!', 'OUCH! That\'s going straight on the blooper reel.', '{v} is now horizontal. Thanks, {p}.', 'Chai! {v} has seen their ancestors!', '{p} with the slide! {v} with the screaming!'],
  cheap: ['CHEAP SHOT! {v} didn\'t even have the ball! {o} get an item for the trouble.', 'HABA! {p} flattened {v} for fun. Item to {o}!', 'That\'s a foul in 54 countries! {o} get compensation!'],
  zap: ['{v} hit the electric fence! You can see their SKELETON!', 'BZZZT! {v} has more power than NEPA right now!', '{v} has been electrocuted. Hair: ruined.'],
  burn: ['{v} touched the lava wall. Extra crispy, like suya!', '{v} is on fire! Literally! Medic!', 'Smells like barbecue. Poor {v}.'],
  snow: ['{v} is now a snowman on Kilimanjaro!', '{v} went face-first into the snowbank. Brrrr!', 'Cold one for {v}. Very cold.'],
  hay: ['{v} bounced off the thorn bush. OUCH!', 'The thorn bush wins that one, {v}.', '{v} has thorns in places thorns should not be.'],
  sand: ['{v} is buried in the sand dune!', 'The Sahara swallowed {v}! Somebody bring a shovel!', '{v} will be finding sand in their socks for a week.'],
  juke: ['{p} with the silky skills!', 'Ankles BROKEN! {p} is too slippery!', '{p} spins away! Like a fish in the Nile!'],
  perfect: ['PERFECT PASS! Telepathic stuff!', 'One-touch magic! Somebody frame that!'],
  item: {
    banana: ['{t} drop a plantain peel! A timeless classic.', 'Plantain peel on the pitch! Slip-related wahala incoming.'],
    chicken: ['A MARKET CHICKEN IS LOOSE!', '{p} launches a chicken! Where did they even get that?!'],
    bomb: ['Who gave {t} a COCONUT BOMB?!', 'Coconut bomb! Everybody scatter! Even you, ref!'],
    chili: ['{p} ate a whole scotch bonnet! Their feet are on fire!', 'Spicy! {p} is running on pure pepper!'],
    mega: ['{p} ate too much puff-puff! They\'re ENORMOUS!', 'Is it a bird? A plane? No, it\'s a gigantic {p}!'],
    freeze: ['Harmattan freeze! {o} are now ice sculptures!', 'BRRR! {o} are frozen solid!'],
    shrink: ['Tiny Tonic! {o} have been shrunk! Tiny legs, tiny dreams!', '{o} sound like chipmunks now!'],
    bees: ['KILLER BEES! WHY IS IT ALWAYS BEES?!', 'African bees released! {o} are not happy about it!'],
    wave: ['{p} hits the talking drum! SHOCKWAVE! {o} are blown away!', 'BOOM! {p} clears the area! Nobody can get near them!', 'Talking drum shockwave! {o} are flying like plastic bags!'],
  },
  hazard: {
    lightning: ['Lightning on the pitch! The ref says play on!', 'KA-BLAM! Mother Nature wants a goal too!'],
    blackout: ['NEPA HAS TAKEN LIGHT! Everybody play in the dark!', 'Power cut! Somebody on the generator, quick!'],
    meteor: ['METEOR! Nobody panic! Okay, everybody panic!', 'The volcano is throwing rocks again!'],
    penguin: ['Penguins on the pitch! They came all the way from Cape Town!', 'Penguin stampede! Watch your ankles!'],
    animals: ['Animals on the pitch! They do NOT have tickets!', 'The wildlife wants to play! Nobody tell the ranger!'],
    ufo: ['{v} has been ABDUCTED BY ALIENS! Is that a foul?!', 'Aliens have taken {v}! Probably for science.'],
  },
  chaos: {
    elephant: ['An ELEPHANT is on the pitch! Watch that trunk!', 'Elephant spotted! It has right of way. Always.'],
    giraffe: ['A giraffe wanders on! Nothing gets past that neck!', 'GIRAFFE! Best header in the stadium!'],
    zebra: ['A zebra is chasing the ball! Somebody sign it!', 'Zebra on the loose! It wants the ball!'],
    camel: ['A camel strolls on. It looks ready to spit.', 'Camel on the pitch! Keep your distance!'],
    goat: ['A stray goat! It is looking for someone to headbutt!', 'GOAT ON THE PITCH! And not the good kind of GOAT!'],
    penguin: ['Penguins! They slid all the way from Cape Town!', 'Penguin stampede! Mind your ankles!'],
    vendor: ['The Mama Put vendor is on the pitch! First to reach her gets a free snack!', 'Snack seller on the pitch! Free power-up for whoever gets there first!'],
    invader: ['PITCH INVADER! He wants the ball! Tackle him, somebody!', 'A fan has run onto the pitch! Security! SECURITY!'],
    dustdevil: ['A dust devil! Hold on to your shin pads!', 'Whirlwind on the pitch! Everybody spin!'],
    boostzone: ['A patch of magic sunshine! Run through it for a speed boost!', 'Sunshine zone! Free turbo for anyone who wants it!'],
    cratedrop: ['A supply plane! Crates incoming!', 'Air drop! Power-ups falling from the sky!'],
    puddle: ['Rain cloud! That corner is about to get MUDDY!', 'Here comes the rain. Mud bath incoming!'],
    springboard: ['Who put a SPRINGBOARD on the pitch?!', 'A trampoline appears! Health and safety have fainted.'],
  },
  golden: ['GOLDEN GOAL! Next goal wins! No pressure! LOADS of pressure!'],
  fulltime: ['That\'s full time! Somebody call an ambulance. Several, actually.', 'FULL TIME! What a match! That was MONATE!'],
  idle: ['The crowd are going wild!', 'The vuvuzelas are deafening!', 'Health and safety have left the stadium.', 'The referee appears to be hiding behind the suya stand.', 'Somebody\'s mama is going to be furious.', 'This match has more drama than Nollywood!'],
};

// Sidekick names & keepers, themed per captain
const SIDEKICK_NAMES = {
  dayo: ['Tunde', 'Emeka', 'Segun'], kip: ['Wanjiku', 'Otieno', 'Cheruiyot'], ama: ['Akosua', 'Kwabena', 'Abena'],
  hamada: ['Karim', 'Mostafa', 'Youssef'], wahala: ['Ngozi', 'Etienne', 'Test Subject 7'], ataya: ['Moussa', 'Awa', 'Ibrahima'],
  sipho: ['Thabo', 'Lerato', 'Mandla'], juma: ['Baraka', 'Neema', 'Zawadi'],
  amara: ['Nakato', 'Babirye', 'Mukasa'], tendai: ['Tatenda', 'Rudo', 'Farai'],
};
const KEEPER_NAMES = ['Big Hands Bayo', 'The Octopus of Accra', 'Mama\'s Gloves', 'The Wall of Kampala', 'Safe Hands Sibusiso', 'Catch-It Chidi'];
const KEEPER_ANTICS = [
  { icon: '📱', bubble: 'HELLO? MAMA?' }, { icon: '🍢', bubble: 'MMM SUYA...' }, { icon: '🤳', bubble: 'SELFIE TIME!' },
  { icon: '💤', bubble: 'ZZZZZ...' }, { icon: '🥤', bubble: '*SLURP*' }, { icon: '📰', bubble: 'TRANSFER RUMOURS...' },
];
const SKINS = ['#3d2516', '#4a2e1c', '#5a3825', '#6b4226', '#7a4a2e', '#8d5a3b', '#2e1b10'];
