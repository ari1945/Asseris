/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAudit, useFirm, useNav } from './contexts';
import { FileDropField, FileList, SecurePipeline } from './evidence';
import { I, MODULE_INDEX } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Donut, Panel, Seg, Stat, Tabs } from './ui';
import { PEVT, PField, PModal, PThread, PTimeline, PVerList, pNowTime } from './view_docparts';
import { OKv } from './view_onboarding';

/* ============================================================
   Asseris — Portal Klien / PBC (Prepared By Client)
   Master–detail: daftar permintaan → detail (riwayat versi berkas,
   komentar berulir, jejak audit). Modal tambah permintaan, pengingat
   massal, tampilan sisi-klien, dan kanal pesan aman.

   SUMBER KEBENARAN TUNGGAL (single source of truth):
   · Identitas perikatan & klien  → useFirm() (activeEngagement/activeClient)
   · Roster tim peminta           → useAudit().team / AMS.TEAM
   · Berkas diterima              → amsAttachEvidence → modul area + DMS
   · Tautan area audit / kertas kerja → MODULE_INDEX + openCanonicalWp (WP kanonik)
   · Setiap aksi dicatat ke jejak audit firma (useAudit().logActivity)
   ============================================================ */
const { useState: usePBC, useMemo: useMemoPBC } = React;

const PBC_STAT = { 'Diminta': 'gray', 'Diterima': 'blue', 'Direviu': 'green', 'Terlambat': 'red' };
const PBC_PRIO = { 'Tinggi': 'red', 'Sedang': 'amber', 'Rendah': 'gray' };
const PBC_CATICON = { 'Kas & Bank': 'coins', 'Piutang': 'receipt', 'Persediaan': 'layers', 'Pendapatan': 'trend', 'Aset Tetap': 'building', 'Tata Kelola': 'gavel', 'Liabilitas': 'scale' };
const PBC_CATS = ['Kas & Bank', 'Piutang', 'Persediaan', 'Pendapatan', 'Aset Tetap', 'Liabilitas', 'Tata Kelola'];

/* Peta kanonik kategori → modul area audit + indeks kertas kerja + asersi.
   Dipakai sebagai fallback untuk item lama / item baru tanpa tautan eksplisit. */
const PBC_LINK = {
  'Kas & Bank':  { module: 'confirm', wp: 'A',  assertion: 'Keberadaan & Pisah Batas' },
  'Piutang':     { module: 'confirm', wp: 'B',  assertion: 'Keberadaan & Penilaian (ECL)' },
  'Persediaan':  { module: 'psak14',  wp: 'C',  assertion: 'Keberadaan & Penilaian (NRV)' },
  'Pendapatan':  { module: 'psak72',  wp: 'R',  assertion: 'Keterjadian & Pisah Batas' },
  'Aset Tetap':  { module: 'psak16',  wp: 'E',  assertion: 'Keberadaan & Penilaian' },
  'Liabilitas':  { module: 'confirm', wp: 'BB', assertion: 'Kelengkapan & Keberadaan' },
  'Tata Kelola': { module: 'related', wp: 'K',  assertion: 'Kelengkapan & Pengungkapan' },
};
const linkFor = (r: any) => {
  const f = (PBC_LINK as any)[r.cat] || {};
  return { module: r.module || f.module, wp: r.wp || f.wp, assertion: r.assertion || f.assertion };
};

/* Status kertas kerja kanonik → warna badge + label Indonesia (selaras Working Papers). */
const WP_STATUS_KIND = { 'Reviewed': 'green', 'In Review': 'amber', 'In Progress': 'blue', 'Not Started': 'gray' };
const WP_STATUS_ID = { 'Reviewed': 'Direviu', 'In Review': 'Sedang Direviu', 'In Progress': 'Dikerjakan', 'Not Started': 'Belum Mulai' };
/* Tarikan status HIDUP kertas kerja dari sumber kebenaran tunggal modul Working Papers
   (window.deriveWpStatus). Portal tidak menyimpan salinan privat status WP. */
const wpLive = (wp: any, audit: any, firm: any) => {
  if (!wp || typeof window.deriveWpStatus !== 'function') return null;
  try { return window.deriveWpStatus(wp, audit || {}, firm || {}); } catch (e) { return null; }
};
const wpMetaFor = (wp: any) => ((window as any).WP_META || {})[wp] || {};

const fmtDS = (d: any) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '—';

