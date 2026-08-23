/* ============================================================
   Asseris — SA 230 · siklus hidup arsip perikatan (adapter SSOT)
   ------------------------------------------------------------
   Modul SA 230 TIDAK menghitung sendiri tenggat perakitan, masa
   simpan, atau tanggal akhir retensi. Seluruhnya DITARIK dari
   lapisan Arsip kanonik (`data_records.ts` → window.RETENTION),
   yang kepala berkasnya menyatakan aturannya sendiri:

     "KEBIJAKAN RETENSI (RETENTION_CLASSES) adalah sumber tunggal
      masa simpan … bukan di-hardcode ganda."

   Sebelum berkas ini, view_sa230 membangun ulang seluruh siklus
   hidup itu dari tiga konstanta privat (reportDate '2026-03-20',
   assemblyDays 60, retentionYears 10) — dan angka retensinya
   membantah kelas retensi firma (kk-audit = 7 tahun).

   DUA PERBEDAAN PERILAKU yang dibawa perpindahan ini, keduanya
   mengikuti kanon:

   1. Masa simpan berasal dari KELAS retensi perikatan, bukan dari
      angka yang diketik per-perikatan. Masa simpan adalah kebijakan
      FIRMA (satu angka, banyak perikatan).

   2. Jam retensi mulai berjalan saat berkas DIARSIPKAN
      (`archivedOn`), bukan saat tanggal laporan. Selama berkas
      belum dirakit & dikunci, akhir retensi BELUM ADA — ia null,
      bukan "tanggal laporan + n tahun". Menampilkan tanggal pasti
      untuk berkas yang belum dikunci adalah mengarang.

   Tenggat perakitan (SA 230 ¶A21) juga tidak ditulis ulang di sini:
   ia DITURUNKAN dari jarak `reportDate → assembleBy` pada kotak
   arsip kanonik, sehingga jendela ¶A21 hanya hidup di satu tempat.

   Murni & deterministik terhadap kanon — tanpa React, tanpa
   localStorage, tanpa penulisan `window`.
   ============================================================ */
import { RETENTION } from './data_records';

/** Kelas retensi kanonik (RETENTION_CLASSES) — kebijakan firma. */
export interface Sa230RetentionClass {
  readonly id: string;
  readonly jenis: string;
  /** Dasar kebijakan sebagaimana ditulis kanon (SA 230 ¶A23 / SMM 1 / dst). */
  readonly dasar: string;
  readonly years: number;
  readonly format: string;
  readonly note: string;
}

/** Penangguhan disposal yang berlaku atas seluruh berkas perikatan. */
export interface Sa230Hold {
  readonly id: string;
  readonly since: string;
  readonly by: string;
  readonly reason: string;
  readonly scope: string;
}

export type Sa230Stage =
  | 'tanpa-berkas'    // belum ada dokumen perikatan di DMS — tenggat tak terhitung
  | 'pra-laporan'     // tanggal laporan belum tiba
  | 'dalam-jendela'   // pasca-laporan, masih di dalam jendela ¶A21
  | 'lewat-tenggat'   // jendela ¶A21 terlampaui & berkas belum dikunci
  | 'terarsip'        // dirakit & dikunci, dalam masa simpan
  | 'jatuh-tempo'     // masa simpan habis — memenuhi syarat pemusnahan
  | 'legal-hold';     // disposal ditangguhkan

export interface Sa230ArchiveState {
  readonly engId: string;
  /** null bila perikatan belum punya kotak arsip kanonik (tak ada dokumen DMS). */
  readonly hasBox: boolean;
  readonly klass: Sa230RetentionClass;
  /** Tanggal laporan menurut kanon (opinionDate dokumen DMS). */
  readonly reportDate: string | null;
  /** Tenggat perakitan berkas final (SA 230 ¶A21) menurut kanon. */
  readonly assembleBy: string | null;
  /** Lebar jendela ¶A21 dalam hari — DITURUNKAN dari kanon, bukan konstanta baru. */
  readonly assemblyDays: number | null;
  /** Tanggal berkas dirakit & dikunci; null selama belum dirakit. */
  readonly archivedOn: string | null;
  readonly assembled: boolean;
  /** Akhir masa simpan — null selama berkas belum dikunci (jam belum berjalan). */
  readonly retentionUntil: string | null;
  readonly retentionYears: number;
  readonly hold: Sa230Hold | null;
  /** Status siklus hidup kanonik apa adanya (Perakitan/Terkunci/Legal Hold/Jatuh Tempo). */
  readonly canonStatus: string | null;
  readonly stage: Sa230Stage;
  readonly daysToReport: number | null;
  readonly daysToAssembly: number | null;
  readonly docCount: number;
  readonly sizeMB: number;
  /** 'DMS' | 'Legacy' | null — asal kotak arsip. */
  readonly source: string | null;
}

