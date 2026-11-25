// @vitest-environment jsdom
/* ============================================================
   Gerbang "FIRMA SEGAR" — Fase 1 (PRD docs/prd-gerbang-firma-segar.md).
   ------------------------------------------------------------
   Seluruh jaring uji lain berjalan di atas firma demo `FIRM-WHR`. Dalam dunia itu id
   firma yang dipaku di frontend dan id firma sesi SELALU sama, sehingga kelas cacat
   "identitas demo dipaku" tak terlihat secara struktural. Berkas ini menjalankan firma
   BERBENTUK PRODUKSI: id ≠ `FIRM-WHR`, nol klien, nol perikatan, nol tim.

   SEAM (pelajaran R-2 di api.test.ts / stage0_context_races_repro.test.ts): yang
   di-mock HANYA transport tRPC. `hydrateCoreFromApi`, `useServerState`, dan provider
   dijalankan NYATA — kalau yang di-mock adalah pemilik penjaganya, tak ada perbaikan
   yang bisa membuat ujinya hijau.

   Server palsu di bawah SETIA pada server sungguhan untuk dua aturan yang relevan:
     · state.get/set scope 'firm' dengan scopeId ≠ firma sesi → FORBIDDEN 'cross-firm-state'
       (server/src/router.ts:236, server/src/stateAccess.ts:107);
     · bootstrap perikatan yang bukan milik firma → FORBIDDEN 'cross-firm-engagement'
       (server/src/engagementAccess.ts:47). Firma segar tak punya perikatan apa pun.
   Sisi server dari kontrak (G1-b) sudah dipaku uji D3 di
   server/src/__tests__/stage1_data_isolation.test.ts — tidak diduplikasi di sini.
   ============================================================ */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const FRESH_FIRM = 'FIRM-SEGAR';

type Call = { path: string; kind: string; arg: Record<string, unknown> };
type Rejection = Error & { data: { code: string; httpStatus: number } };

const srv = vi.hoisted(() => ({
  calls: [] as Array<{ path: string; kind: string; arg: Record<string, unknown> }>,
}));

function forbidden(message: string): Rejection {
  const e = new Error(message) as Rejection;
  e.data = { code: 'FORBIDDEN', httpStatus: 403 };
  return e;
}

/* Bundel yang dijawab `bootstrap` untuk SATU panggilan uji G1-c; selain itu bootstrap ditolak. */
let bootstrapOverride: unknown;

/* Server palsu firma segar. Semua yang tak disebut mengembalikan `null` — bentuk yang
   sama dengan "server tak punya apa-apa untuk Anda", bukan galat. */
async function fakeServer(path: string, arg: Record<string, unknown>): Promise<unknown> {
  if (path === 'bootstrap') {
    if (bootstrapOverride !== undefined) return bootstrapOverride;
    throw forbidden('cross-firm-engagement');        // firma segar: nol perikatan
  }
  if (path === 'engagement.list') return [];
  if (path === 'state.get' || path === 'personal.get' || path === 'state.set') {
    if (arg.scope === 'firm' && arg.scopeId !== FRESH_FIRM) throw forbidden('cross-firm-state');
    if (path === 'state.set') return { version: Number(arg.baseVersion ?? 0) + 1 };
    return { value: null, version: 0 };
  }
  return null;
}

vi.mock('@trpc/client', () => {
  const node = (path: string): unknown =>
    new Proxy(function () {}, {
      get(_t, prop) {
        const key = String(prop);
        if (key === 'query' || key === 'mutate') {
          return async (arg: Record<string, unknown>) => {
            srv.calls.push({ path, kind: key, arg: arg ?? {} });
            return fakeServer(path, arg ?? {});
          };
        }
        return node(path ? path + '.' + key : key);
      },
    });
  return { createTRPCClient: () => node(''), httpBatchLink: () => ({}) };
});

const { hydrateCoreFromApi } = await import('./api');
const { AMS } = await import('./data');
const { AppProviders, useFirm } = await import('./contexts');

/* Identitas demo, dipotret SEBELUM apa pun berjalan — inilah yang tak boleh pernah
   tampil sebagai data firma segar, apalagi tertulis ke server firma itu. */
const DEMO_CLIENT_IDS: string[] = (AMS.CLIENTS || []).map((c: { id: string }) => c.id);
const DEMO_ENGAGEMENT_IDS: string[] = (AMS.ENGAGEMENTS || []).map((e: { id: string }) => e.id);
const DEMO_FIRM_NAME: string = String((AMS.FIRM as { name?: string }).name ?? '');

const SNAPSHOT = {
  FIRM: AMS.FIRM, CLIENTS: AMS.CLIENTS, ENGAGEMENTS: AMS.ENGAGEMENTS, TEAM: AMS.TEAM, WTB: AMS.WTB, USER: AMS.USER,
};

