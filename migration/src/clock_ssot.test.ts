/* ============================================================
   K-02 lanjutan — jam sistem (`new Date()`) sebagai anchor "hari ini".

   PR #231 menutup K-02 sebagaimana katalog merumuskannya: tanggal BEKU yang
   diketik di modul. Kelas kedua tetap hidup di 80 situs — `new Date()`. Ia
   lolos justru karena tak pernah terlihat salah: nilainya selalu masuk akal,
   ia hanya tak berhubungan dengan perikatan mana pun. Kertas kerja bertanggal
   22 Agustus 2026 pada perikatan yang klok-nya 9 Maret 2026 tak dapat
   direkonsiliasi dengan tanggal apa pun di sekitarnya, dan setiap angka
   turunan waktu bergeser diam-diam tiap hari tanpa satu berkas pun berubah.

   Gerbang di bawah MENGENUMERASI BERKAS DARI DISK — bukan daftar terkurasi —
   supaya berkas baru ikut terjaring sejak menit pertama. Yang boleh menyimpan
   `new Date()` harus terdaftar di `IZIN` beserta alasannya, dengan JUMLAH yang
   tepat: menambah satu pemakaian baru di berkas yang sudah diizinkan tetap
   memerahkan gerbang.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AMS } from './data';
import {
  ssotDateIso, ssotDateShortId, ssotDateLongId, ssotDayMonthId,
  ssotYear, ssotStamp, ssotIsoTs,
  amsDateIso, amsDateShortId, amsYear, amsStamp, amsIsoTs, amsTodayDate,
} from './clock_ssot';

const SRC = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------
   IZIN — satu-satunya tempat `new Date()` boleh tinggal, dengan alasan.
   Kunci = jalur relatif thd migration/src; nilai = { n, alasan }.
   ------------------------------------------------------------------ */
const IZIN: Record<string, { n: number; alasan: string }> = {
  'clock_ssot.ts': {
    n: 3,
    alasan: 'Modul klok itu sendiri: bagian JAM stempel memang jam nyata — yang dibekukan HARInya, bukan detiknya.',
  },
  'copilot.tsx': {
    n: 2,
    alasan: 'Waktu pesan obrolan (HH.MM saja). Tak ada tanggal yang bisa salah.',
  },
  'ai_insights.tsx': {
    n: 1,
    alasan: 'Jam keputusan auditor atas usulan AI (HH.MM saja).',
  },
  /* 'diagnostics_panel.tsx' DICABUT 2026-08-22 (prompt 72-diagnostic D1). Izinnya
     dulu berbunyi "jam keputusan auditor atas temuan diagnostik (HH.MM saja)" —
     dan justru DI SITU letak cacatnya: keputusan menutup temuan risiko kecurangan
     bertanda "14:23" tak dapat ditempatkan pada hari mana pun, sementara SA 230
     ¶8-11 menuntut KAPAN pertimbangan itu diambil. Kini `diagDecisionStamp()`
     (klok SSOT + jam nyata) dan stempel tanpa tanggal DITOLAK catatannya. */
  'view_crypto.tsx': {
    n: 1,
    alasan: 'Umpan balik "terverifikasi pukul …" atas aksi yang baru saja dijalankan (HH.MM.SS saja).',
  },
  'view_clientportal.tsx': {
    n: 1,
    alasan: 'Waktu pesan obrolan portal klien (HH.MM saja).',
  },
  'canon_firm_attest.ts': {
    n: 1,
    alasan: 'Modul KANON murni — tak boleh mengimpor AMS. Ini fallback tahun saat `period` tak terbaca; klok yang benar disuntik pemanggilnya.',
  },
  'canon_hcm.ts': {
    n: 1,
    alasan: 'Modul KANON murni — fallback tahun saat `asOf` tak terbaca.',
  },
  'canon_leave.ts': {
    n: 2,
    alasan: 'Modul KANON murni — fallback tahun saat `asOf` null.',
  },
  'wedge/WedgeApp.tsx': {
    n: 1,
    alasan: 'Wedge MVP — alat mandiri atas workbook yang BARU SAJA diunggah pengguna; ia tak punya dataset AMS maupun perikatan, jadi "sekarang" di sana memang waktu nyata impor/keputusan.',
  },
  'wedge/seal.ts': {
    n: 1,
    alasan: 'Wedge MVP (entry point terpisah, wedge.html) — `signedAt` sebuah segel kriptografis memang waktu penandatanganan nyata.',
  },
};

