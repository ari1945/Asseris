/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Donut, Panel, Seg, Stat, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';
import { SliderRow } from './view_materiality';
import { FIRMFIN } from './data_firmfin';
import { useFirmWip } from './use_firm_wip';
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

function FirmFinance() {
  const { fmt } = AMS;
  const FF = FIRMFIN;
  const nav = useNav();
  const { engagements, clients } = useFirm();
  const [tab, setTab] = useStateFF('ikhtisar');
  const [drill, setDrill] = useStateFF(null);

  const ctx = useMemoFF(() => ({ engagements, clients }), [engagements, clients]);
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
          <span className="chip tiny" title="Seluruh angka ditarik dari Buku Besar firma & sub-ledger pemiliknya"><I.link2 size={11} /> Satu sumber kebenaran</span>
          <Seg options={['FY2025', 'FY2024']} value="FY2025" onChange={() => {}} />
          <Btn sm><I.download size={13} /> Laporan Keuangan KAP</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {/* headline KPI — semua diturunkan dari FIRMFIN */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + M(k.revenue) + ' M'} label="Pendapatan KAP (GL 4-100)" delta={'+' + ((D.budget.actRev / D.budget.budRev - 1) * 100 + 6).toFixed(1) + '%'} deltaDir="up" /></div></Panel>
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
              center={<><div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>{M(svc.total)}M</div><div className="tiny muted">total</div></>} />
            <div style={{ flex: 1 }}>
              {svc.rows.map((l: any) => (
                <div key={l.line} className="row jb ac" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }} onClick={() => setDrill(l)}>
                  <span className="row ac gap8"><span style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} /><span style={{ fontSize: 12.5, fontWeight: 600 }}>{l.line}</span></span>
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
                  <td><div className="row ac gap6"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (pt.portfolio / maxP * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--blue)' }} /></div><span className="tiny mono" style={{ width: 30 }}>{(pt.portfolio / total * 100).toFixed(0)}%</span></div></td>
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
          <div className="tiny muted" style={{ marginTop: 8 }}>Sub-buku faktur Rp {jt(ar.open)} jt + termin/retensi Rp {jt(ar.reconciling)} jt = kontrol GL 1-200 Rp {jt(ar.control)} jt.</div>
        </Panel>

        <Panel title="Utang Usaha per Kategori" sub={'sumber: FIRM_AP · Rp ' + jt(ap.open) + ' jt terbuka'} actions={<button className="btn sm" style={{ height: 22 }} onClick={() => nav('apar', { from: 'firmfinance' })}><I.coins size={11} /> AP</button>}>
          {ap.byCat.map((c: any) => {
            const mx = ap.byCat[0].v || 1;
            return (
              <div key={c.cat} style={{ marginBottom: 9 }}>
                <div className="row jb tiny" style={{ marginBottom: 3 }}><span>{c.cat}</span><span className="mono" style={{ fontWeight: 700 }}>Rp {jt(c.v)} jt</span></div>
                <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (c.v / mx * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--amber)' }} /></div>
              </div>
            );
          })}
          <div className="tiny muted" style={{ marginTop: 8 }}>Vendor terbuka Rp {jt(ap.open)} jt + akrual Rp {jt(ap.reconciling)} jt = kontrol GL 2-100 Rp {jt(ap.control)} jt.</div>
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
        <div className="tiny muted" style={{ padding: '8px 12px' }}>WIP perikatan aktif Rp {jt(wip.unbilledTotal)} jt + WIP/akrual lain Rp {jt(wip.reconciling)} jt = kontrol GL 1-300 Rp {jt(wip.control)} jt. <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => nav('wip', { from: 'firmfinance' })}>Buka WIP Valuation →</span></div>
      </Panel>
    </>
  );
}

