// @vitest-environment jsdom
// @ts-nocheck
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

  it('respons hidrasi A yang selesai setelah B tidak boleh mengganti data engagement B', async () => {
    const pending = new Map();
    harness.hydrate.mockImplementation((engagementId) => new Promise((resolve) => {
      pending.set(engagementId, () => {
        AMS.WTB = [{ code: engagementId, name: engagementId, ly: 0, unadj: 0, aje: 0, adj: 0 }];
        resolve(true);
      });
    }));
    await renderProvider();
    expect(pending.has(ENG_A)).toBe(true);

    act(() => exposed.firm.setActiveEngagementId(ENG_B));
    await act(async () => settle());
    expect(pending.has(ENG_B)).toBe(true);

    await act(async () => {
      pending.get(ENG_B)();
      await settle();
    });
    await act(async () => {
      pending.get(ENG_A)();
      await settle();
    });

    expect(AMS.WTB[0].code).toBe(ENG_B);
  });
});
