/* ============================================================
   Asseris — Atestasi Mutu Firma: ATURAN (murni)
   SMM 1 ¶20 · ¶53–54 — SUMBER KEBENARAN TUNGGAL.
   ------------------------------------------------------------
   Tiga cacat yang ditutup modul ini (PRD Kesiapan P2PK · PR-3):

   1. KUNCI DITOLAK SERVER, SENYAP. `attestKey` dibentuk dari label periode
      manusiawi (`'soqmAnnualEval.1 Jan – 31 Des 2025'`), sedangkan allow-list
      baca server hanya menerima empat digit
      (`/^firmAttest\.soqmAnnualEval\.\d{4}$/`). `state.get` menolak 403, dan
      penolakan itu ditelan `.catch()` di `useServerState` sebagai "offline" —
      sehingga tanda tangan evaluasi SMM tahunan hanya hidup di localStorage
      browser penandatangannya. `attestYear()` menormalisasi kuncinya.

   2. TANDA TANGAN TAK TERIKAT ISI. `saveConclusion` menyalin `chain` apa
      adanya: tandatangani kesimpulan, lalu tulis ulang kesimpulannya, dan
      tanda tangan tetap menempel pada teks yang tak pernah ditandatangani
      siapa pun. `attestContentHash()` mengikatnya; tanda tangan GUGUR sendiri
      saat isinya berubah — mekanisme yang sama dengan rantai kertas kerja
      (`wpChainLinks`), bukan salinannya.

   3. IDENTITAS TAK DIREKAM. Rantai lama menyimpan `{by, at}` dengan `at`
      berupa string tampilan `toLocaleDateString`. Tanpa `byUserId` dan tanpa
      stempel ISO, tak ada satu pun aturan server yang dapat menanyakan apakah
      tanda tangan menyebut orang yang membubuhkannya.

   Murni & deterministik; tanpa React/efek-samping.
   ============================================================ */
import { fingerprint } from './content_hash';
import { CAP } from './rbac';

export interface FaSigner {
  by: string;
  /** id pengguna sesi; absen pada data warisan pra-PR-3. */
  byUserId?: string;
  /** ISO 8601 (baru) — data warisan membawa string tampilan `id-ID`. */
  at: string;
  /** sidik jari isi SAAT ditandatangani; absen pada data warisan. */
  contentHash?: string;
}

export interface FaState {
  period: string;
  conclusion: string;
  engineLabel: string;
  chain: Record<string, FaSigner>;
}

/** Satu lapis rantai atestasi. `needsPrev` mengikat lapis ini menunggu lapis sebelumnya. */
export interface FaRole {
  id: string;
  label: string;
  cap?: string;
  needsPrev?: string;
}

/**
 * Tahun 4-digit dari label periode.
 *
 * Kunci atestasi HARUS 4 digit agar lolos allow-list server. Label periode
 * tetap manusiawi dan ditampilkan apa adanya — yang dinormalisasi hanya
 * ALAMAT dokumennya.
 */
export function attestYear(period: string | null | undefined, fallback?: number): string {
  const m = /(\d{4})/.exec(String(period || ''));
  if (m) return m[1];
  const y = fallback && Number.isFinite(fallback) ? Math.trunc(fallback) : new Date().getFullYear();
  return String(y);
}

/** Kunci atestasi ber-alamat stabil: `<nama>.<tahun>`. */
export function attestKeyFor(name: string, period: string | null | undefined, fallbackYear?: number): string {
  return `${name}.${attestYear(period, fallbackYear)}`;
}

/* String kanonik yang MENGIKAT tanda tangan. Hanya isi yang bermakna
   evidensial — periode yang dinyatakan & kesimpulan tertulis. `engineLabel`
   sengaja DI LUAR: ia rekomendasi mesin yang berdampingan dengan penilaian
   penandatangan, bukan hal yang ditandatanganinya. */
export function attestCanonicalContent(s: { period?: string; conclusion?: string } | null | undefined): string {
  const o = s || {};
  return [String(o.period || '').trim(), String(o.conclusion || '').trim()].join('§');
}

