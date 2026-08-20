/* ============================================================
   Registri status PRD — gerbang konsistensi `docs/PRD-REGISTRY.md`

   CLAUDE.md §7 menyebut berkas itu "satu-satunya tempat daftar status", dan
   menuntut baris status di tiap PRD konsisten dengannya. Sampai berkas ini
   tak ada satu pun yang MENEGAKKAN-nya, dan dua kelas cacat sudah terjadi:

   1. **Ringkasan yang meleset diam-diam.** Blok "## Ringkasan" adalah angka
      yang DIKETIK, bukan yang dihitung. Ia titik konflik paling sering di repo
      ini (hampir tiap cabang menyentuhnya), dan resolusi merge-nya berupa
      MEMILIH SALAH SATU sisi — padahal ketika dua cabang sama-sama menambah
      satu PRD, jawaban yang benar bukan sisi mana pun, melainkan jumlah
      keduanya. Pada 2026-08-20 `master` benar-benar berjalan dengan
      "In Progress 8" sementara daftarnya berisi 10: dua PR mendarat, git
      me-merge baris ringkasan TANPA konflik, dan tak ada yang bersuara.
      Auto-merge yang "bersih" justru yang membuatnya senyap.

   2. **Status berkas yang basi.** `prd-wip-merge-valuasi-realisasi.md` masih
      berkata "In Progress" berbulan setelah tubuhnya sendiri menyatakan
      SC-1..SC-9 tertutup & terverifikasi hidup — registri sudah "Implemented".

   Gerbang ini menghitung ulang, jadi angkanya tak dapat lagi menjadi opini.

   Dua bentuk deklarasi status SENGAJA sama-sama diterima: baris tabel
   `| Status | … |` (PRD baru, 58 berkas) dan blockquote `> **Status:** …`
   (PRD lama, 48 berkas). Menuntut satu bentuk saja akan membuat gerbang ini
   merah atas 48 dokumen yang isinya benar — gerbang yang menghukum format,
   bukan kebenaran, adalah gerbang yang akan dilemahkan orang berikutnya.
   Penyeragaman bentuknya pekerjaan tersendiri.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const REGISTRY = 'docs/PRD-REGISTRY.md';

const STATUSES = ['In Progress', 'Implemented', 'Superseded', 'Approved', 'Draft'] as const;
type Status = (typeof STATUSES)[number];

/* Dokumen berawalan `PRD`/`prd` yang BUKAN PRD, karena itu tak punya status dan
   tak terdaftar. Masing-masing diberi alasannya sendiri — daftar pengecualian
   tanpa alasan adalah tempat sampah yang tumbuh sendiri. */
const BUKAN_PRD: Record<string, string> = {
  'docs/PRD-REGISTRY.md': 'registrinya sendiri',
  'docs/PRD-KATALOG-EVALUASI-158-MODUL.md': 'katalog kandidat E-1..E-8, belum dipromosikan jadi PRD',
  'docs/PRD-RINGKASAN-KEDALAMAN-E9.md': 'ringkasan hasil evaluasi E-9, bukan usulan pekerjaan',
  'docs/PRD-USULAN-PENGEMBANGAN-E9-KEDALAMAN.md': 'usulan gelombang E-9, kandidat PRD bukan PRD',
};

/** Kata status pertama dari sebuah teks bebas ("Implemented — SELESAI …" → "Implemented"). */
function kataStatus(teks: string): Status | null {
  const t = teks.replace(/\*\*/g, '').trim();
  return STATUSES.find((s) => t.startsWith(s)) ?? null;
}

/* CRLF DIBUANG lebih dulu. Git menormalkan berkas dokumen ke CRLF di working copy
   Windows, dan `split('\n')` menyisakan '\r' di ujung tiap baris — cukup untuk
   membuat `indexOf('## Daftar')` meleset, seluruh parser mengembalikan kosong, dan
   KEEMPAT uji di bawah lulus tanpa memeriksa apa pun. Persis itu yang terjadi pada
   percobaan pertama berkas ini; uji "parser benar-benar membaca" di bawah ada supaya
   kegagalan sunyi seperti itu tak bisa terulang. */
const registri = readFileSync(join(ROOT, REGISTRY), 'utf8').replace(/\r\n/g, '\n');
const barisRegistri = registri.split('\n');

/** Baris tabel di bawah "## Daftar" → [path, teks status]. */
const daftar: Array<{ path: string; teks: string; status: Status | null }> = (() => {
  const mulai = barisRegistri.indexOf('## Daftar');
  const out: Array<{ path: string; teks: string; status: Status | null }> = [];
  for (const ln of barisRegistri.slice(mulai)) {
    if (!ln.startsWith('| ')) continue;
    const sel = ln.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (sel.length < 2 || sel[1] === 'Status' || sel[1].startsWith('---')) continue;
    out.push({ path: sel[0], teks: sel[1], status: kataStatus(sel[1]) });
  }
  return out;
})();

/** Angka yang DIKETIK di blok "## Ringkasan". */
const ringkasan: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  const mulai = barisRegistri.indexOf('## Ringkasan');
  const akhir = barisRegistri.indexOf('## Daftar');
  for (const ln of barisRegistri.slice(mulai, akhir)) {
    const m = /^\|\s*(.+?)\s*\|\s*(\d+)\s*\|$/.exec(ln);
    if (m && (STATUSES as readonly string[]).includes(m[1])) out[m[1]] = Number(m[2]);
  }
  return out;
})();

