// ============================================================================
//  MECHANICS CONFIG: every tunable number for the add-on mechanics lives here.
//  Each mechanic has its own `enabled` flag so it can be tested alone.
//
//  Quick toggles from the URL (no code edits needed):
//    index.html?mech=dodge            -> ONLY the dodge mechanic is on
//    index.html?mech=dodge,hyper      -> only dodge + hyper strike
//    index.html?mech=-hyper,-gear     -> everything EXCEPT hyper strike and gear
//  Names: dodge, charge, immobilize, offBall, hyper, gear
//
//  Distances are in game units. The pitch is 1800 units long; 45 units ~ 1 metre.
// ============================================================================

const MECH = {
  // 1. TIMED DODGE BOOST
  dodge: {
    enabled: true,
    cooldown: 2.0,          // seconds between dodges
    dashTime: 0.22,         // how long the sidestep lasts
    dashSpeedMult: 1.9,     // sidestep speed vs normal run speed
    invulnTime: 0.3,        // tackles pass through you during this time
    perfectRadius: 150,     // an enemy tackle this close and closing in at the moment you press = perfect
    boostMult: 1.3,         // +30% speed after a perfect dodge
    boostTime: 1.5,         // seconds of boost
  },

  // 2. CHARGEABLE TACKLES AND SHOTS (hold time in seconds)
  charge: {
    enabled: true,
    shotPerfectStart: 0.28, // releasing SHOOT between these hold times = perfect shot
    shotPerfectEnd: 0.42,
    shotPerfectPower: 1.2,  // shot speed multiplier for a perfect shot
    keeperSaveMult: 0.4,    // keeper save chance multiplier vs a perfect shot ("goalie-breaking")
    tackleMaxHold: 0.8,     // tackle auto-fires (normal) after this long
    tacklePerfectStart: 0.22,
    tacklePerfectEnd: 0.4,
    tacklePerfectSpeed: 1.35, // longer, faster slide
    tacklePerfectForce: 1.6,  // knock-back force multiplier
    meterMax: 0.6,          // the indicator shows hold time from 0 to this many seconds
  },

  // 3. TACKLE IMMOBILIZE
  immobilize: {
    enabled: true,
    duration: 2.5,          // seconds a tackled player stays down
  },

  // 4. OFF-BALL TACKLE PENALTY
  offBall: {
    enabled: true,
    unitsPerMetre: 45,
    distMetres: 5,          // victim further than this from the ball (and not the pass receiver) = foul
    noticeTime: 2.6,        // seconds the on-screen notice stays up
  },

  // 5. HYPER STRIKE (ULTIMATE)
  hyper: {
    enabled: true,
    firstSpawn: 20,         // seconds into a match before the first orb
    spawnEvery: 35,         // seconds between orbs (only one orb exists at a time)
    pickupRadius: 30,
    maxGoalDist: 950,       // holder must be at most this far from the goal to try
    zoneDepth: 420,         // defender-free zone in front of the goal: depth from the goal line...
    zoneHalfWidth: 300,     // ...and half-width around the centre line
    chargeTime: 0.7,        // hold POWER this long to charge
    chargeTimeout: 3.0,     // fail if not fully charged by then
    qteSteps: 3,            // button prompts to complete
    qteStepTime: 1.1,       // seconds per prompt
    points: 2,              // goals awarded on success
    cutsceneTime: 1.2,
    aiSuccess: { easy: 0.4, normal: 0.6, hard: 0.8 }, // CPU chance to pass the whole quick-time event
  },

  // 6. GEAR STAT TRADE-OFFS (applied to every outfield player of a team)
  gear: {
    enabled: true,
  },
};

// Gear: multipliers on the existing character stats (speed, power, tackle). 1 = unchanged.
const GEAR = {
  none:    { name: 'No Gear',          speed: 1,    power: 1,    tackle: 1 },
  boots:   { name: 'Heavy Boots',      speed: 0.88, power: 1.2,  tackle: 1.1 },
  sandals: { name: 'Feather Sandals',  speed: 1.15, power: 0.85, tackle: 0.9 },
  armour:  { name: 'Shin Armour',      speed: 0.92, power: 0.95, tackle: 1.3 },
  socks:   { name: 'Lucky Socks',      speed: 1.05, power: 1.1,  tackle: 0.8 },
};
const GEAR_KEYS = Object.keys(GEAR);
function gearLabel(k) {
  const g = GEAR[k]; if (!g) return '';
  const f = (n, v) => v === 1 ? '' : `${v > 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}% ${n}`;
  return [f('SPD', g.speed), f('PWR', g.power), f('TKL', g.tackle)].filter(Boolean).join(' ');
}

// URL overrides: ?mech=a,b (only these) or ?mech=-a,-b (all except these)
(function applyMechUrl() {
  try {
    const q = new URLSearchParams(location.search).get('mech');
    if (!q) return;
    const parts = q.split(',').map(s => s.trim()).filter(Boolean);
    const only = parts.filter(s => !s.startsWith('-'));
    if (only.length) for (const k in MECH) MECH[k].enabled = only.includes(k);
    for (const s of parts.filter(s => s.startsWith('-'))) if (MECH[s.slice(1)]) MECH[s.slice(1)].enabled = false;
  } catch (e) { /* no URL access: keep defaults */ }
})();
