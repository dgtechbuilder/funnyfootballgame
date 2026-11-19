// ============================================================================
//  MATCH SIMULATION: physics, players, AI, keepers, items, hazards, supers
// ============================================================================

const FW = 1800, FH = 1000;
const GOAL_W = 270, GY0 = (FH - GOAL_W) / 2, GY1 = (FH + GOAL_W) / 2, GOAL_D = 75, BAR_Z = 105;
const TILT = 0.62, BALL_R = 11, PR = 20, WALL_H = 46;
const GRAV = 1150;
const CHARGE_TIME = 0.8, SWEET_TIME = 0.78;
const FORM = [{ x: 0.58, y: 0.5 }, { x: 0.4, y: 0.2 }, { x: 0.4, y: 0.8 }, { x: 0.22, y: 0.5 }];
const HUMAN_COLORS = ['#ff4d4d', '#4dabf7', '#ffd43b', '#51cf66', '#f783ac', '#ffa94d', '#b197fc'];
const DIFF = {
  easy:   { react: 0.32, acc: 0.55, tackle: 0.55, keeper: 0.78, superAcc: 0.35, speed: 0.9, item: 0.5 },
  normal: { react: 0.18, acc: 0.78, tackle: 1.0, keeper: 1.0, superAcc: 0.62, speed: 1.0, item: 1 },
  hard:   { react: 0.09, acc: 0.95, tackle: 1.5, keeper: 1.12, superAcc: 0.85, speed: 1.06, item: 1.4 },
};
const SAVE_P = { boulder: 0.22, zigzag: 0.25, split: 0.2, sky: 0.18, teleport: 0.14, curve: 0.25, dance: 0.05, cannon: 0.26 };
const SUPER_STYLE = { boulder: 'bus', zigzag: 'electric', split: 'jollof', sky: 'fire', teleport: 'quantum', curve: 'steam', dance: 'disco', cannon: 'cannon' };
const SUPER_SIZE = { boulder: 2.6, split: 1.3, cannon: 1.5, dance: 1.35, sky: 1.3 };

let M = null; // current match

// ---------------------------------------------------------------------------
function makePlayer(team, slot, role) {
  const cap = team.cap, isCap = role === 'captain', isK = role === 'keeper';
  const names = SIDEKICK_NAMES[cap.id] || ['Goon'];
  return {
    team, slot, role, look: cap.id, hat: cap.sidekickHat,
    name: isCap ? cap.short : isK ? pick(KEEPER_NAMES) : names[(slot - 1) % names.length],
    kit: team.kit, kit2: team.kit2, skin: isCap ? cap.skin : pick(SKINS),
    number: isCap ? '10' : isK ? '1' : String([7, 4, 3][slot - 1] || 9),
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, face: team.dir > 0 ? 0 : Math.PI,
    baseR: PR * (isCap ? cap.size : isK ? 1.15 : 1), r: PR, scale: 1,
    speed: 310 * (isCap ? cap.speed : isK ? 0.95 : 0.97), power: isCap ? cap.power : 0.95, tackleP: isCap ? cap.tackle : 1,
    state: 'normal', stateT: 0, anim: rand(0, 10), moving: 0, lyingDir: 1,
    charging: false, charge: 0, sweetT: -1,
    tackleCD: 0, jukeCD: 0, invuln: 0, oneTimer: 0, kickAnim: 0, wallCD: 0,
    fx: { fire: 0, mega: 0, shrink: 0, soot: 0, zap: 0, snow: 0, flat: 0 },
    bubble: null, expr: 'normal', exprT: 0, celebrate: false,
    human: null, ai: { t: 0, weave: 0, aimY: 0, chargeTarget: 1, wantSuper: false, sweetRelease: 0.5, wander: 0 },
    stats: { goals: 0, tackles: 0, cheap: 0, knocked: 0, zapped: 0, saves: 0, supers: 0, items: 0, shots: 0 },
  };
}

function makeTeam(side, cap, kit, humans, diffKey) {
  const t = {
    side, dir: side === 0 ? 1 : -1, cap, kit, kit2: cap.color2, name: cap.team, score: 0, items: [],
    humans: humans.map(dev => ({ dev, player: null, cd: 0, color: HUMAN_COLORS[Input.order.indexOf(dev)] || '#fff', label: 'P' + (Input.order.indexOf(dev) + 1) })),
    players: [], keeper: null, chasers: [], itemAI: rand(3, 6), itemFlash: 0,
    ai: DIFF[humans.length ? 'normal' : diffKey], diffKey: humans.length ? 'normal' : diffKey,
  };
  t.players.push(makePlayer(t, 0, 'captain'));
  for (let i = 1; i <= 3; i++) t.players.push(makePlayer(t, i, 'sidekick'));
  t.keeper = makePlayer(t, 4, 'keeper');
  t.keeper.kit2 = colorDist(kit, '#2ee6a6') > 120 ? '#2ee6a6' : '#ffd43b';
  return t;
}

function newMatch(cfg) {
  const stadium = STADIUMS.find(s => s.id === cfg.stadium) || STADIUMS[0];
  const capL = CAPTAINS.find(c => c.id === cfg.capL), capR = CAPTAINS.find(c => c.id === cfg.capR);
  const kitL = capL.color;
  let kitR = capR.color;
  if (colorDist(kitL, kitR) < 110) kitR = capR.alt;
  const t0 = makeTeam(0, capL, kitL, cfg.humansL || [], cfg.difficulty);
  const t1 = makeTeam(1, capR, kitR, cfg.humansR || [], cfg.difficulty);
  M = {
    cfg, stadium, teams: [t0, t1], ball: null,
    phase: 'intro', phaseT: 0, time: 0, timeLeft: cfg.minutes * 60, golden: false, done: false,
    parts: [], hazards: [], projectiles: [], boxes: [], decals: [],
    cam: { x: FW / 2, y: FH / 2, zoom: 1, tx: FW / 2, ty: FH / 2, tz: 1 },
    shake: 0, hitStop: 0, slowmo: 1, blackout: 0, flash: 0, flashCol: '#fff',
    banner: null, bigText: null, comm: { text: '', t: 0, shown: 0, pri: 0 }, commCD: 0, idleT: 12,
    nextBox: rand(6, 9), nextHazard: rand(11, 15), crowdExcite: 0.2, crowd: null, kickTeam: rand() < 0.5 ? 0 : 1,
    cine: null, lastScorer: null, goalTeam: null, demo: !!cfg.demo,
  };
  M.all = [...t0.players, ...t1.players, t0.keeper, t1.keeper];
  M.outfield = [...t0.players, ...t1.players];
  M.ball = { x: FW / 2, y: FH / 2, z: 0, vx: 0, vy: 0, vz: 0, owner: null, lastTouch: null, rot: 0, spin: 0, shot: null, passTarget: null, passT: 0, passFrom: null, lockP: null, lockT: 0, super: null, trail: [], keeperIgnore: null, pickupInv: 0 };
  buildCrowd();
  resetKickoff(M.kickTeam);
  return M;
}

function other(t) { return t === M.teams[0] ? M.teams[1] : M.teams[0]; }
function goalXOf(t) { return t.dir > 0 ? FW : 0; } // the goal this team attacks
function ownGoalX(t) { return t.dir > 0 ? 0 : FW; }
function canAct(p) { return p.state === 'normal' || p.state === 'recover'; }
function isUp(p) { return p.state !== 'down' && p.state !== 'abducted' && p.state !== 'frozen'; }

function resetKickoff(teamIdx) {
  const b = M.ball;
  Object.assign(b, { x: FW / 2, y: FH / 2, z: 0, vx: 0, vy: 0, vz: 0, owner: null, shot: null, passTarget: null, super: null, spin: 0, trail: [], keeperIgnore: null, lockP: null });
  for (const t of M.teams) {
    for (const p of [...t.players, t.keeper]) {
      const f = p.role === 'keeper' ? { x: 0.025, y: 0.5 } : { x: FORM[p.slot].x * 0.78, y: FORM[p.slot].y };
      p.x = t.dir > 0 ? f.x * FW : FW - f.x * FW; p.y = f.y * FH;
      if (p.role === 'keeper') p.x = ownGoalX(t) + t.dir * 45;
      p.vx = p.vy = p.vz = p.z = 0; p.state = 'normal'; p.stateT = 0; p.charging = false; p.charge = 0; p.sweetT = -1;
      p.face = t.dir > 0 ? 0 : Math.PI; p.celebrate = false; p.armsUp = false; p.hidden = false; p.human = null; p.expr = 'normal'; p.fx.flat = 0;
    }
  }
  const kt = M.teams[teamIdx];
  const cap = kt.players[0];
  cap.x = FW / 2 - kt.dir * 34; cap.y = FH / 2;
  b.owner = null;
  for (const h of M.teams[0].humans.concat(M.teams[1].humans)) h.player = null;
  M.phase = 'intro'; M.phaseT = 0; M.slowmo = 1;
  M.hazards = M.hazards.filter(h => h.type === 'animal' || h.type === 'banana');
  M.blackout = 0;
  M.projectiles = [];
}

// ---------------------------------------------------------------------------
//  Particles / text / commentary helpers
// ---------------------------------------------------------------------------
function part(o) { if (M.parts.length < 900) M.parts.push(Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, life: 1, max: 1, size: 4, color: '#fff', kind: 'dot', rot: 0, vr: 0, drag: 0 }, o)); }
function burst(x, y, z, n, color, speed = 300, kind = 'dot', size = 4, life = 0.6, g = 600) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(0.3, 1) * speed;
    part({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(0.2, 1) * speed * 0.8, g, life: rand(0.6, 1) * life, max: life, size: rand(0.6, 1.2) * size, color: Array.isArray(color) ? pick(color) : color, kind, rot: rand(0, TAU), vr: rand(-10, 10) });
  }
}
function floatText(x, y, z, str, color = '#fff', size = 26, life = 1.1) {
  part({ x, y, z, vz: 70, life, max: life, size, color, kind: 'text', text: str });
}
function bubble(p, str, t = 1.3) { p.bubble = { text: str, t, max: t }; }
function fill(str, vars) { return str.replace(/\{(\w)\}/g, (m, k) => vars[k] != null ? vars[k] : m); }
function say(lines, vars = {}, pri = 1) {
  if (!lines || !lines.length) return;
  if (M.comm.t > 0 && pri < M.comm.pri) return;
  if (pri <= 1 && M.commCD > 0) return;
  const txt = fill(pick(lines), vars);
  M.comm = { text: txt, t: 4.2, shown: 0, pri };
  M.commCD = 2.2; M.idleT = rand(10, 16);
  if (App.opts.voice && window.speechSynthesis && !M.demo) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt.replace(/[^\w\s!?',.\-]/g, ''));
      u.rate = 1.15; u.pitch = 1.05; u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* no voice available */ }
  }
}
function shake(a) { M.shake = Math.max(M.shake, a); }
function flash(a, col = '#fff') { M.flash = Math.max(M.flash, a); M.flashCol = col; }
function excite(a) { M.crowdExcite = Math.min(1.5, Math.max(M.crowdExcite, a)); SFX.setCrowd(0.05 + a * 0.18); }

// ---------------------------------------------------------------------------
//  Main update
// ---------------------------------------------------------------------------
function updateMatch(dt) {
  M.time += dt;
  M.shake = Math.max(0, M.shake - dt * 30);
  M.flash = Math.max(0, M.flash - dt * 2.5);
  M.crowdExcite += (0.2 - M.crowdExcite) * Math.min(1, dt * 0.5);
  M.commCD -= dt;
  if (M.comm.t > 0) { M.comm.t -= dt; M.comm.shown += dt * 55; }
  if (M.bigText) { M.bigText.t += dt; if (M.bigText.t > M.bigText.life) M.bigText = null; }
  if (M.banner) { M.banner.t += dt; if (M.banner.t > M.banner.life) M.banner = null; }
  for (const t of M.teams) t.itemFlash = Math.max(0, t.itemFlash - dt);
  if (M.blackout > 0) { M.blackout -= dt; if (M.blackout <= 0) { SFX.cheer(0.8); say(['UP NEPA! The light is back!', 'Light don come back! UP NEPA!'], {}, 2); } }

  if (M.hitStop > 0) { M.hitStop -= dt; updateCamera(dt); return; }
  M.phaseT += dt;
  if (M.phase !== 'cine') M.slowmo += (1 - M.slowmo) * Math.min(1, dt * (M.phase === 'goal' ? 0.9 : 2.5));
  const sdt = dt * M.slowmo;

  switch (M.phase) {
    case 'intro':
      for (const p of M.all) { p.anim += dt * 0.3; p.moving = 0; p.vx = p.vy = 0; }
      if (M.phaseT > 1.7) {
        M.phase = 'play'; M.phaseT = 0; SFX.whistle();
        const kt = M.teams[M.kickTeam];
        M.ball.owner = kt.players[0]; M.ball.lastTouch = kt.players[0]; kt.players[0].invuln = 0.6;
        if (!M.golden) say(COMMENTARY.kickoff, {}, 1); else say(COMMENTARY.golden, {}, 2);
      }
      break;
    case 'play':
      simulate(sdt);
      if (!M.golden) {
        M.timeLeft -= sdt;
        if (M.timeLeft <= 10 && Math.floor(M.timeLeft + sdt) !== Math.floor(M.timeLeft) && M.timeLeft > 0) SFX.countdown(false);
      }
      if (M.timeLeft <= 0 && !M.golden && !M.ball.super) {
        M.timeLeft = 0;
        if (M.teams[0].score === M.teams[1].score && M.cfg.golden) {
          M.golden = true; SFX.whistle(); SFX.whistle(); flash(0.6, '#ffd84a');
          M.bigText = { str: 'GOLDEN GOAL!', sub: 'Next goal wins!', t: 0, life: 2.4, color: '#ffd84a' };
          say(COMMENTARY.golden, {}, 3);
        } else endMatch();
      }
      break;
    case 'cine':
      updateCine(dt);
      break;
    case 'goal':
      simulate(sdt, true);
      if (M.phaseT > 3.8) {
        if (M.golden || M.timeLeft <= 0) endMatch();
        else { M.kickTeam = M.goalTeam === M.teams[0] ? 1 : 0; resetKickoff(M.kickTeam); }
      }
      break;
    case 'fulltime':
      simulate(sdt, true);
      if (M.phaseT > 4.5) M.done = true;
      break;
  }
  updateParticles(sdt);
  updateCamera(dt);
  if (M.phase === 'play') {
    M.idleT -= dt;
    if (M.idleT < 0) say(COMMENTARY.idle, {}, 0);
  }
}

