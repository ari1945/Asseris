import { describe, it, expect } from 'vitest';
import {
  attestYear, attestKeyOf, attestContentHash, attestCanonicalContent,
  attestChainLinks, attestChainComplete, attestVoidedRoles, FA_LINK_LABEL,
  type FaRole, type FaState,
} from './canon_firm_attest';

/* ============================================================
   Atestasi mutu firma (SMM 1 ¶20 · ¶53–54).

   Uji inti: (1) kunci ber-4-digit agar lolos allow-list server, dan
   (2) tanda tangan GUGUR saat kesimpulan diubah sesudah ditandatangani —
   bentuk lama menyalin `chain` apa adanya pada `saveConclusion`.
   ============================================================ */

const ROLES: FaRole[] = [
  { id: 'leader', label: 'Pimpinan SOQM (¶20(b))' },
  { id: 'approver', label: 'Managing Partner (¶20(a))', needsPrev: 'leader' },
];

const stateWith = (conclusion: string, chain: FaState['chain'] = {}): FaState =>
  ({ period: '1 Jan – 31 Des 2025', conclusion, engineLabel: '', chain });

describe('attestYear — kunci yang lolos allow-list server', () => {
  it('menarik 4 digit dari label periode manusiawi', () => {
    expect(attestYear('1 Jan – 31 Des 2025')).toBe('2025');
    expect(attestYear('FY2026')).toBe('2026');
    expect(attestYear('2024')).toBe('2024');
  });

  it('label tanpa tahun MENOLAK menebak — tak ada fallback yang bisa diisi', () => {
    /* Bentuk lama: `attestYear(period, fallback?)`, dan bila fallback pun kosong
       ia jatuh ke `new Date().getFullYear()`. Parameter itu hanya hidup ketika
       label kehilangan tahunnya — tempat sempurna bagi tahun dari domain lain
       untuk duduk tanpa gejala. Tiga modul SMM mengisinya dengan tahun kewajiban
       PPL sebagai tahun atestasi mutu firma. Sekarang tak ada tempatnya lagi. */
    expect(attestYear('Tahun Berjalan')).toBeNull();
    expect(attestYear('')).toBeNull();
    expect(attestYear(null)).toBeNull();
    expect(attestYear.length).toBe(1);
  });

  it('kunci yang dihasilkan cocok dengan regex allow-list server', () => {
    const re = /^firmAttest\.soqmAnnualEval\.\d{4}$/;
    for (const p of ['1 Jan – 31 Des 2025', 'FY2026', '2024']) {
      const y = attestYear(p);
      expect(y).not.toBeNull();
      expect(re.test('firmAttest.' + attestKeyOf('soqmAnnualEval', Number(y)))).toBe(true);
    }
  });
});

describe('attestContentHash — apa yang diikat tanda tangan', () => {
  it('kesimpulan berbeda → sidik jari berbeda', () => {
    const a = attestContentHash({ period: 'P', conclusion: 'Memadai' });
    const b = attestContentHash({ period: 'P', conclusion: 'Tidak memadai' });
    expect(a).not.toBe(b);
  });

  it('periode berbeda → sidik jari berbeda', () => {
    expect(attestContentHash({ period: '2025', conclusion: 'X' }))
      .not.toBe(attestContentHash({ period: '2026', conclusion: 'X' }));
  });

  it('spasi tepi tidak mengubah sidik jari', () => {
    expect(attestContentHash({ period: ' P ', conclusion: ' X ' }))
      .toBe(attestContentHash({ period: 'P', conclusion: 'X' }));
  });

  it('rekomendasi mesin BUKAN bagian dari yang ditandatangani', () => {
    const base = { period: 'P', conclusion: 'X' };
    expect(attestCanonicalContent({ ...base, engineLabel: 'Memadai' } as never))
      .toBe(attestCanonicalContent(base));
  });
});

describe('attestChainLinks — tanda tangan gugur saat isi berubah', () => {
  it('ditandatangani atas isi yang berlaku → signed', () => {
    const st = stateWith('Memadai');
    const hash = attestContentHash(st);
    st.chain.leader = { by: 'Anindya Pramesti', byUserId: 'u-ap', at: '2026-08-12T00:00:00.000Z', contentHash: hash };
    const links = attestChainLinks(st, ROLES);
    expect(links[0].status).toBe('signed');
    expect(links[1].status).toBe('pending');
    expect(attestChainComplete(links)).toBe(false);
  });

  it('MENULIS ULANG kesimpulan menggugurkan tanda tangan yang sudah ada', () => {
    const signedHash = attestContentHash(stateWith('Memadai'));
    const after = stateWith('Tidak memadai — defisiensi pervasif', {
      leader: { by: 'Anindya Pramesti', byUserId: 'u-ap', at: '2026-08-12T00:00:00.000Z', contentHash: signedHash },
    });
    const links = attestChainLinks(after, ROLES);
    expect(links[0].status).toBe('voided');
    expect(attestVoidedRoles(links)).toEqual(['leader']);
    expect(attestChainComplete(links)).toBe(false);
  });

  it('rantai dua lapis lengkap hanya bila KEDUANYA atas isi yang berlaku', () => {
    const st = stateWith('Memadai');
    const h = attestContentHash(st);
    st.chain.leader = { by: 'A', byUserId: 'u-a', at: 'x', contentHash: h };
    st.chain.approver = { by: 'B', byUserId: 'u-b', at: 'y', contentHash: h };
    expect(attestChainComplete(attestChainLinks(st, ROLES))).toBe(true);

    st.chain.approver = { by: 'B', byUserId: 'u-b', at: 'y', contentHash: 'lain' };
    expect(attestChainComplete(attestChainLinks(st, ROLES))).toBe(false);
  });

  it('tanda tangan warisan tanpa contentHash ditandai legacy, bukan sah', () => {
    const st = stateWith('Memadai', { leader: { by: 'A', at: '12 Agu 2026' } });
    const links = attestChainLinks(st, ROLES);
    expect(links[0].status).toBe('legacy');
    expect(attestChainComplete(links)).toBe(false);
  });

  it('state kosong/null tidak melempar', () => {
    expect(attestChainLinks(null, ROLES).every((l) => l.status === 'pending')).toBe(true);
    expect(attestChainComplete(attestChainLinks(undefined, ROLES))).toBe(false);
  });

  it('setiap status punya kalimat siap-tampil', () => {
    for (const s of ['pending', 'signed', 'voided', 'legacy'] as const) {
      expect(FA_LINK_LABEL[s].length).toBeGreaterThan(0);
    }
  });
});
