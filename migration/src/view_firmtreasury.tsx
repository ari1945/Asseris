/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { BO } from './data_backoffice';
import { FIRMFIN, cashWatchFloorJt } from './data_firmfin';
import { CASH_SCENARIOS, cashForecast, scenarioByKey, type ForecastRow, type ForecastSeedRow } from './treasury_forecast';
import { assetsAt, activeAssets, duplicateCandidates, rollForward, type AssetComputed, type AssetRegister, type DisposalRef, type RollForward } from './data_fixedassets';
import { useFirmCoa } from './use_firm_coa';
import { useBankRecon } from './use_bank_recon';
import { fxRevaluation, type FxPosition, type FxRevalRow } from './canon_fx';
import { bankReconExportModel, type ReconExportAccount } from './bank_recon_export';
import { reconMatchTrail } from './bank_recon_actor';
import { useAmsPersist, useAudit, useAuth, useFirm } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Seg, Stat, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';
import { amsExportXlsx } from './export_xlsx';
import { CAP } from './rbac';

/* ============================================================
   Asseris — Firm Finance (ERP): Treasury, Cash & Bank, Assets
   Anggaran & Forecast · Arus Kas · Rekonsiliasi Bank (multi-ccy) ·
   Register Aset Tetap kantor.
   ============================================================ */
const { useState: useStateTR, useMemo: useMemoTR } = React;

const CCY_SYMBOL = { IDR: 'Rp', USD: 'US$', SGD: 'S$', EUR: '€' };

/* ============================================================
   Anggaran, Forecast & Arus Kas
   Skenario, deret berjalan, zona perhatian & pelabelan periode kini hidup di
   `treasury_forecast.ts` (murni, dapat diuji) — bukan di dalam JSX ini.
   ============================================================ */
/* PENGUNGKAPAN BASIS FORECAST (prompt 31-treasury TR1).

   Catatan kaki lama menjelaskan mekanika skenario (×inF/×outF) dan ambang zona
   perhatian — teliti, dan justru karena itu menyesatkan: pembacanya menyimpulkan
   bahwa yang disintesis hanyalah faktor skenarionya. Yang tidak disebut sama
   sekali adalah hal yang paling mendasar — seluruh deret dasarnya angka seed.

   Kalimat ini ikut masuk payload ekspor, bukan hanya tampil di layar. */
const FORECAST_BASIS_NOTE =
  'Seluruh deret di bawah — saldo awal, arus masuk, dan arus keluar enam bulan — adalah ANGKA SEED demo '
  + '(AMS.CASH_FORECAST), BUKAN turunan jatuh tempo piutang, utang usaha, dan kewajiban pajak yang '
  + 'sebenarnya sudah ada di aplikasi ini. Skenario mengalikan deret itu; ia tidak membuatnya menjadi '
  + 'turunan. Penggantinya sudah disetujui: forecast berbasis register (PRD firm-erp-deepening PR-6) — '
  + 'basis = akun kontrol kas, arus masuk/keluar dari jatuh tempo AR/AP/pajak, dan skenario menjadi '
  + 'asumsi bernama atas komponen alih-alih pengali datar.';

/** Tombol baris anggaran: tampil sebagai teks, berperilaku sebagai tombol. */
const budLineBtnStyle: Record<string, string | number> = {
  background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer',
  color: 'var(--ink)', fontWeight: 600, textAlign: 'left', width: '100%',
};

