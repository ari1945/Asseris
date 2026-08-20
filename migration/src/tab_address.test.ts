/* ============================================================
   Tab yang beralamat (PRD V-9) — lapisan murni + gerbang statik.

   Cacat aslinya lolos dari 1631 uji dan hanya terlihat saat aplikasi
   DIJALANKAN: hash menyebut satu tab sementara layar menampilkan tab lain.
   Karena itu yang dipaku di sini bukan "fungsi mengembalikan string", melainkan
   dua invarian yang kalau rusak menghasilkan persis cacat itu:
     · alamat TIDAK boleh ditulis ketika hash menunjuk modul lain (kebocoran), dan
     · alamat TIDAK boleh ditulis ketika tak ada yang berubah (gelung).
   Ditambah gerbang statik SC-9 & sinkronitas daftar tab, yang menutup dua kelas
   cacat DIAM: tautan tab ke modul yang belum beralamat, dan whitelist SC-6 yang
   membusuk saat tab ditambah.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coerceTab, nextTabHash, tabFromHash } from './tab_address';

const SRC = dirname(fileURLToPath(import.meta.url));
const read = (f: string) => readFileSync(join(SRC, f), 'utf8');
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

describe('tabFromHash — hanya tab MILIK modul ini', () => {
  it('membaca tab dari hash modul yang sama', () => {
    expect(tabFromHash('#/wtb?tab=review', 'wtb')).toBe('review');
  });

  it('hash modul LAIN → null (tab tak boleh bocor lintas-modul, SC-5)', () => {
    expect(tabFromHash('#/wtb?tab=review', 'soqm')).toBeNull();
  });

  it('tanpa tab → null (bukan string kosong)', () => {
    expect(tabFromHash('#/wtb', 'wtb')).toBeNull();
    expect(tabFromHash('#/wtb?tab=', 'wtb')).toBeNull();
  });

  it('hash kosong/rusak → null, tidak melempar', () => {
    expect(tabFromHash('', 'wtb')).toBeNull();
    expect(tabFromHash(null, 'wtb')).toBeNull();
    expect(tabFromHash('#/%', 'wtb')).toBeNull();
  });

  it('seleksi tidak mengganggu pembacaan tab', () => {
    expect(tabFromHash('#/continuance/CL-014?tab=riwayat', 'continuance')).toBe('riwayat');
  });
});

describe('nextTabHash — kapan alamat BOLEH ditulis', () => {
  it('tab berubah → hash baru', () => {
    expect(nextTabHash('#/wtb?tab=tb', 'wtb', 'review')).toBe('#/wtb?tab=review');
  });

  it('hash belum punya tab → hash baru', () => {
    expect(nextTabHash('#/wtb', 'wtb', 'tb')).toBe('#/wtb?tab=tb');
  });

  it('SELEKSI DIPERTAHANKAN — menulis tab tak boleh membuang objek yang dibuka', () => {
    expect(nextTabHash('#/continuance/CL-014?tab=a', 'continuance', 'b'))
      .toBe('#/continuance/CL-014?tab=b');
  });

  it('tab sudah sama → null (penjaga anti-gelung lapis 2, SC-3)', () => {
    expect(nextTabHash('#/wtb?tab=review', 'wtb', 'review')).toBeNull();
  });

  it('hash menunjuk modul LAIN → null (SC-5: jangan rusak alamat modul lain)', () => {
    /* Terjadi nyata saat rute berpindah: modul lama masih sempat menjalankan
       efeknya sementara hash sudah menunjuk modul baru. */
    expect(nextTabHash('#/soqm?tab=register', 'wtb', 'review')).toBeNull();
  });

  it('hash kosong/rusak → null, tidak melempar', () => {
    expect(nextTabHash('', 'wtb', 'tb')).toBeNull();
    expect(nextTabHash('#/%', 'wtb', 'tb')).toBeNull();
  });

  it('round-trip: hasilnya terbaca kembali sebagai tab yang sama', () => {
    const next = nextTabHash('#/wtb/ACC-1?tab=tb', 'wtb', 'group') as string;
    expect(tabFromHash(next, 'wtb')).toBe('group');
  });
});

