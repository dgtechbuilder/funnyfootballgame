// ============================================================================
//  PLAYER VOICES: shouts, yelps and celebrations, synthesized live.
//
//  Two modes (Match Rules > Player Voices):
//   - ON: a small formant "talking" synth sings each speech-bubble word with
//     tonal, sing-song melodies (high/low tones per syllable, as in Yoruba,
//     Twi, Zulu or Swahili speech), rolled R's and ululation for celebrations.
//     Works everywhere, no lag, many voices at once.
//   - ACCENT (TTS): uses the device's African-English text-to-speech voices
//     (Nigerian, South African, Kenyan, Ghanaian, Tanzanian) when it has them
//     (e.g. Edge on Windows), falling back to the synth when busy or missing.
// ============================================================================

const VOICE_LINES = {
  hurt: null, // filled from PAIN_WORDS (data.js)
  goal: ['AYEEEE!', 'GOAL O!', 'YEBO!', 'SHARP SHARP!', 'GBAM!', 'E DON ENTER!', 'TWENDE!', 'OYA!', 'SHAYA!', 'HALLELUJAH!'],
  cheer: ['AYEEE!', 'YES O!', 'WOYOO!', 'HALLELUJAH!', 'AWEH!', 'YEBO YES!', 'OYA OYA!'],
  ownGoal: ['MAMA O!', 'HAIBO!', 'WETIN I DO?!', 'EISH...'],
  concede: ['HAIBO!', 'CHAI!', 'HAWU!', 'NAWA O!', 'EISH!', 'WUEH!', 'HABA!'],
  win: ['WE DON WIN!', 'CHAMPIONS O!', 'AYEEEE!', 'YEBO YES!', 'WE ARE THE BEST O!', 'HALLELUJAH!'],
  lose: ['EISH...', 'WAHALA...', 'NEXT TIME O...', 'HAIBO...', 'CHAI...'],
  draw: ['NAWA O...', 'EISH...', 'ALL OF US LOSE...'],
  taunt: ['COMOT!', 'SORRY O!', 'HAMBA!', 'TOKA!', 'SIDDON!', 'NOT TODAY!'],
};
const FEMALE_NAMES = ['Auntie Ama', 'Madame Fatou', 'Wanjiku', 'Akosua', 'Abena', 'Ngozi', 'Awa', 'Lerato', 'Neema', 'Zawadi', "Mama's Gloves"];

