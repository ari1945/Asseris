// Gerbang firma segar (docs/prd-gerbang-firma-segar.md Fase 2) — SATU sumber identitas stack
// segar, dibaca oleh scripts/start-api.mjs (yang menjalankan `bootstrap`) DAN oleh
// tests/09-fresh-firm.spec.ts (yang login sebagai admin-nya). Dua salinan akan menyimpang diam-diam.
//
// Nilai di sini adalah NILAI UJI untuk DB e2e sekali-pakai (`*_fresh`, direset tiap jalan), bukan
// kredensial siapa pun. Sengaja TIDAK memuat satu pun nama/kode dari firma demo WHR: seluruh
// gerbang bertumpu pada perbedaan itu.

/** Masukan `npm run bootstrap` (server/src/bootstrap.ts). FIRM_ID/ADMIN_ID TIDAK diisi — id
 *  diturunkan oleh bootstrapFirm seperti saat pelanggan pertama memasang aplikasinya. */
export const FRESH_FIRM = {
  name: 'KAP Firma Segar & Rekan',
  short: 'SEGAR',
  /** Turunan bootstrapFirm.ts: `FIRM-${slug(short)}` / `USER-${slug(short)}-ADMIN`. */
  id: 'FIRM-SEGAR',
  admin: {
    id: 'USER-SEGAR-ADMIN',
    name: 'Laksmi Purnamasari',
    email: 'laksmi.p@firma-segar.test',
    password: 'Segar#E2E-2026!',
  },
};

/** Penanda identitas firma DEMO yang tak boleh muncul di firma segar mana pun.
 *  Sumber: migration/src/data_part1.ts:10-11 (FIRM), :47-54 (CLIENTS), dan nama partner yang
 *  dipaku formulir klien/perikatan (view_firm.tsx:224, :235, :523-524). */
export const DEMO_MARKERS = {
  firmName: 'KAP Wijaya Hartono & Rekan',
  firmShort: 'WHR',
  firmId: 'FIRM-WHR',
  engagementId: 'ENG-2025-014',
  clientIds: ['C-014', 'C-022', 'C-031', 'C-040', 'C-047', 'C-052', 'C-058', 'C-063'],
  clientNames: [
    'PT Sentosa Makmur Tbk',
    'PT Cahaya Logistik Nusantara',
    'PT Bumi Hijau Agrindo',
    'PT Mandiri Sejahtera Finance',
    'PT Teknologi Andalan Digital',
    'PT Karya Beton Perkasa',
    'PT Samudra Pangan Lestari',
    'PT Graha Properti Investama',
  ],
  personNames: ['Hartono Wijaya', 'Rudi Gunawan', 'Sari Dewanti', 'Anindya Pramesti', 'Bayu Saputra', 'Citra Halim'],
};
