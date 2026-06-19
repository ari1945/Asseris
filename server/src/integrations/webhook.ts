// W9 Fase 2 — inbound webhook receiver. Providers (bank/coretax/…) POST events here without a
// session, so the endpoint is publicProcedure authenticated by an HMAC-SHA256 signature over the
// canonical body (shared secret in env). With no secret configured it reports `not-configured`
// (graceful, like the LLM proxy); a missing/wrong signature is UNAUTHORIZED. A recognized
// sync-triggering event runs the same runner the manual sync uses, so the control-total gate,
// idempotency, SSOT post and audit all apply identically — a webhook is just another trigger.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { runBankSync, type SyncSummary } from './sync';

export function webhookSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const s = (env.INTEGRATION_WEBHOOK_SECRET ?? '').trim();
  return s || null;
}

/** Canonical bytes that get signed — fixed key order so signer and verifier always agree. */
export function canonicalBody(p: { connectorId: string; event: string; payload?: unknown }): string {
  return JSON.stringify({ connectorId: p.connectorId, event: p.event, payload: p.payload ?? null });
}

export function signWebhook(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

export function verifyWebhook(secret: string, body: string, signature: string): boolean {
  const expected = Buffer.from(signWebhook(secret, body), 'utf8');
  const got = Buffer.from(signature, 'utf8');
  return expected.length === got.length && timingSafeEqual(expected, got);
}

// Which provider events trigger a sync. Other events are acknowledged but take no action.
const SYNC_EVENTS: Record<string, string[]> = {
  bank: ['transaction.posted'],
};

export type WebhookInput = { connectorId: string; event: string; payload?: unknown; signature?: string };
export type WebhookResult =
  | { status: 'not-configured' }
  | { status: 'ok'; synced: boolean; job?: SyncSummary };

export async function handleWebhook(input: WebhookInput): Promise<WebhookResult> {
  const secret = webhookSecret();
  if (!secret) return { status: 'not-configured' };
  if (!input.signature || !verifyWebhook(secret, canonicalBody(input), input.signature)) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'bad-signature' });
  }
  const triggers = SYNC_EVENTS[input.connectorId] ?? [];
  if (!triggers.includes(input.event)) return { status: 'ok', synced: false };

  if (input.connectorId === 'bank') {
    // No session actor on the webhook path (HMAC is the auth) — record a system actor in the audit.
    const job = await runBankSync({ id: 'system:webhook', role: 'system' });
    return { status: 'ok', synced: true, job };
  }
  return { status: 'ok', synced: false };
}
