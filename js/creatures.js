// ============================================================================
//  CREATURES: blocky Roblox-style animals (and pitch NPCs) built from the same
//  flat-shaded 3D boxes as the players (rbBlock in draw.js), with walk cycles.
//  drawAnimal(c, kind, x, y, s, dir, t, gait, opts)
//    dir: +1 faces right, -1 faces left; t: animation time; gait: 0..1 walk speed
//    opts: { spray, sit, charge, slide, kick, tint }
// ============================================================================

const ANIMAL_LOOKS = {
  elephant:  { col: '#8e9aa6', dark: '#6b7682' },
  giraffe:   { col: '#f2c14e', dark: '#a0522d' },
  zebra:     { col: '#f4f4f4', dark: '#1b1b1b' },
  camel:     { col: '#c8a165', dark: '#8f6c3a' },
  goat:      { col: '#f1f1f1', dark: '#9e9e9e' },
  penguin:   { col: '#1d1d24', dark: '#ffffff' },
  wildebeest:{ col: '#5b5248', dark: '#2e2924' },
};

function drawAnimal(c, kind, x, y, s, dir, t, gait = 1, opts = {}) {
  const L = ANIMAL_LOOKS[kind] || ANIMAL_LOOKS.goat;
  const yaw = dir >= 0 ? Math.PI / 2 - 0.5 : -(Math.PI / 2 - 0.5);
  const sa = Math.sin(yaw), ca = Math.cos(yaw);
  const near = -Math.sign(sa);           // the lateral side facing the camera
  const parts = [];
  // queue a box; depth sorts far-to-near (the same depth rule the players use)
  const B = (pa, pf, ph, a0, a1, f0, f1, h0, h1, pitch, segs, roll = 0) =>
    parts.push({ d: -pa * sa + pf * ca + (ph > 60 ? 0.01 : 0), f: () => rbBlock(c, pa, pf, ph, a0, a1, f0, f1, h0, h1, roll, pitch, typeof segs === 'string' ? [[1, segs]] : segs) });
  const legs = (lx, lf, legH, w, col, swingAmt = 0.55) => {
    const ph = t * 9;
    // diagonal pairs move together: front-left with back-right
    for (const [sd, fr, off] of [[1, 1, 0], [-1, -1, 0], [-1, 1, Math.PI], [1, -1, Math.PI]]) {
      const sw = Math.sin(ph + off) * swingAmt * gait;
      B(sd * lx, fr * lf, legH, -w / 2, w / 2, -w / 2, w / 2, -legH, 1, sw, col);
    }
  };
  const tint = opts.tint ? (col => tintCol(col, opts.tint)) : (col => col);

  c.save();
  c.translate(x, y); c.scale(s, s);
  c.lineJoin = 'round';
  _rbV.sa = sa; _rbV.ca = ca;
  const bob = Math.abs(Math.sin(t * 9)) * 2 * gait;

  switch (kind) {
    case 'elephant': {
      const col = tint(L.col), dk = tint(L.dark);
      legs(12, 22, 26, 12, [[0.12, dk], [1, col]], 0.4);
      B(0, 0, 26 + bob, -20, 20, -34, 34, 0, 44, 0, col);                      // body
      B(0, -34, 60 + bob, -1.5, 1.5, -2, 0, -22, 0, -0.5 - Math.sin(t * 4) * 0.3, dk);  // tail
      const hh = 60 + bob;
      B(0, 36, hh, -16, 16, 0, 20, -20, 8, 0, col);                            // head
      const flap = Math.sin(t * 3) * 0.25;
      for (const sd of [-1, 1]) B(sd * 17, 34, hh + 2, -1.5, 1.5, -6, 12, -22, 6, 0, dk, sd * (0.15 + flap)); // ears
      for (const sd of [-1, 1]) B(sd * 8, 56, hh - 14, -1.5, 1.5, 0, 9, -2, 1, -0.6, '#fffaf0'); // tusks
      const trunkP = opts.spray ? 2.1 : 0.15 + Math.sin(t * 2) * 0.25;
      B(0, 54, hh - 4, -4.5, 4.5, -4, 4, -34, 0, trunkP, [[0.3, dk], [1, col]]);  // trunk
      B(near * 16.3, 50, hh, -0.6, 0.6, -2, 2, -3, 1, 0, '#111');              // eye
      break;
    }
    case 'giraffe': {
      const col = tint(L.col), dk = tint(L.dark);
      legs(8, 16, 50, 6, [[0.1, dk], [0.45, col], [1, col]], 0.45);
      B(0, 0, 50 + bob, -10, 10, -22, 22, 0, 24, 0, col);                      // body
      for (const [pf, ph] of [[-12, 58], [4, 64], [14, 56]]) B(near * 10.4, pf, ph + bob, -0.6, 0.6, -4, 4, -4, 4, 0, dk); // patches
      B(0, -22, 70 + bob, -1, 1, -1, 1, -20, 0, -0.3, dk);                      // tail
      const nk = 0.28 + Math.sin(t * 3) * 0.08 + (opts.kick ? Math.sin(opts.kick * Math.PI) * 0.6 : 0);
      B(0, 16, 70 + bob, -5, 5, -5, 5, 0, 60, -nk, col);                       // long neck (negative pitch leans an upright box forward)
      const nf = 16 + Math.sin(nk) * 60, nh = 70 + bob + Math.cos(nk) * 60;
      for (const [pf, ph] of [[0.35, 0.3], [0.7, 0.68]]) B(near * 5.4, 16 + Math.sin(nk) * 60 * pf, 70 + bob + Math.cos(nk) * 60 * ph, -0.6, 0.6, -3, 3, -3, 3, 0, dk);
      B(0, nf, nh, -6, 6, -4, 16, -6, 6, nk * 0.4, col);                       // head
      for (const sd of [-1, 1]) B(sd * 3, nf, nh + 6, -1, 1, -1, 1, 0, 7, 0, dk); // ossicones
      B(near * 6.3, nf + 6, nh + 1, -0.6, 0.6, -1.5, 1.5, -1.5, 1.5, 0, '#111');
      break;
    }
    case 'zebra': case 'wildebeest': {
      const zebra = kind === 'zebra';
      const col = tint(L.col), dk = tint(L.dark);
      legs(8, 18, 30, 6, zebra ? [[0.15, dk], [0.35, col], [0.5, dk], [0.7, col], [0.85, dk], [1, col]] : [[0.15, '#111'], [1, col]], 0.65);
      const n = zebra ? 7 : 1, bl = 52;
      for (let i = 0; i < n; i++) {                                              // striped body slices
        const f0 = -26 + bl * i / n, f1 = -26 + bl * (i + 1) / n;
        B(0, 0, 30 + bob, -11, 11, f0, f1, 0, 24, 0, zebra && i % 2 ? dk : col);
      }
      B(0, -26, 50 + bob, -1, 1, -1, 1, -18, 0, -0.4 - Math.sin(t * 6) * 0.3, dk);  // tail
      const hp = -0.35 + (opts.kick ? 0.5 : 0) + (opts.charge ? -0.5 : 0);
      B(0, 24, 50 + bob, -6, 6, -4, 16, -18, 6, hp, col);                     // head + neck
      B(0, 18, 56 + bob, -1.5, 1.5, -6, 8, 0, 4, 0, dk);                        // mane
      if (!zebra) for (const sd of [-1, 1]) B(sd * 6, 26, 56 + bob, -1, 1, -1, 1, 0, 9, 0, '#e8dcc8', sd * 0.9); // horns
      B(near * 6.3, 30, 52 + bob, -0.6, 0.6, -1.5, 1.5, -1.5, 1.5, 0, zebra ? '#111' : '#000');
      break;
    }
    case 'camel': {
      const col = tint(L.col), dk = tint(L.dark);
      const sit = opts.sit;
      const legH = sit ? 8 : 40;
      if (!sit) legs(9, 18, 40, 7, [[0.12, dk], [1, col]], 0.45);
      else for (const sd of [-1, 1]) for (const fr of [-1, 1]) B(sd * 9, fr * 18, 8, -4, 4, -8, 8, -8, 1, 0, col);
      const bh = legH + bob;
      B(0, 0, bh, -12, 12, -26, 26, 0, 24, 0, col);                            // body
      B(0, -4, bh + 24, -9, 9, -12, 8, 0, 16, 0, col);                          // hump
      B(0, -26, bh + 20, -1, 1, -1, 1, -16, 0, -0.3, dk);                       // tail
      const nk = 0.65 + (opts.spray ? -0.4 : 0);
      B(0, 24, bh + 18, -5, 5, -4, 4, 0, 30, -nk, col);                         // neck
      const nf = 24 + Math.sin(nk) * 30, nh = bh + 18 + Math.cos(nk) * 30;
      B(0, nf, nh, -6, 6, -3, 16, -5, 6, 0, col);                               // head
      B(0, nf + 15, nh - 3, -4, 4, 0, 2, -3, 1, 0, dk);                         // lips
      B(near * 6.3, nf + 5, nh + 2, -0.6, 0.6, -1.5, 1.5, -1.5, 1.5, 0, '#111');
      break;
    }
    case 'goat': {
      const col = tint(L.col), dk = tint(L.dark);
      legs(5, 11, 16, 4.5, [[0.18, '#555'], [1, col]], 0.7);
      B(0, 0, 16 + bob, -8, 8, -16, 16, 0, 16, 0, col);                         // body
      B(0, -16, 30 + bob, -1, 1, -1, 1, -6, 2, -0.6, col);                      // tail flick
      const hp = opts.charge ? -0.8 : -0.2 + Math.sin(t * 5) * 0.1;
      B(0, 16, 28 + bob, -5, 5, -3, 12, -8, 6, hp, col);                         // head
      for (const sd of [-1, 1]) B(sd * 3.5, 16, 34 + bob, -1, 1, -1, 1, 0, 8, 0, dk, sd * 0.2 - 0.5); // horns
      B(0, 24, 20 + bob, -1.5, 1.5, -1.5, 1.5, -7, 0, 0, '#ddd');               // beard
      B(near * 5.3, 22, 31 + bob, -0.6, 0.6, -1.2, 1.2, -1.2, 1.2, 0, '#111');
      break;
    }
    case 'penguin': {
      const col = tint(L.col);
      const wob = Math.sin(t * 14) * 0.08;
      // belly-sliding: body lies along the ground, white belly underneath
      B(0, 0, 2, -9, 9, -18, 18, 0, 16, 0, [[0.35, '#ffffff'], [1, col]], wob);
      B(0, 18, 4, -7, 7, 0, 12, 0, 14, 0, col);                                  // head
      B(0, 30, 8, -2, 2, 0, 6, -2, 2, 0, '#ff9f1c');                             // beak
      for (const sd of [-1, 1]) B(sd * 11, 2, 10, -1, 1, -6, 6, -1, 1, 0, col, sd * 0.6 + Math.sin(t * 18) * 0.4); // flippers
      for (const sd of [-1, 1]) B(sd * 4, -20, 4, -2, 2, -4, 0, -1, 1, 0, '#ff9f1c'); // feet
      B(near * 7.3, 26, 12, -0.6, 0.6, -1.2, 1.2, -1.2, 1.2, 0, '#fff');
      break;
    }
  }
  parts.sort((p, q) => p.d - q.d);
  for (const p of parts) p.f();
  c.restore();
}

