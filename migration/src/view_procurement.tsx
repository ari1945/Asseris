/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useFirm, useNav } from './contexts';
import { PROC } from './data_procurement';
import { I } from './icons';
import { SubBar } from './shell';
import { Btn, Donut, Panel } from './ui';
import { BoBadge, BoStat, BoTabPanel, boJt, boM } from './view_bo1';
import { ProcDiligence, ProcLineage, ProcP2P, ProcSpend, ProcVendorDrawer } from './view_procurement2';
import { BO } from './data_backoffice';
import { amsExportXlsx } from './export_xlsx';

/* ============================================================
   Asseris — Pengadaan & Manajemen Vendor (DEEP) · 1/2
   Modul mendalam: master vendor = sumber tunggal counterparty.
   Seluruh angka diturunkan dari PROC (lapisan kanonik):
   spend ← Σ vendor.ytd · komitmen ← PO(vendorId) · 3-way ← PO↔GRN↔Faktur
   · kontrak ← Legal SSOT · AP ← BILLS→GL. Cockpit tak menyimpan salinan.
   Reuse: boJt/boM/BoBadge/BoTabPanel/BoStat (view_bo1); KV/SectionTitle/
   HBars (fpm_parts); Panel/Donut/Stat/Tabs/Btn (ui); SubBar (shell).
   ============================================================ */
const { useState: useStateProc, useMemo: useMemoProc } = React;

/* warna risiko & util kecil */
const PROC_RISKC = { Rendah: 'var(--green)', Sedang: 'var(--amber)', Tinggi: 'var(--red)' };
const procPct = (x: any) => Math.round(x * 100) + '%';

