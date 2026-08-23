// @vitest-environment jsdom
/* ============================================================
   IDENTITAS FIRMA & KESETIAAN BENTUK KONTEKS.

   Cacat yang ditutup berkas ini: `view_firmtreasury.tsx` membaca nama firma dari
   `useFirm().firm.name`. FirmContext TIDAK PERNAH menerbitkan kunci `firm`, jadi
   nilainya selalu '' dan KETIGA tombol ekspor modul itu (Anggaran vs Aktual,
   "Ekspor rekening ini", "Seluruh rekening") berdiri permanen `disabled`.

   Mengapa tak ada yang melihatnya selama ini: harness ujinya me-mock
   `useFirm: () => ({ firm: { name } })` — BENTUK KONTEKS YANG DIKARANG. Uji
   "tombol ekspor hidup" karena itu hijau terhadap konteks yang tak pernah ada.

   Karena itu gerbangnya dua arah, dan KEDUANYA memakai kunci yang diambil dari
   nilai provider yang BENAR-BENAR DIRENDER (bukan daftar yang disalin tangan —
   daftar salinan akan basi persis seperti pembacanya):
     · SUMBER  — tak ada berkas sumber yang membaca kunci di luar yang diterbitkan;
     · MOCK    — tak ada berkas uji yang MENGARANG kunci konteks yang tak ada.
   ============================================================ */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { firmNameFrom } from './firm_identity';

const harness = vi.hoisted(() => ({
  hydrate: vi.fn(),
  stateGet: vi.fn(),
  engagementList: vi.fn(),
}));

vi.mock('./api', () => ({
  api: {
    state: {
      get: { query: harness.stateGet },
      set: { mutate: vi.fn(async (input: { baseVersion: number }) => ({ version: input.baseVersion + 1 })) },
    },
    personal: { get: { query: harness.stateGet } },
    engagement: { list: { query: harness.engagementList } },
  },
  hydrateCoreFromApi: harness.hydrate,
  isConflict: () => false,
}));

const { AppProviders, useAuth, useFirm } = await import('./contexts');

const ME = {
  id: 'USER-IDENT', firmId: 'FIRM-WHR', name: 'Penguji Identitas', initials: 'PI',
  email: 'ident@test.local', role: 'Engagement Partner', totpEnabled: false,
};

/* ------------------------------------------------------------------
   Nilai konteks NYATA — diambil dari provider yang dirender sungguhan.
   ------------------------------------------------------------------ */
type Ctx = Record<string, unknown>;
let realAuth: Ctx = {};
let realFirm: Ctx = {};
let host: HTMLDivElement | null = null;
let root: { render: (n: unknown) => void; unmount: () => void } | null = null;

function Probe(): null {
  realAuth = useAuth() as unknown as Ctx;
  realFirm = useFirm() as unknown as Ctx;
  return null;
}

beforeAll(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  harness.stateGet.mockResolvedValue({ value: null, version: 0 });
  harness.engagementList.mockResolvedValue([]);
  harness.hydrate.mockResolvedValue(true);
  host = document.createElement('div');
  document.body.appendChild(host);
  await act(async () => {
    root = createRoot(host as HTMLDivElement) as unknown as typeof root;
    (root as NonNullable<typeof root>).render(
      React.createElement(AppProviders as never, { me: ME, onLogout: () => {} } as never, React.createElement(Probe)),
    );
    await Promise.resolve();
    await Promise.resolve();
  });
});

afterAll(async () => {
  if (root) await act(async () => (root as NonNullable<typeof root>).unmount());
  host?.remove();
  host = null; root = null;
});

/* ------------------------------------------------------------------
   Pemindai: kunci apa yang dibaca sumber dari `useFirm()`/`useAuth()`.
   ------------------------------------------------------------------ */
const SRC = __dirname;
const strip = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Indeks penutup `}` untuk `{` di posisi `open`. */
function matchBrace(src: string, open: number): number {
  let d = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '{') d++;
    else if (c === '}') { d--; if (!d) return i; }
  }
  return -1;
}

