/* ============================================================
   Asseris — DEKLARASI INDEPENDENSI: RANTAI PERSETUJUAN (SSOT)
   ------------------------------------------------------------
   Modul MURNI (tanpa React/`window`/DOM). Ia memegang tiga hal yang sebelumnya
   hidup sebagai kode sebaris di `view_people.tsx` dan karena itu tak dapat diuji:

     1. kelayakan sebuah lapis persetujuan (SIAPA boleh mengisi lapis MANA),
     2. pembuatan id ancaman independensi,
     3. derivasi kelayakan pengakuan rotasi.

   MENGAPA INI ADA. Bentuk lama menulis `steps[n - 1] = { by: me }` untuk `n`
   berapa pun tanpa memeriksa siapa `me`. Komentar di atasnya menyatakan maksud
   rantainya — "self → reviu manajer etika → persetujuan partner" — tetapi kode
   tidak menegakkan satu pun dari tiga peran itu, dan tidak mencegah satu orang
   mengisi ketiganya berturut-turut. Untuk deklarasi independensi, rantai tanpa
   pemisahan peran menghapus seluruh maknanya: yang tercatat hanyalah bahwa
   seseorang menekan tombol tiga kali.

   ATURAN YANG DITEGAKKAN — sengaja sejajar dengan `aje_approval.stepAuthority`
   (rantai persetujuan jurnal), BUKAN mekanisme keempat:
     · identitas pelaku harus NYATA (sesi → roster). Tak terpetakan = tak menulis;
       jejak yang pelakunya bernama "Auditor" bukan jejak.
     · lapis 1 terikat IDENTITAS, bukan kapabilitas: deklarasi mandiri hanya dapat
       ditandatangani oleh yang bersangkutan — semantik yang sama dengan jalur
       server `personalSelfService.declareSelf` dan dengan Deklarasi Kode Etik
       (`view_pc_conduct.canSignOwn`).
     · lapis 2 & 3 terikat KAPABILITAS RBAC (SSOT `rbac.ts`), bukan string peran.
     · SATU ORANG, SATU LAPIS. Kapabilitas bukan identitas: seorang rekan memegang
       `hr.manage` DAN `firm.admin` sekaligus, sehingga tanpa aturan ini ia lolos
       di lapis 2 lalu lapis 3 pada deklarasi yang SAMA. (Aturan & alasan yang
       sama persis dengan PR-E rantai AJE / SMM 2 · SA 220.36.)
     · yang dideklarasikan tak boleh mereviu/menyetujui deklarasinya sendiri.

   MENGAPA `aje_approval.stepAuthority` TIDAK DIPANGGIL LANGSUNG: ia menolak
   self-approval pada SETIAP langkah, sedangkan di rantai ini lapis 1 memang
   HARUS diisi diri sendiri. Yang dipakai ulang adalah aturannya dan bentuk
   kembaliannya (`{ ok, reason }`), bukan fungsinya.

   PENEGAKAN SERVER. Tulisan ke `independence` · `indepAppr` · `indepThreats` ·
   `indepRotAck` di-gate `HR_MANAGE` (rbac.ts `capForWrite`). Gerbang di modul ini
   LEBIH KETAT daripada server (lapis 3 menuntut `FIRM_ADMIN`, lapis 1 menuntut
   identitas), jadi ia tak dapat melahirkan kelas penolakan-senyap yang baru.
   Pemisahan tugas per-lapis BELUM ada di server — lihat laporan PR.
   ============================================================ */
import { CAP, can as rbacCan } from './rbac';
import { rotTier } from './data_licensing';

/** Periode deklarasi independensi berjalan (tahun audit). Sumber tunggal label
 *  periode untuk register, drawer, dan stempel pada jejak persetujuan. */
export const INDEP_PERIOD = 'TA 2026';

/** Satu tanda tangan yang benar-benar tercatat pada sebuah lapis. */
export interface IndepStep {
  /** Nama pelaku dari sesi (bukan fallback). */
  by: string;
  /** Id pengguna sesi — pengikat jejak yang tak bergantung ejaan nama. */
  byUserId?: string;
  /** Id pegawai pelaku (roster). */
  byEmpId?: string;
  /** Tanggal klok SSOT (`AMS.TODAY`, ISO). */
  at: string;
}

/** Jejak persetujuan satu orang. Bentuk lama = number (level saja, tanpa siapa/kapan). */
export interface IndepApprRec {
  level: number;
  steps: Array<IndepStep | undefined>;
  period: string;
}

/** Pengguna sesi yang hendak menandatangani. */
export interface IndepActor {
  /** `auth.user.id` — id sesi. */
  userId?: string;
  /** `auth.user.name` — nama sesi. TIDAK boleh fallback. */
  name?: string;
  /** `auth.user.role` — peran RBAC. */
  role?: string;
  /** `resolveEmpId(auth.user)` — null bila sesi tak terpetakan ke roster. */
  empId?: string | null;
}

export interface IndepAuthority { ok: boolean; reason: string }

