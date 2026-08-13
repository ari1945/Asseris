/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Donut, Panel, Spark, Stat, Tabs } from './ui';
import { OKv } from './view_onboarding';

/* ============================================================
   Asseris — Governance (SMM / SMM 1)
   Tata kelola mutu firma: 8 komponen SMM · akuntabilitas peran ·
   sumber daya & penyedia · budaya mutu · simpulan evaluasi tahunan.
   ============================================================ */
const { useState: useGov } = React;

const GOV_STAT = { 'Efektif': 'green', 'Perlu Perhatian': 'amber', 'Defisiensi': 'red' };
const PRV_STAT = { 'Memadai': 'green', 'Pemantauan': 'amber', 'Tidak Memadai': 'red' };

import { assessNetwork, networkDefectLabel, ADAPTATION_LABEL,
  type NetworkItem, type NetworkMonitoringResult, type NetworkDeficiency } from './canon_smm_network';

/** Wadah jaringan ¶48–52 sebagaimana tersimpan di AMS.QM_NETWORK. */
interface GovNetwork {
  inNetwork: boolean; name: string; year: number;
  items: NetworkItem[]; monitoring: NetworkMonitoringResult[]; deficiencies: NetworkDeficiency[];
}

function Governance() {
  const A: any = AMS;
  const comps = A.QM_COMPONENTS, roles = A.QM_ROLES, providers = A.QM_PROVIDERS, culture = A.QM_CULTURE, ev = A.QM_EVAL;
  const net: GovNetwork = A.QM_NETWORK || { inNetwork: false, name: '', year: 0, items: [], monitoring: [], deficiencies: [] };
  const netA = assessNetwork(net.inNetwork, net.items, net.monitoring, net.deficiencies, net.year);
  const [tab, setTab] = useGov('spm');
  const [sel, setSel] = useGov(null);

  const avg = Math.round(comps.reduce((s: any, c: any) => s + c.score, 0) / comps.length);
  const effective = comps.filter((c: any) => c.status === 'Efektif').length;
  const openDefs = comps.reduce((s: any, c: any) => s + c.defs, 0);
  const selComp = sel ? comps.find((c: any) => c.id === sel) : null;

  const tabs = [
    { id: 'spm', label: 'Komponen SMM', count: comps.length },
    { id: 'roles', label: 'Akuntabilitas & Peran', count: roles.length },
    { id: 'resources', label: 'Sumber Daya & Penyedia', count: providers.length },
    { id: 'network', label: 'Ketentuan Jaringan', count: net.items.length },
    { id: 'culture', label: 'Budaya Mutu & Evaluasi' },
  ];
  const scoreColor = (s: any) => s >= 85 ? 'var(--green)' : s >= 75 ? 'var(--amber)' : 'var(--red)';

  return (
    <>
      <SubBar moduleId="governance" right={<div className="row gap8 ac"><Badge kind="blue">SMM 1 · SMM</Badge><Btn sm><I.download size={13} /> Evaluasi SMM Tahunan</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={avg + '%'} label="Skor Efektivitas SMM" accent={scoreColor(avg)} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={effective + ' / ' + comps.length} label="Komponen Efektif" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={openDefs} label="Defisiensi Terbuka" accent={openDefs ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={ev && ev.conclusion === 'reasonable' ? 'Memadai' : ev && ev.conclusion === 'reasonable-with-exceptions' ? 'Dgn Pengecualian' : 'Belum Memadai'} label={'Simpulan Evaluasi ' + String((ev && ev.period ? ev.period : '').slice(-4) || '')} accent={ev && ev.conclusion === 'reasonable' ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
        </div>

        {/* Annual evaluation conclusion — centerpiece of SMM 1 */}
        <div className="panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(255,255,255,.14)', display: 'grid', placeItems: 'center', flex: '0 0 42px' }}><I.shield size={22} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Simpulan Evaluasi SMM Tahunan — Periode {ev.period}</div>
              <div className="tiny" style={{ color: '#bcd6e4' }}>Disusun {ev.by} · Disetujui {ev.approvedBy}</div>
            </div>
            <Badge kind="green"><I.checkCircle size={12} /> Keyakinan Memadai</Badge>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 0 }}>
            <div style={{ padding: '14px 18px', borderRight: '1px solid var(--line-soft)' }}>
              <div className="tiny muted upper" style={{ marginBottom: 5 }}>Pernyataan Simpulan (SMM 1 ¶54)</div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--ink-2)' }}>{ev.statement}</p>
            </div>
            <div style={{ padding: '14px 18px' }}>
              <div className="tiny muted upper" style={{ marginBottom: 7 }}>Dasar Simpulan</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {ev.basis.map((b: any, i: any) => (
                  <div key={i} className="row gap8" style={{ alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.check size={13} /></span>
                    <span className="tiny" style={{ lineHeight: 1.45 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'spm' && (
            <div style={{ padding: 12 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {comps.map((c: any) => (
                  <div key={c.id} onClick={() => setSel(c.id)} className="panel" style={{ padding: '12px 14px', cursor: 'pointer', boxShadow: 'none', borderLeft: '3px solid ' + scoreColor(c.score) }}>
                    <div className="row jb ac" style={{ marginBottom: 4 }}>
                      <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</span><span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span></div>
                      <Badge kind={(GOV_STAT as any)[c.status]}>{c.status}</Badge>
                    </div>
                    <div className="tiny muted" style={{ lineHeight: 1.45, marginBottom: 9, minHeight: 30 }}>{c.desc}</div>
                    <div className="row jb ac">
                      <div className="row ac gap10">
                        <span className="tiny muted">Tujuan <b style={{ color: 'var(--ink)' }}>{c.obj}</b></span>
                        <span className="tiny muted">Risiko <b style={{ color: 'var(--ink)' }}>{c.risks}</b></span>
                        <span className="tiny muted">Defisiensi <b style={{ color: c.defs ? 'var(--amber)' : 'var(--ink)' }}>{c.defs}</b></span>
                      </div>
                      <div className="row ac gap8">
                        <Spark data={c.trend} width={56} height={22} color={scoreColor(c.score)} />
                        <span className="mono" style={{ fontWeight: 700, fontSize: 15, color: scoreColor(c.score), width: 38, textAlign: 'right' }}>{c.score}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>Pendekatan SMM 1: untuk tiap komponen, firma menetapkan <b>tujuan mutu</b>, mengidentifikasi & menilai <b>risiko mutu</b>, lalu merancang & menerapkan <b>respons</b>. Klik komponen untuk rincian kepemilikan & metrik.</div>
            </div>
          )}

          {tab === 'roles' && (
            <div style={{ padding: 14 }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 720 }}>Pimpinan firma menetapkan akuntabilitas atas SMM sesuai SMM 1 ¶20–22. Tanggung jawab <b>akhir</b> berada pada pimpinan tertinggi; tanggung jawab <b>operasional</b> serta kepemimpinan etika dan pemantauan ditugaskan secara spesifik.</p>
              <div style={{ display: 'grid', gap: 10 }}>
                {roles.map((r: any, i: any) => (
                  <div key={i} className="panel" style={{ padding: '13px 15px', boxShadow: 'none' }}>
                    <div className="grid" style={{ gridTemplateColumns: '1.1fr 1.2fr 2fr', gap: 14, alignItems: 'center' }}>
                      <div>
                        <div className="row ac gap8" style={{ marginBottom: 3 }}><span style={{ color: 'var(--blue)' }}><I.shield size={15} /></span><span style={{ fontSize: 12, fontWeight: 700 }}>{r.role}</span></div>
                        <span className="badge b-blue tiny mono">{r.ref}</span>
                      </div>
                      <div className="row ac gap8"><Avatar name={r.person} size={30} /><div><div style={{ fontSize: 12, fontWeight: 600 }}>{r.person}</div><div className="tiny muted">{r.title} · sejak {r.since}</div></div></div>
                      <div className="tiny" style={{ lineHeight: 1.5, color: 'var(--ink-2)' }}>{r.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'network' && (
            <div style={{ padding: 14, display: 'grid', gap: 12 }}>
              <div className="panel" style={{ padding: '12px 14px', background: netA.compliant ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent', boxShadow: 'none' }}>
                <div className="row jb ac" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{net.name}</span>
                  <Badge kind={netA.compliant ? 'green' : 'amber'}>{netA.compliant ? 'Lengkap' : netA.allDefects.length + ' jenis cacat'}</Badge>
                </div>
                <div className="tiny" style={{ lineHeight: 1.5 }}>
                  SMM 1 ¶48–52 — KAP <b>tetap bertanggung jawab</b> atas sistem manajemen mutunya dan tidak boleh
                  membiarkan kepatuhan pada ketentuan jaringan melanggar ketentuan SMM. Toolkit &amp; Matriks IAPI
                  ditulis untuk KAP non-jaringan, jadi wadah ini bersandar langsung pada teks standar.
                </div>
              </div>

              {/* ¶51(b) hasil pemantauan jaringan tahunan */}
              <div className="panel" style={{ padding: '11px 13px', boxShadow: 'none', borderLeft: '3px solid var(--' + (netA.monitoringDefects.length ? 'red' : 'green') + ')' }}>
                <div className="row jb ac">
                  <span className="tiny" style={{ fontWeight: 700 }}>Hasil Pemantauan Jaringan {net.year} (¶51(b))</span>
                  <Badge kind={netA.monitoringDefects.length ? 'red' : 'green'}>{netA.monitoringDefects.length ? 'Belum lengkap' : 'Diperoleh & ditindaklanjuti'}</Badge>
                </div>
                {netA.monitoringDefects.map((d) => (
                  <div key={d} className="tiny" style={{ color: 'var(--red)', marginTop: 4, lineHeight: 1.45 }}>{networkDefectLabel(d)}</div>
                ))}
              </div>

              {/* ¶48(a)(b)(c) + ¶49(b) */}
              <table className="dtbl">
                <thead><tr><th>Ketentuan / Jasa Jaringan</th><th>Jenis</th><th>Penanggung Jawab KAP (¶48(c))</th><th>Evaluasi Adaptasi (¶49(b))</th><th>Status</th></tr></thead>
                <tbody>
                  {net.items.map((it) => {
                    const au = netA.items.find((x) => x.itemId === it.id);
                    return (
                      <tr key={it.id}>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>{it.title}
                          <div className="tiny muted" style={{ fontWeight: 400 }}>{it.id}{it.component ? ' · ' + it.component : ''}</div></td>
                        <td className="tiny">{it.kind === 'requirement' ? 'Ketentuan' : 'Jasa'}</td>
                        <td className="tiny">{it.firmResponsibility || <span style={{ color: 'var(--red)' }}>belum ditetapkan</span>}</td>
                        <td className="tiny muted" style={{ maxWidth: 320 }}>
                          {it.adaptation
                            ? <><b style={{ color: 'var(--ink-2)' }}>{ADAPTATION_LABEL[it.adaptation]}</b><div style={{ lineHeight: 1.4 }}>{it.adaptationBasis}</div></>
                            : <span style={{ color: 'var(--red)' }}>belum dievaluasi</span>}
                        </td>
                        <td><Badge kind={au && au.compliant ? 'green' : 'red'}>{au && au.compliant ? 'Lengkap' : 'Cacat'}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* ¶52 defisiensi DALAM ketentuan/jasa jaringan */}
              <div>
                <div className="tiny muted upper" style={{ marginBottom: 6 }}>Defisiensi dalam Ketentuan/Jasa Jaringan (¶52)</div>
                {net.deficiencies.length ? net.deficiencies.map((d) => {
                  const au = netA.deficiencies.find((x) => x.deficiencyId === d.id);
                  return (
                    <div key={d.id} className="panel" style={{ padding: '10px 12px', boxShadow: 'none', marginBottom: 6, borderLeft: '3px solid var(--' + (au && au.compliant ? 'green' : 'red') + ')' }}>
                      <div className="row jb ac" style={{ marginBottom: 3 }}>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id} · {d.itemId}</span>
                        <Badge kind={au && au.compliant ? 'green' : 'red'}>{au && au.compliant ? 'Ditangani' : 'Belum tuntas'}</Badge>
                      </div>
                      <div className="tiny" style={{ lineHeight: 1.45 }}>{d.description}</div>
                      {au && au.defects.map((c) => (
                        <div key={c} className="tiny" style={{ color: 'var(--red)', marginTop: 3 }}>{networkDefectLabel(c)}</div>
                      ))}
                    </div>
                  );
                }) : <div className="tiny muted">Tidak ada defisiensi jaringan teridentifikasi.</div>}
              </div>
            </div>
          )}

          {tab === 'resources' && (
            <table className="dtbl">
              <thead><tr><th>Sumber Daya / Penyedia</th><th>Jenis</th><th>Ketergantungan Firma</th><th>Dievaluasi</th><th>Status</th></tr></thead>
              <tbody>
                {providers.map((p: any, i: any) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontSize: 12 }}>{p.name}<div className="tiny muted truncate" style={{ maxWidth: 300, fontWeight: 400 }}>{p.note}</div></td>
                    <td className="tiny">{p.type}</td>
                    <td className="tiny muted">{p.reliance}</td>
                    <td className="mono tiny muted">{p.evaluated}</td>
                    <td><Badge kind={(PRV_STAT as any)[p.status]}>{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'culture' && (
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
                {culture.map((k: any, i: any) => (
                  <div key={i} className="panel" style={{ padding: '12px 13px', boxShadow: 'none' }}>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--' + k.accent + ')' }}>{k.v}</div>
                    <div className="tiny" style={{ fontWeight: 600, margin: '2px 0 4px', lineHeight: 1.3 }}>{k.k}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.4 }}>{k.note}</div>
                  </div>
                ))}
              </div>
              <div className="panel" style={{ padding: '13px 16px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
                <div className="row ac gap8" style={{ marginBottom: 6 }}><span style={{ color: 'var(--blue)' }}><I.book size={16} /></span><span style={{ fontSize: 12, fontWeight: 700 }}>Tone at the Top — Komitmen Mutu Pimpinan</span></div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--ink-2)' }}>Pimpinan firma menempatkan mutu di atas pertimbangan komersial dan tenggat waktu. Akuntabilitas mutu tercermin pada evaluasi & remunerasi partner (bobot 40%), komunikasi mutu berkala, serta penyediaan sumber daya yang memadai. Budaya mutu dipantau melalui survei staf tahunan dan dievaluasi sebagai bagian dari simpulan SMM.</p>
              </div>
            </div>
          )}
        </Panel>
      </div></div>

      {selComp && <GovCompDetail c={selComp} onClose={() => setSel(null)} />}
    </>
  );
}

function GovCompDetail({ c, onClose }: any) {
  const A: any = AMS;
  const role = A.QM_ROLES.find((r: any) => r.person.includes(c.owner)) || null;
  const scoreColor = c.score >= 85 ? 'var(--green)' : c.score >= 75 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="panel" style={{ width: 440, maxWidth: '95vw', height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}><div className="row ac gap8"><span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{c.id}</span><Badge kind={(GOV_STAT as any)[c.status]}>{c.status}</Badge></div><div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{c.name}</div><div className="tiny" style={{ color: '#bcd6e4' }}>SMM 1 {c.ref}</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'grid', gap: 14, alignContent: 'start' }}>
          <div className="row ac gap10">
            <Donut size={76} thickness={11} segments={[{ value: c.score, color: scoreColor }, { value: 100 - c.score, color: 'var(--surface-3)' }]} center={<div><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: scoreColor }}>{c.score}%</div></div>} />
            <div style={{ flex: 1 }}><div className="tiny muted upper" style={{ marginBottom: 4 }}>Cakupan Komponen</div><div style={{ fontSize: 12, lineHeight: 1.5 }}>{c.desc}</div></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <OKv label="Tujuan Mutu" v={c.obj} />
            <OKv label="Risiko Mutu" v={c.risks} />
            <OKv label="Defisiensi" v={c.defs} accent={c.defs ? 'var(--amber)' : 'var(--green)'} />
          </div>
          <div><div className="tiny muted upper" style={{ marginBottom: 5 }}>Tren Efektivitas (4 periode)</div><div className="panel" style={{ padding: '10px 12px', boxShadow: 'none' }}><Spark data={c.trend} width={360} height={48} color={scoreColor} /></div></div>
          {role && (
            <div><div className="tiny muted upper" style={{ marginBottom: 5 }}>Pemilik Komponen</div>
              <div className="panel" style={{ padding: '11px 13px', boxShadow: 'none' }}>
                <div className="row ac gap8"><Avatar name={role.person} size={30} /><div><div style={{ fontSize: 12, fontWeight: 600 }}>{role.person}</div><div className="tiny muted">{role.title}</div></div></div>
              </div>
            </div>
          )}
          {!role && (
            <div><div className="tiny muted upper" style={{ marginBottom: 5 }}>Pemilik Komponen</div>
              <div className="panel" style={{ padding: '11px 13px', boxShadow: 'none' }}><div className="row ac gap8"><Avatar name={c.owner} size={30} /><span style={{ fontSize: 12, fontWeight: 600 }}>{c.owner}</span></div></div>
            </div>
          )}
          <div className="panel" style={{ padding: '10px 12px', background: c.status === 'Efektif' ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: c.status === 'Efektif' ? 'var(--green)' : 'var(--amber)' }}>{c.status === 'Efektif' ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span><span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>{c.status === 'Efektif' ? 'Respons mutu dinilai efektif untuk periode berjalan.' : 'Terdapat defisiensi — pantau di SOQM Operasional → Defisiensi & Remediasi.'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { GovCompDetail, Governance };
