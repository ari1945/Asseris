/* ============================================================
   Asseris — 27 Tujuan Mutu Mandatori SMM 1 (¶28–33) · SSOT
   ------------------------------------------------------------
   SMM 1 ¶24 mewajibkan KAP menetapkan tujuan mutu YANG DITENTUKAN
   OLEH STANDAR, ditambah tujuan tambahan yang dianggap perlu.
   Kedua puluh tujuh tujuan itu tercantum di ¶28–¶33:

       ¶28 Tata Kelola & Kepemimpinan   (a)–(e)   5
       ¶29 Ketentuan Etika yang Relevan (a)–(b)   2
       ¶30 Penerimaan & Keberlanjutan   (a)–(b)   2
       ¶31 Pelaksanaan Perikatan        (a)–(f)   6
       ¶32 Sumber Daya                  (a)–(h)   8
       ¶33 Informasi & Komunikasi       (a)–(d)   4
                                                 ──
                                                 27

   Sebelum modul ini, tujuan mutu di aplikasi adalah field teks
   BEBAS pada enam baris `SOQM_RISKS`, dan `QM_COMPONENTS[].obj`
   adalah integer dekoratif (4,2,5,3,6,4,2,3) yang tidak tertaut ke
   daftar tujuan mana pun — panel merender "4 tujuan" untuk Tata
   Kelola padahal tidak ada empat tujuan di mana pun dalam sistem.
   Akibatnya tidak ada gerbang yang bisa GAGAL ketika 21 dari 27
   tujuan mandatori tidak pernah dipertimbangkan.

   Modul ini menjadikan daftar itu ada, bertipe, dan tak bisa hilang.

   ------------------------------------------------------------
   ¶17 — SKALABILITAS. KAP tidak diharuskan mematuhi ketentuan yang
   tidak relevan dengan sifat & kondisinya (mis. tujuan tentang
   arahan & supervisi tim mungkin tak relevan bagi praktisi tunggal).
   Karena itu tujuan boleh DIKESAMPINGKAN — tetapi hanya lewat
   `ObjectiveWaiver` yang berjustifikasi DAN berjenjang (diusulkan
   pemegang tanggung jawab operasional ¶20(b), disetujui pemegang
   tanggung jawab tertinggi ¶20(a)). Waiver yang tak lengkap TIDAK
   menutupi tujuan — ia tetap dihitung sebagai defisiensi rancangan.

   ------------------------------------------------------------
   HAK CIPTA: SMM 1 dilindungi UU 28/2014. `title` & `aspects` di
   bawah adalah RINGKASAN FUNGSIONAL yang ditulis ulang untuk
   navigasi & penautan risiko — bukan salinan teks standar. Rujukan
   paragraf disediakan agar pengguna membaca standar aslinya.

   Murni & deterministik — tanpa React, efek samping, localStorage,
   atau pembacaan `window`.
   ============================================================ */

import { SMM1_COMPONENT_SECTION, type SmmComponentCode } from './canon_smm_refs';

/** Satu tujuan mutu mandatori. `id` berbentuk `QO-<para><butir>`, mis. `QO-32d`. */
export interface SmmObjective {
  readonly id: string;
  readonly component: SmmComponentCode;
  readonly para: 28 | 29 | 30 | 31 | 32 | 33;
  /** Butir dalam paragraf: 'a'…'h'. */
  readonly item: string;
  /** Ringkasan fungsional (bukan kutipan standar). */
  readonly title: string;
  /** Sub-aspek bernomor romawi dalam butir, bila ada. */
  readonly aspects?: readonly string[];
}

const O = (
  component: SmmComponentCode,
  para: SmmObjective['para'],
  item: string,
  title: string,
  aspects?: readonly string[],
): SmmObjective => ({ id: `QO-${para}${item}`, component, para, item, title, aspects });

/* ------------------------------------------------------------
   ¶28 · Tata Kelola dan Kepemimpinan (C1) — 5 tujuan
   ------------------------------------------------------------ */