/* Kosongkan komentar agar kutipan pola lama di dokumentasi tidak memerahkan
   gerbangnya sendiri (berkas ini dan clock_ssot.ts penuh kutipan begitu). */
const kode = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function sumberSrc(dir: string = SRC, out: string[] = []): string[] {
  for (const nama of readdirSync(dir)) {
    if (nama === 'node_modules' || nama === 'dist') continue;
    const p = join(dir, nama);
    if (statSync(p).isDirectory()) { sumberSrc(p, out); continue; }
    if (/\.tsx?$/.test(nama) && !/\.test\.tsx?$/.test(nama) && !/\.d\.ts$/.test(nama)) out.push(p);
  }
  return out;
}

function pemakaian(): Record<string, number> {
  const peta: Record<string, number> = {};
  for (const p of sumberSrc()) {
    const n = (kode(readFileSync(p, 'utf8')).match(/new\s+Date\s*\(\s*\)/g) || []).length;
    if (n > 0) peta[relative(SRC, p).split('\\').join('/')] = n;
  }
  return peta;
}

/* ------------------------------------------------------------------
   `Date.now()` — KELAS KETIGA, digerbangi sejak 2026-08-22.

   `new Date()` di atas menutup anchor "hari ini". `Date.now()` adalah anchor
   yang sama dalam bentuk angka, dan ia lolos dari gerbang itu sepenuhnya.
   Bedanya: mayoritas pemakaiannya SAH, jadi gerbang ini tak menuntut nol —
   ia menuntut setiap pemakaian PUNYA ALASAN yang tertulis. Ada tiga alasan
   yang sah, dan hanya tiga:

     id    — pembangkit id/entropi (`'RN-' + Date.now()`). Bukan anchor waktu;
             tak ada tanggal yang dapat salah.
     nyata — jam yang DIVALIDASI SERVER. `nowStamp()` dipakai tanda tangan AJE
             dan rantai kertas kerja, lalu diperiksa `decisionTimestampError`
             terhadap jam server dalam jendela `AJE_DECISION_SKEW_MS` (10 menit).
             Memindahkannya ke `AMS.TODAY` akan membuat SERVER MENOLAK setiap
             keputusan — skew ~5 bulan.
     pasangan — pembanding SLA/lewat-tempo atas stempel yang dibuat `nowStamp()`.
             Ia HARUS memakai klok yang sama dengan nilai yang dibandingkannya;
             memindahkan salah satu saja memutus pasangannya.

   Yang TIDAK ada di sini lagi (diperbaiki bersama gerbang ini):
     · `view_misc1` mencetak HARI INI sebagai "Tenggat" pada PDF yang diekspor
       ketika perikatan tak punya tenggat — tanggal yang tak pernah dijanjikan
       siapa pun, di dalam dokumen yang keluar dari aplikasi. Kini '—'.
     · `view_hrops` menjatuhkan anchor kalender kehadiran ke jam mesin bila
       `AMS.TODAY` tak terbaca. Kini jatuh ke klok SSOT.
   ------------------------------------------------------------------ */
