import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import { auditRetention, type RetentionPolicy } from './canon_smm_documentation';

/* ============================================================
   TRIPWIRE — misatribusi ¶60 tidak boleh kembali.

   SMM 1 ¶60 mewajibkan KAP MENETAPKAN periode retensi dokumentasi
   SISTEM MANAJEMEN MUTU; ia TIDAK menetapkan angka apa pun.
   Aplikasi berulang kali menulis "Retensi 10 tahun (SMM 1)" —
   mengatribusikan angka kepada standar yang justru menyerahkannya
   kepada KAP, sekaligus mencampur dua rezim: dokumentasi PERIKATAN
   (SA 230 & peraturan akuntan publik) vs dokumentasi SISTEM
   MANAJEMEN MUTU (¶60).

   Header `canon_smm_documentation.ts` menyatakan cacat ini DITUTUP
   pada PR-7. Sapuannya ternyata tidak tuntas: empat situs tersisa
   (view_crypto ×2, data_import, view_platform3) dan baru ditemukan
   pada tinjauan PR-8b. Uji ini menutupnya secara permanen — kalau
   frasa itu muncul lagi, CI merah, bukan tinjauan manusia berikutnya.
   ============================================================ */

const SRC = __dirname;
const FORBIDDEN: readonly { readonly re: RegExp; readonly why: string }[] = [
  { re: /Retensi\s+\d+\s+tahun\s*\(SMM\s*1\)/i,
    why: 'mengatribusikan angka retensi kepada SMM 1 — ¶60 menyerahkannya kepada KAP' },
  { re: /\d+\s+tahun\s+sesuai\s+SMM/i,
    why: 'sama — angka retensi diatribusikan ke SMM, bukan ke kebijakan KAP' },
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { out.push(...sourceFiles(p)); continue; }
    if (!/\.(ts|tsx)$/.test(name)) continue;
    if (/\.test\.tsx?$/.test(name)) continue;      // uji ini sendiri memuat polanya
    out.push(p);
  }
  return out;
}

describe('¶60 — angka retensi tidak boleh diatribusikan ke SMM 1', () => {
  const files = sourceFiles(SRC);

  it('menemukan berkas sumber untuk dipindai', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('TRIPWIRE — nol kemunculan frasa misatribusi di seluruh migration/src', () => {
    const hits: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      text.split('\n').forEach((line, i) => {
        for (const rule of FORBIDDEN) {
          if (rule.re.test(line)) hits.push(`${f.slice(SRC.length + 1)}:${i + 1} — ${rule.why}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });
});

describe('¶60 — periode retensi dokumentasi SMM ditetapkan KAP', () => {
  const RET = (AMS as unknown as { QM_DOC_RETENTION: RetentionPolicy & { basis?: string } }).QM_DOC_RETENTION;

  it('seed menetapkan periode, dan menandainya sebagai KEBIJAKAN KAP', () => {
    const a = auditRetention(RET);
    expect(a.compliant).toBe(true);
    expect(a.years).toBe(5);
    expect(RET.basis || '').toMatch(/kebijakan kap/i);
  });

  it('¶60 tidak menetapkan minimum peraturan apa pun pada seed ini', () => {
    expect(RET.regulatoryMinimumYears == null).toBe(true);
  });

  it('belum ditetapkan ⇒ cacat, bukan diam-diam lolos', () => {
    expect(auditRetention({ years: null }).compliant).toBe(false);
  });
});