function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const VOX = {
  mode: 'synth',            // 'synth' | 'accent' | 'off'
  maxVoices: 4,
  _busyUntil: [],           // end times of voices currently sounding
  _lastAny: 0,
  _ttsVoices: null,

  // ---------------------------------------------------------------- per player
  profile(p) {
    if (p.voice) return p.voice;
    const h = hashStr(p.name + p.team.side);
    const fem = FEMALE_NAMES.includes(p.name);
    const keeper = p.role === 'keeper';
    p.voice = {
      fem,
      f0: fem ? 200 + (h % 55) : (keeper ? 92 : 102) + (h % 45),
      fscale: fem ? 1.16 : 0.97 + ((h >> 8) % 7) / 100,
      rate: 0.9 + ((h >> 12) % 25) / 100,
      seed: h,
    };
    return p.voice;
  },

  // ---------------------------------------------------------------- public API
  // say: speak `text` as player p. mood: hurt | goal | cheer | sad | taunt | save | win
  say(p, text, mood = 'hurt', delay = 0, force = false) {
    if (this.mode === 'off' || !SFX.ctx || !p || !text || (M && M.demo)) return false;
    const now = SFX.ctx.currentTime;
    const cd = p._voxT || 0;
    if (!force && now < cd) return false;
    this._busyUntil = this._busyUntil.filter(t => t > now);
    if (!force && (this._busyUntil.length >= this.maxVoices || now - this._lastAny < 0.06)) return false;
    this._lastAny = now;
    if (this.mode === 'accent' && delay === 0 && this._tts(p, text, mood)) { p._voxT = now + 1.2; return true; }
    const dur = this.synth(p, text, mood, delay);
    p._voxT = now + delay + dur + 0.25;
    this._busyUntil.push(now + delay + dur);
    return true;
  },
  grunt(p, delay = 0) { return this.say(p, pick(['UH!', 'OOF!', 'HUH!', 'EH!']), 'hurt', delay); },
  line(p, kind, delay = 0, force = false) {
    const lines = kind === 'hurt' ? (VOICE_LINES.hurt || PAIN_WORDS) : VOICE_LINES[kind];
    const txt = pick(lines);
    const mood = { goal: 'goal', cheer: 'goal', win: 'goal', ownGoal: 'sad', concede: 'sad', lose: 'sad', draw: 'sad', taunt: 'taunt' }[kind] || kind;
    this.say(p, txt, mood, delay, force);
    return txt;
  },

  // ---------------------------------------------------------------- text -> phones
  VOW: { a: [750, 1150, 2500], e: [500, 1850, 2550], i: [290, 2250, 3000], o: [520, 880, 2450], u: [330, 850, 2300], '@': [600, 1350, 2450] },
  parse(text) {
    const s = text.toLowerCase().replace(/[^a-z !?.']/g, '').replace(/'/g, '');
    const out = [], V = 'aeiou';
    const vow = (v, len = 1) => out.push({ k: 'v', v, len });
    for (let i = 0; i < s.length; i++) {
      const c = s[i], n = s[i + 1] || '', prev = s[i - 1] || ' ';
      const two = c + n;
      if (c === ' ') { out.push({ k: 'pause' }); continue; }
      if (c === '!' || c === '?') { out.push({ k: 'excl' }); continue; }
      if (c === '.') { if (prev !== '.') out.push({ k: 'trail' }); continue; }
      // vowel digraphs
      if (two === 'ee' || two === 'ea') { vow('i', 1.5); i++; continue; }
      if (two === 'oo') { vow('u', 1.5); i++; continue; }
      if (two === 'ai' || two === 'ay' || two === 'ei' || two === 'ey') { vow(c === 'a' ? 'a' : 'e', 0.8); vow('i', 0.6); i++; continue; }
      if (two === 'ou' || two === 'ow') { vow(c === 'o' && two === 'ow' ? 'o' : 'a', 0.8); vow('u', 0.6); i++; continue; }
      if (two === 'oa') { vow('o', 1.2); i++; continue; }
      if (V.includes(c)) { let len = 1; while (s[i + 1] === c) { len += 0.6; i++; } vow(c, len); continue; }
      if (c === 'y') {
        if (V.includes(n)) out.push({ k: 'glide', v: 'i' });
        else if (!V.includes(prev) && prev !== ' ') { vow('a', 0.8); vow('i', 0.6); } // my, why
        else vow('i');
        continue;
      }
      if (c === 'w') { out.push({ k: 'glide', v: 'u' }); continue; }
      // consonant digraphs
      if (two === 'sh') { out.push({ k: 'fric', f: 2700, q: 1.6, vol: 0.5 }); i++; continue; }
      if (two === 'ch') { out.push({ k: 'stop', f: 3000 }); out.push({ k: 'fric', f: 2900, q: 1.6, vol: 0.45, d: 0.05 }); i++; continue; }
      if (two === 'th') { out.push({ k: 'fric', f: 5500, q: 0.8, vol: 0.15 }); i++; continue; }
      if (two === 'ng') { out.push({ k: 'nasal' }); i++; continue; }
      if (two === 'gb' || two === 'kp') { out.push({ k: 'stop', f: 900, voiced: c === 'g', double: true }); i++; continue; }
      if (c === n && !V.includes(c)) continue; // double consonants
      switch (c) {
        case 'p': out.push({ k: 'stop', f: 900 }); break;
        case 't': out.push({ k: 'stop', f: 4000 }); break;
        case 'k': case 'c': case 'q': out.push({ k: 'stop', f: 2200 }); break;
        case 'b': out.push({ k: 'stop', f: 800, voiced: true }); break;
        case 'd': out.push({ k: 'stop', f: 3500, voiced: true }); break;
        case 'g': out.push({ k: 'stop', f: 2000, voiced: true }); break;
        case 'j': out.push({ k: 'stop', f: 3000, voiced: true }); out.push({ k: 'fric', f: 2800, q: 1.5, vol: 0.3, d: 0.04, voiced: true }); break;
        case 's': out.push({ k: 'fric', f: 6200, q: 1.2, vol: 0.4 }); break;
        case 'z': out.push({ k: 'fric', f: 5800, q: 1.2, vol: 0.3, voiced: true }); break;
        case 'f': out.push({ k: 'fric', f: 4200, q: 0.7, vol: 0.18 }); break;
        case 'v': out.push({ k: 'fric', f: 4000, q: 0.7, vol: 0.15, voiced: true }); break;
        case 'x': out.push({ k: 'stop', f: 2200 }); out.push({ k: 'fric', f: 6200, q: 1.2, vol: 0.4 }); break;
        case 'h': out.push({ k: 'h' }); break;
        case 'm': case 'n': out.push({ k: 'nasal', m: c === 'm' }); break;
        case 'l': out.push({ k: 'liquid' }); break;
        case 'r': out.push({ k: 'trill' }); break;
      }
    }
    return out;
  },

  // ---------------------------------------------------------------- formant synth
  synth(p, text, mood, delay = 0) {
    const ctx = SFX.ctx, P = this.profile(p);
    let phones = this.parse(text);
    // keep long captain quips snappy: at most ~7 syllables
    let vc = 0; phones = phones.filter(ph => (ph.k === 'v' ? ++vc : vc) <= 7 || ph.k === 'excl');
    const nV = phones.filter(ph => ph.k === 'v').length;
    if (!nV) return 0;
    const excl = phones.some(ph => ph.k === 'excl'), trail = phones.some(ph => ph.k === 'trail');
    const shout = { hurt: 1.35, goal: 1.45, taunt: 1.2, save: 1.25, sad: 0.95 }[mood] || 1.1;
    let f0 = P.f0 * shout * (p.fx && p.fx.shrink > 0 ? 1.9 : 1) * (p.fx && p.fx.mega > 0 ? 0.62 : 1);
    const fs = P.fscale * (p.fx && p.fx.shrink > 0 ? 1.25 : 1) * (p.fx && p.fx.mega > 0 ? 0.85 : 1);
    const rate = P.rate * (mood === 'sad' ? 0.8 : mood === 'goal' ? 0.95 : 1.1);
    const t0 = ctx.currentTime + delay + 0.01;

    // ---- graph: glottal source -> 3 formant bandpasses -> out
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(f0, t0);
    const vib = ctx.createOscillator(), vibG = ctx.createGain(); vib.frequency.value = 5.6; vibG.gain.value = 0;
    vib.connect(vibG); vibG.connect(osc.frequency);
    const vg = ctx.createGain(); vg.gain.setValueAtTime(0, t0);
    const tilt = ctx.createBiquadFilter(); tilt.type = 'lowpass'; tilt.frequency.value = 3800;
    osc.connect(tilt); tilt.connect(vg);
    const out = ctx.createGain(); out.gain.value = mood === 'sad' ? 0.5 : 0.62;
    let dest = SFX.sfx;
    if (ctx.createStereoPanner && p.x != null && typeof FW !== 'undefined') {
      const pan = ctx.createStereoPanner(); pan.pan.value = clamp((p.x / FW) * 2 - 1, -1, 1) * 0.55; pan.connect(SFX.sfx); dest = pan;
    }
    out.connect(dest);
    const F = [0, 1, 2].map(i => {
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = [7, 11, 14][i];
      const g = ctx.createGain(); g.gain.value = [1.6, 1.1, 0.55][i];
      vg.connect(f); f.connect(g); g.connect(out); return f;
    });
    const body = ctx.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 700;
    const bodyG = ctx.createGain(); bodyG.gain.value = 0.12; vg.connect(body); body.connect(bodyG); bodyG.connect(out);
    // noise for consonants
    const ns = ctx.createBufferSource(); ns.buffer = SFX.noiseBuf; ns.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 3000; nf.Q.value = 1;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0, t0);
    ns.connect(nf); nf.connect(ng); ng.connect(out);

    const setF = (fr, t, tc = 0.018) => F.forEach((f, i) => f.frequency.setTargetAtTime(fr[i] * fs, t, tc));
    const voice = (lvl, t, tc = 0.012) => vg.gain.setTargetAtTime(lvl, t, tc);
    const hiss = (lvl, t, f, q, tc = 0.006) => { ng.gain.setTargetAtTime(lvl, t, tc); if (f) { nf.frequency.setValueAtTime(f, t); nf.Q.setValueAtTime(q || 1, t); } };

    // ---- tone melody: tonal-language sing-song, shaped by mood
    const TONE = { H: 1.28, M: 1.0, L: 0.8 };
    const toneOf = (i) => {
      const r = (P.seed >> (i * 3)) ^ hashStr(text) >> i;
      return ['H', 'M', 'L', 'H', 'L'][(r >>> 0) % 5];
    };
    let vi = 0;
    const pitchFor = (i) => {
      const last = i === nV - 1;
      let a = TONE[toneOf(i)], b = a;
      if (mood === 'hurt') { a = i === 0 ? 1.4 : a * 0.95; b = last ? a * 0.62 : a * 0.92; }
      else if (mood === 'goal') { if (last) { a = 1.25; b = 1.65; } }
      else if (mood === 'sad') { a = 1.05 - i * 0.07; b = a - (last ? 0.25 : 0.05); }
      else if (mood === 'taunt' || mood === 'save') { a = i % 2 ? 0.9 : 1.25; b = last ? a * (excl ? 0.75 : 1) : a; }
      if (excl && last && mood !== 'hurt' && mood !== 'sad') b *= 1.12;
      return [a, b];
    };

    let t = t0;
    phones.forEach((ph, idx) => {
      const nxt = phones.slice(idx + 1).find(q => q.k === 'v');
      const nv = nxt ? this.VOW[nxt.v] : this.VOW['@'];
      switch (ph.k) {
        case 'v': {
          const last = vi === nV - 1;
          let d = 0.105 * ph.len / rate;
          if (last) d *= mood === 'goal' ? 2.6 : mood === 'sad' || trail ? 2.3 : 1.7;
          const [a, b] = pitchFor(vi);
          osc.frequency.setTargetAtTime(f0 * a, t, 0.02);
          osc.frequency.setTargetAtTime(f0 * b, t + d * 0.35, d * 0.35);
          setF(this.VOW[ph.v], t);
          voice(1, t); hiss(mood === 'sad' ? 0.025 : 0, t, 1800, 0.5);
          if (last && (mood === 'goal' || d > 0.3)) { vibG.gain.setValueAtTime(0, t); vibG.gain.linearRampToValueAtTime(f0 * 0.05, t + d); }
          t += d; vi++; break;
        }
        case 'stop': {
          const d = 0.055 / rate;
          voice(ph.voiced ? 0.18 : 0, t, 0.006);
          if (ph.voiced) setF([220, 900, 2300], t, 0.01);
          hiss(ph.voiced ? 0.35 : 0.7, t + d * 0.6, ph.f, 1.2, 0.002);
          hiss(0, t + d * 0.6 + 0.018, null, null, 0.008);
          if (ph.double) { hiss(0.45, t + d * 0.25, 600, 1, 0.002); hiss(0, t + d * 0.25 + 0.012, null, null, 0.006); }
          setF(nv, t + d * 0.6, 0.02);
          t += d; break;
        }
        case 'fric': {
          const d = (ph.d || 0.075) / rate;
          voice(ph.voiced ? 0.3 : 0, t, 0.01);
          hiss(ph.vol, t, ph.f, ph.q, 0.008); hiss(0, t + d, null, null, 0.01);
          t += d; break;
        }
        case 'h': {
          const d = 0.06 / rate;
          voice(0, t, 0.008); setF(nv, t, 0.005);
          hiss(0.22, t, 1500, 0.6, 0.008); hiss(0, t + d, null, null, 0.01);
          t += d; break;
        }
        case 'nasal': {
          const d = 0.06 / rate;
          voice(0.5, t); setF(ph.m ? [260, 1000, 2200] : [260, 1600, 2500], t, 0.01);
          t += d; break;
        }
        case 'liquid': {
          const d = 0.045 / rate;
          voice(0.75, t); setF([360, 1250, 2700], t, 0.01);
          t += d; break;
        }
        case 'trill': { // rolled R
          const d = 0.025 / rate;
          setF([450, 1350, 2100], t, 0.008);
          for (let k = 0; k < 3; k++) { voice(0.2, t, 0.003); voice(0.85, t + d * 0.5, 0.003); t += d; }
          break;
        }
        case 'glide': {
          const d = 0.04 / rate;
          voice(0.8, t); setF(this.VOW[ph.v], t, 0.006);
          t += d; break;
        }
        case 'pause': voice(0, t, 0.01); t += 0.04 / rate; break;
        default: break;
      }
    });
    voice(0, t, 0.03); hiss(0, t, null, null, 0.01);
    const end = t + 0.2;
    osc.start(t0); vib.start(t0); ns.start(t0, Math.random());
    osc.stop(end); vib.stop(end); ns.stop(end);
    return end - t0;
  },

  // Ululation: the high, trilling "lulululu" of celebration, heard at weddings and goals.
  ululate(p, delay = 0, dur = 1.5) {
    if (this.mode === 'off' || !SFX.ctx || !p || (M && M.demo)) return;
    const ctx = SFX.ctx, P = this.profile(p);
    const t0 = ctx.currentTime + delay + 0.01, end = t0 + dur;
    const f0 = (P.fem ? 640 : 420) * (1 + (P.seed % 9) / 100);
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0 * 0.85, t0); osc.frequency.linearRampToValueAtTime(f0, t0 + 0.25); osc.frequency.linearRampToValueAtTime(f0 * 1.06, end);
    const vg = ctx.createGain(); vg.gain.setValueAtTime(0.0001, t0); vg.gain.exponentialRampToValueAtTime(1, t0 + 0.12);
    vg.gain.setValueAtTime(1, end - 0.25); vg.gain.exponentialRampToValueAtTime(0.0001, end);
    const out = ctx.createGain(); out.gain.value = 0.38; out.connect(SFX.sfx);
    osc.connect(vg);
    // the tongue flicks between "l" and "i/u" ~7 times a second
    const lfo = ctx.createOscillator(); lfo.type = 'triangle'; lfo.frequency.value = 7 + (P.seed % 3) * 0.4;
    const F = [[420, 160], [1700, 600], [2900, 250]].map(([fc, dep], i) => {
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = [6, 9, 12][i]; f.frequency.value = fc * P.fscale;
      const lg = ctx.createGain(); lg.gain.value = dep; lfo.connect(lg); lg.connect(f.frequency);
      const g = ctx.createGain(); g.gain.value = [1.4, 1.1, 0.5][i];
      vg.connect(f); f.connect(g); g.connect(out); return f;
    });
    const am = ctx.createGain(); am.gain.value = 0.18; lfo.connect(am); am.connect(out.gain);
    osc.start(t0); lfo.start(t0); osc.stop(end + 0.05); lfo.stop(end + 0.05);
    this._busyUntil.push(end);
    return F;
  },

  // ---------------------------------------------------------------- device TTS with an African accent
  ttsVoices() {
    if (!window.speechSynthesis) return [];
    let vs = [];
    try { vs = speechSynthesis.getVoices() || []; } catch (e) { return []; }
    if (!vs.length) return [];
    if (this._ttsVoices && this._ttsVoices.n === vs.length) return this._ttsVoices.list;
    const pref = ['en-ng', 'en-za', 'en-ke', 'en-gh', 'en-tz', 'en-ug', 'en-zw', 'en-zm', 'en-rw'];
    const lang = v => (v.lang || '').replace('_', '-').toLowerCase();
    const named = /nigeria|south africa|kenya|ghana|tanzania|uganda|zimbabwe|zambia|rwanda/i;
    const list = vs.filter(v => pref.some(l => lang(v).startsWith(l)) || named.test(v.name));
    list.sort((a, b) => (/natural|online|neural/i.test(b.name) ? 1 : 0) - (/natural|online|neural/i.test(a.name) ? 1 : 0));
    this._ttsVoices = { n: vs.length, list };
    return list;
  },
  ttsVoice(fem) {
    const list = this.ttsVoices();
    if (!list.length) return null;
    const F = /ezinne|asilia|leah|imani|female|woman|zuri|akua/i, Mx = /abeo|chilemba|luke|elimu|male|man\b/i;
    return list.find(v => (fem ? F : Mx).test(v.name)) || list[0];
  },
  ttsName() { const v = this.ttsVoice(false); return v ? v.name.replace(/Microsoft |Google |Online |\(Natural\)/g, '').trim() : null; },
  _tts(p, text, mood) {
    if (!window.speechSynthesis || speechSynthesis.speaking || speechSynthesis.pending) return false;
    const P = this.profile(p), v = this.ttsVoice(P.fem);
    if (!v) return false;
    try {
      const u = new SpeechSynthesisUtterance(text.replace(/[^\w\s!?',.]/g, '').toLowerCase());
      u.voice = v; u.lang = v.lang;
      u.pitch = clamp((P.fem ? 1.25 : 0.85) * (mood === 'goal' ? 1.2 : mood === 'sad' ? 0.9 : 1.05), 0, 2);
      u.rate = mood === 'sad' ? 0.95 : 1.25; u.volume = 1;
      speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  },
};
VOICE_LINES.hurt = PAIN_WORDS;
if (window.speechSynthesis) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => { VOX._ttsVoices = null; }; } catch (e) { /* noop */ } }