/** Sidik jari isi atestasi (16 hex). */
export function attestContentHash(s: { period?: string; conclusion?: string } | null | undefined): string {
  return fingerprint(attestCanonicalContent(s));
}

export type FaLinkStatus =
  | 'pending'  // belum ditandatangani
  | 'signed'   // ditandatangani atas isi yang berlaku SEKARANG
  | 'voided'   // ditandatangani atas isi LAIN — gugur karena kesimpulan berubah
  | 'legacy';  // data warisan tanpa `contentHash` — tak dapat diverifikasi

export interface FaLink {
  roleId: string;
  label: string;
  signer?: FaSigner;
  status: FaLinkStatus;
}

/**
 * Keadaan tiap lapis rantai terhadap isi yang berlaku sekarang.
 *
 * Tanda tangan yang isinya sudah berubah menjadi `voided` TANPA perlu tulisan
 * apa pun — persis pola `wpChainLinks`. Tidak ada jalur di mana kesimpulan
 * dapat ditulis ulang sementara tanda tangannya tetap tampak sah.
 */
export function attestChainLinks(
  state: FaState | null | undefined,
  roles: readonly FaRole[],
  currentHash?: string,
): FaLink[] {
  const st = state || ({ period: '', conclusion: '', engineLabel: '', chain: {} } as FaState);
  const hash = currentHash != null ? currentHash : attestContentHash(st);
  return roles.map((r) => {
    const signer = st.chain ? st.chain[r.id] : undefined;
    let status: FaLinkStatus = 'pending';
    if (signer) {
      if (!signer.contentHash) status = 'legacy';
      else status = signer.contentHash === hash ? 'signed' : 'voided';
    }
    return { roleId: r.id, label: r.label, signer, status };
  });
}

/** Rantai lengkap = setiap lapis ditandatangani atas isi yang berlaku. */
export function attestChainComplete(links: readonly FaLink[]): boolean {
  return links.length > 0 && links.every((l) => l.status === 'signed');
}

/** Lapis yang tanda tangannya gugur karena isinya berubah. */
export function attestVoidedRoles(links: readonly FaLink[]): string[] {
  return links.filter((l) => l.status === 'voided').map((l) => l.roleId);
}

export const FA_LINK_LABEL: Record<FaLinkStatus, string> = {
  pending: 'belum ditandatangani',
  signed: 'ditandatangani',
  voided: 'gugur — kesimpulan berubah setelah ditandatangani',
  legacy: 'tanda tangan warisan — tak terikat isi',
};

/* ============================================================
   RANTAI KANONIK per artefak — SSOT peran & kapabilitasnya.
   Dipakai UI *dan* server, agar "siapa boleh mengisi lapis ini" tak
   dapat menyimpang antara layar dan penegakan.
   ============================================================ */

/** Evaluasi tahunan SMM — dua lapis sesuai pembagian SMM 1 ¶20. */
export const SOQM_ANNUAL_ROLES: readonly FaRole[] = [
  { id: 'leader', label: 'Pimpinan SOQM — tanggung jawab operasional (SMM 1 ¶20(b))', cap: CAP.SIGNOFF_REVIEWER },
  { id: 'approver', label: 'Managing Partner — tanggung jawab akhir (SMM 1 ¶20(a))', cap: CAP.FIRM_ADMIN, needsPrev: 'leader' },
];

/** Rantai untuk sebuah kunci atestasi (`firmAttest.<name>.<tahun>` atau `<name>.<tahun>`). */
export function attestRolesFor(attestKey: string): readonly FaRole[] {
  const k = String(attestKey || '').replace(/^firmAttest\./, '');
  if (/^soqmAnnualEval\./.test(k)) return SOQM_ANNUAL_ROLES;
  return [];
}

/** Kapabilitas yang dituntut satu lapis; `null` bila lapis tak dikenal. */
export function attestRoleCap(attestKey: string, roleId: string): string | null {
  const r = attestRolesFor(attestKey).find((x) => x.id === roleId);
  return r && r.cap ? r.cap : null;
}
