// ============================================================================
//  MATCH RENDERING: stadium, crowd, pitch, goals, entities, FX, HUD
// ============================================================================

let VW = 1280, VH = 720, CZ = 1, CX = 0, CY = 0, SHX = 0, SHY = 0;
function PX(x, z = 0) { const dx = (x - CX) * CZ; return VW / 2 + dx + z * CZ * (dx / VW) * 0.55 + SHX; }
function PY(y, z = 0) { return VH / 2 + 30 + (y - CY) * CZ * TILT - z * CZ + SHY; }
function P3(x, y, z) { return [PX(x, z), PY(y, z)]; }
function quad(c, pts, fillStyle, strokeStyle, lw) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath();
  if (fillStyle) { c.fillStyle = fillStyle; c.fill(); }
  if (strokeStyle) { c.strokeStyle = strokeStyle; c.lineWidth = lw || 1; c.stroke(); }
}
function netQuad(c, A, B, C, D, nu, nv, col) {
  // A-B bottom edge, D-C top edge
  c.strokeStyle = col; c.lineWidth = Math.max(0.6, CZ * 0.8); c.beginPath();
  for (let i = 0; i <= nu; i++) { const t = i / nu; c.moveTo(lerp(A[0], B[0], t), lerp(A[1], B[1], t)); c.lineTo(lerp(D[0], C[0], t), lerp(D[1], C[1], t)); }
  for (let j = 0; j <= nv; j++) { const t = j / nv; c.moveTo(lerp(A[0], D[0], t), lerp(A[1], D[1], t)); c.lineTo(lerp(B[0], C[0], t), lerp(B[1], C[1], t)); }
  c.stroke();
}