function endMatch() {
  M.phase = 'fulltime'; M.phaseT = 0; SFX.whistle(true); SFX.cheer(1.2);
  const [a, b] = M.teams;
  const win = a.score === b.score ? null : (a.score > b.score ? a : b);
  M.winner = win;
  for (const p of M.all) { p.celebrate = win ? p.team === win : false; p.charging = false; }
  M.bigText = { str: 'FULL TIME!', sub: win ? `${win.name} win!` : 'A draw! Everyone loses!', t: 0, life: 4.5, color: '#fff' };
  say(COMMENTARY.fulltime, {}, 3);
  M.ball.owner = null;
}

// ---------------------------------------------------------------------------
function simulate(dt, frozenPlay = false) {
  const b = M.ball;
  // team helpers
  for (const t of M.teams) {
    const cands = t.players.filter(p => isUp(p) && !p.human);
    cands.sort((p, q) => dist(p.x, p.y, b.x, b.y) - dist(q.x, q.y, b.x, b.y));
    const oppHas = b.owner && b.owner.team !== t;
    t.chasers = cands.slice(0, oppHas && !t.humans.length ? 2 : 1);
    if (!frozenPlay) updateHumans(t, dt);
  }
  // commands
  for (const p of M.outfield) {
    let cmd;
    if (frozenPlay) cmd = celebrateCmd(p, dt);
    else if (p.human) cmd = humanCmd(Input.devices[p.human], p);
    else cmd = aiCmd(p, dt);
    applyCmd(p, cmd, dt);
  }
  for (const t of M.teams) updateKeeper(t.keeper, dt, frozenPlay);
  for (const p of M.all) updatePlayer(p, dt);
  separatePlayers();
  if (b.super) updateSuper(dt); else updateBall(dt, frozenPlay);
  if (!frozenPlay) {
    contactInteractions(dt);
    checkGoal();
    if (M.cfg.items) updateBoxes(dt);
    if (M.cfg.items) teamItemAI(dt);
  }
  updateProjectiles(dt, frozenPlay);
  updateHazards(dt, frozenPlay);
}

// ---------------------------------------------------------------------------
//  Humans
// ---------------------------------------------------------------------------
function switchTo(h, p) {
  if (h.player === p) return;
  if (h.player) { h.player.human = null; h.player.charging = false; h.player.charge = 0; h.player.sweetT = -1; }
  if (p.human) { const oh = p.team.humans.find(x => x.dev === p.human); if (oh) oh.player = null; }
  p.human = h.dev; p.humanH = h; h.player = p; h.switchFx = 0.35;
}
function freeTeammates(t, h) { return t.players.filter(p => isUp(p) && (!p.human || p.human === h.dev)); }
function ballPredict(tt) { const b = M.ball; return { x: clamp(b.x + b.vx * tt, 0, FW), y: clamp(b.y + b.vy * tt, 0, FH) }; }

function updateHumans(t, dt) {
  const b = M.ball;
  for (const h of t.humans) {
    h.cd -= dt; if (h.switchFx) h.switchFx = Math.max(0, h.switchFx - dt);
    const dev = Input.devices[h.dev];
    let p = h.player;
    if (!p || p.human !== h.dev) {
      const c = freeTeammates(t, h).filter(q => !q.human);
      if (c.length) { c.sort((a, q) => dist(a.x, a.y, b.x, b.y) - dist(q.x, q.y, b.x, b.y)); switchTo(h, c[0]); p = c[0]; }
      else continue;
    }
    const teamHas = b.owner && b.owner.team === t && b.owner.role !== 'keeper';
    if (teamHas && b.owner !== p && !b.owner.human) {
      // give the ball-carrier to the human closest to it
      let best = null, bd = 1e9;
      for (const hh of t.humans) { if (!hh.player) continue; const d = dist(hh.player.x, hh.player.y, b.owner.x, b.owner.y); if (d < bd) { bd = d; best = hh; } }
      if (best === h) switchTo(h, b.owner);
    } else if (!teamHas && h.cd <= 0 && b.owner !== p && !p.charging) {
      const tgt = b.passTarget && b.passTarget.team === t ? b.passTarget : null;
      if (tgt && !tgt.human) { switchTo(h, tgt); h.cd = 0.5; }
      else {
        const pr = ballPredict(0.25);
        const c = freeTeammates(t, h).filter(q => q !== p && !q.human);
        let best = null, bd = 1e9;
        for (const q of c) { const d = dist(q.x, q.y, pr.x, pr.y); if (d < bd) { bd = d; best = q; } }
        const dp = dist(p.x, p.y, pr.x, pr.y);
        if (best && (bd + 170 < dp || (!canAct(p) && bd < dp + 80))) { switchTo(h, best); h.cd = 0.8; }
      }
    }
    // manual switch
    if (dev.pass.pressed && b.owner !== h.player && h.player && !h.player.charging) {
      const pr = ballPredict(0.2);
      const c = freeTeammates(t, h).filter(q => q !== h.player && !q.human);
      c.sort((a, q) => dist(a.x, a.y, pr.x, pr.y) - dist(q.x, q.y, pr.x, pr.y));
      if (c.length) { switchTo(h, c[0]); h.cd = 0.6; SFX.ui(); }
    }
  }
}

function blankCmd() { return { mx: 0, my: 0, pass: false, shootDown: false, shootPressed: false, tackle: false, item: false, aimY: null, passTo: null, faceTo: null }; }
function humanCmd(dev, p) {
  const c = blankCmd();
  c.mx = dev.mx; c.my = dev.my;
  c.pass = dev.pass.pressed && M.ball.owner === p;
  c.shootDown = dev.shoot.down; c.shootPressed = dev.shoot.pressed;
  c.tackle = dev.tackle.pressed; c.item = dev.item.pressed;
  c.aimY = Math.abs(dev.my) > 0.3 ? dev.my : 0;
  return c;
}

// ---------------------------------------------------------------------------
//  Command application (shared by humans and AI)
// ---------------------------------------------------------------------------
function inSuperRange(p) {
  const gx = goalXOf(p.team);
  return p.role === 'captain' && dist(p.x, p.y, gx, FH / 2) < 860 && p.fx.shrink <= 0;
}
function sweetRing(t) { return 2.2 - 1.8 * (t / SWEET_TIME); }

function applyCmd(p, cmd, dt) {
  const b = M.ball;
  if (p.state === 'panic') {
    p.ai.wander -= dt;
    if (p.ai.wander <= 0) { p.ai.wander = rand(0.25, 0.5); p.ai.pdir = rand(0, TAU); }
    cmd = blankCmd(); cmd.mx = Math.cos(p.ai.pdir); cmd.my = Math.sin(p.ai.pdir);
    moveP(p, cmd.mx, cmd.my, dt, 1.15);
    return;
  }
  if (!canAct(p)) return;
  const owner = b.owner === p;

  if (cmd.item && M.cfg.items && p.team.items.length) useItem(p.team, p);

  // shooting
  if (owner && cmd.shootPressed && !p.charging) { p.charging = true; p.charge = 0; p.sweetT = -1; }
  if (!owner && cmd.shootPressed) {
    const approaching = !b.owner && (b.passTarget === p || (dist(p.x, p.y, b.x, b.y) < 300 && (b.vx * (p.x - b.x) + b.vy * (p.y - b.y)) > 0));
    if (approaching) p.oneTimer = 0.55;
  }
  if (p.charging) {
    if (!owner) { p.charging = false; p.charge = 0; p.sweetT = -1; }
    else {
      const prev = p.charge;
      p.charge = Math.min(1, p.charge + dt / CHARGE_TIME);
      if (Math.floor(prev * 6) !== Math.floor(p.charge * 6)) SFX.charge(p.charge);
      if (p.charge >= 1 && inSuperRange(p)) {
        if (p.sweetT < 0) { p.sweetT = 0; SFX.superCharge(); }
        p.sweetT += dt;
        if (p.sweetT > SWEET_TIME) { bubble(p, 'TOO LATE!'); shoot(p, 1, cmd.aimY); return; }
      }
      if (!cmd.shootDown) {
        if (p.sweetT >= 0) {
          if (Math.abs(sweetRing(p.sweetT) - 1) < 0.22) { startSuper(p, cmd.aimY); return; }
          bubble(p, pick(['MISTIMED!', 'BOTCHED IT!', 'ARGH!'])); shoot(p, 1, cmd.aimY); return;
        }
        shoot(p, Math.max(0.15, p.charge), cmd.aimY); return;
      }
    }
  }
  if (owner && cmd.pass && !p.charging) { pass(p, cmd); }

  // tackle / juke
  if (cmd.tackle) {
    if (owner && p.jukeCD <= 0 && !p.charging) {
      p.state = 'juke'; p.stateT = 0.32; p.jukeCD = 1.3; p.invuln = 0.45;
      const m = Math.hypot(cmd.mx, cmd.my);
      const a = m > 0.2 ? Math.atan2(cmd.my, cmd.mx) : p.face;
      p.vx = Math.cos(a) * p.speed * 1.75; p.vy = Math.sin(a) * p.speed * 1.75; p.face = a;
      SFX.tone(500, 0.15, 'triangle', 0.12, 1100); burst(p.x, p.y, 10, 8, '#ffffff', 150, 'smoke', 8, 0.4, 0);
      if (Math.random() < 0.3) say(COMMENTARY.juke, { p: p.name });
      return;
    }
    if (!owner && p.tackleCD <= 0) {
      let a = p.face;
      if (cmd.faceTo) a = Math.atan2(cmd.faceTo.y - p.y, cmd.faceTo.x - p.x);
      else { const m = Math.hypot(cmd.mx, cmd.my); if (m > 0.2) a = Math.atan2(cmd.my, cmd.mx); }
      p.face = a; p.state = 'tackle'; p.stateT = 0.3; p.tackleCD = 0.85; p.hitList = [];
      const sp = p.speed * (1.95 + p.tackleP * 0.2);
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      SFX.tackle();
      return;
    }
  }
  moveP(p, cmd.mx, cmd.my, dt, 1);
}

function moveP(p, mx, my, dt, mul) {
  const b = M.ball, owner = b.owner === p;
  let max = p.speed * mul * p.team.ai.speed ** (p.human ? 0 : 1);
  if (p.fx.fire > 0) max *= 1.45;
  if (p.fx.shrink > 0) max *= 0.75;
  if (p.fx.mega > 0) max *= 1.05;
  if (owner) max *= 0.93;
  if (p.charging) max *= 0.35;
  if (p.state === 'recover') max *= 0.4;
  const grip = (p.fx.fire > 0 || p.fx.mega > 0) ? 1 : M.stadium.playerGrip;
  const acc = 13 * grip;
  const m = Math.hypot(mx, my);
  let tvx = 0, tvy = 0;
  if (m > 0.12) {
    const k = Math.min(1, m);
    tvx = mx / m * max * k; tvy = my / m * max * k;
    const want = Math.atan2(my, mx);
    if (p.charging) { let d = want - p.face; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; p.face += d * Math.min(1, dt * 6); }
    else p.face = want;
  }
  p.vx += (tvx - p.vx) * Math.min(1, acc * dt);
  p.vy += (tvy - p.vy) * Math.min(1, acc * dt);
}

// ---------------------------------------------------------------------------
//  Kicking
// ---------------------------------------------------------------------------
function releaseBall(p) {
  const b = M.ball;
  if (b.owner === p) b.owner = null;
  b.lockP = p; b.lockT = 0.22; b.lastTouch = p;
}

function shoot(p, charge, aimY = null, perfect = false) {
  const b = M.ball, T = p.team, O = other(T);
  releaseBall(p);
  const gx = goalXOf(T), dg = dist(b.x, b.y, gx, FH / 2);
  if (aimY === null || aimY === undefined) aimY = p.ai.aimY || 0;
  if (Math.abs(aimY) < 0.1) aimY = (O.keeper.y > FH / 2 ? -1 : 1) * (p.human ? 0.55 : 0.7);
  let ty = FH / 2 + clamp(aimY, -1, 1) * (GOAL_W / 2 - 28);
  const acc = p.human ? 1 : T.ai.acc;
  const spread = (22 + (1 - charge) * 55 + dg * 0.045) * (p.fx.shrink > 0 ? 2 : 1) * (1.4 - acc * 0.5);
  ty += rand(-1, 1) * spread;
  const tx = gx + T.dir * 25;
  const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
  const speed = (560 + 900 * charge) * p.power * (p.fx.mega > 0 ? 1.3 : 1) * (perfect ? 1.18 : 1);
  b.vx = dx / d * speed; b.vy = dy / d * speed;
  b.vz = 70 + charge * rand(80, 200);
  b.spin = rand(-1, 1) * 240 * charge;
  b.shot = { team: T, by: p, speed, t: 0 };
  b.passTarget = null; b.keeperIgnore = null;
  p.charging = false; p.charge = 0; p.sweetT = -1; p.kickAnim = 0.25; p.stats.shots++;
  SFX.kick(charge); shake(2 + charge * 6);
  if (p.human) Input.rumble(p.human, 60 + charge * 140, charge * 0.8, 0.3 + charge * 0.4);
  burst(b.x, b.y, 5, 6 + Math.floor(charge * 10), charge > 0.8 ? ['#ffd43b', '#ff922b', '#fff'] : '#ffffff', 250 + charge * 200, 'spark', 4, 0.4, 300);
  if (perfect) { floatText(p.x, p.y, 90, 'PERFECT!', '#7CFC00', 30); say(COMMENTARY.perfect, {}, 1); }
  if (charge > 0.85) { excite(0.6); if (Math.random() < 0.5) bubble(p, pick(['HIYAAA!', 'TAKE THAT!', 'BOOM!', ...p.team.cap.quips])); }
}

