/* ============================================================
   Checklist Kepatuhan — identitas perikatan berhenti jadi literal

   Cacat yang ditutup (view_compliance.tsx, panel "Konteks Engagement"):

       RowKv label="Klien"      v="PT Sentosa Makmur"
       RowKv label="Engagement" v="ENG-2025-014"
       RowKv label="Preparer"   v="Dimas R."

   Klien, perikatan, dan penyusun adalah konstanta TANPA SYARAT. Ini lebih
   buruk daripada fallback: fallback setidaknya benar ketika perikatan aktif
   ada, sedangkan panel ini salah untuk SETIAP perikatan kecuali satu — dan ia
   duduk di bawah judul yang mengklaim menerangkan perikatan yang sedang
   dilihat pengguna. "Total Prosedur" di sebelahnya MEMANG turunan, sehingga
   ketiga literal itu terbaca sama tepercayanya.

   Yang dibuktikan berkas ini:
     1. TRIPWIRE sumber — nol id perikatan / nama klien / nama staf literal
        tersisa di view (komentar dibuang lebih dulu), plus uji ANTI-TAUTOLOGI
        yang membuktikan gerbang itu BISA merah.
     2. Baris konteks digerakkan perikatan aktif: ganti perikatan ⇒ baris
        berubah; tanpa perikatan ⇒ em-dash, BUKAN nama.
     3. Penyusun berasal dari rantai sign-off kertas kerja (engagement-scoped,
        SSOT server), lewat ref kanonik WP_MODULE_MAP — bukan register
        WORKPAPERS yang tak punya kunci perikatan sama sekali.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import {
  complianceContextRows, compliancePreparer, KOSONG,
  type ComplianceCtxRow,
} from './compliance_context';

/* ---------- register yang dipakai sebagai kamus literal terlarang ---------- */
interface ClientRow { id: string; name: string }
interface EngRow { id: string; clientId: string; partner?: string; manager?: string }
interface TeamRow { name: string }
interface WpRow { ref: string; preparer?: string; reviewer?: string }

const A = AMS as unknown as {
  CLIENTS: ClientRow[]; ENGAGEMENTS: EngRow[]; TEAM: TeamRow[]; WORKPAPERS: WpRow[];
};

const clientById = (id: string): ClientRow => {
  const c = A.CLIENTS.find((x) => x.id === id);
  if (!c) throw new Error(`klien ${id} tak ada di register`);
  return c;
};
const engById = (id: string): EngRow => {
  const e = A.ENGAGEMENTS.find((x) => x.id === id);
  if (!e) throw new Error(`perikatan ${id} tak ada di register`);
  return e;
};

/* Nama klien ditulis di view dalam bentuk terpangkas ("PT Sentosa Makmur"
   untuk "PT Sentosa Makmur Tbk"), jadi pencocokan HARUS memuat varian —
   kalau tidak, gerbang buta pada cacat yang justru memicunya. */
const variasiKlien = (n: string): string[] => {
  const out = [n];
  const tanpaTbk = n.replace(/\s+Tbk\.?$/i, '').trim();
  if (tanpaTbk && !out.includes(tanpaTbk)) out.push(tanpaTbk);
  const tanpaPersero = n.replace(/\s*\(Persero\)\s*/i, ' ').trim();
  if (tanpaPersero && !out.includes(tanpaPersero)) out.push(tanpaPersero);
  return out;
};

/* Nama orang ditulis dalam bentuk penuh ("Dimas Raharjo"), bergelar
   ("Hartono Wijaya, CPA"), atau disingkat ("Dimas R.") — ketiganya literal. */
const variasiOrang = (n: string): string[] => {
  const out = [n];
  const tanpaGelar = n.replace(/,.*$/, '').trim();
  if (tanpaGelar && !out.includes(tanpaGelar)) out.push(tanpaGelar);
  const p = tanpaGelar.split(/\s+/);
  if (p.length >= 2 && p[1].length > 0) {
    const singkat = `${p[0]} ${p[1][0]}.`;
    if (!out.includes(singkat)) out.push(singkat);
  }
  return out;
};

