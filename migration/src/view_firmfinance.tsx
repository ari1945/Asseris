/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Donut, Panel, Seg, Stat, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';
import { FIRMFIN } from './data_firmfin';
import { useFirmWip } from './use_firm_wip';
import { useFirmCoa } from './use_firm_coa';
import { amsExportXlsx } from './export_xlsx';

/* ============================================================
   Asseris — Firm Finance · Cockpit Keuangan Firma
   ------------------------------------------------------------
   Cockpit ini TIDAK menyimpan angka sendiri. Seluruh figur ditarik
   dari FIRMFIN (lapisan kanonik) yang menurunkan tiap nilai
   dari pemilik datanya: FIRM_COA (buku besar), INVOICES, FIRM_AP,
   ENGAGEMENTS/CLIENTS, BANK_ACCOUNTS, FIRM_BUDGET. Tab "Sumber
   Kebenaran" membuktikan tiap headline menutup ke akun kontrol GL.
   ============================================================ */
const { useState: useStateFF, useMemo: useMemoFF } = React;

/* Baris tabel C — bentuknya dijamin `FIRMFIN.budget()`; `actual` selalu turunan GL. */
interface BudgetRow { line: string; acct: string; acctName: string | null; type: string; budget: number; actual: number; mapped: boolean }
interface UnbudgetedRow { code: string; name: string; actual: number }

