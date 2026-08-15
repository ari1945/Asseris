/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAudit, useAuth, useInitialSelection, useNav } from './contexts';
import { probError, dueBeforeIssued } from './canon_validation';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Overlay, Panel, Seg, Stat } from './ui';
import { KvBox } from './view_analytical';
import { amsExportPdf } from './export_pdf';
import { CAP } from './rbac';
import { usePipelineRegister } from './use_pipeline';
import {
  PIPE_STAGES, PIPE_STAGE_COLOR, nextOppId, openOpportunities,
  stageSummary, weightedValue, winLoss, wonYtd,
} from './canon_pipeline';
import type { Opportunity, StageEvent } from './canon_pipeline';
import { acceptanceReadiness } from './canon_pipeline_acceptance';
import { applyHandoff, planHandoff } from './canon_pipeline_handoff';
import { effortPlan, feeBasis } from './canon_pipeline_fee';
import { FIRMFIN } from './data_firmfin';
import {
  LOSS_REASON_PRESETS, WIN_REASON_PRESETS,
  ageDays, daysInStage, isOverdue, moveWithHistory, probCheck,
  stageFlow, stallInfo, winLossBetween, yearStart,
} from './canon_pipeline_lifecycle';
import type { IndependenceRow, ProspectLike, ReadinessRow, ReadinessStatus, VerdictState } from './canon_pipeline_acceptance';
import type { ClientRow, StaffRow } from './ams_types';

/* Warna status kesiapan — merah BUKAN dekorasi: baris `issue` adalah hal yang
   menghalangi penerimaan, bukan sekadar catatan. */
const READY_COLOR: Record<ReadinessStatus, string> = {
  ok: 'var(--green)', issue: 'var(--red)', 'belum-dinilai': 'var(--ink-4)',
};
const VERDICT_BG: Record<VerdictState, string> = {
  'tanpa-prospek': 'var(--surface-2)',
  'klien-eksisting': 'var(--surface-2)',
  'dalam-penilaian': 'var(--amber-bg)',
  'ditolak': 'var(--red-bg)',
  'diterima': 'var(--amber-bg)',
  'siap-surat': 'var(--green-bg)',
};

/* PR-3 — `PIPELINE_BUDGET_RATE` dicabut bersama `budgetHrs` karangan pada
   serah-terima. Konversi nilai→jam yang sah (satu tarif, satu sumber) adalah
   pekerjaan PR-5; sampai saat itu anggaran jam prospek DIKOSONGKAN, bukan ditebak
   dari tarif Senior sementara kapasitas memakai tarif blended yang berbeda. */

/* ============================================================
   Asseris — Sales Pipeline + Billing & Invoicing (Package D)
   ============================================================ */
const { useState: useStateD1, useMemo: useMemoD1 } = React;

/* ---------------- Sales Pipeline ----------------
   PRD `docs/prd-sales-pipeline-deepening.md` · PR-1.
   Papan ini dulu memegang daftar peluangnya sendiri (`useAmsPersist('pipeline')`)
   sementara BI / Kapasitas / antrean Penerimaan membaca literal seed — memindah
   kartu tak menggerakkan satu pun angka hilir. Kini SATU register lewat
   `usePipelineRegister()`, dan tahap/warnanya dari `canon_pipeline` (dulu tiga
   peta warna yang saling berbeda di tiga berkas).                              */

