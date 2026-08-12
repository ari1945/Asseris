/* ============================================================
   P1 — client transport logic (api.ts).
   ------------------------------------------------------------
   api.ts is the browser's only seam to the server. Its value lives in three
   behaviours that have no other safety net:
     (1) graceful degradation — every read swallows network errors and returns
         null so the UI falls back (server-down must never white-screen);
     (2) which calls DON'T swallow — exportSeal/integrationSync must throw so the
         caller can degrade-to-unsealed / toast a real failure;
     (3) defence-in-depth redaction — llmNarrateDiagnostics re-projects findings
         onto the allow-list before they leave the building (the W8 confidentiality
         boundary; the server re-redacts, but the client must not widen it).
   We mock @trpc/client with a recursive proxy so we can force resolve/reject and
   capture exactly what each call sends. No real network, fully deterministic.
   ============================================================ */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Controllable fake tRPC client. `behavior` flips every .query/.mutate between
// resolve (→ resolveValue, or resolveValue(arg) when it's a fn) and reject.
const trpc = vi.hoisted(() => ({
  behavior: 'resolve' as 'resolve' | 'reject',
  resolveValue: undefined as unknown,
  rejectError: undefined as unknown,
  calls: [] as Array<{ path: string; kind: string; arg: unknown }>,
}));

vi.mock('@trpc/client', () => {
  const node = (path: string): unknown =>
    new Proxy(function () {}, {
      get(_t, prop) {
        const key = String(prop);
        if (key === 'query' || key === 'mutate') {
          return async (arg: unknown) => {
            trpc.calls.push({ path, kind: key, arg });
            if (trpc.behavior === 'reject') throw trpc.rejectError ?? new Error('network down');
            return typeof trpc.resolveValue === 'function'
              ? (trpc.resolveValue as (a: unknown) => unknown)(arg)
              : trpc.resolveValue;
          };
        }
        return node(path ? path + '.' + key : key);
      },
    });
  return { createTRPCClient: () => node(''), httpBatchLink: () => ({}) };
});

const api = await import('./api');
const { AMS } = await import('./data');

type Narration = { task: string; findings: Array<Record<string, unknown>> };

beforeEach(() => {
  trpc.behavior = 'resolve';
  trpc.resolveValue = undefined;
  trpc.rejectError = undefined;
  trpc.calls = [];
});

describe('isConflict() — optimistic-concurrency (CAS 409) detection', () => {
  it('true when error code is CONFLICT (data or shape.data)', () => {
    expect(api.isConflict({ data: { code: 'CONFLICT' } })).toBe(true);
    expect(api.isConflict({ shape: { data: { code: 'CONFLICT' } } })).toBe(true);
  });
  it('true when httpStatus is 409 (data or shape.data)', () => {
    expect(api.isConflict({ data: { httpStatus: 409 } })).toBe(true);
    expect(api.isConflict({ shape: { data: { httpStatus: 409 } } })).toBe(true);
  });
  it('false for non-conflict errors and falsy input', () => {
    expect(api.isConflict({ data: { code: 'FORBIDDEN', httpStatus: 403 } })).toBe(false);
    expect(api.isConflict(null)).toBe(false);
    expect(api.isConflict(undefined)).toBe(false);
    expect(api.isConflict({})).toBe(false);
  });
});

describe('graceful degradation — reads return null/fallback when the server throws', () => {
  beforeEach(() => { trpc.behavior = 'reject'; });

  it('llmStatus falls back to deterministic-only (not-configured)', async () => {
    expect(await api.llmStatus()).toEqual({ configured: false, canUse: false, provider: null, model: null });
  });
  it('audit reads return null', async () => {
    expect(await api.auditList()).toBeNull();
    expect(await api.auditVerify()).toBeNull();
  });
  it('integration reads return null', async () => {
    expect(await api.integrationStatus()).toBeNull();
    expect(await api.integrationList()).toBeNull();
    expect(await api.integrationJobs('c1')).toBeNull();
    expect(await api.integrationReconcile()).toBeNull();
  });
  it('export verify/log swallow → null', async () => {
    expect(await api.exportVerifySeal({ sealId: 's', contentHash: 'h' })).toBeNull();
    expect(await api.exportLogEvent({ kind: 'k', format: 'pdf' })).toBeNull();
  });
});

