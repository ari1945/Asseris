/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAuth, useNav } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { amsExportXlsx } from './export_xlsx';
import { amsExportPdf } from './export_pdf';
import { AccessDenied, Avatar, Badge, Btn, Donut, Overlay, Panel, Seg, Stat, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { FeeDependencyTab, LongAssociationTab, NASPreApprovalTab } from './view_independence_parts';
import { HCMAnalytics, Profile360Drawer } from './view_pc_hcm';
import { rotTier } from './data_licensing';
import { resolveEmpId } from './ethics_compliance';
import {
  INDEP_CHAIN, INDEP_LEVEL_LABEL, INDEP_PERIOD, indepApprRecord, indepCanWrite, indepDateLabel,
  indepLevel, indepRotationAckRelevant, indepStamp, indepStepAuthority, indepUnattributed, nextThreatId,
  type IndepActor, type IndepApprRec,
} from './indep_approval';
import { tenureOf, yearOf } from './canon_hcm';
import { appraisalOf, empIdsOf, nextEmpId } from './hcm_derive';
import type { Appraisal } from './hcm_derive';
import type { PerfGoal, PerfPersonInput } from './canon_perf';
import { cpeFromTraining, type TrainingCourse } from './cpe_training';
import { PPL_SHORTFALL_LABEL, SKP_TOPIC_LABEL, isSkpTopic, pplReqOn, pplStatusFromEntries, pplYearOf, skpInYear } from './canon_ppl';

/* ============================================================
   Asseris — HCM + CPE/PPL Tracker + Independence (Package E)
   ============================================================ */
const { useState: useStateE, useMemo: useMemoE } = React;

/* ---------------- HCM (People) ---------------- */
const GRADE_ORDER = ['Partner', 'Manager', 'Senior', 'Junior'];
const GRADE_COLOR = { Partner: '#002C3F', Manager: '#005085', Senior: '#0a6b73', Junior: '#5b3fa6' };

/* Pembaca ber-tipe atas namespace AMS — tanpa `:any` baru (ratchet W15: satu `:any`
   baru melucuti suppression SELURUH berkas, bukan barisnya saja). */
type IdRow = { id?: string };
/* Fallback disamakan dengan idiom yang sudah ada di berkas ini (`firmName`, modul
   independence) — label kategori, bukan identitas firma yang dikarang. */
const amsFirmName = (): string => ((AMS.FIRM as unknown as { name?: string } | undefined)?.name) || 'Kantor Akuntan Publik';
const amsIdRows = (k: 'STAFF' | 'FIRM_STAFF' | 'EXITS'): readonly IdRow[] =>
  ((AMS as unknown as Record<string, unknown>)[k] as readonly IdRow[] | undefined) || [];
type PerfCycleDoc = { cycle?: string; people?: Record<string, PerfPersonInput | undefined>; goals?: Record<string, PerfGoal[] | undefined> };
const amsPerfCycle = (): PerfCycleDoc => ((AMS as unknown as { PERF_CYCLE?: PerfCycleDoc }).PERF_CYCLE) || {};

function HCM() {
  const { fmt } = AMS;
  const nav = useNav();
  const authHcm = useAuth();
  const [extra, setExtra] = useAmsPersist('staffExtra', []);
  const staff = [...extra, ...AMS.STAFF];
  const [sel, setSel] = useStateE((AMS.STAFF as any)[3].id);
  const [q, setQ] = useStateE('');
  const [grade, setGrade] = useStateE('All');
  const [showNew, setShowNew] = useStateE(false);
  const [mode, setMode] = useStateE('direktori');
  const [drawer, setDrawer] = useStateE(null);
  const today = String(AMS.TODAY || '');
  /* Id baru diambil dari blok 7xx yang KOSONG, diuji terhadap SELURUH himpunan id yang
     dikenal — roster audit, roster tambahan, firm-ops, register keluar, dan penambahan
     lokal. Pola lama `'EMP-' + (100 + list.length)` menabrak EMP-101 (Ayu Prasetya) pada
     penambahan KEDUA: id ganda berarti profil/payroll/cuti/SKP dua orang bercampur. */
  const addStaff = (s: any) => {
    setExtra((list: any) => {
      const id = nextEmpId(empIdsOf(list, amsIdRows('STAFF'), amsIdRows('FIRM_STAFF'), amsIdRows('EXITS')));
      if (!id) return list; /* blok habis — menolak menambah lebih baik daripada id milik orang lain */
      return [{ id, engagements: 0, rating: 4.0, util: 0, status: 'Aktif', joined: yearOf(today), ...s }, ...list];
    });
  };

  const filtered = staff.filter(s => (grade === 'All' || s.grade === grade) && (q === '' || s.name.toLowerCase().includes(q.toLowerCase())));
  const person = staff.find(s => s.id === sel) || staff[0];
  const counts = GRADE_ORDER.map(g => ({ g, n: staff.filter(s => s.grade === g).length }));

  /* K-06 lanjutan — wire tombol "Direktori" (dulu mati): ekspor XLSX tersegel
     direktori SDM — grade, sertifikasi, utilisasi & rating. */
  const [exporting, setExporting] = useStateE(false);
  const onExportDir = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = staff.map((s: { name: string; grade: string; cert?: string; util: number; rating: number; status: string }) => [
        s.name, s.grade, s.cert || '—', s.util + '%', s.rating.toFixed(1), s.status,
      ]);
      await amsExportXlsx({
        kind: 'hcm-directory', scope: 'firm', scopeId: undefined,
        fileName: 'Direktori SDM.xlsx',
        /* Menyegel identitas firma yang salah memberi otoritas pada isi yang keliru —
           nama firma dari SSOT `AMS.FIRM`, bukan literal di titik panggil. */
        firm: amsFirmName(),
        title: 'Direktori Sumber Daya Manusia',
        meta: [`${staff.length} karyawan · ${counts.find(c => c.g === 'Partner')?.n || 0} partner`,
          `Rata-rata utilisasi ${avgUtil}% · ${staff.filter((s: { status: string }) => s.status === 'Cuti').length} cuti`],
        sheets: [
          { name: 'Direktori', heading: 'Direktori SDM',
            columns: ['Nama', 'Grade', 'Sertifikasi', 'Utilisasi', 'Rating', 'Status'],
            rows, colWidths: [28, 12, 24, 10, 9, 12] },
        ],
      });
    } finally {
      setExporting(false);
    }
  };
  const avgUtil = Math.round(staff.reduce((s, p) => s + p.util, 0) / staff.length);
  /* K-02 — masa kerja dari klok SSOT, bukan `2026 - joined` yang salah satu tahun
     bagi SETIAP orang mulai 2027, tanpa suara. */
  const tenure = tenureOf(person.joined, today);

  /* Penilaian kinerja DITURUNKAN dari siklus kinerja (canon_perf lewat hcm_derive) —
     mesin yang sama yang dipakai drawer 360° dan modul `performance`.

     Yang dicabut: empat "dimensi" yang seluruhnya satu angka `rating` roster digeser
     +0,1 / −0,2 / 0 / −0,1. Tak ada penilai, tak ada periode, tak ada dasar — tetapi
     dirender persis seperti penilaian per-dimensi, sehingga pembaca wajar mengira ada
     yang menilainya. Untuk orang tanpa catatan kinerja, ketiadaannya kini dinyatakan
     dan pengguna diarahkan ke modul Siklus Kinerja. */
  const [perfAllE] = useAmsPersist('perfPeople', () => (amsPerfCycle().people || {}));
  const [perfGoalsE] = useAmsPersist('perfGoals', () => (amsPerfCycle().goals || {}));
  const apprais: Appraisal = useMemoE(
    () => {
      const recs = (perfAllE || {}) as Record<string, PerfPersonInput | undefined>;
      const gls = (perfGoalsE || {}) as Record<string, PerfGoal[] | undefined>;
      return appraisalOf(person.id, recs[person.id], gls[person.id]);
    },
    [person.id, perfAllE, perfGoalsE],
  );
  const perfCycleLabel = amsPerfCycle().cycle || '';

  // 2026-07-06 — Human Capital = direktori & profil detail seluruh staf: kewenangan Partner + HRD (HR_MODULE_VIEW).
  if (!(authHcm && typeof authHcm.can === 'function' && authHcm.can(CAP.HR_MODULE_VIEW))) return (<><SubBar moduleId="hcm" /><AccessDenied moduleId="hcm" /></>);

  return (
    <>
      <SubBar moduleId="hcm" right={<div className="row gap8 ac"><Seg options={[{ value: 'direktori', label: 'Direktori' }, { value: 'analitik', label: 'Analitik' }]} value={mode} onChange={setMode} /><Badge kind="blue">{staff.length} karyawan</Badge><Btn sm onClick={onExportDir} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Direktori'}</Btn><Btn sm variant="primary" onClick={() => setShowNew(true)}><I.plus size={14} /> Karyawan Baru</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        {mode === 'analitik' ? <HCMAnalytics /> : (<>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={staff.length} label="Total SDM" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={staff.filter(s => s.grade === 'Partner').length} label="Partner" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={avgUtil + '%'} label="Rata-rata Utilisasi" accent={avgUtil > 85 ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={staff.filter(s => s.status === 'Cuti').length} label="Sedang Cuti" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start' }}>
          <Panel noBody>
            <div className="panel-h"><h3>Direktori Karyawan</h3><div style={{ flex: 1 }} /><div className="global-search" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', height: 26, maxWidth: 170 }}><I.search2 size={13} style={{ color: 'var(--ink-4)' }} /><input style={{ color: 'var(--ink)' }} placeholder="Cari…" value={q} onChange={(e: any) => setQ(e.target.value)} /></div><Seg options={['All', ...GRADE_ORDER]} value={grade} onChange={setGrade} /></div>
            <table className="dtbl">
              <thead><tr><th>Karyawan</th><th>Jabatan</th><th>Sertifikasi</th><th className="num">Utilisasi</th><th className="num">Rating</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className={s.id === sel ? 'sel' : ''} onClick={() => setSel(s.id)} style={{ cursor: 'pointer' }}>
                    <td><div className="row ac gap8"><Avatar name={s.name} size={28} /><div style={{ minWidth: 0 }}><div className="truncate" style={{ fontWeight: 600 }}>{s.name}</div><div className="tiny muted mono">{s.id}</div></div></div></td>
                    <td><span className="badge" style={{ background: (GRADE_COLOR as any)[s.grade] + '1a', color: (GRADE_COLOR as any)[s.grade] }}>{s.grade}</span></td>
                    <td className="tiny muted">{s.cert}</td>
                    <td className="num"><span style={{ color: s.util > 92 ? 'var(--red)' : s.util > 85 ? 'var(--amber)' : 'var(--green)' }}>{s.util}%</span></td>
                    <td className="num mono">{s.rating.toFixed(1)}</td>
                    <td><Badge kind={s.status === 'Aktif' ? 'green' : 'amber'}>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel noBody>
            <div style={{ background: 'linear-gradient(120deg,var(--navy-700),var(--blue-solid))', color: 'var(--on-dark-fg)', padding: '16px 18px', display: 'flex', gap: 13, alignItems: 'center' }}>
              <Avatar name={person.name} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }} className="truncate">{person.name}</div>
                <div className="tiny" style={{ color: 'var(--on-dark-muted)' }}>{person.role} · {person.cert}</div>
              </div>
              <Badge kind={person.status === 'Aktif' ? 'green' : 'amber'}>{person.status}</Badge>
            </div>
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <KvBox label="ID Karyawan" v={person.id} />
                <KvBox label="Masa Kerja" v={tenure === null ? '—' : tenure + ' tahun (sejak ' + person.joined + ')'} />
                <KvBox label="Engagement Aktif" v={person.engagements} />
                <KvBox label="Skor Kinerja" v={apprais.score === null ? 'Belum dinilai' : apprais.score.toFixed(2) + ' / 5'} accent={apprais.score === null ? undefined : apprais.score >= 4.3 ? 'var(--green)' : 'var(--amber)'} />
              </div>
              <div className="row ac jb" style={{ marginBottom: 8 }}>
                <span className="tiny muted upper">Penilaian Kinerja{perfCycleLabel ? ' — ' + perfCycleLabel : ''}</span>
                {apprais.available && apprais.assessorName
                  ? <span className="tiny muted">Reviu manajer: {apprais.assessorName}{apprais.assessedAt ? ' · ' + apprais.assessedAt : ''}{apprais.seeded ? ' (contoh demo)' : ''}</span>
                  : apprais.available && <span className="tiny muted">Belum direviu manajer{apprais.nextStage ? ' · menunggu ' + apprais.nextStage : ''}</span>}
              </div>
              <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                {!apprais.available && (
                  <div style={{ padding: '14px 12px', textAlign: 'center', border: '1px dashed var(--line)', borderRadius: 8 }}>
                    <div className="tiny muted" style={{ marginBottom: 8 }}>{apprais.note}</div>
                    <Btn sm onClick={() => nav('performance', { from: 'hcm' })}><I.arrowRight size={12} /> Buka Siklus Kinerja</Btn>
                  </div>
                )}
                {apprais.dims.map(d => (
                  <div key={d.kpi}>
                    <div className="row jb tiny" style={{ marginBottom: 2 }}><span className="truncate">{d.kpi}</span><span className="mono" style={{ fontWeight: 700 }}>{d.score.toFixed(1)}</span></div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (d.score / 5 * 100) + '%', height: '100%', borderRadius: 3, background: d.score >= 4.3 ? 'var(--green)' : d.score >= 3.5 ? 'var(--blue)' : 'var(--amber)' }} /></div>
                    <div className="tiny muted" style={{ marginTop: 2 }}>bobot {d.weight}% · target {d.target} · realisasi {d.actual}</div>
                  </div>
                ))}
                {apprais.available && apprais.note && <div className="tiny" style={{ color: 'var(--amber)' }}>{apprais.note}</div>}
              </div>
              <div className="row gap8">
                <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => setDrawer(person)}><I.users size={13} /> Profil 360°</Btn>
                <Btn sm style={{ flex: 1 }} onClick={() => nav('cpe')}><I.book size={13} /> CPE/PPL</Btn>
              </div>
            </div>
          </Panel>
        </div>
        </>)}
      </div></div>
      {showNew && <StaffForm onClose={() => setShowNew(false)} onAdd={(s: any) => { addStaff(s); setShowNew(false); }} />}
      {drawer && <Profile360Drawer s={drawer} onClose={() => setDrawer(null)} />}
    </>
  );
}

