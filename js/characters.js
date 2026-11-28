// ============================================================================
//  CHARACTERS: a gallery of every captain, plus a form to suggest a new one.
//  Suggestions are saved in this browser and can be sent to the developers
//  as a pre-filled GitHub issue (or copied as text).
// ============================================================================

const SUGGEST_REPO = 'https://github.com/dgtechbuilder/funnyfootballgame';
const AFRICAN_COUNTRIES = ['Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cameroon', 'Central African Republic', 'Chad', 'Comoros',
  'DR Congo', 'Republic of the Congo', "Côte d'Ivoire", 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'The Gambia', 'Ghana',
  'Guinea', 'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia',
  'Niger', 'Nigeria', 'Rwanda', 'São Tomé and Príncipe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania',
  'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe', 'African diaspora'];

const FanChars = {
  list: [],
  load() { try { this.list = JSON.parse(localStorage.getItem('monate-suggestions') || '[]') || []; } catch (e) { this.list = []; } },
  save() { try { localStorage.setItem('monate-suggestions', JSON.stringify(this.list)); } catch (e) { /* ignore */ } },
  // a captain-shaped object so the normal character renderer can draw a suggestion
  asCap(f) {
    const base = CAPTAINS.find(c => c.id === f.look) || CAPTAINS[0];
    return { id: base.id, color: f.kit || '#e8433a', color2: shade(f.kit || '#e8433a', -0.55), skin: f.skin || SKINS[2], sidekickHat: base.sidekickHat };
  },
  issueText(f) {
    const rows = [['Name', f.name], ['Country', f.country], ['Nickname', f.nick], ['Team name', f.team], ['Personality / backstory', f.bio],
      ['Signature power idea', f.power], ['Super strike name', f.superName], ['Catchphrase', f.quip], ['Looks a bit like', (CAPTAINS.find(c => c.id === f.look) || {}).short],
      ['Kit colour', f.kit], ['Suggested by', f.by]];
    return rows.filter(r => r[1]).map(([k, v]) => `**${k}:** ${v}`).join('\n\n');
  },
  issueUrl(f) {
    const title = `Character suggestion: ${f.name} (${f.country})`;
    const body = `A new captain suggested from the in-game Characters page.\n\n${this.issueText(f)}\n`;
    return `${SUGGEST_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=character-suggestion`;
  },
};
FanChars.load();
window.addEventListener('online', () => {
  const n = FanChars.list.filter(f => f.pending).length;
  if (n && typeof App !== 'undefined' && App.toast) App.toast(`📶 Back online: ${n} character suggestion${n > 1 ? 's' : ''} ready to send (CHARACTERS → SEND)`, '#7CFC00');
});

