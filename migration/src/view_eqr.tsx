/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Check, Panel, Stat } from './ui';
import { assessReviewerEligibility, eqrClearGate, impairmentAction,
  ELIGIBILITY_DEFECT_LABEL, CLEAR_BLOCKER_LABEL, IMPAIRMENT_ACTION_LABEL,
  type EligibilityDefect, type ClearBlocker, type PartnerTenureRow } from './canon_eqr_eligibility';
import { auditEqrDocumentation, EQR_DOC_DEFECT_LABEL, type EqrDocDefect } from './canon_smm_documentation';
import { eqrCoverage } from './canon_eqr_coverage';
import { amsDateIso, amsIsoTs, amsYear } from './clock_ssot';

/* ============================================================
   Asseris — EQR Workflow (SMM 2)  ·  Pelaporan PPPK
   Engagement Quality Review sebagai gerbang wajib penerbitan
   opini · Laporan Tahunan KAP ke P2PK/PPPK Kemenkeu.
   ============================================================ */
const { useState: useEQR } = React;

const EQR_STAT = { 'Belum Mulai': 'gray', 'Berjalan': 'amber', 'Selesai': 'green' };

/* PR-6 — entri temuan baru (dulu read-only seed). */
function AddFinding({ onAdd }: { onAdd: (f: { t: string; sev: string; status: string }) => void }) {
  const [t, setT] = useEQR('');
  const [sev, setSev] = useEQR('Sedang');
  return (
    <div className="row gap8 ac" style={{ marginBottom: 16 }}>
      <input className="input" value={t} onChange={(e: { target: { value: string } }) => setT(e.target.value)}
        placeholder="Temuan baru — mis. penelaahan dokumentasi belum lengkap" style={{ flex: 1, fontSize: 12, height: 26 }} aria-label="Teks temuan baru" />
      <select className="select" value={sev} onChange={(e: { target: { value: string } }) => setSev(e.target.value)} style={{ height: 26, fontSize: 12 }} aria-label="Severitas temuan">
        <option>Tinggi</option><option>Sedang</option><option>Rendah</option>
      </select>
      <Btn sm disabled={!t.trim()} onClick={() => { onAdd({ t: t.trim(), sev, status: 'Terbuka' }); setT(''); }}><I.plus size={13} /> Temuan</Btn>
    </div>
  );
}

/* ============================================================
   EQR Workflow — mandatory gate before opinion
   ============================================================ */
