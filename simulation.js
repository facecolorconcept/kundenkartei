// Brauen-Simulation am Vorher-Foto. Läuft komplett im Browser: Das Foto verlässt das Gerät nur,
// wenn du das Ergebnis in der Akte speicherst (dann in deinen eigenen Google-Drive-Ordner).
// Keine Gesichtserkennung von fremden Servern: Du setzt die fünf Punkte A, A1, B, B1 und C selbst, wie beim Vorzeichnen nach Anatomie.
(function () {
  const FCC = window.FCC = window.FCC || {};
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const fmt = d => d ? new Date(d + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const TECHNIK = [
    { k: 'powder', l: 'Powder Brows', t: 'zart gepudert, vorne weich' },
    { k: 'ombre', l: 'Ombré Brows', t: 'vorne sehr hell, nach hinten kräftiger' },
    { k: 'hair', l: 'Hairstroke maschinell', t: 'feine Härchen, natürlich' },
    { k: 'kombi', l: 'Kombination', t: 'Härchen vorne, Puder nach hinten' }
  ];
  const FARBEN = [
    ['Taupe', '#8c7a6b'], ['Soft Brown', '#7d5c47'], ['Mittelbraun', '#5f4535'], ['Warmbraun', '#6e4630'],
    ['Aschbraun', '#5a5049'], ['Dunkelbraun', '#3e2d24'], ['Graphit', '#38332f']
  ];
  const MAXPX = 1600; // Arbeitsgröße des Fotos

  // ---------- Geometrie ----------
  const sub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y });
  const add = (p, q, f = 1) => ({ x: p.x + q.x * f, y: p.y + q.y * f });
  const len = v => Math.hypot(v.x, v.y) || 1;
  const nrm = v => { const l = len(v); return { x: v.x / l, y: v.y / l }; };

  // Glatte Linie durch Punkte (Catmull-Rom), als Liste von Stützpunkten
  function spline(pts, n = 16) {
    const out = [];
    const P = [pts[0], ...pts, pts[pts.length - 1]];
    for (let i = 1; i < P.length - 2; i++) {
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push({ x: f(P[i - 1].x, P[i].x, P[i + 1].x, P[i + 2].x), y: f(P[i - 1].y, P[i].y, P[i + 1].y, P[i + 2].y) });
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  // Form einer Braue aus fünf Punkten (wie beim Vorzeichnen):
  // A = Anfang unten, A1 = Anfang oben, B = Bogen oben, B1 = Bogen unten, C = Ende (Spitze)
  // Gerade Verbindung Ecke zu Ecke mit gleich vielen Stützpunkten wie spline(), damit beide gemischt werden können
  function gerade(pts, n) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < n; k++) { const t = k / n; out.push({ x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t }); }
    out.push(pts[pts.length - 1]);
    return out;
  }
  // Rundung: 0 = Ecke mit Ecke gerade verbunden, 1 = weicher Bogen durch die Punkte
  const mischen = (a, b, r) => a.map((p, i) => ({ x: p.x + (b[i].x - p.x) * r, y: p.y + (b[i].y - p.y) * r }));
  function form(s, o = {}) {
    const kopfMitte = { x: (s.A.x + s.A1.x) / 2, y: (s.A.y + s.A1.y) / 2 };
    const L = len(sub(s.C, kopfMitte));
    const dir = nrm(sub(s.C, kopfMitte));
    let down = { x: -dir.y, y: dir.x }; if (down.y < 0) down = { x: -down.x, y: -down.y };
    const T = Math.max(len(sub(s.A, s.A1)), len(sub(s.B, s.B1)), L * 0.05);
    const back = { x: -dir.x, y: -dir.y };
    // Kopf: weicher, runder Abschluss zwischen A und A1
    const kopf = add(kopfMitte, back, len(sub(s.A, s.A1)) * 0.42);
    const ro = o.rundOben == null ? 0.7 : o.rundOben, ru = o.rundUnten == null ? 0.7 : o.rundUnten;
    const top = mischen(gerade([s.A1, s.B, s.C], 28), spline([s.A1, s.B, s.C], 28), ro);
    const bot = mischen(gerade([s.A, s.B1, s.C], 28), spline([s.A, s.B1, s.C], 28), ru);
    return { top, bot, kopf, aTop: s.A1, aBot: s.A, T, L, dir, down };
  }

  function pfad(ctx, f) {
    ctx.beginPath();
    ctx.moveTo(f.aBot.x, f.aBot.y);
    ctx.quadraticCurveTo(f.kopf.x, f.kopf.y, f.aTop.x, f.aTop.y);
    f.top.forEach(p => ctx.lineTo(p.x, p.y));
    [...f.bot].reverse().forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
  }

  // Zufall mit festem Startwert, damit die Härchen beim Verschieben nicht springen
  function rng(seed) { let s = (seed * 2654435761) >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // Verlauf von vorne nach hinten: wie kräftig das Pigment an welcher Stelle wirkt
  function verlauf(ctx, f, s, technik, farbe, deck) {
    const g = ctx.createLinearGradient(f.kopf.x, f.kopf.y, s.C.x, s.C.y);
    const stops = STOPS[technik] || STOPS.powder;
    stops.forEach(([p, a]) => g.addColorStop(p, rgba(farbe, a * deck)));
    return g;
  }
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`; }

  // Härchen: feine Striche, vorne steil nach oben, dann schräg in Wuchsrichtung
  function haerchen(ctx, f, s, o, seed, nurVorne) {
    const r = rng(seed);
    const n = Math.round(f.L / f.T * 34);
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const t = r() * (nurVorne ? 0.42 : 0.97);
      const pt = an(f.top, t), pb = an(f.bot, t);
      const u = 0.12 + r() * 0.8;
      const p = { x: pt.x + (pb.x - pt.x) * u, y: pt.y + (pb.y - pt.y) * u };
      const vorBogen = s.B.x !== s.A.x ? (p.x - s.A.x) / (s.B.x - s.A.x) < 1 : true;
      const up = { x: -f.down.x, y: -f.down.y };
      // Richtung: vorne fast senkrecht, danach flacher, hinter dem Bogen leicht abwärts
      const steil = t < 0.18 ? 0.85 : vorBogen ? 0.45 : -0.05;
      const d = nrm(add(f.dir, up, steil + (r() - 0.5) * 0.25));
      const l = f.T * (t < 0.18 ? 0.45 : 0.62) * (0.7 + r() * 0.5);
      const q = add(p, d, l);
      const c = add(add(p, d, l * 0.5), up, l * 0.12);
      ctx.strokeStyle = rgba(o.farbe, o.deck * (0.4 + r() * 0.35) * (nurVorne && t > 0.3 ? (0.42 - t) / 0.12 : 1));
      ctx.lineWidth = Math.max(0.7, f.T * (0.022 + r() * 0.012));
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(c.x, c.y, q.x, q.y); ctx.stroke();
    }
  }

  // Weichzeichnen: wo der Browser es kann mit echtem Unschärfe-Filter, sonst stufenweise (halbieren und wieder verdoppeln),
  // damit keine Pixeltreppen entstehen
  const FILTER_OK = (() => { try { const c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch (e) { return false; } })();
  function weich(cv, r) {
    if (r < 0.4) return cv;
    const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height;
    const oc = o.getContext('2d');
    if (FILTER_OK) { oc.filter = `blur(${r.toFixed(2)}px)`; oc.drawImage(cv, 0, 0); return o; }
    let stufen = Math.max(1, Math.min(6, Math.round(Math.log2(r * 1.4))));
    let cur = cv;
    const kette = [];
    for (let i = 0; i < stufen; i++) {
      const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(cur.width / 2)); t.height = Math.max(1, Math.round(cur.height / 2));
      const tc = t.getContext('2d'); tc.imageSmoothingQuality = 'high'; tc.drawImage(cur, 0, 0, t.width, t.height);
      kette.push(cur); cur = t;
    }
    for (let i = kette.length - 1; i >= 0; i--) {
      const t = document.createElement('canvas'); t.width = kette[i].width; t.height = kette[i].height;
      const tc = t.getContext('2d'); tc.imageSmoothingQuality = 'high'; tc.drawImage(cur, 0, 0, t.width, t.height);
      cur = t;
    }
    return cur;
  }

  // Punkt auf einer Stützpunkt-Liste an Stelle t (0 bis 1), stufenlos zwischen den Stützpunkten
  function an(l, t) { const x = Math.max(0, Math.min(1, t)) * (l.length - 1), i = Math.min(l.length - 2, Math.floor(x)), f = x - i; return { x: l[i].x + (l[i + 1].x - l[i].x) * f, y: l[i].y + (l[i + 1].y - l[i].y) * f }; }

  // Pigment-Körnung: winzige Punkte wie beim maschinellen Schattieren, dichter dort, wo der Verlauf kräftiger ist
  function koernung(ctx, f, s, o, seed, stops, sc) {
    const r = rng(seed);
    const flaeche = f.L * f.T * 0.8;
    // Punktgröße an die Anzeige gekoppelt: am Bildschirm etwa ein halbes Pixel, damit es wie feine Pigmentierung wirkt und nicht wie ein Raster
    const rad = Math.max(0.45 / (sc || 1), f.T * 0.0045);
    const n = Math.min(26000, Math.round(flaeche / (rad * rad * 14)));
    const staerke = t => { for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const [p0, a0] = stops[i - 1], [p1, a1] = stops[i]; return a0 + (a1 - a0) * (t - p0) / (p1 - p0 || 1); } return stops[stops.length - 1][1]; };
    for (let i = 0; i < n; i++) {
      const t = r();
      const pt = an(f.top, t), pb = an(f.bot, t);
      const u = r();
      const a = staerke(t) * o.deck * (0.12 + r() * 0.38);
      if (a < 0.02) continue;
      ctx.fillStyle = rgba(o.farbe, a);
      ctx.beginPath(); ctx.arc(pt.x + (pb.x - pt.x) * u, pt.y + (pb.y - pt.y) * u, rad * (0.6 + r() * 0.8), 0, Math.PI * 2); ctx.fill();
    }
  }
  const STOPS = { ombre: [[0, .06], [.3, .4], [.7, .95], [1, 1]], kombi: [[0, 0], [.22, 0], [.4, .7], [.8, .95], [1, .9]], powder: [[0, .28], [.22, .72], [.8, .95], [1, .85]] };

  // Ganze Szene zeichnen: Foto, Brauen (multipliziert, damit Hautstruktur durchscheint), Hilfslinien und Punkte
  function zeichne(ctx, W, H, st, view, o) {
    const sc = W / view.w;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(st.bild, view.x, view.y, view.w, view.h, 0, 0, W, H);
    if (o.vorher) return;
    const seiten = ['L', 'R'].map(k => ({ k, s: st.p[k], f: form(st.p[k], st.o) }));
    const tech = st.o.technik, deck = st.o.deck;
    const neu = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.setTransform(sc, 0, 0, sc, -view.x * sc, -view.y * sc); return [c, x]; };
    const [pud, pc] = neu();   // weicher Schleier (Weichheit wirkt hier)
    const [kor, kc] = neu();   // scharfe Körnung und Härchen
    seiten.forEach(({ k, s, f }) => {
      const stops = tech === 'hair' ? STOPS.powder : (STOPS[tech] || STOPS.powder);
      // Schleier: bei Härchen nur ganz zart als Hautschatten
      pfad(pc, f); pc.fillStyle = verlauf(pc, f, s, tech === 'hair' ? 'powder' : tech, st.o.farbe, deck * (tech === 'hair' ? 0.16 : 0.72)); pc.fill();
      kc.save(); pfad(kc, f); kc.clip();
      if (tech !== 'hair') koernung(kc, f, s, { farbe: st.o.farbe, deck }, k === 'L' ? 3 : 5, stops, sc);
      if (tech === 'hair' || tech === 'kombi') haerchen(kc, f, s, { farbe: st.o.farbe, deck }, k === 'L' ? 7 : 11, tech === 'kombi');
      kc.restore();
    });
    const tPx = Math.max(...seiten.map(x => x.f.T)) * sc;
    // Weichheit 0 = klare Kontur, 100 = sehr weicher Übergang zur Haut
    const rand = tPx * (0.004 + st.o.weich * 0.13);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(weich(pud, rand), 0, 0);
    ctx.drawImage(weich(kor, Math.min(rand * 0.18, tPx * 0.02)), 0, 0);
    ctx.restore();

    if (!o.punkte) return;
    const z = p => ({ x: (p.x - view.x) * sc, y: (p.y - view.y) * sc });
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    // Mittellinie und Verbindungslinien A–A, A1–A1 und B–B: zeigen sofort, ob beide Seiten auf einer Höhe sind
    const mx = (st.mitte - view.x) * sc;
    ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, H); ctx.stroke();
    ['A', 'A1', 'B'].forEach(key => { const p = z(st.p.L[key]), q = z(st.p.R[key]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); });
    if (st.mapping) {
      ctx.strokeStyle = 'rgba(214,170,140,.95)';
      ['L', 'R'].forEach(k => {
        const n = z(st.nase[k]);
        ['A', 'B', 'C'].forEach(key => { const p = z(st.p[k][key]); ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(p.x + (p.x - n.x) * 0.25, p.y + (p.y - n.y) * 0.25); ctx.stroke(); });
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(n.x, 0); ctx.stroke();
      });
    }
    ctx.setLineDash([]);
    griffe(st).forEach(g => {
      const p = z(g.p);
      ctx.beginPath(); ctx.arc(p.x, p.y, g.klein ? 6 : 8, 0, Math.PI * 2);
      ctx.fillStyle = g.nase ? 'rgba(214,170,140,.95)' : '#fff'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#a9725e'; ctx.stroke();
      if (g.txt && o.beschriftung) {
        ctx.font = '600 11px Jost, system-ui, sans-serif';
        const w = ctx.measureText(g.txt).width + 10;
        const unten = g.key === 'A' || g.key === 'B1'; // untere Punkte beschriften wir unterhalb, damit nichts überlappt
        const ty = unten ? p.y + 13 : p.y - 30;
        ctx.fillStyle = 'rgba(30,22,18,.72)'; ctx.fillRect(p.x - w / 2, ty, w, 17);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(g.txt, p.x, ty + 12);
      }
    });
    ctx.restore();
  }

  const PUNKTE = ['A', 'A1', 'B', 'B1', 'C'];
  function griffe(st) {
    const out = [];
    ['L', 'R'].forEach(k => {
      PUNKTE.forEach(key => out.push({ k, key, p: st.p[k][key], txt: key }));
      if (st.mapping) out.push({ k, key: 'n', p: st.nase[k], nase: true, txt: 'Nasenflügel' });
    });
    const ys = ['L', 'R'].flatMap(k => PUNKTE.map(x => st.p[k][x].y));
    const T = len(sub(st.p.L.C, st.p.L.A)) * 0.26;
    out.push({ k: 'M', key: 'm', p: { x: st.mitte, y: Math.min(...ys) - T * 1.6 }, klein: true, txt: 'Mitte' });
    return out;
  }

  function startPunkte(W, H) {
    const m = W / 2, y = H * 0.4, u = Math.min(W, H * 0.8);
    const seite = f => ({ A: { x: m + f * u * 0.06, y: y + u * 0.018 }, A1: { x: m + f * u * 0.065, y: y - u * 0.022 },
      B: { x: m + f * u * 0.16, y: y - u * 0.04 }, B1: { x: m + f * u * 0.165, y: y - u * 0.005 }, C: { x: m + f * u * 0.23, y: y - u * 0.005 } });
    return { p: { L: seite(-1), R: seite(1) }, mitte: m, nase: { L: { x: m - u * 0.05, y: H * 0.6 }, R: { x: m + u * 0.05, y: H * 0.6 } } };
  }

  async function bildLaden(quelle) {
    let src;
    if (quelle instanceof Blob) src = await createImageBitmap(quelle);
    else { const img = new Image(); img.src = quelle; await img.decode(); src = img; }
    const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
    const s = Math.min(1, MAXPX / Math.max(w0, h0));
    const cv = document.createElement('canvas'); cv.width = Math.round(w0 * s); cv.height = Math.round(h0 * s);
    cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
    return cv;
  }

  // ---------- Oberfläche ----------
  FCC.brauenSim = async (c, fotos, gespeichert) => {
    const kandidaten = (fotos || []).filter(p => p.typ !== 'Simulation').slice(0, 10);
    const startFoto = kandidaten.find(p => p.typ === 'Vorher') || kandidaten[0] || null;
    const root = document.createElement('div');
    root.className = 'sim-bg';
    document.body.append(root);
    document.documentElement.style.overflow = 'hidden';
    const zu = () => { root.remove(); document.documentElement.style.overflow = ''; window.removeEventListener('resize', neu); };

    const st = { bild: null, p: null, mitte: 0, nase: null, mapping: false, sym: true, nah: false, neuDatei: null,
      o: { technik: 'powder', farbe: FARBEN[1][1], farbname: FARBEN[1][0], deck: 0.75, weich: 0.15, rundOben: 0.7, rundUnten: 0.7 } };

    root.innerHTML = `<div class="sim" role="dialog" aria-modal="true" aria-label="Brauen simulieren">
      <div class="sheet-head"><div class="wrap"><div><span class="label">${esc(c.vorname)} ${esc(c.nachname)}</span><h2>Brauen simulieren</h2></div><button class="btn ghost small" data-zu>Schließen</button></div></div>
      <div class="sim-body wrap">
        <div class="sim-fotos">
          ${kandidaten.map(p => `<button type="button" class="sim-th${p === startFoto ? ' on' : ''}" data-fid="${esc(p.fileId)}" aria-label="${esc(p.typ)} vom ${esc(fmt(p.datum))}"><img alt="" data-src="${esc(p.fileId)}"></button>`).join('')}
          <button type="button" class="btn ghost small" id="simNeu">${kandidaten.length ? '+ Anderes Foto' : '+ Foto machen oder wählen'}</button>
          <input type="file" id="simDatei" accept="image/*" hidden>
        </div>
        <div class="sim-buehne" id="simBuehne">
          <canvas id="simCv"></canvas>
          <div class="sim-oben"><div class="seg"><button type="button" data-v="0" class="on">Gesicht</button><button type="button" data-v="1">Nah</button></div>
            <button type="button" class="sim-pill" id="simMap" aria-pressed="false">Mapping</button></div>
          <div class="sim-unten"><span>Visuelle Simulation. Das abgeheilte Ergebnis kann abweichen.</span><button type="button" class="sim-pill" id="simVorher">Vorher</button></div>
          <div class="sim-leer" id="simLeer">${kandidaten.length ? 'Foto wird geladen …' : 'Mach ein Vorher-Foto von vorne, gerade Kopfhaltung, gleichmäßiges Licht.'}</div>
        </div>
        <p class="cmeta sim-tipp">Zieh die Punkte auf die Braue: <b>A</b> Anfang unten, <b>A1</b> Anfang oben, <b>B</b> Bogen oben, <b>B1</b> Bogen unten, <b>C</b> Ende. „Vorher“ gedrückt halten zeigt das Foto ohne Simulation.</p>
        <div class="sim-ctl">
          <div><span class="flabel">Technik</span><div class="chips" id="simTech">${TECHNIK.map(t => `<button type="button" class="chip${t.k === st.o.technik ? ' on' : ''}" data-t="${t.k}" title="${esc(t.t)}">${esc(t.l)}</button>`).join('')}</div></div>
          <div><span class="flabel">Farbton <b id="simFn">${esc(st.o.farbname)}</b></span><div class="sim-farben" id="simFarb">${FARBEN.map(([n, h], i) => `<button type="button" class="${i === 1 ? 'on' : ''}" data-f="${h}" data-n="${esc(n)}" style="background:${h}" aria-label="${esc(n)}" title="${esc(n)}"></button>`).join('')}</div></div>
          <label class="sim-reg"><span>Deckkraft <b data-w="deck">75 %</b></span><input type="range" min="10" max="100" value="75" data-o="deck"></label>
          <label class="sim-reg"><span>Rundung oben (Bogen bei B) <b data-w="rundOben">70 %</b></span><input type="range" min="0" max="100" value="70" data-o="rundOben"></label>
          <label class="sim-reg"><span>Rundung unten (bei B1) <b data-w="rundUnten">70 %</b></span><input type="range" min="0" max="100" value="70" data-o="rundUnten"></label>
          <label class="sim-reg"><span>Weichheit der Kontur <b data-w="weich">15 %</b></span><input type="range" min="0" max="100" value="15" data-o="weich"></label>
          <label class="sim-sw"><input type="checkbox" id="simSym" checked> Beide Seiten gleich (spiegeln an der Mitte)</label>
        </div>
      </div>
      <div class="sheet-foot"><div class="wrap"><button class="btn ghost" data-zu>Abbrechen</button><button class="btn" id="simSave" disabled>In Akte speichern</button></div></div>
    </div>`;
    const $ = s => root.querySelector(s);
    root.querySelectorAll('[data-zu]').forEach(b => b.onclick = zu);
    const cv = $('#simCv'), ctx = cv.getContext('2d');
    let anzeige = null, ziehen = null, vorher = false;

    function ansicht() {
      if (!st.nah) return { x: 0, y: 0, w: st.bild.width, h: st.bild.height };
      const pts = ['L', 'R'].flatMap(k => PUNKTE.map(x => st.p[k][x]));
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      const bw = Math.max(...xs) - Math.min(...xs), cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      const w = Math.min(st.bild.width, bw * 1.45), h = Math.min(st.bild.height, w * 0.62);
      return { x: Math.max(0, Math.min(st.bild.width - w, cx - w / 2)), y: Math.max(0, Math.min(st.bild.height - h, cy - h * 0.45)), w, h };
    }

    function malen() {
      if (!st.bild) return;
      const v = ansicht();
      const box = $('#simBuehne');
      const maxH = Math.max(260, window.innerHeight * 0.56);
      let cssW = box.clientWidth, cssH = cssW * v.h / v.w;
      if (cssH > maxH) { cssH = maxH; cssW = cssH * v.w / v.h; }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
      cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
      anzeige = { v, sc: cv.width / v.w, dpr };
      zeichne(ctx, cv.width, cv.height, st, v, { vorher, punkte: !vorher, beschriftung: st.nah || cssW > 560 });
    }
    const neu = () => malen();
    window.addEventListener('resize', neu);

    async function fotoWaehlen(quelle, neueDatei) {
      $('#simLeer').hidden = false; $('#simLeer').textContent = 'Foto wird geladen …';
      try {
        st.bild = await bildLaden(quelle);
        st.neuDatei = neueDatei || null;
        Object.assign(st, startPunkte(st.bild.width, st.bild.height));
        $('#simLeer').hidden = true; $('#simSave').disabled = false;
        malen();
      } catch (err) { $('#simLeer').textContent = 'Das Foto lässt sich nicht öffnen. Bitte ein anderes wählen.'; }
    }

    // Vorschaubilder der vorhandenen Fotos
    root.querySelectorAll('img[data-src]').forEach(async img => {
      const p = kandidaten.find(x => x.fileId === img.dataset.src);
      try { img.src = await Store.photoUrl(p); } catch (e) {}
    });
    root.querySelectorAll('.sim-th').forEach(b => b.onclick = async () => {
      root.querySelectorAll('.sim-th').forEach(x => x.classList.toggle('on', x === b));
      const p = kandidaten.find(x => x.fileId === b.dataset.fid);
      try { await fotoWaehlen(await Store.photoUrl(p)); } catch (e) { FCC.toast && FCC.toast('Foto lädt nicht', true); }
    });
    $('#simNeu').onclick = () => $('#simDatei').click();
    $('#simDatei').onchange = e => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      root.querySelectorAll('.sim-th').forEach(x => x.classList.remove('on'));
      fotoWaehlen(f, f);
    };

    // Einstellungen
    root.querySelectorAll('#simTech .chip').forEach(b => b.onclick = () => {
      st.o.technik = b.dataset.t; root.querySelectorAll('#simTech .chip').forEach(x => x.classList.toggle('on', x === b)); malen();
    });
    root.querySelectorAll('#simFarb button').forEach(b => b.onclick = () => {
      st.o.farbe = b.dataset.f; st.o.farbname = b.dataset.n; $('#simFn').textContent = b.dataset.n;
      root.querySelectorAll('#simFarb button').forEach(x => x.classList.toggle('on', x === b)); malen();
    });
    root.querySelectorAll('[data-o]').forEach(r => { const w = () => { st.o[r.dataset.o] = Number(r.value) / 100; $(`[data-w="${r.dataset.o}"]`).textContent = r.value + ' %'; malen(); }; r.oninput = w; r.onchange = w; });
    $('#simSym').onchange = e => {
      st.sym = e.target.checked;
      if (st.sym && st.bild) { // rechte Seite an der Mitte spiegeln
        PUNKTE.forEach(k => { st.p.R[k] = { x: 2 * st.mitte - st.p.L[k].x, y: st.p.L[k].y }; });
        st.nase.R = { x: 2 * st.mitte - st.nase.L.x, y: st.nase.L.y };
        malen();
      }
    };
    root.querySelectorAll('.seg [data-v]').forEach(b => b.onclick = () => {
      st.nah = b.dataset.v === '1'; root.querySelectorAll('.seg [data-v]').forEach(x => x.classList.toggle('on', x === b)); malen();
    });
    $('#simMap').onclick = e => { st.mapping = !st.mapping; e.currentTarget.classList.toggle('on', st.mapping); e.currentTarget.setAttribute('aria-pressed', st.mapping); malen(); };
    const vb = $('#simVorher');
    const vAn = e => { e.preventDefault(); vorher = true; malen(); }, vAus = () => { if (vorher) { vorher = false; malen(); } };
    vb.addEventListener('pointerdown', vAn); vb.addEventListener('pointerup', vAus); vb.addEventListener('pointerleave', vAus); vb.addEventListener('pointercancel', vAus);

    // Punkte ziehen (Finger, Stift, Maus)
    const bildPunkt = e => { const r = cv.getBoundingClientRect(); const v = anzeige.v; return { x: v.x + (e.clientX - r.left) / r.width * v.w, y: v.y + (e.clientY - r.top) / r.height * v.h }; };
    cv.addEventListener('pointerdown', e => {
      if (!st.bild || !anzeige) return;
      const p = bildPunkt(e);
      const r = cv.getBoundingClientRect(); const proPx = anzeige.v.w / r.width;
      let best = null, bd = 26 * proPx;
      griffe(st).forEach(g => { const d = Math.hypot(g.p.x - p.x, g.p.y - p.y); if (d < bd) { bd = d; best = g; } });
      if (!best) return;
      e.preventDefault();
      ziehen = { g: best, start: p, mitte0: st.mitte, alt: JSON.parse(JSON.stringify({ p: st.p, nase: st.nase })) };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', e => {
      if (!ziehen) return;
      e.preventDefault();
      const p = bildPunkt(e);
      const g = ziehen.g;
      const W = st.bild.width, H = st.bild.height;
      const klemm = q => ({ x: Math.max(0, Math.min(W, q.x)), y: Math.max(0, Math.min(H, q.y)) });
      if (g.key === 'm') {
        const dx = p.x - ziehen.start.x;
        st.mitte = ziehen.mitte0 + dx;
        ['L', 'R'].forEach(k => { PUNKTE.forEach(x => { st.p[k][x] = { x: ziehen.alt.p[k][x].x + dx, y: ziehen.alt.p[k][x].y }; }); st.nase[k] = { x: ziehen.alt.nase[k].x + dx, y: ziehen.alt.nase[k].y }; });
      } else {
        const q = klemm(p);
        const anderes = g.k === 'L' ? 'R' : 'L';
        if (g.key === 'n') st.nase[g.k] = q; else st.p[g.k][g.key] = q;
        if (st.sym) {
          const sp = { x: 2 * st.mitte - q.x, y: q.y };
          if (g.key === 'n') st.nase[anderes] = sp; else st.p[anderes][g.key] = sp;
        }
      }
      malen();
    });
    const loslassen = () => { ziehen = null; };
    cv.addEventListener('pointerup', loslassen); cv.addEventListener('pointercancel', loslassen);

    // Speichern: Foto in voller Arbeitsgröße mit Simulation und Hinweiszeile, als Foto „Simulation“ in die Akte
    $('#simSave').onclick = async e => {
      const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Speichert …';
      try {
        const W = st.bild.width, H = st.bild.height;
        const out = document.createElement('canvas'); out.width = W; out.height = H;
        const oc = out.getContext('2d');
        zeichne(oc, W, H, st, { x: 0, y: 0, w: W, h: H }, { vorher: false, punkte: false });
        const fs = Math.max(14, Math.round(W / 55));
        oc.setTransform(1, 0, 0, 1, 0, 0);
        oc.fillStyle = 'rgba(30,22,18,.62)'; oc.fillRect(0, H - fs * 2.2, W, fs * 2.2);
        oc.fillStyle = '#fff'; oc.font = `500 ${fs}px Jost, system-ui, sans-serif`; oc.textBaseline = 'middle';
        const tech = (TECHNIK.find(t => t.k === st.o.technik) || {}).l;
        oc.fillText(`Simulation · ${tech} · ${st.o.farbname} · ${fmt(today())} · Ergebnis kann abweichen`, fs * 0.8, H - fs * 1.1);
        const blob = await new Promise(r => out.toBlob(r, 'image/jpeg', 0.9));
        const datei = new File([blob], 'simulation.jpg', { type: 'image/jpeg' });
        c.fotos = c.fotos || [];
        if (st.neuDatei) { // neues Foto zusätzlich als Vorher-Foto ablegen
          const n = c.fotos.filter(p => p.typ === 'Vorher' && p.datum === today()).length + 1;
          const pv = await Store.addPhoto(c, st.neuDatei, `${today()}_Vorher_${n}.jpg`);
          c.fotos.push({ ...pv, typ: 'Vorher', datum: today() });
          st.neuDatei = null;
        }
        const n = c.fotos.filter(p => p.typ === 'Simulation' && p.datum === today()).length + 1;
        const p = await Store.addPhoto(c, datei, `${today()}_Simulation_${n}.jpg`);
        c.fotos.push({ ...p, typ: 'Simulation', datum: today(), sim: { technik: tech, farbe: st.o.farbname } });
        await Store.save(c);
        FCC.toast && FCC.toast('Simulation in der Akte gespeichert');
        zu();
        gespeichert && gespeichert();
      } catch (err) {
        btn.disabled = false; btn.textContent = 'In Akte speichern';
        FCC.toast && FCC.toast('Nicht gespeichert: ' + err.message, true);
      }
    };

    if (startFoto) { try { await fotoWaehlen(await Store.photoUrl(startFoto)); } catch (e) { $('#simLeer').textContent = 'Foto lädt nicht. Bitte ein anderes wählen.'; } }
  };

  const css = document.createElement('style');
  css.textContent = `
    .sim-bg{position:fixed;inset:0;z-index:60;background:var(--shade);display:flex;align-items:stretch;justify-content:center}
    .sim{background:var(--bg);width:min(1100px,100%);display:flex;flex-direction:column;height:100%}
    .sim .sheet-foot{position:static;width:auto}
    .sim .sheet-head,.sim .sheet-foot{flex-shrink:0}
    .sim-body{overflow:auto;flex:1;padding-top:12px;padding-bottom:16px;-webkit-overflow-scrolling:touch}
    .sim-fotos{display:flex;gap:8px;align-items:center;overflow-x:auto;padding-bottom:8px}
    .sim-th{flex-shrink:0;width:52px;height:52px;border-radius:10px;overflow:hidden;border:2px solid var(--line);padding:0;background:var(--paper)}
    .sim-th.on{border-color:var(--rose)}.sim-th img{width:100%;height:100%;object-fit:cover;display:block}
    .sim-buehne{position:relative;display:flex;justify-content:center;background:#16120f;border-radius:var(--r);overflow:hidden;min-height:260px}
    .sim-buehne canvas{display:block;touch-action:none;cursor:crosshair}
    .sim-oben{position:absolute;top:10px;right:10px;left:10px;display:flex;justify-content:flex-end;gap:8px;pointer-events:none}
    .sim-oben>*{pointer-events:auto}
    .sim-oben .seg{background:rgba(30,22,18,.6);border-color:transparent}.sim-oben .seg button{color:#e9ddd5}.sim-oben .seg button.on{background:#fffdfb;color:#2b2522}
    .sim-pill{border:0;border-radius:99px;padding:6px 14px;background:rgba(30,22,18,.6);color:#f1e9e4;font:inherit;font-size:13px;-webkit-user-select:none;user-select:none;touch-action:none}
    .sim-pill.on{background:#fffdfb;color:#2b2522}
    .sim-unten{position:absolute;left:10px;right:10px;bottom:10px;display:flex;justify-content:space-between;align-items:flex-end;gap:10px;pointer-events:none}
    .sim-unten span{background:rgba(30,22,18,.62);color:#f1e9e4;font-size:12px;border-radius:8px;padding:5px 9px;max-width:70%}
    .sim-unten button{pointer-events:auto}
    .sim-leer{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e9ddd5;padding:24px;text-align:center}
    .sim-tipp{margin:8px 2px 4px}
    .sim-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px 22px;background:var(--paper);border:1px solid var(--line);border-radius:var(--r);padding:16px}
    .sim-ctl .flabel b{font-weight:500;color:var(--rose-ink);margin-left:6px}
    .sim-farben{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
    .sim-farben button{width:34px;height:34px;border-radius:50%;border:2px solid var(--paper);box-shadow:0 0 0 1px var(--line);padding:0}
    .sim-farben button.on{box-shadow:0 0 0 2px var(--rose)}
    .sim-reg{display:flex;flex-direction:column;gap:4px;font-size:13.5px;color:var(--muted)}.sim-reg b{color:var(--rose-ink);font-weight:500;font-variant-numeric:tabular-nums;margin-left:4px}
    .sim-reg input{width:100%;accent-color:var(--rose)}
    .sim-sw{display:flex;gap:8px;align-items:center;font-size:14px}
    .sim-sw input{width:20px;height:20px;accent-color:var(--rose)}`;
  document.head.append(css);
})();
