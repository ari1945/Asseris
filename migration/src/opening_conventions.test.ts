/* ============================================================
   Saldo Awal (SA 510) — gerbang SUMBER atas `view_opening.tsx`.

   Cacat yang ditutup arc ini bukan angka yang salah. Modul ini MENYATAKAN bahwa
   pekerjaan audit telah dilakukan: `OB_SPECIFIC` memuat prosedur dalam bentuk
   telah-dikerjakan, nama dokumen bukti bertanggal ("Berita Acara Opname 28 Des
   2024"), dan kesimpulan `result: 'Memadai'`; `OB_POLICY` memuat `ok: true` —
   kesimpulan bahwa kebijakan konsisten; `OB_OPINION_MATRIX` memuat
   `status: 'clear'` dengan catatan "Tidak ditemukan salah saji saldo awal".
   Semuanya konstanta modul: identik untuk setiap klien dan setiap perikatan.

   Dua fabrikasi lain ditemukan saat investigasi dan ikut dijaga di sini:
     · nama KAP pendahulu literal ('KAP Sutrisno, Bambang & Rekan') — dan ia
       BUKAN berhenti di layar: `buildMemoInput` mengirimnya ke memo TERSEGEL
       lewat `predecessorName`;
     · blok tanda tangan dengan tiga nama personel dan tanggal `done: true`,
       padahal `opening` tak pernah terdaftar di `WP_MODULE_MAP` — sign-off itu
       tak pernah ada.

   Gerbang ini membaca SUMBERNYA. Kalau ada yang menuliskan ulang pola lama, merah.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tieOutPriorYear } from './prior_year';
import type { PriorYearSource } from './prior_year';

/* Komentar dibuang lebih dulu: berkas ini mengutip pola lama sebagai catatan
   sejarah, dan gerbang yang memindai komentar akan menuduh catatan itu sendiri. */
