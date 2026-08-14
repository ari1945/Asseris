/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useInitialTab, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Donut, Panel, Stat, Tabs } from './ui';
import { amsExportPdf } from './export_pdf';
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
import { evaluateSmm } from './canon_smm_evaluation';
import { collectSmmDeficiencies } from './canon_smm_deficiencies';
import { componentMetrics, COMPONENT_STATUS_LABEL, type ComponentStatus } from './canon_smm_component_metrics';
import { objectiveCoverage, coverageByComponent, type ObjectiveLinkedRisk, type ObjectiveWaiver } from './canon_smm_objectives';
import { attestKeyFor, attestChainLinks, attestChainComplete, SOQM_ANNUAL_ROLES } from './canon_firm_attest';
import { useFirmAttest } from './firm_attest';

/** Wadah jaringan ¶48–52 sebagaimana tersimpan di AMS.QM_NETWORK. */
interface GovNetwork {
  inNetwork: boolean; name: string; year: number;
  items: NetworkItem[]; monitoring: NetworkMonitoringResult[]; deficiencies: NetworkDeficiency[];
}

function Governance() {
  const nav = useNav();
  const A: any = AMS;
  const comps = A.QM_COMPONENTS, roles = A.QM_ROLES, providers = A.QM_PROVIDERS, culture = A.QM_CULTURE, ev = A.QM_EVAL;
  const net: GovNetwork = A.QM_NETWORK || { inNetwork: false, name: '', year: 0, items: [], monitoring: [], deficiencies: [] };
  const netA = assessNetwork(net.inNetwork, net.items, net.monitoring, net.deficiencies, net.year);
  /* Deep-link tab (`#/governance?tab=network` & `nav('governance',{tab})`) —
     sebelumnya `useState` polos, sehingga tautan ke panel Ketentuan Jaringan
     selalu mendarat di tab default. */
  const [tab, setTab] = useInitialTab('governance', 'spm');
  const [sel, setSel] = useGov(null);

  /* ---------------------------------------------------------------
     Simpulan ¶54 & atestasi ¶20 — DITURUNKAN, tidak lagi dari seed.

     Bentuk lama membaca `QM_EVAL` mentah: `by`/`approvedBy`/`date`
     adalah string seed, sehingga layar ini menampilkan atestasi
     BERTANDA TANGAN & BERTANGGAL yang tidak pernah terjadi —
     sementara SOQM untuk periode yang sama menyatakan "belum
     ditandatangani" dan mengunci tanda tangan sampai kesimpulan
     tertulis disimpan. Badge "Keyakinan Memadai" bahkan di-hardcode,
     sehingga tak pernah bisa berbunyi lain apa pun keadaannya.

     Kini keduanya bersumber sama persis dengan SOQM: mesin ¶54
     kanonik + rantai atestasi `firmAttest.soqmAnnualEval.<tahun>`.
     Penandatanganan tetap dilakukan DI SOQM (satu tempat menulis);
     layar ini hanya mencerminkan.
     --------------------------------------------------------------- */
  const evalMaster = ev || {};
  const evalPeriod: string = evalMaster.period || 'Tahun Berjalan';
  const attestKey = attestKeyFor('soqmAnnualEval', evalPeriod, (A.CPE_REQ || {}).year);
  const attest = useFirmAttest(attestKey, evalPeriod);
  const attestLinks = attestChainLinks(attest.state, SOQM_ANNUAL_ROLES);
  const attestComplete = attestChainComplete(attestLinks);
  const smmDefs = collectSmmDeficiencies({ risks: A.SOQM_RISKS, network: A.QM_NETWORK });
  const evalResult = evaluateSmm(smmDefs);
  const concColor = evalResult.conclusion === 'reasonable' ? 'var(--green)'
    : evalResult.conclusion === 'reasonable-except-for' ? 'var(--amber)' : 'var(--red)';

  /* Metrik komponen DITURUNKAN (V-3). `score`/`risks`/`defs`/`trend` pada
     `QM_COMPONENTS` adalah integer seed yang tak tertaut register mana pun:
     kartu C1 berbunyi "3 risiko · 92%" di atas register yang tak punya satu
     pun risiko Tata Kelola. Skor tidak diganti angka lain — SMM 1 tidak
     mengenal skor komponen, dan merekayasa formula adalah ambang karangan. */
  const objCov = objectiveCoverage(
    (A.SOQM_RISKS || []) as ObjectiveLinkedRisk[],
    (A.SMM_OBJECTIVE_WAIVERS || []) as ObjectiveWaiver[],
  );
  const metrics = componentMetrics(comps, A.SOQM_RISKS, coverageByComponent(objCov), evaluateSmm(smmDefs), smmDefs);
  const metricById = new Map(metrics.map((m) => [m.id, m]));
  const statusColor = (s: ComponentStatus) => s === 'deficient' ? 'var(--red)' : s === 'attention' ? 'var(--amber)' : 'var(--green)';

  const effective = metrics.filter((m) => m.status === 'effective').length;
  /* Defisiensi terbuka menurut A191 (dua syarat), bukan penjumlahan field seed
     `QM_COMPONENTS.defs` — angka itu tak pernah tertaut register mana pun. */
  const openDefs = evalResult.openPervasive.length + evalResult.openSignificant.length + evalResult.openMinor.length;
  const selComp = sel ? comps.find((c: any) => c.id === sel) : null;

  const tabs = [
    { id: 'spm', label: 'Komponen SMM', count: comps.length },
    { id: 'roles', label: 'Akuntabilitas & Peran', count: roles.length },
    { id: 'resources', label: 'Sumber Daya & Penyedia', count: providers.length },
    { id: 'network', label: 'Ketentuan Jaringan', count: net.items.length },
    { id: 'culture', label: 'Budaya Mutu & Evaluasi' },
  ];

  /* K-06 lanjutan — wire tombol "Evaluasi SMM Tahunan" (dulu mati): ekspor PDF tersegel
     ringkasan evaluasi sistem manajemen mutu (SMM 1 ¶28–33/¶54). */
  const [exporting, setExporting] = useGov(false);
  const onExportEval = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await amsExportPdf({
        kind: 'smm-eval', scope: 'firm', scopeId: undefined,
        fileName: 'Evaluasi SMM Tahunan.pdf',
        firm: 'KAP Wijaya Hartono & Rekan',
        title: 'Evaluasi Sistem Manajemen Mutu — Tahunan',
        meta: [`SMM 1 · periode ${evalPeriod}`,
          `Cakupan tujuan mandatori ${objCov.addressedPct}% (${objCov.complete ? 'lengkap' : 'ada celah'}) · ${effective}/${comps.length} komponen efektif`],
        blocks: [
          { type: 'heading', text: '1. Komponen SMM' },
          { type: 'table', head: ['Komponen', 'Status'],
            body: comps.map((c: { id?: string; name?: string; status?: string; label?: string }) => [c.name || c.label || c.id || '', c.status || '—']) },
          { type: 'heading', text: '2. Simpulan' },
          { type: 'para', text: `Rekomendasi kesimpulan: ${evalResult.label} (${evalResult.paragraph}). Defisiensi terbuka: ${evalResult.openPervasive.length} pervasif, ${evalResult.openSignificant.length} signifikan, ${evalResult.openMinor.length} minor.` },
        ],
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <SubBar moduleId="governance" right={<div className="row gap8 ac"><Badge kind="blue">SMM 1 · SMM</Badge><Btn sm onClick={onExportEval} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Evaluasi SMM Tahunan'}</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          {/* "Skor Efektivitas SMM 87%" adalah rata-rata field seed `score` yang
              tak tertaut register mana pun. Digantikan besaran kanonik yang
              memang bisa gagal: cakupan 27 tujuan mandatori ¶28–33. */}
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={objCov.addressedPct + '%'} label="Cakupan Tujuan Mandatori ¶28–33" accent={objCov.complete ? 'var(--green)' : objCov.addressedPct >= 50 ? 'var(--amber)' : 'var(--red)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={effective + ' / ' + comps.length} label="Komponen Efektif" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={openDefs} label="Defisiensi Terbuka" accent={openDefs ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={attestComplete && attest.state && attest.state.engineLabel ? attest.state.engineLabel : 'Belum dievaluasi'} label={'Simpulan Evaluasi ¶54 · ' + String(evalPeriod.slice(-4) || '')} accent={attestComplete ? concColor : 'var(--amber)'} /></div></Panel>
        </div>

        {/* Annual evaluation conclusion — centerpiece of SMM 1 */}
        <div className="panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(255,255,255,.14)', display: 'grid', placeItems: 'center', flex: '0 0 42px' }}><I.shield size={22} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Simpulan Evaluasi SMM Tahunan — Periode {evalPeriod}</div>
              {/* Nama penandatangan HANYA dari rantai atestasi. Sebelumnya
                  `ev.by`/`ev.approvedBy` seed ditampilkan sebagai fakta. */}
              <div className="tiny" style={{ color: '#bcd6e4' }}>
                {attestLinks.map((l, i) => (
                  <span key={l.roleId}>
                    {i > 0 && ' · '}
                    {i === 0 ? 'Disusun ' : 'Disetujui '}
                    <b>{l.signer && l.status !== 'voided' ? l.signer.by : 'belum ditandatangani'}</b>
                    {l.status === 'voided' && ' (gugur — kesimpulan berubah)'}
                  </span>
                ))}
              </div>
            </div>
            {attestComplete
              ? <Badge kind="green"><I.checkCircle size={12} /> Atestasi Lengkap</Badge>
              : <Badge kind="amber"><I.lock size={12} /> Menunggu Atestasi</Badge>}
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 0 }}>
            <div style={{ padding: '14px 18px', borderRight: '1px solid var(--line-soft)' }}>
              <div className="row jb ac" style={{ marginBottom: 5 }}>
                <span className="tiny muted upper">Pernyataan Simpulan (SMM 1 ¶54)</span>
                <Badge kind={evalResult.conclusion === 'reasonable' ? 'green' : evalResult.conclusion === 'reasonable-except-for' ? 'amber' : 'red'}>{evalResult.paragraph}</Badge>
              </div>
              {attest.state && (attest.state.conclusion || '').trim()
                ? <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--ink-2)' }}>{attest.state.conclusion}</p>
                : (
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--ink-3)' }}>
                    Belum ada kesimpulan tertulis untuk periode ini. Rekomendasi mesin: <b>{evalResult.label}</b> ({evalResult.paragraph}).
                    Kesimpulan ¶53 disusun &amp; ditandatangani di modul{' '}
                    <button type="button" className="lin-cta" onClick={() => nav && nav('soqm', { from: 'governance', tab: 'evaluation' })}>SOQM Operasional</button>.
                  </p>
                )}
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
                {comps.map((c: any) => {
                  const m = metricById.get(c.id);
                  const st = m ? m.status : 'effective';
                  return (
                  <button type="button" key={c.id} onClick={() => setSel(c.id)} aria-current={c.id === sel ? 'true' : undefined} className="panel" style={{ textAlign: 'left', font: 'inherit', color: 'inherit', width: '100%', padding: '12px 14px', cursor: 'pointer', boxShadow: 'none', border: 0, borderLeft: '3px solid ' + statusColor(st) }}>
                    <div className="row jb ac" style={{ marginBottom: 4 }}>
                      <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</span><span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span></div>
                      <Badge kind={(GOV_STAT as any)[COMPONENT_STATUS_LABEL[st]]}>{COMPONENT_STATUS_LABEL[st]}</Badge>
                    </div>
                    <div className="tiny muted" style={{ lineHeight: 1.45, marginBottom: 9, minHeight: 30 }}>{c.desc}</div>
                    <div className="row jb ac">
                      <div className="row ac gap10">
                        <span className="tiny muted">Tujuan <b style={{ color: 'var(--ink)' }}>{m ? m.objectivesTotal : 0}</b></span>
                        <span className="tiny muted">Risiko <b style={{ color: 'var(--ink)' }}>{m ? m.riskCount : 0}</b></span>
                        <span className="tiny muted">Defisiensi <b style={{ color: m && m.openDeficiencies.length ? 'var(--amber)' : 'var(--ink)' }}>{m ? m.openDeficiencies.length : 0}</b></span>
                      </div>
                      {/* Skor & sparkline seed dicabut. Yang tersisa adalah cakupan
                          tujuan mandatori — besaran kanonik yang memang bisa gagal. */}
                      <span className="mono tiny" style={{ fontWeight: 700, color: statusColor(st) }}>
                        {m && m.isProcess ? 'proses' : (m ? m.objectivesAddressed + '/' + m.objectivesTotal : '—')}
                      </span>
                    </div>
                  </button>
                  );
                })}
              </div>
              <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>Pendekatan SMM 1: untuk tiap komponen, firma menetapkan <b>tujuan mutu</b>, mengidentifikasi &amp; menilai <b>risiko mutu</b>, lalu merancang &amp; menerapkan <b>respons</b>. Angka kanan tiap kartu = <b>cakupan tujuan mandatori</b> ¶28–33; <b>bukan</b> skor efektivitas — SMM 1 tidak mengenal skor komponen, dan skor lama tidak tertaut register mana pun. Klik komponen untuk rincian kepemilikan &amp; metrik.</div>
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

      {selComp && <GovCompDetail c={selComp} metric={metricById.get(selComp.id)} onClose={() => setSel(null)} />}
    </>
  );
}

