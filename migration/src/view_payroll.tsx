/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAuth, useNav } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Stat, Switch, Tabs } from './ui';
import { amsExportPdf } from './export_pdf';
import {
  TER_TABLE, annualReconciliation, payrollGlRows, payrollJournal, payrollJournalIds,
  payrollPostCheck, terRateOn, terTableOn,
} from './canon_pph21';
import type { GlJournalRow } from './canon_pph21';
import { BPJS_LABEL, bpjsContribution, bpjsRatesOn } from './canon_bpjs';
import { amsDateIso } from './clock_ssot';

/* ============================================================
   Asseris — HCM: Payroll (Penggajian)
   PPh 21 (metode TER · PMK 168/2023) · BPJS Kesehatan &
   Ketenagakerjaan · THR · slip gaji · jurnal penggajian.
   ============================================================ */
const { useState: usePR } = React;

type PSent = Record<string, { at: string; by: string }>;

/* Slip gaji satu pegawai.
   PRD sdm-kepatuhan PR-5 — tarif TER DITURUNKAN dari (PTKP, bruto) lewat
   `canon_pph21.terRate`, bukan dibaca dari field `ter` per-baris. Field lama
   masih diterima sebagai override eksplisit agar data terpersist lama tak
   mendadak berubah tanpa jejak; `terSource` mengatakan mana yang dipakai. */
function calcPayslip(p: any, R: any) {
  const base = p.gross + p.allowance;                     // penghasilan bruto
  /* PRD regulatory-reference-annual PR-2 — iuran BPJS lewat SATU pintu
     (`canon_bpjs`), berkunci masa berlaku. Dulu rumusnya disalin di sini DAN di
     `view_personal`, dengan batas upah yang tak pernah dicocokkan dengan masanya. */
  const c = bpjsContribution(p.gross, R, R?.periodDate);
  const { dKes, dJht, dJp } = c;
  const look = terRateOn(p.ptkp, base, R?.periodDate);
  /* `ter` tersimpan hanya dipakai bila tabel belum dapat menjawab. Tanpa ini,
     59 baris payroll yang ditambahkan PR-4 (tanpa `ter`) menghasilkan NaN. */
  const ter = look.rate != null ? look.rate : (typeof p.ter === 'number' ? p.ter : null);
  const terSource: 'tabel' | 'tersimpan' | 'tak-tentu' =
    look.rate != null ? 'tabel' : (typeof p.ter === 'number' ? 'tersimpan' : 'tak-tentu');
  const pph = ter != null ? Math.round(base * ter) : 0;   // TER bulanan
  const totalDed = dKes + dJht + dJp + pph;
  const net = base - totalDed;
  // employer contributions
  const { eKes, eJht, eJp, eJkk, eJkm } = c;
  const employerCost = base + eKes + eJht + eJp + eJkk + eJkm;
  return { base, dKes, dJht, dJp, pph, totalDed, net, eKes, eJht, eJp, eJkk, eJkm, employerCost,
    ter, terSource, terCategory: look.category, terVerified: look.verified, terNote: look.note,
    bpjsComputed: c.computed, bpjsBlocked: c.blocked, bpjsNote: c.note, bpjsVerified: c.status === 'ok' };
}

