/* [codemod] ESM imports */
import React from 'react';
import { useAmsPersist, useFirm } from './contexts';
import { FileDropField } from './evidence';
import { I } from './icons';
import { SACanonChips, SACanonicalStatus, SASignoffMini } from './sa_canonical';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Seg, Tabs } from './ui';
import { KvBox } from './view_analytical';

/* ============================================================
   Asseris — SA 720 · Tanggung Jawab Auditor atas Informasi Lain

   F2/PR-D (PRD 2026-07-19) — dari display-only → kertas kerja
   TERSIMPAN (server StateDoc `oi720.v1`, engagement-scope,
   isolasi W7.5). Register dokumen info-lain dapat di-CRUD:
   nama, waktu diperoleh (sebelum/sesudah tgl laporan), flag
   diperoleh, temuan konsistensi (konsisten / inkonsisten-LK /
   inkonsisten-pengetahuan / salah-saji-material), disposisi &
   catatan telaah + lampiran dokumen (byte NYATA via Attachment
   F0.1). Bagian "Informasi Lain" laporan DITURUNKAN dari temuan
   (kesimpulan berubah bila ada salah saji tak-terselesaikan).
   Sign-off PALSU (nama staf + status hardcode) → sign-off NYATA
   WP kanonik (SASignoffMini stdId=sa720 → SA_WP_MAP 900).
   ============================================================ */
const { useState: useState720 } = React;

/* ---- Bentuk kertas kerja tersimpan (oi720.v1) ---- */
type OiTiming = 'before' | 'after';
type OiConsistency = 'consistent' | 'inconsistent-fs' | 'inconsistent-knowledge' | 'misstatement' | 'pending';
interface OiDoc {
  id: string; name: string; timing: OiTiming; got: boolean; consistency: OiConsistency;
  disposition: string; note: string;
  attachmentId: string; attachmentName: string; attachmentSha: string; attachmentSizeMB: number;
}
interface Oi720Doc { docs: OiDoc[] }
type SetOi = (updater: (d: Oi720Doc) => Oi720Doc) => void;
type DropMeta = { name: string; ok: boolean; sizeMB: number; sha256: string; file?: File };

const CONS_META: Record<OiConsistency, { label: string; k: string }> = {
  consistent: { label: 'Konsisten', k: 'green' },
  'inconsistent-fs': { label: 'Inkonsisten dg LK', k: 'amber' },
  'inconsistent-knowledge': { label: 'Inkonsisten dg pengetahuan', k: 'amber' },
  misstatement: { label: 'Salah saji material', k: 'red' },
  pending: { label: 'Menunggu', k: 'gray' },
};
const NO_ATTACH = { attachmentId: '', attachmentName: '', attachmentSha: '', attachmentSizeMB: 0 };

function seedOi720(): Oi720Doc {
  return { docs: [
    { id: 'OI-1', name: 'Ikhtisar Data Keuangan Penting', timing: 'before', got: true, consistency: 'consistent', disposition: '', note: 'Angka 5-tahun cocok ke LK auditan; tidak ada inkonsistensi.', ...NO_ATTACH },
    { id: 'OI-2', name: 'Laporan Direksi & Analisis Manajemen (MD&A)', timing: 'before', got: true, consistency: 'inconsistent-fs', disposition: 'Manajemen mengoreksi narasi pertumbuhan pendapatan (14% → 12,3%).', note: 'Pertumbuhan pendapatan tertulis 14% — LK menunjukkan 12,3%.', ...NO_ATTACH },
    { id: 'OI-3', name: 'Laporan Dewan Komisaris', timing: 'before', got: true, consistency: 'consistent', disposition: '', note: 'Pernyataan tata kelola selaras dengan pengetahuan auditor.', ...NO_ATTACH },
    { id: 'OI-4', name: 'Laporan Keberlanjutan (ESG)', timing: 'before', got: true, consistency: 'consistent', disposition: '', note: 'Data emisi non-keuangan; tidak ada angka keuangan yang bertentangan dengan LK.', ...NO_ATTACH },
    { id: 'OI-5', name: 'Laporan Tata Kelola Perusahaan (GCG)', timing: 'after', got: false, consistency: 'pending', disposition: '', note: 'Akan diterima setelah tanggal laporan; prosedur dilakukan saat tersedia (¶ A52).', ...NO_ATTACH },
  ] };
}

