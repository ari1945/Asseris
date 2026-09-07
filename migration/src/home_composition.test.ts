/* ============================================================
   Beranda — komposisi per-peran & urutan portlet.
   ------------------------------------------------------------
   Sebelum berkas ini, Beranda punya NOL uji sementara ia bercabang untuk keenam
   (kini delapan) peran. Tiga kegagalan senyap yang dipaku di sini:

   (a) Menghapus/mengganti-nama satu modul di `MODULES` (icons.tsx) membuat kartu
       "Area Kerja Saya" firm-ops menunjuk id yang tak ada — kartu tetap dirender
       dengan label = id mentah, dan mengkliknya menavigasi ke rute mati. Tak ada
       yang merah; hanya Beranda dua persona yang rusak.
   (b) Menambah peran di `rbac.ts` tanpa memutakhirkan HM_FIRMOPS_AREAS (atau
       sebaliknya) memasangkan panel yang salah ke peran yang salah — persona
       firm-ops baru akan melihat "Perikatan Saya" yang selamanya kosong, karena
       mereka tak pernah jadi anggota perikatan.
   (c) Filter isolasi W7.5 punya dua kasus yang MUDAH tertukar: `null` (offline /
       belum diketahui) harus TIDAK membatasi, `[]` (tak ada akses) harus
       mengosongkan. Membalikkannya = kebocoran isolasi, atau Beranda kosong palsu
       bagi setiap auditor saat server sedang tak tersambung.

   Ditambah invarian jalur papan-ketik (Tahap 9): urutan portlet yang dihasilkan
   panah dan yang dihasilkan seret berasal dari fungsi murni yang sama.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULE_INDEX } from './icons';
import { CAP, ROLES, can } from './rbac';
import {
  HM_FIRMOPS_AREAS, accessibleEngagements, dropInOrder, firmOpsAreaFor,
  isFirmOpsRole, moveInOrder, visiblePosition,
} from './home_composition';

/* Definisi "firm-ops" yang TIDAK bersumber dari peta yang sedang diuji: peran
   yang tak boleh menyentuh kertas kerja sama sekali. Di rbac.ts keempat peran
   auditor semuanya punya WP_EDIT; kedua peran firm-ops tak satu pun punya. */
const rolesWithoutAuditWork = ROLES.filter((r: string) => !can(r, CAP.WP_EDIT));

describe('Beranda — area kerja firm-ops (HM_FIRMOPS_AREAS)', () => {
  it('(a) setiap module id yang ditawarkan benar-benar terdaftar di MODULE_INDEX', () => {
    const known = new Set(Object.keys(MODULE_INDEX));
    const dead: string[] = [];
    for (const [role, area] of Object.entries(HM_FIRMOPS_AREAS)) {
      expect(area.ids.length, role).toBeGreaterThan(0);
      area.ids.forEach((id) => { if (!known.has(id)) dead.push(`${role} → ${id}`); });
    }
    expect(
      dead,
      `id modul mati di "Area Kerja Saya" — kartu dirender dengan label = id mentah dan ` +
      `navigasinya buntu:\n  ${dead.join('\n  ')}`,
    ).toEqual([]);
  });

  it('(a2) tak ada id duplikat dalam satu area', () => {
    for (const [role, area] of Object.entries(HM_FIRMOPS_AREAS)) {
      expect(new Set(area.ids).size, role).toBe(area.ids.length);
    }
  });

  it('(b) HANYA persona firm-ops yang punya entri — persis peran tanpa WP_EDIT', () => {
    expect(rolesWithoutAuditWork.length).toBeGreaterThan(0);
    expect(Object.keys(HM_FIRMOPS_AREAS).sort()).toEqual(rolesWithoutAuditWork.slice().sort());
  });

  it('(b2) setiap kunci HM_FIRMOPS_AREAS adalah peran yang dikenal rbac', () => {
    const known = new Set(ROLES);
    expect(Object.keys(HM_FIRMOPS_AREAS).filter((r) => !known.has(r))).toEqual([]);
  });

  it('(b3) isFirmOpsRole sejalan untuk SETIAP peran — tak ada peran auditor yang kehilangan "Perikatan Saya"', () => {
    for (const role of ROLES) {
      expect(isFirmOpsRole(role), role).toBe(rolesWithoutAuditWork.includes(role));
    }
  });

  it('(b4) peran tak dikenal / kosong bukan firm-ops (Beranda auditor = default aman)', () => {
    expect(isFirmOpsRole('')).toBe(false);
    expect(isFirmOpsRole(undefined)).toBe(false);
    expect(isFirmOpsRole('Peran Baru Yang Belum Ada')).toBe(false);
    /* prototype pollution: 'constructor'/'toString' TIDAK boleh lolos jadi firm-ops */
    expect(isFirmOpsRole('constructor')).toBe(false);
    expect(isFirmOpsRole('toString')).toBe(false);
    expect(firmOpsAreaFor('constructor')).toBeUndefined();
  });

  it('firmOpsAreaFor mengembalikan area untuk firm-ops, undefined untuk auditor', () => {
    for (const role of ROLES) {
      const area = firmOpsAreaFor(role);
      if (rolesWithoutAuditWork.includes(role)) {
        expect(area, role).toBeTruthy();
        expect(typeof (area as { title: string }).title, role).toBe('string');
      } else {
        expect(area, role).toBeUndefined();
      }
    }
  });
});

