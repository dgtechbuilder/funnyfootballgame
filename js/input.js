// ============================================================================
//  Input: two keyboard layouts + up to 4 gamepads + touch, unified per device
// ============================================================================

const KB_LAYOUTS = {
  kb1: {
    name: 'Keyboard 1', short: 'KEYS 1',
    up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    pass: ['KeyF', 'KeyJ'], shoot: ['KeyG', 'KeyK', 'Space'], tackle: ['KeyH', 'KeyL'], item: ['KeyR', 'KeyI'], ability: ['KeyQ', 'KeyU'], dodge: ['KeyE', 'KeyO'],
    start: ['Enter'],
    help: { move: 'W A S D', pass: 'F / J', shoot: 'G / K / Space', tackle: 'H / L', item: 'R / I', ability: 'Q / U', dodge: 'E / O' },
  },
  kb2: {
    name: 'Keyboard 2', short: 'KEYS 2',
    up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    pass: ['Comma', 'Numpad1'], shoot: ['Period', 'Numpad2'], tackle: ['Slash', 'Numpad3'], item: ['Quote', 'Numpad0', 'ShiftRight'], ability: ['Semicolon', 'Numpad4'], dodge: ['BracketRight', 'Numpad5'],
    start: ['NumpadEnter'],
    help: { move: 'ARROWS', pass: ', / Num1', shoot: '. / Num2', tackle: '/ / Num3', item: "' / Num0", ability: '; / Num4', dodge: '] / Num5' },
  },
};
const PAD_HELP = { move: 'Stick / D-pad', pass: 'A / ✕', shoot: 'B / ○ / RT', tackle: 'X / □ / LT', item: 'Y / △', ability: 'LB / L1', dodge: 'RB / R1' };
const TOUCH_HELP = { move: 'Left thumb', pass: 'PASS', shoot: 'SHOOT', tackle: 'TACKLE', item: 'ITEM', ability: 'POWER', dodge: 'DODGE' };
const BTN_NAMES = ['pass', 'shoot', 'tackle', 'item', 'ability', 'dodge', 'start'];

const Keys = { down: new Set(), pressed: new Set() };
const GAME_CODES = new Set();
['Escape', 'KeyP', 'Backspace', 'KeyM', 'KeyN', 'Tab'].forEach(c => GAME_CODES.add(c));