function EQRWorkflow() {
  const nav = useNav();
  const [reviews, setReviews] = useAmsPersist('eqrReviews.v2', () => AMS.EQR_REVIEWS);
  const [sel, setSel] = useEQR(reviews[0].id);

  const setReview = (id: any, fn: any) => setReviews((list: any) => list.map((r: any) => r.id === id ? fn(r) : r));
  const r = reviews.find((x: any) => x.id === sel) || reviews[0];
  const meta = ((AMS.EQR_META || {}) as any)[r.id] || {};
  const doneN = r.checklist.filter((c: any) => c.ok).length;
  const allChecked = doneN === r.checklist.length;
  const openFindings = r.findings.filter((f: any) => f.status === 'Terbuka').length;

  /* SMM 2 ¶17–23 — eligibilitas kini BAGIAN DARI SYARAT penutupan.
     Bentuk lama: `canClear = allChecked && openFindings === 0 && !r.cleared`
     — eligibilitas tidak ikut sama sekali, sehingga penelaah yang tak memenuhi
     syarat dapat membuka gerbang penerbitan opini. Jeda ¶19 kini DITURUNKAN
     dari EQR_PARTNER_HISTORY, bukan boolean seed. */
  /* Dibaca BERTIPE — `const A: any = AMS` akan meng-un-suppress seluruh berkas
     terhadap ratchet no-explicit-any. */
  const A = AMS as unknown as {
    ENGAGEMENTS?: Array<{ id: string; clientId?: string; partner?: string; manager?: string }>;
    EQR_PARTNER_HISTORY?: PartnerTenureRow[];
  };
  /* PR-6 — populasi SMM 2: perikatan PIE (klien listed — SSOT sama dgn
     engMeta.pie di canon_eqr_gate) yang BELUM punya baris EQR kini terlihat,
     tidak lagi tersembunyi di balik hitungan baris registri. */
  const pieClientIds = new Set(
    ((AMS as unknown as { CLIENTS?: Array<{ id?: string; listed?: boolean }> }).CLIENTS || [])
      .filter((c) => c.listed).map((c) => c.id).filter((x): x is string => !!x)
  );
  const pieEngIds = new Set(
    (A.ENGAGEMENTS || []).filter((e) => !!e.clientId && pieClientIds.has(e.clientId)).map((e) => e.id)
  );
  const coverage = eqrCoverage(A.ENGAGEMENTS || [], reviews, pieEngIds);
  const eng = (A.ENGAGEMENTS || []).find((e) => e.id === r.eng);
  const elig = assessReviewerEligibility(
    { reviewer: r.reviewer, appointedBy: meta.appointedBy, ...(meta.eligibility || {}) },
    eng ? { partner: eng.partner || null, manager: eng.manager || null } : null,
    r.eng, eng ? (eng.clientId || null) : null,
    A.EQR_PARTNER_HISTORY || [], amsYear(),
  );
  const reviewStarted = r.status !== 'Belum Mulai';
  const impaired = impairmentAction(!!(meta.eligibility || {}).impaired, reviewStarted);
  const gate = eqrClearGate({
    checklistComplete: allChecked, openFindings, alreadyCleared: !!r.cleared, eligibility: elig,
    /* PR-6 — penilaian eligibilitas harus diakui penelaah (ber-atestasi). */
    eligibilityAcked: !!r.eligAck,
  });
  const canClear = gate.canClear;

  /* SMM 2 ¶30(a)–(e) — kelengkapan dokumentasi penelaahan. */
  const docAudit = auditEqrDocumentation({ reviewer: r.reviewer, ...(meta.documentation || {}) });

  const toggleCheck = (i: any) => setReview(r.id, (pr: any) => ({ ...pr, checklist: pr.checklist.map((c: any, j: any) => j === i ? { ...c, ok: !c.ok } : c), status: 'Berjalan' }));
  /* PR-6 — pengakuan eligibilitas ber-atestasi: identitas SESI, bukan nama baris. */
  const ackElig = () => setReview(r.id, (pr: { eligAck?: { by?: string } | null; reviewer?: string }) => ({ ...pr, eligAck: pr.eligAck ? null : { by: (AMS.USER && AMS.USER.name) || pr.reviewer || '', at: amsIsoTs() } }));
  /* PR-6 — temuan DAPAT DITULIS (dulu read-only dari seed): tambah + tutup/buka. */
  const addFinding = (f: { t: string; sev: string; status: string }) => setReview(r.id, (pr: { findings?: unknown[]; status?: string }) => ({ ...pr, findings: [...(pr.findings || []), f], status: 'Berjalan' }));
  const toggleFinding = (i: number) => setReview(r.id, (pr: { findings: Array<{ status: string }> }) => ({ ...pr, findings: pr.findings.map((f: { status: string }, j: number) => j === i ? { ...f, status: f.status === 'Terbuka' ? 'Selesai' : 'Terbuka' } : f) }));
  const clearGate = () => setReview(r.id, (pr: { reviewer?: string }) => ({ ...pr, cleared: true, status: 'Selesai', clearedBy: (AMS.USER && AMS.USER.name) || pr.reviewer || '', clearedDate: amsDateIso() }));

  return (
    <>
      <SubBar moduleId="eqr" right={<div className="row gap8 ac"><Badge kind="blue">SMM 2 · SA 220</Badge></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={reviews.length} label="EQR Aktif" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={coverage.pieTotal} label={'Wajib EQR (PIE) · ' + coverage.pieReviewed + ' direviu'} accent={coverage.pieUncovered.length ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={reviews.filter((x: any) => x.cleared).length + ' / ' + reviews.length} label="Gerbang Lolos" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={reviews.reduce((s: any, x: any) => s + x.findings.filter((f: any) => f.status === 'Terbuka').length, 0)} label="Temuan Terbuka" accent="var(--amber)" /></div></Panel>
        </div>

        {coverage.pieUncovered.length > 0 && (
          <div className="panel" style={{ padding: '10px 13px', marginBottom: 12, background: 'var(--red-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8" style={{ marginBottom: 4 }}><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span className="tiny" style={{ fontWeight: 700 }}>{coverage.pieUncovered.length} perikatan PIE belum punya penelaahan EQR terdaftar (SMM 2 ¶24 — populasi)</span></div>
            <div className="tiny" style={{ lineHeight: 1.5, color: 'var(--ink-2)' }}>
              {coverage.pieUncovered.map((e) => e.id).join(' · ')} — tanpa baris EQR, gerbang penerbitan opini tetap terkunci (fail-closed).
            </div>
          </div>
        )}

        <div className="grid split" style={{ gridTemplateColumns: '300px 1fr', gap: 12, alignItems: 'start' }}>
          {/* list */}
          <Panel noBody>
            <div className="panel-h"><h3>Daftar EQR</h3></div>
            <div style={{ display: 'grid' }}>
              {reviews.map((x: any) => (
                /* Tombol native: daftar EQR sebelumnya `<div onClick>`, sehingga
                   berpindah antar penelaahan mustahil lewat keyboard. */
                <button key={x.id} type="button" onClick={() => setSel(x.id)} aria-current={x.id === sel ? 'true' : undefined} title={'Buka ' + x.id + ' — ' + x.client} style={{ textAlign: 'left', font: 'inherit', color: 'inherit', width: '100%', padding: '11px 13px', cursor: 'pointer', border: 0, borderBottom: '1px solid var(--line-soft)', borderLeft: '3px solid ' + (x.id === sel ? 'var(--blue)' : 'transparent'), background: x.id === sel ? 'var(--blue-050)' : 'transparent' }}>
                  <div className="row jb ac" style={{ marginBottom: 3 }}><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{x.id}</span><Badge kind={(EQR_STAT as any)[x.status]}>{x.status}</Badge></div>
                  <div style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{x.client.replace('PT ', '')}</div>
                  <div className="row jb ac" style={{ marginTop: 3 }}><span className="tiny muted">{x.reviewer.split(',')[0]}</span><span className="badge tiny" style={{ background: x.type.includes('PIE') ? 'var(--red-bg)' : 'var(--surface-3)', color: x.type.includes('PIE') ? 'var(--red)' : 'var(--ink-3)' }}>{x.type}</span></div>
                </button>
              ))}
            </div>
          </Panel>

          {/* detail */}
          <Panel noBody>
            <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 18px' }}>
              <div className="row jb ac"><div><div style={{ fontSize: 15, fontWeight: 700 }}>{r.client}</div><div className="tiny" style={{ color: '#bcd6e4' }}>{r.id} · {r.eng} · Partner {r.partner} · Reviewer {r.reviewer.split(',')[0]}</div></div>{r.cleared ? <Badge kind="green"><I.checkCircle size={12} /> Gerbang Lolos</Badge> : <Badge kind="amber">Gerbang Terkunci</Badge>}</div>
            </div>
            <div style={{ padding: 16 }}>
              {/* Kelayakan & penunjukan reviewer (SMM 2 ¶18–20) */}
              {/* Eligibilitas penelaah (SMM 2 ¶17–23) — DITURUNKAN, selalu tampil.
                  Bentuk lama hanya dirender bila `meta.coolingOff || meta.competence`,
                  sehingga EQR tanpa meta tak menampilkan apa pun dan tetap bisa ditutup. */}
              <div style={{ marginBottom: 16 }}>
                <div className="row jb ac" style={{ marginBottom: 8 }}>
                  <div className="tiny muted upper">Eligibilitas Penelaah (SMM 2 ¶17–23)</div>
                  <Badge kind={elig.eligible ? 'green' : 'red'}>{elig.eligible ? 'Memenuhi syarat' : elig.defects.length + ' syarat tak terpenuhi'}</Badge>
                </div>

                <div className="panel" style={{ padding: '10px 12px', boxShadow: 'none', marginBottom: 8, borderLeft: '3px solid var(--' + (elig.coolingOff.elapsed ? 'green' : 'red') + ')' }}>
                  <div className="row jb ac">
                    <span className="tiny" style={{ fontWeight: 700 }}>Periode jeda {elig.coolingOff.requiredYears} tahun (¶19)</span>
                    <Badge kind={elig.coolingOff.elapsed ? 'green' : 'red'}>{elig.coolingOff.elapsed ? 'Terlampaui' : 'BELUM terlampaui'}</Badge>
                  </div>
                  <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.45 }}>
                    {elig.coolingOff.lastServedYear === null
                      ? 'Penelaah tidak pernah menjabat rekan perikatan atas perikatan/klien ini.'
                      : `Menjabat rekan perikatan pada ${elig.coolingOff.lastServedYear} — ${elig.coolingOff.yearsSince} tahun lalu.`}
                    <span style={{ color: 'var(--ink-4)' }}> Diturunkan dari riwayat penugasan rekan, bukan pernyataan manual.</span>
                  </div>
                </div>

                {elig.defects.length > 0 && (
                  <div className="panel" style={{ padding: '10px 12px', boxShadow: 'none', background: 'var(--red-bg)', borderColor: 'transparent' }}>
                    {elig.defects.map((d: EligibilityDefect) => (
                      <div key={d} className="tiny" style={{ lineHeight: 1.5 }}>· {ELIGIBILITY_DEFECT_LABEL[d]}</div>
                    ))}
                  </div>
                )}

                {impaired !== 'none' && (
                  <div className="panel" style={{ padding: '10px 12px', marginTop: 8, boxShadow: 'none', background: 'var(--red-bg)', borderColor: 'transparent' }}>
                    <div className="tiny" style={{ fontWeight: 700, lineHeight: 1.5 }}>{IMPAIRMENT_ACTION_LABEL[impaired]}</div>
                  </div>
                )}

                {meta.appointedBy && <div className="tiny muted" style={{ marginTop: 6 }}>Ditunjuk oleh <b style={{ color: 'var(--ink-2)' }}>{meta.appointedBy}</b> pada {meta.appointedDate} (¶17).</div>}

                <div className="panel" style={{ padding: '10px 12px', boxShadow: 'none', marginTop: 8, borderLeft: '3px solid ' + (r.eligAck ? 'var(--green)' : 'var(--amber)') }}>
                  <div className="row jb ac gap8">
                    <span className="tiny" style={{ fontWeight: 600, lineHeight: 1.45 }}>Penilaian eligibilitas ¶18–23 {r.eligAck ? 'diakui' : 'belum diakui'} oleh penelaah</span>
                    <Check on={!!r.eligAck} disabled={!!r.cleared} onChange={ackElig}
                      label={r.eligAck ? 'Diakui oleh ' + (r.eligAck.by || '') : 'Akui penilaian eligibilitas'}
                      title="Penutupan penelaahan (¶27) mensyaratkan pengakuan ini tercatat ber-identitas sesi (PR-6)" />
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.45 }}>Turunan mesin ≠ keputusan — pengakuan dicatat {r.eligAck ? 'pada ' + new Date(r.eligAck.at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'saat penelaah menyetujuinya'}.</div>
                </div>
              </div>

              {/* Lini masa reviu */}
              {meta.timeline && (
                <div style={{ marginBottom: 16 }}>
                  <div className="tiny muted upper" style={{ marginBottom: 10 }}>Lini Masa Reviu Mutu Perikatan</div>
                  <div className="row" style={{ alignItems: 'flex-start' }}>
                    {meta.timeline.map((s: any, i: any) => {
                      const col = s.status === 'Selesai' ? 'var(--green)' : s.status === 'Berjalan' ? 'var(--blue)' : 'var(--surface-3)';
                      return (
                        <div key={i} style={{ flex: 1, position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: col, color: s.status === 'Belum Mulai' ? 'var(--ink-4)' : '#fff', display: 'grid', placeItems: 'center', flex: '0 0 22px', zIndex: 1 }}>{s.status === 'Selesai' ? <I.check size={12} /> : <span style={{ fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}</span>
                            {i < meta.timeline.length - 1 && <span style={{ flex: 1, height: 2, background: s.status === 'Selesai' ? 'var(--green)' : 'var(--line)' }} />}
                          </div>
                          <div style={{ paddingRight: 8, marginTop: 5 }}><div className="tiny" style={{ fontWeight: 600, lineHeight: 1.3 }}>{s.stage}</div><div className="tiny muted mono">{s.date}</div></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="row jb ac" style={{ marginBottom: 10 }}><div className="tiny muted upper">Checklist Telaah Mutu Perikatan</div><span className="mono tiny" style={{ fontWeight: 700 }}>{doneN}/{r.checklist.length}</span></div>
              <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
                {r.checklist.map((c: any, i: any) => (
                  /* Kontrol NATIVE (CLAUDE.md §3 no. 7). Bentuk lama adalah
                     `<div onClick>` — tak terjangkau keyboard dan tanpa peran
                     apa pun, padahal justru kontrol inilah yang menggerakkan
                     `allChecked` → `canClear` → gerbang penerbitan opini.
                     Gerbang axe melewatkannya karena elemen itu tidak mengaku
                     sebagai kontrol sama sekali. */
                  <div key={i} className="panel" style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'none' }}>
                    <Check
                      on={!!c.ok}
                      disabled={!!r.cleared}
                      onChange={() => toggleCheck(i)}
                      label={c.k}
                      title={r.cleared ? 'Penelaahan sudah ditutup — checklist terkunci' : 'Tandai butir telaah mutu perikatan'}
                    />
                  </div>
                ))}
              </div>

              <div className="tiny muted upper" style={{ marginBottom: 8 }}>Temuan EQR</div>
              {r.findings.length ? (
                <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
                  {r.findings.map((f: any, i: any) => (
                    <div key={i} className="panel" style={{ padding: '9px 12px', boxShadow: 'none', borderLeft: '3px solid ' + (f.status === 'Terbuka' ? 'var(--amber)' : 'var(--green)') }}>
                      <div className="row jb ac">
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{f.t}</span>
                        <div className="row gap6 ac">
                          <Badge kind={f.sev === 'Tinggi' ? 'red' : f.sev === 'Sedang' ? 'amber' : 'blue'}>{f.sev}</Badge>
                          <Badge kind={f.status === 'Terbuka' ? 'red' : 'green'}>{f.status}</Badge>
                          {!r.cleared && <button type="button" className="btn sm" style={{ height: 22 }} onClick={() => toggleFinding(i)}>{f.status === 'Terbuka' ? 'Selesaikan' : 'Buka lagi'}</button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="tiny muted" style={{ marginBottom: 16 }}>Tidak ada temuan terbuka.</div>}

              {!r.cleared && <AddFinding onAdd={addFinding} />}

              {/* Konsultasi & perbedaan pendapat (SMM 2 ¶25(e)) */}
              {meta.consults && meta.consults.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Konsultasi atas Hal Sulit / Kontroversial</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {meta.consults.map((c: any, i: any) => (
                      <div key={i} className="panel" style={{ padding: '9px 12px', boxShadow: 'none', borderLeft: '3px solid var(--blue)' }}>
                        <div className="row jb ac"><span style={{ fontSize: 12, fontWeight: 600 }}>{c.t}</span><Badge kind={c.status === 'Selesai' ? 'green' : 'amber'}>{c.status}</Badge></div>
                        <div className="tiny muted" style={{ marginTop: 2 }}>Dikonsultasikan dengan {c.with}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {meta.diff && (
                <div style={{ marginBottom: 16 }}>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Perbedaan Pendapat & Penyelesaian (SA 220 ¶31–35)</div>
                  <div className="panel" style={{ padding: '12px 14px', boxShadow: 'none', borderLeft: '3px solid var(--purple)' }}>
                    <div className="row jb ac" style={{ marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 700 }}>{meta.diff.topic}</span><Badge kind="green">{meta.diff.status}</Badge></div>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                      <div><div className="tiny muted upper" style={{ marginBottom: 2 }}>Posisi Tim</div><div className="tiny" style={{ lineHeight: 1.45 }}>{meta.diff.team}</div></div>
                      <div><div className="tiny muted upper" style={{ marginBottom: 2 }}>Posisi Reviewer</div><div className="tiny" style={{ lineHeight: 1.45 }}>{meta.diff.reviewer}</div></div>
                    </div>
                    <div className="panel" style={{ padding: '8px 11px', background: 'var(--green-bg)', borderColor: 'transparent' }}><div className="tiny" style={{ lineHeight: 1.45 }}><b>Penyelesaian:</b> {meta.diff.resolution}</div></div>
                  </div>
                </div>
              )}

              {/* Dokumentasi penelaahan (SMM 2 ¶28–30). Registri lama hanya
                  menyimpan clearedBy + clearedDate; tiga dari lima butir ¶30
                  tak punya tempat sama sekali. */}
              <div style={{ marginBottom: 16 }}>
                <div className="row jb ac" style={{ marginBottom: 8 }}>
                  <div className="tiny muted upper">Dokumentasi Penelaahan (SMM 2 ¶30)</div>
                  <Badge kind={docAudit.complete ? 'green' : 'amber'}>{docAudit.complete ? 'Lengkap' : docAudit.defects.length + ' butir kurang'}</Badge>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="panel" style={{ padding: '9px 11px', boxShadow: 'none' }}>
                    <div className="tiny muted upper" style={{ marginBottom: 2 }}>Penelaah &amp; pembantu ¶30(a)</div>
                    <div className="tiny" style={{ lineHeight: 1.45 }}>{r.reviewer}
                      {(meta.documentation || {}).assisted
                        ? ' · dibantu ' + ((meta.documentation || {}).assistants || []).join(', ')
                        : ' · tanpa pembantu'}</div>
                  </div>
                  <div className="panel" style={{ padding: '9px 11px', boxShadow: 'none' }}>
                    <div className="tiny muted upper" style={{ marginBottom: 2 }}>Dokumentasi yang ditelaah ¶30(b)</div>
                    <div className="tiny" style={{ lineHeight: 1.45 }}>
                      {(((meta.documentation || {}).documentsReviewed) || []).join(' · ') || <span style={{ color: 'var(--red)' }}>belum diidentifikasi</span>}</div>
                  </div>
                </div>
                {docAudit.defects.length > 0 && (
                  <div className="panel" style={{ padding: '10px 12px', marginTop: 8, boxShadow: 'none', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                    {docAudit.defects.map((d: EqrDocDefect) => (
                      <div key={d} className="tiny" style={{ lineHeight: 1.5 }}>· {EQR_DOC_DEFECT_LABEL[d]}</div>
                    ))}
                  </div>
                )}
              </div>

              {r.cleared ? (
                <div className="panel" style={{ padding: '12px 14px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
                  <div className="row ac gap8" style={{ marginBottom: 8 }}><span style={{ color: 'var(--green)' }}><I.checkCircle size={17} /></span><div><div style={{ fontSize: 12, fontWeight: 700 }}>EQR selesai — gerbang opini terbuka</div><div className="tiny muted">{r.clearedBy} · {r.clearedDate}</div></div></div>
                  <Btn sm variant="primary" onClick={() => nav('opinion')}><I.gavel size={13} /> Lanjut ke Penerbitan Opini</Btn>
                </div>
              ) : (
                <div className="panel" style={{ padding: '12px 14px', background: canClear ? 'var(--blue-050)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
                  <div className="row ac gap8" style={{ marginBottom: canClear ? 10 : 0 }}>
                    <span style={{ color: canClear ? 'var(--blue)' : 'var(--amber)' }}>{canClear ? <I.shield size={16} /> : <I.lock size={16} />}</span>
                    <span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>{canClear ? 'Seluruh syarat terpenuhi — penelaah dapat menutup penelaahan (¶27).' : gate.blockers.map((b: ClearBlocker) => CLEAR_BLOCKER_LABEL[b]).join(' ')}</span>
                  </div>
                  {canClear && <Btn sm variant="primary" onClick={clearGate}><I.check size={13} /> Tutup EQR sebagai {r.reviewer.split(',')[0]}</Btn>}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div></div>
    </>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { EQRWorkflow };
