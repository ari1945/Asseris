/* ============================================================
   Tanda tangan kertas kerja yang benar-benar TERSIMPAN (SA 230).

   Panel sign-off bersama (`WpPanel`, dipakai hampir setiap modul) menulis
   `{ by: me, at: wpToday() }`. Server menolak setiap klik:

     POST /trpc/state.set → 403
     signature-missing-identity:wp:jet.preparer:
       Tanda tangan Preparer tanpa identitas penanda tangan.

   dan penolakannya TAK TERLIHAT, karena `flush()` memperlakukan 403 seperti
   offline: nilai lokal dipertahankan, tak ada pemberitahuan. Auditor menekan
   tombol, melihat namanya muncul di rantai, dan tidak ada apa pun yang
   tersimpan. Diverifikasi hidup 2026-08-22 pada modul `jet`.

   Gerbang di bawah memakai VALIDATOR SERVER YANG SESUNGGUHNYA
   (`signatureAttributionViolations`, yang dipanggil `server/src/signoff.ts`) —
   bukan salinan aturan yang ditulis ulang di sini. Kalau aturan servernya
   berubah, uji ini ikut berubah dengan sendirinya; itulah gunanya.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { signatureAttributionViolations, WP_SIGNATURE_SKEW_MS } from './wp_chain';
import type { WpActor, WpChain } from './wp_chain';
import { buildWpSignature, wpSignBlock, wpUnsignBlock } from './wp_signature';
import { isRejected, rejectionMessage } from './api';

const SRC = dirname(fileURLToPath(import.meta.url));
const kode = (f: string): string =>
  readFileSync(join(SRC, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const NOW = Date.parse('2026-08-22T11:00:00.000Z');
const ISO = new Date(NOW).toISOString();
const AKTOR: WpActor = { id: 'WHR-AM-0142', name: 'Anindya Pramesti' };
const LAIN: WpActor = { id: 'WHR-EP-0001', name: 'Hartono Wijaya' };

const kodePelanggaran = (sig: { byUserId?: unknown; display?: unknown; at?: unknown }): string[] =>
  signatureAttributionViolations(sig, 'Preparer', AKTOR, NOW).map(v => v.code);

/* Bentuk simpanan `wpState.chain` → bentuk yang dibaca validator. */
const asValidatorInput = (sig: { by?: string; byUserId?: string; at?: string } | null) =>
  ({ byUserId: sig?.byUserId, display: sig?.by, at: sig?.at });

/* ============================================================
   (a) Bentuk LAMA memang ditolak — dan bentuk BARU memang diterima.
   ============================================================ */
