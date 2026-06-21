/* [codemod] ESM imports */
import React from 'react';
import { AMS_CANON } from './canon';
import { useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel } from './ui.jsx';

/* ============================================================
   Asseris — Batas Waktu & Penyampaian Elektronik OJK/BEI
   ------------------------------------------------------------
   Pelacak batas waktu regulatori penyampaian LK auditan & Laporan
   Tahunan emiten ke OJK (SPRINT) dan BEI (IDXnet), berikut status
   & bukti tanda terima elektronik per emiten. Melengkapi milestone
   internal di modul Delivery/Audit Timeline. (Gap G15)
   Data ditarik dari AMS_CANON.ojkFiling().
   ============================================================ */
const { useState: useStateFil, useMemo: useMemoFil } = React;

function FilCard({ value, label, sub, accent }: any) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function filStatusMeta(st, late, atRisk) {
  if (st === 'Disampaikan') return { kind: late ? 'amber' : 'green', txt: late ? 'Disampaikan (terlambat)' : 'Disampaikan' };
  if (atRisk) return { kind: 'red', txt: st + ' · berisiko' };
  if (st === 'Tertunda' || st === 'Belum mulai') return { kind: 'gray', txt: st };
  return { kind: 'blue', txt: st };
}

function OJKFilingView() {
  const nav = useNav();
  const F = useMemoFil(() => (AMS_CANON as any).ojkFiling(), []);

  return (
    <>
      <SubBar moduleId="ojkfiling" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SPRINT · IDXnet</Badge>
          <Btn sm onClick={() => nav('delivery', { from: 'ojkfiling' })}><I.calendar size={13} /> Milestone Internal</Btn>
          <Btn sm onClick={() => nav('audittimeline', { from: 'ojkfiling' })}><I.clock size={13} /> Audit Timeline</Btn>
          <Btn sm variant="primary" onClick={() => nav('opinion', { from: 'ojkfiling' })}><I.gavel size={14} /> Tanggal Opini</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <FilCard value={F.submitted + '/' + F.count} label="LK Auditan Disampaikan" sub="emiten terpantau" accent="var(--green)" />
            <FilCard value={F.late} label="Terlambat dari Batas" sub="melewati akhir bulan ke-3" accent={F.late ? 'var(--red)' : 'var(--green)'} />
            <FilCard value={F.atRisk} label="Berisiko Terlambat" sub="proses EQR / opini berjalan" accent={F.atRisk ? 'var(--amber)' : 'var(--green)'} />
            <FilCard value="31 Mar" label="Batas LK Tahunan" sub="akhir bulan ke-3 · POJK 14/2022" accent="var(--navy)" />
          </div>

          {/* obligations */}
          <Panel noBody>
            <div className="panel-h"><h3>Kewajiban Pelaporan Berkala — Tahun Buku {F.period}</h3><span className="sub mono">batas waktu regulatori</span></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="dtbl" style={{ width: '100%' }}>
                <thead><tr>
                  <th style={{ textAlign: 'left' }}>Jenis Laporan</th>
                  <th style={{ textAlign: 'left', width: 170 }}>Dasar Hukum</th>
                  <th style={{ textAlign: 'left', width: 150 }}>Jendela Waktu</th>
                  <th style={{ textAlign: 'center', width: 110 }}>Batas Akhir</th>
                  <th style={{ textAlign: 'left', width: 140 }}>Kanal Elektronik</th>
                </tr></thead>
                <tbody>
                  {F.obligations.map((o, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, fontSize: 12.5 }}>{o.kind}{o.interim && <span className="tiny muted" style={{ marginLeft: 6 }}>(interim)</span>}</td>
                      <td className="mono tiny" style={{ color: 'var(--ink-2)' }}>{o.basis}</td>
                      <td className="tiny" style={{ color: 'var(--ink-2)' }}>{o.win}</td>
                      <td style={{ textAlign: 'center' }} className="mono"><span style={{ fontWeight: 700, color: 'var(--navy)' }}>{o.due.split('-').reverse().join('/')}</span></td>
                      <td><span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 600 }}>{o.channels}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>{F.penalty}</div>
          </Panel>

          {/* per-entity tracker */}
          <Panel noBody>
            <div className="panel-h"><h3>Status Penyampaian per Emiten</h3><span className="sub mono">tanda terima elektronik · per {F.asof}</span></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="dtbl" style={{ width: '100%' }}>
                <thead><tr>
                  <th style={{ textAlign: 'left' }}>Emiten</th>
                  <th style={{ textAlign: 'left', width: 260 }}>LK Tahunan Auditan (31 Mar)</th>
                  <th style={{ textAlign: 'left', width: 230 }}>Laporan Tahunan (30 Apr)</th>
                </tr></thead>
                <tbody>
                  {F.entities.map(e => {
                    const a = filStatusMeta(e.lkAud.st, e.lkAud.late, e.lkAud.atRisk);
                    const b = filStatusMeta(e.ar.st, e.ar.late, e.ar.atRisk);
                    return (
                      <tr key={e.id}>
                        <td><div style={{ fontSize: 12.5, fontWeight: 600 }}>{e.name}</div><div className="tiny muted">{e.sector}</div></td>
                        <td>
                          <div className="row ac gap6" style={{ flexWrap: 'wrap' }}>
                            <Badge kind={a.kind}>{a.txt}</Badge>
                            {e.lkAud.on && <span className="tiny mono muted">{e.lkAud.on.split('-').reverse().join('/')}</span>}
                            {e.lkAud.lateDays && <span className="tiny mono" style={{ color: 'var(--red)', fontWeight: 700 }}>+{e.lkAud.lateDays} hr</span>}
                          </div>
                          {e.lkAud.rcpt && <div className="tiny mono" style={{ color: 'var(--ink-4)', marginTop: 3 }}><I.checkCircle size={10} style={{ color: 'var(--green)', verticalAlign: 'middle', marginRight: 3 }} />{e.lkAud.rcpt}</div>}
                          {e.lkAud.atRisk && <div className="tiny" style={{ color: 'var(--red)', marginTop: 3 }}>Tanda terima belum terbit — pantau penyelesaian opini</div>}
                        </td>
                        <td>
                          <div className="row ac gap6" style={{ flexWrap: 'wrap' }}>
                            <Badge kind={b.kind}>{b.txt}</Badge>
                            {e.ar.on && <span className="tiny mono muted">{e.ar.on.split('-').reverse().join('/')}</span>}
                          </div>
                          {e.ar.rcpt && <div className="tiny mono" style={{ color: 'var(--ink-4)', marginTop: 3 }}><I.checkCircle size={10} style={{ color: 'var(--green)', verticalAlign: 'middle', marginRight: 3 }} />{e.ar.rcpt}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>{F.channelsNote} Bukti tanda terima elektronik disimpan sebagai dokumentasi penyelesaian perikatan (SA 230).</div>
          </Panel>

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Pelacak menautkan tanggal opini auditor dengan batas waktu penyampaian regulatori OJK (SPRINT) & BEI (IDXnet), melengkapi milestone internal di modul Delivery & Audit Timeline. Keterlambatan memicu sanksi administratif. Angka ditarik dari satu sumber kebenaran <span className="mono">AMS_CANON.ojkFiling()</span>.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { OJKFilingView });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { OJKFilingView };
