/* ============================================================
   NeoSuite AMS — Perjalanan & Reimbursement: lapisan kanonik
   ------------------------------------------------------------
   Modul Perjalanan TIDAK menyimpan nama, grade, klien, atau plafon
   sebagai angka lepas. Semua DITURUNKAN dari sumber kebenarannya:

     · Pegawai & grade   ← AMS.STAFF            (HCM / People)
     · Perikatan & klien ← AMS.ENGAGEMENTS + AMS.CLIENTS  (Engagement/CRM)
     · Plafon (entitlement) ← BO.PER_DIEM + BO.ROUTES      (Kebijakan)
     · Klaim aktual      ← BO.REIMBURSEMENTS.lines         (sub-ledger)
     · Posting & kontrol GL ← AMS.FIRM_COA via FIRMOPS.operatingCosts('travel')

   entitlement(emp, trip) = transport(rute × kelas grade)
                          + hotel(grade) × malam
                          + per diem(grade) × hari
   Selisih klaim > plafon → butuh persetujuan Partner & menjadi objek PPh 21.

   Hasil olahan dilekatkan kembali ke BO.TRIPS (tujuan/staff/grade) agar
   konsumen lama (FIRMOPS.unifiedObligations, Cockpit Operasi) menarik
   SATU angka yang sama. Satu sumber, satu lineage.
   ============================================================ */