const namaKlien = (): string[] => [...new Set(A.CLIENTS.flatMap((c) => variasiKlien(c.name)))];
const namaOrang = (): string[] => [...new Set([
  ...A.TEAM.map((t) => t.name),
  ...A.ENGAGEMENTS.flatMap((e) => [e.partner || '', e.manager || '']),
  ...A.WORKPAPERS.flatMap((w) => [w.preparer || '', w.reviewer || '']),
].filter((n) => n && n !== '—').flatMap(variasiOrang))];

/* Gerbang sumber. Komentar dibuang lebih dulu: kepala berkas view MENGUTIP
   pola lama sebagai catatan sejarah, dan kutipan itu bukan kode. */
const buangKomentar = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const pelanggaranIdentitas = (sumber: string): string[] => {
  const kode = buangKomentar(sumber);
  const hit: string[] = [];
  const eng = kode.match(/\bENG-\d{4}-\d{3}\b/g);
  if (eng) hit.push(...[...new Set(eng)].map((x) => `id perikatan literal: ${x}`));
  namaKlien().forEach((n) => { if (kode.includes(n)) hit.push(`nama klien literal: ${n}`); });
  namaOrang().forEach((n) => { if (kode.includes(n)) hit.push(`nama orang literal: ${n}`); });
  /* jaring luas: entitas PT apa pun, termasuk klien yang belum ada di register */
  const pt = kode.match(/\bPT\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+/g);
  if (pt) hit.push(...[...new Set(pt)].map((x) => `entitas literal: ${x}`));
  return [...new Set(hit)];
};

const srcCompliance = (): string => readFileSync(join(__dirname, 'view_compliance.tsx'), 'utf8');

