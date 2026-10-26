# Facecolorconcept Kundenkartei einrichten

Dauer: etwa 30 Minuten, einmalig. Du brauchst nur deinen Computer und dein Google-Konto.

Solange in `config.js` keine CLIENT_ID steht, läuft die Kartei im **Beispielmodus**. Dann wird nichts in Google Drive gespeichert.

---

## Schritt 1: Kartei auf GitHub stellen

1. Auf **github.com** anmelden oder ein kostenloses Konto anlegen.
2. Oben rechts auf **+** → **New repository** klicken.
   - Name: `kundenkartei`
   - **Public** auswählen. Das kostenlose GitHub Pages geht nur mit öffentlichen Projekten. Öffentlich ist nur der Programmcode. Kundendaten liegen nie auf GitHub, sondern nur in deinem Google Drive.
   - Auf **Create repository** klicken.
3. Auf **uploading an existing file** klicken und alle Dateien aus dem ZIP hineinziehen (`index.html`, `app.js`, `store.js`, `config.js`, `manifest.webmanifest`, die drei `icon-…png`). Danach auf **Commit changes** klicken.
4. **Settings** → links **Pages** öffnen. Unter „Branch“ **main** und **/(root)** wählen und auf **Save** klicken.
5. Nach 1–2 Minuten erscheint oben deine Adresse, zum Beispiel
   `https://facecolorconcept.github.io/kundenkartei/`.
   Öffne sie. Du siehst die Kartei im Beispielmodus.

## Schritt 2: Google-Zugang anlegen

Melde dich mit **dem Google-Konto** an, in dessen Drive die Akten liegen sollen.

1. Öffne **console.cloud.google.com**.
2. Oben auf die Projektauswahl → **Neues Projekt** klicken, Name `Kundenkartei`, dann **Erstellen**.
3. Links **APIs und Dienste** → **Bibliothek** öffnen:
   - „Google Drive API“ suchen → **Aktivieren**
   - „Google Calendar API“ suchen → **Aktivieren**
4. Links **Google Auth Platform** (früher „OAuth-Zustimmungsbildschirm“) → **Jetzt starten**:
   - App-Name: `Facecolorconcept Kundenkartei`, Support-E-Mail: deine Adresse
   - Zielgruppe: **Extern**
   - Kontaktdaten: deine Adresse, dann **Erstellen**
5. Unter **Zielgruppe** → **Testnutzer** → **Add users**: deine eigene Gmail-Adresse eintragen.
6. Unter **Datenzugriff** → **Bereiche hinzufügen**. Diese zwei anhaken:
   - `.../auth/drive.file` (nur Dateien, die die Kartei selbst anlegt)
   - `.../auth/calendar.events` (Erinnerungen eintragen)
7. Unter **Clients** → **Client erstellen**:
   - Anwendungstyp: **Webanwendung**
   - Autorisierte JavaScript-Quellen: `https://facecolorconcept.github.io` (ohne `/kundenkartei` am Ende)
   - **Erstellen** klicken und die **Client-ID** kopieren. Sie endet auf `.apps.googleusercontent.com`.

## Schritt 3: Client-ID eintragen

1. In GitHub die Datei `config.js` öffnen und auf den **Stift** klicken.
2. Die Client-ID zwischen die Anführungszeichen setzen:
   `CLIENT_ID: '123456-abc.apps.googleusercontent.com',`
3. Auf **Commit changes** klicken und 1–2 Minuten warten.

## Schritt 4: Auf dem iPhone als App nutzen

1. Die Adresse in **Safari** öffnen (nicht in Chrome).
2. **Mit Google anmelden**. Google zeigt den Hinweis „Google hat diese App nicht überprüft“. Das ist normal, weil es deine eigene App ist. Auf **Weiter** tippen und Drive und Kalender erlauben.
3. Unten auf **Teilen** (Viereck mit Pfeil) → **Zum Home-Bildschirm** tippen.
4. Ab jetzt startest du die Kartei über das Symbol „Kartei“ wie eine App.

