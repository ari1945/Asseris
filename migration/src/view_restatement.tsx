/* ============================================================
   Asseris — Prosedur Penyajian Kembali Laporan Keuangan (Restatement)
   ------------------------------------------------------------
   Kertas kerja auditable & EDITABLE untuk koreksi retrospektif per
   PSAK 25 (IAS 8): kesalahan periode lalu (¶42), perubahan kebijakan
   retrospektif (¶19/22), reklasifikasi penyajian (PSAK 1 ¶41).
   • Register item restatement dapat diisi auditor (tambah/ubah/hapus).
   • Engine kanonik (AMS_CANON.restatementEngine) menghitung roll-forward
     saldo laba awal, dampak komparatif agregat, EPS, & materialitas
     (dibanding PM dari AMS_CANON.materiality) — angka dari WTB (SSOT).
   • Checklist prosedur audit (SA 710/510/450/240) + pengungkapan PSAK 25.
   • State ter-persist engagement-scoped (restatement.v1) untuk jejak audit.
   Estimasi DIKECUALIKAN (prospektif ¶36) — lihat modul PSAK 25.
   ============================================================ */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { useAudit, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Tabs } from './ui';
import type { RestatementItem } from './canon_types';

const { useMemo: useMemoRS } = React;

/* event structural types (proyek tanpa @types/react — hindari explicit any) */
type InputEvt = { target: { value: string } };
type CheckEvt = { target: { checked: boolean } };

interface RestatementDoc {
  items: RestatementItem[];
  proc: Record<string, boolean>;
  disc: Record<string, boolean>;
  conclusion: string;
  tab: string;
}

/* kategori item — hanya yang memicu penyajian kembali (estimasi dikecualikan) */
const RS_CAT: Record<string, { lbl: string; kind: string; treat: string; ref: string; color: string }> = {
  error:   { lbl: 'Kesalahan Periode Lalu', kind: 'red',  treat: 'Retrospektif', ref: 'PSAK 25 ¶42', color: 'var(--red)' },
  policy:  { lbl: 'Perubahan Kebijakan',    kind: 'amber', treat: 'Retrospektif', ref: 'PSAK 25 ¶19/22', color: 'var(--amber)' },
  reclass: { lbl: 'Reklasifikasi Penyajian', kind: 'teal', treat: 'Saji ulang penyajian', ref: 'PSAK 1 ¶41', color: 'var(--teal)' },
};

/* prosedur audit atas penyajian kembali */
const RS_PROC = [
  { id: 'p1', ref: 'SA 240 ¶32',   t: 'Pertimbangkan apakah kesalahan periode lalu mengindikasikan kecurangan (management override / pos fiktif)' },
  { id: 'p2', ref: 'PSAK 25 ¶41-42', t: 'Bedakan kesalahan vs perubahan kebijakan vs estimasi; tetapkan perlakuan retrospektif yang tepat' },
  { id: 'p3', ref: 'SA 450/320',   t: 'Evaluasi materialitas koreksi & akumulasikan ke SAD; tentukan apakah penyajian kembali diperlukan' },
  { id: 'p4', ref: 'PSAK 25 ¶23-25', t: 'Nilai kepraktisan penyajian kembali retrospektif; bila impraktis, dokumentasikan alasan & terapkan sejak periode praktis' },
  { id: 'p5', ref: 'SA 710',       t: 'Verifikasi komparatif disajikan kembali konsisten & rujukan periode lalu dalam opini sesuai' },
  { id: 'p6', ref: 'SA 510',       t: 'Uji konsistensi kebijakan & ketepatan saldo awal periode paling awal yang disajikan' },
  { id: 'p7', ref: 'PSAK 1 ¶40A',  t: 'Pastikan laporan posisi keuangan KETIGA disajikan saat penyajian kembali retrospektif material' },
  { id: 'p8', ref: 'PSAK 25 ¶28/49', t: 'Telaah kecukupan pengungkapan: sifat, jumlah penyesuaian tiap pos & dampak ke laba per saham' },
  { id: 'p9', ref: 'SA 580/260',   t: 'Peroleh representasi tertulis & komunikasikan penyajian kembali ke TCWG' },
  { id: 'p10', ref: 'SA 700/705',  t: 'Nilai dampak ke opini bila penyajian kembali/pengungkapan belum memadai (modifikasi / paragraf penekanan)' },
];

