// ============================================================================
//  Utilities + procedural character / ball / emoji rendering
// ============================================================================

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const sign = v => v < 0 ? -1 : 1;
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

const FONT = '"Luckiest Guy", "Impact", "Arial Black", sans-serif';
const FONT_UI = '"Nunito", "Segoe UI", "Arial", sans-serif';

function hexToRgb(h) {
  if (h.startsWith('rgb')) { const m = h.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const _mixCache = new Map();
function mix(a, b, t) {
  const key = a + b + t.toFixed(2);
  let v = _mixCache.get(key);
  if (v) return v;
  const A = hexToRgb(a), B = hexToRgb(b);
  v = `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
  if (_mixCache.size > 4000) _mixCache.clear();
  _mixCache.set(key, v);
  return v;
}
const shade = (c, amt) => amt < 0 ? mix(c, '#000000', -amt) : mix(c, '#ffffff', amt);
function colorDist(a, b) { const A = hexToRgb(a), B = hexToRgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); }

function tintCol(c, tint) {
  if (!tint) return c;
  if (tint === 'soot') return mix(c, '#1d1d1d', 0.82);
  if (tint === 'ice') return mix(c, '#b8ecff', 0.55);
  if (tint === 'zap') return mix(c, '#fff35c', 0.45);
  if (tint === 'gold') return mix(c, '#ffd84a', 0.5);
  return c;
}

function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function circle(c, x, y, r, fill, stroke, lw) {
  c.beginPath(); c.arc(x, y, r, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
}
function ellipse(c, x, y, rx, ry, fill, stroke, lw) {
  c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
}

function text(c, str, x, y, size, color = '#fff', align = 'center', outline = '#000', ow = null, font = FONT) {
  c.font = `${Math.round(size)}px ${font}`;
  c.textAlign = align; c.textBaseline = 'middle';
  if (outline) {
    c.lineJoin = 'round'; c.miterLimit = 2;
    c.lineWidth = ow == null ? Math.max(2, size * 0.16) : ow;
    c.strokeStyle = outline; c.strokeText(str, x, y);
  }
  c.fillStyle = color; c.fillText(str, x, y);
}

// ---------------- emoji cache (rendered once, blitted) ----------------
const _emoji = new Map();
function emojiCanvas(ch) {
  let cv = _emoji.get(ch);
  if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.font = '100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(ch, 64, 70);
  _emoji.set(ch, cv);
  return cv;
}
function drawEmoji(c, ch, x, y, size, flip = false, rot = 0, alpha = 1) {
  const cv = emojiCanvas(ch);
  c.save(); c.translate(x, y); if (rot) c.rotate(rot); if (flip) c.scale(-1, 1);
  if (alpha < 1) c.globalAlpha *= alpha;
  c.drawImage(cv, -size / 2, -size / 2, size, size);
  c.restore();
}

// ============================================================================
//  CHARACTER RENDERING
//  o = { look, role, kit, kit2, skin, face, anim, moving, expr, tint, lying,
//        lyingDir, spin, flat, dance, armsUp, size, hasBall }
//  Sprite units: ground at (0,0); ~72 units tall.
// ============================================================================

function drawEyes(c, P, fx, fy, expr, ox = 0, oy = 0) {
  const ex = fx * 5.5 + ox, ey = -2 + fy * 1.5 + oy;
  const px = fx * 1.6, py = fy * 1.3;
  c.lineCap = 'round';
  if (expr === 'hurt') {
    c.strokeStyle = '#111'; c.lineWidth = 2;
    for (const s of [-1, 1]) {
      const x = ex + s * 5.5;
      c.beginPath(); c.moveTo(x - 3, ey - 3); c.lineTo(x + 3, ey + 3); c.moveTo(x + 3, ey - 3); c.lineTo(x - 3, ey + 3); c.stroke();
    }
    return;
  }
  if (expr === 'happy') {
    c.strokeStyle = '#111'; c.lineWidth = 2.2;
    for (const s of [-1, 1]) { c.beginPath(); c.arc(ex + s * 5.5, ey + 1.5, 3.2, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    return;
  }
  if (expr === 'panic') {
    for (const s of [-1, 1]) { ellipse(c, ex + s * 5.5, ey, 4.4, 5.2, '#fff', '#222', 1); circle(c, ex + s * 5.5 + px, ey + py, 1.3, '#111'); }
  } else {
    for (const s of [-1, 1]) {
      ellipse(c, ex + s * 5.2 + px * 0.4, ey, 2.1, 3.3, '#111');
      circle(c, ex + s * 5.2 + px * 0.4 - 0.6, ey - 1.3, 0.8, 'rgba(255,255,255,0.85)');
    }
  }
  if (expr === 'grit' || expr === 'angry') {
    c.strokeStyle = '#111'; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(ex - 9, ey - 7); c.lineTo(ex - 2.5, ey - 4.5); c.moveTo(ex + 9, ey - 7); c.lineTo(ex + 2.5, ey - 4.5); c.stroke();
  }
}
function drawMouth(c, P, fx, fy, expr, oy = 0) {
  const mx = fx * 6, my = 7 + fy * 1 + oy;
  c.lineCap = 'round';
  if (expr === 'grit') {
    rrect(c, mx - 5, my - 2.5, 10, 5, 1.5); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#222'; c.lineWidth = 1.2; c.stroke();
    c.beginPath(); c.moveTo(mx - 5, my); c.lineTo(mx + 5, my); c.stroke();
  } else if (expr === 'hurt' || expr === 'panic') {
    ellipse(c, mx, my + 1, 3.2, 4, '#5a1010', '#222', 1);
  } else if (expr === 'happy') {
    c.beginPath(); c.arc(mx, my - 1, 5, 0.1, Math.PI - 0.1); c.closePath(); c.fillStyle = '#5a1010'; c.fill();
    ellipse(c, mx, my + 2.2, 2.4, 1.3, '#ff7a8a');
  } else {
    c.strokeStyle = '#111'; c.lineWidth = 1.7;
    c.beginPath(); c.arc(mx, my - 4, 5.5, 0.45, Math.PI - 0.45); c.stroke();
  }
}

// Rounded-block head shared by every character (a softened Roblox-style head)
const HEAD_W = 30, HEAD_H = 27, HEAD_R = 10;
function headPath(c, grow = 0) { rrect(c, -HEAD_W / 2 - grow, -HEAD_H / 2 - grow, HEAD_W + grow * 2, HEAD_H + grow * 2, HEAD_R + grow); }
function hairCap(c, col, depth) { c.fillStyle = col; rrect(c, -HEAD_W / 2 - 1, -HEAD_H / 2 - 2, HEAD_W + 2, depth + 2, HEAD_R); c.fill(); }
// Each look: behind(c,P,fx,fy,back,t) drawn before head; front(...) after head & face.
const LOOKS = {
  dayo: { // Lagos danfo driver: flat cap, dark shades, conductor's towel
    bodyW: 1.35, headR: 16, hideEyes: true,
    front(c, P, fx, fy, back, t, o) {
      hairCap(c, P('#1c1c1c'), 11);
      if (!back) { ellipse(c, fx * 9, -10, 13, 4, P('#111')); }
      if (!back && o.expr !== 'hurt') {
        c.fillStyle = P('#0d0d0d'); rrect(c, fx * 5.5 - 12, -5, 24, 7, 2.5); c.fill();
        c.fillStyle = 'rgba(255,220,0,0.55)'; c.fillRect(fx * 5.5 - 9, -4, 5, 2);
        c.fillStyle = P('#1c1c1c'); c.fillRect(fx * 6 - 6, 3, 12, 2.4);
      }
    },
    towel: true,
  },
  kip: { // Kenyan marathoner: short hair, sweatband, neon spikes
    bodyW: 0.92, headR: 15, runner: true,
    front(c, P, fx, fy, back, t, o) {
      hairCap(c, P('#141414'), 8);
      c.fillStyle = P('#ffffff'); c.fillRect(-15.5, -10, 31, 5);
      c.fillStyle = P('#006600'); c.fillRect(-15.5, -8, 31, 1.4);
      if (back) { c.fillStyle = P('#ffffff'); c.beginPath(); c.moveTo(0, -8); c.lineTo(-6, 4); c.lineTo(-2, 4); c.fill(); }
    },
  },
  ama: { // Ghanaian market queen: towering kente headwrap, gold earrings
    bodyW: 1.05, headR: 15,
    front(c, P, fx, fy, back, t, o) {
      const k = ['#fcd116', '#1b8a3c', '#ce1126', '#111111'];
      c.save(); c.translate(0, -12);
      for (let i = 0; i < 4; i++) {
        c.fillStyle = P(k[i % 4]);
        c.beginPath(); c.ellipse(-6 + i * 4, -6 - i * 4, 15 - i * 1.5, 7, -0.35 + i * 0.25, 0, TAU); c.fill();
      }
      c.fillStyle = P(k[0]); c.beginPath(); c.ellipse(0, 0, 17, 8, 0, Math.PI, TAU); c.fill();
      c.strokeStyle = P('#111'); c.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 6, -7); c.lineTo(i * 6 + 2, 0); c.stroke(); }
      c.restore();
      if (!back) { circle(c, fx * 4 - 15, 6, 3, null, P('#f5c542'), 1.8); circle(c, fx * 4 + 15, 6, 3, null, P('#f5c542'), 1.8); }
    },
  },
  hamada: { // Egyptian koshary king: red fez, mighty moustache, belly
    bodyW: 1.45, headR: 16.5, belly: true, mouthOffset: 3,
    front(c, P, fx, fy, back, t, o) {
      c.fillStyle = P('#6d6d6d'); rrect(c, -16, -9, 4, 10, 2); c.fill(); rrect(c, 12, -9, 4, 10, 2); c.fill();
      c.fillStyle = P('#c8102e'); c.beginPath(); c.moveTo(-11, -12); c.lineTo(-8, -32); c.lineTo(8, -32); c.lineTo(11, -12); c.closePath(); c.fill();
      c.fillStyle = P('#8a0a1f'); c.fillRect(-11, -15, 22, 3);
      const sw = Math.sin(t * 7) * 3;
      c.strokeStyle = '#111'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -32); c.quadraticCurveTo(9 + sw, -30, 10 + sw, -18); c.stroke();
      circle(c, 10 + sw, -17, 2.4, '#111');
      if (!back) {
        const mx = fx * 6, my = 4.5;
        c.fillStyle = P('#1a1008');
        for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(mx, my); c.bezierCurveTo(mx + sd * 7, my - 4, mx + sd * 14, my + 4, mx + sd * 17, my + 1); c.bezierCurveTo(mx + sd * 13, my + 7, mx + sd * 6, my + 7, mx, my + 4); c.fill(); }
      }
    },
  },
  wahala: { // Cameroonian mad inventor: wild grey hair, goggles, lab coat
    bodyW: 1.0, headR: 15, labcoat: true,
    behind(c, P, fx, fy, back, t) {
      c.fillStyle = P('#d9d9d9'); c.beginPath();
      const n = 13;
      for (let i = 0; i <= n; i++) { const a = Math.PI * 0.8 + (i / n) * Math.PI * 1.4, rr = i % 2 ? 25 + Math.sin(t * 9 + i) * 2 : 17; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr - 3); }
      c.closePath(); c.fill(); c.strokeStyle = P('#a0a0a0'); c.lineWidth = 1; c.stroke();
    },
    front(c, P, fx, fy, back) {
      if (!back) {
        c.fillStyle = P('#333'); c.fillRect(-16, -4, 32, 3);
        for (const s of [-1, 1]) circle(c, fx * 5.5 + s * 5.8, -2, 6.2, 'rgba(160,255,120,0.35)', P('#222'), 2.4);
      }
    },
  },
  ataya: { // Senegalese tea mistress: tall elegant headwrap, gold hoops
    bodyW: 1.05, headR: 15,
    front(c, P, fx, fy, back, t, o) {
      c.fillStyle = P(o.kit2);
      c.beginPath(); c.moveTo(-16, -6); c.quadraticCurveTo(-18, -30, -4, -40); c.quadraticCurveTo(14, -44, 16, -24); c.quadraticCurveTo(17, -12, 16, -6); c.quadraticCurveTo(0, -14, -16, -6); c.fill();
      c.fillStyle = P('#f5c542');
      for (let i = 0; i < 6; i++) circle(c, -9 + (i % 3) * 8, -14 - Math.floor(i / 3) * 12, 1.8, P('#f5c542'));
      c.strokeStyle = P(shade(o.kit2, -0.3)); c.lineWidth = 1.4; c.beginPath(); c.moveTo(-14, -12); c.quadraticCurveTo(0, -26, 15, -16); c.stroke();
      if (!back) { circle(c, fx * 4 - 15, 8, 4, null, P('#f5c542'), 2); circle(c, fx * 4 + 15, 8, 4, null, P('#f5c542'), 2); }
    },
  },
  sipho: { // South African amapiano maestro: bucket hat, shades, chain
    bodyW: 1.0, headR: 15, hideEyes: true, chain: true,
    front(c, P, fx, fy, back, t, o) {
      c.fillStyle = P(o.kit2); c.beginPath(); c.ellipse(0, -10, 21, 5, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-13, -10); c.quadraticCurveTo(-12, -28, 0, -28); c.quadraticCurveTo(12, -28, 13, -10); c.fill();
      c.fillStyle = P('#ffcc00'); c.fillRect(-13, -14, 26, 3);
      if (!back && o.expr !== 'hurt') {
        c.fillStyle = P('#ff7a00');
        for (const s of [-1, 1]) { rrect(c, fx * 5.5 + s * 6 - 5, -5, 10, 6, 2); c.fill(); }
        c.fillRect(fx * 5.5 - 2, -3, 4, 1.5);
      }
    },
  },
  juma: { // Tanzanian safari ranger: wide-brim hat, short beard
    bodyW: 1.2, headR: 16,
    front(c, P, fx, fy, back, t) {
      if (!back) {
        c.fillStyle = P('#1a1008');
        c.beginPath(); c.moveTo(fx * 6 - 13, 3); c.quadraticCurveTo(fx * 6, 22, fx * 6 + 13, 3); c.quadraticCurveTo(fx * 6, 11, fx * 6 - 13, 3); c.fill();
      }
      c.fillStyle = P('#c2a36b'); c.beginPath(); c.ellipse(0, -11, 24, 6, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-13, -11); c.quadraticCurveTo(-12, -29, 0, -29); c.quadraticCurveTo(12, -29, 13, -11); c.fill();
      c.fillStyle = P('#6b4f23'); c.fillRect(-13, -15, 26, 3.5);
      c.strokeStyle = P('#8a6d3b'); c.lineWidth = 1; c.beginPath(); c.ellipse(0, -11, 24, 6, 0, 0, TAU); c.stroke();
    },
  },
};

const SIDEKICK_HATS = {
  flatcap(c, P, fx, fy, back) {
    hairCap(c, P('#2b2b2b'), 10);
    if (!back) ellipse(c, fx * 8, -10, 11, 3.5, P('#1a1a1a'));
  },
  headband(c, P, fx, fy, back, o) {
    hairCap(c, P('#141414'), 8);
    c.fillStyle = P(o.kit2); c.fillRect(-15, -11, 30, 5);
    if (back) { c.beginPath(); c.moveTo(0, -9); c.lineTo(-7, 2); c.lineTo(-3, 2); c.fill(); }
  },
  headwrap(c, P, fx, fy, back, o) {
    c.fillStyle = P(o.kit2); c.beginPath(); c.ellipse(0, -14, 17, 9, 0, Math.PI, TAU); c.fill();
    c.fillStyle = P(o.kit); c.beginPath(); c.ellipse(3, -20, 11, 6, 0.4, 0, TAU); c.fill();
    c.fillStyle = P('#ce1126'); c.fillRect(-15, -15, 30, 2);
  },
  fez(c, P) {
    c.fillStyle = P('#c8102e'); c.beginPath(); c.moveTo(-9, -11); c.lineTo(-7, -26); c.lineTo(7, -26); c.lineTo(9, -11); c.closePath(); c.fill();
    c.strokeStyle = '#111'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -26); c.lineTo(8, -16); c.stroke();
  },
  goggles(c, P, fx, fy, back) {
    c.fillStyle = P('#2a1a10'); for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(-10 + i * 5, -12, 5, 0, TAU); c.fill(); }
    c.fillStyle = P('#333'); c.fillRect(-15, -13, 30, 3);
    if (!back) for (const s of [-1, 1]) circle(c, s * 5.5, -13, 3.6, 'rgba(180,255,140,0.8)', '#222', 1.2);
  },
  kufi(c, P, fx, fy, back, o) {
    c.fillStyle = P(o.kit2); c.beginPath(); c.ellipse(0, -11, 13, 9, 0, Math.PI, TAU); c.fill();
    c.fillStyle = P('#f5c542'); for (let i = -2; i <= 2; i++) circle(c, i * 4.5, -15, 1.3, P('#f5c542'));
  },
  bucket(c, P, fx, fy, back, o) {
    c.fillStyle = P(o.kit2); c.beginPath(); c.ellipse(0, -9, 19, 4.5, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-12, -9); c.quadraticCurveTo(-11, -25, 0, -25); c.quadraticCurveTo(11, -25, 12, -9); c.fill();
  },
  safari(c, P) {
    c.fillStyle = P('#c2a36b'); c.beginPath(); c.ellipse(0, -10, 21, 5, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-12, -10); c.quadraticCurveTo(-11, -26, 0, -26); c.quadraticCurveTo(11, -26, 12, -10); c.fill();
    c.fillStyle = P('#6b4f23'); c.fillRect(-12, -14, 24, 3);
  },
};

function drawSkeleton(c, o) {
  // black silhouette w/ glowing bones (electrocution gag)
  c.fillStyle = '#111';
  rrect(c, -13, -38, 26, 24, 6); c.fill(); rrect(c, -12, -15, 24, 15, 4); c.fill();
  rrect(c, -22, -37, 8, 22, 4); c.fill(); rrect(c, 14, -37, 8, 22, 4); c.fill();
  c.save(); c.translate(0, -51); headPath(c); c.fill(); c.restore();
  c.strokeStyle = '#fffbe0'; c.lineWidth = 2.4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, -37); c.lineTo(0, -14); c.stroke();
  for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-9, -33 + i * 6); c.quadraticCurveTo(0, -30 + i * 6, 9, -33 + i * 6); c.stroke(); }
  c.beginPath(); c.moveTo(-6, -14); c.lineTo(-6, 0); c.moveTo(6, -14); c.lineTo(6, 0); c.moveTo(-18, -34); c.lineTo(-18, -17); c.moveTo(18, -34); c.lineTo(18, -17); c.stroke();
  c.fillStyle = '#fffbe0'; c.save(); c.translate(0, -51); c.scale(0.7, 0.72); headPath(c); c.fill(); c.restore();
  circle(c, -4, -53, 2.6, '#111'); circle(c, 4, -53, 2.6, '#111');
  c.fillStyle = '#111'; c.fillRect(-4, -46, 8, 1.6);
}

// ---------------------------------------------------------------------------
//  Blocky avatar parts. Each body part is a flat-shaded box in a tiny 3D
//  space: a = lateral, f = forward, h = up. Boxes turn with the player's
//  facing and are drawn with a parallel projection, so a whole character
//  costs about 25 small polygon fills: no gradients, shadows or offscreen
//  canvases.
// ---------------------------------------------------------------------------
const RB_K = 0.4;              // how much of the top faces the camera sees
const RB_EDGE = '#1a1420';
const RB_LIGHT = (() => { const v = [-0.5, 0.55, 0.67], n = Math.hypot(v[0], v[1], v[2]); return v.map(q => q / n); })();
const _rbX = new Float32Array(8), _rbY = new Float32Array(8);
const _rbShade = new Uint8Array(6);    // last block's shade step per face: -a, +a, -f, +f, -h, +h
const _rbV = { sa: 0, ca: 1 };
const _rbVis = new Uint8Array(6);
const RB_OUTLINE = 1, RB_NOTOP = 2;
const RB_DARK = Array.from({ length: 11 }, (_, i) => `rgba(0,0,0,${(i * 0.045).toFixed(3)})`);
// side faces as [bottom0, bottom1, top1, top0]; corner index = a + 2f + 4h
const RB_SIDES = [[0, 2, 6, 4], [1, 3, 7, 5], [0, 1, 5, 4], [2, 3, 7, 6]];
const RB_CAPS = [[0, 1, 3, 2], [4, 5, 7, 6]];
// the 12 edges as [corner, corner, face, face]; an edge is on the outline when
// exactly one of its two faces is visible
const RB_EDGES = [[0, 1, 2, 4], [2, 3, 3, 4], [4, 5, 2, 5], [6, 7, 3, 5], [0, 2, 0, 4], [1, 3, 1, 4],
  [4, 6, 0, 5], [5, 7, 1, 5], [0, 4, 0, 2], [1, 5, 1, 2], [2, 6, 0, 3], [3, 7, 1, 3]];

function rbAmt(gx, gy, h) {
  // light -> shade step: 0 = 10% lighter ... each step 4% darker
  const lam = gx * RB_LIGHT[0] + gy * RB_LIGHT[1] + h * RB_LIGHT[2];
  return Math.round(8.5 * (1 - Math.max(-0.2, lam)));
}
// shaded colour lookup: rbShadeCol(col, step) == shade(col, 0.1 - step * 0.04)
const _rbCols = new Map();
function rbShadeCol(col, step) {
  let a = _rbCols.get(col);
  if (!a) { if (_rbCols.size > 600) _rbCols.clear(); a = []; _rbCols.set(col, a); }
  return a[step] || (a[step] = shade(col, Math.round((0.1 - step * 0.04) * 100) / 100));
}
function rbPoly(c, i0, i1, i2, i3) {
  c.moveTo(_rbX[i0], _rbY[i0]); c.lineTo(_rbX[i1], _rbY[i1]); c.lineTo(_rbX[i2], _rbY[i2]); c.lineTo(_rbX[i3], _rbY[i3]); c.closePath();
}

// One box. (pa, pf, ph) is the pivot; extents are relative to it. The box is
// rolled about the forward axis, then pitched about the lateral axis (a
// positive pitch swings a hanging limb forward). segs = [[frac, colour], ...]
// colours the box in horizontal bands from the bottom up (frac is the top of
// each band, 0..1), which gives sleeves, socks and gloves for free.
// flags: RB_OUTLINE strokes the silhouette, RB_NOTOP skips a hidden top face.
function rbBlock(c, pa, pf, ph, a0, a1, f0, f1, h0, h1, roll, pitch, segs, flags = RB_OUTLINE) {
  const sa = _rbV.sa, ca = _rbV.ca, K = RB_K;
  const cr = Math.cos(roll), sr = Math.sin(roll), cp = Math.cos(pitch), sp = Math.sin(pitch);
  // rotated local axes, in (a, f, h)
  const Aa = cr, Af = -sr * sp, Ah = sr * cp;
  const Ff = cp, Fh = sp;
  const Ha = -sr, Hf = -cr * sp, Hh = cr * cp;
  // to world (gx, gy, h)
  const Agx = Aa * ca + Af * sa, Agy = -Aa * sa + Af * ca;
  const Fgx = Ff * sa, Fgy = Ff * ca;
  const Hgx = Ha * ca + Hf * sa, Hgy = -Ha * sa + Hf * ca;
  // to screen: sx = gx, sy = gy*K - h
  const Asy = Agy * K - Ah, Fsy = Fgy * K - Fh, Hsy = Hgy * K - Hh;
  const ox = pa * ca + pf * sa, oy = (-pa * sa + pf * ca) * K - ph;
  for (let i = 0; i < 8; i++) {
    const a = i & 1 ? a1 : a0, f = i & 2 ? f1 : f0, h = i & 4 ? h1 : h0;
    _rbX[i] = ox + a * Agx + f * Fgx + h * Hgx;
    _rbY[i] = oy + a * Asy + f * Fsy + h * Hsy;
  }
  // face visibility: normal . (0, 1, K) > 0 ; normals -A,+A,-F,+F,-H,+H
  const vA = Agy + K * Ah, vF = Fgy + K * Fh, vH = Hgy + K * Hh;
  _rbShade[0] = rbAmt(-Agx, -Agy, -Ah); _rbShade[1] = rbAmt(Agx, Agy, Ah);
  _rbShade[2] = rbAmt(-Fgx, -Fgy, -Fh); _rbShade[3] = rbAmt(Fgx, Fgy, Fh);
  _rbShade[4] = rbAmt(-Hgx, -Hgy, -Hh); _rbShade[5] = rbAmt(Hgx, Hgy, Hh);
  const vis = _rbVis;
  vis[0] = vA < -0.01; vis[1] = vA > 0.01; vis[2] = vF < -0.01; vis[3] = vF > 0.01; vis[4] = vH < -0.01; vis[5] = vH > 0.01;
  if (flags & RB_NOTOP) vis[5] = 0;
  // Side faces: paint every colour band across the visible sides in one
  // fill using the brighter side's shade, then darken the other side with a
  // single translucent overlay. At most two side faces can face the camera.
  let s0 = -1, s1 = -1;
  for (let k = 0; k < 4; k++) if (vis[k]) { if (s0 < 0) s0 = k; else s1 = k; }
  if (s1 >= 0 && _rbShade[s1] < _rbShade[s0]) { const q = s0; s0 = s1; s1 = q; }
  if (s0 >= 0) {
    const base = _rbShade[s0], n = segs.length;
    let lo = 0;
    for (let j = 0; j < n; j++) {
      const hi = segs[j][0];
      c.beginPath();
      for (let m = 0; m < 2; m++) {
        const k = m ? s1 : s0;
        if (k < 0) continue;
        const q = RB_SIDES[k];
        const bx0 = _rbX[q[0]], by0 = _rbY[q[0]], bx1 = _rbX[q[1]], by1 = _rbY[q[1]];
        const dx0 = _rbX[q[3]] - bx0, dy0 = _rbY[q[3]] - by0, dx1 = _rbX[q[2]] - bx1, dy1 = _rbY[q[2]] - by1;
        c.moveTo(bx0 + dx0 * lo, by0 + dy0 * lo); c.lineTo(bx1 + dx1 * lo, by1 + dy1 * lo);
        c.lineTo(bx1 + dx1 * hi, by1 + dy1 * hi); c.lineTo(bx0 + dx0 * hi, by0 + dy0 * hi); c.closePath();
      }
      c.fillStyle = rbShadeCol(segs[j][1], base); c.fill();
      lo = hi;
    }
    if (s1 >= 0 && _rbShade[s1] > base) {
      const q = RB_SIDES[s1];
      c.beginPath(); rbPoly(c, q[0], q[1], q[2], q[3]);
      c.fillStyle = RB_DARK[Math.min(10, _rbShade[s1] - base)]; c.fill();
    }
  }
  for (let k = 0; k < 2; k++) {
    if (!vis[4 + k]) continue;
    const q = RB_CAPS[k];
    c.beginPath(); rbPoly(c, q[0], q[1], q[2], q[3]);
    c.fillStyle = rbShadeCol(segs[k ? segs.length - 1 : 0][1], _rbShade[4 + k]); c.fill();
  }
  if (flags & RB_OUTLINE) {
    // outline only; inner edges show through the shading
    c.beginPath();
    for (let k = 0; k < 12; k++) {
      const e = RB_EDGES[k];
      if (vis[e[2]] !== vis[e[3]]) { c.moveTo(_rbX[e[0]], _rbY[e[0]]); c.lineTo(_rbX[e[1]], _rbY[e[1]]); }
    }
    c.strokeStyle = RB_EDGE; c.lineWidth = 1.2; c.stroke();
  }
  return vis;
}

// Map the face spanned by corners o (top-left), u (top-right) and v
// (bottom-left) of the last block onto a w x h rectangle, for drawing
// kit details on it. Caller must save()/restore().
function rbFaceSpace(c, o, u, v, w, h) {
  c.transform((_rbX[u] - _rbX[o]) / w, (_rbY[u] - _rbY[o]) / w, (_rbX[v] - _rbX[o]) / h, (_rbY[v] - _rbY[o]) / h, _rbX[o], _rbY[o]);
}

// Shared rounded-block head (HEAD_W x HEAD_H, see headPath), lit from the upper left.
function rbHead(c, skin) {
  const w = HEAD_W / 2, h = HEAD_H / 2;
  headPath(c); c.fillStyle = shade(skin, -0.22); c.fill();
  c.strokeStyle = RB_EDGE; c.lineWidth = 1.3; c.stroke();
  rrect(c, -w + 1.2, -h + 1.2, HEAD_W - 6.5, HEAD_H - 2.4, HEAD_R - 1); c.fillStyle = skin; c.fill();
  ellipse(c, -1.8, -h + 4.6, w - 4.5, 3.4, shade(skin, 0.13));
}

function drawCharacter(c, o, x, y, s) {
  const look = o.role === 'captain' ? LOOKS[o.look] : null;
  const keeper = o.role === 'keeper';
  const fx = Math.cos(o.face), fy = Math.sin(o.face);
  const run = clamp(o.moving, 0, 1);
  const t = o.anim;
  const ph = t * 15;
  const bob = (Math.abs(Math.sin(ph)) * 2.6 * run) + (o.dance ? Math.abs(Math.sin(t * 9)) * 5 : 0) + (o.armsUp ? Math.abs(Math.sin(t * 10)) * 8 : 0);
  const bw = look ? look.bodyW : (keeper ? 1.15 : 1.0);
  const P = col => tintCol(col, o.tint);

  // Yaw on screen: 0 faces the camera, +-PI/2 is side-on, PI faces away.
  // Squeezed toward a three-quarter view so the boxy bodies stay wide while
  // players run left and right. Spins turn the whole avatar.
  const ay = Math.atan2(fx, fy), ady = Math.abs(ay);
  let yaw = ady < 2.24 ? ay * (0.62 / 2.24) : Math.sign(ay) * (Math.PI - (Math.PI - ady) * (0.62 / (Math.PI - 2.24)));
  if (o.spin) yaw += t * 28;
  const sa = Math.sin(yaw), ca = Math.cos(yaw);
  _rbV.sa = sa; _rbV.ca = ca;
  const back = ca < -0.2;
  const vfx = clamp(sa * 1.5, -1, 1);   // where the face sits on the head

  c.save();
  c.translate(x, y); c.scale(s, s);
  let sx = 1, sy = 1;
  if (o.flat) { sx *= 1 + o.flat * 0.8; sy *= 1 - o.flat * 0.72; }
  if (o.lying) { c.translate(0, -8); c.rotate(o.lyingDir * Math.PI / 2); c.translate(0, 8 - 4); }
  if (o.dance) c.rotate(Math.sin(t * 9) * 0.22);
  c.scale(sx, sy);
  c.lineJoin = 'round';

  if (o.tint === 'zap' && Math.floor(t * 18) % 2 === 0) { drawSkeleton(c, o); c.restore(); return; }

  // ---- palette
  const skin = P(o.skin);
  const bodyCol = P(keeper ? o.kit2 : (look && look.labcoat ? '#f2f2f2' : o.kit));
  const shorts = P(keeper ? '#222222' : shade(o.kit, -0.45));
  const sock = P(keeper ? o.kit : o.kit2);
  const shoe = P(look && look.runner ? '#7CFC00' : '#1b1b1b');
  const armSegs = keeper ? [[0.3, P('#ffffff')], [1, bodyCol]]
    : look && look.labcoat ? [[0.22, skin], [1, bodyCol]]
    : [[0.56, skin], [1, bodyCol]];
  const legSegs = [[0.24, shoe], [0.55, sock], [1, shorts]];

  // ---- proportions (Roblox-ish: legs and torso about equal, legs half the torso wide)
  const HIP = 17, SH = 36;
  const tw = 20 * bw, hw = tw / 2;
  const belly = look && look.belly;
  const tf0 = -5.5, tf1 = belly ? 9.5 : 5.5;
  const legW = hw - 1.2, legX = hw / 2;   // a sliver of a gap keeps the legs apart without outlines
  const armW = keeper ? 5 : 4.2, armX = hw + armW + 0.2;

  // ---- legs (farther one first); shoes, socks and shorts are colour bands
  const legP0 = Math.sin(ph) * 0.65 * run;
  // bob lifts the whole avatar: a little hop when running, jumps when celebrating
  const legDepth = sd => -sd * legX * sa + HIP * Math.sin(sd * legP0) * ca;
  const legOrder = legDepth(-1) < legDepth(1) ? [-1, 1] : [1, -1];
  const kickSide = sa >= 0 ? 1 : -1;        // the leg nearer the camera does the kicking
  const kickP = o.kick > 0 ? Math.sin(o.kick * Math.PI) * 1.25 : 0;
  for (const sd of legOrder) {
    const p = kickP && sd === kickSide ? kickP : sd * legP0;
    rbBlock(c, sd * legX, 0, HIP + bob, -legW / 2, legW / 2, -4.5, 4.5, -HIP, 1, 0, p, legSegs, RB_NOTOP);
  }

  // ---- arms: pitch (swing) and roll (splay)
  const armPose = sd => {
    if (o.ears) return [sd * 2.75, 0];                                   // hands over the ears
    if (o.dance) return [sd * 0.3, 1.6 + Math.sin(t * 9 + (sd > 0 ? 0 : Math.PI)) * 1.3];
    if (o.stretch) return [sd * (1.45 + Math.sin(t * 20) * 0.08), 0];    // stretchy keeper arms, out wide
    if (o.armsUp) return [sd * 0.38, Math.PI - 0.3 + Math.sin(t * 12 + sd) * 0.18];
    return [sd * 0.07, -sd * Math.sin(ph) * 0.8 * run];
  };
  const armLen = o.stretch ? 70 : 19.5;
  const stretchSegs = o.stretch ? (keeper ? [[0.13, P('#ffffff')], [1, bodyCol]] : [[0.85, skin], [1, bodyCol]]) : armSegs;
  const drawArm = sd => {
    const [roll, pitch] = armPose(sd);
    rbBlock(c, sd * armX, 0, SH - 2 + bob, -armW, armW, -4.5, 4.5, 2 - armLen, 2, roll, pitch, stretchSegs);
  };
  const nearSide = sa > 0 ? -1 : 1;          // the arm on this side is closer to the camera
  const raised = o.armsUp || o.dance || o.ears;
  drawArm(-nearSide);

  // ---- torso
  const th = SH - HIP + 1;
  const tv = rbBlock(c, 0, 0, HIP - 1 + bob, -hw, hw, tf0, tf1, 0, th, 0, 0, [[1, bodyCol]]);
  if (tv[3]) {               // chest
    const amt = _rbShade[3], S = col => rbShadeCol(P(col), amt);
    c.save(); rbFaceSpace(c, 6, 7, 2, tw, th);
    if (belly) ellipse(c, hw, th * 0.62, tw * 0.34, th * 0.3, rbShadeCol(bodyCol, Math.max(0, amt - 2)));
    if (keeper) { c.fillStyle = S(o.kit); c.fillRect(0, th * 0.34, tw, 4.5); }
    else if (look && look.labcoat) {
      c.fillStyle = S(o.kit); c.fillRect(hw - 3.5, 0, 7, th);
      c.strokeStyle = S('#bdbdbd'); c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(hw - 3.5, 0); c.lineTo(hw - 1, 8); c.moveTo(hw + 3.5, 0); c.lineTo(hw + 1, 8); c.stroke();
    } else {
      c.fillStyle = S(o.kit2); c.beginPath(); c.moveTo(hw - 5, 0); c.lineTo(hw + 5, 0); c.lineTo(hw, 5.5); c.closePath(); c.fill();
      c.fillRect(0, th - 3, tw, 3);
    }
    if (look && look.towel) { c.fillStyle = S('#ffffff'); rrect(c, 1, -1, 7, 15, 2.5); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.8; c.stroke(); }
    if (look && look.chain) { c.strokeStyle = S('#ffd43b'); c.lineWidth = 2; c.beginPath(); c.arc(hw, 0, 7, 0.25, Math.PI - 0.25); c.stroke(); }
    if (o.role === 'captain') {
      const bx = tw * 0.74, by = th * 0.4;
      circle(c, bx, by, 3.9, S(o.kit2), '#111', 1);
      c.fillStyle = '#111'; c.font = 'bold 6px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('C', bx, by + 0.4);
    }
    c.restore();
  } else if (tv[2]) {        // back: shirt number
    const amt = _rbShade[2];
    c.save(); rbFaceSpace(c, 5, 4, 1, tw, th);
    if (look && look.towel) { c.fillStyle = rbShadeCol(P('#ffffff'), amt); rrect(c, tw - 8, -1, 7, 12, 2.5); c.fill(); }
    if (o.number) { c.fillStyle = rbShadeCol(P(keeper ? o.kit : o.kit2), amt); c.font = `bold 11px ${FONT_UI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.number, hw, th * 0.48); }
    c.restore();
  }
  if (!raised) drawArm(nearSide);

  // ---- head (2D rounded cylinder; hats and faces are drawn on it as before)
  c.save();
  c.translate(sa * 1.5, -(SH + HEAD_H / 2 - 1) - bob);
  if (look && look.behind) look.behind(c, P, vfx, fy, back, t, o);
  rbHead(c, skin);
  if (!back) {
    if (!(look && look.hideEyes && o.expr !== 'hurt')) drawEyes(c, P, vfx, fy, o.expr);
    drawMouth(c, P, vfx, fy, o.expr, look && look.mouthOffset ? look.mouthOffset : 0);
  }
  if (look && look.front) look.front(c, P, vfx, fy, back, t, o);
  if (!look && o.role === 'sidekick' && SIDEKICK_HATS[o.hat]) SIDEKICK_HATS[o.hat](c, P, vfx, fy, back, o);
  if (keeper) {
    hairCap(c, P(o.kit), 10);
    c.fillStyle = P(shade(o.kit, -0.3)); c.beginPath(); c.ellipse(vfx * 11, -4, 9 * Math.max(0.3, Math.abs(vfx)), 3, 0, 0, TAU); c.fill();
  }
  c.restore();
  if (raised) drawArm(nearSide);

  if (o.tint === 'ice') {
    c.fillStyle = 'rgba(170,230,255,0.45)'; rrect(c, -24, -72, 48, 74, 6); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(-18, -66, 5, 30); c.fillRect(-10, -66, 3, 14);
  }
  c.restore();
}