// ---------------- remappable keyboard controls ----------------
const KB_ACTIONS = ['up', 'down', 'left', 'right', 'pass', 'shoot', 'tackle', 'item', 'ability', 'dodge'];
const ACTION_NAMES = { up: 'MOVE UP', down: 'MOVE DOWN', left: 'MOVE LEFT', right: 'MOVE RIGHT', pass: 'PASS / SWITCH', shoot: 'SHOOT (HOLD)', tackle: 'TACKLE / JUKE', item: 'USE ITEM', ability: 'POWER', dodge: 'DODGE', start: 'PAUSE' };
const RESERVED_KEYS = new Set(['Escape', 'KeyP', 'KeyN', 'KeyM', 'Tab', 'Backspace', 'Enter', 'NumpadEnter', 'MetaLeft', 'MetaRight']);
const KB_DEFAULTS = {};
for (const k in KB_LAYOUTS) { KB_DEFAULTS[k] = {}; for (const a of KB_ACTIONS) KB_DEFAULTS[k][a] = KB_LAYOUTS[k][a].slice(); }
let KEY_MAPS = {};
try { KEY_MAPS = JSON.parse(localStorage.getItem('monate-keymaps') || '{}') || {}; } catch (e) { KEY_MAPS = {}; }
const KEY_NAMES = { Space: 'Space', Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Quote: "'", Semicolon: ';', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'L-Alt', AltRight: 'R-Alt', CapsLock: 'Caps' };
function keyLabel(code) {
  if (!code) return '—';
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return 'Num' + code.slice(6).replace('Decimal', '.').replace('Add', '+').replace('Subtract', '-').replace('Multiply', '*').replace('Divide', '/');
  return code;
}
function applyKeyMaps() {
  for (const k in KB_LAYOUTS) {
    const L = KB_LAYOUTS[k], m = KEY_MAPS[k] || {};
    for (const a of KB_ACTIONS) L[a] = (m[a] && m[a].length ? m[a] : KB_DEFAULTS[k][a]).slice();
    const j = a => L[a].map(keyLabel).join(' / ') || '—';
    L.help = { move: [L.up[0], L.left[0], L.down[0], L.right[0]].map(keyLabel).join(' '), pass: j('pass'), shoot: j('shoot'), tackle: j('tackle'), item: j('item'), ability: j('ability'), dodge: j('dodge') };
    for (const a in L) if (Array.isArray(L[a])) L[a].forEach(c => GAME_CODES.add(c));
  }
}
function saveKeyMaps() { try { localStorage.setItem('monate-keymaps', JSON.stringify(KEY_MAPS)); } catch (e) { /* ignore */ } }
// bind `code` to kb/action; whoever had that key before (on either keyboard) gets this action's old key
function setKey(kb, action, code) {
  const old = KB_LAYOUTS[kb][action].slice();
  for (const k in KB_LAYOUTS) for (const a of KB_ACTIONS) {
    if ((k === kb && a === action) || !KB_LAYOUTS[k][a].includes(code)) continue;
    let rest = KB_LAYOUTS[k][a].filter(c => c !== code);
    if (!rest.length) rest = k === kb ? old.filter(c => c !== code).slice(0, 1) : [];
    KEY_MAPS[k] = KEY_MAPS[k] || {}; KEY_MAPS[k][a] = rest;
  }
  KEY_MAPS[kb] = KEY_MAPS[kb] || {}; KEY_MAPS[kb][action] = [code];
  applyKeyMaps(); saveKeyMaps();
}
function resetKeys(kb) { delete KEY_MAPS[kb]; applyKeyMaps(); saveKeyMaps(); }
applyKeyMaps();

