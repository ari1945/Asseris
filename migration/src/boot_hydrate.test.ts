// @vitest-environment jsdom
/* ============================================================
   Hidrasi masuk-sesi — PRD prd-identitas-firma-sesi A1 + A3 + Q-2.

   Cacat yang ditutup (app.tsx `Root.enter` lama):

       try { await hydrateCoreFromApi('ENG-2025-014', user.id); }
       catch (e) { /* offline: data.js fallback *\/ }

   Untuk SETIAP firma: perikatan demo dipaku, dan penolakan server (`cross-firm-engagement`)
   ditelan — firma segar lalu berjalan di atas seluruh seed demo.

   SEAM: hanya transport tRPC yang di-mock (pola fresh_firm_gate.test.ts). `hydrateCoreFromApi`
   berjalan NYATA.
   ============================================================ */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const srv = vi.hoisted(() => ({
  calls: [] as Array<{ path: string; arg: Record<string, unknown> }>,
  list: [] as Array<{ id: string }>,
  bootstrapReject: null as string | null,
  bundle: null as unknown,
}));

vi.mock('@trpc/client', () => {
  const node = (path: string): unknown =>
    new Proxy(function () {}, {
      get(_t, prop) {
        const key = String(prop);
        if (key === 'query' || key === 'mutate') {
          return async (arg: Record<string, unknown>) => {
            srv.calls.push({ path, arg: arg ?? {} });
            if (path === 'engagement.list') return srv.list;
            if (path === 'bootstrap') {
              if (srv.bootstrapReject) throw new Error(srv.bootstrapReject);
              return srv.bundle;
            }
            return null;
          };
        }
        return node(path ? path + '.' + key : key);
      },
    });
  return { createTRPCClient: () => node(''), httpBatchLink: () => ({}) };
});

const { hydrateForSession, pickBootEngagement, BootHydrationError } = await import('./boot_hydrate');
const { sessionFirmId, setSessionFirmId, persistCacheKey, coreDataOwner } = await import('./persist_scope');
const { AMS } = await import('./data');

const SNAPSHOT = { FIRM: AMS.FIRM, CLIENTS: AMS.CLIENTS, ENGAGEMENTS: AMS.ENGAGEMENTS, TEAM: AMS.TEAM, WTB: AMS.WTB, USER: AMS.USER };
const USER = { id: 'USER-SEGAR', firmId: 'FIRM-SEGAR' };
const FRESH_BUNDLE = {
  firm: { id: 'FIRM-SEGAR', name: 'KAP Firma Segar', short: 'KFS', license: null, partners: 1, managers: 0, staff: 0 },
  users: [{ id: 'USER-SEGAR', name: 'Admin Segar', initials: 'AS', role: 'Engagement Partner', email: 'a@segar.test' }],
  team: [], clients: [], engagements: [], wtb: [], states: [],
};

const bootstrapCalls = () => srv.calls.filter((c) => c.path === 'bootstrap');

beforeEach(() => {
  srv.calls.length = 0;
  srv.list = [];
  srv.bootstrapReject = null;
  srv.bundle = FRESH_BUNDLE;
  localStorage.clear();
  setSessionFirmId(null);
});
afterEach(() => { Object.assign(AMS, SNAPSHOT); });

describe('pickBootEngagement — hanya perikatan yang BOLEH diakses', () => {
  it('perikatan aktif terakhir dipakai bila masih dapat diakses', () => {
    expect(pickBootEngagement(['E-1', 'E-2'], 'E-2')).toBe('E-2');
  });
  it('perikatan terakhir yang tak lagi dapat diakses diganti yang pertama', () => {
    expect(pickBootEngagement(['E-1', 'E-2'], 'ENG-2025-014')).toBe('E-1');
  });
  it('tanpa perikatan yang dapat diakses → tanpa perikatan, bukan perikatan demo', () => {
    expect(pickBootEngagement([], 'ENG-2025-014')).toBeNull();
    expect(pickBootEngagement([], null)).toBeNull();
  });
});

describe('hydrateForSession', () => {
  it('firma segar tanpa perikatan: lingkup firma dari sesi, bootstrap TANPA engagementId, data demo dikosongkan', async () => {
    await expect(hydrateForSession(USER)).resolves.toBeNull();
    expect(sessionFirmId()).toBe('FIRM-SEGAR');
    expect(bootstrapCalls()).toHaveLength(1);
    expect(bootstrapCalls()[0].arg.engagementId).toBeUndefined();
    expect(AMS.CLIENTS).toEqual([]);
    expect(AMS.ENGAGEMENTS).toEqual([]);
    expect(coreDataOwner(AMS.FIRM)).toBe('FIRM-SEGAR');
    expect(AMS.USER.name).toBe('Admin Segar');
    expect(JSON.stringify(AMS.USER)).not.toContain('Hartono');
  });

  it('perikatan aktif terakhir pengguna (cache) dihidrasi bila dapat diakses', async () => {
    srv.list = [{ id: 'E-1' }, { id: 'E-2' }];
    localStorage.setItem(persistCacheKey('user', USER.id, 'activeEng'), JSON.stringify('E-2'));
    await expect(hydrateForSession(USER)).resolves.toBe('E-2');
    expect(bootstrapCalls()[0].arg.engagementId).toBe('E-2');
  });

  it('sesi tanpa firmId DITOLAK sebelum memanggil server — tak ada firma cadangan', async () => {
    await expect(hydrateForSession({ id: 'U' })).rejects.toBeInstanceOf(BootHydrationError);
    expect(srv.calls).toHaveLength(0);
    expect(sessionFirmId()).toBeNull();
  });

  it('penolakan bootstrap DILEMPAR (Q-2), tidak ditelan menjadi data demo', async () => {
    srv.bootstrapReject = 'cross-firm-engagement';
    const demoClients = AMS.CLIENTS;
    await expect(hydrateForSession(USER)).rejects.toThrow('cross-firm-engagement');
    expect(AMS.CLIENTS).toBe(demoClients); // tak diterapkan — dan pemanggil tak memasang provider
  });

  it('bundel kosong (null) adalah galat, bukan sukses', async () => {
    srv.bundle = null;
    await expect(hydrateForSession(USER)).rejects.toBeInstanceOf(BootHydrationError);
  });
});

describe('Root.enter memakai jalur ini — tak ada lagi perikatan demo yang dipaku atau galat yang ditelan', () => {
  const app = readFileSync(join(__dirname, 'app.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  it('app.tsx memanggil hydrateForSession dan tak memanggil hydrateCoreFromApi langsung', () => {
    expect(app).toContain('hydrateForSession(');
    expect(app).not.toMatch(/hydrateCoreFromApi\s*\(/);
    expect(app).not.toContain('ENG-2025-014');
  });
  it('galat hidrasi menuju fase "error" (layar galat), bukan "ready"', () => {
    expect(app).toMatch(/catch\s*\(e\)\s*\{\s*setPhase\('error'\)/);
  });
});