function pass(p, cmd) {
  const b = M.ball, T = p.team;
  let dx = cmd.mx, dy = cmd.my;
  const hasDir = Math.hypot(dx, dy) > 0.3;
  if (!hasDir) { dx = Math.cos(p.face); dy = Math.sin(p.face); }
  const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
  let best = cmd.passTo || null, bs = -1e9;
  if (!best) {
    for (const m of T.players) {
      if (m === p || !isUp(m)) continue;
      const vx = m.x - p.x, vy = m.y - p.y, d = Math.hypot(vx, vy) || 1;
      const cos = (vx * dx + vy * dy) / d;
      let s = cos * 2.2 - d / 900 + (vx * T.dir) / 2000;
      if (cos < 0.15) s -= 3;
      if (s > bs) { bs = s; best = m; }
    }
  }
  releaseBall(p);
  if (!best) { b.vx = dx * 700; b.vy = dy * 700; b.vz = 40; SFX.pass(); return; }
  const d0 = dist(p.x, p.y, best.x, best.y);
  const lead = Math.min(0.6, d0 / 800);
  const tx = clamp(best.x + best.vx * lead * 0.8, 30, FW - 30), ty = clamp(best.y + best.vy * lead * 0.8, 30, FH - 30);
  const ddx = tx - b.x, ddy = ty - b.y, d = Math.hypot(ddx, ddy) || 1;
  // lob if an opponent blocks the lane
  let blocked = false;
  for (const o of other(T).players) {
    if (!isUp(o)) continue;
    const t = clamp(((o.x - b.x) * ddx + (o.y - b.y) * ddy) / (d * d), 0, 1);
    if (t > 0.12 && t < 0.88 && dist(o.x, o.y, b.x + ddx * t, b.y + ddy * t) < o.r + 16) blocked = true;
  }
  if (blocked && d > 160) {
    const g = GRAV * M.stadium.grav;
    const vz = clamp(260 + d * 0.22, 300, 520) * Math.sqrt(M.stadium.grav);
    const flight = 2 * vz / g;
    b.vx = ddx / flight; b.vy = ddy / flight; b.vz = vz; b.lob = true;
  } else {
    const sp = clamp(380 + d * 1.35, 460, 1150);
    b.vx = ddx / d * sp; b.vy = ddy / d * sp; b.vz = 25; b.lob = false;
  }
  b.passTarget = best; b.passT = 1.6; b.passFrom = p; b.spin = 0; b.shot = null;
  p.kickAnim = 0.2;
  SFX.pass();
  if (p.human && p.role !== 'keeper') {
    const h = T.humans.find(x => x.dev === p.human);
    if (h && !best.human) { switchTo(h, best); h.cd = 0.6; }
  }
}

// ---------------------------------------------------------------------------
//  Player physics + status
// ---------------------------------------------------------------------------
function knock(p, vx, vy, dur, cause = 'hit', silent = false) {
  if (p.state === 'abducted') return;
  const b = M.ball;
  if (b.owner === p) {
    b.owner = null; b.vx = vx * 0.6 + rand(-120, 120); b.vy = vy * 0.6 + rand(-120, 120); b.vz = 220;
    b.lockP = p; b.lockT = 0.5; b.shot = null;
  }
  p.charging = false; p.charge = 0; p.sweetT = -1;
  p.state = 'down'; p.stateT = dur; p.vx = vx; p.vy = vy; p.vz = Math.max(p.vz, 180 + Math.hypot(vx, vy) * 0.25);
  p.lyingDir = vx >= 0 ? 1 : -1; p.expr = 'hurt'; p.stats.knocked++;
  if (p.human) Input.rumble(p.human, 260, 0.9, 0.5);
  if (!silent) bubble(p, pick(PAIN_WORDS));
  burst(p.x, p.y, 40, 6, ['#ffe066', '#ffffff'], 180, 'star', 7, 0.7, 300);
  SFX.bonk();
}

function wallEffect(p, nx, ny) {
  if (p.wallCD > 0) return;
  p.wallCD = 2.5;
  const fx = M.stadium.wallFx, n = { v: p.name };
  if (fx === 'zap') {
    p.fx.zap = 1.0; p.stateT += 0.8; p.stats.zapped++; SFX.zap(); shake(10); flash(0.25, '#bff6ff');
    burst(p.x, p.y, 30, 18, ['#bff6ff', '#3ae0ff', '#ffffff'], 380, 'spark', 4, 0.5, 0);
    bubble(p, 'BZZZZT!'); say(COMMENTARY.zap, n, 2);
  } else if (fx === 'burn') {
    p.fx.soot = 6; p.stateT += 0.6; p.stats.zapped++; SFX.sizzle(); shake(8);
    burst(p.x, p.y, 40, 14, ['#ff6a00', '#ffd43b', '#ff2200'], 260, 'flame', 9, 0.7, -100);
    burst(p.x, p.y, 50, 8, '#555', 120, 'smoke', 14, 1.4, -60);
    bubble(p, 'HOT HOT HOT!'); say(COMMENTARY.burn, n, 2);
  } else if (fx === 'snow') {
    p.fx.snow = 5; p.stateT += 0.7; p.stats.zapped++; SFX.thud();
    burst(p.x, p.y, 30, 24, '#ffffff', 300, 'snow', 6, 0.9, 400);
    bubble(p, 'BRRRR!'); say(COMMENTARY.snow, n, 2);
  } else if (fx === 'sand') {
    p.fx.snow = 5; p.stateT += 0.7; p.stats.zapped++; SFX.thud();
    burst(p.x, p.y, 30, 26, ['#e9c98b', '#d9ad62', '#f5deb3'], 300, 'snow', 6, 0.9, 400);
    bubble(p, 'PFFT! SAND!'); say(COMMENTARY.sand, n, 2);
  } else if (fx === 'hay') {
    SFX.boing(); p.stats.zapped++;
    p.vx = nx * 650; p.vy = ny * 650; p.vz = 420;
    burst(p.x, p.y, 20, 16, ['#e9c46a', '#f4d58d', '#c9a227'], 260, 'feather', 6, 1, 200);
    bubble(p, 'OUCH! THORNS!'); say(COMMENTARY.hay, n, 2);
  }
}

function updatePlayer(p, dt) {
  p.anim += dt;
  p.tackleCD -= dt; p.jukeCD -= dt; p.invuln -= dt; p.oneTimer -= dt; p.kickAnim -= dt; p.wallCD -= dt;
  for (const k in p.fx) if (p.fx[k] > 0) p.fx[k] = Math.max(0, p.fx[k] - dt);
  if (p.bubble) { p.bubble.t -= dt; if (p.bubble.t <= 0) p.bubble = null; }
  const ts = p.fx.mega > 0 ? 1.85 : p.fx.shrink > 0 ? 0.55 : 1;
  p.scale += (ts - p.scale) * Math.min(1, dt * 6);
  p.r = p.baseR * p.scale;
  if (p.fx.fire > 0 && Math.random() < dt * 30) part({ x: p.x + rand(-8, 8), y: p.y + rand(-4, 4), z: rand(0, 10), vz: rand(60, 140), life: 0.5, max: 0.5, size: rand(6, 11), color: pick(['#ff6a00', '#ffd43b', '#ff2200']), kind: 'flame' });
  if (p.fx.soot > 0 && Math.random() < dt * 4) part({ x: p.x, y: p.y, z: 60 * p.scale, vz: 50, life: 1.2, max: 1.2, size: 10, color: '#555', kind: 'smoke' });

  const g = GRAV * (M.stadium.grav < 1 ? 0.6 : 1);
  if (p.z > 0 || p.vz > 0) { p.vz -= g * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; if (p.vz < -300 && p.state === 'down') { p.vz = -p.vz * 0.3; SFX.thud(); burst(p.x, p.y, 0, 5, '#c8b89a', 100, 'smoke', 8, 0.4, 0); } else p.vz = 0; } }

  switch (p.state) {
    case 'down': {
      const fr = p.z > 0 ? 0.3 : 3.5;
      p.vx *= Math.exp(-fr * dt); p.vy *= Math.exp(-fr * dt);
      p.stateT -= dt;
      if (p.stateT <= 0 && p.z <= 0) { p.state = 'normal'; p.invuln = 0.7; p.expr = 'normal'; p.fx.flat = 0; }
      break;
    }
    case 'tackle':
      p.vx *= Math.exp(-1.2 * dt); p.vy *= Math.exp(-1.2 * dt);
      p.stateT -= dt;
      if (Math.random() < dt * 40) part({ x: p.x, y: p.y, z: 2, vx: -p.vx * 0.1, vy: -p.vy * 0.1, life: 0.4, max: 0.4, size: 7, color: M.stadium.id === 'kili' ? '#ffffff' : M.stadium.id === 'sahara' ? '#e9c98b' : '#a5d6a7', kind: 'smoke' });
      if (p.stateT <= 0) { p.state = 'recover'; p.stateT = 0.3; }
      break;
    case 'recover': case 'juke':
      p.stateT -= dt;
      if (p.state === 'juke') { p.vx *= Math.exp(-2 * dt); p.vy *= Math.exp(-2 * dt); }
      if (p.stateT <= 0) p.state = 'normal';
      break;
    case 'frozen':
      p.vx *= Math.exp(-0.9 * dt); p.vy *= Math.exp(-0.9 * dt);
      p.stateT -= dt;
      if (p.stateT <= 0) { p.state = 'normal'; p.invuln = 0.4; burst(p.x, p.y, 35, 14, ['#bfeaff', '#ffffff'], 260, 'spark', 5, 0.5, 500); SFX.freeze(); }
      break;
    case 'spin':
      p.vx *= Math.exp(-0.6 * dt); p.vy *= Math.exp(-0.6 * dt);
      p.stateT -= dt; if (p.stateT <= 0) { p.state = 'normal'; p.expr = 'normal'; }
      break;
    case 'panic': case 'dance':
      if (p.state === 'dance') { p.vx *= Math.exp(-8 * dt); p.vy *= Math.exp(-8 * dt); if (Math.random() < dt * 3) part({ x: p.x + rand(-15, 15), y: p.y, z: 70, vz: 60, vx: rand(-30, 30), life: 1, max: 1, size: 18, kind: 'note', color: pick(['#ff6bd5', '#7cf3ff', '#fff36b']) }); }
      p.stateT -= dt; if (p.stateT <= 0) { p.state = 'normal'; p.expr = 'normal'; }
      break;
    case 'abducted':
      return; // driven by UFO
  }
  if (p.state === 'normal' && p.expr !== 'normal') { p.exprT -= dt; if (p.exprT <= 0) p.expr = 'normal'; }
  if (p.charging) p.expr = 'grit';
  if (p.state === 'panic') p.expr = 'panic';

  p.x += p.vx * dt; p.y += p.vy * dt;
  const sp = Math.hypot(p.vx, p.vy);
  p.moving = clamp(sp / 260, 0, 1);
  // walls
  const r = p.r;
  let hitN = null;
  const minX = p.role === 'keeper' ? -GOAL_D + r : r, maxX = p.role === 'keeper' ? FW + GOAL_D - r : FW - r;
  const inGoalY = p.y > GY0 + r && p.y < GY1 - r;
  const lx = (p.role === 'keeper' && inGoalY) ? minX : r, rx = (p.role === 'keeper' && inGoalY) ? maxX : FW - r;
  if (p.x < lx) { if (p.vx < -260) hitN = [1, 0]; p.x = lx; p.vx = Math.abs(p.vx) * 0.4; }
  if (p.x > rx) { if (p.vx > 260) hitN = [-1, 0]; p.x = rx; p.vx = -Math.abs(p.vx) * 0.4; }
  if (p.y < r) { if (p.vy < -260) hitN = [0, 1]; p.y = r; p.vy = Math.abs(p.vy) * 0.4; }
  if (p.y > FH - r) { if (p.vy > 260) hitN = [0, -1]; p.y = FH - r; p.vy = -Math.abs(p.vy) * 0.4; }
  if (hitN && p.state === 'down') wallEffect(p, hitN[0], hitN[1]);
}

function separatePlayers() {
  const A = M.all;
  for (let i = 0; i < A.length; i++) {
    const p = A[i]; if (p.state === 'down' || p.state === 'abducted' || p.z > 30) continue;
    for (let j = i + 1; j < A.length; j++) {
      const q = A[j]; if (q.state === 'down' || q.state === 'abducted' || q.z > 30) continue;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy), m = p.r + q.r - 4;
      if (d > 0 && d < m) {
        const o = (m - d) / 2, nx = dx / d, ny = dy / d;
        const wp = p.state === 'frozen' ? 0.2 : (p.scale > 1.3 ? 0.15 : 1), wq = q.state === 'frozen' ? 0.2 : (q.scale > 1.3 ? 0.15 : 1);
        const s = wp + wq;
        p.x -= nx * o * 2 * wp / s; p.y -= ny * o * 2 * wp / s;
        q.x += nx * o * 2 * wq / s; q.y += ny * o * 2 * wq / s;
        // frozen blocks slide when pushed
        if (q.state === 'frozen') { q.vx += nx * 60; q.vy += ny * 60; }
        if (p.state === 'frozen') { p.vx -= nx * 60; p.vy -= ny * 60; }
      }
    }
  }
}

