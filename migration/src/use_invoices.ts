import { AMS } from './data';
import { useAmsPersist, useAuth } from './contexts';
import { CAP } from './rbac';
import type { InvoiceRecord } from './canon_invoices';

/* ============================================================
   Asseris — useInvoiceRegister: SATU PINTU register faktur firma.

   Sejajar dengan `usePipelineRegister` (#254) dan `useFirmCoa` (#241):
   dokumen persist `invoices` adalah sumber kebenaran, dan SEMUA konsumen
   (Billing · AP/AR firma · Pendapatan & Penagihan · ikhtisar Firm Finance ·
   pemicu keberlanjutan klien) masuk lewat pintu ini.

   Sebelumnya modul Billing MENULIS dokumen ini sementara setiap konsumen
   membaca literal seed `AMS.INVOICES`: "Tandai Lunas" menggerakkan KPI di
   layar Billing, sedangkan tab Piutang, aging AR, dunning, dan DSO melihat
   keadaan seed selamanya — sambil layar AP/AR menuliskan kepada pengguna
   "AR tersinkron dari modul Billing & Invoicing".

   SATU PINTU, bukan `useAmsPersist('invoices')` yang diulang di banyak
   komponen: `useServerState` tak punya broadcast lintas-instance (gotcha
   arc #237), jadi dua salinan state yang hidup bersamaan bisa menyimpang.
   ============================================================ */

export interface InvoiceRegisterResult {
  /** Register faktur firma. SSOT seluruh angka penagihan & piutang. */
  register: InvoiceRecord[];
  /** Penulis register. Panggil hanya bila `canEdit`. */
  setRegister: (updater: InvoiceRecord[] | ((prev: InvoiceRecord[]) => InvoiceRecord[])) => void;
  /**
   * Kewenangan tulis (SoD finansial, Program E). HARUS selaras dengan
   * `capForWrite('firm','invoices')` di rbac.ts — kalau tidak, pengguna
   * melihat tombol aktif lalu tulisannya ditolak SENYAP oleh server.
   */
  canEdit: boolean;
}

export function useInvoiceRegister(): InvoiceRegisterResult {
  const [register, setRegister] = useAmsPersist('invoices', () => AMS.INVOICES as InvoiceRecord[]) as [
    InvoiceRecord[], (u: InvoiceRecord[] | ((p: InvoiceRecord[]) => InvoiceRecord[])) => void,
  ];
  const auth = useAuth();
  const canEdit = !!(auth && typeof auth.can === 'function' && auth.can(CAP.FIRMFIN_EDIT));
  return { register, setRegister, canEdit };
}
