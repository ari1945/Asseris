// @vitest-environment jsdom
/* Tahap 0 — repro race perpindahan perikatan (lapisan CONTEXT).
   R-4: `@ts-nocheck` dihapus. Berkas ini dulu satu-satunya di seluruh `migration/src` yang
   memakainya, dan tepat melubangi gerbang `typecheck:test` yang dibuat PR #155 setelah
   `SAMPLE_WTB` diam-diam bernilai `undefined` selama dua PR.

   Repro KEDUA ("respons hidrasi A yang selesai setelah B") PINDAH ke `api.test.ts` →
   describe "R-2". Alasannya bukan karena ia sulit dihijaukan: di sini
   `hydrateCoreFromApi` DI-MOCK, padahal fungsi itulah pemilik penjaganya, dan mock-nya
   memutasi `AMS.WTB` tanpa syarat — properti yang diuji dilanggar oleh konstruksi
   harness-nya sendiri, sehingga TAK ADA perbaikan di `contexts.tsx` yang bisa
   membuatnya hijau. Di `api.test.ts` seam-nya benar (transport tRPC yang di-mock, fungsi
   nyata yang dieksekusi) dan ujinya merah tanpa perbaikan, hijau dengannya. */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  mutations: [],
  hydrate: vi.fn(),
  stateGet: vi.fn(),
  engagementList: vi.fn(),
}));

vi.mock('./api', () => ({
  api: {
    state: {
      get: { query: harness.stateGet },
      set: {
        mutate: vi.fn(async (input) => {
          harness.mutations.push(input);
          return { version: input.baseVersion + 1 };
        }),
      },
    },
    personal: { get: { query: harness.stateGet } },
    engagement: { list: { query: harness.engagementList } },
  },
  hydrateCoreFromApi: harness.hydrate,
  isConflict: () => false,
}));

import { AMS } from './data';
import { AppProviders, useAudit, useFirm } from './contexts';
import { DEFAULT_ENG_ID } from './persist_scope';

const ENG_A = DEFAULT_ENG_ID;
const ENG_B = 'ENG-STAGE0-B';
const ME = {
  id: 'USER-STAGE0', firmId: 'FIRM-WHR', name: 'Stage 0 User', initials: 'S0',
  email: 'stage0@test.local', role: 'Engagement Partner', totpEnabled: false,
};

let root;
let host;
let exposed;

function Probe() {
  exposed = { firm: useFirm(), audit: useAudit() };
  return null;
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

async function renderProvider() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(React.createElement(AppProviders, { me: ME, onLogout: () => {} }, React.createElement(Probe)));
    await settle();
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  localStorage.clear();
  harness.mutations.length = 0;
  harness.stateGet.mockReset();
  harness.stateGet.mockResolvedValue({ value: null, version: 0 });
  harness.engagementList.mockReset();
  harness.engagementList.mockResolvedValue([{ id: ENG_A }, { id: ENG_B }]);
  harness.hydrate.mockReset();
  harness.hydrate.mockResolvedValue(true);
  exposed = null;
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  if (host) host.remove();
  root = null;
  host = null;
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('Tahap 0 — reproduksi race perpindahan engagement', () => {
  it('edit engagement A tetap ditulis ke A ketika pengguna langsung pindah ke B', async () => {
    await renderProvider();

    act(() => exposed.audit.setAje([{ id: 'AJE-STAGE0-A', amount: 100 }]));
    act(() => exposed.firm.setActiveEngagementId(ENG_B));
    await act(async () => {
      await settle();
      vi.advanceTimersByTime(401);
      await settle();
    });

    const write = harness.mutations.find((input) => input.key === 'aje');
    expect(write).toMatchObject({ scope: 'engagement', scopeId: ENG_A, key: 'aje' });
  });

  /* Repro #2 (hidrasi kedaluwarsa menimpa WTB perikatan aktif) ada di `api.test.ts` →
     describe "R-2 — hidrasi kedaluwarsa tidak boleh menimpa perikatan yang sedang aktif".
     Lihat catatan di kepala berkas ini untuk alasan pemindahannya. */
});