function AddRequestModal({ onClose, onAdd, nextNo, staff, engId, clientName }: any) {
  const [f, setF] = usePBC({ item: '', cat: 'Kas & Bank', requestedBy: staff[0] || 'Anindya Pramesti', due: '2026-03-20', priority: 'Sedang', desc: '' });
  const set = (k: any, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const valid = f.item.trim().length > 3;
  const lk = (PBC_LINK as any)[f.cat] || {};
  const mod = ((MODULE_INDEX as any)[lk.module] || {}).label || lk.module;
  const wpTitle = (((window as any).WP_META || {})[lk.wp] || {}).title;
  const engShort = engId.replace('ENG-', '');
  return (
    <PModal icon="plus" title="Tambah Permintaan Dokumen (PBC)" sub={engId + ' · ' + clientName + ' · PBC-' + engShort.slice(-3) + '-' + String(nextNo).padStart(2, '0')} onClose={onClose} width={560}
      footer={<><Btn onClick={onClose}>Batal</Btn><Btn variant="primary" disabled={!valid} onClick={() => valid && onAdd(f)}><I.plus size={14} /> Buat Permintaan</Btn></>}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <PField label="Item / Deskripsi Singkat" span><input className="input" value={f.item} onChange={(e: any) => set('item', e.target.value)} placeholder="mis. Daftar piutang usaha & umur (aging)" autoFocus /></PField>
        <PField label="Kategori (Area Audit)"><select className="select" value={f.cat} onChange={(e: any) => set('cat', e.target.value)}>{PBC_CATS.map(c => <option key={c}>{c}</option>)}</select></PField>
        <PField label="Diminta oleh"><select className="select" value={f.requestedBy} onChange={(e: any) => set('requestedBy', e.target.value)}>{staff.map((s: any) => <option key={s}>{s}</option>)}</select></PField>
        <PField label="Jatuh Tempo"><input className="input" type="date" value={f.due} onChange={(e: any) => set('due', e.target.value)} /></PField>
        <PField label="Prioritas"><select className="select" value={f.priority} onChange={(e: any) => set('priority', e.target.value)}>{Object.keys(PBC_PRIO).map(p => <option key={p}>{p}</option>)}</select></PField>
        <PField label="Catatan untuk Klien" span hint="Jelaskan format & cakupan yang dibutuhkan agar klien tepat sasaran."><textarea className="input" value={f.desc} onChange={(e: any) => set('desc', e.target.value)} rows={3} style={{ height: 'auto', padding: 9, resize: 'vertical', lineHeight: 1.5 }} placeholder="Rincian dokumen, periode, format berkas…" /></PField>
      </div>
      {lk.module && <div className="tiny" style={{ marginTop: 10, color: 'var(--blue)', display: 'flex', gap: 6, alignItems: 'center', lineHeight: 1.5 }}><I.link2 size={12} /> <span>Otomatis tertaut ke <b>{mod}</b> · kertas kerja <b>WP {lk.wp}{wpTitle ? ' — ' + wpTitle : ''}</b> · asersi <b>{lk.assertion}</b> saat berkas diterima.</span></div>}
    </PModal>
  );
}

/* ---- Dock keterkaitan satu item: area audit · WP kanonik · DMS · asersi ---- */
function ReqLinkage({ r }: any) {
  const nav = useNav();
  const audit = useAudit();
  const firm = useFirm();
  const lk = linkFor(r);
  const mod = (MODULE_INDEX as any)[lk.module] || { label: lk.module, icon: 'panel' };
  const ModIc = (I as any)[mod.icon] || I.panel;
  const evCount = ((window as any).amsEvidenceCount && lk.module) ? (window as any).amsEvidenceCount(lk.module) : 0;
  const archived = r.versions && r.versions.length > 0;
  const wp = wpLive(lk.wp, audit, firm);
  const meta = wpMetaFor(lk.wp);
  const relRisks = (wp && wp.relRisks) || [];
  const openWp = () => { if (window.openCanonicalWp) window.openCanonicalWp(nav, lk.wp); else nav('workpapers'); };
  return (
    <div style={{ display: 'grid', gap: 7 }}>
      <button type="button" className="pbc-link" onClick={() => nav(lk.module, { from: 'clientportal' })} title={'Buka ' + mod.label}>
        <span className="pbc-link-ic" style={{ background: 'var(--blue-100)', color: 'var(--blue)' }}><ModIc size={14} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="pbc-link-lbl">Area Audit · {mod.label}</span>
          <span className="pbc-link-sub">Asersi: {lk.assertion}</span>
        </span>
        {evCount > 0 && <span className="chip tiny" title="Bukti terkumpul di modul area (Evaluasi Bukti)">{evCount} bukti</span>}
        <I.arrowRight size={12} style={{ color: 'var(--ink-4)' }} />
      </button>
      <button type="button" className="pbc-link" onClick={openWp} title={'Buka kertas kerja WP ' + lk.wp + (wp ? ' — ' + wp.title : '')}>
        <span className="pbc-link-ic" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}><I.layers size={14} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="pbc-link-lbl">WP {lk.wp}{wp ? ' · ' + wp.title : ' · Kertas Kerja'}</span>
          <span className="pbc-link-sub">{wp ? (wp.done + '/' + wp.total + ' prosedur' + (wp.exc ? ' · ' + wp.exc + ' pengecualian' : '') + (wp.openNotes ? ' · ' + wp.openNotes + ' catatan reviu' : '') + (meta.preparer ? ' · disiapkan ' + meta.preparer : '')) : 'Bukti substantif untuk lead schedule'}</span>
        </span>
        {wp ? <Badge kind={(WP_STATUS_KIND as any)[wp.status] || 'gray'}>{(WP_STATUS_ID as any)[wp.status] || wp.status}</Badge> : null}
        <I.arrowRight size={12} style={{ color: 'var(--ink-4)' }} />
      </button>
      {relRisks.length > 0 && (
        <button type="button" className="pbc-link" onClick={() => nav('risk', { from: 'clientportal' })} title="Buka penilaian risiko (SA 315)">
          <span className="pbc-link-ic" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}><I.shield size={14} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="pbc-link-lbl">Risiko Tertaut · {relRisks.map((x: any) => x.id).join(', ')}</span>
            <span className="pbc-link-sub">RoMM (SA 315) menetapkan prioritas &amp; cakupan dokumen yang diminta</span>
          </span>
          <I.arrowRight size={12} style={{ color: 'var(--ink-4)' }} />
        </button>
      )}
      <button type="button" className="pbc-link" onClick={() => nav('dms', { from: 'clientportal' })} title="Buka arsip DMS">
        <span className="pbc-link-ic" style={{ background: archived ? 'var(--green-bg)' : 'var(--surface-3)', color: archived ? 'var(--green)' : 'var(--ink-3)' }}><I.archive size={14} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="pbc-link-lbl">Arsip DMS {archived ? '· terarsip' : '· menunggu berkas'}</span>
          <span className="pbc-link-sub">{archived ? 'AES-256 · Rahasia · retensi 10 thn' : 'Belum ada berkas untuk diarsip'}</span>
        </span>
        <I.arrowRight size={12} style={{ color: 'var(--ink-4)' }} />
      </button>
    </div>
  );
}

