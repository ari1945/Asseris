// W8 Fase 0 — provider adaptors. Plain `fetch` (Node ≥18 global) — NO vendor SDK, keeping
// the W6/W7 "nol-vendor / agent-executable" stance. Two shapes (PRD Q2=A):
//   • anthropic  → POST /messages          (x-api-key + anthropic-version)
//   • openai     → POST /chat/completions  (Authorization: Bearer) — also DeepSeek/Kimi
// `fetch` is injected so tests run without a key or network (a mock captures the request
// body — that is where the anti-leak egress assertion bites).
import type { LlmConfig } from './config';

export type FetchLike = typeof fetch;

export interface CompletionInput {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResult {
  text: string;
  usage?: { input?: number; output?: number };
}

const DEFAULT_MAX_TOKENS = 1024;
const ANTHROPIC_VERSION = '2023-06-01';

export async function complete(
  cfg: LlmConfig,
  input: CompletionInput,
  fetchImpl: FetchLike = fetch,
): Promise<CompletionResult> {
  return cfg.compat === 'anthropic'
    ? completeAnthropic(cfg, input, fetchImpl)
    : completeOpenAI(cfg, input, fetchImpl);
}

async function completeAnthropic(cfg: LlmConfig, input: CompletionInput, fetchImpl: FetchLike): Promise<CompletionResult> {
  const res = await fetchImpl(`${cfg.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: input.system,
      messages: [{ role: 'user', content: input.user }],
      ...(input.temperature != null ? { temperature: input.temperature } : {}),
    }),
  });
  if (!res.ok) throw await providerError('anthropic', res);
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim();
  return { text, usage: { input: data.usage?.input_tokens, output: data.usage?.output_tokens } };
}

async function completeOpenAI(cfg: LlmConfig, input: CompletionInput, fetchImpl: FetchLike): Promise<CompletionResult> {
  const res = await fetchImpl(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.user },
      ],
      ...(input.temperature != null ? { temperature: input.temperature } : {}),
    }),
  });
  if (!res.ok) throw await providerError('openai', res);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = (data.choices?.[0]?.message?.content ?? '').trim();
  return { text, usage: { input: data.usage?.prompt_tokens, output: data.usage?.completion_tokens } };
}

async function providerError(provider: string, res: Response): Promise<Error> {
  let body = '';
  try {
    body = (await res.text()).slice(0, 300);
  } catch {
    /* ignore */
  }
  // Caller maps this to a generic INTERNAL_SERVER_ERROR — we never surface the key, only
  // the upstream status, to the client.
  return new Error(`${provider} HTTP ${res.status}: ${body}`);
}
