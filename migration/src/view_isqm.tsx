/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useInitialTab, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Stat, Tabs } from './ui';
import { para38Coverage, para39bBreaches, breachLabel } from './canon_smm_monitoring';
import { SMM1_OBJECTIVE_COUNT, objectivesForComponent, objectiveCoverage, type ObjectiveWaiver, type ObjectiveLinkedRisk } from './canon_smm_objectives';
import { smmDocCoverage, auditRetention, type RetentionPolicy } from './canon_smm_documentation';
import { smmDocEvidence, evidencedElements, type DocEvidenceInput } from './canon_smm_doc_evidence';
import { useFirmAttest } from './firm_attest';
import { attestKeyFor } from './canon_firm_attest';
import { toolkitHomes } from './canon_smm_toolkit';
import { SoqmToolkitMap } from './view_isqm_toolkit';
import type { SmmComponentCode } from './canon_smm_refs';
import { SoqmAnnualEval, SoqmHeatmap, SoqmInfoComm, SoqmObjectives, SoqmSeverity } from './view_isqm_deep';
import { SoqmComponents, SoqmFlow, SoqmLineage } from './view_isqm_parts';
import { OKv } from './view_onboarding';

/* ============================================================
   Asseris — Mutu & Regulasi: SOQM Operasional (SMM 1)
   Tujuan mutu → risiko mutu → respons → pemantauan → defisiensi
   → remediasi & akar masalah · Register Keluhan & Tuduhan.
   ------------------------------------------------------------
   Tarikan data: seluruh nama klien/partner/PIE & angka pemantauan
   DITURUNKAN dari satu sumber kebenaran (AMS: ENGAGEMENTS,
   CLIENTS, STAFF, CAPACITY, INDEPENDENCE, PPPK, QM_*) via engMeta()
   & soqmPull() — tidak ada denormalisasi yang dapat menyimpang.
   Komponen berat dipisah ke view_isqm_parts.jsx.
   ============================================================ */
const { useState: useSOQM } = React;

/* F1/PR-5 — siklus status + bentuk baris bertipe untuk jalur tulis (hindari :any baru). */
const SOQM_MON_CYCLE = ['Belum Diuji', 'Efektif', 'Defisiensi'];
const SOQM_CMP_CYCLE = ['Baru', 'Ditangani', 'Investigasi', 'Selesai'];
type SoqmMonRow = { id: string; monitor: string };
type SoqmCmpRow = { id: string; status: string };

const MON_KIND = { 'Efektif': 'green', 'Defisiensi': 'red', 'Belum Diuji': 'gray' };
const CMP_STAT = { 'Selesai': 'green', 'Investigasi': 'red', 'Ditangani': 'amber', 'Baru': 'blue' };
const SEV_KIND = { 'Tinggi': 'red', 'Sedang': 'amber', 'Rendah': 'gray' };
const INSP_GRADE = { 'Memuaskan': 'green', 'Perlu Perbaikan': 'amber', 'Tidak Memuaskan': 'red', 'Dijadwalkan': 'gray' };
const MON_RESULT = { 'Efektif': 'green', 'Berjalan': 'blue', 'Pemantauan': 'amber' };

/* peta aktivitas pemantauan → modul sumber kebenaran */
const MON_SOURCE = {
  'Inspeksi perikatan siklus': { mod: 'cockpit', src: 'ENGAGEMENTS' },
  'Pemantauan kepatuhan independensi': { mod: 'independence', src: 'INDEPENDENCE' },
  'Reviu pembaruan metodologi & SA': { mod: 'kb', src: 'Knowledge Base' },
  'Pemantauan penyedia jasa & teknologi': { mod: 'governance', src: 'QM_PROVIDERS' },
};