describe('reads pass through the server result when available', () => {
  it('llmStatus returns the server payload verbatim', async () => {
    trpc.resolveValue = { configured: true, canUse: true, provider: 'anthropic', model: 'claude' };
    expect(await api.llmStatus()).toEqual({ configured: true, canUse: true, provider: 'anthropic', model: 'claude' });
  });
  it('integrationJobs forwards a connectorId filter only when given', async () => {
    trpc.resolveValue = (arg: unknown) => ({ echoed: arg });
    await api.integrationJobs('bank');
    await api.integrationJobs();
    const jobCalls = trpc.calls.filter(c => c.path === 'integration.jobs');
    expect(jobCalls[0].arg).toEqual({ connectorId: 'bank' });
    expect(jobCalls[1].arg).toBeUndefined();
  });
});

describe('non-swallowing writes — must throw so the caller can react', () => {
  it('exportSeal propagates (caller degrades to UNSEALED)', async () => {
    trpc.behavior = 'reject';
    await expect(api.exportSeal({ kind: 'k', contentHash: 'h' })).rejects.toThrow();
  });
  it('integrationSync propagates (caller toasts a real failure)', async () => {
    trpc.behavior = 'reject';
    await expect(api.integrationSync('bank')).rejects.toThrow();
  });
});

describe('LLM preview/consent client — defence-in-depth projection before egress', () => {
  it('slims each finding to the allow-list and drops everything else', async () => {
    trpc.resolveValue = (arg: unknown) => arg; // echo what the client decided to send
    const sent = (await api.llmPreviewDiagnostics([
      {
        id: 7,
        detector: 'benford',
        sev: 'high',
        std: 'SA 240',
        title: 'Lonjakan digit',
        detail: 'rincian',
        suggestedProcedure: 'uji',
        // forbidden context that must NOT leave the building:
        clientName: 'PT Rahasia',
        npwp: '01.234.567.8-999.000',
        wtbRows: [{ code: '1-1200', adj: 9 }],
        rawAmount: 123456789,
      },
    ])) as Narration;
    expect(sent.task).toBe('narrate-diagnostics');
    const f = sent.findings[0];
    expect(Object.keys(f).sort()).toEqual(['detail', 'detector', 'id', 'sev', 'std', 'suggestedProcedure', 'title']);
    expect(f).not.toHaveProperty('clientName');
    expect(f).not.toHaveProperty('npwp');
    expect(f).not.toHaveProperty('wtbRows');
    expect(f.id).toBe('7'); // coerced to string
  });

  it('coerces an illegal severity to low and tolerates missing optionals', async () => {
    trpc.resolveValue = (arg: unknown) => arg;
    const sent = (await api.llmPreviewDiagnostics([
      { id: 'a', title: 'x', sev: 'CRITICAL' }, // not in {high,med,low}
      { title: 'y' },                            // no id, no sev
    ])) as Narration;
    expect(sent.findings[0].sev).toBe('low');
    expect(sent.findings[1].sev).toBe('low');
    expect(sent.findings[1].id).toBe('');
    expect(sent.findings[0].detail).toBeUndefined();
  });

  it('handles a null/empty finding list without throwing', async () => {
    trpc.resolveValue = (arg: unknown) => arg;
    const sent = (await api.llmPreviewDiagnostics(null)) as Narration;
    expect(sent.findings).toEqual([]);
  });

  it('sends explicit consent and its one-use receipt only on completion', async () => {
    trpc.resolveValue = (arg: unknown) => arg;
    const sent = await api.llmNarrateDiagnostics([{ id: 'f1', title: 'x', sev: 'low' }], 'receipt-1234567890');
    expect(sent).toMatchObject({ task: 'narrate-diagnostics', consent: true, consentId: 'receipt-1234567890' });
  });
});

/* ============================================================
   PR-I — hidrasi bundle perikatan: larik KOSONG harus mengosongkan.

   Penjaga lama `Array.isArray(b.wtb) && b.wtb.length` membuat perikatan yang
   belum mengimpor neraca saldo tidak menimpa apa pun, sehingga `AMS.WTB`
   MEMPERTAHANKAN neraca saldo perikatan yang dibuka sebelumnya. Terbukti di
   layar sebelum perbaikan: ENG-2025-040 (PT Mandiri Sejahtera Finance,
   multifinance) menampilkan bagan akun PT Sentosa Makmur — lengkap dengan
   Beban Pokok Penjualan dan persediaan.

   Satu klien menampilkan buku besar klien lain adalah kegagalan kerahasiaan
   sekaligus integritas, bukan sekadar angka salah.
   ============================================================ */
