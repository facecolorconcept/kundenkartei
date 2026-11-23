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
        if (String(pmu.t || '').split(', ').includes('Ersttermin') && n >= 28) {
          out.push({ e, t: 'pmu-nach', datum: pmu.d, sev: n > 70 ? 'warn' : 'due', prio: n > 70 ? 0 : 1, txt: `PMU-Nachbehandlung ${n > 70 ? 'überfällig' : 'fällig'}, Ersttermin vor ${ago(n)}` });
        } else if (n >= 330) {
          out.push({ e, t: 'pmu-auff', datum: pmu.d, sev: 'due', prio: 2, txt: `PMU-Auffrischung anbieten, letzte Behandlung vor ${ago(n)}` });
        }
      }
      ['Lash Lift', 'Brow Lift'].forEach(art => {
        const l = lastOf(e, art);
        if (l) { const n = days(l.d); if (n >= 42 && n <= 120) out.push({ e, t: art === 'Lash Lift' ? 'lash' : 'brow', datum: l.d, sev: 'due', prio: 2, txt: `${art} wieder fällig, zuletzt vor ${ago(n)}` }); }
      });
      // Rückmeldungen und auffällige Ergebnisse bleiben sichtbar, bis ich sie als erledigt markiere
      // Nur der jüngste Termin je Behandlung zählt (ein neuerer Termin hat den älteren abgelöst), eine Zeile je Termin
      (e.b || []).forEach(b => {
        if (b.n) return;
        if ((e.b || []).some(x => x.a === b.a && x.d > b.d)) return;
        const n = days(b.d);
        const auff = b.p && n <= 60 ? ' · ' + b.p : '';
        if (b.z === 'nein' && n <= 120) out.push({ e, b, t: 'b:' + b.id, sev: 'bad', prio: -1, txt: `War unzufrieden mit ${b.a} am ${fmt(b.d)}, bitte nachfassen${auff}` });
        else if (b.z === 'teils' && n <= 90) out.push({ e, b, t: 'b:' + b.id, sev: 'warn', prio: 1, txt: `Nur teilweise zufrieden mit ${b.a} am ${fmt(b.d)}${auff}` });
        else if (auff) out.push({ e, b, t: 'p:' + b.id, sev: 'warn', prio: 1, txt: `${b.a} am ${fmt(b.d)}: ${b.p}` });
      });
      if (FCC.browsTodos) out.push(...FCC.browsTodos(e));
      const nurInteressentin = (e.w || []).length && !(e.b || []).length;
      if (nurInteressentin) return;
      if (!e.fragebogen) out.push({ e, t: 'fb', sev: 'warn', prio: 1, txt: 'Kontraindikations-Fragebogen fehlt' });
      else if (days(e.fragebogen) > 365) out.push({ e, t: 'fb', sev: 'warn', prio: 2, txt: `Fragebogen älter als ein Jahr (${fmt(e.fragebogen)}), bitte erneuern` });
    });
    // Sicherung älter als 30 Tage (oder noch keine): ganz oben erinnern
    if (FCC.letzteSicherung && Store.mode !== 'demo' && list.some(e => !e.nurKontakt)) {
      const ls = FCC.letzteSicherung(); const n = ls ? days(ls) : null;
      if (n == null || n > 30) out.push({ sicherung: true, sev: 'warn', prio: -0.5, txt: ls ? `Letzte Sicherung vor ${ago(n)}, bitte neu sichern` : 'Noch keine Sicherung auf deinem Rechner' });
    }
    // Punkte, für die schon eine offene Aufgabe existiert, nicht doppelt zeigen
    return out.filter(x => !(x.t && x.e && FCC.aufgabeVorhanden && FCC.aufgabeVorhanden(x.e.id, x.t))).sort((a, b) => a.prio - b.prio);
  }

  // Wann ist bei einer Kundin die nächste Nachbehandlung fällig? (PMU 4 Wochen nach Ersttermin, Lifting nach 6 Wochen)
  function faellig(e) {
    const out = [];
    const pmu = lastOf(e, 'PMU');
    if (pmu && String(pmu.t || '').split(', ').includes('Ersttermin')) out.push({ art: 'PMU-Nachbehandlung', d: days(pmu.d) - 28 });
    ['Lash Lift', 'Brow Lift'].forEach(a => { const l = lastOf(e, a); if (l && days(l.d) <= 120) out.push({ art: a, d: days(l.d) - 42 }); });
    return out.filter(x => x.d >= -30 && x.d <= 90); // fällig in den nächsten 30 Tagen oder seit höchstens 90 Tagen
  }

  // Kundin wählen (für Schnellstart): Suche plus Liste, ein Tipp ruft fn(eintrag) auf
  function kundinWaehlen(titel, fn) {
    const rt = document.getElementById('sheetRoot');
    rt.innerHTML = `<div class="sheet-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(titel)}">
      <div class="sheet-head"><div class="wrap"><div><span class="label">Kundin wählen</span><h2>${esc(titel)}</h2></div><button class="btn ghost small" id="kwZu">Schließen</button></div></div>
      <div class="wrap sec"><input class="search" id="kwSuch" type="search" placeholder="Name, Telefon oder Instagram" aria-label="Kundin suchen"><ul class="clist" id="kwListe" style="margin-top:8px"></ul>
      <button class="btn ghost small" id="kwNeu" style="margin-top:8px">+ Neue Kundin anlegen</button></div></div></div>`;
    const zu = () => { rt.innerHTML = ''; };
    rt.querySelector('#kwZu').onclick = zu;
    rt.querySelector('#kwNeu').onclick = () => { zu(); FCC.newCustomer && FCC.newCustomer(); };
    const zeigen = () => {
      const q = rt.querySelector('#kwSuch').value.toLowerCase().trim();
      const l = Store.list().filter(e => !e.nurKontakt && (name(e) + ' ' + (e.telefon || '') + ' ' + (e.instagram || '')).toLowerCase().includes(q))
        .sort((a, b) => ((b.letzte && b.letzte.datum) || '').localeCompare((a.letzte && a.letzte.datum) || '') || name(a).localeCompare(name(b), 'de')).slice(0, 40);
      rt.querySelector('#kwListe').innerHTML = l.length ? l.map(e => `<li><button data-kw="${esc(e.id)}"><span><span class="cname">${esc(name(e))}</span><br><span class="cmeta">${e.letzte ? 'zuletzt ' + fmt(e.letzte.datum) + ' · ' + esc(e.letzte.art) : 'noch keine Behandlung'}</span></span></button></li>`).join('') : '<li class="empty">Keine Kundin gefunden.</li>';
      rt.querySelectorAll('[data-kw]').forEach(b => b.onclick = () => { const e = Store.list(true).find(x => x.id === b.dataset.kw); fn(e, zu); });
    };
    rt.querySelector('#kwSuch').oninput = zeigen; zeigen(); rt.querySelector('#kwSuch').focus();
  }
  FCC.kundinWaehlen = kundinWaehlen;

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
    const bald = akten.filter(e => faellig(e).length);
    // Erinnerungen, die per Mail gehen dürfen (Einwilligung, E-Mail-Adresse, nicht schon kürzlich gesendet)
    const perMail = t.filter(x => x.e && x.t && FCC.erinnerungMoeglich && FCC.erinnerungMoeglich(x.e, x.t) && x.e.email);
    // Zufriedenheit der letzten 90 Tage
    const bew = all.filter(b => b.z && days(b.d) <= 90);
    const zc = { ja: 0, teils: 0, nein: 0 };
    bew.forEach(b => { if (zc[b.z] != null) zc[b.z]++; });
    const ztot = zc.ja + zc.teils + zc.nein;
    const ZL = [['ja', 'zufrieden'], ['teils', 'teilweise'], ['nein', 'unzufrieden']];
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
      <div class="hello"><h1>${esc(gruss)}</h1><p>${esc(datum)}</p></div>

      <div class="schnell" role="group" aria-label="Schnellstart">
        <button class="panel schnell-k" data-act="neu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.9-3.6 3.4-5.5 6.5-5.5s5.6 1.9 6.5 5.5M18.5 7v6M15.5 10h6"/></svg><span>Neue Kundin</span></button>
        <button class="panel schnell-k" data-act="beh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v3h6V3M8.5 11h7M8.5 15h5"/></svg><span>Behandlung dokumentieren</span></button>
        <button class="panel schnell-k" data-act="foto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg><span>Vorher-Foto</span></button>
        <input type="file" id="schnellFoto" accept="image/*" capture="user" hidden>
      </div>

      <div class="kpis k4">
        <button class="panel kpi tap" data-f="alle"><b>${akten.length}</b><span>Kundinnen</span></button>
        <button class="panel kpi tap" data-f="monat"><b>${monat}</b><span>Behandlungen im ${esc(monatsname)}</span></button>
        <button class="panel kpi tap" data-f="neu"><b>${neu}</b><span>neue Kundinnen im ${esc(monatsname)}</span></button>
        <button class="panel kpi tap" data-f="bald"><b>${bald.length}</b><span>Nachbehandlungen in 30 Tagen</span></button>
      </div>

      <div class="dgrid">
        <div class="dcol">
        <div id="dashHeute"></div>
        <div id="dashAufg"></div>
        <div class="panel card">
          <div class="row between"><div class="row" style="gap:6px"><button class="htap" data-f="todo"><h2>Jetzt dran ›</h2></button><button class="qhelp" data-hilfe="jetzt" aria-label="Hilfe zu Jetzt dran" title="Hilfe">?</button></div><span class="row" style="gap:8px">${perMail.length ? `<button class="btn ghost small" data-act="eri">Erinnerungen per Mail (${perMail.length})</button>` : ''}<span class="label">${t.length} ${t.length === 1 ? 'Punkt' : 'Punkte'}</span></span></div>
          ${t.length ? `<ul class="todo">${tShown.map(x => x.sicherung ? `<li><span class="sev ${x.sev}" aria-hidden="true"></span><button class="who" data-act="sich"><b>Sicherung</b><span class="cmeta">${esc(x.txt)}</span></button><button class="btn ghost small" data-act="sich">Jetzt sichern</button></li>` : `<li><span class="sev ${x.sev}" aria-hidden="true"></span>${x.brows ? `<button class="who" data-brows="${esc(x.e.id)}|${esc(x.brows)}"><b>${esc(name(x.e))}</b><span class="cmeta">${esc(x.txt)}</span></button>` : person(x.e, esc(x.txt))}${wa(x.e)}${perMail.includes(x) ? `<button class="btn ghost small" data-eri="${esc(x.e.id)}|${esc(x.t)}" title="Erinnerung per Mail an ${esc(x.e.email)}">Mail</button>` : ''}${x.t && !x.brows ? `<button class="btn ghost small" data-task="${esc(x.e.id)}" data-tk="${esc(x.t)}" data-tt="${esc(x.txt)}" title="Als Aufgabe mit Erinnerung merken">Merken</button>` : ''}${x.b && x.b.id ? `<button class="btn ghost small" data-done="${esc(x.e.id)}|${esc(x.b.id)}" title="Als erledigt markieren">Erledigt</button>` : ''}</li>`).join('')}</ul>
            ${t.length > 6 ? `<button class="btn ghost small" data-act="mehr" style="margin-top:8px">${showAll ? 'Weniger anzeigen' : `Alle ${t.length} anzeigen`}</button>` : ''}`
            : '<p class="cmeta" style="margin-top:10px">Alles erledigt. Hier erscheinen fällige Nachbehandlungen, Lash- und Brow-Lift-Erinnerungen, fehlende Fragebögen und neue Kontakte.</p>'}
        </div>
        </div>
        <div class="dcol">
          <div class="panel card">
            <div class="row between"><button class="htap" data-f="zufr"><h2>Zufriedenheit ›</h2></button><span class="label">letzte 90 Tage</span></div>
            ${ztot ? `<div class="zbar" role="img" aria-label="${esc(ZL.map(([k, l]) => zc[k] + ' ' + l).join(', '))}">${ZL.filter(([k]) => zc[k]).map(([k, l]) => `<button class="zseg z-${k}" data-f="z:${k}" style="flex:${zc[k]}" title="${zc[k]} ${l}" aria-label="${zc[k]} ${l}"></button>`).join('')}</div>
              <div class="zleg">${ZL.map(([k, l]) => `<button class="zl" data-f="z:${k}"><i class="z-${k}"></i><b>${zc[k]}</b> ${l} · ${Math.round(zc[k] / ztot * 100)} %</button>`).join('')}</div>`
              : '<p class="cmeta" style="margin-top:10px">Noch keine Bewertung. Trag im Behandlungsbogen unter „Kundin zufrieden“ ja, teils oder nein ein.</p>'}
          </div>
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

    if (FCC.heuteKarte) FCC.heuteKarte(el.querySelector('#dashHeute'));
    if (FCC.aufgabenKarte) FCC.aufgabenKarte(el.querySelector('#dashAufg'));
    el.querySelectorAll('[data-task]').forEach(b => { b.onclick = () => { const e = Store.list(true).find(x => x.id === b.dataset.task); const nm = e ? name(e) : ''; const k = b.dataset.tk;
        const titel = k.startsWith('b:') ? `Nachfassen bei ${nm}` : k.startsWith('p:') ? `Ergebnis nachfragen bei ${nm}` : k === 'pmu-nach' ? `PMU-Nachbehandlung mit ${nm} vereinbaren` : k === 'pmu-auff' ? `PMU-Auffrischung anbieten: ${nm}` : k === 'lash' ? `${nm} an Lash Lift erinnern` : k === 'brow' ? `${nm} an Brow Lift erinnern` : k === 'fb' ? `Fragebogen von ${nm} einholen` : `${nm}: ${b.dataset.tt}`;
        if (FCC.neueAufgabe) FCC.neueAufgabe(e ? { id: e.id } : null, titel, k, b.dataset.tt); }; });
    el.querySelectorAll('[data-cust]').forEach(b => { b.onclick = () => FCC.openCustomer && FCC.openCustomer(b.dataset.cust); });
    el.querySelectorAll('[data-brows]').forEach(b => { b.onclick = () => { const [c, w] = b.dataset.brows.split('|'); FCC.openBrows && FCC.openBrows(c, w); }; });
    el.querySelectorAll('[data-hilfe]').forEach(b => { b.onclick = () => FCC.hilfe && FCC.hilfe(b.dataset.hilfe); });
    const nb = el.querySelector('[data-act="neu"]'); if (nb) nb.onclick = () => FCC.newCustomer && FCC.newCustomer();
    // Schnellstart: Kundin wählen, dann Akte mit „Termin heute“ bzw. Kamera
    const bb = el.querySelector('[data-act="beh"]'); if (bb) bb.onclick = () => kundinWaehlen('Behandlung dokumentieren', (e, zu) => { zu(); Promise.resolve(FCC.openCustomer(e.id)).then(() => { const s = document.getElementById('formSlot'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); });
    const fb = el.querySelector('[data-act="foto"]'), fi = el.querySelector('#schnellFoto');
    if (fb) fb.onclick = () => kundinWaehlen('Vorher-Foto', (e, zu) => { fi.dataset.kid = e.id; zu(); fi.click(); });
    if (fi) fi.onchange = async () => {
      const file = fi.files[0]; fi.value = ''; if (!file) return;
      const e = Store.list(true).find(x => x.id === fi.dataset.kid); if (!e) return;
      FCC.toast && FCC.toast('Foto wird hochgeladen …');
      try {
        const c = await Store.load(e); c.fotos = c.fotos || [];
        const d = new Date().toISOString().slice(0, 10);
        const n = c.fotos.filter(p => p.typ === 'Vorher' && p.datum === d).length + 1;
        const p = await Store.addPhoto(c, file, `${d}_Vorher_${n}.jpg`);
        c.fotos.push({ ...p, typ: 'Vorher', datum: d }); await Store.save(c);
        FCC.toast && FCC.toast('Vorher-Foto bei ' + name(e) + ' gespeichert');
        FCC.openCustomer(e.id);
      } catch (err) { FCC.toast && FCC.toast(err.message, true); }
    };
    el.querySelectorAll('[data-act="sich"]').forEach(b => { b.onclick = () => { FCC.show('admin'); }; });
    const eb = el.querySelector('[data-act="eri"]'); if (eb) eb.onclick = () => FCC.erinnerungMail(perMail, render);
    el.querySelectorAll('[data-eri]').forEach(b => { b.onclick = () => { const [id, tt] = b.dataset.eri.split('|'); const x = perMail.find(y => y.e.id === id && y.t === tt); if (x) FCC.erinnerungMail([x], render); }; });
    const mb = el.querySelector('[data-act="mehr"]'); if (mb) mb.onclick = () => { showAll = !showAll; render(); };

    // „Erledigt“: Rückmeldung als nachgefasst markieren, dann verschwindet der Punkt
    el.querySelectorAll('[data-done]').forEach(btn => {
      btn.onclick = async () => {
        const [cid, bid] = btn.dataset.done.split('|');
        btn.disabled = true; btn.textContent = 'Speichert …';
        try {
          const e = Store.list(true).find(x => x.id === cid);
          const c = await Store.load(e);
          const b = (c.behandlungen || []).find(x => x.id === bid);
          if (b) { b.nachgefasst = new Date().toISOString().slice(0, 10); await Store.save(c); }
          render();
        } catch (err) { btn.disabled = false; btn.textContent = 'Erledigt'; btn.title = 'Nicht gespeichert: ' + err.message; }
      };
    });

    // Kennzahlen, Überschriften und Balken öffnen die Kundenkartei mit passendem Filter
    const inMonth = k => e => (e.b || []).some(b => b.d.startsWith(k));
    const todoIds = new Set(t.filter(x => x.e).map(x => x.e.id));
    const FILTER = {
      alle: () => FCC.openList(null, null, 'name'),
      monat: () => FCC.openList('Behandlungen im ' + monatsname, inMonth(thisMonth), 'zuletzt'),
      neu: () => FCC.openList('Neue Kundinnen im ' + monatsname, e => !e.nurKontakt && (e.erstellt || ((e.b || []).map(b => b.d).sort()[0]) || '').startsWith(thisMonth), 'zuletzt'),
      todo: () => FCC.openList('Jetzt dran', e => todoIds.has(e.id), 'name'),
      bald: () => FCC.openList('Nachbehandlung fällig oder in den nächsten 30 Tagen', e => !e.nurKontakt && faellig(e).length > 0, 'zuletzt'),
      zuletzt: () => FCC.openList('Mit Behandlung, neueste zuerst', e => !!e.letzte, 'zuletzt')
    };
    el.querySelectorAll('[data-f]').forEach(b => {
      b.onclick = () => {
        if (!FCC.openList) return;
        const f = b.dataset.f;
        if (f === 'zufr') FCC.openList('Bewertet in den letzten 90 Tagen', e => (e.b || []).some(x => x.z && days(x.d) <= 90), 'zuletzt');
        else if (f.startsWith('z:')) { const k = f.slice(2); FCC.openList('Kundin ' + (ZL.find(z => z[0] === k) || [k, k])[1] + ' (letzte 90 Tage)', e => (e.b || []).some(x => x.z === k && days(x.d) <= 90), 'zuletzt'); }
        else if (f.startsWith('m:')) { const m = months.find(x => x.k === f.slice(2)); FCC.openList('Behandlungen im ' + (m ? m.lang : f.slice(2)), inMonth(f.slice(2)), 'zuletzt'); }
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
    '.htap:hover h2{color:var(--rose-ink)}' +
    '.sev.bad{background:var(--bad)}' +
    '.zbar{display:flex;gap:3px;height:14px;border-radius:99px;overflow:hidden;margin-top:14px}' +
    '.zseg{border:0;padding:0;cursor:pointer;min-width:8px}.zseg:hover{opacity:.8}' +
    '.z-ja{background:var(--ok)}.z-teils{background:var(--warn)}.z-nein{background:var(--bad)}' +
    '.zleg{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:10px}' +
    '.zl{border:0;background:none;padding:3px 0;font:inherit;font-size:13.5px;color:var(--muted);cursor:pointer;display:inline-flex;align-items:center;gap:6px}' +
    '.zl:hover{color:var(--rose-ink)}.zl b{color:var(--ink);font-weight:500;font-variant-numeric:tabular-nums}' +
    '.zl i{width:9px;height:9px;border-radius:50%;display:inline-block}' +
    '.todo li .btn.small{flex-shrink:0}' +
    '.kpis.k4{grid-template-columns:repeat(4,minmax(0,1fr))}@media(max-width:700px){.kpis.k4{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
    '.schnell{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}' +
    '.schnell-k{display:flex;align-items:center;gap:12px;padding:14px 16px;font:inherit;color:var(--ink);cursor:pointer;text-align:left;min-height:64px;transition:transform .15s,border-color .15s}' +
    '.schnell-k:hover{transform:translateY(-2px);border-color:var(--rose)}.schnell-k svg{width:28px;height:28px;color:var(--rose-ink);flex-shrink:0}.schnell-k span{font-weight:500;line-height:1.25}' +
    '@media(max-width:520px){.schnell{gap:8px}.schnell-k{flex-direction:column;text-align:center;gap:6px;padding:12px 6px;font-size:13px}}';
  document.head.append(st);

  FCC.renderUebersicht = render;
  // Aufgabe zu einer Rückmeldung abgehakt: Rückmeldung gilt als nachgefasst
  FCC.aufgabeErledigt = async a => {
    const m = /^[bp]:(.+)$/.exec(a.t || ''); if (!m || !a.k) return;
    const e = Store.list(true).find(x => x.id === a.k); if (!e || e.nurKontakt) return;
    const c = await Store.load(e);
    const b = (c.behandlungen || []).find(x => x.id === m[1]);
    if (b && !b.nachgefasst) { b.nachgefasst = new Date().toISOString().slice(0, 10); await Store.save(c); }
  };
  FCC.register && FCC.register({
    id: 'uebersicht', titel: 'Übersicht', el: 'mod-uebersicht', order: 1, render,
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>'
  });
})();
