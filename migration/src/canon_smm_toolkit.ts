/* ============================================================
   Asseris — Peta Toolkit Manajemen Mutu IAPI (V3) · SSOT
   ------------------------------------------------------------
   Toolkit Manajemen Mutu V3 (IAPI, 05-06-2025) memuat 41 dokumen
   ilustratif (1.1 s.d. 9.7). Matriks Ilustrasi Risiko Mutu V3
   (IAPI, 16-06-2025) memetakan tiap TUJUAN MUTU mandatori ke
   dokumen Toolkit yang menjadi ilustrasi responsnya — kolom
   ketiganya berbunyi harfiah "Kolom ini menyediakan acuan ke
   dokumen Toolkit Manajemen Mutu".

   Asseris sudah punya sisi kiri peta itu (`SMM1_OBJECTIVES`, 27
   tujuan bertipe dengan id stabil) dan NOL sisi kanannya. Akibatnya
   aplikasi tidak dapat menjawab pertanyaan inspektur P2PK yang
   paling wajar: "Respons Anda terhadap tujuan mutu ini berbentuk
   dokumen apa, dan di mana dokumen itu?"

   ------------------------------------------------------------
   BATAS ASET — WAJIB DIBEDAKAN DARI CELAH FIRMA

   · Matriks hanya mencakup ENAM komponen (¶28–33). Proses Penilaian
     Risiko (¶23–27) & Pemantauan-Remediasi (¶35–47) tidak punya
     baris tujuan di Matriks sama sekali.
   · Toolkit & Matriks ditulis untuk KAP NON-JARINGAN. Ketentuan
     jaringan ¶48–52 dan dokumentasi ¶59 karena itu TIDAK punya
     dokumen Toolkit — itu batas asetnya, bukan kekurangan firma.
   · Matriks merujuk "8.2 Penilaian budaya - mutu" pada tiga tujuan
     (¶30(b), ¶33(a), ¶33(c)) padahal Toolkit V3 seksi 8 berhenti di
     8.1 — rujukan MENGGANTUNG di materi IAPI sendiri. Dilaporkan
     apa adanya lewat `TOOLKIT_DANGLING_REFS`, bukan dikarang
     dokumennya dan bukan dibuang diam-diam.

   ------------------------------------------------------------
   HAK CIPTA (UU 28/2014)

   Yang disimpan di sini adalah METADATA RUJUKAN — nomor, judul, dan
   jenis dokumen. Isi dokumen TIDAK disalin. Toolkit bersifat
   ILUSTRATIF, bukan proforma: Matriks melarang eksplisit memasukkan
   contoh tanpa mempertimbangkan relevansinya bagi KAP.

   Murni & deterministik — tanpa React, efek samping, localStorage,
   atau pembacaan `window`.
   ============================================================ */
import { SMM1_OBJECTIVES, type SmmObjective } from './canon_smm_objectives';

/** Jenis dokumen Toolkit — menentukan cara pakainya, bukan isinya. */
export type ToolkitKind = 'policy' | 'checklist' | 'form' | 'letter' | 'register' | 'guidance' | 'reference';

export const TOOLKIT_KIND_LABEL: Record<ToolkitKind, string> = {
  policy: 'Pernyataan kebijakan',
  checklist: 'Daftar-uji',
  form: 'Formulir',
  letter: 'Contoh surat',
  register: 'Register / catatan',
  guidance: 'Panduan',
  reference: 'Dokumen acuan',
};

/**
 * Seberapa jauh dokumen Toolkit punya "rumah" di Asseris.
 *
 * `partial` sengaja dibedakan dari `none`: ada dokumen yang
 * PROSESNYA sudah hidup di aplikasi sementara ARTEFAKNYA belum —
 * mis. keputusan menghentikan klien tercatat di `continuance`,
 * tetapi formulir & surat keluar klien tidak ada di mana pun.
 * Melaporkan keduanya sebagai "tidak ada rumah" akan menutupi
 * bedanya; melaporkan keduanya "ada" akan menutupi celahnya.
 */
export type ToolkitHome = 'mapped' | 'partial' | 'none';

export const TOOLKIT_HOME_LABEL: Record<ToolkitHome, string> = {
  mapped: 'Ada modul yang menampung',
  partial: 'Prosesnya ada, artefaknya belum',
  none: 'Belum ada rumah di Asseris',
};