let _stars = null;
function renderMatch(c) {
  const S = M.stadium;
  VW = App.W; VH = App.H; CZ = M.cam.zoom; CX = M.cam.x; CY = M.cam.y;
  SHX = (Math.random() - 0.5) * M.shake * 1.6; SHY = (Math.random() - 0.5) * M.shake * 1.6;

  // sky
  const g = c.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, S.bg); g.addColorStop(1, S.bg2);
  c.fillStyle = g; c.fillRect(0, 0, VW, VH);
  if (S.night) {
    if (!_stars) _stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random() * 0.5, s: Math.random() * 1.8 + 0.4, p: Math.random() * 6 }));
    for (const s of _stars) { c.globalAlpha = 0.4 + 0.4 * Math.sin(M.time * 2 + s.p); circle(c, s.x * VW, s.y * VH, s.s, '#fff'); }
    c.globalAlpha = 1;
  }
  if (S.id === 'goma') {
    // glowing volcano silhouette
    const vy = PY(-330, 300);
    c.fillStyle = '#2b0d06'; c.beginPath(); c.moveTo(PX(FW * 0.2), vy + 200); c.lineTo(PX(FW * 0.45), vy - 40); c.lineTo(PX(FW * 0.55), vy - 40); c.lineTo(PX(FW * 0.8), vy + 200); c.fill();
    const lg = c.createRadialGradient(PX(FW / 2), vy - 40, 5, PX(FW / 2), vy - 40, 160 * CZ);
    lg.addColorStop(0, 'rgba(255,140,0,0.8)'); lg.addColorStop(1, 'rgba(255,60,0,0)');
    c.fillStyle = lg; c.fillRect(0, 0, VW, VH);
  }
  if (S.id === 'afronaut') {
    // rocket on the launchpad
    const rx = PX(FW * 0.18, 0), ry = PY(-420, 200);
    c.fillStyle = '#e8e8f0'; rrect(c, rx - 14 * CZ, ry - 90 * CZ, 28 * CZ, 90 * CZ, 12 * CZ); c.fill();
    c.fillStyle = '#198a00'; c.fillRect(rx - 14 * CZ, ry - 50 * CZ, 28 * CZ, 8 * CZ); c.fillStyle = '#ef7d00'; c.fillRect(rx - 14 * CZ, ry - 42 * CZ, 28 * CZ, 8 * CZ);
    c.fillStyle = '#de2010'; c.beginPath(); c.moveTo(rx - 14 * CZ, ry - 80 * CZ); c.lineTo(rx, ry - 115 * CZ); c.lineTo(rx + 14 * CZ, ry - 80 * CZ); c.fill();
    // planet
    const px = PX(FW * 0.78, 0), py = PY(-500, 200);
    circle(c, px, py, 120 * CZ, '#6b4cc9'); c.save(); c.beginPath(); c.arc(px, py, 120 * CZ, 0, TAU); c.clip();
    circle(c, px + 40 * CZ, py - 30 * CZ, 120 * CZ, '#8a6ff0'); c.restore();
    c.strokeStyle = 'rgba(200,180,255,0.6)'; c.lineWidth = 6 * CZ; c.beginPath(); c.ellipse(px, py, 190 * CZ, 34 * CZ, -0.25, 0, TAU); c.stroke();
  }
  if (S.id === 'mara' || S.id === 'sahara') {
    // the big African sun + skyline
    const sx = VW * 0.75, sy = PY(-330, 250);
    const sg = c.createRadialGradient(sx, sy, 10, sx, sy, 140 * CZ);
    sg.addColorStop(0, 'rgba(255,240,180,1)'); sg.addColorStop(0.35, 'rgba(255,170,60,0.9)'); sg.addColorStop(1, 'rgba(255,140,40,0)');
    c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, 140 * CZ, 0, TAU); c.fill();
    const base = PY(-260, 230);
    if (S.id === 'mara') {
      for (let i = 0; i < 5; i++) { // acacia silhouettes
        const ax = ((i * 331) % VW) + 40, ay = base - 6;
        c.fillStyle = '#3b2a14'; c.fillRect(ax - 2, ay - 50 * CZ, 4, 50 * CZ);
        c.beginPath(); c.ellipse(ax, ay - 52 * CZ, 48 * CZ, 11 * CZ, 0, 0, TAU); c.fill();
      }
    } else {
      c.fillStyle = '#d9a35a';
      c.beginPath(); c.moveTo(0, base); for (let i = 0; i <= 8; i++) c.quadraticCurveTo((i - 0.5) / 8 * VW, base - (i % 2 ? 70 : 20) * CZ, i / 8 * VW, base - 10 * CZ); c.lineTo(VW, base + 40); c.lineTo(0, base + 40); c.fill();
      for (let i = 0; i < 3; i++) { const px = VW * (0.2 + i * 0.12), py = base - 8 * CZ, ph = (60 - i * 12) * CZ; c.fillStyle = '#c48a43'; c.beginPath(); c.moveTo(px - ph, py); c.lineTo(px, py - ph); c.lineTo(px + ph, py); c.fill(); }
    }
  }
  if (S.id === 'kili') {
    // fluffy clouds / mountains
    c.fillStyle = '#f4fbff';
    for (let i = 0; i < 5; i++) {
      const x = ((i * 397 + M.time * 8) % (VW + 300)) - 150, y = 30 + (i % 3) * 30;
      circle(c, x, y, 26, c.fillStyle); circle(c, x + 26, y + 6, 22, c.fillStyle); circle(c, x - 24, y + 8, 18, c.fillStyle);
    }
    {
      c.fillStyle = '#9fc9e6'; c.beginPath(); c.moveTo(0, PY(-260, 230));
      for (let i = 0; i <= 10; i++) c.lineTo(i / 10 * VW, PY(-260, 230) - (i % 2 ? 90 : 20) * CZ);
      c.lineTo(VW, PY(-260, 230)); c.fill();
    }
  }

  drawStands(c);
  drawPitch(c);
  drawWallsBack(c);
  drawGoalBack(c, 0); drawGoalBack(c, 1);

  // ground decals & hazards
  for (const d of M.decals) {
    const a = Math.min(1, d.life / 2) * 0.55;
    ellipse(c, PX(d.x), PY(d.y), d.r * CZ, d.r * CZ * TILT, `rgba(20,15,10,${a})`);
  }
  for (const h of M.hazards) {
    if (h.type === 'banana') drawEmoji(c, '🍌', PX(h.x), PY(h.y, 6), 34 * CZ, false, h.rot);
    if (h.type === 'strike') {
      const prog = 1 - h.T / h.T0, pulse = 0.5 + 0.5 * Math.sin(M.time * 20);
      ellipse(c, PX(h.x), PY(h.y), h.r * CZ, h.r * CZ * TILT, `rgba(255,${h.kind === 'meteor' ? 80 : 230},40,${0.12 + 0.12 * pulse})`, `rgba(255,${h.kind === 'meteor' ? 60 : 255},60,0.9)`, 3 * CZ);
      ellipse(c, PX(h.x), PY(h.y), h.r * CZ * prog, h.r * CZ * TILT * prog, 'rgba(255,40,40,0.25)');
      text(c, '!', PX(h.x), PY(h.y), 34 * CZ, '#ffeb3b', 'center', '#b00', 4);
    }
  }

  // shadows + ground rings
  const b = M.ball;
  for (const p of M.all) {
    if (p.hidden) continue;
    const a = 0.3 * clamp(1 - p.z / 300, 0.2, 1);
    ellipse(c, PX(p.x), PY(p.y), p.r * CZ * 1.05, p.r * CZ * 0.45, `rgba(0,0,0,${a})`);
    if (p.human && p.humanH) {
      const col = p.humanH.color;
      c.strokeStyle = col; c.lineWidth = 3 * CZ;
      c.beginPath(); c.ellipse(PX(p.x), PY(p.y), p.r * CZ * 1.35, p.r * CZ * 0.6, 0, 0, TAU); c.stroke();
    }
    if (p.charging) drawChargeRing(c, p);
  }
  for (const bx of M.boxes) ellipse(c, PX(bx.x), PY(bx.y), 20 * CZ * clamp(1 - bx.z / 900, 0.3, 1), 8 * CZ, 'rgba(0,0,0,0.3)');
  {
    const sz = BALL_R * (b.super ? (SUPER_SIZE[b.super.type] || 1) : 1);
    const k = clamp(1 - b.z / 400, 0.25, 1);
    ellipse(c, PX(b.x), PY(b.y), sz * CZ * k * 1.1, sz * CZ * k * 0.5, 'rgba(0,0,0,0.35)');
    if (b.super && b.super.type === 'split') for (const d of b.super.decoys) ellipse(c, PX(d.x), PY(d.y), sz * CZ, sz * CZ * 0.5, 'rgba(0,0,0,0.3)');
  }
  for (const q of M.projectiles) ellipse(c, PX(q.x), PY(q.y), 14 * CZ, 6 * CZ, 'rgba(0,0,0,0.25)');

  // ball trail (under sprites)
  drawBallTrail(c);

  // y-sorted drawables
  const D = [];
  for (const p of M.all) if (!p.hidden) D.push({ y: p.y, f: () => drawPlayerEnt(c, p) });
  D.push({ y: b.y + 0.1, f: () => drawBallEnt(c) });
  for (const bx of M.boxes) D.push({ y: bx.y, f: () => drawBox(c, bx) });
  for (const q of M.projectiles) D.push({ y: q.y, f: () => drawProjectile(c, q) });
  for (const h of M.hazards) {
    if (h.type === 'animal') D.push({ y: h.y, f: () => drawEmoji(c, h.emoji, PX(h.x), PY(h.y, h.r * 1.0 + Math.abs(Math.sin(M.time * (h.phase === 'graze' ? 2 : 8))) * 4), h.r * 2.5 * CZ, !h.flip) });
    if (h.type === 'penguin') D.push({ y: h.y, f: () => drawEmoji(c, '🐧', PX(h.x), PY(h.y, 18), 46 * CZ, false, h.vy > 0 ? Math.PI * 0.5 : -Math.PI * 0.5) });
  }
  D.push({ y: GY1, f: () => { drawGoalFront(c, 0); drawGoalFront(c, 1); } });
  D.sort((a, q) => a.y - q.y);
  for (const d of D) d.f();

  drawWallFront(c);
  drawParticles(c);

  // UFOs above everything
  for (const h of M.hazards) if (h.type === 'ufo') drawUfo(c, h);
  // falling meteors / storm clouds
  for (const h of M.hazards) if (h.type === 'strike') {
    const prog = 1 - h.T / h.T0;
    if (h.kind === 'meteor') { const z = (1 - prog) * 900; drawEmoji(c, '☄️', PX(h.x + (1 - prog) * 200, z), PY(h.y, z), (40 + prog * 50) * CZ, true, -0.6); }
    else drawEmoji(c, '🌩️', PX(h.x, 380), PY(h.y, 380), 90 * CZ);
  }

  // overhead labels (bubbles, player tags) on top of everything
  for (const p of M.all) if (!p.hidden) drawPlayerOverlay(c, p);

  if (M.blackout > 0) {
    const a = Math.min(1, M.blackout * 2, (4.5 - M.blackout) * 4) * 0.86;
    c.save(); c.globalAlpha = a; c.fillStyle = '#02030a'; c.fillRect(0, 0, VW, VH); c.restore();
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const p of M.all) if (!p.hidden) { const x = PX(p.x), y = PY(p.y) - 28 * CZ; ellipse(c, x, y + 10 * CZ, 10 * CZ, 4 * CZ, 'rgba(255,255,255,0.5)'); circle(c, x - 5 * CZ, y - 20 * CZ, 2.5 * CZ, '#fff'); circle(c, x + 5 * CZ, y - 20 * CZ, 2.5 * CZ, '#fff'); }
    circle(c, PX(M.ball.x, M.ball.z), PY(M.ball.y, M.ball.z) - BALL_R * CZ, BALL_R * CZ * 1.4, 'rgba(255,255,160,0.8)');
    c.restore();
    text(c, '💡 NEPA TOOK LIGHT! 💡', VW / 2, VH * 0.22, 28 * Math.min(VW / 1280, VH / 720), '#ffe066', 'center', '#000', 5);
  }
  if (M.flash > 0) { c.globalAlpha = Math.min(0.85, M.flash); c.fillStyle = M.flashCol; c.fillRect(0, 0, VW, VH); c.globalAlpha = 1; }
  if (M.phase === 'cine') {
    // vignette + speed lines
    const vg = c.createRadialGradient(VW / 2, VH / 2, VH * 0.2, VW / 2, VH / 2, VH * 0.9);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.65)');
    c.fillStyle = vg; c.fillRect(0, 0, VW, VH);
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
    for (let i = 0; i < 26; i++) { const a = rand(0, TAU), r0 = rand(0.35, 0.5) * VH, r1 = r0 + rand(60, 220); c.beginPath(); c.moveTo(VW / 2 + Math.cos(a) * r0, VH / 2 + Math.sin(a) * r0); c.lineTo(VW / 2 + Math.cos(a) * r1, VH / 2 + Math.sin(a) * r1); c.stroke(); }
  }
  drawHUD(c);
}

