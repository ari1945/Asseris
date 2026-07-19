/* [codemod] ESM imports */
import React from 'react';
import { useFirm, useAmsPersist } from './contexts';
import { FileDropField } from './evidence';
import { I } from './icons';
import { SACanonChips, SACanonicalStatus, SASignoffMini } from './sa_canonical';
import { SubBar } from './shell';
import { Badge, Panel, Seg, Stat, Tabs } from './ui';

/* ============================================================
   Asseris — SA 580 · Representasi Tertulis
   Deep workpaper: daftar representasi wajib & spesifik (peta
   ke SA lain), draf surat representasi, serta evaluasi
   keandalan, kontradiksi bukti, & dampak pada opini.

   F2/PR-C (PRD 2026-07-19) — dari display-only → kertas kerja
   TERSIMPAN (server StateDoc `rep580.v1`, engagement-scope,
   isolasi W7.5). Per-representasi editable: status perolehan
   (diminta/diterima/N-A), tanggal diterima, teks pengecualian,
   flag penolakan manajemen (¶20). Metadata surat (tanggal,
   penanda tangan) + lampiran surat bertandatangan (byte NYATA
   via Attachment F0.1). Evaluasi keandalan ¶18–20 diturunkan
   dari status tersimpan (bukan hardcode).
   ============================================================ */
const { useState: useState580 } = React;

/* ---- Katalog representasi (statis: peta ke standar). Status/tanggal/
   pengecualian/penolakan hidup di `rep580.v1`, bukan di sini. `got` = seed awal. ---- */
const REP_ITEMS = [
  { id: 'R-01', cat: 'Wajib', src: 'SA 580 ¶10', t: 'Manajemen telah memenuhi tanggung jawabnya atas penyusunan LK sesuai kerangka pelaporan, termasuk penyajian wajar.', got: true },
  { id: 'R-02', cat: 'Wajib', src: 'SA 580 ¶11', t: 'Seluruh informasi & akses yang relevan telah diberikan; seluruh transaksi telah dicatat & tercermin dalam LK.', got: true },
  { id: 'R-03', cat: 'Spesifik', src: 'SA 240 ¶39', t: 'Manajemen mengakui tanggung jawab atas desain & implementasi kontrol untuk mencegah/mendeteksi fraud; telah mengungkapkan hasil penilaian risiko fraud & dugaan fraud.', got: true },
  { id: 'R-04', cat: 'Spesifik', src: 'SA 250 ¶16', t: 'Seluruh instansi ketidakpatuhan/dugaan ketidakpatuhan terhadap peraturan perundang-undangan yang diketahui telah diungkapkan.', got: true },
  { id: 'R-05', cat: 'Spesifik', src: 'SA 450 ¶14', t: 'Dampak salah saji tidak dikoreksi tidak material, baik individual maupun agregat (daftar dilampirkan).', got: true },
  { id: 'R-06', cat: 'Spesifik', src: 'SA 540 ¶37', t: 'Metode, data & asumsi signifikan yang dipakai dalam membuat estimasi akuntansi adalah wajar.', got: true },
  { id: 'R-07', cat: 'Spesifik', src: 'SA 550 ¶26', t: 'Identitas pihak berelasi & seluruh transaksi/saldo dengan pihak berelasi telah diungkapkan secara memadai.', got: true },
  { id: 'R-08', cat: 'Spesifik', src: 'SA 560 ¶9', t: 'Seluruh peristiwa setelah tanggal LK yang memerlukan penyesuaian/pengungkapan telah disesuaikan/diungkapkan.', got: true },
  { id: 'R-09', cat: 'Spesifik', src: 'SA 570 ¶16', t: 'Rencana tindakan masa depan terkait kelangsungan usaha & kelayakannya telah diungkapkan kepada auditor.', got: false },
  { id: 'R-10', cat: 'Spesifik', src: 'SA 501 / 720', t: 'Litigasi & klaim telah diungkapkan; informasi lain dalam laporan tahunan konsisten dengan LK.', got: true },
];

/* ---- Bentuk kertas kerja tersimpan (rep580.v1) ---- */
type RepStatus = 'requested' | 'received' | 'na';
interface RepItemState { status: RepStatus; receivedDate: string; exception: string; refused: boolean }
interface LetterState {
  date: string; signatory1: string; signatory2: string;
  attachmentId: string; attachmentName: string; attachmentSha: string; attachmentSizeMB: number;
}
interface Rep580Doc { items: Record<string, RepItemState>; letter: LetterState }
type SetDoc = (updater: (d: Rep580Doc) => Rep580Doc) => void;
type SetItem = (id: string, patch: Partial<RepItemState>) => void;
type PatchLetter = (patch: Partial<LetterState>) => void;
type DropMeta = { name: string; ok: boolean; sizeMB: number; sha256: string; file?: File };