describe('W1 — tanda tangan panel bersama lolos validator server', () => {
  it('bentuk LAMA `{ by, at: wpToday() }` ditolak dua kali (identitas + waktu)', () => {
    const lama = { by: 'Anindya Pramesti', at: '09 Mar 2026' };
    expect(kodePelanggaran(asValidatorInput(lama)).sort())
      .toEqual(['signature-missing-identity', 'signature-missing-timestamp']);
  });

  it('bentuk BARU `buildWpSignature(...)` lolos TANPA satu pun pelanggaran', () => {
    const sig = buildWpSignature(AKTOR, ISO, 'abc123');
    expect(sig).not.toBeNull();
    expect(kodePelanggaran(asValidatorInput(sig))).toEqual([]);
  });

  it('tanda tangan menyebut SIAPA, KAPAN, dan ATAS APA', () => {
    const sig = buildWpSignature(AKTOR, ISO, 'abc123');
    expect(sig).toEqual({ by: 'Anindya Pramesti', byUserId: 'WHR-AM-0142', at: ISO, contentHash: 'abc123' });
  });

  it('tanpa identitas sesi TIDAK ada tanda tangan — bukan tanda tangan tanpa nama', () => {
    expect(buildWpSignature(null, ISO, 'h')).toBeNull();
    expect(buildWpSignature({ id: '', name: 'X' }, ISO, 'h')).toBeNull();
    expect(buildWpSignature({ id: 'X', name: '' }, ISO, 'h')).toBeNull();
    expect(buildWpSignature(AKTOR, '', 'h')).toBeNull();
  });

  it('stempel WAJIB jam NYATA — klok perikatan (AMS.TODAY) ditolak sebagai basi', () => {
    /* Ini yang membuat tanda tangan BEDA dari stempel kertas kerja biasa: ia
       diperiksa terhadap jam SERVER dalam jendela 10 menit. */
    const lampau = new Date(NOW - WP_SIGNATURE_SKEW_MS - 60_000).toISOString();
    expect(kodePelanggaran(asValidatorInput(buildWpSignature(AKTOR, lampau, 'h'))))
      .toEqual(['signature-stale-timestamp']);
    const depan = new Date(NOW + WP_SIGNATURE_SKEW_MS + 60_000).toISOString();
    expect(kodePelanggaran(asValidatorInput(buildWpSignature(AKTOR, depan, 'h'))))
      .toEqual(['signature-future-timestamp']);
  });

  it('tanda tangan atas nama orang lain ditolak', () => {
    expect(kodePelanggaran(asValidatorInput(buildWpSignature(LAIN, ISO, 'h'))).sort())
      .toEqual(['signature-identity-mismatch', 'signature-name-mismatch']);
  });
});

/* ============================================================
   (b) Slot yang tak boleh ditandatangani, DIKATAKAN alasannya.
   ============================================================ */
describe('W2 — gerbang slot mencerminkan aturan server', () => {
  const kosong: WpChain = {};
  const adaPreparer: WpChain = { preparer: { by: 'Anindya Pramesti', byUserId: 'WHR-AM-0142', at: ISO } };

  it('tanpa identitas sesi, tak ada slot yang dapat ditandatangani', () => {
    expect(wpSignBlock({ chain: kosong, slot: 'preparer', actor: null }))
      .toMatch(/Identitas sesi belum diketahui/);
  });

  it('perikatan terkunci memblokir lebih dulu', () => {
    expect(wpSignBlock({ chain: kosong, slot: 'preparer', actor: AKTOR, locked: true }))
      .toMatch(/terkunci/);
  });

  it('Reviewer tak dapat ditandatangani sebelum Preparer (R3 urutan rantai)', () => {
    expect(wpSignBlock({ chain: kosong, slot: 'reviewer', actor: AKTOR }))
      .toMatch(/sebelum/);
    expect(wpSignBlock({ chain: adaPreparer, slot: 'reviewer', actor: LAIN })).toBe('');
  });

  it('satu orang tak dapat memegang dua langkah (R4 — SMM 2 / SA 220.36)', () => {
    /* Inilah yang dulu terjadi OTOMATIS: slot reviewer mengisi slot preparer yang
       kosong atas nama penekan tombol reviewer. */
    expect(wpSignBlock({ chain: adaPreparer, slot: 'reviewer', actor: AKTOR })).not.toBe('');
  });

  it('preparer pada kertas kerja kosong boleh ditandatangani', () => {
    expect(wpSignBlock({ chain: kosong, slot: 'preparer', actor: AKTOR })).toBe('');
  });
});

describe('W3 — penarikan tanda tangan (R6)', () => {
  const milikAktor: WpChain = { preparer: { by: 'Anindya Pramesti', byUserId: 'WHR-AM-0142', at: ISO } };

  it('hanya penandatangannya sendiri yang dapat menarik tanda tangan Preparer', () => {
    expect(wpUnsignBlock({ chain: milikAktor, slot: 'preparer', actor: AKTOR })).toBe('');
    expect(wpUnsignBlock({ chain: milikAktor, slot: 'preparer', actor: LAIN }))
      .toMatch(/penandatangannya sendiri/);
  });

  it('tak dapat ditarik setelah rantai berlanjut', () => {
    const lanjut: WpChain = { ...milikAktor, reviewer: { by: 'Hartono Wijaya', byUserId: 'WHR-EP-0001', at: ISO } };
    expect(wpUnsignBlock({ chain: lanjut, slot: 'preparer', actor: AKTOR }))
      .toMatch(/sudah berlanjut/);
  });

  it('slot non-preparer tidak diatur di sini (murni kapabilitas)', () => {
    expect(wpUnsignBlock({ chain: milikAktor, slot: 'reviewer', actor: AKTOR })).toBe('');
  });
});

