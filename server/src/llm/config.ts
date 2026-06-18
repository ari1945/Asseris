// W8 Fase 0 — LLM proxy configuration. The API key lives ONLY in server env
// (LLM_API_KEY), never in the browser/localStorage/DB (PRD Q3=A). readLlmConfig()
// returns null when no key is set → the endpoint reports `not-configured` and the UI
// degrades to deterministic-only (PRD §3). Provider defaults mirror the client registry
// (migration/src/llm_providers.js); we keep a small server-side copy because that module
// is a browser IIFE (reads window.*) and can't be imported under Node.

export type Compat = 'anthropic' | 'openai';

export interface LlmConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  compat: Compat;
}

interface ProviderDefault {
  compat: Compat;
  baseUrl: string;
  model: string;
}

// W8 implements Anthropic (the registry default) + a generic OpenAI-compatible adaptor
// that covers OpenAI/DeepSeek/Kimi (PRD Q2=A). Gemini's distinct API stays proxy-pending.
const PROVIDER_DEFAULTS: Record<string, ProviderDefault> = {
  anthropic: { compat: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6' },
  openai: { compat: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  deepseek: { compat: 'openai', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  kimi: { compat: 'openai', baseUrl: 'https://api.moonshot.cn/v1', model: 'kimi-k2' },
};

/**
 * Resolve the active LLM config from env. Returns null when LLM_API_KEY is unset
 * (the `not-configured` signal). LLM_PROVIDER/MODEL/BASE_URL override the defaults;
 * an unknown provider is accepted as OpenAI-compatible only when LLM_BASE_URL is given.
 */
export function readLlmConfig(env: NodeJS.ProcessEnv = process.env): LlmConfig | null {
  const apiKey = (env.LLM_API_KEY ?? '').trim();
  if (!apiKey) return null;

  const provider = (env.LLM_PROVIDER ?? 'anthropic').trim();
  const known = PROVIDER_DEFAULTS[provider];
  const baseUrlEnv = (env.LLM_BASE_URL ?? '').trim();

  let def: ProviderDefault;
  if (known) {
    def = known;
  } else if (baseUrlEnv) {
    // Unknown provider + explicit base URL → treat as OpenAI-compatible custom endpoint.
    def = { compat: 'openai', baseUrl: baseUrlEnv, model: 'gpt-4o' };
  } else {
    return null;
  }

  return {
    provider,
    apiKey,
    model: (env.LLM_MODEL ?? '').trim() || def.model,
    baseUrl: baseUrlEnv || def.baseUrl,
    compat: def.compat,
  };
}

/** True when a usable LLM config is present (key set + resolvable provider). */
export function llmConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return readLlmConfig(env) !== null;
}
