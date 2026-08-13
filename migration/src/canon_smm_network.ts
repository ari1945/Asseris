/* ============================================================
   Asseris — Ketentuan Jaringan & Jasa Jaringan SMM 1 ¶48–52 · SSOT
   ------------------------------------------------------------
   ¶48  KAP yang termasuk dalam suatu jaringan harus MEMAHAMI:
        (a) ketentuan jaringan atas sistem manajemen mutu KAP;
        (b) jasa/sumber daya jaringan yang DIPILIH KAP untuk dipakai;
        (c) TANGGUNG JAWAB KAP atas tindakan yang diperlukan untuk
            mengimplementasikannya.
        KAP TETAP bertanggung jawab atas sistem manajemen mutunya, dan
        TIDAK BOLEH membiarkan kepatuhan pada ketentuan jaringan
        melanggar ketentuan SMM.

   ¶49  Berdasarkan pemahaman itu KAP harus:
        (a) menentukan bagaimana ketentuan/jasa jaringan relevan dan
            dipertimbangkan dalam sistem manajemen mutunya;
        (b) MENGEVALUASI apakah — dan bagaimana — ketentuan/jasa itu
            perlu DIADAPTASI atau DITAMBAH agar tepat digunakan.

   ¶50  Bila jaringan melaksanakan aktivitas pemantauan atas sistem
        manajemen mutu KAP: tentukan pengaruhnya terhadap pemantauan
        KAP sendiri (¶36–38), tentukan tanggung jawab KAP, dan
        PEROLEH HASILNYA TEPAT WAKTU sebagai bagian dari evaluasi
        temuan (¶40).

   ¶51  KAP harus memahami lingkup pemantauan jaringan di seluruh
        jaringan KAP, dan SEKURANG-KURANGNYA SEKALI SETAHUN memperoleh
        informasi hasil keseluruhannya, lalu mengomunikasikannya ke
        tim perikatan dan mempertimbangkan pengaruhnya.

   ¶52  Bila KAP mengidentifikasi DEFISIENSI dalam ketentuan/jasa
        jaringan: komunikasikan ke jaringan, DAN rancang serta
        implementasikan tindakan remedial (¶42).

   ------------------------------------------------------------
   MENGAPA MODUL INI ADA

   Register lama memperlakukan jaringan sebagai SATU BARIS VENDOR di
   `QM_PROVIDERS`:

       { name: 'Jaringan Afiliasi Global (AGN-Asia)', type: 'Jaringan',
         reliance: '…', evaluated: '2025-11', status: 'Memadai' }

   Satu baris dengan kolom `status: 'Memadai'` tidak dapat menyatakan
   apa pun tentang ¶48–52: tidak ada ketentuan jaringan yang terdaftar,
   tidak ada penetapan tanggung jawab KAP (¶48(c)), tidak ada evaluasi
   adaptasi (¶49(b)), tidak ada hasil pemantauan tahunan (¶51(b)), dan
   tidak ada jalur defisiensi balik ke jaringan (¶52).

   Toolkit & Matriks Ilustrasi IAPI TIDAK menolong di sini — keduanya
   ditulis untuk KAP NON-JARINGAN. Wadah ini karena itu bersandar
   langsung pada teks SMM 1.

   Murni & deterministik — tanpa React, efek samping, localStorage,
   atau pembacaan `window`.
   ============================================================ */

/** Bagaimana KAP memperlakukan sebuah ketentuan/jasa jaringan (¶49(b)). */
export type NetworkAdaptation =
  | 'as-is'        // dipakai apa adanya — tetap menuntut alasan
  | 'adapted'      // disesuaikan dengan sifat & kondisi KAP
  | 'supplemented' // ditambah kontrol KAP sendiri
  | 'rejected';    // tidak dipakai (mis. bertentangan dengan SMM)

export const ADAPTATION_LABEL: Record<NetworkAdaptation, string> = {
  'as-is': 'Dipakai apa adanya',
  'adapted': 'Diadaptasi untuk sifat & kondisi KAP',
  'supplemented': 'Ditambah kontrol KAP sendiri',
  'rejected': 'Tidak dipakai',
};

