import React from 'react';
import { useFirm, useAudit } from './contexts';
import { FIRMFIN } from './data_firmfin';

/* ============================================================
   Asseris — useFirmWip: SUMBER KEBENARAN TUNGGAL nilai WIP firma.

   Sebelumnya tiap surface WIP menghitung sendiri: ctx {engagements,clients}
   + overlay jam-aktual Time & Budget (`liveByEng`) untuk engagement aktif,
   lalu FIRMFIN.wip(ctx, provFactor, liveByEng). Beberapa surface (Dashboard,
   cockpit Beranda, ikhtisar Firm Finance) LUPA meng-overlay `liveByEng`
   sehingga menampilkan WIP dari std seed yang basi (mis. 7,72 M) alih-alih
   nilai aktual T&B (5,90 M) — angka WIP jadi tak konsisten antar-modul.

   Hook ini mengurung derivasi itu di SATU tempat. SEMUA surface WIP
   (WIP Valuation, WIP & Realisasi, Firm Finance, Firm Dashboard, cockpit
   Beranda) memakainya → angka WIP identik, overlay T&B seragam.

   Mengembalikan { wip, liveByEng }: `liveByEng` diekspos agar view bisa
   menampilkan chip "Sinkron T&B" saat engagement aktif punya timesheet live.
   ============================================================ */

interface WipFirmCtx { engagements: unknown[]; clients: unknown[]; activeEngagement: { id: string } | null }
interface WipAuditCtx { timeEntries: unknown[] }
interface EngWip { stdValue: number; costValue: number; actualHrs: number }
type LiveByEng = Record<string, { std: number; cost: number; actualHrs: number }> | null;

export function useFirmWip(provFactor?: number) {
  const firm = useFirm() as unknown as WipFirmCtx;
  const audit = useAudit() as unknown as WipAuditCtx;
  const { engagements, clients, activeEngagement } = firm;
  const timeEntries = audit.timeEntries;

  const ctx = React.useMemo(() => ({ engagements, clients }), [engagements, clients]);

  /* overlay jam-aktual T&B untuk engagement aktif → std/biaya/jam = live,
     bukan std seed. null bila engagement aktif tak punya timesheet. */
  const liveByEng: LiveByEng = React.useMemo(() => {
    const id = activeEngagement && activeEngagement.id;
    if (!id) return null;
    const ew = FIRMFIN.engagementWip(timeEntries, id) as EngWip | null;
    return ew ? { [id]: { std: ew.stdValue, cost: ew.costValue, actualHrs: ew.actualHrs } } : null;
  }, [timeEntries, activeEngagement]);

  const wip = React.useMemo(() => FIRMFIN.wip(ctx, provFactor, liveByEng), [ctx, provFactor, liveByEng]);

  return { wip, liveByEng };
}
