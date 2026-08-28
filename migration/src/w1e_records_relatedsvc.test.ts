// @vitest-environment jsdom
/* ============================================================
   W1-E — Retensi & Arsip (`records`) · Jasa Terkait SPSJL 4400/4410
   (`relatedsvc`): kontrol yang akhirnya bisa dijangkau tanpa tetikus.

   DUA kelas cacat yang dipaku berkas ini.

   E1 SENGAJA TIDAK DI SINI. Butir E1 paket W1-E (`view_records.tsx:405`,
   `firm: 'KAP Wijaya Hartono & Rekan'` di dalam payload tersegel) DICABUT
   oleh keputusan Ari (#330, `868678d`): baris itu ada di dalam lingkup arc
   `export_identity.ts`, yang MENCABUT argumen `firm:` seluruhnya dari 123
   call-site dan membuat eksporter menarik identitas dari SSOT. Memasang
   `useFirmName()` per call-site di sini justru menegakkan pola yang dibantah
   PRD arc itu. Karena literalnya SENGAJA masih berdiri, gerbang §2 di bawah
   TIDAK boleh memakukan 'nol KAP Wijaya' — ia akan merah atas cacat yang
   bukan miliknya, dan memaksa PR ini bertabrakan dengan arc.

   E2 · KONTROL PALSU DI KERTAS KERJA AUP. Penanda "Pengecualian/Sesuai"
        pada prosedur tambahan dan tombol hapus barisnya adalah
        `<span onClick>`: menurut HTML keduanya bukan elemen interaktif —
        tak masuk urutan tab, tak fokusabel, tak punya peran di pohon
        aksesibilitas. Yang di baliknya bukan hiasan: menandai sebuah
        temuan faktual sebagai PENGECUALIAN adalah keputusan profesional
        SPSJL 4400 yang masuk ke Register Pengecualian dan Laporan Temuan
        Faktual, dan tombol satunya MENGHAPUS baris kertas kerja.

   E3 · BARIS & KARTU TERPILIH sebagai `<tr|div|span onClick>` (sembilan
        situs di kedua berkas). Membuka kotak arsip / memilih prosedur
        adalah interaksi UTAMA kedua modul, dan hanya dapat dicapai
        tetikus.

   ── BATAS jsdom, DINYATAKAN TERANG-TERANGAN (presedens PR #306)
   jsdom MEMODELKAN fokusabilitas — `focus()` pada `<span>` tanpa
   `tabindex` TIDAK memindahkan `document.activeElement`, pada `<button>`
   ia memindahkannya — jadi "tak bisa di-Tab" DAPAT dipaku di sini. Yang
   TIDAK dapat: jsdom tidak mensintesis klik dari Enter/Space (sudah
   diprobe di repo ini: `keydown{Enter}` pada `<button>` = NOL klik).
   Karena itu setiap uji papan-ketik di bawah menjangkau dengan `focus()`
   lalu menjalankan activation behavior milik elemen YANG SEDANG DIFOKUS —
   persis jalur yang ditempuh Enter di peramban. Bukti Enter sungguhan
   adalah ranah `e2e/07-a11y-axe-keyboard.spec.ts`; PR ini TIDAK
   menjalankannya dan tidak berpura-pura menutupnya.
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { createRoot } from 'react-dom/client';

/* ---------------- panggung ---------------- */
const stage: { firmName: string; nav: string[] } = { firmName: 'KAP Uji Widodo & Rekan', nav: [] };
const eksporCalls: { firm?: string; kind?: string }[] = [];

vi.mock('./contexts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./contexts');
  return {
    ...actual,
    /* `firm` = kunci AuthContext yang NYATA (contexts.tsx menaruh `firm: D.FIRM`
       di nilai AuthContext). Mock yang mengarang bentuk konteks adalah cara
       cacat ini bersembunyi terakhir kali — lihat `firm_identity.ts`. */
    useAuth: () => ({ can: () => true, firm: stage.firmName ? { name: stage.firmName } : null }),
    useNav: () => (id: string) => { stage.nav.push(id); },
    /* Berstatus, bukan konstanta: uji AUP menambah prosedur lalu mengubahnya. */
    useAmsPersist: (_k: string, init: unknown) => React.useState(init as never),
  };
});
vi.mock('./shell', () => ({ SubBar: ({ right }: { right?: unknown }) => right as never }));
vi.mock('./api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./api');
  return {
    ...actual,
    api: {
      engagement: {
        list: { query: () => Promise.resolve([]) },
        archive: { mutate: () => Promise.resolve({}) },
      },
    },
  };
});
vi.mock('./export_xlsx', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./export_xlsx');
  return {
    ...actual,
    amsExportXlsx: async (model: { firm?: string; kind?: string }) => { eksporCalls.push(model); },
  };
});

