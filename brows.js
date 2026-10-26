// Modul „Brows-Reihe“: Workflow für „If I could do your Brows“.
// Einwilligung → Foto → Analyse → Vorschlag → Vorschau → Bericht (PDF für die Kundin) → Bilder für Instagram.
// Die Folien entstehen direkt im Browser; nichts verlässt das Gerät außer in den eigenen Google-Drive-Ordner.
(function () {
  const FCC = window.FCC = window.FCC || {};
  const C = window.FCC_CONFIG || {};
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = d => d ? new Date(d + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const clone = o => JSON.parse(JSON.stringify(o));
  const name = e => `${e.vorname || ''} ${e.nachname || ''}`.trim() || '(ohne Namen)';

  // Farben und Schriften aus dem Vorlagen-Paket
  const CREME = '#F3EDE4', GOLD = '#A8844F', INK = '#1F1A17', SOFT = '#E5DACD', MUTED = '#6E625A';
  const W = 1080, H = 1350;
  const VORSCHLAEGE = ['Brow Lift', 'Powder Brows', 'Formen + Färben'];
  const BEDENKEN = [
    ['„Das sieht doch aufgemalt aus.“', 'Powder Brows wirken wie zart gepudert, nicht wie ein harter Strich.'],
    ['„Das bleibt für immer.“', 'Die Farbe sitzt oberflächlich in der Haut und verblasst mit der Zeit.'],
    ['„Und wenn es mir nicht gefällt?“', 'Ich zeichne erst vor. Ohne dein Ja passiert gar nichts.']
  ];
  const ADRESSE = (C.ADRESSE || 'Elisabeth-Silbereisen-Weg 7, 74931 Lobbach-Lobenfeld').split(/,\s*/);
  const HANDLE = '@facecolorconcept';
  const INH = C.INHABERIN || 'Kati';

  // ---------- Status ----------
  // Kurzform im Verzeichnis (store.js): { id, f, e, wd, gel, v, p, fr, o }
  function status(k) {
    if (k.wd && !k.gel) return { k: 'zurueck', l: 'Einwilligung zurückgezogen', sev: 'bad', todo: 'Einwilligung zurückgezogen: Beitrag und Fotos löschen' };
    if (k.wd) return { k: 'beendet', l: 'Beendet (zurückgezogen)', sev: '' };
    if (!k.e) return { k: 'einw', l: 'Einwilligung fehlt', sev: 'warn', todo: 'Einwilligung einholen' };
    if (!k.v) return { k: 'arbeit', l: 'In Arbeit', sev: 'info', todo: 'Analyse und Vorschau vorbereiten' };
    if (!k.p) return { k: 'bereit', l: 'Bereit für den Bericht', sev: 'due', todo: 'Bericht erzeugen und vorab schicken' };
    if (!k.fr) return { k: 'wartet', l: 'Wartet auf Freigabe', sev: 'due', todo: 'Wartet auf das Ja zur Vorschau' };
    if (!k.o) return { k: 'frei', l: 'Freigegeben, noch nicht online', sev: 'due', todo: 'Freigegeben: Bilder posten' };
    return { k: 'online', l: 'Online seit ' + fmt(k.o), sev: '' };
  }
  const kurz = b => ({ id: b.id, f: b.folge, e: b.einwilligung && b.einwilligung.datum && b.einwilligung.volljaehrig ? b.einwilligung.datum : '',
    wd: b.widerrufen || '', gel: b.geloescht || '', v: b.vorschau && b.vorschau.fileId ? 1 : 0, p: b.pdf ? b.pdf.datum : '', fr: b.freigabe || '', o: b.online || '' });
  FCC.browsKurz = kurz;

  function alleFolgen() {
    const out = [];
    Store.list(true).forEach(e => (e.w || []).forEach(w => out.push({ ...w, e })));
    return out.sort((a, b) => (b.f || 0) - (a.f || 0));
  }
  const naechsteFolge = () => Math.max(0, ...alleFolgen().map(x => Number(x.f) || 0)) + 1;

  // Punkte für „Jetzt dran“ in der Übersicht
  FCC.browsTodos = e => (e.w || []).map(w => ({ w, s: status(w) })).filter(x => x.s.todo)
    .map(x => ({ e, brows: x.w.id, sev: x.s.sev, prio: x.s.sev === 'bad' ? -1 : x.s.sev === 'warn' ? 1 : 2, txt: `Brows Folge ${x.w.f}: ${x.s.todo}` }));

  // ---------- Fotos ----------
  const imgCache = {};
  async function loadImg(p) {
    if (!p || !p.fileId) return null;
    if (imgCache[p.fileId]) return imgCache[p.fileId];
    const url = await Store.photoUrl(p);
    if (!url) return null;
    const img = new Image();
    img.src = url;
    await img.decode();
    return (imgCache[p.fileId] = img);
  }

  // Bild rund zuschneiden: crop = { x, y, s } (Verschiebung in Kreisdurchmessern, Zoom ab 1)
  function drawCircle(ctx, img, crop, cx, cy, r, half) {
    ctx.save();
    ctx.beginPath();
    if (half === 'L') { ctx.arc(cx, cy, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); }
    else if (half === 'R') { ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2); ctx.closePath(); }
    else ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = SOFT; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    if (img) {
      const c = crop || { x: 0, y: 0, s: 1 };
      const D = 2 * r;
      const sc = (c.s || 1) * D / Math.min(img.naturalWidth, img.naturalHeight);
      const w = img.naturalWidth * sc, h = img.naturalHeight * sc;
      ctx.drawImage(img, cx - w / 2 + (c.x || 0) * D, cy - h / 2 + (c.y || 0) * D, w, h);
    }
    ctx.restore();
  }
  // Linien und Nummern der Analyse (in Kreis-Koordinaten 0..1 gespeichert)
  function drawMarks(ctx, b, cx, cy, r) {
    const D = 2 * r, x0 = cx - r, y0 = cy - r;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    (b.linien || []).forEach(l => {
      if (l.length < 2) return;
      [['rgba(31,26,23,.35)', D * .016], ['#FFFFFF', D * .009]].forEach(([col, lw]) => {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
        l.forEach(([u, v], i) => i ? ctx.lineTo(x0 + u * D, y0 + v * D) : ctx.moveTo(x0 + u * D, y0 + v * D));
        ctx.stroke();
      });
    });
    (b.marken || []).forEach((m, i) => {
      const x = x0 + m[0] * D, y = y0 + m[1] * D, rr = D * .045;
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = D * .006; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.font = `600 ${Math.round(rr * 1.15)}px Jost`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), x, y + rr * .06);
    });
    ctx.restore();
  }

  // ---------- Folien ----------
  function txt(ctx, s, x, y, font, color, align, spacing) {
    ctx.font = font; ctx.fillStyle = color || INK; ctx.textAlign = align || 'center'; ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (spacing || 0) + 'px';
    ctx.fillText(s, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  function wrap(ctx, s, maxW, font) {
    ctx.font = font;
    const words = String(s || '').split(/\s+/).filter(Boolean); const lines = []; let cur = '';
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur);
    return lines;
  }
  function band(ctx, y1, y2) {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, y1, W, y2 - y1);
    ctx.fillStyle = INK; ctx.fillRect(0, y1, W, 3); ctx.fillRect(0, y2 - 3, W, 3);
  }
  function ring(ctx, cx, cy, r) { ctx.strokeStyle = GOLD; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
  function footer(ctx, swipe) {
    if (swipe) { txt(ctx, 'Swipe', 64, 1296, '300 29px Jost', INK, 'left'); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(164, 1286); ctx.lineTo(214, 1286); ctx.moveTo(200, 1276); ctx.lineTo(214, 1286); ctx.lineTo(200, 1296); ctx.stroke(); }
    txt(ctx, HANDLE, 1016, 1296, '300 29px Jost', INK, 'right');
  }
  function pill(ctx, label, cx, cy, h, font, filled, faded, spacing) {
    ctx.font = font; if ('letterSpacing' in ctx) ctx.letterSpacing = (spacing || 0) + 'px';
    const w = ctx.measureText(label).width + h * 1.3;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.save(); ctx.globalAlpha = faded ? .38 : 1;
    ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    if (filled) { ctx.fillStyle = GOLD; ctx.fill(); } else { ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.stroke(); }
    txt(ctx, label, cx, cy + h * .17, font, filled ? '#FFFFFF' : INK, 'center', spacing);
    ctx.restore();
  }
  function canvas() { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d'); ctx.fillStyle = CREME; ctx.fillRect(0, 0, W, H); return [cv, ctx]; }
  const TITLE = '800 80px Jost', HEAD = '800 54px Jost';

  async function fontsReady() {
    try { await Promise.all(['800 40px Jost', '600 40px Jost', '500 40px Jost', '400 40px Jost', '300 40px Jost', 'italic 500 40px "Cormorant Garamond"'].map(f => document.fonts.load(f))); } catch (e) {}
  }

  async function slides(b, opt) {
    await fontsReady();
    const foto = await loadImg(b.foto).catch(() => null);
    const vor = await loadImg(b.vorschau).catch(() => null);
    const out = [];
    let cv, ctx;
    // 1 Titel
    [cv, ctx] = canvas();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(64, 66, 270, 58, 29); ctx.stroke();
    txt(ctx, 'FOLGE ' + (b.folge || ''), 94, 106, '500 27px Jost', INK, 'left', 6);
    txt(ctx, 'VIRTUELLE VORSCHAU', 1016, 106, '300 27px Jost', INK, 'right', 5);
    ring(ctx, 540, 410, 252); drawCircle(ctx, foto, b.foto && b.foto.crop, 540, 410, 236);
    band(ctx, 718, 928);
    txt(ctx, 'IF I COULD DO', 540, 812, TITLE, INK, 'center', 5); txt(ctx, 'YOUR BROWS', 540, 896, TITLE, INK, 'center', 5);
    txt(ctx, 'Wenn ich deine Brauen machen dürfte …', 540, 1028, 'italic 500 56px "Cormorant Garamond"');
    txt(ctx, 'Erst sehen, dann entscheiden.', 540, 1098, '300 32px Jost');
    footer(ctx, true); out.push(cv);
    // 2 Analyse
    [cv, ctx] = canvas();
    band(ctx, 76, 190); txt(ctx, 'WAS MIR AUFFÄLLT', 540, 153, HEAD, INK, 'center', 4);
    ring(ctx, 540, 500, 268); drawCircle(ctx, foto, b.foto && b.foto.crop, 540, 500, 252); drawMarks(ctx, b, 540, 500, 252);
    [926, 1035, 1144].forEach((y, i) => {
      txt(ctx, String(i + 1), 112, y - 6, '400 40px Jost', GOLD, 'center');
      ctx.fillStyle = SOFT; ctx.fillRect(150, y + 6, 830, 2);
      const p = (b.punkte || [])[i] || '';
      let f = 36; ctx.font = `400 ${f}px Jost`; while (ctx.measureText(p).width > 820 && f > 24) { f--; ctx.font = `400 ${f}px Jost`; }
      txt(ctx, p, 156, y - 6, `400 ${f}px Jost`, INK, 'left');
    });
    footer(ctx, true); out.push(cv);
    // 3 Vorschlag
    [cv, ctx] = canvas();
    band(ctx, 76, 190); txt(ctx, 'MEIN VORSCHLAG', 540, 153, HEAD, INK, 'center', 4);
    const gew = b.vorschlag || [];
    VORSCHLAEGE.forEach((v, i) => pill(ctx, v, 540, 352 + i * 130, 86, '500 42px Jost', gew.includes(v), gew.length && !gew.includes(v)));
    txt(ctx, 'Weil …', 540, 812, 'italic 500 76px "Cormorant Garamond"');
    const wl = wrap(ctx, b.weil, 760, '400 34px Jost').slice(0, 3);
    [898, 1000, 1102].forEach((y, i) => { ctx.fillStyle = SOFT; ctx.fillRect(150, y + 8, 780, 2); if (wl[i]) txt(ctx, wl[i], 540, y - 4, '400 34px Jost'); });
    footer(ctx, true); out.push(cv);
    // 4 Vorschau
    [cv, ctx] = canvas();
    band(ctx, 76, 190); txt(ctx, 'SO KÖNNTE ES WERDEN', 540, 153, HEAD, INK, 'center', 4);
    ring(ctx, 540, 574, 296);
    drawCircle(ctx, foto, b.foto && b.foto.crop, 540, 574, 280, 'L');
    drawCircle(ctx, vor, b.vorschau && b.vorschau.crop, 540, 574, 280, 'R');
    ctx.fillStyle = GOLD; ctx.fillRect(538, 278, 4, 592);
    pill(ctx, 'JETZT', 350, 938, 56, '500 26px Jost', false, false, 5);
    pill(ctx, 'VORSCHAU', 728, 938, 56, '500 26px Jost', true, false, 5);
    txt(ctx, 'Virtuelle Simulation. Das echte Ergebnis hängt von deiner Haut und', 540, 1070, '300 28px Jost');
    txt(ctx, 'deinen Härchen ab.', 540, 1110, '300 28px Jost');
    footer(ctx, true); out.push(cv);
    // 5 Bedenken
    [cv, ctx] = canvas();
    band(ctx, 76, 190); txt(ctx, 'DEINE BEDENKEN', 540, 153, HEAD, INK, 'center', 4);
    let by = 352;
    BEDENKEN.forEach(([q, a], i) => {
      txt(ctx, q, 88, by, 'italic 500 56px "Cormorant Garamond"', INK, 'left');
      const ls = wrap(ctx, a, 880, '300 32px Jost');
      ls.forEach((l, j) => txt(ctx, l, 88, by + 64 + j * 46, '300 32px Jost', MUTED, 'left'));
      const end = by + 64 + (ls.length - 1) * 46;
      if (i < 2) { ctx.fillStyle = GOLD; ctx.fillRect(88, end + 46, 80, 3); }
      by = end + 150;
    });
    footer(ctx, true); out.push(cv);
    // 6 Abschluss
    [cv, ctx] = canvas();
    txt(ctx, 'Neugierig,', 540, 352, 'italic 500 76px "Cormorant Garamond"');
    txt(ctx, 'aber noch unsicher?', 540, 450, 'italic 500 76px "Cormorant Garamond"');
    band(ctx, 550, 760);
    txt(ctx, 'HOL DIR DEINE', 540, 644, TITLE, INK, 'center', 5); txt(ctx, 'VORSCHAU', 540, 728, TITLE, INK, 'center', 5);
    txt(ctx, 'Schick mir ein Foto deiner Brauen per DM.', 540, 850, '400 32px Jost');
    txt(ctx, 'Kostenlos und unverbindlich.', 540, 900, '500 32px Jost', GOLD);
    txt(ctx, C.STUDIO || 'Facecolorconcept', 540, 1030, '400 38px Jost');
    ADRESSE.forEach((l, i) => txt(ctx, l, 540, 1084 + i * 46, '300 31px Jost', MUTED));
    footer(ctx, false); out.push(cv);

    // Deckblatt nur für das PDF an die Kundin
    if (opt && opt.deckblatt) {
      [cv, ctx] = canvas();
      txt(ctx, 'FOLGE ' + (b.folge || '') + ' · ' + fmt(today()), 540, 150, '500 27px Jost', MUTED, 'center', 6);
      txt(ctx, 'Für ' + (opt.vorname || 'dich'), 540, 420, 'italic 500 80px "Cormorant Garamond"');
      band(ctx, 480, 620); txt(ctx, 'DEINE VORSCHAU', 540, 574, TITLE, INK, 'center', 5);
      const t = ['Hier siehst du, wie ich mir deine Brauen vorstellen könnte.', 'Bevor etwas online geht, schaust du es dir in Ruhe an.', 'Erst nach deinem Ja veröffentliche ich den Beitrag.', '', 'Gefällt dir etwas nicht oder möchtest du doch nicht?', 'Eine kurze Nachricht genügt.'];
      let y = 730; t.forEach(l => { if (!l) { y += 24; return; } wrap(ctx, l, 860, '300 34px Jost').forEach(x => { txt(ctx, x, 540, y, '300 34px Jost'); y += 50; }); });
      txt(ctx, 'Liebe Grüße', 540, y + 70, 'italic 500 50px "Cormorant Garamond"');
      txt(ctx, INH, 540, y + 130, 'italic 500 50px "Cormorant Garamond"', GOLD);
      txt(ctx, 'Virtuelle Simulation · nur für dich bestimmt', 540, 1296, '300 26px Jost', MUTED);
      out.unshift(cv);
    }
    return out;
  }

  // ---------- PDF (ohne fremde Bibliothek) ----------
  const jpeg = (cv, q) => new Promise(r => cv.toBlob(r, 'image/jpeg', q || .9));
  async function makePdf(canvases) {
    const enc = new TextEncoder(); const parts = []; const offs = []; let len = 0;
    const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const pw = 540, ph = 675; const n = canvases.length;
    push('%PDF-1.4\n%âãÏÓ\n');
    const obj = (id, f) => { offs[id] = len; push(id + ' 0 obj\n'); f(); push('\nendobj\n'); };
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push(`<< /Type /Pages /Count ${n} /Kids [${canvases.map((_, i) => (3 + i * 3) + ' 0 R').join(' ')}] >>`));
    for (let i = 0; i < n; i++) {
      const data = new Uint8Array(await (await jpeg(canvases[i], .88)).arrayBuffer());
      const p = 3 + i * 3;
      obj(p, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im${i} ${p + 1} 0 R >> >> /Contents ${p + 2} 0 R >>`));
      obj(p + 1, () => { push(`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${data.length} >>\nstream\n`); push(data); push('\nendstream'); });
      const cs = `q ${pw} 0 0 ${ph} 0 0 cm /Im${i} Do Q`;
      obj(p + 2, () => push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
    }
    const total = 3 + n * 3; const x = len;
    let xr = `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let i = 1; i < total; i++) xr += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
    push(xr + `trailer\n<< /Size ${total} /Root 1 0 R /Info << /Producer (Facecolorconcept Kartei) >> >>\nstartxref\n${x}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }

  // Dateien teilen (iPhone: „Bilder sichern“, WhatsApp …) oder herunterladen
  async function teilen(files) {
    try {
      if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    files.forEach(f => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); });
  }

  // ---------- Texte zum Kopieren ----------
  const tEinw = v => `Hallo ${v || '[Name]'}, danke für dein Foto! Ich freue mich, deine Brauen für die Reihe „If I could do your Brows“ anzuschauen.

Bevor ich loslege, brauche ich kurz dein Okay. Ich würde Folgendes machen:
– dein Foto auf dem Instagram-Kanal ${HANDLE} zeigen (Beitrag, Reel und Story)
– darauf meine Analyse-Linien zeichnen und eine virtuelle Vorschau erstellen, also eine Simulation, wie deine Brauen aussehen könnten
– deinen Namen nenne ich nicht, außer du möchtest markiert werden

Du kannst dein Okay jederzeit zurückziehen, eine kurze Nachricht an mich reicht. Dann lösche ich den Beitrag und dein Foto.

Wenn das für dich passt, antworte bitte mit:
„Ja, du darfst mein Foto für Instagram verwenden.“

Liebe Grüße
${INH} von ${C.STUDIO || 'Facecolorconcept'}`;
  const tDanke = v => `Danke dir, ${v || '[Name]'}! Ich mache mich an deine Vorschau und schicke sie dir vorab, bevor sie online geht. So siehst du sie als Erste und kannst noch Nein sagen.

Liebe Grüße
${INH}`;
  const tCaption = b => [`If I could do your Brows · Folge ${b.folge}`, '', 'Was mir auffällt:', ...(b.punkte || []).filter(Boolean).map((p, i) => `${i + 1}. ${p}`), '',
    (b.vorschlag || []).length ? 'Mein Vorschlag: ' + b.vorschlag.join(', ') : '', b.weil ? 'Weil ' + b.weil.replace(/^weil\s+/i, '') : '', '',
    'Neugierig, aber noch unsicher? Schick mir ein Foto deiner Brauen per DM. Kostenlos und unverbindlich.', '',
    'Virtuelle Simulation. Das echte Ergebnis hängt von deiner Haut und deinen Härchen ab.', '',
    `${C.STUDIO || 'Facecolorconcept'} · ${ADRESSE[ADRESSE.length - 1].replace(/^\d+\s*/, '')}`, '',
    '#ificoulddoyourbrows #powderbrows #browlift #augenbrauen #permanentmakeup #pmu #lobbach #heidelberg'].filter((l, i, a) => l || a[i - 1]).join('\n');
  async function kopieren(s, toast) {
    try { await navigator.clipboard.writeText(s); toast('Kopiert. Jetzt in die Nachricht einfügen.'); }
    catch (e) { const t = document.createElement('textarea'); t.value = s; document.body.append(t); t.select(); try { document.execCommand('copy'); toast('Kopiert.'); } catch (x) { toast('Kopieren nicht möglich.'); } t.remove(); }
  }

  // ---------- Karte in der Akte ----------
  // ctx = { toast, busy, rerender }
  let pending = null;
  FCC.browsCard = (c, el, u) => {
    if (!el) return;
    c.brows = c.brows || [];
    const list = [...c.brows].sort((a, b) => (b.folge || 0) - (a.folge || 0));
    el.innerHTML = `<div class="panel card">
      <div class="row between"><div class="row" style="gap:6px"><h2>If I could do your Brows</h2><button class="qhelp" data-hilfe="brows" aria-label="Hilfe zur Brows-Reihe" title="Hilfe">?</button></div><button class="btn small" id="browsNew">+ Neue Folge</button></div>
      ${list.length ? `<ul class="docs">${list.map(b => { const s = status(kurz(b)); return `<li><span><b style="font-weight:500">Folge ${esc(b.folge)}</b> · <span class="bst ${s.sev}">${esc(s.l)}</span><br><span class="cmeta">angelegt ${fmt(b.erstellt)}</span></span><button class="btn ghost small" data-brows="${esc(b.id)}">Öffnen</button></li>`; }).join('')}</ul>`
        : '<p class="cmeta" style="margin-top:10px">Virtuelle Vorschau für Instagram: Einwilligung, Foto, Analyse, Vorschlag und Vorschau eintragen. Daraus entstehen mit einem Klick das PDF für die Kundin und die sechs Bilder für Instagram.</p>'}
    </div>`;
    el.querySelectorAll('[data-hilfe]').forEach(b => b.onclick = () => FCC.hilfe && FCC.hilfe(b.dataset.hilfe));
    el.querySelector('#browsNew').onclick = () => {
      const b = { id: uid(), folge: naechsteFolge(), erstellt: today(), einwilligung: {}, punkte: ['', '', ''], vorschlag: [], weil: '', linien: [], marken: [] };
      openEditor(c, b, true, u);
    };
    el.querySelectorAll('[data-brows]').forEach(x => x.onclick = () => openEditor(c, c.brows.find(b => b.id === x.dataset.brows), false, u));
    if (pending && pending.cid === c.id) { const b = c.brows.find(x => x.id === pending.bid); pending = null; if (b) openEditor(c, b, false, u); }
  };

  // ---------- Editor ----------
  function openEditor(c, orig, isNew, u) {
    const b = clone(orig);
    b.einwilligung = b.einwilligung || {}; b.punkte = b.punkte || ['', '', '']; b.vorschlag = b.vorschlag || []; b.linien = b.linien || []; b.marken = b.marken || [];
    let uploading = 0, tool = 'move', dirty = isNew;
    const ok = () => !!(b.einwilligung.datum && b.einwilligung.volljaehrig && !b.widerrufen);
    const root = $('#sheetRoot');

    function html() {
      const e = b.einwilligung; const s = status(kurz(b));
      return `<div class="sheet-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="Brows Folge ${esc(b.folge)}">
        <div class="sheet-head"><div class="wrap"><div><span class="label">${esc(c.vorname)} ${esc(c.nachname)} · <span class="bst ${s.sev}">${esc(s.l)}</span></span><h2>Brows · Folge ${esc(b.folge)}</h2></div><button class="btn ghost small" id="bx">Schließen</button></div></div>

        <div class="sec wrap"><h3><span class="n">1</span>Einwilligung</h3>
          ${b.widerrufen ? `<div class="banner bad"><span><b>Einwilligung am ${fmt(b.widerrufen)} zurückgezogen.</b> ${b.geloescht ? 'Beitrag und Fotos wurden am ' + fmt(b.geloescht) + ' gelöscht.' : 'Bitte den Beitrag auf Instagram löschen und danach hier bestätigen. Die Kartei legt die Fotos dieser Folge dann in den Drive-Papierkorb.'}</span>${b.geloescht ? '' : '<button type="button" class="btn small" id="bDel">Beitrag gelöscht, Fotos entfernen</button>'}</div>` : ''}
          <p class="cmeta" style="margin:6px 0 0">Vor jeder Verwendung eines Fotos schicken. Erst nach dem schriftlichen Ja weitermachen.</p>
          <div class="row" style="margin-top:10px"><button type="button" class="btn ghost small" id="cpE">Anfrage kopieren</button><button type="button" class="btn ghost small" id="cpD">Danke-Text kopieren</button></div>
          <div class="grid2">
            <div class="field"><label for="eD">Ja erhalten am</label><input type="date" id="eD" value="${esc(e.datum || '')}"></div>
            <div class="field"><span class="flabel">Screenshot vom Ja</span>${e.beleg ? `<a class="mini" style="margin:0" href="${esc(e.beleg.link || '#')}" target="_blank" rel="noopener">${esc(e.beleg.name)}</a> ` : ''}<button type="button" class="btn ghost small" id="eB">${e.beleg ? 'Ersetzen' : '+ Screenshot'}</button><input type="file" id="eBi" accept="image/*,application/pdf" hidden></div>
          </div>
          <div class="chips"><button type="button" class="chip ${e.volljaehrig ? 'on' : ''}" id="eV" aria-pressed="${!!e.volljaehrig}">${e.volljaehrig ? '✓ ' : ''}Kundin ist volljährig</button>
            <button type="button" class="chip ${e.markieren ? 'on' : ''}" id="eM" aria-pressed="${!!e.markieren}">${e.markieren ? '✓ ' : ''}möchte markiert werden</button></div>
          ${!b.widerrufen && e.datum ? '<button type="button" class="btn ghost small" id="bWd" style="margin-top:12px">Einwilligung zurückgezogen</button>' : ''}
        </div>

        <div class="sec wrap"><h3><span class="n">2</span>Foto und Analyse</h3>
          <input type="file" id="pIn" accept="image/*" hidden>
          <div class="bed">
            <canvas id="cvF" class="bcv" width="600" height="600" aria-label="Foto im Kreis"></canvas>
            <div class="btools">
              <button type="button" class="btn small" data-up="foto">${b.foto ? 'Anderes Foto' : '+ Foto der Brauen'}</button>
              ${b.foto ? `<div class="chips" role="group" aria-label="Werkzeug">
                <button type="button" class="chip ${tool === 'move' ? 'on' : ''}" data-tool="move">Verschieben</button>
                <button type="button" class="chip ${tool === 'draw' ? 'on' : ''}" data-tool="draw">Linien zeichnen</button>
                <button type="button" class="chip ${tool === 'mark' ? 'on' : ''}" data-tool="mark">Nummern setzen</button></div>
                <label class="flabel" for="zF">Größe</label><input type="range" id="zF" min="1" max="4" step="0.01" value="${esc((b.foto.crop || {}).s || 1)}">
                <div class="row"><button type="button" class="btn ghost small" id="undo">Rückgängig</button><button type="button" class="btn ghost small" id="clr">Alles weg</button></div>
                <p class="cmeta">Mit zwei Fingern zoomen. Nummern 1 bis 3 passen zu den Punkten unten.</p>` : '<p class="cmeta">Ein Foto aus deinen Bildern oder direkt mit der Kamera.</p>'}
            </div>
          </div>
          <div class="grid2">${[0, 1, 2].map(i => `<div class="field full"><label for="pk${i}">Was mir auffällt ${i + 1}</label><input id="pk${i}" maxlength="60" value="${esc(b.punkte[i] || '')}" placeholder="${['z. B. Bogen sitzt etwas zu weit innen', 'z. B. Lücken im Schwanz der Braue', 'z. B. Härchen wachsen nach unten'][i]}"></div>`).join('')}</div>
          <p class="cmeta">Freundlich formulieren: Chance statt Kritik.</p>
        </div>

        <div class="sec wrap"><h3><span class="n">3</span>Mein Vorschlag</h3>
          <div class="chips">${VORSCHLAEGE.map(v => `<button type="button" class="chip ${b.vorschlag.includes(v) ? 'on' : ''}" data-vs="${esc(v)}" aria-pressed="${b.vorschlag.includes(v)}">${esc(v)}</button>`).join('')}</div>
          <div class="field" style="margin-top:12px"><label for="weil">Weil …</label><textarea id="weil" rows="2" maxlength="130">${esc(b.weil)}</textarea></div>
        </div>

        <div class="sec wrap"><h3><span class="n">4</span>Vorschau</h3>
          <p class="cmeta" style="margin:6px 0 0">Die Simulation machst du in Procreate (gleiches Foto, rechts die neue Form) und lädst das fertige Bild hier hoch. Nur simulieren, was du wirklich umsetzen kannst.</p>
          <div class="bed">
            <canvas id="cvV" class="bcv" width="600" height="600" aria-label="Vorschau: links jetzt, rechts Simulation"></canvas>
            <div class="btools">
              <button type="button" class="btn small" data-up="vorschau">${b.vorschau ? 'Andere Vorschau' : '+ Vorschau aus Procreate'}</button>
              ${b.vorschau ? `<label class="flabel" for="zV">Größe</label><input type="range" id="zV" min="1" max="4" step="0.01" value="${esc((b.vorschau.crop || {}).s || 1)}">
                <button type="button" class="btn ghost small" id="sync">Ausschnitt wie beim Foto</button>
                <p class="cmeta">Links das Foto von Schritt 2, rechts die Vorschau. Verschieben mit dem Finger.</p>` : ''}
            </div>
          </div>
        </div>

        <div class="sec wrap"><h3><span class="n">5</span>Bericht und Instagram</h3>
          ${uploading ? '<p class="cmeta">Foto wird hochgeladen …</p>' : ''}
          <div class="slides" id="thumbs" aria-label="Vorschau der Folien"></div>
          <div class="grid2">
            <div class="field"><label for="fNr">Folge Nr.</label><input id="fNr" inputmode="numeric" value="${esc(b.folge)}"></div>
            <div class="field"><span class="flabel">PDF für die Kundin</span>${b.pdf ? `<span class="cmeta">erstellt ${fmt(b.pdf.datum)}${b.pdf.link ? ` · <a href="${esc(b.pdf.link)}" target="_blank" rel="noopener">in Drive</a>` : ''}</span>` : '<span class="cmeta">noch nicht erstellt</span>'}</div>
          </div>
          ${ok() ? '' : `<div class="banner"><span>${b.widerrufen ? 'Die Einwilligung wurde zurückgezogen. Es kann nichts mehr erzeugt werden.' : 'Bericht und Bilder gibt es erst mit Einwilligung (Datum und „volljährig“ in Schritt 1).'}</span></div>`}
          <div class="row" style="margin-top:12px">
            <button type="button" class="btn" id="mkPdf" ${ok() ? '' : 'disabled'}>PDF für die Kundin erzeugen</button>
            <button type="button" class="btn ghost" id="mkIg" ${ok() && b.freigabe ? '' : 'disabled'}>6 Bilder für Instagram</button>
            <button type="button" class="btn ghost small" id="cpC" ${ok() ? '' : 'disabled'}>Bildunterschrift kopieren</button>
          </div>
          <div class="grid2">
            <div class="field"><label for="fFr">Kundin hat die Vorschau freigegeben am</label><input type="date" id="fFr" value="${esc(b.freigabe || '')}" ${ok() ? '' : 'disabled'}></div>
            <div class="field"><label for="fOn">Online seit</label><input type="date" id="fOn" value="${esc(b.online || '')}" ${ok() && b.freigabe ? '' : 'disabled'}></div>
          </div>
          <p class="cmeta">Die Instagram-Bilder gibt es erst nach der Freigabe. So geht nichts online, was die Kundin nicht gesehen hat.</p>
        </div>
        <div class="sheet-foot"><div class="wrap"><button class="btn ghost" id="bx2">Abbrechen</button><button class="btn" id="bSave">Speichern</button></div></div>
      </div></div>`;
    }

    function read() {
      const g = id => document.getElementById(id);
      if (!g('eD')) return;
      b.einwilligung.datum = g('eD').value;
      b.punkte = [0, 1, 2].map(i => g('pk' + i).value.trim());
      b.weil = g('weil').value.trim();
      b.folge = Number(g('fNr').value) || b.folge;
      if (g('fFr')) b.freigabe = g('fFr').value;
      if (g('fOn')) b.online = g('fOn').value;
      if (!b.freigabe) b.online = '';
    }
    function draw() {
      const sh = $('.sheet'); const y = sh ? sh.scrollTop : 0;
      root.innerHTML = html();
      $('.sheet').scrollTop = y;
      bind(); paint(); thumbs();
    }
    const redraw = fn => { read(); fn(); dirty = true; draw(); };

    // Kreis-Vorschau im Editor
    async function paint() {
      const f = $('#cvF'), v = $('#cvV'); if (!f) return;
      await fontsReady();
      const img = await loadImg(b.foto).catch(() => null);
      let ctx = f.getContext('2d'); ctx.clearRect(0, 0, 600, 600);
      ctx.fillStyle = CREME; ctx.fillRect(0, 0, 600, 600);
      ring(ctx, 300, 300, 292); drawCircle(ctx, img, b.foto && b.foto.crop, 300, 300, 280); drawMarks(ctx, b, 300, 300, 280);
      const vi = await loadImg(b.vorschau).catch(() => null);
      ctx = v.getContext('2d'); ctx.clearRect(0, 0, 600, 600);
      ctx.fillStyle = CREME; ctx.fillRect(0, 0, 600, 600);
      ring(ctx, 300, 300, 292);
      drawCircle(ctx, img, b.foto && b.foto.crop, 300, 300, 280, 'L'); drawCircle(ctx, vi, b.vorschau && b.vorschau.crop, 300, 300, 280, 'R');
      ctx.fillStyle = GOLD; ctx.fillRect(298, 8, 4, 584);
    }
    let tTimer = null;
    function thumbs() {
      clearTimeout(tTimer);
      tTimer = setTimeout(async () => {
        const el = $('#thumbs'); if (!el) return;
        const cvs = await slides(b);
        el.innerHTML = '';
        cvs.forEach((cv, i) => { const im = document.createElement('img'); im.src = cv.toDataURL('image/jpeg', .7); im.alt = 'Folie ' + (i + 1); im.onclick = () => FCC.showPhoto && FCC.showPhoto(im.src); el.append(im); });
      }, 150);
    }

    // Finger-Steuerung: verschieben, zoomen (zwei Finger), zeichnen, Nummern setzen
    function gestures(cvEl, key) {
      if (!cvEl) return;
      const pts = new Map(); let start = null, line = null;
      const pos = ev => { const r = cvEl.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height]; };
      // Kreis im Editor: Mitte 300, Radius 280 von 600 → Kreis-Koordinaten 0..1
      const toCircle = ([x, y]) => [(x * 600 - 20) / 560, (y * 600 - 20) / 560];
      const p = () => b[key];
      cvEl.onpointerdown = ev => {
        if (!p()) return;
        cvEl.setPointerCapture(ev.pointerId); pts.set(ev.pointerId, pos(ev));
        const crop = p().crop = p().crop || { x: 0, y: 0, s: 1 };
        if (key === 'foto' && tool === 'draw' && pts.size === 1) { line = [toCircle(pos(ev))]; b.linien.push(line); dirty = true; return; }
        if (key === 'foto' && tool === 'mark' && pts.size === 1) {
          if (b.marken.length >= 3) b.marken.shift();
          b.marken.push(toCircle(pos(ev))); dirty = true; paint(); thumbs(); return;
        }
        line = null;
        const a = [...pts.values()];
        start = { crop: { ...crop }, a: a.map(x => [...x]), d: a.length > 1 ? Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) : 0 };
      };
      cvEl.onpointermove = ev => {
        if (!pts.has(ev.pointerId)) return;
        pts.set(ev.pointerId, pos(ev));
        if (line) { line.push(toCircle(pos(ev))); paint(); return; }
        if (!start) return;
        const a = [...pts.values()]; const crop = p().crop;
        if (a.length > 1 && start.d) {
          crop.s = Math.min(4, Math.max(1, start.crop.s * Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) / start.d));
        } else {
          crop.x = start.crop.x + (a[0][0] - start.a[0][0]) * 600 / 560;
          crop.y = start.crop.y + (a[0][1] - start.a[0][1]) * 600 / 560;
        }
        dirty = true; paint();
        const z = document.getElementById(key === 'foto' ? 'zF' : 'zV'); if (z) z.value = crop.s;
      };
      const up = ev => {
        pts.delete(ev.pointerId);
        if (line && line.length < 2) b.linien.pop();
        line = null;
        if (pts.size) { const a = [...pts.values()]; start = { crop: { ...p().crop }, a: a.map(x => [...x]), d: 0 }; } else start = null;
        thumbs();
      };
      cvEl.onpointerup = up; cvEl.onpointercancel = up;
    }

    function close() { root.innerHTML = ''; }
    function tryClose() {
      if (uploading) { u.toast('Bitte warten, bis das Foto hochgeladen ist.'); return; }
      read();
      if (dirty && JSON.stringify(b) !== JSON.stringify(orig) && !confirmClose) { confirmClose = true; u.toast('Noch nicht gespeichert. Noch einmal auf „Schließen“ tippen, um ohne Speichern zu schließen.', true); return; }
      close();
    }
    let confirmClose = false;

    async function persist(msg) {
      read();
      c.brows = c.brows || [];
      const i = c.brows.findIndex(x => x.id === b.id);
      const before = clone(c.brows);
      if (i >= 0) c.brows[i] = clone(b); else c.brows.push(clone(b));
      try { await Store.save(c); } catch (err) { c.brows = before; throw err; }
      orig = clone(b); dirty = false; isNew = false; confirmClose = false;
      if (msg) u.toast(msg);
    }

    function bind() {
      $('#bx').onclick = tryClose; $('#bx2').onclick = tryClose;
      $('#cpE').onclick = () => kopieren(tEinw(c.vorname), u.toast);
      $('#cpD').onclick = () => kopieren(tDanke(c.vorname), u.toast);
      $('#eV').onclick = () => redraw(() => { b.einwilligung.volljaehrig = !b.einwilligung.volljaehrig; });
      $('#eM').onclick = () => redraw(() => { b.einwilligung.markieren = !b.einwilligung.markieren; });
      $('#eB').onclick = () => $('#eBi').click();
      $('#eBi').onchange = ev => {
        const f0 = ev.target.files[0]; ev.target.value = ''; if (!f0) return;
        const ext = (f0.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const file = new File([f0], `Brows_Folge${b.folge}_Einwilligung_${today()}.${ext}`, { type: f0.type });
        u.busy($('#eB'), 'Lädt hoch …', async () => {
          const d = await Store.addDoc(c, file);
          c.dokumente = c.dokumente || []; c.dokumente.unshift(d);
          read(); b.einwilligung.beleg = { fileId: d.fileId, name: d.name, link: d.link };
          if (!b.einwilligung.datum) b.einwilligung.datum = today();
          await persist('Screenshot abgelegt');
          draw();
        }).catch(() => {});
      };
      const wd = $('#bWd');
      if (wd) wd.onclick = () => {
        if (wd.dataset.sure !== '1') { wd.dataset.sure = '1'; wd.textContent = 'Wirklich? Dann wird nichts mehr erzeugt.'; return; }
        u.busy(wd, 'Speichert …', async () => { read(); b.widerrufen = today(); await persist('Vermerkt. Bitte jetzt den Beitrag auf Instagram löschen.'); draw(); }).catch(() => {});
      };
      const del = $('#bDel');
      if (del) del.onclick = () => {
        if (del.dataset.sure !== '1') { del.dataset.sure = '1'; del.textContent = 'Ist der Beitrag auf Instagram gelöscht?'; return; }
        u.busy(del, 'Entfernt …', async () => {
          read();
          for (const k of ['foto', 'vorschau', 'pdf']) {
            if (b[k] && b[k].fileId) { try { await Store.trash(b[k].fileId); } catch (err) { u.toast(err.message, true); } }
          }
          if (b.pdf) c.dokumente = (c.dokumente || []).filter(d => d.fileId !== b.pdf.fileId);
          b.foto = null; b.vorschau = null; b.pdf = null; b.linien = []; b.marken = []; b.geloescht = today();
          await persist('Fotos in den Drive-Papierkorb gelegt. Die Einwilligung und ihr Rückzug bleiben vermerkt.');
          draw();
        }).catch(() => {});
      };
      // Fotos hochladen
      let target = 'foto';
      $$('[data-up]').forEach(x => x.onclick = () => { target = x.dataset.up; $('#pIn').click(); });
      $('#pIn').onchange = async ev => {
        const file = ev.target.files[0]; ev.target.value = ''; if (!file) return;
        if (!ok() && !b.einwilligung.datum) u.toast('Hinweis: Noch keine Einwilligung eingetragen.', true);
        const key = target;
        read(); uploading++; draw();
        try {
          const p = await Store.addPhoto(c, file, `Brows_Folge${b.folge}_${key === 'foto' ? 'Foto' : 'Vorschau'}_${today()}.jpg`);
          const old = b[key];
          b[key] = { ...p, crop: key === 'vorschau' && b.foto && b.foto.crop ? { ...b.foto.crop } : { x: 0, y: 0, s: 1 } };
          if (key === 'foto' && old) { b.linien = []; b.marken = []; }
          dirty = true;
        } catch (err) { u.toast(err.message, true); }
        uploading--; if ($('#pIn')) draw();
      };
      $$('[data-tool]').forEach(x => x.onclick = () => { read(); tool = x.dataset.tool; draw(); });
      $$('[data-vs]').forEach(x => x.onclick = () => redraw(() => { const v = x.dataset.vs; const i = b.vorschlag.indexOf(v); i >= 0 ? b.vorschlag.splice(i, 1) : b.vorschlag.push(v); }));
      const zoom = (id, key) => { const z = document.getElementById(id); if (z) z.oninput = () => { b[key].crop = b[key].crop || { x: 0, y: 0, s: 1 }; b[key].crop.s = Number(z.value); dirty = true; paint(); thumbs(); }; };
      zoom('zF', 'foto'); zoom('zV', 'vorschau');
      const un = $('#undo'); if (un) un.onclick = () => { if (tool === 'mark' && b.marken.length) b.marken.pop(); else if (b.linien.length) b.linien.pop(); else b.marken.pop(); dirty = true; paint(); thumbs(); };
      const cl = $('#clr'); if (cl) cl.onclick = () => { b.linien = []; b.marken = []; dirty = true; paint(); thumbs(); };
      const sy = $('#sync'); if (sy) sy.onclick = () => { b.vorschau.crop = { ...(b.foto && b.foto.crop || { x: 0, y: 0, s: 1 }) }; const z = $('#zV'); if (z) z.value = b.vorschau.crop.s; dirty = true; paint(); thumbs(); };
      gestures($('#cvF'), 'foto'); gestures($('#cvV'), 'vorschau');
      ['pk0', 'pk1', 'pk2', 'weil', 'fNr'].forEach(id => { const x = document.getElementById(id); if (x) x.addEventListener('input', () => { read(); dirty = true; thumbs(); }); });
      ['eD', 'fFr'].forEach(id => { const x = document.getElementById(id); if (x) x.addEventListener('change', () => redraw(() => {})); });

      $('#mkPdf').onclick = ev => {
        if (!ok()) return;
        u.busy(ev.currentTarget, 'Erzeugt …', async () => {
          read();
          const pdf = await makePdf(await slides(b, { deckblatt: true, vorname: c.vorname }));
          const file = new File([pdf], `Brows_Folge${b.folge}_Vorschau_fuer_${(c.vorname || 'Kundin').replace(/[^\wäöüÄÖÜß-]/g, '')}.pdf`, { type: 'application/pdf' });
          if (b.pdf && b.pdf.fileId) { try { await Store.trash(b.pdf.fileId); } catch (e) {} c.dokumente = (c.dokumente || []).filter(d => d.fileId !== b.pdf.fileId); }
          const d = await Store.addDoc(c, file);
          c.dokumente = c.dokumente || []; c.dokumente.unshift(d);
          b.pdf = { fileId: d.fileId, link: d.link, datum: today() };
          await persist('PDF erstellt und in der Akte abgelegt');
          draw();
          await teilen([file]);
        }).catch(() => {});
      };
      $('#mkIg').onclick = ev => {
        if (!ok() || !b.freigabe) return;
        u.busy(ev.currentTarget, 'Erzeugt …', async () => {
          read();
          const cvs = await slides(b);
          const files = [];
          for (let i = 0; i < cvs.length; i++) files.push(new File([await jpeg(cvs[i], .93)], `Brows_Folge${b.folge}_${i + 1}.jpg`, { type: 'image/jpeg' }));
          await teilen(files);
        }).catch(() => {});
      };
      $('#cpC').onclick = () => { read(); kopieren(tCaption(b), u.toast); };
      $('#bSave').onclick = ev => {
        if (uploading) { u.toast('Bitte warten, bis das Foto hochgeladen ist.'); return; }
        u.busy(ev.currentTarget, 'Speichert …', async () => { await persist('Gespeichert'); close(); u.rerender(); }).catch(() => {});
      };
    }
    draw();
  }

  // ---------- Reiter „Brows-Reihe“ ----------
  let filt = null;
  function renderModule() {
    const el = document.getElementById('mod-brows');
    if (!el || !window.Store) return;
    const all = alleFolgen().map(x => ({ ...x, s: status(x) }));
    const groups = [['offen', 'Offen', x => !!x.s.todo && x.s.sev !== 'bad'], ['zurueck', 'Zurückgezogen', x => x.s.k === 'zurueck'], ['online', 'Online', x => x.s.k === 'online'], ['alle', 'Alle', () => true]];
    const g = groups.find(x => x[0] === filt) || groups[3];
    const shown = all.filter(g[2]);
    el.innerHTML = `<div class="row between hello"><div><h1>If I could do your Brows</h1><p>Erst sehen, dann entscheiden.</p></div><button class="btn" id="bNeu">+ Neue Interessentin</button></div>
      <div class="kpis">${groups.slice(0, 3).map(([k, l, t]) => `<button class="panel kpi tap" data-g="${k}"${filt === k ? ' aria-pressed="true"' : ''}><b>${all.filter(t).length}</b><span>${l}</span></button>`).join('')}</div>
      <div class="panel card">
        <div class="row between"><h2>${esc(g[1])}</h2>${filt ? '<button class="btn ghost small" data-g="">Filter aufheben</button>' : ''}</div>
        ${shown.length ? `<ul class="todo">${shown.map(x => `<li><span class="sev ${x.s.sev}" aria-hidden="true"></span><button class="who" data-c="${esc(x.e.id)}" data-b="${esc(x.id)}"><b>Folge ${esc(x.f)} · ${esc(name(x.e))}</b><span class="cmeta">${esc(x.s.l)}</span></button></li>`).join('')}</ul>`
          : `<p class="cmeta" style="margin-top:10px">${all.length ? 'Nichts in dieser Auswahl.' : 'Noch keine Folge. So geht es los: Interessentin anlegen (Name reicht), in ihrer Akte auf „+ Neue Folge“ tippen und die Schritte von oben nach unten ausfüllen.'}</p>`}
      </div>`;
    el.querySelector('#bNeu').onclick = () => FCC.newCustomer && FCC.newCustomer();
    el.querySelectorAll('[data-g]').forEach(x => x.onclick = () => { filt = x.dataset.g && filt !== x.dataset.g ? x.dataset.g : null; renderModule(); });
    el.querySelectorAll('[data-c]').forEach(x => x.onclick = () => { pending = { cid: x.dataset.c, bid: x.dataset.b }; FCC.openCustomer(x.dataset.c); });
  }
  FCC.openBrows = (cid, bid) => { pending = { cid, bid }; FCC.openCustomer(cid); };

  const st = document.createElement('style');
  st.textContent = '.bed{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:16px;margin-top:12px;align-items:start}' +
    '@media(max-width:560px){.bed{grid-template-columns:minmax(0,1fr)}}' +
    '.bcv{width:100%;max-width:300px;aspect-ratio:1;touch-action:none;border-radius:50%;display:block;margin:0 auto}' +
    '.btools{display:flex;flex-direction:column;gap:10px;align-items:flex-start;min-width:0}.btools input[type=range]{width:100%;accent-color:var(--rose)}' +
    '.slides{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px;margin-top:12px}' +
    '.slides img{width:100%;aspect-ratio:4/5;border-radius:6px;border:1px solid var(--line);cursor:zoom-in;display:block}' +
    '.bst.bad{color:var(--bad)}.bst.warn{color:var(--warn)}.bst.due{color:var(--rose-ink)}.bst.info{color:var(--ok)}' +
    '.banner.bad{background:color-mix(in srgb,var(--bad) 14%,var(--paper))}' +
    '.kpi[aria-pressed="true"]{border-color:var(--rose)}';
  document.head.append(st);

  FCC.register && FCC.register({ id: 'brows', titel: 'Brows', el: 'mod-brows', order: 3, render: renderModule,
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11c3-3.5 7-4.5 10.5-3.5S19 10 21 11.5"/><circle cx="12" cy="16" r="2.5"/><path d="M6.5 16c1.2-1.8 3.2-3 5.5-3s4.3 1.2 5.5 3c-1.2 1.8-3.2 3-5.5 3s-4.3-1.2-5.5-3z"/></svg>' });
})();
