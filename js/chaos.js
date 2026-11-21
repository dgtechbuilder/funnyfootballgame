// ============================================================================
//  PITCH CHAOS: walking Roblox-style animals with real effects on play, plus a
//  random scheduler of obstacles (pitch invader, dust devil, mud puddle) and
//  helpers (snack vendor, sunshine boost zone, springboard, crate air-drop).
//  Several are tied into the power-up system: the vendor and air-drop hand out
//  items, tackling the pitch invader earns one, and a hard shot that hits an
//  animal knocks a ? crate loose.
//  Tunables: MECH.chaos in js/config.js. Runs only with "Stadium Hazards" ON.
// ============================================================================

function chaosState() {
  if (!M.chaos) M.chaos = { creatures: [], events: [], spits: [], next: MECH.chaos.firstEvent };
  return M.chaos;
}
const chaosCfg = () => MECH.chaos;

// ---------------------------------------------------------------------------
//  Spawning
// ---------------------------------------------------------------------------
function spawnChaos() {
  const C = chaosCfg(), ch = chaosState();
  const w = Object.assign({}, C.weights);
  if (ch.events.length >= C.maxEvents) for (const k in w) if (k !== 'animal') w[k] = 0;
  const keys = Object.keys(w).filter(k => w[k] > 0);
  if (!keys.length) return;
  let r = Math.random() * keys.reduce((a, k) => a + w[k], 0), kind = keys[0];
  for (const k of keys) { r -= w[k]; if (r <= 0) { kind = k; break; } }
  if (kind === 'animal') spawnCreature(pick(M.stadium.creatures || ['goat']));
  else spawnEvent(kind);
}

function spawnCreature(kind) {
  const C = chaosCfg(), ch = chaosState();
  if (kind === 'penguin') return spawnPenguins();
  if (ch.creatures.filter(c => c.kind !== 'penguin').length >= C.maxCreatures) return;
  const fromTop = Math.random() < 0.5;
  ch.creatures.push({
    kind, x: rand(300, FW - 300), y: fromTop ? -70 : FH + 70, vx: 0, vy: 0, dir: Math.random() < 0.5 ? 1 : -1,
    t: rand(0, 10), phase: 'enter', life: rand(C.creatureLife[0], C.creatureLife[1]),
    tx: rand(260, FW - 260), ty: rand(200, FH - 200), cd: rand(2, 3.5), state: 'walk', stateT: 0,
    r: C[kind].r, gait: 0, kickT: 0, dropCD: 0, hit: [],
  });
  SFX.animal(kind);
  say(COMMENTARY.chaos[kind] || COMMENTARY.hazard.animals, {}, 1);
}

function spawnPenguins() {
  const C = chaosCfg().penguin, ch = chaosState();
  const n = randi(3, 5), fromTop = Math.random() < 0.5, x0 = rand(250, FW - 250);
  for (let i = 0; i < n; i++) ch.creatures.push({
    kind: 'penguin', x: x0 + i * rand(40, 70) - n * 25, y: fromTop ? -40 - i * 50 : FH + 40 + i * 50,
    vx: rand(-40, 40), vy: (fromTop ? 1 : -1) * rand(C.speed * 0.9, C.speed * 1.1), dir: 1, t: rand(0, 5), phase: 'slide',
    r: C.r, gait: 1, hit: [], dropCD: 0, kickT: 0,
  });
  SFX.penguin();
  say(COMMENTARY.chaos.penguin, {}, 1);
}

function spawnEvent(kind) {
  const C = chaosCfg(), ch = chaosState();
  const side = Math.random() < 0.5 ? -1 : 1;
  const spot = () => ({ x: rand(FW * 0.22, FW * 0.78), y: rand(FH * 0.18, FH * 0.82) });
  let e = null;
  switch (kind) {
    case 'vendor': e = { x: side < 0 ? -60 : FW + 60, y: rand(220, FH - 220), dir: -side, leaving: false }; break;
    case 'invader': e = { x: side < 0 ? -60 : FW + 60, y: rand(200, FH - 200), vx: 0, vy: 0, face: 0, carry: false, carryT: 0, idleT: 0, leaving: false, downT: 0 }; break;
    case 'dustdevil': { const s = spot(), a = rand(0, TAU); e = Object.assign(s, { vx: Math.cos(a) * C.dustdevil.speed, vy: Math.sin(a) * C.dustdevil.speed, life: C.dustdevil.life, turnT: 1 }); break; }
    case 'boostzone': e = Object.assign(spot(), { life: C.boostzone.life }); break;
    case 'puddle': e = Object.assign(spot(), { life: C.puddle.life + 1.4, rainT: 1.4 }); break;
    case 'springboard': e = Object.assign(spot(), { life: C.springboard.life, cdBall: 0, cds: new Map() }); break;
    case 'cratedrop': e = { x: side < 0 ? -250 : FW + 250, y: rand(260, FH - 260), dir: -side, drops: C.cratedrop.count, nextDrop: rand(0.2, 0.5) }; break;
  }
  if (!e) return;
  e.type = kind; e.t = 0;
  ch.events.push(e);
  say(COMMENTARY.chaos[kind], {}, 1);
  SFX.item();
}

