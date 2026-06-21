/* [codemod] ESM imports */
import React from 'react';
import { PROC } from './data_procurement';
import { I } from './icons.jsx';
import { MiniBars, Spark } from './ui.jsx';
import { BoBadge, boJt, boM } from './view_bo1.jsx';
import { PDrawer } from './view_docparts.jsx';
import { HBars, KV, SectionTitle } from './view_fpm_parts.jsx';
import { PROC_RISKC, procPct } from './view_procurement.jsx';
import { LEGAL } from './data_legal';

/* ============================================================
   NeoSuite AMS — Pengadaan & Vendor (DEEP) · 2/2
   Procure-to-Pay · Spend & Anggaran · Due Diligence/PMPJ ·
   Sumber Kebenaran (rekonsiliasi) · Vendor 360 drawer.
   Semua data dari PROC (kanonik). LINEAGE.procurement
   memasang dock keterkaitan dua-arah modul.
   ============================================================ */
const { useMemo: useMemoProc2 } = React;

const P2P_STAGE_BADGE = { PR: 'gray', Approval: 'amber', GRN: 'blue', Faktur: 'blue', Bayar: 'green', Ditolak: 'red' };
const MATCH_META = {
  match: { lbl: '3-way OK', cls: 'b-green' },
  variance: { lbl: 'Selisih harga', cls: 'b-amber' },
  nopo: { lbl: 'Tanpa PO', cls: 'b-amber' },
  nogrn: { lbl: 'Menunggu GRN', cls: 'b-blue' },
};

