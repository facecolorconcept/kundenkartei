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
      'Die <b>Bereiche</b> wie Übersicht, Kalender und Kundenkartei findest du am iPhone und am iPad hochkant unten, am Notebook und am iPad quer in der Leiste links.',
      'Die <b>Tür mit Pfeil</b> meldet dich ab. Mach das immer an fremden Geräten.'
    ], tipp: 'Google fragt etwa einmal pro Stunde kurz nach. Ein Tipp auf „Mit Google anmelden“ genügt, du arbeitest danach an derselben Stelle weiter.' },
    { id: 'termin', t: 'Ein Termin von Anfang bis Ende', k: 'Der ganze Ablauf auf einen Blick', s: [
      '<b>Vor dem Termin</b>: Neue Kundin? Tippe in der Kartei auf <b>+ Kundin</b>, Vor- und Nachname reichen. Den Rest trägt sie gleich selbst ein.',
      '<b>Kundin kommt</b>: Akte öffnen, ganz oben unter <b>Termin heute</b> die Behandlung antippen. Bei <b>1 Formulare</b> steht orange, was fehlt. Tippe auf <b>Ausfüllen lassen</b> und gib ihr das iPad.',
      '<b>Sie unterschreibt</b> mit dem Stift. Braucht es auch deine Unterschrift, gibt sie dir das iPad zurück. Zum Schluss den Knopf <b>gedrückt halten</b>.',
      '<b>Schau kurz in die Akte</b>: Hat sie etwas angekreuzt, steht es orange unter „Angekreuzt“. Entscheide dann, ob du behandelst.',
      '<b>Behandlung</b>: Bei <b>2 Behandlung dokumentieren</b> auf <b>Bogen öffnen</b> tippen und ausfüllen. Vorher-Foto direkt im Bogen machen.',
      '<b>Nur beim PMU</b>: Nach dem Vorzeichnen in der Akte auf <b>Freigabe der Vorzeichnung unterschreiben lassen</b>, nach der Behandlung auf <b>Abnahme unterschreiben lassen</b>.',
      '<b>Folgetermin mit gültigem Bogen</b>: Statt des ganzen Gesundheitsbogens fragt die Kartei nur „Hat sich seitdem etwas geändert?“. Tippe auf <b>Kurzcheck ausfüllen lassen</b>. Sagt die Kundin Ja, lässt du den ausführlichen Bogen neu ausfüllen.',
      '<b>E-Mail-Service</b> (freiwillig): Ein Tipp auf <b>Fragen</b>, die Kundin trägt ihre E-Mail ein und sagt, ob du sie an Nachbehandlungen erinnern darfst.',
      '<b>Nach der Behandlung</b>: Nachher-Foto, Ergebnis und „Kundin zufrieden“ eintragen, <b>Bogen speichern</b>. Danach bietet die Kartei an, die <b>Pflegehinweise per Mail</b> zu schicken.',
      '<b>Folgetermin</b>: Die Kartei schlägt ihn vor. Ein Tipp auf <b>Als Aufgabe anlegen</b>, und du wirst rechtzeitig erinnert.'
    ], tipp: 'Mehr musst du dir nicht merken. Alles Weitere, zum Beispiel PDFs und Nachweise, legt die Kartei selbst in Drive ab.' },
    { id: 'uebersicht', t: 'Die Übersicht', k: 'Was heute wichtig ist', s: [
      'Die Übersicht ist deine Startseite. <b>Alles darauf lässt sich antippen.</b>',
      '<b>Schnellstart</b> ganz oben: <b>Neue Kundin</b>, <b>Behandlung dokumentieren</b> (Kundin wählen, die Akte öffnet sich bei „Termin heute“) und <b>Vorher-Foto</b> (Kundin wählen, Kamera geht auf, das Foto landet in ihrer Akte).',
      '<b>Nachbehandlungen in 30 Tagen</b>: Kundinnen, bei denen eine PMU-Nachbehandlung oder ein Lifting bald fällig oder schon fällig ist.',
      '<b>Kennzahlen oben</b>: Ein Tipp auf die Zahl zeigt genau diese Kundinnen in der Kartei.',
      '<b>Aufgaben</b>: alles, was du dir vorgenommen hast, sortiert nach überfällig, heute, morgen und später.',
      '<b>Jetzt dran</b>: Dinge, die die Kartei selbst erkennt, zum Beispiel fällige Nachbehandlungen. Hat die Kundin Erinnerungen per E-Mail erlaubt, steht daneben <b>Mail</b>. Oben fasst <b>Erinnerungen per Mail</b> alle zusammen: Text prüfen, Häkchen setzen, senden.',
      '<b>Sicherung</b>: Ist die letzte Sicherung älter als 30 Tage, erinnert dich die Kartei hier daran.',
      '<b>Zufriedenheit</b>: Antippen der Farbe zeigt die Kundinnen dazu.',
      '<b>Zuletzt behandelt</b> und <b>Balken</b>: Antippen öffnet die Kundinnen des Monats.'
    ] },
    { id: 'kalender', t: 'Kalender und Online-Buchung', k: 'Termine aus Google, Kundin zuordnen', s: [
      'Tippe auf <b>Kalender</b> (am iPhone unten, am Notebook in der Leiste links). Du siehst die Woche mit allen Terminen aus deinem Google Kalender, auch die Online-Buchungen.',
      'Termine sind volle Blöcke: <b>rosé</b> mit Akte (mit Namen der Kundin), <b>dunkelbraun</b> ohne Akte. Leere Flächen sind frei. Über jedem Tag steht, wie viele Termine es sind oder „frei“. Ein Tipp auf den Termin, dann <b>Akte öffnen</b>.',
      'Neue Buchung ohne Akte: Termin antippen, dann <b>Als Kundin anlegen</b>. Name und E-Mail aus der Buchung sind schon eingetragen.',
      'Mit <b>‹</b> und <b>›</b> blätterst du wochenweise, <b>Heute</b> springt zurück.',
      'Termine anlegen, verschieben oder absagen machst du weiter im <b>Google Kalender</b>. Der Knopf oben rechts öffnet ihn.',
      'Auf der <b>Übersicht</b> steht ganz oben „Heute im Studio“ mit allen Terminen des Tages.',
      '<b>Anzahlung</b>: Termin antippen, unten den Betrag eintragen und <b>Speichern</b>. Ist das Geld da, tippst du auf <b>noch nicht erhalten</b>, dann steht dort „erhalten“. Im Kalender zeigt ein kleines <b>€</b> offene Anzahlungen, <b>€ ✓</b> erhaltene.'
    ], tipp: 'Die Kartei erkennt eine Kundin an ihrer E-Mail-Adresse aus der Buchung. Steht bei der Kundin keine oder eine andere E-Mail, sucht sie nach dem vollen Namen im Termintitel.' },
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
      '<b>CSV exportieren</b> in der Tabelle: lädt eine Liste für Excel oder Numbers herunter, ohne Gesundheitsdaten.',
      'Bei <b>Instagram</b> reicht der Name, zum Beispiel @laura.beauty. In der Akte wird er zum Link auf ihr Profil, und die Suche findet sie auch darüber.'
    ] },
    { id: 'behandlung', t: 'Behandlung dokumentieren', k: 'Bogen ausfüllen, Folgetermin', s: [
      'Öffne die Akte, tippe oben unter <b>Termin heute</b> auf die Behandlung, zum Beispiel <b>Lash Lift</b>, und dann auf <b>Lash Lift-Bogen öffnen</b>.',
      'War die Kundin schon einmal da, siehst du oben <b>„Nächstes Mal anders“</b> vom letzten Termin. <b>Werte übernehmen</b> füllt alles vom letzten Mal vor, das Ergebnis bleibt leer.',
      '<b>Gestrichelte Kreise</b> zeigen, was du beim letzten Mal gewählt hattest.',
      'Fülle die Abschnitte von oben nach unten aus. Antippen wählt aus, noch einmal antippen nimmt es zurück.',
      'Bei jeder Auswahl kannst du <b>mehrere Felder</b> antippen, zum Beispiel zwei Techniken oder Zupfen und Waxing. Nur bei Ja/Nein-Fragen und bei „Kundin zufrieden“ gilt eine Antwort. Tippst du „keine“ an, gehen die anderen Felder aus.',
      'Trag unter <b>Kundin zufrieden</b> ja, teils oder nein ein. Das erscheint in der Übersicht.',
      'Trag oben den <b>Preis in €</b> ein. Daraus rechnet der Bereich Umsatz.',
      'Beim <b>PMU</b> siehst du über den Feldern dein <b>Material</b> aus der Administration. Ein Tipp auf ein Pigment trägt Name, Charge und Haltbarkeit ein, der zweite Tipp füllt Pigment 2. Genauso bei Gerät und Nadel. Abgelaufene Pigmente stehen orange ganz hinten.',
      'Fotos machst du direkt im Bogen unter <b>Fotos</b>: „+ Foto“ bei Vorher oder Nachher.',
      'Tippe auf <b>Bogen speichern</b>. Danach bietet die Kartei die <b>Pflegehinweise per Mail</b> an und schlägt den passenden <b>Folgetermin</b> vor. Ein Tipp auf „Als Aufgabe anlegen“, fertig.',
      'Pflegehinweise später schicken: in der Akte bei <b>Beim letzten Mal</b> auf <b>Pflegehinweise senden</b>. Wurden sie schon geschickt, steht dort ein Haken.'
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
      'Am Notebook und am iPad klappt die Kundenliste beim Öffnen einer Akte zu einer schmalen Leiste mit Kürzeln ein. Ein Tipp auf ein Kürzel öffnet die nächste Kundin, <b>»</b> zeigt wieder die ganze Liste.',
      '<b>Fotos zoomen</b>: Foto antippen, dann mit zwei Fingern auseinanderziehen, doppelt tippen oder <b>+</b> und <b>−</b> nutzen. Vergrößert schiebst du das Foto mit einem Finger.',
      '<b>Dokumente</b>: die PDFs der digital unterschriebenen Formulare landen hier von selbst. Rechnungen oder alte Papier-Formulare lädst du mit „+ Dokument“ hoch (bis 5 MB). Alles liegt im Ordner der Kundin in Drive.',
      'Ein Foto passt nicht? Antippen, dann <b>Ausblenden</b> (bleibt gespeichert, „Ausgeblendete Fotos zeigen“ holt es zurück) oder <b>Löschen</b> (zweimal tippen; das Foto liegt danach noch 30 Tage im Papierkorb von Google Drive).',
      'Die Fotos werden vor dem Hochladen verkleinert, damit es auch unterwegs schnell geht.',
      '<b>Nachher-Foto bearbeiten</b>: Foto antippen, dann <b>Bearbeiten</b>. Wie das geht, steht unter „Nachher-Fotos bearbeiten“.'
    ] },
    { id: 'retusche', t: 'Nachher-Fotos bearbeiten', k: 'Retusche für Vorher/Nachher-Bilder', s: [
      'Tippe in der Akte oder im Behandlungsbogen auf ein <b>Nachher-Foto</b> und dann auf <b>Bearbeiten</b>.',
      'Unten wählst du den Reiter: <b>Retuschieren</b>, <b>Make-up</b>, <b>Überlagern</b> oder <b>Kulisse</b>. Darüber stehen die Werkzeuge, bei Retuschieren nach Haut, Farbe, Augen &amp; Zähne und Makel sortiert. Deine Werte aus dem Spickzettel sind schon eingestellt.',
      '<b>Pinsel</b>: mit dem Finger über die Stelle fahren. Zu viel erwischt? Auf <b>Radierer</b> umschalten. <b>Fläche</b> zeigt rot, was du schon abgefahren hast.',
      '<b>Stärke</b> und <b>Pinsel</b> stellst du mit den Reglern ein. <b>Dein Wert</b> holt den Wert aus dem Spickzettel zurück. Ein Tipp auf den Werkzeugnamen erklärt das Werkzeug.',
      '<b>Verheilen</b>: Kreisgröße einstellen und auf Pickel, Narbe oder Fleck tippen. <b>Überlagern</b>: erst eine schöne Hautstelle antippen, dann über die unruhige Stelle malen.',
      '<b>Make-up</b>: Mit der <b>Pipette</b> tippst du auf Stirn, Haar oder Auge und übernimmst genau diesen Ton für Kontur, Aufhellen oder Hautton. <b>Schwarz</b> betont den Wimpernkranz.',
      '<b>Kulisse</b>: <b>Alles füllen</b> tippen, dann mit dem Radierer über die Kundin fahren. Der Hintergrund wird weich, die Kundin bleibt scharf.',
      'Das <b>Häkchen</b> übernimmt, das <b>X</b> verwirft. Beim Wechsel des Werkzeugs wird automatisch übernommen. Oben gehen <b>Zurück</b> und <b>Vor</b>, <b>Vorher</b> gedrückt halten zeigt das Original.',
      '<b>Zoomen</b>: mit zwei Fingern auseinanderziehen oder rechts am Bild <b>+</b> und <b>−</b> tippen. Das Viereck zeigt wieder das ganze Bild. Am iPad mit Trackpad und am Notebook geht es auch mit Zusammenziehen auf dem Trackpad oder dem Mausrad.',
      'Der Pinsel bleibt auf dem Bildschirm gleich groß. Zoomst du hinein, malst du im Bild also feiner. So arbeitest du am Wimpernkranz und an den Augen genau.',
      '<b>Hand</b> rechts am Bild: Ein Finger verschiebt das Bild, ohne zu malen. Nochmal tippen, dann malst du wieder. Zwei Finger verschieben immer.',
      '<b>Vergleich</b> (unterster Knopf rechts): links Vorher, rechts Nachher. Mit dem Finger schiebst du die Linie hin und her.',
      'Mehr Platz fürs Foto: Tipp auf den <b>Griff</b> oben am Bedienfeld. Die Werkzeuge klappen ein, Reiter und Häkchen bleiben.',
      '<b>In Akte speichern</b> legt das Ergebnis als zusätzliches Nachher-Foto ab, gekennzeichnet mit „bearbeitet“. Das Original bleibt immer erhalten. Im Bogen wird es mit „Bogen speichern“ gesichert.'
    ], tipp: 'Pigmentierte Stellen wie Brauen, Lidstrich und Lippen immer auslassen. Deine Arbeit soll echt bleiben, sonst sieht die Kundin in echt etwas anderes als auf Instagram. Das Foto wird nur im Browser bearbeitet und erst beim Speichern in deinen Drive-Ordner geladen.' },
    { id: 'simulation', t: 'Beratung: Brauen und Lippen', k: 'Simulation am Vorher-Foto in sechs Schritten', s: [
      'Öffne die Akte und tippe bei <b>Vorher / Nachher</b> auf <b>Brauen beraten</b> oder <b>Lippen beraten</b>. Oben siehst du sechs Schritte. Mit <b>Weiter</b> und <b>Zurück</b> gehst du durch, ein Tipp auf einen Schritt springt direkt dorthin.',
      '<b>1 Foto</b>: Das neueste Vorher-Foto ist schon geladen. Sonst <b>+ Anderes Foto</b>: von vorne, Kopf gerade, neutraler Ausdruck, gleichmäßiges Licht. Bei Lippen am besten locker geschlossen.',
      '<b>2 Punkte</b>: Tippe auf <b>Automatisch erkennen</b>. Die Kartei setzt die Punkte auf Brauen oder Lippen und auf die Pupillen. Prüf jeden Punkt und korrigiere nach Anatomie. Beim ersten Mal lädt die Erkennung etwa 18 MB, danach geht es schnell.',
      'Brauen: <b>A</b> Anfang unten, <b>A1</b> Anfang oben, <b>B</b> Bogen oben, <b>B1</b> Bogen unten, <b>C</b> Ende. Lippen: Punkte genau auf die natürliche Lippenlinie und die Mundspalte. Die blauen <b>Pupillen-Punkte</b> gehören in die Mitte der Pupillen.',
      'Ein Punkt bewegt sich erst, wenn du den Finger ein kleines Stück schiebst, und dann nur halb so weit. Für ganz feine Korrekturen: Punkt antippen, dann die <b>Pfeile</b>. <b>Beide Seiten gleich</b> spiegelt an der Mittellinie, <b>Raster</b> zeigt 5-mm-Kästchen, <b>Punkte fixieren</b> sperrt alles.',
      'Unter den Punkten stehen die <b>Messwerte in Millimetern</b>: bei Brauen zum Beispiel Abstand der Anfänge, Länge, Bogenhöhe und Höhenunterschied, bei Lippen Breite, Höhe von Ober- und Unterlippe und Symmetrie. Maßstab ist ein mittlerer Pupillenabstand von 62 mm, also Richtwerte.',
      '<b>3 Technik</b>: Technik und Farbton antippen. Die Farben sind Annäherungen, keine Herstellerpigmente.',
      '<b>4 Anpassen</b>: Deckkraft, Bogen und Weichheit. Bei Brauen gibt es den <b>Feinschliff in Millimetern</b> für Dicke, Bogen, Ende und Länge. Über 2 mm warnt die Kartei, passend zu deinem Grundsatz. Bei Lippen gibt es <b>Kontur nach innen</b>, nie nach außen.',
      '<b>5 Vergleich</b>: Alle Techniken nebeneinander auf demselben Foto. Antippen wählt. Mit <b>Aktuellen Stil merken</b> sammelst du Varianten und vergleichst sie.',
      '<b>6 Speichern</b>: Notiz eintragen und <b>In Akte speichern</b>. Das Bild kommt als Foto „Simulation“ in die Akte, auf Wunsch zusätzlich mit Punkten. Technik, Farbe, Messwerte und Notiz stehen als Notiz in der Akte.',
      '<b>Ansicht für Kundin</b> zeigt nur das Foto groß. <b>Vorher</b> gedrückt halten zeigt das Foto ohne Simulation. <b>Nah</b> zoomt auf Brauen oder Lippen, <b>Gesicht</b> zeigt alles.'
    ], tipp: 'Die Simulation ist eine Hilfe für das Gespräch, keine Vorzeichnung. Foto und Erkennung bleiben auf dem Gerät, erst beim Speichern kommt das Bild in deinen Drive-Ordner.' },
    { id: 'einwilligung', t: 'Einwilligungen und E-Mail-Service', k: 'Was die Kundin erlaubt hat, auf einen Blick', s: [
      'In jeder Akte steht unter den Stammdaten die Zeile <b>Einwilligungen</b>: Daten, Behandlung, Fotos Akte, Veröffentlichung und Mail-Erinnerung. <b>Grün</b> = erteilt, <b>rot</b> = abgelehnt oder widerrufen, <b>orange</b> = noch keine Angabe.',
      'Die Kartei liest das aus den unterschriebenen Formularen. Ein Tipp auf eine Einwilligung zeigt, aus welchem Formular sie stammt und von wann.',
      '<b>Widerruf</b>: Zieht eine Kundin ihr Okay für Veröffentlichung oder Erinnerungen zurück, tippst du auf die Einwilligung und dann auf <b>Widerruf eintragen</b>. Ab dann gilt nein.',
      '<b>E-Mail-Service</b>: Bei „Mail-Erinnerung“ ohne Angabe gibt es den Knopf <b>Einwilligung einholen</b>. Die Kundin füllt das kurze Formular am iPad aus und unterschreibt.',
      'In der Kundenliste helfen die Knöpfe über der Liste: <b>Einwilligung offen</b>, <b>Darf gepostet werden</b> und <b>Mail-Erinnerung erlaubt</b>. Vor jedem Instagram-Post ein Blick auf „Darf gepostet werden“.',
      '<b>Pflegehinweise</b> gehören zur Behandlung und gehen an jede Kundin mit E-Mail-Adresse. <b>Erinnerungen</b> gehen nur an Kundinnen mit Einwilligung. Unter jeder Erinnerung steht, wie sie sich abmelden.'
    ], tipp: 'Antwortet eine Kundin mit „Abmelden“: Akte öffnen, auf Mail-Erinnerung tippen, Widerruf eintragen.' },
    { id: 'aufgaben', t: 'Aufgaben und Erinnerungen', k: 'Nichts mehr vergessen', s: [
      'Tippe auf <b>+ Aufgabe</b>, in der Übersicht oder in einer Akte.',
      'Schreib, was zu tun ist, und wähle das <b>Fälligkeitsdatum</b>. Die <b>Kundin</b> ist freiwillig. Wählst du eine, steht die Aufgabe auch in ihrer Akte.',
      'Wähle die <b>Erinnerung</b>: keine, 1 Tag vorher um 9 Uhr, am Tag um 8 Uhr oder selbst wählen. Unten steht genau, wann die Mitteilung kommt.',
      'In der Akte unter Aufgaben gibt es <b>Folgetermin merken</b>: aufklappen, ein Tipp, zum Beispiel „PMU-Nachbehandlung · in 6 Wochen“, und die Aufgabe ist vorausgefüllt.',
      'Erledigt? Tippe auf den <b>Kreis</b> vor der Aufgabe. Die Erinnerung verschwindet dann auch aus dem Kalender.',
      'Ändern oder löschen: Aufgabe antippen.'
    ], tipp: 'Deine Aufgaben stehen auch in <b>Gmail</b> (rechte Seitenleiste) und in der App <b>Google Tasks</b>. Die Mitteilung aufs iPhone kommt über den <b>Google Kalender</b>: Installiere dafür die Google-Kalender-App oder richte dein Studio-Konto im iPhone-Kalender ein.' },
    { id: 'brows', t: 'Brauen-Reihe (Instagram)', k: 'Deine Reihe „If I could do your Brows“ Schritt für Schritt', s: [
      'Darum geht es: Eine Interessentin schickt dir ein Foto ihrer Brauen. Du zeigst ihr am Bild, wie du sie machen würdest, und veröffentlichst das mit ihrer Erlaubnis auf Instagram.',
      'Leg die Interessentin als Kundin an (Name reicht) und tippe ganz unten in der Akte auf <b>+ Brauen-Folge</b>.',
      '<b>Einwilligung</b>: „Anfrage kopieren“ und als Instagram-Nachricht schicken. Nach dem Ja: Datum eintragen, „volljährig“ antippen, Bildschirmfoto der Antwort hochladen.',
      '<b>Foto und Analyse</b>: Foto hochladen, mit dem Finger in den Kreis schieben, mit zwei Fingern zoomen. „Linien zeichnen“ und „Nummern setzen“, darunter die drei Punkte.',
      '<b>Vorschlag</b>: Behandlung antippen, Begründung schreiben.',
      '<b>Vorschau</b>: Simulation in Procreate machen und das fertige Bild hochladen.',
      '<b>PDF für die Kundin erzeugen</b>: Es liegt danach in der Akte und kann direkt per WhatsApp verschickt werden.',
      'Hat die Kundin Ja gesagt, trag das <b>Freigabe-Datum</b> ein. Erst dann gibt es die <b>6 Bilder für Instagram</b> und die Bildunterschrift.'
    ], tipp: 'Zieht eine Kundin ihr Okay zurück: „Einwilligung zurückgezogen“ tippen, Beitrag auf Instagram löschen, dann „Beitrag gelöscht, Fotos entfernen“.' },
    { id: 'bericht', t: 'Bericht und Nachweis', k: 'Auswertung als PDF, z. B. für die Förderung', s: [
      'Tippe auf <b>Bericht</b> (am iPhone unten, am Notebook in der Leiste links).',
      'Wähle den <b>Zeitraum</b>, zum Beispiel „Dieses Quartal“ oder „Eigener Zeitraum“ mit Von und Bis.',
      'Unter <b>Leistungen</b> kannst du auf PMU, Lash Lift, Brow Lift oder Waxing eingrenzen. „Alle“ nimmt alles.',
      'Unter <b>Namen im Bericht</b> wählst du „Abgekürzt“ (Sophia B.) oder „Vollständig“. Für Ämter und Förderstellen reicht meist abgekürzt.',
      '<b>Kundinnen ein- oder ausblenden</b>: Nimm das Häkchen weg bei Testeinträgen oder bei dir selbst. Die Kartei merkt sich das.',
      '<b>Alles lässt sich antippen</b>: Kennzahlen, Leistungen und Monatsbalken zeigen darunter die passenden Behandlungen oder Kundinnen. Ein Tipp auf eine Zeile öffnet die Akte.',
      'Tippe auf <b>PDF herunterladen</b>. Auf dem iPhone findest du es danach in der App <b>Dateien › Downloads</b>, am Computer im Ordner <b>Downloads</b>. Eine Kopie landet in Google Drive unter <b>Administration › Berichte</b>.',
      'Willst du das PDF direkt verschicken, tippe unten auf <b>PDF teilen</b> und wähle Mail oder WhatsApp.',
      'Druck das PDF aus oder öffne es am iPad und <b>unterschreibe</b> unten auf der letzten Seite.'
    ], tipp: 'Im Bericht stehen nur Datum, Kundin und Leistung. Gesundheitsdaten, Telefonnummern und Fotos sind nie darin. Preise stehen nur im Bereich Umsatz, nie im Nachweis.' },
    { id: 'auswertung', t: 'Meine Auswertung', k: 'Aus den eigenen Behandlungen lernen', s: [
      'Tippe auf <b>Bericht</b> und oben auf <b>Meine Auswertung</b>. „Nachweis“ bringt dich zurück zum Bericht für die Förderung.',
      '<b>Lerntagebuch</b>: zeigt alles, was du im Bogen unter „Nächstes Mal anders“ notiert hast, und was beim Termin danach herauskam.',
      '<b>Ergebnis nach Einstellung</b>: zeigt, bei welcher Einwirkzeit ein Lifting zu stark oder zu schwach wurde und bei welchem Hautbild das Pigment gut hält. Ein Tipp auf eine Zeile zeigt die Behandlungen dahinter.',
      '<b>Dauer</b>: Trag im Bogen oben die Minuten ein, dann siehst du, wie du schneller wirst.',
      '<b>Abgeheilt</b>: Im PMU-Bogen gibt es den Abschnitt „Abgeheilt (nach etwa 4 Wochen)“ und ein Foto „Abgeheilt“. Öffne bei der Nachbehandlung den Bogen vom Ersttermin und trag ein, wie gut das Pigment gehalten hat.',
      '<b>Woher kommen die Kundinnen?</b> Tippe beim Anlegen oder unter „Daten ändern“ an, wie sie dich gefunden hat. Mehrere Angaben sind möglich.',
      '<b>Google-Bewertung</b>: In der Akte oben tippst du „gebeten“ und später „erhalten“ an. Die Auswertung zeigt dir zufriedene Kundinnen, die du noch nicht gefragt hast.'
    ], tipp: 'Bei wenigen Behandlungen zeigen die Zahlen nur eine Richtung. Die Auswertung ist nur für dich und steht in keinem PDF.' },
    { id: 'umsatz', t: 'Umsatz', k: 'Was deine Behandlungen einbringen', s: [
      'Tippe auf <b>Bericht</b> und oben auf <b>Umsatz</b>.',
      'Die Zahlen kommen aus dem Feld <b>Preis in €</b> im Behandlungsbogen. Fehlt der Preis, zeigt die Kachel <b>Behandlungen ohne Preis</b>, wo du nachtragen kannst.',
      'Oben wählst du den <b>Zeitraum</b>. Die Kacheln zeigen Umsatz und Schnitt pro Behandlung, die Balken die letzten zwölf Monate.',
      '<b>Je Behandlung</b>: Ein Tipp auf eine Zeile filtert die Liste darunter. In der Liste sortierst du per Tipp auf die Überschrift, oben suchst du nach Namen.',
      'Offene <b>Anzahlungen</b> aus dem Kalender stehen oben als Hinweis.'
    ], tipp: 'Die Übersicht ersetzt keine Buchhaltung. Rechnungen und Kasse laufen weiter über SumUp und Lexware.' },
    { id: 'admin', t: 'Administration', k: 'Material, Mail-Texte, Sicherung', s: [
      'Tippe auf <b>Administration</b> (am iPhone unten ganz rechts, am Notebook in der Leiste links). Drei Kacheln: <b>Sicherung</b>, <b>Material</b> und <b>Mail-Texte</b>.',
      '<b>Material</b>: Oben zwischen Pigmente, Geräte und Nadeln & Module wechseln. <b>+ Pigment</b> öffnet das Formular: Name, Marke, Farbe, Bereich, Charge und Haltbar bis. Pro Flasche mit eigener Charge ein Eintrag.',
      'Der <b>Stern</b> macht einen Eintrag zum Favoriten, er steht dann im Bogen vorne. Überschriften antippen sortiert, das Suchfeld filtert.',
      '<b>Aufgebraucht</b>: Eintrag ändern, dann <b>Aufgebraucht / nicht mehr nutzen</b>. Er verschwindet aus dem Bogen, bleibt aber für die Rückverfolgung gespeichert.',
      '<b>Rückruf eines Herstellers</b>: In der Spalte <b>Kundinnen</b> steht, wie viele Kundinnen diese Charge bekommen haben. Ein Tipp zeigt sie in der Kartei.',
      '<b>Mail-Texte</b>: Pflegehinweise je Behandlung und Erinnerungen. Aufklappen, Text ändern, Speichern. <b>Standardtext wiederherstellen</b> holt den ursprünglichen Text zurück.'
    ], tipp: 'Die Pflegetexte stammen aus deinen Formularen. Bitte prüf vor allem den Text für Lippen und ergänze, was du dort zusätzlich sagst.' },
    { id: 'sicherung', t: 'Sicherung auf dem Rechner', k: 'Alles verschlüsselt, mit eigenem Passwort', s: [
      'Am besten am <b>Notebook</b>: <b>Administration</b> öffnen und auf <b>Sicherung</b> tippen.',
      'Denk dir ein <b>Passwort</b> mit mindestens 10 Zeichen aus, zum Beispiel einen Satz aus vier Wörtern. <b>Schreib es auf Papier</b> und leg es an einen sicheren Ort. Ohne Passwort lässt sich die Sicherung nie mehr öffnen.',
      'Passwort zweimal eintippen und auf <b>Sicherung erstellen</b> tippen. Die Kartei lädt alle Akten, Fotos und Dokumente, packt sie zusammen und verschlüsselt sie. Je nach Anzahl der Fotos dauert das ein bis fünf Minuten.',
      'Die Datei heißt zum Beispiel <b>Facecolorconcept-Sicherung-2026-11-23.html</b> und liegt in deinen Downloads. Leg sie in einen festen Ordner, zum Beispiel <b>Dokumente/Sicherungen</b>, und zusätzlich auf einen <b>USB-Stick</b>.',
      '<b>Öffnen</b>: Doppelklick auf die Datei, Passwort eingeben, <b>Entschlüsseln</b>. Der Browser speichert eine ZIP-Datei mit allem. Das geht ohne Internet und ohne die Kartei.',
      '<b>Prüfen</b>: Unter „Sicherung prüfen“ die Datei wählen und das Passwort eintippen. Die Kartei zeigt, wie viele Akten und Fotos drin sind.',
      'Mach das <b>einmal im Monat</b>. Die Übersicht erinnert dich, wenn die letzte Sicherung älter als 30 Tage ist.'
    ], tipp: 'Verschlüsselt mit AES-256. Wer die Datei findet, kann ohne Passwort nichts lesen. Das Passwort speichert die Kartei nirgends.' },
    { id: 'archiv', t: 'Archivieren statt Löschen', k: 'Nichts geht verloren', s: [
      'In der Akte ganz unten bei Dokumente auf <b>Akte archivieren</b>, dann noch einmal bestätigen.',
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
      'Verlangt eine Kundin <b>Auskunft über ihre Daten</b>: Akte öffnen, ganz unten bei Dokumente auf <b>Datenauskunft (PDF)</b> tippen. Das PDF enthält alles, was über sie gespeichert ist, und ihre Rechte. Gib es nur ihr persönlich, zum Beispiel per E-Mail an ihre eigene Adresse.',
      'Allergien und Kontraindikationen sind Gesundheitsdaten. Mit <b>Google Workspace</b> bekommst du einen Vertrag zur Auftragsverarbeitung mit Google, mit einem privaten Gmail-Konto nicht.',
      'Die <b>automatische Erkennung</b> in der Beratung läuft nur auf deinem Gerät. Die Dateien dafür liegen im eigenen Projekt, kein Foto geht an Google oder andere.',
      'Mach regelmäßig eine <b>verschlüsselte Sicherung</b> auf deinen Rechner (siehe „Sicherung auf dem Rechner“).'
    ] },
    { id: 'probleme', t: 'Wenn etwas nicht klappt', k: 'Häufige Fragen', faq: [
      ['Ich sehe noch die alte Ansicht.', 'App ganz schließen (vom unteren Rand hochwischen und wegschieben) und neu öffnen.'],
      ['„Kartei-Ordner nicht erreichbar“', 'Abmelden und mit info@facecolorconcept.de neu anmelden, dabei alle Häkchen setzen.'],
      ['Aufgaben werden nicht geladen.', 'Einmal abmelden und neu anmelden, dabei das Häkchen „Aufgaben“ setzen.'],
      ['Eine Kundin fehlt auf dem iPhone.', 'Oben rechts auf den Pfeil im Kreis tippen. Das lädt alles neu, auch die Google Kontakte.'],
      ['Ein neuer Google-Kontakt erscheint nicht.', 'Prüfen, ob der Kontakt das Label „Facecolorconcept“ hat. Dann neu laden.'],
      ['Die Erinnerung kommt nicht aufs Handy.', 'Google-Kalender-App installieren und Mitteilungen erlauben, oder das Studio-Konto unter Einstellungen → Kalender → Accounts einrichten.'],
      ['Ich habe das Passwort der Sicherung vergessen.', 'Dann lässt sich diese Sicherung nicht mehr öffnen, auch nicht von mir. Mach gleich eine neue Sicherung mit einem neuen Passwort und schreib es auf.'],
      ['„Automatisch erkennen“ findet kein Gesicht.', 'Foto von vorne nehmen, Gesicht gut beleuchtet und nicht zu klein im Bild. Klappt es nicht, setzt du die Punkte von Hand. Auf sehr alten iPads kann die Erkennung fehlen.'],
      ['Das Anmeldefenster öffnet sich nicht.', 'In Safari den Popup-Blocker für die Kartei ausschalten (Einstellungen → Safari → Popups blockieren).'],
      ['Beim Mail-Versand kommt „Google-Fenster konnte nicht geöffnet werden“.', 'Noch einmal auf „Senden“ tippen. Beim ersten Versand fragt Google einmal, ob die Kartei Mails über info@facecolorconcept.de senden darf. Dort das Häkchen setzen.']
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
