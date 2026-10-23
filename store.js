// Speicher der Kundenkartei: Google Drive (echter Betrieb) oder Browser (Beispielmodus).
(function () {
  const C = window.FCC_CONFIG || {};
  const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.events';
  const API = 'https://www.googleapis.com/drive/v3';
  const UP = 'https://www.googleapis.com/upload/drive/v3';
  const CAL = 'https://www.googleapis.com/calendar/v3';
  const FOLDER = 'application/vnd.google-apps.folder';
  const INDEX = '_verzeichnis.json';

  const today = () => new Date().toISOString().slice(0, 10);
  const q = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  // Kurzeintrag für die Kundenliste
  function entry(c, dateiId) {
    const last = [...(c.behandlungen || [])].sort((a, b) => b.datum.localeCompare(a.datum))[0];
    return {
      id: c.id, vorname: c.vorname, nachname: c.nachname, telefon: c.telefon || '',
      dateiId, ordnerId: c.ordnerId || '',
      letzte: last ? { datum: last.datum, art: last.art } : null
    };
  }

  // Fotos vor dem Hochladen verkleinern (Handyfotos sind sonst 5–10 MB groß)
  async function compressImage(file, max, quality) {
    try {
      const bmp = await createImageBitmap(file);
      const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(bmp.width * s);
      cv.height = Math.round(bmp.height * s);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', quality));
      return blob || file;
    } catch (e) {
      return file;
    }
  }

  // ---------------- Google Drive ----------------
  const Drive = {
    mode: 'drive',
    token: null, expiry: 0, client: null,
    rootId: null, index: [], indexId: null, cache: {},

    loadGoogle() {
      return new Promise((res, rej) => {
        if (window.google && google.accounts && google.accounts.oauth2) return res();
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.onload = () => res();
        s.onerror = () => rej(new Error('Die Google-Anmeldung lädt nicht. Bitte Internetverbindung prüfen.'));
        document.head.append(s);
      });
    },

    async signIn() {
      await this.loadGoogle();
      if (!this.client) {
        this.client = google.accounts.oauth2.initTokenClient({ client_id: C.CLIENT_ID, scope: SCOPES, callback: () => {} });
      }
      await new Promise((res, rej) => {
        this.client.callback = r => {
          if (r.error) return rej(new Error('Anmeldung nicht abgeschlossen.'));
          if (!google.accounts.oauth2.hasGrantedAllScopes(r, ...SCOPES.split(' '))) {
            return rej(new Error('Bitte bei der Anmeldung Drive und Kalender erlauben, sonst kann die Kartei nicht speichern.'));
          }
          this.token = r.access_token;
          this.expiry = Date.now() + (Number(r.expires_in || 3600) - 120) * 1000;
          res();
        };
        this.client.error_callback = e => rej(new Error(
          e && e.type === 'popup_closed' ? 'Das Anmeldefenster wurde geschlossen.' :
          'Anmeldung fehlgeschlagen. Ist ein Popup-Blocker aktiv?'));
        this.client.requestAccessToken({ prompt: '' });
      });
    },

    signOut() {
      try { if (this.token) google.accounts.oauth2.revoke(this.token, () => {}); } catch (e) {}
      this.token = null;
    },

    async api(url, opts = {}, retry = true) {
      if (!this.token || Date.now() > this.expiry) await this.signIn();
      const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + this.token } });
      if (r.status === 401 && retry) { this.token = null; return this.api(url, opts, false); }
      if (!r.ok) {
        let m = '';
        try { m = (await r.json()).error.message || ''; } catch (e) {}
        throw new Error('Google meldet einen Fehler (' + r.status + ')' + (m ? ': ' + m : ''));
      }
      return r;
    },
    async json(url, opts) { return (await this.api(url, opts)).json(); },

    async find(query) {
      const r = await this.json(`${API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,parents,webViewLink)&pageSize=1000&spaces=drive`);
      return r.files || [];
    },

    async folder(name, parent) {
      const p = parent || 'root';
      const hit = (await this.find(`name='${q(name)}' and mimeType='${FOLDER}' and trashed=false and '${p}' in parents`))[0];
      if (hit) return hit.id;
      const r = await this.json(`${API}/files?fields=id`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mimeType: FOLDER, parents: [p] })
      });
      return r.id;
    },

    async upload({ name, parent, mime, data, fileId }) {
      const b = 'fcc' + Math.random().toString(36).slice(2);
      const meta = fileId ? { name } : { name, parents: [parent] };
      const body = new Blob([
        `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: ${mime}\r\n\r\n`,
        data, `\r\n--${b}--`
      ]);
      const url = fileId
        ? `${UP}/files/${fileId}?uploadType=multipart&fields=id,name,webViewLink`
        : `${UP}/files?uploadType=multipart&fields=id,name,webViewLink`;
      return this.json(url, { method: fileId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body });
    },

    async start() {
      this.rootId = await this.folder(C.ROOT_FOLDER_NAME || 'Facecolorconcept Kartei');
      const f = (await this.find(`name='${INDEX}' and '${this.rootId}' in parents and trashed=false`))[0];
      if (f) {
        this.indexId = f.id;
        this.index = await (await this.api(`${API}/files/${f.id}?alt=media`)).json();
      } else {
        await this.rebuildIndex();
      }
    },

    list() { return this.index; },

    async writeIndex() {
      const r = await this.upload({ name: INDEX, parent: this.rootId, mime: 'application/json', data: JSON.stringify(this.index), fileId: this.indexId });
      this.indexId = r.id;
    },

    // Liest alle Akten neu ein, z. B. wenn auf einem zweiten Gerät gespeichert wurde
    async rebuildIndex() {
      const files = await this.find(`name='kundin.json' and trashed=false`);
      const list = [];
      for (const f of files) {
        try { list.push(entry(await (await this.api(`${API}/files/${f.id}?alt=media`)).json(), f.id)); } catch (e) {}
      }
      this.index = list;
      await this.writeIndex();
    },

    async load(e) { return (await this.api(`${API}/files/${e.dateiId}?alt=media`)).json(); },

    async save(c) {
      if (!c.ordnerId) c.ordnerId = await this.folder(`${c.nachname}_${c.vorname}_${c.id.slice(-4)}`, this.rootId);
      if (!c.fotosId) c.fotosId = await this.folder('fotos', c.ordnerId);
      if (!c.dokuId) c.dokuId = await this.folder('dokumente', c.ordnerId);
      const e = this.index.find(x => x.id === c.id);
      const r = await this.upload({ name: 'kundin.json', parent: c.ordnerId, mime: 'application/json', data: JSON.stringify(c, null, 1), fileId: e && e.dateiId });
      const ne = entry(c, r.id);
      if (e) Object.assign(e, ne); else this.index.push(ne);
      await this.writeIndex();
    },

    async addPhoto(c, file, name) {
      const blob = await compressImage(file, 2000, 0.85);
      const r = await this.upload({ name, parent: c.fotosId, mime: blob.type || 'image/jpeg', data: blob });
      return { fileId: r.id, link: r.webViewLink || '' };
    },

    async photoUrl(p) {
      if (this.cache[p.fileId]) return this.cache[p.fileId];
      const b = await (await this.api(`${API}/files/${p.fileId}?alt=media`)).blob();
      return (this.cache[p.fileId] = URL.createObjectURL(b));
    },

    async addDoc(c, file) {
      if (file.size > 5 * 1024 * 1024) throw new Error('Die Datei ist größer als 5 MB. Bitte verkleinern oder direkt in Drive ablegen.');
      const r = await this.upload({ name: file.name, parent: c.dokuId, mime: file.type || 'application/octet-stream', data: file });
      return { fileId: r.id, name: r.name, link: r.webViewLink || '', datum: today() };
    },

    async remind(title, date, desc) {
      const end = new Date(date + 'T12:00');
      end.setDate(end.getDate() + 1);
      await this.json(`${CAL}/calendars/primary/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: title, description: desc, start: { date }, end: { date: end.toISOString().slice(0, 10) } })
      });
    }
  };

  // ---------------- Beispielmodus (nur im Browser) ----------------
  const Demo = {
    mode: 'demo', key: 'fcc_demo_v2', data: [],
    async signIn() {},
    signOut() {},
    async start() {
      try { this.data = JSON.parse(localStorage.getItem(this.key)) || null; } catch (e) { this.data = null; }
      if (!this.data) this.data = JSON.parse(JSON.stringify(window.FCC_DEMO || []));
    },
    persist() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} },
    list() { return this.data.map(c => entry(c, c.id)); },
    async rebuildIndex() {},
    async load(e) { return JSON.parse(JSON.stringify(this.data.find(c => c.id === e.id))); },
    async save(c) {
      const copy = JSON.parse(JSON.stringify(c));
      const i = this.data.findIndex(x => x.id === c.id);
      if (i >= 0) this.data[i] = copy; else this.data.push(copy);
      this.persist();
    },
    async addPhoto(c, file) {
      const blob = await compressImage(file, 700, 0.7);
      const data = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      return { fileId: 'demo_' + Date.now(), data };
    },
    async photoUrl(p) { return p.data || ''; },
    async addDoc(c, file) { return { fileId: 'demo_' + Date.now(), name: file.name, link: '', datum: today() }; },
    async remind() {}
  };

  window.Store = C.CLIENT_ID ? Drive : Demo;
})();
