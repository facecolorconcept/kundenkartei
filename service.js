// E-Mail-Service: Pflegehinweise nach der Behandlung und Erinnerungen an Nachbehandlung oder Auffrischung.
// Pflegehinweise gehören zur Behandlung und gehen an jede Kundin mit E-Mail-Adresse.
// Erinnerungen gehen nur an Kundinnen, die im Formular „E-Mail-Service“ zugestimmt haben (und nicht widerrufen haben).
// Die Texte stehen in Administration → Mail-Texte und lassen sich dort ändern.
(function () {
  'use strict';
  const FCC = window.FCC = window.FCC || {};
  const C = window.FCC_CONFIG || {};
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const p2 = n => String(n).padStart(2, '0');
  const heute = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
  const jetzt = () => { const d = new Date(); return `${heute()}T${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const fmt = d => d ? String(d).slice(0, 10).split('-').reverse().join('.') : '';
  const toast = (m, l) => FCC.toast && FCC.toast(m, l);
  const mailOk = a => /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(String(a || '').trim());

  const S = {
    name: C.STUDIO || 'Facecolorconcept', kurz: C.INHABERIN || 'Kati', inh: C.INHABERIN_NAME || 'Katharina Perschka',
    adr: C.ADRESSE || 'Elisabeth-Silbereisen-Weg 7, 74931 Lobbach-Lobenfeld', tel: C.TELEFON || '0174 8522700',
    web: C.WEBSITE || 'facecolorconcept.de'
  };
  const GRUSS = 'Liebe Grüße\n{kati}\n\n{studio}\n{adresse}\n{telefon} · {web}';

  // ---------- Standardtexte (aus Katis Formularen übernommen) ----------
  const PMU_REGELN = '• Die pigmentierte Stelle nicht mit Wasser, Seife oder Kosmetik in Berührung bringen und nicht mit den Fingern anfassen.\n' +
    '• Vor dem Eincremen die Stelle vorsichtig mit einem feuchten Wattepad abtupfen.\n' +
    '• Die empfohlene Pflegecreme nur dünn mit einem sauberen Wattestäbchen auftragen.\n' +
    '• Bitte keine anderen Wundheil- oder Pflegeprodukte verwenden, das kann zu Entzündungen führen.\n' +
    '• Kein Sport mit starkem Schwitzen, keine Sauna, kein Solarium und keine starke Sonne.';
  const TEXTE = {
    'pflege-pmu-brauen': { gruppe: 'Pflegehinweise', l: 'PMU Augenbrauen', betreff: 'Deine Pflegehinweise für deine Augenbrauen',
      text: `Hallo {vorname},\n\ndanke für deinen Besuch am {datum}. Damit dein Permanent Make-up schön abheilt, hier noch einmal deine Pflegehinweise für die nächsten 14 Tage:\n\n${PMU_REGELN}\n\nWenn dir etwas komisch vorkommt, melde dich einfach bei mir.\n\n${GRUSS}` },
    'pflege-pmu-lippen': { gruppe: 'Pflegehinweise', l: 'PMU Lippen', betreff: 'Deine Pflegehinweise für deine Lippen',
      text: `Hallo {vorname},\n\ndanke für deinen Besuch am {datum}. Damit dein Permanent Make-up schön abheilt, hier noch einmal deine Pflegehinweise für die nächsten 14 Tage:\n\n${PMU_REGELN}\n\nWenn dir etwas komisch vorkommt, melde dich einfach bei mir.\n\n${GRUSS}`,
      tipp: 'Gleiche Grundregeln wie bei den Brauen. Ergänze hier, was du bei Lippen zusätzlich sagst.' },
    'pflege-pmu-lid': { gruppe: 'Pflegehinweise', l: 'PMU Lidstrich', betreff: 'Deine Pflegehinweise für deinen Lidstrich',
      text: `Hallo {vorname},\n\ndanke für deinen Besuch am {datum}. Damit dein Permanent Make-up schön abheilt, hier noch einmal deine Pflegehinweise für die nächsten 14 Tage:\n\n${PMU_REGELN}\n\nWenn dir etwas komisch vorkommt, melde dich einfach bei mir.\n\n${GRUSS}` },
    'pflege-lash': { gruppe: 'Pflegehinweise', l: 'Lash Lift', betreff: 'Deine Pflegehinweise nach dem Lash Lift',
      text: `Hallo {vorname},\n\ndanke für deinen Besuch am {datum}. Damit dein Lash Lift lange hält, beachte bitte in den ersten 24 bis 48 Stunden:\n\n• kein Wasser an die Wimpern\n• kein Dampf und keine Sauna\n• kein Augen-Make-up\n• nicht an den Augen reiben\n\nWenn dir etwas komisch vorkommt, melde dich einfach bei mir.\n\n${GRUSS}` },
    'pflege-brow': { gruppe: 'Pflegehinweise', l: 'Brow Lift', betreff: 'Deine Pflegehinweise nach dem Brow Lift',
      text: `Hallo {vorname},\n\ndanke für deinen Besuch am {datum}. Damit dein Brow Lift lange hält, beachte bitte in den ersten 24 bis 48 Stunden:\n\n• kein Wasser an die Brauen\n• kein Dampf und keine Sauna\n• kein Make-up an den Brauen\n• nicht an den Brauen reiben\n\nWenn dir etwas komisch vorkommt, melde dich einfach bei mir.\n\n${GRUSS}` },
    'pflege-waxing': { gruppe: 'Pflegehinweise', l: 'Waxing', betreff: 'Deine Pflegehinweise nach dem Waxing',
      text: `Hallo {vorname},\n\ndanke für deinen Besuch am {datum}. Für ein schönes Ergebnis nach dem Waxing:\n\n• PINK SkinClean Lotion schützt die Haut und beugt eingewachsenen Haaren vor.\n• PINK Hair Growth Minimizer beruhigt die Haut und verlangsamt das Haarwachstum.\n• Ab dem 3. Tag etwa dreimal pro Woche peelen.\n\nWenn dir etwas komisch vorkommt, melde dich einfach bei mir.\n\n${GRUSS}` },
    'erinnerung-pmu-nach': { gruppe: 'Erinnerungen', l: 'PMU Nachbehandlung', betreff: 'Zeit für deine Nachbehandlung',
      text: `Hallo {vorname},\n\ndein Permanent Make-up vom {datum} ist jetzt gut abgeheilt. Zeit für die Nachbehandlung: Dabei gleiche ich die Farbe aus, damit dein Ergebnis gleichmäßig und haltbar wird.\n\nAntworte einfach auf diese Mail oder ruf mich an.\nOnline buchen: {buchung}\n\n${GRUSS}` },
    'erinnerung-pmu-auff': { gruppe: 'Erinnerungen', l: 'PMU Auffrischung', betreff: 'Lust auf eine Auffrischung?',
      text: `Hallo {vorname},\n\ndeine letzte Permanent-Make-up-Behandlung war am {datum}. Mit der Zeit wird die Farbe heller. Mit einer Auffrischung sieht alles wieder frisch aus.\n\nAntworte einfach auf diese Mail oder ruf mich an.\nOnline buchen: {buchung}\n\n${GRUSS}` },
    'erinnerung-lash': { gruppe: 'Erinnerungen', l: 'Lash Lift wieder fällig', betreff: 'Dein Lash Lift ist wieder fällig',
      text: `Hallo {vorname},\n\ndein Lash Lift vom {datum} ist jetzt einige Wochen her. Die Wimpern wachsen nach und der Schwung lässt langsam nach. Wenn du magst, machen wir einen neuen Termin.\n\nAntworte einfach auf diese Mail oder ruf mich an.\nOnline buchen: {buchung}\n\n${GRUSS}` },
    'erinnerung-brow': { gruppe: 'Erinnerungen', l: 'Brow Lift wieder fällig', betreff: 'Dein Brow Lift ist wieder fällig',
      text: `Hallo {vorname},\n\ndein Brow Lift vom {datum} ist jetzt einige Wochen her. Die Härchen wachsen nach und die Form lässt langsam nach. Wenn du magst, machen wir einen neuen Termin.\n\nAntworte einfach auf diese Mail oder ruf mich an.\nOnline buchen: {buchung}\n\n${GRUSS}` }
  };
  const ABMELDEN = '\n\nDu möchtest keine Erinnerungen mehr? Antworte kurz mit „Abmelden“.';

  let eigene = null; // Katis geänderte Texte aus Administration (texte.json)
  async function texteLaden() {
    if (eigene) return eigene;
    try { eigene = (Store.adminLesen && await Store.adminLesen('texte.json', {})) || {}; } catch (e) { eigene = {}; }
    return eigene;
  }
  FCC.mailTexte = { standard: TEXTE, laden: texteLaden, setzen: t => { eigene = t; } };
  const vorlage = k => Object.assign({}, TEXTE[k], (eigene || {})[k] || {});

  // Platzhalter füllen; Zeilen mit {buchung} fallen weg, solange kein Buchungslink eingetragen ist
  function fuellen(text, w) {
    const buchung = /^https:\/\//.test(C.BUCHUNG_URL || '') ? C.BUCHUNG_URL : '';
    const werte = { vorname: w.vorname || '', datum: fmt(w.datum), studio: S.name, kati: S.kurz, adresse: S.adr, telefon: S.tel, web: S.web, buchung };
    return String(text).split('\n').filter(z => buchung || !z.includes('{buchung}')).join('\n')
      .replace(/\{(\w+)\}/g, (m, k) => k in werte ? werte[k] : m);
  }

  // Welche Pflegehinweise passen zu einem Behandlungsbogen?
  function pflegeSchluessel(b) {
    const d = b.daten || {}; const ber = [].concat(d.bereich || []);
    if (b.art === 'Lash Lift') return ['pflege-lash'];
    if (b.art === 'Brow Lift') return ['pflege-brow'];
    if (b.art === 'Waxing') return ['pflege-waxing'];
    if (b.art === 'PMU') {
      const k = [];
      if (ber.includes('Augenbrauen')) k.push('pflege-pmu-brauen');
      if (ber.includes('Lippen')) k.push('pflege-pmu-lippen');
      if (ber.some(x => /^Lidstrich/.test(x))) k.push('pflege-pmu-lid');
      return k.length ? k : ['pflege-pmu-brauen'];
    }
    return [];
  }
  FCC.pflegeSchluessel = pflegeSchluessel;

  // ---------- Fenster zum Prüfen und Senden ----------
  // mails = [{ c, an, betreff, text, vermerk(c) }]; titel, hinweis
  function fenster({ titel, unter, mails, hinweis, fertig }) {
    const rt = document.getElementById('sheetRoot');
    const einzel = mails.length === 1;
    rt.innerHTML = `<div class="sheet-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(titel)}">
      <div class="sheet-head"><div class="wrap"><div><span class="label">${esc(unter || '')}</span><h2>${esc(titel)}</h2></div><button class="btn ghost small" id="svZu">Schließen</button></div></div>
      <div class="wrap sec">
        ${hinweis ? `<p class="cmeta" style="margin:0 0 12px">${hinweis}</p>` : ''}
        ${mails.map((m, i) => `<div class="sv-mail${einzel ? '' : ' panel'}" data-i="${i}">
          ${einzel ? '' : `<label class="sv-wahl"><input type="checkbox" data-an="${i}" ${m.an ? 'checked' : 'disabled'}> <b>${esc(m.name)}</b> <span class="cmeta">${esc(m.info || '')}</span></label>`}
          <div class="grid2">
            <div class="field full"><label for="svAn${i}">An</label><input id="svAn${i}" type="email" autocapitalize="off" value="${esc(m.an || '')}" placeholder="E-Mail-Adresse der Kundin"></div>
            <div class="field full"><label for="svB${i}">Betreff</label><input id="svB${i}" value="${esc(m.betreff)}"></div>
            <details class="field full" ${einzel ? 'open' : ''}><summary>Text ${einzel ? '' : 'ansehen und ändern'}</summary><textarea id="svT${i}" rows="${einzel ? 14 : 10}" style="margin-top:6px">${esc(m.text)}</textarea></details>
          </div></div>`).join('')}
        <p class="cmeta" style="margin:12px 0 0">Absender: <b id="svAbs">wird geprüft …</b></p>
      </div>
      <div class="sheet-foot"><div class="wrap"><button class="btn ghost" id="svZu2">Abbrechen</button><button class="btn" id="svLos">${einzel ? 'Senden' : 'Alle markierten senden'}</button></div></div>
    </div></div>`;
    const zu = () => { rt.innerHTML = ''; };
    rt.querySelector('#svZu').onclick = zu; rt.querySelector('#svZu2').onclick = zu;
    const abs = rt.querySelector('#svAbs');
    if (Store.absender) Store.absender().then(a => { abs.textContent = a || 'dein angemeldetes Google-Konto'; }).catch(() => { abs.textContent = 'dein angemeldetes Google-Konto'; });
    rt.querySelector('#svLos').onclick = async e => {
      const auswahl = mails.map((m, i) => ({ m, i })).filter(({ i }) => einzel || (rt.querySelector(`[data-an="${i}"]`) || {}).checked);
      if (!auswahl.length) { toast('Bitte mindestens eine Kundin markieren.'); return; }
      for (const { i } of auswahl) if (!mailOk(rt.querySelector('#svAn' + i).value)) { toast('Bitte eine gültige E-Mail-Adresse eintragen' + (einzel ? '.' : ' bei ' + mails[i].name + '.')); return; }
      if (!Store.mailSenden) { toast('Mail-Versand ist in dieser Version nicht verfügbar.', true); return; }
      // Erlaubnis noch im Tipp holen, sonst blockt Safari das Google-Fenster
      const erlaubnis = Store.mailToken ? Store.mailToken() : Promise.resolve();
      const btn = e.currentTarget; btn.disabled = true;
      let ok = 0; const fehler = [];
      try { await erlaubnis; } catch (x) { toast(x.message || String(x), true); btn.disabled = false; return; }
      for (const { m, i } of auswahl) {
        btn.textContent = `Sendet ${ok + fehler.length + 1} von ${auswahl.length} …`;
        const an = rt.querySelector('#svAn' + i).value.trim();
        try {
          await Store.mailSenden({ an, betreff: rt.querySelector('#svB' + i).value.trim() || m.betreff, text: rt.querySelector('#svT' + i).value });
          try { const c = m.c || await Store.load(Store.list(true).find(x => x.id === m.id)); if (!c.email) c.email = an; m.vermerk(c, an); await Store.save(c); } catch (x) { fehler.push(m.name + ': gesendet, Vermerk nicht gespeichert'); ok--; }
          ok++;
        } catch (x) { fehler.push(m.name + ': ' + (x.message || x)); }
      }
      zu();
      if (fertig) fertig();
      toast(fehler.length ? `${ok} gesendet. Nicht geklappt: ${fehler.join('; ')}` : (ok === 1 ? 'Mail gesendet. Du findest sie in Gmail unter „Gesendet“.' : `${ok} Mails gesendet. Du findest sie in Gmail unter „Gesendet“.`), true);
    };
  }

  // Pflegehinweise zu einer Behandlung (b = Behandlungsbogen)
  FCC.pflegeMail = async (c, b, fertig) => {
    await texteLaden();
    const keys = pflegeSchluessel(b);
    if (!keys.length) { toast('Für diese Behandlung gibt es noch keine Pflegehinweise.'); return; }
    // Mehrere Bereiche (z. B. Brauen und Lippen): ein Text, Regeln nur einmal
    const v = vorlage(keys[0]);
    const w = { vorname: c.vorname, datum: b.datum };
    const zusatz = keys.slice(1).map(k => vorlage(k).l).join(' und ');
    fenster({
      titel: 'Pflegehinweise senden', unter: `${c.vorname} ${c.nachname} · ${b.art} am ${fmt(b.datum)}`,
      hinweis: `Text aus Administration → Mail-Texte (${esc(v.l)}${zusatz ? ', gilt auch für ' + esc(zusatz) : ''}). Du kannst ihn hier für diese Kundin ändern.`,
      mails: [{ c, name: `${c.vorname} ${c.nachname}`, an: c.email || '', betreff: v.betreff, text: fuellen(v.text, w),
        vermerk: (k) => { const x = (k.behandlungen || []).find(y => y.id === b.id); if (x) x.pflegeMail = jetzt(); k.pflegeMail = heute(); } }],
      fertig
    });
  };

  // Erinnerungen: liste = [{ e (Eintrag aus der Kurzliste), t ('pmu-nach' | 'pmu-auff' | 'lash' | 'brow'), datum }]
  const ERI = { 'pmu-nach': 'erinnerung-pmu-nach', 'pmu-auff': 'erinnerung-pmu-auff', lash: 'erinnerung-lash', brow: 'erinnerung-brow' };
  FCC.erinnerungTypen = Object.keys(ERI);
  // Darf eine Erinnerung an diese Kundin gehen? Nur mit Einwilligung und nicht doppelt innerhalb von 21 Tagen
  FCC.erinnerungMoeglich = (e, t) => {
    if (!ERI[t] || !e || e.nurKontakt) return false;
    if (!((e.ew || {}).mail === 1)) return false;
    const letzte = e.em || {};
    if (letzte.t === t && letzte.d && (Date.now() - new Date(letzte.d + 'T12:00')) / 864e5 < 21) return false;
    return true;
  };
  FCC.erinnerungMail = async (liste, fertig) => {
    await texteLaden();
    const mails = liste.filter(x => ERI[x.t]).map(x => {
      const v = vorlage(ERI[x.t]);
      return { id: x.e.id, name: `${x.e.vorname || ''} ${x.e.nachname || ''}`.trim(), info: v.l, an: x.e.email || '', betreff: v.betreff,
        text: fuellen(v.text, { vorname: x.e.vorname, datum: x.datum }) + ABMELDEN,
        vermerk: k => { k.erinnerungsMails = k.erinnerungsMails || []; k.erinnerungsMails.push({ t: x.t, d: heute() }); } };
    });
    if (!mails.length) { toast('Keine Erinnerung möglich. Es fehlt die Einwilligung der Kundin oder eine E-Mail-Adresse.', true); return; }
    fenster({ titel: mails.length === 1 ? 'Erinnerung senden' : 'Erinnerungen senden', unter: mails.length === 1 ? mails[0].name : `${mails.length} Kundinnen`,
      hinweis: 'Nur an Kundinnen, die im Formular „E-Mail-Service“ Erinnerungen erlaubt haben. Am Ende jeder Mail steht, wie sie sich abmelden.', mails, fertig });
  };

  const css = document.createElement('style');
  css.textContent = `.sv-mail.panel{padding:14px;margin-top:12px}.sv-wahl{display:flex;gap:10px;align-items:center;flex-wrap:wrap;cursor:pointer}
    .sv-wahl input{width:22px;height:22px;accent-color:var(--rose)}.sv-mail details summary{cursor:pointer;color:var(--rose-ink);font-size:14px;margin-top:4px}
    .sv-mail textarea{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);font:inherit;font-size:15px}`;
  document.head.append(css);
})();
