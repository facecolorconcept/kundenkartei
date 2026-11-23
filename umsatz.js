// Modul „Umsatz“ (im Bereich Bericht, dritter Schalter neben Nachweis und Meine Auswertung).
// Rechnet mit dem Preis aus den Behandlungsbögen und den Anzahlungen aus dem Kalender.
// Ersetzt keine Buchhaltung (SumUp, Lexware), ist nur deine Übersicht. Alles ist anklickbar.
(function () {
  'use strict';
  const FCC = window.FCC = window.FCC || {};
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = d => d ? String(d).slice(0, 10).split('-').reverse().join('.') : '–';
  const name = e => `${e.vorname || ''} ${e.nachname || ''}`.trim() || '(ohne Namen)';
  const zahl = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[^\d,.-]/g, '').replace(',', '.')); return isFinite(n) ? n : null; };
  const eur = n => (n || 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €';
  const ym = d => d.toISOString().slice(0, 7);

  const st = { zr: 'jahr', sort: 'd', dir: -1, such: '', art: '' };
  const ZR = [['monat', 'Dieser Monat'], ['vormonat', 'Letzter Monat'], ['quartal', 'Dieses Quartal'], ['jahr', 'Dieses Jahr'], ['alles', 'Seit Beginn']];
  function zeitraum() {
    const h = new Date(), y = h.getFullYear(), m = h.getMonth();
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (st.zr === 'monat') return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))];
    if (st.zr === 'vormonat') return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
    if (st.zr === 'quartal') { const q = Math.floor(m / 3) * 3; return [iso(new Date(y, q, 1)), iso(new Date(y, q + 3, 0))]; }
    if (st.zr === 'jahr') return [`${y}-01-01`, `${y}-12-31`];
    return ['0000-01-01', '9999-12-31'];
  }

  FCC.umsatz = async (el, schalter) => {
    const anz = FCC.anzahlungenLaden ? await FCC.anzahlungenLaden() : {};
    const kund = Store.list(true).filter(e => !e.nurKontakt);
    const alle = [];
    kund.forEach(e => (e.b || []).forEach(b => alle.push({ e, b, d: b.d, a: b.a, p: zahl((b.r || {}).pr) })));
    const [von, bis] = zeitraum();
    const imZr = alle.filter(x => x.d >= von && x.d <= bis);
    const mitP = imZr.filter(x => x.p != null), ohneP = imZr.filter(x => x.p == null);
    const summe = mitP.reduce((a, x) => a + x.p, 0);
    const anzL = Object.entries(anz || {}).map(([id, a]) => ({ id, ...a }));
    const anzOffen = anzL.filter(a => !a.erhalten && a.betrag != null && String(a.start || '') >= new Date(Date.now() - 60 * 864e5).toISOString());
    // Monate: letzte 12
    const h = new Date(); const mon = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(h.getFullYear(), h.getMonth() - i, 15); mon.push({ k: ym(d), l: d.toLocaleDateString('de-DE', { month: 'short' }).replace('.', ''), lang: d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) }); }
    mon.forEach(m => { m.s = alle.filter(x => x.p != null && x.d.startsWith(m.k)).reduce((a, x) => a + x.p, 0); });
    const max = Math.max(1, ...mon.map(m => m.s));
    // je Behandlung
    const arts = [...new Set(mitP.map(x => x.a))].map(a => { const l = mitP.filter(x => x.a === a); const s = l.reduce((q, x) => q + x.p, 0); return { a, n: l.length, s, schnitt: s / l.length }; }).sort((a, b) => b.s - a.s);
    // Tabelle
    const q = st.such.toLowerCase().trim();
    let zeilen = imZr.filter(x => (!st.art || x.a === st.art) && (!q || (name(x.e) + ' ' + x.a).toLowerCase().includes(q)));
    const key = { d: x => x.d, n: x => name(x.e).toLowerCase(), a: x => x.a, p: x => x.p == null ? -1 : x.p };
    zeilen.sort((x, y) => { const a = key[st.sort](x), b = key[st.sort](y); return (a < b ? -1 : a > b ? 1 : 0) * st.dir; });
    const zrName = (ZR.find(z => z[0] === st.zr) || [])[1];
    const pfeil = k => st.sort === k ? (st.dir > 0 ? ' ↑' : ' ↓') : '';

    el.innerHTML = `
      ${schalter}
      <div class="hello"><div class="row" style="gap:8px"><h1>Umsatz</h1><button class="qhelp" data-hilfe="umsatz" aria-label="Hilfe zum Umsatz" title="Hilfe">?</button></div>
        <p>Deine Übersicht aus den Preisen in den Behandlungsbögen. Für die Buchhaltung bleiben SumUp und Lexware zuständig.</p></div>
      <div class="chips">${ZR.map(([k, l]) => `<button type="button" class="chip ${st.zr === k ? 'on' : ''}" data-uzr="${k}" aria-pressed="${st.zr === k}">${esc(l)}</button>`).join('')}</div>
      <div class="kpis">
        <button type="button" class="panel kpi tap" data-uzu="u-tab"><b>${eur(summe)}</b><span>Umsatz · ${esc(zrName)}</span></button>
        <button type="button" class="panel kpi tap" data-uzu="u-arten"><b>${mitP.length ? eur(summe / mitP.length) : '–'}</b><span>pro Behandlung im Schnitt</span></button>
        <button type="button" class="panel kpi tap" data-uohne="1" ${ohneP.length ? '' : 'disabled'}><b>${ohneP.length}</b><span>Behandlungen ohne Preis</span></button>
      </div>
      ${anzOffen.length ? `<div class="banner"><span><b>${anzOffen.length} ${anzOffen.length === 1 ? 'Anzahlung' : 'Anzahlungen'} offen</b> · ${esc(eur(anzOffen.reduce((a, x) => a + (x.betrag || 0), 0)))}: ${anzOffen.slice(0, 4).map(a => esc((a.titel || 'Termin') + ' am ' + fmt(String(a.start).slice(0, 10)))).join(', ')}${anzOffen.length > 4 ? ' …' : ''}</span><button class="btn ghost small" data-ukal="1">Im Kalender ansehen</button></div>` : ''}
      <div class="panel card">
        <div class="row between"><h2>Umsatz je Monat</h2><span class="label">letzte 12 Monate</span></div>
        <div class="bars u-bars" role="img" aria-label="${esc(mon.map(m => m.l + ': ' + eur(m.s)).join(', '))}">
          ${mon.map(m => `<button class="bar tap" data-umon="${m.k}" aria-label="${esc(m.lang)}: ${esc(eur(m.s))}"><em>${m.s ? esc(Math.round(m.s).toLocaleString('de-DE')) : '0'}</em><i style="height:${Math.round(m.s / max * 100)}%"></i><span>${esc(m.l)}</span></button>`).join('')}
        </div>
      </div>
      <div class="panel card" id="u-arten">
        <h2>Je Behandlung · ${esc(zrName)}</h2>
        ${arts.length ? `<table class="ktab l-tab" style="width:100%;margin-top:10px"><thead><tr><th>Behandlung</th><th>Anzahl</th><th>Umsatz</th><th>Schnitt</th></tr></thead>
          <tbody>${arts.map(x => `<tr data-uart="${esc(x.a)}" tabindex="0" style="cursor:pointer"><td>${esc(x.a)}</td><td>${x.n}</td><td>${esc(eur(x.s))}</td><td>${esc(eur(x.schnitt))}</td></tr>`).join('')}</tbody></table>`
          : '<p class="cmeta" style="margin-top:10px">Noch keine Preise. Trag im Behandlungsbogen oben bei „Preis in €“ den Betrag ein.</p>'}
      </div>
      <div class="panel card" id="u-tab">
        <div class="row between"><h2>Behandlungen · ${esc(zrName)}</h2>${st.art ? `<button class="btn ghost small" data-uart="">Filter ${esc(st.art)} aufheben</button>` : ''}</div>
        <input class="search" id="uSuch" type="search" placeholder="Name oder Behandlung" value="${esc(st.such)}" style="margin-top:10px">
        ${zeilen.length ? `<div style="overflow-x:auto"><table class="ktab l-tab" style="width:100%;margin-top:10px"><thead><tr>
          <th><button type="button" data-usort="d">Datum${pfeil('d')}</button></th><th><button type="button" data-usort="n">Kundin${pfeil('n')}</button></th><th><button type="button" data-usort="a">Behandlung${pfeil('a')}</button></th><th><button type="button" data-usort="p">Preis${pfeil('p')}</button></th></tr></thead>
          <tbody>${zeilen.map(x => `<tr data-ukid="${esc(x.e.id)}" tabindex="0" style="cursor:pointer"><td>${fmt(x.d)}</td><td>${esc(name(x.e))}</td><td>${esc(x.a)}</td><td>${x.p == null ? '<span class="cmeta">fehlt</span>' : esc(eur(x.p))}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="3"><b>Summe</b></td><td><b>${esc(eur(zeilen.reduce((a, x) => a + (x.p || 0), 0)))}</b></td></tr></tfoot></table></div>`
          : '<p class="cmeta" style="margin-top:10px">Keine Behandlungen in diesem Zeitraum.</p>'}
      </div>`;

    const $$ = s => el.querySelectorAll(s);
    const neu = () => FCC.umsatz(el, schalter);
    $$('[data-hilfe]').forEach(b => b.onclick = () => FCC.hilfe && FCC.hilfe(b.dataset.hilfe));
    $$('[data-uzr]').forEach(b => b.onclick = () => { st.zr = b.dataset.uzr; neu(); });
    $$('[data-uzu]').forEach(b => b.onclick = () => { const t = document.getElementById(b.dataset.uzu); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $$('[data-uohne]').forEach(b => b.onclick = () => FCC.openList && FCC.openList('Behandlungen ohne Preis · ' + zrName, e => (e.b || []).some(x => x.d >= von && x.d <= bis && zahl((x.r || {}).pr) == null), 'zuletzt'));
    $$('[data-umon]').forEach(b => b.onclick = () => { const m = mon.find(x => x.k === b.dataset.umon); FCC.openList && FCC.openList('Behandlungen im ' + (m ? m.lang : b.dataset.umon), e => (e.b || []).some(x => x.d.startsWith(b.dataset.umon)), 'zuletzt'); });
    $$('[data-uart]').forEach(b => { const go = () => { st.art = b.dataset.uart; neu().then(() => { const t = document.getElementById('u-tab'); if (t && st.art) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); }; b.onclick = go; b.onkeydown = ev => { if (ev.key === 'Enter') go(); }; });
    $$('[data-usort]').forEach(b => b.onclick = () => { const k = b.dataset.usort; if (st.sort === k) st.dir *= -1; else { st.sort = k; st.dir = k === 'd' || k === 'p' ? -1 : 1; } neu(); });
    $$('[data-ukid]').forEach(tr => { const go = () => FCC.openCustomer && FCC.openCustomer(tr.dataset.ukid); tr.onclick = go; tr.onkeydown = ev => { if (ev.key === 'Enter') go(); }; });
    $$('[data-ukal]').forEach(b => b.onclick = () => FCC.show('kalender'));
    const su = el.querySelector('#uSuch');
    if (su) su.oninput = () => { st.such = su.value; const pos = su.selectionStart; neu().then(() => { const n = el.querySelector('#uSuch'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }); };
  };

  const css = document.createElement('style');
  css.textContent = '.u-bars{grid-template-columns:repeat(12,minmax(0,1fr))}.u-bars .bar em{font-size:11px}';
  document.head.append(css);
})();