describe('Beranda — filter isolasi perikatan (W7.5)', () => {
  const engs = [{ id: 'E-01' }, { id: 'E-02' }, { id: 'E-03' }];

  it('(c) null = offline/belum diketahui → TIDAK membatasi (server tetap otoritatif)', () => {
    expect(accessibleEngagements(engs, null).map((e) => e.id)).toEqual(['E-01', 'E-02', 'E-03']);
    expect(accessibleEngagements(engs, undefined).map((e) => e.id)).toEqual(['E-01', 'E-02', 'E-03']);
  });

  it('(c) [] = tak ada akses → kosong (BUKAN "tak membatasi")', () => {
    expect(accessibleEngagements(engs, [])).toEqual([]);
  });

  it('(c) daftar id → hanya perikatan tempat saya anggota, urutan sumber dipertahankan', () => {
    expect(accessibleEngagements(engs, ['E-03', 'E-01']).map((e) => e.id)).toEqual(['E-01', 'E-03']);
  });

  it('(c) id yang boleh diakses tapi tak ada di roster tidak memunculkan baris hantu', () => {
    expect(accessibleEngagements(engs, ['E-09']).map((e) => e.id)).toEqual([]);
  });

  it('(c) tidak memutasi array sumber', () => {
    const src = [{ id: 'E-01' }, { id: 'E-02' }];
    const out = accessibleEngagements(src, null);
    out.pop();
    expect(src).toHaveLength(2);
  });

  it('(c) roster kosong/absen tak melempar', () => {
    expect(accessibleEngagements([], null)).toEqual([]);
    expect(accessibleEngagements(null, ['E-01'])).toEqual([]);
    expect(accessibleEngagements(undefined, null)).toEqual([]);
  });
});

