/* ============================================================
   Diagnostik Forensik & Pajak — GERBANG SUMBER (prompt 72-diagnostic)
   ------------------------------------------------------------
   Uji ini membaca SUMBERNYA, bukan hasilnya. Alasannya satu: cacat yang
   ditutup di sini adalah cacat ATRIBUSI, dan atribusi yang salah tidak
   memunculkan gejala pada angka mana pun — ia hanya tampak seperti bukti.

   Yang dijaga:
     · nol nama orang tertanam sebagai fallback pelaku keputusan. Nama yang
       dipakai dulu ('Anindya Pramesti', 'Audit Manager') bukan nama karangan —
       ia nama seorang kolega di `AMS.TEAM`. Menutup temuan risiko kecurangan
       dapat tercatat atas nama orang yang tak pernah memutuskannya.
     · nol pembacaan `AMS.USER`. Ia data SEED: sama untuk siapa pun yang login,
       jadi memakainya = mengarang pelaku dengan cara yang lebih halus.
     · nol `new Date()`. Stempel keputusan wajib mengikuti klok SSOT (`AMS.TODAY`)
       dan wajib bertanggal — "14:23" tak dapat ditempatkan pada hari mana pun.
     · label kartu tak menyebut "Detektor aktif" untuk angka yang sebenarnya
       "detektor yang MENGHASILKAN temuan".
     · temuan severity rendah muncul di layar (dihitung lalu dibuang = menghitung
       diam-diam).
     · temuan + keputusan punya jalan keluar sebagai kertas kerja (SA 240).

   Komentar dibuang sebelum dipindai (pola `kode()` di cockpit_conventions.test.ts)
   supaya kutipan pola lama di dokumentasi tak memerahkan gerbangnya sendiri.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';

const BERKAS_DIAG = [
  'diagnostics.ts',
  'diagnostics_panel.tsx',
  'view_diagnostics.tsx',
  'diagnostics_decision.ts',
  'diagnostics_inputs.ts',
  'diagnostics_export.ts',
];

const baca = (nama: string): string => readFileSync(join(__dirname, nama), 'utf8');
const kode = (nama: string): string =>
  baca(nama).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const berkasAda = (nama: string): boolean => existsSync(join(__dirname, nama));
const sumberDiag = (): Array<[string, string]> =>
  BERKAS_DIAG.filter(berkasAda).map((n) => [n, kode(n)] as [string, string]);

/* Nama orang yang HIDUP di seed. Diambil dari data, bukan diketik ulang: kalau
   seed berubah, gerbang ini ikut berubah tanpa disentuh. */
function namaSeed(): string[] {
  const user = (AMS as { USER?: { name?: string } }).USER;
  const team = ((AMS as { TEAM?: Array<{ name?: string }> }).TEAM || []);
  const semua = [user && user.name, ...team.map((t) => t && t.name)];
  return semua
    .map((n) => String(n || '').split(',')[0].trim())
    .filter((n) => n.length > 3);
}

describe('72-diagnostic · D1 — jejak keputusan tak boleh mengarang pelaku', () => {
  it('kalibrasi: daftar nama seed benar-benar terisi', () => {
    expect(namaSeed().length).toBeGreaterThan(3);
  });

  it('nol nama orang dari seed tertanam di kode diagnostik', () => {
    const nama = namaSeed();
    const pelanggar: string[] = [];
    for (const [berkas, src] of sumberDiag()) {
      for (const n of nama) if (src.includes(n)) pelanggar.push(`${berkas}: "${n}"`);
    }
    expect(pelanggar, `nama orang tertanam:\n  ${pelanggar.join('\n  ')}`).toEqual([]);
  });

  it('nol pembacaan `AMS.USER` (data seed, bukan sesi)', () => {
    const pelanggar = sumberDiag()
      .filter(([, src]) => /AMS\s*(&&\s*AMS\s*)?\.\s*USER|AMS\.USER/.test(src))
      .map(([berkas]) => berkas);
    expect(pelanggar, `AMS.USER dibaca di: ${pelanggar.join(', ')}`).toEqual([]);
  });

  it('nol `new Date()` — stempel keputusan mengikuti klok SSOT dan bertanggal', () => {
    const pelanggar = sumberDiag()
      .filter(([, src]) => /new\s+Date\s*\(\s*\)/.test(src))
      .map(([berkas]) => berkas);
    expect(pelanggar, `jam sistem di: ${pelanggar.join(', ')}`).toEqual([]);
  });

  it('panel memakai stempel bertanggal dari modul klok diagnostik', () => {
    expect(kode('diagnostics_panel.tsx')).toMatch(/diagDecisionStamp\s*\(/);
  });
});

describe('72-diagnostic · D3 — detektor bersih ≠ detektor bisu', () => {
  it('label "Detektor aktif" tidak lagi dipakai untuk jumlah detektor ber-temuan', () => {
    const pelanggar = sumberDiag()
      .filter(([, src]) => src.includes('Detektor aktif'))
      .map(([berkas]) => berkas);
    expect(pelanggar, `label menyesatkan di: ${pelanggar.join(', ')}`).toEqual([]);
  });

  it('view menampilkan keadaan "tidak dapat berjalan"', () => {
    const src = kode('view_diagnostics.tsx') + kode('diagnostics_panel.tsx');
    expect(src).toMatch(/tidak dapat berjalan/i);
  });
});

describe('72-diagnostic · D4 — severity rendah ditampilkan, bukan dihitung diam-diam', () => {
  it('view agregat merender nilai `c.low` di bawah label bersever "rendah"', () => {
    const src = kode('view_diagnostics.tsx');
    expect(src, 'c.low tak dirender').toMatch(/value=\{c\.low\}/);
    expect(src, 'label severity rendah tak ada').toMatch(/label="[^"]*[Rr]endah"/);
  });
});

describe('72-diagnostic · D5 — temuan & keputusan punya jalan keluar', () => {
  it('ada ekspor kertas kerja di lapisan diagnostik', () => {
    const src = kode('view_diagnostics.tsx') + kode('diagnostics_panel.tsx');
    expect(src).toMatch(/amsExport/);
  });
});
