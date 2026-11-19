// ============================================================================
//  MAYHEM CUP — game data: captains, stadiums, items, commentary
// ============================================================================

const CAPTAINS = [
  {
    id: 'brick', name: 'Brick Brockley', short: 'Brick', nick: 'The Human Fridge',
    team: 'Brockley Bulldozers', color: '#e8433a', alt: '#7a1f1a', color2: '#ffd23f', skin: '#f0b98a',
    speed: 0.9, power: 1.25, tackle: 1.4, size: 1.22,
    superType: 'boulder', superName: 'METEOR MASH', sidekickHat: 'headband',
    blurb: 'Bench-presses goalkeepers. Has never once skipped leg day, or any day.',
    quips: ['DO YOU EVEN LIFT, BALL?', 'PROTEIN!', 'I AM THE WALL NOW', 'FLEX TIME!'],
  },
  {
    id: 'zara', name: 'Zoomie Zara', short: 'Zara', nick: 'Jet-Skate Menace',
    team: "Zara's Zoomers", color: '#19c3e6', alt: '#0b5d70', color2: '#ffffff', skin: '#c98b5e',
    speed: 1.22, power: 0.92, tackle: 0.85, size: 0.95,
    superType: 'zigzag', superName: 'ZIG-ZAG ZAPPER', sidekickHat: 'helmet',
    blurb: 'Rocket roller-skates. Has been banned from 14 shopping centres.',
    quips: ['TOO FAST!', 'CATCH ME IF YOU CAN!', 'NYOOOM!', 'BEEP BEEP!'],
  },
  {
    id: 'nana', name: 'Nana Thunderboots', short: 'Nana', nick: 'Retired, Not Tired',
    team: 'The Bingo Bandits', color: '#9b59d0', alt: '#4a2370', color2: '#ffb3de', skin: '#f5cfb0',
    speed: 0.96, power: 1.12, tackle: 1.2, size: 0.92,
    superType: 'split', superName: 'KNITTING NEEDLE NIGHTMARE', sidekickHat: 'curlers',
    blurb: '87 years young. Her handbag contains a brick. Nobody knows why.',
    quips: ['BACK IN MY DAY!', 'WHERE ARE MY TEETH?', 'BINGO!', 'EAT YOUR VEG!'],
  },
  {
    id: 'chunko', name: 'El Chunko', short: 'Chunko', nick: 'The Belly of the Beast',
    team: 'Los Chunkitos', color: '#ff8a1f', alt: '#8a4100', color2: '#2a9d8f', skin: '#d99a6c',
    speed: 0.88, power: 1.22, tackle: 1.35, size: 1.3,
    superType: 'sky', superName: 'PILEDRIVER PUNT', sidekickHat: 'mask',
    blurb: 'Undefeated luchador. Treats every tackle as a title fight.',
    quips: ['¡OLÉ!', 'FROM THE TOP ROPE!', 'BELLY FLOP!', 'CHUNKO SMASH!'],
  },
  {
    id: 'fizz', name: 'Professor Fizz', short: 'Fizz', nick: 'Certified Mad Scientist',
    team: 'Fizz Lab Rejects', color: '#4cd137', alt: '#1e6b12', color2: '#e1ff5a', skin: '#f3d1b5',
    speed: 1.02, power: 1.05, tackle: 0.95, size: 1.0,
    superType: 'teleport', superName: 'QUANTUM KICK', sidekickHat: 'goggles',
    blurb: 'Split the atom. Then split the defence. Then split his trousers.',
    quips: ['IT\'S ALIVE!', 'FOR SCIENCE!', 'EUREKA!', 'HYPOTHESIS: GOAL'],
  },
  {
    id: 'reggie', name: 'Sir Reginald Moustache III', short: 'Sir Reggie', nick: 'Terribly Posh',
    team: 'Moustache United', color: '#2c3e8f', alt: '#7d8bd1', color2: '#f5c542', skin: '#f6d5bd',
    speed: 1.0, power: 1.12, tackle: 1.0, size: 1.05,
    superType: 'curve', superName: 'TEA-TIME TORPEDO', sidekickHat: 'tophat',
    blurb: 'His moustache has its own agent. Plays with a pinky raised.',
    quips: ['I SAY!', 'JOLLY GOOD!', 'TALLY HO!', 'HOW FRIGHTFULLY RUDE'],
  },
  {
    id: 'disco', name: 'Disco Dan', short: 'Dan', nick: 'King of the Groove',
    team: 'Saturday Night Fever FC', color: '#ff3fa4', alt: '#8e1059', color2: '#ffe600', skin: '#8d5a3b',
    speed: 1.08, power: 1.0, tackle: 0.95, size: 1.0,
    superType: 'dance', superName: 'BOOGIE BLASTER', sidekickHat: 'afro',
    blurb: 'Every step is a dance move. Every dance move is a foul.',
    quips: ['GET DOWN!', 'FEEL THE FUNK!', 'GROOVY!', 'SHAKE IT!'],
  },
  {
    id: 'barnacle', name: "Cap'n Barnacle", short: 'Barnacle', nick: 'Scourge of the Seven Pitches',
    team: 'The Scurvy Dogs', color: '#8b5a2b', alt: '#e0a96d', color2: '#e8c547', skin: '#e8b88f',
    speed: 0.95, power: 1.2, tackle: 1.18, size: 1.12,
    superType: 'cannon', superName: 'CANNONBALL CATASTROPHE', sidekickHat: 'bandana',
    blurb: 'Lost an eye, a leg and three cup finals. Still has the hat.',
    quips: ['ARRRR!', 'SHIVER ME SHINPADS!', 'YO HO HO!', 'WALK THE PLANK!'],
  },
];

