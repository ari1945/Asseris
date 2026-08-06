/* ============================================================
   Asseris — W-WTB·2 · Gerbang integritas Working Trial Balance
   ------------------------------------------------------------
   Fungsi MURNI (tanpa efek samping, tanpa `any`) yang menilai integritas
   neraca saldo kerja & rekonsiliasinya dengan register AJE. Mengganti chip
   "Balanced" kosmetik dengan verdikt nyata.

   Tiga lapis (sesuai keputusan W-WTB·2):
   1. FOOTING (Σ adj semua akun) — INFORMASIONAL & sadar-laba: TB pra-tutup
      yang benar ber-Σ 0; bila Σ = −laba berjalan, itu NORMAL (laba belum
      ditutup ke saldo laba) → dijelaskan, bukan error.
   2. REKONSILIASI NERACA (aset = liabilitas + ekuitas) — DITEGAKKAN; selisih
      ≈ laba berjalan juga dianggap wajar (TB pra-tutup).
   3. REKONSILIASI AJE (Σ aje kolom WTB = 0 & tie ke proyeksi register) —
      DITEGAKKAN; ketidakcocokan ditampilkan per-akun.

   Status GRADUATED ('ok' | 'attention') — TIDAK pernah memblok keras.
   ============================================================ */

export interface IntegrityAjeLine { code: string; debit?: number; credit?: number; }
export interface IntegrityAjeEntry { id?: string; amount?: number; status?: string; dr?: string; cr?: string; lines?: IntegrityAjeLine[]; }
export interface IntegrityWtbRow { code: string; name?: string; group?: string; unadj?: number; aje?: number; adj?: number; }

export interface IntegrityMessage { level: 'ok' | 'warn' | 'info'; text: string; }
export interface AjeMismatch { code: string; wtb: number; register: number; diff: number; }
export interface AdjMismatch { code: string; expected: number; actual: number; }
/** PR-I2 — baris yang kode-nya tak jatuh ke kelas 1–6 (lihat `lead`). */
export interface UnclassifiedRow { code: string; name?: string; adj: number; }

export interface WtbIntegrityResult {
  /* footing — informasional */
  sumAdj: number;
  sumUnadj: number;
  footed: boolean;                 // |Σ adj| ≤ tol
  netIncome: number;               // laba berjalan (Rp penuh)
  footingExplainedByIncome: boolean; // Σ adj ≈ −laba (pra-tutup, normal)
  /* rekonsiliasi neraca — gerbang */
  assets: number;
  liabilities: number;
  equity: number;
  bsDiff: number;                  // aset − (liab + ekuitas)
  bsTied: boolean;                 // |bsDiff| ≤ tol ATAU ≈ laba berjalan
  bsExplainedByIncome: boolean;    // |bsDiff − laba| ≤ tol
  /* adj = unadj + aje — gerbang */
  adjConsistent: boolean;
  adjMismatches: AdjMismatch[];
  /* PR-I2 — saldo yang TIDAK MASUK klasifikasi apa pun — gerbang.
     `lead()` mengenali kelas dari karakter pertama kode; baris di luar 1–6 tidak
     ditambahkan ke assets/liabilities/equity/revenue/expenses, sehingga ia lenyap dari
     rekonsiliasi neraca tanpa jejak: `bsDiff` tetap 0 dan status dulu terbaca `ok`
     meski nilainya besar. Pemetaan CoA membiarkan kode klien apa adanya bila belum
     dipetakan (wtb_mapping.applyMapping), jadi pada TB klien nyata inilah keadaan
     bawaan sepanjang onboarding — bukan kasus tepi. */
  unclassified: UnclassifiedRow[];
  unclassifiedTotal: number;       // Σ adj baris tak terklasifikasi (bertanda)
  allClassified: boolean;
  /* PR-4d — laba berjalan tercatat ganda: neraca PAS (saldo laba sudah menyerap laba)
     SEKALIGUS Σ adjusted = −laba (akun L/R masih terbuka). Dua kondisi ini tak bisa
     benar bersamaan pada TB yang koheren; masing-masing tampak wajar bila dinilai
     sendiri-sendiri, sehingga dulu lolos sebagai status OK dan residunya diserap FSGEN
     ke baris plug "mutasi RE bukan dari laba berjalan". */
  incomeDoubleCounted: boolean;
  /* rekonsiliasi AJE vs register — gerbang */
  wtbAjeSum: number;
  ajeBalanced: boolean;            // |Σ aje kolom| ≤ tol
  registerReconciled: boolean;     // kolom aje ≡ proyeksi register (per akun)
  ajeMismatches: AjeMismatch[];
  /* ringkasan graduated */
  status: 'ok' | 'attention';
  /* PR-I1 — ADA peringatan yang belum dijawab, terlepas dari lolos-tidaknya gerbang.
     `status` menjawab "boleh finalisasi?"; `hasWarn` menjawab "ada yang perlu dilihat?".
     Keduanya BEDA pertanyaan, dan indikator visual harus memakai yang kedua — lihat
     catatan di dekat `gatesPass`. Secara konstruksi hasWarn ⊇ (status === 'attention'):
     setiap kriteria gerbang yang gagal juga menerbitkan pesan `warn`, sedangkan
     sebaliknya tidak berlaku (mis. `incomeDoubleCounted`). */
  hasWarn: boolean;
  messages: IntegrityMessage[];
  tol: number;
}