describe('coerceTab — tab tak dikenal jatuh ke fallback (SC-6)', () => {
  const VALID = ['tb', 'review', 'group'];

  it('id sah diteruskan', () => {
    expect(coerceTab('review', 'tb', VALID)).toBe('review');
  });

  it('id BUSUK (tab yang sudah di-rename) → fallback, bukan panel kosong', () => {
    expect(coerceTab('drill', 'tb', VALID)).toBe('tb');
  });

  it('null → fallback', () => {
    expect(coerceTab(null, 'tb', VALID)).toBe('tb');
  });

  it('tanpa whitelist → perilaku lama (menerima apa pun) — perluasan, bukan perubahan kontrak', () => {
    expect(coerceTab('apa-saja', 'tb')).toBe('apa-saja');
    expect(coerceTab('apa-saja', 'tb', [])).toBe('apa-saja');
  });
});

/* ---------------------------------------------------------------
   SC-9 — gerbang statik: `nav(id, { tab })` ke modul yang BELUM memakai
   `useInitialTab` adalah cacat DIAM (tautannya mendarat di tab yang salah,
   tanpa error). Inilah kelas cacat yang dulu membuat deep-link "Evaluasi
   Tahunan" dari Governance selalu mendarat di Register.
   --------------------------------------------------------------- */
