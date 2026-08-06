/* W-WTB·2 — gerbang integritas WTB. Fungsi murni. */
import { describe, it, expect } from 'vitest';
import { checkWtbIntegrity, ajeRegisterByAccount } from './wtb_integrity';
import type { IntegrityWtbRow, IntegrityAjeEntry } from './wtb_integrity';
import { AMS } from './data';

describe('ajeRegisterByAccount — proyeksi register ke delta per akun (Dr +, Cr −)', () => {
  it('bentuk ringkas dr/cr + amount', () => {
    const m = ajeRegisterByAccount([{ id: 'A1', dr: '5-1100 BPP', cr: '1-1300 Persediaan', amount: 2_340_000_000 }]);
    expect(m.get('5-1100')).toBe(2_340_000_000);
    expect(m.get('1-1300')).toBe(-2_340_000_000);
  });
  it('bentuk terstruktur lines[]', () => {
    const m = ajeRegisterByAccount([{ id: 'A2', lines: [{ code: '5-3100', debit: 620_000_000 }, { code: '1-1210', credit: 620_000_000 }] }]);
    expect(m.get('5-3100')).toBe(620_000_000);
    expect(m.get('1-1210')).toBe(-620_000_000);
  });
});

describe('checkWtbIntegrity — SEED demo (ENG-2025-014) konsisten penuh (A2)', () => {
  /* Penjaga regresi: seed WTB+AJE harus lolos gerbang integritas — Σ kolom AJE = 0,
     kolom AJE ≡ proyeksi register per akun, neraca ter-tie. Mencegah edit seed
     mendatang diam-diam mengembalikan ketidakkonsistenan (sisi debit AJE hilang /
     penyesuaian hantu tanpa jurnal). Gerbang finalisasi (A1) membaca status ini. */
  const r = checkWtbIntegrity(AMS.WTB, AMS.AJE);
  it('status ok — ajeBalanced, registerReconciled, adjConsistent, bsTied', () => {
    expect(r.ajeBalanced).toBe(true);
    expect(r.registerReconciled).toBe(true);
    expect(r.adjConsistent).toBe(true);
    expect(r.bsTied).toBe(true);
    expect(r.status).toBe('ok');
  });
  /* PR-4d — seed demo BERPOLA laba-ganda (saldo laba sudah memuat laba berjalan sementara
     akun L/R masih terbuka). Deteksi menyala, tetapi SENGAJA tidak membalik `status`
     agar gerbang finalisasi (yang membaca status ini) tak terkunci pada data demo.
     Bila seed dibenahi / kebijakan berubah, uji ini yang pertama harus diperbarui. */
  it('seed berpola laba-ganda → terdeteksi, tanpa mengunci gerbang finalisasi', () => {
    expect(r.incomeDoubleCounted).toBe(true);
    expect(r.status).toBe('ok');
    expect(r.messages.some(m => /TERCATAT DUA KALI/.test(m.text))).toBe(true);
  });
  it('tak ada akun yang kolom AJE-nya menyimpang dari register', () => {
    expect(r.ajeMismatches).toHaveLength(0);
  });
});

describe('checkWtbIntegrity — TB ter-foot ketat (Σ=0, tanpa AJE)', () => {
  const rows: IntegrityWtbRow[] = [
    { code: '1-1100', unadj: 3_000_000_000, aje: 0, adj: 3_000_000_000 },
    { code: '2-1100', unadj: -1_000_000_000, aje: 0, adj: -1_000_000_000 },
    { code: '3-2100', unadj: -2_000_000_000, aje: 0, adj: -2_000_000_000 },
  ];
  const r = checkWtbIntegrity(rows, []);
  it('footed, neraca seimbang, status ok', () => {
    expect(r.footed).toBe(true);
    expect(r.bsTied).toBe(true);
    expect(r.bsDiff).toBe(0);
    expect(r.status).toBe('ok');
  });
});

