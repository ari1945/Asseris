import React from 'react';
import { useAmsPersist } from './contexts';
import { AMS } from './data';

/* ============================================================
   Asseris — useFirmSubledger: SATU PINTU sub-buku piutang & utang firma.

   Sejajar `useFirmCoa` (#241), dan menutup celah kembarannya.

   `useFirmCoa` sudah menyalurkan saldo BUKU BESAR yang hidup ke dalam ctx FIRMFIN,
   sehingga memposting jurnal menggeser seluruh aplikasi. Tetapi rekonsiliasi akun
   kontrol punya DUA sisi, dan sisi satunya — sub-buku — tetap dibaca dari seed:

     · `invOf(ctx) = (ctx && ctx.invoices) || A().INVOICES || []`  (data_firmfin.ts)
       membaca ctx, tetapi TAK ADA satu pun pemanggil yang mengirim `invoices`;
     · `ap(ctx)` bahkan tak punya kuncinya sampai arc ini (lihat `apOf`).

   Akibatnya: sisi kontrol GL hidup, sisi sub-buku beku. Menandai faktur lunas di
   Billing atau membayar utang di AP/AR tidak menggerakkan baris `1-200`/`2-100`
   sedikit pun — padahal sejak gerbang Q-2 kedua baris itu ikut menentukan apakah
   Neraca Saldo dan Laporan Keuangan firma boleh keluar sebagai kertas kerja.
   Gerbang yang tak dapat berubah oleh tindakan pengguna hanya memberi rasa aman.

   SATU PINTU, bukan dipanggil ulang di banyak komponen: `useServerState` tak punya
   broadcast lintas-instance (gotcha arc #237), jadi dua salinan state yang hidup
   bersamaan bisa menyimpang. Komponen yang MENULIS registernya sendiri (mis.
   `FirmAPAR` menulis `firmap`) memakai instance tulisnya sendiri dan TIDAK memanggil
   hook ini — kalau tidak, ia memegang dua salinan `firmap` sekaligus.
   ============================================================ */

/** Faktur klien — register `invoices`, ditulis modul Billing & Invoicing. */
export interface FirmInvoice {
  id: string;
  client: string;
  eng?: string;
  issued?: string;
  due: string;
  amount: number;
  paid: number;
  status: string;
  milestone?: string;
}

/** Tagihan vendor — register `firmap`, ditulis modul AP/AR Firma. */
export interface FirmApBill {
  id: string;
  vendor: string;
  cat: string;
  issued?: string;
  due: string;
  amount: number;
  paid: number;
  status: string;
}

export interface FirmSubledger {
  /** Faktur yang HIDUP (bukan `AMS.INVOICES`) — sub-buku akun kontrol `1-200`. */
  invoices: FirmInvoice[];
  /** Tagihan vendor yang HIDUP (bukan `AMS.FIRM_AP`) — sub-buku akun kontrol `2-100`. */
  firmap: FirmApBill[];
}

export function useFirmSubledger(): FirmSubledger {
  const [invoices] = useAmsPersist('invoices', () => AMS.INVOICES) as [FirmInvoice[], unknown];
  const [firmap] = useAmsPersist('firmap', () => AMS.FIRM_AP) as [FirmApBill[], unknown];
  /* Identitas objek distabilkan supaya ctx FIRMFIN di pemanggil tak dibangun ulang
     tiap render (dan `useMemo` di sana benar-benar menahan hitungannya). */
  return React.useMemo(() => ({ invoices, firmap }), [invoices, firmap]);
}