function seedRep580(): Rep580Doc {
  const items: Record<string, RepItemState> = {};
  REP_ITEMS.forEach(r => { items[r.id] = { status: r.got ? 'received' : 'requested', receivedDate: r.got ? '2026-03-14' : '', exception: '', refused: false }; });
  return { items, letter: { date: '2026-03-14', signatory1: 'Direktur Utama', signatory2: 'Direktur Keuangan', attachmentId: '', attachmentName: '', attachmentSha: '', attachmentSizeMB: 0 } };
}
const EMPTY_ITEM: RepItemState = { status: 'requested', receivedDate: '', exception: '', refused: false };

/* ============================================================ */
function SA580View() {
  const firm = useFirm();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const engId = firm?.activeEngagement?.id || 'ENG-2025-014';
  const [tab, setTab] = useState580('daftar');
  /* engagement-scope (AMS_PERSIST_SCOPE: 'rep580.v1' → engagement) — isolasi W7.5,
     capForWrite=WP_EDIT. Seed = REP_ITEMS.got + metadata surat default. */
  const [doc, setDoc] = useAmsPersist('rep580.v1', seedRep580) as [Rep580Doc, SetDoc];

  const setItem: SetItem = (id, patch) => setDoc(d => ({ ...d, items: { ...d.items, [id]: { ...(d.items[id] || EMPTY_ITEM), ...patch } } }));
  const patchLetter: PatchLetter = (patch) => setDoc(d => ({ ...d, letter: { ...d.letter, ...patch } }));

  const stOf = (id: string): RepItemState => doc.items[id] || EMPTY_ITEM;
  const received = REP_ITEMS.filter(r => stOf(r.id).status === 'received').length;
  const refusedCount = REP_ITEMS.filter(r => stOf(r.id).refused).length;
  const applicable = REP_ITEMS.filter(r => stOf(r.id).status !== 'na').length;

  /* unggah surat bertandatangan → byte NYATA + SHA-256 (Attachment F0.1). Degradasi
     anggun bila server absen: simpan metadata (nama/sha/ukuran) tanpa attachmentId. */
  const onLetterFiles = async (metas: DropMeta[]) => {
    const m = metas.find(x => x.ok);
    if (!m) return;
    let attachmentId = ''; let sha = m.sha256; let size = m.sizeMB;
    if (m.file && window.amsAttachmentUpload) {
      try {
        const up = await window.amsAttachmentUpload({
          scope: 'engagement', scopeId: engId, collection: 'sa580', refId: 'rep-letter',
          meta: { file: m.file, name: m.name, sha256: m.sha256 }, retentionClass: 'SA230/10y',
        });
        attachmentId = up.id; sha = up.sha256; size = +(up.size / 1048576).toFixed(1);
      } catch (e) { /* server absen / ditolak: metadata-only */ }
    }
    patchLetter({ attachmentId, attachmentName: m.name, attachmentSha: sha, attachmentSizeMB: size });
  };
  const removeLetter = async () => {
    const id = doc.letter.attachmentId;
    if (id && window.amsAttachmentRemove) { try { await window.amsAttachmentRemove(id); } catch (e) { /* abaikan */ } }
    patchLetter({ attachmentId: '', attachmentName: '', attachmentSha: '', attachmentSizeMB: 0 });
  };

  const allObtained = received === applicable && refusedCount === 0;
  const tabs = [
    { id: 'daftar', label: 'Daftar Representasi' },
    { id: 'surat', label: 'Surat Representasi' },
    { id: 'keandalan', label: 'Keandalan & Dampak' },
  ];

  return (
    <>
      <SubBar moduleId="sa580" right={
        <div className="row gap8 ac">
          <SACanonChips stdId="sa580" />
          {refusedCount > 0 && <Badge kind="red" dot>{refusedCount} penolakan (¶20)</Badge>}
          <Badge kind={allObtained ? 'green' : 'amber'} dot>{received}/{applicable} diperoleh</Badge>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 580</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Representasi Tertulis</div>
              <div className="tiny muted">{client} · {engId}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Representasi</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{applicable} berlaku · {received} diperoleh</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Penanda Tangan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{doc.letter.signatory1} & {doc.letter.signatory2}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Tanggal Surat</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--blue)' }}>{doc.letter.date || '—'}</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Surat Bertandatangan</div>
              {doc.letter.attachmentId
                ? <Badge kind="green" dot>Terlampir</Badge>
                : doc.letter.attachmentName
                  ? <Badge kind="amber" dot>Metadata saja</Badge>
                  : <Badge kind="amber" dot>Belum diunggah</Badge>}
            </div>
          </div>
        </Panel>

        <SACanonicalStatus stdId="sa580" />

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'daftar' && <F580List doc={doc} setItem={setItem} received={received} applicable={applicable} />}
        {tab === 'surat' && <F580Letter client={client} doc={doc} patchLetter={patchLetter} onLetterFiles={onLetterFiles} removeLetter={removeLetter} />}
        {tab === 'keandalan' && <F580Reliability doc={doc} refusedCount={refusedCount} />}

      </div></div>
    </>
  );
}