function Payroll() {
  const { fmt } = AMS;
  const nav = useNav();
  const auth = useAuth();
  const isFull = !!(auth && typeof auth.can === 'function' && (auth.can(CAP.HR_MANAGE) || auth.can(CAP.FIRM_ADMIN)));
  const R: any = AMS.PAYROLL_RATES;
  const staff: any = AMS.STAFF;
  // 2026-07-01 — server-fetched & row-filtered (personal.get via useAmsPersist('payrollData',…)),
  // bukan lagi AMS.PAYROLL statis: non-HR_MANAGE/FIRM_ADMIN hanya menerima baris miliknya sendiri
  // dari server — bukan cuma disembunyikan di UI (lihat server/src/personalScope.ts).
  const [PR] = useAmsPersist('payrollData', () => AMS.PAYROLL);
  const [sel, setSel] = usePR(null);
  const [run, setRun] = useAmsPersist('payrollRun', 'draft'); // draft | approved | paid
  const [sent, setSent] = useAmsPersist('payrollSent.v1', () => ({})); // { empId: { at, by } } — distribusi slip
  const meName = (auth && auth.user && auth.user.name) || 'HR';
  const sendToday = amsDateIso();   /* K-02: klok SSOT. Dulu jam mesin, dengan literal beku sebagai jaring pengaman. */
  const markSent = (id: string) => setSent((m: PSent) => ({ ...m, [id]: { at: sendToday, by: meName } }));
  const [thr, setThr] = usePR(false);
  const [tab, setTab] = usePR('gaji');

  const rows = staff.filter((s: any) => (PR as any)[s.id]).map((s: any) => {
    const p = (PR as any)[s.id];
    const slip = calcPayslip(p, R);
    return { ...s, p, slip, thr: thr ? p.gross + p.allowance : 0 };
  });
  const tot = rows.reduce((a: any, r: any) => ({
    gross: a.gross + r.slip.base, pph: a.pph + r.slip.pph,
    bpjsEmp: a.bpjsEmp + r.slip.dKes + r.slip.dJht + r.slip.dJp,
    net: a.net + r.slip.net + r.thr, employer: a.employer + r.slip.employerCost + r.thr,
  }), { gross: 0, pph: 0, bpjsEmp: 0, net: 0, employer: 0 });

  const STAT = { draft: { k: 'gray', l: 'Draft' }, approved: { k: 'blue', l: 'Disetujui' }, paid: { k: 'green', l: 'Dibayar' } };
  const person = sel ? rows.find((r: any) => r.id === sel) : null;
  // 2026-07-06 — Jurnal Penggajian = jurnal GL agregat firma (bukan data personal); hanya untuk
  // HR/Partner (isFull). Karyawan biasa lihat slip & bukti potong MILIKNYA saja.
  const PR_TABS = [{ id: 'gaji', label: 'Daftar Gaji' }, { id: 'bpjs', label: 'Ringkasan BPJS' }, ...(isFull ? [{ id: 'jurnal', label: 'Jurnal Penggajian' }] : []), { id: 'buktipotong', label: 'Bukti Potong 1721' }, { id: 'rekon', label: 'Rekonsiliasi Desember' }];
  /* employer + employee BPJS aggregates */
  const bpjs: any = rows.reduce((a: any, r: any) => ({
    eKes: a.eKes + r.slip.eKes, eJht: a.eJht + r.slip.eJht, eJp: a.eJp + r.slip.eJp, eJkk: a.eJkk + r.slip.eJkk, eJkm: a.eJkm + r.slip.eJkm,
    dKes: a.dKes + r.slip.dKes, dJht: a.dJht + r.slip.dJht, dJp: a.dJp + r.slip.dJp,
  }), { eKes: 0, eJht: 0, eJp: 0, eJkk: 0, eJkm: 0, dKes: 0, dJht: 0, dJp: 0 });
  const bpjsTotal = (Object.values(bpjs) as number[]).reduce((a, b) => a + b, 0);
  /* payroll journal */
  /* PRD sdm-kepatuhan PR-5 — jurnal dari kanon, dan ia benar-benar DIPOSTING. */
  const jv = payrollJournal({
    gross: tot.gross, pph: tot.pph, bpjsEmployee: bpjs.dKes + bpjs.dJht + bpjs.dJp,
    bpjsEmployer: bpjs.eKes + bpjs.eJht + bpjs.eJp + bpjs.eJkk + bpjs.eJkm, net: tot.net,
  });
  const journal = jv.lines.map((l) => ({ ac: l.ac + ' ' + l.label, dr: l.dr, cr: l.cr }));
  const jDr = jv.totalDr, jCr = jv.totalCr;
  const [gl, setGl] = useAmsPersist('firmgl', () => AMS.FIRM_GL);
  const glRows = (Array.isArray(gl) ? gl : []) as GlJournalRow[];
  const canPostGl = !!(auth && typeof auth.can === 'function' && auth.can(CAP.FIRMFIN_EDIT));
  const postChk = payrollPostCheck({ gl: glRows, period: R.period, runStatus: run, canPost: canPostGl, balanced: jv.balanced });
  const postToGl = () => {
    if (!postChk.ok) return;
    const rows = payrollGlRows(jv, R.period, sendToday);
    setGl((cur: unknown) => [...(Array.isArray(cur) ? cur : []), ...rows]);
  };
  const posted = payrollJournalIds(R.period);
  const alreadyPosted = glRows.some((j) => j.id === posted.salary);
  const unverifiedTer = !TER_TABLE.verified;

  /* GERBANG BPJS (PRD regulatory-reference-annual PR-2 · Q-3 = blokir yang
     menyangkut uang). Batas upah BPJS disesuaikan tiap tahun; menghitung masa
     yang tak dicakup registry akan menghasilkan potongan setiap pegawai atas
     dasar tahun lain — dan itu tampil di slip gaji orangnya sendiri. Modul
     menolak menghitung, bukan menghitung lalu menyesal. */
  const bpjsGate = bpjsRatesOn(R, R?.periodDate);
  /* TER hanya ada SEJAK 1 Januari 2024 (PMK 168/2023). Masa sebelumnya memakai
     metode lain sama sekali; menghitungnya dengan tabel ini memberi angka yang
     tampak sah di atas dasar yang belum ada (PR-3). */
  const terGate = terTableOn(R?.periodDate);
  const gate = bpjsGate.blocked ? bpjsGate : terGate.blocked ? terGate : null;
  if (gate) {
    return (
      <>
        <SubBar moduleId="payroll" right={<Badge kind="red">Perhitungan ditahan</Badge>} />
        <div className="view-scroll"><div className="view-pad">
          <Panel>
            <div style={{ padding: 22, maxWidth: 760 }}>
              <div className="row ac gap8" style={{ marginBottom: 8 }}>
                <span style={{ color: 'var(--red)' }}><I.alert size={17} /></span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Penggajian {R?.period || ''} tidak dihitung</span>
              </div>
              <p className="tiny" style={{ lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 10px' }}>{gate.note}</p>
              <p className="tiny" style={{ lineHeight: 1.6, color: 'var(--ink-3)', margin: 0 }}>
                {BPJS_LABEL} berubah tiap tahun. Menghitung masa ini dengan set tahun lain akan menggeser
                potongan <b>setiap pegawai</b> — dan angkanya akan tampil di slip gaji mereka sendiri tanpa
                penanda. Isi set yang berlaku untuk masa <span className="mono">{String(R?.periodDate || '—')}</span>{' '}
                lebih dulu, lalu jalankan kembali.
              </p>
            </div>
          </Panel>
        </div></div>
      </>
    );
  }

  return (
    <>
      <SubBar moduleId="payroll" right={<div className="row gap8 ac">
        {/* Tahap 9 — switch native (input checkbox asli, role="switch"). */}
        <Switch on={thr} onChange={setThr} label="Sertakan THR" />
        <Badge kind={(STAT as any)[run].k}>{(STAT as any)[run].l}</Badge>
        {run === 'draft' && <Btn sm variant="primary" onClick={() => setRun('approved')}><I.check size={13} /> Setujui Payroll</Btn>}
        {run === 'approved' && <Btn sm variant="primary" onClick={() => setRun('paid')}><I.coins size={13} /> Proses Pembayaran</Btn>}
        {run === 'paid' && <Btn sm onClick={() => setRun('draft')}><I.sync size={13} /> Periode Baru</Btn>}
      </div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="row jb ac" style={{ marginBottom: 12 }}>
          <div><span style={{ fontSize: 15, fontWeight: 700 }}>Penggajian — {R.period}</span><span className="tiny muted" style={{ marginLeft: 8 }}>{rows.length} karyawan · metode PPh 21 TER (PMK 168/2023)</span></div>
        </div>
        {!isFull && (
          <div className="tiny" style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            Menampilkan slip gaji <b>Anda sendiri saja</b> — figur "Total" di bawah adalah milik Anda, bukan agregat firma. Admin & HR Firma dan Partner melihat seluruh staf.
          </div>
        )}
        {unverifiedTer && (
          <div className="panel" style={{ padding: '9px 12px', marginBottom: 12, background: 'var(--amber-bg)', borderColor: 'transparent', boxShadow: 'none' }}>
            <div className="tiny" style={{ lineHeight: 1.5 }}>
              <b>Tarif TER belum diverifikasi.</b> Lapisan tarif pada <code>canon_pph21.TER_TABLE</code> direkonstruksi
              agar mereproduksi tarif yang selama ini dipakai aplikasi — <b>bukan disalin dari Lampiran {TER_TABLE.basis}</b>.
              Mekanismenya (PTKP → kategori → lapisan → tarif) sudah benar dan terpusat; angka lapisannya harus diganti
              dengan Lampiran resmi sebelum dipakai menghitung pajak sesungguhnya.
            </div>
          </div>
        )}
        {bpjsGate.status === 'unverified' && (
          <div className="panel" style={{ padding: '9px 12px', marginBottom: 12, background: 'var(--amber-bg)', borderColor: 'transparent', boxShadow: 'none' }}>
            <div className="tiny" style={{ lineHeight: 1.5 }}>
              <b>{BPJS_LABEL} belum diverifikasi.</b> {bpjsGate.note} Set yang dipakai berlaku{' '}
              <span className="mono">{bpjsGate.set?.effectiveFrom} – {bpjsGate.set?.effectiveTo || 'seterusnya'}</span>;
              dasarnya {bpjsGate.set?.basis}.
            </div>
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(tot.gross / 1e6, 0) + ' jt'} label="Total Penghasilan Bruto" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(tot.pph / 1e6, 1) + ' jt'} label="PPh 21 Dipotong" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(tot.net / 1e6, 0) + ' jt'} label="Total Take-Home (Neto)" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(tot.employer / 1e6, 0) + ' jt'} label="Total Beban Pemberi Kerja" accent="var(--blue)" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={PR_TABS} active={tab} onChange={setTab} /></div>
          {tab === 'gaji' && (<>
          <div className="panel-h"><h3>Daftar Gaji</h3><div style={{ flex: 1 }} /><span className="tiny muted">klik baris untuk slip gaji · Rp</span></div>
          <table className="dtbl">
            <thead><tr><th>Karyawan</th><th>PTKP</th><th className="num">Bruto</th><th className="num">BPJS (kary.)</th><th className="num">PPh 21</th>{thr && <th className="num">THR</th>}<th className="num">Take-Home</th><th></th></tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} onClick={() => setSel(r.id)} style={{ cursor: 'pointer' }} className={r.id === sel ? 'sel' : ''}>
                  <td><div className="row ac gap8"><Avatar name={r.name} size={26} /><div style={{ minWidth: 0 }}><div className="truncate" style={{ fontWeight: 600 }}>{r.name}</div><div className="tiny muted">{r.role}</div></div></div></td>
                  <td><span className="chip tiny">{r.p.ptkp}</span></td>
                  <td className="num">{fmt(r.slip.base / 1e6, 1)} jt</td>
                  <td className="num muted">{fmt((r.slip.dKes + r.slip.dJht + r.slip.dJp) / 1e3, 0)} rb</td>
                  <td className="num" style={{ color: 'var(--amber)' }}>{fmt(r.slip.pph / 1e6, 1)} jt</td>
                  {thr && <td className="num" style={{ color: 'var(--green)' }}>{fmt(r.thr / 1e6, 1)} jt</td>}
                  <td className="num" style={{ fontWeight: 700 }}>{fmt((r.slip.net + r.thr) / 1e6, 1)} jt</td>
                  <td><I.chevron size={14} style={{ color: 'var(--ink-4)' }} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={2}>TOTAL</td><td className="num">{fmt(tot.gross / 1e6, 0)} jt</td><td className="num">{fmt(tot.bpjsEmp / 1e6, 1)} jt</td><td className="num">{fmt(tot.pph / 1e6, 1)} jt</td>{thr && <td className="num">{fmt(rows.reduce((a: any, r: any) => a + r.thr, 0) / 1e6, 0)} jt</td>}<td className="num">{fmt(tot.net / 1e6, 0)} jt</td><td></td></tr></tfoot>
          </table>
          </>)}

          {tab === 'bpjs' && (
            <table className="dtbl">
              <thead><tr><th>Karyawan</th><th className="num">Kes (1%/4%)</th><th className="num">JHT (2%/3,7%)</th><th className="num">JP (1%/2%)</th><th className="num">JKK+JKM</th><th className="num">Total Iuran</th></tr></thead>
              <tbody>
                {rows.map((r: any) => {
                  const s = r.slip; const kes = s.dKes + s.eKes, jht = s.dJht + s.eJht, jp = s.dJp + s.eJp, jkkm = s.eJkk + s.eJkm;
                  return (
                    <tr key={r.id}>
                      <td><div className="row ac gap8"><Avatar name={r.name} size={24} /><span style={{ fontWeight: 600 }} className="truncate">{r.name}</span></div></td>
                      <td className="num mono">{fmt(kes / 1e3, 0)} rb</td>
                      <td className="num mono">{fmt(jht / 1e3, 0)} rb</td>
                      <td className="num mono">{fmt(jp / 1e3, 0)} rb</td>
                      <td className="num mono">{fmt(jkkm / 1e3, 0)} rb</td>
                      <td className="num mono" style={{ fontWeight: 700 }}>{fmt((kes + jht + jp + jkkm) / 1e3, 0)} rb</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr><td>TOTAL IURAN BPJS</td><td className="num">{fmt((bpjs.dKes + bpjs.eKes) / 1e6, 1)} jt</td><td className="num">{fmt((bpjs.dJht + bpjs.eJht) / 1e6, 1)} jt</td><td className="num">{fmt((bpjs.dJp + bpjs.eJp) / 1e6, 1)} jt</td><td className="num">{fmt((bpjs.eJkk + bpjs.eJkm) / 1e6, 1)} jt</td><td className="num">{fmt(bpjsTotal / 1e6, 1)} jt</td></tr></tfoot>
            </table>
          )}

          {tab === 'jurnal' && (
            <div style={{ padding: 14 }}>
              <div className="tiny muted upper" style={{ marginBottom: 8 }}>Jurnal Penggajian — {R.period}</div>
              <table className="dtbl">
                <thead><tr><th>Akun</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
                <tbody>
                  {journal.map((j, i) => (
                    <tr key={i}><td className="tiny">{j.ac}</td><td className="num mono">{j.dr ? 'Rp ' + fmt(j.dr, 0) : '—'}</td><td className="num mono">{j.cr ? 'Rp ' + fmt(j.cr, 0) : '—'}</td></tr>
                  ))}
                </tbody>
                <tfoot><tr><td>TOTAL {jDr === jCr && <span style={{ color: 'var(--green)', fontWeight: 700 }}>· Balance ✓</span>}</td><td className="num mono">Rp {fmt(jDr, 0)}</td><td className="num mono">Rp {fmt(jCr, 0)}</td></tr></tfoot>
              </table>
              <div className="row gap8 ac" style={{ marginTop: 12 }}>
                <Btn sm variant="primary" disabled={!postChk.ok} style={{ opacity: postChk.ok ? 1 : .5 }} title={postChk.ok ? 'Menulis jurnal penggajian ke buku besar firma' : postChk.reason} onClick={postToGl}><I.ledger size={13} /> Posting ke General Ledger</Btn>
                {alreadyPosted && <Btn sm onClick={() => nav('firmgl')}><I.ledger size={13} /> Lihat di Buku Besar</Btn>}
                {!postChk.ok && <span className="tiny" style={{ alignSelf: 'center', color: 'var(--amber)' }}>{postChk.reason}</span>}
                {postChk.ok && <span className="tiny muted" style={{ alignSelf: 'center' }}>Akan menulis {payrollGlRows(jv, R.period, sendToday).length} jurnal ke akun 5-100 / 2-200 / 1-102.</span>}
              </div>
            </div>
          )}

          {tab === 'buktipotong' && (
            <table className="dtbl">
              <thead><tr><th>Karyawan</th><th>NPWP / PTKP</th><th className="num">PPh 21 (bln)</th><th className="num">Kewajiban Tahunan (Ps. 17)</th><th>Form</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id}>
                    <td><div className="row ac gap8"><Avatar name={r.name} size={24} /><span style={{ fontWeight: 600 }} className="truncate">{r.name}</span></div></td>
                    <td><span className="chip tiny">{r.p.ptkp}</span></td>
                    <td className="num mono" style={{ color: 'var(--amber)' }}>{fmt(r.slip.pph / 1e6, 1)} jt</td>
                    <td className="num mono" title="Kewajiban setahun menurut Pasal 17 (bukan PPh bulanan × 12)">{fmt(annualReconciliation({ ptkp: r.p.ptkp, brutoMonthly: r.slip.base, iuranPensiunMonthly: r.slip.dJht + r.slip.dJp }).annualTax / 1e6, 1)} jt</td>
                    <td className="tiny mono">1721-A1</td>
                    <td><Badge kind={run === 'paid' ? 'green' : 'gray'}>{run === 'paid' ? 'Siap terbit' : 'Menunggu'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'rekon' && (
            <div style={{ padding: 14 }}>
              <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>
                Footer modul ini sudah lama menjanjikan rekonsiliasi tahunan tarif progresif Pasal 17 pada masa Desember;
                sampai PR ini tak ada satu baris pun yang melakukannya, dan tab Bukti Potong menampilkan
                <b> PPh bulanan × 12</b> — angka yang bukan kewajiban siapa pun. Di bawah, kewajiban setahun dihitung
                dari penghasilan neto (bruto − biaya jabatan − iuran pensiun) dikurangi PTKP, lalu dikenakan lapisan Pasal 17.
              </div>
              <table className="dtbl">
                <thead><tr><th>Karyawan</th><th>PTKP</th><th className="num">Bruto Setahun</th><th className="num">PKP</th><th className="num">PPh Setahun (Ps. 17)</th><th className="num">Terpotong Jan–Nov (TER)</th><th className="num">Masa Desember</th></tr></thead>
                <tbody>
                  {rows.map((r: any) => {
                    const rec = annualReconciliation({ ptkp: r.p.ptkp, brutoMonthly: r.slip.base, iuranPensiunMonthly: r.slip.dJht + r.slip.dJp });
                    return (
                      <tr key={r.id}>
                        <td><div className="row ac gap8"><Avatar name={r.name} size={24} /><span style={{ fontWeight: 600 }} className="truncate">{r.name}</span></div></td>
                        <td><span className="chip tiny">{r.p.ptkp}</span></td>
                        <td className="num mono">{fmt(rec.brutoAnnual / 1e6, 1)} jt</td>
                        <td className="num mono">{fmt(rec.pkp / 1e6, 1)} jt</td>
                        <td className="num mono" style={{ fontWeight: 700 }}>{fmt(rec.annualTax / 1e6, 1)} jt</td>
                        <td className="num mono muted">{fmt(rec.withheldToDate / 1e6, 1)} jt</td>
                        <td className="num mono" style={{ fontWeight: 700, color: rec.decemberWithholding < 0 ? 'var(--num-neg)' : 'var(--amber)' }}>
                          {rec.decemberWithholding < 0 ? '(' + fmt(Math.abs(rec.decemberWithholding) / 1e6, 1) + ')' : fmt(rec.decemberWithholding / 1e6, 1)} jt
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
                Angka dalam kurung = <b>lebih potong</b> sepanjang tahun, dikembalikan pada masa Desember.
                Biaya jabatan 5% dari bruto dengan batas Rp 6.000.000/tahun; iuran JHT &amp; JP pekerja menjadi pengurang neto.
              </div>
            </div>
          )}
        </Panel>

        {tab === 'gaji' && <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>PPh 21 bulanan memakai <b>Tarif Efektif Rata-rata (TER)</b> per kategori PTKP (PMK 168/2023); rekonsiliasi tahunan tarif progresif Pasal 17 dilakukan pada masa Desember. BPJS Kesehatan 1%/4% (batas upah Rp 12 jt), JHT 2%/3,7%, JP 1%/2% (batas Rp 10,5 jt), JKK & JKM ditanggung pemberi kerja.</div>}
        {tab === 'buktipotong' && <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Bukti potong <b>1721-A1</b> diterbitkan tahunan melalui Coretax DJP. Estimasi tahunan mengasumsikan penghasilan tetap; rekonsiliasi final mengikuti tarif progresif Pasal 17 pada masa pajak Desember.</div>}
      </div></div>

      {person && <PayslipDrawer r={person} R={R} canSend={isFull} sent={sent[person.id]} onSend={markSent} onClose={() => setSel(null)} />}
    </>
  );
}

function PayslipDrawer({ r, R, onClose, canSend, sent, onSend }: any) {
  const { fmt } = AMS;
  const s = r.slip;
  const FIRM: any = AMS.FIRM;
  const Line = ({ label, v, sub, neg, bold, sign }: any) => (
    <div className="row jb ac" style={{ padding: '5px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <span style={{ fontSize: bold ? 12.5 : 12, fontWeight: bold ? 700 : 400, color: sub ? 'var(--ink-3)' : 'var(--ink)' }}>{label}</span>
      <span className="mono" style={{ fontSize: bold ? 13 : 12, fontWeight: bold ? 700 : 500, color: neg ? 'var(--red)' : bold ? 'var(--navy)' : 'var(--ink)' }}>{sign === false ? '' : neg ? '− ' : ''}Rp {fmt(v, 0)}</span>
    </div>
  );
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="panel" style={{ width: 480, maxWidth: '95vw', height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }}>
          <Avatar name={r.name} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700 }} className="truncate">{r.name}</div><div className="tiny" style={{ color: '#bcd6e4' }}>{r.role} · {r.id} · PTKP {r.p.ptkp}</div></div>
          <button aria-label="Tutup" className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
          <div className="row jb ac" style={{ marginBottom: 14 }}><span className="tiny muted upper">Slip Gaji · {R.period}</span><span className="badge b-blue tiny" title={s.terNote}>TER {s.ter == null ? '—' : (s.ter * 100).toFixed(2) + '%'} · Kat. {s.terCategory || '—'}{s.terVerified ? '' : ' ⚠'}</span></div>

          <div className="tiny muted upper" style={{ marginBottom: 4 }}>Penghasilan</div>
          <Line label="Gaji Pokok" v={r.p.gross} />
          <Line label="Tunjangan Tetap" v={r.p.allowance} />
          {r.thr > 0 && <Line label="THR Keagamaan" v={r.thr} />}
          <Line label="Penghasilan Bruto" v={s.base + r.thr} bold />

          <div className="tiny muted upper" style={{ margin: '16px 0 4px' }}>Potongan</div>
          <Line label="BPJS Kesehatan (1%)" v={s.dKes} sub neg />
          <Line label="BPJS JHT (2%)" v={s.dJht} sub neg />
          <Line label="BPJS Jaminan Pensiun (1%)" v={s.dJp} sub neg />
          <Line label={'PPh 21 (TER ' + (s.ter == null ? '—' : (s.ter * 100).toFixed(2) + '%') + ')'} v={s.pph} sub neg />
          <Line label="Total Potongan" v={s.totalDed} bold neg />

          <div style={{ background: 'var(--green-bg)', borderRadius: 8, padding: '12px 14px', marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Take-Home Pay</span>
            <span className="mono" style={{ fontWeight: 800, fontSize: 19, color: 'var(--green)' }}>Rp {fmt(s.net + r.thr, 0)}</span>
          </div>

          <div className="tiny muted upper" style={{ margin: '18px 0 4px' }}>Kontribusi Pemberi Kerja (di luar take-home)</div>
          <Line label="BPJS Kesehatan (4%)" v={s.eKes} sub />
          <Line label="BPJS JHT (3,7%)" v={s.eJht} sub />
          <Line label="BPJS JP (2%)" v={s.eJp} sub />
          <Line label="BPJS JKK (0,24%)" v={s.eJkk} sub />
          <Line label="BPJS JKM (0,3%)" v={s.eJkm} sub />
          <Line label="Total Beban Pemberi Kerja" v={s.employerCost + r.thr} bold />

          <div className="panel" style={{ marginTop: 16, padding: '9px 12px', background: 'var(--surface-2)', boxShadow: 'none' }}>
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>Slip dibuat otomatis oleh {FIRM.short}. Bukti potong 1721-A1 diterbitkan tahunan via Coretax DJP.</div>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flex: '0 0 auto' }}>
          <Btn style={{ flex: 1 }} onClick={() => {
            const ss = r.slip;
            amsExportPdf({
              kind: 'payslip', scope: 'firm', fileName: `Slip Gaji - ${r.name} - ${R.period}.pdf`,
              firm: AMS.FIRM.name || 'KAP',
              title: 'Slip Gaji · ' + R.period,
              refNo: r.id,
              meta: [r.name + ' · ' + r.role, 'PTKP ' + r.p.ptkp + ' · TER ' + (ss.ter == null ? '—' : (ss.ter * 100).toFixed(2) + '%') + ' (Kat. ' + (ss.terCategory || '—') + ')', 'Periode: ' + R.period],
              blocks: [
                { type: 'heading', text: 'Penghasilan' },
                { type: 'kv', rows: [
                  ['Gaji Pokok', 'Rp ' + fmt(r.p.gross, 0)],
                  ['Tunjangan Tetap', 'Rp ' + fmt(r.p.allowance, 0)],
                  ...(r.thr > 0 ? [['THR Keagamaan', 'Rp ' + fmt(r.thr, 0)]] : []),
                  ['Penghasilan Bruto', 'Rp ' + fmt(ss.base + r.thr, 0)],
                ] },
                { type: 'heading', text: 'Potongan' },
                { type: 'kv', rows: [
                  ['BPJS Kesehatan (1%)', '− Rp ' + fmt(ss.dKes, 0)],
                  ['BPJS JHT (2%)', '− Rp ' + fmt(ss.dJht, 0)],
                  ['BPJS Jaminan Pensiun (1%)', '− Rp ' + fmt(ss.dJp, 0)],
                  ['PPh 21 (TER ' + (ss.ter == null ? '—' : (ss.ter * 100).toFixed(2) + '%') + ')', '− Rp ' + fmt(ss.pph, 0)],
                  ['Total Potongan', '− Rp ' + fmt(ss.totalDed, 0)],
                ] },
                { type: 'heading', text: 'Take-Home Pay' },
                { type: 'kv', rows: [
                  ['Take-Home Pay', 'Rp ' + fmt(ss.net + r.thr, 0)],
                ] },
                { type: 'heading', text: 'Kontribusi Pemberi Kerja (di luar take-home)' },
                { type: 'kv', rows: [
                  ['BPJS Kesehatan (4%)', 'Rp ' + fmt(ss.eKes, 0)],
                  ['BPJS JHT (3,7%)', 'Rp ' + fmt(ss.eJht, 0)],
                  ['BPJS JP (2%)', 'Rp ' + fmt(ss.eJp, 0)],
                  ['BPJS JKK (0,24%)', 'Rp ' + fmt(ss.eJkk, 0)],
                  ['BPJS JKM (0,3%)', 'Rp ' + fmt(ss.eJkm, 0)],
                  ['Total Beban Pemberi Kerja', 'Rp ' + fmt(ss.employerCost + r.thr, 0)],
                ] },
              ],
            }).catch(() => {});
          }}><I.download size={13} /> Unduh Slip (PDF)</Btn>
          {canSend && (sent
            ? <Btn disabled style={{ flex: 1, color: 'var(--green)' }} title={'Ditandai terkirim ' + sent.at + ' oleh ' + sent.by + ' — distribusi slip dilakukan di luar aplikasi'}><I.check size={13} /> Ditandai Terkirim · {sent.at}</Btn>
            : <Btn variant="primary" style={{ flex: 1 }} onClick={() => onSend(r.id)} title="Catat atestasi distribusi slip (pengiriman aktual di luar aplikasi)"><I.check size={13} /> Tandai Terkirim</Btn>)}
        </div>
      </div>
    </div>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { Payroll, PayslipDrawer, calcPayslip };
