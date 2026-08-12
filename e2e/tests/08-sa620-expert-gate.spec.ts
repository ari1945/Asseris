import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { ENG_031, login, stateGetSafe, stateSetSafe, trpcSafe, USERS, wpSignature } from '../helpers';

/* ============================================================
   Perjalanan 8 — gerbang pakar SA 620 tak dapat dilewati lewat JALUR TULIS
   PRD: docs/prd-sa620-expert-gate-server.md
   ------------------------------------------------------------
   Gerbang ini semula hidup hanya di UI: ia menonaktifkan TOMBOL sign-off.
   Spek ini sengaja TIDAK menyentuh UI sama sekali — ia menembak `state.set`
   langsung, yakni permukaan yang dulu terbuka lebar. Menguji lewat UI berarti
   menguji ulang gerbang yang sudah ada dan melewatkan yang sedang dijaga.

   Setiap langkah memakai tanda tangan yang SAH (identitas + waktu benar), jadi
   satu-satunya hal yang dapat menolaknya adalah gerbang pakar itu sendiri.
   ============================================================ */

const KEY = 'wpState';
const REF = 'sa540';
const EST = 'E-04';
const EXPERT_APPROACH = 'Gunakan pakar (SA 620)';
const FULL_EVAL = { competence: true, objectivity: true, scope: true, findings: true };

const REGISTER = {
  register: [
    { id: EST, name: 'Liabilitas Imbalan Kerja (PSAK 24)', approach: EXPERT_APPROACH, mgmt: 9650, lo: 9000, hi: 10200 },
    { id: 'E-01', name: 'CKPN Piutang', approach: 'Rentang independen', mgmt: 4870, lo: 4600, hi: 5200 },
  ],
};

test.describe('Perjalanan 8 — gerbang pakar SA 620 ditegakkan server', () => {
  test('tanda tangan SA 540 menuntut evaluasi 4/4 DAN laporan pakar hidup di DMS', async ({ page }) => {
    await login(page, USERS.manager);
    const target = { scope: 'engagement' as const, scopeId: ENG_031, key: KEY };
    const evalTarget = { scope: 'engagement' as const, scopeId: ENG_031, key: 'expertEval.v1' };
    const now = () => new Date().toISOString();
    const sig = () => wpSignature(USERS.manager, now());

    /* Registri estimasi HARUS tersimpan di server, jika tidak gerbang fail-open
       (keputusan Q2) dan spek ini tak akan menguji apa pun. */
    const reg0 = await stateGetSafe(page, { scope: 'engagement', scopeId: ENG_031, key: 'estimates.v1' });
    expect(reg0.ok).toBe(true);
    const putReg = await stateSetSafe(page, {
      scope: 'engagement', scopeId: ENG_031, key: 'estimates.v1',
      value: REGISTER, baseVersion: (reg0 as { data: { version: number } }).data.version,
    });
    expect(putReg.ok).toBe(true);

    const setEval = async (value: unknown) => {
      const cur = await stateGetSafe(page, evalTarget);
      expect(cur.ok).toBe(true);
      const r = await stateSetSafe(page, { ...evalTarget, value, baseVersion: (cur as { data: { version: number } }).data.version });
      expect(r.ok).toBe(true);
    };
    const trySign = async (slot: string, extraChain: Record<string, unknown> = {}) => {
      const cur = await stateGetSafe(page, target);
      expect(cur.ok).toBe(true);
      const doc = (cur as { data: { value: unknown; version: number } }).data;
      const base = doc.value && typeof doc.value === 'object' ? { ...(doc.value as Record<string, unknown>) } : {};
      return stateSetSafe(page, {
        ...target,
        value: { ...base, [REF]: { chain: { ...extraChain, [slot]: sig() } } },
        baseVersion: doc.version,
      });
    };

    // LANGKAH 1 — evaluasi pakar kosong. Sebelum PRD ini: 200 OK, kertas kerja tertandatangani.
    await setEval({});
    const noEval = await trySign('preparer');
    expect(noEval.ok).toBe(false);
    expect(noEval.ok === false && noEval.code).toBe('FORBIDDEN');
    expect(noEval.ok === false && noEval.message).toContain('expert-gate:E-04');
    expect(noEval.ok === false && noEval.message).toContain('0/4');

    // LANGKAH 2 — evaluasi 4/4 tetapi laporan pakar tak ditautkan.
    await setEval({ [EST]: FULL_EVAL });
    const noDoc = await trySign('preparer');
    expect(noDoc.ok).toBe(false);
    expect(noDoc.ok === false && noDoc.message).toContain('belum ditautkan dari DMS');

    // LANGKAH 3 — tautan WARISAN (uid localStorage sebelum PR-2) ditolak, keputusan Q1.
    await setEval({ [EST]: { ...FULL_EVAL, docUid: 'ev-1754976000000-4821' } });
    const legacy = await trySign('preparer');
    expect(legacy.ok).toBe(false);
    expect(legacy.ok === false && legacy.message).toContain('Tautan warisan');

    // LANGKAH 4 — laporan pakar NYATA di DMS → tanda tangan yang sama diterima.
    const bytes = Buffer.from('%PDF-1.4 laporan aktuaria e2e\n');
    const upload = await trpcSafe<{ id: string }>(page, 'attachment.upload', 'mutation', {
      scope: 'engagement', scopeId: ENG_031, collection: 'sa540', refId: EST,
      name: 'Laporan Aktuaria PSAK 24.pdf', mime: 'application/pdf',
      sha256: createHash('sha256').update(bytes).digest('hex'),
      dataBase64: bytes.toString('base64'),
    });
    expect(upload.ok).toBe(true);
    const docId = (upload as { data: { id: string } }).data.id;
    await setEval({ [EST]: { ...FULL_EVAL, docUid: docId } });
    const signed = await trySign('preparer');
    expect(signed.ok).toBe(true);

    // LANGKAH 5 — dokumennya DICABUT dari DMS. Pencabutan terlihat server lewat
    // `deletedAt`; inilah yang tak mungkin diketahui sebelum PR-2.
    const removed = await trpcSafe(page, 'attachment.remove', 'mutation', { id: docId });
    expect(removed.ok).toBe(true);

    // LANGKAH 6 — PENCABUTAN tanda tangan tetap boleh meski gerbang kini menghalangi.
    // Gerbang yang ikut memblokir `unsign` akan MENJEBAK kertas kerja dalam keadaan
    // tertandatangani — persis kebalikan dari tujuannya.
    const cur2 = await stateGetSafe(page, target);
    const doc2 = (cur2 as { data: { value: Record<string, unknown>; version: number } }).data;
    const unsign = await stateSetSafe(page, {
      ...target, value: { ...doc2.value, [REF]: { chain: {} } }, baseVersion: doc2.version,
    });
    expect(unsign.ok).toBe(true);

    /* LANGKAH 7 — tanda tangan BARU atas dokumen yang sudah dicabut → ditolak.
       Slot yang SAMA (preparer) sengaja dipakai: mencoba slot reviewer dengan aktor
       yang sama akan ditolak aturan satu-orang-satu-langkah SEBELUM gerbang pakar
       sempat bicara, dan langkah yang ditolak aturan lain tidak menguji gerbang ini
       sama sekali. (Persis jebakan yang tertangkap probe hidup PR-3.) */
    const afterRevoke = await trySign('preparer');
    expect(afterRevoke.ok).toBe(false);
    expect(afterRevoke.ok === false && afterRevoke.message).toContain('tidak lagi ada di DMS');
  });
});
