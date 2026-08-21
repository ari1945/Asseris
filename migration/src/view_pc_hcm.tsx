/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav, useAmsPersist } from './contexts';
import { I } from './icons';
import { Avatar, Btn, Donut, Panel, Stat } from './ui';
import { amsExportPdf } from './export_pdf';
import { leaveLedgerOf } from './canon_leave';
import { perfPersonOf } from './canon_perf';
import { tenureOf } from './canon_hcm';
import { UNKNOWN, profileOf } from './hcm_derive';
import type { HolidayCalendar, LeaveRequestInput } from './canon_leave';

const arrLv = (v: unknown): LeaveRequestInput[] => (Array.isArray(v) ? v as LeaveRequestInput[] : []);

/* ============================================================
   Asseris — HCM deepening: 360° Profile drawer + Analytics
   (consumed by HCM in view_people.jsx)
   ============================================================ */
const { useState: usePChcm } = React;

/* `profileOf` PINDAH ke `hcm_derive.ts` (fungsi murni, teruji di node).
 * `profiles` = server-scoped STAFF_PROFILE (personal.get): non-privileged hanya menerima baris
 * miliknya → membuka drawer orang lain hanya memunculkan placeholder ter-masking (NIK/kontak),
 * BUKAN PII asli. Arsitektur isolasi itu TIDAK berubah; yang berubah nilai fallback-nya.
 *
 * Dulu ketiadaan baris diisi 'Aktif'/'Aktif'/'Tetap'/'Jakarta (HQ)' dan tiga dokumen
 * ber-status 'Valid'/'Lengkap'/'Aktif' — klaim kepatuhan atas orang yang justru tak punya
 * datanya (hanya 3 dari 69 orang punya baris). Sekarang ketidaktahuan tampil sebagai
 * ketidaktahuan; lihat catatan kepala `hcm_derive.ts`. */