describe('TRIPWIRE sumber — nol identitas literal di view_compliance', () => {
  it('view tak memuat id perikatan / nama klien / nama orang literal', () => {
    const hit = pelanggaranIdentitas(srcCompliance());
    expect(hit, `identitas literal tersisa:\n  ${hit.join('\n  ')}`).toEqual([]);
  });

  it('view membaca perikatan & klien aktif dari konteks, bukan merakit sendiri', () => {
    const s = srcCompliance();
    expect(s).toMatch(/useFirm\(/);
    expect(s).toMatch(/useAudit\(/);
    expect(s).toMatch(/complianceContextRows\(/);
    expect(s).toMatch(/activeClient/);
    expect(s).toMatch(/activeEngagement/);
  });

  it('ANTI-TAUTOLOGI: gerbang MERAH pada sumber sintetis yang memuat literal', () => {
    const buruk = [
      'RowKv label="Klien" v="PT Sentosa Makmur"',
      'RowKv label="Engagement" v="ENG-2025-014"',
      'RowKv label="Preparer" v="Dimas R."',
    ].join('\n');
    const hit = pelanggaranIdentitas(buruk);
    expect(hit).toContain('id perikatan literal: ENG-2025-014');
    expect(hit).toContain('nama klien literal: PT Sentosa Makmur');
    expect(hit).toContain('nama orang literal: Dimas R.');
  });

  it('ANTI-TAUTOLOGI: gerbang menangkap klien & orang yang BUKAN pemicu cacat', () => {
    /* kalau gerbang cuma memaku tiga literal yang kebetulan ada hari ini, ia
       tak menahan kambuh dalam bentuk lain. */
    const hit = pelanggaranIdentitas('const x = "PT Graha Properti Investama"; const y = "Fajar N."; const z = "ENG-2025-063";');
    expect(hit).toContain('nama klien literal: PT Graha Properti Investama');
    expect(hit).toContain('nama orang literal: Fajar N.');
    expect(hit).toContain('id perikatan literal: ENG-2025-063');
  });

  it('ANTI-TAUTOLOGI: literal di dalam KOMENTAR tidak dihitung', () => {
    expect(pelanggaranIdentitas('/* dulu: v="PT Sentosa Makmur" · ENG-2025-014 · Dimas R. */')).toEqual([]);
    expect(pelanggaranIdentitas('// dulu: ENG-2025-014 milik PT Sentosa Makmur, disusun Dimas R.')).toEqual([]);
  });

  it('ANTI-TAUTOLOGI: sumber bersih menghasilkan nol temuan', () => {
    expect(pelanggaranIdentitas('const rows = complianceContextRows({ moduleId, engagement, client, audit });')).toEqual([]);
  });
});

/* ---------- perilaku: baris konteks digerakkan perikatan aktif ---------- */
const nilai = (rows: ComplianceCtxRow[], key: string): string => {
  const r = rows.find((x) => x.key === key);
  if (!r) throw new Error(`baris ${key} tak ada`);
  return r.value;
};

describe('konteks perikatan digerakkan perikatan AKTIF', () => {
  const rowsUntuk = (engId: string): ComplianceCtxRow[] => {
    const e = engById(engId);
    return complianceContextRows({
      moduleId: 'sa520', totalProcedures: 4,
      engagement: e, client: clientById(e.clientId), audit: { wpState: {} },
    });
  };

  it('klien & perikatan mencerminkan perikatan yang sedang dibuka', () => {
    const r = rowsUntuk('ENG-2025-014');
    expect(nilai(r, 'client')).toBe('PT Sentosa Makmur Tbk');
    expect(nilai(r, 'engagement')).toBe('ENG-2025-014');
  });

  it('ganti perikatan ⇒ panel ikut berubah (cacat lama: tak pernah berubah)', () => {
    const a = rowsUntuk('ENG-2025-014');
    const b = rowsUntuk('ENG-2025-063');
    expect(nilai(b, 'client')).toBe('PT Graha Properti Investama');
    expect(nilai(b, 'engagement')).toBe('ENG-2025-063');
    expect(nilai(a, 'client')).not.toBe(nilai(b, 'client'));
    expect(nilai(a, 'engagement')).not.toBe(nilai(b, 'engagement'));
  });

  it('SETIAP perikatan di register menghasilkan klien yang benar', () => {
    const salah = A.ENGAGEMENTS.filter((e) => {
      const r = complianceContextRows({
        moduleId: 'sa520', totalProcedures: 1,
        engagement: e, client: clientById(e.clientId), audit: { wpState: {} },
      });
      return nilai(r, 'client') !== clientById(e.clientId).name || nilai(r, 'engagement') !== e.id;
    }).map((e) => e.id);
    expect(salah, `perikatan dengan konteks salah: ${salah.join(', ')}`).toEqual([]);
  });

  it('tanpa perikatan aktif ⇒ em-dash, BUKAN nama pinjaman', () => {
    const r = complianceContextRows({ moduleId: 'sa520', totalProcedures: 0, engagement: null, client: null, audit: null });
    expect(nilai(r, 'client')).toBe(KOSONG);
    expect(nilai(r, 'engagement')).toBe(KOSONG);
    expect(nilai(r, 'preparer')).toBe(KOSONG);
  });

  it('Total Prosedur tetap turunan', () => {
    expect(nilai(rowsUntuk('ENG-2025-014'), 'procedures')).toBe('4 item');
    const r = complianceContextRows({ moduleId: 'sa520', totalProcedures: 11, engagement: null, client: null, audit: null });
    expect(nilai(r, 'procedures')).toBe('11 item');
  });

  it('urutan & label baris panel dipertahankan', () => {
    const r = rowsUntuk('ENG-2025-014');
    expect(r.map((x) => x.key)).toEqual(['client', 'engagement', 'procedures', 'preparer']);
    expect(r.map((x) => x.label)).toEqual(['Klien', 'Engagement', 'Total Prosedur', 'Preparer']);
  });
});

/* ---------- penyusun: rantai sign-off, atau em-dash ---------- */
describe('Preparer berasal dari rantai sign-off kertas kerja', () => {
  it('belum ada sign-off ⇒ em-dash, bukan nama', () => {
    expect(compliancePreparer({ wpState: {} }, 'sa520')).toBe(KOSONG);
    expect(compliancePreparer(null, 'sa520')).toBe(KOSONG);
    expect(compliancePreparer({ wpState: { sa520: { chain: {} } } }, 'sa520')).toBe(KOSONG);
  });

  it('sudah ditandatangani ⇒ nama penandatangan yang SEBENARNYA', () => {
    const audit = { wpState: { sa520: { chain: { preparer: { by: 'Sinta Wulandari', at: '2026-03-02' } } } } };
    expect(compliancePreparer(audit, 'sa520')).toBe('Sinta Wulandari');
  });

  it('memakai ref kanonik WP_MODULE_MAP, bukan id modul mentah', () => {
    /* psak71 → ref 'B' (berbagi kertas kerja dengan register huruf). */
    expect(compliancePreparer({ wpState: { B: { chain: { preparer: { by: 'Rina Kusuma' } } } } }, 'psak71')).toBe('Rina Kusuma');
    expect(compliancePreparer({ wpState: { psak71: { chain: { preparer: { by: 'Rina Kusuma' } } } } }, 'psak71')).toBe(KOSONG);
  });

  it('nama kosong / spasi belaka tetap em-dash', () => {
    expect(compliancePreparer({ wpState: { sa520: { chain: { preparer: { by: '   ' } } } } }, 'sa520')).toBe(KOSONG);
    expect(compliancePreparer({ wpState: { sa520: { chain: { preparer: { at: '2026-03-02' } } } } }, 'sa520')).toBe(KOSONG);
  });

  it('penyusun ikut berpindah bersama perikatan (wpState = state per-perikatan)', () => {
    const eng014 = { wpState: { sa520: { chain: { preparer: { by: 'Dimas Raharjo' } } } } };
    const eng063 = { wpState: { sa520: { chain: { preparer: { by: 'Citra Halim' } } } } };
    expect(compliancePreparer(eng014, 'sa520')).not.toBe(compliancePreparer(eng063, 'sa520'));
  });
});

/* ---------- BUKTI: mengapa sumbernya harus yang itu ---------- */
describe('BUKTI struktur data — mengapa klien & penyusun tak boleh diambil dari perikatan', () => {
  it('baris ENGAGEMENTS TIDAK punya field clientName — pembacanya jatuh diam-diam ke fallback', () => {
    const punya = A.ENGAGEMENTS.filter((e) => 'clientName' in e).map((e) => e.id);
    expect(punya, `perikatan dengan clientName: ${punya.join(', ')}`).toEqual([]);
    /* jalur yang benar: ENGAGEMENTS.clientId → CLIENTS.name */
    expect(A.ENGAGEMENTS.every((e) => !!A.CLIENTS.find((c) => c.id === e.clientId))).toBe(true);
  });

  it('register WORKPAPERS TIDAK berkunci perikatan — ia tak bisa jadi sumber penyusun', () => {
    const berkunci = A.WORKPAPERS.filter((w) => 'engagementId' in w || 'eng' in w).map((w) => w.ref);
    expect(berkunci, `kertas kerja berkunci perikatan: ${berkunci.join(', ')}`).toEqual([]);
    /* karena itu panel TIDAK boleh mundur ke sana ketika sign-off belum ada:
       ia akan menampilkan penyusun ENG-2025-014 di layar perikatan mana pun. */
    expect(compliancePreparer({ wpState: {} }, 'psak71')).toBe(KOSONG);
    expect(A.WORKPAPERS.find((w) => w.ref === 'B')?.preparer).toBe('Dimas R.');
  });
});