const ME = {
  id: 'USER-FIRMSEGAR-ADMIN', firmId: FRESH_FIRM, name: 'Admin Firma Segar', initials: 'AS',
  email: 'admin@firma-segar.test', role: 'Engagement Partner', totpEnabled: false,
};

/* Bundel `bootstrap` firma yang baru di-`bootstrapFirm`: identitas firma + admin, tanpa
   klien/perikatan/tim/WTB. */
const FRESH_BUNDLE = {
  firm: { name: 'KAP Firma Segar', short: 'KFS', license: null, partners: 1, managers: 0, staff: 0 },
  users: [{ id: ME.id, name: ME.name, initials: ME.initials, role: ME.role, email: ME.email }],
  team: [], clients: [], engagements: [], wtb: [], states: [],
};

type FirmApi = { clients: Array<{ id: string }>; engagements: Array<{ id: string }>; addClient: (c: { id: string; name: string }) => void };
let exposed: FirmApi | null = null;
let root: ReturnType<typeof createRoot> | null = null;
let host: HTMLElement | null = null;

function Probe() {
  exposed = useFirm() as FirmApi;
  return null;
}

async function settle() {
  for (let i = 0; i < 4; i++) await Promise.resolve();
}

async function renderProviders() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(React.createElement(AppProviders, { me: ME, onLogout: () => {} }, React.createElement(Probe)));
    await settle();
  });
}

const ids = (list: unknown): string[] =>
  Array.isArray(list) ? list.map((r) => String((r as { id?: unknown }).id)) : [];

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  srv.calls.length = 0;
  exposed = null;
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  if (host) host.remove();
  root = null;
  host = null;
  vi.clearAllTimers();
  vi.useRealTimers();
  Object.assign(AMS, SNAPSHOT);
});

describe('prasyarat gerbang (bukan uji cacat) — harness ini benar-benar menguji sesuatu', () => {
  it('data demo memang ada, sehingga "nol data demo" bukan pernyataan vakum', () => {
    expect(DEMO_CLIENT_IDS.length).toBeGreaterThan(0);
    expect(DEMO_ENGAGEMENT_IDS.length).toBeGreaterThan(0);
    expect(DEMO_FIRM_NAME).not.toBe('');
    expect(FRESH_FIRM).not.toBe('FIRM-WHR');
  });

  /* Tiga uji cacat di bawah dikarantina `it.fails()` — dan `it.fails()` juga "lulus" bila
     HARNESS-nya yang rusak (galat apa pun dihitung gagal). Uji-uji ini menjalankan harness
     yang SAMA tanpa asersi cacat dan WAJIB hijau: bila harness patah, merahnya di sini,
     bukan tersembunyi di balik karantina. */
  it('provider terpasang dan benar-benar membaca dokumen firm-scope', async () => {
    await renderProviders();
    expect(exposed).not.toBeNull();
    expect(srv.calls.some((c: Call) => c.path === 'state.get' && c.arg.scope === 'firm')).toBe(true);
  });

  it('bundel firma segar benar-benar DITERAPKAN oleh hydrateCoreFromApi nyata', async () => {
    await expect(hydrateCoreFromApiWithBundle(FRESH_BUNDLE)).resolves.toBe(true);
    expect((AMS.FIRM as { name?: string }).name).toBe('KAP Firma Segar');
  });

  it('suntingan klien terlihat dan benar-benar DICOBA ditulis ke server', async () => {
    await renderProviders();
    act(() => exposed!.addClient({ id: 'C-SEGAR-001', name: 'PT Klien Pertama Firma Segar' }));
    await act(async () => {
      await settle();
      vi.advanceTimersByTime(1000);
      await settle();
    });
    expect(ids(exposed!.clients)).toContain('C-SEGAR-001');
    expect(srv.calls.some((c: Call) => c.path === 'state.set' && c.arg.key === 'clients')).toBe(true);
  });
});

describe('G1-a · P0-1 — data firm-scope dialamatkan ke firma SESI, bukan firma demo', () => {
  // KARANTINA s/d 2026-12-31 — P0-1: FIRM_SCOPE_ID dipaku FIRM-WHR (persist_scope.ts:22).
  //   Merah di master 3de574c (dibuktikan tanpa karantina); tambalan lokal membaliknya.
  //   PR yang menutup cacatnya WAJIB mengganti it.fails → it (R-7, BUILD.md).
  it.fails('setiap state.get/personal.get scope firma memakai firmId sesi', async () => {
    await renderProviders();
    const firmReads = srv.calls.filter(
      (c: Call) => (c.path === 'state.get' || c.path === 'personal.get') && c.arg.scope === 'firm',
    );
    // SC-4: provider benar-benar membaca dokumen firma — tanpa ini asersi di bawah vakum.
    expect(firmReads.length).toBeGreaterThan(0);
    expect(firmReads.map((c: Call) => c.arg.scopeId)).toEqual(firmReads.map(() => FRESH_FIRM));
  });
});