function GovCompDetail({ c, metric, onClose }: any) {
  const A: any = AMS;
  const role = A.QM_ROLES.find((r: any) => r.person.includes(c.owner)) || null;
  /* Donut skor & sparkline tren dicabut: `score` tak tertaut register apa pun
     dan `trend` adalah riwayat skor yang tak pernah ada. Yang menggantikannya
     adalah cakupan tujuan mandatori ¶28–33 — terhitung, dan bisa gagal. */
  const m = metric || null;
  const st: ComponentStatus = m ? m.status : 'effective';
  const stColor = st === 'deficient' ? 'var(--red)' : st === 'attention' ? 'var(--amber)' : 'var(--green)';
  const covPct = m && !m.isProcess && m.objectivesTotal
    ? Math.round(m.objectivesAddressed / m.objectivesTotal * 100) : null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="panel" style={{ width: 440, maxWidth: '95vw', height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}><div className="row ac gap8"><span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{c.id}</span><Badge kind={(GOV_STAT as any)[COMPONENT_STATUS_LABEL[st]]}>{COMPONENT_STATUS_LABEL[st]}</Badge></div><div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{c.name}</div><div className="tiny" style={{ color: '#bcd6e4' }}>SMM 1 {c.ref}</div></div>
          <button className="top-btn" onClick={onClose} aria-label="Tutup rincian komponen" title="Tutup"><I.x size={18} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'grid', gap: 14, alignContent: 'start' }}>
          <div className="row ac gap10">
            {covPct !== null
              ? <Donut size={76} thickness={11} segments={[{ value: covPct, color: stColor }, { value: 100 - covPct, color: 'var(--surface-3)' }]} center={<div><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: stColor }}>{covPct}%</div></div>} />
              : <div className="panel" style={{ width: 76, height: 76, display: 'grid', placeItems: 'center', boxShadow: 'none' }}><span className="tiny muted" style={{ textAlign: 'center', lineHeight: 1.3 }}>proses<br />¶23–27<br />¶35–47</span></div>}
            <div style={{ flex: 1 }}><div className="tiny muted upper" style={{ marginBottom: 4 }}>Cakupan Tujuan Mandatori</div><div style={{ fontSize: 12, lineHeight: 1.5 }}>{c.desc}</div></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <OKv label="Tujuan Mutu ¶28–33" v={m ? m.objectivesTotal : 0} />
            <OKv label="Risiko Mutu" v={m ? m.riskCount : 0} />
            <OKv label="Defisiensi Terbuka" v={m ? m.openDeficiencies.length : 0} accent={m && m.openDeficiencies.length ? 'var(--amber)' : 'var(--green)'} />
          </div>
          {m && !m.isProcess && m.objectivesAddressed < m.objectivesTotal && (
            <div className="panel" style={{ padding: '10px 12px', boxShadow: 'none', borderLeft: '3px solid var(--amber)' }}>
              <div className="tiny" style={{ lineHeight: 1.5 }}>
                <b>{m.objectivesTotal - m.objectivesAddressed}</b> tujuan mandatori komponen ini belum punya risiko &amp; respons,
                dan belum dikesampingkan lewat waiver ¶17 yang sah — <b>defisiensi rancangan</b> (¶25–26).
              </div>
            </div>
          )}
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