Object.assign(App, {
  charItems() { return [...CAPTAINS.map(c => ({ kind: 'cap', c })), ...FanChars.list.slice(-7).map(f => ({ kind: 'fan', f })), { kind: 'add' }]; },
  openChars() { this.charSel = this.charSel || 0; this.go('chars'); },
  uChars() {
    if (this.form) return;
    const items = this.charItems(), cols = 4;
    let i = clamp(this.charSel || 0, 0, items.length - 1);
    const nx = Input.navX(), ny = Input.navY();
    if (nx) { i = (i + nx + items.length) % items.length; SFX.ui(); }
    if (ny) { i = clamp(i + ny * cols, 0, items.length - 1); SFX.ui(); }
    this.charSel = i;
    if (Input.back()) { this.back('title'); return; }
    if (Input.confirm() && items[i].kind === 'add') this.openSuggest();
  },

  rChars(c) {
    const W = this.W, H = this.H, u = this.u();
    this.header(c, 'CHARACTERS', `${CAPTAINS.length} captains from across Africa, each with a squad of three and a keeper. Got a better one? Suggest it!`);
    const items = this.charItems(), sel = items[clamp(this.charSel || 0, 0, items.length - 1)];
    const K = this.compact(), narrow = W < 900 && !K; // phones in landscape: side by side, it fits better
    // ---- detail panel
    const dx = (K ? 10 : 20) * u, dy = (K ? 68 : 112) * u, dw = narrow ? W - 40 * u : W * (K ? 0.5 : 0.46), dh = narrow ? H * 0.42 : H - dy - (K ? 10 : 60) * u;
    this.panel(c, dx, dy, dw, dh, 'rgba(10,12,34,0.9)');
    if (sel.kind === 'add') this.rSuggestPitch(c, dx, dy, dw, dh);
    else this.rCharDetail(c, sel, dx, dy, dw, dh, narrow);
    // ---- tiles
    const gx = narrow ? 20 * u : dx + dw + (K ? 10 : 16) * u, gy = narrow ? dy + dh + 12 * u : dy, gw = narrow ? W - 40 * u : W - gx - (K ? 10 : 20) * u;
    const cols = 4, rows = Math.ceil(items.length / cols), cw = (gw - (cols - 1) * 10 * u) / cols;
    const chh = Math.min(cw * 0.95, ((narrow ? H - gy - 50 * u : dh) - (rows - 1) * 10 * u) / rows);
    items.forEach((it, i) => {
      const x = gx + (i % cols) * (cw + 10 * u), y = gy + Math.floor(i / cols) * (chh + 10 * u);
      const on = i === this.charSel, hov = this.over(x, y, cw, chh);
      const col = it.kind === 'cap' ? it.c.color : it.kind === 'fan' ? it.f.kit : '#2b8a3e';
      c.fillStyle = on ? col : hov ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'; rrect(c, x, y, cw, chh, 12 * u); c.fill();
      c.strokeStyle = on ? '#ffe066' : hov ? '#fff' : 'rgba(255,255,255,0.3)'; c.lineWidth = on ? 4 : 2; c.stroke();
      if (it.kind === 'add') {
        text(c, '＋', x + cw / 2, y + chh * 0.4, chh * 0.4, '#fff', 'center', '#000', 4 * u);
        text(c, 'SUGGEST', x + cw / 2, y + chh - 14 * u, Math.min(14 * u, cw / 6), '#fff', 'center', '#000', 3 * u);
      } else {
        const cap = it.kind === 'cap' ? it.c : FanChars.asCap(it.f);
        c.save(); c.beginPath(); rrect(c, x, y, cw, chh, 12 * u); c.clip();
        drawCharacter(c, portraitDesc(cap, 'captain', cap.color, this.t + i, { expr: on || hov ? 'happy' : 'normal', face: 0.4, moving: on || hov ? 0.6 : 0 }), x + cw / 2, y + chh * 1.02, chh / 86);
        c.restore();
        const nm = it.kind === 'cap' ? it.c.short : it.f.name;
        text(c, nm.toUpperCase(), x + cw / 2, y + chh - 12 * u, Math.min(14 * u, cw / (nm.length * 0.7)), '#fff', 'center', '#000', 3 * u);
        drawEmoji(c, it.kind === 'cap' ? it.c.flag : '💡', x + 16 * u, y + 16 * u, 18 * u);
      }
      this.hit(x, y, cw, chh, () => { if (this.charSel === i && it.kind === 'add') this.openSuggest(); else { this.charSel = i; SFX.ui(); if (it.kind === 'add') this.openSuggest(); } }, null, 'char:' + i);
    });
    this.navButtons(c, () => this.back('title'), null);
    if (K) this.button(c, W - 178 * u, 8 * u, 170 * u, 38 * u, '💡 SUGGEST ONE', () => this.openSuggest(), { size: 15 * u, color: 'rgba(30,140,60,0.92)' });
    else this.button(c, W - 214 * u, 14 * u, 200 * u, 42 * u, '💡 SUGGEST ONE', () => this.openSuggest(), { size: 16 * u, color: 'rgba(30,140,60,0.92)' });
  },
  rCharDetail(c, it, x, y, w, h, narrow) {
    const u = this.u(), fan = it.kind === 'fan';
    const cap = fan ? FanChars.asCap(it.f) : it.c, f = it.f || {};
    const P = fan ? { name: f.name, nick: f.nick, country: f.country, flag: '💡', team: f.team || `${f.name}'s XI`, blurb: f.bio || 'A fan-suggested captain.' } : it.c;
    const ps = Math.min(h * (narrow ? 0.62 : 0.5) / 86, w * 0.34 / 52);
    const px = x + w * 0.2, py = y + h * (narrow ? 0.86 : 0.68);
    ellipse(c, px, py, 70 * ps / 2.2, 18 * ps / 2.2, 'rgba(0,0,0,0.4)');
    if (fan || !drawCapArt(c, cap, px, py + 4 * ps, 100 * ps, this.t, false)) drawCharacter(c, portraitDesc(cap, 'captain', cap.color, this.t, { face: 0.35, moving: 0.4, expr: Math.sin(this.t * 1.3) > 0.7 ? 'grit' : 'happy' }), px, py, ps);
    const tx = x + w * 0.4, tw = w * 0.57;
    let ty = y + 26 * u;
    const line = (str, size, col, font = FONT) => {
      if (ty > y + h - size * 0.8) return; // out of room (small screens): drop the rest
      if (font === FONT_UI && measureW(c, str, size) > tw) { // wrap long sentences instead of shrinking them
        const n = Math.min(3, Math.ceil(measureW(c, str, size) / tw)); wrapText(c, str, tx, ty, tw, size, col); ty += size * 1.3 * n + size * 0.2; return;
      }
      text(c, str, tx, ty, Math.min(size, tw / (Math.max(str.length, 8) * 0.55)), col, 'left', font === FONT ? '#000' : null, font === FONT ? 3 * u : 0, font); ty += size * 1.45;
    };
    line(P.name.toUpperCase(), 24 * u, '#fff');
    line(`${P.flag} ${String(P.country).toUpperCase()}${P.nick ? '  ·  "' + P.nick + '"' : ''}`, 14 * u, '#ffe066');
    line(P.team.toUpperCase(), 15 * u, cap.color === '#111111' ? '#fff' : cap.color);
    c.save(); wrapText(c, P.blurb, tx, ty, tw, 13 * u, '#fff'); c.restore();
    ty += 13 * u * 1.3 * Math.min(4, Math.ceil(measureW(c, P.blurb, 13 * u) / tw)) + 8 * u;
    if (!fan) {
      const stats = [['SPEED', cap.speed / 1.25], ['POWER', cap.power / 1.3], ['TACKLE', cap.tackle / 1.45], ['SIZE', cap.size / 1.35]];
      stats.forEach(([n, v]) => {
        text(c, n, tx, ty, 12 * u, '#aaa', 'left', null, 0, FONT);
        c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(tx + 62 * u, ty - 5 * u, tw - 70 * u, 10 * u);
        c.fillStyle = cap.color; c.fillRect(tx + 62 * u, ty - 5 * u, (tw - 70 * u) * clamp(v, 0.1, 1), 10 * u);
        ty += 17 * u;
      });
      ty += 4 * u;
      line(`🌟 SUPER: ${cap.superName}`, 13 * u, '#ff8fd0');
      line(`${cap.signature.icon} ${cap.signature.name}: ${cap.signature.desc}`, 12.5 * u, '#ffb066', FONT_UI);
      line(`${cap.squad.icon} SQUAD ${cap.squad.name}: ${cap.squad.desc}`, 12.5 * u, '#9cf', FONT_UI);
      line(`👥 Squad: ${(SIDEKICK_NAMES[cap.id] || []).join(', ')}`, 12.5 * u, '#ddd', FONT_UI);
      line(`💬 "${cap.quips.join('"  "')}"`, 12.5 * u, '#ddd', FONT_UI);
    } else {
      if (f.power) line(`🔥 POWER IDEA: ${f.power}`, 12.5 * u, '#ffb066', FONT_UI);
      if (f.superName) line(`🌟 SUPER: ${f.superName}`, 13 * u, '#ff8fd0');
      if (f.quip) line(`💬 "${f.quip}"`, 12.5 * u, '#ddd', FONT_UI);
      if (f.by) line(`✍️ Suggested by ${f.by}`, 12.5 * u, '#ddd', FONT_UI);
      line(f.sent ? '✅ Sent to the developers' : 'Saved in this browser. Send it so the developers see it:', 12 * u, f.sent ? '#7CFC00' : '#ffe066', FONT_UI);
      const bw = Math.min(tw / 3 - 6 * u, 150 * u), by = Math.min(ty, y + h - 46 * u);
      this.button(c, tx, by, bw, 34 * u, '📨 SEND (GITHUB)', () => this.sendSuggestion(f), { size: 12 * u, color: 'rgba(30,140,60,0.92)' });
      this.button(c, tx + bw + 8 * u, by, bw, 34 * u, '📋 COPY', () => this.copySuggestion(f), { size: 12 * u });
      this.button(c, tx + 2 * (bw + 8 * u), by, bw, 34 * u, '🗑 DELETE', () => { FanChars.list = FanChars.list.filter(z => z !== f); FanChars.save(); this.charSel = 0; this.toast('Suggestion deleted', '#ffb066'); }, { size: 12 * u });
    }
  },
  rSuggestPitch(c, x, y, w, h) {
    const u = this.u();
    text(c, '💡', x + w / 2, y + h * 0.25, 70 * u, '#fff', 'center');
    text(c, 'SUGGEST A CHARACTER', x + w / 2, y + h * 0.45, Math.min(28 * u, w / 14), '#ffe066', 'center', '#000', 4 * u);
    wrapText(c, 'Who should captain the next team? Your auntie, the loudest conductor in Nairobi, a legendary Durban taxi driver? Give them a name, a country and a silly power.', x + 24 * u, y + h * 0.55, w - 48 * u, 14 * u, '#fff');
    this.button(c, x + w / 2 - 130 * u, y + h * 0.78, 260 * u, 50 * u, '✏️ START SUGGESTION', () => this.openSuggest(), { size: 18 * u, color: 'rgba(30,140,60,0.92)', sel: true });
  },

  // ---------------------------------------------------------------- the form (real HTML inputs, so typing works everywhere)
  openSuggest() {
    if (this.form) return;
    SFX.uiConfirm();
    injectFormCss();
    const looks = CAPTAINS.map(c => `<option value="${c.id}">${c.short} (${c.country})</option>`).join('');
    const kit = pick(['#e8433a', '#1eb53a', '#fcd116', '#4dabf7', '#ff7a00', '#b197fc', '#f783ac', '#20c997']);
    const el = document.createElement('div');
    el.id = 'suggest'; el.className = 'dom-ui';
    el.innerHTML = `
      <form autocomplete="off" novalidate>
        <h2>💡 Suggest a character</h2>
        <p class="sub">Invent a captain for the Monate Cup. Fields with * are needed.</p>
        <div class="grid">
          <label>Character name *<input name="name" maxlength="40" required placeholder="e.g. Mama Ngozi Kabaka"></label>
          <label>Country *<input name="country" maxlength="40" required list="sg-countries" placeholder="Start typing…"></label>
          <label>Nickname<input name="nick" maxlength="50" placeholder="e.g. Queen of the Corner Kick"></label>
          <label>Team name<input name="team" maxlength="40" placeholder="e.g. Kampala Kongolos FC"></label>
          <label class="wide">Personality / backstory<textarea name="bio" maxlength="300" rows="3" placeholder="What do they do when they're not playing? What makes them funny?"></textarea></label>
          <label class="wide">Signature power idea<textarea name="power" maxlength="200" rows="2" placeholder="e.g. Throws a pot of jollof that makes every defender stop to eat"></textarea></label>
          <label>Super strike name<input name="superName" maxlength="40" placeholder="e.g. MATATU MADNESS"></label>
          <label>Catchphrase<input name="quip" maxlength="40" placeholder="e.g. POA KABISA!"></label>
          <label>Looks a bit like<select name="look">${looks}</select></label>
          <label>Kit colour<input name="kit" type="color" value="${kit}"></label>
          <label>Skin tone<select name="skin">${SKINS.map((s, i) => `<option value="${s}">Tone ${i + 1}</option>`).join('')}</select></label>
          <label>Your name (optional)<input name="by" maxlength="40" placeholder="So we can credit you"></label>
        </div>
        <p class="err" hidden></p>
        <div class="row">
          <button type="button" data-act="cancel">Cancel</button>
          <button type="submit" class="go">Save suggestion</button>
          <button type="button" class="go2" data-act="send">Save &amp; send to developers</button>
        </div>
        <p class="note">Saved suggestions appear in the Characters gallery. "Send" opens a pre-filled GitHub issue (needs a free GitHub account); you can also copy the text instead.</p>
        <datalist id="sg-countries">${AFRICAN_COUNTRIES.map(n => `<option value="${n}">`).join('')}</datalist>
      </form>`;
    document.body.appendChild(el);
    this.form = el;
    const form = el.querySelector('form'), err = el.querySelector('.err');
    form.skin.value = SKINS[randi(0, SKINS.length - 1)];
    form.look.value = pick(CAPTAINS).id;
    setTimeout(() => form.name.focus(), 30);
    const collect = () => {
      const v = k => (form[k].value || '').trim();
      const f = { name: v('name'), country: v('country'), nick: v('nick'), team: v('team'), bio: v('bio'), power: v('power'), superName: v('superName').toUpperCase(),
        quip: v('quip').toUpperCase(), look: v('look'), kit: v('kit'), skin: v('skin'), by: v('by'), at: Date.now() };
      const miss = [!f.name && 'a name', !f.country && 'a country'].filter(Boolean);
      if (miss.length) { err.hidden = false; err.textContent = `Please add ${miss.join(' and ')}.`; (f.name ? form.country : form.name).focus(); return null; }
      return f;
    };
    const done = (send) => {
      const f = collect(); if (!f) return;
      FanChars.list.push(f); FanChars.save();
      this.closeSuggest();
      this.charSel = this.charItems().findIndex(it => it.f === f);
      this.toast(`💡 ${f.name} added to the gallery!`, '#7CFC00'); SFX.cheer(0.4);
      if (send) this.sendSuggestion(f);
    };
    form.addEventListener('submit', e => { e.preventDefault(); done(false); });
    form.addEventListener('input', () => { if (!err.hidden && form.name.value.trim() && form.country.value.trim()) err.hidden = true; });
    el.querySelector('[data-act=send]').addEventListener('click', () => done(true));
    el.querySelector('[data-act=cancel]').addEventListener('click', () => { this.closeSuggest(); SFX.uiBack(); });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); this.closeSuggest(); SFX.uiBack(); } });
    el.addEventListener('pointerdown', e => { if (e.target === el) { this.closeSuggest(); SFX.uiBack(); } });
  },
  closeSuggest() {
    if (!this.form) return;
    this.form.remove(); this.form = null;
    Keys.down.clear(); Keys.pressed.clear(); Mouse.clicked = false;
    const cv = document.getElementById('game'); if (cv) cv.focus();
  },
  sendSuggestion(f) {
    if (navigator.onLine === false) { // no signal: keep it, offer it again when the connection is back
      f.pending = true; FanChars.save();
      this.toast(`📴 No connection: ${f.name} is saved. We'll remind you to send it when you're back online.`, '#ffd43b');
      return;
    }
    delete f.pending;
    let w = null;
    try { w = window.open(FanChars.issueUrl(f), '_blank'); if (w) w.opener = null; } catch (e) { w = null; }
    f.sent = true; FanChars.save();
    this.toast(w === null ? '📨 Opening GitHub… (if nothing opened, use COPY)' : '📨 Opened GitHub: press "Submit new issue"', '#7CFC00');
  },
  copySuggestion(f) {
    const txt = `Character suggestion for Monate Cup\n\n${FanChars.issueText(f).replace(/\*\*/g, '')}`;
    const ok = () => this.toast('📋 Copied! Paste it anywhere to share.', '#7CFC00');
    try { navigator.clipboard.writeText(txt).then(ok, () => this.toast('Copy failed: try SEND instead', '#ffb066')); } catch (e) { this.toast('Copy failed: try SEND instead', '#ffb066'); }
  },
});

