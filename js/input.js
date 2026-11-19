// ============================================================================
//  Input: two keyboard layouts + up to 4 gamepads + touch, unified per device
// ============================================================================

const KB_LAYOUTS = {
  kb1: {
    name: 'Keyboard 1', short: 'KEYS 1',
    up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    pass: ['KeyF', 'KeyJ'], shoot: ['KeyG', 'KeyK', 'Space'], tackle: ['KeyH', 'KeyL'], item: ['KeyR', 'KeyI'],
    start: ['Enter'],
    help: { move: 'W A S D', pass: 'F / J', shoot: 'G / K / Space', tackle: 'H / L', item: 'R / I' },
  },
  kb2: {
    name: 'Keyboard 2', short: 'KEYS 2',
    up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    pass: ['Comma', 'Numpad1'], shoot: ['Period', 'Numpad2'], tackle: ['Slash', 'Numpad3'], item: ['Quote', 'Numpad0', 'ShiftRight'],
    start: ['NumpadEnter'],
    help: { move: 'ARROWS', pass: ', / Num1', shoot: '. / Num2', tackle: '/ / Num3', item: "' / Num0" },
  },
};
const PAD_HELP = { move: 'Stick / D-pad', pass: 'A', shoot: 'B', tackle: 'X', item: 'Y / RB' };
const TOUCH_HELP = { move: 'Left thumb', pass: 'PASS', shoot: 'SHOOT', tackle: 'TACKLE', item: 'ITEM' };
const BTN_NAMES = ['pass', 'shoot', 'tackle', 'item', 'start'];

const Keys = { down: new Set(), pressed: new Set() };
const GAME_CODES = new Set();
for (const k in KB_LAYOUTS) for (const a in KB_LAYOUTS[k]) if (Array.isArray(KB_LAYOUTS[k][a])) KB_LAYOUTS[k][a].forEach(c => GAME_CODES.add(c));
['Escape', 'KeyP', 'Backspace', 'KeyM', 'KeyN', 'Tab'].forEach(c => GAME_CODES.add(c));

window.addEventListener('keydown', e => {
  if (GAME_CODES.has(e.code)) e.preventDefault();
  if (!Keys.down.has(e.code)) Keys.pressed.add(e.code);
  Keys.down.add(e.code);
  SFX.init();
});
window.addEventListener('keyup', e => { Keys.down.delete(e.code); });
window.addEventListener('blur', () => Keys.down.clear());

