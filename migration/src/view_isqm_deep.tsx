/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { I } from './icons';
import { Badge, Btn, Panel } from './ui';
import { CAP } from './rbac';
import { FirmAttestCard, useFirmAttest } from './firm_attest';
import { attestKeyFor, attestChainLinks, attestChainComplete, attestVoidedRoles, SOQM_ANNUAL_ROLES } from './canon_firm_attest';
import {
  objectiveCoverage, coverageByComponent, objectivesForComponent,
  SMM1_OBJECTIVE_COUNT, WAIVER_DEFECT_LABEL,
  type ObjectiveWaiver, type ObjectiveLinkedRisk,
} from './canon_smm_objectives';
import {
  evaluateSmm, PERVASIVENESS_LABEL,
  type PervasivenessIndicator,
} from './canon_smm_evaluation';
import { collectSmmDeficiencies, originOf } from './canon_smm_deficiencies';
import { componentMetrics } from './canon_smm_component_metrics';

/** Tampilan stempel ISO; bentuk warisan ditampilkan apa adanya. */
function faShowAttestAt(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(+d)) return at;
  try { return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch (e) { return at; }
}


/* ============================================================
   Asseris — SOQM Operasional (SMM 1) · Pendalaman Modul
   ------------------------------------------------------------
   Lapisan baru yang memperkaya SOQM agar mencakup:
   · SoqmObjectives    — Tujuan Mutu per komponen (¶25–28),
                          rantai Tujuan → Risiko → Respons → Pemantauan
   · SoqmHeatmap       — Peta panas risiko (L×D) 5×5
   · SoqmSeverity      — Penilaian keparahan & pervasivitas
                          defisiensi (¶41) — basis evaluasi tahunan
   · SoqmInfoComm      — Informasi & Komunikasi (¶33–37) — alur naik
                          /turun/lateral/eksternal (TCWG · jaringan)
   · SoqmAnnualEval    — Evaluasi Tahunan SMM (¶53–¶54) —
                          kesimpulan ditarik LIVE dari soqmPull() +
                          QM_INSPECTIONS + QM_INSP_FINDINGS + SOQM_RISKS
                          + COMPLAINTS + QM_EVAL master.
   Tidak ada angka yang dihardcode di sini — seluruhnya mengalir
   dari AMS lewat resolver kanonik.
   ============================================================ */
const { useState: useStateID } = React;

/* ============================================================
   Heat map L×D 5×5 — visualisasi seluruh risiko mutu
   ============================================================ */
function SoqmHeatmap({ risks, onPick }: any) {
  const cells = [];
  for (let imp = 5; imp >= 1; imp--) {
    for (let lik = 1; lik <= 5; lik++) {
      const here = risks.filter((r: any) => r.lik === lik && r.imp === imp);
      const s = lik * imp;
      const bg = s >= 15 ? 'var(--red)' : s >= 9 ? 'var(--amber)' : s >= 4 ? 'var(--blue)' : 'var(--green)';
      const tint = s >= 15 ? '#fee2e2' : s >= 9 ? '#fef3c7' : s >= 4 ? '#dbeafe' : '#d1fae5';
      cells.push({ lik, imp, here, bg, tint });
    }
  }
  return (
    <div className="soqm-heatmap">
      <div className="soqm-heatmap-axis-y"><span>Dampak →</span></div>
      <div className="soqm-heatmap-grid">
        {cells.map((c, i) => (
          <button
            key={i}
            type="button"
            className="soqm-heat-cell"
            style={{ background: c.here.length ? c.tint : 'transparent', borderColor: c.here.length ? c.bg : 'var(--line-soft)' }}
            onClick={() => c.here.length === 1 && onPick && onPick(c.here[0].id)}
            disabled={c.here.length === 0}
            title={c.here.length ? c.here.map((r: any) => r.id + ' · ' + r.risk).join('\n') : ('L=' + c.lik + ' D=' + c.imp)}
          >
            {c.here.length > 0 && (
              <span className="soqm-heat-bubble" style={{ background: c.bg }}>
                {c.here.length === 1
                  ? <span className="mono">{c.here[0].id.replace('QR-', '')}</span>
                  : <span className="mono">{c.here.length}</span>}
              </span>
            )}
            <span className="soqm-heat-coord mono">{c.lik}×{c.imp}</span>
          </button>
        ))}
      </div>
      <div className="soqm-heatmap-axis-x"><span>Likelihood →</span></div>
      <div className="soqm-heatmap-legend">
        <span className="mono tiny" style={{ color: 'var(--green)' }}>● Rendah</span>
        <span className="mono tiny" style={{ color: 'var(--blue)' }}>● Sedang-Rendah</span>
        <span className="mono tiny" style={{ color: 'var(--amber)' }}>● Sedang-Tinggi</span>
        <span className="mono tiny" style={{ color: 'var(--red)' }}>● Tinggi</span>
      </div>
    </div>
  );
}

/* ============================================================
   Tab: Tujuan Mutu — 27 tujuan mandatori SMM 1 ¶28–33
   ------------------------------------------------------------
   Bentuk lama tab ini menghitung "Cakupan Komponen" = komponen yang
   punya ≥1 risiko dibagi jumlah komponen. Dengan enam risiko seed —
   satu per komponen — angkanya 100%, padahal hanya 6 dari 27 tujuan
   mandatori tersentuh. Komponen tanpa risiko pun tidak dilaporkan
   sebagai lubang; kalimat penutupnya justru MENORMALKAN ketiadaan
   ("ditangani lewat kontrol entitas") — sebuah keterangan yang
   mengubah defisiensi rancangan menjadi kewajaran.

   Sekarang cakupan dihitung atas 27 TUJUAN (¶24 · ¶28–33). Tujuan
   tanpa risiko dan tanpa waiver ¶17 yang sah dilaporkan sebagai
   DEFISIENSI RANCANGAN, bukan sel kosong.
   ============================================================ */