export interface ToolkitDoc {
  /** Nomor dokumen Toolkit, mis. '5.7'. */
  readonly no: string;
  /** Seksi 1–9. */
  readonly section: number;
  readonly title: string;
  readonly kind: ToolkitKind;
  /** Modul Asseris yang menampungnya; wajib id nyata di MODULE_INDEX. */
  readonly modules: readonly string[];
  readonly home: ToolkitHome;
  /** Wajib bila `home` bukan 'mapped' — apa persisnya yang belum ada. */
  readonly gap?: string;
}

const D = (
  no: string, title: string, kind: ToolkitKind,
  modules: readonly string[], home: ToolkitHome = 'mapped', gap?: string,
): ToolkitDoc => ({ no, section: Number(no.split('.')[0]), title, kind, modules, home, gap });

/* ------------------------------------------------------------
   41 dokumen Toolkit V3 — 3·2·2·3·8·6·9·1·7
   ------------------------------------------------------------ */

export const TOOLKIT_SECTION_TITLE: Record<number, string> = {
  1: 'Dokumentasi',
  2: 'Proses Penilaian Risiko',
  3: 'Tata Kelola dan Kepemimpinan',
  4: 'Ketentuan Etika yang Relevan',
  5: 'Penerimaan dan Keberlanjutan',
  6: 'Pelaksanaan Perikatan',
  7: 'Sumber Daya',
  8: 'Informasi dan Komunikasi',
  9: 'Pemantauan dan Remediasi',
};

export const TOOLKIT_DOCS: readonly ToolkitDoc[] = [
  /* 1 · Dokumentasi */
  D('1.1', 'Pernyataan Kebijakan Dokumentasi', 'policy', ['soqm', 'records']),
  D('1.2', 'Dokumen Sentral Sistem Manajemen Mutu', 'reference', ['governance', 'soqm']),
  D('1.3', 'Struktur KAP', 'reference', ['orgchart', 'governance']),

  /* 2 · Proses Penilaian Risiko */
  D('2.1', 'Pernyataan Kebijakan Proses Penilaian Risiko', 'policy', ['soqm']),
  D('2.2', 'Matriks Penilaian Risiko', 'register', ['soqm']),

  /* 3 · Tata Kelola dan Kepemimpinan */
  D('3.1', 'Pernyataan Kebijakan Tata Kelola dan Kepemimpinan', 'policy', ['governance']),
  D('3.2', 'Penugasan Tanggung Jawab', 'register', ['governance']),

  /* 4 · Ketentuan Etika yang Relevan */
  D('4.1', 'Pernyataan Kebijakan Ketentuan Etika yang Relevan', 'policy', ['ethics']),
  D('4.2', 'Konfirmasi Independensi Tahunan', 'form', ['independence']),
  D('4.3', 'Memorandum Penyelesaian Isu Terkait Independensi', 'form', ['independence', 'teamindep']),

  /* 5 · Penerimaan dan Keberlanjutan */
  D('5.1', 'Pernyataan Kebijakan Penerimaan dan Keberlanjutan', 'policy', ['onboarding', 'continuance']),
  D('5.2', 'Pertanyaan Screening untuk Klien', 'checklist', ['onboarding']),
  D('5.3', 'Formulir Klien Baru', 'form', ['onboarding', 'crm']),
  D('5.4', 'Surat Terkait Etika', 'letter', ['onboarding', 'ethics']),
  D('5.5', 'Checklist Penerimaan Klien Baru', 'checklist', ['onboarding']),
  D('5.6', 'Checklist Retensi Klien', 'checklist', ['continuance']),
  D('5.7', 'Formulir Klien Keluar (Client Exit Form)', 'form', ['continuance'], 'partial',
    'Keputusan "Tidak Dilanjutkan" tercatat di Keberlanjutan Klien, tetapi tidak ada formulir keluar klien: alasan, serah-terima, kewajiban tersisa & komunikasi ke penerus tidak punya tempat.'),
  D('5.8', 'Surat Klien Keluar (Client Exit Letter)', 'letter', ['continuance'], 'partial',
    'Tidak ada contoh/penerbitan surat pemberitahuan pengunduran diri kepada klien.'),

  /* 6 · Pelaksanaan Perikatan */
  D('6.1', 'Pernyataan Kebijakan Pelaksanaan Perikatan', 'policy', ['programme']),
  D('6.2', 'Formulir Pengendalian Pekerjaan', 'form', ['programme', 'workpapers']),
  D('6.3', 'Menggunakan Pekerjaan Pakar', 'guidance', ['expert']),
  D('6.4', 'Checklist untuk Menggunakan Pakar Eksternal', 'checklist', ['expert']),
  D('6.5', 'Penyelesaian Perbedaan Pendapat', 'guidance', ['eqr', 'reviewnotes']),
  D('6.6', 'Formulir Penelaahan Mutu Perikatan', 'form', ['eqr']),

  /* 7 · Sumber Daya */
  D('7.1', 'Pernyataan Kebijakan Sumber Daya', 'policy', ['hcm']),
  D('7.2', 'Deskripsi Pekerjaan', 'reference', ['hcm', 'orgchart']),
  D('7.3', 'Checklist Wawancara dan Evaluasi Kandidat', 'checklist', ['recruitment']),
  D('7.4', 'Checklist Orientasi Staf Baru', 'checklist', ['recruitment']),
  D('7.5', 'Penelaahan Kinerja Staf Profesional', 'form', ['performance']),
  D('7.6', 'Penelaahan Kinerja Staf Administrasi', 'form', ['performance']),
  D('7.7', 'Catatan Pelatihan dan Pengembangan', 'register', ['learning', 'cpe']),
  D('7.8', 'Formulir Permintaan Akuisisi Teknologi', 'form', ['procurement'], 'partial',
    'Pengadaan & Vendor mencatat kategori TI (infrastruktur, lisensi software audit), tetapi tidak menuntut penilaian KESESUAIAN teknologi bagi mutu perikatan (¶32(e)–(f)).'),
  D('7.9', 'Formulir Permintaan Penyedia Jasa Baru', 'form', ['governance', 'procurement']),

  /* 8 · Informasi dan Komunikasi */
  D('8.1', 'Pernyataan Kebijakan Informasi dan Komunikasi', 'policy', ['soqm']),

  /* 9 · Pemantauan dan Remediasi */
  D('9.1', 'Panduan Proses Pemantauan dan Remediasi', 'guidance', ['soqm']),
  D('9.2', 'Pernyataan Kebijakan Pemantauan dan Remediasi', 'policy', ['soqm']),
  D('9.3', 'Formulir Penelaahan Perikatan', 'form', ['soqm']),
  D('9.4', 'Evaluasi Sistem', 'form', ['soqm']),
  D('9.5', 'Catatan Komplain dari Klien', 'register', ['soqm']),
  D('9.6', 'Daftar Temuan', 'register', ['soqm']),
  D('9.7', 'Lembar Kerja Evaluasi Defisiensi', 'form', ['soqm']),
];