/** Deklarasi status di dalam berkas PRD-nya sendiri — dua bentuk, lihat kepala berkas. */
function statusDiBerkas(isiMentah: string): Status | null {
  const isi = isiMentah.replace(/\r\n/g, '\n');
  const tabel = /^\|\s*Status\s*\|(.+?)\|\s*$/m.exec(isi);
  if (tabel) return kataStatus(tabel[1]);
  const kutipan = /^>\s*\*\*Status:?\*\*:?\s*(.+)$/m.exec(isi);
  if (kutipan) return kataStatus(kutipan[1]);
  const tebal = /^\s*\*\*Status:?\*\*:?\s*(.+)$/m.exec(isi);
  return tebal ? kataStatus(tebal[1]) : null;
}

/** Seluruh berkas berawalan PRD/prd di root & docs/ (bukan rekursif — hanya dua tempat itu). */
function berkasPrd(): string[] {
  const out: string[] = [];
  for (const dir of ['', 'docs']) {
    for (const e of readdirSync(join(ROOT, dir || '.'), { withFileTypes: true })) {
      if (!e.isFile() || !/\.md$/i.test(e.name)) continue;
      if (!/^prd/i.test(e.name)) continue;
      out.push(dir ? `${dir}/${e.name}` : e.name);
    }
  }
  return out;
}

describe('registri status PRD — docs/PRD-REGISTRY.md', () => {
  /* Penjaga terhadap gerbang yang lulus karena tak membaca apa-apa — kegagalan
     yang benar-benar terjadi di percobaan pertama berkas ini (lihat catatan CRLF
     di atas). Angka 50 adalah lantai kasar (registri berisi 106 baris saat uji ini
     ditulis); yang dijaga bukan jumlahnya, melainkan bahwa parsernya menemukan
     sesuatu sama sekali. */
  it('parser benar-benar membaca registrinya (bukan lulus karena kosong)', () => {
    expect(daftar.length, 'daftar PRD terbaca kosong — parsernya yang rusak, bukan registrinya').toBeGreaterThan(50);
    expect(Object.keys(ringkasan).length, 'blok "## Ringkasan" tak terbaca sama sekali').toBe(STATUSES.length);
  });

  it('ringkasan adalah HASIL HITUNG daftarnya, bukan angka yang diketik terpisah', () => {
    const dihitung: Record<string, number> = {};
    for (const s of STATUSES) dihitung[s] = daftar.filter((d) => d.status === s).length;
    const beda = STATUSES.filter((s) => (ringkasan[s] ?? 0) !== dihitung[s]);
    expect(
      beda,
      beda.length === 0 ? '' :
        `Blok "## Ringkasan" tidak cocok dengan "## Daftar" (${daftar.length} baris):\n` +
        beda.map((s) => `  ${s}: tertulis ${ringkasan[s] ?? '—'}, terhitung ${dihitung[s]}`).join('\n') +
        `\n\nHampir selalu ini sisa merge: dua cabang sama-sama menambah PRD, git memilih ` +
        `salah satu sisi baris ringkasan. Perbaiki dengan MENGHITUNG ULANG, jangan menebak.`,
    ).toHaveLength(0);
  });

  it('tiap baris registri menunjuk berkas yang benar-benar ada, dengan kata status yang sah', () => {
    const hilang = daftar.filter((d) => !existsSync(join(ROOT, d.path))).map((d) => d.path);
    const takSah = daftar.filter((d) => d.status === null).map((d) => `${d.path} → "${d.teks.slice(0, 40)}…"`);
    expect(hilang, `Baris registri menunjuk berkas yang tak ada:\n  ${hilang.join('\n  ')}`).toHaveLength(0);
    expect(
      takSah,
      `Status di luar taksonomi Tahap 9 (${STATUSES.join(' · ')}):\n  ${takSah.join('\n  ')}`,
    ).toHaveLength(0);
  });

  it('status di dalam tiap PRD sama dengan status di registri', () => {
    const beda: string[] = [];
    for (const d of daftar) {
      const isi = readFileSync(join(ROOT, d.path), 'utf8');
      const diBerkas = statusDiBerkas(isi);
      if (diBerkas === null) { beda.push(`${d.path} — tak menyatakan status sama sekali`); continue; }
      if (diBerkas !== d.status) beda.push(`${d.path} — berkas "${diBerkas}" vs registri "${d.status}"`);
    }
    expect(
      beda,
      beda.length === 0 ? '' :
        `${beda.length} PRD tidak konsisten dengan registrinya (CLAUDE.md §7):\n  ${beda.join('\n  ')}\n\n` +
        `Registri adalah sumber kebenaran daftar status; perbarui baris di dalam PRD-nya.`,
    ).toHaveLength(0);
  });

  it('tiap berkas PRD di disk terdaftar di registri (gerbang CAKUPAN)', () => {
    const terdaftar = new Set(daftar.map((d) => d.path));
    const yatim = berkasPrd().filter((p) => !terdaftar.has(p) && !(p in BUKAN_PRD));
    expect(
      yatim,
      yatim.length === 0 ? '' :
        `PRD tanpa baris registri — statusnya karena itu tak terlacak di mana pun:\n  ${yatim.join('\n  ')}\n\n` +
        `Tambahkan barisnya di "## Daftar", atau bila memang bukan PRD, daftarkan di ` +
        `BUKAN_PRD pada berkas uji ini BESERTA alasannya.`,
    ).toHaveLength(0);
  });
});
