/* [codemod] ESM imports */
import React from 'react';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel } from './ui.jsx';
import { KvBox } from './view_analytical.jsx';
import { RowKv } from './view_calc.jsx';

/* ============================================================
   NeoSuite AMS — Pelindungan Data Pribadi (UU 27/2022 · PDP)
   ------------------------------------------------------------
   Operasionalisasi UU PDP di luar retensi (Evaluasi Kepatuhan G19):
     · RoPA — registri aktivitas pemrosesan + dasar pemrosesan/persetujuan
     · Hak Subjek Data (DSR) — akses, perbaikan, penghapusan, dll.
     · Notifikasi insiden kebocoran ≤ 3×24 jam (Ps. 46)
   Semua data ditarik dari satu sumber AMS_CANON.pdp(); retensi data
   pribadi tetap mengacu kelas 'pmpj' di modul Retensi & Arsip.
   ============================================================ */
const { useState: useStatePDP, useMemo: useMemoPDP } = React;

const PDP_BASIS_KIND = { persetujuan: 'purple', kontrak: 'blue', hukum: 'navy', vital: 'red', publik: 'teal', sah: 'amber' };
const PDP_RISK_KIND = { 'Tinggi': 'red', 'Sedang': 'amber', 'Rendah': 'green' };
const PDP_DSR_KIND = { 'Baru': 'blue', 'Diproses': 'amber', 'Selesai': 'green' };

