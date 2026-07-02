import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseSecretPayload, applySecretsToEnv } from '../secrets';

/* Deploy-Readiness go-live gap — AWS Secrets Manager as an opt-in alternative to .env files.
   Pins: (1) parsing is strict (flat JSON object, string values only — a secret is env-var
   material, not nested config), (2) merge NEVER clobbers a var the operator already set
   explicitly (defense-in-depth override), (3) loadSecretsIntoEnv is a no-op unless
   SECRETS_PROVIDER=aws-sm (zero behavior change for the default .env path), and (4) it's
   fail-closed on fetch/parse failure (same philosophy as assertProdConfig). */

describe('parseSecretPayload — SM JSON payload → env-var patch', () => {
  it('flat JSON object of strings → parsed as-is', () => {
    expect(parseSecretPayload('{"APP_ENCRYPTION_KEY":"abc","POSTGRES_PASSWORD":"xyz"}')).toEqual({
      APP_ENCRYPTION_KEY: 'abc',
      POSTGRES_PASSWORD: 'xyz',
    });
  });
  it('malformed JSON → throws', () => {
    expect(() => parseSecretPayload('not json')).toThrow(/JSON valid/);
  });
  it('JSON array → throws (not a flat object)', () => {
    expect(() => parseSecretPayload('["a","b"]')).toThrow(/JSON object/);
  });
  it('JSON primitive → throws (not a flat object)', () => {
    expect(() => parseSecretPayload('"just a string"')).toThrow(/JSON object/);
  });
  it('non-string value → throws (secrets are env-var strings, not nested config)', () => {
    expect(() => parseSecretPayload('{"APP_ENCRYPTION_KEY": 123}')).toThrow(/bukan string/);
    expect(() => parseSecretPayload('{"NESTED": {"a":1}}')).toThrow(/bukan string/);
  });
});

describe('applySecretsToEnv — merge WITHOUT clobbering operator-set vars', () => {
  it('missing key → filled from secret', () => {
    const env: NodeJS.ProcessEnv = {};
    applySecretsToEnv({ APP_ENCRYPTION_KEY: 'from-sm' }, env);
    expect(env.APP_ENCRYPTION_KEY).toBe('from-sm');
  });
  it('empty-string key → filled from secret (empty = unset in practice)', () => {
    const env: NodeJS.ProcessEnv = { APP_ENCRYPTION_KEY: '' };
    applySecretsToEnv({ APP_ENCRYPTION_KEY: 'from-sm' }, env);
    expect(env.APP_ENCRYPTION_KEY).toBe('from-sm');
  });
  it('already-set key → NOT overwritten (explicit env always wins)', () => {
    const env: NodeJS.ProcessEnv = { APP_ENCRYPTION_KEY: 'operator-override' };
    applySecretsToEnv({ APP_ENCRYPTION_KEY: 'from-sm' }, env);
    expect(env.APP_ENCRYPTION_KEY).toBe('operator-override');
  });
});

// loadSecretsIntoEnv does real network I/O via the AWS SDK — mock the client's .send().
const sendMock = vi.fn();
vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: vi.fn().mockImplementation(() => ({ send: sendMock })),
  GetSecretValueCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

describe('loadSecretsIntoEnv — opt-in fetch + fail-closed', () => {
  beforeEach(() => { sendMock.mockReset(); vi.resetModules(); });

  it('SECRETS_PROVIDER unset → no-op, .send() never called (default .env path unchanged)', async () => {
    const { loadSecretsIntoEnv } = await import('../secrets');
    const env: NodeJS.ProcessEnv = { APP_ENCRYPTION_KEY: 'from-dotenv' };
    await loadSecretsIntoEnv(env);
    expect(sendMock).not.toHaveBeenCalled();
    expect(env.APP_ENCRYPTION_KEY).toBe('from-dotenv');
  });

  it('SECRETS_PROVIDER=aws-sm but AWS_SECRETS_MANAGER_SECRET_ID missing → throws before any fetch', async () => {
    const { loadSecretsIntoEnv } = await import('../secrets');
    const env: NodeJS.ProcessEnv = { SECRETS_PROVIDER: 'aws-sm' };
    await expect(loadSecretsIntoEnv(env)).rejects.toThrow(/AWS_SECRETS_MANAGER_SECRET_ID/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('SECRETS_PROVIDER=aws-sm → fetches by SecretId, merges JSON payload into env', async () => {
    sendMock.mockResolvedValue({ SecretString: JSON.stringify({ APP_ENCRYPTION_KEY: 'a'.repeat(64) }) });
    const { loadSecretsIntoEnv } = await import('../secrets');
    const env: NodeJS.ProcessEnv = { SECRETS_PROVIDER: 'aws-sm', AWS_SECRETS_MANAGER_SECRET_ID: 'asseris/prod/keys' };
    await loadSecretsIntoEnv(env);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(env.APP_ENCRYPTION_KEY).toBe('a'.repeat(64));
  });

  it('SM secret has no SecretString (e.g. binary) → throws, fail-closed', async () => {
    sendMock.mockResolvedValue({ SecretBinary: new Uint8Array([1, 2, 3]) });
    const { loadSecretsIntoEnv } = await import('../secrets');
    const env: NodeJS.ProcessEnv = { SECRETS_PROVIDER: 'aws-sm', AWS_SECRETS_MANAGER_SECRET_ID: 'asseris/prod/keys' };
    await expect(loadSecretsIntoEnv(env)).rejects.toThrow(/SecretString/);
  });

  it('SDK fetch rejects (network/IAM denied) → propagates, fail-closed (does not silently fall back)', async () => {
    sendMock.mockRejectedValue(new Error('AccessDeniedException'));
    const { loadSecretsIntoEnv } = await import('../secrets');
    const env: NodeJS.ProcessEnv = { SECRETS_PROVIDER: 'aws-sm', AWS_SECRETS_MANAGER_SECRET_ID: 'asseris/prod/keys' };
    await expect(loadSecretsIntoEnv(env)).rejects.toThrow(/AccessDeniedException/);
  });

  it('malformed SM payload → throws with the parse error, not a generic failure', async () => {
    sendMock.mockResolvedValue({ SecretString: 'not json' });
    const { loadSecretsIntoEnv } = await import('../secrets');
    const env: NodeJS.ProcessEnv = { SECRETS_PROVIDER: 'aws-sm', AWS_SECRETS_MANAGER_SECRET_ID: 'asseris/prod/keys' };
    await expect(loadSecretsIntoEnv(env)).rejects.toThrow(/JSON valid/);
  });
});