// ---------------- touch controls ----------------
const Touch = {
  active: false, stick: null, buttons: {}, // buttons[name] = touchId
  taps: {}, tapPending: null,
  stickVec: { x: 0, y: 0 },
  layout(W, H) {
    const r = Math.min(W, H) * 0.085;
    const bx = W - r * 1.6, by = H - r * 1.7;
    return {
      stickR: Math.min(W, H) * 0.13,
      btns: {
        shoot: { x: bx, y: by, r: r * 1.05, label: 'SHOOT', color: '#ff5c5c' },
        pass: { x: bx - r * 2.3, y: by + r * 0.5, r: r * 0.9, label: 'PASS', color: '#4dabf7' },
        tackle: { x: bx - r * 0.4, y: by - r * 2.2, r: r * 0.85, label: 'TACKLE', color: '#ffd43b' },
        item: { x: bx - r * 2.6, y: by - r * 1.6, r: r * 0.75, label: 'ITEM', color: '#b197fc' },
      },
    };
  },
};
function touchPos(t) { return { x: t.clientX, y: t.clientY }; }
function handleTouch(e) {
  e.preventDefault();
  SFX.init();
  Touch.active = true;
  const L = Touch.layout(window.innerWidth, window.innerHeight);
  const ids = new Set();
  for (const t of e.changedTouches) {
    if (e.type === 'touchstart') Touch.taps[t.identifier] = { x: t.clientX, y: t.clientY, t: performance.now() };
    else if (e.type === 'touchend') {
      const s = Touch.taps[t.identifier];
      if (s && Math.hypot(t.clientX - s.x, t.clientY - s.y) < 20 && performance.now() - s.t < 400) Touch.tapPending = { x: s.x, y: s.y };
      delete Touch.taps[t.identifier];
    } else if (e.type === 'touchcancel') delete Touch.taps[t.identifier];
  }
  for (const t of e.touches) {
    ids.add(t.identifier);
    const p = touchPos(t);
    if (Touch.stick && Touch.stick.id === t.identifier) {
      const dx = p.x - Touch.stick.ox, dy = p.y - Touch.stick.oy, d = Math.hypot(dx, dy), R = L.stickR;
      Touch.stick.x = p.x; Touch.stick.y = p.y;
      Touch.stickVec.x = d > 4 ? dx / Math.max(d, R) : 0; Touch.stickVec.y = d > 4 ? dy / Math.max(d, R) : 0;
      continue;
    }
    let owned = false;
    for (const n in Touch.buttons) if (Touch.buttons[n] === t.identifier) owned = true;
    if (owned) continue;
    // new touch
    let hit = null;
    for (const n in L.btns) { const b = L.btns[n]; if (Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.25) hit = n; }
    if (hit) Touch.buttons[hit] = t.identifier;
    else if (!Touch.stick && p.x < window.innerWidth * 0.55) Touch.stick = { id: t.identifier, ox: p.x, oy: p.y, x: p.x, y: p.y };
  }
  if (Touch.stick && !ids.has(Touch.stick.id)) { Touch.stick = null; Touch.stickVec.x = Touch.stickVec.y = 0; }
  for (const n in Touch.buttons) if (!ids.has(Touch.buttons[n])) delete Touch.buttons[n];
}
['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(ev => window.addEventListener(ev, handleTouch, { passive: false }));

// ---------------- unified devices ----------------
function mkBtn() { return { down: false, pressed: false, released: false }; }
function mkDev(id, name, short, kind) {
  const d = { id, name, short, kind, connected: kind === 'kb', mx: 0, my: 0, navX: 0, navY: 0, _nav: { x: 0, y: 0, t: 0 }, lastActive: 0 };
  BTN_NAMES.forEach(b => d[b] = mkBtn());
  return d;
}

const Input = {
  devices: {
    kb1: mkDev('kb1', 'Keyboard 1', 'KEYS 1', 'kb'),
    kb2: mkDev('kb2', 'Keyboard 2', 'KEYS 2', 'kb'),
    pad0: mkDev('pad0', 'Gamepad 1', 'PAD 1', 'pad'),
    pad1: mkDev('pad1', 'Gamepad 2', 'PAD 2', 'pad'),
    pad2: mkDev('pad2', 'Gamepad 3', 'PAD 3', 'pad'),
    pad3: mkDev('pad3', 'Gamepad 4', 'PAD 4', 'pad'),
    touch: mkDev('touch', 'Touch', 'TOUCH', 'touch'),
  },
  order: ['kb1', 'kb2', 'pad0', 'pad1', 'pad2', 'pad3', 'touch'],
  global: { pause: false, back: false, mute: false, music: false },
  time: 0,

  help(id) { return id.startsWith('kb') ? KB_LAYOUTS[id].help : id === 'touch' ? TOUCH_HELP : PAD_HELP; },

  _setBtn(b, isDown) { b.pressed = isDown && !b.down; b.released = !isDown && b.down; b.down = isDown; },

  update(dt) {
    this.time += dt;
    const any = codes => codes.some(c => Keys.down.has(c) || Keys.pressed.has(c)); // count sub-frame taps
    // keyboards
    for (const id of ['kb1', 'kb2']) {
      const L = KB_LAYOUTS[id], d = this.devices[id];
      let x = (any(L.right) ? 1 : 0) - (any(L.left) ? 1 : 0), y = (any(L.down) ? 1 : 0) - (any(L.up) ? 1 : 0);
      if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      d.mx = x; d.my = y;
      for (const b of BTN_NAMES) this._setBtn(d[b], any(L[b]));
      if (x || y || BTN_NAMES.some(b => d[b].down)) d.lastActive = this.time;
    }
    // gamepads
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < 4; i++) {
      const d = this.devices['pad' + i], gp = pads[i];
      d.connected = !!(gp && gp.connected);
      if (!d.connected) { d.mx = d.my = 0; BTN_NAMES.forEach(b => this._setBtn(d[b], false)); continue; }
      let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      const B = n => !!(gp.buttons[n] && gp.buttons[n].pressed);
      if (B(14)) ax = -1; if (B(15)) ax = 1; if (B(12)) ay = -1; if (B(13)) ay = 1;
      const mag = Math.hypot(ax, ay);
      if (mag < 0.22) { ax = 0; ay = 0; } else if (mag > 1) { ax /= mag; ay /= mag; }
      d.mx = ax; d.my = ay;
      this._setBtn(d.pass, B(0)); this._setBtn(d.shoot, B(1) || B(7)); this._setBtn(d.tackle, B(2) || B(6));
      this._setBtn(d.item, B(3) || B(5) || B(4)); this._setBtn(d.start, B(9));
      if (mag > 0.3 || gp.buttons.some(b => b.pressed)) d.lastActive = this.time;
    }
    // touch
    {
      const d = this.devices.touch;
      d.connected = Touch.active;
      d.mx = Touch.stickVec.x; d.my = Touch.stickVec.y;
      for (const b of BTN_NAMES) this._setBtn(d[b], Touch.buttons[b] !== undefined || (b === 'start' && !!Touch.tapPending));
      if (Touch.stick || Object.keys(Touch.buttons).length) d.lastActive = this.time;
    }
    // menu navigation edges with key-repeat
    for (const id of this.order) {
      const d = this.devices[id];
      d.navX = 0; d.navY = 0;
      const nx = Math.abs(d.mx) > 0.5 ? Math.sign(d.mx) : 0, ny = Math.abs(d.my) > 0.5 ? Math.sign(d.my) : 0;
      const n = d._nav;
      if (nx !== n.x || ny !== n.y) { d.navX = nx; d.navY = ny; n.t = 0.38; }
      else if (nx || ny) { n.t -= dt; if (n.t <= 0) { d.navX = nx; d.navY = ny; n.t = 0.11; } }
      n.x = nx; n.y = ny;
    }
    this.global.pause = Keys.pressed.has('Escape') || Keys.pressed.has('KeyP') || this.order.some(id => this.devices[id].kind === 'pad' && this.devices[id].start.pressed);
    const tp = Touch.tapPending;
    if (tp && tp.x < 70 && tp.y < 70) this.global.pause = true;
    Touch.tapPending = null;
    this.global.back = Keys.pressed.has('Escape') || Keys.pressed.has('Backspace');
    this.global.mute = Keys.pressed.has('KeyN');
    this.global.music = Keys.pressed.has('KeyM');
  },
  endFrame() { Keys.pressed.clear(); },

  // menu helpers: aggregate across all devices
  navX() { let v = 0; for (const id of this.order) v = v || this.devices[id].navX; return v; },
  navY() { let v = 0; for (const id of this.order) v = v || this.devices[id].navY; return v; },
  confirm() {
    if (Keys.pressed.has('Enter') || Keys.pressed.has('NumpadEnter')) return true;
    return this.order.some(id => {
      const d = this.devices[id];
      if (d.kind === 'pad') return d.pass.pressed || d.start.pressed;
      return d.shoot.pressed || d.start.pressed || (d.kind === 'touch' && d.pass.pressed);
    });
  },
  back() {
    if (this.global.back) return true;
    return this.order.some(id => { const d = this.devices[id]; return d.kind === 'pad' && d.shoot.pressed; });
  },
  randomPressed() { return this.order.some(id => this.devices[id].item.pressed); },
};
