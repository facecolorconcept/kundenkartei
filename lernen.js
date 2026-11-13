// Modul „Meine Auswertung“ (im Bereich Bericht): Was lerne ich aus meinen Behandlungen?
// Lerntagebuch, Ergebnis nach Einstellung, Dauer, Herkunft der Kundinnen, Wiederkommen, Bewertungen.
// Rechnet nur mit der Kurzliste (Index), lädt keine Akten nach. Alles ist anklickbar.
(function () {
  const FCC = window.FCC = window.FCC || {};
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = d => d ? d.split('-').reverse().join('.') : '–';
  const DAY = 864e5;
  const tage = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / DAY);
  const seit = d => d ? tage(d, new Date().toISOString().slice(0, 10)) : Infinity;
  const ARTS = ['PMU', 'Lash Lift', 'Brow Lift', 'Waxing'];
  const HERKUNFT = ['Instagram', 'Empfehlung', 'Google', 'Brauen-Reihe', 'Vorbeigekommen', 'Sonstiges'];
  const name = e => `${e.vorname || ''} ${e.nachname || ''}`.trim() || '(ohne Namen)';
  const teile = s => String(s || '').split(', ').filter(Boolean);
  const zahl = v => { const n = parseFloat(String(v || '').replace(',', '.')); return isFinite(n) ? n : null; };
  const schnitt = l => { const z = l.filter(x => x != null); return z.length ? Math.round(z.reduce((a, b) => a + b, 0) / z.length * 10) / 10 : null; };
  const de = n => n == null ? '–' : String(n).replace('.', ',');

  const st = { modus: 'nachweis', arts: [], alleNotizen: false, detail: null };
  FCC.lernenModus = () => st.modus === 'lernen';
  FCC.lernenSchalter = () => `<div class="seg l-seg" role="group" aria-label="Bericht oder Auswertung">
    <button type="button" data-lmod="nachweis" aria-pressed="${st.modus === 'nachweis'}">Nachweis</button>
    <button type="button" data-lmod="lernen" aria-pressed="${st.modus === 'lernen'}">Meine Auswertung</button></div>`;
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-lmod]');
    if (!b) return;
    st.modus = b.dataset.lmod; st.detail = null;
    if (FCC.bericht) FCC.bericht();
  });

  function daten() {
    const kund = (window.Store && Store.list ? Store.list() : []).filter(e => !e.nurKontakt);
    const rows = [];
    kund.forEach(e => (e.b || []).filter(b => b.d).forEach(b => rows.push({ e, b, r: b.r || {} })));
    rows.sort((x, y) => y.b.d.localeCompare(x.b.d));
    return { kund, rows };
  }

  // Einstellungen einer Behandlung in einer Zeile
  function einstellung(x) {
    const r = x.r, out = [];
    if (r.pad) out.push('Pad ' + r.pad);
    if (r.l1 || r.l2) out.push(`Lotion ${r.l1 || '–'} / ${r.l2 || '–'} min`);
    if (r.ws) out.push('Wimpern ' + r.ws);
    if (r.te) out.push(r.te);
    if (r.hb) out.push('Haut ' + r.hb);
    if (r.m) out.push(r.m + ' min');
    return out.join(' · ');
  }
  function ergebnis(x) {
    const r = x.r, out = [];
    if (r.er) out.push(r.er);
    if (r.au) out.push('Aufnahme ' + r.au);
    if (r.ab) out.push('abgeheilt ' + r.ab);
    if (r.re && r.re !== 'keine') out.push(r.re);
    if (x.b.z) out.push('zufrieden: ' + x.b.z);
    return out.join(' · ');
  }
  const zeile = x => `<li><button type="button" class="who" data-kid="${esc(x.e.id)}"><b>${esc(name(x.e))}</b>
    <span class="cmeta">${fmt(x.b.d)} · ${esc(x.b.a)}${einstellung(x) ? ' · ' + esc(einstellung(x)) : ''}${ergebnis(x) ? '<br>Ergebnis: ' + esc(ergebnis(x)) : ''}</span></button></li>`;

  function tagebuch(D) {
    let l = D.rows.filter(x => x.b.nx);
    const arts = ARTS.filter(a => l.some(x => x.b.a === a));
    if (st.arts.length) l = l.filter(x => st.arts.includes(x.b.a));
    const zeigen = st.alleNotizen ? l : l.slice(0, 5);
    const danach = x => D.rows.filter(y => y.e.id === x.e.id && y.b.a === x.b.a && y.b.d > x.b.d).sort((a, b) => a.b.d.localeCompare(b.b.d))[0];
    return `<div class="panel card" id="l-tagebuch">
      <div class="row between"><h2>Lerntagebuch</h2><span class="label">${l.length} ${l.length === 1 ? 'Notiz' : 'Notizen'}</span></div>
      <p class="cmeta" style="margin:4px 0 0">Alles, was du unter „Nächstes Mal anders“ notiert hast, und was beim Termin danach herauskam.</p>
      ${arts.length > 1 ? `<div class="chips">${arts.map(a => `<button type="button" class="chip${st.arts.includes(a) ? ' on' : ''}" data-lart="${esc(a)}" aria-pressed="${st.arts.includes(a)}">${esc(a)}</button>`).join('')}</div>` : ''}
      ${zeigen.length ? `<ul class="todo l-list">${zeigen.map(x => { const n = danach(x); return `<li><button type="button" class="who" data-kid="${esc(x.e.id)}">
        <span class="cmeta">${fmt(x.b.d)} · ${esc(x.b.a)} · ${esc(name(x.e))}</span><b>„${esc(x.b.nx)}“</b>
        <span class="cmeta">${n ? 'Danach am ' + fmt(n.b.d) + ': ' + esc(ergebnis(n) || 'kein Ergebnis eingetragen') : 'Noch kein Termin danach'}</span></button></li>`; }).join('')}</ul>
        ${l.length > 5 ? `<button type="button" class="btn ghost small" id="l-mehr" style="margin-top:10px">${st.alleNotizen ? 'Weniger zeigen' : 'Alle ' + l.length + ' zeigen'}</button>` : ''}`
        : '<p class="cmeta" style="margin-top:10px">Noch keine Notiz. Trag im Behandlungsbogen unter „Nächstes Mal anders“ ein, was du beim nächsten Termin ändern willst.</p>'}
    </div>`;
  }

  // Gruppiert Behandlungen nach den Werten eines Feldes (mehrere Werte je Behandlung möglich)
  function gruppen(rows, feld) {
    const m = new Map();
    rows.forEach(x => teile(x.r[feld]).forEach(v => { if (!m.has(v)) m.set(v, []); m.get(v).push(x); }));
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }
  const zaehle = (rows, feld) => gruppen(rows, feld).map(([v, l]) => `${l.length}× ${v}`).join(', ') || '–';

  function einstellungen(D) {
    const block = [];
    ['Lash Lift', 'Brow Lift'].forEach(art => {
      const g = gruppen(D.rows.filter(x => x.b.a === art), 'er');
      if (!g.length) return;
      block.push(`<h3 class="l-h3">${esc(art)}: Ergebnis und Einwirkzeit</h3>
        <div class="tscroll"><table class="ktab l-tab"><thead><tr><th>Ergebnis</th><th>Anzahl</th><th>Ø Lotion 1</th><th>Ø Lotion 2</th></tr></thead><tbody>
        ${g.map(([v, l]) => `<tr data-det="${esc(art)}|er|${esc(v)}" tabindex="0"><td><b>${esc(v)}</b></td><td class="num">${l.length}</td><td class="num">${de(schnitt(l.map(x => zahl(x.r.l1))))} min</td><td class="num">${de(schnitt(l.map(x => zahl(x.r.l2))))} min</td></tr>`).join('')}
        </tbody></table></div>`);
    });
    const pmu = D.rows.filter(x => x.b.a === 'PMU');
    const gh = gruppen(pmu, 'hb');
    if (gh.length) block.push(`<h3 class="l-h3">PMU: Hautbild und Pigment</h3>
      <div class="tscroll"><table class="ktab l-tab"><thead><tr><th>Hautbild</th><th>Anzahl</th><th>Pigmentaufnahme</th><th>Abgeheilt</th></tr></thead><tbody>
      ${gh.map(([v, l]) => `<tr data-det="PMU|hb|${esc(v)}" tabindex="0"><td><b>${esc(v)}</b></td><td class="num">${l.length}</td><td>${esc(zaehle(l, 'au'))}</td><td>${esc(zaehle(l, 'ab'))}</td></tr>`).join('')}
      </tbody></table></div>`);
    let det = '';
    if (st.detail) {
      const [art, feld, wert] = st.detail;
      const l = D.rows.filter(x => x.b.a === art && teile(x.r[feld]).includes(wert));
      det = `<div class="banner" id="l-det" style="display:block"><div class="row between"><b>${esc(art)}: ${esc(wert)} (${l.length})</b><button type="button" class="btn ghost small" id="l-detzu">Schließen</button></div>
        <ul class="todo l-list">${l.map(zeile).join('')}</ul></div>`;
    }
    return `<div class="panel card" id="l-einst">
      <h2>Ergebnis nach Einstellung</h2>
      <p class="cmeta" style="margin:4px 0 0">Tippe auf eine Zeile, um die Behandlungen dahinter zu sehen.</p>
      ${block.length ? block.join('') + det : '<p class="cmeta" style="margin-top:10px">Noch keine Ergebnisse. Trag im Behandlungsbogen unter „Ergebnis“ ein, wie es geworden ist.</p>'}
    </div>`;
  }

  function dauer(D) {
    const z = ARTS.map(a => { const l = D.rows.filter(x => x.b.a === a && zahl(x.r.m) != null); return { a, l }; }).filter(x => x.l.length);
    return `<div class="panel card" id="l-dauer">
      <h2>Dauer</h2>
      ${z.length ? `<div class="tscroll"><table class="ktab l-tab"><thead><tr><th>Behandlung</th><th>Erfasst</th><th>Ø Dauer</th><th>Zuletzt</th><th>Erste</th></tr></thead><tbody>
        ${z.map(({ a, l }) => `<tr><td><b>${esc(a)}</b></td><td class="num">${l.length}</td><td class="num">${de(schnitt(l.map(x => zahl(x.r.m))))} min</td><td class="num">${esc(l[0].r.m)} min</td><td class="num">${esc(l[l.length - 1].r.m)} min</td></tr>`).join('')}
        </tbody></table></div><p class="cmeta" style="margin:8px 0 0">Vergleiche „Zuletzt“ mit „Erste“: So siehst du, wie du schneller wirst.</p>`
        : '<p class="cmeta" style="margin-top:10px">Noch keine Dauer erfasst. Trag im Behandlungsbogen oben die Minuten ein.</p>'}
    </div>`;
  }

  function herkunft(D) {
    const akten = D.kund.filter(e => (e.b || []).length || e.erstellt);
    const z = HERKUNFT.map(h => ({ h, n: akten.filter(e => (e.hk || []).includes(h)).length }));
    const ohne = akten.filter(e => !(e.hk || []).length).length;
    const max = Math.max(1, ...z.map(x => x.n));
    return `<div class="panel card" id="l-herkunft">
      <div class="row between"><h2>Woher kommen die Kundinnen?</h2><span class="label">${akten.length - ohne} von ${akten.length} erfasst</span></div>
      <div class="b-hbars">${z.map(x => `<button type="button" class="b-hbar" data-hkf="${esc(x.h)}" ${x.n ? '' : 'disabled'}><span class="b-hl">${esc(x.h)}</span><span class="b-ht"><i style="width:${Math.round(x.n / max * 100)}%"></i></span><span class="b-hn">${x.n}</span></button>`).join('')}</div>
      ${ohne ? `<button type="button" class="btn ghost small" id="l-hkohne" style="margin-top:10px">${ohne} ohne Angabe zeigen</button>
        <p class="cmeta" style="margin:8px 0 0">Nachtragen: Akte öffnen, „Daten ändern“, bei „Wie hat sie dich gefunden?“ antippen.</p>` : ''}
    </div>`;
  }

  function wieder(D) {
    const z = ARTS.map(a => {
      const k = D.kund.map(e => ({ e, l: (e.b || []).filter(b => b.a === a && b.d).map(b => b.d).sort() })).filter(x => x.l.length);
      const w = k.filter(x => x.l.length > 1);
      const abst = []; w.forEach(x => x.l.slice(1).forEach((d, i) => abst.push(tage(x.l[i], d))));
      return { a, k: k.length, w: w.length, abst: schnitt(abst) };
    }).filter(x => x.k);
    const erst = D.kund.filter(e => (e.b || []).some(b => b.a === 'PMU' && teile(b.t).includes('Ersttermin')));
    const nach = erst.filter(e => { const d = e.b.filter(b => b.a === 'PMU' && teile(b.t).includes('Ersttermin')).map(b => b.d).sort()[0]; return e.b.some(b => b.a === 'PMU' && b.d > d); });
    return `<div class="panel card" id="l-wieder">
      <h2>Wer kommt wieder?</h2>
      ${z.length ? `<div class="tscroll"><table class="ktab l-tab"><thead><tr><th>Behandlung</th><th>Kundinnen</th><th>Kamen wieder</th><th>Ø Abstand</th></tr></thead><tbody>
        ${z.map(x => `<tr data-wf="${esc(x.a)}" tabindex="0"><td><b>${esc(x.a)}</b></td><td class="num">${x.k}</td><td class="num">${x.w} (${Math.round(x.w / x.k * 100)} %)</td><td class="num">${x.abst == null ? '–' : Math.round(x.abst) + ' Tage'}</td></tr>`).join('')}
        </tbody></table></div>
        ${erst.length ? `<p style="margin:10px 0 0">PMU-Nachbehandlung wahrgenommen: <b>${nach.length} von ${erst.length}</b> ${erst.length - nach.length ? `<button type="button" class="btn ghost small" id="l-nachoffen">${erst.length - nach.length} offen zeigen</button>` : ''}</p>` : ''}`
        : '<p class="cmeta" style="margin-top:10px">Noch keine Behandlung eingetragen.</p>'}
    </div>`;
  }

  const zufriedenOhneBitte = e => !(e.bw || {}).gebeten && (e.b || []).some(b => b.z === 'ja' && seit(b.d) <= 60);
  function bewertung(D) {
    const geb = D.kund.filter(e => (e.bw || {}).gebeten).length, erh = D.kund.filter(e => (e.bw || {}).erhalten).length;
    const offen = D.kund.filter(zufriedenOhneBitte);
    return `<div class="panel card" id="l-bew">
      <h2>Google-Bewertungen</h2>
      <div class="kpis" style="margin-top:12px">
        <button type="button" class="panel kpi tap" data-bwf="gebeten" ${geb ? '' : 'disabled'}><b>${geb}</b><span>gebeten</span></button>
        <button type="button" class="panel kpi tap" data-bwf="erhalten" ${erh ? '' : 'disabled'}><b>${erh}</b><span>erhalten</span></button>
        <button type="button" class="panel kpi tap" data-bwf="offen" ${offen.length ? '' : 'disabled'}><b>${offen.length}</b><span>zufrieden, noch nicht gebeten</span></button>
      </div>
      <p class="cmeta" style="margin:10px 0 0">Die Haken setzt du in der Akte oben bei „Google-Bewertung“. „Noch nicht gebeten“ zählt Kundinnen, die in den letzten 60 Tagen zufrieden waren.</p>
    </div>`;
  }

  FCC.lernen = el => {
    const D = daten();
    const notizen = D.rows.filter(x => x.b.nx).length;
    const mehrfach = D.kund.filter(e => (e.b || []).length > 1).length, mitB = D.kund.filter(e => (e.b || []).length).length;
    el.innerHTML = `
      ${FCC.lernenSchalter()}
      <div class="hello"><div class="row" style="gap:8px"><h1>Meine Auswertung</h1><button class="qhelp" data-hilfe="auswertung" aria-label="Hilfe zur Auswertung" title="Hilfe">?</button></div>
        <p>Was du aus deinen Behandlungen lernen kannst. Nur für dich, nicht für den Nachweis.</p></div>
      ${D.rows.length < 20 ? `<div class="banner" style="margin-top:0"><span>Bisher ${D.rows.length} ${D.rows.length === 1 ? 'Behandlung' : 'Behandlungen'}. Die Zahlen werden ab etwa 20 Behandlungen aussagekräftig, bis dahin zeigen sie nur eine Richtung.</span></div>` : ''}
      <div class="kpis">
        <button type="button" class="panel kpi tap" data-zu="l-tagebuch"><b>${notizen}</b><span>Lernnotizen</span></button>
        <button type="button" class="panel kpi tap" data-zu="l-wieder"><b>${mitB ? Math.round(mehrfach / mitB * 100) + ' %' : '–'}</b><span>kamen wieder</span></button>
        <button type="button" class="panel kpi tap" data-zu="l-bew"><b>${D.kund.filter(e => (e.bw || {}).erhalten).length}</b><span>Bewertungen erhalten</span></button>
      </div>
      ${tagebuch(D)}${einstellungen(D)}${dauer(D)}${herkunft(D)}${wieder(D)}${bewertung(D)}`;

    const $$ = s => el.querySelectorAll(s), $ = s => el.querySelector(s);
    const neu = () => FCC.lernen(el);
    const liste = (titel, test) => FCC.openList && FCC.openList(titel, test, 'zuletzt');
    $$('[data-hilfe]').forEach(b => b.onclick = () => FCC.hilfe && FCC.hilfe(b.dataset.hilfe));
    $$('[data-zu]').forEach(b => b.onclick = () => { const t = document.getElementById(b.dataset.zu); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $$('[data-kid]').forEach(b => b.onclick = () => FCC.openCustomer && FCC.openCustomer(b.dataset.kid));
    $$('[data-lart]').forEach(b => b.onclick = () => { const a = b.dataset.lart; const i = st.arts.indexOf(a); i >= 0 ? st.arts.splice(i, 1) : st.arts.push(a); neu(); });
    const mehr = $('#l-mehr'); if (mehr) mehr.onclick = () => { st.alleNotizen = !st.alleNotizen; neu(); };
    $$('tr[data-det]').forEach(tr => { const go = () => { st.detail = tr.dataset.det.split('|'); neu(); const d = document.getElementById('l-det'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }; tr.onclick = go; tr.onkeydown = ev => { if (ev.key === 'Enter') go(); }; });
    const zu = $('#l-detzu'); if (zu) zu.onclick = () => { st.detail = null; neu(); };
    $$('[data-hkf]').forEach(b => b.onclick = () => liste('Gefunden über ' + b.dataset.hkf, e => (e.hk || []).includes(b.dataset.hkf)));
    const ohne = $('#l-hkohne'); if (ohne) ohne.onclick = () => liste('Herkunft noch nicht erfasst', e => !e.nurKontakt && !(e.hk || []).length);
    $$('tr[data-wf]').forEach(tr => { const a = tr.dataset.wf; const go = () => liste(a + ': kamen wieder', e => (e.b || []).filter(b => b.a === a).length > 1); tr.onclick = go; tr.onkeydown = ev => { if (ev.key === 'Enter') go(); }; });
    const no = $('#l-nachoffen'); if (no) no.onclick = () => liste('PMU-Nachbehandlung noch offen', e => { const d = (e.b || []).filter(b => b.a === 'PMU' && teile(b.t).includes('Ersttermin')).map(b => b.d).sort()[0]; return !!d && !e.b.some(b => b.a === 'PMU' && b.d > d); });
    $$('[data-bwf]').forEach(b => b.onclick = () => { const k = b.dataset.bwf; if (k === 'offen') liste('Zufrieden, noch nicht um Bewertung gebeten', zufriedenOhneBitte); else liste('Bewertung ' + k, e => !!(e.bw || {})[k]); });
  };

  const css = document.createElement('style');
  css.textContent = `
    .l-seg{align-self:flex-start}
    .l-h3{font-family:var(--body);font-size:15px;font-weight:600;margin:18px 0 0}
    .l-tab tbody tr[data-det],.l-tab tbody tr[data-wf]{cursor:pointer}
    .l-tab th{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:500;padding:10px}
    .l-tab td{white-space:normal}
    .l-list .who b{font-weight:500;margin:2px 0}
    .l-list .who .cmeta{display:block}
    #l-herkunft .b-hbar{grid-template-columns:128px minmax(0,1fr) 32px}
    @media(max-width:600px){.l-tab{font-size:13.5px}.l-tab th{white-space:normal;padding:8px 5px;letter-spacing:0;font-size:10.5px;vertical-align:bottom}.l-tab td{padding:10px 5px}}`;
  document.head.append(css);
})();
