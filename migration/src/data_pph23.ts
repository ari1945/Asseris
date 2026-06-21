/* [codemod] ESM imports */
import { AMS } from './data';
import { BO as BO_NS } from './data_backoffice';

/* ============================================================
   Asseris — PPh Pasal 23 Firma: lapisan kanonik (SSOT)
   ------------------------------------------------------------
   Modul "Pajak PPh 23" TIDAK menyimpan angka ganda. Register
   pemotongan diturunkan dari transaksi sumber (pembayaran jasa
   ke vendor) yang MENUNJUK ke master vendor & faktur AP:

     · Lawan transaksi & NPWP   ← BO.VENDORS  (master vendor — SSOT counterparty)
     · Faktur/komitmen jasa     ← FIRM_AP / PURCHASE_ORDERS (Pengadaan)
     · Pos kontrol Utang Pajak  ← FIRM_COA 2-200 (General Ledger)
     · Agregat PPh Pot/Put      ← dibaca balik oleh modul Pajak Firma (firmtax)

   PRINSIP: satu transaksi pemotongan = satu Bukti Potong Unifikasi.
   Sejak 2025 administrasi pindah ke CORETAX DJP — bukti potong
   diterbitkan sebagai Bukti Potong Unifikasi pada Coretax (mengganti
   e-Bupot Unifikasi lama). Identitas lawan transaksi memakai NPWP 16
   digit; bagi Orang Pribadi (OP), NIK berfungsi sebagai NPWP. Tarif &
   identitas dievaluasi dari master — perubahan di master vendor
   otomatis mengalir ke register, SPT Masa Unifikasi, GL & Pajak Firma.
   Tanpa NPWP/NIK valid → tarif 100% lebih tinggi (UU PPh Ps. 23(1a)).
   ============================================================ */
