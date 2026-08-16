/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAuth, useNav } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { AccessDenied, Avatar, Badge, Btn, Panel, Stat, Tabs } from './ui';
import {
  attendCheck, competencyCoverage, competencyLevel, enrolCheck, enrolmentState,
  recruitmentSummary, requisitionState,
} from './canon_talent';
import type { TalentRequisition } from './canon_talent';

/* ============================================================
   Asseris — People & Compliance (NEW)
   Rekrutmen & Onboarding Staf  ·  Pelatihan & Kompetensi
   ============================================================ */
const { useState: usePCtal } = React;

const REQ_STAT = { 'Dibuka': 'blue', 'Persetujuan': 'amber', 'Terisi': 'green', 'Ditutup': 'gray' };
const PRIO_C = { Tinggi: 'var(--red)', Sedang: 'var(--amber)', Rendah: 'var(--green)' };

function Recruitment() {
  const A: any = AMS;
  const nav = useNav();
  const authRec = useAuth();
  const [tab, setTab] = usePCtal('reqs');
  const [cands, setCands] = useAmsPersist('pc.cands', () => A.CANDIDATES);
  const [hires, setHires] = useAmsPersist('pc.onboard', () => A.ONBOARDING_HIRES);
  const STAGES = A.CAND_STAGES;

  /* PRD sdm-kepatuhan PR-6 — `filled` & jumlah pipeline DITURUNKAN dari register
     kandidat/onboarding; hanya lamaran masuk yang tetap angka DINYATAKAN, karena
     ia memang berasal dari portal di luar aplikasi. */
  const sum = recruitmentSummary(A.REQUISITIONS, cands, hires);
  const stateOf = (r: TalentRequisition) => requisitionState(r, cands, hires, STAGES);
  const openReqs = sum.openRequisitions;
  const offers = sum.offersOutstanding;
  const avgFill = A.HCM_ANALYTICS.timeToFill;

  const advance = (id: any, dir: any) => setCands((list: any) => list.map((c: any) => {
    if (c.id !== id) return c;
    const i = STAGES.indexOf(c.stage) + dir;
    return { ...c, stage: STAGES[Math.max(0, Math.min(STAGES.length - 1, i))] };
  }));
  const toggleTask = (hid: any, ti: any) => setHires((list: any) => list.map((h: any) => h.id === hid ? { ...h, tasks: h.tasks.map((t: any, i: any) => i === ti ? { ...t, done: !t.done } : t), progress: Math.round(h.tasks.filter((t: any, i: any) => (i === ti ? !t.done : t.done)).length / h.tasks.length * 100) } : h));

  const STAGE_C = { 'Pelamar': '#647889', 'Penyaringan': '#5b3fa6', 'Wawancara': '#005085', 'Penawaran': '#9a6a00', 'Diterima': '#0a6b73' };
  const tabs = [{ id: 'reqs', label: 'Requisisi', count: A.REQUISITIONS.length }, { id: 'pipeline', label: 'Pipeline Kandidat', count: cands.length }, { id: 'onboard', label: 'Onboarding', count: hires.length }];

  // 2026-07-05 — modul manajemen SDM: hanya Partner + Admin & HR (HR_MODULE_VIEW). Pegawai lain diblokir.
  if (!(authRec && typeof authRec.can === 'function' && authRec.can(CAP.HR_MODULE_VIEW))) return (<><SubBar moduleId="recruitment" /><AccessDenied moduleId="recruitment" /></>);

  return (
    <>
      <SubBar moduleId="recruitment" right={<div className="row gap8 ac"><Badge kind="blue">{openReqs} lowongan aktif</Badge><span className="chip tiny muted" title="Read-only — pengelolaan populasi requisisi menyusul (fase populasi editable)"><I.lock size={11} /> Read-only</span></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={openReqs} label="Requisisi Terbuka" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }} title="Kandidat yang benar-benar ada di register pipeline"><Stat value={sum.inPipeline} label="Kandidat di Pipeline" accent="var(--blue)" delta={sum.applicantsDeclared == null ? undefined : sum.applicantsDeclared + ' lamaran masuk (portal)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={offers} label="Penawaran Berjalan" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={avgFill == null ? 'belum dapat dihitung' : avgFill + ' hari'} label="Rata-rata Time-to-Fill" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'reqs' && (
            <table className="dtbl">
              <thead><tr><th>ID / Posisi</th><th>Divisi</th><th>Hiring Mgr</th><th className="num">Terisi</th><th className="num">Pipeline</th><th className="num">Lamaran</th><th>Prioritas</th><th>Target</th><th>Status</th></tr></thead>
              <tbody>
                {A.REQUISITIONS.map((r: any) => (
                  <tr key={r.id}>
                    <td><div style={{ fontWeight: 600 }}>{r.title}</div><div className="tiny muted mono">{r.id} · {r.reason}</div></td>
                    <td className="tiny">{r.dept}</td>
                    <td><div className="row ac gap6"><Avatar name={A.byId(r.hiringMgr).name} size={22} /><span className="tiny truncate" style={{ maxWidth: 80 }}>{A.byId(r.hiringMgr).name.split(' ')[0]}</span></div></td>
                    <td className="num mono" style={{ fontWeight: 700, color: stateOf(r).overfilled ? 'var(--red)' : undefined }} title={stateOf(r).filledBy.join(' · ') || 'belum ada yang diterima'}>{stateOf(r).filled}/{stateOf(r).count}</td>
                    <td className="num mono">{stateOf(r).inPipeline}</td>
                    <td className="num mono muted" title="Lamaran masuk menurut portal/ATS — di luar register aplikasi">{stateOf(r).applicantsDeclared ?? '—'}</td>
                    <td><span className="row ac gap4 tiny" style={{ color: (PRIO_C as any)[r.priority], fontWeight: 600 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />{r.priority}</span></td>
                    <td className="tiny muted">{new Date(r.target).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    <td><Badge kind={(REQ_STAT as any)[r.status]}>{r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'pipeline' && (
            <div style={{ padding: 14, overflowX: 'auto' }}>
              <div className="row" style={{ gap: 10, alignItems: 'flex-start', minWidth: 880 }}>
                {STAGES.map((st: any) => {
                  const col = cands.filter((c: any) => c.stage === st);
                  return (
                    <div key={st} style={{ flex: 1, minWidth: 165 }}>
                      <div className="row ac jb" style={{ marginBottom: 8 }}>
                        <span className="row ac gap6 tiny" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', color: (STAGE_C as any)[st] }}><span style={{ width: 8, height: 8, borderRadius: 2, background: (STAGE_C as any)[st] }} />{st}</span>
                        <span className="tiny muted">{col.length}</span>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {col.map((c: any) => (
                          <div key={c.id} className="panel" style={{ padding: '9px 10px', boxShadow: 'none', borderLeft: '3px solid ' + (STAGE_C as any)[st] }}>
                            <div className="row ac gap8" style={{ marginBottom: 5 }}>
                              <Avatar name={c.name} size={24} />
                              <div style={{ minWidth: 0, flex: 1 }}><div className="truncate" style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</div><div className="tiny muted">{c.cert} · {c.exp}</div></div>
                            </div>
                            <div className="row ac jb" style={{ marginBottom: 6 }}>
                              <span className="tiny muted truncate" style={{ maxWidth: 90 }}>{c.source}</span>
                              {c.rating > 0 && <span className="mono tiny" style={{ fontWeight: 700, color: c.rating >= 4.3 ? 'var(--green)' : 'var(--blue)' }}>★ {c.rating.toFixed(1)}</span>}
                            </div>
                            <div className="row gap4">
                              <button aria-label="Mundurkan tahap" className="btn sm" style={{ height: 20, flex: 1, padding: 0 }} disabled={STAGES.indexOf(c.stage) === 0} onClick={() => advance(c.id, -1)}><I.chevron size={12} style={{ transform: 'rotate(180deg)' }} /></button>
                              <button aria-label="Majukan tahap" className="btn sm" style={{ height: 20, flex: 1, padding: 0, color: STAGES.indexOf(c.stage) === STAGES.length - 1 ? 'var(--ink-4)' : 'var(--blue)' }} disabled={STAGES.indexOf(c.stage) === STAGES.length - 1} onClick={() => advance(c.id, 1)}><I.chevron size={12} /></button>
                            </div>
                          </div>
                        ))}
                        {!col.length && <div className="tiny muted" style={{ textAlign: 'center', padding: 12, border: '1px dashed var(--line)', borderRadius: 8 }}>—</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'onboard' && (
            <div style={{ padding: 14, display: 'grid', gap: 12 }}>
              {hires.map((h: any) => (
                <div key={h.id} className="panel" style={{ padding: 0, boxShadow: 'none' }}>
                  <div className="row ac jb" style={{ padding: '10px 13px', borderBottom: '1px solid var(--line)' }}>
                    <div className="row ac gap8"><Avatar name={h.name} size={30} /><div><div style={{ fontWeight: 700, fontSize: 13 }}>{h.name}</div><div className="tiny muted">{h.role} · mulai {new Date(h.start).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} · buddy {A.byId(h.buddy).name.split(' ')[0]}</div></div></div>
                    <div className="row ac gap8" style={{ minWidth: 160 }}><div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: h.progress + '%', height: '100%', borderRadius: 4, background: h.progress === 100 ? 'var(--green)' : 'var(--blue)' }} /></div><span className="mono tiny" style={{ fontWeight: 700 }}>{h.progress}%</span></div>
                  </div>
                  <div style={{ padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {h.tasks.map((t: any, i: any) => (
                      <div key={i} className="row ac gap8" onClick={() => toggleTask(h.id, i)} style={{ cursor: 'pointer', padding: '6px 9px', borderRadius: 7, border: '1px solid var(--line-soft)', background: t.done ? 'var(--green-bg)' : 'transparent' }}>
                        <span style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid ' + (t.done ? 'var(--green)' : 'var(--line-strong)'), background: t.done ? 'var(--green)' : 'transparent', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>{t.done && <I.check size={11} style={{ color: '#fff' }} />}</span>
                        <div style={{ minWidth: 0, flex: 1 }}><div className="tiny truncate" style={{ fontWeight: 500, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--ink-3)' : 'var(--ink)' }}>{t.t}</div></div>
                        <span className="chip tiny" style={{ flex: '0 0 auto' }}>{t.owner}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div></div>
    </>
  );
}

/* ============================================================
   Pelatihan & Kompetensi (Learning & Competency)
   ============================================================ */
const LVL = [1, 2, 3, 4, 5];
function lvlColor(actual: any, req: any) {
  if (actual >= req) return { bg: 'var(--green-bg)', fg: 'var(--green)' };
  if (actual === req - 1) return { bg: 'var(--amber-bg)', fg: 'var(--amber)' };
  return { bg: 'var(--red-bg)', fg: 'var(--red)' };
}

function Learning() {
  const A: any = AMS;
  const auth = useAuth();
  const [tab, setTab] = usePCtal('matrix');
  /* PR-6 — pendaftaran berkunci empId. Bentuk lama (`[{id, enrolled: n}]`) masih
     DIBACA lewat `normaliseEnrolment`; jumlahnya dihormati sebagai `anonymousCount`
     tetapi ia tidak menjadi nama. */
  const [enroll, setEnroll] = useAmsPersist('pc.enroll.v2', () => A.TRAINING_ENROLMENT);
  const [pickEmp, setPickEmp] = usePCtal('');
  const uidL = React.useId();
  const staff = A.STAFF, COMP = A.COMPETENCIES, REQ = A.COMPETENCY_REQ, ACT = A.COMPETENCY_ACTUAL;
  /* #1/#2 — konfirmasi kehadiran pelatihan (admin/HR) → kredit SKP otomatis ke CPE Tracker.
     Store firm-scope: tulis butuh ENGAGEMENT_MANAGE (Partner/Manager), ditegakkan server. */
  const [attendance, setAttendance] = useAmsPersist('trainingAttendance.v1', () => ({}));
  const canConfirm = !auth || typeof auth.can !== 'function' || auth.can(CAP.ENGAGEMENT_MANAGE);
  const me = (auth && auth.user && auth.user.name) || 'Admin';
  const attToday = (() => { try { return new Date().toLocaleDateString('en-CA'); } catch (e) { return '2026-03-09'; } })();
  const isConfirmed = (trId: string, empId: string) => !!(attendance as any)[trId]?.[empId]?.confirmed;
  const attendOk = (trId: string, empId: string) => {
    const t = A.TRAINING_CATALOG.find((x: any) => x.id === trId);
    return t ? attendCheck(enrolOf(t), empId) : { ok: false, reason: 'Pelatihan tidak dikenal.' };
  };
  const toggleAttend = (trId: string, empId: string) => setAttendance((a: any) => {
    /* Gerbang ditegakkan di sini JUGA: kehadiran tanpa pendaftaran memunculkan
       kredit SKP tanpa jejak siapa yang pernah mendaftar. */
    if (!(a[trId] || {})[empId]?.confirmed && !attendOk(trId, empId).ok) return a;
    const cur = { ...(a[trId] || {}) };
    if (cur[empId]?.confirmed) delete cur[empId];
    else cur[empId] = { confirmed: true, by: me, at: attToday };
    return { ...a, [trId]: cur };
  });

  /* PR-6 — level efektif = penilaian dasar + pelatihan yang kehadirannya
     DIKONFIRMASI. Tanpa ini matriks kompetensi adalah cuplikan beku dan gap-nya
     tak pernah dapat menutup, apa pun pelatihan yang diikuti. */
  const lvlOf = (s: any, cid: any) => competencyLevel({
    empId: s.id, compId: cid, base: (ACT[s.id] || {})[cid], required: REQ[s.grade][cid],
    catalog: A.TRAINING_CATALOG, attendance: attendance as never,
  });
  const actualOf = (s: any, cid: any) => lvlOf(s, cid).level;
  const cov = competencyCoverage({
    roster: staff, competencies: COMP, required: REQ, actual: ACT,
    catalog: A.TRAINING_CATALOG, attendance: attendance as never,
  });
  const gapCount = cov.gaps;
  const coverage = cov.coveragePct;
  const upcoming = A.TRAINING_CATALOG.filter((t: any) => new Date(t.date) >= new Date(AMS.TODAY)).length;
  const enrolOf = (t: { id: string; seats: number }) => enrolmentState(t.id, t.seats, enroll);
  const seatsLeft = A.TRAINING_CATALOG.reduce((n: number, t: any) => n + enrolOf(t).seatsLeft, 0);
  const onRoster = (id: string) => staff.some((s: any) => s.id === id);

  const doEnroll = (trId: string) => {
    const t = A.TRAINING_CATALOG.find((x: any) => x.id === trId);
    if (!t) return;
    const chk = enrolCheck(enrolOf(t), pickEmp, onRoster(pickEmp));
    if (!chk.ok) return;
    setEnroll((cur: unknown) => {
      const map = (cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {}) as Record<string, string[]>;
      return { ...map, [trId]: [...(map[trId] || []), pickEmp] };
    });
  };
  const confirmedTotal = A.TRAINING_CATALOG.reduce((n: any, t: any) => n + Object.values((attendance as any)[t.id] || {}).filter((r: any) => r?.confirmed).length, 0);
  const tabs = [{ id: 'matrix', label: 'Matriks Kompetensi' }, { id: 'catalog', label: 'Katalog Pelatihan', count: A.TRAINING_CATALOG.length }, { id: 'attend', label: 'Kehadiran & SKP', count: confirmedTotal || null }];

  // 2026-07-05 — matriks kompetensi = data SDM agregat: hanya Partner + Admin & HR (HR_MODULE_VIEW).
  if (!(auth && typeof auth.can === 'function' && auth.can(CAP.HR_MODULE_VIEW))) return (<><SubBar moduleId="learning" /><AccessDenied moduleId="learning" /></>);

  return (
    <>
      <SubBar moduleId="learning" right={<div className="row gap8 ac"><Badge kind="blue">{COMP.length} kompetensi inti</Badge><span className="chip tiny muted" title="Read-only — penjadwalan katalog pelatihan menyusul (fase populasi editable)"><I.lock size={11} /> Read-only</span></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={coverage + '%'} label="Kompetensi Terpenuhi" accent={coverage >= 80 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={gapCount} label="Gap Kompetensi" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={upcoming} label="Pelatihan Mendatang" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={seatsLeft} label="Kursi Tersedia" accent="var(--blue)" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'matrix' && (
            <div style={{ padding: 14, overflowX: 'auto' }}>
              <table className="dtbl" style={{ minWidth: 820 }}>
                <thead><tr><th style={{ position: 'sticky', left: 0, background: 'var(--surface-2)', minWidth: 160 }}>Karyawan</th>{COMP.map((c: any) => <th key={c.id} className="num" style={{ minWidth: 78, fontSize: 11, verticalAlign: 'bottom' }}>{c.name}</th>)}<th className="num">Gap</th></tr></thead>
                <tbody>
                  {staff.map((s: any) => {
                    const gaps = COMP.filter((c: any) => actualOf(s, c.id) < REQ[s.grade][c.id]).length;
                    return (
                      <tr key={s.id}>
                        <td style={{ position: 'sticky', left: 0, background: 'var(--surface)' }}><div className="row ac gap8"><Avatar name={s.name} size={22} /><div style={{ minWidth: 0 }}><div className="truncate tiny" style={{ fontWeight: 600 }}>{s.name}</div><div className="tiny muted">{s.grade}</div></div></div></td>
                        {COMP.map((c: any) => {
                          const a = actualOf(s, c.id), r = REQ[s.grade][c.id], col = lvlColor(a, r);
                          return <td key={c.id} className="num" style={{ textAlign: 'center' }}><span title={c.name + ': ' + a + '/' + r} style={{ display: 'inline-block', minWidth: 34, padding: '3px 0', borderRadius: 5, background: col.bg, color: col.fg, fontWeight: 700, fontSize: 11 }} className="mono">{a}<span style={{ opacity: .5 }}>/{r}</span></span></td>;
                        })}
                        <td className="num"><Badge kind={gaps === 0 ? 'green' : gaps <= 2 ? 'amber' : 'red'}>{gaps}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="row gap12 tiny muted" style={{ marginTop: 10 }}>
                <span className="row ac gap4"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--green-bg)' }} /> Memenuhi</span>
                <span className="row ac gap4"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--amber-bg)' }} /> Mendekati (−1)</span>
                <span className="row ac gap4"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--red-bg)' }} /> Gap signifikan</span>
                <span>· angka = level efektif / level disyaratkan menurut jenjang (skala 1–5)</span>
                {cov.closedByTraining > 0 && <span style={{ color: 'var(--green)' }}>· {cov.closedByTraining} gap tertutup oleh pelatihan terkonfirmasi</span>}
              </div>
            </div>
          )}

          {tab === 'catalog' && (<>
            <div className="row ac gap8" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <label htmlFor={uidL + '-enrol-emp'} className="tiny muted">Daftarkan peserta:</label>
              <select id={uidL + '-enrol-emp'} className="select" style={{ maxWidth: 260 }} value={pickEmp} onChange={(e: { target: { value: string } }) => setPickEmp(e.target.value)}>
                <option value="">— pilih personel —</option>
                {staff.map((x: any) => <option key={x.id} value={x.id}>{x.name} · {x.grade}</option>)}
              </select>
              <span className="tiny muted">Pendaftaran dicatat atas NAMA; kehadiran hanya dapat dikonfirmasi untuk peserta terdaftar.</span>
            </div>
            <table className="dtbl">
              <thead><tr><th>Program</th><th>Penyelenggara</th><th>Jenis</th><th className="num">SKP</th><th>Jadwal</th><th style={{ width: 130 }}>Kuota</th><th></th></tr></thead>
              <tbody>
                {A.TRAINING_CATALOG.map((t: any) => {
                  const est = enrolOf(t);
                  const en = est.enrolled.length + est.anonymousCount;
                  const full = est.full;
                  const chk = enrolCheck(est, pickEmp, onRoster(pickEmp));
                  const comp = COMP.find((c: any) => c.id === t.comp);
                  return (
                    <tr key={t.id}>
                      <td><div style={{ fontWeight: 600 }}>{t.title}</div><div className="tiny muted">{comp ? comp.name : ''} · {t.fmt} · {t.hours} jam</div></td>
                      <td className="tiny">{t.provider}</td>
                      <td><Badge kind={t.mode === 'Terstruktur' ? 'blue' : 'gray'}>{t.mode}</Badge></td>
                      <td className="num mono" style={{ fontWeight: 700 }}>{t.skp}</td>
                      <td className="tiny muted">{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                      <td><div className="row ac gap8"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (en / t.seats * 100) + '%', height: '100%', borderRadius: 3, background: full ? 'var(--amber)' : 'var(--blue)' }} /></div><span className="tiny mono" title={est.enrolled.map((id: string) => (staff.find((x: any) => x.id === id) || {}).name || id).join(' · ') || 'belum ada peserta terdaftar'}>{en}/{t.seats}</span></div></td>
                      <td><Btn sm variant={chk.ok ? 'primary' : ''} disabled={!chk.ok} style={{ opacity: chk.ok ? 1 : .5 }} title={chk.ok ? 'Daftarkan peserta terpilih' : chk.reason} onClick={() => doEnroll(t.id)}>{full ? 'Penuh' : 'Daftar'}</Btn></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>)}

          {tab === 'attend' && (
            <div style={{ padding: 14, overflowX: 'auto' }}>
              <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>
                {canConfirm
                  ? <>Konfirmasi kehadiran pelatihan per karyawan — SKP otomatis dikreditkan ke <b>CPE / PPL Tracker</b> begitu dikonfirmasi (tanpa input manual ganda). Klik sel untuk konfirmasi/batal.</>
                  : <><I.lock size={11} /> Hanya Admin/HR (Partner/Manajer) yang dapat mengonfirmasi kehadiran. Anda melihat status saja.</>}
              </div>
              <table className="dtbl" style={{ minWidth: 760 }}>
                <thead><tr>
                  <th style={{ position: 'sticky', left: 0, background: 'var(--surface-2)', minWidth: 150 }}>Karyawan</th>
                  {A.TRAINING_CATALOG.map((t: any) => <th key={t.id} className="num" style={{ minWidth: 70, fontSize: 11, verticalAlign: 'bottom' }} title={t.title}>{t.id}<div className="tiny muted mono">{t.skp} SKP</div></th>)}
                  <th className="num">Σ SKP</th>
                </tr></thead>
                <tbody>
                  {staff.map((s: any) => {
                    const gained = A.TRAINING_CATALOG.reduce((n: any, t: any) => n + (isConfirmed(t.id, s.id) ? t.skp : 0), 0);
                    return (
                      <tr key={s.id}>
                        <td style={{ position: 'sticky', left: 0, background: 'var(--surface)' }}><div className="row ac gap8"><Avatar name={s.name} size={22} /><span className="truncate tiny" style={{ fontWeight: 600 }}>{s.name}</span></div></td>
                        {A.TRAINING_CATALOG.map((t: any) => {
                          const on = isConfirmed(t.id, s.id);
                          const ach = attendOk(t.id, s.id);
                          const allowed = on || (canConfirm && ach.ok);
                          return (
                            <td key={t.id} className="num" style={{ textAlign: 'center' }}>
                              <button className="btn sm" aria-label={(on ? 'Batalkan kehadiran ' : 'Konfirmasi kehadiran ') + s.name + ' pada ' + t.title} disabled={!allowed} onClick={() => toggleAttend(t.id, s.id)}
                                title={on ? ((attendance as any)[t.id][s.id].by + ' · ' + (attendance as any)[t.id][s.id].at) : (!canConfirm ? 'Hanya Admin/HR' : ach.ok ? 'Konfirmasi hadir' : ach.reason)}
                                style={{ width: 26, height: 22, padding: 0, background: on ? 'var(--green-bg)' : 'transparent', color: on ? 'var(--green)' : 'var(--ink-4)', borderColor: on ? 'var(--green)' : 'var(--line)', opacity: allowed ? 1 : .45 }}>
                                {on ? <I.check size={12} /> : ach.ok ? '○' : '·'}
                              </button>
                            </td>
                          );
                        })}
                        <td className="num mono" style={{ fontWeight: 700, color: gained ? 'var(--green)' : 'var(--ink-4)' }}>{gained}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Pelatihan terstruktur tersinkron ke <b>CPE / PPL Tracker</b> (SKP IAPI). Level kompetensi disyaratkan meningkat seiring jenjang — gap menjadi dasar penyusunan rencana pelatihan & rencana pengembangan individu.</div>
      </div></div>
    </>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { Learning, Recruitment };
