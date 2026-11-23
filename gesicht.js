// Automatische Gesichtserkennung für die Beratung (Brauen und Lippen).
// Nutzt MediaPipe Face Landmarker (Google, Lizenz Apache 2.0). Alle Dateien liegen im eigenen Projekt im Ordner mp/:
// Es wird nichts von fremden Servern geladen und kein Foto verschickt. Die Erkennung läuft nur auf dem Gerät.
// Beim ersten Mal lädt der Browser etwa 18 MB, danach liegen sie im Zwischenspeicher.
(function () {
  'use strict';
  const FCC = window.FCC = window.FCC || {};
  // Ohne WebAssembly (sehr alte Browser) gibt es keinen Knopf „Automatisch erkennen“
  if (typeof WebAssembly !== 'object') return;
  let erkenner = null, laeuft = null;
  const basis = new URL('mp/', location.href).href;

  async function laden(melde) {
    if (erkenner) return erkenner;
    if (laeuft) return laeuft;
    laeuft = (async () => {
      melde && melde('Lädt Erkennung …');
      const mp = await import('./mp/vision_bundle.mjs');
      const dateien = await mp.FilesetResolver.forVisionTasks(basis + 'wasm');
      const opt = d => ({ baseOptions: { modelAssetPath: basis + 'face_landmarker.task', delegate: d }, runningMode: 'IMAGE', numFaces: 1, minFaceDetectionConfidence: 0.4 });
      // Grafikkarte, wenn der Browser es kann, sonst Prozessor (langsamer, aber überall)
      try { erkenner = await mp.FaceLandmarker.createFromOptions(dateien, opt('GPU')); }
      catch (e) { erkenner = await mp.FaceLandmarker.createFromOptions(dateien, opt('CPU')); }
      return erkenner;
    })();
    try { return await laeuft; } finally { laeuft = null; }
  }

  // bild: Canvas mit dem Foto. Ergebnis: 478 Punkte (x, y von 0 bis 1) oder null, wenn kein Gesicht gefunden wurde
  FCC.gesichtErkennen = async (bild, melde) => {
    const e = await laden(melde);
    melde && melde('Erkenne …');
    const r = e.detect(bild);
    return (r && r.faceLandmarks && r.faceLandmarks[0]) || null;
  };
})();
