/* ============================================================
   F-3 · VERSI ALGORITMA PAYLOAD tercatat pada tiap segel.

   Server tidak pernah menghitung ulang hash — ia membandingkan hash yang
   DISERAHKAN dengan yang tersimpan. Karena itu satu-satunya cara sebuah
   verifier (kini atau nanti) dapat mereproduksi hash artefak LAMA adalah dengan
   mengetahui ALGORITMA MANA yang dipakai saat artefak itu ditandatangani. Tanpa
   kolom ini, mengubah definisi payload — persis yang dilakukan F-3 — membuat
   artefak audit yang sah tampak palsu (R-1 PRD prd-export-seal-identity-ssot).

   Yang dipaku:
     · segel BARU menyimpan versi yang disebut klien;
     · segel dari klien LAMA (tanpa `sealFormat`) tercatat V1 — pernyataan fakta,
       bukan sekadar nilai isian: itu memang algoritma yang mereka pakai;
     · `verifySeal` MENGEMBALIKAN versinya, supaya verifier tahu algoritma mana.
   ============================================================ */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';

function callerAs(role: string, id: string) {
  const user = { id, role } as unknown as User;
  return createCallerFactory(appRouter)({ user, token: 'test' });
}

const SFIRM = 'SF-FIRM';
const SCLI = 'SF-CLI';
const SENG = 'SF-ENG';
const PARTNER = 'SF-partner';

const H = (c: string) => c.repeat(64);

beforeAll(async () => {
  await prisma.firm.create({ data: { id: SFIRM, name: 'Seal Format Firm', short: 'SF' } });
  await prisma.client.create({ data: { id: SCLI, firmId: SFIRM, name: 'Seal Format Client' } });
  await prisma.engagement.create({ data: { id: SENG, firmId: SFIRM, clientId: SCLI } });
  await prisma.user.create({ data: { id: PARTNER, firmId: SFIRM, name: 'SF Partner', role: 'Engagement Partner', dataJson: '{}' } });
});

afterAll(async () => {
  await prisma.seal.deleteMany({ where: { scopeId: { in: [SENG, 'FIRM-SF'] } } });
  await prisma.engagement.deleteMany({ where: { id: SENG } });
  await prisma.user.deleteMany({ where: { id: PARTNER } });
  await prisma.client.deleteMany({ where: { id: SCLI } });
  await prisma.firm.deleteMany({ where: { id: SFIRM } });
  await prisma.$disconnect();
});

describe('F-3 — sealFormat tercatat & dikembalikan', () => {
  it('klien yang menyebut sealFormat:2 ⇒ tersimpan 2 dan dikembalikan verifySeal', async () => {
    const caller = callerAs('Engagement Partner', PARTNER);
    const seal = await caller.exporter.seal({
      kind: 'opinion', contentHash: H('a'), scope: 'engagement', scopeId: SENG, sealFormat: 2,
    });
    const row = await prisma.seal.findUnique({ where: { id: seal.sealId } });
    expect(row?.sealFormat).toBe(2);

    const v = await caller.exporter.verifySeal({ sealId: seal.sealId, contentHash: H('a') });
    expect(v).toMatchObject({ valid: true, sealFormat: 2 });
  });

  it('klien LAMA (tanpa sealFormat) ⇒ tercatat V1, bukan versi terbaru', async () => {
    const caller = callerAs('Engagement Partner', PARTNER);
    const seal = await caller.exporter.seal({
      kind: 'opinion', contentHash: H('b'), scope: 'engagement', scopeId: SENG,
    });
    const row = await prisma.seal.findUnique({ where: { id: seal.sealId } });
    expect(row?.sealFormat, 'segel klien lama HARUS V1 — itu memang algoritma mereka').toBe(1);

    const v = await caller.exporter.verifySeal({ sealId: seal.sealId, contentHash: H('b') });
    expect(v).toMatchObject({ valid: true, sealFormat: 1 });
  });

  it('versi di luar rentang yang dikenal DITOLAK, bukan disimpan diam-diam', async () => {
    const caller = callerAs('Engagement Partner', PARTNER);
    await expect(caller.exporter.seal({
      kind: 'opinion', contentHash: H('c'), scope: 'firm', scopeId: 'FIRM-SF', sealFormat: 99,
    } as never)).rejects.toThrow();
  });

  it('ANTI-TAUTOLOGI — versinya DIBACA dari baris, bukan dikarang balasan', async () => {
    const caller = callerAs('Engagement Partner', PARTNER);
    const seal = await caller.exporter.seal({
      kind: 'fs', contentHash: H('d'), scope: 'firm', scopeId: 'FIRM-SF', sealFormat: 2,
    });
    /* Baris diubah langsung. Kalau `verifySeal` mengarang nilainya (mis. selalu
       mengembalikan versi terbaru) alih-alih membacanya, uji ini akan hijau atas
       jawaban yang salah — itulah yang dijaga. */
    await prisma.seal.update({ where: { id: seal.sealId }, data: { sealFormat: 1 } });
    const v = await caller.exporter.verifySeal({ sealId: seal.sealId, contentHash: H('d') });
    expect(v).toMatchObject({ sealFormat: 1 });
  });
});
