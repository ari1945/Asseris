/* ============================================================
   Uji alamat rute hash (PRD Fase B · PR-3)
   ------------------------------------------------------------
   Environment `node` biasa — berkas yang diuji sengaja MURNI & bebas-DOM.
   Ini bagian paling mahal bila salah (R1 PRD: satu-satunya jalur navigasi
   app), jadi yang diuji bukan hanya jalur bahagia melainkan setiap bentuk
   rusak yang bisa datang dari tautan tempelan pengguna.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { parseHash, buildHash, sameLocation, initialLocation, oneShotSeeds, resolveRoute, ROUTE_ALIAS } from './route_hash';

const KNOWN = ['home', 'wtb', 'workpapers', 'psak46', 'sa530', 'continuance', 'wip'];
const isKnown = (id: string): boolean => KNOWN.includes(id);

describe('parseHash — bentuk yang benar', () => {
  it('rute saja', () => {
    expect(parseHash('#/wtb')).toEqual({ route: 'wtb', sel: null, tab: null });
  });

  it('rute + seleksi', () => {
    expect(parseHash('#/workpapers/R')).toEqual({ route: 'workpapers', sel: 'R', tab: null });
  });

  it('rute + seleksi + tab', () => {
    expect(parseHash('#/workpapers/R?tab=procs')).toEqual({ route: 'workpapers', sel: 'R', tab: 'procs' });
  });

  it('rute + tab tanpa seleksi', () => {
    expect(parseHash('#/psak46?tab=fiskal')).toEqual({ route: 'psak46', sel: null, tab: 'fiskal' });
  });

  it('toleran terhadap hash tanpa "#" dan tanpa "/" di depan', () => {
    expect(parseHash('wtb')).toEqual({ route: 'wtb', sel: null, tab: null });
    expect(parseHash('/wtb')).toEqual({ route: 'wtb', sel: null, tab: null });
  });

  it('id perikatan ber-tanda-hubung utuh', () => {
    expect(parseHash('#/continuance/ENG-2025-063')?.sel).toBe('ENG-2025-063');
  });

  it('nilai ter-encode dipulihkan (spasi, garis miring)', () => {
    expect(parseHash('#/wtb/Kas%20%26%20Setara')?.sel).toBe('Kas & Setara');
    expect(parseHash('#/wtb/a%2Fb')?.sel).toBe('a/b');
  });

  it('mengambil tab di antara parameter lain, bukan parameter pertama saja', () => {
    expect(parseHash('#/wtb?from=aje&tab=drill')?.tab).toBe('drill');
  });
});

describe('parseHash — bentuk rusak jatuh ke null (bukan crash, bukan layar putih)', () => {
  it.each([
    ['kosong', ''],
    ['null', null],
    ['undefined', undefined],
    ['hanya pagar', '#'],
    ['hanya garis miring', '#/'],
    ['rute diawali tanda hubung', '#/-wtb'],
    ['rute dengan spasi', '#/wtb lama'],
    ['rute dengan titik dua', '#/wtb:1'],
    ['persen telanjang', '#/%'],
  ])('%s', (_label, input) => {
    expect(parseHash(input as string)).toBeNull();
  });

  it('seleksi rusak tak menjatuhkan rute — rute tetap terbaca', () => {
    const r = parseHash('#/wtb/%E0%A4%A');
    expect(r?.route).toBe('wtb');
    expect(r?.sel).toBeNull();
  });

  it('segmen berlebih diabaikan, bukan ditolak', () => {
    expect(parseHash('#/workpapers/R/lama/sekali')).toEqual({ route: 'workpapers', sel: 'R', tab: null });
  });

  it('sel & tab kosong dinormalkan ke null (bukan string kosong)', () => {
    expect(parseHash('#/wtb/?tab=')).toEqual({ route: 'wtb', sel: null, tab: null });
  });
});

describe('buildHash', () => {
  it('rute saja', () => expect(buildHash({ route: 'wtb' })).toBe('#/wtb'));
  it('mengabaikan sel/tab null & string kosong', () => {
    expect(buildHash({ route: 'wtb', sel: null, tab: null })).toBe('#/wtb');
    expect(buildHash({ route: 'wtb', sel: '', tab: '' })).toBe('#/wtb');
  });
  it('meng-encode karakter yang akan merusak bentuk', () => {
    expect(buildHash({ route: 'wtb', sel: 'a/b' })).toBe('#/wtb/a%2Fb');
    expect(buildHash({ route: 'wtb', tab: 'a b' })).toBe('#/wtb?tab=a%20b');
  });
});

describe('round-trip parse(build(x)) === x', () => {
  const cases: { route: string; sel: string | null; tab: string | null }[] = [
    { route: 'wtb', sel: null, tab: null },
    { route: 'workpapers', sel: 'R', tab: 'procs' },
    { route: 'continuance', sel: 'ENG-2025-063', tab: null },
    { route: 'psak46', sel: null, tab: 'fiskal' },
    { route: 'wtb', sel: 'Kas & Setara', tab: 'a b' },
    { route: 'wtb', sel: 'a/b', tab: 'x?y=z' },
    { route: 'wtb', sel: '#anchor', tab: '&amp' },
  ];
  it.each(cases)('%o', (loc) => {
    expect(parseHash(buildHash(loc))).toEqual(loc);
  });
});

describe('sameLocation — penjaga anti-gelung', () => {
  it('sama persis', () => {
    expect(sameLocation({ route: 'wtb', sel: null, tab: null }, { route: 'wtb', sel: null, tab: null })).toBe(true);
  });
  it('beda tab = beda lokasi', () => {
    expect(sameLocation({ route: 'wtb', sel: null, tab: 'a' }, { route: 'wtb', sel: null, tab: 'b' })).toBe(false);
  });
  it('beda sel = beda lokasi', () => {
    expect(sameLocation({ route: 'wtb', sel: 'A', tab: null }, { route: 'wtb', sel: 'B', tab: null })).toBe(false);
  });
  it('null vs objek', () => {
    expect(sameLocation(null, { route: 'wtb', sel: null, tab: null })).toBe(false);
    expect(sameLocation(null, null)).toBe(true);
  });
});

describe('initialLocation — presedens hash > sesi terakhir > home', () => {
  it('hash menang atas sesi terakhir', () => {
    const r = initialLocation('#/workpapers/R?tab=procs', 'wtb', isKnown);
    expect(r.source).toBe('hash');
    expect(r.loc).toEqual({ route: 'workpapers', sel: 'R', tab: 'procs' });
  });

  it('tanpa hash → sesi terakhir', () => {
    const r = initialLocation('', 'wtb', isKnown);
    expect(r.source).toBe('storage');
    expect(r.loc.route).toBe('wtb');
  });

  it('tanpa keduanya → home', () => {
    expect(initialLocation('', null, isKnown).source).toBe('default');
    expect(initialLocation('', null, isKnown).loc.route).toBe('home');
  });

  it('hash menunjuk rute TAK DIKENAL → jatuh ke sesi terakhir, bukan layar putih', () => {
    const r = initialLocation('#/modulyangtidakada', 'wtb', isKnown);
    expect(r.source).toBe('storage');
    expect(r.loc.route).toBe('wtb');
  });

  it('rute tersimpan yang tak dikenal juga dibuang (modul dihapus antar-rilis)', () => {
    const r = initialLocation('', 'modul-lama-yang-dihapus', isKnown);
    expect(r.source).toBe('default');
    expect(r.loc.route).toBe('home');
  });

  it('hash rusak + sesi terakhir rusak → home', () => {
    expect(initialLocation('#/%', 'juga-tak-ada', isKnown).loc.route).toBe('home');
  });
});

/* ============================================================
   Alias rute — modul yang DIGABUNG meninggalkan id yatim di bookmark
   pengguna, `ams.route` sesi terakhir, dan `sourceRoute` item persetujuan
   lama. Tanpa terjemahan, tautan itu diam-diam mendarat di halaman lain.
   docs/prd-wip-merge-valuasi-realisasi.md (SC-1).
   ============================================================ */