/* ====================== PROCURE-TO-PAY ====================== */
function ProcP2P({ B, P, nav }) {
  const REQS = B.REQUISITIONS || [];
  const POS = B.PURCHASE_ORDERS || [];
  const twm = useMemoProc2(() => P.threeWayMatch(), []);
  const exceptions = twm.filter(t => t.result !== 'match');

  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
        <div className="tiny" style={{ lineHeight: 1.55 }}><I.link2 size={13} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Rantai <b>Requisition → PO → Penerimaan (GRN) → Faktur → Bayar</b>. Tiap PO menunjuk <b>vendorId</b> ke master; pembayaran hanya diloloskan setelah <b>3-way match</b> menutup. Faktur disetujui mengalir ke <button type="button" className="lnk" onClick={() => nav('apar', { from: 'procurement' })}>AP/AR</button> & <button type="button" className="lnk" onClick={() => nav('firmgl', { from: 'procurement' })}>GL 2-100</button>.</div>
      </div>

      {/* Requisitions */}
      <SectionTitle right={<span className="tiny muted">{REQS.length} permintaan</span>}>Purchase Requisition (hulu)</SectionTitle>
      <table className="dtbl" style={{ marginBottom: 16 }}>
        <thead><tr><th>No. PR</th><th>Departemen</th><th>Deskripsi</th><th>Peminta</th><th>Kategori Anggaran</th><th className="num">Estimasi</th><th>PO</th><th>Status</th></tr></thead>
        <tbody>
          {REQS.map(r => (
            <tr key={r.id}>
              <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
              <td className="tiny" style={{ fontWeight: 600 }}>{r.dept}</td>
              <td className="tiny" style={{ maxWidth: 220, whiteSpace: 'normal', lineHeight: 1.3 }}>{r.desc}</td>
              <td className="tiny muted">{r.requester}</td>
              <td className="tiny muted">{r.budgetCat}</td>
              <td className="num">{boJt(r.est)}</td>
              <td className="mono tiny">{r.poId ? <span style={{ color: 'var(--blue)' }}>{r.poId}</span> : <span className="muted">—</span>}</td>
              <td><BoBadge s={r.status === 'Jadi PO' ? 'Disetujui' : r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Purchase Orders + stage */}
      <SectionTitle right={<span className="tiny muted">vendorId → master vendor</span>}>Purchase Order & Rantai Otorisasi</SectionTitle>
      <table className="dtbl" style={{ marginBottom: 16 }}>
        <thead><tr><th>No. PO</th><th>Vendor (master)</th><th>Deskripsi</th><th>Dept.</th><th className="num">Nilai</th><th>Butuh</th><th>Otorisasi</th><th>Tahap</th></tr></thead>
        <tbody>
          {POS.map(p => {
            const v = P.vById(p.vendorId);
            const d = B.daysTo(p.need);
            return (
              <tr key={p.id}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{p.id}</td>
                <td><div className="row ac gap6"><span className="mono tiny" style={{ color: 'var(--ink-3)' }}>{p.vendorId}</span><span style={{ fontWeight: 600, fontSize: 11.5 }}>{v ? v.name : '⚠ tak dikenal'}</span></div></td>
                <td className="tiny" style={{ maxWidth: 200, whiteSpace: 'normal', lineHeight: 1.3 }}>{p.desc}</td>
                <td className="tiny muted">{p.dept}</td>
                <td className="num">{boJt(p.amount)}</td>
                <td className="tiny mono" style={{ color: d < 5 ? 'var(--red)' : 'var(--ink-2)' }}>{p.need}<span className="muted"> · {d}h</span></td>
                <td className="tiny">{p.appr}</td>
                <td><span className={'badge b-' + (P2P_STAGE_BADGE[p.stage] || 'gray')} style={{ textTransform: 'none' }}>{p.stage}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 3-way match */}
      <SectionTitle right={<span className="tiny muted">{exceptions.length} perlu reviu</span>}>3-Way Match · PO ↔ GRN ↔ Faktur</SectionTitle>
      <table className="dtbl">
        <thead><tr><th>Faktur</th><th>Vendor</th><th>PO</th><th className="num">PO</th><th className="num">GRN</th><th className="num">Faktur</th><th className="num">Selisih</th><th>Hasil</th></tr></thead>
        <tbody>
          {twm.map(t => {
            const m = MATCH_META[t.result];
            return (
              <tr key={t.bill.id} style={{ background: t.result === 'match' ? undefined : 'var(--amber-bg)' }}>
                <td className="mono tiny" style={{ fontWeight: 700 }}>{t.bill.id}</td>
                <td className="tiny" style={{ fontWeight: 600 }}>{t.vendor ? t.vendor.name.replace('PT ', '').replace('CV ', '') : '—'}</td>
                <td className="mono tiny" style={{ color: t.po ? 'var(--blue)' : 'var(--red)' }}>{t.po ? t.po.id : '—'}</td>
                <td className="num tiny">{t.poAmt != null ? boJt(t.poAmt) : '—'}</td>
                <td className="num tiny">{t.grnAmt != null ? boJt(t.grnAmt) : '—'}</td>
                <td className="num">{boJt(t.billAmt)}</td>
                <td className="num tiny" style={{ fontWeight: 700, color: t.variance ? 'var(--red)' : 'var(--green)' }}>{t.variance ? boJt(t.variance) : '0'}</td>
                <td><span className={'badge ' + m.cls} style={{ textTransform: 'none' }}>{m.lbl}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}><I.alert size={12} style={{ verticalAlign: -2, color: 'var(--amber)' }} /> Faktur <b>INV-SC-2208</b> menahan pembayaran: faktur Rp 272 jt &gt; PO Rp 268 jt (selisih harga) — diteruskan sebagai sengketa vendor sebelum diakui ke utang usaha.</div>
    </div>
  );
}

/* ====================== SPEND & ANGGARAN ====================== */
function ProcSpend({ B, P, conc }) {
  const bva = useMemoProc2(() => P.budgetVsActual(), []);
  const spend = P.spendByCategory();
  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 14, alignItems: 'start', marginBottom: 16 }}>
        <div>
          <SectionTitle right={<span className="mono tiny muted">{boM(spend.total, 1)} aktual</span>}>Belanja per Kategori <span className="tiny muted">(Σ vendor.ytd)</span></SectionTitle>
          <HBars rows={spend.rows.map(c => ({ label: c.cat, value: c.v, color: c.c, right: boJt(c.v) }))} />
        </div>
        <div>
          <SectionTitle>Konsentrasi Vendor</SectionTitle>
          <div className="panel" style={{ padding: '11px 13px' }}>
            {conc.vendors.slice(0, 6).map(v => (
              <div key={v.id} className="row jb ac" style={{ padding: '5px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <span className="tiny truncate" style={{ fontWeight: 600, maxWidth: 170 }}>{v.name.replace('PT ', '').replace('CV ', '')}</span>
                <span className="row ac gap8">
                  <div style={{ width: 70, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (v.ytd / conc.total * 100) + '%', height: '100%', borderRadius: 3, background: v.ytd / conc.total > 0.25 ? 'var(--amber)' : 'var(--blue)' }} /></div>
                  <span className="mono tiny" style={{ fontWeight: 700, width: 34, textAlign: 'right' }}>{procPct(v.ytd / conc.total)}</span>
                </span>
              </div>
            ))}
            <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Top-3 vendor = <b>{procPct(conc.top3)}</b> belanja (HHI {conc.hhi}). Pertimbangkan vendor pembanding untuk kategori lisensi & sewa.</div>
          </div>
        </div>
      </div>

      <SectionTitle right={<span className="tiny muted">aktual DITURUNKAN dari master · {bva.overCount} kategori lewat anggaran</span>}>Anggaran vs Aktual per Kategori</SectionTitle>
      <table className="dtbl">
        <thead><tr><th>Kategori</th><th className="num">Anggaran</th><th className="num">Aktual (YTD)</th><th>Serapan</th><th className="num">Sisa</th><th>Status</th></tr></thead>
        <tbody>
          {bva.rows.map(r => (
            <tr key={r.cat} style={{ background: r.over ? 'var(--amber-bg)' : undefined }}>
              <td><span className="row ac gap8"><span style={{ width: 9, height: 9, borderRadius: 2, background: r.color }} /><span style={{ fontWeight: 600, fontSize: 11.5 }}>{r.cat}</span></span></td>
              <td className="num">{boJt(r.budget)}</td>
              <td className="num" style={{ fontWeight: 600 }}>{boJt(r.actual)}</td>
              <td style={{ width: 150 }}><div className="row ac gap6"><div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, r.pct) + '%', height: '100%', borderRadius: 4, background: r.over ? 'var(--red)' : r.pct > 90 ? 'var(--amber)' : 'var(--blue)' }} /></div><span className="mono tiny" style={{ fontWeight: 700 }}>{r.pct}%</span></div></td>
              <td className="num tiny" style={{ color: r.variance < 0 ? 'var(--red)' : 'var(--ink-2)' }}>{boJt(r.variance)}</td>
              <td>{r.over ? <span className="badge b-red" style={{ textTransform: 'none' }}>Lewat anggaran</span> : r.pct > 90 ? <span className="badge b-amber" style={{ textTransform: 'none' }}>Mendekati</span> : <span className="badge b-green" style={{ textTransform: 'none' }}>Dalam batas</span>}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td>TOTAL</td><td className="num">{boM(bva.budgetTotal, 2)}</td><td className="num">{boM(bva.actualTotal, 2)}</td><td colSpan={3}></td></tr></tfoot>
      </table>
    </div>
  );
}

/* ====================== DUE DILIGENCE / PMPJ ====================== */
function ProcDiligence({ B, setVSel, nav }) {
  const order = { 'Lengkap': 0, 'Berjalan': 1, 'Perlu Reviu': 2, 'Gagal — pajak': 3 };
  const rows = B.VENDORS.slice().sort((a, b) => (order[b.diligence] || 0) - (order[a.diligence] || 0));
  const stat = { lengkap: B.VENDORS.filter(v => v.diligence === 'Lengkap').length, perlu: B.VENDORS.filter(v => v.diligence === 'Perlu Reviu' || v.diligence === 'Berjalan').length, gagal: B.VENDORS.filter(v => v.diligence.includes('Gagal')).length };
  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
        <div className="panel" style={{ padding: '10px 13px', borderTop: '3px solid var(--green)' }}><div className="mono" style={{ fontSize: 19, fontWeight: 800 }}>{stat.lengkap}</div><div className="tiny muted">PMPJ Lengkap (NPWP, SPPKP & rekening terverifikasi)</div></div>
        <div className="panel" style={{ padding: '10px 13px', borderTop: '3px solid var(--amber)' }}><div className="mono" style={{ fontSize: 19, fontWeight: 800, color: 'var(--amber)' }}>{stat.perlu}</div><div className="tiny muted">Perlu Reviu / verifikasi berjalan</div></div>
        <div className="panel" style={{ padding: '10px 13px', borderTop: '3px solid var(--red)' }}><div className="mono" style={{ fontSize: 19, fontWeight: 800, color: 'var(--red)' }}>{stat.gagal}</div><div className="tiny muted">Gagal PMPJ — diblokir dari PO baru</div></div>
      </div>

      <div className="panel" style={{ padding: '10px 13px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
        <div className="tiny" style={{ lineHeight: 1.5 }}><I.shield size={13} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> PMPJ (Prinsip Mengenali Pemasok/Mitra) menahan PO untuk vendor berstatus gagal/berisiko tinggi. Status pajak non-aktif <b>PT Servis Komputer Andal (V-046)</b> memblokir vendor & menaut ke sengketa <button type="button" className="lnk" onClick={() => nav('legal', { from: 'procurement' })}>Legal LIT-01</button>.</div>
      </div>

      <table className="dtbl">
        <thead><tr><th>Vendor</th><th>PIC</th><th>Termin</th><th>Onboard</th><th>Rekening</th><th>Risiko</th><th>Status PMPJ</th><th></th></tr></thead>
        <tbody>
          {rows.map(v => (
            <tr key={v.id} style={{ background: v.diligence.includes('Gagal') ? 'var(--red-bg)' : undefined }}>
              <td><div style={{ fontWeight: 600, fontSize: 11.5 }}>{v.name}</div><div className="tiny muted mono">{v.id} · {v.npwp}</div></td>
              <td className="tiny">{v.pic}</td>
              <td className="tiny mono">{v.terms}</td>
              <td className="tiny mono muted">{v.onboard}</td>
              <td className="tiny mono muted">{v.bank}</td>
              <td><span className="badge" style={{ textTransform: 'none', background: PROC_RISKC[v.risk] + '1a', color: PROC_RISKC[v.risk] }}>{v.risk}</span></td>
              <td><BoBadge s={v.diligence} /></td>
              <td><button className="btn sm" style={{ height: 22 }} onClick={() => setVSel(v)} title="Vendor 360"><I.arrowRight size={11} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ====================== SUMBER KEBENARAN (rekonsiliasi) ====================== */
function ProcLineage({ P, firm, nav }) {
  const recons = useMemoProc2(() => P.reconciliations(firm), [firm.engagements, firm.clients]);
  const ap = useMemoProc2(() => P.apBridge(), []);
  const cons = useMemoProc2(() => P.crossModuleConsumption(), []);
  const SUB = (window.FIRMOPS && window.FIRMOPS.SUBMODULES) || [];

  /* modul hilir yang memakai data vendor master */
  const flows = [
    { id: 'legal', ic: 'gavel', lbl: 'Kontrak & Legal', rel: 'Nilai kontrak sewa/lisensi/MoU = master vendor' },
    { id: 'apar', ic: 'coins', lbl: 'AP / AR Firma', rel: 'Faktur vendor (BILLS) → utang usaha' },
    { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Utang usaha → kontrol GL 2-100' },
    { id: 'facilities', ic: 'building', lbl: 'Aset & Fasilitas', rel: 'Pengadaan aset & lisensi software' },
    { id: 'firmops', ic: 'building', lbl: 'Cockpit Operasi', rel: 'Belanja YTD → komposisi biaya operasi' },
    { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'PPh 23 atas jasa vendor & PPN masukan' },
  ];

  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <SectionTitle>Rekonsiliasi Sub-Ledger → Kontrol</SectionTitle>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginBottom: 18 }}>
        {recons.map(r => (
          <div key={r.id} className="panel" style={{ padding: '12px 13px', borderTop: '3px solid ' + (r.ok ? 'var(--green)' : 'var(--amber)') }}>
            <div className="row ac gap8" style={{ marginBottom: 8 }}>
              {r.ok ? <span className="badge b-green" style={{ textTransform: 'none' }}>✓ Menutup</span> : <span className="badge b-amber" style={{ textTransform: 'none' }}>≠ Perlu reviu</span>}
              <div style={{ flex: 1 }} />
              <button className="btn sm icon" style={{ height: 22, width: 22 }} onClick={() => nav(r.to, { from: 'procurement' })} title="Buka modul"><I.arrowRight size={12} /></button>
            </div>
            <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3, marginBottom: 8, minHeight: 31 }}>{r.title}</div>
            <div className="row jb tiny" style={{ padding: '4px 0', borderBottom: '1px solid var(--line-soft)' }}><span className="muted truncate" style={{ maxWidth: 130 }}>{r.a}</span><span className="mono" style={{ fontWeight: 700 }}>{r.isCount ? r.av : boJt(r.av)}</span></div>
            <div className="row jb tiny" style={{ padding: '4px 0' }}><span className="muted truncate" style={{ maxWidth: 130 }}>{r.b}</span><span className="mono" style={{ fontWeight: 700 }}>{r.isCount ? r.bv : boJt(r.bv)}</span></div>
            <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.45 }}>{r.note}</div>
          </div>
        ))}
      </div>

      <SectionTitle right={<button className="btn sm" style={{ height: 22 }} onClick={() => nav('apar', { from: 'procurement' })}><I.arrowRight size={11} /> AP/AR</button>}>Bridge Utang Usaha — Dari Mana AP Berasal</SectionTitle>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start', marginBottom: 18 }}>
        <table className="dtbl">
          <thead><tr><th>Sumber</th><th className="num">Item</th><th className="num">Nilai Terbuka</th><th>Master?</th></tr></thead>
          <tbody>
            {ap.sources.map((s, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600, fontSize: 11.5 }}>{s.label}</td>
                <td className="num tiny">{s.n}</td>
                <td className="num">{boJt(s.v)}</td>
                <td>{s.master ? <span className="badge b-green" style={{ textTransform: 'none' }}>Master</span> : <span className="badge b-gray" style={{ textTransform: 'none' }}>Modul lain</span>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td>AP TERBUKA</td><td></td><td className="num">{boJt(ap.openTotal)}</td><td></td></tr>
            <tr><td>+ Beban akrual (belum difaktur)</td><td></td><td className="num">{boJt(ap.accrual)}</td><td></td></tr>
            <tr><td>= KONTROL GL 2-100</td><td></td><td className="num">{boJt(ap.control)}</td><td></td></tr>
          </tfoot>
        </table>
        <div className="panel" style={{ padding: '12px 14px' }}>
          <div className="row ac gap8" style={{ marginBottom: 8 }}><I.link2 size={15} style={{ color: 'var(--blue)' }} /><b style={{ fontSize: 12.5 }}>Satu vendor → banyak konsumen</b></div>
          <div className="tiny muted" style={{ lineHeight: 1.6, marginBottom: 10 }}>Utang usaha firma menutup ke kontrol GL <b>2-100</b>. Porsi dari <b>master vendor pengadaan</b> = <b>{boJt(ap.procMaster)}</b>; sisanya berasal dari modul pemiliknya sendiri (asuransi, utilitas) — bukan duplikat data vendor.</div>
          <div className="tiny upper muted" style={{ marginBottom: 6, letterSpacing: '.04em' }}>Data vendor mengalir ke</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {flows.map(f => (
              <button key={f.id} type="button" className="lin-chip" style={{ borderLeftColor: 'var(--green)' }} onClick={() => nav(f.id, { from: 'procurement' })} title={'Buka ' + f.lbl}>
                <span className="lin-ic" style={{ color: 'var(--green)' }}>{React.createElement(I[f.ic] || I.doc, { size: 14 })}</span>
                <span className="lin-txt"><span className="lin-lbl">{f.lbl}</span><span className="lin-rel">{f.rel}</span></span>
                <span className="lin-go"><I.arrowRight size={12} /></span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <SectionTitle right={<span className="tiny muted">bukti tanpa duplikasi</span>}>Matriks Konsumsi Vendor Lintas-Modul</SectionTitle>
      <table className="dtbl">
        <thead><tr><th>Vendor (master)</th><th className="num">Belanja YTD</th><th>Dikonsumsi oleh modul</th></tr></thead>
        <tbody>
          {cons.map(({ v, cons: cs }) => (
            <tr key={v.id}>
              <td><div className="row ac gap6"><span className="mono tiny" style={{ color: 'var(--ink-3)' }}>{v.id}</span><span style={{ fontWeight: 600, fontSize: 11.5 }}>{v.name}</span></div></td>
              <td className="num">{boJt(v.ytd)}</td>
              <td>
                <div className="row gap4" style={{ flexWrap: 'wrap' }}>
                  {cs.length ? cs.map((c, i) => {
                    const meta = SUB.find(s => s.id === c.m) || { label: c.m, c: '#888', icon: 'doc' };
                    return <span key={i} className="chip tiny" title={c.why} style={{ borderColor: meta.c + '55', color: meta.c }}>{React.createElement(I[meta.icon] || I.doc, { size: 10 })} {meta.label.split(' ')[0]}</span>;
                  }) : <span className="tiny muted">— hanya pengadaan</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ====================== VENDOR 360 — DRAWER ====================== */
function ProcVendorDrawer({ vendorId, firm, onClose, nav }) {
  const d = useMemoProc2(() => PROC.vendor360(vendorId, firm), [vendorId, firm.engagements, firm.clients]);
  const SUB = (window.FIRMOPS && window.FIRMOPS.SUBMODULES) || [];
  if (!d) return null;
  const v = d.v;
  const blocked = v.diligence && v.diligence.includes('Gagal');

  return (
    <PDrawer open onClose={onClose} width={620}>
      <div className="pdrawer-h">
        <span className="pdrawer-ico" style={{ background: 'var(--blue-050)', color: 'var(--blue)' }}><I.cart size={18} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{v.name}</div>
          <div className="row ac gap8" style={{ marginTop: 4, flexWrap: 'wrap' }}>
            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{v.id}</span>
            <span className="badge b-gray" style={{ textTransform: 'none' }}>{v.cat}</span>
            <BoBadge s={v.status} />
          </div>
        </div>
      </div>
      <div style={{ padding: '4px 16px 22px', flex: 1, overflow: 'auto', minHeight: 0 }}>

        {blocked && (
          <div className="panel" style={{ padding: '10px 12px', background: 'var(--red-bg)', borderColor: 'transparent', marginBottom: 12 }}>
            <div className="tiny" style={{ lineHeight: 1.5 }}><I.lock size={13} style={{ verticalAlign: -2, color: 'var(--red)' }} /> Vendor <b>diblokir</b> — PMPJ gagal (status pajak non-aktif). Tidak dapat dipakai untuk PO baru. Terkait sengketa <button type="button" className="lnk" onClick={() => nav('legal', { from: 'procurement' })}>Legal LIT-01</button>.</div>
          </div>
        )}

        <SectionTitle>Data Master <span className="tiny muted">(sumber tunggal)</span></SectionTitle>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <KV label="NPWP" v={<span className="mono">{v.npwp}</span>} />
          <KV label="Rekening" v={<span className="mono" style={{ fontSize: 11 }}>{v.bank}</span>} />
          <KV label="Belanja YTD" v={boJt(v.ytd)} accent="var(--blue)" sub={'share ' + procPct(d.spendShare)} />
          <KV label="Termin" v={v.terms} />
          <KV label="PIC internal" v={v.pic} />
          <KV label="Onboard / PMPJ" v={v.onboard} />
        </div>

        <SectionTitle>Kinerja & Risiko</SectionTitle>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <KV label="On-time delivery" v={v.otp + '%'} accent={v.otp >= 95 ? 'var(--green)' : v.otp >= 85 ? 'var(--amber)' : 'var(--red)'} />
          <KV label="Kualitas" v={v.qual.toFixed(1) + ' / 5'} accent={v.qual >= 4 ? 'var(--green)' : 'var(--amber)'} />
          <KV label="Rating keseluruhan" v={v.rating.toFixed(1) + ' / 5'} />
          <KV label="Risiko / sengketa" v={v.risk + (v.disp ? ' · ' + v.disp + ' sengketa' : '')} accent={PROC_RISKC[v.risk]} />
        </div>
        <div className="panel" style={{ padding: '7px 10px', marginBottom: 14, boxShadow: 'none' }}>
          <div className="tiny muted upper" style={{ marginBottom: 4 }}>Tren belanja (6 bln · jt)</div>
          <div className="row ac gap10"><MiniBars data={v.tr} width={150} height={34} color={v.cat === 'Sewa & Fasilitas' ? '#013a52' : '#005085'} /><Spark data={v.tr} width={130} height={34} color="#0a6b73" /></div>
        </div>

        <SectionTitle right={<span className="mono tiny muted">{d.contracts.length}</span>}>Kontrak Tertaut <span className="tiny muted">(Legal SSOT)</span></SectionTitle>
        <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
          {d.contracts.length ? d.contracts.map(c => (
            <button key={c.id} type="button" className="lin-chip" style={{ borderLeftColor: 'var(--purple)' }} onClick={() => nav('legal', { from: 'procurement' })} title="Buka registri kontrak">
              <span className="lin-ic" style={{ color: 'var(--purple)' }}><I.gavel size={14} /></span>
              <span className="lin-txt"><span className="lin-lbl">{c.type}</span><span className="lin-rel">{c.id} · {LEGAL.moneyJt(c.value)} · berakhir {c.end || '—'}</span></span>
              <span className="lin-go"><I.arrowRight size={12} /></span>
            </button>
          )) : <div className="tiny muted">Belum ada kontrak formal di registri Legal.</div>}
        </div>

        {(d.pos.length > 0 || d.bills.length > 0) && (
          <>
            <SectionTitle right={<span className="mono tiny muted">PO {d.pos.length} · Faktur {d.bills.length}</span>}>Pesanan & Faktur</SectionTitle>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <KV label="Komitmen PO terbuka" v={boJt(d.openPO)} accent="var(--blue)" />
              <KV label="Faktur terbuka (AP)" v={boJt(d.openBills)} accent={d.openBills ? 'var(--amber)' : 'var(--green)'} />
            </div>
            {d.pos.length > 0 && (
              <div style={{ display: 'grid', gap: 5, marginBottom: 14 }}>
                {d.pos.map(p => (
                  <div key={p.id} className="row ac jb" style={{ padding: '6px 9px', borderRadius: 7, border: '1px solid var(--line)' }}>
                    <div className="row ac gap6" style={{ minWidth: 0 }}><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{p.id}</span><span className="tiny truncate" style={{ maxWidth: 230 }}>{p.desc}</span></div>
                    <span className="row ac gap6" style={{ flex: '0 0 auto' }}><span className="mono tiny" style={{ fontWeight: 700 }}>{boJt(p.amount)}</span><span className={'badge b-' + (P2P_STAGE_BADGE[p.stage] || 'gray')} style={{ textTransform: 'none' }}>{p.stage}</span></span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {(d.licenses.length > 0 || d.maintenance.length > 0) && (
          <>
            <SectionTitle>Lisensi & Pemeliharaan <span className="tiny muted">(Fasilitas)</span></SectionTitle>
            <div style={{ display: 'grid', gap: 5, marginBottom: 14 }}>
              {d.licenses.map(l => (
                <div key={l.name} className="row ac jb" style={{ padding: '6px 9px', borderRadius: 7, border: '1px solid var(--line)' }}>
                  <span className="tiny truncate" style={{ fontWeight: 600, maxWidth: 260 }}>{l.name}</span>
                  <span className="mono tiny muted">{l.used}/{l.seats} seat · {boJt(l.cost)}</span>
                </div>
              ))}
              {d.maintenance.map(m => (
                <div key={m.id} className="row ac jb" style={{ padding: '6px 9px', borderRadius: 7, border: '1px solid var(--line)' }}>
                  <span className="tiny truncate" style={{ fontWeight: 600, maxWidth: 260 }}>{m.asset} · {m.type}</span>
                  <span className="mono tiny muted">{m.due} · {boJt(m.cost)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <SectionTitle right={<span className="mono tiny muted">{d.consumers.length} modul</span>}>Dikonsumsi oleh Modul</SectionTitle>
        <div style={{ display: 'grid', gap: 6 }}>
          {d.consumers.length ? d.consumers.map((c, i) => {
            const meta = SUB.find(s => s.id === c.m) || { label: c.m, c: '#888', icon: 'doc' };
            return (
              <button key={i} type="button" className="lin-chip" style={{ borderLeftColor: meta.c }} onClick={() => nav(c.m, { from: 'procurement' })} title={'Buka ' + meta.label}>
                <span className="lin-ic" style={{ color: meta.c }}>{React.createElement(I[meta.icon] || I.doc, { size: 14 })}</span>
                <span className="lin-txt"><span className="lin-lbl">{meta.label}</span><span className="lin-rel">{c.why}</span></span>
                <span className="lin-go"><I.arrowRight size={12} /></span>
              </button>
            );
          }) : <div className="tiny muted">Hanya dipakai modul Pengadaan.</div>}
        </div>
      </div>
    </PDrawer>
  );
}

Object.assign(window, { ProcP2P, ProcSpend, ProcDiligence, ProcLineage, ProcVendorDrawer });

/* ---------- LINEAGE dock: keterkaitan dua-arah modul Pengadaan ---------- */
if (window.LINEAGE) {
  window.LINEAGE.procurement = {
    std: 'Backoffice · Pengadaan & Vendor (master counterparty SSOT)',
    up: [
      { id: 'firmops', ic: 'building', lbl: 'Cockpit Operasi', rel: 'Anggaran operasi & permintaan belanja departemen' },
      { id: 'facilities', ic: 'building', lbl: 'Aset & Fasilitas', rel: 'Kebutuhan pengadaan aset, lisensi & pemeliharaan' },
      { id: 'travel', ic: 'plane', lbl: 'Perjalanan & Reimburse', rel: 'Permintaan tiket/akomodasi fieldwork (vendor travel)' },
      { id: 'records', ic: 'archive', lbl: 'Retensi & Arsip', rel: 'Permintaan jasa pemusnahan arsip jatuh tempo' },
    ],
    down: [
      { id: 'legal', ic: 'gavel', lbl: 'Kontrak & Legal', rel: 'Master vendor → nilai kontrak sewa/lisensi/MoU (registri SSOT)' },
      { id: 'apar', ic: 'coins', lbl: 'AP / AR Firma', rel: 'Faktur vendor (3-way match) → utang usaha' },
      { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Utang usaha & belanja → posting kontrol GL 2-100' },
      { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'PPh 23 jasa vendor & PPN masukan' },
      { id: 'firmfinance', ic: 'coins', lbl: 'Firm Finance', rel: 'Belanja vendor → komposisi biaya operasi (L/R)' },
    ],
  };
}


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ProcDiligence, ProcLineage, ProcP2P, ProcSpend, ProcVendorDrawer };
