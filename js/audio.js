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
  post() { [523, 1046, 1568].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.15 / (i + 1), f * 0.98)); },
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
  moo() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(130, t); o.frequency.linearRampToValueAtTime(150, t + 0.3); o.frequency.linearRampToValueAtTime(105, t + 1.0);
    f.type = 'lowpass'; f.frequency.setValueAtTime(400, t); f.frequency.linearRampToValueAtTime(900, t + 0.4); f.frequency.linearRampToValueAtTime(300, t + 1);
    this._env(g, t, 0.1, 0.35, 1.1);
    o.connect(f); f.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 1.2);
  },
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
    const bpm = this.musicMode === 'match' ? 138 : 118;
    const stepDur = 60 / bpm / 4;
    while (this._nextTime < this.ctx.currentTime + 0.15) {
      this._playStep(this._step, this._nextTime, stepDur);
      this._nextTime += stepDur; this._step = (this._step + 1) % 64;
    }
  },
  _playStep(s, t, sd) {
    if (!this.musicOn) return;
    const ctx = this.ctx, dest = this.music;
    const bar = Math.floor(s / 16) % 4, st = s % 16;
    const roots = [0, -4, -2, -5]; // I - vi - vii - V-ish in semitones (C, Ab, Bb, G)
    const root = 130.81 * Math.pow(2, roots[bar] / 12);
    const osc = (freq, dur, type, vol, at = t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, at);
      g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g); g.connect(dest); o.start(at); o.stop(at + dur + 0.02);
    };
    // kick
    if (st % 4 === 0) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.16);
    }
    // snare
    if (st === 4 || st === 12) {
      const n = ctx.createBufferSource(); n.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      n.connect(f); f.connect(g); g.connect(dest); n.start(t, Math.random()); n.stop(t + 0.13);
    }
    // hats
    if (st % 2 === 1) {
      const n = ctx.createBufferSource(); n.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      n.connect(f); f.connect(g); g.connect(dest); n.start(t, Math.random()); n.stop(t + 0.05);
    }
    // bass (bouncy octaves)
    const bassPat = [1, 0, 2, 0, 1, 0, 2, 1, 1, 0, 2, 0, 1, 2, 0, 2];
    if (bassPat[st]) osc(root / 2 * (bassPat[st] === 2 ? 2 : 1), sd * 1.6, 'square', 0.18);
    // lead: silly arpeggio, only in match mode for 2 of 4 bars
    const scale = [0, 4, 7, 12, 7, 4, 9, 7];
    const melody = this.musicMode === 'match'
      ? [0, -1, 2, -1, 4, -1, 2, 5, -1, 4, -1, 2, 1, -1, 0, -1]
      : [0, -1, -1, 2, -1, -1, 4, -1, 3, -1, 2, -1, 1, -1, -1, -1];
    const m = melody[st];
    if (m >= 0) osc(root * 2 * Math.pow(2, scale[m % 8] / 12), sd * 1.4, 'triangle', 0.14);
  },
};