// ---------------------------------------------------------------------------
//  Update
// ---------------------------------------------------------------------------
function updateChaos(dt, frozenPlay) {
  const C = chaosCfg(), ch = chaosState();
  if (C.enabled && M.cfg.hazards && !frozenPlay && M.phase === 'play') {
    ch.next -= dt;
    if (ch.next <= 0) { ch.next = rand(C.interval[0], C.interval[1]); spawnChaos(); }
  }
  for (let i = ch.creatures.length - 1; i >= 0; i--) if (updateCreature(ch.creatures[i], dt, frozenPlay)) ch.creatures.splice(i, 1);
  for (let i = ch.events.length - 1; i >= 0; i--) if (updateEvent(ch.events[i], dt, frozenPlay)) ch.events.splice(i, 1);
  for (let i = ch.spits.length - 1; i >= 0; i--) if (updateSpit(ch.spits[i], dt)) ch.spits.splice(i, 1);
}

function walkTo(cr, tx, ty, speed, dt) {
  const dx = tx - cr.x, dy = ty - cr.y, d = Math.hypot(dx, dy);
  const s = d < 6 ? 0 : speed;
  cr.vx += ((d ? dx / d : 0) * s - cr.vx) * Math.min(1, dt * 4);
  cr.vy += ((d ? dy / d : 0) * s - cr.vy) * Math.min(1, dt * 4);
  if (Math.abs(cr.vx) > 8) cr.dir = cr.vx > 0 ? 1 : -1;
  return d;
}
function playersNear(x, y, r, filter = null) { return M.all.filter(p => isUp(p) && p.z < 40 && dist(p.x, p.y, x, y) < r + p.r && (!filter || filter(p))); }
function nearestPlayer(x, y, maxD, outfieldOnly = true) {
  let best = null, bd = maxD;
  for (const p of outfieldOnly ? M.outfield : M.all) { if (!canAct(p)) continue; const d = dist(p.x, p.y, x, y); if (d < bd) { bd = d; best = p; } }
  return best;
}
function ballFree() { const b = M.ball; return !b.owner && !b.super && !b.carried; }

// animals are solid: players get pushed out, the ball bounces off (and a hard shot can knock loose a crate)
function creatureObstacle(cr) {
  if (cr.kind === 'penguin') return;
  const b = M.ball, C = chaosCfg();
  for (const p of M.all) {
    if (p.state === 'abducted' || p.z > 40) continue;
    const d = dist(p.x, p.y, cr.x, cr.y), m = p.r + cr.r;
    if (d < m && d > 0) { const nx = (p.x - cr.x) / d, ny = (p.y - cr.y) / d; p.x = cr.x + nx * m; p.y = cr.y + ny * m; }
  }
  if (ballFree() && b.z < 70) {
    const d = dist(b.x, b.y, cr.x, cr.y), m = BALL_R + cr.r;
    if (d < m && d > 0) {
      const nx = (b.x - cr.x) / d, ny = (b.y - cr.y) / d, vn = b.vx * nx + b.vy * ny;
      b.x = cr.x + nx * m; b.y = cr.y + ny * m;
      if (vn < 0) {
        b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny;
        if (-vn > 650 && cr.dropCD <= 0) {
          SFX.animal(cr.kind); b.shot = null; cr.dropCD = 4;
          floatText(cr.x, cr.y, 110, pick(['OUCH!', 'HEY!', 'RUDE!']), '#fff', 24);
          if (M.cfg.items && Math.random() < C.shotDropChance) { M.boxes.push({ x: cr.x + rand(-40, 40), y: cr.y + rand(-40, 40), z: 120, vz: 300, t: 0 }); floatText(cr.x, cr.y, 140, 'A CRATE FELL OUT!', '#ffd43b', 22); }
        }
      }
    }
  }
}

