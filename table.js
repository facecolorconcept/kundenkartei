// Kundenkartei als Tabelle: Spaltenüberschriften zum Sortieren, Filter, Zähler und CSV-Export.
// Umschalter „Karten | Tabelle“ oben in der Kundenkartei.
(function () {
  const FCC = window.FCC = window.FCC || {};
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = d => d ? d.split('-').reverse().join('.') : '–';
  const DAY = 864e5;
  const days = d => d ? Math.floor((Date.now() - new Date(d + 'T12:00').getTime()) / DAY) : Infinity;
  const ARTS = ['PMU', 'Lash Lift', 'Brow Lift', 'Waxing'];

  let mode = 'karten';
  try { mode = localStorage.getItem('fcc_kartei_mode') || 'karten'; } catch (e) {}
  const st = { sort: 'name', dir: 1, q: '', art: '', fb: '', besuch: '' };

  const COLS = [
    { k: 'name', t: 'Name', v: e => `${e.nachname || ''}, ${e.vorname || ''}`.replace(/^, |, $/g, '') },
    { k: 'telefon', t: 'Telefon', v: e => e.telefon || '' },
    { k: 'letzte', t: 'Letzte Behandlung', v: e => (e.letzte && e.letzte.art) || '' },
    { k: 'datum', t: 'Datum', v: e => (e.letzte && e.letzte.datum) || '' },
    { k: 'anzahl', t: 'Behandlungen', v: e => (e.b || []).length, num: true },
    { k: 'fb', t: 'Fragebogen', v: e => e.nurKontakt ? '' : (e.fragebogen || '') },
    { k: 'art', t: 'Akte', v: e => e.nurKontakt ? 'nur Kontakt' : 'Akte' }
  ];

  function rows() {
    const q = st.q.toLowerCase().trim();
    let list = (window.Store && Store.list ? Store.list() : []).filter(e => {
      if (q && !(`${e.vorname} ${e.nachname} ${e.telefon} ${(e.f || []).join(' ')}`.toLowerCase().includes(q))) return false;
      if (st.art && !(e.b || []).some(b => b.a === st.art)) return false;
      if (st.fb === 'fehlt' && (e.fragebogen || e.nurKontakt)) return false;
      if (st.fb === 'da' && !e.fragebogen) return false;
      const n = days(e.letzte && e.letzte.datum);
      if (st.besuch === '30' && n > 30) return false;
      if (st.besuch === '90' && n > 90) return false;
      if (st.besuch === '180+' && !(n > 180 && n !== Infinity)) return false;
      if (st.besuch === 'nie' && n !== Infinity) return false;
      return true;
    });
    const col = COLS.find(c => c.k === st.sort) || COLS[0];
    list.sort((a, b) => {
      const x = col.v(a), y = col.v(b);
      if (x === '' && y !== '') return 1; // leere Werte immer nach unten
      if (y === '' && x !== '') return -1;
      return (col.num ? x - y : String(x).localeCompare(String(y), 'de')) * st.dir;
    });
    return list;
  }

  function sel(id, label, val, opts) {
    return `<div class="field"><label for="${id}">${label}</label><select id="${id}">${opts.map(([v, t]) => `<option value="${esc(v)}"${v === val ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
  }

  function renderTable() {
    const box = document.getElementById('tableView');
    if (!box) return;
    const list = rows();
    const active = st.q || st.art || st.fb || st.besuch;
    box.innerHTML = `
      <div class="panel card">
        <div class="tfilters">
          <div class="field tq"><label for="t-q">Filtern</label><input id="t-q" type="search" placeholder="Name, Telefon, Pigment, Charge …" value="${esc(st.q)}"></div>
          ${sel('t-art', 'Behandlung', st.art, [['', 'Alle'], ...ARTS.map(a => [a, a])])}
          ${sel('t-fb', 'Fragebogen', st.fb, [['', 'Alle'], ['fehlt', 'fehlt'], ['da', 'vorhanden']])}
          ${sel('t-besuch', 'Letzter Besuch', st.besuch, [['', 'Alle'], ['30', 'in den letzten 30 Tagen'], ['90', 'in den letzten 90 Tagen'], ['180+', 'vor mehr als 6 Monaten'], ['nie', 'noch nie behandelt']])}
        </div>
        <div class="row between" style="margin-top:12px">
          <span class="label">${list.length} ${list.length === 1 ? 'Kundin' : 'Kundinnen'}${active ? ' · gefiltert' : ''}</span>
          <div class="row">
            ${active ? '<button class="btn ghost small" id="t-reset">Filter zurücksetzen</button>' : ''}
            <button class="btn ghost small" id="t-csv">Als CSV exportieren</button>
          </div>
        </div>
        <div class="tscroll">
          <table class="ktab">
            <thead><tr>${COLS.map(c => `<th scope="col" aria-sort="${st.sort === c.k ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button data-sort="${c.k}">${c.t}<span aria-hidden="true">${st.sort === c.k ? (st.dir > 0 ? ' ▲' : ' ▼') : ''}</span></button></th>`).join('')}</tr></thead>
            <tbody>${list.length ? list.map(e => `<tr data-id="${esc(e.id)}" tabindex="0">
              <td><b>${esc(COLS[0].v(e) || '(ohne Namen)')}</b></td>
              <td>${esc(e.telefon) || '–'}</td>
              <td>${esc((e.letzte && e.letzte.art) || '–')}</td>
              <td class="num">${fmt(e.letzte && e.letzte.datum)}</td>
              <td class="num">${(e.b || []).length}</td>
              <td>${e.nurKontakt ? '–' : (e.fragebogen ? `<span class="pill ok">${fmt(e.fragebogen)}</span>` : '<span class="pill warn">fehlt</span>')}</td>
              <td>${e.nurKontakt ? '<span class="tag">Kontakt</span>' : 'Akte'}</td>
            </tr>`).join('') : `<tr><td colspan="${COLS.length}" class="empty">Keine Kundin passt zu diesen Filtern.</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;

    const q = box.querySelector('#t-q');
    q.oninput = () => { st.q = q.value; const pos = q.selectionStart; renderTable(); const n = document.getElementById('t-q'); n.focus(); n.setSelectionRange(pos, pos); };
    ['art', 'fb', 'besuch'].forEach(k => { box.querySelector('#t-' + k).onchange = ev => { st[k] = ev.target.value; renderTable(); }; });
    const r = box.querySelector('#t-reset'); if (r) r.onclick = () => { st.q = st.art = st.fb = st.besuch = ''; renderTable(); };
    box.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => {
      if (st.sort === b.dataset.sort) st.dir = -st.dir; else { st.sort = b.dataset.sort; st.dir = ['datum', 'anzahl', 'fb'].includes(st.sort) ? -1 : 1; } // Datum und Anzahl: neueste/meiste zuerst
      renderTable();
    });
    box.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.onclick = () => FCC.openCustomer && FCC.openCustomer(tr.dataset.id);
      tr.onkeydown = ev => { if (ev.key === 'Enter') tr.click(); };
    });
    box.querySelector('#t-csv').onclick = () => exportCsv(list);
  }

  // CSV für Excel/Numbers (Semikolon, mit BOM für Umlaute). Enthält nur die Spalten der Tabelle, keine Gesundheitsdaten.
  function exportCsv(list) {
    const cell = v => { const s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [COLS.map(c => c.t).join(';')].concat(list.map(e => COLS.map(c => {
      const v = c.v(e);
      return cell((c.k === 'datum' || c.k === 'fb') && v ? fmt(v) : v);
    }).join(';')));
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kundinnen_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function setMode(m) {
    mode = m;
    try { localStorage.setItem('fcc_kartei_mode', m); } catch (e) {}
    const main = document.getElementById('main');
    if (!main) return;
    main.classList.toggle('table-mode', m === 'tabelle');
    main.querySelectorAll('.ktoggle button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    if (m === 'tabelle') renderTable();
  }

  function setup() {
    const main = document.getElementById('main');
    if (!main || document.getElementById('tableView')) return;
    const bar = document.createElement('div');
    bar.className = 'ktoggle';
    bar.innerHTML = '<span class="label">Ansicht</span><div class="seg" role="group" aria-label="Ansicht der Kundenkartei"><button type="button" data-mode="karten">Karten</button><button type="button" data-mode="tabelle">Tabelle</button></div>';
    main.prepend(bar);
    const tv = document.createElement('section');
    tv.id = 'tableView';
    main.append(tv);
    bar.querySelectorAll('button').forEach(b => { b.onclick = () => setMode(b.dataset.mode); });
    setMode(mode);

    // Wer eine Kundin öffnet oder eine gefilterte Liste aus der Übersicht holt, landet in der Kartenansicht
    const openC = FCC.openCustomer, openL = FCC.openList;
    if (openC) FCC.openCustomer = id => { setMode('karten'); openC(id); };
    if (openL) FCC.openList = (...a) => { setMode('karten'); openL(...a); };
  }
  FCC.refreshTable = () => { if (mode === 'tabelle') renderTable(); };

  const css = document.createElement('style');
  css.textContent = `
    .ktoggle{grid-column:1/-1;display:flex;align-items:center;gap:10px;justify-content:flex-end}
    .seg{display:inline-flex;border:1px solid var(--line);border-radius:99px;padding:3px;background:var(--paper)}
    .seg button{border:0;background:transparent;color:var(--muted);padding:6px 16px;border-radius:99px;font:inherit;font-size:14px;font-weight:500;min-height:34px}
    .seg button[aria-pressed="true"]{background:var(--rose-soft);color:var(--rose-ink)}
    #tableView{grid-column:1/-1;min-width:0}
    main:not(.table-mode) #tableView{display:none}
    main.table-mode .list-col, main.table-mode .detail-col{display:none!important}
    .tfilters{display:grid;grid-template-columns:minmax(0,2fr) repeat(3,minmax(0,1fr));gap:12px}
    @media(max-width:820px){.tfilters{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.tfilters .tq{grid-column:1/-1}}
    .tscroll{overflow-x:auto;margin-top:12px;border-top:1px solid var(--line)}
    .ktab{width:100%;border-collapse:collapse;font-size:14.5px}
    .ktab th{position:sticky;top:0;background:var(--paper);text-align:left;border-bottom:1px solid var(--line);padding:0;white-space:nowrap}
    .ktab th button{border:0;background:none;font:inherit;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:500;padding:12px 10px;cursor:pointer;width:100%;text-align:left}
    .ktab th button:hover,.ktab th[aria-sort="ascending"] button,.ktab th[aria-sort="descending"] button{color:var(--rose-ink)}
    .ktab td{padding:11px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
    .ktab td b{font-weight:500}
    .ktab td.num{font-variant-numeric:tabular-nums}
    .ktab tbody tr[data-id]{cursor:pointer}
    .ktab tbody tr[data-id]:hover,.ktab tbody tr[data-id]:focus-visible{background:var(--rose-soft);outline:none}
    .ktab td:first-child{position:sticky;left:0;background:inherit}
    .ktab tbody tr{background:var(--paper)}`;
  document.head.append(css);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
