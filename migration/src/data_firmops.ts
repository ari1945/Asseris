/* [codemod] ESM imports */
import { BO } from './data_backoffice';
import { LEGAL } from './data_legal';

/* ============================================================
   Asseris — Operasi Firma (Backoffice): lapisan kanonik
   ------------------------------------------------------------
   Cockpit "Operasi Firma" TIDAK menyimpan angka sendiri. Seluruh
   metrik diturunkan (derived) dari sub-ledger pemiliknya di BO
   dan dari registri kontrak SSOT (LEGAL):
     · Vendor & belanja      ← BO.VENDORS / BO.SPEND_BY_CAT  (master vendor)
     · Aset & penyusutan     ← BO.FIXED_ASSETS               (PSAK 16 sub-ledger)
     · Lisensi software      ← BO.SOFTWARE_LICENSES
     · Polis & premi         ← BO.POLICIES
     · Keanggotaan & izin    ← BO.MEMBERSHIPS / BO.FIRM_LICENSES / BO.AP_LICENSES
     · Perjalanan            ← BO.TRIPS / BO.TRAVEL_TREND
     · Arsip & legal hold    ← BO.ARCHIVES / BO.LEGAL_HOLDS
     · Kontrak               ← LEGAL.buildRegister(firm)

   Prinsip: satu vendor = satu master; tiap biaya operasi menunjuk ke
   sub-ledger sumbernya; satu kalender kewajiban menarik tenggat dari
   semua modul. Rekonsiliasi membuktikan sub-ledger menutup ke kontrol.
   ============================================================ */