function updateCreature(cr, dt, frozenPlay) {
  const C = chaosCfg(), K = C[cr.kind] || {}, b = M.ball;
  cr.t += dt; cr.cd -= dt; cr.kickT = Math.max(0, cr.kickT - dt); cr.dropCD -= dt;
  // ---- penguins: straight belly-slide across the pitch
  if (cr.kind === 'penguin') {
    cr.x += cr.vx * dt; cr.y += cr.vy * dt; cr.dir = cr.vx >= 0 ? 1 : -1;
    if (!frozenPlay) {
      for (const p of M.all) {
        if (!isUp(p) || p.z > 30 || p.state === 'spin' || cr.hit.includes(p)) continue;
        if (dist(p.x, p.y, cr.x, cr.y) < p.r + cr.r) {
          cr.hit.push(p); dropBall(p);
          p.state = 'spin'; p.stateT = 1.1; p.vx = cr.vx * 0.9 + rand(-100, 100); p.vy = cr.vy * 0.9; p.expr = 'panic';
          bubble(p, pick(['PENGUIN\'D!', 'NOOT NOOT?!', 'SLIPPERY!'])); SFX.penguin();
        }
      }
      if (ballFree() && b.z < 30 && dist(b.x, b.y, cr.x, cr.y) < BALL_R + cr.r) { b.vx = cr.vx * 1.4 + rand(-200, 200); b.vy = cr.vy * 1.4; b.vz = 180; SFX.penguin(); }
    }
    return cr.y < -120 || cr.y > FH + 120;
  }
  // ---- walking animals: enter -> roam -> leave
  let speed = K.speed;
  if (cr.phase === 'enter' || cr.phase === 'roam') {
    cr.life -= dt;
    if (cr.life <= 0) { cr.phase = 'leave'; cr.tx = cr.x; cr.ty = cr.y < FH / 2 ? -140 : FH + 140; }
  }
  if (cr.state === 'walk') {
    const d = walkTo(cr, cr.tx, cr.ty, speed, dt);
    if (d < 20 && cr.phase !== 'leave') { cr.phase = 'roam'; cr.tx = clamp(cr.x + rand(-450, 450), 160, FW - 160); cr.ty = clamp(cr.y + rand(-300, 300), 140, FH - 140); }
  } else { cr.vx *= Math.exp(-6 * dt); cr.vy *= Math.exp(-6 * dt); cr.stateT -= dt; if (cr.stateT <= 0) cr.state = 'walk'; }
  if (!frozenPlay && cr.phase !== 'leave') creatureAct(cr, K, dt);
  cr.x += cr.vx * dt; cr.y += cr.vy * dt;
  cr.gait = clamp(Math.hypot(cr.vx, cr.vy) / Math.max(40, K.speed), 0, 1.4);
  creatureObstacle(cr);
  return cr.phase === 'leave' && (cr.y < -120 || cr.y > FH + 120);
}

