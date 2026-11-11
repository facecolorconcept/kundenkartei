// Modul „Hilfe“: Schritt-für-Schritt-Anleitungen zu allen Bereichen. Aus jeder Karte mit „?“ direkt erreichbar.
(function () {
  const FCC = window.FCC = window.FCC || {};
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Jedes Thema: kurzer Satz + nummerierte Schritte + optionale Tipps. Text darf <b> enthalten.
  const THEMEN = [
    { id: 'start', t: 'Erste Schritte', k: 'App aufs iPhone, anmelden, Knöpfe oben', s: [
      'Öffne die Kartei in <b>Safari</b> auf dem iPhone.',
      'Tippe unten auf <b>Teilen</b> und dann auf <b>Zum Home-Bildschirm</b>. Ab jetzt startest du die Kartei wie eine App.',
      'Tippe auf <b>Mit Google anmelden</b> und wähle info@facecolorconcept.de. Setze beim ersten Mal <b>alle Häkchen</b> (Drive, Kalender, Kontakte, Aufgaben).',
      'Oben rechts siehst du einen <b>grünen Punkt „Drive“</b>: Die Kartei ist verbunden und speichert in deinen Google-Drive-Ordner.',
      'Der <b>Halbkreis</b> daneben schaltet die Ansicht: automatisch (tagsüber hell, abends dunkel), immer hell, immer dunkel.',
      'Der <b>Pfeil im Kreis</b> lädt alles neu, zum Beispiel wenn du am Laptop etwas eingetragen hast.',
      'Die <b>Tür mit Pfeil</b> meldet dich ab. Mach das immer an fremden Geräten.'
    ], tipp: 'Google fragt etwa einmal pro Stunde kurz nach. Ein Tipp auf „Mit Google anmelden“ genügt, du arbeitest danach an derselben Stelle weiter.' },
    { id: 'termin', t: 'Ein Termin von Anfang bis Ende', k: 'Der ganze Ablauf auf einen Blick', s: [
      '<b>Vor dem Termin</b>: Neue Kundin? Tippe in der Kartei auf <b>+ Kundin</b>, Vor- und Nachname reichen. Den Rest trägt sie gleich selbst ein.',
      '<b>Kundin kommt</b>: Akte öffnen, ganz oben unter <b>Termin heute</b> die Behandlung antippen. Bei <b>1 Formulare</b> steht orange, was fehlt. Tippe auf <b>Ausfüllen lassen</b> und gib ihr das iPad.',
      '<b>Sie unterschreibt</b> mit dem Stift. Braucht es auch deine Unterschrift, gibt sie dir das iPad zurück. Zum Schluss den Knopf <b>gedrückt halten</b>.',
      '<b>Schau kurz in die Akte</b>: Hat sie etwas angekreuzt, steht es orange unter „Angekreuzt“. Entscheide dann, ob du behandelst.',
      '<b>Behandlung</b>: Bei <b>2 Behandlung dokumentieren</b> auf <b>Bogen öffnen</b> tippen und ausfüllen. Vorher-Foto direkt im Bogen machen.',
      '<b>Nur beim PMU</b>: Nach dem Vorzeichnen in der Akte auf <b>Freigabe der Vorzeichnung unterschreiben lassen</b>, nach der Behandlung auf <b>Abnahme unterschreiben lassen</b>.',
      '<b>Nach der Behandlung</b>: Nachher-Foto, Ergebnis und „Kundin zufrieden“ eintragen, <b>Bogen speichern</b>.',
      '<b>Folgetermin</b>: Die Kartei schlägt ihn vor. Ein Tipp auf <b>Als Aufgabe anlegen</b>, und du wirst rechtzeitig erinnert.'
    ], tipp: 'Mehr musst du dir nicht merken. Alles Weitere, zum Beispiel PDFs und Nachweise, legt die Kartei selbst in Drive ab.' },
    { id: 'uebersicht', t: 'Die Übersicht', k: 'Was heute wichtig ist', s: [
      'Die Übersicht ist deine Startseite. <b>Alles darauf lässt sich antippen.</b>',
      '<b>Kennzahlen oben</b>: Ein Tipp auf die Zahl zeigt genau diese Kundinnen in der Kartei.',
      '<b>Aufgaben</b>: alles, was du dir vorgenommen hast, sortiert nach überfällig, heute, morgen und später.',
      '<b>Jetzt dran</b>: Dinge, die die Kartei selbst erkennt, zum Beispiel fällige Nachbehandlungen.',
      '<b>Zufriedenheit</b>: Antippen der Farbe zeigt die Kundinnen dazu.',
      '<b>Zuletzt behandelt</b> und <b>Balken</b>: Antippen öffnet die Kundinnen des Monats.'
    ] },
    { id: 'jetzt', t: 'Jetzt dran', k: 'Farben, Erledigt, Merken', s: [
      'Der farbige Streifen links zeigt, wie dringend etwas ist: <b>rot</b> = unzufriedene Kundin, bitte zuerst; <b>orange</b> = prüfen, zum Beispiel Fragebogen fehlt; <b>rosé</b> = fällig, zum Beispiel Nachbehandlung; <b>grün</b> = Hinweis, zum Beispiel neuer Kontakt.',
      'Tippe auf den <b>Namen</b>, um die Akte zu öffnen.',
      '<b>Erledigt</b> (bei Rückmeldungen): Du hast nachgefasst, der Punkt verschwindet.',
      '<b>Merken</b>: macht aus dem Punkt eine Aufgabe mit Datum und Erinnerung. Solange die Aufgabe offen ist, steht der Punkt nicht doppelt hier.',
      'Fällige Nachbehandlungen verschwinden von selbst, sobald du die Behandlung im Bogen einträgst.'
    ] },
    { id: 'kundin', t: 'Kundin anlegen und finden', k: 'Neue Kundin, Suche, Tabelle', s: [
      'Tippe auf <b>+ Neue Kundin</b>. Pflicht sind nur Vor- und Nachname.',
      'Beim Speichern trägt die Kartei die Kundin auch in <b>Google Kontakte</b> ein (Label „Facecolorconcept“). Gesundheitsdaten landen dort nie.',
      'Kontakte, die du in Google Kontakte mit dem Label „Facecolorconcept“ anlegst, erscheinen in der Liste als <b>Kontakt</b>. Öffnen und speichern macht daraus eine Akte.',
      '<b>Suche oben</b>: Name, Telefon, Pigment, Charge oder Notiz eintippen. Am Laptop springt die Taste „/“ in die Suche.',
      'In der Kartei schaltest du oben zwischen <b>Karten</b> und <b>Tabelle</b>. In der Tabelle sortierst du per Tipp auf die Überschrift und filterst über die Felder darüber.',
      '<b>CSV exportieren</b> in der Tabelle: lädt eine Liste für Excel oder Numbers herunter, ohne Gesundheitsdaten.'
    ] },
    { id: 'behandlung', t: 'Behandlung dokumentieren', k: 'Bogen ausfüllen, Folgetermin', s: [
      'Öffne die Akte, tippe oben unter <b>Termin heute</b> auf die Behandlung, zum Beispiel <b>Lash Lift</b>, und dann auf <b>Lash Lift-Bogen öffnen</b>.',
      'War die Kundin schon einmal da, siehst du oben <b>„Nächstes Mal anders“</b> vom letzten Termin. <b>Werte übernehmen</b> füllt alles vom letzten Mal vor, das Ergebnis bleibt leer.',
      '<b>Gestrichelte Kreise</b> zeigen, was du beim letzten Mal gewählt hattest.',
      'Fülle die Abschnitte von oben nach unten aus. Antippen wählt aus, noch einmal antippen nimmt es zurück.',
      'Trag unter <b>Kundin zufrieden</b> ja, teils oder nein ein. Das erscheint in der Übersicht.',
      'Fotos machst du direkt im Bogen unter <b>Fotos</b>: „+ Foto“ bei Vorher oder Nachher.',
      'Tippe auf <b>Bogen speichern</b>. Danach schlägt die Kartei den passenden <b>Folgetermin</b> vor. Ein Tipp auf „Als Aufgabe anlegen“, fertig.'
    ] },
    { id: 'formulare', t: 'Formulare und Unterschrift', k: 'Kundin füllt am iPad aus, PDF als Nachweis', s: [
      'Öffne die Akte. Ganz oben unter <b>Termin heute</b> tippst du auf die Behandlung, zum Beispiel <b>Lash Lift</b>. Bei Schritt <b>1 Formulare</b> siehst du, was nötig ist und was schon unterschrieben ist. Der TFP-Vertrag für Model-Termine steht als Link darunter.',
      'Tippe auf <b>Ausfüllen lassen</b>. Name, Telefon und E-Mail aus der Akte sind schon eingetragen.',
      'Bei manchen Formularen kommt zuerst die <b>Vorbereitung für dich</b>, zum Beispiel Preis und Bereich beim PMU. Danach tippst du auf <b>iPad an die Kundin geben</b>.',
      'Die Kundin geht Seite für Seite durch und <b>unterschreibt mit dem Stift</b>. Fehlt eine Antwort, markiert die Kartei sie rot.',
      'Braucht das Formular auch deine Unterschrift, bittet die Kartei die Kundin, dir das iPad zu geben. Dann unterschreibst du.',
      'Zum Schluss steht da „Danke“. Halte den Knopf unten <b>gedrückt</b>, um zur Akte zurückzukehren. So kann die Kundin nicht versehentlich in deiner Kartei landen.',
      'Beim <b>PMU</b> gibt es drei Unterschriften zu verschiedenen Zeitpunkten: <b>Einverständnis</b> vorher, <b>Freigabe der Vorzeichnung</b> vor dem Pigmentieren und <b>Abnahme</b> danach. Die Karte zeigt dir jeweils den nächsten Schritt.',
      'Alle unterschriebenen Formulare stehen in der Akte unten bei <b>Dokumente</b>. <b>Ansehen</b> zeigt Antworten und Unterschriften, <b>PDF</b> lädt den Nachweis mit deinem Logo herunter. Eine Kopie liegt automatisch in Drive im Ordner der Kundin.',
      'Wünscht die Kundin das Formular per E-Mail: bei Dokumente neben dem Formular auf <b>Mail</b> tippen. Adresse und Text sind vorbereitet, das PDF hängt an. Haken setzen, dass die Kundin es wünscht, dann <b>Senden</b>. Die Mail geht von info@facecolorconcept.de raus und liegt danach in Gmail unter „Gesendet“. In der Akte steht „per Mail gesendet am …“.',
      'Beim <b>allerersten Versand</b> fragt Google einmal, ob die Kartei E-Mails in deinem Namen senden darf. Häkchen setzen und bestätigen. Das passiert nur einmal.',
      'Im <b>Behandlungsbogen</b> steht oben, ob alles unterschrieben ist. Was die Kundin heute unterschrieben hat, ist in der Checkliste schon abgehakt.'
    ], tipp: 'Nach der Unterschrift ist das Formular gesperrt und bekommt eine Prüfsumme. Ändern geht nicht, nur neu ausfüllen lassen. Angaben wie Geburtsdatum, Anschrift, Allergien und Blutverdünner übernimmt die Kartei in die Akte. Was die Kundin angekreuzt hat, siehst du in der Akte orange unter „Angekreuzt“.' },
    { id: 'fotos', t: 'Fotos, Notizen, Dokumente', k: 'Alles rund um die Akte', s: [
      '<b>Vorher / Nachher</b> in der Akte: „+ Vorher-Foto“ oder „+ Nachher-Foto“. Du kannst fotografieren oder aus deinen Bildern wählen. Antippen vergrößert.',
      '<b>Notizen</b>: Text eintippen, „Notiz speichern“. Mit Datum, neueste oben.',
      '<b>Dokumente</b>: die PDFs der digital unterschriebenen Formulare landen hier von selbst. Rechnungen oder alte Papier-Formulare lädst du mit „+ Dokument“ hoch (bis 5 MB). Alles liegt im Ordner der Kundin in Drive.',
      'Die Fotos werden vor dem Hochladen verkleinert, damit es auch unterwegs schnell geht.'
    ] },
    { id: 'aufgaben', t: 'Aufgaben und Erinnerungen', k: 'Nichts mehr vergessen', s: [
      'Tippe auf <b>+ Aufgabe</b>, in der Übersicht oder in einer Akte.',
      'Schreib, was zu tun ist, und wähle das <b>Fälligkeitsdatum</b>. Die <b>Kundin</b> ist freiwillig. Wählst du eine, steht die Aufgabe auch in ihrer Akte.',
      'Wähle die <b>Erinnerung</b>: keine, 1 Tag vorher um 9 Uhr, am Tag um 8 Uhr oder selbst wählen. Unten steht genau, wann die Mitteilung kommt.',
      'In der Akte unter Aufgaben gibt es <b>Folgetermin merken</b>: aufklappen, ein Tipp, zum Beispiel „PMU-Nachbehandlung · in 6 Wochen“, und die Aufgabe ist vorausgefüllt.',
      'Erledigt? Tippe auf den <b>Kreis</b> vor der Aufgabe. Die Erinnerung verschwindet dann auch aus dem Kalender.',
      'Ändern oder löschen: Aufgabe antippen.'
    ], tipp: 'Deine Aufgaben stehen auch in <b>Gmail</b> (rechte Seitenleiste) und in der App <b>Google Tasks</b>. Die Mitteilung aufs iPhone kommt über den <b>Google Kalender</b>: Installiere dafür die Google-Kalender-App oder richte dein Studio-Konto im iPhone-Kalender ein.' },
    { id: 'brows', t: 'If I could do your Brows', k: 'Instagram-Reihe Schritt für Schritt', s: [
      'Leg die Interessentin als Kundin an (Name reicht) und tippe ganz unten in der Akte auf <b>+ Folge „If I could do your Brows“</b>.',
      '<b>Einwilligung</b>: „Anfrage kopieren“ und per DM schicken. Nach dem Ja: Datum eintragen, „volljährig“ antippen, Screenshot hochladen.',
      '<b>Foto und Analyse</b>: Foto hochladen, mit dem Finger in den Kreis schieben, mit zwei Fingern zoomen. „Linien zeichnen“ und „Nummern setzen“, darunter die drei Punkte.',
      '<b>Vorschlag</b>: Behandlung antippen, Begründung schreiben.',
      '<b>Vorschau</b>: Simulation in Procreate machen und das fertige Bild hochladen.',
      '<b>PDF für die Kundin erzeugen</b>: Es liegt danach in der Akte und kann direkt per WhatsApp verschickt werden.',
      'Hat die Kundin Ja gesagt, trag das <b>Freigabe-Datum</b> ein. Erst dann gibt es die <b>6 Bilder für Instagram</b> und die Bildunterschrift.'
    ], tipp: 'Zieht eine Kundin ihr Okay zurück: „Einwilligung zurückgezogen“ tippen, Beitrag auf Instagram löschen, dann „Beitrag gelöscht, Fotos entfernen“.' },
    { id: 'bericht', t: 'Bericht und Nachweis', k: 'Auswertung als PDF, z. B. für die Förderung', s: [
      'Tippe oben auf den Reiter <b>Bericht</b>.',
      'Wähle den <b>Zeitraum</b>, zum Beispiel „Dieses Quartal“ oder „Eigener Zeitraum“ mit Von und Bis.',
      'Unter <b>Leistungen</b> kannst du auf PMU, Lash Lift, Brow Lift oder Waxing eingrenzen. „Alle“ nimmt alles.',
      'Unter <b>Namen im Bericht</b> wählst du „Abgekürzt“ (Sophia B.) oder „Vollständig“. Für Ämter und Förderstellen reicht meist abgekürzt.',
      '<b>Kundinnen ein- oder ausblenden</b>: Nimm das Häkchen weg bei Testeinträgen oder bei dir selbst. Die Kartei merkt sich das.',
      '<b>Alles lässt sich antippen</b>: Kennzahlen, Leistungen und Monatsbalken zeigen darunter die passenden Behandlungen oder Kundinnen. Ein Tipp auf eine Zeile öffnet die Akte.',
      'Tippe auf <b>PDF herunterladen</b>. Auf dem iPhone findest du es danach in der App <b>Dateien › Downloads</b>, am Computer im Ordner <b>Downloads</b>. Eine Kopie landet in Google Drive unter <b>Administration › Berichte</b>.',
      'Willst du das PDF direkt verschicken, tippe unten auf <b>PDF teilen</b> und wähle Mail oder WhatsApp.',
      'Druck das PDF aus oder öffne es am iPad und <b>unterschreibe</b> unten auf der letzten Seite.'
    ], tipp: 'Im Bericht stehen nur Datum, Kundin und Leistung. Gesundheitsdaten, Telefonnummern und Fotos sind nie darin. Preise kennt die Kartei nicht, für Umsätze nimm deine Abrechnung.' },
    { id: 'archiv', t: 'Archivieren statt Löschen', k: 'Nichts geht verloren', s: [
      'In der Akte oben auf <b>Archivieren</b>, dann noch einmal bestätigen.',
      'Die Akte bleibt vollständig erhalten, taucht aber nicht mehr in Übersicht, Liste und Tabelle auf.',
      'Unter der Kundenliste: <b>Archiv anzeigen</b>. Dort öffnest du die Akte und tippst auf <b>Wiederherstellen</b>.',
      'Die globale Suche findet auch archivierte Kundinnen.'
    ] },
    { id: 'sicherheit', t: 'Datenschutz und Sicherheit', k: 'Wo deine Daten liegen', s: [
      'Alle Akten, Fotos und Dokumente liegen nur in <b>deinem Google-Drive-Ordner</b>. Die Kartei selbst speichert nichts auf fremden Servern.',
      'Der Ordner muss auf <b>„Eingeschränkt“</b> stehen (in Drive: Teilen → Allgemeiner Zugriff). Nie „Jeder mit dem Link“.',
      'In Google Kontakte, Aufgaben und Kalender landen nur Name, Telefon, E-Mail und Titel, <b>nie Gesundheitsdaten</b>. Schreib auch in Aufgaben-Notizen keine Gesundheitsdaten.',
      'Schütz dein iPhone mit <b>Code und Face ID</b> und dein Google-Konto mit <b>Bestätigung in zwei Schritten</b>.',
      'Melde dich an fremden Geräten immer <b>ab</b>.',
      'Verlangt eine Kundin <b>Auskunft über ihre Daten</b>: Akte öffnen, ganz unten bei Dokumente auf <b>Datenauskunft für die Kundin (PDF)</b> tippen. Das PDF enthält alles, was über sie gespeichert ist, und ihre Rechte. Gib es nur ihr persönlich, zum Beispiel per E-Mail an ihre eigene Adresse.',
      'Allergien und Kontraindikationen sind Gesundheitsdaten. Mit <b>Google Workspace</b> bekommst du einen Vertrag zur Auftragsverarbeitung mit Google, mit einem privaten Gmail-Konto nicht.'
    ] },
    { id: 'probleme', t: 'Wenn etwas nicht klappt', k: 'Häufige Fragen', faq: [
      ['Ich sehe noch die alte Ansicht.', 'App ganz schließen (vom unteren Rand hochwischen und wegschieben) und neu öffnen.'],
      ['„Kartei-Ordner nicht erreichbar“', 'Abmelden und mit info@facecolorconcept.de neu anmelden, dabei alle Häkchen setzen.'],
      ['Aufgaben werden nicht geladen.', 'Einmal abmelden und neu anmelden, dabei das Häkchen „Aufgaben“ setzen.'],
      ['Eine Kundin fehlt auf dem iPhone.', 'Oben rechts auf den Pfeil im Kreis tippen. Das lädt alles neu, auch die Google Kontakte.'],
      ['Ein neuer Google-Kontakt erscheint nicht.', 'Prüfen, ob der Kontakt das Label „Facecolorconcept“ hat. Dann neu laden.'],
      ['Die Erinnerung kommt nicht aufs Handy.', 'Google-Kalender-App installieren und Mitteilungen erlauben, oder das Studio-Konto unter Einstellungen → Kalender → Accounts einrichten.'],
      ['Das Anmeldefenster öffnet sich nicht.', 'In Safari den Popup-Blocker für die Kartei ausschalten (Einstellungen → Safari → Popups blockieren).']
    ] }
  ];

  let offen = null;
  function render() {
    const el = document.getElementById('mod-hilfe');
    if (!el) return;
    const th = THEMEN.find(t => t.id === offen);
    el.innerHTML = th ? `
      <button class="back" style="display:block" data-zurueck>← Alle Themen</button>
      <div class="panel card hilfe-thema">
        <span class="label">Hilfe</span><h1>${esc(th.t)}</h1>
        ${th.s ? `<ol class="hsteps">${th.s.map(x => `<li>${x}</li>`).join('')}</ol>` : ''}
        ${th.faq ? `<div class="hfaq">${th.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>` : ''}
        ${th.tipp ? `<div class="banner"><span>${th.tipp}</span></div>` : ''}
      </div>
      <div class="row">${(() => { const i = THEMEN.indexOf(th); return `${i > 0 ? `<button class="btn ghost small" data-thema="${THEMEN[i - 1].id}">← ${esc(THEMEN[i - 1].t)}</button>` : ''}${i < THEMEN.length - 1 ? `<button class="btn small" data-thema="${THEMEN[i + 1].id}">${esc(THEMEN[i + 1].t)} →</button>` : ''}`; })()}</div>`
      : `<div class="hello"><h1>Hilfe</h1><p>Wähle ein Thema. Jede Anleitung geht Schritt für Schritt.</p></div>
      <div class="htiles">${THEMEN.map((t, i) => `<button class="panel htile" data-thema="${t.id}"><span class="hn">${i + 1}</span><b>${esc(t.t)}</b><span class="cmeta">${esc(t.k)}</span></button>`).join('')}</div>`;
    el.querySelectorAll('[data-thema]').forEach(b => b.onclick = () => { offen = b.dataset.thema; render(); window.scrollTo(0, 0); });
    const z = el.querySelector('[data-zurueck]'); if (z) z.onclick = () => { offen = null; render(); };
  }
  FCC.hilfe = id => { offen = THEMEN.some(t => t.id === id) ? id : null; FCC.show('hilfe'); };

  const st = document.createElement('style');
  st.textContent = '.htiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}@media(max-width:520px){.htiles{grid-template-columns:1fr 1fr;gap:8px}.htile{min-height:0;padding:12px}.htile b{font-size:18px}}' +
    '.htile{text-align:left;padding:16px;display:flex;flex-direction:column;gap:4px;cursor:pointer;font:inherit;color:inherit;min-height:110px;transition:border-color .15s,transform .15s}' +
    '.htile:hover{border-color:var(--rose);transform:translateY(-2px)}.htile b{font-family:var(--display);font-size:21px;font-weight:600;line-height:1.2}' +
    '.hn{width:28px;height:28px;border-radius:50%;background:var(--rose-soft);color:var(--rose-ink);font-size:13px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;margin-bottom:4px}' +
    '.hilfe-thema h1{margin-bottom:6px}.hsteps{margin:14px 0 0;padding:0;list-style:none;counter-reset:h}' +
    '.hsteps li{counter-increment:h;position:relative;padding:12px 0 12px 46px;border-top:1px solid var(--line);line-height:1.55}.hsteps li:first-child{border-top:0}' +
    '.hsteps li::before{content:counter(h);position:absolute;left:0;top:10px;width:30px;height:30px;border-radius:50%;background:var(--rose);color:#fff;font-weight:600;font-size:14px;display:flex;align-items:center;justify-content:center}' +
    '.hsteps b{font-weight:600}.hfaq details{border-top:1px solid var(--line);padding:12px 0}.hfaq details:first-child{border-top:0}' +
    '.hfaq summary{cursor:pointer;font-weight:500}.hfaq p{margin:8px 0 0;color:var(--muted)}';
  document.head.append(st);

  FCC.register && FCC.register({ id: 'hilfe', titel: 'Hilfe', el: 'mod-hilfe', order: 9, render,
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg>' });
})();