describe('PR-I — hidrasi WTB: bundle tanpa baris mengosongkan singleton', () => {
  const ROW = { ord: 0, group: 'Aset Lancar', code: '1-1100', name: 'Kas', ly: 1, unadj: 2, aje: 0, lead: 'A' };

  it('bundle berisi baris → AMS.WTB terisi dari bundle', async () => {
    trpc.resolveValue = { wtb: [ROW] };
    await api.hydrateCoreFromApi('ENG-A');
    expect(AMS.WTB).toHaveLength(1);
    expect(AMS.WTB[0].code).toBe('1-1100');
  });

  it('bundle perikatan BERIKUTNYA tanpa baris → singleton DIKOSONGKAN, bukan dibiarkan', async () => {
    trpc.resolveValue = { wtb: [ROW] };
    await api.hydrateCoreFromApi('ENG-A');
    expect(AMS.WTB.length).toBeGreaterThan(0);
    trpc.resolveValue = { wtb: [] };
    await api.hydrateCoreFromApi('ENG-B');
    expect(AMS.WTB).toEqual([]);          // BUKAN neraca saldo klien sebelumnya
  });

  it('bundle tanpa field wtb sama sekali tidak menyentuh singleton (absen ≠ kosong)', async () => {
    trpc.resolveValue = { wtb: [ROW] };
    await api.hydrateCoreFromApi('ENG-A');
    trpc.resolveValue = {};
    await api.hydrateCoreFromApi('ENG-C');
    expect(AMS.WTB).toHaveLength(1);
  });
});

/* ============================================================
   R-2 (Tahap 0 repro #2) — HIDRASI YANG TUMPANG-TINDIH: LAST-REQUEST-WINS.

   Asalnya uji ini hidup di `stage0_context_races_repro.test.ts`, tetapi di sana
   `hydrateCoreFromApi` DI-MOCK — padahal fungsi itulah yang memiliki penjaganya.
   Mock-nya memutasi `AMS.WTB` tanpa syarat, jadi properti yang diuji dilanggar oleh
   konstruksi harness-nya sendiri dan tak ada perbaikan di `contexts.tsx` yang bisa
   membuatnya hijau. Di sini seam-nya benar: transport tRPC yang di-mock, dan
   `hydrateCoreFromApi` yang NYATA yang dieksekusi — sehingga uji ini merah tanpa
   penjaga tiket di api.ts dan hijau dengannya.

   Skenario nyatanya: auditor membuka perikatan A, lalu berpindah ke B sebelum bundle A
   tiba. Tanpa penjaga, respons A yang datang belakangan menimpa neraca saldo B.
   ============================================================ */
describe('R-2 — hidrasi kedaluwarsa tidak boleh menimpa perikatan yang sedang aktif', () => {
  const rowFor = (code: string) => ({ ord: 0, group: 'Aset Lancar', code, name: 'Kas', ly: 1, unadj: 2, aje: 0, lead: 'A' });

  it('respons perikatan A yang tiba SETELAH B tidak mengganti WTB milik B', async () => {
    const release = new Map<string, () => void>();
    // Tiap panggilan bootstrap menggantung sampai dilepas manual → kita kendalikan urutannya.
    trpc.resolveValue = (arg: unknown) => {
      const id = String((arg as { engagementId?: string }).engagementId);
      return new Promise((resolve) => release.set(id, () => resolve({ wtb: [rowFor(id)] })));
    };

    const hydrA = api.hydrateCoreFromApi('ENG-A');   // dimulai lebih dulu…
    const hydrB = api.hydrateCoreFromApi('ENG-B');   // …lalu pengguna pindah ke B

    release.get('ENG-B')!();                          // B tiba duluan
    await expect(hydrB).resolves.toBe(true);
    expect(AMS.WTB[0].code).toBe('ENG-B');

    release.get('ENG-A')!();                          // A tiba TERLAMBAT
    await expect(hydrA).resolves.toBe(false);         // dibuang, bukan diterapkan
    expect(AMS.WTB[0].code).toBe('ENG-B');            // BUKAN neraca saldo klien sebelumnya
  });

  it('hidrasi berurutan (tanpa tumpang-tindih) tetap diterapkan seperti biasa', async () => {
    trpc.resolveValue = (arg: unknown) => ({ wtb: [rowFor(String((arg as { engagementId?: string }).engagementId))] });
    await api.hydrateCoreFromApi('ENG-A');
    expect(AMS.WTB[0].code).toBe('ENG-A');
    await api.hydrateCoreFromApi('ENG-B');
    expect(AMS.WTB[0].code).toBe('ENG-B');            // penjaga tidak boleh memblokir jalur normal
  });
});