// ---------------------------------------------------------------------------
//  Contacts: tackles, pickups, steals, mega/fire bumps
// ---------------------------------------------------------------------------
function contactInteractions(dt) {
  const b = M.ball;
  // tackles & power bumps
  for (const p of M.outfield) {
    if (!isUp(p)) continue;
    const powered = p.fx.mega > 0 || p.fx.fire > 0;
    if (p.state !== 'tackle' && !powered) continue;
    for (const v of other(p.team).players) {
      if (!isUp(v) || v.invuln > 0 || v.z > 40) continue;
      if (p.hitList && p.hitList.includes(v) && p.state === 'tackle') continue;
      const d = dist(p.x, p.y, v.x, v.y);
      if (d > (p.r + v.r) * 0.98) continue;
      if (p.state !== 'tackle') {
        // power bump (mega/fire): only if victim not also powered
        if (v.fx.mega > 0 || (v.fx.fire > 0 && p.fx.mega <= 0)) continue;
        const nx = (v.x - p.x) / (d || 1), ny = (v.y - p.y) / (d || 1);
        knock(v, nx * 520, ny * 520, 1.1, 'bump');
        if (p.fx.mega > 0) { v.fx.flat = 1.3; floatText(v.x, v.y, 30, 'SQUISH!', '#fff', 28); SFX.thud(); }
        else floatText(v.x, v.y, 30, 'TOASTED!', '#ffb703', 26);
        shake(6);
        continue;
      }
      p.hitList.push(v);
      if (v.fx.mega > 0 || v.fx.fire > 0) {
        knock(p, -p.vx * 0.6, -p.vy * 0.6, 1.0, 'rebound');
        floatText(p.x, p.y, 60, 'BOING!', '#ffd43b'); SFX.boing();
        break;
      }
      const hadBall = b.owner === v;
      const ballNear = hadBall || dist(v.x, v.y, b.x, b.y) < 170;
      knock(v, p.vx * 0.75, p.vy * 0.75, 0.9 + 0.35 * p.tackleP * (v.fx.shrink > 0 ? 1.5 : 1), 'tackle');
      p.stats.tackles++;
      if (p.human) Input.rumble(p.human, 120, 0.6, 0.6);
      M.hitStop = 0.05; shake(7);
      excite(0.5);
      if (hadBall) {
        b.vx = p.vx * 0.9; b.vy = p.vy * 0.9; b.vz = 120; b.lockP = v; b.lockT = 0.6;
        floatText(v.x, v.y, 70, pick(['CRUNCH!', 'WALLOP!', 'THWACK!', 'KAPOW!']), '#ffffff', 30);
        if (Math.random() < 0.45) say(COMMENTARY.tackle, { p: p.name, v: v.name });
      } else if (!ballNear) {
        p.stats.cheap++;
        floatText(v.x, v.y, 80, 'CHEAP SHOT!', '#ff6b6b', 30);
        if (M.cfg.items) giveItem(v.team, randomItem(v.team));
        say(COMMENTARY.cheap, { p: p.name, v: v.name, o: v.team.name }, 2);
      } else {
        floatText(v.x, v.y, 70, pick(['OOF!', 'SPLAT!', 'BONK!']), '#ffffff', 28);
      }
    }
  }

  // ball owner validity
  if (b.owner) {
    const o = b.owner;
    if (o.role !== 'keeper' && !canAct(o) && o.state !== 'juke') { b.owner = null; b.lockP = o; b.lockT = 0.3; }
  }
  b.lockT -= dt;
  b.pickupInv -= dt;

  // body-contact steals
  if (b.owner && b.owner.role !== 'keeper' && b.pickupInv <= 0) {
    const o = b.owner;
    if (o.invuln <= 0 && o.fx.mega <= 0 && o.fx.fire <= 0) {
      for (const s of other(o.team).players) {
        if (!canAct(s) || s.fx.shrink > 0) continue;
        const d = dist(s.x, s.y, b.x, b.y);
        if (d < s.r + BALL_R + 3 && Math.random() < dt * 2.2 * (o.fx.shrink > 0 ? 3 : 1)) {
          b.owner = s; b.lastTouch = s; b.pickupInv = 0.45; s.invuln = 0.2;
          floatText(o.x, o.y, 70, 'YOINK!', '#fff', 24); SFX.pass();
          break;
        }
      }
    }
  }

  // free-ball pickups
  if (!b.owner && !b.super && b.z < 42) {
    let best = null, bd = 1e9;
    for (const p of M.outfield) {
      if (!(canAct(p) || p.state === 'tackle')) continue;
      if (b.lockP === p && b.lockT > 0) continue;
      const d = dist(p.x, p.y, b.x, b.y);
      if (d < p.r + BALL_R + 5 && d < bd) { bd = d; best = p; }
    }
    if (best) {
      const sp = Math.hypot(b.vx, b.vy);
      if (b.shot && b.shot.team !== best.team && sp > 980 && best.fx.mega <= 0) {
        // blocked a rocket with the face
        knock(best, b.vx * 0.3, b.vy * 0.3, 0.8, 'ball');
        floatText(best.x, best.y, 80, pick(['FACE BLOCK!', 'NOT THE FACE!', 'SMACK!']), '#fff', 26);
        b.vx *= -0.35; b.vy = b.vy * 0.3 + rand(-250, 250); b.vz = 200; b.shot = null; b.lockP = best; b.lockT = 0.4;
        excite(0.5);
      } else {
        const perfectPass = best.oneTimer > 0 && b.passFrom && b.passFrom.team === best.team && b.passTarget === best;
        const volley = best.oneTimer > 0;
        b.owner = best; b.lastTouch = best; b.shot = null; b.spin = 0; b.pickupInv = 0.3;
        b.passTarget = null; b.lob = false;
        if (volley) { best.oneTimer = 0; shoot(best, perfectPass ? 0.95 : 0.7, best.human ? (Input.devices[best.human].my) : null, perfectPass); }
        else SFX.bounce(0.3);
      }
    }
  }
}

// ---------------------------------------------------------------------------
//  Ball physics
// ---------------------------------------------------------------------------
function updateBall(dt, frozenPlay) {
  const b = M.ball;
  const S = M.stadium;
  if (b.owner) {
    const o = b.owner;
    if (o.role === 'keeper') {
      b.x = o.x + Math.cos(o.face) * (o.r * 0.6); b.y = o.y + 4; b.z = 26 + o.z;
    } else {
      const off = o.r + BALL_R + 1;
      const tx = o.x + Math.cos(o.face) * off, ty = o.y + Math.sin(o.face) * off;
      const k = Math.min(1, dt * 28);
      b.x += (tx - b.x) * k; b.y += (ty - b.y) * k; b.z = 0;
    }
    b.vx = o.vx; b.vy = o.vy; b.vz = 0;
    b.rot += Math.hypot(o.vx, o.vy) * dt * 0.06;
    b.trail.length = 0;
    clampBallToField(b, true);
    return;
  }
  const g = GRAV * S.grav;
  b.vz -= g * dt; b.z += b.vz * dt;
  if (b.z <= 0) {
    b.z = 0;
    if (b.vz < -110) { const v = -b.vz; b.vz = v * 0.55; SFX.bounce(Math.min(1, v / 800)); }
    else b.vz = 0;
  }
  const onGround = b.z <= 1;
  const k = onGround ? 1.05 * S.ballFric : 0.12;
  const e = Math.exp(-k * dt);
  b.vx *= e; b.vy *= e;
  if (b.spin && !onGround) {
    const sp = Math.hypot(b.vx, b.vy) || 1;
    b.vx += -b.vy / sp * b.spin * dt; b.vy += b.vx / sp * b.spin * dt;
  }
  b.spin *= Math.exp(-1.5 * dt);
  b.x += b.vx * dt; b.y += b.vy * dt;
  const sp = Math.hypot(b.vx, b.vy);
  b.rot += sp * dt * 0.06;
  if (b.shot) { b.shot.t += dt; if (sp < 300) b.shot = null; }
  if (b.passT > 0) { b.passT -= dt; if (b.passT <= 0) b.passTarget = null; }
  if (sp > 650 || b.super) { b.trail.push({ x: b.x, y: b.y, z: b.z }); if (b.trail.length > 14) b.trail.shift(); }
  else if (b.trail.length) b.trail.shift();
  if (sp > 1150 && Math.random() < dt * 40) part({ x: b.x, y: b.y, z: b.z, life: 0.35, max: 0.35, size: 7, color: '#ffb703', kind: 'flame' });
  clampBallToField(b, false);
}

function clampBallToField(b, owned) {
  const R = BALL_R;
  const inMouthY = b.y > GY0 + R * 0.5 && b.y < GY1 - R * 0.5;
  const underBar = b.z < BAR_Z - R * 0.5;
  // posts
  if (!owned) for (const px of [0, FW]) for (const py of [GY0, GY1]) {
    if (b.z > BAR_Z + 4) continue;
    const dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy);
    if (d < R + 7 && d > 0) {
      const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= 1.75 * vn * nx; b.vy -= 1.75 * vn * ny;
        b.x = px + nx * (R + 7); b.y = py + ny * (R + 7);
        if (-vn > 300) { SFX.post(); shake(5); floatText(px, py, 110, 'CLANG!', '#ffe066', 28); if (b.shot) say(COMMENTARY.post, {}, 2); excite(0.8); b.shot = null; }
      }
    }
  }
  // crossbar
  if (!owned && inMouthY && Math.abs(b.z - BAR_Z) < R + 3) {
    for (const gx of [0, FW]) if (Math.abs(b.x - gx) < R + 4) {
      if ((gx === 0 && b.vx < 0) || (gx === FW && b.vx > 0)) {
        b.vx = -b.vx * 0.55; b.vz = Math.abs(b.vz) * 0.6 + 80;
        b.x = gx + (gx === 0 ? R + 4 : -R - 4);
        SFX.post(); floatText(gx, b.y, BAR_Z + 20, 'CROSSBAR!', '#ffe066', 26); shake(5);
        if (b.shot) say(COMMENTARY.post, {}, 2); b.shot = null;
      }
    }
  }
  const insideL = b.x < 0, insideR = b.x > FW;
  if (insideL || insideR) {
    // inside the goal box: keep within the net
    const back = insideL ? -GOAL_D + R : FW + GOAL_D - R;
    if (insideL && b.x < back) { b.x = back; b.vx = Math.abs(b.vx) * 0.12; b.netBulge = 0.4; }
    if (insideR && b.x > back) { b.x = back; b.vx = -Math.abs(b.vx) * 0.12; b.netBulge = 0.4; }
    if (b.y < GY0 + R) { b.y = GY0 + R; b.vy = Math.abs(b.vy) * 0.3; }
    if (b.y > GY1 - R) { b.y = GY1 - R; b.vy = -Math.abs(b.vy) * 0.3; }
    if (b.z > BAR_Z - R) { b.z = BAR_Z - R; b.vz = -Math.abs(b.vz) * 0.3; }
  } else {
    if (b.x < R && !(inMouthY && underBar)) { b.x = R; if (b.vx < 0) { b.vx = -b.vx * 0.72; wallBallFx(b); } }
    if (b.x > FW - R && !(inMouthY && underBar)) { b.x = FW - R; if (b.vx > 0) { b.vx = -b.vx * 0.72; wallBallFx(b); } }
  }
  if (b.y < R) { b.y = R; if (b.vy < 0) { b.vy = -b.vy * 0.72; wallBallFx(b); } }
  if (b.y > FH - R) { b.y = FH - R; if (b.vy > 0) { b.vy = -b.vy * 0.72; wallBallFx(b); } }
}
function wallBallFx(b) {
  const sp = Math.hypot(b.vx, b.vy);
  if (sp < 250) return;
  SFX.bounce(Math.min(1, sp / 900));
  if (M.stadium.wallFx === 'zap' && sp > 600) { burst(b.x, b.y, b.z + 10, 8, [M.stadium.wall, '#fff'], 250, 'spark', 3, 0.3, 0); SFX.tone(1200, 0.05, 'square', 0.05, 300); }
  if (M.stadium.wallFx === 'hay') { b.vx *= 1.15; b.vy *= 1.15; }
}

function checkGoal() {
  if (M.phase !== 'play') return;
  const b = M.ball;
  const inY = b.y > GY0 && b.y < GY1 && b.z < BAR_Z;
  if (!inY) return;
  if (b.x < -BALL_R * 0.6) scoreGoal(M.teams[1]);
  else if (b.x > FW + BALL_R * 0.6) scoreGoal(M.teams[0]);
}

function scoreGoal(team) {
  const b = M.ball, conceded = other(team);
  const sup = b.super;
  b.super = null;
  if (b.owner) b.owner = null;
  team.score++;
  M.phase = 'goal'; M.phaseT = 0; M.goalTeam = team;
  M.slowmo = 0.22; M.hitStop = 0.14; shake(22); flash(0.7, '#ffffff');
  const scorer = b.lastTouch || team.players[0];
  const own = scorer.team !== team;
  if (!own) scorer.stats.goals++;
  M.lastScorer = scorer;
  Input.rumbleAll(500, 0.7, 1);
  SFX.goalJingle(); SFX.cheer(1.5); SFX.whistle(); SFX.vuvuzela(2.5);
  excite(1.5);
  const gx = team.dir > 0 ? FW : 0;
  for (let i = 0; i < 70; i++) part({ x: gx + rand(-60, 60), y: FH / 2 + rand(-160, 160), z: rand(40, 160), vx: rand(-300, 300), vy: rand(-300, 300), vz: rand(200, 700), g: 500, life: rand(1.5, 3), max: 3, size: rand(5, 9), color: pick(['#ff6b6b', '#ffd43b', '#4dabf7', '#51cf66', '#f783ac', '#ffffff', team.kit]), kind: 'confetti', rot: rand(0, TAU), vr: rand(-12, 12), drag: 1.5 });
  const golden = M.golden;
  M.bigText = { str: own ? 'OWN GOAL!' : (golden ? 'GOLDEN GOAL!' : 'GOOOAL!'), sub: own ? `${scorer.name} is in disgrace!` : `${scorer.name} — ${team.name}`, t: 0, life: 3.4, color: own ? '#ff8787' : (golden ? '#ffd84a' : '#ffffff'), team };
  if (own) say(COMMENTARY.ownGoal, { p: scorer.name, t: team.name }, 3);
  else if (sup) say(COMMENTARY.superGoal, { p: scorer.name, s: sup.name }, 3);
  else say(COMMENTARY.goal, { p: scorer.name, t: team.name, o: conceded.name }, 3);
  bubble(scorer, own ? 'OOPS...' : pick(scorer.role === 'captain' ? scorer.team.cap.quips : ['YESSSS!', 'GET IN!', 'WOOHOO!', 'I DID IT!']), 2.5);
  const k = conceded.keeper;
  if (k.state !== 'down') { k.state = 'down'; k.stateT = 2; k.lyingDir = -conceded.dir; k.expr = 'hurt'; }
  for (const p of M.all) { p.celebrate = p.team === team; p.charging = false; if (p.team === conceded && p.state === 'normal') p.expr = 'hurt'; }
  if (M.cfg.items) giveItem(conceded, randomItem(conceded));
}