function creatureAct(cr, K, dt) {
  const b = M.ball;
  switch (cr.kind) {
    case 'elephant': { // trunk spray: everyone in front slips, the ball gets blasted
      if (cr.state === 'walk' && cr.cd <= 0) {
        const inCone = p => { const dx = p.x - cr.x, dy = p.y - cr.y, d = Math.hypot(dx, dy); return d < K.sprayRange && dx * cr.dir > 0 && Math.abs(dy) < d * 0.6 + 40; };
        const victims = M.outfield.filter(p => isUp(p) && inCone(p));
        if (!victims.length && Math.random() > 0.3) { cr.cd = 1; break; }
        cr.state = 'spray'; cr.stateT = 0.9; cr.cd = rand(K.sprayEvery[0], K.sprayEvery[1]);
        SFX.animal('elephant'); SFX.noise(0.7, 0.25, 'highpass', 2500, 1200);
        for (let i = 0; i < 30; i++) part({ x: cr.x + cr.dir * 70, y: cr.y + rand(-20, 20), z: 50, vx: cr.dir * rand(250, 520), vy: rand(-160, 160), vz: rand(40, 220), g: 500, life: 0.7, max: 0.7, size: rand(4, 7), color: pick(['#74c0fc', '#a5d8ff', '#ffffff']), kind: 'snow' });
        for (const p of victims) { dropBall(p); p.state = 'spin'; p.stateT = 0.9; p.vx = cr.dir * 420; p.vy = rand(-120, 120); p.expr = 'panic'; bubble(p, pick(['SPLASH!', 'SO WET!', 'MY KIT!'])); }
        if (ballFree() && inCone(b)) { b.vx = cr.dir * 760; b.vy = rand(-200, 200); b.vz = 180; b.shot = null; }
        floatText(cr.x, cr.y, 120, 'SPLOOSH!', '#a5d8ff', 30);
      }
      break;
    }
    case 'giraffe': { // heads any ball within reach, even high lobs
      if (cr.cd <= 0 && !b.owner && !b.super && !b.carried && b.z < 230 && dist(b.x, b.y, cr.x + cr.dir * 30, cr.y) < K.reach) {
        const a = Math.atan2(b.y - cr.y, b.x - cr.x) + rand(-1.2, 1.2);
        b.vx = Math.cos(a) * K.headerSpeed; b.vy = Math.sin(a) * K.headerSpeed; b.vz = 300; b.shot = null; b.passTarget = null;
        cr.kickT = 0.45; cr.cd = 1.6; SFX.bonk();
        floatText(cr.x, cr.y, 160, 'GIRAFFE HEADER!', '#ffd43b', 26);
      }
      break;
    }
    case 'zebra': { // chases the loose ball and hoofs it anywhere
      const bd = dist(b.x, b.y, cr.x, cr.y);
      if (ballFree() && bd < K.chaseRange && cr.phase !== 'leave') { cr.tx = clamp(b.x, 60, FW - 60); cr.ty = clamp(b.y, 60, FH - 60); walkTo(cr, cr.tx, cr.ty, K.chaseSpeed, dt); }
      if (cr.cd <= 0) {
        if (ballFree() && b.z < 40 && bd < cr.r + BALL_R + 10) {
          const a = Math.atan2(b.y - cr.y, b.x - cr.x) + rand(-0.6, 0.6);
          b.vx = Math.cos(a) * K.kickSpeed; b.vy = Math.sin(a) * K.kickSpeed; b.vz = 160; b.shot = null; b.passTarget = null;
          cr.kickT = 0.4; cr.cd = 2.2; SFX.kick(0.7); floatText(cr.x, cr.y, 110, 'HOOF IT!', '#fff', 26);
        } else if (b.owner && b.owner.role !== 'keeper' && dist(b.owner.x, b.owner.y, cr.x, cr.y) < cr.r + 26 && Math.random() < dt * 3) {
          const o = b.owner; knock(o, (o.x - cr.x) * 4, (o.y - cr.y) * 4, 0.7, 'zebra'); bubble(o, 'ZEBRA\'D!'); cr.cd = 2; cr.kickT = 0.4;
        }
      }
      break;
    }
    case 'camel': { // alternates walking and sitting; spits at the nearest player
      if (cr.state === 'walk' && Math.random() < dt * 0.12) { cr.state = 'sit'; cr.stateT = rand(3, 5); }
      if (cr.cd <= 0) {
        const tgt = nearestPlayer(cr.x, cr.y, K.spitRange);
        cr.cd = tgt ? rand(K.spitEvery[0], K.spitEvery[1]) : 1;
        if (tgt) {
          const a = Math.atan2(tgt.y - cr.y, tgt.x - cr.x); cr.dir = Math.cos(a) >= 0 ? 1 : -1; cr.kickT = 0.5;
          chaosState().spits.push({ x: cr.x + cr.dir * 40, y: cr.y, z: 70, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, life: 1.2, target: tgt });
          SFX.noise(0.25, 0.25, 'bandpass', 900, 400);
        }
      }
      break;
    }
    case 'goat': { // charges and headbutts the nearest player
      if (cr.state === 'walk' && cr.cd <= 0) {
        const tgt = nearestPlayer(cr.x, cr.y, K.chargeRange);
        cr.cd = tgt ? rand(K.chargeEvery[0], K.chargeEvery[1]) : 1;
        if (tgt) {
          const a = Math.atan2(tgt.y - cr.y, tgt.x - cr.x);
          cr.state = 'charge'; cr.stateT = 0.75; cr.hit = [];
          cr.vx = Math.cos(a) * K.chargeSpeed; cr.vy = Math.sin(a) * K.chargeSpeed; cr.dir = cr.vx >= 0 ? 1 : -1;
          SFX.animal('goat');
        }
      }
      if (cr.state === 'charge') {
        cr.vx *= Math.exp(1.5 * dt); cr.vy *= Math.exp(1.5 * dt); // keep charging (state timer handles the stop)
        for (const p of playersNear(cr.x, cr.y, cr.r + 6)) {
          if (cr.hit.includes(p) || p.role === 'keeper') continue;
          cr.hit.push(p); knock(p, cr.vx * 0.7, cr.vy * 0.7, 1.0, 'goat'); bubble(p, 'BAAAH!');
          floatText(p.x, p.y, 80, 'HEADBUTT!', '#fff', 24); cr.stateT = Math.min(cr.stateT, 0.15);
        }
        if (ballFree() && b.z < 30 && dist(b.x, b.y, cr.x, cr.y) < cr.r + BALL_R + 4) { b.vx = cr.vx * 1.6; b.vy = cr.vy * 1.6; b.vz = 120; }
      }
      break;
    }
  }
}