// ============================================================================
//  BALL
// ============================================================================
function drawBall(c, x, y, r, rot, style = 'normal', t = 0) {
  c.save(); c.translate(x, y);
  switch (style) {
    case 'boulder': {
      for (let i = 0; i < 6; i++) {
        const a = t * 20 + i; circle(c, Math.cos(a) * r * 0.4 - r * 0.6, Math.sin(a) * r * 0.5, r * (0.6 - i * 0.06), `rgba(255,${120 + i * 20},0,${0.5 - i * 0.07})`);
      }
      c.rotate(rot);
      c.fillStyle = '#6d4a2f'; c.beginPath();
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, rr = r * (0.85 + ((i * 7) % 3) * 0.08); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fill(); c.strokeStyle = '#3b2716'; c.lineWidth = r * 0.12; c.stroke();
      circle(c, -r * 0.3, -r * 0.2, r * 0.18, '#4b3220'); circle(c, r * 0.3, r * 0.25, r * 0.14, '#4b3220');
      break;
    }
    case 'disco': {
      circle(c, 0, 0, r, '#c9d1d9');
      c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip();
      const n = 5;
      for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
        const h = (i * 37 + j * 91 + Math.floor(t * 10)) % 7;
        c.fillStyle = ['#ffffff', '#ff6bd5', '#7cf3ff', '#fff36b', '#c0c8d0', '#8f9aa5', '#ffffff'][h];
        c.fillRect(i * r / n * 1.0 - r / n / 2, j * r / n - r / n / 2, r / n * 0.9, r / n * 0.9);
      }
      c.restore(); circle(c, 0, 0, r, null, '#555', 1);
      break;
    }
    case 'cannon': {
      circle(c, 0, 0, r, '#1e1e24', '#000', 1.5);
      circle(c, -r * 0.35, -r * 0.35, r * 0.28, 'rgba(255,255,255,0.35)');
      break;
    }
    case 'bus': { // Lagos danfo bus
      const w = r * 2.1, h = r * 1.25;
      for (let i = 0; i < 4; i++) circle(c, -w * 0.6 - i * r * 0.25, rand(-h * 0.3, h * 0.3), r * (0.35 - i * 0.06), `rgba(120,120,120,${0.4 - i * 0.08})`);
      c.fillStyle = '#ffcc00'; rrect(c, -w / 2, -h / 2, w, h, r * 0.25); c.fill();
      c.strokeStyle = '#111'; c.lineWidth = r * 0.08; c.stroke();
      c.fillStyle = '#111'; c.fillRect(-w / 2, -h * 0.05, w, h * 0.14); c.fillRect(-w / 2, h * 0.22, w, h * 0.1);
      c.fillStyle = '#9fd8ff'; for (let i = 0; i < 4; i++) c.fillRect(-w / 2 + w * 0.06 + i * w * 0.23, -h * 0.4, w * 0.18, h * 0.28);
      circle(c, -w * 0.3, h / 2, r * 0.22, '#111'); circle(c, w * 0.3, h / 2, r * 0.22, '#111');
      break;
    }
    case 'jollof': { // a flying ball of jollof rice
      circle(c, 0, 0, r, '#e4572e', '#9c2c0e', 1.5);
      c.fillStyle = '#ffd7a8';
      for (let i = 0; i < 14; i++) { const a = i * 2.4 + rot, rr = r * (0.2 + (i % 5) * 0.15); c.fillRect(Math.cos(a) * rr - 1.5, Math.sin(a) * rr - 0.8, 3, 1.6); }
      circle(c, r * 0.3, -r * 0.4, r * 0.18, '#2f9e44');
      break;
    }
    case 'yarn': {
      circle(c, 0, 0, r, '#ff7ec8', '#b03076', 1.5);
      c.strokeStyle = '#ffd1ec'; c.lineWidth = r * 0.12;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0, 0, r * 0.85, rot + i, rot + i + 1.6); c.stroke(); }
      break;
    }
    default: {
      const glow = { quantum: '#66ff99', electric: '#fff35c', fire: '#ff8a1f', steam: '#e6f2ff', gold: '#ffd84a' }[style];
      if (glow) { circle(c, 0, 0, r * 1.7, glow + '55'); circle(c, 0, 0, r * 1.3, glow + '88'); }
      circle(c, 0, 0, r, '#fdfdfd', '#222', Math.max(1, r * 0.1));
      c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip();
      for (let i = 0; i < 5; i++) {
        const a = rot + i * TAU / 5;
        const cx = Math.cos(a) * r * 0.62, depth = Math.sin(a);
        if (depth > -0.3) circle(c, cx, (i % 2 ? -1 : 1) * r * 0.28, r * 0.3 * (0.6 + depth * 0.4), '#222');
      }
      circle(c, 0, 0, r * 0.26, '#222');
      c.restore();
      circle(c, -r * 0.35, -r * 0.4, r * 0.25, 'rgba(255,255,255,0.8)');
      if (style === 'electric') {
        c.strokeStyle = '#fff35c'; c.lineWidth = 2;
        for (let i = 0; i < 3; i++) { c.beginPath(); let a = Math.random() * TAU; c.moveTo(Math.cos(a) * r, Math.sin(a) * r); for (let k = 1; k < 4; k++) c.lineTo(Math.cos(a) * r * (1 + k * 0.3) + rand(-4, 4), Math.sin(a) * r * (1 + k * 0.3) + rand(-4, 4)); c.stroke(); }
      }
    }
  }
  c.restore();
}

// Build a character draw-descriptor for menus (portraits)
function portraitDesc(cap, role = 'captain', kit = null, t = 0, opts = {}) {
  return Object.assign({
    look: cap.id, role, kit: kit || cap.color, kit2: cap.color2, skin: role === 'captain' ? cap.skin : SKINS[cap.id.length % SKINS.length],
    hat: cap.sidekickHat, face: 0.35, anim: t, moving: 0, expr: 'happy', tint: null,
  }, opts);
}