const STAFF_FORM_INIT = { name: '', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', email: '' };

function StaffForm({ onClose, onAdd }: any) {
  const uid = React.useId();
  const [d, setD] = useStateE({ ...STAFF_FORM_INIT });
  const set = (k: any, v: any) => setD((s: any) => ({ ...s, [k]: v }));
  const valid = d.name.trim();
  const ROLE_BY_GRADE = { Partner: 'Engagement Partner', Manager: 'Audit Manager', Senior: 'Senior Auditor', Junior: 'Junior Auditor' };
  return (
    <Overlay
      variant="modal"
      size="md"
      onClose={onClose}
      isDirty={() => JSON.stringify(d) !== JSON.stringify(STAFF_FORM_INIT)}
      bodyStyle={{ padding: 16, display: 'grid', gap: 12 }}
      header={(
        <div style={{ background: 'linear-gradient(125deg,var(--navy-700),var(--blue-solid))', color: 'var(--on-dark-fg)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.users size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>Karyawan Baru</div><div className="tiny" style={{ color: 'var(--on-dark-muted)' }}>Tambah ke direktori SDM</div></div>
          <button aria-label="Tutup" className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
      )}
      footer={(
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => onAdd({ ...d, role: (ROLE_BY_GRADE as any)[d.grade] })}><I.check size={14} /> Tambah Karyawan</Btn>
        </div>
      )}
    >
        <div>
          <div className="field"><label htmlFor={uid+'-nama-lengkap'}>Nama Lengkap</label><input id={uid+'-nama-lengkap'} className="input" value={d.name} onChange={(e: any) => set('name', e.target.value)} placeholder="Nama karyawan" /></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label htmlFor={uid+'-jenjang'}>Jenjang</label><select id={uid+'-jenjang'} className="select" value={d.grade} onChange={(e: any) => set('grade', e.target.value)}>{['Partner', 'Manager', 'Senior', 'Junior'].map(g => <option key={g}>{g}</option>)}</select></div>
            <div className="field"><label htmlFor={uid+'-sertifikasi'}>Sertifikasi</label><input id={uid+'-sertifikasi'} className="input" value={d.cert} onChange={(e: any) => set('cert', e.target.value)} placeholder="CPA / CA / S.Ak" /></div>
          </div>
          <div className="field"><label htmlFor={uid+'-email'}>Email</label><input id={uid+'-email'} className="input" value={d.email} onChange={(e: any) => set('email', e.target.value)} placeholder="nama@whr-cpa.id" /></div>
        </div>
    </Overlay>
  );
}

/* ---------------- CPE/PPL Tracker ---------------- */
function CPETracker() {
  const { fmt } = AMS;
  const nav = useNav();
  const auth = useAuth();
  const staff: any = AMS.STAFF;
  /* Tahap A-2 · R1 — tahun DAN ambang PPL kini DIPILIH menurut tanggal hitung
     (`canon_ppl.PPL_REGISTRY`). Dulu tahunnya diketik di `CPE_REQ.year: 2026`
     dan ambangnya satu record tanpa masa berlaku: pada 1 Januari 2027 layar ini
     akan berkata "PPL 2026" sambil menilai kepatuhan terhadap kewajiban 2026.
     Masa yang tak tercakup TIDAK memakai ambang tahun lain — modul menolak
     menilai dan menyebutkan alasannya. */
  const pplLook = pplReqOn(String(AMS.TODAY || ''));
  const pplYear = pplYearOf(String(AMS.TODAY || ''));
  const pplReq = pplLook.value;
  const [extraLog, setExtraLog] = useAmsPersist('cpeExtra', {});
  // 2026-07-05 — cpeLog (kredit SKP dasar) & cpeExtra ter-filter server (personal.get).
  const [cpeLog] = useAmsPersist('cpeLog', () => AMS.CPE_LOG);
  const [attendance] = useAmsPersist('trainingAttendance.v1', () => ({}));
  const [sel, setSel] = useStateE('EMP-007');
  const [showNew, setShowNew] = useStateE(false);
  /* #1/#2 — kredit SKP otomatis dari pelatihan yang kehadirannya dikonfirmasi (SSOT cpeFromTraining). */
  const trainingByEmp = cpeFromTraining(AMS.TRAINING_CATALOG as TrainingCourse[], attendance);
  // Firm-view → seluruh roster; selain itu batasi ke id yang datanya benar-benar diterima
  // (unit/self) agar tabel tak menampilkan baris orang lain (data nilai sudah ter-filter server).
  const canFirm = !!(auth && typeof auth.can === 'function' && auth.can(CAP.PERSONAL_CPE_VIEW_FIRM));
  const scopedIds = new Set<string>([...Object.keys(cpeLog || {}), ...Object.keys(extraLog || {})]);
  const vstaff = canFirm ? staff : staff.filter((s: any) => scopedIds.has(s.id));
  const log = (() => { const m = {}; vstaff.forEach((s: any) => { (m as any)[s.id] = [...(extraLog[s.id] || []), ...(trainingByEmp[s.id] || []), ...(((cpeLog as any)[s.id]) || [])]; }); return m; })();
  const addSkp = (id: any, rec: any) => setExtraLog((l: any) => ({ ...l, [id]: [{ ...rec, date: AMS.TODAY }, ...(l[id] || [])] }));

  /* Masa tak tercakup registry: modul MENOLAK menilai. Sebuah verdict kepatuhan
     tak punya jawaban separuh — "Memenuhi" terhadap kewajiban tahun yang salah
     adalah nasihat kepatuhan yang keliru, bukan angka yang kurang teliti. */
  if (!pplReq || pplYear == null) return (
    <><SubBar moduleId="cpe" /><div className="view-scroll"><div className="view-pad"><Panel>
      <div style={{ padding: 28, textAlign: 'center', maxWidth: 620, margin: '0 auto' }}>
        <div style={{ color: 'var(--red)', marginBottom: 8 }}><I.alert size={22} /></div>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Kewajiban PPL untuk masa ini belum ada di registry</div>
        <div className="tiny muted" style={{ lineHeight: 1.6 }}>{pplLook.note}</div>
        <div style={{ marginTop: 12 }}><Btn sm onClick={() => nav('regref', { from: 'cpe' })}>Buka Data Referensi Regulatori</Btn></div>
      </div>
    </Panel></div></div></>
  );
  const req = { annual: pplReq.annual, structured: pplReq.structuredMin, year: pplYear };

  /* PRD sdm-kepatuhan PR-3 — SATU mesin PPL.
     Modul ini dulu menjumlahkan SKP MENTAH sementara `canon_ppl` yang benar
     (cap SKP tidak terstruktur PMK 186 Ps. 37, materi wajib, SKP hangus) sudah
     ada di repo dan dipakai modul Kesiapan P2PK. EMP-007 karenanya berdiri di
     32/40 di sini dan 28/40 di sebelah. */
  /* Tahap A-2 · SC-A3 — catatan disaring ke TAHUN PPL yang dinilai. Membenarkan
     label tahunnya tanpa ini justru memperburuk: layar akan berkata "PPL 2027"
     sambil menjumlahkan SKP yang diperoleh 2026. */
  const summary = vstaff.map((s: any) => {
    const recs = skpInYear((log as any)[s.id] || [], pplYear);
    const st = pplStatusFromEntries(recs, pplReq);
    return { ...s, structured: st.structured, total: st.countedTotal, compliant: st.compliant, st, recs };
  });
  const compliantN = summary.filter((s: any) => s.compliant).length;
  const atRisk = summary.filter((s: any) => !s.compliant && s.total < req.annual * 0.5).length;
  const person = summary.find((s: any) => s.id === sel) || summary[0];
  // Guard: data ter-filter bisa kosong (peran self-only tanpa catatan SKP tersimpan).
  if (!person) return (<><SubBar moduleId="cpe" /><div className="view-scroll"><div className="view-pad"><Panel><div style={{ padding: 28, textAlign: 'center' }} className="tiny muted">Belum ada catatan PPL/SKP yang dapat Anda lihat. Lihat data PPL Anda sendiri di modul <b>Data Personal Saya</b>.</div></Panel></div></div></>);

  return (
    <>
      <SubBar moduleId="cpe" right={<div className="row gap8 ac"><Badge kind="blue">PPL {req.year} · {req.annual} SKP</Badge><Btn sm variant="primary" onClick={() => setShowNew(true)}><I.plus size={14} /> Catat SKP</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={`${compliantN}/${vstaff.length}`} label="Memenuhi PPL" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={req.annual + ' SKP'} label="Syarat Tahunan" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={req.structured + ' SKP'} label="Min. Terstruktur" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={atRisk} label="Berisiko Tidak Memenuhi" accent="var(--red)" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 12, alignItems: 'start' }}>
          <Panel noBody>
            <div className="panel-h"><h3>Status PPL per Karyawan</h3><div style={{ flex: 1 }} /><span className="tiny muted">tahun {req.year}</span></div>
            <table className="dtbl">
              <thead><tr><th>Karyawan</th><th className="num">Terstruktur</th><th className="num">Total SKP</th><th style={{ width: 140 }}>Progress</th><th>Status</th></tr></thead>
              <tbody>
                {summary.map((s: any) => (
                  <tr key={s.id} className={s.id === sel ? 'sel' : ''} onClick={() => setSel(s.id)} style={{ cursor: 'pointer' }}>
                    <td><div className="row ac gap8"><Avatar name={s.name} size={24} /><span style={{ fontWeight: 600 }} className="truncate">{s.name}</span></div></td>
                    <td className="num mono" style={{ color: s.structured >= req.structured ? 'var(--green)' : 'var(--amber)' }}>{s.structured}/{req.structured}</td>
                    <td className="num mono" style={{ fontWeight: 600 }}>{s.total}/{req.annual}</td>
                    <td><div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, s.total / req.annual * 100) + '%', height: '100%', borderRadius: 4, background: s.compliant ? 'var(--green)' : s.total >= req.annual * 0.5 ? 'var(--amber)' : 'var(--red)' }} /></div></td>
                    <td>{s.compliant && s.st.topicsTracked ? <Badge kind="green">Memenuhi</Badge> : s.compliant ? <Badge kind="amber" title="Materi wajib Pasal 37 belum terlacak">Belum terbukti</Badge> : <Badge kind={s.total >= req.annual * 0.5 ? 'amber' : 'red'}>{Math.round(s.total / req.annual * 100)}%</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
              <Avatar name={person.name} size={28} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{person.name}</div><div className="tiny muted">{person.role}</div></div>
              {person.compliant && person.st.topicsTracked ? <Badge kind="green">Memenuhi</Badge> : person.compliant ? <Badge kind="amber">Belum dapat dibuktikan</Badge> : <Badge kind="amber">Kurang {Math.max(0, pplReq.annual - person.st.countedTotal)} SKP</Badge>}
            </div>
            <div style={{ padding: 14 }}>
              <div className="row gap12" style={{ marginBottom: 14 }}>
                <Donut segments={[{ value: person.structured, color: '#005085' }, { value: person.st.countedUnstructured, color: '#0a6b73' }, { value: Math.max(0, pplReq.annual - person.total), color: '#e7ebef' }]} size={92} thickness={13}
                  center={<><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{person.total}</div><div className="tiny muted">SKP</div></>} />
                <div style={{ flex: 1, display: 'grid', gap: 5, alignContent: 'center' }}>
                  <div className="row jb tiny"><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: 2, background: '#005085' }} />Terstruktur</span><b className="mono">{person.structured}</b></div>
                  <div className="row jb tiny"><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: 2, background: '#0a6b73' }} />Tidak terstruktur</span><b className="mono">{person.st.countedUnstructured}</b></div>
                  {person.st.forfeitedUnstructured > 0 && <div className="row jb tiny" style={{ color: 'var(--amber)' }}><span className="row ac gap6"><I.alert size={9} />Hangus (di atas batas {pplReq.unstructuredCap})</span><b className="mono">{person.st.forfeitedUnstructured}</b></div>}
                  <div className="row jb tiny"><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: 2, background: '#e7ebef' }} />Kurang</span><b className="mono">{Math.max(0, pplReq.annual - person.total)}</b></div>
                </div>
              </div>
              <div className="tiny muted upper" style={{ marginBottom: 6 }}>Riwayat SKP {req.year}</div>
              <div style={{ display: 'grid', gap: 0 }}>
                {person.recs.length ? person.recs.map((r: any, i: any) => (
                  <div key={i} className="row ac jb" style={{ padding: '7px 0', borderBottom: i < person.recs.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                    <div style={{ minWidth: 0 }}><div className="row ac gap6"><span style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{r.t}</span>{r.src === 'training' && <Badge kind="teal"><I.flask size={9} /> Pelatihan</Badge>}</div><div className="tiny muted">{new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} · {r.type}{r.type === 'Terstruktur' ? (isSkpTopic(r.topic) ? ' · ' + SKP_TOPIC_LABEL[r.topic as 'pembinaan' | 'akuntansi' | 'lain'] : ' · materi belum diklasifikasi') : ''}</div></div>
                    <span className="mono" style={{ fontWeight: 700 }}>{r.skp} SKP</span>
                  </div>
                )) : <div className="tiny muted" style={{ padding: 12, textAlign: 'center' }}>Belum ada SKP tercatat tahun ini.</div>}
              </div>
              {(person.st.shortfalls.length > 0 || !person.st.topicsTracked) && (
                <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                  {person.st.shortfalls.map((f: any) => (
                    <div key={f} className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>· {PPL_SHORTFALL_LABEL[f as keyof typeof PPL_SHORTFALL_LABEL]}</div>
                  ))}
                  {!person.st.topicsTracked && (
                    <div className="tiny" style={{ lineHeight: 1.5, marginTop: person.st.shortfalls.length ? 4 : 0 }}>
                      Materi wajib ({pplReq.topicPembinaanMin} SKP pembinaan/pengawasan + {pplReq.topicAkuntansiMin} SKP akuntansi/asurans) belum terlacak pada seluruh entri terstruktur — kepatuhan penuh Pasal 37 <b>belum dapat dibuktikan</b> dari data ini.
                    </div>
                  )}
                </div>
              )}
              <div className="row gap8" style={{ marginTop: 12 }}>
                <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => setShowNew(true)}><I.plus size={13} /> Catat SKP</Btn>
                <Btn sm style={{ flex: 1 }} onClick={() => nav('learning')}><I.flask size={13} /> Cari Pelatihan</Btn>
              </div>
            </div>
          </Panel>
        </div>
      </div></div>
      {showNew && <SkpForm staff={vstaff.length ? vstaff : staff} onClose={() => setShowNew(false)} onAdd={(id: any, rec: any) => { addSkp(id, rec); setShowNew(false); }} />}
    </>
  );
}