const TIMING_LABEL: Record<OiTiming, string> = { before: 'Sebelum tgl laporan', after: 'Setelah tgl laporan' };

/* ============================================================ */
function SA720View() {
  const firm = useFirm();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const engId = firm?.activeEngagement?.id || 'ENG-2025-014';
  const [tab, setTab] = useState720('lingkup');
  const [selId, setSelId] = useState720('OI-2');
  /* engagement-scope (AMS_PERSIST_SCOPE: 'oi720.v1' → engagement) — isolasi W7.5. */
  const [doc, setDoc] = useAmsPersist('oi720.v1', seedOi720) as [Oi720Doc, SetOi];
  const docs = doc.docs || [];
  const sel = docs.find(d => d.id === selId) || docs[0];

  const setOi = (id: string, patch: Partial<OiDoc>) => setDoc(d => ({ ...d, docs: d.docs.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const addOi = () => {
    const maxN = docs.reduce((m, x) => Math.max(m, parseInt(x.id.replace(/\D/g, ''), 10) || 0), 0);
    const id = 'OI-' + (maxN + 1);
    setDoc(d => ({ ...d, docs: [...d.docs, { id, name: 'Dokumen informasi lain baru', timing: 'before', got: false, consistency: 'pending', disposition: '', note: '', ...NO_ATTACH }] }));
    setSelId(id);
  };
  const removeOi = (id: string) => { setDoc(d => ({ ...d, docs: d.docs.filter(x => x.id !== id) })); if (selId === id) setSelId('OI-1'); };

  const onFiles = (id: string) => async (metas: DropMeta[]) => {
    const m = metas.find(x => x.ok);
    if (!m) return;
    let attachmentId = ''; let sha = m.sha256; let size = m.sizeMB;
    if (m.file && window.amsAttachmentUpload) {
      try {
        const up = await window.amsAttachmentUpload({ scope: 'engagement', scopeId: engId, collection: 'sa720', refId: id, meta: { file: m.file, name: m.name, sha256: m.sha256 } });
        attachmentId = up.id; sha = up.sha256; size = +(up.size / 1048576).toFixed(1);
      } catch (e) { /* server absen / ditolak: metadata-only */ }
    }
    setOi(id, { attachmentId, attachmentName: m.name, attachmentSha: sha, attachmentSizeMB: size });
  };
  const removeAttach = async (id: string, attId: string) => {
    if (attId && window.amsAttachmentRemove) { try { await window.amsAttachmentRemove(attId); } catch (e) { /* abaikan */ } }
    setOi(id, { ...NO_ATTACH });
  };

  const gotCount = docs.filter(d => d.got).length;
  const misCount = docs.filter(d => d.consistency === 'misstatement').length;
  const inconsCount = docs.filter(d => d.consistency === 'inconsistent-fs' || d.consistency === 'inconsistent-knowledge').length;

  const tabs = [
    { id: 'lingkup', label: 'Lingkup Informasi Lain' },
    { id: 'telaah', label: 'Telaah Inkonsistensi' },
    { id: 'respons', label: 'Respons & Pelaporan' },
    { id: 'status', label: 'Status & Komunikasi' },
  ];

  return (
    <>
      <SubBar moduleId="sa720" right={
        <div className="row gap8 ac">
          <SACanonChips stdId="sa720" />
          {misCount > 0 && <Badge kind="red" dot>{misCount} salah saji material</Badge>}
          <Badge kind={misCount ? 'red' : inconsCount ? 'amber' : 'green'} dot>{inconsCount} inkonsistensi</Badge>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 720</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Informasi Lain</div>
              <div className="tiny muted">{client} · Laporan Tahunan · {engId}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Komponen Info Lain</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{docs.length} dokumen</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Diperoleh</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{gotCount} dari {docs.length}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Kesalahan Penyajian</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: misCount ? 'var(--red)' : 'var(--green)' }}>{misCount ? `${misCount} tak terselesaikan` : 'Nihil'}</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Bagian Laporan</div>
              <Badge kind="blue" dot>"Informasi Lain" (¶21–24)</Badge>
            </div>
          </div>
        </Panel>

        <SACanonicalStatus stdId="sa720" />

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'lingkup' && <F720Scope docs={docs} selId={selId} setSelId={setSelId} setOi={setOi} addOi={addOi} removeOi={removeOi} />}
        {tab === 'telaah' && <F720Review docs={docs} sel={sel} selId={selId} setSelId={setSelId} setOi={setOi} onFiles={onFiles} removeAttach={removeAttach} />}
        {tab === 'respons' && <F720Response docs={docs} misCount={misCount} />}
        {tab === 'status' && <F720Status docs={docs} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Lingkup (register CRUD + identitas dokumen) ---------------- */
function F720Scope({ docs, selId, setSelId, setOi, addOi, removeOi }: { docs: OiDoc[]; selId: string; setSelId: (id: string) => void; setOi: (id: string, p: Partial<OiDoc>) => void; addOi: () => void; removeOi: (id: string) => void }) {
  const sel = docs.find(d => d.id === selId) || docs[0];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Komponen Informasi Lain dalam Laporan Tahunan (¶12)</h3><div style={{ flex: 1 }} /><Btn sm onClick={addOi}><I.plus size={13} /> Tambah Dokumen</Btn></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 50 }}>Ref</th><th>Dokumen</th><th style={{ width: 150 }}>Waktu Diperoleh</th><th style={{ width: 80 }}>Status</th></tr></thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.id} className={d.id === selId ? 'sel' : ''} onClick={() => setSelId(d.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                <td style={{ fontWeight: 600 }}>{d.name}</td>
                <td className="tiny">{TIMING_LABEL[d.timing]}</td>
                <td>{d.got ? <Badge kind="green">Diperoleh</Badge> : <Badge kind="gray">Menunggu</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Informasi lain adalah informasi <b>keuangan & non-keuangan</b> dalam laporan tahunan, <b>selain</b> laporan keuangan & laporan auditor. <b>Tidak termasuk:</b> prospektus, siaran pers, atau materi tata kelola berdiri sendiri di luar laporan tahunan (¶ A8–A10).</span>
          </div>
        </div>
      </Panel>

      {sel ? (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
            <div className="row jb ac">
              <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span>
              {docs.length > 1 && <button className="btn sm icon" title="Hapus dokumen" style={{ height: 24, width: 24, color: 'var(--red)' }} onClick={() => removeOi(sel.id)}><I.trash size={13} /></button>}
            </div>
          </div>
          <div style={{ padding: 14, display: 'grid', gap: 11 }}>
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Nama Dokumen</div>
              <input className="input" style={{ width: '100%' }} value={sel.name} onChange={(e: { target: { value: string } }) => setOi(sel.id, { name: e.target.value })} />
            </div>
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 5 }}>Waktu Diperoleh</div>
              <Seg options={[{ value: 'before', label: 'Sebelum tgl laporan' }, { value: 'after', label: 'Setelah tgl laporan' }]} value={sel.timing} onChange={(v: OiTiming) => setOi(sel.id, { timing: v })} />
              <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.4 }}>Dokumen yang diperoleh setelah tanggal laporan dibaca saat tersedia (¶ A52).</div>
            </div>
            <label className="row gap8 ac" style={{ cursor: 'pointer', fontSize: 12 }}>
              <input type="checkbox" checked={sel.got} onChange={(e: { target: { checked: boolean } }) => setOi(sel.id, { got: e.target.checked, consistency: e.target.checked && sel.consistency === 'pending' ? 'consistent' : sel.consistency })} />
              <span style={{ fontWeight: 600 }}>Dokumen telah diperoleh & dibaca</span>
            </label>
          </div>
        </Panel>
      ) : (
        <Panel><div className="ev-empty">Tidak ada dokumen. Tambah dokumen informasi lain.</div></Panel>
      )}
    </div>
  );
}

