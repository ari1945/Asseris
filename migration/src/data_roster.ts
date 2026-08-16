/* ============================================================
   Asseris — Roster firma yang diperbesar (PRD sdm-kepatuhan PR-4)
   ------------------------------------------------------------
   Sebelum berkas ini, firma punya TIGA jumlah karyawan:

     AMS.FIRM                  partners 6 + managers 11 + staff 58 = 75
     HCM_ANALYTICS.gradeMix    6 + 11 + 22 + 30                    = 69
     AMS.STAFF (roster nyata)  10 orang (+2 FIRM_STAFF)

   Dua sumber literal itu bahkan tak sepakat satu sama lain, dan seluruh
   KPI Human Capital (attrition, masa kerja, time-to-fill) adalah konstanta
   yang tak pernah dihitung dari satu peristiwa pun.

   Keputusan Ari 2026-08-16 (Q-1 opsi b): perbesar roster agar jumlahnya
   NYATA, lalu turunkan seluruh statistik darinya dan cabut literalnya.

   59 baris di bawah dibangkitkan deterministik sehingga roster gabungan
   (10 lama + 59 baru) MEREPRODUKSI PERSIS setiap distribusi yang dulu
   ditulis tangan di `HCM_ANALYTICS`:

     gradeMix   Partner 6 · Manager 11 · Senior 22 · Junior 30   = 69
     tenureMix  <2 th 28 · 2–5 th 24 · 5–10 th 12 · >10 th 5     = 69
     ageMix     20–25 22 · 26–30 20 · 31–40 18 · >40 9           = 69
     genderMix  L 38 · P 31                                      = 69
     certMix    CPA 17 · CA 24 · Kandidat CPA 9 · S.Ak 19        = 69
     avgTenure  3,8 tahun

   Literalnya menjadi SPESIFIKASI roster ini, lalu dihapus. Yang tersisa
   hanyalah orang — dan `canon_hcm` menghitung sisanya. Diuji satu per satu
   di `hcm_roster.test.ts`.

   `born` ditambahkan agar komposisi usia dapat diturunkan; ia tak pernah
   ada di roster sebelumnya sehingga `ageMix` mustahil dihitung.
   ============================================================ */

export interface RosterMember {
  id: string;
  name: string;
  role: string;
  grade: string;
  cert: string;
  joined: number;
  born: number;
  gender: string;
  util: number;
  status: string;
  email: string;
  engagements: number;
  rating: number;
  unit: string;
}

/* 59 personel tambahan. ID memakai blok terpisah per jenjang (1xx Partner,
   2xx Manager, 3xx Senior, 4xx Junior) agar tak bertabrakan dengan
   EMP-001..032 (audit) maupun EMP-501/601 (firm-ops). */