function ReqDetail({ r, persona, onUpload, onReview, onRevise, onRemind, onComment }: any) {
  const late = r.status === 'Terlambat';
  const pending = r.status === 'Diminta' || r.status === 'Terlambat';
  const IconC = (I as any)[(PBC_CATICON as any)[r.cat]] || I.doc;
  const isClient = persona === 'client';
  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '13px 14px', borderBottom: '1px solid var(--line)' }}>
        <div className="row ac gap10" style={{ marginBottom: 8 }}>
          <span className="preq-ico" style={{ background: 'var(--blue-100)', color: 'var(--blue)' }}><IconC size={16} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.3 }}>{r.item}</div>
            <div className="mono tiny muted">{r.id} · {r.cat}</div>
          </div>
        </div>
        <div className="row ac gap6 wrap">
          <Badge kind={(PBC_STAT as any)[r.status]}>{r.status}</Badge>
          <Badge kind={(PBC_PRIO as any)[r.priority]} dot>{r.priority}</Badge>
        </div>
      </div>
      <div style={{ padding: 14, maxHeight: 'calc(100vh - 240px)', overflow: 'auto' }}>
        {r.desc && <div className="tiny" style={{ lineHeight: 1.55, color: 'var(--ink-2)', marginBottom: 12 }}>{r.desc}</div>}
        <div className="pmeta-grid" style={{ marginBottom: 14 }}>
          <OKv label="Diminta oleh" v={r.requestedBy} />
          <OKv label="Jatuh Tempo" v={fmtDS(r.due)} accent={late ? 'var(--red)' : null} />
          <OKv label="Diunggah oleh" v={r.uploadedBy || '—'} />
          <OKv label="Tanggal Unggah" v={fmtDS(r.date)} />
        </div>

        {/* actions */}
        <div className="row gap6 wrap" style={{ marginBottom: 16 }}>
          {pending && <Btn sm variant={isClient ? 'primary' : ''} onClick={() => onUpload(r.id)}><I.upload size={12} /> {isClient ? 'Unggah Berkas' : 'Simulasi Unggah Klien'}</Btn>}
          {!isClient && pending && <Btn sm onClick={() => onRemind(r.id)}><I.bell size={12} /> Kirim Pengingat</Btn>}
          {!isClient && r.status === 'Diterima' && <Btn sm variant="primary" onClick={() => onReview(r.id)}><I.check size={12} /> Tandai Direviu</Btn>}
          {!isClient && (r.status === 'Diterima' || r.status === 'Direviu') && <Btn sm onClick={() => onRevise(r.id)}><I.sync size={12} /> Minta Revisi</Btn>}
          {r.status === 'Direviu' && <span className="denv-tag" style={{ color: 'var(--green)' }}><I.checkCircle size={13} /> Selesai direviu</span>}
        </div>

        {/* keterkaitan lintas-modul — sumber kebenaran tunggal */}
        <div className="pdrawer-sec">
          <div className="pdrawer-sec-h"><I.link2 size={12} /> Keterkaitan & Hilir Data <span className="ln" /></div>
          <ReqLinkage r={r} />
        </div>

        <div className="pdrawer-sec">
          <div className="pdrawer-sec-h"><I.layers size={12} /> Riwayat Versi Berkas <span className="ln" /></div>
          {r.versions.some((v: any) => v.scan === 'clean') && (
            <div className="row ac gap6 wrap" style={{ marginBottom: 8 }}>
              <span className="chip tiny" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><I.lock size={10} /> Terenkripsi TLS+AES-256</span>
              <span className="chip tiny" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><I.shield size={10} /> Dipindai bersih</span>
              <span className="chip tiny"><I.check size={10} /> Checksum SHA-256</span>
            </div>
          )}
          <PVerList versions={r.versions} fileFallback={r.file} />
        </div>

        <div className="pdrawer-sec">
          <div className="pdrawer-sec-h"><I.mail size={12} /> Komentar Item <span className="ln" /></div>
          <PThread msgs={r.thread} selfSide={persona} compact height={180} onSend={(t: any) => onComment(r.id, t)} placeholder={isClient ? 'Balas auditor…' : 'Tulis ke klien…'} />
        </div>

        <div className="pdrawer-sec" style={{ marginBottom: 0 }}>
          <div className="pdrawer-sec-h"><I.clock size={12} /> Jejak Audit <span className="ln" /></div>
          <PTimeline events={r.events} />
        </div>
      </div>
    </div>
  );
}

