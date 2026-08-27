/* ============================================================
   PR-3..PR-5 — gerbang D3: keluaran hilir MENGIKUTI kerangka

   D3 berbunyi: aplikasi dapat menetapkan SAK EMKM di satu layar lalu
   menerbitkan CALK ber-PSAK 73 dan opini penyajian wajar di layar lain, tanpa
   satu pun kontradiksi terdeteksi. Penyebabnya bukan satu baris salah — melainkan
   TIDAK ADANYA tempat yang menyatakan konsekuensi tiap kerangka, sehingga tiap
   modul hilir mengarang asumsinya sendiri dan tak ada yang bisa membandingkan.

   `fwProfile` adalah tempat itu. Gerbang di bawah menjaga dua hal terpisah:

     (a) profilnya sendiri benar & lengkap — tiap kerangka menjawab tiap
         pertanyaan, dan jawabannya tidak saling bertentangan;
     (b) modul hilir benar-benar MENANYAKANNYA, bukan menyalin asumsinya.

   (b) dijaga secara statik karena inilah cara D3 bertahan: modul yang tak pernah
   menyebut `SAK EP`/`SAK EMKM` lolos setiap uji perilaku yang hanya menjalankan
   jalur SAK penuh — dan SAK penuh adalah satu-satunya jalur yang dipakai ketujuh
   perikatan seed hari ini.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fwProfile, fwAllowsPsak, type FwCode } from './fw_canon';

const SEMUA: FwCode[] = ['SAK', 'SAK EP', 'SAK EMKM'];
const baca = (f: string): string => readFileSync(join(__dirname, f), 'utf8');

describe('profil kerangka — lengkap dan tidak bertentangan', () => {
  it('setiap kerangka punya profil penuh', () => {
    for (const fw of SEMUA) {
      const p = fwProfile(fw);
      expect(p, fw).toBeTruthy();
      expect(typeof p!.statements).toBe('number');
      expect(typeof p!.deferredTax).toBe('boolean');
      expect(typeof p!.opinionForm).toBe('string');
      expect(Array.isArray(p!.psakAllowed)).toBe(true);
    }
  });

  /* Kerangka yang belum ditetapkan TIDAK boleh jatuh ke SAK penuh. Default
     diam-diam ke kerangka terluas persis cara D3 menerbitkan PSAK 73 untuk
     entitas mikro. */
  it('kerangka null → profil null, BUKAN default SAK', () => {
    expect(fwProfile(null)).toBeNull();
    expect(fwAllowsPsak(null, 'PSAK 1')).toBe(false);
    expect(fwAllowsPsak(null, 'PSAK 73')).toBe(false);
  });

  it('SAK EMKM: tiga laporan, tanpa pajak tangguhan, tanpa konsolidasi', () => {
    const p = fwProfile('SAK EMKM')!;
    expect({ st: p.statements, dt: p.deferredTax, cons: p.consolidation })
      .toEqual({ st: 3, dt: false, cons: false });
  });

  /* Inti cacat D3 dinyatakan sebagai fakta yang dapat dibantah. */
  it('SAK EMKM menolak PSAK 71/72/73 dan PSAK 46', () => {
    for (const psak of ['PSAK 71', 'PSAK 72', 'PSAK 73', 'PSAK 46']) {
      expect({ psak, boleh: fwAllowsPsak('SAK EMKM', psak) }).toEqual({ psak, boleh: false });
    }
  });

  it('SAK penuh menerima ketiganya — jadi penolakan di atas bukan sekadar daftar kosong', () => {
    for (const psak of ['PSAK 71', 'PSAK 72', 'PSAK 73', 'PSAK 46']) {
      expect({ psak, boleh: fwAllowsPsak('SAK', psak) }).toEqual({ psak, boleh: true });
    }
  });

  it('SAK EP di antara keduanya: PSAK 46 ya, instrumen/sewa/konsolidasi penuh tidak', () => {
    expect(fwAllowsPsak('SAK EP', 'PSAK 46')).toBe(true);
    for (const psak of ['PSAK 71', 'PSAK 72', 'PSAK 73', 'PSAK 65']) {
      expect({ psak, boleh: fwAllowsPsak('SAK EP', psak) }).toEqual({ psak, boleh: false });
    }
  });

  /* Konsistensi internal: pajak tangguhan diakui ⟺ PSAK 46 boleh dirujuk.
     Dua bidang yang menyatakan hal sama harus sepakat, selamanya. */
  it('bendera pajak tangguhan sepakat dengan daftar-putih PSAK 46', () => {
    for (const fw of SEMUA) {
      const p = fwProfile(fw)!;
      expect({ fw, dt: p.deferredTax }).toEqual({ fw, dt: fwAllowsPsak(fw, 'PSAK 46') });
    }
  });

  it('hanya kerangka bertujuan khusus yang memakai bentuk opini SA 800', () => {
    for (const fw of SEMUA) {
      const p = fwProfile(fw)!;
      expect({ fw, cocok: p.opinionForm.includes('800') === p.specialPurpose })
        .toEqual({ fw, cocok: true });
    }
  });
});