// ---------------------------------------------------------------------------
//  Goalkeepers
// ---------------------------------------------------------------------------
function updateKeeper(k, dt, frozenPlay) {
  const T = k.team, b = M.ball, gx = ownGoalX(T);
  const homeX = gx + T.dir * 42;
  const D = T.ai;
  if (b.owner === k && k.state !== 'hold') { b.owner = null; b.vz = 150; b.vx = T.dir * 200; b.lockP = k; b.lockT = 0.4; }
  if (k.state === 'dive') {
    k.stateT -= dt;
    k.vx *= Math.exp(-2 * dt); k.vy *= Math.exp(-2.5 * dt);
    if (k.stateT <= 0) { k.state = 'down'; k.stateT = 0.45; k.expr = 'normal'; }
    keeperContact(k);
    return;
  }
  if (k.state === 'hold') {
    k.stateT -= dt; k.vx *= 0.8; k.vy *= 0.8;
    if (b.owner !== k) { k.state = 'normal'; return; }
    if (k.stateT <= 0 && !frozenPlay) {
      k.state = 'normal';
      let best = null, bs = -1e9;
      for (const m of T.players) {
        if (!isUp(m)) continue;
        let near = 1e9; for (const o of other(T).players) near = Math.min(near, dist(o.x, o.y, m.x, m.y));
        const s = Math.min(near, 300) + (m.x - gx) * T.dir * 0.25 - Math.abs(m.y - FH / 2) * 0.05 + rand(0, 60);
        if (s > bs) { bs = s; best = m; }
      }
      k.face = best ? Math.atan2(best.y - k.y, best.x - k.x) : (T.dir > 0 ? 0 : Math.PI);
      if (best) pass(k, { mx: 0, my: 0, passTo: best }); else { releaseBall(k); b.vx = T.dir * 800; b.vz = 300; }
      b.lockP = k; b.lockT = 0.6;
    }
    return;
  }
  if (k.state !== 'normal') return;
  if (frozenPlay) {
    if (k.celebrate) { k.expr = 'happy'; k.armsUp = true; }
    moveToward(k, homeX, FH / 2, dt, 150);
    return;
  }
  k.armsUp = false;
  // shot detection & dive
  const towards = -T.dir * b.vx;
  if (!b.owner && !b.super && towards > 280 && b.keeperIgnore !== k) {
    const t = (k.x - b.x) / (b.vx || 1e-6);
    if (t > 0 && t < 0.55) {
      const py = b.y + b.vy * t;
      if (py > GY0 - 40 && py < GY1 + 40) {
        k.react = (k.react || 0) + dt;
        if (k.react > D.react && Math.abs(py - k.y) > 26) {
          const need = py - k.y;
          k.state = 'dive'; k.stateT = 0.55; k.vy = clamp(need / Math.max(t, 0.12), -820, 820) * D.keeper; k.vx = T.dir * 40;
          k.lyingDir = need > 0 ? 1 : -1; k.expr = 'grit';
          return;
        }
      }
    }
  } else k.react = 0;
  // rush out to grab loose slow balls in the box
  const dBall = dist(b.x, b.y, gx, FH / 2);
  let tx, ty, spd = 270;
  if (!b.owner && dBall < 250 && Math.hypot(b.vx, b.vy) < 380 && b.z < 50) {
    tx = b.x; ty = b.y; spd = 330;
  } else {
    const aheadFrac = clamp((700 - dBall) / 700, 0, 1);
    tx = homeX + T.dir * aheadFrac * 45;
    const by = b.super ? b.y : b.y + (b.owner ? 0 : b.vy * 0.15);
    ty = clamp(lerp(FH / 2, by, 0.55 + aheadFrac * 0.4), GY0 + 14, GY1 - 14);
  }
  moveToward(k, tx, ty, dt, spd);
  // clamp keeper to box
  k.x = T.dir > 0 ? clamp(k.x, 8, 230) : clamp(k.x, FW - 230, FW - 8);
  k.y = clamp(k.y, GY0 - 110, GY1 + 110);
  if (Math.hypot(k.vx, k.vy) > 20) k.face = Math.atan2(b.y - k.y, b.x - k.x);
  keeperContact(k);
}
function moveToward(p, tx, ty, dt, spd) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  const s = d < 4 ? 0 : Math.min(spd, d * 6);
  const tvx = d ? dx / d * s : 0, tvy = d ? dy / d * s : 0;
  p.vx += (tvx - p.vx) * Math.min(1, dt * 12); p.vy += (tvy - p.vy) * Math.min(1, dt * 12);
}
function keeperContact(k) {
  const b = M.ball, T = k.team;
  if (b.super) return;
  const reach = k.r + (k.state === 'dive' ? 28 : 12);
  if (b.z > BAR_Z + 15) return;
  const d = dist(k.x, k.y, b.x, b.y);
  if (d > reach + BALL_R) return;
  if (b.owner) {
    if (b.owner.team !== T && b.owner.role !== 'keeper' && Math.random() < 0.15) {
      const o = b.owner; b.owner = k; b.lastTouch = k; k.state = 'hold'; k.stateT = 0.9;
      knock(o, -T.dir * -260, rand(-150, 150), 0.5, 'keeper', true);
      floatText(k.x, k.y, 90, 'MINE!', '#fff', 26);
    }
    return;
  }
  if (b.keeperIgnore === k) return;
  if (b.lockP === k && b.lockT > 0) return;
  const sp = Math.hypot(b.vx, b.vy);
  const isShot = b.shot && b.shot.team !== T;
  let p = isShot ? clamp(1.1 - sp / 1500, 0.12, 0.88) * T.ai.keeper : 1;
  if (k.state === 'dive') p += 0.08;
  if (Math.random() < p) {
    const goalSide = -T.dir;
    if (sp < 760 || Math.random() < 0.35) {
      b.owner = k; b.lastTouch = k; b.vx = b.vy = b.vz = 0; b.shot = null; b.passTarget = null;
      if (k.state !== 'dive') k.state = 'hold'; k.holdAfterDive = true; k.stateT = 0.9;
      if (k.state === 'dive') { k.state = 'hold'; k.stateT = 1.0; }
      SFX.thud();
    } else {
      b.vx = -goalSide * Math.abs(b.vx) * 0.45 + rand(-50, 50); b.vy = rand(-1, 1) * 420; b.vz = 260; b.shot = null;
      b.lockP = k; b.lockT = 0.4; b.lastTouch = k;
      SFX.thud(); shake(5);
    }
    if (isShot) {
      k.stats.saves++;
      floatText(k.x, k.y, 90, pick(KEEPER_SAVE_WORDS), '#a5ffd6', 28);
      excite(0.7); SFX.cheer(0.5);
      if (sp > 900 || Math.random() < 0.4) say(COMMENTARY.save, {}, 1);
    }
  } else {
    b.keeperIgnore = k;
    if (isShot) { floatText(k.x, k.y, 90, pick(KEEPER_FAIL_WORDS), '#ffb3b3', 24); }
  }
}

// ---------------------------------------------------------------------------
//  AI
// ---------------------------------------------------------------------------
function seek(cmd, p, tx, ty, arrive = 60) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d < 6) { cmd.mx = cmd.my = 0; return d; }
  const m = Math.min(1, d / arrive);
  cmd.mx = dx / d * m; cmd.my = dy / d * m;
  return d;
}
function formationPos(p, attacking) {
  const T = p.team, b = M.ball, f = FORM[p.slot];
  const own = T.dir > 0 ? b.x / FW : 1 - b.x / FW;
  let fx = f.x + (own - 0.5) * 0.5 + (attacking ? 0.1 : -0.05);
  fx = clamp(fx, 0.1, 0.9);
  let fy = f.y + (b.y / FH - 0.5) * 0.35 + Math.sin(M.time * 0.6 + p.slot * 2) * 0.03;
  fy = clamp(fy, 0.08, 0.92);
  return { x: T.dir > 0 ? fx * FW : (1 - fx) * FW, y: fy * FH };
}
function nearestOpp(p, frontOnly = false) {
  let best = null, bd = 1e9;
  for (const o of other(p.team).players) {
    if (!isUp(o)) continue;
    if (frontOnly && (o.x - p.x) * p.team.dir < -20) continue;
    const d = dist(p.x, p.y, o.x, o.y);
    if (d < bd) { bd = d; best = o; }
  }
  return { o: best, d: bd };
}
function bestPassTarget(p) {
  const T = p.team;
  let best = null, bs = -1e9;
  for (const m of T.players) {
    if (m === p || !isUp(m)) continue;
    let near = 1e9; for (const o of other(T).players) if (isUp(o)) near = Math.min(near, dist(o.x, o.y, m.x, m.y));
    const fwd = (m.x - p.x) * T.dir;
    const d = dist(p.x, p.y, m.x, m.y);
    const s = Math.min(near, 250) * 0.8 + fwd * 0.6 - Math.abs(d - 320) * 0.2;
    if (s > bs) { bs = s; best = m; }
  }
  return best;
}

function aiCmd(p, dt) {
  const cmd = blankCmd();
  const T = p.team, b = M.ball, D = T.ai;
  p.ai.t -= dt;
  const gx = goalXOf(T), gy = FH / 2;
  if (!canAct(p) && p.state !== 'juke') return cmd;

  if (b.owner === p) {
    const dg = dist(p.x, p.y, gx, gy);
    const th = nearestOpp(p);
    if (p.charging) {
      cmd.shootDown = true;
      if (p.sweetT >= 0) { if (p.sweetT >= p.ai.sweetRelease) cmd.shootDown = false; }
      else if (p.charge >= p.ai.chargeTarget && !(p.ai.wantSuper && inSuperRange(p))) cmd.shootDown = false;
      if (th.d < 55 && p.sweetT < 0) cmd.shootDown = false;
      seek(cmd, p, gx, gy + p.ai.aimY * 90);
      cmd.aimY = p.ai.aimY;
      return cmd;
    }
    const range = p.role === 'captain' ? 600 : 520;
    const superMood = p.role === 'captain' && inSuperRange(p) && th.d > 170 && Math.random() < dt * 1.5;
    if (superMood || dg < range || (dg < 760 && Math.random() < dt * 0.5)) {
      cmd.shootPressed = cmd.shootDown = true;
      p.ai.wantSuper = superMood || (inSuperRange(p) && th.d > 110 && Math.random() < 0.6);
      p.ai.chargeTarget = th.d < 130 ? rand(0.25, 0.5) : rand(0.55, 1);
      p.ai.sweetRelease = 0.5 + rand(-1, 1) * 0.2 * (1.25 - D.superAcc);
      const k = other(T).keeper;
      p.ai.aimY = (k.y > FH / 2 ? -1 : 1) * rand(0.45, 0.95) * (Math.random() < 0.25 ? -1 : 1);
      cmd.aimY = p.ai.aimY;
      return cmd;
    }
    if (p.ai.t <= 0) {
      p.ai.t = rand(0.22, 0.45) * (1.3 - D.acc * 0.4);
      if (th.d < 115 && Math.random() < 0.5) { const m = bestPassTarget(p); if (m) { cmd.pass = true; cmd.passTo = m; return cmd; } }
      if (th.d < 85 && p.jukeCD <= 0 && Math.random() < 0.35 * D.acc) { cmd.tackle = true; const a = p.face + rand(-1, 1); cmd.mx = Math.cos(a); cmd.my = Math.sin(a); return cmd; }
      if (Math.random() < 0.08) { const m = bestPassTarget(p); if (m && (m.x - p.x) * T.dir > 150) { cmd.pass = true; cmd.passTo = m; return cmd; } }
      p.ai.weave = clamp(p.ai.weave + rand(-0.6, 0.6), -1, 1);
    }
    let tx = gx - T.dir * 130, ty = gy + p.ai.weave * 170;
    let dx = tx - p.x, dy = ty - p.y; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    for (const o of other(T).players) {
      if (!isUp(o)) continue;
      const ox = p.x - o.x, oy = p.y - o.y, od = Math.hypot(ox, oy);
      if (od < 170 && (o.x - p.x) * T.dir > -30) { const w = (170 - od) / 170 * 1.4; dx += ox / od * w; dy += oy / od * w; }
    }
    // avoid walls
    if (p.y < 90) dy += 0.8; if (p.y > FH - 90) dy -= 0.8;
    const l = Math.hypot(dx, dy) || 1;
    cmd.mx = dx / l; cmd.my = dy / l;
    return cmd;
  }

  const teamHas = b.owner && b.owner.team === T;
  if (teamHas) {
    const f = formationPos(p, true);
    seek(cmd, p, f.x, f.y, 80);
    return cmd;
  }
  if (b.passTarget === p) {
    const pr = ballPredict(0.15);
    seek(cmd, p, pr.x, pr.y, 20);
    if (dist(p.x, p.y, gx, gy) < 650 && Math.random() < dt * 4 * D.acc && dist(p.x, p.y, b.x, b.y) < 260) cmd.shootPressed = true;
    return cmd;
  }
  if (T.chasers.includes(p)) {
    const d = dist(p.x, p.y, b.x, b.y);
    const pr = ballPredict(Math.min(0.5, d / 700));
    const o = b.owner;
    if (o && o.team !== T && o.role !== 'keeper') {
      // aim between carrier and own goal a little, then go for the tackle
      const og = ownGoalX(T);
      const tx = lerp(o.x, og, 0.08), ty = lerp(o.y, FH / 2, 0.08);
      seek(cmd, p, tx + o.vx * 0.15, ty + o.vy * 0.15, 10);
      const dd = dist(p.x, p.y, o.x, o.y);
      if (dd < 85 + p.r && p.tackleCD <= 0 && p.ai.t <= 0) {
        p.ai.t = rand(0.15, 0.35) / D.tackle;
        if (Math.random() < 0.55 * D.tackle) { cmd.tackle = true; cmd.faceTo = { x: o.x + o.vx * 0.12, y: o.y + o.vy * 0.12 }; }
      }
    } else if (o && o.role === 'keeper') {
      const f = formationPos(p, false); seek(cmd, p, f.x, f.y, 80);
    } else {
      seek(cmd, p, pr.x, pr.y, 10);
    }
    return cmd;
  }
  // defensive shape + marking
  const f = formationPos(p, false);
  let tx = f.x, ty = f.y;
  if (b.owner && b.owner.team !== T) {
    let mark = null, md = 1e9;
    for (const o of other(T).players) { if (o === b.owner || !isUp(o)) continue; const d = dist(o.x, o.y, f.x, f.y); if (d < md) { md = d; mark = o; } }
    if (mark && md < 300) { const og = ownGoalX(T); tx = lerp(mark.x, og, 0.15); ty = lerp(mark.y, FH / 2, 0.15); }
  }
  seek(cmd, p, tx, ty, 80);
  return cmd;
}

