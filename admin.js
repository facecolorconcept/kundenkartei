// Modul „Administration“: Material-Bibliothek, Mail-Texte und Sicherung.
// Material und Texte liegen als JSON im Drive-Ordner „Administration“ (nie als Kundinnen-Akte gelesen).
// Die Sicherung lädt alle Dateien der Kartei aus Drive, packt sie in eine ZIP-Datei und verschlüsselt sie
// im Browser mit deinem Passwort (AES-256-GCM, Schlüssel aus PBKDF2 mit 600.000 Runden).
// Heraus kommt eine einzige HTML-Datei: Doppelklick, Passwort eingeben, ZIP herunterladen. Ohne Passwort ist sie unlesbar.
(function () {
  'use strict';
  const FCC = window.FCC = window.FCC || {};
  const C = window.FCC_CONFIG || {};
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const p2 = n => String(n).padStart(2, '0');
  const heute = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
  const fmt = d => d ? String(d).slice(0, 10).split('-').reverse().join('.') : '–';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const toast = (m, l) => FCC.toast && FCC.toast(m, l);
  const groesse = b => b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

  // ---------- Material-Bibliothek ----------
  // pigmente: { id, name, marke, farbe (#hex), bereich, charge, ablauf (JJJJ-MM), fav, aus }
  // geraete:  { id, name, typ, hub, einstellung, fav, aus }
  // nadeln:   { id, name, art (Nadel | Modul), konfig, durchmesser, fav, aus }
  const LEER = { pigmente: [], geraete: [], nadeln: [] };
  let MAT = null;
  FCC.materialLaden = async (neu) => {
    if (MAT && !neu) return MAT;
    try { MAT = Object.assign(JSON.parse(JSON.stringify(LEER)), (Store.adminLesen && await Store.adminLesen('material.json', LEER)) || {}); }
    catch (e) { MAT = JSON.parse(JSON.stringify(LEER)); }
    return MAT;
  };
  FCC.material = () => MAT || LEER;
  const matSpeichern = async () => { await Store.adminSchreiben('material.json', MAT); };
  // Ablauf (JJJJ-MM) als letzter Tag des Monats, damit „Haltbar bis“ im Bogen ein Datum hat
  const ablaufTag = a => { if (!/^\d{4}-\d{2}$/.test(a || '')) return /^\d{4}-\d{2}-\d{2}$/.test(a || '') ? a : ''; const [y, m] = a.split('-').map(Number); return `${y}-${p2(m)}-${p2(new Date(y, m, 0).getDate())}`; };
  FCC.ablaufTag = ablaufTag;
  const abgelaufen = (a, am) => { const t = ablaufTag(a); return !!t && t < (am || heute()); };
  FCC.pigmentText = p => [p.marke, p.name].filter(Boolean).join(' ');

  const BEREICHE = ['Augenbrauen', 'Lippen', 'Lidstrich', 'Alle'];
  const TABS = [
    { k: 'pigmente', l: 'Pigmente', spalten: [['name', 'Name'], ['marke', 'Marke'], ['bereich', 'Bereich'], ['charge', 'Charge'], ['ablauf', 'Ablauf']],
      felder: [['name', 'Name', 'z. B. Soft Brown'], ['marke', 'Marke', 'Hersteller'], ['farbe', 'Farbe', '', 'color'], ['bereich', 'Bereich', '', 'bereich'], ['charge', 'Charge (Lot)', 'steht auf der Flasche'], ['ablauf', 'Haltbar bis', '', 'month']] },
    { k: 'geraete', l: 'Geräte', spalten: [['name', 'Name'], ['typ', 'Typ'], ['hub', 'Hub'], ['einstellung', 'Standard-Einstellung']],
      felder: [['name', 'Name', 'z. B. Maschine 1'], ['typ', 'Typ', 'z. B. Rotary Pen'], ['hub', 'Hub', 'z. B. 3,5 mm'], ['einstellung', 'Standard-Einstellung', 'z. B. 8,5 V · 105 Hz']] },
    { k: 'nadeln', l: 'Nadeln & Module', spalten: [['name', 'Name'], ['art', 'Art'], ['konfig', 'Konfiguration'], ['durchmesser', 'Durchmesser']],
      felder: [['name', 'Name', 'z. B. 1RL 0,30'], ['art', 'Art', '', 'art'], ['konfig', 'Konfiguration', 'z. B. 1RL'], ['durchmesser', 'Durchmesser', 'z. B. 0,30 mm']] }
  ];

  const st = { teil: null, tab: 'pigmente', such: '', sort: 'name', dir: 1, edit: null, aus: false, sicherung: null };

  // Behandlungen mit einer bestimmten Charge (für Rückrufe des Herstellers)
  const mitCharge = ch => e => (e.b || []).some(b => String((b.r || {}).ch || '').split(', ').some(x => x.trim().toLowerCase() === String(ch).trim().toLowerCase()));

  function materialHtml() {
    const T = TABS.find(t => t.k === st.tab);
    const q = st.such.toLowerCase().trim();
    const alle = (MAT[st.tab] || []);
    let l = alle.filter(x => (st.aus ? true : !x.aus) && (!q || T.spalten.some(([k]) => String(x[k] || '').toLowerCase().includes(q))));
    l.sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || String(a[st.sort] || '').localeCompare(String(b[st.sort] || ''), 'de', { numeric: true }) * st.dir);
    const kunden = Store.list ? Store.list(true) : [];
    const zelle = (x, k) => {
      if (k === 'name' && st.tab === 'pigmente') return `<span class="ad-farbe" style="background:${/^#[0-9a-f]{6}$/i.test(x.farbe || '') ? x.farbe : 'transparent'}"></span>${esc(x.name)}`;
      if (k === 'ablauf') return x.ablauf ? `<span class="${abgelaufen(x.ablauf) ? 'ad-warn' : ''}">${esc(x.ablauf.split('-').reverse().join('/'))}${abgelaufen(x.ablauf) ? ' abgelaufen' : ''}</span>` : '–';
      return esc(x[k] || '–');
    };
    const form = st.edit ? (() => {
      const x = st.edit;
      return `<div class="panel card ad-form"><h3>${x.id ? 'Ändern' : 'Hinzufügen'} · ${esc(T.l)}</h3><div class="grid2">${T.felder.map(([k, l, ph, typ]) => {
        if (typ === 'bereich') return `<div class="field"><label for="adf-${k}">${esc(l)}</label><select id="adf-${k}" data-af="${k}">${BEREICHE.map(b => `<option ${x[k] === b ? 'selected' : ''}>${b}</option>`).join('')}</select></div>`;
        if (typ === 'art') return `<div class="field"><label for="adf-${k}">${esc(l)}</label><select id="adf-${k}" data-af="${k}">${['Nadel', 'Modul'].map(b => `<option ${x[k] === b ? 'selected' : ''}>${b}</option>`).join('')}</select></div>`;
        return `<div class="field"><label for="adf-${k}">${esc(l)}</label><input id="adf-${k}" data-af="${k}" type="${typ || 'text'}" placeholder="${esc(ph || '')}" value="${esc(x[k] || (typ === 'color' ? '#7d5c47' : ''))}"></div>`;
      }).join('')}</div>
      <div class="row" style="margin-top:14px"><button class="btn small" id="adSave">Speichern</button><button class="btn ghost small" id="adAbbr">Abbrechen</button>
      ${x.id ? `<button class="btn ghost small" id="adAus" style="margin-left:auto">${x.aus ? 'Wieder aktiv' : 'Aufgebraucht / nicht mehr nutzen'}</button>` : ''}</div></div>`;
    })() : '';
    return `<div class="panel card">
      <div class="row between"><div class="seg" role="group" aria-label="Material">${TABS.map(t => `<button type="button" data-mtab="${t.k}" aria-pressed="${t.k === st.tab}">${esc(t.l)}</button>`).join('')}</div>
        <button class="btn small" id="adNeu">+ ${st.tab === 'pigmente' ? 'Pigment' : st.tab === 'geraete' ? 'Gerät' : 'Nadel oder Modul'}</button></div>
      <p class="cmeta" style="margin:10px 0 0">Einmal anlegen, im Behandlungsbogen nur noch antippen.${st.tab === 'pigmente' ? ' Pro Flasche mit eigener Charge ein Eintrag: So findest du bei einem Rückruf sofort alle Kundinnen.' : ''}</p>
      ${form}
      <div class="row" style="margin-top:12px"><input class="search" id="adSuch" type="search" placeholder="Suchen in ${esc(T.l)}" value="${esc(st.such)}" style="flex:1;min-width:180px">
        <label class="cmeta" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="adAusZ" ${st.aus ? 'checked' : ''}> auch aufgebrauchte</label></div>
      ${l.length ? `<div class="ad-tabwrap"><table class="ktab ad-tab"><thead><tr><th></th>${T.spalten.map(([k, l]) => `<th><button type="button" data-msort="${k}">${esc(l)}${st.sort === k ? (st.dir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`).join('')}${st.tab === 'pigmente' ? '<th>Kundinnen</th>' : ''}<th></th></tr></thead>
        <tbody>${l.map(x => `<tr class="${x.aus ? 'ad-aus' : ''}"><td><button type="button" class="ad-stern ${x.fav ? 'on' : ''}" data-fav="${esc(x.id)}" aria-label="${x.fav ? 'Favorit entfernen' : 'Als Favorit oben anzeigen'}" aria-pressed="${!!x.fav}">★</button></td>
          ${T.spalten.map(([k]) => `<td>${zelle(x, k)}</td>`).join('')}
          ${st.tab === 'pigmente' ? `<td>${x.charge ? (() => { const n = kunden.filter(mitCharge(x.charge)).length; return `<button type="button" class="ad-link" data-charge="${esc(x.charge)}" ${n ? '' : 'disabled'}>${n} ${n === 1 ? 'Kundin' : 'Kundinnen'}</button>`; })() : '–'}</td>` : ''}
          <td><button type="button" class="btn ghost small" data-medit="${esc(x.id)}">Ändern</button></td></tr>`).join('')}</tbody></table></div>`
        : `<p class="empty">${alle.length ? 'Nichts gefunden.' : 'Noch nichts angelegt. Tippe oben auf „+“.'}</p>`}
    </div>`;
  }

  // ---------- Mail-Texte ----------
  let texteEdit = null;
  function texteHtml() {
    const T = FCC.mailTexte; if (!T) return '';
    const gruppen = ['Pflegehinweise', 'Erinnerungen'];
    return gruppen.map(g => `<div class="panel card"><h2>${esc(g)}</h2>
      <p class="cmeta" style="margin:6px 0 0">${g === 'Pflegehinweise' ? 'Gehen nach der Behandlung an die Kundin. Ein Tipp in der Akte genügt.' : 'Gehen nur an Kundinnen, die Erinnerungen per E-Mail erlaubt haben. Die Zeile zum Abmelden hängt die Kartei selbst an.'}
      Platzhalter: {vorname}, {datum}, {kati}, {studio}, {adresse}, {telefon}, {web}, {buchung}.</p>
      ${Object.entries(T.standard).filter(([, v]) => v.gruppe === g).map(([k, v]) => {
        const e = Object.assign({}, v, (texteEdit || {})[k] || {}); const geaendert = !!(texteEdit || {})[k];
        return `<details class="ad-text"><summary><b>${esc(v.l)}</b>${geaendert ? ' <span class="pill ok">angepasst</span>' : ''}</summary>
          ${v.tipp ? `<p class="cmeta">${esc(v.tipp)}</p>` : ''}
          <div class="field" style="margin-top:8px"><label>Betreff</label><input data-tb="${k}" value="${esc(e.betreff)}"></div>
          <div class="field" style="margin-top:8px"><label>Text</label><textarea data-tt="${k}" rows="14">${esc(e.text)}</textarea></div>
          <div class="row" style="margin-top:8px"><button class="btn small" data-tsave="${k}">Speichern</button>${geaendert ? `<button class="btn ghost small" data-treset="${k}">Standardtext wiederherstellen</button>` : ''}</div>
        </details>`;
      }).join('')}</div>`).join('');
  }

  // ---------- Sicherung ----------
  // CRC-32 für die ZIP-Datei
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  // ZIP ohne Komprimierung (Fotos und PDFs sind schon komprimiert), Dateinamen in UTF-8
  function zip(dateien) {
    const enc = new TextEncoder(); const teile = []; const zentral = []; let pos = 0;
    const d = new Date(); const zeit = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1); const datum = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const f of dateien) {
      const name = enc.encode(f.pfad); const daten = f.daten; const crc = crc32(daten);
      const k = new DataView(new ArrayBuffer(30));
      k.setUint32(0, 0x04034b50, true); k.setUint16(4, 20, true); k.setUint16(6, 0x0800, true); k.setUint16(8, 0, true);
      k.setUint16(10, zeit, true); k.setUint16(12, datum, true); k.setUint32(14, crc, true); k.setUint32(18, daten.length, true); k.setUint32(22, daten.length, true);
      k.setUint16(26, name.length, true); k.setUint16(28, 0, true);
      teile.push(new Uint8Array(k.buffer), name, daten);
      const z = new DataView(new ArrayBuffer(46));
      z.setUint32(0, 0x02014b50, true); z.setUint16(4, 20, true); z.setUint16(6, 20, true); z.setUint16(8, 0x0800, true); z.setUint16(10, 0, true);
      z.setUint16(12, zeit, true); z.setUint16(14, datum, true); z.setUint32(16, crc, true); z.setUint32(20, daten.length, true); z.setUint32(24, daten.length, true);
      z.setUint16(28, name.length, true); z.setUint32(42, pos, true);
      zentral.push(new Uint8Array(z.buffer), name);
      pos += 30 + name.length + daten.length;
    }
    const zl = zentral.reduce((a, b) => a + b.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, dateien.length, true); e.setUint16(10, dateien.length, true); e.setUint32(12, zl, true); e.setUint32(16, pos, true);
    return new Blob([...teile, ...zentral, new Uint8Array(e.buffer)], { type: 'application/zip' });
  }
  const ITER = 600000;
  async function schluessel(pw, salt) {
    const basis = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, basis, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  // Seite zum Entschlüsseln: läuft ohne Internet in jedem Browser (Chrome, Safari, Edge, Firefox)
  function entschluesselSeite(meta, daten) {
    const js = `(function(){
var M=${JSON.stringify(meta)};
function u8(b){var s=atob(b),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;}
var f=document.getElementById('f'),pw=document.getElementById('pw'),m=document.getElementById('m'),btn=document.getElementById('los');
f.onsubmit=async function(e){e.preventDefault();m.textContent='Entschlüssele … (dauert einige Sekunden)';btn.disabled=true;
try{var basis=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw.value),'PBKDF2',false,['deriveKey']);
var k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:u8(M.salt),iterations:M.iter,hash:'SHA-256'},basis,{name:'AES-GCM',length:256},false,['decrypt']);
var roh=await crypto.subtle.decrypt({name:'AES-GCM',iv:u8(M.iv)},k,u8(document.getElementById('d').textContent.trim()));
var url=URL.createObjectURL(new Blob([roh],{type:'application/zip'}));var a=document.createElement('a');a.href=url;a.download=M.datei;a.textContent='ZIP-Datei speichern ('+M.datei+')';
m.textContent='Richtiges Passwort. ';m.appendChild(a);a.click();}
catch(x){m.textContent='Das Passwort stimmt nicht oder die Datei ist beschädigt.';}btn.disabled=false;};})();`;
    return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:">
<meta name="robots" content="noindex"><title>Sicherung ${esc(meta.studio)} vom ${esc(fmt(meta.datum))}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#f6f3f1;color:#2b2522;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px}
main{background:#fffdfb;border:1px solid #e7dfda;border-radius:16px;padding:28px;max-width:460px;width:100%}h1{font-family:Georgia,serif;font-weight:500;margin:0 0 6px}p{color:#776b65;line-height:1.5}
input{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e7dfda;border-radius:10px;font-size:16px;margin:8px 0 12px}button{background:#a9725e;color:#fff;border:0;border-radius:99px;padding:12px 22px;font-size:16px;cursor:pointer}
#m{margin-top:14px;color:#2b2522}#m a{color:#85543f;font-weight:600}</style></head><body><main>
<h1>Sicherung ${esc(meta.studio)}</h1><p>Erstellt am ${esc(fmt(meta.datum))} · ${meta.anzahl} Dateien · ${esc(groesse(meta.bytes))}.<br>Diese Datei ist verschlüsselt. Gib dein Sicherungs-Passwort ein, dann speichert der Browser eine ZIP-Datei mit allen Akten, Fotos und Dokumenten.</p>
<form id="f"><label for="pw">Passwort</label><input id="pw" type="password" autocomplete="off" required><button id="los" type="submit">Entschlüsseln</button></form><div id="m" role="status"></div>
<p style="font-size:13px;margin-top:18px">Alles passiert auf diesem Gerät, nichts wird hochgeladen. Funktioniert ohne Internet.</p></main>
<script type="application/octet-stream" id="d">${daten}</script><script>${js}</script></body></html>`;
  }

  async function sicherungErstellen(pw, melde) {
    melde('Suche alle Dateien in Google Drive …');
    const liste = await Store.alleDateien(n => melde(`Suche alle Dateien in Google Drive … ${n} gefunden`));
    const dateien = []; let bytes = 0; const fehler = [];
    for (let i = 0; i < liste.length; i++) {
      const f = liste[i];
      melde(`Lade Datei ${i + 1} von ${liste.length} (${groesse(bytes)}) …`);
      try { const d = await Store.dateiLaden(f); dateien.push({ pfad: f.pfad, daten: d }); bytes += d.length; }
      catch (e) { fehler.push(f.pfad + ': ' + e.message); }
    }
    const info = [`Sicherung ${C.STUDIO || 'Facecolorconcept'} vom ${fmt(heute())}`, '',
      `${dateien.length} Dateien aus dem Google-Drive-Ordner der Kundenkartei.`,
      'Je Kundin ein Ordner mit kundin.json (alle Angaben und Behandlungsbögen), fotos/ und dokumente/ (unterschriebene Formulare als PDF).',
      '_verzeichnis.json ist die Kurzliste aller Kundinnen. Administration/ enthält Material, Mail-Texte und Anzahlungen.',
      '', 'Zurückspielen: Die Ordner wieder in den Kartei-Ordner in Google Drive hochladen und in der Kartei oben auf „Aktualisieren“ tippen.',
      ...(fehler.length ? ['', 'Nicht gesichert (Fehler beim Laden):', ...fehler] : [])].join('\n');
    dateien.unshift({ pfad: 'LIESMICH.txt', daten: new TextEncoder().encode(info) });
    melde('Packe die ZIP-Datei …');
    const roh = new Uint8Array(await zip(dateien).arrayBuffer());
    melde('Verschlüssele mit deinem Passwort …');
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const k = await schluessel(pw, salt);
    const geheim = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, roh));
    const name = `Facecolorconcept-Sicherung-${heute()}`;
    const meta = { v: 1, studio: C.STUDIO || 'Facecolorconcept', datum: heute(), anzahl: dateien.length, bytes: roh.length, salt: b64(salt), iv: b64(iv), iter: ITER, datei: name + '.zip' };
    melde('Erstelle die Sicherungsdatei …');
    const html = new Blob([entschluesselSeite(meta, b64(geheim))], { type: 'text/html' });
    return { html, name: name + '.html', meta, fehler };
  }
  // Sicherung prüfen: Datei wählen, Passwort eingeben, Inhalt zählen
  async function sicherungPruefen(datei, pw) {
    const t = await datei.text();
    const mm = /var M=(\{[^\n]*\});/.exec(t), dd = /<script type="application\/octet-stream" id="d">([^<]*)<\/script>/.exec(t);
    if (!mm || !dd) throw new Error('Das ist keine Sicherungsdatei der Kartei.');
    const meta = JSON.parse(mm[1]);
    const u8 = b => { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
    const k = await schluessel(pw, u8(meta.salt));
    let roh;
    try { roh = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8(meta.iv) }, k, u8(dd[1].trim()))); }
    catch (e) { throw new Error('Das Passwort stimmt nicht oder die Datei ist beschädigt.'); }
    // Einträge im Inhaltsverzeichnis der ZIP-Datei zählen
    const dv = new DataView(roh.buffer); let n = 0, akten = 0, fotos = 0;
    const end = roh.length - 22; if (dv.getUint32(end, true) !== 0x06054b50) throw new Error('Die ZIP-Datei in der Sicherung ist unvollständig.');
    let p = dv.getUint32(end + 16, true); const dec = new TextDecoder();
    while (p < end && dv.getUint32(p, true) === 0x02014b50) {
      const nl = dv.getUint16(p + 28, true); const name = dec.decode(roh.subarray(p + 46, p + 46 + nl));
      n++; if (/(^|\/)kundin\.json$/.test(name)) akten++; if (/\/fotos\//.test(name)) fotos++;
      p += 46 + nl + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
    }
    return { meta, n, akten, fotos, zip: new Blob([roh], { type: 'application/zip' }) };
  }
  // Wie stark ist das Passwort? (grob, nur als Hinweis)
  function staerke(pw) {
    let p = 0; if (pw.length >= 10) p++; if (pw.length >= 14) p++; if (/[a-zäöü]/.test(pw) && /[A-ZÄÖÜ]/.test(pw)) p++; if (/\d/.test(pw)) p++; if (/[^\wäöüÄÖÜß]/.test(pw)) p++;
    return pw.length < 10 ? { t: 'zu kurz, mindestens 10 Zeichen', k: 'fehlt' } : p <= 2 ? { t: 'geht, länger wäre besser', k: 'alt' } : { t: 'gut', k: 'ok' };
  }
  let einst = null;
  async function einstellungen() { if (!einst) { try { einst = await Store.adminLesen('einstellungen.json', {}) || {}; } catch (e) { einst = {}; } } return einst; }
  FCC.letzteSicherung = () => (einst || {}).letzteSicherung || '';
  FCC.einstellungenLaden = einstellungen;

  function sicherungHtml() {
    const e = einst || {}; const s = st.sicherung || {};
    const tage = e.letzteSicherung ? Math.floor((Date.now() - new Date(e.letzteSicherung + 'T12:00')) / 864e5) : null;
    return `<div class="panel card">
      <h2>Komplette Sicherung</h2>
      <div class="kv" style="margin-top:12px"><div><span class="label">Letzte Sicherung</span><b class="${tage == null || tage > 30 ? 'ad-warn' : ''}">${e.letzteSicherung ? fmt(e.letzteSicherung) + (tage ? ` · vor ${tage} ${tage === 1 ? 'Tag' : 'Tagen'}` : ' · heute') : 'noch keine'}</b></div>
        ${e.letzteSicherungInfo ? `<div><span class="label">Umfang</span><b>${esc(e.letzteSicherungInfo)}</b></div>` : ''}</div>
      <p style="margin:14px 0 0">Die Sicherung enthält alle Akten, Behandlungsbögen, Fotos, unterschriebenen Formulare, dein Material und deine Mail-Texte. Sie landet als <b>eine verschlüsselte Datei</b> auf deinem Rechner. Öffnen kann sie nur, wer das Passwort kennt.</p>
      <ol class="ad-schritte"><li>Passwort ausdenken und zweimal eintippen. <b>Schreib es auf Papier</b> und leg es an einen sicheren Ort. Ohne Passwort ist die Sicherung verloren, auch ich kann sie dann nicht öffnen.</li>
        <li>Auf <b>Sicherung erstellen</b> tippen. Je nach Anzahl der Fotos dauert das ein bis fünf Minuten. Am besten am Notebook.</li>
        <li>Die Datei aus „Downloads“ in einen festen Ordner legen, zum Beispiel <b>Dokumente/Sicherungen</b>, und zusätzlich auf einen USB-Stick.</li></ol>
      <div class="grid2" style="margin-top:12px">
        <div class="field"><label for="adPw1">Passwort</label><input id="adPw1" type="password" autocomplete="new-password" ${s.laeuft ? 'disabled' : ''}></div>
        <div class="field"><label for="adPw2">Passwort wiederholen</label><input id="adPw2" type="password" autocomplete="new-password" ${s.laeuft ? 'disabled' : ''}></div>
      </div>
      <p class="cmeta" id="adPwInfo" style="margin:6px 0 0">Mindestens 10 Zeichen. Ein Satz aus vier Wörtern ist gut zu merken und sicher.</p>
      <div class="row" style="margin-top:12px"><button class="btn" id="adSich" ${s.laeuft ? 'disabled' : ''}>${s.laeuft ? 'Läuft …' : 'Sicherung erstellen'}</button></div>
      ${s.meldung ? `<p class="banner" role="status">${esc(s.meldung)}</p>` : ''}
      ${s.fertig ? `<div class="banner"><span><b>Fertig.</b> ${esc(s.fertig)}</span>${s.url ? `<a class="btn small" href="${s.url}" download="${esc(s.name)}">Noch einmal herunterladen</a>` : ''}</div>` : ''}
    </div>
    <div class="panel card">
      <h2>Sicherung prüfen</h2>
      <p class="cmeta" style="margin:6px 0 0">Ab und zu testen, ob sich eine Sicherung öffnen lässt. Die Datei bleibt dabei auf deinem Gerät.</p>
      <div class="grid2" style="margin-top:10px">
        <div class="field"><label for="adPrD">Sicherungsdatei (.html)</label><input id="adPrD" type="file" accept=".html,text/html"></div>
        <div class="field"><label for="adPrPw">Passwort</label><input id="adPrPw" type="password" autocomplete="off"></div>
      </div>
      <div class="row" style="margin-top:12px"><button class="btn ghost" id="adPr">Prüfen</button></div>
      ${s.pruef ? `<p class="banner" role="status">${s.pruef}</p>` : ''}
    </div>`;
  }

  // ---------- Bereich zeichnen ----------
  const KACHELN = [
    { k: 'sicherung', l: 'Sicherung', t: 'Alles verschlüsselt auf deinen Rechner', icon: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>' },
    { k: 'material', l: 'Material', t: 'Pigmente, Geräte, Nadeln', icon: '<path d="M9 3h6M10 3v4l-4 9a3 3 0 0 0 2.7 4.3h6.6A3 3 0 0 0 18 16l-4-9V3"/><path d="M7.5 13h9"/>' },
    { k: 'texte', l: 'Mail-Texte', t: 'Pflegehinweise und Erinnerungen', icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>' }
  ];
  async function render() {
    const el = document.getElementById('mod-admin');
    if (!el || !window.Store) return;
    await Promise.all([FCC.materialLaden(), einstellungen(), FCC.mailTexte ? FCC.mailTexte.laden().then(t => { if (!texteEdit) texteEdit = JSON.parse(JSON.stringify(t || {})); }) : null]);
    if (FCC.current && FCC.current() !== 'admin') return;
    const teil = st.teil;
    const tage = einst.letzteSicherung ? Math.floor((Date.now() - new Date(einst.letzteSicherung + 'T12:00')) / 864e5) : null;
    const zaehl = { sicherung: einst.letzteSicherung ? (tage > 30 ? 'älter als 30 Tage' : 'vom ' + fmt(einst.letzteSicherung)) : 'noch keine', material: `${MAT.pigmente.filter(x => !x.aus).length} Pigmente · ${MAT.geraete.filter(x => !x.aus).length} Geräte · ${MAT.nadeln.filter(x => !x.aus).length} Nadeln`, texte: `${Object.keys(texteEdit || {}).length} angepasst` };
    el.innerHTML = `
      <div class="hello"><div class="row" style="gap:8px"><h1>Administration</h1><button class="qhelp" data-hilfe="admin" aria-label="Hilfe zur Administration" title="Hilfe">?</button></div>
        <p>Einstellungen, die du selten brauchst. Tippe auf eine Kachel.</p></div>
      <div class="ad-kacheln">${KACHELN.map(k => `<button type="button" class="panel ad-kachel ${teil === k.k ? 'on' : ''}" data-teil="${k.k}" aria-expanded="${teil === k.k}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${k.icon}</svg>
        <b>${esc(k.l)}</b><span>${esc(k.t)}</span><em class="${k.k === 'sicherung' && (tage == null || tage > 30) ? 'ad-warn' : ''}">${esc(zaehl[k.k])}</em></button>`).join('')}</div>
      <div id="adTeil">${teil === 'material' ? materialHtml() : teil === 'texte' ? texteHtml() : teil === 'sicherung' ? sicherungHtml() : ''}</div>`;
    binden(el);
  }

  function binden(el) {
    const $ = s => el.querySelector(s), $$ = s => el.querySelectorAll(s);
    $$('[data-hilfe]').forEach(b => b.onclick = () => FCC.hilfe && FCC.hilfe(b.dataset.hilfe));
    $$('[data-teil]').forEach(b => b.onclick = () => { st.teil = st.teil === b.dataset.teil ? null : b.dataset.teil; st.edit = null; render(); });
    // Material
    $$('[data-mtab]').forEach(b => b.onclick = () => { st.tab = b.dataset.mtab; st.such = ''; st.sort = 'name'; st.dir = 1; st.edit = null; render(); });
    $$('[data-msort]').forEach(b => b.onclick = () => { const k = b.dataset.msort; if (st.sort === k) st.dir *= -1; else { st.sort = k; st.dir = 1; } render(); });
    const su = $('#adSuch'); if (su) su.oninput = () => { st.such = su.value; const pos = su.selectionStart; render().then(() => { const n = el.querySelector('#adSuch'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }); };
    const az = $('#adAusZ'); if (az) az.onchange = () => { st.aus = az.checked; render(); };
    const nb = $('#adNeu'); if (nb) nb.onclick = () => { st.edit = st.tab === 'pigmente' ? { bereich: 'Augenbrauen' } : st.tab === 'nadeln' ? { art: 'Nadel' } : {}; render().then(() => { const f = el.querySelector('[data-af]'); if (f) f.focus(); }); };
    $$('[data-medit]').forEach(b => b.onclick = () => { st.edit = JSON.parse(JSON.stringify(MAT[st.tab].find(x => x.id === b.dataset.medit))); render(); el.querySelector('.ad-form').scrollIntoView({ block: 'nearest' }); });
    const ab = $('#adAbbr'); if (ab) ab.onclick = () => { st.edit = null; render(); };
    const sv = $('#adSave'); if (sv) sv.onclick = async () => {
      const x = st.edit; el.querySelectorAll('[data-af]').forEach(i => { x[i.dataset.af] = i.value.trim(); });
      if (!x.name) { toast('Bitte einen Namen eintragen.'); return; }
      const liste = MAT[st.tab]; const vorher = JSON.parse(JSON.stringify(liste));
      if (x.id) { const i = liste.findIndex(y => y.id === x.id); liste[i] = x; } else { x.id = uid(); liste.push(x); }
      sv.disabled = true; sv.textContent = 'Speichert …';
      try { await matSpeichern(); st.edit = null; toast('Gespeichert'); } catch (e) { MAT[st.tab] = vorher; toast(e.message, true); }
      render();
    };
    const au = $('#adAus'); if (au) au.onclick = async () => {
      const x = MAT[st.tab].find(y => y.id === st.edit.id); if (!x) return;
      x.aus = x.aus ? '' : heute();
      try { await matSpeichern(); st.edit = null; toast(x.aus ? 'Als aufgebraucht markiert. Es bleibt für die Rückverfolgung gespeichert.' : 'Wieder aktiv'); } catch (e) { x.aus = x.aus ? '' : heute(); toast(e.message, true); }
      render();
    };
    $$('[data-fav]').forEach(b => b.onclick = async () => { const x = MAT[st.tab].find(y => y.id === b.dataset.fav); x.fav = !x.fav; try { await matSpeichern(); } catch (e) { x.fav = !x.fav; toast(e.message, true); } render(); });
    $$('[data-charge]').forEach(b => b.onclick = () => FCC.openList && FCC.openList('Charge ' + b.dataset.charge, mitCharge(b.dataset.charge), 'zuletzt'));
    // Mail-Texte
    $$('[data-tsave]').forEach(b => b.onclick = async () => {
      const k = b.dataset.tsave; const neu = { betreff: el.querySelector(`[data-tb="${k}"]`).value.trim(), text: el.querySelector(`[data-tt="${k}"]`).value };
      const std = FCC.mailTexte.standard[k];
      const t = JSON.parse(JSON.stringify(texteEdit || {}));
      if (neu.betreff === std.betreff && neu.text === std.text) delete t[k]; else t[k] = neu;
      b.disabled = true; b.textContent = 'Speichert …';
      try { await Store.adminSchreiben('texte.json', t); texteEdit = t; FCC.mailTexte.setzen(JSON.parse(JSON.stringify(t))); toast('Text gespeichert'); } catch (e) { toast(e.message, true); }
      render();
    });
    $$('[data-treset]').forEach(b => b.onclick = async () => {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Wirklich zurücksetzen?'; return; }
      const t = JSON.parse(JSON.stringify(texteEdit || {})); delete t[b.dataset.treset];
      try { await Store.adminSchreiben('texte.json', t); texteEdit = t; FCC.mailTexte.setzen(JSON.parse(JSON.stringify(t))); toast('Standardtext wiederhergestellt'); } catch (e) { toast(e.message, true); }
      render();
    });
    // Sicherung
    const p1 = $('#adPw1'), p2e = $('#adPw2'), info = $('#adPwInfo');
    if (p1) p1.oninput = () => { const s = staerke(p1.value); info.innerHTML = p1.value ? `Passwort: <span class="fo-st ${s.k}">${esc(s.t)}</span>` : 'Mindestens 10 Zeichen. Ein Satz aus vier Wörtern ist gut zu merken und sicher.'; };
    const si = $('#adSich'); if (si) si.onclick = async () => {
      const pw = p1.value;
      if (pw.length < 10) { toast('Das Passwort braucht mindestens 10 Zeichen.'); return; }
      if (pw !== p2e.value) { toast('Die beiden Passwörter sind nicht gleich.'); return; }
      const s = st.sicherung = { laeuft: true, meldung: 'Starte …' };
      const melde = m => { s.meldung = m; const b = el.querySelector('#adTeil .banner[role="status"]'); if (b) b.textContent = m; else render(); };
      render();
      try {
        const r = await sicherungErstellen(pw, melde);
        const url = URL.createObjectURL(r.html);
        const a = document.createElement('a'); a.href = url; a.download = r.name; document.body.append(a); a.click(); a.remove();
        einst.letzteSicherung = heute(); einst.letzteSicherungInfo = `${r.meta.anzahl} Dateien, ${groesse(r.meta.bytes)}`;
        try { await Store.adminSchreiben('einstellungen.json', einst); } catch (e) {}
        st.sicherung = { fertig: `${r.meta.anzahl} Dateien (${groesse(r.meta.bytes)}) gesichert als ${r.name}. Die Datei liegt in deinen Downloads.${r.fehler.length ? ' Achtung: ' + r.fehler.length + ' Dateien ließen sich nicht laden, sie stehen in der LIESMICH-Datei.' : ''}`, url, name: r.name };
      } catch (e) { st.sicherung = { meldung: 'Sicherung abgebrochen: ' + (e.message || e) }; }
      render();
      if (FCC.renderUebersicht) { /* Erinnerung auf der Übersicht verschwindet beim nächsten Öffnen */ }
    };
    const pr = $('#adPr'); if (pr) pr.onclick = async () => {
      const d = el.querySelector('#adPrD').files[0], pw = el.querySelector('#adPrPw').value;
      if (!d || !pw) { toast('Bitte Datei wählen und Passwort eintippen.'); return; }
      pr.disabled = true; pr.textContent = 'Prüft …';
      const s = st.sicherung = st.sicherung || {};
      try {
        const r = await sicherungPruefen(d, pw);
        const url = URL.createObjectURL(r.zip);
        s.pruef = `<span><b>Alles in Ordnung.</b> Sicherung vom ${esc(fmt(r.meta.datum))}: ${r.n} Dateien, davon ${r.akten} Akten und ${r.fotos} Fotos.</span><a class="btn small" href="${url}" download="${esc(r.meta.datei)}">ZIP speichern</a>`;
      } catch (e) { s.pruef = esc(e.message || e); }
      render();
    };
  }

  const css = document.createElement('style');
  css.textContent = `
    .ad-kacheln{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    @media(max-width:620px){.ad-kacheln{grid-template-columns:minmax(0,1fr)}}
    .ad-kachel{display:grid;grid-template-columns:44px minmax(0,1fr);grid-template-rows:auto auto auto;gap:2px 12px;text-align:left;padding:16px;font:inherit;color:inherit;cursor:pointer;transition:transform .15s,border-color .15s}
    .ad-kachel:hover{transform:translateY(-2px);border-color:var(--rose)}.ad-kachel.on{border-color:var(--rose);background:var(--rose-soft)}
    .ad-kachel svg{grid-row:1/4;width:36px;height:36px;color:var(--rose-ink);align-self:center}
    .ad-kachel b{font-family:var(--display);font-size:22px;font-weight:600;line-height:1.1}.ad-kachel span{font-size:13.5px;color:var(--muted)}
    .ad-kachel em{font-style:normal;font-size:12.5px;color:var(--rose-ink)}
    #adTeil{display:flex;flex-direction:column;gap:16px}
    .ad-warn{color:var(--warn)!important;font-weight:500}
    .ad-tabwrap{overflow-x:auto;margin-top:12px}
    .ad-tab{width:100%;border-collapse:collapse;font-size:14.5px}
    .ad-tab th{text-align:left;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:500;border-bottom:1px solid var(--line)}
    .ad-tab th button{border:0;background:none;font:inherit;color:inherit;letter-spacing:inherit;text-transform:inherit;padding:10px 6px;cursor:pointer}
    .ad-tab td{padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:middle}
    .ad-tab tr.ad-aus td{opacity:.5}
    .ad-farbe{display:inline-block;width:16px;height:16px;border-radius:50%;margin-right:8px;vertical-align:-3px;box-shadow:0 0 0 1px var(--line)}
    .ad-stern{border:0;background:none;font-size:18px;color:var(--line);cursor:pointer;padding:4px}.ad-stern.on{color:#b08a5e}
    .ad-link{border:0;background:none;color:var(--rose-ink);text-decoration:underline;font:inherit;cursor:pointer;padding:0}.ad-link:disabled{color:var(--muted);text-decoration:none;cursor:default}
    .ad-form{border-color:var(--rose);margin-top:12px}.ad-form h3{font-size:19px}
    .ad-form input[type=color]{padding:4px;height:44px}
    .ad-text{border-top:1px solid var(--line);padding:12px 0}.ad-text summary{cursor:pointer}.ad-text textarea{width:100%;font:inherit;font-size:15px}
    .ad-schritte{margin:12px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:6px}`;
  document.head.append(css);

  FCC.register && FCC.register({
    id: 'admin', titel: 'Administration', el: 'mod-admin', order: 10, render,
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
  });
})();
