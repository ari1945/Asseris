/* ============================================================
   Program E — Ledger-based Reporting: komputasi saldo GL firma
   dari jurnal terposting (bukan seed statis).

   P0 (eval E-9/B1): posting jurnal TIDAK mengubah Neraca Saldo /
   Laporan Keuangan karena TB/LK dibaca langsung dari `coa[].bal`
   (seed). Util ini menurunkan saldo SEMUA akun dari jurnal:

     saldoAwal(code) = seedBal(code) − Σ efek jurnal SEED terposting
     saldoKini(code) = saldoAwal(code) + Σ efek jurnal terposting KINI

   `seedGl` = kumpulan jurnal yang postingsnya SUDAH termuat di
   `coa[].bal` (di app: AMS.FIRM_GL — jurnal demo). Saldo awal
   dianker ke seedGl SEKALI (bukan ke gl berjalan) supaya memposting
   / membatalkan jurnal benar-benar menggeser saldo kini — bila saldo
   awal ikut dihitung dari gl berjalan, kedua efek saling meniadakan
   dan posting kembali tak berdampak (jebakan yang tertangkap test).

   Dengan definisi itu, saat app baru dimuat (gl == seedGl) saldo
   kini == seed → tampilan identik, tanpa migrasi data.

   Konvensi tanda (konsisten dgn seed FIRM_COA): bal > 0 = saldo
   normal Debit, bal < 0 = saldo normal Kredit. Jurnal: `dr` = akun
   didebit (+), `cr` = akun dikredit (−).

   Murni (tanpa React/DOM/window) → dapat diuji unit.
   ============================================================ */

export interface CoaAccount {
  code: string;
  name: string;
  type: string;
  /** Saldo seed (posisi yang SUDAH mencakup jurnal demo terposting). */
  bal: number;
}

export interface GlJournal {
  id: string;
  date?: string;
  desc?: string;
  dr: string;
  cr: string;
  amount: number;
  posted?: boolean;
}

/* ------------------------------------------------------------------
   Penyembuhan cache basi (PRD budget-actual-ledger-derived, Bagian B).

   Saldo awal dianker ke `seedGl` — yang SELALU kode terbaru — sedangkan `gl`
   dibaca dari localStorage dan bisa TERTINGGAL. Begitu jurnal seed ditambahkan,
   keduanya tak lagi sepadan: saldo awal sudah dikurangi efek jurnal baru, tetapi
   efek itu tak pernah ditambahkan kembali karena jurnalnya tak ada di daftar
   tersimpan. Akibatnya terukur pada demo ini: pengguna yang pernah membuka Firm GL
   melihat Pendapatan anjlok 11.300 → 8.450 jt dan WIP 9.300 → 8.090 jt — neraca
   tetap "seimbang", jadi tak ada gerbang yang berbunyi.

   Ini bukan cacat satu rilis: SETIAP penambahan jurnal seed berikutnya akan
   meledakkannya lagi. Karena itu diperbaiki di sumbernya, bukan dengan menghapus
   kunci persist.

   Suntingan pengguna dipertahankan: entri tersimpan menang (status posting yang
   dia ubah tidak ditimpa); hanya jurnal seed yang HILANG yang ditambahkan.
   ------------------------------------------------------------------ */
export function mergeSeedJournals(gl: GlJournal[], seedGl: GlJournal[]): GlJournal[] {
  const have = new Set((gl || []).map((j) => j.id));
  const missing = (seedGl || []).filter((j) => !have.has(j.id));
  if (!missing.length) return gl || [];
  return [...(gl || []), ...missing].sort((a, b) => +new Date(b.date || 0) - +new Date(a.date || 0));
}

/** Efek neto jurnal-jurnal terposting atas satu akun: Σ debit − Σ kredit. */
export function netEffect(gl: GlJournal[], code: string): number {
  let net = 0;
  for (const j of gl) {
    if (!j.posted) continue;
    if (j.dr === code) net += j.amount;
    if (j.cr === code) net -= j.amount;
  }
  return net;
}

/** Saldo awal tiap akun = seed − efek jurnal SEED terposting (dianker sekali). */
export function openingBalances(coa: CoaAccount[], seedGl: GlJournal[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of coa) out[a.code] = a.bal - netEffect(seedGl, a.code);
  return out;
}

/** Saldo kini tiap akun = saldo awal (dari seedGl) + efek jurnal terposting kini. */
export function currentBalances(coa: CoaAccount[], seedGl: GlJournal[], gl: GlJournal[]): Record<string, number> {
  const open = openingBalances(coa, seedGl);
  const out: Record<string, number> = {};
  for (const a of coa) out[a.code] = open[a.code] + netEffect(gl, a.code);
  return out;
}