function celebrateCmd(p, dt) {
  const cmd = blankCmd();
  if (!canAct(p)) return cmd;
  if (p.celebrate) {
    p.expr = 'happy'; p.armsUp = true;
    p.ai.wander -= dt;
    if (p.ai.wander <= 0) { p.ai.wander = rand(0.4, 0.9); p.ai.pdir = rand(0, TAU); }
    cmd.mx = Math.cos(p.ai.pdir) * 0.7; cmd.my = Math.sin(p.ai.pdir) * 0.7;
    if (p.z <= 0 && Math.random() < dt * 2) p.vz = 260;
  } else {
    p.armsUp = false;
    if (M.phase === 'goal' || M.winner) p.expr = 'hurt';
  }
  return cmd;
}

// ---------------------------------------------------------------------------
//  SUPER STRIKES
// ---------------------------------------------------------------------------
function startSuper(p, aimY) {
  const T = p.team, cap = T.cap;
  M.phase = 'cine'; M.phaseT = 0;
  M.cine = { p, type: cap.superType, name: cap.superName, aimY: aimY || 0 };
  p.charging = false; p.charge = 0; p.sweetT = -1; p.stats.supers++;
  p.vx = p.vy = 0; p.expr = 'grit';
  M.banner = { cap, team: T, name: cap.superName, t: 0, life: 1.5 };
  flash(0.5, T.kit); shake(6);
  SFX.superCharge(); excite(1.2);
  say(COMMENTARY.super, { p: p.name, s: cap.superName }, 2);
}
function updateCine(dt) {
  const c = M.cine, p = c.p;
  p.anim += dt;
  if (c.type === 'sky') p.z = Math.sin(Math.min(1, M.phaseT / 0.9) * Math.PI / 2) * 120;
  for (let i = 0; i < 3; i++) {
    const a = rand(0, TAU);
    part({ x: p.x + Math.cos(a) * 60, y: p.y + Math.sin(a) * 30, z: rand(0, 70), vx: -Math.cos(a) * 120, vy: -Math.sin(a) * 60, vz: 40, life: 0.5, max: 0.5, size: rand(4, 8), color: pick([p.team.kit, p.team.kit2, '#ffffff']), kind: 'spark' });
  }
  updateParticles(dt);
  if (M.phaseT > 1.15) launchSuper();
}
function launchSuper() {
  const c = M.cine, p = c.p, T = p.team, O = other(T), b = M.ball;
  M.phase = 'play'; M.phaseT = 0;
  const gx = goalXOf(T);
  const ty = FH / 2 + clamp(c.aimY || rand(-0.6, 0.6), -1, 1) * 70 + rand(-25, 25);
  const S = { x: b.x, y: b.y }, E = { x: gx + T.dir * 48, y: ty };
  const L = dist(S.x, S.y, E.x, E.y);
  const D = { boulder: L / 900, zigzag: L / 1150, split: L / 950, sky: 1.7, teleport: 1.35, curve: L / 820 + 0.2, dance: L / 650, cannon: L / 1650 }[c.type];
  let pSave = SAVE_P[c.type] * O.ai.keeper * (L > 750 ? 1.5 : 1);
  if (O.keeper.state !== 'normal') pSave *= 0.3;
  releaseBall(p);
  p.z = 0; p.kickAnim = 0.3;
  b.super = { type: c.type, name: c.name, S, E, L, D: Math.max(0.55, D), t: 0, saved: Math.random() < pSave, by: p, team: T, keeper: O.keeper, resolved: false, side: Math.random() < 0.5 ? -1 : 1, realIdx: randi(0, 2), prevK: 0, decoys: [] };
  b.lastTouch = p; b.owner = null; b.shot = { team: T, by: p, speed: 1500, t: 0 };
  SFX.superFire(); shake(16); flash(0.4, T.kit2);
  if (p.human) Input.rumble(p.human, 600, 1, 1);
  if (c.type === 'dance') {
    for (const o of [...O.players, O.keeper]) if (isUp(o) && (o.role === 'keeper' || dist(o.x, o.y, p.x, p.y) < 650)) { o.state = 'dance'; o.stateT = 2.6; o.expr = 'happy'; }
    SFX.tone(523, 0.2, 'square', 0.1); SFX.tone(659, 0.2, 'square', 0.1, null, 0.15); SFX.tone(784, 0.3, 'square', 0.1, null, 0.3);
  }
  if (c.type === 'cannon') burst(b.x, b.y, 20, 25, ['#555', '#888', '#333'], 300, 'smoke', 16, 1.0, -40);
  M.cine = null;
}
function superPos(s, u) {
  const { S, E } = s;
  const dx = E.x - S.x, dy = E.y - S.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const lp = t => ({ x: S.x + dx * t, y: S.y + dy * t });
  let q, z = 18;
  switch (s.type) {
    case 'boulder': q = lp(u); z = 26 + Math.abs(Math.sin(u * Math.PI * 5)) * 18; break;
    case 'zigzag': { q = lp(u); const off = Math.sign(Math.sin(u * Math.PI * 5)) * Math.min(1, Math.abs(Math.sin(u * Math.PI * 5)) * 3) * 120 * (1 - u * 0.75); q.x += nx * off; q.y += ny * off; z = 16; break; }
    case 'split': { q = lp(u); const off = Math.sin(u * Math.PI) * s.side * 190; q.x += nx * off; q.y += ny * off; z = 20 + Math.sin(u * Math.PI) * 40; break; }
    case 'sky': {
      let prog;
      if (u < 0.55) { const w = u / 0.55; prog = easeOutCubic(w) * 0.45; z = 560 * Math.sin(w * Math.PI / 2); }
      else { const w = (u - 0.55) / 0.45; prog = 0.45 + w * w * 0.55; z = 560 * (1 - w * w); }
      q = lp(prog); z = Math.max(0, z) + 10; break;
    }
    case 'teleport': {
      const stops = [0, 0.35, 0.65, 0.9, 1.0];
      const k = Math.min(3, Math.floor(u * 4));
      let prog = stops[k];
      if (k === 3) prog = lerp(0.9, 1.0, (u - 0.75) / 0.25);
      q = lp(prog);
      const off = [0, 130, -130, 0][k];
      q.x += nx * off + rand(-3, 3); q.y += ny * off + rand(-3, 3); z = 30 + Math.sin(M.time * 20) * 6;
      if (k !== s.prevK) { s.prevK = k; s.blink = 0.15; SFX.tone(1400, 0.12, 'sine', 0.12, 300); burst(q.x, q.y, z, 18, ['#66ff99', '#ffffff', '#00e5ff'], 260, 'spark', 4, 0.4, 0); }
      break;
    }
    case 'curve': {
      const w = Math.pow(u, 1.5);
      const C = { x: (S.x + E.x) / 2 + nx * s.side * 380, y: (S.y + E.y) / 2 + ny * s.side * 380 };
      q = { x: (1 - w) * (1 - w) * S.x + 2 * (1 - w) * w * C.x + w * w * E.x, y: (1 - w) * (1 - w) * S.y + 2 * (1 - w) * w * C.y + w * w * E.y };
      q.y = clamp(q.y, 30, FH - 30);
      z = 30 + Math.sin(w * Math.PI) * 60; break;
    }
    case 'dance': { q = lp(u); const off = Math.sin(u * Math.PI * 8) * 35; q.x += nx * off; q.y += ny * off; z = 12 + Math.abs(Math.sin(u * Math.PI * 6)) * 50; break; }
    default: q = lp(u); z = 24;
  }
  return { x: q.x, y: q.y, z };
}
function updateSuper(dt) {
  const b = M.ball, s = b.super;
  s.t += dt;
  const u = Math.min(1, s.t / s.D);
  const prevX = b.x;
  const q = superPos(s, u);
  b.vx = (q.x - b.x) / Math.max(dt, 1e-4); b.vy = (q.y - b.y) / Math.max(dt, 1e-4); b.vz = 0;
  b.x = q.x; b.y = q.y; b.z = q.z; b.rot += dt * 25;
  b.trail.push({ x: b.x, y: b.y, z: b.z }); if (b.trail.length > 18) b.trail.shift();
  if (s.blink) s.blink -= dt;
  // style particles
  const st = SUPER_STYLE[s.type];
  const col = { bus: ['#777', '#999', '#ffcc00'], electric: ['#fff35c', '#ffffff'], jollof: ['#e4572e', '#ffd7a8'], fire: ['#ff6a00', '#ffd43b', '#ff2200'], quantum: ['#66ff99', '#00e5ff'], steam: ['#ffffff', '#e6f2ff'], disco: ['#ff6bd5', '#7cf3ff', '#fff36b', '#a3ff6b'], cannon: ['#555', '#999'] }[st];
  for (let i = 0; i < 2; i++) part({ x: b.x + rand(-6, 6), y: b.y + rand(-6, 6), z: b.z + rand(-6, 6), vz: rand(10, 60), life: 0.5, max: 0.5, size: rand(5, 12), color: pick(col), kind: st === 'steam' || st === 'cannon' || st === 'bus' ? 'smoke' : st === 'disco' ? 'star' : 'flame' });
  if (s.type === 'boulder') shake(3);
  // split decoys
  if (s.type === 'split') {
    const dx = s.E.x - s.S.x, dy = s.E.y - s.S.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    s.decoys = [-1, 0, 1].filter(k => k !== s.side).map(k => {
      const off = Math.sin(u * Math.PI) * k * 190;
      return { x: s.S.x + dx * u + nx * off, y: s.S.y + dy * u + ny * off, z: 20 + Math.sin(u * Math.PI) * 40 };
    });
    if (u > 0.85) s.decoys = [];
  }
  // flatten anyone in the way (except the keeper, handled below)
  for (const p of M.outfield) {
    if (p.team === s.team || !isUp(p) || p.z > 60) continue;
    if (b.z > 80) continue;
    const R = BALL_R * (SUPER_SIZE[s.type] || 1) + p.r;
    if (dist(p.x, p.y, b.x, b.y) < R) {
      const sp = Math.hypot(b.vx, b.vy) || 1;
      knock(p, b.vx / sp * 600, b.vy / sp * 600, 1.4, 'super');
      if (s.type === 'boulder') { p.fx.flat = 1.4; floatText(p.x, p.y, 40, 'FLATTENED!', '#ffd43b', 28); }
      shake(10); SFX.boom(0.4);
    }
  }
  // keeper resolution when crossing keeper line
  const k = s.keeper;
  if (!s.resolved && k.state !== 'dance') {
    const dyk = clamp(b.y - k.y, -1, 1) * Math.min(Math.abs(b.y - k.y), 520 * dt);
    if (k.state === 'normal') k.y = clamp(k.y + dyk, GY0 - 30, GY1 + 30);
  }
  if (!s.resolved && Math.sign(prevX - k.x) !== Math.sign(b.x - k.x) && u > 0.3) {
    s.resolved = true;
    if (s.saved && isUp(k) && k.state !== 'dance') {
      const T = s.team;
      b.super = null;
      b.vx = -T.dir * rand(450, 650); b.vy = rand(-450, 450); b.vz = 380; b.shot = null; b.lastTouch = k;
      b.lockP = k; b.lockT = 0.5; b.keeperIgnore = null;
      k.state = 'down'; k.stateT = 1.2; k.vx = T.dir * 380; k.vy = 0; k.vz = 260; k.lyingDir = T.dir; k.expr = 'hurt';
      k.stats.saves++;
      floatText(k.x, k.y, 110, 'SUPER SAVE!!', '#a5ffd6', 38, 1.6);
      M.hitStop = 0.18; shake(18); flash(0.5, '#a5ffd6'); SFX.boom(0.7); SFX.cheer(1);
      say(COMMENTARY.superSave, { s: s.name }, 3);
      return;
    } else {
      const sp = Math.hypot(b.vx, b.vy) || 1;
      if (k.state !== 'dance') {
        knock(k, b.vx / sp * 700, b.vy / sp * 200, 1.6, 'super');
        k.vz = 520;
      }
      floatText(k.x, k.y, 100, pick(['KA-BOOM!', 'OBLITERATED!', 'YEET!', 'DEMOLISHED!']), '#ffd43b', 34);
      SFX.boom(0.8); shake(14);
    }
  }
  if (u >= 1) {
    b.super = null;
    const T = s.team;
    b.vx = T.dir * 120; b.vy = 0; b.vz = 0;
    if (b.y < GY0 + BALL_R || b.y > GY1 - BALL_R) b.y = clamp(b.y, GY0 + BALL_R, GY1 - BALL_R);
    b.super = null;
    b.superDone = s;
    checkGoal();
  }
}

