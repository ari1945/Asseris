/* ============================================================
   Asseris — lapisan MURNI derivasi status WP (SSOT)
   ------------------------------------------------------------
   Dipisahkan dari view_wp.tsx (W16) agar dapat diuji di env node
   (tanpa React/jsdom) dan menjadi rumah tunggal logika status WP.
   FUNGSI MURNI — tanpa import React/.tsx; hanya tipe dari selektor kanon.
   ============================================================ */
import type { ProcedureInput } from './canon_selectors';

/* ---- File index (ref, title, preparer, reviewer, status) ---- */
const WP_INDEX = [
  { sec: 'Perencanaan', items: [['100', 'Memorandum Strategi Audit', 'Anindya P.', 'Hartono W.', 'Reviewed'], ['200', 'Penilaian Risiko & RoMM', 'Anindya P.', 'Hartono W.', 'Reviewed'], ['300', 'Perhitungan Materialitas', 'Dimas R.', 'Anindya P.', 'Reviewed']] },
  { sec: 'Aset', items: [['A', 'Kas dan Setara Kas', 'Fajar N.', 'Anindya P.', 'Reviewed'], ['B', 'Piutang Usaha & ECL', 'Dimas R.', 'Anindya P.', 'In Review'], ['C', 'Persediaan', 'Rina K.', '—', 'In Progress'], ['E', 'Aset Tetap', 'Dimas R.', 'Anindya P.', 'In Review'], ['F', 'Sewa PSAK 73', 'Sinta W.', '—', 'In Progress']] },
  { sec: 'Liabilitas & Ekuitas', items: [['AA', 'Utang Usaha', 'Fajar N.', 'Anindya P.', 'Reviewed'], ['BB', 'Utang Bank', 'Rina K.', 'Anindya P.', 'Reviewed'], ['H', 'Imbalan Kerja', 'Sinta W.', '—', 'In Progress'], ['K', 'Ekuitas', 'Fajar N.', 'Anindya P.', 'Reviewed']] },
  { sec: 'Laba Rugi', items: [['R', 'Pendapatan', 'Dimas R.', '—', 'In Progress'], ['S', 'Beban Pokok Penjualan', 'Rina K.', '—', 'In Progress'], ['U', 'Beban Operasi', 'Fajar N.', 'Anindya P.', 'In Review']] },
  { sec: 'Penyelesaian', items: [['810', 'SAD Ledger & Evaluasi', 'Anindya P.', 'Hartono W.', 'Not Started'], ['820', 'Subsequent Events', 'Sinta W.', '—', 'Not Started'], ['900', 'Draft Laporan & Opini', 'Anindya P.', 'Hartono W.', 'Not Started']] },
];