function Profile360Drawer({ s, onClose }: any) {
  const A: any = AMS, fmt = A.fmt;
  const nav = useNav();
  // 2026-07-05 — seluruh data personal drawer 360° ditarik via personal.get (row-filtered server):
  // non-privileged hanya menerima barisnya sendiri, jadi membuka profil kolega hanya menampilkan
  // placeholder default (tanpa gaji/PII/kinerja asli). HR/Managing Partner menerima semua.
  const [profiles] = useAmsPersist('staffProfile', () => A.STAFF_PROFILE);
  const [payAll] = useAmsPersist('payrollData', () => A.PAYROLL);
  const [lvAll] = useAmsPersist('leaveBalance', () => A.LEAVE_BALANCE);
  const [lvReqs] = useAmsPersist('leaveReqs', () => A.LEAVE_REQUESTS);
  const [cpeAll] = useAmsPersist('cpeLog', () => A.CPE_LOG);
  const [perfAll] = useAmsPersist('perfPeople', () => (A.PERF_CYCLE.people || {}));
  const [perfGoalsAll] = useAmsPersist('perfGoals', () => (A.PERF_CYCLE.goals || {}));
  const [indepAll] = useAmsPersist('independence', () => A.INDEPENDENCE);
  const [ethAll] = useAmsPersist('pc.ethics', () => A.ETHICS_DECL);
  const p = profileOf(s, profiles, { list: A.COMPETENCIES, actual: A.COMPETENCY_ACTUAL });
  /* K-02 — masa kerja dari klok SSOT `AMS.TODAY`, bukan tahun literal yang salah
     satu tahun bagi semua orang mulai 2027. Mesinnya `canon_hcm.tenureOf`. */
  const tenure = tenureOf(s.joined, String(AMS.TODAY || ''));
  const tenureTxt = tenure === null ? UNKNOWN : String(tenure);
  const pay = (payAll || {})[s.id];
  /* PRD sdm-kepatuhan PR-1 — saldo cuti DITURUNKAN dari register permintaan
     (canon_leave), bukan dari literal `ent`/`used` yang persetujuan tak pernah
     menyentuhnya. Mesin yang sama dipakai modul Cuti & Data Personal Saya. */
  const lvLedger = leaveLedgerOf(s.id, s.joined, arrLv(lvReqs), (lvAll || {})[s.id]?.carry || 0,
    String(AMS.TODAY || ''), AMS.LEAVE_HOLIDAYS as unknown as HolidayCalendar);
  const lvTotal = lvLedger.quota;
  const lvLeft = lvLedger.remaining;
  const cpe = ((cpeAll || {})[s.id] || []).reduce((a: any, r: any) => a + r.skp, 0);
  /* PRD sdm-kepatuhan PR-2 — skor & penempatan 9-box DITURUNKAN (canon_perf),
     bukan literal `perf`/`box` yang dapat bertentangan dgn KPI-nya sendiri. */
  const perfRec = (perfAll || {})[s.id];
  const perf = perfRec ? perfPersonOf(s.id, perfRec, (perfGoalsAll || {})[s.id]) : null;
  const indep = (indepAll || []).find((d: any) => d.id === s.id);
  const ethics = (ethAll || {})[s.id];
  const GC = A.GRADE_COLOR_PC;

  const Section = ({ title, children, action }: any) => (
    <div style={{ marginBottom: 16 }}>
      <div className="row ac jb" style={{ marginBottom: 8 }}><div className="tiny muted upper">{title}</div>{action}</div>
      {children}
    </div>
  );

  /* K-06 lanjutan — wire tombol "Ekspor Profil (PDF)" (dulu mati): ekspor PDF tersegel
     profil 360° pegawai (data pribadi + kompensasi ringkas + CPE). */
  const [exporting, setExporting] = usePChcm(false);
  const onExportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await amsExportPdf({
        kind: 'profile-360', scope: 'firm', scopeId: undefined,
        fileName: `Profil - ${s.name}.pdf`,
        firm: A.FIRM?.name || '',
        title: 'Profil 360° — ' + s.name,
        meta: [`${s.name} · ${s.grade || ''} · bergabung ${s.joined || ''}`,
          `Utilisasi ${s.util ?? 0}% · rating ${s.rating ?? 0} · cuti tersisa ${lvLeft} hari · CPE ${cpe} SKP`],
        blocks: [
          { type: 'heading', text: 'Identitas & Posisi' },
          { type: 'kv', rows: [['Nama', s.name], ['Grade', s.grade || '—'], ['Sertifikasi', s.cert || '—'], ['Status', s.status || '—'], ['Tenure', tenure === null ? UNKNOWN : tenure + ' tahun']] },
          { type: 'heading', text: 'Kompensasi & Pengembangan' },
          { type: 'kv', rows: [['CPE Tahun Berjalan', cpe + ' SKP'], ['Kuota Cuti (hak + saldo lalu)', lvTotal + ' hari · terpakai ' + lvLedger.used + ' · sisa ' + lvLeft]] },
        ],
      });
    } finally {
      setExporting(false);
    }
  };
  const Kv = ({ l, v, accent }: any) => (
    <div className="panel" style={{ padding: '7px 10px', boxShadow: 'none' }}>
      <div className="tiny muted upper" style={{ marginBottom: 2 }}>{l}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: accent || 'var(--ink)' }}>{v}</div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="panel" style={{ width: 540, maxWidth: '96vw', height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,var(--navy-700),var(--blue-solid))', color: 'var(--on-dark-fg)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 13, flex: '0 0 auto' }}>
          <Avatar name={s.name} size={50} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }} className="truncate">{s.name}</div>
            <div className="tiny" style={{ color: 'var(--on-dark-muted)' }}>{s.role} · {s.id} · {p.location}</div>
            <div className="row gap6 ac" style={{ marginTop: 5 }}>
              <span className="badge" style={{ background: 'rgba(255,255,255,.16)', color: 'var(--on-dark-fg)', fontSize: 11 }}>{s.grade}{p.band === UNKNOWN ? '' : ' · Band ' + p.band}</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,.16)', color: 'var(--on-dark-fg)', fontSize: 11 }}>{s.cert}</span>
            </div>
          </div>
          <button aria-label="Tutup" className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
          {/* Ketiadaan baris data personal dinyatakan, bukan disamarkan jadi placeholder
              yang terbaca seperti fakta. */}
          {p.unrecorded && (
            <div className="tiny" style={{ marginBottom: 14, padding: '8px 11px', borderRadius: 7, border: '1px dashed var(--line)', background: 'var(--amber-bg)', color: 'var(--ink-2)' }}>
              Belum ada catatan data personal untuk pegawai ini — kolom di bawah yang berbunyi
              “{UNKNOWN}” atau “Belum tercatat” berarti <b>tidak ada datanya</b>, bukan tidak memenuhi syarat.
            </div>
          )}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
            <div className="panel" style={{ padding: '8px 10px', boxShadow: 'none', textAlign: 'center' }}><div className="mono" style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>{tenureTxt}<span style={{ fontSize: 11, fontWeight: 600 }}>{tenure === null ? '' : 'th'}</span></div><div className="tiny muted">Masa Kerja</div></div>
            <div className="panel" style={{ padding: '8px 10px', boxShadow: 'none', textAlign: 'center' }}><div className="mono" style={{ fontSize: 15, fontWeight: 800, color: s.util > 90 ? 'var(--red)' : 'var(--green)' }}>{s.util}%</div><div className="tiny muted">Utilisasi</div></div>
            <div className="panel" style={{ padding: '8px 10px', boxShadow: 'none', textAlign: 'center' }}><div className="mono" style={{ fontSize: 15, fontWeight: 800, color: 'var(--blue)' }}>{s.rating.toFixed(1)}</div><div className="tiny muted">Rating</div></div>
            <div className="panel" style={{ padding: '8px 10px', boxShadow: 'none', textAlign: 'center' }}><div className="mono" style={{ fontSize: 15, fontWeight: 800, color: cpe >= 40 ? 'var(--green)' : 'var(--amber)' }}>{cpe}</div><div className="tiny muted">SKP</div></div>
          </div>

          <Section title="Informasi Pribadi & Kepegawaian">
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Kv l="Email" v={s.email || '—'} />
              <Kv l="Telepon" v={p.phone} />
              <Kv l="Status" v={s.status} accent={s.status === 'Aktif' ? 'var(--green)' : 'var(--amber)'} />
              <Kv l="Tipe" v={p.empType} />
              <Kv l="NIK" v={p.nik} />
              <Kv l="NPWP" v={p.npwp} />
              {/* Hijau HANYA bila kepesertaannya memang tercatat — mewarnai "Belum
                  tercatat" hijau adalah cara lain menyatakan kepatuhan tanpa dasar. */}
              <Kv l="BPJS Kesehatan" v={p.bpjsKes} accent={p.bpjsKes === 'Aktif' ? 'var(--green)' : undefined} />
              <Kv l="BPJS TK" v={p.bpjsTk} accent={p.bpjsTk === 'Aktif' ? 'var(--green)' : undefined} />
            </div>
          </Section>

          <Section title="Keahlian & Kompetensi" action={<button className="btn sm" style={{ height: 22 }} onClick={() => { onClose(); nav('learning'); }}><I.arrowRight size={11} /> Matriks</button>}>
            <div style={{ display: 'grid', gap: 7 }}>
              {!p.skills.length && <div className="tiny muted" style={{ padding: 12, textAlign: 'center', border: '1px dashed var(--line)', borderRadius: 7 }}>Belum ada penilaian kompetensi tercatat untuk pegawai ini.</div>}
              {p.skills.slice(0, 6).map(([l, v]: any, i: any) => (
                <div key={i}>
                  <div className="row jb tiny" style={{ marginBottom: 2 }}><span>{l}</span><span className="mono" style={{ fontWeight: 700 }}>{v}/5</span></div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (v / 5 * 100) + '%', height: '100%', borderRadius: 3, background: v >= 4 ? 'var(--green)' : v >= 3 ? 'var(--blue)' : 'var(--amber)' }} /></div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Kinerja & Karier" action={<button className="btn sm" style={{ height: 22 }} onClick={() => { onClose(); nav('performance'); }}><I.arrowRight size={11} /> Kinerja</button>}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {/* Tanpa catatan siklus kinerja, kolom ini dulu jatuh ke `s.rating` — angka
                  roster yang tak pernah dinilai siapa pun, dan yang untuk EMP-021 bahkan
                  berbeda dari skor KPI-nya (4,5 vs 4,36). Ketiadaan kini dinyatakan. */}
              <Kv l="Skor Kinerja" v={perf && perf.score.score !== null ? perf.score.score.toFixed(2) + ' / 5' : perf ? 'Belum dapat dinilai' : 'Belum ada siklus kinerja'} accent={perf && perf.score.score !== null ? 'var(--blue)' : undefined} />
              <Kv l="Potensi (9-box)" v={perf && perf.placement.placeable ? perf.placement.label : '—'} />
              <Kv l="Engagement Aktif" v={s.engagements} />
              <Kv l="Rekomendasi" v={perf && perf.promote !== '—' ? perf.promote : 'Pertahankan'} accent={perf && perf.promote !== '—' ? 'var(--purple)' : undefined} />
            </div>
          </Section>

          <Section title="Kompensasi & Cuti" action={<button className="btn sm" style={{ height: 22 }} onClick={() => { onClose(); nav('payroll'); }}><I.arrowRight size={11} /> Slip Gaji</button>}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Kv l="Band Gaji" v={p.salaryBand} />
              <Kv l="Penghasilan Bruto/bln" v={pay ? 'Rp ' + fmt((pay.gross + pay.allowance) / 1e6, 1) + ' jt' : '—'} />
              <Kv l="PTKP" v={pay ? pay.ptkp : '—'} />
              <Kv l="Sisa Cuti" v={lvLeft + ' / ' + lvTotal + ' hari'} accent={lvLeft <= 2 ? 'var(--amber)' : 'var(--green)'} />
            </div>
          </Section>

          <Section title="Kepatuhan & Etika">
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Kv l="Deklarasi Etika" v={ethics ? (ethics.signed ? 'Ditandatangani' : 'Belum') : '—'} accent={ethics && ethics.signed ? 'var(--green)' : 'var(--amber)'} />
              <Kv l="Independensi" v={indep ? (indep.declared ? 'Diterima' : 'Belum') : '—'} accent={indep && indep.declared ? 'var(--green)' : 'var(--amber)'} />
              {indep && indep.rotationClient !== '—' && <Kv l="Rotasi Klien" v={indep.rotationClient.replace('PT ', '')} />}
              {indep && indep.rotationClient !== '—' && <Kv l="Masa Tugas" v={indep.tenure + ' / ' + indep.rotationLimit + ' th'} accent={indep.tenure >= indep.rotationLimit ? 'var(--red)' : indep.tenure >= indep.rotationLimit - 1 ? 'var(--amber)' : 'var(--green)'} />}
            </div>
          </Section>

          <Section title="Dokumen & Sertifikasi">
            <div style={{ display: 'grid', gap: 6 }}>
              {!p.docs.length && <div className="tiny muted" style={{ padding: 12, textAlign: 'center', border: '1px dashed var(--line)', borderRadius: 7 }}>Tidak ada dokumen kepegawaian tercatat — <b>bukan</b> berarti dokumennya lengkap.</div>}
              {p.docs.map(([l, st]: any, i: any) => (
                <div key={i} className="row ac jb" style={{ padding: '7px 11px', border: '1px solid var(--line-soft)', borderRadius: 7 }}>
                  <span className="row ac gap8 tiny" style={{ fontWeight: 500 }}><I.doc size={13} style={{ color: 'var(--ink-4)' }} />{l}</span>
                  <span className="chip tiny">{st}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Linimasa Karier">
            <div style={{ display: 'grid', gap: 0 }}>
              {p.timeline.map((t: any, i: any) => (
                <div key={i} className="row gap8" style={{ paddingBottom: i < p.timeline.length - 1 ? 12 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--blue-solid)', marginTop: 3 }} />
                    {i < p.timeline.length - 1 && <span style={{ width: 1.5, flex: 1, background: 'var(--line)' }} />}
                  </div>
                  <div><span className="mono tiny muted" style={{ marginRight: 8 }}>{t[0]}</span><span style={{ fontSize: 12 }}>{t[1]}</span></div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Darurat (Emergency Contact)">
            <div className="panel" style={{ padding: '9px 12px', boxShadow: 'none', background: 'var(--surface-2)' }}>
              <div className="row ac jb"><span style={{ fontWeight: 600, fontSize: 12 }}>{p.emergency.name}</span><span className="tiny muted">{p.emergency.rel}</span></div>
              <div className="tiny mono muted" style={{ marginTop: 2 }}>{p.emergency.phone}</div>
            </div>
          </Section>
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flex: '0 0 auto' }}>
          <Btn style={{ flex: 1 }} onClick={() => { onClose(); nav('orgchart'); }}><I.group size={13} /> Lihat di Org Chart</Btn>
          <Btn variant="primary" style={{ flex: 1 }} onClick={onExportPdf} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Ekspor Profil (PDF)'}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------- HCM Analytics (demografi · headcount · attrition) ---------------- */
function HCMAnalytics() {
  const A: any = AMS;
  const D = A.HCM_ANALYTICS;
  const GC = A.GRADE_COLOR_PC;
  const totalHC = D.gradeMix.reduce((s: any, g: any) => s + g.n, 0);
  const maxTrend = Math.max(...D.headcountTrend.map((t: any) => t.total));

  const Bar = ({ rows, max, color }: any) => (
    <div style={{ display: 'grid', gap: 7 }}>
      {rows.map((r: any, i: any) => (
        <div key={i} className="row ac gap8">
          <span className="tiny" style={{ width: 76, flex: '0 0 76px', textAlign: 'right', color: 'var(--ink-2)' }}>{r.k || r.g}</span>
          <div style={{ flex: 1, height: 16, borderRadius: 4, background: 'var(--surface-3)', position: 'relative' }}><div style={{ width: (r.n != null ? r.n / max * 100 : r.rate) + '%', height: '100%', borderRadius: 4, background: typeof color === 'function' ? color(r) : color }} /></div>
          <span className="mono tiny" style={{ width: 34, fontWeight: 700, textAlign: 'right' }}>{r.n != null ? r.n : r.rate + '%'}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={totalHC} label="Headcount Aktif" /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }} title={D.attritionBasis}><Stat value={D.annualAttrition == null ? '—' : D.annualAttrition + '%'} label="Attrition Tahunan" accent={(D.annualAttrition ?? 0) > 15 ? 'var(--amber)' : 'var(--green)'} delta={D.regrettable == null ? 'belum ada kepergian tercatat' : D.regrettable + '% regrettable'} deltaDir="down" /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={D.avgTenure == null ? '—' : D.avgTenure + ' th'} label="Rata-rata Masa Kerja" /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }} title={D.timeToFillBasis}><Stat value={D.timeToFill == null ? 'belum dapat dihitung' : D.timeToFill + ' hari'} label="Time-to-Fill" accent="var(--blue)" /></div></Panel>
      </div>

      {/* PRD sdm-kepatuhan PR-4 — angka di atas DITURUNKAN; dasarnya disebutkan
          agar dapat dibantah, bukan sekadar dipercaya. */}
      <div className="tiny muted" style={{ marginBottom: 12, lineHeight: 1.5 }}>
        Seluruh angka pada halaman ini diturunkan dari roster {totalHC} personel dan register kepergian —
        bukan konstanta. Attrition: {D.attritionBasis}. Time-to-fill: {D.timeToFillBasis}.
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 12, alignItems: 'stretch' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Tren Headcount & Pergerakan</h3><div style={{ flex: 1 }} /><span className="tiny muted">5 tahun · masuk vs keluar (presisi tahunan — roster menyimpan tahun bergabung)</span></div>
          <div style={{ padding: 16 }}>
            <div className="row" style={{ gap: 10, alignItems: 'flex-end', height: 160 }}>
              {D.headcountTrend.map((t: any, i: any) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3 }}>
                    <div title={'Hire ' + t.hires} style={{ width: 9, height: (t.hires / 8 * 100) + '%', minHeight: 4, background: 'var(--green-solid)', borderRadius: '2px 2px 0 0' }} />
                    <div title={'Exit ' + t.exits} style={{ width: 9, height: (t.exits / 8 * 100) + '%', minHeight: 4, background: 'var(--red-solid)', borderRadius: '2px 2px 0 0' }} />
                  </div>
                  <div className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{t.total}</div>
                  <div className="tiny muted" style={{ fontSize: 11 }}>{t.q}</div>
                </div>
              ))}
            </div>
            <div className="row gap12 tiny muted" style={{ marginTop: 10, justifyContent: 'center' }}>
              <span className="row ac gap4"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--green-solid)' }} /> Rekrutmen</span>
              <span className="row ac gap4"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--red-solid)' }} /> Keluar</span>
              <span>· angka = total headcount akhir kuartal</span>
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Komposisi Jenjang</h3></div>
          <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
            <Donut size={120} thickness={18} segments={D.gradeMix.map((g: any) => ({ value: g.n, color: GC[g.g] }))} center={<><div className="mono" style={{ fontSize: 19, fontWeight: 800, color: 'var(--navy)' }}>{totalHC}</div><div className="tiny muted">SDM</div></>} />
            <div style={{ flex: 1, display: 'grid', gap: 8 }}>
              {D.gradeMix.map((g: any) => (
                <div key={g.g} className="row ac jb">
                  <span className="row ac gap6 tiny"><span style={{ width: 10, height: 10, borderRadius: 2, background: GC[g.g] }} />{g.g}</span>
                  <span className="mono tiny" style={{ fontWeight: 700 }}>{g.n} <span className="muted">({Math.round(g.n / totalHC * 100)}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Attrition per Jenjang</h3><div style={{ flex: 1 }} /><span className="tiny muted">12 bulan</span></div>
          <div style={{ padding: 16 }}><Bar rows={D.attritionByGrade} max={30} color={(r: any) => r.rate >= 20 ? 'var(--red)' : r.rate >= 12 ? 'var(--amber)' : 'var(--green)'} /></div>
        </Panel>
        <Panel noBody>
          <div className="panel-h"><h3>Sertifikasi Profesi</h3></div>
          <div style={{ padding: 16 }}><Bar rows={D.certMix} max={Math.max(...D.certMix.map((c: any) => c.n))} color="var(--navy)" /></div>
        </Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Gender</h3></div>
          <div style={{ padding: 16 }}><Bar rows={D.genderMix} max={Math.max(...D.genderMix.map((c: any) => c.n))} color="#005085" /></div>
        </Panel>
        <Panel noBody>
          <div className="panel-h"><h3>Masa Kerja</h3></div>
          <div style={{ padding: 16 }}><Bar rows={D.tenureMix} max={Math.max(...D.tenureMix.map((c: any) => c.n))} color="#0a6b73" /></div>
        </Panel>
        <Panel noBody>
          <div className="panel-h"><h3>Usia</h3></div>
          <div style={{ padding: 16 }}><Bar rows={D.ageMix} max={Math.max(...D.ageMix.map((c: any) => c.n))} color="#5b3fa6" /></div>
        </Panel>
      </div>
    </div>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { HCMAnalytics, Profile360Drawer };