const STADIUMS = [
  {
    id: 'thunder', name: 'The Thunderdome', desc: 'Electrified fences. Regular lightning. Zero health & safety.',
    grassA: '#2f9e44', grassB: '#38b04f', line: 'rgba(255,255,255,0.85)', bg: '#0b1026', bg2: '#1f2a66',
    wall: '#3ae0ff', wallDark: '#0d3a5c', wallFx: 'zap', hazard: 'lightning',
    crowd: ['#ff6b6b', '#ffd43b', '#74c0fc', '#ffffff', '#b197fc', '#63e6be'],
    playerGrip: 1, ballFric: 1, grav: 1, night: true,
  },
  {
    id: 'volcano', name: 'Mount Kaboom', desc: 'Built on an active volcano. Meteors at no extra charge.',
    grassA: '#55752a', grassB: '#628733', line: 'rgba(255,230,200,0.8)', bg: '#1d0703', bg2: '#6b1a07',
    wall: '#ff6a00', wallDark: '#4a1500', wallFx: 'burn', hazard: 'meteor',
    crowd: ['#ff922b', '#ffd43b', '#f03e3e', '#212529', '#ffffff'],
    playerGrip: 1, ballFric: 1, grav: 1, night: true,
  },
  {
    id: 'frost', name: 'Frostbite Fjord', desc: 'It\'s all ice. Penguins have right of way.',
    grassA: '#d7f1fb', grassB: '#c3e7f7', line: 'rgba(40,110,190,0.75)', bg: '#6fb6e0', bg2: '#e6f6ff',
    wall: '#ffffff', wallDark: '#8cc4e6', wallFx: 'snow', hazard: 'penguin',
    crowd: ['#1c7ed6', '#ffffff', '#fa5252', '#343a40', '#ffd43b'],
    playerGrip: 0.28, ballFric: 0.45, grav: 1, night: false,
  },
  {
    id: 'meadow', name: 'Moo Meadow', desc: 'The cows were here first and they will not be moved.',
    grassA: '#74c44a', grassB: '#83d258', line: 'rgba(255,255,255,0.9)', bg: '#7cc8ff', bg2: '#dff3ff',
    wall: '#e9c46a', wallDark: '#9c7a2b', wallFx: 'hay', hazard: 'cow',
    crowd: ['#ffffff', '#e03131', '#f08c00', '#2b8a3e', '#fcc419', '#5c3d1e'],
    playerGrip: 1, ballFric: 1.15, grav: 1, night: false,
  },
  {
    id: 'cosmo', name: 'Cosmo Station 9', desc: 'Low gravity. Occasional alien abductions. Bring a helmet.',
    grassA: '#35266a', grassB: '#40307e', line: 'rgba(130,255,235,0.85)', bg: '#03010c', bg2: '#1a0b3a',
    wall: '#b26bff', wallDark: '#3b1470', wallFx: 'zap', hazard: 'ufo',
    crowd: ['#69db7c', '#b197fc', '#66d9e8', '#ffffff', '#ff8787'],
    playerGrip: 0.9, ballFric: 0.8, grav: 0.38, night: true,
  },
];

