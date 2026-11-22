// ============================================================================
//  PERFORMANCE: adaptive graphics quality for slow phones and old laptops.
//
//  Almost all of the frame cost is filling pixels, so the main lever is the
//  canvas resolution; after that we drop the cosmetic extras (soft grass patches,
//  half the crowd, particles, glow). In AUTO mode the level follows the real
//  frame rate: it steps down when frames are slow, undoes a step that did not
//  help (e.g. a 30 Hz screen or battery saver, where fewer pixels change
//  nothing), and steps back up when there is headroom. The level that worked
//  is remembered, so the next launch starts there instead of stuttering.
//
//  Force a level from the URL:  index.html?gfx=low   (high | low | auto)
// ============================================================================

const PERF_LEVELS = [
  //  name        max pixel ratio  crowd step  grass   particles  glow
  { name: 'HIGH',   ratio: 2,    crowd: 1, grass: 2, parts: 900, glow: true },
  { name: 'MEDIUM', ratio: 1,    crowd: 1, grass: 2, parts: 900, glow: true },
  { name: 'LOW',    ratio: 0.8,  crowd: 2, grass: 1, parts: 300, glow: false },
  { name: 'LOWEST', ratio: 0.6,  crowd: 3, grass: 0, parts: 140, glow: false },
];

const Perf = {
  mode: 'auto',   // 'auto' | 'high' | 'low'
  level: 0,
  q: PERF_LEVELS[0],
  fps: 60,
  onChange: null,  // set by the app: resize the canvas

  // window of frame samples
  _n: 0, _sum: 0, _t: 0, _warm: 1.5,
  _tried: null,    // { from, fpsBefore, down } after a step, to check it actually helped
  _noDownFrom: -1, // stepping down from this level made no difference: stop trying
  _noUpTo: -1, _noUpT: 0, // climbing to this level failed recently: wait before trying again
  _goodT: 0,
  _hist: [],       // the last two window averages

  init(mode) {
    const url = (location.search.match(/[?&]gfx=(\w+)/) || [])[1];
    this.mode = ['auto', 'high', 'low'].includes(url) ? url : ['auto', 'high', 'low'].includes(mode) ? mode : 'auto';
    let learned = null;
    try { learned = localStorage.getItem('monate-gfx-level'); } catch (e) { /* storage unavailable */ }
    // first launch on a very small or low-memory device: start one notch down; AUTO climbs back if it can
    const lowMem = navigator.deviceMemory && navigator.deviceMemory <= 2, fewCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
    const start = learned !== null && learned !== '' && !isNaN(+learned) ? +learned : (lowMem || fewCores) ? 2 : 0;
    this.set(this.mode === 'high' ? 0 : this.mode === 'low' ? 2 : clamp(start, 0, PERF_LEVELS.length - 1), true);
    this._warm = 1.5; // let the first frames (font swap, caches warming up) settle before judging
  },
  set(level, silent) {
    level = clamp(level, 0, PERF_LEVELS.length - 1);
    if (level === this.level && this.q === PERF_LEVELS[level] && !silent) return;
    this.level = level; this.q = PERF_LEVELS[level];
    this._n = 0; this._sum = 0; this._t = 0; this._warm = 0.8; this._hist = [];
    if (this.mode === 'auto') try { localStorage.setItem('monate-gfx-level', String(level)); } catch (e) { /* ignore */ }
    if (this.onChange) this.onChange();
  },
  setMode(mode) {
    this.mode = mode; this._tried = null; this._noDownFrom = -1; this._noUpT = 0; this._goodT = 0;
    this._n = 0; this._sum = 0; this._t = 0; this._warm = 0.8; this._hist = [];
    this.set(mode === 'high' ? 0 : mode === 'low' ? 2 : this.level);
  },
  // two levels that come out the same on this screen (HIGH and MEDIUM on a 1x display) count as one step
  _same(a, b) {
    const A = PERF_LEVELS[a], B = PERF_LEVELS[b], d = window.devicePixelRatio || 1;
    return Math.min(d, A.ratio) === Math.min(d, B.ratio) && A.crowd === B.crowd && A.grass === B.grass && A.parts === B.parts && A.glow === B.glow;
  },
  _down() { if (this.level >= PERF_LEVELS.length - 1) return -1; let l = this.level + 1; while (l < PERF_LEVELS.length - 1 && this._same(l, this.level)) l++; return this._same(l, this.level) ? -1 : l; },
  _up() { if (this.level <= 0) return -1; let l = this.level - 1; while (l > 0 && this._same(l, this.level)) l--; if (this._same(l, this.level)) return -1; while (l > 0 && this._same(l - 1, l)) l--; return l; },
  label() { return this.mode === 'auto' ? `AUTO · ${this.q.name}` : this.q.name; },
  // canvas pixels per CSS pixel
  ratio() { return Math.min(window.devicePixelRatio || 1, this.q.ratio); },

  // call once per rendered frame with the real (unclamped) frame time in seconds.
  // Frames are averaged over 1.5 s windows, and every decision needs two windows in a row (3 s), so a
  // single busy moment (a goal celebration, a garbage-collection pause) never changes the level.
  frame(raw) {
    if (document.hidden || raw > 0.5) return; // tab switches and hiccups say nothing about the device
    if (this._noUpT > 0) this._noUpT -= raw;
    if (this._warm > 0) { this._warm -= raw; return; }
    this._n++; this._sum += raw; this._t += raw;
    if (this._t < 1.5) return;
    const fps = this._n / this._sum;
    this.fps = fps; this._n = 0; this._sum = 0; this._t = 0;
    if (this.mode !== 'auto') return;
    this._hist.push(fps); if (this._hist.length > 2) this._hist.shift();
    if (this._hist.length < 2) return;
    const avg = (this._hist[0] + this._hist[1]) / 2;
    // did the last step actually help? A step down that changes nothing means the device is not
    // pixel-bound (30 Hz screen, battery saver, slow CPU): undo it and keep the nicer picture
    if (this._tried) {
      const tr = this._tried; this._tried = null;
      if (tr.down && avg < tr.fpsBefore * 1.1 && avg < 50) {
        // no better yet: the next level may drop the part that matters, so probe on down to the bottom
        // once, and only give up (back to where we started) if none of them helps
        const next = this._down();
        if (next >= 0) { this._tried = tr; this.set(next); return; }
        this._noDownFrom = tr.from; this.set(tr.from); return;
      }
      if (!tr.down && avg < 48) { this._noUpTo = this.level; this._noUpT = 90; this.set(tr.from); return; }
    }
    const down = this._down(), up = this._up();
    if (avg < 45 && down >= 0 && this._noDownFrom !== this.level) {
      this._tried = { from: this.level, fpsBefore: avg, down: true }; this._goodT = 0;
      this.set(down);
      return;
    }
    this._goodT = fps > 57 ? this._goodT + 1.5 : 0;
    if (this._goodT >= 9 && up >= 0 && !(this._noUpT > 0 && this._noUpTo === up)) {
      this._goodT = 0;
      this._tried = { from: this.level, fpsBefore: avg, down: false };
      this.set(up);
    }
  },
};
