/* [codemod] ESM imports */
import { AMS } from './data';
import { BO as BO_NS } from './data_backoffice';
import { cpeFromTraining } from './cpe_training';
import { pplReqOn, pplStatusFromEntries, pplYearOf, skpInYear } from './canon_ppl';

/* Ambang rotasi AP (`rotTier`) PINDAH ke `canon_rotation.ts` — modul LEAF (nol
   impor). Alasannya bukan kerapian: `indep_approval.ts` dibaca JUGA oleh server
   (`signoff.ts`), dan berkas ini mengimpor `./data`, yang menyentuh `window`.
   Modul aturan yang dipakai dua sisi tidak boleh menyeret lapisan data browser.
   Di-RE-EXPORT di sini supaya seluruh pengimpor lama tak tersentuh. */
import { rotTier } from './canon_rotation';
import type { RotTier } from './canon_rotation';
export { rotTier };
export type { RotTier } from './canon_rotation';

/* ============================================================
   Asseris — Lisensi & Perizinan: lapisan kanonik
   ------------------------------------------------------------
   Modul Lisensi TIDAK menulis nama AP, jumlah SKP/PPL, atau status
   rotasi sebagai angka lepas. Semua DITURUNKAN dari pemiliknya:

     · Identitas & peran AP   ← AMS.STAFF              (HCM / People)
     · PPL / SKP (YTD)        ← AMS.CPE_LOG + CPE_REQ  (CPE/PPL Tracker)
     · Rotasi & independensi  ← AMS.INDEPENDENCE       (Independence)
     · Cakupan emiten (OJK)   ← AMS.CLIENTS + ENGAGEMENTS (CRM/Engagement)
     · Iuran keanggotaan      ← FIRMOPS.operatingCosts() → P&L firma
     · Tenggat perpanjangan   ← FIRMOPS.unifiedObligations (kalender terpadu)

   Hanya nomor izin, otoritas penerbit & masa berlaku yang otoritatif
   di sub-ledger ini. Field turunan (ap/ppl/pplReq) dilekatkan kembali
   ke BO.AP_LICENSES agar konsumen lama (FIRMOPS) menarik satu angka.
   ============================================================ */
