/* ============================================================
   Asseris — mesin turunan PROPERTI INVESTASI (PSAK 13 / IAS 40).

   Modul `invprop` dulu membawa sub-ledger privatnya sendiri: `IP_PORTFOLIO`,
   `IP_ROLL`, `IP_PL`, `IP_SENS` — empat konstanta di dalam view, dengan komentar
   yang menyebut salah satunya "sub-ledger kanonik modul". Akun kanoniknya sudah
   ada di neraca saldo per-perikatan selama ini (`1-2600` Properti Investasi,
   `4-1500` Pendapatan Sewa Properti Investasi), dan angka yang dipakai modul
   berbeda dua orde besaran darinya: saldo akhir 15.748 jt vs 272.400 jt yang
   benar-benar dibukukan pada ENG-2025-063.

   Yang paling menipu bukan selisihnya, melainkan badge `tie: close === fvSum`.
   `close` diturunkan dari IP_ROLL dan `fvSum` dari IP_PORTFOLIO — dua konstanta
   yang memang DISETEL agar sama, sampai-sampai komentarnya menuliskan hasilnya
   lebih dulu. Badge itu tak pernah dapat memerah: ia melaporkan kesamaan dua
   literal, bukan penutupan sebuah rekonsiliasi.

   ATURAN LINGKUP BERKAS INI:

   1. Saldo (awal · akhir · pendapatan sewa) BERASAL DARI NERACA SALDO. Tidak ada
      literal besaran di sini.
   2. Mutasi roll-forward (penambahan · keuntungan nilai wajar · pelepasan) TIDAK
      ADA di neraca saldo — ia detail sub-ledger. Karena itu ia MASUKAN auditor,
      dan default-nya NOL, bukan angka yang membuat roll-forward kebetulan
      menutup. Pada seed ENG-2025-063 default itu membuat rekonsiliasi MEMERAH
      dengan selisih 24.400 jt — dan memang begitu keadaannya: mutasinya belum
      pernah diaudit.
   3. Detail per-properti & analisis sensitivitas TIDAK PUNYA SUMBER KANONIK di
      repo ini sama sekali (dicek: `IP-01`/`Menara Sentosa`/`Sentosa Plaza` nol
      hasil di luar view lama). Keduanya lahir KOSONG. Mesin ini membantah
      ketiadaannya lewat `empty`, bukan mengisinya.

   PERANGKAP SINGLETON — `wtbRows()` di canon_base jatuh ke `AMS.WTB` ketika
   `wtb.length === 0` (larik kosong pun falsy di sana). Artinya `wtbVal([], …)`
   diam-diam meminjam neraca saldo ENG-2025-014. Keberadaan akun di sini
   ditentukan atas larik YANG DIBERIKAN (`hasCode`), dan `reportedBalance` hanya
   dipanggil setelah barisnya terbukti ada di larik itu — sehingga fallback-nya
   tak pernah dapat menyala.
   ============================================================ */
import { jt, reportedBalance } from './canon_base';
import { RF_TOLERANCE } from './canon_fv_disclosure';
import type { WTB } from './canon_types';

/** Akun buku besar properti investasi (model nilai wajar, PSAK 13 ¶33). */
export const IP_ACCOUNT = '1-2600';
/** Akun pendapatan sewa properti investasi (¶75(f)(i)). */
export const IP_RENT_ACCOUNT = '4-1500';

/* Bentuk register AJE mengikuti `reportedBalance` agar tak ada tipe kembar yang
   dapat menyimpang darinya. */
type AjeArg = Parameters<typeof reportedBalance>[1];

const num = (n: number | null | undefined): number => (typeof n === 'number' && isFinite(n) ? n : 0);

/* ---------- saldo dari neraca saldo ---------- */

export interface InvPropGl {
  /** ada baris `1-2600` di neraca saldo perikatan ini */
  present: boolean;
  /** ada baris `4-1500` di neraca saldo perikatan ini */
  rentPresent: boolean;
  /** saldo awal — komparatif audited tahun lalu (kolom `ly`), Rp juta */
  open: number;
  /** saldo akhir basis DILAPORKAN (dibukukan + jurnal terposting), Rp juta */
  close: number;
  /** pendapatan sewa basis DILAPORKAN, positif, Rp juta */
  rental: number;
}

function hasCode(rows: WTB, code: string): boolean {
  return rows.some(r => !!r && r.code === code);
}

function lyOf(rows: WTB, code: string): number {
  const r = rows.find(x => !!x && x.code === code);
  return r ? num(r.ly) : 0;
}

/** Saldo properti investasi milik PERIKATAN INI. Bebas fallback singleton. */
export function invpropGl(wtb: WTB | undefined, aje?: AjeArg): InvPropGl {
  const rows: WTB = Array.isArray(wtb) ? wtb : [];
  const present = hasCode(rows, IP_ACCOUNT);
  const rentPresent = hasCode(rows, IP_RENT_ACCOUNT);
  return {
    present,
    rentPresent,
    open: present ? jt(lyOf(rows, IP_ACCOUNT)) : 0,
    close: present ? jt(reportedBalance(rows, aje, IP_ACCOUNT)) : 0,
    /* pendapatan berkonvensi kredit (negatif) di neraca saldo → dibalik */
    rental: rentPresent ? -jt(reportedBalance(rows, aje, IP_RENT_ACCOUNT)) : 0,
  };
}

