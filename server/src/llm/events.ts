// W8 Fase 0 — append-only LLM usage audit (PRD §4.5). Mirrors auth/events.ts: who used the
// proxy, when, which provider/model, and a short non-sensitive detail (finding count +
// token usage). Best-effort — logging must never break the request it describes. Crucially
// we do NOT log the prompt or the model's output (those carry the redacted finding text);
// the audit trail records usage, not content.
import { prisma } from '../db';

export type LlmEventKind = 'NARRATE' | 'ERROR' | 'RATE_LIMIT' | 'FORBIDDEN' | 'NOT_CONFIGURED';

export async function logLlmEvent(
  kind: LlmEventKind,
  meta: { userId?: string | null; provider?: string | null; model?: string | null; detail?: string | null } = {},
): Promise<void> {
  try {
    await prisma.llmEvent.create({
      data: {
        kind,
        userId: meta.userId ?? null,
        provider: meta.provider ?? null,
        model: meta.model ?? null,
        detail: meta.detail ?? null,
      },
    });
  } catch {
    /* audit logging is non-critical to the operation — swallow */
  }
}
