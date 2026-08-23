import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RETENTION } from './data_records';
import { sa230ArchiveState, daysBetween, sa230AssemblyWindowDays } from './sa230_archive';

/* ============================================================
   SA 230 · siklus hidup arsip — gerbang SSOT.

   Modul sa230 dulu membangun ulang seluruh siklus hidup arsip dari
   tiga konstanta privat, dan salah satunya (retensi 10 tahun)
   MEMBANTAH kelas retensi firma (kk-audit = 7 tahun) sambil
   mengklaim dasar "SMM 1 / Pengaturan Firma".

   Oracle di sini SELALU lapisan kanonik RETENTION untuk perikatan
   yang sama — bukan konstanta yang ditulis ulang di berkas uji ini
   (itu akan tautologis).
   ============================================================ */

const SRC = __dirname;
const readSrc = (f: string) => readFileSync(join(SRC, f), 'utf8');
/* Gerbang cakupan HARUS membuang komentar dulu — dasar kebijakan & catatan
   sejarah sah ditulis di komentar; yang dilarang adalah literal di KODE. */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/* Perikatan nyata dengan bentuk siklus hidup yang berbeda-beda. */
const ENG_AKTIF = 'ENG-2025-014';   // DOC-0623 · assembly in-progress, belum diarsip
const ENG_TERKUNCI = 'ENG-2024-022'; // kotak legacy · diarsip 2025-03-15
const ENG_HOLD = 'ENG-2024-008';     // kotak legacy · LH-02 legal hold aktif

describe('sa230_archive — keadaan arsip ditarik dari kanon, bukan konstanta modul', () => {
  it('masa simpan = kelas retensi kanonik perikatan (bukan angka modul)', () => {
    const canon = RETENTION.classForEngagement(ENG_AKTIF);
    const st = sa230ArchiveState(ENG_AKTIF);
    expect(st.retentionYears).toBe(canon.years);
    expect(st.klass.id).toBe(canon.id);
    /* dasar kebijakan ikut dari kanon — bukan klaim standar yang dikarang view */
    expect(st.klass.dasar).toBe(canon.dasar);
    expect(st.klass.format).toBe(canon.format);
  });

  it('tenggat perakitan = assembleBy kanonik, dan jendela ¶A21 DITURUNKAN darinya', () => {
    const box = RETENTION.archiveBoxes().find((b: { engId: string }) => b.engId === ENG_AKTIF);
    expect(box, 'perikatan aktif harus punya kotak arsip kanonik').toBeTruthy();
    const st = sa230ArchiveState(ENG_AKTIF);
    expect(st.reportDate).toBe(box.reportDate);
    expect(st.assembleBy).toBe(box.assembleBy);
    /* jendela tidak ditulis ulang sebagai konstanta 60 di modul SA 230 */
    expect(st.assemblyDays).toBe(daysBetween(box.reportDate, box.assembleBy));
  });

  it('jam retensi mulai saat DIARSIPKAN — berkas belum dirakit tidak punya akhir retensi', () => {
    const aktif = sa230ArchiveState(ENG_AKTIF);
    expect(aktif.assembled).toBe(false);
    /* cacat lama: view menampilkan tanggal laporan + 10 thn sebagai tanggal pasti */
    expect(aktif.retentionUntil).toBeNull();

    const terkunci = sa230ArchiveState(ENG_TERKUNCI);
    expect(terkunci.assembled).toBe(true);
    const box = RETENTION.archiveBoxes().find((b: { engId: string }) => b.engId === ENG_TERKUNCI);
    expect(terkunci.retentionUntil).toBe(box.retentionUntil);
    /* akhir retensi dihitung dari archivedOn, bukan dari reportDate */
    expect(terkunci.retentionUntil?.slice(0, 4))
      .toBe(String(Number(terkunci.archivedOn?.slice(0, 4)) + terkunci.retentionYears));
  });

  it('perikatan yang SUDAH diarsip tidak boleh berbunyi "belum dirakit"', () => {
    const st = sa230ArchiveState(ENG_TERKUNCI);
    expect(st.assembled).toBe(true);
    expect(st.stage).not.toBe('pra-laporan');
    expect(st.stage).not.toBe('dalam-jendela');
    expect(['terarsip', 'jatuh-tempo', 'legal-hold']).toContain(st.stage);
  });

  it('legal hold menghasilkan keadaan BERBEDA — bukan tanggal retensi yang sama', () => {
    const ditahan = sa230ArchiveState(ENG_HOLD);
    const bebas = sa230ArchiveState(ENG_TERKUNCI);
    expect(ditahan.hold, 'ENG-2024-008 ditahan LH-02').toBeTruthy();
    expect(bebas.hold).toBeNull();
    expect(ditahan.stage).toBe('legal-hold');
    expect(bebas.stage).not.toBe('legal-hold');
    /* keduanya kotak legacy terarsip: tanpa kesadaran hold, keadaannya identik */
    expect(ditahan.stage).not.toBe(bebas.stage);
  });

  it('perikatan tanpa dokumen DMS tidak mengarang tenggat', () => {
    const st = sa230ArchiveState('ENG-TIDAK-ADA-9999');
    expect(st.hasBox).toBe(false);
    expect(st.reportDate).toBeNull();
    expect(st.assembleBy).toBeNull();
    expect(st.assemblyDays).toBeNull();
    expect(st.retentionUntil).toBeNull();
    expect(st.stage).toBe('tanpa-berkas');
    /* kelas retensi tetap ada — ia melekat pada jenis perikatan, bukan dokumennya */
    expect(st.retentionYears).toBeGreaterThan(0);
  });
});