describe('G1-c · P0-4 — bundel firma tanpa klien/perikatan/tim MENGOSONGKAN, bukan mempertahankan demo', () => {
  // KARANTINA s/d 2026-12-31 — P0-4: penjaga .length di api.ts:419/424/430.
  //   Merah di master 3de574c (dibuktikan tanpa karantina); tambalan lokal membaliknya.
  //   PR yang menutup cacatnya WAJIB mengganti it.fails → it (R-7, BUILD.md).
  it.fails('hydrateCoreFromApi dengan koleksi kosong meninggalkan nol baris demo', async () => {
    // Satu-satunya tempat bootstrap dijawab sukses: yang diuji di sini adalah PENERAPAN bundel,
    // bukan perikatan mana yang diminta saat boot (itu perjalanan Fase 2).
    const applied = await hydrateCoreFromApiWithBundle(FRESH_BUNDLE);
    // SC-4: bundel benar-benar diterapkan (identitas firma berganti) — bukan gagal diam-diam.
    expect(applied).toBe(true);
    expect((AMS.FIRM as { name?: string }).name).toBe('KAP Firma Segar');
    expect(ids(AMS.CLIENTS)).toEqual([]);
    expect(ids(AMS.ENGAGEMENTS)).toEqual([]);
    expect(Array.isArray(AMS.TEAM) ? AMS.TEAM.length : -1).toBe(0);
  });
});

describe('G1-d · P0-4 — firma segar tak pernah MENAMPILKAN maupun MENULIS baris demo', () => {
  // KARANTINA s/d 2026-12-31 — P0-4: nilai awal clients/engagements = seed demo (contexts.tsx:1054-1055).
  //   Merah di master 3de574c (dibuktikan tanpa karantina); tambalan lokal membaliknya.
  //   PR yang menutup cacatnya WAJIB mengganti it.fails → it (R-7, BUILD.md).
  it.fails('daftar klien & perikatan bebas demo, dan tak satu pun tulisan memuat id demo', async () => {
    await renderProviders();
    // SC-4: provider terpasang dan mengekspos daftar.
    expect(exposed).not.toBeNull();

    // Dua `act` terpisah (pola stage0): pembaruan state di-flush saat act PERTAMA selesai,
    // jadi timer debounce tulisan (SYNC_DEBOUNCE_MS = 400) baru ada sesudahnya.
    act(() => exposed!.addClient({ id: 'C-SEGAR-001', name: 'PT Klien Pertama Firma Segar' }));
    await act(async () => {
      await settle();
      vi.advanceTimersByTime(1000);
      await settle();
    });
    // SC-4: suntingan benar-benar terjadi DAN dicoba ditulis — tanpa keduanya asersi
    // "nol id demo di tulisan" lolos vakum (terjadi pada draf pertama berkas ini).
    expect(ids(exposed!.clients)).toContain('C-SEGAR-001');
    expect(srv.calls.some((c: Call) => c.path === 'state.set' && c.arg.key === 'clients')).toBe(true);

    const shownDemoClients = ids(exposed!.clients).filter((id) => DEMO_CLIENT_IDS.includes(id));
    const shownDemoEngagements = ids(exposed!.engagements).filter((id) => DEMO_ENGAGEMENT_IDS.includes(id));
    // Tulisan yang DICOBA dihitung, bukan hanya yang diterima: hari ini P0-1 menolaknya 403,
    // dan begitu P0-1 diperbaiki tulisan yang sama akan diterima apa adanya.
    const writtenDemoIds = srv.calls
      .filter((c: Call) => c.path === 'state.set' && (c.arg.key === 'clients' || c.arg.key === 'engagements'))
      .flatMap((c: Call) => ids(c.arg.value))
      .filter((id) => DEMO_CLIENT_IDS.includes(id) || DEMO_ENGAGEMENT_IDS.includes(id));

    expect({ shownDemoClients, shownDemoEngagements, writtenDemoIds })
      .toEqual({ shownDemoClients: [], shownDemoEngagements: [], writtenDemoIds: [] });
  });
});

/* Menjalankan `hydrateCoreFromApi` NYATA terhadap satu bundel tertentu: server palsu
   dijawab sukses hanya untuk panggilan ini. */
async function hydrateCoreFromApiWithBundle(bundle: unknown): Promise<boolean> {
  bootstrapOverride = bundle;
  try {
    return await hydrateCoreFromApi('ENG-FIRMSEGAR-TAKADA', ME.id);
  } finally {
    bootstrapOverride = undefined;
  }
}