describe('SC-9 — setiap sasaran nav({tab}) memakai useInitialTab', () => {
  const viewFiles = () => readdirSync(SRC).filter(f => /^view_.*\.tsx$/.test(f));

  /** Peta moduleId → berkas view, dibaca dari lazy_views.tsx (SSOT rute). */
  function routeToFile(): Record<string, string> {
    const src = read('lazy_views.tsx');
    const map: Record<string, string> = {};
    for (const m of src.matchAll(/'([a-z0-9_]+)':\s*lazy\(\(\)\s*=>\s*import\('\.\/([a-z0-9_]+)'\)/g)) {
      map[m[1]] = m[2] + '.tsx';
    }
    return map;
  }

  /** Semua id modul yang jadi SASARAN `nav(<id>, { … tab … })` di seluruh view. */
  function navTabTargets(): string[] {
    const out = new Set<string>();
    for (const f of viewFiles()) {
      const src = stripComments(read(f));
      for (const m of src.matchAll(/nav\(\s*'([a-z0-9_]+)'\s*,\s*\{([^}]*)\}/g)) {
        if (/\btab\s*:/.test(m[2])) out.add(m[1]);
      }
    }
    return [...out].sort();
  }

  it('ada sasaran yang terdeteksi (kalau nol, regex-nya yang busuk — bukan kodenya yang bersih)', () => {
    expect(navTabTargets().length).toBeGreaterThan(0);
  });

  it('tiap sasaran nav({tab}) memakai useInitialTab di view-nya', () => {
    const map = routeToFile();
    const offenders = navTabTargets().filter((id) => {
      const file = map[id];
      if (!file) return true;                       // rute tak terpetakan = tautan mati
      return !/useInitialTab\(/.test(read(file));
    });
    expect(offenders).toEqual([]);
  });

  it('id modul yang dipakai useInitialTab cocok dengan rute yang memuat view itu', () => {
    /* Salah ketik moduleId (`useInitialTab('wbt', …)`) tak akan pernah cocok dengan
       hash mana pun — hook diam-diam berhenti beralamat. */
    const map = routeToFile();
    const wrong: string[] = [];
    for (const f of viewFiles()) {
      const src = stripComments(read(f));
      for (const m of src.matchAll(/useInitialTab\(\s*'([a-z0-9_]+)'/g)) {
        const id = m[1];
        if (map[id] !== f) wrong.push(`${f}: useInitialTab('${id}') — rute '${id}' dimuat dari ${map[id] || '(tak ada)'}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

/* ---------------------------------------------------------------
   Whitelist SC-6 harus tetap sinkron dengan tab yang benar-benar dirender.
   Tanpa gerbang ini, menambah tab baru diam-diam membuatnya "tak dikenal"
   sehingga deep-link ke tab itu dibuang ke fallback.
   --------------------------------------------------------------- */
describe('SC-6 — whitelist tab tidak boleh membusuk', () => {
  it('SOQM_TAB_IDS = id pada daftar tabs yang dirender view_isqm', () => {
    const src = read('view_isqm.tsx');
    const listed = (src.match(/const SOQM_TAB_IDS = \[([\s\S]*?)\];/) as RegExpMatchArray)[1];
    const declared = [...listed.matchAll(/'([a-z0-9_]+)'/g)].map(m => m[1]).sort();

    const tabsBlock = (src.match(/const tabs = \[([\s\S]*?)\n {2}\];/) as RegExpMatchArray)[1];
    const rendered = [...stripComments(tabsBlock).matchAll(/\{\s*id:\s*'([a-z0-9_]+)'/g)].map(m => m[1]).sort();

    expect(declared).toEqual(rendered);
  });

  it('WIP_TAB_IDS = id tab yang dirender view_wip', () => {
    const src = read('view_wip.tsx');
    const listed = (src.match(/const WIP_TAB_IDS = \[([\s\S]*?)\];/) as RegExpMatchArray)[1];
    const declared = [...listed.matchAll(/'([a-z0-9_]+)'/g)].map(m => m[1]).sort();

    const tabsBlock = (src.match(/const tabs = useMemoWip\(\(\) => \[([\s\S]*?)\], \[/) as RegExpMatchArray)[1];
    const rendered = [...tabsBlock.matchAll(/\{\s*id:\s*'([a-z0-9_]+)'/g)].map(m => m[1]).sort();

    expect(declared).toEqual(rendered);
  });

  it('WTB_TAB_IDS diturunkan dari WTB_TABS (bukan disalin tangan)', () => {
    expect(stripComments(read('view_execution.tsx')))
      .toMatch(/const WTB_TAB_IDS = WTB_TABS\.map\(/);
  });

  it('CKP_TAB_IDS diturunkan dari CKP_TABS (bukan disalin tangan)', () => {
    expect(stripComments(read('view_cockpit2.tsx')))
      .toMatch(/const CKP_TAB_IDS = CKP_TABS\.map\(/);
  });
});

/* ---------------------------------------------------------------
   C-1 — Engagement Cockpit. SC-9 hanya memeriksa modul yang SUDAH jadi sasaran
   `nav(id, { tab })`; cockpit belum, sehingga tab-nya bisa kembali ke
   `useState('ringkasan')` murni tanpa satu pun gerbang memerah — persis keadaan
   sebelum perbaikan ini, ketika `#/cockpit?tab=risiko` selalu mendarat di
   Ringkasan dan tiga pemanggil (`view_home`, `view_home_cockpit`,
   `view_scheduler`) tak punya cara menunjuk tab tertentu.
   --------------------------------------------------------------- */
describe('C-1 — tab cockpit beralamat', () => {
  const src = () => stripComments(read('view_cockpit2.tsx'));

  it("memakai useInitialTab('cockpit', …), bukan useState lokal", () => {
    expect(src()).toMatch(/useInitialTab\(\s*'cockpit',\s*'ringkasan',\s*CKP_TAB_IDS\s*\)/);
    expect(src()).not.toMatch(/const \[tab, setTab\] = useStateCkp\(/);
  });

  it('daftar tab yang dirender = daftar yang jadi whitelist (satu sumber)', () => {
    const listed = (src().match(/const CKP_TABS = \[([\s\S]*?)\];/) as RegExpMatchArray)[1];
    const ids = [...listed.matchAll(/\{\s*id:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]);
    expect(ids).toEqual(['ringkasan', 'jalur', 'anggaran', 'tim', 'risiko']);
    /* tiap id benar-benar punya panel — whitelist yang menerima id tanpa panel
       merender layar kosong alih-alih jatuh ke fallback */
    ids.forEach((id) => expect(src(), `tab '${id}' tanpa panel`).toContain(`tab === '${id}'`));
    expect(src()).toMatch(/<Tabs tabs=\{CKP_TABS\}/);
  });
});
