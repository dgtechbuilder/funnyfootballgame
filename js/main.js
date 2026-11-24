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
  ['dodge', 'PRESS: DODGE', 'usually the RIGHT shoulder (RB / R1 / R)'],
  ['start', 'PRESS: PAUSE', 'Start / Menu / Options / +'],
];
const DEFAULT_CFG = { capL: 'dayo', capR: 'ama', stadium: 'lagos', minutes: 3, difficulty: 'easy', items: true, hazards: true, golden: true, gearL: 'none', gearR: 'none' };

const App = {
  cv: null, c: null, W: 1280, H: 720, dpr: 1, t: 0,
  screen: 'title', paused: false, pv: 'menu', ctl: { dev: 'kb1', sel: 0, cap: null }, pauseSel: 0, sel: 0, optSel: 0, resSel: 0,
  sides: { kb1: -1, kb2: 0, pad0: 0, pad1: 0, pad2: 0, pad3: 0, touch: -1 },
  opts: { voice: false, rumble: true, pvoice: 'synth' },
  cfg: Object.assign({}, DEFAULT_CFG),
  hits: [], toasts: [], remap: null, padHold: {}, padsReturn: 'title', helpReturn: 'title',

  init() {
    this.cv = document.getElementById('game');
    this.c = this.cv.getContext('2d');
    // Size to the VISIBLE viewport. On phones, 100vh / innerHeight can include the strip hidden behind the
    // browser toolbar, which pushed the bottom buttons off-screen and made taps land in the wrong place.
    const rs = () => {
      const vv = window.visualViewport;
      const w = Math.round(vv ? vv.width : window.innerWidth), h = Math.round(vv ? vv.height : window.innerHeight);
      this.dpr = Perf.ratio(); // below 1 on the slowest devices: fewer pixels to fill, the browser scales it up
      this.W = Math.max(320, Math.min(w, window.innerWidth || w)); this.H = Math.max(200, Math.min(h, window.innerHeight || h));
      this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
      this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr);
      window.scrollTo(0, 0);
    };
    window.addEventListener('resize', rs);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', rs);
    window.addEventListener('orientationchange', () => { rs(); setTimeout(rs, 250); setTimeout(rs, 700); }); // iOS reports stale sizes at first
    rs();
    this.cv.addEventListener('pointerdown', () => { SFX.init(); this.cv.focus(); });
    try {
      const s = JSON.parse(localStorage.getItem('monatecup') || localStorage.getItem('jollofcup') || 'null');
      if (s) { Object.assign(this.cfg, s.cfg || {}); Object.assign(this.opts, s.opts || {}); }
    } catch (e) { /* storage unavailable */ }
    if (!CAPTAINS.some(c => c.id === this.cfg.capL)) this.cfg.capL = DEFAULT_CFG.capL;
    if (!CAPTAINS.some(c => c.id === this.cfg.capR)) this.cfg.capR = DEFAULT_CFG.capR;
    if (!STADIUMS.some(s => s.id === this.cfg.stadium)) this.cfg.stadium = DEFAULT_CFG.stadium;
    for (const k of ['gearL', 'gearR']) if (!GEAR[this.cfg[k]]) this.cfg[k] = 'none';
    Perf.init(this.opts.gfx);
    Perf.onChange = () => rs();
    rs();
    Input.rumbleOn = this.opts.rumble !== false;
    VOX.mode = this.opts.pvoice || 'synth';
    Input.onConnect = (d, on) => {
      this.toast(`${on ? PAD_FAMILIES[d.family].icon : '❌'} ${d.name} ${on ? 'connected' : 'disconnected'} (P${Input.order.indexOf(d.id) + 1})`, on ? '#7CFC00' : '#ff8787');
      if (on) { SFX.uiConfirm(); Input.rumble(d.id, 200, 0.4, 0.6); }
    };
    this.startDemo();
    let last = performance.now();
    // Fixed-size simulation steps: on a slow device that only manages 12-20 frames a second the game
    // still runs at real speed (two or three steps per drawn frame) instead of in slow motion, and the
    // physics never sees a step bigger than it was tuned for. Very long gaps (tab switch) are dropped.
    const STEP = 0.05, MAX_FRAME = 0.15;
    const frame = now => {
      const raw = Math.max(0, (now - last) / 1000); last = now;
      Perf.frame(raw);
      const total = raw > 0.5 ? STEP : Math.min(raw, MAX_FRAME);
      const n = Math.max(1, Math.ceil(total / STEP - 1e-6)), dt = total / n;
      Input.update(total);
      try {
        for (let i = 0; i < n; i++) {
          if (i) Input.clearEdges(); // a button press counts once, not once per step
          this.update(dt);
        }
        this.render();
      } catch (e) { console.error(e); }
      Input.endFrame();
      SFX.tickCrowd(total);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    if (window.Boot) Boot.ready();
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
    if (this.form) { this.cv.style.cursor = 'default'; Mouse.clicked = false; return true; }
    let top = null;
    for (const h of this.hits) if (Mouse.x >= h.x && Mouse.x <= h.x + h.w && Mouse.y >= h.y && Mouse.y <= h.y + h.h) top = h;
    if ((!top || !top.onClick) && Mouse.type !== 'mouse' && Mouse.clicked) { // fingers are fat: accept a near miss
      let best = 14;
      for (const h of this.hits) {
        if (!h.onClick || h.w * h.h > this.W * this.H * 0.5) continue;
        const dx = Math.max(h.x - Mouse.x, 0, Mouse.x - h.x - h.w), dy = Math.max(h.y - Mouse.y, 0, Mouse.y - h.y - h.h), d = Math.hypot(dx, dy);
        if (d < best) { best = d; top = h; }
      }
    }
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
      case 'chars': this.uChars(dt); break;
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
      ['▶  PLAY', () => {
        if (Touch.active) {
          this.sides.touch = -1;
          for (const k of ['kb1', 'kb2']) if (!Input.devices[k].lastActive) this.sides[k] = 0; // no keyboard on a phone: don't count it as a player
        }
        this.go('join');
      }],
      ['👥  CHARACTERS', () => this.openChars()],
      ['🎮  CONTROLLERS', () => { this.padsReturn = 'title'; this.go('pads'); }],
      ['❓  HOW TO PLAY', () => { this.helpReturn = 'title'; this.go('help'); }],
    ];
  },
  uTitle() {
    const items = this.titleItems();
    const ny = Input.navY() || (this.compact() ? Input.navX() : 0);
    if (ny) { this.sel = (this.sel + ny + items.length) % items.length; SFX.ui(); }
    if (Input.confirm()) { SFX.init(); items[this.sel][1](); }
  },
  // ------------------------------------------------------------------ join
  joinDevices() {
    return Input.order.filter(id => {
      const d = Input.devices[id];
      if (id === 'kb1' || id === 'kb2') return !Touch.active || d.lastActive > 0 || this.sides[id] !== 0; // phones: hide keyboards nobody has touched
      return d.connected;
    });
  },
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
      { label: 'CPU Difficulty', vals: DIFF_KEYS, key: 'difficulty', fmt: v => DIFF_NAMES[v] || v, hint: v => DIFF_HINTS[v] || '' },
      { label: 'Power-Ups', vals: [true, false], key: 'items', fmt: v => v ? 'CHAOS ON' : 'OFF' },
      { label: 'Stadium Hazards', vals: [true, false], key: 'hazards', fmt: v => v ? 'ON' : 'OFF' },
      { label: 'Golden Goal On Draw', vals: [true, false], key: 'golden', fmt: v => v ? 'ON' : 'OFF' },
      { label: 'Commentator Voice', vals: [false, true], key: 'voice', opt: true, fmt: v => v ? 'ON (TTS)' : 'OFF', hint: v => v && VOX.ttsName() ? VOX.ttsName() : '' },
      { label: 'Player Voices', vals: ['synth', 'accent', 'off'], key: 'pvoice', opt: true, fmt: v => ({ synth: 'ON', accent: 'ACCENT (TTS)', off: 'OFF' })[v], hint: v => v === 'accent' ? (VOX.ttsName() || 'no African TTS voice here: synth') : '' },
      { label: 'Controller Rumble', vals: [true, false], key: 'rumble', opt: true, fmt: v => v ? 'ON' : 'OFF' },
      ...(MECH.gear.enabled ? [
        { label: 'Left Team Gear', vals: GEAR_KEYS, key: 'gearL', fmt: v => GEAR[v].name.toUpperCase(), hint: v => gearLabel(v) },
        { label: 'Right Team Gear', vals: GEAR_KEYS, key: 'gearR', fmt: v => GEAR[v].name.toUpperCase(), hint: v => gearLabel(v) },
      ] : []),
      { label: 'KICK OFF!', start: true },
    ];
  },
  changeOpt(r, dir) {
    const obj = r.opt ? this.opts : this.cfg;
    const i = r.vals.indexOf(obj[r.key]);
    obj[r.key] = r.vals[(i + dir + r.vals.length) % r.vals.length]; SFX.ui();
    if (r.key === 'pvoice') { VOX.mode = obj.pvoice; SFX.init(); if (obj.pvoice !== 'off') VOX.say({ name: 'Sipho', team: { side: 0 }, role: 'captain' }, obj.pvoice === 'accent' ? 'Eish! Sharp sharp!' : 'AYEEE!', 'goal', 0, true); }
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
      ['🎮  CONTROLS', () => this.openControls()],
      ['❓  HOW TO PLAY', () => this.openHowTo()],
      ['RESTART MATCH', () => this.startMatch()],
      ['QUIT TO MENU', () => { this.paused = false; this.screen = 'title'; this.startDemo(); }],
    ];
  },
  uMatch(dt) {
    if (this.paused && this.pv !== 'menu') { this.uPauseView(dt); return; }
    if (Input.global.pause) { this.paused = !this.paused; this.pauseSel = 0; this.pv = 'menu'; SFX.ui(); if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { /* noop */ } return; } // START also counts as confirm: don't let it pick RESUME in the same frame
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
  // ------------------------------------------------------------------ pause: controls + how to play
  ctlDevices() {
    const mine = M ? M.teams.flatMap(t => t.humans.map(h => h.dev)) : [];
    const all = Input.order.filter(id => (id === 'kb1' || id === 'kb2') ? (!Touch.active || Input.devices[id].lastActive > 0) : Input.devices[id].connected);
    return [...new Set([...mine, ...all])];
  },
  myDevice() {
    const mine = M ? M.teams.flatMap(t => t.humans.map(h => h.dev)) : [];
    const list = mine.length ? mine : this.ctlDevices();
    return list.slice().sort((a, b) => Input.devices[b].lastActive - Input.devices[a].lastActive)[0] || 'kb1';
  },
  ctlActions(id) { return id.startsWith('pad') ? PAD_ACTIONS : id === 'touch' ? ['pass', 'shoot', 'tackle', 'item', 'ability', 'dodge'] : KB_ACTIONS; },
  openControls() { this.pv = 'controls'; this.ctl = { dev: this.myDevice(), sel: 0, cap: null }; },
  openHowTo() { this.pv = 'howto'; this.howDev = this.myDevice(); },
  startCapture(id, action) {
    if (id === 'touch') { this.toast('Touch buttons can\'t be remapped', '#ffb066'); return; }
    if (id.startsWith('pad')) { const gp = Input.padFor(id); if (!gp) return; this.ctl.cap = { dev: id, action, rest: gp.axes.slice(), wait: true }; Input.capture = { pad: id }; }
    else { this.ctl.cap = { dev: id, action, wait: true }; Input.capture = { kb: true }; }
    SFX.uiConfirm();
  },
  endCapture() { this.ctl.cap = null; Input.capture = null; this.ctlCool = 0.25; },
  uPauseView(dt) {
    const C = this.ctl;
    if (this.pv === 'howto') {
      const nx = Input.navX();
      if (nx) { const ds = this.ctlDevices(); this.howDev = ds[(ds.indexOf(this.howDev) + nx + ds.length) % ds.length]; SFX.ui(); }
      if (Input.global.pause || Input.back() || Input.confirm()) { this.pv = 'menu'; SFX.uiBack(); }
      return;
    }
    // controls
    if (C.cap) {
      const cap = C.cap;
      if (Keys.pressed.has('Escape')) { this.endCapture(); SFX.uiBack(); return; }
      if (cap.dev.startsWith('kb')) {
        if (cap.wait) { if (!Keys.down.size || [...Keys.down].every(k => k === 'Enter' || k === 'NumpadEnter')) cap.wait = false; else return; }
        const code = [...Keys.pressed][0];
        if (!code) return;
        if (RESERVED_KEYS.has(code)) { this.toast(`${keyLabel(code)} is reserved for menus`, '#ffb066'); return; }
        setKey(cap.dev, cap.action, code); this.endCapture(); SFX.uiConfirm();
        this.toast(`${ACTION_NAMES[cap.action]}: ${keyLabel(code)}`, '#7CFC00');
        return;
      }
      const gp = Input.padFor(cap.dev);
      if (!gp) { this.endCapture(); return; }
      const pressed = gp.buttons.map(b => b.pressed || b.value > 0.6);
      const moved = gp.axes.map((v, i) => Math.abs(v - (cap.rest[i] || 0)) > 0.6);
      if (cap.wait) { if (!pressed.some(Boolean) && !moved.some(Boolean)) cap.wait = false; return; }
      let bind = null;
      const bi = pressed.findIndex(Boolean);
      if (bi >= 0) bind = { b: bi };
      else { const ai = moved.findIndex(Boolean); if (ai >= 0) { const v = gp.axes[ai], rest = cap.rest[ai] || 0; bind = Math.abs(rest) > 1.05 ? { a: ai, hat: v } : { a: ai, s: Math.sign(v - rest) }; } }
      if (bind) {
        const d = Input.devices[cap.dev];
        setPadBind(gp, d.family, cap.action, bind); this.endCapture(); SFX.uiConfirm(); Input.rumble(cap.dev, 90, 0.4, 0.4);
        this.toast(`${ACTION_NAMES[cap.action]}: ${describeBind(bind, gp, d.family)}`, '#7CFC00');
      }
      return;
    }
    this.ctlCool = (this.ctlCool || 0) - dt;
    if (this.ctlCool > 0) return;
    const devs = this.ctlDevices();
    if (!devs.includes(C.dev)) C.dev = devs[0];
    const acts = this.ctlActions(C.dev), n = acts.length + 2; // + RESET, BACK
    const ny = Input.navY(), nx = Input.navX();
    if (ny) { C.sel = (C.sel + ny + n) % n; SFX.ui(); }
    if (nx) { C.dev = devs[(devs.indexOf(C.dev) + nx + devs.length) % devs.length]; C.sel = Math.min(C.sel, this.ctlActions(C.dev).length + 1); SFX.ui(); }
    if (Input.global.pause || Input.back()) { this.pv = 'menu'; SFX.uiBack(); return; }
    if (Input.confirm()) this.ctlActivate(C.sel);
  },
  ctlActivate(i) {
    const C = this.ctl, acts = this.ctlActions(C.dev);
    if (i < acts.length) this.startCapture(C.dev, acts[i]);
    else if (i === acts.length) this.ctlReset();
    else { this.pv = 'menu'; SFX.uiBack(); }
  },
  ctlReset() {
    const id = this.ctl.dev;
    if (id.startsWith('kb')) resetKeys(id);
    else if (id.startsWith('pad')) { const gp = Input.padFor(id); if (gp) resetPad(gp); }
    this.toast('Controls reset to default', '#7CFC00'); SFX.uiConfirm();
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
        this.button(c, 10 * u, 78 * u, 110 * u, 36 * u, '❚❚ PAUSE', () => { this.paused = true; this.pauseSel = 0; this.pv = 'menu'; }, { size: 15 * u });
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
      case 'chars': this.rChars(c); break;
      case 'join': this.rJoin(c); break;
      case 'capL': case 'capR': this.rCap(c); break;
      case 'stadium': this.rStadium(c); break;
      case 'options': this.rOptions(c); break;
    }
    this.rSoundButtons(c);
    this.rToasts(c);
    this.rRotate(c);
  },
  // Short screens (phones in landscape) get a compact layout: a 960x440 design space, so text and
  // buttons come out much bigger than squeezing the 1280x720 desktop layout onto a 350px-tall screen.
  compact() { return this.H < 560; },
  u() {
    if (this.compact()) return Math.min(this.W / 960, this.H / 440);
    return Math.min(this.W / 1280, this.H / 720) * (this.W < 700 ? 1.3 : 1);
  },

  // ---------------------------------------------------------------- widgets
  panel(c, x, y, w, h, col = 'rgba(10,12,34,0.85)', border = 'rgba(255,255,255,0.7)') {
    c.fillStyle = col; rrect(c, x, y, w, h, 14 * this.u()); c.fill();
    c.strokeStyle = border; c.lineWidth = 2; c.stroke();
  },
  button(c, x, y, w, h, label, onClick, o = {}) {
    const hov = this.over(x, y, w, h), on = o.sel || hov;
    this.panel(c, x, y, w, h, on ? (o.selColor || (o.color && o.color.startsWith('rgba(30,140,60') ? 'rgba(46,170,80,0.97)' : 'rgba(78,66,14,0.95)')) : (o.color || 'rgba(10,12,34,0.9)'), on ? '#ffe066' : 'rgba(255,255,255,0.45)');
    const size = o.size || Math.min(h * 0.46, w / (label.length * 0.58));
    text(c, label, x + w / 2, y + h / 2 + 1, size, on ? '#ffe066' : (o.textColor || '#fff'), 'center', '#000', Math.max(2, size * 0.14));
    this.hit(x, y, w, h, onClick, o.hover, label);
    return hov;
  },
  navButtons(c, back, next, nextLabel = 'NEXT  ▶') {
    const u = this.u();
    if (this.compact()) {
      if (back) this.button(c, 8 * u, 8 * u, 104 * u, 38 * u, '◀  BACK', back, { size: 16 * u });
      if (next) this.button(c, this.W - 168 * u, this.H - 54 * u, 160 * u, 46 * u, nextLabel, next, { size: 20 * u, color: 'rgba(30,140,60,0.92)' });
      return;
    }
    if (back) this.button(c, 14 * u, 14 * u, 120 * u, 42 * u, '◀  BACK', back, { size: 17 * u });
    if (next) this.button(c, this.W - 194 * u, this.H - 70 * u, 180 * u, 52 * u, nextLabel, next, { size: 22 * u, color: 'rgba(30,140,60,0.92)' });
  },
  // small icon toggles for sound + music (x, y = top-left of the pair)
  soundPair(c, x, y, s = 1) {
    const u = this.u() * s, bw = 50 * u, bh = 36 * u;
    this.button(c, x, y, bw, bh, SFX.muted ? '🔇' : '🔊', () => SFX.setMuted(!SFX.muted), { size: 18 * u });
    this.button(c, x + bw + 6 * u, y, bw, bh, '🎵', () => SFX.toggleMusic(), { size: 18 * u, textColor: SFX.musicOn ? '#fff' : '#666', color: SFX.musicOn ? undefined : 'rgba(40,10,10,0.88)' });
    if (!SFX.musicOn) { c.strokeStyle = '#ff6b6b'; c.lineWidth = 3 * u; c.beginPath(); c.moveTo(x + bw + 18 * u, y + 8 * u); c.lineTo(x + 2 * bw - 6 * u, y + bh - 8 * u); c.stroke(); }
    return 2 * bw + 6 * u;
  },
  // graphics quality: AUTO (follows the frame rate) -> HIGH -> LOW -> AUTO
  cycleGfx() {
    const next = { auto: 'high', high: 'low', low: 'auto' }[Perf.mode] || 'auto';
    Perf.setMode(next); this.opts.gfx = next; this.save(); SFX.ui();
    this.toast(next === 'low' ? '🖥 Graphics LOW: smoother on slow devices' : next === 'high' ? '🖥 Graphics HIGH: full detail' : '🖥 Graphics AUTO: adjusts to your device', '#9cf');
  },
  gfxButton(c, x, y, w, h, size) {
    const lab = '🖥 ' + (Perf.mode === 'auto' ? 'AUTO' : Perf.q.name);
    this.button(c, x, y, w, h, lab, () => this.cycleGfx(), { size: Math.min(size, w / (lab.length * 0.62)) });
  },
  rSoundButtons(c) {
    const u = this.u(), W = this.W, H = this.H;
    if (this.compact()) {
      // top-right when it's free, otherwise bottom-left; never on top of a NEXT / PICK button
      if (['capL', 'capR', 'chars'].includes(this.screen)) return;
      this.soundPair(c, W - 114 * u, 8 * u);
      if (this.screen === 'title') this.gfxButton(c, W - 210 * u, 8 * u, 90 * u, 36 * u, 13 * u);
      return;
    }
    const y = H - 34 * u, h = 26 * u;
    const showNext = !['title', 'help', 'pads', 'chars'].includes(this.screen);
    const x0 = showNext ? 14 * u : W - 234 * u;
    if (this.screen === 'title') this.gfxButton(c, x0 - 124 * u, y, 118 * u, h, 12 * u);
    this.button(c, x0, y, 108 * u, h, SFX.muted ? '🔇 SOUND' : '🔊 SOUND', () => SFX.setMuted(!SFX.muted), { size: 12 * u });
    this.button(c, x0 + 114 * u, y, 108 * u, h, SFX.musicOn ? '🎵 MUSIC' : '🎵 OFF', () => SFX.toggleMusic(), { size: 12 * u });
  },
  rToasts(c) {
    const u = this.u();
    this.toasts.forEach((t, i) => {
      const a = Math.min(1, t.t * 5, (3.2 - t.t) * 3);
      c.globalAlpha = a;
      const w = Math.min(this.W - 30, 400 * u), x = this.W - w - 14 * u, y = (this.screen === 'match' && !this.paused ? 130 * u + i * 42 * u : this.H - 120 * u - i * 42 * u);
      this.panel(c, x, y, w, 36 * u, 'rgba(8,10,28,0.92)', t.color);
      text(c, t.msg, x + w / 2, y + 18 * u, Math.min(17 * u, w / (t.msg.length * 0.55)), t.color, 'center', '#000', 3);
      c.globalAlpha = 1;
    });
  },
  header(c, str, sub) {
    const W = this.W, u = this.u();
    if (this.compact()) {
      text(c, str, W / 2, 27 * u, Math.min(34 * u, (W - 260 * u) / (str.length * 0.55)), '#ffe066', 'center', '#000', 5 * u);
      if (sub) text(c, sub, W / 2, 56 * u, Math.min(13 * u, (W - 30) / (sub.length * 0.5)), '#fff', 'center', '#000', 2.5 * u);
      return;
    }
    text(c, str, W / 2, 50 * u, 46 * u, '#ffe066', 'center', '#000', 7 * u);
    if (sub) text(c, sub, W / 2, 92 * u, Math.min(18 * u, (W - 40) / (sub.length * 0.5)), '#fff', 'center', '#000', 3 * u);
  },
  footer(c, str) { if (this.compact()) return; text(c, str, this.W / 2, this.H - 92 * this.u(), Math.min(15 * this.u(), (this.W - 40) / (str.length * 0.5)), 'rgba(255,255,255,0.8)', 'center', '#000', 3); },

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
    if (this.compact()) { this.rTitleCompact(c); return; }
    this.logo(c, W / 2, H * 0.24, Math.min(140 * u, W / 7.5));
    text(c, GAME_TAGLINE, W / 2, H * 0.24 + 84 * u, Math.min(22 * u, (W - 30) / (GAME_TAGLINE.length * 0.55)), '#ffffff', 'center', '#000', 4 * u);
    // kente strip
    const ks = ['#fcd116', '#1b8a3c', '#e8433a', '#111'];
    for (let i = 0; i < 40; i++) { c.fillStyle = ks[i % 4]; c.fillRect(W / 2 - 300 * u + i * 15 * u, H * 0.24 + 108 * u, 15 * u, 7 * u); }
    text(c, GAME_MEANING, W / 2, H * 0.24 + 132 * u, 15 * u, '#ffe066', 'center', '#000', 3, FONT_UI);
    const items = this.titleItems();
    const bw = Math.min(W - 40, 380 * u), bh = 52 * u;
    items.forEach(([label, fn], i) => {
      const y = H * 0.47 + i * (bh + 10 * u);
      this.button(c, W / 2 - bw / 2, y, bw, bh, label, fn, { sel: this.sel === i, size: (i === 0 ? 30 : 22) * u, color: i === 0 ? 'rgba(30,140,60,0.92)' : undefined, hover: () => { this.sel = i; } });
    });
    const tips = this.titleTips();
    const tip = tips[Math.floor(this.t / 5) % tips.length];
    const tw = Math.min(W - 40, 900 * u);
    this.panel(c, W / 2 - tw / 2, H - 112 * u, tw, 48 * u);
    text(c, '💡 ' + tip, W / 2, H - 88 * u, Math.min(16 * u, (W - 60) / (tip.length * 0.5)), '#fff', 'center', null);
  },

  titleTips() {
    return ['Hold SHOOT to charge. Captains: fully charge near goal, release when the ring hits the green circle for a SUPER STRIKE!',
      'Tackle someone who doesn\'t have the ball and their team gets a power-up. Wahala pays... them.',
      'Run over ? boxes to grab an item. An ITEM button appears with the item on it: tap it to use it.',
      'Plug in Xbox, PlayStation, Switch or almost any USB controller. Up to 4 pads + 2 keyboards.',
      'Press SHOOT while a pass is on its way for a one-touch PERFECT shot.',
      'Watch out in Lagos: NEPA can take light in the middle of the match!'];
  },
  rTitleCompact(c) {
    const W = this.W, H = this.H, u = this.u();
    const ly = 66 * u;
    this.logo(c, W / 2, ly, Math.min(88 * u, W / 8));
    text(c, GAME_TAGLINE, W / 2, ly + 52 * u, Math.min(17 * u, (W - 30) / (GAME_TAGLINE.length * 0.55)), '#ffffff', 'center', '#000', 3 * u);
    const ks = ['#fcd116', '#1b8a3c', '#e8433a', '#111'];
    for (let i = 0; i < 32; i++) { c.fillStyle = ks[i % 4]; c.fillRect(W / 2 - 240 * u + i * 15 * u, ly + 66 * u, 15 * u, 6 * u); }
    text(c, GAME_MEANING, W / 2, ly + 84 * u, 12 * u, '#ffe066', 'center', '#000', 2, FONT_UI);
    const items = this.titleItems();
    const bw = Math.min(W - 40 * u, 460 * u), x0 = W / 2 - bw / 2, y0 = ly + 104 * u;
    const [l0, f0] = items[0];
    this.button(c, x0, y0, bw, 60 * u, l0, f0, { sel: this.sel === 0, size: 30 * u, color: 'rgba(30,140,60,0.92)', hover: () => { this.sel = 0; } });
    const sw = (bw - 2 * 10 * u) / 3;
    items.slice(1).forEach(([label, fn], k) => {
      const i = k + 1;
      this.button(c, x0 + k * (sw + 10 * u), y0 + 70 * u, sw, 48 * u, label, fn, { sel: this.sel === i, hover: () => { this.sel = i; } });
    });
    const tips = this.titleTips(), tip = tips[Math.floor(this.t / 5) % tips.length];
    const tw = Math.min(W - 150 * u, 740 * u), ty = Math.min(H - 52 * u, y0 + 134 * u);
    this.panel(c, 10 * u, ty, tw, 42 * u);
    wrapFit(c, '💡 ' + tip, 10 * u + 12 * u, ty + 21 * u, tw - 24 * u, 13 * u, 2, '#fff');
  },
  controlsCard(c, x, y, w) {
    const u = this.u();
    const rows = [['', 'MOVE', 'PASS / SWITCH', 'SHOOT (HOLD)', 'TACKLE / JUKE', 'ITEM', 'POWER', 'DODGE'],
      ['Keyboard 1', ...Object.values(KB_LAYOUTS.kb1.help)], ['Keyboard 2', ...Object.values(KB_LAYOUTS.kb2.help)],
      ['Xbox', 'Stick / D-pad', 'A', 'B / RT', 'X / LT', 'Y', 'LB', 'RB'], ['PlayStation', 'Stick / D-pad', '✕', '○ / R2', '□ / L2', '△', 'L1', 'R1'],
      ['Switch / 8BitDo', 'Stick / D-pad', 'B', 'A / ZR', 'Y / ZL', 'X', 'L', 'R']];
    const h = 22 * u + rows.length * 25 * u;
    this.panel(c, x, y, w, h);
    rows.forEach((r, ri) => r.forEach((s, ci) => {
      const cx = x + w * (0.066 + ci * 0.124);
      text(c, s, cx, y + 20 * u + ri * 25 * u, 13.5 * u, ri === 0 ? '#ffe066' : (ci === 0 ? '#9cf' : '#fff'), 'center', null, 0, ri === 0 ? FONT : FONT_UI);
    }));
    return h;
  },

  rHelp(c) {
    const W = this.W, H = this.H, u = this.u();
    if (this.compact()) {
      text(c, 'HOW TO PLAY', W / 2, 27 * u, 34 * u, '#ffe066', 'center', '#000', 5 * u);
      const dev = Touch.active ? 'touch' : this.myDevice();
      this.howToBody(c, dev, 56 * u, false);
      this.navButtons(c, () => this.back(this.helpReturn), null);
      return;
    }
    this.header(c, 'HOW TO PLAY', 'Score more than the other team. Everything else is optional. Especially the rules.');
    const w = Math.min(W - 30, 1000 * u);
    const h = this.controlsCard(c, W / 2 - w / 2, 120 * u, w);
    const lines = [
      '⚽  SHOOTING: shots fly at goal automatically. Hold the stick up/down to aim for a corner. Hold SHOOT longer = harder shot.',
      '🌟  SUPER STRIKE: with your CAPTAIN near goal, fully charge. Release when the shrinking ring hits the green circle!',
      '🦵  TACKLE the ball carrier to steal it. Flatten someone WITHOUT the ball = CHEAP SHOT, and their team gets a power-up.',
      '🌀  JUKE: press TACKLE while you have the ball to spin past defenders.',
      '🔥  POWERS: every captain has a silly signature power, every teammate a squad power. Press POWER (Q / LB / L1) when the meter is full.',
      '💨  DODGE (E / RB / R1) just as a tackle arrives for a speed boost. Hold SHOOT or TACKLE and release in the green zone for a perfect one.',
      '🔮  Grab the HYPER ORB, clear the box of defenders, then hold POWER and hit the prompts for a 2-point HYPER STRIKE.',
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
    const pads = Input.slotPads(), K = this.compact();
    const slots = K ? [0, 1, 2, 3].filter(i => pads[i]) : [0, 1, 2, 3];
    const cols = K ? 2 : W < 900 ? 1 : 2, cw = Math.min((W - 60 * u) / cols - 10 * u, 560 * u);
    const ch = K ? Math.min(160 * u, (H - 150 * u) / Math.max(1, Math.ceil(slots.length / 2)) - 14 * u) : Math.min(170 * u, (H - 280 * u) / (4 / cols));
    slots.forEach((i, k) => {
      const id = 'pad' + i, d = Input.devices[id], gp = pads[i];
      const x = W / 2 - (cols * (cw + 16 * u) - 16 * u) / 2 + (k % cols) * (cw + 16 * u), y = (K ? 72 : 120) * u + Math.floor(k / cols) * (ch + 14 * u);
      this.panel(c, x, y, cw, ch, gp ? 'rgba(10,12,34,0.9)' : 'rgba(10,12,34,0.55)', gp ? HUMAN_COLORS[Input.order.indexOf(id)] : 'rgba(255,255,255,0.25)');
      if (!gp) {
        text(c, `P${i + 3}  ·  EMPTY SLOT`, x + cw / 2, y + ch * 0.4, 20 * u, '#888', 'center', null);
        text(c, 'Connect a controller and press any button to wake it up', x + cw / 2, y + ch * 0.62, Math.min(13 * u, cw / 50), '#777', 'center', null, 0, FONT_UI);
        return;
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
    });
    if (!pads.some(Boolean)) {
      const issues = [];
      if (!navigator.getGamepads) issues.push('❌ This browser has no gamepad support. Use Chrome, Edge, Firefox or Safari (latest).');
      if (!window.isSecureContext) issues.push('❌ Controllers need https:// or a local file. Open the game from its https:// address.');
      if (window.top !== window.self) issues.push('⚠️ The game is inside an embedded frame, which can block controllers. Open it in its own tab.');
      issues.push('👉 PRESS A BUTTON on the controller: browsers hide controllers until a button is pressed.');
      issues.push('👉 Xbox / PC pads: plug in by USB or pair via Bluetooth BEFORE pressing a button. If on Windows, close Steam\'s overlay.');
      issues.push('👉 PlayStation pads work best in Chrome or Edge.');
      const bw = Math.min(W - 40, 860 * u), bh = 40 * u + issues.length * 24 * u, bx = W / 2 - bw / 2, by0 = Math.max((K ? 74 : 120) * u, H / 2 - bh / 2);
      this.panel(c, bx, by0, bw, bh, 'rgba(8,10,28,0.96)', '#ffd43b');
      text(c, 'NO CONTROLLER DETECTED YET', W / 2, by0 + 22 * u, 18 * u, '#ffd43b', 'center', '#000', 3);
      issues.forEach((t, k) => text(c, t, bx + 18 * u, by0 + 50 * u + k * 24 * u, Math.min(14 * u, (bw - 36 * u) / (t.length * 0.5)), t.startsWith('👉') ? '#fff' : '#ff8787', 'left', null, 0, FONT_UI));
    }
    if (Input.extraPads) text(c, `${Input.extraPads} more controller(s) detected — only 4 can play at once.`, W / 2, H - (K ? 52 : 122) * u, 12 * u, '#ffd43b', 'center', null, 0, FONT_UI);
    text(c, 'Wrong buttons? Click REMAP, press 1-4 on the keyboard, or HOLD ANY BUTTON on the controller for 2 seconds.', W / 2, H - (K ? 32 : 100) * u, Math.min(14 * u, (W - 40) / 100 * 1.9), '#fff', 'center', '#000', 3);
    if (!K) text(c, 'Back: Esc / click BACK / press START on a controller', W / 2, H - 78 * u, 12 * u, '#aaa', 'center', null, 0, FONT_UI);
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
    const W = this.W, H = this.H, u = this.u(), K = this.compact();
    this.header(c, 'WHO\'S PLAYING?', K ? 'Tap the arrows (or push a controller left / right) to pick a side. The middle sits out.' : 'Move your controller LEFT or RIGHT (or click the arrows) to pick a team. The middle sits out and the CPU plays.');
    const colW = K ? Math.min(300 * u, (W - 30 * u) / 3.1) : Math.min(360 * u, W / 3.2), cx = [W / 2 - colW * 1.05, W / 2, W / 2 + colW * 1.05];
    const top = K ? 70 * u : 118 * u, h = K ? Math.max(120 * u, H - top - 128 * u) : Math.max(140 * u, H - top - 330 * u);
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
      const y = top + (K ? 44 : 50) * u + counts[col]++ * (K ? 50 : 46) * u;
      const color = HUMAN_COLORS[Input.order.indexOf(id)];
      const aw = K ? 40 * u : 28 * u, bw = K ? colW - 2 * aw - 22 * u : colW * 0.72, bx = cx[col] - bw / 2, bh = K ? 42 * u : 38 * u;
      const hov = this.over(bx, y, bw, bh);
      c.fillStyle = color; rrect(c, bx, y, bw, bh, 10 * u); c.fill();
      c.strokeStyle = hov ? '#ffe066' : '#000'; c.lineWidth = 3; c.stroke();
      const icon = d.kind === 'pad' ? PAD_FAMILIES[d.family].icon : d.kind === 'touch' ? '📱' : '⌨️';
      drawEmoji(c, icon, bx + 20 * u, y + bh / 2, 22 * u);
      const nm = `P${Input.order.indexOf(id) + 1} ${d.name.toUpperCase()}`;
      text(c, nm, cx[col] + 10 * u, y + bh / 2 + 1, Math.min(15 * u, (bw - 40 * u) / (nm.length * 0.6)), '#fff', 'center', '#000', 3 * u);
      this.hit(bx, y, bw, bh, () => { this.sides[id] = this.sides[id] >= 1 ? -1 : this.sides[id] + 1; SFX.ui(); });
      const ah = K ? bh : 30 * u, ay = K ? y : y + 4 * u;
      if (col > 0) this.button(c, bx - aw - 6 * u, ay, aw, ah, '◀', () => { this.sides[id] = Math.max(-1, this.sides[id] - 1); SFX.ui(); }, { size: (K ? 18 : 14) * u });
      if (col < 2) this.button(c, bx + bw + 6 * u, ay, aw, ah, '▶', () => { this.sides[id] = Math.min(1, this.sides[id] + 1); SFX.ui(); }, { size: (K ? 18 : 14) * u });
    });
    const nL = devs.filter(id => this.sides[id] < 0).length, nR = devs.filter(id => this.sides[id] > 0).length;
    const mode = !nL && !nR ? 'CPU vs CPU: sit back and enjoy the wahala' : (nL && nR ? 'VERSUS! May the best team win.' : (nL + nR > 1 ? 'CO-OP vs CPU!' : 'YOU vs CPU'));
    text(c, mode, W / 2, top + h + 22 * u, 20 * u, '#7CFC00', 'center', '#000', 4 * u);
    const bw2 = K ? 210 * u : 230 * u, bh2 = K ? 42 * u : 34 * u, by2 = top + h + 42 * u;
    // compact: keep these two clear of the NEXT button in the bottom-right corner
    const bx2 = K ? Math.min(W / 2 - bw2 - 8 * u, W - 168 * u - 2 * bw2 - 26 * u) : W / 2 - bw2 - 8 * u;
    this.button(c, bx2, by2, bw2, bh2, '🎮 CONTROLLER SETUP', () => { this.padsReturn = 'join'; this.go('pads'); }, { size: 15 * u });
    this.button(c, bx2 + bw2 + 16 * u, by2, bw2, bh2, '❓ HOW TO PLAY', () => { this.helpReturn = 'join'; this.go('help'); }, { size: 15 * u });
    if (!K) {
      const cw = Math.min(W - 30, 1000 * u);
      this.controlsCard(c, W / 2 - cw / 2, top + h + 90 * u, cw);
    }
    this.navButtons(c, () => this.back('title'), () => this.go('capL'));
  },

  rCap(c) {
    const W = this.W, H = this.H, u = this.u();
    const left = this.screen === 'capL';
    const key = left ? 'capL' : 'capR';
    const cap = CAPTAINS.find(x => x.id === this.cfg[key]);
    const humans = Input.order.filter(id => (id === 'kb1' || id === 'kb2' || Input.devices[id].connected) && this.sides[id] === (left ? -1 : 1));
    if (this.compact()) { this.rCapCompact(c, left, key, cap, humans); return; }
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

  // Phones in landscape: portrait on the left, info + a big tappable grid on the right.
  rCapCompact(c, left, key, cap, humans) {
    const W = this.W, H = this.H, u = this.u();
    this.header(c, left ? 'LEFT TEAM CAPTAIN' : 'RIGHT TEAM CAPTAIN', humans.length ? `Controlled by ${humans.map(h => 'P' + (Input.order.indexOf(h) + 1)).join(' + ')}  ·  tap a captain, then PICK` : 'CPU team: pick their poison');
    const lw = Math.min(W * 0.34, 330 * u), px = lw / 2 + 6 * u, feet = H - 118 * u;
    const ps = Math.min(2.6 * u, (feet - 70 * u) / 100);
    ellipse(c, px, feet, 70 * ps / 2.2, 18 * ps / 2.2, 'rgba(0,0,0,0.4)');
    const pk = left ? cap.color : (this.cfg.capL === cap.id || colorDist(CAPTAINS.find(x => x.id === this.cfg.capL).color, cap.color) < 110 ? cap.alt : cap.color);
    for (let i = 0; i < 2; i++) drawCharacter(c, portraitDesc(cap, 'sidekick', pk, this.t + i, { face: left ? 0.2 : Math.PI - 0.2, expr: 'normal', moving: 0.5 }), px + (i ? 1 : -1) * 66 * ps / 2, feet - 6 * u, ps * 0.48);
    drawCharacter(c, portraitDesc(cap, 'captain', pk, this.t, { face: left ? 0.35 : Math.PI - 0.35, moving: 0.4, expr: Math.sin(this.t * 1.3) > 0.7 ? 'grit' : 'happy' }), px, feet, ps);
    text(c, cap.name.toUpperCase(), px, feet + 20 * u, Math.min(20 * u, (lw - 10 * u) / (cap.name.length * 0.58)), '#fff', 'center', '#000', 4 * u);
    text(c, `"${cap.nick}"  ·  ${cap.country.toUpperCase()}`, px, feet + 42 * u, Math.min(13 * u, (lw - 10 * u) / ((cap.nick.length + cap.country.length + 6) * 0.55)), '#ffe066', 'center', '#000', 2.5 * u);
    this.button(c, px - 85 * u, H - 54 * u, 170 * u, 46 * u, 'PICK  ▶', () => this.pickCaptain(), { size: 20 * u, color: 'rgba(30,140,60,0.92)' });
    // info panel
    const gx = lw + 12 * u, gw = W - gx - 10 * u, iy = 70 * u, ih = 160 * u;
    this.panel(c, gx, iy, gw, ih);
    text(c, cap.team.toUpperCase(), gx + 12 * u, iy + 17 * u, 17 * u, cap.color === '#111111' ? '#fff' : (cap.color2 === '#111111' ? cap.color : cap.color2), 'left', '#000', 3 * u);
    wrapFit(c, cap.blurb, gx + 12 * u, iy + 46 * u, gw - 24 * u, 12.5 * u, 2, '#fff');
    const stats = [['SPEED', cap.speed / 1.25], ['POWER', cap.power / 1.3], ['TACKLE', cap.tackle / 1.45], ['SIZE', cap.size / 1.35]];
    stats.forEach(([n, v], i) => {
      const sx = gx + 12 * u + (i % 2) * (gw / 2), sy = iy + 80 * u + Math.floor(i / 2) * 17 * u, bl = gw / 2 - 90 * u;
      text(c, n, sx, sy, 11.5 * u, '#aaa', 'left', null, 0, FONT);
      c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(sx + 60 * u, sy - 4 * u, bl, 8 * u);
      c.fillStyle = cap.color === '#111111' ? '#888' : cap.color; c.fillRect(sx + 60 * u, sy - 4 * u, bl * clamp(v, 0.1, 1), 8 * u);
    });
    text(c, `SUPER STRIKE: ${cap.superName}`, gx + 12 * u, iy + 116 * u, Math.min(13 * u, (gw - 24 * u) / ((cap.superName.length + 14) * 0.6)), '#ff8fd0', 'left', '#000', 2.5 * u);
    const pw1 = `${cap.signature.icon} POWER: ${cap.signature.name} - ${cap.signature.desc}`, pw2 = `${cap.squad.icon} SQUAD: ${cap.squad.name} - ${cap.squad.desc}`;
    text(c, pw1, gx + 12 * u, iy + 134 * u, Math.min(12 * u, (gw - 24 * u) / (pw1.length * 0.5)), '#ffb066', 'left', null, 0, FONT_UI);
    text(c, pw2, gx + 12 * u, iy + 150 * u, Math.min(12 * u, (gw - 24 * u) / (pw2.length * 0.5)), '#9cf', 'left', null, 0, FONT_UI);
    // grid
    const cols = 4, rows = Math.ceil(CAPTAINS.length / cols), gap = 8 * u, gy = iy + ih + 8 * u;
    const cw = (gw - (cols - 1) * gap) / cols, chh = Math.max(40 * u, (H - gy - 8 * u - (rows - 1) * gap) / rows);
    CAPTAINS.forEach((cp, i) => {
      const x = gx + (i % cols) * (cw + gap), y = gy + Math.floor(i / cols) * (chh + gap);
      const sel = cp.id === cap.id, hov = this.over(x, y, cw, chh);
      c.fillStyle = sel ? cp.color : hov ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'; rrect(c, x, y, cw, chh, 10 * u); c.fill();
      c.strokeStyle = sel ? '#ffe066' : hov ? '#fff' : 'rgba(255,255,255,0.3)'; c.lineWidth = sel ? 4 : 2; c.stroke();
      c.save(); c.beginPath(); rrect(c, x, y, cw, chh, 10 * u); c.clip();
      const sc = Math.min(chh / 80, cw / 70);
      drawCharacter(c, portraitDesc(cp, 'captain', cp.color, this.t + i, { expr: sel || hov ? 'happy' : 'normal', face: 0.4, moving: sel || hov ? 0.6 : 0 }), x + cw * 0.3, y + chh * 1.04, sc);
      c.restore();
      text(c, cp.short.toUpperCase(), x + cw * 0.62, y + chh / 2, Math.min(15 * u, (cw * 0.42) / (cp.short.length * 0.6)), '#fff', 'center', '#000', 3 * u);
      this.hit(x, y, cw, chh, () => { if (this.cfg[key] === cp.id) this.pickCaptain(); else { this.cfg[key] = cp.id; SFX.ui(); } }, null, 'cap:' + cp.id);
    });
    this.button(c, W - 138 * u, 8 * u, 130 * u, 38 * u, '🎲 RANDOM', () => { this.cfg[key] = pick(CAPTAINS).id; SFX.boing(); }, { size: 15 * u });
    this.navButtons(c, () => this.back(left ? 'join' : 'capL'), null);
  },

  rStadium(c) {
    const W = this.W, H = this.H, u = this.u();
    const K = this.compact();
    this.header(c, 'PICK A STADIUM', 'Each venue has its own walls, hazards and questionable safety record. ' + (K ? 'Tap to choose.' : 'Click to choose.'));
    const st = STADIUMS.find(s => s.id === this.cfg.stadium);
    const n = STADIUMS.length;
    const cw = Math.min(190 * u, (W - 40 * u) / n - 12 * u), chh = K ? Math.min(cw * 1.2, 150 * u) : cw * 1.25;
    const x0 = W / 2 - (n * (cw + 12 * u) - 12 * u) / 2, y0 = K ? 84 * u : 130 * u;
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
    const py = y0 + chh + (K ? 14 : 26) * u, pw = Math.min(W - 40, 800 * u), ph = K ? 98 * u : 120 * u;
    this.panel(c, W / 2 - pw / 2, py, pw, ph);
    text(c, st.name.toUpperCase(), W / 2, py + (K ? 20 : 26) * u, (K ? 22 : 28) * u, st.wall, 'center', '#000', 5 * u);
    if (K) {
      const wt0 = { zap: 'Electrified walls ZAP anyone tackled into them.', burn: 'Lava-rock walls leave you crispy like suya.', snow: 'Snowbank walls. Ice pitch: players slide everywhere!', hay: 'Thorn-bush walls bounce you right back. OUCH!', sand: 'Sand-dune walls bury you. The sand slows the ball down.' }[st.wallFx] + (st.grav < 1 ? ' Low gravity: the ball floats!' : '');
      wrapFit(c, st.desc, W / 2, py + 50 * u, pw - 30 * u, 14 * u, 2, '#fff', 'center');
      text(c, wt0, W / 2, py + 80 * u, Math.min(13 * u, (pw - 30) / (wt0.length * 0.5)), '#9cf', 'center', null, 0, FONT_UI);
      this.button(c, W / 2 - pw / 2, H - 54 * u, 150 * u, 44 * u, '🎲 RANDOM', () => { this.cfg.stadium = pick(STADIUMS).id; SFX.boing(); }, { size: 16 * u });
      this.navButtons(c, () => this.back('capR'), () => this.go('options'));
      return;
    }
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
    if (this.compact()) { this.rOptionsCompact(c); return; }
    this.header(c, 'MATCH RULES', 'There are no rules. Except these ones.');
    const rows = this.optionRows();
    const rw = Math.min(W - 40, 700 * u), rh = (rows.length > 8 ? 36 : 42) * u, x = W / 2 - rw / 2, y0 = 108 * u;
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
      if (r.hint) text(c, r.hint(obj[r.key]), x + 205 * u, y + rh / 2, 12 * u, '#ffd43b', 'left', null, 0, FONT_UI);
      this.hit(x, y, rw - 220 * u, rh, () => { this.optSel = i; this.changeOpt(r, 1); }, () => { this.optSel = i; });
      this.button(c, x + rw - 210 * u, y + 5 * u, 32 * u, rh - 10 * u, '◀', () => { this.optSel = i; this.changeOpt(r, -1); }, { size: 14 * u, hover: () => { this.optSel = i; } });
      { const v = r.fmt(obj[r.key]); text(c, v, x + rw - 112 * u, y + rh / 2, Math.min(16 * u, 130 * u / (v.length * 0.5)), sel ? '#ffe066' : '#9cf', 'center', '#000', 3 * u); }
      this.button(c, x + rw - 46 * u, y + 5 * u, 32 * u, rh - 10 * u, '▶', () => { this.optSel = i; this.changeOpt(r, 1); }, { size: 14 * u, hover: () => { this.optSel = i; } });
    });
    // CPU difficulty breakdown card (only when there is room beside the list)
    const room = W - (x + rw) - 24 * u;
    if (room > 200 * u) this.diffCard(c, x + rw + 14 * u, y0 + (rh + 8 * u), Math.min(250 * u, room));
    const capL = CAPTAINS.find(x => x.id === this.cfg.capL), capR = CAPTAINS.find(x => x.id === this.cfg.capR), st = STADIUMS.find(s => s.id === this.cfg.stadium);
    const vs = `${capL.team}  vs  ${capR.team}  @  ${st.name}`;
    text(c, vs, W / 2, H - 112 * u, Math.min(17 * u, (W - 40) / (vs.length * 0.55)), '#fff', 'center', '#000', 3 * u);
    this.navButtons(c, () => this.back('stadium'), () => { SFX.whistle(); this.startMatch(); }, 'KICK OFF ▶');
  },

  // Phones: two columns of big rows, one big KICK OFF button. Tap a row to cycle it, or use the arrows.
  rOptionsCompact(c) {
    const W = this.W, H = this.H, u = this.u();
    const capL = CAPTAINS.find(x => x.id === this.cfg.capL), capR = CAPTAINS.find(x => x.id === this.cfg.capR), st = STADIUMS.find(s => s.id === this.cfg.stadium);
    this.header(c, 'MATCH RULES', `${capL.team}  vs  ${capR.team}  @  ${st.name}`);
    const rows = this.optionRows(), opts = rows.filter(r => !r.start), startIdx = rows.findIndex(r => r.start);
    const per = Math.ceil(opts.length / 2), gap = 6 * u;
    const kb = 54 * u, top = 68 * u, avail = H - top - kb - 14 * u;
    const rh = Math.min(46 * u, avail / per - gap);
    const colW = Math.min(470 * u, (W - 30 * u) / 2), xs = [W / 2 - colW - 5 * u, W / 2 + 5 * u];
    opts.forEach((r, k) => {
      const i = rows.indexOf(r), x = xs[Math.floor(k / per)], y = top + (k % per) * (rh + gap), sel = i === this.optSel;
      const hov = this.over(x, y, colW, rh);
      this.panel(c, x, y, colW, rh, sel || hov ? 'rgba(255,224,102,0.22)' : 'rgba(10,12,34,0.88)', sel || hov ? '#ffe066' : 'rgba(255,255,255,0.4)');
      const obj = r.opt ? this.opts : this.cfg, hint = r.hint ? r.hint(obj[r.key]) : '';
      const aw = 42 * u, vw = 112 * u, lab = r.label.toUpperCase(), lw = colW - 2 * aw - vw - 24 * u;
      text(c, lab, x + 12 * u, y + (hint ? rh * 0.36 : rh / 2), Math.min(15 * u, lw / (lab.length * 0.56)), '#fff', 'left', '#000', 3 * u);
      if (hint) text(c, hint, x + 12 * u, y + rh * 0.74, Math.min(10.5 * u, lw / (hint.length * 0.47)), '#ffd43b', 'left', null, 0, FONT_UI);
      this.hit(x, y, colW - 2 * aw - vw - 8 * u, rh, () => { this.optSel = i; this.changeOpt(r, 1); }, () => { this.optSel = i; });
      const ax = x + colW - 2 * aw - vw - 8 * u;
      this.button(c, ax, y + 3 * u, aw, rh - 6 * u, '◀', () => { this.optSel = i; this.changeOpt(r, -1); }, { size: 17 * u, hover: () => { this.optSel = i; } });
      const v = r.fmt(obj[r.key]);
      text(c, v, ax + aw + vw / 2, y + rh / 2, Math.min(15 * u, vw / (v.length * 0.55)), sel ? '#ffe066' : '#9cf', 'center', '#000', 3 * u);
      this.hit(ax + aw, y, vw, rh, () => { this.optSel = i; this.changeOpt(r, 1); });
      this.button(c, ax + aw + vw, y + 3 * u, aw, rh - 6 * u, '▶', () => { this.optSel = i; this.changeOpt(r, 1); }, { size: 17 * u, hover: () => { this.optSel = i; } });
    });
    // KICK OFF
    const bw = Math.min(W - 40 * u, 420 * u), bx = W / 2 - bw / 2, by = H - kb - 6 * u, sel = this.optSel === startIdx;
    const hov = this.over(bx, by, bw, kb), pulse = sel ? 1 + 0.03 * Math.sin(this.t * 8) : 1;
    c.save(); c.translate(W / 2, by + kb / 2); c.scale(pulse, pulse);
    c.fillStyle = sel || hov ? '#51cf66' : '#2b8a3e'; rrect(c, -bw / 2, -kb / 2, bw, kb, 14 * u); c.fill();
    c.strokeStyle = sel || hov ? '#ffe066' : '#000'; c.lineWidth = 4; c.stroke();
    text(c, '⚽  KICK OFF!  ⚽', 0, 0, 28 * u, '#fff', 'center', '#000', 5 * u);
    c.restore();
    this.hit(bx, by, bw, kb, () => { SFX.whistle(); this.startMatch(); }, () => { this.optSel = startIdx; });
    this.navButtons(c, () => this.back('stadium'), null);
  },
  diffCard(c, x, y, w) {
    const u = this.u(), k = this.cfg.difficulty, D = DIFF[k] || DIFF.normal;
    const h = 52 * u + DIFF_BARS.length * 26 * u;
    this.panel(c, x, y, w, h, 'rgba(10,12,34,0.9)', '#ffe066');
    text(c, 'CPU: ' + (DIFF_NAMES[k] || k), x + w / 2, y + 20 * u, Math.min(16 * u, w / ((DIFF_NAMES[k] || k).length * 0.62 + 3)), '#ffe066', 'center', '#000', 3 * u);
    DIFF_BARS.forEach(([n, f], i) => {
      const by = y + 46 * u + i * 26 * u, v = clamp(f(D), 0.04, 1);
      text(c, n, x + 12 * u, by, 12 * u, '#ddd', 'left', null, 0, FONT);
      const bx = x + 92 * u, bw = w - 104 * u;
      c.fillStyle = 'rgba(255,255,255,0.14)'; rrect(c, bx, by - 6 * u, bw, 12 * u, 6 * u); c.fill();
      c.fillStyle = `hsl(${Math.round(120 - v * 120)},80%,55%)`; rrect(c, bx, by - 6 * u, bw * v, 12 * u, 6 * u); c.fill();
    });
    this.hit(x, y, w, h, () => { const r = this.optionRows().find(r => r.key === 'difficulty'); this.changeOpt(r, 1); });
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
    c.fillStyle = this.compact() ? 'rgba(5,6,20,0.86)' : 'rgba(5,6,20,0.72)'; c.fillRect(0, 0, W, H);
    this.hit(0, 0, W, H, null);
    if (this.pv !== 'menu') { c.fillStyle = 'rgba(5,6,20,0.82)'; c.fillRect(0, 0, W, H); }
    if (this.pv === 'controls') { this.rControls(c); return; }
    if (this.pv === 'howto') { this.rHowTo(c); return; }
    const K = this.compact();
    text(c, 'PAUSED', W / 2, K ? 36 * u : H * 0.22, (K ? 50 : 80) * u, '#ffe066', 'center', '#000', 10 * u);
    text(c, 'The players are using this time to buy suya.', W / 2, K ? 72 * u : H * 0.22 + 56 * u, (K ? 14 : 18) * u, '#fff', 'center', '#000', 3);
    const items = this.pauseItems(), w = K ? 380 * u : 360 * u, h = K ? 50 * u : 50 * u, gap = K ? 8 * u : 12 * u;
    const y0 = K ? Math.max(92 * u, (H - items.length * (h + gap)) / 2 + 30 * u) : H * 0.4;
    items.forEach(([s, fn], i) => {
      const y = y0 + i * (h + gap);
      this.button(c, W / 2 - w / 2, y, w, h, s, () => { SFX.uiConfirm(); fn(); }, { sel: i === this.pauseSel, size: 22 * u, hover: () => { this.pauseSel = i; } });
    });
    if (K) { this.soundPair(c, W - 114 * u, 8 * u); this.gfxButton(c, W - 210 * u, 8 * u, 90 * u, 36 * u, 13 * u); }
    else { this.soundPair(c, W / 2 - 53 * u, H - 92 * u); this.gfxButton(c, W / 2 + 65 * u, H - 92 * u, 120 * u, 36 * u, 14 * u); }
    if (!Touch.active) text(c, 'N: mute    M: music    ESC / START: resume', W / 2, H - (K ? 14 : 40) * u, (K ? 12 : 15) * u, 'rgba(255,255,255,0.7)', 'center', null);
  },
  devTabs(c, cur, y, onPick, s = 1) {
    const W = this.W, u = this.u() * s, devs = this.ctlDevices();
    const mine = M ? M.teams.flatMap(t => t.humans.map(h => h.dev)) : [];
    const tw = Math.min(170 * u, (W - 40 * u) / devs.length - 8 * u), x0 = W / 2 - (devs.length * (tw + 8 * u) - 8 * u) / 2;
    devs.forEach((id, i) => {
      const d = Input.devices[id];
      const lab = (mine.includes(id) ? 'P' + (Input.order.indexOf(id) + 1) + ' · ' : '') + (id.startsWith('pad') ? PAD_FAMILIES[d.family].name.replace(' Controller', '').replace(' Gamepad', '') : d.name);
      this.button(c, x0 + i * (tw + 8 * u), y, tw, 34 * u, lab, () => onPick(id), { sel: id === cur, size: Math.min(14 * u, tw / (lab.length * 0.6)) });
    });
  },
  rControlsCompact(c) {
    const W = this.W, H = this.H, u = this.u(), C = this.ctl;
    text(c, 'CONTROLS', W / 2, 27 * u, 34 * u, '#ffe066', 'center', '#000', 5 * u);
    this.devTabs(c, C.dev, 50 * u, id => { if (!C.cap) { C.dev = id; C.sel = 0; SFX.ui(); } }, 0.85);
    const acts = this.ctlActions(C.dev), gp = C.dev.startsWith('pad') ? Input.padFor(C.dev) : null;
    const per = Math.ceil(acts.length / 2), gap = 6 * u, y0 = 88 * u;
    const rh = Math.min(42 * u, (H - y0 - 80 * u) / per - gap);
    const colW = Math.min(440 * u, (W - 30 * u) / 2), xs = [W / 2 - colW - 5 * u, W / 2 + 5 * u];
    acts.forEach((a, i) => {
      const x = xs[Math.floor(i / per)], y = y0 + (i % per) * (rh + gap), sel = C.sel === i, capNow = C.cap && C.cap.action === a && C.cap.dev === C.dev;
      const hov = this.over(x, y, colW, rh);
      this.panel(c, x, y, colW, rh, capNow ? 'rgba(124,252,0,0.25)' : sel || hov ? 'rgba(255,224,102,0.22)' : 'rgba(10,12,34,0.9)', capNow ? '#7CFC00' : sel || hov ? '#ffe066' : 'rgba(255,255,255,0.35)');
      text(c, ACTION_NAMES[a], x + 12 * u, y + rh / 2, Math.min(15 * u, rh * 0.42), '#fff', 'left', '#000', 3 * u);
      const v = capNow ? (C.dev.startsWith('kb') ? 'PRESS A KEY…' : 'PRESS A BUTTON…') : actionLabel(C.dev, a);
      text(c, v, x + colW - 12 * u, y + rh / 2, Math.min(15 * u, (colW * 0.5) / (v.length * 0.55)), capNow ? '#7CFC00' : '#9cf', 'right', '#000', 3 * u);
      this.hit(x, y, colW, rh, () => { if (!C.cap) { C.sel = i; this.ctlActivate(i); } }, () => { if (!C.cap) C.sel = i; });
    });
    const by = y0 + per * (rh + gap) + 4 * u, bw = colW;
    this.button(c, xs[0], by, bw, 42 * u, '↺ RESET TO DEFAULT', () => this.ctlActivate(acts.length), { sel: C.sel === acts.length, size: 16 * u, hover: () => { C.sel = acts.length; } });
    this.button(c, xs[1], by, bw, 42 * u, '◀ BACK', () => this.ctlActivate(acts.length + 1), { sel: C.sel === acts.length + 1, size: 16 * u, hover: () => { C.sel = acts.length + 1; } });
    const note = C.dev === 'touch' ? 'Touch buttons can\'t be remapped. Drag the left half of the screen to run.'
      : C.dev.startsWith('pad') ? (gp ? `${PAD_FAMILIES[Input.devices[C.dev].family].name} · ${Input.devices[C.dev].mapping === 'custom' ? 'custom layout' : 'default layout'} · saved for this controller` : 'Controller not connected')
      : 'Esc, P, N, M, Tab, Backspace and Enter stay reserved for menus. Saved in this browser.';
    text(c, note, W / 2, H - 14 * u, Math.min(12 * u, (W - 40) / (note.length * 0.5)), 'rgba(255,255,255,0.75)', 'center', null);
    this.button(c, 8 * u, 8 * u, 104 * u, 38 * u, '◀  BACK', () => { this.pv = 'menu'; SFX.uiBack(); }, { size: 16 * u });
  },
  rControls(c) {
    const W = this.W, H = this.H, u = this.u(), C = this.ctl;
    if (this.compact()) { this.rControlsCompact(c); return; }
    text(c, 'CONTROLS', W / 2, 44 * u, 44 * u, '#ffe066', 'center', '#000', 7 * u);
    text(c, 'Pick a device, then click an action (or select it and press confirm) and press the new key / button.', W / 2, 78 * u, Math.min(15 * u, (W - 40) / 52), '#fff', 'center', '#000', 3);
    this.devTabs(c, C.dev, 96 * u, id => { if (!C.cap) { C.dev = id; C.sel = 0; SFX.ui(); } });
    const acts = this.ctlActions(C.dev), gp = C.dev.startsWith('pad') ? Input.padFor(C.dev) : null;
    const rw = Math.min(W - 40 * u, 620 * u), x = W / 2 - rw / 2, y0 = 142 * u;
    const rh = Math.min(34 * u, (H - y0 - 110 * u) / (acts.length + 2) - 4 * u);
    acts.forEach((a, i) => {
      const y = y0 + i * (rh + 4 * u), sel = C.sel === i, capNow = C.cap && C.cap.action === a && C.cap.dev === C.dev;
      const hov = this.over(x, y, rw, rh);
      this.panel(c, x, y, rw, rh, capNow ? 'rgba(124,252,0,0.25)' : sel || hov ? 'rgba(255,224,102,0.22)' : 'rgba(10,12,34,0.88)', capNow ? '#7CFC00' : sel || hov ? '#ffe066' : 'rgba(255,255,255,0.35)');
      text(c, ACTION_NAMES[a], x + 16 * u, y + rh / 2, Math.min(16 * u, rh * 0.5), '#fff', 'left', '#000', 3 * u);
      const v = capNow ? (C.dev.startsWith('kb') ? 'PRESS A KEY…  (ESC cancels)' : 'PRESS A BUTTON…') : actionLabel(C.dev, a);
      text(c, v, x + rw - 16 * u, y + rh / 2, Math.min(16 * u, (rw * 0.55) / (v.length * 0.55)), capNow ? '#7CFC00' : '#9cf', 'right', '#000', 3 * u);
      this.hit(x, y, rw, rh, () => { if (!C.cap) { C.sel = i; this.ctlActivate(i); } }, () => { if (!C.cap) C.sel = i; });
    });
    const by = y0 + acts.length * (rh + 4 * u) + 8 * u, bw = (rw - 12 * u) / 2;
    this.button(c, x, by, bw, rh + 6 * u, '↺ RESET TO DEFAULT', () => this.ctlActivate(acts.length), { sel: C.sel === acts.length, size: 16 * u, hover: () => { C.sel = acts.length; } });
    this.button(c, x + bw + 12 * u, by, bw, rh + 6 * u, '◀ BACK', () => this.ctlActivate(acts.length + 1), { sel: C.sel === acts.length + 1, size: 16 * u, hover: () => { C.sel = acts.length + 1; } });
    const note = C.dev === 'touch' ? 'Touch buttons sit on the right of the screen; drag the left thumb to move.'
      : C.dev.startsWith('pad') ? (gp ? `${PAD_FAMILIES[Input.devices[C.dev].family].name} · ${Input.devices[C.dev].mapping === 'custom' ? 'custom layout' : 'default layout'} · saved for this controller` : 'Controller not connected')
      : 'Esc, P, N, M, Tab, Backspace and Enter stay reserved for menus. Saved in this browser.';
    text(c, note, W / 2, H - 30 * u, Math.min(14 * u, (W - 40) / (note.length * 0.5)), 'rgba(255,255,255,0.75)', 'center', null);
    text(c, '◀ ▶ switch device   ·   ▲ ▼ select   ·   confirm = remap   ·   ESC / START = back', W / 2, H - 52 * u, Math.min(13 * u, (W - 40) / 45), '#ffe066', 'center', null);
  },
  howToLines(id) {
    const L = a => '[' + actionLabel(id, a) + ']';
    const T = M ? (M.teams.find(t => t.humans.some(h => h.dev === id)) || M.teams[0]) : null, cap = T ? T.cap : CAPTAINS[0];
    const lines = [
      ['⚽', 'SHOOT', `Hold ${L('shoot')} to charge, release to fire. Push the stick up/down to aim for a corner.`],
      ...(MECH.charge.enabled ? [['✅', 'PERFECT SHOT', `Release ${L('shoot')} while the meter is in the green zone: a faster, keeper-breaking shot.`]] : []),
      ['🌟', 'SUPER STRIKE', `With your captain near goal, charge ${L('shoot')} fully and release when the ring hits the green circle: ${cap.superName}!`],
      ['⚡', 'ONE-TIMER', `Tap ${L('shoot')} while a pass is coming to you for a first-time volley.`],
      ['🔄', 'PASS / SWITCH', `${L('pass')} passes to the best teammate. Without the ball it switches to the nearest player.`],
      ['🦵', 'TACKLE', `${L('tackle')} slides in.${MECH.charge.enabled ? ' Hold and release in the green zone for a POWER TACKLE.' : ''} Hit the ball carrier, not someone without the ball!`],
      ['🌀', 'JUKE', `${L('tackle')} while you have the ball spins past defenders.`],
      ...(MECH.dodge.enabled ? [['💨', 'DODGE', (id === 'touch' ? 'Tap DODGE while steering, or swipe across DODGE, to dodge any way.'
        : id.startsWith('pad') ? `Flick the RIGHT STICK any way to dodge that way (or ${L('dodge')} + left stick).`
        : `${L('dodge')} + a direction (either order) dodges that way.`) + ' Time it just as a tackle arrives for a PERFECT DODGE speed boost.']] : []),
      ['🔥', 'POWER', `${L('ability')} when the meter is full. Captain: ${cap.signature.icon} ${cap.signature.name}. Teammates: ${cap.squad.icon} ${cap.squad.name}.`],
      ['🎁', 'ITEMS', id === 'touch' ? 'Run over ? boxes to grab an item. An ITEM button with the item on it appears: tap it to use it.' : `Run over ? boxes to grab an item (shown under the score), then ${L('item')} to use it.`],
      ...(MECH.hyper.enabled ? [['🔮', 'HYPER STRIKE', `Grab the orb, clear defenders from the box, hold ${L('ability')} and hit the prompts: worth ${MECH.hyper.points} goal${MECH.hyper.points > 1 ? 's' : ''}.`]] : []),
      ...(MECH.offBall.enabled ? [['🚫', 'NO CHEAP SHOTS', 'Flatten someone far from the ball and the other team gets a power-up.']] : []),
    ];
    return { cap, lines };
  },
  // compact how-to: optional captain strip, then two columns of wrapped tips
  howToBody(c, dev, top, showCap) {
    const W = this.W, H = this.H, u = this.u();
    const { cap, lines } = this.howToLines(dev);
    const w = Math.min(W - 20 * u, 1060 * u), x = W / 2 - w / 2;
    let ly = top;
    if (dev === 'touch') {
      const tl = '📱 TOUCH: drag anywhere on the LEFT half to run. Buttons on the right. The ITEM button only appears when you are carrying an item.';
      wrapFit(c, tl, W / 2, ly + 12 * u, w - 20 * u, 12.5 * u, 2, '#9cf', 'center');
      ly += 30 * u;
    }
    if (showCap) {
      this.panel(c, x, ly, w, 44 * u, 'rgba(10,12,34,0.9)', cap.color);
      text(c, `${cap.flag} ${cap.name.toUpperCase()}  ·  ${cap.team}`, x + 12 * u, ly + 13 * u, Math.min(15 * u, w / 44), '#ffe066', 'left', '#000', 3 * u);
      const sp = `${cap.signature.icon} ${cap.signature.name}: ${cap.signature.desc}   ${cap.squad.icon} SQUAD ${cap.squad.name}: ${cap.squad.desc}`;
      text(c, sp, x + 12 * u, ly + 31 * u, Math.min(12 * u, (w - 24 * u) / (sp.length * 0.5)), '#fff', 'left', null, 0, FONT_UI);
      ly += 50 * u;
    }
    const cols = 2, per = Math.ceil(lines.length / cols), gap = 8 * u, cw = (w - gap) / cols;
    const lh = (H - ly - 8 * u) / per;
    lines.forEach(([ic, name, desc], i) => {
      const col = Math.floor(i / per), row = i % per, lx = x + col * (cw + gap), yy = ly + row * lh, bh = lh - 5 * u;
      this.panel(c, lx, yy, cw, bh, 'rgba(10,12,34,0.88)', 'rgba(255,255,255,0.3)');
      drawEmoji(c, ic, lx + 18 * u, yy + bh / 2, Math.min(22 * u, bh * 0.5));
      text(c, name, lx + 36 * u, yy + Math.min(12 * u, bh * 0.25), Math.min(13 * u, bh * 0.28), '#ffe066', 'left', '#000', 2.5 * u);
      wrapFit(c, desc, lx + 36 * u, yy + bh * 0.62, cw - 46 * u, Math.min(11.5 * u, bh * 0.26), 2, '#fff');
    });
  },
  rHowTo(c) {
    const W = this.W, H = this.H, u = this.u();
    if (this.compact()) {
      text(c, 'HOW TO PLAY', W / 2, 27 * u, 34 * u, '#ffe066', 'center', '#000', 5 * u);
      let top = 54 * u;
      if (!Touch.active || this.ctlDevices().length > 1) { this.devTabs(c, this.howDev, 50 * u, id => { this.howDev = id; SFX.ui(); }, 0.85); top = 86 * u; }
      this.howToBody(c, this.howDev, top, true);
      this.button(c, 8 * u, 8 * u, 104 * u, 38 * u, '◀  BACK', () => { this.pv = 'menu'; SFX.uiBack(); }, { size: 16 * u });
      return;
    }
    text(c, 'HOW TO PLAY', W / 2, 44 * u, 44 * u, '#ffe066', 'center', '#000', 7 * u);
    this.devTabs(c, this.howDev, 74 * u, id => { this.howDev = id; SFX.ui(); });
    const { cap, lines } = this.howToLines(this.howDev);
    const w = Math.min(W - 30 * u, 1060 * u), x = W / 2 - w / 2;
    // your captain's specials
    const cy = 118 * u;
    this.panel(c, x, cy, w, 64 * u, 'rgba(10,12,34,0.9)', cap.color);
    text(c, `${cap.flag} ${cap.name.toUpperCase()}  ·  ${cap.team}`, x + 16 * u, cy + 18 * u, Math.min(18 * u, w / 40), '#ffe066', 'left', '#000', 3 * u);
    const sp = `${cap.signature.icon} ${cap.signature.name}: ${cap.signature.desc}   ${cap.squad.icon} SQUAD ${cap.squad.name}: ${cap.squad.desc}`;
    text(c, sp, x + 16 * u, cy + 44 * u, Math.min(14 * u, (w - 30 * u) / (sp.length * 0.5)), '#fff', 'left', null, 0, FONT_UI);
    const two = W > 980, cols = two ? 2 : 1, per = Math.ceil(lines.length / cols), cw = (w - (cols - 1) * 12 * u) / cols;
    const ly = cy + 76 * u, lh = Math.min(two ? 62 * u : 40 * u, (H - ly - 60 * u) / per);
    lines.forEach(([ic, name, desc], i) => {
      const col = Math.floor(i / per), row = i % per, lx = x + col * (cw + 12 * u), yy = ly + row * lh;
      this.panel(c, lx, yy, cw, lh - 6 * u, 'rgba(10,12,34,0.86)', 'rgba(255,255,255,0.3)');
      drawEmoji(c, ic, lx + 22 * u, yy + (lh - 6 * u) / 2, Math.min(24 * u, lh * 0.45));
      text(c, name, lx + 44 * u, yy + (two ? 16 * u : (lh - 6 * u) / 2), Math.min(15 * u, lh * 0.32), '#ffe066', 'left', '#000', 3 * u);
      if (two) wrapText(c, desc, lx + 44 * u, yy + 34 * u, cw - 56 * u, Math.min(13 * u, lh * 0.22), '#fff');
      else text(c, desc, lx + 150 * u, yy + (lh - 6 * u) / 2, Math.min(12.5 * u, (cw - 160 * u) / (desc.length * 0.5)), '#fff', 'left', null, 0, FONT_UI);
    });
    this.button(c, 14 * u, 14 * u, 120 * u, 42 * u, '◀  BACK', () => { this.pv = 'menu'; SFX.uiBack(); }, { size: 17 * u });
    text(c, '◀ ▶ switch device   ·   any button / ESC = back', W / 2, H - 22 * u, Math.min(13 * u, (W - 40) / 40), 'rgba(255,255,255,0.7)', 'center', null);
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
    const K = this.compact();
    text(c, win ? `${win.name.toUpperCase()} WIN!` : 'IT\'S A DRAW! EVERYBODY HAD FUN!', W / 2, (K ? 32 : 56) * u, Math.min((K ? 40 : 50) * u, W / 18), '#ffe066', 'center', '#000', 8 * u);
    for (const [t, sd] of [[A, -1], [B, 1]]) {
      const x = W / 2 + sd * (K ? Math.min(W * 0.32, W / 2 - 110 * u) : Math.min(W * 0.3, 330 * u)), y = K ? H * 0.56 : H * 0.5;
      const won = win === t, lost = win && win !== t;
      ellipse(c, x, y, 60 * u, 16 * u, 'rgba(0,0,0,0.4)');
      const cs = K ? 2.2 * u : 3.4 * u;
      drawCharacter(c, portraitDesc(t.cap, 'captain', t.kit, this.t, { face: sd < 0 ? 0.3 : Math.PI - 0.3, expr: won ? 'happy' : lost ? 'hurt' : 'normal', armsUp: won, dance: won, lying: lost, lyingDir: sd }), x, y, cs);
      text(c, String(t.score), x, y + (K ? 44 : 64) * u, (K ? 48 : 64) * u, '#fff', 'center', '#000', 8 * u);
      text(c, t.cap.short.toUpperCase(), x, y + (K ? 80 : 110) * u, (K ? 18 : 22) * u, '#fff', 'center', '#000', 4 * u);
      if (won) drawEmoji(c, '🏆', x, y - (K ? 170 : 250) * u + Math.sin(this.t * 4) * 8 * u, (K ? 50 : 70) * u);
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
    const aw = Math.min(W - 40, (K ? 400 : 440) * u), ax = W / 2 - aw / 2, ay = (K ? 60 : 110) * u;
    const by = H - (K ? 60 : 94) * u, rs = K ? Math.min(30 * u, (by - ay - 16 * u) / Math.max(1, awards.length + 0.6)) : 30 * u;
    if (awards.length) {
      this.panel(c, ax, ay, aw, rs * 0.6 + awards.length * rs);
      awards.forEach(([t, p, f], i) => {
        const yy = ay + rs * 0.3 + (i + 0.5) * rs;
        text(c, t, ax + 14 * u, yy, Math.min(16 * u, rs * 0.55), '#ffe066', 'left', '#000', 3);
        text(c, `${p.name} (${f(p)})`, ax + aw - 14 * u, yy, Math.min(14 * u, rs * 0.5), '#fff', 'right', null, 0, FONT_UI);
      });
    }
    this.resultItems().forEach(([s, fn], i) => {
      const bw = Math.min((K ? 230 : 220) * u, (W - 60) / 3), x = W / 2 + (i - 1) * (bw + 16 * u) - bw / 2;
      this.button(c, x, by, bw, (K ? 50 : 48) * u, s, () => { if (this.resultsT > 0.5) fn(); }, { sel: i === this.resSel, size: 19 * u, selColor: 'rgba(46,150,70,0.95)', hover: () => { this.resSel = i; } });
    });
  },
};

function wrapLines(c, str, maxW) {
  const words = str.split(' '), out = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
}
function wrapFit(c, str, x, y, maxW, size, maxLines, color, align = 'left') {
  let lines;
  for (let k = 0; k < 6; k++) {
    c.font = `700 ${Math.round(size)}px ${FONT_UI}`;
    lines = wrapLines(c, str, maxW);
    if (lines.length <= maxLines) break;
    size *= 0.9;
  }
  c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle';
  const lh = size * 1.22, y0 = y - (lines.length - 1) * lh / 2;
  lines.forEach((l, i) => c.fillText(l, x, y0 + i * lh));
}
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

// Boot once fonts are ready. Don't wait long: from the device cache they are instant, and on a slow
// first visit it's better to start with a stand-in font (the canvas swaps the real ones in when they land)
(function boot() {
  let started = false;
  const go = () => { if (!started) { started = true; App.init(); } };
  if (document.fonts && document.fonts.load) {
    Promise.race([
      Promise.all([document.fonts.load('40px "Luckiest Guy"'), document.fonts.load('900 20px "Nunito"')]),
      new Promise(r => setTimeout(r, 400)),
    ]).then(go, go);
  } else go();
})();
