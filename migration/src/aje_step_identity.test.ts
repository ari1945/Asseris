/* ============================================================
   PR-E — SATU ORANG, SATU LANGKAH pada rantai persetujuan jurnal.

   PR-B mengikat tiap langkah ke KAPABILITAS. Tetapi kapabilitas bukan
   identitas: `EQR_REVIEW` ada pada PARTNER_BASE, sehingga Engagement
   Partner yang baru saja menandatangani langkahnya sendiri tetap lolos
   di langkah EQR pada jurnal yang SAMA. Terbukti live pada AJE-01:
   Hartono Wijaya menandatangani sebagai Engagement Partner (08 Mei),
   lalu tombol "Setujui & Finalkan" untuk langkah EQR aktif penuh.

   ISQM 2 / SA 220.36 menuntut penelaah yang independen dari tim
   perikatan; yang paling tidak independen adalah orang yang baru saja
   menyetujuinya sendiri.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { stepAuthority } from './view_platform';
import { can, CAP } from './rbac';

interface Step { role: string; name?: string; status?: string }
const item = (step: number, chain: Step[], from = 'Dimas Raharjo') =>
  ({ kind: 'AJE', from, step, chain });

/* Rantai AJE-01 (Rp 2,34 M → ROUTING_RULES menuntut EQR): tiga langkah
   pertama sudah ditandatangani, langkah EQR menunggu. */
const aje01 = (): Step[] => [
  { role: 'Penyusun', name: 'Dimas Raharjo', status: 'approved' },
  { role: 'Audit Manager', name: 'Anindya Pramesti', status: 'approved' },
  { role: 'Engagement Partner', name: 'Hartono Wijaya', status: 'approved' },
  { role: 'EQR Reviewer', name: 'Rudi Gunawan, CPA', status: 'current' },
];

describe('PR-E — penandatangan sebelumnya tak dapat mengisi langkah berikutnya', () => {
  /* Inti PR-E. Sebelum perbaikan, ini mengembalikan ok: true. */
  it('Partner yang sudah tanda tangan DITOLAK di langkah EQR jurnal yang sama', () => {
    const r = stepAuthority(item(3, aje01()), { name: 'Hartono Wijaya', role: 'Rekan Pemimpin' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Engagement Partner/);
    expect(r.reason).toMatch(/dua langkah/);
  });

  /* Perbaikannya tidak boleh melumpuhkan EQR yang sah. */
  it('penelaah lain yang berkapabilitas EQR tetap DITERIMA di langkah yang sama', () => {
    const r = stepAuthority(item(3, aje01()), { name: 'Rudi Gunawan, CPA', role: 'Engagement Partner' });
    expect(r.ok).toBe(true);
    expect(r.reason).toBe('');
  });

  it('Manager tetap ditolak di langkah EQR karena kapabilitas (gerbang PR-B utuh)', () => {
    const r = stepAuthority(item(3, aje01()), { name: 'Sinta Wulandari', role: 'Audit Manager' });
    expect(r.ok).toBe(false);
    expect(can('Audit Manager', CAP.EQR_REVIEW)).toBe(false);
  });

  /* NAMA pada langkah yang belum ditandatangani bukan tanda tangan — kalau
     ia ikut dihitung, penerima tugas akan memblokir dirinya sendiri. */
  it('nama pada langkah yang masih menunggu TIDAK dihitung sebagai tanda tangan', () => {
    const chain: Step[] = [
      { role: 'Penyusun', name: 'Dimas Raharjo', status: 'approved' },
      { role: 'Audit Manager', name: 'Anindya Pramesti', status: 'current' },
      { role: 'Engagement Partner', name: 'Anindya Pramesti', status: 'waiting' },
    ];
    const r = stepAuthority(item(1, chain), { name: 'Anindya Pramesti', role: 'Audit Manager' });
    expect(r.ok).toBe(true);
  });

  it('penyusun tetap ditolak lebih dulu (cek SoD PR-B tak tergantikan)', () => {
    const r = stepAuthority(item(1, aje01()), { name: 'Dimas Raharjo', role: 'Rekan Pemimpin' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/pengajuannya sendiri/);
  });

  /* Jenis non-AJE memakai gerbang lama; PR-E tetap berlaku untuk keduanya
     karena cek identitas berjalan SEBELUM percabangan jenis. */
  it('cek identitas berlaku juga untuk jenis non-AJE', () => {
    const chain: Step[] = [
      { role: 'Pengaju', name: 'Rudi Gunawan', status: 'approved' },
      { role: 'Reviewer', name: 'Hartono Wijaya', status: 'approved' },
      { role: 'Approver', name: 'Hartono Wijaya', status: 'current' },
    ];
    const r = stepAuthority({ kind: 'FAKTUR', from: 'Anindya Pramesti', step: 2, chain },
      { name: 'Hartono Wijaya', role: 'Rekan Pemimpin' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Reviewer/);
  });
});