/** Definisi satu lapis rantai. `cap` = kapabilitas RBAC yang wajib dipegang;
 *  `selfBound` = lapis yang justru HARUS diisi orang yang dideklarasikan. */
export interface IndepChainStep {
  key: string;
  role: string;
  /** Label kewenangan yang dituntut — BUKAN nama orang. Bentuk lama menamai dua
   *  personel tertentu ("Anindya Pramesti", "Sari Dewanti, CPA"); salah satunya
   *  seorang Audit Manager yang tak memegang `hr.manage` sama sekali, sehingga UI
   *  menamai orang yang secara struktural tak dapat bertindak. */
  who: string;
  cap: string;
  selfBound: boolean;
}

export const INDEP_CHAIN: IndepChainStep[] = [
  { key: 'self', role: 'Personel — Deklarasi mandiri', who: 'Yang bersangkutan', cap: CAP.HR_MANAGE, selfBound: true },
  { key: 'ethics', role: 'Reviu Manajer Etika', who: 'Pemegang kewenangan SDM & Kepatuhan', cap: CAP.HR_MANAGE, selfBound: false },
  { key: 'partner', role: 'Persetujuan Ethics & Independence Partner', who: 'Rekan pemegang kewenangan firma', cap: CAP.FIRM_ADMIN, selfBound: false },
];

/** Label langkah untuk kolom "Alur Persetujuan" (indeks = level). */
export const INDEP_LEVEL_LABEL = ['Belum', 'Diajukan', 'Direviu', 'Disetujui'];

/** Normalisasi nilai mentah `indepAppr[id]` (number lama / objek / kosong) → rekaman. */
export function indepApprRecord(raw: unknown, period: string = INDEP_PERIOD): IndepApprRec {
  if (raw && typeof raw === 'object') {
    const o = raw as { level?: unknown; steps?: unknown; period?: unknown };
    const steps = Array.isArray(o.steps) ? (o.steps as Array<IndepStep | undefined>) : [];
    const level = typeof o.level === 'number' ? o.level : 0;
    return { level, steps, period: typeof o.period === 'string' ? o.period : period };
  }
  return { level: typeof raw === 'number' ? raw : 0, steps: [], period };
}

/** Banyaknya lapis TERATRIBUSI berturut-turut dari awal (tanda tangan bernama). */
function signedPrefix(steps: Array<IndepStep | undefined>): number {
  let n = 0;
  while (n < INDEP_CHAIN.length) {
    const s = steps[n];
    if (!s || !s.by) break;
    n++;
  }
  return n;
}

/** Level rantai yang BERLAKU.
 *
 *  `declared` (kotak "Deklarasi Tahunan" pada baris register / hasil
 *  `personalSelfService.declareSelf`) menandakan LAPIS 1 saja. Bentuk lama
 *  memetakannya ke level 3 — sehingga setiap baris seed yang `declared:true`
 *  tampil "Disetujui" dengan tiga balok hijau dan tiga langkah "✓ Selesai"
 *  tanpa seorang pun pernah mereviu atau menyetujuinya. Itu bukan rantai yang
 *  lemah; itu rantai yang dikarang. */
export function indepLevel(rec: IndepApprRec, declared: boolean): number {
  const attributed = signedPrefix(rec.steps);
  const claimed = Math.max(0, Math.min(INDEP_CHAIN.length, rec.level));
  const base = Math.max(attributed, claimed);
  return Math.max(base, declared ? 1 : 0);
}

/** True bila level yang berlaku melampaui lapis yang benar-benar teratribusi —
 *  rekaman bentuk lama / deklarasi mandiri tanpa tanda tangan. TIDAK dihapus
 *  (persetujuan yang pernah tercatat bukan milik kita untuk dicabut) tetapi
 *  TIDAK boleh diklaim terverifikasi. Sejajar penanda `legacy` rantai AJE. */
export function indepUnattributed(rec: IndepApprRec, declared: boolean): boolean {
  return indepLevel(rec, declared) > signedPrefix(rec.steps);
}

function sameActor(step: IndepStep | undefined, actor: IndepActor): boolean {
  if (!step) return false;
  if (step.byEmpId && actor.empId) return step.byEmpId === actor.empId;
  if (step.byUserId && actor.userId) return step.byUserId === actor.userId;
  return !!step.by && !!actor.name && step.by === actor.name;
}