describe('checkWtbIntegrity — TB pra-tutup (RE saldo awal, laba terbuka)', () => {
  const rows: IntegrityWtbRow[] = [
    { code: '1-1100', unadj: 5_000_000_000, aje: 0, adj: 5_000_000_000 },
    { code: '2-1100', unadj: -2_000_000_000, aje: 0, adj: -2_000_000_000 },
    { code: '3-2100', unadj: -2_000_000_000, aje: 0, adj: -2_000_000_000 }, // RE saldo awal
    { code: '4-1100', unadj: -3_000_000_000, aje: 0, adj: -3_000_000_000 },
    { code: '5-1100', unadj: 2_000_000_000, aje: 0, adj: 2_000_000_000 },
  ];
  const r = checkWtbIntegrity(rows, []);
  it('Σ=0 ter-foot; selisih neraca = laba berjalan → dijelaskan & bsTied', () => {
    expect(r.footed).toBe(true);
    expect(r.netIncome).toBe(1_000_000_000);
    expect(r.bsDiff).toBe(1_000_000_000);
    expect(r.bsExplainedByIncome).toBe(true);
    expect(r.bsTied).toBe(true);
    expect(r.status).toBe('ok');
  });
});

describe('checkWtbIntegrity — demo-like: neraca pas tapi Σ≠0 (RE memuat laba) + AJE tak seimbang', () => {
  const rows: IntegrityWtbRow[] = [
    { code: '1-1100', unadj: 7_000_000_000, aje: 0, adj: 7_000_000_000 },
    { code: '2-1100', unadj: -2_000_000_000, aje: 0, adj: -2_000_000_000 },
    { code: '3-2100', unadj: -5_000_000_000, aje: 0, adj: -5_000_000_000 }, // RE memuat laba
    { code: '4-1100', unadj: -4_000_000_000, aje: 0, adj: -4_000_000_000 },
    { code: '5-1100', unadj: 2_900_000_000, aje: 100_000_000, adj: 3_000_000_000 },
  ];
  const r = checkWtbIntegrity(rows, []);
  /* PR-4d — pola ini DULU dinilai wajar (footing "dijelaskan laba" = info, neraca pas = ok)
     sehingga laba yang tercatat dua kali lolos diam-diam. Kini dikenali eksplisit. */
  it('neraca pas TANPA menutup laba + akun L/R terbuka → LABA TERCATAT GANDA', () => {
    expect(r.footed).toBe(false);
    expect(r.footingExplainedByIncome).toBe(true);
    expect(r.bsDiff).toBe(0);
    expect(r.incomeDoubleCounted).toBe(true);
    expect(r.status).toBe('attention'); // di sini karena AJE tak seimbang, bukan karena laba ganda
    expect(r.messages.some(m => m.level === 'warn' && /TERCATAT DUA KALI/.test(m.text))).toBe(true);
    /* pesan "normal untuk TB pra-tutup" TIDAK boleh muncul untuk pola ini */
    expect(r.messages.some(m => /normal untuk TB pra-tutup/.test(m.text))).toBe(false);
  });
});

describe('checkWtbIntegrity — laba ganda TIDAK menyala pada TB yang koheren (PR-4d)', () => {
  it('TB pra-tutup koheren: Σ adj = 0 & selisih neraca = laba → bukan laba ganda', () => {
    const rows: IntegrityWtbRow[] = [
      { code: '1-1100', unadj: 7_000_000_000, aje: 0, adj: 7_000_000_000 },
      { code: '2-1100', unadj: -2_000_000_000, aje: 0, adj: -2_000_000_000 },
      { code: '3-2100', unadj: -4_000_000_000, aje: 0, adj: -4_000_000_000 }, // RE saldo AWAL
      { code: '4-1100', unadj: -4_000_000_000, aje: 0, adj: -4_000_000_000 },
      { code: '5-1100', unadj: 3_000_000_000, aje: 0, adj: 3_000_000_000 },
    ];
    const r = checkWtbIntegrity(rows, []);
    expect(r.footed).toBe(true);
    expect(r.incomeDoubleCounted).toBe(false);
    expect(r.bsDiff).toBe(r.netIncome);
  });

  it('TB pasca-tutup (tanpa akun L/R): Σ adj = 0 & neraca pas → bukan laba ganda', () => {
    const rows: IntegrityWtbRow[] = [
      { code: '1-1100', unadj: 7_000_000_000, aje: 0, adj: 7_000_000_000 },
      { code: '2-1100', unadj: -2_000_000_000, aje: 0, adj: -2_000_000_000 },
      { code: '3-2100', unadj: -5_000_000_000, aje: 0, adj: -5_000_000_000 },
    ];
    const r = checkWtbIntegrity(rows, []);
    expect(r.netIncome).toBe(0);
    expect(r.incomeDoubleCounted).toBe(false);
    expect(r.status).toBe('ok');
  });
});