// ---------------------------------------------------------------------------
function drawStands(c) {
  const S = M.stadium;
  // stand structure (top)
  const xa = -GOAL_D - 300, xb = FW + GOAL_D + 300;
  quad(c, [P3(xa, -20, WALL_H), P3(xb, -20, WALL_H), P3(xb, -300, 290), P3(xa, -300, 290)], shade(S.wallDark, -0.35));
  for (let r = 0; r < 8; r++) {
    const y = -40 - r * 30, z = WALL_H + r * 26;
    quad(c, [P3(xa, y, z), P3(xb, y, z), P3(xb, y, z + 4), P3(xa, y, z + 4)], 'rgba(255,255,255,0.06)');
  }
  // side stands
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? -GOAL_D - 40 : FW + GOAL_D + 40, x1 = sd < 0 ? -GOAL_D - 240 : FW + GOAL_D + 240;
    quad(c, [P3(x0, -20, WALL_H), P3(x0, FH + 60, WALL_H), P3(x1, FH + 60, 150), P3(x1, -20, 150)], shade(S.wallDark, -0.4));
  }
  // crowd
  const ex = M.crowdExcite, t = M.time;
  for (const f of M.crowd) {
    const jump = Math.max(0, Math.sin(t * 9 + f.ph)) * 7 * ex;
    const x = PX(f.x, f.z + jump), y = PY(f.y, f.z + jump);
    if (x < -20 || x > VW + 20 || y < -20 || y > VH + 20) continue;
    const s = CZ * f.s;
    c.fillStyle = f.col; c.fillRect(x - 6 * s, y - 12 * s, 12 * s, 12 * s);
    c.fillStyle = f.skin; c.beginPath(); c.arc(x, y - 17 * s, 5 * s, 0, TAU); c.fill();
    if (ex > 0.6) { c.fillRect(x - 8 * s, y - 26 * s, 2.5 * s, 12 * s); c.fillRect(x + 5.5 * s, y - 26 * s, 2.5 * s, 12 * s); }
    if (f.sign) { c.fillStyle = '#fff'; c.fillRect(x - 11 * s, y - 38 * s, 22 * s, 13 * s); c.fillStyle = f.col; c.fillRect(x - 9 * s, y - 35 * s, 18 * s, 3 * s); }
  }
}

function drawPitch(c) {
  const S = M.stadium;
  const y0 = PY(0), y1 = PY(FH);
  const n = 14, w = FW / n;
  for (let i = 0; i < n; i++) { c.fillStyle = i % 2 ? S.grassA : S.grassB; c.fillRect(PX(i * w), y0, PX((i + 1) * w) - PX(i * w) + 0.5, y1 - y0); }
  // run-off area beyond goal lines
  c.fillStyle = shade(S.grassA, -0.15);
  c.fillRect(PX(-GOAL_D - 40), y0, PX(0) - PX(-GOAL_D - 40), y1 - y0);
  c.fillRect(PX(FW), y0, PX(FW + GOAL_D + 40) - PX(FW), y1 - y0);
  if (S.id === 'kili') { // ice sheen
    c.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(PX(i * 320 + 40), y0); c.lineTo(PX(i * 320 + 120), y0); c.lineTo(PX(i * 320 - 60), y1); c.lineTo(PX(i * 320 - 140), y1); c.fill(); }
  }
  if (S.id === 'afronaut') { // grid glow
    c.strokeStyle = 'rgba(120,255,230,0.08)'; c.lineWidth = 1;
    for (let x = 0; x <= FW; x += 100) { c.beginPath(); c.moveTo(PX(x), y0); c.lineTo(PX(x), y1); c.stroke(); }
    for (let y = 0; y <= FH; y += 100) { c.beginPath(); c.moveTo(PX(0), PY(y)); c.lineTo(PX(FW), PY(y)); c.stroke(); }
  }
  c.strokeStyle = S.line; c.lineWidth = Math.max(1.5, 3 * CZ);
  c.strokeRect(PX(0), y0, PX(FW) - PX(0), y1 - y0);
  c.beginPath(); c.moveTo(PX(FW / 2), y0); c.lineTo(PX(FW / 2), y1); c.stroke();
  c.beginPath(); c.ellipse(PX(FW / 2), PY(FH / 2), 130 * CZ, 130 * CZ * TILT, 0, 0, TAU); c.stroke();
  circle(c, PX(FW / 2), PY(FH / 2), 4 * CZ, S.line);
  for (const sd of [0, 1]) {
    const gx = sd ? FW : 0, dir = sd ? -1 : 1;
    const box = (d, hw) => { c.beginPath(); c.moveTo(PX(gx), PY(FH / 2 - hw)); c.lineTo(PX(gx + dir * d), PY(FH / 2 - hw)); c.lineTo(PX(gx + dir * d), PY(FH / 2 + hw)); c.lineTo(PX(gx), PY(FH / 2 + hw)); c.stroke(); };
    box(250, 300); box(90, 175);
    c.beginPath(); c.ellipse(PX(gx + dir * 250), PY(FH / 2), 80 * CZ, 80 * CZ * TILT, 0, sd ? Math.PI / 2 : -Math.PI / 2, sd ? Math.PI * 1.5 : Math.PI / 2); c.stroke();
    circle(c, PX(gx + dir * 180), PY(FH / 2), 3.5 * CZ, S.line);
  }
  c.save(); c.globalAlpha = 0.14; text(c, GAME_NAME, PX(FW / 2), PY(FH / 2), 46 * CZ, '#fff', 'center', null); c.restore();
}

