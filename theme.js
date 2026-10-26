// Ansicht: hell am Tag (7–19 Uhr), dunkel am Abend oder fest eingestellt. Eigene Datei, damit die Sicherheitsregel (CSP) keine eingebetteten Skripte erlauben muss.
/* Hell am Tag (7–19 Uhr), dunkel am Abend – oder fest eingestellt über den Knopf „Ansicht“ */
// Schutz gegen Einbetten in fremde Seiten (Clickjacking): die Kartei läuft nie in einem Rahmen.
if (window.top !== window.self) {
  document.documentElement.style.display = 'none';
  try { window.top.location = window.self.location.href; } catch (e) {}
}
// Formulare werden nie abgeschickt, alles läuft über die Knöpfe (verhindert Neuladen per Enter-Taste).
document.addEventListener('submit', function (e) { e.preventDefault(); }, true);
(function () {
  var mode = 'auto';
  try { mode = localStorage.getItem('fcc_theme') || 'auto'; } catch (e) {}
  var LABEL = { auto: 'Ansicht: automatisch (tagsüber hell, abends dunkel)', light: 'Ansicht: immer hell', dark: 'Ansicht: immer dunkel' };
  var S = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var ICON = {
    auto: S('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>'),
    light: S('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    dark: S('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>')
  };
  function apply() {
    var t = mode;
    if (mode === 'auto') { var h = new Date().getHours(); t = (h >= 7 && h < 19) ? 'light' : 'dark'; }
    document.documentElement.setAttribute('data-theme', t);
    var b = document.getElementById('themeBtn'); if (b) { b.innerHTML = ICON[mode]; b.title = LABEL[mode]; b.setAttribute('aria-label', LABEL[mode]); }
  }
  apply();
  setInterval(apply, 60000);
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('themeBtn'); if (!b) return;
    b.onclick = function () {
      mode = mode === 'auto' ? 'light' : mode === 'light' ? 'dark' : 'auto';
      try { localStorage.setItem('fcc_theme', mode); } catch (e) {}
      apply();
    };
    apply();
  });
})();
