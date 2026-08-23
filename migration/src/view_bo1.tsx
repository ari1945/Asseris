/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { I } from './icons';
import { SubBar } from './shell';
import { Btn, Donut, Panel, Stat, Tabs } from './ui';
import { HBars, KV, SectionTitle } from './view_fpm_parts';
import { BO } from './data_backoffice';

/* ============================================================
   Asseris — Backoffice & Firm Mgmt (1/3)
   Pengadaan & Vendor · Aset & Fasilitas Kantor · Retensi & Arsip
   ============================================================ */
const { useState: useStateBO1 } = React;

/* shared money helpers */
const boJt = (v: any) => 'Rp ' + AMS.fmt(v / 1e6, 0) + ' jt';
const boM = (v: any, d = 1) => 'Rp ' + AMS.fmt(v / 1e9, d) + ' M';
const boBadge = {
  Aktif: 'green', Disetujui: 'green', Lengkap: 'green', Berlaku: 'green', Patuh: 'green', Digunakan: 'green', Dibayar: 'green', Selesai: 'green', Reimbursed: 'green', Terkunci: 'green',
  'Menunggu Approval': 'amber', 'Perlu Reviu': 'amber', Evaluasi: 'amber', Draft: 'gray', Berjalan: 'amber', Perpanjangan: 'amber', 'Perlu Servis': 'amber', Terjadwal: 'blue', Diproses: 'blue', Mediasi: 'amber', 'Jatuh Tempo': 'amber', Dilaporkan: 'blue', 'Usul Hapus': 'amber', 'PPL Kurang': 'amber',
  Ditolak: 'red', Diblokir: 'red', Terlambat: 'red', 'Legal Hold': 'red', Ditahan: 'red', Tinggi: 'red', 'Gagal — pajak': 'red',
  Putusan: 'gray', Dicabut: 'gray', Sedang: 'amber', Rendah: 'green',
};
const BoBadge = ({ s }: any) => <span className={'badge b-' + ((boBadge as any)[s] || 'gray')}>{s}</span>;

/* tabbed panel scaffold */
function BoTabPanel({ tabs, tab, setTab, children }: any) {
  return (
    <Panel noBody>
      <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
      {children}
    </Panel>
  );
}
function BoStat({ value, label, accent }: any) {
  return <Panel><div style={{ padding: '15px 18px' }}><Stat value={value} label={label} accent={accent} /></div></Panel>;
}

/* ============================================================
   Pengadaan & Manajemen Vendor — versi ringkas LAMA (digantikan).
   Modul mendalam kini di view_procurement.jsx / view_procurement2.jsx
   (window.Procurement). Blok ini dipertahankan sbg referensi, tak diekspor.
   ============================================================ */
