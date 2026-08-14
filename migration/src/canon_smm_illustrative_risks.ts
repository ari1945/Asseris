/* ============================================================
   Asseris — Risiko Mutu ILUSTRATIF (Matriks Ilustrasi Risiko Mutu V3, IAPI)
   ------------------------------------------------------------
   SMM 1 ¶25 mewajibkan KAP mengidentifikasi & menilai risiko mutu atas
   pencapaian tiap tujuan mutu ¶28–33. IAPI menerbitkan Matriks Ilustrasi
   Risiko Mutu sebagai BAHAN PERCAKAPAN — bukan proforma.

   Modul ini menyediakan saran BACA-SAJA pada panel tujuan mutu, supaya
   tujuan yang belum punya risiko tidak berhadapan dengan halaman kosong.

   ------------------------------------------------------------
   TIGA PAGAR YANG TIDAK BOLEH DIRUNTUHKAN

   1. HAK CIPTA (UU 28/2014). `summary` di bawah adalah RUMUSAN ULANG
      ringkas-fungsional yang ditulis sendiri — bukan salinan kalimat
      Matriks. Pola yang sama dipakai `canon_smm_objectives.ts` untuk teks
      SMM 1. Menambah entri dengan menyalin-tempel dari PDF adalah
      pelanggaran, sekalipun hasilnya "lebih akurat".

   2. TIDAK ADA JALUR TULIS KE `SOQM_RISKS`. Modul ini tidak mengekspor
      mutator apa pun. Saran ilustratif TIDAK BOLEH bisa "diadopsi semua"
      ke register risiko firma — itu persis yang dilarang Matriks
      ("Anda tidak boleh memasukkan seluruh contoh risiko mutu ini tanpa
      mempertimbangkan apakah risiko tersebut benar-benar relevan dengan
      sifat dan kondisi KAP Anda"). Adopsi, bila kelak diinginkan, harus
      per-item, sadar, dan lewat keputusan terpisah.

   3. SARAN ≠ RISIKO FIRMA. Cakupan tujuan (`objectiveCoverage`) TIDAK
      boleh menghitung saran ini sebagai risiko yang terdaftar. Sebuah
      tujuan tetap defisiensi rancangan sampai KAP menetapkan risikonya
      sendiri.

   ------------------------------------------------------------
   CAKUPAN: Matriks hanya memetakan ENAM komponen (¶28–33). Proses
   Penilaian Risiko KAP (¶23–27) & Pemantauan-Remediasi (¶35–47) tidak
   punya baris tujuan di sana — itu batas aset IAPI, bukan celah firma.

   PR-8a-2a memuat komponen 1 (¶28) & 2 (¶29). Komponen 3–6 menyusul di
   8a-2b & 8a-2c; `illustrativeRisksFor()` mengembalikan array kosong
   untuk tujuan yang belum dimuat, dan panel tidak menampilkan apa pun.

   Murni & deterministik — tanpa React, efek samping, atau `window`.
   ============================================================ */

import { SMM1_OBJECTIVE_BY_ID } from './canon_smm_objectives';

/** Atribusi tunggal untuk SELURUH entri — tak ada entri tanpa sumber. */
export const ILLUSTRATIVE_RISK_SOURCE =
  'Matriks Ilustrasi Risiko Mutu V3 (IAPI, 16 Juni 2025) — dirumuskan ulang, bukan kutipan';

/** Label pendek untuk UI; menegaskan sifatnya sebagai saran. */
export const ILLUSTRATIVE_RISK_LABEL = 'Risiko ilustratif IAPI (saran, bukan ketentuan)';

export interface IllustrativeRisk {
  /** `IR-<para><butir>-<urut>`, mis. `IR-28a-3`. */
  readonly id: string;
  /** Tujuan mutu mandatori yang diancam, mis. `QO-28a`. */
  readonly objectiveId: string;
  /** Rumusan ulang ringkas-fungsional (BUKAN kutipan Matriks). */
  readonly summary: string;
  /** Nomor dokumen Toolkit yang Matriks sebut sebagai ilustrasi responsnya. */
  readonly toolkitDocs: readonly string[];
}

