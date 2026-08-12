import { expect, test } from '@playwright/test';
import {
  auditListSafe, auditVerifySafe, ENG_014, login, stateGetSafe, stateHistorySafe, stateSetSafe, USERS,
} from '../helpers';

test.describe('Perjalanan 5 — mutasi menghasilkan StateDocHistory + audit event', () => {
  test('setiap state.set menulis riwayat append-only dan event STATE_SET berantai', async ({ page }) => {
    await login(page, USERS.manager);

    const key = `e2e.audit.${Date.now()}`;
    const target = { scope: 'engagement', scopeId: ENG_014, key };

    // Mutasi #1 (create).
    const before = await stateGetSafe(page, target);
    expect(before.ok).toBe(true);
    const w1 = await stateSetSafe(page, { ...target, value: { n: 1 }, baseVersion: before.data.version });
    expect(w1.ok).toBe(true);
    expect(w1.data.version).toBeGreaterThan(before.data.version);

    // StateDocHistory berisi baris pertama dengan nilai persis.
    const h1 = await stateHistorySafe(page, target);
    expect(h1.ok).toBe(true);
    expect(h1.data).toHaveLength(1);
    expect(h1.data[0]).toMatchObject({ version: before.data.version + 1 });
    expect(h1.data[0].value).toEqual({ n: 1 });
    expect(h1.data[0].updatedBy).toBe(USERS.manager.id);

    // Audit: satu STATE_SET untuk key ini, detail v<awal>->v<akhir>, actor = sesi.
    const a1 = await auditListSafe(page, 200);
    expect(a1.ok).toBe(true);
    const rows1 = a1.data.filter((r) => r.action === 'STATE_SET' && r.key === key && r.scopeId === ENG_014);
    expect(rows1).toHaveLength(1);
    expect(rows1[0].detail).toBe(`v${before.data.version}->v${w1.data.version}`);
    expect(rows1[0].actorUserId).toBe(USERS.manager.id);
    expect(rows1[0].actorRole).toBe('Audit Manager');

    // Mutasi #2 (update, CAS).
    const w2 = await stateSetSafe(page, { ...target, value: { n: 2 }, baseVersion: w1.data.version });
    expect(w2.ok).toBe(true);
    expect(w2.data.version).toBe(w1.data.version + 1);

    const h2 = await stateHistorySafe(page, target);
    expect(h2.ok).toBe(true);
    expect(h2.data).toHaveLength(2);
    expect(h2.data.map((r) => r.version)).toEqual([w1.data.version, w2.data.version]);
    expect(h2.data[1].value).toEqual({ n: 2 });

    const a2 = await auditListSafe(page, 200);
    expect(a2.ok).toBe(true);
    const rows2 = a2.data.filter((r) => r.action === 'STATE_SET' && r.key === key && r.scopeId === ENG_014);
    expect(rows2).toHaveLength(2);
    expect(rows2[0].detail).toBe(`v${w1.data.version}->v${w2.data.version}`);

    // Integritas rantai audit utuh (tamper-evident) dan riwayat baca ikut gated
    // (state.history memakai assertStateDocRead yang sama dengan state.get).
    const verify = await auditVerifySafe(page);
    expect(verify.ok).toBe(true);
    expect(verify.data.ok).toBe(true);
    expect(verify.data.count).toBeGreaterThan(0);
  });
});
