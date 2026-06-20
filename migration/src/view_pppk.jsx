/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Avatar, Badge, Btn, Panel, Progress, Stat, Tabs } from './ui.jsx';
import { OKv } from './view_onboarding.jsx';

/* ============================================================
   NeoSuite AMS — Pelaporan PPPK (P2PK Kemenkeu)
   Laporan Tahunan KAP: kelengkapan · register klien & jasa ·
   rekap opini · realisasi PPL · rotasi AP emiten · riwayat & inspeksi.
   Dasar: PMK 154/PMK.01/2017 jo. PMK 186/PMK.01/2021 · UU 5/2011.
   ============================================================ */
const { useState: usePPPK } = React;

const PPPK_SEC_STAT = { 'Lengkap': 'green', 'Perlu Perhatian': 'amber', 'Belum': 'red' };
const ROT_STAT = { 'Wajib Rotasi': 'red', 'Tahun Terakhir': 'amber', 'Tahun ke-6': 'amber', 'Dalam Batas': 'green' };
const opColor = (t) => /WTM|Tanpa Modif/.test(t) ? 'var(--green)' : /WDP|Pengecualian/.test(t) ? 'var(--amber)' : /Tidak/.test(t) ? 'var(--red)' : /Proses/.test(t) ? 'var(--ink-4)' : 'var(--blue)';