const IZIN_NOW: Record<string, { n: number; jenis: 'id' | 'nyata' | 'pasangan'; alasan: string }> = {
  'aje_approval.ts': {
    n: 1, jenis: 'nyata',
    alasan: 'Default `nowStamp(now = Date.now())` — stempel keputusan AJE & tanda tangan kertas kerja, DIVALIDASI server terhadap jam servernya sendiri (skew 10 menit). Klok perikatan akan membuat setiap keputusan ditolak.',
  },
  'view_aje.tsx': {
    n: 2, jenis: 'pasangan',
    alasan: 'Pembanding lewat-tempo atas `due` yang diturunkan dari `nowStamp()`. Harus satu klok dengan nilai yang dibandingkannya.',
  },
  'view_platform.tsx': {
    n: 1, jenis: 'pasangan',
    alasan: 'Sisa jam SLA persetujuan, dihitung atas stempel `nowStamp()` yang sama. Harus satu klok dengan nilai yang dibandingkannya.',
  },
  'ai_extract.tsx': { n: 1, jenis: 'id', alasan: 'Pembangkit uid hasil ekstraksi — entropi, bukan anchor waktu.' },
  'contexts.tsx': { n: 2, jenis: 'id', alasan: 'Pembangkit id catatan reviu & entri waktu — entropi, bukan anchor waktu.' },
  'copilot.tsx': { n: 1, jenis: 'id', alasan: 'Pembangkit uid pesan co-pilot — entropi, bukan anchor waktu.' },
  'evidence.tsx': { n: 1, jenis: 'id', alasan: 'Pembangkit uid rekaman bukti — entropi, bukan anchor waktu (tanggalnya memakai `amsStamp()`).' },
  'view_mytasks.tsx': { n: 1, jenis: 'id', alasan: 'Pembangkit id sub-tugas — entropi, bukan anchor waktu.' },
  'view_mytasks_parts.tsx': { n: 1, jenis: 'id', alasan: 'Pembangkit id tugas pribadi — entropi, bukan anchor waktu.' },
  'view_onboarding.tsx': { n: 1, jenis: 'id', alasan: 'Pembangkit nomor prospek manual — entropi, bukan anchor waktu.' },
  'view_opinion_parts.tsx': { n: 2, jenis: 'id', alasan: 'Pembangkit id Hal Audit Utama (KAM) — entropi, bukan anchor waktu.' },
  'view_restatement.tsx': { n: 1, jenis: 'id', alasan: 'Pembangkit id item penyajian kembali — entropi, bukan anchor waktu.' },
  'view_workspace.tsx': { n: 1, jenis: 'id', alasan: 'Pembangkit id catatan ruang kerja — entropi, bukan anchor waktu.' },
  'view_wp.tsx': { n: 1, jenis: 'id', alasan: 'Pembangkit id catatan kertas kerja — entropi, bukan anchor waktu.' },
};

function pemakaianNow(): Record<string, number> {
  const peta: Record<string, number> = {};
  for (const p of sumberSrc()) {
    const n = (kode(readFileSync(p, 'utf8')).match(/Date\s*\.\s*now\s*\(\s*\)/g) || []).length;
    if (n > 0) peta[relative(SRC, p).split('\\').join('/')] = n;
  }
  return peta;
}

describe('K-02 — pemindaian benar-benar mencakup repo (bukan gerbang kosong)', () => {
  it('menemukan ratusan berkas sumber dan berkas yang dikenal', () => {
    const berkas = sumberSrc().map(p => relative(SRC, p).split('\\').join('/'));
    expect(berkas.length).toBeGreaterThan(200);
    expect(berkas).toContain('view_jet.tsx');
    expect(berkas).toContain('wp_canon.ts');
    expect(berkas).toContain('wedge/seal.ts');
  });

  it('pemindai melihat `new Date()` yang memang ada (kalibrasi pada berkas izin)', () => {
    expect(pemakaian()['copilot.tsx']).toBe(IZIN['copilot.tsx'].n);
  });

  it('komentar TIDAK dihitung — kutipan pola lama tak memerahkan gerbangnya sendiri', () => {
    expect((kode('/* new Date() */ const a = 1;').match(/new\s+Date\s*\(\s*\)/g) || []).length).toBe(0);
    expect((kode('// new Date()\nconst a = 1;').match(/new\s+Date\s*\(\s*\)/g) || []).length).toBe(0);
  });
});

