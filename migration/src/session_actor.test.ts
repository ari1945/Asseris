/* ============================================================
   Aturan pelaku tulis — `sessionActor` dan delegasi `glActor` kepadanya.

   `firm_gl_actor.ts` memaku aturan ini lebih dulu untuk posting jurnal firma;
   DMS memerlukan aturan yang sama untuk log akses SA 230. Aturannya dipindah ke
   `session_actor.ts` dan `glActor` mendelegasikan — berkas ini menjaga agar
   pemindahan itu tidak diam-diam mengubah perilaku yang sudah dikunci
   `firm_gl_actor.test.ts`, dan agar dua pemakainya tak pernah berbeda.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { sessionActor } from './session_actor';
import { glActor } from './firm_gl_actor';

describe('sessionActor — pelaku hanya dari sesi', () => {
  it('sesi absen ⇒ null (bukan literal pengganti)', () => {
    expect(sessionActor(null)).toBe(null);
    expect(sessionActor(undefined)).toBe(null);
    expect(sessionActor({})).toBe(null);
  });

  it('sesi tanpa nama ⇒ null walau punya id', () => {
    expect(sessionActor({ id: 'USER-1' })).toBe(null);
    expect(sessionActor({ id: 'USER-1', name: '' })).toBe(null);
    expect(sessionActor({ id: 'USER-1', name: '   ' })).toBe(null);
  });

  it('nama sesi dipangkas spasi dan dipakai apa adanya', () => {
    expect(sessionActor({ name: 'Rina Kusuma' })).toBe('Rina Kusuma');
    expect(sessionActor({ name: '  Rina Kusuma  ' })).toBe('Rina Kusuma');
  });

  it('nama bertipe bukan-string diperlakukan sebagai tak ada', () => {
    expect(sessionActor({ name: 42 } as unknown as { name?: string })).toBe(null);
  });
});

describe('glActor tetap aturan yang sama', () => {
  it('mendelegasikan ke sessionActor — bukan salinan kedua', () => {
    expect(glActor).toBe(sessionActor);
  });

  /* Kalau delegasi ini pernah dilepas jadi salinan, kasus di bawah adalah yang
     paling mungkin berbeda diam-diam: satu sisi memangkas spasi, sisi lain tidak. */
  it('jawaban keduanya identik pada kasus batas', () => {
    const kasus = [null, undefined, {}, { id: 'U' }, { name: '' }, { name: ' ' }, { name: ' Budi ' }];
    for (const k of kasus) expect(glActor(k as never)).toBe(sessionActor(k as never));
  });
});
