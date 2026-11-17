// Retusche für Nachher-Fotos. Läuft komplett im Browser: Das Foto verlässt das Gerät nur,
// wenn du das Ergebnis in der Akte speicherst (dann in deinen eigenen Google-Drive-Ordner).
// Das Original bleibt immer erhalten, das bearbeitete Bild kommt als zusätzliches Nachher-Foto dazu.
// Aufruf: FCC.retusche({ src, titel, speichern: async file => {} })
(function () {
  'use strict';
  const FCC = window.FCC = window.FCC || {};
  const toast = (m, lang) => FCC.toast ? FCC.toast(m, lang) : null;

  const ICON = {
    bereinigen: '<path d="M9 3h6v5H9z"/><path d="M6.5 8h11l1 4h-13z"/><path d="M6 12l-1 8M9.5 12l-.5 8M14.5 12l.5 8M18 12l1 8"/>',
    maske: '<path d="M7 3h10l-2 8H9z"/><path d="M9 11h6v2.5H9z"/><path d="M10.2 13.5h3.6V21h-3.6z"/>',
    glaetten: '<path d="M12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z"/><path d="M9.5 15.5a2.6 2.6 0 0 0 2.5 2.5"/>',
    stark: '<path d="M10 4c2.5 4 5 6.5 5 10a5 5 0 0 1-10 0c0-3.5 2.5-6 5-10z"/><path d="M15.5 4.5c2.3 3.5 4.5 6 4.5 9.2a5 5 0 0 1-2.4 4.3"/>',
    abkuehlen: '<path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/>',
    details: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M12 2v1.5M5 4.5l1 1.2M19 4.5l-1 1.2"/>',
    bleichen: '<path d="M3 10c2-2.5 5-3 9-1 4-2 7-1.5 9 1-2 6-6 8-9 8s-7-2-9-8z"/><path d="M4.5 11c4 1.8 11 1.8 15 0"/>',
    verheilen: '<g transform="rotate(-45 12 12)"><rect x="2.5" y="8" width="19" height="8" rx="4"/><path d="M9 8v8M15 8v8"/></g>',
    ueberlagern: '<rect x="3" y="3" width="12" height="12" rx="2"/><rect x="9" y="9" width="12" height="12" rx="2"/>',
    verschwinden: '<path d="M15.5 3.5l5 5L10 19H5.5l-2.5-2.5z"/><path d="M13 19h8M9 10l5 5"/>',
    unschaerfe: '<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8.5" stroke-dasharray="2 3"/>',
    brush: '<path d="M14 4l6 6-8 8-6-6z"/><path d="M6 12l-2 6 2 2 6-2"/>',
    eraser: '<path d="M15.5 3.5l5 5L10 19H5.5l-2.5-2.5z"/><path d="M13 19h8"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    pip: '<path d="M14 4l6 6-2 2-6-6z"/><path d="M13 7l-8 8v4h4l8-8"/>',
    fill: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 14l6-6 10 10"/>',
    clear: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9l6 6M15 9l-6 6"/>',
    target: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
    vorher: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>',
    hilfe: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><path d="M12 17h.01"/>',
    zu: '<path d="M6 6l12 12M18 6L6 18"/>',
    ok: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'
  };
  const svg = n => `<svg class="rt-i" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;

  const SKIN = [[247, 224, 206], [238, 205, 180], [226, 186, 156], [210, 163, 128], [190, 140, 105], [160, 112, 80], [125, 85, 60], [88, 58, 42]];
  // Werte aus dem Spickzettel sind voreingestellt (def). rec = was im Spickzettel steht.
  const TOOLS = {
    bereinigen: { name: 'Bereinigen', kind: 'brush', def: 50, size: 30, hint: 'Haut abfahren, Pigmentiertes auslassen', rec: '50 %',
      info: 'Für Poren und Unregelmäßigkeiten. Fahr die Haut komplett ab. Brauen, Lidstrich und Lippen lässt du aus, damit deine Arbeit echt bleibt.' },
    maske: { name: 'Maske', kind: 'brush', def: 50, size: 40, hint: 'Alles noch einmal abfahren', rec: '50 %',
      info: 'Wirkt wie eine leichte Foundation. Fahr die Haut noch einmal komplett ab, der Hautton wird gleichmäßiger.' },
    glaetten: { name: 'Glätten', kind: 'brush', def: 50, size: 35, hint: 'Haut wird weicher, Struktur bleibt', rec: 'noch offen',
      info: 'Die Haut wirkt weicher, feine Struktur bleibt sichtbar. Deinen Wert hast du noch nicht festgelegt, Start ist 50 %.' },
    stark: { name: 'St. glätten', kind: 'brush', def: 50, size: 35, hint: 'Stärker glätten, sparsam', rec: 'noch offen',
      info: 'Glättet deutlich stärker. Nur auf kleinen Flächen nutzen, sonst wirkt die Haut wie Plastik.' },
    abkuehlen: { name: 'Abkühlen', kind: 'brush', def: 30, size: 30, hint: 'Rötungen abfahren', rec: '30 %',
      info: 'Rötungen bekommen einen leichten Graustich. So wirken sie kühler und neutraler. Frische Rötung direkt um die Braue darfst du auch ehrlich zeigen.' },
    details: { name: 'Details', kind: 'brush', def: 45, size: 14, hint: 'Augen abfahren für mehr Strahlkraft', rec: '40 bis 50 %',
      info: 'Bringt die Augenfarbe zum Leuchten. Fahr nur die Iris ab.' },
    bleichen: { name: 'Bleichen', kind: 'brush', def: 30, size: 10, hint: 'Augenweiß und Zähne', rec: '30 %',
      info: 'Macht Augenweiß und Zähne heller. Mehr als 30 % wirkt schnell künstlich.' },
    verheilen: { name: 'Verheilen', kind: 'tap', size: 10, hint: 'Auf Pickel, Narbe oder Fleck tippen', rec: 'Kreis passend zum Makel',
      info: 'Stell die Kreisgröße etwas größer als den Makel ein und tipp darauf. Der Fleck wird mit der Haut drumherum aufgefüllt, wie weggewischt.' },
    kontur: { name: 'Kontur', kind: 'brush', def: 5, mult: 3, size: 35, blend: 'multiply', hint: 'Schatten setzen, wenig Stärke', rec: 'etwa 5 %',
      colors: [[176, 128, 98], [150, 104, 78], [124, 84, 62], [100, 70, 55]],
      info: 'Setzt Schatten wie Bronzer: Wangenknochen, Schläfen, Kieferlinie. Mit der Pipette tippst du auf die Haut, dann passt der Ton zur Kundin.' },
    aufhellen: { name: 'Aufhellen', kind: 'brush', def: 20, size: 30, blend: 'screen', hint: 'Highlight setzen', rec: 'nach Gefühl',
      colors: [[255, 240, 226], [255, 228, 205], [250, 235, 215]],
      info: 'Hellt auf wie ein Highlighter: Nasenrücken, unter der Braue, Wangenknochen oben.' },
    hautton: { name: 'Hautton', kind: 'brush', def: 35, size: 40, blend: 'tone', hint: 'Ton wählen oder per Pipette aufnehmen', rec: '30 bis 40 %',
      colors: SKIN, start: 2,
      info: 'Gleicht den Hautton an. Nimm mit der Pipette den Ton von einer schönen Stelle auf und fahr über die ungleichen Stellen.' },
    schwarz: { name: 'Schwarz', kind: 'brush', def: 50, size: 5, blend: 'multiply', hint: 'Wimpernkranz abfahren', rec: 'nach Gefühl',
      colors: [[22, 16, 16], [55, 38, 30], [80, 62, 52]],
      info: 'Fahr den Wimpernkranz ab, die Wimpern wirken dichter. Mit kleinem Pinsel und hineingezoomt arbeiten.' },
    ueberlagern: { name: 'Überlagern', kind: 'clone', def: 100, size: 25, hint: 'Erst schöne Stelle antippen, dann übermalen', rec: '100 %',
      info: 'Kopiert Haut von einer schönen Stelle auf eine unruhige. Erst die Quelle antippen, dann über die Stelle malen, die ebenmäßiger werden soll.' },
    verschwinden: { name: 'Verschwinden', kind: 'brush', def: 80, size: 10, hint: 'Kleine Unebenheiten abfahren', rec: 'nach Gefühl',
      info: 'Für ganz kleine Unebenheiten, die nach allem anderen noch übrig sind.' },
    unschaerfe: { name: 'Unschärfe', kind: 'brush', param: 'blur', def: 50, size: 60, hint: 'Hintergrund abfahren', rec: 'etwas verschwommen',
      info: 'Am schnellsten: „Alles füllen“ tippen, dann mit dem Radierer über die Kundin fahren. So bleibt sie scharf und der Hintergrund verschwimmt.' }
  };
  const TABS = [
    { id: 'ret', name: 'Retuschieren', groups: [['Haut', ['bereinigen', 'maske', 'glaetten', 'stark']], ['Farbe', ['abkuehlen']], ['Augen & Zähne', ['details', 'bleichen']], ['Makel', ['verheilen']]] },
    { id: 'mu', name: 'Make-up', groups: [['Malen', ['kontur', 'aufhellen', 'hautton', 'schwarz']]] },
    { id: 'ue', name: 'Überlagern', groups: [['', ['ueberlagern', 'verschwinden']]] },
    { id: 'ku', name: 'Kulisse', groups: [['', ['unschaerfe']]] }
  ];
  const MAXPX = 2000; // Arbeitsgröße, passt zur Ablage in Drive

  FCC.retusche = function (opt) {
    if (document.querySelector('.rt-bg')) return;
    const root = document.createElement('div');
    root.className = 'rt-bg';
    root.innerHTML = `<div class="rt" role="dialog" aria-label="Foto bearbeiten">
      <div class="rt-top">
        <button type="button" class="rt-hb" data-a="zu" title="Schließen">${svg('zu')}<span>Schließen</span></button>
        <div class="rt-titel">${opt.titel ? String(opt.titel).replace(/[&<>"']/g, '') : 'Nachher bearbeiten'}</div>
        <button type="button" class="rt-hb" data-a="undo" disabled title="Rückgängig">${svg('undo')}<span>Zurück</span></button>
        <button type="button" class="rt-hb" data-a="redo" disabled title="Wiederholen">${svg('redo')}<span>Vor</span></button>
        <button type="button" class="rt-hb" data-a="vorher" title="Gedrückt halten: Vorher">${svg('vorher')}<span>Vorher</span></button>
        <button type="button" class="rt-hb" data-a="hilfe" title="So gehst du vor">${svg('hilfe')}<span>Hilfe</span></button>
        <button type="button" class="btn small rt-save" data-a="save">In Akte speichern</button>
      </div>
      <div class="rt-stage">
        <canvas class="rt-cv"></canvas>
        <div class="rt-cursor"></div><div class="rt-marker"></div>
        <div class="rt-badge">Original</div><div class="rt-busy">rechnet …</div>
        <div class="rt-leer">Foto lädt …</div>
      </div>
      <div class="rt-panel">
        <div class="rt-opts"></div>
        <div class="rt-srow rt-rowStr"><label class="rt-lblStr">Stärke</label><input type="range" class="rt-sStr" min="0" max="100" value="50" aria-label="Stärke"><span class="rt-val rt-vStr">50 %</span><button type="button" class="rt-reset">Dein Wert</button></div>
        <div class="rt-srow"><label class="rt-lblSize">Pinsel</label><input type="range" class="rt-sSize" min="1" max="100" value="30" aria-label="Pinselgröße"><span class="rt-val rt-vSize"></span></div>
        <div class="rt-swatches"></div>
        <div class="rt-tools"></div>
        <div class="rt-tabs"></div>
        <div class="rt-actions">
          <button type="button" class="rt-ab" data-a="cancel" title="Verwerfen" disabled>${svg('zu')}</button>
          <button type="button" class="rt-tname"><b><span class="rt-tnameTxt"></span>${svg('info')}</b><small class="rt-thint"></small></button>
          <button type="button" class="rt-ab rt-apply" data-a="apply" title="Übernehmen" disabled>${svg('ok')}</button>
        </div>
      </div>
      <div class="rt-modal"><div class="rt-sheet"></div></div>
    </div>`;
    document.body.append(root);
    document.documentElement.classList.add('rt-offen');
    const q = s => root.querySelector(s), qa = s => root.querySelectorAll(s);
    const cv = q('.rt-cv'), ctx = cv.getContext('2d'), stage = q('.rt-stage');

    // ---------- Zustand ----------
    let W = 0, H = 0, S = 0, base = null, orig = null, mask = null, out = null;
    let baseVer = 0, eff = null, effK = '', blurCache = new Map();
    let tab = 'ret', tool = 'bereinigen', erase = false, showMask = false, pipette = false, pending = false, geaendert = false, speichert = false;
    let undo = [], redo = [];
    const used = new Set(), vals = {}, sizes = {}, colors = {}, custom = {};
    for (const k in TOOLS) { vals[k] = TOOLS[k].def != null ? TOOLS[k].def : 50; sizes[k] = TOOLS[k].size; if (TOOLS[k].colors) colors[k] = TOOLS[k].colors[TOOLS[k].start || 0].slice(); }
    let cloneSrc = null, cloneOff = null;
    const view = { s: 1, tx: 0, ty: 0, fit: 1 };
    const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
    const busy = on => { q('.rt-busy').style.display = on ? 'block' : 'none'; };
    const brushR = () => Math.max(1, S * (0.002 + sizes[tool] / 100 * 0.09));
    const blurR = () => Math.max(1, Math.round(S / 500 + vals.unschaerfe / 100 * S / 40));
    const strengthK = () => { const t = TOOLS[tool]; return t.param === 'blur' ? 1 : Math.min(1, vals[tool] / 100 * (t.mult || 1)); };

    // ---------- Weichzeichnen (dreifacher Kastenfilter, wirkt wie Gauß) ----------
    function boxH(s, d, r) { const inv = 1 / (2 * r + 1), wm = W - 1; for (let y = 0; y < H; y++) { const o = y * W; let acc = 0; for (let i = -r; i <= r; i++) acc += s[o + (i < 0 ? 0 : i > wm ? wm : i)]; for (let x = 0; x < W; x++) { d[o + x] = acc * inv; const a = x + r + 1, b = x - r; acc += s[o + (a > wm ? wm : a)] - s[o + (b < 0 ? 0 : b)]; } } }
    function boxV(s, d, r) { const inv = 1 / (2 * r + 1), hm = H - 1; for (let x = 0; x < W; x++) { let acc = 0; for (let i = -r; i <= r; i++) acc += s[(i < 0 ? 0 : i > hm ? hm : i) * W + x]; for (let y = 0; y < H; y++) { d[y * W + x] = acc * inv; const a = y + r + 1, b = y - r; acc += s[(a > hm ? hm : a) * W + x] - s[(b < 0 ? 0 : b) * W + x]; } } }
    function blur(r) {
      r = Math.max(1, Math.round(r)); const key = r + '|' + baseVer; if (blurCache.has(key)) return blurCache.get(key);
      const n = W * H, pl = [new Float32Array(n), new Float32Array(n), new Float32Array(n)], tmp = new Float32Array(n);
      for (let i = 0, j = 0; i < n; i++, j += 4) { pl[0][i] = base[j]; pl[1][i] = base[j + 1]; pl[2][i] = base[j + 2]; }
      for (const p of pl) for (let k = 0; k < 3; k++) { boxH(p, tmp, r); boxV(tmp, p, r); }
      const o = new Uint8ClampedArray(n * 4); for (let i = 0, j = 0; i < n; i++, j += 4) { o[j] = pl[0][i]; o[j + 1] = pl[1][i]; o[j + 2] = pl[2][i]; o[j + 3] = 255; }
      if (blurCache.size > 5) blurCache.clear(); blurCache.set(key, o); return o;
    }

    // ---------- Wirkung je Werkzeug ----------
    function mixDetail(bl, bs, amt) { const n = W * H * 4, e = new Uint8ClampedArray(n); for (let j = 0; j < n; j += 4) { e[j] = bl[j] + (base[j] - bs[j]) * amt; e[j + 1] = bl[j + 1] + (base[j + 1] - bs[j + 1]) * amt; e[j + 2] = bl[j + 2] + (base[j + 2] - bs[j + 2]) * amt; e[j + 3] = 255; } return e; }
    function pixelOp(fn) { const n = W * H * 4, e = new Uint8ClampedArray(n), b = base; for (let j = 0; j < n; j += 4) { fn(b[j], b[j + 1], b[j + 2], e, j); e[j + 3] = 255; } return e; }
    function computeEff() {
      const t = TOOLS[tool];
      switch (tool) {
        case 'bereinigen': { const b = blur(S / 450); return mixDetail(b, b, 0.15); }
        case 'maske': return mixDetail(blur(S / 110), blur(S / 700), 0.5);
        case 'glaetten': return mixDetail(blur(S / 220), blur(S / 700), 0.3);
        case 'stark': { const b = blur(S / 120); return mixDetail(b, b, 0); }
        case 'verschwinden': return mixDetail(blur(S / 170), blur(S / 700), 0.12);
        case 'unschaerfe': { const b = blur(blurR()); return mixDetail(b, b, 0); }
        case 'abkuehlen': return pixelOp((r, g, b, e, j) => { const L = 0.299 * r + 0.587 * g + 0.114 * b, k = clamp((r - (g + b) / 2) / 55, 0, 1); e[j] = r + (L * 0.97 - r) * k; e[j + 1] = g + (L - g) * k; e[j + 2] = b + (L * 1.03 - b) * k; });
        case 'details': { const bs = blur(S / 600); return pixelOp((r, g, b, e, j) => { const R = r + (r - bs[j]) * 1.3, G = g + (g - bs[j + 1]) * 1.3, B = b + (b - bs[j + 2]) * 1.3, L = 0.299 * R + 0.587 * G + 0.114 * B; e[j] = L + (R - L) * 1.18 + 4; e[j + 1] = L + (G - L) * 1.18 + 4; e[j + 2] = L + (B - L) * 1.18 + 4; }); }
        case 'bleichen': return pixelOp((r, g, b, e, j) => { const L = 0.299 * r + 0.587 * g + 0.114 * b, R = L + (r - L) * 0.3, G = L + (g - L) * 0.3, B = L + (b - L) * 0.3; e[j] = R + (255 - R) * 0.28; e[j + 1] = G + (255 - G) * 0.28; e[j + 2] = B + (255 - B) * 0.3; });
        case 'ueberlagern': {
          const e = new Uint8ClampedArray(base); if (!cloneOff) return e;
          const dx = Math.round(cloneOff.dx), dy = Math.round(cloneOff.dy);
          for (let y = 0; y < H; y++) { const sy = clamp(y + dy, 0, H - 1); for (let x = 0; x < W; x++) { const sx = clamp(x + dx, 0, W - 1), j = (y * W + x) * 4, s = (sy * W + sx) * 4; e[j] = base[s]; e[j + 1] = base[s + 1]; e[j + 2] = base[s + 2]; } }
          return e;
        }
      }
      const c = colors[tool];
      if (t.blend === 'multiply') return pixelOp((r, g, b, e, j) => { e[j] = r * c[0] / 255; e[j + 1] = g * c[1] / 255; e[j + 2] = b * c[2] / 255; });
      if (t.blend === 'screen') return pixelOp((r, g, b, e, j) => { e[j] = 255 - (255 - r) * (255 - c[0]) / 255; e[j + 1] = 255 - (255 - g) * (255 - c[1]) / 255; e[j + 2] = 255 - (255 - b) * (255 - c[2]) / 255; });
      if (t.blend === 'tone') { const Lc = Math.max(1, 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]); return pixelOp((r, g, b, e, j) => { const f = (0.299 * r + 0.587 * g + 0.114 * b) / Lc; e[j] = c[0] * f; e[j + 1] = c[1] * f; e[j + 2] = c[2] * f; }); }
      return new Uint8ClampedArray(base);
    }
    function effKey() { const t = TOOLS[tool]; let k = tool + '|' + baseVer; if (t.param === 'blur') k += '|' + blurR(); if (colors[tool]) k += '|' + colors[tool].join(','); if (t.kind === 'clone') k += '|' + (cloneOff ? Math.round(cloneOff.dx) + ',' + Math.round(cloneOff.dy) : '-'); return k; }
    function getEff() { const k = effKey(); if (eff && effK === k) return eff; eff = computeEff(); effK = k; return eff; }
    function warmEff() { if (!base || TOOLS[tool].kind === 'tap') return; if (eff && effK === effKey()) return; busy(true); setTimeout(() => { if (!base) return; getEff(); busy(false); if (pending) renderAll(); }, 20); }

    // ---------- Zeichnen ----------
    let dr = null, raf = 0;
    function dirty(x0, y0, x1, y1) { if (!dr) dr = [x0, y0, x1, y1]; else { dr[0] = Math.min(dr[0], x0); dr[1] = Math.min(dr[1], y0); dr[2] = Math.max(dr[2], x1); dr[3] = Math.max(dr[3], y1); } if (!raf) raf = requestAnimationFrame(flush); }
    function flush() { raf = 0; if (!dr) return; const d = dr; dr = null; renderRect(d[0], d[1], d[2], d[3]); }
    function renderAll() { if (base) renderRect(0, 0, W - 1, H - 1); }
    function renderRect(x0, y0, x1, y1) {
      x0 = clamp(x0 | 0, 0, W - 1); y0 = clamp(y0 | 0, 0, H - 1); x1 = clamp(Math.ceil(x1), 0, W - 1); y1 = clamp(Math.ceil(y1), 0, H - 1);
      const o = out.data, b = base, e = pending && TOOLS[tool].kind !== 'tap' ? getEff() : null, k = strengthK() / 255, sm = showMask;
      for (let y = y0; y <= y1; y++) {
        let i = y * W + x0, j = i * 4;
        for (let x = x0; x <= x1; x++, i++, j += 4) {
          let r = b[j], g = b[j + 1], bl = b[j + 2]; const m = mask[i];
          if (m && e) { const a = m * k; r += (e[j] - r) * a; g += (e[j + 1] - g) * a; bl += (e[j + 2] - bl) * a; }
          if (sm && m) { const a = m / 255 * 0.42; r += (225 - r) * a; g += (40 - g) * a; bl += (110 - bl) * a; }
          o[j] = r; o[j + 1] = g; o[j + 2] = bl; o[j + 3] = 255;
        }
      }
      ctx.putImageData(out, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }

    // ---------- Rückgängig ----------
    function trim() { let nb = 0; for (let i = undo.length - 1; i >= 0; i--) if (undo[i].t === 'b' && ++nb > 8) undo.splice(i, 1); let nm = 0; for (let i = undo.length - 1; i >= 0; i--) if (undo[i].t === 'm' && ++nm > 15) undo.splice(i, 1); }
    function pushBase() { undo = undo.filter(u => u.t === 'b'); undo.push({ t: 'b', d: base.slice() }); redo = []; trim(); updBtns(); }
    function pushMask() { undo.push({ t: 'm', d: mask.slice() }); redo = []; trim(); updBtns(); }
    function anyMask() { for (let i = 0; i < mask.length; i++) if (mask[i]) return true; return false; }
    function baseChanged() { baseVer++; blurCache.clear(); eff = null; effK = ''; geaendert = true; }
    function step(from, to) {
      const u = from.pop(); if (!u) return;
      if (u.t === 'm') { to.push({ t: 'm', d: mask.slice() }); mask.set(u.d); pending = anyMask(); }
      else { to.push({ t: 'b', d: base.slice() }); base.set(u.d); baseChanged(); mask.fill(0); pending = false; cloneOff = null; }
      renderAll(); updBtns(); warmEff();
    }
    function updBtns() { q('[data-a=undo]').disabled = !undo.length; q('[data-a=redo]').disabled = !redo.length; q('[data-a=apply]').disabled = !pending; q('[data-a=cancel]').disabled = !pending; }

    // ---------- Übernehmen / Verwerfen ----------
    function commit(still) {
      if (!pending) return false;
      pushBase(); const e = getEff(), k = strengthK() / 255, n = W * H;
      for (let i = 0, j = 0; i < n; i++, j += 4) { const m = mask[i]; if (!m) continue; const a = m * k; base[j] += (e[j] - base[j]) * a; base[j + 1] += (e[j + 1] - base[j + 1]) * a; base[j + 2] += (e[j + 2] - base[j + 2]) * a; }
      mask.fill(0); pending = false; used.add(tool); cloneOff = null; baseChanged(); renderAll(); updBtns(); renderTools();
      if (!still) toast(TOOLS[tool].name + ' übernommen'); return true;
    }
    function cancel() { if (!pending) return; mask.fill(0); pending = false; undo = undo.filter(u => u.t === 'b'); cloneOff = null; renderAll(); updBtns(); }

    // ---------- Pinsel ----------
    function stamp(x, y, r) {
      const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r)), y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H - 1, Math.ceil(y + r));
      if (x0 > x1 || y0 > y1) return; const r2 = r * r, hard = 0.4;
      for (let yy = y0; yy <= y1; yy++) {
        const dy = yy - y;
        for (let xx = x0; xx <= x1; xx++) {
          const dx = xx - x, d2 = dx * dx + dy * dy; if (d2 > r2) continue;
          const d = Math.sqrt(d2) / r; let v = d <= hard ? 1 : 1 - (d - hard) / (1 - hard); v = v * v * (3 - 2 * v); const i = yy * W + xx;
          if (erase) mask[i] = mask[i] * (1 - v); else { const m = v * 255; if (m > mask[i]) mask[i] = m; }
        }
      }
      dirty(x0, y0, x1, y1);
    }
    let last = null;
    function beginStroke(p) {
      pushMask();
      if (TOOLS[tool].kind === 'clone' && !cloneOff && cloneSrc) cloneOff = { dx: cloneSrc.x - p.x, dy: cloneSrc.y - p.y };
      if (!erase) pending = true;
      getEff(); last = p; stamp(p.x, p.y, brushR());
    }
    function strokeTo(p) { const r = brushR(), dx = p.x - last.x, dy = p.y - last.y, n = Math.floor(Math.hypot(dx, dy) / Math.max(1, r * 0.2)); if (n < 1) return; for (let k = 1; k <= n; k++) stamp(last.x + dx * k / n, last.y + dy * k / n, r); last = p; }
    function endStroke() { if (erase) pending = anyMask(); updBtns(); }

    // ---------- Verheilen: Fleck mit der Haut drumherum auffüllen, Struktur von einer ähnlichen Stelle ----------
    function px(x, y) { x = clamp(Math.round(x), 0, W - 1); y = clamp(Math.round(y), 0, H - 1); const j = (y * W + x) * 4; return [base[j], base[j + 1], base[j + 2]]; }
    function meanCircle(cx, cy, R) { const s = [0, 0, 0]; let n = 0; const st = Math.max(1, R / 6); for (let y = -R; y <= R; y += st) for (let x = -R; x <= R; x += st) { if (x * x + y * y > R * R) continue; const p = px(cx + x, cy + y); s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; n++; } return s.map(v => v / Math.max(1, n)); }
    function heal(cx, cy) {
      const R = Math.max(3, brushR()); pushBase();
      const N = 48, ring = [], rr = R * 1.12, rm = [0, 0, 0];
      for (let k = 0; k < N; k++) {
        const a = k / N * Math.PI * 2, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr, c = [0, 0, 0];
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const p = px(x + ox, y + oy); c[0] += p[0] / 9; c[1] += p[1] / 9; c[2] += p[2] / 9; }
        ring.push({ x, y, c }); rm[0] += c[0] / N; rm[1] += c[1] / N; rm[2] += c[2] / N;
      }
      let best = null, bd = 1e9; const D = R * 2.5;
      for (let a = 0; a < 12; a++) {
        const an = a / 12 * Math.PI * 2, bx = cx + Math.cos(an) * D, by = cy + Math.sin(an) * D;
        if (bx - R < 0 || by - R < 0 || bx + R >= W || by + R >= H) continue;
        const m = meanCircle(bx, by, R), dd = Math.abs(m[0] - rm[0]) + Math.abs(m[1] - rm[1]) + Math.abs(m[2] - rm[2]);
        if (dd < bd) { bd = dd; best = { x: bx, y: by, m }; }
      }
      const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W - 1, Math.ceil(cx + R)), y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(H - 1, Math.ceil(cy + R)), res = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy) / R; if (d > 1) continue;
        let sw = 0, v0 = 0, v1 = 0, v2 = 0;
        for (const s of ring) { const ex = x - s.x, ey = y - s.y, w = 1 / (ex * ex + ey * ey + 1); sw += w; v0 += s.c[0] * w; v1 += s.c[1] * w; v2 += s.c[2] * w; }
        v0 /= sw; v1 /= sw; v2 /= sw;
        if (best) { const p = px(best.x + dx, best.y + dy); v0 += (p[0] - best.m[0]) * 0.85; v1 += (p[1] - best.m[1]) * 0.85; v2 += (p[2] - best.m[2]) * 0.85; }
        let a = d < 0.65 ? 1 : 1 - (d - 0.65) / 0.35; a = a * a * (3 - 2 * a); res.push(x, y, v0, v1, v2, a);
      }
      for (let k = 0; k < res.length; k += 6) { const j = (res[k + 1] * W + res[k]) * 4, a = res[k + 5]; base[j] += (res[k + 2] - base[j]) * a; base[j + 1] += (res[k + 3] - base[j + 1]) * a; base[j + 2] += (res[k + 4] - base[j + 2]) * a; }
      baseChanged(); used.add('verheilen'); renderRect(x0, y0, x1, y1); renderTools(); updBtns();
    }

    // ---------- Pipette ----------
    function pick(p) {
      let c = [0, 0, 0], n = 0;
      for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const v = px(p.x + x, p.y + y); c[0] += v[0]; c[1] += v[1]; c[2] += v[2]; n++; }
      c = c.map(v => Math.round(v / n)); colors[tool] = c; custom[tool] = c; pipette = false;
      renderOpts(); renderSwatches(); renderTools(); if (pending) renderAll(); else warmEff(); toast('Farbton aufgenommen');
    }

    // ---------- Ansicht ----------
    function applyView() { cv.style.transform = `translate(${view.tx}px,${view.ty}px) scale(${view.s})`; placeMarker(); }
    function fit() { if (!base) return; const r = stage.getBoundingClientRect(), s = Math.min(r.width / W, r.height / H) * 0.96; view.fit = s; view.s = s; view.tx = (r.width - W * s) / 2; view.ty = (r.height - H * s) / 2; applyView(); }
    function toImg(cx, cy) { const r = stage.getBoundingClientRect(); return { x: (cx - r.left - view.tx) / view.s, y: (cy - r.top - view.ty) / view.s }; }
    const zMax = () => Math.max(view.fit * 14, 6);
    function zoomAt(cx, cy, ns) { const r = stage.getBoundingClientRect(); ns = clamp(ns, view.fit * 0.6, zMax()); const ix = (cx - r.left - view.tx) / view.s, iy = (cy - r.top - view.ty) / view.s; view.s = ns; view.tx = cx - r.left - ix * ns; view.ty = cy - r.top - iy * ns; applyView(); }
    function placeMarker() {
      const m = q('.rt-marker');
      if (!base || TOOLS[tool].kind !== 'clone' || !cloneSrc) { m.style.display = 'none'; return; }
      let p = cloneSrc; if (cloneOff && last && mode === 'paint') p = { x: last.x + cloneOff.dx, y: last.y + cloneOff.dy };
      m.style.display = 'block'; m.style.left = (view.tx + p.x * view.s) + 'px'; m.style.top = (view.ty + p.y * view.s) + 'px';
    }
    function showCursor(cx, cy) { const c = q('.rt-cursor'), r = stage.getBoundingClientRect(), d = brushR() * 2 * view.s; c.style.display = 'block'; c.style.width = c.style.height = d + 'px'; c.style.left = (cx - r.left) + 'px'; c.style.top = (cy - r.top) + 'px'; }
    const hideCursor = () => { q('.rt-cursor').style.display = 'none'; };

    // ---------- Finger, Stift und Maus ----------
    const pts = new Map(); let mode = null, down = null, moved = false, pinch0 = null;
    stage.addEventListener('pointerdown', e => {
      if (!base) return;
      e.preventDefault(); try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { // zweiter Finger: Strich zurücknehmen, zoomen und verschieben
        if (mode === 'paint') { const u = undo[undo.length - 1]; if (u && u.t === 'm') { undo.pop(); mask.set(u.d); pending = anyMask(); renderAll(); updBtns(); } }
        const [a, b] = [...pts.values()];
        pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, s: view.s, tx: view.tx, ty: view.ty };
        mode = 'pinch'; hideCursor(); return;
      }
      if (pts.size > 2) return;
      down = { x: e.clientX, y: e.clientY }; moved = false;
      if (e.pointerType === 'mouse' && e.button !== 0) { mode = 'pan'; pinch0 = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty }; return; }
      const t = TOOLS[tool];
      if (pipette || t.kind === 'tap' || (t.kind === 'clone' && !cloneSrc)) { mode = 'tap'; showCursor(e.clientX, e.clientY); return; }
      mode = 'paint'; showCursor(e.clientX, e.clientY); beginStroke(toImg(e.clientX, e.clientY)); placeMarker();
    });
    stage.addEventListener('pointermove', e => {
      if (!base) return;
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mode === 'pinch' && pts.size >= 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, r = stage.getBoundingClientRect();
        const ns = clamp(pinch0.s * d / pinch0.d, view.fit * 0.6, zMax()), ix = (pinch0.mx - r.left - pinch0.tx) / pinch0.s, iy = (pinch0.my - r.top - pinch0.ty) / pinch0.s;
        view.s = ns; view.tx = mx - r.left - ix * ns; view.ty = my - r.top - iy * ns; applyView(); return;
      }
      if (mode === 'pan') { view.tx = pinch0.tx + e.clientX - pinch0.x; view.ty = pinch0.ty + e.clientY - pinch0.y; applyView(); return; }
      if (!pts.has(e.pointerId)) { if (e.pointerType === 'mouse') showCursor(e.clientX, e.clientY); return; }
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) moved = true;
      if (mode === 'paint') { showCursor(e.clientX, e.clientY); strokeTo(toImg(e.clientX, e.clientY)); placeMarker(); }
      else if (mode === 'tap') showCursor(e.clientX, e.clientY);
    });
    function up(e) {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
      if (mode === 'tap' && !moved && pts.size === 0) {
        const p = toImg(e.clientX, e.clientY);
        if (p.x >= 0 && p.y >= 0 && p.x < W && p.y < H) {
          if (pipette) pick(p);
          else if (TOOLS[tool].kind === 'tap') heal(p.x, p.y);
          else if (TOOLS[tool].kind === 'clone') { cloneSrc = p; cloneOff = null; placeMarker(); toast('Quelle gesetzt. Jetzt über die unruhige Stelle malen.'); }
        }
      }
      if (mode === 'paint') endStroke();
      if (pts.size === 0) { mode = null; last = null; if (e.pointerType !== 'mouse') hideCursor(); placeMarker(); }
      else if (pts.size === 1 && mode === 'pinch') mode = 'none';
    }
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !pts.size) hideCursor(); });
    stage.addEventListener('contextmenu', e => e.preventDefault());
    stage.addEventListener('wheel', e => { if (!base) return; e.preventDefault(); zoomAt(e.clientX, e.clientY, view.s * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    stage.addEventListener('gesturestart', e => e.preventDefault());

    // ---------- Bedienfeld ----------
    function selectTab(id, toolId) { if (pending) commit(); tab = id; const T = TABS.find(t => t.id === id); selectTool(toolId || T.groups[0][1][0], true); renderTabs(); }
    function selectTool(id, force) {
      if (id === tool && !force) return;
      if (pending) commit(); tool = id; erase = false; pipette = false; cloneOff = null;
      renderTools(); renderOpts(); renderSliders(); renderSwatches();
      q('.rt-tnameTxt').textContent = TOOLS[id].name; q('.rt-thint').textContent = TOOLS[id].hint; placeMarker(); warmEff();
      const el = q('.rt-tile.on'); if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    function renderTabs() { q('.rt-tabs').innerHTML = TABS.map(t => `<button type="button" data-tab="${t.id}" class="${t.id === tab ? 'on' : ''}">${t.name}</button>`).join(''); }
    function renderTools() {
      const T = TABS.find(t => t.id === tab);
      q('.rt-tools').innerHTML = T.groups.map(([cap, ids]) => `<div class="rt-grp">${cap ? `<div class="rt-cap">${cap}</div>` : ''}<div class="rt-row">${ids.map(id => {
        const t = TOOLS[id], ic = t.colors ? `<span class="rt-swc" style="background:rgb(${colors[id].join(',')})"></span>` : svg(id);
        return `<button type="button" class="rt-tile${id === tool ? ' on' : ''}${used.has(id) ? ' used' : ''}" data-tool="${id}">${ic}<span>${t.name}</span><i class="rt-dot"></i></button>`;
      }).join('')}</div></div>`).join('');
    }
    function renderOpts() {
      const t = TOOLS[tool]; let h = '';
      if (t.kind !== 'tap') {
        h += `<div class="seg rt-seg"><button type="button" data-op="brush" class="${!erase ? 'on' : ''}">${svg('brush')}Pinsel</button><button type="button" data-op="erase" class="${erase ? 'on' : ''}">${svg('eraser')}Radierer</button></div>`;
        h += `<button type="button" class="rt-chip${showMask ? ' on' : ''}" data-op="mask" title="Bemalte Fläche zeigen">${svg('eye')}Fläche</button>`;
      }
      if (t.colors) h += `<button type="button" class="rt-chip${pipette ? ' on' : ''}" data-op="pip">${svg('pip')}Pipette</button>`;
      if (t.kind === 'clone') h += `<button type="button" class="rt-chip" data-op="src">${svg('target')}Neue Quelle</button>`;
      if (t.param === 'blur') h += `<button type="button" class="rt-chip" data-op="fill">${svg('fill')}Alles füllen</button><button type="button" class="rt-chip" data-op="clear">${svg('clear')}Leeren</button>`;
      q('.rt-opts').innerHTML = h;
    }
    function resetLabel() { const t = TOOLS[tool], d = vals[tool] === t.def; const b = q('.rt-reset'); b.textContent = t.rec === 'noch offen' ? 'Wert offen' : (d ? 'Dein Wert ✓' : 'Dein Wert'); b.disabled = d; }
    function renderSliders() {
      const t = TOOLS[tool];
      q('.rt-rowStr').style.display = t.kind === 'tap' ? 'none' : 'flex';
      q('.rt-lblStr').textContent = t.param === 'blur' ? 'Unschärfe' : 'Stärke';
      q('.rt-sStr').value = vals[tool]; q('.rt-vStr').textContent = vals[tool] + ' %'; resetLabel();
      q('.rt-lblSize').textContent = t.kind === 'tap' ? 'Kreis' : 'Pinsel'; q('.rt-sSize').value = sizes[tool]; q('.rt-vSize').textContent = sizes[tool];
    }
    function renderSwatches() {
      const t = TOOLS[tool], el = q('.rt-swatches');
      if (!t.colors) { el.style.display = 'none'; el.innerHTML = ''; return; }
      el.style.display = 'flex'; const cur = colors[tool].join(','); let list = t.colors.slice(); if (custom[tool]) list = [custom[tool], ...list];
      el.innerHTML = list.map((c, i) => `<button type="button" class="rt-sw${c.join(',') === cur ? ' on' : ''}" data-sw="${c.join(',')}" style="background:rgb(${c.join(',')})" aria-label="${i === 0 && custom[tool] ? 'Aufgenommener Ton' : 'Farbton'}"></button>`).join('');
    }
    q('.rt-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b && b.dataset.tab !== tab) selectTab(b.dataset.tab); });
    q('.rt-tools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) selectTool(b.dataset.tool); });
    q('.rt-opts').addEventListener('click', e => {
      const b = e.target.closest('[data-op]'); if (!b || !base) return; const op = b.dataset.op;
      if (op === 'brush') erase = false;
      else if (op === 'erase') erase = true;
      else if (op === 'mask') { showMask = !showMask; renderAll(); }
      else if (op === 'pip') { pipette = !pipette; if (pipette) toast('Tipp auf die Stelle, deren Farbton du willst'); }
      else if (op === 'src') { if (pending) commit(true); cloneSrc = null; cloneOff = null; placeMarker(); toast('Tipp auf die schöne Hautstelle'); }
      else if (op === 'fill') { pushMask(); mask.fill(255); pending = true; getEff(); renderAll(); updBtns(); erase = true; toast('Jetzt mit dem Radierer über die Kundin fahren'); }
      else if (op === 'clear') { if (pending) { pushMask(); mask.fill(0); pending = false; renderAll(); updBtns(); } }
      renderOpts();
    });
    q('.rt-swatches').addEventListener('click', e => { const b = e.target.closest('[data-sw]'); if (!b) return; colors[tool] = b.dataset.sw.split(',').map(Number); renderSwatches(); renderTools(); if (pending) renderAll(); else warmEff(); });
    let sT = 0;
    q('.rt-sStr').addEventListener('input', e => {
      vals[tool] = +e.target.value; q('.rt-vStr').textContent = vals[tool] + ' %'; resetLabel();
      if (!pending) return;
      if (TOOLS[tool].param === 'blur') { clearTimeout(sT); sT = setTimeout(() => { busy(true); setTimeout(() => { renderAll(); busy(false); }, 10); }, 180); }
      else if (!sT) sT = requestAnimationFrame(() => { sT = 0; renderAll(); });
    });
    q('.rt-reset').addEventListener('click', () => { vals[tool] = TOOLS[tool].def; renderSliders(); if (pending) renderAll(); toast('Dein Wert: ' + TOOLS[tool].rec); });
    let szT;
    q('.rt-sSize').addEventListener('input', e => {
      sizes[tool] = +e.target.value; q('.rt-vSize').textContent = sizes[tool]; if (!base) return;
      const r = stage.getBoundingClientRect(); showCursor(r.left + r.width / 2, r.top + r.height / 2); clearTimeout(szT); szT = setTimeout(() => { if (!pts.size) hideCursor(); }, 700);
    });
    q('.rt-tname').addEventListener('click', () => { const t = TOOLS[tool]; sheet(`<h3>${t.name}</h3><p>${t.info}</p><p class="cmeta">Dein Wert: ${t.rec}</p><button type="button" class="btn" data-close>Verstanden</button>`); });

    // ---------- Fenster im Fenster ----------
    const modal = q('.rt-modal');
    function sheet(h) { q('.rt-sheet').innerHTML = h; modal.classList.add('show'); }
    function sheetZu() { modal.classList.remove('show'); }
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.closest('[data-close]')) { sheetZu(); return; }
      const s = e.target.closest('[data-go]'); if (s) { const [tb, tl] = s.dataset.go.split(':'); sheetZu(); selectTab(tb, tl); return; }
      if (e.target.closest('[data-weg]')) { sheetZu(); schliessen(); }
    });
    function hilfe() {
      sheet(`<h3>So gehst du vor</h3><p class="cmeta">Tipp auf einen Schritt, dann springst du direkt hin. Deine Werte aus dem Spickzettel sind voreingestellt.</p>
      <div class="rt-steps">
      <button type="button" class="rt-step" data-go="ret:bereinigen"><span class="rt-n">1</span><span><b>Retuschieren</b><small>Bereinigen, Maske, Glätten, Abkühlen, Details, Bleichen, Verheilen</small></span></button>
      <button type="button" class="rt-step" data-go="mu:kontur"><span class="rt-n">2</span><span><b>Make-up</b><small>Kontur, Aufhellen, Hautton, Schwarz für den Wimpernkranz</small></span></button>
      <button type="button" class="rt-step" data-go="ue:ueberlagern"><span class="rt-n">3</span><span><b>Überlagern</b><small>Haut von schöner Stelle kopieren, kleine Unebenheiten verschwinden lassen</small></span></button>
      <button type="button" class="rt-step" data-go="ret:bereinigen"><span class="rt-n">4</span><span><b>Nochmal bereinigen</b><small>Zum Schluss alles regelmäßiger machen</small></span></button>
      <button type="button" class="rt-step" data-go="ku:unschaerfe"><span class="rt-n">5</span><span><b>Kulisse</b><small>Hintergrund unscharf, Kundin bleibt scharf</small></span></button>
      </div>
      <p class="cmeta">Zwei Finger zoomen und verschieben. Das Häkchen übernimmt, das X verwirft, beim Werkzeugwechsel wird automatisch übernommen. Pigmentierte Stellen immer auslassen, deine Arbeit soll echt bleiben. Das Original bleibt in der Akte, das bearbeitete Bild kommt dazu.</p>
      <button type="button" class="btn" data-close>Los geht's</button>`);
    }

    // ---------- Oben: Schließen, Rückgängig, Vorher, Speichern ----------
    function schliessen() {
      if (raf) cancelAnimationFrame(raf);
      root.remove(); document.documentElement.classList.remove('rt-offen');
      window.removeEventListener('resize', fit); document.removeEventListener('keydown', taste, true);
      base = orig = mask = out = eff = null; blurCache.clear(); undo = []; redo = [];
    }
    function zu() {
      if (speichert) return;
      if (geaendert || pending) { sheet(`<h3>Ohne Speichern schließen?</h3><p>Deine Bearbeitung geht verloren. Das Original bleibt in der Akte.</p><div class="row" style="gap:10px;flex-wrap:wrap"><button type="button" class="btn ghost" data-close>Weiter bearbeiten</button><button type="button" class="btn rt-gefahr" data-weg>Verwerfen</button></div>`); return; }
      schliessen();
    }
    async function speichern() {
      if (!base || speichert) return;
      if (pending) commit(true);
      if (!geaendert) { toast('Du hast noch nichts verändert.'); return; }
      const btn = q('[data-a=save]'); speichert = true; btn.disabled = true; btn.textContent = 'Speichert …';
      try {
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(base), W, H), 0, 0);
        const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
        if (!blob) throw new Error('Das Bild konnte nicht erstellt werden.');
        await opt.speichern(new File([blob], 'nachher-bearbeitet.jpg', { type: 'image/jpeg' }));
        speichert = false; schliessen(); toast(opt.meldung || 'Bearbeitetes Foto in der Akte gespeichert. Das Original bleibt erhalten.', true);
      } catch (err) {
        speichert = false; btn.disabled = false; btn.textContent = 'In Akte speichern';
        toast('Nicht gespeichert: ' + (err && err.message ? err.message : err), true);
      }
    }
    q('.rt-top').addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
      if (a === 'zu') zu(); else if (a === 'undo') step(undo, redo); else if (a === 'redo') step(redo, undo);
      else if (a === 'hilfe') hilfe(); else if (a === 'save') speichern();
    });
    q('[data-a=apply]').addEventListener('click', () => commit());
    q('[data-a=cancel]').addEventListener('click', () => { cancel(); toast('Verworfen'); });
    const vb = q('[data-a=vorher]');
    const vorher = on => { if (!base) return; if (on) { ctx.putImageData(orig, 0, 0); q('.rt-badge').style.display = 'block'; } else if (q('.rt-badge').style.display === 'block') { q('.rt-badge').style.display = 'none'; renderAll(); } };
    vb.addEventListener('pointerdown', e => { e.preventDefault(); vorher(true); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => vb.addEventListener(n, () => vorher(false)));
    vb.addEventListener('contextmenu', e => e.preventDefault());
    function taste(e) {
      if (!base) return;
      if (e.key === 'Escape') { e.stopPropagation(); if (modal.classList.contains('show')) sheetZu(); else zu(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? step(redo, undo) : step(undo, redo); }
      else if (e.key === '[') { sizes[tool] = Math.max(1, sizes[tool] - 3); renderSliders(); }
      else if (e.key === ']') { sizes[tool] = Math.min(100, sizes[tool] + 3); renderSliders(); }
    }
    document.addEventListener('keydown', taste, true);
    window.addEventListener('resize', fit);

    // ---------- Foto laden ----------
    renderTabs(); renderTools(); renderOpts(); renderSliders(); renderSwatches();
    q('.rt-tnameTxt').textContent = TOOLS[tool].name; q('.rt-thint').textContent = TOOLS[tool].hint;
    const img = new Image();
    img.onload = () => {
      if (!root.isConnected) return;
      let w = img.naturalWidth, h = img.naturalHeight; const sc = Math.min(1, MAXPX / Math.max(w, h)); w = Math.round(w * sc); h = Math.round(h * sc);
      const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(img, 0, 0, w, h);
      const id = cx.getImageData(0, 0, w, h);
      W = w; H = h; S = Math.max(W, H); cv.width = W; cv.height = H; cv.style.display = 'block';
      orig = new ImageData(new Uint8ClampedArray(id.data), W, H); base = new Uint8ClampedArray(id.data); mask = new Uint8ClampedArray(W * H); out = new ImageData(W, H);
      q('.rt-leer').style.display = 'none'; root.querySelector('.rt-panel').classList.remove('off');
      geaendert = false; fit(); renderAll(); selectTab('ret', 'bereinigen'); updBtns();
    };
    img.onerror = () => { q('.rt-leer').textContent = 'Das Foto lädt nicht. Bitte schließen und noch einmal versuchen.'; };
    root.querySelector('.rt-panel').classList.add('off');
    img.src = opt.src;
  };

  const css = document.createElement('style');
  css.textContent = `
    html.rt-offen,html.rt-offen body{overflow:hidden}
    .rt-bg{position:fixed;inset:0;z-index:65;background:var(--shade);display:flex;justify-content:center}
    .rt{position:relative;background:var(--bg);width:min(1100px,100%);height:100%;display:flex;flex-direction:column;-webkit-user-select:none;user-select:none}
    .rt-i{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}
    .rt-top{display:flex;align-items:center;gap:2px;background:var(--paper);border-bottom:1px solid var(--line);padding:6px max(8px,env(safe-area-inset-right,0px)) 6px max(8px,env(safe-area-inset-left,0px));padding-top:calc(6px + env(safe-area-inset-top,0px));flex-shrink:0}
    .rt-titel{font-family:var(--display);font-size:20px;font-weight:600;margin:0 auto 0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .rt-hb{border:0;background:none;display:flex;flex-direction:column;align-items:center;font-size:10px;gap:2px;padding:4px 4px;border-radius:10px;min-width:42px;color:var(--ink)}
    .rt-hb:disabled{opacity:.28;cursor:default}
    .rt-hb:not(:disabled):active{background:var(--rose-soft)}
    .rt-save{margin-left:6px;white-space:nowrap}
    .rt-stage{flex:1;position:relative;overflow:hidden;touch-action:none;background:#16120f;min-height:0}
    .rt-cv{position:absolute;left:0;top:0;transform-origin:0 0;display:none}
    .rt-cursor{position:absolute;border:1.5px solid #fff;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.45);pointer-events:none;display:none;transform:translate(-50%,-50%)}
    .rt-marker{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;pointer-events:none;display:none}
    .rt-marker:before,.rt-marker:after{content:"";position:absolute;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.5)}
    .rt-marker:before{left:12px;top:0;width:2px;height:26px}.rt-marker:after{top:12px;left:0;height:2px;width:26px}
    .rt-badge{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(30,22,18,.8);color:#fff;font-size:13px;padding:5px 12px;border-radius:20px;display:none;pointer-events:none}
    .rt-busy{position:absolute;right:10px;bottom:10px;background:rgba(30,22,18,.75);color:#fff;font-size:12px;padding:4px 10px;border-radius:10px;display:none}
    .rt-leer{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e9ddd5;padding:24px;text-align:center}
    .rt-panel{background:var(--paper);border-top:1px solid var(--line);padding-bottom:env(safe-area-inset-bottom,0px);flex-shrink:0}
    .rt-panel.off{pointer-events:none;opacity:.45}
    .rt-opts{display:flex;align-items:center;gap:8px;padding:8px 12px 0;flex-wrap:wrap}
    .rt-seg{display:flex;background:var(--bg);border-radius:10px;padding:2px;border:0}
    .rt-seg button{border:0;background:none;padding:6px 11px;border-radius:8px;font-size:13px;display:flex;align-items:center;gap:5px;color:var(--ink)}
    .rt-seg button.on{background:var(--paper);box-shadow:0 1px 3px rgba(0,0,0,.12);color:var(--rose-ink);font-weight:500}
    .rt-seg .rt-i,.rt-chip .rt-i{width:16px;height:16px}
    .rt-chip{border:1px solid var(--line);background:var(--paper);border-radius:10px;padding:6px 10px;font-size:13px;display:flex;align-items:center;gap:5px;color:var(--ink)}
    .rt-chip.on{border-color:var(--rose);color:var(--rose-ink);background:var(--rose-soft)}
    .rt-srow{display:flex;align-items:center;gap:10px;padding:4px 14px 0}
    .rt-srow label{font-size:12px;color:var(--muted);width:58px;flex:none}
    .rt-srow input{flex:1;accent-color:var(--rose);height:28px;min-width:0}
    .rt-val{font-size:13px;width:42px;text-align:right;font-variant-numeric:tabular-nums}
    .rt-reset{border:0;background:var(--rose-soft);color:var(--rose-ink);font-size:11px;padding:4px 8px;border-radius:8px;white-space:nowrap}
    .rt-reset:disabled{opacity:.8;cursor:default}
    .rt-swatches{display:flex;gap:8px;padding:8px 14px 0;overflow-x:auto;align-items:center;scrollbar-width:none}
    .rt-swatches::-webkit-scrollbar,.rt-tools::-webkit-scrollbar{display:none}
    .rt-sw{flex:none;width:30px;height:30px;border-radius:50%;border:2px solid var(--paper);box-shadow:0 0 0 1px var(--line);padding:0}
    .rt-sw.on{box-shadow:0 0 0 2px var(--rose)}
    .rt-tools{display:flex;gap:4px;overflow-x:auto;padding:10px 8px 4px;scrollbar-width:none}
    .rt-grp{display:flex;flex-direction:column;flex:none;padding:0 4px;border-right:1px solid var(--line)}
    .rt-grp:last-child{border-right:0}
    .rt-cap{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;padding:0 4px 4px;white-space:nowrap}
    .rt-row{display:flex;gap:2px}
    .rt-tile{position:relative;border:0;background:none;width:68px;padding:6px 2px 9px;border-radius:12px;display:flex;flex-direction:column;align-items:center;gap:5px;font-size:11.5px;color:var(--ink)}
    .rt-tile .rt-i{width:28px;height:28px}
    .rt-dot{position:absolute;bottom:2px;left:50%;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:var(--rose);display:none}
    .rt-tile.used .rt-dot{display:block}
    .rt-tile.on{color:var(--rose-ink);background:var(--rose-soft);font-weight:500}
    .rt-swc{width:26px;height:26px;border-radius:50%;border:2px solid var(--paper);box-shadow:0 0 0 1px var(--line)}
    .rt-tabs{display:flex;border-top:1px solid var(--line);margin-top:2px}
    .rt-tabs button{flex:1;border:0;background:none;padding:10px 2px 8px;font-size:13px;color:var(--muted);border-bottom:2.5px solid transparent}
    .rt-tabs button.on{color:var(--ink);font-weight:500;border-bottom-color:var(--rose)}
    .rt-actions{display:flex;align-items:center;justify-content:space-between;padding:4px 8px 6px}
    .rt-ab{border:0;background:none;width:48px;height:42px;display:flex;align-items:center;justify-content:center;border-radius:12px;color:var(--ink)}
    .rt-ab .rt-i{width:24px;height:24px}
    .rt-ab:disabled{opacity:.25;cursor:default}
    .rt-apply:not(:disabled){color:var(--rose-ink)}
    .rt-tname{flex:1;border:0;background:none;text-align:center;padding:2px 4px;color:var(--ink)}
    .rt-tname b{font-size:15px;font-weight:500;display:inline-flex;align-items:center;gap:5px}
    .rt-tname b .rt-i{width:16px;height:16px;color:var(--muted)}
    .rt-tname small{display:block;font-size:11.5px;color:var(--muted);margin-top:1px;line-height:1.25}
    .rt-modal{position:absolute;inset:0;background:var(--shade);display:none;align-items:flex-end;justify-content:center;z-index:3}
    .rt-modal.show{display:flex}
    .rt-sheet{background:var(--paper);width:100%;max-width:520px;max-height:88%;overflow:auto;border-radius:20px 20px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px))}
    .rt-sheet h3{margin:0 0 6px;font-family:var(--display);font-size:24px;font-weight:600}
    .rt-sheet p{margin:6px 0 12px;line-height:1.45}
    .rt-steps{display:grid;gap:8px;margin:12px 0}
    .rt-step{display:flex;align-items:center;gap:12px;background:var(--bg);border:0;border-radius:14px;padding:11px 12px;text-align:left;width:100%;color:var(--ink)}
    .rt-n{flex:none;width:30px;height:30px;border-radius:50%;background:var(--rose);color:var(--paper);display:flex;align-items:center;justify-content:center;font-weight:600}
    .rt-step b{display:block;font-weight:500}.rt-step small{color:var(--muted);font-size:12.5px}
    .rt-gefahr{background:var(--bad);border-color:var(--bad);color:#fff}
    @media (max-width:560px){.rt-hb span{display:none}.rt-hb{min-width:36px}.rt-titel{visibility:hidden}.rt-save{padding-inline:12px}}`;
  document.head.append(css);
})();
