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
  const big = expr === 'panic' ? 5.2 : 4.3;
  for (const s of [-1, 1]) {
    ellipse(c, ex + s * 5.5, ey, big * 0.85, big, '#fff', '#222', 1);
    circle(c, ex + s * 5.5 + px, ey + py, expr === 'panic' ? 1.3 : 2.2, '#111');
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
    c.strokeStyle = '#3a1a0a'; c.lineWidth = 1.8;
    c.beginPath(); c.arc(mx, my - 2.5, 4, 0.35, Math.PI - 0.35); c.stroke();
  }
}

// Each look: behind(c,P,fx,fy,back,t) drawn before head; front(...) after head & face.
const LOOKS = {
  brick: {
    bodyW: 1.35, headR: 16,
    front(c, P, fx, fy, back, t, o) {
      c.fillStyle = P('#2e1c10'); rrect(c, -14, -21, 28, 10, 3); c.fill();
      if (!back && o.expr !== 'hurt') {
        c.fillStyle = P('#111'); rrect(c, fx * 5.5 - 12, -6, 24, 7, 2.5); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(fx * 5.5 - 9, -5, 5, 2);
        return true; // eyes replaced
      }
    },
  },
  zara: {
    bodyW: 0.95, headR: 15,
    behind(c, P, fx, fy, back, t) {
      const sx = back ? 0 : -fx * 15;
      ellipse(c, sx, -2 + Math.sin(t * 14) * 2, 6, 11, P('#4a2a14'));
    },
    front(c, P, fx, fy, back) {
      c.fillStyle = P('#4a2a14'); c.beginPath(); c.arc(0, -2, 15.5, Math.PI * 1.05, Math.PI * 1.95); c.fill();
      c.fillStyle = P('#ff7b00'); c.fillRect(-15, -12, 30, 4);
      if (!back) { for (const s of [-1, 1]) circle(c, fx * 4 + s * 6, -12, 4.2, P('#8ee3ff'), P('#333'), 1.4); }
    },
  },
  nana: {
    bodyW: 1.0, headR: 15,
    front(c, P, fx, fy, back) {
      c.fillStyle = P('#dcdce6'); c.beginPath(); c.arc(0, -2, 16, Math.PI * 1.0, Math.PI * 2.0); c.fill();
      circle(c, 0, -19, 8.5, P('#e6e6ef'), P('#b5b5c3'), 1.2);
      if (!back) {
        c.strokeStyle = P('#7a3e9e'); c.lineWidth = 1.6;
        for (const s of [-1, 1]) { c.beginPath(); c.arc(fx * 5.5 + s * 5.5, -2 + fy * 1.5, 5.6, 0, TAU); c.stroke(); }
        circle(c, fx * 5 - 10, 4, 2.6, 'rgba(255,90,120,0.45)');
        circle(c, fx * 5 + 10, 4, 2.6, 'rgba(255,90,120,0.45)');
      }
    },
  },
  chunko: {
    bodyW: 1.45, headR: 16.5, belly: true,
    front(c, P, fx, fy, back, t, o) {
      // luchador mask covers the head
      circle(c, 0, 0, 16.8, P(o.kit));
      c.strokeStyle = P(o.kit2); c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(-6, -16); c.lineTo(0, -8); c.lineTo(6, -16); c.stroke();
      if (!back) {
        for (const s of [-1, 1]) {
          c.beginPath(); c.ellipse(fx * 5.5 + s * 5.8, -2, 5.6, 4.8, s * 0.4, 0, TAU);
          c.fillStyle = '#fff'; c.fill(); c.strokeStyle = P(o.kit2); c.lineWidth = 1.6; c.stroke();
        }
        ellipse(c, fx * 6, 8, 6, 4.5, P(o.skin));
      } else {
        c.strokeStyle = P('#fff'); c.lineWidth = 1.4;
        for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 3 - 2, 2); c.lineTo(i * 3 + 2, 8); c.stroke(); }
      }
    },
  },
  fizz: {
    bodyW: 1.0, headR: 15, labcoat: true,
    behind(c, P, fx, fy, back, t) {
      c.fillStyle = P('#f4f4f4');
      c.beginPath();
      const n = 11;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * 0.85 + (i / n) * Math.PI * 1.3;
        const rr = i % 2 ? 26 + Math.sin(t * 9 + i) * 2 : 15;
        c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr - 2);
      }
      c.closePath(); c.fill(); c.strokeStyle = P('#bbb'); c.lineWidth = 1; c.stroke();
    },
    front(c, P, fx, fy, back) {
      if (!back) {
        c.fillStyle = P('#333'); c.fillRect(-16, -4, 32, 3);
        for (const s of [-1, 1]) circle(c, fx * 5.5 + s * 5.8, -2, 6.2, 'rgba(160,255,120,0.35)', P('#222'), 2.4);
      }
    },
  },
  reggie: {
    bodyW: 1.05, headR: 15.5,
    front(c, P, fx, fy, back, t, o) {
      // top hat
      c.fillStyle = P('#141414'); rrect(c, -11, -38, 22, 24, 2); c.fill();
      rrect(c, -17, -16, 34, 5, 2); c.fill();
      c.fillStyle = P(o.kit2); c.fillRect(-11, -20, 22, 4);
      if (!back) {
        // monocle
        c.strokeStyle = P('#f5c542'); c.lineWidth = 1.8;
        c.beginPath(); c.arc(fx * 5.5 + 5.5, -2, 5.8, 0, TAU); c.stroke();
        c.beginPath(); c.moveTo(fx * 5.5 + 10, 1); c.quadraticCurveTo(fx * 5.5 + 13, 12, fx * 5.5 + 8, 18); c.stroke();
        // ludicrous moustache
        const mx = fx * 6, my = 4.5, wob = Math.sin(t * 6) * 1.5;
        c.fillStyle = P('#6b3d1f');
        for (const s of [-1, 1]) {
          c.beginPath(); c.moveTo(mx, my);
          c.bezierCurveTo(mx + s * 8, my - 5, mx + s * 16, my + 6, mx + s * 22, my - 6 + wob);
          c.bezierCurveTo(mx + s * 21, my + 2, mx + s * 12, my + 9, mx, my + 4);
          c.fill();
        }
        return false;
      }
    },
    mouthOffset: 3,
  },
  disco: {
    bodyW: 1.0, headR: 15, chain: true,
    behind(c, P) { circle(c, 0, -6, 24, P('#2a170c')); for (let i = 0; i < 9; i++) circle(c, Math.cos(i * 0.7) * 20, -6 + Math.sin(i * 0.7) * 20, 6, P('#3a2213')); },
    front(c, P, fx, fy, back, t, o) {
      if (!back && o.expr !== 'hurt') {
        for (const s of [-1, 1]) {
          const x = fx * 5.5 + s * 6;
          c.save(); c.translate(x, -2); c.rotate(t * 2 * s);
          c.fillStyle = P('#ffe600'); c.beginPath();
          for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = i % 2 ? 3 : 7; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          c.closePath(); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 1; c.stroke(); c.restore();
        }
        return true;
      }
    },
  },
  barnacle: {
    bodyW: 1.2, headR: 16,
    front(c, P, fx, fy, back, t) {
      if (!back) {
        // beard
        c.fillStyle = P('#b5541c');
        c.beginPath(); c.moveTo(fx * 6 - 14, 1); c.quadraticCurveTo(fx * 6, 30, fx * 6 + 14, 1); c.quadraticCurveTo(fx * 6, 12, fx * 6 - 14, 1); c.fill();
        // eyepatch
        c.strokeStyle = '#111'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(-15, -9); c.lineTo(15, 3); c.stroke();
        circle(c, fx * 5.5 + 5.5, -2, 4.8, '#111');
      }
      // tricorne
      c.fillStyle = P('#2b1a0e');
      c.beginPath(); c.moveTo(-22, -10); c.quadraticCurveTo(0, -42, 22, -10); c.quadraticCurveTo(0, -18, -22, -10); c.fill();
      if (!back) { circle(c, 0, -21, 3.4, '#fff'); c.fillStyle = '#111'; c.fillRect(-1.8, -22, 1.4, 1.4); c.fillRect(0.6, -22, 1.4, 1.4); }
    },
    hideLeftEye: true,
  },
};

