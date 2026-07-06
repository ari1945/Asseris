/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAuth, useNav } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Stat, Tabs } from './ui';

/* ============================================================
   Asseris — HCM: Payroll (Penggajian)
   PPh 21 (metode TER · PMK 168/2023) · BPJS Kesehatan &
   Ketenagakerjaan · THR · slip gaji · jurnal penggajian.
   ============================================================ */
const { useState: usePR } = React;

/* compute one employee's payslip */
function calcPayslip(p: any, R: any) {
  const base = p.gross + p.allowance;                     // penghasilan bruto
  const kesBase = Math.min(p.gross, R.kesCap);
  const jpBase = Math.min(p.gross, R.jpCap);
  // employee deductions
  const dKes = Math.round(kesBase * R.kesEmp);
  const dJht = Math.round(p.gross * R.jhtEmp);
  const dJp = Math.round(jpBase * R.jpEmp);
  const pph = Math.round(base * p.ter);                   // TER monthly
  const totalDed = dKes + dJht + dJp + pph;
  const net = base - totalDed;
  // employer contributions
  const eKes = Math.round(kesBase * R.kesEr);
  const eJht = Math.round(p.gross * R.jhtEr);
  const eJp = Math.round(jpBase * R.jpEr);
  const eJkk = Math.round(p.gross * R.jkkEr);
  const eJkm = Math.round(p.gross * R.jkmEr);
  const employerCost = base + eKes + eJht + eJp + eJkk + eJkm;
  return { base, dKes, dJht, dJp, pph, totalDed, net, eKes, eJht, eJp, eJkk, eJkm, employerCost };
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
  const PR_TABS = [{ id: 'gaji', label: 'Daftar Gaji' }, { id: 'bpjs', label: 'Ringkasan BPJS' }, ...(isFull ? [{ id: 'jurnal', label: 'Jurnal Penggajian' }] : []), { id: 'buktipotong', label: 'Bukti Potong 1721' }];
  /* employer + employee BPJS aggregates */
  const bpjs: any = rows.reduce((a: any, r: any) => ({
    eKes: a.eKes + r.slip.eKes, eJht: a.eJht + r.slip.eJht, eJp: a.eJp + r.slip.eJp, eJkk: a.eJkk + r.slip.eJkk, eJkm: a.eJkm + r.slip.eJkm,
    dKes: a.dKes + r.slip.dKes, dJht: a.dJht + r.slip.dJht, dJp: a.dJp + r.slip.dJp,
  }), { eKes: 0, eJht: 0, eJp: 0, eJkk: 0, eJkm: 0, dKes: 0, dJht: 0, dJp: 0 });
  const bpjsTotal = (Object.values(bpjs) as number[]).reduce((a, b) => a + b, 0);
  /* payroll journal */
  const journal = [
    { ac: '5-100 Beban Gaji & Tunjangan', dr: tot.gross, cr: 0 },
    { ac: '5-100 Beban BPJS (pemberi kerja)', dr: bpjs.eKes + bpjs.eJht + bpjs.eJp + bpjs.eJkk + bpjs.eJkm, cr: 0 },
    { ac: '2-200 Utang PPh 21', dr: 0, cr: tot.pph },
    { ac: '2-200 Utang BPJS (kary. + pemberi kerja)', dr: 0, cr: bpjsTotal },
    { ac: '1-100 Kas & Bank (take-home)', dr: 0, cr: tot.net },
  ];
  const jDr = journal.reduce((a, j) => a + j.dr, 0), jCr = journal.reduce((a, j) => a + j.cr, 0);

  return (
    <>
      <SubBar moduleId="payroll" right={<div className="row gap8 ac">
        <label className="row ac gap6 tiny" style={{ cursor: 'pointer' }}><span onClick={() => setThr(!thr)} style={{ width: 32, height: 18, borderRadius: 10, background: thr ? 'var(--green)' : 'var(--line-strong)', position: 'relative', transition: '.15s' }}><span style={{ position: 'absolute', top: 2, left: thr ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff' }} /></span> Sertakan THR</label>
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
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(tot.gross / 1e6, 0) + ' jt'} label="Total Penghasilan Bruto" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(tot.pph / 1e6, 1) + ' jt'} label="PPh 21 Dipotong" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(tot.net / 1e6, 0) + ' jt'} label="Total Take-Home (Neto)" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(tot.employer / 1e6, 0) + ' jt'} label="Total Beban Pemberi Kerja" accent="var(--blue)" /></div></Panel>
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
              <div className="row gap8" style={{ marginTop: 12 }}><Btn sm variant="primary" disabled={run === 'draft'} style={{ opacity: run === 'draft' ? .5 : 1 }} onClick={() => nav('firmgl')}><I.ledger size={13} /> Posting ke General Ledger</Btn>{run === 'draft' && <span className="tiny muted" style={{ alignSelf: 'center' }}>Setujui payroll terlebih dahulu untuk posting.</span>}</div>
            </div>
          )}

          {tab === 'buktipotong' && (
            <table className="dtbl">
              <thead><tr><th>Karyawan</th><th>NPWP / PTKP</th><th className="num">PPh 21 (bln)</th><th className="num">Estimasi Tahunan</th><th>Form</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id}>
                    <td><div className="row ac gap8"><Avatar name={r.name} size={24} /><span style={{ fontWeight: 600 }} className="truncate">{r.name}</span></div></td>
                    <td><span className="chip tiny">{r.p.ptkp}</span></td>
                    <td className="num mono" style={{ color: 'var(--amber)' }}>{fmt(r.slip.pph / 1e6, 1)} jt</td>
                    <td className="num mono">{fmt(r.slip.pph * 12 / 1e6, 1)} jt</td>
                    <td className="tiny mono">1721-A1</td>
                    <td><Badge kind={run === 'paid' ? 'green' : 'gray'}>{run === 'paid' ? 'Siap terbit' : 'Menunggu'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {tab === 'gaji' && <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>PPh 21 bulanan memakai <b>Tarif Efektif Rata-rata (TER)</b> per kategori PTKP (PMK 168/2023); rekonsiliasi tahunan tarif progresif Pasal 17 dilakukan pada masa Desember. BPJS Kesehatan 1%/4% (batas upah Rp 12 jt), JHT 2%/3,7%, JP 1%/2% (batas Rp 10,5 jt), JKK & JKM ditanggung pemberi kerja.</div>}
        {tab === 'buktipotong' && <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Bukti potong <b>1721-A1</b> diterbitkan tahunan melalui Coretax DJP. Estimasi tahunan mengasumsikan penghasilan tetap; rekonsiliasi final mengikuti tarif progresif Pasal 17 pada masa pajak Desember.</div>}
      </div></div>

      {person && <PayslipDrawer r={person} R={R} onClose={() => setSel(null)} />}
    </>
  );
}

