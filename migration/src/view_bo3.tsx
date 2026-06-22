/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Btn, Donut } from './ui';
import { BoBadge, BoStat, BoTabPanel, boJt } from './view_bo1';
import { HBars, KV, LineChart, SectionTitle } from './view_fpm_parts';
import { BO } from './data_backoffice';

/* ============================================================
   Asseris — Backoffice & Firm Mgmt (3/3)
   Perjalanan Dinas & Reimbursement · Lisensi & Perizinan
   Reuses: boJt, boM, BoBadge, BoTabPanel, BoStat (view_bo1)
   ============================================================ */
const { useState: useStateBO3 } = React;

/* money helpers (travel) */
const trJt = (v: any, d = 1) => 'Rp ' + AMS.fmt(v / 1e6, d) + ' jt';
const trRb = (v: any) => 'Rp ' + AMS.fmt(v / 1e3, 0) + ' rb';

/* navigable SSOT chip → loncat ke modul pemilik data */
function TrSrc({ module, children, title }: any) {
  const nav = useNav();
  return (
    <button type="button" className="chip tiny" title={title || ('Buka ' + module)}
      onClick={() => nav(module, { from: 'travel' })}
      style={{ cursor: 'pointer', border: '1px solid var(--line-strong)', background: 'var(--surface-2)', gap: 4 }}>
      {children} <I.arrowRight size={9} style={{ opacity: .6 }} />
    </button>
  );
}

/* ============================================================
   Perjalanan Dinas & Reimbursement — modul mendalam.
   Seluruh angka DITURUNKAN window.TRAVEL dari sumber kanonik:
   HCM (pegawai), Engagement/CRM (klien), Kebijakan (plafon), GL (kontrol).
   ============================================================ */
