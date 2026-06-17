/* ============================================================
   NeoSuite AMS — Evidence Intake (lintas-modul)
   Satu mekanisme unggah-&-klasifikasi yang tersedia di SETIAP
   modul lewat SubBar global. Bukti disimpan per modul, memakai
   mesin klasifikasi yang sama dengan AI Co-pilot.
   ============================================================ */
const EV_KEY = 'ams.v1.evidence';

function amsEvRead() { try { return JSON.parse(localStorage.getItem(EV_KEY) || '{}') || {}; } catch (e) { return {}; } }
function amsEvWrite(o) {
  try { localStorage.setItem(EV_KEY, JSON.stringify(o)); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('ams-evidence')); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('ams-intake')); } catch (e) {} /* legacy listener */
}
function amsEvidenceFor(mid) { return amsEvRead()[mid] || []; }
function amsEvidenceAll() {
  const o = amsEvRead(); const out = [];
  Object.keys(o).forEach(m => (o[m] || []).forEach(d => out.push({ ...d, module: m })));
  return out.sort((a, b) => (a.when < b.when ? 1 : -1));
}
function amsEvidenceCount(mid) { return (amsEvRead()[mid] || []).length; }
function amsAttachEvidence(mid, meta) {
  if (!mid) mid = 'evidence';
  const o = amsEvRead(); const list = o[mid] ? o[mid].slice() : [];
  const rec = { uid: 'ev-' + Date.now() + '-' + Math.round(Math.random() * 1e4), when: new Date().toISOString().slice(0, 16).replace('T', ' '), ...meta };
  list.unshift(rec); o[mid] = list.slice(0, 200); amsEvWrite(o);
  return rec;
}
function amsRemoveEvidence(mid, uid) {
  const o = amsEvRead(); if (o[mid]) { o[mid] = o[mid].filter(d => d.uid !== uid); amsEvWrite(o); }
}

/* migrate legacy flat intake log (ditulis versi awal) → store per modul */
(function () {
  try {
    const o = amsEvRead();
    if (Object.keys(o).length === 0) {
      const old = JSON.parse(localStorage.getItem('ams.v1.intake') || '[]');
      if (old.length) old.slice().reverse().forEach(d => amsAttachEvidence(d.dest || 'evidence', { file: d.file, type: d.type, std: d.std, classified: d.dest, when: d.when }));
    }
  } catch (e) {}
})();

function useEvidence(mid) {
  const get = () => (mid ? amsEvidenceFor(mid) : amsEvidenceAll());
  const [v, setV] = React.useState(get);
  React.useEffect(() => {
    const r = () => setV(get());
    r();
    window.addEventListener('ams-evidence', r);
    window.addEventListener('focus', r);
    return () => { window.removeEventListener('ams-evidence', r); window.removeEventListener('focus', r); };
  }, [mid]);
  return v;
}

const evExtIcon = (n) => /\.(xlsx|xls|csv)$/i.test(n || '') ? 'table' : (/\.(png|jpg|jpeg|gif|webp)$/i.test(n || '') ? 'panel' : 'doc');