/* pengungkapan wajib PSAK 25 (¶28-29, ¶49) */
const RS_DISC = [
  { id: 'd1', ref: '¶49(a)', t: 'Sifat kesalahan periode lalu yang dikoreksi' },
  { id: 'd2', ref: '¶49(b)', t: 'Jumlah koreksi tiap pos LK terdampak (kini & komparatif)' },
  { id: 'd3', ref: '¶49(b)', t: 'Dampak koreksi ke laba per saham dasar & dilusian' },
  { id: 'd4', ref: '¶49(c)', t: 'Jumlah koreksi pada awal periode paling awal yang disajikan' },
  { id: 'd5', ref: '¶29',    t: 'Sifat & alasan perubahan kebijakan akuntansi (bila ada)' },
  { id: 'd6', ref: 'PSAK 1 ¶40A', t: 'Laporan posisi keuangan ketiga (awal periode komparatif)' },
  { id: 'd7', ref: '¶48/¶53', t: 'Pernyataan bila penyajian kembali impraktis beserta alasan' },
];

const RS_TYPES: { id: RestatementItem['type']; label: string }[] = [
  { id: 'error', label: 'Kesalahan Periode Lalu' },
  { id: 'policy', label: 'Perubahan Kebijakan' },
  { id: 'reclass', label: 'Reklasifikasi Penyajian' },
];