/** Ketentuan jaringan (¶48(a)) atau jasa jaringan (¶48(b)). */
export interface NetworkItem {
  readonly id: string;
  readonly kind: 'requirement' | 'service';
  readonly title: string;
  /** Komponen SMM yang disentuh, bila relevan. */
  readonly component?: string | null;
  /** ¶48(c) — individu/peran di KAP yang bertanggung jawab mengimplementasikan. */
  readonly firmResponsibility?: string | null;
  /** ¶49(b) — hasil evaluasi adaptasi. */
  readonly adaptation?: NetworkAdaptation | null;
  /** ¶49(b) — dasar pertimbangan. Wajib: evaluasi tanpa alasan bukan evaluasi. */
  readonly adaptationBasis?: string | null;
}

/** ¶51(b) — hasil pemantauan jaringan di seluruh jaringan KAP. */
export interface NetworkMonitoringResult {
  /** Tahun cakupan hasil pemantauan. */
  readonly year: number;
  /** Tanggal hasil diperoleh KAP (ISO). Kosong = belum diperoleh. */
  readonly obtainedAt?: string | null;
  /** ¶51(b)(i) — sudah dikomunikasikan ke tim perikatan & individu terkait. */
  readonly communicatedToTeams?: boolean | null;
  /** ¶51(b)(ii) — pengaruhnya terhadap SMM KAP sudah dipertimbangkan. */
  readonly effectConsidered?: boolean | null;
}

/** ¶52 — defisiensi yang KAP identifikasi DALAM ketentuan/jasa jaringan. */
export interface NetworkDeficiency {
  readonly id: string;
  /** Ketentuan/jasa jaringan yang cacat. */
  readonly itemId: string;
  readonly description?: string | null;
  /** ¶52(a) — sudah dikomunikasikan kepada jaringan. */
  readonly communicatedToNetwork?: boolean | null;
  /** ¶52(b) — tindakan remedial KAP dirancang & diimplementasikan (¶42). */
  readonly remedialAction?: string | null;
}

export type NetworkDefectCode =
  | 'no-firm-responsibility'   // ¶48(c)
  | 'no-adaptation-evaluation' // ¶49(b)
  | 'no-adaptation-basis'      // ¶49(b) — kesimpulan tanpa dasar
  | 'monitoring-not-obtained'  // ¶51(b)
  | 'monitoring-not-communicated' // ¶51(b)(i)
  | 'monitoring-effect-not-considered' // ¶51(b)(ii)
  | 'deficiency-not-communicated' // ¶52(a)
  | 'deficiency-no-remedial';  // ¶52(b)

export const NETWORK_DEFECT_LABEL: Record<NetworkDefectCode, string> = {
  'no-firm-responsibility': 'Tanggung jawab KAP atas implementasinya belum ditetapkan (¶48(c))',
  'no-adaptation-evaluation': 'Belum dievaluasi apakah perlu diadaptasi atau ditambah (¶49(b))',
  'no-adaptation-basis': 'Kesimpulan adaptasi tanpa dasar pertimbangan tertulis (¶49(b))',
  'monitoring-not-obtained': 'Hasil pemantauan jaringan tahun berjalan belum diperoleh (¶51(b))',
  'monitoring-not-communicated': 'Hasil pemantauan jaringan belum dikomunikasikan ke tim perikatan (¶51(b)(i))',
  'monitoring-effect-not-considered': 'Pengaruh hasil pemantauan terhadap SMM KAP belum dipertimbangkan (¶51(b)(ii))',
  'deficiency-not-communicated': 'Defisiensi jaringan belum dikomunikasikan kepada jaringan (¶52(a))',
  'deficiency-no-remedial': 'Belum ada tindakan remedial KAP atas defisiensi jaringan (¶52(b))',
};

export interface NetworkItemAudit {
  readonly itemId: string;
  readonly defects: readonly NetworkDefectCode[];
  readonly compliant: boolean;
}

