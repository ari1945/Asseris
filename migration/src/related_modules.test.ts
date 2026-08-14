/* ============================================================
   Program F — RelatedNavDock & backfill RELATED_SA.
   Memaku: (1) setiap `view:` di RELATED_SA menunjuk modul yang
   TERDAFTAR di MODULE_INDEX (typo id = chip mati); (2) 13 modul
   PSAK/SAK + ethics/hcm ter-backfill (chip "Keterkaitan Standar"
   muncul di modul tsb).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { MODULE_INDEX, RELATED_SA } from './icons';

type SaEntry = { code: string; title: string; phase: string; view?: string };

describe('Program F — RELATED_SA (backfill)', () => {
  it('setiap view: di RELATED_SA menunjuk modul yang terdaftar di MODULE_INDEX', () => {
    const views = Object.values(RELATED_SA).flat().map((r: SaEntry) => r.view).filter((v): v is string => !!v);
    expect(views.length).toBeGreaterThan(0);
    const known = new Set(Object.keys(MODULE_INDEX));
    const bad = views.filter((v) => !known.has(v));
    expect(bad).toEqual([]);
  });

  it('13 modul PSAK/SAK + ethics/hcm ter-backfill (Program F)', () => {
    const ids = ['psak2', 'psak22', 'psak48', 'psak58', 'psak65', 'psak66', 'psak68', 'psak73', 'segmen', 'invprop', 'assoc', 'newdisc', 'sakep', 'ethics', 'hcm'];
    for (const id of ids) {
      expect(RELATED_SA[id], id).toBeTruthy();
      expect(RELATED_SA[id].length, id).toBeGreaterThan(0);
    }
  });

  it('referensi view backfill PSAK menunjuk modul yang ada (spot-check sa540/sa520/sa710/fsgen)', () => {
    const spot: [string, string][] = [
      ['psak48', 'sa540'], ['psak73', 'sa540'], ['psak73', 'sa520'],
      ['newdisc', 'sa710'], ['newdisc', 'fsgen'], ['sakep', 'fsgen'],
      ['psak65', 'groupaudit'], ['psak22', 'expert'],
    ];
    for (const [mod, view] of spot) {
      expect(RELATED_SA[mod].some((r: SaEntry) => r.view === view), `${mod} → ${view}`).toBe(true);
    }
  });
});
