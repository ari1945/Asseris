// Deploy-Readiness go-live gap — secrets manager. Default remains `.env`/`.env.local` (env.ts,
// PRD Non-Scope: ".env dulu; integrasi manager = fase lanjutan") — this module is that fase
// lanjutan, opt-in via SECRETS_PROVIDER=aws-sm. Nothing changes for anyone who doesn't set it.
//
// Design: fetch ONE JSON secret from AWS Secrets Manager (the recommended SM pattern — a flat
// {KEY: value} object) and merge it into process.env BEFORE prodConfig.ts / db.ts / crypto/* read
// it. Every downstream consumer already reads process.env — this keeps them completely unchanged,
// so `assertProdConfig` still gates the SAME resolved values regardless of where they came from.
//
// Auth: default AWS SDK credential provider chain (EC2 instance profile / ECS task role / env vars
// if the operator sets them) — no access keys hardcoded here, matching the project's nol-vendor/
// least-privilege stance. IAM policy needed: secretsmanager:GetSecretValue on the one secret ARN.
//
// Fail-closed like the rest of Deploy-Readiness (M2): if SECRETS_PROVIDER=aws-sm is set but the
// fetch/parse fails, this throws — callers (server.ts/bootstrap.ts) must treat that as fatal and
// exit, not silently fall through to ".env" (which prodConfig.ts would then flag with a confusing
// "not set" message that hides the real cause).
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/** Parse a Secrets Manager JSON payload into an env-var patch. PURE — no I/O, fully unit-testable.
 *  Non-string values are rejected (a secret's values are env-var strings, not nested config). */
export function parseSecretPayload(raw: string): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Secrets Manager payload bukan JSON valid — simpan sebagai JSON object flat {KEY: "value"}');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Secrets Manager payload harus JSON object flat {KEY: "value"}, bukan array/primitif');
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v !== 'string') {
      throw new Error(`Secrets Manager key '${k}' bukan string (dapat ${typeof v}) — semua nilai wajib string`);
    }
    out[k] = v;
  }
  return out;
}

/** Merge fetched secrets into env WITHOUT overwriting a var the operator already set explicitly —
 *  an explicit process env var (or `.env.local`, loaded earlier by env.ts) always wins over Secrets
 *  Manager. Lets an operator override one rotated/bad secret via env without touching AWS or
 *  redeploying the SM payload. PURE — no I/O, unit-testable independent of the AWS SDK. */
export function applySecretsToEnv(secrets: Record<string, string>, env: NodeJS.ProcessEnv = process.env): void {
  for (const [k, v] of Object.entries(secrets)) {
    if (env[k] === undefined || env[k] === '') env[k] = v;
  }
}

let cachedClient: SecretsManagerClient | null = null;
function client(): SecretsManagerClient {
  // Region from AWS_REGION/AWS_DEFAULT_REGION (SDK default chain) — no explicit config needed on EC2.
  if (!cachedClient) cachedClient = new SecretsManagerClient({});
  return cachedClient;
}

/** No-op unless SECRETS_PROVIDER=aws-sm — call this right after `import './env'`, before anything
 *  reads process.env for real config (prodConfig.ts, db.ts, crypto/*). */
export async function loadSecretsIntoEnv(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  if (env.SECRETS_PROVIDER !== 'aws-sm') return;
  const secretId = env.AWS_SECRETS_MANAGER_SECRET_ID;
  if (!secretId) {
    throw new Error('SECRETS_PROVIDER=aws-sm tapi AWS_SECRETS_MANAGER_SECRET_ID tak diset — nama/ARN secret wajib diisi.');
  }
  const res = await client().send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!res.SecretString) {
    throw new Error(`Secret '${secretId}' tak punya SecretString (biner?) — Asseris memakai JSON object string.`);
  }
  applySecretsToEnv(parseSecretPayload(res.SecretString), env);
}