/* `topic` WAJIB untuk entri terstruktur: satu entri tanpa klasifikasi membuat
   materi wajib Pasal 37 tak dapat diuji untuk SELURUH tahun orang itu
   (lihat `pplFromEntries`). Karena itu ia field form, bukan afterthought. */
const SKP_FORM_INIT = { id: 'EMP-007', t: '', type: 'Terstruktur', skp: 4, topic: 'akuntansi' };

function SkpForm({ staff, onClose, onAdd }: any) {
  const uid = React.useId();
  const [d, setD] = useStateE({ ...SKP_FORM_INIT });
  const set = (k: any, v: any) => setD((s: any) => ({ ...s, [k]: v }));
  const needTopic = d.type === 'Terstruktur';
  const valid = d.t.trim() && +d.skp > 0 && (!needTopic || isSkpTopic(d.topic));
  return (
    <Overlay
      variant="modal"
      size="sm"
      onClose={onClose}
      isDirty={() => JSON.stringify(d) !== JSON.stringify(SKP_FORM_INIT)}
      bodyStyle={{ padding: 16, display: 'grid', gap: 12 }}
      header={(
        <div style={{ background: 'linear-gradient(125deg,var(--navy-700),var(--blue-solid))', color: 'var(--on-dark-fg)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.book size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>Catat SKP (PPL)</div><div className="tiny" style={{ color: 'var(--on-dark-muted)' }}>Tambah satuan kredit pendidikan profesional</div></div>
          <button aria-label="Tutup" className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
      )}
      footer={(
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => onAdd(d.id, { t: d.t, type: d.type, skp: +d.skp, ...(needTopic ? { topic: d.topic } : {}) })}><I.check size={14} /> Catat SKP</Btn>
        </div>
      )}
    >
        <div>
          <div className="field"><label htmlFor={uid+'-karyawan'}>Karyawan</label><select id={uid+'-karyawan'} className="select" value={d.id} onChange={(e: any) => set('id', e.target.value)}>{staff.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="field"><label htmlFor={uid+'-kegiatan-pelatihan'}>Kegiatan / Pelatihan</label><input id={uid+'-kegiatan-pelatihan'} className="input" value={d.t} onChange={(e: any) => set('t', e.target.value)} placeholder="mis. Workshop SA Terkini IAPI" /></div>
          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
            <div className="field"><label htmlFor={uid+'-jenis'}>Jenis</label><select id={uid+'-jenis'} className="select" value={d.type} onChange={(e: any) => set('type', e.target.value)}>{['Terstruktur', 'Tidak Terstruktur'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label htmlFor={uid+'-skp'}>SKP</label><input id={uid+'-skp'} className="input mono" type="number" value={d.skp} onChange={(e: any) => set('skp', +e.target.value)} style={{ textAlign: 'right' }} /></div>
          </div>
          {needTopic && (
            <div className="field"><label htmlFor={uid+'-materi'}>Materi wajib (PMK 186 Ps. 37)</label><select id={uid+'-materi'} className="select" value={d.topic} onChange={(e: any) => set('topic', e.target.value)}>{(['akuntansi', 'pembinaan', 'lain'] as const).map((k) => <option key={k} value={k}>{SKP_TOPIC_LABEL[k]}</option>)}</select></div>
          )}
        </div>
    </Overlay>
  );
}

/* ---------------- Independence & Rotation ---------------- */
/* Baris register independensi. Sumbernya `AMS.INDEPENDENCE`, tetapi di runtime
   ia datang TER-FILTER dari server (`personal.get`, PERSONAL_STATE_KEYS):
   pengguna non-privileged hanya menerima BARISNYA sendiri. */
type IndepRow = {
  id: string; name: string; declared?: boolean; conflicts: number; finInterest?: string;
  role?: string; rotationClient?: string; rotationLimit: number; tenure: number;
  cooloff?: number; listed?: boolean;
  /* Dasar hukum rezim rotasi yang DIPILIH registry untuk baris ini (canon_rotation). */
  rotationBasis?: string;
  requested?: boolean; requestedAt?: string; requestedBy?: string;
};
/* Pesan yang TERLIHAT. Modul ini dulu menawarkan aksi yang server pasti tolak
   dan penolakannya tak pernah sampai ke pengguna: `flush()` di contexts.tsx
   hanya menangani CONFLICT, sedangkan FORBIDDEN jatuh ke cabang "offline" yang
   MEMPERTAHANKAN nilai lokal tanpa toast. Layar berkata "Disetujui", server
   tidak menyimpan apa pun, dan selisihnya baru terlihat saat reload. */
type IndepNotice = { ok: boolean; t: string } | null;

function Independence() {
  const nav = useNav();
  const auth = useAuth();
  /* I5 — pelaku jejak = identitas SESI (W7) yang dipetakan ke roster firma.
     Bentuk lama `(auth && auth.user && auth.user.name) || 'Auditor'` menandatangani
     persetujuan, mitigasi ancaman, dan pengakuan rotasi atas nama "Auditor" begitu
     sesi tak terbaca. Jejak auditable yang pelakunya bernama "Auditor" bukan jejak;
     bila identitas tak tersedia, aksi tulis TIDAK dilakukan (lihat indepStamp). */
  const actor: IndepActor = useMemoE(() => ({
    userId: auth && auth.user ? auth.user.id : undefined,
    name: auth && auth.user ? auth.user.name : undefined,
    role: auth && auth.user ? auth.user.role : undefined,
    empId: resolveEmpId(auth && auth.user),
  }), [auth]);
  /* I1 — kapabilitas ditegakkan SEBELUM aksi ditawarkan. Keempat dokumen modul ini
     (`independence` · `indepAppr` · `indepThreats` · `indepRotAck`) di-gate HR_MANAGE
     di server (rbac.ts capForWrite); FIRM_ADMIN dituntut tambahan untuk lapis partner
     dan untuk membatalkan rantai. Modul TIDAK ditutup penuh seperti HCM: baris di sini
     ter-filter per-pengguna oleh server, jadi setiap orang berhak MELIHAT deklarasinya
     sendiri — pola yang sama dengan Payroll, Cuti, Kinerja, Kode Etik & CPE. */
  const canWrite = indepCanWrite(actor);
  const canFirmAdmin = !!(auth && typeof auth.can === 'function' && auth.can(CAP.FIRM_ADMIN));
  /* Argumen tipe generik TIDAK bisa dipakai pada hook React di repo ini (tak ada
     @types/react → TS2347); tipe dinyatakan lewat `as` di titik baca. */
  const [notice, setNotice] = useStateE(null);
  const pesan = notice as IndepNotice;
  const tolak = (t: string) => setNotice({ ok: false, t });

  const [data, setData] = useAmsPersist('independence', () => AMS.INDEPENDENCE);
  const rows: IndepRow[] = data as IndepRow[];
  const declared = rows.filter((d) => d.declared).length;
  const conflicts = rows.reduce((s: number, d) => s + (d.conflicts || 0), 0);
  const rotationDue = rows.filter((d) => d.tenure >= d.rotationLimit).length;
  const rotationWarn = rows.filter((d) => d.tenure >= d.rotationLimit - 1 && d.tenure < d.rotationLimit).length;
  /* jendela peringatan dini ≤6 bulan sebelum batas (SSOT rotTier) */
  const rotationAlertList = rows.filter((d) => d.rotationClient !== '—' && rotTier(d.tenure, d.rotationLimit) === 'alert');
  /* Tahap A-2 · SC-A5 — dasar hukum yang DIKUTIP spanduk berasal dari rezim yang
     dipilih registry untuk baris-baris itu sendiri, bukan dari string yang
     diketik di view. Dulu spanduk menulis "UU 5/2011 & POJK 13/2017" untuk
     siapa pun, termasuk baris yang rezimnya PP 20/2015. */
  const basisOf = (list: Array<{ rotationBasis?: string }>) => {
    const uniq = Array.from(new Set(list.map((r) => r.rotationBasis).filter((b): b is string => !!b)));
    return uniq.length ? uniq.join(' · ') : 'dasar rotasi belum tercakup registry';
  };
  const [sel, setSel] = useStateE(null);

  /* Klok SSOT (K-02). Bentuk lama memakai `new Date()` — jam sistem nyata —
     sementara data di sekitarnya berada di periode audit, sehingga jejak
     persetujuan tak dapat direkonsiliasi dengan apa pun di aplikasi ini. */
  const indepToday = String(AMS.TODAY || '');
  /* I7 — identitas firma pada artefak TERSEGEL diturunkan, tidak diketik. Menyegel
     nama firma yang salah memberi otoritas pada dokumen yang keliru. */
  const firmName = (AMS.FIRM as { name?: string } | undefined)?.name || 'Kantor Akuntan Publik';

  /* K-06 lanjutan — tombol "Unduh Deklarasi": ekspor PDF tersegel deklarasi
     independensi per orang (SA 220 · Kode Etik IAPI). */
  const [declExporting, setDeclExporting] = useStateE(false);
  const onExportDecl = async (d: IndepRow) => {
    if (declExporting) return;
    setDeclExporting(true);
    try {
      await amsExportPdf({
        kind: 'independence-decl', scope: 'firm', scopeId: undefined,
        fileName: `Deklarasi Independensi - ${d.name}.pdf`,
        firm: firmName,
        title: 'Deklarasi Independensi Tahunan',
        meta: [`${d.name}${d.role ? ' · ' + d.role : ''} · ${INDEP_PERIOD}`,
          `Status: ${d.declared ? 'DIDEKLARASIKAN' : 'BELUM'} · konflik ${d.conflicts} · masa tugas ${d.tenure}/${d.rotationLimit} th (${d.rotationClient || '—'})`],
        blocks: [
          { type: 'heading', text: 'Kuesioner Independensi (SA 220 · Kode Etik IAPI)' },
          { type: 'para', text: 'Saya menyatakan bahwa saya independen dari entitas klien yang saya tangani, termasuk bebas dari kepentingan keuangan, hubungan keluarga, dan jasa non-assurance yang dilarang.' },
          { type: 'table', head: ['Pernyataan', 'Status'],
            body: INDEP_Q.map((q: string) => [q, d.declared ? 'Ya' : 'Belum']) },
          { type: 'heading', text: 'Rotasi & Cooling-off' },
          { type: 'para', text: `Masa tugas ${d.tenure} tahun dari batas ${d.rotationLimit} tahun pada ${d.rotationClient || '—'}.` },
        ],
      });
    } finally {
      setDeclExporting(false);
    }
  };

  /* indepAppr: per-orang jejak persetujuan. Bentuk lama = number (level saja);
     bentuk baru = { level, steps:[{by,byUserId,byEmpId,at}], period } agar AUDITABLE.
     Normalisasi + derivasi level hidup di `indep_approval` (modul murni, teruji). */
  const [appr, setAppr] = useAmsPersist('indepAppr', {});
  const recOf = (id: string) => indepApprRecord((appr as Record<string, unknown>)[id], INDEP_PERIOD);
  const lvlOf = (d: IndepRow) => indepLevel(recOf(d.id), !!d.declared);
  const authorityFor = (d: IndepRow, stepIndex: number) =>
    indepStepAuthority({ stepIndex, rec: recOf(d.id), declared: !!d.declared, rowId: d.id, actor });

  /* I2 — PEMISAHAN TUGAS. Bentuk lama menulis `steps[n - 1] = { by: me }` untuk `n`
     berapa pun tanpa memeriksa siapa `me`: satu orang dapat mengisi ketiga lapis
     berturut-turut, dan yang tercatat hanya bahwa seseorang menekan tombol tiga kali.
     Kelayakannya kini diputuskan `indepStepAuthority` (aturan sejajar rantai AJE),
     bukan oleh tombol yang kebetulan terlihat. */
  const approveStep = (d: IndepRow, stepIndex: number) => {
    if (!canWrite) return tolak('Pencatatan deklarasi independensi memerlukan kewenangan SDM & Kepatuhan (hr.manage). Tanda tangan Anda sendiri dibubuhkan di modul Data Personal Saya.');
    const verdict = authorityFor(d, stepIndex);
    if (!verdict.ok) return tolak(verdict.reason);
    const stamp = indepStamp(actor, indepToday);
    if (!stamp) return tolak('Identitas sesi tidak terpetakan ke personel firma — tanda tangan tidak dibubuhkan.');
    setAppr((a: Record<string, unknown>) => {
      const steps = indepApprRecord(a[d.id], INDEP_PERIOD).steps.slice();
      steps[stepIndex] = stamp;
      return { ...a, [d.id]: { level: stepIndex + 1, steps, period: INDEP_PERIOD } };
    });
    if (stepIndex === 0 && !d.declared) setData((list: IndepRow[]) => list.map((x) => x.id === d.id ? { ...x, declared: true } : x));
    setNotice({ ok: true, t: `Lapis "${INDEP_CHAIN[stepIndex].role}" ditandatangani ${stamp.by} · ${indepDateLabel(stamp.at)}.` });
  };
  /* Membatalkan rantai yang sudah berjalan = tindakan otoritatif (menghapus tanda
     tangan orang lain). Sejajar pengecualian etik: kewenangan rekan (FIRM_ADMIN). */
  const resetChain = (d: IndepRow) => {
    if (!canFirmAdmin) return tolak('Membatalkan rantai persetujuan yang sudah ditandatangani memerlukan kewenangan rekan (firm.admin).');
    setAppr((a: Record<string, unknown>) => ({ ...a, [d.id]: { level: 0, steps: [], period: INDEP_PERIOD } }));
    setData((list: IndepRow[]) => list.map((x) => x.id === d.id ? { ...x, declared: false } : x));
    setNotice({ ok: true, t: `Rantai persetujuan ${d.name} dibatalkan — deklarasi harus ditandatangani ulang.` });
  };

  /* I3 — "Minta Deklarasi" HIDUP. Permintaan tercatat pada baris orang yang belum
     berdeklarasi (`requested`/`requestedAt`) dan tampil sebagai chip "Diminta" di
     register — alur yang sama persis dengan Deklarasi Kode Etik (view_pc_conduct),
     bukan alur baru. Tanda tangannya sendiri tetap dibubuhkan yang bersangkutan. */
  const requestDecl = () => {
    if (!canWrite) return tolak('Mengirim permintaan deklarasi memerlukan kewenangan SDM & Kepatuhan (hr.manage).');
    const stamp = indepStamp(actor, indepToday);
    if (!stamp) return tolak('Identitas sesi tidak terpetakan ke personel firma — permintaan tidak dikirim.');
    const target = rows.filter((d) => !d.declared);
    if (!target.length) return setNotice({ ok: true, t: 'Seluruh deklarasi tahunan sudah diterima — tidak ada permintaan yang perlu dikirim.' });
    setData((list: IndepRow[]) => list.map((d) => d.declared ? d : ({ ...d, requested: true, requestedAt: indepToday, requestedBy: stamp.by })));
    setNotice({ ok: true, t: `Permintaan deklarasi dicatat untuk ${target.length} personel yang belum menandatangani.` });
  };

  /* Q-03b — register ancaman & pengamanan (editable + jejak mitigasi). */
  const [threats, setThreats] = useAmsPersist('indepThreats', () => seedIndepThreats(AMS.INDEPENDENCE as Array<{ id: string; conflicts: number; finInterest: string }>));
  const addThreat = (personId: string) => {
    if (!canWrite) return tolak('Menambah ancaman independensi memerlukan kewenangan SDM & Kepatuhan (hr.manage).');
    setThreats((list: IndepThreat[]) => [...list, {
      id: nextThreatId(list, personId), personId, type: THREAT_TYPES[0], desc: '',
      severity: 'Sedang', safeguard: '', status: 'Terbuka', by: '', byUserId: undefined, byEmpId: undefined, at: '',
    }]);
  };
  const updateThreat = (id: string, patch: Record<string, string>) => {
    if (!canWrite) return tolak('Menyunting register ancaman memerlukan kewenangan SDM & Kepatuhan (hr.manage).');
    setThreats((list: IndepThreat[]) => list.map((t) => t.id === id ? { ...t, ...patch } : t));
  };
  const signThreat = (id: string) => {
    if (!canWrite) return tolak('Menandai ancaman sebagai dimitigasi memerlukan kewenangan SDM & Kepatuhan (hr.manage).');
    const stamp = indepStamp(actor, indepToday);
    if (!stamp) return tolak('Identitas sesi tidak terpetakan ke personel firma — mitigasi tidak ditandatangani.');
    setThreats((list: IndepThreat[]) => list.map((t) => t.id === id ? { ...t, status: 'Dimitigasi', by: stamp.by, byUserId: stamp.byUserId, byEmpId: stamp.byEmpId, at: stamp.at } : t));
  };
  /* Q-03c — pengakuan rotasi & cooling-off + tindak lanjut. */
  const [rotAck, setRotAck] = useAmsPersist('indepRotAck', {});
  const ackRotation = (id: string, action: string) => {
    if (!canWrite) return tolak('Mencatat pengakuan rotasi memerlukan kewenangan SDM & Kepatuhan (hr.manage).');
    const stamp = indepStamp(actor, indepToday);
    if (!stamp) return tolak('Identitas sesi tidak terpetakan ke personel firma — pengakuan tidak dicatat.');
    setRotAck((m: Record<string, unknown>) => ({ ...m, [id]: { acknowledged: true, action, by: stamp.by, byUserId: stamp.byUserId, byEmpId: stamp.byEmpId, at: stamp.at } }));
    setNotice({ ok: true, t: `Pengakuan rotasi dicatat atas nama ${stamp.by}.` });
  };

  const curr = sel ? rows.find((d) => d.id === sel) : null;
  const [itab, setItab] = useStateE('rotasi');
  const itabs = [{ id: 'rotasi', label: 'Deklarasi & Rotasi' }, { id: 'fee', label: 'Ketergantungan Imbalan' }, { id: 'nas', label: 'Pra-Persetujuan NAS' }, { id: 'longassoc', label: 'Asosiasi Jangka Panjang' }];

  return (
    <>
      <SubBar moduleId="independence" right={<div className="row gap8 ac"><Badge kind="blue">Kode Etik IAPI · IESBA</Badge>{canWrite && <Btn sm onClick={requestDecl} title="Catat permintaan deklarasi untuk seluruh personel yang belum menandatangani"><I.send size={13} /> Minta Deklarasi</Btn>}</div>} />
      <div className="view-scroll"><div className="view-pad">
        <div style={{ marginBottom: 12 }}><Tabs tabs={itabs} active={itab} onChange={setItab} /></div>
        {itab === 'fee' && <FeeDependencyTab />}
        {itab === 'nas' && <NASPreApprovalTab />}
        {itab === 'longassoc' && <LongAssociationTab />}
        {itab === 'rotasi' && (<>
        {pesan && (
          <div className="panel" style={{ padding: '9px 12px', marginBottom: 12, boxShadow: 'none', background: pesan.ok ? 'var(--green-bg)' : 'var(--red-bg)', borderColor: 'transparent' }}>
            <div className="row ac jb gap8">
              <span className="tiny" style={{ fontWeight: 600, lineHeight: 1.45 }}>{pesan.ok ? <I.check size={12} /> : <I.alert size={12} />} {pesan.t}</span>
              <button aria-label="Tutup pesan" className="btn sm" onClick={() => setNotice(null)}><I.x size={12} /></button>
            </div>
          </div>
        )}
        {!canWrite && (
          <div className="panel" style={{ padding: '11px 14px', marginBottom: 12, boxShadow: 'none', background: 'var(--surface-2)' }}>
            <div className="row ac gap8"><span className="muted"><I.lock size={14} /></span><span className="tiny" style={{ lineHeight: 1.5 }}><b>Hanya-baca.</b> Pencatatan deklarasi, reviu, persetujuan, register ancaman, dan pengakuan rotasi adalah kewenangan SDM &amp; Kepatuhan (hr.manage) — tombolnya tidak ditampilkan agar tak ada tindakan yang tampak berhasil lalu ditolak server. Tanda tangan deklarasi <b>Anda sendiri</b> dibubuhkan di <button className="btn sm" onClick={() => nav('personal', { from: 'independence' })}>Data Personal Saya</button>.</span></div>
          </div>
        )}
        {rows.length === 0 ? (
          <Panel><div style={{ padding: 28, textAlign: 'center' }} className="tiny muted">Belum ada baris deklarasi independensi yang dapat Anda lihat. Deklarasi Anda sendiri ada di modul <b>Data Personal Saya</b>.</div></Panel>
        ) : (<>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={`${declared}/${rows.length}`} label="Deklarasi Diterima" accent={declared === rows.length ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={conflicts} label="Konflik Teridentifikasi" accent={conflicts ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={rotationDue} label="Rotasi Wajib" accent={rotationDue ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={rotationWarn} label="Rotasi Tahun Depan" accent="var(--amber)" /></div></Panel>
        </div>

        {rotationDue > 0 && (
          <div className="panel" style={{ padding: '15px 18px', marginBottom: 12, background: 'var(--red-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={17} /></span><span style={{ fontSize: 12, fontWeight: 600 }}>Rotasi partner wajib: <b>{rows.filter((d) => d.tenure >= d.rotationLimit).map((d) => d.name.split(' ')[0]).join(', ')}</b> telah mencapai batas {rows.find((d) => d.tenure >= d.rotationLimit)?.rotationLimit} tahun pada emiten — tunjuk partner pengganti ({basisOf(rows.filter((d) => d.tenure >= d.rotationLimit))}).</span></div>
          </div>
        )}

        {rotationAlertList.length > 0 && (
          <div className="panel" style={{ padding: '15px 18px', marginBottom: 12, background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.alert size={17} /></span><span style={{ fontSize: 12, fontWeight: 600 }}>Peringatan dini rotasi (≤6 bulan): <b>{rotationAlertList.map((d) => d.name.split(' ')[0]).join(', ')}</b> memasuki jendela 6 bulan sebelum batas rotasi pada emiten — mulai perencanaan transisi &amp; cooling-off partner pengganti sekarang ({basisOf(rotationAlertList)}).</span></div>
          </div>
        )}

        <Panel noBody>
          <div className="panel-h"><h3>Register Independensi &amp; Rotasi Partner</h3><div style={{ flex: 1 }} /><span className="tiny muted">klik baris untuk alur persetujuan</span></div>
          <table className="dtbl">
            <thead><tr><th>Partner / Staf</th><th>Deklarasi Tahunan</th><th>Alur Persetujuan</th><th className="num">Konflik</th><th>Klien (rotasi)</th><th className="num" style={{ width: 130 }}>Masa Tugas</th></tr></thead>
            <tbody>
              {rows.map((d) => {
                const rotPct = d.tenure / d.rotationLimit * 100;
                const rotCol = d.tenure >= d.rotationLimit ? 'var(--red)' : d.tenure >= d.rotationLimit - 1 ? 'var(--amber)' : 'var(--green)';
                const lvl = lvlOf(d);
                const belumTeratribusi = indepUnattributed(recOf(d.id), !!d.declared);
                /* Deklarasi = pernyataan PRIBADI: hanya yang bersangkutan yang dapat
                   membubuhkannya (semantik `personalSelfService.declareSelf` & Kode Etik).
                   Bentuk lama memakai <span onClick> — kontrol palsu yang juga menyalahi §3.7. */
                const bolehTandaTangan = authorityFor(d, 0).ok && canWrite;
                return (
                  <tr key={d.id} className={d.id === sel ? 'sel' : ''} onClick={() => setSel(d.id)} style={{ cursor: 'pointer' }}>
                    <td><div className="row ac gap8"><Avatar name={d.name} size={24} /><span style={{ fontWeight: 600 }}>{d.name}</span></div></td>
                    <td>
                      {d.declared ? <Badge kind="green"><I.check size={10} /> Diterima</Badge> : (
                        <span className="row ac gap6">
                          <Badge kind="red">Belum</Badge>
                          {d.requested && <span className="chip tiny" style={{ color: 'var(--amber)', borderColor: 'var(--amber)' }} title={`Deklarasi diminta ${indepDateLabel(d.requestedAt)}${d.requestedBy ? ' oleh ' + d.requestedBy : ''}`}><I.send size={10} /> Diminta</span>}
                          {bolehTandaTangan && <button className="btn sm" style={{ height: 22, color: 'var(--blue)' }} onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); approveStep(d, 0); }}><I.check size={12} /> Tandatangani</button>}
                        </span>
                      )}
                    </td>
                    <td><div className="row ac gap4">{[1, 2, 3].map((i) => <span key={i} title={INDEP_LEVEL_LABEL[i]} style={{ width: 22, height: 5, borderRadius: 3, background: i <= lvl ? (belumTeratribusi ? 'var(--amber)' : 'var(--green)') : 'var(--surface-3)' }} />)}<span className="tiny muted" style={{ marginLeft: 4 }} title={belumTeratribusi ? 'Sebagian lapis tercatat tanpa penanda tangan (rekaman bentuk lama / deklarasi mandiri)' : undefined}>{INDEP_LEVEL_LABEL[lvl]}{belumTeratribusi ? ' *' : ''}</span></div></td>
                    <td className="num">{d.conflicts ? <Badge kind="amber">{d.conflicts}</Badge> : <span className="muted">0</span>}</td>
                    <td className="tiny">{d.rotationClient === '—' ? <span className="muted">—</span> : <span className="row ac gap4">{(d.rotationClient || '').replace('PT ', '')}{d.listed && <span className="badge b-blue" style={{ fontSize: 11, padding: '0 4px' }}>IDX</span>}</span>}</td>
                    <td>
                      {d.rotationClient === '—' ? <span className="muted tiny">n/a</span> : (
                        <div className="row ac gap8">
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, rotPct) + '%', height: '100%', borderRadius: 3, background: rotCol }} /></div>
                          <span className="mono tiny" style={{ fontWeight: 700, color: rotCol }}>{d.tenure}/{d.rotationLimit}th</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Ambang rotasi AP terdiferensiasi per rezim: <b>5 tahun</b> berturut-turut untuk entitas kepentingan publik (PIE) umum (PP 20/2015 Ps. 11) dan <b>3 tahun</b> untuk entitas <b>sektor jasa keuangan</b> — bank, asuransi, pembiayaan (POJK 13/POJK.03/2017). Cooling-off minimal <b>2 tahun</b>; KAP tidak dibatasi. Tanda <b>*</b> pada alur persetujuan berarti lapisnya tercatat <b>tanpa penanda tangan</b> — deklarasi mandiri atau rekaman bentuk lama; ia tidak diklaim terverifikasi. Dimensi etika lain (ketergantungan imbalan, pra-persetujuan NAS, asosiasi jangka panjang) dipantau pada tab terpisah.</div>
        </>)}
        </>)}
      </div></div>
      {curr && <IndepDrawer d={curr} lvl={lvlOf(curr)} rec={recOf(curr.id)} period={INDEP_PERIOD}
        unattributed={indepUnattributed(recOf(curr.id), !!curr.declared)}
        canWrite={canWrite} canFirmAdmin={canFirmAdmin}
        authorityFor={(i: number) => authorityFor(curr, i)}
        threats={(threats as IndepThreat[]).filter((t) => t.personId === curr.id)}
        onAddThreat={() => addThreat(curr.id)} onUpdateThreat={updateThreat} onSignThreat={signThreat}
        rotAck={(rotAck as Record<string, RotAck>)[curr.id]} onAckRotation={(action: string) => ackRotation(curr.id, action)}
        onApprove={(i: number) => approveStep(curr, i)} onReset={() => resetChain(curr)} onClose={() => setSel(null)}
        onExportDecl={onExportDecl} declExporting={declExporting} />}
    </>
  );
}

/* Kategori ancaman independensi (IESBA 120) + tingkat keparahan. */
const THREAT_TYPES = ['Kepentingan pribadi', 'Telaah pribadi', 'Advokasi', 'Kedekatan', 'Intimidasi'];
const THREAT_SEV = ['Tinggi', 'Sedang', 'Rendah'];
/* `byUserId`/`byEmpId` bukan hiasan: server (`signoff.ts`) menuntut jejak yang BARU
   memperoleh pembubuh menyebut SESI-nya, dan pencocokan nama itu lossy (pelajaran
   `amsShortName`). Entri seed bertanda `by: ''` — belum beratribusi, belum dituntut. */
type IndepThreat = { id: string; personId: string; type: string; desc: string; severity: string; safeguard: string; status: string; by: string; byUserId?: string; byEmpId?: string; at: string };
type RotAck = { acknowledged?: boolean; action?: string; by?: string; byUserId?: string; byEmpId?: string; at?: string };
const sevVar = (s: string): string => s === 'Tinggi' ? 'red' : s === 'Sedang' ? 'amber' : 'green';
/* Seed register ancaman/pengamanan dari konflik terdeklarasi (INDEPENDENCE). */
const seedIndepThreats = (rows: Array<{ id: string; conflicts: number; finInterest: string }>) =>
  rows.filter(r => r.conflicts > 0).map(r => ({
    id: 'TH-' + r.id, personId: r.id, type: 'Kedekatan', desc: r.finInterest,
    severity: 'Sedang', safeguard: 'Pengamanan diterapkan & didokumentasikan (telaah independen).',
    status: 'Dimitigasi', by: '', at: '',
  }));
const INDEP_Q = [
  'Tidak memiliki kepentingan keuangan langsung/tidak langsung yang material pada klien.',
  'Tidak ada hubungan keluarga dekat pada posisi kunci di klien.',
  'Tidak ada pinjaman/jaminan dengan klien di luar kondisi normal.',
  'Tidak memberikan jasa non-asurans yang dilarang pada klien audit.',
  'Imbalan tidak bergantung pada hasil (contingent fee).',
  'Tidak ada ancaman kedekatan/intimidasi yang tidak dapat dimitigasi.',
];

type IndepDrawerProps = {
  d: IndepRow; lvl: number; rec: IndepApprRec; period: string; unattributed: boolean;
  canWrite: boolean; canFirmAdmin: boolean;
  authorityFor: (stepIndex: number) => { ok: boolean; reason: string };
  threats: IndepThreat[];
  onAddThreat: () => void; onUpdateThreat: (id: string, patch: Record<string, string>) => void; onSignThreat: (id: string) => void;
  rotAck?: RotAck; onAckRotation: (action: string) => void;
  onApprove: (stepIndex: number) => void; onReset: () => void; onClose: () => void;
  onExportDecl: (d: IndepRow) => void; declExporting: boolean;
};

function IndepDrawer({ d, lvl, rec, period, unattributed, canWrite, canFirmAdmin, authorityFor, threats, onAddThreat, onUpdateThreat, onSignThreat, rotAck, onAckRotation, onApprove, onReset, onClose, onExportDecl, declExporting }: IndepDrawerProps) {
  const steps = (rec && rec.steps) || [];
  const per = period || INDEP_PERIOD;
  const tlist: IndepThreat[] = threats || [];
  const rotRelevant = indepRotationAckRelevant(d);
  const [rotDraft, setRotDraft] = useStateE('');
  return (
    <Overlay
      variant="sheet"
      size="sm"
      onClose={onClose}
      /* `rotDraft` = catatan rotasi yang sedang diketik, belum tersimpan. */
      isDirty={() => rotDraft.trim() !== ''}
      bodyStyle={{ padding: 18 }}
      header={(
        <div style={{ background: 'linear-gradient(125deg,var(--navy-700),var(--blue-solid))', color: 'var(--on-dark-fg)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={d.name} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700 }} className="truncate">{d.name}</div><div className="tiny" style={{ color: 'var(--on-dark-muted)' }}>Deklarasi Independensi · {per}</div></div>
          <button aria-label="Tutup" className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
      )}
      footer={(
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
          {lvl > 0 && canFirmAdmin && <Btn style={{ flex: 1 }} onClick={onReset}><I.sync size={13} /> Reset</Btn>}
          <Btn variant="primary" style={{ flex: 1 }} onClick={() => onExportDecl(d)} disabled={declExporting}><I.download size={13} /> {declExporting ? 'Menyiapkan…' : 'Unduh Deklarasi'}</Btn>
        </div>
      )}
    >
        <div>
          <div className="tiny muted upper" style={{ marginBottom: 8 }}>Kuesioner Independensi (SA 220 · Kode Etik IAPI)</div>
          <div style={{ display: 'grid', gap: 7, marginBottom: 18 }}>
            {INDEP_Q.map((q, i) => (
              <div key={i} className="row gap8" style={{ padding: '8px 11px', border: '1px solid var(--line-soft)', borderRadius: 8, alignItems: 'flex-start' }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: d.declared ? 'var(--green)' : 'var(--ink-4)' }}>{d.declared ? <I.check size={14} /> : <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 4, border: '1.5px solid var(--line-strong)' }} />}</span>
                <span style={{ fontSize: 12, lineHeight: 1.4 }}>{q}</span>
              </div>
            ))}
          </div>

          {/* Q-03b — Register ancaman & pengamanan (IESBA 120): editable + jejak mitigasi */}
          <div className="row jb ac" style={{ marginBottom: 8 }}>
            <span className="tiny muted upper">Ancaman &amp; Pengamanan (IESBA 120)</span>
            {canWrite && <button className="btn sm" onClick={onAddThreat}><I.plus size={12} /> Tambah</button>}
          </div>
          <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
            {tlist.length === 0 && <div className="tiny muted">Tidak ada ancaman tercatat untuk personel ini.</div>}
            {tlist.map((t) => (
              <div key={t.id} className="panel" style={{ padding: '10px 12px', boxShadow: 'none', borderLeft: '3px solid var(--' + sevVar(t.severity) + ')' }}>
                {canWrite ? (<>
                  <div className="row gap6" style={{ marginBottom: 6 }}>
                    <select aria-label="Kategori ancaman" className="select" value={t.type} onChange={(e: { target: { value: string } }) => onUpdateThreat(t.id, { type: e.target.value })} style={{ flex: 1 }}>
                      {THREAT_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                    <select aria-label="Tingkat keparahan" className="select" value={t.severity} onChange={(e: { target: { value: string } }) => onUpdateThreat(t.id, { severity: e.target.value })} style={{ width: 104 }}>
                      {THREAT_SEV.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>
                  <input aria-label="Uraian ancaman" className="input" value={t.desc} placeholder="Uraian ancaman" onChange={(e: { target: { value: string } }) => onUpdateThreat(t.id, { desc: e.target.value })} style={{ width: '100%', marginBottom: 6 }} />
                  <textarea aria-label="Pengamanan yang diterapkan" className="input" value={t.safeguard} placeholder="Pengamanan yang diterapkan" onChange={(e: { target: { value: string } }) => onUpdateThreat(t.id, { safeguard: e.target.value })} style={{ width: '100%', height: 44, resize: 'vertical', marginBottom: 6 }} />
                </>) : (<>
                  <div className="row gap6 ac" style={{ marginBottom: 6 }}><b style={{ fontSize: 12 }}>{t.type}</b><Badge kind={sevVar(t.severity)}>{t.severity}</Badge></div>
                  <div className="tiny" style={{ marginBottom: 4, lineHeight: 1.45 }}>{t.desc || <span className="muted">Tanpa uraian.</span>}</div>
                  <div className="tiny muted" style={{ marginBottom: 6, lineHeight: 1.45 }}>{t.safeguard || 'Pengamanan belum dicatat.'}</div>
                </>)}
                <div className="row jb ac">
                  {t.status === 'Dimitigasi'
                    ? <span className="tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={11} /> Dimitigasi{t.by ? ' · ' + t.by + ' · ' + indepDateLabel(t.at) : ' · tanpa atribusi'}</span>
                    : <Badge kind="amber">Terbuka</Badge>}
                  {canWrite && (t.status === 'Dimitigasi'
                    ? <button className="btn sm" onClick={() => onUpdateThreat(t.id, { status: 'Terbuka', by: '', byUserId: '', byEmpId: '', at: '' })}><I.sync size={11} /> Buka</button>
                    : <Btn sm variant={t.safeguard.trim() ? 'primary' : ''} disabled={!t.safeguard.trim()} onClick={() => onSignThreat(t.id)}><I.check size={12} /> Tandai dimitigasi</Btn>)}
                </div>
              </div>
            ))}
          </div>

          {/* Q-03c — Pengakuan rotasi & cooling-off + tindak lanjut */}
          {rotRelevant && (<>
            <div className="tiny muted upper" style={{ marginBottom: 8 }}>Rotasi &amp; Cooling-off (PP 20/2015 · POJK 13/2017)</div>
            <div className="panel" style={{ padding: '10px 12px', marginBottom: 18, boxShadow: 'none', background: d.tenure >= d.rotationLimit ? 'var(--red-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
              <div className="tiny" style={{ fontWeight: 600, marginBottom: 6, lineHeight: 1.45 }}>
                {d.tenure}/{d.rotationLimit} th pada {(d.rotationClient || '').replace('PT ', '')}{d.listed ? ' (IDX)' : ''} · cooling-off {d.cooloff} th — {d.tenure >= d.rotationLimit ? 'WAJIB ROTASI.' : 'tahun terakhir sebelum batas.'}
              </div>
              {rotAck && rotAck.acknowledged
                ? <div className="tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={11} /> Diakui: {rotAck.by} · {indepDateLabel(rotAck.at)}{rotAck.action ? ' — ' + rotAck.action : ''}</div>
                : canWrite ? (<>
                  <textarea aria-label="Tindak lanjut rotasi" className="input" value={rotDraft} onChange={(e: { target: { value: string } }) => setRotDraft(e.target.value)} placeholder="Tindak lanjut (mis. tunjuk partner pengganti FY2026)" style={{ width: '100%', height: 40, resize: 'vertical', marginBottom: 6 }} />
                  <Btn sm variant={rotDraft.trim() ? 'primary' : ''} disabled={!rotDraft.trim()} onClick={() => onAckRotation(rotDraft.trim())}><I.check size={12} /> Akui &amp; catat tindak lanjut</Btn>
                </>) : <div className="tiny muted">Belum diakui. Pencatatan tindak lanjut adalah kewenangan SDM &amp; Kepatuhan.</div>}
            </div>
          </>)}

          <div className="tiny muted upper" style={{ marginBottom: 10 }}>Alur Persetujuan Bertingkat</div>
          <div style={{ display: 'grid', gap: 0 }}>
            {INDEP_CHAIN.map((c, i) => {
              const done = lvl >= i + 1;
              const active = lvl === i;
              const verdict = authorityFor(i);
              return (
                <div key={c.key} className="row gap10" style={{ paddingBottom: i < INDEP_CHAIN.length - 1 ? 14 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--surface-3)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{done ? <I.check size={13} /> : i + 1}</span>
                    {i < INDEP_CHAIN.length - 1 && <span style={{ width: 1.5, flex: 1, minHeight: 24, background: done ? 'var(--green)' : 'var(--line)' }} />}
                  </div>
                  <div style={{ minWidth: 0, paddingBottom: 4, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{c.role}</div>
                    <div className="tiny muted">{c.who}</div>
                    {active && canWrite && verdict.ok && (
                      <Btn sm variant="primary" style={{ marginTop: 6 }} onClick={() => onApprove(i)}>
                        <I.check size={12} /> {i === 0 ? 'Tandatangani & Ajukan' : i === 1 ? 'Reviu & Teruskan' : 'Setujui Final'}
                      </Btn>
                    )}
                    {active && !verdict.ok && <div className="tiny" style={{ color: 'var(--amber)', marginTop: 4, lineHeight: 1.45 }}><I.lock size={10} /> {verdict.reason}</div>}
                    {done && (steps[i]
                      ? <div className="tiny" style={{ color: 'var(--green)', fontWeight: 600, marginTop: 2 }}><I.check size={11} /> {steps[i].by} · {indepDateLabel(steps[i].at)}</div>
                      : <div className="tiny" style={{ color: 'var(--amber)', fontWeight: 600, marginTop: 2 }}><I.alert size={11} /> Tercatat tanpa penanda tangan — tidak dapat diklaim terverifikasi.</div>)}
                  </div>
                </div>
              );
            })}
          </div>
          {lvl >= 3 && !unattributed && <div className="panel" style={{ padding: '9px 12px', marginTop: 16, background: 'var(--green-bg)', borderColor: 'transparent', boxShadow: 'none' }}><div className="tiny" style={{ fontWeight: 600 }}><I.check size={12} /> Deklarasi independensi disetujui penuh &amp; terarsip untuk {per} — tiga lapis, tiga penanda tangan.</div></div>}
          {lvl >= 3 && unattributed && <div className="panel" style={{ padding: '9px 12px', marginTop: 16, background: 'var(--amber-bg)', borderColor: 'transparent', boxShadow: 'none' }}><div className="tiny" style={{ fontWeight: 600, lineHeight: 1.45 }}><I.alert size={12} /> Level rantai tercatat lengkap untuk {per}, tetapi sebagian lapis tanpa penanda tangan — pemisahan tugas <b>tidak dapat dibuktikan</b> dari rekaman ini.</div></div>}
        </div>
    </Overlay>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { CPETracker, HCM, Independence };