const SIDEKICK_HATS = {
  headband(c, P, fx, fy, back, o) {
    c.fillStyle = P('#3b2a1a'); c.beginPath(); c.arc(0, -2, 15, Math.PI, TAU); c.fill();
    c.fillStyle = P(o.kit2); c.fillRect(-15, -11, 30, 5);
    if (back) { c.beginPath(); c.moveTo(0, -9); c.lineTo(-7, 2); c.lineTo(-3, 2); c.fill(); }
  },
  helmet(c, P, fx, fy, back, o) {
    c.fillStyle = P(o.kit); c.beginPath(); c.arc(0, -3, 16, Math.PI, TAU); c.fill();
    c.fillStyle = P(o.kit2); c.fillRect(-2, -19, 4, 16);
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.arc(-5, -10, 4, 0, TAU); c.fill();
  },
  curlers(c, P) {
    c.fillStyle = P('#c9c3d6'); c.beginPath(); c.arc(0, -2, 15.5, Math.PI, TAU); c.fill();
    for (let i = -2; i <= 2; i++) circle(c, i * 6, -13 - Math.abs(i) * -1.2, 3.3, P('#ff8fd0'), P('#c2408a'), 1);
  },
  mask(c, P, fx, fy, back, o) {
    circle(c, 0, 0, 15.5, P(o.kit2));
    if (!back) for (const s of [-1, 1]) ellipse(c, fx * 5.5 + s * 5.5, -2, 5, 4.4, '#fff');
    ellipse(c, fx * 6, 8, 5, 4, P(o.skin));
  },
  goggles(c, P, fx, fy, back) {
    c.fillStyle = P('#5c3b22'); for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(-10 + i * 5, -12, 5, 0, TAU); c.fill(); }
    c.fillStyle = P('#333'); c.fillRect(-15, -13, 30, 3);
    if (!back) for (const s of [-1, 1]) circle(c, s * 5.5, -13, 3.6, 'rgba(180,255,140,0.8)', '#222', 1.2);
  },
  tophat(c, P, fx, fy, back, o) {
    c.fillStyle = P('#1a1a1a'); c.beginPath(); c.ellipse(0, -13, 13, 9, 0, Math.PI, TAU); c.fill();
    rrect(c, -16, -14, 32, 4, 2); c.fill();
    if (!back) { c.fillStyle = P('#6b3d1f'); c.fillRect(fx * 6 - 6, 3, 12, 2.6); }
  },
  afro(c, P, fx, fy, back, o, behind) {
    if (behind) circle(c, 0, -8, 19, P('#24140b'));
  },
  bandana(c, P, fx, fy, back, o) {
    c.fillStyle = P(o.kit2); c.beginPath(); c.arc(0, -2, 15.8, Math.PI * 1.02, Math.PI * 1.98); c.fill();
    c.fillStyle = P('#fff'); for (let i = -1; i <= 1; i++) circle(c, i * 6, -9, 1.4, P('#fff'));
    const kx = back ? 0 : -fx * 15;
    c.fillStyle = P(o.kit2); c.beginPath(); c.moveTo(kx, -8); c.lineTo(kx - 6 * (back ? 1 : fx || 1), 2); c.lineTo(kx + 2, 0); c.fill();
  },
};