(function () {
  const A = (): any => AMS || {};
  const BO = (): any => BO_NS || {};
  const R = Math.round;
  const REFDATE = new Date('2026-03-09');

  /* ---------- Katalog objek pajak PPh 23 → tarif & rujukan ---------- */
  const OBJECTS = {
    'Jasa teknik':                         { rate: 2, kind: 'jasa', art: 'Ps. 23(1c) · jasa teknik' },
    'Jasa manajemen':                      { rate: 2, kind: 'jasa', art: 'Ps. 23(1c) · jasa manajemen' },
    'Jasa konsultan':                      { rate: 2, kind: 'jasa', art: 'Ps. 23(1c) · jasa konsultan' },
    'Jasa hukum':                          { rate: 2, kind: 'jasa', art: 'PMK 141 · jasa hukum' },
    'Jasa penilai (KJPP)':                 { rate: 2, kind: 'jasa', art: 'PMK 141 · jasa penilai' },
    'Jasa perawatan/pemeliharaan':         { rate: 2, kind: 'jasa', art: 'PMK 141 · jasa pemeliharaan' },
    'Jasa kebersihan & keamanan':          { rate: 2, kind: 'jasa', art: 'PMK 141 · jasa lain' },
    'Jasa periklanan & desain':            { rate: 2, kind: 'jasa', art: 'PMK 141 · jasa lain' },
    'Jasa katering & boga':                { rate: 2, kind: 'jasa', art: 'PMK 141 · jasa katering' },
    'Jasa angkutan & ekspedisi':           { rate: 2, kind: 'jasa', art: 'PMK 141 · jasa freight' },
    'Sewa harta (selain tanah/bangunan)':  { rate: 2, kind: 'sewa', art: 'Ps. 23(1c) · sewa harta' },
    'Dividen (WP badan)':                  { rate: 15, kind: 'modal', art: 'Ps. 23(1a) · dividen' },
    'Bunga / imbalan pinjaman':            { rate: 15, kind: 'modal', art: 'Ps. 23(1a) · bunga' },
    'Royalti':                             { rate: 15, kind: 'modal', art: 'Ps. 23(1a) · royalti' },
    'Hadiah & penghargaan':                { rate: 15, kind: 'modal', art: 'Ps. 23(1a) · hadiah' },
  };

  /* ---------- Transaksi sumber pemotongan (bukti potong) ----------
     vendorId MENUNJUK ke master BO.VENDORS (NPWP & kategori ditarik dari sana).
     party/npwp hanya untuk lawan transaksi non-master (di luar registri vendor).
     apId / poId menaut ke faktur/komitmen di AP & Pengadaan. */
  const TX = [
    /* ----- Masa Januari 2026 — telah disetor & dilaporkan ----- */
    { id: '1.2-01.26-0004411', masa: '2026-01', tgl: '2026-01-22', vendorId: 'V-018', obj: 'Jasa teknik', dpp: 54_000_000, status: 'Lapor', ntpn: '0312A1...77F', desc: 'Implementasi & dukungan platform cloud' },
    { id: '1.2-01.26-0004412', masa: '2026-01', tgl: '2026-01-25', vendorId: 'V-029', obj: 'Royalti', dpp: 280_000_000, status: 'Lapor', ntpn: '0312A1...80C', poId: 'PO-2026-051', desc: 'Lisensi & royalti CaseWare IDEA (35 seat)' },
    { id: '1.2-01.26-0004413', masa: '2026-01', tgl: '2026-01-28', vendorId: 'V-044', obj: 'Jasa konsultan', dpp: 96_000_000, status: 'Lapor', ntpn: '0312A1...91B', desc: 'Riset benchmark industri klien audit' },
    { id: '1.2-01.26-0004414', masa: '2026-01', tgl: '2026-01-30', party: 'PT Logistik Andalan', npwp: '02.337.881.4-016', obj: 'Jasa angkutan & ekspedisi', dpp: 180_000_000, status: 'Lapor', ntpn: '0312A1...95D', desc: 'Ekspedisi & pengiriman arsip antar-cabang' },

    /* ----- Masa Februari 2026 — disetor; SPT Masa proses ----- */
    { id: '1.2-02.26-0004520', masa: '2026-02', tgl: '2026-02-18', vendorId: 'V-046', obj: 'Jasa perawatan/pemeliharaan', dpp: 67_800_000, status: 'Disetor', ntpn: '0312B2...11A', desc: 'Pemeliharaan perangkat & jaringan kantor' },
    { id: '1.2-02.26-0004521', masa: '2026-02', tgl: '2026-02-20', vendorId: 'V-037', obj: 'Jasa kebersihan & keamanan', dpp: 39_000_000, status: 'Disetor', ntpn: '0312B2...18C', desc: 'Keamanan & pemusnahan arsip terjadwal' },
    { id: '1.2-02.26-0004522', masa: '2026-02', tgl: '2026-02-24', vendorId: 'V-041', obj: 'Jasa katering & boga', dpp: 22_000_000, status: 'Disetor', ntpn: '0312B2...26E', desc: 'Konsumsi pelatihan internal & rapat mutu' },
    { id: '1.2-02.26-0004523', masa: '2026-02', tgl: '2026-02-26', party: 'CV Cipta Kreatif Media', npwp: null, obj: 'Jasa periklanan & desain', dpp: 95_000_000, status: 'Disetor', ntpn: '0312B2...33F', apId: 'AP-0040', desc: 'Kampanye employer branding & materi promosi' },
    { id: '1.2-02.26-0004524', masa: '2026-02', tgl: '2026-02-27', party: 'KJPP Surya Nilai & Rekan', npwp: '01.889.450.2-024', obj: 'Jasa penilai (KJPP)', dpp: 85_000_000, status: 'Terutang', desc: 'Penilaian aset tetap kantor (revaluasi)' },

    /* ----- Masa Maret 2026 — masa berjalan (terutang / draft) ----- */
    { id: '1.2-03.26-0004610', masa: '2026-03', tgl: '2026-03-04', vendorId: 'V-044', obj: 'Jasa konsultan', dpp: 48_000_000, status: 'Terutang', desc: 'Pembaruan database riset pasar Q1' },
    { id: '1.2-03.26-0004611', masa: '2026-03', tgl: '2026-03-06', vendorId: 'V-018', obj: 'Jasa teknik', dpp: 32_000_000, status: 'Terutang', desc: 'Konfigurasi e-signature & integrasi DMS' },
    { id: '1.2-03.26-0004612', masa: '2026-03', tgl: '2026-03-08', party: 'PT Royalti Merek Nusantara', npwp: '02.551.732.9-041', obj: 'Royalti', dpp: 120_000_000, status: 'Draft', desc: 'Royalti penggunaan merek & metodologi' },
    { id: '1.2-03.26-0004613', masa: '2026-03', tgl: '2026-03-09', party: 'Konsultan Hukum Sutanto & Partners', npwp: null, obj: 'Jasa hukum', dpp: 150_000_000, status: 'Terutang', desc: 'Pendampingan hukum sengketa kontrak vendor' },
    { id: '1.2-03.26-0004614', masa: '2026-03', tgl: '2026-03-09', vendorId: 'V-046', obj: 'Jasa perawatan/pemeliharaan', dpp: 18_000_000, status: 'Draft', desc: 'Servis insidental perangkat audit lapangan' },
    { id: '1.2-03.26-0004615', masa: '2026-03', tgl: '2026-03-09', party: 'Andi Wijaya, S.H. (konsultan OP)', npwp: '3174052608800003', obj: 'Jasa hukum', dpp: 40_000_000, status: 'Terutang', desc: 'Konsultan hukum perorangan — NIK berfungsi sebagai NPWP OP (Coretax DJP 2025)' },
  ];

  /* objek yang BUKAN PPh 23 — ditampilkan sebagai pengecualian (edukasi & kontrol) */
  const EXCLUSIONS = [
    { party: 'PT Sewa Gedung Sentral Plaza', vendorId: 'V-024', obj: 'Sewa kantor (tanah & bangunan)', why: 'PPh Pasal 4(2) final 10% — bukan objek PPh 23', module: 'firmtax' },
    { party: 'PT Travel Korpora Indonesia', vendorId: 'V-033', obj: 'Tiket & akomodasi dinas', why: 'Penyerahan/penggantian biaya — di luar objek PPh 23', module: 'travel' },
    { party: 'PT Listrik & Utilitas (PLN)', obj: 'Listrik & utilitas', why: 'Dikecualikan dari pemotongan PPh 23', module: 'firmfinance' },
    { party: 'PT Properti Graha Kantor', obj: 'Sewa ruang (final)', why: 'PPh Pasal 4(2) final — dipotong di modul Pajak Firma', module: 'firmtax' },
  ];

  const MASA_LABEL = { '2026-01': 'Januari 2026', '2026-02': 'Februari 2026', '2026-03': 'Maret 2026' };
  const STATUS_ORDER = { 'Draft': 0, 'Terutang': 1, 'Disetor': 2, 'Lapor': 3 };

  /* ---------- resolusi lawan transaksi (master vendor → NPWP/NIK) ----------
     Coretax (2025): NPWP 16 digit; bagi Orang Pribadi NIK = NPWP. Digit
     identitas tanpa pemisah: 16 → NIK/NPWP-OP, 15 → NPWP badan (format lama). */
  const idDigits = (s) => String(s || '').replace(/[.\-\s]/g, '');
  const idKind = (s) => { if (!s) return null; return idDigits(s).length >= 16 ? 'NIK' : 'NPWP'; };
  const fmtNik = (s) => { const d = idDigits(s); return d.length === 16 ? d.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4') : s; };
  function resolveParty(t) {
    const v = t.vendorId ? (BO().VENDORS || []).find(x => x.id === t.vendorId) : null;
    const npwp = v ? v.npwp : (t.npwp || null);
    const idType = idKind(npwp);                          // 'NIK' (OP) | 'NPWP' (badan) | null
    return {
      name: v ? v.name : (t.party || '—'),
      npwp: idType === 'NIK' ? fmtNik(npwp) : npwp,
      npwpRaw: npwp, idType, isOP: idType === 'NIK',
      vendorId: t.vendorId || null, master: !!v,
      cat: v ? v.cat : (t.cat || (idType === 'NIK' ? 'Orang Pribadi' : 'Non-master')),
      hasNpwp: !!npwp,                                    // NIK valid dihitung sebagai ber-NPWP
    };
  }

  /* ---------- register pemotongan (turunan) ----------
     opts = { extra: [...], ov: { <id>: <statusBaru> } }
     ov = override status interaktif (mis. Terutang → Disetor) yang
     mengalir konsisten ke seluruh turunan (SPT Masa, GL, agregat). */
  function register(opts) {
    const { extra = [], ov = {} } = (opts || {});
    const all = extra.length ? [...TX, ...extra] : TX;
    return all.map(t => {
      const obj = OBJECTS[t.obj] || { rate: 2, kind: 'jasa', art: '—' };
      const p = resolveParty(t);
      const status = ov[t.id] || t.status;
      const surcharge = !p.hasNpwp;                 // tanpa NPWP → 100% lebih tinggi
      const effRate = obj.rate * (surcharge ? 2 : 1);
      const pphNormal = R(t.dpp * obj.rate / 100);
      const pph = R(t.dpp * effRate / 100);
      return {
        ...t, ...p, status, rate: obj.rate, effRate, kind: obj.kind, art: obj.art,
        pph, pphNormal, surcharge, extraCost: pph - pphNormal,
        masaLabel: MASA_LABEL[t.masa] || t.masa,
        deposited: status === 'Disetor' || status === 'Lapor',
        bupotIssued: status !== 'Draft',
      };
    }).sort((a, b) => (b.masa.localeCompare(a.masa)) || (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || (b.pph - a.pph));
  }

  /* ---------- ringkas KPI (turunan) ---------- */
  function summary(opts) {
    const rows = register(opts);
    const totalDpp = rows.reduce((s, r) => s + r.dpp, 0);
    const totalPph = rows.reduce((s, r) => s + r.pph, 0);
    const disetor = rows.filter(r => r.deposited).reduce((s, r) => s + r.pph, 0);
    const terutang = totalPph - disetor;
    const noBupot = rows.filter(r => !r.bupotIssued).length;
    const noNpwp = rows.filter(r => r.surcharge);
    const extraCost = noNpwp.reduce((s, r) => s + r.extraCost, 0);
    const opCount = rows.filter(r => r.isOP).length;
    return { rows, totalDpp, totalPph, disetor, terutang, noBupot,
      noNpwpCount: noNpwp.length, extraCost, opCount, count: rows.length };
  }

  /* ---------- rekap per Masa Pajak (SPT Masa Unifikasi) ---------- */
  function byMasa(opts) {
    const rows = register(opts);
    const masas = [...new Set(rows.map(r => r.masa))].sort();
    return masas.map(m => {
      const rs = rows.filter(r => r.masa === m);
      const [y, mo] = m.split('-').map(Number);
      const next = new Date(y, mo, 1);                       // bulan berikutnya
      const setor = new Date(y, mo, 10);                     // jatuh tempo setor: tgl 10
      const lapor = new Date(y, mo, 20);                     // jatuh tempo lapor: tgl 20
      const allFiled = rs.every(r => r.status === 'Lapor');
      const allDeposited = rs.every(r => r.deposited);
      const status = allFiled ? 'Lapor' : allDeposited ? 'Siap Lapor' : 'Belum Lapor';
      return {
        masa: m, label: MASA_LABEL[m] || m, count: rs.length, rows: rs,
        dpp: rs.reduce((s, r) => s + r.dpp, 0),
        pph: rs.reduce((s, r) => s + r.pph, 0),
        disetor: rs.filter(r => r.deposited).reduce((s, r) => s + r.pph, 0),
        setorDue: setor.toISOString().slice(0, 10),
        laporDue: lapor.toISOString().slice(0, 10),
        setorDays: Math.round((setor.getTime() - REFDATE.getTime()) / 864e5),
        laporDays: Math.round((lapor.getTime() - REFDATE.getTime()) / 864e5),
        status,
      };
    });
  }

  /* ---------- per lawan transaksi (tutup ke master vendor) ---------- */
  function byCounterparty(opts) {
    const rows = register(opts);
    const m = {};
    rows.forEach(r => {
      const key = r.vendorId || r.name;
      const g = (m[key] = m[key] || { key, name: r.name, vendorId: r.vendorId, master: r.master, npwp: r.npwp, hasNpwp: r.hasNpwp, isOP: r.isOP, cat: r.cat, dpp: 0, pph: 0, n: 0, objs: new Set() });
      g.dpp += r.dpp; g.pph += r.pph; g.n += 1; g.objs.add(r.obj);
    });
    return Object.values(m).map((g: any) => ({ ...g, objs: [...g.objs] })).sort((a: any, b: any) => b.pph - a.pph);
  }

  /* ---------- tie-out ke pos kontrol GL 2-200 Utang Pajak ---------- */
  function glTieOut(opts) {
    const s = summary(opts);
    const coa = A().FIRM_COA || [];
    const ctl = coa.find(a => a.code === '2-200') || { bal: -940_000_000, name: 'Utang Pajak' };
    const control = -ctl.bal;                                // saldo kredit → positif
    const pph23Terutang = s.terutang;                        // komponen PPh 23 belum disetor
    const lainnya = control - pph23Terutang;                 // PPh 21, PPh 4(2) & PPN — modul terkait
    return {
      control, glCode: '2-200', glName: ctl.name,
      pph23Terutang, lainnya,
      tied: pph23Terutang <= control,
      pct: control ? pph23Terutang / control : 0,
    };
  }

  /* ---------- provenance tiap figur (panel lineage) ---------- */
  function provenance(opts) {
    const s = summary(opts);
    const master = register(opts).filter(r => r.master).length;
    return [
      { label: 'Lawan transaksi & NPWP', value: master + ' dari ' + s.count + ' tertaut master', owner: 'procurement', ownerLabel: 'Pengadaan & Vendor', source: 'BO.VENDORS · master vendor (NPWP, kategori)', tied: true },
      { label: 'DPP jasa kena potong', value: s.totalDpp, money: true, owner: 'apar', ownerLabel: 'AP / AR Firma', source: 'FIRM_AP / PURCHASE_ORDERS · faktur jasa vendor', tied: true },
      { label: 'PPh 23 dipotong (YTD)', value: s.totalPph, money: true, owner: 'tax', ownerLabel: 'Pajak PPh 23', source: 'DPP × tarif objek (register kanonik)', tied: true },
      { label: 'PPh 23 terutang', value: s.terutang, money: true, owner: 'firmgl', ownerLabel: 'General Ledger', source: 'FIRM_COA 2-200 · pos kontrol Utang Pajak', tied: true },
      { label: 'Agregat PPh Pot/Put', value: s.totalPph, money: true, owner: 'firmtax', ownerLabel: 'Pajak Firma', source: 'Dibaca balik → baris PPh 23 di SPT Masa', tied: true },
    ];
  }

  window.TAX23 = {
    REFDATE, OBJECTS, EXCLUSIONS, MASA_LABEL, STATUS_ORDER,
    register, summary, byMasa, byCounterparty, glTieOut, provenance,
    objRate: (o) => (OBJECTS[o] || { rate: 2 }).rate,
  };
})();


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const TAX23 = window.TAX23;