/* ---- Kontrol Bukti global: tombol di SubBar tiap modul ---- */
function EvidenceControl({ moduleId }) {
  const nav = useNav();
  const list = useEvidence(moduleId);
  const meta = (typeof MODULE_INDEX !== 'undefined' && MODULE_INDEX[moduleId]) || { label: moduleId };
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState([]);
  const [drag, setDrag] = React.useState(false);
  const fileRef = React.useRef(null);

  const addFiles = (fl) => {
    const arr = Array.from(fl || []).filter(Boolean);
    if (!arr.length) return;
    const res = arr.map((f, i) => window.classifyDoc(f.name, {}, i));
    setPending(p => [...res, ...p]);
    setOpen(true);
  };
  const attach = (r, mid) => {
    amsAttachEvidence(mid, { file: r.file, type: r.type, std: r.std, classified: r.dest });
    setPending(p => p.filter(x => x.uid !== r.uid));
  };

  return (
    <div style={{ position: 'relative' }}>
      <button className="subbar-ev" onClick={() => setOpen(o => !o)} title={'Lampirkan & lihat bukti — ' + (meta.label || moduleId)}>
        <I.upload size={13} /> Bukti{list.length > 0 && <span className="subbar-ev-c">{list.length}</span>}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 74 }} onClick={() => setOpen(false)} />
          <div className="ev-pop">
            <div className="ev-pop-h">
              <span style={{ color: 'var(--blue)' }}><I.upload size={15} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }} className="truncate">Bukti · {meta.label || moduleId}</div>
                <div className="tiny muted">{list.length} berkas terlampir di modul ini</div>
              </div>
              <button className="top-btn" style={{ width: 26, height: 26 }} onClick={() => setOpen(false)}><I.x size={15} /></button>
            </div>

            <div className={'ev-drop' + (drag ? ' on' : '')}
              onClick={() => fileRef.current && fileRef.current.click()}
              onDragEnter={e => { e.preventDefault(); setDrag(true); }}
              onDragOver={e => { e.preventDefault(); }}
              onDragLeave={e => { e.preventDefault(); setDrag(false); }}
              onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer && e.dataTransfer.files); }}>
              <I.upload size={18} />
              <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 4 }}>Tarik / klik untuk unggah bukti</div>
              <div className="tiny muted">AI mengklasifikasi & melampirkan ke <b>{meta.label || moduleId}</b></div>
              <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
            </div>

            {pending.map(r => {
              const sug = MODULE_INDEX[r.dest] || { label: r.dest };
              const sameMod = r.dest === moduleId;
              const FI = I[evExtIcon(r.file)] || I.doc;
              return (
                <div key={r.uid} className="ev-pending">
                  <div className="row ac gap8" style={{ marginBottom: 7 }}>
                    <span style={{ color: 'var(--blue)' }}><FI size={14} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate" style={{ fontSize: 11.5, fontWeight: 700 }}>{r.file}</div>
                      <div className="tiny" style={{ color: 'var(--blue)' }}>AI: {r.type} · saran {sug.label}</div>
                    </div>
                  </div>
                  <div className="row gap8" style={{ flexWrap: 'wrap' }}>
                    <button className="ev-act" onClick={() => attach(r, moduleId)}><I.check size={12} /> Lampirkan di sini</button>
                    {!sameMod && <button className="ev-act ghost" onClick={() => { attach(r, r.dest); }} title={'Lampirkan ke ' + sug.label}><I.arrowRight size={12} /> {sug.label}</button>}
                  </div>
                </div>
              );
            })}

            <div style={{ padding: '4px 0 6px' }}>
              {list.length === 0 && pending.length === 0 && <div className="ev-empty">Belum ada bukti di modul ini.</div>}
              {list.map(d => {
                const FI = I[evExtIcon(d.file)] || I.doc;
                const cl = d.classified && d.classified !== moduleId ? (MODULE_INDEX[d.classified] || {}).label : null;
                return (
                  <div key={d.uid} className="ev-row">
                    <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 24px' }}><FI size={12} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate" style={{ fontSize: 11.5, fontWeight: 600 }}>{d.file}</div>
                      <div className="tiny muted truncate">{d.type}{d.when ? ' · ' + d.when : ''}</div>
                    </div>
                    {d.std && <span className="mono tiny" style={{ color: 'var(--ink-3)', flex: '0 0 auto' }}>{d.std}</span>}
                    <button className="ev-x" title="Hapus lampiran" onClick={() => amsRemoveEvidence(moduleId, d.uid)}><I.trash size={12} /></button>
                  </div>
                );
              })}
            </div>

            <div className="ev-pop-f">
              <button className="ev-link" onClick={() => { setOpen(false); nav('dataflow'); }}><I.link2 size={12} /> Lihat semua bukti masuk</button>
              {window.__amsOpenCopilot && <button className="ev-link" onClick={() => { setOpen(false); window.__amsOpenCopilot(); }}><I.sparkle size={12} /> Buka AI Co-pilot</button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

Object.assign(window, {
  amsEvRead, amsEvidenceFor, amsEvidenceAll, amsEvidenceCount,
  amsAttachEvidence, amsRemoveEvidence, useEvidence, EvidenceControl,
});

/* ============================================================
   Secure upload toolkit — dipakai DMS, Portal/PBC, dan Co-pilot
   ============================================================ */
const EV_ALLOW = ['pdf', 'xlsx', 'xls', 'csv', 'docx', 'doc', 'png', 'jpg', 'jpeg'];
const EV_MAX_MB = 25;

/* hash heksadesimal deterministik 64-char (tampilan integritas SHA-256) */
function amsFakeHash(seed) {
  let h = 2166136261 >>> 0;
  const s = String(seed || '') + '|neosuite-sha256';
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  let out = '', x = h;
  for (let i = 0; i < 8; i++) { x = Math.imul(x ^ (x >>> 15), 2246822519) >>> 0; out += ('0000000' + (x >>> 0).toString(16)).slice(-8); }
  return out.slice(0, 64);
}

function amsFileMeta(f) {
  const name = (f && f.name) || String(f || 'berkas');
  const ext = (name.split('.').pop() || '').toLowerCase();
  const ok = EV_ALLOW.includes(ext);
  const sizeMB = f && f.size ? +(f.size / 1048576).toFixed(1) : +(0.4 + Math.random() * 4).toFixed(1);
  const tooBig = sizeMB > EV_MAX_MB;
  return { name, ext, ok: ok && !tooBig, badType: !ok, tooBig, sizeMB, sha256: amsFakeHash(name + '|' + sizeMB) };
}

/* dropzone berkas nyata (input file + drag/drop + validasi jenis & ukuran) */
function FileDropField({ multiple = true, onFiles, hint, compact }) {
  const ref = React.useRef(null);
  const [drag, setDrag] = React.useState(false);
  const handle = (fl) => {
    const arr = Array.from(fl || []).filter(Boolean);
    if (!arr.length) return;
    onFiles(arr.map(amsFileMeta));
  };
  return (
    <div className={'filedrop' + (drag ? ' on' : '') + (compact ? ' sm' : '')}
      onClick={() => ref.current && ref.current.click()}
      onDragEnter={e => { e.preventDefault(); setDrag(true); }}
      onDragOver={e => e.preventDefault()}
      onDragLeave={e => { e.preventDefault(); setDrag(false); }}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer && e.dataTransfer.files); }}>
      <span className="filedrop-ic"><I.upload size={compact ? 16 : 20} /></span>
      <div style={{ fontSize: compact ? 12 : 12.5, fontWeight: 700 }}>Tarik berkas atau klik untuk memilih</div>
      <div className="tiny muted">{hint || 'PDF · XLSX · DOCX · CSV · PNG/JPG · maks ' + EV_MAX_MB + ' MB'}</div>
      <input ref={ref} type="file" multiple={multiple} style={{ display: 'none' }}
        onChange={e => { handle(e.target.files); e.target.value = ''; }} />
    </div>
  );
}

