// Modul „Kalender“: zeigt die Termine aus dem Google Kalender von info@facecolorconcept.de.
// Online-Buchungen über die Google-Terminbuchung landen dort automatisch und erscheinen hier mit.
// Die Kartei liest nur. Termine anlegen, verschieben und absagen läuft weiter im Google Kalender.
(function () {
  const FCC = window.FCC = window.FCC || {};
  const C = window.FCC_CONFIG || {};
  const DAY = 864e5;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const hm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const name = e => `${e.vorname || ''} ${e.nachname || ''}`.trim();
  const montag = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const sicherLink = u => /^https:\/\/(www\.)?(google\.com\/calendar|calendar\.google\.com)\//.test(u || '') ? u : '';
  const buchungLink = () => /^https:\/\//.test(C.BUCHUNG_URL || '') ? C.BUCHUNG_URL : '';
  const START_H = 8, END_H = 20, PX = 52; // sichtbarer Tag 8 bis 20 Uhr, 52 Pixel je Stunde

  let woche = montag(new Date());
  let gewaehlt = null;
  const cache = {}; // Termine je Woche, 2 Minuten gültig

  async function laden(von, bis) {
    const k = von.toISOString() + bis.toISOString();
    if (cache[k] && Date.now() - cache[k].t < 120000) return cache[k].l;
    if (!Store.termine) return [];
    const l = (await Store.termine(von, bis)).filter(x => x.eventType !== 'workingLocation');
    cache[k] = { t: Date.now(), l };
    return l;
  }
  FCC.kalenderNeu = () => { Object.keys(cache).forEach(k => delete cache[k]); };

  // Termin einer Kundin zuordnen: zuerst über die E-Mail-Adresse der Buchung, sonst über den Namen im Titel
  function zuordnen(ev) {
    const list = Store.list(true).filter(e => !e.nurKontakt);
    const mails = new Set();
    (ev.attendees || []).forEach(a => { if (!a.self && a.email) mails.add(a.email.toLowerCase()); });
    (String(ev.description || '').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).forEach(m => mails.add(m.toLowerCase()));
    mails.delete(String(C.LOGIN_HINT || '').toLowerCase());
    const mailVon = e => ((e.f || []).find(x => x.startsWith('E-Mail: ')) || '').slice(8).trim().toLowerCase();
    let e = list.find(x => { const m = mailVon(x); return m && mails.has(m); });
    const titel = String(ev.summary || '').toLowerCase();
    if (!e) e = list.find(x => { const n = name(x).toLowerCase(); return n.includes(' ') && titel.includes(n); });
    // Name der Buchenden für „Als Kundin anlegen“: aus „Behandlung (Vorname Nachname)“ oder aus der Teilnehmerliste
    const gast = (ev.attendees || []).find(a => !a.self && a.email);
    const klammer = /\(([^()]{3,60})\)\s*$/.exec(ev.summary || '');
    const gastName = (gast && gast.displayName) || (klammer ? klammer[1] : '');
    return { e, mail: gast ? gast.email : [...mails][0] || '', gastName: gastName.trim() };
  }

  const zeit = ev => {
    if (ev.start && ev.start.date) return { ganz: true, s: new Date(ev.start.date + 'T00:00'), e: new Date(ev.end.date + 'T00:00') };
    return { ganz: false, s: new Date(ev.start.dateTime), e: new Date(ev.end.dateTime) };
  };

  async function render() {
    const el = document.getElementById('mod-kalender');
    if (!el || !window.Store) return;
    const bis = new Date(woche.getTime() + 7 * DAY);
    const tage = [...Array(7)].map((_, i) => new Date(woche.getTime() + i * DAY));
    const heute = dkey(new Date());
    const vonTxt = woche.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
    const bisTxt = new Date(bis.getTime() - DAY).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
    const bl = buchungLink();
    el.innerHTML = `
      <div class="row between hello">
        <div><span class="label">Kalender</span><h1>Termine</h1></div>
        <div class="row">
          ${bl ? `<a class="btn ghost small" href="${esc(bl)}" target="_blank" rel="noopener noreferrer">Online-Buchung</a>` : ''}
          <a class="btn ghost small" href="https://calendar.google.com/calendar/r/week" target="_blank" rel="noopener noreferrer">Google Kalender</a>
          <button class="qhelp" data-hilfe="kalender" aria-label="Hilfe zum Kalender" title="Hilfe">?</button>
        </div>
      </div>
      <div class="row kal-nav">
        <button class="iconbtn" data-w="-1" aria-label="Woche zurück">‹</button>
        <button class="btn ghost small" data-w="0">Heute</button>
        <button class="iconbtn" data-w="1" aria-label="Woche vor">›</button>
        <b class="kal-range">${esc(vonTxt)} bis ${esc(bisTxt)}</b>
        <span class="kal-leg"><i class="kal-f-ok"></i>Termin mit Akte<i class="kal-f-term"></i>Termin ohne Akte<i class="kal-f-frei"></i>frei</span>
      </div>
      <div id="kalDetail"></div>
      <div id="kalBody"><div class="panel empty">Termine werden geladen …</div></div>`;
    el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => {
      const w = Number(b.dataset.w);
      woche = w === 0 ? montag(new Date()) : new Date(woche.getTime() + w * 7 * DAY);
      gewaehlt = null; render();
    });
    el.querySelectorAll('[data-hilfe]').forEach(b => { b.onclick = () => FCC.hilfe && FCC.hilfe(b.dataset.hilfe); });

    let evs;
    try { evs = await laden(woche, bis); }
    catch (err) {
      const msg = /\(403\)/.test(err.message) ? 'Google erlaubt der Kartei gerade keinen Blick in den Kalender. Bitte einmal abmelden, neu anmelden und beim Google-Fenster alle Häkchen setzen.' : err.message;
      el.querySelector('#kalBody').innerHTML = `<div class="panel empty">Der Kalender konnte nicht geladen werden. ${esc(msg)}</div>`;
      return;
    }
    if (FCC.current() !== 'kalender') return;
    const items = evs.map(ev => ({ ev, z: zeit(ev), k: zuordnen(ev) }));
    let minH = START_H, maxH = END_H;
    items.forEach(x => { if (!x.z.ganz) { minH = Math.min(minH, x.z.s.getHours()); maxH = Math.max(maxH, Math.ceil(x.z.e.getHours() + x.z.e.getMinutes() / 60)); } });
    maxH = Math.min(24, Math.max(maxH, minH + 1));

    const knopf = (x, stil, kurz) => {
      const wer = x.k.e ? name(x.k.e) : '';
      // Kurze Termine (unter 50 Minuten) im Raster einzeilig: Uhrzeit und Titel nebeneinander
      if (kurz) return `<button class="kal-ev kurz${x.k.e ? ' ok' : ''}" data-ev="${esc(x.ev.id)}" style="${stil}" title="${esc(hm(x.z.s) + ' bis ' + hm(x.z.e) + ' ' + (x.ev.summary || ''))}"><b>${hm(x.z.s)} ${esc(wer || x.ev.summary || '(ohne Titel)')}</b></button>`;
      return `<button class="kal-ev${x.k.e ? ' ok' : ''}" data-ev="${esc(x.ev.id)}"${stil ? ` style="${stil}"` : ''}>
        <span class="kal-t">${x.z.ganz ? 'ganztägig' : hm(x.z.s) + ' bis ' + hm(x.z.e)}</span>
        <b>${esc(x.ev.summary || '(ohne Titel)')}</b>${wer ? `<span class="kal-k">Akte: ${esc(wer)}</span>` : ''}</button>`;
    };
    const proTag = t => items.filter(x => x.z.ganz ? (x.z.s <= t && x.z.e > t) : dkey(x.z.s) === dkey(t)).sort((a, b) => a.z.s - b.z.s);

    // Wochenansicht (Notebook, iPad quer) und Liste (iPhone, iPad hoch)
    const raster = `<div class="panel kal-grid" style="--h:${PX}px">
      <div class="kal-kopf"><span></span>${tage.map(t => { const n = proTag(t).length; return `<span class="${dkey(t) === heute ? 'heute' : ''}">${esc(t.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', ''))}<b>${t.getDate()}</b><em class="kal-anz${n ? '' : ' frei'}">${n ? n + (n === 1 ? ' Termin' : ' Termine') : 'frei'}</em></span>`; }).join('')}</div>
      ${items.some(x => x.z.ganz) ? `<div class="kal-ganz"><span class="kal-std">ganz&shy;tägig</span>${tage.map(t => `<div>${proTag(t).filter(x => x.z.ganz).map(x => knopf(x)).join('')}</div>`).join('')}</div>` : ''}
      <div class="kal-tage" style="height:${(maxH - minH) * PX}px">
        <div class="kal-zeiten">${[...Array(maxH - minH)].map((_, i) => `<span style="top:${i * PX}px">${pad(minH + i)}:00</span>`).join('')}</div>
        ${tage.map(t => `<div class="kal-tag${dkey(t) === heute ? ' heute' : ''}">${proTag(t).filter(x => !x.z.ganz).map(x => {
          const top = ((x.z.s.getHours() + x.z.s.getMinutes() / 60) - minH) * PX;
          const h = Math.max(24, (x.z.e - x.z.s) / 36e5 * PX - 2);
          return knopf(x, `top:${top}px;height:${h}px`, (x.z.e - x.z.s) < 50 * 6e4);
        }).join('')}${dkey(t) === heute ? `<i class="kal-jetzt" style="top:${((new Date().getHours() + new Date().getMinutes() / 60) - minH) * PX}px"></i>` : ''}</div>`).join('')}
      </div></div>`;
    const liste = `<div class="kal-liste">${tage.map(t => { const l = proTag(t); return `<div class="panel card${dkey(t) === heute ? ' heute' : ''}">
        <div class="row between"><span class="label">${esc(t.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }))}${dkey(t) === heute ? ' · heute' : ''}</span><em class="kal-anz${l.length ? '' : ' frei'}">${l.length ? l.length + (l.length === 1 ? ' Termin' : ' Termine') : 'frei'}</em></div>
        ${l.length ? l.map(x => knopf(x)).join('') : ''}</div>`; }).join('')}</div>`;
    el.querySelector('#kalBody').innerHTML = (items.length ? '' : '<p class="cmeta">In dieser Woche stehen keine Termine im Google Kalender.</p>') + raster + liste;

    el.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => { gewaehlt = b.dataset.ev; detail(items.find(x => x.ev.id === gewaehlt)); });
    if (gewaehlt) detail(items.find(x => x.ev.id === gewaehlt));
  }

  // Karte zum angetippten Termin: Akte öffnen oder neue Kundin mit den Angaben aus der Buchung anlegen
  function detail(x) {
    const d = document.getElementById('kalDetail');
    if (!d) return;
    if (!x) { d.innerHTML = ''; return; }
    const link = sicherLink(x.ev.htmlLink);
    const [vn, ...nn] = (x.k.gastName || '').split(/\s+/);
    d.innerHTML = `<div class="panel card kal-det">
      <div class="row between"><div><span class="label">${esc(x.z.s.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }))}${x.z.ganz ? '' : ' · ' + hm(x.z.s) + ' bis ' + hm(x.z.e)}</span><h2>${esc(x.ev.summary || '(ohne Titel)')}</h2></div>
        <button class="btn ghost small" id="kalZu">Schließen</button></div>
      ${x.k.mail ? `<p class="cmeta" style="margin:4px 0 0">Gebucht von ${esc(x.k.gastName || '')} ${esc(x.k.mail)}</p>` : ''}
      <div class="row" style="margin-top:12px;flex-wrap:wrap">
        ${x.k.e ? `<button class="btn small" id="kalAkte">Akte von ${esc(name(x.k.e))} öffnen</button>`
          : `<button class="btn small" id="kalNeu">Als Kundin anlegen</button><span class="cmeta">Noch keiner Akte zugeordnet.</span>`}
        ${link ? `<a class="btn ghost small" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Im Google Kalender öffnen</a>` : ''}
      </div></div>`;
    d.querySelector('#kalZu').onclick = () => { gewaehlt = null; d.innerHTML = ''; };
    const a = d.querySelector('#kalAkte'); if (a) a.onclick = () => FCC.openCustomer(x.k.e.id);
    const n = d.querySelector('#kalNeu'); if (n) n.onclick = () => FCC.newCustomer && FCC.newCustomer({ vorname: vn || '', nachname: nn.join(' '), email: x.k.mail || '' });
    d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Karte „Heute im Studio“ für die Übersicht
  FCC.heuteKarte = async slot => {
    if (!slot || !window.Store || !Store.termine) return;
    const von = new Date(); von.setHours(0, 0, 0, 0);
    const bis = new Date(von.getTime() + DAY);
    let l;
    try { l = (await laden(von, bis)).map(ev => ({ ev, z: zeit(ev), k: zuordnen(ev) })).sort((a, b) => a.z.s - b.z.s); }
    catch (err) { slot.innerHTML = ''; return; }
    if (!slot.isConnected) return;
    slot.innerHTML = `<div class="panel card">
      <div class="row between"><button class="htap" id="heuteKal"><h2>Heute im Studio ›</h2></button><span class="label">${l.length} ${l.length === 1 ? 'Termin' : 'Termine'}</span></div>
      ${l.length ? `<ul class="todo">${l.map(x => `<li><span class="kal-uhr">${x.z.ganz ? 'ganzt.' : hm(x.z.s)}</span>${x.k.e
        ? `<button class="who" data-hk="${esc(x.k.e.id)}"><b>${esc(name(x.k.e))}</b><span class="cmeta">${esc(x.ev.summary || '')}</span></button>`
        : `<button class="who" data-hkal="1"><b>${esc(x.ev.summary || '(ohne Titel)')}</b><span class="cmeta">${x.k.mail ? 'Neue Buchung, noch keine Akte' : 'Termin'}</span></button>`}</li>`).join('')}</ul>`
        : '<p class="cmeta" style="margin-top:10px">Heute stehen keine Termine im Google Kalender.</p>'}
    </div>`;
    slot.querySelector('#heuteKal').onclick = () => FCC.show('kalender');
    slot.querySelectorAll('[data-hkal]').forEach(b => b.onclick = () => { woche = montag(new Date()); FCC.show('kalender'); });
    slot.querySelectorAll('[data-hk]').forEach(b => b.onclick = () => FCC.openCustomer(b.dataset.hk));
  };

  const st = document.createElement('style');
  st.textContent = `
    .kal-nav{gap:8px;margin:4px 0 14px;flex-wrap:wrap}.kal-nav .iconbtn{font-size:20px;line-height:1}.kal-range{font-weight:500;margin-left:6px}
    .kal-grid{padding:0;overflow:hidden}
    .kal-kopf,.kal-ganz,.kal-tage{display:grid;grid-template-columns:52px repeat(7,minmax(0,1fr))}
    .kal-kopf span{text-align:center;padding:10px 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)}
    .kal-kopf b{display:block;font-family:var(--display);font-size:22px;letter-spacing:0;color:var(--ink);font-weight:600}
    .kal-kopf .heute b{color:var(--paper);background:var(--rose);border-radius:50%;width:36px;height:36px;line-height:36px;margin:2px auto 0}
    .kal-ganz{border-bottom:1px solid var(--line)}.kal-ganz>div{padding:4px;border-left:1px solid var(--line);display:flex;flex-direction:column;gap:4px}
    .kal-std{font-size:11px;color:var(--muted);padding:6px 4px;text-align:right}
    .kal-tage{position:relative}
    .kal-zeiten{position:relative}.kal-zeiten span{position:absolute;right:8px;font-size:11px;color:var(--muted);transform:translateY(-1px)}
    .kal-tag{position:relative;border-left:1px solid var(--line);background-image:linear-gradient(var(--line) 1px,transparent 1px);background-size:100% var(--h)}
    .kal-tag.heute{background-color:color-mix(in srgb,var(--rose-soft) 70%,transparent)}
    .kal-anz{display:block;font-style:normal;font-size:10.5px;letter-spacing:.04em;text-transform:none;margin-top:3px;color:var(--rose-ink);font-weight:600}
    .kal-anz.frei{color:var(--ok);font-weight:500}
    .kal-leg{display:inline-flex;align-items:center;gap:6px 10px;flex-wrap:wrap;margin-left:auto;font-size:12.5px;color:var(--muted)}
    .kal-leg i{width:14px;height:14px;border-radius:4px;display:inline-block;margin-left:6px}
    .kal-f-ok{background:#a9725e}.kal-f-term{background:#4a3c34}.kal-f-frei{background:var(--paper);border:1px solid var(--line)}
    .kal-tag .kal-ev{position:absolute;left:3px;right:3px;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-start}
    /* Termine als kräftige, volle Blöcke: auf einen Blick sichtbar, wann belegt und wann frei ist */
    .kal-ev{display:block;width:100%;text-align:left;border:0;background:#4a3c34;border-radius:8px;padding:5px 8px;font:inherit;font-size:12.5px;line-height:1.3;color:#fff;cursor:pointer;margin-top:8px;box-shadow:0 1px 3px rgba(30,20,15,.25)}
    .kal-tag .kal-ev{margin:0}
    .kal-ev.kurz{padding:3px 8px;justify-content:center!important}.kal-ev.kurz b{white-space:nowrap;font-size:12px}
    .kal-ev.ok{background:#a9725e}
    .kal-ev:hover{filter:brightness(1.08)}
    .kal-ev:focus-visible{outline:2px solid var(--ink);outline-offset:1px}
    .kal-ev b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis}
    .kal-t,.kal-k{display:block;font-size:11px;color:rgba(255,255,255,.85)}.kal-k{color:#fff;font-weight:500}
    .kal-jetzt{position:absolute;left:0;right:0;height:2px;background:var(--bad);pointer-events:none}
    .kal-liste{display:none;flex-direction:column;gap:10px}.kal-liste .heute{border-color:var(--rose)}
    .kal-det{margin-bottom:12px;border-color:var(--rose)}
    .kal-uhr{font-variant-numeric:tabular-nums;color:var(--muted);font-size:13.5px;min-width:46px;padding-top:2px}
    @media(max-width:900px){.kal-grid{display:none}.kal-liste{display:flex}}
    @media(max-width:820px){.modnav{gap:0;padding-left:4px;padding-right:4px}.modnav button{min-width:0;padding:6px 1px;font-size:10.5px}.modnav button span{white-space:normal;line-height:1.15;text-align:center;-webkit-hyphens:auto;hyphens:auto;overflow-wrap:anywhere;max-width:100%}}`;
  document.head.append(st);

  FCC.register && FCC.register({
    id: 'kalender', titel: 'Kalender', el: 'mod-kalender', order: 1.5, render,
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'
  });
})();