function FirmTravel() {
  const T = window.TRAVEL;
  const B = BO;
  const { fmt } = AMS;
  const [tab, setTab] = useStateBO3('ringkasan');
  const [openTrip, setOpenTrip] = useStateBO3(null);
  const [calc, setCalc] = useStateBO3({ grade: 'Senior', route: 'SUB', nights: 2, days: 3 });

  const sum = T.summary();
  const trips = sum.trips;
  const reimb = sum.reimbursements;
  const alloc = T.byEngagement();
  const recon = T.glReconciliation();

  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan' },
    { id: 'trips', label: 'Pengajuan Perjalanan', count: trips.length },
    { id: 'reimburse', label: 'Reimbursement', count: reimb.length },
    { id: 'policy', label: 'Kebijakan & Plafon' },
    { id: 'analytics', label: 'Analitik & GL' },
  ];

  const claimTot = reimb.reduce((s: any, r: any) => s + r.klaim, 0);
  const plafonTot = reimb.reduce((s: any, r: any) => s + r.plafon, 0);

  return (
    <>
      <SubBar moduleId="travel" right={<div className="row gap8 ac"><span className="chip tiny"><I.users size={11} /> {sum.pending.length} pengajuan menunggu</span><Btn sm variant="primary"><I.plus size={13} /> Ajukan Perjalanan</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">

        {/* provenance banner — satu sumber kebenaran */}
        <div className="panel" style={{ padding: '10px 13px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'transparent' }}>
          <div className="row ac jb" style={{ marginBottom: 7 }}>
            <span className="tiny" style={{ fontWeight: 700, letterSpacing: '.02em' }}><I.link2 size={12} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Tarikan data — satu sumber kebenaran</span>
            <span className="tiny muted">tidak ada angka lepas · semua diturunkan</span>
          </div>
          <div className="row gap6 ac" style={{ flexWrap: 'wrap' }}>
            {T.PROVENANCE.map((p: any) => (
              <TrSrc key={p.field} module={p.module} title={p.field + ' ← ' + p.source}>
                <span style={{ fontWeight: 600 }}>{p.field}</span>
                <span className="muted" style={{ marginLeft: 3 }}>← {p.label}</span>
              </TrSrc>
            ))}
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <BoStat value={'Rp ' + fmt(sum.ytdJt, 0) + ' jt'} label="Biaya Perjalanan YTD" />
          <BoStat value={sum.pending.length} label="Menunggu Approval" accent="var(--amber)" />
          <BoStat value={sum.inProcess.length} label="Reimbursement Diproses" accent="var(--blue)" />
          <BoStat value={sum.overCap.length} label="Klaim Lewat Plafon" accent={sum.overCap.length ? 'var(--red)' : 'var(--green)'} />
        </div>

        <BoTabPanel tabs={tabs} tab={tab} setTab={setTab}>

          {/* ---------------- RINGKASAN ---------------- */}
          {tab === 'ringkasan' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 16, alignItems: 'start' }}>
                <div>
                  <SectionTitle right={<span className="mono tiny muted">{alloc.length} perikatan</span>}>Alokasi Biaya Perjalanan per Perikatan</SectionTitle>
                  <HBars rows={alloc.map((a: any) => ({
                    label: a.client.replace(/^PT /, ''),
                    value: a.est,
                    color: a.partner && a.partner.includes('Hartono') ? 'var(--blue)' : a.partner && a.partner.includes('Rudi') ? 'var(--purple)' : 'var(--teal)',
                    sub: a.eng + ' · ' + a.city.split(',')[0] + ' · ' + a.trips + ' trip',
                    right: trJt(a.est),
                  }))} />
                  <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
                    Estimasi perjalanan dialokasikan ke perikatannya sebagai <b>beban langsung</b> — mengalir ke <TrSrc module="time" title="Time & Budget">Time &amp; Budget</TrSrc> &amp; <TrSrc module="profitability" title="Profitability">Profitability</TrSrc> per perikatan.
                  </div>
                </div>
                <div>
                  <SectionTitle>Rekonsiliasi ke Buku Besar</SectionTitle>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {recon.rows.map((r: any, i: any) => (
                      <div key={i} className="panel" style={{ padding: '9px 11px', boxShadow: 'none' }}>
                        <div className="row jb ac">
                          <span className="tiny" style={{ fontWeight: 600, maxWidth: 210, lineHeight: 1.3 }}>{r.label}</span>
                          <span className="mono tiny" style={{ fontWeight: 700 }}>{trJt(r.value, 0)}</span>
                        </div>
                        <div className="row ac gap6" style={{ marginTop: 5 }}>
                          <TrSrc module={r.owner} title={'Sumber: ' + r.src}><span className="mono" style={{ fontSize: 9.5 }}>{r.src}</span></TrSrc>
                          {i < recon.rows.length - 1 && <I.chevron size={11} style={{ color: 'var(--ink-3)' }} />}
                        </div>
                      </div>
                    ))}
                    {recon.coa && (
                      <div className="panel" style={{ padding: '9px 11px', background: recon.tied ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
                        <div className="row jb ac">
                          <span className="tiny" style={{ fontWeight: 700 }}><I.ledger size={12} style={{ verticalAlign: -2 }} /> Akun kontrol {recon.coa.code}</span>
                          <span className="badge b-green">{recon.tied ? 'Menutup' : 'Periksa'}</span>
                        </div>
                        <div className="tiny muted" style={{ marginTop: 3 }}>{recon.coa.name} — sub-ledger perjalanan terserap di P&amp;L firma (FIRM_COA).</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 16 }}>
                <KV label="Total Klaim vs Plafon" v={trJt(claimTot) + ' / ' + trJt(plafonTot)} accent={claimTot <= plafonTot ? 'var(--green)' : 'var(--red)'} sub={Math.round(claimTot / plafonTot * 100) + '% penyerapan plafon'} />
                <KV label="Perjalanan Internasional" v={sum.intl.length + ' (Singapura)'} accent="var(--purple)" sub="group audit komponen — SA 600" />
                <KV label="Objek PPh 21 (kelebihan)" v={trJt(sum.pphTot, 2)} accent="var(--amber)" sub="atas klaim di atas plafon → Payroll" />
              </div>
            </div>
          )}

          {/* ---------------- TRIPS ---------------- */}
          {tab === 'trips' && (
            <table className="dtbl">
              <thead><tr><th></th><th>ID</th><th>Pegawai</th><th>Perikatan / Klien</th><th>Lokasi</th><th>Tanggal</th><th className="num">Hari</th><th className="num">Plafon</th><th className="num">Estimasi</th><th>Status</th></tr></thead>
              <tbody>
                {trips.map((t: any) => {
                  const open = openTrip === t.id;
                  const e = t.entitlement;
                  return (
                    <React.Fragment key={t.id}>
                      <tr style={{ cursor: 'pointer', background: open ? 'var(--blue-050)' : undefined }} onClick={() => setOpenTrip(open ? null : t.id)}>
                        <td style={{ textAlign: 'center', color: 'var(--ink-3)' }}><I.chevDown size={12} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: '.12s' }} /></td>
                        <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{t.id}</td>
                        <td><div className="row ac gap6"><Avatar name={t.staff} size={22} /><div><div style={{ fontWeight: 600, fontSize: 11.5 }}>{t.staff}</div><div className="tiny muted">{t.grade}</div></div></div></td>
                        <td className="tiny"><div style={{ fontWeight: 600 }}>{t.client.replace(/^PT /, '')}</div><div className="tiny muted mono">{t.eng}</div></td>
                        <td className="tiny">{t.city.split(',')[0]}{e.intl && <span className="badge b-purple" style={{ marginLeft: 4 }}>Int'l</span>}</td>
                        <td className="tiny mono">{t.tgl}</td>
                        <td className="num mono">{t.durasi}<span className="muted tiny"> ({t.nights}m)</span></td>
                        <td className="num mono tiny muted">{trJt(t.plafon)}</td>
                        <td className="num" style={{ color: t.withinPolicy ? 'var(--ink)' : 'var(--amber)', fontWeight: t.withinPolicy ? 400 : 700 }}>{trJt(t.est)}</td>
                        <td><BoBadge s={t.status} /></td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={10} style={{ padding: 0, background: 'var(--surface-2)' }}>
                            <div style={{ padding: '13px 16px' }}>
                              <div className="grid" style={{ gridTemplateColumns: '1.1fr 1fr', gap: 16, alignItems: 'start' }}>
                                <div>
                                  <div className="tiny upper muted" style={{ fontWeight: 700, letterSpacing: '.05em', marginBottom: 7 }}>Perhitungan plafon (entitlement) dari kebijakan</div>
                                  <table className="dtbl" style={{ border: '1px solid var(--line)', borderRadius: 7, overflow: 'hidden' }}>
                                    <tbody>
                                      <tr><td className="tiny">Transport <span className="muted">— {e.routeLabel} × kelas {t.grade}</span></td><td className="num mono tiny">{trRb(e.transport)}</td></tr>
                                      <tr><td className="tiny">Akomodasi <span className="muted">— hotel {t.grade} × {t.nights} malam</span></td><td className="num mono tiny">{trRb(e.lodging)}</td></tr>
                                      <tr><td className="tiny">Per diem <span className="muted">— {t.grade} × {t.durasi} hari</span></td><td className="num mono tiny">{trRb(e.perdiem)}</td></tr>
                                      <tr style={{ fontWeight: 700, background: 'var(--surface-3)' }}><td className="tiny">Plafon kebijakan</td><td className="num mono">{trJt(e.total)}</td></tr>
                                      <tr><td className="tiny">Estimasi diajukan</td><td className="num mono tiny" style={{ color: t.withinPolicy ? 'var(--green)' : 'var(--amber)' }}>{trJt(t.est)} {t.withinPolicy ? '✓ dalam plafon' : '· ' + trRb(Math.abs(t.overEst)) + ' di atas plafon'}</td></tr>
                                    </tbody>
                                  </table>
                                </div>
                                <div>
                                  <div className="tiny upper muted" style={{ fontWeight: 700, letterSpacing: '.05em', marginBottom: 7 }}>Keterkaitan & otorisasi</div>
                                  <div style={{ display: 'grid', gap: 7 }}>
                                    <div className="row ac gap6"><span className="tiny muted" style={{ width: 78 }}>Pegawai</span><TrSrc module="hcm" title={'Master HCM: ' + t.empId}>{t.staff} · {t.role}</TrSrc></div>
                                    <div className="row ac gap6"><span className="tiny muted" style={{ width: 78 }}>Perikatan</span><TrSrc module="cockpit" title={'Engagement ' + t.eng}>{t.eng} · {t.client.replace(/^PT /, '')}</TrSrc></div>
                                    <div className="row ac gap6"><span className="tiny muted" style={{ width: 78 }}>Penyetuju</span><span className="tiny" style={{ fontWeight: 600 }}>{t.appr}</span></div>
                                    <div className="row ac gap6"><span className="tiny muted" style={{ width: 78 }}>Tujuan</span><span className="tiny">{t.purpose}</span></div>
                                  </div>
                                  <div className="panel" style={{ padding: '8px 10px', marginTop: 9, background: 'var(--surface)', boxShadow: 'none' }}>
                                    <div className="tiny muted" style={{ lineHeight: 1.5 }}>Plafon dihitung ulang otomatis dari <b>{t.grade}</b> (HCM) × rute <b>{e.routeLabel}</b> (kebijakan). Mengubah grade atau kebijakan akan memperbarui angka ini di seluruh modul.</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ---------------- REIMBURSEMENT ---------------- */}
          {tab === 'reimburse' && (
            <>
              <table className="dtbl">
                <thead><tr><th>ID</th><th>Pegawai</th><th>Trip / Klien</th><th>Rincian</th><th className="num">Klaim</th><th className="num">Plafon</th><th className="num">PPh 21</th><th>Status</th></tr></thead>
                <tbody>
                  {reimb.map((r: any) => (
                    <tr key={r.id}>
                      <td className="mono tiny" style={{ fontWeight: 700 }}>{r.id}</td>
                      <td><div style={{ fontWeight: 600, fontSize: 11.5 }}>{r.staff}</div><div className="tiny muted">{r.grade}</div></td>
                      <td className="tiny">{r.trip !== '—' ? <><span className="mono">{r.trip}</span><div className="tiny muted">{(r.client || '').replace(/^PT /, '')}</div></> : <span className="muted">tanpa trip</span>}</td>
                      <td className="tiny" style={{ maxWidth: 190, whiteSpace: 'normal', lineHeight: 1.3 }}>{r.kategori}</td>
                      <td className="num" style={{ color: r.over ? 'var(--red)' : 'var(--ink)', fontWeight: r.over ? 700 : 400 }}>{trJt(r.klaim)}</td>
                      <td className="num tiny muted">{trJt(r.plafon)}</td>
                      <td className="num tiny" style={{ color: r.pph21 ? 'var(--amber)' : 'var(--ink-3)' }}>{r.pph21 ? trRb(r.pph21) : '—'}</td>
                      <td><BoBadge s={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={4}>Total</td><td className="num">{trJt(claimTot)}</td><td className="num">{trJt(plafonTot)}</td><td className="num">{trRb(reimb.reduce((s: any, r: any) => s + r.pph21, 0))}</td><td></td></tr></tfoot>
              </table>
              {sum.overCap.length > 0 && (
                <div className="view-pad" style={{ paddingTop: 0 }}>
                  <div className="panel" style={{ padding: '11px 13px', background: 'var(--red-bg, var(--amber-bg))', borderColor: 'transparent' }}>
                    <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.6 }}><I.alert size={13} style={{ verticalAlign: -2, color: 'var(--red)' }} /> {sum.overCap.length} klaim melebihi plafon — wajib persetujuan <b>Partner</b> &amp; Berita Acara. Kelebihan menjadi objek <b>PPh 21</b> yang dipotong via <TrSrc module="payroll" title="Payroll & PPh 21">Payroll</TrSrc>.</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---------------- KEBIJAKAN & PLAFON ---------------- */}
          {tab === 'policy' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                <div>
                  <SectionTitle>Plafon Per Diem & Akomodasi per Grade</SectionTitle>
                  <table className="dtbl" style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                    <thead><tr><th>Grade</th><th className="num">Hotel/malam</th><th className="num">Per Diem/hari</th><th>Transport</th></tr></thead>
                    <tbody>
                      {B.PER_DIEM.map((p: any) => (
                        <tr key={p.grade}>
                          <td style={{ fontWeight: 600 }}>{p.grade}</td>
                          <td className="num">{trRb(p.hotel)}</td>
                          <td className="num">{trRb(p.diem)}</td>
                          <td className="tiny">{p.transport} <span className="muted mono">×{p.classMult}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <SectionTitle right={<span className="mono tiny muted">PP kelas ekonomi</span>}>Tarif Rute (dasar transport)</SectionTitle>
                  <table className="dtbl" style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                    <thead><tr><th>Rute</th><th className="num">Tarif dasar</th><th></th></tr></thead>
                    <tbody>
                      {B.ROUTES.map((r: any) => (
                        <tr key={r.code}>
                          <td className="tiny" style={{ fontWeight: 600 }}>{r.label}</td>
                          <td className="num mono tiny">{trRb(r.fare)}</td>
                          <td>{r.intl && <span className="badge b-purple">Int'l</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <SectionTitle>Kalkulator Plafon (entitlement)</SectionTitle>
                  <div className="panel" style={{ padding: '13px 14px' }}>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 11 }}>
                      <label className="tiny" style={{ display: 'grid', gap: 3 }}><span className="muted" style={{ fontWeight: 600 }}>Grade</span>
                        <select className="select" value={calc.grade} onChange={(e: any) => setCalc({ ...calc, grade: e.target.value })}>{B.PER_DIEM.map((p: any) => <option key={p.key}>{p.key}</option>)}</select></label>
                      <label className="tiny" style={{ display: 'grid', gap: 3 }}><span className="muted" style={{ fontWeight: 600 }}>Rute</span>
                        <select className="select" value={calc.route} onChange={(e: any) => setCalc({ ...calc, route: e.target.value })}>{B.ROUTES.map((r: any) => <option key={r.code} value={r.code}>{r.label}</option>)}</select></label>
                      <label className="tiny" style={{ display: 'grid', gap: 3 }}><span className="muted" style={{ fontWeight: 600 }}>Hari</span>
                        <input className="input" type="number" min={1} value={calc.days} onChange={(e: any) => setCalc({ ...calc, days: Math.max(1, +e.target.value || 1) })} /></label>
                      <label className="tiny" style={{ display: 'grid', gap: 3 }}><span className="muted" style={{ fontWeight: 600 }}>Malam</span>
                        <input className="input" type="number" min={0} value={calc.nights} onChange={(e: any) => setCalc({ ...calc, nights: Math.max(0, +e.target.value || 0) })} /></label>
                    </div>
                    {(() => {
                      const e = T.entitlement(calc.grade, calc.route, calc.nights, calc.days);
                      return (
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div className="row jb tiny"><span>Transport <span className="muted">({e.routeLabel} × {e.pol.classMult})</span></span><span className="mono">{trRb(e.transport)}</span></div>
                          <div className="row jb tiny"><span>Akomodasi <span className="muted">({calc.nights} mlm)</span></span><span className="mono">{trRb(e.lodging)}</span></div>
                          <div className="row jb tiny"><span>Per diem <span className="muted">({calc.days} hr)</span></span><span className="mono">{trRb(e.perdiem)}</span></div>
                          <div className="row jb ac" style={{ borderTop: '1px solid var(--line)', paddingTop: 7, marginTop: 2 }}><span style={{ fontWeight: 700 }}>Plafon total</span><span className="mono" style={{ fontWeight: 800, fontSize: 15, color: 'var(--blue)' }}>{trJt(e.total)}</span></div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="panel" style={{ padding: '11px 13px', background: 'var(--blue-050)', borderColor: 'transparent', marginTop: 12 }}>
                    <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.6 }}><I.book size={13} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Plafon dihitung sama persis untuk setiap perjalanan — grade ditarik dari <TrSrc module="hcm">HCM</TrSrc>, kebijakan dipelihara di <TrSrc module="governance">Governance (SOQM)</TrSrc>. Klaim melebihi plafon butuh persetujuan Partner; selisih per diem di atas tarif fiskal menjadi objek PPh 21.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- ANALITIK & GL ---------------- */}
          {tab === 'analytics' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' }}>
                <div>
                  <SectionTitle right={<span className="mono tiny muted">Rp jt / bulan</span>}>Tren Biaya Perjalanan</SectionTitle>
                  <LineChart labels={B.TRAVEL_TREND.map((t: any) => t.m)} series={[{ name: 'Biaya', color: 'var(--blue)', data: B.TRAVEL_TREND.map((t: any) => t.v), fill: true }]} height={170} />
                  <SectionTitle>Rekonsiliasi Sub-ledger → Buku Besar</SectionTitle>
                  <table className="dtbl" style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                    <thead><tr><th>Lapisan</th><th>Sumber</th><th className="num">Nilai</th></tr></thead>
                    <tbody>
                      {recon.rows.map((r: any, i: any) => (
                        <tr key={i}>
                          <td className="tiny" style={{ fontWeight: 600, maxWidth: 240, whiteSpace: 'normal', lineHeight: 1.3 }}>{r.label}</td>
                          <td><TrSrc module={r.owner}><span className="mono" style={{ fontSize: 9.5 }}>{r.src}</span></TrSrc></td>
                          <td className="num mono tiny">{trJt(r.value, 0)}</td>
                        </tr>
                      ))}
                      {recon.coa && <tr style={{ fontWeight: 700, background: 'var(--green-bg)' }}><td className="tiny">Akun kontrol {recon.coa.code} · {recon.coa.name}</td><td><span className="badge b-green">Menutup</span></td><td className="num mono tiny">—</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div>
                  <SectionTitle>Sorotan</SectionTitle>
                  <KV label="Bulan Tertinggi" v="Feb · Rp 184 jt" sub="puncak fieldwork tutup buku" />
                  <div style={{ height: 8 }} />
                  <KV label="Rata-rata / Perjalanan" v={trJt(trips.reduce((s: any, t: any) => s + t.est, 0) / trips.length)} sub={trips.length + ' perjalanan tercatat'} />
                  <div style={{ height: 8 }} />
                  <KV label="Perjalanan Internasional" v={sum.intl.length + ' (Singapura)'} accent="var(--purple)" sub="group audit komponen — SA 600" />
                  <div style={{ height: 8 }} />
                  <KV label="Penyerapan Plafon" v={Math.round(claimTot / plafonTot * 100) + '%'} accent={claimTot <= plafonTot ? 'var(--green)' : 'var(--red)'} sub={trJt(claimTot) + ' dari ' + trJt(plafonTot)} />
                  <div className="panel" style={{ padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'transparent', marginTop: 12 }}>
                    <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.55 }}><I.alert size={13} style={{ verticalAlign: -2, color: 'var(--amber)' }} /> Biaya perjalanan = beban <b>langsung</b> perikatan. Diserap di P&amp;L firma lewat <TrSrc module="firmfinance">Firm Finance</TrSrc> &amp; dialokasikan per perikatan di <TrSrc module="time">Time &amp; Budget</TrSrc>.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </BoTabPanel>
      </div></div>
    </>
  );
}

/* ============================================================
   Lisensi & Perizinan — modul mendalam.
   Identitas AP, PPL/SKP & rotasi DITURUNKAN window.LICENSING dari
   sumber kanonik: HCM (pegawai), CPE/PPL (SKP), Independence (rotasi),
   CRM/Engagement (cakupan emiten). Satu sumber, satu lineage.
   ============================================================ */
function FirmLicensing() {
  const L = window.LICENSING;
  const B = BO;
  const { fmt } = AMS;
  const [tab, setTab] = useStateBO3('ringkasan');
  const [openAp, setOpenAp] = useStateBO3(null);
  const [openFirm, setOpenFirm] = useStateBO3(null);

  const sum = L.summary();
  const fl = sum.firmLicenses, ap = sum.ap, mb = sum.memberships;
  const cal120 = sum.expSoon;
  const rotFlag = sum.rotDue.length + sum.rotWarn.length;

  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan' },
    { id: 'firm', label: 'Izin Firma', count: fl.length },
    { id: 'ap', label: 'Izin Akuntan Publik', count: ap.length },
    { id: 'member', label: 'Keanggotaan Profesi', count: mb.length },
    { id: 'calendar', label: 'Kalender Perpanjangan', count: cal120.length },
  ];

  const sevCol = (d: any) => d < 30 ? 'var(--red)' : d < 120 ? 'var(--amber)' : 'var(--ink-2)';
  const kindCol = { 'Izin Firma': 'var(--blue)', 'Izin AP': 'var(--purple)', 'Keanggotaan': 'var(--teal)' };

  return (
    <>
      <SubBar moduleId="licensing" right={<div className="row gap8 ac"><span className="chip tiny"><I.shield size={11} /> Izin KAP 1142/KM.1/2019</span><Btn sm><I.download size={13} /> Unduh Bukti</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">

        {/* provenance banner */}
        <div className="panel" style={{ padding: '10px 13px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'transparent' }}>
          <div className="row ac jb" style={{ marginBottom: 7 }}>
            <span className="tiny" style={{ fontWeight: 700, letterSpacing: '.02em' }}><I.link2 size={12} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Tarikan data — satu sumber kebenaran</span>
            <span className="tiny muted">PPL, rotasi & identitas AP diturunkan</span>
          </div>
          <div className="row gap6 ac" style={{ flexWrap: 'wrap' }}>
            {L.PROVENANCE.map((p: any) => (
              <TrSrc key={p.field} module={p.module} title={p.field + ' ← ' + p.source}>
                <span style={{ fontWeight: 600 }}>{p.field}</span>
                <span className="muted" style={{ marginLeft: 3 }}>← {p.label}</span>
              </TrSrc>
            ))}
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <BoStat value={fl.length} label="Izin Firma" />
          <BoStat value={ap.length} label="Akuntan Publik (AP)" accent="var(--blue)" />
          <BoStat value={cal120.length} label="Perpanjangan ≤120 hari" accent="var(--amber)" />
          <BoStat value={rotFlag} label="Rotasi AP — wajib/peringatan" accent={sum.rotDue.length ? 'var(--red)' : rotFlag ? 'var(--amber)' : 'var(--green)'} />
        </div>

        <BoTabPanel tabs={tabs} tab={tab} setTab={setTab}>

          {/* ---------------- RINGKASAN ---------------- */}
          {tab === 'ringkasan' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                <div>
                  <SectionTitle right={<span className="mono tiny muted">{sum.emiten.length} perikatan emiten</span>}>Cakupan Registrasi OJK (STTD Emiten)</SectionTitle>
                  <div className="tiny muted" style={{ marginBottom: 8, lineHeight: 1.5 }}>Registrasi OJK firma wajib untuk audit entitas tercatat. Daftar berikut ditarik dari <TrSrc module="cockpit">Engagement</TrSrc> — perikatan untuk klien <b>listed</b> (CRM).</div>
                  <div style={{ display: 'grid', gap: 7 }}>
                    {sum.emiten.map((e: any) => (
                      <div key={e.id} className="panel" style={{ padding: '9px 11px', boxShadow: 'none' }}>
                        <div className="row jb ac">
                          <span className="tiny" style={{ fontWeight: 600 }}>{e.client.replace(/^PT /, '')}</span>
                          <span className="mono tiny muted">{e.id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <SectionTitle>Perpanjangan Terdekat</SectionTitle>
                  <div style={{ display: 'grid', gap: 7 }}>
                    {cal120.slice(0, 5).map((x: any, i: any) => (
                      <div key={i} className="panel" style={{ padding: '9px 11px', boxShadow: 'none' }}>
                        <div className="row jb ac" style={{ marginBottom: 5 }}>
                          <span className="row ac gap6"><span className="badge" style={{ background: 'transparent', color: (kindCol as any)[x.kind], border: '1px solid currentColor', fontSize: 9.5 }}>{x.kind}</span><span className="tiny" style={{ fontWeight: 600, maxWidth: 150, lineHeight: 1.25 }}>{x.label}</span></span>
                          <span className="mono tiny" style={{ fontWeight: 700, color: sevCol(x.days) }}>{x.days}h</span>
                        </div>
                        <div className="row jb tiny muted"><span className="mono">{x.exp}</span><span>{x.otoritas}</span></div>
                      </div>
                    ))}
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                    <KV label="Iuran Keanggotaan / thn" v={boJt(sum.totalDues)} sub="→ biaya operasi firma" accent="var(--teal)" />
                    <KV label="Status PPL AP" v={sum.pplRisk.length ? sum.pplRisk.length + ' di bawah laju' : 'Semua sesuai laju'} accent={sum.pplRisk.length ? 'var(--amber)' : 'var(--green)'} sub="YTD vs target tahunan" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- IZIN FIRMA ---------------- */}
          {tab === 'firm' && (
            <table className="dtbl">
              <thead><tr><th></th><th>ID</th><th>Izin / Registrasi</th><th>Nomor</th><th>Otoritas</th><th>Terbit</th><th>Berakhir</th><th>Status</th></tr></thead>
              <tbody>
                {fl.map((l: any) => {
                  const hasDetail = l.coverage || l.linkMember;
                  const open = openFirm === l.id;
                  return (
                    <React.Fragment key={l.id}>
                      <tr style={{ cursor: hasDetail ? 'pointer' : 'default', background: open ? 'var(--blue-050)' : undefined }} onClick={() => hasDetail && setOpenFirm(open ? null : l.id)}>
                        <td style={{ textAlign: 'center', color: 'var(--ink-3)' }}>{hasDetail ? <I.chevDown size={12} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: '.12s' }} /> : null}</td>
                        <td className="mono tiny" style={{ fontWeight: 700 }}>{l.id}</td>
                        <td><div style={{ fontWeight: 600, fontSize: 11.5 }}>{l.nama}</div>{l.note && <div className="tiny muted" style={{ maxWidth: 260, whiteSpace: 'normal', lineHeight: 1.3 }}>{l.note}</div>}</td>
                        <td className="tiny mono">{l.no}</td>
                        <td className="tiny">{l.otoritas}</td>
                        <td className="tiny mono muted">{l.terbit}</td>
                        <td className="tiny mono" style={{ color: l.days != null ? sevCol(l.days) : 'var(--ink-2)' }}>{l.exp || 'Tanpa batas'}{l.days != null ? <span className="muted"> · {l.days}h</span> : null}</td>
                        <td><BoBadge s={l.status} /></td>
                      </tr>
                      {open && hasDetail && (
                        <tr><td colSpan={8} style={{ padding: 0, background: 'var(--surface-2)' }}>
                          <div style={{ padding: '12px 16px' }}>
                            {l.coverage && (
                              <>
                                <div className="tiny upper muted" style={{ fontWeight: 700, letterSpacing: '.05em', marginBottom: 7 }}>Ketergantungan — {l.coverage.label}</div>
                                <div className="row gap6 ac" style={{ flexWrap: 'wrap', marginBottom: l.linkMember ? 12 : 0 }}>
                                  {l.coverage.items.map((e: any) => (
                                    <TrSrc key={e.id} module="cockpit" title={'Buka ' + e.id}><span style={{ fontWeight: 600 }}>{e.client.replace(/^PT /, '')}</span><span className="muted mono" style={{ marginLeft: 4 }}>{e.id}</span></TrSrc>
                                  ))}
                                </div>
                              </>
                            )}
                            {l.linkMember && (
                              <div className="panel" style={{ padding: '9px 11px', background: 'var(--surface)', boxShadow: 'none' }}>
                                <div className="tiny" style={{ lineHeight: 1.5 }}><I.link2 size={12} style={{ verticalAlign: -2, color: 'var(--teal)' }} /> Terkait keanggotaan <b>{l.linkMember.nama}</b> — iuran {boJt(l.linkMember.iuran)}/thn, berakhir {l.linkMember.exp}. <TrSrc module="firmfinance" title="Biaya keanggotaan → P&L firma">biaya → Firm Finance</TrSrc></div>
                              </div>
                            )}
                          </div>
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ---------------- IZIN AKUNTAN PUBLIK ---------------- */}
          {tab === 'ap' && (
            <table className="dtbl">
              <thead><tr><th></th><th>Akuntan Publik</th><th>No. Izin</th><th>Berakhir</th><th className="num">PPL (SKP)</th><th>Status PPL</th><th>Rotasi</th><th>Status</th></tr></thead>
              <tbody>
                {ap.map((a: any) => {
                  const open = openAp === a.izin;
                  const pplPct = Math.min(100, Math.round(a.ppl / a.pplReq * 100));
                  const rotCol = a.rotState === 'due' ? 'var(--red)' : a.rotState === 'warn' ? 'var(--amber)' : 'var(--green)';
                  const dExp = B.daysTo(a.exp);
                  return (
                    <React.Fragment key={a.izin}>
                      <tr style={{ cursor: 'pointer', background: open ? 'var(--blue-050)' : undefined }} onClick={() => setOpenAp(open ? null : a.izin)}>
                        <td style={{ textAlign: 'center', color: 'var(--ink-3)' }}><I.chevDown size={12} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: '.12s' }} /></td>
                        <td><div className="row ac gap6"><Avatar name={a.name} size={22} /><div><div style={{ fontWeight: 600, fontSize: 11.5 }}>{a.ap}</div><div className="tiny muted">{a.role}{a.emiten && <span className="badge b-purple" style={{ marginLeft: 4 }}>Emiten</span>}</div></div></div></td>
                        <td className="tiny mono">{a.izin}<div className="tiny muted">{a.reg}</div></td>
                        <td className="tiny mono" style={{ color: sevCol(dExp) }}>{a.exp}<div className="tiny muted">{dExp}h</div></td>
                        <td className="num"><div className="row ac gap6" style={{ justifyContent: 'flex-end' }}><span className="mono tiny" style={{ fontWeight: 700, color: a.onPace ? 'var(--green)' : 'var(--amber)' }}>{a.ppl}/{a.pplReq}</span><div style={{ width: 46, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: pplPct + '%', height: '100%', borderRadius: 3, background: a.onPace ? 'var(--green)' : 'var(--amber)' }} /></div></div></td>
                        <td>{a.onPace && a.structOk ? <span className="badge b-green">Sesuai laju</span> : <span className="badge b-amber">Di bawah laju</span>}</td>
                        <td className="tiny"><span className="mono" style={{ fontWeight: 700, color: rotCol }}>{a.tenure}/{a.rotationLimit}th</span></td>
                        <td><BoBadge s={a.status} /></td>
                      </tr>
                      {open && (
                        <tr><td colSpan={8} style={{ padding: 0, background: 'var(--surface-2)' }}>
                          <div style={{ padding: '13px 16px' }}>
                            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                              <div>
                                <div className="tiny upper muted" style={{ fontWeight: 700, letterSpacing: '.05em', marginBottom: 7 }}>PPL / SKP {(AMS as any).CPE_REQ.year} <TrSrc module="cpe" title="Buka CPE/PPL Tracker">← CPE Tracker</TrSrc></div>
                                <div className="row gap12 ac" style={{ marginBottom: 9 }}>
                                  <Donut size={84} thickness={12} segments={[{ value: a.pplStructured, color: '#005085' }, { value: Math.max(0, a.ppl - a.pplStructured), color: '#0a6b73' }, { value: Math.max(0, a.pplReq - a.ppl), color: 'var(--surface-3)' }]} center={<><div className="mono" style={{ fontSize: 15, fontWeight: 800 }}>{a.ppl}</div><div className="tiny muted">SKP</div></>} />
                                  <div style={{ flex: 1, display: 'grid', gap: 5 }}>
                                    <div className="row jb tiny"><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: 2, background: '#005085' }} />Terstruktur</span><b className="mono">{a.pplStructured}/{a.pplStructReq}</b></div>
                                    <div className="row jb tiny"><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: 2, background: '#0a6b73' }} />Total</span><b className="mono">{a.ppl}/{a.pplReq}</b></div>
                                    <div className="row jb tiny"><span className="muted">Target laju YTD</span><b className="mono" style={{ color: a.onPace ? 'var(--green)' : 'var(--amber)' }}>{a.expectedYtd} SKP</b></div>
                                  </div>
                                </div>
                                <div style={{ display: 'grid', gap: 0 }}>
                                  {a.recs.slice(0, 4).map((r: any, i: any) => (
                                    <div key={i} className="row ac jb" style={{ padding: '5px 0', borderBottom: i < Math.min(4, a.recs.length) - 1 ? '1px solid var(--line-soft)' : 0 }}>
                                      <span className="tiny truncate" style={{ maxWidth: 200 }}>{r.t}</span><span className="mono tiny" style={{ fontWeight: 700 }}>{r.skp} SKP</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="tiny upper muted" style={{ fontWeight: 700, letterSpacing: '.05em', marginBottom: 7 }}>Rotasi & Independensi <TrSrc module="independence" title="Buka Independence & Rotasi">← Independence</TrSrc></div>
                                <div style={{ display: 'grid', gap: 7 }}>
                                  <div className="row ac gap6"><span className="tiny muted" style={{ width: 96 }}>Klien rotasi</span><span className="tiny" style={{ fontWeight: 600 }}>{a.rotationClient}</span></div>
                                  <div>
                                    <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="muted">Masa penugasan</span><span className="mono" style={{ fontWeight: 700, color: rotCol }}>{a.tenure} / {a.rotationLimit} tahun</span></div>
                                    <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, a.tenure / a.rotationLimit * 100) + '%', height: '100%', borderRadius: 4, background: rotCol }} /></div>
                                  </div>
                                  <div className="row ac gap6"><span className="tiny muted" style={{ width: 96 }}>Deklarasi</span>{a.declared ? <span className="badge b-green">Terdeklarasi</span> : <span className="badge b-red">Belum</span>}{a.conflicts > 0 && <span className="badge b-amber">{a.conflicts} konflik</span>}</div>
                                  <div className="row ac gap6"><span className="tiny muted" style={{ width: 96 }}>Izin AP</span><span className="tiny mono">{a.izin} · {a.reg}</span></div>
                                </div>
                                {a.rotState === 'due' && <div className="panel" style={{ padding: '8px 10px', marginTop: 9, background: 'var(--red-bg)', borderColor: 'transparent' }}><div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}><I.alert size={12} style={{ verticalAlign: -2, color: 'var(--red)' }} /> Mencapai batas rotasi {a.rotationLimit} tahun — wajib rotasi partner penanggung jawab (UU 5/2011 · PMK). Dikelola di <TrSrc module="independence">Independence</TrSrc>.</div></div>}
                              </div>
                            </div>
                          </div>
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ---------------- KEANGGOTAAN ---------------- */}
          {tab === 'member' && (
            <>
              <table className="dtbl">
                <thead><tr><th>Keanggotaan / Afiliasi</th><th>Tipe</th><th className="num">Iuran/thn</th><th>Berakhir</th><th>Status</th></tr></thead>
                <tbody>
                  {mb.map((m: any, i: any) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, fontSize: 11.5 }}>{m.nama}</td>
                      <td className="tiny">{m.tipe}</td>
                      <td className="num">{boJt(m.iuran)}</td>
                      <td className="tiny mono" style={{ color: m.days != null ? sevCol(m.days) : 'var(--ink-2)' }}>{m.exp}{m.days != null ? <span className="muted"> · {m.days}h</span> : null}</td>
                      <td><BoBadge s={m.status} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={2}>Total iuran tahunan</td><td className="num">{boJt(sum.totalDues)}</td><td colSpan={2}></td></tr></tfoot>
              </table>
              <div className="view-pad" style={{ paddingTop: 0 }}>
                <div className="panel" style={{ padding: '11px 13px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
                  <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.6 }}><I.book size={13} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Iuran keanggotaan ({boJt(sum.totalDues)}/thn) masuk komposisi biaya operasi sebagai overhead — terserap di P&amp;L lewat <TrSrc module="firmfinance">Firm Finance</TrSrc> &amp; <TrSrc module="firmops">Cockpit Operasi</TrSrc>. Keanggotaan IAPI juga menjadi prasyarat <b>Izin Firma</b> (LIC-IAPI).</div>
                </div>
              </div>
            </>
          )}

          {/* ---------------- KALENDER PERPANJANGAN ---------------- */}
          {tab === 'calendar' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <SectionTitle right={<span className="mono tiny muted">{cal120.length} item ≤120 hari · terpadu</span>}>Jatuh Tempo Perpanjangan (Izin Firma · AP · Keanggotaan)</SectionTitle>
              <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Satu kalender menarik tenggat dari semua sub-registri — konsisten dengan kalender kewajiban terpadu di <TrSrc module="firmops">Cockpit Operasi Firma</TrSrc>.</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {cal120.map((x: any, i: any) => {
                  const pct = Math.max(4, Math.min(100, 100 - (x.days / 120 * 100)));
                  const col = x.days < 30 ? 'var(--red)' : 'var(--amber)';
                  return (
                    <div key={i} className="panel" style={{ padding: '11px 13px' }}>
                      <div className="row jb ac" style={{ marginBottom: 6 }}>
                        <span className="row ac gap8"><span className="badge" style={{ background: 'transparent', color: (kindCol as any)[x.kind], border: '1px solid currentColor', fontSize: 9.5 }}>{x.kind}</span><span style={{ fontWeight: 600, fontSize: 12.5 }}>{x.label}</span></span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: col }}>{x.days} hari lagi</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: pct + '%', height: '100%', borderRadius: 4, background: col }} /></div>
                      <div className="row jb tiny muted" style={{ marginTop: 4 }}><span>Berakhir {x.exp} · {x.ref}</span><span>{x.otoritas}{x.amount ? ' · ' + boJt(x.amount) : ''}</span></div>
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

Object.assign(window, { FirmTravel, FirmLicensing });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FirmLicensing, FirmTravel };