const P28: readonly SmmObjective[] = [
  O('C1', 28, 'a', 'Budaya KAP menunjukkan komitmen terhadap mutu', [
    'Peran KAP melayani kepentingan publik lewat perikatan bermutu yang konsisten',
    'Pentingnya etika, nilai, dan sikap profesional',
    'Tanggung jawab seluruh personel atas mutu, dan perilaku yang diharapkan',
    'Pentingnya mutu dalam keputusan & tindakan strategis, termasuk prioritas keuangan dan operasional',
  ]),
  O('C1', 28, 'b', 'Kepemimpinan bertanggung jawab dan akuntabel atas mutu'),
  O('C1', 28, 'c', 'Kepemimpinan menunjukkan komitmen mutu lewat tindakan dan perilaku'),
  O('C1', 28, 'd', 'Struktur organisasi serta penugasan peran, tanggung jawab & wewenang memadai untuk mengoperasikan sistem manajemen mutu'),
  O('C1', 28, 'e', 'Kebutuhan sumber daya — termasuk sumber daya keuangan — direncanakan, dan sumber daya diperoleh serta dialokasikan konsisten dengan komitmen mutu'),
];

/* ------------------------------------------------------------
   ¶29 · Ketentuan Etika yang Relevan (C3) — 2 tujuan
   ------------------------------------------------------------ */
const P29: readonly SmmObjective[] = [
  O('C3', 29, 'a', 'KAP dan personelnya memahami dan memenuhi ketentuan etika yang relevan', [
    'Memahami ketentuan etika yang ditetapkan untuk KAP dan perikatannya',
    'Memenuhi tanggung jawabnya atas ketentuan etika tersebut',
  ]),
  O('C3', 29, 'b', 'Pihak lain yang tunduk pada ketentuan etika — jaringan, individu dalam jaringan, penyedia jasa — memahami dan memenuhinya', [
    'Memahami ketentuan etika yang berlaku bagi mereka',
    'Memenuhi tanggung jawabnya atas ketentuan etika tersebut',
  ]),
];

/* ------------------------------------------------------------
   ¶30 · Penerimaan dan Keberlanjutan (C4) — 2 tujuan
   ------------------------------------------------------------ */
const P30: readonly SmmObjective[] = [
  O('C4', 30, 'a', 'Pertimbangan menerima atau melanjutkan hubungan klien/perikatan dibuat secara tepat', [
    'Informasi memadai tentang sifat & kondisi perikatan serta integritas dan nilai etika klien',
    'Kemampuan KAP melaksanakan perikatan sesuai standar profesional & peraturan yang berlaku',
  ]),
  O('C4', 30, 'b', 'Prioritas finansial dan operasional KAP tidak mengarah pada pertimbangan penerimaan/keberlanjutan yang tidak tepat'),
];

/* ------------------------------------------------------------
   ¶31 · Pelaksanaan Perikatan (C5) — 6 tujuan
   ------------------------------------------------------------ */
const P31: readonly SmmObjective[] = [
  O('C5', 31, 'a', 'Tim perikatan memahami & memenuhi tanggung jawabnya, termasuk keterlibatan rekan perikatan yang memadai dan tepat'),
  O('C5', 31, 'b', 'Arahan, supervisi & penelaahan tepat sesuai sifat dan kondisi perikatan; pekerjaan anggota kurang berpengalaman ditelaah oleh yang lebih berpengalaman'),
  O('C5', 31, 'c', 'Tim perikatan menerapkan pertimbangan profesional dan — bila berlaku bagi jenis perikatannya — skeptisisme profesional'),
  O('C5', 31, 'd', 'Konsultasi atas hal rumit atau mengandung perbedaan pendapat dilakukan, dan kesimpulannya diimplementasikan'),
  O('C5', 31, 'e', 'Perbedaan pendapat menjadi perhatian KAP dan diselesaikan'),
  O('C5', 31, 'f', 'Dokumentasi perikatan disusun tepat waktu setelah tanggal laporan, lalu dijaga dan disimpan sesuai kebutuhan KAP, peraturan, ketentuan etika & standar profesional'),
];

/* ------------------------------------------------------------
   ¶32 · Sumber Daya (C6) — 8 tujuan
   ------------------------------------------------------------ */