export const TOOLKIT_DOC_COUNT = 41;

export const TOOLKIT_BY_NO: ReadonlyMap<string, ToolkitDoc> =
  new Map(TOOLKIT_DOCS.map((d) => [d.no, d]));

/* ------------------------------------------------------------
   Rujukan Matriks yang MENGGANTUNG
   ------------------------------------------------------------
   Dilaporkan, bukan disembunyikan: peta yang diam-diam membuang
   rujukan yang tak dikenal akan tampak lengkap padahal tidak.
   ------------------------------------------------------------ */

export interface DanglingRef {
  readonly no: string;
  /** Judul sebagaimana dikutip Matriks. */
  readonly citedAs: string;
  readonly objectives: readonly string[];
  readonly note: string;
}

export const TOOLKIT_DANGLING_REFS: readonly DanglingRef[] = [
  {
    no: '8.2',
    citedAs: 'Penilaian budaya - mutu',
    /* PR-8a-2c — KOREKSI: QO-33a tidak pernah merujuk 8.2; yang merujuknya adalah
       QO-33b (risiko budaya berbagi informasi). Salah tujuan ini lahir dari
       kesalahan baca yang sama dengan koreksi peta di bawah. */
    objectives: ['QO-30b', 'QO-33b', 'QO-33c'],
    note: 'Dirujuk Matriks V3 sebagai respons, tetapi Toolkit V3 seksi 8 hanya memuat 8.1. Rujukan menggantung pada materi IAPI, bukan pada Asseris.',
  },
];

const DANGLING = new Set(TOOLKIT_DANGLING_REFS.map((d) => d.no));

/* ------------------------------------------------------------
   Peta tujuan mutu → dokumen Toolkit (dari Matriks V3)
   ------------------------------------------------------------
   Ke-27 tujuan mandatori ¶28–33 seluruhnya terwakili. Nomor
   dokumen diambil apa adanya dari kolom "Ilustrasi Respons".
   ------------------------------------------------------------ */

