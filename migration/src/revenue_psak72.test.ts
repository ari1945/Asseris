/* ============================================================
   Modul `revenue` (Pendapatan & Penagihan) — gerbang PSAK 72.

   Tiga hal yang dijaga di sini, masing-masing dengan cara yang bisa MERAH:

   · V2 — nilai kontrak tak boleh dikarang. Rumus lama jatuh ke
     `materiality * 0.4` ketika perikatan tak menemukan kliennya. Cacat itu
     DORMAN pada keadaan seed hari ini (kedelapan klien ber-fee, ketujuh
     perikatan menemukan kliennya), jadi uji nilai atas seed saja tak akan
     pernah menangkapnya — uji di bawah membangun keadaan yang MEMICU jalur
     itu, lalu memastikan jawabannya "belum ditetapkan", bukan sebuah angka.

   · V3/V4 — label tak boleh menjamin lebih dari yang diukur. Kolom metode
     lama mengarang klasifikasi PSAK 72 dari `type` perikatan sementara
     setiap baris dihitung dengan persentase penyelesaian yang DILAPORKAN,
     dan pita pengakuan ilustrasi menutup dirinya dengan "Kolom diakui/
     ditagih per engagement adalah data nyata" — kalimat yang menjamin
     `diakui` setara `ditagih`, padahal hanya `ditagih` yang berasal dari
     register. Gerbang teks di bawah menolak kembalinya kalimat itu.

   · V5 — baris tabel harus dapat dipilih tanpa tetikus.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import {
  MEASURE_REPORTED_PCT,
  contractValueOf,
  recognitionSchedule,
  type RevClient,
  type RevEngagement,
  type RevInvoice,
} from './revenue_psak72';

const SRC = join(__dirname);
const readRaw = (f: string): string => readFileSync(join(SRC, f), 'utf8');

/** Kode saja — komentar dibuang, supaya prosa yang MENJELASKAN pola lama
    tidak dihitung sebagai pola lama itu sendiri. */
const read = (f: string): string => readRaw(f)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const VIEW = 'view_firmrevenue.tsx';

/* ---------- fixtures ---------- */

const eng = (over: Partial<RevEngagement> = {}): RevEngagement => ({
  id: 'ENG-T-001', clientId: 'C-T1', type: 'Audit Laporan Keuangan',
  progress: 50, partner: 'Uji Partner, CPA', actualHrs: 100, budgetHrs: 200, ...over,
});
const cli = (over: Partial<RevClient> = {}): RevClient => ({
  id: 'C-T1', name: 'PT Uji Sentosa', fee: 1_000_000_000, ...over,
});
const inv = (over: Partial<RevInvoice> = {}): RevInvoice => ({
  eng: 'ENG-T-001', status: 'Sent', amount: 200_000_000, ...over,
});

describe('V2 — nilai kontrak: dinyatakan atau tidak sama sekali', () => {
  it('fee klien adalah SATU-SATUNYA sumber nilai kontrak', () => {
    expect(contractValueOf(cli({ fee: 750_000_000 }))).toBe(750_000_000);
    expect(contractValueOf(cli({ fee: 0 }))).toBe(0);          // pro bono ≠ tak diketahui
  });

  it.each<[string, RevClient | null]>([
    ['klien tak ditemukan', null],
    ['fee tak ada', { id: 'C-T1', name: 'PT Uji' }],
    ['fee null', { id: 'C-T1', name: 'PT Uji', fee: null }],
    ['fee NaN', { id: 'C-T1', name: 'PT Uji', fee: Number.NaN }],
    ['fee tak berhingga', { id: 'C-T1', name: 'PT Uji', fee: Number.POSITIVE_INFINITY }],
    ['fee negatif', { id: 'C-T1', name: 'PT Uji', fee: -1 }],
  ])('%s ⇒ null, bukan taksiran', (_label, client) => {
    expect(contractValueOf(client)).toBeNull();
  });

  it('perikatan tanpa klien: baris hidup, angkanya kosong, bukan dikarang', () => {
    /* Jalur INI yang dulu memanggil `e.materiality * 0.4`. */
    const s = recognitionSchedule({
      engagements: [eng({ id: 'ENG-X', clientId: 'C-HILANG' })],
      clients: [cli()],
      invoices: [inv({ eng: 'ENG-X', amount: 300_000_000 })],
    });
    const row = s.rows[0];
    expect(row.gap).toBe('contract-unknown');
    expect(row.contract).toBeNull();
    expect(row.recognized).toBeNull();
    expect(row.asset).toBeNull();
    expect(row.liab).toBeNull();
    expect(row.client).toBe('—');
    /* tertagih tetap fakta register — ia tak bergantung pada nilai kontrak */
    expect(row.billed).toBe(300_000_000);
  });

  it('baris berlubang KELUAR dari total kontrak, tetapi tertagihnya tetap masuk', () => {
    const s = recognitionSchedule({
      engagements: [eng(), eng({ id: 'ENG-X', clientId: 'C-HILANG' })],
      clients: [cli()],
      invoices: [inv({ amount: 100_000_000 }), inv({ eng: 'ENG-X', amount: 300_000_000 })],
    });
    expect(s.gaps.map((r) => r.id)).toEqual(['ENG-X']);
    expect(s.totContract).toBe(1_000_000_000);              // hanya baris ber-fee
    expect(s.totRecognized).toBe(500_000_000);              // 1 M × 50%
    expect(s.totBilled).toBe(400_000_000);                  // KEDUA faktur
    expect(s.totAsset).toBe(400_000_000);                   // 500 − 100
    expect(s.totLiab).toBe(0);
    expect(s.backlog).toBe(500_000_000);
  });

  it('materialitas tak lagi disebut oleh modul pendapatan mana pun', () => {
    /* Materialitas = pertimbangan audit atas laporan keuangan KLIEN; ia tak
       punya hubungan dengan harga kontrak jasa. Satu penyebutan saja cukup
       untuk menghidupkan kembali proksi itu. */
    expect(read(VIEW)).not.toMatch(/materiality/);
    expect(read('revenue_psak72.ts')).not.toMatch(/materiality/);
  });

  it('cacat V2 memang DORMAN pada seed hari ini — perbaikan ini tak menggeser satu angka pun', () => {
    /* Premis yang dinyatakan prompt, dibuktikan alih-alih dipercaya. */
    const engagements = AMS.ENGAGEMENTS as RevEngagement[];
    const clients = AMS.CLIENTS as unknown as RevClient[];
    const s = recognitionSchedule({ engagements, clients, invoices: AMS.INVOICES as RevInvoice[] });
    expect(engagements.length).toBeGreaterThan(0);
    expect(s.gaps).toEqual([]);
    expect(s.rows.every((r) => r.contract != null)).toBe(true);
  });
});