describe('resolveRoute — alias id lama', () => {
  it('id lama diterjemahkan ke penggantinya', () => {
    expect(resolveRoute('wipreal')).toBe('wip');
  });

  it('id yang bukan alias dikembalikan apa adanya', () => {
    expect(resolveRoute('wtb')).toBe('wtb');
    expect(resolveRoute('home')).toBe('home');
    expect(resolveRoute('tidak-ada')).toBe('tidak-ada');
  });

  it('tak terkecoh properti bawaan Object (hasOwnProperty, bukan `in`)', () => {
    expect(resolveRoute('constructor')).toBe('constructor');
    expect(resolveRoute('toString')).toBe('toString');
    expect(resolveRoute('__proto__')).toBe('__proto__');
  });

  it('alias tak pernah berantai — nilai peta bukan kunci peta', () => {
    for (const target of Object.values(ROUTE_ALIAS)) {
      expect(Object.prototype.hasOwnProperty.call(ROUTE_ALIAS, target)).toBe(false);
    }
  });
});

describe('initialLocation — bookmark ber-id lama tetap mendarat benar', () => {
  it('hash `#/wipreal` → modul penggantinya, BUKAN dianggap tautan busuk', () => {
    const r = initialLocation('#/wipreal', 'wtb', isKnown);
    expect(r.source).toBe('hash');
    expect(r.loc.route).toBe('wip');
  });

  it('seleksi & tab pada tautan lama ikut terbawa', () => {
    const r = initialLocation('#/wipreal/ENG-2025-014?tab=valuasi', null, isKnown);
    expect(r.loc).toEqual({ route: 'wip', sel: 'ENG-2025-014', tab: 'valuasi' });
  });

  it('`ams.route` sesi terakhir ber-id lama juga diterjemahkan (bukan dibuang ke home)', () => {
    const r = initialLocation('', 'wipreal', isKnown);
    expect(r.source).toBe('storage');
    expect(r.loc.route).toBe('wip');
  });
});