export const STAFF_EXT: RosterMember[] = [
  { id: 'EMP-101', name: 'Ayu Prasetya', role: 'Engagement Partner', grade: 'Partner', cert: 'CPA, CA', joined: 2015, born: 1981, gender: 'P', util: 68, status: 'Aktif', email: 'ayu.p@whr-cpa.id', engagements: 1, rating: 3.6, unit: 'U-LEAD' },
  { id: 'EMP-102', name: 'Agus Nugraha', role: 'Engagement Partner', grade: 'Partner', cert: 'CPA, CA', joined: 2014, born: 1982, gender: 'L', util: 81, status: 'Aktif', email: 'agus.n@whr-cpa.id', engagements: 2, rating: 4.3, unit: 'U-KOM' },
  { id: 'EMP-103', name: 'Bella Wibowo', role: 'Engagement Partner', grade: 'Partner', cert: 'CPA, CA', joined: 2016, born: 1983, gender: 'P', util: 94, status: 'Aktif', email: 'bella.w@whr-cpa.id', engagements: 3, rating: 3.8, unit: 'U-JK' },
  { id: 'EMP-201', name: 'Bagas Santoso', role: 'Audit Manager', grade: 'Manager', cert: 'CPA, CA', joined: 2021, born: 1981, gender: 'L', util: 79, status: 'Aktif', email: 'bagas.s@whr-cpa.id', engagements: 1, rating: 4.5, unit: 'U-LEAD' },
  { id: 'EMP-202', name: 'Bimo Hidayat', role: 'Audit Manager', grade: 'Manager', cert: 'CPA, CA', joined: 2021, born: 1982, gender: 'L', util: 92, status: 'Aktif', email: 'bimo.h@whr-cpa.id', engagements: 2, rating: 4, unit: 'U-KOM' },
  { id: 'EMP-203', name: 'Cindy Kurniawan', role: 'Audit Manager', grade: 'Manager', cert: 'CPA, CA', joined: 2020, born: 1983, gender: 'P', util: 77, status: 'Aktif', email: 'cindy.k@whr-cpa.id', engagements: 3, rating: 4.7, unit: 'U-JK' },
  { id: 'EMP-204', name: 'Candra Setiawan', role: 'Audit Manager', grade: 'Manager', cert: 'CPA, CA', joined: 2020, born: 1991, gender: 'L', util: 90, status: 'Aktif', email: 'candra.s@whr-cpa.id', engagements: 1, rating: 4.2, unit: 'U-LEAD' },
  { id: 'EMP-205', name: 'Dewi Maulana', role: 'Audit Manager', grade: 'Manager', cert: 'CPA, CA', joined: 2019, born: 1992, gender: 'P', util: 75, status: 'Aktif', email: 'dewi.m@whr-cpa.id', engagements: 2, rating: 3.7, unit: 'U-KOM' },
  { id: 'EMP-206', name: 'Dedi Ramadhan', role: 'Audit Manager', grade: 'Manager', cert: 'CPA, CA', joined: 2019, born: 1993, gender: 'L', util: 88, status: 'Aktif', email: 'dedi.r@whr-cpa.id', engagements: 3, rating: 4.4, unit: 'U-JK' },
  { id: 'EMP-207', name: 'Elsa Firdaus', role: 'Audit Manager', grade: 'Manager', cert: 'CPA, CA', joined: 2018, born: 1991, gender: 'P', util: 73, status: 'Aktif', email: 'elsa.f@whr-cpa.id', engagements: 1, rating: 3.9, unit: 'U-LEAD' },
  { id: 'EMP-208', name: 'Eko Hakim', role: 'Audit Manager', grade: 'Manager', cert: 'CPA, CA', joined: 2017, born: 1992, gender: 'L', util: 86, status: 'Aktif', email: 'eko.h@whr-cpa.id', engagements: 2, rating: 4.6, unit: 'U-KOM' },
  { id: 'EMP-301', name: 'Fitri Yulianto', role: 'Senior Auditor', grade: 'Senior', cert: 'CA', joined: 2024, born: 1993, gender: 'P', util: 71, status: 'Aktif', email: 'fitri.y@whr-cpa.id', engagements: 3, rating: 4.1, unit: 'U-JK' },
  { id: 'EMP-302', name: 'Faisal Permana', role: 'Senior Auditor', grade: 'Senior', cert: 'CA', joined: 2024, born: 1991, gender: 'L', util: 84, status: 'Aktif', email: 'faisal.p@whr-cpa.id', engagements: 1, rating: 3.6, unit: 'U-LEAD' },
  { id: 'EMP-303', name: 'Galih Suryana', role: 'Senior Auditor', grade: 'Senior', cert: 'CA', joined: 2024, born: 1992, gender: 'L', util: 69, status: 'Aktif', email: 'galih.s@whr-cpa.id', engagements: 2, rating: 4.3, unit: 'U-KOM' },
  { id: 'EMP-304', name: 'Gita Anggara', role: 'Senior Auditor', grade: 'Senior', cert: 'CA', joined: 2024, born: 1993, gender: 'P', util: 82, status: 'Aktif', email: 'gita.a@whr-cpa.id', engagements: 3, rating: 3.8, unit: 'U-JK' },
  { id: 'EMP-305', name: 'Hendra Baskoro', role: 'Senior Auditor', grade: 'Senior', cert: 'CA', joined: 2024, born: 1991, gender: 'L', util: 95, status: 'Aktif', email: 'hendra.b@whr-cpa.id', engagements: 1, rating: 4.5, unit: 'U-LEAD' },
  { id: 'EMP-306', name: 'Hana Cahyono', role: 'Senior Auditor', grade: 'Senior', cert: 'CA', joined: 2024, born: 1992, gender: 'P', util: 80, status: 'Aktif', email: 'hana.c@whr-cpa.id', engagements: 2, rating: 4, unit: 'U-KOM' },
  { id: 'EMP-307', name: 'Irfan Darmawan', role: 'Senior Auditor', grade: 'Senior', cert: 'CA', joined: 2024, born: 1993, gender: 'L', util: 93, status: 'Aktif', email: 'irfan.d@whr-cpa.id', engagements: 3, rating: 4.7, unit: 'U-JK' },
  { id: 'EMP-308', name: 'Indri Elyas', role: 'Senior Auditor', grade: 'Senior', cert: 'CA', joined: 2024, born: 1991, gender: 'P', util: 78, status: 'Aktif', email: 'indri.e@whr-cpa.id', engagements: 1, rating: 4.2, unit: 'U-LEAD' },
  { id: 'EMP-309', name: 'Joko Fauzi', role: 'Senior Auditor', grade: 'Senior', cert: 'CA', joined: 2023, born: 1992, gender: 'L', util: 91, status: 'Aktif', email: 'joko.f@whr-cpa.id', engagements: 2, rating: 3.7, unit: 'U-KOM' },
  { id: 'EMP-310', name: 'Jihan Gunadi', role: 'Senior Auditor', grade: 'Senior', cert: 'CA', joined: 2023, born: 2000, gender: 'P', util: 76, status: 'Aktif', email: 'jihan.g@whr-cpa.id', engagements: 3, rating: 4.4, unit: 'U-JK' },
  { id: 'EMP-311', name: 'Krisna Handoko', role: 'Senior Auditor', grade: 'Senior', cert: 'CA', joined: 2023, born: 1998, gender: 'L', util: 89, status: 'Aktif', email: 'krisna.h@whr-cpa.id', engagements: 1, rating: 3.9, unit: 'U-LEAD' },
  { id: 'EMP-312', name: 'Lukman Iskandar', role: 'Senior Auditor', grade: 'Senior', cert: 'CA', joined: 2023, born: 1999, gender: 'L', util: 74, status: 'Aktif', email: 'lukman.i@whr-cpa.id', engagements: 2, rating: 4.6, unit: 'U-KOM' },
  { id: 'EMP-313', name: 'Kirana Jatmiko', role: 'Senior Auditor', grade: 'Senior', cert: 'CA', joined: 2023, born: 2000, gender: 'P', util: 87, status: 'Aktif', email: 'kirana.j@whr-cpa.id', engagements: 3, rating: 4.1, unit: 'U-JK' },
  { id: 'EMP-314', name: 'Marwan Kusumo', role: 'Senior Auditor', grade: 'Senior', cert: 'CA (kandidat CPA)', joined: 2023, born: 1998, gender: 'L', util: 72, status: 'Aktif', email: 'marwan.k@whr-cpa.id', engagements: 1, rating: 3.6, unit: 'U-LEAD' },
  { id: 'EMP-315', name: 'Laras Lesmana', role: 'Senior Auditor', grade: 'Senior', cert: 'CA (kandidat CPA)', joined: 2022, born: 1999, gender: 'P', util: 85, status: 'Aktif', email: 'laras.l@whr-cpa.id', engagements: 2, rating: 4.3, unit: 'U-KOM' },
  { id: 'EMP-316', name: 'Naufal Mahendra', role: 'Senior Auditor', grade: 'Senior', cert: 'CA (kandidat CPA)', joined: 2022, born: 2000, gender: 'L', util: 70, status: 'Aktif', email: 'naufal.m@whr-cpa.id', engagements: 3, rating: 3.8, unit: 'U-JK' },
  { id: 'EMP-317', name: 'Mira Nurcahyo', role: 'Senior Auditor', grade: 'Senior', cert: 'CA (kandidat CPA)', joined: 2022, born: 1998, gender: 'P', util: 83, status: 'Aktif', email: 'mira.n@whr-cpa.id', engagements: 1, rating: 4.5, unit: 'U-LEAD' },
  { id: 'EMP-318', name: 'Oki Oktaviano', role: 'Senior Auditor', grade: 'Senior', cert: 'CA (kandidat CPA)', joined: 2022, born: 1999, gender: 'L', util: 68, status: 'Aktif', email: 'oki.o@whr-cpa.id', engagements: 2, rating: 4, unit: 'U-KOM' },
  { id: 'EMP-319', name: 'Pandu Pratomo', role: 'Senior Auditor', grade: 'Senior', cert: 'CA (kandidat CPA)', joined: 2021, born: 2000, gender: 'L', util: 81, status: 'Aktif', email: 'pandu.p@whr-cpa.id', engagements: 3, rating: 4.7, unit: 'U-JK' },
  { id: 'EMP-320', name: 'Nabila Rahardjo', role: 'Senior Auditor', grade: 'Senior', cert: 'CA (kandidat CPA)', joined: 2021, born: 1998, gender: 'P', util: 94, status: 'Aktif', email: 'nabila.r@whr-cpa.id', engagements: 1, rating: 4.2, unit: 'U-LEAD' },
  { id: 'EMP-401', name: 'Rangga Siregar', role: 'Junior Auditor', grade: 'Junior', cert: 'CA', joined: 2025, born: 1999, gender: 'L', util: 79, status: 'Aktif', email: 'rangga.s@whr-cpa.id', engagements: 2, rating: 3.7, unit: 'U-KOM' },
  { id: 'EMP-402', name: 'Okta Tanuwijaya', role: 'Junior Auditor', grade: 'Junior', cert: 'CA', joined: 2025, born: 2000, gender: 'P', util: 92, status: 'Aktif', email: 'okta.t@whr-cpa.id', engagements: 3, rating: 4.4, unit: 'U-JK' },
  { id: 'EMP-403', name: 'Satrio Utomo', role: 'Junior Auditor', grade: 'Junior', cert: 'CA', joined: 2025, born: 1998, gender: 'L', util: 77, status: 'Aktif', email: 'satrio.u@whr-cpa.id', engagements: 1, rating: 3.9, unit: 'U-LEAD' },
  { id: 'EMP-404', name: 'Prita Wijayanti', role: 'Junior Auditor', grade: 'Junior', cert: 'CA', joined: 2025, born: 1999, gender: 'P', util: 90, status: 'Aktif', email: 'prita.w@whr-cpa.id', engagements: 2, rating: 4.6, unit: 'U-KOM' },
  { id: 'EMP-405', name: 'Tegar Yuwono', role: 'Junior Auditor', grade: 'Junior', cert: 'CA', joined: 2025, born: 2000, gender: 'L', util: 75, status: 'Aktif', email: 'tegar.y@whr-cpa.id', engagements: 3, rating: 4.1, unit: 'U-JK' },
  { id: 'EMP-406', name: 'Ratih Adiputra', role: 'Junior Auditor', grade: 'Junior', cert: 'CA', joined: 2025, born: 1998, gender: 'P', util: 88, status: 'Aktif', email: 'ratih.a@whr-cpa.id', engagements: 1, rating: 3.6, unit: 'U-LEAD' },
  { id: 'EMP-407', name: 'Umar Bramantyo', role: 'Junior Auditor', grade: 'Junior', cert: 'CA', joined: 2025, born: 1999, gender: 'L', util: 73, status: 'Aktif', email: 'umar.b@whr-cpa.id', engagements: 2, rating: 4.3, unit: 'U-KOM' },
  { id: 'EMP-408', name: 'Vino Cendekia', role: 'Junior Auditor', grade: 'Junior', cert: 'CA', joined: 2025, born: 2004, gender: 'L', util: 86, status: 'Aktif', email: 'vino.c@whr-cpa.id', engagements: 3, rating: 3.8, unit: 'U-JK' },
  { id: 'EMP-409', name: 'Salma Dirgantara', role: 'Junior Auditor', grade: 'Junior', cert: 'CA', joined: 2025, born: 2002, gender: 'P', util: 71, status: 'Aktif', email: 'salma.d@whr-cpa.id', engagements: 1, rating: 4.5, unit: 'U-LEAD' },
  { id: 'EMP-410', name: 'Wahyu Ekaputra', role: 'Junior Auditor', grade: 'Junior', cert: 'CA', joined: 2025, born: 2003, gender: 'L', util: 84, status: 'Aktif', email: 'wahyu.e@whr-cpa.id', engagements: 2, rating: 4, unit: 'U-KOM' },
  { id: 'EMP-411', name: 'Tiara Farhani', role: 'Junior Auditor', grade: 'Junior', cert: 'CA', joined: 2025, born: 2004, gender: 'P', util: 69, status: 'Aktif', email: 'tiara.f@whr-cpa.id', engagements: 3, rating: 4.7, unit: 'U-JK' },
  { id: 'EMP-412', name: 'Yudha Ghaniyyu', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2002, gender: 'L', util: 82, status: 'Aktif', email: 'yudha.g@whr-cpa.id', engagements: 1, rating: 4.2, unit: 'U-LEAD' },
  { id: 'EMP-413', name: 'Ulfa Harsono', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2003, gender: 'P', util: 95, status: 'Aktif', email: 'ulfa.h@whr-cpa.id', engagements: 2, rating: 3.7, unit: 'U-KOM' },
  { id: 'EMP-414', name: 'Zaki Indrawan', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2004, gender: 'L', util: 80, status: 'Aktif', email: 'zaki.i@whr-cpa.id', engagements: 3, rating: 4.4, unit: 'U-JK' },
  { id: 'EMP-415', name: 'Vera Juwono', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2002, gender: 'P', util: 93, status: 'Aktif', email: 'vera.j@whr-cpa.id', engagements: 1, rating: 3.9, unit: 'U-LEAD' },
  { id: 'EMP-416', name: 'Arif Kartika', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2003, gender: 'L', util: 78, status: 'Aktif', email: 'arif.k@whr-cpa.id', engagements: 2, rating: 4.6, unit: 'U-KOM' },
  { id: 'EMP-417', name: 'Bayu Linggar', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2004, gender: 'L', util: 91, status: 'Aktif', email: 'bayu.l@whr-cpa.id', engagements: 3, rating: 4.1, unit: 'U-JK' },
  { id: 'EMP-418', name: 'Wulan Mustofa', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2002, gender: 'P', util: 76, status: 'Aktif', email: 'wulan.m@whr-cpa.id', engagements: 1, rating: 3.6, unit: 'U-LEAD' },
  { id: 'EMP-419', name: 'Dimas Nirwana', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2003, gender: 'L', util: 89, status: 'Aktif', email: 'dimas.n@whr-cpa.id', engagements: 2, rating: 4.3, unit: 'U-KOM' },
  { id: 'EMP-420', name: 'Yasmin Oktarina', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2004, gender: 'P', util: 74, status: 'Aktif', email: 'yasmin.o@whr-cpa.id', engagements: 3, rating: 3.8, unit: 'U-JK' },
  { id: 'EMP-421', name: 'Eka Pambudi', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2002, gender: 'L', util: 87, status: 'Aktif', email: 'eka.p@whr-cpa.id', engagements: 1, rating: 4.5, unit: 'U-LEAD' },
  { id: 'EMP-422', name: 'Zahra Rachmadi', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2003, gender: 'P', util: 72, status: 'Aktif', email: 'zahra.r@whr-cpa.id', engagements: 2, rating: 4, unit: 'U-KOM' },
  { id: 'EMP-423', name: 'Fajri Sudarsono', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2004, gender: 'L', util: 85, status: 'Aktif', email: 'fajri.s@whr-cpa.id', engagements: 3, rating: 4.7, unit: 'U-JK' },
  { id: 'EMP-424', name: 'Anisa Trihatmojo', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2002, gender: 'P', util: 70, status: 'Aktif', email: 'anisa.t@whr-cpa.id', engagements: 1, rating: 4.2, unit: 'U-LEAD' },
  { id: 'EMP-425', name: 'Gilang Wicaksana', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2003, gender: 'L', util: 83, status: 'Aktif', email: 'gilang.w@whr-cpa.id', engagements: 2, rating: 3.7, unit: 'U-KOM' },
  { id: 'EMP-426', name: 'Haris Yudistira', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2025, born: 2004, gender: 'L', util: 68, status: 'Aktif', email: 'haris.y@whr-cpa.id', engagements: 3, rating: 4.4, unit: 'U-JK' },
  { id: 'EMP-427', name: 'Bunga Zulkarnain', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2026, born: 2002, gender: 'P', util: 81, status: 'Aktif', email: 'bunga.z@whr-cpa.id', engagements: 1, rating: 3.9, unit: 'U-LEAD' },
  { id: 'EMP-428', name: 'Ilham Amirullah', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2026, born: 2003, gender: 'L', util: 94, status: 'Aktif', email: 'ilham.a@whr-cpa.id', engagements: 2, rating: 4.6, unit: 'U-KOM' },
];

