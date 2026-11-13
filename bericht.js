// Modul „Bericht“: Auswertung aller Kundinnen und Behandlungen in einem Zeitraum,
// z. B. als Nachweis für die Gründungsförderung. Alles ist anklickbar, das Ergebnis gibt es als PDF.
// Keine Gesundheitsdaten im Bericht: nur Datum, Kundin (wahlweise abgekürzt) und Leistung.
(function () {
  const C = window.FCC_CONFIG || {};
  const FCC = window.FCC = window.FCC || {};
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = d => d ? d.split('-').reverse().join('.') : '–';
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => iso(new Date());
  const ARTS = ['PMU', 'Lash Lift', 'Brow Lift', 'Waxing'];
  const monatLang = k => new Date(k + '-15T12:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const monatKurz = k => new Date(k + '-15T12:00').toLocaleDateString('de-DE', { month: 'short' }).replace('.', '') + ' ' + k.slice(2, 4);

  const LS = 'fcc_bericht';
  let gespeichert = {};
  try { gespeichert = JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) {}
  const st = {
    zr: 'alles', von: '', bis: '',
    arts: [],                                   // leer = alle Leistungen
    namen: gespeichert.namen === 'voll' ? 'voll' : 'kurz',
    aus: Array.isArray(gespeichert.aus) ? gespeichert.aus : [],   // ausgeblendete Kundinnen (z. B. Testeinträge)
    drive: gespeichert.drive !== false,
    sicht: 'behandlungen',                     // oder 'kundinnen'
    filter: null,                               // { typ: 'art'|'monat'|'neu'|'wieder', wert, text }
    sort: 'datum', dir: 1, auswahlOffen: false
  };
  const merken = () => { try { localStorage.setItem(LS, JSON.stringify({ namen: st.namen, aus: st.aus, drive: st.drive })); } catch (e) {} };

  const nameVoll = e => `${e.vorname || ''} ${e.nachname || ''}`.trim() || '(ohne Namen)';
  const nameKurz = e => {
    const v = (e.vorname || '').trim(), n = (e.nachname || '').trim();
    return v ? `${v}${n ? ' ' + n[0].toUpperCase() + '.' : ''}` : (n ? n[0].toUpperCase() + '.' : '(ohne Namen)');
  };
  const nameAnzeige = e => st.namen === 'voll' ? nameVoll(e) : nameKurz(e);

  // Zeiträume zum Antippen
  function zeitraum() {
    const d = new Date(), y = d.getFullYear(), m = d.getMonth();
    const q = Math.floor(m / 3) * 3;
    const R = {
      monat: [iso(new Date(y, m, 1)), today(), 'Dieser Monat'],
      vormonat: [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0)), 'Letzter Monat'],
      quartal: [iso(new Date(y, q, 1)), today(), 'Dieses Quartal'],
      jahr: [iso(new Date(y, 0, 1)), today(), 'Dieses Jahr'],
      vorjahr: [iso(new Date(y - 1, 0, 1)), iso(new Date(y - 1, 11, 31)), 'Letztes Jahr']
    };
    if (st.zr === 'eigen') return [st.von || '0000-01-01', st.bis || today(), 'Eigener Zeitraum'];
    if (R[st.zr]) return R[st.zr];
    return ['', today(), 'Seit Beginn'];
  }

  // Alle Behandlungen mit Kundin; „Erstbesuch“ = allererste Behandlung der Kundin überhaupt
  function daten() {
    const [von, bis] = zeitraum();
    const alle = (window.Store && Store.list ? Store.list(true) : []).filter(e => !e.nurKontakt && (e.b || []).length);
    const rows = [];
    let erstesDatum = '';
    alle.forEach(e => {
      const sortiert = [...e.b].filter(b => b.d).sort((a, b) => a.d.localeCompare(b.d));
      const erste = sortiert[0];
      sortiert.forEach(b => {
        if (!erstesDatum || b.d < erstesDatum) erstesDatum = b.d;
        if ((von && b.d < von) || b.d > bis) return;
        if (st.arts.length && !st.arts.includes(b.a)) return;
        rows.push({ d: b.d, a: b.a || '–', e, erst: b === erste, id: e.id + '|' + (b.id || b.d) });
      });
    });
    const sichtbar = rows.filter(r => !st.aus.includes(r.e.id));
    return { rows: sichtbar, alleImZeitraum: rows, von: von || erstesDatum, bis, erstesDatum };
  }

  function auswertung(rows) {
    const kund = new Map();
    rows.forEach(r => {
      const k = kund.get(r.e.id) || { e: r.e, n: 0, erst: false, folge: false, arts: new Set(), von: r.d, bis: r.d };
      k.n++; k.arts.add(r.a); if (r.erst) k.erst = true; else k.folge = true;
      if (r.d < k.von) k.von = r.d; if (r.d > k.bis) k.bis = r.d;
      kund.set(r.e.id, k);
    });
    const kundinnen = [...kund.values()];
    const arts = [...new Set([...ARTS, ...rows.map(r => r.a)])].map(a => ({
      a, n: rows.filter(r => r.a === a).length, k: new Set(rows.filter(r => r.a === a).map(r => r.e.id)).size
    })).filter(x => x.n || ARTS.includes(x.a));
    const monate = [];
    if (rows.length) {
      const ks = rows.map(r => r.d.slice(0, 7)).sort();
      let [y, m] = ks[0].split('-').map(Number); const [y2, m2] = ks[ks.length - 1].split('-').map(Number);
      while (y < y2 || (y === y2 && m <= m2)) {
        const k = `${y}-${String(m).padStart(2, '0')}`;
        const r = rows.filter(x => x.d.startsWith(k));
        monate.push({ k, n: r.length, neu: r.filter(x => x.erst).length, kund: new Set(r.map(x => x.e.id)).size });
        m++; if (m > 12) { m = 1; y++; }
      }
    }
    return {
      kundinnen, arts, monate,
      behandlungen: rows.length,
      neu: kundinnen.filter(k => k.erst).length,
      wieder: kundinnen.filter(k => k.folge).length
    };
  }

  // Schriftbreiten Helvetica und Helvetica-Bold (WinAnsi, Zeichen 32 bis 255)
  const WH = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,556,222,556,333,1000,556,556,333,1000,667,333,1000,556,611,556,556,222,222,333,333,350,556,1000,333,1000,500,333,944,556,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
  const WB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,611,278,556,500,1000,556,556,333,1000,667,333,1000,611,611,611,611,278,278,500,500,350,556,1000,333,1000,556,333,944,611,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];

  // ---------- Liste (gefiltert durch Antippen der Kennzahlen und Balken) ----------
  function gefiltert(rows, aw) {
    const f = st.filter;
    if (!f) return { rows, kund: aw.kundinnen };
    let r = rows, k = aw.kundinnen;
    if (f.typ === 'art') { r = rows.filter(x => x.a === f.wert); k = k.filter(x => x.arts.has(f.wert)); }
    if (f.typ === 'monat') { r = rows.filter(x => x.d.startsWith(f.wert)); const ids = new Set(r.map(x => x.e.id)); k = k.filter(x => ids.has(x.e.id)); }
    if (f.typ === 'neu') { const ids = new Set(k.filter(x => x.erst).map(x => x.e.id)); r = rows.filter(x => ids.has(x.e.id)); k = k.filter(x => x.erst); }
    if (f.typ === 'wieder') { const ids = new Set(k.filter(x => x.folge).map(x => x.e.id)); r = rows.filter(x => ids.has(x.e.id)); k = k.filter(x => x.folge); }
    return { rows: r, kund: k };
  }

  const SPB = [
    { k: 'datum', t: 'Datum', v: r => r.d },
    { k: 'name', t: 'Kundin', v: r => nameAnzeige(r.e) },
    { k: 'art', t: 'Leistung', v: r => r.a },
    { k: 'besuch', t: 'Besuch', v: r => r.erst ? 'Erstbesuch' : 'Folgetermin' }
  ];
  const SPK = [
    { k: 'name', t: 'Kundin', v: k => nameAnzeige(k.e) },
    { k: 'anzahl', t: 'Behandlungen', v: k => k.n, num: true },
    { k: 'arts', t: 'Leistungen', v: k => [...k.arts].join(', ') },
    { k: 'von', t: 'Erste', v: k => k.von },
    { k: 'bis', t: 'Letzte', v: k => k.bis },
    { k: 'neu', t: 'Neu', v: k => k.erst ? 'ja' : 'nein' }
  ];
  function sortiere(list, cols) {
    const c = cols.find(x => x.k === st.sort) || cols[0];
    return [...list].sort((a, b) => {
      const x = c.v(a), y = c.v(b);
      const r = c.num ? x - y : String(x).localeCompare(String(y), 'de');
      return (r || String(a.d || a.von || '').localeCompare(String(b.d || b.von || ''))) * st.dir;
    });
  }

  function render() {
    const el = document.getElementById('mod-bericht');
    if (!el || !window.Store) return;
    if (FCC.lernenModus && FCC.lernenModus()) { FCC.lernen(el); return; }
    const D = daten();
    const aw = auswertung(D.rows);
    const [, , zrName] = zeitraum();
    const G = gefiltert(D.rows, aw);
    const sicht = st.sicht;
    const cols = sicht === 'kundinnen' ? SPK : SPB;
    if (!cols.some(c => c.k === st.sort)) { st.sort = cols[0].k; st.dir = sicht === 'kundinnen' ? 1 : 1; }
    const liste = sortiere(sicht === 'kundinnen' ? G.kund : G.rows, cols);
    const maxArt = Math.max(1, ...aw.arts.map(x => x.n));
    const maxMon = Math.max(1, ...aw.monate.map(x => x.n));
    const imZr = [...new Map(D.alleImZeitraum.map(r => [r.e.id, r.e])).values()].sort((a, b) => nameVoll(a).localeCompare(nameVoll(b), 'de'));
    const ausgeblendet = imZr.filter(e => st.aus.includes(e.id)).length;
    const chip = (attr, wert, aktiv, text) => `<button type="button" class="chip${aktiv ? ' on' : ''}" ${attr}="${esc(wert)}" aria-pressed="${aktiv}">${esc(text)}</button>`;
    const ZR = [['alles', 'Seit Beginn'], ['monat', 'Dieser Monat'], ['vormonat', 'Letzter Monat'], ['quartal', 'Dieses Quartal'], ['jahr', 'Dieses Jahr'], ['vorjahr', 'Letztes Jahr'], ['eigen', 'Eigener Zeitraum']];
    const fText = st.filter ? st.filter.text : (sicht === 'kundinnen' ? 'Alle Kundinnen' : 'Alle Behandlungen');

    el.innerHTML = `
      ${FCC.lernenSchalter ? FCC.lernenSchalter() : ''}
      <div class="row between hello">
        <div><div class="row" style="gap:8px"><h1>Bericht</h1><button class="qhelp" data-hilfe="bericht" aria-label="Hilfe zum Bericht" title="Hilfe">?</button></div>
        <p>Kundinnen und Behandlungen auswerten, zum Beispiel als Nachweis für die Förderung.</p></div>
        <button class="btn" id="b-pdf" ${D.rows.length ? '' : 'disabled'}>PDF herunterladen</button>
      </div>

      <div class="panel card">
        <span class="label">Zeitraum</span>
        <div class="chips">${ZR.map(([k, t]) => chip('data-zr', k, st.zr === k, t)).join('')}</div>
        ${st.zr === 'eigen' ? `<div class="row" style="margin-top:12px;gap:12px;flex-wrap:wrap">
          <div class="field"><label for="b-von">Von</label><input type="date" id="b-von" value="${esc(st.von)}"></div>
          <div class="field"><label for="b-bis">Bis</label><input type="date" id="b-bis" value="${esc(st.bis || today())}"></div></div>` : ''}
        <p class="cmeta" style="margin-top:10px">${esc(zrName)}: ${D.rows.length || D.von ? `${esc(fmt(D.von))} bis ${esc(fmt(D.bis))}` : 'noch keine Behandlungen'}</p>
        <span class="label" style="display:block;margin-top:14px">Leistungen</span>
        <div class="chips">${chip('data-artall', '1', !st.arts.length, 'Alle')}${ARTS.map(a => chip('data-art', a, st.arts.includes(a), a)).join('')}</div>
        <span class="label" style="display:block;margin-top:14px">Namen im Bericht</span>
        <div class="chips">${chip('data-namen', 'kurz', st.namen === 'kurz', 'Abgekürzt (Sophia B.)')}${chip('data-namen', 'voll', st.namen === 'voll', 'Vollständig')}</div>
        <div class="row between" style="margin-top:14px;flex-wrap:wrap;gap:8px">
          <span class="cmeta">${ausgeblendet ? `${ausgeblendet} ${ausgeblendet === 1 ? 'Kundin' : 'Kundinnen'} ausgeblendet` : 'Alle Kundinnen sind im Bericht'}</span>
          <button type="button" class="btn ghost small" id="b-auswahl" aria-expanded="${st.auswahlOffen}">${st.auswahlOffen ? 'Auswahl schließen' : 'Kundinnen ein- oder ausblenden'}</button>
        </div>
        ${st.auswahlOffen ? `<p class="cmeta" style="margin-top:8px">Nimm das Häkchen weg bei Testeinträgen oder bei dir selbst. Die Auswahl bleibt gespeichert.</p>
          <div class="b-aus">${imZr.length ? imZr.map(e => `<label class="b-aus-k"><input type="checkbox" data-aus="${esc(e.id)}" ${st.aus.includes(e.id) ? '' : 'checked'}> ${esc(nameVoll(e))}${e.archiv ? ' <span class="tag">archiviert</span>' : ''}</label>`).join('') : '<span class="cmeta">Keine Kundin in diesem Zeitraum.</span>'}</div>` : ''}
      </div>

      <div class="kpis b-kpis">
        <button class="panel kpi tap" data-f="kundinnen"><b>${aw.kundinnen.length}</b><span>Kundinnen</span></button>
        <button class="panel kpi tap" data-f="alle"><b>${aw.behandlungen}</b><span>Behandlungen</span></button>
        <button class="panel kpi tap" data-f="neu"><b>${aw.neu}</b><span>Neukundinnen</span></button>
        <button class="panel kpi tap" data-f="wieder"><b>${aw.wieder}</b><span>kamen wieder</span></button>
      </div>

      <div class="dgrid">
        <div class="panel card">
          <div class="row between"><h2>Je Leistung</h2><span class="label">Behandlungen · Kundinnen</span></div>
          <div class="b-hbars">${aw.arts.map(x => `<button class="b-hbar" data-f="art:${esc(x.a)}" ${x.n ? '' : 'disabled'} aria-label="${esc(x.a)}: ${x.n} Behandlungen, ${x.k} Kundinnen">
            <span class="b-hl">${esc(x.a)}</span><span class="b-ht"><i style="width:${Math.round(x.n / maxArt * 100)}%"></i></span><span class="b-hn">${x.n} · ${x.k}</span></button>`).join('')}</div>
        </div>
        <div class="panel card">
          <div class="row between"><h2>Je Monat</h2><span class="label">Behandlungen</span></div>
          ${aw.monate.length ? `<div class="bars b-bars" style="grid-template-columns:repeat(${Math.min(aw.monate.length, 12)},minmax(0,1fr))" role="img" aria-label="${esc(aw.monate.map(m => monatLang(m.k) + ': ' + m.n).join(', '))}">
            ${aw.monate.slice(-12).map(m => `<button class="bar tap" data-f="monat:${m.k}" aria-label="${esc(monatLang(m.k))}: ${m.n} Behandlungen"><em>${m.n}</em><i style="height:${Math.round(m.n / maxMon * 100)}%"></i><span>${esc(monatKurz(m.k))}</span></button>`).join('')}
          </div>${aw.monate.length > 12 ? '<p class="cmeta">Hier die letzten 12 Monate, im PDF stehen alle.</p>' : ''}` : '<p class="cmeta" style="margin-top:10px">Keine Behandlungen in diesem Zeitraum.</p>'}
        </div>
      </div>

      <div class="panel card">
        <div class="row between" style="flex-wrap:wrap;gap:8px">
          <div><h2>${esc(fText)}</h2><span class="label">${liste.length} ${sicht === 'kundinnen' ? (liste.length === 1 ? 'Kundin' : 'Kundinnen') : (liste.length === 1 ? 'Behandlung' : 'Behandlungen')}</span></div>
          <div class="row" style="gap:8px;flex-wrap:wrap">
            ${st.filter ? '<button class="btn ghost small" id="b-reset">Filter aufheben</button>' : ''}
            <div class="seg" role="group" aria-label="Liste zeigen"><button type="button" data-sicht="behandlungen" aria-pressed="${sicht === 'behandlungen'}">Behandlungen</button><button type="button" data-sicht="kundinnen" aria-pressed="${sicht === 'kundinnen'}">Kundinnen</button></div>
            <button class="btn ghost small" id="b-csv" ${liste.length ? '' : 'disabled'}>CSV</button>
          </div>
        </div>
        <div class="tscroll"><table class="ktab">
          <thead><tr>${cols.map(c => `<th aria-sort="${st.sort === c.k ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button data-sort="${c.k}">${esc(c.t)}${st.sort === c.k ? (st.dir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`).join('')}</tr></thead>
          <tbody>${liste.length ? liste.map(x => sicht === 'kundinnen'
            ? `<tr data-id="${esc(x.e.id)}" tabindex="0"><td><b>${esc(nameAnzeige(x.e))}</b></td><td class="num">${x.n}</td><td>${esc([...x.arts].join(', '))}</td><td class="num">${esc(fmt(x.von))}</td><td class="num">${esc(fmt(x.bis))}</td><td>${x.erst ? '<span class="pill ok">neu</span>' : ''}</td></tr>`
            : `<tr data-id="${esc(x.e.id)}" tabindex="0"><td class="num">${esc(fmt(x.d))}</td><td><b>${esc(nameAnzeige(x.e))}</b></td><td>${esc(x.a)}</td><td>${x.erst ? '<span class="pill ok">Erstbesuch</span>' : 'Folgetermin'}</td></tr>`).join('')
            : `<tr><td colspan="${cols.length}" class="empty">Keine Einträge.</td></tr>`}</tbody>
        </table></div>
      </div>

      <div class="panel card">
        <h2>PDF</h2>
        <p class="cmeta" style="margin-top:6px">Das PDF enthält Zeitraum, Kennzahlen, die Aufteilung nach Leistung und Monat, die Liste aller Behandlungen und eine Zeile für deine Unterschrift. Gesundheitsdaten, Telefonnummern und Fotos stehen nie darin. Filter aus dem Antippen gelten nur für die Liste hier, nicht für das PDF.</p>
        ${Store.mode === 'drive' ? `<label class="row" style="gap:8px;margin-top:10px"><input type="checkbox" id="b-drive" ${st.drive ? 'checked' : ''}> Kopie in Google Drive ablegen (Ordner Administration › Berichte)</label>` : ''}
        <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap"><button class="btn" id="b-pdf2" ${D.rows.length ? '' : 'disabled'}>PDF herunterladen</button>${navigator.canShare ? `<button class="btn ghost" id="b-share" ${D.rows.length ? '' : 'disabled'}>PDF teilen (Mail, WhatsApp …)</button>` : ''}</div>
        <p class="cmeta" style="margin-top:8px">Heruntergeladen findest du das PDF auf dem iPhone in der App <b>Dateien › Downloads</b>, am Computer im Ordner <b>Downloads</b>.${Store.mode === 'drive' ? ' Mit Häkchen oben liegt zusätzlich eine Kopie in Google Drive.' : ''}</p>
      </div>`;

    // ---- Bedienung ----
    const $$ = s => el.querySelectorAll(s);
    $$('[data-zr]').forEach(b => b.onclick = () => { st.zr = b.dataset.zr; st.filter = null; render(); });
    const von = el.querySelector('#b-von'), bis = el.querySelector('#b-bis');
    if (von) von.onchange = () => { st.von = von.value; st.filter = null; render(); };
    if (bis) bis.onchange = () => { st.bis = bis.value; st.filter = null; render(); };
    $$('[data-art]').forEach(b => b.onclick = () => { const a = b.dataset.art; st.arts = st.arts.includes(a) ? st.arts.filter(x => x !== a) : [...st.arts, a]; st.filter = null; render(); });
    $$('[data-artall]').forEach(b => b.onclick = () => { st.arts = []; st.filter = null; render(); });
    $$('[data-namen]').forEach(b => b.onclick = () => { st.namen = b.dataset.namen; merken(); render(); });
    el.querySelector('#b-auswahl').onclick = () => { st.auswahlOffen = !st.auswahlOffen; render(); };
    $$('[data-aus]').forEach(c => c.onchange = () => { const id = c.dataset.aus; st.aus = c.checked ? st.aus.filter(x => x !== id) : [...new Set([...st.aus, id])]; merken(); render(); });
    $$('[data-f]').forEach(b => b.onclick = () => {
      const f = b.dataset.f;
      if (f === 'kundinnen') { st.filter = null; st.sicht = 'kundinnen'; }
      else if (f === 'alle') { st.filter = null; st.sicht = 'behandlungen'; }
      else if (f === 'neu') { st.filter = { typ: 'neu', text: 'Neukundinnen' }; st.sicht = 'kundinnen'; }
      else if (f === 'wieder') { st.filter = { typ: 'wieder', text: 'Kundinnen, die wiederkamen' }; st.sicht = 'kundinnen'; }
      else if (f.startsWith('art:')) { const a = f.slice(4); st.filter = { typ: 'art', wert: a, text: a }; st.sicht = 'behandlungen'; }
      else if (f.startsWith('monat:')) { const m = f.slice(6); st.filter = { typ: 'monat', wert: m, text: 'Behandlungen im ' + monatLang(m) }; st.sicht = 'behandlungen'; }
      render();
      const t = el.querySelector('.ktab'); if (t) t.closest('.panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const rs = el.querySelector('#b-reset'); if (rs) rs.onclick = () => { st.filter = null; render(); };
    $$('[data-sicht]').forEach(b => b.onclick = () => { st.sicht = b.dataset.sicht; render(); });
    $$('[data-sort]').forEach(b => b.onclick = () => { const k = b.dataset.sort; if (st.sort === k) st.dir *= -1; else { st.sort = k; st.dir = 1; } render(); });
    $$('tbody tr[data-id]').forEach(tr => {
      const go = () => FCC.openCustomer && FCC.openCustomer(tr.dataset.id);
      tr.onclick = go; tr.onkeydown = ev => { if (ev.key === 'Enter') go(); };
    });
    $$('[data-hilfe]').forEach(b => b.onclick = () => FCC.hilfe && FCC.hilfe(b.dataset.hilfe));
    const dr = el.querySelector('#b-drive'); if (dr) dr.onchange = () => { st.drive = dr.checked; merken(); };
    el.querySelector('#b-csv').onclick = () => csv(liste, cols, sicht);
    el.querySelector('#b-pdf').onclick = el.querySelector('#b-pdf2').onclick = () => pdfErstellen(D, aw, false);
    const sh = el.querySelector('#b-share'); if (sh) sh.onclick = () => pdfErstellen(D, aw, true);
  }

  // ---------- CSV (nur die Spalten der Liste, mit Formelschutz) ----------
  function csv(liste, cols, sicht) {
    const cell = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const val = (c, x) => { const v = c.v(x); return ['datum', 'von', 'bis'].includes(c.k) ? fmt(v) : v; };
    const lines = [cols.map(c => cell(c.t)).join(';')].concat(liste.map(x => cols.map(c => cell(val(c, x))).join(';')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `bericht_${sicht}_${today()}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- PDF mit echter Schrift (Helvetica), ohne fremde Bibliothek ----------
  // Zeichen in WinAnsi umwandeln (deckt ä, ö, ü, ß, €, „“, –, … ab)
  const W1252 = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';
  const code = ch => {
    const c = ch.charCodeAt(0);
    if (c >= 32 && c < 127) return c;
    if (c >= 160 && c <= 255) return c;
    const i = W1252.indexOf(ch); if (i >= 0) return 128 + i;
    if (ch === ' ' || ch === ' ') return 32;
    return 63; // ?
  };
  const breite = (s, size, fett) => { const W = fett ? WB : WH; let n = 0; for (const ch of String(s)) { const c = code(ch); n += W[c - 32] || 556; } return n * size / 1000; };
  const kuerze = (s, max, size, fett) => { s = String(s); if (breite(s, size, fett) <= max) return s; while (s.length > 1 && breite(s + '…', size, fett) > max) s = s.slice(0, -1); return s + '…'; };
  const hex = s => '<' + [...String(s)].map(ch => code(ch).toString(16).padStart(2, '0')).join('') + '>';
  const ROSE = '0.663 0.447 0.369', INK = '0.17 0.13 0.11', GRAU = '0.45 0.42 0.40', LINIE = '0.86 0.82 0.80', ZART = '0.945 0.894 0.871';

  function pdfBauen(D, aw) {
    const PW = 595.28, PH = 841.89, L = 50, R = PW - 50, OBEN = PH - 56, UNTEN = 64;
    const seiten = []; let s = null; let y = 0;
    const neueSeite = () => { s = []; seiten.push(s); y = OBEN; };
    const txt = (x, yy, t, size, fett, farbe, rechts) => {
      const xx = rechts ? x - breite(t, size, fett) : x;
      s.push(`BT /${fett ? 'F2' : 'F1'} ${size} Tf ${farbe || INK} rg ${xx.toFixed(2)} ${yy.toFixed(2)} Td ${hex(t)} Tj ET`);
    };
    const linie = (x1, y1, x2, y2, farbe, w) => s.push(`${farbe || LINIE} RG ${w || 0.6} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
    const flaeche = (x, yy, w, h, farbe) => s.push(`${farbe} rg ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    const platz = h => { if (y - h < UNTEN) { neueSeite(); return true; } return false; };
    const absatz = (t, size, fett, farbe, abstand) => {
      // einfacher Zeilenumbruch nach Wörtern
      const worte = String(t).split(' '); let zeile = '';
      const zeilen = [];
      worte.forEach(w => { const z = zeile ? zeile + ' ' + w : w; if (breite(z, size, fett) > R - L && zeile) { zeilen.push(zeile); zeile = w; } else zeile = z; });
      if (zeile) zeilen.push(zeile);
      zeilen.forEach(z => { platz(size * 1.45); y -= size * 1.45; txt(L, y, z, size, fett, farbe); });
      y -= abstand || 0;
    };
    const ueberschrift = t => { platz(40); y -= 26; txt(L, y, t, 13, true, ROSE); y -= 8; };
    // Tabelle: spalten = [{t, w, rechts}], zeilen = [[...]]
    const tabelle = (spalten, zeilen) => {
      const kopf = () => {
        platz(24); y -= 18; flaeche(L, y - 6, R - L, 20, ZART);
        let x = L + 6; spalten.forEach(c => { txt(c.rechts ? x + c.w - 12 : x, y, c.t, 8.5, true, GRAU, c.rechts); x += c.w; });
        y -= 8;
      };
      kopf();
      zeilen.forEach(z => {
        if (platz(17)) kopf();
        y -= 15; let x = L + 6;
        spalten.forEach((c, i) => { const t = kuerze(z[i], c.w - 14, 9.5, c.fett); txt(c.rechts ? x + c.w - 12 : x, y, t, 9.5, !!c.fett, INK, c.rechts); x += c.w; });
        linie(L, y - 5, R, y - 5);
      });
    };

    neueSeite();
    const [, , zrName] = zeitraum();
    // Kopf
    txt(L, y, C.STUDIO || 'Facecolorconcept', 10, true, ROSE); txt(R, y, 'Erstellt am ' + fmt(today()), 9, false, GRAU, true);
    y -= 34; txt(L, y, 'Nachweis über Kundinnen und Behandlungen', 20, true, INK);
    y -= 22; txt(L, y, `${zrName}: ${fmt(D.von)} bis ${fmt(D.bis)}`, 11, false, GRAU);
    y -= 26;
    const angaben = [
      ['Unternehmen', C.STUDIO || 'Facecolorconcept'],
      ['Inhaberin', C.INHABERIN_NAME || C.INHABERIN || ''],
      ['Anschrift', C.ADRESSE || ''],
      ['Leistungen', st.arts.length ? st.arts.join(', ') : 'alle (Permanent Make-up, Lash Lift, Brow Lift, Waxing)']
    ].filter(a => a[1]);
    angaben.forEach(([k, v]) => { txt(L, y, k, 9.5, true, GRAU); txt(L + 90, y, kuerze(v, R - L - 90, 9.5), 9.5, false, INK); y -= 15; });

    // Kennzahlen
    y -= 14; const kw = (R - L) / 4;
    flaeche(L, y - 52, R - L, 58, ZART);
    [[aw.kundinnen.length, 'Kundinnen'], [aw.behandlungen, 'Behandlungen'], [aw.neu, 'Neukundinnen'], [aw.wieder, 'kamen wieder']].forEach(([n, t], i) => {
      txt(L + 14 + i * kw, y - 26, String(n), 22, true, ROSE); txt(L + 14 + i * kw, y - 42, t, 9, false, GRAU);
    });
    y -= 60;
    absatz('Neukundin: erste Behandlung bei Facecolorconcept im Zeitraum. Kam wieder: mindestens ein Folgetermin im Zeitraum.', 8.5, false, GRAU, 0);

    ueberschrift('Behandlungen je Leistung');
    tabelle([{ t: 'Leistung', w: 250, fett: true }, { t: 'Behandlungen', w: 120, rechts: true }, { t: 'Kundinnen', w: R - L - 370, rechts: true }],
      aw.arts.filter(x => x.n).map(x => [x.a, String(x.n), String(x.k)]).concat([['Gesamt', String(aw.behandlungen), String(aw.kundinnen.length)]]));

    ueberschrift('Behandlungen je Monat');
    tabelle([{ t: 'Monat', w: 190, fett: true }, { t: 'Behandlungen', w: 105, rechts: true }, { t: 'Kundinnen', w: 100, rechts: true }, { t: 'davon neu', w: R - L - 395, rechts: true }],
      aw.monate.map(m => [monatLang(m.k), String(m.n), String(m.kund), String(m.neu)]));

    ueberschrift('Alle Behandlungen im Zeitraum');
    const liste = [...D.rows].sort((a, b) => a.d.localeCompare(b.d) || nameVoll(a.e).localeCompare(nameVoll(b.e), 'de'));
    tabelle([{ t: 'Nr.', w: 40, rechts: true }, { t: 'Datum', w: 80 }, { t: 'Kundin', w: 175, fett: true }, { t: 'Leistung', w: 110 }, { t: 'Besuch', w: R - L - 405 }],
      liste.map((r, i) => [String(i + 1), fmt(r.d), nameAnzeige(r.e), r.a, r.erst ? 'Erstbesuch' : 'Folgetermin']));

    // Hinweise und Unterschrift
    y -= 10;
    if (y - 170 < UNTEN) neueSeite();   // Hinweis, Bestätigung und Unterschrift bleiben zusammen
    absatz('Quelle: digitale Kundenkartei von ' + (C.STUDIO || 'Facecolorconcept') + '. Der Bericht enthält keine Gesundheitsdaten.' +
      (st.namen === 'kurz' ? ' Die Namen sind aus Datenschutzgründen abgekürzt. Die vollständigen Unterlagen liegen im Studio vor.' : ''), 8.5, false, GRAU, 6);
    y -= 18; absatz('Ich bestätige, dass die Angaben in diesem Bericht vollständig und richtig sind.', 10, false, INK, 0);
    y -= 50;
    linie(L, y, L + 200, y, INK, 0.7); linie(R - 220, y, R, y, INK, 0.7);
    txt(L, y - 13, 'Ort, Datum', 8.5, false, GRAU); txt(R - 220, y - 13, 'Unterschrift' + (C.INHABERIN_NAME ? ', ' + C.INHABERIN_NAME : ''), 8.5, false, GRAU);

    // Fußzeile mit Seitenzahl
    seiten.forEach((p, i) => {
      s = p;
      linie(L, 44, R, 44);
      txt(L, 32, `${C.STUDIO || 'Facecolorconcept'} · Nachweis Kundinnen und Behandlungen · ${fmt(D.von)} bis ${fmt(D.bis)}`, 7.5, false, GRAU);
      txt(R, 32, `Seite ${i + 1} von ${seiten.length}`, 7.5, false, GRAU, true);
    });

    // PDF-Datei zusammensetzen
    const teile = []; const offs = []; let len = 0;
    const push = t => { teile.push(t); len += t.length; };  // nur ASCII, Länge = Bytes
    const obj = (id, t) => { offs[id] = len; push(`${id} 0 obj\n${t}\nendobj\n`); };
    push('%PDF-1.4\n');
    const n = seiten.length;
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Count ${n} /Kids [${seiten.map((_, i) => (5 + i * 2) + ' 0 R').join(' ')}] >>`);
    obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    seiten.forEach((p, i) => {
      const id = 5 + i * 2; const inhalt = p.join('\n');
      obj(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id + 1} 0 R >>`);
      obj(id + 1, `<< /Length ${inhalt.length} >>\nstream\n${inhalt}\nendstream`);
    });
    const info = 5 + n * 2;
    obj(info, `<< /Title ${hex('Nachweis Kundinnen und Behandlungen ' + fmt(D.von) + ' bis ' + fmt(D.bis))} /Author ${hex(C.STUDIO || 'Facecolorconcept')} /Producer (Facecolorconcept Kartei) >>`);
    const xref = len;
    let x = `xref\n0 ${info + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= info; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
    push(x + `trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(teile, { type: 'application/pdf' });
  }

  async function pdfErstellen(D, aw, teilen) {
    const toast = (m, err) => FCC.toast ? FCC.toast(m, err) : null;
    let blob;
    try { blob = pdfBauen(D, aw); } catch (e) { toast('PDF konnte nicht erstellt werden: ' + e.message, true); return; }
    const name = `Nachweis_Kundinnen_${D.von}_bis_${D.bis}.pdf`;
    const file = new File([blob], name, { type: 'application/pdf' });
    // Erst herunterladen bzw. teilen (das iPhone erlaubt Teilen nur direkt nach dem Tippen), dann in Drive ablegen
    let geteilt = false;
    if (teilen) try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); geteilt = true; }
    } catch (e) { if (e && e.name === 'AbortError') geteilt = true; }
    if (!geteilt) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name;
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    }
    if (Store.mode === 'drive' && st.drive && Store.folder && Store.upload && Store.rootId) {
      try {
        const admin = await Store.folder('Administration', Store.rootId);
        const ordner = await Store.folder('Berichte', admin);
        await Store.upload({ name, parent: ordner, mime: 'application/pdf', data: blob });
        toast(geteilt ? 'PDF geteilt, Kopie in Drive unter Administration › Berichte' : 'PDF heruntergeladen (iPhone: Dateien › Downloads), Kopie in Drive unter Administration › Berichte');
      } catch (e) { toast('PDF erstellt, aber nicht in Drive abgelegt: ' + e.message, true); }
    } else toast(geteilt ? 'PDF geteilt' : 'PDF heruntergeladen (iPhone: Dateien › Downloads)');
  }

  FCC.bericht = render;
  const css = document.createElement('style');
  css.textContent = `
    .b-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}
    @media(max-width:620px){.b-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
    .b-hbars{display:flex;flex-direction:column;gap:6px;margin-top:12px}
    .b-hbar{display:grid;grid-template-columns:90px minmax(0,1fr) 64px;align-items:center;gap:10px;border:0;background:none;padding:6px 4px;border-radius:8px;font:inherit;color:inherit;cursor:pointer;text-align:left}
    .b-hbar:hover:not(:disabled){background:var(--rose-soft)}
    .b-hbar:disabled{cursor:default;opacity:.55}
    .b-hl{font-size:14px}.b-hn{font-size:13px;color:var(--muted);text-align:right;font-variant-numeric:tabular-nums}
    .b-ht{height:12px;background:var(--line);border-radius:99px;overflow:hidden}.b-ht i{display:block;height:100%;background:var(--rose);border-radius:99px;min-width:3px}
    .b-bars{height:150px}
    .b-aus{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px 14px;margin-top:10px;max-height:320px;overflow:auto}
    .b-aus-k{display:flex;align-items:center;gap:8px;min-height:36px;font-size:14.5px}
    .b-aus-k input,#b-drive{width:20px;height:20px;accent-color:var(--rose)}`;
  document.head.append(css);

  FCC.register && FCC.register({ id: 'bericht', titel: 'Bericht', el: 'mod-bericht', order: 8, render,
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 17v-3M13 17v-5M16 17v-2"/></svg>' });
})();