/* ============================================================
   PR-6 (PRD prd-sales-pipeline-deepening · SC-15) — seed satu-tembak.
   Sebelum ini, `#/pipeline/OPP-103` mendarat di modul yang benar dengan rekaman
   TIDAK terbuka: sumbu `sel` ditulis ke alamat tapi tak pernah dibaca kembali.
   ============================================================ */
describe('oneShotSeeds — alamat membuka rekamannya', () => {
  it('seleksi pada alamat menjadi kunci yang dibaca useInitialSelection', () => {
    expect(oneShotSeeds({ route: 'pipeline', sel: 'OPP-103', tab: null }))
      .toEqual([{ key: 'ams.navsel.pipeline', value: 'OPP-103' }]);
  });

  it('tab & seleksi sekaligus', () => {
    expect(oneShotSeeds({ route: 'wip', sel: 'ENG-2025-014', tab: 'Realisasi' })).toEqual([
      { key: 'ams.navtab.wip', value: 'Realisasi' },
      { key: 'ams.navsel.wip', value: 'ENG-2025-014' },
    ]);
  });

  it('alias rute diterjemahkan — bookmark lama menyeed modul penggantinya', () => {
    const seeds = oneShotSeeds({ route: 'wipreal', sel: 'X', tab: null });
    expect(seeds[0].key).toBe('ams.navsel.' + resolveRoute('wipreal'));
  });

  it('tanpa sel/tab tidak menulis apa pun', () => {
    expect(oneShotSeeds({ route: 'pipeline', sel: null, tab: null })).toEqual([]);
    expect(oneShotSeeds({ route: 'pipeline', sel: '', tab: '' })).toEqual([]);
    expect(oneShotSeeds(null)).toEqual([]);
  });

  it('bulak-balik: alamat yang dibangun buildHash menyeed kembali nilai yang sama', () => {
    const loc = { route: 'pipeline', sel: 'OPP-103', tab: null };
    const parsed = parseHash(buildHash(loc));
    expect(oneShotSeeds(parsed)).toEqual([{ key: 'ams.navsel.pipeline', value: 'OPP-103' }]);
  });
});
