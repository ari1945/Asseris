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

/*
 * `id` di view ini adalah `Connector.key` — identitas STABIL yang dilihat klien ('bank',
 * 'coretax'), bukan primary key baris DB. Itu disengaja: klien sudah meng-kunci seluruh
 * read-model-nya pada nilai ini (migration/src/data_import.ts) dan mengirimkannya kembali
 * sebagai `connectorId` di tRPC. D2 menambahkan surrogate id per-firma di DB TANPA menyentuh
 * kontrak kawat itu; id baris hanya dipakai internal (FK SyncJob/ConnectorToken) dan
 * dipaparkan lewat ConnectorRecord, bukan lewat view yang dikirim ke browser.
 */
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

interface ConnectorRow {
  id: string; firmId: string; key: string;
  name: string; category: string; target: string; status: string;
  auth: string | null; endpoint: string | null; schedule: string | null;
  scopesJson: string; mappingJson: string; metaJson: string; wired: boolean;
}

/** View klien + identitas baris DB. Dipakai job runner (sync.ts), TIDAK dikirim ke browser. */
export interface ConnectorRecord {
  view: ConnectorView;
  /** primary key baris — target FK SyncJob.connectorId / ConnectorToken.connectorId */
  rowId: string;
  firmId: string;
}

function toView(row: ConnectorRow): ConnectorView {
  return {
    id: row.key,
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
    configured: connectorConfigured(row.key),
    meta: { ...DEFAULT_META, ...parse<Partial<ConnectorMeta>>(row.metaJson, {}) },
  };
}

/** Konektor MILIK satu firma, terurut key — view klien-aman (tanpa rahasia, tanpa id baris). */
export async function listConnectors(firmId: string): Promise<ConnectorView[]> {
  const rows = await prisma.connector.findMany({ where: { firmId }, orderBy: { key: 'asc' } });
  return rows.map(toView);
}

/** Satu konektor milik firma ini, dicari lewat key kliennya. Null bila firma tak memilikinya. */
export async function getConnector(firmId: string, key: string): Promise<ConnectorView | null> {
  const rec = await getConnectorRecord(firmId, key);
  return rec ? rec.view : null;
}

/** Seperti getConnector, plus id baris DB — untuk penulis yang butuh FK (job runner). */
export async function getConnectorRecord(firmId: string, key: string): Promise<ConnectorRecord | null> {
  const row = await prisma.connector.findUnique({ where: { firmId_key: { firmId, key } } });
  return row ? { view: toView(row), rowId: row.id, firmId: row.firmId } : null;
}

/**
 * Menyelesaikan konektor HANYA dari key-nya, untuk pemanggil tanpa sesi (webhook provider:
 * autentikasinya HMAC, bukan cookie, jadi tak ada firma pada konteksnya).
 *
 * Fail-closed dan sengaja tidak menebak: nol kecocokan → null; LEBIH DARI SATU firma memiliki key
 * itu → melempar. Model deploy hari ini satu firma per instance sehingga jalur >1 tak tercapai di
 * produksi; ketika suatu saat satu instance melayani banyak firma, payload webhook harus membawa
 * identitas firma dan kegagalan di sini adalah yang memaksa perubahan itu dibuat sadar — bukan
 * diam-diam menyinkronkan data provider ke firma yang salah.
 */
export async function resolveSoleConnectorByKey(key: string): Promise<ConnectorRecord | null> {
  const rows = await prisma.connector.findMany({ where: { key }, take: 2, orderBy: { firmId: 'asc' } });
  if (rows.length === 0) return null;
  if (rows.length > 1) {
    throw new Error(
      `connector-ambiguous:${key} — lebih dari satu firma memiliki konektor ini; ` +
        'webhook tanpa identitas firma tak dapat memilih salah satunya.',
    );
  }
  return { view: toView(rows[0]), rowId: rows[0].id, firmId: rows[0].firmId };
}