describe('V3/V4 — pengukuran disebut apa adanya, klasifikasi tak dikarang', () => {
  it('setiap baris memakai pengukuran yang benar-benar dihitung', () => {
    const s = recognitionSchedule({
      engagements: [eng(), eng({ id: 'ENG-AUP', type: 'Agreed-Upon Procedures' })],
      clients: [cli()], invoices: [],
    });
    expect(s.rows.every((r) => r.measure === MEASURE_REPORTED_PCT)).toBe(true);
    expect(MEASURE_REPORTED_PCT).toMatch(/dilaporkan/);
  });

  it('perikatan non-audit ditandai "klasifikasi belum ditetapkan", bukan "Point-in-time"', () => {
    /* Label lama membantah aritmetikanya sendiri: ia menulis Point-in-time
       lalu tetap mengakui kontrak × pct untuk baris yang sama. */
    const s = recognitionSchedule({
      engagements: [
        eng({ id: 'ENG-AUD', type: 'Audit Laporan Keuangan' }),
        eng({ id: 'ENG-AUP', type: 'Agreed-Upon Procedures' }),
        eng({ id: 'ENG-REV', type: 'Review (SPR 2400)' }),
      ],
      clients: [cli()], invoices: [],
    });
    const open = s.rows.filter((r) => r.classificationOpen).map((r) => r.id);
    expect(open).toEqual(['ENG-AUP', 'ENG-REV']);
  });

  it('label metode lama tak boleh kembali ke layar', () => {
    const src = read(VIEW);
    expect(src).not.toMatch(/Over-time \(input\)/);
    expect(src).not.toMatch(/Point-in-time/);
    /* footnote lama menyatakan pengukuran "jam terhadap anggaran" — yang tak
       pernah dihitung satu baris pun. */
    expect(src).not.toMatch(/jam terhadap anggaran/);
  });

  it('pita ilustrasi tak lagi menjamin kolom "diakui" sebagai data nyata', () => {
    const src = readRaw(VIEW);
    expect(src).not.toMatch(/adalah data nyata/);
    /* Yang WAJIB tetap dinyatakan: siapa nyata (register faktur) dan apa yang
       hanya turunan (diakui = fee × % dilaporkan). */
    expect(src).toMatch(/register faktur/);
    expect(src).toMatch(/dilaporkan/);
  });
});

describe('V5 — baris dapat dipilih tanpa tetikus', () => {
  it('tak ada <tr> yang memikul onClick di modul ini', () => {
    expect(read(VIEW)).not.toMatch(/<tr[^>]*onClick/);
  });

  it('pemilihan perikatan dipikul kontrol native ber-aria-expanded', () => {
    const src = read(VIEW);
    expect(src).toMatch(/<button[^>]*aria-expanded/);
  });
});

describe('tertagih datang dari register, bukan dari skedul', () => {
  it('faktur Draft belum menagih apa pun; mengirimnya membalik aset ⇄ liabilitas', () => {
    const base = { engagements: [eng({ progress: 10 })], clients: [cli()] };
    const draft = recognitionSchedule({ ...base, invoices: [inv({ status: 'Draft', amount: 400_000_000 })] });
    const sent = recognitionSchedule({ ...base, invoices: [inv({ status: 'Sent', amount: 400_000_000 })] });
    expect(draft.rows[0].billed).toBe(0);
    expect(draft.rows[0].asset).toBe(100_000_000);   // diakui 100 jt, belum ditagih
    expect(draft.rows[0].liab).toBe(0);
    expect(sent.rows[0].billed).toBe(400_000_000);
    expect(sent.rows[0].asset).toBe(0);
    expect(sent.rows[0].liab).toBe(300_000_000);     // ditagih mendahului penyelesaian
  });
});