function PayslipDrawer({ r, R, onClose }: any) {
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
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14.5, fontWeight: 700 }} className="truncate">{r.name}</div><div className="tiny" style={{ color: '#bcd6e4' }}>{r.role} · {r.id} · PTKP {r.p.ptkp}</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
          <div className="row jb ac" style={{ marginBottom: 14 }}><span className="tiny muted upper">Slip Gaji · {R.period}</span><span className="badge b-blue tiny">TER {(r.p.ter * 100).toFixed(2)}% · Kat. {r.p.terCat}</span></div>

          <div className="tiny muted upper" style={{ marginBottom: 4 }}>Penghasilan</div>
          <Line label="Gaji Pokok" v={r.p.gross} />
          <Line label="Tunjangan Tetap" v={r.p.allowance} />
          {r.thr > 0 && <Line label="THR Keagamaan" v={r.thr} />}
          <Line label="Penghasilan Bruto" v={s.base + r.thr} bold />

          <div className="tiny muted upper" style={{ margin: '16px 0 4px' }}>Potongan</div>
          <Line label="BPJS Kesehatan (1%)" v={s.dKes} sub neg />
          <Line label="BPJS JHT (2%)" v={s.dJht} sub neg />
          <Line label="BPJS Jaminan Pensiun (1%)" v={s.dJp} sub neg />
          <Line label={'PPh 21 (TER ' + (r.p.ter * 100).toFixed(2) + '%)'} v={s.pph} sub neg />
          <Line label="Total Potongan" v={s.totalDed} bold neg />

          <div style={{ background: 'var(--green-bg)', borderRadius: 8, padding: '12px 14px', marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Take-Home Pay</span>
            <span className="mono" style={{ fontWeight: 800, fontSize: 18, color: 'var(--green)' }}>Rp {fmt(s.net + r.thr, 0)}</span>
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
          <Btn style={{ flex: 1 }} onClick={() => window.amsPrintDoc && window.amsPrintDoc()}><I.download size={13} /> Unduh Slip (PDF)</Btn>
          <Btn variant="primary" style={{ flex: 1 }}><I.mail size={13} /> Kirim ke Karyawan</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Payroll, PayslipDrawer, calcPayslip });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { Payroll, PayslipDrawer, calcPayslip };