describe('modul hilir MENANYAKAN kerangka, bukan mengasumsikannya', () => {
  /* Gerbang statik, sengaja. Ketujuh perikatan seed hari ini semuanya SAK penuh
     (empat tercatat, tiga menunggu jawaban pertimbangan) — jadi uji PERILAKU
     tak akan pernah menjalankan cabang EP/EMKM, dan modul yang diam-diam
     kembali memaku SAK akan tetap hijau. Yang dijaga di sini adalah TAUTANNYA. */
  const HILIR = ['view_fsgen.tsx', 'view_opinion.tsx'];

  it('setiap modul hilir mengimpor dari fw_canon', () => {
    for (const f of HILIR) {
      expect({ f, impor: /from '\.\/fw_canon'/.test(baca(f)) }).toEqual({ f, impor: true });
    }
  });

  it('setiap modul hilir memanggil frameworkFor untuk klien aktif', () => {
    for (const f of HILIR) {
      expect({ f, panggil: /frameworkFor\(/.test(baca(f)) }).toEqual({ f, panggil: true });
    }
  });

  it('CALK menyaring rujukan PSAK lewat profil, bukan mencetak semuanya', () => {
    const src = baca('view_fsgen.tsx');
    /* Upaya pertama menulis `expect(src).toContain('fwAllowsPsak')` dan LOLOS
       ketika penyaringnya dicabut — karena baris `import` sendiri sudah memuat
       nama itu. Gerbang yang dipuaskan oleh impor tidak membuktikan pemakaian.
       Karena itu di bawah dihitung PEMANGGILAN di luar baris impor. */
    const tanpaImpor = src.split('\n').filter(l => !l.trimStart().startsWith('import ')).join('\n');
    const panggilan = (tanpaImpor.match(/fwAllowsPsak\(/g) ?? []).length;
    expect(panggilan).toBeGreaterThan(0);
    /* Dan penyaring itu benar-benar menjaga penerbitan catatan (mengembalikan
       `null`), bukan sekadar dihitung lalu dibuang. */
    expect(tanpaImpor).toMatch(/!fwAllowsPsak\([^)]*\)\s*\?\s*null/);
    /* Serta menolak menerbitkan apa pun tanpa kerangka. */
    expect(src).toContain('CALK belum dapat diterbitkan');
  });

  it('opini tidak lagi memaku SA 700/705/701 sebagai satu-satunya bentuk', () => {
    const src = baca('view_opinion.tsx').replace(/\/\*[\s\S]*?\*\//g, '');
    /* Label bentuk opini kini turunan profil. Literal lama boleh muncul sebagai
       SALAH SATU cabang, tetapi tidak boleh lagi menjadi satu-satunya jalan. */
    expect(src).toContain('fwProfil');
    expect(src).toContain('specialPurpose');
  });
});
