// Modul „Übersicht“: die wichtigsten Informationen über die Kundinnen auf einen Blick.
(function () {
  const C = window.FCC_CONFIG || {};
  const FCC = window.FCC = window.FCC || {};
  const DAY = 864e5;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = d => d ? new Date(d + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
  const days = d => Math.floor((Date.now() - new Date(d + 'T12:00').getTime()) / DAY);
  const ago = n => n < 14 ? `${n} ${n === 1 ? 'Tag' : 'Tagen'}` : n < 70 ? `${Math.round(n / 7)} Wochen` : `${Math.round(n / 30)} Monaten`;
  const ym = d => d.toISOString().slice(0, 7);
  const name = e => `${e.vorname || ''} ${e.nachname || ''}`.trim() || '(ohne Namen)';
  const waNumber = t => { let d = String(t || '').replace(/[^0-9+]/g, ''); if (d.startsWith('+')) return d.slice(1); if (d.startsWith('00')) return d.slice(2); if (d.startsWith('0')) return '49' + d.slice(1); return d; };
  const lastOf = (e, art) => (e.b || []).filter(x => x.a === art).sort((a, b) => b.d.localeCompare(a.d))[0];

  let showAll = false;

  // Was jetzt zu tun ist: fällige Nachbehandlungen, Erinnerungen, fehlende Fragebögen, neue Kontakte
  function todos(list) {
    const out = [];
    list.forEach(e => {
      if (e.nurKontakt) { out.push({ e, sev: 'info', txt: 'Neuer Kontakt, noch keine Akte', prio: 3 }); return; }
      const pmu = lastOf(e, 'PMU');
      if (pmu) {
        const n = days(pmu.d);
        if (pmu.t === 'Ersttermin' && n >= 28) {
          out.push({ e, sev: n > 70 ? 'warn' : 'due', prio: n > 70 ? 0 : 1, txt: `PMU-Nachbehandlung ${n > 70 ? 'überfällig' : 'fällig'}, Ersttermin vor ${ago(n)}` });
        } else if (n >= 330) {
          out.push({ e, sev: 'due', prio: 2, txt: `PMU-Auffrischung anbieten, letzte Behandlung vor ${ago(n)}` });
        }
      }
      ['Lash Lift', 'Brow Lift'].forEach(art => {
        const l = lastOf(e, art);
        if (l) { const n = days(l.d); if (n >= 42 && n <= 120) out.push({ e, sev: 'due', prio: 2, txt: `${art} wieder fällig, zuletzt vor ${ago(n)}` }); }
      });
      if (!e.fragebogen) out.push({ e, sev: 'warn', prio: 1, txt: 'Kontraindikations-Fragebogen fehlt' });
    });
    return out.sort((a, b) => a.prio - b.prio);
  }

  function render() {
    const el = document.getElementById('mod-uebersicht');
    if (!el || !window.Store) return;
    const list = Store.list();
    const akten = list.filter(e => !e.nurKontakt);
    const now = new Date();
    const thisMonth = ym(now);
    const all = akten.flatMap(e => (e.b || []).map(b => ({ ...b, e })));
    const monat = all.filter(b => b.d.startsWith(thisMonth)).length;
    const neu = akten.filter(e => {
      const first = (e.b || []).map(b => b.d).sort()[0];
      return (e.erstellt || first || '').startsWith(thisMonth);
    }).length;
    const t = todos(list);
    const tShown = showAll ? t : t.slice(0, 6);
    const recent = all.sort((a, b) => b.d.localeCompare(a.d)).slice(0, 5);

    // Behandlungen der letzten 6 Monate
    const months = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 15); months.push({ k: ym(d), l: d.toLocaleDateString('de-DE', { month: 'short' }).replace('.', ''), lang: d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) }); }
    months.forEach(m => { m.n = all.filter(b => b.d.startsWith(m.k)).length; });
    const max = Math.max(1, ...months.map(m => m.n));

    const monatsname = now.toLocaleDateString('de-DE', { month: 'long' });
    const h = now.getHours();
    const gruss = (h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend') + (C.INHABERIN ? ', ' + C.INHABERIN : '');
    const datum = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

    const person = (e, sub) => `<button class="who" data-cust="${esc(e.id)}"><b>${esc(name(e))}</b><span class="cmeta">${sub}</span></button>`;
    const wa = e => e.telefon ? `<a class="mini" href="https://wa.me/${esc(waNumber(e.telefon))}" target="_blank" rel="noopener">WhatsApp</a>` : '';

    el.innerHTML = `
      <div class="row between hello">
        <div><h1>${esc(gruss)}</h1><p>${esc(datum)}</p></div>
        <button class="btn" data-act="neu">+ Neue Kundin</button>
      </div>

      <div class="kpis">
        <button class="panel kpi tap" data-f="alle"><b>${akten.length}</b><span>Kundinnen</span></button>
        <button class="panel kpi tap" data-f="monat"><b>${monat}</b><span>Behandlungen im ${esc(monatsname)}</span></button>
        <button class="panel kpi tap" data-f="neu"><b>${neu}</b><span>neue Kundinnen im ${esc(monatsname)}</span></button>
      </div>

      <div class="dgrid">
        <div class="panel card">
          <div class="row between"><button class="htap" data-f="todo"><h2>Jetzt dran ›</h2></button><span class="label">${t.length} ${t.length === 1 ? 'Punkt' : 'Punkte'}</span></div>
          ${t.length ? `<ul class="todo">${tShown.map(x => `<li><span class="sev ${x.sev}" aria-hidden="true"></span>${person(x.e, esc(x.txt))}${wa(x.e)}</li>`).join('')}</ul>
            ${t.length > 6 ? `<button class="btn ghost small" data-act="mehr" style="margin-top:8px">${showAll ? 'Weniger anzeigen' : `Alle ${t.length} anzeigen`}</button>` : ''}`
            : '<p class="cmeta" style="margin-top:10px">Alles erledigt. Hier erscheinen fällige Nachbehandlungen, Lash- und Brow-Lift-Erinnerungen, fehlende Fragebögen und neue Kontakte.</p>'}
        </div>
        <div class="dcol">
          <div class="panel card">
            <button class="htap" data-f="zuletzt"><h2>Zuletzt behandelt ›</h2></button>
            ${recent.length ? `<ul class="todo">${recent.map(b => `<li>${person(b.e, esc(b.a) + ' · ' + fmt(b.d))}</li>`).join('')}</ul>`
              : '<p class="cmeta" style="margin-top:10px">Noch keine Behandlung eingetragen.</p>'}
          </div>
          <div class="panel card">
            <div class="row between"><button class="htap" data-f="zuletzt"><h2>Behandlungen ›</h2></button><span class="label">letzte 6 Monate</span></div>
            <div class="bars" role="img" aria-label="${esc(months.map(m => m.l + ': ' + m.n).join(', '))}">
              ${months.map(m => `<button class="bar tap" data-f="m:${m.k}" aria-label="${esc(m.lang)}: ${m.n} Behandlungen"><em>${m.n}</em><i style="height:${Math.round(m.n / max * 100)}%"></i><span>${esc(m.l)}</span></button>`).join('')}
            </div>
          </div>
        </div>
      </div>`;

    el.querySelectorAll('[data-cust]').forEach(b => { b.onclick = () => FCC.openCustomer && FCC.openCustomer(b.dataset.cust); });
    const nb = el.querySelector('[data-act="neu"]'); if (nb) nb.onclick = () => FCC.newCustomer && FCC.newCustomer();
    const mb = el.querySelector('[data-act="mehr"]'); if (mb) mb.onclick = () => { showAll = !showAll; render(); };

    // Kennzahlen, Überschriften und Balken öffnen die Kundenkartei mit passendem Filter
    const inMonth = k => e => (e.b || []).some(b => b.d.startsWith(k));
    const todoIds = new Set(t.map(x => x.e.id));
    const FILTER = {
      alle: () => FCC.openList(null, null, 'name'),
      monat: () => FCC.openList('Behandlungen im ' + monatsname, inMonth(thisMonth), 'zuletzt'),
      neu: () => FCC.openList('Neue Kundinnen im ' + monatsname, e => !e.nurKontakt && (e.erstellt || ((e.b || []).map(b => b.d).sort()[0]) || '').startsWith(thisMonth), 'zuletzt'),
      todo: () => FCC.openList('Jetzt dran', e => todoIds.has(e.id), 'name'),
      zuletzt: () => FCC.openList('Mit Behandlung, neueste zuerst', e => !!e.letzte, 'zuletzt')
    };
    el.querySelectorAll('[data-f]').forEach(b => {
      b.onclick = () => {
        if (!FCC.openList) return;
        const f = b.dataset.f;
        if (f.startsWith('m:')) { const m = months.find(x => x.k === f.slice(2)); FCC.openList('Behandlungen im ' + (m ? m.lang : f.slice(2)), inMonth(f.slice(2)), 'zuletzt'); }
        else if (FILTER[f]) FILTER[f]();
      };
    });
  }

  // Eigene Gestaltung des Moduls
  const st = document.createElement('style');
  st.textContent = '.tap{font:inherit;color:inherit;text-align:left;cursor:pointer;width:100%}' +
    '.kpi.tap:hover{border-color:var(--rose)}' +
    '.bar.tap{border:0;background:none;padding:0;text-align:center}' +
    '.bar.tap:hover i{opacity:.8}' +
    '.htap{border:0;background:none;padding:0;color:inherit;cursor:pointer;text-align:left}' +
    '.htap:hover h2{color:var(--rose-ink)}';
  document.head.append(st);

  FCC.register && FCC.register({
    id: 'uebersicht', titel: 'Übersicht', el: 'mod-uebersicht', order: 1, render,
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>'
  });
})();
