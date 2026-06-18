/* Loads the authentic in-app seed by importing the migration data graph under a
   minimal `window` stub — the same trick the W4 vitest setup uses. This guarantees
   the DB seed is byte-identical to data.js, so Fase 3 (canon reads WTB from the API)
   has zero numeric drift vs the W0 baseline. */

export interface AmsSeed {
  FIRM: Record<string, unknown> & { name: string; short: string };
  USER: Record<string, unknown> & { name: string; role: string };
  TEAM: Array<{ name: string; role: string; util?: number }>;
  CLIENTS: Array<Record<string, unknown> & { id: string; name: string }>;
  ENGAGEMENTS: Array<Record<string, unknown> & { id: string; clientId: string }>;
  // Runtime shape: { key, group, code, name, ly, unadj, aje, adj, lead }
  WTB: Array<Record<string, unknown> & { group: string; code: string; name: string }>;
}

export async function loadAmsSeed(): Promise<AmsSeed> {
  const g = globalThis as unknown as {
    window?: unknown;
    localStorage?: unknown;
  };
  g.window = g;
  if (!g.localStorage) {
    const store: Record<string, string> = {};
    g.localStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    };
  }

  // @ts-ignore — migration ESM data module is untyped JS (frozen-ish canonical source).
  await import('../../migration/src/data.js');

  return (g.window as { AMS: AmsSeed }).AMS;
}