(function () {
  const sum = (arr: any, f: any) => arr.reduce((s: any, x: any) => s + f(x), 0);

  /* metadata sub-modul backoffice — untuk kartu kesehatan & navigasi */
  const SUBMODULES = [
    { id: 'procurement', label: 'Pengadaan & Vendor',     icon: 'cart',     c: '#005085' },
    { id: 'facilities',  label: 'Aset & Fasilitas',       icon: 'building', c: '#0a6b73' },
    { id: 'records',     label: 'Retensi & Arsip',        icon: 'archive',  c: '#2f7bb0' },
    { id: 'legal',       label: 'Kontrak & Legal',        icon: 'gavel',    c: '#5b3fa6' },
    { id: 'insurance',   label: 'Asuransi & Risiko',      icon: 'umbrella', c: '#9a6a00' },
    { id: 'travel',      label: 'Perjalanan & Reimburse', icon: 'plane',    c: '#1f7a4d' },
    { id: 'licensing',   label: 'Lisensi & Perizinan',    icon: 'key',      c: '#b3261e' },
  ];

  /* ---------- penyusutan tahunan aset tetap (PSAK 16, garis lurus) ----------
     run-rate = Σ (harga perolehan / umur manfaat) untuk aset yang masih dipakai. */
  function annualDepreciation() {
    return Math.round(sum(BO.FIXED_ASSETS.filter((a: any) => a.nbv > 0), (a: any) => a.cost / a.life));
  }

  /* ---------- komposisi biaya operasi backoffice (run-rate, sumber sub-ledger) ----------
     Tiap baris: sumber modul + klasifikasi P&L (Overhead/Direct) + dasar (tahunan/YTD). */
  function operatingCosts() {
    const lease = BO.VENDORS.find((v: any) => v.cat === 'Sewa & Fasilitas');
    const auditLic = BO.SOFTWARE_LICENSES.filter((l: any) => /IDEA|TeamMate/.test(l.name));
    const genLic = BO.SOFTWARE_LICENSES.filter((l: any) => !/IDEA|TeamMate/.test(l.name));
    const rows = [
      { key: 'sewa', label: 'Sewa kantor (3 lantai)', amount: lease ? lease.ytd : 0, basis: 'tahunan', cls: 'Overhead', module: 'facilities', src: 'Vendor V-024 · kontrak sewa', detail: 'Kontrak tahunan; nilai = master vendor (= Legal OPS-LEASE).' },
      { key: 'depr', label: 'Penyusutan aset tetap', amount: annualDepreciation(), basis: 'tahunan', cls: 'Overhead', module: 'facilities', src: 'Register Aset (PSAK 16)', detail: 'Σ harga perolehan ÷ umur manfaat (garis lurus).' },
      { key: 'genlic', label: 'Lisensi & langganan umum', amount: sum(genLic, (l: any) => l.cost), basis: 'tahunan', cls: 'Overhead', module: 'facilities', src: 'Lisensi Software (M365, Adobe, DMS)', detail: 'Perangkat produktivitas & DMS firma.' },
      { key: 'insurance', label: 'Premi asuransi firma', amount: sum(BO.POLICIES, (p: any) => p.premi), basis: 'tahunan', cls: 'Overhead', module: 'insurance', src: 'Polis PII, D&O, Cyber, Property', detail: 'Σ premi tahunan seluruh polis (= Legal OPS-POL).' },
      { key: 'member', label: 'Keanggotaan & afiliasi profesi', amount: sum(BO.MEMBERSHIPS, (m: any) => m.iuran), basis: 'tahunan', cls: 'Overhead', module: 'licensing', src: 'IAPI, IAI, Jaringan Global, Kadin', detail: 'Iuran tahunan keanggotaan wajib & afiliasi.' },
      { key: 'genspend', label: 'Operasional umum (cetak, riset, konsumsi, keamanan arsip)', amount: sum(BO.VENDORS.filter((v: any) => ['Percetakan & ATK', 'Riset & Database', 'Konsumsi & Acara', 'Keamanan & Pemusnahan Arsip', 'Pemeliharaan TI'].includes(v.cat)), (v: any) => v.ytd), basis: 'YTD', cls: 'Overhead', module: 'procurement', src: 'Belanja vendor (master)', detail: 'Belanja YTD kategori umum dari master vendor.' },
      { key: 'auditlic', label: 'Lisensi alat audit (CaseWare, TeamMate)', amount: sum(auditLic, (l: any) => l.cost), basis: 'tahunan', cls: 'Direct', module: 'facilities', src: 'Lisensi Software audit', detail: 'Alat pengiriman jasa — beban langsung perikatan.' },
      { key: 'travel', label: 'Perjalanan dinas', amount: sum(BO.TRAVEL_TREND, (t: any) => t.v) * 1e6, basis: 'YTD', cls: 'Direct', module: 'travel', src: 'Tren biaya perjalanan (6 bln)', detail: 'Biaya fieldwork — beban langsung perikatan.' },
    ];
    const overheadAnnual = sum(rows.filter(r => r.cls === 'Overhead' && r.basis === 'tahunan'), (r: any) => r.amount);
    const overheadYtd = sum(rows.filter(r => r.cls === 'Overhead'), (r: any) => r.amount);
    const directTotal = sum(rows.filter(r => r.cls === 'Direct'), (r: any) => r.amount);
    const total = sum(rows, (r: any) => r.amount);
    return { rows, overheadAnnual, overheadYtd, directTotal, total };
  }

  /* ---------- rekonsiliasi belanja: kategori P&L ↔ master vendor ----------
     Membuktikan SPEND_BY_CAT menutup ke Σ vendor.ytd per kategori. */
  function spendReconciliation() {
    const byCat = {};
    BO.VENDORS.forEach((v: any) => { (byCat as any)[v.cat] = ((byCat as any)[v.cat] || 0) + v.ytd; });
    // peta kategori belanja (P&L) → kategori vendor (master)
    const map = {
      'Lisensi Software Audit': ['Lisensi Software Audit'],
      'Sewa & Fasilitas': ['Sewa & Fasilitas'],
      'TI & SaaS': ['TI & SaaS'],
      'Perjalanan Dinas': ['Perjalanan Dinas'],
      'Riset & Database': ['Riset & Database'],
      'Percetakan & ATK': ['Percetakan & ATK'],
      'Lainnya': ['Keamanan & Pemusnahan Arsip', 'Konsumsi & Acara', 'Pemeliharaan TI'],
    };
    return BO.SPEND_BY_CAT.map((s: any) => {
      const cats = (map as any)[s.cat] || [s.cat];
      const master = cats.reduce((a: any, c: any) => a + ((byCat as any)[c] || 0), 0);
      return { cat: s.cat, recorded: s.v, master, ok: master === s.v, color: s.c, cats };
    });
  }

  /* ---------- konsumsi vendor lintas-modul (vendor master = sumber tunggal) ----------
     Modul mana yang "memakai" tiap vendor — bukti tak ada duplikasi data vendor. */
  const VENDOR_CONSUMERS = {
    'V-024': [{ m: 'facilities', why: 'Sewa kantor 3 lantai' }, { m: 'legal', why: 'Kontrak sewa OPS-LEASE' }],
    'V-029': [{ m: 'facilities', why: 'Lisensi CaseWare IDEA' }, { m: 'legal', why: 'Kontrak lisensi' }, { m: 'procurement', why: 'PO-2026-051' }],
    'V-018': [{ m: 'facilities', why: 'M365, Adobe, DMS & e-sign' }, { m: 'records', why: 'Hosting & maint NAS arsip' }, { m: 'procurement', why: 'PO-2026-052' }],
    'V-033': [{ m: 'travel', why: 'Tiket & akomodasi fieldwork' }, { m: 'legal', why: 'MoU layanan OPS-MOU' }],
    'V-037': [{ m: 'records', why: 'Pemusnahan arsip retensi' }, { m: 'procurement', why: 'PO-2026-054' }],
    'V-021': [{ m: 'procurement', why: 'Cetak laporan & kop surat' }],
    'V-044': [{ m: 'procurement', why: 'Database benchmark industri' }],
    'V-041': [{ m: 'procurement', why: 'Konsumsi & acara firma' }],
    'V-046': [{ m: 'legal', why: 'Sengketa wanprestasi LIT-01' }, { m: 'procurement', why: 'Diblokir — gagal PMPJ pajak' }],
  };

  /* ---------- kalender kewajiban terpadu (agregasi tenggat semua sub-modul) ----------
     SATU kalender menarik tenggat dari Procurement, Facilities, Records, Insurance,
     Travel, Licensing & Legal. firm dipakai untuk registri kontrak (SSOT). */
  function unifiedObligations(firm: any) {
    const out: any[] = [];
    const push = (o: any) => { if (o.due) out.push({ ...o, days: BO.daysTo(o.due) }); };

    BO.PURCHASE_ORDERS.filter((p: any) => p.status === 'Menunggu Approval').forEach((p: any) =>
      push({ module: 'procurement', kind: 'Approval PO', label: p.desc, ref: p.id, due: p.need, amount: p.amount, owner: p.appr }));
    BO.MAINTENANCE.forEach((m: any) =>
      push({ module: 'facilities', kind: m.type.includes('K3') ? 'Inspeksi K3' : 'Pemeliharaan', label: m.asset, ref: m.id, due: m.due, amount: m.cost, owner: m.vendor }));
    BO.SOFTWARE_LICENSES.forEach((l: any) =>
      push({ module: 'facilities', kind: 'Lisensi software', label: l.name, ref: l.vendor, due: l.exp, amount: l.cost, owner: 'TI & Operasi' }));
    /* Arsip jatuh tempo — DITARIK dari lapisan kanonik Retensi (SSOT).
       Kotak arsip dirakit dari dokumen DMS; tenggat = retensi habis. */
    if (window.RETENTION) {
      window.RETENTION.disposalObligations().forEach((o: any) => push(o));
    } else {
      BO.ARCHIVES.filter((a: any) => a.status === 'Jatuh Tempo').forEach((a: any) =>
        push({ module: 'records', kind: 'Pemusnahan arsip', label: a.eng, ref: a.id, due: a.musnah, amount: 0, owner: 'Kepala Mutu' }));
    }
    BO.POLICIES.forEach((p: any) =>
      push({ module: 'insurance', kind: 'Perpanjangan polis', label: p.jenis, ref: p.id, due: p.akhir, amount: p.premi, owner: 'Risk & Legal' }));
    BO.FIRM_LICENSES.filter((l: any) => l.exp).forEach((l: any) =>
      push({ module: 'licensing', kind: 'Izin firma', label: l.nama, ref: l.no, due: l.exp, amount: 0, owner: l.otoritas }));
    BO.AP_LICENSES.forEach((a: any) =>
      push({ module: 'licensing', kind: 'Izin Akuntan Publik', label: a.ap, ref: a.izin, due: a.exp, amount: 0, owner: a.ppl < a.pplReq ? 'PPL kurang ' + (a.pplReq - a.ppl) + ' SKP' : 'PPL tercapai' }));
    BO.MEMBERSHIPS.forEach((m: any) =>
      push({ module: 'licensing', kind: 'Keanggotaan profesi', label: m.nama, ref: m.tipe, due: m.exp, amount: m.iuran, owner: 'Sekretariat Firma' }));
    BO.TRIPS.filter((t: any) => t.status === 'Menunggu Approval').forEach((t: any) =>
      push({ module: 'travel', kind: 'Approval perjalanan', label: t.tujuan, ref: t.id, due: t.tgl, amount: t.est, owner: t.appr }));

    // kontrak (registri SSOT) — perpanjangan
    if (LEGAL && firm) {
      LEGAL.buildRegister(firm).filter(c => c.end && c.category !== 'Lisensi' && c.category !== 'Asuransi').forEach(c =>
        push({ module: 'legal', kind: 'Perpanjangan kontrak', label: c.party + ' · ' + c.type.replace(/ —.*/, ''), ref: c.id, due: c.end, amount: c.value, owner: c.owner }));
    }

    out.sort((a, b) => a.days - b.days);
    return out;
  }

  const sev = (d: any) => d < 0 ? 'lewat' : d < 30 ? 'kritis' : d < 90 ? 'segera' : 'pantau';
  const SEV_COLOR = { lewat: 'var(--red)', kritis: 'var(--red)', segera: 'var(--amber)', pantau: 'var(--green)' };

  window.FIRMOPS = {
    SUBMODULES, VENDOR_CONSUMERS, SEV_COLOR, sev, sum,
    annualDepreciation, operatingCosts, spendReconciliation, unifiedObligations,
  };
})();


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const FIRMOPS = window.FIRMOPS;