/* ---- Per-WP audit procedures (assertion-tagged) ---- */
const WP_PROCS = {
  '100': [['Dokumentasikan pemahaman entitas & lingkungannya (SA 315)', 'Pemahaman'], ['Tetapkan strategi & rencana audit menyeluruh (SA 300)', 'Perencanaan'], ['Diskusi tim perikatan atas risiko kecurangan (SA 240)', 'Kecurangan']],
  '200': [['Identifikasi & nilai RoMM tingkat LK & asersi (SA 315)', 'Penilaian Risiko'], ['Tautkan respons audit ke setiap risiko signifikan (SA 330)', 'Respons'], ['Evaluasi pengendalian relevan terhadap risiko', 'Pengendalian']],
  '300': [['Tetapkan benchmark & overall materiality (SA 320)', 'Materialitas'], ['Tetapkan performance materiality & clearly trivial', 'Materialitas'], ['Dokumentasikan pertimbangan revisi materialitas', 'Materialitas']],
  A: [['Peroleh & uji rekonsiliasi bank seluruh akun per 31 Des 2025', 'Keberadaan'], ['Kirim & terima konfirmasi bank independen; cocokkan saldo', 'Keberadaan'], ['Uji pisah batas penerimaan/pengeluaran kas ±5 hari', 'Pisah Batas'], ['Telaah deposito berjangka & saldo dibatasi penggunaannya', 'Penyajian'], ['Hitung kas kecil & uji rekonsiliasinya', 'Keberadaan']],
  B: [['Cocokkan daftar piutang & aging ke buku besar', 'Kelengkapan'], ['Kirim konfirmasi positif sampel MUS; prosedur alternatif untuk non-respons', 'Keberadaan'], ['Uji pisah batas penjualan atas faktur akhir tahun', 'Pisah Batas'], ['Re-perform model ECL PSAK 71; uji asumsi PD/LGD & matriks provisi', 'Penilaian'], ['Uji penerimaan setelah tanggal neraca (subsequent receipts)', 'Penilaian'], ['Evaluasi piutang fiktif teridentifikasi & dampak AJE', 'Keterjadian']],
  C: [['Hadiri & observasi stock opname; uji hitung dua arah', 'Keberadaan'], ['Cocokkan kompilasi opname ke buku besar', 'Kelengkapan'], ['Uji penilaian biaya perolehan vs NRV; identifikasi barang usang', 'Penilaian'], ['Uji pisah batas penerimaan & pengeluaran barang', 'Pisah Batas'], ['Telaah persediaan dalam perjalanan & konsinyasi', 'Hak & Kewajiban']],
  E: [['Peroleh roll-forward; cocokkan saldo awal ke KK tahun lalu', 'Kelengkapan'], ['Vouch penambahan signifikan ke faktur & bukti otorisasi', 'Keberadaan'], ['Uji pelepasan & laba/rugi; pastikan penghapusbukuan', 'Keberadaan'], ['Re-kalkulasi penyusutan & uji konsistensi metode/umur', 'Penilaian'], ['Telaah indikasi penurunan nilai (PSAK 48)', 'Penilaian']],
  F: [['Peroleh daftar kontrak sewa; uji kelengkapan vs kontrak baru', 'Kelengkapan'], ['Re-kalkulasi aset hak-guna & liabilitas sewa (diskonto)', 'Penilaian'], ['Uji incremental borrowing rate yang digunakan', 'Penilaian'], ['Uji klasifikasi jangka pendek/panjang liabilitas sewa', 'Penyajian'], ['Telaah pengungkapan PSAK 73 di CALK', 'Penyajian']],
  AA: [['Cocokkan daftar utang ke buku besar & uji aging', 'Kelengkapan'], ['Uji utang belum tercatat (search for unrecorded liabilities)', 'Kelengkapan'], ['Konfirmasi pemasok utama / rekonsiliasi laporan pemasok', 'Keberadaan'], ['Uji pisah batas penerimaan barang', 'Pisah Batas']],
  BB: [['Konfirmasi saldo & fasilitas ke bank', 'Keberadaan'], ['Telaah perjanjian kredit & covenant; uji kepatuhan', 'Penyajian'], ['Uji klasifikasi jangka pendek/panjang', 'Penyajian'], ['Re-kalkulasi beban bunga & akrual', 'Penilaian']],
  H: [['Peroleh laporan aktuaria; nilai kompetensi & objektivitas pakar (SA 500)', 'Penilaian'], ['Uji asumsi aktuaria (diskonto, kenaikan gaji, mortalita)', 'Penilaian'], ['Cocokkan data karyawan yang digunakan aktuaris', 'Kelengkapan'], ['Telaah pengungkapan PSAK 24', 'Penyajian']],
  K: [['Cocokkan modal saham ke akta & daftar pemegang saham', 'Keberadaan'], ['Telusuri mutasi saldo laba & dividen ke notulen RUPS', 'Kelengkapan'], ['Telaah penyajian & pengungkapan ekuitas', 'Penyajian']],
  R: [['Analitis pendapatan per bulan/segmen; investigasi fluktuasi', 'Keterjadian'], ['Uji pisah batas pendapatan sebelum/sesudah tutup buku', 'Pisah Batas'], ['Sampel pengakuan ke kontrak, pengiriman & penerimaan', 'Keterjadian'], ['Uji penjualan & retur pasca neraca (channel stuffing)', 'Keterjadian'], ['Telaah kebijakan pengakuan pendapatan PSAK 72', 'Penyajian']],
  S: [['Analitis margin kotor per lini produk; investigasi anomali', 'Keterjadian'], ['Uji pisah batas pembelian & beban', 'Pisah Batas'], ['Rekonsiliasi BPP ke pergerakan persediaan', 'Kelengkapan'], ['Sampel beban ke dokumen pendukung', 'Keterjadian']],
  U: [['Analitis beban operasi vs anggaran & tahun lalu', 'Kelengkapan'], ['Sampel beban signifikan ke bukti & otorisasi', 'Keterjadian'], ['Uji beban akrual & beban dibayar di muka', 'Pisah Batas']],
  '810': [['Akumulasi salah saji teridentifikasi (terkoreksi & tidak)', 'Evaluasi'], ['Evaluasi dampak agregat vs materialitas (SA 450)', 'Evaluasi'], ['Peroleh representasi manajemen atas salah saji tidak dikoreksi', 'Representasi']],
  '820': [['Prosedur peristiwa kemudian s.d. tanggal laporan (SA 560)', 'Subsequent'], ['Telaah notulen, kontrak & kejadian pasca neraca', 'Subsequent'], ['Evaluasi peristiwa penyesuai vs pengungkap', 'Penyajian']],
  '900': [['Susun draf opini sesuai temuan (SA 700/705)', 'Pelaporan'], ['Finalisasi Hal Audit Utama / KAM (SA 701)', 'Pelaporan'], ['Telaah kelengkapan LK & checklist pengungkapan', 'Penyajian']],
};
const procsFor = (ref: any) => (WP_PROCS as any)[ref] || [['Lakukan prosedur substantif atas saldo', 'Substantif'], ['Cocokkan ke buku besar & dokumen sumber', 'Kelengkapan'], ['Dokumentasikan kesimpulan', 'Kesimpulan']];
const PROC_EXC_SEED = { B: [5], C: [2] };
const defaultProcState = (ref: any, status: any, i: any, total: any) => {
  if (((PROC_EXC_SEED as any)[ref] || []).includes(i)) return 'Pengecualian';
  if (status === 'Reviewed') return 'Selesai';
  if (status === 'In Review') return i < total - 1 ? 'Selesai' : 'Belum';
  if (status === 'In Progress') return i < Math.ceil(total / 2) ? 'Selesai' : 'Belum';
  return 'Belum';
};
function wpToday() {
  try { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch (e) { return ''; }
}
/* Status satu prosedur (exec-aware) — SSOT dipakai WPDrill, roll-up asersi & matriks.
   Diturunkan dari item eksekusi bila ada; jika tidak, flag manual lama lalu heuristik. */
function procStatusAt(ref: any, st: any, status: any, defs: any, i: any) {
  const es = execStatus((st.exec || {})['p' + i]);
  if (es) return es;
  return (st.procs && st.procs['p' + i] != null) ? st.procs['p' + i] : defaultProcState(ref, status, i, defs.length);
}

/* Status per-prosedur (exec-aware) untuk satu WP + agregat done/exc.
   SUMBER TUNGGAL: dipakai deriveWpStatus, metrics indeks & WPDrill. */
function procStatesFor(ref: any, st: any, status: any): { statuses: string[]; done: number; exc: number } {
  const defs = procsFor(ref);
  const statuses = defs.map((_: any, i: number) => procStatusAt(ref, st || {}, status, defs, i));
  const done = statuses.filter((s: string) => s === 'Selesai').length;
  const exc = statuses.filter((s: string) => s === 'Pengecualian').length;
  return { statuses, done, exc };
}

/* ---- Seed review notes pinned to specific WPs ---- */
const WP_SEED_NOTES = {
  B: [
    { id: 'b1', author: 'Anindya P.', to: 'Dimas R.', text: 'Konfirmasi piutang batch-2 belum lengkap — lakukan prosedur alternatif (subsequent receipt) untuk 3 saldo non-respons.', priority: 'high', status: 'open', created: '2 hari lalu' },
    { id: 'b2', author: 'Anindya P.', to: 'Dimas R.', text: 'Lampirkan re-perform model ECL beserta dokumentasi asumsi PD & matriks provisi.', priority: 'medium', status: 'open', created: '2 hari lalu' },
  ],
  C: [{ id: 'c1', author: 'Anindya P.', to: 'Rina K.', text: 'Sertakan kertas kerja uji NRV untuk SKU bergerak lambat (> 180 hari).', priority: 'medium', status: 'open', created: 'kemarin' }],
  E: [{ id: 'e1', author: 'Anindya P.', to: 'Dimas R.', text: 'Vouch 2 penambahan mesin > Rp 1 M ke faktur & berita acara serah terima.', priority: 'low', status: 'resolved', created: '3 hari lalu' }],
  R: [{ id: 'r1', author: 'Anindya P.', to: 'Dimas R.', text: 'Perluas uji pisah batas pendapatan — fokus 10 hari terakhir & retur awal Januari.', priority: 'high', status: 'open', created: 'hari ini' }],
};

/* ============================================================
   Fase 1 — eksekusi prosedur & pengujian bukti (SA 500).
   Tipe lokal (tahan regrowth :any, ratchet W15) + model bukti & item uji.
   ============================================================ */
type EvRec = { id: string; name: string; source: string; tier: number; type: string; asr: string[]; by: string; at: string };
type TestItem = { id: string; desc: string; ev: string; tick: string; result: string; note: string; lead?: string };
type ExecP = { items: TestItem[]; concl?: string };

/* Status prosedur DITURUNKAN dari item eksekusi bila ada; null → pakai flag lama. */
function execStatus(ep: ExecP | undefined): string | null {
  const items = (ep && ep.items) || [];
  if (!items.length) return null;
  if (items.some(it => it.result === 'exc')) return 'Pengecualian';
  const rated = items.filter(it => it.result);
  if (rated.length < items.length) return 'Berjalan';
  if (items.every(it => it.result === 'na')) return 'N/A';
  return 'Selesai';
}

/* Evaluasi kecukupan & ketepatan bukti tingkat WP (SA 500). */
/* PR-6d — parameter DILONGGARKAN ke bentuk yang benar-benar dibaca fungsi ini (`tier` pada
   bukti, `items[].result` pada langkah eksekusi). `wpState` kini bertipe, dan memaksakan
   `EvRec`/`ExecP` penuh di sini hanya memindahkan cast ke pemanggil (view_evidence) tanpa
   menambah jaminan apa pun — fungsi ini tak menyentuh field lainnya.
   (Dipertahankan saat ekstraksi W16: master sudah melonggarkannya di #138.) */
function wpEvidenceEval(
  evidence: { tier?: number }[],
  exec: Record<string, { items?: { result?: string }[] }>,
) {
  const ev = evidence || [];
  const items = Object.values(exec || {}).flatMap(p => (p && p.items) || []);
  const tested = items.filter(it => it.result);
  const exc = items.filter(it => it.result === 'exc');
  const appr = ev.length ? ev.reduce((a, e) => a + (e.tier || 0), 0) / ev.length : 0; // 1..5
  const suff = items.length ? tested.length / items.length : 0;                        // 0..1
  let verdict: { l: string; k: string };
  if (ev.length && items.length && appr >= 3 && suff >= 0.85 && exc.length === 0) verdict = { l: 'Bukti Cukup & Tepat', k: 'green' };
  else if (ev.length && (appr >= 2.5 || suff >= 0.6)) verdict = { l: 'Sebagian Perlu Diperkuat', k: 'amber' };
  else verdict = { l: 'Belum Memadai', k: 'red' };
  return { evCount: ev.length, itemCount: items.length, tested: tested.length, exc: exc.length, appr, suffPct: Math.round(suff * 100), verdict };
}

/* ---- Shared helpers: expose WP-pinned notes to global Review Notes & My Tasks ---- */
const WP_TITLE = {};
WP_INDEX.forEach(s => s.items.forEach(it => { (WP_TITLE as any)[it[0]] = it[1]; }));
const WP_REFS = WP_INDEX.flatMap(s => s.items.map(it => ({ ref: it[0], title: it[1] })));

/* ---- Canonical per-WP status derivation ----
   SINGLE SOURCE OF TRUTH for the SA reference pages. Mirrors exactly the
   metrics + sign-off logic used by the WP index & WPDrill above, so SA 5xx
   pages never keep a private copy of engagement status — they read this. */
const WP_META = {};
WP_INDEX.forEach(s => s.items.forEach(it => { (WP_META as any)[it[0]] = { title: it[1], preparer: it[2], reviewer: it[3], statusDefault: it[4], section: s.sec }; }));

function deriveWpStatus(ref: any, audit: any, firm: any) {
  const wpState = (audit && audit.wpState) || {};
  const wtb = (audit && audit.wtb) || [];
  const risks = (audit && audit.risks) || [];
  const meta = (WP_META as any)[ref] || { title: ref, preparer: '—', reviewer: '—', statusDefault: 'Not Started', section: '' };
  const st = wpState[ref] || {};
  const status = st.status || meta.statusDefault;

  /* procedures — identical derivation to ProcsTab / index metrics */
  const { statuses, done, exc } = procStatesFor(ref, st, status);

  /* open review notes — seed + user-added, honoring status overrides */
  const base = (WP_SEED_NOTES as any)[ref] || [];
  const added = st.notes || [];
  const ov = st.noteStatus || {};
  const openNotes = base.concat(added).filter((n: any) => (ov[n.id] || n.status) === 'open').length;

  /* coverage vs materiality — balance from the canonical WTB lead rows */
  const leadRows = wtb.filter((r: any) => r.lead === ref);
  const bal = leadRows.length ? leadRows.reduce((a: any, r: any) => a + r.adj, 0) : null;
  const om = (firm && firm.activeEngagement && firm.activeEngagement.materiality) || 0;
  const pm = Math.round(om * 0.75), triv = Math.round(om * 0.05);
  let coverage = null;
  if (bal != null) { const a = Math.abs(bal); coverage = { bal, level: a >= pm ? 'full' : a >= triv ? 'partial' : 'trivial' }; }

  /* sign-off chain — identical default logic to SignoffTab */
  const chain = st.chain || {};
  const listed = !!(firm && firm.activeClient && firm.activeClient.listed);
  const preparer = chain.preparer || null;                       // assigned ≠ signed
  const reviewer = chain.reviewer || (status === 'Reviewed' ? { by: st.reviewer || meta.reviewer || 'Anindya P.', at: st.signedAt || wpToday() } : null);
  const partner = chain.partner || null;
  const eqr = chain.eqr || null;
  const signoff = [
    { key: 'preparer', role: 'Preparer', signed: preparer, assigned: meta.preparer },
    { key: 'reviewer', role: 'Reviewer', signed: reviewer, assigned: meta.reviewer },
    { key: 'partner', role: 'Partner', signed: partner, assigned: '' },
  ];
  if (listed) signoff.push({ key: 'eqr', role: 'EQR', signed: eqr, assigned: '' });
  const signedCount = signoff.filter(l => l.signed).length;

  const relRisks = risks.filter((r: any) => (r.wp || '').split('-')[0] === ref);
  return { ref, title: meta.title, section: meta.section, status, done, total: statuses.length, exc, openNotes, coverage, pm, triv, signoff, signedCount, fullySigned: signedCount === signoff.length, relRisks, hasLead: leadRows.length > 0 };
}

/* Prosedur + status (exec-aware) satu lead schedule → input mesin cakupan asersi.
   SSOT: dipakai Matriks Asersi lintas-modul agar tidak menyalin logika status WP. */
function wpProcedureInputs(ref: any, audit: any): ProcedureInput[] {
  const wpState = (audit && audit.wpState) || {};
  const st = wpState[ref] || {};
  const meta = (WP_META as any)[ref] || { statusDefault: 'Not Started' };
  const status = st.status || meta.statusDefault;
  const defs = procsFor(ref);
  return defs.map(([text, assertion]: any, i: number) => ({ text, assertionLabel: assertion, status: procStatusAt(ref, st, status, defs, i) }));
}

export type { EvRec, TestItem, ExecP };
export {
  WP_INDEX, WP_TITLE, WP_REFS, WP_META,
  WP_PROCS, procsFor, PROC_EXC_SEED, defaultProcState, WP_SEED_NOTES,
  execStatus, procStatusAt, procStatesFor, wpEvidenceEval, deriveWpStatus, wpProcedureInputs,
  wpToday,
};
