/* ============================================================
   Asseris — Forensic & Journal canonical source (SSOT)
   ------------------------------------------------------------
   SATU populasi jurnal buku besar dipakai bersama oleh:
     · Journal Entry Testing (SA 240 / JET)   — window.JournalEntryTesting
     · Forensic Cash Flow (analitik anomali)  — window.ForensicCashFlow
   Angka arus kas TIDAK di-hardcode: waterfall & jembatan arus kas
   bruto diturunkan dari FSGEN.buildModel(wtb) — mesin derivasi LK
   yang sama dipakai FS Generator & PSAK 2. Satu perubahan AJE
   mengalir serempak ke seluruh modul ini.

   Kerangka acuan transaksi pihak berelasi mengikuti registri
   kanonik SA 550 / PSAK 7 (window.RP_PARTIES / RP_TXN) bila tersedia.
   Semua nilai dalam Rupiah penuh.
   ============================================================ */
import type { WTB, WtbRow, FsModel } from './canon_types';

interface JournalEntry {
  id: string; date: string; time: string; user: string; amount: number;
  dr: string; cr: string; flags?: string[];
  cash?: boolean; dir?: string; act?: string; code?: string;
  party?: string; forensic?: string[]; rpId?: string; note?: string;
}

const AMS_FORENSIC = (function () {
  'use strict';

  /* ---- Kriteria risiko jurnal (SA 240 ¶32) — dipakai bersama JET ---- */
  const JET_CRITERIA = [
    { id: 'round',     label: 'Nilai bulat besar (round-dollar)', on: true },
    { id: 'weekend',   label: 'Diposting akhir pekan / hari libur', on: true },
    { id: 'afterhrs',  label: 'Diposting di luar jam kerja', on: true },
    { id: 'periodend', label: 'Jurnal manual dekat tutup buku', on: true },
    { id: 'unusual',   label: 'Kombinasi akun tidak lazim', on: true },
    { id: 'threshold', label: 'Tepat di bawah ambang otorisasi', on: false },
    { id: 'rareuser',  label: 'Diinput oleh user jarang menjurnal', on: false },
    { id: 'seldom',    label: 'Melibatkan akun yang jarang dipakai', on: false },
  ];

  /* ---- Populasi jurnal kanonik (sub-buku) ----
     Field inti (dipakai JET): id,date,time,user,amount,dr,cr,flags
     Field forensik (dipakai Forensic Cash Flow):
       cash   : transaksi menyentuh Kas/Bank (1-1100)
       dir    : 'in' | 'out'  (arah kas)
       act    : 'O' | 'I' | 'F' (klasifikasi PSAK 2 ¶13-17)
       code   : akun WTB yang dipasangkan dengan kas
       rpId   : id pihak berelasi (registri SA 550) bila relevan
       party  : nama lawan transaksi
       forensic: indikator forensik (naratif)
       note   : narasi singkat */
  const JOURNAL_POP: JournalEntry[] = [
    /* —— jurnal non-kas (relevan untuk JET, diabaikan analitik kas) —— */
    { id: 'JV-24-08841', date: '31-12-2025', time: '23:48', user: 'finance.adm2', amount: 2_000_000_000, dr: 'Pendapatan', cr: 'Piutang Usaha', flags: ['weekend', 'afterhrs', 'periodend', 'round', 'unusual'],
      cash: false, code: '4-1100', note: 'Pembalikan pendapatan tanpa dokumen retur — indikasi channel stuffing (R-01).' },
    { id: 'JV-24-08977', date: '31-12-2025', time: '22:15', user: 'gl.manager', amount: 1_500_000_000, dr: 'Beban Akrual', cr: 'Kas', flags: ['afterhrs', 'periodend', 'round'],
      cash: true, dir: 'out', act: 'O', code: '2-1300', party: 'Beban akrual tanpa rincian',
      forensic: ['Akhir tahun', 'Luar jam', 'Nilai bulat'], note: 'Pembayaran beban akrual berjumlah bulat, diposting larut malam menjelang tutup buku tanpa lampiran tagihan.' },
    { id: 'JV-24-08120', date: '27-12-2025', time: '19:02', user: 'finance.adm2', amount: 985_000_000, dr: 'Beban Lain-lain', cr: 'Utang Usaha', flags: ['afterhrs', 'threshold'],
      cash: false, code: '2-1100', note: 'Beban ke vendor tanpa kontrak; nilai tepat di bawah ambang otorisasi Rp 1 M.' },
    { id: 'JV-24-07733', date: '28-12-2025', time: '09:31', user: 'staff.ap', amount: 340_500_000, dr: 'Persediaan', cr: 'Utang Usaha', flags: [],
      cash: false, code: '1-1300', note: 'Penerimaan persediaan rutin.' },
    { id: 'JV-24-08455', date: '30-12-2025', time: '13:20', user: 'gl.manager', amount: 750_000_000, dr: 'Aset Tetap', cr: 'Pendapatan Lain', flags: ['unusual', 'round'],
      cash: false, code: '1-2100', note: 'Kapitalisasi aset terhadap pendapatan lain — kombinasi akun tidak lazim.' },
    { id: 'JV-24-08502', date: '06-12-2025', time: '11:04', user: 'cfo.user', amount: 499_000_000, dr: 'Beban Konsultan', cr: 'Kas', flags: ['threshold', 'rareuser'],
      cash: true, dir: 'out', act: 'O', code: '5-3100', party: 'Konsultan tanpa berita acara',
      forensic: ['Di bawah ambang', 'Override manajemen', 'Dokumen kurang'], note: 'Pembayaran konsultan Rp 499 jt — tepat di bawah ambang Rp 500 jt, dijurnal langsung oleh CFO tanpa berita acara serah-terima.' },
    { id: 'JV-24-06911', date: '15-11-2025', time: '14:55', user: 'staff.ar', amount: 128_400_000, dr: 'Kas', cr: 'Piutang Usaha', flags: [],
      cash: true, dir: 'in', act: 'O', code: '1-1200', party: 'Penerimaan pelanggan',
      forensic: [], note: 'Penerimaan pelunasan piutang pelanggan — pola normal, jam kerja.' },
    { id: 'JV-24-08890', date: '31-12-2025', time: '21:33', user: 'finance.adm2', amount: 1_000_000_000, dr: 'Saldo Laba', cr: 'Cadangan', flags: ['afterhrs', 'periodend', 'round', 'unusual', 'seldom'],
      cash: false, code: '3-2100', note: 'Reklasifikasi ekuitas langsung ke saldo laba — akun jarang dipakai.' },
    { id: 'JV-24-07088', date: '21-12-2025', time: '08:12', user: 'staff.gl', amount: 64_200_000, dr: 'Biaya Dibayar Dimuka', cr: 'Kas', flags: [],
      cash: true, dir: 'out', act: 'O', code: '1-1500', party: 'Asuransi dibayar di muka',
      forensic: [], note: 'Pembayaran premi asuransi dibayar di muka — rutin.' },
    { id: 'JV-24-08300', date: '29-12-2025', time: '18:47', user: 'gl.manager', amount: 620_000_000, dr: 'CKPN', cr: 'Beban Penyisihan', flags: ['afterhrs', 'periodend'],
      cash: false, code: '1-1210', note: 'Penyesuaian CKPN dekat tutup buku (selaras AJE-02 · PSAK 71).' },

    /* —— mutasi kas/bank bermuatan forensik (juga jurnal manual → tampak di JET) —— */
    { id: 'JV-24-09001', date: '31-12-2025', time: '23:51', user: 'finance.adm2', amount: 2_780_000_000, dr: 'Utang Usaha · CV Mitra Keluarga', cr: 'Kas', flags: ['afterhrs', 'periodend', 'unusual'],
      cash: true, dir: 'out', act: 'O', code: '2-1100', rpId: 'RP-05', party: 'CV Mitra Keluarga',
      forensic: ['Akhir tahun', 'Luar jam', 'Pihak berelasi', 'Dokumen kurang'],
      note: 'Transfer pelunasan ke CV Mitra Keluarga (dikendalikan keluarga komisaris) pukul 23:51 pada 31 Des — selaras transaksi RPT T-06 yang belum diungkapkan, harga 12% di atas pasar.' },
    { id: 'JV-24-09002', date: '31-12-2025', time: '21:40', user: 'gl.manager', amount: 1_200_000_000, dr: 'Piutang Direksi', cr: 'Kas', flags: ['afterhrs', 'periodend', 'round', 'unusual'],
      cash: true, dir: 'out', act: 'O', code: '1-1200', rpId: 'RP-04', party: 'Budi Santoso (Dir. Utama)',
      forensic: ['Akhir tahun', 'Luar jam', 'Pihak berelasi', 'Nilai bulat'],
      note: 'Pencairan uang muka ke Direktur Utama Rp 1,2 M berjumlah bulat, diposting larut malam akhir tahun — pihak berelasi (manajemen kunci, PSAK 7).' },
    { id: 'JV-24-08766', date: '20-12-2025', time: '09:14', user: 'staff.gl', amount: 500_000_000, dr: 'Kas Besar (tunai)', cr: 'Bank', flags: ['round'],
      cash: true, dir: 'out', act: 'O', code: '1-1100', party: 'Penarikan tunai',
      forensic: ['Nilai bulat', 'Tunai'],
      note: 'Penarikan tunai kas besar Rp 500 jt berjumlah bulat — risiko penyalahgunaan kas fisik; perlu rekonsiliasi opname kas.' },
  ];

  /* ---- skoring kriteria JET (jumlah kriteria aktif yang terpenuhi) ---- */
  function score(pop: JournalEntry[], activeIds?: string[]) {
    const active = activeIds || JET_CRITERIA.filter(c => c.on).map(c => c.id);
    return pop.map(je => {
      const hit = (je.flags || []).filter(f => active.includes(f));
      return Object.assign({}, je, { hit, score: hit.length });
    });
  }

  /* ---- efek-kas mutasi neraca: −Δsaldo (sama dgn FSGEN & PSAK 2) ---- */
  function dmod(by: Record<string, WtbRow>, c: string) { const r = by[c]; const cy = r ? r.adj! : 0, py = r ? r.ly! : 0; return -((cy) - (py)); }

  /* ============================================================
     buildCash(model, wtb) — jembatan arus kas bruto + waterfall,
     SELURUHNYA diturunkan dari FSGEN model (single source of truth).
     ============================================================ */
  function buildCash(model: FsModel | null, wtb?: WTB) {
    if (!model) return null;
    const by: Record<string, WtbRow> = {}; (wtb || []).forEach(r => { by[r.code] = r; });
    const cf = model.cf;

    /* —— waterfall: stage = saldo & aktivitas dari laporan arus kas —— */
    const waterfall = [
      { label: 'Saldo Awal', value: cf.cashOpen, type: 'base' },
      { label: 'Operasi', value: cf.cfoTotal, type: cf.cfoTotal >= 0 ? 'in' : 'out' },
      { label: 'Investasi', value: cf.cfiTotal, type: cf.cfiTotal >= 0 ? 'in' : 'out' },
      { label: 'Pendanaan', value: cf.cffTotal, type: cf.cffTotal >= 0 ? 'in' : 'out' },
      { label: 'Saldo Akhir', value: cf.cashClose, type: 'total' },
    ];

    /* —— metode langsung (¶18a) — direkonstruksi dari mutasi WTB, tie ke CFO —— */
    const S = model.is.sales.cy, COGS = model.is.cogs.cy, SELL = model.is.sell.cy, ADMIN = model.is.admin.cy, FIN = model.is.finCost.cy, TAX = model.is.tax.cy;
    const recCust = S + dmod(by, '1-1200');
    const paySupp = -COGS + dmod(by, '1-1300') + dmod(by, '2-1100');
    const payOpex = -(SELL + ADMIN) + model.meta.depreciation + model.meta.amortization + model.meta.eclProv + dmod(by, '2-2300') + dmod(by, '2-1300') + dmod(by, '1-1500') + dmod(by, '1-1400') + dmod(by, '1-2500');
    const intPaid = -FIN;
    const taxPaid = -TAX + dmod(by, '2-1400');
    const cfoDirect = recCust + paySupp + payOpex + intPaid + taxPaid;

    /* —— komponen arus kas bruto (setiap pos diklasifikasi O/I/F) —— */
    const comps: Array<{ label: string; v: number; act: string; memo?: string }> = [
      { label: 'Penerimaan dari pelanggan', v: recCust, act: 'O' },
      { label: 'Pembayaran kepada pemasok', v: paySupp, act: 'O' },
      { label: 'Pembayaran karyawan & beban operasi', v: payOpex, act: 'O' },
      { label: 'Pembayaran bunga', v: intPaid, act: 'O' },
      { label: 'Pembayaran pajak penghasilan', v: taxPaid, act: 'O' },
    ];
    cf.cfi.forEach(l => comps.push({ label: l.label, v: l.v, act: 'I', memo: l.memo }));
    cf.cff.forEach(l => comps.push({ label: l.label, v: l.v, act: 'F', memo: l.memo }));

    const inflows = comps.filter(c => c.v > 0).sort((a, b) => b.v - a.v);
    const outflows = comps.filter(c => c.v < 0).map(c => ({ ...c, v: -c.v })).sort((a, b) => b.v - a.v);
    const totalIn = inflows.reduce((s, x) => s + x.v, 0);
    const totalOut = outflows.reduce((s, x) => s + x.v, 0);
    const bridgeNet = totalIn - totalOut;       // == cf.netChange (tie-out)

    /* —— populasi anomali kas: subset menyentuh kas, beri skor forensik —— */
    const cashPop = JOURNAL_POP.filter(j => j.cash).map(j => {
      const forensic = j.forensic || [];
      return Object.assign({}, j, {
        forensic,
        fscore: forensic.length,
        signed: (j.dir === 'in' ? 1 : -1) * j.amount,
      });
    });
    const flagged = cashPop.filter(j => j.fscore > 0).sort((a, b) => b.fscore - a.fscore || b.amount - a.amount);
    const clean = cashPop.filter(j => j.fscore === 0);
    const anomalyOut = flagged.filter(j => j.dir === 'out').reduce((s, j) => s + j.amount, 0);
    const rpExposure = flagged.filter(j => j.rpId).reduce((s, j) => s + j.amount, 0);

    return {
      by, cf, waterfall,
      recCust, paySupp, payOpex, intPaid, taxPaid, cfoDirect,
      comps, inflows, outflows, totalIn, totalOut, bridgeNet,
      cashPop, flagged, clean, anomalyOut, rpExposure,
      cfoTies: Math.abs(cfoDirect - cf.cfoTotal) < 1e6,
      bridgeTies: Math.abs(bridgeNet - cf.netChange) < 1e6,
      cashTies: cf.ties,
    };
  }

  return { JET_CRITERIA, JOURNAL_POP, score, dmod, buildCash };
})();


/* ESM export (window write dilucuti — legacy track slice 9) */
export { AMS_FORENSIC };