function ProcurementLegacy() {
  const B = BO;
  const [tab, setTab] = useStateBO1('vendor');
  const totalSpend = B.SPEND_BY_CAT.reduce((s: any, x: any) => s + x.v, 0);
  const pendingPO = B.PURCHASE_ORDERS.filter((p: any) => p.status === 'Menunggu Approval');
  const pendingVal = pendingPO.reduce((s: any, p: any) => s + p.amount, 0);
  const tabs = [
    { id: 'vendor', label: 'Daftar Vendor', count: B.VENDORS.length },
    { id: 'po', label: 'Purchase Order', count: B.PURCHASE_ORDERS.length },
    { id: 'spend', label: 'Spend Analytics' },
    { id: 'diligence', label: 'Due Diligence Vendor' },
  ];
  return (
    <>
      <SubBar moduleId="procurement" right={<div className="row gap8 ac"><span className="chip tiny"><I.users size={11} /> {B.VENDORS.filter((v: any) => v.status === 'Aktif').length} vendor aktif</span><Btn sm variant="primary"><I.plus size={13} /> Buat PO</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <BoStat value={boM(totalSpend, 1)} label="Belanja YTD" />
          <BoStat value={pendingPO.length} label="PO Menunggu Approval" accent="var(--amber)" />
          <BoStat value={boJt(pendingVal)} label="Nilai Pending" accent="var(--amber)" />
          <BoStat value={B.VENDORS.filter((v: any) => v.risk === 'Tinggi' || v.diligence !== 'Lengkap').length} label="Vendor Perlu Perhatian" accent="var(--red)" />
        </div>

        <BoTabPanel tabs={tabs} tab={tab} setTab={setTab}>
          {tab === 'vendor' && (
            <table className="dtbl zebra">
              <thead><tr><th>ID</th><th>Vendor</th><th>Kategori</th><th className="num">Belanja YTD</th><th className="num">Rating</th><th>Risiko</th><th>PMPJ</th><th>Status</th></tr></thead>
              <tbody>
                {B.VENDORS.map((v: any) => (
                  <tr key={v.id}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{v.id}</td>
                    <td><div style={{ fontWeight: 600 }}>{v.name}</div><div className="tiny muted mono">{v.npwp} · sejak {v.since}</div></td>
                    <td className="tiny">{v.cat}</td>
                    <td className="num">{boJt(v.ytd)}</td>
                    <td className="num"><span className="mono" style={{ fontWeight: 700, color: v.rating >= 4 ? 'var(--green)' : v.rating >= 3.5 ? 'var(--amber)' : 'var(--red)' }}>{v.rating.toFixed(1)}</span></td>
                    <td><BoBadge s={v.risk} /></td>
                    <td><BoBadge s={v.diligence} /></td>
                    <td><BoBadge s={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'po' && (
            <table className="dtbl">
              <thead><tr><th>No. PO</th><th>Vendor</th><th>Deskripsi</th><th>Dept.</th><th className="num">Nilai</th><th>Butuh</th><th>Approval</th><th>Status</th></tr></thead>
              <tbody>
                {B.PURCHASE_ORDERS.map((p: any) => {
                  const d = B.daysTo(p.need);
                  return (
                    <tr key={p.id}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{p.id}</td>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>{p.vendor}</td>
                      <td className="tiny" style={{ maxWidth: 230, whiteSpace: 'normal', lineHeight: 1.3 }}>{p.desc}</td>
                      <td className="tiny muted">{p.dept}</td>
                      <td className="num">{boJt(p.amount)}</td>
                      <td className="tiny mono" style={{ color: d < 5 ? 'var(--red)' : 'var(--ink-2)' }}>{p.need}<span className="muted"> · {d}h</span></td>
                      <td className="tiny">{p.appr}</td>
                      <td><BoBadge s={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'spend' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 14, alignItems: 'start' }}>
                <div>
                  <SectionTitle right={<span className="mono tiny muted">{boM(totalSpend, 1)} total</span>}>Belanja per Kategori</SectionTitle>
                  <HBars rows={B.SPEND_BY_CAT.map((c: any) => ({ label: c.cat, value: c.v, color: c.c, right: boJt(c.v) }))} />
                </div>
                <div>
                  <SectionTitle>Konsentrasi & Distribusi</SectionTitle>
                  <div className="row ac gap14" style={{ marginBottom: 12 }}>
                    <Donut size={104} thickness={15} segments={B.SPEND_BY_CAT.map((c: any) => ({ value: c.v, color: c.c }))} center={<div><div className="mono" style={{ fontSize: 15, fontWeight: 800 }}>{B.VENDORS.length}</div><div className="tiny muted">vendor</div></div>} />
                    <div style={{ flex: 1 }}>
                      <KV label="Vendor Terbesar" v="Sewa Sentral Plaza" sub="33% dari total belanja" />
                      <div style={{ height: 8 }} />
                      <KV label="Top-3 Konsentrasi" v="71%" accent="var(--amber)" sub="risiko ketergantungan vendor" />
                    </div>
                  </div>
                  <div className="panel" style={{ padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
                    <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}><I.alert size={13} style={{ verticalAlign: -2, color: 'var(--amber)' }} /> Konsentrasi belanja TI & sewa tinggi — pertimbangkan vendor pembanding untuk kategori lisensi software.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'diligence' && (
            <table className="dtbl">
              <thead><tr><th>Vendor</th><th>PIC</th><th>Termin</th><th>Status PMPJ</th><th>Catatan</th></tr></thead>
              <tbody>
                {B.VENDORS.map((v: any) => (
                  <tr key={v.id}>
                    <td><div style={{ fontWeight: 600, fontSize: 12 }}>{v.name}</div><div className="tiny muted mono">{v.id}</div></td>
                    <td className="tiny">{v.pic}</td>
                    <td className="tiny mono">{v.terms}</td>
                    <td><BoBadge s={v.diligence} /></td>
                    <td className="tiny muted">{v.diligence === 'Lengkap' ? 'NPWP, SPPKP & rekening terverifikasi' : v.diligence === 'Gagal — pajak' ? 'Status pajak non-aktif — diblokir dari PO' : 'Verifikasi dokumen legal berjalan'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </BoTabPanel>
      </div></div>
    </>
  );
}

/* ============================================================
   Aset & Fasilitas Kantor — versi ringkas LAMA (digantikan).
   Modul mendalam kini di view_facilities.jsx / view_facilities2.jsx
   (window.Facilities). Blok ini dipertahankan sbg referensi, tak diekspor.
   ============================================================ */
function FacilitiesLegacy() {
  const B = BO;
  const [tab, setTab] = useStateBO1('register');
  /* PR-1 — register tunggal & turunan; `nbv` bukan lagi kolom seed. */
  const assetRows = B.ASSET_REGISTER.rows;
  const totCost = B.ASSET_REGISTER.totCost;
  const totNbv = B.ASSET_REGISTER.totNbv;
  const totSeats = B.SPACE.reduce((s: any, f: any) => s + f.seats, 0);
  const totOcc = B.SPACE.reduce((s: any, f: any) => s + f.occ, 0);
  const tabs = [
    { id: 'register', label: 'Register Aset', count: assetRows.length },
    { id: 'maint', label: 'Pemeliharaan & K3', count: B.MAINTENANCE.length },
    { id: 'license', label: 'Lisensi Software', count: B.SOFTWARE_LICENSES.length },
    { id: 'space', label: 'Ruang & Okupansi' },
  ];
  return (
    <>
      <SubBar moduleId="facilities" right={<div className="row gap8 ac"><span className="chip tiny"><I.link2 size={11} /> Sinkron GL: Aset Tetap</span><Btn sm variant="primary"><I.plus size={13} /> Daftarkan Aset</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <BoStat value={boM(totCost, 1)} label="Nilai Perolehan" />
          <BoStat value={boM(totNbv, 1)} label="Nilai Buku (NBV)" accent="var(--blue)" />
          <BoStat value={Math.round(totOcc / totSeats * 100) + '%'} label="Okupansi Ruang" accent="var(--green)" />
          <BoStat value={B.MAINTENANCE.filter((m: any) => m.status === 'Terlambat').length} label="Pemeliharaan Terlambat" accent="var(--red)" />
        </div>

        <BoTabPanel tabs={tabs} tab={tab} setTab={setTab}>
          {tab === 'register' && (
            <table className="dtbl">
              <thead><tr><th>ID</th><th>Aset</th><th>Kategori</th><th className="num">Qty</th><th className="num">Perolehan</th><th className="num">NBV</th><th>Lokasi</th><th>Status</th></tr></thead>
              <tbody>
                {assetRows.map((a: any) => (
                  <tr key={a.id}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{a.id}</td>
                    <td><div style={{ fontWeight: 600, fontSize: 12 }}>{a.name}</div><div className="tiny muted mono">akuisisi {a.acq} · umur {a.life} thn</div></td>
                    <td className="tiny">{a.cat}</td>
                    <td className="num">{a.qty}</td>
                    <td className="num">{boJt(a.cost)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{a.nbv === 0 ? '—' : boJt(a.nbv)}</td>
                    <td className="tiny muted">{a.loc}</td>
                    <td><BoBadge s={a.status} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={4}>Total</td><td className="num">{boM(totCost, 1)}</td><td className="num">{boM(totNbv, 1)}</td><td colSpan={2}></td></tr></tfoot>
            </table>
          )}

          {tab === 'maint' && (
            <table className="dtbl">
              <thead><tr><th>ID</th><th>Aset</th><th>Jenis</th><th>Vendor</th><th>Jatuh Tempo</th><th className="num">Biaya</th><th>Status</th></tr></thead>
              <tbody>
                {B.MAINTENANCE.map((m: any) => {
                  const d = B.daysTo(m.due);
                  return (
                    <tr key={m.id}>
                      <td className="mono tiny" style={{ fontWeight: 700 }}>{m.id}</td>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>{m.asset}</td>
                      <td className="tiny">{m.type}</td>
                      <td className="tiny muted">{m.vendor}</td>
                      <td className="tiny mono" style={{ color: d < 0 ? 'var(--red)' : 'var(--ink-2)' }}>{m.due}<span className="muted"> · {d < 0 ? Math.abs(d) + 'h lalu' : d + 'h'}</span></td>
                      <td className="num">{boJt(m.cost)}</td>
                      <td><BoBadge s={m.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'license' && (
            <table className="dtbl">
              <thead><tr><th>Software</th><th>Vendor</th><th className="num">Seat</th><th>Utilisasi</th><th>Berakhir</th><th className="num">Biaya/thn</th><th>Status</th></tr></thead>
              <tbody>
                {B.SOFTWARE_LICENSES.map((l: any) => {
                  const u = Math.round(l.used / l.seats * 100);
                  return (
                    <tr key={l.name}>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>{l.name}</td>
                      <td className="tiny muted">{l.vendor}</td>
                      <td className="num mono">{l.used}/{l.seats}</td>
                      <td style={{ width: 130 }}><div className="row ac gap6"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: u + '%', height: '100%', borderRadius: 3, background: u > 90 ? 'var(--amber)' : 'var(--blue)' }} /></div><span className="tiny mono">{u}%</span></div></td>
                      <td className="tiny mono">{l.exp}</td>
                      <td className="num">{boJt(l.cost)}</td>
                      <td><BoBadge s={l.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'space' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <SectionTitle right={<span className="mono tiny muted">{totOcc}/{totSeats} kursi terisi</span>}>Okupansi per Lantai</SectionTitle>
              <div style={{ display: 'grid', gap: 12 }}>
                {B.SPACE.map((f: any) => {
                  const u = Math.round(f.occ / f.seats * 100);
                  return (
                    <div key={f.floor} className="panel" style={{ padding: '11px 13px' }}>
                      <div className="row jb ac" style={{ marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{f.floor}</span>
                        <span className="tiny muted mono">{f.area} m² · {f.occ}/{f.seats} kursi</span>
                      </div>
                      <div style={{ height: 10, borderRadius: 5, background: 'var(--surface-3)' }}><div style={{ width: u + '%', height: '100%', borderRadius: 5, background: u > 85 ? 'var(--amber)' : 'var(--blue)' }} /></div>
                      <div className="tiny muted" style={{ marginTop: 4 }}>Utilisasi {u}% — {f.seats - f.occ} kursi tersedia</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </BoTabPanel>
      </div></div>
    </>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { BoBadge, BoStat, BoTabPanel, boJt, boM };
