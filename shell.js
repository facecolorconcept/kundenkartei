// Grundgerüst: Reiter-Navigation für alle Bereiche (Module) des Studios.
// Ein neues Modul = eine neue Datei, die sich mit FCC.register({...}) anmeldet, plus ein <script>-Eintrag in index.html.
(function () {
  const FCC = window.FCC = window.FCC || {};
  const mods = [];
  let cur = null;
  let wanted = null; // gewünschter Bereich, falls dessen Modul erst später geladen wird

  function build() {
    const nav = document.getElementById('modnav');
    if (!nav) return;
    nav.innerHTML = mods.map(m =>
      `<button type="button" data-mod="${m.id}"${m.id === cur ? ' aria-current="page"' : ''}>${m.icon || ''}<span>${m.titel}</span></button>`
    ).join('');
    nav.querySelectorAll('button').forEach(b => { b.onclick = () => FCC.show(b.dataset.mod); });
  }

  // m = { id, titel, el (id des Bereichs im HTML), order, icon (SVG), render() }
  FCC.register = m => {
    mods.push(m);
    mods.sort((a, b) => (a.order || 0) - (b.order || 0));
    build();
    if (wanted && m.id === wanted && cur !== wanted) FCC.show(wanted);
  };

  FCC.show = id => {
    const m = mods.find(x => x.id === id) || mods.find(x => x.id === cur) || mods[0];
    if (!m) return;
    if (m.id === id) wanted = null;
    cur = m.id;
    mods.forEach(x => { const el = document.getElementById(x.el); if (el) el.hidden = x.id !== cur; });
    build();
    try { history.replaceState(null, '', '#' + cur); } catch (e) {}
    if (m.render) m.render();
    window.scrollTo(0, 0);
  };

  FCC.current = () => cur;

  // Wird aufgerufen, sobald die Daten geladen sind
  FCC.ready = () => {
    const h = (location.hash || '').slice(1);
    wanted = h || 'uebersicht';
    FCC.show(wanted);
  };
})();
