/* ============================================================
   Gerbang SC-6 — nol identitas perikatan/firma demo di jalur produksi
   (PRD docs/prd-identitas-firma-sesi.md PR-C, keputusan "Ketiga kelas" 2026-11-28).

   Tiga kelas yang dipaku:
     (1) fallback string    `firm?.activeEngagement?.id || 'ENG-2025-014'`
     (2) fallback objek     `firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' }`
     (3) literal identitas  `` `${client} · ENG-2025-014 · FY2025` `` (sebagian di meta artefak ekspor)
   ditambah konstanta `DEFAULT_ENG_ID` dan literal `FIRM-WHR`.

   Sensus lama ([[asseris-eng-fallback-kelas-tulis]]) menghitung "17 situs" karena regex-nya hanya
   mencari bentuk (1); bentuk (2) dan (3) tak pernah terhitung. Gerbang ini mencari LITERALNYA,
   apa pun bentuk sintaksnya.

   Komentar DIBUANG dengan tokenizer (bukan regex) sebelum dicari: komentar di repo ini sering
   mengutip cacat lama secara harfiah, dan gerbang yang membaca komentar sebagai kode akan memaksa
   orang menghapus sejarah yang berguna ([[asseris-sales-pipeline-arc]]). String & template literal
   DIPERTAHANKAN — di sanalah kelas (3) tinggal.

   Satu-satunya tempat sah untuk literal ini: berkas data seed `data_*.ts`, yang MEMILIKI baris
   demo (lihat `data_seed_firm.ts`).
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = __dirname;
const FORBIDDEN = ['ENG-2025-014', 'FIRM-WHR', 'DEFAULT_ENG_ID'];

/** Buang komentar blok & baris; pertahankan string, template, dan nomor baris. */
function stripComments(s: string): string {
  let out = '';
  let mode: null | 'b' | 'l' | '"' | "'" | '`' = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const d = s[i + 1];
    if (mode === null) {
      if (c === '/' && d === '*') { mode = 'b'; out += '  '; i++; continue; }
      if (c === '/' && d === '/') { mode = 'l'; out += '  '; i++; continue; }
      if (c === '"' || c === "'" || c === '`') mode = c;
      out += c;
      continue;
    }
    if (mode === 'b') {
      if (c === '*' && d === '/') { mode = null; out += '  '; i++; continue; }
      out += c === '\n' ? '\n' : ' ';
      continue;
    }
    if (mode === 'l') {
      if (c === '\n') { mode = null; out += '\n'; } else out += ' ';
      continue;
    }
    if (c === '\\') { out += c + (d ?? ''); i++; continue; }
    if (c === mode) mode = null;
    else if (c === '\n' && mode !== '`') mode = null; // string satu-baris tak tertutup (regex literal dsb.)
    out += c;
  }
  return out;
}

const productionFiles = readdirSync(SRC).filter(
  (f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) && !/\.d\.ts$/.test(f) && !/^data_/.test(f),
);

function census(): string[] {
  const hits: string[] = [];
  for (const f of productionFiles) {
    const lines = stripComments(readFileSync(join(SRC, f), 'utf8')).split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const lit of FORBIDDEN) if (line.includes(lit)) hits.push(`${f}:${i + 1} ${lit}`);
    });
  }
  return hits;
}

describe('prasyarat gerbang — tokenizer & cakupan benar-benar bekerja', () => {
  it('komentar dibuang, string & template dipertahankan', () => {
    const src = "const a = 'X1'; // X2\n/* X3 */ const b = `X4 ${'X5'}`;";
    const out = stripComments(src);
    expect(out).toContain('X1');
    expect(out).toContain('X4');
    expect(out).toContain('X5');
    expect(out).not.toContain('X2');
    expect(out).not.toContain('X3');
  });

  it('URL dalam string tidak dianggap komentar', () => {
    expect(stripComments("const u = 'https://x.test/FIRM-WHR';")).toContain('FIRM-WHR');
  });

  it('cakupan berkas tidak vakum: modul produksi besar ikut dipindai, data seed tidak', () => {
    expect(productionFiles.length).toBeGreaterThan(150);
    expect(productionFiles).toContain('contexts.tsx');
    expect(productionFiles).toContain('view_psak1.tsx');
    expect(productionFiles.some((f) => f.startsWith('data_'))).toBe(false);
  });
});

describe('SC-6 — nol literal identitas demo di jalur produksi', () => {
  it('ENG-2025-014 / FIRM-WHR / DEFAULT_ENG_ID hanya hidup di data seed', () => {
    expect(census()).toEqual([]);
  });
});