/* ============================================================
   (c) DITOLAK vs GAGAL SAMPAI — klasifikasi yang menentukan apakah
       layar boleh terus menampilkan nilai yang tak tersimpan.
   ============================================================ */
describe('W4 — penolakan server dibedakan dari kegagalan transport', () => {
  const trpc = (code: string, httpStatus: number, message = 'x: pesan') =>
    ({ message, data: { code, httpStatus } });

  it('403 FORBIDDEN = DITOLAK', () => {
    expect(isRejected(trpc('FORBIDDEN', 403))).toBe(true);
  });

  it('400 BAD_REQUEST & 412 PRECONDITION_FAILED = DITOLAK', () => {
    expect(isRejected(trpc('BAD_REQUEST', 400))).toBe(true);
    expect(isRejected(trpc('PRECONDITION_FAILED', 412))).toBe(true);
  });

  it('409 CONFLICT BUKAN penolakan — ia punya jalur pemulihannya sendiri', () => {
    expect(isRejected(trpc('CONFLICT', 409))).toBe(false);
  });

  it('401 BUKAN penolakan — sesi kedaluwarsa tak boleh membuang suntingan yang sah', () => {
    expect(isRejected(trpc('UNAUTHORIZED', 401))).toBe(false);
  });

  it('kegagalan transport (tanpa amplop tRPC) BUKAN penolakan', () => {
    expect(isRejected(new Error('Failed to fetch'))).toBe(false);
    expect(isRejected(null)).toBe(false);
    expect(isRejected(undefined)).toBe(false);
  });

  it('pesan yang ditampilkan adalah kalimat server, bukan kode mentahnya', () => {
    expect(rejectionMessage({
      message: 'signature-missing-identity:wp:jet.preparer: Tanda tangan Preparer tanpa identitas penanda tangan.',
    })).toBe('Tanda tangan Preparer tanpa identitas penanda tangan.');
    expect(rejectionMessage({ message: '' })).toMatch(/tanpa keterangan/);
  });
});

/* ============================================================
   (d) Gerbang sumber — pola lama tidak boleh kambuh.
   ============================================================ */
describe('W5 — konvensi sumber wp_signoff.tsx', () => {
  it('tanda tangan dibentuk lewat buildWpSignature, bukan objek literal', () => {
    const src = kode('wp_signoff.tsx');
    expect(src).toMatch(/buildWpSignature\(/);
    expect(src).toMatch(/wpSignatureStamp\(\)/);
  });

  it('nol slot rantai yang diisi objek literal (harus lewat buildWpSignature)', () => {
    const src = kode('wp_signoff.tsx');
    const buruk = [...src.matchAll(/(preparer|reviewer|partner|eqr)\s*:\s*\{/g)].map(m => m[0]);
    expect(buruk, `slot diisi literal, bukan tanda tangan lengkap: ${buruk.join(' | ')}`).toEqual([]);
  });

  it('nol nama pengganti "Auditor" pada identitas penanda tangan', () => {
    expect(kode('wp_signoff.tsx').includes("'Auditor'"), 'fallback nama "Auditor" masih ada').toBe(false);
  });

  it('slot reviewer tidak lagi mengisi slot preparer yang kosong', () => {
    const src = kode('wp_signoff.tsx');
    expect(src.includes('chain.preparer || {'), 'pengisian otomatis preparer masih ada').toBe(false);
  });
});