/* skor bar mini (0–100) */
function ScoreBar({ pct, color }: any) {
  const c = color || (pct >= 95 ? 'var(--green)' : pct >= 85 ? 'var(--blue)' : 'var(--amber)');
  return (
    <div className="row ac gap6" style={{ minWidth: 90 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}>
        <div style={{ width: Math.min(100, pct) + '%', height: '100%', borderRadius: 3, background: c }} />
      </div>
      <span className="mono tiny" style={{ fontWeight: 700, color: c }}>{pct}</span>
    </div>
  );
}

/* funnel procure-to-pay — satu rantai status */
function P2PFunnel({ stages, onJump }: any) {
  const max = Math.max(...stages.map((s: any) => s.val), 1);
  return (
    <div style={{ display: 'grid', gap: 7 }}>
      {stages.map((s: any, i: any) => (
        <button key={s.key} type="button" className="p2p-stage" onClick={() => onJump && onJump(s.key)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface-1)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, flex: '0 0 22px', display: 'grid', placeItems: 'center', background: s.c + '1a', color: s.c, fontWeight: 800, fontSize: 11 }} className="mono">{s.n}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="row ac jb">
              <span className="tiny" style={{ fontWeight: 700 }}>{s.label}</span>
              <span className="mono tiny" style={{ fontWeight: 700 }}>{boJt(s.val)}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-3)', marginTop: 4 }}>
              <div style={{ width: (s.val / max * 100) + '%', height: '100%', borderRadius: 3, background: s.c }} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* daftar alert operasional (diturunkan) */
function ProcAlerts({ B, P, nav, setTab, setVSel }: any) {
  const blocked = B.VENDORS.filter((v: any) => v.status === 'Diblokir');
  const dilig = B.VENDORS.filter((v: any) => v.diligence !== 'Lengkap' && v.status !== 'Diblokir');
  const pendPO = B.PURCHASE_ORDERS.filter((p: any) => p.status === 'Menunggu Approval');
  const bva = P.budgetVsActual();
  const over = bva.rows.filter((r: any) => r.over);
  const twm = P.threeWayMatch().filter((t: any) => t.result !== 'match');

  const items = [];
  blocked.forEach((v: any) => items.push({ tone: 'red', ic: 'lock', t: 'Vendor diblokir — ' + v.name, s: 'PMPJ gagal (pajak) · terkait sengketa Legal LIT-01', go: () => setVSel(v) }));
  if (pendPO.length) items.push({ tone: 'amber', ic: 'clock', t: pendPO.length + ' PO menunggu approval', s: 'Nilai ' + boJt(pendPO.reduce((s: any, p: any) => s + p.amount, 0)) + ' · rantai otorisasi', go: () => setTab('p2p') });
  twm.forEach((t: any) => items.push({ tone: 'amber', ic: 'scale', t: '3-way match perlu reviu — ' + t.bill.id, s: t.result === 'variance' ? 'Selisih harga ' + boJt(Math.abs(t.variance)) : t.result === 'nopo' ? 'Faktur tanpa PO' : 'Menunggu GRN', go: () => setTab('p2p') }));
  dilig.forEach((v: any) => items.push({ tone: 'amber', ic: 'shield', t: 'PMPJ belum lengkap — ' + v.name, s: 'Status: ' + v.diligence, go: () => setVSel(v) }));
  over.forEach((r: any) => items.push({ tone: 'amber', ic: 'trend', t: 'Anggaran terlampaui — ' + r.cat, s: 'Aktual ' + boJt(r.actual) + ' vs anggaran ' + boJt(r.budget), go: () => setTab('spend') }));

  return (
    <div style={{ display: 'grid', gap: 7 }}>
      {items.slice(0, 7).map((a, i) => (
        <button key={i} type="button" onClick={a.go}
          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', borderLeft: '3px solid var(--' + a.tone + ')', background: 'var(--surface-1)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
          <span style={{ color: 'var(--' + a.tone + ')', flex: '0 0 auto' }}>{React.createElement((I as any)[a.ic] || I.alert, { size: 15 })}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="tiny truncate" style={{ fontWeight: 600, maxWidth: 300 }}>{a.t}</div>
            <div className="tiny muted truncate" style={{ maxWidth: 300 }}>{a.s}</div>
          </div>
          <I.arrowRight size={12} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
        </button>
      ))}
      {!items.length && <div className="tiny muted">Tidak ada peringatan terbuka.</div>}
    </div>
  );
}

/* ============================================================
   Modul utama — Pengadaan & Vendor (deep)
   ============================================================ */
function Procurement() {
  const firm = useFirm();
  const nav = useNav();
  const P = PROC;
  const B = BO;
  const [tab, setTab] = useStateProc('overview');
  const [vSel, setVSel] = useStateProc(null);

  const hl = useMemoProc(() => P.headline(firm), [firm.engagements, firm.clients]);
  const spend = useMemoProc(() => P.spendByCategory(), []);
  const funnel = useMemoProc(() => P.procureToPay(), []);
  const conc = useMemoProc(() => P.concentration(), []);

  const tabs = [
    { id: 'overview', label: 'Ikhtisar' },
    { id: 'vendor', label: 'Vendor 360', count: B.VENDORS.length },
    { id: 'p2p', label: 'Procure-to-Pay', count: B.PURCHASE_ORDERS.length },
    { id: 'spend', label: 'Spend & Anggaran' },
    { id: 'diligence', label: 'Due Diligence / PMPJ' },
    { id: 'lineage', label: 'Sumber Kebenaran' },
  ];

  const total = conc.total;
  const onExport = async () => {
    const vRows: (string | number)[][] = [];
    for (const v of B.VENDORS) vRows.push([v.id, v.name, v.cat, v.npwp, v.since, AMS.rp(v.ytd), procPct(v.ytd / total), v.otp + '%', v.risk, v.diligence, v.status]);
    const poRows: (string | number)[][] = [];
    for (const p of B.PURCHASE_ORDERS) poRows.push([p.id, AMS.rp(p.amount), p.status]);
    await amsExportXlsx({
      kind: 'firm-procurement', scope: 'firm',
      fileName: 'Register Pengadaan & Vendor.xlsx',
      firm: 'KAP Wijaya Hartono & Rekan',
      title: 'Register Vendor & Purchase Order',
      meta: [`${B.VENDORS.length} vendor master · ${B.PURCHASE_ORDERS.length} PO · belanja YTD ${AMS.fmt(hl.spendYtd / 1e9, 1)} M · HHI ${conc.hhi}`],
      sheets: [
        { name: 'Master Vendor', columns: ['ID', 'Vendor', 'Kategori', 'NPWP', 'Sejak', 'Belanja YTD', 'Share', 'SLA', 'Risiko', 'PMPJ', 'Status'], rows: vRows, colWidths: [10, 28, 16, 20, 8, 20, 8, 8, 10, 14, 12] },
        { name: 'Purchase Order', columns: ['No. PO', 'Nilai', 'Status'], rows: poRows, colWidths: [16, 20, 20] },
      ],
    });
  };

  return (
    <>
      <SubBar moduleId="procurement" right={
        <div className="row gap8 ac">
          <span className="chip tiny"><I.link2 size={11} /> {B.VENDORS.length} vendor master · {B.PURCHASE_ORDERS.length} PO</span>
          <Btn sm onClick={onExport}><I.download size={13} /> Ekspor Register</Btn>
          <span className="chip tiny muted" title="Read-only — pembuatan PO dikelola di CoreSys (roadmap)"><I.lock size={11} /> Read-only</span>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <BoStat value={boM(hl.spendYtd, 1)} label="Belanja Vendor YTD" />
          <BoStat value={boJt(hl.committedVal)} label="Komitmen PO Disetujui" accent="var(--blue)" />
          <BoStat value={hl.pendingPO + ' · ' + boJt(hl.pendingVal)} label="PO Menunggu Approval" accent="var(--amber)" />
          <BoStat value={hl.attention} label="Vendor Perlu Perhatian" accent={hl.attention ? 'var(--red)' : 'var(--green)'} />
        </div>

        <BoTabPanel tabs={tabs} tab={tab} setTab={setTab}>

          {/* ===================== IKHTISAR ===================== */}
          {tab === 'overview' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
                <div className="row ac gap8" style={{ marginBottom: 5 }}><I.link2 size={15} style={{ color: 'var(--blue)' }} /><b style={{ fontSize: 12.5 }}>Master vendor adalah satu-satunya sumber kebenaran counterparty</b></div>
                <div className="tiny muted" style={{ lineHeight: 1.55 }}>Belanja, komitmen PO, 3-way match, kontrak (Legal) & utang usaha (AP/GL) semuanya <b>ditarik</b> dari record vendor yang sama — tidak ada NPWP/rekening/PMPJ ganda. Tab <b>Sumber Kebenaran</b> membuktikan tiap angka menutup ke kontrolnya.</div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1.25fr 1fr', gap: 14, alignItems: 'start' }}>
                <Panel title="Belanja per Kategori" sub={'diturunkan dari master · ' + boM(spend.total, 1) + ' total'} actions={<button className="btn sm" style={{ height: 22 }} onClick={() => setTab('spend')}><I.arrowRight size={11} /></button>}>
                  <div className="row gap14" style={{ alignItems: 'center' }}>
                    <Donut size={128} thickness={18}
                      segments={spend.rows.map((r: any) => ({ label: r.cat, value: r.v, color: r.c }))}
                      center={<><div className="mono" style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>{AMS.fmt(spend.total / 1e9, 1)}M</div><div className="tiny muted">YTD</div></>} />
                    <div style={{ flex: 1 }}>
                      {spend.rows.slice(0, 6).map((r: any) => (
                        <div key={r.cat} className="row jb ac" style={{ padding: '3px 0', borderBottom: '1px solid var(--line-soft)' }}>
                          <span className="row ac gap8" style={{ minWidth: 0 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: r.c, flex: '0 0 8px' }} /><span className="tiny truncate" style={{ fontWeight: 600, maxWidth: 150 }}>{r.cat}</span></span>
                          <span className="mono tiny" style={{ fontWeight: 700 }}>{boJt(r.v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="row gap8" style={{ marginTop: 10 }}>
                    <div className="panel" style={{ flex: 1, padding: '8px 10px', boxShadow: 'none' }}>
                      <div className="tiny muted upper">Top-1 vendor</div>
                      <div className="row ac jb"><b className="tiny truncate" style={{ maxWidth: 130 }}>{conc.vendors[0].name.replace('PT ', '')}</b><span className="mono tiny" style={{ fontWeight: 800, color: 'var(--amber)' }}>{procPct(conc.top1)}</span></div>
                    </div>
                    <div className="panel" style={{ flex: 1, padding: '8px 10px', boxShadow: 'none' }}>
                      <div className="tiny muted upper">Top-3 konsentrasi</div>
                      <div className="row ac jb"><span className="tiny muted">risiko ketergantungan</span><span className="mono tiny" style={{ fontWeight: 800, color: 'var(--amber)' }}>{procPct(conc.top3)}</span></div>
                    </div>
                    <div className="panel" style={{ flex: 1, padding: '8px 10px', boxShadow: 'none' }}>
                      <div className="tiny muted upper">Indeks HHI</div>
                      <div className="row ac jb"><span className="tiny muted">{conc.hhi > 2500 ? 'terkonsentrasi' : 'moderat'}</span><span className="mono tiny" style={{ fontWeight: 800 }}>{conc.hhi}</span></div>
                    </div>
                  </div>
                </Panel>

                <div style={{ display: 'grid', gap: 14 }}>
                  <Panel title="Siklus Procure-to-Pay" sub="satu rantai status · klik untuk detail">
                    <P2PFunnel stages={funnel} onJump={() => setTab('p2p')} />
                  </Panel>
                  <Panel title="Perlu Tindakan" sub="diturunkan lintas-modul">
                    <ProcAlerts B={B} P={P} nav={nav} setTab={setTab} setVSel={setVSel} />
                  </Panel>
                </div>
              </div>
            </div>
          )}

          {/* ===================== VENDOR 360 ===================== */}
          {tab === 'vendor' && <ProcVendorTable B={B} P={P} vSel={vSel} setVSel={setVSel} />}

          {/* ===================== lazy tabs (part 2) ===================== */}
          {tab === 'p2p' && <ProcP2P B={B} P={P} nav={nav} />}
          {tab === 'spend' && <ProcSpend B={B} P={P} conc={conc} />}
          {tab === 'diligence' && <ProcDiligence B={B} setVSel={setVSel} nav={nav} />}
          {tab === 'lineage' && <ProcLineage P={P} firm={firm} nav={nav} />}

        </BoTabPanel>
      </div></div>

      {vSel && <ProcVendorDrawer vendorId={vSel.id} firm={firm} onClose={() => setVSel(null)} nav={nav} />}
    </>
  );
}

/* ---------- tabel Vendor 360 (master diperkaya) ---------- */
function ProcVendorTable({ B, P, vSel, setVSel }: any) {
  const total = P.concentration().total;
  return (
    <div>
      <div className="panel" style={{ padding: '10px 13px', margin: '12px 14px 0', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
        <div className="tiny" style={{ lineHeight: 1.5 }}><I.users size={13} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Klik vendor untuk membuka <b>Vendor 360</b> — identitas master, kontrak (Legal), PO & faktur, lisensi, kinerja SLA & modul yang mengonsumsinya. Semua dari satu record.</div>
      </div>
      <table className="dtbl zebra">
        <thead><tr>
          <th>ID</th><th>Vendor</th><th>Kategori</th><th className="num">Belanja YTD</th><th className="num">Share</th><th>Kinerja (SLA)</th><th>Risiko</th><th>PMPJ</th><th>Status</th>
        </tr></thead>
        <tbody>
          {B.VENDORS.map((v: any) => (
            <tr key={v.id} onClick={() => setVSel(v)} style={{ cursor: 'pointer' }} className={vSel && vSel.id === v.id ? 'sel' : ''}>
              <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{v.id}</td>
              <td><div style={{ fontWeight: 600, fontSize: 11.5 }}>{v.name}</div><div className="tiny muted mono">{v.npwp} · sejak {v.since}</div></td>
              <td className="tiny">{v.cat}</td>
              <td className="num">{boJt(v.ytd)}</td>
              <td className="num"><span className="mono tiny" style={{ fontWeight: 700, color: v.ytd / total > 0.25 ? 'var(--amber)' : 'var(--ink-2)' }}>{procPct(v.ytd / total)}</span></td>
              <td><ScoreBar pct={v.otp} /></td>
              <td><span className="badge" style={{ textTransform: 'none', background: (PROC_RISKC as any)[v.risk] + '1a', color: (PROC_RISKC as any)[v.risk] }}>{v.risk}</span></td>
              <td><BoBadge s={v.diligence} /></td>
              <td><BoBadge s={v.status} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={3}>Σ Master Vendor</td><td className="num">{boM(total, 2)}</td><td colSpan={5}></td></tr></tfoot>
      </table>
    </div>
  );
}

Object.assign(window, { Procurement, ProcVendorTable, ScoreBar, P2PFunnel, ProcAlerts, PROC_RISKC, procPct });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { P2PFunnel, PROC_RISKC, ProcAlerts, ProcVendorTable, Procurement, ScoreBar, procPct };