function drawWallsBack(c) {
  const S = M.stadium;
  const xa = -GOAL_D - 40, xb = FW + GOAL_D + 40;
  quad(c, [P3(xa, 0, 0), P3(xb, 0, 0), P3(xb, 0, WALL_H), P3(xa, 0, WALL_H)], S.wallDark);
  quad(c, [P3(xa, 0, WALL_H - 6), P3(xb, 0, WALL_H - 6), P3(xb, 0, WALL_H), P3(xa, 0, WALL_H)], S.wall);
  // sponsor boards
  const n = 6, sw = FW / n;
  for (let i = 0; i < n; i++) {
    const cx = sw * (i + 0.5);
    const [x, y] = P3(cx, 0, WALL_H * 0.42);
    if (x < -200 || x > VW + 200) continue;
    text(c, SPONSORS[(i + Math.floor(M.time / 6)) % SPONSORS.length], x, y, 19 * CZ, i % 2 ? '#ffffff' : S.wall, 'center', 'rgba(0,0,0,0.5)', 3);
  }
  // side walls next to goals
  for (const gx of [0, FW]) {
    const bx = gx === 0 ? -GOAL_D - 40 : FW + GOAL_D + 40;
    for (const [ya, yb] of [[0, GY0], [GY1, FH]]) {
      quad(c, [P3(gx, ya, 0), P3(gx, yb, 0), P3(gx, yb, WALL_H), P3(gx, ya, WALL_H)], shade(S.wallDark, 0.1), S.wall, 2 * CZ);
    }
    // goal surround walls behind the net
    quad(c, [P3(bx, GY0 - 30, 0), P3(bx, GY1 + 30, 0), P3(bx, GY1 + 30, WALL_H + 30), P3(bx, GY0 - 30, WALL_H + 30)], shade(S.wallDark, -0.2));
  }
  if (S.wallFx === 'zap') {
    c.strokeStyle = S.wall; c.globalAlpha = 0.5 + 0.3 * Math.sin(M.time * 30); c.lineWidth = 2;
    c.beginPath(); const [ax, ay] = P3(xa, 0, WALL_H + 3); c.moveTo(ax, ay);
    for (let x = xa; x <= xb; x += 40) { const [px, py] = P3(x, 0, WALL_H + 3 + rand(-3, 3)); c.lineTo(px, py); }
    c.stroke(); c.globalAlpha = 1;
  }
}
function drawWallFront(c) {
  const S = M.stadium;
  const xa = -GOAL_D - 40, xb = FW + GOAL_D + 40;
  c.globalAlpha = 0.82;
  quad(c, [P3(xa, FH, 0), P3(xb, FH, 0), P3(xb, FH, WALL_H * 0.5), P3(xa, FH, WALL_H * 0.5)], S.wallDark);
  quad(c, [P3(xa, FH, WALL_H * 0.5 - 4), P3(xb, FH, WALL_H * 0.5 - 4), P3(xb, FH, WALL_H * 0.5), P3(xa, FH, WALL_H * 0.5)], S.wall);
  c.globalAlpha = 1;
  if (S.wallFx === 'hay') for (let x = -40; x < FW + 40; x += 120) { // thorn bushes
    const [px, py] = P3(x + 60, FH + 10, 0);
    for (let k = 0; k < 4; k++) circle(c, px + (k - 1.5) * 22 * CZ, py - (14 + (k % 2) * 8) * CZ, 20 * CZ, k % 2 ? '#5f6b2a' : '#4a5520');
    c.strokeStyle = '#2b2f12'; c.lineWidth = 1.5; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(px + (k - 3) * 14 * CZ, py - 20 * CZ); c.lineTo(px + (k - 3) * 14 * CZ + 6, py - 34 * CZ); c.stroke(); }
  }
  if (S.wallFx === 'sand') for (let x = -40; x < FW + 60; x += 110) { const [px, py] = P3(x, FH + 8, 0); ellipse(c, px, py - 8 * CZ, 66 * CZ, 22 * CZ, '#e9c98b'); ellipse(c, px - 10 * CZ, py - 14 * CZ, 40 * CZ, 10 * CZ, '#f5deb3'); }
  if (S.wallFx === 'snow') for (let x = -40; x < FW + 60; x += 90) { const [px, py] = P3(x, FH + 8, 0); ellipse(c, px, py - 6 * CZ, 52 * CZ, 16 * CZ, '#ffffff'); }
}

