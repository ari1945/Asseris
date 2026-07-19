/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { useAudit, useNav, useAmsPersist } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Donut, Panel, Stat } from './ui';

/* ============================================================
   Asseris — ECL Calculator (PSAK 71)
   ------------------------------------------------------------
   Catatan: kalkulator sampel MUS (SA 530) dahulu tinggal di sini
   sebagai <SamplingEngine>. Sejak konsolidasi SA 530, mesin sampel
   menjadi satu sumber di view_sa530.tsx (route 'sa530'); route
   'sampling' kini alias redirect ke sana. Helper bersama Kv/RowKv
   tetap diekspor dari berkas ini (dipakai lintas modul).
   ============================================================ */

/* ---------------- ECL Calculator (PSAK 71) ---------------- */
function ECLCalculator() {
  const { fmt } = AMS;
  const nav = useNav();
  const audit = useAudit();
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((AMS && AMS.WTB) || []);
  /* SATU sumber: matriks bucket, gross & loss-rate efektif ditarik dari AMS_CANON.psak71(wtb).
     Tidak ada lagi angka hardcode — konsisten dengan modul PSAK 71 & tab Rekonsiliasi. */
  const p71 = (AMS_CANON ? AMS_CANON.psak71(wtb) : null);
  const [buckets, setBuckets] = useAmsPersist('eclInputs.v1', () => (p71 ? p71.buckets.map(b => ({
    id: b.id, label: b.label, stage: b.stage, gross: Math.round(b.gross) * 1e6, rate: +b.rate.toFixed(1),
  })) : [])); // F1/PR-3: persist loss-rate (dulu useState → hilang saat reload)
  const booked = (p71 ? p71.ckpnBooked : 1980) * 1e6; // WTB 1-1210 (satu sumber)

  const setRate = (id: any, rate: any) => setBuckets((bs: any) => bs.map((b: any) => b.id === id ? { ...b, rate: Math.max(0, Math.min(100, rate)) } : b));

  const withEcl = buckets.map((b: any) => ({ ...b, ecl: Math.round(b.gross * b.rate / 100) }));
  const totalGross = withEcl.reduce((s: any, b: any) => s + b.gross, 0);
  const totalEcl = withEcl.reduce((s: any, b: any) => s + b.ecl, 0);
  const diff = totalEcl - booked;

  const stageSum = (st: any) => withEcl.filter((b: any) => b.stage === st).reduce((s: any, b: any) => s + b.ecl, 0);
  const segs = [
    { label: 'Stage 1', value: stageSum(1), color: '#1f7a4d' },
    { label: 'Stage 2', value: stageSum(2), color: '#c79a1e' },
    { label: 'Stage 3', value: stageSum(3), color: '#b3261e' },
  ];
  const stageColor = { 1: 'green', 2: 'amber', 3: 'red' };
  const rp = (x: any) => 'Rp ' + fmt(x);

  return (
    <>
      <SubBar moduleId="ecl" right={
        <div className="row gap8 ac">
          <Badge kind="blue">PSAK 71 · ECL</Badge>
          <Btn sm onClick={() => nav('psak71', { from: 'ecl' })}><I.coins size={13} /> Modul PSAK 71</Btn>
          <Btn sm onClick={() => nav('psak46', { from: 'ecl' })}><I.receipt size={13} /> Dampak Pajak Tangguhan</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja B-7</Btn>
          <Btn sm variant="primary"><I.ledger size={14} /> Usulkan AJE</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={rp(totalGross / 1e6) + ' jt'} label="Eksposur Bruto" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={rp(totalEcl / 1e6) + ' jt'} label="ECL per Model" accent="var(--blue)" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={rp(booked / 1e6) + ' jt'} label="CKPN Dibukukan Klien" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={(diff >= 0 ? '+' : '') + rp(diff / 1e6) + ' jt'} label="Selisih (Under/Over)" accent={Math.abs(diff) > 100e6 ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr', gap: 12, alignItems: 'start' }}>
            <Panel title="Matriks Provisi — Aging × Loss Rate" sub="Ubah loss rate untuk recalc otomatis">
              <table className="dtbl">
                <thead><tr>
                  <th>Bucket Umur</th><th>Stage</th><th className="num">Eksposur Bruto</th><th className="num" style={{ width: 130 }}>Loss Rate (%)</th><th className="num">ECL (Rp)</th>
                </tr></thead>
                <tbody>
                  {withEcl.map((b: any) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.label}</td>
                      <td><Badge kind={(stageColor as any)[b.stage]}>Stage {b.stage}</Badge></td>
                      <td className="num">{fmt(b.gross)}</td>
                      <td className="num">
                        <input type="number" value={b.rate} step="0.5" onChange={(e: any) => setRate(b.id, +e.target.value)}
                          className="input mono" style={{ width: 80, height: 24, textAlign: 'right', padding: '0 7px' }} />
                      </td>
                      <td className="num" style={{ fontWeight: 700, color: 'var(--blue)' }}>{fmt(b.ecl)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={2}>TOTAL</td><td className="num">{fmt(totalGross)}</td><td className="num">{(totalEcl / totalGross * 100).toFixed(1)}%</td><td className="num">{fmt(totalEcl)}</td></tr>
                </tfoot>
              </table>
            </Panel>

            <div className="grid" style={{ gap: 12 }}>
              <Panel title="Komposisi ECL per Stage">
                <div className="row gap12 ac">
                  <Donut segments={segs} size={104} thickness={15}
                    center={<><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{fmt(totalEcl / 1e6)}jt</div><div className="tiny muted">total</div></>} />
                  <div style={{ flex: 1 }}>
                    {segs.map(s => (
                      <div key={s.label} className="row jb ac" style={{ padding: '4px 0' }}>
                        <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} /><span style={{ fontSize: 12 }}>{s.label}</span></span>
                        <span className="mono" style={{ fontWeight: 700 }}>{fmt(s.value / 1e6)}jt</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel title="Kesimpulan Audit">
                <div className="panel" style={{ padding: '11px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                  <div className="row gap8">
                    <span style={{ color: 'var(--amber)' }}><I.alert size={16} /></span>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                      CKPN klien <b>{rp(booked)}</b> lebih rendah <b>{rp(Math.abs(diff))}</b> dari model ECL. Diusulkan
                      <b> AJE-02</b> untuk menambah cadangan sesuai PSAK 71.
                    </div>
                  </div>
                </div>
                <div className="row gap8" style={{ marginTop: 12 }}>
                  <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => nav('aje')}><I.ledger size={14} /> Buat AJE-02</Btn>
                  <Btn sm style={{ flex: 1 }}><I.sparkle size={14} /> Telaah AI</Btn>
                </div>
                <div onClick={() => nav('psak46', { from: 'ecl' })} className="row ac jb" style={{ marginTop: 10, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--green)', background: 'var(--surface)', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600 }}>Dampak pajak tangguhan (PSAK 46)</div>
                    <div className="tiny muted">CKPN Rp {fmt(AMS_CANON.FIG.ckpn)} jt × 22% — belum deductible fiskal</div>
                  </div>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--green)', whiteSpace: 'nowrap' }}>DTA Rp {fmt(Math.round(AMS_CANON.FIG.ckpn * AMS_CANON.RATE))} jt <I.arrowRight size={12} /></span>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---- helpers bersama (dipakai lintas modul via import dari './view_calc') ---- */
function Kv({ label, v }: any) { return <div><div className="tiny" style={{ color: '#9fc0d2' }}>{label}</div><div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{v}</div></div>; }
function RowKv({ label, v, strong }: any) {
  return <div className="row jb ac"><span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{label}</span><span className="mono" style={{ fontWeight: strong ? 700 : 600, fontSize: strong ? 14 : 12.5, color: strong ? 'var(--navy)' : 'inherit' }}>{v}</span></div>;
}

Object.assign(window, { ECLCalculator, Kv, RowKv });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ECLCalculator, Kv, RowKv };
