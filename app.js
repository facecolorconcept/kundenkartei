// Facecolorconcept Kundenkartei – Oberfläche
(function () {
  const C = window.FCC_CONFIG || {};

  // ---------- Behandlungsbögen ----------
  const EYE = {
    augentyp: { t: 'Augentyp', o: ['normal stehend', 'nach außen stehend', 'tief liegend', 'Schlupflid'], note: 'Tief liegend / Schlupflid: Padwahl und Auftragebreite der Lotion anpassen.' },
    wuchs: { t: 'Wuchsrichtung', o: ['nach unten', 'gerade', 'nach oben'] },
    form: { t: 'Wimpernform (Seitenansicht)', o: ['gerade', 'gerade bis sehr leichte Biegung', 'mit Biegung'] },
    staerke: { t: 'Wimpernstärke', o: ['sehr fein', 'fein', 'normal', 'sehr stark'], note: 'bestimmt die Einwirkzeit der Lotionen' },
    laenge: { t: 'Wimpernlänge', o: ['kurz', 'normal lang', 'sehr lang'], note: 'bestimmt die Pad-Größe' },
    zustand: { t: 'Zustand der Wimpern', o: ['gesund, kräftig', 'trocken / brüchig', 'lückenhaft', 'Verlängerung / Kleberreste'], multi: true }
  };
  const yes = d => d.faerben === 'ja';

  const FORMS = {
    'Lash Lift': {
      augen: true,
      sections: [
        { h: 'Behandlungsplan', items: [
          { k: 'padL', l: 'Pad-Größe L' }, { k: 'padR', l: 'Pad-Größe R' },
          { k: 'lotion1', l: 'Lotion 1 Einwirkzeit (min)', num: 1 }, { k: 'lotion2', l: 'Lotion 2 Einwirkzeit (min)', num: 1 },
          { k: 'faerben', l: 'Färben', chips: ['ja', 'nein'] },
          { k: 'farbe', l: 'Farbe', show: yes }, { k: 'farbeZeit', l: 'Einwirkzeit Farbe (min)', num: 1, show: yes },
          { k: 'browLift', l: 'Brow Lift dazu', chips: ['ja', 'nein'] }
        ] },
        { h: 'Ergebnis', result: true, items: [
          { k: 'biegung', l: 'Biegung', chips: ['zu schwach', 'genau richtig', 'zu stark'] },
          { k: 'zufrieden', l: 'Kundin zufrieden', chips: ['ja', 'teils', 'nein'] }
        ] }
      ],
      checks: ['Kontraindikationen geprüft', 'Fragebogen unterschrieben', 'Kontaktlinsen raus', 'Wimpern gereinigt, fettfrei', 'Foto vorher', 'Foto nachher', 'Pflegehinweise erklärt', 'Folgetermin vereinbart'],
      summary: d => [['Pad L / R', `${d.padL || '–'} / ${d.padR || '–'}`], ['Lotion 1 / 2', `${d.lotion1 || '–'} / ${d.lotion2 || '–'} min`], ['Färben', yes(d) ? `${d.farbe || '–'} · ${d.farbeZeit || '–'} min` : 'nein'], ['Biegung', d.biegung || '–']]
    },
    'PMU': {
      sections: [
        { h: 'Behandlung', items: [
          { k: 'bereich', l: 'Bereich', chips: ['Augenbrauen', 'Lippen', 'Lidstrich oben', 'Lidstrich unten'], multi: true },
          { k: 'technik', l: 'Technik', chips: ['Powder Brows', 'Ombré Brows', 'Hairstroke maschinell', 'Lip Blush', 'Aquarell-Lippen', 'Lidstrich', 'Wimpernkranz'] },
          { k: 'termin', l: 'Termin', chips: ['Ersttermin', 'Nachbehandlung', 'Auffrischung', 'Korrektur'] },
          { k: 'haut', l: 'Hautbild', chips: ['normal', 'trocken', 'ölig', 'empfindlich', 'reif'] }
        ] },
        { h: 'Pigmente', items: [
          { k: 'pigment1', l: 'Pigment 1 (Hersteller, Farbe)' }, { k: 'charge1', l: 'Charge Pigment 1' },
          { k: 'pigment2', l: 'Pigment 2 (falls gemischt)' }, { k: 'charge2', l: 'Charge Pigment 2' },
          { k: 'mischung', l: 'Mischverhältnis' }, { k: 'haltbar', l: 'Haltbar bis', date: 1 }
        ] },
        { h: 'Gerät & Arbeitsweise', items: [
          { k: 'geraet', l: 'Gerät' }, { k: 'nadel', l: 'Nadel / Modul' },
          { k: 'stufe', l: 'Hub / Stufe / Geschwindigkeit' }, { k: 'durchgaenge', l: 'Durchgänge', num: 1 },
          { k: 'betaeubung', l: 'Betäubung', chips: ['keine', 'Creme vorher', 'Gel während', 'beides'] },
          { k: 'betaeubungMittel', l: 'Betäubungsmittel' }
        ] },
        { h: 'Ergebnis', result: true, items: [
          { k: 'reaktion', l: 'Hautreaktion', chips: ['keine', 'leichte Rötung', 'Schwellung', 'starkes Nachbluten'] },
          { k: 'aufnahme', l: 'Pigmentaufnahme', chips: ['gleichmäßig', 'fleckig', 'schwach'] },
          { k: 'zufrieden', l: 'Kundin zufrieden', chips: ['ja', 'teils', 'nein'] }
        ] }
      ],
      checks: ['Kontraindikationen geprüft', 'Einwilligung unterschrieben', 'Vorzeichnung von Kundin freigegeben', 'Foto vorher', 'Foto nachher', 'Pflegehinweise mitgegeben', 'Nachbehandlung vereinbart'],
      summary: d => [['Technik', d.technik || '–'], ['Termin', d.termin || '–'], ['Pigment', [d.pigment1, d.pigment2].filter(Boolean).join(' + ') || '–'], ['Nadel', d.nadel || '–']]
    },
    'Brow Lift': {
      sections: [
        { h: 'Behandlungsplan', items: [
          { k: 'lotion1', l: 'Lotion 1 Einwirkzeit (min)', num: 1 }, { k: 'lotion2', l: 'Lotion 2 Einwirkzeit (min)', num: 1 },
          { k: 'faerben', l: 'Färben', chips: ['ja', 'nein'] },
          { k: 'farbe', l: 'Farbe', show: yes }, { k: 'farbeZeit', l: 'Einwirkzeit Farbe (min)', num: 1, show: yes },
          { k: 'form', l: 'Formen', chips: ['Zupfen', 'Waxing', 'Faden', 'keins'] }
        ] },
        { h: 'Ergebnis', result: true, items: [
          { k: 'ergebnis', l: 'Lifting', chips: ['zu schwach', 'genau richtig', 'zu stark'] },
          { k: 'zufrieden', l: 'Kundin zufrieden', chips: ['ja', 'teils', 'nein'] }
        ] }
      ],
      checks: ['Kontraindikationen geprüft', 'Fragebogen unterschrieben', 'Foto vorher', 'Foto nachher', 'Pflegehinweise erklärt', 'Folgetermin vereinbart'],
      summary: d => [['Lotion 1 / 2', `${d.lotion1 || '–'} / ${d.lotion2 || '–'} min`], ['Färben', yes(d) ? `${d.farbe || '–'} · ${d.farbeZeit || '–'} min` : 'nein'], ['Lifting', d.ergebnis || '–']]
    },
    'Waxing': {
      sections: [
        { h: 'Behandlung', items: [
          { k: 'zonen', l: 'Zonen', chips: ['Augenbrauen', 'Oberlippe', 'Kinn', 'Gesicht', 'Achseln', 'Arme', 'Beine', 'Bikinizone'], multi: true },
          { k: 'wachs', l: 'Wachs / Zuckerpaste' }, { k: 'temperatur', l: 'Temperatur / Konsistenz' }
        ] },
        { h: 'Ergebnis', result: true, items: [
          { k: 'reaktion', l: 'Hautreaktion', chips: ['keine', 'leichte Rötung', 'Pickelchen', 'Hautabriss'] },
          { k: 'zufrieden', l: 'Kundin zufrieden', chips: ['ja', 'teils', 'nein'] }
        ] }
      ],
      checks: ['Kontraindikationen geprüft', 'Haut gereinigt', 'Pflegehinweise erklärt', 'Folgetermin vereinbart'],
      summary: d => [['Zonen', (d.zonen || []).join(', ') || '–'], ['Wachs', d.wachs || '–'], ['Reaktion', d.reaktion || '–']]
    }
  };
  const ARTS = Object.keys(FORMS);

  const REMINDERS = [
    { l: 'Verheilungscheck in 7 Tagen', t: 'Verheilungscheck', days: 7 },
    { l: 'PMU-Nachbehandlung in 6 Wochen', t: 'PMU-Nachbehandlung', days: 42 },
    { l: 'Lash Lift wieder in 6 Wochen', t: 'Lash Lift erinnern', days: 42 },
    { l: 'PMU-Auffrischung in 12 Monaten', t: 'PMU-Auffrischung anbieten', days: 365 }
  ];

  // ---------- Beispieldaten ----------
  window.FCC_DEMO = [
    { id: 'demo1', vorname: 'Laura', nachname: 'Beispiel', telefon: '0170 1234567', email: 'laura@beispiel.de', allergien: 'keine bekannt', blutverduenner: 'nein', fragebogen: '2026-09-14', notiz: '', dokumente: [],
      behandlungen: [
        { id: 'b2', art: 'Lash Lift', datum: '2026-10-09', nr: 2, fotos: [],
          augen: { augentyp: { L: 'Schlupflid', R: 'Schlupflid' }, wuchs: { L: 'nach unten', R: 'gerade' }, form: { L: 'gerade', R: 'gerade' }, staerke: { L: 'fein', R: 'fein' }, laenge: { L: 'normal lang', R: 'normal lang' }, zustand: { L: ['gesund, kräftig'], R: ['gesund, kräftig'] } },
          daten: { padL: 'S', padR: 'S', lotion1: '7', lotion2: '6', faerben: 'ja', farbe: 'Blauschwarz', farbeZeit: '8', browLift: 'nein', biegung: 'zu stark', zufrieden: 'teils' },
          check: FORMS['Lash Lift'].checks.slice(), naechstes: 'Pad eine Nummer größer (M) und Lotion 1 nur 6 min. Linkes Auge wächst nach unten.', notizen: 'Empfindlich am Unterlid.' },
        { id: 'b1', art: 'Lash Lift', datum: '2026-08-21', nr: 1, fotos: [],
          augen: { augentyp: { L: 'Schlupflid', R: 'Schlupflid' }, wuchs: { L: 'nach unten', R: 'gerade' }, form: { L: 'gerade', R: 'gerade' }, staerke: { L: 'fein', R: 'fein' }, laenge: { L: 'normal lang', R: 'normal lang' }, zustand: { L: ['gesund, kräftig'], R: ['gesund, kräftig'] } },
          daten: { padL: 'XS', padR: 'XS', lotion1: '8', lotion2: '7', faerben: 'nein', browLift: 'nein', biegung: 'zu schwach', zufrieden: 'teils' },
          check: [], naechstes: 'Pad zu klein, nächstes Mal S.', notizen: '' }
      ] },
    { id: 'demo2', vorname: 'Sandra', nachname: 'Muster', telefon: '0151 9876543', email: '', allergien: 'Nickel', blutverduenner: 'nein', fragebogen: '2026-10-02', notiz: '', dokumente: [],
      behandlungen: [
        { id: 'b3', art: 'PMU', datum: '2026-10-02', nr: 1, fotos: [],
          daten: { bereich: ['Augenbrauen'], technik: 'Powder Brows', termin: 'Ersttermin', haut: 'ölig', pigment1: 'Beispielpigment Mittelbraun', charge1: 'A1234', mischung: '', haltbar: '2027-08-31', geraet: 'Beispielgerät', nadel: '1RL 0,30', stufe: 'mittel', durchgaenge: '3', betaeubung: 'Creme vorher', reaktion: 'leichte Rötung', aufnahme: 'gleichmäßig', zufrieden: 'ja' },
          check: ['Kontraindikationen geprüft', 'Einwilligung unterschrieben', 'Vorzeichnung von Kundin freigegeben', 'Foto vorher', 'Foto nachher', 'Pflegehinweise mitgegeben'],
          naechstes: 'Bei der Nachbehandlung den Kopf der Braue weicher auslaufen lassen.', notizen: 'Ölige Haut, Pigment hält eventuell schlechter.' }
      ] },
    { id: 'demo3', vorname: 'Nina', nachname: 'Probe', telefon: '0162 5551234', email: 'nina@beispiel.de', allergien: '', blutverduenner: '', fragebogen: '', notiz: '', dokumente: [], behandlungen: [] }
  ];

  // ---------- Helfer ----------
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = d => d ? new Date(d + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
  const today = () => new Date().toISOString().slice(0, 10);
  const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const clone = o => JSON.parse(JSON.stringify(o));
  const byDate = list => [...list].sort((a, b) => b.datum.localeCompare(a.datum));
  const lastOfArt = (c, art) => byDate(c.behandlungen.filter(b => b.art === art))[0];
  const waNumber = t => { let d = String(t || '').replace(/[^0-9+]/g, ''); if (d.startsWith('+')) return d.slice(1); if (d.startsWith('00')) return d.slice(2); if (d.startsWith('0')) return '49' + d.slice(1); return d; };

  function toast(m, long) {
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = m;
    $('#toastRoot').append(t);
    setTimeout(() => t.remove(), long ? 5000 : 2600);
  }
  async function busy(btn, text, fn) {
    const old = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = text; }
    try { return await fn(); }
    catch (e) { toast(e.message || String(e), true); throw e; }
    finally { if (btn) { btn.disabled = false; btn.textContent = old; } }
  }

  // ---------- Zustand ----------
  let activeId = null;
  let active = null; // vollständige Akte der gewählten Kundin
  let loadingDetail = false;

  // ---------- Start ----------
  function setStatus() {
    const s = $('#status');
    if (Store.mode === 'demo') { s.textContent = 'Beispielmodus · nicht mit Drive verbunden'; s.className = 'status warn'; }
    else { s.textContent = 'Mit Google Drive verbunden'; s.className = 'status ok'; }
    $('#reloadBtn').hidden = Store.mode === 'demo';
    $('#logoutBtn').hidden = Store.mode === 'demo';
  }

  async function startApp() {
    await Store.start();
    $('#login').hidden = true;
    $('#app').hidden = false;
    setStatus();
    if (Store.kontaktFehler) toast('Google Kontakte konnten nicht geladen werden. ' + Store.kontaktFehler, true);
    if (window.innerWidth > 820 && Store.list()[0]) {
      const first = [...Store.list()].sort((a, b) => a.nachname.localeCompare(b.nachname, 'de'))[0];
      await openCustomer(first.id);
    } else render();
  }

  async function boot() {
    if (Store.mode === 'demo') { await startApp(); return; }
    // Läuft die Anmeldung während der Arbeit ab, erscheint die Anmeldekarte über der Kartei; danach geht es an derselben Stelle weiter.
    Store.onNeedLogin = () => new Promise(res => showLogin(async () => { await Store.signIn(); res(); }));
    if (Store.hasToken()) {
      try { await startApp(); return; } catch (e) { toast(e.message, true); }
    }
    $('#app').hidden = true;
    showLogin(async () => { await Store.signIn(); await startApp(); });
  }

  function showLogin(action) {
    $('#login').hidden = false;
    $('#loginBtn').onclick = e => busy(e.currentTarget, 'Verbinde …', async () => { await action(); $('#login').hidden = true; }).catch(() => {});
  }

  $('#reloadBtn').onclick = e => busy(e.currentTarget, 'Lädt …', async () => { await Store.rebuildIndex(); render(); toast(Store.kontaktFehler ? 'Akten aktualisiert. Google Kontakte konnten nicht geladen werden: ' + Store.kontaktFehler : 'Aktualisiert, auch die Google-Kontakte', !!Store.kontaktFehler); }).catch(() => {});
  $('#logoutBtn').onclick = () => { Store.signOut(); active = null; activeId = null; boot(); };

  // ---------- Liste ----------
  function renderList() {
    const qy = $('#search').value.toLowerCase().trim();
    const all = Store.list();
    const list = all.filter(c => (c.vorname + ' ' + c.nachname + ' ' + c.telefon).toLowerCase().includes(qy))
      .sort((a, b) => a.nachname.localeCompare(b.nachname, 'de'));
    $('#count').textContent = all.length + (all.length === 1 ? ' Kundin' : ' Kundinnen');
    $('#clist').innerHTML = list.length ? list.map(c => `<li><button data-id="${esc(c.id)}" class="${c.id === activeId ? 'active' : ''}">
      <span><span class="cname">${esc(c.nachname)}, ${esc(c.vorname)}</span><br><span class="cmeta">${c.letzte ? 'zuletzt ' + fmt(c.letzte.datum) : 'noch keine Behandlung'}</span></span>
      ${c.letzte ? `<span class="tag">${esc(c.letzte.art)}</span>` : (c.nurKontakt ? '<span class="tag">Kontakt</span>' : '')}</button></li>`).join('')
      : `<li class="empty">${all.length ? 'Keine Kundin gefunden.' : 'Noch keine Kundin angelegt.'}</li>`;
  }
  $('#clist').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b) openCustomer(b.dataset.id); });
  $('#search').addEventListener('input', renderList);
  $('#newCustBtn').addEventListener('click', () => openCustomerSheet(null));

  async function openCustomer(id) {
    activeId = id; active = null; loadingDetail = true; render();
    try {
      const e = Store.list().find(x => x.id === id);
      const c = await Store.load(e);
      c.behandlungen = c.behandlungen || []; c.dokumente = c.dokumente || [];
      if (activeId === id) active = c;
    } catch (err) { toast(err.message, true); }
    loadingDetail = false; render();
  }

  // ---------- Akte ----------
  function lastTimeCard(c) {
    const b = byDate(c.behandlungen)[0];
    if (!b) return '';
    const f = FORMS[b.art];
    return `<div class="lasttime">
      <div class="row between"><span class="label">Beim letzten Mal · ${esc(b.art)} · ${fmt(b.datum)}${b.nr ? ' · Nr. ' + esc(b.nr) : ''}</span>
      <button class="btn ghost small" data-open="${esc(b.id)}">Bogen öffnen</button></div>
      ${b.naechstes ? `<div class="hint">„${esc(b.naechstes)}“</div>` : ''}
      <div class="kv">${f ? f.summary(b.daten || {}).map(([k, v]) => `<div><span class="label">${esc(k)}</span><b>${esc(v)}</b></div>`).join('') : ''}</div>
    </div>`;
  }

  function renderDetail() {
    const el = $('#detail');
    $('#main').classList.toggle('has-detail', !!activeId);
    if (!activeId) { el.innerHTML = '<div class="panel empty">Wähle links eine Kundin aus oder lege eine neue an.</div>'; return; }
    if (loadingDetail || !active) { el.innerHTML = `<button class="back" id="backBtn">← Alle Kundinnen</button><div class="panel empty">${loadingDetail ? 'Akte wird geladen …' : 'Die Akte konnte nicht geladen werden.'}</div>`; $('#backBtn').onclick = back; return; }
    const c = active;
    const sorted = byDate(c.behandlungen);
    const fbOk = !!c.fragebogen;
    const tel = c.telefon ? `${esc(c.telefon)} <a class="mini" href="https://wa.me/${esc(waNumber(c.telefon))}" target="_blank" rel="noopener">WhatsApp</a>` : '–';
    el.innerHTML = `
      <button class="back" id="backBtn">← Alle Kundinnen</button>
      <div class="panel card">
        <div class="row between top-align">
          <div><span class="label">Kundenakte</span><h1>${esc(c.vorname)} ${esc(c.nachname)}</h1></div>
          <button class="btn ghost small" id="editCust">Daten ändern</button>
        </div>
        <div class="facts">
          <div><span class="label">Telefon</span><br>${tel}</div>
          <div><span class="label">E-Mail</span><br>${esc(c.email) || '–'}</div>
          <div><span class="label">Allergien</span><br>${esc(c.allergien) || '–'}</div>
          <div><span class="label">Blutverdünner</span><br>${esc(c.blutverduenner) || '–'}</div>
          <div><span class="label">Kontraindikationen</span><br><span class="pill ${fbOk ? 'ok' : 'warn'}">${fbOk ? 'Fragebogen vom ' + fmt(c.fragebogen) : 'Fragebogen fehlt'}</span></div>
        </div>
        ${c.notiz ? `<p class="cnote">${esc(c.notiz)}</p>` : ''}
      </div>
      <div class="panel card">
        <span class="label">Neue Behandlung</span>
        <div class="chips">${ARTS.map(a => `<button class="chip add" data-new="${esc(a)}">+ ${esc(a)}</button>`).join('')}</div>
      </div>
      ${lastTimeCard(c)}
      <div class="panel card">
        <div class="row between"><h2>Behandlungsverlauf</h2><span class="label">${sorted.length} ${sorted.length === 1 ? 'Eintrag' : 'Einträge'}</span></div>
        ${sorted.length ? `<ul class="timeline">${sorted.map(b => {
          const f = FORMS[b.art];
          const sum = f ? f.summary(b.daten || {}).map(([k, v]) => k + ': ' + v).join(' · ') : '';
          return `<li><span class="tdate">${fmt(b.datum)}</span>
            <span class="tmain"><b>${esc(b.art)}${b.nr ? ' · Nr. ' + esc(b.nr) : ''}</b>${(b.fotos || []).length ? ` <span class="cmeta">· ${b.fotos.length} Foto${b.fotos.length > 1 ? 's' : ''}</span>` : ''}<br><span class="cmeta">${esc(sum)}</span></span>
            <button class="btn ghost small" data-open="${esc(b.id)}">Ansehen</button></li>`;
        }).join('')}</ul>` : '<p class="empty">Noch keine Behandlung. Wähle oben die Behandlung aus.</p>'}
      </div>
      <div class="grid-2col">
        <div class="panel card">
          <div class="row between"><h2>Dokumente</h2><button class="btn ghost small" id="docBtn">+ Dokument</button></div>
          <input type="file" id="docInput" hidden>
          ${c.dokumente.length ? `<ul class="docs">${c.dokumente.map(d => `<li><span>${esc(d.name)}<br><span class="cmeta">${fmt(d.datum)}</span></span>${d.link ? `<a class="mini" href="${esc(d.link)}" target="_blank" rel="noopener">In Drive öffnen</a>` : ''}</li>`).join('')}</ul>` : '<p class="cmeta">Hier landen unterschriebene Fragebögen, Einwilligungen und Rechnungen.</p>'}
        </div>
        <div class="panel card">
          <h2>Erinnerung im Kalender</h2>
          <div class="field" style="margin-top:12px"><label for="remSel">Was und wann</label>
            <select id="remSel">${REMINDERS.map((r, i) => `<option value="${i}">${esc(r.l)} (${fmt(addDays(r.days))})</option>`).join('')}</select></div>
          <button class="btn small" id="remBtn" style="margin-top:12px">In Google Kalender eintragen</button>
        </div>
      </div>`;
    $('#backBtn').onclick = back;
    $('#editCust').onclick = () => openCustomerSheet(c);
    $$('[data-new]').forEach(b => b.onclick = () => openTreatmentSheet(c, b.dataset.new, null));
    $$('[data-open]').forEach(b => b.onclick = () => { const t = c.behandlungen.find(x => x.id === b.dataset.open); if (t) openTreatmentSheet(c, t.art, t); });
    $('#docBtn').onclick = () => $('#docInput').click();
    $('#docInput').onchange = e => {
      const file = e.target.files[0]; e.target.value = '';
      if (!file) return;
      busy($('#docBtn'), 'Lädt hoch …', async () => {
        const d = await Store.addDoc(c, file);
        c.dokumente.unshift(d);
        await Store.save(c);
        render(); toast('Dokument abgelegt');
      }).catch(() => {});
    };
    $('#remBtn').onclick = e => {
      const r = REMINDERS[Number($('#remSel').value)];
      const date = addDays(r.days);
      busy(e.currentTarget, 'Trägt ein …', async () => {
        await Store.remind(`${r.t}: ${c.vorname} ${c.nachname}`, date, `${C.STUDIO || 'Facecolorconcept'} Kundenkartei`);
        toast(Store.mode === 'demo' ? 'Im Beispielmodus wird nichts eingetragen.' : 'Eingetragen für den ' + fmt(date));
      }).catch(() => {});
    };
  }
  function back() { activeId = null; active = null; render(); }

  // ---------- Kundin anlegen/ändern ----------
  function sheetShell(title, sub, body, saveLabel) {
    $('#sheetRoot').innerHTML = `<div class="sheet-bg" id="bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-head"><div class="wrap"><div>${sub ? `<span class="label">${esc(sub)}</span>` : ''}<h2>${esc(title)}</h2></div><button class="btn ghost small" id="cx">Schließen</button></div></div>
      ${body}
      <div class="sheet-foot"><div class="wrap"><button class="btn ghost" id="cx2">Abbrechen</button><button class="btn" id="save">${esc(saveLabel)}</button></div></div>
    </div></div>`;
    const close = () => { $('#sheetRoot').innerHTML = ''; };
    $('#cx').onclick = close; $('#cx2').onclick = close;
    return close;
  }

  function openCustomerSheet(c) {
    const d = c || { vorname: '', nachname: '', telefon: '', email: '', allergien: '', blutverduenner: '', fragebogen: '', notiz: '' };
    const close = sheetShell(c ? 'Daten ändern' : 'Neue Kundin', '', `<form class="wrap sec" id="cf" onsubmit="return false"><div class="grid2">
      <div class="field"><label for="f-vn">Vorname *</label><input id="f-vn" autocomplete="off" value="${esc(d.vorname)}"></div>
      <div class="field"><label for="f-nn">Nachname *</label><input id="f-nn" autocomplete="off" value="${esc(d.nachname)}"></div>
      <div class="field"><label for="f-tel">Telefon</label><input id="f-tel" type="tel" value="${esc(d.telefon)}"></div>
      <div class="field"><label for="f-mail">E-Mail</label><input id="f-mail" type="email" value="${esc(d.email)}"></div>
      <div class="field"><label for="f-all">Allergien</label><input id="f-all" value="${esc(d.allergien)}"></div>
      <div class="field"><label for="f-bv">Blutverdünner</label><select id="f-bv">${['', 'nein', 'ja'].map(v => `<option value="${v}" ${d.blutverduenner === v ? 'selected' : ''}>${v || 'nicht gefragt'}</option>`).join('')}</select></div>
      <div class="field"><label for="f-fb">Kontraindikations-Fragebogen unterschrieben am</label><input id="f-fb" type="date" value="${esc(d.fragebogen)}"></div>
      <div class="field full"><label for="f-notiz">Notiz zur Kundin</label><textarea id="f-notiz" rows="2">${esc(d.notiz)}</textarea></div>
    </div></form>`, 'Speichern');
    $('#f-vn').focus();
    $('#save').onclick = e => {
      const v = { vorname: $('#f-vn').value.trim(), nachname: $('#f-nn').value.trim(), telefon: $('#f-tel').value.trim(), email: $('#f-mail').value.trim(), allergien: $('#f-all').value.trim(), blutverduenner: $('#f-bv').value, fragebogen: $('#f-fb').value, notiz: $('#f-notiz').value.trim() };
      if (!v.vorname || !v.nachname) { toast('Bitte Vor- und Nachname eintragen.'); return; }
      busy(e.currentTarget, 'Speichert …', async () => {
        let target = c;
        if (c) Object.assign(c, v);
        else target = { id: uid(), behandlungen: [], dokumente: [], ...v };
        await Store.save(target);
        close();
        if (!c) { activeId = target.id; active = target; }
        render(); toast(c ? 'Gespeichert' : 'Kundin angelegt und in Google Kontakte eingetragen');
      }).catch(() => {});
    };
  }

  // ---------- Behandlungsbogen ----------
  function emptyTreatment(c, art) {
    const f = FORMS[art];
    const t = { id: uid(), art, datum: today(), nr: c.behandlungen.filter(b => b.art === art).length + 1, daten: {}, check: [], fotos: [], naechstes: '', notizen: '' };
    if (f.augen) t.augen = Object.fromEntries(Object.entries(EYE).map(([k, s]) => [k, { L: s.multi ? [] : '', R: s.multi ? [] : '' }]));
    f.sections.forEach(s => s.items.forEach(it => { if (it.multi) t.daten[it.k] = []; }));
    return t;
  }

  function openTreatmentSheet(c, art, existing) {
    const f = FORMS[art];
    const isNew = !existing;
    const prev = isNew ? lastOfArt(c, art) : null;
    const d = existing ? clone(existing) : emptyTreatment(c, art);
    d.fotos = d.fotos || []; d.daten = d.daten || {}; d.check = d.check || [];
    let uploading = 0;

    const has = (val, o) => Array.isArray(val) ? val.includes(o) : val === o;

    function eyeTable(k, i) {
      const s = EYE[k];
      return `<div class="sec wrap"><h3><span class="n">${i + 1}</span>${esc(s.t)}</h3>
        <table class="lr"><thead><tr><th></th><th>L</th><th>R</th></tr></thead><tbody>${s.o.map(o => `<tr><td>${esc(o)}</td>${['L', 'R'].map(eye => {
          const on = has(d.augen[k][eye], o);
          const was = prev && prev.augen && prev.augen[k] && has(prev.augen[k][eye], o);
          return `<td class="c"><button type="button" class="dot ${on ? 'on' : ''} ${!on && was ? 'prev' : ''}" data-eye="${eye}" data-k="${k}" data-o="${esc(o)}" aria-pressed="${on}" aria-label="${esc(s.t)} ${eye === 'L' ? 'links' : 'rechts'}: ${esc(o)}">${eye}</button></td>`;
        }).join('')}</tr>`).join('')}</tbody></table>
        ${s.note ? `<div class="note">${esc(s.note)}</div>` : ''}</div>`;
    }

    function item(it) {
      if (it.show && !it.show(d.daten)) return '';
      const val = d.daten[it.k];
      const pv = prev && prev.daten ? prev.daten[it.k] : undefined;
      if (it.chips) {
        return `<div class="field full"><span class="flabel">${esc(it.l)}${it.multi ? ' <span class="cmeta">(mehrere möglich)</span>' : ''}</span><div class="chips">${it.chips.map(o => {
          const on = has(val, o); const was = pv != null && has(pv, o);
          return `<button type="button" class="chip ${on ? 'on' : ''} ${!on && was ? 'prev' : ''}" data-k="${it.k}" data-o="${esc(o)}" aria-pressed="${on}">${esc(o)}</button>`;
        }).join('')}</div></div>`;
      }
      const type = it.date ? 'date' : 'text';
      const ph = pv ? `zuletzt: ${pv}` : '';
      return `<div class="field"><label for="d-${it.k}">${esc(it.l)}</label><input id="d-${it.k}" data-dk="${it.k}" type="${type}" ${it.num ? 'inputmode="decimal"' : ''} placeholder="${esc(ph)}" value="${esc(val || '')}"></div>`;
    }

    function photos(typ) {
      const list = d.fotos.filter(p => p.typ === typ);
      return `<div class="phbox"><div class="row between"><span class="label">${typ}</span><button type="button" class="btn ghost small" data-photo="${typ}">+ Foto</button></div>
        <div class="thumbs">${list.length ? list.map(p => `<button type="button" class="thumb" data-fid="${esc(p.fileId)}" aria-label="Foto ${typ} vergrößern"><img alt="" data-src="${esc(p.fileId)}"></button>`).join('') : '<span class="cmeta">noch kein Foto</span>'}</div></div>`;
    }

    const startNr = f.augen ? Object.keys(EYE).length : 0;
    function body() {
      return `<div class="wrap sec">
          <div class="grid2">
            <div class="field"><label for="t-datum">Datum</label><input id="t-datum" type="date" value="${esc(d.datum)}"></div>
            <div class="field"><label for="t-nr">Behandlung Nr.</label><input id="t-nr" inputmode="numeric" value="${esc(d.nr)}"></div>
          </div>
          ${prev ? `<div class="banner"><span>Letzte ${esc(art)}-Behandlung am ${fmt(prev.datum)}.${prev.naechstes ? ' <b>Nächstes Mal anders:</b> ' + esc(prev.naechstes) : ''}</span><button type="button" class="btn small" id="takeOver">Werte übernehmen</button></div>
          <div class="legend"><span class="dot prev"></span> gestrichelt = so war es beim letzten Mal</div>` : ''}
        </div>
        ${f.augen ? Object.keys(EYE).map(eyeTable).join('') : ''}
        ${f.sections.map((s, i) => `<div class="sec wrap"><h3><span class="n">${startNr + i + 1}</span>${esc(s.h)}</h3><div class="grid2">${s.items.map(item).join('')}</div></div>`).join('')}
        <div class="sec wrap"><h3><span class="n">${startNr + f.sections.length + 1}</span>Checkliste</h3>
          <div class="chips">${f.checks.map(x => `<button type="button" class="chip ${d.check.includes(x) ? 'on' : ''}" data-check="${esc(x)}" aria-pressed="${d.check.includes(x)}">${d.check.includes(x) ? '✓ ' : ''}${esc(x)}</button>`).join('')}</div>
        </div>
        <div class="sec wrap"><h3><span class="n">${startNr + f.sections.length + 2}</span>Fotos</h3>
          <input type="file" id="photoInput" accept="image/*" multiple hidden>
          <div class="grid2">${photos('Vorher')}${photos('Nachher')}</div>
          ${uploading ? `<p class="cmeta">${uploading === 1 ? '1 Foto wird' : uploading + ' Fotos werden'} hochgeladen …</p>` : ''}
        </div>
        <div class="sec wrap"><h3><span class="n">${startNr + f.sections.length + 3}</span>Notizen</h3>
          <div class="field" style="margin-top:10px"><label for="t-next">Nächstes Mal anders</label><textarea id="t-next" rows="2">${esc(d.naechstes)}</textarea></div>
          <div class="field" style="margin-top:10px"><label for="t-notes">Notizen</label><textarea id="t-notes" rows="2">${esc(d.notizen)}</textarea></div>
        </div>`;
    }

    function readInputs() {
      const g = id => document.getElementById(id);
      if (g('t-datum')) d.datum = g('t-datum').value || d.datum;
      if (g('t-nr')) d.nr = g('t-nr').value;
      $$('[data-dk]').forEach(i => { d.daten[i.dataset.dk] = i.value; });
      if (g('t-next')) d.naechstes = g('t-next').value;
      if (g('t-notes')) d.notizen = g('t-notes').value;
    }

    let close;
    function draw() {
      const sheet = $('.sheet'); const y = sheet ? sheet.scrollTop : 0;
      close = sheetShell(art, `${c.vorname} ${c.nachname}`, body(), 'Bogen speichern');
      $('.sheet').scrollTop = y;
      bind();
    }
    function redraw(fn) { readInputs(); fn(); draw(); }

    function bind() {
      $$('.dot[data-eye]').forEach(b => b.onclick = () => redraw(() => {
        const { k, eye, o } = b.dataset; const s = EYE[k];
        if (s.multi) { const a = d.augen[k][eye]; const i = a.indexOf(o); i >= 0 ? a.splice(i, 1) : a.push(o); }
        else d.augen[k][eye] = d.augen[k][eye] === o ? '' : o;
      }));
      $$('.chip[data-k]').forEach(b => b.onclick = () => redraw(() => {
        const { k, o } = b.dataset;
        const it = f.sections.flatMap(s => s.items).find(x => x.k === k);
        if (it.multi) { const a = Array.isArray(d.daten[k]) ? d.daten[k] : (d.daten[k] = []); const i = a.indexOf(o); i >= 0 ? a.splice(i, 1) : a.push(o); }
        else d.daten[k] = d.daten[k] === o ? '' : o;
      }));
      $$('.chip[data-check]').forEach(b => b.onclick = () => redraw(() => { const x = b.dataset.check; const i = d.check.indexOf(x); i >= 0 ? d.check.splice(i, 1) : d.check.push(x); }));
      const tk = $('#takeOver');
      if (tk) tk.onclick = () => redraw(() => {
        if (prev.augen) d.augen = clone(prev.augen);
        const resetKeys = f.sections.filter(s => s.result).flatMap(s => s.items.map(i => i.k));
        d.daten = clone(prev.daten || {});
        resetKeys.forEach(k => { d.daten[k] = Array.isArray(d.daten[k]) ? [] : ''; });
        toast('Werte vom ' + fmt(prev.datum) + ' übernommen. Bitte anpassen.');
      });
      // Fotos
      let photoTyp = 'Vorher';
      $$('[data-photo]').forEach(b => b.onclick = () => { photoTyp = b.dataset.photo; $('#photoInput').click(); });
      $('#photoInput').onchange = async e => {
        const files = [...e.target.files]; e.target.value = '';
        if (!files.length) return;
        const typ = photoTyp;
        readInputs(); uploading += files.length; draw();
        let ok = 0;
        for (const file of files) {
          try {
            const n = d.fotos.filter(p => p.typ === typ).length + 1;
            const p = await Store.addPhoto(c, file, `${d.datum}_${art.replace(/\s/g, '-')}_${typ}_${n}.jpg`);
            d.fotos.push({ ...p, typ });
            ok++;
          } catch (err) { toast(err.message, true); }
          uploading--;
          if ($('.sheet')) { readInputs(); draw(); }
        }
        if (ok) toast(ok === 1 ? 'Foto gespeichert' : ok + ' Fotos gespeichert');
      };
      $$('img[data-src]').forEach(async img => {
        const p = d.fotos.find(x => x.fileId === img.dataset.src);
        try { img.src = await Store.photoUrl(p); } catch (e) { img.alt = 'Foto lädt nicht'; }
      });
      $$('.thumb').forEach(t => t.onclick = () => { const src = t.querySelector('img').src; if (src) showPhoto(src); });

      $('#save').onclick = e => {
        if (uploading) { toast('Bitte warten, bis das Foto hochgeladen ist.'); return; }
        readInputs();
        busy(e.currentTarget, 'Speichert …', async () => {
          const i = c.behandlungen.findIndex(b => b.id === d.id);
          const before = clone(c);
          if (i >= 0) c.behandlungen[i] = d; else c.behandlungen.push(d);
          if ((d.check.includes('Fragebogen unterschrieben') || d.check.includes('Einwilligung unterschrieben')) && !c.fragebogen) c.fragebogen = d.datum;
          try { await Store.save(c); }
          catch (err) { Object.assign(c, before); throw err; }
          close(); render(); toast('Bogen gespeichert');
        }).catch(() => {});
      };
    }
    draw();
  }

  function showPhoto(src) {
    const o = document.createElement('div');
    o.className = 'lightbox'; o.innerHTML = `<img alt="Foto" src="${esc(src)}"><button class="btn small">Schließen</button>`;
    o.onclick = () => o.remove();
    document.body.append(o);
  }

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const lb = $('.lightbox'); if (lb) { lb.remove(); return; }
    if ($('#sheetRoot').innerHTML) $('#sheetRoot').innerHTML = '';
  });

  function render() { renderList(); renderDetail(); }

  // Hinweis „Zum Home-Bildschirm“ auf dem iPhone, solange die Kartei im Safari-Tab läuft
  (function installHint() {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    let dismissed = false;
    try { dismissed = localStorage.getItem('fcc_hint_off') === '1'; } catch (e) {}
    if (!ios || standalone || dismissed) return;
    const h = $('#installHint');
    h.hidden = false;
    $('#hintClose').onclick = () => { h.hidden = true; try { localStorage.setItem('fcc_hint_off', '1'); } catch (e) {} };
  })();

  boot().catch(e => toast(e.message || String(e), true));
})();
