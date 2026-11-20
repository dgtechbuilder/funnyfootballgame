// ============================================================================
//  APP SHELL: canvas, main loop, menus (keyboard / gamepad / mouse / touch),
//  controller setup + remap wizard, pause, results
// ============================================================================

const REMAP_STEPS = [
  ['up', 'PUSH UP', 'stick or D-pad'], ['down', 'PUSH DOWN', 'stick or D-pad'],
  ['left', 'PUSH LEFT', 'stick or D-pad'], ['right', 'PUSH RIGHT', 'stick or D-pad'],
  ['pass', 'PRESS: PASS / SWITCH', 'usually the BOTTOM face button'], ['shoot', 'PRESS: SHOOT', 'usually the RIGHT face button'],
  ['tackle', 'PRESS: TACKLE', 'usually the LEFT face button'], ['item', 'PRESS: USE ITEM', 'usually the TOP face button'],
  ['ability', 'PRESS: SPECIAL POWER', 'usually the LEFT shoulder (LB / L1 / L)'],
  ['start', 'PRESS: PAUSE', 'Start / Menu / Options / +'],
];
const DEFAULT_CFG = { capL: 'dayo', capR: 'ama', stadium: 'lagos', minutes: 3, difficulty: 'normal', items: true, hazards: true, golden: true };