function drawGoalBack(c, side) {
  const gx = side === 0 ? 0 : FW, bx = side === 0 ? -GOAL_D : FW + GOAL_D;
  const bul = M.ball.netBulge > 0 && ((side === 0) === (M.ball.x < FW / 2)) ? M.ball.netBulge * 18 * (side === 0 ? -1 : 1) : 0;
  quad(c, [P3(gx, GY0, 0), P3(bx, GY0, 0), P3(bx, GY1, 0), P3(gx, GY1, 0)], 'rgba(0,0,0,0.28)');
  const A = P3(gx, GY0, 0), B = P3(bx, GY0, 0), Cc = P3(bx, GY0, BAR_Z), Dd = P3(gx, GY0, BAR_Z);
  quad(c, [A, B, Cc, Dd], 'rgba(255,255,255,0.08)'); netQuad(c, A, B, Cc, Dd, 5, 6, 'rgba(255,255,255,0.45)');
  const bA = P3(bx + bul, GY0, 0), bB = P3(bx + bul, GY1, 0), bC = P3(bx + bul, GY1, BAR_Z), bD = P3(bx + bul, GY0, BAR_Z);
  quad(c, [bA, bB, bC, bD], 'rgba(255,255,255,0.1)'); netQuad(c, bA, bB, bC, bD, 12, 6, 'rgba(255,255,255,0.5)');
  const rA = P3(gx, GY0, BAR_Z), rB = P3(bx, GY0, BAR_Z), rC = P3(bx, GY1, BAR_Z), rD = P3(gx, GY1, BAR_Z);
  quad(c, [rA, rB, rC, rD], 'rgba(255,255,255,0.08)'); netQuad(c, rA, rD, rC, rB, 12, 5, 'rgba(255,255,255,0.35)');
  // far post + crossbar + back bars
  c.lineCap = 'round';
  c.strokeStyle = '#d9d9d9'; c.lineWidth = 3 * CZ;
  c.beginPath(); c.moveTo(...P3(bx, GY0, 0)); c.lineTo(...P3(bx, GY0, BAR_Z)); c.lineTo(...P3(bx, GY1, BAR_Z)); c.lineTo(...P3(bx, GY1, 0)); c.stroke();
  c.strokeStyle = '#ffffff'; c.lineWidth = 6 * CZ;
  c.beginPath(); c.moveTo(...P3(gx, GY0, 0)); c.lineTo(...P3(gx, GY0, BAR_Z)); c.lineTo(...P3(gx, GY1, BAR_Z)); c.stroke();
  M.ball.netBulge = Math.max(0, (M.ball.netBulge || 0) - 0.02);
}
function drawGoalFront(c, side) {
  const gx = side === 0 ? 0 : FW, bx = side === 0 ? -GOAL_D : FW + GOAL_D;
  const A = P3(gx, GY1, 0), B = P3(bx, GY1, 0), Cc = P3(bx, GY1, BAR_Z), Dd = P3(gx, GY1, BAR_Z);
  quad(c, [A, B, Cc, Dd], 'rgba(255,255,255,0.08)'); netQuad(c, A, B, Cc, Dd, 5, 6, 'rgba(255,255,255,0.5)');
  c.lineCap = 'round'; c.strokeStyle = '#ffffff'; c.lineWidth = 6 * CZ;
  c.beginPath(); c.moveTo(...P3(gx, GY1, 0)); c.lineTo(...P3(gx, GY1, BAR_Z)); c.lineTo(...P3(gx, GY1 - 40, BAR_Z)); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 2 * CZ;
  c.beginPath(); c.moveTo(PX(gx) + 2, PY(GY1, 0)); c.lineTo(PX(gx, BAR_Z) + 2, PY(GY1, BAR_Z)); c.stroke();
}

// ---------------------------------------------------------------------------
function playerScale(p) {
  return CZ * p.scale * (p.role === 'captain' ? p.team.cap.size * 0.95 : p.role === 'keeper' ? 1.1 : 0.95);
}
function drawPlayerEnt(c, p) {
  const x = PX(p.x, p.z), y = PY(p.y, p.z);
  const s = playerScale(p);
  const tackling = p.state === 'tackle';
  const o = {
    look: p.look, role: p.role, kit: p.kit, kit2: p.kit2, skin: p.skin, hat: p.hat, number: p.number,
    face: p.face, anim: p.anim, moving: p.state === 'normal' || p.state === 'recover' || p.state === 'panic' ? p.moving : 0, expr: p.expr,
    tint: p.fx.zap > 0 ? 'zap' : p.state === 'frozen' ? 'ice' : p.fx.soot > 0 ? 'soot' : null,
    lying: p.state === 'down' || tackling || p.state === 'dive',
    lyingDir: tackling ? sign(Math.cos(p.face)) * 0.55 : p.state === 'dive' ? p.lyingDir * 0.9 : p.lyingDir,
    spin: p.state === 'spin' || p.state === 'juke', flat: p.fx.flat > 0 ? Math.min(1, p.fx.flat) : 0,
    dance: p.state === 'dance', armsUp: p.armsUp || p.state === 'panic' || p.state === 'abducted',
  };
  if (p.state === 'dive') o.expr = 'grit';
  if (p.fx.mega > 0) { c.save(); c.globalAlpha = 0.3; circle(c, x, y - 36 * s, 44 * s, `hsl(${(M.time * 400) % 360},100%,60%)`); c.restore(); }
  drawCharacter(c, o, x, y, s);
  if (p.fx.snow > 0 && p.state !== 'down') { const sc = M.stadium.wallFx === 'sand' ? '#e2bf7c' : '#ffffff'; ellipse(c, x, y - 64 * s, 16 * s, 9 * s, sc, '#cba', 1); circle(c, x - 2 * s, y - 72 * s, 7 * s, sc); }
  if (p.state === 'down' && p.z <= 5) {
    for (let i = 0; i < 3; i++) {
      const a = M.time * 6 + i * TAU / 3;
      drawEmoji(c, '⭐', x + Math.cos(a) * 16 * s + p.lyingDir * 30 * s, y - 22 * s + Math.sin(a) * 6 * s, 13 * s);
    }
  }
  if (p.state === 'frozen') { /* ice drawn by character tint */ }
}
function drawPlayerOverlay(c, p) {
  const x = PX(p.x, p.z), y = PY(p.y, p.z);
  const s = playerScale(p);
  const top = y - 86 * s - (p.state === 'down' ? -30 * s : 0);
  if (p.human && p.humanH && M.phase !== 'fulltime') {
    const col = p.humanH.color, bob = Math.sin(M.time * 6) * 3;
    const ty = top - 6 + bob;
    c.fillStyle = col; c.beginPath(); c.moveTo(x - 9, ty - 12); c.lineTo(x + 9, ty - 12); c.lineTo(x, ty); c.closePath(); c.fill();
    c.strokeStyle = '#000'; c.lineWidth = 2; c.stroke();
    text(c, p.humanH.label, x, ty - 23, 17, col, 'center', '#000', 4);
    if (p.humanH.switchFx > 0) { c.globalAlpha = p.humanH.switchFx * 2; c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(x, y - 30 * s, 40 * s * (1.5 - p.humanH.switchFx), 0, TAU); c.stroke(); c.globalAlpha = 1; }
  }
  if (p.bubble) {
    const b = p.bubble, a = Math.min(1, b.t * 4), sc = Math.min(1, (b.max - b.t) * 8);
    c.save(); c.globalAlpha = a;
    c.font = `${Math.round(15 * sc + 1)}px ${FONT}`;
    const w = c.measureText(b.text).width + 16, h = 24 * sc;
    const bx = x + 18 * s, by = top - 30 - (p.human ? 18 : 0);
    c.fillStyle = '#fff'; rrect(c, bx - 6, by - h / 2, w, h, 8); c.fill(); c.strokeStyle = '#111'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.moveTo(bx + 4, by + h / 2 - 1); c.lineTo(bx - 6, by + h / 2 + 9); c.lineTo(bx + 14, by + h / 2 - 1); c.fillStyle = '#fff'; c.fill();
    c.fillStyle = '#111'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(b.text, bx + 2, by + 1);
    c.restore();
  }
}

