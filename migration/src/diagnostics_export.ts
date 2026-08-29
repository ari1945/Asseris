/* ============================================================
   Asseris — KERTAS KERJA DIAGNOSTIK (payload ekspor, MURNI)
   prompt 72-diagnostic D5.
   ------------------------------------------------------------
   Temuan diagnostik beserta keputusan auditor atasnya — tindak lanjuti atau
   tutup, dengan alasan — adalah dokumentasi SA 240/SA 230. Sampai 2026-08-22
   tak ada satu pun cara mengeluarkannya:

     grep -c amsExport migration/src/view_diagnostics.tsx   -> 0
     grep -c amsExport migration/src/diagnostics_panel.tsx  -> 0

   Ekspor ini SENGAJA dikerjakan SESUDAH D1. Mengeluarkan keputusan yang
   pelakunya dikarang berarti menyegel atribusi yang salah — segelnya justru
   membuat kesalahan itu terlihat resmi. Karena itu payload menolak diri sendiri
   bila sebuah keputusan tersimpan tanpa pelaku atau tanpa tanggal.

   Lembar KEDUA (Detektor) sama pentingnya dengan lembar temuan: ia menyegel
   keadaan tiap detektor — berjalan & menemukan · berjalan & bersih · tidak
   dapat berjalan. Kertas kerja yang hanya memuat temuan membuat "nol temuan"
   tak dapat dibedakan dari "tidak diperiksa".

   MURNI: tanpa React, window, atau jam. Nama firma & stempel disuntik pemanggil.
   ============================================================ */
import { DIAG_SEV } from './diagnostics';
import type { DiagSev } from './diagnostics';
import { DIAG_ATTRIBUTION_LABEL, diagDecisionAttribution } from './diagnostics_decision';
import type { DiagDecision } from './diagnostics_decision';
import { DIAG_STATE_META } from './diagnostics_inputs';
import type { DiagDetectorStatus } from './diagnostics_inputs';

export interface DiagExportFinding {
  id: string;
  detector?: string;
  sev?: string;
  std?: string;
  title?: string;
  detail?: string;
  modules?: string[];
  suggestedProcedure?: string;
}

export interface ExportSheet {
  name: string;
  heading?: string;
  columns: string[];
  rows: string[][];
  totals?: string[];
  colWidths?: number[];
}

export interface DiagExportModel {
  kind: 'engagement-diagnostic';
  scope: 'engagement';
  fileName: string;
  title: string;
  meta: string[];
  sheets: ExportSheet[];
}

export interface DiagExportInput {
  findings: ReadonlyArray<DiagExportFinding>;
  decisions: Readonly<Record<string, DiagDecision | undefined>>;
  detectors: ReadonlyArray<DiagDetectorStatus>;
  /** Nama firma dari SSOT (AMS.FIRM.name). Kosong = ekspor DITOLAK. */
  firmName: string;
  /** Id perikatan aktif — scope segel. */
  engagementId?: string;
  /** Label perikatan/klien untuk kepala kertas kerja. */
  engagementLabel?: string;
  /** Klok SSOT — tanggal penyusunan kertas kerja. */
  preparedOn: string;
  /** Penyusun dari sesi nyata; kosong dibiarkan kosong, bukan diisi seed. */
  preparedBy?: string;
  /** Area penyaring bila panel disematkan di modul lain; kosong = agregat. */
  area?: string;
}

const sevLabel = (sev: unknown): string => {
  const k = String(sev || '') as DiagSev;
  return DIAG_SEV[k] ? DIAG_SEV[k].label : String(sev || '—');
};

const sevRank = (sev: unknown): number => {
  const k = String(sev || '') as DiagSev;
  return DIAG_SEV[k] ? DIAG_SEV[k].rank : 0;
};

/**
 * Model workbook untuk amsExportXlsx.
 *
 * Melempar bila nama firma kosong (kertas kerja tanpa identitas penerbit tak
 * dapat dipertanggungjawabkan, dan mengisinya dengan literal adalah cara paling
 * halus untuk menyegel nama firma yang salah), dan bila ada keputusan tersimpan
 * yang tak membawa pelaku atau tanggal.
 */
