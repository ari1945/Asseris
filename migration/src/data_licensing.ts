/* [codemod] ESM imports */
import { AMS } from './data';
import { BO as BO_NS } from './data_backoffice';

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
  const LS = (k, d) => { try { const s = localStorage.getItem('ams.v1.' + k); return s != null ? JSON.parse(s) : d; } catch (e) { return d; } };

  function staffById(id) { return (A().STAFF || []).find(s => s.id === id) || null; }
  function indepById(id) { return (A().INDEPENDENCE || []).find(d => d.id === id) || null; }

  /* fraksi tahun berjalan (untuk indikator laju PPL) */
  function yearFrac() {
    const ref = BO().today ? new Date(BO().today) : new Date('2026-03-09');
    const start = new Date(ref.getFullYear(), 0, 1);
    return Math.min(1, Math.max(0.02, (ref.getTime() - start.getTime()) / (365 * 864e5)));
  }

  /* ---------- PPL/SKP per pegawai — SUMBER: CPE_LOG (+ entri user terpersist) ----------
     IDENTIK dengan perhitungan CPETracker (view_people): base CPE_LOG + cpeExtra. */
  function pplOf(empId) {
    const base = (A().CPE_LOG && A().CPE_LOG[empId]) || [];
    const extra = (LS('cpeExtra', {})[empId]) || [];
    const recs = [...extra, ...base];
    const total = recs.reduce((a, r) => a + (r.skp || 0), 0);
    const structured = recs.filter(r => r.type === 'Terstruktur').reduce((a, r) => a + (r.skp || 0), 0);
    return { total, structured, recs };
  }

  /* ---------- Izin Akuntan Publik diperkaya (HCM + CPE + Independence) ---------- */
  function apLicenses() {
    const req = A().CPE_REQ || { annual: 40, structured: 20, year: 2026 };
    const frac = yearFrac();
    const expectedYtd = Math.round(req.annual * frac);
    return (BO().AP_LICENSES || []).map(a => {
      const s = staffById(a.emp) || {};
      const ind = indepById(a.emp) || {};
      const ppl = pplOf(a.emp);
      const onPace = ppl.total >= expectedYtd;
      const structOk = ppl.structured >= Math.round(req.structured * frac);
      const tenure = ind.tenure || 0, limit = ind.rotationLimit || 5;
      const rotState = tenure >= limit ? 'due' : tenure >= limit - 1 ? 'warn' : 'ok';
      return {
        ...a,
        empId: a.emp, ap: (s.name || a.emp) + (s.cert && /CPA/.test(s.cert) ? ', CPA' : ''),
        name: s.name || a.emp, role: s.role, grade: s.grade, cert: s.cert,
        ppl: ppl.total, pplStructured: ppl.structured, pplReq: req.annual, pplStructReq: req.structured,
        expectedYtd, onPace, structOk, recs: ppl.recs,
        rotationClient: ind.rotationClient || '—', tenure, rotationLimit: limit, rotState,
        declared: !!ind.declared, conflicts: ind.conflicts || 0, listed: !!ind.listed,
        status: rotState === 'due' ? 'Rotasi Wajib' : !onPace ? 'PPL di Bawah Laju' : 'Patuh',
      };
    });
  }

  /* ---------- Izin Firma diperkaya (cakupan emiten OJK ← CLIENTS/ENGAGEMENTS) ---------- */
  function listedEngagements() {
    const cl = A().CLIENTS || [], eng = A().ENGAGEMENTS || [];
    const listedIds = new Set(cl.filter(c => c.listed).map(c => c.id));
    return eng.filter(e => listedIds.has(e.clientId)).map(e => {
      const c = cl.find(x => x.id === e.clientId) || {};
      return { id: e.id, client: c.name, status: e.status };
    });
  }
  function firmLicenses() {
    const listed = listedEngagements();
    const memberships = BO().MEMBERSHIPS || [];
    return (BO().FIRM_LICENSES || []).map(l => {
      const days = l.exp ? BO().daysTo(l.exp) : null;
      let coverage = null, linkMember = null;
      if (/OJK/.test(l.otoritas) || /OJK/i.test(l.nama)) coverage = { kind: 'emiten', items: listed, label: listed.length + ' perikatan emiten bergantung pada registrasi ini' };
      if (/IAPI/.test(l.nama) || /IAPI/.test(l.no)) { const m = memberships.find(x => /IAPI/.test(x.nama)); if (m) linkMember = m; }
      return { ...l, days, coverage, linkMember };
    });
  }

  /* ---------- Keanggotaan diperkaya (iuran → biaya operasi firma) ---------- */
  function memberships() {
    return (BO().MEMBERSHIPS || []).map(m => ({ ...m, days: m.exp ? BO().daysTo(m.exp) : null }));
  }
  function totalDues() { return (BO().MEMBERSHIPS || []).reduce((s, m) => s + m.iuran, 0); }

  /* ---------- kalender perpanjangan terpadu (izin firma + AP + keanggotaan) ---------- */
  function renewalCalendar(withinDays) {
    const out = [];
    firmLicenses().forEach(l => { if (l.exp) out.push({ kind: 'Izin Firma', label: l.nama, ref: l.no, exp: l.exp, days: l.days, otoritas: l.otoritas, amount: 0 }); });
    apLicenses().forEach(a => out.push({ kind: 'Izin AP', label: a.name, ref: a.izin, exp: a.exp, days: BO().daysTo(a.exp), otoritas: a.reg, amount: 0 }));
    memberships().forEach(m => { if (m.exp) out.push({ kind: 'Keanggotaan', label: m.nama, ref: m.tipe, exp: m.exp, days: m.days, otoritas: m.tipe, amount: m.iuran }); });
    out.sort((a, b) => a.days - b.days);
    return withinDays != null ? out.filter(x => x.days <= withinDays) : out;
  }

  /* ---------- ringkasan KPI ---------- */
  function summary() {
    const fl = firmLicenses(), ap = apLicenses(), mb = memberships();
    const expSoon = renewalCalendar(120);
    const rotDue = ap.filter(a => a.rotState === 'due');
    const rotWarn = ap.filter(a => a.rotState === 'warn');
    const pplRisk = ap.filter(a => !a.onPace || !a.structOk);
    return { firmLicenses: fl, ap, memberships: mb, expSoon, rotDue, rotWarn, pplRisk, totalDues: totalDues(), emiten: listedEngagements() };
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
    (BO().AP_LICENSES || []).forEach(raw => {
      const e = enriched.find(x => x.izin === raw.izin);
      if (e) { raw.ap = e.ap; raw.ppl = e.ppl; raw.pplReq = e.pplReq; raw.rotasi = e.rotState === 'due' ? 'Rotasi wajib (' + e.tenure + '/' + e.rotationLimit + ' th)' : e.rotationClient !== '—' ? 'Klien ' + e.rotationClient.replace(/^PT /, '') + ' (' + e.tenure + '/' + e.rotationLimit + ' th)' : 'Tidak ada emiten'; raw.status = e.status; }
    });
  })();

  window.LICENSING = {
    staffById, indepById, pplOf, apLicenses, firmLicenses, memberships, totalDues,
    listedEngagements, renewalCalendar, summary, PROVENANCE,
  };
})();


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const LICENSING = window.LICENSING;