const ITEMS = {
  banana:  { name: 'Banana Peel',      icon: '🍌', weight: 3, desc: 'Drops behind you. Comedy gold.' },
  chicken: { name: 'Rubber Chicken',   icon: '🐔', weight: 3, desc: 'Homing poultry missile.' },
  bomb:    { name: 'Bomb',             icon: '💣', weight: 2, desc: 'Throw it. Run. Hits everyone.' },
  chili:   { name: 'Turbo Chili',      icon: '🌶️', weight: 2, desc: 'Fire feet! Burn past anyone.' },
  mega:    { name: 'Mega Milkshake',   icon: '🥤', weight: 2, desc: 'Become ENORMOUS. Flatten things.' },
  freeze:  { name: 'Freeze Ray',       icon: '❄️', weight: 2, desc: 'Turn nearby rivals to ice.' },
  shrink:  { name: 'Shrink Ray',       icon: '🔬', weight: 2, desc: 'Rivals go tiny and squeaky.' },
  bees:    { name: 'Angry Bees',       icon: '🐝', weight: 2, desc: 'Why is it always bees?' },
};
const ITEM_KEYS = Object.keys(ITEMS);

const PAIN_WORDS = ['OOF!', 'BONK!', 'MY SPLEEN!', 'WAAH!', 'OUCH!', 'NOT THE FACE!', 'MUMMY!', 'YEOWCH!', 'MY ANKLES!', 'WHY?!', 'ARGH!', 'OW OW OW'];
const KEEPER_SAVE_WORDS = ['NOPE!', 'DENIED!', 'MINE!', 'NOT TODAY!', 'GOTCHA!', 'NICE TRY!'];
const KEEPER_FAIL_WORDS = ['WHOOPS', 'BUTTERFINGERS', 'MY BAD', 'UH OH', 'I BLINKED'];

const SPONSORS = ['SNACKZILLA', 'BURP COLA', 'NOT-A-SCAM BANK', "GRANDMA'S SOCKS", 'MEGA SHINPADS', 'SOGGY CHIPS CO.', 'LEGIT INSURANCE', 'DUCK TAPE', 'MOIST WIPES', 'TURBO BEANS'];