const inDomUi = e => !!(e.target && e.target.closest && e.target.closest('.dom-ui'));
window.addEventListener('keydown', e => {
  if (inDomUi(e)) return; // typing in a form (e.g. suggest a character)
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
  usedStick: false,
  // Buttons sit on two arcs around SHOOT in the bottom-right corner, every one fully on screen.
  // ITEM only exists while your team is carrying an item (it shows which one), so it can't be pressed by mistake.
  layout(W, H) {
    const m = Math.min(W, H);
    const r = clamp(m * 0.082, 24, 44);          // regular button radius (~50-90px wide: comfortable thumb size)
    const R = r * 1.32;                           // SHOOT is the big one
    const edge = Math.max(10, m * 0.03);
    const sx = W - edge - R, sy = H - edge - R;
    const D = R + r * 1.36;                       // inner arc
    const at = (ang, d) => ({ x: sx + Math.cos(ang) * d, y: sy + Math.sin(ang) * d });
    const item = typeof touchItemKey === 'function' ? touchItemKey() : null;
    const btns = {
      shoot: { x: sx, y: sy, r: R, label: 'SHOOT', color: '#ff5c5c' },
      pass: { ...at(Math.PI, D), r, label: 'PASS', color: '#4dabf7' },
      tackle: { ...at(-Math.PI / 2, D), r, label: 'TACKLE', color: '#ffd43b' },
      dodge: { ...at(-Math.PI * 0.75, D), r: r * 0.86, label: 'DODGE', color: '#63e6be' },
      ability: { x: sx - D - r * 2.2, y: sy + r * 0.1, r, label: 'POWER', color: '#ff922b' },
    };
    if (item) btns.item = { ...at(-Math.PI * 0.75, D + r * 2.05), r: r * 0.95, label: 'USE', color: '#b197fc', item };
    const left = btns.ability.x - r, top = Math.min(btns.tackle.y, btns.item ? btns.item.y : 1e9) - r;
    return { stickR: m * 0.13, btns, w: W - left, h: H - top };
  },
};
function touchPos(t) { return { x: t.clientX, y: t.clientY }; }
function handleTouch(e) {
  if (inDomUi(e)) return;
  e.preventDefault();
  SFX.init();
  Touch.active = true;
  const W = typeof App !== 'undefined' && App.W ? App.W : window.innerWidth, H = typeof App !== 'undefined' && App.H ? App.H : window.innerHeight;
  const L = Touch.layout(W, H);
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
    // new touch: on-screen pad only exists during live play; menus use taps (pointer events)
    const inGame = typeof App !== 'undefined' && App.screen === 'match' && !App.paused;
    if (!inGame) continue;
    let hit = null, best = Infinity;
    for (const n in L.btns) { const b = L.btns[n], d = Math.hypot(p.x - b.x, p.y - b.y) / b.r; if (d < 1.3 && d < best) { best = d; hit = n; } }
    if (hit) Touch.buttons[hit] = t.identifier;
    else if (!Touch.stick && p.x < W * 0.55) { Touch.stick = { id: t.identifier, ox: p.x, oy: p.y, x: p.x, y: p.y }; Touch.usedStick = true; }
  }
  if (Touch.stick && !ids.has(Touch.stick.id)) { Touch.stick = null; Touch.stickVec.x = Touch.stickVec.y = 0; }
  for (const n in Touch.buttons) if (!ids.has(Touch.buttons[n])) delete Touch.buttons[n];
}
['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(ev => window.addEventListener(ev, handleTouch, { passive: false }));

// ---------------- gamepads: families, raw profiles, custom remaps ----------------
// Our layout is positional: PASS = bottom face button, SHOOT = right, TACKLE = left, ITEM = top.
const PAD_FAMILIES = {
  xbox:     { name: 'Xbox Controller',        icon: '🎮', g: { pass: 'A', shoot: 'B', tackle: 'X', item: 'Y', ability: 'LB', dodge: 'RB', start: 'MENU' } },
  ps:       { name: 'PlayStation Controller', icon: '🎮', g: { pass: '✕', shoot: '○', tackle: '□', item: '△', ability: 'L1', dodge: 'R1', start: 'OPTIONS' } },
  switch:   { name: 'Nintendo Switch Pad',    icon: '🎮', g: { pass: 'B', shoot: 'A', tackle: 'Y', item: 'X', ability: 'L', dodge: 'R', start: '+' } },
  eightbitdo: { name: '8BitDo Controller',    icon: '🎮', g: { pass: 'B', shoot: 'A', tackle: 'Y', item: 'X', ability: 'L', dodge: 'R', start: 'START' } },
  logitech: { name: 'Logitech Gamepad',       icon: '🎮', g: { pass: 'A', shoot: 'B', tackle: 'X', item: 'Y', ability: 'LB', dodge: 'RB', start: 'START' } },
  steam:    { name: 'Steam Controller / Deck', icon: '🎮', g: { pass: 'A', shoot: 'B', tackle: 'X', item: 'Y', ability: 'LB', dodge: 'RB', start: 'MENU' } },
  mobile:   { name: 'Phone Controller',        icon: '📱', g: { pass: 'A', shoot: 'B', tackle: 'X', item: 'Y', ability: 'LB', dodge: 'RB', start: 'MENU' } },
  retro:    { name: 'USB Retro Gamepad',       icon: '🕹️', g: { pass: 'B', shoot: 'A', tackle: 'Y', item: 'X', ability: 'L', dodge: 'R', start: 'START' } },
  generic:  { name: 'Generic Gamepad',         icon: '🎮', g: { pass: '1', shoot: '2', tackle: '3', item: '4', ability: '5', dodge: '6', start: 'START' } },
};
function padFamily(id) {
  const s = (id || '').toLowerCase();
  if (/054c|playstation|dualshock|dualsense|sony|ps[345]|^wireless controller/.test(s)) return 'ps';
  if (/057e|nintendo|pro controller|joy-?con/.test(s)) return 'switch';
  if (/2dc8|8bitdo/.test(s)) return 'eightbitdo';
  if (/28de|steam|valve/.test(s)) return 'steam';
  if (/046d|logitech/.test(s)) return 'logitech';
  if (/backbone|kishi|razer|gamesir|mobile/.test(s)) return 'mobile';
  if (/045e|xbox|xinput|microsoft|x-box/.test(s)) return 'xbox';
  if (/0079|0810|0583|dragonrise|snes|retro|twin usb|usb gamepad|usb joystick|ipega/.test(s)) return 'retro';
  return 'generic';
}
// Button layouts for browsers that DON'T report the 'standard' mapping (Firefox, Safari, older drivers).
// face = [bottom, right, left, top]
const RAW_PROFILES = {
  xbox:     { face: [0, 1, 2, 3], start: [7, 9], shoulder: [4, 5], trig: [6, 7], trigAxes: [2, 5] },
  xboxBT:   { face: [0, 1, 3, 4], start: [11], shoulder: [6, 7], trig: [8, 9], trigAxes: [5, 4] },
  steam:    { face: [0, 1, 2, 3], start: [7, 9], shoulder: [4, 5], trig: [6, 7], trigAxes: [2, 5] },
  mobile:   { face: [0, 1, 2, 3], start: [9, 7], shoulder: [4, 5], trig: [6, 7] },
  ps:       { face: [1, 2, 0, 3], start: [9], shoulder: [4, 5], trig: [6, 7] },
  switch:   { face: [0, 1, 2, 3], start: [9], shoulder: [4, 5], trig: [6, 7] },
  logitech: { face: [1, 2, 0, 3], start: [9], shoulder: [4, 5], trig: [6, 7] },
  eightbitdo: { face: [1, 0, 4, 3], start: [11, 9], shoulder: [6, 7], trig: [8, 9] },
  retro:    { face: [2, 1, 3, 0], start: [9], shoulder: [4, 5], trig: [6, 7] },
  generic:  { face: [0, 1, 2, 3], start: [9, 7], shoulder: [4, 5], trig: [6, 7] },
};
const HAT_DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
function readHat(v) { // DirectInput POV hat packed in one axis: -1..1 in 8 steps, ~1.29 when centred
  if (v === undefined || Math.abs(v) > 1.05) return null;
  return HAT_DIRS[clamp(Math.round((v + 1) / (2 / 7)), 0, 7)];
}
let PAD_MAPS = {};
try { PAD_MAPS = JSON.parse(localStorage.getItem('monate-padmaps') || localStorage.getItem('jollof-padmaps') || '{}') || {}; } catch (e) { PAD_MAPS = {}; }
function savePadMaps() { try { localStorage.setItem('monate-padmaps', JSON.stringify(PAD_MAPS)); } catch (e) { /* ignore */ } }
// a bind is {b: buttonIndex} or {a: axisIndex, s: sign} or {a, hat: value}
function bindValue(gp, bind) {
  if (!bind) return 0;
  if (Array.isArray(bind)) return bind.reduce((m, b) => Math.max(m, bindValue(gp, b)), 0);
  if (bind.b !== undefined) { const b = gp.buttons[bind.b]; return b ? (b.pressed ? 1 : b.value || 0) : 0; }
  const v = gp.axes[bind.a];
  if (v === undefined) return 0;
  if (bind.hat !== undefined) return Math.abs(v - bind.hat) < 0.16 ? 1 : 0;
  return clamp(v * bind.s, 0, 1);
}

// Full bind table for a pad: its custom map, or one built from how it is read by default,
// so a single action can be remapped without losing the others (stick + D-pad keep working).
const PAD_ACTIONS = ['up', 'down', 'left', 'right', 'pass', 'shoot', 'tackle', 'item', 'ability', 'dodge', 'start'];
function defaultPadBinds(gp, family) {
  if (gp.mapping === 'standard') return {
    up: [{ a: 1, s: -1 }, { b: 12 }], down: [{ a: 1, s: 1 }, { b: 13 }], left: [{ a: 0, s: -1 }, { b: 14 }], right: [{ a: 0, s: 1 }, { b: 15 }],
    pass: [{ b: 0 }], shoot: [{ b: 1 }, { b: 7 }], tackle: [{ b: 2 }, { b: 6 }], item: [{ b: 3 }], ability: [{ b: 4 }], dodge: [{ b: 5 }], start: [{ b: 9 }],
  };
  let P = RAW_PROFILES[family] || RAW_PROFILES.generic;
  if (family === 'xbox' && gp.buttons.length >= 15) P = RAW_PROFILES.xboxBT;
  const m = { up: [{ a: 1, s: -1 }], down: [{ a: 1, s: 1 }], left: [{ a: 0, s: -1 }], right: [{ a: 0, s: 1 }] };
  if (gp.axes.length > 9) { m.up.push({ a: 9, hat: -1 }); m.right.push({ a: 9, hat: -1 + 4 / 7 }); m.down.push({ a: 9, hat: -1 + 8 / 7 }); m.left.push({ a: 9, hat: -1 + 12 / 7 }); }
  else if (gp.axes.length >= 8) { m.up.push({ a: 7, s: -1 }); m.down.push({ a: 7, s: 1 }); m.left.push({ a: 6, s: -1 }); m.right.push({ a: 6, s: 1 }); }
  if (gp.buttons.length > 15) { m.up.push({ b: 12 }); m.down.push({ b: 13 }); m.left.push({ b: 14 }); m.right.push({ b: 15 }); }
  const f = P.face, tr = k => [{ b: P.trig[k] }].concat(P.trigAxes ? [{ a: P.trigAxes[k], s: 1 }] : []);
  Object.assign(m, { pass: [{ b: f[0] }], shoot: [{ b: f[1] }, ...tr(1)], tackle: [{ b: f[2] }, ...tr(0)], item: [{ b: f[3] }], ability: [{ b: P.shoulder[0] }], dodge: [{ b: P.shoulder[1] }], start: P.start.map(b => ({ b })) });
  return m;
}
function padBinds(gp, family) {
  const c = PAD_MAPS[gp.id];
  if (!c) return defaultPadBinds(gp, family);
  const out = {};
  for (const a of PAD_ACTIONS) out[a] = c[a] ? (Array.isArray(c[a]) ? c[a] : [c[a]]) : [];
  return out;
}
const sameBind = (x, y) => x && y && x.b === y.b && x.a === y.a && x.s === y.s && x.hat === y.hat;
function setPadBind(gp, family, action, bind) {
  const m = padBinds(gp, family), old = m[action];
  for (const a of PAD_ACTIONS) {
    if (a === action || !m[a].some(b => sameBind(b, bind))) continue;
    m[a] = m[a].filter(b => !sameBind(b, bind));
    if (!m[a].length) m[a] = old.filter(b => !sameBind(b, bind));
  }
  m[action] = [bind];
  PAD_MAPS[gp.id] = m; savePadMaps();
}
function resetPad(gp) { delete PAD_MAPS[gp.id]; savePadMaps(); }
const STD_BTN = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'L-Stick', 'R-Stick', 'D↑', 'D↓', 'D←', 'D→', 'Xbox'],
  ps: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', 'D↑', 'D↓', 'D←', 'D→', 'PS'],
  switch: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '−', '+', 'L-Stick', 'R-Stick', 'D↑', 'D↓', 'D←', 'D→', 'Home'],
};
function describeBind(bind, gp, family) {
  if (!bind) return '—';
  if (bind.b !== undefined) {
    const names = gp && gp.mapping === 'standard' ? (STD_BTN[family] || (['eightbitdo', 'retro'].includes(family) ? STD_BTN.switch : STD_BTN.xbox)) : null;
    return names && names[bind.b] ? names[bind.b] : 'Button ' + (bind.b + 1);
  }
  if (bind.hat !== undefined) { const i = clamp(Math.round((bind.hat + 1) / (2 / 7)), 0, 7); return 'D' + ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'][i]; }
  const dir = bind.a % 2 ? (bind.s < 0 ? '↑' : '↓') : (bind.s < 0 ? '←' : '→');
  if (bind.a <= 1) return 'Stick ' + dir;
  if (bind.a <= 3 && gp && gp.mapping === 'standard') return 'R-Stick ' + dir;
  if (bind.a >= 6 && bind.a <= 7) return 'D' + dir;
  return 'Axis ' + (bind.a + 1) + (bind.s < 0 ? '−' : '+');
}
// a human-readable label for one action on one device ('G / K / Space', 'B / RT', 'SHOOT')
function actionLabel(id, action) {
  if (id === 'kb1' || id === 'kb2') return (KB_LAYOUTS[id][action] || []).map(keyLabel).join(' / ') || '—';
  if (id === 'touch') return action === 'up' || action === 'down' || action === 'left' || action === 'right' ? 'Left thumb' : (TOUCH_HELP[action] || action.toUpperCase());
  const d = Input.devices[id], gp = Input.padFor(id);
  if (!gp) return PAD_HELP[action] || '—';
  const bs = padBinds(gp, d.family)[action] || [];
  const seen = []; for (const b of bs) { const n = describeBind(b, gp, d.family); if (!seen.includes(n)) seen.push(n); }
  return seen.join(' / ') || '—';
}

// ---------------- mouse / pointer (menus are fully clickable) ----------------
const Mouse = { x: -1, y: -1, down: false, clicked: false, moved: false, active: false, wheel: 0, type: 'mouse' };
window.addEventListener('pointermove', e => { Mouse.x = e.clientX; Mouse.y = e.clientY; Mouse.moved = true; Mouse.type = e.pointerType; if (e.pointerType === 'mouse') Mouse.active = true; });
window.addEventListener('pointerdown', e => { Mouse.x = e.clientX; Mouse.y = e.clientY; Mouse.down = true; Mouse.type = e.pointerType; if (e.pointerType === 'mouse') Mouse.active = true; SFX.init(); });
window.addEventListener('pointerup', e => { Mouse.x = e.clientX; Mouse.y = e.clientY; if (Mouse.down) Mouse.clicked = true; Mouse.down = false; });
window.addEventListener('wheel', e => { Mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
window.addEventListener('contextmenu', e => e.preventDefault());

// ---------------- unified devices ----------------
function mkBtn() { return { down: false, pressed: false, released: false }; }
function mkDev(id, name, short, kind) {
  const d = { id, name, short, kind, connected: kind === 'kb', mx: 0, my: 0, navX: 0, navY: 0, _nav: { x: 0, y: 0, t: 0 }, lastActive: 0, family: kind === 'pad' ? 'generic' : null, gpId: '', mapping: '' };
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
  glyph(id, btn) { const d = this.devices[id]; return d && d.kind === 'pad' ? PAD_FAMILIES[d.family].g[btn] : null; },
  rumbleOn: true,
  rumble(id, ms = 150, strong = 0.5, weak = 0.5) {
    if (!this.rumbleOn || !id || !id.startsWith('pad')) return;
    const gp = this.padFor(id);
    if (!gp) return;
    try {
      if (gp.vibrationActuator && gp.vibrationActuator.playEffect) gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
      else if (gp.hapticActuators && gp.hapticActuators[0]) gp.hapticActuators[0].pulse(Math.max(strong, weak), ms);
    } catch (e) { /* rumble unsupported */ }
  },
  rumbleAll(ms, s, w) { for (const id of this.order) if (this.devices[id].kind === 'pad' && this.devices[id].connected) this.rumble(id, ms, s, w); },
  onConnect: null,
  rawPads() { try { return navigator.getGamepads ? Array.from(navigator.getGamepads()) : []; } catch (e) { return []; } },
  // Map browser gamepads onto our 4 player slots. Browsers can hand out any index (virtual devices,
  // reconnects), so real controllers simply take the first free slot and keep it until unplugged.
  slotOf: {}, // gamepad.index -> slot
  slotPads() {
    const all = this.rawPads().filter(g => g && g.connected && g.buttons && g.buttons.length >= 4);
    const live = new Set(all.map(g => g.index));
    for (const k in this.slotOf) if (!live.has(+k)) delete this.slotOf[k];
    const out = [null, null, null, null];
    for (const g of all) if (this.slotOf[g.index] !== undefined) out[this.slotOf[g.index]] = g;
    for (const g of all) {
      if (this.slotOf[g.index] !== undefined) continue;
      const free = out.indexOf(null);
      if (free < 0) break;
      this.slotOf[g.index] = free; out[free] = g;
    }
    this.extraPads = Math.max(0, all.length - 4);
    return out;
  },
  padFor(id) { return this.slotPads()[+id.slice(3)] || null; },
  anyPadPressed(id) { const d = this.devices[id]; return d && d.connected && BTN_NAMES.some(b => d[b].pressed); },

  _setBtn(b, isDown) { b.pressed = isDown && !b.down; b.released = !isDown && b.down; b.down = isDown; },

  update(dt) {
    this.time += dt;
    const any = codes => codes.some(c => Keys.down.has(c) || Keys.pressed.has(c)); // count sub-frame taps
    // keyboards
    for (const id of ['kb1', 'kb2']) {
      const L = KB_LAYOUTS[id], d = this.devices[id];
      if (this.capture && this.capture.kb) { d.mx = d.my = 0; BTN_NAMES.forEach(b => this._setBtn(d[b], false)); continue; }
      let x = (any(L.right) ? 1 : 0) - (any(L.left) ? 1 : 0), y = (any(L.down) ? 1 : 0) - (any(L.up) ? 1 : 0);
      if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      d.mx = x; d.my = y;
      for (const b of BTN_NAMES) this._setBtn(d[b], any(L[b]));
      if (x || y || BTN_NAMES.some(b => d[b].down)) d.lastActive = this.time;
    }
    // gamepads
    const pads = this.slotPads();
    for (let i = 0; i < 4; i++) {
      const d = this.devices['pad' + i], gp = pads[i];
      const was = d.connected;
      d.connected = !!(gp && gp.connected);
      if (!d.connected) {
        d.mx = d.my = 0; BTN_NAMES.forEach(b => this._setBtn(d[b], false));
        if (was && this.onConnect) this.onConnect(d, false);
        continue;
      }
      if (d.gpId !== gp.id || !was) {
        d.gpId = gp.id; d.family = padFamily(gp.id);
        // remember resting stick values: devices that report a stuck axis (fake 'gamepads' like some
        // RGB keyboards, headsets or virtual drivers) must not drift the menus
        d.stuck = [Math.abs(gp.axes[0] || 0) > 0.5, Math.abs(gp.axes[1] || 0) > 0.5];
        d.name = PAD_FAMILIES[d.family].name; d.short = 'PAD ' + (i + 1);
      }
      if (!was && this.onConnect) this.onConnect(d, true);
      if (this.capture && this.capture.pad === d.id) { BTN_NAMES.forEach(b => this._setBtn(d[b], false)); d.mx = d.my = 0; continue; }
      const custom = PAD_MAPS[gp.id];
      const B = n => !!(gp.buttons[n] && (gp.buttons[n].pressed || gp.buttons[n].value > 0.5));
      let ax = 0, ay = 0, pass, shoot, tackle, item, ability, dodge, start;
      if (custom) {
        d.mapping = 'custom';
        ax = bindValue(gp, custom.right) - bindValue(gp, custom.left);
        ay = bindValue(gp, custom.down) - bindValue(gp, custom.up);
        const C = k => bindValue(gp, custom[k]) > 0.5;
        pass = C('pass'); shoot = C('shoot'); tackle = C('tackle'); item = C('item'); ability = C('ability'); dodge = C('dodge'); start = C('start');
      } else if (gp.mapping === 'standard') {
        d.mapping = 'standard';
        ax = d.stuck[0] ? 0 : gp.axes[0] || 0; ay = d.stuck[1] ? 0 : gp.axes[1] || 0;
        if (B(14)) ax = -1; if (B(15)) ax = 1; if (B(12)) ay = -1; if (B(13)) ay = 1;
        pass = B(0); shoot = B(1) || B(7); tackle = B(2) || B(6); item = B(3); ability = B(4); dodge = B(5); start = B(9);
      } else {
        d.mapping = 'auto';
        let P = RAW_PROFILES[d.family] || RAW_PROFILES.generic;
        if (d.family === 'xbox' && gp.buttons.length >= 15) P = RAW_PROFILES.xboxBT; // Xbox over Bluetooth (macOS / Firefox)
        ax = d.stuck[0] ? 0 : gp.axes[0] || 0; ay = d.stuck[1] ? 0 : gp.axes[1] || 0;
        // D-pad: hat switch axis (Windows/DirectInput) or a pair of digital axes (Linux)
        const hat = gp.axes.length > 9 ? readHat(gp.axes[9]) : null;
        if (hat) { ax = hat[0]; ay = hat[1]; }
        else if (gp.axes.length >= 8) { const hx = gp.axes[6], hy = gp.axes[7]; if (Math.abs(hx) > 0.5) ax = Math.sign(hx); if (Math.abs(hy) > 0.5) ay = Math.sign(hy); }
        if (gp.buttons.length > 15) { if (B(14)) ax = -1; if (B(15)) ax = 1; if (B(12)) ay = -1; if (B(13)) ay = 1; }
        const f = P.face;
        const trig = k => B(P.trig[k]) || (P.trigAxes && (gp.axes[P.trigAxes[k]] || -1) > 0.3);
        pass = B(f[0]); shoot = B(f[1]) || trig(1); tackle = B(f[2]) || trig(0); item = B(f[3]); ability = B(P.shoulder[0]); dodge = B(P.shoulder[1]);
        start = P.start.some(B);
      }
      const mag = Math.hypot(ax, ay);
      if (mag < 0.22) { ax = 0; ay = 0; } else if (mag > 1) { ax /= mag; ay /= mag; }
      d.mx = ax; d.my = ay;
      this._setBtn(d.pass, pass); this._setBtn(d.shoot, shoot); this._setBtn(d.tackle, tackle);
      this._setBtn(d.item, item); this._setBtn(d.ability, ability); this._setBtn(d.dodge, dodge); this._setBtn(d.start, start);
      if (mag > 0.3 || gp.buttons.some(b => b.pressed)) d.lastActive = this.time;
    }
    // touch
    {
      const d = this.devices.touch;
      d.connected = Touch.active;
      d.mx = Touch.stickVec.x; d.my = Touch.stickVec.y;
      for (const b of BTN_NAMES) this._setBtn(d[b], Touch.buttons[b] !== undefined);
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
  // forget this frame's one-shot events (presses, releases, menu steps) but keep what is held down
  clearEdges() {
    for (const id of this.order) {
      const d = this.devices[id];
      for (const b of BTN_NAMES) { d[b].pressed = false; d[b].released = false; }
      d.navX = 0; d.navY = 0;
    }
    for (const k in this.global) this.global[k] = false;
    Keys.pressed.clear(); Mouse.clicked = false; Mouse.moved = false; Mouse.wheel = 0;
  },
  endFrame() { Keys.pressed.clear(); Mouse.clicked = false; Mouse.moved = false; Mouse.wheel = 0; },

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