describe('checkWtbIntegrity — AJE kolom selaras register → reconciled & ok', () => {
  const rows: IntegrityWtbRow[] = [
    { code: '1-1100', unadj: 5_000_000_000, aje: 0, adj: 5_000_000_000 },
    { code: '1-1300', unadj: 4_340_000_000, aje: -2_340_000_000, adj: 2_000_000_000 },
    { code: '2-1100', unadj: -7_000_000_000, aje: 0, adj: -7_000_000_000 },
    { code: '4-1100', unadj: -2_340_000_000, aje: 0, adj: -2_340_000_000 },
    { code: '5-1100', unadj: 0, aje: 2_340_000_000, adj: 2_340_000_000 },
  ];
  const aje: IntegrityAjeEntry[] = [{ id: 'AJE-01', dr: '5-1100 BPP', cr: '1-1300 Persediaan', amount: 2_340_000_000 }];
  const r = checkWtbIntegrity(rows, aje);
  it('Σ aje=0, tie ke register, neraca pas → ok', () => {
    expect(r.ajeBalanced).toBe(true);
    expect(r.registerReconciled).toBe(true);
    expect(r.ajeMismatches).toHaveLength(0);
    expect(r.status).toBe('ok');
  });
});

describe('checkWtbIntegrity — anomali terdeteksi', () => {
  it('Σ tak nol & bukan laba → footing warn + neraca tak seimbang', () => {
    const rows: IntegrityWtbRow[] = [
      { code: '1-1100', unadj: 5_000_000_000, aje: 0, adj: 5_000_000_000 },
      { code: '2-1100', unadj: -1_000_000_000, aje: 0, adj: -1_000_000_000 },
    ];
    const r = checkWtbIntegrity(rows, []);
    expect(r.footingExplainedByIncome).toBe(false);
    expect(r.bsTied).toBe(false);
    expect(r.status).toBe('attention');
    expect(r.messages.some(m => m.level === 'warn')).toBe(true);
  });

  it('adjusted ≠ unadjusted + AJE → adjMismatch', () => {
    const rows: IntegrityWtbRow[] = [{ code: '1-1100', unadj: 1_000_000_000, aje: 0, adj: 2_000_000_000 }];
    const r = checkWtbIntegrity(rows, []);
    expect(r.adjConsistent).toBe(false);
    expect(r.adjMismatches[0].code).toBe('1-1100');
  });

  it('kolom AJE WTB tak selaras register → ajeMismatch per akun', () => {
    const rows: IntegrityWtbRow[] = [
      { code: '1-1100', unadj: 5_000_000_000, aje: 0, adj: 5_000_000_000 },
      { code: '1-1300', unadj: 4_340_000_000, aje: -2_340_000_000, adj: 2_000_000_000 },
      { code: '2-1100', unadj: -7_000_000_000, aje: 0, adj: -7_000_000_000 },
      { code: '4-1100', unadj: -2_340_000_000, aje: 0, adj: -2_340_000_000 },
      { code: '5-1100', unadj: 0, aje: 2_340_000_000, adj: 2_340_000_000 },
    ];
    // register memberi 5-1100 +2.34M tapi via akun lain (1-1200, bukan 1-1300) → mismatch
    const aje: IntegrityAjeEntry[] = [{ id: 'AJE-X', dr: '5-1100 BPP', cr: '1-1200 Piutang', amount: 2_340_000_000 }];
    const r = checkWtbIntegrity(rows, aje);
    expect(r.registerReconciled).toBe(false);
    expect(r.ajeMismatches.some(mm => mm.code === '1-1200' || mm.code === '1-1300')).toBe(true);
  });
});