export const TOOLKIT_BY_OBJECTIVE: ReadonlyMap<string, readonly string[]> = new Map([
  ['QO-28a', ['1.2', '3.1', '3.2', '7.5']],
  /* PR-8a-2a — KOREKSI. Ketiga baris ini salah sejak 8a-1: dokumen milik satu
     tujuan merembes ke tujuan BERIKUTNYA (pergeseran satu blok). Matriks hlm. 5
     menyelaraskan baris respons dengan baris RISIKO, bukan dengan blok tujuan:
       (b) risiko-2 "SMM tidak menghasilkan informasi …" → 9.2 DAN 1.1
       (c) risiko-2 "Penelaahan kinerja peran kunci …"  → 3.2, 7.5, 7.6
       (d) hanya 1.2, 1.3 (risiko-1) dan 3.2 (risiko-2)
     Kini dijaga `illustrative_toolkit_consistency.test.ts`: untuk tiap tujuan
     yang punya risiko ilustratif termuat, union dokumen per-risiko WAJIB sama
     dengan baris di bawah. Gerbang itu tumbuh saat 8a-2b/8a-2c menambah tujuan. */
  ['QO-28b', ['1.1', '3.2', '9.2']],
  ['QO-28c', ['3.2', '7.5', '7.6', '9.2']],
  ['QO-28d', ['1.2', '1.3', '3.2']],
  ['QO-28e', ['3.1', '3.2']],
  ['QO-29a', ['4.1', '4.2', '4.3', '7.7', '9.5']],
  ['QO-29b', ['5.2', '5.4', '6.3', '6.4', '7.9']],
  ['QO-30a', ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6']],
  ['QO-30b', ['3.1', '5.1', '5.2', '5.5', '5.6', '7.5', '8.2']],
  ['QO-31a', ['6.1', '6.2', '6.3', '6.4']],
  ['QO-31b', ['4.1', '5.2', '5.3', '6.1', '6.2', '6.3', '6.4', '6.6']],
  ['QO-31c', ['6.1', '6.2', '6.5', '7.5', '9.3']],
  ['QO-31d', ['6.1', '6.2', '6.3', '6.4', '6.5', '6.6']],
  ['QO-31e', ['6.1', '6.2', '6.5']],
  ['QO-31f', ['1.1', '6.1']],
  /* PR-8a-2c — KOREKSI DELAPAN BARIS (¶32 a·e·f·g dan ¶33 a·b·c·d). Sebab yang
     sama dengan koreksi ¶28 di 8a-2a: Matriks menyelaraskan baris respons dengan
     baris RISIKO, bukan blok tujuan. Di ¶32 kesalahannya diperparah oleh empat
     sub-judul (Sumber Daya Manusia/Teknologi/Intelektual/Penyedia Jasa) yang
     berbagi halaman dengan butir tujuan; di ¶33 butir (d) membentang dua halaman.
     Dua arah kesalahan, keduanya nyata:
       HILANG  — 32(a) kehilangan 7.3 & 7.4; itulah sebabnya dokumen 7.3 tampil
                 "TUJUAN —" di tab Dokumentasi SMM, seolah tak melayani tujuan
                 mutu mana pun. 33(b) kehilangan 7.7 & 8.2; 33(d) kehilangan
                 6.3, 6.4, 7.7 & 9.3.
       MEREMBES — 32(e) kebagian 7.1 & 7.8 milik 32(f); 32(f) kebagian 7.5 milik
                 32(g); 32(g) malah kebagian 7.8 & 7.9 milik 32(h); 33(a)
                 kebagian 8.2 milik 33(b); 33(c) kebagian 6.3, 6.4 & 9.3 milik
                 33(d).
     Kini ke-27 tujuan tersilang-uji penuh oleh
     `illustrative_toolkit_consistency.test.ts`. */
  ['QO-32a', ['7.1', '7.2', '7.3', '7.4', '7.5', '7.7']],
  ['QO-32b', ['7.1', '7.2', '7.5', '9.3']],
  ['QO-32c', ['6.3', '7.1', '7.4', '7.9']],
  ['QO-32d', ['3.1', '6.1', '6.2', '7.2', '7.5', '7.7']],
  ['QO-32e', ['6.1', '6.2', '7.2']],
  ['QO-32f', ['7.1', '7.8']],
  ['QO-32g', ['7.1', '7.5']],
  ['QO-32h', ['7.1', '7.7', '7.8', '7.9', '8.1']],
  ['QO-33a', ['7.1', '7.7', '7.8', '8.1']],
  ['QO-33b', ['7.7', '8.1', '8.2']],
  ['QO-33c', ['7.7', '8.1', '8.2']],
  ['QO-33d', ['6.3', '6.4', '7.7', '8.1', '9.3']],
]);

/* ------------------------------------------------------------
   Turunan
   ------------------------------------------------------------ */

export interface ToolkitHomeSummary {
  readonly mapped: readonly ToolkitDoc[];
  readonly partial: readonly ToolkitDoc[];
  readonly none: readonly ToolkitDoc[];
}

/** Dokumen Toolkit menurut kelengkapan rumahnya di Asseris. */
export function toolkitHomes(): ToolkitHomeSummary {
  return {
    mapped: TOOLKIT_DOCS.filter((d) => d.home === 'mapped'),
    partial: TOOLKIT_DOCS.filter((d) => d.home === 'partial'),
    none: TOOLKIT_DOCS.filter((d) => d.home === 'none'),
  };
}

/** Dokumen Toolkit yang menjadi ilustrasi respons bagi satu tujuan. */
export function toolkitDocsFor(objectiveId: string): readonly ToolkitDoc[] {
  return (TOOLKIT_BY_OBJECTIVE.get(objectiveId) || [])
    .map((no) => TOOLKIT_BY_NO.get(no))
    .filter((d): d is ToolkitDoc => Boolean(d));
}

/** Nomor yang dirujuk Matriks untuk satu tujuan tetapi tak ada di Toolkit. */
export function danglingDocsFor(objectiveId: string): readonly string[] {
  return (TOOLKIT_BY_OBJECTIVE.get(objectiveId) || []).filter((no) => DANGLING.has(no));
}

export interface ToolkitObjectiveCoverage {
  /** Tujuan yang punya ≥1 dokumen Toolkit sebagai ilustrasi respons. */
  readonly withDoc: readonly string[];
  /** Tujuan tanpa dokumen Toolkit — dalam cakupan Matriks. */
  readonly withoutDoc: readonly string[];
}

/**
 * Cakupan peta atas tujuan mandatori.
 *
 * Seluruh 27 tujuan ¶28–33 berada dalam cakupan Matriks; komponen
 * PROSES (¶23–27 · ¶35–47) tidak punya tujuan ¶28–33 sama sekali,
 * jadi tidak ada yang perlu dilaporkan "di luar cakupan" di sini —
 * batas asetnya justru muncul pada ketentuan JARINGAN (¶48–52) dan
 * dokumentasi ¶59, yang tak punya dokumen Toolkit karena Toolkit
 * ditulis untuk KAP non-jaringan.
 */
export function toolkitObjectiveCoverage(
  objectives: readonly SmmObjective[] = SMM1_OBJECTIVES,
): ToolkitObjectiveCoverage {
  const withDoc: string[] = [];
  const withoutDoc: string[] = [];
  for (const o of objectives) {
    const refs = TOOLKIT_BY_OBJECTIVE.get(o.id) || [];
    /* Rujukan menggantung TIDAK dihitung sebagai dokumen: ia tak dapat
       dibuka, dibaca, atau dijadikan bukti ¶57(c). */
    const real = refs.filter((no) => TOOLKIT_BY_NO.has(no));
    (real.length > 0 ? withDoc : withoutDoc).push(o.id);
  }
  return { withDoc, withoutDoc };
}

/** Tujuan mutu yang dilayani satu dokumen Toolkit (arah balik peta). */
export function objectivesForDoc(no: string): readonly string[] {
  const out: string[] = [];
  TOOLKIT_BY_OBJECTIVE.forEach((refs, objId) => {
    if (refs.indexOf(no) >= 0) out.push(objId);
  });
  return out.sort();
}

/**
 * Ketentuan SMM 1 yang BERADA DI LUAR cakupan Toolkit & Matriks.
 *
 * Ditampilkan agar ketiadaan dokumen pada bagian-bagian ini tidak
 * terbaca sebagai kekurangan firma. Toolkit & Matriks IAPI ditulis
 * untuk KAP NON-JARINGAN.
 */
export const TOOLKIT_OUT_OF_SCOPE: readonly { readonly ref: string; readonly why: string }[] = [
  { ref: '¶48–52 · Ketentuan & jasa jaringan',
    why: 'Toolkit & Matriks ditulis untuk KAP non-jaringan; tidak ada dokumen ilustratif untuk bagian ini.' },
  { ref: '¶59 · Dokumentasi hal terkait jaringan',
    why: 'Konsekuensi yang sama — bersandar langsung pada teks SMM 1.' },
  { ref: '¶23–27 · Proses Penilaian Risiko KAP',
    why: 'Matriks memetakan risiko untuk ENAM komponen ¶28–33; proses penilaian risiko tidak punya baris tujuan di Matriks (dokumen 2.1 & 2.2 tetap tersedia di Toolkit).' },
  { ref: '¶35–47 · Pemantauan & Remediasi',
    why: 'Sama — bukan pemilik tujuan ¶28–33 (dokumen 9.1–9.7 tetap tersedia di Toolkit).' },
];