/** Kunci TINGKAT ATAS saja — `{ firm?: { name?: string } }` → ['firm'], bukan 'name'. */
function topLevelKeys(body: string): string[] {
  const parts: string[] = [];
  let depth = 0; let seg = '';
  for (const ch of body) {
    if (ch === '{' || ch === '(' || ch === '[') depth++;
    else if (ch === '}' || ch === ')' || ch === ']') depth--;
    if ((ch === ',' || ch === ';') && depth === 0) { parts.push(seg); seg = ''; } else seg += ch;
  }
  parts.push(seg);
  return parts
    .map((p) => { const m = p.match(/^\s*([A-Za-z_$][\w$]*)\s*\??\s*[:=]?/); return m ? m[1] : ''; })
    .filter(Boolean);
}

interface Read { file: string; via: string; key: string }

/** Empat bentuk pembacaan yang dipakai repo ini terhadap `useFirm()`/`useAuth()`. */
function readsOf(hook: string, file: string, raw: string): Read[] {
  const src = strip(raw);
  const out: Read[] = [];
  const push = (via: string, key: string) => out.push({ file, via, key });

  /* (a) anotasi di titik panggil: `useFirm() as { k?: T }` */
  for (const m of src.matchAll(new RegExp(hook + '\\(\\)\\s+as\\s+(?:unknown\\s+as\\s+)?\\{', 'g'))) {
    const open = (m.index as number) + m[0].length - 1;
    const close = matchBrace(src, open);
    if (close > 0) for (const k of topLevelKeys(src.slice(open + 1, close))) push('anotasi', k);
  }
  /* (b) destrukturisasi: `const { a, b } = useFirm()` */
  for (const m of src.matchAll(/(?:const|let|var)\s*\{/g)) {
    const open = (m.index as number) + m[0].length - 1;
    const close = matchBrace(src, open);
    if (close < 0) continue;
    if (!new RegExp('^\\s*(?::[^=]*)?=\\s*\\(?\\s*' + hook + '\\(\\)').test(src.slice(close + 1, close + 60))) continue;
    for (const k of topLevelKeys(src.slice(open + 1, close))) push('destrukturisasi', k);
  }
  /* (c) akses langsung: `useFirm().x` · `(useFirm() as any).x` */
  for (const m of src.matchAll(new RegExp(hook + '\\(\\)(?:\\s+as\\s+[^)\\n;]+)?\\)?\\s*\\??\\.\\s*([A-Za-z_$][\\w$]*)', 'g'))) {
    push('akses langsung', m[1]);
  }
  /* (d) lewat alias: `const firm = useFirm()` … `firm.x`.

     Jendela baca dibatasi sampai identifier yang sama DIDEKLARASIKAN ULANG.
     Tanpa batas itu, `const auth = stepAuthority(...)` di bagian bawah
     `view_aje.tsx` terbaca sebagai kelanjutan alias `useAuth()` di atasnya, dan
     gerbang ini melaporkan `.ok`/`.reason` sebagai kunci konteks karangan —
     gerbang berisik adalah gerbang yang cepat dilemahkan. */
  const declRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]*)?=\s*([^\n;]*)/g;
  const decls: { name: string; at: number; fromHook: boolean }[] = [];
  for (const m of src.matchAll(declRe)) {
    decls.push({
      name: m[1],
      at: (m.index as number) + m[0].length,
      fromHook: new RegExp('^\\(?\\s*' + hook + '\\(\\)').test(m[2].trim()),
    });
  }
  for (let i = 0; i < decls.length; i++) {
    const d = decls[i];
    if (!d.fromHook) continue;
    const next = decls.slice(i + 1).find((x) => x.name === d.name);
    const window = src.slice(d.at, next ? next.at : src.length);
    for (const m of window.matchAll(new RegExp('(?<![\\w$.])' + d.name + '\\s*\\??\\.\\s*([A-Za-z_$][\\w$]*)', 'g'))) {
      push('alias ' + d.name, m[1]);
    }
  }
  return out;
}

const SELF = 'firm_identity.test.ts';
const sourceFiles = () => readdirSync(SRC).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
const testFiles = () => readdirSync(SRC).filter((f) => /\.test\.tsx?$/.test(f) && f !== SELF);

/* ==================================================================
   FI-1 — pembacaan sumber tak boleh melampaui kunci yang diterbitkan
   ================================================================== */