**Fotos:** Im Behandlungsbogen auf „+ Foto“ tippen. Das iPhone fragt dann, ob du ein Foto machen oder aus der Mediathek wählen willst. Mehrere Fotos auf einmal gehen auch. Die Fotos werden verkleinert, damit Drive nicht vollläuft, und landen im Ordner `fotos` der Kundin.

---

## Gut zu wissen

- **Ablage in Drive:**
  ```
  Facecolorconcept Kartei/
    _verzeichnis.json              ← Kundenliste für den schnellen Start
    Beispiel_Laura_k7f2/
      kundin.json                  ← Stammdaten und alle Behandlungsbögen
      fotos/2026-10-09_Lash-Lift_Vorher_1.jpg
      dokumente/Einwilligung.pdf
  ```
- **Dein alter Apps-Script-Ordner** bleibt unangetastet. Die Kartei darf aus Datenschutzgründen nur Dateien sehen, die sie selbst angelegt hat, und legt deshalb den neuen Ordner „Facecolorconcept Kartei“ an.
- **Anmeldung:** Google hält die Anmeldung etwa eine Stunde. Danach öffnet sich beim nächsten Speichern kurz das Google-Fenster und schließt sich wieder.
- **Zwei Geräte:** Wenn du auf dem Laptop eine Kundin angelegt hast und sie auf dem iPhone fehlt, oben auf **Liste neu laden** tippen.
- **Datenschutz:** Allergien, Blutverdünner und Kontraindikationen sind Gesundheitsdaten. Mit Google Workspace bekommst du einen Vertrag zur Auftragsverarbeitung mit Google, mit einem privaten Gmail-Konto nicht. Lass das bitte vor dem echten Einsatz prüfen.

## Brows-Reihe „If I could do your Brows“

1. Interessentin anlegen (Name reicht), in ihrer Akte **+ Neue Folge** tippen.
2. **Einwilligung:** „Anfrage kopieren“ und per DM schicken. Nach dem Ja: Datum eintragen, „volljährig“ antippen, Screenshot hochladen.
3. **Foto und Analyse:** Foto hochladen, mit dem Finger in den Kreis schieben, mit zwei Fingern zoomen. „Linien zeichnen“ und „Nummern setzen“, darunter die drei Punkte.
4. **Vorschlag:** Behandlung antippen, Begründung schreiben.
5. **Vorschau:** Simulation in Procreate machen und das fertige Bild hochladen.
6. **PDF für die Kundin erzeugen:** landet in der Akte unter Dokumente und kann direkt per WhatsApp geschickt werden.
7. Nach ihrem Ja das Freigabe-Datum eintragen. Erst dann gibt es die **6 Bilder für Instagram** und die Bildunterschrift.

Zieht eine Kundin ihr Okay zurück: „Einwilligung zurückgezogen“ tippen, Beitrag auf Instagram löschen, dann „Beitrag gelöscht, Fotos entfernen“. Die Fotos kommen in den Drive-Papierkorb, der Vermerk über Einwilligung und Rückzug bleibt.

## Aufgaben

Die Aufgaben kommen aus Google Tasks. Sie stehen also auch in Gmail (rechte Seitenleiste), im Google Kalender und in der Tasks-App auf dem iPhone.

- **+ Aufgabe** in der Übersicht oder in einer Akte. Optional mit Kundin, dann erscheint sie auch in deren Akte.
- **Erinnerung:** keine, 1 Tag vorher um 9 Uhr, am Tag um 8 Uhr oder selbst wählen. Die Kartei legt dafür einen kurzen Termin im Google Kalender mit Mitteilung an. Damit die Mitteilung aufs iPhone kommt, muss dort die Google-Kalender-App installiert oder das Google-Konto im iPhone-Kalender eingerichtet sein.
- **Abhaken** mit dem Kreis. Die Erinnerung verschwindet dann aus dem Kalender.
- **Aus „Jetzt dran“** wird mit dem Häkchen-Knopf eine Aufgabe.
- In Google landen nur Titel, Datum und Name, keine Gesundheitsdaten.
