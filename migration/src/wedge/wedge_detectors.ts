/* ============================================================
   Wedge MVP H2 — detektor outlier neraca saldo (SA 520 analitik)
   ------------------------------------------------------------
   Melengkapi P4 (WTB-outlier tertunda) di lapisan wedge: analitik
   deterministik LANGSUNG pada TB impor (yang sudah kita parse), di-inject
   ke `amsDiagnostics` via `extraFindings`. Tidak menyentuh mesin canon-tier
   (nol risiko regresi app). Nilai = perluas cakupan SA → kertas kerja lebih
   lengkap/defensif (inti WTP inspeksi PPPK).

   Cek: sign-flip vs tahun lalu · swing YoY besar+material · penyesuaian
   audit unadj→adj material · akun material baru (tanpa saldo LY).
   ============================================================ */
import type { RawTbRow } from './import_parse';
import type { DiagFinding } from '../diagnostics';

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const pct = (x: number) => (x * 100).toFixed(0) + '%';

const SWING_RATIO = 0.5;     // |Δ|/|ly| > 50%
const MAT_FRACTION = 0.01;   // material = 1% dari total magnitudo TB
const MAX_FINDINGS = 8;      // cap agar tak membanjiri

export function wtbOutliers(tb: RawTbRow[]): DiagFinding[] {
  if (!tb || !tb.length) return [];
  const totalAbs = tb.reduce((s, r) => s + Math.abs(r.unadj || 0), 0);
  const material = Math.max(1, MAT_FRACTION * totalAbs);
  const cand: { f: DiagFinding; mag: number }[] = [];

  for (const r of tb) {
    const unadj = r.unadj || 0, ly = r.ly || 0, adj = r.adj != null ? r.adj : unadj;
    const acct = `${r.code}${r.name ? ' ' + r.name : ''}`;

    // 1) sign-flip vs LY (kredit↔debit) — keduanya material
    if (ly !== 0 && unadj !== 0 && Math.sign(ly) !== Math.sign(unadj) && Math.abs(unadj) >= material && Math.abs(ly) >= material) {
      cand.push({ mag: Math.abs(unadj) + Math.abs(ly), f: {
        id: 'wtb-flip-' + r.code, detector: 'wtb', sev: 'high', std: 'SA 520 · SA 240',
        title: `Saldo berbalik tanda: ${acct}`,
        detail: `Saldo ${acct} berubah tanda dari ${rp(ly)} (LY) menjadi ${rp(unadj)} (tahun berjalan). Pembalikan tanda akun signifikan perlu penjelasan (reklasifikasi, koreksi, atau indikasi salah saji).`,
        modules: ['wtb'], drillView: 'wtb',
        suggestedProcedure: 'Telusuri penyebab pembalikan tanda ke buku besar & dokumen pendukung; pastikan bukan salah klasifikasi/posting.',
      } });
    }

    // 2) swing YoY besar + material
    else if (ly !== 0 && Math.abs(unadj - ly) >= material && Math.abs(unadj - ly) / Math.abs(ly) > SWING_RATIO) {
      const d = unadj - ly;
      cand.push({ mag: Math.abs(d), f: {
        id: 'wtb-swing-' + r.code, detector: 'wtb', sev: 'med', std: 'SA 520',
        title: `Fluktuasi tahun-ke-tahun signifikan: ${acct}`,
        detail: `${acct} ${d > 0 ? 'naik' : 'turun'} ${rp(Math.abs(d))} (${pct(Math.abs(d) / Math.abs(ly))}) dari ${rp(ly)} (LY) ke ${rp(unadj)}. Prosedur analitis SA 520 menuntut penjelasan & korоборasi fluktuasi tak terduga.`,
        modules: ['wtb'], drillView: 'wtb',
        suggestedProcedure: 'Kembangkan ekspektasi independen; investigasi selisih dari ekspektasi ke bukti substantif (SA 520 ¶5–7).',
      } });
    }

    // 3) akun material baru (tanpa LY)
    else if (ly === 0 && Math.abs(unadj) >= material) {
      cand.push({ mag: Math.abs(unadj), f: {
        id: 'wtb-new-' + r.code, detector: 'wtb', sev: 'low', std: 'SA 520',
        title: `Akun material baru tanpa saldo tahun lalu: ${acct}`,
        detail: `${acct} bersaldo ${rp(unadj)} tanpa pembanding tahun lalu. Akun baru material perlu pemahaman sifat & ketepatan klasifikasi.`,
        modules: ['wtb'], drillView: 'wtb',
        suggestedProcedure: 'Pahami sifat transaksi yang membentuk akun baru; uji eksistensi & klasifikasi.',
      } });
    }

    // 4) penyesuaian audit unadj→adj material (independen dari cek di atas)
    if (Math.abs(adj - unadj) >= material) {
      const a = adj - unadj;
      cand.push({ mag: Math.abs(a), f: {
        id: 'wtb-adj-' + r.code, detector: 'wtb', sev: 'med', std: 'SA 450',
        title: `Penyesuaian audit material: ${acct}`,
        detail: `${acct} disesuaikan ${rp(Math.abs(a))} (dari ${rp(unadj)} unadjusted ke ${rp(adj)} adjusted). Penyesuaian material harus terdokumentasi & terakumulasi (SA 450).`,
        modules: ['wtb'], drillView: 'wtb',
        suggestedProcedure: 'Dokumentasikan dasar penyesuaian; akumulasikan ke ikhtisar salah saji (SA 450) dan nilai dampak agregatnya.',
      } });
    }
  }

  return cand.sort((a, b) => b.mag - a.mag).slice(0, MAX_FINDINGS).map(c => c.f);
}
