import { AMS } from './data';
import { useAmsPersist, useAuth } from './contexts';
import { CAP } from './rbac';

/* ============================================================
   Asseris — useFirmApRegister: SATU PINTU register utang usaha firma.

   Sejajar `useInvoiceRegister` (#275), `usePipelineRegister` (#254) dan
   `useFirmCoa` (#241): dokumen persist `firmap` adalah sumber kebenaran, dan
   SEMUA konsumen masuk lewat pintu ini.

   CACAT YANG DITUTUP. Rekonsiliasi akun kontrol punya DUA sisi, dan sisi
   sub-buku utang dibaca dari seed selamanya: `FIRMFIN.ap()` tak punya pintu
   ctx sama sekali sampai arc ini — ia SELALU membaca `AMS.FIRM_AP`. Akibatnya
   sisi kontrol GL `2-100` bergerak mengikuti jurnal terposting sementara sisi
   sub-bukunya diam, sehingga baris rekonsiliasi itu tak dapat berubah oleh
   tindakan pengguna mana pun — dan gerbang Q-2 yang menentukan boleh-tidaknya
   Neraca Saldo & Laporan Keuangan firma terbit bersandar tepat pada selisih
   itu. Gerbang yang tak bisa digerakkan hanya memberi rasa aman.

   Register FAKTUR tidak ikut di sini: `use_invoices.ts` sudah memegangnya.
   Membuka `useAmsPersist('invoices')` kedua kalinya justru melanggar alasan
   pintu tunggal itu ada — `useServerState` tak punya broadcast lintas-instance
   (gotcha arc #237), jadi dua salinan yang hidup bersamaan bisa menyimpang.
   ============================================================ */

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

export interface FirmApRegisterResult {
  /** Register utang usaha firma. SSOT sub-buku akun kontrol `2-100`. */
  register: FirmApBill[];
  /** Penulis register. Panggil hanya bila `canEdit`. */
  setRegister: (updater: FirmApBill[] | ((prev: FirmApBill[]) => FirmApBill[])) => void;
  /**
   * Kewenangan tulis (SoD finansial, Program E). HARUS selaras dengan
   * `capForWrite('firm','firmap')` di rbac.ts — kalau tidak, pengguna melihat
   * tombol aktif lalu tulisannya ditolak SENYAP oleh server.
   */
  canEdit: boolean;
}

export function useFirmApRegister(): FirmApRegisterResult {
  const [register, setRegister] = useAmsPersist('firmap', () => AMS.FIRM_AP as FirmApBill[]) as [
    FirmApBill[], (u: FirmApBill[] | ((p: FirmApBill[]) => FirmApBill[])) => void,
  ];
  const auth = useAuth();
  const canEdit = !!(auth && typeof auth.can === 'function' && auth.can(CAP.FIRMFIN_EDIT));
  return { register, setRegister, canEdit };
}