/* status → ikon di tabel daftar */
function StatusIcon({ st }: { st: RepItemState }) {
  if (st.refused) return <span title="Ditolak manajemen (¶20)" style={{ color: 'var(--red)' }}><I.alert size={16} /></span>;
  if (st.status === 'received') return <span title="Diterima" style={{ color: 'var(--green)' }}><I.checkCircle size={16} /></span>;
  if (st.status === 'na') return <span title="Tidak berlaku" style={{ color: 'var(--ink-3)' }}><I.x size={16} /></span>;
  return <span title="Diminta" style={{ color: 'var(--amber)' }}><I.clock size={16} /></span>;
}

/* ---------------- Tab: Daftar Representasi ---------------- */
function F580List({ doc, setItem, received, applicable }: { doc: Rep580Doc; setItem: SetItem; received: number; applicable: number }) {
  const [selId, setSelId] = useState580('R-06');
  const catalog = REP_ITEMS.find(r => r.id === selId) || REP_ITEMS[0];
  const sel = doc.items[catalog.id] || EMPTY_ITEM;
  const wajib = REP_ITEMS.filter(r => r.cat === 'Wajib').length;
  const stOf = (id: string): RepItemState => doc.items[id] || EMPTY_ITEM;
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
          {[
            { v: applicable, l: 'Representasi Berlaku' },
            { v: wajib, l: 'Wajib (¶10–11)', a: 'var(--blue)' },
            { v: received, l: 'Diperoleh', a: 'var(--green)' },
            { v: applicable - received, l: 'Belum Diperoleh', a: 'var(--amber)' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '12px 16px', borderRight: i < 3 ? '1px solid var(--line-soft)' : 0 }}><Stat value={s.v} label={s.l} accent={s.a} /></div>
          ))}
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Daftar Representasi & Peta ke Standar</h3><div style={{ flex: 1 }} /><span className="tiny muted">Klik untuk sunting status</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 48 }}>Ref</th><th>Representasi</th><th style={{ width: 92 }}>Kategori</th><th style={{ width: 60 }}>Status</th></tr></thead>
            <tbody>
              {REP_ITEMS.map(r => (
                <tr key={r.id} className={r.id === selId ? 'sel' : ''} onClick={() => setSelId(r.id)} style={{ cursor: 'pointer', opacity: stOf(r.id).status === 'na' ? 0.55 : 1 }}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                  <td style={{ fontWeight: 500, whiteSpace: 'normal', lineHeight: 1.4 }}>{r.t}<div className="tiny muted" style={{ marginTop: 2 }}>{r.src}{stOf(r.id).exception.trim() ? ' · ada pengecualian' : ''}</div></td>
                  <td><Badge kind={r.cat === 'Wajib' ? 'blue' : 'purple'}>{r.cat}</Badge></td>
                  <td><StatusIcon st={stOf(r.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{catalog.id}</span><Badge kind={catalog.cat === 'Wajib' ? 'blue' : 'purple'}>{catalog.cat}</Badge><span className="mono tiny" style={{ color: 'var(--ink-3)' }}>{catalog.src}</span></div>
            <div style={{ fontWeight: 600, fontSize: 12.5, marginTop: 6, lineHeight: 1.45 }}>{catalog.t}</div>
          </div>
          <div style={{ padding: 14, display: 'grid', gap: 12 }}>
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 5 }}>Status Perolehan</div>
              <Seg
                options={[{ value: 'requested', label: 'Diminta' }, { value: 'received', label: 'Diterima' }, { value: 'na', label: 'N/A' }]}
                value={sel.status}
                onChange={(v: RepStatus) => setItem(catalog.id, { status: v, receivedDate: v === 'received' ? (sel.receivedDate || doc.letter.date) : '' })}
              />
            </div>

            {sel.status === 'received' && (
              <div>
                <div className="tiny muted upper" style={{ marginBottom: 4 }}>Tanggal Diterima</div>
                <input type="date" className="input" style={{ width: '100%' }} value={sel.receivedDate} onChange={(e: { target: { value: string } }) => setItem(catalog.id, { receivedDate: e.target.value })} />
              </div>
            )}

            <div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Pengecualian / Kualifikasi Representasi</div>
              <textarea className="input" value={sel.exception} placeholder="Kosongkan bila representasi diberikan tanpa pengecualian. Catat kualifikasi/keberatan manajemen bila ada." onChange={(e: { target: { value: string } }) => setItem(catalog.id, { exception: e.target.value })} style={{ width: '100%', height: 62, padding: 8, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)' }} />
            </div>

            <label className="row gap8 ac" style={{ cursor: 'pointer', fontSize: 11.5 }}>
              <input type="checkbox" checked={sel.refused} onChange={(e: { target: { checked: boolean } }) => setItem(catalog.id, { refused: e.target.checked })} />
              <span style={{ lineHeight: 1.4 }}>Manajemen <b>menolak</b> memberikan representasi ini (¶20 — evaluasi integritas & dampak pada opini).</span>
            </label>

            {sel.refused && (
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent' }}>
                <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Penolakan representasi wajib dapat berujung <b>tidak menyatakan pendapat</b> (¶20, A26). Diskusikan dengan manajemen & TCWG; dokumentasikan pada tab Keandalan & Dampak.</span></div>
              </div>
            )}
            {!sel.refused && sel.status === 'requested' && (
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.clock size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Belum diterima — diperlukan sebelum tanggal laporan auditor.</span></div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Surat Representasi (dokumen) ---------------- */
function F580Letter({ client, doc, patchLetter, onLetterFiles, removeLetter }: { client: string; doc: Rep580Doc; patchLetter: PatchLetter; onLetterFiles: (m: DropMeta[]) => void; removeLetter: () => void }) {
  const L = doc.letter;
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Draf Surat Representasi Manajemen</h3><div style={{ flex: 1 }} /><Badge kind="blue">Kop Surat Klien</Badge></div>
        <div style={{ padding: 22, background: 'var(--surface-1, #fff)' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', fontSize: 12.5, lineHeight: 1.65, color: 'var(--ink)' }}>
            <div className="row jb" style={{ marginBottom: 18, alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{client}</div>
              <div className="tiny muted" style={{ textAlign: 'right' }}>Jl. Industri Raya No. 12<br />Cikarang, Jawa Barat</div>
            </div>
            <div className="tiny muted" style={{ marginBottom: 14 }}>{L.date || '[Tanggal — sama dengan tanggal laporan auditor independen]'}</div>
            <div style={{ marginBottom: 14 }}>Kepada Yth.<br /><b>Kantor Akuntan Publik Wijaya, Pramesti & Rekan</b><br />Auditor Independen</div>
            <p style={{ margin: '0 0 12px' }}>Surat representasi ini diberikan sehubungan dengan audit Saudara atas laporan keuangan {client} untuk tahun yang berakhir 31 Desember 2025, untuk tujuan menyatakan opini apakah laporan keuangan disajikan secara wajar, dalam semua hal yang material, sesuai dengan Standar Akuntansi Keuangan di Indonesia.</p>
            <p style={{ margin: '0 0 8px' }}>Kami menegaskan bahwa, sepanjang pengetahuan dan keyakinan terbaik kami:</p>

            {REP_ITEMS.map(r => {
              const st = doc.items[r.id] || EMPTY_ITEM;
              if (st.status === 'na') return null;
              return (
                <div key={r.id} className="row gap8" style={{ alignItems: 'flex-start', margin: '6px 0' }}>
                  <span style={{ color: st.refused ? 'var(--red)' : 'var(--blue)', flex: '0 0 auto', marginTop: 2 }}>{st.refused ? <I.alert size={14} /> : <I.check size={14} />}</span>
                  <span>
                    {r.t}
                    {st.exception.trim() && <span style={{ color: 'var(--amber)', fontStyle: 'italic' }}> — dengan pengecualian: {st.exception.trim()}</span>}
                    {st.refused && <span style={{ color: 'var(--red)', fontWeight: 600 }}> [manajemen menolak memberikan representasi ini]</span>}
                  </span>
                </div>
              );
            })}

            <div className="row" style={{ gap: 60, marginTop: 26 }}>
              <div><div style={{ borderTop: '1px solid var(--ink-3)', width: 180, paddingTop: 6 }} className="tiny">{L.signatory1}</div></div>
              <div><div style={{ borderTop: '1px solid var(--ink-3)', width: 180, paddingTop: 6 }} className="tiny">{L.signatory2}</div></div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Metadata Surat (¶14–15)">
          <div style={{ display: 'grid', gap: 9 }}>
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Tanggal Surat</div>
              <input type="date" className="input" style={{ width: '100%' }} value={L.date} onChange={(e: { target: { value: string } }) => patchLetter({ date: e.target.value })} />
              <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.4 }}>Sedekat mungkin, namun tidak setelah, tanggal laporan auditor.</div>
            </div>
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Penanda Tangan 1</div>
              <input className="input" style={{ width: '100%' }} placeholder="Direktur Utama" value={L.signatory1} onChange={(e: { target: { value: string } }) => patchLetter({ signatory1: e.target.value })} />
            </div>
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Penanda Tangan 2</div>
              <input className="input" style={{ width: '100%' }} placeholder="Direktur Keuangan" value={L.signatory2} onChange={(e: { target: { value: string } }) => patchLetter({ signatory2: e.target.value })} />
            </div>
          </div>
        </Panel>

        <Panel title="Surat Bertandatangan (Lampiran)">
          {L.attachmentId || L.attachmentName ? (
            <div className="panel" style={{ padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'transparent', marginBottom: 9 }}>
              <div className="row jb ac">
                <div className="row gap8 ac" style={{ minWidth: 0 }}>
                  <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.link2 size={15} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="tiny truncate" style={{ fontWeight: 600 }}>{L.attachmentName}</div>
                    <div className="tiny muted mono">{L.attachmentSizeMB ? L.attachmentSizeMB + ' MB · ' : ''}SHA-256 {String(L.attachmentSha || '').slice(0, 10)}…</div>
                  </div>
                </div>
                <div className="row gap8 ac" style={{ flex: '0 0 auto' }}>
                  {L.attachmentId
                    ? <button className="btn sm icon" title="Unduh berkas" style={{ height: 26, width: 26 }} onClick={() => { if (L.attachmentId && window.amsAttachmentSave) window.amsAttachmentSave(L.attachmentId); }}><I.download size={13} /></button>
                    : <span title="Byte belum tersimpan di server (metadata saja)" style={{ color: 'var(--amber)' }}><I.alert size={14} /></span>}
                  <button className="btn sm icon" title="Hapus lampiran" style={{ height: 26, width: 26, color: 'var(--red)' }} onClick={removeLetter}><I.trash size={13} /></button>
                </div>
              </div>
            </div>
          ) : (
            <div className="tiny muted" style={{ marginBottom: 9, lineHeight: 1.45 }}>Unggah surat representasi yang telah ditandatangani manajemen. Byte disimpan terenkripsi dengan SHA-256 nyata (retensi berkas final SA 230).</div>
          )}
          {typeof FileDropField !== 'undefined'
            ? <FileDropField compact multiple={false} hint="Surat representasi bertandatangan · PDF · maks 25 MB" onFiles={onLetterFiles} />
            : null}
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Keandalan & Dampak ---------------- */
function F580Reliability({ doc, refusedCount }: { doc: Rep580Doc; refusedCount: number }) {
  const stOf = (id: string): RepItemState => doc.items[id] || EMPTY_ITEM;
  const withException = REP_ITEMS.filter(r => stOf(r.id).exception.trim());
  const mandatoryPending = REP_ITEMS.filter(r => r.cat === 'Wajib' && stOf(r.id).status !== 'received');
  const applicable = REP_ITEMS.filter(r => stOf(r.id).status !== 'na');
  const pendingCount = applicable.filter(r => stOf(r.id).status !== 'received').length;

  const scenarios = [
    {
      ic: 'flask', k: 'amber', t: 'Representasi tidak konsisten dengan bukti audit lain (¶18)',
      d: 'Lakukan prosedur untuk menyelesaikan masalah; pertimbangkan ulang keandalan representasi lain & integritas manajemen.',
      ok: withException.length === 0,
      sts: withException.length === 0 ? 'Tidak ada pengecualian tercatat' : `${withException.length} representasi dengan pengecualian: ${withException.map(r => r.id).join(', ')}`,
    },
    {
      ic: 'shield', k: 'red', t: 'Keraguan atas kompetensi, integritas, etika manajemen (¶19)',
      d: 'Tentukan dampaknya terhadap keandalan representasi (lisan/tertulis) & bukti audit secara umum.',
      ok: refusedCount === 0,
      sts: refusedCount === 0 ? 'Integritas manajemen tidak diragukan' : `${refusedCount} penolakan → integritas perlu dievaluasi`,
    },
    {
      ic: 'alert', k: 'red', t: 'Manajemen tidak memberikan representasi yang diminta (¶20)',
      d: 'Diskusikan dengan manajemen; evaluasi integritas & dampak pada opini — dapat berujung tidak menyatakan pendapat (¶20, A26).',
      ok: refusedCount === 0 && mandatoryPending.length === 0,
      sts: refusedCount === 0 && mandatoryPending.length === 0 ? 'Seluruh representasi wajib diperoleh' : (refusedCount > 0 ? `${refusedCount} representasi ditolak manajemen` : `${mandatoryPending.length} representasi wajib belum diperoleh`),
    },
  ];

  const modImpact = refusedCount > 0
    ? { k: 'red', ic: 'gavel', t: `${refusedCount} representasi ditolak — potensi tidak menyatakan pendapat (¶20). Eskalasi ke Generator Opini.` }
    : mandatoryPending.length > 0
      ? { k: 'amber', ic: 'clock', t: `${mandatoryPending.length} representasi wajib belum diperoleh — selesaikan sebelum tanggal laporan.` }
      : withException.length > 0
        ? { k: 'amber', ic: 'flask', t: `${withException.length} representasi dengan pengecualian — evaluasi dampak terhadap opini.` }
        : { k: 'green', ic: 'checkCircle', t: 'Tidak ada dampak modifikasi dari representasi tertulis.' };
  const MIc = (I as Record<string, (p: { size?: number }) => JSX.Element>)[modImpact.ic] || I.gavel;

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Evaluasi Keandalan Representasi (¶18–20)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {scenarios.map((s, i) => {
              const Ic = (I as Record<string, (p: { size?: number }) => JSX.Element>)[s.ic] || I.alert;
              return (
                <div key={i} className="row gap12" style={{ padding: '12px 0', alignItems: 'flex-start', borderBottom: i < scenarios.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <span style={{ flex: '0 0 34px', width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', background: `var(--${s.k}-bg)`, color: `var(--${s.k})` }}><Ic size={17} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.35 }}>{s.t}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.45, margin: '3px 0 6px' }}>{s.d}</div>
                    <Badge kind={s.ok ? 'green' : s.k}>{s.sts}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Hubungan dengan Bukti Audit Lain</h3><div style={{ flex: 1 }} /><Badge kind="amber">Pelengkap</Badge></div>
          <div className="panel" style={{ margin: 14, padding: '11px 13px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.book size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.5 }}>Representasi tertulis adalah <b>bukti audit yang perlu</b>, namun <b>tidak memberikan bukti yang cukup & tepat</b> dengan sendirinya. Diperolehnya representasi <b>tidak memengaruhi</b> sifat/luas bukti audit lain atas tanggung jawab manajemen (¶4).</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Dampak terhadap Opini">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              { t: 'Representasi wajib (¶10–11) diperoleh', ok: mandatoryPending.length === 0 },
              { t: 'Tidak ada pengecualian pada representasi', ok: withException.length === 0 },
              { t: 'Integritas manajemen tidak diragukan', ok: refusedCount === 0 },
              { t: 'Seluruh representasi berlaku diperoleh', ok: pendingCount === 0 },
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: r.ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}>{r.ok ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span>
                <span style={{ lineHeight: 1.4 }}>{r.t}</span>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="panel" style={{ padding: '10px 12px', background: `var(--${modImpact.k}-bg)`, borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: `var(--${modImpact.k})` }}><MIc size={15} /></span><span style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.4 }}>{modImpact.t}</span></div>
          </div>
        </Panel>
        <SASignoffMini stdId="sa580" />
      </div>
    </div>
  );
}

Object.assign(window, { SA580View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA580View };