/** Neraca saldo: baris per akun + total debit/kredit + status seimbang. */
export interface TbRow {
  code: string;
  name: string;
  type: string;
  bal: number;
}

export function trialBalance(coa: CoaAccount[], seedGl: GlJournal[], gl: GlJournal[]): {
  rows: TbRow[];
  totalDr: number;
  totalCr: number;
  balanced: boolean;
} {
  const bal = currentBalances(coa, seedGl, gl);
  const rows = coa.map((a) => ({ code: a.code, name: a.name, type: a.type, bal: bal[a.code] }));
  const totalDr = rows.filter((r) => r.bal > 0).reduce((s, r) => s + r.bal, 0);
  const totalCr = -rows.filter((r) => r.bal < 0).reduce((s, r) => s + r.bal, 0);
  return { rows, totalDr, totalCr, balanced: Math.abs(totalDr - totalCr) < 1e6 };
}

/** Laporan Laba Rugi + Neraca dari neraca saldo (double-entry ⇒ seimbang). */
export interface StatementSet {
  revenue: number;
  expense: number;
  netProfit: number;
  totAset: number;
  totLiab: number;
  totEkuitas: number;
  balanced: boolean;
}

export function statements(coa: CoaAccount[], seedGl: GlJournal[], gl: GlJournal[]): StatementSet {
  const bal = currentBalances(coa, seedGl, gl);
  const sumType = (t: string) => coa.filter((a) => a.type === t).reduce((s, a) => s + (bal[a.code] || 0), 0);
  const revenue = -sumType('Pendapatan');
  const expense = sumType('Beban');
  const netProfit = revenue - expense;
  const totAset = sumType('Aset');
  const totLiab = -sumType('Liabilitas');
  const totEkuitas = -sumType('Ekuitas') + netProfit;
  return { revenue, expense, netProfit, totAset, totLiab, totEkuitas, balanced: Math.abs(totAset - (totLiab + totEkuitas)) < 1e6 };
}

/** Buku besar satu akun: saldo berjalan dari jurnal terposting. */
export interface LedgerRow {
  id: string;
  date?: string;
  desc?: string;
  /** Akun DEBIT jurnal ini (kode COA) — dipakai view untuk menampilkan lawan akun. */
  dr: string;
  /** Akun KREDIT jurnal ini (kode COA). */
  cr: string;
  dr2: number;
  cr2: number;
  running: number;
}

export function accountLedger(coa: CoaAccount[], seedGl: GlJournal[], gl: GlJournal[], code: string): {
  acct: CoaAccount;
  opening: number;
  closing: number;
  rows: LedgerRow[];
  totalDr: number;
  totalCr: number;
} {
  const acct = coa.find((a) => a.code === code) || coa[0];
  const open = openingBalances(coa, seedGl);
  const opening = open[acct.code] || 0;
  const posts = gl
    .filter((j) => j.posted && (j.dr === acct.code || j.cr === acct.code))
    .slice()
    .sort((a, b) => +new Date(a.date || 0) - +new Date(b.date || 0));
  let movement = 0;
  let run = opening;
  const rows: LedgerRow[] = posts.map((j) => {
    const dr2 = j.dr === acct.code ? j.amount : 0;
    const cr2 = j.cr === acct.code ? j.amount : 0;
    movement += dr2 - cr2;
    run += dr2 - cr2;
    /* `dr`/`cr` IKUT DIBAWA. Tanpa keduanya, view menampilkan lawan akun lewat
       `r.dr2 ? r.cr : r.dr` yang selalu `undefined` → `acctName(undefined)`
       mengembalikan `undefined` → `.slice()` melempar dan SELURUH modul Firm GL
       gagal render. Tab "Buku Besar" karena itu mati sejak Program E (#234):
       akun default 1-100 punya mutasi, jadi crash-nya terjadi setiap kali tab
       dibuka. Tak satu pun dari 1.812 uji melihatnya — hanya peramban. */
    return { id: j.id, date: j.date, desc: j.desc, dr: j.dr, cr: j.cr, dr2, cr2, running: run };
  });
  const closing = opening + movement;
  return {
    acct,
    opening,
    closing,
    rows,
    totalDr: rows.reduce((s, l) => s + l.dr2, 0),
    totalCr: rows.reduce((s, l) => s + l.cr2, 0),
  };
}