export function diagnosticExportModel(input: DiagExportInput): DiagExportModel {
  const firm = String(input.firmName || '').trim();
  if (!firm) {
    throw new Error('diagnosticExportModel: nama firma kosong — kertas kerja tidak disegel tanpa identitas penerbit.');
  }
  const findings = input.findings || [];
  const detectors = input.detectors || [];
  if (!findings.length && !detectors.length) {
    throw new Error('diagnosticExportModel: tidak ada temuan maupun keadaan detektor untuk diekspor.');
  }
  const decisions = input.decisions || {};

  /* Atribusi diperiksa SEBELUM disegel. Sebuah keputusan tanpa pelaku atau
     tanpa tanggal tak boleh keluar dari aplikasi berbalut segel provenans. */
  const cacat = Object.keys(decisions)
    .map((id) => ({ id, d: decisions[id] }))
    .filter((x) => x.d && (!String(x.d.who || '').trim() || !String(x.d.when || '').trim()))
    .map((x) => x.id);
  if (cacat.length) {
    throw new Error(
      'diagnosticExportModel: keputusan tanpa pelaku/tanggal tidak dapat disegel — ' + cacat.join(', '),
    );
  }

  const urut = findings
    .slice()
    .sort((a, b) => sevRank(b.sev) - sevRank(a.sev));

  const diputuskan = urut.filter((f) => decisions[f.id]);

  const temuan: ExportSheet = {
    name: 'Temuan',
    heading: 'Temuan diagnostik deterministik (aturan + statistik) & keputusan auditor — SA 240 · PSAK 46',
    columns: [
      'ID', 'Detektor', 'Severity', 'Standar', 'Judul', 'Uraian', 'Prosedur Usulan', 'Modul',
      'Keputusan', 'Alasan', 'Pelaku', 'Peran', 'Tanggal', 'Atribusi',
    ],
    rows: urut.map((f) => {
      const d = decisions[f.id];
      return [
        String(f.id || ''),
        String(f.detector || ''),
        sevLabel(f.sev),
        String(f.std || ''),
        String(f.title || ''),
        String(f.detail || ''),
        String(f.suggestedProcedure || ''),
        (f.modules || []).join(', '),
        d ? (d.verdict === 'follow' ? 'Ditindaklanjuti' : 'Diabaikan') : 'Belum diputuskan',
        d ? String(d.reason || '') : '',
        d ? String(d.who || '') : '',
        d ? String(d.role || '') : '',
        d ? String(d.when || '') : '',
        d ? DIAG_ATTRIBUTION_LABEL[diagDecisionAttribution(d)] : '',
      ];
    }),
    totals: [
      'TOTAL', String(urut.length) + ' temuan', '', '', '', '', '', '',
      String(diputuskan.length) + ' diputuskan · ' + String(urut.length - diputuskan.length) + ' terbuka',
      '', '', '', '', '',
    ],
    colWidths: [18, 14, 10, 18, 46, 78, 66, 20, 18, 46, 22, 18, 20, 34],
  };

  const detektor: ExportSheet = {
    name: 'Detektor',
    heading:
      'Keadaan tiap detektor. "Berjalan & bersih" adalah informasi asurans; '
      + '"tidak dapat berjalan" berarti masukannya tidak ada — BUKAN nol temuan.',
    columns: ['Detektor', 'Nama', 'Standar', 'Keadaan', 'Jumlah Temuan', 'Masukan Kurang', 'Catatan'],
    rows: detectors.map((d) => [
      d.id,
      d.label,
      d.std,
      DIAG_STATE_META[d.state] ? DIAG_STATE_META[d.state].label : d.state,
      String(d.count),
      (d.missing || []).join(', '),
      d.reason || '',
    ]),
    colWidths: [16, 30, 20, 24, 16, 24, 88],
  };

  const takBerjalan = detectors.filter((d) => d.state === 'unavailable');
  const lama = Object.keys(decisions)
    .filter((id) => decisions[id] && diagDecisionAttribution(decisions[id]) === 'legacy');

  const meta = [
    input.engagementLabel ? 'Perikatan: ' + input.engagementLabel : 'Perikatan tidak dinyatakan',
    input.area ? 'Lingkup: temuan yang menyentuh modul ' + input.area : 'Lingkup: seluruh temuan diagnostik',
    'Disusun ' + String(input.preparedOn || '')
      + (input.preparedBy ? ' oleh ' + input.preparedBy : ''),
    takBerjalan.length
      ? takBerjalan.length + ' dari ' + detectors.length + ' detektor TIDAK DAPAT BERJALAN: '
        + takBerjalan.map((d) => d.id).join(', ') + '. Nol temuan dari detektor itu bukan simpulan.'
      : 'Seluruh ' + detectors.length + ' detektor berjalan atas masukan yang tersedia.',
    lama.length
      ? lama.length + ' keputusan berasal dari bentuk LAMA (stempel tanpa tanggal, pelaku dari data seed): '
        + lama.join(', ') + '. Atribusinya tidak dapat diverifikasi — lihat kolom Atribusi.'
      : 'Setiap keputusan membawa pelaku dari sesi nyata dan stempel bertanggal.',
    'Temuan dihitung dari data kanonik (aturan + statistik), bukan model bahasa. '
      + 'Tiap temuan adalah usulan; keputusan di kolom Keputusan adalah pertimbangan auditor yang bernama dan bertanggal.',
  ];

  return {
    kind: 'engagement-diagnostic',
    scope: 'engagement',
    fileName: 'Diagnostik Forensik & Pajak'
      + (input.engagementLabel ? ' — ' + input.engagementLabel : '') + '.xlsx',
    title: 'Diagnostik Forensik & Pajak — temuan & keputusan auditor',
    meta,
    sheets: [temuan, detektor],
  };
}
