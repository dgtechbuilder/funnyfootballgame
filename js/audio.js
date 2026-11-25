// ============================================================================
//  Procedural audio: every sound is synthesized with WebAudio. No assets.
// ============================================================================

const SFX = {
  ctx: null, master: null, sfx: null, music: null, crowdGain: null, noiseBuf: null,
  muted: false, musicOn: true, crowdLevel: 0.05, crowdTarget: 0.05,
  _seqTimer: null, _step: 0, _nextTime: 0, musicMode: 'menu',

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.music = ctx.createGain(); this.music.gain.value = this.musicOn ? 0.22 : 0; this.music.connect(this.master);

    // white noise buffer
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // crowd ambience: looped filtered noise with slow wobble
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.27;
    const lfoG = ctx.createGain(); lfoG.gain.value = 250; lfo.connect(lfoG); lfoG.connect(bp.frequency); lfo.start();
    this.crowdGain = ctx.createGain(); this.crowdGain.gain.value = 0;
    src.connect(bp); bp.connect(this.crowdGain); this.crowdGain.connect(this.master); src.start();

    this._nextTime = ctx.currentTime + 0.1;
    this._seqTimer = setInterval(() => this._schedule(), 50);
  },

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.8; },
  toggleMusic() { this.musicOn = !this.musicOn; if (this.music) this.music.gain.value = this.musicOn ? 0.22 : 0; },
  setCrowd(level) { this.crowdTarget = level; },
  tickCrowd(dt) {
    if (!this.ctx) return;
    this.crowdLevel += (this.crowdTarget - this.crowdLevel) * Math.min(1, dt * 2.5);
    this.crowdGain.gain.value = this.crowdLevel;
    this.crowdTarget += (0.05 - this.crowdTarget) * Math.min(1, dt * 0.6);
  },

  _env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  },
  tone(freq, dur = 0.15, type = 'square', vol = 0.2, slideTo = null, delay = 0, dest = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    this._env(g, t, 0.005, vol, dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur = 0.2, vol = 0.2, type = 'lowpass', freq = 1200, slideTo = null, delay = 0, q = 1, dest = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    const g = this.ctx.createGain(); this._env(g, t, 0.005, vol, dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },

  // ---- game sounds ----
  kick(power = 0.5) {
    this.tone(160 + power * 60, 0.12, 'sine', 0.5, 50);
    this.noise(0.06 + power * 0.05, 0.25 + power * 0.25, 'lowpass', 2500 + power * 2000);
  },
  pass() { this.tone(220, 0.08, 'sine', 0.35, 90); this.noise(0.04, 0.15, 'lowpass', 2000); },
  bounce(v = 0.5) { this.tone(120 + v * 80, 0.07, 'sine', 0.12 + v * 0.2, 60); },
  thud() { this.tone(90, 0.18, 'sine', 0.5, 40); this.noise(0.12, 0.3, 'lowpass', 600); },
  tackle() { this.noise(0.22, 0.35, 'bandpass', 2500, 500, 0, 0.8); this.tone(300, 0.1, 'triangle', 0.15, 120); },
  bonk() { this.tone(600, 0.12, 'square', 0.12, 150); this.tone(900, 0.1, 'sine', 0.15, 300, 0.03); },
  post() { // metal goal frame: inharmonic partials ring out
    [1, 2.76, 5.4, 8.93].forEach((m, i) => this.tone(420 * m, 0.9 - i * 0.15, i ? 'sine' : 'triangle', 0.2 / (i + 1), 420 * m * 0.995));
    this.noise(0.04, 0.4, 'highpass', 3000); this.tone(140, 0.15, 'sine', 0.3, 70);
  },
  // body impact: a heavy thump, a cloth/skin slap and a little crunch
  hit(power = 1) {
    this.tone(75 + power * 15, 0.22, 'sine', 0.45 + power * 0.2, 35);
    this.noise(0.1, 0.32 + power * 0.15, 'lowpass', 900, 300);
    this.noise(0.035, 0.22, 'bandpass', 3200, 1800, 0.01, 1.4);
  },
  // falling onto the grass
  bodyFall() {
    this.tone(62, 0.16, 'sine', 0.4, 30);
    this.noise(0.18, 0.28, 'lowpass', 450, 150);
    this.noise(0.14, 0.07, 'highpass', 2500, null, 0.03);
  },
  // shot whoosh past the camera
  whoosh(speed = 1) {
    this.noise(0.28, 0.12 + speed * 0.12, 'bandpass', 700, 3200, 0, 1.8);
    this.noise(0.22, 0.06 + speed * 0.06, 'bandpass', 3000, 900, 0.12, 1.5);
  },
  // ball bulging the net: big swish, rope thump and the frame's chain rattle
  netHit(power = 1) {
    this.noise(0.55, 0.3 + power * 0.15, 'highpass', 3500, 900, 0, 0.7);
    this.noise(0.7, 0.22, 'bandpass', 1600, 500, 0.03, 0.8);
    this.tone(105, 0.3, 'sine', 0.5, 50, 0.01);
    this.noise(0.12, 0.35, 'lowpass', 500, 120, 0.01);
    for (let i = 0; i < 7; i++) this.tone(2200 + Math.random() * 2400, 0.025, 'square', 0.025, null, 0.05 + i * 0.035 + Math.random() * 0.02);
  },
  // keeper catch: leather-on-glove smack and a chest thump
  catchBall(power = 0.5) {
    this.noise(0.05, 0.45 + power * 0.25, 'bandpass', 1300, 700, 0, 1.3);
    this.tone(170, 0.12, 'sine', 0.4 + power * 0.2, 75);
    this.noise(0.12, 0.2, 'lowpass', 400, 120, 0.04);
    this.tone(1150, 0.035, 'sine', 0.05, 1500, 0.02);
  },
  // keeper punch / parry
  parry() {
    this.noise(0.05, 0.8, 'bandpass', 1800, 700, 0, 1);
    this.tone(240, 0.12, 'sine', 0.6, 110);
  },
  // crowd 'OOOOH' (near miss, post, great save)
  crowdOoh(big = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f1 = this.ctx.createBiquadFilter(), f2 = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    f1.type = f2.type = 'bandpass'; f1.Q.value = 5; f2.Q.value = 7;
    f1.frequency.setValueAtTime(560, t); f1.frequency.linearRampToValueAtTime(360, t + 1.2);
    f2.frequency.setValueAtTime(900, t); f2.frequency.linearRampToValueAtTime(800, t + 1.2);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * big, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    f1.connect(g); f2.connect(g); g.connect(this.sfx);
    for (let i = 0; i < 10; i++) {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth';
      const f = (i % 2 ? 210 : 120) * (1 + (Math.random() - 0.5) * 0.12);
      o.frequency.setValueAtTime(f * 1.1, t); o.frequency.linearRampToValueAtTime(f * 0.85, t + 1.4);
      o.connect(f1); o.connect(f2); const st = t + Math.random() * 0.12; o.start(st); o.stop(t + 1.6);
    }
    this.setCrowd(0.22);
  },
  whistle(long = false) {
    const t = long ? 0.9 : 0.35;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = 2600; lfo.frequency.value = 28; lg.gain.value = 180;
    lfo.connect(lg); lg.connect(o.frequency);
    this._env(g, now, 0.01, 0.18, t);
    o.connect(g); g.connect(this.sfx); o.start(); lfo.start(); o.stop(now + t + 0.1); lfo.stop(now + t + 0.1);
    if (long) { this.whistleAgain = setTimeout(() => this.whistle(false), 1000); }
  },
  cheer(big = 1) {
    this.setCrowd(0.18 + big * 0.25);
    this.noise(2.5 * big, 0.25 * big, 'bandpass', 900, 1400, 0, 0.5);
    this.noise(2.0 * big, 0.15 * big, 'highpass', 2500, 4000, 0.1, 0.4);
  },
  groan() { this.setCrowd(0.12); this.noise(1.2, 0.2, 'bandpass', 500, 200, 0, 1); },
  boing() { this.tone(180, 0.4, 'sine', 0.3, 600); this.tone(240, 0.3, 'triangle', 0.1, 800, 0.05); },
  squawk() {
    for (let i = 0; i < 3; i++) this.tone(700 + Math.random() * 300, 0.09, 'sawtooth', 0.12, 1400, i * 0.09);
  },
  zap() {
    for (let i = 0; i < 6; i++) this.tone(80 + Math.random() * 900, 0.06, 'square', 0.12, 40 + Math.random() * 2000, i * 0.05);
    this.noise(0.4, 0.2, 'highpass', 3000);
  },
  sizzle() { this.noise(0.8, 0.22, 'highpass', 4000, 2000); this.tone(200, 0.3, 'sawtooth', 0.08, 80); },
  boom(big = 1) {
    this.tone(110, 0.6 * big, 'sine', 0.6, 30);
    this.noise(0.9 * big, 0.6, 'lowpass', 1800, 80);
  },
  // 🥁 talking-drum shockwave: deep drum hit, pitch-bending boom and an air whoosh
  shockwave() {
    this.tone(160, 0.5, 'sine', 0.55, 45);
    this.tone(320, 0.18, 'triangle', 0.25, 90, 0.02);
    this.noise(0.7, 0.5, 'lowpass', 2200, 120);
    this.noise(0.5, 0.18, 'highpass', 1500, 6000, 0.05);
  },
  moo() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(130, t); o.frequency.linearRampToValueAtTime(150, t + 0.3); o.frequency.linearRampToValueAtTime(105, t + 1.0);
    f.type = 'lowpass'; f.frequency.setValueAtTime(400, t); f.frequency.linearRampToValueAtTime(900, t + 0.4); f.frequency.linearRampToValueAtTime(300, t + 1);
    this._env(g, t, 0.1, 0.35, 1.1);
    o.connect(f); f.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 1.2);
  },
  animal(e) {
    e = { elephant: '🐘', zebra: '🦓', wildebeest: '🦓', giraffe: '🦒', camel: '🐪' }[e] || e;
    if (e === 'goat') { for (let i = 0; i < 3; i++) this.tone(520 + i * 10, 0.12, 'sawtooth', 0.09, 470, i * 0.11); return; }
    if (e === 'penguin') { this.penguin(); return; }
    if (e === '🐘') { this.tone(420, 0.7, 'sawtooth', 0.18, 700); this.tone(430, 0.7, 'square', 0.08, 760, 0.02); }
    else if (e === '🦓') { for (let i = 0; i < 5; i++) this.tone(700 - i * 60, 0.08, 'sawtooth', 0.1, 500, i * 0.07); }
    else if (e === '🦒') this.tone(220, 0.25, 'sine', 0.15, 180);
    else this.moo();
  },
  vuvuzela(dur = 2) {
    // a swarm of slightly-detuned plastic horns (B-flat drone)
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(233 * (1 + (Math.random() - 0.5) * 0.03) * (i === 5 ? 2 : 1), t);
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2;
      const st = t + Math.random() * 0.3;
      g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.05, st + 0.15);
      g.gain.setValueAtTime(0.05, st + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
      o.connect(f); f.connect(g); g.connect(this.sfx); o.start(st); o.stop(st + dur + 0.05);
    }
  },
  honk() { // danfo bus horn: two-tone 'HONK HONK'
    for (const d of [0, 0.28]) { this.tone(330, 0.22, 'square', 0.16, null, d); this.tone(415, 0.22, 'square', 0.12, null, d); this.tone(165, 0.22, 'sawtooth', 0.1, null, d); }
  },
  powerDown() { this.tone(400, 1.2, 'sawtooth', 0.15, 40); this.noise(0.4, 0.2, 'lowpass', 800, 100); },
  pickup() { [660, 880, 1320].forEach((f, i) => this.tone(f, 0.09, 'square', 0.1, null, i * 0.06)); },
  item() { this.tone(400, 0.25, 'square', 0.12, 1600); this.tone(800, 0.2, 'triangle', 0.1, 2400, 0.05); },
  freeze() { for (let i = 0; i < 8; i++) this.tone(1500 + Math.random() * 2500, 0.15, 'sine', 0.07, null, i * 0.03); },
  shrink() { this.tone(1200, 0.5, 'square', 0.1, 200); },
  grow() { this.tone(100, 0.7, 'sawtooth', 0.15, 500); this.tone(150, 0.7, 'square', 0.08, 700); },
  squeak() { this.tone(1800 + Math.random() * 600, 0.08, 'sine', 0.15, 2600); },
  buzz() { this.tone(180, 0.6, 'sawtooth', 0.08, 200); this.tone(190, 0.6, 'sawtooth', 0.08, 185); },
  slip() { this.tone(300, 0.45, 'sine', 0.2, 1500); },
  charge(level) { this.tone(200 + level * 600, 0.05, 'square', 0.05); },
  superCharge() { this.tone(150, 1.0, 'sawtooth', 0.15, 1200); this.noise(1.0, 0.15, 'bandpass', 400, 4000, 0, 2); },
  superFire() { this.boom(0.8); this.tone(1200, 0.5, 'square', 0.15, 100); },
  ufo() { if (!this.ctx) return; for (let i = 0; i < 10; i++) this.tone(400 + (i % 2) * 300, 0.12, 'sine', 0.08, null, i * 0.12); },
  penguin() { this.tone(900, 0.08, 'square', 0.08, 700); this.tone(950, 0.08, 'square', 0.08, 700, 0.12); },
  ui() { this.tone(660, 0.05, 'square', 0.08); },
  uiConfirm() { this.tone(660, 0.07, 'square', 0.1); this.tone(990, 0.12, 'square', 0.1, null, 0.07); },
  uiBack() { this.tone(400, 0.08, 'square', 0.08, 250); },
  goalJingle() {
    const notes = [523, 659, 784, 1046, 784, 1046, 1318];
    notes.forEach((f, i) => { this.tone(f, 0.16, 'square', 0.09, null, i * 0.1); this.tone(f / 2, 0.16, 'triangle', 0.1, null, i * 0.1); });
  },
  countdown(final = false) { this.tone(final ? 1046 : 523, final ? 0.4 : 0.15, 'square', 0.12); },

  // ---- tiny step-sequencer for background music ----
  _schedule() {
    if (!this.ctx) return;
    const bpm = this.musicMode === 'match' ? 113 : 108; // amapiano sits around 108-115 BPM
    const stepDur = 60 / bpm / 4;
    while (this._nextTime < this.ctx.currentTime + 0.15) {
      this._playStep(this._step, this._nextTime, stepDur);
      this._nextTime += stepDur; this._step = (this._step + 1) % 128; // 8-bar loop
    }
  },
  // ---- AMAPIANO GROOVE ----------------------------------------------------
  // Log-drum bassline (the pitch-dropping, resonant "knock"), soft four-on-the-floor
  // kick, swung shakers, off-beat open hats, claps on 2 and 4, woodblock rimshots,
  // jazzy Rhodes chord stabs over an F-minor progression, a warm pad, and a breathy
  // flute lead in match mode.
  _playStep(s, t, sd) {
    if (!this.musicOn) return;
    const ctx = this.ctx, dest = this.music, match = this.musicMode === 'match';
    const bar = Math.floor(s / 16) % 8, st = s % 16;
    const swing = st % 2 ? sd * 0.18 : 0;            // amapiano shuffle on the off-16ths
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    // F minor progression with rootless jazz voicings: Fm9 | Bbm9 | Ebmaj9 | Dbmaj9
    const PROG = [
      { root: 41, chord: [56, 60, 63, 67] },  // Fm9   (Ab C Eb G)
      { root: 46, chord: [56, 60, 61, 65] },  // Bbm9  (Ab C Db F)
      { root: 39, chord: [55, 58, 62, 65] },  // Ebmaj9 (G Bb D F)
      { root: 37, chord: [53, 56, 60, 63] },  // Dbmaj9 (F Ab C Eb)
    ];
    const P = PROG[bar % 4];
    const env = (g, at, peak, a, dur) => { g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + a); g.gain.exponentialRampToValueAtTime(0.0001, at + dur); };
    const noise = (at, vol, type, freq, dur, q = 0.7) => {
      const n = ctx.createBufferSource(); n.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); env(g, at, vol, 0.002, dur);
      n.connect(f); f.connect(g); g.connect(dest); n.start(at, Math.random()); n.stop(at + dur + 0.02);
    };
    const tone = (freq, at, dur, type, vol, a = 0.005, to = null) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, at); if (to) o.frequency.exponentialRampToValueAtTime(to, at + Math.min(dur, 0.08));
      env(g, at, vol, a, dur); o.connect(g); g.connect(dest); o.start(at); o.stop(at + dur + 0.02);
      return o;
    };

    // kick: soft and round, every beat
    if (st % 4 === 0) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.1);
      env(g, t, st === 0 ? 0.7 : 0.5, 0.003, 0.22); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.24);
    }
    // clap on 2 and 4 (three quick layered bursts)
    if (st === 4 || st === 12) for (const d of [0, 0.011, 0.023]) noise(t + d, 0.22, 'bandpass', 1400, 0.09, 1.2);
    // shaker: every 16th, swung, accented on the off-beats
    noise(t + swing, st % 4 === 2 ? 0.1 : 0.045, 'highpass', 7500, 0.04);
    // open hat on the off-beats
    if (st % 4 === 2) noise(t, 0.06, 'highpass', 9000, 0.14);
    // woodblock rimshots: syncopated, a different pattern every other bar
    const rims = bar % 2 ? [3, 7, 10, 13] : [3, 6, 11, 15];
    if (rims.includes(st)) tone(1750, t + swing, 0.05, 'sine', 0.07, 0.001, 1250);
    // conga-ish tom at the end of every second bar
    if (bar % 2 && (st === 14 || st === 15)) tone(st === 14 ? 240 : 190, t + swing, 0.16, 'sine', 0.12, 0.002, 160);

    // LOG DRUM: pitch drops into the note through a resonant low-pass, the amapiano signature
    const LOG = match
      ? [[[0, 0], [3, 0], [6, 7], [10, 12], [13, 10]], [[0, 0], [2, 12], [5, 0], [8, 7], [11, 10], [14, 12]]]
      : [[[0, 0], [3, 0], [10, 7]], [[0, 0], [6, 12], [11, 7]]];
    const hit = LOG[bar % 2].find(n => n[0] === st);
    if (hit) {
      const at = t + swing, f = mtof(P.root + hit[1]), dur = 0.42;
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), g2 = ctx.createGain();
      o.type = 'sine'; o2.type = 'triangle';
      o.frequency.setValueAtTime(f * 2.4, at); o.frequency.exponentialRampToValueAtTime(f, at + 0.045);
      o2.frequency.setValueAtTime(f * 4.8, at); o2.frequency.exponentialRampToValueAtTime(f * 2, at + 0.045);
      if (st >= 13 && bar % 4 === 3) o.frequency.exponentialRampToValueAtTime(f * 1.5, at + dur); // slide up into the turnaround
      lp.type = 'lowpass'; lp.Q.value = 7; lp.frequency.setValueAtTime(2200, at); lp.frequency.exponentialRampToValueAtTime(260, at + dur);
      g2.gain.value = 0.45;
      env(g, at, 0.6, 0.004, dur);
      o.connect(g); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(dest);
      o.start(at); o2.start(at); o.stop(at + dur + 0.03); o2.stop(at + dur + 0.03);
    }

    // Rhodes-style chord stabs: syncopated, softer in the menus
    const STABS = match ? [0, 3, 7, 10, 13] : [0, 7, 10];
    if (STABS.includes(st)) {
      const at = t + swing, dur = st === 0 ? sd * 5 : sd * 2.6, vol = match ? 0.034 : 0.026;
      for (const m of P.chord) {
        tone(mtof(m), at, dur, 'sine', vol, 0.008);
        tone(mtof(m) * 2, at, dur * 0.6, 'triangle', vol * 0.22, 0.004); // bell-like overtone
      }
    }
    // warm pad: the whole chord held under each bar
    if (st === 0) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(dest);
      for (const m of P.chord) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = mtof(m - 12); o.detune.value = (Math.random() - 0.5) * 12;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.011, t + sd * 4); g.gain.linearRampToValueAtTime(0.0001, t + sd * 16);
        o.connect(g); g.connect(lp); o.start(t); o.stop(t + sd * 16 + 0.05);
      }
    }
    // breathy flute lead in the second half of the loop (matches only)
    if (match && bar >= 4) {
      const MEL = { 0: 72, 3: 75, 6: 77, 8: 75, 10: 79, 13: 77 };
      const m = MEL[st];
      if (m !== undefined && !(bar === 7 && st > 8)) {
        const at = t + swing, o = tone(mtof(m + (bar % 2 ? -2 : 0)), at, sd * 2.2, 'sine', 0.045, 0.03);
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 5.5; lg.gain.value = 6; lfo.connect(lg); lg.connect(o.frequency); lfo.start(at); lfo.stop(at + sd * 2.3);
        noise(at, 0.012, 'bandpass', 2500, sd * 1.5, 2);
      }
    }
  },
};