await import('./data_records');            // menerbitkan window.RETENTION (lapisan kanon arsip)
const { RecordsRetention } = await import('./view_records');
const { AUPPanel, OtherAssurance } = await import('./view_relatedsvc');

/* ---------------- harness render ---------------- */
type Root = { render: (node: unknown) => void; unmount: () => void };
let container: HTMLDivElement | null = null;
let root: Root | null = null;

const box = (): HTMLDivElement => container as HTMLDivElement;
const render = (comp: unknown): void => { React.act(() => { (root as Root).render(React.createElement(comp as never)); }); };

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  stage.firmName = 'KAP Uji Widodo & Rekan';
  stage.nav.length = 0;
  eksporCalls.length = 0;
  container = document.createElement('div');
  document.body.appendChild(container);
  React.act(() => { root = createRoot(box()) as unknown as Root; });
});
afterEach(() => {
  React.act(() => { (root as Root).unmount(); });
  container?.remove();
  container = null; root = null;
});

/* ---------------- alat bantu ---------------- */
const tombolBerteks = (frag: string): HTMLButtonElement => {
  const hit = [...box().querySelectorAll('button')].find((b) => (b.textContent || '').includes(frag));
  if (!hit) {
    throw new Error(`tombol "${frag}" tak ada. Yang ada: ${[...box().querySelectorAll('button')].map((b) => b.textContent).join(' | ')}`);
  }
  return hit;
};
const klik = (el: Element): void => { React.act(() => { (el as HTMLElement).click(); }); };
const bukaTab = (frag: string): void => { klik(tombolBerteks(frag)); };

/* Nama aksesibel, versi yang cukup untuk pohon yang dirender kedua modul:
   aria-label → teks <label> pembungkus (kotak centang native) → title → teks. */
const namaAksesibel = (el: Element): string => {
  const aria = (el.getAttribute('aria-label') || '').trim();
  if (aria) return aria;
  if (el.tagName === 'INPUT') {
    const lab = el.closest('label');
    const t = ((lab && lab.textContent) || '').trim();
    if (t) return t;
  }
  const title = (el.getAttribute('title') || '').trim();
  if (title) return title;
  return (el.textContent || '').trim();
};

/* Jangkau dengan papan ketik, lalu aktifkan YANG SEDANG DIFOKUS. Kalau elemen
   itu tak fokusabel, activeElement masih <body> dan langkah pertama sudah
   memerah — persis cacat yang dicabut. */
const jangkauLaluAktifkan = (el: Element): void => {
  (el as HTMLElement).focus();
  expect(document.activeElement, `<${el.tagName.toLowerCase()}> "${namaAksesibel(el)}" tak dapat difokus`).toBe(el);
  React.act(() => { (document.activeElement as HTMLElement).click(); });
};

/* ==================================================================
   §1a · TRIPWIRE LINGKUP — identitas ekspor BUKAN milik PR ini.

   Bukan uji perilaku identitas (itu milik arc `export_identity.ts`),
   melainkan penjaga agar sesi berikutnya tidak "membantu" menambal
   `useFirmName()` di call-site ini dan diam-diam menabrak arc. Kalau
   arc sudah mendarat dan `firm:` sudah dicabut dari call-site, uji ini
   akan MERAH — dan itulah isyarat yang benar untuk mencabutnya.
   ================================================================== */