describe('FI-1 — konteks dibaca pada kunci yang benar-benar diterbitkan', () => {
  it('nilai provider yang dirender memang tidak punya kunci `firm` di FirmContext', () => {
    /* Karakterisasi: inilah fakta yang membuat pembacaan lama mustahil berhasil. */
    expect(Object.keys(realFirm).length).toBeGreaterThan(0);
    expect(Object.keys(realFirm)).not.toContain('firm');
    expect(Object.keys(realAuth)).toContain('firm');
  });

  it('tak ada berkas sumber yang membaca kunci di luar nilai FirmContext / AuthContext', () => {
    const legal: Record<string, Set<string>> = {
      useFirm: new Set(Object.keys(realFirm)),
      useAuth: new Set(Object.keys(realAuth)),
    };
    const offenders: string[] = [];
    for (const f of sourceFiles()) {
      const raw = readFileSync(join(SRC, f), 'utf8');
      for (const hook of ['useFirm', 'useAuth']) {
        for (const r of readsOf(hook, f, raw)) {
          if (!legal[hook].has(r.key)) offenders.push(`${f}: ${hook}() → .${r.key} (${r.via})`);
        }
      }
    }
    expect(offenders, 'kunci konteks yang tak pernah diterbitkan dibaca sebagai kalau ada').toEqual([]);
  });
});

/* ==================================================================
   FI-2 — mock uji tak boleh MENGARANG bentuk konteks
   ================================================================== */

describe('FI-2 — harness uji setia pada bentuk konteks yang nyata', () => {
  it('tak ada mock `useFirm`/`useAuth` yang mengembalikan kunci karangan', () => {
    const legal: Record<string, Set<string>> = {
      useFirm: new Set(Object.keys(realFirm)),
      useAuth: new Set(Object.keys(realAuth)),
    };
    const offenders: string[] = [];
    for (const f of testFiles()) {
      const src = strip(readFileSync(join(SRC, f), 'utf8'));
      for (const m of src.matchAll(/\b(useFirm|useAuth)\s*:\s*\(\s*\)\s*=>\s*\(?\s*\{/g)) {
        const open = (m.index as number) + m[0].length - 1;
        const close = matchBrace(src, open);
        if (close < 0) continue;
        for (const k of topLevelKeys(src.slice(open + 1, close))) {
          if (!legal[m[1]].has(k)) offenders.push(`${f}: mock ${m[1]}() menerbitkan .${k}`);
        }
      }
    }
    expect(offenders, 'mock mengarang kunci konteks — uji jadi hijau atas bentuk yang tak ada di produksi').toEqual([]);
  });

  it('pemindai mock benar-benar MELIHAT mock yang ada (bukan lolos karena nol temuan)', () => {
    /* Tanpa ini, gerbang di atas bisa hijau semata-mata karena regexnya tak
       pernah cocok dengan apa pun — cara paling halus untuk lolos vakum. */
    let seen = 0;
    for (const f of testFiles()) {
      const src = strip(readFileSync(join(SRC, f), 'utf8'));
      for (const m of src.matchAll(/\b(useFirm|useAuth)\s*:\s*\(\s*\)\s*=>\s*\(?\s*\{/g)) {
        const close = matchBrace(src, (m.index as number) + m[0].length - 1);
        if (close > 0) seen++;
      }
    }
    expect(seen, 'pemindai mock tak menemukan satu pun mock konteks di suite').toBeGreaterThanOrEqual(4);
  });
});

/* ==================================================================
   FI-3 — ekstraksi nama firma terhadap nilai konteks yang NYATA
   ================================================================== */

describe('FI-3 — nama firma diambil dari sumber yang memang berisi', () => {
  it('nilai AuthContext yang nyata menghasilkan nama firma tak kosong', () => {
    const nama = firmNameFrom(realAuth as never);
    expect(nama.length, 'AuthContext tak menyebut nama firma — ekspor mustahil disegel').toBeGreaterThan(0);
    expect(nama).toBe(String((realAuth.firm as { name?: string }).name));
  });

  it('nilai FirmContext yang nyata TIDAK pernah bisa menghasilkan nama — itu pembacaan yang lama', () => {
    expect(firmNameFrom(realFirm as never)).toBe('');
  });

  it("'' dikembalikan apa adanya — tidak ada literal yang diarang sebagai pengganti", () => {
    expect(firmNameFrom(null)).toBe('');
    expect(firmNameFrom({ firm: null })).toBe('');
    expect(firmNameFrom({ firm: { name: '   ' } })).toBe('');
    expect(firmNameFrom({ firm: { name: '  KAP Uji  ' } })).toBe('KAP Uji');
  });
});