describe('K-02 — nol `new Date()` di luar daftar izin', () => {
  it('tidak ada berkas baru yang memakai jam sistem sebagai anchor "hari ini"', () => {
    const pakai = pemakaian();
    const liar = Object.keys(pakai).filter(f => !IZIN[f]).map(f => `${f} (${pakai[f]}×)`);
    expect(liar, `jam sistem di luar izin:\n  ${liar.join('\n  ')}`).toEqual([]);
  });

  it('berkas berizin tidak diam-diam menambah pemakaian', () => {
    const pakai = pemakaian();
    const beda = Object.keys(IZIN)
      .filter(f => (pakai[f] || 0) !== IZIN[f].n)
      .map(f => `${f}: izin ${IZIN[f].n}, nyata ${pakai[f] || 0}`);
    expect(beda, `jumlah pemakaian bergeser:\n  ${beda.join('\n  ')}`).toEqual([]);
  });

  it('setiap izin membawa alasannya', () => {
    Object.entries(IZIN).forEach(([f, v]) => {
      expect(v.alasan.length, `${f} tanpa alasan`).toBeGreaterThan(30);
    });
  });
});

/* ============================================================
   Format dirakit tangan — HARUS identik dengan keluaran Intl yang
   digantikannya, untuk kedua belas bulan. Kalau tidak, sapuan ini
   diam-diam mengubah teks di ratusan tempat.
   ============================================================ */
describe('K-02 — format tangan identik dengan id-ID yang digantikannya', () => {
  const tanggal = Array.from({ length: 12 }, (_, m) => ({
    iso: `2026-${String(m + 1).padStart(2, '0')}-09`,
    d: new Date(2026, m, 9),
  }));

  it("ssotDateShortId == toLocaleDateString('id-ID', 2-digit/short/numeric)", () => {
    tanggal.forEach(({ iso, d }) => {
      expect(ssotDateShortId(iso)).toBe(d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }));
    });
  });

  it("ssotDateLongId == toLocaleDateString('id-ID', 2-digit/long/numeric)", () => {
    tanggal.forEach(({ iso, d }) => {
      expect(ssotDateLongId(iso)).toBe(d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }));
    });
  });

  it("ssotDayMonthId == toLocaleDateString('id-ID', 2-digit/short)", () => {
    tanggal.forEach(({ iso, d }) => {
      expect(ssotDayMonthId(iso)).toBe(d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }));
    });
  });

  it("ssotDateIso == toLocaleDateString('en-CA') dan == toISOString().slice(0,10)", () => {
    tanggal.forEach(({ iso, d }) => {
      expect(ssotDateIso(iso)).toBe(d.toLocaleDateString('en-CA'));
      expect(ssotDateIso(iso)).toBe(iso);
    });
  });
});

