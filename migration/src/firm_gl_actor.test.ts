/* ============================================================
   Firm GL — atribusi jejak posting jurnal (G3).

   Sebelum perbaikan, view_firmgl.tsx:44 berbunyi:
       const who = (AMS.USER && AMS.USER.name) || 'Pengguna';
   dan nilai itu dipakai pada `logActivity({ who, action: 'GL_POST', … })` di dua
   tempat. `AMS.USER` adalah seed. Jejak posting jurnal karena itu mencatat nama yang
   tak ada hubungannya dengan siapa yang menekan tombol — dan bila seed kosong,
   mencatat literal 'Pengguna'.

   Yang diuji di sini adalah PERILAKUNYA: tanpa identitas sesi, aksi tulis GL tidak
   boleh dijalankan sama sekali (bukan dijalankan lalu dicatat atas nama fallback).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { glActor, glWriteAllowed, glWriteBlockReason } from './firm_gl_actor';

describe('glActor — pelaku hanya dari sesi', () => {
  it('tanpa sesi → null (tidak ada fallback)', () => {
    expect(glActor(null)).toBe(null);
    expect(glActor(undefined)).toBe(null);
    expect(glActor({})).toBe(null);
    expect(glActor({ id: 'USER-1' })).toBe(null);
    expect(glActor({ name: '' })).toBe(null);
    expect(glActor({ name: '   ' })).toBe(null);
  });

  it('dengan sesi → nama sesi apa adanya', () => {
    expect(glActor({ id: 'USER-9', name: 'Hartono Wijaya, CPA' })).toBe('Hartono Wijaya, CPA');
    expect(glActor({ id: 'USER-9', name: '  Dimas Raharjo  ' })).toBe('Dimas Raharjo');
  });

  /* Jaring anti-kambuh: kalau seseorang mengembalikan fallback seed, nama seed akan
     muncul dari sesi kosong. Nilainya dibaca dari data, bukan diketik ulang di sini. */
  it('sesi kosong TIDAK pernah menghasilkan nama dari AMS.USER', () => {
    const seedName = ((AMS.USER || {}) as { name?: string }).name || '';
    expect(seedName).not.toBe('');       // premis: seed memang punya nama
    expect(glActor(null)).not.toBe(seedName);
    expect(glActor({})).not.toBe(seedName);
  });
});

describe('glWriteAllowed — tulis GL butuh kapabilitas DAN pelaku', () => {
  it('tanpa pelaku sesi, aksi tulis tidak dijalankan meski punya kapabilitas', () => {
    expect(glWriteAllowed(true, null)).toBe(false);
  });

  it('tanpa kapabilitas, aksi tulis tidak dijalankan meski pelaku ada', () => {
    expect(glWriteAllowed(false, 'Hartono Wijaya, CPA')).toBe(false);
  });

  it('keduanya ada → boleh', () => {
    expect(glWriteAllowed(true, 'Hartono Wijaya, CPA')).toBe(true);
  });

  it('alasan penolakan membedakan SoD dari identitas yang hilang', () => {
    expect(glWriteBlockReason(false, null)).toContain('SoD');
    expect(glWriteBlockReason(true, null)).toContain('Identitas sesi');
    expect(glWriteBlockReason(true, 'Hartono Wijaya, CPA')).toBe('');
  });
});