function drawSkeleton(c, o, headR) {
  // black silhouette w/ glowing bones (electrocution gag)
  ellipse(c, 0, -22, 13, 14, '#111');
  circle(c, 0, -46, headR, '#111');
  c.strokeStyle = '#fffbe0'; c.lineWidth = 2.4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, -34); c.lineTo(0, -10); c.stroke();
  for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-8, -30 + i * 6); c.quadraticCurveTo(0, -27 + i * 6, 8, -30 + i * 6); c.stroke(); }
  c.beginPath(); c.moveTo(-5, -10); c.lineTo(-6, 0); c.moveTo(5, -10); c.lineTo(6, 0); c.stroke();
  c.beginPath(); c.moveTo(-10, -30); c.lineTo(-17, -40); c.moveTo(10, -30); c.lineTo(17, -40); c.stroke();
  circle(c, 0, -47, headR * 0.72, '#fffbe0');
  circle(c, -4, -49, 2.6, '#111'); circle(c, 4, -49, 2.6, '#111');
  c.fillStyle = '#111'; c.fillRect(-4, -42, 8, 1.6);
}

function drawCharacter(c, o, x, y, s) {
  const look = o.role === 'captain' ? LOOKS[o.look] : null;
  const fx = Math.cos(o.face), fy = Math.sin(o.face);
  const back = fy < -0.62;
  const run = clamp(o.moving, 0, 1);
  const t = o.anim;
  const ph = t * 15;
  const bob = (Math.abs(Math.sin(ph)) * 2.6 * run) + (o.dance ? Math.abs(Math.sin(t * 9)) * 5 : 0) + (o.armsUp ? Math.abs(Math.sin(t * 10)) * 8 : 0);
  const headR = look ? look.headR : (o.role === 'keeper' ? 15.5 : 14.5);
  const bw = look ? look.bodyW : (o.role === 'keeper' ? 1.15 : 1.0);
  const P = col => tintCol(col, o.tint);

  c.save();
  c.translate(x, y); c.scale(s, s);
  let sx = 1, sy = 1;
  if (o.spin) sx = Math.cos(t * 28);
  if (o.flat) { sx *= 1 + o.flat * 0.8; sy *= 1 - o.flat * 0.72; }
  if (o.lying) { c.translate(0, -8); c.rotate(o.lyingDir * Math.PI / 2); c.translate(0, 8 - 4); }
  if (o.dance) c.rotate(Math.sin(t * 9) * 0.22);
  c.scale(sx, sy);

  if (o.tint === 'zap' && Math.floor(t * 18) % 2 === 0) { drawSkeleton(c, o, headR); c.restore(); return; }

  // legs + shoes
  const sw = Math.sin(ph) * run;
  const legCol = P(o.role === 'keeper' ? '#222' : shade(o.kit, -0.45));
  for (const sd of [-1, 1]) {
    const lift = Math.max(0, sd * sw) * 5;
    const lx = sd * 5.5 * bw + fx * sd * sw * 2;
    c.fillStyle = legCol; rrect(c, lx - 3, -14 - lift, 6, 12, 2.5); c.fill();
    ellipse(c, lx + fx * 2.5, -2 - lift, 6, 3.8, P(o.look === 'zara' && o.role === 'captain' ? '#ff2d6f' : '#1b1b1b'));
    if (o.look === 'zara' && o.role === 'captain') { circle(c, lx - 3, 1 - lift, 1.8, '#ffd43b'); circle(c, lx + 3, 1 - lift, 1.8, '#ffd43b'); }
  }

  // body
  const by = -24 - bob;
  const bodyCol = P(o.role === 'keeper' ? o.kit2 : (look && look.labcoat ? '#f2f2f2' : o.kit));
  const bRX = 13 * bw, bRY = look && look.belly ? 15 : 13.5;
  // back arm
  const armSw = Math.sin(ph + Math.PI) * 6 * run;
  const handR = o.role === 'keeper' ? 7.5 : 4.2;
  const handCol = o.role === 'keeper' ? P('#ffffff') : P(o.skin);
  const armY = o.armsUp || o.dance ? by - 18 : by + 2;
  circle(c, -fx * 2 - (bRX + 2), armY + (o.armsUp ? Math.sin(t * 12) * 3 : armSw), handR, handCol, '#222', 1);
  ellipse(c, 0, by, bRX, bRY, bodyCol, '#1a1a1a', 1.4);
  if (look && look.labcoat) { c.fillStyle = P(o.kit); c.fillRect(-4, by - 12, 8, 24); }
  if (o.role === 'keeper') { c.fillStyle = P(o.kit); c.fillRect(-bRX + 2, by - 3, bRX * 2 - 4, 5); }
  else { c.fillStyle = P(o.kit2); c.beginPath(); c.ellipse(0, by - bRY + 3, 7, 3.2, 0, 0, Math.PI); c.fill(); }
  if (look && look.chain && !back) { c.strokeStyle = '#ffd43b'; c.lineWidth = 2; c.beginPath(); c.arc(fx * 3, by - 10, 7, 0.2, Math.PI - 0.2); c.stroke(); }
  if (o.role === 'captain' && !back) {
    // captain "C" badge
    circle(c, fx * 5 - 4, by - 2, 4.2, P(o.kit2), '#111', 1);
    c.fillStyle = '#111'; c.font = 'bold 6px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('C', fx * 5 - 4, by - 1.6);
  }
  if (o.number && back) { c.fillStyle = P(o.kit2); c.font = `bold 11px ${FONT_UI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.number, 0, by); }
  // front arm
  circle(c, fx * 2 + (bRX + 2), armY + (o.armsUp ? Math.cos(t * 12) * 3 : -armSw), handR, handCol, '#222', 1);

  // head
  c.save();
  c.translate(fx * 1.5, -47 - bob);
  const hairBehind = look ? look.behind : null;
  if (hairBehind) hairBehind(c, P, fx, fy, back, t, o);
  if (!look && o.hat === 'afro') SIDEKICK_HATS.afro(c, P, fx, fy, back, o, true);
  if (o.role === 'keeper') { /* nothing behind */ }
  circle(c, 0, 0, headR, P(o.skin), '#1a1a1a', 1.4);
  if (look && o.look === 'chunko') { look.front(c, P, fx, fy, back, t, o); }
  if (!back) {
    // determine if look hides eyes (sunglasses etc.)
    let hide = false;
    if (look && (o.look === 'brick' || o.look === 'disco') && o.expr !== 'hurt') hide = true;
    if (!hide) drawEyes(c, P, fx, fy, o.expr);
    if (!(look && o.look === 'barnacle')) drawMouth(c, P, fx, fy, o.expr, look && look.mouthOffset ? look.mouthOffset : 0);
    else drawMouth(c, P, fx, fy, o.expr, -1);
  }
  if (look && look.front && o.look !== 'chunko') look.front(c, P, fx, fy, back, t, o);
  if (!look && o.role === 'sidekick' && SIDEKICK_HATS[o.hat] && o.hat !== 'afro') SIDEKICK_HATS[o.hat](c, P, fx, fy, back, o);
  if (o.role === 'keeper') {
    c.fillStyle = P(o.kit); c.beginPath(); c.arc(0, -3, 15.5, Math.PI, TAU); c.fill();
    c.fillStyle = P(shade(o.kit, -0.3)); c.beginPath(); c.ellipse(fx * 10, -4, 9 * Math.max(0.3, Math.abs(fx)), 3, 0, 0, TAU); c.fill();
  }
  c.restore();

  if (o.tint === 'ice') {
    c.fillStyle = 'rgba(170,230,255,0.45)'; rrect(c, -22, -72, 44, 74, 6); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(-16, -66, 5, 30); c.fillRect(-8, -66, 3, 14);
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
    look: cap.id, role, kit: kit || cap.color, kit2: cap.color2, skin: role === 'captain' ? cap.skin : ['#f0c8a0', '#c68e5f', '#8d5a3b', '#f5d6b8'][cap.id.length % 4],
    hat: cap.sidekickHat, face: 0.35, anim: t, moving: 0, expr: 'happy', tint: null,
  }, opts);
}
