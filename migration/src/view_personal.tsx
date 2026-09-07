import React from 'react';
import { AMS } from './data';
import { evaluateLeaveRow, leaveLedgerOf } from './canon_leave';
import { perfPersonOf } from './canon_perf';
import { bpjsContribution } from './canon_bpjs';
/* Ambang tidak diimpor terpisah: ia datang bersama periodenya (`pplPeriod().req`),
   sehingga tak ada peluang menampilkan ambang satu tahun atas angka tahun lain. */
import { PPL_SHORTFALL_LABEL, SKP_TOPIC_LABEL, isSkpTopic, pplPeriod } from './canon_ppl';
import { cpeFromTraining, skpEntriesOf } from './cpe_training';
import type { BpjsRegistry } from './canon_bpjs';
import type { HolidayCalendar } from './canon_leave';
import type { SkpTopic } from './canon_ppl';
import type { TrainingAttendance, TrainingCourse } from './cpe_training';
import { useAmsPersist, useAuth } from './contexts';
import { resolveEmpId } from './ethics_compliance';
import { personalSubmitLeave, personalDeclare } from './api';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Stat } from './ui';

/* ============================================================
   Asseris — "Data Personal Saya" (PRD Isolasi Data Personal).
   Ringkasan self-scoped (personal.get) untuk seluruh peran. Tombol "Detil" membuka
   HALAMAN detail informatif (in-module, bukan modal, bukan navigasi ke modul admin) —
   sidebar tetap ramping. Dari halaman detail, pegawai bisa SELF-SERVICE: mengajukan cuti,
   menandatangani deklarasi independensi & kode etik atas namanya sendiri (personal.submitLeave/
   personal.declare — server men-scope ke empId sesi, tak menyentuh baris pegawai lain).
   2026-07-06.
   ============================================================ */

const { useState: useStatePS } = React;

type PayRec = { gross: number; allowance: number; ptkp: string; ter: number };
type Emergency = { name?: string; rel?: string; phone?: string };
type Prof = { salaryBand?: string; band?: string; empType?: string; location?: string; npwp?: string; nik?: string; bpjsKes?: string; bpjsTk?: string; emergency?: Emergency };
type Bal = { carry?: number };
type LeaveReq = { id: string; type: string; from: string; to: string; days: number; status: string; reason?: string; emp?: string };
type SkpRec = { t: string; type: string; skp: number; date: string; topic?: unknown; src?: string };
type IndepRec = { id?: string; declared: boolean; conflicts: number; rotationClient: string; tenure: number; rotationLimit: number; finInterest?: string; sektor?: string; basis?: string; cooloff?: number };
type EthicsRec = { signed: boolean; date: string; exceptions: number; items?: number[] };
type CaseRec = { id: string; date: string; cat: string; severity: string; status: string; sanction: string; desc?: string; channel?: string };
type PerfRec = { pot?: number; promote?: string };
type GoalRec = { kpi: string; target: string; actual: string; score: number; weight: number };
type StaffRow = { id: string; name: string; role: string; grade: string; cert?: string; joined?: number };

type Kids = JSX.Element | string | number | boolean | null | undefined | Kids[];
const rec = <T,>(v: unknown): Record<string, T> => (v && typeof v === 'object' ? (v as Record<string, T>) : {});
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const fmtDate = (s: string): string => { try { return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return s; } };
const iconC = (name: string): ((p: { size?: number }) => JSX.Element) => (I as Record<string, (p: { size?: number }) => JSX.Element>)[name] || (I as Record<string, (p: { size?: number }) => JSX.Element>).panel;

const LV_STAT: Record<string, string> = { Disetujui: 'green', Menunggu: 'amber', Ditolak: 'red' };
const HC_SEV: Record<string, string> = { Ringan: 'green', Sedang: 'amber', Berat: 'red' };
const LEAVE_TYPES = ['Cuti Tahunan', 'Sakit', 'Izin', 'Cuti Menikah', 'Cuti Melahirkan'];
const DETAIL_META: Record<string, { title: string; icon: string }> = {
  payroll: { title: 'Gaji & Pajak (PPh 21)', icon: 'coins' },
  cpe: { title: 'PPL / SKP', icon: 'book' },
  leave: { title: 'Cuti & Kehadiran', icon: 'calendar' },
  indep: { title: 'Independensi & Rotasi', icon: 'shield' },
  ethics: { title: 'Etika & Kepatuhan', icon: 'check' },
  conduct: { title: 'Sanksi & Disiplin', icon: 'alert' },
  perf: { title: 'Kinerja', icon: 'chart' },
  profile: { title: 'Profil (Data Pribadi)', icon: 'users' },
};

function Section({ title, icon, onDetail, children }: { key?: string; title: string; icon: string; onDetail?: () => void; children: Kids }) {
  const IconC = iconC(icon);
  return (
    <Panel noBody>
      <div className="panel-h"><span className="row ac gap8"><IconC size={15} /><h3 style={{ margin: 0 }}>{title}</h3></span><div style={{ flex: 1 }} />{onDetail && <button className="btn sm" style={{ height: 24, color: 'var(--blue)' }} onClick={onDetail}><I.search2 size={12} /> Detil</button>}</div>
      <div style={{ padding: 14 }}>{children}</div>
    </Panel>
  );
}

function Kv({ label, v, accent }: { key?: string; label: string; v: string | number; accent?: string }) {
  return (
    <div className="panel" style={{ padding: '8px 10px', boxShadow: 'none' }}>
      <div className="tiny muted upper" style={{ marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: accent || 'var(--ink)' }}>{v}</div>
    </div>
  );
}