/* ---------------- Tab: Sumber Kebenaran (lineage + rekonsiliasi) ---------------- */
function SourceOfTruth({ D, jt, M, fmt, nav }: any) {
  const STAT = {
    tied: { k: 'green', l: 'Tertaut' },
    bridged: { k: 'blue', l: 'Terjembatani' },
    open: { k: 'amber', l: 'Dalam rekonsiliasi' },
  };
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
        <thead><tr><th>Akun Kontrol</th><th className="num">Saldo GL</th><th className="num">Sub-Buku</th><th className="num">Item Rekonsiliasi</th><th>Keterangan</th><th>Status</th></tr></thead>
        <tbody>
          {D.recon.map((r: any) => {
            const st = (STAT as any)[r.status] || STAT.open;
            return (
              <tr key={r.key} onClick={() => nav(r.owner, { from: 'firmfinance' })} style={{ cursor: 'pointer' }}>
                <td><div style={{ fontWeight: 600 }}>{r.label}</div><div className="mono tiny muted">GL {r.glCode} · {r.ownerLabel}</div></td>
                <td className="num" style={{ fontWeight: 700 }}>{jt(r.control)}</td>
                <td className="num muted">{jt(r.sub)}<div className="tiny muted" style={{ fontWeight: 400 }}>{r.subLabel}</div></td>
                <td className="num" style={{ color: Math.abs(r.recon) < 1e6 ? 'var(--green)' : 'var(--ink-3)', fontWeight: 600 }}>{r.recon >= 0 ? '+' : '−'}{jt(Math.abs(r.recon))}</td>
                <td className="tiny muted">{r.note}</td>
                <td><Badge kind={st.k}>{st.l}</Badge></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
        Sub-buku + item rekonsiliasi = saldo akun kontrol GL untuk Kas, Piutang, WIP & Utang.
        {cashRecon && Math.abs(cashRecon.recon) >= 1e6 && <> Selisih kas Rp {jt(Math.abs(cashRecon.recon))} jt berasal dari valas & item rekonsiliasi bank — lihat <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => nav('reconcile', { from: 'firmfinance' })}>Rekonsiliasi Bank</span>.</>}
      </div>

      {/* C. Anggaran tie-out */}
      <div className="tiny upper muted" style={{ fontWeight: 700, margin: '18px 0 8px' }}>C · Anggaran vs Aktual — tiap baris terikat ke akun GL</div>
      <table className="dtbl">
        <thead><tr><th>Pos (P&L)</th><th>Akun GL</th><th className="num">Aktual (Budget)</th><th className="num">Saldo GL</th><th>Status</th></tr></thead>
        <tbody>
          {D.budget.tie.map((b: any) => (
            <tr key={b.line}>
              <td style={{ fontWeight: 600 }}>{b.line}</td>
              <td className="mono tiny muted">{b.acct}</td>
              <td className="num">{jt(b.actual)}</td>
              <td className="num muted">{jt(b.glVal)}</td>
              <td><Badge kind={b.tied ? 'green' : 'red'}>{b.tied ? 'Cocok' : 'Selisih'}</Badge></td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700, background: 'var(--surface-2)' }}><td colSpan={2}>LABA OPERASI</td><td className="num">{jt(D.budget.actProfit)}</td><td className="num">{jt(D.pl.opProfit)}</td><td><Badge kind={Math.abs(D.budget.actProfit - D.pl.opProfit) < 1e6 ? 'green' : 'red'}>{Math.abs(D.budget.actProfit - D.pl.opProfit) < 1e6 ? 'Cocok' : 'Selisih'}</Badge></td></tr>
        </tbody>
      </table>
    </>
  );
}

/* ---------------- WIP Valuation (route 'wip') — modul valuasi mendalam ----------------
   SUMBER KEBENARAN TUNGGAL: FIRMFIN.wip(ctx, provFactor) yang menurunkan
   seluruh figur dari sub-buku WIP_ENG × ENGAGEMENTS × CLIENTS dan menutup ke
   kontrol GL 1-300. Angka identik dipakai Dashboard, WIP & Realisasi, dan cockpit
   Firm Finance — tidak ada perhitungan paralel di view ini. */
function WIPValuation() {
  const { fmt } = AMS;
  const nav = useNav();
  const [tab, setTab] = useStateFF('valuasi');
  const [sel, setSel] = useStateFF(null);
  const [provFactor, setProvFactor] = (window.useAmsPersist || useStateFF)('wip.provFactor', 1);

  /* WIP — SSOT tunggal (useFirmWip) dgn overlay jam-aktual T&B; provFactor
     menstres tarif penyisihan. Identik dgn Dashboard/cockpit/WIP & Realisasi. */
  const { wip: W, liveByEng } = useFirmWip(provFactor);

  const jt = (v: any) => fmt(v / 1e6, 0);
  const M = (v: any, d = 2) => fmt(v / 1e9, d);
  const pc = (v: any, d = 0) => fmt(v * 100, d) + '%';
  const realColor = (v: any) => v >= 1 ? 'var(--green)' : v >= 0.92 ? 'var(--amber)' : 'var(--red)';
  const marginColor = (v: any) => v >= 0.38 ? 'var(--green)' : v >= 0.30 ? 'var(--amber)' : 'var(--red)';
  const selRow = sel ? W.registerAll.find((r: any) => r.id === sel) : null;
  const agingMax = Math.max(...W.aging.map((a: any) => a.value), 1);

  const tabs = [
    { id: 'valuasi', label: 'Valuasi Perikatan' },
    { id: 'pemulihan', label: 'Pemulihan & Penyisihan' },
    { id: 'sumber', label: 'Mutasi & Sumber Kebenaran', count: W.movement.length + W.bridge.length },
  ];
  const presets = [{ k: 'Dasar', f: 1 }, { k: 'Konservatif', f: 1.5 }, { k: 'Stress', f: 2 }];
  const activePreset = (presets.find(p => Math.abs(p.f - provFactor) < 0.001) || {}).k || 'Custom';

  const onExport = async () => {
    const rows: (string | number)[][] = [];
    for (const r of W.registerAll) rows.push([r.id, r.clientShort, r.partner, jt(r.std), jt(r.writeUp - r.writeDown), jt(r.recoverable), r.billed ? jt(r.billed) : '—', jt(r.unbilled), r.age + 'h', pc(r.realization), pc(r.margin)]);
    rows.push(['TOTAL', `${W.registerAll.length} perikatan`, '', jt(W.totStd), jt(W.totWriteUp - W.totWriteDown), jt(W.totRecoverable), jt(W.totBilled), jt(W.unbilledTotal), '', pc(W.avgRealization), pc(W.avgMargin)]);
    await amsExportXlsx({
      kind: 'firm-wip', scope: 'firm',
      fileName: 'Valuasi WIP Perikatan.xlsx',
      firm: 'KAP Wijaya Hartono & Rekan',
      title: 'Sub-buku Valuasi WIP per Perikatan',
      meta: [`WIP belum ditagih Rp ${M(W.unbilledTotal)} M · recoverable neto Rp ${M(W.netRecoverable)} M · realisasi ${pc(W.avgRealization)} · penyisihan ${pc(W.provisionPct, 1)} · nilai dalam Rp juta`],
      sheets: [{ name: 'Valuasi WIP', columns: ['Perikatan', 'Klien', 'Partner', 'Nilai Standar', 'Penyesuaian', 'Recoverable', 'Difakturkan', 'WIP', 'Umur', 'Realisasi', 'Margin'], rows, colWidths: [14, 24, 16, 14, 12, 14, 12, 12, 8, 10, 10] }],
    });
  };

  return (
    <>
      <SubBar moduleId="wip" right={
        <div className="row gap8 ac">
          {liveByEng && <span className="chip tiny" style={{ background: 'var(--green-bg)', color: 'var(--green)', cursor: 'pointer' }} title="Nilai standar engagement aktif ditarik dari jam aktual Time & Budget (live)" onClick={() => nav('time', { from: 'wip' })}><I.clock size={11} /> Sinkron T&B</span>}
          <span className="chip tiny" title="Seluruh angka ditarik dari sub-buku WIP_ENG → kontrol GL 1-300"><I.link2 size={11} /> Satu sumber kebenaran</span>
          <Btn sm onClick={() => nav('firmfinance', { from: 'wip' })}><I.table size={13} /> Kontrol GL 1-300</Btn>
          <Btn sm onClick={onExport}><I.download size={13} /> Export WIP</Btn>
          <Btn sm variant="primary" onClick={() => nav('billing', { from: 'wip' })}><I.receipt size={14} /> Buat Tagihan</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        {/* headline KPI — semua diturunkan dari FIRMFIN.wip() */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + M(W.unbilledTotal) + ' M'} label="Saldo WIP Belum Ditagih" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + M(W.netRecoverable) + ' M'} label="Nilai Dapat Dipulihkan Neto" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={pc(W.avgRealization)} label="Realisasi Rata-rata" accent={realColor(W.avgRealization)} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={pc(W.avgMargin)} label="Margin Rata-rata" accent={marginColor(W.avgMargin)} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + jt(W.provisionTotal) + ' jt'} label={'Penyisihan WIP · ' + pc(W.provisionPct, 1)} accent="var(--red)" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
          <div style={{ padding: 14 }}>

            {tab === 'valuasi' && (
              <div className="grid" style={{ gridTemplateColumns: selRow ? '1fr 360px' : '1fr', gap: 12, alignItems: 'start' }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Sub-buku Valuasi WIP per Perikatan</h3><div style={{ flex: 1 }} /><span className="tiny muted">tarif standar Rp {fmt(W.stdRate)}/jam · nilai dalam juta Rp · klik baris</span></div>
                  <table className="dtbl">
                    <thead><tr>
                      <th>Perikatan</th><th>Partner</th><th className="num">Nilai Standar</th><th className="num">Penyesuaian</th><th className="num">Recoverable</th><th className="num">Difakturkan</th><th className="num">WIP</th><th>Umur</th><th className="num">Realisasi</th><th className="num">Margin</th>
                    </tr></thead>
                    <tbody>
                      {W.registerAll.map((r: any) => {
                        const adj = r.writeUp - r.writeDown;
                        return (
                          <tr key={r.id} className={r.id === sel ? 'sel' : ''} onClick={() => setSel(r.id === sel ? null : r.id)} style={{ cursor: 'pointer' }}>
                            <td><div style={{ fontWeight: 600 }} className="truncate">{r.clientShort}</div><div className="tiny muted mono">{r.id}</div></td>
                            <td className="tiny muted">{r.partner.split(' ')[0]}</td>
                            <td className="num">{jt(r.std)}</td>
                            <td className="num" style={{ color: adj > 0 ? 'var(--green)' : adj < 0 ? 'var(--red)' : 'var(--ink-4)' }}>{adj === 0 ? '—' : (adj > 0 ? '+' : '−') + jt(Math.abs(adj))}</td>
                            <td className="num" style={{ fontWeight: 600 }}>{jt(r.recoverable)}</td>
                            <td className="num muted">{r.billed ? jt(r.billed) : '—'}</td>
                            <td className="num" style={{ fontWeight: 700, color: r.unbilled > 0 ? 'var(--blue)' : 'var(--teal)' }}>{r.unbilled < 0 ? '(' + jt(-r.unbilled) + ')' : jt(r.unbilled)}</td>
                            <td><span className="tiny" style={{ fontWeight: 600, color: r.atRisk ? 'var(--red)' : r.age > 60 ? 'var(--amber)' : 'var(--ink-3)' }}>{r.age}h</span></td>
                            <td className="num" style={{ fontWeight: 700, color: realColor(r.realization) }}>{pc(r.realization)}</td>
                            <td className="num" style={{ color: marginColor(r.margin) }}>{pc(r.margin)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot><tr>
                      <td colSpan={2}>TOTAL · {W.registerAll.length} perikatan</td>
                      <td className="num">{jt(W.totStd)}</td>
                      <td className="num">{(W.totWriteUp - W.totWriteDown) >= 0 ? '+' : '−'}{jt(Math.abs(W.totWriteUp - W.totWriteDown))}</td>
                      <td className="num">{jt(W.totRecoverable)}</td>
                      <td className="num">{jt(W.totBilled)}</td>
                      <td className="num">{jt(W.unbilledTotal)}</td>
                      <td></td>
                      <td className="num">{pc(W.avgRealization)}</td>
                      <td className="num">{pc(W.avgMargin)}</td>
                    </tr></tfoot>
                  </table>
                  {W.deferredIncome > 0 && (
                    <div className="tiny muted" style={{ padding: '8px 12px', lineHeight: 1.5 }}>
                      Termasuk posisi <b>over-billed</b> Rp {jt(W.deferredIncome)} jt (penagihan di muka) — disajikan terpisah sebagai <b>pendapatan diterima di muka</b> (liabilitas), bukan pengurang aset WIP.
                    </div>
                  )}
                </Panel>

                {selRow && <WipValDetail r={selRow} jt={jt} pc={pc} realColor={realColor} marginColor={marginColor} onClose={() => setSel(null)} nav={nav} />}
              </div>
            )}

            {tab === 'pemulihan' && (
              <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start' }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Matriks Penyisihan WIP berbasis Umur</h3><div style={{ flex: 1 }} /><span className="tiny muted">pola ECL · faktor kebijakan {fmt(provFactor, 2)}×</span></div>
                  <table className="dtbl">
                    <thead><tr><th>Umur belum tertagih</th><th className="num">Saldo WIP</th><th className="num">Perikatan</th><th style={{ width: 150 }}>Komposisi</th><th className="num">Tarif</th><th className="num">Penyisihan</th></tr></thead>
                    <tbody>
                      {W.aging.map((a: any) => (
                        <tr key={a.key}>
                          <td style={{ fontWeight: 600, color: a.key === 'b90p' ? 'var(--red)' : a.key === 'b90' ? 'var(--amber)' : 'var(--ink)' }}>{a.bucket}</td>
                          <td className="num" style={{ fontWeight: 600 }}>{jt(a.value)}</td>
                          <td className="num muted">{a.n || '—'}</td>
                          <td><div style={{ height: 8, borderRadius: 5, background: 'var(--surface-3)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: (a.value / agingMax * 100) + '%', background: a.key === 'b90p' ? 'var(--red)' : a.key === 'b90' ? 'var(--amber)' : 'var(--blue)' }} /></div></td>
                          <td className="num tiny mono">{pc(a.rate, 1)}</td>
                          <td className="num" style={{ fontWeight: 600, color: 'var(--red)' }}>{a.provision ? '(' + jt(a.provision) + ')' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr><td>TOTAL</td><td className="num">{jt(W.unbilledTotal)}</td><td colSpan={3} className="num">Penyisihan teragregasi</td><td className="num" style={{ color: 'var(--red)' }}>({jt(W.provisionTotal)})</td></tr></tfoot>
                  </table>
                  <div className="panel" style={{ margin: '0 12px 12px', padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                    <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}><I.clock size={11} /> Rp {jt(W.atRiskWIP)} jt WIP berusia &gt; 90 hari — penyisihan {pc(W.aging[3].rate, 0)}. Prioritaskan penerbitan faktur atau write-down untuk menjaga arus kas.</div>
                  </div>
                </Panel>

                <div className="grid" style={{ gap: 12 }}>
                  <Panel title="Kebijakan Penyisihan" sub="stres tarif matriks">
                    <div className="row gap8 ac" style={{ marginBottom: 12 }}><Seg options={presets.map(p => p.k)} value={activePreset === 'Custom' ? presets[0].k : activePreset} onChange={(k: any) => setProvFactor((presets.find(p => p.k === k) || { f: 1 }).f)} /></div>
                    <SliderRow label="Faktor kebijakan penyisihan" value={provFactor} min={0.5} max={2.5} step={0.1} suffix="×" onChange={setProvFactor} hint="Mengalikan tarif tiap bucket umur" />
                    <div className="divider" />
                    <div style={{ display: 'grid', gap: 7 }}>
                      <RowKv label="WIP Bruto belum ditagih" v={'Rp ' + jt(W.unbilledTotal) + ' jt'} />
                      <RowKv label={'Penyisihan (' + pc(W.provisionPct, 1) + ')'} v={'(Rp ' + jt(W.provisionTotal) + ' jt)'} />
                      <RowKv label="Nilai dapat dipulihkan neto" v={'Rp ' + jt(W.netRecoverable) + ' jt'} strong />
                    </div>
                  </Panel>
                  <Panel title="Realisasi vs Target" sub="target firma 95%">
                    <div className="row ac" style={{ gap: 14 }}>
                      <Donut size={104} thickness={15} segments={[
                        { value: Math.min(W.avgRealization * 100, 100), color: realColor(W.avgRealization) },
                        { value: Math.max(0, 100 - W.avgRealization * 100), color: 'var(--surface-3)' },
                      ]} center={<><div style={{ fontSize: 19, fontWeight: 800, color: realColor(W.avgRealization) }}>{pc(W.avgRealization)}</div><div className="tiny muted">realisasi</div></>} />
                      <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                        <KvBox label="Recoverable kotor" v={'Rp ' + M(W.totRecoverable) + ' M'} accent="var(--green)" />
                        <KvBox label="Gap ke target 95%" v={(W.avgRealization >= 0.95 ? '+' : '') + fmt((W.avgRealization - 0.95) * 100, 1) + ' pts'} accent={W.avgRealization >= 0.95 ? 'var(--green)' : 'var(--red)'} />
                      </div>
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {tab === 'sumber' && (
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
                <Panel title="Mutasi WIP Belum Ditagih (roll-forward)" sub="sub-buku perikatan material">
                  <div>
                    {W.movement.map((m: any) => (
                      <div key={m.k} className="row jb ac" style={{ padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
                        <span style={{ fontSize: 12.5, fontWeight: m.strong ? 700 : 500, color: m.strong ? 'var(--ink)' : 'var(--ink-2)' }}>{m.op && <span className="mono" style={{ color: 'var(--ink-4)', marginRight: 6 }}>{m.op}</span>}{m.label}</span>
                        <span className="mono" style={{ fontWeight: m.strong ? 800 : 600, fontSize: 13, color: m.accent === 'green' ? 'var(--green)' : m.accent === 'red' ? 'var(--red)' : m.strong ? 'var(--navy)' : 'var(--ink)' }}>{(m.value < 0 ? '(' : '') + 'Rp ' + jt(Math.abs(m.value)) + ' jt' + (m.value < 0 ? ')' : '')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>WIP terbentuk dari jam ter-charge pada tarif standar; berkurang saat difakturkan (transfer ke piutang 1-200) atau di-write-down. Saldo akhir = sub-buku valuasi.</div>
                </Panel>

                <div className="grid" style={{ gap: 12 }}>
                  <Panel title="Rekonsiliasi ke Kontrol GL 1-300" sub="bukti satu sumber kebenaran">
                    <div>
                      {W.bridge.map((b: any, i: any) => (
                        <div key={i} className="row jb ac" style={{ padding: '8px 0', borderBottom: i < W.bridge.length - 1 ? '1px solid var(--line-soft)' : 'none', background: b.control ? 'var(--blue-050)' : 'transparent', margin: b.control ? '4px -6px 0' : 0, paddingLeft: b.control ? 6 : 0, paddingRight: b.control ? 6 : 0, borderRadius: b.control ? 4 : 0 }}>
                          <span style={{ fontSize: 12, fontWeight: b.strong ? 700 : 500, color: b.strong ? 'var(--ink)' : 'var(--ink-2)' }}>{b.control ? '= ' : (b.strong ? '' : '+ ')}{b.label}</span>
                          <span className="mono" style={{ fontWeight: b.strong ? 800 : 600, fontSize: 12.5, color: b.control ? 'var(--blue)' : 'var(--ink)' }}>Rp {jt(b.value)} jt</span>
                        </div>
                      ))}
                    </div>
                    <div className="row ac gap6" style={{ marginTop: 10 }}>
                      <Badge kind={Math.abs(W.reconciling) < 1e6 ? 'green' : 'blue'}>{Math.abs(W.reconciling) < 1e6 ? 'Cocok persis' : 'Terjembatani'}</Badge>
                      <span className="tiny muted">selisih teridentifikasi Rp {jt(W.reconciling)} jt</span>
                    </div>
                  </Panel>

                  <Panel title="Provenansi & Keterkaitan" sub="lineage data WIP">
                    <div className="tiny muted" style={{ marginBottom: 8, lineHeight: 1.5 }}>Sumber: sub-buku <b className="mono">WIP_ENG</b> × <b>Engagements</b> × <b>Clients</b> (jam × tarif standar). Perubahan di pemilik data mengalir otomatis ke seluruh modul di bawah.</div>
                    <div className="row gap8" style={{ flexWrap: 'wrap' }}>
                      {[
                        { id: 'time', ic: 'clock', lbl: 'Time & Budget' },
                        { id: 'wipreal', ic: 'hourglass', lbl: 'WIP & Realisasi' },
                        { id: 'billing', ic: 'receipt', lbl: 'Billing' },
                        { id: 'revenue', ic: 'receipt', lbl: 'Pendapatan & WIP' },
                        { id: 'firmfinance', ic: 'coins', lbl: 'Firm Finance' },
                      ].map(x => {
                        const Ic = (I as any)[x.ic] || I.link2;
                        return <button key={x.id} type="button" className="lin-chip" style={{ borderLeftColor: 'var(--blue)', flex: '1 1 45%' }} onClick={() => nav(x.id, { from: 'wip' })}><span className="lin-ic" style={{ color: 'var(--blue)' }}><Ic size={14} /></span><span className="lin-txt"><span className="lin-lbl">{x.lbl}</span></span><span className="lin-go"><I.arrowRight size={12} /></span></button>;
                      })}
                    </div>
                  </Panel>
                </div>
              </div>
            )}

          </div>
        </Panel>
      </div></div>
    </>
  );
}

/* panel detail valuasi per-perikatan — waterfall rekonsiliasi WIP */
function WipValDetail({ r, jt, pc, realColor, marginColor, onClose, nav }: any) {
  const Line = ({ label, v, op, strong, accent }: any) => (
    <div className="row jb ac" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <span className="tiny" style={{ fontWeight: strong ? 700 : 500, color: strong ? 'var(--ink)' : 'var(--ink-2)' }}>{op && <span className="mono" style={{ color: 'var(--ink-4)', marginRight: 5 }}>{op}</span>}{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 800 : 600, fontSize: 12.5, color: accent || 'var(--ink)' }}>{(v < 0 ? '(' : '') + 'Rp ' + jt(Math.abs(v)) + ' jt' + (v < 0 ? ')' : '')}</span>
    </div>
  );
  return (
    <Panel noBody style={{ position: 'sticky', top: 0 }}>
      <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 15px' }}>
        <div className="row jb ac" style={{ marginBottom: 6 }}><span className="mono tiny" style={{ color: '#bcd6e4', fontWeight: 700 }}>{r.id}</span><button className="top-btn" onClick={onClose}><I.x size={17} /></button></div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{r.clientShort}</div>
        <div className="tiny" style={{ color: '#bcd6e4' }}>{r.partner} · {r.type}</div>
      </div>
      <div style={{ padding: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 13 }}>
          <KvBox label="Realisasi" v={pc(r.realization)} accent={realColor(r.realization)} />
          <KvBox label="Margin" v={pc(r.margin)} accent={marginColor(r.margin)} />
        </div>
        <div className="tiny muted upper" style={{ marginBottom: 4 }}>Rekonsiliasi Valuasi WIP</div>
        <div style={{ marginBottom: 13 }}>
          <Line label={'Nilai standar (' + r.hours + ' jam)'} v={r.std} strong />
          {r.writeUp > 0 && <Line label="Write-up (premium)" v={r.writeUp} op="+" accent="var(--green)" />}
          {r.writeDown > 0 && <Line label="Write-down" v={-r.writeDown} op="−" accent="var(--red)" />}
          <Line label="Nilai dapat dipulihkan" v={r.recoverable} op="=" strong accent="var(--navy)" />
          <Line label="Telah difakturkan" v={-r.billed} op="−" />
          <Line label="Saldo WIP belum ditagih" v={r.unbilled} op="=" strong accent={r.unbilled > 0 ? 'var(--blue)' : 'var(--teal)'} />
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 12 }}>
          <KvBox label={'Umur · ' + r.bucket} v={r.age + ' hari'} accent={r.atRisk ? 'var(--red)' : r.age > 60 ? 'var(--amber)' : 'var(--ink-2)'} />
          <KvBox label={'Penyisihan (' + pc(r.provRate, 0) + ')'} v={'Rp ' + jt(Math.round(Math.max(0, r.unbilled) * r.provRate)) + ' jt'} accent="var(--red)" />
        </div>
        {r.unbilled < 0 && <div className="panel" style={{ padding: '8px 10px', background: 'var(--teal-bg)', borderColor: 'transparent', marginBottom: 12 }}><div className="tiny" style={{ fontWeight: 600 }}>Posisi over-billed — diakui sebagai pendapatan diterima di muka (liabilitas), bukan aset WIP.</div></div>}
        <div className="row gap8" style={{ flexWrap: 'wrap' }}>
          {r.unbilled > 0 && <Btn sm variant="primary" onClick={() => nav('billing', { from: 'wip' })}><I.receipt size={13} /> Terbitkan Faktur</Btn>}
          <Btn sm onClick={() => nav('time', { from: 'wip' })}><I.clock size={13} /> Jam & Anggaran</Btn>
        </div>
      </div>
    </Panel>
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
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{l.line}</div><div className="tiny" style={{ opacity: .85 }}>Rincian pendapatan · {(l.rev / total * 100).toFixed(0)}% dari total KAP</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
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

Object.assign(window, { FirmFinance, WIPValuation });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FirmFinance, WIPValuation };
