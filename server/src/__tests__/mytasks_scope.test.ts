/* ============================================================
   M1 — "Tugas Pribadi" berhenti menjadi milik seluruh firma.
   ------------------------------------------------------------
   `mt.personal` (daftar tugas pribadi) & `mt.meta` (status/bintang/checklist/catatan
   per-tugas) dulu berlingkup FIRMA dan terdaftar di FIRM_STATE_READ_KEYS. Akibatnya
   dua hal yang keduanya nyata di kode:

     (a) KEBOCORAN — satu dokumen untuk seluruh KAP, dan `useMyTasks`
         (migration/src/view_mytasks_parts.tsx) menggabungkan seluruh isinya tanpa
         filter pemilik karena tugasnya memang tak punya field pemilik. Dimas menandai
         "selesai", layar Fajar ikut berubah; siapa pun bisa menghapus tugas siapa pun.
     (b) TULISAN GAGAL SENYAP — `capForWrite('firm', 'mt.meta')` jatuh ke default
         FIRM_ADMIN, jadi hanya Rekan Pemimpin yang tulisannya diterima. Auditor lain
         melihat centangnya menempel (cache lokal) lalu hilang saat reload; `flush()`
         di contexts.tsx hanya menampilkan toast untuk CONFLICT, bukan FORBIDDEN.

   Suite ini menembak router NYATA (bukan mock) supaya yang dipaku adalah perilaku
   yang benar-benar dijalankan HTTP, bukan bentuk sebuah konstanta.
   ============================================================ */
import { describe, it, expect, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { FIRM_STATE_READ_KEYS } from '../stateAccess';
import { userScopedKeys } from '../../../migration/src/persist_scope';

const MT_KEYS = ['mt.personal', 'mt.meta', 'mt.view'] as const;

const DIMAS = 'MTS-USER-DIMAS';
const FAJAR = 'MTS-USER-FAJAR';
const FIRM = 'MTS-FIRM';

function callerAs(id: string, role: string) {
  return createCallerFactory(appRouter)({ user: { id, role } as unknown as User, token: 'test' });
}

afterAll(async () => {
  await prisma.stateDoc.deleteMany({ where: { scopeId: { in: [DIMAS, FAJAR, FIRM] } } });
  await prisma.stateDocHistory.deleteMany({ where: { scopeId: { in: [DIMAS, FAJAR, FIRM] } } });
});

describe('M1 — My Tasks tak lagi dapat dibaca lewat jalur firma', () => {
  it.each(MT_KEYS)('state.get lingkup firma untuk %s ditolak', async (key) => {
    await expect(
      callerAs(DIMAS, 'Senior Auditor').state.get({ scope: 'firm', scopeId: FIRM, key }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('bahkan Rekan Pemimpin tak bisa membaca dokumen firma lama', async () => {
    // Bukan soal peran: kuncinya sudah tak ada di permukaan baca firma sama sekali.
    await expect(
      callerAs('MTS-PARTNER', 'Engagement Partner').state.get({ scope: 'firm', scopeId: FIRM, key: 'mt.personal' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('daftar baca firma tak memuat satu pun kunci berlingkup pengguna (kontrak dua-sisi)', () => {
    // Sumbernya peta klien (migration/src/persist_scope.ts) — menambah kunci 'user' di sana
    // sambil lupa mencabutnya dari allowlist ini akan MERAH di sini, bukan diam-diam bocor.
    for (const key of userScopedKeys()) {
      expect(FIRM_STATE_READ_KEYS.has(key)).toBe(false);
    }
    expect(userScopedKeys().length).toBeGreaterThan(0); // jaring: peta kosong tak boleh lolos
  });
});

describe('M1 — dokumen My Tasks milik pemiliknya', () => {
  it('Senior Auditor dapat MENULIS dan membaca dokumen tugasnya sendiri', async () => {
    // Ini yang dulu gagal senyap: firm-scope → capForWrite = FIRM_ADMIN → hanya Partner.
    const dimas = callerAs(DIMAS, 'Senior Auditor');
    const written = await dimas.state.set({
      scope: 'user', scopeId: DIMAS, key: 'mt.personal',
      value: [{ id: 'p-1', label: 'Siapkan bahan rapat tim', priority: 'medium' }],
      baseVersion: 0,
    });
    expect(written.version).toBe(1);
    const read = await dimas.state.get({ scope: 'user', scopeId: DIMAS, key: 'mt.personal' });
    expect(read.value).toEqual([{ id: 'p-1', label: 'Siapkan bahan rapat tim', priority: 'medium' }]);
  });

  it('Junior Auditor pun boleh mencentang tugasnya sendiri (mt.meta)', async () => {
    const fajar = callerAs(FAJAR, 'Junior Auditor');
    const written = await fajar.state.set({
      scope: 'user', scopeId: FAJAR, key: 'mt.meta',
      value: { 'dl-DL-01': { status: 'done' } }, baseVersion: 0,
    });
    expect(written.version).toBe(1);
  });

  it('rekan satu firma TIDAK dapat membaca tugas pribadi orang lain', async () => {
    await expect(
      callerAs(FAJAR, 'Junior Auditor').state.get({ scope: 'user', scopeId: DIMAS, key: 'mt.personal' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: 'not-owner' });
  });

  it('rekan satu firma TIDAK dapat menulis-balik tugas pribadi orang lain', async () => {
    await expect(
      callerAs(FAJAR, 'Junior Auditor').state.set({
        scope: 'user', scopeId: DIMAS, key: 'mt.personal', value: [], baseVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: 'not-owner' });
    // dan dokumennya memang utuh — penolakannya bukan kosmetik
    const still = await callerAs(DIMAS, 'Senior Auditor').state.get({ scope: 'user', scopeId: DIMAS, key: 'mt.personal' });
    expect(Array.isArray(still.value) && (still.value as unknown[]).length).toBe(1);
  });
});