/* ---- Modal unggah berkas aman (PBC) ---- */
function PBCUploadModal({ req, persona, onClose, onConfirm }: any) {
  const [files, setFiles] = usePBC([]);
  const ok = files.filter((m: any) => m.ok);
  const cls = ok[0] && (window as any).classifyDoc ? (window as any).classifyDoc(ok[0].name, {}, 0) : null;
  const isClient = persona === 'client';
  return (
    <PModal icon="upload" title={isClient ? 'Unggah Berkas' : 'Simulasi Unggah Klien'} sub={req.id + ' · ' + req.item} onClose={onClose} width={540}
      footer={<><Btn onClick={onClose}>Batal</Btn><Btn variant="primary" disabled={!ok.length} onClick={() => onConfirm(ok)}><I.lock size={14} /> Kirim Aman</Btn></>}>
      <FileDropField onFiles={setFiles} hint="Dokumen sesuai permintaan PBC · PDF/XLSX/DOCX · maks 25 MB" />
      <FileList files={files} onRemove={(i: any) => setFiles((list: any) => list.filter((_: any, k: any) => k !== i))} />
      {cls && <div className="tiny" style={{ marginTop: 10, color: 'var(--blue)', display: 'flex', gap: 6, alignItems: 'center', lineHeight: 1.5 }}><I.sparkle size={12} /> <span>AI mengenali <b>{cls.type}</b> — otomatis terklasifikasi, tertaut ke <b>{((MODULE_INDEX as any)[cls.dest] || {}).label || cls.dest}</b> & terarsip terenkripsi di DMS.</span></div>}
      <div style={{ marginTop: 12 }}><SecurePipeline title="Pertukaran dokumen aman (PBC)" /></div>
    </PModal>
  );
}

