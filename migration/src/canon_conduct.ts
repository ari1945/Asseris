/* ============================================================
   Asseris — Konduk, AML & Disiplin: MESIN MURNI (PRD sdm-kepatuhan PR-7)
   ------------------------------------------------------------
   Empat cacat yang ditutup.

   (1) AMBANG GRATIFIKASI DIKETAHUI, STATUS DIKETIK. `over = g.value >= 1_000_000`
       dihitung — hanya untuk mewarnai baris. `status` tetap data bebas. G-04
       (voucher Rp 2 jt dari calon klien) duduk di "Menunggu" sejak 2026-03-08
       tanpa eskalasi, SLA, atau pemberitahuan apa pun.

   (2) SKRINING AML TANPA MASA BERLAKU. `AML_SCREENING` punya tanggal skrining
       tetapi tak ada periodisitas: skrining 2026-01-08 berstatus "Bersih"
       selamanya. Gerbang etik — yang fail-closed dan benar — karenanya lolos di
       atas skrining yang boleh berumur bertahun-tahun.

   (3) KASUS DISIPLIN TAK MENYENTUH GERBANG APA PUN. HC-2026-03 adalah
       investigasi dugaan pelanggaran INDEPENDENSI terhadap EMP-022, berstatus
       terbuka, dengan langkah tercatat "Recuse sementara dari perikatan".
       Aplikasi tidak mengetahuinya: rekusal yang dicatat sebagai teks tidak
       menghasilkan rekusal apa pun.

   (4) SANKSI DITETAPKAN SATU KLIK. `closeCase` menaikkan satu anak tangga
       sanksi lalu menutup kasus — pelapor, penyelidik, dan pemutus kembali
       menjadi satu orang.

   Keputusan Ari (Q-4, 2026-08-16): kasus berat aktif MEMBLOKIR, dengan override
   ber-atestasi Partner — mengikuti pola `ethicsOverride` yang sudah ada.

   Fungsi MURNI; `asOf` selalu argumen.
   ============================================================ */

const MS_DAY = 86_400_000;

function daysBetween(a: string, b: string): number | null {
  const x = Date.parse(a + 'T00:00:00Z'), y = Date.parse(b + 'T00:00:00Z');
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return Math.round((y - x) / MS_DAY);
}