const P32: readonly SmmObjective[] = [
  O('C6', 32, 'a', 'Personel direkrut, dikembangkan & dipertahankan dengan kompetensi dan kapabilitas yang memadai', [
    'Melaksanakan perikatan bermutu secara konsisten',
    'Melaksanakan aktivitas atau tanggung jawab dalam pengoperasian sistem manajemen mutu',
  ]),
  O('C6', 32, 'b', 'Personel menunjukkan komitmen mutu lewat tindakan & perilaku, dan diakui melalui evaluasi, kompensasi, promosi serta insentif secara berkala'),
  O('C6', 32, 'c', 'Individu dari sumber eksternal diperoleh ketika KAP tidak memiliki personel yang memadai atau tepat'),
  O('C6', 32, 'd', 'Anggota tim perikatan — termasuk rekan perikatan — memiliki kompetensi & kapabilitas yang tepat, termasuk waktu yang cukup'),
  O('C6', 32, 'e', 'Individu yang melaksanakan aktivitas dalam sistem manajemen mutu memiliki kompetensi & kapabilitas yang tepat, termasuk waktu yang cukup'),
  O('C6', 32, 'f', 'Sumber daya teknologi yang tepat diperoleh, diimplementasikan, dipelihara & digunakan'),
  O('C6', 32, 'g', 'Sumber daya intelektual yang tepat diperoleh, dipelihara & digunakan, serta konsisten dengan standar profesional dan peraturan yang berlaku'),
  O('C6', 32, 'h', 'Sumber daya manusia, teknologi atau intelektual dari penyedia jasa tepat untuk digunakan dalam sistem manajemen mutu dan pelaksanaan perikatan'),
];

/* ------------------------------------------------------------
   ¶33 · Informasi dan Komunikasi (C7) — 4 tujuan
   ------------------------------------------------------------ */
const P33: readonly SmmObjective[] = [
  O('C7', 33, 'a', 'Sistem informasi mengidentifikasi, merekam, memproses & memelihara informasi yang relevan dan andal dari sumber internal maupun eksternal'),
  O('C7', 33, 'b', 'Budaya KAP mengakui & memperkuat tanggung jawab personel untuk bertukar informasi'),
  O('C7', 33, 'c', 'Informasi yang relevan dan andal dipertukarkan di seluruh KAP dan dengan tim perikatan', [
    'Turun — informasi cukup agar personel & tim memahami dan melaksanakan tanggung jawabnya',
    'Naik — personel & tim perikatan mengomunikasikan informasi kepada KAP',
  ]),
  O('C7', 33, 'd', 'Informasi yang relevan dan andal dikomunikasikan kepada pihak eksternal', [
    'Kepada atau dalam jaringan KAP atau penyedia jasa, agar mereka memenuhi tanggung jawabnya',
    'Secara eksternal bila diharuskan peraturan atau standar profesional, atau untuk mendukung pemahaman pihak eksternal atas sistem manajemen mutu',
  ]),
];

/** Kedua puluh tujuh tujuan mutu mandatori, berurutan menurut paragraf & butir. */
export const SMM1_OBJECTIVES: readonly SmmObjective[] = [...P28, ...P29, ...P30, ...P31, ...P32, ...P33];

/** Jumlah tujuan mandatori yang ditetapkan standar. Dipakai uji sebagai oracle. */
export const SMM1_OBJECTIVE_COUNT = 27;

/** Peta id → tujuan, untuk penautan cepat dari register risiko. */
export const SMM1_OBJECTIVE_BY_ID: ReadonlyMap<string, SmmObjective> =
  new Map(SMM1_OBJECTIVES.map((o) => [o.id, o]));

/** Tujuan mandatori milik satu komponen (C1/C3/C4/C5/C6/C7). */
export function objectivesForComponent(code: SmmComponentCode): readonly SmmObjective[] {
  return SMM1_OBJECTIVES.filter((o) => o.component === code);
}

/* ============================================================
   Cakupan tujuan mutu — gerbang yang BISA GAGAL
   ============================================================ */

/** Baris register risiko, sepanjang yang dibutuhkan gerbang ini. */
export interface ObjectiveLinkedRisk {
  readonly id?: string | null;
  /** Id tujuan mutu yang dialamatkan risiko ini, mis. `['QO-32d']`. */
  readonly objectives?: readonly string[] | null;
}

/**
 * Pengesampingan tujuan mandatori berdasarkan ¶17.
 *
 * Sah HANYA bila berjustifikasi DAN berjenjang: diusulkan pemegang tanggung
 * jawab operasional (¶20(b)) lalu disetujui pemegang tanggung jawab tertinggi
 * (¶20(a)). Menandai tujuan mandatori "tidak relevan" adalah pertimbangan
 * profesional tingkat firma — ia harus meninggalkan jejak, bukan menjadi
 * sakelar sunyi.
 */
export interface ObjectiveWaiver {
  readonly objectiveId: string;
  readonly justification?: string | null;
  /** Penanda tangan ¶20(b) — pengusul. */
  readonly proposedBy?: string | null;
  /** Penanda tangan ¶20(a) — penyetuju. */
  readonly approvedBy?: string | null;
}

