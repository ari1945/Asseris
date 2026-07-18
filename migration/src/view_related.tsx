/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Stat } from './ui';
import { KvBox } from './view_analytical';
import { RP_PARTIES, RP_TXN, scanRelatedParties, LEDGER_GAP_META, type RptTransaction, type LedgerGap, type UnsupportedRegister } from './canon_related';
import { AMS_FORENSIC } from './forensic_canon';

/** Baris register + state workflow konfirmasi (view-only, di luar kanon). */
interface RpTxnRow extends RptTransaction { conf?: string; confResp?: number; }

/* ============================================================
   Asseris — Related Parties (SA 550)
   Registri & register RPT bersumber dari canon_related (SSOT);
   rekonsiliasi kelengkapan terhadap populasi jurnal kanonik
   (forensic_canon JOURNAL_POP). Dual-publish ke window di akhir
   file menjaga kompatibilitas view_forensic (legacy).
   ============================================================ */
const { useState: useStateRP } = React;

const RP_PROCEDURES = [
  { t: 'Telaah daftar pemegang saham & susunan pengurus', done: true },
  { t: 'Inspeksi notulen RUPS & rapat Dewan Komisaris', done: true },
  { t: 'Konfirmasi pihak berelasi & saldo terkait', done: true },
  { t: 'Telaah transaksi signifikan di luar kegiatan usaha normal', done: false },
  { t: 'Evaluasi pengungkapan sesuai PSAK 7', done: false },
];