function measureW(c, str, size) { c.font = `700 ${Math.round(size)}px ${FONT_UI}`; return c.measureText(str).width; }

function injectFormCss() {
  if (document.getElementById('suggest-css')) return;
  const st = document.createElement('style'); st.id = 'suggest-css';
  st.textContent = `
  #suggest { position: fixed; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center; padding: 16px;
    background: rgba(5,6,20,0.78); touch-action: auto; user-select: text; -webkit-user-select: text; overflow-y: auto; box-sizing: border-box; }
  #suggest form { width: 100%; max-width: 760px; max-height: 100%; overflow-y: auto; box-sizing: border-box; padding: 20px 22px; border-radius: 16px;
    background: #10132e; border: 2px solid #ffe066; color: #fff; font: 700 15px Nunito, system-ui, sans-serif; box-shadow: 0 12px 40px rgba(0,0,0,0.5); }
  #suggest h2 { margin: 0; font: 32px 'Luckiest Guy', Nunito, sans-serif; color: #ffe066; letter-spacing: 1px; text-shadow: 2px 2px 0 #000; }
  #suggest .sub { margin: 4px 0 14px; color: #ddd; }
  #suggest .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
  #suggest label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #9cf; }
  #suggest label.wide { grid-column: 1 / -1; }
  #suggest input, #suggest textarea, #suggest select { font: 700 15px Nunito, system-ui, sans-serif; color: #fff; background: #1b2048; border: 2px solid rgba(255,255,255,0.25);
    border-radius: 10px; padding: 9px 11px; outline: none; resize: vertical; min-width: 0; }
  #suggest input[type=color] { padding: 2px; height: 42px; cursor: pointer; }
  #suggest input:focus, #suggest textarea:focus, #suggest select:focus { border-color: #ffe066; }
  #suggest .row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; margin-top: 16px; }
  #suggest button { font: 18px 'Luckiest Guy', Nunito, sans-serif; letter-spacing: 1px; padding: 11px 18px; border-radius: 12px; cursor: pointer;
    border: 2px solid rgba(255,255,255,0.5); background: #1b2048; color: #fff; }
  #suggest button.go { background: #2b8a3e; border-color: #51cf66; }
  #suggest button.go2 { background: #ff7a00; border-color: #ffe066; }
  #suggest button:hover, #suggest button:focus-visible { border-color: #ffe066; color: #ffe066; }
  #suggest .err { color: #ff8787; margin: 10px 0 0; }
  #suggest .note { color: #aaa; font-size: 12px; margin: 12px 0 0; }
  @media (max-width: 600px) { #suggest .grid { grid-template-columns: 1fr; } #suggest h2 { font-size: 26px; } #suggest .row button { flex: 1 1 100%; } }`;
  document.head.appendChild(st);
}