function FirmTreasury() {
  const { fmt } = AMS;
  const F = AMS.CASH_FORECAST as unknown as ForecastSeedRow[];
  const fy = AMS.FIRM_BUDGET_FY as unknown as number;
  const [tab, setTab] = useStateTR('budget');
  const [scenario, setScenario] = useStateTR('base');
  const [selLine, setSelLine] = useStateTR(null);

  /* Aktual = saldo akun buku besar, bukan kolom literal (PRD budget-actual-ledger-derived).
     Modul ini dulu membaca `AMS.FIRM_BUDGET` mentah dan menjumlahkan `actual` sendiri —
     salinan keempat dari aritmetika yang sudah ada di `FIRMFIN.budget()`. Seluruh tab
     Anggaran (headline, tabel, ekspor, drill-down) karena itu membeku saat jurnal
     diposting. `B` kini baris yang SUDAH diperkaya aktual turunan. */
  const { coa } = useFirmCoa();
  const bud: any = FIRMFIN.budget({ coa });
  const B: any = bud.lines;
  /* Identitas penerbit segel dari SSOT — bukan literal. Tanpa identitas, kertas
     kerja tidak disegel (pola yang sama dipakai ekspor rekonsiliasi di berkas ini). */
  const firmCtx = useFirm() as { firm?: { name?: string } } | null;
  const firmName = String((firmCtx && firmCtx.firm && firmCtx.firm.name) || '');
  /* Angka pembanding untuk pengungkapan basis: saldo akun kontrol kas menurut buku
     besar. Ia BUKAN dipakai menghitung forecast — ia dipakai memperlihatkan bahwa
     saldo awal seed tidak berasal dari sana. */
  const kasKontrol = (FIRMFIN.cash({ coa }) as { control: number }).control;
  const rev = B.filter((b: any) => b.type === 'rev');
  const cost = B.filter((b: any) => b.type === 'cost');
  const budRev = bud.budRev, actRev = bud.actRev;
  const budCost = bud.budCost, actCost = bud.actCost;
  const budProfit = bud.budProfit, actProfit = bud.actProfit;

  /* Seluruh derivasi arus kas datang dari satu fungsi murni: skenario, deret
     berjalan, penanda zona perhatian, dan label periode. Ambangnya adalah
     KEBIJAKAN firma (`FIRM_CASH_POLICY`), bukan angka di dalam JSX. */
  const sc = scenarioByKey(scenario);
  const fcast = cashForecast(F, sc, { today: String(AMS.TODAY), watchFloor: cashWatchFloorJt() });
  const fc = fcast.rows;
  const minClose = fcast.minClose;
  const runway = fcast.runway;
  const netGen = fcast.netGen;

  const tabs = [{ id: 'budget', label: 'Anggaran vs Aktual' }, { id: 'cash', label: 'Forecast Arus Kas' }];

  const { rp } = AMS;
  const onExport = async () => {
    const budRows: (string | number)[][] = [];
    for (const b of B) budRows.push([b.line, b.type === 'rev' ? 'Pendapatan' : 'Beban', rp(b.budget), rp(b.actual), rp(b.actual - b.budget), (b.actual / b.budget * 100).toFixed(0) + '%']);
    budRows.push(['LABA OPERASI', '', rp(budProfit), rp(actProfit), rp(actProfit - budProfit), '']);
    const cashRows: (string | number)[][] = [];
    for (const r of fc) cashRows.push([r.period, r.open, r.inflow, r.outflow, r.net, r.close]);
    await amsExportXlsx({
      kind: 'firm-treasury', scope: 'firm',
      fileName: 'Anggaran & Arus Kas Firma.xlsx',
      firm: firmName,
      title: 'Anggaran vs Aktual & Forecast Arus Kas',
      meta: [
        `FY${fy} · laba operasi aktual Rp ${fmt(actProfit / 1e9, 1)} M · cash runway ${runway.toFixed(1)} bln · skenario ${sc.label}`,
        /* Pengungkapan ikut keluar bersama angkanya — kertas kerja yang beredar
           tanpa basisnya adalah bentuk yang paling mudah disalahbaca. */
        FORECAST_BASIS_NOTE,
        fcast.aligned ? `Periode mengikuti klok ${String(AMS.TODAY)}.` : fcast.note,
      ],
      sheets: [
        { name: 'Anggaran vs Aktual', columns: ['Pos Anggaran', 'Jenis', 'Anggaran', 'Aktual', 'Varians', 'Realisasi'], rows: budRows, colWidths: [30, 12, 20, 20, 20, 11] },
        { name: 'Forecast Arus Kas (Rp jt)', columns: ['Bulan', 'Saldo Awal', 'Arus Masuk', 'Arus Keluar', 'Arus Bersih', 'Saldo Akhir'], rows: cashRows, colWidths: [14, 14, 14, 14, 14, 14] },
      ],
    });
  };
  const VarCell = ({ b, a, cost }: any) => {
    const v = a - b; const adverse = cost ? v > 0 : v < 0;
    return <span className="mono" style={{ color: Math.abs(v) < 1e6 ? 'var(--ink-3)' : adverse ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{v >= 0 ? '+' : '−'}{fmt(Math.abs(v) / 1e6, 0)}</span>;
  };

  return (
    <>
      <SubBar moduleId="treasury" right={<div className="row gap8 ac"><Badge kind="gray">{'FY' + fy}</Badge><Btn sm disabled={!firmName} onClick={onExport} title={firmName ? 'Ekspor anggaran & arus kas (XLSX tersegel)' : 'Identitas firma tak tersedia — kertas kerja tidak disegel tanpa penerbit'}><I.download size={13} /> Export</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(actRev / 1e9, 1) + ' M'} label="Pendapatan Aktual" delta={((actRev / budRev - 1) * 100).toFixed(1) + '% vs anggaran'} deltaDir={actRev >= budRev ? 'up' : 'down'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(actProfit / 1e9, 1) + ' M'} label="Laba Operasi Aktual" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(minClose / 1e3, 1) + ' M'} label="Proyeksi Kas Terendah (6 bln)" accent={fcast.minCloseWatch ? 'var(--amber)' : 'var(--blue)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={runway.toFixed(1) + ' bln'} label="Cash Runway (kas ÷ beban bln)" accent="var(--green)" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'budget' && (
            <div className="grid" style={{ gridTemplateColumns: selLine ? '1fr 320px' : '1fr', gap: 0, alignItems: 'stretch' }}>
              <div style={{ minWidth: 0, borderRight: selLine ? '1px solid var(--line)' : 'none' }}>
                <table className="dtbl">
                  <thead><tr><th>Pos Anggaran (P&L)</th><th className="num">Anggaran</th><th className="num">Aktual</th><th className="num">Varians</th><th style={{ width: 160 }}>Realisasi</th></tr></thead>
                  <tbody>
                    <tr className="group-row"><td colSpan={5}>Pendapatan</td></tr>
                    {rev.map((b: any) => (
                      <tr key={b.line} className={selLine === b.line ? 'sel' : ''}><td><button type="button" className="bud-line-btn" style={budLineBtnStyle} aria-expanded={selLine === b.line}
                        title={selLine === b.line ? 'Tutup fasing & pendorong varians ' + b.line : 'Buka fasing & pendorong varians ' + b.line}
                        onClick={() => setSelLine(selLine === b.line ? null : b.line)}>{b.line}</button></td><td className="num">{fmt(b.budget / 1e6, 0)}</td><td className="num">{fmt(b.actual / 1e6, 0)}</td><td className="num"><VarCell b={b.budget} a={b.actual} /></td>
                        <td><div className="row ac gap6"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, b.actual / b.budget * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--green-solid)' }} /></div><span className="tiny mono" style={{ width: 32 }}>{(b.actual / b.budget * 100).toFixed(0)}%</span></div></td></tr>
                    ))}
                    <tr className="group-row"><td colSpan={5}>Beban</td></tr>
                    {cost.map((b: any) => (
                      <tr key={b.line} className={selLine === b.line ? 'sel' : ''}><td><button type="button" className="bud-line-btn" style={budLineBtnStyle} aria-expanded={selLine === b.line}
                        title={selLine === b.line ? 'Tutup fasing & pendorong varians ' + b.line : 'Buka fasing & pendorong varians ' + b.line}
                        onClick={() => setSelLine(selLine === b.line ? null : b.line)}>{b.line}</button></td><td className="num">{fmt(b.budget / 1e6, 0)}</td><td className="num">{fmt(b.actual / 1e6, 0)}</td><td className="num"><VarCell b={b.budget} a={b.actual} cost /></td>
                        <td><div className="row ac gap6"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, b.actual / b.budget * 100) + '%', height: '100%', borderRadius: 3, background: b.actual > b.budget ? 'var(--red)' : 'var(--amber)' }} /></div><span className="tiny mono" style={{ width: 32 }}>{(b.actual / b.budget * 100).toFixed(0)}%</span></div></td></tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td>LABA OPERASI</td><td className="num">{fmt(budProfit / 1e6, 0)}</td><td className="num">{fmt(actProfit / 1e6, 0)}</td><td className="num"><VarCell b={budProfit} a={actProfit} /></td><td></td></tr></tfoot>
                </table>
                <div className="tiny muted" style={{ padding: '8px 12px' }}>Pilih pos anggaran (klik atau Enter) untuk melihat fasing triwulanan & pendorong varians · Rp jt</div>
              </div>
              {selLine && <BudgetLineDrill b={B.find((x: any) => x.line === selLine)} fy={fy} onClose={() => setSelLine(null)} />}
            </div>
          )}

          {tab === 'cash' && (
            <div style={{ padding: 14 }}>
              {/* TR1 — yang paling mendasar disebut LEBIH DULU. Catatan kaki di bawah
                  tetap menjelaskan mekanika skenario & ambang zona perhatian; yang
                  ditambahkan di sini adalah basis deretnya sendiri. */}
              <div className="tiny" style={{ marginBottom: 10, padding: '7px 10px', background: 'var(--amber-bg)', borderRadius: 4, color: 'var(--amber)', fontWeight: 600, lineHeight: 1.5 }}>
                <I.alert size={12} /> {FORECAST_BASIS_NOTE} Tandanya dapat dilihat langsung: saldo awal deret ini <b>Rp {fmt(fc.length ? fc[0].open / 1e3 : 0, 2)} M</b>, sementara akun kontrol kas di buku besar (1-101…1-106) menyatakan <b>Rp {fmt(kasKontrol / 1e9, 2)} M</b>.
              </div>
              {!fcast.aligned && (
                <div className="tiny" style={{ marginBottom: 10, padding: '7px 10px', background: 'var(--red-bg)', borderRadius: 4, color: 'var(--red)', fontWeight: 600, lineHeight: 1.5 }}>
                  <I.alert size={12} /> {fcast.note}
                </div>
              )}
              <div className="row jb ac" style={{ marginBottom: 12 }}>
                <div className="row gap8 ac"><span className="tiny muted upper">Skenario</span><Seg options={CASH_SCENARIOS.map((v) => ({ value: v.key, label: v.label }))} value={scenario} onChange={setScenario} /></div>
                <span className="tiny" style={{ color: netGen >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>Arus kas bersih 6 bln: {netGen >= 0 ? '+' : '−'}Rp {fmt(Math.abs(netGen) / 1e3, 1)} M</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 160, padding: '0 8px 8px', borderBottom: '1px solid var(--line)', marginBottom: 12 }}>
                {fc.map((r: any) => {
                  const max = Math.max(...fc.map((x: any) => x.close)) * 1.1;
                  return (
                    <div key={r.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                      <span className="mono tiny" style={{ fontWeight: 700, color: r.watch ? 'var(--amber)' : 'var(--navy)' }}>{fmt(r.close / 1e3, 1)}M</span>
                      <div style={{ width: '100%', maxWidth: 46, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 100 }}>
                        <div style={{ height: (r.close / max * 100) + '%', background: r.watch ? 'var(--amber-solid)' : 'var(--blue-solid)', borderRadius: '4px 4px 0 0' }} />
                      </div>
                      <span className="tiny muted">{r.m}</span>
                    </div>
                  );
                })}
              </div>
              <table className="dtbl">
                <thead><tr><th>Bulan</th><th className="num">Saldo Awal</th><th className="num">Arus Masuk</th><th className="num">Arus Keluar</th><th className="num">Arus Bersih</th><th className="num">Saldo Akhir</th></tr></thead>
                <tbody>
                  {fc.map((r: any) => (
                    <tr key={r.m}><td style={{ fontWeight: 600 }}>{r.period}</td><td className="num muted">{fmt(r.open, 0)}</td><td className="num" style={{ color: 'var(--green)' }}>+{fmt(r.inflow, 0)}</td><td className="num" style={{ color: 'var(--red)' }}>({fmt(r.outflow, 0)})</td><td className="num" style={{ fontWeight: 600, color: r.net >= 0 ? 'var(--green)' : 'var(--red)' }}>{r.net >= 0 ? '+' : '−'}{fmt(Math.abs(r.net), 0)}</td><td className="num" style={{ fontWeight: 700, color: r.watch ? 'var(--amber)' : 'inherit' }}>{fmt(r.close, 0)}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="tiny muted" style={{ marginTop: 8 }}>Nilai dalam jutaan Rupiah · forecast bergulir 6 bulan · skenario <b>{sc.label}</b> menyesuaikan arus masuk ×{sc.inF} & arus keluar ×{sc.outF}. Saldo &lt; Rp {fmt(fcast.watchFloor / 1e3, 0)} M ditandai sebagai zona perhatian — ambang <b>kebijakan</b> firma (FIRM_CASH_POLICY), dasar penetapannya belum dinyatakan.</div>
            </div>
          )}
        </Panel>
      </div></div>
    </>
  );
}

function BudgetLineDrill({ b, fy, onClose }: any) {
  const { fmt } = AMS;
  const isCost = b.type === 'cost';
  // synthesize quarterly phasing
  const wq = [0.22, 0.26, 0.25, 0.27];
  const aShift = b.actual / b.budget;
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => ({ q, bud: Math.round(b.budget * wq[i]), act: Math.round(b.actual * wq[i] * (1 + (i - 1.5) * 0.02)) }));
  const variance = b.actual - b.budget;
  const adverse = isCost ? variance > 0 : variance < 0;
  const drivers: [string, number][] = isCost
    ? [['Kenaikan harga / inflasi', 0.45], ['Volume aktivitas', 0.35], ['Timing pengeluaran', 0.20]]
    : [['Volume perikatan', 0.55], ['Tarif & realisasi', 0.30], ['Bauran jasa', 0.15]];
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{b.line}</div><div className="tiny muted">{isCost ? 'Beban' : 'Pendapatan'} · fasing triwulanan</div></div>
        <button aria-label="Tutup" className="top-btn" onClick={onClose}><I.x size={16} /></button>
      </div>
      <div style={{ padding: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <KvBox label="Anggaran" v={'Rp ' + fmt(b.budget / 1e6, 0) + ' jt'} />
          <KvBox label="Aktual" v={'Rp ' + fmt(b.actual / 1e6, 0) + ' jt'} />
          <KvBox label="Varians" v={(variance >= 0 ? '+' : '−') + fmt(Math.abs(variance) / 1e6, 0) + ' jt'} accent={adverse ? 'var(--red)' : 'var(--green)'} />
          <KvBox label="Realisasi" v={(b.actual / b.budget * 100).toFixed(0) + '%'} />
        </div>
        <div className="tiny muted upper" style={{ marginBottom: 8 }}>Fasing Triwulanan</div>
        <table className="dtbl" style={{ marginBottom: 14 }}>
          <thead><tr><th>Kuartal</th><th className="num">Anggaran</th><th className="num">Aktual</th><th className="num">Var</th></tr></thead>
          <tbody>
            {quarters.map((q: any) => {
              const v = q.act - q.bud; const adv = isCost ? v > 0 : v < 0;
              return <tr key={q.q}><td style={{ fontWeight: 600 }}>{q.q + ' ' + fy}</td><td className="num">{fmt(q.bud / 1e6, 0)}</td><td className="num">{fmt(q.act / 1e6, 0)}</td><td className="num mono" style={{ color: adv ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{v >= 0 ? '+' : '−'}{fmt(Math.abs(v) / 1e6, 0)}</td></tr>;
            })}
          </tbody>
        </table>
        <div className="tiny muted upper" style={{ marginBottom: 8 }}>Pendorong Varians</div>
        {drivers.map(([d, w]: [string, any]) => (
          <div key={d} style={{ marginBottom: 8 }}>
            <div className="row jb tiny" style={{ marginBottom: 3 }}><span>{d}</span><span className="mono" style={{ fontWeight: 700 }}>{(w * 100).toFixed(0)}%</span></div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (w * 100) + '%', height: '100%', borderRadius: 3, background: adverse ? 'var(--red)' : 'var(--green)' }} /></div>
          </div>
        ))}
        <div className="tiny" style={{ marginTop: 8, padding: '6px 9px', background: 'var(--amber-bg)', borderRadius: 4, color: 'var(--amber)', fontWeight: 600, lineHeight: 1.5 }}><I.alert size={11} /> Fasing triwulanan & bobot pendorong ini ILUSTRASI demo (sintesis) — belum diturunkan dari buku besar/ledger (roadmap Ledger-based Reporting).</div>
      </div>
    </div>
  );
}

/* ============================================================
   Kas, Bank & Rekonsiliasi (multi-currency)
   ============================================================ */
/* Historical booking rate for valas (avg cost) — for unrealized FX reval */
/* Kurs buku pindah ke SSOT (`AMS.FX_BOOK`) — dulu konstanta PRIVAT di sini, sehingga
   lapisan kanon tak bisa membandingkan sisi bank & sisi buku pada dasar yang sama. */

function CashBank() {
  const { fmt } = AMS;
  const accts: any = AMS.BANK_ACCOUNTS;
  const [tab, setTab] = useStateTR('positions');
  /* Rekonsiliasi PER REKENING (PRD cash-bank-reconciliation-register). Dulu satu objek
     `BANK_RECON` untuk satu rekening, dengan `bookBalance` LITERAL. Kini sisi buku
     diturunkan dari akun buku besar rekening ybs., dan overrides `matched` disalurkan
     ke ctx FIRMFIN supaya pencocokan di sini benar-benar menggeser residual Kas. */
  const { coa } = useFirmCoa();
  const { lines, setLines } = useBankRecon();
  const per: any[] = useMemoTR(() => FIRMFIN.bankRecon({ coa, reconLines: lines }) as any[], [coa, lines]);
  const [selAcct, setSelAcct] = useStateTR(per[0] ? per[0].id : '');
  const R: any = per.find((p: any) => p.id === selAcct) || per[0];
  /* SoD finansial (Program E): pencocokan rekonsiliasi = FIRMFIN_EDIT (server
     capForWrite sudah menegakkan 'bankrecon'; gate UI mencegah ditolak senyap). */
  const auth = useAuth();
  const canEdit = !!(auth && typeof auth.can === 'function' && auth.can(CAP.FIRMFIN_EDIT));
  const { logActivity } = useAudit();
  /* Identitas sesi NYATA (W7) — dibaca langsung, bukan lewat `useCurrentAuditor()`
     yang sendiri jatuh ke `AMS.USER.name` (data seed, sama untuk siapa pun yang
     login). Tanpa identitas, pencocokan TIDAK dicatat; lihat `bank_recon_actor`. */
  const sessionName = String((auth && auth.user && auth.user.name) || '');
  const firmCtx = useFirm() as { firm?: { name?: string } } | null;
  const firmName = String((firmCtx && firmCtx.firm && firmCtx.firm.name) || '');

  /* Ekuivalen IDR TIDAK dihitung ulang di sini: `bankIDR` sudah datang dari
     `FIRMFIN.bankRecon()` pada kurs penutup periode yang direkonsiliasi, dan itu
     angka yang sama yang dipakai baris Kas di Sumber Kebenaran. */
  const totalIDR = per.reduce((s: number, p: any) => s + p.bankIDR, 0);
  const totalKnown = Number.isFinite(totalIDR);

  const toggleMatch = (id: any) => {
    if (!canEdit) return;
    const l = lines.find((x: { id: string }) => x.id === id);
    setLines((list: any) => list.map((x: { id: string; matched: boolean }) => x.id === id ? { ...x, matched: !x.matched } : x));
    const trail = reconMatchTrail(sessionName, l, !(l && l.matched));
    if (trail && logActivity) logActivity({ who: trail.who, action: trail.action, detail: trail.detail });
  };
  /* Aritmetikanya TIDAK dihitung ulang di sini — seluruhnya datang dari
     `FIRMFIN.bankRecon()`, supaya layar ini dan baris Kas di Firm Finance mustahil
     menyatakan hal yang berbeda untuk rekening yang sama. */
  const unrec = per.reduce((n: number, p: any) => n + p.openCount, 0);
  const accLines = R ? R.lines : [];
  const adjustedBook = R ? R.adjustedBook : 0;
  const adjustedBank = R ? R.adjustedBank : 0;
  const reconciled = !!R && R.reconciled;
  const belumSeimbang = per.filter((p: any) => !p.reconciled).length;

  /* REVALUASI VALAS pada KLOK SSOT — kurs dipilih dari registry bermasa berlaku
     (`canon_fx`, terdaftar di katalog regref dengan enforcement `block`). Bila
     tanggal itu tak tercakup, `covered` false dan `total` NULL: perhitungan
     BERHENTI dan menyatakan sebabnya, alih-alih merevaluasi pada kurs Maret 2026
     selamanya — dan sejak #249 hasilnya benar-benar dibukukan (JV-0319/0320). */
  const valas = accts.filter((a: any) => a.ccy !== 'IDR');
  const fxrv = fxRevaluation(accts as FxPosition[], String(AMS.TODAY));
  const reval = fxrv.rows;
  const totReval = fxrv.total;
  const revalKnown = fxrv.covered && totReval != null;

  const exportRecon = async (rows: ReconExportAccount[]) => {
    await amsExportXlsx(bankReconExportModel({
      accounts: rows, firmName, preparedOn: String(AMS.TODAY), preparedBy: sessionName,
    }));
  };

  const tabs = [{ id: 'positions', label: 'Posisi Kas & Bank' }, { id: 'recon', label: 'Rekonsiliasi Bank', count: unrec }, { id: 'fx', label: 'Revaluasi Valas', count: valas.length }];

  return (
    <>
      {/* Chip "Bank feed: 15 mnt lalu" DICABUT (PRD cash-bank-reconciliation-register Q-6):
          tak ada integrasi bank apa pun, dan ia berdiri persis di atas layar rekonsiliasi
          yang justru bergantung pada saldo bank sebagai data eksternal yang tepercaya. */}
      <SubBar moduleId="cashbank" right={<div className="row gap8 ac"><span className="chip tiny muted" title="Read-only — entri transaksi kas/bank dikelola di CoreSys (roadmap)"><I.lock size={11} /> Read-only</span></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }} title={totalKnown ? 'Σ saldo menurut bank pada kurs penutup periode yang direkonsiliasi' : 'Tak dapat dinyatakan: kurs periode ini tak tercakup registry'}><Stat value={totalKnown ? 'Rp ' + fmt(totalIDR / 1e9, 2) + ' M' : '—'} label="Total Kas (ekuivalen IDR)" accent={totalKnown ? undefined : 'var(--red)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={accts.length} label="Rekening Aktif" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }} title={revalKnown ? '' : fxrv.note}><Stat value={revalKnown ? (totReval! >= 0 ? '+' : '−') + 'Rp ' + fmt(Math.abs(totReval!) / 1e6, 0) + ' jt' : '—'} label="Selisih Kurs Diakui (GL 5-600)" accent={!revalKnown ? 'var(--red)' : totReval! >= 0 ? 'var(--green)' : 'var(--red)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={unrec} label="Item Belum Direkonsiliasi" accent={unrec ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'positions' && (
            <table className="dtbl">
              <thead><tr><th>Rekening</th><th>No.</th><th>Mata Uang</th><th className="num">Saldo</th><th className="num">Kurs</th><th className="num">Ekuivalen IDR</th><th style={{ width: 90 }}>Porsi</th></tr></thead>
              <tbody>
                {per.map((a: any) => (
                  <tr key={a.id}>
                    <td><div className="row ac gap8"><span style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--navy-solid)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{a.bank.slice(0, 3).toUpperCase()}</span><div><div style={{ fontWeight: 600, fontSize: 12 }}>{a.name}</div><div className="tiny muted">{a.bank}</div></div></div></td>
                    <td className="mono tiny muted">{a.no}</td>
                    <td><span className="chip tiny">{a.ccy}</span></td>
                    <td className="num" style={{ fontWeight: 600 }}>{(CCY_SYMBOL as any)[a.ccy]} {fmt(a.balance, 0)}</td>
                    <td className="num tiny muted" title={a.fxCovered ? 'Kurs penutup ' + a.period : a.fxNote}>{a.ccy === 'IDR' ? '—' : a.fxCovered ? fmt(a.closingRate, 0) : 'tak tercakup'}</td>
                    <td className="num">{a.fxCovered ? fmt(a.bankIDR / 1e6, 0) + ' jt' : '—'}</td>
                    <td><div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}>{totalKnown && a.fxCovered && <div style={{ width: (a.bankIDR / totalIDR * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--blue-solid)' }} />}</div></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={5}>TOTAL EKUIVALEN IDR</td><td className="num">{totalKnown ? fmt(totalIDR / 1e6, 0) + ' jt' : '—'}</td><td></td></tr></tfoot>
            </table>
          )}

          {tab === 'recon' && (
            <div style={{ padding: 14 }}>
              {/* Satu rekonsiliasi PER REKENING. Dulu hanya BCA-OPS yang punya, karena
                  buku besar cuma punya satu akun kas untuk enam rekening. */}
              <div className="row gap6 ac" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                {per.map((p: any) => (
                  <Btn key={p.id} sm variant={p.id === selAcct ? 'primary' : 'ghost'} onClick={() => setSelAcct(p.id)}
                    title={p.name + ' · GL ' + p.acct + (p.reconciled ? ' · seimbang' : ' · belum dijelaskan')}>
                    {p.bank} {p.name}
                    <span style={{ marginLeft: 6, color: p.reconciled ? 'var(--green)' : 'var(--red)' }}>●</span>
                    {p.openCount > 0 && <span className="tiny muted" style={{ marginLeft: 4 }}>{p.openCount}</span>}
                  </Btn>
                ))}
                <span className="tiny muted" style={{ marginLeft: 'auto' }}>
                  {belumSeimbang === 0 ? 'Seluruh rekening menutup' : belumSeimbang + ' rekening belum menutup'} · {unrec} item terbuka
                </span>
                {/* Kertas kerja rekonsiliasi TIDAK tunduk gerbang Q-2: yang dikunci selisih
                    akun kontrol adalah PERNYATAAN POSISI (Neraca Saldo & LK). Rekonsiliasi
                    adalah alat penelusuran selisih itu — menguncinya mencabut satu-satunya
                    dokumen yang menjelaskan mengapa penguncian terjadi. Keadaannya dinyatakan
                    DI DALAM payload, bukan ditolak keluar. */}
                <Btn sm variant="ghost" disabled={!R || !firmName} onClick={() => R && exportRecon([R])}
                  title={firmName ? 'Ekspor kertas kerja rekonsiliasi rekening ini (XLSX tersegel)' : 'Identitas firma tak tersedia — kertas kerja tidak disegel tanpa penerbit'}>
                  <I.download size={12} /> Ekspor rekening ini
                </Btn>
                <Btn sm variant="ghost" disabled={!per.length || !firmName} onClick={() => exportRecon(per)}
                  title={firmName ? 'Ekspor kertas kerja seluruh rekening (XLSX tersegel)' : 'Identitas firma tak tersedia — kertas kerja tidak disegel tanpa penerbit'}>
                  <I.download size={12} /> Seluruh rekening
                </Btn>
              </div>
              <div className="row jb ac" style={{ marginBottom: 12 }}>
                <div><div style={{ fontWeight: 700, fontSize: 13 }}>Rekonsiliasi — {R ? R.name : '—'} <span className="tiny muted">({R ? R.id : '—'} · GL {R ? R.acct : '—'})</span></div><div className="tiny muted">{canEdit ? 'Periode ' + (R ? R.period : '—') + ' · klik baris untuk tandai cocok/belum' : 'Periode ' + (R ? R.period : '—') + ' · tampilan read-only — pencocokan dibatasi peran Finance Firma / Partner'}</div></div>
                <span className={'badge b-' + (reconciled ? 'green' : 'red')} style={{ padding: '3px 10px' }}>{reconciled ? <><I.check size={12} /> Seimbang</> : 'BELUM DIJELASKAN Rp ' + fmt(Math.abs(adjustedBank - adjustedBook) / 1e6, 1) + ' jt'}</span>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div className="panel" style={{ padding: 12 }}>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Saldo per Bank</div>
                  <RowKv label={'Saldo rekening koran' + (R && R.ccy !== 'IDR' ? ' (ekuiv. kurs penutup)' : '')} v={'Rp ' + fmt((R ? R.bankIDR : 0) / 1e6, 1) + ' jt'} />
                  {accLines.filter((l: any) => !l.matched && (l.ref === 'outstanding' || l.ref === 'transit')).map((l: any) => <RowKv key={l.id} label={(l.ref === 'outstanding' ? '− Cek beredar' : '+ Setoran transit')} v={(l.amount < 0 ? '(' : '') + fmt(Math.abs(l.amount) / 1e6, 1) + (l.amount < 0 ? ')' : '') + ' jt'} />)}
                  <div className="divider" />
                  <RowKv label="Saldo bank disesuaikan" v={'Rp ' + fmt(adjustedBank / 1e6, 1) + ' jt'} strong />
                </div>
                <div className="panel" style={{ padding: 12 }}>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Saldo per Buku (GL)</div>
                  <RowKv label={'Saldo buku besar (' + (R ? R.acct : '—') + ')'} v={'Rp ' + fmt((R ? R.bookIDR : 0) / 1e6, 1) + ' jt'} />
                  {accLines.filter((l: any) => !l.matched && l.ref !== 'outstanding' && l.ref !== 'transit').map((l: any) => <RowKv key={l.id} label={(l.amount < 0 ? '− ' : '+ ') + String(l.desc).slice(0, 22)} v={(l.amount < 0 ? '(' : '') + fmt(Math.abs(l.amount) / 1e6, 1) + (l.amount < 0 ? ')' : '') + ' jt'} />)}
                  <div className="divider" />
                  <RowKv label="Saldo buku disesuaikan" v={'Rp ' + fmt(adjustedBook / 1e6, 1) + ' jt'} strong />
                </div>
              </div>
              <table className="dtbl">
                <thead><tr><th>Tanggal</th><th>Keterangan (rekening koran)</th><th className="num">Jumlah</th><th>Ref. GL</th><th>Status</th></tr></thead>
                <tbody>
                  {accLines.map((l: any) => (
                    <tr key={l.id} onClick={() => canEdit && toggleMatch(l.id)} style={{ cursor: canEdit ? 'pointer' : 'default' }}>
                      <td className="mono tiny muted">{new Date(l.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                      <td>{l.desc}</td>
                      <td className="num" style={{ color: l.amount < 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{l.amount < 0 ? '(' + fmt(-l.amount / 1e6, l.amount > -1e7 ? 1 : 0) + ')' : fmt(l.amount / 1e6, l.amount < 1e7 ? 1 : 0)}</td>
                      <td className="mono tiny muted">{l.ref === 'outstanding' ? 'Cek beredar' : l.ref === 'transit' ? 'Transit' : l.ref || '—'}</td>
                      <td><Badge kind={l.matched ? 'green' : 'amber'}>{l.matched ? 'Cocok' : 'Belum'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'fx' && !revalKnown && (
            <div style={{ padding: 14 }}>
              {/* TAK TERCAKUP — dan karena itu TIDAK DIHITUNG. Bukan "0", bukan kurs
                  periode terakhir: hasil revaluasi masuk buku besar firma, jadi masa
                  yang tak terdaftar menghentikannya. */}
              <div className="panel" style={{ padding: '14px 16px', borderLeft: '3px solid var(--red)' }}>
                <div className="row ac gap8" style={{ marginBottom: 6 }}>
                  <Badge kind="red">Revaluasi dihentikan</Badge>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Kurs untuk {String(AMS.TODAY)} tidak terdaftar</span>
                </div>
                <p className="tiny" style={{ margin: '0 0 8px', lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 820 }}>{fxrv.note}</p>
                <p className="tiny" style={{ margin: 0, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 820 }}>
                  Masa berlaku yang terdaftar berakhir {fxrv.effective && fxrv.effective.to ? fxrv.effective.to : '—'}.
                  Selisih kurs diakui di <b>GL 5-600</b> dan dibukukan lewat jurnal revaluasi, sehingga menghitungnya
                  dengan kurs masa lain berarti memposting angka yang dasarnya sudah tidak berlaku. Daftarkan kurs
                  periode berjalan di <b>Data Referensi Regulatori</b> lebih dulu.
                </p>
              </div>
            </div>
          )}

          {tab === 'fx' && revalKnown && (
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper">Nilai Tercatat (kurs perolehan)</div><div className="mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--navy)' }}>Rp {fmt(reval.reduce((s: number, r: FxRevalRow) => s + r.bookIDR, 0) / 1e6, 0)} jt</div></div>
                <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper">Nilai Pasar (kurs penutup)</div><div className="mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--blue)' }}>Rp {fmt(reval.reduce((s: number, r: FxRevalRow) => s + r.mktIDR, 0) / 1e6, 0)} jt</div></div>
                <div className="panel" style={{ padding: 12, background: totReval! >= 0 ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}><div className="tiny muted upper">Laba/(Rugi) Selisih Kurs</div><div className="mono" style={{ fontSize: 19, fontWeight: 700, color: totReval! >= 0 ? 'var(--green)' : 'var(--red)' }}>{totReval! >= 0 ? '+' : '−'}Rp {fmt(Math.abs(totReval!) / 1e6, 0)} jt</div><div className="tiny muted">diakui di laba rugi · JV-0319 &amp; JV-0320</div></div>
              </div>
              <table className="dtbl">
                <thead><tr><th>Rekening</th><th>Mata Uang</th><th className="num">Saldo Valas</th><th className="num">Kurs Perolehan</th><th className="num">Kurs Penutup</th><th className="num">Nilai Tercatat</th><th className="num">Nilai Pasar</th><th className="num">Selisih Kurs</th></tr></thead>
                <tbody>
                  {reval.map((r: FxRevalRow) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.name} <span className="tiny muted">· {r.bank}</span></td>
                      <td><span className="chip tiny">{r.ccy}</span></td>
                      <td className="num">{(CCY_SYMBOL as any)[r.ccy]} {fmt(r.balance, 0)}</td>
                      <td className="num tiny muted">{fmt(r.bookRate, 0)}</td>
                      <td className="num tiny">{fmt(r.closingRate, 0)}</td>
                      <td className="num muted">{fmt(r.bookIDR / 1e6, 0)} jt</td>
                      <td className="num">{fmt(r.mktIDR / 1e6, 0)} jt</td>
                      <td className="num" style={{ fontWeight: 600, color: r.gain >= 0 ? 'var(--green)' : 'var(--red)' }}>{r.gain >= 0 ? '+' : '−'}{fmt(Math.abs(r.gain) / 1e6, 0)} jt</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={7}>TOTAL SELISIH KURS DIAKUI (GL 5-600)</td><td className="num" style={{ color: totReval! >= 0 ? 'var(--green)' : 'var(--red)' }}>{totReval! >= 0 ? '+' : '−'}{fmt(Math.abs(totReval!) / 1e6, 0)} jt</td></tr></tfoot>
              </table>
              <div className="panel" style={{ marginTop: 12, padding: '10px 13px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
                <div className="tiny" style={{ lineHeight: 1.55 }}>Revaluasi pada tanggal pelaporan (PSAK 10), memakai kurs yang berlaku {fxrv.effective ? fxrv.effective.from + ' – ' + (fxrv.effective.to || 'terbuka') : '—'}. Angka ini <b>sudah dibukukan</b>, bukan sekadar ditampilkan: <b>JV-0319</b> (BCA Valas USD) &amp; <b>JV-0320</b> (DBS SGD) mendebit akun kas valas lawan <b>5-600 Laba (Rugi) Selisih Kurs</b> sebesar Rp {fmt(Math.abs(totReval!) / 1e6, 1)} jt. Membatalkan posting keduanya mengembalikan buku ke kurs perolehan — dan rekonsiliasi rekening valas tidak lagi menutup.{fxrv.status === 'unverified' ? ' Dasar kutipan kurs belum dicocokkan dengan dokumen resminya (lihat Data Referensi Regulatori).' : ''}</div>
              </div>
            </div>
          )}
        </Panel>
      </div></div>
    </>
  );
}

/* ============================================================
   Register Aset Tetap kantor (depreciation)
   ============================================================ */
function FixedAssets() {
  const { fmt } = AMS;
  /* K-02/PR-B — anchor perhitungan depresiasi = klok SSOT AMS.TODAY (bukan literal beku). */
  const REF = new Date(AMS.TODAY);
  const [sel, setSel] = useStateTR(null);
  /* PRD firm-erp-deepening PR-1 — mesin penyusutan LOKAL di sini dicabut. Modul
     ini dulu menghitung garis lurus sendiri di atas register `AMS.FIXED_ASSETS`,
     sementara Operasi Firma menghitung garis lurus SENDIRI di atas register
     `BO.FIXED_ASSETS` yang berbeda isinya. Satu register, satu mesin. */
  /* Anotasi DI LUAR `useMemo` — alias hook React di repo ini tak bertipe, jadi
     hasilnya `any` dan seluruh callback hilir kehilangan tipenya. */
  const reg: AssetRegister = useMemoTR(
    () => assetsAt(REF, activeAssets((BO.DISPOSALS || []) as DisposalRef[])),
    [AMS.TODAY],
  );
  const rows: AssetComputed[] = reg.rows;
  const totCost = reg.totCost;
  const totAcc = reg.totAccDep;
  const totNbv = reg.totNbv;
  const totAnnual = reg.totAnnualDep;
  const cats = reg.byClass;
  const dups = useMemoTR(() => duplicateCandidates(), []);

  /* --- Roll-forward NBV: DIENUMERASI, bukan plug ---
     Dulu panel ini menulis `NBV awal = totNbv + totAnnual` dengan capex dan
     pelepasan dipaku Rp 0 — ia menutup SECARA ALJABAR (cacat #239). Mesinnya
     kini di `data_fixedassets.rollForward`, sama persis dengan yang dipakai
     lapisan Fasilitas: satu jawaban, dan ia BISA gagal. */
  const rollFwd: RollForward = useMemoTR(
    () => rollForward(REF, (BO.DISPOSALS || []) as DisposalRef[]),
    [AMS.TODAY],
  );

  /* Kontrol GL `1-400`. PR-1 hanya MENAMPILKAN selisihnya dengan jujur;
     penutupan (dan blokir ekspor, Q-2) adalah PR-2. */
  const glAset = (AMS.FIRM_COA as Array<{ code: string; bal: number }>).find((a) => a.code === '1-400');
  const glNbv = glAset ? glAset.bal : 0;
  const glGap = glNbv - totNbv;
  const glTied = Math.abs(glGap) < 1_000_000;

  const selRow = sel ? rows.find((r: any) => r.id === sel) : null;

  const { rp } = AMS;
  const onExportAssets = async () => {
    const assetRows: (string | number)[][] = [];
    for (const r of rows) assetRows.push([r.id, r.name, r.cat, r.standar, r.src === 'finance' ? 'Keuangan' : 'GA/Fasilitas', new Date(r.acq).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }), r.life + 'th', rp(r.cost), rp(r.accDep), rp(r.nbv), (r.pct * 100).toFixed(0) + '%']);
    assetRows.push(['TOTAL', '', '', '', '', '', '', rp(totCost), rp(totAcc), rp(totNbv), '']);
    const catRows: (string | number)[][] = [];
    for (const c of cats) catRows.push([c.cat, c.standar, c.n, rp(c.cost), rp(c.nbv)]);
    await amsExportXlsx({
      kind: 'firm-fixed-assets', scope: 'firm',
      fileName: 'Register Aset Tetap Kantor.xlsx',
      firm: 'KAP Wijaya Hartono & Rekan',
      title: 'Register Aset Tetap Kantor',
      meta: [`per ${REF.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · ${rows.length} aset · NBV Rp ${fmt(totNbv / 1e9, 2)} M · penyusutan Rp ${fmt(totAnnual / 1e6, 0)} jt/th · metode garis lurus`,
             glTied ? `Menutup ke kontrol GL 1-400.` : `TIDAK menutup ke kontrol GL 1-400 — selisih Rp ${fmt(glGap / 1e6, 0)} jt belum dijelaskan.`],
      sheets: [
        { name: 'Register Aset', columns: ['Kode', 'Aset', 'Kelas', 'Standar', 'Register Asal', 'Perolehan', 'Umur', 'Harga Perolehan', 'Ak. Penyusutan', 'Nilai Buku', 'Terpakai'], rows: assetRows, colWidths: [10, 30, 26, 10, 14, 12, 8, 20, 20, 20, 10] },
        { name: 'Ringkasan Kelas', columns: ['Kelas Aset', 'Standar', 'Jumlah', 'Harga Perolehan', 'Nilai Buku'], rows: catRows, colWidths: [26, 10, 10, 20, 20] },
      ],
    });
  };

  return (
    <>
      <SubBar moduleId="fixedassets" right={<div className="row gap8 ac"><Badge kind="blue">Garis Lurus</Badge><Btn sm onClick={onExportAssets}><I.download size={13} /> Daftar Aset</Btn><span className="chip tiny muted" title="Read-only — registrasi aset dikelola di CoreSys (roadmap)"><I.lock size={11} /> Read-only</span></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(totCost / 1e9, 2) + ' M'} label="Harga Perolehan" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(totAcc / 1e9, 2) + ' M'} label="Akumulasi Penyusutan" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(totNbv / 1e9, 2) + ' M'} label="Nilai Buku Neto" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(totAnnual / 1e6, 0) + ' jt'} label="Beban Penyusutan / Tahun" /></div></Panel>
        </div>

        {/* PR-1 — sub-buku vs akun kontrol, dinyatakan terus-terang. Modul ini dulu
            tak pernah menyebut `1-400` sama sekali, sehingga selisih 55% dari saldo
            kontrol tak terlihat di mana pun. */}
        <Panel title="Register ↔ Kontrol Buku Besar" sub="sub-buku PSAK 16/19 vs akun 1-400 Aset Tetap — neto">
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: glTied ? 0 : 10 }}>
            <RowKv label="Σ NBV register (13 aset)" v={'Rp ' + fmt(totNbv / 1e6, 0) + ' jt'} />
            <RowKv label="Kontrol GL 1-400" v={'Rp ' + fmt(glNbv / 1e6, 0) + ' jt'} />
            <RowKv label="Selisih belum dijelaskan" v={(glGap >= 0 ? '' : '(') + 'Rp ' + fmt(Math.abs(glGap) / 1e6, 0) + ' jt' + (glGap >= 0 ? '' : ')')} strong />
          </div>
          {glTied ? (
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>Sub-buku menutup ke akun kontrol dalam toleransi Rp 1 jt.</div>
          ) : (
            <div className="tiny" style={{ padding: '8px 11px', background: 'var(--red-bg)', borderRadius: 4, color: 'var(--red)', fontWeight: 600, lineHeight: 1.55 }}>
              <I.alert size={12} /> Sub-buku TIDAK menutup ke kontrol — selisih Rp {fmt(Math.abs(glGap) / 1e6, 0)} jt ({(Math.abs(glGap) / Math.abs(glNbv || 1) * 100).toFixed(0)}% dari saldo kontrol).
              Saldo <b>1-400</b> tidak pernah diturunkan dari register mana pun; ia literal. Penutupannya — pemisahan akun bruto/akumulasi
              dan pembukuan beban penyusutan — adalah PR-2 arc ini. Sampai itu selesai, angka neraca aset tetap firma <b>tidak didukung register</b>.
            </div>
          )}
        </Panel>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12, alignItems: 'start' }}>
          <Panel title="Roll-Forward Nilai Buku" sub={'12 bulan ke ' + REF.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · Rp jt'}>
            <div style={{ display: 'grid', gap: 7 }}>
              <RowKv label="NBV awal periode" v={'Rp ' + fmt(rollFwd.opening / 1e6, 0) + ' jt'} />
              <RowKv label="+ Penambahan (capex)" v={'Rp ' + fmt(rollFwd.capex / 1e6, 0) + ' jt'} />
              <RowKv label="− Beban penyusutan" v={'(Rp ' + fmt(rollFwd.depreciation / 1e6, 0) + ' jt)'} />
              <RowKv label="− Pelepasan / write-off" v={'(Rp ' + fmt(rollFwd.disposalNbv / 1e6, 0) + ' jt)'} />
              <div className="divider" />
              <RowKv label="NBV akhir menurut komponen" v={'Rp ' + fmt(rollFwd.computed / 1e6, 0) + ' jt'} strong />
              <RowKv label="NBV akhir menurut register" v={'Rp ' + fmt(totNbv / 1e6, 0) + ' jt'} strong />
              {!rollFwd.ties && (
                <div className="tiny" style={{ marginTop: 4, padding: '7px 10px', background: 'var(--red-bg)', borderRadius: 4, color: 'var(--red)', fontWeight: 600, lineHeight: 1.5 }}>
                  <I.alert size={12} /> Roll-forward TIDAK menutup — selisih Rp {fmt(rollFwd.residual / 1e6, 0)} jt. Komponennya dienumerasi dari register (perolehan, penyusutan periode, pelepasan), bukan diturunkan dari saldo akhir; karena itu ia dapat gagal, dan kali ini gagal.
                </div>
              )}
              {rollFwd.ties && (
                <div className="tiny muted" style={{ marginTop: 2, lineHeight: 1.5 }}>
                  Tiap komponen berasal dari register (perolehan · penyusutan periode · pelepasan <b>DISPOSALS</b>), bukan dari saldo akhir. Saldo akhir dihitung dari komponen lalu dibandingkan dengan register.
                </div>
              )}
            </div>
          </Panel>
          <Panel title="Ringkasan per Kelas Aset">
            {cats.map((c: any) => (
              <div key={c.cat} style={{ marginBottom: 10 }}>
                <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="row ac gap6"><span style={{ fontWeight: 600 }}>{c.cat}</span><span className="muted">· {c.n}</span></span><span className="mono" style={{ fontWeight: 700 }}>NBV {fmt(c.nbv / 1e6, 0)} jt</span></div>
                <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-3)' }}>
                  <div style={{ width: (c.nbv / c.cost * 100) + '%', background: 'var(--green-solid)' }} title="Nilai buku" />
                  <div style={{ width: ((c.cost - c.nbv) / c.cost * 100) + '%', background: 'var(--amber-solid)' }} title="Telah disusutkan" />
                </div>
              </div>
            ))}
            <div className="row gap14 tiny muted" style={{ marginTop: 4 }}><span className="row ac gap6"><span style={{ width: 14, height: 6, borderRadius: 3, background: 'var(--green-solid)', display: 'inline-block' }} /> Nilai buku</span><span className="row ac gap6"><span style={{ width: 14, height: 6, borderRadius: 3, background: 'var(--amber-solid)', display: 'inline-block' }} /> Disusutkan</span></div>
          </Panel>
        </div>

        {dups.length > 0 && (
          <Panel title="Kandidat Pencatatan Ganda" sub={`${dups.length} pasangan lintas-register — perlu keputusan firma`}>
            <div className="tiny" style={{ marginBottom: 9, lineHeight: 1.55 }}>
              Register ini adalah penggabungan dua daftar yang tak pernah didamaikan (Keuangan &amp; GA/Fasilitas).
              Pasangan berikut sekelas dan diperoleh berdekatan, sehingga mungkin aset FISIK yang sama tercatat dua kali.
              Sistem <b>tidak</b> menghapusnya sendiri — menebak pasangan mana yang duplikat berarti mengarang.
            </div>
            <table className="dtbl">
              <thead><tr><th>Kelas</th><th>Aset — register Keuangan</th><th>Aset — register GA</th><th className="num">Selisih hari</th><th className="num">Nilai gabungan</th></tr></thead>
              <tbody>
                {dups.map((d: { a: { id: string; name: string; src: string }; b: { id: string; name: string; src: string }; cat: string; daysApart: number; combinedCost: number }) => {
                  const fin = d.a.src === 'finance' ? d.a : d.b;
                  const ga = d.a.src === 'finance' ? d.b : d.a;
                  return (
                    <tr key={fin.id + '|' + ga.id}>
                      <td className="tiny">{d.cat}</td>
                      <td><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{fin.id}</span> <span style={{ fontWeight: 600 }}>{fin.name}</span></td>
                      <td><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{ga.id}</span> <span style={{ fontWeight: 600 }}>{ga.name}</span></td>
                      <td className="num mono">{d.daysApart}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmt(d.combinedCost / 1e6, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        )}

        <Panel noBody>
          <div className="panel-h"><h3>Register Aset Tetap Kantor</h3><div style={{ flex: 1 }} /><span className="tiny muted">per {REF.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · klik baris untuk skedul penyusutan · Rp jt</span></div>
          <div className="grid" style={{ gridTemplateColumns: selRow ? '1fr 330px' : '1fr', gap: 0, alignItems: 'stretch' }}>
            <div style={{ minWidth: 0, borderRight: selRow ? '1px solid var(--line)' : 'none' }}>
              <table className="dtbl">
                <thead><tr><th>Kode</th><th>Aset</th><th>Kategori</th><th>Perolehan</th><th className="num">Perolehan</th><th className="num">Ak. Penyusutan</th><th className="num">Nilai Buku</th><th style={{ width: 120 }}>Umur Terpakai</th></tr></thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.id} className={r.id === sel ? 'sel' : ''} onClick={() => setSel(r.id === sel ? null : r.id)} style={{ cursor: 'pointer' }}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                      <td style={{ fontWeight: 600 }} className="truncate">{r.name}</td>
                      <td className="tiny muted">{r.cat}</td>
                      <td className="mono tiny muted">{new Date(r.acq).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} · {r.life}th</td>
                      <td className="num">{fmt(r.cost / 1e6, 0)}</td>
                      <td className="num muted">{fmt(r.accDep / 1e6, 0)}</td>
                      <td className="num" style={{ fontWeight: 600, color: r.fullyDep ? 'var(--ink-4)' : 'inherit' }}>{fmt(r.nbv / 1e6, 0)}</td>
                      <td><div className="row ac gap6"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (r.pct * 100) + '%', height: '100%', borderRadius: 3, background: r.fullyDep ? 'var(--ink-4)' : 'var(--blue)' }} /></div><span className="tiny mono" style={{ width: 30 }}>{(r.pct * 100).toFixed(0)}%</span></div></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={4}>TOTAL</td><td className="num">{fmt(totCost / 1e6, 0)}</td><td className="num">{fmt(totAcc / 1e6, 0)}</td><td className="num">{fmt(totNbv / 1e6, 0)}</td><td></td></tr></tfoot>
              </table>
            </div>
            {selRow && <DepreciationSchedule a={selRow} onClose={() => setSel(null)} />}
          </div>
        </Panel>
      </div></div>
    </>
  );
}

function DepreciationSchedule({ a, onClose }: any) {
  const { fmt } = AMS;
  const startYear = new Date(a.acq).getFullYear();
  const annual = a.cost / a.life;
  const curYear = 2026;
  let acc = 0;
  const sched = Array.from({ length: a.life }, (_, i) => {
    const yr = startYear + i;
    acc += annual;
    return { yr, dep: annual, acc, nbv: a.cost - acc, current: yr === curYear };
  });
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 13 }} className="truncate">{a.name}</div><div className="tiny muted mono">{a.id} · {a.cat}</div></div>
        <button aria-label="Tutup" className="top-btn" onClick={onClose}><I.x size={16} /></button>
      </div>
      <div style={{ padding: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <KvBox label="Harga perolehan" v={'Rp ' + fmt(a.cost / 1e6, 0) + ' jt'} />
          <KvBox label="Masa manfaat" v={a.life + ' tahun'} />
          <KvBox label="Penyusutan / tahun" v={'Rp ' + fmt(annual / 1e6, 0) + ' jt'} />
          <KvBox label="Nilai buku kini" v={'Rp ' + fmt(a.nbv / 1e6, 0) + ' jt'} accent="var(--green)" />
        </div>
        <div className="tiny muted upper" style={{ marginBottom: 8 }}>Skedul Penyusutan (garis lurus)</div>
        <table className="dtbl">
          <thead><tr><th>Tahun</th><th className="num">Penyusutan</th><th className="num">Akumulasi</th><th className="num">Nilai Buku</th></tr></thead>
          <tbody>
            {sched.map((s: any) => (
              <tr key={s.yr} style={{ background: s.current ? 'var(--blue-050)' : 'transparent', fontWeight: s.current ? 700 : 400 }}>
                <td style={{ fontWeight: 600 }}>{s.yr}{s.current && <span className="tiny" style={{ color: 'var(--blue)' }}> · kini</span>}</td>
                <td className="num">{fmt(s.dep / 1e6, 0)}</td>
                <td className="num muted">{fmt(s.acc / 1e6, 0)}</td>
                <td className="num" style={{ fontWeight: 600 }}>{fmt(Math.max(0, s.nbv) / 1e6, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tiny muted" style={{ marginTop: 8 }}>Nilai residu Rp 0 · metode garis lurus · Rp jt</div>
      </div>
    </div>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { CashBank, FirmTreasury, FixedAssets };