export interface NetworkDeficiencyAudit {
  readonly deficiencyId: string;
  readonly defects: readonly NetworkDefectCode[];
  readonly compliant: boolean;
}

export interface NetworkAssessment {
  /** KAP bukan bagian jaringan — ¶48–52 tidak terterap. */
  readonly applicable: boolean;
  readonly items: readonly NetworkItemAudit[];
  readonly monitoringDefects: readonly NetworkDefectCode[];
  readonly deficiencies: readonly NetworkDeficiencyAudit[];
  /** Seluruh cacat unik, untuk ringkasan. */
  readonly allDefects: readonly NetworkDefectCode[];
  readonly compliant: boolean;
}

function auditItem(it: NetworkItem): NetworkItemAudit {
  const defects: NetworkDefectCode[] = [];
  if (!(it.firmResponsibility || '').trim()) defects.push('no-firm-responsibility');
  if (!it.adaptation) defects.push('no-adaptation-evaluation');
  else if (!(it.adaptationBasis || '').trim()) defects.push('no-adaptation-basis');
  return { itemId: it.id, defects, compliant: defects.length === 0 };
}

function auditMonitoring(
  results: readonly NetworkMonitoringResult[] | null | undefined,
  currentYear: number,
): readonly NetworkDefectCode[] {
  const defects: NetworkDefectCode[] = [];
  const r = (results || []).find((x) => x && x.year === currentYear);
  if (!r || !(r.obtainedAt || '').trim()) {
    /* ¶51(b) menuntut SEKURANG-KURANGNYA SEKALI SETAHUN. Ketiadaan hasil
       tahun berjalan adalah kegagalan, bukan sekadar "belum". */
    return ['monitoring-not-obtained'];
  }
  if (r.communicatedToTeams !== true) defects.push('monitoring-not-communicated');
  if (r.effectConsidered !== true) defects.push('monitoring-effect-not-considered');
  return defects;
}

function auditDeficiency(d: NetworkDeficiency): NetworkDeficiencyAudit {
  const defects: NetworkDefectCode[] = [];
  if (d.communicatedToNetwork !== true) defects.push('deficiency-not-communicated');
  if (!(d.remedialAction || '').trim()) defects.push('deficiency-no-remedial');
  return { deficiencyId: d.id, defects, compliant: defects.length === 0 };
}

/**
 * Penilaian kepatuhan ¶48–52.
 *
 * `inNetwork` false ⇒ tidak terterap (¶48 hanya berlaku bagi KAP yang
 * termasuk dalam suatu jaringan) — dan itu dinyatakan eksplisit, bukan
 * diam-diam lolos.
 */
export function assessNetwork(
  inNetwork: boolean,
  items: readonly NetworkItem[] | null | undefined,
  monitoring: readonly NetworkMonitoringResult[] | null | undefined,
  deficiencies: readonly NetworkDeficiency[] | null | undefined,
  currentYear: number,
): NetworkAssessment {
  if (!inNetwork) {
    return {
      applicable: false, items: [], monitoringDefects: [], deficiencies: [],
      allDefects: [], compliant: true,
    };
  }

  const itemAudits = (items || []).filter(Boolean).map(auditItem);
  const monitoringDefects = auditMonitoring(monitoring, currentYear);
  const defAudits = (deficiencies || []).filter(Boolean).map(auditDeficiency);

  const all = new Set<NetworkDefectCode>();
  itemAudits.forEach((a) => a.defects.forEach((d) => all.add(d)));
  monitoringDefects.forEach((d) => all.add(d));
  defAudits.forEach((a) => a.defects.forEach((d) => all.add(d)));

  return {
    applicable: true,
    items: itemAudits,
    monitoringDefects,
    deficiencies: defAudits,
    allDefects: [...all],
    compliant: all.size === 0,
  };
}

/** Kalimat siap-tampil untuk satu cacat. */
export function networkDefectLabel(code: NetworkDefectCode): string {
  return NETWORK_DEFECT_LABEL[code];
}
