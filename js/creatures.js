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
  // a chain segment that starts at (pf, ph) and leans `ang` radians forward from straight up
  // (ang = PI hangs straight down). Returns the far end so segments can be chained (necks, trunks, tails).
  const seg = (pa, pf, ph, len, ang, w, col, wf = w) => {
    B(pa, pf, ph, -w / 2, w / 2, -wf / 2, wf / 2, 0, len, -ang, col);
    return [pf + Math.sin(ang) * len, ph + Math.cos(ang) * len];
  };
  // jointed leg: upper + lower segment + hoof. `swing` rotates the whole leg, `bend` folds the lower joint.
  const leg = (pa, pf, ph, up, lo, w, swing, bend, colU, colL, hoof) => {
    const [kf, kh] = seg(pa, pf, ph, up, Math.PI - swing, w, colU);
    const [ff, fh] = seg(pa, kf, kh, lo, Math.PI - swing - bend, w * 0.78, colL);
    if (hoof) B(pa, ff, fh, -w * 0.42, w * 0.42, -w * 0.42, w * 0.5, -1, Math.min(2.5, w * 0.25), 0, hoof);
  };
  // four legs, diagonal pairs in step; front knees fold back, hind hocks fold forward while lifting
  const legs = (lx, lf, hipH, up, lo, w, colU, colL, hoof, amt = 0.5, fold = 0.9) => {
    const ph = t * 9;
    for (const [sd, fr, off] of [[1, 1, 0], [-1, -1, 0], [-1, 1, Math.PI], [1, -1, Math.PI]]) {
      const p = ph + off, sw = Math.sin(p) * amt * gait, lift = Math.max(0, Math.cos(p)) * fold * gait;
      if (fr > 0) leg(sd * lx, lf, hipH, up, lo, w, sw, -lift, colU, colL, hoof);
      else leg(sd * lx, -lf, hipH, up, lo, w, sw + 0.18, -0.36 + lift * 0.6, colU, colL, hoof);
    }
  };
  const eye = (pf, ph, hw) => { B(near * (hw + 0.3), pf, ph, -0.5, 0.5, -1.6, 1.6, -1.6, 1.6, 0, '#111'); B(near * (hw + 0.6), pf + 0.6, ph + 0.6, -0.3, 0.3, -0.5, 0.5, -0.5, 0.5, 0, '#fff'); };
  const tint = opts.tint ? (col => tintCol(col, opts.tint)) : (col => col);

  c.save();
  c.translate(x, y); c.scale(s, s);
  c.lineJoin = 'round';
  _rbV.sa = sa; _rbV.ca = ca;
  const bob = Math.abs(Math.sin(t * 9)) * 1.6 * gait;
  const sway = Math.sin(t * 4.5);

  switch (kind) {
    case 'elephant': {
      const col = tint(L.col), dk = tint(L.dark), nail = '#c9c2b4';
      const hh = 30 + bob;
      legs(12, 20, hh + 4, 17, 16, 13, col, col, nail, 0.3, 0.45);
      B(0, 0, hh, -18, 18, -28, 26, -4, 0, 0, col);                             // belly (rounds the underside)
      B(0, 0, hh, -21, 21, -32, 30, 0, 34, 0, col);                             // barrel
      B(0, 10, hh, -17, 17, -6, 26, 34, 42, 0, col);                            // shoulder hump
      B(0, -14, hh, -16, 16, -26, 0, 34, 39, 0, col);                           // rump
      const [tf, th] = seg(0, -32, hh + 28, 16, Math.PI - 0.35 - sway * 0.25, 2, dk);
      B(0, tf, th, -2, 2, -2, 2, -5, 0, 0, '#3a3f45');                          // tail tuft
      const hf = 30, hz = hh + 26;
      B(0, hf, hz, -15, 15, 0, 18, -12, 14, 0, col);                            // head
      B(0, hf + 2, hz, -12, 12, 0, 14, 14, 19, 0, col);                         // forehead dome
      const flap = Math.sin(t * 3) * 0.22;
      for (const sd of [-1, 1]) B(sd * 16, hf + 4, hz + 8, -1.4, 1.4, -18, 2, -26, 8, 0, [[0.85, dk], [1, col]], sd * (0.2 + flap)); // big ears
      for (const sd of [-1, 1]) seg(sd * 7, hf + 16, hz - 8, 11, 2.0, 2.6, '#fffaf0');  // tusks curve forward-up
      // three-piece trunk: hangs and swings, or rears up to spray
      let a = opts.spray ? 1.5 : Math.PI - 0.12 - sway * 0.18, [f1, h1] = [hf + 17, hz - 2];
      const curl = opts.spray ? -0.5 : -0.22;
      [[13, 10], [12, 8], [11, 6.5]].forEach(([len, w]) => { [f1, h1] = seg(0, f1, h1, len, a, w, col); a += curl; });
      B(0, f1, h1, -3.2, 3.2, -3.2, 3.2, -1.5, 1.5, 0, dk);                     // trunk tip
      eye(hf + 12, hz + 4, 15);
      break;
    }
    case 'giraffe': {
      const col = tint(L.col), dk = tint(L.dark), hoof = '#3b2a1a';
      const hh = 52 + bob;
      legs(7, 15, hh + 2, 27, 26, 6, [[0.3, col], [1, col]], [[0.15, '#f7e0a0'], [1, col]], hoof, 0.42, 0.8);
      B(0, 0, hh, -10, 10, -20, 20, 0, 20, 0.14, col);                          // body, front higher
      B(0, 10, hh + 4, -9, 9, -8, 12, 18, 25, 0.1, col);                        // withers
      B(0, -2, hh - 1, -8, 8, -16, 14, -3, 0, 0.14, col);                       // belly
      for (const [pf, ph, w] of [[-13, 9, 3], [-5, 13, 3.5], [4, 10, 3], [-9, 3, 2.5], [12, 15, 3], [1, 4, 2.5], [-15, 15, 2.2], [9, 4, 2.2]]) B(near * 10.3, pf, hh + ph, -0.6, 0.6, -w, w, -w * 0.8, w * 0.8, 0.14, dk); // patches
      const [tf, th] = seg(0, -20, hh + 14, 18, Math.PI - 0.3 - sway * 0.3, 1.6, col);
      B(0, tf, th, -1.8, 1.8, -1.8, 1.8, -5, 0, 0, dk);
      const nk = 0.42 + Math.sin(t * 3) * 0.06 + (opts.kick ? Math.sin(opts.kick * Math.PI) * 0.7 : 0);
      let [nf, nh] = seg(0, 16, hh + 18, 32, nk, 9, col, 10);                   // neck, lower
      B(0, 16, hh + 18, -1, 1, -6, -4, 0, 32, -nk, dk);                          // mane (back of the neck)
      for (const fr of [0.3, 0.7]) B(near * 4.8, 16 + Math.sin(nk) * 32 * fr, hh + 18 + Math.cos(nk) * 32 * fr, -0.5, 0.5, -3, 3, -3, 3, 0, dk);
      const n2 = nk * 0.75;
      const [hf, hz] = seg(0, nf, nh, 26, n2, 7, col, 8);                       // neck, upper
      B(0, nf, nh, -1, 1, -5, -3, 0, 26, -n2, dk);
      B(0, hf, hz, -5.5, 5.5, -4, 10, -5, 5, 0.25, col);                        // head
      B(0, hf + 9, hz - 3, -4, 4, 0, 7, -4, 3, 0.25, [[0.4, '#7a5a3a'], [1, col]]); // muzzle
      for (const sd of [-1, 1]) { B(sd * 2.5, hf - 1, hz + 5, -0.9, 0.9, -0.9, 0.9, 0, 6, 0, col); B(sd * 2.5, hf - 1, hz + 11, -1.4, 1.4, -1.4, 1.4, 0, 2, 0, dk); } // ossicones
      for (const sd of [-1, 1]) B(sd * 6, hf - 2, hz + 3, -1, 1, -1.5, 1.5, 0, 5, 0, col, sd * 1.1);   // ears
      eye(hf + 3, hz + 2, 5.5);
      break;
    }
    case 'zebra': case 'wildebeest': {
      const zebra = kind === 'zebra';
      const col = tint(L.col), dk = tint(L.dark), hoof = '#222';
      const stripes = zebra ? [[0.2, dk], [0.4, col], [0.6, dk], [0.8, col], [1, dk]] : col;
      const hh = 31 + bob;
      legs(7, 17, hh + 2, 16, 16, 6, stripes, zebra ? [[0.25, col], [0.5, dk], [0.75, col], [1, dk]] : [[0.3, '#222'], [1, col]], hoof, 0.6);
      const n = zebra ? 8 : 1, bl = 48;
      for (let i = 0; i < n; i++) {                                              // striped body slices, rounded at the ends
        const f0 = -24 + bl * i / n, f1 = -24 + bl * (i + 1) / n, e = zebra ? Math.min(i, n - 1 - i) : 2, inset = e === 0 ? 2.5 : e === 1 ? 0.8 : 0;
        B(0, 0, hh, -10 + inset * 0.6, 10 - inset * 0.6, f0, f1, inset, 22 - inset * 0.7, 0, zebra && i % 2 ? dk : col);
      }
      if (!zebra) B(0, 10, hh, -10.5, 10.5, -4, 16, 8, 26, 0, col);             // wildebeest: hunched shoulders
      const [tf, th] = seg(0, -24, hh + 18, 15, Math.PI - 0.35 - Math.sin(t * 6) * 0.3, 1.6, col);
      B(0, tf, th, -2, 2, -2, 2, -7, 0, 0, dk);                                  // tail switch
      const hp = 0.75 + (opts.kick ? 0.5 : 0) + (opts.charge ? 0.6 : 0) + sway * 0.05;
      const [nf, nh] = seg(0, 20, hh + 14, 18, hp, 9, zebra ? [[0.33, col], [0.66, dk], [1, col]] : col, 11); // neck
      B(0, 20, hh + 14, -1.2, 1.2, -7, -4, 0, 20, -hp, zebra ? [[0.25, dk], [0.5, col], [0.75, dk], [1, col]] : dk); // mane
      const ha = hp + 1.2;
      B(0, nf, nh, -5, 5, -4, 6, -4, 5, 0, col);                                 // head (cheeks)
      const [mf, mh] = seg(0, nf + 3, nh + 1, 13, ha, 7, zebra ? [[0.35, col], [0.6, dk], [1, col]] : col, 8); // long face
      B(0, mf, mh, -3.8, 3.8, -3.8, 3.8, -2, 2, 0, zebra ? '#2a2a2a' : '#1a1a1a');  // nose
      for (const sd of [-1, 1]) B(sd * 3.2, nf - 2, nh + 4, -1, 1, -1.4, 1.4, 0, 6, 0.2, zebra ? [[0.5, col], [1, dk]] : col, sd * 0.3); // ears
      if (!zebra) {
        for (const sd of [-1, 1]) { const [hx, hz2] = [nf, nh + 4]; B(sd * 4, hx, hz2, -1.2, 1.2, -1.2, 1.2, 0, 5, 0, '#e8dcc8', sd * 1.3); B(sd * 8, hx, hz2 + 3, -1, 1, -1, 1, 0, 4, 0, '#e8dcc8', sd * 0.2); } // curved horns
        B(0, nf + 6, nh - 6, -1.5, 1.5, -2, 2, -7, 0, 0, '#222');                // beard
      }
      eye(nf + 2, nh + 2, 5);
      break;
    }
    case 'camel': {
      const col = tint(L.col), dk = tint(L.dark), pad = '#6e5130';
      const sit = opts.sit;
      const hh = (sit ? 9 : 40) + (sit ? 0 : bob);
      if (!sit) legs(8, 17, hh + 2, 21, 21, 6.5, col, col, pad, 0.45, 0.85);
      else for (const sd of [-1, 1]) for (const fr of [-1, 1]) { B(sd * 9, fr * 16, 9, -4, 4, -9, 9, -9, 0, 0, col); B(sd * 9, fr * 16 + 9, 2, -3.5, 3.5, -2, 4, -2, 1, 0, pad); }
      B(0, 0, hh, -11, 11, -24, 24, 0, 21, 0, col);                              // body
      B(0, 0, hh, -9, 9, -18, 18, -3, 0, 0, col);                                // belly
      B(0, -3, hh + 21, -9, 9, -13, 9, 0, 9, 0, col);                            // hump, lower
      B(0, -3, hh + 30, -6, 6, -8, 4, 0, 6, 0, col);                             // hump, top (rounded)
      const [tf, th] = seg(0, -24, hh + 18, 14, Math.PI - 0.25 - sway * 0.2, 1.6, col);
      B(0, tf, th, -1.8, 1.8, -1.8, 1.8, -4, 0, 0, dk);
      // S-shaped neck: dips forward, then rises
      const dip = opts.spray ? 1.4 : 1.95 + sway * 0.05;
      const [n1f, n1h] = seg(0, 22, hh + 13, 17, dip, 8, col, 9);
      const [hf, hz] = seg(0, n1f, n1h, 19, opts.spray ? 0.9 : 0.3, 7, col, 8);
      B(0, n1f, n1h, -1.2, 1.2, -6, -3, 0, 18, -(opts.spray ? 0.9 : 0.3), dk);   // neck fur
      B(0, hf, hz, -5.5, 5.5, -4, 8, -4, 5, 0, col);                             // head
      B(0, hf + 8, hz - 2, -4.5, 4.5, 0, 8, -4, 3, 0, col);                      // muzzle
      B(0, hf + 13, hz - 5, -4, 4, 0, 3, -2, 0, opts.spray ? -0.6 : 0.15, dk);  // droopy lip
      for (const sd of [-1, 1]) B(sd * 4.5, hf - 2, hz + 4, -1, 1, -1.2, 1.2, 0, 3.5, 0, col, sd * 0.6); // ears
      eye(hf + 3, hz + 2, 5.5);
      break;
    }
    case 'goat': {
      const col = tint(L.col), dk = tint(L.dark), hoof = '#4a4a4a';
      const hh = 17 + bob;
      legs(5, 11, hh + 1, 9, 9, 4.2, col, [[0.3, '#bdbdbd'], [1, col]], hoof, 0.65);
      B(0, 0, hh, -7.5, 7.5, -15, 15, 0, 14, 0, col);                            // body
      B(0, 2, hh + 14, -6, 6, -11, 11, 0, 2.5, 0, col);                          // back (rounded)
      B(0, 0, hh, -6, 6, -11, 11, -2, 0, 0, col);                                // belly
      B(0, -15, hh + 12, -1.6, 1.6, -1.5, 1.5, 0, 6, 0.6 + Math.sin(t * 12) * 0.3, col);   // flicking tail
      const ch = opts.charge ? 1.5 : 0.55 + Math.sin(t * 5) * 0.08;
      const [hf, hz] = seg(0, 13, hh + 9, 9, ch, 6, col, 7);                     // neck
      B(0, hf, hz, -4.5, 4.5, -3, 6, -3, 4, 0, col);                             // head
      const [mf, mh] = seg(0, hf + 4, hz, 7, ch + 1.1, 4.4, col, 5);             // snout
      B(0, mf, mh, -2.4, 2.4, -2.4, 2.4, -1.2, 1.2, 0, '#c9a3a3');                 // nose
      B(0, hf + 4, hz - 4, -1.2, 1.2, -1.5, 1.5, -6, 0, 0, '#d8d8d8');           // beard
      for (const sd of [-1, 1]) {                                                // curved horns sweep back
        const [h1f, h1h] = seg(sd * 2.5, hf - 1, hz + 3, 5, -0.5, 1.8, dk);
        seg(sd * 2.8, h1f, h1h, 4.5, -1.5, 1.4, dk);
        B(sd * 5.5, hf - 1, hz + 2, -1, 1, -2, 1.5, -1, 1, 0, col, sd * 1.2);   // floppy ears
      }
      eye(hf + 2, hz + 2, 4.5);
      break;
    }
    case 'penguin': {
      const col = tint(L.col);
      const wob = Math.sin(t * 14) * 0.08;
      // belly-sliding: body lies along the ground, white belly underneath
      B(0, 0, 2, -9, 9, -16, 16, 0, 15, 0, [[0.4, '#ffffff'], [1, col]], wob);
      B(0, 0, 2, -7, 7, -19, 19, 1, 12, 0, [[0.45, '#ffffff'], [1, col]], wob);   // rounder ends
      B(0, 18, 4, -7, 7, 0, 11, 0, 13, 0, col);                                  // head
      B(near * 0.5, 22, 4, -6.6, 6.6, 0, 6, 3, 9, 0, '#ffffff');                 // white face patch
      B(0, 29, 7, -1.8, 1.8, 0, 6, -1.5, 1.5, 0, '#ff9f1c');                     // beak
      for (const sd of [-1, 1]) B(sd * 10, 2, 9, -1, 1, -7, 5, -1, 1, 0, col, sd * 0.6 + Math.sin(t * 18) * 0.4); // flippers
      for (const sd of [-1, 1]) B(sd * 4, -19, 4, -2.4, 2.4, -5, 0, -1, 1, 0, '#ff9f1c'); // feet
      eye(26, 10, 7);
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
