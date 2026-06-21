/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons.jsx';
import { Panel } from './ui.jsx';
import { BoBadge, boJt, boM } from './view_bo1';
import { KV, SectionTitle } from './view_fpm_parts';

/* ============================================================
   NeoSuite AMS — Aset & Fasilitas (DEEP) · 2/2
   Pemeliharaan & K3 · Lisensi & Langganan · Ruang & Okupansi ·
   Sewa & Asuransi · Sumber Kebenaran (rekonsiliasi + jembatan ERP).
   Semua data dari FAC (via props dari view_facilities). LINEAGE.facilities memasang dock.
   ============================================================ */
const { useMemo: useMemoFac2 } = React;

/* ====================== PEMELIHARAAN & K3 ====================== */
function FacMaintenance({ FA, nav }) {
  const mt = useMemoFac2(() => FA.maintenance(), []);
  const buckets = [
    { key: 'late', lbl: 'Terlambat / lewat tempo', test: m => m.status === 'Terlambat' || m.days < 0, col: 'var(--red)' },
    { key: 'soon', lbl: '≤ 14 hari', test: m => m.days >= 0 && m.days <= 14, col: 'var(--amber)' },
    { key: 'sched', lbl: '> 14 hari', test: m => m.days > 14, col: 'var(--green)' },
  ];
  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
        <div className="panel" style={{ padding: '10px 13px', borderTop: '3px solid var(--red)' }}><div className="mono" style={{ fontSize: 19, fontWeight: 800, color: mt.overdue ? 'var(--red)' : 'inherit' }}>{mt.overdue}</div><div className="tiny muted">Terlambat</div></div>
        <div className="panel" style={{ padding: '10px 13px', borderTop: '3px solid var(--amber)' }}><div className="mono" style={{ fontSize: 19, fontWeight: 800 }}>{mt.dueSoon}</div><div className="tiny muted">Jatuh tempo ≤14 hari</div></div>
        <div className="panel" style={{ padding: '10px 13px', borderTop: '3px solid var(--purple)' }}><div className="mono" style={{ fontSize: 19, fontWeight: 800 }}>{mt.k3}</div><div className="tiny muted">Inspeksi K3 wajib</div></div>
        <div className="panel" style={{ padding: '10px 13px', borderTop: '3px solid var(--blue)' }}><div className="mono" style={{ fontSize: 19, fontWeight: 800 }}>{boJt(mt.cost)}</div><div className="tiny muted">Total biaya terjadwal</div></div>
      </div>

      <div className="panel" style={{ padding: '10px 13px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
        <div className="tiny" style={{ lineHeight: 1.5 }}><I.link2 size={13} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Pekerjaan oleh <b>vendor master</b> (mis. V-018 untuk server) menunjuk record yang sama di <button type="button" className="lnk" onClick={() => nav('procurement', { from: 'facilities' })}>Pengadaan</button>; inspeksi K3 (lift, APAR) oleh otoritas/PJK3 eksternal. Tenggat ini juga muncul di kalender kewajiban <button type="button" className="lnk" onClick={() => nav('firmops', { from: 'facilities' })}>Cockpit Operasi</button>.</div>
      </div>

      {buckets.map(bk => {
        const items = mt.rows.filter(bk.test);
        if (!items.length) return null;
        return (
          <div key={bk.key} style={{ marginBottom: 14 }}>
            <div className="row ac gap8" style={{ marginBottom: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: bk.col }} />
              <b style={{ fontSize: 12.5 }}>{bk.lbl}</b><span className="tiny muted">· {items.length}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
            </div>
            <table className="dtbl">
              <thead><tr><th>ID</th><th>Aset</th><th>Jenis</th><th>Vendor</th><th>Jatuh Tempo</th><th className="num">Biaya</th><th>Status</th></tr></thead>
              <tbody>
                {items.map(m => (
                  <tr key={m.id}>
                    <td className="mono tiny" style={{ fontWeight: 700 }}>{m.id}</td>
                    <td style={{ fontWeight: 600, fontSize: 11.5 }}>{m.asset}</td>
                    <td>{m.k3 ? <span className="badge b-purple" style={{ textTransform: 'none' }}><I.shield size={10} /> {m.type}</span> : <span className="tiny">{m.type}</span>}</td>
                    <td className="tiny">{m.vendorId ? <span className="row ac gap6"><span className="mono" style={{ color: 'var(--blue)' }}>{m.vendorId}</span><span className="muted">{m.vendor.name}</span></span> : <span className="muted">{m.vendor} <span className="chip tiny" style={{ marginLeft: 4 }}>eksternal</span></span>}</td>
                    <td className="tiny mono" style={{ color: m.days < 0 ? 'var(--red)' : 'var(--ink-2)' }}>{m.due}<span className="muted"> · {m.days < 0 ? Math.abs(m.days) + 'h lalu' : m.days + 'h'}</span></td>
                    <td className="num">{boJt(m.cost)}</td>
                    <td><BoBadge s={m.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/* ====================== LISENSI & LANGGANAN ====================== */
function FacLicenses({ FA, firm, nav }) {
  const lic = useMemoFac2(() => FA.licenses(firm), [firm.engagements, firm.clients]);
  const renew = lic.filter(l => l.renew);
  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <div className="panel" style={{ padding: '10px 13px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
        <div className="tiny" style={{ lineHeight: 1.5 }}><I.key size={13} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Biaya & seat lisensi ditarik dari satu record. Kolom <b>Vendor</b> menunjuk <button type="button" className="lnk" onClick={() => nav('procurement', { from: 'facilities' })}>master vendor</button>; kolom <b>Kontrak</b> menunjuk registri <button type="button" className="lnk" onClick={() => nav('legal', { from: 'facilities' })}>Legal (OPS-LIC)</button> yang menarik nilai dari lisensi yang sama. {renew.length} lisensi perlu perpanjangan ≤90 hari.</div>
      </div>
      <table className="dtbl">
        <thead><tr><th>Software</th><th>Vendor (master)</th><th>Kontrak</th><th className="num">Seat</th><th>Utilisasi</th><th>Berakhir</th><th className="num">Biaya/thn</th><th>Status</th></tr></thead>
        <tbody>
          {lic.map(l => (
            <tr key={l.name} style={{ background: l.renew ? 'var(--amber-bg)' : undefined }}>
              <td style={{ fontWeight: 600, fontSize: 11.5 }}>{l.name}</td>
              <td className="tiny">{l.vendorId ? <span className="row ac gap6"><span className="mono" style={{ color: 'var(--blue)' }}>{l.vendorId}</span><span className="muted truncate" style={{ maxWidth: 120 }}>{l.vendor.name}</span></span> : <span className="muted">{l.vendor} <span className="chip tiny">reseller</span></span>}</td>
              <td className="mono tiny">{l.contract ? <span style={{ color: 'var(--purple)', cursor: 'pointer' }} onClick={() => nav('legal', { from: 'facilities' })}>{l.contract.id}</span> : <span className="muted">—</span>}</td>
              <td className="num mono">{l.used}/{l.seats}</td>
              <td style={{ width: 120 }}><div className="row ac gap6"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: l.util + '%', height: '100%', borderRadius: 3, background: l.util > 90 ? 'var(--amber)' : 'var(--blue)' }} /></div><span className="tiny mono">{l.util}%</span></div></td>
              <td className="tiny mono" style={{ color: l.days < 30 ? 'var(--red)' : 'var(--ink-2)' }}>{l.exp}<span className="muted"> · {l.days}h</span></td>
              <td className="num">{boJt(l.cost)}</td>
              <td><BoBadge s={l.status} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={6}>TOTAL BIAYA LISENSI / THN</td><td className="num">{boJt(lic.reduce((s, l) => s + l.cost, 0))}</td><td></td></tr></tfoot>
      </table>
    </div>
  );
}

/* ====================== RUANG & OKUPANSI ====================== */
function FacSpace({ FA }) {
  const sp = useMemoFac2(() => FA.space(), []);
  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        <div className="panel" style={{ padding: '10px 13px' }}><div className="mono" style={{ fontSize: 19, fontWeight: 800 }}>{sp.util}%</div><div className="tiny muted">Okupansi rata-rata</div></div>
        <div className="panel" style={{ padding: '10px 13px' }}><div className="mono" style={{ fontSize: 19, fontWeight: 800 }}>{sp.occ}/{sp.seats}</div><div className="tiny muted">Kursi terisi</div></div>
        <div className="panel" style={{ padding: '10px 13px' }}><div className="mono" style={{ fontSize: 19, fontWeight: 800 }}>{sp.area.toLocaleString('id-ID')} m²</div><div className="tiny muted">Total luas</div></div>
        <div className="panel" style={{ padding: '10px 13px' }}><div className="mono" style={{ fontSize: 19, fontWeight: 800 }}>{sp.seats - sp.occ}</div><div className="tiny muted">Kursi tersedia</div></div>
      </div>
      <SectionTitle right={<span className="mono tiny muted">{sp.occ}/{sp.seats} kursi terisi</span>}>Okupansi per Lantai <span className="tiny muted">(gedung sewa V-024)</span></SectionTitle>
      <div style={{ display: 'grid', gap: 12 }}>
        {sp.rows.map(f => (
          <div key={f.floor} className="panel" style={{ padding: '11px 13px' }}>
            <div className="row jb ac" style={{ marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 12.5 }}>{f.floor}</span>
              <span className="tiny muted mono">{f.area} m² · {f.occ}/{f.seats} kursi</span>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: 'var(--surface-3)' }}><div style={{ width: f.util + '%', height: '100%', borderRadius: 5, background: f.util > 85 ? 'var(--amber)' : 'var(--blue)' }} /></div>
            <div className="tiny muted" style={{ marginTop: 4 }}>Utilisasi {f.util}% — {f.seats - f.occ} kursi tersedia</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ====================== SEWA & ASURANSI ====================== */
function FacLeaseInsurance({ FA, reg, firm, nav }) {
  const lease = useMemoFac2(() => FA.lease(firm), [firm.engagements, firm.clients]);
  const ins = useMemoFac2(() => FA.insurance(), []);
  const cap = useMemoFac2(() => FA.capex(), []);
  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start', marginBottom: 16 }}>
        {/* SEWA */}
        <Panel title="Sewa Kantor (PSAK 73)" sub="aset hak-guna · sumber: master vendor + Legal" actions={<button className="btn sm" style={{ height: 22 }} onClick={() => nav('legal', { from: 'facilities' })}><I.arrowRight size={11} /></button>}>
          {lease.vendor ? (
            <>
              <div className="row ac gap8" style={{ marginBottom: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-050)', color: 'var(--blue)', flex: '0 0 34px' }}><I.building size={17} /></span>
                <div><div style={{ fontWeight: 700, fontSize: 13 }}>{lease.vendor.name}</div><div className="tiny muted mono">{lease.vendor.id} · {lease.contract ? lease.contract.id : '—'}</div></div>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <KV label="Sewa tahunan" v={boM(lease.value, 2)} accent="var(--blue)" />
                <KV label="Berakhir" v={lease.end || '—'} />
                <KV label="Termin" v={lease.vendor.terms} />
                <KV label="3 lantai" v={FA.space().area.toLocaleString('id-ID') + ' m²'} />
              </div>
              <div className="panel" style={{ padding: '9px 11px', marginTop: 10, background: 'var(--surface-2)', boxShadow: 'none' }}>
                <div className="tiny muted" style={{ lineHeight: 1.5 }}>Diakui sebagai <b>aset hak-guna (ROU)</b> & liabilitas sewa per PSAK 73. Nilai = belanja master vendor V-024 (= kontrak Legal <b>OPS-LEASE</b>) — satu angka, tiga modul.</div>
              </div>
            </>
          ) : <div className="tiny muted">Kontrak sewa tidak ditemukan.</div>}
        </Panel>

        {/* ASURANSI */}
        <Panel title="Asuransi Aset" sub="Property & Office All-Risk · sumber: polis" actions={<button className="btn sm" style={{ height: 22 }} onClick={() => nav('insurance', { from: 'facilities' })}><I.arrowRight size={11} /></button>}>
          {ins.policy ? (
            <>
              <div className="row ac gap8" style={{ marginBottom: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--amber-bg)', color: 'var(--amber)', flex: '0 0 34px' }}><I.umbrella size={17} /></span>
                <div><div style={{ fontWeight: 700, fontSize: 13 }}>{ins.policy.insurer}</div><div className="tiny muted mono">{ins.policy.id} · {ins.policy.jenis}</div></div>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <KV label="Limit pertanggungan" v={boM(ins.limit, 0)} accent="var(--green)" />
                <KV label="Premi/thn" v={boJt(ins.premi)} />
                <KV label="Aset diasuransikan" v={ins.insuredCount + ' / ' + ins.total} />
                <KV label="Perolehan tercakup" v={boM(ins.insuredCost, 2)} />
              </div>
              <div className="tiny muted" style={{ marginBottom: 4 }}>Rasio pertanggungan vs harga perolehan</div>
              <div style={{ height: 9, borderRadius: 5, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, ins.coverRatio * 100 / 3) + '%', height: '100%', borderRadius: 5, background: ins.coverRatio >= 1 ? 'var(--green)' : 'var(--amber)' }} /></div>
              <div className="tiny muted" style={{ marginTop: 4 }}>Limit {boM(ins.limit, 0)} menutup {ins.coverRatio >= 1 ? 'penuh' : 'sebagian'} perolehan {boM(ins.totCost, 2)} ({Math.round(ins.coverRatio * 100)}%).</div>
            </>
          ) : <div className="tiny muted">Polis properti tidak ditemukan.</div>}
        </Panel>
      </div>

      {/* CAPEX PIPELINE */}
      <SectionTitle right={<button className="btn sm" style={{ height: 22 }} onClick={() => nav('procurement', { from: 'facilities' })}><I.arrowRight size={11} /> Pengadaan</button>}>Pipeline Kapitalisasi (Capex) <span className="tiny muted">— dari Pengadaan</span></SectionTitle>
      {cap.length ? (
        <table className="dtbl">
          <thead><tr><th>No. PR</th><th>Departemen</th><th>Deskripsi</th><th>Kategori Kapitalisasi</th><th className="num">Estimasi</th><th>Status</th></tr></thead>
          <tbody>
            {cap.map(r => (
              <tr key={r.id}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                <td className="tiny" style={{ fontWeight: 600 }}>{r.dept}</td>
                <td className="tiny">{r.desc}</td>
                <td className="tiny muted">{r.capCat}</td>
                <td className="num">{boJt(r.est)}</td>
                <td><BoBadge s={r.status === 'Jadi PO' ? 'Disetujui' : r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <div className="tiny muted">Tidak ada permintaan pengadaan aset terbuka.</div>}
      <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}><I.link2 size={12} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Permintaan aset di Pengadaan yang disetujui & diterima akan <b>dikapitalisasi</b> ke register ini sebagai penambahan (capex) pada roll-forward NBV.</div>
    </div>
  );
}

/* ====================== SUMBER KEBENARAN ====================== */
function FacLineage({ FA, firm, nav }) {
  const recons = useMemoFac2(() => FA.reconciliations(firm), [firm.engagements, firm.clients]);
  const reg = useMemoFac2(() => FA.register(), []);
  const erp = useMemoFac2(() => FA.erpRegister(), []);
  const flows = [
    { id: 'firmops', ic: 'building', lbl: 'Cockpit Operasi', rel: 'Penyusutan → komposisi biaya operasi' },
    { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Perolehan & penyusutan → posting kontrol aset tetap' },
    { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'Penyusutan fiskal → rekonsiliasi PPh badan' },
    { id: 'insurance', ic: 'umbrella', lbl: 'Asuransi & Risiko', rel: 'Nilai aset → dasar pertanggungan All-Risk' },
    { id: 'legal', ic: 'gavel', lbl: 'Kontrak & Legal', rel: 'Sewa (PSAK 73) & lisensi → registri kontrak' },
    { id: 'procurement', ic: 'cart', lbl: 'Pengadaan & Vendor', rel: 'Perolehan & pemeliharaan ← master vendor' },
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
              <button className="btn sm icon" style={{ height: 22, width: 22 }} onClick={() => nav(r.to, { from: 'facilities' })} title="Buka modul"><I.arrowRight size={12} /></button>
            </div>
            <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3, marginBottom: 8, minHeight: 31 }}>{r.title}</div>
            <div className="row jb tiny" style={{ padding: '4px 0', borderBottom: '1px solid var(--line-soft)' }}><span className="muted truncate" style={{ maxWidth: 130 }}>{r.a}</span><span className="mono" style={{ fontWeight: 700 }}>{r.isCount ? r.av : boJt(r.av)}</span></div>
            <div className="row jb tiny" style={{ padding: '4px 0' }}><span className="muted truncate" style={{ maxWidth: 130 }}>{r.b}</span><span className="mono" style={{ fontWeight: 700 }}>{r.isCount ? r.bv : boJt(r.bv)}</span></div>
            <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.45 }}>{r.note}</div>
          </div>
        ))}
      </div>

      <SectionTitle right={<button className="btn sm" style={{ height: 22 }} onClick={() => nav('fixedassets', { from: 'facilities' })}><I.arrowRight size={11} /> Register ERP</button>}>Jembatan Dua Register Aset</SectionTitle>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start', marginBottom: 18 }}>
        <table className="dtbl">
          <thead><tr><th>Register</th><th className="num">Jml Aset</th><th className="num">Perolehan</th><th className="num">NBV</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 600, fontSize: 11.5 }}>Fasilitas (kustodian fisik)</td><td className="num">{reg.rows.length}</td><td className="num">{boM(reg.totCost, 2)}</td><td className="num" style={{ fontWeight: 600 }}>{boM(reg.totNbv, 2)}</td></tr>
            <tr><td style={{ fontWeight: 600, fontSize: 11.5 }}>ERP (akuntansi)</td><td className="num">{erp.n}</td><td className="num">{boM(erp.totCost, 2)}</td><td className="num" style={{ fontWeight: 600 }}>{boM(erp.totNbv, 2)}</td></tr>
          </tbody>
          <tfoot><tr><td>Selisih cakupan</td><td className="num">{Math.abs(reg.rows.length - erp.n)}</td><td className="num">{boM(Math.abs(reg.totCost - erp.totCost), 2)}</td><td className="num">{boM(Math.abs(reg.totNbv - erp.totNbv), 2)}</td></tr></tfoot>
        </table>
        <div className="panel" style={{ padding: '12px 14px' }}>
          <div className="row ac gap8" style={{ marginBottom: 8 }}><I.alert size={15} style={{ color: 'var(--amber)' }} /><b style={{ fontSize: 12.5 }}>Temuan: dua register paralel</b></div>
          <div className="tiny muted" style={{ lineHeight: 1.6, marginBottom: 10 }}>Register <b>Fasilitas</b> (kustodian fisik, lokasi & pemeliharaan) dan register <b>ERP</b> (akuntansi PSAK 16 → GL) saat ini terpisah. Keduanya memakai <b>mesin penyusutan yang sama</b>, namun cakupan asetnya berbeda. Rekomendasi: konsolidasi ke <b>satu master aset</b> dengan dua tampilan (operasional & akuntansi).</div>
          <div className="tiny upper muted" style={{ marginBottom: 6, letterSpacing: '.04em' }}>Data aset mengalir ke</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {flows.map(f => (
              <button key={f.id} type="button" className="lin-chip" style={{ borderLeftColor: 'var(--green)' }} onClick={() => nav(f.id, { from: 'facilities' })} title={'Buka ' + f.lbl}>
                <span className="lin-ic" style={{ color: 'var(--green)' }}>{React.createElement(I[f.ic] || I.doc, { size: 14 })}</span>
                <span className="lin-txt"><span className="lin-lbl">{f.lbl}</span><span className="lin-rel">{f.rel}</span></span>
                <span className="lin-go"><I.arrowRight size={12} /></span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FacMaintenance, FacLicenses, FacSpace, FacLeaseInsurance, FacLineage });

/* ---------- LINEAGE dock: keterkaitan dua-arah modul Aset & Fasilitas ---------- */
if (window.LINEAGE) {
  window.LINEAGE.facilities = {
    std: 'Backoffice · Aset & Fasilitas Kantor (sub-ledger PSAK 16)',
    up: [
      { id: 'procurement', ic: 'cart', lbl: 'Pengadaan & Vendor', rel: 'Perolehan aset, lisensi & pemeliharaan ← master vendor' },
      { id: 'legal', ic: 'gavel', lbl: 'Kontrak & Legal', rel: 'Kontrak sewa (PSAK 73) & lisensi software' },
      { id: 'firmops', ic: 'building', lbl: 'Cockpit Operasi', rel: 'Anggaran fasilitas & kalender pemeliharaan/K3' },
    ],
    down: [
      { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Register aset (perolehan, akumulasi, NBV) → kontrol GL' },
      { id: 'firmops', ic: 'building', lbl: 'Cockpit Operasi', rel: 'Penyusutan & lisensi → komposisi biaya operasi' },
      { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'Penyusutan fiskal → rekonsiliasi PPh badan' },
      { id: 'insurance', ic: 'umbrella', lbl: 'Asuransi & Risiko', rel: 'Nilai aset → dasar pertanggungan Property All-Risk' },
      { id: 'fixedassets', ic: 'layers', lbl: 'Aset Tetap (ERP)', rel: 'Register akuntansi paralel — direkonsiliasi' },
    ],
  };
}


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FacLeaseInsurance, FacLicenses, FacLineage, FacMaintenance, FacSpace };