function addMonths(iso: string, months: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]) - 1 + months, d = Number(m[3]);
  const t = new Date(Date.UTC(y, mo, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------
   1. Gratifikasi
   ------------------------------------------------------------------ */

export interface GiftPolicy {
  /** Di atas nilai ini WAJIB diputuskan, tak boleh sekadar dicatat. */
  threshold: number;
  /** Hari sejak diterima sebelum item di atas ambang dieskalasi. */
  escalateAfterDays: number;
  basis: string;
}

export const GIFT_POLICY: GiftPolicy = {
  threshold: 1_000_000,
  escalateAfterDays: 14,
  basis: 'Kebijakan Anti-Suap & Gratifikasi firma — Kode Etik IAPI Seksi 340',
};

export type GiftStatus = 'Tercatat' | 'Menunggu' | 'Disetujui' | 'Ditolak';

export interface GiftRecord {
  id: string;
  date: string;
  staff?: string;
  counter?: string;
  type?: string;
  value: number;
  action?: string;
  status?: string;
}

export interface GiftState {
  id: string;
  value: number;
  overThreshold: boolean;
  /** Status yang SEHARUSNYA menurut nilai & keputusan yang ada. */
  derivedStatus: GiftStatus;
  storedStatus: string;
  /** Status tersimpan bertentangan dengan yang dapat diturunkan. */
  contradicts: boolean;
  ageDays: number | null;
  /** Di atas ambang, belum diputuskan, dan sudah lewat SLA. */
  escalated: boolean;
  requiresDecision: boolean;
  note: string;
}

/**
 * Keadaan satu catatan gratifikasi.
 *
 * Yang DITURUNKAN: apakah ia melewati ambang, apakah ia menuntut keputusan, dan
 * apakah ia sudah terlalu lama menggantung. Keputusan itu sendiri (setuju/tolak)
 * tetap tindakan manusia — tetapi "di bawah ambang" tak lagi dapat diketik untuk
 * barang Rp 2 juta.
 */
export function giftState(g: GiftRecord, asOf: string, policy: GiftPolicy = GIFT_POLICY): GiftState {
  const value = Math.max(0, Number(g.value) || 0);
  const over = value >= policy.threshold;
  const stored = String(g.status || '');
  const decided = stored === 'Disetujui' || stored === 'Ditolak';
  const age = daysBetween(g.date, asOf);
  const derivedStatus: GiftStatus = decided ? (stored as GiftStatus) : over ? 'Menunggu' : 'Tercatat';
  const escalated = over && !decided && age !== null && age > policy.escalateAfterDays;
  return {
    id: g.id, value, overThreshold: over, derivedStatus, storedStatus: stored,
    contradicts: !decided && over && stored === 'Tercatat',
    ageDays: age,
    escalated,
    requiresDecision: over && !decided,
    note: escalated
      ? `Di atas ambang Rp ${policy.threshold.toLocaleString('id-ID')} dan menggantung ${age} hari (SLA ${policy.escalateAfterDays} hari).`
      : '',
  };
}

export interface GiftSummary { total: number; overThreshold: number; pending: number; escalated: number; contradicting: number }

export function giftSummary(gifts: readonly GiftRecord[] | undefined, asOf: string, policy: GiftPolicy = GIFT_POLICY): GiftSummary {
  const st = (gifts || []).map((g) => giftState(g, asOf, policy));
  return {
    total: st.length,
    overThreshold: st.filter((g) => g.overThreshold).length,
    pending: st.filter((g) => g.requiresDecision).length,
    escalated: st.filter((g) => g.escalated).length,
    contradicting: st.filter((g) => g.contradicts).length,
  };
}

/* ------------------------------------------------------------------
   2. Skrining AML/PMPJ — masa berlaku
   ------------------------------------------------------------------ */

export interface AmlPolicy { validMonths: number; basis: string }

export const AML_POLICY: AmlPolicy = {
  validMonths: 12,
  basis: 'PMK 155/2017 · rezim APU-PPT PPATK — skrining berkala personel',
};

export interface AmlRecord { id: string; screened?: string; result?: string; training?: boolean }

export interface AmlState {
  emp: string;
  screened: string | null;
  expiresOn: string | null;
  expired: boolean;
  clean: boolean;
  /** Bersih DAN masih berlaku. Inilah yang boleh memuaskan gerbang. */
  valid: boolean;
  ageDays: number | null;
  reason: string;
}

/** Keadaan skrining. Skrining kedaluwarsa DIPERLAKUKAN SAMA dengan belum bersih:
 *  keduanya berarti tak ada dasar mutakhir untuk menyatakan personel bersih. */
export function amlState(rec: AmlRecord | undefined, asOf: string, policy: AmlPolicy = AML_POLICY): AmlState {
  const screened = rec && rec.screened && /^\d{4}-\d{2}-\d{2}$/.test(rec.screened) ? rec.screened : null;
  const clean = !!rec && rec.result === 'Bersih';
  const expiresOn = screened ? addMonths(screened, policy.validMonths) : null;
  const age = screened ? daysBetween(screened, asOf) : null;
  /* Tanggal acuan tak valid ⇒ masa berlaku TAK DAPAT ditentukan. Untuk gerbang
     asurans itu berarti tidak sah, bukan "aman secara default". */
  const determinable = !!expiresOn && daysBetween(expiresOn, asOf) !== null;
  const expired = determinable && (daysBetween(expiresOn as string, asOf) as number) > 0;
  const valid = clean && !!screened && determinable && !expired;
  let reason = '';
  if (!screened) reason = 'Skrining AML/PMPJ belum pernah dilakukan.';
  else if (!clean) reason = 'Hasil skrining AML/PMPJ belum bersih.';
  else if (!determinable) reason = 'Tanggal acuan tak valid — masa berlaku skrining AML/PMPJ tak dapat ditentukan.';
  else if (expired) reason = `Skrining AML/PMPJ kedaluwarsa sejak ${expiresOn} (berlaku ${policy.validMonths} bulan sejak ${screened}).`;
  return { emp: rec?.id || '', screened, expiresOn, expired, clean, valid, ageDays: age, reason };
}

/* ------------------------------------------------------------------
   3. Kasus disiplin — gerbang
   ------------------------------------------------------------------ */

export const SANCTION_LADDER = ['Teguran Lisan', 'SP-1 (Tertulis)', 'SP-2', 'SP-3 / Skorsing', 'PHK'] as const;

/** Kategori yang menyentuh kelayakan bertugas pada perikatan asurans. */
export const BLOCKING_CATEGORIES = ['Pelanggaran Independensi', 'Kerahasiaan'] as const;
export const BLOCKING_SEVERITIES = ['Berat', 'Sedang'] as const;
export const OPEN_STATUSES = ['Terbuka', 'Ditangani', 'Investigasi'] as const;

export interface HrCase {
  id: string;
  staff: string;
  cat?: string;
  severity?: string;
  status?: string;
  owner?: string;
  channel?: string;
  sanction?: string;
  date?: string;
  reportedBy?: string;
  investigatedBy?: string;
  decidedBy?: string;
  decidedAt?: string;
}

export interface CaseGate {
  emp: string;
  blocking: boolean;
  cases: HrCase[];
  reason: string;
}

/** Apakah kasus ini memblokir penugasan/sign-off? */
export function caseBlocks(c: HrCase): boolean {
  if (!c) return false;
  if (!(OPEN_STATUSES as readonly string[]).includes(String(c.status))) return false;
  if (!(BLOCKING_SEVERITIES as readonly string[]).includes(String(c.severity))) return false;
  return (BLOCKING_CATEGORIES as readonly string[]).includes(String(c.cat));
}

export function caseGateFor(cases: readonly HrCase[] | undefined, emp: string): CaseGate {
  const mine = (cases || []).filter((c) => c && c.staff === emp && caseBlocks(c));
  return {
    emp,
    blocking: mine.length > 0,
    cases: mine,
    reason: mine.length
      ? `Kasus disiplin aktif: ${mine.map((c) => `${c.id} (${c.cat}, ${c.severity}, ${c.status})`).join(' · ')}`
      : '',
  };
}

export interface ConductOverride { by?: string; at?: string; reason?: string; caseId?: string }

export interface ConductGate {
  emp: string;
  blocking: boolean;
  overridden: boolean;
  override: ConductOverride | null;
  reason: string;
  cases: HrCase[];
}

/**
 * Gerbang konduk gabungan — kasus disiplin + override ber-atestasi.
 *
 * Q-4 opsi (b): memblokir, tetapi Partner dapat meng-override dengan alasan
 * TERCATAT. Override tanpa alasan TIDAK berlaku — atestasi kosong bukan atestasi.
 */
export function conductGate(args: {
  emp: string;
  cases?: readonly HrCase[];
  overrides?: Record<string, ConductOverride | undefined>;
}): ConductGate {
  const gate = caseGateFor(args.cases, args.emp);
  const ov = (args.overrides || {})[args.emp];
  const validOverride = !!(ov && ov.by && String(ov.reason || '').trim());
  return {
    emp: args.emp,
    blocking: gate.blocking && !validOverride,
    overridden: gate.blocking && validOverride,
    override: validOverride ? (ov as ConductOverride) : null,
    reason: gate.blocking
      ? (validOverride
        ? `${gate.reason} — di-override ${ov?.by} (${ov?.at}): ${ov?.reason}`
        : gate.reason)
      : '',
    cases: gate.cases,
  };
}

/* ------------------------------------------------------------------
   4. Pemisahan tugas penetapan sanksi
   ------------------------------------------------------------------ */

export interface SanctionActor { emp: string | null; canHrManage: boolean; canFirmAdmin: boolean }

export interface SanctionCheck { ok: boolean; reason: string }

/**
 * Bolehkah `actor` menetapkan sanksi & menutup kasus ini?
 *
 * `closeCase` lama menaikkan satu anak tangga sanksi lalu menutup, dalam satu
 * klik, oleh siapa pun yang membuka layar. Pelapor, penyelidik & pemutus adalah
 * tiga pihak; menyatukannya membuat register disiplin tak dapat dipercaya.
 */
export function sanctionCheck(c: HrCase | undefined, actor: SanctionActor): SanctionCheck {
  if (!c) return { ok: false, reason: 'Kasus tidak ditemukan.' };
  if (!actor.emp) return { ok: false, reason: 'Identitas pengguna tidak terpetakan ke personel firma.' };
  if (String(c.status) === 'Selesai') return { ok: false, reason: 'Kasus sudah ditutup.' };
  if (!actor.canHrManage && !actor.canFirmAdmin) {
    return { ok: false, reason: 'Penetapan sanksi memerlukan kewenangan HR/Rekan.' };
  }
  if (actor.emp === c.staff) return { ok: false, reason: 'Sanksi tidak dapat ditetapkan oleh orang yang dikenai.' };
  if (c.reportedBy && actor.emp === c.reportedBy) {
    return { ok: false, reason: 'Pelapor tidak dapat menjadi pemutus sanksi.' };
  }
  if (c.investigatedBy && actor.emp === c.investigatedBy) {
    return { ok: false, reason: 'Penyelidik tidak dapat menjadi pemutus sanksi — penetapan sanksi adalah lapis terpisah.' };
  }
  return { ok: true, reason: '' };
}

/** Anak tangga sanksi harus DIPILIH, bukan dinaikkan otomatis. */
export function sanctionOptions(current: string | undefined): string[] {
  const i = SANCTION_LADDER.findIndex((x) => String(current || '').includes(x.split(' ')[0]));
  return SANCTION_LADDER.slice(Math.max(0, i));
}