describe('Kokpit — urutan portlet (seret & panah memakai fungsi yang sama)', () => {
  const O = ['portofolio', 'persetujuan', 'perhatian', 'kualitas', 'keuangan', 'tim'];

  it('dropInOrder: menyeret ke bawah menempatkan SESUDAH sasaran', () => {
    expect(dropInOrder(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('dropInOrder: menyeret ke atas menempatkan SEBELUM sasaran', () => {
    expect(dropInOrder(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('dropInOrder: menjatuhkan pada diri sendiri / id asing = tanpa perubahan', () => {
    expect(dropInOrder(O, 'kualitas', 'kualitas')).toEqual(O);
    expect(dropInOrder(O, 'entah', 'kualitas')).toEqual(O);
    expect(dropInOrder(O, 'kualitas', 'entah')).toEqual(O);
  });

  it('dropInOrder & moveInOrder tak memutasi masukan, dan tak pernah kehilangan/menggandakan portlet', () => {
    const before = O.slice();
    for (const out of [dropInOrder(O, 'tim', 'portofolio'), moveInOrder(O, 'tim', -1)]) {
      expect(O).toEqual(before);
      expect(out.slice().sort()).toEqual(before.slice().sort());
    }
  });

  it('panah: ±1 menukar dengan tetangga', () => {
    expect(moveInOrder(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveInOrder(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
  });

  it('panah: di ujung daftar = tanpa perubahan (tak melompat/berputar)', () => {
    expect(moveInOrder(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(moveInOrder(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
    expect(moveInOrder(['a', 'b', 'c'], 'entah', 1)).toEqual(['a', 'b', 'c']);
  });

  it('panah MELEWATI portlet tersembunyi — satu tekanan = satu perpindahan yang TERLIHAT', () => {
    /* "persetujuan" hilang saat antrean kosong. Tanpa daftar `visible`, panah dari
       "portofolio" akan menukarnya dengan portlet tak-kasat-mata: layar diam. */
    const vis = O.filter((id) => id !== 'persetujuan');
    const out = moveInOrder(O, 'portofolio', 1, vis);
    expect(out.filter((id) => id !== 'persetujuan')).toEqual(['perhatian', 'portofolio', 'kualitas', 'keuangan', 'tim']);
    expect(out).toHaveLength(O.length); // portlet tersembunyi tetap ada di urutan tersimpan
  });

  it('panah: bolak-balik satu langkah mengembalikan urutan semula', () => {
    const vis = O.filter((id) => id !== 'persetujuan');
    const fwd = moveInOrder(O, 'kualitas', 1, vis);
    expect(moveInOrder(fwd, 'kualitas', -1, vis)).toEqual(O);
  });

  it('visiblePosition: 1-berbasis atas yang terlihat, 0 bila tersembunyi', () => {
    const vis = O.filter((id) => id !== 'persetujuan');
    expect(visiblePosition(vis, 'portofolio')).toBe(1);
    expect(visiblePosition(vis, 'perhatian')).toBe(2);
    expect(visiblePosition(vis, 'persetujuan')).toBe(0);
  });
});

/* Fungsi urutan yang murni di atas tak berarti apa-apa kalau satu-satunya jalan
   memanggilnya adalah tetikus. Gerbang statik ini memaku BENTUK gagangnya —
   `<span draggable>` (keadaan sebelum 2026-08-20) tak fokusabel, jadi pengguna
   papan ketik tak bisa menyusun ulang kokpitnya sama sekali. Sengaja sempit:
   hanya berkas ini; permukaan drag lain (view_dashboard/view_firm/view_mytasks)
   punya utang yang sama tapi bukan lingkup perbaikan ini. */
describe('Kokpit — gagang susun-ulang adalah kontrol native', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'view_home_cockpit.tsx'), 'utf8');

  it('gagang dirender sebagai <button>, bukan <span>/<div> berpura-pura', () => {
    expect(/<(span|div)[^>]*className="hc-grip"/.test(src), '<span className="hc-grip"> tak fokusabel').toBe(false);
    expect(/<button[\s\S]{0,220}className="hc-grip"/.test(src)).toBe(true);
  });

  it('gagang menerima papan ketik (onKeyDown) dan punya nama aksesibel', () => {
    const btn = src.slice(src.indexOf('className="hc-grip"'));
    const tag = btn.slice(0, btn.indexOf('>'));
    expect(/\bonKeyDown=/.test(tag), 'gagang tanpa onKeyDown = panah mati').toBe(true);
    expect(/\baria-label=/.test(tag), 'gagang ikon-saja butuh nama aksesibel').toBe(true);
  });

  it('setiap portlet memakai gagang yang sama (satu kontrol, bukan enam salinan)', () => {
    expect((src.match(/<HcGrip grip=\{grip\} \/>/g) || []).length).toBe(6);
  });
});