// ---------------------------------------------------------------------------
//  ITEMS
// ---------------------------------------------------------------------------
function randomItem(team) {
  const behind = other(team).score - team.score;
  const w = ITEM_KEYS.map(k => {
    let v = ITEMS[k].weight;
    if (behind >= 2 && (k === 'mega' || k === 'freeze' || k === 'bees')) v *= 2.5;
    return v;
  });
  let r = Math.random() * w.reduce((a, c) => a + c, 0);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return ITEM_KEYS[i]; }
  return 'banana';
}
function giveItem(team, key) {
  if (team.items.length >= 2) return false;
  team.items.push(key); team.itemFlash = 0.8;
  SFX.pickup();
  return true;
}
function updateBoxes(dt) {
  M.nextBox -= dt;
  if (M.nextBox <= 0 && M.boxes.length < 2) {
    M.nextBox = rand(9, 15);
    M.boxes.push({ x: rand(FW * 0.25, FW * 0.75), y: rand(FH * 0.18, FH * 0.82), z: 700, vz: 0, t: 0 });
  }
  for (let i = M.boxes.length - 1; i >= 0; i--) {
    const bx = M.boxes[i];
    bx.t += dt;
    if (bx.z > 0 || bx.vz > 0) { bx.vz -= GRAV * 0.8 * dt; bx.z += bx.vz * dt; if (bx.z <= 0) { bx.z = 0; if (bx.vz < -200) { bx.vz = -bx.vz * 0.4; SFX.thud(); burst(bx.x, bx.y, 0, 6, '#d9c7a0', 120, 'smoke', 10, 0.5, 0); } else bx.vz = 0; } }
    if (bx.z > 30) continue;
    for (const p of M.outfield) {
      if (!canAct(p) && p.state !== 'tackle') continue;
      if (dist(p.x, p.y, bx.x, bx.y) < p.r + 22) {
        const key = randomItem(p.team);
        if (giveItem(p.team, key)) floatText(bx.x, bx.y, 50, ITEMS[key].icon + ' ' + ITEMS[key].name.toUpperCase() + '!', '#fff', 22);
        else floatText(bx.x, bx.y, 50, 'POCKETS FULL!', '#ccc', 20);
        burst(bx.x, bx.y, 20, 16, ['#ffd43b', '#ffffff', '#ff922b'], 260, 'star', 6, 0.6, 200);
        M.boxes.splice(i, 1);
        break;
      }
    }
  }
}
function teamItemAI(dt) {
  for (const T of M.teams) {
    if (T.humans.length || !T.items.length) continue;
    T.itemAI -= dt;
    if (T.itemAI > 0) continue;
    T.itemAI = rand(0.5, 1.2) / T.ai.item;
    const key = T.items[0], b = M.ball, O = other(T);
    const user = T.chasers[0] || T.players.find(isUp);
    if (!user || !canAct(user)) continue;
    const oppHas = b.owner && b.owner.team === O && b.owner.role !== 'keeper';
    const weHave = b.owner && b.owner.team === T;
    const oppNear = O.players.filter(o => isUp(o) && dist(o.x, o.y, user.x, user.y) < 450).length;
    let go = false;
    switch (key) {
      case 'chicken': case 'bees': go = oppHas; break;
      case 'bomb': go = oppNear >= 2 || (oppHas && dist(b.x, b.y, user.x, user.y) < 350); break;
      case 'freeze': go = oppNear >= 2; break;
      case 'banana': go = b.owner === user || oppNear >= 1; break;
      case 'chili': case 'mega': go = weHave || oppHas; break;
      case 'shrink': go = true; break;
    }
    if (go || Math.random() < 0.08) useItem(T, b.owner && b.owner.team === T && b.owner.role !== 'keeper' ? b.owner : user);
  }
}
function useItem(T, p) {
  const key = T.items.shift();
  if (!key) return;
  const O = other(T), b = M.ball;
  p.stats.items++;
  SFX.item();
  const v = { p: p.name, t: T.name, o: O.name };
  say(COMMENTARY.item[key], v, 2);
  floatText(p.x, p.y, 95, ITEMS[key].icon, '#fff', 34, 0.9);
  const fx = Math.cos(p.face), fy = Math.sin(p.face);
  switch (key) {
    case 'banana': {
      M.hazards.push({ type: 'banana', x: clamp(p.x - fx * 45, 20, FW - 20), y: clamp(p.y - fy * 45, 20, FH - 20), life: 20, arm: 0.5, rot: rand(0, TAU) });
      break;
    }
    case 'chicken': {
      const tgt = (b.owner && b.owner.team === O && b.owner.role !== 'keeper') ? b.owner : nearestOpp(p).o;
      M.projectiles.push({ type: 'chicken', x: p.x, y: p.y, z: 35, vx: fx * 500, vy: fy * 500, team: T, target: tgt, life: 3.5, t: 0 });
      SFX.squawk();
      break;
    }
    case 'bomb': {
      M.projectiles.push({ type: 'bomb', x: p.x, y: p.y, z: 40, vx: fx * 420, vy: fy * 420, vz: 420, team: T, fuse: -1, life: 6, t: 0 });
      break;
    }
    case 'chili': p.fx.fire = 5.5; SFX.sizzle(); bubble(p, 'HOT HOT HOT!'); break;
    case 'mega': p.fx.mega = 6.5; p.fx.shrink = 0; SFX.grow(); bubble(p, 'I AM HUGE!'); shake(6); break;
    case 'freeze': {
      let n = 0;
      for (const o of O.players) if (isUp(o) && dist(o.x, o.y, p.x, p.y) < 520 && o.fx.mega <= 0) {
        if (b.owner === o) { b.owner = null; b.vz = 100; b.lockP = o; b.lockT = 0.5; }
        o.state = 'frozen'; o.stateT = 2.8; o.charging = false; o.vx *= 0.3; o.vy *= 0.3; n++;
        burst(o.x, o.y, 35, 12, ['#bfeaff', '#ffffff'], 200, 'snow', 5, 0.6, 100);
      }
      part({ x: p.x, y: p.y, z: 5, life: 0.6, max: 0.6, size: 520, color: '#bfeaff', kind: 'ring' });
      SFX.freeze(); flash(0.3, '#bfeaff');
      if (!n) floatText(p.x, p.y, 70, 'MISSED EVERYONE!', '#bfeaff', 22);
      break;
    }
    case 'shrink': {
      for (const o of O.players) if (isUp(o)) { o.fx.shrink = 7; o.fx.mega = 0; burst(o.x, o.y, 30, 8, '#b197fc', 150, 'spark', 4, 0.4, 0); }
      SFX.shrink();
      break;
    }
    case 'bees': {
      const tgt = (b.owner && b.owner.team === O && b.owner.role !== 'keeper') ? b.owner : O.players[0];
      M.projectiles.push({ type: 'bees', x: p.x, y: p.y, z: 50, vx: 0, vy: 0, team: T, target: tgt, life: 7, t: 0, stung: 0 });
      SFX.buzz();
      break;
    }
  }
}

function updateProjectiles(dt, frozenPlay) {
  const b = M.ball;
  for (let i = M.projectiles.length - 1; i >= 0; i--) {
    const q = M.projectiles[i];
    q.t += dt; q.life -= dt;
    let dead = q.life <= 0;
    if (q.type === 'chicken') {
      if (!q.target || !isUp(q.target)) q.target = nearestOpp({ x: q.x, y: q.y, team: q.team }).o;
      if (q.target) {
        const dx = q.target.x - q.x, dy = q.target.y - q.y, d = Math.hypot(dx, dy) || 1;
        const sp = 680;
        q.vx += (dx / d * sp - q.vx) * Math.min(1, dt * 4.5); q.vy += (dy / d * sp - q.vy) * Math.min(1, dt * 4.5);
        if (d < q.target.r + 14 && !frozenPlay) {
          knock(q.target, q.vx * 0.6, q.vy * 0.6, 1.4, 'chicken');
          floatText(q.target.x, q.target.y, 70, 'BAWK!', '#fff', 30);
          burst(q.x, q.y, q.z, 18, ['#ffffff', '#ffe8a3'], 220, 'feather', 6, 1.2, 150);
          SFX.squawk(); shake(6);
          dead = true;
        }
      }
      q.x += q.vx * dt; q.y += q.vy * dt; q.z = 35 + Math.sin(q.t * 18) * 6;
      if (Math.random() < dt * 8) part({ x: q.x, y: q.y, z: q.z, vz: 30, life: 0.8, max: 0.8, size: 5, color: '#fff', kind: 'feather' });
      if (Math.random() < dt * 2) SFX.squawk();
      if (dead && q.life <= 0) burst(q.x, q.y, q.z, 10, '#fff', 150, 'feather', 5, 0.8, 150);
    } else if (q.type === 'bomb') {
      if (q.fuse < 0) {
        q.vz -= GRAV * dt; q.z += q.vz * dt; q.x += q.vx * dt; q.y += q.vy * dt;
        q.x = clamp(q.x, 15, FW - 15); q.y = clamp(q.y, 15, FH - 15);
        if (q.z <= 0) { q.z = 0; if (q.vz < -200) { q.vz = -q.vz * 0.35; q.vx *= 0.5; q.vy *= 0.5; SFX.bounce(0.5); } else { q.vz = 0; q.vx = q.vy = 0; q.fuse = 1.1; } }
      } else {
        q.fuse -= dt;
        if (Math.random() < dt * 30) part({ x: q.x + 6, y: q.y, z: 30, vz: 80, vx: rand(-40, 40), life: 0.3, max: 0.3, size: 4, color: '#ffd43b', kind: 'spark' });
        if (Math.floor(q.fuse * 8) !== Math.floor((q.fuse + dt) * 8)) SFX.tone(1200, 0.04, 'square', 0.06);
        if (q.fuse <= 0) { explode(q.x, q.y, 200, 'bomb'); dead = true; }
      }
    } else if (q.type === 'bees') {
      const T = q.target;
      if (T && T.state !== 'abducted') {
        const dx = T.x - q.x, dy = T.y - q.y, d = Math.hypot(dx, dy) || 1;
        const sp = q.stung ? 380 : 440;
        q.x += dx / d * Math.min(sp * dt, d) + rand(-3, 3); q.y += dy / d * Math.min(sp * dt, d) + rand(-3, 3);
        if (!q.stung && d < T.r + 20 && !frozenPlay) {
          q.stung = 1; q.life = 3.2;
          if (b.owner === T) { b.owner = null; b.vx = rand(-200, 200); b.vy = rand(-200, 200); b.vz = 150; b.lockP = T; b.lockT = 0.6; }
          T.state = 'panic'; T.stateT = 3.2; T.charging = false; bubble(T, pick(['BEES!!', 'NOT THE BEES!', 'AAAAAH!']), 2);
          SFX.buzz();
        }
      } else dead = true;
      if (Math.random() < dt * 1.5) SFX.buzz();
    }
    if (dead) M.projectiles.splice(i, 1);
  }
}

function explode(x, y, R, kind) {
  const b = M.ball;
  for (const p of M.all) {
    if (p.state === 'abducted') continue;
    const d = dist(x, y, p.x, p.y);
    if (d < R + p.r) {
      const nx = (p.x - x) / (d || 1), ny = (p.y - y) / (d || 1), f = 1 - d / (R + p.r);
      if (p.role === 'keeper') { p.state = 'down'; p.stateT = 0.9; p.vx = nx * 300; p.vy = ny * 300; p.vz = 300; p.expr = 'hurt'; continue; }
      knock(p, nx * (300 + 600 * f), ny * (300 + 600 * f), 1.3, kind);
      p.vz = 350 + 400 * f;
      if (kind === 'bomb' || kind === 'meteor') p.fx.soot = 5;
    }
  }
  const db = dist(x, y, b.x, b.y);
  if (db < R * 1.3) {
    if (b.owner && b.owner.role !== 'keeper') b.owner = null;
    if (!b.owner && !b.super) { const nx = (b.x - x) / (db || 1), ny = (b.y - y) / (db || 1); b.vx = nx * 800; b.vy = ny * 800; b.vz = 500; b.shot = null; }
  }
  burst(x, y, 10, 40, ['#ff6a00', '#ffd43b', '#ff2200', '#ffffff'], 520, 'flame', 14, 0.7, -50);
  burst(x, y, 20, 18, ['#555', '#777', '#333'], 260, 'smoke', 22, 1.5, -80);
  part({ x, y, z: 2, life: 0.45, max: 0.45, size: R * 1.4, color: '#ffd43b', kind: 'ring' });
  M.decals.push({ x, y, r: R * 0.7, life: 14, max: 14 });
  SFX.boom(1); shake(22); flash(0.45, '#ffcf70'); M.hitStop = 0.07;
  floatText(x, y, 90, 'KABOOM!', '#ffd43b', 40, 1.2);
  excite(1);
}