const R = (
  objectiveId: string,
  seq: number,
  summary: string,
  toolkitDocs: readonly string[],
): IllustrativeRisk => ({
  id: `IR-${objectiveId.slice(3)}-${seq}`,
  objectiveId,
  summary,
  toolkitDocs,
});

/* ------------------------------------------------------------
   Komponen 1 · ¶28 Tata Kelola dan Kepemimpinan — 16 risiko
   ------------------------------------------------------------ */
const P28: readonly IllustrativeRisk[] = [
  R('QO-28a', 1, 'Akuntabilitas mutu tidak diperbarui dan tidak dikomunikasikan, sehingga personel tidak tahu siapa bertanggung jawab atas apa.', ['3.1', '3.2']),
  R('QO-28a', 2, 'Mutu tidak ikut dipertimbangkan dalam keputusan dan aktivitas strategis pimpinan.', ['3.1']),
  R('QO-28a', 3, 'Ketika berbenturan, pertimbangan keuangan dan operasional menang atas etika, standar profesional, nilai, dan sikap.', ['3.1', '3.2']),
  R('QO-28a', 4, 'Tidak ada tolok ukur mutu yang dipakai untuk menegaskan peran KAP melayani kepentingan publik lewat perikatan bermutu.', ['3.1', '3.2']),
  R('QO-28a', 5, 'Tolok ukur mutu ada tetapi berbobot kecil dalam penilaian kinerja, sehingga tidak mengubah perilaku.', ['7.5']),
  R('QO-28a', 6, 'Sumber daya untuk manajemen mutu kalah prioritas dari kebutuhan lain.', ['1.2', '3.1']),
  R('QO-28a', 7, 'Tanggung jawab manajemen mutu jatuh pada pihak yang tidak tepat kewenangan atau kompetensinya.', ['3.2']),
  R('QO-28a', 8, 'Skema insentif hanya menghargai capaian keuangan dan operasional, sehingga perilaku bermutu tidak berimbalan.', ['3.1']),

  R('QO-28b', 1, 'Pimpinan tidak memikul akuntabilitas mutu secara eksplisit, termasuk atas ketepatan waktu tindakan remedial.', ['3.2', '9.2']),
  R('QO-28b', 2, 'Sistem tidak menghasilkan informasi untuk menilai pencapaian mutu oleh pimpinan, sehingga akuntabilitasnya tak terukur.', ['1.1', '9.2']),

  R('QO-28c', 1, 'Komitmen mutu tidak konsisten terlihat dalam tindakan, perilaku, dan komunikasi pimpinan di tingkat KAP.', ['9.2']),
  R('QO-28c', 2, 'Penilaian kinerja peran kunci — rekan perikatan, penelaah mutu perikatan, pakar, pemegang tanggung jawab SMM — terlambat atau tidak dilakukan.', ['3.2', '7.5', '7.6']),

  R('QO-28d', 1, 'Struktur, peran, tanggung jawab, dan wewenang tidak dipahami personel meskipun sudah tertulis.', ['1.2', '1.3']),
  R('QO-28d', 2, 'Struktur dan penugasan yang ada tidak memadai untuk merancang, mengimplementasikan, dan mengoperasikan SMM — bukan sekadar tidak dipahami.', ['3.2']),

  R('QO-28e', 1, 'Sumber daya yang dibutuhkan untuk memenuhi komitmen mutu tidak dapat diperoleh.', ['3.1', '3.2']),
  R('QO-28e', 2, 'Kebutuhan sumber daya, termasuk keuangan, tidak direncanakan, sehingga penugasan dan alokasi ditentukan keadaan.', ['3.1', '3.2']),
];