function drawChargeRing(c, p) {
  const x = PX(p.x), y = PY(p.y), rx = p.r * CZ * 1.9, ry = rx * 0.45;
  c.lineWidth = 5 * CZ;
  c.strokeStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.stroke();
  c.strokeStyle = p.charge >= 1 ? '#ff3b3b' : mix('#ffe066', '#ff7b00', p.charge);
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + TAU * p.charge); c.stroke();
  if (p.sweetT >= 0) {
    const k = sweetRing(p.sweetT), ok = Math.abs(k - 1) < 0.22;
    c.lineWidth = 6 * CZ; c.strokeStyle = 'rgba(80,255,120,0.9)';
    c.beginPath(); c.ellipse(x, y, rx * 1.5, ry * 1.5, 0, 0, TAU); c.stroke();
    c.lineWidth = 3 * CZ; c.strokeStyle = ok ? '#ffffff' : '#ffd43b';
    c.beginPath(); c.ellipse(x, y, rx * 1.5 * k, ry * 1.5 * k, 0, 0, TAU); c.stroke();
    if (p.human) text(c, ok ? 'NOW!' : 'SUPER!', x, y + 34 * CZ, 22 * CZ, ok ? '#7CFC00' : '#ffd43b', 'center', '#000', 4);
  }
}

