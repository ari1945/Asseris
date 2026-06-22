/* Wedge MVP F5 — uji segel offline: round-trip seal/verify + deteksi tamper.
   (Di node: jalur Ed25519 bila didukung webcrypto, jika tidak fallback sha256-only —
   kedua jalur harus round-trip benar & menolak konten yang diubah.) */
import { describe, it, expect } from 'vitest';
import { sealText, verifySealText, sha256Hex } from './seal';

describe('seal offline', () => {
  it('sha256Hex menghasilkan 64 hex', async () => {
    expect(await sha256Hex('abc')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('round-trip: konten sama → terverifikasi', async () => {
    const text = JSON.stringify({ k: 'kertas-kerja', n: 4 });
    const s = await sealText(text);
    expect(s.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(['Ed25519', 'sha256-only']).toContain(s.alg);
    expect(await verifySealText(text, s)).toBe(true);
  });

  it('tamper: konten diubah → verifikasi gagal', async () => {
    const s = await sealText('konten asli kertas kerja');
    expect(await verifySealText('konten DIUBAH', s)).toBe(false);
  });
});