function DRow({ l, v, accent, bold }: { key?: string; l: string; v: string | number; accent?: string; bold?: boolean }) {
  return (
    <div className="row ac jb" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <span className="tiny" style={{ color: 'var(--ink-2)' }}>{l}</span>
      <span className="mono" style={{ fontSize: 12, fontWeight: bold ? 700 : 600, color: accent || 'var(--ink)' }}>{v}</span>
    </div>
  );
}

function DataPersonalSaya() {
  const uid = React.useId();
  const fmt = AMS.fmt;
  const rp = AMS.rp;
  const auth = useAuth();
  const user = (auth && auth.user) ? { email: auth.user.email, name: auth.user.name } : null;
  const empId = resolveEmpId(user);
  const [page, setPage] = useStatePS(null); // section key | null (null = dasbor)
  // override lokal pasca self-service (server sudah menulis; ini agar tampilan langsung segar
  // tanpa reload). null = pakai nilai dari personal.get.
  const [reqOv, setReqOv] = useStatePS(null);
  const [indepOv, setIndepOv] = useStatePS(null);
  const [ethOv, setEthOv] = useStatePS(null);
  const [lvForm, setLvForm] = useStatePS({ type: 'Cuti Tahunan', from: '', to: '', reason: '' });
  const [busy, setBusy] = useStatePS(false);
  const [msg, setMsg] = useStatePS(null); // { ok:boolean, t:string } | null

  const payAll = rec<PayRec>(useAmsPersist('payrollData', () => AMS.PAYROLL)[0]);
  const balAll = rec<Bal>(useAmsPersist('leaveBalance', () => AMS.LEAVE_BALANCE)[0]);
  const reqAll = arr<LeaveReq>(useAmsPersist('leaveReqs', () => AMS.LEAVE_REQUESTS)[0]);
  const cpeLogAll = rec<SkpRec[]>(useAmsPersist('cpeLog', () => AMS.CPE_LOG)[0]);
  const cpeExtraAll = rec<SkpRec[]>(useAmsPersist('cpeExtra', {})[0]);
  /* Kredit SKP dari pelatihan terkonfirmasi — register KETIGA yang halaman ini
     dulu tak pernah baca. Store firm-scope yang sama dengan CPE/PPL Tracker. */
  const attendance = useAmsPersist('trainingAttendance.v1', () => ({}))[0] as TrainingAttendance;
  const indepAll = arr<IndepRec>(useAmsPersist('independence', () => AMS.INDEPENDENCE)[0]);
  const ethAll = rec<EthicsRec>(useAmsPersist('pc.ethics', () => AMS.ETHICS_DECL)[0]);
  const caseAll = arr<CaseRec & { staff: string }>(useAmsPersist('hrCases', () => AMS.HR_CASES)[0]);
  const perfAll = rec<PerfRec>(useAmsPersist('perfPeople', () => (AMS as { PERF_CYCLE?: { people?: unknown } }).PERF_CYCLE?.people)[0]);
  const goalsAll = rec<GoalRec[]>(useAmsPersist('perfGoals', () => (AMS as { PERF_CYCLE?: { goals?: unknown } }).PERF_CYCLE?.goals)[0]);
  const profAll = rec<Prof>(useAmsPersist('staffProfile', () => AMS.STAFF_PROFILE)[0]);

  const rosterA = AMS as { STAFF?: unknown; FIRM_STAFF?: unknown };
  const staff = [...arr<StaffRow>(rosterA.STAFF), ...arr<StaffRow>(rosterA.FIRM_STAFF)].find((s) => s.id === empId);
  const R = (AMS as { PAYROLL_RATES?: BpjsRegistry }).PAYROLL_RATES;
  const ethItems = arr<{ k: string }>((AMS as { ETHICS_ITEMS?: unknown }).ETHICS_ITEMS);

  if (!empId || !staff) {
    return (<><SubBar moduleId="personal" /><div className="view-scroll"><div className="view-pad"><Panel><div style={{ padding: 28, textAlign: 'center' }} className="tiny muted">Akun Anda tidak terhubung ke profil staf, sehingga tidak ada data personal untuk ditampilkan di sini.</div></Panel></div></div></>);
  }

  // data efektif (override lokal bila ada)
  const reqData: LeaveReq[] = reqOv ? arr<LeaveReq>(reqOv) : reqAll;
  const indepData: IndepRec[] = indepOv ? arr<IndepRec>(indepOv) : indepAll;
  const ethData: Record<string, EthicsRec> = ethOv ? rec<EthicsRec>(ethOv) : ethAll;

  const pay = payAll[empId];
  const bal = balAll[empId];
  const myReqs = reqData.filter((r) => r.emp === empId);
  /* PRD sdm-kepatuhan PR-3 (lanjutan) — SATU mesin PPL, juga di sini.
     Halaman ini dulu menjumlahkan SKP MENTAH: tanpa batas 10 SKP tidak
     terstruktur (PMK 186 Ps. 37), tanpa materi wajib, tanpa periode, dan
     tanpa kredit pelatihan. Seorang pegawai karenanya dapat membaca
     "44/40 — memenuhi" di halamannya sendiri sementara HR membaca 32/40
     untuk orang dan tahun yang sama. `pplPeriod` + `skpEntriesOf` adalah
     pintu yang sama persis dengan CPE/PPL Tracker dan LICENSING.pplOf. */
  const trainingByEmp = cpeFromTraining((AMS as { TRAINING_CATALOG?: TrainingCourse[] }).TRAINING_CATALOG, attendance);
  const skpAll = skpEntriesOf<SkpRec>(empId, { extra: cpeExtraAll, training: trainingByEmp, base: cpeLogAll });
  const ppl = pplPeriod(skpAll, String(AMS.TODAY));
  const pplSt = ppl.status;
  const req = ppl.req;
  const skpRecs: SkpRec[] = ppl.entries;
  const skpTotal = pplSt.countedTotal;
  const skpStruct = pplSt.structured;
  /* `compliant` hanya menyatakan limb yang DAPAT diuji. Bila materi wajib belum
     terlacak, kepatuhan Pasal 37 belum terbukti — dan tidak boleh disulap
     menjadi centang hijau di halaman orangnya sendiri. */
  const skpProven = pplSt.compliant && pplSt.topicsTracked;
  const skpAccent = skpProven ? 'var(--green)' : 'var(--amber)';
  const skpLabel = skpProven ? 'Memenuhi' : pplSt.compliant ? 'Belum terbukti' : 'Belum memenuhi';
  const myIndep = indepData.find((d) => d.id === empId);
  const myEthics = ethData[empId];
  const myCases = caseAll.filter((c) => c.staff === empId);
  /* PRD sdm-kepatuhan PR-2 — skor & 9-box DITURUNKAN (canon_perf). */
  const myPerfRec = perfAll[empId];
  const myPerf = myPerfRec ? perfPersonOf(empId, myPerfRec, goalsAll[empId]) : null;
  const myGoals = goalsAll[empId] || [];
  const myProf = profAll[empId];
  /* PRD sdm-kepatuhan PR-1 — saldo cuti DITURUNKAN dari register permintaan
     (canon_leave), bukan literal `ent`/`used`. Mesin yang sama dipakai modul
     Cuti & Kehadiran dan drawer profil HCM. */
  const lvLedger = leaveLedgerOf(empId, staff.joined, reqData, bal?.carry || 0,
    String(AMS.TODAY || ''), AMS.LEAVE_HOLIDAYS as unknown as HolidayCalendar);
  const lvTotal = lvLedger.quota;
  const lvLeft = lvLedger.remaining;
  const payBase = pay ? pay.gross + pay.allowance : 0;
  const payPph = pay ? Math.round(payBase * pay.ter) : 0;

  const open = (key: string) => { setMsg(null); setPage(key); };
  const back = () => { setMsg(null); setPage(null); };

  /* ---- self-service handlers (server men-scope ke empId sesi) ---- */
  const doSubmitLeave = async () => {
    if (!lvForm.from || !lvForm.to) { setMsg({ ok: false, t: 'Isi tanggal mulai dan selesai.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await personalSubmitLeave({ type: lvForm.type, from: lvForm.from, to: lvForm.to, reason: lvForm.reason });
      if (res && res.value) { setReqOv(res.value); setLvForm({ type: 'Cuti Tahunan', from: '', to: '', reason: '' }); setMsg({ ok: true, t: 'Permohonan cuti terkirim — menunggu persetujuan HRD.' }); }
      else setMsg({ ok: false, t: 'Gagal mengirim permohonan.' });
    } catch (e) { setMsg({ ok: false, t: 'Gagal mengirim permohonan. Coba lagi.' }); }
    setBusy(false);
  };
  const doDeclare = async (kind: string) => {
    setBusy(true); setMsg(null);
    try {
      const res = await personalDeclare(kind);
      if (res && res.value != null) {
        if (kind === 'independence') setIndepOv(res.value); else setEthOv(res.value);
        setMsg({ ok: true, t: kind === 'independence' ? 'Deklarasi independensi tersimpan.' : 'Deklarasi kode etik tersimpan.' });
      } else setMsg({ ok: false, t: 'Gagal menyimpan deklarasi.' });
    } catch (e) { setMsg({ ok: false, t: 'Gagal menyimpan deklarasi. Coba lagi.' }); }
    setBusy(false);
  };

  /* ---- isi informatif per-seksi (dipakai di halaman detail) ---- */
  const detailInfo = (): Kids => {
    switch (page) {
      case 'payroll': {
        if (!pay) return <div className="tiny muted">Data gaji Anda belum tersedia.</div>;
        const base = pay.gross + pay.allowance;
        /* PRD regulatory-reference-annual PR-2 — satu pintu (`canon_bpjs`).
           Rumus ini dulu SALINAN dari `view_payroll`, dengan batas upah yang tak
           pernah dicocokkan dengan masanya. Bila set masa itu tak ada, halaman ini
           menolak menampilkan potongan: ini slip gaji orangnya sendiri. */
        const c = bpjsContribution(pay.gross, R, R?.periodDate);
        if (!c.computed) {
          return (<>
            <DRow l="Gaji Pokok" v={rp(pay.gross)} />
            <DRow l="Tunjangan" v={rp(pay.allowance)} />
            <DRow l="Penghasilan Bruto" v={rp(base)} bold />
            <div className="tiny" style={{ marginTop: 8, lineHeight: 1.55, color: 'var(--red)', fontWeight: 600 }}>
              Potongan BPJS belum dapat dihitung untuk masa ini. {c.note}
            </div>
          </>);
        }
        const { dKes, dJht, dJp } = c;
        const net = base - dKes - dJht - dJp - payPph;
        return (<>
          <DRow l="Gaji Pokok" v={rp(pay.gross)} />
          <DRow l="Tunjangan" v={rp(pay.allowance)} />
          <DRow l="Penghasilan Bruto" v={rp(base)} bold />
          <div className="tiny muted upper" style={{ marginTop: 6 }}>Potongan</div>
          <DRow l="BPJS Kesehatan (1%)" v={'(' + fmt(dKes / 1e3, 0) + ' rb)'} />
          <DRow l="BPJS JHT (2%)" v={'(' + fmt(dJht / 1e3, 0) + ' rb)'} />
          <DRow l="BPJS Jaminan Pensiun (1%)" v={'(' + fmt(dJp / 1e3, 0) + ' rb)'} />
          <DRow l={'PPh 21 — TER ' + (pay.ter * 100).toFixed(2) + '%'} v={'(' + rp(payPph).replace('Rp ', '') + ')'} accent="var(--amber)" />
          <DRow l="Take-Home (Neto)" v={rp(net)} bold accent="var(--green)" />
          <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.5 }}>Status PTKP <b>{pay.ptkp}</b> · metode PPh 21 TER (PMK 168/2023). Angka indikatif — Bukti Potong 1721 resmi diterbitkan HRD.</div>
        </>);
      }
      case 'cpe': return (<>
        <div className="row gap8" style={{ marginBottom: 4, flexWrap: 'wrap' }}>
          <Badge kind={skpProven ? 'green' : 'amber'}>{skpTotal}/{req.annual} SKP terhitung</Badge>
          <Badge kind={skpStruct >= req.structuredMin ? 'green' : 'amber'}>{skpStruct}/{req.structuredMin} terstruktur</Badge>
          {pplSt.forfeitedUnstructured > 0 && <Badge kind="amber" title={'Batas SKP tidak terstruktur ' + req.unstructuredCap + ' SKP (' + req.basis + ')'}>{pplSt.forfeitedUnstructured} SKP hangus</Badge>}
          <Badge kind="blue">Tahun {ppl.year == null ? '—' : ppl.year}</Badge>
        </div>
        <div className="tiny muted" style={{ marginBottom: 8, lineHeight: 1.5 }}>
          Dari {pplSt.structured} SKP terstruktur + {pplSt.countedUnstructured} SKP tidak terstruktur yang dapat diperhitungkan (batas {req.unstructuredCap}). Dasar: {req.basis}.
        </div>
        {skpRecs.length ? skpRecs.map((r, i) => (
          <div key={i} className="row ac jb" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
            <div style={{ minWidth: 0 }}><div className="tiny truncate" style={{ fontWeight: 600 }}>{r.t}{r.src === 'training' ? ' · dari pelatihan' : ''}</div><div className="tiny muted">{fmtDate(r.date)} · {r.type}{r.type === 'Terstruktur' ? (isSkpTopic(r.topic) ? ' · ' + SKP_TOPIC_LABEL[r.topic as SkpTopic] : ' · materi belum diklasifikasi') : ''}</div></div>
            <span className="mono" style={{ fontWeight: 700 }}>{r.skp} SKP</span>
          </div>
        )) : <div className="tiny muted">Belum ada SKP tercatat tahun ini.</div>}
        {(pplSt.shortfalls.length > 0 || !pplSt.topicsTracked) && (
          <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            {pplSt.shortfalls.map((f) => (
              <div key={f} className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>· {PPL_SHORTFALL_LABEL[f]}</div>
            ))}
            {!pplSt.topicsTracked && (
              <div className="tiny" style={{ lineHeight: 1.5, marginTop: pplSt.shortfalls.length ? 4 : 0 }}>
                Materi wajib ({req.topicPembinaanMin} SKP pembinaan/pengawasan AP &amp; KAP + {req.topicAkuntansiMin} SKP akuntansi/asurans) belum terlacak pada seluruh entri terstruktur Anda — kepatuhan penuh Pasal 37 <b>belum dapat dibuktikan</b> dari data ini. Lengkapi klasifikasi materi lewat HRD.
              </div>
            )}
          </div>
        )}
      </>);
      case 'leave': return (<>
        {bal ? (<>
          <DRow l="Hak cuti tahunan" v={lvLedger.entitlement.days + ' hari'} />
          <DRow l="Saldo tahun lalu" v={lvLedger.carryUsable + ' hari'} />
          <DRow l="Terpakai (disetujui)" v={lvLedger.used + ' hari kerja'} />
          <DRow l="Diajukan (menunggu)" v={lvLedger.pending + ' hari kerja'} />
          <DRow l="Sisa" v={lvLeft + ' hari'} bold accent={lvLeft <= 2 ? 'var(--amber)' : 'var(--green)'} />
        </>) : <div className="tiny muted">Saldo cuti Anda belum tersedia.</div>}
        <div className="tiny muted upper" style={{ marginTop: 8 }}>Riwayat Pengajuan</div>
        {myReqs.length ? myReqs.map((r) => (
          <div key={r.id} className="panel" style={{ padding: '8px 10px', boxShadow: 'none' }}>
            <div className="row ac jb"><span className="tiny" style={{ fontWeight: 700 }}>{r.type}</span><Badge kind={LV_STAT[r.status] || 'gray'}>{r.status}</Badge></div>
            <div className="tiny muted">{fmtDate(r.from)} – {fmtDate(r.to)} · {evaluateLeaveRow(r, AMS.LEAVE_HOLIDAYS as unknown as HolidayCalendar).days} hari kerja{r.reason ? ' · ' + r.reason : ''}</div>
          </div>
        )) : <div className="tiny muted">Tidak ada pengajuan cuti.</div>}
      </>);
      case 'indep': {
        if (!myIndep) return <div className="tiny muted">Tidak ada catatan independensi untuk Anda.</div>;
        return (<>
          <DRow l="Deklarasi tahunan" v={myIndep.declared ? 'Diterima' : 'Belum'} accent={myIndep.declared ? 'var(--green)' : 'var(--red)'} />
          <DRow l="Konflik teridentifikasi" v={myIndep.conflicts} accent={myIndep.conflicts ? 'var(--amber)' : 'var(--green)'} />
          {myIndep.finInterest ? <DRow l="Kepentingan keuangan" v={myIndep.finInterest} /> : null}
          <DRow l="Klien rotasi" v={myIndep.rotationClient === '—' ? 'n/a' : myIndep.rotationClient.replace('PT ', '')} />
          <DRow l="Masa tugas" v={myIndep.rotationClient === '—' ? 'n/a' : myIndep.tenure + ' / ' + myIndep.rotationLimit + ' tahun'} accent={myIndep.tenure >= myIndep.rotationLimit ? 'var(--red)' : 'var(--ink)'} />
          {myIndep.sektor ? <DRow l="Sektor" v={myIndep.sektor} /> : null}
          {myIndep.basis ? <DRow l="Basis rotasi" v={myIndep.basis} /> : null}
        </>);
      }
      case 'ethics': {
        if (!myEthics) return <div className="tiny muted">Belum ada deklarasi etik.</div>;
        return (<>
          <DRow l="Deklarasi Kode Etik" v={myEthics.signed ? 'Ditandatangani' : 'Belum'} accent={myEthics.signed ? 'var(--green)' : 'var(--red)'} />
          <DRow l="Tanggal" v={myEthics.signed ? fmtDate(myEthics.date) : '—'} />
          <DRow l="Pengecualian dilaporkan" v={myEthics.exceptions || 0} accent={myEthics.exceptions ? 'var(--amber)' : 'var(--green)'} />
          <div className="tiny muted upper" style={{ marginTop: 8 }}>Butir Kepatuhan</div>
          {ethItems.length ? ethItems.map((it, i) => {
            const ok = myEthics.signed && (myEthics.items || [])[i] === 1;
            return <div key={i} className="row ac jb" style={{ padding: '5px 0', borderBottom: '1px solid var(--line-soft)' }}><span className="tiny" style={{ maxWidth: 420 }}>{it.k}</span>{myEthics.signed ? (ok ? <I.check size={13} style={{ color: 'var(--green)' }} /> : <I.alert size={13} style={{ color: 'var(--amber)' }} />) : <span className="tiny muted">–</span>}</div>;
          }) : <div className="tiny muted">Rincian butir tidak tersedia.</div>}
        </>);
      }
      case 'conduct': return myCases.length ? (<>{myCases.map((c) => (
        <div key={c.id} className="panel" style={{ padding: '10px 12px', boxShadow: 'none', borderLeft: '3px solid var(--' + (HC_SEV[c.severity] || 'gray') + ')' }}>
          <div className="row ac jb" style={{ marginBottom: 4 }}><span className="tiny" style={{ fontWeight: 700 }}>{c.cat}</span><Badge kind={HC_SEV[c.severity] || 'gray'}>{c.severity}</Badge></div>
          {c.desc ? <div className="tiny" style={{ marginBottom: 4, lineHeight: 1.5 }}>{c.desc}</div> : null}
          <div className="tiny muted">{fmtDate(c.date)} · {c.status}{c.channel ? ' · ' + c.channel : ''}</div>
          <div className="tiny" style={{ marginTop: 4 }}><b>Sanksi:</b> {c.sanction}</div>
        </div>
      ))}</>) : <div className="tiny" style={{ color: 'var(--green)' }}>Tidak ada kasus disiplin atas nama Anda.</div>;
      case 'perf': {
        if (!myPerf) return <div className="tiny muted">Data kinerja Anda belum tersedia.</div>;
        return (<>
          <DRow l="Skor Kinerja" v={myPerf.score.score === null ? 'Belum dapat dinilai' : myPerf.score.score.toFixed(2) + ' / 5'} bold accent={myPerf.score.score === null ? 'var(--ink-3)' : myPerf.score.score >= 4.3 ? 'var(--green)' : 'var(--blue)'} />
          <DRow l="Potensi" v={myPerf.pot === null ? '—' : myPerf.pot.toFixed(1) + ' / 5'} />
          <DRow l="Penempatan 9-Box" v={myPerf.placement.placeable ? myPerf.placement.label : myPerf.placement.note || '—'} />
          <DRow l="Rekomendasi" v={myPerf.promote === '—' ? 'Pertahankan' : myPerf.promote} accent={myPerf.promote !== '—' ? 'var(--purple)' : undefined} />
          <div className="tiny muted upper" style={{ marginTop: 8 }}>Sasaran & KPI</div>
          {myGoals.length ? myGoals.map((g, i) => (
            <div key={i} className="panel" style={{ padding: '8px 10px', boxShadow: 'none' }}>
              <div className="row ac jb"><span className="tiny truncate" style={{ fontWeight: 600 }}>{g.kpi}</span><span className="chip tiny">{g.weight}%</span></div>
              <div className="tiny muted">Target {g.target} · Aktual <b style={{ color: 'var(--ink)' }}>{g.actual}</b> · Skor {g.score.toFixed(1)}</div>
            </div>
          )) : <div className="tiny muted">Rincian KPI tersedia setelah siklus reviu dilengkapi.</div>}
        </>);
      }
      case 'profile': return (<>
        <DRow l="Nama" v={staff.name} />
        <DRow l="ID Karyawan" v={staff.id} />
        <DRow l="Jabatan" v={staff.role} />
        <DRow l="Jenjang" v={staff.grade} />
        <DRow l="Bergabung" v={staff.joined ? String(staff.joined) : '—'} />
        <DRow l="Sertifikasi" v={staff.cert || '—'} />
        {myProf ? (<>
          {myProf.band ? <DRow l="Band" v={myProf.band} /> : null}
          {myProf.salaryBand ? <DRow l="Rentang Gaji" v={myProf.salaryBand} /> : null}
          {myProf.empType ? <DRow l="Status Kepegawaian" v={myProf.empType} /> : null}
          {myProf.location ? <DRow l="Lokasi" v={myProf.location} /> : null}
          {myProf.nik ? <DRow l="NIK" v={myProf.nik} /> : null}
          {myProf.npwp ? <DRow l="NPWP" v={myProf.npwp} /> : null}
          {myProf.emergency && myProf.emergency.name ? <DRow l="Kontak Darurat" v={myProf.emergency.name + (myProf.emergency.phone ? ' · ' + myProf.emergency.phone : '')} /> : null}
        </>) : null}
        <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.5 }}>Pemutakhiran NIK/NPWP/kontak darurat dikelola oleh HRD.</div>
      </>);
      default: return null;
    }
  };

  /* ---- blok self-service per-seksi (cuti / deklarasi) ---- */
  const selfService = (): Kids => {
    if (page === 'leave') return (
      <Panel noBody>
        <div className="panel-h"><span className="row ac gap8"><I.plus size={14} /><h3 style={{ margin: 0 }}>Ajukan Cuti</h3></span></div>
        <div style={{ padding: 14, display: 'grid', gap: 10 }}>
          <div className="field"><label htmlFor={uid+'-jenis-cuti'}>Jenis Cuti</label><select id={uid+'-jenis-cuti'} className="select" value={lvForm.type} onChange={(e: { target: { value: string } }) => setLvForm((f: typeof lvForm) => ({ ...f, type: e.target.value }))}>{LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label htmlFor={uid+'-dari'}>Dari</label><input id={uid+'-dari'} className="input" type="date" value={lvForm.from} onChange={(e: { target: { value: string } }) => setLvForm((f: typeof lvForm) => ({ ...f, from: e.target.value }))} /></div>
            <div className="field"><label htmlFor={uid+'-sampai'}>Sampai</label><input id={uid+'-sampai'} className="input" type="date" value={lvForm.to} onChange={(e: { target: { value: string } }) => setLvForm((f: typeof lvForm) => ({ ...f, to: e.target.value }))} /></div>
          </div>
          <div className="field"><label htmlFor={uid+'-alasan'}>Alasan</label><input id={uid+'-alasan'} className="input" value={lvForm.reason} placeholder="mis. Keperluan keluarga" onChange={(e: { target: { value: string } }) => setLvForm((f: typeof lvForm) => ({ ...f, reason: e.target.value }))} /></div>
          <Btn variant="primary" disabled={busy} style={{ opacity: busy ? 0.6 : 1, justifyContent: 'center' }} onClick={doSubmitLeave}><I.send size={14} /> {busy ? 'Mengirim…' : 'Ajukan Permohonan'}</Btn>
          <div className="tiny muted">Permohonan masuk sebagai <b>Menunggu</b> dan disetujui/ditolak oleh HRD di modul Cuti.</div>
        </div>
      </Panel>
    );
    if (page === 'indep') return (
      <Panel noBody>
        <div className="panel-h"><span className="row ac gap8"><I.shield size={14} /><h3 style={{ margin: 0 }}>Deklarasi Independensi</h3></span></div>
        <div style={{ padding: 14, display: 'grid', gap: 10 }}>
          <div className="tiny muted" style={{ lineHeight: 1.5 }}>Dengan menandatangani, Anda menyatakan independensi sesuai Kode Etik IAPI/IESBA (bebas kepentingan keuangan material, hubungan keluarga dekat, ancaman kedekatan/intimidasi yang tak dapat dimitigasi). Reviu manajer & persetujuan partner mengikuti di modul Independensi.</div>
          {myIndep && myIndep.declared
            ? <div className="tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={12} /> Deklarasi tahunan Anda sudah tercatat.</div>
            : <Btn variant="primary" disabled={busy} style={{ opacity: busy ? 0.6 : 1, justifyContent: 'center' }} onClick={() => doDeclare('independence')}><I.check size={14} /> {busy ? 'Menyimpan…' : 'Tandatangani Deklarasi Independensi'}</Btn>}
        </div>
      </Panel>
    );
    if (page === 'ethics') return (
      <Panel noBody>
        <div className="panel-h"><span className="row ac gap8"><I.check size={14} /><h3 style={{ margin: 0 }}>Deklarasi Kode Etik</h3></span></div>
        <div style={{ padding: 14, display: 'grid', gap: 10 }}>
          <div className="tiny muted" style={{ lineHeight: 1.5 }}>Dengan menandatangani, Anda menyatakan kepatuhan atas seluruh butir Kode Etik Profesi (IAPI) tahun berjalan.</div>
          {myEthics && myEthics.signed
            ? <div className="tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={12} /> Deklarasi kode etik Anda sudah ditandatangani ({fmtDate(myEthics.date)}).</div>
            : <Btn variant="primary" disabled={busy} style={{ opacity: busy ? 0.6 : 1, justifyContent: 'center' }} onClick={() => doDeclare('ethics')}><I.check size={14} /> {busy ? 'Menyimpan…' : 'Tandatangani Deklarasi Kode Etik'}</Btn>}
        </div>
      </Panel>
    );
    return null;
  };

  /* ================= HALAMAN DETAIL ================= */
  if (page) {
    const meta = DETAIL_META[page] || { title: 'Detil', icon: 'panel' };
    const IconC = iconC(meta.icon);
    return (
      <>
        <SubBar moduleId="personal" right={<Btn sm onClick={back}><I.arrowLeft size={13} /> Kembali</Btn>} />
        <div className="view-scroll"><div className="view-pad">
          <div className="row ac gap8" style={{ marginBottom: 12 }}>
            <button aria-label="Kembali" className="btn sm" onClick={back}><I.arrowLeft size={13} /></button>
            <IconC size={18} /><span style={{ fontSize: 15, fontWeight: 700 }}>{meta.title}</span>
            <div style={{ flex: 1 }} /><Badge kind="blue">Data milik Anda</Badge>
          </div>
          {msg ? <div className="panel" style={{ padding: '9px 12px', marginBottom: 12, boxShadow: 'none', background: msg.ok ? 'var(--green-bg)' : 'var(--red-bg)', borderColor: 'transparent' }}><span className="tiny" style={{ fontWeight: 600 }}>{msg.ok ? <I.check size={12} /> : <I.alert size={12} />} {msg.t}</span></div> : null}
          <div className="grid" style={{ gridTemplateColumns: selfService() ? '1.2fr 1fr' : '1fr', gap: 12, alignItems: 'start' }}>
            <Panel noBody><div style={{ padding: 16 }}>{detailInfo()}</div></Panel>
            {selfService()}
          </div>
        </div></div>
      </>
    );
  }

  /* ================= DASBOR ================= */
  return (
    <>
      <SubBar moduleId="personal" right={<Badge kind="blue">Data milik Anda saja</Badge>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="panel" style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '16px 18px', display: 'flex', gap: 13, alignItems: 'center', marginBottom: 12 }}>
          <Avatar name={staff.name} size={46} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }} className="truncate">{staff.name}</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>{staff.role} · {staff.id}{staff.cert ? ' · ' + staff.cert : ''}</div>
          </div>
          <span className="tiny" style={{ color: '#bcd6e4', textAlign: 'right', maxWidth: 250 }}>Klik <b>Detil</b> tiap bagian untuk rincian &amp; layanan mandiri (ajukan cuti, deklarasi independensi/etik).</span>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={pay ? 'Rp ' + fmt(payBase / 1e6, 1) + ' jt' : '—'} label="Penghasilan Bruto / bln" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={`${skpTotal}/${req.annual}`} label={ppl.year == null ? 'SKP (PPL) terhitung' : `SKP (PPL) ${ppl.year}`} accent={skpAccent} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={bal ? lvLeft + ' hari' : '—'} label="Sisa Cuti" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={myCases.length} label="Kasus Disiplin" accent={myCases.length ? 'var(--red)' : 'var(--green)'} /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
          <Section title="Gaji & Pajak (PPh 21)" icon="coins" onDetail={() => open('payroll')}>
            {pay ? (
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Kv label="Gaji Pokok" v={'Rp ' + fmt(pay.gross / 1e6, 1) + ' jt'} />
                <Kv label="Tunjangan" v={'Rp ' + fmt(pay.allowance / 1e6, 1) + ' jt'} />
                <Kv label="Status PTKP" v={pay.ptkp} />
                <Kv label="Tarif TER" v={(pay.ter * 100).toFixed(0) + '%'} />
                <Kv label="Estimasi PPh 21 / bln" v={'Rp ' + fmt(payPph / 1e6, 2) + ' jt'} accent="var(--amber)" />
                <Kv label="Estimasi Take-Home" v={'Rp ' + fmt((payBase - payPph) / 1e6, 1) + ' jt'} accent="var(--green)" />
              </div>
            ) : <div className="tiny muted">Data gaji Anda belum tersedia.</div>}
          </Section>

          <Section title="PPL / SKP" icon="book" onDetail={() => open('cpe')}>
            <div className="row gap12" style={{ marginBottom: 8 }}>
              <Kv label="SKP terhitung" v={`${skpTotal}/${req.annual}`} accent={skpAccent} />
              <Kv label="Terstruktur" v={`${skpStruct}/${req.structuredMin}`} accent={skpStruct >= req.structuredMin ? 'var(--green)' : 'var(--amber)'} />
              <Kv label="Status" v={skpLabel} accent={skpAccent} />
            </div>
            {pplSt.forfeitedUnstructured > 0 && (
              <div className="tiny" style={{ marginBottom: 8, lineHeight: 1.5, color: 'var(--amber)', fontWeight: 600 }}>
                {pplSt.forfeitedUnstructured} SKP tidak terstruktur hangus — melewati batas {req.unstructuredCap} SKP ({req.basis}).
              </div>
            )}
            {!pplSt.topicsTracked && (
              <div className="tiny muted" style={{ marginBottom: 8, lineHeight: 1.5 }}>
                Materi wajib Pasal 37 belum terlacak pada seluruh entri terstruktur — kepatuhan penuh belum dapat dibuktikan.
              </div>
            )}
            {skpRecs.length ? skpRecs.slice(0, 4).map((r, i) => (
              <div key={i} className="row ac jb" style={{ padding: '6px 0', borderBottom: i < Math.min(4, skpRecs.length) - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span className="tiny truncate" style={{ fontWeight: 600 }}>{r.t}</span><span className="tiny muted">{r.type} · {r.skp} SKP</span>
              </div>
            )) : <div className="tiny muted">Belum ada SKP tercatat tahun ini.</div>}
          </Section>

          <Section title="Cuti & Kehadiran" icon="calendar" onDetail={() => open('leave')}>
            {bal ? (
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
                <Kv label="Kuota" v={lvTotal + ' hari'} /><Kv label="Terpakai" v={lvLedger.used + ' hari'} /><Kv label="Sisa" v={lvLeft + ' hari'} accent={lvLeft <= 2 ? 'var(--amber)' : 'var(--green)'} />
              </div>
            ) : <div className="tiny muted" style={{ marginBottom: 8 }}>Saldo cuti Anda belum tersedia.</div>}
            {myReqs.length ? myReqs.slice(0, 3).map((r) => (
              <div key={r.id} className="row ac jb" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <span className="tiny" style={{ fontWeight: 600 }}>{r.type} · {fmtDate(r.from)}</span><Badge kind={LV_STAT[r.status] || 'gray'}>{r.status}</Badge>
              </div>
            )) : <div className="tiny muted">Tidak ada pengajuan cuti.</div>}
          </Section>

          <Section title="Independensi & Rotasi" icon="shield" onDetail={() => open('indep')}>
            {myIndep ? (
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Kv label="Deklarasi" v={myIndep.declared ? 'Diterima' : 'Belum'} accent={myIndep.declared ? 'var(--green)' : 'var(--red)'} />
                <Kv label="Konflik" v={myIndep.conflicts} accent={myIndep.conflicts ? 'var(--amber)' : 'var(--green)'} />
                <Kv label="Klien Rotasi" v={myIndep.rotationClient === '—' ? 'n/a' : myIndep.rotationClient.replace('PT ', '')} />
                <Kv label="Masa Tugas" v={myIndep.rotationClient === '—' ? 'n/a' : myIndep.tenure + '/' + myIndep.rotationLimit + ' th'} accent={myIndep.tenure >= myIndep.rotationLimit ? 'var(--red)' : 'var(--ink)'} />
              </div>
            ) : <div className="tiny muted">Tidak ada catatan independensi untuk Anda.</div>}
          </Section>

          <Section title="Etika & Kepatuhan" icon="check" onDetail={() => open('ethics')}>
            {myEthics ? (
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Kv label="Deklarasi Etik" v={myEthics.signed ? 'Ditandatangani' : 'Belum'} accent={myEthics.signed ? 'var(--green)' : 'var(--red)'} />
                <Kv label="Tanggal" v={myEthics.signed ? fmtDate(myEthics.date) : '—'} />
                <Kv label="Pengecualian" v={myEthics.exceptions || 0} accent={myEthics.exceptions ? 'var(--amber)' : 'var(--green)'} />
              </div>
            ) : <div className="tiny muted">Belum ada deklarasi etik.</div>}
          </Section>

          <Section title="Sanksi & Disiplin" icon="alert" onDetail={() => open('conduct')}>
            {myCases.length ? myCases.map((c) => (
              <div key={c.id} className="panel" style={{ padding: '9px 11px', boxShadow: 'none', marginBottom: 8 }}>
                <div className="row ac jb" style={{ marginBottom: 4 }}><span className="tiny" style={{ fontWeight: 700 }}>{c.cat}</span><Badge kind={HC_SEV[c.severity] || 'gray'}>{c.severity}</Badge></div>
                <div className="tiny muted">{fmtDate(c.date)} · {c.status} · {c.sanction}</div>
              </div>
            )) : <div className="tiny muted" style={{ color: 'var(--green)' }}>Tidak ada kasus disiplin atas nama Anda.</div>}
          </Section>

          <Section title="Kinerja" icon="chart" onDetail={() => open('perf')}>
            {myPerf ? (
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Kv label="Skor Kinerja" v={myPerf.score.score === null ? 'Belum dinilai' : myPerf.score.score.toFixed(2) + ' / 5'} accent={myPerf.score.score === null ? 'var(--ink-3)' : myPerf.score.score >= 4.3 ? 'var(--green)' : 'var(--blue)'} />
                <Kv label="Potensi" v={myPerf.pot === null ? '—' : myPerf.pot.toFixed(1) + ' / 5'} />
                <Kv label="Penempatan 9-Box" v={myPerf.placement.placeable ? myPerf.placement.label : '—'} />
                <Kv label="Rekomendasi" v={myPerf.promote === '—' ? 'Pertahankan' : myPerf.promote} />
              </div>
            ) : <div className="tiny muted">Data kinerja Anda belum tersedia.</div>}
          </Section>

          <Section title="Profil (Data Pribadi)" icon="users" onDetail={() => open('profile')}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Kv label="ID Karyawan" v={staff.id} /><Kv label="Jenjang" v={staff.grade} /><Kv label="Bergabung" v={staff.joined ? String(staff.joined) : '—'} /><Kv label="Sertifikasi" v={staff.cert || '—'} />
            </div>
          </Section>
        </div>
      </div></div>
    </>
  );
}


export { DataPersonalSaya };