function FirmFinance() {
  const { fmt } = AMS;
  const FF = FIRMFIN;
  const nav = useNav();
  const { engagements, clients } = useFirm();
  const [tab, setTab] = useStateFF('ikhtisar');
  const [drill, setDrill] = useStateFF(null);

  /* Seluruh figur keuangan firma diturunkan dari jurnal terposting. Sebelum
     2026-08-15 ctx ini tak memuat `coa`, sehingga FIRMFIN jatuh ke seed statis dan
     memposting jurnal di Firm GL tak menggeser apa pun di layar ini. */
  const { coa, pending, balanced } = useFirmCoa();
  const ctx = useMemoFF(() => ({ engagements, clients, coa }), [engagements, clients, coa]);
  /* WIP via SSOT tunggal (useFirmWip) — overlay jam-aktual T&B, identik dgn
     WIP Valuation/Realisasi, Dashboard & cockpit Beranda. */
  const { wip: wipLive } = useFirmWip();
  const D = useMemoFF(() => ({
    pl: FF.pl(ctx), bs: FF.balanceSheet(ctx), svc: FF.serviceLines(ctx),
    partners: FF.partners(ctx), ar: FF.arAging(ctx), ap: FF.ap(ctx),
    wip: wipLive, cash: FF.cash(ctx), budget: FF.budget(ctx),
    kpis: FF.kpis(ctx), recon: FF.reconciliations(ctx), prov: FF.provenance(ctx),
  }), [ctx, wipLive]);

  const jt = (v: any) => fmt(v / 1e6, 0);
  const M = (v: any, d = 1) => fmt(v / 1e9, d);
  const k = D.kpis;
  /* Varians pendapatan aktual (GL) terhadap anggaran — dipakai apa adanya di headline. */
  const budVarPct = D.budget.budRev ? (D.budget.actRev / D.budget.budRev - 1) * 100 : 0;

  /* K-06 lanjutan — wire tombol "Laporan Keuangan KAP" (dulu mati): ekspor XLSX tersegel
     laporan keuangan firma — P&L & posisi keuangan (SSOT FIRMFIN). */
  const [exportingLk, setExportingLk] = useStateFF(false);
  const onExportLk = async () => {
    if (exportingLk) return;
    /* Q-2 (Ari, 2026-08-15): konsisten dengan gerbang ekspor WIP (#239). Laporan Keuangan
       tak boleh keluar tersegel selama ada akun kontrol yang selisihnya tanpa pemilik.
       Ditegakkan di handler, bukan hanya `disabled` tombol. */
    if (D.recon.some((r: { status: string }) => r.status === 'open')) return;
    setExportingLk(true);
    try {
      const plRows = (D.pl || []).map((r: any) => [r.label || r.k, jt(r.amount || r.v), r.note || '']);
      const bsRows = (D.bs || []).map((r: any) => [r.label || r.k, jt(r.amount || r.v), r.note || '']);
      await amsExportXlsx({
        kind: 'firm-lk', scope: 'firm', scopeId: undefined,
        fileName: 'Laporan Keuangan KAP - FY2025.xlsx',
        firm: 'KAP Wijaya Hartono & Rekan',
        title: 'Laporan Keuangan KAP — FY2025',
        meta: [`Pendapatan Rp ${M(k.revenue)} M · laba operasi Rp ${M(k.opProfit, 2)} M (${(k.margin * 100).toFixed(1)}%)`,
          `Posisi kas Rp ${M(k.cashControl, 2)} M — Rp juta`],
        sheets: [
          { name: 'Laba Rugi', heading: 'Laporan laba rugi (Rp juta)',
            columns: ['Pos', 'Nilai', 'Catatan'], rows: plRows, colWidths: [34, 14, 40] },
          { name: 'Posisi Keuangan', heading: 'Laporan posisi keuangan (Rp juta)',
            columns: ['Pos', 'Nilai', 'Catatan'], rows: bsRows, colWidths: [34, 14, 40] },
        ],
      });
    } finally {
      setExportingLk(false);
    }
  };

  const tabs = [
    { id: 'ikhtisar', label: 'Ikhtisar' },
    { id: 'profitabilitas', label: 'Profitabilitas' },
    { id: 'modalkerja', label: 'Modal Kerja & Likuiditas' },
    { id: 'sumber', label: 'Sumber Kebenaran', count: D.recon.length + D.prov.length },
  ];

  return (
    <>
      <SubBar moduleId="firmfinance" right={
        <div className="row gap8 ac">
          <span className="chip tiny" title="Saldo akun diturunkan dari jurnal TERPOSTING (firm_ledger), bukan seed statis"><I.link2 size={11} /> Dari buku besar</span>
          {/* Q-2 (Ari): jurnal tertunda adalah keadaan NORMAL — ditampilkan sebagai
              informasi dengan jalan pintas ke pemiliknya, BUKAN gerbang. Berbeda dari
              sub-buku yang tak menutup (#239/#240), yang memang memblokir ekspor. */}
          {pending.length > 0 && (
            <span className="chip tiny" style={{ background: 'var(--amber-bg)', color: 'var(--amber)', cursor: 'pointer' }}
              title="Jurnal ini belum diposting, jadi belum tercermin di angka mana pun — buka General Ledger"
              onClick={() => nav('firmgl', { from: 'firmfinance' })}><I.clock size={11} /> {pending.length} jurnal belum diposting</span>
          )}
          {!balanced && (
            <span className="chip tiny" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}
              title="Aset ≠ Liabilitas + Ekuitas menurut buku besar">
              <I.alert size={11} /> Neraca tidak seimbang</span>
          )}
          <Seg options={['FY2025', 'FY2024']} value="FY2025" onChange={() => {}} />
          <Btn sm onClick={onExportLk} disabled={exportingLk || D.recon.some((r: { status: string }) => r.status === 'open')}
            title={D.recon.some((r: { status: string }) => r.status === 'open') ? 'Ekspor dikunci: ada akun kontrol dengan selisih belum dijelaskan — lihat tab Sumber Kebenaran' : 'Ekspor Laporan Keuangan KAP tersegel'}>
            <I.download size={13} /> {exportingLk ? 'Menyiapkan…' : 'Laporan Keuangan KAP'}</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {/* headline KPI — semua diturunkan dari FIRMFIN */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
            {/* Varians pendapatan APA ADANYA. Dulu baris ini berbunyi `… * 100 + 6`:
                varians sesungguhnya −5,8% (DI BAWAH anggaran) ditampilkan sebagai
                "+0,2%" dengan panah hijau ke atas. Konstanta itu bukan pembulatan —
                ia membalik tanda. Dicabut (PRD budget-actual-ledger-derived §1.4). */}
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + M(k.revenue) + ' M'} label="Pendapatan KAP (GL 4-100)" delta={budVarPct.toFixed(1) + '% vs anggaran'} deltaDir={budVarPct >= 0 ? 'up' : 'down'} /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + M(k.opProfit, 2) + ' M'} label="Laba Operasi" accent="var(--green)" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={(k.margin * 100).toFixed(1) + '%'} label="Margin Operasi" accent="var(--green)" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + M(k.cashControl, 2) + ' M'} label="Posisi Kas (GL 1-100)" /></div></Panel>
          </div>

          <Panel noBody>
            <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
            <div style={{ padding: 14 }}>
              {tab === 'ikhtisar' && <Overview D={D} jt={jt} M={M} fmt={fmt} setDrill={setDrill} />}
              {tab === 'profitabilitas' && <ProfitTab D={D} jt={jt} M={M} fmt={fmt} nav={nav} setDrill={setDrill} />}
              {tab === 'modalkerja' && <WorkingCapital D={D} jt={jt} M={M} fmt={fmt} nav={nav} />}
              {tab === 'sumber' && <SourceOfTruth D={D} jt={jt} M={M} fmt={fmt} nav={nav} />}
            </div>
          </Panel>
        </div>
      </div>
      {drill && <ServiceLineDrill l={drill} total={D.svc.total} onClose={() => setDrill(null)} />}
    </>
  );
}