describe('K-02 — perilaku klok', () => {
  it('memajukan klok memajukan seluruh turunannya', () => {
    expect(ssotDateIso('2027-01-15')).toBe('2027-01-15');
    expect(ssotDateShortId('2027-01-15')).toBe('15 Jan 2027');
    expect(ssotYear('2027-01-15')).toBe(2027);
    expect(ssotStamp('2027-01-15', '08:05')).toBe('2027-01-15 08:05');
    expect(ssotIsoTs('2027-01-15', '08:05:00.000')).toBe('2027-01-15T08:05:00.000Z');
  });

  it('klok tak terbaca → string kosong, bukan tanggal karangan', () => {
    ['', 'bukan-tanggal', '2026-13-01', '09/03/2026'].forEach(bad => {
      expect(ssotDateIso(bad), bad).toBe('');
      expect(ssotDateShortId(bad), bad).toBe('');
      expect(ssotDateLongId(bad), bad).toBe('');
      expect(Number.isNaN(ssotYear(bad)), bad).toBe(true);
    });
  });

  it('pembungkus tanpa argumen mengikuti AMS.TODAY, bukan jam mesin', () => {
    expect(amsDateIso()).toBe(AMS.TODAY);
    expect(amsDateShortId()).toBe(ssotDateShortId(AMS.TODAY));
    expect(amsYear()).toBe(Number(String(AMS.TODAY).slice(0, 4)));
    /* Justru INI yang dulu gagal: hari ini nyata hampir tak pernah = AMS.TODAY. */
    expect(amsDateIso()).not.toBe(new Date().toISOString().slice(0, 10));
  });

  it('stempel bertanggal SSOT tetapi berjam NYATA (pengurutan log tetap hidup)', () => {
    const s = amsStamp();
    expect(s.slice(0, 10)).toBe(AMS.TODAY);
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);

    const ts = amsIsoTs();
    expect(ts.slice(0, 10)).toBe(AMS.TODAY);
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    /* `slice(0,10)` di hilir HARUS tetap tanggal SSOT — itu sebabnya bagian jam
       dinyatakan sebagai UTC, bukan dirakit dari objek Date lokal. */
    expect(new Date(ts).toISOString().slice(0, 10)).toBe(AMS.TODAY);
  });

  it('amsTodayDate() adalah tengah malam LOKAL tanggal SSOT (aritmetika hari bulat)', () => {
    const d = amsTodayDate();
    expect(d.getFullYear()).toBe(Number(String(AMS.TODAY).slice(0, 4)));
    expect(d.getMonth() + 1).toBe(Number(String(AMS.TODAY).slice(5, 7)));
    expect(d.getDate()).toBe(Number(String(AMS.TODAY).slice(8, 10)));
    expect(d.getHours()).toBe(0);
    const besok = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    expect(Math.round((besok.getTime() - d.getTime()) / 86400000)).toBe(1);
  });
});
/* ============================================================
   K-02 kelas ketiga — `Date.now()` sebagai anchor "hari ini".
   ============================================================ */
describe('K-02 — setiap `Date.now()` punya alasan yang tertulis', () => {
  it('pemindai melihat `Date.now()` yang memang ada (kalibrasi)', () => {
    expect(pemakaianNow()['aje_approval.ts']).toBe(1);
  });

  it('tidak ada berkas di luar daftar izin', () => {
    const pakai = pemakaianNow();
    const liar = Object.keys(pakai).filter(f => !IZIN_NOW[f]).map(f => `${f} (${pakai[f]}×)`);
    expect(liar, `Date.now() tanpa alasan:\n  ${liar.join('\n  ')}`).toEqual([]);
  });

  it('berkas berizin tidak diam-diam menambah pemakaian', () => {
    const pakai = pemakaianNow();
    const beda = Object.keys(IZIN_NOW)
      .filter(f => (pakai[f] || 0) !== IZIN_NOW[f].n)
      .map(f => `${f}: izin ${IZIN_NOW[f].n}, nyata ${pakai[f] || 0}`);
    expect(beda, `jumlah pemakaian bergeser:\n  ${beda.join('\n  ')}`).toEqual([]);
  });

  it('setiap izin membawa jenis DAN alasannya', () => {
    Object.entries(IZIN_NOW).forEach(([f, v]) => {
      expect(['id', 'nyata', 'pasangan'], `${f} berjenis tak dikenal`).toContain(v.jenis);
      expect(v.alasan.length, `${f} tanpa alasan`).toBeGreaterThan(30);
    });
  });

  it('klok NYATA dan pasangannya tetap satu keluarga — bukan dipindah sebagian', () => {
    /* Kalau `nowStamp()` suatu hari pindah ke klok perikatan, pembanding SLA
       yang berpasangan dengannya HARUS ikut — kalau tidak, "lewat tempo"
       dihitung antara dua klok yang berbeda lima bulan. */
    const keluarga = Object.keys(IZIN_NOW).filter(f => IZIN_NOW[f].jenis !== 'id');
    expect(keluarga.sort()).toEqual(['aje_approval.ts', 'view_aje.tsx', 'view_platform.tsx']);
  });
});