/** Boleh-kah `actor` mengisi lapis `stepIndex` pada deklarasi milik `rowId`? */
export function indepStepAuthority(args: {
  stepIndex: number;
  rec: IndepApprRec;
  declared: boolean;
  rowId: string;
  actor: IndepActor;
}): IndepAuthority {
  const { stepIndex, rec, declared, rowId, actor } = args;
  const def = INDEP_CHAIN[stepIndex];
  if (!def) return { ok: false, reason: 'Lapis persetujuan tidak dikenal.' };

  const level = indepLevel(rec, declared);
  if (stepIndex !== level) {
    return {
      ok: false,
      reason: stepIndex < level
        ? `Lapis "${def.role}" sudah terlewati; rantai tidak dapat diisi mundur.`
        : `Lapis "${def.role}" belum giliran — lapis sebelumnya harus selesai lebih dulu.`,
    };
  }

  /* Identitas SEBELUM kapabilitas: aksi tulis yang tak dapat diatribusikan tidak
     dilakukan sama sekali, bukan dicatat atas nama fallback. */
  if (!actor.empId || !actor.name) {
    return { ok: false, reason: 'Identitas sesi tidak terpetakan ke personel firma — tanda tangan tidak dapat diatribusikan, jadi tidak dibubuhkan.' };
  }

  if (def.selfBound) {
    if (actor.empId !== rowId) {
      return { ok: false, reason: 'Deklarasi independensi adalah pernyataan pribadi — hanya yang bersangkutan dapat menandatanganinya.' };
    }
  } else if (actor.empId === rowId) {
    return { ok: false, reason: `Anda tidak dapat mengisi lapis "${def.role}" atas deklarasi Anda sendiri (pemisahan tugas).` };
  }

  /* SATU ORANG, SATU LAPIS. Hanya lapis TERATRIBUSI yang dihitung: level bentuk
     lama tak menyebut penanda tangan, jadi ia tak dapat membuktikan pemisahan —
     dan tak dapat pula memalsukannya. */
  for (let i = 0; i < stepIndex; i++) {
    if (sameActor(rec.steps[i], actor)) {
      return {
        ok: false,
        reason: `Anda telah menandatangani lapis "${INDEP_CHAIN[i].role}" pada deklarasi ini; satu orang tidak dapat mengisi dua lapis (pemisahan tugas).`,
      };
    }
  }

  if (!rbacCan(actor.role, def.cap)) {
    return { ok: false, reason: `Lapis "${def.role}" memerlukan kapabilitas ${def.cap}; peran ${actor.role || '—'} tidak memilikinya.` };
  }
  return { ok: true, reason: '' };
}

/** Gerbang tulis modul: seluruh dokumen independensi di-gate `HR_MANAGE` server-side.
 *  Dipakai UI untuk TIDAK MENAWARKAN aksi yang server pasti tolak. */
export function indepCanWrite(actor: IndepActor): boolean {
  return rbacCan(actor.role, CAP.HR_MANAGE);
}

/** Identitas pelaku siap-tulis, atau null bila sesi tak terpetakan. */
export function indepStamp(actor: IndepActor, today: string): IndepStep | null {
  if (!actor.empId || !actor.name) return null;
  return { by: actor.name, byUserId: actor.userId, byEmpId: actor.empId, at: today };
}

/* ---------------- Register ancaman (IESBA 120) ---------------- */

/** Id ancaman berikutnya untuk `personId`, dijamin unik terhadap SELURUH daftar.
 *
 *  Bentuk lama memakai `list.length + 1` — panjang SELURUH daftar, bukan milik
 *  orang itu. Hapus satu ancaman lalu tambah lagi dan id terulang; patch serta
 *  tanda tangan mitigasi kemudian mendarat pada ancaman yang salah. Nomor di sini
 *  MONOTON per orang (max + 1), jadi id yang pernah dipakai tidak didaur ulang. */
export function nextThreatId(list: ReadonlyArray<{ id: string }>, personId: string): string {
  const base = 'TH-' + personId + '-';
  const taken = new Set(list.map((t) => t.id));
  let n = 0;
  for (const t of list) {
    if (!t.id.startsWith(base)) continue;
    const suffix = Number(t.id.slice(base.length));
    if (Number.isInteger(suffix) && suffix > n) n = suffix;
  }
  let next = n + 1;
  while (taken.has(base + next)) next++;
  return base + next;
}

/* ---------------- Rotasi & cooling-off ---------------- */

export interface IndepRotRow { rotationClient?: string; tenure: number; rotationLimit: number }

/** Perlukah baris ini memberi pengakuan rotasi & tindak lanjut?
 *  Ambangnya DITURUNKAN dari `rotTier` (SSOT), bukan diketik ulang: relevan
 *  begitu tier meninggalkan 'ok' (warn ≤1 th · alert ≤6 bln · due). */
export function indepRotationAckRelevant(row: IndepRotRow): boolean {
  if (!row || row.rotationClient === '—' || !row.rotationClient) return false;
  return rotTier(row.tenure, row.rotationLimit) !== 'ok';
}

/* ---------------- Tanggal ---------------- */

const ID_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Label tanggal jejak. Menerima ISO (klok SSOT) dan MELEWATKAN apa adanya nilai
 *  bentuk lama yang sudah terlokalisasi ("21 Agt 2026") agar rekaman lama tetap
 *  terbaca. Tanpa `new Date()` — modul ini tak pernah membaca jam sistem. */
export function indepDateLabel(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  return `${m[3]} ${ID_MONTH[Number(m[2]) - 1] || m[2]} ${m[1]}`;
}
