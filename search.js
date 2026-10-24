// Globale Suche oben in jeder Ansicht: Name, Telefon, E-Mail, Allergien, Notizen, Pigmente, Chargen …
// Weitere Module können eigene Treffer liefern: FCC.searchProviders.push(q => [{ titel, text, open() }])
(function () {
  const FCC = window.FCC = window.FCC || {};
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const digits = s => String(s || '').replace(/\D/g, '');

  // Treffer markieren
  function mark(text, words) {
    let out = esc(text);
    words.forEach(w => {
      if (w.length < 2) return;
      const i = norm(text).indexOf(w);
      if (i >= 0) {
        const part = esc(text.slice(i, i + w.length));
        out = out.replace(part, '<mark>' + part + '</mark>');
      }
    });
    return out;
  }

  // Standard-Quelle: Kundinnen aus der Kartei
  FCC.searchProviders = FCC.searchProviders || [];
  FCC.searchProviders.push(q => {
    if (!window.Store || !Store.list) return [];
    const words = norm(q).split(/\s+/).filter(Boolean);
    // Ziffernsuche (z. B. Telefonnummer ohne Leerzeichen) nur, wenn nur Ziffern eingegeben wurden
    const qd = /^[\d\s+\-/()]+$/.test(q) ? digits(q) : '';
    return Store.list(true).map(e => {
      const name = `${e.vorname || ''} ${e.nachname || ''}`.trim() || '(ohne Namen)';
      const felder = [name, e.telefon ? 'Telefon: ' + e.telefon : ''].concat(e.f || []).filter(Boolean);
      const hay = norm(felder.join(' | '));
      const ok = words.every(w => hay.includes(w)) || (qd.length >= 4 && felder.some(x => digits(x).includes(qd)));
      if (!ok) return null;
      const nameHit = words.every(w => norm(name).includes(w));
      const grund = nameHit ? (e.letzte ? `${e.letzte.art} · zuletzt ${e.letzte.datum.split('-').reverse().join('.')}` : (e.nurKontakt ? 'Kontakt, noch keine Akte' : 'noch keine Behandlung'))
        : (felder.find(x => words.some(w => norm(x).includes(w))) || felder.find(x => qd && digits(x).includes(qd)) || '');
      return { score: (nameHit ? 0 : 1) + (e.archiv ? 2 : 0), titel: name, text: (e.archiv ? 'Archiviert · ' : '') + grund, words, open: () => FCC.openCustomer && FCC.openCustomer(e.id) };
    }).filter(Boolean).sort((a, b) => a.score - b.score || a.titel.localeCompare(b.titel, 'de'));
  });

  function setup() {
    const nav = document.getElementById('modnav');
    if (!nav || document.getElementById('gsearch')) return;
    const box = document.createElement('div');
    box.className = 'gsearch';
    box.innerHTML = `<input id="gsearch" type="search" autocomplete="off" placeholder="Suchen: Name, Telefon, Pigment, Charge …" aria-label="Alles durchsuchen" aria-controls="gresults">
      <div id="gresults" class="gresults" role="listbox" hidden></div>`;
    nav.after(box);
    const inp = box.querySelector('input'), res = box.querySelector('#gresults');
    let hits = [], sel = 0;

    function show() {
      const q = inp.value.trim();
      if (q.length < 2) { res.hidden = true; return; }
      hits = FCC.searchProviders.flatMap(p => { try { return p(q) || []; } catch (e) { return []; } }).slice(0, 8);
      sel = 0;
      res.innerHTML = hits.length
        ? hits.map((h, i) => `<button type="button" role="option" data-i="${i}" class="${i === sel ? 'on' : ''}"><b>${mark(h.titel, h.words || [])}</b><span>${mark(h.text, h.words || [])}</span></button>`).join('')
        : `<p>Nichts gefunden für „${esc(q)}“.</p>`;
      res.hidden = false;
      res.querySelectorAll('button').forEach(b => { b.onmousedown = ev => ev.preventDefault(); b.onclick = () => go(Number(b.dataset.i)); });
    }
    function go(i) { const h = hits[i]; if (!h) return; inp.value = ''; res.hidden = true; inp.blur(); h.open(); }

    inp.addEventListener('input', show);
    inp.addEventListener('focus', show);
    inp.addEventListener('blur', () => setTimeout(() => { res.hidden = true; }, 150));
    inp.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); go(sel); }
      else if (ev.key === 'Escape') { inp.value = ''; res.hidden = true; inp.blur(); }
      else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (!hits.length) return;
        sel = (sel + (ev.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length;
        res.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === sel));
      }
    });
    // „/“ springt in die Suche (Laptop)
    document.addEventListener('keydown', ev => {
      if (ev.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { ev.preventDefault(); inp.focus(); }
    });
  }

  const st = document.createElement('style');
  st.textContent = `
    .gsearch{position:relative;flex:1;min-width:220px;max-width:440px}
    .gsearch input{width:100%;padding:9px 14px;border:1px solid var(--line);border-radius:99px;background:var(--bg);min-height:40px;font-size:16px}
    .gresults{position:absolute;left:0;right:0;top:calc(100% + 6px);background:var(--paper);border:1px solid var(--line);border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.18);padding:6px;z-index:30;max-height:70vh;overflow-y:auto}
    .gresults button{display:block;width:100%;text-align:left;border:0;background:transparent;padding:10px 12px;border-radius:10px;color:var(--ink);font:inherit}
    .gresults button.on,.gresults button:hover{background:var(--rose-soft)}
    .gresults b{display:block;font-weight:500}
    .gresults span{display:block;font-size:13px;color:var(--muted);overflow-wrap:anywhere}
    .gresults mark{background:var(--rose-soft);color:var(--rose-ink);border-radius:3px;padding:0 1px}
    .gresults button.on mark{background:var(--paper)}
    .gresults p{margin:0;padding:12px;color:var(--muted)}
    @media(max-width:820px){.gsearch{order:5;flex-basis:100%;max-width:none}}`;
  document.head.append(st);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