function updateSpit(s, dt) {
  s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z = Math.max(10, s.z - 40 * dt);
  if (Math.random() < 0.6) part({ x: s.x, y: s.y, z: s.z, life: 0.3, max: 0.3, size: 4, color: '#c0eb75', kind: 'dot' });
  for (const p of M.outfield) {
    if (!isUp(p) || dist(p.x, p.y, s.x, s.y) > p.r + 10) continue;
    dropBall(p); p.state = 'spin'; p.stateT = 0.8; p.expr = 'panic'; bubble(p, pick(['PTOOEY!', 'EWWW!', 'CAMEL SPIT!']));
    burst(p.x, p.y, 50, 12, ['#c0eb75', '#94d82d'], 160, 'dot', 5, 0.5, 300);
    return true;
  }
  return s.life <= 0;
}

// ---------------------------------------------------------------------------
//  Events: obstacles and helpers
// ---------------------------------------------------------------------------
function updateEvent(e, dt, frozenPlay) {
  const C = chaosCfg(), b = M.ball;
  e.t += dt;
  switch (e.type) {
    case 'vendor': { // helper: first player to reach her gets a free item (or a speed boost if pockets are full)
      const sp = e.leaving ? 220 : C.vendor.speed;
      e.x += e.dir * sp * dt; e.y += Math.sin(e.t * 2) * 25 * dt;
      if (!e.leaving && !frozenPlay) {
        const p = M.outfield.find(q => canAct(q) && dist(q.x, q.y, e.x, e.y) < q.r + 22);
        if (p) {
          e.leaving = true;
          const key = randomItem(p.team);
          if (M.cfg.items && giveItem(p.team, key)) floatText(e.x, e.y, 120, `${ITEMS[key].icon} FREE ${ITEMS[key].name.toUpperCase()}!`, '#ffd43b', 22);
          else { p.fx.boost = 3; floatText(e.x, e.y, 120, 'FREE PUFF-PUFF! SPEED BOOST!', '#ffd43b', 22); }
          bubble(p, pick(['THANK YOU MAMA!', 'MMM SNACKS!'])); SFX.pickup();
        }
      }
      return e.x < -120 || e.x > FW + 120;
    }
    case 'invader': { // obstacle: grabs the ball and runs; tackle him for a reward
      if (e.downT > 0) { e.downT -= dt; if (e.downT <= 0) e.leaving = true; return false; }
      const sp = C.invader.speed;
      let tx, ty;
      if (e.leaving) { tx = e.x < FW / 2 ? -120 : FW + 120; ty = e.y; }
      else if (e.carry) {
        const th = nearestPlayer(e.x, e.y, 400);
        const ax = th ? e.x - th.x : rand(-1, 1), ay = th ? e.y - th.y : rand(-1, 1), al = Math.hypot(ax, ay) || 1;
        tx = clamp(e.x + ax / al * 200 + Math.sin(e.t * 3) * 120, 80, FW - 80); ty = clamp(e.y + ay / al * 200, 80, FH - 80);
        e.carryT -= dt;
        if (e.carryT <= 0) { releaseCarry(e, 300); e.leaving = true; floatText(e.x, e.y, 100, 'HE DROPPED IT!', '#fff', 22); }
      } else { tx = b.x; ty = b.y; e.idleT += dt; if (e.idleT > 7) e.leaving = true; }
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
      e.vx += (dx / d * sp - e.vx) * Math.min(1, dt * 5); e.vy += (dy / d * sp - e.vy) * Math.min(1, dt * 5);
      e.x += e.vx * dt; e.y += e.vy * dt; e.face = Math.atan2(e.vy, e.vx);
      if (!e.leaving) { e.x = clamp(e.x, 40, FW - 40); e.y = clamp(e.y, 40, FH - 40); }
      if (!frozenPlay && !e.leaving) {
        // steal the ball
        if (!e.carry && !b.super && b.z < 40 && dist(b.x, b.y, e.x, e.y) < 34 && (!b.owner || b.owner.role !== 'keeper')) {
          if (b.owner) { const o = b.owner; dropBall(o); bubble(o, 'HEY! THAT\'S MINE!'); }
          e.carry = true; e.carryT = C.invader.carryTime; b.carried = e; b.owner = null; b.shot = null; b.passTarget = null;
          floatText(e.x, e.y, 110, 'HE STOLE THE BALL!', '#ff8787', 24); SFX.cheer(0.6);
        }
        // tackled: ball comes loose and the tackler's team earns an item
        const tk = M.outfield.find(p => p.state === 'tackle' && dist(p.x, p.y, e.x, e.y) < p.r + 24);
        if (tk) {
          if (e.carry) releaseCarry(e, 250);
          e.downT = 1.3; e.vx = tk.vx * 0.5; e.vy = tk.vy * 0.5;
          floatText(e.x, e.y, 110, 'SECURITY TACKLE!', '#7CFC00', 26); SFX.tackle(); shake(6);
          if (M.cfg.items) { const key = randomItem(tk.team); if (giveItem(tk.team, key)) floatText(tk.x, tk.y, 90, `${ITEMS[key].icon} REWARD!`, '#ffd43b', 22); }
          say([`${tk.name} brings down the pitch invader! The crowd loves it!`], {}, 2);
        }
      }
      if (e.carry) { b.x = clamp(e.x + Math.cos(e.face) * 26, 20, FW - 20); b.y = clamp(e.y + Math.sin(e.face) * 26, 20, FH - 20); b.z = 0; b.vx = e.vx; b.vy = e.vy; b.vz = 0; }
      const gone = e.leaving && (e.x < -100 || e.x > FW + 100);
      if (gone && e.carry) releaseCarry(e, 0);
      return gone;
    }
    case 'dustdevil': { // obstacle: wanders, spins players, swirls the ball up and flings it
      const R = C.dustdevil.r;
      e.life -= dt; e.turnT -= dt;
      if (e.turnT <= 0) { e.turnT = rand(0.8, 1.6); const a = rand(0, TAU); e.vx = Math.cos(a) * C.dustdevil.speed; e.vy = Math.sin(a) * C.dustdevil.speed; }
      e.x = clamp(e.x + e.vx * dt, 80, FW - 80); e.y = clamp(e.y + e.vy * dt, 80, FH - 80);
      if (Math.random() < 0.7) part({ x: e.x + rand(-R, R) * 0.6, y: e.y + rand(-R, R) * 0.3, z: rand(0, 40), vx: rand(-60, 60), vy: rand(-30, 30), vz: rand(80, 200), life: 0.9, max: 0.9, size: rand(6, 12), color: pick(['#c8b89a', '#a89070', '#e0d0b0']), kind: 'smoke' });
      if (!frozenPlay) {
        for (const p of playersNear(e.x, e.y, R * 0.7)) {
          if (p.role === 'keeper' || p.state === 'spin') continue;
          dropBall(p); p.state = 'spin'; p.stateT = 0.7;
          const a = Math.atan2(p.y - e.y, p.x - e.x) + Math.PI / 2; p.vx = Math.cos(a) * 380; p.vy = Math.sin(a) * 380;
          bubble(p, pick(['WHOOOA!', 'I\'M DIZZY!', 'WHEEE!']));
        }
        const d = dist(b.x, b.y, e.x, e.y);
        if (ballFree() && d < R) { const a = Math.atan2(b.y - e.y, b.x - e.x) + Math.PI / 2; b.vx = Math.cos(a) * 520 + e.vx; b.vy = Math.sin(a) * 520 + e.vy; b.vz = Math.max(b.vz, 220); b.shot = null; }
      }
      return e.life <= 0;
    }
    case 'boostzone': { // helper: speed boost while standing in the sunshine
      e.life -= dt;
      if (!frozenPlay) for (const p of M.outfield) if (isUp(p) && dist(p.x, p.y, e.x, e.y) < C.boostzone.r) {
        if (p.fx.boost < 0.2) part({ x: p.x, y: p.y, z: 40, vz: 120, life: 0.6, max: 0.6, size: 10, color: '#ffd43b', kind: 'star' });
        p.fx.boost = Math.max(p.fx.boost, 0.5);
      }
      return e.life <= 0;
    }
    case 'puddle': { // obstacle: a rain cloud passes, leaving mud that slows players and the ball
      e.life -= dt; e.rainT -= dt;
      if (e.rainT > 0) { for (let i = 0; i < 3; i++) part({ x: e.x + rand(-C.puddle.r, C.puddle.r), y: e.y + rand(-C.puddle.r, C.puddle.r) * 0.6, z: 260, vz: -700, life: 0.4, max: 0.4, size: 3, color: '#a5d8ff', kind: 'dot' }); return false; }
      if (!frozenPlay) {
        for (const p of M.all) if (isUp(p) && dist(p.x, p.y, e.x, e.y) < C.puddle.r) {
          p.fx.mud = 0.15;
          if (p.moving > 0.4 && Math.random() < 0.15) part({ x: p.x, y: p.y, z: 2, vx: rand(-60, 60), vy: rand(-30, 30), vz: rand(60, 140), g: 500, life: 0.4, max: 0.4, size: 4, color: '#6b4f2a', kind: 'dot' });
        }
        if (!b.owner && !b.super && b.z < 5 && dist(b.x, b.y, e.x, e.y) < C.puddle.r) { b.vx *= Math.exp(-3 * dt); b.vy *= Math.exp(-3 * dt); }
      }
      return e.life <= 0;
    }
    case 'springboard': { // helper: launches the ball and bounces players with a speed boost
      const R = C.springboard.r;
      e.life -= dt; e.cdBall -= dt;
      if (!frozenPlay) {
        if (ballFree() && b.z < 15 && e.cdBall <= 0 && dist(b.x, b.y, e.x, e.y) < R) {
          const sp = Math.hypot(b.vx, b.vy);
          if (sp < 300) { const a = rand(0, TAU); b.vx = Math.cos(a) * 520; b.vy = Math.sin(a) * 520; } else { b.vx *= 1.25; b.vy *= 1.25; }
          b.vz = C.springboard.launch; e.cdBall = 0.8; SFX.boing(); floatText(e.x, e.y, 60, 'BOING!', '#ffd43b', 26);
        }
        for (const p of M.outfield) {
          if (!canAct(p) || p.z > 0 || dist(p.x, p.y, e.x, e.y) > R) continue;
          if ((e.cds.get(p) || 0) > e.t) continue;
          e.cds.set(p, e.t + 1.2); p.vz = 430; p.fx.boost = Math.max(p.fx.boost, 1.2); SFX.boing();
          bubble(p, pick(['WHEEEE!', 'BOING BOING!']));
        }
      }
      return e.life <= 0;
    }
    case 'cratedrop': { // helper: a supply plane drops ? crates across the pitch
      e.x += e.dir * 620 * dt;
      e.nextDrop -= dt;
      if (e.drops > 0 && e.nextDrop <= 0 && e.x > 150 && e.x < FW - 150) {
        e.drops--; e.nextDrop = rand(0.35, 0.6);
        M.boxes.push({ x: e.x, y: clamp(e.y + rand(-160, 160), 120, FH - 120), z: 520, vz: 0, t: 0 });
        SFX.tone(800, 0.3, 'sine', 0.08, 300);
      }
      return e.x < -300 || e.x > FW + 300;
    }
  }
  return true;
}
function releaseCarry(e, pop) {
  const b = M.ball;
  if (b.carried !== e) return;
  b.carried = null; e.carry = false;
  const a = rand(0, TAU); b.vx = Math.cos(a) * pop; b.vy = Math.sin(a) * pop; b.vz = pop ? 180 : 0;
}

// Juma's STAMPEDE power uses the same blocky animals: map its herd to creature kinds
function stampedeKind(h) { return h.kind || (h.emoji === '🦓' ? 'zebra' : 'wildebeest'); }