(function () {
  const A = () => window.AMS || {};
  const BO = () => window.BO || {};
  const round = (n) => Math.round(n);

  /* ---------- indeks kanonik ---------- */
  function staffById(id) { return (A().STAFF || []).find(s => s.id === id) || null; }
  function engById(id) { return (A().ENGAGEMENTS || []).find(e => e.id === id) || null; }
  function clientById(id) { return (A().CLIENTS || []).find(c => c.id === id) || null; }
  function policyOf(grade) { return (BO().PER_DIEM || []).find(p => p.key === grade) || (BO().PER_DIEM || [])[2] || {}; }
  function routeOf(code) { return (BO().ROUTES || []).find(r => r.code === code) || { code, label: code, fare: 0, intl: false }; }

  /* perikatan → klien (master) → kota & partner */
  function engInfo(engId) {
    const e = engById(engId);
    if (!e) return { id: engId, client: '—', city: '—', partner: '—', manager: '—' };
    const c = clientById(e.clientId) || {};
    return { id: e.id, fy: e.fy, type: e.type, phase: e.phase, client: c.name || e.clientId, city: c.city || '—', partner: e.partner, manager: e.manager };
  }

  /* ---------- entitlement (plafon) dari kebijakan ---------- */
  function entitlement(grade, route, nights, days) {
    const pol = policyOf(grade);
    const r = routeOf(route);
    const transport = round(r.fare * (pol.classMult || 1));
    const lodging = round((pol.hotel || 0) * (nights || 0));
    const perdiem = round((pol.diem || 0) * (days || 0));
    return { transport, lodging, perdiem, total: transport + lodging + perdiem, intl: r.intl, routeLabel: r.label, pol };
  }

  /* ---------- perjalanan diperkaya (join staff + eng + entitlement) ---------- */
  function trips() {
    return (BO().TRIPS || []).map(t => {
      const s = staffById(t.emp) || {};
      const grade = s.grade || 'Senior';
      const eng = engInfo(t.eng);
      const ent = entitlement(grade, t.route, t.nights, t.durasi);
      const overEst = t.est - ent.total;            // estimasi pengaju vs plafon kebijakan
      return {
        ...t,
        staff: s.name || t.emp, grade, role: s.role, empId: t.emp, util: s.util,
        eng: t.eng, client: eng.client, city: eng.city, partner: eng.partner, manager: eng.manager, fy: eng.fy,
        tujuan: eng.client.replace(/^PT /, '') + ' — ' + t.purpose + ' (' + eng.city.split(',')[0] + ')',
        entitlement: ent, plafon: ent.total, overEst,
        withinPolicy: t.est <= ent.total + 1,
      };
    });
  }
  function tripById(id) { return trips().find(t => t.id === id) || null; }

  /* ---------- reimbursement diperkaya (klaim vs plafon + PPh 21) ---------- */
  function reimbursements() {
    return (BO().REIMBURSEMENTS || []).map(r => {
      const s = staffById(r.emp) || {};
      const ln = r.lines || {};
      const klaim = (ln.transport || 0) + (ln.hotel || 0) + (ln.perdiem || 0) + (ln.other || 0);
      const tr = r.trip && r.trip !== '—' ? tripById(r.trip) : null;
      const plafon = r.capOverride != null ? r.capOverride : (tr ? tr.plafon : klaim);
      const excess = Math.max(0, klaim - plafon);   // di atas plafon → objek PPh 21 + approval Partner
      const pph21 = round(excess * 0.05);           // ilustrasi potongan PPh 21 atas kelebihan
      return {
        ...r, klaim, plafon, excess, pph21,
        staff: s.name || r.emp, grade: s.grade, empId: r.emp,
        client: tr ? tr.client : '—', eng: tr ? tr.eng : null, city: tr ? tr.city : null,
        kategori: r.kategori || lineLabel(ln),
        over: klaim > plafon,
        needsPartner: klaim > plafon,
      };
    });
  }
  function lineLabel(ln) {
    const parts = [];
    if (ln.transport) parts.push('Transport');
    if (ln.hotel) parts.push('Hotel');
    if (ln.perdiem) parts.push('Per Diem');
    if (ln.other) parts.push('Lainnya');
    return parts.join(' + ') || '—';
  }

  /* ---------- alokasi biaya per perikatan (→ Time & Budget / Profitability) ---------- */
  function byEngagement() {
    const map = {};
    trips().forEach(t => {
      const k = t.eng;
      const m = (map[k] = map[k] || { eng: t.eng, client: t.client, city: t.city, partner: t.partner, trips: 0, est: 0, plafon: 0 });
      m.trips += 1; m.est += t.est; m.plafon += t.plafon;
    });
    // klaim aktual yang sudah masuk sub-ledger, dipetakan ke perikatannya
    reimbursements().forEach(r => {
      if (!r.eng || !map[r.eng]) return;
      map[r.eng].klaim = (map[r.eng].klaim || 0) + r.klaim;
    });
    return Object.values(map).sort((a, b) => b.est - a.est);
  }

  /* ---------- rekonsiliasi GL: sub-ledger ↔ tren ↔ Operasi Firma ↔ FIRM_COA ----------
     Membuktikan biaya perjalanan menutup ke akun kontrol firma (satu angka). */
  function glReconciliation() {
    const trendYtd = (BO().TRAVEL_TREND || []).reduce((s, m) => s + m.v, 0) * 1e6;   // Rp (jt → Rp)
    let firmopsRow = null;
    try {
      const oc = window.FIRMOPS && window.FIRMOPS.operatingCosts && window.FIRMOPS.operatingCosts();
      firmopsRow = oc && oc.rows.find(x => x.key === 'travel');
    } catch (e) { /* noop */ }
    const coa = (A().FIRM_COA || []).find(a => a.code === '5-200');   // Beban Overhead Kantor (induk beban operasi)
    return {
      rows: [
        { label: 'Sub-ledger Perjalanan — tren biaya (6 bln, BO.TRAVEL_TREND)', value: trendYtd, src: 'BO.TRAVEL_TREND', owner: 'travel' },
        { label: 'Komposisi biaya operasi — baris "Perjalanan dinas" (Direct)', value: firmopsRow ? firmopsRow.amount : trendYtd, src: 'FIRMOPS.operatingCosts()', owner: 'firmops' },
        { label: 'Beban langsung perikatan — terserap di P&L firma', value: firmopsRow ? firmopsRow.amount : trendYtd, src: 'Firm Finance · P&L', owner: 'firmfinance' },
      ],
      coa: coa ? { code: coa.code, name: coa.name, bal: coa.bal } : null,
      tied: !!firmopsRow,
    };
  }

  /* ---------- ringkasan KPI ---------- */
  function summary() {
    const tr = trips(), rb = reimbursements();
    const pending = tr.filter(t => t.status === 'Menunggu Approval');
    const ytd = (BO().TRAVEL_TREND || []).reduce((s, m) => s + m.v, 0);   // dalam jt
    const inProcess = rb.filter(r => r.status === 'Diproses' || r.status === 'Ditahan');
    const overCap = rb.filter(r => r.over);
    const pphTot = rb.reduce((s, r) => s + r.pph21, 0);
    const intl = tr.filter(t => t.entitlement.intl);
    const offPolicy = tr.filter(t => !t.withinPolicy);
    return { trips: tr, reimbursements: rb, pending, inProcess, overCap, ytdJt: ytd, pphTot, intl, offPolicy };
  }

  /* ---------- provenance: peta field → sumber kebenaran (untuk panel lineage) ---------- */
  const PROVENANCE = [
    { field: 'Nama & grade pegawai', source: 'AMS.STAFF', module: 'hcm', label: 'Human Capital (HCM)' },
    { field: 'Perikatan, klien & kota', source: 'AMS.ENGAGEMENTS + CLIENTS', module: 'engagement', label: 'Engagement / CRM' },
    { field: 'Partner & manajer penanggung jawab', source: 'AMS.ENGAGEMENTS', module: 'engagement', label: 'Engagement Mgmt' },
    { field: 'Plafon per diem & kelas transport', source: 'BO.PER_DIEM + BO.ROUTES', module: 'governance', label: 'Kebijakan Firma (SOQM)' },
    { field: 'Alokasi biaya ke perikatan', source: 'TRAVEL.byEngagement()', module: 'time', label: 'Time & Budget' },
    { field: 'Posting & kontrol GL', source: 'AMS.FIRM_COA via FIRMOPS', module: 'firmgl', label: 'General Ledger' },
    { field: 'PPh 21 atas kelebihan per diem', source: 'TRAVEL.reimbursements()', module: 'payroll', label: 'Payroll & PPh 21' },
  ];

  /* ---------- lekatkan field turunan ke BO.TRIPS (kompat konsumen lama) ----------
     FIRMOPS.unifiedObligations membaca t.tujuan/t.appr/t.est → kini berisi nilai
     turunan kanonik, bukan teks lepas. */
  (function attachDerived() {
    const enriched = trips();
    (BO().TRIPS || []).forEach(raw => {
      const e = enriched.find(x => x.id === raw.id);
      if (e) { raw.tujuan = e.tujuan; raw.staff = e.staff; raw.grade = e.grade; raw.plafon = e.plafon; }
    });
  })();

  window.TRAVEL = {
    staffById, engById, engInfo, policyOf, routeOf, entitlement,
    trips, tripById, reimbursements, byEngagement, glReconciliation, summary,
    PROVENANCE,
  };
})();
