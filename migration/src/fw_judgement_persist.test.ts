/* ============================================================
   PR-2 — kontrak DUA-SISI kunci `framework.judgements.v1`

   Jawaban pertimbangan penetapan kerangka disimpan sebagai StateDoc berlingkup
   firma. Kunci firm baru gagal dalam DUA cara yang sama-sama SENYAP, dan
   keduanya hanya terlihat saat dijalankan sungguhan:

     TULIS  `capForWrite('firm', key)` tanpa cabang eksplisit jatuh ke
            FIRM_ADMIN (Partner-only). Seorang Audit Manager menekan "Tidak",
            melihatnya tersimpan di layar, lalu jawabannya ditolak server tanpa
            pesan dan kembali kosong saat reload.

     BACA   `FIRM_STATE_READ_KEYS` di server bersifat opt-in. Kunci yang belum
            diklasifikasikan TIDAK TERBACA — dokumen tersimpan tetapi tak pernah
            kembali, jadi seluruh portofolio tampak "belum dinilai" selamanya.

   Dua berkas terpisah harus sepakat, dan tak ada yang memaksa keduanya berubah
   bersama. Gerbang inilah yang memaksanya.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { capForWrite, CAP, can, ROLES } from './rbac';

const KEY = 'framework.judgements.v1';

describe('PR-2 — kunci jawaban pertimbangan terdaftar di KEDUA sisi', () => {
  it('sisi TULIS: bukan FIRM_ADMIN — Manajer harus bisa menjawab', () => {
    const cap = capForWrite('firm', KEY);
    expect(cap).toBe(CAP.ENGAGEMENT_MANAGE);
    /* Repro cacat: kalau cabangnya hilang, kunci jatuh ke FIRM_ADMIN. */
    expect(cap).not.toBe(CAP.FIRM_ADMIN);
  });

  it('sisi TULIS: Audit Manager benar-benar lolos, Junior tidak', () => {
    const cap = capForWrite('firm', KEY);
    expect(can('Audit Manager', cap)).toBe(true);
    expect(can('Engagement Partner', cap)).toBe(true);
    expect(can('Junior Auditor', cap)).toBe(false);
  });

  it('sisi BACA: kunci ada di FIRM_STATE_READ_KEYS server', () => {
    /* Dibaca sebagai TEKS, bukan diimpor: `server/` adalah proyek TS terpisah
       dengan tsconfig sendiri, dan mengimpornya dari suite `migration` menyeret
       Prisma & db ke dalam runner. Yang perlu dijamin di sini hanya bahwa
       kuncinya terdaftar. */
    const src = readFileSync(join(__dirname, '..', '..', 'server', 'src', 'stateAccess.ts'), 'utf8');
    const awal = src.indexOf('FIRM_STATE_READ_KEYS');
    const akhir = src.indexOf('])', awal);
    expect(awal).toBeGreaterThan(0);
    expect(akhir).toBeGreaterThan(awal);
    const daftar = src.slice(awal, akhir);
    /* Anti-hampa: daftar itu memang berisi banyak kunci. */
    expect(daftar.split("'").length).toBeGreaterThan(100);
    expect(daftar).toContain("'" + KEY + "'");
  });

  it('kuncinya berlingkup FIRMA, bukan perikatan — penetapan mendahului perikatan', () => {
    /* `AMS_PERSIST_SCOPE` hanya memuat kunci yang HARUS menyimpang per
       perikatan; sisanya default firma. Klien dinilai kerangkanya di gerbang
       akseptasi — sebelum perikatan apa pun ada — jadi ia TIDAK boleh terdaftar
       di sana, dan tidak boleh cocok pola kunci per-perikatan. */
    const ctx = readFileSync(join(__dirname, 'contexts.tsx'), 'utf8');
    const awal = ctx.indexOf('const AMS_PERSIST_SCOPE');
    const akhir = ctx.indexOf('};', awal);
    expect(awal).toBeGreaterThan(0);
    expect(ctx.slice(awal, akhir)).not.toContain(KEY);
    expect(/^(psak\d+|syariah|sustain|sectorck|auditcomm|spr2410|presentasi|sakroadmap)\./.test(KEY)).toBe(false);
  });

  it('setiap peran yang dikenal terdefinisi terhadap kapabilitas ini', () => {
    const cap = capForWrite('firm', KEY);
    for (const r of ROLES) expect(typeof can(r, cap)).toBe('boolean');
  });
});