/* ------------------------------------------------------------
   Komponen 2 · ¶29 Ketentuan Etika yang Relevan — 6 risiko
   ------------------------------------------------------------ */
const P29: readonly IllustrativeRisk[] = [
  R('QO-29a', 1, 'Ketentuan etika yang berlaku tidak didokumentasikan dan tidak dikomunikasikan di dalam KAP.', ['4.1']),
  R('QO-29a', 2, 'Ketentuan etika sudah terdokumentasi tetapi tidak dipahami personel.', ['4.1', '4.2']),
  R('QO-29a', 3, 'Personel tidak memenuhi tanggung jawabnya atas ketentuan etika yang relevan.', ['4.2', '4.3', '9.5']),
  R('QO-29a', 4, 'Pemahaman personel atau KAP atas ketentuan etika tertinggal dari perubahan terbaru.', ['4.2', '7.7']),

  R('QO-29b', 1, 'Pihak lain yang terikat ketentuan etika — jaringan, individu dalam jaringan, penyedia jasa — tidak memahaminya.', ['5.2', '5.4', '7.9']),
  R('QO-29b', 2, 'Pihak lain yang terikat ketentuan etika tidak memenuhi tanggung jawabnya.', ['6.3', '6.4', '7.9']),
];

/* Dibekukan SUNGGUHAN, bukan sekadar `readonly`: `readonly` hanya berlaku saat
   kompilasi, sedangkan SC-14 menuntut sekat yang tak bisa ditembus pemanggil
   pada saat jalan — termasuk oleh kode yang menghindari pemeriksaan tipe. */
export const ILLUSTRATIVE_RISKS: readonly IllustrativeRisk[] =
  Object.freeze([...P28, ...P29].map((r) => Object.freeze(r)));

/** Tujuan mutu yang sudah punya saran ilustratif termuat. */
export const OBJECTIVES_WITH_ILLUSTRATIVE_RISKS: readonly string[] =
  Object.freeze([...new Set(ILLUSTRATIVE_RISKS.map((r) => r.objectiveId))]);

const BY_OBJECTIVE = new Map<string, readonly IllustrativeRisk[]>();
for (const r of ILLUSTRATIVE_RISKS) {
  BY_OBJECTIVE.set(r.objectiveId, [...(BY_OBJECTIVE.get(r.objectiveId) || []), r]);
}
for (const [k, v] of BY_OBJECTIVE) BY_OBJECTIVE.set(k, Object.freeze(v));

const NO_RISKS: readonly IllustrativeRisk[] = Object.freeze([]);

/**
 * Saran risiko ilustratif untuk sebuah tujuan mutu.
 *
 * Mengembalikan array KOSONG bila tujuan itu belum dimuat (komponen 3–6
 * menyusul) atau tak dikenal — pemanggil tidak perlu menjaga daftar sendiri.
 */
export function illustrativeRisksFor(objectiveId: string | null | undefined): readonly IllustrativeRisk[] {
  if (!objectiveId) return NO_RISKS;
  return BY_OBJECTIVE.get(objectiveId) || NO_RISKS;
}

/** Union nomor dokumen Toolkit yang dirujuk saran-saran sebuah tujuan. */
export function illustrativeDocsFor(objectiveId: string | null | undefined): readonly string[] {
  const docs = new Set<string>();
  for (const r of illustrativeRisksFor(objectiveId)) for (const d of r.toolkitDocs) docs.add(d);
  return [...docs].sort();
}

/** Tujuan yang dirujuk entri tetapi tidak ada di ¶28–33 — harus selalu kosong. */
export function danglingObjectiveRefs(): readonly string[] {
  return [...new Set(
    ILLUSTRATIVE_RISKS.filter((r) => !SMM1_OBJECTIVE_BY_ID.has(r.objectiveId)).map((r) => r.objectiveId),
  )];
}