const kode = (path: string): string => readFileSync(join(__dirname, path), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

const opening = (): string => kode('view_opening.tsx');

/* ------------------------------------------------------------------
   (a) Nol kesimpulan hasil audit yang tertanam sebagai konstanta.
   ------------------------------------------------------------------ */
describe('O1 · modul tidak menyatakan hasil prosedur audit', () => {
  it("nol disposisi kesimpulan ('Memadai' / 'Dalam Proses') sebagai nilai konstanta", () => {
    /* Kata 'Memadai' sah sebagai PILIHAN yang dapat dipilih auditor (taksonomi
       WP_DISPOSITIONS). Yang dilarang adalah ia menjadi NILAI sebuah field —
       `result: 'Memadai'` — yaitu jawaban yang sudah terisi. */
    const hit = [...opening().matchAll(/\b(result|hasil|disposisi)\s*:\s*'(Memadai|Dalam Proses|Tidak Memadai)'/g)]
      .map((m) => m[0]);
    expect(hit, 'kesimpulan terisi: ' + hit.join(' | ')).toEqual([]);
  });

  it('nol rujukan bukti bertanggal — dokumen yang "telah diperoleh"', () => {
    /* "Berita Acara Opname 28 Des 2024" · "Laporan aktuaria 31 Des 2024 (audited)".
       Tanggal pada nama dokumen adalah yang membuatnya berhenti jadi saran dan
       mulai jadi pernyataan bahwa dokumen itu ada di tangan. */
    const bulan = 'Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des|Januari|Februari|Maret|April|Juni|Juli|Agustus|September|Oktober|November|Desember';
    const hit = [...opening().matchAll(new RegExp(`\\b\\d{1,2}\\s+(?:${bulan})\\s+\\d{4}\\b`, 'g'))].map((m) => m[0]);
    expect(hit, 'bukti/tanggal tertanam: ' + hit.join(' | ')).toEqual([]);
  });

  it('nol kesimpulan konsistensi kebijakan yang sudah terjawab (`ok:`)', () => {
    const hit = [...opening().matchAll(/\bok\s*:\s*(true|false)/g)].map((m) => m[0]);
    expect(hit, 'kebijakan sudah dinilai: ' + hit.join(' | ')).toEqual([]);
  });

  it("nol status matriks opini yang sudah dinilai ('clear' / 'watch')", () => {
    const hit = [...opening().matchAll(/\bstatus\s*:\s*'(clear|watch)'/g)].map((m) => m[0]);
    expect(hit, 'kondisi SA 510 ¶10–13 sudah dijawab: ' + hit.join(' | ')).toEqual([]);
  });

  it('nol klaim naratif bahwa bukti cukup & tepat telah diperoleh', () => {
    /* Paragraf "Kesimpulan Auditor" dulu berbunyi: "kami memperoleh bukti audit
       yang cukup dan tepat bahwa saldo awal … tidak mengandung salah saji".
       Kalimat itu tampil untuk setiap perikatan, termasuk yang belum punya
       sumber TA-1 sama sekali. Kutipan KEWAJIBAN dari SA 510 ("auditor harus
       memperoleh …") tetap sah; klaim orang-pertama tidak. */
    const src = opening();
    const hit = [...src.matchAll(/\b(kami|telah)\s+memperoleh\s+bukti[^<{]*/gi)].map((m) => m[0].slice(0, 80));
    expect(hit, 'klaim perolehan bukti: ' + hit.join(' | ')).toEqual([]);
  });

  it("nol klaim bahwa tidak ditemukan salah saji / carry-forward terverifikasi", () => {
    const hit = [...opening().matchAll(/Tidak ditemukan salah saji|carry-forward terverifikasi|Bukti memadai diperoleh/gi)]
      .map((m) => m[0]);
    expect(hit, 'temuan dikarang: ' + hit.join(' | ')).toEqual([]);
  });
});

/* ------------------------------------------------------------------
   (f) Identitas pihak ketiga & opini TA-1 bukan literal.
   ------------------------------------------------------------------ */
describe('O1+ · identitas dan opini periode lalu bukan karangan modul', () => {
  it('nol nama KAP pendahulu literal', () => {
    const hit = [...opening().matchAll(/'KAP [^']*'/g)].map((m) => m[0]);
    expect(hit, 'nama KAP literal: ' + hit.join(' | ')).toEqual([]);
  });

  it('nol opini TA-1 yang dituliskan modul alih-alih dibaca dari data klien', () => {
    /* `PRIOR_YEAR` (data_part1) menyimpan opini TA-1 per klien dan modul
       Keberlanjutan sudah mem-persist-nya lewat `useAmsPersist('priorYear', …)`.
       Tiga dari tujuh klien seed BUKAN WTP (C-031 = WDP, C-040 = WTP-EoM),
       sehingga badge "Wajar Tanpa Modifikasian" yang ditulis di sini salah
       untuk perikatan mereka. */
    const src = opening();
    const hit = [...src.matchAll(/Wajar Tanpa Modifikasian|v="WTP"|>WTP</g)].map((m) => m[0]);
    expect(hit, 'opini TA-1 literal: ' + hit.join(' | ')).toEqual([]);
    expect(src, 'opini TA-1 tidak dibaca dari registri priorYear').toMatch(/priorYear/);
  });

  it('nol nama personel penanda tangan yang dikarang', () => {
    /* Blok "Sign-off" memuat 'Dimas Raharjo' (Disiapkan, 06 Mar) dan
       'Anindya Pramesti' (Direview, 09 Mar) dengan done: true — padahal
       `opening` tak terdaftar di WP_MODULE_MAP dan tak punya rantai sign-off
       sama sekali. */
    const nama = ['Dimas Raharjo', 'Anindya Pramesti', 'Hartono Wijaya', 'Fajar N.', 'Sinta W.'];
    const hit = nama.filter((n) => opening().includes(n));
    expect(hit, 'penanda tangan dikarang: ' + hit.join(' | ')).toEqual([]);
  });

  it('sign-off memakai rantai kanonik `wp_signoff`, bukan daftar sendiri', () => {
    expect(opening(), 'blok tanda tangan tidak tersambung ke rantai kanonik').toMatch(/from '\.\/wp_signoff'/);
  });
});

/* ------------------------------------------------------------------
   Memo TERSEGEL: batas yang harus dijaga.
   ------------------------------------------------------------------ */
describe('O1 · memo tersegel tidak memuat kesimpulan yang dikarang', () => {
  it('`OpeningMemoInput` tak punya kanal untuk tabel prosedur maupun kebijakan', () => {
    /* LAHIR HIJAU — invarian ini sudah benar sebelum arc ini; ditulis agar
       perubahan berikutnya tidak merusaknya diam-diam. */
    const memo = kode('opening_memo.ts');
    const iface = memo.slice(memo.indexOf('interface OpeningMemoInput'), memo.indexOf('export type OpeningPdfBlock'));
    ['specific', 'procedures', 'prosedur', 'policy', 'kebijakan', 'evidence', 'bukti'].forEach((k) => {
      expect(iface.toLowerCase().includes(k.toLowerCase()), `memo menerima '${k}'`).toBe(false);
    });
  });

  it('nama auditor pendahulu yang tersegel berasal dari isian auditor, bukan literal', () => {
    /* MERAH sebelum arc ini: `predecessorName: predecessor.name` mengirim
       'KAP Sutrisno, Bambang & Rekan' ke `openingMemoMeta` → baris "Auditor
       Pendahulu" pada PDF/XLSX TERSEGEL. Fabrikasinya TIDAK berhenti di layar. */
    const src = opening();
    expect(src, 'predecessorName tidak dikirim ke memo').toMatch(/predecessorName\s*:/);
    const nilai = /predecessorName\s*:\s*([^,\n]+)/.exec(src);
    expect(nilai, 'baris predecessorName tak ditemukan').not.toBeNull();
    expect(String(nilai && nilai[1]), 'nama pendahulu masih literal/derivasi konstanta')
      .toMatch(/\bs\.|state|input|predName/);
  });
});

/* ------------------------------------------------------------------
   (b) & (c) Kontrol: tidak ada yang mati, tidak ada yang palsu.
   ------------------------------------------------------------------ */
describe('O2/O3 · kontrol hidup dan native', () => {
  it('nol tombol tanpa handler', () => {
    /* Tag dicari per-BARIS: atribut onClick memuat panah `=>`, sehingga
       pemindaian "sampai `>` pertama" berhenti di tengah atribut. Baris yang
       membuka tag tapi tak menutupnya digabung dengan lanjutannya. */
    const baris = opening().split('\n');
    const mati: string[] = [];
    for (let i = 0; i < baris.length; i++) {
      const l = baris[i];
      if (!/<(Btn|button)\b/.test(l)) continue;
      let blok = l;
      let j = i;
      while (!/\/>|>/.test(blok.replace(/=>/g, '')) && j + 1 < baris.length) { j++; blok += ' ' + baris[j]; }
      /* tombol yang dinonaktifkan permanen tak dihitung hidup — tapi di berkas
         ini tak ada satu pun, jadi aturannya sederhana: harus punya onClick. */
      if (!/onClick=/.test(blok)) mati.push(blok.trim().slice(0, 90));
    }
    expect(mati, 'tombol tanpa onClick: ' + mati.join(' | ')).toEqual([]);
  });

  it('nol kontrol palsu — <tr>/<div>/<span> ber-onClick', () => {
    const hit = [...opening().matchAll(/<(tr|div|span)\b[^>]*\sonClick=/g)].map((m) => m[0].slice(0, 70));
    expect(hit, 'kontrol palsu: ' + hit.join(' | ')).toEqual([]);
  });

  it('baris prosedur adalah <button> dengan cincin fokus terlihat', () => {
    const src = readFileSync(join(__dirname, 'view_opening.tsx'), 'utf8');
    expect(src, 'kelas baris prosedur tak ditemukan').toMatch(/className="ob-procrow"/);
    expect(src.slice(src.indexOf('className="ob-procrow"') - 200, src.indexOf('className="ob-procrow"')), 'baris prosedur bukan <button>')
      .toMatch(/<button/);
    expect(src, 'tanpa :focus-visible').toMatch(/\.ob-procrow:focus-visible/);
  });
});

/* ------------------------------------------------------------------
   (e) Mesin penelusuran TIDAK tersentuh.
   ------------------------------------------------------------------ */
describe('O1 · mesin tie-out saldo awal tidak berubah', () => {
  const wtb = [
    { code: '1-1100', name: 'Kas', ly: 18_420_500_000, group: 'Aset Lancar' },
    { code: '1-1300', name: 'Persediaan', ly: 64_550_200_000, group: 'Aset Lancar' },
    { code: '1-2300', name: 'Aset Hak-Guna', ly: 0, group: 'Aset Tidak Lancar' },
    { code: '4-1000', name: 'Penjualan', ly: -1_000, group: 'Pendapatan' },
  ];
  const sumber: PriorYearSource = {
    rows: [
      { code: '1-1100', name: 'Kas', amount: 18_420_500_000 },
      { code: '1-1300', name: 'Persediaan', amount: 64_000_000_000 },
    ],
  };

  it('tanpa sumber: nol tertelusur, hasSource false', () => {
    const t = tieOutPriorYear(wtb, null);
    expect(t.hasSource).toBe(false);
    expect(t.tied).toBe(0);
  });

  it('dengan sumber: satu cocok, satu selisih, akun laba-rugi di luar lingkup', () => {
    const t = tieOutPriorYear(wtb, sumber);
    expect(t.hasSource).toBe(true);
    expect(t.tied).toBe(1);
    expect(t.untied).toBe(1);
    expect(t.outOfScope).toBe(1);
    /* 1-2300 bersaldo awal nol → tak ada yang dibawa, bukan pengecualian.
       Angka transisi PSAK 73 yang dulu di-hardcode di view TIDAK pernah
       melewati mesin ini — ia hanya menimpa kolom tampilan. */
    expect(t.nilOpening).toBe(1);
    expect(t.missing).toBe(0);
  });

  it('view tidak lagi menimpa saldo awal dengan angka transisi karangan', () => {
    const hit = [...opening().matchAll(/OB_TRANSITION/g)].map((m) => m[0]);
    expect(hit, 'saldo transisi masih dikarang di view').toEqual([]);
  });
});
