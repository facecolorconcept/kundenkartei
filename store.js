// Speicher der Kundenkartei: Google Drive (echter Betrieb) oder Browser (Beispielmodus).
(function () {
  const C = window.FCC_CONFIG || {};
  // Mit fester Ordner-ID braucht die Kartei Zugriff auf Drive, weil sie den Ordner nicht selbst angelegt hat.
  const SCOPES = (C.ROOT_FOLDER_ID ? 'https://www.googleapis.com/auth/drive' : 'https://www.googleapis.com/auth/drive.file') +
    ' https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/contacts';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const PEOPLE = 'https://people.googleapis.com/v1';
  const norm = s => String(s || '').toLowerCase().trim();
  const dig = s => String(s || '').replace(/\D/g, '').replace(/^(49|0)/, '');
  const sameKontakt = (a, b) => (a.kontaktId && a.kontaktId === b.kontaktId) ||
    (dig(a.telefon) && dig(a.telefon) === dig(b.telefon)) ||
    (norm(a.vorname) && norm(a.vorname) === norm(b.vorname) && norm(a.nachname) === norm(b.nachname));
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
      dateiId, ordnerId: c.ordnerId || '', kontaktId: c.kontaktId || '',
      letzte: last ? { datum: last.datum, art: last.art } : null,
      // Kurzfassung für die Übersicht
      fragebogen: c.fragebogen || '', erstellt: c.erstellt || '',
      b: (c.behandlungen || []).map(x => ({ d: x.datum, a: x.art, t: (x.daten || {}).termin || '' }))
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
        this.client = google.accounts.oauth2.initTokenClient({ client_id: C.CLIENT_ID, scope: SCOPES, login_hint: C.LOGIN_HINT || undefined, callback: () => {} });
      }
      await new Promise((res, rej) => {
        this.client.callback = r => {
          if (r.error) return rej(new Error('Anmeldung nicht abgeschlossen.'));
          if (!google.accounts.oauth2.hasGrantedAllScopes(r, ...SCOPES.split(' '))) {
            return rej(new Error('Bitte bei der Anmeldung alle Häkchen setzen (Drive, Kalender und Kontakte). Tippe dann noch einmal auf „Mit Google anmelden“.'));
          }
          this.token = r.access_token;
          this.expiry = Date.now() + (Number(r.expires_in || 3600) - 120) * 1000;
          // Anmeldung merken, damit die Kartei beim nächsten Öffnen nicht erneut fragt (gilt etwa 1 Stunde)
          try { localStorage.setItem('fcc_tok', JSON.stringify({ t: this.token, e: this.expiry })); } catch (e) {}
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
      try { localStorage.removeItem('fcc_tok'); } catch (e) {}
      this.token = null;
    },

    // Gemerkte Anmeldung laden; true, wenn sie noch gültig ist
    hasToken() {
      if (this.token && Date.now() < this.expiry) return true;
      try {
        const s = JSON.parse(localStorage.getItem('fcc_tok') || 'null');
        if (s && s.t && Date.now() < s.e) { this.token = s.t; this.expiry = s.e; return true; }
      } catch (e) {}
      return false;
    },

    async api(url, opts = {}, retry = true) {
      if (!this.hasToken()) await (this.onNeedLogin ? this.onNeedLogin() : this.signIn());
      const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + this.token } });
      if (r.status === 401 && retry) { this.token = null; try { localStorage.removeItem('fcc_tok'); } catch (e) {} return this.api(url, opts, false); }
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
      if (C.ROOT_FOLDER_ID) {
        try { await this.json(`${API}/files/${C.ROOT_FOLDER_ID}?fields=id`); }
        catch (e) { throw new Error('Der Kartei-Ordner in Google Drive ist nicht erreichbar. Grund laut Google: ' + e.message); }
        this.rootId = C.ROOT_FOLDER_ID;
      } else {
        this.rootId = await this.folder(C.ROOT_FOLDER_NAME || 'Facecolorconcept Kartei');
      }
      const f = (await this.find(`name='${INDEX}' and '${this.rootId}' in parents and trashed=false`))[0];
      if (f) {
        this.indexId = f.id;
        this.index = await (await this.api(`${API}/files/${f.id}?alt=media`)).json();
        // Ältere Verzeichnisse ohne Kurzfassung einmalig neu aufbauen
        if (this.index.some(e => !e.b)) await this.rebuildIndex();
      } else {
        await this.rebuildIndex();
      }
      await this.ladeKontakte();
    },

    // Kundenliste = Akten in Drive + Google-Kontakte mit dem Label „Facecolorconcept“, die noch keine Akte haben
    list() {
      const extra = (this.kontakte || []).filter(k => !this.index.some(e => sameKontakt(e, k)))
        .map(k => ({ ...k, id: 'k_' + k.kontaktId.split('/').pop(), nurKontakt: true, letzte: null }));
      return this.index.concat(extra);
    },

    async writeIndex() {
      const r = await this.upload({ name: INDEX, parent: this.rootId, mime: 'application/json', data: JSON.stringify(this.index), fileId: this.indexId });
      this.indexId = r.id;
    },

    // Liest alle Akten neu ein, z. B. wenn auf einem zweiten Gerät gespeichert wurde
    // Übernimmt dabei auch Akten aus der alten Apps-Script-Kartei (kundenakte.json); die alte Datei bleibt liegen.
    async rebuildIndex() {
      const read = async id => (await this.api(`${API}/files/${id}?alt=media`)).json();
      const folders = await this.find(`'${this.rootId}' in parents and mimeType='${FOLDER}' and trashed=false`);
      this.index = [];
      for (const f of folders) {
        if (f.name === 'Administration') continue;
        try {
          const files = await this.find(`'${f.id}' in parents and trashed=false and (name='kundin.json' or name='kundenakte.json')`);
          const neu = files.find(x => x.name === 'kundin.json');
          const alt = files.find(x => x.name === 'kundenakte.json');
          if (neu) {
            const c = await read(neu.id);
            c.ordnerId = f.id;
            this.index.push(entry(c, neu.id));
          } else if (alt) {
            const o = await read(alt.id);
            const info = [o.treatmentCategory, o.treatmentDate ? 'am ' + o.treatmentDate : ''].filter(Boolean).join(' ');
            const c = {
              id: o.id || uid(), vorname: o.firstName || '', nachname: o.lastName || f.name,
              telefon: o.phone || '', email: o.email || '', allergien: o.allergies || '',
              blutverduenner: '', fragebogen: '',
              notiz: [o.notes, info ? 'Aus der alten Kartei: ' + info : ''].filter(Boolean).join('\n'),
              dokumente: [], behandlungen: [], altdaten: o,
              ordnerId: f.id,
              fotosId: await this.folder('Bilder_Vorher_Nachher', f.id),
              dokuId: await this.folder('Dokumente_Rechnungen', f.id)
            };
            const r = await this.upload({ name: 'kundin.json', parent: f.id, mime: 'application/json', data: JSON.stringify(c, null, 1) });
            this.index.push(entry(c, r.id));
          }
        } catch (e) {}
      }
      await this.writeIndex();
      await this.ladeKontakte();
    },

    async load(e) {
      if (e.nurKontakt) {
        return { id: e.id, kontaktId: e.kontaktId, vorname: e.vorname, nachname: e.nachname, telefon: e.telefon, email: e.email,
          allergien: '', blutverduenner: '', fragebogen: '', notiz: '', dokumente: [], behandlungen: [] };
      }
      return (await this.api(`${API}/files/${e.dateiId}?alt=media`)).json();
    },

    async save(c) {
      try { await this.pushKontakt(c); } catch (e) { console.warn('Google Kontakte:', e.message); }
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
      if (!c.fotosId) await this.save(c);
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
      if (!c.dokuId) await this.save(c);
      const r = await this.upload({ name: file.name, parent: c.dokuId, mime: file.type || 'application/octet-stream', data: file });
      return { fileId: r.id, name: r.name, link: r.webViewLink || '', datum: today() };
    },

    // ---------- Google Kontakte ----------
    async kontaktGruppe() {
      if (this.gruppe) return this.gruppe;
      const name = C.KONTAKT_LABEL || 'Facecolorconcept';
      const r = await this.json(`${PEOPLE}/contactGroups?pageSize=1000&groupFields=name,groupType`);
      let g = (r.contactGroups || []).find(x => x.groupType === 'USER_CONTACT_GROUP' && (x.name === name || x.formattedName === name));
      if (!g) {
        g = await this.json(`${PEOPLE}/contactGroups`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contactGroup: { name } }) });
      }
      return (this.gruppe = g.resourceName);
    },

    async ladeKontakte() {
      try {
        const g = await this.kontaktGruppe();
        const r = await this.json(`${PEOPLE}/${g}?maxMembers=1000`);
        const ids = r.memberResourceNames || [];
        const people = [];
        for (let i = 0; i < ids.length; i += 200) {
          const qs = ids.slice(i, i + 200).map(x => 'resourceNames=' + encodeURIComponent(x)).join('&');
          const b = await this.json(`${PEOPLE}/people:batchGet?${qs}&personFields=names,phoneNumbers,emailAddresses`);
          (b.responses || []).forEach(x => { if (x.person) people.push(x.person); });
        }
        this.kontakte = people.map(p => {
          const n = (p.names || [])[0] || {};
          return {
            kontaktId: p.resourceName, vorname: n.givenName || '', nachname: n.familyName || n.displayName || '(ohne Namen)',
            telefon: ((p.phoneNumbers || [])[0] || {}).value || '', email: ((p.emailAddresses || [])[0] || {}).value || ''
          };
        });
        this.kontaktFehler = '';
      } catch (e) {
        this.kontakte = [];
        this.kontaktFehler = e.message;
      }
    },

    // Legt die Kundin in Google Kontakte an (Label „Facecolorconcept“) oder ergänzt Telefon/E-Mail beim bestehenden Kontakt.
    async pushKontakt(c) {
      const send = (url, method, data) => this.json(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!c.kontaktId) {
        const m = (this.kontakte || []).find(k => sameKontakt(k, c));
        if (m) c.kontaktId = m.kontaktId;
      }
      const names = [{ givenName: c.vorname, familyName: c.nachname }];
      if (!c.kontaktId) {
        const p = { names };
        if (c.telefon) p.phoneNumbers = [{ value: c.telefon, type: 'mobile' }];
        if (c.email) p.emailAddresses = [{ value: c.email }];
        const r = await send(`${PEOPLE}/people:createContact?personFields=names`, 'POST', p);
        c.kontaktId = r.resourceName;
        await send(`${PEOPLE}/${await this.kontaktGruppe()}/members:modify`, 'POST', { resourceNamesToAdd: [c.kontaktId] });
        return;
      }
      const p = await this.json(`${PEOPLE}/${c.kontaktId}?personFields=names,phoneNumbers,emailAddresses`);
      const phones = p.phoneNumbers || [], mails = p.emailAddresses || [];
      if (c.telefon && !phones.some(x => dig(x.value) === dig(c.telefon))) phones.unshift({ value: c.telefon, type: 'mobile' });
      if (c.email && !mails.some(x => norm(x.value) === norm(c.email))) mails.unshift({ value: c.email });
      await send(`${PEOPLE}/${c.kontaktId}:updateContact?updatePersonFields=names,phoneNumbers,emailAddresses`, 'PATCH',
        { etag: p.etag, names, phoneNumbers: phones, emailAddresses: mails });
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
    hasToken() { return true; },
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