function drawBallTrail(c) {
  const b = M.ball, tr = b.trail;
  if (tr.length < 2) return;
  const st = b.super ? SUPER_STYLE[b.super.type] : 'normal';
  const col = { bus: '150,150,150', electric: '255,243,92', jollof: '228,87,46', fire: '255,90,0', quantum: '102,255,153', steam: '230,242,255', disco: `${(M.time * 300) % 255 | 0},200,255`, cannon: '80,80,80', normal: '255,255,255' }[st];
  const base = BALL_R * CZ * (b.super ? (SUPER_SIZE[b.super.type] || 1) : 1);
  c.lineCap = 'round';
  for (let i = 1; i < tr.length; i++) {
    const a = i / tr.length;
    c.strokeStyle = `rgba(${col},${a * 0.55})`;
    c.lineWidth = base * 1.6 * a;
    c.beginPath(); c.moveTo(PX(tr[i - 1].x, tr[i - 1].z), PY(tr[i - 1].y, tr[i - 1].z)); c.lineTo(PX(tr[i].x, tr[i].z), PY(tr[i].y, tr[i].z)); c.stroke();
  }
  if (st === 'disco') {
    for (let i = 1; i < tr.length; i++) { c.strokeStyle = `hsla(${(i * 30 + M.time * 400) % 360},100%,60%,${i / tr.length * 0.6})`; c.lineWidth = base * 0.8; c.beginPath(); c.moveTo(PX(tr[i - 1].x, tr[i - 1].z), PY(tr[i - 1].y, tr[i - 1].z) - base); c.lineTo(PX(tr[i].x, tr[i].z), PY(tr[i].y, tr[i].z) - base); c.stroke(); }
  }
}
function drawBallEnt(c) {
  const b = M.ball;
  const s = b.super;
  if (s && s.type === 'teleport' && s.blink > 0) return;
  const sz = BALL_R * CZ * (s ? (SUPER_SIZE[s.type] || 1) : 1);
  const sp = Math.hypot(b.vx, b.vy);
  const st = s ? SUPER_STYLE[s.type] : (sp > 1150 && !b.owner ? 'fire' : 'normal');
  if (s && s.type === 'split') for (const d of s.decoys) drawBall(c, PX(d.x, d.z), PY(d.y, d.z), sz, b.rot, 'jollof', M.time);
  drawBall(c, PX(b.x, b.z), PY(b.y, b.z) - sz, sz, b.rot, st, M.time);
  if (s && s.type === 'curve') drawEmoji(c, '🫖', PX(b.x, b.z) + sz * 1.2, PY(b.y, b.z) - sz * 2.4, sz * 1.6);
}
function drawBox(c, bx) {
  const x = PX(bx.x, bx.z + 22), y = PY(bx.y, bx.z + 22 + Math.sin(M.time * 4 + bx.x) * 4), s = CZ;
  c.save(); c.translate(x, y); c.rotate(Math.sin(M.time * 2 + bx.y) * 0.15);
  const g = c.createLinearGradient(0, -18 * s, 0, 18 * s); g.addColorStop(0, '#ffe066'); g.addColorStop(1, '#ff9f1c');
  c.fillStyle = g; rrect(c, -18 * s, -18 * s, 36 * s, 36 * s, 7 * s); c.fill();
  c.strokeStyle = '#8a4b00'; c.lineWidth = 3 * s; c.stroke();
  text(c, '?', 0, 2 * s, 28 * s, '#fff', 'center', '#8a4b00', 4 * s);
  c.restore();
}
function drawProjectile(c, q) {
  if (q.type === 'chicken') drawEmoji(c, '🐔', PX(q.x, q.z), PY(q.y, q.z), 42 * CZ, q.vx > 0, Math.sin(q.t * 20) * 0.3);
  else if (q.type === 'bomb') {
    const blink = q.fuse >= 0 && Math.floor(q.fuse * (q.fuse < 0.5 ? 16 : 8)) % 2 === 0;
    const sz = (34 + (q.fuse >= 0 ? (1.1 - q.fuse) * 14 : 0)) * CZ;
    drawEmoji(c, '💣', PX(q.x, q.z + 14), PY(q.y, q.z + 14), sz);
    if (blink) circle(c, PX(q.x, q.z + 14), PY(q.y, q.z + 14), sz * 0.45, 'rgba(255,0,0,0.45)');
  } else if (q.type === 'bees') {
    for (let i = 0; i < 6; i++) {
      const a = q.t * 9 + i * 1.05, r = 18 + Math.sin(q.t * 5 + i) * 8;
      drawEmoji(c, '🐝', PX(q.x + Math.cos(a) * r, q.z + Math.sin(a * 1.3) * 10), PY(q.y + Math.sin(a) * r * 0.6, q.z + Math.sin(a * 1.3) * 10), 20 * CZ, Math.cos(a) < 0);
    }
  }
}
function drawUfo(c, h) {
  const x = PX(h.x, h.z), y = PY(h.y, h.z);
  if (h.phase === 'beam' || h.phase === 'return') {
    const gx = PX(h.x), gy = PY(h.y);
    const g = c.createLinearGradient(0, y, 0, gy);
    g.addColorStop(0, 'rgba(140,255,170,0.65)'); g.addColorStop(1, 'rgba(140,255,170,0.12)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x - 16 * CZ, y); c.lineTo(x + 16 * CZ, y); c.lineTo(gx + 50 * CZ, gy); c.lineTo(gx - 50 * CZ, gy); c.fill();
  }
  drawEmoji(c, '🛸', x, y + Math.sin(M.time * 5) * 4, 120 * CZ);
}

function drawParticles(c) {
  for (const q of M.parts) {
    const a = clamp(q.life / q.max, 0, 1);
    const x = PX(q.x, q.z), y = PY(q.y, q.z);
    switch (q.kind) {
      case 'text': {
        const age = q.max - q.life, sc = age < 0.15 ? easeOutBack(age / 0.15) : 1;
        c.globalAlpha = Math.min(1, a * 2.5);
        text(c, q.text, x, y, q.size * sc * Math.max(0.8, CZ), q.color, 'center', '#000', Math.max(3, q.size * 0.18));
        c.globalAlpha = 1; break;
      }
      case 'smoke': c.globalAlpha = a * 0.45; circle(c, x, y, q.size * CZ * (1.8 - a), q.color); c.globalAlpha = 1; break;
      case 'flame': c.globalAlpha = a; circle(c, x, y, q.size * CZ * (0.4 + a * 0.6), q.color); c.globalAlpha = 1; break;
      case 'confetti': c.save(); c.translate(x, y); c.rotate(q.rot); c.scale(1, Math.cos(q.rot * 2)); c.globalAlpha = Math.min(1, a * 3); c.fillStyle = q.color; c.fillRect(-q.size * CZ / 2, -q.size * CZ / 4, q.size * CZ, q.size * CZ / 2); c.restore(); break;
      case 'star': {
        c.save(); c.translate(x, y); c.rotate(q.rot); c.globalAlpha = a; c.fillStyle = q.color; c.beginPath();
        const r = q.size * CZ;
        for (let i = 0; i < 10; i++) { const an = i / 10 * TAU, rr = i % 2 ? r * 0.45 : r; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
        c.fill(); c.restore(); break;
      }
      case 'feather': c.save(); c.translate(x, y); c.rotate(q.rot); c.globalAlpha = a; ellipse(c, 0, 0, q.size * CZ, q.size * CZ * 0.4, q.color); c.restore(); break;
      case 'snow': c.globalAlpha = a; circle(c, x, y, q.size * CZ * 0.6, q.color); c.globalAlpha = 1; break;
      case 'note': c.globalAlpha = a; text(c, '♪', x, y, q.size * CZ, q.color, 'center', '#000', 2, 'serif'); c.globalAlpha = 1; break;
      case 'ring': {
        const k = 1 - a;
        c.globalAlpha = a; c.strokeStyle = q.color; c.lineWidth = 6 * CZ;
        c.beginPath(); c.ellipse(PX(q.x), PY(q.y), q.size * CZ * k, q.size * CZ * k * TILT, 0, 0, TAU); c.stroke(); c.globalAlpha = 1; break;
      }
      case 'bolt': {
        c.globalAlpha = a; c.strokeStyle = '#ffffff'; c.lineWidth = 6 * CZ; c.shadowColor = '#7cf3ff'; c.shadowBlur = 20;
        c.beginPath(); let px = PX(q.x, 700), py = PY(q.y, 700); c.moveTo(px, py);
        for (let i = 1; i <= 8; i++) { const z = 700 - i * 87.5; px = PX(q.x + rand(-40, 40) * (i < 8 ? 1 : 0), z); py = PY(q.y, z); c.lineTo(px, py); }
        c.stroke(); c.shadowBlur = 0; c.globalAlpha = 1; break;
      }
      default: c.globalAlpha = a; circle(c, x, y, q.size * CZ * (0.5 + a * 0.5), q.color); c.globalAlpha = 1;
    }
  }
}

// ---------------------------------------------------------------------------
//  HUD
// ---------------------------------------------------------------------------
function drawHUD(c) {
  if (M.demo) return;
  const u = Math.min(VW / 1280, VH / 720) * (VW < 700 ? 1.25 : 1);
  const [A, B] = M.teams;
  // scoreboard
  const w = Math.min(VW - 20, 620 * u), h = 62 * u, x = VW / 2 - w / 2, y = 10 * u;
  c.fillStyle = 'rgba(8,10,28,0.88)'; rrect(c, x, y, w, h, 14 * u); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2; c.stroke();
  for (const [t, sd] of [[A, -1], [B, 1]]) {
    const cx = VW / 2 + sd * w * 0.36;
    c.fillStyle = t.kit; rrect(c, sd < 0 ? x + 6 * u : x + w - 6 * u - 58 * u, y + 6 * u, 58 * u, h - 12 * u, 10 * u); c.fill();
    c.save(); c.beginPath(); rrect(c, sd < 0 ? x + 6 * u : x + w - 6 * u - 58 * u, y + 6 * u, 58 * u, h - 12 * u, 10 * u); c.clip();
    drawCharacter(c, portraitDesc(t.cap, 'captain', t.kit, M.time, { face: sd < 0 ? 0.3 : Math.PI - 0.3, expr: M.goalTeam === t && M.phase === 'goal' ? 'happy' : (M.goalTeam && M.goalTeam !== t && M.phase === 'goal' ? 'hurt' : 'normal') }), (sd < 0 ? x + 35 * u : x + w - 35 * u), y + h + 34 * u, 1.05 * u);
    c.restore();
    text(c, t.cap.short.toUpperCase(), VW / 2 + sd * w * 0.25, y + h * 0.5, 20 * u, '#fff', 'center', '#000', 4 * u);
    const pop = t.itemFlash > 0 ? 1 + t.itemFlash * 0.3 : 1;
    text(c, String(t.score), VW / 2 + sd * 52 * u, y + h * 0.53, 40 * u * (M.phase === 'goal' && M.goalTeam === t ? 1 + Math.max(0, 0.6 - M.phaseT) : 1), '#fff', 'center', '#000', 5 * u);
    // item slots
    for (let i = 0; i < 2; i++) {
      const sx = sd < 0 ? x + 20 * u + i * 46 * u : x + w - 20 * u - 40 * u - i * 46 * u, sy = y + h + 6 * u;
      c.fillStyle = 'rgba(8,10,28,0.8)'; rrect(c, sx, sy, 40 * u, 40 * u, 9 * u); c.fill();
      c.strokeStyle = i === 0 && t.items[0] ? '#ffd43b' : 'rgba(255,255,255,0.4)'; c.lineWidth = 2; c.stroke();
      if (t.items[i]) drawEmoji(c, ITEMS[t.items[i]].icon, sx + 20 * u, sy + 20 * u, 30 * u * (i === 0 ? pop : 1));
    }
    void cx;
  }
  // clock
  let clock;
  if (M.golden) clock = 'GOLDEN';
  else { const tl = Math.max(0, Math.ceil(M.timeLeft)); clock = `${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`; }
  const urgent = !M.golden && M.timeLeft < 10 && M.phase === 'play';
  text(c, clock, VW / 2, y + h * 0.52, (M.golden ? 18 : 26) * u * (urgent ? 1 + 0.15 * Math.abs(Math.sin(M.time * 6)) : 1), M.golden ? '#ffd84a' : urgent ? '#ff6b6b' : '#ffffff', 'center', '#000', 4 * u);

  // commentary ticker
  if (M.comm.t > 0 && M.comm.text) {
    const cw = Math.min(VW - 24, 880 * u), chh = 40 * u, cx = VW / 2 - cw / 2, cy = VH - chh - 12 * u - (Touch.active ? VH * 0.0 : 0);
    c.globalAlpha = Math.min(1, M.comm.t * 2.5);
    c.fillStyle = 'rgba(8,10,28,0.85)'; rrect(c, cx, cy, cw, chh, 12 * u); c.fill();
    c.strokeStyle = '#ffd43b'; c.lineWidth = 2; c.stroke();
    drawEmoji(c, '🎙️', cx + 22 * u, cy + chh / 2, 26 * u);
    c.save(); c.beginPath(); c.rect(cx + 40 * u, cy, cw - 50 * u, chh); c.clip();
    const s = M.comm.text.slice(0, Math.floor(M.comm.shown));
    c.font = `${Math.round(18 * u)}px ${FONT}`;
    const tw = c.measureText(M.comm.text).width;
    const fitSize = tw > cw - 60 * u ? 18 * u * (cw - 60 * u) / tw : 18 * u;
    text(c, s, cx + 44 * u, cy + chh / 2 + 1, fitSize, '#fff', 'left', '#000', 3);
    c.restore(); c.globalAlpha = 1;
  }

  // super banner
  if (M.banner) {
    const bn = M.banner, t = bn.t, inK = easeOutCubic(Math.min(1, t / 0.25)), outK = t > bn.life - 0.25 ? (t - (bn.life - 0.25)) / 0.25 : 0;
    const off = (1 - inK) * -VW + outK * VW;
    const bh = 130 * u, by = VH * 0.5 - bh / 2;
    c.save(); c.translate(off, 0);
    c.fillStyle = bn.team.kit; c.beginPath(); c.moveTo(0, by + 20 * u); c.lineTo(VW, by - 10 * u); c.lineTo(VW, by + bh - 20 * u); c.lineTo(0, by + bh + 10 * u); c.fill();
    c.fillStyle = bn.team.kit2; c.fillRect(0, by + bh * 0.82, VW, 6 * u);
    for (let i = 0; i < 10; i++) { c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(((i * 160 + t * 1600) % (VW + 200)) - 100, by, 40 * u, bh); }
    drawCharacter(c, portraitDesc(bn.cap, 'captain', bn.team.kit, M.time * 3, { expr: 'grit', face: 0.2 }), VW * 0.18, by + bh + 30 * u, 2.4 * u);
    text(c, bn.cap.name.toUpperCase(), VW * 0.58, by + bh * 0.3, 24 * u, '#fff', 'center', '#000', 5 * u);
    text(c, bn.name + '!', VW * 0.58, by + bh * 0.62, Math.min(56 * u, VW * 0.055), '#ffe066', 'center', '#000', 7 * u);
    c.restore();
  }

  // big center text
  if (M.bigText) {
    const bt = M.bigText, t = bt.t;
    const sc = t < 0.35 ? easeOutBack(t / 0.35) : 1, fade = t > bt.life - 0.4 ? (bt.life - t) / 0.4 : 1;
    c.save(); c.globalAlpha = clamp(fade, 0, 1);
    c.translate(VW / 2, VH * 0.4); c.rotate(Math.sin(t * 5) * 0.05); c.scale(sc, sc);
    const size = Math.min(130 * u, VW / (bt.str.length * 0.62));
    const letters = bt.str.split('');
    c.font = `${Math.round(size)}px ${FONT}`;
    const totalW = c.measureText(bt.str).width;
    let lx = -totalW / 2;
    for (let i = 0; i < letters.length; i++) {
      const lw = c.measureText(letters[i]).width;
      const ly = Math.sin(t * 10 + i * 0.7) * 8 * u;
      const col = bt.team && !bt.str.includes('OWN') ? (i % 2 ? bt.team.kit2 : '#ffffff') : bt.color;
      text(c, letters[i], lx + lw / 2, ly, size, col, 'center', '#000', size * 0.14);
      lx += lw;
    }
    if (bt.sub) text(c, bt.sub, 0, size * 0.72, Math.min(30 * u, VW / (bt.sub.length * 0.55)), '#fff', 'center', '#000', 5 * u);
    c.restore();
  }
  if (M.phase === 'intro') {
    const t = M.phaseT;
    const str = t < 1.05 ? 'READY?' : 'KICK OFF!';
    const lt = t < 1.05 ? t : t - 1.05;
    const sc = easeOutBack(Math.min(1, lt / 0.3));
    text(c, str, VW / 2, VH * 0.42, 90 * u * sc, t < 1.05 ? '#ffe066' : '#7CFC00', 'center', '#000', 12 * u);
    if (M.golden) text(c, 'GOLDEN GOAL — NEXT GOAL WINS', VW / 2, VH * 0.42 + 70 * u, 26 * u, '#ffd84a', 'center', '#000', 5 * u);
  }
  if (!M.demo) text(c, 'ESC / P / START: PAUSE', 12 * u, VH - 10 * u, 12 * u, 'rgba(255,255,255,0.45)', 'left', null);
  if (Touch.active && !M.demo) drawTouchControls(c);
}

function drawTouchControls(c) {
  const L = Touch.layout(VW, VH);
  c.save(); c.globalAlpha = 0.5;
  circle(c, 34, 34, 24, 'rgba(0,0,0,0.5)', '#fff', 2);
  c.fillStyle = '#fff'; c.fillRect(26, 23, 5, 22); c.fillRect(37, 23, 5, 22);
  if (Touch.stick) {
    circle(c, Touch.stick.ox, Touch.stick.oy, L.stickR, 'rgba(255,255,255,0.15)', '#fff', 2);
    circle(c, Touch.stick.ox + Touch.stickVec.x * L.stickR, Touch.stick.oy + Touch.stickVec.y * L.stickR, L.stickR * 0.4, 'rgba(255,255,255,0.5)');
  } else text(c, 'DRAG HERE TO MOVE', VW * 0.18, VH * 0.82, 16, '#fff', 'center', '#000', 3);
  for (const n in L.btns) {
    const b = L.btns[n], down = Touch.buttons[n] !== undefined;
    circle(c, b.x, b.y, b.r * (down ? 0.92 : 1), b.color, '#fff', 3);
    text(c, b.label, b.x, b.y, b.r * 0.38, '#fff', 'center', '#000', 3);
  }
  c.restore();
}