describe('§1a lingkup — identitas ekspor dibiarkan untuk arc export_identity', () => {
  it('ekspor tetap terbit (tombolnya tidak digerbangi identitas di PR ini)', () => {
    render(RecordsRetention);
    const b = tombolBerteks('Ekspor Register');
    expect(b.disabled).toBe(false);
    klik(b);
    expect(eksporCalls.length).toBe(1);
    expect(eksporCalls[0].kind).toBe('firm-records');
  });

  it('view TIDAK memakai useFirmName() — pola yang dibantah PRD arc (#330)', () => {
    const kode = buangKomentar(src('view_records.tsx'));
    expect(kode, 'E1 dicabut dari W1-E; jangan pasang useFirmName() per call-site di sini')
      .not.toMatch(/useFirmName/);
  });
});

/* ==================================================================
   §1b · KONTROL — records. Fokusabel, bernama, dan mengubah keadaan
   yang benar; sementara pembungkus non-interaktifnya TIDAK lagi
   mengubah apa pun (itulah pembeda "sudah diperbaiki" dari "tombol
   ditempel di atas <tr> yang masih menangkap klik").
   ================================================================== */
describe('§1b kontrol baris & kartu — records', () => {
  const barisRegister = (): HTMLButtonElement[] => {
    bukaTab('Register Arsip');
    const btn = [...box().querySelectorAll<HTMLButtonElement>('table.dtbl tbody tr td:first-child button')];
    expect(btn.length, 'register arsip kosong — sapuan yang tak menemukan apa pun tak membuktikan apa pun').toBeGreaterThan(0);
    return btn;
  };

  it('setiap baris register punya tombol NATIVE yang fokusabel & bernama', () => {
    render(RecordsRetention);
    for (const b of barisRegister()) {
      expect(b.tagName).toBe('BUTTON');
      b.focus();
      expect(document.activeElement, `baris "${b.textContent}" tak dapat difokus`).toBe(b);
      expect(namaAksesibel(b).length, `baris "${b.textContent}" tak bernama`).toBeGreaterThan(0);
    }
  });

  it('dijangkau lalu diaktifkan ⇒ baris benar-benar TERPILIH (aria-pressed)', () => {
    render(RecordsRetention);
    const b = barisRegister()[0];
    expect(b.getAttribute('aria-pressed')).toBe('false');
    jangkauLaluAktifkan(b);
    const lagi = [...box().querySelectorAll<HTMLButtonElement>('table.dtbl tbody tr td:first-child button')][0];
    expect(lagi.getAttribute('aria-pressed')).toBe('true');
  });

  it('<tr> BUKAN lagi kontrol: klik pada barisnya sendiri tidak memilih apa pun', () => {
    render(RecordsRetention);
    const b = barisRegister()[0];
    const tr = b.closest('tr') as HTMLTableRowElement;
    klik(tr);
    const lagi = [...box().querySelectorAll<HTMLButtonElement>('table.dtbl tbody tr td:first-child button')][0];
    expect(lagi.getAttribute('aria-pressed')).toBe('false');
    expect(box().querySelector('.sa-drawer')).toBeNull();
  });

  it('kartu sorotan di Ikhtisar adalah tombol native yang fokusabel & bernama', () => {
    render(RecordsRetention);
    const kartu = [...box().querySelectorAll<HTMLButtonElement>('button.rr-cardbtn')];
    expect(kartu.length, 'tak ada kartu sorotan — panggung kosong tak membuktikan apa pun').toBeGreaterThan(0);
    for (const k of kartu) {
      k.focus();
      expect(document.activeElement, `kartu "${k.textContent}" tak dapat difokus`).toBe(k);
      expect(namaAksesibel(k)).toMatch(/kotak arsip/i);
    }
  });

  it('kartu sorotan dijangkau lalu diaktifkan ⇒ laci kotak arsip terbuka', () => {
    render(RecordsRetention);
    expect(box().querySelector('.sa-drawer')).toBeNull();
    jangkauLaluAktifkan([...box().querySelectorAll<HTMLButtonElement>('button.rr-cardbtn')][0]);
    expect(box().querySelector('.sa-drawer')).not.toBeNull();
  });

  it('chip PO pemusnahan di tab Pemusnahan adalah <button>, bukan <span>', () => {
    render(RecordsRetention);
    bukaTab('Pemusnahan');
    const chip = [...box().querySelectorAll('button.chip')].filter((c) => /^PO-/.test((c.textContent || '').trim()));
    /* Antrean seed memuat PO pemusnahan; kalau suatu saat tidak, uji ini harus
       memerah dan bukan diam-diam lolos. */
    expect(chip.length, 'tak ada chip PO di antrean pemusnahan').toBeGreaterThan(0);
    jangkauLaluAktifkan(chip[0]);
    expect(stage.nav).toContain('procurement');
  });

  it('baris dokumen DMS di dalam laci: nama dokumen adalah tombol yang menavigasi', () => {
    render(RecordsRetention);
    jangkauLaluAktifkan([...box().querySelectorAll<HTMLButtonElement>('button.rr-cardbtn')][0]);
    const laci = box().querySelector('.sa-drawer') as HTMLElement;
    const docBtn = [...laci.querySelectorAll<HTMLButtonElement>('button.rr-rowbtn')];
    if (docBtn.length === 0) return;      // kotak legacy tanpa dokumen DMS granular
    jangkauLaluAktifkan(docBtn[0]);
    expect(stage.nav).toContain('dms');
  });

  it('tidak ada tombol MATI: setiap <button> di modul ini punya penangan atau disabled', () => {
    render(RecordsRetention);
    /* "Usul Pemusnahan" di laci arsip berdiri tanpa onClick sama sekali — dicabut,
       bukan diberi nama (BLOK-A aturan keras no. 4). */
    const teks = [...box().querySelectorAll('button')].map((b) => (b.textContent || '').trim());
    expect(teks.filter((t) => t.includes('Usul Pemusnahan'))).toEqual([]);
  });
});