const MS_DAY = 864e5;

/** Selisih hari antar dua tanggal ISO ('YYYY-MM-DD'). */
export function daysBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / MS_DAY);
}

function stageFor(
  canonStatus: string | null,
  hold: Sa230Hold | null,
  assembled: boolean,
  daysToReport: number | null,
  daysToAssembly: number | null,
  hasBox: boolean,
): Sa230Stage {
  if (!hasBox) return 'tanpa-berkas';
  if (hold) return 'legal-hold';
  if (canonStatus === 'Jatuh Tempo') return 'jatuh-tempo';
  if (assembled) return 'terarsip';
  if (daysToReport != null && daysToReport > 0) return 'pra-laporan';
  if (daysToAssembly != null && daysToAssembly < 0) return 'lewat-tenggat';
  return 'dalam-jendela';
}

/**
 * Keadaan arsip SA 230 untuk sebuah perikatan, seluruhnya dari kanon Arsip.
 *
 * Perikatan tanpa dokumen DMS tidak punya kotak arsip kanonik: fungsi ini
 * mengembalikan `hasBox:false` dengan tanggal-tanggal null — BUKAN tenggat
 * karangan. Kelas retensi tetap terisi karena ia melekat pada jenis perikatan,
 * bukan pada dokumennya.
 */
export function sa230ArchiveState(engId: string): Sa230ArchiveState {
  const klass = RETENTION.classForEngagement(engId) as Sa230RetentionClass;
  const boxes = RETENTION.archiveBoxes() as ReadonlyArray<Record<string, unknown>>;
  const box = boxes.find((b) => b.engId === engId) || null;

  if (!box) {
    return {
      engId, hasBox: false, klass,
      reportDate: null, assembleBy: null, assemblyDays: null,
      archivedOn: null, assembled: false,
      retentionUntil: null, retentionYears: klass.years,
      hold: (RETENTION.holdForEng(engId) as Sa230Hold | null) || null,
      canonStatus: null, stage: 'tanpa-berkas',
      daysToReport: null, daysToAssembly: null,
      docCount: 0, sizeMB: 0, source: null,
    };
  }

  const reportDate = (box.reportDate as string | null) || null;
  const assembleBy = (box.assembleBy as string | null) || null;
  const archivedOn = (box.archivedOn as string | null) || null;
  const hold = (box.hold as Sa230Hold | null) || null;
  const canonStatus = (box.status as string | null) || null;
  const today: Date = RETENTION.today;
  const todayIso = today.toISOString().slice(0, 10);
  const daysToReport = daysBetween(todayIso, reportDate);
  const daysToAssembly = daysBetween(todayIso, assembleBy);
  const assembled = !!archivedOn;

  return {
    engId, hasBox: true, klass,
    reportDate, assembleBy,
    assemblyDays: daysBetween(reportDate, assembleBy),
    archivedOn, assembled,
    retentionUntil: (box.retentionUntil as string | null) || null,
    retentionYears: (box.retentionYears as number | undefined) ?? klass.years,
    hold,
    canonStatus,
    stage: stageFor(canonStatus, hold, assembled, daysToReport, daysToAssembly, true),
    daysToReport, daysToAssembly,
    docCount: (box.docCount as number | undefined) || 0,
    sizeMB: (box.sizeMB as number | undefined) || 0,
    source: (box.source as string | null) || null,
  };
}

/** Label ringkas status perakitan untuk kartu KPI. */
export const SA230_STAGE_LABEL: Record<Sa230Stage, string> = {
  'tanpa-berkas': 'Belum ada berkas',
  'pra-laporan': 'Pra-laporan',
  'dalam-jendela': 'Dalam Jendela',
  'lewat-tenggat': 'Lewat Tenggat',
  'terarsip': 'Terarsip & Terkunci',
  'jatuh-tempo': 'Jatuh Tempo Retensi',
  'legal-hold': 'Legal Hold',
};

/**
 * Lebar jendela perakitan berkas final (SA 230 ¶A21) menurut kanon, dalam hari.
 *
 * TIDAK ditulis sebagai konstanta: angkanya dipanggang di dalam
 * `finalizeBox()` (data_records.ts) dan tidak diekspor, jadi ia DITURUNKAN dari
 * jarak reportDate→assembleBy pada kotak arsip pertama yang punya keduanya.
 * Menyalinnya jadi konstanta kedua justru mengulang cacat yang berkas ini cabut.
 * Mengembalikan null bila belum ada kotak yang dapat dipakai menurunkannya.
 */
export function sa230AssemblyWindowDays(): number | null {
  const boxes = RETENTION.archiveBoxes() as ReadonlyArray<Record<string, unknown>>;
  for (const b of boxes) {
    const d = daysBetween((b.reportDate as string | null) || null, (b.assembleBy as string | null) || null);
    if (d != null) return d;
  }
  return null;
}