function PPPKReport() {
  const A = AMS, fmt = A.fmt;
  const nav = useNav();
  const R = A.PPPK_REPORT;
  const clients = A.PPPK_CLIENTS, ppl = A.PPPK_PPL, rotation = A.PPPK_ROTATION, history = A.PPPK_HISTORY;
  const [tab, setTab] = usePPPK('ringkasan');

  const totalOpinions = R.opinions.reduce((s, o) => s + o.n, 0);
  const ready = R.sections.filter(s => s.status === 'Lengkap').length;
  const daysLeft = Math.round((new Date(R.dueDate) - new Date('2026-03-09')) / 864e5);
  const rotationDue = rotation.filter(r => r.status === 'Wajib Rotasi').length;
  const pplOk = ppl.filter(p => p.total >= p.req && p.structured >= p.reqStr).length;
  const totalFee = clients.reduce((s, c) => s + c.fee, 0);

  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan & Kelengkapan', count: ready + '/' + R.sections.length },
    { id: 'clients', label: 'Register Klien & Jasa', count: clients.length },
    { id: 'ppl', label: 'Realisasi PPL', count: pplOk + '/' + ppl.length },
    { id: 'rotation', label: 'Rotasi AP Emiten', count: rotationDue || null },
    { id: 'history', label: 'Riwayat & Inspeksi' },
  ];

  return (
    <>
      <SubBar moduleId="pppk" right={<div className="row gap8 ac"><Badge kind="blue">P2PK · PMK 154/2017 jo. 186/2021</Badge><Btn sm variant="primary"><I.upload size={13} /> Ajukan Laporan Tahunan</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={R.totalClients} label="Total Klien FY2025" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={R.pie} label="Klien Emiten / PIE" accent="var(--red)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={totalOpinions} label="Opini Diterbitkan" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={daysLeft + ' hari'} label="Menuju Tenggat (30 Apr)" accent={daysLeft < 30 ? 'var(--red)' : 'var(--amber)'} /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'ringkasan' && (
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1.1fr 1fr', gap: 14, alignItems: 'start' }}>
                <div>
                  <div className="row jb ac" style={{ marginBottom: 8 }}><div className="tiny muted upper">Komponen Laporan Tahunan KAP {R.year}</div><span className="mono tiny" style={{ fontWeight: 700 }}>{ready}/{R.sections.length}</span></div>
                  <div className="panel" style={{ padding: 4, boxShadow: 'none' }}>
                    {R.sections.map((s, i) => (
                      <div key={i} className="row ac jb" style={{ padding: '10px 12px', borderBottom: i < R.sections.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <span className="row ac gap10"><span style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', background: s.status === 'Lengkap' ? 'var(--green)' : s.status === 'Belum' ? 'var(--red)' : 'var(--amber)', color: '#fff' }}>{s.status === 'Lengkap' ? <I.check size={12} /> : i + 1}</span><span style={{ fontSize: 12.5, fontWeight: 500 }}>{s.t}</span></span>
                        <Badge kind={PPPK_SEC_STAT[s.status]}>{s.status}</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="panel" style={{ marginTop: 10, padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                    <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span><span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>Realisasi PPL belum 100% — <span onClick={() => setTab('ppl')} style={{ color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}>tinjau tab Realisasi PPL</span>. Laporan keuangan KAP menunggu finalisasi.</span></div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div className="tiny muted upper" style={{ marginBottom: 8 }}>Rekapitulasi Opini Diterbitkan</div>
                    <div className="panel" style={{ padding: '12px 14px', boxShadow: 'none', display: 'grid', gap: 9 }}>
                      {R.opinions.map(o => (
                        <div key={o.type}>
                          <div className="row jb tiny" style={{ marginBottom: 3 }}><span>{o.type}</span><span className="mono" style={{ fontWeight: 700 }}>{o.n}</span></div>
                          <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (o.n / totalOpinions * 100) + '%', height: '100%', borderRadius: 3, background: opColor(o.type) }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="tiny muted upper" style={{ marginBottom: 8 }}>Kesiapan Inspeksi P2PK</div>
                    <div className="panel" style={{ padding: 12, boxShadow: 'none' }}>
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <OKv label="Inspeksi Terakhir" v={R.inspection.lastP2PK} />
                        <OKv label="Hasil" v={R.inspection.result} accent="var(--green)" />
                        <OKv label="Inspeksi Berikutnya" v={R.inspection.nextDue} accent="var(--amber)" />
                        <OKv label="Temuan Terbuka" v={R.inspection.openFindings} accent={R.inspection.openFindings ? 'var(--red)' : 'var(--green)'} />
                      </div>
                      <div className="panel" style={{ padding: '10px 12px', background: 'var(--green-bg)', borderColor: 'transparent' }}><div className="row ac gap8"><span style={{ color: 'var(--green)' }}><I.shield size={15} /></span><span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>Kertas kerja terpelihara & dapat diakses; paket inspeksi dapat dibangkitkan dari <span onClick={() => nav('dms')} style={{ color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}>DMS</span>.</span></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'clients' && (
            <>
              <div className="row jb ac" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-soft)' }}>
                <span className="tiny muted">Lampiran — daftar klien & jenis jasa yang dilaporkan ke P2PK</span>
                <span className="tiny muted">Total imbalan: <b className="mono" style={{ color: 'var(--ink)' }}>Rp {fmt(totalFee)} jt</b></span>
              </div>
              <table className="dtbl">
                <thead><tr><th>Klien</th><th>Jenis Jasa</th><th>Standar</th><th>AP Penanggung Jawab</th><th>Emiten</th><th>Opini</th><th className="num">Imbalan</th><th>Tgl Laporan</th></tr></thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, fontSize: 12.5 }}>{c.client.replace('PT ', '')}</td>
                      <td className="tiny">{c.service}</td>
                      <td><span className="badge b-gray tiny mono">{c.std}</span></td>
                      <td className="tiny">{c.ap}</td>
                      <td>{c.emiten ? <Badge kind="red">Emiten</Badge> : <span className="tiny muted">—</span>}</td>
                      <td className="tiny" style={{ fontWeight: 600, color: opColor(c.opinion) }}>{c.opinion}</td>
                      <td className="num mono tiny">Rp {fmt(c.fee)} jt</td>
                      <td className="mono tiny muted">{c.reportDate === '—' ? <span style={{ color: 'var(--amber)' }}>proses</span> : new Date(c.reportDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {tab === 'ppl' && (
            <div style={{ padding: 14 }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 720 }}>Kewajiban PPL berkelanjutan: <b>40 SKP/tahun</b> dengan minimal <b>20 SKP terstruktur</b> (PMK 154/2017 jo. PMK 186/2021 & ketentuan IAPI). Realisasi seluruh AP & staf kunci dilaporkan dalam Laporan Tahunan KAP.</p>
              <div style={{ display: 'grid', gap: 8 }}>
                {ppl.map((p, i) => {
                  const okTotal = p.total >= p.req, okStr = p.structured >= p.reqStr;
                  const ok = okTotal && okStr;
                  return (
                    <div key={i} className="panel" style={{ padding: '12px 14px', boxShadow: 'none', borderLeft: '3px solid ' + (ok ? 'var(--green)' : 'var(--amber)') }}>
                      <div className="row jb ac" style={{ marginBottom: 8 }}>
                        <div className="row ac gap8"><Avatar name={p.ap} size={26} /><div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.ap}</div><div className="tiny muted">{p.grade}</div></div></div>
                        <Badge kind={ok ? 'green' : 'amber'}>{ok ? 'Terpenuhi' : 'Belum Terpenuhi'}</Badge>
                      </div>
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                          <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="muted">Total SKP</span><span className="mono" style={{ fontWeight: 700, color: okTotal ? 'var(--green)' : 'var(--amber)' }}>{p.total} / {p.req}</span></div>
                          <Progress value={p.total / p.req * 100} color={okTotal ? 'var(--green)' : 'var(--amber)'} />
                        </div>
                        <div>
                          <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="muted">SKP Terstruktur</span><span className="mono" style={{ fontWeight: 700, color: okStr ? 'var(--green)' : 'var(--amber)' }}>{p.structured} / {p.reqStr}</span></div>
                          <Progress value={p.structured / p.reqStr * 100} color={okStr ? 'var(--green)' : 'var(--amber)'} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="tiny muted" style={{ marginTop: 10 }}>Sumber data terhubung ke <span onClick={() => nav('cpe')} style={{ color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}>CPE / PPL Tracker</span> di modul People & Compliance.</div>
            </div>
          )}

          {tab === 'rotation' && (
            <div style={{ padding: 14 }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 760 }}>Pembatasan masa pemberian jasa audit AP terdiferensiasi per rezim: <b>5 tahun buku</b> berturut-turut untuk entitas <b>kepentingan publik (PIE) umum</b> (PP 20/2015 Ps. 11), dan <b>3 tahun buku</b> untuk entitas <b>sektor jasa keuangan</b> — bank, asuransi, pembiayaan (POJK 13/POJK.03/2017); <i>cooling-off</i> 2 tahun. Register ini dilampirkan pada Laporan Tahunan KAP.</p>
              <table className="dtbl">
                <thead><tr><th>Akuntan Publik</th><th>Klien Emiten</th><th>Sektor / Rezim</th><th className="num">Masa Jabatan</th><th className="num">Batas</th><th>Status</th><th>Rencana Tindak Lanjut</th></tr></thead>
                <tbody>
                  {rotation.map((r, i) => (
                    <tr key={i}>
                      <td className="tiny" style={{ fontWeight: 600 }}>{r.ap}</td>
                      <td className="tiny">{r.client.replace('PT ', '')}</td>
                      <td className="tiny"><span className="row ac gap4">{r.sektorJK ? <span className="badge b-teal" style={{ fontSize: 8.5, padding: '1px 5px' }}>Jasa Keuangan</span> : <span className="badge b-gray" style={{ fontSize: 8.5, padding: '1px 5px' }}>PIE umum</span>}</span><div className="tiny muted mono" style={{ marginTop: 2 }}>{r.basis}</div></td>
                      <td className="num"><span className="mono" style={{ fontWeight: 700, color: r.tenure >= r.limit ? 'var(--red)' : r.tenure >= r.limit - 1 ? 'var(--amber)' : 'var(--ink)' }}>{r.tenure} thn</span></td>
                      <td className="num mono tiny muted">{r.limit} thn</td>
                      <td><Badge kind={ROT_STAT[r.status]}>{r.status}</Badge></td>
                      <td className="tiny muted">{r.next}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rotationDue > 0 && (
                <div className="panel" style={{ marginTop: 12, padding: '11px 13px', background: 'var(--red-bg)', borderColor: 'transparent' }}>
                  <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={16} /></span><span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>{rotationDue} penugasan mencapai batas masa jabatan — wajib rotasi AP untuk tahun buku berikutnya. Koordinasikan dengan <span onClick={() => nav('independence')} style={{ color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}>Independence & Rotasi</span>.</span></div>
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div style={{ padding: 14 }}>
              <div className="tiny muted upper" style={{ marginBottom: 10 }}>Riwayat Penyampaian Laporan Tahunan KAP</div>
              <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                {history.map((h, i) => (
                  <div key={i} className="panel" style={{ padding: '12px 14px', boxShadow: 'none' }}>
                    <div className="row jb ac">
                      <div className="row ac gap10">
                        <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--blue-050)', color: 'var(--blue)', display: 'grid', placeItems: 'center', flex: '0 0 36px' }}><I.report size={18} /></span>
                        <div><div style={{ fontSize: 13, fontWeight: 700 }}>Laporan Tahunan FY{h.year}</div><div className="tiny muted">{h.note}</div>{h.receipt && <div className="row ac gap6" style={{ marginTop: 4 }}><span className="badge b-green" style={{ fontSize: 8.5, padding: '1px 6px' }}><I.checkCircle size={9} /> Tanda terima elektronik</span><span className="mono tiny muted">{h.receipt} · {h.channel}</span></div>}</div>
                      </div>
                      <div className="row ac gap10"><div className="tiny muted mono">Disampaikan {h.submitted}</div><Badge kind="green"><I.checkCircle size={12} /> {h.status}</Badge></div>
                    </div>
                  </div>
                ))}
                <div className="panel" style={{ padding: '12px 14px', boxShadow: 'none', borderLeft: '3px solid var(--amber)' }}>
                  <div className="row jb ac">
                    <div className="row ac gap10">
                      <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--amber-bg)', color: 'var(--amber)', display: 'grid', placeItems: 'center', flex: '0 0 36px' }}><I.hourglass size={18} /></span>
                      <div><div style={{ fontSize: 13, fontWeight: 700 }}>Laporan Tahunan FY{R.year}</div><div className="tiny muted">Dalam penyusunan — tenggat {new Date(R.dueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}.</div></div>
                    </div>
                    <Badge kind="amber">{R.status} · {ready}/{R.sections.length}</Badge>
                  </div>
                </div>
              </div>
              <div className="panel" style={{ padding: '12px 14px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
                <div className="row ac gap8" style={{ marginBottom: 5 }}><span style={{ color: 'var(--blue)' }}><I.book size={15} /></span><span style={{ fontSize: 12.5, fontWeight: 700 }}>Dasar Kewajiban Pelaporan</span></div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--ink-2)' }}>KAP wajib menyampaikan Laporan Tahunan kepada Pusat Pembinaan Profesi Keuangan (P2PK/PPPK) Kementerian Keuangan paling lambat <b>30 April</b> setiap tahun, memuat identitas & susunan AP, daftar klien dan jasa, jumlah & jenis opini, realisasi PPL, serta gambaran Sistem Pengelolaan Mutu (SPM) — sesuai PMK 154/PMK.01/2017 sebagaimana diubah dengan <b>PMK 186/PMK.01/2021</b> dan UU 5/2011 tentang Akuntan Publik. Penyampaian dilakukan secara <b>elektronik (e-reporting PPPK)</b> dengan tanda terima elektronik sebagai bukti.</p>
              </div>
            </div>
          )}
        </Panel>
      </div></div>
    </>
  );
}

Object.assign(window, { PPPKReport });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PPPKReport };
