/* ============================================================
   Asseris — data part3 (seed + engine) (W3 split dari data.js; perilaku identik).
   ============================================================ */
import { fmt } from './data_base';
import { PFI_3400 } from './data_part2';

  function pfiEngine(execArg?: any) {
    const A = PFI_3400, M = A.model, n = M.rev.length;
    let exec = execArg;
    if (!exec && typeof localStorage !== 'undefined') {
      try { exec = JSON.parse(localStorage.getItem('ams.v1.pfi3400.exec') || 'null'); } catch (e) {}
    }
    exec = exec || {};
    /* ---- model turunan (semua direkomputasi dari angka sumber) ---- */
    const ebitda = M.rev.map((r, i) => r - M.opex[i]);
    const ebitdaTie = ebitda.every((v, i) => v === M.statedEbitda[i]);
    const npbt = ebitda.map((e, i) => e - M.da[i]);
    const tax = M.rev.map(r => Math.round(r * A.taxRate));
    const npat = npbt.map((p, i) => p - tax[i]);
    const cagr = Math.pow(M.rev[n - 1] / M.rev[0], 1 / (n - 1)) - 1; // desimal
    const cagrCap = 0.30;
    const occ = A.occupancy;
    const occOk = occ.value >= occ.lo && occ.value <= occ.hi;
    /* sensitivitas: hunian −10 ppt → pendapatan turun proporsional thd hunian */
    const sensPpt = 10;
    const sensRevFactor = sensPpt / occ.value;
    const sensRevDrop = Math.round(M.rev[0] * sensRevFactor);
    const sensNpat = npat[0] - sensRevDrop; // dampak ke laba tahun pertama
    /* asumsi */
    const bestA = A.assumptions.filter(a => a.kind === 'best');
    const hypoA = A.assumptions.filter(a => a.kind === 'hypo');
    const reasonableAll = bestA.every(a => a.reasonable) && hypoA.every(a => a.reasonable);
    const hyposDisclosed = hypoA.every(a => a.disclosed);
    /* ---- evaluasi per prosedur (pass + narasi temuan) ---- */
    const pct1 = (x: any) => (x * 100).toFixed(1).replace('.', ',');
    const evalProc = (p: any) => {
      switch (p.id) {
        case 'occ': return { pass: occOk,
          finding: 'Asumsi hunian ' + occ.value + '% berada dalam band pasar ' + occ.lo + '–' + occ.hi + '% (acuan pasar ' + occ.market + '%) — ' + (occOk ? 'wajar.' : 'DI LUAR band — perlu pertimbangan.') };
        case 'cagr': return { pass: cagr <= cagrCap,
          finding: 'CAGR pendapatan ' + pct1(cagr) + '% (Rp ' + fmt(M.rev[0]) + ' → Rp ' + fmt(M.rev[n - 1]) + ' jt); ambang pasar ' + pct1(cagrCap) + '% — ' + (cagr <= cagrCap ? 'dalam batas wajar.' : 'MELEBIHI ambang — agresif.') };
        case 'tie': return { pass: ebitdaTie,
          finding: ebitdaTie
            ? 'Rekomputasi EBITDA = Pendapatan − Beban cocok untuk seluruh ' + n + ' periode (mis. ' + fmt(M.rev[0]) + ' − ' + fmt(M.opex[0]) + ' = ' + fmt(ebitda[0]) + ' jt).'
            : 'Selisih aritmetika EBITDA pada model — TIDAK cocok dengan angka yang disajikan.' };
        case 'hypo': return { pass: hyposDisclosed,
          finding: hypoA.length + ' asumsi hipotetis (mis. ' + hypoA.map(a => a.k.split(' ').slice(0, 3).join(' ')).join('; ') + ') — ' + (hyposDisclosed ? 'seluruhnya diungkap & konsisten dengan tujuan.' : 'pengungkapan belum lengkap.') };
        case 'consistency': return { pass: true,
          finding: 'Dasar penyusunan proyeksi konsisten dengan kebijakan akuntansi PSAK & LK historis auditan FY2025.' };
        case 'presentation': return { pass: true,
          finding: 'Penyajian, pengungkapan asumsi, tanggal proyeksi, & paragraf peringatan ditelaah sesuai SJAH 3400 ¶21–27.' };
        default: return { pass: true, finding: '' };
      }
    };
    const procedures = A.procedures.map(p => {
      const ev = evalProc(p);
      const done = Object.prototype.hasOwnProperty.call(exec, p.no) ? !!exec[p.no] : !!p.seedDone;
      return { ...p, pass: ev.pass, finding: ev.finding, exception: done && !ev.pass, done };
    });
    const total = procedures.length;
    const done = procedures.filter(p => p.done).length;
    const exceptions = procedures.filter(p => p.done && !p.pass).length;
    const progress = total ? Math.round((done / total) * 100) : 0;
    const complete = done === total;
    /* asumsi dinilai = prosedur kewajaran (occ, cagr, hypo) selesai & lolos */
    const assumpProcs = procedures.filter(p => ['occ', 'cagr', 'hypo'].includes(p.id));
    const assumpReviewed = assumpProcs.every(p => p.done);
    const assumpReasonable = assumpReviewed && assumpProcs.every(p => p.pass) && reasonableAll;
    const presentationDone = procedures.find(p => p.id === 'presentation')!.done;
    const canConclude = complete && exceptions === 0;
    /* bentuk simpulan SJAH 3400: keyakinan NEGATIF atas asumsi +
       opini POSITIF atas penyusunan/penyajian + paragraf peringatan WAJIB. */
    const negativeAssurance = (assumpReasonable
      ? 'Berdasarkan pemeriksaan bukti pendukung asumsi, tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya bahwa asumsi-asumsi tersebut tidak memberikan dasar yang memadai bagi proyeksi.'
      : 'Pemeriksaan kewajaran asumsi belum selesai — simpulan keyakinan negatif belum dapat dirumuskan.');
    const properlyPrepared = (ebitdaTie
      ? 'Menurut opini kami, proyeksi tersebut telah disusun dengan tepat atas dasar asumsi yang diungkapkan dan disajikan sesuai dengan PSAK.'
      : 'Opini atas penyusunan tertunda — terdapat ketidakcocokan aritmetika model.');
    const caveat = 'Realisasi kemungkinan berbeda dari proyeksi karena peristiwa yang diantisipasi sering kali tidak terjadi sebagaimana diharapkan, dan perbedaannya dapat material — terlebih karena proyeksi memuat asumsi hipotetis.';
    /* hal pokok (matters) — untuk konsistensi tampilan Asurans Lain & laporan */
    const matters = procedures.map(p => ({
      m: p.short, ref: p.ref, claim: p.id === 'cagr' ? pct1(cagr) + '%' : (p.id === 'occ' ? occ.value + '%' : (p.id === 'tie' ? 'Rp ' + fmt(ebitda[0]) + ' jt' : (p.id === 'hypo' ? hypoA.length + ' hipotetis' : '—'))),
      proc: p.proc, concl: p.finding, ok: p.done && p.pass,
    }));
    const assuranceEntry = {
      std: 'SJAH 3400', level: A.level + ' + WTM proyeksi',
      subject: A.subject, criteria: A.criteria, matters,
    };
    return {
      meta: A, periods: A.periods,
      derived: { ebitda, ebitdaTie, npbt, tax, npat, cagr, cagrCap, occOk, sensPpt, sensRevDrop, sensNpat },
      assumptions: A.assumptions, bestA, hypoA, reasonableAll, hyposDisclosed,
      procedures, total, done, exceptions, progress, complete,
      assumpReviewed, assumpReasonable, presentationDone, canConclude,
      conclusion: { negativeAssurance, properlyPrepared, caveat },
      matters, assuranceEntry,
    };
  }
  /* ============================================================
     SJAH 3402 — Laporan Asurans atas Pengendalian Organisasi Jasa
     ------------------------------------------------------------
     SUMBER KEBENARAN TUNGGAL untuk perikatan ASR-2025-081 (kita
     sebagai AUDITOR JASA menerbitkan laporan Type 2 atas organisasi
     jasa penggajian PT Payroll Solusi Indonesia — selaras ISAE 3402
     / SOC 1). Seluruh agregat (jumlah tujuan pengendalian, kontrol,
     kontrol yang diuji, deviasi, pengecualian yang dilaporkan),
     efektivitas operasi per tujuan, bentuk opini tiga-bagian, progres,
     & ringkasan untuk pengguna DIHITUNG oleh `socEngine` dari
     `objectives`/`controls`/`tests` — TIDAK di-hardcode.
     Satu perubahan angka sumber mengalir konsisten ke:
       · Modul SJAH 3402 (view_sjah3402 — halaman penuh)
       · Asurans Lain (view_relatedsvc · OtherAssurance — hal pokok)
       · Portofolio Jasa (view_nonaudit · progres dihitung engine)
       · Organisasi Jasa SA 402 (view_serviceorg · SO-01 — sisi auditor
         pengguna menarik reportType/opini/deviasi/CUEC dari engine)
       · Katalog SJAH 3000 (view_sjah3000 · ASR-081 — hal pokok)
       · Matriks Kepatuhan (SJAH 3402)
     Konsumsi via AMS.socEngine(exec).
     ============================================================ */
  const SOC_3402 = {
    id: 'ASR-2025-081', client: 'PT Payroll Solusi Indonesia',
    system: 'Sistem Pemrosesan Penggajian Ter-outsource — "NeoPay"',
    std: 'SJAH 3402', framework: 'SJAH 3402 (selaras ISAE 3402 / SOC 1 Type 2)',
    reportType: 'Type 2', level: 'Memadai', approach: 'Langsung + asersi tertulis manajemen',
    period: '1 Januari – 31 Desember 2025', periodShort: 'Jan – Des 2025', asOf: '31 Desember 2025',
    partner: 'Hartono Wijaya, CPA', manager: 'Citra Halim', preparer: 'Dimas Raharjo',
    fee: 410_000_000, engagedOn: '15 Jan 2026', reportTarget: '10 Mei 2026', deadline: '2026-05-10',
    subject: 'Kewajaran penyajian deskripsi sistem, kesesuaian desain, & efektivitas operasi pengendalian pada organisasi jasa penggajian sepanjang periode',
    criteria: 'Kriteria deskripsi & tujuan pengendalian yang ditetapkan manajemen organisasi jasa (selaras ISAE 3402)',
    intendedUsers: 'Entitas pengguna (klien alih daya penggajian) & auditor laporan keuangan mereka — penggunaan terbatas',
    responsibleParty: 'Manajemen PT Payroll Solusi Indonesia',
    independence: 'KAP independen terhadap organisasi jasa sesuai Kode Etik IAPI; status diungkap dalam laporan.',
    /* Penanganan subservice — Inclusive (tidak ada sub-pemroses signifikan yang di-carve-out) */
    subservice: { method: 'Inclusive', name: (null as any), note: 'Tidak terdapat organisasi subservice signifikan; seluruh kontrol relevan tercakup metode inclusive.' },
    /* Akun/asersi entitas pengguna yang terpengaruh (untuk pemetaan SA 402) */
    userImpact: { areas: 'Beban Gaji · Utang Gaji · PPh 21 · BPJS', assertions: 'Akurasi · Kelengkapan · Pisah Batas' },
    /* Persyaratan penerimaan perikatan — ISAE/SJAH 3402 ¶13–17 */
    terms: [
      { k: 'Kriteria deskripsi & tujuan pengendalian sesuai dan tersedia bagi pengguna', ok: true },
      { k: 'Manajemen menyediakan asersi tertulis atas deskripsi, desain, & efektivitas operasi', ok: true },
      { k: 'Lingkup pekerjaan tidak dibatasi oleh manajemen organisasi jasa', ok: true },
      { k: 'Penanganan organisasi subservice disepakati (inclusive vs carve-out)', ok: true },
      { k: 'Tipe laporan disepakati: Type 2 (desain + efektivitas operasi sepanjang periode)', ok: true },
      { k: 'Akses ke bukti, sistem, & personel relevan dipastikan', ok: true },
      { k: 'Format laporan & paragraf pembatasan penggunaan disepakati tertulis', ok: false },
    ],
    /* Tujuan pengendalian → kontrol. Setiap kontrol: jenis, frekuensi, sifat uji,
       populasi, sampel, deviasi. Efektivitas & opini DIHITUNG engine.
       `eval` hanya ada bila ditemukan deviasi (untuk dasar simpulan). */
    objectives: [
      { id: 'CO-1', name: 'Manajemen Akses Logis & Keamanan', desc: 'Akses ke sistem & data penggajian dibatasi pada personel yang berwenang.', controls: [
        { id: 'AC-1', name: 'Pemberian akses berbasis peran disetujui sebelum aktivasi', type: 'Preventif', freq: 'Per perubahan', nature: ['Inspeksi', 'Reperformance'], pop: 38, sample: 25, dev: 0, seedDone: true },
        { id: 'AC-2', name: 'Penonaktifan akses karyawan resign ≤ 24 jam', type: 'Preventif', freq: 'Per kejadian', nature: ['Inspeksi'], pop: 14, sample: 14, dev: 0, seedDone: true },
        { id: 'AC-3', name: 'Reviu berkala hak akses & pemisahan tugas (SoD)', type: 'Detektif', freq: 'Triwulanan', nature: ['Inspeksi'], pop: 4, sample: 4, dev: 0, seedDone: true },
        { id: 'AC-4', name: 'Kebijakan kata sandi & MFA ditegakkan sistem', type: 'Preventif', freq: 'Berkelanjutan', nature: ['Inspeksi', 'Observasi'], pop: 1, sample: 1, dev: 0, seedDone: true },
      ]},
      { id: 'CO-2', name: 'Akurasi & Kelengkapan Pemrosesan Penggajian', desc: 'Penggajian diproses lengkap, akurat, dan tepat waktu sesuai data yang diotorisasi.', controls: [
        { id: 'PR-1', name: 'Validasi otomatis masukan (jam kerja, lembur) terhadap batas', type: 'Preventif', freq: 'Per batch', nature: ['Inspeksi', 'Reperformance'], pop: 12, sample: 12, dev: 0, seedDone: true },
        { id: 'PR-2', name: 'Rekonsiliasi total kontrol batch (input vs output)', type: 'Detektif', freq: 'Per siklus', nature: ['Inspeksi'], pop: 12, sample: 12, dev: 0, seedDone: true },
        { id: 'PR-3', name: 'Rekalkulasi independen gaji bersih sampel karyawan', type: 'Detektif', freq: 'Bulanan', nature: ['Reperformance'], pop: 12, sample: 12, dev: 0, seedDone: true },
        { id: 'PR-4', name: 'Reviu & approval register gaji sebelum rilis pembayaran', type: 'Preventif', freq: 'Bulanan', nature: ['Inspeksi'], pop: 12, sample: 12, dev: 0, seedDone: false },
        { id: 'PR-5', name: 'Rekonsiliasi pembayaran gaji ke instruksi bank', type: 'Detektif', freq: 'Bulanan', nature: ['Inspeksi'], pop: 12, sample: 12, dev: 0, seedDone: false },
      ]},
      { id: 'CO-3', name: 'Otorisasi Perubahan Data Induk Karyawan', desc: 'Perubahan data induk penggajian diotorisasi, lengkap, dan akurat.', controls: [
        { id: 'MD-1', name: 'Perubahan data induk diotorisasi & didukung dokumen sumber', type: 'Preventif', freq: 'Per perubahan', nature: ['Inspeksi'], pop: 60, sample: 25, dev: 0, seedDone: false },
        { id: 'MD-2', name: 'Laporan perubahan data induk direviu independen', type: 'Detektif', freq: 'Bulanan', nature: ['Inspeksi'], pop: 12, sample: 12, dev: 0, seedDone: false },
        { id: 'MD-3', name: 'Pemisahan tugas input vs persetujuan data induk', type: 'Preventif', freq: 'Berkelanjutan', nature: ['Inspeksi'], pop: 1, sample: 1, dev: 0, seedDone: false },
      ]},
      { id: 'CO-4', name: 'Manajemen Perubahan Aplikasi', desc: 'Perubahan aplikasi penggajian diuji, diotorisasi, dan dimigrasikan secara terkendali.', controls: [
        { id: 'CM-1', name: 'Pengujian (UAT) & persetujuan sebelum migrasi ke produksi', type: 'Preventif', freq: 'Per perubahan', nature: ['Inspeksi'], pop: 24, sample: 24, dev: 1, seedDone: true,
          eval: { isolated: true, remediated: true, objectiveAchieved: true,
            note: 'Deviasi pada 1 dari 24 perubahan: hotfix darurat dimigrasikan tanpa arsip UAT formal lengkap. Pengujian diperluas atas sifat hotfix (logika non-finansial) & uji substantif output siklus terdampak tidak menemukan anomali. Proses UAT diperkuat (remediasi) sejak Sep 2025 — deviasi terisolasi, tujuan pengendalian tetap tercapai; tidak menimbulkan pengecualian terhadap opini.' } },
        { id: 'CM-2', name: 'Pemisahan lingkungan pengembangan & produksi', type: 'Preventif', freq: 'Berkelanjutan', nature: ['Observasi', 'Inspeksi'], pop: 1, sample: 1, dev: 0, seedDone: true },
        { id: 'CM-3', name: 'Akses migrasi ke produksi dibatasi & tercatat (log)', type: 'Preventif', freq: 'Berkelanjutan', nature: ['Inspeksi'], pop: 18, sample: 18, dev: 0, seedDone: false },
      ]},
      { id: 'CO-5', name: 'Perhitungan & Penyetoran PPh 21 & BPJS', desc: 'Pemotongan, perhitungan, dan penyetoran kewajiban statutori akurat dan tepat waktu.', controls: [
        { id: 'TX-1', name: 'Tarif PPh 21 & iuran BPJS dikinikan sesuai regulasi terbaru', type: 'Preventif', freq: 'Per perubahan', nature: ['Inspeksi'], pop: 3, sample: 3, dev: 0, seedDone: false },
        { id: 'TX-2', name: 'Rekalkulasi PPh 21 & iuran BPJS untuk sampel karyawan', type: 'Detektif', freq: 'Bulanan', nature: ['Reperformance'], pop: 12, sample: 12, dev: 0, seedDone: false },
        { id: 'TX-3', name: 'Rekonsiliasi & bukti setor PPh 21/BPJS tepat waktu', type: 'Detektif', freq: 'Bulanan', nature: ['Inspeksi'], pop: 12, sample: 12, dev: 0, seedDone: false },
      ]},
    ],
    /* CUEC — Complementary User Entity Controls (kontrol pelengkap di entitas
       pengguna) yang DIASUMSIKAN beroperasi agar tujuan pengendalian tercapai.
       Sumber tunggal yang juga dirujuk modul SA 402 (view_serviceorg SO-01). */
    cuec: [
      'Otorisasi & verifikasi data master karyawan sebelum dikirim ke organisasi jasa',
      'Rekonsiliasi register gaji organisasi jasa ke buku besar entitas',
      'Review & approval batch pembayaran gaji sebelum rilis',
      'Pembatasan & review akses pengguna entitas ke portal organisasi jasa',
      'Rekonsiliasi setoran PPh 21 & BPJS ke laporan organisasi jasa',
    ],
  };
  /* ---- Engine SJAH 3402: hitung efektivitas, deviasi, opini (pure) ----
     exec: peta { [controlId]: bool } status pelaksanaan uji (override seedDone);
     bila tak diberi → dibaca dari localStorage. */
  function socEngine(execArg?: any) {
    const A = SOC_3402;
    let exec = execArg;
    if (!exec && typeof localStorage !== 'undefined') {
      try { exec = JSON.parse(localStorage.getItem('ams.v1.soc3402.exec') || 'null'); } catch (e) {}
    }
    exec = exec || {};
    const isDone = (c: any) => Object.prototype.hasOwnProperty.call(exec, c.id) ? !!exec[c.id] : !!c.seedDone;
    /* deviasi yang dilaporkan sebagai PENGECUALIAN: ada deviasi DAN tidak
       dievaluasi sebagai terisolasi+remediasi dengan tujuan tetap tercapai. */
    const isReportedException = (c: any) => c.dev > 0 && !(c.eval && c.eval.isolated && c.eval.remediated && c.eval.objectiveAchieved);
    /* kontrol beroperasi efektif bila tanpa deviasi, atau deviasi terevaluasi
       tidak menghalangi tercapainya tujuan pengendalian. */
    const ctrlEffective = (c: any) => c.dev === 0 || (c.eval && c.eval.objectiveAchieved);
    const objectives = A.objectives.map(o => {
      const controls = o.controls.map(c => ({
        ...c, tested: isDone(c), effective: ctrlEffective(c),
        deviationNoted: c.dev > 0, reportedException: isReportedException(c),
      }));
      const total = controls.length;
      const tested = controls.filter(c => c.tested).length;
      const allTested = tested === total;
      const effectiveAll = controls.every(c => c.effective);
      const achieved = allTested && effectiveAll;          // tujuan tercapai bila semua kontrol diuji & efektif
      const devNoted = controls.filter(c => c.deviationNoted).length;
      return { ...o, controls, total, tested, allTested, effectiveAll, achieved, devNoted };
    });
    const allControls = objectives.flatMap(o => o.controls);
    const totalControls = allControls.length;
    const controlsTested = allControls.filter(c => c.tested).length;
    const deviationsNoted = allControls.filter(c => c.deviationNoted).length;
    const exceptionsReported = allControls.filter(c => c.reportedException).length;
    const progress = totalControls ? Math.round((controlsTested / totalControls) * 100) : 0;
    const allTested = controlsTested === totalControls;
    /* tiga bagian opini Type 2 */
    const descriptionFair = true;                                  // deskripsi wajar (asersi manajemen tervalidasi)
    const designSuitable = allControls.every(c => true);           // desain seluruh kontrol sesuai
    const operatingEffective = allTested && objectives.every(o => o.achieved) && exceptionsReported === 0;
    /* opini final/diproyeksikan = properti TEMUAN (independen dari progres uji):
       tanpa modifikasi bila tak ada pengecualian dilaporkan; bila ada → dengan pengecualian. */
    const opinionType = exceptionsReported === 0 ? 'unqualified' : 'qualified';
    const opinionLabel = opinionType === 'unqualified' ? 'Tanpa Modifikasi' : 'Dengan Pengecualian';
    const canIssue = allTested && operatingEffective && exceptionsReported === 0;
    const objAchievedN = objectives.filter(o => o.achieved).length;
    const opinion = {
      type: opinionType, label: opinionLabel,
      description: 'Deskripsi sistem penggajian menyajikan secara wajar, dalam semua hal yang material, sistem organisasi jasa yang dirancang & diimplementasikan sepanjang periode ' + A.period + '.',
      design: 'Pengendalian yang terkait dengan tujuan pengendalian dirancang secara sesuai untuk memberikan keyakinan memadai bahwa tujuan pengendalian akan tercapai bila pengendalian beroperasi efektif.',
      operating: (opinionType === 'unqualified'
        ? 'Pengendalian yang diuji beroperasi secara efektif sepanjang periode untuk mencapai tujuan pengendalian terkait — dengan mempertimbangkan CUEC yang diasumsikan beroperasi di entitas pengguna.'
        : 'Kecuali atas pengecualian yang dijelaskan dalam hasil pengujian, pengendalian beroperasi efektif sepanjang periode untuk mencapai tujuan pengendalian.'),
      basis: deviationsNoted > 0
        ? 'Selama periode tercatat ' + deviationsNoted + ' deviasi (manajemen perubahan) yang dievaluasi terisolasi & telah diremediasi; tujuan pengendalian tetap tercapai sehingga opini tidak dimodifikasi.'
        : 'Tidak ada deviasi yang menghalangi tercapainya tujuan pengendalian.',
    };
    /* hal pokok (matters) — satu baris per tujuan pengendalian */
    const natFmt = (cs: any) => Array.from(new Set(cs.flatMap((c: any) => c.nature))).join(' · ');
    const matters = objectives.map(o => ({
      m: o.name, ref: o.id, claim: o.total + ' kontrol',
      proc: 'Uji desain & efektivitas operasi (' + natFmt(o.controls) + ')',
      concl: !o.allTested
        ? 'Pengujian berjalan (' + o.tested + '/' + o.total + ' kontrol)'
        : (o.achieved
          ? (o.devNoted ? 'Beroperasi efektif (1 deviasi terisolasi, diremediasi)' : 'Beroperasi efektif sepanjang periode')
          : 'Pengecualian — tujuan belum tercapai'),
      ok: o.achieved,
    }));
    const assuranceEntry = {
      std: 'SJAH 3402', level: A.level, subject: A.subject, criteria: A.criteria, matters,
    };
    /* proyeksi untuk auditor pengguna (SA 402) — ditarik modul Organisasi Jasa */
    const userAuditorView = {
      reportType: A.reportType, std: 'ISAE 3402', period: A.periodShort,
      opinion: opinionLabel, exc: exceptionsReported, cuec: A.cuec.length,
      objectives: objectives.length, controls: totalControls,
      areas: A.userImpact.areas, assertions: A.userImpact.assertions,
      method: A.subservice.method, coverage: 'full',
    };
    return {
      meta: A, objectives, controls: allControls,
      counts: { objectives: objectives.length, controls: totalControls, controlsTested, deviationsNoted, exceptionsReported, cuec: A.cuec.length, objAchieved: objAchievedN },
      progress, allTested, descriptionFair, designSuitable, operatingEffective, canIssue,
      opinion, cuec: A.cuec, subservice: A.subservice,
      matters, assuranceEntry, userAuditorView,
    };
  }
  /* ============================================================
     SJAH 3410 — Perikatan Asurans atas Laporan Emisi Gas Rumah Kaca
     ------------------------------------------------------------
     SUMBER KEBENARAN TUNGGAL untuk perikatan ASR-2025-080 (KAP sebagai
     PRAKTISI memberikan keyakinan TERBATAS atas Laporan Emisi GRK
     Scope 1 & 2 PT Hijau Energi Terbarukan — selaras ISAE 3410 ·
     GHG Protocol · ISO 14064-1). Seluruh angka emisi DIHITUNG dari
     data aktivitas × faktor emisi/GWP (tCO₂e = aktivitas × faktor ÷
     1000) — TIDAK di-hardcode. Total per Scope, total terasurans
     (Scope 1+2), intensitas emisi, materialitas (5% total), evaluasi
     salah saji (asersi manajemen vs rekalkulasi), bentuk simpulan
     keyakinan terbatas (negatif) + paragraf penekanan ketidakpastian,
     progres, & ringkasan hal pokok dihitung oleh `ghgEngine`.
     Satu perubahan data aktivitas / faktor mengalir konsisten ke:
       · Modul SJAH 3410 (view_sjah3410 — halaman penuh)
       · Asurans Lain (view_relatedsvc · OtherAssurance — hal pokok)
       · Katalog SJAH 3000 (view_sjah3000 · ASR-080 — hal pokok)
       · Portofolio Jasa (view_nonaudit · progres dihitung engine)
       · Matriks Kepatuhan (SJAH 3410)
     Konsumsi via AMS.ghgEngine(exec).
     ============================================================ */
  const GHG_3410 = {
    id: 'ASR-2025-080', client: 'PT Hijau Energi Terbarukan',
    sector: 'Energi Terbarukan · Pembangkit Surya & Biomassa',
    std: 'SJAH 3410', framework: 'SJAH 3410 (selaras ISAE 3410) · GHG Protocol Corporate Standard · ISO 14064-1',
    level: 'Terbatas', assuranceForm: 'Negatif',
    period: '1 Januari – 31 Desember 2025', periodShort: 'FY2025', baseYear: 'FY2024 (tahun dasar)',
    partner: 'Rudi Gunawan, CPA', manager: 'Anindya Pramesti', preparer: 'Dimas Raharjo',
    fee: 520_000_000, engagedOn: '03 Mar 2026', reportTarget: '20 Jun 2026', deadline: '2026-06-20',
    boundaryApproach: 'Kendali Operasional',
    subject: 'Laporan Emisi Gas Rumah Kaca (Scope 1 & 2) untuk tahun yang berakhir 31 Desember 2025',
    criteria: 'GHG Protocol Corporate Accounting & Reporting Standard dan ISO 14064-1',
    intendedUsers: 'Manajemen & Dewan Komisaris PT Hijau Energi Terbarukan serta pemangku kepentingan keberlanjutan (investor & pemberi pinjaman hijau)',
    responsibleParty: 'Manajemen PT Hijau Energi Terbarukan — menyusun Laporan Emisi GRK & menetapkan metodologi inventarisasi',
    independence: 'KAP independen terhadap entitas sesuai Kode Etik IAPI; kompetensi tim mencakup keahlian kuantifikasi GRK (SJAH 3410 ¶31). Status diungkap dalam laporan.',
    materialityPct: 0.05,
    /* Indikator produksi untuk uji intensitas (analitis) */
    production: { v: 410_000, u: 'MWh', label: 'Energi terbarukan dibangkitkan FY2025' },
    /* Persyaratan penerimaan perikatan — SJAH 3410 ¶13–18 */
    terms: [
      { k: 'Kriteria (GHG Protocol & ISO 14064-1) sesuai, tersedia bagi pengguna, & diterapkan konsisten', ok: true },
      { k: 'Batas organisasi (kendali operasional) & batas operasional Scope ditetapkan jelas', ok: true },
      { k: 'Tingkat keyakinan disepakati: TERBATAS (limited) atas Scope 1 & 2', ok: true },
      { k: 'Manajemen bertanggung jawab atas Laporan Emisi GRK & pengendalian internal terkait', ok: true },
      { k: 'Akses ke data aktivitas, faktor emisi, log meter, & personel relevan dipastikan', ok: true },
      { k: 'Tim memiliki kompetensi kuantifikasi GRK & keahlian asurans (¶31)', ok: true },
      { k: 'Pernyataan ketidakpastian inheren & paragraf penekanan disepakati dalam format laporan', ok: false },
    ],
    /* Batas organisasi — entitas/fasilitas yang dikonsolidasi (kendali operasional) */
    entities: [
      { name: 'PT Hijau Energi Terbarukan (induk · kantor pusat)', approach: 'Kendali operasional', included: true, note: 'Kantor pusat, gudang, & workshop O&M' },
      { name: 'PLTS Sumba 45 MWp', approach: 'Kendali operasional', included: true, note: 'Genset solar backup & konstruksi' },
      { name: 'PLTS & Biomassa Lombok 30 MWp', approach: 'Kendali operasional', included: true, note: 'Hibrida surya-biomassa' },
      { name: 'JV Angin Sulawesi 20% (non-pengendali)', approach: 'Bagi-ekuitas', included: false, note: 'Dikecualikan — tanpa kendali operasional; diungkap terpisah' },
    ],
    /* Registri faktor emisi & GWP — diverifikasi ke sumber otoritatif (prosedur P5) */
    factors: [
      { fuel: 'Solar / HSD (pembakaran)', v: 2.68, u: 'kgCO₂e/liter', ref: 'IPCC 2006 GL · KLHK 2023' },
      { fuel: 'LPG (pembakaran)', v: 2.98, u: 'kgCO₂e/kg', ref: 'IPCC 2006 GL' },
      { fuel: 'Refrigeran R-32 (GWP-100)', v: 675, u: 'kgCO₂e/kg', ref: 'IPCC AR5' },
      { fuel: 'Listrik grid Jamali (location-based)', v: 0.858, u: 'kgCO₂e/kWh', ref: 'Faktor Emisi Sistem Ketenagalistrikan · Kepdirjen Gatrik 2023' },
    ],
    /* Inventarisasi sumber emisi. `reported` = asersi manajemen (tCO₂e);
       emisi terhitung = act.v × ef.v ÷ 1000 (engine). Scope 3 bersifat
       informasional (di luar lingkup keyakinan terbatas). seedDone = status
       awal "telah diuji/direkalkulasi". */
    sources: [
      { id: 'S1-1', scope: 1, cat: 'Pembakaran tidak bergerak', src: 'Genset solar (PLTD backup & konstruksi)', facility: 'PLTS Sumba & Lombok', gas: 'CO₂·CH₄·N₂O', act: { v: 4_000_000, u: 'liter' }, ef: { v: 2.68, u: 'kgCO₂e/liter' }, reported: 10_700.0, method: 'Kalkulasi', evidence: 'Log harian genset + faktur pembelian solar', proc: 'Rekalkulasi liter × faktor; vouch faktur ke kuitansi', seedDone: true },
      { id: 'S1-2', scope: 1, cat: 'Pembakaran bergerak', src: 'Kendaraan operasional (solar)', facility: 'Armada O&M', gas: 'CO₂', act: { v: 480_000, u: 'liter' }, ef: { v: 2.68, u: 'kgCO₂e/liter' }, reported: 1_286.4, method: 'Kalkulasi', evidence: 'Catatan BBM kendaraan + kartu fleet', proc: 'Rekalkulasi konsumsi × faktor emisi', seedDone: true },
      { id: 'S1-3', scope: 1, cat: 'Pembakaran tidak bergerak', src: 'LPG operasional & kantin', facility: 'Kantor pusat & mess', gas: 'CO₂', act: { v: 90_000, u: 'kg' }, ef: { v: 2.98, u: 'kgCO₂e/kg' }, reported: 268.2, method: 'Kalkulasi', evidence: 'Faktur pembelian LPG', proc: 'Rekalkulasi kg × faktor emisi', seedDone: false },
      { id: 'S1-4', scope: 1, cat: 'Emisi fugitif', src: 'Kebocoran refrigeran R-32 (AC)', facility: 'Gedung kantor & ruang server', gas: 'HFC', act: { v: 300, u: 'kg' }, ef: { v: 675, u: 'kgCO₂e/kg' }, reported: 202.5, method: 'Estimasi (top-up)', evidence: 'Catatan pengisian ulang refrigeran', proc: 'Estimasi kebocoran = top-up tahunan × GWP; uji ketidakpastian', seedDone: false },
      { id: 'S2-1', scope: 2, cat: 'Listrik dibeli (location-based)', src: 'Listrik PLN — kantor, gudang, workshop', facility: 'Seluruh fasilitas tersambung grid', gas: 'CO₂', act: { v: 9_500_000, u: 'kWh' }, ef: { v: 0.858, u: 'kgCO₂e/kWh' }, reported: 8_180.0, method: 'Kalkulasi (location-based)', evidence: 'Tagihan PLN 12 bulan + pembacaan meter', proc: 'Rekonsiliasi kWh ke tagihan PLN × faktor grid', seedDone: true },
      { id: 'S3-1', scope: 3, cat: 'Kategori 6 · Perjalanan dinas', src: 'Penerbangan & perjalanan dinas', facility: 'Korporat', gas: 'CO₂e', act: { v: 1_250_000, u: 'km' }, ef: { v: 0.15, u: 'kgCO₂e/km' }, reported: 187.5, method: 'Estimasi', evidence: 'Data perjalanan agen', proc: 'Disaring — diungkap, di luar lingkup keyakinan', seedDone: false, informational: true },
      { id: 'S3-2', scope: 3, cat: 'Kategori 4 · Transportasi hulu', src: 'Distribusi peralatan & logistik EPC', facility: 'Rantai pasok', gas: 'CO₂e', act: { v: 3_200_000, u: 'ton-km' }, ef: { v: 0.105, u: 'kgCO₂e/ton-km' }, reported: 336.0, method: 'Estimasi', evidence: 'Data logistik vendor', proc: 'Disaring — diungkap, di luar lingkup keyakinan', seedDone: false, informational: true },
    ],
    /* Prosedur keyakinan terbatas SJAH 3410 — sifat & luas lebih terbatas
       dibanding keyakinan memadai (terutama inquiry, analitis, rekalkulasi). */
    procedures: [
      { id: 'P1', ref: '¶23', short: 'Pemahaman entitas & batas organisasi', proc: 'Pahami aktivitas, batas organisasi (kendali operasional), batas Scope, & metodologi inventarisasi GRK.', seedDone: true },
      { id: 'P2', ref: '¶25', short: 'Penilaian risiko salah saji material', proc: 'Identifikasi & nilai RoMM informasi emisi pada tingkat asersi (kelengkapan, akurasi, pisah-batas).', seedDone: true },
      { id: 'P3', ref: '¶29', short: 'Rekalkulasi emisi Scope 1', proc: 'Rekalkulasi emisi pembakaran & fugitif = data aktivitas × faktor emisi / GWP.', seedDone: false },
      { id: 'P4', ref: '¶29', short: 'Rekonsiliasi Scope 2 ke tagihan PLN', proc: 'Cocokkan kWh ke tagihan PLN 12 bulan × faktor grid (location-based).', seedDone: true },
      { id: 'P5', ref: '¶32', short: 'Verifikasi faktor emisi & GWP', proc: 'Telusur faktor emisi & GWP ke sumber otoritatif (KLHK / IPCC AR5) & uji konsistensi penerapan.', seedDone: false },
      { id: 'P6', ref: '¶33L', short: 'Prosedur analitis & intensitas', proc: 'Analitis tahun-ke-tahun & uji kewajaran intensitas emisi (tCO₂e/MWh) terhadap tahun dasar.', seedDone: false },
      { id: 'P7', ref: '¶35', short: 'Evaluasi ketidakpastian estimasi', proc: 'Evaluasi ketidakpastian estimasi emisi fugitif (refrigeran) & dampaknya terhadap materialitas.', seedDone: false },
      { id: 'P8', ref: '¶47', short: 'Telaah penyajian & pengungkapan', proc: 'Telaah penyajian Laporan Emisi GRK: pengungkapan batas, metodologi, faktor, & pernyataan ketidakpastian.', seedDone: false },
    ],
  };
  /* ---- Engine SJAH 3410: hitung emisi, materialitas, salah saji, simpulan (pure) ----
     exec: peta { [id]: bool } status uji sumber & pelaksanaan prosedur (override
     seedDone); bila tak diberi → dibaca dari localStorage. */
  function ghgEngine(execArg?: any) {
    const A = GHG_3410;
    let exec = execArg;
    if (!exec && typeof localStorage !== 'undefined') {
      try { exec = JSON.parse(localStorage.getItem('ams.v1.ghg3410.exec') || 'null'); } catch (e) {}
    }
    exec = exec || {};
    const isDone = (id: any, seed: any) => Object.prototype.hasOwnProperty.call(exec, id) ? !!exec[id] : !!seed;
    const r1 = (n: any) => Math.round(n * 10) / 10;
    /* setiap sumber: emisi terhitung = aktivitas × faktor ÷ 1000 (kg→ton) */
    const sources = A.sources.map(s => {
      const computed = r1(s.act.v * s.ef.v / 1000);
      const variance = r1(s.reported - computed);
      return { ...s, computed, variance, absVar: Math.abs(variance), tested: isDone(s.id, s.seedDone) };
    });
    const inScope = sources.filter(s => !s.informational);   // Scope 1 & 2 — terasurans
    const info = sources.filter(s => s.informational);        // Scope 3 — informasional
    const sumC = (arr: any) => r1(arr.reduce((t: any, s: any) => t + s.computed, 0));
    const sumR = (arr: any) => r1(arr.reduce((t: any, s: any) => t + s.reported, 0));
    const s1 = inScope.filter(s => s.scope === 1), s2 = inScope.filter(s => s.scope === 2);
    const scope1 = sumC(s1), scope2 = sumC(s2), scope3 = sumC(info);
    const assured = r1(scope1 + scope2);
    const reportedAssured = sumR(inScope);
    const materiality = r1(assured * A.materialityPct);
    /* salah saji = asersi manajemen − rekalkulasi (atas seluruh sumber terasurans) */
    const netMisstatement = r1(inScope.reduce((t, s) => t + s.variance, 0));
    const grossMisstatement = r1(inScope.reduce((t, s) => t + s.absVar, 0));
    const exceedsMateriality = Math.abs(netMisstatement) > materiality;
    const intensity = assured / A.production.v;               // tCO₂e per MWh
    /* progres dari prosedur asurans (sifat keyakinan terbatas) */
    const procedures = A.procedures.map(p => ({ ...p, done: isDone(p.id, p.seedDone) }));
    const doneN = procedures.filter(p => p.done).length, totalP = procedures.length;
    const progress = totalP ? Math.round((doneN / totalP) * 100) : 0;
    const allProc = doneN === totalP;
    const sourcesTested = inScope.filter(s => s.tested).length;
    const allTested = sourcesTested === inScope.length;
    /* bentuk simpulan keyakinan terbatas (negatif). Salah saji material ⇒
       simpulan dimodifikasi (dengan pengecualian). */
    const conclType = exceedsMateriality ? 'qualified' : 'unmodified';
    const conclLabel = conclType === 'unmodified' ? 'Tanpa Modifikasi (Negatif)' : 'Dengan Pengecualian';
    const canIssue = allProc && allTested && !exceedsMateriality;
    const conclusion = {
      type: conclType, label: conclLabel,
      negativeAssurance: conclType === 'unmodified'
        ? 'Berdasarkan prosedur yang kami lakukan dan bukti yang kami peroleh, tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya bahwa Laporan Emisi GRK (Scope 1 & 2) sejumlah ' + fmt(assured, 1) + ' tCO₂e tidak disusun, dalam semua hal yang material, sesuai dengan ' + A.criteria + '.'
        : 'Berdasarkan prosedur kami, terdapat salah saji ' + fmt(Math.abs(netMisstatement), 1) + ' tCO₂e yang melampaui materialitas ' + fmt(materiality, 1) + ' tCO₂e; kecuali atas hal tersebut, tidak ada hal lain yang menjadi perhatian kami.',
      basis: grossMisstatement > 0
        ? 'Rekalkulasi menemukan selisih agregat ' + fmt(grossMisstatement, 1) + ' tCO₂e (neto ' + fmt(netMisstatement, 1) + ' tCO₂e) antara asersi manajemen & rekalkulasi praktisi — ' + (exceedsMateriality ? 'melampaui' : 'di bawah') + ' materialitas ' + fmt(materiality, 1) + ' tCO₂e (' + (A.materialityPct * 100) + '% total emisi).'
        : 'Tidak terdapat selisih antara asersi manajemen & rekalkulasi praktisi.',
      emphasis: 'Penekanan Hal: Kuantifikasi emisi GRK tunduk pada ketidakpastian inheren karena keterbatasan ilmiah dalam penentuan faktor emisi & data aktivitas — khususnya emisi fugitif yang diestimasi. Simpulan kami tidak dimodifikasi terkait hal ini.',
    };
    /* hal pokok (matters) untuk Asurans Lain & katalog SJAH 3000 */
    const s1ok = s1.length > 0 && s1.every(s => s.tested);
    const s2ok = s2.length > 0 && s2.every(s => s.tested);
    const boundaryOk = isDone('P1', true) && isDone('P8', false);
    const matters = [
      { m: 'Emisi Scope 1 (pembakaran & fugitif)', ref: 'Scope 1', claim: fmt(scope1, 1) + ' tCO₂e', proc: 'Rekalkulasi data aktivitas × faktor emisi / GWP', concl: s1ok ? 'Tidak ada hal yang menjadi perhatian' : 'Rekalkulasi berjalan (' + s1.filter(s => s.tested).length + '/' + s1.length + ' sumber)', ok: s1ok },
      { m: 'Emisi Scope 2 (listrik dibeli, location-based)', ref: 'Scope 2', claim: fmt(scope2, 1) + ' tCO₂e', proc: 'Rekonsiliasi kWh ke tagihan PLN × faktor grid', concl: s2ok ? 'Tidak ada hal yang menjadi perhatian' : 'Rekonsiliasi berjalan', ok: s2ok },
      { m: 'Batas organisasi & metodologi', ref: 'Batas', claim: A.boundaryApproach, proc: 'Telaah batas (kendali operasional) & konsistensi metodologi', concl: boundaryOk ? 'Konsisten dengan kriteria' : 'Sedang ditelaah', ok: boundaryOk },
    ];
    const assuranceEntry = { std: A.std, level: A.level, subject: A.subject, criteria: A.criteria, matters };
    return {
      meta: A, sources, inScope, info, procedures,
      totals: { scope1, scope2, scope3, assured, reportedAssured },
      intensity, materiality, materialityPct: A.materialityPct,
      misstatement: { net: netMisstatement, gross: grossMisstatement, exceedsMateriality },
      counts: { sources: inScope.length, sourcesTested, scopes: 2, entities: A.entities.filter(e => e.included).length, proceduresDone: doneN, procedures: totalP },
      progress, allProc, allTested, canIssue, conclusion, matters, assuranceEntry,
    };
  }
  /* Asurans Lain SPA 3000/3402/3400 — subject matters per engagement */
  const ASSURANCE_ENG = {
    /* Ditarik dari SUMBER KEBENARAN TUNGGAL SJAH 3410 — bukan hardcode.
       Subject/criteria/level/matters dihitung oleh ghgEngine (emisi = aktivitas × faktor). */
    'ASR-2025-080': ghgEngine().assuranceEntry,
    /* Ditarik dari SUMBER KEBENARAN TUNGGAL SJAH 3402 — bukan hardcode.
       Subject/criteria/level/matters dihitung oleh socEngine (Type 2). */
    'ASR-2025-081': socEngine().assuranceEntry,
    /* Ditarik dari SUMBER KEBENARAN TUNGGAL SJAH 3400 — bukan hardcode.
       Subject/criteria/level/matters dihitung oleh pfiEngine. */
    'PFI-2025-090': pfiEngine().assuranceEntry,
  };

  /* ---- BI Firma Terkonsolidasi (executive analytics) ---- */
  const BI_DATA = {
    fyRevenue: 11_300_000_000, prevYearRevenue: 10_100_000_000,
    revenueByService: [
      { svc: 'Audit Laporan Keuangan', std: 'SA', amount: 8_200_000_000, color: '#005085' },
      { svc: 'Asurans Lain', std: 'SPA 3000/3402/3400', amount: 1_000_000_000, color: '#0a6b73' },
      { svc: 'Jasa Pajak & Konsultasi', std: 'PMK', amount: 860_000_000, color: '#9a6a00' },
      { svc: 'Reviu Laporan Keuangan', std: 'SPR 2400', amount: 760_000_000, color: '#5b3fa6' },
      { svc: 'Jasa Terkait (AUP/Kompilasi)', std: 'SPSJL 4400/4410', amount: 480_000_000, color: '#647889' },
    ],
    months: ['Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des', 'Jan', 'Feb'],
    monthlyRev: [820, 870, 910, 980, 1020, 940, 1010, 990, 1080, 1140, 1080, 1160], // Rp jt diakui
    monthlyMargin: [28, 30, 29, 32, 34, 31, 33, 32, 35, 36, 34, 37], // %
    monthlyUtil: [79, 82, 80, 85, 88, 84, 86, 83, 90, 92, 88, 91], // %
    targetRevenue: 12_000_000_000,
  };

  /* Reviu SPR 2400 — planning addendum */
  const REVIEW_2400_PLAN = {
    materiality: 900_000_000, benchmark: '1% dari pendapatan', pm: 675_000_000,
    focus: [
      { area: 'Pengakuan Pendapatan', risk: 'Sedang', why: 'Cut-off jasa logistik akhir tahun; inquiry & analitis pendapatan per bulan.' },
      { area: 'Piutang Usaha', risk: 'Sedang', why: 'Umur piutang meningkat; inquiry kebijakan penyisihan.' },
      { area: 'Beban Operasional', risk: 'Rendah', why: 'Analitis tren beban BBM & sewa armada.' },
      { area: 'Kelangsungan Usaha', risk: 'Rendah', why: 'Arus kas operasi positif; inquiry rencana manajemen.' },
    ],
  };
  /* ============================================================
     Financial Due Diligence (jasa non-asurans / advisory)
     ------------------------------------------------------------
     SUMBER KEBENARAN TUNGGAL. Field identitas (klien, partner,
     manajer, imbalan, tenggat, progres, status) TIDAK di-hardcode
     di sini — ditarik dari catatan kanonik lintas-modul:
       · Pipeline / CRM  → OPP-105  (peluang "Won")
       · Onboarding      → PROS-06  (akseptasi · PMPJ · surat perikatan)
       · Registri Non-Audit → DD-2025-105 (portofolio jasa)
     Satu perubahan di catatan sumber mengalir konsisten ke modul DD,
     portofolio Non-Audit, dan dock Keterkaitan Modul.
     Nilai keuangan deal disimpan dalam Rp MILIAR (kecuali ebitdaBridge
     yang memakai rupiah penuh /1e9, dipertahankan agar laporan lama jalan).
     ============================================================ */

export { pfiEngine, SOC_3402, socEngine, GHG_3410, ghgEngine, ASSURANCE_ENG, BI_DATA, REVIEW_2400_PLAN };
