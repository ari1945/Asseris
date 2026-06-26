// W9 Fase 0 — connector registry read-model. The server is now the SSOT for connector
// definitions (Prisma `Connector`, seeded from the client blueprint). This module reads them
// back into a typed, client-safe shape — secrets (ConnectorToken.secretEnc) are NEVER part of
// this view. The job runner (Fase 1, sync.ts) and the tRPC `integration` router both read from
// here so there is one source of connector truth.
import { prisma } from '../db';
import { coretaxHttpConfigured } from './providers/httpCoretax';
import { bankHttpConfigured } from './providers/httpBank';

export type ConnectorStatus = 'connected' | 'available' | 'error';

// The display envelope persisted in Connector.metaJson — lossless copy of the prototype's
// card fields so the client read-model (data_import.js → read-model) reconstructs the exact UI.
export interface ConnectorMeta {
  desc: string | null;
  icon: string | null;
  expiry: string | null;
  uptime: number;
  latency: number;
  vol: number;
  last: string | null;
  webhooks: Array<[string, boolean]>;
  syncs: unknown[];
}

export interface ConnectorView {
  id: string;
  name: string;
  category: string;
  target: string; // owner module the data posts into (the SSOT)
  status: ConnectorStatus;
  auth: string | null;
  endpoint: string | null;
  schedule: string | null;
  scopes: string[];
  mapping: Array<[string, string]>;
  wired: boolean; // true once a real adapter drives this connector (Fase 1+)
  configured: boolean; // true bila adapter eksternal NYATA terpasang (env). false = mode demo/fixture.
  meta: ConnectorMeta;
}

/* Apakah konektor punya koneksi eksternal NYATA aktif (env adapter terpasang)? Hanya konektor
   ber-adapter (coretax/bank) yang bisa true; sisanya blueprint-only → selalu false (mode demo).
   `wired` BEDA: ia true setelah post pertama BAHKAN oleh fixture, jadi tak bisa membedakan
   demo vs nyata — `configured` itulah sinyal jujur untuk badge UI "Mode demo · belum tersambung". */
function connectorConfigured(id: string): boolean {
  if (id === 'coretax') return coretaxHttpConfigured();
  if (id === 'bank') return bankHttpConfigured();
  return false;
}

const DEFAULT_META: ConnectorMeta = {
  desc: null, icon: null, expiry: null, uptime: 0, latency: 0, vol: 0, last: null, webhooks: [], syncs: [],
};

function parse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

function toView(row: {
  id: string; name: string; category: string; target: string; status: string;
  auth: string | null; endpoint: string | null; schedule: string | null;
  scopesJson: string; mappingJson: string; metaJson: string; wired: boolean;
}): ConnectorView {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    target: row.target,
    status: row.status as ConnectorStatus,
    auth: row.auth,
    endpoint: row.endpoint,
    schedule: row.schedule,
    scopes: parse<string[]>(row.scopesJson, []),
    mapping: parse<Array<[string, string]>>(row.mappingJson, []),
    wired: row.wired,
    configured: connectorConfigured(row.id),
    meta: { ...DEFAULT_META, ...parse<Partial<ConnectorMeta>>(row.metaJson, {}) },
  };
}

/** All connectors, ordered by id — the client-safe registry view (no secrets). */
export async function listConnectors(): Promise<ConnectorView[]> {
  const rows = await prisma.connector.findMany({ orderBy: { id: 'asc' } });
  return rows.map(toView);
}

/** One connector by id, or null. */
export async function getConnector(id: string): Promise<ConnectorView | null> {
  const row = await prisma.connector.findUnique({ where: { id } });
  return row ? toView(row) : null;
}
