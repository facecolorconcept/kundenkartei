// Modul „Formulare“: Fragebögen und Einverständniserklärungen am iPad ausfüllen und mit dem Stift unterschreiben.
// Nach jeder Unterschrift ist der Inhalt gesperrt (Prüfsumme SHA-256). Das PDF im Design von Facecolorconcept
// liegt danach im Drive-Ordner der Kundin und lässt sich jederzeit neu erzeugen, herunterladen oder teilen.
(function () {
  'use strict';
  const FCC = window.FCC = window.FCC || {};
  const C = window.FCC_CONFIG || {};
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const p2 = n => String(n).padStart(2, '0');
  const tagIso = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const heute = () => tagIso(new Date());
  const jetzt = () => { const d = new Date(); return `${tagIso(d)}T${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const fmt = d => d ? String(d).slice(0, 10).split('-').reverse().join('.') : '';
  const fmtZeit = z => z ? `${fmt(z)}, ${String(z).slice(11, 16)} Uhr` : '';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const clone = o => JSON.parse(JSON.stringify(o));
  const alter = gd => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(gd || '')) return null;
    const h = new Date(), g = new Date(gd + 'T12:00'); let a = h.getFullYear() - g.getFullYear();
    if (h.getMonth() < g.getMonth() || (h.getMonth() === g.getMonth() && h.getDate() < g.getDate())) a--;
    return a;
  };
  const minderjaehrig = w => { const a = alter(w.geburtsdatum); return a != null && a < 18; };
  const tageSeit = d => Math.floor((Date.now() - new Date(String(d).slice(0, 10) + 'T12:00')) / 864e5);
  const pngOk = s => typeof s === 'string' && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s);
  const dateiname = s => String(s || '').replace(/[^\wäöüÄÖÜß-]+/g, '-').replace(/^-|-$/g, '');

  // Studio-Angaben für Formulare und PDF
  const S = {
    name: C.STUDIO || 'Facecolorconcept',
    inh: C.INHABERIN_NAME || 'Katharina Perschka',
    kurz: C.INHABERIN || 'Kati',
    adr: C.ADRESSE || 'Elisabeth-Silbereisen-Weg 7, 74931 Lobbach-Lobenfeld',
    tel: C.TELEFON || '0174 8522700',
    mail: C.EMAIL || 'info@facecolorconcept.de',
    web: C.WEBSITE || 'facecolorconcept.de'
  };
  S.ort = (S.adr.split(',').pop() || '').replace(/\d{5}/, '').trim() || 'Lobbach-Lobenfeld';
  S.voll = `${S.name} ${S.inh}`;

  // ---------- Bausteine der Formulare ----------
  // Feldtypen: feld, janein, wahl, kreuze, ok (Häkchen), info (Text)
  // studio: 1 = füllt Kati vor der Übergabe aus; die Kundin sieht es nur zum Lesen
  const F = {
    vorname: { t: 'feld', k: 'vorname', l: 'Vorname', req: 1, half: 1 },
    nachname: { t: 'feld', k: 'nachname', l: 'Nachname', req: 1, half: 1 },
    geburtsdatum: { t: 'feld', k: 'geburtsdatum', l: 'Geburtsdatum', typ: 'date', req: 1, half: 1 },
    strasse: { t: 'feld', k: 'strasse', l: 'Straße und Hausnummer', req: 1 },
    plz: { t: 'feld', k: 'plz', l: 'PLZ', req: 1, half: 1, num: 1 },
    ort: { t: 'feld', k: 'ort', l: 'Ort', req: 1, half: 1 },
    telefon: { t: 'feld', k: 'telefon', l: 'Telefon', typ: 'tel', half: 1 },
    mobil: { t: 'feld', k: 'mobil', l: 'Mobilfunknummer (falls anders)', typ: 'tel', half: 1 },
    email: { t: 'feld', k: 'email', l: 'E-Mail', typ: 'email', half: 1 }
  };
  const felder = (...ks) => ks.map(k => typeof k === 'string' ? F[k] : k);
  const opt = o => Array.isArray(o) ? [o[0], o[1], o[2] || o[1]] : [o, o, o];
  const JN = (k, l, x) => ({ t: 'janein', k, l, req: 1, flag: 1, ...(x || {}) });

  const PMU_GESUND_INTRO = 'Um Ihre Pigmentierung optimal durchführen zu können, bitten wir, die nachstehenden Gesundheitsfragen wahrheitsgemäß zu beantworten. Leiden Sie an folgenden Krankheiten oder nehmen Sie nachfolgende Medikamente ein?';

  const DEFS = {
    pmu: {
      id: 'pmu', titel: 'Einverständniserklärung Permanent Make-up', kurz: 'Einverständnis PMU', du: false,
      unter: 'Kundeneinverständniserklärung für Permanent Make-up (PMU)', fuer: ['PMU'], gesundheit: true, vertrag: true,
      rollen: { kundin: 'Kundin / Kunde', vertreter: 'Erziehungsberechtigte/r', studio: 'Studio' },
      teile: [
        { id: 'einwilligung', h: 'Einverständnis', wann: 'vor der Behandlung', sign: ['kundin', 'vertreter', 'studio'], seiten: [
          { h: 'Ihre Angaben', items: [
            { t: 'info', text: `Einverständniserklärung zwischen ${S.voll} – nachfolgend „Studio“ genannt – und Ihnen – nachfolgend „Kunde“ genannt.` },
            ...felder('vorname', 'nachname', 'strasse', 'plz', 'ort', 'geburtsdatum', 'telefon', 'mobil', 'email')] },
          { h: '1. Vertragsgegenstand', items: [
            { t: 'feld', k: 'verguetung', l: 'Vergütung in EUR', studio: 1, req: 1, half: 1, num: 1 },
            { t: 'info', text: 'Vertragsgegenstand ist die in Ziffer 3 dieses Vertrages beschriebene Permanent-Make-up-Behandlung durch das Studio beim Kunden.\n\nDas Studio verpflichtet sich, das vom Kunden gewünschte Permanent Make-up ordnungsgemäß und nach gesundheitstechnischen Vorschriften an der vereinbarten Hautstelle anzubringen.\n\nDer Kunde verpflichtet sich, dem Studio hierfür eine Vergütung in Höhe von EUR {verguetung} zu zahlen und diese unmittelbar nach der Abnahme des Permanent Make-ups zu entrichten.\n\nDie Abnahme hat unmittelbar nach der Durchführung der Behandlung durch das Studio schriftlich zu erfolgen. Etwaige Mängel sind jeweils festzuhalten.' }] },
          { h: '2. Gesundheitsfragen (1 von 3)', items: [{ t: 'info', text: PMU_GESUND_INTRO },
            JN('haemophilie', 'Hämophilie (Bluterkrankheit)'), JN('diabetes', 'Diabetes (Zuckerkrankheit)'), JN('hepatitis', 'Hepatitis A, B, C, D, E, F'),
            JN('hiv', 'HIV-positiv'), JN('haut', 'Hauterkrankungen', { detail: 'Welche?' }), JN('ekzeme', 'Ekzeme'), JN('allergien', 'Allergien', { detail: 'Welche?' })] },
          { h: '2. Gesundheitsfragen (2 von 3)', items: [
            JN('autoimmun', 'Autoimmunerkrankungen'), JN('herpes', 'Neigen Sie zu Herpes?'), JN('infekt', 'Infektionskrankheiten / Fieber', { detail: 'Welche?' }),
            JN('epilepsie', 'Epilepsie'), JN('herz', 'Akute Herz- / Kreislaufprobleme'), JN('blutverd', 'Blutverdünnende Medikamente'), JN('schwanger', 'Liegt eine Schwangerschaft vor?')] },
          { h: '2. Gesundheitsfragen (3 von 3)', items: [
            JN('medikamente', 'Regelmäßige Medikamente', { detail: 'Welche?' }), JN('schrittmacher', 'Haben Sie einen Herzschrittmacher?'), JN('heilung', 'Liegt eine Verheilungsschwäche vor?'),
            JN('drogen', 'Haben Sie in den letzten 24 Stunden Drogen oder Alkohol eingenommen?'), JN('op', 'Sind Sie in den letzten 14 Tagen operiert, bestrahlt oder anderweitig ärztlich behandelt worden?'),
            { t: 'info', text: 'Diese Daten unterliegen dem Datenschutz und werden streng vertraulich behandelt. Bei falschen Angaben übernimmt das Studio keinerlei Haftung für die Behandlung.' }] },
          { h: '3. Vertragliche Leistungen', items: [
            { t: 'info', text: 'Hiermit erklärt sich der Kunde einverstanden, dass folgende Pigmentierung vorgenommen wird:' },
            { t: 'wahl', k: 'leistung', l: 'Art', o: ['Neuarbeit', 'Auffrischung', 'Korrektur'], req: 1, studio: 1 },
            { t: 'wahl', k: 'bereich', l: 'Bereich', o: ['Augenbrauen', 'Lippe Kontur', 'Lippe Schattierung', 'Sonstiges'], multi: 1, req: 1, studio: 1 },
            { t: 'feld', k: 'bereichSonst', l: 'Sonstiger Bereich', studio: 1, req: 1, show: w => (w.bereich || []).includes('Sonstiges') },
            { t: 'wahl', k: 'nacharbeit', l: 'Nacharbeiten', o: [['inbegriffen', 'sind inbegriffen (innerhalb von 3 Monaten)', 'inbegriffen (innerhalb von 3 Monaten)'], ['berechnet', 'werden berechnet', 'werden berechnet']], req: 1, studio: 1 },
            { t: 'feld', k: 'nacharbeitPreis', l: 'Nacharbeiten werden berechnet mit EUR', studio: 1, req: 1, half: 1, num: 1, show: w => w.nacharbeit === 'berechnet' },
            { t: 'feld', k: 'zusatz', l: 'Zusätzliche Vereinbarung (z. B. über eine außergewöhnliche Form der Pigmentierung oder Farbgebung, Vergrößerung oder Verkleinerung)', area: 1, studio: 1 }] },
          { h: 'Fotodokumentation und Werbenutzung', items: [
            { t: 'info', text: `## 1. Fotodokumentation zur Qualitätssicherung und Nachweisbarkeit (Pflichtbereich)\nDer Kunde erklärt sich damit einverstanden, dass vom Studio ${S.voll} Vorher-Nachher-Fotos der pigmentierten Hautareale erstellt werden. Diese Fotos dienen ausschließlich der medizinischen und handwerklichen Dokumentation, der internen Qualitätssicherung sowie der Absicherung im Gewährleistungsfall. Sie werden streng vertraulich behandelt und niemals ohne separate Einwilligung an Dritte weitergegeben oder veröffentlicht.\n\n## 2. Einwilligung zur Nutzung für Werbezwecke (freiwilliger Bereich)\nDarüber hinaus freue ich mich, wenn ich die Arbeitsergebnisse anonymisiert zeigen darf. Bitte kreuzen Sie an, ob Sie dem Studio die Erlaubnis zur werblichen Nutzung erteilen:` },
            { t: 'wahl', k: 'werbung', l: 'Werbliche Nutzung der Fotos', req: 1, o: [
              ['ja', `JA, ich willige ein, dass die Erstanfertigungen und Nacharbeiten (Vorher-Nachher-Fotos) von ${S.voll} zu Werbezwecken im Internet (z. B. auf der eigenen Homepage, in Social-Media-Plattformen wie Instagram/Facebook) sowie für Printmedien veröffentlicht werden dürfen. Mir ist bewusst, dass diese Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen werden kann.`, 'Werbung erlaubt'],
              ['nein', 'NEIN, ich möchte nicht, dass meine Fotos zu Werbezwecken oder im Internet veröffentlicht werden (die interne Dokumentation unter Punkt 1 bleibt davon unberührt).', 'keine Werbung']] }] },
          { h: '4. Gewährleistung', items: [{ t: 'info', text: 'Das Studio haftet lediglich in Fällen grober Fahrlässigkeit und von Vorsatz sowie bei einer leicht fahrlässig verursachten Verletzung der Gesundheit, des Körpers oder des Lebens nach den gesetzlichen Bestimmungen. Im Übrigen haftet das Studio ausschließlich wegen einer schuldhaften Verletzung wesentlicher Vertragspflichten. Der Schadensersatzanspruch für die schuldhafte Verletzung wesentlicher Vertragspflichten ist jedoch auf den vertragstypischen vorhersehbaren Schaden begrenzt, soweit nicht zugleich ein anderer der in Absatz 1 oder Absatz 2 erörterten Fälle gegeben ist.\n\nDie Regelungen des vorliegenden Absatzes gelten für alle Schadensersatzansprüche, und zwar unabhängig vom Rechtsgrund, insbesondere wegen Mängeln, der Verletzung von Pflichten aus dem Schuldverhältnis oder aus unerlaubter Handlung. Eine Änderung der Beweislast zum Nachteil des Kunden ist mit den vorstehenden Regelungen nicht verbunden.' }] },
          { h: '5. Aufklärung (1 von 2)', items: [{ t: 'info', text: 'Ich, {vorname} {nachname}, als Kunde wurde vom Studio über die spezifischen Gefahren einer PMU-Behandlung detailliert informiert und aufgeklärt. Diesbezüglich wurde ich als Kunde vom Studio auf die folgenden Gefahren aufmerksam gemacht:\n\nIm Rahmen einer Pigmentierungsbehandlung – und zwar auch unter Beachtung aller gebotenen Sorgfalt – ist es möglich, dass es zu Verletzungen kommt.\n\nUngeachtet der Tatsache, dass ausschließlich modernste Farben zum Einsatz kommen, ist es in Einzelfällen möglich, dass eine allergische Reaktion eintritt. Ich als Kunde bin mir dessen bewusst und trage hierfür alleinig die Verantwortung.\n\nSowohl während als auch nach der PMU-Behandlung können vorübergehend Juckreiz, Rötungen oder leichte Schwellungen auftreten. In der Regel klingen diese nach kurzer Zeit wieder ab.\n\nIn Abhängigkeit von der Beschaffenheit der jeweiligen Haut ist es möglich, dass sich Strichführungen nach dem Verheilen der Erstarbeit gemeinsam mit der Wundverkrustung herauslösen. Zudem kann sich die Stärke der Farbe vertiefen oder verringern – dies ist von der jeweiligen Farbwahl abhängig.\n\nGrundsätzlich ist die Haut eines jeden Klienten verschieden; die Farbpigmente werden auf verschiedene Art und Weise aufgenommen. Aus diesem Grund ist es nicht möglich, für eine PMU-Behandlung eine Erfolgsgarantie zu geben.\n\nIm Allgemeinen ist das Permanent Make-up in den ersten Tagen nach der Pigmentierung deutlich kräftiger als nach abgeschlossenem Abheilungsprozess. Hinzu kommt, dass je nach Hautbeschaffenheit mit Farbabweichungen zu rechnen ist. Es ist möglich, dass Nacharbeiten vonnöten sind.\n\nEine verbindliche Aussage und Garantie zur Mindest- und Höchstdauer der Haltbarkeit eines Permanent Make-ups ist nicht möglich. Eine etwaig notwendige Nachbehandlung ist grundsätzlich erst nach einem Zeitraum von vier Wochen möglich, denn diesen Zeitraum nimmt die Abheilungsphase ein. Nach Abschluss der Abheilungsphase ist auch die Farbentwicklung beendet, das finale Ergebnis hinsichtlich des Farbgrads ist sichtbar.' }] },
          { h: '5. Aufklärung (2 von 2)', items: [{ t: 'info', text: 'Bei einer PMU-Behandlung handelt es sich zugleich um eine Verletzung der Haut. Aus diesem Grund gilt es, die pigmentierten Körperstellen sorgfältig zu pflegen, sodass ein komplikationsfreier Verheilungsprozess gewährleistet ist. Der Pflege nach der Pigmentierung ist besondere Aufmerksamkeit zu schenken, denn bei mangelnder Pflege ist es möglich, dass qualitative Verluste eintreten; diese liegen nicht in der Verantwortung des Studios.\n\n## Nach erfolgter PMU-Behandlung sollte vom Kunden für einen Zeitraum von 14 Tagen Folgendes beachtet werden:\n• Die pigmentierte Körperstelle sollte weder mit Wasser und Seife noch mit Kosmetika und ähnlichen Produkten in Berührung kommen; zudem sollte das Permanent Make-up nicht mit den Fingern berührt werden.\n• Um eine adäquate Nachsorge bzw. Nachpflege sicherzustellen, sollten die vom Studio empfohlenen Produkte verwendet werden.\n• Die zur Nachbehandlung empfohlene Creme sollte lediglich dünn und unter Zuhilfenahme eines sauberen Wattestäbchens auf die pigmentierte Stelle aufgetragen werden.\n• Vor dem Auftragen der Nachbehandlungscreme sollte die pigmentierte Körperstelle vorsichtig mit einem feuchten Wattepad abgetupft und gereinigt werden.\n• Achtung: Bitte keine anderweitigen Wundheil- oder Aftercare-Produkte anwenden, da dies zu Infektionen oder Komplikationen führen kann.\n• In der Abheilungsphase sollte auf Sauna und Solarium ebenso verzichtet werden wie auf Sport und damit verbundenes Schwitzen sowie übermäßiges Sonnenbaden.\n\nDas Studio übernimmt keine Haftung für falsch verstandene oder falsche Nachsorge.' }] },
          { h: '6. Salvatorische Klausel · 7. Gerichtsstand', items: [{ t: 'info', text: '## 6. Salvatorische Klausel\nSollten einzelne Bestimmungen des vorliegenden Vertrages undurchführbar oder unwirksam sein oder nach Abschluss des Vertrags undurchführbar oder unwirksam werden, bleibt die Wirksamkeit des Vertrags im Übrigen unberührt. An die Stelle der unwirksamen oder undurchführbaren Bestimmung soll diejenige wirksame und durchführbare Regelung treten, deren Wirkungen der Zielsetzung am nächsten kommen, die die Vertragsparteien mit der unwirksamen bzw. undurchführbaren Bestimmung verfolgt haben. Die vorstehenden Bestimmungen gelten entsprechend für den Fall, dass sich der Vertrag als lückenhaft erweist.\n\n## 7. Gerichtsstand\nGerichtsstand ist Heidelberg (Amtsgericht).' }] },
          { h: 'Bestätigung', items: [
            { t: 'info', text: 'Hiermit bestätige ich, {vorname} {nachname}, die obenstehenden Hinweise und Informationen gelesen und auch verstanden zu haben. Alle von mir gestellten Fragen wurden verständlich und vollständig beantwortet. Zudem wurde ich detailliert über den Ablauf der PMU-Behandlung, die Nachsorge und die Nachbetreuung sowie alle während der Behandlung und der Nachsorge zum Einsatz kommenden Produkte aufgeklärt und gebe hierzu meine Einverständniserklärung. Meinerseits bestehen weder weitere Fragen noch Einwände.\n\nHinweis: Beim Pigmentieren eines Permanent Make-ups handelt es sich – ebenso wie beim Stechen eines Piercings, einer Tätowierung oder einer Operation – aus formaler Sicht um Körperverletzung gemäß § 223 des Strafgesetzbuches (StGB). Mit meiner Unterschrift willige ich nach § 228 StGB ausdrücklich in die mit der PMU-Behandlung einhergehende Körperverletzung ein.' },
            { t: 'ok', k: 'bestaetigt', l: 'Ich habe alles gelesen und verstanden und bin einverstanden.', req: 1 }] },
          { h: 'Einverständniserklärung bei Minderjährigen', show: minderjaehrig, items: [
            { t: 'info', text: `Hiermit erkläre ich ausdrücklich, dass ich die/der gesetzliche Vertreter/in von {vorname} {nachname} bin und dem Anbringen eines Permanent Make-ups an der Körperstelle {bereich} ausgeführt von ${S.voll} zustimme. Die Kundenbefragung und Kundenerklärung habe ich gelesen und zur Kenntnis genommen.` },
            { t: 'feld', k: 'v_vorname', l: 'Vorname', req: 1, half: 1 }, { t: 'feld', k: 'v_nachname', l: 'Familienname', req: 1, half: 1 },
            { t: 'feld', k: 'v_strasse', l: 'Straße und Hausnummer', req: 1 }, { t: 'feld', k: 'v_plz', l: 'PLZ', req: 1, half: 1, num: 1 }, { t: 'feld', k: 'v_ort', l: 'Ort', req: 1, half: 1 },
            { t: 'feld', k: 'v_geburtsdatum', l: 'Geburtsdatum', typ: 'date', req: 1, half: 1 }, { t: 'feld', k: 'v_telefon', l: 'Telefon', typ: 'tel', half: 1 },
            { t: 'feld', k: 'v_mobil', l: 'Mobilfunknummer', typ: 'tel', half: 1 }, { t: 'feld', k: 'v_email', l: 'E-Mail', typ: 'email', half: 1 }] }
        ] },
        { id: 'vorzeichnung', h: 'Freigabe der Vorzeichnung', wann: 'vor der Pigmentierung', sign: ['kundin'], seiten: [
          { h: 'Freigabe der Vorzeichnung (vor der Behandlung)', items: [
            { t: 'info', text: '## Form- und Symmetriefreigabe\nIch habe die Vorzeichnung (Skizze) der Pigmentierung im Spiegel genauestens überprüft. Die Form, Breite, Länge, Platzierung und die Symmetrie entsprechen vollkommen meinen Wünschen. Ich wurde darauf hingewiesen, dass die finale Pigmentierung exakt auf Basis dieser Vorzeichnung durchgeführt wird.\n\nIch erteile hiermit ausdrücklich die Freigabe zur Pigmentierung auf Grundlage dieser Skizze.' },
            { t: 'ok', k: 'freigabe', l: 'Ich gebe die Vorzeichnung frei.', req: 1 }] }] },
        { id: 'abnahme', h: 'Abnahme', wann: 'nach der Behandlung', sign: ['kundin'], seiten: [
          { h: 'Abnahme durch den Kunden', items: [
            { t: 'info', text: 'Ich habe das Permanent Make-up genauestens überprüft und nach der Behandlung als einwandfrei und ordnungsgemäß beurteilt.' },
            { t: 'feld', k: 'maengel', l: 'Festgehaltene Mängel (nur falls vorhanden)', area: 1 },
            { t: 'ok', k: 'abgenommen', l: 'Ich nehme das Permanent Make-up ab.', req: 1 }] }] }
      ]
    },

    lashbrow: {
      id: 'lashbrow', titel: 'Einverständniserklärung Lash & Brow Lifting', kurz: 'Einverständnis Lifting', du: true,
      unter: 'Lashlifting · Browlifting · Färben · Zupfen · Fotoverwendung', fuer: ['Lash Lift', 'Brow Lift'], gesundheit: true, ab18: true,
      rollen: { kundin: 'Kundin / Kunde', studio: 'Studio' },
      teile: [{ id: 'einwilligung', h: 'Einverständnis', wann: 'vor der Behandlung', sign: ['kundin', 'studio'], seiten: [
        { h: 'Deine Angaben', items: felder('vorname', 'nachname', 'geburtsdatum', 'telefon', 'email') },
        { h: 'Behandlung und Aufklärung', items: [
          { t: 'wahl', k: 'behandlungen', l: 'Geplante Behandlung', o: ['Lashlifting', 'Browlifting', 'Färben', 'Zupfen'], multi: 1, req: 1, studio: 1,
            dflt: art => art === 'Brow Lift' ? ['Browlifting'] : art === 'Lash Lift' ? ['Lashlifting'] : [] },
          { t: 'info', text: 'Ich erkläre mich einverstanden mit der Durchführung von kosmetischen Behandlungen (Lashlifting, Browlifting, Färben und/oder Zupfen). Ich wurde über Ablauf, Wirkung sowie mögliche Risiken (z. B. Rötungen, Reizungen, allergische Reaktionen) aufgeklärt. Das Ergebnis kann individuell variieren.' }] },
        { h: 'Gesundheitsangaben', items: [
          { t: 'info', text: 'Ich bestätige, dass mir keine relevanten Allergien, Augen- oder Hauterkrankungen bekannt sind oder ich diese vor der Behandlung mitgeteilt habe.' },
          { t: 'feld', k: 'mitteilung', l: 'Das möchte ich mitteilen (freiwillig, z. B. Allergien, Augen- oder Hauterkrankungen)', area: 1, flag: 1 },
          { t: 'ok', k: 'gesund', l: 'Ich bestätige das.', req: 1 }] },
        { h: 'Haftungsausschluss', items: [{ t: 'info', text: 'Die Behandlung erfolgt auf eigenen Wunsch. Das Studio übernimmt keine Haftung für unbekannte Unverträglichkeiten, falsche Angaben oder Nichtbeachtung der Pflegehinweise.' }] },
        { h: 'Fotoerstellung und Veröffentlichung', items: [
          { t: 'wahl', k: 'foto', l: 'Foto- und Videoaufnahmen', req: 1, o: [['ja', 'Ich stimme der Foto-/Videoerstellung zu', 'Fotos erlaubt'], ['nein', 'Ich stimme nicht zu', 'keine Fotos']] },
          { t: 'wahl', k: 'nutzung', l: 'Verwendung', req: 1, show: w => w.foto === 'ja', o: [['oeffentlich', 'Veröffentlichung für Website & Social Media erlaubt', 'Website & Social Media'], ['intern', 'Nur interne Nutzung', 'nur intern']] },
          { t: 'info', text: 'Die Veröffentlichung erfolgt ohne Namensnennung. Ein Widerruf ist jederzeit schriftlich möglich (nicht rückwirkend).' }] },
        { h: 'Datenschutz', items: [
          { t: 'info', text: 'Meine Daten werden gemäß DSGVO ausschließlich zur Kundenverwaltung und Dokumentation verwendet.' },
          { t: 'ok', k: 'datenschutz', l: 'Ich habe das gelesen und bin einverstanden.', req: 1 }] }
      ] }]
    },

    'kontra-ll': {
      id: 'kontra-ll', titel: 'Kontraindikationen-Fragebogen Lash Lift', kurz: 'Kontraindikationen Lash Lift', du: true,
      unter: `${S.name} · Lash Lift`, fuer: ['Lash Lift'], gesundheit: true, ab18: true,
      rollen: { kundin: 'Kundin' },
      teile: [{ id: 'fragebogen', h: 'Fragebogen', wann: 'vor jeder Behandlung', sign: ['kundin'], seiten: [
        { h: 'Deine Angaben', items: [...felder('vorname', 'nachname', 'geburtsdatum'),
          { t: 'info', app: 1, text: 'Auf den nächsten Seiten kreuzt du nur an, was auf dich zutrifft. Trifft nichts zu, tippe auf „Nichts davon trifft zu“.' }] },
        { h: '1. Alter · 2. Gesundheit und Lebenslage', items: [{ t: 'kreuze', k: 'gesundheit', flag: 1, req: 1, o: [
          'Ich bin unter 18 Jahre alt (Behandlung erst ab 18)', 'Ich bin schwanger (kein Lash Lift möglich)', 'Ich stille (kein Lash Lift möglich)',
          'Ich habe aktuell oder hatte früher eine Krebserkrankung', 'Ich habe Alopezie (krankhafter Haarausfall)', 'Ich habe aktuell Fieber oder eine akute Erkrankung',
          'Ich habe aktuell eine Augen- oder Hautentzündung im Augenbereich', 'Ich habe trockene oder ständig tränende Augen',
          'Ich habe Bandhaare (flache Haarstruktur, Umformung kaum möglich)', 'Ich habe heute im selben Termin eine weitere kosmetische Behandlung geplant (z. B. Gesichtsbehandlung)'] }] },
        { h: '3. Operationen und frühere Behandlungen', items: [{ t: 'kreuze', k: 'ops', flag: 1, req: 1, o: [
          'Ich hatte in den letzten 6 Wochen eine Operation (Teil- oder Vollnarkose)', 'Ich hatte in den letzten 8 Wochen eine Augenlidstraffung',
          'Ich hatte in den letzten 3 Wochen ein Permanent Make-up (Lider oder Augenbrauen)', 'Ich plane in den nächsten 8 Wochen eine Wimpernverlängerung',
          'Ich habe in den letzten 7 Tagen Wimpernkränze (Drogerie) getragen', 'Ich habe gestern Abend viel Alkohol getrunken'] }] },
        { h: '4. Allergien', items: [{ t: 'kreuze', k: 'allergien', flag: 1, req: 1, o: [
          'Silikon', 'Wasserstoffperoxid (z. B. aus Haarfarbe)', 'Lacke (z. B. Nagellack, Shellac)', 'Wimpernkleber oder Klebstoffe',
          'Ich hatte schon einmal eine allergische Reaktion bei einer Kosmetikbehandlung', 'Ich mache eine Desensibilisierung (Allergie-Therapie)'] }] },
        { h: '5. Medikamente', items: [{ t: 'kreuze', k: 'medikamente', flag: 1, req: 1, o: [
          'Isotretinoin (z. B. Roaccutan) – aktuell oder in den letzten 6 Monaten', 'Andere Retinoide als Tabletten oder Creme (z. B. Tretinoin, Adapalen, Tazaroten)',
          'Kortison (Tabletten oder Creme)', 'Antibiotika', 'Antidepressiva', 'Chemotherapie oder Bestrahlung'] },
          { t: 'feld', k: 'andereMed', l: 'Andere Medikamente', flag: 1 }] },
        { h: 'Bestätigung', items: [
          { t: 'info', text: 'Ich habe alle Fragen vollständig und wahrheitsgemäß beantwortet. Ich weiß, dass die Behandlerin bei angekreuzten Punkten die Behandlung ablehnen, verschieben oder nur nach ärztlicher Rücksprache durchführen kann.' },
          { t: 'ok', k: 'bestaetigt', l: 'Ich bestätige das.', req: 1 }] }
      ] }]
    },

    waxing: {
      id: 'waxing', titel: 'Waxing-Fragebogen', kurz: 'Waxing-Fragebogen', du: false,
      unter: 'Hautanamnese und Datenschutz', fuer: ['Waxing'], gesundheit: true,
      rollen: { kundin: 'Kundin / Kunde' },
      teile: [{ id: 'fragebogen', h: 'Fragebogen', wann: 'vor der ersten Behandlung', sign: ['kundin'], seiten: [
        { h: 'Ihre Angaben', items: [
          { t: 'info', text: 'Mithilfe dieses Fragebogens können wir Ihre Haut besser kennenlernen und die Auswahl unserer Waxing- und Pflegeprodukte entsprechend anpassen. Um optimale Ergebnisse zu erzielen, erhalten Sie außerdem eine zielgerichtete Beratung zur Pflege nach dem Waxing.' },
          ...felder('vorname', 'nachname', 'email', 'telefon')] },
        { h: 'Vorerfahrungen mit Haarentfernung', items: [
          { t: 'wahl', k: 'methoden', l: 'Wie wurden die unerwünschten Härchen in den letzten Monaten entfernt?', multi: 1, o: ['Rasur', 'Waxing', 'Sugaring', 'Haarentfernungscreme', 'IPL / Laser', 'Pinzette / Fadentechnik', 'Epilierer'] },
          { t: 'wahl', k: 'erfahrung', l: 'Wie sind Ihre Erfahrungen mit der oben genannten Behandlung?', multi: 1, flagO: ['Ich bekomme häufig Pickel nach der Enthaarung', 'Meine Haut ist lange Zeit gerötet/gereizt', 'Ich habe häufig eingewachsene Haare'],
            o: ['Gute Verträglichkeit', 'Ich bekomme häufig Pickel nach der Enthaarung', 'Meine Haut ist lange Zeit gerötet/gereizt', 'Ich habe häufig eingewachsene Haare'] },
          { t: 'feld', k: 'anmerkungen', l: 'Weitere Anmerkungen', area: 1 }] },
        { h: 'Haarwuchs und Körperstellen', items: [
          { t: 'wahl', k: 'haarwuchs', l: 'Wie beurteilen Sie Ihren Haarwuchs?', o: ['Normal', 'Langsam', 'Schnell'] },
          { t: 'wahl', k: 'stellen', l: 'Gewünschte Körperstellen', multi: 1, o: ['Gesicht', 'Intimbereich', 'Große Körperflächen (Beine/Rücken)'] }] },
        { h: 'Zustand Ihrer Haut und Anamnese', items: [
          { t: 'wahl', k: 'hauttyp', l: 'Was für einen Hauttyp haben Sie?', o: ['Normal', 'Trocken', 'Ölig'], req: 1 },
          { t: 'wahl', k: 'hautgefuehl', l: 'Wie schätzen Sie Ihre Haut ein?', o: ['Normal', 'Sensibel', 'Sehr sensibel'], req: 1 },
          { t: 'wahl', k: 'schwitzen', l: 'Schwitzen Sie viel?', o: ['Nein', 'Mittel', 'Ja'], req: 1 },
          JN('haematome', 'Bekommen Sie schnell Hämatome / blaue Flecken?'), JN('hautprobleme', 'Haben Sie an den zu behandelnden Arealen Hautprobleme?'),
          JN('aerztlich', 'Befinden Sie sich in relevanter (haut)ärztlicher Behandlung?'), JN('schwanger', 'Sind Sie schwanger?')] },
        { h: 'Datenschutzhinweis', items: [
          { t: 'info', text: 'Selbstverständlich werden Ihre Daten absolut sicher aufbewahrt und nicht an unbefugte Dritte weitergegeben. Sind Sie damit einverstanden, dass wir Ihre personenbezogenen Daten intern speichern und Sie bei Bedarf (z. B. zur Terminabstimmung) per Telefon oder E-Mail kontaktieren?' },
          { t: 'wahl', k: 'datenschutz', l: 'Ihre Antwort', req: 1, o: [['ja', 'Ja, ich stimme zu', 'zugestimmt'], ['nein', 'Nein', 'nicht zugestimmt']] }] },
        { h: 'Ihre individuelle Nachpflege', items: [{ t: 'info', text: '## Grundregeln für optimale Ergebnisse nach dem Waxing\n• PINK SkinClean Lotion: Schützt die Haut und beugt gezielt eingewachsenen Haaren vor.\n• PINK Hair Growth Minimizer: Beruhigt die zarte Haut und verlangsamt das Haarwachstum spürbar.\n• Regelmäßiges Peeling: Ab dem 3. Tag nach dem Waxing ca. 3-mal wöchentlich peelen, um abgestorbene Hautschüppchen zu entfernen.' }] }
      ] }]
    },

    tfp: {
      id: 'tfp', titel: 'TFP-Vereinbarung', kurz: 'TFP-Vertrag (Model)', du: true, optional: true,
      unter: 'für Lash Lift & Brow Lift (Foto-/Videodokumentation)', fuer: ['Lash Lift', 'Brow Lift'],
      rollen: { kundin: 'Model', vertreter: 'Erziehungsberechtigte/r', studio: 'Stylistin / Studio' },
      teile: [{ id: 'vertrag', h: 'Vertrag', wann: 'nur bei Model-Terminen', sign: ['kundin', 'vertreter', 'studio'], seiten: [
        { h: 'Vertragspartner', items: [
          { t: 'info', text: `## Stylistin / Studio (Dienstleister)\n${S.voll}\n${S.adr}\n${S.tel} · ${S.mail}\n\n## und Model` },
          ...felder('vorname', 'nachname', 'strasse', 'plz', 'ort', 'geburtsdatum', 'telefon', 'email')] },
        { h: '§ 1 Vertragsgegenstand und TFP-Grundsatz', items: [
          { t: 'feld', k: 'tfpDatum', l: 'Datum der Behandlung', typ: 'date', req: 1, half: 1, studio: 1, dflt: () => heute() },
          { t: 'wahl', k: 'tfpLash', l: 'LashLift (Wimpernlifting) inkl. Färben', o: [['ja', 'Ja'], ['nein', 'Nein']], req: 1, studio: 1, dflt: art => art === 'Lash Lift' ? 'ja' : 'nein' },
          { t: 'wahl', k: 'tfpBrow', l: 'BrowLift (Augenbrauenlifting) inkl. Färben/Grooming', o: [['ja', 'Ja'], ['nein', 'Nein']], req: 1, studio: 1, dflt: art => art === 'Brow Lift' ? 'ja' : 'nein' },
          { t: 'info', text: '1. Der Dienstleister führt am {tfpDatum} die oben angekreuzte(n) kosmetische(n) Behandlung(en) an dem Model durch.\n2. Die Behandlung erfolgt für das Model kostenfrei.\n3. Im Gegenzug stellt sich das Model für Foto- und Videovergleiche (Vorher/Nachher, Ablauf der Behandlung, Nahaufnahmen der Augenpartie) zur Verfügung und räumt dem Dienstleister die Nutzungsrechte gemäß § 3 ein.\n4. Es findet keine finanzielle Vergütung statt (TFP = Time for Print / Picture).' }] },
        { h: '§ 2 Gesundheitliche Hinweise und Mitwirkungspflichten', items: [
          { t: 'info', text: '1. Das Model versichert, den Dienstleister vor der Behandlung wahrheitsgemäß über Folgendes aufzuklären:\n• Bekannte Allergien oder Überempfindlichkeiten (insbesondere gegen Klebstoffe, Entwicklerflüssigkeiten, Haar-/Wimpernfarben).\n• Erkrankungen im oder am Auge (z. B. Bindehautentzündung, Gerstenkorn, trockene Augen, frische Augen-OPs).\n• Eine bestehende Schwangerschaft oder Stillzeit (hormonelle Veränderungen können das Lifting-Ergebnis beeinflussen).\n\n2. Kontaktlinsen: Das Model verpflichtet sich, vor Beginn der LashLift-Behandlung vorhandene Kontaktlinsen zu entfernen.\n\n3. Nachpflege (Aftercare): Das Model verpflichtet sich, die Pflegehinweise einzuhalten (insbesondere in den ersten 24–48 Stunden: kein Wasserkontakt, kein Dampf/Sauna, kein Augen-Make-up, kein Reiben der Augen/Brauen).' },
          { t: 'ok', k: 'mitwirkung', l: 'Ich habe das gelesen und halte mich daran.', req: 1 }] },
        { h: '§ 3 Einräumung von Nutzungsrechten (Foto und Video)', items: [{ t: 'info', text: '1. Das Model räumt dem Dienstleister das zeitlich, räumlich und inhaltlich unbeschränkte sowie unwiderrufliche Recht ein, das während des Termins entstandene Bild- und Videomaterial (insbesondere Nahaufnahmen der Augen- und Augenbrauenpartie sowie des Gesichts) zu nutzen für:\n• Eigenwerbung auf Social Media (Instagram, TikTok, Facebook, YouTube etc.).\n• Veröffentlichung auf der Website sowie im digitalen und gedruckten Portfolio/Flyern.\n\n2. Dem Model wird das Recht eingeräumt, bereitgestelltes Bildmaterial für eigene, nicht-kommerzielle Zwecke (z. B. eigene Social-Media-Kanäle) unter Nennung/Verlinkung des Dienstleisters zu nutzen.' }] },
        { h: '§ 4 Haftungsausschluss · § 5 Datenschutz · § 6 Schlussbestimmungen', items: [{ t: 'info', text: '## § 4 Haftungsausschluss\n1. Die Behandlung erfolgt unter Anwendung professioneller Lash- & BrowLift-Produkte und Einhaltung notwendiger Hygienestandards.\n2. Trotz fachgerechter Anwendung können in Einzelfällen leichte Rötungen, Irritationen oder allergische Reaktionen an Augen/Haut auftreten. Der Dienstleister übernimmt hierfür keine Haftung, sofern nicht vorsätzlich oder grob fahrlässig gehandelt wurde.\n3. Aufgrund individueller Haar- und Wimpernstruktur kann ein bestimmtes Wimpern- oder Brauenergebnis nicht garantiert werden.\n\n## § 5 Datenschutz\nDie erhobenen personenbezogenen Daten dienen ausschließlich der Abwicklung dieses Vertrages und werden vertraulich gemäß DSGVO behandelt.\n\n## § 6 Schlussbestimmungen\nÄnderungen bedürfen der Schriftform. Sollte eine Bestimmung unwirksam sein, bleibt der Vertrag im Übrigen wirksam.' }] },
        { h: 'Einwilligung in Bild- und Videoaufnahmen (DSGVO)', items: [
          { t: 'info', text: 'Ich willige ausdrücklich ein, dass Nahaufnahmen meiner Augen-, Brauen- und Gesichtspartie zum Zwecke der Dokumentation und Werbenutzung gemäß § 3 verarbeitet und veröffentlicht werden dürfen.' },
          { t: 'ok', k: 'einwilligung', l: 'Ich willige ein.', req: 1 }] },
        { h: 'Erziehungsberechtigte/r', show: minderjaehrig, items: [
          { t: 'info', app: 1, text: 'Das Model ist noch nicht volljährig. Bitte unterschreibt zusätzlich eine erziehungsberechtigte Person.' },
          { t: 'feld', k: 'v_vorname', l: 'Vorname', req: 1, half: 1 }, { t: 'feld', k: 'v_nachname', l: 'Nachname', req: 1, half: 1 },
          { t: 'feld', k: 'v_telefon', l: 'Telefon', typ: 'tel', half: 1 }] }
      ] }]
    }
  };
  const ARTS = ['PMU', 'Lash Lift', 'Brow Lift', 'Waxing'];
  const defsFuer = art => Object.values(DEFS).filter(d => d.fuer.includes(art));
  FCC.formDefs = DEFS;

  // ---------- Auswertung eines Formulars ----------
  const alleItems = (def, bisTeil) => {
    const out = [];
    for (const t of def.teile) { t.seiten.forEach(p => p.items.forEach(it => out.push(it))); if (t.id === bisTeil) break; }
    return out;
  };
  const sichtbar = (it, w) => !it.show || it.show(w);
  const istFertig = rec => !!rec && DEFS[rec.typ] && DEFS[rec.typ].teile.every(t => rec.teile && rec.teile[t.id] && rec.teile[t.id].fertig);
  const offenerTeil = rec => DEFS[rec.typ].teile.find(t => !(rec.teile && rec.teile[t.id] && rec.teile[t.id].fertig));
  const teilFertig = (rec, tid) => !!(rec && rec.teile && rec.teile[tid] && rec.teile[tid].fertig);
  const ersteUnterschrift = rec => { const t = DEFS[rec.typ].teile[0]; return teilFertig(rec, t.id) ? rec.teile[t.id].fertig : ''; };
  const letzteUnterschrift = rec => Object.values(rec.teile || {}).map(t => t.fertig || '').sort().pop() || '';
  const nameVon = w => `${w.vorname || ''} ${w.nachname || ''}`.trim();
  const vertreterName = w => `${w.v_vorname || ''} ${w.v_nachname || ''}`.trim();

  function anzeige(it, w) {
    const v = w[it.k];
    if (it.t === 'feld') return it.typ === 'date' ? fmt(v) : String(v || '');
    if (it.t === 'janein') return v ? (v === 'ja' ? 'ja' : 'nein') + (v === 'ja' && w[it.k + '_text'] ? ': ' + w[it.k + '_text'] : '') : '';
    if (it.t === 'wahl') {
      const os = it.o.map(opt);
      const lab = x => { const o = os.find(o => o[0] === x); return o ? o[2] : x; };
      let s = Array.isArray(v) ? v.map(lab).join(', ') : (v ? lab(v) : '');
      if (it.k === 'bereich' && (v || []).includes('Sonstiges') && w.bereichSonst) s = s.replace('Sonstiges', w.bereichSonst);
      return s;
    }
    if (it.t === 'kreuze') return w[it.k + '_keins'] ? 'nichts davon' : (v || []).join('; ');
    if (it.t === 'ok') return v ? 'ja' : '';
    return '';
  }
  // Platzhalter wie {vorname} in Texten ersetzen
  function textMit(text, w, def) {
    return String(text).replace(/\{(\w+)\}/g, (_, k) => {
      const it = alleItems(def).find(x => x.k === k);
      const s = it ? anzeige(it, w) : (w[k] || '');
      return s || '__________';
    });
  }

  // Auffällige Angaben für Kati (Gesundheit, Allergien …)
  function hinweise(rec) {
    const def = DEFS[rec.typ]; const w = rec.werte || {}; const out = [];
    alleItems(def).forEach(it => {
      if (!sichtbar(it, w)) return;
      if (it.t === 'janein' && it.flag && w[it.k] === 'ja') out.push(it.l.replace(/\?$/, '') + (w[it.k + '_text'] ? ': ' + w[it.k + '_text'] : ''));
      if (it.t === 'kreuze' && it.flag) (w[it.k] || []).forEach(x => out.push(x));
      if (it.t === 'feld' && it.flag && w[it.k]) out.push(it.l.replace(/\s*\(.*\)$/, '') + ': ' + w[it.k]);
      if (it.t === 'wahl' && it.flagO) (w[it.k] || []).filter(x => it.flagO.includes(x)).forEach(x => out.push(x));
    });
    if (def.ab18 && minderjaehrig(w)) out.unshift('unter 18 Jahre');
    return out;
  }

  // ---------- Prüfsumme (SHA-256) ----------
  const stabil = v => Array.isArray(v) ? '[' + v.map(stabil).join(',') + ']'
    : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stabil(v[k])).join(',') + '}' : JSON.stringify(v === undefined ? null : v);
  function inhaltBis(rec, tid) {
    const def = DEFS[rec.typ]; const keys = new Set();
    alleItems(def, tid).forEach(it => { if (it.k) { keys.add(it.k); keys.add(it.k + '_text'); keys.add(it.k + '_keins'); } });
    const werte = {}; Object.keys(rec.werte || {}).sort().forEach(k => { if (keys.has(k)) werte[k] = rec.werte[k]; });
    const teile = {};
    for (const t of def.teile) { const x = rec.teile[t.id]; if (x) teile[t.id] = { sig: x.sig, fertig: x.fertig }; if (t.id === tid) break; }
    return stabil({ formular: rec.typ, version: rec.version, id: rec.id, werte, teile });
  }
  async function sha(s) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  async function pruefen(rec) {
    const out = {};
    for (const t of DEFS[rec.typ].teile) {
      const x = rec.teile[t.id];
      if (x && x.hash) { try { out[t.id] = (await sha(inhaltBis(rec, t.id))) === x.hash; } catch (e) { out[t.id] = null; } }
    }
    return out;
  }

  // ---------- Status für Akte und Behandlungsbogen ----------
  const neuestes = (c, typ) => (c.formulare || []).filter(r => r.typ === typ).sort((a, b) => (letzteUnterschrift(b) || b.start || '').localeCompare(letzteUnterschrift(a) || a.start || ''))[0];
  function status(c, def) {
    const rec = neuestes(c, def.id);
    if (!rec) return { k: def.optional ? 'frei' : 'fehlt', text: def.optional ? 'bei Bedarf' : 'fehlt', rec };
    if (!istFertig(rec)) { const t = offenerTeil(rec); return { k: 'offen', text: `${t.h} offen`, rec, teil: t }; }
    const d = ersteUnterschrift(rec);
    if (!def.optional && tageSeit(d) > 365) return { k: 'alt', text: `vom ${fmt(d)}, älter als 1 Jahr`, rec };
    return { k: 'ok', text: `unterschrieben am ${fmt(letzteUnterschrift(rec))}`, rec };
  }
  // Häkchen im Behandlungsbogen, die durch digitale Unterschriften erfüllt sind
  FCC.formChecks = (c, art, datum) => {
    const out = new Set(); const tag = datum || heute();
    (c.formulare || []).forEach(rec => {
      const def = DEFS[rec.typ]; if (!def || !def.fuer.includes(art)) return;
      if (rec.typ === 'pmu') {
        if (teilFertig(rec, 'einwilligung') && tageSeit(rec.teile.einwilligung.fertig) <= 365) out.add('Einwilligung unterschrieben');
        if (teilFertig(rec, 'vorzeichnung') && rec.teile.vorzeichnung.fertig.slice(0, 10) === tag) out.add('Vorzeichnung von Kundin freigegeben');
        return;
      }
      const f = ersteUnterschrift(rec);
      if (!f) return;
      if (rec.typ === 'kontra-ll' && f.slice(0, 10) === tag) out.add('Fragebogen unterschrieben');
      if (rec.typ === 'lashbrow' && art === 'Brow Lift' && f.slice(0, 10) === tag) out.add('Fragebogen unterschrieben');
    });
    return [...out];
  };

  // Hinweiszeile oben im Behandlungsbogen
  FCC.formBanner = (c, art) => {
    const defs = defsFuer(art).filter(d => !d.optional);
    if (!defs.length) return '';
    const st = defs.map(d => ({ d, s: status(c, d) }));
    const naechstes = st.find(x => x.s.k !== 'ok');
    const teile = st.map(x => `${esc(x.d.kurz)}: <b>${x.s.k === 'ok' ? '✓ ' + esc(fmt(letzteUnterschrift(x.s.rec))) : esc(x.s.text)}</b>`).join(' · ');
    return `<div class="banner fo-banner"><span>${teile}</span>${naechstes ? `<button type="button" class="btn small" data-fostart="${esc(naechstes.d.id)}">${naechstes.s.k === 'offen' ? esc(naechstes.s.teil.h) + ' unterschreiben lassen' : 'Ausfüllen lassen'}</button>` : ''}</div>`;
  };
  FCC.formBind = (root, c, art, nachher, u) => {
    (root || document).querySelectorAll('[data-fostart]').forEach(b => b.onclick = () => starte(c, b.dataset.fostart, { art, nachher, u }));
  };

  // ---------- Karte in der Akte ----------
  let offeneArt = null; let offeneArtFuer = null;
  FCC.formCard = (c, el, u) => {
    if (!el) return;
    c.formulare = c.formulare || [];
    if (offeneArtFuer !== c.id) { offeneArtFuer = c.id; const b = [...(c.behandlungen || [])].sort((a, b) => b.datum.localeCompare(a.datum))[0]; offeneArt = b ? b.art : null; }
    const kachel = art => {
      const defs = defsFuer(art).filter(d => !d.optional); const st = defs.map(d => status(c, d));
      const ok = st.filter(s => s.k === 'ok').length; const offen = st.some(s => s.k === 'offen');
      const k = ok === defs.length ? 'ok' : offen ? 'offen' : 'fehlt';
      const n = defs.length - ok; const txt = k === 'ok' ? 'alles unterschrieben' : offen ? 'Unterschrift offen' : n === 1 ? '1 Formular fehlt' : `${n} Formulare fehlen`;
      return `<button type="button" class="fo-kachel ${offeneArt === art ? 'on' : ''}" data-foart="${esc(art)}" aria-expanded="${offeneArt === art}"><b>${esc(art)}</b><span class="fo-st ${k}">${esc(txt)}</span></button>`;
    };
    const liste = offeneArt ? defsFuer(offeneArt).map(d => {
      const s = status(c, d);
      const knopf = s.k === 'offen' ? `<button class="btn small" data-fogo="${esc(d.id)}">${esc(s.teil.h)} unterschreiben lassen</button>`
        : s.k === 'ok' ? `<button class="btn ghost small" data-fogo="${esc(d.id)}" data-neu="1">Neu ausfüllen lassen</button>`
        : `<button class="btn small" data-fogo="${esc(d.id)}">Ausfüllen lassen</button>`;
      return `<li><span><b style="font-weight:500">${esc(d.titel)}</b>${d.optional ? ' <span class="cmeta">(nur bei Model-Terminen)</span>' : ''}<br><span class="fo-st ${s.k}">${esc(s.text)}</span>${d.teile.length > 1 ? `<span class="cmeta"> · ${d.teile.map(t => esc(t.h) + ' ' + esc(t.wann)).join(', ')}</span>` : ''}</span>${knopf}</li>`;
    }).join('') : '';
    const recs = [...c.formulare].sort((a, b) => (letzteUnterschrift(b) || '').localeCompare(letzteUnterschrift(a) || ''));
    el.innerHTML = `<div class="panel card">
      <div class="row between"><div class="row" style="gap:6px"><h2>Formulare & Unterschriften</h2><button class="qhelp" data-hilfe="formulare" aria-label="Hilfe zu Formularen" title="Hilfe">?</button></div><span class="label">${recs.length} ${recs.length === 1 ? 'Formular' : 'Formulare'}</span></div>
      <p class="cmeta" style="margin:6px 0 0">Tippe auf die Behandlung. Die Kundin füllt am iPad aus und unterschreibt mit dem Stift.</p>
      <div class="fo-kacheln">${ARTS.map(kachel).join('')}</div>
      ${offeneArt ? `<ul class="docs fo-liste">${liste}</ul>` : ''}
      ${recs.length ? `<span class="label" style="display:block;margin-top:16px">Unterschrieben</span><ul class="docs">${recs.map(r => {
        const d = DEFS[r.typ]; if (!d) return '';
        const h = hinweise(r); const fertig = istFertig(r);
        return `<li><span><b style="font-weight:500">${esc(d.titel)}</b><br><span class="cmeta">${fertig ? 'vollständig, ' + esc(fmtZeit(letzteUnterschrift(r))) : esc(offenerTeil(r).h) + ' noch offen · begonnen ' + esc(fmt(r.start))}</span>
          ${h.length ? `<br><span class="fo-st alt">Angekreuzt: ${esc(h.join(' · '))}</span>` : ''}</span>
          <span class="row" style="gap:6px;flex-wrap:nowrap;align-self:center"><button class="btn ghost small" data-foview="${esc(r.id)}">Ansehen</button><button class="btn ghost small" data-fopdf="${esc(r.id)}">PDF</button></span></li>`;
      }).join('')}</ul>` : ''}
    </div>`;
    el.querySelectorAll('[data-hilfe]').forEach(b => b.onclick = () => FCC.hilfe && FCC.hilfe(b.dataset.hilfe));
    el.querySelectorAll('[data-foart]').forEach(b => b.onclick = () => { offeneArt = offeneArt === b.dataset.foart ? null : b.dataset.foart; FCC.formCard(c, el, u); });
    el.querySelectorAll('[data-fogo]').forEach(b => b.onclick = () => starte(c, b.dataset.fogo, { art: offeneArt, neu: b.dataset.neu === '1', u }));
    el.querySelectorAll('[data-foview]').forEach(b => b.onclick = () => ansehen(c, c.formulare.find(r => r.id === b.dataset.foview), u));
    el.querySelectorAll('[data-fopdf]').forEach(b => b.onclick = () => pdfAusgeben(c, c.formulare.find(r => r.id === b.dataset.fopdf), false, b));
  };

  // ---------- Kundinnen-Ansicht (Vollbild) ----------
  let sess = null;
  function starte(c, typ, o) {
    o = o || {};
    const def = DEFS[typ]; if (!def) return;
    c.formulare = c.formulare || [];
    let rec = !o.neu ? neuestes(c, typ) : null;
    if (rec && istFertig(rec)) rec = null;
    const neu = !rec;
    if (neu) {
      const w = { vorname: c.vorname || '', nachname: c.nachname || '', geburtsdatum: c.geburtsdatum || '', strasse: c.strasse || '', plz: c.plz || '', ort: c.ort || '', telefon: c.telefon || '', email: c.email || '' };
      alleItems(def).forEach(it => { if (it.dflt && w[it.k] == null) w[it.k] = it.dflt(o.art); });
      rec = { id: uid(), typ, version: 1, titel: def.titel, start: heute(), art: o.art || def.fuer[0], werte: w, teile: {} };
    }
    const teil = offenerTeil(rec);
    sess = { c, def, rec, neu, teil, w: clone(rec.werte), sig: {}, i: 0, o, signiert: false, status: '' };
    zeichne();
  }
  function schritte() {
    const { def, teil, w } = sess; const out = [];
    const seiten = teil.seiten.filter(p => sichtbar(p, w));
    if (seiten.some(p => p.items.some(it => it.studio && sichtbar(it, w)))) out.push({ typ: 'prep' });
    seiten.forEach(p => out.push({ typ: 'seite', p }));
    teil.sign.filter(r => r !== 'vertreter' || minderjaehrig(w)).forEach(r => { if (r === 'studio') out.push({ typ: 'uebergabe' }); out.push({ typ: 'sign', r }); });
    out.push({ typ: 'fertig' });
    return out;
  }
  const T = (du, sie) => sess.def.du ? du : sie;

  function feldHtml(it, w, nurLesen) {
    if (!sichtbar(it, w)) return '';
    if (it.t === 'info') return `<div class="fo-info">${absaetze(textMit(it.text, w, sess.def))}</div>`;
    if (nurLesen) return `<div class="fo-ro"><span class="label">${esc(it.l)}</span><b>${esc(anzeige(it, w)) || '–'}</b></div>`;
    const req = it.req ? ' <span class="fo-req" aria-hidden="true">*</span>' : '';
    if (it.t === 'feld') {
      const id = 'fo-' + it.k; const v = esc(w[it.k] || '');
      return `<div class="fo-f ${it.half ? 'half' : ''}" data-fk="${esc(it.k)}"><label for="${id}">${esc(it.l)}${req}</label>${it.area ? `<textarea id="${id}" data-in="${esc(it.k)}" rows="3">${v}</textarea>`
        : `<input id="${id}" data-in="${esc(it.k)}" type="${it.typ || 'text'}" ${it.num ? 'inputmode="decimal"' : ''} ${it.typ === 'email' ? 'autocapitalize="off"' : ''} autocomplete="off" value="${v}">`}</div>`;
    }
    if (it.t === 'janein') {
      const v = w[it.k];
      return `<div class="fo-q" data-fk="${esc(it.k)}"><div class="fo-ql">${esc(it.l)}${req}</div><div class="fo-yn">${['ja', 'nein'].map(x => `<button type="button" class="${v === x ? 'on' : ''}" data-yn="${esc(it.k)}" data-o="${x}" aria-pressed="${v === x}">${x === 'ja' ? 'Ja' : 'Nein'}</button>`).join('')}</div>
        ${v === 'ja' && it.detail ? `<input class="fo-det" data-in="${esc(it.k)}_text" placeholder="${esc(it.detail)}" value="${esc(w[it.k + '_text'] || '')}" aria-label="${esc(it.l)}: ${esc(it.detail)}">` : ''}</div>`;
    }
    if (it.t === 'wahl') {
      const os = it.o.map(opt); const lang = os.some(o => o[1].length > 45); const v = w[it.k];
      const on = x => Array.isArray(v) ? v.includes(x) : v === x;
      return `<div class="fo-w" data-fk="${esc(it.k)}"><div class="fo-ql">${esc(it.l)}${it.multi ? ' <span class="cmeta">(mehrere möglich)</span>' : ''}${req}</div>
        <div class="${lang ? 'fo-karten' : 'fo-chips'}">${os.map(o => `<button type="button" class="${lang ? 'fo-k' : 'fo-chip'} ${on(o[0]) ? 'on' : ''}" data-wahl="${esc(it.k)}" data-o="${esc(o[0])}" aria-pressed="${on(o[0])}">${lang ? '<span class="fo-box"></span>' : ''}<span>${esc(o[1])}</span></button>`).join('')}</div></div>`;
    }
    if (it.t === 'kreuze') {
      const v = w[it.k] || []; const keins = !!w[it.k + '_keins'];
      return `<div class="fo-w" data-fk="${esc(it.k)}"><div class="fo-karten">${it.o.map(o => `<button type="button" class="fo-k ${v.includes(o) ? 'on' : ''}" data-kz="${esc(it.k)}" data-o="${esc(o)}" aria-pressed="${v.includes(o)}"><span class="fo-box"></span><span>${esc(o)}</span></button>`).join('')}
        <button type="button" class="fo-k fo-keins ${keins ? 'on' : ''}" data-keins="${esc(it.k)}" aria-pressed="${keins}"><span class="fo-box"></span><span>Nichts davon trifft zu</span></button></div></div>`;
    }
    if (it.t === 'ok') return `<div class="fo-w" data-fk="${esc(it.k)}"><button type="button" class="fo-k fo-okb ${w[it.k] ? 'on' : ''}" data-ok="${esc(it.k)}" aria-pressed="${!!w[it.k]}"><span class="fo-box"></span><span>${esc(it.l)}</span></button></div>`;
    return '';
  }
  function absaetze(t) {
    return String(t).split('\n\n').map(b => {
      const zeilen = b.split('\n'); let h = '';
      if (zeilen[0].startsWith('## ')) h = `<h4>${esc(zeilen.shift().slice(3))}</h4>`;
      const bul = zeilen.filter(z => z.startsWith('• ')); const rest = zeilen.filter(z => !z.startsWith('• '));
      return h + (rest.length ? `<p>${rest.map(esc).join('<br>')}</p>` : '') + (bul.length ? `<ul>${bul.map(z => `<li>${esc(z.slice(2))}</li>`).join('')}</ul>` : '');
    }).join('');
  }

  function fehlt(items, w) {
    return items.filter(it => it.req && sichtbar(it, w)).filter(it => {
      const v = w[it.k];
      if (it.t === 'kreuze') return !(v && v.length) && !w[it.k + '_keins'];
      if (it.t === 'wahl' && it.multi) return !(v && v.length);
      if (it.t === 'feld' && it.typ === 'email' && v) return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (it.t === 'feld' && it.typ === 'date' && v) return !/^\d{4}-\d{2}-\d{2}$/.test(v) || alter(v) < 0 || alter(v) > 120;
      return !v;
    }).map(it => it.k);
  }

  function root() {
    let r = document.getElementById('foRoot');
    if (!r) { r = document.createElement('div'); r.id = 'foRoot'; document.body.append(r); }
    return r;
  }
  function schliessen() {
    sess = null; root().innerHTML = ''; document.documentElement.classList.remove('fo-offen');
  }

  // Gedrückt halten: schützt vor versehentlichem Schließen durch die Kundin
  function halten(btn, ms, fn) {
    let t = null;
    const ab = () => { clearTimeout(t); t = null; btn.classList.remove('halten'); };
    btn.addEventListener('pointerdown', e => { e.preventDefault(); btn.classList.add('halten'); btn.style.setProperty('--ms', ms + 'ms'); t = setTimeout(() => { ab(); fn(); }, ms); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(x => btn.addEventListener(x, ab));
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }

  function zeichne(scrollTop) {
    if (!sess) return;
    const r = root(); document.documentElement.classList.add('fo-offen');
    const seq = schritte(); sess.i = Math.min(sess.i, seq.length - 1);
    const st = seq[sess.i]; const { def, w, teil } = sess;
    const kundinSchritte = seq.filter(x => x.typ === 'seite' || (x.typ === 'sign' && x.r !== 'studio'));
    const pos = kundinSchritte.indexOf(st);
    const fortschritt = pos >= 0 ? Math.round((pos + 1) / kundinSchritte.length * 100) : (st.typ === 'prep' ? 0 : 100);
    let inhalt = '', fuss = '';
    const zurueckOk = sess.i > 0 && !sess.signiert && st.typ !== 'fertig';
    const zur = zurueckOk ? '<button type="button" class="btn ghost" id="foZur">Zurück</button>' : '<span></span>';

    if (st.typ === 'prep') {
      const items = teil.seiten.filter(p => sichtbar(p, w)).flatMap(p => p.items.filter(it => it.studio));
      inhalt = `<span class="label">Vorbereitung für ${esc(S.kurz)}</span><h1>${esc(def.titel)}</h1>
        <p class="fo-sub">Trag hier ein, was das Studio festlegt. Die Kundin sieht es danach nur zum Lesen.</p>
        <div class="fo-grid">${items.map(it => feldHtml(it, w)).join('')}</div>`;
      fuss = `<span></span><button type="button" class="btn" id="foWeiter">iPad an die Kundin geben →</button>`;
    } else if (st.typ === 'seite') {
      const p = st.p;
      inhalt = `<span class="label">${esc(def.titel)}${def.teile.length > 1 ? ' · ' + esc(teil.h) : ''}</span><h1>${esc(p.h)}</h1>
        ${pos === 0 && def.unter ? `<p class="fo-sub">${esc(def.unter)}</p>` : ''}
        ${p.items.some(it => it.req && !it.studio && it.t !== 'ok') && pos === 0 ? `<p class="fo-sub">${T('Felder mit * bitte ausfüllen.', 'Felder mit * bitte ausfüllen.')}</p>` : ''}
        <div class="fo-grid">${p.items.map(it => feldHtml(it, w, !!it.studio)).join('')}</div>
        ${def.ab18 && p.items.some(it => it.k === 'geburtsdatum') && minderjaehrig(w) ? `<div class="banner fo-warn"><span>${esc(S.name)} behandelt erst ab 18 Jahren.</span></div>` : ''}`;
      fuss = `${zur}<button type="button" class="btn" id="foWeiter">Weiter</button>`;
    } else if (st.typ === 'uebergabe') {
      inhalt = `<div class="fo-mitte"><div class="fo-haken" aria-hidden="true">✓</div><h1>${T('Danke, du hast unterschrieben.', 'Vielen Dank, Sie haben unterschrieben.')}</h1>
        <p class="fo-sub">${T(`Bitte gib das iPad jetzt an ${esc(S.kurz)}.`, `Bitte geben Sie das iPad jetzt an ${esc(S.kurz)}.`)}</p></div>`;
      fuss = `<span></span><button type="button" class="btn" id="foWeiter">Weiter (${esc(S.kurz)})</button>`;
    } else if (st.typ === 'sign') {
      const rolle = st.r; const wer = rolle === 'studio' ? S.inh : rolle === 'vertreter' ? vertreterName(w) : nameVon(w);
      const schon = sess.sig[rolle];
      inhalt = `<span class="label">${esc(def.titel)}${def.teile.length > 1 ? ' · ' + esc(teil.h) : ''}</span><h1>Unterschrift ${esc(def.rollen[rolle] || '')}</h1>
        <p class="fo-sub">${rolle === 'studio' ? 'Unterschrift und Stempel des Studios.' : T('Mit deiner Unterschrift bestätigst du alle Angaben auf den vorherigen Seiten.', 'Mit Ihrer Unterschrift bestätigen Sie alle Angaben auf den vorherigen Seiten.')}</p>
        <div class="fo-ortdatum"><span><span class="label">Ort, Datum</span><b>${esc(S.ort)}, ${esc(fmt(heute()))}</b></span><span><span class="label">Name</span><b>${esc(wer)}</b></span></div>
        <div id="foPad"></div>`;
      fuss = `${schon ? '<span></span>' : zur}<button type="button" class="btn" id="foSign" disabled>${rolle === 'studio' || !seq.some((x, j) => j > sess.i && x.typ === 'sign') ? 'Unterschreiben und abschließen' : 'Unterschreiben'}</button>`;
    } else if (st.typ === 'fertig') {
      const vn = w.vorname || '';
      inhalt = sess.status === 'ok' ? `<div class="fo-mitte"><div class="fo-haken" aria-hidden="true">✓</div><h1>${T(`Danke${vn ? ', ' + esc(vn) : ''}!`, 'Vielen Dank!')}</h1>
          <p class="fo-sub">${T(`Alles ist sicher gespeichert. Bitte gib das iPad an ${esc(S.kurz)} zurück.`, `Alles ist sicher gespeichert. Bitte geben Sie das iPad an ${esc(S.kurz)} zurück.`)}</p>${sess.pdfFehler ? `<p class="fo-sub fo-err">Hinweis für ${esc(S.kurz)}: Das Formular ist gespeichert, das PDF liegt aber noch nicht in Drive (${esc(sess.pdfFehler)}). Über „PDF“ in der Akte kannst du es jederzeit erzeugen.</p>` : ''}</div>`
        : sess.status === 'fehler' ? `<div class="fo-mitte"><h1>Noch nicht gespeichert</h1><p class="fo-sub fo-err">${esc(sess.fehler || '')}</p><p class="fo-sub">Die Unterschrift ist nicht verloren. Bitte Internet prüfen und noch einmal versuchen.</p></div>`
        : `<div class="fo-mitte"><div class="fo-lade" aria-hidden="true"></div><h1>Wird sicher gespeichert …</h1><p class="fo-sub">${T('Einen Moment bitte.', 'Einen Moment bitte.')}</p></div>`;
      fuss = sess.status === 'ok' ? `<span></span><button type="button" class="btn fo-halt" id="foEnde">${esc(S.kurz)}: gedrückt halten zum Schließen</button>`
        : sess.status === 'fehler' ? `<button type="button" class="btn ghost fo-halt" id="foEnde">Abbrechen (halten)</button><button type="button" class="btn" id="foNochmal">Noch einmal speichern</button>` : '';
    }

    r.innerHTML = `<div class="fo-voll" role="dialog" aria-modal="true" aria-label="${esc(def.titel)}">
      <header class="fo-kopf"><div class="fo-marke"><img src="${esc(window.FCC_LOGO || 'icon-192.png')}" alt=""><span>${esc(S.name)}<b>.</b></span></div>
        ${st.typ !== 'fertig' ? `<button type="button" class="fo-abbr fo-halt" id="foAbbr" title="Nur für ${esc(S.kurz)}">Beenden (halten)</button>` : ''}</header>
      <div class="fo-balken" aria-hidden="true"><i style="width:${fortschritt}%"></i></div>
      <div class="fo-seite" id="foSeite">${inhalt}</div>
      <footer class="fo-fuss">${fuss}</footer>
    </div>`;
    const seite = r.querySelector('#foSeite'); seite.scrollTop = scrollTop || 0;
    binde(st, seq);
  }

  function binde(st, seq) {
    const r = root(); const { w } = sess;
    const q = s => r.querySelector(s); const qa = s => r.querySelectorAll(s);
    const neu = () => { const y = q('#foSeite') ? q('#foSeite').scrollTop : 0; zeichne(y); };
    const abbr = q('#foAbbr'); if (abbr) halten(abbr, 1000, schliessen);
    qa('[data-in]').forEach(i => i.addEventListener('input', () => { w[i.dataset.in] = i.value; i.closest('[data-fk]') && i.closest('[data-fk]').classList.remove('fo-miss'); }));
    qa('[data-in][type="date"]').forEach(i => i.addEventListener('change', () => { w[i.dataset.in] = i.value; neu(); }));
    qa('[data-yn]').forEach(b => b.onclick = () => { const k = b.dataset.yn; w[k] = w[k] === b.dataset.o ? '' : b.dataset.o; neu(); });
    qa('[data-wahl]').forEach(b => b.onclick = () => {
      const k = b.dataset.wahl; const it = sess.teil.seiten.flatMap(p => p.items).find(x => x.k === k); const o = b.dataset.o;
      if (it.multi) { const a = Array.isArray(w[k]) ? w[k] : (w[k] = []); const i = a.indexOf(o); i >= 0 ? a.splice(i, 1) : a.push(o); } else w[k] = w[k] === o ? '' : o;
      neu();
    });
    qa('[data-kz]').forEach(b => b.onclick = () => { const k = b.dataset.kz; const a = Array.isArray(w[k]) ? w[k] : (w[k] = []); const i = a.indexOf(b.dataset.o); i >= 0 ? a.splice(i, 1) : a.push(b.dataset.o); if (a.length) w[k + '_keins'] = false; neu(); });
    qa('[data-keins]').forEach(b => b.onclick = () => { const k = b.dataset.keins; w[k + '_keins'] = !w[k + '_keins']; if (w[k + '_keins']) w[k] = []; neu(); });
    qa('[data-ok]').forEach(b => b.onclick = () => { w[b.dataset.ok] = !w[b.dataset.ok]; neu(); });
    const zur = q('#foZur'); if (zur) zur.onclick = () => { sess.i--; zeichne(); };
    const weiter = q('#foWeiter');
    if (weiter) weiter.onclick = () => {
      if (st.typ === 'seite' || st.typ === 'prep') {
        const items = st.typ === 'prep' ? sess.teil.seiten.filter(p => sichtbar(p, w)).flatMap(p => p.items.filter(it => it.studio)) : st.p.items.filter(it => !it.studio);
        const miss = fehlt(items, w);
        if (miss.length) {
          miss.forEach(k => { const el = r.querySelector(`[data-fk="${CSS.escape(k)}"]`); if (el) el.classList.add('fo-miss'); });
          const erst = r.querySelector('.fo-miss'); if (erst) erst.scrollIntoView({ behavior: 'smooth', block: 'center' });
          FCC.toast && FCC.toast(st.typ === 'prep' ? 'Bitte alle Felder mit * ausfüllen.' : T('Bitte beantworte alle markierten Fragen.', 'Bitte beantworten Sie alle markierten Fragen.'));
          return;
        }
      }
      sess.i++; zeichne();
    };
    if (st.typ === 'sign') {
      const p = unterschriftsfeld(q('#foPad'), leer => { q('#foSign').disabled = leer; });
      q('#foSign').onclick = () => {
        if (p.leer()) return;
        const wer = st.r === 'studio' ? S.inh : st.r === 'vertreter' ? vertreterName(w) : nameVon(w);
        sess.sig[st.r] = { png: p.png(), zeit: jetzt(), name: wer, rolle: sess.def.rollen[st.r] || st.r };
        sess.signiert = true; sess.i++; zeichne();
        if (schritte()[sess.i].typ === 'fertig') speichern();
      };
    }
    const ende = q('#foEnde');
    if (ende) halten(ende, 1200, () => { const n = sess && sess.o && sess.o.nachher; const u = sess && sess.o && sess.o.u; schliessen(); if (u && u.rerender) u.rerender(); if (n) n(); });
    const nochmal = q('#foNochmal'); if (nochmal) nochmal.onclick = () => speichern();
  }

  // ---------- Unterschriftsfeld (Stift oder Finger) ----------
  function unterschriftsfeld(host, onChange) {
    host.innerHTML = `<div class="fo-pad"><canvas aria-label="Unterschriftsfeld"></canvas><span class="fo-padx" aria-hidden="true">✕</span><span class="fo-padl" aria-hidden="true"></span></div>
      <div class="row between" style="margin-top:8px"><span class="cmeta">${T('Mit dem Stift oder dem Finger unterschreiben.', 'Mit dem Stift oder dem Finger unterschreiben.')}</span><button type="button" class="btn ghost small" id="foPadNeu">Noch einmal</button></div>`;
    const cv = host.querySelector('canvas'); const ctx = cv.getContext('2d');
    const dpr = Math.max(2, window.devicePixelRatio || 1);
    const rect = cv.getBoundingClientRect();
    cv.width = Math.round(rect.width * dpr); cv.height = Math.round(rect.height * dpr);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1f1a17'; ctx.fillStyle = '#1f1a17';
    let stift = false, aktiv = null, letzter = null, laenge = 0;
    const pt = e => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) * cv.width / b.width, y: (e.clientY - b.top) * cv.height / b.height, p: e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5 }; };
    const breite = p => (1.1 + p * 2.6) * dpr;
    cv.addEventListener('pointerdown', e => {
      if (e.pointerType === 'pen') stift = true;
      if (stift && e.pointerType === 'touch') return; // Handballen ignorieren, sobald der Stift benutzt wurde
      e.preventDefault(); aktiv = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      letzter = pt(e); ctx.beginPath(); ctx.arc(letzter.x, letzter.y, breite(letzter.p) / 2, 0, Math.PI * 2); ctx.fill();
    });
    cv.addEventListener('pointermove', e => {
      if (e.pointerId !== aktiv) return; e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach(ev => {
        const n = pt(ev); ctx.lineWidth = breite((letzter.p + n.p) / 2);
        ctx.beginPath(); ctx.moveTo(letzter.x, letzter.y); ctx.lineTo(n.x, n.y); ctx.stroke();
        laenge += Math.hypot(n.x - letzter.x, n.y - letzter.y) / dpr; letzter = n;
      });
      onChange(laenge < 40);
    });
    const ende = e => { if (e.pointerId === aktiv) { aktiv = null; onChange(laenge < 40); } };
    cv.addEventListener('pointerup', ende); cv.addEventListener('pointercancel', ende);
    cv.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    cv.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    host.querySelector('#foPadNeu').onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); laenge = 0; onChange(true); };
    return {
      leer: () => laenge < 40,
      // Auf die Unterschrift zuschneiden und verkleinern (spart Platz in der Akte)
      png() {
        const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
        let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
        for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2) if (d[(y * cv.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        const r = 8 * dpr; x0 = Math.max(0, x0 - r); y0 = Math.max(0, y0 - r); x1 = Math.min(cv.width, x1 + r); y1 = Math.min(cv.height, y1 + r);
        const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0); const s = Math.min(1, 900 / w, 300 / h);
        const o = document.createElement('canvas'); o.width = Math.round(w * s); o.height = Math.round(h * s);
        o.getContext('2d').drawImage(cv, x0, y0, w, h, 0, 0, o.width, o.height);
        return o.toDataURL('image/png');
      }
    };
  }

  // ---------- Speichern ----------
  async function speichern() {
    const s = sess; if (!s) return;
    s.status = 'speichert'; zeichne();
    const { c, def, rec, teil, w } = s;
    try {
      const vorher = clone({ formulare: c.formulare || [], dokumente: c.dokumente || [], f: pick(c) });
      rec.werte = clone(w);
      rec.teile[teil.id] = { sig: clone(s.sig), fertig: jetzt() };
      rec.teile[teil.id].hash = await sha(inhaltBis(rec, teil.id));
      if (!c.formulare.includes(rec)) { const i = c.formulare.findIndex(x => x.id === rec.id); if (i >= 0) c.formulare[i] = rec; else c.formulare.push(rec); }
      uebernehmen(c, def, rec.werte);
      try { await Store.save(c); }
      catch (e) { c.formulare = vorher.formulare; c.dokumente = vorher.dokumente; Object.assign(c, vorher.f); rec.teile[teil.id] = undefined; delete rec.teile[teil.id]; throw e; }
      s.pdfFehler = '';
      try { await pdfAblegen(c, rec); await Store.save(c); } catch (e) { s.pdfFehler = e.message || String(e); }
      s.status = 'ok';
    } catch (e) { s.status = 'fehler'; s.fehler = e.message || String(e); }
    if (sess === s) zeichne();
  }
  const UEBERNAHME = ['geburtsdatum', 'strasse', 'plz', 'ort', 'telefon', 'email'];
  const pick = c => Object.fromEntries(['vorname', 'nachname', 'allergien', 'blutverduenner', 'fragebogen', ...UEBERNAHME].map(k => [k, c[k] || '']));
  // Angaben der Kundin in die Akte übernehmen (Namen bleiben, wie Kati sie angelegt hat)
  function uebernehmen(c, def, w) {
    if (!c.vorname && w.vorname) c.vorname = w.vorname;
    if (!c.nachname && w.nachname) c.nachname = w.nachname;
    UEBERNAHME.forEach(k => { if (w[k]) c[k] = w[k]; });
    if (def.id === 'pmu') {
      if (w.allergien === 'ja' && w.allergien_text && !c.allergien) c.allergien = w.allergien_text;
      if (w.allergien === 'nein' && !c.allergien) c.allergien = 'keine bekannt';
      if (w.blutverd) c.blutverduenner = w.blutverd;
    }
    if (def.id === 'kontra-ll' && !c.allergien) c.allergien = (w.allergien || []).length ? w.allergien.join(', ') : (w.allergien_keins ? 'keine bekannt' : '');
    if (def.gesundheit) { const d = heute(); if (!c.fragebogen || c.fragebogen < d) c.fragebogen = d; }
  }

  // ---------- Ansehen (nur lesen) ----------
  async function ansehen(c, rec) {
    if (!rec) return;
    const def = DEFS[rec.typ]; const w = rec.werte || {}; const ok = await pruefen(rec);
    const bereich = def.teile.map(t => {
      const x = rec.teile[t.id];
      const seiten = t.seiten.filter(p => sichtbar(p, w)).map(p => {
        const zeilen = p.items.filter(it => it.t !== 'info' && sichtbar(it, w)).map(it => { const v = anzeige(it, w); return `<li><span>${esc(it.l || (it.t === 'kreuze' ? 'Angekreuzt' : 'Antwort'))}</span><b class="${/^ja\b/.test(v) && it.flag ? 'fo-ja' : ''}">${esc(v) || '–'}</b></li>`; }).join('');
        return zeilen ? `<h4 class="fo-vh">${esc(p.h)}</h4><ul class="fo-vl">${zeilen}</ul>` : '';
      }).join('');
      const sig = x ? Object.values(x.sig || {}).map(s => `<div class="fo-vsig">${pngOk(s.png) ? `<img alt="Unterschrift ${esc(s.name)}" src="${s.png}">` : ''}<span class="cmeta">${esc(s.rolle)}: ${esc(s.name)} · ${esc(fmtZeit(s.zeit))}</span></div>`).join('') : '';
      return `<div class="sec wrap"><h3>${esc(t.h)} <span class="cmeta">${x ? (ok[t.id] === false ? '<span class="fo-st fehlt">Inhalt verändert!</span>' : 'unterschrieben ' + esc(fmtZeit(x.fertig))) : 'noch offen'}</span></h3>${seiten}${sig ? `<div class="fo-vsigs">${sig}</div>` : ''}</div>`;
    }).join('');
    const rt = document.getElementById('sheetRoot');
    rt.innerHTML = `<div class="sheet-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(def.titel)}">
      <div class="sheet-head"><div class="wrap"><div><span class="label">${esc(nameVon(w))}</span><h2>${esc(def.titel)}</h2></div><button class="btn ghost small" id="foVz">Schließen</button></div></div>
      ${bereich}
      <div class="sheet-foot"><div class="wrap"><button class="btn ghost" id="foVt" ${navigator.canShare ? '' : 'hidden'}>PDF teilen</button><button class="btn" id="foVp">PDF herunterladen</button></div></div>
    </div></div>`;
    rt.querySelector('#foVz').onclick = () => { rt.innerHTML = ''; };
    rt.querySelector('#foVp').onclick = e => pdfAusgeben(c, rec, false, e.currentTarget);
    rt.querySelector('#foVt').onclick = e => pdfAusgeben(c, rec, true, e.currentTarget);
  }

  // ---------- PDF im Design von Facecolorconcept ----------
  const WH = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,556,222,556,333,1000,556,556,333,1000,667,333,1000,556,611,556,556,222,222,333,333,350,556,1000,333,1000,500,333,944,556,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
  const WB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,611,278,556,500,1000,556,556,333,1000,667,333,1000,611,611,611,611,278,278,500,500,350,556,1000,333,1000,556,333,944,611,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];
  const W1252 = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';
  const code = ch => { const c = ch.charCodeAt(0); if (c >= 32 && c < 127) return c; if (c >= 160 && c <= 255) return c; const i = W1252.indexOf(ch); if (i >= 0) return 128 + i; if (ch === '\u2009' || ch === '\u202f') return 32; if (ch === '✓') return 215; return 63; };
  const breite = (s, size, fett) => { const W = fett === 1 ? WB : WH; let n = 0; for (const ch of String(s)) n += W[code(ch) - 32] || 556; return n * size / 1000; };
  const hex = s => '<' + [...String(s)].map(ch => code(ch).toString(16).padStart(2, '0')).join('') + '>';
  // Farben aus der Website: Bronze #7A5B43, Gold #B08A5E, Text #2A2422
  const BRONZE = '0.478 0.357 0.263', GOLD = '0.690 0.541 0.369', INK = '0.165 0.141 0.133', GRAU = '0.42 0.39 0.37', LINIE = '0.87 0.84 0.80', ZART = '0.976 0.949 0.898';

  const ladeBild = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Bild lädt nicht')); i.src = src; });
  const alsJpeg = async (cv, q) => new Uint8Array(await (await new Promise(r => cv.toBlob(r, 'image/jpeg', q || 0.92))).arrayBuffer());
  async function schriften() {
    if (!document.fonts || !document.fonts.load) return;
    const t = new Promise(r => setTimeout(r, 2500));
    await Promise.race([Promise.all(['300 80px Fraunces', '600 28px Manrope', '400 28px Manrope', '600 80px "Cormorant Garamond"'].map(f => document.fonts.load(f).catch(() => {}))), t]);
  }
  // Briefkopf als Bild: Logo, Schriftzug in der Website-Schrift, Zusatzzeilen
  async function briefkopf() {
    await schriften();
    const W = 2000, H = 250; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    try { const logo = await ladeBild(window.FCC_LOGO); x.drawImage(logo, 0, 5, 240, 240); } catch (e) {}
    const serif = 'Fraunces, "Cormorant Garamond", Georgia, serif', sans = 'Manrope, Jost, Helvetica, Arial, sans-serif';
    x.textBaseline = 'alphabetic'; x.fillStyle = '#2A2422'; x.font = `300 104px ${serif}`;
    x.fillText(S.name, 280, 132); const bw = x.measureText(S.name).width; x.fillStyle = '#B08A5E'; x.fillText('.', 280 + bw, 132);
    x.font = `600 27px ${sans}`; x.fillStyle = '#7A5B43';
    const zeile = 'PERMANENT MAKE-UP  ·  LASH & BROW LIFTING  ·  WAXING'; let xx = 284;
    for (const ch of zeile) { x.fillText(ch, xx, 190); xx += x.measureText(ch).width + 3.5; }
    x.textAlign = 'right'; x.fillStyle = '#2A2422'; x.font = `600 30px ${sans}`; x.fillText(S.inh, W - 4, 92);
    x.font = `400 26px ${sans}`; x.fillStyle = '#6E625A';
    x.fillText('Staatlich anerkannte Kosmetikerin', W - 4, 132); x.fillText('Permanent Make-up Artist (IHK)', W - 4, 168);
    return { data: await alsJpeg(cv, 0.93), w: W, h: H };
  }
  async function unterschriftBild(png) {
    const img = await ladeBild(png); const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0);
    return { data: await alsJpeg(cv, 0.9), w: cv.width, h: cv.height };
  }

  async function pdfBauen(c, rec) {
    const def = DEFS[rec.typ]; const w = rec.werte || {};
    const pruef = await pruefen(rec);
    const bilder = [await briefkopf()];
    const sigBild = {};
    for (const t of def.teile) for (const [r, s] of Object.entries((rec.teile[t.id] || {}).sig || {})) {
      if (pngOk(s.png)) { try { sigBild[t.id + r] = bilder.push(await unterschriftBild(s.png)) - 1; } catch (e) {} }
    }
    const PW = 595.28, PH = 841.89, L = 50, R = PW - 50, OBEN = PH - 118, UNTEN = 74;
    const seiten = []; let s = null, y = 0, benutzt = null;
    const neueSeite = () => { s = []; benutzt = new Set([0]); seiten.push({ s, b: benutzt }); y = OBEN; };
    const t = (x, yy, text, size, f, farbe, rechts) => { const xx = rechts ? x - breite(text, size, f) : x; s.push(`BT /F${f || 0} ${size} Tf ${farbe || INK} rg ${xx.toFixed(2)} ${yy.toFixed(2)} Td ${hex(text)} Tj ET`); };
    const linie = (x1, y1, x2, y2, farbe, lw) => s.push(`${farbe || LINIE} RG ${lw || 0.6} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
    const flaeche = (x, yy, ww, hh, farbe) => s.push(`${farbe} rg ${x.toFixed(2)} ${yy.toFixed(2)} ${ww.toFixed(2)} ${hh.toFixed(2)} re f`);
    const bild = (i, x, yy, ww, hh) => { benutzt.add(i); s.push(`q ${ww.toFixed(2)} 0 0 ${hh.toFixed(2)} ${x.toFixed(2)} ${yy.toFixed(2)} cm /Im${i} Do Q`); };
    const kaestchen = (x, yy, an) => {
      s.push(`${an ? BRONZE : GRAU} RG 0.8 w ${x.toFixed(2)} ${(yy - 1.5).toFixed(2)} 8.5 8.5 re S`);
      if (an) s.push(`${BRONZE} RG 1.4 w ${(x + 1.6).toFixed(2)} ${(yy + 2.6).toFixed(2)} m ${(x + 3.6).toFixed(2)} ${(yy + 0.4).toFixed(2)} l ${(x + 7.2).toFixed(2)} ${(yy + 5.6).toFixed(2)} l S`);
    };
    const platz = h => { if (y - h < UNTEN) { neueSeite(); return true; } return false; };
    const umbrechen = (text, size, f, max) => {
      const out = [];
      String(text).split('\n').forEach(abs => {
        let z = '';
        abs.split(' ').forEach(wort => {
          const n = z ? z + ' ' + wort : wort;
          if (breite(n, size, f) > max && z) { out.push(z); z = wort; } else z = n;
          while (breite(z, size, f) > max && z.length > 1) { let k = z.length - 1; while (k > 1 && breite(z.slice(0, k), size, f) > max) k--; out.push(z.slice(0, k)); z = z.slice(k); }
        });
        out.push(z);
      });
      return out;
    };
    const absatz = (text, o) => {
      o = o || {}; const size = o.size || 9.3, f = o.f || 0, lh = size * (o.lh || 1.42), x = L + (o.ein || 0), max = (o.max || (R - L)) - (o.ein || 0);
      const zl = umbrechen(text, size, f, max); if (zl.length <= 4) platz(zl.length * lh + 2);
      zl.forEach((z, i) => { platz(lh); y -= lh; if (i === 0 && o.punkt) t(x - 9, y, '•', size, 0, GOLD); t(x, y, z, size, f, o.farbe); });
    };
    const ueberschrift = (text, groesse) => {
      platz(46); y -= groesse ? 30 : 24;
      umbrechen(text.toUpperCase(), groesse || 9.5, 1, R - L).forEach((z, i) => { if (i) y -= 13; t(L, y, z, groesse || 9.5, 1, BRONZE); });
      y -= 6; linie(L, y, L + 36, y, GOLD, 1.2); y -= 4;
    };
    const info = text => {
      textMit(text, w, def).split('\n\n').forEach(b => {
        const zeilen = b.split('\n');
        if (zeilen[0].startsWith('## ')) { y -= 6; absatz(zeilen.shift().slice(3), { f: 1, size: 9.3 }); y -= 2; }
        zeilen.forEach(z => z.startsWith('• ') ? absatz(z.slice(2), { ein: 12, punkt: 1 }) : absatz(z));
        y -= 5;
      });
    };
    const kurz = (str, max, size) => { str = String(str); if (breite(str, size) <= max) return str; while (str.length > 1 && breite(str + '…', size) > max) str = str.slice(0, -1); return str + '…'; };
    // Felder als Raster in zwei Spalten
    const raster = items => {
      const SP = (R - L - 20) / 2; const reihen = []; let offen = null;
      items.forEach(it => { if (!it.half || it.area) { offen = null; reihen.push([it]); } else if (offen) { offen.push(it); offen = null; } else { offen = [it]; reihen.push(offen); } });
      reihen.forEach(r => {
        const zellen = r.map((it, i) => { const ww = (!it.half || it.area) ? R - L : SP; return { it, ww, x: L + i * (SP + 20), z: umbrechen(anzeige(it, w) || '–', 10, 0, ww - 4) }; });
        const hh = 24 + Math.max(...zellen.map(z => z.z.length)) * 13;
        platz(hh);
        zellen.forEach(z => { let yy = y - 11; t(z.x, yy, kurz(z.it.l, z.ww, 7.4), 7.4, 0, GRAU); z.z.forEach(x => { yy -= 13; t(z.x, yy, x, 10, 0, INK); }); linie(z.x, y - hh + 7, z.x + z.ww, y - hh + 7); });
        y -= hh;
      });
      y -= 2;
    };
    const janein = it => {
      const max = R - L - 120; const z = umbrechen(it.l, 9.5, 0, max); const det = w[it.k] === 'ja' && w[it.k + '_text'];
      platz(z.length * 13 + (det ? 13 : 0) + 8); y -= 13;
      z.forEach((zz, i) => { if (i) y -= 13; t(L, y, zz, 9.5, 0, INK); });
      const yy = y + (z.length - 1) * 13;
      [['ja', R - 102], ['nein', R - 50]].forEach(([o, x]) => { kaestchen(x, yy, w[it.k] === o); t(x + 13, yy, o, 9.3, w[it.k] === o ? 1 : 0, w[it.k] === o ? INK : GRAU); });
      if (det) { y -= 13; t(L + 10, y, kurz(it.detail.replace('?', '') + ': ' + w[it.k + '_text'], R - L - 130, 9), 9, 2, BRONZE); }
      y -= 5; linie(L, y, R, y, LINIE, 0.4);
    };
    const optionen = (liste, an) => {
      const lang = liste.some(o => breite(o[1], 9.3) > 230);
      if (lang) liste.forEach(o => {
        const z = umbrechen(o[1], 9.3, an(o[0]) ? 1 : 0, R - L - 18); platz(z.length * 13 + 4); y -= 13;
        kaestchen(L, y, an(o[0])); z.forEach((zz, i) => { if (i) y -= 13; t(L + 16, y, zz, 9.3, an(o[0]) ? 1 : 0, an(o[0]) ? INK : GRAU); }); y -= 3;
      });
      else {
        platz(18); y -= 14; let x = L;
        liste.forEach(o => { const bw = 16 + breite(o[1], 9.3, an(o[0]) ? 1 : 0) + 16; if (x + bw > R) { x = L; platz(16); y -= 15; } kaestchen(x, y, an(o[0])); t(x + 13, y, o[1], 9.3, an(o[0]) ? 1 : 0, an(o[0]) ? INK : GRAU); x += bw; });
        y -= 3;
      }
    };
    const element = it => {
      if (it.t === 'janein') return janein(it);
      if (it.t === 'wahl') {
        platz(42); y -= 4; absatz(it.l, { size: 8.4, f: 1, farbe: GRAU });
        const v = w[it.k]; optionen(it.o.map(opt), x => Array.isArray(v) ? v.includes(x) : v === x);
        if (it.k === 'bereich' && (v || []).includes('Sonstiges') && w.bereichSonst) absatz('Sonstiger Bereich: ' + w.bereichSonst, { f: 2, farbe: BRONZE });
        y -= 4; return;
      }
      if (it.t === 'kreuze') {
        const v = w[it.k] || [];
        it.o.forEach(o => { const z = umbrechen(o, 9.3, v.includes(o) ? 1 : 0, R - L - 18); platz(z.length * 13 + 3); y -= 13; kaestchen(L, y, v.includes(o)); z.forEach((zz, i) => { if (i) y -= 13; t(L + 16, y, zz, 9.3, v.includes(o) ? 1 : 0, v.includes(o) ? INK : GRAU); }); y -= 2; });
        platz(16); y -= 14; kaestchen(L, y, !!w[it.k + '_keins']); t(L + 16, y, 'Nichts davon trifft zu', 9.3, w[it.k + '_keins'] ? 1 : 0, w[it.k + '_keins'] ? INK : GRAU); y -= 6;
        return;
      }
      if (it.t === 'ok') { const z = umbrechen(it.l, 9.5, 1, R - L - 18); platz(z.length * 13 + 8); y -= 15; kaestchen(L, y, !!w[it.k]); z.forEach((zz, i) => { if (i) y -= 13; t(L + 16, y, zz, 9.5, 1, INK); }); y -= 6; }
    };
    const unterschriften = (teil) => {
      const x = rec.teile[teil.id]; const rollen = teil.sign.filter(r => r !== 'vertreter' || minderjaehrig(w));
      const hh = 128; platz(hh * Math.ceil(rollen.length / 2) + 10); y -= 10;
      const SP = (R - L - 30) / 2;
      rollen.forEach((r, i) => {
        if (i && i % 2 === 0) { y -= hh; platz(hh); }
        const sx = L + (i % 2) * (SP + 30); const sig = x && x.sig && x.sig[r]; const yb = y - 62;
        const bi = sigBild[teil.id + r];
        if (sig && bi != null) { const b = bilder[bi]; const sc = Math.min(SP / b.w, 54 / b.h); bild(bi, sx, yb + 3, b.w * sc, b.h * sc); }
        else if (!sig) t(sx, yb + 20, 'noch nicht unterschrieben', 9, 2, GRAU);
        linie(sx, yb, sx + SP, yb, INK, 0.7);
        t(sx, yb - 11, 'Unterschrift ' + (def.rollen[r] || r), 7.6, 0, GRAU);
        t(sx, yb - 24, sig ? sig.name : (r === 'studio' ? S.inh : r === 'vertreter' ? vertreterName(w) : nameVon(w)), 9.5, 1, INK);
        if (sig) { t(sx, yb - 36, `${S.ort}, ${fmtZeit(sig.zeit)}`, 7.4, 0, GRAU); t(sx, yb - 46, 'digital mit Stift unterschrieben', 7.4, 0, GRAU); }
        if (r === 'studio') { t(sx, yb - 58, kurz(S.voll, SP, 7), 7, 1, GOLD); t(sx, yb - 67, kurz(S.adr, SP, 7), 7, 0, GOLD); }
      });
      y -= hh;
    };

    // Inhalt
    neueSeite();
    y -= 4; t(L, y - 16, def.titel, 18, 1, INK); y -= 32;
    if (def.unter) { t(L, y, def.unter, 10, 0, GRAU); y -= 16; }
    flaeche(L, y - 30, R - L, 34, ZART);
    t(L + 10, y - 11, 'Kundin', 7.4, 0, GRAU); t(L + 10, y - 23, kurz(nameVon(w) || '–', 180, 10), 10, 1, INK);
    t(L + 200, y - 11, 'Begonnen', 7.4, 0, GRAU); t(L + 200, y - 23, fmt(rec.start), 10, 0, INK);
    t(L + 300, y - 11, 'Status', 7.4, 0, GRAU); t(L + 300, y - 23, istFertig(rec) ? 'vollständig unterschrieben' : offenerTeil(rec).h + ' noch offen', 10, 0, INK);
    y -= 40;

    def.teile.forEach((teil, ti) => {
      if (!rec.teile[teil.id] && ti > 0) { ueberschrift(teil.h + ' (' + teil.wann + ')', 11); absatz('Dieser Teil ist noch nicht unterschrieben.', { f: 2, farbe: GRAU }); return; }
      if (def.teile.length > 1) { ueberschrift(`Teil ${ti + 1}: ${teil.h} (${teil.wann})`, 11.5); }
      teil.seiten.filter(p => sichtbar(p, w)).forEach(p => {
        ueberschrift(p.h);
        let gruppe = [];
        const leeren = () => { if (gruppe.length) { raster(gruppe); gruppe = []; } };
        p.items.filter(it => sichtbar(it, w)).forEach(it => {
          if (it.t === 'feld') { gruppe.push(it); return; }
          leeren();
          if (it.t === 'info') { if (!it.app) info(it.text); } else element(it);
        });
        leeren();
      });
      if (rec.typ === 'pmu' && teil.id === 'einwilligung') protokoll();
      ueberschrift(`Unterschrift${teil.sign.length > 1 ? 'en' : ''}${def.teile.length > 1 ? ' · ' + teil.h : ''}`);
      unterschriften(teil);
    });

    // PMU: Behandlungsprotokoll aus der Kartei (Datum, Nadel, Farbe)
    function protokoll() {
      const b = (c.behandlungen || []).filter(x => x.art === 'PMU' && x.datum >= rec.start).sort((a, b) => a.datum.localeCompare(b.datum));
      ueberschrift('Behandlungsprotokoll (aus der Kundenkartei)');
      if (!b.length) { absatz('Noch keine PMU-Behandlung zu diesem Vertrag in der Kartei eingetragen.', { f: 2, farbe: GRAU }); return; }
      const sp = [[L, 'Datum', 70], [L + 70, 'Nadelstärke / Modul', 120], [L + 190, 'Farbe', 170], [R - 125, 'Notizen', 125]];
      platz(24); y -= 16; flaeche(L, y - 5, R - L, 18, ZART); sp.forEach(([x, h]) => t(x + 4, y, h, 8, 1, GRAU)); y -= 6;
      b.forEach(x => {
        const d = x.daten || {}; platz(16); y -= 14;
        const farbe = [d.pigment1, d.pigment2].filter(Boolean).join(' + ') + (d.mischung ? ' (' + d.mischung + ')' : '');
        const vals = [fmt(x.datum), d.nadel || '–', farbe || '–', [d.termin, d.technik].filter(Boolean).join(', ') || '–'];
        sp.forEach(([xx, , ww], i) => t(xx + 4, y, kurz(vals[i], ww - 8, 9), 9, 0, INK));
        linie(L, y - 4, R, y - 4, LINIE, 0.4);
      });
      y -= 6;
    }

    // Nachweis der digitalen Unterschrift
    ueberschrift('Nachweis der digitalen Unterschrift');
    absatz(`Dieses Dokument wurde in der Kundenkartei von ${S.name} am iPad ausgefüllt. Die Unterschriften wurden mit Stift oder Finger direkt auf dem Bildschirm geleistet. Nach jeder Unterschrift wurde der Inhalt gesperrt. Die Prüfsumme (SHA-256) belegt, dass der Inhalt seitdem nicht verändert wurde.`, { size: 8.3, farbe: GRAU });
    y -= 4;
    def.teile.forEach(teil => {
      const x = rec.teile[teil.id]; if (!x) return;
      absatz(`${teil.h}: unterschrieben ${fmtZeit(x.fertig)} · ${pruef[teil.id] === true ? 'Inhalt unverändert' : pruef[teil.id] === false ? 'ACHTUNG: Inhalt verändert' : 'nicht geprüft'}`, { size: 8.3, f: 1, farbe: pruef[teil.id] === false ? '0.66 0.27 0.23' : INK });
      absatz('Prüfsumme ' + (x.hash || '–'), { size: 7.2, farbe: GRAU });
    });
    absatz(`Formular-Nr. ${rec.id} · PDF erstellt am ${fmtZeit(jetzt())}`, { size: 7.2, farbe: GRAU });

    // Kopf und Fuß auf jeder Seite
    const kopf = bilder[0]; const kh = (R - L) * kopf.h / kopf.w;
    seiten.forEach((p, i) => {
      s = p.s; benutzt = p.b;
      bild(0, L, PH - 34 - kh, R - L, kh);
      linie(L, PH - 44 - kh, R, PH - 44 - kh, GOLD, 0.9);
      linie(L, 54, R, 54, GOLD, 0.6);
      t(L, 42, `${S.voll} · ${S.adr}`, 7.4, 0, GRAU);
      t(L, 31, `${S.tel} · ${S.mail} · ${S.web}`, 7.4, 0, GRAU);
      t(R, 42, `${def.kurz} · ${nameVon(w)}`.slice(0, 70), 7.4, 0, GRAU, true);
      t(R, 31, `Seite ${i + 1} von ${seiten.length}`, 7.4, 0, GRAU, true);
    });

    // Datei zusammensetzen (Text als ASCII, Bilder als JPEG)
    const enc = new TextEncoder(); const teile = []; const offs = []; let len = 0;
    const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; teile.push(b); len += b.length; };
    const obj = (id, f) => { offs[id] = len; push(id + ' 0 obj\n'); f(); push('\nendobj\n'); };
    push('%PDF-1.4\n');
    const FONT0 = 3, NB = bilder.length, IMG0 = 6, SEITE0 = IMG0 + NB, n = seiten.length;
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push(`<< /Type /Pages /Count ${n} /Kids [${seiten.map((_, i) => (SEITE0 + i * 2) + ' 0 R').join(' ')}] >>`));
    ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique'].forEach((f, i) => obj(FONT0 + i, () => push(`<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`)));
    bilder.forEach((b, i) => obj(IMG0 + i, () => { push(`<< /Type /XObject /Subtype /Image /Width ${b.w} /Height ${b.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${b.data.length} >>\nstream\n`); push(b.data); push('\nendstream'); }));
    seiten.forEach((p, i) => {
      const id = SEITE0 + i * 2; const inhalt = p.s.join('\n');
      const xo = [...p.b].map(k => `/Im${k} ${IMG0 + k} 0 R`).join(' ');
      obj(id, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F0 ${FONT0} 0 R /F1 ${FONT0 + 1} 0 R /F2 ${FONT0 + 2} 0 R >> /XObject << ${xo} >> >> /Contents ${id + 1} 0 R >>`));
      obj(id + 1, () => push(`<< /Length ${enc.encode(inhalt).length} >>\nstream\n${inhalt}\nendstream`));
    });
    const infoId = SEITE0 + n * 2;
    obj(infoId, () => push(`<< /Title ${hex(def.titel + ' – ' + nameVon(w))} /Author ${hex(S.voll)} /Subject ${hex('Formular-Nr. ' + rec.id)} /Producer (Facecolorconcept Kartei) >>`));
    const xref = len;
    let xr = `xref\n0 ${infoId + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= infoId; i++) xr += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
    push(xr + `trailer\n<< /Size ${infoId + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(teile, { type: 'application/pdf' });
  }
  const pdfName = (c, rec) => `${(letzteUnterschrift(rec) || rec.start).slice(0, 10)}_${dateiname(DEFS[rec.typ].kurz)}_${dateiname(c.nachname)}_${dateiname(c.vorname)}.pdf`;

  // PDF in den Ordner „dokumente“ der Kundin legen (gleiche Datei wird bei späteren Unterschriften aktualisiert)
  async function pdfAblegen(c, rec) {
    if (Store.mode !== 'drive' || !Store.upload) return;
    const blob = await pdfBauen(c, rec); const name = pdfName(c, rec);
    if (!c.dokuId) await Store.save(c);
    let r;
    try { r = await Store.upload({ name, parent: c.dokuId, mime: 'application/pdf', data: blob, fileId: rec.pdf && rec.pdf.fileId }); }
    catch (e) { if (rec.pdf && /\((404|403)\)/.test(e.message)) r = await Store.upload({ name, parent: c.dokuId, mime: 'application/pdf', data: blob }); else throw e; }
    rec.pdf = { fileId: r.id, link: r.webViewLink || '', datum: heute() };
    c.dokumente = (c.dokumente || []).filter(d => d.fileId !== r.id);
    c.dokumente.unshift({ fileId: r.id, name: r.name || name, link: r.webViewLink || '', datum: heute(), formular: rec.id });
  }

  async function pdfAusgeben(c, rec, teilen, btn) {
    if (!rec) return;
    const toast = (m, l) => FCC.toast && FCC.toast(m, l);
    const alt = btn ? btn.textContent : ''; if (btn) { btn.disabled = true; btn.textContent = 'Erstellt …'; }
    try {
      const blob = await pdfBauen(c, rec); const name = pdfName(c, rec);
      const file = new File([blob], name, { type: 'application/pdf' });
      let fertig = false;
      if (teilen) try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); fertig = true; } } catch (e) { if (e && e.name === 'AbortError') fertig = true; }
      if (!fertig) { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); toast('PDF heruntergeladen (iPad: Dateien › Downloads)'); }
    } catch (e) { toast('PDF konnte nicht erstellt werden: ' + (e.message || e), true); }
    finally { if (btn) { btn.disabled = false; btn.textContent = alt; } }
  }
  FCC.formPdf = pdfBauen; // für Tests

  // ---------- Aussehen ----------
  const css = document.createElement('style');
  css.textContent = `
    html.fo-offen,html.fo-offen body{overflow:hidden}
    .fo-kacheln{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}
    @media(max-width:620px){.fo-kacheln{grid-template-columns:repeat(2,minmax(0,1fr))}}
    .fo-kachel{border:1px solid var(--line);background:var(--paper);border-radius:12px;padding:12px;text-align:left;display:flex;flex-direction:column;gap:4px;min-height:72px;font:inherit;color:inherit;cursor:pointer;transition:border-color .15s,transform .15s}
    .fo-kachel:hover{border-color:var(--rose);transform:translateY(-1px)} .fo-kachel.on{border-color:var(--rose);background:var(--rose-soft)}
    .fo-kachel b{font-family:var(--display);font-size:19px;font-weight:600;line-height:1.1}
    .fo-st{font-size:12.5px;color:var(--muted)} .fo-st.ok{color:var(--ok)} .fo-st.fehlt,.fo-st.alt{color:var(--warn)} .fo-st.offen{color:var(--rose-ink);font-weight:500}
    .fo-liste li{align-items:center}.fo-liste li>span{overflow-wrap:normal;-webkit-hyphens:auto;hyphens:auto} .fo-liste li .btn{flex-shrink:0}
    .fo-banner{margin-top:12px} .fo-banner b{font-weight:500}
    .fo-vh{font-family:var(--body);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--rose-ink);margin:16px 0 6px;font-weight:600}
    .fo-vl{list-style:none;margin:0;padding:0}.fo-vl li{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,auto);gap:4px 16px;padding:8px 0;border-top:1px solid var(--line);font-size:15px}.fo-vl li:first-child{border-top:0}.fo-vl b{font-weight:500;text-align:right;max-width:340px}.fo-vl b.fo-ja{color:var(--warn)}@media(max-width:520px){.fo-vl li{grid-template-columns:1fr}.fo-vl b{text-align:left}}
    .fo-vsigs{display:flex;flex-wrap:wrap;gap:16px;margin-top:14px}.fo-vsig{display:flex;flex-direction:column;gap:4px;border-bottom:1px solid var(--ink);padding-bottom:4px;min-width:200px}
    .fo-vsig img{max-height:70px;max-width:260px;object-fit:contain;align-self:flex-start;background:#fff;border-radius:6px}
    .fo-voll{position:fixed;inset:0;z-index:60;background:#fbf8f4;color:#2a2422;display:flex;flex-direction:column;font-size:18px;color-scheme:light}
    .fo-voll .label{color:#7a5b43}.fo-voll .cmeta{color:#6e625a}
    .fo-kopf{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:calc(10px + env(safe-area-inset-top,0px)) max(20px,env(safe-area-inset-right,0px)) 10px max(20px,env(safe-area-inset-left,0px));border-bottom:1px solid #e8dfd3;background:#fff}
    .fo-marke{display:flex;align-items:center;gap:10px;font-family:Fraunces,var(--display);font-size:24px;font-weight:300}.fo-marke img{width:42px;height:42px}.fo-marke b{color:#b08a5e;font-weight:400}
    .fo-abbr{border:1px solid #e8dfd3;background:transparent;color:#6e625a;border-radius:99px;padding:8px 14px;font-size:13px;min-height:40px}
    .fo-halt{position:relative;overflow:hidden;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
    .fo-halt::after{content:"";position:absolute;inset:0;background:rgba(122,91,67,.25);transform:scaleX(0);transform-origin:left}
    .fo-halt.halten::after{transform:scaleX(1);transition:transform var(--ms,1s) linear}
    .fo-balken{height:4px;background:#efe6da}.fo-balken i{display:block;height:100%;background:#b08a5e;transition:width .25s}
    .fo-seite{display:block;flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:28px max(20px,env(safe-area-inset-right,0px)) 40px max(20px,env(safe-area-inset-left,0px))}
    .fo-seite>*{max-width:720px;margin-left:auto;margin-right:auto}.fo-seite>.label{display:block}
    .fo-seite h1{font-family:Fraunces,var(--display);font-weight:300;font-size:34px;letter-spacing:-.01em;margin:6px auto 8px;color:#2a2422}
    .fo-sub{color:#4f4440;margin:0 auto 16px;font-size:17px}
    .fo-grid{display:flex;flex-wrap:wrap;gap:16px 16px}
    .fo-grid>*{flex:1 1 100%;min-width:0}.fo-grid>.fo-f.half{flex:1 1 calc(50% - 8px);min-width:220px}
    .fo-f label{display:block;font-size:15px;color:#4f4440;margin-bottom:6px}
    .fo-f input,.fo-f textarea,.fo-det{width:100%;padding:14px 16px;border:1.5px solid #e2d6c6;border-radius:14px;background:#fff;font-size:18px;color:#2a2422;min-height:54px}
    .fo-f input:focus,.fo-f textarea:focus,.fo-det:focus{border-color:#b08a5e;outline:none;box-shadow:0 0 0 3px rgba(176,138,94,.18)}
    .fo-req{color:#a8463b}
    .fo-info{background:#fff;border:1px solid #ece3d7;border-radius:16px;padding:16px 18px;line-height:1.6;font-size:16.5px;color:#3a322e}
    .fo-info p{margin:0 0 10px}.fo-info p:last-child{margin-bottom:0}.fo-info h4{font-family:var(--body);font-size:16px;font-weight:600;margin:4px 0 6px;color:#7a5b43}
    .fo-info ul{margin:0 0 10px;padding-left:20px}.fo-info li{margin:4px 0}
    .fo-ro{background:#f6efe5;border-radius:14px;padding:12px 16px;display:flex;flex-direction:column;gap:2px}.fo-ro b{font-weight:500;font-size:17px}
    .fo-q{background:#fff;border:1px solid #ece3d7;border-radius:16px;padding:14px 16px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 14px;align-items:center}
    .fo-ql{font-size:17px;line-height:1.35}.fo-w .fo-ql{margin-bottom:10px}
    .fo-yn{display:flex;gap:8px}.fo-yn button{min-width:78px;min-height:50px;border-radius:99px;border:1.5px solid #e2d6c6;background:#fff;font-size:17px;font-weight:500;color:#4f4440}
    .fo-yn button.on{background:#7a5b43;border-color:#7a5b43;color:#fff}
    .fo-q .fo-det{grid-column:1/-1}
    @media(max-width:520px){.fo-q{grid-template-columns:1fr}}
    .fo-chips{display:flex;flex-wrap:wrap;gap:10px}
    .fo-chip{border:1.5px solid #e2d6c6;background:#fff;border-radius:99px;padding:12px 20px;font-size:17px;min-height:52px;color:#2a2422}
    .fo-chip.on{background:#7a5b43;border-color:#7a5b43;color:#fff}
    .fo-karten{display:flex;flex-direction:column;gap:10px}
    .fo-k{display:flex;gap:14px;align-items:flex-start;text-align:left;border:1.5px solid #e2d6c6;background:#fff;border-radius:16px;padding:15px 16px;font-size:17px;line-height:1.4;color:#2a2422;min-height:56px;width:100%}
    .fo-k.on{border-color:#7a5b43;background:#f6efe5}
    .fo-box{flex-shrink:0;width:26px;height:26px;border-radius:7px;border:2px solid #c9b8a3;background:#fff;display:inline-flex;align-items:center;justify-content:center;margin-top:-1px}
    .fo-k.on .fo-box{background:#7a5b43;border-color:#7a5b43}.fo-k.on .fo-box::after{content:"";width:7px;height:13px;border:solid #fff;border-width:0 3px 3px 0;transform:translateY(-2px) rotate(45deg)}
    .fo-keins{border-style:dashed}.fo-keins.on{border-style:solid}
    .fo-okb{font-weight:500}
    .fo-miss .fo-q,.fo-q.fo-miss,.fo-miss input,.fo-miss textarea,.fo-miss .fo-karten .fo-k,.fo-miss .fo-chip{border-color:#a8463b!important}
    .fo-miss .fo-ql,.fo-miss label{color:#a8463b}
    .fo-warn{background:#fbe9e6;color:#8a3a30}
    .fo-ortdatum{display:flex;flex-wrap:wrap;gap:12px 32px;margin:8px auto 14px}.fo-ortdatum>span{display:flex;flex-direction:column}.fo-ortdatum b{font-weight:500}
    .fo-pad{position:relative;background:#fff;border:1.5px solid #e2d6c6;border-radius:18px;height:min(300px,38vh);touch-action:none}
    .fo-pad canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;border-radius:18px;cursor:crosshair}
    .fo-padl{position:absolute;left:44px;right:24px;bottom:28%;border-bottom:1.5px solid #c9b8a3;pointer-events:none}
    .fo-padx{position:absolute;left:18px;bottom:calc(28% + 4px);color:#b08a5e;font-size:18px;pointer-events:none}
    .fo-fuss{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px max(20px,env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) max(20px,env(safe-area-inset-left,0px));border-top:1px solid #e8dfd3;background:#fff}
    .fo-fuss .btn{min-height:56px;padding:12px 28px;font-size:18px;background:#2a2422;border-color:#2a2422}
    .fo-fuss .btn.ghost{background:transparent;color:#2a2422;border-color:#d6c9b8}
    .fo-fuss .btn:disabled{opacity:.35;cursor:not-allowed}
    .fo-mitte{text-align:center;padding-top:8vh}.fo-mitte .fo-sub{max-width:520px}
    .fo-haken{width:84px;height:84px;border-radius:50%;background:#7a5b43;color:#fff;font-size:44px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
    .fo-lade{width:56px;height:56px;border-radius:50%;border:4px solid #efe6da;border-top-color:#b08a5e;margin:0 auto 16px;animation:spin 1s linear infinite}
    .fo-err{color:#a8463b}`;
  document.head.append(css);
})();