/* ---------------- Tab: Ikhtisar ---------------- */
function Overview({ D, jt, M, fmt, setDrill }: any) {
  const p = D.pl, svc = D.svc;
  const plRows = [
    ['Pendapatan jasa', p.revenue, false, 'rev'],
    ['Beban langsung staf (5-100)', -p.directCost, false],
    ['Laba Bruto', p.grossProfit, true],
    ['Beban overhead & umum (5-200…5-500)', -p.overheadTotal, false],
    ['Laba Operasi', p.opProfit, true],
  ];
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel title="Pendapatan per Lini Jasa" sub="alokasi atas pendapatan Buku Besar · FY2025">
          <div className="row gap12" style={{ alignItems: 'center' }}>
            <Donut segments={svc.rows.map((l: any) => ({ label: l.line, value: l.rev, color: l.color }))} size={120} thickness={17}
              center={<><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{M(svc.total)}M</div><div className="tiny muted">total</div></>} />
            <div style={{ flex: 1 }}>
              {svc.rows.map((l: any) => (
                <div key={l.line} className="row jb ac" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }} onClick={() => setDrill(l)}>
                  <span className="row ac gap8"><span style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} /><span style={{ fontSize: 12, fontWeight: 600 }}>{l.line}</span></span>
                  <div className="row ac gap10" style={{ gap: 12 }}>
                    <span className="mono" style={{ fontWeight: 700 }}>Rp {jt(l.rev)} jt</span>
                    <span className="tiny" style={{ width: 42, textAlign: 'right', color: l.growth >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{l.growth >= 0 ? '+' : ''}{l.growth}%</span>
                    <span style={{ color: 'var(--ink-4)' }}><I.chevron size={14} /></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="tiny muted" style={{ marginTop: 8 }}>Σ lini ≡ pendapatan GL Rp {jt(svc.total)} jt · bauran adalah alokasi pengungkapan.</div>
        </Panel>

        <Panel title="Ikhtisar Laba Rugi KAP" sub="sumber: Buku Besar (FIRM_COA)">
          <table className="dtbl">
            <tbody>
              {plRows.map(([l, v, bold]) => (
                <tr key={l} style={{ fontWeight: bold ? 700 : 400, background: bold ? 'var(--surface-2)' : 'transparent' }}>
                  <td style={{ padding: '7px 9px', borderBottom: '1px solid var(--line-soft)' }}>{l}</td>
                  <td className="num" style={{ padding: '7px 9px', borderBottom: '1px solid var(--line-soft)', color: v < 0 ? 'var(--red)' : 'inherit' }}>{v < 0 ? '(' + jt(-v) + ')' : jt(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row jb tiny muted" style={{ marginTop: 8, padding: '0 4px' }}><span>dalam jutaan Rupiah</span><span>Margin operasi {(p.margin * 100).toFixed(1)}% · gross {(p.grossMargin * 100).toFixed(0)}%</span></div>
        </Panel>
      </div>

      {/* likuiditas & modal kerja ringkas */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <KvBox label="Modal Kerja Neto" v={'Rp ' + M(D.bs.workingCapital, 1) + ' M'} accent="var(--green)" />
        <KvBox label="Current Ratio" v={D.bs.currentRatio.toFixed(1) + '×'} />
        <KvBox label="Cost-to-Income" v={(p.costToIncome * 100).toFixed(1) + '%'} />
        <KvBox label="Cash Runway" v={D.kpis.runway.toFixed(1) + ' bln'} accent="var(--blue)" />
      </div>
    </>
  );
}

/* ---------------- Tab: Profitabilitas ---------------- */
function ProfitTab({ D, jt, M, fmt, nav, setDrill }: any) {
  const partners = D.partners.rows, total = D.partners.total;
  const maxP = Math.max(...partners.map((p: any) => p.portfolio), 1);
  const p = D.pl;
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Kontribusi per Partner</h3><div style={{ flex: 1 }} /><span className="tiny muted">portofolio fee terkelola · sumber: Engagements × Clients</span></div>
          <table className="dtbl">
            <thead><tr><th>Partner</th><th className="num">Portofolio Fee</th><th className="num">Klien</th><th className="num">Jam</th><th className="num">Utilisasi</th><th style={{ width: 110 }}>Porsi</th></tr></thead>
            <tbody>
              {partners.map((pt: any) => (
                <tr key={pt.name}>
                  <td><div className="row ac gap8"><Avatar name={pt.name} size={24} /><span style={{ fontWeight: 600 }}>{pt.name}</span></div></td>
                  <td className="num" style={{ fontWeight: 600 }}>Rp {jt(pt.portfolio)} jt</td>
                  <td className="num">{pt.clients}</td>
                  <td className="num muted">{fmt(pt.hours)}</td>
                  <td className="num">{pt.util != null ? <span style={{ color: pt.util > 72 ? 'var(--green)' : 'var(--amber)' }}>{pt.util}%</span> : '—'}</td>
                  <td><div className="row ac gap6"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (pt.portfolio / maxP * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--blue-solid)' }} /></div><span className="tiny mono" style={{ width: 30 }}>{(pt.portfolio / total * 100).toFixed(0)}%</span></div></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>TOTAL PORTOFOLIO</td><td className="num">{jt(total)}</td><td colSpan={4}></td></tr></tfoot>
          </table>
          <div className="tiny muted" style={{ padding: '8px 12px' }}>Portofolio fee = Σ fee kontrak klien per partner (basis sama dengan modul <b onClick={() => nav('profitability', { from: 'firmfinance' })} style={{ cursor: 'pointer', color: 'var(--blue)' }}>Profitability</b>). Berbeda dari pendapatan diakui GL (Rp {jt(p.revenue)} jt).</div>
        </Panel>

        <Panel title="Komposisi Beban" sub="sumber: akun beban GL">
          {p.accounts.map((a: any) => (
            <div key={a.code} style={{ marginBottom: 9 }}>
              <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="row ac gap6"><span className="mono muted">{a.code}</span><span>{a.name}</span></span><span className="mono" style={{ fontWeight: 700 }}>{jt(a.bal)} · {(a.bal / p.totalExpense * 100).toFixed(0)}%</span></div>
              <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (a.bal / p.totalExpense * 100) + '%', height: '100%', borderRadius: 4, background: a.code === '5-100' ? 'var(--navy)' : 'var(--blue)' }} /></div>
            </div>
          ))}
          <div className="divider" />
          <div style={{ display: 'grid', gap: 7 }}>
            <RowKv label="Total beban operasi" v={'Rp ' + jt(p.totalExpense) + ' jt'} />
            <RowKv label="Laba operasi" v={'Rp ' + jt(p.opProfit) + ' jt'} strong />
          </div>
        </Panel>
      </div>

      {/* margin per lini jasa */}
      <Panel title="Pendapatan & Pertumbuhan per Lini Jasa" sub="klik untuk rincian sub-lini">
        <table className="dtbl">
          <thead><tr><th>Lini Jasa</th><th className="num">Pendapatan</th><th className="num">Porsi</th><th className="num">Pertumbuhan YoY</th><th style={{ width: 160 }}></th></tr></thead>
          <tbody>
            {D.svc.rows.map((l: any) => (
              <tr key={l.line} onClick={() => setDrill(l)} style={{ cursor: 'pointer' }}>
                <td><span className="row ac gap8"><span style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} /><span style={{ fontWeight: 600 }}>{l.line}</span></span></td>
                <td className="num" style={{ fontWeight: 600 }}>{jt(l.rev)}</td>
                <td className="num muted">{(l.rev / D.svc.total * 100).toFixed(1)}%</td>
                <td className="num" style={{ color: l.growth >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{l.growth >= 0 ? '▲ +' : '▼ '}{l.growth}%</td>
                <td><div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (l.rev / D.svc.total * 100) + '%', height: '100%', borderRadius: 4, background: l.color }} /></div></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td>TOTAL · Rp jt</td><td className="num">{jt(D.svc.total)}</td><td className="num">100%</td><td colSpan={2}></td></tr></tfoot>
        </table>
      </Panel>
    </>
  );
}

/* ---------------- Tab: Modal Kerja & Likuiditas ---------------- */
function WorkingCapital({ D, jt, M, fmt, nav }: any) {
  const ar = D.ar, ap = D.ap, wip = D.wip, k = D.kpis;
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <KvBox label={'Piutang Terbuka · DSO ' + k.dso + ' hr'} v={'Rp ' + jt(ar.open) + ' jt'} accent="var(--green)" />
        <KvBox label={'Utang Terbuka · DPO ' + k.dpo + ' hr'} v={'Rp ' + jt(ap.open) + ' jt'} accent="var(--amber)" />
        <KvBox label="WIP Belum Ditagih" v={'Rp ' + jt(wip.unbilledTotal) + ' jt'} accent="var(--blue)" />
        <KvBox label="Piutang Jatuh Tempo Lewat" v={'Rp ' + jt(ar.overdue) + ' jt'} accent="var(--red)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel title="Aging Piutang Usaha" sub={'sumber: faktur (Billing) · Rp ' + jt(ar.open) + ' jt terbuka'} actions={<button className="btn sm" style={{ height: 22 }} onClick={() => nav('apar', { from: 'firmfinance' })}><I.coins size={11} /> AR</button>}>
          <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 12 }}>
            {ar.buckets.map((b: any) => b.v > 0 && <div key={b.k} title={b.l} style={{ width: (b.pct * 100) + '%', background: b.c }} />)}
          </div>
          {ar.buckets.map((b: any) => (
            <div key={b.k} className="row jb ac" style={{ padding: '5px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <span className="row ac gap8"><span style={{ width: 9, height: 9, borderRadius: 2, background: b.c }} /><span style={{ fontSize: 12 }}>{b.l}</span><span className="tiny muted">· {b.n}</span></span>
              <span className="row ac" style={{ gap: 12 }}><span className="mono" style={{ fontWeight: 600 }}>Rp {jt(b.v)} jt</span><span className="tiny muted" style={{ width: 36, textAlign: 'right' }}>{(b.pct * 100).toFixed(0)}%</span></span>
            </div>
          ))}
          <div className="tiny muted" style={{ marginTop: 8 }}>Sub-buku faktur Rp {jt(ar.open)} jt + termin &amp; retensi Rp {jt(ar.bridgeTotal)} jt ({ar.bridge.length} item) {ar.reconciles ? '=' : '≠'} kontrol GL 1-200 Rp {jt(ar.control)} jt{ar.reconciles ? '' : ' — SISA BELUM DIJELASKAN Rp ' + jt(Math.abs(ar.residual)) + ' jt'}.</div>
        </Panel>

        <Panel title="Utang Usaha per Kategori" sub={'sumber: FIRM_AP · Rp ' + jt(ap.open) + ' jt terbuka'} actions={<button className="btn sm" style={{ height: 22 }} onClick={() => nav('apar', { from: 'firmfinance' })}><I.coins size={11} /> AP</button>}>
          {ap.byCat.map((c: any) => {
            const mx = ap.byCat[0].v || 1;
            return (
              <div key={c.cat} style={{ marginBottom: 9 }}>
                <div className="row jb tiny" style={{ marginBottom: 3 }}><span>{c.cat}</span><span className="mono" style={{ fontWeight: 700 }}>Rp {jt(c.v)} jt</span></div>
                <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (c.v / mx * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--amber-solid)' }} /></div>
              </div>
            );
          })}
          <div className="tiny muted" style={{ marginTop: 8 }}>Vendor terbuka Rp {jt(ap.open)} jt + akrual &amp; faktur dalam proses Rp {jt(ap.bridgeTotal)} jt ({ap.bridge.length} item) {ap.reconciles ? '=' : '≠'} kontrol GL 2-100 Rp {jt(ap.control)} jt{ap.reconciles ? '' : ' — SISA BELUM DIJELASKAN Rp ' + jt(Math.abs(ap.residual)) + ' jt'}.</div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>WIP Belum Ditagih per Engagement</h3><div style={{ flex: 1 }} /><span className="tiny muted">jam × tarif blended Rp {fmt(wip.rate)}/jam · Rp jt</span></div>
        <table className="dtbl">
          <thead><tr><th>Engagement</th><th>Klien</th><th className="num">Jam</th><th className="num">Nilai WIP</th><th className="num">Ditagih</th><th className="num">Belum Ditagih</th></tr></thead>
          <tbody>
            {wip.register.map((r: any) => (
              <tr key={r.id}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                <td className="truncate" style={{ maxWidth: 150 }}>{(r.client || '').replace('PT ', '')}</td>
                <td className="num">{fmt(r.hours)}</td>
                <td className="num">{jt(r.wipValue)}</td>
                <td className="num muted">{jt(r.billed)}</td>
                <td className="num" style={{ fontWeight: 600 }}>{jt(r.unbilled)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={5}>SUB-BUKU WIP PERIKATAN AKTIF</td><td className="num">{jt(wip.unbilledTotal)}</td></tr></tfoot>
        </table>
        <div className="tiny muted" style={{ padding: '8px 12px' }}>WIP perikatan aktif Rp {jt(wip.unbilledTotal)} jt{wip.unpostedAdj !== 0 ? ' + pergerakan belum diposting Rp ' + jt(Math.abs(wip.unpostedAdj)) + ' jt' : ''} + WIP non-material &amp; akrual Rp {jt(wip.nonMaterialTotal + wip.accrualTotal)} jt {wip.reconciles ? '=' : '≠'} kontrol GL 1-300 Rp {jt(wip.control)} jt{wip.reconciles ? '' : ' — SELISIH BELUM DIJELASKAN Rp ' + jt(Math.abs(wip.glResidual)) + ' jt'}. <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => nav('wip', { from: 'firmfinance' })}>Buka WIP Valuation →</span></div>
      </Panel>
    </>
  );
}

/* ---------------- Tab: Sumber Kebenaran (lineage + rekonsiliasi) ---------------- */
function SourceOfTruth({ D, jt, M, fmt, nav }: any) {
  const STAT = {
    tied: { k: 'green', l: 'Tertaut' },
    bridged: { k: 'blue', l: 'Terjembatani' },
    /* 'open' = masih ada sisa yang TAK dijelaskan komponen bernama mana pun.
       Dulu status ini mustahil tercapai (setiap baris punya `note` hardcode), jadi
       labelnya "Dalam rekonsiliasi" tak pernah tampil dan tak pernah menuntut apa pun. */
    open: { k: 'red', l: 'BELUM DIJELASKAN' },
  };
  const adaOpen = D.recon.some((r: { status: string }) => r.status === 'open');
  const cashRecon = D.recon.find((r: any) => r.key === 'cash');
  return (
    <>
      <div className="panel" style={{ padding: '11px 13px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)', marginBottom: 14 }}>
        <div className="row ac gap8" style={{ marginBottom: 4 }}><I.link2 size={14} style={{ color: 'var(--blue)' }} /><span style={{ fontWeight: 700, fontSize: 13 }}>Satu Sumber Kebenaran</span></div>
        <div className="tiny" style={{ lineHeight: 1.55 }}>Setiap angka di cockpit ini ditarik dari pemilik datanya, bukan disalin. Buku Besar firma (FIRM_COA) adalah <b>akun kontrol</b>; tiap sub-ledger menutup ke sana lewat item rekonsiliasi yang teridentifikasi. Klik baris untuk membuka modul pemilik data.</div>
      </div>

      {/* A. Provenance figur P&L */}
      <div className="tiny upper muted" style={{ fontWeight: 700, marginBottom: 8 }}>A · Lineage Figur Laba Rugi</div>
      <table className="dtbl" style={{ marginBottom: 18 }}>
        <thead><tr><th>Figur Headline</th><th className="num">Nilai (Rp jt)</th><th>Modul Pemilik</th><th>Sumber Data</th><th>Status</th></tr></thead>
        <tbody>
          {D.prov.map((p: any) => (
            <tr key={p.label} onClick={() => nav(p.owner, { from: 'firmfinance' })} style={{ cursor: 'pointer' }}>
              <td style={{ fontWeight: 600 }}>{p.label}</td>
              <td className="num" style={{ fontWeight: 600 }}>{jt(p.value)}</td>
              <td><span className="row ac gap6" style={{ color: 'var(--blue)' }}><I.arrowRight size={11} />{p.ownerLabel}</span></td>
              <td className="tiny mono muted">{p.source}</td>
              <td><Badge kind={p.tied ? 'green' : 'amber'}>{p.tied ? 'Tertaut' : 'Periksa'}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* B. Rekonsiliasi sub-ledger ke akun kontrol GL */}
      <div className="tiny upper muted" style={{ fontWeight: 700, marginBottom: 8 }}>B · Rekonsiliasi Sub-Buku → Akun Kontrol Buku Besar</div>
      <table className="dtbl">
        <thead><tr><th>Akun Kontrol</th><th className="num">Saldo GL</th><th className="num">Sub-Buku</th><th className="num">Komponen Bernama</th><th className="num">Sisa</th><th>Keterangan</th><th>Status</th></tr></thead>
        <tbody>
          {D.recon.map((r: any) => {
            const st = (STAT as any)[r.status] || STAT.open;
            return (
              <tr key={r.key} onClick={() => nav(r.owner, { from: 'firmfinance' })} style={{ cursor: 'pointer' }}>
                <td><div style={{ fontWeight: 600 }}>{r.label}</div><div className="mono tiny muted">GL {r.glCode} · {r.ownerLabel}</div></td>
                <td className="num" style={{ fontWeight: 700 }}>{jt(r.control)}</td>
                <td className="num muted">{jt(r.sub)}<div className="tiny muted" style={{ fontWeight: 400 }}>{r.subLabel}</div></td>
                <td className="num" style={{ color: r.bridgeTotal ? 'var(--ink)' : 'var(--ink-4)', fontWeight: 600 }}>{r.bridgeTotal ? jt(r.bridgeTotal) : '—'}</td>
                <td className="num" style={{ color: r.status === 'open' ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{Math.abs(r.residual) < 1e6 ? '0' : (r.residual >= 0 ? '+' : '−') + jt(Math.abs(r.residual))}</td>
                <td className="tiny muted">{r.note}</td>
                <td><Badge kind={st.k}>{st.l}</Badge></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {adaOpen && (
        <div className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent', marginTop: 10 }}>
          <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5, color: 'var(--red)' }}>
            <I.alert size={11} /> {D.recon.filter((r: { status: string }) => r.status === 'open').length} akun kontrol menyisakan selisih yang belum dijelaskan komponen mana pun. Ekspor Laporan Keuangan dikunci sampai selisih itu punya pemilik.
          </div>
        </div>
      )}
      <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
        Status diturunkan dari ANGKA: <b>Tertaut</b> = sub-buku sudah sama dengan kontrol; <b>Terjembatani</b> = komponen bernama menutup sisanya; <b>BELUM DIJELASKAN</b> = masih ada sisa tanpa pemilik.
        {cashRecon && cashRecon.status === 'open' && <> Selisih kas Rp {jt(Math.abs(cashRecon.residual))} jt belum dijumlahkan di sini — register <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => nav('reconcile', { from: 'firmfinance' })}>Rekonsiliasi Bank</span> hanya mencakup satu rekening & satu periode.</>}
      </div>

      {/* C. Anggaran — CAKUPAN, bukan tie-out.
          Sejak "aktual" diturunkan dari saldo akun GL, membandingkan aktual dengan
          saldo GL adalah tautologi: selalu hijau, tak pernah bisa merah. Yang
          direkonsiliasi di sini adalah KELENGKAPAN PEMETAAN — akun P&L yang diposting
          tapi tak pernah dianggarkan membuat laba anggaran understated, dan itu yang
          benar-benar berisiko. */}
      <div className="tiny upper muted" style={{ fontWeight: 700, margin: '18px 0 8px' }}>C · Anggaran vs Aktual — aktual = saldo akun buku besar</div>
      <table className="dtbl">
        <thead><tr><th>Pos (P&L)</th><th>Akun GL</th><th className="num">Anggaran</th><th className="num">Aktual (GL)</th><th className="num">Varians</th><th>Pemetaan</th></tr></thead>
        <tbody>
          {D.budget.lines.map((b: BudgetRow) => {
            const v = b.type === 'rev' ? b.actual - b.budget : b.budget - b.actual;
            return (
              <tr key={b.line}>
                <td style={{ fontWeight: 600 }}>{b.line}</td>
                <td className="mono tiny muted">{b.acct}{b.acctName ? ' · ' + b.acctName : ''}</td>
                <td className="num muted">{jt(b.budget)}</td>
                <td className="num">{jt(b.actual)}</td>
                <td className="num" style={{ color: v < 0 ? 'var(--num-neg)' : undefined }}>{jt(v)}</td>
                <td><Badge kind={b.mapped ? 'green' : 'red'}>{b.mapped ? 'Terpetakan' : 'AKUN TAK ADA'}</Badge></td>
              </tr>
            );
          })}
          {D.budget.unbudgeted.map((a: UnbudgetedRow) => (
            <tr key={a.code} style={{ background: 'var(--red-bg)' }}>
              <td style={{ fontWeight: 600 }}>{a.name}</td>
              <td className="mono tiny muted">{a.code}</td>
              <td className="num muted">—</td>
              <td className="num">{jt(a.actual)}</td>
              <td className="num">—</td>
              <td><Badge kind="red">TAK DIANGGARKAN</Badge></td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700, background: 'var(--surface-2)' }}>
            <td colSpan={2}>LABA OPERASI</td>
            <td className="num muted">{jt(D.budget.budProfit)}</td>
            <td className="num">{jt(D.budget.actProfit)}</td>
            <td className="num muted">{jt(D.pl.opProfit)} <span className="tiny">(P&L)</span></td>
            <td><Badge kind={D.budget.covered ? 'green' : 'red'}>{D.budget.covered ? 'Cakupan penuh' : 'Tak menutup'}</Badge></td>
          </tr>
        </tbody>
      </table>
      <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
        Aktual diturunkan dari saldo akun buku besar — memposting jurnal menggesernya. Baris <b>LABA OPERASI</b>{' '}
        membandingkan Σ akun yang <i>dianggarkan</i> dengan laba operasi P&L atas <i>seluruh</i> akun Pendapatan &amp; Beban;
        keduanya sama hanya bila pemetaan lengkap dua arah.
        {!D.budget.covered && <> Selisih cakupan Rp {jt(Math.abs(D.budget.coverageGap))} jt.</>}
      </div>
    </>
  );
}

function ServiceLineDrill({ l, total, onClose }: any) {
  const { fmt } = AMS;
  const breakdownMap = {
    'Audit & Asurans': [['Audit LK Emiten', 0.46], ['Audit LK Non-emiten', 0.34], ['Reviu Interim', 0.12], ['Asurans Lain', 0.08]],
    'Perpajakan': [['Tax Compliance', 0.5], ['Tax Advisory', 0.32], ['Tax Dispute', 0.18]],
    'Advisory': [['Transaction Advisory', 0.4], ['Risk & Internal Audit', 0.3], ['Valuation', 0.18], ['IT Advisory', 0.12]],
    'Reviu & AUP': [['Agreed-Upon Procedures', 0.55], ['Reviu Terbatas', 0.45]],
  };
  const items = ((breakdownMap as any)[l.line] || [['Lainnya', 1]]).map(([n, p]: any) => ({ n, v: Math.round(l.rev * p) }));
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 480, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ background: l.color, color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>{l.line}</div><div className="tiny" style={{ opacity: .85 }}>Rincian pendapatan · {(l.rev / total * 100).toFixed(0)}% dari total KAP</div></div>
          <button aria-label="Tutup" className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16 }}>
          <div className="row jb ac" style={{ marginBottom: 12 }}>
            <Stat value={'Rp ' + fmt(l.rev / 1e6, 0) + ' jt'} label="Pendapatan Lini" />
            <span className="tiny" style={{ color: l.growth >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{l.growth >= 0 ? '▲ +' : '▼ '}{l.growth}% YoY</span>
          </div>
          <table className="dtbl">
            <thead><tr><th>Sub-Lini Jasa</th><th className="num">Pendapatan</th><th className="num" style={{ width: 60 }}>Porsi</th></tr></thead>
            <tbody>
              {items.map((it: any, i: any) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{it.n}</td>
                  <td className="num">{fmt(it.v / 1e6, 0)} jt</td>
                  <td className="num"><div className="row ac gap6" style={{ justifyContent: 'flex-end' }}><div style={{ width: 40, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (it.v / l.rev * 100) + '%', height: '100%', borderRadius: 3, background: l.color }} /></div><span className="tiny mono">{(it.v / l.rev * 100).toFixed(0)}%</span></div></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>TOTAL</td><td className="num">{fmt(l.rev / 1e6, 0)} jt</td><td className="num">100%</td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FirmFinance };
