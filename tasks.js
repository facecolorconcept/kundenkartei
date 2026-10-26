// Modul „Aufgaben“: Google Tasks in der Übersicht und in jeder Akte, Erinnerung als Kalendertermin.
// In Google landen nur Titel, Fälligkeit und Name der Kundin, nie Gesundheitsdaten.
(function () {
  const FCC = window.FCC = window.FCC || {};
  const $ = s => document.querySelector(s);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const heute = () => iso(new Date());
  const jetzt = () => { const d = new Date(); return iso(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const plus = (s, n) => { const d = new Date(s + 'T12:00'); d.setDate(d.getDate() + n); return iso(d); };
  const fmt = s => s ? new Date(s + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '';
  const fmtZeit = s => s ? new Date(s).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' Uhr' : '';
  const name = e => `${e.vorname || ''} ${e.nachname || ''}`.trim();
  const APP = 'https://facecolorconcept.github.io/kundenkartei/';

  // Verknüpfung steht als letzte Zeile in den Notizen der Aufgabe: „— Kartei: k=<Kundin> e=<Termin> r=<Erinnerung>“
  const MARK = /\n*— Kartei:([^\n]*)$/;
  function lesen(t) {
    const m = (t.notes || '').match(MARK); const meta = {};
    if (m) m[1].trim().split(/\s+/).forEach(p => { const i = p.indexOf('='); if (i > 0) meta[p.slice(0, i)] = p.slice(i + 1); });
    return { id: t.id, liste: t.liste || '@default', listeName: t.listeName || '', titel: t.title || '(ohne Titel)', notiz: (t.notes || '').replace(MARK, '').trim(),
      due: t.due ? t.due.slice(0, 10) : '', k: meta.k || '', e: meta.e || '', r: meta.r || '', t: meta.t || '' };
  }
  function schreiben(a) {
    const meta = [a.k && 'k=' + a.k, a.t && 't=' + a.t, a.e && 'e=' + a.e, a.r && 'r=' + a.r].filter(Boolean).join(' ');
    const notes = [a.notiz, meta ? '— Kartei: ' + meta : ''].filter(Boolean).join('\n\n');
    return { title: a.titel, notes, due: a.due ? a.due + 'T00:00:00.000Z' : null };
  }

  let cache = null, laden = null, fehler = '', alle = false;
  const hooks = new Set();
  function neuZeichnen() {
    hooks.forEach(f => { try { f(); } catch (e) {} });
    // Übersicht neu aufbauen, damit „Jetzt dran“ Punkte mit offener Aufgabe ausblendet
    if (FCC.current && FCC.current() === 'uebersicht' && FCC.renderUebersicht) FCC.renderUebersicht();
  }

  // Folgetermine: Schnellwahl in der Akte und Vorschlag nach dem Behandlungsbogen
  const FOLGE = [
    { t: 'heil', l: 'Verheilungscheck', tage: 7 },
    { t: 'pmu-nach', l: 'PMU-Nachbehandlung', tage: 42 },
    { t: 'lash', l: 'Lash Lift wieder', tage: 42 },
    { t: 'brow', l: 'Brow Lift wieder', tage: 42 },
    { t: 'wax', l: 'Waxing wieder', tage: 28 },
    { t: 'pmu-auff', l: 'PMU-Auffrischung', tage: 365 }
  ];
  const dauer = n => n % 365 === 0 ? (n / 365 === 1 ? '12 Monaten' : n / 365 + ' Jahren') : n % 7 === 0 ? (n / 7 === 1 ? '1 Woche' : n / 7 + ' Wochen') : n + ' Tagen';
  FCC.folgeFuer = b => {
    const d = b.daten || {};
    const t = b.art === 'PMU' ? (d.termin === 'Ersttermin' ? 'pmu-nach' : 'pmu-auff') : b.art === 'Lash Lift' ? 'lash' : b.art === 'Brow Lift' ? 'brow' : b.art === 'Waxing' ? 'wax' : '';
    const f = FOLGE.find(x => x.t === t);
    return f ? { ...f, due: plus(b.datum || heute(), f.tage), text: `${f.l} in ${dauer(f.tage)}` } : null;
  };
  FCC.aufgabeVorhanden = (k, t) => !!(cache || []).some(a => a.k === k && a.t === t);
  FCC.folgeAnlegen = (kunde, f) => {
    const nm = kunde ? `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() : '';
    blatt(null, kunde, { titel: f.l.replace(/ wieder$/, '') + (nm ? ': ' + nm : ''), due: f.due || plus(heute(), f.tage), t: f.t });
  };
  async function holen(force) {
    if (cache && !force) return cache;
    if (laden) return laden;
    laden = (async () => {
      try { cache = (await Store.aufgaben()).map(lesen); fehler = ''; }
      catch (e) { fehler = /\(403\)/.test(e.message) ? 'Google Aufgaben ist noch nicht freigeschaltet. Bitte einmal abmelden und neu anmelden, dabei das Häkchen „Aufgaben“ setzen.' : e.message; cache = cache || []; }
      laden = null; neuZeichnen(); return cache;
    })();
    return laden;
  }
  FCC.aufgabenNeuLaden = () => holen(true);

  function gruppe(a) {
    const h = heute();
    if (!a.due) return [5, 'Ohne Datum'];
    if (a.due < h) return [0, 'Überfällig'];
    if (a.due === h) return [1, 'Heute'];
    if (a.due === plus(h, 1)) return [2, 'Morgen'];
    if (a.due <= plus(h, 7)) return [3, 'Diese Woche'];
    return [4, 'Später'];
  }
  const sortiert = l => [...l].sort((a, b) => gruppe(a)[0] - gruppe(b)[0] || (a.due || '9').localeCompare(b.due || '9') || a.titel.localeCompare(b.titel, 'de'));
  const kundin = id => id ? Store.list(true).find(e => e.id === id) : null;

  function zeile(a, mitKundin) {
    const g = gruppe(a); const k = mitKundin ? kundin(a.k) : null;
    const sev = g[0] === 0 ? 'bad' : g[0] === 1 ? 'warn' : g[0] === 2 ? 'due' : '';
    return `<li class="aufg"><button class="tick" data-tick="${esc(a.id)}" aria-label="Erledigt: ${esc(a.titel)}" title="Erledigt"></button>
      <button class="who" data-edit="${esc(a.id)}"><b>${esc(a.titel)}</b><span class="cmeta"><span class="when ${sev}">${esc(a.due ? g[1] + (g[0] > 2 ? ' · ' + fmt(a.due) : '') : 'Ohne Datum')}</span>${a.r ? ' · Erinnerung ' + esc(fmtZeit(a.r)) : ''}</span></button>
      ${k ? `<button class="btn ghost small" data-kunde="${esc(k.id)}">${esc(name(k))}</button>` : ''}</li>`;
  }

  // el: Platzhalter; opt.kunde: Akte der Kundin (dann nur deren Aufgaben)
  FCC.aufgabenKarte = (el, opt) => {
    if (!el) return;
    opt = opt || {};
    const draw = () => {
      if (!document.body.contains(el)) { hooks.delete(draw); return; }
      const c = opt.kunde;
      const l = sortiert((cache || []).filter(a => !c || a.k === c.id));
      const max = c ? 20 : 7;
      const zeigen = alle || c ? l : l.slice(0, max);
      const offen = l.filter(a => gruppe(a)[0] <= 1).length;
      el.innerHTML = `<div class="panel card">
        <div class="row between"><div class="row" style="gap:6px"><button class="htap" data-alle><h2>${c ? 'Aufgaben' : 'Aufgaben ›'}</h2></button><button class="qhelp" data-hilfe="aufgaben" aria-label="Hilfe zu Aufgaben" title="Hilfe">?</button></div>
          <div class="row">${!c && cache ? `<span class="label">${offen ? offen + ' heute fällig' : l.length + ' offen'}</span>` : ''}<button class="btn small" data-neu>+ Aufgabe</button></div></div>
        ${fehler ? `<div class="banner"><span>${esc(fehler)}</span></div>` : ''}
        ${!cache ? '<p class="cmeta" style="margin-top:10px">Aufgaben werden geladen …</p>'
          : l.length ? `<ul class="todo">${zeigen.map(a => zeile(a, !c)).join('')}</ul>${!c && l.length > max ? `<button class="btn ghost small" data-alle style="margin-top:8px">${alle ? 'Weniger anzeigen' : `Alle ${l.length} anzeigen`}</button>` : ''}`
          : `<p class="cmeta" style="margin-top:10px">${c ? 'Keine offene Aufgabe zu dieser Kundin.' : 'Nichts offen. Aufgaben aus Gmail und Google Tasks erscheinen hier automatisch.'}</p>`}
        ${c ? `<details class="folge"><summary>Folgetermin merken</summary><p class="cmeta" style="margin:6px 0 0">Ein Tipp füllt die Aufgabe vor, mit Erinnerung 1 Tag vorher.</p><div class="chips">${FOLGE.filter(f => !l.some(a => a.t === f.t)).map(f => `<button class="chip add" data-folge="${f.t}">${esc(f.l)} · in ${dauer(f.tage)}</button>`).join('')}</div></details>` : ''}
      </div>`;
      el.querySelectorAll('[data-folge]').forEach(b => b.onclick = () => FCC.folgeAnlegen(c, FOLGE.find(f => f.t === b.dataset.folge)));
      el.querySelectorAll('[data-hilfe]').forEach(b => b.onclick = () => FCC.hilfe && FCC.hilfe(b.dataset.hilfe));
      el.querySelector('[data-neu]').onclick = () => blatt(null, c);
      el.querySelectorAll('[data-alle]').forEach(b => b.onclick = () => { if (!c) { alle = !alle; draw(); } });
      el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => blatt((cache || []).find(a => a.id === b.dataset.edit), c));
      el.querySelectorAll('[data-kunde]').forEach(b => b.onclick = () => FCC.openCustomer && FCC.openCustomer(b.dataset.kunde));
      el.querySelectorAll('[data-tick]').forEach(b => b.onclick = () => erledigt((cache || []).find(a => a.id === b.dataset.tick), b));
    };
    hooks.add(draw);
    draw();
    holen();
  };

  async function erledigt(a, btn) {
    if (!a) return;
    btn.disabled = true; btn.classList.add('on');
    try {
      await Store.aufgabeAendern(a.liste, a.id, { status: 'completed' });
      if (a.e && a.r && a.r > jetzt()) { try { await Store.erinnerungWeg(a.e); } catch (e) {} }
      if (FCC.aufgabeErledigt) { try { await FCC.aufgabeErledigt(a); } catch (e) {} }
      cache = cache.filter(x => x.id !== a.id);
      neuZeichnen();
      FCC.toast && FCC.toast('Erledigt: ' + a.titel);
    } catch (e) { btn.disabled = false; btn.classList.remove('on'); FCC.toast && FCC.toast(e.message, true); }
  }

  // ---------- Aufgabe anlegen / ändern ----------
  function blatt(a, kunde, pre) {
    const neu = !a;
    const d = a ? { ...a } : { titel: '', notiz: '', due: plus(heute(), 1), k: kunde ? kunde.id : '', e: '', r: '', t: '', ...(pre || {}) };
    // Erinnerungsart aus vorhandener Zeit ableiten
    const vortagVorbei = d.due && plus(d.due, -1) + 'T09:00' < jetzt();
    const art0 = !d.r ? (neu ? (vortagVorbei ? 'tag' : 'vortag') : 'keine') : d.due && d.r === plus(d.due, -1) + 'T09:00' ? 'vortag' : d.due && d.r === d.due + 'T08:00' ? 'tag' : 'frei';
    const kunden = Store.list().filter(e => !e.nurKontakt).sort((x, y) => (x.nachname || '').localeCompare(y.nachname || '', 'de'));
    const k0 = kundin(d.k);
    if (k0 && !kunden.includes(k0)) kunden.unshift(k0);
    $('#sheetRoot').innerHTML = `<div class="sheet-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="Aufgabe">
      <div class="sheet-head"><div class="wrap"><div><span class="label">${neu ? 'Neue Aufgabe' : esc(d.listeName || 'Google Aufgaben')}</span><h2>${neu ? 'Aufgabe anlegen' : 'Aufgabe'}</h2></div><button class="btn ghost small" id="ax">Schließen</button></div></div>
      <form class="wrap sec" onsubmit="return false"><div class="grid2">
        <div class="field full"><label for="aT">Was ist zu tun? *</label><input id="aT" maxlength="200" value="${esc(d.titel)}" placeholder="z. B. Pigmente nachbestellen"></div>
        <div class="field"><label for="aD">Fällig am</label><input id="aD" type="date" value="${esc(d.due)}"></div>
        <div class="field"><label for="aK">Kundin (optional)</label><select id="aK"><option value="">keine</option>${kunden.map(e => `<option value="${esc(e.id)}" ${e.id === d.k ? 'selected' : ''}>${esc(e.nachname)}, ${esc(e.vorname)}</option>`).join('')}</select></div>
        <div class="field full"><span class="flabel">Erinnerung aufs Handy</span><div class="chips" id="aR">
          ${[['keine', 'keine'], ['vortag', '1 Tag vorher, 9 Uhr'], ['tag', 'am Tag, 8 Uhr'], ['frei', 'selbst wählen']].map(([k, l]) => `<button type="button" class="chip ${art0 === k ? 'on' : ''}" data-r="${k}" aria-pressed="${art0 === k}">${l}</button>`).join('')}</div></div>
        <div class="field" id="aFw" ${art0 === 'frei' ? '' : 'hidden'}><label for="aF">Erinnern am</label><input id="aF" type="datetime-local" value="${esc(d.r || (d.due ? d.due + 'T09:00' : heute() + 'T18:00'))}"></div>
        <div class="field full"><label for="aN">Notiz</label><textarea id="aN" rows="3" placeholder="Keine Gesundheitsdaten eintragen, die Notiz landet in Google Aufgaben.">${esc(d.notiz)}</textarea></div>
      </div>
      <p class="cmeta" id="aInfo" style="margin-top:12px"></p>
      ${neu ? '' : '<button type="button" class="btn ghost small" id="aDel" style="margin-top:8px">Aufgabe löschen</button>'}
      </form>
      <div class="sheet-foot"><div class="wrap"><button class="btn ghost" id="ax2">Abbrechen</button><button class="btn" id="aS">${neu ? 'Anlegen' : 'Speichern'}</button></div></div>
    </div></div>`;
    let art = art0;
    const close = () => { $('#sheetRoot').innerHTML = ''; };
    $('#ax').onclick = close; $('#ax2').onclick = close;
    const wann = () => {
      const due = $('#aD').value;
      if (art === 'vortag') return due ? plus(due, -1) + 'T09:00' : '';
      if (art === 'tag') return due ? due + 'T08:00' : '';
      if (art === 'frei') return $('#aF').value;
      return '';
    };
    const info = () => {
      const w = wann();
      $('#aInfo').textContent = art !== 'keine' && !w ? 'Für diese Erinnerung bitte ein Fälligkeitsdatum eintragen.'
        : w ? `Mitteilung über deinen Google Kalender am ${fmtZeit(w)}.${w < jetzt() ? ' Achtung: Diese Zeit liegt in der Vergangenheit.' : ''}` : 'Die Aufgabe erscheint auch in Gmail und in Google Tasks.';
    };
    document.querySelectorAll('#aR [data-r]').forEach(b => b.onclick = () => {
      art = b.dataset.r;
      document.querySelectorAll('#aR [data-r]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      $('#aFw').hidden = art !== 'frei'; info();
    });
    ['aD', 'aF'].forEach(id => $('#' + id).addEventListener('input', info));
    info();
    $('#aT').focus();

    const del = $('#aDel');
    if (del) del.onclick = async () => {
      if (del.dataset.sure !== '1') { del.dataset.sure = '1'; del.textContent = 'Wirklich löschen? Auch in Google Tasks.'; return; }
      del.disabled = true;
      try {
        await Store.aufgabeLoeschen(a.liste, a.id);
        if (a.e) { try { await Store.erinnerungWeg(a.e); } catch (e) {} }
        cache = cache.filter(x => x.id !== a.id); close(); neuZeichnen(); FCC.toast && FCC.toast('Aufgabe gelöscht');
      } catch (e) { del.disabled = false; FCC.toast && FCC.toast(e.message, true); }
    };

    $('#aS').onclick = async ev => {
      const titel = $('#aT').value.trim();
      if (!titel) { FCC.toast && FCC.toast('Bitte eintragen, was zu tun ist.'); return; }
      const w = wann();
      if (art !== 'keine' && !w) { FCC.toast && FCC.toast('Für diese Erinnerung bitte ein Fälligkeitsdatum eintragen.'); return; }
      const b = ev.currentTarget; b.disabled = true; b.textContent = 'Speichert …';
      try {
        const n = { ...d, titel, due: $('#aD').value, k: $('#aK').value, notiz: $('#aN').value.trim() };
        const k = kundin(n.k);
        // Erinnerung neu setzen, wenn sich Zeit, Titel oder Kundin geändert haben
        if (n.e && (w !== d.r || titel !== d.titel || n.k !== d.k)) { try { await Store.erinnerungWeg(n.e); } catch (e) {} n.e = ''; n.r = ''; }
        if (w && !n.e) {
          n.e = await Store.erinnerung('Erinnerung: ' + titel + (k ? ' (' + name(k) + ')' : ''), w,
            `Aufgabe aus der Kundenkartei${n.due ? ', fällig am ' + fmt(n.due) : ''}.\n${APP}`);
          n.r = w;
        }
        if (!w) n.r = '';
        let r;
        if (neu) r = await Store.aufgabeNeu(schreiben(n));
        else r = { ...(await Store.aufgabeAendern(a.liste, a.id, schreiben(n))), liste: a.liste, listeName: a.listeName };
        const fertig = lesen({ ...r, liste: r.liste || a && a.liste, listeName: r.listeName || (a && a.listeName) || 'Meine Aufgaben' });
        cache = (cache || []).filter(x => x.id !== fertig.id).concat(fertig);
        close(); neuZeichnen();
        FCC.toast && FCC.toast(neu ? (n.r ? 'Aufgabe angelegt, Erinnerung am ' + fmtZeit(n.r) : 'Aufgabe angelegt') : 'Gespeichert');
      } catch (e) { b.disabled = false; b.textContent = neu ? 'Anlegen' : 'Speichern'; FCC.toast && FCC.toast(e.message, true); }
    };
  }
  FCC.neueAufgabe = (kunde, titel, t, notiz) => blatt(null, kunde, { titel: titel || '', t: t || '', notiz: notiz || '' });

  const st = document.createElement('style');
  st.textContent = '.aufg .tick{width:26px;height:26px;border-radius:50%;border:1.5px solid var(--rose);background:transparent;flex-shrink:0;padding:0;position:relative}' +
    '.qhelp{width:24px;height:24px;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--muted);font-size:13px;font-weight:600;padding:0;line-height:1;flex-shrink:0}.qhelp:hover{color:var(--rose-ink);border-color:var(--rose)}' +
    '.folge{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}.folge summary{cursor:pointer;color:var(--rose-ink);font-weight:500;min-height:32px}' +
    '.aufg .tick:hover,.aufg .tick.on{background:var(--rose-soft)}' +
    '.aufg .tick.on::after{content:"";position:absolute;left:8px;top:4px;width:6px;height:11px;border:solid var(--rose-ink);border-width:0 2px 2px 0;transform:rotate(45deg)}' +
    '.when.bad{color:var(--bad);font-weight:500}.when.warn{color:var(--warn);font-weight:500}.when.due{color:var(--rose-ink)}';
  document.head.append(st);
})();