export type WaiverDefect = 'no-justification' | 'not-proposed' | 'not-approved' | 'unknown-objective';

export interface WaiverAudit {
  readonly objectiveId: string;
  readonly valid: boolean;
  readonly defects: readonly WaiverDefect[];
}

export interface ObjectiveCoverage {
  /** Tujuan yang ditautkan ke ≥1 risiko mutu. */
  readonly covered: readonly string[];
  /** Tujuan yang dikesampingkan lewat waiver yang SAH (¶17). */
  readonly waived: readonly string[];
  /**
   * Tujuan mandatori tanpa risiko dan tanpa waiver sah.
   * Ini adalah DEFISIENSI RANCANGAN — bukan sel kosong.
   */
  readonly uncovered: readonly string[];
  /** Audit tiap waiver; yang tak sah tidak menutupi tujuannya. */
  readonly waiverAudit: readonly WaiverAudit[];
  /** (covered + waived) / 27, dibulatkan. */
  readonly addressedPct: number;
  /** Seluruh 27 tujuan tertangani. Satu-satunya keadaan "lengkap". */
  readonly complete: boolean;
}

function auditWaiver(w: ObjectiveWaiver): WaiverAudit {
  const defects: WaiverDefect[] = [];
  if (!SMM1_OBJECTIVE_BY_ID.has(w.objectiveId)) defects.push('unknown-objective');
  if (!(w.justification || '').trim()) defects.push('no-justification');
  if (!(w.proposedBy || '').trim()) defects.push('not-proposed');
  if (!(w.approvedBy || '').trim()) defects.push('not-approved');
  return { objectiveId: w.objectiveId, valid: defects.length === 0, defects };
}

/**
 * Keadaan cakupan seluruh tujuan mandatori.
 *
 * Sengaja dihitung atas 27 TUJUAN, bukan atas 8 komponen. Metrik lama
 * ("Cakupan Komponen") membagi jumlah komponen yang punya ≥1 risiko dengan
 * jumlah komponen — sehingga satu risiko pada satu komponen sudah membuat
 * komponen itu "tercakup", dan 21 tujuan yang tak tersentuh tak pernah
 * terlihat.
 */
export function objectiveCoverage(
  risks: readonly ObjectiveLinkedRisk[] | null | undefined,
  waivers: readonly ObjectiveWaiver[] | null | undefined,
): ObjectiveCoverage {
  const linked = new Set<string>();
  for (const r of risks || []) {
    for (const id of r?.objectives || []) {
      if (SMM1_OBJECTIVE_BY_ID.has(id)) linked.add(id);
    }
  }

  const waiverAudit = (waivers || []).filter(Boolean).map(auditWaiver);
  const validWaived = new Set(waiverAudit.filter((a) => a.valid).map((a) => a.objectiveId));

  const covered: string[] = [];
  const waived: string[] = [];
  const uncovered: string[] = [];

  for (const o of SMM1_OBJECTIVES) {
    if (linked.has(o.id)) covered.push(o.id);
    else if (validWaived.has(o.id)) waived.push(o.id);
    else uncovered.push(o.id);
  }

  const addressed = covered.length + waived.length;
  return {
    covered, waived, uncovered, waiverAudit,
    addressedPct: Math.round(addressed / SMM1_OBJECTIVE_COUNT * 100),
    complete: uncovered.length === 0,
  };
}

/** Rincian cakupan per komponen — untuk kartu komponen di UI. */
export interface ComponentCoverage {
  readonly component: SmmComponentCode;
  readonly total: number;
  readonly covered: number;
  readonly waived: number;
  readonly uncovered: number;
}

export function coverageByComponent(cov: ObjectiveCoverage): readonly ComponentCoverage[] {
  const codes = Object.keys(SMM1_COMPONENT_SECTION) as SmmComponentCode[];
  const cSet = new Set(cov.covered), wSet = new Set(cov.waived);
  return codes
    .map((component) => {
      const objs = objectivesForComponent(component);
      const covered = objs.filter((o) => cSet.has(o.id)).length;
      const waived = objs.filter((o) => wSet.has(o.id)).length;
      return { component, total: objs.length, covered, waived, uncovered: objs.length - covered - waived };
    })
    .filter((c) => c.total > 0);   // C2 & C8 adalah PROSES, bukan pemilik tujuan ¶28–33
}
