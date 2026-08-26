// @vitest-environment jsdom
/* ============================================================
   SJAH 3400 · 3402 · 3410 · 3420 — isolasi kertas kerja per-perikatan (W7.5)
   ------------------------------------------------------------
   CACAT YANG DIPAKU. Keempat modul asurans menyimpan status PELAKSANAAN
   prosedur (kotak centang "prosedur ini sudah dikerjakan") lewat
   `window.useAmsPersist('<mod>.exec', {})`. Tak satu pun dari keempat kunci
   terdaftar di `AMS_PERSIST_SCOPE`, dan tak satu pun cocok dengan
   `PR4_ENGAGEMENT_KEY_RE` — jadi resolver di `contexts.tsx` menjatuhkannya ke
   default `'firm'`. Akibatnya SATU dokumen dipakai SELURUH perikatan: centang
   yang dibuat tim pada perikatan klien A muncul sebagai pekerjaan yang sudah
   dilakukan pada perikatan klien B. Itu bukan sekadar kebocoran privasi —
   ia menyatakan prosedur asurans telah dilaksanakan pada perikatan yang tak
   pernah menyentuhnya.

   BENTUK UJI. Ini uji PERILAKU, bukan uji keberadaan simbol: ia tak pernah
   menyebut `AMS_PERSIST_SCOPE`. Yang dipaku adalah apa yang DILIHAT modul
   setelah pengguna berpindah perikatan — tulis di A → pindah ke B → B wajib
   kosong → kembali ke A → isian A wajib utuh.

   DUA PERIKATAN, KEDUANYA BUKAN BAWAAN. `useAmsPersist` jatuh ke
   `DEFAULT_ENG_ID` ketika tak ada perikatan aktif; memakai ENG-2025-014 sebagai
   salah satu sisi karena itu TIDAK dapat membedakan "berlingkup perikatan" dari
   "kebetulan alamatnya sama". Uji ini memaksa keduanya ≠ bawaan dan menegaskannya
   lewat assertion, bukan lewat komentar.

   HARNESS. Bentuk mock `./api` disalin dari `stage0_context_races_repro.test.ts`:
   transport tRPC yang di-mock, `contexts.tsx` yang NYATA. `state.get` selalu
   `version: 0` sehingga tak ada nilai server yang menutupi jalur cache — yang
   diuji murni alamat tulis/baca klien.
   ============================================================ */
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
  isRejected: () => false,
  rejectionMessage: () => '',
}));

import { AppProviders, useFirm } from './contexts';
import { DEFAULT_ENG_ID, FIRM_SCOPE_ID, persistCacheKey } from './persist_scope';

/* Nilai uji SENGAJA berbeda per kunci: kalau satu kunci tertukar dengan kunci
   lain, "sama-sama terisi" tak boleh lolos sebagai benar. */
const SJAH = [
  { key: 'pfi3400.exec', modul: 'sjah3400', tanda: { 'PFI-1': true } },
  { key: 'soc3402.exec', modul: 'sjah3402', tanda: { 'SOC-2': true } },
  { key: 'ghg3410.exec', modul: 'sjah3410', tanda: { 'GHG-3': true } },
  { key: 'pf3420.exec', modul: 'sjah3420', tanda: { 'PF-4': true } },
];

const ENG_A = 'ENG-2025-031'; // PT ... — bukan perikatan bawaan
const ENG_B = 'ENG-2025-063'; // klien LAIN — bukan perikatan bawaan

const ME = {
  id: 'USER-SJAH', firmId: 'FIRM-WHR', name: 'SJAH Probe', initials: 'SJ',
  email: 'sjah@test.local', role: 'Engagement Partner', totpEnabled: false,
};

let root;
let host;
let firmApi;
const probe = {};

/* Satu probe per kunci — hook dipanggil di komponennya sendiri agar urutan hook
   tetap tetap (tak ada hook di dalam loop). Memakai `window.useAmsPersist`,
   PERSIS situs panggil yang dipakai keempat view SJAH. */
function KeyProbe({ pkey }) {
  const [val, setVal] = window.useAmsPersist(pkey, {});
  probe[pkey] = { val, setVal };
  return null;
}

function Probe() {
  firmApi = useFirm();
  return React.createElement(
    React.Fragment,
    null,
    SJAH.map((s) => React.createElement(KeyProbe, { key: s.key, pkey: s.key })),
  );
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

/** Jalankan efek + lewati debounce 400 ms `useServerState`, lalu biarkan mengendap. */
async function flush() {
  await act(async () => {
    await settle();
    vi.advanceTimersByTime(401);
    await settle();
  });
}

async function renderProvider() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(React.createElement(AppProviders, { me: ME, onLogout: () => {} }, React.createElement(Probe)));
    await settle();
  });
  await flush();
}

