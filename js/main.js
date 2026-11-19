// ============================================================================
//  APP SHELL: canvas, main loop, menus, pause, results
// ============================================================================

const App = {
  cv: null, c: null, W: 1280, H: 720, dpr: 1, t: 0,
  screen: 'title', paused: false, pauseSel: 0, sel: 0, optSel: 0, resSel: 0,
  sides: { kb1: -1, kb2: 0, pad0: 0, pad1: 0, pad2: 0, pad3: 0, touch: -1 },
  opts: { voice: false },
  cfg: { capL: 'brick', capR: 'disco', stadium: 'thunder', minutes: 3, difficulty: 'normal', items: true, hazards: true, golden: true },
  fade: 0, demoT: 0,

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
    window.addEventListener('gamepadconnected', () => SFX.ui());
    try { const s = JSON.parse(localStorage.getItem('mayhemcup') || 'null'); if (s) { Object.assign(this.cfg, s.cfg || {}); Object.assign(this.opts, s.opts || {}); } } catch (e) { /* storage unavailable */ }
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
  save() { try { localStorage.setItem('mayhemcup', JSON.stringify({ cfg: this.cfg, opts: this.opts })); } catch (e) { /* ignore */ } },

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

  update(dt) {
    this.t += dt;
    if (Input.global.mute) SFX.setMuted(!SFX.muted);
    if (Input.global.music) SFX.toggleMusic();
    if (this.screen !== 'match') {
      SFX.musicMode = 'menu';
      if (SFX.sfx) SFX.sfx.gain.value = 0.3;
      if (M && M.demo) { updateMatch(dt); if (M.teams[0].score + M.teams[1].score >= 4 || M.done) this.startDemo(); }
    }
    switch (this.screen) {
      case 'title': this.uTitle(dt); break;
      case 'join': this.uJoin(dt); break;
      case 'capL': case 'capR': this.uCap(dt); break;
      case 'stadium': this.uStadium(dt); break;
      case 'options': this.uOptions(dt); break;
      case 'match': this.uMatch(dt); break;
      case 'results': this.uResults(dt); break;
    }
  },

  // ------------------------------------------------------------------ title
  uTitle() {
    if (Input.confirm() || Object.keys(Touch.buttons).length && Input.devices.touch.start.pressed) {
      SFX.init();
      if (Touch.active) this.sides.touch = -1;
      this.go('join');
    }
  },
  // ------------------------------------------------------------------ join
  joinDevices() { return Input.order.filter(id => id === 'kb1' || id === 'kb2' || Input.devices[id].connected); },
  uJoin() {
    for (const id of this.joinDevices()) {
      const d = Input.devices[id];
      if (d.navX) { this.sides[id] = clamp(this.sides[id] + d.navX, -1, 1); SFX.ui(); }
    }
    if (Input.back()) { this.screen = 'title'; SFX.uiBack(); return; }
    if (Input.confirm()) this.go('capL');
  },
  // ------------------------------------------------------------------ captain select
  uCap() {
    const key = this.screen === 'capL' ? 'capL' : 'capR';
    let idx = CAPTAINS.findIndex(c => c.id === this.cfg[key]);
    const cols = 4;
    const nx = Input.navX(), ny = Input.navY();
    if (nx) { idx = (idx + nx + CAPTAINS.length) % CAPTAINS.length; SFX.ui(); }
    if (ny) { idx = (idx + ny * cols + CAPTAINS.length) % CAPTAINS.length; SFX.ui(); }
    if (Input.randomPressed()) { idx = randi(0, CAPTAINS.length - 1); SFX.boing(); }
    this.cfg[key] = CAPTAINS[idx].id;
    if (Input.back()) { this.screen = this.screen === 'capL' ? 'join' : 'capL'; SFX.uiBack(); return; }
    if (Input.confirm()) { const cap = CAPTAINS[idx]; floatSel = { t: 0, q: pick(cap.quips) }; this.go(this.screen === 'capL' ? 'capR' : 'stadium'); }
  },
  uStadium() {
    let idx = STADIUMS.findIndex(s => s.id === this.cfg.stadium);
    const nx = Input.navX() || Input.navY();
    if (nx) { idx = (idx + nx + STADIUMS.length) % STADIUMS.length; SFX.ui(); }
    if (Input.randomPressed()) { idx = randi(0, STADIUMS.length - 1); SFX.boing(); }
    this.cfg.stadium = STADIUMS[idx].id;
    if (Input.back()) { this.screen = 'capR'; SFX.uiBack(); return; }
    if (Input.confirm()) this.go('options');
  },
  optionRows() {
    return [
      { label: 'Match Length', vals: [1, 2, 3, 5], key: 'minutes', fmt: v => `${v} MIN` },
      { label: 'CPU Difficulty', vals: ['easy', 'normal', 'hard'], key: 'difficulty', fmt: v => ({ easy: 'PUSHOVER', normal: 'SPICY', hard: 'BRUTAL' })[v] },
      { label: 'Power-Ups', vals: [true, false], key: 'items', fmt: v => v ? 'CHAOS ON' : 'OFF' },
      { label: 'Stadium Hazards', vals: [true, false], key: 'hazards', fmt: v => v ? 'ON' : 'OFF' },
      { label: 'Golden Goal On Draw', vals: [true, false], key: 'golden', fmt: v => v ? 'ON' : 'OFF' },
      { label: 'Commentator Voice', vals: [false, true], key: 'voice', opt: true, fmt: v => v ? 'ON (TTS)' : 'OFF' },
      { label: 'KICK OFF!', start: true },
    ];
  },
  uOptions() {
    const rows = this.optionRows();
    const ny = Input.navY(), nx = Input.navX();
    if (ny) { this.optSel = (this.optSel + ny + rows.length) % rows.length; SFX.ui(); }
    const r = rows[this.optSel];
    if (nx && !r.start) {
      const obj = r.opt ? this.opts : this.cfg;
      const i = r.vals.indexOf(obj[r.key]);
      obj[r.key] = r.vals[(i + nx + r.vals.length) % r.vals.length]; SFX.ui();
    }
    if (Input.back()) { this.screen = 'stadium'; SFX.uiBack(); return; }
    if (Input.confirm()) {
      if (r.start) { SFX.whistle(); this.startMatch(); }
      else { const obj = r.opt ? this.opts : this.cfg; const i = r.vals.indexOf(obj[r.key]); obj[r.key] = r.vals[(i + 1) % r.vals.length]; SFX.ui(); }
    }
  },
  // ------------------------------------------------------------------ match
  uMatch(dt) {
    if (Input.global.pause) { this.paused = !this.paused; this.pauseSel = 0; SFX.ui(); if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { /* noop */ } }
    if (this.paused) {
      const ny = Input.navY();
      if (ny) { this.pauseSel = (this.pauseSel + ny + 3) % 3; SFX.ui(); }
      if (Input.confirm()) {
        SFX.uiConfirm();
        if (this.pauseSel === 0) this.paused = false;
        else if (this.pauseSel === 1) this.startMatch();
        else { this.paused = false; this.screen = 'title'; this.startDemo(); }
      }
      return;
    }
    updateMatch(dt);
    if (M.done) { this.screen = 'results'; this.resSel = 0; this.resultsT = 0; this.resultMatch = M; SFX.cheer(1); }
  },
  uResults(dt) {
    this.resultsT += dt;
    const R = this.resultMatch;
    if (R) { R.time += dt; for (const p of R.all) p.anim += dt; }
    const ny = Input.navY() || Input.navX();
    if (ny) { this.resSel = (this.resSel + ny + 3) % 3; SFX.ui(); }
    if (this.resultsT > 0.8 && Input.confirm()) {
      if (this.resSel === 0) this.startMatch();
      else if (this.resSel === 1) { this.startDemo(); this.go('capL'); }
      else { this.startDemo(); this.go('title'); }
    }
  },

  // ======================================================================
  render() {
    const c = this.c;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.imageSmoothingEnabled = true;
    const W = this.W, H = this.H;
    if (this.screen === 'match') {
      renderMatch(c);
      if (this.paused) this.rPause(c);
      this.rRotate(c);
      return;
    }
    if (this.screen === 'results') { this.rResults(c); this.rRotate(c); return; }
    // menus: demo match behind, dimmed
    if (M && M.demo) renderMatch(c);
    c.fillStyle = this.screen === 'title' ? 'rgba(6,8,26,0.45)' : 'rgba(6,8,26,0.78)';
    c.fillRect(0, 0, W, H);
    switch (this.screen) {
      case 'title': this.rTitle(c); break;
      case 'join': this.rJoin(c); break;
      case 'capL': case 'capR': this.rCap(c); break;
      case 'stadium': this.rStadium(c); break;
      case 'options': this.rOptions(c); break;
    }
    this.rRotate(c);
    const u = this.u();
    text(c, `N: ${SFX.muted ? 'UNMUTE' : 'MUTE'}   M: MUSIC ${SFX.musicOn ? 'ON' : 'OFF'}`, W - 12 * u, H - 12 * u, 12 * u, 'rgba(255,255,255,0.5)', 'right', null);
  },
  u() { return Math.min(this.W / 1280, this.H / 720) * (this.W < 700 ? 1.3 : 1); },

  logo(c, x, y, size) {
    const str = 'MAYHEM CUP';
    c.font = `${Math.round(size)}px ${FONT}`;
    const tw = c.measureText(str).width;
    let lx = x - tw / 2;
    const cols = ['#ff4d4d', '#ffd43b', '#51cf66', '#4dabf7', '#f783ac', '#ffa94d', '#ffffff', '#ff4d4d', '#ffd43b', '#51cf66'];
    for (let i = 0; i < str.length; i++) {
      const ch = str[i], w = c.measureText(ch).width;
      const by = Math.sin(this.t * 4 + i * 0.6) * size * 0.06;
      c.save(); c.translate(lx + w / 2, y + by); c.rotate(Math.sin(this.t * 3 + i) * 0.06);
      text(c, ch, 0, 0, size, cols[i % cols.length], 'center', '#14082e', size * 0.16);
      c.restore();
      lx += w;
    }
  },

  rTitle(c) {
    const W = this.W, H = this.H, u = this.u();
    this.logo(c, W / 2, H * 0.3, Math.min(150 * u, W / 6.5));
    text(c, 'FUNNY FOOTBALL  •  TOTAL CHAOS  •  NO REFEREE', W / 2, H * 0.3 + 90 * u, 22 * u, '#ffffff', 'center', '#000', 4 * u);
    const blink = 0.6 + 0.4 * Math.sin(this.t * 5);
    c.globalAlpha = blink;
    text(c, Touch.active ? 'TAP TO PLAY' : 'PRESS ENTER / SPACE / (A) TO PLAY', W / 2, H * 0.62, 34 * u, '#ffe066', 'center', '#000', 6 * u);
    c.globalAlpha = 1;
    const tips = ['Hold SHOOT to charge. Captains: fully charge near goal, then release when the ring hits the green circle for a SUPER STRIKE!',
      'Tackle people who don\'t have the ball and the victim\'s team gets a power-up. Crime pays... them.',
      'Grab the ? boxes for rubber chickens, bombs, bees and worse.',
      'Up to 4 gamepads + 2 keyboard players. Everyone can join either team.',
      'Press SHOOT while a pass is on its way for a one-touch PERFECT shot.',
      'Tackle with the ball to do a spin juke and dodge tackles.'];
    const tip = tips[Math.floor(this.t / 5) % tips.length];
    this.panel(c, W / 2 - Math.min(W - 40, 900 * u) / 2, H * 0.74, Math.min(W - 40, 900 * u), 56 * u);
    text(c, '💡 ' + tip, W / 2, H * 0.74 + 28 * u, Math.min(17 * u, (W - 60) / (tip.length * 0.5)), '#fff', 'center', null);
    text(c, 'Click or press any key to enable sound', W / 2, H - 40 * u, 13 * u, 'rgba(255,255,255,0.55)', 'center', null);
  },

  panel(c, x, y, w, h, col = 'rgba(10,12,34,0.85)', border = 'rgba(255,255,255,0.7)') {
    c.fillStyle = col; rrect(c, x, y, w, h, 14 * this.u()); c.fill();
    c.strokeStyle = border; c.lineWidth = 2; c.stroke();
  },
  header(c, str, sub) {
    const W = this.W, u = this.u();
    text(c, str, W / 2, 50 * u, 46 * u, '#ffe066', 'center', '#000', 7 * u);
    if (sub) text(c, sub, W / 2, 92 * u, 18 * u, '#fff', 'center', '#000', 3 * u);
  },
  footer(c, str) { text(c, str, this.W / 2, this.H - 34 * this.u(), 16 * this.u(), 'rgba(255,255,255,0.8)', 'center', '#000', 3); },

  rJoin(c) {
    const W = this.W, H = this.H, u = this.u();
    this.header(c, 'WHO\'S PLAYING?', 'Move your controller LEFT or RIGHT to pick a team. Anyone left in the middle sits out (CPU plays).');
    const colW = Math.min(360 * u, W / 3.2), cx = [W / 2 - colW * 1.05, W / 2, W / 2 + colW * 1.05];
    const top = 130 * u, h = H - top - 210 * u;
    const capL = CAPTAINS.find(x => x.id === this.cfg.capL), capR = CAPTAINS.find(x => x.id === this.cfg.capR);
    const labels = ['LEFT TEAM', 'NOT PLAYING', 'RIGHT TEAM'];
    for (let i = 0; i < 3; i++) {
      this.panel(c, cx[i] - colW / 2, top, colW, h, i === 1 ? 'rgba(20,20,40,0.7)' : (i === 0 ? shade(capL.color, -0.6) : shade(capR.color, -0.6)));
      text(c, labels[i], cx[i], top + 26 * u, 24 * u, i === 1 ? '#aaa' : '#fff', 'center', '#000', 4 * u);
    }
    const devs = this.joinDevices();
    const counts = [0, 0, 0];
    devs.forEach(id => {
      const col = this.sides[id] + 1, d = Input.devices[id];
      const y = top + 60 * u + counts[col]++ * 52 * u;
      const color = HUMAN_COLORS[Input.order.indexOf(id)];
      const bw = colW * 0.82;
      c.fillStyle = color; rrect(c, cx[col] - bw / 2, y, bw, 42 * u, 10 * u); c.fill();
      c.strokeStyle = '#000'; c.lineWidth = 3; c.stroke();
      const icon = d.kind === 'pad' ? '🎮' : d.kind === 'touch' ? '📱' : '⌨️';
      drawEmoji(c, icon, cx[col] - bw / 2 + 24 * u, y + 21 * u, 26 * u);
      text(c, `P${Input.order.indexOf(id) + 1}  ${d.name.toUpperCase()}`, cx[col] + 12 * u, y + 22 * u, 18 * u, '#fff', 'center', '#000', 4 * u);
      if (col > 0) text(c, '◀', cx[col] - bw / 2 - 12 * u, y + 21 * u, 18 * u, '#fff', 'center', '#000', 3);
      if (col < 2) text(c, '▶', cx[col] + bw / 2 + 12 * u, y + 21 * u, 18 * u, '#fff', 'center', '#000', 3);
    });
    const nL = devs.filter(id => this.sides[id] < 0).length, nR = devs.filter(id => this.sides[id] > 0).length;
    const mode = !nL && !nR ? 'CPU vs CPU — sit back and enjoy the violence' : (nL && nR ? 'VERSUS! May the least sensible win.' : (nL + nR > 1 ? 'CO-OP vs CPU!' : 'YOU vs CPU'));
    text(c, mode, W / 2, top + h + 26 * u, 22 * u, '#7CFC00', 'center', '#000', 4 * u);
    // controls card
    const cw = Math.min(W - 30, 1100 * u), ch = 120 * u, cy = H - ch - 56 * u;
    this.panel(c, W / 2 - cw / 2, cy, cw, ch);
    const rows = [['', 'MOVE', 'PASS / SWITCH', 'SHOOT (HOLD)', 'TACKLE / JUKE', 'ITEM'],
      ['Keyboard 1', ...Object.values(KB_LAYOUTS.kb1.help)], ['Keyboard 2', ...Object.values(KB_LAYOUTS.kb2.help)], ['Gamepad', ...Object.values(PAD_HELP)]];
    rows.forEach((r, ri) => r.forEach((s, ci) => {
      const x = W / 2 - cw / 2 + cw * (0.08 + ci * 0.168);
      text(c, s, x, cy + 20 * u + ri * 26 * u, (ri === 0 ? 14 : 14) * u, ri === 0 ? '#ffe066' : (ci === 0 ? '#9cf' : '#fff'), 'center', null, 0, ri === 0 ? FONT : FONT_UI);
    }));
    this.footer(c, 'CONFIRM: Enter / Shoot / (A)      BACK: Esc / (B)');
  },

  rCap(c) {
    const W = this.W, H = this.H, u = this.u();
    const left = this.screen === 'capL';
    const key = left ? 'capL' : 'capR';
    const cap = CAPTAINS.find(x => x.id === this.cfg[key]);
    const humans = Input.order.filter(id => (id === 'kb1' || id === 'kb2' || Input.devices[id].connected) && this.sides[id] === (left ? -1 : 1));
    this.header(c, left ? 'LEFT TEAM CAPTAIN' : 'RIGHT TEAM CAPTAIN', humans.length ? `Controlled by ${humans.map(h => 'P' + (Input.order.indexOf(h) + 1)).join(' + ')}` : 'CPU team — pick their poison');
    const narrow = W < 900;
    // big portrait
    const px = narrow ? W / 2 : W * 0.27, py = narrow ? H * 0.43 : H * 0.62;
    const ps = (narrow ? 3.2 : 4.4) * u;
    ellipse(c, px, py, 70 * ps / 2.2, 18 * ps / 2.2, 'rgba(0,0,0,0.4)');
    const pk = left ? cap.color : (this.cfg.capL === cap.id || colorDist(CAPTAINS.find(x => x.id === this.cfg.capL).color, cap.color) < 110 ? cap.alt : cap.color);
    drawCharacter(c, portraitDesc(cap, 'captain', pk, this.t, { face: left ? 0.35 : Math.PI - 0.35, moving: 0.4, expr: Math.sin(this.t * 1.3) > 0.7 ? 'grit' : 'happy', dance: false }), px, py, ps);
    // sidekicks
    for (let i = 0; i < 2; i++) drawCharacter(c, portraitDesc(cap, 'sidekick', pk, this.t + i, { face: left ? 0.2 : Math.PI - 0.2, expr: 'normal', moving: 0.5 }), px + (i ? 1 : -1) * 70 * ps / 2, py - 6 * u, ps * 0.48);
    if (!narrow) {
      text(c, cap.name.toUpperCase(), px, py + 40 * u, 32 * u, '#fff', 'center', '#000', 5 * u);
      text(c, `"${cap.nick}"`, px, py + 72 * u, 18 * u, '#ffe066', 'center', '#000', 3 * u);
    }
    // info + grid
    const gx = narrow ? 20 * u : W * 0.5, gw = narrow ? W - 40 * u : W * 0.46, gy = narrow ? H * 0.5 : 120 * u;
    if (narrow) { text(c, cap.name.toUpperCase(), W / 2, gy + 12 * u, 26 * u, '#fff', 'center', '#000', 4 * u); }
    const iy = gy + (narrow ? 30 * u : 0);
    this.panel(c, gx, iy, gw, 150 * u);
    text(c, cap.team.toUpperCase(), gx + 16 * u, iy + 22 * u, 20 * u, cap.color2, 'left', '#000', 4 * u);
    wrapText(c, cap.blurb, gx + 16 * u, iy + 48 * u, gw - 32 * u, 15 * u, '#fff');
    const stats = [['SPEED', cap.speed / 1.25], ['POWER', cap.power / 1.3], ['TACKLE', cap.tackle / 1.45], ['SIZE', cap.size / 1.35]];
    stats.forEach(([n, v], i) => {
      const sx = gx + 16 * u + (i % 2) * (gw / 2), sy = iy + 92 * u + Math.floor(i / 2) * 22 * u;
      text(c, n, sx, sy, 13 * u, '#aaa', 'left', null, 0, FONT);
      c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(sx + 64 * u, sy - 5 * u, gw / 2 - 100 * u, 10 * u);
      c.fillStyle = cap.color; c.fillRect(sx + 64 * u, sy - 5 * u, (gw / 2 - 100 * u) * clamp(v, 0.1, 1), 10 * u);
    });
    text(c, `SUPER: ${cap.superName}`, gx + gw / 2, iy + 140 * u, 15 * u, '#ff8fd0', 'center', '#000', 3 * u);
    // grid
    const cols = 4, cw = (gw - 30 * u) / cols, chh = Math.min(cw * 0.95, (H - iy - 230 * u) / 2);
    const gy2 = iy + 165 * u;
    CAPTAINS.forEach((cp, i) => {
      const x = gx + (i % cols) * (cw + 10 * u), y = gy2 + Math.floor(i / cols) * (chh + 10 * u);
      const sel = cp.id === cap.id;
      c.fillStyle = sel ? cp.color : 'rgba(255,255,255,0.08)'; rrect(c, x, y, cw, chh, 12 * u); c.fill();
      c.strokeStyle = sel ? '#ffe066' : 'rgba(255,255,255,0.3)'; c.lineWidth = sel ? 4 : 2; c.stroke();
      c.save(); c.beginPath(); rrect(c, x, y, cw, chh, 12 * u); c.clip();
      drawCharacter(c, portraitDesc(cp, 'captain', cp.color, this.t + i, { expr: sel ? 'happy' : 'normal', face: 0.4, moving: sel ? 0.6 : 0 }), x + cw / 2, y + chh * 0.98, chh / 82);
      c.restore();
      text(c, cp.short.toUpperCase(), x + cw / 2, y + chh - 12 * u, Math.min(15 * u, cw / (cp.short.length * 0.7)), '#fff', 'center', '#000', 3 * u);
    });
    if (floatSel && floatSel.t < 1.2) { floatSel.t += 1 / 60; }
    this.footer(c, 'ARROWS / STICK: browse     CONFIRM: pick     ITEM: random     BACK: Esc / (B)');
  },

  rStadium(c) {
    const W = this.W, H = this.H, u = this.u();
    this.header(c, 'PICK A STADIUM', 'Each venue has its own walls, hazards and questionable safety record.');
    const st = STADIUMS.find(s => s.id === this.cfg.stadium);
    const n = STADIUMS.length;
    const cw = Math.min(220 * u, (W - 40 * u) / n - 12 * u), chh = cw * 1.25;
    const x0 = W / 2 - (n * (cw + 12 * u) - 12 * u) / 2, y0 = 140 * u;
    STADIUMS.forEach((s, i) => {
      const x = x0 + i * (cw + 12 * u), sel = s === st, y = y0 - (sel ? 12 * u : 0);
      const g = c.createLinearGradient(0, y, 0, y + chh); g.addColorStop(0, s.bg); g.addColorStop(0.45, s.bg2); g.addColorStop(0.46, s.grassA); g.addColorStop(1, s.grassB);
      c.fillStyle = g; rrect(c, x, y, cw, chh, 14 * u); c.fill();
      c.strokeStyle = sel ? '#ffe066' : 'rgba(255,255,255,0.4)'; c.lineWidth = sel ? 5 : 2; c.stroke();
      const icon = { lightning: '⚡', meteor: '☄️', penguin: '🐧', cow: '🐄', ufo: '🛸' }[s.hazard];
      drawEmoji(c, icon, x + cw / 2, y + chh * 0.42 + Math.sin(this.t * 3 + i) * 5 * u, cw * 0.45);
      text(c, s.name.toUpperCase(), x + cw / 2, y + chh - 22 * u, Math.min(17 * u, cw / (s.name.length * 0.58)), '#fff', 'center', '#000', 4 * u);
    });
    const py = y0 + chh + 30 * u, pw = Math.min(W - 40, 760 * u);
    this.panel(c, W / 2 - pw / 2, py, pw, 130 * u);
    text(c, st.name.toUpperCase(), W / 2, py + 28 * u, 30 * u, st.wall, 'center', '#000', 5 * u);
    text(c, st.desc, W / 2, py + 62 * u, 17 * u, '#fff', 'center', null, 0, FONT_UI);
    const wallTxt = { zap: 'Electrified walls ZAP anyone tackled into them.', burn: 'Lava-rock walls leave you extra crispy.', snow: 'Snowbank walls. Ice pitch: players slide everywhere!', hay: 'Hay-bale walls bounce you right back. BOING!' }[st.wallFx];
    text(c, wallTxt + (st.grav < 1 ? ' Low gravity: the ball floats!' : ''), W / 2, py + 96 * u, 15 * u, '#9cf', 'center', null, 0, FONT_UI);
    this.footer(c, 'LEFT / RIGHT: browse     CONFIRM: pick     ITEM: random     BACK: Esc / (B)');
  },

  rOptions(c) {
    const W = this.W, H = this.H, u = this.u();
    this.header(c, 'MATCH RULES', 'There are no rules. Except these ones.');
    const rows = this.optionRows();
    const rw = Math.min(W - 40, 640 * u), rh = 48 * u, x = W / 2 - rw / 2, y0 = 130 * u;
    rows.forEach((r, i) => {
      const y = y0 + i * (rh + 10 * u), sel = i === this.optSel;
      if (r.start) {
        const pulse = sel ? 1 + 0.04 * Math.sin(this.t * 8) : 1;
        c.save(); c.translate(W / 2, y + rh / 2 + 10 * u); c.scale(pulse, pulse);
        c.fillStyle = sel ? '#51cf66' : '#2b8a3e'; rrect(c, -rw / 2, -rh / 2 - 6 * u, rw, rh + 12 * u, 14 * u); c.fill();
        c.strokeStyle = sel ? '#ffe066' : '#000'; c.lineWidth = 4; c.stroke();
        text(c, '⚽  KICK OFF!  ⚽', 0, 0, 30 * u, '#fff', 'center', '#000', 5 * u);
        c.restore();
        return;
      }
      this.panel(c, x, y, rw, rh, sel ? 'rgba(255,224,102,0.22)' : 'rgba(10,12,34,0.85)', sel ? '#ffe066' : 'rgba(255,255,255,0.4)');
      text(c, r.label.toUpperCase(), x + 20 * u, y + rh / 2, 19 * u, '#fff', 'left', '#000', 3 * u);
      const obj = r.opt ? this.opts : this.cfg;
      text(c, `◀  ${r.fmt(obj[r.key])}  ▶`, x + rw - 20 * u, y + rh / 2, 19 * u, sel ? '#ffe066' : '#9cf', 'right', '#000', 3 * u);
    });
    const capL = CAPTAINS.find(x => x.id === this.cfg.capL), capR = CAPTAINS.find(x => x.id === this.cfg.capR), st = STADIUMS.find(s => s.id === this.cfg.stadium);
    text(c, `${capL.team}  vs  ${capR.team}  @  ${st.name}`, W / 2, H - 70 * u, 18 * u, '#fff', 'center', '#000', 3 * u);
    this.footer(c, 'UP / DOWN: choose     LEFT / RIGHT: change     CONFIRM on KICK OFF to play');
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
    c.fillStyle = 'rgba(5,6,20,0.7)'; c.fillRect(0, 0, W, H);
    text(c, 'PAUSED', W / 2, H * 0.28, 80 * u, '#ffe066', 'center', '#000', 10 * u);
    text(c, 'The players are using this time to cry.', W / 2, H * 0.28 + 56 * u, 18 * u, '#fff', 'center', '#000', 3);
    ['RESUME', 'RESTART MATCH', 'QUIT TO MENU'].forEach((s, i) => {
      const sel = i === this.pauseSel, y = H * 0.48 + i * 62 * u, w = 360 * u;
      this.panel(c, W / 2 - w / 2, y - 24 * u, w, 48 * u, sel ? 'rgba(255,224,102,0.25)' : 'rgba(10,12,34,0.85)', sel ? '#ffe066' : 'rgba(255,255,255,0.4)');
      text(c, s, W / 2, y, 24 * u, sel ? '#ffe066' : '#fff', 'center', '#000', 4 * u);
    });
    text(c, 'N: mute    M: music    ESC: resume', W / 2, H - 40 * u, 15 * u, 'rgba(255,255,255,0.7)', 'center', null);
  },

  rResults(c) {
    const R = this.resultMatch, W = this.W, H = this.H, u = this.u();
    const S = R.stadium;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, S.bg); g.addColorStop(1, S.bg2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(6,8,26,0.55)'; c.fillRect(0, 0, W, H);
    // confetti
    for (let i = 0; i < 60; i++) {
      const x = (i * 137.5 + this.t * 40 * (1 + i % 3)) % W, y = (i * 91 + this.t * 80 * (1 + i % 4)) % H;
      c.fillStyle = ['#ff6b6b', '#ffd43b', '#4dabf7', '#51cf66', '#f783ac'][i % 5]; c.save(); c.translate(x, y); c.rotate(this.t * 3 + i); c.fillRect(-5, -2.5, 10, 5); c.restore();
    }
    const [A, B] = R.teams;
    const win = R.winner;
    text(c, win ? `${win.name.toUpperCase()} WIN!` : 'IT\'S A DRAW!', W / 2, 56 * u, Math.min(54 * u, W / 16), '#ffe066', 'center', '#000', 8 * u);
    // captains
    for (const [t, sd] of [[A, -1], [B, 1]]) {
      const x = W / 2 + sd * Math.min(W * 0.3, 330 * u), y = H * 0.5;
      const won = win === t, lost = win && win !== t;
      ellipse(c, x, y, 60 * u, 16 * u, 'rgba(0,0,0,0.4)');
      drawCharacter(c, portraitDesc(t.cap, 'captain', t.kit, this.t, { face: sd < 0 ? 0.3 : Math.PI - 0.3, expr: won ? 'happy' : lost ? 'hurt' : 'normal', armsUp: won, dance: won, lying: lost, lyingDir: sd }), x, y, 3.4 * u);
      text(c, String(t.score), x, y + 50 * u, 64 * u, '#fff', 'center', '#000', 8 * u);
      text(c, t.cap.short.toUpperCase(), x, y + 96 * u, 22 * u, t.kit2, 'center', '#000', 4 * u);
      if (won) drawEmoji(c, '🏆', x, y - 250 * u + Math.sin(this.t * 4) * 8 * u, 70 * u);
    }
    // awards
    const all = R.all;
    const top = (f) => all.reduce((b, p) => (f(p) > f(b) ? p : b), all[0]);
    const awards = [
      ['👟 GOLDEN BOOT', top(p => p.stats.goals), p => `${p.stats.goals} goal${p.stats.goals === 1 ? '' : 's'}`],
      ['🦵 MOST VIOLENT', top(p => p.stats.tackles), p => `${p.stats.tackles} tackles`],
      ['🤕 CRASH TEST DUMMY', top(p => p.stats.knocked), p => `flattened ${p.stats.knocked}x`],
      ['🧤 STICKY GLOVES', top(p => p.stats.saves), p => `${p.stats.saves} saves`],
      ['😈 DIRTIEST PLAYER', top(p => p.stats.cheap), p => `${p.stats.cheap} cheap shots`],
      ['🎁 ITEM HOARDER', top(p => p.stats.items), p => `${p.stats.items} items used`],
    ].filter(a => { const v = a[2](a[1]); return !/^0 |^flattened 0x/.test(v); });
    const aw = Math.min(W - 40, 440 * u), ax = W / 2 - aw / 2, ay = 110 * u;
    if (awards.length) {
      this.panel(c, ax, ay, aw, 30 * u + awards.length * 30 * u);
      awards.forEach(([t, p, f], i) => {
        text(c, t, ax + 14 * u, ay + 26 * u + i * 30 * u, 16 * u, '#ffe066', 'left', '#000', 3);
        text(c, `${p.name} (${f(p)})`, ax + aw - 14 * u, ay + 26 * u + i * 30 * u, 14 * u, '#fff', 'right', null, 0, FONT_UI);
      });
    }
    ['REMATCH', 'CHANGE TEAMS', 'MAIN MENU'].forEach((s, i) => {
      const sel = i === this.resSel, bw = Math.min(220 * u, (W - 60) / 3), x = W / 2 + (i - 1) * (bw + 16 * u), y = H - 70 * u;
      this.panel(c, x - bw / 2, y - 24 * u, bw, 48 * u, sel ? 'rgba(81,207,102,0.5)' : 'rgba(10,12,34,0.85)', sel ? '#ffe066' : 'rgba(255,255,255,0.4)');
      text(c, s, x, y, 20 * u, sel ? '#ffe066' : '#fff', 'center', '#000', 4 * u);
    });
  },
};
let floatSel = null;

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