/* Garis pelaporan untuk personel tambahan — Partner → Managing Partner,
   Manager → Partner, Senior → Manager, Junior → Senior. Tanpa ini gerbang
   reviu manajer (canon_perf) tak punya penilai yang sah bagi mereka. */
export const ORG_EXT: Record<string, { reports: string; dept: string }> = {
    'EMP-101': { reports: 'EMP-001', dept: 'Audit & Asurans' },
    'EMP-102': { reports: 'EMP-001', dept: 'Audit & Asurans' },
    'EMP-103': { reports: 'EMP-001', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-201': { reports: 'EMP-101', dept: 'Audit & Asurans' },
    'EMP-202': { reports: 'EMP-102', dept: 'Audit & Asurans' },
    'EMP-203': { reports: 'EMP-103', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-204': { reports: 'EMP-001', dept: 'Audit & Asurans' },
    'EMP-205': { reports: 'EMP-002', dept: 'Audit & Asurans' },
    'EMP-206': { reports: 'EMP-003', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-207': { reports: 'EMP-101', dept: 'Audit & Asurans' },
    'EMP-208': { reports: 'EMP-102', dept: 'Audit & Asurans' },
    'EMP-301': { reports: 'EMP-007', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-302': { reports: 'EMP-008', dept: 'Audit & Asurans' },
    'EMP-303': { reports: 'EMP-012', dept: 'Audit & Asurans' },
    'EMP-304': { reports: 'EMP-201', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-305': { reports: 'EMP-202', dept: 'Audit & Asurans' },
    'EMP-306': { reports: 'EMP-203', dept: 'Audit & Asurans' },
    'EMP-307': { reports: 'EMP-204', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-308': { reports: 'EMP-205', dept: 'Audit & Asurans' },
    'EMP-309': { reports: 'EMP-206', dept: 'Audit & Asurans' },
    'EMP-310': { reports: 'EMP-207', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-311': { reports: 'EMP-208', dept: 'Audit & Asurans' },
    'EMP-312': { reports: 'EMP-007', dept: 'Audit & Asurans' },
    'EMP-313': { reports: 'EMP-008', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-314': { reports: 'EMP-012', dept: 'Audit & Asurans' },
    'EMP-315': { reports: 'EMP-201', dept: 'Audit & Asurans' },
    'EMP-316': { reports: 'EMP-202', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-317': { reports: 'EMP-203', dept: 'Audit & Asurans' },
    'EMP-318': { reports: 'EMP-204', dept: 'Audit & Asurans' },
    'EMP-319': { reports: 'EMP-205', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-320': { reports: 'EMP-206', dept: 'Audit & Asurans' },
    'EMP-401': { reports: 'EMP-308', dept: 'Audit & Asurans' },
    'EMP-402': { reports: 'EMP-309', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-403': { reports: 'EMP-310', dept: 'Audit & Asurans' },
    'EMP-404': { reports: 'EMP-311', dept: 'Audit & Asurans' },
    'EMP-405': { reports: 'EMP-312', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-406': { reports: 'EMP-313', dept: 'Audit & Asurans' },
    'EMP-407': { reports: 'EMP-314', dept: 'Audit & Asurans' },
    'EMP-408': { reports: 'EMP-315', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-409': { reports: 'EMP-316', dept: 'Audit & Asurans' },
    'EMP-410': { reports: 'EMP-317', dept: 'Audit & Asurans' },
    'EMP-411': { reports: 'EMP-318', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-412': { reports: 'EMP-319', dept: 'Audit & Asurans' },
    'EMP-413': { reports: 'EMP-320', dept: 'Audit & Asurans' },
    'EMP-414': { reports: 'EMP-021', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-415': { reports: 'EMP-022', dept: 'Audit & Asurans' },
    'EMP-416': { reports: 'EMP-301', dept: 'Audit & Asurans' },
    'EMP-417': { reports: 'EMP-302', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-418': { reports: 'EMP-303', dept: 'Audit & Asurans' },
    'EMP-419': { reports: 'EMP-304', dept: 'Audit & Asurans' },
    'EMP-420': { reports: 'EMP-305', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-421': { reports: 'EMP-306', dept: 'Audit & Asurans' },
    'EMP-422': { reports: 'EMP-307', dept: 'Audit & Asurans' },
    'EMP-423': { reports: 'EMP-308', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-424': { reports: 'EMP-309', dept: 'Audit & Asurans' },
    'EMP-425': { reports: 'EMP-310', dept: 'Audit & Asurans' },
    'EMP-426': { reports: 'EMP-311', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-427': { reports: 'EMP-312', dept: 'Audit & Asurans' },
    'EMP-428': { reports: 'EMP-313', dept: 'Audit & Asurans' },
};

/* Penggajian personel tambahan (PMK 168/2023 — kategori TER dari PTKP). */
export const PAYROLL_EXT: Record<string, { gross: number; allowance: number; ptkp: string; terCat: string }> = {
    'EMP-101': { gross: 71_800_000, allowance: 6_500_000, ptkp: 'TK/0', terCat: 'A' },
    'EMP-102': { gross: 73_300_000, allowance: 6_500_000, ptkp: 'K/0', terCat: 'A' },
    'EMP-103': { gross: 74_900_000, allowance: 6_500_000, ptkp: 'K/1', terCat: 'B' },
    'EMP-201': { gross: 33_300_000, allowance: 3_200_000, ptkp: 'K/2', terCat: 'B' },
    'EMP-202': { gross: 34_000_000, allowance: 3_200_000, ptkp: 'K/3', terCat: 'C' },
    'EMP-203': { gross: 34_700_000, allowance: 3_200_000, ptkp: 'TK/0', terCat: 'A' },
    'EMP-204': { gross: 35_400_000, allowance: 3_200_000, ptkp: 'K/0', terCat: 'A' },
    'EMP-205': { gross: 36_000_000, allowance: 3_200_000, ptkp: 'K/1', terCat: 'B' },
    'EMP-206': { gross: 36_700_000, allowance: 3_200_000, ptkp: 'K/2', terCat: 'B' },
    'EMP-207': { gross: 31_300_000, allowance: 3_200_000, ptkp: 'K/3', terCat: 'C' },
    'EMP-208': { gross: 32_000_000, allowance: 3_200_000, ptkp: 'TK/0', terCat: 'A' },
    'EMP-301': { gross: 18_200_000, allowance: 1_900_000, ptkp: 'K/0', terCat: 'A' },
    'EMP-302': { gross: 18_600_000, allowance: 1_900_000, ptkp: 'K/1', terCat: 'B' },
    'EMP-303': { gross: 19_000_000, allowance: 1_900_000, ptkp: 'K/2', terCat: 'B' },
    'EMP-304': { gross: 19_400_000, allowance: 1_900_000, ptkp: 'K/3', terCat: 'C' },
    'EMP-305': { gross: 19_800_000, allowance: 1_900_000, ptkp: 'TK/0', terCat: 'A' },
    'EMP-306': { gross: 20_100_000, allowance: 1_900_000, ptkp: 'K/0', terCat: 'A' },
    'EMP-307': { gross: 20_500_000, allowance: 1_900_000, ptkp: 'K/1', terCat: 'B' },
    'EMP-308': { gross: 17_500_000, allowance: 1_900_000, ptkp: 'K/2', terCat: 'B' },
    'EMP-309': { gross: 17_900_000, allowance: 1_900_000, ptkp: 'K/3', terCat: 'C' },
    'EMP-310': { gross: 18_200_000, allowance: 1_900_000, ptkp: 'TK/0', terCat: 'A' },
    'EMP-311': { gross: 18_600_000, allowance: 1_900_000, ptkp: 'K/0', terCat: 'A' },
    'EMP-312': { gross: 19_000_000, allowance: 1_900_000, ptkp: 'K/1', terCat: 'B' },
    'EMP-313': { gross: 19_400_000, allowance: 1_900_000, ptkp: 'K/2', terCat: 'B' },
    'EMP-314': { gross: 19_800_000, allowance: 1_900_000, ptkp: 'K/3', terCat: 'C' },
    'EMP-315': { gross: 20_100_000, allowance: 1_900_000, ptkp: 'TK/0', terCat: 'A' },
    'EMP-316': { gross: 20_500_000, allowance: 1_900_000, ptkp: 'K/0', terCat: 'A' },
    'EMP-317': { gross: 17_500_000, allowance: 1_900_000, ptkp: 'K/1', terCat: 'B' },
    'EMP-318': { gross: 17_900_000, allowance: 1_900_000, ptkp: 'K/2', terCat: 'B' },
    'EMP-319': { gross: 18_200_000, allowance: 1_900_000, ptkp: 'K/3', terCat: 'C' },
    'EMP-320': { gross: 18_600_000, allowance: 1_900_000, ptkp: 'TK/0', terCat: 'A' },
    'EMP-401': { gross: 9_800_000, allowance: 1_100_000, ptkp: 'K/0', terCat: 'A' },
    'EMP-402': { gross: 10_000_000, allowance: 1_100_000, ptkp: 'K/1', terCat: 'B' },
    'EMP-403': { gross: 10_200_000, allowance: 1_100_000, ptkp: 'K/2', terCat: 'B' },
    'EMP-404': { gross: 10_400_000, allowance: 1_100_000, ptkp: 'K/3', terCat: 'C' },
    'EMP-405': { gross: 10_600_000, allowance: 1_100_000, ptkp: 'TK/0', terCat: 'A' },
    'EMP-406': { gross: 9_000_000, allowance: 1_100_000, ptkp: 'K/0', terCat: 'A' },
    'EMP-407': { gross: 9_200_000, allowance: 1_100_000, ptkp: 'K/1', terCat: 'B' },
    'EMP-408': { gross: 9_400_000, allowance: 1_100_000, ptkp: 'K/2', terCat: 'B' },
    'EMP-409': { gross: 9_600_000, allowance: 1_100_000, ptkp: 'K/3', terCat: 'C' },
    'EMP-410': { gross: 9_800_000, allowance: 1_100_000, ptkp: 'TK/0', terCat: 'A' },
    'EMP-411': { gross: 10_000_000, allowance: 1_100_000, ptkp: 'K/0', terCat: 'A' },
    'EMP-412': { gross: 10_200_000, allowance: 1_100_000, ptkp: 'K/1', terCat: 'B' },
    'EMP-413': { gross: 10_400_000, allowance: 1_100_000, ptkp: 'K/2', terCat: 'B' },
    'EMP-414': { gross: 10_600_000, allowance: 1_100_000, ptkp: 'K/3', terCat: 'C' },
    'EMP-415': { gross: 9_000_000, allowance: 1_100_000, ptkp: 'TK/0', terCat: 'A' },
    'EMP-416': { gross: 9_200_000, allowance: 1_100_000, ptkp: 'K/0', terCat: 'A' },
    'EMP-417': { gross: 9_400_000, allowance: 1_100_000, ptkp: 'K/1', terCat: 'B' },
    'EMP-418': { gross: 9_600_000, allowance: 1_100_000, ptkp: 'K/2', terCat: 'B' },
    'EMP-419': { gross: 9_800_000, allowance: 1_100_000, ptkp: 'K/3', terCat: 'C' },
    'EMP-420': { gross: 10_000_000, allowance: 1_100_000, ptkp: 'TK/0', terCat: 'A' },
    'EMP-421': { gross: 10_200_000, allowance: 1_100_000, ptkp: 'K/0', terCat: 'A' },
    'EMP-422': { gross: 10_400_000, allowance: 1_100_000, ptkp: 'K/1', terCat: 'B' },
    'EMP-423': { gross: 10_600_000, allowance: 1_100_000, ptkp: 'K/2', terCat: 'B' },
    'EMP-424': { gross: 9_000_000, allowance: 1_100_000, ptkp: 'K/3', terCat: 'C' },
    'EMP-425': { gross: 9_200_000, allowance: 1_100_000, ptkp: 'TK/0', terCat: 'A' },
    'EMP-426': { gross: 9_400_000, allowance: 1_100_000, ptkp: 'K/0', terCat: 'A' },
    'EMP-427': { gross: 9_600_000, allowance: 1_100_000, ptkp: 'K/1', terCat: 'B' },
    'EMP-428': { gross: 9_800_000, allowance: 1_100_000, ptkp: 'K/2', terCat: 'B' },
};

/* Saldo cuti bawaan tahun lalu. Yang masa kerjanya < 2 tahun tak punya bawaan. */
export const LEAVE_CARRY_EXT: Record<string, { carry: number }> = {
    'EMP-101': { carry: 2 },
    'EMP-102': { carry: 0 },
    'EMP-103': { carry: 0 },
    'EMP-201': { carry: 1 },
    'EMP-202': { carry: 2 },
    'EMP-203': { carry: 0 },
    'EMP-204': { carry: 1 },
    'EMP-205': { carry: 0 },
    'EMP-206': { carry: 2 },
    'EMP-207': { carry: 1 },
    'EMP-208': { carry: 0 },
    'EMP-301': { carry: 0 },
    'EMP-302': { carry: 2 },
    'EMP-303': { carry: 0 },
    'EMP-304': { carry: 0 },
    'EMP-305': { carry: 1 },
    'EMP-306': { carry: 2 },
    'EMP-307': { carry: 0 },
    'EMP-308': { carry: 1 },
    'EMP-309': { carry: 0 },
    'EMP-310': { carry: 2 },
    'EMP-311': { carry: 1 },
    'EMP-312': { carry: 0 },
    'EMP-313': { carry: 0 },
    'EMP-314': { carry: 2 },
    'EMP-315': { carry: 0 },
    'EMP-316': { carry: 0 },
    'EMP-317': { carry: 1 },
    'EMP-318': { carry: 2 },
    'EMP-319': { carry: 0 },
    'EMP-320': { carry: 1 },
    'EMP-401': { carry: 0 },
    'EMP-402': { carry: 0 },
    'EMP-403': { carry: 0 },
    'EMP-404': { carry: 0 },
    'EMP-405': { carry: 0 },
    'EMP-406': { carry: 0 },
    'EMP-407': { carry: 0 },
    'EMP-408': { carry: 0 },
    'EMP-409': { carry: 0 },
    'EMP-410': { carry: 0 },
    'EMP-411': { carry: 0 },
    'EMP-412': { carry: 0 },
    'EMP-413': { carry: 0 },
    'EMP-414': { carry: 0 },
    'EMP-415': { carry: 0 },
    'EMP-416': { carry: 0 },
    'EMP-417': { carry: 0 },
    'EMP-418': { carry: 0 },
    'EMP-419': { carry: 0 },
    'EMP-420': { carry: 0 },
    'EMP-421': { carry: 0 },
    'EMP-422': { carry: 0 },
    'EMP-423': { carry: 0 },
    'EMP-424': { carry: 0 },
    'EMP-425': { carry: 0 },
    'EMP-426': { carry: 0 },
    'EMP-427': { carry: 0 },
    'EMP-428': { carry: 0 },
};

/* Catatan SKP 2026 YTD. Sengaja TIDAK semua orang punya — pada Maret, sebagian
   personel memang belum mengikuti PPL apa pun, dan modul harus menampilkan itu
   apa adanya. Setiap entri terstruktur terklasifikasi materi wajib Ps. 37. */
export const CPE_EXT: Record<string, { t: string; type: string; skp: number; date: string; topic?: string }[]> = {
    'EMP-101': [{ t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }],
    'EMP-102': [{ t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15', topic: 'akuntansi' }, { t: 'Audit Data Analytics', type: 'Terstruktur', skp: 6, date: '2026-01-30', topic: 'akuntansi' }],
    'EMP-201': [{ t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }, { t: 'Webinar Pajak Coretax', type: 'Terstruktur', skp: 4, date: '2026-03-04', topic: 'lain' }, { t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 4, date: '2026-03-01' }],
    'EMP-202': [{ t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 4, date: '2026-03-01' }],
    'EMP-204': [{ t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }, { t: 'Etika Profesi & Independensi', type: 'Terstruktur', skp: 4, date: '2026-01-18', topic: 'pembinaan' }],
    'EMP-205': [{ t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15', topic: 'akuntansi' }, { t: 'Audit Data Analytics', type: 'Terstruktur', skp: 6, date: '2026-01-30', topic: 'akuntansi' }, { t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }],
    'EMP-207': [{ t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }],
    'EMP-208': [{ t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 4, date: '2026-03-01' }, { t: 'Self-study standar', type: 'Tidak Terstruktur', skp: 6, date: '2026-02-24' }],
    'EMP-302': [{ t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }, { t: 'Etika Profesi & Independensi', type: 'Terstruktur', skp: 4, date: '2026-01-18', topic: 'pembinaan' }, { t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15', topic: 'akuntansi' }],
    'EMP-303': [{ t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15', topic: 'akuntansi' }],
    'EMP-305': [{ t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }, { t: 'Webinar Pajak Coretax', type: 'Terstruktur', skp: 4, date: '2026-03-04', topic: 'lain' }],
    'EMP-306': [{ t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 4, date: '2026-03-01' }, { t: 'Self-study standar', type: 'Tidak Terstruktur', skp: 6, date: '2026-02-24' }, { t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }],
    'EMP-308': [{ t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }],
    'EMP-309': [{ t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15', topic: 'akuntansi' }, { t: 'Audit Data Analytics', type: 'Terstruktur', skp: 6, date: '2026-01-30', topic: 'akuntansi' }],
    'EMP-311': [{ t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }, { t: 'Webinar Pajak Coretax', type: 'Terstruktur', skp: 4, date: '2026-03-04', topic: 'lain' }, { t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 4, date: '2026-03-01' }],
    'EMP-312': [{ t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 4, date: '2026-03-01' }],
    'EMP-314': [{ t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }, { t: 'Etika Profesi & Independensi', type: 'Terstruktur', skp: 4, date: '2026-01-18', topic: 'pembinaan' }],
    'EMP-315': [{ t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15', topic: 'akuntansi' }, { t: 'Audit Data Analytics', type: 'Terstruktur', skp: 6, date: '2026-01-30', topic: 'akuntansi' }, { t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }],
    'EMP-317': [{ t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }],
    'EMP-318': [{ t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 4, date: '2026-03-01' }, { t: 'Self-study standar', type: 'Tidak Terstruktur', skp: 6, date: '2026-02-24' }],
    'EMP-320': [{ t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }, { t: 'Etika Profesi & Independensi', type: 'Terstruktur', skp: 4, date: '2026-01-18', topic: 'pembinaan' }, { t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15', topic: 'akuntansi' }],
    'EMP-401': [{ t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15', topic: 'akuntansi' }],
    'EMP-403': [{ t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }, { t: 'Webinar Pajak Coretax', type: 'Terstruktur', skp: 4, date: '2026-03-04', topic: 'lain' }],
    'EMP-404': [{ t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 4, date: '2026-03-01' }, { t: 'Self-study standar', type: 'Tidak Terstruktur', skp: 6, date: '2026-02-24' }, { t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }],
    'EMP-406': [{ t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }],
    'EMP-407': [{ t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15', topic: 'akuntansi' }, { t: 'Audit Data Analytics', type: 'Terstruktur', skp: 6, date: '2026-01-30', topic: 'akuntansi' }],
    'EMP-409': [{ t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }, { t: 'Webinar Pajak Coretax', type: 'Terstruktur', skp: 4, date: '2026-03-04', topic: 'lain' }, { t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 4, date: '2026-03-01' }],
    'EMP-410': [{ t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 4, date: '2026-03-01' }],
    'EMP-412': [{ t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }, { t: 'Etika Profesi & Independensi', type: 'Terstruktur', skp: 4, date: '2026-01-18', topic: 'pembinaan' }],
    'EMP-413': [{ t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15', topic: 'akuntansi' }, { t: 'Audit Data Analytics', type: 'Terstruktur', skp: 6, date: '2026-01-30', topic: 'akuntansi' }, { t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }],
    'EMP-415': [{ t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }],
    'EMP-416': [{ t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 4, date: '2026-03-01' }, { t: 'Self-study standar', type: 'Tidak Terstruktur', skp: 6, date: '2026-02-24' }],
    'EMP-418': [{ t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }, { t: 'Etika Profesi & Independensi', type: 'Terstruktur', skp: 4, date: '2026-01-18', topic: 'pembinaan' }, { t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15', topic: 'akuntansi' }],
    'EMP-419': [{ t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15', topic: 'akuntansi' }],
    'EMP-421': [{ t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }, { t: 'Webinar Pajak Coretax', type: 'Terstruktur', skp: 4, date: '2026-03-04', topic: 'lain' }],
    'EMP-422': [{ t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 4, date: '2026-03-01' }, { t: 'Self-study standar', type: 'Tidak Terstruktur', skp: 6, date: '2026-02-24' }, { t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }],
    'EMP-424': [{ t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }],
    'EMP-425': [{ t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15', topic: 'akuntansi' }, { t: 'Audit Data Analytics', type: 'Terstruktur', skp: 6, date: '2026-01-30', topic: 'akuntansi' }],
    'EMP-427': [{ t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }, { t: 'Webinar Pajak Coretax', type: 'Terstruktur', skp: 4, date: '2026-03-04', topic: 'lain' }, { t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 4, date: '2026-03-01' }],
    'EMP-428': [{ t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 4, date: '2026-03-01' }],
};
