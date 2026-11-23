// Beratung am Vorher-Foto: Brauen oder Lippen simulieren, in sechs Schritten.
// 1 Foto · 2 Punkte · 3 Technik und Farbe · 4 Anpassen · 5 Vergleich · 6 Speichern
// Läuft komplett im Browser: Das Foto verlässt das Gerät nur, wenn du das Ergebnis in der Akte speicherst
// (dann in deinen eigenen Google-Drive-Ordner). Die automatische Erkennung (gesicht.js) läuft ebenfalls nur auf dem Gerät.
// Brauen: Du setzt die fünf Punkte A, A1, B, B1 und C wie beim Vorzeichnen nach Anatomie.
// Lippen: Die Simulation bleibt immer innerhalb der natürlichen Lippenlinie, nichts wird vergrößert.
(function () {
  const FCC = window.FCC = window.FCC || {};
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const fmt = d => d ? new Date(d + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const de = (n, s = 1) => n == null || !isFinite(n) ? '–' : n.toFixed(s).replace('.', ',');
  const MAXPX = 1600; // Arbeitsgröße des Fotos
  const PUPILLE_MM = 62; // mittlerer Pupillenabstand Erwachsener, Maßstab für die Millimeter (Richtwert)

  // ---------- Geometrie ----------
  const sub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y });
  const add = (p, q, f = 1) => ({ x: p.x + q.x * f, y: p.y + q.y * f });
  const len = v => Math.hypot(v.x, v.y) || 1;
  const nrm = v => { const l = len(v); return { x: v.x / l, y: v.y / l }; };
  const mitteVon = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

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
  function gerade(pts, n) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < n; k++) { const t = k / n; out.push({ x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t }); }
    out.push(pts[pts.length - 1]);
    return out;
  }
  const mischen = (a, b, r) => a.map((p, i) => ({ x: p.x + (b[i].x - p.x) * r, y: p.y + (b[i].y - p.y) * r }));
  function an(l, t) { const x = Math.max(0, Math.min(1, t)) * (l.length - 1), i = Math.min(l.length - 2, Math.floor(x)), f = x - i; return { x: l[i].x + (l[i + 1].x - l[i].x) * f, y: l[i].y + (l[i + 1].y - l[i].y) * f }; }
  function rng(seed) { let s = (seed * 2654435761) >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`; }

  // Weichzeichnen: mit Unschärfe-Filter, wo der Browser ihn kann, sonst stufenweise (ohne Pixeltreppen)
  const FILTER_OK = (() => { try { const c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch (e) { return false; } })();
  function weich(cv, r) {
    if (r < 0.4) return cv;
    const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height;
    const oc = o.getContext('2d');
    if (FILTER_OK) { oc.filter = `blur(${r.toFixed(2)}px)`; oc.drawImage(cv, 0, 0); return o; }
    const stufen = Math.max(1, Math.min(6, Math.round(Math.log2(r * 1.4))));
    let cur = cv; const kette = [];
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

  // ---------- Punkte ----------
  // Alle Punkte stehen in st.pt unter Schlüsseln wie 'L.A' (links im Bild), 'R.A', 'Z.OM' (Mitte), 'P.L' (Pupille), 'N.L' (Nasenflügel)
  const partner = k => { const [s, n] = k.split('.'); return s === 'L' ? 'R.' + n : s === 'R' ? 'L.' + n : n === 'L' ? s + '.R' : n === 'R' ? s + '.L' : null; };
  const seite = (st, s, keys) => Object.fromEntries(keys.map(k => [k, st.pt[s + '.' + k]]));
  // Millimeter pro Bildpunkt aus dem Pupillenabstand
  const mmProPx = st => PUPILLE_MM / len(sub(st.pt['P.L'], st.pt['P.R']));

  // =========================================================================================
  // BRAUEN
  // =========================================================================================
  const B_PUNKTE = ['A', 'A1', 'B', 'B1', 'C'];
  // Feinschliff in Millimetern auf die gesetzten Punkte (nicht zerstörend: die Punkte selbst bleiben, wie du sie gesetzt hast)
  function bSeite(st, s, o) {
    const p = seite(st, s, B_PUNKTE); const a = (o || st.o).adj || {}; const px = 1 / mmProPx(st);
    if (!a.bogen && !a.ende && !a.laenge && !a.dicke) return p;
    const q = JSON.parse(JSON.stringify(p));
    const dir = nrm(sub(q.C, mitteVon(q.A, q.A1)));
    if (a.bogen) { q.B.y -= a.bogen * px; q.B1.y -= a.bogen * px; }
    if (a.ende) q.C.y -= a.ende * px;
    if (a.laenge) { q.C = add(q.C, dir, a.laenge * px); }
    if (a.dicke) { const d = a.dicke * px / 2; q.A1.y -= d; q.B.y -= d; q.A.y += d; q.B1.y += d; }
    return q;
  }
  function bForm(s, o = {}) {
    const kopfMitte = mitteVon(s.A, s.A1);
    const L = len(sub(s.C, kopfMitte));
    const dir = nrm(sub(s.C, kopfMitte));
    let down = { x: -dir.y, y: dir.x }; if (down.y < 0) down = { x: -down.x, y: -down.y };
    const T = Math.max(len(sub(s.A, s.A1)), len(sub(s.B, s.B1)), L * 0.05);
    const back = { x: -dir.x, y: -dir.y };
    const kopf = add(kopfMitte, back, len(sub(s.A, s.A1)) * 0.42);
    const bg = o.bogen == null ? 0.5 : o.bogen;
    const top = mischen(gerade([s.A1, s.B, s.C], 28), spline([s.A1, s.B, s.C], 28), bg);
    const bot = mischen(gerade([s.A, s.B1, s.C], 28), spline([s.A, s.B1, s.C], 28), bg);
    const up = { x: -down.x, y: -down.y };
    const woelben = (l, von) => { const lang = len(sub(s.C, von)); for (let i = 28; i < l.length; i++) { const t = (i - 28) / 28; const w = Math.sin(Math.PI * t) * bg * lang * 0.14; l[i] = add(l[i], up, w); } };
    woelben(top, s.B); woelben(bot, s.B1);
    return { top, bot, kopf, aTop: s.A1, aBot: s.A, T, L, dir, down };
  }
  function bPfad(ctx, f) {
    ctx.beginPath(); ctx.moveTo(f.aBot.x, f.aBot.y);
    ctx.quadraticCurveTo(f.kopf.x, f.kopf.y, f.aTop.x, f.aTop.y);
    f.top.forEach(p => ctx.lineTo(p.x, p.y));
    [...f.bot].reverse().forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
  }
  const B_STOPS = { ombre: [[0, .06], [.3, .4], [.7, .95], [1, 1]], kombi: [[0, 0], [.22, 0], [.4, .7], [.8, .95], [1, .9]], powder: [[0, .28], [.22, .72], [.8, .95], [1, .85]] };
  function bVerlauf(ctx, f, s, technik, farbe, deck) {
    const g = ctx.createLinearGradient(f.kopf.x, f.kopf.y, s.C.x, s.C.y);
    (B_STOPS[technik] || B_STOPS.powder).forEach(([p, a]) => g.addColorStop(p, rgba(farbe, a * deck)));
    return g;
  }
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
  function koernung(ctx, f, s, o, seed, stops, sc) {
    const r = rng(seed);
    const flaeche = f.L * f.T * 0.8;
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

  const BRAUEN = {
    id: 'brauen', titel: 'Brauen-Beratung', wort: 'Brauen',
    schritte: ['Foto', 'Punkte', 'Technik', 'Anpassen', 'Vergleich', 'Speichern'],
    technik: [
      { k: 'powder', l: 'Powder Brows', t: 'zart gepudert, vorne weich' },
      { k: 'ombre', l: 'Ombré Brows', t: 'vorne sehr hell, nach hinten kräftiger' },
      { k: 'hair', l: 'Hairstroke maschinell', t: 'feine Härchen, natürlich' },
      { k: 'kombi', l: 'Kombination', t: 'Härchen vorne, Puder nach hinten' }
    ],
    farben: [['Taupe', '#8c7a6b'], ['Soft Brown', '#7d5c47'], ['Mittelbraun', '#5f4535'], ['Warmbraun', '#6e4630'], ['Aschbraun', '#5a5049'], ['Dunkelbraun', '#3e2d24'], ['Graphit', '#38332f']],
    startFarbe: 1,
    o: { technik: 'powder', deck: 0.75, weich: 0.15, bogen: 0.5, adj: { bogen: 0, ende: 0, laenge: 0, dicke: 0 } },
    regler: [['deck', 'Deckkraft'], ['bogen', 'Bogen bei B und B1'], ['weich', 'Weichheit der Kontur']],
    feinschliff: [['dicke', 'Dicke'], ['bogen', 'Bogen höher'], ['ende', 'Ende höher'], ['laenge', 'Länge']],
    namen: { A: 'A Anfang unten', A1: 'A1 Anfang oben', B: 'B Bogen oben', B1: 'B1 Bogen unten', C: 'C Ende', N: 'Nasenflügel', P: 'Pupille' },
    tipp: 'Zieh die Punkte auf die Braue: <b>A</b> Anfang unten, <b>A1</b> Anfang oben, <b>B</b> Bogen oben, <b>B1</b> Bogen unten, <b>C</b> Ende. Die beiden <b>Pupillen-Punkte</b> auf die Mitte der Pupillen, daraus rechnet die Kartei die Millimeter.',
    start(W, H) {
      const m = W / 2, y = H * 0.4, u = Math.min(W, H * 0.8);
      const pt = {};
      [['L', -1], ['R', 1]].forEach(([s, f]) => {
        pt[s + '.A'] = { x: m + f * u * 0.06, y: y + u * 0.018 }; pt[s + '.A1'] = { x: m + f * u * 0.065, y: y - u * 0.022 };
        pt[s + '.B'] = { x: m + f * u * 0.16, y: y - u * 0.04 }; pt[s + '.B1'] = { x: m + f * u * 0.165, y: y - u * 0.005 };
        pt[s + '.C'] = { x: m + f * u * 0.23, y: y - u * 0.005 };
        pt['N.' + s] = { x: m + f * u * 0.05, y: H * 0.6 };
        pt['P.' + s] = { x: m + f * u * 0.13, y: y + u * 0.09 };
      });
      return { pt, mitte: m };
    },
    // Welche Punkte sind im Schritt „Punkte“ greifbar?
    griffe(st) {
      const out = [];
      ['L', 'R'].forEach(s => B_PUNKTE.forEach(k => out.push({ key: s + '.' + k, txt: k })));
      ['L', 'R'].forEach(s => out.push({ key: 'P.' + s, txt: 'Pupille', pupille: true }));
      if (st.mapping) ['L', 'R'].forEach(s => out.push({ key: 'N.' + s, txt: 'Nasenflügel', nase: true }));
      return out;
    },
    // Ausschnitt „Nah“: um die Brauen
    nah(st) { return ['L', 'R'].flatMap(s => B_PUNKTE.map(k => st.pt[s + '.' + k])); },
    zeichne(st, sc, view, W, H, o) {
      const neu = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.setTransform(sc, 0, 0, sc, -view.x * sc, -view.y * sc); return [c, x]; };
      const [pud, pc] = neu(); const [kor, kc] = neu();
      const tech = o.technik, deck = o.deck;
      const seiten = ['L', 'R'].map(k => { const s = bSeite(st, k, o); return { k, s, f: bForm(s, o) }; });
      seiten.forEach(({ k, s, f }) => {
        const stops = tech === 'hair' ? B_STOPS.powder : (B_STOPS[tech] || B_STOPS.powder);
        bPfad(pc, f); pc.fillStyle = bVerlauf(pc, f, s, tech === 'hair' ? 'powder' : tech, o.farbe, deck * (tech === 'hair' ? 0.16 : 0.72)); pc.fill();
        kc.save(); bPfad(kc, f); kc.clip();
        if (tech !== 'hair') koernung(kc, f, s, { farbe: o.farbe, deck }, k === 'L' ? 3 : 5, stops, sc);
        if (tech === 'hair' || tech === 'kombi') haerchen(kc, f, s, { farbe: o.farbe, deck }, k === 'L' ? 7 : 11, tech === 'kombi');
        kc.restore();
      });
      const tPx = Math.max(...seiten.map(x => x.f.T)) * sc;
      const rand = tPx * (0.004 + o.weich * 0.13);
      return [{ cv: weich(pud, rand), op: 'multiply' }, { cv: weich(kor, Math.min(rand * 0.18, tPx * 0.02)), op: 'multiply' }];
    },
    hilfslinien(ctx, st, z) {
      ['A', 'A1', 'B'].forEach(key => { const p = z(st.pt['L.' + key]), q = z(st.pt['R.' + key]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); });
      if (st.mapping) {
        ctx.strokeStyle = 'rgba(214,170,140,.95)';
        ['L', 'R'].forEach(s => {
          const n = z(st.pt['N.' + s]);
          ['A', 'B', 'C'].forEach(key => { const p = z(st.pt[s + '.' + key]); ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(p.x + (p.x - n.x) * 0.25, p.y + (p.y - n.y) * 0.25); ctx.stroke(); });
          ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(n.x, 0); ctx.stroke();
        });
      }
    },
    // Messwerte in Millimetern (Richtwerte über den Pupillenabstand)
    messwerte(st) {
      const mm = mmProPx(st);
      const L = bSeite(st, 'L'), R = bSeite(st, 'R');
      const kopf = s => mitteVon(s.A, s.A1);
      const d = (p, q) => len(sub(p, q)) * mm;
      const hoch = (s, p) => (kopf(s).y - p.y) * mm;
      return [
        ['Abstand der Brauenanfänge', de(d(kopf(L), kopf(R))) + ' mm'],
        ['Länge links / rechts', de(d(kopf(L), L.C)) + ' / ' + de(d(kopf(R), R.C)) + ' mm'],
        ['Bogenhöhe über Anfang L / R', de(hoch(L, L.B)) + ' / ' + de(hoch(R, R.B)) + ' mm'],
        ['Höhenunterschied der Bögen', de(Math.abs(L.B.y - R.B.y) * mm) + ' mm'],
        ['Ende über Anfang L / R', de(hoch(L, L.C)) + ' / ' + de(hoch(R, R.C)) + ' mm'],
        ['Dicke am Bogen L / R', de(d(L.B, L.B1)) + ' / ' + de(d(R.B, R.B1)) + ' mm']
      ];
    },
    // Punkte aus der automatischen Gesichtserkennung (478 Punkte, MediaPipe Face Landmarker)
    auto(lm, W, H) {
      const P = i => ({ x: lm[i].x * W, y: lm[i].y * H });
      const gruppen = [
        { unten: [46, 53, 52, 65, 55], oben: [70, 63, 105, 66, 107] },
        { unten: [276, 283, 282, 295, 285], oben: [300, 293, 334, 296, 336] }
      ];
      const avgX = g => g.oben.reduce((a, i) => a + lm[i].x, 0) / 5;
      gruppen.sort((a, b) => avgX(a) - avgX(b)); // links im Bild zuerst
      const pt = {};
      gruppen.forEach((g, i) => {
        const s = i === 0 ? 'L' : 'R';
        // Bogen = höchster Punkt der oberen Linie (ohne Anfang und Ende), B1 der Punkt darunter
        const kand = [1, 2, 3].sort((a, b) => lm[g.oben[a]].y - lm[g.oben[b]].y)[0];
        pt[s + '.A'] = P(g.unten[4]); pt[s + '.A1'] = P(g.oben[4]);
        pt[s + '.B'] = P(g.oben[kand]); pt[s + '.B1'] = P(g.unten[kand]);
        pt[s + '.C'] = mitteVon(P(g.unten[0]), P(g.oben[0]));
      });
      // Pupillen (Iris-Mitte) und Nasenflügel nach ihrer Lage im Bild zuordnen
      const pup = (lm.length > 473 ? [P(468), P(473)] : [mitteVon(P(33), P(133)), mitteVon(P(362), P(263))]).sort((a, b) => a.x - b.x);
      const nase = [P(129), P(358)].sort((a, b) => a.x - b.x);
      pt['P.L'] = pup[0]; pt['P.R'] = pup[1]; pt['N.L'] = nase[0]; pt['N.R'] = nase[1];
      return { pt, mitte: lm[168].x * W };
    },
    speichernText(st, o, tech, farbe) { return `Beratung Brauen · ${tech} · ${farbe}`; }
  };

  // =========================================================================================
  // LIPPEN
  // =========================================================================================
  // Je Seite: W Mundwinkel, O1 Oberlippe außen, O2 Amorbogen-Spitze, U1 Unterlippe außen, U2 Unterlippe mittig
  // Mitte: OM Amorbogen-Tal, S Mundspalte, UM Unterlippe unten
  const L_SEITE = ['W', 'O1', 'O2', 'U1', 'U2'], L_MITTE = ['OM', 'S', 'UM'];
  function lKontur(st, innen) {
    const g = k => st.pt[k];
    let ob = [...spline([g('L.W'), g('L.O1'), g('L.O2')], 14), ...spline([g('L.O2'), g('Z.OM'), g('R.O2')], 6).slice(1), ...spline([g('R.O2'), g('R.O1'), g('R.W')], 14).slice(1)];
    let un = spline([g('R.W'), g('R.U1'), g('R.U2'), g('Z.UM'), g('L.U2'), g('L.U1'), g('L.W')], 12);
    const naht = spline([g('L.W'), mitteVon(g('L.W'), g('Z.S')), g('Z.S'), mitteVon(g('R.W'), g('Z.S')), g('R.W')], 10);
    naht[Math.floor(naht.length / 4)].y = (naht[Math.floor(naht.length / 4)].y * 2 + g('Z.S').y) / 3;
    // Kontur nach innen: alle Punkte ein Stück zur Mitte der Lippe hin (nie nach außen)
    if (innen > 0) {
      const alle = ob.concat(un); const m = { x: alle.reduce((a, p) => a + p.x, 0) / alle.length, y: alle.reduce((a, p) => a + p.y, 0) / alle.length };
      const breite = len(sub(g('L.W'), g('R.W'))) / 2;
      const zur = l => l.map(p => { const v = sub(m, p); const d = len(v); const s = Math.min(innen, d * 0.45); return add(p, { x: v.x / d, y: v.y / d * 1.6 }, s * Math.min(1, breite / d * 0.35 + 0.65)); });
      ob = zur(ob); un = zur(un);
    }
    return { ob, un, naht };
  }
  function lPfad(ctx, k) {
    ctx.beginPath(); k.ob.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); k.un.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath();
  }
  const LIPPEN = {
    id: 'lippen', titel: 'Lippen-Beratung', wort: 'Lippen',
    schritte: ['Foto', 'Lippenkontur', 'Technik', 'Anpassen', 'Vergleich', 'Speichern'],
    technik: [
      { k: 'aquarell', l: 'Aquarell / Lip Blush', t: 'natürlich und transparent, weicher Rand, wie ein Hauch Farbe' },
      { k: 'full', l: 'Full Lip', t: 'satte Farbe, klar definierte Lippenlinie' },
      { k: 'kontur', l: 'Contour & Ombré', t: 'definierte Kontur, zur Mitte hin heller' },
      { k: 'neutral', l: 'Dark Lip Neutralisation', t: 'hellt dunkle Lippen auf und gleicht sie warm aus' }
    ],
    farben: [['Nude Rose', '#c98b86'], ['Soft Peach', '#e3a587'], ['Coral', '#e0745e'], ['Rosewood', '#9e5b5b'], ['Mauve', '#a8727e'], ['Berry', '#8e3b54'], ['Cherry Red', '#b8303a'], ['Brick', '#a64b3a'], ['Pink Nude', '#d79a9e'], ['Warm Salmon', '#e48a72']],
    startFarbe: 0,
    o: { technik: 'aquarell', deck: 0.6, weich: 0.6, innen: 0, ombre: 0.6 },
    regler: [['deck', 'Farbintensität'], ['weich', 'Weichheit der Kante'], ['ombre', 'Ombré-Verlauf (nur Contour & Ombré)']],
    innenRegler: true,
    namen: { W: 'Mundwinkel', O1: 'Oberlippe außen', O2: 'Amorbogen-Spitze', U1: 'Unterlippe außen', U2: 'Unterlippe Mitte seitlich', OM: 'Amorbogen Mitte', S: 'Mundspalte', UM: 'Unterlippe unten', P: 'Pupille' },
    tipp: 'Zieh die Punkte genau auf die <b>natürliche Lippenlinie</b>: Mundwinkel, Amorbogen, Mitte der Unterlippe und die <b>Mundspalte</b> in der Mitte. Die Simulation bleibt immer innerhalb dieser Linie. Die <b>Pupillen-Punkte</b> braucht die Kartei für die Millimeter.',
    start(W, H) {
      const m = W / 2, u = Math.min(W, H * 0.8), y = H * 0.72;
      const pt = {};
      [['L', -1], ['R', 1]].forEach(([s, f]) => {
        pt[s + '.W'] = { x: m + f * u * 0.13, y }; pt[s + '.O1'] = { x: m + f * u * 0.085, y: y - u * 0.035 }; pt[s + '.O2'] = { x: m + f * u * 0.03, y: y - u * 0.05 };
        pt[s + '.U1'] = { x: m + f * u * 0.085, y: y + u * 0.045 }; pt[s + '.U2'] = { x: m + f * u * 0.04, y: y + u * 0.065 };
        pt['P.' + s] = { x: m + f * u * 0.13, y: H * 0.4 };
      });
      pt['Z.OM'] = { x: m, y: y - u * 0.04 }; pt['Z.S'] = { x: m, y: y + u * 0.005 }; pt['Z.UM'] = { x: m, y: y + u * 0.07 };
      return { pt, mitte: m };
    },
    griffe() {
      const out = [];
      ['L', 'R'].forEach(s => L_SEITE.forEach(k => out.push({ key: s + '.' + k, txt: '' })));
      L_MITTE.forEach(k => out.push({ key: 'Z.' + k, txt: k === 'S' ? 'Mundspalte' : '' }));
      ['L', 'R'].forEach(s => out.push({ key: 'P.' + s, txt: 'Pupille', pupille: true }));
      return out;
    },
    nah(st) { return ['L', 'R'].flatMap(s => L_SEITE.map(k => st.pt[s + '.' + k])).concat(L_MITTE.map(k => st.pt['Z.' + k])); },
    zeichne(st, sc, view, W, H, o) {
      const neu = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.setTransform(sc, 0, 0, sc, -view.x * sc, -view.y * sc); return [c, x]; };
      const innenPx = (o.innen || 0) / mmProPx(st);
      const k = lKontur(st, innenPx);
      const breite = len(sub(st.pt['L.W'], st.pt['R.W']));
      const [fl, fc] = neu();
      const tech = o.technik, deck = o.deck;
      const ebenen = [];
      if (tech === 'neutral') {
        // Neutralisieren: warmer Ton über die Lippe (Farbe), danach ein zarter Hauch des gewählten Pigments
        const [nt, nc] = neu();
        lPfad(nc, k); nc.fillStyle = rgba('#e9a07a', 0.55 * deck); nc.fill();
        if (st.mund) { nc.globalCompositeOperation = 'destination-out'; nc.beginPath(); st.mund.forEach((p, i) => i ? nc.lineTo(p.x, p.y) : nc.moveTo(p.x, p.y)); nc.closePath(); nc.fill(); nc.globalCompositeOperation = 'source-over'; }
        ebenen.push({ cv: weich(nt, breite * sc * (0.004 + o.weich * 0.03)), op: 'color' });
        lPfad(fc, k); fc.fillStyle = rgba(o.farbe, 0.25 * deck); fc.fill();
        ebenen.push({ cv: weich(fl, breite * sc * (0.004 + o.weich * 0.03)), op: 'multiply' });
        return ebenen;
      }
      fc.save(); lPfad(fc, k); fc.clip();
      const a = tech === 'full' ? 0.85 : tech === 'kontur' ? 0.4 : 0.45;
      lPfad(fc, k); fc.fillStyle = rgba(o.farbe, a * deck); fc.fill();
      if (tech === 'kontur') {
        // Kontur kräftig, zur Mitte heller: dicker Rand innen, nach innen auslaufend
        const dick = breite * (0.04 + o.ombre * 0.08);
        fc.lineJoin = 'round';
        for (let i = 4; i >= 1; i--) { fc.lineWidth = dick * i / 2; fc.strokeStyle = rgba(o.farbe, deck * 0.22); lPfad(fc, k); fc.stroke(); }
      }
      fc.restore();
      const rand = breite * sc * (tech === 'full' ? 0.002 + o.weich * 0.012 : 0.006 + o.weich * 0.035);
      // Unschärfe nur nach innen: weiche Ebene, dann auf die Lippe zuschneiden, damit nichts über die Lippenlinie läuft
      const w = weich(fl, rand);
      const [cl, cc] = neu(); cc.save(); lPfad(cc, k); cc.clip(); cc.setTransform(1, 0, 0, 1, 0, 0); cc.drawImage(w, 0, 0); cc.restore();
      if (st.mund) { cc.save(); cc.globalCompositeOperation = 'destination-out'; cc.beginPath(); st.mund.forEach((p, i) => i ? cc.lineTo(p.x, p.y) : cc.moveTo(p.x, p.y)); cc.closePath(); cc.fill(); cc.restore(); }
      ebenen.push({ cv: cl, op: 'multiply' });
      // Naht (Mundspalte) bleibt etwas dunkler wie in echt
      const [ns, nsc] = neu(); nsc.lineWidth = breite * 0.012; nsc.strokeStyle = 'rgba(60,20,20,.18)'; nsc.beginPath(); k.naht.forEach((p, i) => i ? nsc.lineTo(p.x, p.y) : nsc.moveTo(p.x, p.y)); nsc.stroke();
      ebenen.push({ cv: weich(ns, breite * sc * 0.006), op: 'multiply' });
      return ebenen;
    },
    hilfslinien(ctx, st, z) {
      const k = lKontur(st, 0);
      ctx.beginPath(); k.ob.forEach((p, i) => { const q = z(p); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); k.un.slice(1).forEach(p => { const q = z(p); ctx.lineTo(q.x, q.y); }); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); k.naht.forEach((p, i) => { const q = z(p); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.stroke();
    },
    messwerte(st) {
      const mm = mmProPx(st), g = k => st.pt[k];
      const breite = len(sub(g('L.W'), g('R.W'))) * mm;
      const oben = (g('Z.S').y - g('Z.OM').y) * mm, unten = (g('Z.UM').y - g('Z.S').y) * mm;
      // Symmetrie: wie gleich liegen gespiegelte Punkte links und rechts zur Mitte (100 % = ganz gleich)
      const m = g('Z.S').x; const ab = L_SEITE.map(k => { const l = g('L.' + k), r = g('R.' + k); const dx = Math.abs((m - l.x) - (r.x - m)), dy = Math.abs(l.y - r.y); return (dx + dy) / Math.max(1, len(sub(l, r))); });
      const sym = Math.max(0, 100 - ab.reduce((a, b) => a + b, 0) / ab.length * 100);
      return [
        ['Lippenbreite', de(breite) + ' mm'], ['Oberlippe (Höhe)', de(oben) + ' mm'], ['Unterlippe (Höhe)', de(unten) + ' mm'],
        ['Verhältnis Ober- zu Unterlippe', '1 : ' + de(unten / Math.max(0.1, oben))], ['Symmetrie', Math.round(sym) + ' %']
      ];
    },
    auto(lm, W, H) {
      const P = i => ({ x: lm[i].x * W, y: lm[i].y * H });
      const pt = {};
      const links = lm[61].x < lm[291].x; // 61 = Mundwinkel, links oder rechts im Bild?
      [['L', true], ['R', false]].forEach(([s, l]) => {
        const w = l === links;
        pt[s + '.W'] = P(w ? 61 : 291); pt[s + '.O1'] = P(w ? 40 : 270); pt[s + '.O2'] = P(w ? 37 : 267);
        pt[s + '.U1'] = P(w ? 91 : 321); pt[s + '.U2'] = P(w ? 84 : 314);
      });
      pt['Z.OM'] = P(0); pt['Z.S'] = mitteVon(P(13), P(14)); pt['Z.UM'] = P(17);
      const pup = (lm.length > 473 ? [P(468), P(473)] : [mitteVon(P(33), P(133)), mitteVon(P(362), P(263))]).sort((a, b) => a.x - b.x);
      pt['P.L'] = pup[0]; pt['P.R'] = pup[1];
      // Mund offen (z. B. beim Lächeln): Innenlinie merken, damit die Zähne frei bleiben
      const innenOben = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308], innenUnten = [308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
      const offen = len(sub(P(13), P(14))) > len(sub(P(61), P(291))) * 0.04;
      return { pt, mitte: (lm[0].x + lm[17].x) / 2 * W, mund: offen ? innenOben.concat(innenUnten).map(P) : null };
    },
    speichernText(st, o, tech, farbe) { return `Beratung Lippen · ${tech} · ${farbe}`; }
  };

  const MODELLE = { brauen: BRAUEN, lippen: LIPPEN };

  // ---------- Szene zeichnen ----------
  function zeichne(ctx, W, H, st, view, o) {
    const sc = W / view.w;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(st.bild, view.x, view.y, view.w, view.h, 0, 0, W, H);
    if (o.vorher) return;
    const M = st.M;
    const ebenen = M.zeichne(st, sc, view, W, H, o.stil || st.o);
    ctx.save();
    ebenen.forEach(e => { ctx.globalCompositeOperation = e.op; ctx.drawImage(e.cv, 0, 0); });
    ctx.restore();
    if (!o.punkte) return;
    const z = p => ({ x: (p.x - view.x) * sc, y: (p.y - view.y) * sc });
    const gr = o.gross || 1;
    ctx.save();
    // Raster in 5-mm-Schritten (Richtwert über den Pupillenabstand)
    if (st.raster) {
      const schritt = 5 / mmProPx(st) * sc;
      if (schritt > 4) {
        ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
        const x0 = (st.mitte - view.x) * sc;
        for (let x = x0 % schritt; x < W; x += schritt) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += schritt) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      }
    }
    ctx.lineWidth = 1.2 * gr;
    ctx.setLineDash([5 * gr, 5 * gr]);
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    const mx = (st.mitte - view.x) * sc;
    ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, H); ctx.stroke();
    M.hilfslinien(ctx, st, z);
    ctx.setLineDash([]);
    griffe(st).forEach(g => {
      const p = z(g.p);
      const aktiv = !o.fix && st.aktiv === g.key;
      ctx.globalAlpha = o.fix ? 0.55 : 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, (g.klein ? 6 : aktiv ? 10 : g.pupille ? 7 : 8) * gr, 0, Math.PI * 2);
      ctx.fillStyle = aktiv ? '#a9725e' : g.nase ? 'rgba(214,170,140,.95)' : g.pupille ? 'rgba(120,190,210,.95)' : '#fff'; ctx.fill();
      ctx.lineWidth = 2 * gr; ctx.strokeStyle = aktiv ? '#fff' : '#a9725e'; ctx.stroke();
      if (g.pupille) { ctx.beginPath(); ctx.moveTo(p.x - 12 * gr, p.y); ctx.lineTo(p.x + 12 * gr, p.y); ctx.moveTo(p.x, p.y - 12 * gr); ctx.lineTo(p.x, p.y + 12 * gr); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1 * gr; ctx.stroke(); }
      if (g.txt && o.beschriftung) {
        ctx.font = `600 ${11 * gr}px Jost, system-ui, sans-serif`;
        const w = ctx.measureText(g.txt).width + 10 * gr;
        const unten = /\.(A|B1)$/.test(g.key) || g.pupille;
        const ty = unten ? p.y + 13 * gr : p.y - 30 * gr;
        ctx.fillStyle = 'rgba(30,22,18,.72)'; ctx.fillRect(p.x - w / 2, ty, w, 17 * gr);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(g.txt, p.x, ty + 12 * gr);
      }
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }
  function griffe(st) {
    const out = st.M.griffe(st).map(g => ({ ...g, p: st.pt[g.key] }));
    const ys = out.map(g => g.p.y);
    out.push({ key: 'M', p: { x: st.mitte, y: Math.min(...ys) - Math.abs(st.pt['P.L'].x - st.pt['P.R'].x) * 0.25 }, klein: true, txt: 'Mitte' });
    return out;
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

  // =========================================================================================
  // Oberfläche (für Brauen und Lippen gleich)
  // =========================================================================================
  async function beratung(modus, c, fotos, gespeichert) {
    const M = MODELLE[modus];
    const kandidaten = (fotos || []).filter(p => !/^Simulation/.test(p.typ || '')).slice(0, 12);
    const startFoto = kandidaten.find(p => p.typ === 'Vorher') || kandidaten[0] || null;
    const root = document.createElement('div');
    root.className = 'sim-bg';
    document.body.append(root);
    document.documentElement.style.overflow = 'hidden';
    const zu = () => { root.remove(); document.documentElement.style.overflow = ''; window.removeEventListener('resize', neu); };

    const st = { M, bild: null, pt: null, mitte: 0, mapping: false, raster: false, sym: true, nah: false, neuDatei: null, kunde: false, aktiv: null, view: null, fix: false,
      schritt: 0, stile: [], auto: false,
      o: { ...JSON.parse(JSON.stringify(M.o)), farbe: M.farben[M.startFarbe][1], farbname: M.farben[M.startFarbe][0] } };
    const techName = k => (M.technik.find(t => t.k === k) || {}).l || k;

    root.innerHTML = `<div class="sim" role="dialog" aria-modal="true" aria-label="${esc(M.titel)}">
      <div class="sheet-head"><div class="wrap"><div><span class="label">${esc(c.vorname)} ${esc(c.nachname)}</span><h2>${esc(M.titel)}</h2></div><button class="btn ghost small" data-zu>Schließen</button></div></div>
      <nav class="sim-schritte wrap" aria-label="Schritte">${M.schritte.map((s, i) => `<button type="button" data-schritt="${i}"><i>${i + 1}</i><span>${esc(s)}</span></button>`).join('')}</nav>
      <div class="sim-body wrap">
        <div class="sim-buehne" id="simBuehne">
          <canvas id="simCv"></canvas>
          <div class="sim-oben"><div class="seg"><button type="button" data-v="0" class="on">Gesicht</button><button type="button" data-v="1">Nah</button></div>
            <button type="button" class="sim-pill" id="simKunde" aria-pressed="false">Ansicht für Kundin</button></div>
          <div class="sim-zoom"><button type="button" class="sim-pill" data-zm="1" aria-label="Heranzoomen">+</button><button type="button" class="sim-pill" data-zm="-1" aria-label="Herauszoomen">−</button></div>
          <div class="sim-unten"><span>Visuelle Simulation. Das abgeheilte Ergebnis kann abweichen.</span><button type="button" class="sim-pill" id="simVorher">Vorher</button></div>
          <div class="sim-leer" id="simLeer">${kandidaten.length ? 'Foto wird geladen …' : 'Mach ein Vorher-Foto von vorne: gerade Kopfhaltung, neutraler Ausdruck, gleichmäßiges Licht.'}</div>
        </div>
        <p class="cmeta sim-druck">Gedrückt halten auf „Vorher“ zeigt das Foto ohne Simulation.</p>
        <div class="sim-panel" id="simPanel"></div>
      </div>
      <div class="sheet-foot"><div class="wrap"><button class="btn ghost" id="simZur">Zurück</button><button class="btn" id="simWeiter">Weiter</button></div></div>
    </div>`;
    const $ = s => root.querySelector(s);
    root.querySelectorAll('[data-zu]').forEach(b => b.onclick = zu);
    const cv = $('#simCv'), ctx = cv.getContext('2d');
    let anzeige = null, vorher = false;

    // ---------- Ausschnitt ----------
    function vorgabe(nah) {
      if (!nah) return { x: 0, y: 0, w: st.bild.width, h: st.bild.height };
      const pts = M.nah(st);
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      const bw = Math.max(...xs) - Math.min(...xs), cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      const w = Math.min(st.bild.width, bw * (modus === 'lippen' ? 1.8 : 1.45)), h = Math.min(st.bild.height, w * (modus === 'lippen' ? 0.7 : 0.62));
      return { x: Math.max(0, Math.min(st.bild.width - w, cx - w / 2)), y: Math.max(0, Math.min(st.bild.height - h, cy - h * 0.5)), w, h };
    }
    function ansicht() { if (!st.view) st.view = vorgabe(st.nah); return st.view; }
    function klemmAnsicht(v) {
      const W = st.bild.width, H = st.bild.height;
      const x = v.w >= W ? (W - v.w) / 2 : Math.max(0, Math.min(W - v.w, v.x));
      const y = v.h >= H ? (H - v.h) / 2 : Math.max(0, Math.min(H - v.h, v.y));
      return { ...v, x, y };
    }
    function zoomAnsicht(f, cx, cy, basis) {
      const v = basis || ansicht(), r = cv.getBoundingClientRect();
      if (cx == null) { cx = r.width / 2; cy = r.height / 2; }
      const ix = v.x + cx / r.width * v.w, iy = v.y + cy / r.height * v.h;
      const maxW = st.bild.width, minW = st.bild.width * 0.06;
      let w = Math.max(minW, Math.min(maxW, v.w / f)); if (v.w / f > maxW && v.h * (w / v.w) > st.bild.height) w = v.w * Math.min(maxW / v.w, st.bild.height / v.h);
      const h = v.h * w / v.w;
      st.view = klemmAnsicht({ x: ix - cx / r.width * w, y: iy - cy / r.height * h, w, h });
      malen();
    }
    const punkteSichtbar = () => st.schritt === 1 && !st.kunde && !vorher;
    function malen() {
      if (!st.bild) return;
      const v = ansicht();
      const box = $('#simBuehne');
      const maxH = Math.max(240, window.innerHeight * (st.kunde ? 0.78 : st.schritt === 4 ? 0.32 : 0.5));
      let cssW = box.clientWidth, cssH = cssW * v.h / v.w;
      if (cssH > maxH) { cssH = maxH; cssW = cssH * v.w / v.h; }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
      cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
      anzeige = { v, sc: cv.width / v.w, dpr };
      zeichne(ctx, cv.width, cv.height, st, v, { vorher, punkte: punkteSichtbar(), beschriftung: v.w < st.bild.width * 0.7 || cssW > 560, fix: st.fix });
      if (st.schritt === 1 || st.schritt === 3 || st.schritt === 5) { const mw = $('#simMess'); if (mw) mw.innerHTML = messHtml(); }
    }
    const neu = () => malen();
    window.addEventListener('resize', neu);

    const messHtml = () => `<table class="sim-mess"><tbody>${M.messwerte(st).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
      <p class="cmeta" style="margin:6px 0 0">Richtwerte. Maßstab ist ein mittlerer Pupillenabstand von ${PUPILLE_MM} mm, kein Messinstrument.</p>`;

    // ---------- Schritte ----------
    function panel() {
      const s = st.schritt;
      root.querySelectorAll('[data-schritt]').forEach(b => { const i = Number(b.dataset.schritt); b.classList.toggle('on', i === s); b.classList.toggle('fertig', i < s); b.disabled = !st.bild && i > 0; b.setAttribute('aria-current', i === s ? 'step' : 'false'); });
      $('#simZur').textContent = s === 0 ? 'Abbrechen' : 'Zurück';
      $('#simWeiter').textContent = s === M.schritte.length - 1 ? 'In Akte speichern' : 'Weiter';
      $('#simWeiter').disabled = !st.bild;
      root.querySelector('.sim').dataset.schritt = s;
      const P = $('#simPanel');
      if (s === 0) {
        P.innerHTML = `<h3>Foto wählen</h3>
          <div class="sim-fotos">${kandidaten.map(p => `<button type="button" class="sim-th${st.fotoId === p.fileId ? ' on' : ''}" data-fid="${esc(p.fileId)}" aria-label="${esc(p.typ)} vom ${esc(fmt(p.datum))}"><img alt="" data-src="${esc(p.fileId)}"></button>`).join('')}
            <button type="button" class="btn ghost small" id="simNeu">${kandidaten.length ? '+ Anderes Foto' : '+ Foto machen oder wählen'}</button><input type="file" id="simDatei" accept="image/*" hidden></div>
          <ul class="sim-tipps"><li>Von vorne, Kopf gerade, Blick in die Kamera</li><li>Neutraler Ausdruck, ${modus === 'lippen' ? 'Lippen locker geschlossen' : 'Stirn entspannt'}</li><li>Gleichmäßiges Licht, keine harten Schatten</li></ul>`;
        P.querySelectorAll('img[data-src]').forEach(async img => { const p = kandidaten.find(x => x.fileId === img.dataset.src); try { img.src = await Store.photoUrl(p); } catch (e) {} });
        P.querySelectorAll('.sim-th').forEach(b => b.onclick = async () => {
          st.fotoId = b.dataset.fid; P.querySelectorAll('.sim-th').forEach(x => x.classList.toggle('on', x === b));
          const p = kandidaten.find(x => x.fileId === b.dataset.fid);
          try { await fotoWaehlen(await Store.photoUrl(p)); } catch (e) { FCC.toast && FCC.toast('Foto lädt nicht', true); }
        });
        P.querySelector('#simNeu').onclick = () => P.querySelector('#simDatei').click();
        P.querySelector('#simDatei').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; st.fotoId = null; P.querySelectorAll('.sim-th').forEach(x => x.classList.remove('on')); fotoWaehlen(f, f); };
      } else if (s === 1) {
        const adj = st.o.adj && Object.values(st.o.adj).some(Boolean);
        P.innerHTML = `<div class="row between"><h3>${esc(M.schritte[1])} setzen</h3>${FCC.gesichtErkennen ? `<button type="button" class="btn small" id="simAuto">${st.auto ? 'Punkte neu erkennen' : 'Automatisch erkennen'}</button>` : ''}</div>
          ${FCC.gesichtErkennen && !st.auto ? `<p class="cmeta" style="margin:4px 0 0">Die Erkennung läuft nur auf diesem Gerät. Beim ersten Mal lädt sie etwa 18 MB, danach geht es schnell.</p>` : ''}
          <p class="sim-tipp">${M.tipp} Zwei Finger zoomen, ein Finger neben den Punkten verschiebt das Bild.</p>
          ${st.mund ? '<p class="note">Mund leicht geöffnet erkannt: Die Zähne bleiben frei. Am schönsten wird die Simulation mit locker geschlossenen Lippen.</p>' : ''}
          ${adj ? '<p class="note">Im Schritt „Anpassen“ ist ein Feinschliff in Millimetern eingestellt. Die Form weicht deshalb etwas von den Punkten ab.</p>' : ''}
          <div class="sim-fein"><span>Feinjustierung <b id="simAktiv">${st.aktiv ? esc(punktName(st.aktiv)) : 'Punkt antippen'}</b></span>
            <div class="sim-pfeile"><button type="button" data-n="-1,0" aria-label="nach links">←</button><button type="button" data-n="0,-1" aria-label="nach oben">↑</button><button type="button" data-n="0,1" aria-label="nach unten">↓</button><button type="button" data-n="1,0" aria-label="nach rechts">→</button></div></div>
          <div class="sim-schalter">
            <label class="sim-sw"><input type="checkbox" id="simSym" ${st.sym ? 'checked' : ''}> Beide Seiten gleich (spiegeln)</label>
            ${modus === 'brauen' ? `<label class="sim-sw"><input type="checkbox" id="simMap" ${st.mapping ? 'checked' : ''}> Mapping vom Nasenflügel</label>` : ''}
            <label class="sim-sw"><input type="checkbox" id="simRaster" ${st.raster ? 'checked' : ''}> Raster (5 mm)</label>
            <label class="sim-sw"><input type="checkbox" id="simFix" ${st.fix ? 'checked' : ''}> Punkte fixieren</label>
          </div>
          <h4 class="sim-h4">Messwerte</h4><div id="simMess">${st.bild ? messHtml() : ''}</div>`;
        P.querySelectorAll('.sim-pfeile [data-n]').forEach(b => b.onclick = () => {
          if (st.fix || !st.aktiv || !anzeige) return;
          const [nx, ny] = b.dataset.n.split(',').map(Number);
          const schritt = anzeige.v.w / cv.getBoundingClientRect().width;
          const q = st.pt[st.aktiv]; setzePunkt(st.aktiv, { x: q.x + nx * schritt, y: q.y + ny * schritt }); malen();
        });
        P.querySelector('#simSym').onchange = e => { st.sym = e.target.checked; if (st.sym) { spiegeln(); malen(); } };
        const mp = P.querySelector('#simMap'); if (mp) mp.onchange = e => { st.mapping = e.target.checked; malen(); };
        P.querySelector('#simRaster').onchange = e => { st.raster = e.target.checked; malen(); };
        P.querySelector('#simFix').onchange = e => { st.fix = e.target.checked; root.querySelector('.sim').classList.toggle('fix', st.fix); malen(); };
        const au = P.querySelector('#simAuto'); if (au) au.onclick = () => automatisch(au);
      } else if (s === 2) {
        P.innerHTML = `<h3>Technik und Farbe</h3>
          <div class="sim-tech">${M.technik.map(t => `<button type="button" class="sim-tk${t.k === st.o.technik ? ' on' : ''}" data-t="${t.k}" aria-pressed="${t.k === st.o.technik}"><b>${esc(t.l)}</b><span>${esc(t.t)}</span></button>`).join('')}</div>
          <div style="margin-top:14px"><span class="flabel">Farbton <b id="simFn">${esc(st.o.farbname)}</b></span>
            <div class="sim-farben">${M.farben.map(([n, h]) => `<button type="button" class="${h === st.o.farbe ? 'on' : ''}" data-f="${h}" data-n="${esc(n)}" style="background:${h}" aria-label="${esc(n)}" title="${esc(n)}"></button>`).join('')}</div>
            <p class="cmeta" style="margin:6px 0 0">Annäherungen auf dem Bildschirm, keine Herstellerpigmente.</p></div>`;
        P.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { st.o.technik = b.dataset.t; P.querySelectorAll('[data-t]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); malen(); });
        P.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { st.o.farbe = b.dataset.f; st.o.farbname = b.dataset.n; P.querySelector('#simFn').textContent = b.dataset.n; P.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === b)); malen(); });
      } else if (s === 3) {
        const pz = k => Math.round(st.o[k] * 100);
        P.innerHTML = `<h3>Anpassen</h3><div class="sim-ctl">
          ${M.regler.filter(([k]) => k !== 'ombre' || st.o.technik === 'kontur').map(([k, l]) => `<label class="sim-reg"><span>${esc(l)} <b data-w="${k}">${pz(k)} %</b></span><input type="range" min="${k === 'bogen' || k === 'weich' ? 0 : 10}" max="100" value="${pz(k)}" data-o="${k}"></label>`).join('')}
          ${M.innenRegler ? `<label class="sim-reg"><span>Kontur nach innen <b data-w="innen">${de(st.o.innen || 0)} mm</b></span><input type="range" min="0" max="20" value="${Math.round((st.o.innen || 0) * 10)}" data-mm="innen"></label>` : ''}
          </div>
          ${M.feinschliff ? `<h4 class="sim-h4">Feinschliff in Millimetern</h4><p class="cmeta" style="margin:0 0 8px">Plus heißt größer oder höher. Dein Grundsatz: höchstens 2 mm über die natürliche Braue hinaus.</p>
          <div class="sim-ctl">${M.feinschliff.map(([k, l]) => `<label class="sim-reg"><span>${esc(l)} <b data-a="${k}">${(st.o.adj[k] > 0 ? '+' : '') + de(st.o.adj[k] || 0)} mm</b></span><input type="range" min="-30" max="30" value="${Math.round((st.o.adj[k] || 0) * 10)}" data-adj="${k}"></label>`).join('')}</div>
          <p class="note" id="simUeber" ${Object.values(st.o.adj).some(v => v > 2) ? '' : 'hidden'}>Mehr als 2 mm vergrößert.</p>` : ''}
          <div class="row" style="margin-top:12px"><button type="button" class="btn ghost small" id="simReset">Zurücksetzen</button></div>`;
        P.querySelectorAll('[data-o]').forEach(r => { const w = () => { st.o[r.dataset.o] = Number(r.value) / 100; P.querySelector(`[data-w="${r.dataset.o}"]`).textContent = r.value + ' %'; malen(); }; r.oninput = w; r.onchange = w; });
        P.querySelectorAll('[data-mm]').forEach(r => { const w = () => { st.o.innen = Number(r.value) / 10; P.querySelector('[data-w="innen"]').textContent = de(st.o.innen) + ' mm'; malen(); }; r.oninput = w; r.onchange = w; });
        P.querySelectorAll('[data-adj]').forEach(r => { const w = () => { const v = Number(r.value) / 10; st.o.adj[r.dataset.adj] = v; P.querySelector(`[data-a="${r.dataset.adj}"]`).textContent = (v > 0 ? '+' : '') + de(v) + ' mm'; P.querySelector('#simUeber').hidden = !Object.values(st.o.adj).some(x => x > 2); malen(); }; r.oninput = w; r.onchange = w; });
        P.querySelector('#simReset').onclick = () => { const t = st.o.technik, f = st.o.farbe, n = st.o.farbname; st.o = { ...JSON.parse(JSON.stringify(M.o)), technik: t, farbe: f, farbname: n }; panel(); malen(); };
      } else if (s === 4) {
        P.innerHTML = `<h3>Vergleich</h3><p class="cmeta" style="margin:0 0 10px">Gleiches Foto, verschiedene Techniken in deinem Farbton. Antippen wählt.</p>
          <div class="sim-vgl" id="simVgl">${M.technik.map(t => `<button type="button" class="sim-vk${t.k === st.o.technik ? ' on' : ''}" data-vt="${t.k}"><canvas></canvas><span>${esc(t.l)}</span></button>`).join('')}</div>
          <h4 class="sim-h4">Gemerkte Stile</h4>
          ${st.stile.length ? `<div class="sim-vgl" id="simStile">${st.stile.map((x, i) => `<button type="button" class="sim-vk" data-vs="${i}"><canvas></canvas><span>${esc(techName(x.technik))} · ${esc(x.farbname)}</span></button>`).join('')}</div>` : '<p class="cmeta" style="margin:0">Noch keiner. Merk dir verschiedene Formen oder Farben und vergleiche sie hier.</p>'}
          <div class="row" style="margin-top:10px"><button type="button" class="btn ghost small" id="simMerk">+ Aktuellen Stil merken</button></div>`;
        const kachel = (b, stil) => {
          const k = b.querySelector('canvas'); const v = vorgabe(true); const w = 360, h = Math.round(w * v.h / v.w);
          k.width = w; k.height = h; zeichne(k.getContext('2d'), w, h, st, v, { stil, punkte: false });
        };
        P.querySelectorAll('[data-vt]').forEach(b => { kachel(b, { ...st.o, technik: b.dataset.vt }); b.onclick = () => { st.o.technik = b.dataset.vt; P.querySelectorAll('[data-vt]').forEach(x => x.classList.toggle('on', x === b)); malen(); }; });
        P.querySelectorAll('[data-vs]').forEach(b => { const x = st.stile[Number(b.dataset.vs)]; kachel(b, x); b.onclick = () => { st.o = JSON.parse(JSON.stringify(x)); malen(); panel(); }; });
        P.querySelector('#simMerk').onclick = () => { if (st.stile.length >= 6) st.stile.shift(); st.stile.push(JSON.parse(JSON.stringify(st.o))); panel(); FCC.toast && FCC.toast('Stil gemerkt'); };
      } else if (s === 5) {
        P.innerHTML = `<h3>Speichern</h3>
          <table class="sim-mess"><tbody><tr><td>Kundin</td><td>${esc(c.vorname)} ${esc(c.nachname)}</td></tr><tr><td>Technik</td><td>${esc(techName(st.o.technik))}</td></tr><tr><td>Farbton</td><td>${esc(st.o.farbname)}</td></tr>
          ${st.o.adj && Object.values(st.o.adj).some(Boolean) ? `<tr><td>Feinschliff</td><td>${esc(Object.entries(st.o.adj).filter(([, v]) => v).map(([k, v]) => ((M.feinschliff.find(f => f[0] === k) || [])[1] || k) + ' ' + (v > 0 ? '+' : '') + de(v) + ' mm').join(', '))}</td></tr>` : ''}
          ${st.o.innen ? `<tr><td>Kontur nach innen</td><td>${de(st.o.innen)} mm</td></tr>` : ''}</tbody></table>
          <h4 class="sim-h4">Messwerte</h4><div id="simMess">${messHtml()}</div>
          <div class="field" style="margin-top:12px"><label for="simNotiz">Notiz zur Beratung</label><textarea id="simNotiz" rows="3" placeholder="z. B. Kundin wünscht etwas weicher am Anfang">${esc(st.notiz || '')}</textarea></div>
          <label class="sim-sw" style="margin-top:10px"><input type="checkbox" id="simMitPunkten" ${st.mitPunkten !== false ? 'checked' : ''}> Zusätzlich eine Version mit Punkten und Linien für meine Doku</label>
          <p class="cmeta" style="margin:8px 0 0">Die Kartei legt das Foto „Simulation“ in die Akte und schreibt die Zusammenfassung als Notiz dazu.</p>`;
        P.querySelector('#simNotiz').oninput = e => { st.notiz = e.target.value; };
        P.querySelector('#simMitPunkten').onchange = e => { st.mitPunkten = e.target.checked; };
      }
    }
    function gehe(i) {
      if (i < 0) { zu(); return; }
      if (i >= M.schritte.length) { speichern(); return; }
      if (!st.bild && i > 0) return;
      st.schritt = i;
      // Beim Punkte-Setzen ganzes Gesicht, danach nah an Brauen oder Lippen
      if (i === 1 && st.nah) { st.nah = false; st.view = null; segAnzeigen(); }
      if (i >= 2 && !st.nahGesetzt) { st.nahGesetzt = true; st.nah = true; st.view = null; segAnzeigen(); }
      panel(); malen();
      root.querySelector('.sim-body').scrollTop = 0;
    }
    const segAnzeigen = () => root.querySelectorAll('.seg [data-v]').forEach(x => x.classList.toggle('on', (x.dataset.v === '1') === st.nah));
    root.querySelectorAll('[data-schritt]').forEach(b => b.onclick = () => gehe(Number(b.dataset.schritt)));
    $('#simZur').onclick = () => gehe(st.schritt - 1);
    $('#simWeiter').onclick = () => gehe(st.schritt + 1);

    const punktName = k => { const [s, n] = k.split('.'); const nm = s === 'P' ? M.namen.P : s === 'N' ? M.namen.N : M.namen[n] || n; return nm + (s === 'L' || n === 'L' ? ' links im Bild' : s === 'R' || n === 'R' ? ' rechts im Bild' : ''); };
    function spiegeln() {
      Object.keys(st.pt).forEach(k => {
        if (k.startsWith('L.') || k.endsWith('.L')) { const p = st.pt[k]; st.pt[partner(k)] = { x: 2 * st.mitte - p.x, y: p.y }; }
        if (k.startsWith('Z.')) st.pt[k] = { x: st.mitte, y: st.pt[k].y };
      });
    }
    function setzePunkt(key, q) {
      const W = st.bild.width, H = st.bild.height;
      q = { x: Math.max(0, Math.min(W, q.x)), y: Math.max(0, Math.min(H, q.y)) };
      if (key.startsWith('Z.') && st.sym) q.x = st.mitte;
      st.pt[key] = q;
      const pk = partner(key);
      if (st.sym && pk) st.pt[pk] = { x: 2 * st.mitte - q.x, y: q.y };
    }

    async function fotoWaehlen(quelle, neueDatei) {
      $('#simLeer').hidden = false; $('#simLeer').textContent = 'Foto wird geladen …';
      try {
        st.bild = await bildLaden(quelle);
        st.neuDatei = neueDatei || null;
        Object.assign(st, M.start(st.bild.width, st.bild.height)); st.mund = null;
        st.view = null; st.auto = false; st.nah = false; st.nahGesetzt = false; segAnzeigen();
        $('#simLeer').hidden = true;
        panel(); malen();
      } catch (err) { $('#simLeer').textContent = 'Das Foto lässt sich nicht öffnen. Bitte ein anderes wählen.'; }
    }

    // Automatische Erkennung der Punkte (gesicht.js, MediaPipe auf dem Gerät)
    async function automatisch(btn) {
      if (!st.bild || !FCC.gesichtErkennen) return;
      btn.disabled = true; const alt = btn.textContent; btn.textContent = 'Erkenne …';
      try {
        const lm = await FCC.gesichtErkennen(st.bild, t => { btn.textContent = t; });
        if (!lm) { FCC.toast && FCC.toast('Kein Gesicht erkannt. Bitte ein Foto von vorne wählen oder die Punkte von Hand setzen.', true); }
        else {
          const r = M.auto(lm, st.bild.width, st.bild.height);
          Object.assign(st.pt, r.pt); st.mitte = r.mitte; st.auto = true; st.mund = r.mund || null;
          st.sym = false; // erkannte Punkte sind selten ganz symmetrisch
          st.view = null; panel(); malen();
          FCC.toast && FCC.toast('Punkte gesetzt. Bitte prüfen und nach Anatomie korrigieren.', true);
        }
      } catch (e) { FCC.toast && FCC.toast('Erkennung nicht möglich: ' + (e.message || e), true); }
      btn.disabled = false; if (btn.textContent === 'Erkenne …' || /lädt|Lade/.test(btn.textContent)) btn.textContent = alt;
    }

    root.querySelectorAll('.seg [data-v]').forEach(b => b.onclick = () => { st.nah = b.dataset.v === '1'; st.view = null; segAnzeigen(); malen(); });
    $('#simKunde').onclick = e => {
      st.kunde = !st.kunde;
      root.querySelector('.sim').classList.toggle('kunde', st.kunde);
      e.currentTarget.classList.toggle('on', st.kunde); e.currentTarget.setAttribute('aria-pressed', st.kunde);
      e.currentTarget.textContent = st.kunde ? 'Zurück zur Beratung' : 'Ansicht für Kundin';
      malen();
    };
    const vb = $('#simVorher');
    const vAn = e => { e.preventDefault(); vorher = true; malen(); }, vAus = () => { if (vorher) { vorher = false; malen(); } };
    vb.addEventListener('pointerdown', vAn); vb.addEventListener('pointerup', vAus); vb.addEventListener('pointerleave', vAus); vb.addEventListener('pointercancel', vAus);

    // ---------- Bedienung auf der Bühne ----------
    // Ein Finger auf einem Punkt: Punkt ziehen (ab 6 Bildschirmpunkten, halb so weit wie der Finger, dadurch fein).
    // Ein Finger daneben: Bild verschieben. Zwei Finger: zoomen. Doppeltipp: heran- bzw. wieder herauszoomen.
    const TOT = 6, FEIN = 0.5;
    const finger = new Map();
    let geste = null, letzterTipp = { t: 0, x: 0, y: 0 };
    const lokal = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }; };
    const zuBild = (p, v) => ({ x: v.x + p.x / p.w * v.w, y: v.y + p.y / p.h * v.h });
    cv.addEventListener('pointerdown', e => {
      if (!st.bild || !anzeige) return;
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      const p = lokal(e);
      finger.set(e.pointerId, p);
      const v = ansicht();
      if (finger.size === 2) {
        if (geste && geste.art === 'punkt' && geste.los) { st.pt = geste.alt; st.mitte = geste.mitte0; }
        const [a, b] = [...finger.values()];
        geste = { art: 'zoom', v: { ...v }, abstand: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
        return;
      }
      if (finger.size > 2) return;
      const jetzt = Date.now();
      const doppelt = jetzt - letzterTipp.t < 320 && Math.hypot(p.x - letzterTipp.x, p.y - letzterTipp.y) < 30;
      letzterTipp = { t: jetzt, x: p.x, y: p.y };
      const ip = zuBild(p, v);
      let best = null;
      if (punkteSichtbar() && !st.fix) {
        let bd = 28 * v.w / p.w;
        griffe(st).forEach(g => { const d = Math.hypot(g.p.x - ip.x, g.p.y - ip.y); if (d < bd) { bd = d; best = g; } });
      }
      if (doppelt && !best) { letzterTipp.t = 0; if (v.w < st.bild.width * 0.95) { st.view = null; st.nah = false; segAnzeigen(); malen(); } else zoomAnsicht(2.2, p.x, p.y); geste = null; return; }
      if (best) {
        geste = { art: 'punkt', g: best, start: p, gp: { ...best.p }, v: { ...v }, los: false, mitte0: st.mitte, alt: JSON.parse(JSON.stringify(st.pt)) };
        if (best.key !== 'M') { st.aktiv = best.key; const a = root.querySelector('#simAktiv'); if (a) a.textContent = punktName(best.key); malen(); }
      } else geste = { art: 'bild', start: p, v: { ...v } };
    });
    cv.addEventListener('pointermove', e => {
      if (!finger.has(e.pointerId) || !geste) return;
      e.preventDefault();
      const p = lokal(e);
      finger.set(e.pointerId, p);
      if (geste.art === 'zoom' && finger.size >= 2) {
        const [a, b] = [...finger.values()];
        const f = Math.hypot(a.x - b.x, a.y - b.y) / geste.abstand;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const v = geste.v, w = Math.max(st.bild.width * 0.06, Math.min(st.bild.width, v.w / f)), h = v.h * w / v.w;
        const ix = v.x + geste.mx / p.w * v.w, iy = v.y + geste.my / p.h * v.h;
        st.view = klemmAnsicht({ x: ix - mx / p.w * w, y: iy - my / p.h * h, w, h });
        malen(); return;
      }
      const dx = p.x - geste.start.x, dy = p.y - geste.start.y;
      if (geste.art === 'bild') { const v = geste.v; st.view = klemmAnsicht({ ...v, x: v.x - dx / p.w * v.w, y: v.y - dy / p.h * v.h }); malen(); return; }
      if (geste.art === 'punkt') {
        if (!geste.los && Math.hypot(dx, dy) < TOT) return;
        geste.los = true;
        const v = geste.v, g = geste.g;
        const bx = dx / p.w * v.w * FEIN, by = dy / p.h * v.h * FEIN;
        if (g.key === 'M') {
          st.mitte = geste.mitte0 + bx;
          Object.keys(st.pt).forEach(k => { st.pt[k] = { x: geste.alt[k].x + bx, y: geste.alt[k].y }; });
          if (st.mund) { if (!geste.mund0) geste.mund0 = st.mund.map(p => ({ ...p })); st.mund = geste.mund0.map(p => ({ x: p.x + bx, y: p.y })); }
        } else setzePunkt(g.key, { x: geste.gp.x + bx, y: geste.gp.y + by });
        malen();
      }
    });
    const loslassen = e => {
      finger.delete(e.pointerId);
      if (finger.size === 1 && geste && geste.art === 'zoom') { const [q] = [...finger.values()]; geste = { art: 'bild', start: q, v: { ...ansicht() } }; }
      else if (!finger.size) geste = null;
    };
    cv.addEventListener('pointerup', loslassen); cv.addEventListener('pointercancel', loslassen);
    cv.addEventListener('wheel', e => { e.preventDefault(); const p = lokal(e); zoomAnsicht(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y); }, { passive: false });
    cv.addEventListener('gesturestart', e => e.preventDefault());
    root.querySelectorAll('[data-zm]').forEach(b => b.onclick = () => zoomAnsicht(b.dataset.zm === '1' ? 1.5 : 1 / 1.5));

    // ---------- Speichern ----------
    async function speichern() {
      const btn = $('#simWeiter'); btn.disabled = true; btn.textContent = 'Speichert …';
      try {
        const W = st.bild.width, H = st.bild.height;
        const tech = techName(st.o.technik);
        const fuss = (cv2, text) => {
          const oc = cv2.getContext('2d'); const fs = Math.max(14, Math.round(W / 55));
          oc.setTransform(1, 0, 0, 1, 0, 0); oc.globalCompositeOperation = 'source-over';
          oc.fillStyle = 'rgba(30,22,18,.62)'; oc.fillRect(0, H - fs * 2.2, W, fs * 2.2);
          oc.fillStyle = '#fff'; oc.font = `500 ${fs}px Jost, system-ui, sans-serif`; oc.textBaseline = 'middle'; oc.textAlign = 'left';
          oc.fillText(text, fs * 0.8, H - fs * 1.1);
        };
        const out = document.createElement('canvas'); out.width = W; out.height = H;
        zeichne(out.getContext('2d'), W, H, st, { x: 0, y: 0, w: W, h: H }, { vorher: false, punkte: false });
        fuss(out, `Simulation ${M.wort} · ${tech} · ${st.o.farbname} · ${fmt(today())} · Ergebnis kann abweichen`);
        const blob = await new Promise(r => out.toBlob(r, 'image/jpeg', 0.9));
        c.fotos = c.fotos || [];
        if (st.neuDatei) {
          const n = c.fotos.filter(p => p.typ === 'Vorher' && p.datum === today()).length + 1;
          const pv = await Store.addPhoto(c, st.neuDatei, `${today()}_Vorher_${n}.jpg`);
          c.fotos.push({ ...pv, typ: 'Vorher', datum: today() });
          st.neuDatei = null;
        }
        const mess = M.messwerte(st);
        const sim = { modus, technik: tech, farbe: st.o.farbname, mm: Object.fromEntries(mess) };
        const n = c.fotos.filter(p => p.typ === 'Simulation' && p.datum === today()).length + 1;
        const p = await Store.addPhoto(c, new File([blob], 'simulation.jpg', { type: 'image/jpeg' }), `${today()}_Simulation-${M.wort}_${n}.jpg`);
        c.fotos.push({ ...p, typ: 'Simulation', datum: today(), sim });
        if (st.mitPunkten !== false) {
          const o2 = document.createElement('canvas'); o2.width = W; o2.height = H;
          zeichne(o2.getContext('2d'), W, H, st, { x: 0, y: 0, w: W, h: H }, { vorher: false, punkte: true, beschriftung: true, gross: Math.max(1, W / 900) });
          fuss(o2, `Vorzeichnung ${M.wort} · ${tech} · ${st.o.farbname} · ${fmt(today())}`);
          const b2 = await new Promise(r => o2.toBlob(r, 'image/jpeg', 0.9));
          const p2 = await Store.addPhoto(c, new File([b2], 'vorzeichnung.jpg', { type: 'image/jpeg' }), `${today()}_Simulation-Punkte-${M.wort}_${n}.jpg`);
          c.fotos.push({ ...p2, typ: 'Simulation (Punkte)', datum: today(), sim });
        }
        // Zusammenfassung als Notiz in der Akte
        c.notizen = c.notizen || [];
        const adj = st.o.adj ? Object.entries(st.o.adj).filter(([, v]) => v).map(([k, v]) => ((M.feinschliff.find(f => f[0] === k) || [])[1] || k) + ' ' + (v > 0 ? '+' : '') + de(v) + ' mm') : [];
        const text = [M.speichernText(st, st.o, tech, st.o.farbname) + '.', adj.length ? 'Feinschliff: ' + adj.join(', ') + '.' : '', st.o.innen ? 'Kontur nach innen: ' + de(st.o.innen) + ' mm.' : '',
          'Messwerte (Richtwerte): ' + mess.map(([k, v]) => k + ' ' + v).join('; ') + '.', st.notiz ? 'Notiz: ' + st.notiz.trim() : ''].filter(Boolean).join('\n');
        c.notizen.unshift({ datum: today(), text });
        await Store.save(c);
        FCC.toast && FCC.toast('Beratung in der Akte gespeichert: Foto und Notiz');
        zu();
        gespeichert && gespeichert();
      } catch (err) {
        btn.disabled = false; btn.textContent = 'In Akte speichern';
        FCC.toast && FCC.toast('Nicht gespeichert: ' + err.message, true);
      }
    }

    panel();
    if (startFoto) { st.fotoId = startFoto.fileId; panel(); try { await fotoWaehlen(await Store.photoUrl(startFoto)); } catch (e) { $('#simLeer').textContent = 'Foto lädt nicht. Bitte ein anderes wählen.'; } }
  }

  FCC.brauenSim = (c, fotos, gespeichert) => beratung('brauen', c, fotos, gespeichert);
  FCC.lippenSim = (c, fotos, gespeichert) => beratung('lippen', c, fotos, gespeichert);
  FCC.simModelle = MODELLE; // für Tests

  const css = document.createElement('style');
  css.textContent = `
    .sim-bg{position:fixed;inset:0;z-index:60;background:var(--shade);display:flex;align-items:stretch;justify-content:center}
    .sim{background:var(--bg);width:min(1100px,100%);display:flex;flex-direction:column;height:100%}
    .sim .sheet-foot{position:static;width:auto}
    .sim .sheet-head,.sim .sheet-foot,.sim-schritte{flex-shrink:0}
    .sim-schritte{display:flex;gap:6px;overflow-x:auto;padding-top:10px;padding-bottom:4px;scrollbar-width:none}
    .sim-schritte button{display:flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--paper);border-radius:99px;padding:5px 12px 5px 5px;font:inherit;font-size:13.5px;color:var(--muted);white-space:nowrap;min-height:36px}
    .sim-schritte button i{font-style:normal;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--rose-soft);color:var(--rose-ink);font-size:12px;font-weight:600}
    .sim-schritte button.on{border-color:var(--rose);color:var(--ink);font-weight:500}.sim-schritte button.on i{background:var(--rose);color:#fff}
    .sim-schritte button.fertig i{background:var(--ok);color:#fff}
    .sim-schritte button:disabled{opacity:.45}
    @media(max-width:560px){.sim-schritte button:not(.on) span{display:none}.sim-schritte button:not(.on){padding-right:5px}}
    .sim-body{overflow:auto;flex:1;padding-top:10px;padding-bottom:16px;-webkit-overflow-scrolling:touch}
    .sim-fotos{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .sim-th{flex-shrink:0;width:64px;height:64px;border-radius:10px;overflow:hidden;border:2px solid var(--line);padding:0;background:var(--paper)}
    .sim-th.on{border-color:var(--rose)}.sim-th img{width:100%;height:100%;object-fit:cover;display:block}
    .sim-tipps{margin:12px 0 0;padding-left:20px;color:var(--muted);font-size:14px}
    .sim-buehne{position:relative;display:flex;justify-content:center;background:#16120f;border-radius:var(--r);overflow:hidden;min-height:220px}
    .sim-buehne canvas{display:block;touch-action:none;cursor:crosshair}
    .sim-oben{position:absolute;top:10px;right:10px;left:10px;display:flex;justify-content:flex-end;gap:8px;pointer-events:none;flex-wrap:wrap}
    .sim-oben>*{pointer-events:auto}
    .sim-oben .seg{background:rgba(30,22,18,.6);border-color:transparent}.sim-oben .seg button{color:#e9ddd5}.sim-oben .seg button.on{background:#fffdfb;color:#2b2522}
    .sim-pill{border:0;border-radius:99px;padding:6px 14px;background:rgba(30,22,18,.6);color:#f1e9e4;font:inherit;font-size:13px;-webkit-user-select:none;user-select:none;touch-action:none}
    .sim-pill.on{background:#fffdfb;color:#2b2522}
    .sim-unten{position:absolute;left:10px;right:10px;bottom:10px;display:flex;justify-content:space-between;align-items:flex-end;gap:10px;pointer-events:none}
    .sim-unten span{background:rgba(30,22,18,.62);color:#f1e9e4;font-size:12px;border-radius:8px;padding:5px 9px;max-width:70%}
    .sim-unten button{pointer-events:auto}
    .sim-leer{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e9ddd5;padding:24px;text-align:center}
    .sim-druck{margin:6px 2px 0;font-size:12.5px}
    .sim-panel{margin-top:12px;background:var(--paper);border:1px solid var(--line);border-radius:var(--r);padding:16px}
    .sim-panel h3{font-size:21px;margin:0 0 8px}
    .sim-h4{font-family:var(--body);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--rose-ink);margin:16px 0 6px;font-weight:600}
    .sim-tipp{margin:6px 0;font-size:14px;color:var(--muted)}
    .sim-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px 22px}
    .sim-farben{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
    .sim-farben button{width:38px;height:38px;border-radius:50%;border:2px solid var(--paper);box-shadow:0 0 0 1px var(--line);padding:0}
    .sim-farben button.on{box-shadow:0 0 0 3px var(--rose)}
    .sim-panel .flabel b{font-weight:500;color:var(--rose-ink);margin-left:6px}
    .sim-tech{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}
    .sim-tk{display:flex;flex-direction:column;gap:2px;text-align:left;border:1px solid var(--line);background:var(--bg);border-radius:12px;padding:10px 12px;font:inherit;color:var(--ink)}
    .sim-tk b{font-weight:500}.sim-tk span{font-size:12.5px;color:var(--muted)}.sim-tk.on{border-color:var(--rose);background:var(--rose-soft)}
    .sim-reg{display:flex;flex-direction:column;gap:4px;font-size:13.5px;color:var(--muted)}.sim-reg b{color:var(--rose-ink);font-weight:500;font-variant-numeric:tabular-nums;margin-left:4px}
    .sim-reg input{width:100%;accent-color:var(--rose)}
    .sim-schalter{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:10px}
    .sim-sw{display:flex;gap:8px;align-items:center;font-size:14px}
    .sim-sw input{width:20px;height:20px;accent-color:var(--rose);flex-shrink:0}
    .sim-fein{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap;font-size:13.5px;color:var(--muted)}
    .sim-fein b{color:var(--rose-ink);font-weight:500;margin-left:4px}
    .sim-pfeile{display:flex;gap:8px}.sim-pfeile button{width:48px;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--bg);font-size:20px;color:var(--ink);touch-action:manipulation}
    .sim-pfeile button:active{background:var(--rose-soft)}
    .sim-zoom{position:absolute;right:10px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:8px}
    .sim-zoom .sim-pill{width:44px;height:44px;padding:0;font-size:22px;line-height:1}
    .sim.fix .sim-pfeile{opacity:.35;pointer-events:none}
    .sim-mess{width:100%;border-collapse:collapse;font-size:14px}.sim-mess td{padding:6px 0;border-top:1px solid var(--line)}.sim-mess td:last-child{text-align:right;font-variant-numeric:tabular-nums;font-weight:500}
    .sim-mess tr:first-child td{border-top:0}
    .sim-vgl{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
    .sim-vk{border:2px solid var(--line);background:#16120f;border-radius:12px;padding:0;overflow:hidden;position:relative;font:inherit}
    .sim-vk canvas{width:100%;display:block}.sim-vk span{position:absolute;left:6px;bottom:6px;right:6px;background:rgba(30,22,18,.7);color:#fff;border-radius:6px;padding:3px 6px;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;text-align:left}
    .sim-vk.on{border-color:var(--rose)}
    .sim.kunde .sim-panel,.sim.kunde .sim-schritte,.sim.kunde .sim-druck,.sim.kunde .seg{display:none}`;
  document.head.append(css);
})();