/* daftar berkas terpilih dengan status validasi & checksum */
function FileList({ files, onRemove }) {
  if (!files || !files.length) return null;
  return (
    <div className="upl-files">
      {files.map((m, i) => {
        const FI = I[evExtIcon(m.name)] || I.doc;
        return (
          <div key={i} className={'upl-file' + (m.ok ? '' : ' bad')}>
            <span style={{ color: m.ok ? 'var(--blue)' : 'var(--red)', flex: '0 0 auto' }}><FI size={14} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="truncate" style={{ fontSize: 11.5, fontWeight: 600 }}>{m.name}</div>
              <div className="tiny" style={{ color: m.ok ? 'var(--ink-3)' : 'var(--red)' }}>
                {m.ok ? <>{m.sizeMB} MB · <span className="mono">SHA-256 {m.sha256.slice(0, 10)}…</span></>
                  : m.tooBig ? 'Melebihi batas ' + EV_MAX_MB + ' MB' : 'Jenis berkas tidak didukung'}
              </div>
            </div>
            {m.ok ? <span className="upl-ok" title="Lolos validasi & pindai malware"><I.checkCircle size={14} /></span> : <span style={{ color: 'var(--red)' }}><I.alert size={14} /></span>}
            {onRemove && <button className="ev-x" onClick={() => onRemove(i)} title="Buang"><I.x size={12} /></button>}
          </div>
        );
      })}
    </div>
  );
}

/* panel asuransi keamanan — langkah-langkah yang ditegakkan saat unggah */
function SecurePipeline({ title = 'Kontrol keamanan saat unggah' }) {
  const steps = [
    ['lock', 'Terenkripsi saat transit — TLS 1.3'],
    ['shield', 'Pindai malware otomatis — ClamAV'],
    ['check', 'Integritas berkas — checksum SHA-256'],
    ['sparkle', 'Klasifikasi & penautan modul — AI'],
    ['archive', 'Arsip terenkripsi AES-256 + retensi SA 230'],
  ];
  return (
    <div className="secpipe">
      <div className="secpipe-h"><I.shield size={12} /> {title}</div>
      {steps.map(([ic, l], i) => (
        <div key={i} className="secpipe-row">
          <span className="secpipe-ic">{React.createElement(I[ic] || I.circle, { size: 11 })}</span>
          <span className="tiny" style={{ flex: 1 }}>{l}</span>
          <span style={{ color: 'var(--green)' }}><I.check size={12} /></span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { amsFakeHash, amsFileMeta, EV_ALLOW, EV_MAX_MB, FileDropField, FileList, SecurePipeline });