/** Isi keempat kertas kerja seolah tim mengerjakannya pada perikatan aktif. */
async function centangSemua() {
  act(() => SJAH.forEach((s) => probe[s.key].setVal(s.tanda)));
  await flush();
}

async function pindahKe(engId) {
  act(() => firmApi.setActiveEngagementId(engId));
  await flush();
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
  firmApi = null;
  SJAH.forEach((s) => delete probe[s.key]);
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  if (host) host.remove();
  root = null;
  host = null;
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('SJAH — prasyarat harness', () => {
  it('kedua perikatan uji BUKAN perikatan bawaan', () => {
    expect(ENG_A).not.toBe(DEFAULT_ENG_ID);
    expect(ENG_B).not.toBe(DEFAULT_ENG_ID);
    expect(ENG_A).not.toBe(ENG_B);
  });

  it('view SJAH memanggil hook yang sama dengan yang diuji di sini', async () => {
    /* Keempat view memakai `window.useAmsPersist`, bukan impor ESM. Assertion ini
       menutup celah "uji menguji fungsi lain yang kebetulan bernama sama". */
    const { useAmsPersist } = await import('./contexts');
    expect(window.useAmsPersist).toBe(useAmsPersist);
  });

  it('perikatan aktif berpindah ke perikatan uji, bukan bertahan di bawaan', async () => {
    await renderProvider();
    expect(firmApi.activeEngagementId).toBe(ENG_A);
  });
});

describe('SJAH — kertas kerja pelaksanaan TERISOLASI per perikatan (W7.5)', () => {
  it('centang pada perikatan A TIDAK muncul pada perikatan B', async () => {
    await renderProvider();
    expect(firmApi.activeEngagementId).toBe(ENG_A);

    await centangSemua();
    SJAH.forEach((s) => expect(probe[s.key].val, `${s.modul} gagal menyimpan di A`).toEqual(s.tanda));

    await pindahKe(ENG_B);

    SJAH.forEach((s) => {
      expect(
        probe[s.key].val,
        `${s.modul} (${s.key}): pekerjaan perikatan ${ENG_A} terbaca di perikatan ${ENG_B}`,
      ).toEqual({});
    });
  });

  it('kembali ke perikatan A memulihkan isiannya — isolasi, bukan amnesia', async () => {
    await renderProvider();
    await centangSemua();
    await pindahKe(ENG_B);
    await pindahKe(ENG_A);

    SJAH.forEach((s) => {
      expect(probe[s.key].val, `${s.modul}: isian perikatan ${ENG_A} hilang setelah pulang`).toEqual(s.tanda);
    });
  });

  it('centang di B tinggal di B — dua perikatan, dua dokumen', async () => {
    await renderProvider();
    await centangSemua();
    await pindahKe(ENG_B);

    const tandaB = { 'B-ONLY': true };
    act(() => SJAH.forEach((s) => probe[s.key].setVal(tandaB)));
    await flush();

    await pindahKe(ENG_A);
    SJAH.forEach((s) => {
      expect(probe[s.key].val, `${s.modul}: isian perikatan ${ENG_B} menimpa perikatan ${ENG_A}`).toEqual(s.tanda);
    });
  });

  it('tulisan mendarat di dokumen PERIKATAN, bukan dokumen FIRMA', async () => {
    await renderProvider();
    await centangSemua();

    SJAH.forEach((s) => {
      const tulisan = harness.mutations.filter((m) => m.key === s.key);
      expect(tulisan.length, `${s.modul}: tak ada tulisan ke server untuk ${s.key}`).toBeGreaterThan(0);
      tulisan.forEach((m) => {
        expect(m.scope, `${s.modul}: ${s.key} ditulis ke lingkup ${m.scope}`).toBe('engagement');
        expect(m.scopeId, `${s.modul}: ${s.key} ditulis ke ${m.scopeId}`).toBe(ENG_A);
      });
    });
  });

  it('cache lokal beralamat perikatan — tak ada dokumen firma yang tertinggal', async () => {
    await renderProvider();
    await centangSemua();

    SJAH.forEach((s) => {
      expect(
        localStorage.getItem(persistCacheKey('engagement', ENG_A, s.key)),
        `${s.modul}: cache perikatan ${ENG_A} kosong`,
      ).toBe(JSON.stringify(s.tanda));
      expect(
        localStorage.getItem(persistCacheKey('firm', FIRM_SCOPE_ID, s.key)),
        `${s.modul}: masih menulis dokumen FIRMA ${s.key}`,
      ).toBeNull();
    });
  });
});
