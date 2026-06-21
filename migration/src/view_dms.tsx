/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist } from './contexts.jsx';
import { FileDropField, FileList, SecurePipeline } from './evidence.jsx';
import { I, MODULE_INDEX } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Stat, Tabs } from './ui.jsx';
import { PDrawer, PEVT, PField, PModal, PVerList, pNowTime } from './view_docparts';
import { OKv } from './view_onboarding';

/* ============================================================
   NeoSuite AMS — Document Management & Retensi (DMS natif)
   Navigasi folder per engagement · tabel dokumen · drawer detail
   (riwayat versi + bandingkan versi, log akses, tautan WP, retensi).
   Versioning · klasifikasi · retensi 10 thn · legal hold · SA 230.
   ============================================================ */
const { useState: useDMS, useMemo: useMemoDMS } = React;

const CLASS_KIND = { 'Rahasia': 'red', 'Internal': 'amber', 'Publik': 'green' };
const ASSEMBLY = { 'complete': { k: 'green', l: 'Lengkap' }, 'in-progress': { k: 'amber', l: 'Perakitan' }, 'pending': { k: 'red', l: 'Tertunda' }, 'n/a': { k: 'gray', l: '—' } };
const ACCESS_LBL = { view: 'Melihat', download: 'Mengunduh', edit: 'Menyunting', lock: 'Mengunci', print: 'Mencetak' };
const TYPE_ICON = { 'Kertas Kerja': 'flask', 'Laporan': 'report', 'Surat Perikatan': 'doc', 'EQR': 'shield', 'Template': 'template' };
const DMS_TYPES = ['Kertas Kerja', 'Laporan', 'Surat Perikatan', 'EQR', 'Template', 'Memo'];
const DMS_ENGS = [
  { id: 'ENG-2025-014', client: 'PT Sentosa Makmur Tbk' },
  { id: 'ENG-2025-047', client: 'PT Mandiri Sejahtera Finance' },
  { id: 'ENG-2025-063', client: 'PT Graha Properti Nusantara' },
  { id: 'ENG-2024-014', client: 'PT Sentosa Makmur Tbk' },
  { id: 'ENG-2021-008', client: 'PT Bumi Hijau Lestari' },
];
const REF = new Date('2026-03-09');
const dDate = (d: any, opt?: any) => d ? new Date(d).toLocaleDateString('id-ID', opt || { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function retentionInfo(d) {
  if (!d.archivedOn) return null;
  const until = new Date(d.archivedOn); until.setFullYear(until.getFullYear() + d.retentionYears);
  const yrsLeft = (+until - +REF) / (365.25 * 864e5);
  return { until, yrsLeft, expired: yrsLeft <= 0, pct: Math.max(0, Math.min(100, (1 - yrsLeft / d.retentionYears) * 100)) };
}
function assemblyInfo(d) {
  if (!d.opinionDate || d.assembly === 'complete') return null;
  const deadline = new Date(d.opinionDate); deadline.setDate(deadline.getDate() + 60);
  const daysLeft = Math.round((+deadline - +REF) / 864e5);
  return { deadline, daysLeft };
}

/* DMS doc type → modul audit terkait (untuk penautan bukti) */
const DMS_TYPE_MODULE = { 'Kertas Kerja': 'workpapers', 'Laporan': 'fsgen', 'Surat Perikatan': 'engagement', 'EQR': 'eqr', 'Template': 'templates', 'Memo': 'strategy' };

/* ---- Upload modal ---- */
function UploadModal({ onClose, onAdd }) {
  const [f, setF] = useDMS({ name: '', eng: 'ENG-2025-014', type: 'Kertas Kerja', classification: 'Rahasia', retentionYears: 10, linkedWP: '' });
  const [files, setFiles] = useDMS([]);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const okFiles = files.filter(m => m.ok);
  const valid = f.name.trim().length > 4 && (files.length === 0 || okFiles.length > 0);
  const engObj = DMS_ENGS.find(e => e.id === f.eng);
  const onFiles = (metas) => {
    setFiles(metas);
    const first = metas.find(m => m.ok) || metas[0];
    if (first && !f.name) set('name', first.name.replace(/\.[a-z0-9]+$/i, ''));
  };
  const cls = okFiles[0] && (window as any).classifyDoc ? (window as any).classifyDoc(okFiles[0].name, {}, 0) : null;
  return (
    <PModal icon="upload" title="Unggah Dokumen ke DMS" sub="Terenkripsi AES-256 · klasifikasi & retensi otomatis sesuai ISQM" onClose={onClose} width={560}
      footer={<><Btn onClick={onClose}>Batal</Btn><Btn variant="primary" disabled={!valid} onClick={() => valid && onAdd({ ...f, files: okFiles })}><I.upload size={14} /> Unggah & Arsipkan</Btn></>}>
      <FileDropField onFiles={onFiles} />
      <FileList files={files} onRemove={(i) => setFiles(list => list.filter((_, k) => k !== i))} />
      <div style={{ height: 12 }} />
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <PField label="Nama Dokumen" span><input className="input" value={f.name} onChange={e => set('name', e.target.value)} placeholder="mis. Kertas Kerja — Sentosa Makmur FY2025" autoFocus /></PField>
        <PField label="Engagement"><select className="select" value={f.eng} onChange={e => set('eng', e.target.value)}>{DMS_ENGS.map(e => <option key={e.id} value={e.id}>{e.id} · {e.client.replace('PT ', '')}</option>)}</select></PField>
        <PField label="Jenis"><select className="select" value={f.type} onChange={e => set('type', e.target.value)}>{DMS_TYPES.map(t => <option key={t}>{t}</option>)}</select></PField>
        <PField label="Klasifikasi"><select className="select" value={f.classification} onChange={e => set('classification', e.target.value)}>{Object.keys(CLASS_KIND).map(c => <option key={c}>{c}</option>)}</select></PField>
        <PField label="Retensi (tahun)" hint="SA 230: min. 10 tahun untuk KK audit"><input className="input" type="number" value={f.retentionYears} onChange={e => set('retentionYears', +e.target.value)} /></PField>
        <PField label="Tautan Kertas Kerja (opsional)" span hint="Indeks WP yang ditautkan, pisahkan dengan koma"><input className="input" value={f.linkedWP} onChange={e => set('linkedWP', e.target.value)} placeholder="mis. B-200 Aging Piutang, C-100 Kas & Bank" /></PField>
      </div>
      {cls && <div className="tiny" style={{ marginTop: 10, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 6 }}><I.sparkle size={12} /> AI mendeteksi <b>{cls.type}</b> — akan ditautkan ke modul <b>{(MODULE_INDEX[cls.dest] || {}).label || cls.dest}</b>.</div>}
      <div style={{ marginTop: 12 }}><SecurePipeline /></div>
      <div className="tiny muted" style={{ marginTop: 12 }}>Akan diarsipkan ke folder <b>{engObj ? engObj.id : f.eng}</b> · {engObj ? engObj.client : ''}.</div>
    </PModal>
  );
}

/* ---- Document detail drawer ---- */
function DocDrawer({ d, onClose, onToggleHold, onAccess, fmt }) {
  const [sub, setSub] = useDMS('versi');
  const [cmp, setCmp] = useDMS([]);
  const r = retentionInfo(d);
  const a = assemblyInfo(d);
  const IconC = I[TYPE_ICON[d.type]] || I.doc;
  const toggleCmp = (ver) => setCmp(list => list.includes(ver) ? list.filter(v => v !== ver) : [...list, ver].slice(-2));
  const cmpVers = cmp.map(v => d.versions.find(x => x.ver === v)).filter(Boolean).sort((x, y) => x.ver - y.ver);
  const subtabs = [{ id: 'versi', label: 'Versi', count: d.versions.length }, { id: 'akses', label: 'Log Akses', count: (d.access || []).length }, { id: 'wp', label: 'Tautan WP', count: (d.linkedWP || []).length }];
  return (
    <PDrawer open={!!d} onClose={onClose} width={580}>
      <div className="pdrawer-h">
        <span className="pdrawer-ico" style={{ background: d.legalHold ? 'var(--red-bg)' : 'var(--blue-100)', color: d.legalHold ? 'var(--red)' : 'var(--blue)' }}>{d.legalHold ? <I.lock size={18} /> : <IconC size={18} />}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{d.name}</div>
          <div className="mono tiny muted" style={{ marginTop: 1 }}>{d.id} · {d.eng}</div>
          <div className="row ac gap6 wrap" style={{ marginTop: 7 }}>
            <Badge kind={CLASS_KIND[d.classification]}>{d.classification}</Badge>
            <Badge kind={ASSEMBLY[d.assembly].k}>{ASSEMBLY[d.assembly].l}</Badge>
            {d.legalHold && <Badge kind="red" dot>Legal Hold</Badge>}
          </div>
        </div>
        <button className="top-btn" onClick={onClose} style={{ width: 30, height: 30, color: 'var(--ink-3)' }}><I.x size={16} /></button>
      </div>

      <div className="pdrawer-body">
        <div className="pmeta-grid" style={{ marginBottom: 16 }}>
          <OKv label="Klien" v={d.client || '—'} />
          <OKv label="Pemilik" v={d.owner} />
          <OKv label="Jenis" v={d.type} />
          <OKv label="Versi Aktif" v={'v' + d.ver} />
          <OKv label="Ukuran" v={d.sizeMB + ' MB'} />
          <OKv label="Terakhir Diubah" v={dDate(d.modified, { day: '2-digit', month: 'short', year: '2-digit' })} />
        </div>

        {/* Retention / assembly banner */}
        {a && (
          <div className="panel" style={{ padding: 12, marginBottom: 14, background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="pdrawer-sec-h" style={{ marginBottom: 8, color: 'var(--amber)' }}><I.hourglass size={12} /> Perakitan Final SA 230</div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <OKv label="Tanggal Opini" v={dDate(d.opinionDate)} />
              <OKv label="Batas (60 hr)" v={dDate(a.deadline)} />
              <OKv label="Sisa" v={a.daysLeft + ' hari'} accent={a.daysLeft < 14 ? 'var(--red)' : 'var(--amber)'} />
            </div>
          </div>
        )}
        {r && (
          <div className="pdrawer-sec">
            <div className="pdrawer-sec-h"><I.clock size={12} /> Retensi & Disposal <span className="ln" /></div>
            <div className="row ac gap10">
              <div style={{ flex: 1 }}>
                <div className="row ac gap8"><div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: r.pct + '%', height: '100%', borderRadius: 4, background: r.expired ? 'var(--red)' : r.yrsLeft < 1 ? 'var(--amber)' : 'var(--blue)' }} /></div></div>
                <div className="tiny muted" style={{ marginTop: 4 }}>Diarsip {dDate(d.archivedOn, { month: 'short', year: 'numeric' })} · kedaluwarsa {dDate(r.until, { month: 'short', year: 'numeric' })} · retensi {d.retentionYears} thn</div>
              </div>
              <div style={{ textAlign: 'right' }}><div className="mono" style={{ fontSize: 17, fontWeight: 700, color: r.expired ? 'var(--red)' : 'var(--navy)' }}>{r.expired ? 'Lewat' : r.yrsLeft.toFixed(1)}</div><div className="tiny muted">{r.expired ? 'masa retensi' : 'tahun tersisa'}</div></div>
            </div>
          </div>
        )}
        {d.legalHold && d.holdReason && (
          <div className="panel" style={{ padding: '10px 12px', marginBottom: 14, background: 'var(--red-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8" style={{ color: 'var(--red)' }}><I.lock size={14} /><b style={{ fontSize: 12 }}>Legal Hold Aktif</b></div>
            <div className="tiny" style={{ marginTop: 5, lineHeight: 1.5, color: 'var(--ink-2)' }}>{d.holdReason}</div>
          </div>
        )}

        {/* Keamanan & integritas */}
        {(() => {
          const locked = d.assembly === 'complete' || d.legalHold;
          const hash = d.sha256 || ((window as any).amsFakeHash ? (window as any).amsFakeHash(d.id + d.name) : '—');
          const SecRow = ({ ic, label, value, ok = true }) => (
            <div className="row ac gap8" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <span style={{ color: ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 16px' }}>{React.createElement(I[ic] || I.circle, { size: 14 })}</span>
              <span className="tiny" style={{ flex: 1, fontWeight: 600 }}>{label}</span>
              <span className="tiny" style={{ color: ok ? 'var(--ink-2)' : 'var(--amber)', textAlign: 'right' }}>{value}</span>
            </div>
          );
          return (
            <div className="pdrawer-sec">
              <div className="pdrawer-sec-h"><I.shield size={12} /> Keamanan & Integritas <span className="ln" /></div>
              <SecRow ic="lock" label="Enkripsi at-rest" value={(d.enc || 'AES-256')} />
              <SecRow ic="shield" label="Pindai malware" value="Bersih" />
              <SecRow ic="check" label="Checksum SHA-256" value={<span className="mono">{String(hash).slice(0, 16)}…</span>} />
              <SecRow ic={locked ? 'lock' : 'sync'} label="Imutabilitas" value={locked ? 'Terkunci (WORM)' : 'Berversi'} ok={true} />
              <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.45 }}>{locked ? 'Berkas final dikunci (write-once) — tiap akses tercatat di log; perubahan/penghapusan diblokir (SA 230 ¶A23).' : 'Revisi membuat versi baru; versi lama tetap utuh & dapat dibandingkan.'}</div>
            </div>
          );
        })()}

        {/* Sub-tabs */}
        <div style={{ borderBottom: '1px solid var(--line)', marginBottom: 12 }}><Tabs tabs={subtabs} active={sub} onChange={setSub} /></div>

        {sub === 'versi' && (
          <div>
            <div className="tiny muted" style={{ marginBottom: 8 }}>Pilih dua versi untuk dibandingkan.</div>
            <PVerList versions={d.versions} fileFallback={d.name} onCompare={toggleCmp} compareSel={cmp} />
            {cmpVers.length === 2 && (
              <div className="panel" style={{ padding: 12, marginTop: 10, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
                <div className="pdrawer-sec-h" style={{ color: 'var(--blue)' }}><I.columns size={12} /> Perbandingan v{cmpVers[0].ver} → v{cmpVers[1].ver}</div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                  <OKv label="Ukuran" v={cmpVers[0].sizeMB + ' → ' + cmpVers[1].sizeMB + ' MB'} accent={cmpVers[1].sizeMB > cmpVers[0].sizeMB ? 'var(--green)' : 'var(--ink)'} />
                  <OKv label="Selisih" v={(cmpVers[1].sizeMB - cmpVers[0].sizeMB > 0 ? '+' : '') + (cmpVers[1].sizeMB - cmpVers[0].sizeMB).toFixed(1) + ' MB'} />
                </div>
                <div className="tiny" style={{ lineHeight: 1.5 }}><b>v{cmpVers[0].ver}</b> ({cmpVers[0].by}, {dDate(cmpVers[0].date, { day: '2-digit', month: 'short' })}): {cmpVers[0].note}</div>
                <div className="tiny" style={{ lineHeight: 1.5, marginTop: 4 }}><b>v{cmpVers[1].ver}</b> ({cmpVers[1].by}, {dDate(cmpVers[1].date, { day: '2-digit', month: 'short' })}): {cmpVers[1].note}</div>
              </div>
            )}
          </div>
        )}

        {sub === 'akses' && (
          <div className="ptl">
            {(d.access || []).length === 0 && <div className="tiny muted">Belum ada akses tercatat.</div>}
            {(d.access || []).slice().reverse().map((ac, i) => {
              const meta = PEVT[ac[1]] || { ic: 'circle', c: 'var(--ink-4)' };
              const IconA = I[meta.ic] || I.circle;
              return (
                <div key={i} className="ptl-row">
                  <div className="ptl-mark" style={{ color: meta.c, borderColor: meta.c }}><IconA size={11} /></div>
                  <div className="ptl-body"><div style={{ fontSize: 12, fontWeight: 600 }}>{ACCESS_LBL[ac[1]] || ac[1]} <span className="muted" style={{ fontWeight: 500 }}>oleh {ac[0]}</span></div><div className="tiny muted mono">{ac[2]}</div></div>
                </div>
              );
            })}
          </div>
        )}

        {sub === 'wp' && (
          <div style={{ display: 'grid', gap: 7 }}>
            {(d.linkedWP || []).length === 0 && <div className="tiny muted">Tidak ada kertas kerja tertaut.</div>}
            {(d.linkedWP || []).map((w, i) => (
              <div key={i} className="row ac gap8" style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 7 }}>
                <span style={{ color: 'var(--blue)' }}><I.link2 size={14} /></span>
                <span className="tiny" style={{ flex: 1, fontWeight: 600 }}>{w}</span>
                <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pdrawer-foot">
        <Btn sm onClick={() => onAccess(d.id, 'download')}><I.download size={13} /> Unduh</Btn>
        <Btn sm onClick={() => onAccess(d.id, 'print')}><I.doc size={13} /> Cetak</Btn>
        <div style={{ flex: 1 }} />
        {d.legalHold
          ? <Btn sm onClick={() => onToggleHold(d.id)}><I.check size={13} /> Lepas Hold</Btn>
          : <Btn sm onClick={() => onToggleHold(d.id)} style={{ color: 'var(--red)' }}><I.lock size={13} /> Legal Hold</Btn>}
      </div>
    </PDrawer>
  );
}

function DocManagement() {
  const { fmt } = AMS;
  const [docs, setDocs] = useAmsPersist('dms.v2', () => AMS.DMS_DOCS);
  const [tab, setTab] = useDMS('all');
  const [q, setQ] = useDMS('');
  const [folder, setFolder] = useDMS('all');
  const [selId, setSelId] = useDMS(null);
  const [showUpload, setShowUpload] = useDMS(false);

  const patch = (id, fn) => setDocs(list => list.map(d => d.id === id ? fn(d) : d));
  const toggleHold = (id) => patch(id, d => ({ ...d, legalHold: !d.legalHold, holdReason: !d.legalHold ? 'Legal hold manual oleh tim legal KAP.' : undefined, access: [...(d.access || []), ['Legal KAP', d.legalHold ? 'view' : 'lock', pNowTime()]] }));
  const logAccess = (id, action) => patch(id, d => ({ ...d, access: [...(d.access || []), ['Anindya Pramesti', action, pNowTime()]] }));
  const addDoc = (f) => {
    const id = 'DOC-' + String(700 + Math.floor(Math.random() * 299)).padStart(4, '0');
    const engObj = DMS_ENGS.find(e => e.id === f.eng);
    const meta = (f.files && f.files[0]) || (window as any).amsFileMeta({ name: f.name + '.pdf' });
    const nd = { id, name: f.name.trim(), eng: f.eng, client: engObj ? engObj.client : '—', type: f.type, ver: 1, classification: f.classification, owner: 'Anindya Pramesti', modified: '2026-03-09', sizeMB: meta.sizeMB, retentionYears: f.retentionYears, archivedOn: '2026-03-09', legalHold: false, assembly: f.type === 'Kertas Kerja' ? 'in-progress' : 'complete',
      sha256: meta.sha256, scan: 'clean', enc: 'AES-256', uploadedVia: 'DMS',
      versions: [{ ver: 1, file: meta.name, by: 'Anindya Pramesti', date: '2026-03-09', sizeMB: meta.sizeMB, sha256: meta.sha256, scan: 'clean', note: 'Unggahan awal melalui DMS.' }],
      access: [['Anindya Pramesti', 'edit', pNowTime()], ['Sistem', 'scan', pNowTime()]],
      linkedWP: f.linkedWP ? f.linkedWP.split(',').map(s => s.trim()).filter(Boolean) : [] };
    setDocs(list => [nd, ...list]); setShowUpload(false); setSelId(id);
    if ((window as any).amsAttachEvidence) (window as any).amsAttachEvidence(DMS_TYPE_MODULE[f.type] || 'dms', { file: meta.name, type: 'Dokumen DMS · ' + f.type, std: f.classification, classified: 'dms', sha256: meta.sha256, scan: 'clean' });
  };

  const onHold = docs.filter(d => d.legalHold);
  const assembling = docs.filter(d => d.assembly === 'in-progress' || d.assembly === 'pending');
  const totalGB = (docs.reduce((s, d) => s + d.sizeMB, 0) / 1024);
  const expiringSoon = docs.filter(d => { const rr = retentionInfo(d); return rr && !rr.expired && rr.yrsLeft < 1; }).length;

  /* folders by engagement */
  const folders = useMemoDMS(() => {
    const map = {};
    docs.forEach(d => { (map[d.eng] = map[d.eng] || { eng: d.eng, client: d.client, count: 0 }).count++; });
    return (Object.values(map) as any[]).sort((a: any, b: any) => b.eng.localeCompare(a.eng));
  }, [docs]);

  const tabs = [
    { id: 'all', label: 'Semua Dokumen', count: docs.length },
    { id: 'assembly', label: 'Perakitan SA 230', count: assembling.length },
    { id: 'retention', label: 'Retensi & Disposal' },
    { id: 'hold', label: 'Legal Hold', count: onHold.length },
  ];
  const byFolder = (d) => folder === 'all' || d.eng === folder;
  const filtered = docs.filter(d => byFolder(d) && (q === '' || d.name.toLowerCase().includes(q.toLowerCase()) || d.eng.toLowerCase().includes(q.toLowerCase()) || (d.client || '').toLowerCase().includes(q.toLowerCase())));
  const sel = docs.find(d => d.id === selId);

  return (
    <>
      <SubBar moduleId="dms" right={<div className="row gap8 ac"><span className="chip tiny"><I.lock size={10} /> AES-256 · ISQM</span><Btn sm variant="primary" onClick={() => setShowUpload(true)}><I.upload size={13} /> Unggah Dokumen</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={docs.length} label="Total Dokumen" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={assembling.length} label="Perakitan Belum Final (SA 230)" accent={assembling.length ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={onHold.length} label="Legal Hold Aktif" accent={onHold.length ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(totalGB, 2) + ' GB'} label="Total Arsip" delta={expiringSoon ? expiringSoon + ' kedaluwarsa <1 thn' : null} deltaDir={expiringSoon ? 'down' : null} /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '212px 1fr', gap: 12, alignItems: 'start' }}>
          {/* Folder tree */}
          <Panel noBody>
            <div className="panel-h"><h3 style={{ fontSize: 12 }}>Folder Engagement</h3></div>
            <div className="pfolder" style={{ padding: 8 }}>
              <div className={'pfolder-item' + (folder === 'all' ? ' on' : '')} onClick={() => setFolder('all')}>
                <span className="ic"><I.layers size={15} /></span><span>Semua Dokumen</span><span className="cnt">{docs.length}</span>
              </div>
              <div className="divider" style={{ margin: '6px 4px' }} />
              {folders.map(f => (
                <div key={f.eng} className={'pfolder-item' + (folder === f.eng ? ' on' : '')} onClick={() => setFolder(f.eng)} title={f.client}>
                  <span className="ic"><I.briefcase size={14} /></span>
                  <span className="truncate" style={{ minWidth: 0 }}>{f.eng.replace('ENG-', '')}<div className="tiny muted truncate" style={{ fontWeight: 400 }}>{(f.client || '').replace('PT ', '')}</div></span>
                  <span className="cnt">{f.count}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Main */}
          <Panel noBody>
            <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}>
              <Tabs tabs={tabs} active={tab} onChange={setTab} />
              <div style={{ flex: 1 }} />
              <div className="global-search" style={{ background: 'var(--surface)', border: '1px solid var(--line)', height: 26, maxWidth: 180, margin: '0 10px' }}><I.search2 size={13} style={{ color: 'var(--ink-4)' }} /><input style={{ color: 'var(--ink)' }} placeholder="Cari dokumen…" value={q} onChange={e => setQ(e.target.value)} /></div>
            </div>

            {tab === 'all' && (
              <table className="dtbl">
                <thead><tr><th>Dokumen</th><th>Engagement</th><th>Jenis</th><th className="num">Versi</th><th>Klasifikasi</th><th>Diubah</th><th className="num">Ukuran</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.map(d => {
                    const IconC = I[TYPE_ICON[d.type]] || I.doc;
                    return (
                      <tr key={d.id} onClick={() => setSelId(d.id)} style={{ cursor: 'pointer' }} className={d.id === selId ? 'sel' : ''}>
                        <td style={{ minWidth: 220 }}><div className="row ac gap8"><span style={{ color: d.legalHold ? 'var(--red)' : 'var(--ink-4)' }}>{d.legalHold ? <I.lock size={14} /> : <IconC size={14} />}</span><div style={{ minWidth: 0 }}><div className="truncate" style={{ fontWeight: 600, fontSize: 12.5 }}>{d.name}</div><div className="mono tiny muted">{d.id}</div></div></div></td>
                        <td className="mono tiny muted">{d.eng}</td>
                        <td className="tiny">{d.type}</td>
                        <td className="num"><span className="chip tiny">v{d.ver}</span></td>
                        <td><Badge kind={CLASS_KIND[d.classification]}>{d.classification}</Badge></td>
                        <td className="mono tiny muted">{dDate(d.modified, { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                        <td className="num tiny muted">{d.sizeMB} MB</td>
                        <td><Badge kind={ASSEMBLY[d.assembly].k}>{ASSEMBLY[d.assembly].l}</Badge></td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && <tr><td colSpan={8}><div className="tiny muted" style={{ textAlign: 'center', padding: 22 }}>Tidak ada dokumen pada folder/pencarian ini.</div></td></tr>}
                </tbody>
              </table>
            )}

            {tab === 'assembly' && (
              <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                {assembling.filter(byFolder).length ? assembling.filter(byFolder).map(d => {
                  const a = assemblyInfo(d);
                  return (
                    <div key={d.id} className="panel" style={{ padding: 14, borderLeft: '3px solid var(--' + (a && a.daysLeft < 14 ? 'red' : 'amber') + ')', cursor: 'pointer' }} onClick={() => setSelId(d.id)}>
                      <div className="row jb ac" style={{ marginBottom: 8 }}>
                        <div className="row ac gap8"><span style={{ color: 'var(--ink-4)' }}><I.doc size={15} /></span><div><div style={{ fontWeight: 700, fontSize: 13 }}>{d.name}</div><div className="mono tiny muted">{d.id} · {d.eng} · v{d.ver}</div></div></div>
                        <Badge kind={ASSEMBLY[d.assembly].k}>{ASSEMBLY[d.assembly].l}</Badge>
                      </div>
                      {a ? (
                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
                          <OKv label="Tanggal Opini" v={dDate(d.opinionDate)} />
                          <OKv label="Batas Perakitan (60 hr)" v={dDate(a.deadline)} />
                          <OKv label="Sisa Waktu" v={a.daysLeft + ' hari'} accent={a.daysLeft < 14 ? 'var(--red)' : 'var(--amber)'} />
                        </div>
                      ) : <div className="tiny muted">Menunggu tanggal opini untuk memulai jendela perakitan SA 230.</div>}
                    </div>
                  );
                }) : <div className="tiny muted" style={{ textAlign: 'center', padding: 20 }}>Semua file final telah dirakit dalam tenggat SA 230.</div>}
                <div className="tiny muted" style={{ lineHeight: 1.5 }}>SA 230 ¶A21: perakitan berkas audit final harus diselesaikan tepat waktu, umumnya <b>tidak lebih dari 60 hari</b> setelah tanggal laporan auditor. Setelah final, dokumen dikunci (tidak boleh dihapus/diubah).</div>
              </div>
            )}

            {tab === 'retention' && (
              <table className="dtbl">
                <thead><tr><th>Dokumen</th><th>Diarsip</th><th className="num">Retensi</th><th>Kedaluwarsa</th><th style={{ width: 200 }}>Sisa Masa Retensi</th><th>Aksi</th></tr></thead>
                <tbody>
                  {docs.filter(d => d.archivedOn && byFolder(d)).map(d => {
                    const rr = retentionInfo(d);
                    return (
                      <tr key={d.id} onClick={() => setSelId(d.id)} style={{ cursor: 'pointer' }} className={d.id === selId ? 'sel' : ''}>
                        <td style={{ minWidth: 220, fontWeight: 600 }} className="truncate">{d.name}</td>
                        <td className="mono tiny muted">{dDate(d.archivedOn)}</td>
                        <td className="num"><span className="chip tiny">{d.retentionYears} thn</span></td>
                        <td className="mono tiny">{dDate(rr.until, { month: 'short', year: 'numeric' })}</td>
                        <td>
                          <div className="row ac gap8"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: rr.pct + '%', height: '100%', borderRadius: 3, background: rr.expired ? 'var(--red)' : rr.yrsLeft < 1 ? 'var(--amber)' : 'var(--blue)' }} /></div><span className="mono tiny" style={{ width: 56, textAlign: 'right', color: rr.expired ? 'var(--red)' : 'var(--ink-3)' }}>{rr.expired ? 'Lewat' : rr.yrsLeft.toFixed(1) + ' thn'}</span></div>
                        </td>
                        <td>{rr.expired && !d.legalHold ? <button className="btn sm" style={{ height: 22, color: 'var(--red)' }} onClick={e => e.stopPropagation()}><I.x size={11} /> Disposal</button> : d.legalHold ? <span className="tiny" style={{ color: 'var(--red)' }}><I.lock size={10} /> Ditahan</span> : <span className="tiny muted">Aktif</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {tab === 'hold' && (
              <div style={{ padding: 14 }}>
                {onHold.filter(byFolder).length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {onHold.filter(byFolder).map(d => (
                      <div key={d.id} className="panel" style={{ padding: 14, borderLeft: '3px solid var(--red)' }}>
                        <div className="row jb ac">
                          <div className="row ac gap8" style={{ cursor: 'pointer' }} onClick={() => setSelId(d.id)}><span style={{ color: 'var(--red)' }}><I.lock size={15} /></span><div><div style={{ fontWeight: 700, fontSize: 13 }}>{d.name}</div><div className="mono tiny muted">{d.id} · {d.eng}</div></div></div>
                          <Btn sm onClick={() => toggleHold(d.id)}><I.check size={12} /> Lepas Hold</Btn>
                        </div>
                        {d.holdReason && <div className="tiny" style={{ marginTop: 8, lineHeight: 1.5 }}><b>Alasan:</b> {d.holdReason}</div>}
                      </div>
                    ))}
                  </div>
                ) : <div className="tiny muted" style={{ textAlign: 'center', padding: 20 }}>Tidak ada dokumen di-legal hold pada folder ini.</div>}
                <div className="tiny muted" style={{ marginTop: 12, lineHeight: 1.5 }}>Legal hold menangguhkan disposal otomatis meski masa retensi telah lewat — dipakai saat ada sengketa, litigasi, atau permintaan regulator/penegak hukum.</div>
              </div>
            )}
          </Panel>
        </div>
      </div></div>
      {sel && <DocDrawer d={sel} onClose={() => setSelId(null)} onToggleHold={toggleHold} onAccess={logAccess} fmt={fmt} />}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onAdd={addDoc} />}
    </>
  );
}

Object.assign(window, { DocManagement });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { DocManagement };