// ---------------------------------------------------------------------------
//  STADIUM HAZARDS
// ---------------------------------------------------------------------------
function updateHazards(dt, frozenPlay) {
  const S = M.stadium, b = M.ball;
  if (M.cfg.hazards && !frozenPlay && M.phase === 'play') {
    M.nextHazard -= dt;
    if (M.nextHazard <= 0) { M.nextHazard = rand(10, 16); spawnHazard(S.hazard); }
  }
  for (let i = M.decals.length - 1; i >= 0; i--) { M.decals[i].life -= dt; if (M.decals[i].life <= 0) M.decals.splice(i, 1); }
  for (let i = M.hazards.length - 1; i >= 0; i--) {
    const h = M.hazards[i];
    let dead = false;
    h.t = (h.t || 0) + dt;
    switch (h.type) {
      case 'banana':
        h.life -= dt; h.arm -= dt;
        if (h.life <= 0) dead = true;
        if (h.arm <= 0 && !frozenPlay) for (const p of M.outfield) {
          if (!canAct(p) && p.state !== 'tackle' && p.state !== 'juke') continue;
          if (p.fx.mega > 0) continue;
          if (dist(p.x, p.y, h.x, h.y) < p.r + 12) {
            if (b.owner === p) { b.owner = null; b.vz = 120; b.lockP = p; b.lockT = 0.6; }
            p.state = 'spin'; p.stateT = 1.4; p.charging = false; p.expr = 'panic';
            const sp = Math.max(260, Math.hypot(p.vx, p.vy)) * 1.3, a = Math.atan2(p.vy, p.vx) || p.face;
            p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
            bubble(p, pick(['WHEEEE!', 'WHOA-OA-OA!', 'BANANA!!']));
            SFX.slip(); floatText(h.x, h.y, 40, 'SLIP!', '#ffe066', 26);
            dead = true; break;
          }
        }
        break;
      case 'strike': {
        h.T -= dt;
        if (h.T <= 0) {
          if (h.kind === 'lightning') {
            for (const p of M.all) if (p.state !== 'abducted' && dist(p.x, p.y, h.x, h.y) < h.r + p.r) {
              if (p.role === 'keeper') { p.fx.zap = 1; p.state = 'down'; p.stateT = 1; continue; }
              knock(p, rand(-200, 200), rand(-200, 200), 1.6, 'lightning'); p.fx.zap = 1.2; p.stats.zapped++;
            }
            if (dist(b.x, b.y, h.x, h.y) < h.r * 1.2 && !b.super) { if (b.owner && b.owner.role !== 'keeper') b.owner = null; if (!b.owner) { const a = rand(0, TAU); b.vx = Math.cos(a) * 700; b.vy = Math.sin(a) * 700; b.vz = 450; } }
            burst(h.x, h.y, 5, 30, ['#ffffff', '#bff6ff', '#fff35c'], 450, 'spark', 5, 0.5, 0);
            part({ x: h.x, y: h.y, z: 0, life: 0.3, max: 0.3, size: 1, color: '#fff', kind: 'bolt' });
            M.decals.push({ x: h.x, y: h.y, r: h.r * 0.6, life: 6, max: 6 });
            SFX.zap(); SFX.boom(0.6); shake(18); flash(0.6, '#e8fbff');
          } else {
            explode(h.x, h.y, h.r, 'meteor');
          }
          dead = true;
        }
        break;
      }
      case 'penguin': {
        h.x += h.vx * dt; h.y += h.vy * dt;
        if (h.y < -80 || h.y > FH + 80) dead = true;
        if (!frozenPlay) for (const p of M.all) {
          if (!isUp(p) || p.z > 30 || p.state === 'spin') continue;
          if (dist(p.x, p.y, h.x, h.y) < p.r + 18) {
            if (b.owner === p) { b.owner = null; b.lockP = p; b.lockT = 0.5; b.vz = 150; }
            p.state = 'spin'; p.stateT = 1.1; p.vx = h.vx * 0.9 + rand(-100, 100); p.vy = h.vy * 0.9; p.expr = 'panic';
            bubble(p, pick(['PENGUIN\'D!', 'NOOT NOOT?!', 'SLIPPERY!'])); SFX.penguin();
          }
        }
        if (!b.owner && !b.super && b.z < 30 && dist(b.x, b.y, h.x, h.y) < BALL_R + 18) { b.vx = h.vx * 1.4 + rand(-200, 200); b.vy = h.vy * 1.4; b.vz = 180; SFX.penguin(); }
        break;
      }
      case 'animal': {
        // states: enter -> graze -> leave
        if (h.phase === 'enter') { const d = seekPt(h, h.tx, h.ty, 70, dt); if (d < 8) { h.phase = 'graze'; h.gt = rand(9, 14); } }
        else if (h.phase === 'graze') { h.gt -= dt; if (Math.random() < dt * 0.25) { SFX.animal(h.emoji); floatText(h.x, h.y, 90, animalWord(h.emoji), '#fff', 24); } if (h.gt <= 0) { h.phase = 'leave'; h.tx = h.x; h.ty = h.y < FH / 2 ? -120 : FH + 120; } }
        else { seekPt(h, h.tx, h.ty, 90, dt); if (h.y < -100 || h.y > FH + 100) dead = true; }
        // obstacle
        for (const p of M.all) {
          if (p.state === 'abducted' || p.z > 40) continue;
          const d = dist(p.x, p.y, h.x, h.y), m = p.r + h.r;
          if (d < m && d > 0) { const nx = (p.x - h.x) / d, ny = (p.y - h.y) / d; p.x = h.x + nx * m; p.y = h.y + ny * m; if (p.state === 'down' && Math.hypot(p.vx, p.vy) > 250) { p.vx = nx * 300; p.vy = ny * 300; SFX.animal(h.emoji); } }
        }
        if (!b.owner && !b.super && b.z < 60) {
          const d = dist(b.x, b.y, h.x, h.y), m = BALL_R + h.r;
          if (d < m && d > 0) {
            const nx = (b.x - h.x) / d, ny = (b.y - h.y) / d, vn = b.vx * nx + b.vy * ny;
            b.x = h.x + nx * m; b.y = h.y + ny * m;
            if (vn < 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; if (-vn > 400) { SFX.animal(h.emoji); floatText(h.x, h.y, 100, animalWord(h.emoji), '#fff', 28); b.shot = null; } }
          }
        }
        break;
      }
      case 'ufo': updateUfo(h, dt); if (h.phase === 'gone') dead = true; break;
    }
    if (dead) M.hazards.splice(i, 1);
  }
}
const ANIMAL_R = { '🐘': 54, '🦒': 36, '🦓': 32, '🐪': 42, '🐫': 42 };
function animalWord(e) { return { '🐘': 'PAWOOOO!', '🦒': 'HMPH.', '🦓': 'NEIGH!', '🐪': 'HRRMPH!', '🐫': 'GRRUMPH!' }[e] || 'MOO!'; }
function seekPt(h, tx, ty, spd, dt) {
  const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy);
  if (d > 1) { h.x += dx / d * Math.min(spd * dt, d); h.y += dy / d * Math.min(spd * dt, d); h.flip = dx < 0; }
  return d;
}
function spawnHazard(kind) {
  const b = M.ball;
  if (kind === 'lightning' && Math.random() < 0.35) {
    M.blackout = 4.5; SFX.powerDown(); say(COMMENTARY.hazard.blackout, {}, 2);
    floatText(b.x, b.y, 140, 'NEPA TOOK LIGHT!', '#ffe066', 34, 1.6);
    return;
  }
  if (kind === 'lightning' || kind === 'meteor') {
    const n = randi(1, 3);
    for (let i = 0; i < n; i++) {
      const tgt = Math.random() < 0.5 ? pick(M.outfield) : b;
      M.hazards.push({ type: 'strike', kind, x: clamp(tgt.x + rand(-140, 140), 60, FW - 60), y: clamp(tgt.y + rand(-120, 120), 60, FH - 60), r: kind === 'meteor' ? 130 : 105, T: 1.6 + i * 0.45, T0: 1.6 + i * 0.45 });
    }
    say(COMMENTARY.hazard[kind], {}, 1);
  } else if (kind === 'penguin') {
    const n = randi(2, 5), fromTop = Math.random() < 0.5, x0 = rand(250, FW - 250);
    for (let i = 0; i < n; i++) M.hazards.push({ type: 'penguin', x: x0 + i * rand(40, 70) - n * 25, y: fromTop ? -40 - i * 50 : FH + 40 + i * 50, vx: rand(-40, 40), vy: (fromTop ? 1 : -1) * rand(420, 520) });
    SFX.penguin(); say(COMMENTARY.hazard.penguin, {}, 1);
  } else if (kind === 'animals') {
    if (M.hazards.filter(h => h.type === 'animal').length >= 2) return;
    const fromTop = Math.random() < 0.5;
    const tx = rand(350, FW - 350), ty = rand(220, FH - 220);
    const emoji = pick(M.stadium.animals || ['🐘']);
    M.hazards.push({ type: 'animal', emoji, r: ANIMAL_R[emoji] || 38, x: tx + rand(-200, 200), y: fromTop ? -80 : FH + 80, tx, ty, phase: 'enter', flip: false });
    SFX.animal(emoji); say(COMMENTARY.hazard.animals, {}, 1);
  } else if (kind === 'ufo') {
    if (M.hazards.some(h => h.type === 'ufo')) return;
    const cands = M.outfield.filter(p => isUp(p) && p.state !== 'abducted');
    if (!cands.length) return;
    const victim = Math.random() < 0.5 && b.owner && b.owner.role !== 'keeper' ? b.owner : pick(cands);
    M.hazards.push({ type: 'ufo', x: victim.x, y: -300, z: 260, victim, phase: 'in', pt: 0 });
    SFX.ufo();
  }
}
function updateUfo(h, dt) {
  const v = h.victim, b = M.ball;
  h.pt += dt;
  if (h.phase === 'in') {
    h.x += (v.x - h.x) * Math.min(1, dt * 3); h.y += (v.y - h.y) * Math.min(1, dt * 3);
    if (dist(h.x, h.y, v.x, v.y) < 20 || h.pt > 2.5) {
      if (!isUp(v)) { h.phase = 'leave'; h.pt = 0; return; }
      h.phase = 'beam'; h.pt = 0;
      if (b.owner === v) { b.owner = null; b.vz = 200; b.lockP = v; b.lockT = 0.5; }
      v.state = 'abducted'; v.charging = false; v.vx = v.vy = 0; v.expr = 'panic';
      bubble(v, pick(['TAKE ME TO YOUR LEADER!', 'NOT AGAIN!', 'I WANT MY MUM!']), 2);
      say(COMMENTARY.hazard.ufo, { v: v.name }, 2); SFX.ufo();
      if (v.human) { const hh = v.team.humans.find(x => x.dev === v.human); if (hh) { v.human = null; hh.player = null; } }
    }
  } else if (h.phase === 'beam') {
    v.z = Math.min(230, v.z + dt * 180); v.x += (h.x - v.x) * dt * 4; v.y += (h.y - v.y) * dt * 4; v.anim += dt * 3;
    if (h.pt > 1.4) { h.phase = 'away'; h.pt = 0; }
  } else if (h.phase === 'away') {
    h.y -= dt * 700; v.y = h.y; v.x = h.x; v.z = 230; v.hidden = h.y < -150;
    if (h.pt > 2.2) { h.phase = 'return'; h.pt = 0; h.x = rand(300, FW - 300); h.y = -300; h.ty = rand(200, FH - 200); }
  } else if (h.phase === 'return') {
    h.y += (h.ty - h.y) * Math.min(1, dt * 3); v.x = h.x; v.y = h.y; v.z = 230; v.hidden = false;
    if (Math.abs(h.y - h.ty) < 15) {
      h.phase = 'leave'; h.pt = 0;
      v.state = 'down'; v.stateT = 0.9; v.vz = 0; v.vx = v.vy = 0; v.expr = 'hurt'; v.fx.zap = 0.4;
      bubble(v, pick(['THEY PROBED ME!', 'I SAW THINGS...', 'WHERE AM I?']), 2);
    }
  } else if (h.phase === 'leave') {
    h.y -= dt * 600; if (h.pt > 1.5) h.phase = 'gone';
  }
}

// ---------------------------------------------------------------------------
//  Particles + camera
// ---------------------------------------------------------------------------
function updateParticles(dt) {
  const P = M.parts;
  for (let i = P.length - 1; i >= 0; i--) {
    const q = P[i];
    q.life -= dt;
    if (q.life <= 0) { P.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
    if (q.g) q.vz -= q.g * dt;
    if (q.drag) { const e = Math.exp(-q.drag * dt); q.vx *= e; q.vy *= e; if (q.vz > 0) q.vz *= e; }
    if (q.kind === 'smoke' || q.kind === 'flame') { q.vx *= 0.96; q.vy *= 0.96; }
    if (q.z < 0 && q.kind !== 'ring') { q.z = 0; q.vz *= -0.3; q.vx *= 0.7; q.vy *= 0.7; }
    q.rot += q.vr * dt;
  }
}

function updateCamera(dt) {
  const c = M.cam, b = M.ball;
  const VW = App.W, VH = App.H;
  const base = Math.min(VW / 1180, VH / 760);
  let tx = b.x, ty = b.y, tz = base;
  const hums = M.teams.flatMap(t => t.humans.map(h => h.player).filter(Boolean));
  if (hums.length === 1 && M.phase === 'play') { tx = lerp(b.x, hums[0].x, 0.25); ty = lerp(b.y, hums[0].y, 0.25); }
  if (M.phase === 'cine' && M.cine) { tx = M.cine.p.x; ty = M.cine.p.y; tz = base * 1.55; }
  else if (M.phase === 'goal' && M.phaseT < 2.5) { tz = base * 1.25; }
  else if (b.super) { tz = base * 1.12; }
  else if (M.phase === 'intro') { tx = FW / 2; ty = FH / 2; }
  ty = lerp(FH / 2, ty, 0.6);
  const zk = Math.min(1, dt * 3);
  c.zoom += (tz - c.zoom) * zk;
  const halfW = VW / 2 / c.zoom, halfH = VH / 2 / c.zoom / TILT;
  const k = Math.min(1, dt * (M.phase === 'cine' ? 6 : 4.5));
  c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
  const minX = -GOAL_D - 120 + halfW, maxX = FW + GOAL_D + 120 - halfW;
  c.x = minX > maxX ? FW / 2 : clamp(c.x, minX, maxX);
  const minY = -260 + halfH, maxY = FH + 120 - halfH;
  c.y = minY > maxY ? (FH / 2 - 70) : clamp(c.y, minY, maxY);
}

// ---------------------------------------------------------------------------
//  Crowd generation
// ---------------------------------------------------------------------------
function buildCrowd() {
  const S = M.stadium, cr = [];
  for (let row = 0; row < 8; row++) {
    const y = -40 - row * 30, z = WALL_H + 10 + row * 26;
    for (let x = -GOAL_D - 260; x < FW + GOAL_D + 260; x += 21) cr.push({ x: x + rand(-5, 5) + (row % 2) * 10, y, z, col: pick(S.crowd), skin: pick(SKINS), ph: rand(0, TAU), s: rand(0.85, 1.15), sign: Math.random() < 0.04 });
  }
  for (const side of [-1, 1]) {
    for (let col = 0; col < 5; col++) {
      const x = side < 0 ? -GOAL_D - 70 - col * 32 : FW + GOAL_D + 70 + col * 32, z = 20 + col * 26;
      for (let y = -20; y < FH + 40; y += 24) cr.push({ x, y: y + rand(-4, 4), z, col: pick(S.crowd), skin: pick(SKINS), ph: rand(0, TAU), s: rand(0.85, 1.15), sign: Math.random() < 0.03 });
    }
  }
  cr.sort((a, b) => a.y - b.y);
  M.crowd = cr;
}