const COMMENTARY = {
  kickoff: ['Here we go! Let the chaos commence!', 'And we\'re off! Hide your children!', 'Kick off! The physio is already warming up.', 'The whistle blows. Somewhere, a referee weeps.'],
  goal: [
    'GOOOOOAAAAL! {p} has done something unforgivable to that net!',
    '{p} SCORES! The keeper is reconsidering their career choices!',
    'GOAL! The net has filed a formal complaint!',
    'WHAT A STRIKE FROM {p}! I spilled my tea! ALL of my tea!',
    'GOAL for {t}! Somebody check on that goalkeeper\'s dignity!',
    '{p}! YOU BEAUTIFUL MANIAC!',
    'IT\'S IN! {o} are absolutely bamboozled!',
  ],
  ownGoal: ['OWN GOAL! {p} has scored for the wrong team. Spectacularly.', 'Oh dear. {p} just scored... for {t}. Awkward.', 'OWN GOAL! {p} will be eating lunch alone today.'],
  superGoal: ['THE {s}! UNSTOPPABLE! THE KEEPER IS IN ANOTHER POSTCODE!', '{p} AND THE {s}! PHYSICS HAS LEFT THE BUILDING!', 'THAT {s} SHOULD BE ILLEGAL! IT PROBABLY IS!'],
  super: ['Oh no. OH NO. {p} is charging the {s}!', '{p} unleashes the {s}!', 'Here comes the {s}! Somebody call the army!'],
  superSave: ['SAVED?! The keeper stopped the {s}! Is that even allowed?!', 'The keeper survived the {s}! Give that robot a raise!'],
  save: ['Great save! Big gloves, bigger heart.', 'The keeper says: NOT TODAY.', 'SAVED! Absolute octopus of a goalkeeper!', 'What a stop! Those gloves are insured for millions!'],
  post: ['OFF THE POST! The post felt that one.', 'CLANG! The woodwork saves the day!', 'Off the frame! So close I can taste it. Tastes like metal.'],
  tackle: ['{p} goes in studs-first and sincerely-second!', 'OUCH! That\'s going straight on the blooper reel.', '{v} is now horizontal. Thanks, {p}.', 'What a tackle! {v} has seen the light!', '{p} with the slide! {v} with the screaming!'],
  cheap: ['CHEAP SHOT! {v} didn\'t even have the ball! {o} get an item to cheer them up.', 'DIRTY! {p} flattened {v} for fun. Item to {o}!', 'That\'s a foul in 47 countries! {o} get compensation!'],
  zap: ['{v} hit the electric fence! You can see their SKELETON!', 'BZZZT! {v} is fully charged now!', '{v} has been electrocuted. Hair: ruined.'],
  burn: ['{v} touched the lava wall. Extra crispy!', '{v} is on fire! Literally! Medic!', 'Smells like barbecue. Poor {v}.'],
  snow: ['{v} is now a snowman!', '{v} went face-first into the snowbank. Brrrr!', 'Cold one for {v}. Very cold.'],
  hay: ['{v} bounced off a hay bale. BOING!', 'The hay bale wins that one, {v}.', '{v} has hay in places hay should not be.'],
  juke: ['{p} with the silky skills!', 'Ankles BROKEN! {p} is too slippery!', '{p} spins away! Like a buttered eel!'],
  perfect: ['PERFECT PASS! Telepathic stuff!', 'One-touch magic! Somebody frame that!'],
  item: {
    banana: ['{t} drop a banana! A timeless classic.', 'Banana on the pitch! Slip-related injuries incoming.'],
    chicken: ['RUBBER CHICKEN INCOMING!', '{p} fires a rubber chicken! BAWK!'],
    bomb: ['Who gave {t} a BOMB?!', 'Bomb! Everybody scatter! Even you, ref!'],
    chili: ['{p} ate the chili! Their feet are literally on fire!', 'Spicy! {p} is running on pure heartburn!'],
    mega: ['{p} drank the Mega Milkshake! They\'re ENORMOUS!', 'Is it a bird? A plane? No, it\'s a gigantic {p}!'],
    freeze: ['Freeze ray! {o} are now ice sculptures!', 'BRRR! {o} are frozen solid!'],
    shrink: ['{o} have been shrunk! Tiny legs, tiny dreams!', 'Shrink ray! {o} sound like chipmunks now!'],
    bees: ['BEES! WHY IS IT ALWAYS BEES?!', 'Angry bees released! {o} are not happy about it!'],
  },
  hazard: {
    lightning: ['Lightning on the pitch! The ref says play on!', 'KA-BLAM! Mother Nature wants a goal too!'],
    meteor: ['METEOR! Nobody panic! Okay, everybody panic!', 'A meteor! Bit of an overreaction from the volcano.'],
    penguin: ['Penguins on the pitch! They do NOT have tickets!', 'Penguin stampede! Watch your ankles!'],
    cow: ['A cow has wandered onto the pitch. She looks unimpressed.', 'MOO! The cow is playing for neither team.'],
    ufo: ['{v} has been ABDUCTED BY ALIENS! Is that a foul?!', 'Aliens have taken {v}! Probably for science.'],
  },
  golden: ['GOLDEN GOAL! Next goal wins! No pressure! LOADS of pressure!'],
  fulltime: ['That\'s full time! Somebody call an ambulance. Several, actually.', 'FULL TIME! What a match! I need a lie down.'],
  idle: ['The crowd are going bananas!', 'I haven\'t seen football like this since... ever. Never.', 'Health and safety have left the stadium.', 'This is not how I was taught football.', 'The referee appears to be hiding.', 'Somebody\'s mum is going to be furious.'],
};
