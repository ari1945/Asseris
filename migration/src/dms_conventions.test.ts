/* ============================================================
   DMS — gerbang SUMBER atas `view_dms.tsx`.

   Cacat yang dipaku di sini (evaluasi 2026-08-29 §3 C, dua situs tulis):

       const logAccess = (id, action) => patch(id, d => ({ …,
         access: [...(d.access || []), ['Anindya Pramesti', action, pNowTime()]] }));
       owner: 'Anindya Pramesti'   ·   versions: [{ by: 'Anindya Pramesti', … }]
       access: [['Legal KAP', … ]]  (legal hold)

   Berkas ini membaca SUMBERNYA, bukan hasil render, karena cacatnya adalah cacat
   ATRIBUSI: layarnya berfungsi sempurna dan justru itu masalahnya — log akses
   dokumen SA 230 mencatat nama yang sama siapa pun yang menekan tombolnya, dan
   terbaca seolah-olah terbukti.

   Aturan yang ditegakkan sama dengan `apar_conventions.test.ts` A4 untuk jejak
   pembayaran: pelaku HANYA dari sesi, dan tanpa pelaku aksi tulisnya tidak jalan.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* Komentar dibuang lebih dulu: berkas ini mengutip pola lama sebagai catatan
   sejarah, dan gerbang yang memindai komentar akan menuduh catatan itu sendiri. */
const kode = (path: string): string => readFileSync(join(__dirname, path), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

const dms = (): string => kode('view_dms.tsx');

/** Badan satu arrow-function `const <nama> = …` sampai `const ` berikutnya. */
const badan = (nama: string): string => {
  const k = dms();
  const at = k.indexOf('const ' + nama + ' =');
  expect(at, '`' + nama + '` tak ditemukan di view_dms').toBeGreaterThan(-1);
  const sisa = k.slice(at + 6);
  const habis = sisa.indexOf('\n  const ');
  return sisa.slice(0, habis === -1 ? 900 : habis);
};

describe('DMS · pelaku jejak dokumen dari sesi', () => {
  it('tidak ada nama orang sebagai literal pelaku', () => {
    const k = dms();
    /* Nama-nama ini hidup sah di `data_firmfin`/`data_fpm` sebagai DATA; yang
       dilarang adalah kemunculannya di view sebagai pelaku sebuah aksi tulis. */
    for (const nama of ['Anindya Pramesti', 'Hartono Wijaya', 'Legal KAP']) {
      expect(k, 'pelaku karangan di view_dms: ' + nama).not.toContain(nama);
    }
  });

  it('pelaku diturunkan dari sesi lewat `sessionActor`', () => {
    const k = dms();
    expect(k).toMatch(/sessionActor\s*\(\s*auth\s*&&\s*auth\.user\s*\)/);
    /* `useCurrentAuditor()` SENGAJA jatuh ke `AMS.USER.name` — benar untuk memfilter
       tampilan, tetapi itu persis cacat ini bila dipakai untuk atribusi tulis. */
    expect(k).not.toMatch(/useCurrentAuditor/);
    expect(k).not.toMatch(/AMS\s*\.\s*USER/);
  });

  it('`logAccess` menolak menulis tanpa pelaku sesi', () => {
    const b = badan('logAccess');
    expect(b).toMatch(/if\s*\(\s*!\s*actor\s*\)\s*return\s*;/);
    expect(b).toMatch(/\[\s*actor\s*,\s*action\s*,/);
  });

  it('`toggleHold` menolak menulis tanpa pelaku sesi', () => {
    const b = badan('toggleHold');
    expect(b).toMatch(/if\s*\(\s*!\s*actor\s*\)\s*return\s*;/);
    expect(b).toMatch(/\[\s*actor\s*,/);
  });

  it('`addDoc` menolak mengarsipkan tanpa pelaku sesi', () => {
    const b = badan('addDoc');
    expect(b).toMatch(/if\s*\(\s*!\s*actor\s*\)\s*return\s*;/);
    expect(b).toMatch(/owner:\s*actor/);
    expect(b).toMatch(/by:\s*actor/);
  });

  it("'Sistem' dipertahankan sebagai pelaku pemindaian", () => {
    /* Pemindai antivirus memang bukan orang. Gerbang di atas tidak boleh mendorong
       orang mengganti baris ini dengan nama manusia demi lolos. */
    expect(badan('addDoc')).toMatch(/\[\s*'Sistem'\s*,\s*'scan'/);
  });

  it('kontrol tulisnya dimatikan (bukan diam-diam no-op) saat sesi tak beridentitas', () => {
    const k = dms();
    /* Tiga tombol drawer + tombol unggah: tanpa `disabled`, pengguna menekan tombol
       yang tak melakukan apa pun dan menyangka dokumennya tercatat. */
    expect(k.match(/disabled=\{!actor\}/g) || []).toHaveLength(4);
    expect(k.match(/title=\{actor \? undefined : NO_ACTOR_TITLE\}/g) || []).toHaveLength(5);
  });
});
