/* ============================================================
   JEJAK POSTING AKUN KONTROL — PRD budget-actual-ledger-derived, Bagian B.

   #239 & #240 menjembatani sub-buku WIP/AR/AP ke "akun kontrol GL". Diukur atas seed
   sebelum arc ini, ketiga akun itu hampir tak punya jejak posting: 1-300 NOL jurnal,
   1-200 mutasi 8% dari saldonya, 2-100 mutasi 19%. Selama itu benar, "akun kontrol"
   hanyalah nama untuk sebuah konstanta — tak ada yang dapat ditelusuri auditor.

   Yang dipaku di sini: ketiganya punya mutasi terposting, jurnalnya seimbang, DAN
   penambahan itu tidak menggeser satu saldo kini pun (nol-delta aljabar) sehingga
   rekonsiliasi #239/#240 tak ikut berubah.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { FIRM_COA, FIRM_GL } from './data_part1';
import { accountLedger, netEffect, openingBalances, currentBalances, mergeSeedJournals, trialBalance, statements } from './firm_ledger';
import type { GlJournal } from './firm_ledger';

const coa = FIRM_COA;
const gl = FIRM_GL;
/** Akun kontrol sub-buku: AR · WIP · AP (yang dijembatani #239/#240). */
const CONTROL = ['1-200', '1-300', '2-100'] as const;
const postedFor = (code: string) => gl.filter(j => j.posted && (j.dr === code || j.cr === code));

describe('SC-8 — akun kontrol sub-buku punya jejak posting', () => {
  it.each(CONTROL)('%s punya ≥1 jurnal terposting', (code) => {
    expect(postedFor(code).length).toBeGreaterThan(0);
  });

  it.each(CONTROL)('%s punya mutasi periode yang tidak nol', (code) => {
    /* Bukan sekadar "tersentuh": saldo kontrol harus benar-benar bergerak, kalau tidak
       jejaknya kosmetik. 1-300 sebelum arc ini mutasinya persis NOL. */
    expect(netEffect(gl, code)).not.toBe(0);
  });

  it('WIP (1-300) punya SIKLUS, bukan satu sisi: diakui lalu ditagihkan', () => {
    const ids = postedFor('1-300').map(j => j.id).sort();
    expect(ids).toEqual(['JV-0313', 'JV-0314']);
    /* Diakui sepanjang waktu (dr WIP / cr Pendapatan), lalu ditagihkan (dr AR / cr WIP). */
    expect(gl.find(j => j.id === 'JV-0313')).toMatchObject({ dr: '1-300', cr: '4-100' });
    expect(gl.find(j => j.id === 'JV-0314')).toMatchObject({ dr: '1-200', cr: '1-300' });
  });

  it('AP (2-100) punya dua arah: faktur vendor DAN pembayaran', () => {
    const posts = postedFor('2-100');
    expect(posts.some(j => j.cr === '2-100')).toBe(true);   // faktur menambah utang
    expect(posts.some(j => j.dr === '2-100')).toBe(true);   // pembayaran menguranginya
  });
});

describe('SC-9 — nol-delta: jejak bertambah, angka tidak', () => {
  it('saldo kini tiap akun tetap = seed (gl == seedGl)', () => {
    const cur = currentBalances(coa, gl, gl);
    for (const a of coa) expect(cur[a.code], a.code).toBe(a.bal);
  });

  it('akun kontrol tetap pada angka yang dipakai #239/#240', () => {
    const cur = currentBalances(coa, gl, gl);
    expect(cur['1-200']).toBe(4_440_000_000);
    expect(cur['1-300']).toBe(9_300_000_000);
    expect(cur['2-100']).toBe(-1_820_000_000);
  });

  it('laporan keuangan tidak bergerak sedikit pun', () => {
    const st = statements(coa, gl, gl);
    expect(st.revenue).toBe(11_300_000_000);
    expect(st.expense).toBe(8_500_000_000);
    expect(st.netProfit).toBe(2_800_000_000);
    expect(st.balanced).toBe(true);
  });
});