function PdpCard({ value, label, sub, accent }) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function PDPView() {
  const nav = (typeof useNav === 'function') ? useNav() : (() => {});
  const loader = window.loadLS || ((k, d) => d);
  const P = useMemoPDP(() => window.AMS_CANON.pdp(), []);
  const [tab, setTab] = useStatePDP(() => loader('ams.pdp.tab', 'ropa'));
  const [selRopa, setSelRopa] = useStatePDP(null);
  React.useEffect(() => { try { localStorage.setItem('ams.pdp.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);

  const s = P.summary;
  const TABS = [
    { id: 'ropa', label: 'RoPA & Dasar Pemrosesan', count: P.ropa.length },
    { id: 'dsr', label: 'Hak Subjek Data', count: s.dsrOpen || null },
    { id: 'insiden', label: 'Notifikasi Insiden', count: P.incidents.length },
    { id: 'postur', label: 'Postur & Dasar Hukum' },
  ];

  return (
    <>
      <SubBar moduleId="pdp" right={
        <div className="row gap8 ac">
          <Badge kind="navy">UU 27/2022 · PDP</Badge>
          <Btn sm onClick={() => nav('records', { from: 'pdp' })}><I.archive size={13} /> Retensi Data</Btn>
          <Btn sm onClick={() => nav('crypto', { from: 'pdp' })}><I.lock size={13} /> Keamanan</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <PdpCard value={s.ropaCount} label="Aktivitas Pemrosesan (RoPA)" sub={s.basisCount + ' dasar pemrosesan dipetakan'} accent="var(--navy)" />
            <PdpCard value={s.dsrOpen + '/' + s.dsrTotal} label="Permintaan Hak Subjek Data" sub={s.dsrOverdue ? s.dsrOverdue + ' lewat SLA' : 'dalam SLA ' + s.respSla + ' hari'} accent={s.dsrOverdue ? 'var(--red)' : 'var(--amber)'} />
            <PdpCard value={s.breachOnTime + '/' + s.incidentsBreach} label="Notifikasi Kebocoran Tepat Waktu" sub={'ambang ' + s.notifHrs + ' jam (3×24)'} accent={s.breachOnTime === s.incidentsBreach ? 'var(--green)' : 'var(--red)'} />
            <PdpCard value="DPO" label="Pejabat Pelindungan Data" sub={P.dpo.name.split(',')[0]} accent="var(--teal)" />
          </div>

          <div className="row ac jb" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="seg" style={{ width: 'fit-content', flexWrap: 'wrap' }}>
              {TABS.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}{t.count ? ' · ' + t.count : ''}</button>)}
            </div>
            <span className="tiny muted">Satu sumber: <span className="mono">AMS_CANON.pdp()</span></span>
          </div>

          {/* ===== TAB · RoPA ===== */}
          {tab === 'ropa' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Registri Aktivitas Pemrosesan Data Pribadi</h3><span className="sub mono">Ps. 31 — RoPA</span></div>
                <table className="dtbl">
                  <thead><tr><th>Aktivitas</th><th>Subjek Data</th><th>Dasar Pemrosesan</th><th>Retensi</th><th style={{ width: 70 }}>Risiko</th></tr></thead>
                  <tbody>
                    {P.ropa.map(r => (
                      <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelRopa(r)}>
                        <td><div className="row ac gap6"><span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r.id}</span><span style={{ fontWeight: 600, fontSize: 12.5 }}>{r.activity}</span>{r.special && <span className="chip tiny" style={{ height: 16, color: 'var(--red)', borderColor: 'var(--red)' }}>spesifik</span>}</div><div className="tiny muted">{r.purpose}</div></td>
                        <td className="tiny" style={{ color: 'var(--ink-2)' }}>{r.subject}</td>
                        <td><Badge kind={PDP_BASIS_KIND[r.basis] || 'gray'}>{r.basis}</Badge></td>
                        <td className="tiny muted">{r.crossBorder ? 'Lintas-negara' : 'Domestik'}</td>
                        <td><Badge kind={PDP_RISK_KIND[r.risk]}>{r.risk}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>Klik baris untuk rincian jenis data, penerima &amp; dasar pemrosesan. Data pribadi yang bersifat <b>spesifik</b> (mis. data kesehatan/keuangan) menuntut pengamanan & dasar pemrosesan yang lebih ketat (Ps. 4).</div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Sebaran Dasar Pemrosesan</h3><span className="sub mono">Ps. 20</span></div>
                  <div style={{ padding: '12px 14px', display: 'grid', gap: 9 }}>
                    {P.basisDist.map(b => (
                      <div key={b.key}>
                        <div className="row jb ac" style={{ marginBottom: 4 }}>
                          <span className="row ac gap6"><Badge kind={PDP_BASIS_KIND[b.key] || 'gray'}>{b.key}</Badge></span>
                          <span className="mono tiny" style={{ fontWeight: 700 }}>{b.n}</span>
                        </div>
                        <div className="tiny muted" style={{ lineHeight: 1.4 }}>{b.label}</div>
                      </div>
                    ))}
                    <div className="panel" style={{ padding: '9px 11px', boxShadow: 'none', background: 'var(--blue-050)', borderColor: 'var(--blue-100)', marginTop: 2 }}>
                      <div className="tiny" style={{ lineHeight: 1.5 }}><I.shield size={11} /> Setiap aktivitas wajib bertumpu pada salah satu dasar pemrosesan yang sah. <b>{P.summary.consentN}</b> aktivitas berbasis <b>persetujuan</b> eksplisit — sisanya kontrak/kewajiban hukum/kepentingan sah.</div>
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ===== TAB · DSR ===== */}
          {tab === 'dsr' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Permintaan Hak Subjek Data</h3><span className="sub mono">SLA penyelesaian {P.summary.respSla} hari · konfirmasi 3×24 jam</span></div>
                <table className="dtbl">
                  <thead><tr><th>Subjek</th><th>Jenis Permintaan</th><th>Diterima</th><th>Tenggat</th><th>Status</th></tr></thead>
                  <tbody>
                    {P.dsr.map(d => (
                      <tr key={d.id}>
                        <td><div style={{ fontWeight: 600, fontSize: 12.5 }}>{d.subject}</div><div className="tiny muted">{d.id} · {d.handler}</div></td>
                        <td className="tiny" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{d.type}</td>
                        <td className="tiny mono muted">{d.received}</td>
                        <td className="tiny mono" style={{ color: d.overdue ? 'var(--red)' : 'var(--ink-3)', fontWeight: d.overdue ? 700 : 400 }}>{d.open ? (d.dueDays >= 0 ? d.dueDays + 'h lagi' : 'lewat') : '✓'}</td>
                        <td><Badge kind={PDP_DSR_KIND[d.status]}>{d.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>Pengendali wajib mengonfirmasi penerimaan permintaan dalam <b>3×24 jam</b> dan menindaklanjuti dalam tenggat wajar. Penghapusan dapat ditahan sebagian bila terdapat kewajiban hukum penyimpanan (mis. UU KUP 10 thn) — terdokumentasi sebagai pembatasan sah.</div>
              </Panel>

              <Panel noBody>
                <div className="panel-h"><h3>Katalog Hak Subjek Data</h3><span className="sub mono">Ps. 5–13</span></div>
                <div>
                  {P.rights.map((r, i) => (
                    <div key={r.ref} className="row ac gap9" style={{ padding: '8px 14px', borderBottom: i < P.rights.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                      <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><I.checkCircle size={15} /></span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.35 }}>{r.t}</span>
                      <span className="mono tiny muted" style={{ flex: '0 0 auto' }}>{r.ref}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* ===== TAB · INSIDEN ===== */}
          {tab === 'insiden' && (
            <div className="grid" style={{ gap: 12 }}>
              <div className="panel" style={{ padding: '12px 15px', background: P.summary.breachOnTime === P.summary.incidentsBreach ? 'var(--green-bg)' : 'var(--red-bg)', borderColor: 'transparent' }}>
                <div className="row ac gap10">
                  <span style={{ color: P.summary.breachOnTime === P.summary.incidentsBreach ? 'var(--green)' : 'var(--red)' }}><I.shield size={20} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Kewajiban notifikasi kebocoran — UU PDP Ps. 46</div>
                    <div className="tiny" style={{ color: 'var(--ink-2)', marginTop: 2, lineHeight: 1.5 }}>Pemberitahuan tertulis wajib disampaikan paling lambat <b>3×24 jam</b> kepada <b>subjek data</b> dan <b>Lembaga PDP</b>, memuat: data yang terungkap, kapan & bagaimana, serta upaya penanganan. {P.summary.breachOnTime}/{P.summary.incidentsBreach} insiden kebocoran ter-notifikasi dalam ambang waktu.</div>
                  </div>
                </div>
              </div>

              {P.incidents.map(i => (
                <Panel key={i.id} noBody>
                  <div className="panel-h">
                    <span className="row ac gap8"><span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{i.id}</span><h3 style={{ margin: 0 }}>{i.title}</h3></span>
                    <div style={{ flex: 1 }} />
                    <Badge kind={i.severity === 'Sedang' ? 'amber' : i.severity === 'Tinggi' ? 'red' : 'gray'}>{i.severity}</Badge>
                    <Badge kind={i.breach ? (i.withinDeadline ? 'green' : 'red') : 'gray'}>{i.breach ? (i.withinDeadline ? 'Notifikasi tepat waktu' : 'Terlambat') : 'Tanpa kebocoran'}</Badge>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
                      <KvBox label="Terdeteksi" v={i.detected} />
                      <KvBox label="Subjek terdampak" v={String(i.affected)} />
                      <KvBox label="Batas notifikasi (3×24 jam)" v={i.deadline} />
                      <KvBox label="Notifikasi Lembaga PDP" v={i.notifAuthorityAt || '—'} />
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="panel" style={{ padding: '10px 12px', boxShadow: 'none', background: 'var(--surface-2)', borderColor: 'transparent' }}>
                        <div className="tiny muted upper" style={{ marginBottom: 4 }}>Data terdampak</div>
                        <div className="tiny" style={{ lineHeight: 1.5 }}>{i.dataset}</div>
                      </div>
                      <div className="panel" style={{ padding: '10px 12px', boxShadow: 'none', background: 'var(--surface-2)', borderColor: 'transparent' }}>
                        <div className="tiny muted upper" style={{ marginBottom: 4 }}>Penanganan & akar masalah</div>
                        <div className="tiny" style={{ lineHeight: 1.5 }}>{i.containment} <span className="muted">({i.rootCause})</span></div>
                      </div>
                    </div>
                    {i.breach && (
                      <div className="row ac gap10" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                        <span className="chip tiny"><I.mail size={11} /> Subjek data: {i.notifSubjectAt || '—'}</span>
                        <span className="chip tiny"><I.building size={11} /> Lembaga PDP: {i.notifAuthorityAt || '—'}</span>
                        {i.notifAuthHrs != null && <span className="chip tiny" style={{ color: i.withinDeadline ? 'var(--green)' : 'var(--red)' }}>{i.notifAuthHrs} jam sejak deteksi</span>}
                      </div>
                    )}
                  </div>
                </Panel>
              ))}
            </div>
          )}

          {/* ===== TAB · POSTUR ===== */}
          {tab === 'postur' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Postur Kepatuhan — Prinsip Pelindungan (Ps. 16)</h3></div>
                <div>
                  {P.principles.map((p, i) => {
                    const SK = { 'Aktif': 'green', 'Parsial': 'amber', 'Gagal': 'red' };
                    return (
                      <div key={i} className="row ac gap10" style={{ padding: '11px 14px', borderBottom: i < P.principles.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <span style={{ color: p.status === 'Aktif' ? 'var(--green)' : p.status === 'Parsial' ? 'var(--amber)' : 'var(--red)', flex: '0 0 auto' }}>{p.status === 'Aktif' ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.k}</div>
                          <div className="tiny muted">{p.ev}{p.to && <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => nav(p.to, { from: 'pdp' })}> · buka modul ↗</span>}</div>
                        </div>
                        <Badge kind={SK[p.status] || 'gray'}>{p.status}</Badge>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div style={{ background: 'linear-gradient(120deg,#013a52,#024661)', color: '#fff', padding: '14px 16px' }}>
                    <div className="tiny upper" style={{ color: '#bcd6e4', letterSpacing: '.05em', marginBottom: 8 }}>Pejabat Pelindungan Data</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{P.dpo.name}</div>
                    <div className="tiny" style={{ color: '#bcd6e4', marginTop: 2, lineHeight: 1.45 }}>{P.dpo.role}</div>
                    <div className="mono tiny" style={{ color: '#9fc1d4', marginTop: 8 }}>{P.dpo.contact}</div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="tiny muted" style={{ lineHeight: 1.55 }}>DPO mengoordinasikan kepatuhan PDP: penilaian dampak, pemenuhan hak subjek data, dan notifikasi insiden ke Lembaga PDP — sebagai titik kontak independen.</div>
                  </div>
                </Panel>
                <Panel title="Dasar Hukum" sub="kerangka regulasi">
                  <div style={{ display: 'grid', gap: 7 }}>
                    {P.legal.map((r, i) => (
                      <div key={i} style={{ paddingBottom: 7, borderBottom: i < P.legal.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{r.k}</div>
                        <div className="tiny muted" style={{ lineHeight: 1.4 }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Modul mengoperasionalkan UU 27/2022 (PDP) di sisi data klien & firma — di luar retensi yang sudah ada: registri aktivitas pemrosesan (RoPA) berikut dasar pemrosesan/persetujuan, pemenuhan hak subjek data, dan alur notifikasi kebocoran ≤ 3×24 jam ke subjek & Lembaga PDP. Masa simpan tetap merujuk kelas retensi <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => nav('records', { from: 'pdp' })}>Retensi &amp; Arsip</span>; keamanan teknis di <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => nav('crypto', { from: 'pdp' })}>Compliance &amp; Kriptografi</span>. Angka ditarik dari satu sumber <span className="mono">AMS_CANON.pdp()</span>.
          </div>
        </div>
      </div>

      {selRopa && <PDPRopaDrawer r={selRopa} onClose={() => setSelRopa(null)} P={P} nav={nav} />}
    </>
  );
}

/* ---------------- RoPA detail drawer ---------------- */
function PDPRopaDrawer({ r, onClose, P, nav }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="panel" style={{ width: 460, maxWidth: '94vw', height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '15px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <I.shield size={20} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono tiny" style={{ color: '#bcd6e4' }}>{r.id}</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{r.activity}</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>RoPA · Ps. 31 UU PDP</div>
          </div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 18, overflowY: 'auto', flex: 1, display: 'grid', gap: 14, alignContent: 'start' }}>
          <div className="panel" style={{ padding: 13, background: 'var(--surface-2)', borderColor: 'transparent' }}>
            <div className="row jb ac"><span className="tiny muted upper">Dasar Pemrosesan</span><Badge kind={PDP_BASIS_KIND[r.basis] || 'gray'}>{r.basis}</Badge></div>
            <div className="tiny" style={{ marginTop: 6, lineHeight: 1.5 }}>{P.BASIS[r.basis]}</div>
          </div>
          <div style={{ display: 'grid', gap: 7 }}>
            <RowKv label="Subjek data" v={r.subject} strong />
            <RowKv label="Tujuan pemrosesan" v={r.purpose} />
            <RowKv label="Penerima data" v={r.recipients} />
            <RowKv label="Transfer lintas-negara" v={r.crossBorder ? 'Ya' : 'Tidak'} />
            <RowKv label="Tingkat risiko" v={r.risk} />
            <RowKv label="Data spesifik" v={r.special ? 'Ya — pengamanan ketat' : 'Tidak'} />
          </div>
          <div>
            <div className="tiny muted upper" style={{ marginBottom: 7 }}>Jenis data pribadi diproses</div>
            <div className="row gap6 wrap">{r.data.map((d, i) => <span key={i} className="chip tiny">{d}</span>)}</div>
          </div>
          <div className="panel" style={{ padding: '11px 13px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
            <div className="tiny" style={{ lineHeight: 1.55 }}><I.archive size={11} /> Masa simpan mengikuti kelas retensi <b>{r.retClass}</b> di modul <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => { nav('records', { from: 'pdp' }); onClose(); }}>Retensi &amp; Arsip ↗</span>. Setelah retensi berakhir, data dimusnahkan (UU PDP Ps. 8 / Ps. 43).</div>
          </div>
        </div>
        <div style={{ padding: '13px 18px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn onClick={onClose}>Tutup</Btn>
          <Btn variant="primary"><I.download size={13} /> Unduh Catatan RoPA</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PDPView });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PDPView };