function RSCard({ value, label, sub, accent }: { value: string; label: string; sub?: string; accent?: string }) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function RestatementView() {
  const { fmt } = AMS;
  const firm = useFirm();
  const audit = useAudit();
  const nav = useNav();

  const [doc, setDoc] = window.useAmsPersist('restatement.v1', (): RestatementDoc => ({
    items: (AMS_CANON.RESTATEMENT_SEED || []).map(x => ({ ...x })),
    proc: {}, disc: {}, conclusion: '', tab: 'register',
  }));
  const d: RestatementDoc = doc;
  const items: RestatementItem[] = Array.isArray(d.items) ? d.items : [];

  /* SUMBER KEBENARAN — WTB reaktif + PM dari materialitas engagement */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((AMS && AMS.WTB) || []);
  const pm: number | null = useMemoRS(() => (AMS_CANON.materiality ? AMS_CANON.materiality().pm : null), []);
  const M: ReturnType<typeof AMS_CANON.restatementEngine> = useMemoRS(() => AMS_CANON.restatementEngine(items, wtb, { pm }), [items, wtb, pm]);

  const setTab = (tab: string) => setDoc((m: RestatementDoc) => ({ ...m, tab }));
  const tab = d.tab || 'register';
  const toggleProc = (id: string) => setDoc((m: RestatementDoc) => ({ ...m, proc: { ...m.proc, [id]: !m.proc[id] } }));
  const toggleDisc = (id: string) => setDoc((m: RestatementDoc) => ({ ...m, disc: { ...m.disc, [id]: !m.disc[id] } }));

  const updItem = (id: string, patch: Partial<RestatementItem>) =>
    setDoc((m: RestatementDoc) => ({ ...m, items: m.items.map(it => it.id === id ? { ...it, ...patch } : it) }));
  const addItem = () =>
    setDoc((m: RestatementDoc) => ({ ...m, items: [...m.items, { id: 'RS-' + Date.now(), type: 'error', desc: '', period: 'FY2024', affects: '', gross: 0, tax: true }] }));
  const delItem = (id: string) =>
    setDoc((m: RestatementDoc) => ({ ...m, items: m.items.filter(it => it.id !== id) }));

  const procDone = RS_PROC.filter(p => d.proc[p.id]).length;
  const score = Math.round((procDone / RS_PROC.length) * 100);
  const discDone = RS_DISC.filter(x => d.disc[x.id]).length;

  const fmtJt = (v: number) => (v < 0 ? '(' + fmt(Math.abs(Math.round(v))) + ')' : fmt(Math.round(v)));

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };

  const TABS = [
    { id: 'register', label: 'Register Item', count: items.length },
    { id: 'dampak', label: 'Dampak & Roll-forward' },
    { id: 'prosedur', label: 'Prosedur & Pengungkapan' },
    { id: 'kesimpulan', label: 'Kesimpulan' },
  ];

  return (
    <>
      <SubBar moduleId="restatement" right={
        <div className="row gap8 ac">
          <Badge kind="green">PSAK 25 · IAS 8</Badge>
          <Btn sm onClick={() => nav('psak25', { from: 'restatement' })}><I.sync size={13} /> PSAK 25</Btn>
          <Btn sm onClick={() => nav('sa710', { from: 'restatement' })}><I.table size={13} /> SA 710</Btn>
          <Btn sm onClick={() => nav('sad', { from: 'restatement' })}><I.scale size={13} /> SAD</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <RSCard value={items.length + ' item'} label="Item penyajian kembali" sub={M.counts.error + ' kesalahan · ' + M.counts.policy + ' kebijakan · ' + M.counts.reclass + ' reklas'} accent="var(--navy)" />
            <RSCard value={'Rp ' + fmtJt(M.errGross) + ' jt'} label="Koreksi laba sblm pajak (bruto)" sub={'Efek pajak Rp ' + fmtJt(M.errTax) + ' jt'} accent="var(--red)" />
            <RSCard value={'Rp ' + fmtJt(M.errNet) + ' jt'} label="Koreksi neto ke saldo laba" sub={'Neto pajak ' + Math.round(M.rate * 100) + '%'} accent="var(--amber)" />
            <RSCard value={M.material ? 'Material' : 'Tidak material'} label="Penilaian materialitas" sub={pm != null ? 'PM Rp ' + fmt(Math.round(pm)) + ' jt' : 'PM belum ditetapkan'} accent={M.material ? 'var(--red)' : 'var(--green)'} />
            <RSCard value={score + '%'} label="Prosedur audit selesai" sub={procDone + '/' + RS_PROC.length + ' langkah'} accent={score === 100 ? 'var(--green)' : 'var(--navy)'} />
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
            {/* ============ LEFT ============ */}
            <div className="grid" style={{ gap: 12 }}>
              <Tabs tabs={TABS} active={tab} onChange={setTab} />

              {/* ---------- TAB: REGISTER ITEM (editable) ---------- */}
              {tab === 'register' && <>
                <Panel noBody>
                  <div className="panel-h"><h3>Register Item Penyajian Kembali</h3><span className="sub mono">editable · PSAK 25</span><div style={{ flex: 1 }} /><Btn sm onClick={addItem}><I.plus size={13} /> Tambah item</Btn></div>
                  <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: 'var(--surface-2)' }}>
                    <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.scale size={15} /></span>
                    <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                      Masukkan tiap koreksi retrospektif: <b>kesalahan</b> periode lalu (¶42), <b>perubahan kebijakan</b> retrospektif (¶19/22), atau <b>reklasifikasi</b> penyajian (PSAK 1 ¶41). Kolom <b>Bruto</b> = dampak ke laba sebelum pajak periode lalu (Rp juta); <b>negatif</b> bila laba dikoreksi turun. Estimasi bersifat prospektif → <b>tidak</b> dimasukkan di sini.
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', width: 150 }}>Jenis</th>
                          <th style={{ textAlign: 'left' }}>Deskripsi & pos terdampak</th>
                          <th style={{ textAlign: 'left', width: 78 }}>Periode</th>
                          <th style={{ textAlign: 'right', width: 92 }}>Bruto (jt)</th>
                          <th style={{ textAlign: 'center', width: 44 }}>Pajak</th>
                          <th style={{ width: 30 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => {
                          const c = RS_CAT[it.type] || RS_CAT.error;
                          const isReclass = it.type === 'reclass';
                          return (
                            <tr key={it.id} style={{ borderLeft: '3px solid ' + c.color }}>
                              <td>
                                <select value={it.type} onChange={(e: InputEvt) => updItem(it.id, { type: e.target.value as RestatementItem['type'] })}
                                  className="mono" style={{ width: '100%', fontSize: 11, padding: '4px 5px', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--surface)', color: 'var(--ink)' }}>
                                  {RS_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                                <div className="tiny mono" style={{ color: c.color, marginTop: 2 }}>{c.treat}</div>
                              </td>
                              <td>
                                <input value={it.desc} placeholder="Uraian koreksi…" onChange={(e: InputEvt) => updItem(it.id, { desc: e.target.value })}
                                  style={{ width: '100%', fontSize: 12, padding: '4px 6px', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--surface)', color: 'var(--ink)' }} />
                                <input value={it.affects} placeholder="Pos LK terdampak…" onChange={(e: InputEvt) => updItem(it.id, { affects: e.target.value })}
                                  style={{ width: '100%', fontSize: 11, padding: '3px 6px', marginTop: 3, border: '1px solid var(--line-soft)', borderRadius: 6, background: 'var(--surface)', color: 'var(--ink-3)' }} />
                              </td>
                              <td>
                                <input value={it.period} onChange={(e: InputEvt) => updItem(it.id, { period: e.target.value })}
                                  className="mono" style={{ width: '100%', fontSize: 11, padding: '4px 5px', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--surface)', color: 'var(--ink)' }} />
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <input type="number" value={isReclass ? '' : it.gross} disabled={isReclass} placeholder={isReclass ? '—' : '0'}
                                  onChange={(e: InputEvt) => updItem(it.id, { gross: Number(e.target.value) || 0 })}
                                  className="mono" style={{ width: '100%', textAlign: 'right', fontSize: 12, padding: '4px 5px', border: '1px solid var(--line)', borderRadius: 6, background: isReclass ? 'var(--surface-3)' : 'var(--surface)', color: (it.gross || 0) < 0 ? 'var(--red)' : 'var(--ink)' }} />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" checked={!isReclass && !!it.tax} disabled={isReclass} onChange={(e: CheckEvt) => updItem(it.id, { tax: e.target.checked })} />
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button onClick={() => delItem(it.id)} title="Hapus" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 2 }}><I.trash size={13} /></button>
                              </td>
                            </tr>
                          );
                        })}
                        {!items.length && (
                          <tr><td colSpan={6} className="tiny muted" style={{ textAlign: 'center', padding: '18px 0' }}>Belum ada item. Klik <b>Tambah item</b> untuk mulai mendokumentasikan penyajian kembali.</td></tr>
                        )}
                      </tbody>
                      {items.length > 0 && (
                        <tfoot>
                          <tr style={{ background: 'var(--surface-2)' }}>
                            <td colSpan={3} style={{ fontWeight: 700, fontSize: 12 }}>Total koreksi (bruto → pajak → neto)</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: M.errGross < 0 ? 'var(--red)' : 'var(--navy)' }}>{fmtJt(M.errGross)}</td>
                            <td className="mono tiny" style={{ textAlign: 'center', color: 'var(--ink-3)' }}>{fmtJt(M.errTax)}</td>
                            <td className="mono tiny" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--amber)' }}>{fmtJt(M.errNet)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Koreksi neto <b>Rp {fmtJt(M.errNet)} jt</b> dibebankan ke saldo laba awal — <b>bukan</b> lewat laba rugi tahun berjalan. Efek pajak Rp {fmtJt(M.errTax)} jt disesuaikan pada aset/utang pajak periode lalu.
                  </div>
                </Panel>
              </>}

              {/* ---------- TAB: DAMPAK & ROLL-FORWARD ---------- */}
              {tab === 'dampak' && <>
                <Panel noBody>
                  <div className="panel-h"><h3>Roll-forward Saldo Laba — Penyajian Kembali</h3><span className="sub mono">¶42 · neto pajak {Math.round(M.rate * 100)}%</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div>
                    {[
                      { t: 'Saldo laba awal — dilaporkan sebelumnya', v: M.reOpenReported, tot: true },
                      { t: 'Koreksi laba sebelum pajak (bruto)', v: M.errGross },
                      { t: 'Dampak pajak penghasilan koreksi (' + Math.round(M.rate * 100) + '%)', v: -M.errTax, tax: true },
                      { t: 'Saldo laba awal — disajikan kembali', v: M.reOpenRestated, tot: true },
                    ].map((r, i, arr) => (
                      <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--line-soft)' : 0, background: r.tot ? 'var(--surface-2)' : 'transparent' }}>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: r.tot ? 700 : 500, color: r.tot ? 'var(--navy)' : 'var(--ink)' }}>{r.t}</div>
                        <div className="mono" style={{ width: 96, textAlign: 'right', fontWeight: 700, color: r.v < 0 ? 'var(--red)' : r.tax ? 'var(--green)' : r.tot ? 'var(--navy)' : 'var(--ink)' }}>{fmtJt(r.v)}</div>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Dampak ke Komparatif</h3><span className="sub mono">dilaporkan vs disajikan kembali</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Pos Laporan Keuangan</th>
                          <th style={{ textAlign: 'right', width: 96 }}>Dilaporkan</th>
                          <th style={{ textAlign: 'right', width: 84 }}>Penyesuaian</th>
                          <th style={{ textAlign: 'right', width: 96 }}>Disajikan kembali</th>
                        </tr>
                      </thead>
                      <tbody>
                        {M.impact.map((r) => (
                          <tr key={r.id} style={{ background: r.bold ? 'var(--surface-2)' : 'transparent' }}>
                            <td style={{ fontSize: 12.3, fontWeight: r.bold ? 700 : 500, color: r.bold ? 'var(--navy)' : 'var(--ink)' }}>{r.label}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>{fmt(Math.round(r.rep))}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: r.adj < 0 ? 'var(--red)' : r.adj > 0 ? 'var(--green)' : 'var(--ink-4)' }}>{r.adj === 0 ? '—' : fmtJt(r.adj)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: r.bold ? 800 : 600, color: r.bold ? 'var(--navy)' : 'var(--ink)' }}>{fmt(Math.round(r.res))}</td>
                          </tr>
                        ))}
                        <tr>
                          <td style={{ fontSize: 12.3, fontWeight: 600 }}>Laba per saham dasar (Rp)</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{M.eps.reported.toFixed(1)}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: (M.eps.restated - M.eps.reported) < 0 ? 'var(--red)' : 'var(--green)' }}>{(M.eps.restated - M.eps.reported).toFixed(1)}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{M.eps.restated.toFixed(1)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {M.thirdBalanceSheet && (
                    <div className="row ac gap8" style={{ margin: '4px 14px 12px', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--teal)', background: 'var(--surface)' }}>
                      <I.table size={14} style={{ color: 'var(--teal)', flex: '0 0 auto' }} />
                      <span style={{ fontSize: 11.5, lineHeight: 1.4, flex: 1 }}>Penyajian kembali <b>material</b> → PSAK 1 ¶40A mensyaratkan <b>laporan posisi keuangan ketiga</b> pada awal periode komparatif. Beri tanda "disajikan kembali".</span>
                      <button onClick={() => nav('sa710', { from: 'restatement' })} className="mono tiny" style={{ fontWeight: 700, color: 'var(--teal)', whiteSpace: 'nowrap', background: 'none', border: 'none', cursor: 'pointer' }}>SA 710 <I.arrowRight size={12} /></button>
                    </div>
                  )}
                </Panel>
              </>}

              {/* ---------- TAB: PROSEDUR & PENGUNGKAPAN ---------- */}
              {tab === 'prosedur' && <>
                <Panel noBody>
                  <div className="panel-h"><h3>Prosedur Audit — Penyajian Kembali</h3><div style={{ flex: 1 }} /><span className="tiny muted">{procDone}/{RS_PROC.length}</span></div>
                  <div>
                    {RS_PROC.map((p, i) => {
                      const on = !!d.proc[p.id];
                      return (
                        <label key={p.id} className="row gap10" style={{ padding: '9px 14px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < RS_PROC.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggleProc(p.id)}>
                          <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (on ? 'var(--green)' : 'var(--line-strong)'), background: on ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{on && <I.check size={11} style={{ color: '#fff' }} />}</span>
                          <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 96, flex: '0 0 96px', marginTop: 1 }}>{p.ref}</span>
                          <span style={{ fontSize: 12, lineHeight: 1.4, color: on ? 'var(--ink-3)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{p.t}</span>
                        </label>
                      );
                    })}
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Pengungkapan Wajib PSAK 25</h3><span className="sub mono">¶28-29 · ¶49</span><div style={{ flex: 1 }} /><span className="tiny muted">{discDone}/{RS_DISC.length}</span></div>
                  <div>
                    {RS_DISC.map((x, i) => {
                      const on = !!d.disc[x.id];
                      return (
                        <label key={x.id} className="row gap9" style={{ padding: '8px 14px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < RS_DISC.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggleDisc(x.id)}>
                          <span style={{ flex: '0 0 15px', width: 15, height: 15, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (on ? 'var(--green)' : 'var(--line-strong)'), background: on ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{on && <I.check size={10} style={{ color: '#fff' }} />}</span>
                          <span style={{ flex: 1, fontSize: 11.5, lineHeight: 1.4, color: on ? 'var(--ink-3)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{x.t}</span>
                          <span className="mono tiny" style={{ color: 'var(--ink-4)', flex: '0 0 auto' }}>{x.ref}</span>
                        </label>
                      );
                    })}
                  </div>
                </Panel>
              </>}

              {/* ---------- TAB: KESIMPULAN ---------- */}
              {tab === 'kesimpulan' && <>
                <Panel noBody>
                  <div className="panel-h"><h3>Kesimpulan Auditor — Penyajian Kembali</h3><span className="sub mono">SA 230 · dokumentasi</span></div>
                  <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                    <div className="panel" style={{ padding: '10px 12px', background: M.material ? 'var(--amber-bg)' : 'var(--surface-2)', borderColor: 'transparent' }}>
                      <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                        <span style={{ color: M.material ? 'var(--amber)' : 'var(--green)', marginTop: 1 }}><I.flag size={15} /></span>
                        <span style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                          Koreksi neto <b>Rp {fmtJt(M.errNet)} jt</b> {M.material ? <>bersifat <b>material</b> (≥ PM {pm != null ? 'Rp ' + fmt(Math.round(pm)) + ' jt' : ''}) → penyajian kembali komparatif & saldo laba awal disyaratkan{M.thirdBalanceSheet ? ', termasuk laporan posisi keuangan ketiga (PSAK 1 ¶40A)' : ''}. Komunikasikan ke TCWG (SA 260) & ungkapkan penuh (¶49).</> : <>di bawah materialitas — evaluasi apakah tetap dikoreksi atau diakumulasikan ke SAD (SA 450).</>}
                        </span>
                      </div>
                    </div>
                    <textarea value={d.conclusion} placeholder="Kesimpulan & pertimbangan auditor atas penyajian kembali (sifat, sebab, dampak, kecukupan pengungkapan, dampak ke opini)…"
                      onChange={(e: InputEvt) => setDoc((m: RestatementDoc) => ({ ...m, conclusion: e.target.value }))}
                      style={{ width: '100%', minHeight: 150, fontSize: 12.5, lineHeight: 1.5, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)', resize: 'vertical', fontFamily: 'inherit' }} />
                    <div className="tiny muted" style={{ lineHeight: 1.5 }}>Tersimpan otomatis (engagement-scoped) untuk jejak audit. Rujuk SA 700/705 untuk dampak ke opini bila penyajian kembali/pengungkapan tidak memadai.</div>
                  </div>
                </Panel>
              </>}
            </div>

            {/* ============ RIGHT ============ */}
            <div className="grid" style={{ gap: 12 }}>
              {/* kesimpulan skor */}
              <Panel noBody>
                <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
                  <div className="tiny upper" style={{ color: '#bcd6e4', letterSpacing: '.05em', marginBottom: 8 }}>Progres — Prosedur Restatement</div>
                  <div className="row ac gap12">
                    <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{score}<span style={{ fontSize: 18 }}>%</span></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: score + '%', background: score === 100 ? '#4ade80' : '#7cc6ff', borderRadius: 4, transition: '.3s' }} /></div>
                      <div className="tiny" style={{ color: '#bcd6e4', marginTop: 6 }}>{procDone}/{RS_PROC.length} prosedur · {discDone}/{RS_DISC.length} pengungkapan</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: 14 }}>
                  <div className="row ac jb" style={{ marginBottom: 6 }}>
                    <span className="tiny muted" style={{ fontWeight: 600 }}>Penilaian materialitas</span>
                    <Badge kind={M.material ? 'red' : 'green'}>{M.material ? 'Material' : 'Tidak material'}</Badge>
                  </div>
                  <div className="tiny muted" style={{ lineHeight: 1.5 }}>Koreksi neto Rp {fmtJt(M.errNet)} jt vs PM {pm != null ? 'Rp ' + fmt(Math.round(pm)) + ' jt' : '(belum ditetapkan)'}.</div>
                </div>
              </Panel>

              {/* komposisi katalog */}
              <Panel title="Komposisi Item" sub="berdasar jenis koreksi">
                <div style={{ display: 'grid', gap: 7 }}>
                  {Object.keys(RS_CAT).map((k) => {
                    const c = RS_CAT[k];
                    const n = M.counts[k] || 0;
                    const pct = items.length ? Math.round(n / items.length * 100) : 0;
                    return (
                      <div key={k}>
                        <div className="row ac jb" style={{ marginBottom: 3 }}>
                          <span style={{ fontSize: 11.5 }}>{c.lbl}</span>
                          <span className="mono tiny" style={{ fontWeight: 700, color: c.color }}>{n} · {c.treat}</span>
                        </div>
                        <div style={{ height: 7, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                          <span style={{ display: 'block', height: '100%', width: pct + '%', background: c.color, borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              {/* tautan modul */}
              <Panel title="Ketertelusuran" sub="standar & modul terkait">
                <div style={{ display: 'grid', gap: 6 }}>
                  {[
                    ['psak25', 'sync', 'PSAK 25 · Kebijakan, Estimasi & Kesalahan'],
                    ['sa710', 'table', 'SA 710 · Informasi Komparatif'],
                    ['opening', 'clock', 'SA 510 · Saldo Awal & Konsistensi'],
                    ['sad', 'scale', 'SAD Ledger · Evaluasi Salah Saji'],
                    ['sa240', 'flask', 'SA 240 · Kecurangan'],
                    ['psak1', 'report', 'PSAK 1 · Penyajian (posisi keuangan ketiga)'],
                    ['fsgen', 'report', 'Financial Statement Generator'],
                  ].map(([id, ic, lbl]) => {
                    const IconC = (I as Record<string, typeof I.doc>)[ic] || I.doc;
                    return (
                      <button key={id} onClick={() => nav(id, { from: 'restatement' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{lbl}</span>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                      </button>
                    );
                  })}
                </div>
              </Panel>
            </div>
          </div>

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja penyajian kembali <b>{client.name}</b> ({eng.id} · {eng.fy}) per PSAK 25 — item diisi auditor; roll-forward, dampak komparatif & EPS dihitung dari WTB (SSOT) + tarif pajak {Math.round(M.rate * 100)}%; materialitas dibanding PM engagement. Item, prosedur, pengungkapan & kesimpulan tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { RestatementView });

export { RestatementView };