function SOQM() {
  const nav = useNav();
  const [risks, setRisks]: any = useAmsPersist('soqmRisks', () => AMS.SOQM_RISKS);
  const [complaints, setComplaints]: any = useAmsPersist('complaints.v2', () => AMS.COMPLAINTS);
  // F1/PR-5 (PRD 2026-07-19) — jalur tulis nyata: register risiko mutu & keluhan kini editable
  // (dulu setter useAmsPersist dideklarasi tapi TAK PERNAH dipanggil → efektif display-only).
  const cycleMon = (id: string) => setRisks((list: SoqmMonRow[]) => list.map((r) => r.id === id ? { ...r, monitor: SOQM_MON_CYCLE[(SOQM_MON_CYCLE.indexOf(r.monitor) + 1) % SOQM_MON_CYCLE.length] } : r));
  const advComplaint = (id: string) => setComplaints((list: SoqmCmpRow[]) => list.map((c) => c.id === id ? { ...c, status: SOQM_CMP_CYCLE[Math.min(SOQM_CMP_CYCLE.indexOf(c.status) + 1, SOQM_CMP_CYCLE.length - 1)] } : c));
  const addComplaint = () => {
    const id = 'KP-' + String(200 + Math.floor(Math.random() * 700)).padStart(3, '0');
    const nc = { id, date: new Date().toISOString().slice(0, 10), source: 'Internal', type: 'Keluhan', subject: 'Keluhan baru — lengkapi pokok perkara & penanggung jawab.', resolution: '', severity: 'Rendah', owner: 'Tim Mutu', status: 'Baru' };
    setComplaints((list: SoqmCmpRow[]) => [nc, ...list]);
  };
  const inspections: any = AMS.QM_INSPECTIONS;
  const inspFindings: any = AMS.QM_INSP_FINDINGS;
  const monActivities: any = AMS.QM_MON_ACTIVITIES;
  const engMeta: any = AMS.engMeta || ((): any => null);
  /* Deep-link tab: `#/soqm?tab=toolkit` & `nav('soqm',{tab})`. Sebelumnya
     `useState` polos, sehingga tautan ke tab mana pun selalu mendarat di
     Register — termasuk tautan "Evaluasi Tahunan" dari Governance. */
  const [tab, setTab] = useInitialTab('soqm', 'register');

  /* PR-8b — status dokumentasi ¶57–60. `smmDocCoverage`/`auditRetention` sudah
     dibangun PR-7 lalu tidak pernah dikonsumsi view mana pun; keduanya kini
     dipasang, dengan `present` DITURUNKAN dari artefak (canon_smm_doc_evidence),
     bukan dari daftar centang. Kesimpulan ¶54 yang dibaca adalah yang TERTULIS
     & tersimpan — rekomendasi mesin bukan basis kesimpulan KAP (¶58(e)). */
  /* Dibaca BERTIPE — `const A: any = AMS` akan meng-un-suppress seluruh berkas
     terhadap ratchet no-explicit-any. */
  const AD = AMS as unknown as {
    QM_EVAL?: { period?: string };
    CPE_REQ?: { year?: number };
    QM_ROLES?: DocEvidenceInput['roles'];
    QM_INSPECTIONS?: DocEvidenceInput['inspections'];
    QM_INSP_FINDINGS?: DocEvidenceInput['findings'];
    QM_NETWORK?: DocEvidenceInput['network'] & { inNetwork?: boolean };
    QM_DOC_RETENTION?: RetentionPolicy & { basis?: string };
    SMM_OBJECTIVE_WAIVERS?: readonly ObjectiveWaiver[];
  };
  const smmPeriod: string = (AD.QM_EVAL || {}).period || 'Tahun Berjalan';
  const smmAttest = useFirmAttest(attestKeyFor('soqmAnnualEval', smmPeriod, (AD.CPE_REQ || {}).year), smmPeriod);
  const docEvidence = smmDocEvidence({
    roles: AD.QM_ROLES,
    coverage: objectiveCoverage(risks as ObjectiveLinkedRisk[], AD.SMM_OBJECTIVE_WAIVERS || []),
    risks,
    inspections: AD.QM_INSPECTIONS,
    findings: AD.QM_INSP_FINDINGS,
    writtenConclusion: smmAttest.state ? smmAttest.state.conclusion : null,
    network: AD.QM_NETWORK,
  });
  const [sel, setSel] = useSOQM(null);
  const [openRca, setOpenRca] = useSOQM(null);

  const deficiencies = risks.filter((r: any) => r.deficiency);
  const effective = risks.filter((r: any) => r.monitor === 'Efektif').length;
  const openRemediation = deficiencies.filter((r: any) => r.deficiency.status !== 'Selesai').length;
  const soqmScore = Math.round(effective / risks.length * 100);

  const inspDone = inspections.filter((i: any) => i.grade !== 'Dijadwalkan');
  const totalInspFindings = inspections.reduce((s: any, i: any) => s + i.findings, 0);
  const tabs = [
    /* Hitungan badge = jumlah TUJUAN MANDATORI ¶28–33, sejajar dengan
       "Register Risiko Mutu" yang menghitung isi registernya sendiri.
       Sebelumnya `risks.length` — badge berbunyi "6" di atas panel yang
       menyatakan 27 tujuan dan 5/27 tertangani. */
    { id: 'objectives', label: 'Tujuan Mutu', count: SMM1_OBJECTIVE_COUNT },
    { id: 'register', label: 'Register Risiko Mutu', count: risks.length },
    { id: 'monitoring', label: 'Pemantauan & Inspeksi', count: totalInspFindings },
    { id: 'remediation', label: 'Defisiensi & Remediasi', count: openRemediation },
    { id: 'infocomm', label: 'Informasi & Komunikasi' },
    { id: 'complaints', label: 'Keluhan & Tuduhan', count: complaints.filter((c: any) => c.status !== 'Selesai').length },
    { id: 'evaluation', label: 'Evaluasi Tahunan SMM' },
    { id: 'lineage', label: 'Tarikan Data Lintas-Modul' },
    /* PR-8a-1 — peta Toolkit IAPI. Hitungannya adalah CELAH (dokumen tanpa
       artefak di Asseris), sejalan dengan tab Defisiensi & Keluhan yang juga
       menghitung hal yang menuntut tindakan. */
    { id: 'toolkit', label: 'Dokumentasi SMM', count: toolkitHomes().partial.length + toolkitHomes().none.length },
  ];
  const sevColor = (l: any, i: any) => { const s = l * i; return s >= 12 ? 'var(--red)' : s >= 6 ? 'var(--amber)' : 'var(--green)'; };
  const selRisk = sel ? risks.find((r: any) => r.id === sel) : null;

  return (
    <>
      <SubBar moduleId="soqm" right={<div className="row gap8 ac"><Badge kind="blue">SMM 1 · SOQM</Badge><Btn sm variant={tab === 'evaluation' ? 'primary' : ''} onClick={() => setTab('evaluation')}><I.shield size={13} /> Evaluasi SOQM Tahunan</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={soqmScore + '%'} label="Respons Mutu Efektif" accent={soqmScore >= 85 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={deficiencies.length} label="Defisiensi Teridentifikasi" accent={deficiencies.length ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={openRemediation} label="Remediasi Berjalan" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={complaints.filter((c: any) => c.type === 'Tuduhan').length} label="Tuduhan Aktif" accent="var(--red)" /></div></Panel>
        </div>

        {/* Daur hidup pendekatan berbasis risiko */}
        <Panel><div style={{ padding: '10px 12px' }}><SoqmFlow active={tab} onPick={setTab} /></div></Panel>

        <div style={{ height: 12 }} />

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'objectives' && <SoqmObjectives risks={risks} nav={nav} onPick={(id: any) => { setTab('register'); setSel(id); }} />}

          {tab === 'register' && (
            <div>
              <div style={{ padding: 14, borderBottom: '1px solid var(--line-soft)' }}>
                <div className="row jb ac" style={{ marginBottom: 8 }}>
                  <div className="tiny muted upper">Peta Panas Risiko Mutu · Likelihood × Dampak — alat bantu prioritas firma, bukan ketentuan SMM (¶25)</div>
                  <span className="tiny muted">Klik bubble untuk membuka detail risiko</span>
                </div>
                <SoqmHeatmap risks={risks} onPick={(id: any) => setSel(id)} />
              </div>
              <table className="dtbl">
                <thead><tr><th>ID</th><th>Komponen SMM</th><th>Risiko Mutu</th><th className="num">L×D</th><th>Pemilik</th><th>Pemantauan</th></tr></thead>
                <tbody>
                  {risks.map((r: any) => (
                    <tr key={r.id} onClick={() => setSel(r.id)} style={{ cursor: 'pointer' }} className={r.id === sel ? 'sel' : ''}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                      <td className="tiny" style={{ fontWeight: 600 }}>{r.comp}</td>
                      <td className="tiny muted truncate" style={{ maxWidth: 280 }}>{r.risk}</td>
                      <td className="num"><span className="mono" style={{ fontWeight: 700, color: sevColor(r.lik, r.imp) }}>{r.lik}×{r.imp}</span></td>
                      <td className="tiny">{r.owner}</td>
                      <td onClick={(e: { stopPropagation(): void }) => { e.stopPropagation(); cycleMon(r.id); }} title="Klik untuk ubah status pemantauan" style={{ cursor: 'pointer' }}><Badge kind={(MON_KIND as any)[r.monitor]}>{r.monitor}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: 14, borderTop: '1px solid var(--line-soft)' }}><SoqmComponents risks={risks} nav={nav} /></div>
            </div>
          )}

          {tab === 'monitoring' && (
            <div style={{ padding: 14, display: 'grid', gap: 14 }}>
              {/* ¶38(c) & ¶39(b) — dihitung, bukan diklaim. Sebelumnya cakupan
                  per rekan hanya berupa string 'cover' pada QM_MON_ACTIVITIES,
                  dan larangan inspeksi-diri tidak ditegakkan sama sekali. */}
              <Para38Panel />
              <div>
                <div className="tiny muted upper" style={{ marginBottom: 8 }}>Aktivitas Pemantauan Firma (SMM 1 ¶36–38) — tertaut ke modul sumber</div>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                  {monActivities.map((a: any, i: any) => {
                    const src = (MON_SOURCE as any)[a.act];
                    return (
                      <div key={i} className="panel" style={{ padding: '11px 13px', boxShadow: 'none' }}>
                        <div className="row jb ac" style={{ marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>{a.act}</span><Badge kind={(MON_RESULT as any)[a.result]}>{a.result}</Badge></div>
                        <div className="row ac gap10 tiny muted"><span>{a.freq}</span><span>·</span><span>Terakhir {a.last}</span><span>·</span><span>{a.owner}</span></div>
                        <div className="tiny" style={{ marginTop: 4, color: 'var(--ink-2)' }}>{a.cover}</div>
                        {src && (
                          <button type="button" className="soqm-src" style={{ marginTop: 6 }} onClick={() => nav(src.mod, { from: 'soqm' })}>
                            <span className="tiny muted">Sumber:</span><span className="tiny mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{src.src}</span>{I ? <I.arrowRight size={11} /> : null}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="row jb ac" style={{ marginBottom: 8 }}>
                  <div className="tiny muted upper">Inspeksi Perikatan — Siklus 2025 (klien & partner ditarik dari master)</div>
                  <div className="row ac gap8"><span className="tiny muted">{inspDone.length} selesai · {totalInspFindings} temuan</span></div>
                </div>
                <table className="dtbl">
                  <thead><tr><th>ID</th><th>Perikatan</th><th>Jenis</th><th>Partner</th><th>Inspektur</th><th>Tanggal</th><th className="num">Temuan</th><th>Grade</th><th></th></tr></thead>
                  <tbody>
                    {inspections.map((ins: any) => {
                      const m = engMeta(ins.eng);
                      return (
                        <tr key={ins.id}>
                          <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{ins.id}</td>
                          <td className="tiny" style={{ fontWeight: 600 }}>{m ? m.shortClient : ins.client}
                            <div className="tiny muted row ac gap4" style={{ fontWeight: 400 }}>{m && m.pie ? <Badge kind="red">PIE</Badge> : null}<span className="mono">{ins.eng}</span> · {ins.scope}</div></td>
                          <td className="tiny">{ins.type}</td>
                          <td className="tiny">{ins.partner}</td>
                          <td className="tiny muted">{ins.inspector}</td>
                          <td className="mono tiny muted">{new Date(ins.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                          <td className="num"><span className="mono" style={{ fontWeight: 700, color: ins.findings ? 'var(--amber)' : 'var(--green)' }}>{ins.findings}</span></td>
                          <td><Badge kind={(INSP_GRADE as any)[ins.grade]}>{ins.grade}</Badge></td>
                          <td><button type="button" className="soqm-go" title="Buka EQR perikatan" onClick={() => nav('eqr', { from: 'soqm' })}>{I ? <I.arrowRight size={13} /> : '→'}</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div>
                <div className="tiny muted upper" style={{ marginBottom: 8 }}>Temuan Inspeksi & Analisis Akar Masalah</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {inspFindings.map((f: any, i: any) => {
                    const isOpen = openRca === i;
                    const m = engMeta((inspections.find((x: any) => x.id === f.ins) || {}).eng);
                    return (
                      <div key={i} className="panel" style={{ padding: 0, boxShadow: 'none', borderLeft: '3px solid var(--' + ((SEV_KIND as any)[f.sev] || 'amber') + ')', overflow: 'hidden' }}>
                        <div onClick={() => setOpenRca(isOpen ? null : i)} style={{ padding: '10px 13px', cursor: 'pointer' }}>
                          <div className="row jb ac">
                            <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{f.ins}</span>{m ? <span className="tiny muted">{m.shortClient}</span> : null}<span style={{ fontSize: 12, fontWeight: 700 }}>{f.area}</span><Badge kind={(SEV_KIND as any)[f.sev]}>{f.sev}</Badge></div>
                            <span style={{ color: 'var(--ink-4)' }}><I.chevDown size={15} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '.15s' }} /></span>
                          </div>
                          <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.45 }}>{f.desc}</div>
                        </div>
                        {isOpen && (
                          <div style={{ padding: '12px 13px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)' }}>
                            <div className="grid" style={{ gridTemplateColumns: f.rca5.length ? '1fr 1fr' : '1fr', gap: 14 }}>
                              <div>
                                <div className="tiny muted upper" style={{ marginBottom: 4 }}>Penyebab Langsung</div>
                                <div className="tiny" style={{ lineHeight: 1.5 }}>{f.cause}</div>
                              </div>
                              {f.rca5.length > 0 && (
                                <div>
                                  <div className="tiny muted upper" style={{ marginBottom: 6 }}>Akar Masalah (5-Why)</div>
                                  <div style={{ display: 'grid', gap: 4 }}>
                                    {f.rca5.map((w: any, wi: any) => (
                                      <div key={wi} className="row gap8" style={{ alignItems: 'flex-start' }}>
                                        <span style={{ flex: '0 0 16px', height: 16, borderRadius: 4, background: wi === f.rca5.length - 1 ? 'var(--amber)' : 'var(--blue)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', marginTop: 1 }}>{wi + 1}</span>
                                        <span className="tiny" style={{ lineHeight: 1.4, fontWeight: wi === f.rca5.length - 1 ? 700 : 400 }}>{w}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'remediation' && (
            <div>
              <div style={{ padding: 14, borderBottom: '1px solid var(--line-soft)' }}>
                <SoqmSeverity deficiencies={deficiencies} P={(window as any).soqmPull ? (window as any).soqmPull() : { overloaded: [], rotationDue: [] }} complaints={complaints} inspFindings={inspFindings} />
              </div>
              <RemediationTab deficiencies={deficiencies} nav={nav} />
            </div>
          )}

          {tab === 'infocomm' && <SoqmInfoComm nav={nav} />}

          {tab === 'evaluation' && <SoqmAnnualEval risks={risks} inspections={inspections} inspFindings={inspFindings} complaints={complaints} nav={nav} />}

          {tab === 'complaints' && (
            <div>
              <div className="panel-h" style={{ borderBottom: '1px solid var(--line-soft)' }}><h3>Register Keluhan & Tuduhan (SMM 1 ¶34(c))</h3><div style={{ flex: 1 }} /><Btn sm variant="primary" onClick={addComplaint}><I.plus size={13} /> Catat Keluhan</Btn></div>
              <table className="dtbl">
                <thead><tr><th>ID</th><th>Tanggal</th><th>Sumber</th><th>Jenis</th><th>Pokok Perkara</th><th>Tingkat</th><th>Penanggung Jawab</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {complaints.map((c: any) => (
                    <tr key={c.id}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</td>
                      <td className="mono tiny muted">{new Date(c.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                      <td className="tiny">{c.source}{c.clientId ? <button type="button" className="soqm-go inline" title="Buka klien" onClick={() => nav('crm', { from: 'soqm' })}><span className="mono">{c.clientId}</span></button> : null}</td>
                      <td><Badge kind={c.type === 'Tuduhan' ? 'red' : 'blue'}>{c.type}</Badge></td>
                      <td className="tiny truncate" style={{ maxWidth: 240 }}>{c.subject}<div className="tiny muted truncate">{c.resolution}</div></td>
                      <td><Badge kind={(SEV_KIND as any)[c.severity]}>{c.severity}</Badge></td>
                      <td className="tiny">{c.owner}</td>
                      <td><Badge kind={(CMP_STAT as any)[c.status]}>{c.status}</Badge></td>
                      <td>{c.status !== 'Selesai' && <button type="button" className="btn sm" style={{ height: 24 }} title="Lanjutkan status penanganan" onClick={() => advComplaint(c.id)}>Lanjut <I.arrowRight size={11} /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'lineage' && <SoqmLineage nav={nav} />}

          {tab === 'toolkit' && (
            <SoqmToolkitMap
              nav={nav}
              evidence={docEvidence}
              coverage={smmDocCoverage(evidencedElements(docEvidence), Boolean(AD.QM_NETWORK && AD.QM_NETWORK.inNetwork))}
              retention={{ ...auditRetention(AD.QM_DOC_RETENTION), basis: (AD.QM_DOC_RETENTION || {}).basis }}
            />
          )}
        </Panel>
        {tab === 'register' && <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Pendekatan berbasis risiko SMM 1 (¶23–27 · ¶35–47): tetapkan tujuan mutu → identifikasi & nilai risiko mutu (Likelihood × Dampak) → rancang & terapkan respons → pantau efektivitas → remediasi defisiensi dengan analisis akar masalah.</div>}
      </div></div>

      {selRisk && <RiskDetail r={selRisk} nav={nav} onClose={() => setSel(null)} />}
    </>
  );
}

/* ============================================================
   ¶38(c) cakupan inspeksi per rekan perikatan · ¶39(b) larangan
   inspeksi-diri — keduanya DIHITUNG dari register, bukan diklaim.

   Sebelumnya cakupan per rekan hanya string pada QM_MON_ACTIVITIES
   ('≥1 perikatan / partner'), dan tak ada aturan yang mencegah
   anggota tim perikatan menginspeksi perikatannya sendiri.
   ============================================================ */
function Para38Panel() {
  const A: any = AMS;
  const cov = para38Coverage(A.ENGAGEMENTS, A.QM_INSPECTIONS);
  const breaches = para39bBreaches(A.QM_INSPECTIONS, A.ENGAGEMENTS, A.EQR_REVIEWS);

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {/* ¶38(c) */}
      <Panel noBody>
        <div className="panel-h">
          <h3>Cakupan Inspeksi per Rekan Perikatan</h3>
          <div style={{ flex: 1 }} />
          <Badge kind={cov.satisfied ? 'green' : 'red'}>{cov.satisfied ? 'Terpenuhi' : 'Belum Terpenuhi'}</Badge>
        </div>
        <div style={{ padding: '10px 14px', display: 'grid', gap: 8 }}>
          <div className="tiny muted" style={{ lineHeight: 1.5 }}>
            SMM 1 ¶38(c) — sekurangnya <b>satu perikatan yang telah SELESAI</b> untuk setiap rekan perikatan,
            secara berkala. Inspeksi atas perikatan yang masih berjalan sah sebagai pemantauan, tetapi tidak
            memenuhi ketentuan ini.
          </div>
          {cov.partners.map((p) => (
            <div key={p.partner} className="row jb ac" style={{ padding: '7px 9px', background: 'var(--surface-2)', borderRadius: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{p.partner}</span>
              <span className="row ac gap8">
                <span className="tiny muted">{p.completedEngagements.length} selesai · {p.inspectedEngagements.length} diinspeksi</span>
                <Badge kind={p.satisfied ? 'green' : p.noCompletedEngagement ? 'gray' : 'red'}>
                  {p.satisfied ? 'Terpenuhi' : p.noCompletedEngagement ? 'Belum terterap' : 'BELUM DIINSPEKSI'}
                </Badge>
              </span>
            </div>
          ))}
          {cov.inspectionsOfIncompleteEngagements.length > 0 && (
            <div className="tiny" style={{ color: 'var(--amber)', lineHeight: 1.5 }}>
              {cov.inspectionsOfIncompleteEngagements.join(' · ')} menyasar perikatan yang masih berjalan —
              tidak dihitung untuk ¶38(c).
            </div>
          )}
          {cov.scheduledNotPerformed.length > 0 && (
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>
              {cov.scheduledNotPerformed.join(' · ')} baru dijadwalkan — belum memberi basis identifikasi defisiensi (¶36).
            </div>
          )}
        </div>
      </Panel>

      {/* ¶39(b) */}
      <Panel noBody>
        <div className="panel-h">
          <h3>Objektivitas Inspektur</h3>
          <div style={{ flex: 1 }} />
          <Badge kind={breaches.length ? 'red' : 'green'}>{breaches.length ? breaches.length + ' pelanggaran' : 'Bersih'}</Badge>
        </div>
        <div style={{ padding: '10px 14px', display: 'grid', gap: 8 }}>
          <div className="tiny muted" style={{ lineHeight: 1.5 }}>
            SMM 1 ¶39(b) — anggota tim perikatan atau penelaah mutu perikatan atas suatu perikatan
            <b> dilarang</b> melaksanakan inspeksi atas perikatan tersebut.
          </div>
          {breaches.length ? breaches.map((b) => (
            <div key={b.inspection} className="panel" style={{ padding: '9px 11px', boxShadow: 'none', borderLeft: '3px solid var(--red)' }}>
              <div className="row ac gap6" style={{ marginBottom: 3 }}>
                <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{b.inspection}</span>
                <Badge kind="red">Objektivitas terganggu</Badge>
              </div>
              <div className="tiny" style={{ lineHeight: 1.5 }}>{breachLabel(b)}</div>
            </div>
          )) : (
            <div className="tiny muted" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 4 }}>
              Tidak ada inspektur yang merangkap sebagai anggota tim perikatan atau penelaah mutu pada perikatan yang diinspeksinya.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* —— Tab Defisiensi & Remediasi: QR-02 tertaut LIVE ke Capacity Planning —— */
function RemediationTab({ deficiencies, nav }: any) {
  const P = (window as any).soqmPull ? (window as any).soqmPull() : null;
  return (
    <div style={{ padding: 14, display: 'grid', gap: 12 }}>
      {deficiencies.length ? deficiencies.map((r: any) => {
        const d = r.deficiency;
        const capacityTie = r.id === 'QR-02' && P;
        const sevList = (AMS as any).QM_INSP_FINDINGS.filter((f: any) => (f.cause || '').toLowerCase().includes('senior') || (f.rca5 || []).some((w: any) => w.toLowerCase().includes('sumber daya')));
        return (
          <div key={r.id} className="panel" style={{ padding: 14, borderLeft: '3px solid var(--' + ((SEV_KIND as any)[d.sev] || 'amber') + ')' }}>
            <div className="row jb ac" style={{ marginBottom: 8 }}>
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</span><span style={{ fontWeight: 700, fontSize: 13 }}>{r.comp}</span><Badge kind={(SEV_KIND as any)[d.sev]}>Defisiensi {d.sev}</Badge></div>
              <Badge kind={d.status === 'Selesai' ? 'green' : 'amber'}>{d.status}</Badge>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><div className="tiny muted upper" style={{ marginBottom: 3 }}>Deskripsi Defisiensi</div><div className="tiny" style={{ lineHeight: 1.5 }}>{d.desc}</div></div>
              <div><div className="tiny muted upper" style={{ marginBottom: 3 }}>Akar Masalah (Root Cause)</div><div className="tiny" style={{ lineHeight: 1.5 }}>{d.rootCause}</div></div>
            </div>

            {capacityTie && (
              <div className="panel" style={{ marginTop: 12, padding: '11px 13px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
                <div className="row jb ac" style={{ marginBottom: 8 }}>
                  <div className="row ac gap6"><span style={{ color: 'var(--blue)' }}>{I ? <I.link2 size={14} /> : null}</span><span className="tiny" style={{ fontWeight: 700 }}>Tarikan langsung — Capacity Planning (validasi defisiensi)</span></div>
                  <button type="button" className="soqm-src" onClick={() => nav('capacity', { from: 'soqm' })}><span className="tiny mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>CAPACITY</span>{I ? <I.arrowRight size={11} /> : null}</button>
                </div>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  <OKv label="Senior > 92% (puncak)" v={P.overloaded.length + ' orang'} accent={P.overloaded.length ? 'var(--amber)' : 'var(--green)'} />
                  <OKv label="Utilisasi puncak senior" v={P.peakUtil + '%'} accent={P.peakUtil > 100 ? 'var(--red)' : 'var(--amber)'} />
                  <OKv label="Senior terdampak" v={P.overloaded.map((s: any) => s.name.split(' ')[0]).join(', ') || '—'} />
                </div>
                <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.4 }}>Angka diturunkan dari <span className="mono">schedule</span> + <span className="mono">capacityPlan</span> (Capacity Planning) — defisiensi QR-02 tervalidasi terhadap proyeksi beban senior, bukan klaim manual.</div>
              </div>
            )}

            <div className="divider" />
            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
              <div><div className="tiny muted upper" style={{ marginBottom: 3 }}>Tindakan Remediasi</div><div className="tiny" style={{ lineHeight: 1.5 }}>{d.action}</div></div>
              <OKv label="Penanggung Jawab" v={d.owner} />
              <OKv label="Target Selesai" v={new Date(d.due).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} accent="var(--amber)" />
            </div>

            {r.id === 'QR-02' && sevList.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div className="tiny muted upper" style={{ marginBottom: 5 }}>Temuan inspeksi terkait (ketertelusuran akar masalah)</div>
                <div style={{ display: 'grid', gap: 5 }}>
                  {sevList.map((f: any, i: any) => (
                    <div key={i} className="row ac gap8" style={{ fontSize: 12 }}>
                      <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{f.ins}</span>
                      <span style={{ fontWeight: 600 }}>{f.area}</span>
                      <span className="muted truncate" style={{ flex: 1 }}>{f.cause}</span>
                      <Badge kind={(SEV_KIND as any)[f.sev]}>{f.sev}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }) : <div className="tiny muted" style={{ textAlign: 'center', padding: 20 }}>Tidak ada defisiensi terbuka. SOQM efektif.</div>}
    </div>
  );
}

function RiskDetail({ r, nav, onClose }: any) {
  const comp = ((AMS as any).QM_COMPONENTS || []).find((c: any) => c.name.includes(r.comp) || r.comp.includes(c.name.split(' ')[0]));
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="panel" style={{ width: 460, maxWidth: '95vw', height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}><div className="row ac gap8"><span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{r.id}</span><Badge kind={(MON_KIND as any)[r.monitor]}>{r.monitor}</Badge></div><div className="tiny" style={{ color: '#bcd6e4' }}>{r.comp}{comp ? ' · ' + comp.id + ' ' + comp.ref : ''}</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'grid', gap: 14, alignContent: 'start' }}>
          {/* rantai tujuan → risiko → respons → pemantauan */}
          <div className="soqm-chain">
            {['Tujuan', 'Risiko', 'Respons', 'Pemantauan'].map((s, i) => (
              <React.Fragment key={i}><span className="soqm-chain-node">{s}</span>{i < 3 && <span className="soqm-chain-arr">→</span>}</React.Fragment>
            ))}
          </div>
          <div><div className="tiny muted upper" style={{ marginBottom: 4 }}>Tujuan Mutu</div><div style={{ fontSize: 12, lineHeight: 1.55 }}>{r.objective}</div></div>
          <div><div className="tiny muted upper" style={{ marginBottom: 4 }}>Risiko Mutu</div><div style={{ fontSize: 12, lineHeight: 1.55 }}>{r.risk}</div></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <OKv label="Likelihood" v={r.lik + ' / 5'} />
            <OKv label="Dampak" v={r.imp + ' / 5'} accent={r.lik * r.imp >= 12 ? 'var(--red)' : r.lik * r.imp >= 6 ? 'var(--amber)' : 'var(--green)'} />
          </div>
          <div><div className="tiny muted upper" style={{ marginBottom: 4 }}>Respons Mutu</div><div className="panel" style={{ padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'transparent', fontSize: 12, lineHeight: 1.55 }}>{r.response}</div></div>
          {comp && (
            <div className="panel" style={{ padding: '10px 12px', boxShadow: 'none' }}>
              {/* Skor seed dicabut: tak ada sumber jujur untuk "skor efektivitas
                  komponen", dan SMM 1 tidak mengenalnya. Yang ditampilkan adalah
                  jumlah tujuan mandatori ¶28–33 komponen ini — besaran kanonik. */}
              <div className="row jb ac" style={{ marginBottom: 4 }}><span className="tiny" style={{ fontWeight: 700 }}>Komponen SMM {comp.id} · {comp.name}</span><span className="mono tiny" style={{ fontWeight: 800, color: 'var(--ink-3)' }}>{objectivesForComponent(comp.id as SmmComponentCode).length || '—'} tujuan ¶28–33</span></div>
              <button type="button" className="soqm-src" onClick={() => nav && nav('governance', { from: 'soqm' })}><span className="tiny muted">Pemilik {comp.owner} · komponen ditarik dari Governance</span>{I ? <I.arrowRight size={11} /> : null}</button>
            </div>
          )}
          <OKv label="Pemilik Kontrol" v={r.owner} />
          {r.deficiency ? (
            <div className="panel" style={{ padding: 12, background: 'var(--amber-bg)', borderColor: 'transparent' }}>
              <div className="row ac gap8" style={{ marginBottom: 6 }}><span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span><span style={{ fontSize: 12, fontWeight: 700 }}>Defisiensi {r.deficiency.sev} · {r.deficiency.status}</span></div>
              <div className="tiny" style={{ lineHeight: 1.5, marginBottom: 6 }}>{r.deficiency.desc}</div>
              <div className="tiny"><b>Akar masalah:</b> {r.deficiency.rootCause}</div>
              <div className="tiny" style={{ marginTop: 4 }}><b>Tindakan:</b> {r.deficiency.action} <span className="muted">({r.deficiency.owner} · {r.deficiency.due})</span></div>
            </div>
          ) : (
            <div className="panel" style={{ padding: '10px 12px', background: 'var(--green-bg)', borderColor: 'transparent' }}><div className="row ac gap8"><span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span><span className="tiny" style={{ fontWeight: 600 }}>Respons mutu dinilai efektif — tidak ada defisiensi.</span></div></div>
          )}
        </div>
      </div>
    </div>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { RemediationTab, RiskDetail, SOQM };
