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
  const mod = (await import('../../migration/src/data.js')) as { AMS?: AmsSeed };
  // Window-strip slice 10z dropped data.js's `window.AMS = …` side-effect (it is now a pure
  // `export const AMS`). Prefer the ESM export; keep the window stub populated so downstream
  // window.AMS readers under the same stub (e.g. data_import.js in loadConnectorSeed) still work.
  const ams = (mod.AMS ?? (g.window as { AMS?: AmsSeed }).AMS) as AmsSeed;
  (g.window as { AMS?: AmsSeed }).AMS = ams;
  return ams;
}

// W9 — the connector blueprint the prototype simulated (window.IMPORT.CONNECTORS in
// migration/src/data_import.js). connectorsSeed() returns the raw definition array WITHOUT
// touching feedCounts/jobs, so it loads cleanly under the same window stub. We seed the server
// Connector table from this so the SSOT is byte-faithful to what the UI already showed.
export interface ConnectorSeed {
  id: string;
  name: string;
  cat: string;
  target: string;
  desc?: string;
  status: string;
  icon?: string;
  schedule?: string;
  endpoint?: string;
  auth?: string;
  expiry?: string;
  uptime?: number;
  latency?: number;
  vol?: number;
  last?: string;
  scopes?: string[];
  mapping?: Array<[string, string]>;
  webhooks?: Array<[string, boolean]>;
  syncs?: unknown[];
}

export async function loadConnectorSeed(): Promise<ConnectorSeed[]> {
  await loadAmsSeed(); // ensures the window stub + window.AMS (data_import.js reads window.AMS)
  // @ts-ignore — migration ESM import-blueprint module is untyped JS.
  const mod = (await import('../../migration/src/data_import.js')) as { IMPORT?: { connectorsSeed: () => ConnectorSeed[] } };
  const g = globalThis as unknown as { window: { IMPORT?: { connectorsSeed: () => ConnectorSeed[] } } };
  // Window-strip dropped data_import.js's `window.IMPORT = …` (ESM `export { IMPORT }` now);
  // prefer the export, fall back to the window stub for safety. Same fix as loadAmsSeed above.
  const IMPORT = mod.IMPORT ?? g.window.IMPORT;
  return IMPORT?.connectorsSeed() ?? [];
}