// Pitch NPCs reuse the blocky player avatar with their own outfits.
const NPC_LOOKS = {
  vendor:  { kit: '#f59f00', kit2: '#7a2e8e', skin: '#5a3825', hat: 'headwrap' },
  invader: { kit: '#ffffff', kit2: '#e8433a', skin: '#8d5a3b', hat: 'headband' },
};
function drawNPC(c, kind, x, y, s, face, t, moving, opts = {}) {
  const L = NPC_LOOKS[kind];
  drawCharacter(c, {
    look: kind, role: 'sidekick', kit: L.kit, kit2: L.kit2, skin: L.skin, hat: L.hat, number: '',
    face, anim: t, moving, expr: opts.expr || 'happy', tint: null, lying: !!opts.down, lyingDir: 1, armsUp: !!opts.armsUp,
  }, x, y, s);
  if (kind === 'vendor' && !opts.down) { // a tray of snacks on her head
    c.save(); c.translate(x, y - 76 * s); c.scale(s, s);
    c.fillStyle = '#c8a165'; rrect(c, -18, -3, 36, 6, 2); c.fill(); c.strokeStyle = RB_EDGE; c.lineWidth = 1.2; c.stroke();
    drawEmoji(c, '🍢', -8, -10, 16); drawEmoji(c, '🍩', 8, -10, 15);
    c.restore();
  }
}
