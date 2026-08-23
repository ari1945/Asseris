/* ============================================================
   IDENTITAS FIRMA — satu pintu untuk "siapa yang menerbitkan kertas kerja ini".

   Latar: `view_firmtreasury.tsx` membaca nama firma dari `useFirm().firm.name`.
   Kunci `firm` TIDAK PERNAH ADA di nilai FirmContext (`contexts.tsx`, `FirmProvider`
   menerbitkan clients/engagements/activeEngagement/… — tidak ada `firm`). Nilainya
   karena itu SELALU string kosong, dan ketiga tombol ekspor modul itu — Anggaran vs
   Aktual, "Ekspor rekening ini", "Seluruh rekening" — berdiri permanen dalam keadaan
   `disabled` dengan tooltip "Identitas firma tak tersedia". Kertas kerja rekonsiliasi
   bank yang dibangun PR #283 tak pernah bisa dikeluarkan, bukan karena ditolak,
   melainkan karena tombolnya tak pernah bisa diklik.

   Yang menyembunyikannya: harness ujinya sendiri. `cash_bank_render.test.ts` dan
   `treasury_render.test.ts` me-mock `useFirm: () => ({ firm: { name } })` — BENTUK
   KONTEKS YANG DIKARANG. Uji "tombol ekspor hidup" karena itu hijau terhadap konteks
   yang tidak pernah ada di produksi. Gerbangnya ada di `firm_identity.test.ts`.

   SSOT: `useAuth().firm` — SATU sumber (contexts.tsx menaruh `firm: D.FIRM` di nilai
   AuthContext). SENGAJA tanpa cadangan ke `AMS.FIRM`: ia objek yang SAMA (`D = AMS`),
   jadi cadangannya tak menambah informasi apa pun — yang ia lakukan hanyalah membuat
   keadaan "identitas tak tersedia" MUSTAHIL TERCAPAI, sehingga penjaga `disabled`
   pada tombol ekspor menjadi kode mati yang tak bisa diuji. Dan tentu tidak ada
   fallback literal: menyegel nama firma yang dikarang lebih buruk daripada tidak
   menyegel sama sekali.
   ============================================================ */
import { useAuth } from './contexts';

/** Bentuk minimal identitas firma yang dipakai penyegelan kertas kerja. */
export interface FirmIdentity {
  name?: string;
}

/** Bentuk minimal nilai AuthContext yang memuat identitas firma. */
export interface FirmIdentitySource {
  firm?: FirmIdentity | null;
}

/**
 * Ekstraksi MURNI — dapat diuji terhadap bentuk konteks yang NYATA (nilai yang
 * benar-benar diterbitkan provider), bukan terhadap bentuk yang dikarang harness.
 *
 * Mengembalikan '' bila tak ada sumber yang menyebut nama. Pemanggil WAJIB
 * memperlakukan '' sebagai "tidak dapat diterbitkan", bukan sebagai nama kosong.
 */
export function firmNameFrom(auth: FirmIdentitySource | null | undefined): string {
  return String((auth && auth.firm && auth.firm.name) || '').trim();
}

/** Nama firma penerbit dari SSOT sesi. '' = identitas tak tersedia. */
export function useFirmName(): string {
  return firmNameFrom(useAuth() as FirmIdentitySource | null);
}