/* ============================================================
   TRIPWIRE — tabel masa simpan kedua tidak boleh kembali ke sa230.
   ============================================================ */
describe('sa230 tidak lagi memiliki siklus hidup arsipnya sendiri', () => {
  it('view_sa230 tak memuat konstanta retensi/perakitan privat', () => {
    const code = stripComments(readSrc('view_sa230.tsx'));
    /* angka masa simpan / jendela perakitan sebagai konstanta modul */
    expect(code).not.toMatch(/RETENTION_YEARS\s*=/);
    expect(code).not.toMatch(/ASSEMBLY_DAYS\s*=/);
    /* penambahan tahun manual = menghitung ulang akhir retensi di view */
    expect(code).not.toMatch(/setFullYear\s*\(/);
  });

  it('view_sa230 menarik siklus hidup arsip dari lapisan kanonik', () => {
    const code = stripComments(readSrc('view_sa230.tsx'));
    expect(code).toMatch(/sa230ArchiveState/);
  });

  it('view_sa230 tak mengarang identitas di dalam payload tersegel', () => {
    const code = stripComments(readSrc('view_sa230.tsx'));
    /* #265 — nama firma di segel ekspor wajib dari AMS.FIRM, bukan literal */
    expect(code).not.toMatch(/firm:\s*'KAP /);
    /* klien & perikatan tak boleh punya fallback literal berupa entitas seed */
    expect(code).not.toMatch(/\|\|\s*'PT Sentosa Makmur Tbk'/);
    expect(code).not.toMatch(/\|\|\s*'ENG-2025-014'/);
  });

  it('format arsip tidak ditulis ulang sebagai literal', () => {
    const code = stripComments(readSrc('view_sa230.tsx'));
    expect(code).not.toMatch(/AES-256/);
  });
});

/* ============================================================
   TRIPWIRE — properti agregat karangan tidak boleh masuk payload.

   Memo SA 230 yang TERSEGEL dulu mencetak `C.agg.signifPct`,
   `C.agg.devPct`, dan `C.agg.retPct` — tiga properti yang tidak
   pernah didefinisikan di mana pun. Tiga dari empat baris tabel
   "Status Kelengkapan" karenanya berbunyi "undefined%" di dalam
   dokumen ber-tanda-tangan Ed25519.

   TypeScript tidak menangkapnya: `useDocCanon()` mengalir sebagai
   `any` lewat prop `C`, jadi setiap nama properti lolos. Gerbang
   ini menutupnya secara struktural — setiap `C.agg.x` yang dibaca
   view WAJIB benar-benar dirakit di literal `const agg = { … }`.
   ============================================================ */
describe('agregat yang dibaca view_sa230 benar-benar ada', () => {
  it('setiap C.agg.<prop> punya definisi di literal agg', () => {
    const raw = readSrc('view_sa230.tsx');
    const code = stripComments(raw);
    const dibaca = new Set([...code.matchAll(/C\.agg\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
    expect(dibaca.size, 'view membaca setidaknya satu agregat').toBeGreaterThan(0);

    const blok = code.slice(code.indexOf('const agg = {'));
    const akhir = blok.indexOf('};');
    expect(akhir).toBeGreaterThan(0);
    const literal = blok.slice(0, akhir);
    /* nama properti pada literal: `nama:` atau shorthand `nama,` */
    const didefinisikan = new Set([...literal.matchAll(/(?:^|[{,\s])([A-Za-z_$][\w$]*)\s*[:,]/g)].map((m) => m[1]));

    const hantu = [...dibaca].filter((k) => !didefinisikan.has(k));
    expect(hantu, `agregat dibaca tapi tak pernah dirakit: ${hantu.join(', ')}`).toEqual([]);
  });
});

/* ============================================================
   Kebijakan retensi: SATU angka, dari kelas — bukan per dokumen.

   Keputusan Ari 2026-08-23: masa simpan berkas audit KAP adalah
   **7 tahun** — angka yang punya dasar tertulis (SA 230 ¶A23 /
   SMM 1 min. 5 thn; WHR menetapkan 7, melebihi minimum).

   Angka 10 yang sebelumnya melekat pada tiap dokumen DMS tidak
   punya dasar sama sekali, dan `view_dms.tsx` menuliskan dasarnya
   sebagai "SA 230: min. 10 tahun untuk KK audit" — ¶A23 tidak
   menyatakan itu. Angka 10 juga diterapkan SERAGAM ke semua jenis
   dokumen, sehingga ia hanya kebetulan benar untuk Surat Perikatan
   (kelas `perikatan` = 10) dan salah untuk Kertas Kerja, Laporan,
   dan EQR sekaligus.

   Akibat yang ditutup: `view_dms` menghitung kedaluwarsa dari 10
   thn sedangkan `disposalQueue()` → kalender kewajiban firma & PO
   pemusnahan memakai kelas (7) — dua tanggal musnah untuk satu
   berkas yang sama.
   ============================================================ */
describe('masa simpan adalah kebijakan firma, bukan angka per dokumen', () => {
  it('setiap dokumen DMS mewarisi masa simpan KELAS retensinya', () => {
    const docs = RETENTION.docsForEng(ENG_AKTIF) as ReadonlyArray<{ type: string }>;
    expect(docs.length).toBeGreaterThan(0);
    for (const d of docs) {
      const cls = RETENTION.classForType(d.type);
      expect(RETENTION.retentionYearsForType(d.type), `jenis ${d.type}`).toBe(cls.years);
    }
  });

  it('berkas audit KAP = 7 tahun (keputusan firma, dasar tertulis)', () => {
    expect(RETENTION.classById('kk-audit').years).toBe(7);
    expect(RETENTION.retentionYearsForType('Kertas Kerja')).toBe(7);
  });

  it('tak ada dokumen DMS yang membawa masa simpannya sendiri', () => {
    const code = stripComments(readSrc('data_part2.ts'));
    expect(code).not.toMatch(/retentionYears\s*:/);
  });

  it('konsumen masa simpan menurunkannya dari kanon, bukan literal', () => {
    for (const f of ['view_dms.tsx', 'view_crypto.tsx']) {
      const code = stripComments(readSrc(f));
      /* fallback literal `d.retentionYears || 10` & default form 10 dicabut */
      expect(code, f).not.toMatch(/retentionYears\s*\|\|\s*\d+/);
      expect(code, f).toMatch(/retentionYearsForType|RETENTION\./);
    }
  });

  it('klaim "SA 230 min. 10 tahun" tidak boleh kembali (¶A23 menyebut lima)', () => {
    for (const f of ['view_dms.tsx', 'view_crypto.tsx', 'view_sa230.tsx']) {
      const code = readSrc(f);   // termasuk komentar: klaim keliru tak boleh hidup di mana pun
      expect(code, f).not.toMatch(/SA\s*230\s*:?\s*min\.?\s*10\s*tahun/i);
    }
  });
});

/* ============================================================
   Kelas retensi klien ↔ server harus SATU registri.

   `server/src/attachments/retention.ts` menyimpan RETENTION_CLASSES
   sendiri (id → years) dan menjadi otoritas pemusnahan lampiran.
   Klien mengirim `retentionClass` saat mengunggah dokumen; dulu ia
   mengirim string 'SA230/10y' yang TIDAK ADA di registri server,
   sehingga server diam-diam memakai default. Angka yang tampil di
   layar dan angka yang menjadwalkan pemusnahan tak pernah bertemu.
   ============================================================ */
describe('registri kelas retensi klien ↔ server', () => {
  const serverSrc = () => readFileSync(
    join(SRC, '..', '..', 'server', 'src', 'attachments', 'retention.ts'), 'utf8');

  it('setiap kelas kanonik klien ada di registri server dengan tahun yang sama', () => {
    const kode = serverSrc();
    const blok = kode.slice(kode.indexOf('RETENTION_CLASSES'));
    const server = new Map<string, number>(
      [...blok.matchAll(/id:\s*'([\w-]+)'\s*,\s*years:\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]),
    );
    expect(server.size, 'registri server terbaca').toBeGreaterThan(0);

    const klien = RETENTION.RETENTION_CLASSES as ReadonlyArray<{ id: string; years: number }>;
    for (const c of klien) {
      expect(server.get(c.id), `kelas '${c.id}' hilang / beda di server`).toBe(c.years);
    }
  });

  it('unggahan DMS mengirim ID KELAS, bukan string yang tak dikenali server', () => {
    const code = stripComments(readSrc('view_dms.tsx'));
    expect(code).not.toMatch(/retentionClass:\s*'SA230\//);
    expect(code).toMatch(/retentionClass:\s*RETENTION\.classForType/);
  });
});

/* ============================================================
   Pengaturan Firma tidak boleh menawarkan kebijakan yang salah.

   "Periode Retensi Arsip" dulu adalah dropdown 5/10/15 tahun —
   kebijakan firma yang sebenarnya (7) bahkan tak ada di dalamnya —
   dan nilainya TIDAK DIBACA modul mana pun. Ia adalah kontrol yang
   berpura-pura menetapkan kebijakan.
   ============================================================ */
describe('Pengaturan Firma menampilkan kebijakan retensi yang berlaku', () => {
  it('tak ada lagi pilihan masa simpan bebas di pengaturan', () => {
    const code = stripComments(readSrc('view_settings.tsx'));
    expect(code).not.toMatch(/'5 tahun'/);
    expect(code).not.toMatch(/'15 tahun'/);
    expect(code).not.toMatch(/setGroup\('firm',\s*'retentionYears'/);
  });

  it('angka retensi di pengaturan turun dari kanon', () => {
    const code = stripComments(readSrc('view_settings.tsx'));
    expect(code).toMatch(/RETENTION\.classById\('kk-audit'\)\.years/);
  });

  it('jendela perakitan di pengaturan DITURUNKAN, bukan literal kedua', () => {
    const code = stripComments(readSrc('view_settings.tsx'));
    expect(code).toMatch(/sa230AssemblyWindowDays/);
    expect(code).not.toMatch(/>\s*60 hari\s*</);
    /* dan nilainya memang jendela ¶A21 yang dipakai kotak arsip */
    expect(sa230AssemblyWindowDays()).toBe(60);
  });
});
