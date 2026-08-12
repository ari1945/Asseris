import { expect, test, type Browser } from '@playwright/test';
import {
  auditListSafe, auditVerifySafe, ENG_014, login, stateGetSafe, stateHistorySafe, stateSetSafe,
  USERS, wpSignature,
} from '../helpers';

const WP_KEY = 'wpState';

async function freshPage(browser: Browser, user: (typeof USERS)['junior']) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, user);
  return { context, page };
}

async function readWp(page: import('@playwright/test').Page) {
  return stateGetSafe<any>(page, { scope: 'engagement', scopeId: ENG_014, key: WP_KEY });
}

test.describe('Perjalanan 4 — sign-off berurutan dengan SoD (rantai kertas kerja)', () => {
  test('setiap slot menuntut kapabilitas peran + satu-orang-satu-langkah, tercatat di audit', async ({ browser }) => {
    const ref = `E2E-${Date.now()}`;
    const now = () => new Date().toISOString();
    // Tanda tangan SEKALI lalu dipakai ulang apa adanya di seluruh rantai: guard server
    // mem-diff nilai tersimpan vs masuk, jadi mengubah `at` pada slot lama akan tampak
    // sebagai penulisan ulang slot itu oleh orang lain (signature-identity-mismatch).
    const prepSig = wpSignature(USERS.junior, now());
    const reviewerSig = wpSignature(USERS.manager, now());
    const partnerSig = wpSignature(USERS.partner, now());
    const eqrSigBySamePartner = wpSignature(USERS.partner, now());
    const eqrSig = wpSignature(USERS.partner2, now());
    const chain = (over: Record<string, unknown>) => ({ ...current0, [ref]: { chain: over } });

    // Baseline riwayat wpState (dokumen mungkin sudah punya versi dari run sebelumnya).
    const junior = await freshPage(browser, USERS.junior);
    const doc0 = await readWp(junior.page);
    expect(doc0.ok).toBe(true);
    const current0 = doc0.data.value && typeof doc0.data.value === 'object' ? { ...doc0.data.value } : {};
    const base0 = doc0.data.version;
    const historyBefore = await stateHistorySafe(junior.page, { scope: 'engagement', scopeId: ENG_014, key: WP_KEY });
    expect(historyBefore.ok).toBe(true);

    // LANGKAH 1 — Preparer (Junior, WP_EDIT).
    const v1 = await stateSetSafe(junior.page, {
      scope: 'engagement', scopeId: ENG_014, key: WP_KEY,
      value: chain({ preparer: prepSig }),
      baseVersion: base0,
    });
    expect(v1.ok).toBe(true);

    // LANGKAH 2 — Junior mencoba slot Reviewer → DITOLAK (butuh signoff.reviewer).
    const v1Doc = await readWp(junior.page);
    const attemptReviewer = await stateSetSafe(junior.page, {
      scope: 'engagement', scopeId: ENG_014, key: WP_KEY,
      value: chain({ preparer: prepSig, reviewer: wpSignature(USERS.junior, now()) }),
      baseVersion: v1Doc.data.version,
    });
    expect(attemptReviewer.ok).toBe(false);
    expect(attemptReviewer.code).toBe('FORBIDDEN');
    expect(attemptReviewer.message).toContain('signoff.reviewer');
    await junior.context.close();

    // LANGKAH 3 — Manager (SIGNOFF_REVIEWER) menandatangani Reviewer.
    const manager = await freshPage(browser, USERS.manager);
    const doc1 = await readWp(manager.page);
    expect(doc1.data.version).toBe(v1.data.version);
    const v2 = await stateSetSafe(manager.page, {
      scope: 'engagement', scopeId: ENG_014, key: WP_KEY,
      value: chain({ preparer: prepSig, reviewer: reviewerSig }),
      baseVersion: doc1.data.version,
    });
    expect(v2.ok).toBe(true);

    // LANGKAH 4 — Manager mencoba slot Partner → DITOLAK (butuh opinion.approve).
    const doc2 = await readWp(manager.page);
    const attemptPartner = await stateSetSafe(manager.page, {
      scope: 'engagement', scopeId: ENG_014, key: WP_KEY,
      value: chain({ preparer: prepSig, reviewer: reviewerSig, partner: wpSignature(USERS.manager, now()) }),
      baseVersion: doc2.data.version,
    });
    expect(attemptPartner.ok).toBe(false);
    expect(attemptPartner.code).toBe('FORBIDDEN');
    expect(attemptPartner.message).toContain('opinion.approve');
    await manager.context.close();

    // LANGKAH 5 — Partner (OPINION_APPROVE) menandatangani Partner.
    const partner = await freshPage(browser, USERS.partner);
    const doc3 = await readWp(partner.page);
    const v3 = await stateSetSafe(partner.page, {
      scope: 'engagement', scopeId: ENG_014, key: WP_KEY,
      value: chain({ preparer: prepSig, reviewer: reviewerSig, partner: partnerSig }),
      baseVersion: doc3.data.version,
    });
    expect(v3.ok).toBe(true);

    // LANGKAH 6 — Partner yang sama mencoba EQR → DITOLAK aturan satu-orang-satu-langkah
    // (R4), meski kapabilitas EQR_REVIEW ia miliki.
    const doc4 = await readWp(partner.page);
    const attemptEqr = await stateSetSafe(partner.page, {
      scope: 'engagement', scopeId: ENG_014, key: WP_KEY,
      value: chain({ preparer: prepSig, reviewer: reviewerSig, partner: partnerSig, eqr: eqrSigBySamePartner }),
      baseVersion: doc4.data.version,
    });
    expect(attemptEqr.ok).toBe(false);
    expect(attemptEqr.code).toBe('FORBIDDEN');
    expect(attemptEqr.message).toContain('signature-self-review');
    await partner.context.close();

    // LANGKAH 7 — Partner independen (Rudi, EQR_REVIEW) menutup rantai.
    const eqr = await freshPage(browser, USERS.partner2);
    const doc5 = await readWp(eqr.page);
    const v4 = await stateSetSafe(eqr.page, {
      scope: 'engagement', scopeId: ENG_014, key: WP_KEY,
      value: chain({ preparer: prepSig, reviewer: reviewerSig, partner: partnerSig, eqr: eqrSig }),
      baseVersion: doc5.data.version,
    });
    expect(v4.ok).toBe(true);

    // StateDocHistory: tepat 4 versi baru untuk rantai ini (dokumen utuh naik 4 versi).
    const historyAfter = await stateHistorySafe(eqr.page, { scope: 'engagement', scopeId: ENG_014, key: WP_KEY });
    expect(historyAfter.ok).toBe(true);
    expect(historyAfter.data.length).toBe(historyBefore.data.length + 4);
    const lastRow = historyAfter.data[historyAfter.data.length - 1];
    const lastValue = lastRow.value as Record<string, { chain?: Record<string, unknown> }>;
    expect(Object.keys(lastValue[ref]?.chain ?? {}).sort()).toEqual(['eqr', 'partner', 'preparer', 'reviewer']);

    // Audit: tiap tulisan otoritatif memuat detail signoff[wp:<ref>.<slot>] + rantai tetap utuh.
    const audit = await auditListSafe(eqr.page, 200);
    expect(audit.ok).toBe(true);
    const wpRows = audit.data.filter(
      (r) => r.action === 'STATE_SET' && r.key === WP_KEY && r.scopeId === ENG_014 && (r.detail ?? '').includes(`wp:${ref}.`),
    );
    expect(wpRows.length).toBe(4);
    const details = wpRows.map((r) => r.detail ?? '').join(' | ');
    expect(details).toContain(`wp:${ref}.preparer`);
    expect(details).toContain(`wp:${ref}.reviewer`);
    expect(details).toContain(`wp:${ref}.partner`);
    expect(details).toContain(`wp:${ref}.eqr`);

    const verify = await auditVerifySafe(eqr.page);
    expect(verify.ok).toBe(true);
    expect(verify.data.ok).toBe(true);
    expect(verify.data.count).toBeGreaterThan(0);
    await eqr.context.close();
  });
});