/* ---- Tab Kesiapan Area Audit: REKONSILIASI lintas-modul dari satu sumber kebenaran ---- */
function CoveragePanel({ reqs, today }: any) {
  const nav = useNav();
  const audit = useAudit();
  const firm = useFirm();
  const cats = PBC_CATS.filter(c => reqs.some((r: any) => r.cat === c));
  const openWp = (wp: any) => { if (window.openCanonicalWp) window.openCanonicalWp(nav, wp); else nav('workpapers'); };
  return (
    <div style={{ padding: 14 }}>
      <div className="tiny muted" style={{ marginBottom: 12, lineHeight: 1.55 }}>Rekonsiliasi kesiapan per area audit dari <b>satu sumber kebenaran</b>: pengumpulan dokumen (PBC di portal ini), status kertas kerja kanonik (modul Working Papers), bukti terkumpul (Evaluasi Bukti) &amp; arsip DMS — ditarik hidup, bukan salinan privat.</div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: 10 }}>
        {cats.map(c => {
          const items = reqs.filter((r: any) => r.cat === c);
          const got = items.filter((r: any) => r.status === 'Diterima' || r.status === 'Direviu').length;
          const reviewed = items.filter((r: any) => r.status === 'Direviu').length;
          const late = items.filter((r: any) => r.status === 'Terlambat').length;
          const pct = Math.round(got / items.length * 100);
          const lk = (PBC_LINK as any)[c] || {};
          const mod = (MODULE_INDEX as any)[lk.module] || { label: lk.module, icon: 'panel' };
          const ModIc = (I as any)[mod.icon] || I.panel;
          const CatIc = (I as any)[(PBC_CATICON as any)[c]] || I.doc;
          const ready = got === items.length;
          const wp = wpLive(lk.wp, audit, firm);
          const meta = wpMetaFor(lk.wp);
          const evCount = ((window as any).amsEvidenceCount && lk.module) ? (window as any).amsEvidenceCount(lk.module) : 0;
          const wpPct = wp ? Math.round(wp.done / wp.total * 100) : 0;
          const wpReviewed = wp && wp.status === 'Reviewed';
          return (
            <div key={c} className="panel" style={{ padding: 13 }}>
              <div className="row ac gap8" style={{ marginBottom: 11 }}>
                <span className="preq-ico" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}><CatIc size={15} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c}</div>
                  <div className="tiny muted truncate">{meta.preparer ? 'Penanggung jawab WP: ' + meta.preparer : 'Area audit'}</div>
                </div>
                <Badge kind={ready ? 'green' : late ? 'red' : 'amber'}>{ready ? 'Dokumen siap' : pct + '%'}</Badge>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div className="row ac jb" style={{ marginBottom: 4 }}><span className="tiny" style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><I.upload size={11} /> Dokumen PBC</span><span className="tiny muted mono">{got}/{items.length} diterima · {reviewed} direviu{late ? ' · ' + late + ' telat' : ''}</span></div>
                <div className="mini"><span style={{ width: pct + '%', background: ready ? 'var(--green)' : late ? 'var(--red)' : 'var(--blue)' }} /></div>
              </div>
              <div style={{ marginBottom: 11 }}>
                <div className="row ac jb" style={{ marginBottom: 4 }}><span className="tiny" style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><I.layers size={11} /> Kertas Kerja WP {lk.wp}</span>{wp ? <Badge kind={(WP_STATUS_KIND as any)[wp.status] || 'gray'}>{(WP_STATUS_ID as any)[wp.status] || wp.status}</Badge> : <span className="tiny muted">belum tertaut</span>}</div>
                <div className="mini"><span style={{ width: wpPct + '%', background: wpReviewed ? 'var(--green)' : 'var(--blue)' }} /></div>
                {wp && <div className="tiny muted" style={{ marginTop: 4 }}>{wp.done}/{wp.total} prosedur{wp.exc ? ' · ' + wp.exc + ' pengecualian' : ''}{wp.openNotes ? ' · ' + wp.openNotes + ' catatan reviu terbuka' : ''}</div>}
              </div>
              <div className="row gap6 wrap">
                <button type="button" className="pbc-link" style={{ flex: 1 }} onClick={() => nav(lk.module, { from: 'clientportal' })} title={'Buka ' + mod.label}>
                  <span className="pbc-link-ic" style={{ background: 'var(--blue-100)', color: 'var(--blue)' }}><ModIc size={13} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}><span className="pbc-link-lbl">{mod.label}</span><span className="pbc-link-sub">{evCount} bukti terkumpul</span></span>
                  <I.arrowRight size={11} style={{ color: 'var(--ink-4)' }} />
                </button>
                <button type="button" className="pbc-link" onClick={() => openWp(lk.wp)} title={'Buka WP ' + lk.wp} style={{ flex: '0 0 auto' }}>
                  <span className="pbc-link-ic" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}><I.layers size={13} /></span>
                  <span className="pbc-link-lbl mono">WP {lk.wp}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClientPortal() {
  const firm = useFirm();
  const audit = useAudit();
  const eng = firm.activeEngagement || {};
  const clientObj = firm.activeClient || {};
  const engId = eng.id || 'ENG-2025-014';
  const clientName = clientObj.name || 'PT Sentosa Makmur Tbk';
  const logActivity = audit.logActivity || (() => {});
  /* roster peminta dari sumber kebenaran tunggal (tim perikatan) */
  const staff = useMemoPBC(() => {
    const team = (audit.team || AMS.TEAM || []).filter((t: any) => !/Partner/.test(t.role)).map((t: any) => t.name);
    return team.length ? team : ['Anindya Pramesti', 'Dimas Raharjo', 'Sinta Wulandari', 'Fajar Nugroho'];
  }, [audit.team]);

  const [reqs, setReqs] = useAmsPersist('pbc.v2', () => AMS.PBC_REQUESTS);
  const [msgs, setMsgs] = useAmsPersist('portalMsgs.v2', () => AMS.PORTAL_MSGS);
  const [tab, setTab] = usePBC('reqs');
  const [filter, setFilter] = usePBC('All');
  const [statusFilter, setStatusFilter] = usePBC('Semua');
  const [q, setQ] = usePBC('');
  const [persona, setPersona] = usePBC('firm');
  const [showAdd, setShowAdd] = usePBC(false);
  const [uploadReq, setUploadReq] = usePBC(null);

  const today = '2026-03-09';
  /* hanya item perikatan aktif — konsisten dengan useFirm() */
  const engReqs = useMemoPBC(() => reqs.filter((r: any) => r.eng === engId), [reqs, engId]);
  const [selId, setSelId] = usePBC(() => (engReqs[1] || engReqs[0] || {}).id);

  const received = engReqs.filter((r: any) => r.status === 'Diterima' || r.status === 'Direviu').length;
  const reviewed = engReqs.filter((r: any) => r.status === 'Direviu').length;
  const overdue = engReqs.filter((r: any) => r.status === 'Terlambat');
  const pct = engReqs.length ? Math.round(received / engReqs.length * 100) : 0;

  const pushEvent = (r: any, ev: any) => ({ ...r, events: [...(r.events || []), ev] });
  const patch = (id: any, fn: any) => setReqs((list: any) => list.map((r: any) => r.id === id ? fn(r) : r));

  const openUpload = (id: any) => setUploadReq(reqs.find((r: any) => r.id === id) || null);
  const doUpload = (id: any, metas: any) => {
    const meta = metas[0];
    const cls = (window as any).classifyDoc ? (window as any).classifyDoc(meta.name, {}, 0) : null;
    const reqObj = reqs.find((r: any) => r.id === id);
    const lk: any = reqObj ? linkFor(reqObj) : {};
    const dest = (cls && cls.dest) || lk.module;
    patch(id, (r: any) => {
      const nextVer = (r.versions[r.versions.length - 1]?.ver || 0) + 1;
      let nr = { ...r, status: 'Diterima', uploadedBy: r.uploadedBy || 'Bag. Keuangan', date: today, file: meta.name,
        versions: [...r.versions, { ver: nextVer, file: meta.name, by: 'Bag. Keuangan', side: 'client', date: today, sizeMB: meta.sizeMB, sha256: meta.sha256, scan: 'clean', note: nextVer > 1 ? 'Revisi sesuai catatan auditor.' : 'Unggahan dari portal klien.' }] };
      nr = pushEvent(nr, ['upload', 'Bag. Keuangan', pNowTime(), 'Mengunggah v' + nextVer + ' via TLS 1.3']);
      nr = pushEvent(nr, ['scan', 'Sistem', pNowTime(), 'Pindai malware: Bersih · checksum SHA-256 terverifikasi']);
      nr = pushEvent(nr, ['receive', 'Sistem', pNowTime(), 'Terarsip ke DMS (AES-256, Rahasia)' + (dest ? ' · tertaut ' + (((MODULE_INDEX as any)[dest] || {}).label || 'modul') + ' · WP ' + lk.wp : '')]);
      return nr;
    });
    if ((window as any).amsAttachEvidence && dest) (window as any).amsAttachEvidence(dest, { file: meta.name, type: 'PBC · ' + ((cls && cls.type) || (reqObj && reqObj.cat) || 'Dokumen'), std: (cls && cls.std) || lk.assertion, classified: dest, sha256: meta.sha256, scan: 'clean' });
    if ((window as any).amsAttachEvidence) (window as any).amsAttachEvidence('dms', { file: meta.name, type: 'Arsip DMS · PBC (Rahasia)', std: 'Rahasia', classified: 'dms', sha256: meta.sha256, scan: 'clean' });
    logActivity({ who: 'Portal Klien', what: 'menerima "' + meta.name + '" (' + id + ') → ' + (((MODULE_INDEX as any)[dest] || {}).label || 'DMS') + ' · WP ' + lk.wp, mod: 'clientportal', icon: 'upload' });
    setUploadReq(null);
  };
  const onReview = (id: any) => { patch(id, (r: any) => pushEvent({ ...r, status: 'Direviu' }, ['review', 'Auditor', pNowTime(), 'Ditandai direviu · tertaut WP ' + linkFor(r).wp])); logActivity({ who: 'Auditor', what: 'menandai PBC ' + id + ' direviu', mod: 'clientportal', icon: 'check' }); };
  const onRevise = (id: any) => patch(id, (r: any) => {
    let nr = pushEvent({ ...r, status: 'Diminta' }, ['reminder', 'Auditor', pNowTime(), 'Diminta revisi berkas']);
    nr = { ...nr, thread: [...(nr.thread || []), { by: 'Auditor', side: 'firm', text: 'Mohon revisi berkas sesuai catatan kami, terima kasih.', time: pNowTime() }] };
    return nr;
  });
  const onRemind = (id: any) => { patch(id, (r: any) => pushEvent({ ...r, status: r.status === 'Diminta' && new Date(r.due) < new Date(today) ? 'Terlambat' : r.status }, ['reminder', 'Auditor', pNowTime(), 'Pengingat dikirim ke klien'])); logActivity({ who: 'Auditor', what: 'mengirim pengingat PBC ' + id, mod: 'clientportal', icon: 'bell' }); };
  const onComment = (id: any, text: any) => patch(id, (r: any) => ({ ...r, thread: [...(r.thread || []), { by: persona === 'client' ? 'Bag. Keuangan' : 'Auditor', side: persona, text, time: pNowTime() }] }));
  const onBulkRemind = () => { setReqs((list: any) => list.map((r: any) => r.status === 'Terlambat' ? pushEvent(r, ['reminder', 'Auditor', pNowTime(), 'Pengingat massal keterlambatan']) : r)); logActivity({ who: 'Auditor', what: 'mengirim pengingat massal ' + overdue.length + ' item terlambat', mod: 'clientportal', icon: 'bell' }); };
  const onAdd = (f: any) => {
    const engShort = engId.replace('ENG-', '');
    const prefix = 'PBC-' + engShort.slice(-3) + '-';
    const no = engReqs.length + 1;
    const id = prefix + String(no).padStart(2, '0');
    const lk = (PBC_LINK as any)[f.cat] || {};
    const nr = { id, eng: engId, client: clientName, item: f.item.trim(), cat: f.cat, priority: f.priority, module: lk.module, wp: lk.wp, assertion: lk.assertion, desc: f.desc, requestedBy: f.requestedBy, due: f.due, status: 'Diminta', uploadedBy: '', date: '', file: '', versions: ([] as any[]), thread: ([] as any[]), events: [['request', f.requestedBy, pNowTime(), 'Permintaan dibuat']] };
    setReqs((list: any) => [...list, nr]); setSelId(id); setShowAdd(false); setTab('reqs');
    logActivity({ who: f.requestedBy, what: 'membuat permintaan PBC ' + id + ' (' + f.cat + ')', mod: 'clientportal', icon: 'plus' });
  };
  const sendChat = (text: any) => setMsgs((m: any) => [...m, { from: persona === 'client' ? 'Bag. Keuangan (Klien)' : 'Anindya Pramesti (KAP)', side: persona, text, time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }]);

  const shown = engReqs.filter((r: any) => (filter === 'All' || r.cat === filter) && (statusFilter === 'Semua' || r.status === statusFilter) && (q === '' || r.item.toLowerCase().includes(q.toLowerCase()) || r.id.toLowerCase().includes(q.toLowerCase())));
  const groups = useMemoPBC(() => {
    const visibleCats = PBC_CATS.filter(c => shown.some((r: any) => r.cat === c));
    return visibleCats.map(c => ({ cat: c, items: shown.filter((r: any) => r.cat === c) }));
  }, [shown.map((r: any) => r.id + r.status).join(','), filter, statusFilter, q]);
  const sel = engReqs.find((r: any) => r.id === selId) || shown[0];

  const allEvents = useMemoPBC(() => {
    const out: any[] = [];
    engReqs.forEach((r: any) => (r.events || []).forEach((e: any, i: any) => out.push({ item: r.item, id: r.id, e, ord: i })));
    return out.reverse();
  }, [engReqs]);

  const tabs = [{ id: 'reqs', label: 'Permintaan Dokumen', count: engReqs.length }, { id: 'coverage', label: 'Kesiapan Area' }, { id: 'chat', label: 'Pesan Aman' }, { id: 'activity', label: 'Jejak Audit' }];

  return (
    <>
      <SubBar moduleId="clientportal" right={
        <div className="row gap8 ac">
          <Seg options={[{ value: 'firm', label: 'Auditor' }, { value: 'client', label: 'Tampilan Klien' }]} value={persona} onChange={setPersona} />
          {overdue.length > 0 && persona === 'firm' && <Btn sm onClick={onBulkRemind}><I.bell size={13} /> Ingatkan {overdue.length} Terlambat</Btn>}
          {persona === 'firm' && <Btn sm variant="primary" onClick={() => setShowAdd(true)}><I.plus size={14} /> Tambah Permintaan</Btn>}
        </div>} />
      <div className="view-scroll"><div className="view-pad">
        {/* konteks perikatan — sumber kebenaran tunggal (useFirm) */}
        <div className="panel" style={{ margin: '0 0 12px', padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--blue)' }}><I.briefcase size={15} /></span>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{clientName}</span>
          <span className="chip tiny mono">{engId}</span>
          <span className="chip tiny">{eng.fy || 'FY2025'}</span>
          {eng.partner && <span className="tiny muted">Partner: {eng.partner} · Manajer: {eng.manager}</span>}
          <span style={{ flex: 1 }} />
          <span className="tiny muted">Tenggat lapor: <b>{eng.deadline ? new Date(eng.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</b></span>
        </div>
        {persona === 'client' && (
          <div className="panel" style={{ margin: '0 0 12px', padding: '9px 13px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--blue)' }}><I.users size={15} /></span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>Pratinjau portal sebagaimana dilihat klien ({clientName}). Aksi reviu internal & catatan auditor disembunyikan.</span>
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={engReqs.length} label="Total Permintaan (PBC)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={received + ' / ' + engReqs.length} label="Diterima" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={overdue.length} label="Terlambat" accent={overdue.length ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><div className="row ac jb"><Stat value={pct + '%'} label="Progres Pengumpulan" accent="var(--blue)" /><Donut size={52} thickness={9} segments={[{ value: reviewed, color: 'var(--green)' }, { value: received - reviewed, color: 'var(--blue)' }, { value: engReqs.length - received, color: 'var(--surface-3)' }]} /></div></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}>
            <Tabs tabs={tabs} active={tab} onChange={setTab} />
            <div style={{ flex: 1 }} />
            {tab === 'reqs' && <div className="global-search" style={{ background: 'var(--surface)', border: '1px solid var(--line)', height: 26, maxWidth: 170, margin: '0 10px' }}><I.search2 size={13} style={{ color: 'var(--ink-4)' }} /><input style={{ color: 'var(--ink)' }} placeholder="Cari item…" value={q} onChange={(e: any) => setQ(e.target.value)} /></div>}
          </div>

          {tab === 'reqs' && (
            <div style={{ padding: 12 }}>
              <div className="row ac gap8 wrap" style={{ marginBottom: 10 }}>
                <Seg options={['All', ...PBC_CATS]} value={filter} onChange={setFilter} />
                <span style={{ flex: 1 }} />
                <Seg options={['Semua', 'Diminta', 'Diterima', 'Direviu', 'Terlambat']} value={statusFilter} onChange={setStatusFilter} />
              </div>
              <div className="pdms-split">
                <div>
                  {groups.length === 0 && <div className="tiny muted" style={{ textAlign: 'center', padding: 30 }}>Tidak ada item yang cocok.</div>}
                  {groups.map((g: any) => {
                    const got = g.items.filter((r: any) => r.status === 'Diterima' || r.status === 'Direviu').length;
                    return (
                      <div key={g.cat}>
                        <div className="preq-group-h">
                          <span className="nm">{g.cat}</span>
                          <span className="ln" />
                          <span className="mini"><span style={{ width: Math.round(got / g.items.length * 100) + '%' }} /></span>
                          <span className="tiny muted mono">{got}/{g.items.length}</span>
                        </div>
                        {g.items.map((r: any) => {
                          const IconC = (I as any)[(PBC_CATICON as any)[r.cat]] || I.doc;
                          const late = r.status === 'Terlambat';
                          return (
                            <div key={r.id} className={'preq p-' + r.priority + (r.id === (sel && sel.id) ? ' sel' : '')} onClick={() => setSelId(r.id)}>
                              <span className="preq-ico"><IconC size={15} /></span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="preq-title truncate">{r.item}</div>
                                <div className="preq-meta">
                                  <span className="denv-tag"><I.clock size={11} style={{ color: late ? 'var(--red)' : 'var(--ink-4)' }} /><span style={{ color: late ? 'var(--red)' : 'var(--ink-3)' }}>{fmtDS(r.due)}</span></span>
                                  <span className="denv-tag mono" title={'Tertaut WP ' + linkFor(r).wp}><I.layers size={11} /> WP {linkFor(r).wp}</span>
                                  {r.thread.length > 0 && <span className="denv-tag"><I.mail size={11} /> {r.thread.length}</span>}
                                </div>
                              </div>
                              <Badge kind={(PBC_STAT as any)[r.status]}>{r.status}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                <div className="pdms-detail">
                  {sel ? <ReqDetail r={sel} persona={persona} onUpload={openUpload} onReview={onReview} onRevise={onRevise} onRemind={onRemind} onComment={onComment} />
                    : <div className="panel" style={{ padding: 30, textAlign: 'center', color: 'var(--ink-4)' }}>Pilih item untuk melihat detail.</div>}
                </div>
              </div>
            </div>
          )}

          {tab === 'coverage' && <CoveragePanel reqs={engReqs} today={today} />}

          {tab === 'chat' && (
            <div style={{ padding: 14 }}>
              <div className="row ac gap8" style={{ marginBottom: 10 }}>
                <span className="chip tiny"><I.lock size={10} /> Terenkripsi end-to-end</span>
                <span className="tiny muted">Kanal langsung KAP ⇄ {persona === 'client' ? 'Anda' : clientName}</span>
              </div>
              <div className="panel" style={{ padding: 12 }}>
                <PThread msgs={msgs.map((m: any) => ({ by: m.from, side: m.side, text: m.text, time: m.time }))} selfSide={persona} height={'calc(100vh - 430px)'} onSend={sendChat} placeholder="Tulis pesan aman…" />
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div style={{ padding: 16, maxWidth: 720 }}>
              <div className="ptl">
                {allEvents.map((x: any, i: any) => {
                  const meta = (PEVT as any)[x.e[0]] || { ic: 'circle', c: 'var(--ink-4)' };
                  const IconC = (I as any)[meta.ic] || I.circle;
                  return (
                    <div key={i} className="ptl-row">
                      <div className="ptl-mark" style={{ color: meta.c, borderColor: meta.c }}><IconC size={11} /></div>
                      <div className="ptl-body">
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{x.e[3]} <span className="muted" style={{ fontWeight: 500 }}>— {x.item}</span></div>
                        <div className="tiny muted">{x.e[1]} · <span className="mono">{x.e[2]}</span> · <span className="mono">{x.id}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Panel>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Portal klien menyediakan kanal aman pertukaran dokumen audit (PBC) dengan riwayat versi & jejak audit penuh. Identitas perikatan ditarik dari sumber kebenaran tunggal; berkas yang diterima otomatis tertaut ke modul area & kertas kerja, serta terarsip di DMS dengan klasifikasi kerahasiaan.</div>
      </div></div>
      {showAdd && <AddRequestModal onClose={() => setShowAdd(false)} onAdd={onAdd} nextNo={engReqs.length + 1} staff={staff} engId={engId} clientName={clientName} />}
      {uploadReq && <PBCUploadModal req={uploadReq} persona={persona} onClose={() => setUploadReq(null)} onConfirm={(metas: any) => doUpload(uploadReq.id, metas)} />}
    </>
  );
}

Object.assign(window, { ClientPortal });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ClientPortal };