describe('Integritas jurnal seed', () => {
  it('tiap jurnal seimbang: satu debit, satu kredit, akun berbeda, nilai positif', () => {
    for (const j of gl) {
      expect(j.dr, j.id).not.toBe(j.cr);
      expect(j.amount, j.id).toBeGreaterThan(0);
      expect(coa.some(a => a.code === j.dr), `${j.id} dr ${j.dr}`).toBe(true);
      expect(coa.some(a => a.code === j.cr), `${j.id} cr ${j.cr}`).toBe(true);
    }
  });

  it('nomor jurnal unik dan urutannya menurun bersama tanggal', () => {
    const ids = gl.map(j => j.id);
    expect(new Set(ids).size).toBe(ids.length);
    const dates = gl.map(j => +new Date(j.date));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('neraca saldo tetap seimbang', () => {
    expect(trialBalance(coa, gl, gl).balanced).toBe(true);
  });

  it('hanya JV-0307 yang masih draft — jurnal seed baru adalah riwayat, bukan antrean', () => {
    expect(gl.filter(j => !j.posted).map(j => j.id)).toEqual(['JV-0307']);
  });
});

describe('Cache firmgl basi tidak boleh merusak saldo', () => {
  /* Ditemukan lewat verifikasi hidup, BUKAN oleh gerbang: dengan `firmgl` terpersist
     dari rilis sebelumnya (6 jurnal) dan seed baru (12), saldo awal sudah dikurangi
     efek jurnal baru tetapi efeknya tak pernah ditambahkan kembali. Neraca tetap
     "seimbang", jadi tak ada yang berbunyi — Pendapatan cuma diam-diam anjlok. */
  const glLama = gl.filter(j => !['JV-0313', 'JV-0314', 'JV-0315', 'JV-0316', 'JV-0317', 'JV-0318'].includes(j.id));

  it('REPRO: tanpa penggabungan, saldo menyimpang jauh dari seed', () => {
    const rusak = currentBalances(coa, gl, glLama);
    expect(rusak['4-100']).toBe(-8_450_000_000);   // seharusnya −11.300
    expect(rusak['1-300']).toBe(8_090_000_000);    // seharusnya 9.300
    expect(trialBalance(coa, gl, glLama).balanced).toBe(true); // ← tetap "seimbang"
  });

  it('mergeSeedJournals memulihkan saldo ke seed, persis', () => {
    const sembuh = mergeSeedJournals(glLama, gl);
    const cur = currentBalances(coa, gl, sembuh);
    for (const a of coa) expect(cur[a.code], a.code).toBe(a.bal);
  });

  it('suntingan pengguna dipertahankan — status posting tidak ditimpa seed', () => {
    const disunting = glLama.map(j => j.id === 'JV-0312' ? { ...j, posted: false } : j);
    const sembuh = mergeSeedJournals(disunting, gl);
    expect(sembuh.find(j => j.id === 'JV-0312')?.posted).toBe(false);
    expect(sembuh).toHaveLength(gl.length);
  });

  it('jurnal buatan pengguna tidak hilang, dan penggabungan idempoten', () => {
    const buatan = { id: 'JV-0319', date: '2026-03-20', desc: 'uji', dr: '1-100', cr: '4-100', amount: 1_000_000, posted: true };
    const sekali = mergeSeedJournals([...glLama, buatan], gl);
    expect(sekali.some(j => j.id === 'JV-0319')).toBe(true);
    expect(mergeSeedJournals(sekali, gl)).toHaveLength(sekali.length);
  });

  it('daftar yang sudah lengkap & mutakhir dikembalikan apa adanya', () => {
    expect(mergeSeedJournals(gl, gl)).toBe(gl);
  });

  it('jurnal seed yang BERUBAH disegarkan — cache lama tak boleh menang atas isinya', () => {
    /* Ditemukan hidup saat PRD cash-bank-reconciliation-register memecah `1-100`
       menjadi enam sub-akun: cache `firmgl` dari rilis sebelumnya tetap memenangkan
       `cr: '1-100'` untuk empat jurnal kas. Akun itu sudah tidak ada, jadi NOL jurnal
       menyentuh kas — saldo kini = saldo awal, kontrol Kas melonjak 8.420 → 10.705 jt.
       Neraca tetap seimbang; tak satu gerbang pun berbunyi. */
    const basi = gl.map(j => j.id === 'JV-0312' ? { ...j, cr: '1-100', amount: 1 } : j);
    const sembuh = mergeSeedJournals(basi, gl);
    const j = sembuh.find(x => x.id === 'JV-0312') as GlJournal;
    expect(j.cr).toBe('1-200');
    expect(j.dr).toBe('1-101');
    expect(j.amount).toBe(925_000_000);
    /* dan saldo pulih persis ke seed */
    const cur = currentBalances(coa, gl, sembuh);
    for (const a of coa) expect(cur[a.code], a.code).toBe(a.bal);
  });

  it('status posting yang disunting pengguna TETAP menang saat penyegaran', () => {
    const disunting = gl.map(j => j.id === 'JV-0312' ? { ...j, cr: '1-100', posted: false } : j);
    const sembuh = mergeSeedJournals(disunting, gl);
    const j = sembuh.find(x => x.id === 'JV-0312') as GlJournal;
    expect(j.cr).toBe('1-200');    // isi dari seed
    expect(j.posted).toBe(false);  // posting dari pengguna
  });
});

describe('Buku Besar: baris membawa lawan akun (repro crash tab)', () => {
  /* Tab "Buku Besar" Firm GL merender `r.dr2 ? r.cr : r.dr` lalu `.slice()` atas hasil
     `acctName()`-nya. `LedgerRow` tidak pernah membawa `dr`/`cr`, jadi nilainya
     `undefined` → `.slice()` melempar → SELURUH modul gagal render. Akun default
     1-100 punya mutasi, sehingga crash terjadi setiap kali tab dibuka — sejak
     Program E (#234). Tak satu pun uji melihatnya; hanya peramban. */
  it('tiap baris membawa kode akun debit & kredit yang ada di COA', () => {
    const lg = accountLedger(coa, gl, gl, '1-100');
    expect(lg.rows.length).toBeGreaterThan(0);
    for (const r of lg.rows) {
      expect(typeof r.dr, r.id).toBe('string');
      expect(typeof r.cr, r.id).toBe('string');
      expect(coa.some(a => a.code === r.dr), `${r.id} dr`).toBe(true);
      expect(coa.some(a => a.code === r.cr), `${r.id} cr`).toBe(true);
    }
  });

  it('lawan akun yang dirender view selalu terpetakan ke nama (bukan undefined)', () => {
    /* Meniru persis ekspresi view: `r.dr2 ? r.cr : r.dr`. */
    for (const code of ['1-100', '1-200', '1-300', '2-100']) {
      for (const r of accountLedger(coa, gl, gl, code).rows) {
        const lawan = r.dr2 ? r.cr : r.dr;
        expect(lawan, `${code}/${r.id}`).toBeTruthy();
        expect(coa.find(a => a.code === lawan)?.name, `${code}/${r.id}`).toBeTruthy();
      }
    }
  });

  it('akun kontrol sub-buku punya baris buku besar yang dapat dibuka', () => {
    for (const code of CONTROL) expect(accountLedger(coa, gl, gl, code).rows.length, code).toBeGreaterThan(0);
  });
});

describe('Saldo awal tetap masuk akal setelah dijangkar ke jurnal baru', () => {
  it('tak ada akun yang saldo awalnya berpindah sisi (aset/beban tetap debit, dst.)', () => {
    /* Menambah jurnal seed menggeser SALDO AWAL. Bila terlalu besar, saldo awal bisa
       berpindah tanda — mis. kas awal negatif — dan demo jadi tak masuk akal. */
    const open = openingBalances(coa, gl);
    for (const a of coa) {
      const debitNormal = a.type === 'Aset' || a.type === 'Beban';
      if (debitNormal) expect(open[a.code], a.code).toBeGreaterThan(0);
      else expect(open[a.code], a.code).toBeLessThan(0);
    }
  });
});