function SalesPipeline() {
  const { fmt } = AMS;
  const nav = useNav();
  const { register: opps, setRegister: setOpps, canEdit } = usePipelineRegister();
  const { logActivity } = useAudit();
  const who = (AMS.USER && AMS.USER.name) || 'Pengguna';
  const [dragId, setDragId] = useStateD1(null);
  const [over, setOver] = useStateD1(null);
  /* PR-6 (SC-15) — sheet detail BERALAMAT: `#/pipeline/<OPP-id>` (pola V-9).
     Dulu seleksi hanya hidup di state React, jadi peluang tak dapat ditautkan,
     di-bookmark, atau dibagikan ke rekan. */
  const seedSel = useInitialSelection('pipeline');
  const [detail, setDetail] = useStateD1(seedSel);
  const openDetail = (id: string) => { setDetail(id); nav('pipeline', { sel: id }); };
  const closeDetail = () => { setDetail(null); nav('pipeline', { sel: null }); };

  /* Kesiapan penerimaan per peluang — dihitung sekali untuk seluruh papan agar
     hal terbuka terlihat TANPA membuka satu per satu (dulu tak terlihat sama
     sekali: setiap kartu tampak sama-sama bersih). */
  const [prospects] = useAmsPersist('prospects', () => AMS.PROSPECTS) as [ProspectLike[], unknown];
  const readinessById = useMemoD1(() => {
    const ctx = { prospects, independence: (AMS.INDEPENDENCE || []) as IndependenceRow[], clients: AMS.CLIENTS as ClientRow[] };
    const m: Record<string, ReturnType<typeof acceptanceReadiness>> = {};
    opps.forEach((o: Opportunity) => { m[o.id] = acceptanceReadiness(o, ctx); });
    return m;
  }, [opps, prospects]);

  const openList = openOpportunities(opps);
  const weighted = weightedValue(openList);
  const won = wonYtd(opps, AMS.TODAY);
  const openCount = openList.length;
  const wl = winLoss(opps);
  /* PR-4 — win rate PERIODE. Angka sepanjang-masa tak pernah bergerak dan tak
     menjawab pertanyaan siapa pun ("bagaimana kita tahun ini?"). Mungkin hanya
     karena keputusan menang/kalah kini punya tanggal. */
  const wlYtd = winLossBetween(opps, yearStart(AMS.TODAY), AMS.TODAY);
  const crossSell = openList.filter((o) => o.origin === 'cross-sell').length;
  const stalled = openList.filter((o) => stallInfo(o, AMS.TODAY).stalled);
  const overdue = openList.filter((o) => isOverdue(o, AMS.TODAY));
  const unexplained = openList.filter((o) => probCheck(o).unexplained);
  const flows = stageFlow(opps);

  /* SoD business development (PR-1): register peluang = ENGAGEMENT_MANAGE,
     sejajar roster klien & prospek. Gate UI ini WAJIB selaras dengan
     capForWrite('firm','pipeline') — kalau tidak, kartu bergerak di layar lalu
     tulisannya ditolak SENYAP oleh server. */
  const move = (id: any, stage: any, reason?: string) => {
    if (!canEdit) return;
    const from = opps.find((o) => o.id === id);
    if (!from || from.stage === stage) return;
    /* PR-4 — perpindahan MENCATAT (siapa · kapan · probabilitas yang berlaku).
       `moveWithHistory` juga memulihkan probabilitas lama saat peluang kembali
       dari Won/Lost; `move()` lama membiarkan 100% terbawa keluar dari Won. */
    setOpps((list: Opportunity[]) => list.map((o) => o.id === id ? moveWithHistory(o, stage, { by: who, at: AMS.TODAY, reason }) : o));
    logActivity && logActivity({
      who, action: 'OPP_STAGE',
      detail: `Peluang ${id} · ${from.name} dipindahkan ${from.stage} → ${stage}` + (reason ? ` · alasan: ${reason}` : ''),
    });
  };
  const detailOpp = detail ? opps.find((o) => o.id === detail) : null;
  const [showNew, setShowNew] = useStateD1(false);
  const addOpp = (o: any) => {
    if (!canEdit) return;
    const id = nextOppId(opps);
    setOpps((list: Opportunity[]) => [{ id, stage: 'Lead', origin: 'baru', clientId: null, ...o }, ...list]);
    logActivity && logActivity({ who, action: 'OPP_CREATE', detail: `Peluang baru ${id}${o.name ? ' · ' + o.name : ''}` });
  };

  return (
    <>
      <SubBar moduleId="pipeline" right={
        <div className="row gap8 ac">
          {canEdit
            ? <>
                <span className="tiny muted">Tarik kartu antar-tahap</span>
                <Btn sm variant="primary" onClick={() => setShowNew(true)}><I.plus size={14} /> Peluang Baru</Btn>
              </>
            : <span className="chip tiny muted" title="Pengelolaan peluang dibatasi peran Partner / Manajer (setara roster klien & prospek)"><I.lock size={11} /> Read-only</span>}
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={openCount} label="Peluang Aktif" delta={crossSell ? crossSell + ' cross-sell' : null} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(weighted / 1e9, 2) + ' M'} label="Pipeline Tertimbang" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(won / 1e9, 2) + ' M'} label={'Dimenangkan (YTD ' + String(AMS.TODAY).slice(0, 4) + ')'} accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={wlYtd.winRate === null ? '—' : wlYtd.winRate + '%'} label={'Win Rate (YTD ' + String(AMS.TODAY).slice(0, 4) + ')'} delta={wlYtd.won + ' menang · ' + wlYtd.lost + ' kalah · sepanjang masa ' + wl.winRate + '%'} /></div></Panel>
        </div>

        {/* PR-4 — eksepsi siklus hidup. Tanpa stempel waktu, tak satu pun dari
            tiga hal ini pernah dapat dilihat: peluang yang mandek, forecast yang
            sudah lewat tanggal, dan keyakinan yang menyimpang tanpa alasan. */}
        {(stalled.length > 0 || overdue.length > 0 || unexplained.length > 0) && (
          <div className="row gap8 ac" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
            {stalled.length > 0 && (
              <span className="badge b-amber" title={stalled.map((o) => `${o.id} ${o.name} — ${stallInfo(o, AMS.TODAY).days} hari di ${o.stage} (ambang ${stallInfo(o, AMS.TODAY).threshold})`).join('\n')}>
                <I.clock size={11} /> {stalled.length} peluang macet
              </span>
            )}
            {overdue.length > 0 && (
              <span className="badge b-red" title={overdue.map((o) => `${o.id} ${o.name} — target close ${o.close} sudah lewat`).join('\n')}>
                <I.alert size={11} /> {overdue.length} lewat target close
              </span>
            )}
            {unexplained.length > 0 && (
              <span className="badge b-amber" title={unexplained.map((o) => { const p = probCheck(o); return `${o.id} ${o.name} — ${p.actual}% vs default tahap ${o.stage} ${p.expected}%, tanpa alasan tercatat`; }).join('\n')}>
                <I.trend size={11} /> {unexplained.length} probabilitas menyimpang tanpa alasan
              </span>
            )}
            <span className="tiny muted">per {new Date(AMS.TODAY).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        )}

        <div className="grid" style={{ gridTemplateColumns: 'repeat(6,1fr)', gap: 10, alignItems: 'start' }}>
          {stageSummary(opps, PIPE_STAGES).map(st => {
            const color = PIPE_STAGE_COLOR[st.stage];
            return (
              <div key={st.stage}
                onDragOver={(e: any) => { if (!canEdit) return; e.preventDefault(); if (over !== st.stage) setOver(st.stage); }}
                onDragLeave={() => setOver((o: any) => o === st.stage ? null : o)}
                onDrop={(e: any) => { e.preventDefault(); if (dragId) move(dragId, st.stage); setDragId(null); setOver(null); }}
                style={{ borderRadius: 8, padding: 5, minHeight: 120, background: over === st.stage ? 'var(--blue-050)' : 'transparent', outline: over === st.stage ? '2px dashed var(--blue)' : 'none' }}>
                <div className="row ac gap6" style={{ marginBottom: 8, padding: '0 3px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{st.stage}</span>
                  <span className="chip tiny">{st.n}</span>
                </div>
                <div className="tiny muted mono" style={{ padding: '0 3px 8px' }}>Rp {fmt(st.gross / 1e6, 0)} jt</div>
                {(() => {
                  const f = flows.find((x) => x.stage === st.stage);
                  if (!f || !f.entered) return null;
                  return (
                    <div className="tiny muted" style={{ padding: '0 3px 8px' }} title={`${f.advanced} dari ${f.entered} peluang yang pernah masuk ${st.stage} melaju ke tahap berikutnya`}>
                      konversi {f.conversion}%{f.medianDays !== null ? ' · median ' + f.medianDays + ' hari' : ''}
                    </div>
                  );
                })()}
                <div className="grid" style={{ gap: 8 }}>
                  {st.items.map((o) => (
                    <button key={o.id} type="button" className="panel opp-card" draggable={canEdit}
                      onDragStart={() => setDragId(o.id)} onDragEnd={() => { setDragId(null); setOver(null); }}
                      onClick={() => openDetail(o.id)}
                      aria-label={`${o.name} · ${o.service} · Rp ${fmt(o.value / 1e6, 0)} juta · tahap ${o.stage} · probabilitas ${o.prob}%`}
                      style={{ padding: 10, cursor: canEdit ? 'grab' : 'pointer', borderTop: '3px solid ' + color, opacity: dragId === o.id ? .4 : 1, textAlign: 'left', width: '100%', font: 'inherit', color: 'inherit' }}>
                      <div className="truncate" style={{ fontWeight: 600, fontSize: 12 }}>{o.name.replace('PT ', '')}</div>
                      <div className="tiny muted" style={{ marginBottom: 6 }}>{o.service}</div>
                      <div className="row jb ac">
                        <span className="mono" style={{ fontWeight: 700, fontSize: 12 }}>Rp {fmt(o.value / 1e6, 0)} jt</span>
                        <span className="badge" style={{ background: 'var(--surface-3)', color: o.prob >= 70 ? 'var(--green)' : o.prob >= 40 ? 'var(--amber)' : 'var(--ink-3)' }}>{o.prob}%</span>
                      </div>
                      <div className="row jb ac gap6" style={{ marginTop: 6 }}>
                        <span className="row ac gap6"><Avatar name={o.owner} size={17} /><span className="tiny muted">{o.owner.split(' ')[0]}</span></span>
                        <span className="row ac gap6">
                          {(() => {
                            const si = stallInfo(o, AMS.TODAY);
                            if (si.days === null) return null;
                            return (
                              <span className={'tiny ' + (si.stalled ? '' : 'muted')} style={si.stalled ? { color: 'var(--amber)', fontWeight: 700 } : undefined}
                                title={`${si.days} hari di tahap ${o.stage}` + (si.stalled ? ` — melewati ambang ${si.threshold} hari` : '') + (ageDays(o, AMS.TODAY) !== null ? ` · umur ${ageDays(o, AMS.TODAY)} hari` : '')}>
                                {si.days}h
                              </span>
                            );
                          })()}
                          {o.origin === 'cross-sell' && <span className="badge b-purple" title="Cross-sell ke klien eksisting">Cross-sell</span>}
                          {readinessById[o.id] && readinessById[o.id].issues > 0 && (
                            <span className="badge b-red" title={readinessById[o.id].rows.filter((r: ReadinessRow) => r.status === 'issue').map((r: ReadinessRow) => r.label + ': ' + r.basis).join('\n')}>
                              <I.alert size={10} /> {readinessById[o.id].issues}
                            </span>
                          )}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div></div>
      {detailOpp && <OppDetail o={detailOpp} onClose={closeDetail} onMove={move} />}
      {showNew && <OppForm onClose={() => setShowNew(false)} onAdd={(o: any) => { addOpp(o); setShowNew(false); }} />}
    </>
  );
}

const OPP_FORM_INIT = { name: '', service: 'Audit Laporan Keuangan', industry: '', value: 500000000, prob: 25, owner: 'Hartono Wijaya', close: '2026-06-30' };

function OppForm({ onClose, onAdd }: any) {
  const uid = React.useId();
  const { fmt } = AMS;
  const [d, setD] = useStateD1({ ...OPP_FORM_INIT });
  const set = (k: any, v: any) => setD((s: any) => ({ ...s, [k]: v }));
  const probErr = probError(+d.prob);
  const valid = d.name.trim() && d.industry.trim() && +d.value > 0 && !probErr;
  return (
    <Overlay
      variant="modal"
      size="md"
      onClose={onClose}
      isDirty={() => JSON.stringify(d) !== JSON.stringify(OPP_FORM_INIT)}
      bodyStyle={{ padding: 16, display: 'grid', gap: 12 }}
      header={(
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.trend size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>Peluang Baru</div><div className="tiny" style={{ color: '#bcd6e4' }}>Tambah ke pipeline penjualan</div></div>
          <button aria-label="Tutup" className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
      )}
      footer={(
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => onAdd(d)}><I.check size={14} /> Tambah Peluang</Btn>
        </div>
      )}
    >
        <div>
          <div className="field"><label htmlFor={uid+'-nama-calon-klien'}>Nama Calon Klien</label><input id={uid+'-nama-calon-klien'} className="input" value={d.name} onChange={(e: any) => set('name', e.target.value)} placeholder="PT Calon Klien Sejahtera" /></div>
          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
            <div className="field"><label htmlFor={uid+'-jasa'}>Jasa</label><select id={uid+'-jasa'} className="select" value={d.service} onChange={(e: any) => set('service', e.target.value)}>{['Audit Laporan Keuangan', 'Review (SPR 2400)', 'Agreed-Upon Procedures', 'Due Diligence', 'Audit + Tax', 'Advisory'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label htmlFor={uid+'-industri'}>Industri</label><input id={uid+'-industri'} className="input" value={d.industry} onChange={(e: any) => set('industry', e.target.value)} placeholder="Manufaktur" /></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label htmlFor={uid+'-nilai-estimasi-rp'}>Nilai Estimasi (Rp)</label><input id={uid+'-nilai-estimasi-rp'} className="input mono" type="number" value={d.value} onChange={(e: any) => set('value', +e.target.value)} style={{ textAlign: 'right' }} /></div>
            <div className="field"><label htmlFor={uid+'-probabilitas'}>Probabilitas (%)</label><input id={uid+'-probabilitas'} className="input mono" type="number" min={0} max={100} value={d.prob} onChange={(e: any) => set('prob', +e.target.value)} style={{ textAlign: 'right', borderColor: probErr ? 'var(--red)' : undefined }} />{probErr && <div className="tiny" style={{ color: 'var(--red)', marginTop: 3 }}>{probErr}</div>}</div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
            <div className="field"><label htmlFor={uid+'-owner'}>Owner</label><select id={uid+'-owner'} className="select" value={d.owner} onChange={(e: any) => set('owner', e.target.value)}>{['Hartono Wijaya', 'Rudi Gunawan', 'Sari Dewanti', 'Bayu Saputra'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label htmlFor={uid+'-target-close'}>Target Close</label><input id={uid+'-target-close'} className="input" type="date" value={d.close} onChange={(e: any) => set('close', e.target.value)} /></div>
          </div>
        </div>
    </Overlay>
  );
}

function OppDetail({ o, onClose, onMove }: any) {
  const { fmt } = AMS;
  const nav = useNav();
  const uidD = React.useId();
  const [decide, setDecide] = useStateD1(null);
  const [reasonPick, setReasonPick] = useStateD1('');
  const [reasonNote, setReasonNote] = useStateD1('');
  /* Register prospek HIDUP (dokumen yang sama dengan modul Onboarding), bukan
     seed — keputusan akseptasi yang baru diambil di sana harus langsung terbaca
     di sini. */
  const [prospects, setProspects] = useAmsPersist('prospects', () => AMS.PROSPECTS) as [ProspectLike[], (u: (p: ProspectLike[]) => ProspectLike[]) => void];
  const { logActivity } = useAudit();
  const who = (AMS.USER && AMS.USER.name) || 'Pengguna';
  const [handoff, setHandoff] = useStateD1(null);

  /* PR-3 — serah-terima kini MEMUTUSKAN dulu, baru menulis, dan hasilnya selalu
     terlihat. Yang lama: mengarang materialitas dari fee, menempelkan ", CPA"
     pada siapa pun, menulis localStorage mentah (melewati server-SSOT),
     me-`return` senyap bila duplikat — lalu tetap menandai peluang Won dan
     berpindah halaman. */
  const plan = planHandoff(o, {
    prospects, clients: AMS.CLIENTS as ClientRow[], staff: (AMS.STAFF || []) as StaffRow[],
    factorTemplate: ((AMS.PROSPECTS as unknown as ProspectLike[])[0]?.acceptance?.factors) || [],
  });
  /* Menulis `prospects` juga ENGAGEMENT_MANAGE (capForWrite). Tanpa gate ini
     pengguna non-privileged menekan tombol, melihat pesan sukses, lalu tulisannya
     ditolak SENYAP server — kelas cacat yang sama dengan register peluang. */
  const authD = useAuth();
  const canHandoff = !!(authD && typeof authD.can === 'function' && authD.can(CAP.ENGAGEMENT_MANAGE));
  const toOnboarding = () => {
    if (!canHandoff) return;
    const next = applyHandoff(plan, prospects);
    if (next) {
      setProspects(() => next);
      logActivity && logActivity({ who, action: 'OPP_HANDOFF', detail: `Peluang ${o.id} · ${o.name} → prospek ${plan.draft!.id}` });
    }
    /* Tahap peluang TIDAK digeser. Mengirim calon klien ke penilaian penerimaan
       bukan berarti perikatannya dimenangkan — Won adalah keputusan komersial
       tersendiri (Q-1). Dulu tombol ini menandai Won bahkan ketika ia tidak
       membuat apa pun. */
    setHandoff(plan.kind === 'buat' ? { ...plan, message: plan.message } : plan);
  };
  /* PR-2 — kesiapan penerimaan DITURUNKAN dari register prospek + register
     independensi. Dulu dua baris dipaku `ok: true` dan dua sisanya dihitung
     dari `stage`/`prob` — sirkular, dan secara struktural tak pernah merah. */
  const readiness = acceptanceReadiness(o, {
    prospects, independence: (AMS.INDEPENDENCE || []) as IndependenceRow[], clients: AMS.CLIENTS as ClientRow[],
  });
  return (
    <Overlay
      variant="sheet"
      size="sm"
      onClose={onClose}
      panelStyle={{ background: 'var(--surface)' }}
      bodyStyle={{ padding: 16 }}
      footer={(
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Tombol menyatakan apa yang AKAN terjadi — dulu satu label untuk tiga
              nasib berbeda (buat · tak melakukan apa pun · tak berlaku). */}
          {plan.kind === 'sudah-ada'
            ? <Btn variant="primary" onClick={() => { onClose(); nav('onboarding'); }}><I.arrowRight size={14} /> Buka Prospek {plan.existing!.id}</Btn>
            : plan.kind === 'tolak'
              ? <Btn onClick={() => { onClose(); nav('continuance'); }}><I.arrowRight size={14} /> Nilai Keberlanjutan Klien</Btn>
              : canHandoff
                ? <Btn variant="primary" onClick={toOnboarding}><I.arrowRight size={14} /> Buat Prospek {plan.draft!.id} &amp; Mulai Penerimaan</Btn>
                : <span className="chip tiny muted" style={{ justifyContent: 'center' }} title="Membuat prospek dibatasi peran Partner / Manajer (ENGAGEMENT_MANAGE)"><I.lock size={11} /> Serah-terima dibatasi peran</span>}
          {/* PR-6 — KEPUTUSAN MENANG/KALAH MENANGKAP ALASANNYA. Dulu "Kalah"
              hanya menyetel prob=0; tak ada yang ditanya, tak ada yang disimpan —
              sementara BI menampilkan daftar "alasan kalah" yang literal. */}
          {decide
            ? (
              <div className="grid" style={{ gap: 8 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={uidD + '-alasan'}>{decide === 'Won' ? 'Alasan menang' : 'Alasan kalah'}</label>
                  <select id={uidD + '-alasan'} className="select" value={reasonPick} onChange={(e: { target: { value: string } }) => setReasonPick(e.target.value)}>
                    {(decide === 'Won' ? WIN_REASON_PRESETS : LOSS_REASON_PRESETS).map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={uidD + '-catatan'}>Catatan (opsional)</label>
                  <input id={uidD + '-catatan'} className="input" value={reasonNote} placeholder="mis. imbalan pesaing 18% lebih rendah"
                    onChange={(e: { target: { value: string } }) => setReasonNote(e.target.value)} />
                </div>
                <div className="row gap8">
                  <Btn style={{ flex: 1 }} variant="primary"
                    onClick={() => { onMove(o.id, decide, reasonPick + (reasonNote.trim() ? ' — ' + reasonNote.trim() : '')); onClose(); }}>
                    <I.check size={14} /> Simpan {decide === 'Won' ? 'Menang' : 'Kalah'}
                  </Btn>
                  <Btn onClick={() => setDecide(null)}>Batal</Btn>
                </div>
              </div>
            )
            : (
              <div className="row gap8">
                <Btn style={{ flex: 1 }} onClick={() => { setReasonPick(WIN_REASON_PRESETS[0]); setReasonNote(''); setDecide('Won'); }}><I.check size={14} /> Tandai Menang</Btn>
                <Btn onClick={() => { setReasonPick(LOSS_REASON_PRESETS[0]); setReasonNote(''); setDecide('Lost'); }}>Kalah</Btn>
              </div>
            )}
        </div>
      )}
      header={(
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '15px 18px' }}>
          <div className="row jb ac" style={{ marginBottom: 8 }}><span className="mono tiny" style={{ color: '#bcd6e4', fontWeight: 700 }}>{o.id}</span><button aria-label="Tutup" className="top-btn" onClick={onClose}><I.x size={18} /></button></div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{o.name}</div>
          <div className="tiny" style={{ color: '#bcd6e4' }}>{o.service} · {o.industry}</div>
        </div>
      )}
    >
        <div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <KvBox label="Nilai Estimasi" v={'Rp ' + fmt(o.value / 1e6, 0) + ' jt'} />
            <KvBox label="Probabilitas" v={o.prob + '%'} accent={o.prob >= 70 ? 'var(--green)' : 'var(--amber)'} />
            <KvBox label="Owner" v={o.owner.split(',')[0]} />
            <KvBox label="Target Close" v={new Date(o.close).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} accent={isOverdue(o, AMS.TODAY) ? 'var(--red)' : undefined} />
          </div>
          {/* PR-6 (SC-14) — PINDAH TAHAP TANPA TETIKUS. Sebelum ini satu-satunya
              cara memindahkan peluang adalah drag-and-drop: mustahil dengan
              keyboard, dan mustahil bagi pengguna teknologi bantu. Kontrol
              native `<select>` memberi jalur yang setara. */}
          {onMove && (
            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor={uidD + '-tahap'}>Pindahkan ke tahap</label>
              <select id={uidD + '-tahap'} className="select" value={o.stage}
                onChange={(e: { target: { value: string } }) => { if (e.target.value !== o.stage) onMove(o.id, e.target.value); }}>
                {PIPE_STAGES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
          )}

          {/* PR-5 — DASAR NILAI. Nilai peluang yang punya build-up dapat
              dipertanggungjawabkan (jam × tarif firma); yang tanpa build-up
              dikatakan apa adanya, bukan diam-diam dianggap setara. */}
          {(() => {
            const rates = (FIRMFIN && FIRMFIN.WIP_BILL) || {};
            const fb = feeBasis(o, rates);
            const ep = effortPlan(o, rates);
            if (fb.basis === 'tanpa-dasar') {
              return (
                <div className="panel" style={{ padding: '9px 11px', marginBottom: 14, background: 'var(--surface-2)', borderColor: 'transparent' }}>
                  <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.45 }}>
                    Nilai Rp {fmt(o.value / 1e6, 0)} jt <b>tanpa build-up jam</b> — belum dapat ditelusuri ke jam × tarif.
                  </div>
                  <div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 3 }}>{ep.basis}</div>
                </div>
              );
            }
            return (
              <>
                <div className="row jb ac" style={{ marginBottom: 8 }}>
                  <span className="tiny muted upper">Dasar Nilai (jam × tarif)</span>
                  <span className="tiny muted mono">{fmt(fb.hours!)} jam · realisasi {fb.realizationPct}%</span>
                </div>
                <table className="dtbl" style={{ marginBottom: 12 }}>
                  <thead><tr><th>Grade</th><th className="num">Jam</th><th className="num">Tarif</th><th className="num">Nilai</th></tr></thead>
                  <tbody>
                    {fb.lines.map((l) => (
                      <tr key={l.grade}>
                        <td>{l.grade}</td>
                        <td className="num">{fmt(l.hours)}</td>
                        <td className="num muted">{fmt(l.rate / 1000)} rb</td>
                        <td className="num">{fmt(l.amount / 1e6, 0)} jt</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td>Tarif standar</td><td className="num">{fmt(fb.hours!)}</td><td /><td className="num">{fmt(fb.standard! / 1e6, 0)} jt</td></tr>
                    <tr><td>Ditawarkan</td><td /><td className="num muted">{fmt(fb.effectiveRate! / 1000)} rb/jam</td><td className="num">{fmt(fb.quoted / 1e6, 0)} jt</td></tr>
                  </tfoot>
                </table>
                <div className="tiny muted" style={{ lineHeight: 1.45, marginBottom: 14 }}>{ep.basis}</div>
              </>
            );
          })()}

          {/* PR-4 — disiplin probabilitas. Angka yang menyimpang dari default
              tahap boleh, tetapi harus terlihat dan beralasan: "Pipeline
              Tertimbang" firma dibangun dari angka-angka ini. */}
          {(() => {
            const pc = probCheck(o);
            if (!pc.deviates) return null;
            return (
              <div className="panel" style={{ padding: '9px 11px', marginBottom: 14, background: pc.unexplained ? 'var(--amber-bg)' : 'var(--surface-2)', borderColor: 'transparent' }}>
                <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.45 }}>
                  Probabilitas {pc.actual}% menyimpang {pc.delta > 0 ? '+' : ''}{pc.delta} poin dari default tahap {o.stage} ({pc.expected}%).
                  {pc.reason ? ' Alasan: ' + pc.reason : ' Belum ada alasan tercatat.'}
                </div>
              </div>
            );
          })()}

          {/* Riwayat tahap — dasar seluruh turunan siklus hidup. */}
          {!!(o.history && o.history.length) && (
            <>
              <div className="row jb ac" style={{ marginBottom: 8 }}>
                <span className="tiny muted upper">Riwayat Tahap</span>
                <span className="tiny muted">
                  umur {ageDays(o, AMS.TODAY)} hari · {daysInStage(o, AMS.TODAY)} hari di {o.stage}
                </span>
              </div>
              <div style={{ display: 'grid', gap: 0, marginBottom: 16 }}>
                {o.history.slice().reverse().map((e: StageEvent, i: number) => (
                  <div key={e.stage + e.at + i} className="row gap8" style={{ padding: '7px 0', borderBottom: i < o.history!.length - 1 ? '1px solid var(--line-soft)' : 0, alignItems: 'flex-start' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: PIPE_STAGE_COLOR[e.stage], flex: '0 0 8px', marginTop: 4 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row jb ac gap6">
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{e.stage}</span>
                        <span className="tiny muted mono">{e.at}{typeof e.prob === 'number' ? ' · ' + e.prob + '%' : ''}</span>
                      </div>
                      <div className="tiny muted">{e.by}{e.reason ? ' — ' + e.reason : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Hasil serah-terima — pesannya SELALU muncul, termasuk ketika tidak
              ada yang dibuat. Dulu kegagalan duplikat tak meninggalkan jejak apa
              pun di layar. */}
          {handoff && (
            <div className="panel" style={{ padding: '10px 12px', marginBottom: 14, background: handoff.kind === 'buat' ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
              <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.45 }}>{handoff.message}</div>
              {!!(handoff.unset && handoff.unset.length) && (
                <ul style={{ margin: '7px 0 0', paddingLeft: 16 }}>
                  {handoff.unset.map((u: { field: string; reason: string }) => (
                    <li key={u.field} className="tiny" style={{ lineHeight: 1.45, marginBottom: 2 }}><b>{u.field}</b> — {u.reason}</li>
                  ))}
                </ul>
              )}
              <div className="row gap8" style={{ marginTop: 8 }}>
                <Btn sm onClick={() => { onClose(); nav('onboarding'); }}><I.arrowRight size={13} /> Buka Onboarding Klien</Btn>
              </div>
            </div>
          )}

          <div className="row jb ac" style={{ marginBottom: 8 }}>
            <span className="tiny muted upper">Penerimaan Klien (SA 220 / SMM)</span>
            {readiness.prospect
              ? <span className="tiny mono muted" title={'Tertaut lewat ' + (readiness.linkedBy === 'source' ? 'field source' : 'kecocokan nama')}>{readiness.prospect.id}{readiness.composite !== null ? ' · skor ' + readiness.composite.toFixed(2) + '/5' : ''}</span>
              : <span className="tiny muted">belum ada prospek</span>}
          </div>
          <div style={{ display: 'grid', gap: 0, marginBottom: 12 }}>
            {readiness.rows.map((r, i) => (
              <div key={r.key} className="row gap8" style={{ padding: '8px 0', borderBottom: i < readiness.rows.length - 1 ? '1px solid var(--line-soft)' : 0, alignItems: 'flex-start' }}>
                <span style={{ color: READY_COLOR[r.status], flex: '0 0 16px', marginTop: 1 }}>
                  {r.status === 'ok' ? <I.checkCircle size={16} /> : r.status === 'issue' ? <I.alert size={16} /> : <I.clock size={16} />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row jb ac gap6">
                    <span style={{ fontSize: 12, fontWeight: r.status === 'issue' ? 700 : 400 }}>{r.label}</span>
                    <span className="tiny muted mono">{r.score !== null ? r.score + '/5' : '—'} · {r.weight}%</span>
                  </div>
                  {/* Dasar penilaian SELALU disebut — baris tanpa dasar adalah
                      centang yang tak bisa diperiksa siapa pun. */}
                  <div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 2 }}>{r.basis}</div>
                </div>
              </div>
            ))}
          </div>

          {readiness.feeMismatch && (
            <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginBottom: 12 }}>
              <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.4 }}>
                Nilai peluang Rp {fmt(readiness.feeMismatch.opp / 1e6, 0)} jt ≠ fee prospek Rp {fmt(readiness.feeMismatch.prospect / 1e6, 0)} jt — dua angka untuk satu perikatan.
              </div>
            </div>
          )}

          <div className="panel" style={{ padding: '10px 12px', background: VERDICT_BG[readiness.verdict.state], borderColor: 'transparent' }}>
            <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.45 }}>{readiness.verdict.text}</div>
            <div className="row gap6 ac" style={{ marginTop: 7, flexWrap: 'wrap' }}>
              {([['Akseptasi', readiness.gates.acceptance], ['PMPJ', readiness.gates.pmpj], ['Surat SA 210', readiness.gates.letter], ['Konversi', readiness.gates.converted]] as [string, boolean][]).map(([lbl, done]) => (
                <span key={lbl} className={'badge ' + (done ? 'b-green' : 'b-gray')}>{done ? '✓' : '○'} {lbl}</span>
              ))}
            </div>
          </div>
        </div>
    </Overlay>
  );
}

/* ---------------- Billing & Invoicing ---------------- */
const INV_STATUS = { Paid: 'green', Partial: 'amber', Sent: 'blue', Overdue: 'red', Draft: 'gray' };

function Billing() {
  const { fmt } = AMS;
  const nav = useNav();
  const [invoices, setInvoices] = useAmsPersist('invoices', () => AMS.INVOICES);
  const [filter, setFilter] = useStateD1('All');
  const [sel, setSel] = useStateD1(null);
  /* SoD finansial (Program E): pengelolaan faktur (buat/kirim/tandai lunas) =
     FIRMFIN_EDIT — capForWrite 'invoices' ikut diselaraskan (rbac.ts) supaya
     peran Finance Firma bisa bekerja tanpa ditolak senyap server. */
  const auth = useAuth();
  const canEdit = !!(auth && typeof auth.can === 'function' && auth.can(CAP.FIRMFIN_EDIT));
  const { logActivity } = useAudit();
  const who = (AMS.USER && AMS.USER.name) || 'Pengguna';

  const totalBilled = invoices.filter((i: any) => i.status !== 'Draft').reduce((s: any, i: any) => s + i.amount, 0);
  const collected = invoices.reduce((s: any, i: any) => s + i.paid, 0);
  const outstanding = totalBilled - collected;
  const overdue = invoices.filter((i: any) => i.status === 'Overdue').reduce((s: any, i: any) => s + (i.amount - i.paid), 0);

  const shown = filter === 'All' ? invoices : invoices.filter((i: any) => i.status === filter);
  const markPaid = (id: any) => {
    if (!canEdit) return;
    const i = invoices.find((x: { id: string }) => x.id === id);
    setInvoices((list: any) => list.map((x: { id: string; amount: number; status: string }) => x.id === id ? { ...x, paid: x.amount, status: 'Paid' } : x));
    logActivity && logActivity({ who, action: 'INV_PAID', detail: `Faktur ${id} ditandai lunas${i ? ' · ' + i.client : ''}` });
  };
  const send = (id: any) => {
    if (!canEdit) return;
    const i = invoices.find((x: { id: string }) => x.id === id);
    setInvoices((list: any) => list.map((x: { id: string; status: string }) => x.id === id ? { ...x, status: 'Sent' } : x));
    logActivity && logActivity({ who, action: 'INV_SENT', detail: `Faktur ${id} dikirim${i ? ' · ' + i.client : ''}` });
  };
  const selInv = sel ? invoices.find((i: any) => i.id === sel) : null;
  const [showNew, setShowNew] = useStateD1(false);
  const addInv = (inv: any) => {
    if (!canEdit) return;
    const id = 'INV-2026-0' + (46 + invoices.length);
    setInvoices((list: any) => [{ id, paid: 0, status: 'Draft', ...inv }, ...list]);
    logActivity && logActivity({ who, action: 'INV_CREATE', detail: `Faktur baru ${id} dibuat${inv.client ? ' · ' + inv.client : ''}` });
  };

  return (
    <>
      <SubBar moduleId="billing" right={
        <div className="row gap8 ac">
          <Seg options={['All', 'Draft', 'Sent', 'Overdue', 'Paid']} value={filter} onChange={setFilter} />
          {canEdit
            ? <Btn sm variant="primary" onClick={() => setShowNew(true)}><I.plus size={14} /> Faktur Baru</Btn>
            : <span className="chip tiny muted" title="Pengelolaan faktur dibatasi peran Finance Firma / Partner (SoD finansial)"><I.lock size={11} /> Read-only</span>}
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(totalBilled / 1e9, 1) + ' M'} label="Total Ditagih" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(collected / 1e9, 1) + ' M'} label="Terkumpul" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(outstanding / 1e6, 0) + ' jt'} label="Outstanding" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(overdue / 1e6, 0) + ' jt'} label="Jatuh Tempo Lewat" accent="var(--red)" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: selInv ? '1fr 340px' : '1fr', gap: 12, alignItems: 'start' }}>
          <Panel noBody>
            <div className="panel-h"><h3>Daftar Faktur</h3><div style={{ flex: 1 }} /><span className="tiny muted">{shown.length} faktur · klik untuk detail</span></div>
            <table className="dtbl">
              <thead><tr><th>No. Faktur</th><th>Klien</th><th>Termin</th><th className="num">Nilai</th><th className="num">Dibayar</th><th>Jatuh Tempo</th><th>Status</th></tr></thead>
              <tbody>
                {shown.map((i: any) => (
                  <tr key={i.id} className={i.id === sel ? 'sel' : ''} onClick={() => setSel(i.id)} style={{ cursor: 'pointer' }}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{i.id}</td>
                    <td className="truncate" style={{ maxWidth: 170, fontWeight: 600 }}>{i.client.replace('PT ', '')}</td>
                    <td className="tiny muted">{i.milestone}</td>
                    <td className="num">{fmt(i.amount / 1e6, 0)} jt</td>
                    <td className="num muted">{i.paid ? fmt(i.paid / 1e6, 0) + ' jt' : '—'}</td>
                    <td className="mono tiny" style={{ color: i.status === 'Overdue' ? 'var(--red)' : 'var(--ink-3)' }}>{new Date(i.due).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    <td><Badge kind={(INV_STATUS as any)[i.status]}>{i.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={3}>TOTAL</td><td className="num">{fmt(shown.reduce((s: any, i: any) => s + i.amount, 0) / 1e6, 0)} jt</td><td className="num">{fmt(shown.reduce((s: any, i: any) => s + i.paid, 0) / 1e6, 0)} jt</td><td colSpan={2}></td></tr></tfoot>
            </table>
          </Panel>

          {selInv && (
            <Panel noBody>
              <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
                <div className="row jb ac"><span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{selInv.id}</span><Badge kind={(INV_STATUS as any)[selInv.status]}>{selInv.status}</Badge></div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>{selInv.client}</div>
                <div className="tiny muted mono">{selInv.eng} · {selInv.milestone}</div>
              </div>
              <div style={{ padding: 14 }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <KvBox label="Nilai Faktur" v={'Rp ' + fmt(selInv.amount / 1e6, 0) + ' jt'} />
                  <KvBox label="Sisa Tagihan" v={'Rp ' + fmt((selInv.amount - selInv.paid) / 1e6, 0) + ' jt'} accent={selInv.amount - selInv.paid > 0 ? 'var(--amber)' : 'var(--green)'} />
                  <KvBox label="Diterbitkan" v={new Date(selInv.issued).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} />
                  <KvBox label="Jatuh Tempo" v={new Date(selInv.due).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} accent={selInv.status === 'Overdue' ? 'var(--red)' : null} />
                </div>
                {selInv.status === 'Overdue' && <div className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent', marginBottom: 12 }}><div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span className="tiny" style={{ fontWeight: 600 }}>Faktur melewati jatuh tempo — kirim pengingat / eskalasi collections.</span></div></div>}
                <div className="row gap8" style={{ flexWrap: 'wrap' }}>
                  {canEdit && selInv.status === 'Draft' && <Btn sm variant="primary" onClick={() => send(selInv.id)}><I.send size={13} /> Kirim Faktur</Btn>}
                  {canEdit && selInv.status !== 'Paid' && selInv.status !== 'Draft' && <Btn sm variant="primary" onClick={() => markPaid(selInv.id)}><I.check size={13} /> Tandai Lunas</Btn>}
                  <Btn sm onClick={() => {
                    if (!selInv) return;
                    amsExportPdf({
                      kind: 'invoice', scope: 'firm', fileName: `Faktur - ${selInv.id} - ${selInv.client}.pdf`,
                      firm: AMS.FIRM.name || 'KAP Wijaya Hartono & Rekan',
                      title: 'Faktur Jasa Audit',
                      refNo: selInv.id,
                      meta: [selInv.client, selInv.eng + ' · ' + selInv.milestone, 'Status: ' + selInv.status],
                      blocks: [
                        { type: 'kv', rows: [
                          ['Klien', selInv.client],
                          ['No. Faktur', selInv.id],
                          ['Engagement', selInv.eng],
                          ['Termin', selInv.milestone],
                          ['Nilai Faktur', 'Rp ' + fmt(selInv.amount / 1e6, 0) + ' jt'],
                          ['Dibayar', 'Rp ' + fmt(selInv.paid / 1e6, 0) + ' jt'],
                          ['Sisa Tagihan', 'Rp ' + fmt((selInv.amount - selInv.paid) / 1e6, 0) + ' jt'],
                          ['Tanggal Terbit', new Date(selInv.issued).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })],
                          ['Jatuh Tempo', new Date(selInv.due).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })],
                          ['Status', selInv.status],
                        ] },
                      ],
                    }).catch(() => {});
                  }}><I.download size={13} /> Cetak</Btn>
                  <Btn sm onClick={() => nav('firmfinance')}><I.coins size={13} /> Ke Firm Finance</Btn>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div></div>
      {showNew && <InvForm onClose={() => setShowNew(false)} onAdd={(i: any) => { addInv(i); setShowNew(false); }} />}
    </>
  );
}

const INV_FORM_INIT = { clientId: '', milestone: 'Termin 1 (50%)', amount: 500000000, issued: '2026-03-09', due: '2026-04-15', eng: '' };

function InvForm({ onClose, onAdd }: any) {
  const uid = React.useId();
  const { fmt } = AMS;
  const clients: any = AMS.CLIENTS;
  const [d, setD] = useStateD1({ ...INV_FORM_INIT, clientId: clients[0].id });
  const set = (k: any, v: any) => setD((s: any) => ({ ...s, [k]: v }));
  const dueErr = dueBeforeIssued(d.issued, d.due);
  const valid = +d.amount > 0 && !!d.issued && !!d.due && !dueErr;
  const submit = () => { const c = clients.find((x: any) => x.id === d.clientId); onAdd({ clientId: d.clientId, client: c.name, eng: d.eng || '—', milestone: d.milestone, amount: +d.amount, issued: d.issued, due: d.due }); };
  return (
    <Overlay
      variant="modal"
      size="md"
      onClose={onClose}
      isDirty={() => JSON.stringify(d) !== JSON.stringify({ ...INV_FORM_INIT, clientId: clients[0].id })}
      bodyStyle={{ padding: 16, display: 'grid', gap: 12 }}
      header={(
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.receipt size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>Faktur Baru</div><div className="tiny" style={{ color: '#bcd6e4' }}>Terbitkan tagihan ke klien (status awal Draft)</div></div>
          <button aria-label="Tutup" className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
      )}
      footer={(
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={submit}><I.check size={14} /> Terbitkan Faktur</Btn>
        </div>
      )}
    >
        <div>
          <div className="field"><label htmlFor={uid+'-klien'}>Klien</label><select id={uid+'-klien'} className="select" value={d.clientId} onChange={(e: any) => set('clientId', e.target.value)}>{clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label htmlFor={uid+'-termin'}>Termin</label><select id={uid+'-termin'} className="select" value={d.milestone} onChange={(e: any) => set('milestone', e.target.value)}>{['Termin 1 (50%)', 'Termin 2 (30%)', 'Termin 3 (20%)', 'Final (100%)'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label htmlFor={uid+'-engagement-opsional'}>Engagement (opsional)</label><input id={uid+'-engagement-opsional'} className="input mono" value={d.eng} onChange={(e: any) => set('eng', e.target.value)} placeholder="ENG-2025-014" /></div>
          </div>
          <div className="field"><label htmlFor={uid+'-nilai-rp'}>Nilai (Rp)</label><input id={uid+'-nilai-rp'} className="input mono" type="number" value={d.amount} onChange={(e: any) => set('amount', +e.target.value)} style={{ textAlign: 'right' }} /></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label htmlFor={uid+'-tanggal-terbit'}>Tanggal Terbit</label><input id={uid+'-tanggal-terbit'} className="input" type="date" value={d.issued} onChange={(e: { target: { value: string } }) => set('issued', e.target.value)} /></div>
            <div className="field"><label htmlFor={uid+'-jatuh-tempo'}>Jatuh Tempo</label><input id={uid+'-jatuh-tempo'} className="input" type="date" value={d.due} min={d.issued} onChange={(e: { target: { value: string } }) => set('due', e.target.value)} style={{ borderColor: dueErr ? 'var(--red)' : undefined }} /></div>
          </div>
          {dueErr && <div className="tiny" style={{ color: 'var(--red)' }}>Tanggal jatuh tempo tidak boleh sebelum tanggal terbit.</div>}
          <div className="tiny muted mono">Total: Rp {fmt(+d.amount || 0)}</div>
        </div>
    </Overlay>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { Billing, SalesPipeline };
