import React from 'react';
import { AMS } from './data';
/* `CRM_360` (rumah peluang cross-sell) di-merge ke AMS oleh IIFE data_fpm dan
   TIDAK diekspor. Impor efek-samping eksplisit di sini supaya register tak
   bergantung pada urutan boot: tanpa ini, pemanggil non-boot (uji, seed) melihat
   CRM_360 undefined dan register diam-diam kehilangan separuh isinya. */
import './data_fpm';
import { useAmsPersist, useAuth } from './contexts';
import { CAP } from './rbac';
import { mergeSeedOpportunities, pipelineSeed } from './canon_pipeline';
import type { Crm360Entry, Opportunity } from './canon_pipeline';
import type { ClientRow, PipelineOpp } from './ams_types';

/* ============================================================
   Asseris — usePipelineRegister: SATU PINTU register peluang firma.

   PRD `docs/prd-sales-pipeline-deepening.md` · PR-1.

   Sejajar dengan `useFirmCoa` (#241): dokumen persist `pipeline` adalah
   sumber kebenaran, dan SEMUA konsumen (view_pipeline · view_bi · view_bi2 ·
   view_capacity · view_crm2 · antrean persetujuan view_platform) masuk lewat
   pintu ini. Sebelumnya modul menulis ke dokumen ini sementara seluruh
   konsumen membaca literal seed `AMS.PIPELINE`, sehingga memindahkan kartu
   tidak menggerakkan satu pun angka hilir.

   SATU PINTU, bukan dipanggil ulang di banyak komponen: `useServerState` tak
   punya broadcast lintas-instance (gotcha arc #237), jadi dua salinan state
   yang hidup bersamaan bisa menyimpang.
   ============================================================ */

export interface PipelineRegisterResult {
  /** Register gabungan (intake + cross-sell). SSOT seluruh angka pipeline. */
  register: Opportunity[];
  /** Penulis register. Panggil hanya bila `canEdit`. */
  setRegister: (updater: Opportunity[] | ((prev: Opportunity[]) => Opportunity[])) => void;
  /**
   * Kewenangan tulis. HARUS selaras dengan `capForWrite('firm','pipeline')`
   * di rbac.ts — kalau tidak, pengguna melihat kartu bergerak lalu tulisannya
   * ditolak SENYAP oleh server (kelas cacat yang sama dgn `priorYear`,
   * `capacityPlan.v1`, `invoices`).
   */
  canEdit: boolean;
}

export function usePipelineRegister(): PipelineRegisterResult {
  const seed: Opportunity[] = React.useMemo(() => pipelineSeed({
    pipeline: AMS.PIPELINE as PipelineOpp[],
    crm360: (AMS as unknown as { CRM_360: Record<string, Crm360Entry> }).CRM_360 || {},
    clients: AMS.CLIENTS as ClientRow[],
  }), []);

  const [stored, setStored] = useAmsPersist('pipeline', () => seed) as [
    Opportunity[], (u: Opportunity[] | ((p: Opportunity[]) => Opportunity[])) => void,
  ];

  /* Cache persist bisa tertinggal di belakang seed (dokumen lama = 7 peluang
     intake saja). Anotasi eksplisit: `React.useMemo` di repo ini untyped. */
  const register: Opportunity[] = React.useMemo(() => mergeSeedOpportunities(stored, seed), [stored, seed]);

  const auth = useAuth();
  const canEdit = !!(auth && typeof auth.can === 'function' && auth.can(CAP.ENGAGEMENT_MANAGE));

  return { register, setRegister: setStored, canEdit };
}