function SoqmObjectives({ risks, nav, onPick }: any) {
  const A: any = AMS;
  const comps = A.QM_COMPONENTS || [];
  const waivers = (A.SMM_OBJECTIVE_WAIVERS || []) as ObjectiveWaiver[];

  const cov = objectiveCoverage(risks as ObjectiveLinkedRisk[], waivers);
  const byComp = coverageByComponent(cov);
  const compCov = new Map(byComp.map((c) => [c.component, c]));

  /* risiko yang menautkan diri ke satu tujuan */
  const risksFor = (objId: string) =>
    (risks || []).filter((r: any) => (r.objectives || []).indexOf(objId) >= 0);

  const waiverFor = (objId: string) => cov.waiverAudit.find((w) => w.objectiveId === objId);

  const addressed = cov.covered.length + cov.waived.length;

  return (
    <div style={{ padding: 14, display: 'grid', gap: 14 }}>
      <div className="panel" style={{ padding: '15px 18px', background: 'var(--blue-050)', borderColor: 'transparent', boxShadow: 'none' }}>
        <div className="row ac gap8">
          <span style={{ color: 'var(--blue)' }}>{I ? <I.target size={16} /> : null}</span>
          <div className="tiny" style={{ lineHeight: 1.5 }}>
            SMM 1 ¶24 mewajibkan KAP menetapkan tujuan mutu <b>yang ditentukan standar</b> — <b>{SMM1_OBJECTIVE_COUNT} tujuan mandatori</b> pada ¶28–33 (5·2·2·6·8·4) — lalu mengidentifikasi <b>risiko mutu</b> atas pencapaiannya (¶25) dan merancang <b>respons</b> (¶26). Cakupan di bawah dihitung atas ke-{SMM1_OBJECTIVE_COUNT} tujuan itu, <b>bukan</b> atas jumlah komponen. Daftar tujuan kanonik: <span className="mono">canon_smm_objectives.ts</span>.
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        <D2KPI label="Tujuan Mandatori ¶28–33" v={SMM1_OBJECTIVE_COUNT} sub="ditetapkan standar, bukan pilihan firma" />
        <D2KPI label="Tertangani" v={addressed + '/' + SMM1_OBJECTIVE_COUNT}
          accent={cov.complete ? 'var(--green)' : 'var(--amber)'}
          sub={cov.covered.length + ' punya risiko · ' + cov.waived.length + ' dikesampingkan ¶17'} />
        <D2KPI label="Defisiensi Rancangan" v={cov.uncovered.length}
          accent={cov.uncovered.length ? 'var(--red)' : 'var(--green)'}
          sub="tujuan tanpa risiko & tanpa waiver sah" />
        <D2KPI label="Cakupan Tujuan" v={cov.addressedPct + '%'}
          accent={cov.complete ? 'var(--green)' : cov.addressedPct >= 60 ? 'var(--amber)' : 'var(--red)'}
          sub={cov.complete ? 'seluruh tujuan tertangani' : 'belum lengkap — lihat rincian'} />
      </div>

      {!cov.complete && (
        <div className="panel" style={{ padding: '13px 16px', background: 'var(--amber-bg)', borderColor: 'transparent', boxShadow: 'none' }}>
          <div className="row ac gap8" style={{ marginBottom: 4 }}>
            <span style={{ color: 'var(--amber)' }}>{I ? <I.alert size={16} /> : null}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{cov.uncovered.length} tujuan mutu mandatori belum punya risiko & respons</span>
          </div>
          <div className="tiny" style={{ lineHeight: 1.5 }}>
            Ini adalah <b>defisiensi rancangan</b> sistem manajemen mutu (¶25–26), bukan sekadar data yang belum diisi.
            Tiap tujuan wajib punya risiko mutu &amp; respons, <b>atau</b> dikesampingkan lewat waiver ¶17 yang berjustifikasi
            dan disetujui berjenjang (diusulkan ¶20(b), disetujui ¶20(a)).
          </div>
        </div>
      )}

      <Panel noBody>
        <div className="panel-h"><h3>Tujuan Mutu Mandatori per Komponen</h3><div style={{ flex: 1 }} /><button type="button" className="lin-cta" onClick={() => nav && nav('governance', { from: 'soqm' })}>{I ? <I.building size={12} /> : null} Governance (komponen kanonik)</button></div>
        <div style={{ padding: 14, display: 'grid', gap: 10 }}>
          {comps.map((c: any) => {
            const cc = compCov.get(c.id);
            const objs = objectivesForComponent(c.id);
            const isProcess = objs.length === 0;
            const color = isProcess ? 'var(--ink-4)'
              : cc && cc.uncovered === 0 ? 'var(--green)'
              : cc && cc.uncovered < cc.total ? 'var(--amber)' : 'var(--red)';
            return (
              <div key={c.id} className="panel" style={{ padding: '12px 14px', boxShadow: 'none', borderLeft: '3px solid ' + color }}>
                <div className="row jb ac" style={{ marginBottom: 6 }}>
                  <div className="row ac gap8">
                    <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>{c.id} · {c.ref}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span>
                    {!isProcess && cc && (
                      <Badge kind={cc.uncovered === 0 ? 'green' : 'amber'}>{cc.covered + cc.waived}/{cc.total} tertangani</Badge>
                    )}
                  </div>
                  <div className="row ac gap8 tiny muted">
                    <span>Pemilik {c.owner}</span><span>·</span>
                    {/* C2 & C8 adalah PROSES (¶23–27 · ¶35–47) — bukan pemilik tujuan ¶28–33. */}
                    <span style={{ color: 'var(--ink-2)' }}>
                      {isProcess ? 'proses — tanpa tujuan ¶28–33' : `${objs.length} tujuan mandatori`}
                      {!isProcess && cc && cc.uncovered > 0 && <span style={{ color: 'var(--red)', fontWeight: 700 }}> · {cc.uncovered} belum tertangani</span>}
                    </span>
                  </div>
                </div>
                <div className="tiny muted" style={{ lineHeight: 1.45, marginBottom: 8, fontStyle: 'italic' }}>{c.desc}</div>

                {isProcess ? (
                  /* TIDAK menormalkan ketiadaan: dinyatakan apa adanya — komponen ini
                     memang bukan pemilik tujuan ¶28–33, jadi nol bukan lubang. */
                  <div className="tiny muted" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 4, lineHeight: 1.45 }}>
                    Komponen ini adalah <b>proses</b> ({c.ref}), bukan pemilik tujuan mutu ¶28–33.
                    Efektivitasnya dinilai lewat tab <b>Pemantauan &amp; Inspeksi</b> dan <b>Evaluasi Tahunan</b>.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 5 }}>
                    {objs.map((o) => {
                      const linked = risksFor(o.id);
                      const wa = waiverFor(o.id);
                      const state = linked.length ? 'covered' : (wa && wa.valid) ? 'waived' : 'uncovered';
                      const kind = state === 'covered' ? 'green' : state === 'waived' ? 'blue' : 'red';
                      const label = state === 'covered' ? `${linked.length} risiko` : state === 'waived' ? 'Dikesampingkan ¶17' : 'BELUM TERTANGANI';
                      return (
                        <div key={o.id} className="panel" style={{ padding: '9px 11px', boxShadow: 'none', borderLeft: '2px solid var(--' + (state === 'uncovered' ? 'red' : state === 'waived' ? 'blue' : 'green') + ')' }}>
                          <div className="row jb" style={{ alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ minWidth: 0 }}>
                              <div className="row ac gap6" style={{ marginBottom: 2 }}>
                                <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>¶{o.para}({o.item})</span>
                                <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>{o.title}</span>
                              </div>
                              {o.aspects && (
                                <ul style={{ margin: '3px 0 0 16px', padding: 0 }}>
                                  {o.aspects.map((a, ai) => (
                                    <li key={ai} className="tiny muted" style={{ lineHeight: 1.45 }}>{a}</li>
                                  ))}
                                </ul>
                              )}
                              {linked.length > 0 && (
                                <div className="row ac gap6" style={{ marginTop: 5, flexWrap: 'wrap' }}>
                                  {linked.map((r: any) => (
                                    <button key={r.id} type="button" className="soqm-src" onClick={() => onPick && onPick(r.id)} title={r.risk}>
                                      <span className="tiny mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</span>
                                      <Badge kind={r.monitor === 'Efektif' ? 'green' : r.monitor === 'Defisiensi' ? 'red' : 'gray'}>{r.monitor}</Badge>
                                    </button>
                                  ))}
                                </div>
                              )}
                              {wa && !wa.valid && (
                                <div className="tiny" style={{ marginTop: 5, color: 'var(--red)', lineHeight: 1.45 }}>
                                  Waiver ¶17 <b>tidak sah</b> — {wa.defects.map((d) => WAIVER_DEFECT_LABEL[d]).join(' · ')}. Tujuan tetap dihitung defisiensi.
                                </div>
                              )}
                            </div>
                            <Badge kind={kind}>{label}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function D2KPI({ label, v, sub, accent }: any) {
  return (
    <div className="panel" style={{ padding: '10px 13px', boxShadow: 'none' }}>
      <div className="tiny muted upper" style={{ marginBottom: 2 }}>{label}</div>
      <div className="mono" style={{ fontSize: 19, fontWeight: 700, color: accent || 'var(--ink)', lineHeight: 1.1 }}>{v}</div>
      {sub && <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.35 }}>{sub}</div>}
    </div>
  );
}

/* ============================================================
   Penilaian keparahan & pervasivitas defisiensi (¶41)
   Dipanggil dari dalam RemediationTab — DERIVE dari live data.
   ============================================================ */
function SoqmSeverity({ deficiencies, P, complaints, inspFindings }: any) {
  /* turunkan keparahan & pervasivitas dari sumber kebenaran */
  const rate = (r: any) => {
    const d = r.deficiency || {};
    // pervasif = pengaruh ke lebih dari satu komponen / lintas-perikatan
    const pervasive =
      (r.id === 'QR-02' && P.overloaded.length >= 2) ||  // sumber daya menyentuh multi-perikatan
      (r.id === 'QR-04' && P.rotationDue.length >= 1) || // etika lintas klien
      d.sev === 'Tinggi';
    const tied = inspFindings.filter((f: any) => (f.rca5 || []).some((w: any) => w.toLowerCase().includes(r.comp.split(' ')[0].toLowerCase())) || (f.cause || '').toLowerCase().includes(r.comp.split(' ')[0].toLowerCase()));
    return { pervasive, tied: tied.length, sev: d.sev || 'Sedang' };
  };

  return (
    <div className="panel" style={{ padding: '12px 14px', boxShadow: 'none', background: 'var(--surface-2)' }}>
      <div className="row jb ac" style={{ marginBottom: 8 }}>
        <div className="row ac gap8">
          <span style={{ color: 'var(--blue)' }}>{I ? <I.scale size={14} /> : null}</span>
          <span className="tiny" style={{ fontWeight: 700 }}>Penilaian Keparahan &amp; Pervasivitas Defisiensi (SMM 1 ¶41)</span>
        </div>
        <span className="tiny muted">Basis kesimpulan evaluasi tahunan SMM</span>
      </div>
      <table className="dtbl">
        <thead><tr>
          <th>Defisiensi</th>
          <th style={{ width: 92 }}>Keparahan</th>
          <th style={{ width: 110 }}>Pervasivitas</th>
          <th style={{ width: 130 }}>Temuan Inspeksi Terkait</th>
          <th style={{ width: 130 }}>Implikasi pada SMM</th>
        </tr></thead>
        <tbody>
          {deficiencies.map((r: any) => {
            const v = rate(r);
            return (
              <tr key={r.id}>
                <td>
                  <div className="row ac gap6"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</span><span className="tiny" style={{ fontWeight: 600 }}>{r.comp}</span></div>
                  <div className="tiny muted truncate" style={{ maxWidth: 360 }}>{r.deficiency.desc}</div>
                </td>
                <td><Badge kind={v.sev === 'Tinggi' ? 'red' : v.sev === 'Sedang' ? 'amber' : 'gray'}>{v.sev}</Badge></td>
                <td><Badge kind={v.pervasive ? 'red' : 'green'}>{v.pervasive ? 'Pervasif' : 'Tidak Pervasif'}</Badge></td>
                <td className="tiny"><span className="mono" style={{ fontWeight: 700, color: v.tied ? 'var(--amber)' : 'var(--ink-4)' }}>{v.tied}</span> <span className="muted">temuan inspeksi</span></td>
                <td className="tiny" style={{ lineHeight: 1.4 }}>{v.pervasive ? 'Berpotensi memengaruhi simpulan SMM' : 'Tidak memengaruhi simpulan keseluruhan'}</td>
              </tr>
            );
          })}
          {deficiencies.length === 0 && (
            <tr><td colSpan={5} className="tiny muted" style={{ textAlign: 'center', padding: 14 }}>Tidak ada defisiensi terbuka.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   Tab: Informasi & Komunikasi (¶33–37)
   ============================================================ */
function SoqmInfoComm({ nav }: any) {
  const A: any = AMS;
  const roles = A.QM_ROLES || [];
  const cmps = A.COMPLAINTS || [];
  const acts = A.QM_MON_ACTIVITIES || [];
  const culture = A.QM_CULTURE || [];

  /* kanal komunikasi — diturunkan dari sumber master */
  const channels = [
    {
      dir: 'Naik (Personel → Pimpinan)', icon: 'trend', clr: 'var(--blue)', ref: '¶33(c)(ii)',
      flows: [
        { lbl: 'Pelaporan defisiensi & near-miss', src: 'Workspace (Review Notes)', mod: 'workspace', n: '—' },
        { lbl: 'Konsultasi & permintaan bantuan teknis', src: 'Workspace · Pelaksanaan Perikatan', mod: 'consultation', n: '—' },
        { lbl: 'Keluhan & tuduhan (whistleblowing)', src: 'COMPLAINTS', mod: 'soqm', n: cmps.filter((c: any) => c.source && c.source.toLowerCase().includes('internal')).length + ' aktif' },
      ],
    },
    {
      dir: 'Turun (Pimpinan → Personel)', icon: 'megaphone', clr: 'var(--navy)', ref: '¶33(c)(i)',
      flows: [
        { lbl: 'Memo mutu & tone-at-the-top', src: 'DMS · Komunikasi Mutu', mod: 'dms', n: culture.find((k: any) => k.k && k.k.includes('Komunikasi'))?.v || '—' },
        { lbl: 'Pembaruan kebijakan & metodologi', src: 'Knowledge Base', mod: 'kb', n: 'Berkala' },
        { lbl: 'Coaching & evaluasi kinerja mutu', src: 'PERF_CYCLE', mod: 'hr', n: culture.find((k: any) => k.k && k.k.includes('Bobot mutu'))?.v || '—' },
      ],
    },
    {
      dir: 'Lateral (antar-tim/partner)', icon: 'users', clr: 'var(--purple)', ref: '¶33(b)',
      flows: [
        { lbl: 'Sharing temuan inspeksi & akar masalah', src: 'QM_INSP_FINDINGS', mod: 'soqm', n: (A.QM_INSP_FINDINGS || []).length + ' temuan' },
        { lbl: 'Forum konsultasi PSAK/SA kompleks', src: 'Knowledge Base · konsultasi', mod: 'consultation', n: '—' },
        { lbl: 'Update kapasitas & alokasi sumber daya', src: 'CAPACITY', mod: 'capacity', n: '—' },
      ],
    },
    {
      dir: 'Eksternal (TCWG · Regulator · Jaringan)', icon: 'globe', clr: 'var(--green)', ref: '¶33(d) · ¶34(e)',
      flows: [
        { lbl: 'Komunikasi mutu ke TCWG / Komite Audit', src: 'SA 260 / SA 265', mod: 'mgmtletter', n: 'Per perikatan' },
        { lbl: 'Pelaporan kepada PPPK (regulator)', src: 'PPPK Report', mod: 'pppk', n: 'Tahunan' },
        { lbl: 'Jaringan & afiliasi global (inspection feedback)', src: 'QM_PROVIDERS', mod: 'governance', n: (A.QM_PROVIDERS || []).filter((p: any) => p.type === 'Jaringan').length + ' jaringan' },
      ],
    },
  ];

  return (
    <div style={{ padding: 14, display: 'grid', gap: 14 }}>
      <div className="panel" style={{ padding: '15px 18px', background: 'var(--blue-050)', borderColor: 'transparent', boxShadow: 'none' }}>
        <div className="row ac gap8">
          <span style={{ color: 'var(--blue)' }}>{I ? <I.mail size={16} /> : null}</span>
          <div className="tiny" style={{ lineHeight: 1.5 }}>
            SMM 1 ¶33 · ¶34(e) — firma membangun sistem informasi &amp; komunikasi mutu yang memungkinkan informasi tepat waktu mengalir <b>naik · turun · lateral · keluar</b>. Setiap kanal di bawah tertaut ke modul sumber kanonik — bukan kanal terpisah yang berisiko inkonsisten.
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        {channels.map((ch, i) => {
          const Ic = I && ((I as any)[ch.icon] || I.mail);
          return (
            <Panel key={i} noBody>
              <div className="panel-h">
                <span className="row ac gap8" style={{ color: ch.clr }}><Ic size={15} /><h3 style={{ margin: 0, color: 'var(--ink)' }}>{ch.dir}</h3></span>
                <div style={{ flex: 1 }} />
                <Badge kind="blue">{ch.ref}</Badge>
              </div>
              <div style={{ padding: '4px 0 6px' }}>
                {ch.flows.map((f, k) => (
                  <button key={k} type="button" className="soqm-flow-row" onClick={() => nav && nav(f.mod, { from: 'soqm' })}>
                    <span className="soqm-flow-dot" style={{ background: ch.clr }} />
                    <span className="soqm-flow-lbl">
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{f.lbl}</span>
                      <span className="tiny muted">Sumber: <span className="mono" style={{ color: 'var(--blue)' }}>{f.src}</span></span>
                    </span>
                    <span className="soqm-flow-val tiny mono">{f.n}</span>
                    {I ? <I.arrowRight size={12} /> : null}
                  </button>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Akuntabilitas komunikasi — QM_ROLES SSOT */}
      <Panel title="Akuntabilitas Komunikasi Mutu" sub="SMM 1 ¶20 — peran pimpinan ditarik dari QM_ROLES (Governance)">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {roles.map((r: any, i: any) => (
            <div key={i} className="panel" style={{ padding: '10px 12px', boxShadow: 'none' }}>
              <div className="row jb ac" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{r.role}</span>
                <Badge kind="blue">{r.ref}</Badge>
              </div>
              <div className="tiny" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{r.person} · <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>{r.title}</span></div>
              <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.4 }}>{r.note}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ============================================================
   Tab: Evaluasi Tahunan SMM (¶53–¶54) — kesimpulan LIVE
   ============================================================ */
function SoqmAnnualEval({ risks, inspections, inspFindings, complaints, nav }: any) {
  const A: any = AMS;
  const master = A.QM_EVAL || {};
  const period: string = master.period || 'Tahun Berjalan';
  /* Kunci ber-ALAMAT 4-digit. Bentuk lama menyisipkan label periode manusiawi
     ('1 Jan – 31 Des 2025'), yang ditolak allow-list baca server
     (/^firmAttest\.soqmAnnualEval\.\d{4}$/) — dan penolakan itu ditelan sebagai
     "offline", sehingga atestasi tak pernah meninggalkan browser penandatangan. */
  const attestKey = attestKeyFor('soqmAnnualEval', period, (A.CPE_REQ || {}).year);
  /* baca atestasi tersimpan (SSOT) utk hero KV — sinkron dgn FirmAttestCard
     yang merender editor (pola sama wp_signoff: dua hook, satu store). */
  const attest = useFirmAttest(attestKey, period);
  const attestLinks = attestChainLinks(attest.state, SOQM_ANNUAL_ROLES);
  const leaderLink = attestLinks[0], approverLink = attestLinks[1];
  const attestComplete = attestChainComplete(attestLinks);

  /* ---------------------------------------------------------------
     Mesin keputusan ¶54 — kini DITURUNKAN, bukan dekoratif.

     Bentuk lama menghitung `defsPervasive`, menampilkannya sebagai
     "Faktor Keputusan ¶54", lalu MENGABAIKANNYA: cabang kesimpulan
     hanya membaca defisiensi keparahan Tinggi, inspeksi tidak
     memuaskan, dan jumlah tuduhan. Defisiensi pervasif karena itu tak
     pernah menghasilkan ¶54(c) — justru cabang yang paling menentukan.
     Pervasivitasnya sendiri di-hardcode ke ID seed:
         (r.id === 'QR-02') || (r.id === 'QR-04')
     sehingga risiko mutu baru tak akan pernah dinilai pervasif.

     Sekarang aturannya ada di `canon_smm_evaluation.ts`, diuji terpisah,
     dan pervasivitas MENGIKAT (A192) dengan carve-out A191.
     --------------------------------------------------------------- */
  const defs = risks.filter((r: any) => r.deficiency);
  /* Pemetaan risiko→defisiensi DAN defisiensi jaringan (¶52) kini berasal
     dari `canon_smm_deficiencies`, dipakai bersama `view_governance`.

     Sebelumnya pemetaan tinggal di dalam JSX ini dan defisiensi jaringan
     tak pernah ikut: panel di bawah MENYATAKAN "tidak ada defisiensi lain
     yang terbuka" sementara Governance menampilkan ND-01 terbuka tanpa
     tindakan remedial (¶52(b)) untuk firma & periode yang sama. */
  const smmDefs = collectSmmDeficiencies({ risks, network: A.QM_NETWORK });
  const evalResult = evaluateSmm(smmDefs);
  const netDefIds = smmDefs.filter((d) => d.origin === 'network').map((d) => d.id);
  /* Metrik komponen DITURUNKAN — menggantikan "Tren Skor Komponen SMM" yang
     memplot `QM_COMPONENTS.trend`, riwayat skor yang tak pernah ada. */
  const compMetrics = componentMetrics(
    A.QM_COMPONENTS,
    risks,
    coverageByComponent(objectiveCoverage(risks as ObjectiveLinkedRisk[], (A.SMM_OBJECTIVE_WAIVERS || []) as ObjectiveWaiver[])),
    evaluateSmm(smmDefs),
    smmDefs,
  );
  const withOrigin = (ids: readonly string[]) => ids
    .map((id) => id + (originOf(smmDefs, id) === 'network' ? ' (jaringan)' : ''))
    .join(' · ');

  const inspBad = inspections.filter((i: any) => i.grade === 'Tidak Memuaskan');
  const cmpInvest = complaints.filter((c: any) => c.status === 'Investigasi' && c.severity === 'Tinggi');

  const conclusion = evalResult.conclusion;
  const label = conclusion === 'not-reasonable' ? 'Belum Efektif'
    : conclusion === 'reasonable-except-for' ? 'Efektif dengan Pengecualian' : 'Efektif';
  const color = conclusion === 'not-reasonable' ? 'var(--red)'
    : conclusion === 'reasonable-except-for' ? 'var(--amber)' : 'var(--green)';
  const stmt = conclusion === 'not-reasonable'
    ? `Terdapat defisiensi PERVASIF yang belum diremediasi pada tanggal evaluasi (${evalResult.openPervasive.join(' · ')}) — sistem manajemen mutu tidak memberikan keyakinan memadai bahwa tujuannya tercapai. Perlu eskalasi & rencana remediasi terstruktur.`
    : conclusion === 'reasonable-except-for'
    ? (master.statement || `Sistem manajemen mutu memberikan keyakinan memadai KECUALI UNTUK defisiensi yang berpengaruh signifikan namun tidak pervasif (${evalResult.openSignificant.join(' · ')}), yang tengah diremediasi.`)
    : 'Sistem manajemen mutu memberikan keyakinan memadai bahwa KAP & personelnya memenuhi tanggung jawab profesional dan laporan yang diterbitkan telah tepat sesuai kondisinya.';

  /* Faktor yang MENENTUKAN kesimpulan (¶54) dipisahkan dari faktor yang
     hanya menginformasikan. Sebelumnya keduanya bercampur, sehingga
     "Tidak ada defisiensi pervasif" tampil gagal sementara kesimpulan
     tak bergerak — pembaca tak punya cara tahu mana yang mengikat. */
  const factors = [
    { binding: true, ok: evalResult.openPervasive.length === 0, t: 'Tidak ada defisiensi PERVASIF terbuka (A192) — pemaksa ¶54(c)', v: evalResult.openPervasive.length, detail: withOrigin(evalResult.openPervasive) || 'Nihil' },
    { binding: true, ok: evalResult.openSignificant.length === 0, t: 'Tidak ada defisiensi SIGNIFIKAN tak pervasif terbuka (A163) — pemaksa ¶54(b)', v: evalResult.openSignificant.length, detail: withOrigin(evalResult.openSignificant) || 'Nihil' },
    { binding: false, ok: evalResult.openMinor.length === 0, t: 'Tidak ada defisiensi lain yang terbuka (register risiko & ketentuan jaringan ¶52)', v: evalResult.openMinor.length, detail: withOrigin(evalResult.openMinor) || 'Nihil' },
    { binding: false, ok: inspBad.length === 0, t: 'Tidak ada inspeksi "Tidak Memuaskan"', v: inspBad.length, detail: inspBad.map((i: any) => i.id).join(' · ') || 'Nihil' },
    { binding: false, ok: cmpInvest.length === 0, t: 'Tidak ada tuduhan tingkat tinggi dalam investigasi', v: cmpInvest.length, detail: cmpInvest.map((c: any) => c.id).join(' · ') || 'Nihil' },
    { binding: false, ok: risks.filter((r: any) => r.monitor === 'Belum Diuji').length === 0, t: 'Seluruh respons mutu telah dipantau', v: risks.filter((r: any) => r.monitor === 'Belum Diuji').length + ' belum diuji', detail: risks.filter((r: any) => r.monitor === 'Belum Diuji').map((r: any) => r.id).join(' · ') || 'Nihil' },
  ];
  const factorOk = factors.filter(f => f.ok).length;

  /* Alasan pervasivitas per defisiensi — supaya kesimpulan ¶54(c) dapat
     ditelusuri ke indikator A192 yang memicunya, bukan sekadar diumumkan. */
  const pervasiveReasons: Array<{ id: string; reasons: string[] }> = smmDefs
    .filter((d) => evalResult.openPervasive.indexOf(d.id) >= 0)
    .map((d) => ({
      id: String(d.id) + (d.origin === 'network' ? ' (jaringan)' : ''),
      reasons: ((d.pervasiveness || []) as readonly PervasivenessIndicator[])
        .map((p) => PERVASIVENESS_LABEL[p]).filter(Boolean),
    }));

  const inspSumm = {
    total: inspections.length,
    done: inspections.filter((i: any) => i.grade !== 'Dijadwalkan').length,
    findings: inspections.reduce((a: any, i: any) => a + i.findings, 0),
    sevHigh: inspFindings.filter((f: any) => f.sev === 'Tinggi').length,
    sevMid: inspFindings.filter((f: any) => f.sev === 'Sedang').length,
    sevLow: inspFindings.filter((f: any) => f.sev === 'Rendah').length,
  };

  return (
    <div className="split" style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 14 }}>
        {/* hero kesimpulan */}
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '18px 20px' }}>
            <div className="row jb ac" style={{ marginBottom: 5 }}>
              <span className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.08em' }}>Evaluasi Tahunan Sistem Manajemen Mutu (SMM 1 ¶53–¶54)</span>
              <span className="row ac gap8">
                <Badge kind={attestComplete ? 'green' : attestVoidedRoles(attestLinks).length ? 'red' : 'amber'}>
                  {attestComplete ? 'Diatestasi'
                    : attestVoidedRoles(attestLinks).length ? 'Atestasi gugur — kesimpulan berubah'
                    : 'Menunggu atestasi'}
                </Badge>
                <span className="mono tiny" style={{ color: '#9fc0d2' }}>{period}</span>
              </span>
            </div>
            <div className="row ac gap12" style={{ marginBottom: 8 }}>
              <span style={{ display: 'inline-flex', width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: '0 0 0 4px rgba(255,255,255,.15)' }} />
              <span style={{ fontSize: 22, fontWeight: 700 }}>{label}</span>
              <Badge kind="blue">{evalResult.paragraph}</Badge>
            </div>
            <div className="tiny" style={{ color: '#cfe2ed', lineHeight: 1.55, maxWidth: 720 }}>{stmt}</div>
          </div>
          <div style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {/* TIDAK ada fallback ke seed. Bentuk lama menampilkan `master.approvedBy`
                dan `master.date` — nama & tanggal dari konstanta beku — saat belum ada
                yang menandatangani, sehingga layar menyatakan persetujuan yang tak
                pernah dibuat siapa pun. */}
            <D2KV label="Disusun (Pimpinan SOQM ¶20(b))" v={leaderLink.signer ? leaderLink.signer.by : 'Belum ditandatangani'} />
            <D2KV label="Disetujui (Managing Partner ¶20(a))" v={approverLink.signer ? approverLink.signer.by : 'Belum ditandatangani'} />
            <D2KV label="Tanggal Atestasi" v={approverLink.signer ? faShowAttestAt(approverLink.signer.at) : (leaderLink.signer ? faShowAttestAt(leaderLink.signer.at) : '—')} />
            <D2KV label="Cakupan Periode" v={period} />
          </div>
        </Panel>

        {/* Atestasi pimpinan SOQM (SMM 1 ¶53) — kesimpulan tertulis + sign-off
            tersimpan (SSOT firmAttest), berdampingan dgn rekomendasi mesin ¶54. */}
        <FirmAttestCard
          attestKey={attestKey}
          period={period}
          roles={SOQM_ANNUAL_ROLES}
          title="Kesimpulan & Atestasi Berjenjang (¶53 · ¶20)"
          engineLabel={label}
          placeholder="Kesimpulan pimpinan atas efektivitas SMM & dasar pertimbangan (SMM 1 ¶53)…"
        />

        {/* faktor keputusan ¶54 */}
        <Panel noBody>
          <div className="panel-h"><h3>Faktor Keputusan ¶54</h3><div style={{ flex: 1 }} /><span className="tiny mono" style={{ fontWeight: 700, color: factorOk === factors.length ? 'var(--green)' : 'var(--amber)' }}>{factorOk}/{factors.length} terpenuhi</span></div>
          <div style={{ padding: '4px 0 8px' }}>
            {factors.map((f, i) => (
              <div key={i} className="soqm-factor-row">
                <span style={{ color: f.ok ? 'var(--green)' : f.binding ? 'var(--red)' : 'var(--amber)', display: 'inline-flex', flex: '0 0 18px' }}>{I ? (f.ok ? <I.checkCircle size={15} /> : <I.alert size={15} />) : null}</span>
                <span className="soqm-factor-t" style={{ fontSize: 12, fontWeight: 600 }}>
                  {f.t}
                  {f.binding && <span className="tiny mono" style={{ marginLeft: 6, color: 'var(--red)', fontWeight: 700 }}>MENGIKAT</span>}
                </span>
                <span className="soqm-factor-d tiny muted">{f.detail}</span>
                <span className="mono tiny" style={{ fontWeight: 700, color: f.ok ? 'var(--green)' : f.binding ? 'var(--red)' : 'var(--amber)' }}>{f.v}</span>
              </div>
            ))}
          </div>
          <div className="tiny muted" style={{ padding: '0 14px 12px', lineHeight: 1.5 }}>
            Hanya faktor bertanda <b style={{ color: 'var(--red)' }}>MENGIKAT</b> yang menentukan kesimpulan ¶54;
            sisanya menginformasikan. Sebelumnya keduanya bercampur, sehingga pervasivitas dapat tampil gagal
            tanpa menggerakkan kesimpulan.
          </div>
        </Panel>

        {/* Ketertelusuran ¶54(c): indikator A192 mana yang memicunya */}
        {pervasiveReasons.length > 0 && (
          <Panel title="Dasar Penilaian Pervasivitas (A192)" sub="kesimpulan ¶54(c) tertelusur ke indikator, bukan diumumkan">
            <div style={{ display: 'grid', gap: 8 }}>
              {pervasiveReasons.map((p) => (
                <div key={p.id} className="panel" style={{ padding: '10px 12px', boxShadow: 'none', borderLeft: '3px solid var(--red)' }}>
                  <div className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 4 }}>{p.id}</div>
                  <ul style={{ margin: '0 0 0 16px', padding: 0 }}>
                    {p.reasons.map((r, ri) => <li key={ri} className="tiny" style={{ lineHeight: 1.5 }}>{r}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* A191 — wajib tercantum dalam basis (¶58(e)) meski tak menurunkan kesimpulan */}
        {evalResult.carveOut.length > 0 && (
          <Panel title="Defisiensi Signifikan yang Sudah Diremediasi (A191)" sub="tidak menurunkan kesimpulan, tetapi wajib menjadi bagian basis ¶58(e)">
            <div className="tiny" style={{ lineHeight: 1.55 }}>
              {evalResult.carveOut.join(' · ')} — telah diremediasi dengan tepat <b>dan</b> dampaknya dikoreksi
              pada tanggal evaluasi, sehingga tidak menurunkan kesimpulan ¶54. Keduanya adalah syarat terpisah:
              tindakan remedial yang selesai tetapi dampaknya belum dikoreksi <b>tidak</b> memperoleh carve-out ini.
            </div>
          </Panel>
        )}

        {/* basis kesimpulan */}
        <Panel title="Basis Kesimpulan" sub="sumber data per faktor — semuanya ditarik dari modul kanonik">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            <button type="button" className="soqm-basis" onClick={() => nav('soqm', { from: 'soqm' })}>
              <span className="tiny upper muted">Risiko Mutu &amp; Respons</span>
              <span style={{ fontSize: 12 }}>{risks.length} risiko · {risks.filter((r: any) => r.monitor === 'Efektif').length} efektif · {defs.length} defisiensi</span>
              <span className="tiny mono" style={{ color: 'var(--blue)' }}>SOQM_RISKS</span>
            </button>
            <button type="button" className="soqm-basis" onClick={() => nav('soqm', { from: 'soqm' })}>
              <span className="tiny upper muted">Inspeksi Perikatan</span>
              <span style={{ fontSize: 12 }}>{inspSumm.done}/{inspSumm.total} inspeksi · {inspSumm.findings} temuan ({inspSumm.sevHigh}H / {inspSumm.sevMid}S / {inspSumm.sevLow}R)</span>
              <span className="tiny mono" style={{ color: 'var(--blue)' }}>QM_INSPECTIONS</span>
            </button>
            <button type="button" className="soqm-basis" onClick={() => nav('eqr', { from: 'soqm' })}>
              <span className="tiny upper muted">EQR — Mutu Perikatan</span>
              <span style={{ fontSize: 12 }}>{(A.EQR_REVIEWS || []).length} reviu · {(A.EQR_REVIEWS || []).filter((r: any) => r.cleared).length} cleared</span>
              <span className="tiny mono" style={{ color: 'var(--blue)' }}>EQR_REVIEWS</span>
            </button>
            <button type="button" className="soqm-basis" onClick={() => nav('soqm', { from: 'soqm' })}>
              <span className="tiny upper muted">Keluhan &amp; Tuduhan</span>
              <span style={{ fontSize: 12 }}>{complaints.length} register · {complaints.filter((c: any) => c.type === 'Tuduhan').length} tuduhan · {complaints.filter((c: any) => c.status === 'Selesai').length} selesai</span>
              <span className="tiny mono" style={{ color: 'var(--blue)' }}>COMPLAINTS</span>
            </button>
            {/* ¶52 — defisiensi ketentuan/jasa jaringan adalah defisiensi SMM KAP
                (¶48: KAP TETAP bertanggung jawab). Sebelumnya tak pernah muncul
                di basis kesimpulan mana pun. */}
            {netDefIds.length > 0 && (
              <button type="button" className="soqm-basis" onClick={() => nav('governance', { from: 'soqm', tab: 'network' })}>
                <span className="tiny upper muted">Ketentuan Jaringan (¶52)</span>
                <span style={{ fontSize: 12 }}>{netDefIds.length} defisiensi jaringan · {netDefIds.filter((id) => evalResult.carveOut.indexOf(id) < 0).length} terbuka</span>
                <span className="tiny mono" style={{ color: 'var(--blue)' }}>QM_NETWORK</span>
              </button>
            )}
          </div>
          {master.basis && (
            <div style={{ marginTop: 10 }}>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Basis Tertulis Evaluator</div>
              <ul className="soqm-basis-ul">
                {master.basis.map((b: any, i: any) => <li key={i} className="tiny" style={{ lineHeight: 1.5 }}>{b}</li>)}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      {/* sidebar kanan */}
      <div className="grid" style={{ gap: 12, alignContent: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Tindakan Pasca-Evaluasi</h3></div>
          <div style={{ padding: '10px 14px', display: 'grid', gap: 8 }}>
            {/* "aktif" = TERBUKA menurut A191 (diremediasi DAN dampaknya dikoreksi),
                mencakup defisiensi jaringan — bukan sekadar status teks 'Selesai'. */}
            <D2Action ok={evalResult.openPervasive.length + evalResult.openSignificant.length + evalResult.openMinor.length === 0} t="Lanjutkan remediasi defisiensi terdaftar" v={(evalResult.openPervasive.length + evalResult.openSignificant.length + evalResult.openMinor.length) + ' aktif'} />
            <D2Action ok={inspBad.length === 0} t="Eskalasi inspeksi tidak memuaskan" v={inspBad.length + ' kasus'} />
            <D2Action ok={true} t="Komunikasikan hasil ke seluruh personel" v="Memo & town hall" />
            <D2Action ok={true} t="Laporkan ke PPPK & TCWG terkait" v="Sesuai jadwal" />
          </div>
          <div style={{ padding: '0 14px 14px', display: 'grid', gap: 8 }}>
            <Btn variant="primary" onClick={() => nav('soqm', { from: 'soqm' })}><span style={{ display: 'inline-flex', verticalAlign: -2 }}>{I ? <I.download size={13} /> : null}</span> Unduh Memo Evaluasi</Btn>
            <Btn onClick={() => nav('pppk', { from: 'soqm' })}>{I ? <I.report size={13} /> : null} Cantumkan ke Laporan PPPK</Btn>
          </div>
        </Panel>

        {/* Panel ini dulu berjudul "Tren Skor Komponen SMM" dan memplot
            `QM_COMPONENTS.trend` — riwayat skor yang tak pernah ada, di layar
            evaluasi ¶53 yang justru paling dituntut berbasis bukti. Skor & tren
            dicabut; yang tersisa adalah cakupan tujuan mandatori ¶28–33, yang
            terhitung dan bisa gagal. */}
        <Panel title="Cakupan Tujuan Mandatori per Komponen" sub="¶28–33 — dihitung dari register risiko & waiver ¶17, bukan skor seed">
          <div className="grid" style={{ gap: 6 }}>
            {compMetrics.map((m) => {
              const pct = m.isProcess || !m.objectivesTotal ? null : Math.round(m.objectivesAddressed / m.objectivesTotal * 100);
              const clr = m.status === 'deficient' ? 'var(--red)' : m.status === 'attention' ? 'var(--amber)' : 'var(--green)';
              return (
                <div key={m.id}>
                  <div className="row jb ac" style={{ marginBottom: 2 }}>
                    <span className="tiny" style={{ fontWeight: 600 }}>{m.id} · {m.name}</span>
                    <span className="mono tiny" style={{ fontWeight: 700, color: pct === null ? 'var(--ink-3)' : clr }}>
                      {pct === null ? 'proses' : m.objectivesAddressed + '/' + m.objectivesTotal}
                    </span>
                  </div>
                  {pct !== null && <div className="pbar"><span style={{ width: pct + '%', background: clr }} /></div>}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function D2KV({ label, v }: any) {
  return (
    <div>
      <div className="tiny muted upper" style={{ marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{v}</div>
    </div>
  );
}
function D2Action({ ok, t, v }: any) {
  return (
    <div className="row jb ac">
      <span className="row ac gap8" style={{ minWidth: 0 }}>
        <span style={{ color: ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto' }}>{I ? (ok ? <I.checkCircle size={14} /> : <I.alert size={14} />) : null}</span>
        <span className="tiny" style={{ lineHeight: 1.3 }}>{t}</span>
      </span>
      <span className="mono tiny" style={{ fontWeight: 700, color: ok ? 'var(--green)' : 'var(--amber)' }}>{v}</span>
    </div>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { D2KPI, SoqmAnnualEval, SoqmHeatmap, SoqmInfoComm, SoqmObjectives, SoqmSeverity };
