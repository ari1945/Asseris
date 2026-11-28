/* ============================================================
   Penjaga tingkat shell (PRD prd-identitas-firma-sesi A7, Q-3) — peta "modul butuh perikatan".

   Penjaga hanya sekuat petanya. Dua arah cacat yang dipaku:
     · modul kerja perikatan yang LOLOS penjaga → dirender tanpa perikatan, jatuh ke cadangan;
     · modul tingkat firma yang IKUT terjaga → firma segar terkunci dari Direktori Klien /
       Manajemen Perikatan, satu-satunya jalan untuk MEMBUAT perikatan pertamanya.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { guardedGroups, requiresActiveEngagement } from './engagement_guard';

describe('requiresActiveEngagement', () => {
  it.each([
    'cockpit', 'wtb', 'aje', 'materiality', 'risk', 'opinion', 'goingconcern', 'evidence',
    'psak1', 'psak16', 'psak71', 'newdisc', 'sa200', 'sa501', 'sa701', 'spr2410', 'syariah', 'clientportal',
  ])('modul kerja perikatan "%s" TERJAGA', (id) => {
    expect(requiresActiveEngagement(id)).toBe(true);
  });

  it.each([
    'home', 'crm', 'engagement', 'dashboard', 'dms', 'pipeline', 'personal', 'users',
    'compmatrix', 'templates', 'kb', 'settings', 'modul-tak-dikenal',
  ])('modul tingkat firma / referensi "%s" TIDAK terjaga', (id) => {
    expect(requiresActiveEngagement(id)).toBe(false);
  });

  it('peta grup tidak vakum dan memuat grup tersembunyi SA/PSAK', () => {
    const g = guardedGroups();
    expect(g).toContain('2 · Pelaksanaan');
    expect(g).toContain('Akuntansi (PSAK & SAK)');
    expect(g).toContain('SA · Pelaporan (700)');
    expect(g).not.toContain('Referensi & Indeks');
    expect(g).not.toContain('Manajemen Praktik Firma');
  });
});

describe('App memasang penjaga di satu tempat', () => {
  const app = readFileSync(join(__dirname, 'app.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  it('rute terjaga tanpa perikatan aktif merender NoActiveEngagement, bukan modulnya', () => {
    expect(app).toMatch(/requiresActiveEngagement\(route\)\s*&&\s*!\(firmCtx && firmCtx\.activeEngagement\)/);
    expect(app).toMatch(/needsEngagement\s*\n?\s*\?\s*<NoActiveEngagement/);
  });
});