/* ---------------- Tab: Telaah Inkonsistensi (temuan + disposisi + catatan + lampiran) ---------------- */
function F720Review({ docs, sel, selId, setSelId, setOi, onFiles, removeAttach }: { docs: OiDoc[]; sel: OiDoc | undefined; selId: string; setSelId: (id: string) => void; setOi: (id: string, p: Partial<OiDoc>) => void; onFiles: (id: string) => (m: DropMeta[]) => void; removeAttach: (id: string, attId: string) => void }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Hasil Telaah per Dokumen (¶14–15)</h3><div style={{ flex: 1 }} /><span className="tiny muted">Klik untuk sunting</span></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 50 }}>Ref</th><th>Dokumen</th><th style={{ width: 180 }}>Hasil Telaah</th></tr></thead>
          <tbody>
            {docs.map(d => {
              const cm = CONS_META[d.consistency];
              return (
                <tr key={d.id} className={d.id === selId ? 'sel' : ''} onClick={() => setSelId(d.id)} style={{ cursor: 'pointer' }}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                  <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{d.name}{d.attachmentName ? <span className="tiny muted"> · lampiran</span> : ''}</td>
                  <td><Badge kind={cm.k}>{cm.label}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.search2 size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Telaah dua arah: (a) konsistensi dengan <b>laporan keuangan</b>, dan (b) konsistensi dengan <b>pengetahuan auditor</b> yang diperoleh selama audit (¶14).</span>
          </div>
        </div>
      </Panel>

      {sel ? (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={CONS_META[sel.consistency].k}>{CONS_META[sel.consistency].label}</Badge></div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{sel.name}</div>
          </div>
          <div style={{ padding: 14, display: 'grid', gap: 11 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KvBox label="Diperoleh" v={sel.got ? 'Ya' : 'Menunggu'} accent={sel.got ? 'var(--green)' : 'var(--amber)'} />
              <KvBox label="Waktu" v={sel.timing === 'before' ? 'Sblm tgl lap.' : 'Stlh tgl lap.'} />
            </div>
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 5 }}>Hasil Telaah Konsistensi (¶14–16)</div>
              <Seg
                options={[{ value: 'consistent', label: 'Konsisten' }, { value: 'inconsistent-fs', label: 'Inkons. LK' }, { value: 'inconsistent-knowledge', label: 'Inkons. Pengetahuan' }, { value: 'misstatement', label: 'Salah Saji' }]}
                value={sel.consistency === 'pending' ? 'consistent' : sel.consistency}
                onChange={(v: OiConsistency) => setOi(sel.id, { consistency: v })}
              />
            </div>
            {sel.consistency !== 'consistent' && sel.consistency !== 'pending' && (
              <div>
                <div className="tiny muted upper" style={{ marginBottom: 4 }}>Disposisi / Resolusi</div>
                <input className="input" style={{ width: '100%' }} placeholder="mis. Manajemen mengoreksi narasi; atau eskalasi TCWG" value={sel.disposition} onChange={(e: { target: { value: string } }) => setOi(sel.id, { disposition: e.target.value })} />
              </div>
            )}
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Catatan Telaah</div>
              <textarea className="input" value={sel.note} placeholder="Catat bukti telaah & pertimbangan." onChange={(e: { target: { value: string } }) => setOi(sel.id, { note: e.target.value })} style={{ width: '100%', height: 60, padding: 8, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)' }} />
            </div>
            {sel.consistency === 'misstatement' && !sel.disposition.trim() && (
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent' }}>
                <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Salah saji material <b>belum terselesaikan</b> → bila manajemen menolak revisi, laporan auditor memuat pernyataan dalam bagian Informasi Lain (¶18).</span></div>
              </div>
            )}
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 6 }}>Lampiran Dokumen</div>
              {sel.attachmentId || sel.attachmentName ? (
                <div className="panel" style={{ padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'transparent', marginBottom: 8 }}>
                  <div className="row jb ac">
                    <div className="row gap8 ac" style={{ minWidth: 0 }}>
                      <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.link2 size={15} /></span>
                      <div style={{ minWidth: 0 }}>
                        <div className="tiny truncate" style={{ fontWeight: 600 }}>{sel.attachmentName}</div>
                        <div className="tiny muted mono">{sel.attachmentSizeMB ? sel.attachmentSizeMB + ' MB · ' : ''}SHA-256 {String(sel.attachmentSha || '').slice(0, 10)}…</div>
                      </div>
                    </div>
                    <div className="row gap8 ac" style={{ flex: '0 0 auto' }}>
                      {sel.attachmentId
                        ? <button className="btn sm icon" title="Unduh berkas" style={{ height: 26, width: 26 }} onClick={() => { if (sel.attachmentId && window.amsAttachmentSave) window.amsAttachmentSave(sel.attachmentId); }}><I.download size={13} /></button>
                        : <span title="Byte belum tersimpan (metadata saja)" style={{ color: 'var(--amber)' }}><I.alert size={14} /></span>}
                      <button className="btn sm icon" title="Hapus lampiran" style={{ height: 26, width: 26, color: 'var(--red)' }} onClick={() => removeAttach(sel.id, sel.attachmentId)}><I.trash size={13} /></button>
                    </div>
                  </div>
                </div>
              ) : null}
              {typeof FileDropField !== 'undefined'
                ? <FileDropField compact multiple={false} hint="Dokumen informasi lain · PDF/DOCX · maks 25 MB" onFiles={onFiles(sel.id)} />
                : null}
            </div>
          </div>
        </Panel>
      ) : (
        <Panel><div className="ev-empty">Pilih dokumen untuk menelaah.</div></Panel>
      )}
    </div>
  );
}

/* ---------------- Tab: Respons & Pelaporan (paragraf laporan DITURUNKAN dari temuan) ---------------- */
function F720Response({ docs, misCount }: { docs: OiDoc[]; misCount: number }) {
  const unresolved = docs.filter(d => d.consistency === 'misstatement' && !d.disposition.trim());
  const corrected = docs.filter(d => (d.consistency === 'inconsistent-fs' || d.consistency === 'inconsistent-knowledge' || d.consistency === 'misstatement') && d.disposition.trim());
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Alur Respons atas Kesalahan Penyajian Material (¶16–18)</h3><div style={{ flex: 1 }} /></div>
        <div style={{ padding: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[
              { n: 1, t: 'Identifikasi inkonsistensi material', d: 'Pada informasi lain ATAU pada LK.', k: 'blue' },
              { n: 2, t: 'Diskusi dengan manajemen', d: 'Tentukan apakah informasi lain atau LK yang perlu direvisi.', k: 'blue' },
              { n: 3, t: 'Manajemen merevisi?', d: 'Bila ya → selesai. Bila menolak → eskalasi.', k: 'amber' },
              { n: 4, t: 'Komunikasi TCWG & tindakan lain', d: 'Pertimbangkan implikasi hukum / penarikan diri.', k: 'red' },
            ].map((s, i) => (
              <div key={i} className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', background: `var(--${s.k}-bg)`, borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="row ac gap8"><span className="mono" style={{ width: 22, height: 22, borderRadius: 6, background: `var(--${s.k})`, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11 }}>{s.n}</span><span style={{ fontSize: 12, fontWeight: 700 }}>{s.t}</span></div>
                </div>
                <div style={{ padding: '10px 12px' }}><div className="tiny muted" style={{ lineHeight: 1.45 }}>{s.d}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel" style={{ margin: 16, padding: '11px 13px', background: unresolved.length ? 'var(--red-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: unresolved.length ? 'var(--red)' : 'var(--green)', flex: '0 0 auto' }}>{unresolved.length ? <I.alert size={15} /> : <I.checkCircle size={15} />}</span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              {unresolved.length
                ? <><b>{unresolved.length} kesalahan penyajian material belum terselesaikan</b> ({unresolved.map(d => d.id).join(', ')}) — laporan auditor <b>memuat pernyataan</b> dalam bagian Informasi Lain (¶18).</>
                : corrected.length
                  ? <>{corrected.length} inkonsistensi <b>telah dikoreksi</b> manajemen ({corrected.map(d => d.id).join(', ')}). Tidak ada kesalahan penyajian material tak terselesaikan — laporan auditor <b>tidak dimodifikasi</b>.</>
                  : <>Tidak ada inkonsistensi material teridentifikasi — laporan auditor <b>tidak dimodifikasi</b>.</>}
            </span>
          </div>
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Draf Bagian "Informasi Lain" — Laporan Auditor (¶22–24)</h3><div style={{ flex: 1 }} /><Badge kind={unresolved.length ? 'red' : 'blue'}>{unresolved.length ? 'Memuat pernyataan' : 'Kesimpulan standar'}</Badge></div>
        <div style={{ padding: 20 }}>
          <div style={{ maxWidth: 660, margin: '0 auto', fontSize: 12.5, lineHeight: 1.65 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 6 }}>Informasi Lain</div>
            <p style={{ margin: '0 0 10px', color: 'var(--ink-2)' }}>Manajemen bertanggung jawab atas informasi lain. Informasi lain terdiri dari informasi yang tercakup dalam laporan tahunan, tetapi tidak mencakup laporan keuangan dan laporan auditor kami atasnya.</p>
            <p style={{ margin: '0 0 10px', color: 'var(--ink-2)' }}>Opini kami atas laporan keuangan tidak mencakup informasi lain tersebut, dan kami tidak menyatakan suatu bentuk kesimpulan asurans apa pun atasnya.</p>
            <p style={{ margin: 0, color: 'var(--ink-2)' }}>
              Dalam kaitannya dengan audit kami atas laporan keuangan, tanggung jawab kami adalah membaca informasi lain dan mempertimbangkan apakah terdapat inkonsistensi material dengan laporan keuangan atau dengan pengetahuan yang kami peroleh dalam audit, atau tampak terdapat kesalahan penyajian material.{' '}
              {unresolved.length
                ? <b style={{ color: 'var(--red)' }}>Berdasarkan pekerjaan yang telah kami lakukan, kami menyimpulkan bahwa terdapat kesalahan penyajian material atas informasi lain ini. Hal ini kami uraikan sebagai berikut: {unresolved.map(d => d.name).join('; ')}.</b>
                : 'Berdasarkan pekerjaan yang telah kami lakukan, kami menyimpulkan bahwa tidak terdapat kesalahan penyajian material atas informasi lain ini yang harus kami laporkan.'}
            </p>
          </div>
        </div>
        <div className="panel" style={{ margin: 16, padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
          <div className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.book size={14} /></span><span className="tiny muted" style={{ lineHeight: 1.4 }}>Kesimpulan paragraf diturunkan dari temuan telaah ({misCount} salah saji material). Bagian ini juga tercermin di Generator Opini (Informasi Lain).</span></div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Status & Komunikasi (derived + sign-off nyata) ---------------- */
function F720Status({ docs }: { docs: OiDoc[] }) {
  const afterDocs = docs.filter(d => d.timing === 'after');
  const pendingAfter = afterDocs.filter(d => !d.got);
  const inconsAny = docs.some(d => d.consistency === 'inconsistent-fs' || d.consistency === 'inconsistent-knowledge' || d.consistency === 'misstatement');
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Informasi Lain Diperoleh Setelah Tanggal Laporan (¶ A52)</h3><div style={{ flex: 1 }} /><Badge kind={pendingAfter.length ? 'amber' : 'green'}>{pendingAfter.length} menunggu</Badge></div>
          <div style={{ padding: 14 }}>
            {afterDocs.length === 0 && <div className="ev-empty">Tidak ada dokumen yang dijadwalkan setelah tanggal laporan.</div>}
            {afterDocs.map(d => (
              <div key={d.id} className="row gap10" style={{ alignItems: 'center', padding: '11px 13px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 8 }}>
                <span style={{ color: d.got ? 'var(--green)' : 'var(--amber)' }}>{d.got ? <I.checkCircle size={18} /> : <I.clock size={18} />}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{d.id} · {d.name}</div>
                  <div className="tiny muted">{d.got ? 'Telah dibaca; prosedur konsistensi selesai.' : 'Dijadwalkan terbit dengan laporan tahunan — prosedur pembacaan tertunda.'}</div>
                </div>
                <Badge kind={d.got ? 'green' : 'amber'}>{d.got ? 'Selesai' : 'Tindak lanjut'}</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Komunikasi & Representasi">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              { t: 'Inkonsistensi material dikomunikasikan ke TCWG', ok: !inconsAny || docs.some(d => (d.consistency === 'inconsistent-fs' || d.consistency === 'inconsistent-knowledge' || d.consistency === 'misstatement') && d.disposition.trim()) },
              { t: 'Representasi tertulis info lain (SA 580)', ok: true },
              { t: 'Pernyataan komponen laporan tahunan dari manajemen', ok: true },
              { t: 'Prosedur dokumen pasca tanggal laporan', ok: pendingAfter.length === 0 },
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: r.ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}>{r.ok ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span>
                <span style={{ lineHeight: 1.4 }}>{r.t}</span>
              </div>
            ))}
          </div>
        </Panel>
        <SASignoffMini stdId="sa720" />
      </div>
    </div>
  );
}

Object.assign(window, { SA720View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA720View };