const App = {
  cv: null, c: null, W: 1280, H: 720, dpr: 1, t: 0,
  screen: 'title', paused: false, pauseSel: 0, sel: 0, optSel: 0, resSel: 0,
  sides: { kb1: -1, kb2: 0, pad0: 0, pad1: 0, pad2: 0, pad3: 0, touch: -1 },
  opts: { voice: false, rumble: true },
  cfg: Object.assign({}, DEFAULT_CFG),
  hits: [], toasts: [], remap: null, padHold: {}, padsReturn: 'title', helpReturn: 'title',

  init() {
    this.cv = document.getElementById('game');
    this.c = this.cv.getContext('2d');
    const rs = () => {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.W = window.innerWidth; this.H = window.innerHeight;
      this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr);
    };
    window.addEventListener('resize', rs); rs();
    this.cv.addEventListener('pointerdown', () => { SFX.init(); this.cv.focus(); });
    try {
      const s = JSON.parse(localStorage.getItem('monatecup') || localStorage.getItem('jollofcup') || 'null');
      if (s) { Object.assign(this.cfg, s.cfg || {}); Object.assign(this.opts, s.opts || {}); }
    } catch (e) { /* storage unavailable */ }
    if (!CAPTAINS.some(c => c.id === this.cfg.capL)) this.cfg.capL = DEFAULT_CFG.capL;
    if (!CAPTAINS.some(c => c.id === this.cfg.capR)) this.cfg.capR = DEFAULT_CFG.capR;
    if (!STADIUMS.some(s => s.id === this.cfg.stadium)) this.cfg.stadium = DEFAULT_CFG.stadium;
    Input.rumbleOn = this.opts.rumble !== false;
    Input.onConnect = (d, on) => {
      this.toast(`${on ? PAD_FAMILIES[d.family].icon : '❌'} ${d.name} ${on ? 'connected' : 'disconnected'} (P${Input.order.indexOf(d.id) + 1})`, on ? '#7CFC00' : '#ff8787');
      if (on) { SFX.uiConfirm(); Input.rumble(d.id, 200, 0.4, 0.6); }
    };
    this.startDemo();
    let last = performance.now();
    const frame = now => {
      const dt = clamp((now - last) / 1000, 0, 0.05); last = now;
      Input.update(dt);
      try { this.update(dt); this.render(); } catch (e) { console.error(e); }
      Input.endFrame();
      SFX.tickCrowd(dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },
  // Put a controller on a team automatically, so nobody ends up 'not playing' by accident.
  autoJoin(id, announce = true) {
    const pads = Input.order.filter(k => Input.devices[k].kind === 'pad' && Input.devices[k].connected && k !== id);
    const onL = pads.filter(k => this.sides[k] < 0).length, onR = pads.filter(k => this.sides[k] > 0).length;
    let side = onL <= onR ? -1 : 1;
    // the first controller takes over from an idle keyboard on the left team
    const kbIdle = !Input.devices.kb1.lastActive || Input.devices.kb1.lastActive < Input.time - 8;
    if (!onL && !onR && kbIdle) { if (this.sides.kb1 < 0) this.sides.kb1 = 0; side = -1; }
    this.sides[id] = side;
    if (announce) this.toast(`🎮 P${Input.order.indexOf(id) + 1} joined the ${side < 0 ? 'LEFT' : 'RIGHT'} team`, '#7CFC00');
    return side;
  },
  save() { try { localStorage.setItem('monatecup', JSON.stringify({ cfg: this.cfg, opts: this.opts })); } catch (e) { /* ignore */ } },
  toast(msg, color = '#fff') { this.toasts.push({ msg, color, t: 0 }); if (this.toasts.length > 4) this.toasts.shift(); },

  startDemo() {
    const a = pick(CAPTAINS), b = pick(CAPTAINS.filter(c => c !== a));
    newMatch({ capL: a.id, capR: b.id, stadium: pick(STADIUMS).id, minutes: 99, difficulty: 'hard', items: true, hazards: true, golden: false, demo: true });
    M.phase = 'play'; M.ball.owner = M.teams[0].players[0];
  },
  startMatch() {
    const humansL = [], humansR = [];
    for (const id of Input.order) {
      const d = Input.devices[id];
      if (!d.connected && id !== 'kb1' && id !== 'kb2') continue;
      if (this.sides[id] < 0) humansL.push(id); else if (this.sides[id] > 0) humansR.push(id);
    }
    if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { /* noop */ }
    newMatch(Object.assign({}, this.cfg, { humansL, humansR }));
    this.screen = 'match'; this.paused = false;
    SFX.musicMode = 'match'; SFX.sfx && (SFX.sfx.gain.value = 0.9);
    this.save();
  },
  go(screen) { this.screen = screen; this.sel = 0; SFX.uiConfirm(); },
  back(screen) { this.screen = screen; SFX.uiBack(); },

  // ---------------------------------------------------------------- pointer
  over(x, y, w, h) { return Mouse.x >= x && Mouse.x <= x + w && Mouse.y >= y && Mouse.y <= y + h && (Mouse.active || Mouse.down); },
  hit(x, y, w, h, onClick, onHover, label) { this.hits.push({ x, y, w, h, onClick, onHover, label }); return this.over(x, y, w, h); },
  handlePointer() {
    let top = null;
    for (const h of this.hits) if (Mouse.x >= h.x && Mouse.x <= h.x + h.w && Mouse.y >= h.y && Mouse.y <= h.y + h.h) top = h;
    this.cv.style.cursor = top && Mouse.type === 'mouse' ? 'pointer' : 'default';
    if (!top) return false;
    if (Mouse.moved && top.onHover) top.onHover();
    if (Mouse.clicked && top.onClick) { SFX.init(); top.onClick(); Mouse.clicked = false; return true; }
    return false;
  },

  update(dt) {
    this.t += dt;
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter(t => t.t < 3.2);
    if (Input.global.mute) SFX.setMuted(!SFX.muted);
    if (Input.global.music) SFX.toggleMusic();
    if (this.screen !== 'match') {
      SFX.musicMode = 'menu';
      if (SFX.sfx) SFX.sfx.gain.value = 0.3;
      if (M && M.demo) { updateMatch(dt); if (M.teams[0].score + M.teams[1].score >= 4 || M.done) this.startDemo(); }
    }
    // a controller joins a team the first time someone presses one of its buttons
    // (fake 'gamepads' like virtual drivers never press buttons, so they never join)
    if (this.screen !== 'match' && this.screen !== 'pads') {
      this.joinedOnce = this.joinedOnce || {};
      for (const id of Input.order) {
        const d = Input.devices[id];
        if (d.kind !== 'pad' || !d.connected || this.joinedOnce[d.gpId + id]) continue;
        if (Input.anyPadPressed(id)) { this.joinedOnce[d.gpId + id] = true; if (!this.sides[id]) this.autoJoin(id); }
      }
    }
    if (this.handlePointer()) return; // a click was consumed this frame
    switch (this.screen) {
      case 'title': this.uTitle(dt); break;
      case 'help': if (Input.back() || Input.confirm()) this.back(this.helpReturn); break;
      case 'pads': this.uPads(dt); break;
      case 'join': this.uJoin(dt); break;
      case 'capL': case 'capR': this.uCap(dt); break;
      case 'stadium': this.uStadium(dt); break;
      case 'options': this.uOptions(dt); break;
      case 'match': this.uMatch(dt); break;
      case 'results': this.uResults(dt); break;
    }
  },

  // ------------------------------------------------------------------ title
  titleItems() {
    return [
      ['▶  PLAY', () => { if (Touch.active) this.sides.touch = -1; this.go('join'); }],
      ['🎮  CONTROLLERS', () => { this.padsReturn = 'title'; this.go('pads'); }],
      ['❓  HOW TO PLAY', () => { this.helpReturn = 'title'; this.go('help'); }],
    ];
  },
  uTitle() {
    const items = this.titleItems();
    const ny = Input.navY();
    if (ny) { this.sel = (this.sel + ny + items.length) % items.length; SFX.ui(); }
    if (Input.confirm()) { SFX.init(); items[this.sel][1](); }
  },
  // ------------------------------------------------------------------ join
  joinDevices() { return Input.order.filter(id => id === 'kb1' || id === 'kb2' || Input.devices[id].connected); },
  uJoin() {
    for (const id of this.joinDevices()) {
      const d = Input.devices[id];
      if (d.navX) { this.sides[id] = clamp(this.sides[id] + d.navX, -1, 1); SFX.ui(); }
    }
    if (Input.back()) { this.back('title'); return; }
    const idle = this.joinDevices().find(id => Input.devices[id].kind === 'pad' && this.sides[id] === 0 && Input.devices[id].pass.pressed);
    if (idle) { this.autoJoin(idle); SFX.uiConfirm(); return; }
    if (Input.confirm()) this.go('capL');
  },
  // ------------------------------------------------------------------ captain select
  pickCaptain() { this.go(this.screen === 'capL' ? 'capR' : 'stadium'); },
  uCap() {
    const key = this.screen === 'capL' ? 'capL' : 'capR';
    let idx = CAPTAINS.findIndex(c => c.id === this.cfg[key]);
    const cols = 4;
    const nx = Input.navX(), ny = Input.navY();
    if (nx) { idx = (idx + nx + CAPTAINS.length) % CAPTAINS.length; SFX.ui(); }
    if (ny) { idx = (idx + ny * cols + CAPTAINS.length) % CAPTAINS.length; SFX.ui(); }
    if (Input.randomPressed()) { idx = randi(0, CAPTAINS.length - 1); SFX.boing(); }
    this.cfg[key] = CAPTAINS[idx].id;
    if (Input.back()) { this.back(this.screen === 'capL' ? 'join' : 'capL'); return; }
    if (Input.confirm()) this.pickCaptain();
  },
  uStadium() {
    let idx = STADIUMS.findIndex(s => s.id === this.cfg.stadium);
    const nx = Input.navX() || Input.navY();
    if (nx) { idx = (idx + nx + STADIUMS.length) % STADIUMS.length; SFX.ui(); }
    if (Input.randomPressed()) { idx = randi(0, STADIUMS.length - 1); SFX.boing(); }
    this.cfg.stadium = STADIUMS[idx].id;
    if (Input.back()) { this.back('capR'); return; }
    if (Input.confirm()) this.go('options');
  },
  optionRows() {
    return [
      { label: 'Match Length', vals: [1, 2, 3, 5], key: 'minutes', fmt: v => `${v} MIN` },
      { label: 'CPU Difficulty', vals: ['easy', 'normal', 'hard'], key: 'difficulty', fmt: v => ({ easy: 'GENTLE', normal: 'PEPPER', hard: 'SCOTCH BONNET' })[v] },
      { label: 'Power-Ups', vals: [true, false], key: 'items', fmt: v => v ? 'CHAOS ON' : 'OFF' },
      { label: 'Stadium Hazards', vals: [true, false], key: 'hazards', fmt: v => v ? 'ON' : 'OFF' },
      { label: 'Golden Goal On Draw', vals: [true, false], key: 'golden', fmt: v => v ? 'ON' : 'OFF' },
      { label: 'Commentator Voice', vals: [false, true], key: 'voice', opt: true, fmt: v => v ? 'ON (TTS)' : 'OFF' },
      { label: 'Controller Rumble', vals: [true, false], key: 'rumble', opt: true, fmt: v => v ? 'ON' : 'OFF' },
      { label: 'KICK OFF!', start: true },
    ];
  },
  changeOpt(r, dir) {
    const obj = r.opt ? this.opts : this.cfg;
    const i = r.vals.indexOf(obj[r.key]);
    obj[r.key] = r.vals[(i + dir + r.vals.length) % r.vals.length]; SFX.ui();
    if (r.key === 'rumble') { Input.rumbleOn = obj.rumble; if (obj.rumble) Input.rumbleAll(200, 0.5, 0.5); }
  },
  uOptions() {
    const rows = this.optionRows();
    const ny = Input.navY(), nx = Input.navX();
    if (ny) { this.optSel = (this.optSel + ny + rows.length) % rows.length; SFX.ui(); }
    const r = rows[this.optSel];
    if (nx && !r.start) this.changeOpt(r, nx);
    if (Input.back()) { this.back('stadium'); return; }
    if (Input.confirm()) {
      if (r.start) { SFX.whistle(); this.startMatch(); }
      else this.changeOpt(r, 1);
    }
  },
  // ------------------------------------------------------------------ controllers
  rawPad(id) { return Input.padFor(id); },
  startRemap(id) {
    const gp = this.rawPad(id);
    if (!gp) return;
    this.remap = { pad: id, gpId: gp.id, step: 0, binds: {}, rest: gp.axes.slice(), wait: true };
    Input.capture = { pad: id };
    SFX.uiConfirm();
  },
  endRemap(save) {
    const r = this.remap;
    if (save && r) { PAD_MAPS[r.gpId] = r.binds; savePadMaps(); this.toast('✅ Controller remapped and saved!', '#7CFC00'); Input.rumble(r.pad, 300, 0.6, 0.6); }
    this.remap = null; Input.capture = null; this.padHold = {}; this.padsCool = 0.8;
  },
  uPads(dt) {
    if (this.remap) {
      const r = this.remap, gp = this.rawPad(r.pad);
      if (!gp || Keys.pressed.has('Escape')) { this.endRemap(false); SFX.uiBack(); return; }
      const pressed = gp.buttons.map(b => b.pressed || b.value > 0.6);
      const moved = gp.axes.map((v, i) => Math.abs(v - (r.rest[i] || 0)) > 0.6);
      if (r.wait) { if (!pressed.some(Boolean) && !moved.some(Boolean)) r.wait = false; return; }
      let bind = null;
      const bi = pressed.findIndex(Boolean);
      if (bi >= 0) bind = { b: bi };
      else {
        const ai = moved.findIndex(Boolean);
        if (ai >= 0) { const v = gp.axes[ai], rest = r.rest[ai] || 0; bind = Math.abs(rest) > 1.05 ? { a: ai, hat: v } : { a: ai, s: Math.sign(v - rest) }; }
      }
      if (bind) {
        r.binds[REMAP_STEPS[r.step][0]] = bind; r.step++; r.wait = true; SFX.ui(); Input.rumble(r.pad, 70, 0.3, 0.3);
        if (r.step >= REMAP_STEPS.length) this.endRemap(true);
      }
      return;
    }
    this.padsCool = (this.padsCool || 0) - dt;
    if (this.padsCool > 0) return;
    // hold any button on a pad for 2s to remap it (works even if its buttons are unmapped)
    const pads = Input.slotPads();
    for (let i = 0; i < 4; i++) {
      const gp = pads[i], id = 'pad' + i;
      if (!gp) { this.padHold[id] = 0; continue; }
      const any = gp.buttons.some(b => b.pressed);
      this.padHold[id] = any ? (this.padHold[id] || 0) + dt : 0;
      if (this.padHold[id] > 2) { this.startRemap(id); return; }
    }
    for (let i = 0; i < 4; i++) if (Keys.pressed.has('Digit' + (i + 1)) && pads[i]) { this.startRemap('pad' + i); return; }
    if (Keys.pressed.has('Escape') || Keys.pressed.has('Backspace') || Input.order.some(id => Input.devices[id].kind === 'pad' && Input.devices[id].start.pressed)) this.back(this.padsReturn);
  },
  // ------------------------------------------------------------------ match
  pauseItems() {
    return [
      ['RESUME', () => { this.paused = false; }],
      ['RESTART MATCH', () => this.startMatch()],
      ['CONTROLLERS', () => { this.paused = false; this.screen = 'pads'; this.padsReturn = 'title'; this.startDemo(); }],
      ['QUIT TO MENU', () => { this.paused = false; this.screen = 'title'; this.startDemo(); }],
    ];
  },
  uMatch(dt) {
    if (Input.global.pause) { this.paused = !this.paused; this.pauseSel = 0; SFX.ui(); if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { /* noop */ } }
    if (this.paused) {
      const items = this.pauseItems();
      const ny = Input.navY();
      if (ny) { this.pauseSel = (this.pauseSel + ny + items.length) % items.length; SFX.ui(); }
      if (Input.confirm()) { SFX.uiConfirm(); items[this.pauseSel][1](); }
      return;
    }
    for (const id of Input.order) {
      const d = Input.devices[id];
      if (d.kind !== 'pad' || !d.connected || M.demo) continue;
      if (M.teams.some(t => t.humans.some(h => h.dev === id))) continue;
      if (Input.anyPadPressed(id)) {
        const side = this.autoJoin(id);
        const T = M.teams[side < 0 ? 0 : 1];
        T.humans.push({ dev: id, player: null, cd: 0, color: HUMAN_COLORS[Input.order.indexOf(id)], label: 'P' + (Input.order.indexOf(id) + 1) });
        if (T.ai === DIFF[T.diffKey] && T.diffKey !== 'normal') { T.ai = DIFF.normal; }
      }
    }
    updateMatch(dt);
    if (M.done) { this.screen = 'results'; this.resSel = 0; this.resultsT = 0; this.resultMatch = M; SFX.cheer(1); SFX.vuvuzela(3); }
  },
  resultItems() {
    return [
      ['REMATCH', () => this.startMatch()],
      ['CHANGE TEAMS', () => { this.startDemo(); this.go('capL'); }],
      ['MAIN MENU', () => { this.startDemo(); this.go('title'); }],
    ];
  },
  uResults(dt) {
    this.resultsT += dt;
    const R = this.resultMatch;
    if (R) { R.time += dt; for (const p of R.all) p.anim += dt; }
    const ny = Input.navY() || Input.navX();
    if (ny) { this.resSel = (this.resSel + ny + 3) % 3; SFX.ui(); }
    if (this.resultsT > 0.8 && Input.confirm()) this.resultItems()[this.resSel][1]();
  },

  // ======================================================================
  render() {
    const c = this.c;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.imageSmoothingEnabled = true;
    this.hits = [];
    const W = this.W, H = this.H;
    if (this.screen === 'match') {
      renderMatch(c);
      if (!this.paused && Mouse.active && Mouse.type === 'mouse' && !Touch.active) {
        const u = this.u();
        this.button(c, 10 * u, 78 * u, 110 * u, 36 * u, '❚❚ PAUSE', () => { this.paused = true; this.pauseSel = 0; }, { size: 15 * u });
      }
      if (this.paused) this.rPause(c);
      this.rToasts(c); this.rRotate(c);
      return;
    }
    if (this.screen === 'results') { this.rResults(c); this.rToasts(c); this.rRotate(c); return; }
    // menus: demo match behind, dimmed
    if (M && M.demo) renderMatch(c);
    c.fillStyle = this.screen === 'title' ? 'rgba(6,8,26,0.45)' : 'rgba(6,8,26,0.8)';
    c.fillRect(0, 0, W, H);
    switch (this.screen) {
      case 'title': this.rTitle(c); break;
      case 'help': this.rHelp(c); break;
      case 'pads': this.rPads(c); break;
      case 'join': this.rJoin(c); break;
      case 'capL': case 'capR': this.rCap(c); break;
      case 'stadium': this.rStadium(c); break;
      case 'options': this.rOptions(c); break;
    }
    this.rSoundButtons(c);
    this.rToasts(c);
    this.rRotate(c);
  },
  u() { return Math.min(this.W / 1280, this.H / 720) * (this.W < 700 ? 1.3 : 1); },

  // ---------------------------------------------------------------- widgets
  panel(c, x, y, w, h, col = 'rgba(10,12,34,0.85)', border = 'rgba(255,255,255,0.7)') {
    c.fillStyle = col; rrect(c, x, y, w, h, 14 * this.u()); c.fill();
    c.strokeStyle = border; c.lineWidth = 2; c.stroke();
  },
  button(c, x, y, w, h, label, onClick, o = {}) {
    const hov = this.over(x, y, w, h), on = o.sel || hov;
    this.panel(c, x, y, w, h, on ? (o.selColor || 'rgba(255,224,102,0.3)') : (o.color || 'rgba(10,12,34,0.88)'), on ? '#ffe066' : 'rgba(255,255,255,0.45)');
    const size = o.size || Math.min(h * 0.46, w / (label.length * 0.58));
    text(c, label, x + w / 2, y + h / 2 + 1, size, on ? '#ffe066' : (o.textColor || '#fff'), 'center', '#000', Math.max(2, size * 0.14));
    this.hit(x, y, w, h, onClick, o.hover, label);
    return hov;
  },
  navButtons(c, back, next, nextLabel = 'NEXT  ▶') {
    const u = this.u();
    if (back) this.button(c, 14 * u, 14 * u, 120 * u, 42 * u, '◀  BACK', back, { size: 17 * u });
    if (next) this.button(c, this.W - 194 * u, this.H - 70 * u, 180 * u, 52 * u, nextLabel, next, { size: 22 * u, color: 'rgba(30,140,60,0.92)' });
  },
  rSoundButtons(c) {
    const u = this.u(), W = this.W, H = this.H;
    const y = H - 34 * u, h = 26 * u;
    const showNext = !['title', 'help', 'pads'].includes(this.screen);
    const x0 = showNext ? 14 * u : W - 234 * u;
    this.button(c, x0, y, 108 * u, h, SFX.muted ? '🔇 SOUND' : '🔊 SOUND', () => SFX.setMuted(!SFX.muted), { size: 12 * u });
    this.button(c, x0 + 114 * u, y, 108 * u, h, SFX.musicOn ? '🎵 MUSIC' : '🎵 OFF', () => SFX.toggleMusic(), { size: 12 * u });
  },
  rToasts(c) {
    const u = this.u();
    this.toasts.forEach((t, i) => {
      const a = Math.min(1, t.t * 5, (3.2 - t.t) * 3);
      c.globalAlpha = a;
      const w = Math.min(this.W - 30, 400 * u), x = this.W - w - 14 * u, y = (this.screen === 'match' ? 130 * u + i * 42 * u : this.H - 120 * u - i * 42 * u);
      this.panel(c, x, y, w, 36 * u, 'rgba(8,10,28,0.92)', t.color);
      text(c, t.msg, x + w / 2, y + 18 * u, Math.min(17 * u, w / (t.msg.length * 0.55)), t.color, 'center', '#000', 3);
      c.globalAlpha = 1;
    });
  },
  header(c, str, sub) {
    const W = this.W, u = this.u();
    text(c, str, W / 2, 50 * u, 46 * u, '#ffe066', 'center', '#000', 7 * u);
    if (sub) text(c, sub, W / 2, 92 * u, Math.min(18 * u, (W - 40) / (sub.length * 0.5)), '#fff', 'center', '#000', 3 * u);
  },
  footer(c, str) { text(c, str, this.W / 2, this.H - 92 * this.u(), Math.min(15 * this.u(), (this.W - 40) / (str.length * 0.5)), 'rgba(255,255,255,0.8)', 'center', '#000', 3); },

  logo(c, x, y, size) {
    const str = GAME_NAME;
    c.font = `${Math.round(size)}px ${FONT}`;
    const tw = c.measureText(str).width;
    let lx = x - tw / 2;
    const cols = ['#e8433a', '#fcd116', '#1eb53a', '#ff7a00', '#ffffff', '#fcd116', '#e8433a', '#1eb53a', '#ff7a00', '#fcd116'];
    for (let i = 0; i < str.length; i++) {
      const ch = str[i], w = c.measureText(ch).width;
      const by = Math.sin(this.t * 4 + i * 0.6) * size * 0.06;
      c.save(); c.translate(lx + w / 2, y + by); c.rotate(Math.sin(this.t * 3 + i) * 0.06);
      text(c, ch, 0, 0, size, cols[i % cols.length], 'center', '#1a0a00', size * 0.16);
      c.restore();
      lx += w;
    }
    drawEmoji(c, '🏆', x + tw / 2 + size * 0.45, y - size * 0.1 + Math.sin(this.t * 5) * 6, size * 0.75, false, Math.sin(this.t * 3) * 0.2);
    drawEmoji(c, '⚽', x - tw / 2 - size * 0.45, y - size * 0.1, size * 0.65, false, this.t * 3);
  },

  // ---------------------------------------------------------------- screens
  rTitle(c) {
    const W = this.W, H = this.H, u = this.u();
    this.hit(0, 0, W, H, null); // background (no action, keeps cursor sane)
    this.logo(c, W / 2, H * 0.24, Math.min(140 * u, W / 7.5));
    text(c, GAME_TAGLINE, W / 2, H * 0.24 + 84 * u, Math.min(22 * u, (W - 30) / (GAME_TAGLINE.length * 0.55)), '#ffffff', 'center', '#000', 4 * u);
    // kente strip
    const ks = ['#fcd116', '#1b8a3c', '#e8433a', '#111'];
    for (let i = 0; i < 40; i++) { c.fillStyle = ks[i % 4]; c.fillRect(W / 2 - 300 * u + i * 15 * u, H * 0.24 + 108 * u, 15 * u, 7 * u); }
    text(c, GAME_MEANING, W / 2, H * 0.24 + 132 * u, 15 * u, '#ffe066', 'center', '#000', 3, FONT_UI);
    const items = this.titleItems();
    const bw = Math.min(W - 40, 380 * u), bh = 58 * u;
    items.forEach(([label, fn], i) => {
      const y = H * 0.48 + i * (bh + 14 * u);
      this.button(c, W / 2 - bw / 2, y, bw, bh, label, fn, { sel: this.sel === i, size: (i === 0 ? 30 : 22) * u, color: i === 0 ? 'rgba(30,140,60,0.92)' : undefined, hover: () => { this.sel = i; } });
    });
    const tips = ['Hold SHOOT to charge. Captains: fully charge near goal, release when the ring hits the green circle for a SUPER STRIKE!',
      'Tackle someone who doesn\'t have the ball and their team gets a power-up. Wahala pays... them.',
      'Grab the ? boxes for market chickens, coconut bombs, killer bees and worse.',
      'Plug in Xbox, PlayStation, Switch or almost any USB controller. Up to 4 pads + 2 keyboards.',
      'Press SHOOT while a pass is on its way for a one-touch PERFECT shot.',
      'Watch out in Lagos: NEPA can take light in the middle of the match!'];
    const tip = tips[Math.floor(this.t / 5) % tips.length];
    const tw = Math.min(W - 40, 900 * u);
    this.panel(c, W / 2 - tw / 2, H - 112 * u, tw, 48 * u);
    text(c, '💡 ' + tip, W / 2, H - 88 * u, Math.min(16 * u, (W - 60) / (tip.length * 0.5)), '#fff', 'center', null);
  },

  controlsCard(c, x, y, w) {
    const u = this.u();
    const rows = [['', 'MOVE', 'PASS / SWITCH', 'SHOOT (HOLD)', 'TACKLE / JUKE', 'ITEM', 'POWER'],
      ['Keyboard 1', ...Object.values(KB_LAYOUTS.kb1.help)], ['Keyboard 2', ...Object.values(KB_LAYOUTS.kb2.help)],
      ['Xbox', 'Stick / D-pad', 'A', 'B / RT', 'X / LT', 'Y / RB', 'LB'], ['PlayStation', 'Stick / D-pad', '✕', '○ / R2', '□ / L2', '△ / R1', 'L1'],
      ['Switch / 8BitDo', 'Stick / D-pad', 'B', 'A / ZR', 'Y / ZL', 'X / R', 'L']];
    const h = 22 * u + rows.length * 25 * u;
    this.panel(c, x, y, w, h);
    rows.forEach((r, ri) => r.forEach((s, ci) => {
      const cx = x + w * (0.075 + ci * 0.142);
      text(c, s, cx, y + 20 * u + ri * 25 * u, 13.5 * u, ri === 0 ? '#ffe066' : (ci === 0 ? '#9cf' : '#fff'), 'center', null, 0, ri === 0 ? FONT : FONT_UI);
    }));
    return h;
  },

  rHelp(c) {
    const W = this.W, H = this.H, u = this.u();
    this.header(c, 'HOW TO PLAY', 'Score more than the other team. Everything else is optional. Especially the rules.');
    const w = Math.min(W - 30, 1000 * u);
    const h = this.controlsCard(c, W / 2 - w / 2, 120 * u, w);
    const lines = [
      '⚽  SHOOTING: shots fly at goal automatically. Hold the stick up/down to aim for a corner. Hold SHOOT longer = harder shot.',
      '🌟  SUPER STRIKE: with your CAPTAIN near goal, fully charge. Release when the shrinking ring hits the green circle!',
      '🦵  TACKLE the ball carrier to steal it. Flatten someone WITHOUT the ball = CHEAP SHOT, and their team gets a power-up.',
      '🌀  JUKE: press TACKLE while you have the ball to spin past defenders.',
      '🔥  POWERS: every captain has a silly signature power, every teammate a squad power. Press POWER (Q / LB / L1) when the meter is full.',
      '🧤  Keepers get distracted by phone calls and suya when the ball is far away... and sometimes grow STRETCHY ARMS.',
      '⚡  ONE-TIMER: press SHOOT while a pass is coming to you for a PERFECT volley.',
      '🎁  POWER-UPS: run over ? boxes. 🍌 Plantain Peel  🐔 Market Chicken  🥥 Coconut Bomb  🌶️ Scotch Bonnet',
      '         🍩 Puff-Puff Power  ❄️ Harmattan Freeze  🧪 Tiny Tonic  🐝 Killer Bees',
      '🖱️  MOUSE: click anything in the menus. Double-click a captain or stadium to pick it.',
    ];
    const py = 120 * u + h + 16 * u;
    this.panel(c, W / 2 - w / 2, py, w, 30 * u + lines.length * 27 * u);
    lines.forEach((l, i) => text(c, l, W / 2 - w / 2 + 18 * u, py + 26 * u + i * 27 * u, Math.min(14.5 * u, (w - 30) / (l.length * 0.52)), '#fff', 'left', null, 0, FONT_UI));
    this.navButtons(c, () => this.back(this.helpReturn), null);
  },

  rPads(c) {
    const W = this.W, H = this.H, u = this.u();
    this.header(c, 'CONTROLLERS', 'Plug in a controller and press any button. Xbox, PlayStation, Switch, 8BitDo, Logitech, Steam, phone & retro USB pads all work.');
    const pads = Input.slotPads();
    const cols = W < 900 ? 1 : 2, cw = Math.min((W - 60 * u) / cols - 10 * u, 560 * u), ch = Math.min(170 * u, (H - 280 * u) / (4 / cols));
    for (let i = 0; i < 4; i++) {
      const id = 'pad' + i, d = Input.devices[id], gp = pads[i];
      const x = W / 2 - (cols * (cw + 16 * u) - 16 * u) / 2 + (i % cols) * (cw + 16 * u), y = 120 * u + Math.floor(i / cols) * (ch + 14 * u);
      this.panel(c, x, y, cw, ch, gp ? 'rgba(10,12,34,0.9)' : 'rgba(10,12,34,0.55)', gp ? HUMAN_COLORS[Input.order.indexOf(id)] : 'rgba(255,255,255,0.25)');
      if (!gp) {
        text(c, `P${i + 3}  ·  EMPTY SLOT`, x + cw / 2, y + ch * 0.4, 20 * u, '#888', 'center', null);
        text(c, 'Connect a controller and press any button to wake it up', x + cw / 2, y + ch * 0.62, Math.min(13 * u, cw / 50), '#777', 'center', null, 0, FONT_UI);
        continue;
      }
      const fam = PAD_FAMILIES[d.family];
      text(c, `P${i + 3}  ${fam.icon}  ${fam.name.toUpperCase()}`, x + 16 * u, y + 24 * u, 19 * u, HUMAN_COLORS[Input.order.indexOf(id)], 'left', '#000', 3);
      text(c, gp.id.length > 58 ? gp.id.slice(0, 56) + '…' : gp.id, x + 16 * u, y + 46 * u, 11 * u, '#aaa', 'left', null, 0, FONT_UI);
      const badge = { standard: 'STANDARD MAPPING ✓', auto: 'AUTO-DETECTED PROFILE', custom: 'CUSTOM MAPPING ✓' }[d.mapping] || '';
      text(c, badge, x + 16 * u, y + 66 * u, 12 * u, d.mapping === 'auto' ? '#ffd43b' : '#7CFC00', 'left', null, 0, FONT);
      // live test: stick + diamond of face buttons + start
      const sx = x + cw - 200 * u, sy = y + ch * 0.58, sr = Math.min(28 * u, ch * 0.2);
      circle(c, sx, sy, sr, 'rgba(255,255,255,0.08)', '#888', 1.5);
      circle(c, sx + d.mx * sr * 0.8, sy + d.my * sr * 0.8, sr * 0.38, d.mx || d.my ? '#ffe066' : '#555');
      const fx = x + cw - 80 * u, fy = sy, fr = Math.min(14 * u, ch * 0.09), off = fr * 1.9;
      [['pass', 0, 1], ['shoot', 1, 0], ['tackle', -1, 0], ['item', 0, -1]].forEach(([b, ox, oy]) => {
        const on = d[b].down;
        circle(c, fx + ox * off, fy + oy * off, fr, on ? '#ffe066' : 'rgba(255,255,255,0.12)', '#bbb', 1.5);
        text(c, fam.g[b], fx + ox * off, fy + oy * off + 1, fr * 1.05, on ? '#000' : '#fff', 'center', null);
      });
      text(c, fam.g.start, (sx + fx) / 2, fy - off * 1.25, 10 * u, d.start.down ? '#ffe066' : '#888', 'center', null, 0, FONT);
      text(c, fam.g.ability + ' POWER', (sx + fx) / 2, fy + off * 1.3, 10 * u, d.ability.down ? '#ff922b' : '#888', 'center', null, 0, FONT);
      // raw readout: exactly what the browser reports (useful when a pad isn't recognised)
      const pressedIdx = gp.buttons.map((b, k) => (b.pressed || b.value > 0.5) ? k : -1).filter(k => k >= 0);
      const movedAx = gp.axes.map((v, k) => Math.abs(v) > 0.4 ? `a${k}:${v.toFixed(1)}` : '').filter(Boolean);
      const raw = `RAW · ${gp.buttons.length} buttons, ${gp.axes.length} axes · pressed: ${pressedIdx.join(' ') || '-'} · ${movedAx.join(' ') || 'sticks centred'}`;
      text(c, raw, x + 16 * u, y + 86 * u, Math.min(11 * u, (cw * 0.6) / (raw.length * 0.48)), pressedIdx.length || movedAx.length ? '#ffe066' : '#777', 'left', null, 0, FONT_UI);
      const team = this.sides[id] < 0 ? 'LEFT TEAM' : this.sides[id] > 0 ? 'RIGHT TEAM' : 'NOT PLAYING';
      text(c, team, x + cw - 16 * u, y + 24 * u, 12 * u, this.sides[id] ? '#7CFC00' : '#ff8787', 'right', null, 0, FONT);
      // actions
      const by = y + ch - 44 * u;
      this.button(c, x + 14 * u, by, 120 * u, 32 * u, '🛠 REMAP', () => this.startRemap(id), { size: 14 * u });
      this.button(c, x + 142 * u, by, 120 * u, 32 * u, '📳 RUMBLE', () => Input.rumble(id, 400, 1, 1), { size: 14 * u });
      if (PAD_MAPS[gp.id]) this.button(c, x + 270 * u, by, 110 * u, 32 * u, '↺ RESET', () => { delete PAD_MAPS[gp.id]; savePadMaps(); this.toast('Controller back to default mapping'); }, { size: 14 * u });
      const hold = this.padHold[id] || 0;
      if (hold > 0.2) { c.fillStyle = '#ffe066'; c.fillRect(x, y + ch - 5 * u, cw * Math.min(1, hold / 2), 5 * u); }
    }
    if (!pads.some(Boolean)) {
      const issues = [];
      if (!navigator.getGamepads) issues.push('❌ This browser has no gamepad support. Use Chrome, Edge, Firefox or Safari (latest).');
      if (!window.isSecureContext) issues.push('❌ Controllers need https:// or a local file. Open the game from its https:// address.');
      if (window.top !== window.self) issues.push('⚠️ The game is inside an embedded frame, which can block controllers. Open it in its own tab.');
      issues.push('👉 PRESS A BUTTON on the controller: browsers hide controllers until a button is pressed.');
      issues.push('👉 Xbox / PC pads: plug in by USB or pair via Bluetooth BEFORE pressing a button. If on Windows, close Steam\'s overlay.');
      issues.push('👉 PlayStation pads work best in Chrome or Edge.');
      const bw = Math.min(W - 40, 860 * u), bh = 40 * u + issues.length * 24 * u, bx = W / 2 - bw / 2, by0 = Math.max(120 * u, H / 2 - bh / 2);
      this.panel(c, bx, by0, bw, bh, 'rgba(8,10,28,0.96)', '#ffd43b');
      text(c, 'NO CONTROLLER DETECTED YET', W / 2, by0 + 22 * u, 18 * u, '#ffd43b', 'center', '#000', 3);
      issues.forEach((t, k) => text(c, t, bx + 18 * u, by0 + 50 * u + k * 24 * u, Math.min(14 * u, (bw - 36 * u) / (t.length * 0.5)), t.startsWith('👉') ? '#fff' : '#ff8787', 'left', null, 0, FONT_UI));
    }
    if (Input.extraPads) text(c, `${Input.extraPads} more controller(s) detected — only 4 can play at once.`, W / 2, H - 122 * u, 12 * u, '#ffd43b', 'center', null, 0, FONT_UI);
    text(c, 'Wrong buttons? Click REMAP, press 1-4 on the keyboard, or HOLD ANY BUTTON on the controller for 2 seconds.', W / 2, H - 100 * u, Math.min(14 * u, (W - 40) / 100 * 1.9), '#fff', 'center', '#000', 3);
    text(c, 'Back: Esc / click BACK / press START on a controller', W / 2, H - 78 * u, 12 * u, '#aaa', 'center', null, 0, FONT_UI);
    this.navButtons(c, () => this.back(this.padsReturn), null);
    if (this.remap) this.rRemap(c);
  },
  rRemap(c) {
    const W = this.W, H = this.H, u = this.u(), r = this.remap;
    this.hits = [];
    c.fillStyle = 'rgba(5,6,20,0.88)'; c.fillRect(0, 0, W, H);
    this.hit(0, 0, W, H, null);
    const step = REMAP_STEPS[Math.min(r.step, REMAP_STEPS.length - 1)];
    const d = Input.devices[r.pad];
    text(c, `REMAPPING P${Input.order.indexOf(r.pad) + 1}: ${d.name.toUpperCase()}`, W / 2, H * 0.22, 26 * u, '#9cf', 'center', '#000', 4);
    text(c, step[1], W / 2, H * 0.42, Math.min(64 * u, W / (step[1].length * 0.62)), '#ffe066', 'center', '#000', 8 * u);
    text(c, step[2], W / 2, H * 0.42 + 54 * u, 20 * u, '#fff', 'center', '#000', 3);
    text(c, `STEP ${r.step + 1} / ${REMAP_STEPS.length}`, W / 2, H * 0.62, 18 * u, '#aaa', 'center', null);
    for (let i = 0; i < REMAP_STEPS.length; i++) circle(c, W / 2 + (i - (REMAP_STEPS.length - 1) / 2) * 26 * u, H * 0.67, 7 * u, i < r.step ? '#7CFC00' : i === r.step ? '#ffe066' : '#444');
    const bw = 160 * u;
    this.button(c, W / 2 - bw - 10 * u, H * 0.76, bw, 46 * u, 'SKIP STEP', () => { r.step++; r.wait = true; if (r.step >= REMAP_STEPS.length) this.endRemap(true); }, { size: 18 * u });
    this.button(c, W / 2 + 10 * u, H * 0.76, bw, 46 * u, 'CANCEL', () => this.endRemap(false), { size: 18 * u });
    text(c, 'Esc also cancels', W / 2, H * 0.76 + 70 * u, 13 * u, '#888', 'center', null, 0, FONT_UI);
  },

  rJoin(c) {
    const W = this.W, H = this.H, u = this.u();
    this.header(c, 'WHO\'S PLAYING?', 'Move your controller LEFT or RIGHT (or click the arrows) to pick a team. The middle sits out and the CPU plays.');
    const colW = Math.min(360 * u, W / 3.2), cx = [W / 2 - colW * 1.05, W / 2, W / 2 + colW * 1.05];
    const top = 118 * u, h = Math.max(140 * u, H - top - 330 * u);
    const capL = CAPTAINS.find(x => x.id === this.cfg.capL), capR = CAPTAINS.find(x => x.id === this.cfg.capR);
    const labels = ['LEFT TEAM', 'NOT PLAYING', 'RIGHT TEAM'];
    for (let i = 0; i < 3; i++) {
      this.panel(c, cx[i] - colW / 2, top, colW, h, i === 1 ? 'rgba(20,20,40,0.7)' : (i === 0 ? shade(capL.color, -0.6) : shade(capR.color, -0.6)));
      text(c, labels[i], cx[i], top + 24 * u, 22 * u, i === 1 ? '#aaa' : '#fff', 'center', '#000', 4 * u);
    }
    const devs = this.joinDevices();
    const counts = [0, 0, 0];
    devs.forEach(id => {
      const col = this.sides[id] + 1, d = Input.devices[id];
      const y = top + 50 * u + counts[col]++ * 46 * u;
      const color = HUMAN_COLORS[Input.order.indexOf(id)];
      const bw = colW * 0.72, bx = cx[col] - bw / 2, bh = 38 * u;
      const hov = this.over(bx, y, bw, bh);
      c.fillStyle = color; rrect(c, bx, y, bw, bh, 10 * u); c.fill();
      c.strokeStyle = hov ? '#ffe066' : '#000'; c.lineWidth = 3; c.stroke();
      const icon = d.kind === 'pad' ? PAD_FAMILIES[d.family].icon : d.kind === 'touch' ? '📱' : '⌨️';
      drawEmoji(c, icon, bx + 20 * u, y + bh / 2, 22 * u);
      const nm = `P${Input.order.indexOf(id) + 1} ${d.name.toUpperCase()}`;
      text(c, nm, cx[col] + 10 * u, y + bh / 2 + 1, Math.min(15 * u, (bw - 40 * u) / (nm.length * 0.6)), '#fff', 'center', '#000', 3 * u);
      this.hit(bx, y, bw, bh, () => { this.sides[id] = this.sides[id] >= 1 ? -1 : this.sides[id] + 1; SFX.ui(); });
      if (col > 0) this.button(c, bx - 34 * u, y + 4 * u, 28 * u, 30 * u, '◀', () => { this.sides[id] = Math.max(-1, this.sides[id] - 1); SFX.ui(); }, { size: 14 * u });
      if (col < 2) this.button(c, bx + bw + 6 * u, y + 4 * u, 28 * u, 30 * u, '▶', () => { this.sides[id] = Math.min(1, this.sides[id] + 1); SFX.ui(); }, { size: 14 * u });
    });
    const nL = devs.filter(id => this.sides[id] < 0).length, nR = devs.filter(id => this.sides[id] > 0).length;
    const mode = !nL && !nR ? 'CPU vs CPU: sit back and enjoy the wahala' : (nL && nR ? 'VERSUS! May the best team win.' : (nL + nR > 1 ? 'CO-OP vs CPU!' : 'YOU vs CPU'));
    text(c, mode, W / 2, top + h + 22 * u, 20 * u, '#7CFC00', 'center', '#000', 4 * u);
    const bw2 = 230 * u;
    this.button(c, W / 2 - bw2 - 8 * u, top + h + 42 * u, bw2, 34 * u, '🎮 CONTROLLER SETUP', () => { this.padsReturn = 'join'; this.go('pads'); }, { size: 15 * u });
    this.button(c, W / 2 + 8 * u, top + h + 42 * u, bw2, 34 * u, '❓ HOW TO PLAY', () => { this.helpReturn = 'join'; this.go('help'); }, { size: 15 * u });
    const cw = Math.min(W - 30, 1000 * u);
    this.controlsCard(c, W / 2 - cw / 2, top + h + 90 * u, cw);
    this.navButtons(c, () => this.back('title'), () => this.go('capL'));
  },

  rCap(c) {
    const W = this.W, H = this.H, u = this.u();
    const left = this.screen === 'capL';
    const key = left ? 'capL' : 'capR';
    const cap = CAPTAINS.find(x => x.id === this.cfg[key]);
    const humans = Input.order.filter(id => (id === 'kb1' || id === 'kb2' || Input.devices[id].connected) && this.sides[id] === (left ? -1 : 1));
    this.header(c, left ? 'LEFT TEAM CAPTAIN' : 'RIGHT TEAM CAPTAIN', humans.length ? `Controlled by ${humans.map(h => 'P' + (Input.order.indexOf(h) + 1)).join(' + ')}  ·  click a captain, click again (or NEXT) to pick` : 'CPU team: pick their poison');
    const narrow = W < 900;
    const px = narrow ? W / 2 : W * 0.25, py = narrow ? H * 0.4 : H * 0.6;
    const ps = (narrow ? 3.0 : 4.2) * u;
    ellipse(c, px, py, 70 * ps / 2.2, 18 * ps / 2.2, 'rgba(0,0,0,0.4)');
    const pk = left ? cap.color : (this.cfg.capL === cap.id || colorDist(CAPTAINS.find(x => x.id === this.cfg.capL).color, cap.color) < 110 ? cap.alt : cap.color);
    drawCharacter(c, portraitDesc(cap, 'captain', pk, this.t, { face: left ? 0.35 : Math.PI - 0.35, moving: 0.4, expr: Math.sin(this.t * 1.3) > 0.7 ? 'grit' : 'happy' }), px, py, ps);
    for (let i = 0; i < 2; i++) drawCharacter(c, portraitDesc(cap, 'sidekick', pk, this.t + i, { face: left ? 0.2 : Math.PI - 0.2, expr: 'normal', moving: 0.5 }), px + (i ? 1 : -1) * 70 * ps / 2, py - 6 * u, ps * 0.48);
    if (!narrow) {
      text(c, cap.name.toUpperCase(), px, py + 40 * u, Math.min(30 * u, W * 0.4 / (cap.name.length * 0.62)), '#fff', 'center', '#000', 5 * u);
      text(c, `"${cap.nick}"  ·  ${cap.country.toUpperCase()}`, px, py + 70 * u, 16 * u, '#ffe066', 'center', '#000', 3 * u);
    }
    const gx = narrow ? 20 * u : W * 0.48, gw = narrow ? W - 40 * u : W * 0.49, gy = narrow ? H * 0.47 : 112 * u;
    if (narrow) text(c, `${cap.name.toUpperCase()} (${cap.country.toUpperCase()})`, W / 2, gy + 10 * u, 22 * u, '#fff', 'center', '#000', 4 * u);
    const iy = gy + (narrow ? 26 * u : 0);
    this.panel(c, gx, iy, gw, 190 * u);
    text(c, cap.team.toUpperCase(), gx + 16 * u, iy + 22 * u, 20 * u, cap.color === '#111111' ? '#fff' : (cap.color2 === '#111111' ? cap.color : cap.color2), 'left', '#000', 4 * u);
    wrapText(c, cap.blurb, gx + 16 * u, iy + 48 * u, gw - 32 * u, 14 * u, '#fff');
    const stats = [['SPEED', cap.speed / 1.25], ['POWER', cap.power / 1.3], ['TACKLE', cap.tackle / 1.45], ['SIZE', cap.size / 1.35]];
    stats.forEach(([n, v], i) => {
      const sx = gx + 16 * u + (i % 2) * (gw / 2), sy = iy + 96 * u + Math.floor(i / 2) * 20 * u;
      text(c, n, sx, sy, 13 * u, '#aaa', 'left', null, 0, FONT);
      c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(sx + 64 * u, sy - 5 * u, gw / 2 - 100 * u, 10 * u);
      c.fillStyle = cap.color; c.fillRect(sx + 64 * u, sy - 5 * u, (gw / 2 - 100 * u) * clamp(v, 0.1, 1), 10 * u);
    });
    text(c, `SUPER STRIKE: ${cap.superName}`, gx + 16 * u, iy + 138 * u, 14 * u, '#ff8fd0', 'left', '#000', 3 * u);
    const pw1 = `${cap.signature.icon} POWER: ${cap.signature.name} - ${cap.signature.desc}`, pw2 = `${cap.squad.icon} SQUAD: ${cap.squad.name} - ${cap.squad.desc}`;
    text(c, pw1, gx + 16 * u, iy + 158 * u, Math.min(13 * u, (gw - 30 * u) / (pw1.length * 0.52)), '#ffb066', 'left', null, 0, FONT_UI);
    text(c, pw2, gx + 16 * u, iy + 176 * u, Math.min(13 * u, (gw - 30 * u) / (pw2.length * 0.52)), '#9cf', 'left', null, 0, FONT_UI);
    const cols = 4, cw = (gw - 30 * u) / cols, chh = Math.min(cw * 0.9, (H - iy - 300 * u) / 2);
    const gy2 = iy + 200 * u;
    CAPTAINS.forEach((cp, i) => {
      const x = gx + (i % cols) * (cw + 10 * u), y = gy2 + Math.floor(i / cols) * (chh + 10 * u);
      const sel = cp.id === cap.id, hov = this.over(x, y, cw, chh);
      c.fillStyle = sel ? cp.color : hov ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'; rrect(c, x, y, cw, chh, 12 * u); c.fill();
      c.strokeStyle = sel ? '#ffe066' : hov ? '#fff' : 'rgba(255,255,255,0.3)'; c.lineWidth = sel ? 4 : 2; c.stroke();
      c.save(); c.beginPath(); rrect(c, x, y, cw, chh, 12 * u); c.clip();
      drawCharacter(c, portraitDesc(cp, 'captain', cp.color, this.t + i, { expr: sel || hov ? 'happy' : 'normal', face: 0.4, moving: sel || hov ? 0.6 : 0 }), x + cw / 2, y + chh * 1.02, chh / 86);
      c.restore();
      text(c, cp.short.toUpperCase(), x + cw / 2, y + chh - 12 * u, Math.min(15 * u, cw / (cp.short.length * 0.7)), '#fff', 'center', '#000', 3 * u);
      this.hit(x, y, cw, chh, () => { if (this.cfg[key] === cp.id) this.pickCaptain(); else { this.cfg[key] = cp.id; SFX.ui(); } }, null, 'cap:' + cp.id);
    });
    this.button(c, W - 164 * u, 14 * u, 150 * u, 42 * u, '🎲 RANDOM', () => { this.cfg[key] = pick(CAPTAINS).id; SFX.boing(); }, { size: 15 * u });
    this.footer(c, 'CLICK or ARROWS / STICK to browse  ·  ENTER / A ✕ to pick  ·  ITEM = random  ·  ESC / B ○ = back');
    this.navButtons(c, () => this.back(left ? 'join' : 'capL'), () => this.pickCaptain(), 'PICK  ▶');
  },

  rStadium(c) {
    const W = this.W, H = this.H, u = this.u();
    this.header(c, 'PICK A STADIUM', 'Each venue has its own walls, hazards and questionable safety record. Click to choose.');
    const st = STADIUMS.find(s => s.id === this.cfg.stadium);
    const n = STADIUMS.length;
    const cw = Math.min(190 * u, (W - 40 * u) / n - 12 * u), chh = cw * 1.25;
    const x0 = W / 2 - (n * (cw + 12 * u) - 12 * u) / 2, y0 = 130 * u;
    STADIUMS.forEach((s, i) => {
      const sel = s === st, x = x0 + i * (cw + 12 * u), hov = this.over(x, y0 - 12 * u, cw, chh + 12 * u), y = y0 - (sel || hov ? 12 * u : 0);
      const g = c.createLinearGradient(0, y, 0, y + chh); g.addColorStop(0, s.bg); g.addColorStop(0.45, s.bg2); g.addColorStop(0.46, s.grassA); g.addColorStop(1, s.grassB);
      c.fillStyle = g; rrect(c, x, y, cw, chh, 14 * u); c.fill();
      c.strokeStyle = sel ? '#ffe066' : hov ? '#fff' : 'rgba(255,255,255,0.4)'; c.lineWidth = sel ? 5 : 2; c.stroke();
      const icon = { lightning: '⚡', meteor: '☄️', penguin: '🐧', animals: (s.animals || ['🐘'])[0], ufo: '🛸' }[s.hazard];
      drawEmoji(c, icon, x + cw / 2, y + chh * 0.42 + Math.sin(this.t * 3 + i) * 5 * u, cw * 0.45);
      text(c, s.name.toUpperCase(), x + cw / 2, y + chh - 22 * u, Math.min(16 * u, cw / (s.name.length * 0.58)), '#fff', 'center', '#000', 4 * u);
      this.hit(x, y0 - 12 * u, cw, chh + 12 * u, () => { if (this.cfg.stadium === s.id) this.go('options'); else { this.cfg.stadium = s.id; SFX.ui(); } }, null, 'st:' + s.id);
    });
    const py = y0 + chh + 26 * u, pw = Math.min(W - 40, 800 * u);
    this.panel(c, W / 2 - pw / 2, py, pw, 120 * u);
    text(c, st.name.toUpperCase(), W / 2, py + 26 * u, 28 * u, st.wall, 'center', '#000', 5 * u);
    text(c, st.desc, W / 2, py + 58 * u, Math.min(16 * u, (pw - 30) / (st.desc.length * 0.5)), '#fff', 'center', null, 0, FONT_UI);
    const wallTxt = { zap: 'Electrified walls ZAP anyone tackled into them.', burn: 'Lava-rock walls leave you crispy like suya.', snow: 'Snowbank walls. Ice pitch: players slide everywhere!', hay: 'Thorn-bush walls bounce you right back. OUCH!', sand: 'Sand-dune walls bury you. The sand slows the ball down.' }[st.wallFx];
    const wt = wallTxt + (st.grav < 1 ? ' Low gravity: the ball floats!' : '');
    text(c, wt, W / 2, py + 90 * u, Math.min(14 * u, (pw - 30) / (wt.length * 0.5)), '#9cf', 'center', null, 0, FONT_UI);
    this.button(c, W / 2 - 75 * u, py + 132 * u, 150 * u, 34 * u, '🎲 RANDOM', () => { this.cfg.stadium = pick(STADIUMS).id; SFX.boing(); }, { size: 15 * u });
    this.footer(c, 'CLICK or LEFT / RIGHT to browse  ·  ENTER / A ✕ to pick  ·  ESC / B ○ = back');
    this.navButtons(c, () => this.back('capR'), () => this.go('options'));
  },

  rOptions(c) {
    const W = this.W, H = this.H, u = this.u();
    this.header(c, 'MATCH RULES', 'There are no rules. Except these ones.');
    const rows = this.optionRows();
    const rw = Math.min(W - 40, 640 * u), rh = 42 * u, x = W / 2 - rw / 2, y0 = 112 * u;
    rows.forEach((r, i) => {
      const y = y0 + i * (rh + 8 * u), sel = i === this.optSel;
      if (r.start) {
        const pulse = sel ? 1 + 0.04 * Math.sin(this.t * 8) : 1;
        const by = y + 6 * u, bh = rh + 16 * u;
        const hov = this.over(x, by, rw, bh);
        c.save(); c.translate(W / 2, by + bh / 2); c.scale(pulse, pulse);
        c.fillStyle = sel || hov ? '#51cf66' : '#2b8a3e'; rrect(c, -rw / 2, -bh / 2, rw, bh, 14 * u); c.fill();
        c.strokeStyle = sel || hov ? '#ffe066' : '#000'; c.lineWidth = 4; c.stroke();
        text(c, '⚽  KICK OFF!  ⚽', 0, 0, 30 * u, '#fff', 'center', '#000', 5 * u);
        c.restore();
        this.hit(x, by, rw, bh, () => { SFX.whistle(); this.startMatch(); }, () => { this.optSel = i; });
        return;
      }
      const hov = this.over(x, y, rw, rh);
      this.panel(c, x, y, rw, rh, sel || hov ? 'rgba(255,224,102,0.22)' : 'rgba(10,12,34,0.85)', sel || hov ? '#ffe066' : 'rgba(255,255,255,0.4)');
      text(c, r.label.toUpperCase(), x + 18 * u, y + rh / 2, 17 * u, '#fff', 'left', '#000', 3 * u);
      const obj = r.opt ? this.opts : this.cfg;
      this.hit(x, y, rw - 220 * u, rh, () => { this.optSel = i; this.changeOpt(r, 1); }, () => { this.optSel = i; });
      this.button(c, x + rw - 210 * u, y + 5 * u, 32 * u, rh - 10 * u, '◀', () => { this.optSel = i; this.changeOpt(r, -1); }, { size: 14 * u, hover: () => { this.optSel = i; } });
      text(c, r.fmt(obj[r.key]), x + rw - 112 * u, y + rh / 2, 16 * u, sel ? '#ffe066' : '#9cf', 'center', '#000', 3 * u);
      this.button(c, x + rw - 46 * u, y + 5 * u, 32 * u, rh - 10 * u, '▶', () => { this.optSel = i; this.changeOpt(r, 1); }, { size: 14 * u, hover: () => { this.optSel = i; } });
    });
    const capL = CAPTAINS.find(x => x.id === this.cfg.capL), capR = CAPTAINS.find(x => x.id === this.cfg.capR), st = STADIUMS.find(s => s.id === this.cfg.stadium);
    const vs = `${capL.team}  vs  ${capR.team}  @  ${st.name}`;
    text(c, vs, W / 2, H - 112 * u, Math.min(17 * u, (W - 40) / (vs.length * 0.55)), '#fff', 'center', '#000', 3 * u);
    this.navButtons(c, () => this.back('stadium'), () => { SFX.whistle(); this.startMatch(); }, 'KICK OFF ▶');
  },

  rRotate(c) {
    if (!Touch.active || this.H < this.W * 1.05) return;
    c.fillStyle = 'rgba(6,8,26,0.92)'; c.fillRect(0, 0, this.W, this.H);
    drawEmoji(c, '📱', this.W / 2, this.H * 0.4, 90, false, Math.sin(this.t * 3) * 0.5 + 0.8);
    text(c, 'ROTATE TO LANDSCAPE', this.W / 2, this.H * 0.56, 30, '#ffe066', 'center', '#000', 5);
    text(c, 'The pitch is wider than your phone.', this.W / 2, this.H * 0.56 + 40, 16, '#fff', 'center', null);
  },
  rPause(c) {
    const W = this.W, H = this.H, u = this.u();
    this.hits = [];
    c.fillStyle = 'rgba(5,6,20,0.72)'; c.fillRect(0, 0, W, H);
    this.hit(0, 0, W, H, null);
    text(c, 'PAUSED', W / 2, H * 0.22, 80 * u, '#ffe066', 'center', '#000', 10 * u);
    text(c, 'The players are using this time to buy suya.', W / 2, H * 0.22 + 56 * u, 18 * u, '#fff', 'center', '#000', 3);
    const w = 360 * u, h = 50 * u;
    this.pauseItems().forEach(([s, fn], i) => {
      const y = H * 0.4 + i * (h + 12 * u);
      this.button(c, W / 2 - w / 2, y, w, h, s, () => { SFX.uiConfirm(); fn(); }, { sel: i === this.pauseSel, size: 22 * u, hover: () => { this.pauseSel = i; } });
    });
    text(c, 'N: mute    M: music    ESC / START: resume', W / 2, H - 40 * u, 15 * u, 'rgba(255,255,255,0.7)', 'center', null);
  },

  rResults(c) {
    const R = this.resultMatch, W = this.W, H = this.H, u = this.u();
    const S = R.stadium;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, S.bg); g.addColorStop(1, S.bg2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(6,8,26,0.55)'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {
      const x = (i * 137.5 + this.t * 40 * (1 + i % 3)) % W, y = (i * 91 + this.t * 80 * (1 + i % 4)) % H;
      c.fillStyle = ['#e8433a', '#fcd116', '#1eb53a', '#ff7a00', '#ffffff'][i % 5]; c.save(); c.translate(x, y); c.rotate(this.t * 3 + i); c.fillRect(-5, -2.5, 10, 5); c.restore();
    }
    const [A, B] = R.teams;
    const win = R.winner;
    text(c, win ? `${win.name.toUpperCase()} WIN!` : 'IT\'S A DRAW! EVERYBODY HAD FUN!', W / 2, 56 * u, Math.min(50 * u, W / 18), '#ffe066', 'center', '#000', 8 * u);
    for (const [t, sd] of [[A, -1], [B, 1]]) {
      const x = W / 2 + sd * Math.min(W * 0.3, 330 * u), y = H * 0.5;
      const won = win === t, lost = win && win !== t;
      ellipse(c, x, y, 60 * u, 16 * u, 'rgba(0,0,0,0.4)');
      drawCharacter(c, portraitDesc(t.cap, 'captain', t.kit, this.t, { face: sd < 0 ? 0.3 : Math.PI - 0.3, expr: won ? 'happy' : lost ? 'hurt' : 'normal', armsUp: won, dance: won, lying: lost, lyingDir: sd }), x, y, 3.4 * u);
      text(c, String(t.score), x, y + 64 * u, 64 * u, '#fff', 'center', '#000', 8 * u);
      text(c, t.cap.short.toUpperCase(), x, y + 110 * u, 22 * u, '#fff', 'center', '#000', 4 * u);
      if (won) drawEmoji(c, '🏆', x, y - 250 * u + Math.sin(this.t * 4) * 8 * u, 70 * u);
    }
    const all = R.all;
    const top = (f) => all.reduce((b, p) => (f(p) > f(b) ? p : b), all[0]);
    const awards = [
      ['👟 GOLDEN BOOT', top(p => p.stats.goals), p => `${p.stats.goals} goal${p.stats.goals === 1 ? '' : 's'}`],
      ['🦵 MOST VIOLENT', top(p => p.stats.tackles), p => `${p.stats.tackles} tackles`],
      ['🤕 CRASH TEST DUMMY', top(p => p.stats.knocked), p => `flattened ${p.stats.knocked}x`],
      ['🧤 STICKY GLOVES', top(p => p.stats.saves), p => `${p.stats.saves} saves`],
      ['😈 WAHALA MERCHANT', top(p => p.stats.cheap), p => `${p.stats.cheap} cheap shots`],
      ['🎁 ITEM HOARDER', top(p => p.stats.items), p => `${p.stats.items} items used`],
      ['🔥 SHOW-OFF', top(p => p.stats.powers), p => `${p.stats.powers} powers used`],
    ].filter(a => { const v = a[2](a[1]); return !/^0 |^flattened 0x/.test(v); });
    const aw = Math.min(W - 40, 440 * u), ax = W / 2 - aw / 2, ay = 110 * u;
    if (awards.length) {
      this.panel(c, ax, ay, aw, 30 * u + awards.length * 30 * u);
      awards.forEach(([t, p, f], i) => {
        text(c, t, ax + 14 * u, ay + 26 * u + i * 30 * u, 16 * u, '#ffe066', 'left', '#000', 3);
        text(c, `${p.name} (${f(p)})`, ax + aw - 14 * u, ay + 26 * u + i * 30 * u, 14 * u, '#fff', 'right', null, 0, FONT_UI);
      });
    }
    this.resultItems().forEach(([s, fn], i) => {
      const bw = Math.min(220 * u, (W - 60) / 3), x = W / 2 + (i - 1) * (bw + 16 * u) - bw / 2, y = H - 94 * u;
      this.button(c, x, y, bw, 48 * u, s, () => { if (this.resultsT > 0.5) fn(); }, { sel: i === this.resSel, size: 19 * u, selColor: 'rgba(81,207,102,0.5)', hover: () => { this.resSel = i; } });
    });
  },
};

function wrapText(c, str, x, y, maxW, size, color) {
  c.font = `700 ${Math.round(size)}px ${FONT_UI}`; c.fillStyle = color; c.textAlign = 'left'; c.textBaseline = 'middle';
  const words = str.split(' '); let line = '', ly = y;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (c.measureText(t).width > maxW && line) { c.fillText(line, x, ly); line = w; ly += size * 1.3; }
    else line = t;
  }
  if (line) c.fillText(line, x, ly);
}

// Boot once fonts are ready (fall back quickly if offline)
(function boot() {
  let started = false;
  const go = () => { if (!started) { started = true; App.init(); } };
  if (document.fonts && document.fonts.load) {
    Promise.race([
      Promise.all([document.fonts.load('40px "Luckiest Guy"'), document.fonts.load('900 20px "Nunito"')]),
      new Promise(r => setTimeout(r, 1500)),
    ]).then(go, go);
  } else go();
})();