/* PR-I1 — SC-1: indikator visual tak boleh hijau saat panel memuat peringatan.
   Chip & badge di view_execution kini memakai `hasWarn`, jadi invarian yang diuji di sini
   ADALAH yang dilihat auditor. `status` sengaja tak ikut berubah — ia menjawab pertanyaan
   lain (boleh finalisasi), dan Fase D-lah yang mengubahnya (PRD §8). */
describe('checkWtbIntegrity — hasWarn: sinyal tampil ≠ gerbang finalisasi (PR-I1)', () => {
  /* Skenario ini persis kasus yang dulu tampil HIJAU: gerbang lolos, peringatan ada. */
  const doubleCounted: IntegrityWtbRow[] = [
    { code: '1-1100', unadj: 10_000_000_000, aje: 0, adj: 10_000_000_000 },
    { code: '2-1100', unadj: -3_000_000_000, aje: 0, adj: -3_000_000_000 },
    { code: '3-2100', unadj: -7_000_000_000, aje: 0, adj: -7_000_000_000 },  // RE sudah memuat laba
    { code: '4-1100', unadj: -5_000_000_000, aje: 0, adj: -5_000_000_000 },  // L/R masih terbuka
    { code: '5-1100', unadj: 3_000_000_000, aje: 0, adj: 3_000_000_000 },
  ];

  it('laba ganda: gerbang lolos (status ok) TAPI indikator tidak hijau', () => {
    const r = checkWtbIntegrity(doubleCounted, []);
    expect(r.incomeDoubleCounted).toBe(true);
    expect(r.status).toBe('ok');        // gerbang finalisasi tak terkunci — perilaku Fase A utuh
    expect(r.hasWarn).toBe(true);       // …namun chip & badge menampilkan "Perlu perhatian"
  });

  it('seed demo: status ok, indikator tetap menandai peringatan', () => {
    const r = checkWtbIntegrity(AMS.WTB, AMS.AJE);
    expect(r.status).toBe('ok');
    expect(r.hasWarn).toBe(true);
  });

  it('TB bersih: tak ada peringatan → indikator hijau', () => {
    const rows: IntegrityWtbRow[] = [
      { code: '1-1100', unadj: 3_000_000_000, aje: 0, adj: 3_000_000_000 },
      { code: '2-1100', unadj: -1_000_000_000, aje: 0, adj: -1_000_000_000 },
      { code: '3-2100', unadj: -2_000_000_000, aje: 0, adj: -2_000_000_000 },
    ];
    const r = checkWtbIntegrity(rows, []);
    expect(r.hasWarn).toBe(false);
    expect(r.status).toBe('ok');
  });

  /* Invarian menyeluruh atas matriks kondisi: hijau ⟺ tanpa pesan warn, dan setiap
     kegagalan gerbang selalu ikut menyalakan indikator (hasWarn ⊇ status 'attention').
     Inilah yang membuat SC-1 tak dapat diakali oleh cabang pesan baru di masa depan. */
  it('invarian: hasWarn ≡ ada pesan warn, dan status attention ⇒ hasWarn', () => {
    const matrix: IntegrityWtbRow[][] = [
      doubleCounted,
      [{ code: '1-1100', unadj: 5_000_000_000, aje: 0, adj: 5_000_000_000 },
        { code: '2-1100', unadj: -1_000_000_000, aje: 0, adj: -1_000_000_000 }],            // neraca timpang
      [{ code: '1-1100', unadj: 1_000_000_000, aje: 0, adj: 2_000_000_000 }],                // adj ≠ unadj + aje
      [{ code: '1-1100', unadj: 2_000_000_000, aje: 500_000_000, adj: 2_500_000_000 },
        { code: '3-2100', unadj: -2_000_000_000, aje: 0, adj: -2_000_000_000 }],             // kolom AJE tak seimbang
      [{ code: '1-1100', unadj: 3_000_000_000, aje: 0, adj: 3_000_000_000 },
        { code: '3-2100', unadj: -3_000_000_000, aje: 0, adj: -3_000_000_000 }],             // bersih
      [],                                                                                     // kosong
    ];
    for (const rows of matrix) {
      const r = checkWtbIntegrity(rows, []);
      expect(r.hasWarn).toBe(r.messages.some(m => m.level === 'warn'));
      if (r.status === 'attention') expect(r.hasWarn).toBe(true);
    }
  });
});
