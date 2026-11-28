/* ============================================================
   Asseris — penjaga tingkat shell: modul perikatan butuh perikatan aktif
   (PRD prd-identitas-firma-sesi A7, keputusan Q-3 2026-11-28)
   ------------------------------------------------------------
   ±200 modul; puluhan di antaranya dulu menambal "tak ada perikatan aktif" sendiri-sendiri
   dengan perikatan DEMO: `|| 'ENG-2025-014'`, `|| { id: 'ENG-2025-014', fy: 'FY2025' }`, atau
   literal di judul & meta ekspor. Penjaga per modul berarti 200 tempat untuk lupa. Penjaga ini
   SATU tempat: rute yang bekerja atas satu perikatan tidak dirender sama sekali tanpa perikatan
   aktif, dan gerbang `identitas_demo_gate.test.ts` memaku bahwa tak ada cadangan yang tersisa.

   Yang dijaga ditentukan per GRUP modul (`MODULE_INDEX[id].group`), bukan daftar id, supaya
   modul baru di grup itu ikut terjaga tanpa diingat:
     · grup ruang kerja Perikatan (WORKSPACES 'engagement') KECUALI 'Referensi & Indeks'
       (matriks kepatuhan, templat, basis pengetahuan — bukan kerja atas satu perikatan);
     · grup SA & PSAK/SAK yang disembunyikan dari sidebar (dibuka lewat chip/⌘K) — kertas
       kerja atas neraca saldo perikatan aktif;
     · ditambah modul di workspace Firma yang menulis data per perikatan (Portal Klien: PBC).
   ============================================================ */
import React from 'react';
import { MODULE_INDEX, WORKSPACES } from './icons';
import { Btn } from './ui';

const NOT_ENGAGEMENT_WORK = new Set(['Referensi & Indeks']);
const HIDDEN_ENGAGEMENT_GROUPS = [
  'SA · Tanggung Jawab (200)', 'SA · Bukti Audit (500)', 'SA · Pelaporan (700)',
  'SA · Area Khusus & Perikatan', 'Akuntansi (PSAK & SAK)', 'Akuntansi Syariah (SAK Syariah)',
];
/** Modul di luar grup di atas yang menulis data PER PERIKATAN. */
const ENGAGEMENT_SCOPED_MODULES = new Set(['clientportal']);

const engagementWs = (WORKSPACES as Array<{ id: string; groups: string[] }>).find((w) => w.id === 'engagement');
const ENGAGEMENT_GROUPS = new Set([
  ...((engagementWs && engagementWs.groups) || []).filter((g) => !NOT_ENGAGEMENT_WORK.has(g)),
  ...HIDDEN_ENGAGEMENT_GROUPS,
]);

/** true bila modul ini hanya bermakna atas SATU perikatan aktif. */
export function requiresActiveEngagement(moduleId: string): boolean {
  if (ENGAGEMENT_SCOPED_MODULES.has(moduleId)) return true;
  const entry = (MODULE_INDEX as Record<string, { group?: string } | undefined>)[moduleId];
  return !!(entry && entry.group && ENGAGEMENT_GROUPS.has(entry.group));
}

/** Grup yang dijaga — diekspor untuk uji (memaku bahwa peta ini tidak vakum). */
export function guardedGroups(): string[] {
  return [...ENGAGEMENT_GROUPS];
}

/** Perikatan NETRAL untuk modul terjaga. Tak terjangkau di balik penjaga; bila tetap terjangkau
 *  (mis. dirender di luar App), id kosong tak beralamat — tak pernah perikatan demo. */
export const NO_ACTIVE_ENGAGEMENT: { id: string; fy: string } = Object.freeze({ id: '', fy: '' });

/** Keadaan kosong pengganti modul perikatan ketika tak ada perikatan aktif. */
export function NoActiveEngagement({ moduleLabel, onNavigate }: { moduleLabel: string; onNavigate: (id: string) => void }) {
  return (
    <div className="view-scroll">
      <div className="view-pad" style={{ padding: 24 }}>
        <div className="panel" role="status" style={{ padding: 20, maxWidth: 560 }}>
          <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 6 }}>Belum ada perikatan aktif</div>
          <div style={{ fontSize: 'var(--fs-md)', color: 'var(--ink-2)', marginBottom: 14 }}>
            <b>{moduleLabel}</b> bekerja atas satu perikatan audit. Firma Anda belum punya perikatan yang dapat
            Anda akses, atau belum ada yang dipilih. Buat atau pilih perikatan di Manajemen Perikatan.
          </div>
          <div className="row gap8">
            <Btn variant="primary" onClick={() => onNavigate('engagement')}>Buka Manajemen Perikatan</Btn>
            <Btn onClick={() => onNavigate('crm')}>Direktori Klien</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