function RelatedParties() {
  const { fmt } = AMS;
  const nav = useNav();
  const [selParty, setSelParty] = useStateRP('All');
  const [selTxn, setSelTxn] = useStateRP('T-04');
  /* engagement-scoped persist (AMS_PERSIST_SCOPE → engagement): pengungkapan,
     harga pasar, status konfirmasi & tick prosedur bertahan lintas reload +
     isolasi W7.5, capForWrite WP_EDIT. Override per-id atas register kanon (SSOT). */
  const [txnOverride, setTxnOverride] = window.useAmsPersist('relatedTxn.v1', {});
  const [procOverride, setProcOverride] = window.useAmsPersist('relatedProcs.v1', {});
  const txns: RpTxnRow[] = (RP_TXN as RpTxnRow[]).map(t => (txnOverride[t.id] ? { ...t, ...txnOverride[t.id] } : t));
  const procs = RP_PROCEDURES.map((p, i) => ((i in procOverride) ? { ...p, done: !!procOverride[i] } : p));

  const filtered = selParty === 'All' ? txns : txns.filter((t: any) => t.party === selParty);
  const tx = txns.find((t: any) => t.id === selTxn) || filtered[0];

  const totalRPT = txns.reduce((s: any, t: any) => s + t.amount, 0);
  const undisclosed = txns.filter((t: any) => !t.disclosed).length;
  const nonArm = txns.filter((t: any) => !t.arm).length;

  /* —— Rekonsiliasi kelengkapan: register (state hidup) ↔ populasi jurnal kanonik —— */
  const scan = scanRelatedParties({ parties: RP_PARTIES, register: txns, journal: AMS_FORENSIC.JOURNAL_POP });
  const openGap = (g: { reason: string; txnId?: string }) => {
    if (g.txnId) setSelTxn(g.txnId);
    nav(g.reason === 'unrecorded' ? 'jet' : 'disclosure');
  };

  const curTxn = (id: string) => txns.find(t => t.id === id);
  const patchTxn = (id: string, patch: Partial<RpTxnRow>) => setTxnOverride((s: Record<string, Partial<RpTxnRow>>) => ({ ...s, [id]: { ...s[id], ...patch } }));
  const toggleDisclosed = (id: string) => patchTxn(id, { disclosed: !curTxn(id)?.disclosed });
  const setTxn = (id: string, patch: Partial<RpTxnRow>) => patchTxn(id, patch);
  const advanceConf = (id: string) => {
    const t = curTxn(id);
    if (!t) return;
    const next = ({ '': 'Terkirim', 'Terkirim': 'Diterima' } as Record<string, string>)[t.conf || ''] || 'Terkirim';
    patchTxn(id, { conf: next, confResp: next === 'Diterima' ? t.amount : t.confResp });
  };
  const toggleProc = (i: number) => setProcOverride((s: Record<number, boolean>) => ({ ...s, [i]: !((i in s) ? s[i] : RP_PROCEDURES[i].done) }));
  const procDone = procs.filter((p: any) => p.done).length;

  return (
    <>
      <SubBar moduleId="related" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 550 · PSAK 7</Badge>
          <Btn sm><I.download size={13} /> Daftar Pihak Berelasi</Btn>
          <Btn sm variant="primary"><I.plus size={14} /> Tambah Pihak</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={RP_PARTIES.length} label="Pihak Berelasi" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(totalRPT / 1e9, 1) + ' M'} label="Nilai Transaksi RPT" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={nonArm} label="Non Arm's-Length" accent="var(--amber)" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={undisclosed} label="Belum Diungkapkan" accent="var(--red)" /></div></Panel>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '250px 1fr', gap: 12, alignItems: 'start' }}>
            {/* parties + procedures */}
            <div className="grid" style={{ gap: 12 }}>
              <Panel title="Daftar Pihak Berelasi">
                <div style={{ display: 'grid', gap: 2 }}>
                  <div onClick={() => setSelParty('All')} style={{ padding: '7px 9px', borderRadius: 6, cursor: 'pointer', background: selParty === 'All' ? 'var(--blue-050)' : 'transparent', fontWeight: 600, fontSize: 12.5 }}>Semua Pihak</div>
                  {RP_PARTIES.map(p => (
                    <div key={p.id} onClick={() => setSelParty(p.name)} style={{ padding: '8px 9px', borderRadius: 7, cursor: 'pointer', background: selParty === p.name ? 'var(--blue-050)' : 'transparent', border: '1px solid ' + (selParty === p.name ? 'var(--blue)' : 'transparent') }}>
                      <div className="row jb ac"><span style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{p.name}</span><span style={{ width: 7, height: 7, borderRadius: '50%', background: p.risk === 'High' ? 'var(--red)' : 'var(--amber)' }} /></div>
                      <div className="tiny muted">{p.rel}</div>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Prosedur Kelengkapan" sub={procDone + '/' + procs.length}>
                <div style={{ display: 'grid', gap: 0 }}>
                  {procs.map((p: any, i: any) => (
                    <label key={i} className="row gap8" style={{ padding: '7px 0', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < procs.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggleProc(i)}>
                      <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (p.done ? 'var(--green)' : 'var(--line-strong)'), background: p.done ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{p.done && <I.check size={11} style={{ color: '#fff' }} />}</span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.4, color: p.done ? 'var(--ink-3)' : 'var(--ink)' }}>{p.t}</span>
                    </label>
                  ))}
                </div>
              </Panel>
            </div>

            {/* transactions + detail */}
            <div className="grid" style={{ gap: 12 }}>
              {/* —— rekonsiliasi kelengkapan terhadap buku besar (inti SA 550) —— */}
              <Panel noBody>
                <div className="panel-h">
                  <h3>Rekonsiliasi Ledger ↔ Registri RPT</h3>
                  <div style={{ flex: 1 }} />
                  <Badge kind="blue">SA 550 ¶15-17</Badge>
                </div>
                <div style={{ padding: '15px 18px' }}>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: scan.ledgerGaps.length || scan.unsupportedRegister.length ? 12 : 0 }}>
                    <Stat value={scan.rollup.ledgerGaps} label="Gap dari Buku Besar" accent={scan.rollup.ledgerGaps ? 'var(--red)' : 'var(--green)'} />
                    <Stat value={'Rp ' + fmt(scan.rollup.ledgerRpExposure / 1e9, 2) + ' M'} label="Eksposur Jurnal RP" />
                    <Stat value={scan.rollup.unsupportedRegister} label="Register Tanpa Jejak" accent={scan.rollup.unsupportedRegister ? 'var(--amber)' : undefined} />
                  </div>

                  {scan.ledgerGaps.length === 0 && scan.unsupportedRegister.length === 0 && (
                    <div className="tiny" style={{ color: 'var(--green)', fontWeight: 600, paddingTop: 4 }}><I.check size={12} style={{ verticalAlign: 'middle' }} /> Seluruh aktivitas pihak berelasi di buku besar tercermin & diungkapkan dalam register RPT.</div>
                  )}

                  {scan.ledgerGaps.length > 0 && (
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div className="tiny muted upper" style={{ fontWeight: 700 }}>Temuan dari pemindaian jurnal (JOURNAL_POP)</div>
                      {scan.ledgerGaps.map((g: LedgerGap) => {
                        const meta = LEDGER_GAP_META[g.reason];
                        return (
                          <div key={g.journalId} onClick={() => openGap(g)} className="panel" style={{ padding: '9px 11px', borderColor: 'var(--line)', cursor: 'pointer', borderLeft: '3px solid var(--' + (meta.k === 'red' ? 'red' : 'amber') + ')' }}>
                            <div className="row jb ac" style={{ marginBottom: 3 }}>
                              <span className="row ac gap6"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{g.journalId}</span><span style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{g.party}</span></span>
                              <span className="row ac gap6"><Badge kind={meta.k === 'red' ? 'red' : 'amber'}>{meta.l}</Badge><span className="mono tiny" style={{ fontWeight: 700 }}>Rp {fmt(g.amount / 1e6, 0)} jt</span></span>
                            </div>
                            <div className="tiny muted" style={{ lineHeight: 1.4 }}>{meta.hint}{g.note ? ' — ' + g.note : ''}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {scan.unsupportedRegister.length > 0 && (
                    <div style={{ display: 'grid', gap: 4, marginTop: scan.ledgerGaps.length ? 10 : 0 }}>
                      <div className="tiny muted upper" style={{ fontWeight: 700 }}>Register tanpa jejak jurnal (perlu bukti pendukung)</div>
                      {scan.unsupportedRegister.map((u: UnsupportedRegister) => (
                        <div key={u.txnId} onClick={() => setSelTxn(u.txnId)} className="row jb ac" style={{ padding: '5px 9px', borderRadius: 6, cursor: 'pointer', background: 'var(--surface-2)' }}>
                          <span className="row ac gap6"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{u.txnId}</span><span className="tiny truncate">{u.party}</span></span>
                          <span className="mono tiny" style={{ fontWeight: 700 }}>Rp {fmt(u.amount / 1e6, 0)} jt</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>

              <Panel noBody>
                <div className="panel-h"><h3>Transaksi Pihak Berelasi (RPT)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{filtered.length} transaksi · klik untuk evaluasi</span></div>
                <table className="dtbl">
                  <thead><tr>
                    <th>ID</th><th>Pihak</th><th>Jenis Transaksi</th><th className="num">Nilai (Rp)</th><th>Arm's-Length</th><th style={{ width: 110 }}>Pengungkapan</th>
                  </tr></thead>
                  <tbody>
                    {filtered.map((t: any) => (
                      <tr key={t.id} className={t.id === selTxn ? 'sel' : ''} onClick={() => setSelTxn(t.id)} style={{ cursor: 'pointer' }}>
                        <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{t.id}</td>
                        <td className="truncate" style={{ maxWidth: 150, fontWeight: 600 }}>{t.party}</td>
                        <td className="tiny">{t.type}</td>
                        <td className="num">{fmt(t.amount / 1e6, 0)} jt</td>
                        <td>{t.arm ? <Badge kind="green">Wajar</Badge> : <Badge kind="amber">Non-Wajar</Badge>}</td>
                        <td><span onClick={(e: any) => { e.stopPropagation(); toggleDisclosed(t.id); }} style={{ cursor: 'pointer' }}>{t.disclosed ? <Badge kind="green">Diungkapkan</Badge> : <Badge kind="red">Belum</Badge>}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              {tx && (
                <Panel noBody>
                  <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{tx.id}</span>
                    <span style={{ fontWeight: 700 }}>{tx.type}</span>
                    <span className="tiny muted">· {tx.party}</span>
                    <div style={{ flex: 1 }} />
                    <Badge kind="blue">{tx.assertion}</Badge>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      <KvBox label="Nilai Transaksi" v={'Rp ' + fmt(tx.amount / 1e6, 0) + ' jt'} />
                      <KvBox label="Syarat & Ketentuan" v={tx.terms} accent={tx.arm ? 'var(--green)' : 'var(--amber)'} />
                    </div>
                    {!tx.arm && (
                      <div className="panel" style={{ padding: '11px 12px', background: 'var(--surface-2)', borderColor: 'var(--line)', marginBottom: 12 }}>
                        <div className="row jb ac" style={{ marginBottom: 8 }}>
                          <span className="row ac gap6" style={{ fontWeight: 700, fontSize: 12 }}><span style={{ color: 'var(--amber)' }}><I.scale size={15} /></span> Uji Kewajaran Harga (Arm's-Length)</span>
                          <span className="tiny muted">SA 550 ¶23</span>
                        </div>
                        {(() => {
                          const market = tx.market != null ? tx.market : Math.round(tx.amount * 0.82);
                          const diff = tx.amount - market;
                          return (
                            <>
                              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                <div><div className="tiny muted upper" style={{ marginBottom: 2 }}>Nilai Tercatat</div><div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{fmt(tx.amount / 1e6, 0)} jt</div></div>
                                <div><div className="tiny muted upper" style={{ marginBottom: 2 }}>Harga Pasar Wajar</div><input type="number" value={market} onChange={(e: any) => setTxn(tx.id, { market: +e.target.value })} className="input mono" style={{ width: '100%', height: 26, textAlign: 'right', padding: '0 7px' }} /></div>
                              </div>
                              <div className="row jb ac" style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>
                                <span className="tiny" style={{ fontWeight: 700 }}>Selisih harga (potensi koreksi)</span>
                                <span className="mono" style={{ fontWeight: 700, color: Math.abs(diff) > 1e6 ? 'var(--red)' : 'var(--green)' }}>Rp {fmt(diff / 1e6, 1)} jt</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* confirmation flow */}
                    <div className="panel" style={{ padding: '10px 12px', borderColor: 'var(--line)', marginBottom: 12 }}>
                      <div className="row jb ac" style={{ marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 12 }}>Konfirmasi Pihak Berelasi</span>
                        <Badge kind={tx.conf === 'Diterima' ? 'green' : tx.conf === 'Terkirim' ? 'blue' : 'gray'}>{tx.conf || 'Belum dikirim'}</Badge>
                      </div>
                      <div className="row ac gap6" style={{ marginBottom: 9 }}>
                        {['Belum dikirim', 'Terkirim', 'Diterima'].map((s, i) => {
                          const cur = tx.conf || 'Belum dikirim';
                          const idx = ['Belum dikirim', 'Terkirim', 'Diterima'].indexOf(cur);
                          const on = i <= idx;
                          return <React.Fragment key={s}>
                            {i > 0 && <div style={{ flex: 1, height: 2, background: i <= idx ? 'var(--green)' : 'var(--line)' }} />}
                            <div style={{ display: 'grid', placeItems: 'center', gap: 2 }} title={s}><span style={{ width: 16, height: 16, borderRadius: '50%', background: on ? 'var(--green)' : 'var(--surface-3)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9 }}>{on ? <I.check size={10} /> : i + 1}</span></div>
                          </React.Fragment>;
                        })}
                      </div>
                      {tx.conf === 'Diterima'
                        ? <div className="tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={12} style={{ verticalAlign: 'middle' }} /> Saldo dikonfirmasi sesuai (Rp {fmt((tx.confResp || tx.amount) / 1e6, 0)} jt)</div>
                        : <Btn sm variant="primary" style={{ width: '100%' }} onClick={() => advanceConf(tx.id)}><I.send size={13} /> {tx.conf === 'Terkirim' ? 'Catat Respons Diterima' : 'Kirim Konfirmasi'}</Btn>}
                    </div>

                    {!tx.disclosed && (
                      <div className="panel" style={{ padding: '10px 12px', background: 'var(--red-bg)', borderColor: 'transparent', marginBottom: 12 }}>
                        <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={16} /></span><span style={{ fontSize: 12, lineHeight: 1.45 }}>Belum diungkapkan dalam CALK — potensi salah saji pengungkapan PSAK 7. Usulkan koreksi pengungkapan kepada manajemen.</span></div>
                      </div>
                    )}
                    <div className="row gap8">
                      <Btn sm variant="primary" onClick={() => toggleDisclosed(tx.id)}><I.check size={14} /> Tandai {tx.disclosed ? 'Belum' : 'Telah'} Diungkapkan</Btn>
                      <Btn sm onClick={() => nav('sad')}><I.flag size={14} /> Tautkan ke SAD Ledger</Btn>
                    </div>
                  </div>
                </Panel>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { RelatedParties, RP_PARTIES, RP_TXN });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { RP_PARTIES, RP_TXN, RelatedParties };