/* ---------- roll-forward ¶76 ---------- */

/** Mutasi tahun berjalan — MASUKAN auditor (tak ada di neraca saldo). Rp juta. */
export interface InvPropMovements {
  additions: number;
  fvGain: number;
  disposals: number;
}

export const IP_MOVEMENTS_EMPTY: InvPropMovements = { additions: 0, fvGain: 0, disposals: 0 };

export interface InvPropRoll {
  open: number;
  additions: number;
  fvGain: number;
  disposals: number;
  /** saldo akhir menurut roll-forward */
  computed: number;
  /** saldo akhir menurut buku besar */
  gl: number;
  diff: number;
  tie: boolean;
  /** belum ada satu pun mutasi yang diaudit */
  empty: boolean;
}

/** Rekonsiliasi nilai tercatat (¶76): awal (komparatif WTB) + mutasi (auditor)
 *  DIBANDINGKAN saldo akhir buku besar. Dua sisi, dua sumber — bukan A == A. */
export function invpropRollForward(gl: InvPropGl, mv: InvPropMovements | null | undefined): InvPropRoll {
  const m = mv || IP_MOVEMENTS_EMPTY;
  const additions = num(m.additions);
  const fvGain = num(m.fvGain);
  const disposals = num(m.disposals);
  const computed = gl.open + additions + fvGain - disposals;
  const diff = computed - gl.close;
  return {
    open: gl.open, additions, fvGain, disposals,
    computed, gl: gl.close, diff,
    tie: Math.abs(diff) <= RF_TOLERANCE,
    empty: additions === 0 && fvGain === 0 && disposals === 0,
  };
}

/* ---------- sub-ledger per-properti ---------- */

export interface InvPropProperty {
  id: string;
  name: string;
  use: string;
  city: string;
  /** nilai wajar, Rp juta */
  fv: number;
  /** luas, m² — 0 bila tak diisi */
  area: number;
  /** imbal hasil ekuivalen, % — null untuk properti tanpa sewa (mis. tanah) */
  yieldPct: number | null;
  /** tingkat hunian, fraksi 0..1 — null untuk properti tanpa sewa */
  occ: number | null;
  /** hierarki nilai wajar PSAK 68 */
  level: number;
}

export interface InvPropSubledger {
  /** total kontrol sub-ledger, Rp juta */
  sub: number;
  /** saldo buku besar `1-2600` basis dilaporkan, Rp juta */
  gl: number;
  diff: number;
  ok: boolean;
  empty: boolean;
}

/** Total kontrol sub-ledger ↔ buku besar. Sub-ledger KOSONG tidak pernah `ok`:
 *  0 == 0 adalah kelolosan hampa, bukan rekonsiliasi yang menutup. */
export function invpropSubledger(props: InvPropProperty[] | null | undefined, glClose: number): InvPropSubledger {
  const list = Array.isArray(props) ? props : [];
  const sub = list.reduce((a, p) => a + num(p && p.fv), 0);
  const diff = sub - glClose;
  return {
    sub, gl: glClose, diff,
    ok: list.length > 0 && Math.abs(diff) <= RF_TOLERANCE,
    empty: list.length === 0,
  };
}

/* ---------- pengungkapan laba rugi ¶75(f) & sensitivitas ¶93(h)(ii) ---------- */

export interface InvPropSens {
  id: string;
  k: string;
  /** dampak terhadap nilai wajar, Rp juta (boleh negatif) */
  impact: number;
  note: string;
}

/** Beban operasi langsung ¶75(f)(ii)–(iii). MASUKAN auditor; `entered` eksplisit
 *  karena nol yang diisi dan nol yang belum diisi adalah dua pernyataan berbeda. */
export interface InvPropOpex {
  rented: number;
  vacant: number;
  entered: boolean;
}

export interface InvPropDoc {
  movements: InvPropMovements;
  properties: InvPropProperty[];
  sens: InvPropSens[];
  opex: InvPropOpex;
}

export const IP_DOC_EMPTY: InvPropDoc = {
  movements: { additions: 0, fvGain: 0, disposals: 0 },
  properties: [],
  sens: [],
  opex: { rented: 0, vacant: 0, entered: false },
};

/** Hasil operasi neto (¶75(f)) — `null` selama beban operasi langsung belum diisi.
 *  Nol bukan pengganti yang sah untuk "belum diketahui". */
export function invpropNoi(gl: InvPropGl, opex: InvPropOpex | null | undefined): number | null {
  if (!gl.rentPresent) return null;
  if (!opex || !opex.entered) return null;
  return gl.rental - num(opex.rented);
}

/** Normalisasi dokumen tersimpan: bentuk lama/parsial tak boleh merobohkan modul. */
export function invpropDoc(raw: Partial<InvPropDoc> | null | undefined): InvPropDoc {
  const d = raw || {};
  const mv = d.movements || IP_DOC_EMPTY.movements;
  const ox = d.opex || IP_DOC_EMPTY.opex;
  return {
    movements: { additions: num(mv.additions), fvGain: num(mv.fvGain), disposals: num(mv.disposals) },
    properties: Array.isArray(d.properties) ? d.properties : [],
    sens: Array.isArray(d.sens) ? d.sens : [],
    opex: { rented: num(ox.rented), vacant: num(ox.vacant), entered: !!ox.entered },
  };
}