/* ==================================================================
   §1b · KONTROL — relatedsvc. Yang diuji di sini adalah kontrol yang
   MENGUBAH KERTAS KERJA: penanda pengecualian & penghapus baris.
   ================================================================== */
describe('§1b kontrol kertas kerja AUP — relatedsvc', () => {
  /* Prosedur tambahan adalah satu-satunya baris yang hasilnya DITEGASKAN
     pemeriksa (baris baku dihitung dari ambang klausul), jadi panggungnya
     dibangun lewat jalur pengguna sungguhan: tambah → tandai selesai. */
  const siapkanProsedurTambahan = (): HTMLTableRowElement => {
    render(AUPPanel);
    klik(tombolBerteks('Prosedur Tambahan'));
    const rows = [...box().querySelectorAll<HTMLTableRowElement>('table.dtbl tbody tr')];
    const tr = rows[rows.length - 1];
    const done = tr.querySelector('input[type="checkbox"]') as HTMLInputElement;
    klik(done);
    return [...box().querySelectorAll<HTMLTableRowElement>('table.dtbl tbody tr')].slice(-1)[0];
  };
  const penandaPengecualian = (tr: Element): HTMLInputElement =>
    tr.querySelector('.rs-exc input[type="checkbox"]') as HTMLInputElement;

  it('penanda "Pengecualian" adalah kotak centang NATIVE — fokusabel & bernama', () => {
    const tr = siapkanProsedurTambahan();
    const cb = penandaPengecualian(tr);
    expect(cb, 'penanda pengecualian tak dirender').not.toBeNull();
    expect(cb.tagName).toBe('INPUT');
    expect(cb.type).toBe('checkbox');
    cb.focus();
    expect(document.activeElement, 'penanda pengecualian tak dapat difokus').toBe(cb);
    expect(namaAksesibel(cb)).toBe('Pengecualian');
  });

  it('dijangkau lalu diaktifkan ⇒ prosedur benar-benar masuk Register Pengecualian', () => {
    const tr = siapkanProsedurTambahan();
    expect(penandaPengecualian(tr).checked).toBe(false);
    jangkauLaluAktifkan(penandaPengecualian(tr));

    const tr2 = [...box().querySelectorAll<HTMLTableRowElement>('table.dtbl tbody tr')].slice(-1)[0];
    expect(penandaPengecualian(tr2).checked, 'keadaan pengecualian tidak berubah').toBe(true);

    bukaTab('Register Pengecualian');
    expect(box().textContent || '').not.toContain('Tidak ada pengecualian pada prosedur');
  });

  it('nama penanda TIDAK ikut berubah bersama keadaannya (rujukan yang stabil)', () => {
    const tr = siapkanProsedurTambahan();
    expect(namaAksesibel(penandaPengecualian(tr))).toBe('Pengecualian');
    jangkauLaluAktifkan(penandaPengecualian(tr));
    const tr2 = [...box().querySelectorAll<HTMLTableRowElement>('table.dtbl tbody tr')].slice(-1)[0];
    expect(namaAksesibel(penandaPengecualian(tr2))).toBe('Pengecualian');
  });

  it('penghapus baris adalah <button> bernama — dan benar-benar menghapus barisnya', () => {
    const tr = siapkanProsedurTambahan();
    const del = tr.querySelector('button.rs-delbtn') as HTMLButtonElement;
    expect(del, 'tombol hapus prosedur tambahan tak dirender').not.toBeNull();
    expect(del.tagName).toBe('BUTTON');
    expect(namaAksesibel(del)).toMatch(/^Hapus prosedur tambahan \d+$/);

    const sebelum = box().querySelectorAll('table.dtbl tbody tr').length;
    jangkauLaluAktifkan(del);
    expect(box().querySelectorAll('table.dtbl tbody tr').length).toBe(sebelum - 1);
  });

  it('rail prosedur (tab Data & Dokumen) — tombol native, fokusabel, aria-pressed benar', () => {
    render(AUPPanel);
    bukaTab('Data & Dokumen');
    const rail = [...box().querySelectorAll<HTMLButtonElement>('button.rs-railbtn')];
    expect(rail.length, 'rail prosedur kosong').toBeGreaterThan(0);
    for (const r of rail) {
      r.focus();
      expect(document.activeElement, `rail "${r.textContent}" tak dapat difokus`).toBe(r);
      expect(namaAksesibel(r)).toMatch(/Prosedur \d+/);
    }
    expect(rail.filter((r) => r.getAttribute('aria-pressed') === 'true').length).toBe(1);

    jangkauLaluAktifkan(rail[rail.length - 1]);
    const lagi = [...box().querySelectorAll<HTMLButtonElement>('button.rs-railbtn')];
    expect(lagi[lagi.length - 1].getAttribute('aria-pressed')).toBe('true');
    expect(lagi[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('rail perikatan asurans — tombol native, fokusabel, dan memindahkan seleksi', () => {
    render(OtherAssurance);
    const rail = [...box().querySelectorAll<HTMLButtonElement>('button.rs-railbtn')];
    expect(rail.length, 'rail perikatan asurans kosong').toBeGreaterThan(1);
    for (const r of rail) {
      r.focus();
      expect(document.activeElement, `rail "${r.textContent}" tak dapat difokus`).toBe(r);
      expect(namaAksesibel(r)).toMatch(/perikatan asurans/i);
    }
    expect(rail[0].getAttribute('aria-pressed')).toBe('true');
    jangkauLaluAktifkan(rail[1]);
    const lagi = [...box().querySelectorAll<HTMLButtonElement>('button.rs-railbtn')];
    expect(lagi[1].getAttribute('aria-pressed')).toBe('true');
    expect(lagi[0].getAttribute('aria-pressed')).toBe('false');
  });
});

/* ==================================================================
   §2 · SUMBER — memindai HANYA kedua berkas milik paket W1-E.
   Sensus repo-wide SENGAJA tidak dipasang: 88 berkas lain masih
   memikul pola yang sama dan tujuh paket W1 lain berjalan paralel;
   gerbang repo-wide akan memerahkan `master` bergantian.
   ⚠ Komentar dibuang lebih dulu — `grep -c` membaca komentar sebagai
   kode (jebakan spr2400), dan kepala kedua berkas MENGUTIP pola lama.
   ================================================================== */
const buangKomentar = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/* Regex ditulis sebagai LITERAL, tidak dirakit dari string: escape-nya
   lenyap lewat konstruksi `new RegExp('...')` dan polanya tak pernah cocok.

   TIDAK ADA predikat 'nol KAP Wijaya' di sini — lihat kepala berkas: literal
   penerbit SENGAJA dibiarkan berdiri untuk arc `export_identity.ts` (#330). */
const KONTROL_PALSU = /<(?:tr|div|span|td|li|a|p|section)\b[^>]*\bonClick\b/;

const pelanggaranSumber = (sumber: string): string[] => {
  const kode = buangKomentar(sumber);
  const hit: string[] = [];
  for (const baris of kode.split('\n')) {
    if (KONTROL_PALSU.test(baris)) hit.push(`kontrol palsu: ${baris.trim().slice(0, 90)}`);
  }
  return hit;
};

const src = (f: string): string => readFileSync(join(__dirname, f), 'utf8');

describe('§2 sumber — kedua berkas milik paket W1-E', () => {
  for (const f of ['view_records.tsx', 'view_relatedsvc.tsx']) {
    it(`${f} — nol kontrol palsu`, () => {
      const hit = pelanggaranSumber(src(f));
      expect(hit, `${f} masih memikul:\n  ${hit.join('\n  ')}`).toEqual([]);
    });
  }
});

/* ==================================================================
   §3 · ANTI-TAUTOLOGI — tiap predikat §2 dijalankan atas sumber yang
   SENGAJA dimutasi kembali ke bentuk cacatnya, dan dituntut GAGAL.
   Tanpa bagian ini, hijau §2 tidak membuktikan apa pun.
   ================================================================== */
describe('§3 anti-tautologi — gerbang §2 BISA merah', () => {
  it('span penanda pengecualian (bentuk E2 persis) tertangkap', () => {
    const buruk = `<span onClick={() => editCustom(p.no, 'exception', !p.exception)} style={{ cursor: 'pointer' }}><Badge/></span>`;
    expect(pelanggaranSumber(buruk).some((h) => h.startsWith('kontrol palsu:'))).toBe(true);
  });

  it('span penghapus baris (bentuk E2 persis) tertangkap', () => {
    const buruk = `{p.custom && <span onClick={() => delCustom(p.no)} title="Hapus" style={{ cursor: 'pointer' }}><I.x size={12} /></span>}`;
    expect(pelanggaranSumber(buruk).some((h) => h.startsWith('kontrol palsu:'))).toBe(true);
  });

  it('<tr> dengan atribut MENDAHULUI onClick tertangkap (grep naif melewatkannya)', () => {
    const buruk = `<tr key={b.id} onClick={() => onPick(b)} style={{ cursor: 'pointer' }} className={b.id === selId ? 'sel' : ''}>`;
    expect(pelanggaranSumber(buruk).some((h) => h.startsWith('kontrol palsu:'))).toBe(true);
  });

  it('<div> kartu & rail dengan atribut mendahului onClick tertangkap', () => {
    const kartu = `<div key={h.id} className="panel" style={{ padding: '10px 12px' }} onClick={() => box && onPick(box)}>`;
    const rail = `<div key={p.no} onClick={() => setSelNo(p.no)} style={{ padding: '10px 12px', cursor: 'pointer' }}>`;
    expect(pelanggaranSumber(kartu).some((h) => h.startsWith('kontrol palsu:'))).toBe(true);
    expect(pelanggaranSumber(rail).some((h) => h.startsWith('kontrol palsu:'))).toBe(true);
  });

  it('<span> chip navigasi (bentuk E3 di records) tertangkap', () => {
    const buruk = `<span className="chip tiny" style={{ cursor: 'pointer' }} onClick={() => nav('procurement', { from: 'records' })}>{b.poId}</span>`;
    expect(pelanggaranSumber(buruk).some((h) => h.startsWith('kontrol palsu:'))).toBe(true);
  });

  it('cacat di dalam KOMENTAR tidak dihitung (kepala kedua berkas mengutip pola lama)', () => {
    expect(pelanggaranSumber(`/* dulu: <tr onClick={x}> dan <div onClick={y}> */`)).toEqual([]);
    expect(pelanggaranSumber(`// dulu: <span onClick={() => delCustom(p.no)}>`)).toEqual([]);
  });

  it('bentuk yang SUDAH benar menghasilkan nol temuan', () => {
    const baik = [
      `<button type="button" className="rr-rowbtn" aria-pressed={b.id === selId} onClick={() => onPick(b)}>{b.id}</button>`,
      `<Check on={!!p.exception} onChange={(v: boolean) => editCustom(p.no, 'exception', v)} label="Pengecualian" />`,
    ].join('\n');
    expect(pelanggaranSumber(baik)).toEqual([]);
  });
});