/* Proyeksi register AJE → delta per akun (Dr +, Cr −). Mendukung dua bentuk:
   terstruktur (`lines:[{code,debit,credit}]`) atau ringkas (`dr`/`cr` + `amount`). */
export function ajeRegisterByAccount(aje: IntegrityAjeEntry[]): Map<string, number> {
  const m = new Map<string, number>();
  const add = (code: string, v: number) => { if (code) m.set(code, (m.get(code) || 0) + v); };
  for (const a of aje) {
    if (Array.isArray(a.lines) && a.lines.length) {
      for (const ln of a.lines) add(ln.code, (ln.debit || 0) - (ln.credit || 0));
    } else if (a.dr && a.cr && a.amount != null) {
      add(a.dr.split(/\s+/)[0], a.amount);
      add(a.cr.split(/\s+/)[0], -a.amount);
    }
  }
  return m;
}

const num = (v: number | undefined) => (v == null ? 0 : v);
const lead = (code: string) => (code || '').replace(/\s/g, '').charAt(0);

export interface IntegrityOptions { tolerancePct?: number; toleranceFloor?: number; }

export function checkWtbIntegrity(
  rows: IntegrityWtbRow[],
  aje: IntegrityAjeEntry[] = [],
  opts: IntegrityOptions = {},
): WtbIntegrityResult {
  const tolerancePct = opts.tolerancePct != null ? opts.tolerancePct : 0.0001; // 0,01%
  const toleranceFloor = opts.toleranceFloor != null ? opts.toleranceFloor : 1000;

  let assets = 0, liabilities = 0, equity = 0, revMag = 0, expenses = 0;
  let sumAdj = 0, sumUnadj = 0, wtbAjeSum = 0;
  const adjMismatches: AdjMismatch[] = [];
  const unclassified: UnclassifiedRow[] = [];
  const wtbAjeByAccount = new Map<string, number>();

  for (const r of rows) {
    const unadj = num(r.unadj), ajeV = num(r.aje);
    const adj = r.adj != null ? r.adj : unadj + ajeV;
    sumAdj += adj; sumUnadj += unadj; wtbAjeSum += ajeV;
    wtbAjeByAccount.set(r.code, (wtbAjeByAccount.get(r.code) || 0) + ajeV);
    const expected = unadj + ajeV;
    if (Math.abs(adj - expected) > 0.5) adjMismatches.push({ code: r.code, expected, actual: adj });
    const k = lead(r.code);
    if (k === '1') assets += adj;
    else if (k === '2') liabilities += -adj;
    else if (k === '3') equity += -adj;
    else if (k === '4') revMag += -adj;
    else if (k === '5' || k === '6') expenses += adj;
    /* PR-I2 — sisanya TIDAK diam-diam diabaikan lagi. */
    else unclassified.push({ code: r.code, name: r.name, adj });
  }

  const netIncome = revMag - expenses;
  const tol = Math.max(toleranceFloor, Math.abs(assets) * tolerancePct);

  const footed = Math.abs(sumAdj) <= tol;
  const footingExplainedByIncome = Math.abs(sumAdj + netIncome) <= tol;

  const bsDiff = assets - (liabilities + equity);
  const bsExplainedByIncome = Math.abs(bsDiff - netIncome) <= tol;
  const bsTied = Math.abs(bsDiff) <= tol || bsExplainedByIncome;

  const adjConsistent = adjMismatches.length === 0;

  unclassified.sort((a, b) => Math.abs(b.adj) - Math.abs(a.adj));
  const unclassifiedTotal = unclassified.reduce((a, r) => a + r.adj, 0);
  const allClassified = unclassified.length === 0;

  /* PR-4d — pola mustahil: neraca seimbang TANPA menutup laba (bsDiff ≈ 0 → ekuitas sudah
     memuat laba) padahal akun L/R masih terbuka (Σ adj ≈ −laba). TB pra-tutup yang koheren
     ber-Σ adj = 0 DAN bsDiff = laba; TB pasca-tutup ber-Σ adj = 0 DAN bsDiff = 0. Kombinasi
     ini bukan keduanya → laba dihitung dua kali. */
  const incomeDoubleCounted = Math.abs(netIncome) > tol
    && Math.abs(bsDiff) <= tol
    && footingExplainedByIncome
    && !footed;

  const ajeBalanced = Math.abs(wtbAjeSum) <= tol;
  const reg = ajeRegisterByAccount(aje);
  const ajeMismatches: AjeMismatch[] = [];
  const codes = new Set<string>([...wtbAjeByAccount.keys(), ...reg.keys()]);
  for (const code of codes) {
    const w = wtbAjeByAccount.get(code) || 0;
    const rg = reg.get(code) || 0;
    if (Math.abs(w - rg) > tol) ajeMismatches.push({ code, wtb: w, register: rg, diff: w - rg });
  }
  ajeMismatches.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const registerReconciled = ajeMismatches.length === 0;

  const messages: IntegrityMessage[] = [];
  // footing (info)
  if (footed) messages.push({ level: 'ok', text: 'Neraca saldo ter-foot (debit = kredit, Σ adjusted = 0).' });
  else if (incomeDoubleCounted) messages.push({ level: 'warn', text: `Laba berjalan tampaknya TERCATAT DUA KALI: neraca sudah pas (saldo laba memuat laba ${fmtRp(netIncome)}) padahal akun laba-rugi masih terbuka. TB pra-tutup yang koheren ber-Σ adjusted = 0 dengan selisih neraca = laba; di sini keduanya tak terpenuhi. Periksa saldo laba & pos penutup.` });
  else if (footingExplainedByIncome) messages.push({ level: 'info', text: 'Σ adjusted ≠ 0 sebesar laba berjalan — normal untuk TB pra-tutup (laba belum ditutup ke saldo laba).' });
  else messages.push({ level: 'warn', text: 'Σ adjusted tidak nol dan tak setara laba berjalan — kemungkinan akun hilang atau salah tanda.' });
  // neraca (gate)
  if (Math.abs(bsDiff) <= tol) messages.push({ level: 'ok', text: 'Neraca seimbang — aset = liabilitas + ekuitas.' });
  else if (bsExplainedByIncome) messages.push({ level: 'info', text: 'Selisih neraca ≈ laba berjalan (wajar untuk TB pra-tutup; ditutup ke ekuitas pada penyajian LK).' });
  else messages.push({ level: 'warn', text: 'Neraca tidak seimbang — periksa pemetaan/akun.' });
  // saldo tak terklasifikasi (gate) — PR-I2
  if (!allClassified) messages.push({ level: 'warn', text: `${unclassified.length} akun tak dapat diklasifikasikan (Σ ${fmtRp(unclassifiedTotal)}) — kodenya tidak diawali 1–6, sehingga saldonya TIDAK masuk rekonsiliasi neraca. Petakan ke CoA standar sebelum menyimpulkan; selama belum, neraca yang "seimbang" tidak menjumlahkan seluruh TB.` });
  // adj consistency (gate)
  if (!adjConsistent) messages.push({ level: 'warn', text: `${adjMismatches.length} akun: adjusted ≠ unadjusted + AJE.` });
  // aje recon (gate)
  if (!ajeBalanced) messages.push({ level: 'warn', text: `Kolom AJE belum seimbang (Σ = ${fmtRp(wtbAjeSum)}) — jurnal penyesuaian tampaknya tak berpasangan penuh di WTB.` });
  if (!registerReconciled) messages.push({ level: 'warn', text: `${ajeMismatches.length} akun: kolom AJE WTB tak selaras dengan register AJE.` });
  if (ajeBalanced && registerReconciled) messages.push({ level: 'ok', text: 'AJE tersinkron dengan register (seimbang & tie per akun).' });

  /* CATATAN KEPUTUSAN (PR-4d): `incomeDoubleCounted` SENGAJA belum ikut menentukan status.
     `status === 'ok'` memberi makan `wtbIntegrityOk` pada gerbang finalisasi
     (engagement_phase_gate), sehingga menjadikannya pemblokir akan langsung mengunci
     finalisasi pada perikatan yang datanya berpola ini — termasuk seed demo. Temuannya
     tetap ditegakkan sebagai peringatan menonjol di panel Integritas.
     PR-I1 memisahkan "boleh finalisasi" dari "ada yang perlu dilihat" (`hasWarn`), dan
     PR-I3 Fase D KINI MENYALAKAN pemblokirnya — setelah seed dibereskan lebih dulu
     (3-2100 jadi saldo laba awal, PKL berdiri sebagai akun 3-3100), sehingga perikatan
     demo lolos karena datanya benar, bukan karena gerbangnya dilonggarkan. Urutan
     terbalik akan mengunci finalisasi pada demo dan mengajari pengguna mengabaikan
     gerbang — pelajaran PR-6c. Rencana penuh: docs/prd-wtb-integrity-falsifiable-gates.md */
  /* PR-I2 — `allClassified` IKUT MEMBLOK (keputusan Ari, PRD §11 Q2): saldo yang tak dapat
     diklasifikasikan tidak dapat diaudit, dan membiarkannya lolos berarti menerbitkan
     "neraca seimbang" atas TB yang tidak dijumlah seluruhnya. */
  const gatesPass = bsTied && adjConsistent && ajeBalanced && registerReconciled && allClassified
    && !incomeDoubleCounted;
  const status: 'ok' | 'attention' = gatesPass ? 'ok' : 'attention';

  /* PR-I1 — sinyal yang DITAMPILKAN diturunkan dari sini, bukan dari `status`. Dulu chip
     & badge memakai `status`, sehingga TB yang memicu `incomeDoubleCounted` — atau footing
     yang anomali, yang memang tak pernah masuk gerbang — tampil HIJAU "Integritas OK" di
     atas panel yang tepat di bawahnya memuat peringatan material. Satu keadaan, dua sinyal
     berlawanan; auditor yang tak membuka panel hanya melihat yang hijau. */
  const hasWarn = messages.some(m => m.level === 'warn');

  return {
    sumAdj, sumUnadj, footed, netIncome, footingExplainedByIncome,
    assets, liabilities, equity, bsDiff, bsTied, bsExplainedByIncome,
    adjConsistent, adjMismatches, incomeDoubleCounted,
    unclassified, unclassifiedTotal, allClassified,
    wtbAjeSum, ajeBalanced, registerReconciled, ajeMismatches,
    status, hasWarn, messages, tol,
  };
}

function fmtRp(n: number): string {
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '(' : 'Rp ') + s + (neg ? ')' : '');
}