(function () {
  const A = (): any => AMS || {};
  const BO = (): any => BO_NS || {};
  const LS = (k: any, d: any) => { try { const s = localStorage.getItem('ams.v1.' + k); return s != null ? JSON.parse(s) : d; } catch (e) { return d; } };

  function staffById(id: any) { return (A().STAFF || []).find((s: any) => s.id === id) || null; }
  function indepById(id: any) { return (A().INDEPENDENCE || []).find((d: any) => d.id === id) || null; }

  /* fraksi tahun berjalan (untuk indikator laju PPL) */
  function yearFrac() {
    const ref = BO().today ? new Date(BO().today) : new Date(AMS.TODAY);
    const start = new Date(ref.getFullYear(), 0, 1);
    return Math.min(1, Math.max(0.02, (ref.getTime() - start.getTime()) / (365 * 864e5)));
  }

  /* ---------- PPL/SKP per pegawai — SUMBER: CPE_LOG (+ entri user terpersist) ----------
     PRD sdm-kepatuhan PR-3: SATU mesin PPL.

     Sebelumnya fungsi ini menjumlahkan SKP MENTAH — tanpa cap SKP tidak
     terstruktur PMK 186 Ps. 37 — sementara `canon_ppl.pplStatus()` yang benar
     sudah ada di repo ini dan dipakai modul Kesiapan P2PK. Akibatnya EMP-007
     berdiri di 32/40 SKP di sini dan 28/40 di modul sebelah: satu orang, satu
     tahun, dua angka resmi, tanpa cara tahu mana yang dibaca orang. */
  function pplOf(empId: any) {
    const base = (A().CPE_LOG && A().CPE_LOG[empId]) || [];
    const extra = (LS('cpeExtra', {})[empId]) || [];
    /* kredit SKP otomatis dari pelatihan terkonfirmasi (admin/HR). Store firm-scope →
       cacheKey berlingkup 'ams.v1.firm.<FIRM_SCOPE_ID>.trainingAttendance.v1'. */
    const training = (cpeFromTraining(A().TRAINING_CATALOG, LS('firm.FIRM-WHR.trainingAttendance.v1', {}))[empId]) || [];
    /* Tahap A-2 · SC-A1..SC-A3 — tahun & ambang DIPILIH menurut tanggal, dan
       catatan disaring ke tahun itu. Dulu seluruh catatan dijumlahkan apa pun
       tahunnya, terhadap ambang satu record tanpa masa berlaku. */
    const today = String(AMS.TODAY || '');
    const look = pplReqOn(today);
    const year = pplYearOf(today);
    const all = [...extra, ...training, ...base];
    const recs = year == null ? [] : skpInYear(all, year);
    /* Masa tak tercakup: TIDAK jatuh ke ambang bawaan. `pplStatusFromEntries`
       punya nilai bawaan `PPL_REQ_PMK186`, dan memakainya di sini persis sama
       dengan "yang terdekat" yang hendak dicabut arc ini. */
    const st = look.value ? pplStatusFromEntries(recs, look.value) : null;
    return {
      /* `total` = SKP yang DAPAT DIPERHITUNGKAN (setelah cap), bukan jumlah mentah. */
      total: st ? st.countedTotal : 0, structured: st ? st.structured : 0,
      recs, status: st, covered: !!look.value, note: look.note,
    };
  }

  /* ---------- Izin Akuntan Publik diperkaya (HCM + CPE + Independence) ---------- */
  function apLicenses() {
    /* Ambang PPL dari registry berkunci masa berlaku — fallback literal
       `{ annual: 40, structured: 30, year: 2026 }` DICABUT: ia menjawab untuk
       tahun mana pun tanpa pernah memilih. */
    const look = pplReqOn(String(AMS.TODAY || ''));
    const req = { annual: look.value?.annual ?? 0, structured: look.value?.structuredMin ?? 0 };
    const frac = yearFrac();
    const expectedYtd = Math.round(req.annual * frac);
    return (BO().AP_LICENSES || []).map((a: any) => {
      const s = staffById(a.emp) || {};
      const ind = indepById(a.emp) || {};
      const ppl = pplOf(a.emp);
      const onPace = ppl.covered && ppl.total >= expectedYtd;
      const structOk = ppl.covered && ppl.structured >= Math.round(req.structured * frac);
      /* Tahap A-2 · R2 — fallback `ind.rotationLimit || 5` DICABUT. Batas rotasi
         berasal dari rezim yang dipilih registry (`canon_rotation`); AP tanpa
         deklarasi independensi kini `tak-dinilai`, bukan diam-diam "Patuh". */
      const tenure = ind.tenure || 0;
      const limit: number | null = ind.rotationLimit != null ? ind.rotationLimit : null;
      const rotState: RotTier = limit == null ? 'tak-dinilai' : rotTier(tenure, limit);
      return {
        ...a,
        empId: a.emp, ap: (s.name || a.emp) + (s.cert && /CPA/.test(s.cert) ? ', CPA' : ''),
        name: s.name || a.emp, role: s.role, grade: s.grade, cert: s.cert,
        ppl: ppl.total, pplStructured: ppl.structured, pplReq: req.annual, pplStructReq: req.structured,
        expectedYtd, onPace, structOk, recs: ppl.recs, pplCovered: ppl.covered, pplNote: ppl.note,
        rotationClient: ind.rotationClient || '—', tenure, rotationLimit: limit, rotState,
        rotationBasis: ind.rotationBasis || '',
        declared: !!ind.declared, conflicts: ind.conflicts || 0, listed: !!ind.listed,
        status: rotState === 'tak-dinilai' ? 'Rotasi Tak Dapat Dinilai' : rotState === 'due' ? 'Rotasi Wajib' : !ppl.covered ? 'PPL Tak Dapat Dinilai' : !onPace ? 'PPL di Bawah Laju' : 'Patuh',
      };
    });
  }

  /* ---------- Izin Firma diperkaya (cakupan emiten OJK ← CLIENTS/ENGAGEMENTS) ---------- */
  function listedEngagements() {
    const cl = A().CLIENTS || [], eng = A().ENGAGEMENTS || [];
    const listedIds = new Set(cl.filter((c: any) => c.listed).map((c: any) => c.id));
    return eng.filter((e: any) => listedIds.has(e.clientId)).map((e: any) => {
      const c = cl.find((x: any) => x.id === e.clientId) || {};
      return { id: e.id, client: c.name, status: e.status };
    });
  }
  function firmLicenses() {
    const listed = listedEngagements();
    const memberships = BO().MEMBERSHIPS || [];
    return (BO().FIRM_LICENSES || []).map((l: any) => {
      const days = l.exp ? BO().daysTo(l.exp) : null;
      let coverage = null, linkMember = null;
      if (/OJK/.test(l.otoritas) || /OJK/i.test(l.nama)) coverage = { kind: 'emiten', items: listed, label: listed.length + ' perikatan emiten bergantung pada registrasi ini' };
      if (/IAPI/.test(l.nama) || /IAPI/.test(l.no)) { const m = memberships.find((x: any) => /IAPI/.test(x.nama)); if (m) linkMember = m; }
      return { ...l, days, coverage, linkMember };
    });
  }

  /* ---------- Keanggotaan diperkaya (iuran → biaya operasi firma) ---------- */
  function memberships() {
    return (BO().MEMBERSHIPS || []).map((m: any) => ({ ...m, days: m.exp ? BO().daysTo(m.exp) : null }));
  }
  function totalDues() { return (BO().MEMBERSHIPS || []).reduce((s: any, m: any) => s + m.iuran, 0); }

  /* ---------- kalender perpanjangan terpadu (izin firma + AP + keanggotaan) ---------- */
  function renewalCalendar(withinDays: any) {
    const out: any[] = [];
    firmLicenses().forEach((l: any) => { if (l.exp) out.push({ kind: 'Izin Firma', label: l.nama, ref: l.no, exp: l.exp, days: l.days, otoritas: l.otoritas, amount: 0 }); });
    apLicenses().forEach((a: any) => out.push({ kind: 'Izin AP', label: a.name, ref: a.izin, exp: a.exp, days: BO().daysTo(a.exp), otoritas: a.reg, amount: 0 }));
    memberships().forEach((m: any) => { if (m.exp) out.push({ kind: 'Keanggotaan', label: m.nama, ref: m.tipe, exp: m.exp, days: m.days, otoritas: m.tipe, amount: m.iuran }); });
    out.sort((a, b) => a.days - b.days);
    return withinDays != null ? out.filter(x => x.days <= withinDays) : out;
  }

  /* ---------- ringkasan KPI ---------- */
  function summary() {
    const fl = firmLicenses(), ap = apLicenses(), mb = memberships();
    const expSoon = renewalCalendar(120);
    const rotDue = ap.filter((a: any) => a.rotState === 'due');
    const rotAlert = ap.filter((a: { rotState: string }) => a.rotState === 'alert');
    const rotWarn = ap.filter((a: any) => a.rotState === 'warn');
    const pplRisk = ap.filter((a: any) => !a.onPace || !a.structOk);
    return { firmLicenses: fl, ap, memberships: mb, expSoon, rotDue, rotAlert, rotWarn, pplRisk, totalDues: totalDues(), emiten: listedEngagements() };
  }

  const PROVENANCE = [
    { field: 'Nama & peran Akuntan Publik', source: 'AMS.STAFF', module: 'hcm', label: 'Human Capital (HCM)' },
    { field: 'PPL / SKP (YTD)', source: 'AMS.CPE_LOG + CPE_REQ', module: 'cpe', label: 'CPE / PPL Tracker' },
    { field: 'Rotasi & independensi AP', source: 'AMS.INDEPENDENCE', module: 'independence', label: 'Independence & Rotasi' },
    { field: 'Cakupan emiten (STTD OJK)', source: 'AMS.CLIENTS + ENGAGEMENTS', module: 'cockpit', label: 'Engagement / CRM' },
    { field: 'Iuran keanggotaan → biaya', source: 'FIRMOPS.operatingCosts()', module: 'firmfinance', label: 'Firm Finance' },
    { field: 'Pelaporan ke regulator', source: 'PPPK', module: 'pppk', label: 'Pelaporan PPPK' },
  ];

  /* ---------- lekatkan field turunan ke BO.AP_LICENSES (kompat FIRMOPS) ----------
     FIRMOPS.unifiedObligations membaca a.ap/a.ppl/a.pplReq/a.exp → kini berisi
     nilai turunan kanonik, bukan angka lepas. */
  (function attachDerived() {
    const enriched = apLicenses();
    (BO().AP_LICENSES || []).forEach((raw: any) => {
      const e = enriched.find((x: any) => x.izin === raw.izin);
      if (e) { raw.ap = e.ap; raw.ppl = e.ppl; raw.pplReq = e.pplReq; raw.rotasi = e.rotState === 'due' ? 'Rotasi wajib (' + e.tenure + '/' + e.rotationLimit + ' th)' : e.rotationClient !== '—' ? 'Klien ' + e.rotationClient.replace(/^PT /, '') + ' (' + e.tenure + '/' + e.rotationLimit + ' th)' : 'Tidak ada emiten'; raw.status = e.status; }
    });
  })();

  window.LICENSING = {
    staffById, indepById, pplOf, apLicenses, firmLicenses, memberships, totalDues,
    listedEngagements, renewalCalendar, summary, PROVENANCE, rotTier,
  };
})();


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const LICENSING = window.LICENSING;
