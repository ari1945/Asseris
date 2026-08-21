/* ============================================================
   Independensi Firma & Rotasi — GERBANG.

   Modul `independence` tidak punya SATU PUN uji sebelum berkas ini
   (`member_independence.test.ts` milik modul `teamindep`, bukan modul ini).
   Yang dipaku di sini adalah dua hal yang membuat modulnya berbahaya, bukan
   sekadar dangkal:

     · UI menawarkan aksi yang server PASTI tolak, lalu penolakannya senyap
       (`flush()` hanya menangani CONFLICT; FORBIDDEN jatuh ke cabang "offline"
       yang MEMPERTAHANKAN nilai lokal tanpa pesan) — pengguna mengira
       tindakannya tercatat sampai ia me-reload;
     · rantai tiga lapis yang tidak memisahkan peran sama sekali.

   Sebagian gerbang membaca SUMBER `view_people.tsx`. Itu disengaja: aturan yang
   dilanggar bukan "hasil hitungnya salah" melainkan "kodenya menulis pola yang
   tak boleh ditulis lagi". Komentar dibuang sebelum memindai (pola `kode()`
   dari cockpit_conventions.test.ts) — berkas ini MENGUTIP pola lama sebagai
   catatan sejarah, dan gerbang yang mengenai kutipannya sendiri tak berguna.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  INDEP_CHAIN,
  INDEP_PERIOD,
  indepApprRecord,
  indepCanWrite,
  indepDateLabel,
  indepLevel,
  indepRotationAckRelevant,
  indepStamp,
  indepStepAuthority,
  indepUnattributed,
  nextThreatId,
  type IndepActor,
  type IndepApprRec,
  type IndepStep,
} from './indep_approval';

/* ---------- Pemeran. Peran = string RBAC nyata (rbac.ts ROLES). ---------- */
const DEKLARAN: IndepActor = { userId: 'U-003', name: 'Sari Dewanti', role: 'Rekan Pemimpin', empId: 'EMP-003' };
const HRD: IndepActor = { userId: 'U-901', name: 'Ratna Kusuma', role: 'Admin & HR Firma', empId: 'EMP-901' };
const REKAN_LAIN: IndepActor = { userId: 'U-001', name: 'Hartono Wijaya', role: 'Engagement Partner', empId: 'EMP-001' };
/* Pengguna demo bawaan aplikasi: Audit Manager. TIDAK memegang hr.manage. */
const MANAJER: IndepActor = { userId: 'U-007', name: 'Anindya Pramesti', role: 'Audit Manager', empId: 'EMP-007' };
const TAK_TERPETAKAN: IndepActor = { userId: 'U-999', name: 'Akun Luar Roster', role: 'Rekan Pemimpin', empId: null };

const ROW = 'EMP-003';
const HARI = '2026-03-09';   // AMS.TODAY

const kosong = (): IndepApprRec => indepApprRecord(undefined);

/** Bubuhkan satu lapis lewat gerbangnya sendiri — meniru persis apa yang view
 *  lakukan, sehingga rantai yang dibangun uji tak pernah lebih longgar dari UI. */
function bubuh(rec: IndepApprRec, actor: IndepActor, declared: boolean, rowId: string = ROW): IndepApprRec {
  const stepIndex = indepLevel(rec, declared);
  const verdict = indepStepAuthority({ stepIndex, rec, declared, rowId, actor });
  if (!verdict.ok) throw new Error('bubuh ditolak: ' + verdict.reason);
  const stamp = indepStamp(actor, HARI);
  if (!stamp) throw new Error('bubuh tanpa identitas');
  const steps = rec.steps.slice();
  steps[stepIndex] = stamp;
  return { level: stepIndex + 1, steps, period: INDEP_PERIOD };
}

/* ============================================================
   a · SATU ORANG, SATU LAPIS
   ============================================================ */
describe('a — orang yang sudah mengisi satu lapis tidak dapat mengisi lapis berikutnya', () => {
  it('rekan pemimpin yang mereviu (lapis 2) ditolak di lapis 3 pada deklarasi yang sama', () => {
    /* REKAN_LAIN memegang hr.manage DAN firm.admin sekaligus — tanpa aturan
       "satu orang satu lapis" ia lolos di kedua lapis. */
    expect(indepCanWrite(REKAN_LAIN)).toBe(true);
    let rec = bubuh(kosong(), DEKLARAN, false);          // lapis 1 — deklaran sendiri
    rec = bubuh(rec, REKAN_LAIN, false);                  // lapis 2 — reviu
    const v = indepStepAuthority({ stepIndex: 2, rec, declared: false, rowId: ROW, actor: REKAN_LAIN });
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('satu orang tidak dapat mengisi dua lapis');
  });

  it('deklaran tidak dapat mereviu maupun menyetujui deklarasinya sendiri', () => {
    const rec = bubuh(kosong(), DEKLARAN, false);
    const reviu = indepStepAuthority({ stepIndex: 1, rec, declared: false, rowId: ROW, actor: DEKLARAN });
    expect(reviu.ok).toBe(false);
    expect(reviu.reason).toContain('pemisahan tugas');
  });

  it('rantai TUNTAS hanya bila tiga orang berbeda mengisinya', () => {
    let rec = bubuh(kosong(), DEKLARAN, false);
    rec = bubuh(rec, HRD, false);
    rec = bubuh(rec, REKAN_LAIN, false);
    expect(indepLevel(rec, false)).toBe(3);
    expect(indepUnattributed(rec, false)).toBe(false);
    const penandatangan = rec.steps.map((s) => (s ? s.byEmpId : ''));
    expect(new Set(penandatangan).size).toBe(3);
  });

  it('pencocokan pelaku memakai id pegawai, bukan ejaan nama', () => {
    let rec = bubuh(kosong(), DEKLARAN, false);
    rec = bubuh(rec, HRD, false);
    const kembar: IndepActor = { userId: 'U-XXX', name: 'Ratna Kusuma Wardhani', role: 'Admin & HR Firma', empId: 'EMP-901' };
    const v = indepStepAuthority({ stepIndex: 2, rec, declared: false, rowId: ROW, actor: kembar });
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('satu orang tidak dapat mengisi dua lapis');
  });
});

/* ============================================================
   b · LAPIS HANYA DAPAT DIISI PERAN YANG BERHAK
   ============================================================ */
describe('b — otoritas per-lapis terikat kapabilitas RBAC, bukan tombol yang terlihat', () => {
  it('Audit Manager (pengguna demo bawaan) ditolak di ketiga lapis', () => {
    expect(indepCanWrite(MANAJER)).toBe(false);
    const rec = kosong();
    const lapis1 = indepStepAuthority({ stepIndex: 0, rec, declared: false, rowId: 'EMP-007', actor: MANAJER });
    expect(lapis1.ok).toBe(false);
    expect(lapis1.reason).toContain('hr.manage');
    let jalan = bubuh(kosong(), DEKLARAN, false);
    const lapis2 = indepStepAuthority({ stepIndex: 1, rec: jalan, declared: false, rowId: ROW, actor: MANAJER });
    expect(lapis2.ok).toBe(false);
    expect(lapis2.reason).toContain('hr.manage');
    jalan = bubuh(jalan, HRD, false);
    const lapis3 = indepStepAuthority({ stepIndex: 2, rec: jalan, declared: false, rowId: ROW, actor: MANAJER });
    expect(lapis3.ok).toBe(false);
    expect(lapis3.reason).toContain('firm.admin');
  });

  it('Admin & HR Firma boleh mereviu (lapis 2) tetapi TIDAK menyetujui (lapis 3)', () => {
    let rec = bubuh(kosong(), DEKLARAN, false);
    expect(indepStepAuthority({ stepIndex: 1, rec, declared: false, rowId: ROW, actor: HRD }).ok).toBe(true);
    rec = bubuh(rec, HRD, false);
    /* Orang HRD KEDUA: kalau yang diuji HRD yang sama, aturan "satu orang satu
       lapis" menyala lebih dulu dan gerbang kapabilitasnya tak pernah teruji. */
    const HRD2: IndepActor = { userId: 'U-902', name: 'Dewi Anggraini', role: 'Admin & HR Firma', empId: 'EMP-902' };
    const v = indepStepAuthority({ stepIndex: 2, rec, declared: false, rowId: ROW, actor: HRD2 });
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('firm.admin');
  });

  it('lapis 1 terikat IDENTITAS: rekan pemimpin sekalipun tak dapat menandatangani deklarasi orang lain', () => {
    const v = indepStepAuthority({ stepIndex: 0, rec: kosong(), declared: false, rowId: ROW, actor: REKAN_LAIN });
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('hanya yang bersangkutan');
  });

  it('rantai tak dapat diisi lompat maupun mundur', () => {
    const rec = kosong();
    expect(indepStepAuthority({ stepIndex: 2, rec, declared: false, rowId: ROW, actor: REKAN_LAIN }).reason).toContain('belum giliran');
    const jalan = bubuh(rec, DEKLARAN, false);
    expect(indepStepAuthority({ stepIndex: 0, rec: jalan, declared: false, rowId: ROW, actor: DEKLARAN }).reason).toContain('mundur');
  });

  it('setiap lapis memetakan ke kapabilitas yang ADA di peta RBAC', () => {
    INDEP_CHAIN.forEach((s) => {
      expect(typeof s.cap, `lapis ${s.role} tanpa kapabilitas`).toBe('string');
      expect(s.cap.length).toBeGreaterThan(0);
    });
    /* Lapis 3 harus lebih sempit daripada lapis 2, kalau tidak "partner" cuma label. */
    expect(indepCanWrite(HRD)).toBe(true);
    expect(
      indepStepAuthority({ stepIndex: 2, rec: bubuh(bubuh(kosong(), DEKLARAN, false), REKAN_LAIN, false), declared: false, rowId: ROW, actor: HRD }).ok,
    ).toBe(false);
  });
});

/* ============================================================
   c · AKSI TULIS TIDAK DITAWARKAN TANPA KAPABILITAS
   ============================================================ */
describe('c — pengguna tanpa kapabilitas tulis tidak ditawari aksi tulis', () => {
  it('indepCanWrite mencerminkan gerbang server (HR_MANAGE) persis', () => {
    expect(indepCanWrite({ role: 'Rekan Pemimpin' })).toBe(true);
    expect(indepCanWrite({ role: 'Engagement Partner' })).toBe(true);
    expect(indepCanWrite({ role: 'Rekan' })).toBe(true);
    expect(indepCanWrite({ role: 'Admin & HR Firma' })).toBe(true);
    expect(indepCanWrite({ role: 'Audit Manager' })).toBe(false);
    expect(indepCanWrite({ role: 'Senior Auditor' })).toBe(false);
    expect(indepCanWrite({ role: 'Junior Auditor' })).toBe(false);
    expect(indepCanWrite({ role: 'Finance Firma' })).toBe(false);
    expect(indepCanWrite({})).toBe(false);
  });
});

/* ============================================================
   d · TAK ADA JEJAK TANPA IDENTITAS NYATA
   ============================================================ */
describe('d — tidak ada aksi tulis yang tercatat tanpa identitas pelaku yang nyata', () => {
  it('sesi yang tak terpetakan ke roster ditolak, meski perannya berwenang', () => {
    expect(indepCanWrite(TAK_TERPETAKAN)).toBe(true);   // kapabilitasnya ada…
    const v = indepStepAuthority({ stepIndex: 0, rec: kosong(), declared: false, rowId: ROW, actor: TAK_TERPETAKAN });
    expect(v.ok).toBe(false);                            // …identitasnya tidak
    expect(v.reason).toContain('tidak dapat diatribusikan');
  });

  it('indepStamp menolak membubuhkan cap tanpa identitas — tidak ada "Auditor"', () => {
    expect(indepStamp(TAK_TERPETAKAN, HARI)).toBeNull();
    expect(indepStamp({ role: 'Rekan Pemimpin', empId: 'EMP-003' }, HARI)).toBeNull();
    const cap = indepStamp(DEKLARAN, HARI);
    expect(cap).not.toBeNull();
    expect((cap as IndepStep).by).toBe('Sari Dewanti');
    expect((cap as IndepStep).byEmpId).toBe('EMP-003');
    expect((cap as IndepStep).at).toBe(HARI);
  });

  it('`declared` saja = LAPIS 1, bukan "Disetujui", dan ditandai tak teratribusi', () => {
    /* Bentuk lama: `if (a == null) return d.declared ? 3 : 0` — seluruh baris seed
       (declared:true) tampil "Disetujui" dengan tiga langkah "✓ Selesai" tanpa
       seorang pun mereviu atau menyetujuinya. */
    const rec = kosong();
    expect(indepLevel(rec, true)).toBe(1);
    expect(indepUnattributed(rec, true)).toBe(true);
    expect(indepLevel(rec, false)).toBe(0);
  });

  it('level bentuk lama (number) tidak dihapus, tetapi tidak diklaim terverifikasi', () => {
    const lama = indepApprRecord(2);
    expect(lama.level).toBe(2);
    expect(indepLevel(lama, true)).toBe(2);
    expect(indepUnattributed(lama, true)).toBe(true);
    /* dan ia tak dapat memalsukan pemisahan: pelaku lapis sebelumnya tak diketahui */
    expect(indepStepAuthority({ stepIndex: 2, rec: lama, declared: true, rowId: ROW, actor: REKAN_LAIN }).ok).toBe(true);
  });
});

/* ============================================================
   e · ID ANCAMAN UNIK
   ============================================================ */
describe('e — id ancaman unik setelah penghapusan-lalu-penambahan', () => {
  it('id tidak didaur ulang ketika satu ancaman dihapus', () => {
    let list = [{ id: 'TH-EMP-003' }];
    list = [...list, { id: nextThreatId(list, 'EMP-003') }];     // TH-EMP-003-1
    list = [...list, { id: nextThreatId(list, 'EMP-003') }];     // TH-EMP-003-2
    list = [...list, { id: nextThreatId(list, 'EMP-003') }];     // TH-EMP-003-3
    expect(list.map((t) => t.id)).toEqual(['TH-EMP-003', 'TH-EMP-003-1', 'TH-EMP-003-2', 'TH-EMP-003-3']);
    const sesudahHapus = list.filter((t) => t.id !== 'TH-EMP-003-2');
    const baru = nextThreatId(sesudahHapus, 'EMP-003');
    expect(sesudahHapus.map((t) => t.id)).not.toContain(baru);
    expect(baru).toBe('TH-EMP-003-4');
  });

  it('penomoran per-ORANG, tak terpengaruh panjang daftar orang lain', () => {
    /* Cacat lama: `'TH-' + personId + '-' + (list.length + 1)` memakai panjang
       SELURUH daftar — ancaman pertama seseorang bisa bernomor 7. */
    const list = [{ id: 'TH-EMP-001-1' }, { id: 'TH-EMP-001-2' }, { id: 'TH-EMP-004-1' }];
    expect(nextThreatId(list, 'EMP-003')).toBe('TH-EMP-003-1');
    expect(nextThreatId(list, 'EMP-001')).toBe('TH-EMP-001-3');
  });

  it('id yang dihasilkan selalu unik terhadap daftar apa pun', () => {
    const list = [{ id: 'TH-EMP-002-1' }, { id: 'TH-EMP-002-5' }];
    const baru = nextThreatId(list, 'EMP-002');
    expect(list.map((t) => t.id)).not.toContain(baru);
    expect(baru).toBe('TH-EMP-002-6');
  });
});

/* ============================================================
   f · GERBANG SUMBER — klok SSOT & identitas firma
   ============================================================ */
const SRC = join(__dirname, 'view_people.tsx');
const src = (): string => readFileSync(SRC, 'utf8');
/* Modul `independence` = `function Independence()` sampai akhir berkas
   (HCM/StaffForm/CPETracker/SkpForm berada SEBELUMNYA dan bukan lingkup PR ini). */
const wilayah = (): string => {
  const s = src();
  const i = s.indexOf('function Independence()');
  if (i < 0) throw new Error('fungsi Independence() tak ditemukan di view_people.tsx');
  return s.slice(i);
};
/* kode saja — komentar mengutip pola lama sebagai catatan sejarah */
const kode = (): string => wilayah().replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('f — gerbang sumber modul independence', () => {
  it('nol `new Date()` — jejak memakai klok SSOT (AMS.TODAY)', () => {
    const pelanggar = [...kode().matchAll(/new Date\s*\(/g)].map((m) => m.index);
    expect(pelanggar, `klok sistem nyata dipakai ${pelanggar.length}×; pakai AMS.TODAY`).toEqual([]);
    expect(kode()).toContain('AMS.TODAY');
  });

  it('nol literal nama firma — PDF deklarasi tersegel menurunkan identitasnya', () => {
    expect(kode()).not.toContain('KAP Wijaya Hartono');
    expect(kode(), 'firm: harus diturunkan dari AMS.FIRM').toMatch(/firm:\s*firmName|firmName\s*=\s*\(?\(?AMS/);
  });

  it('nol identitas fallback — tak ada nama pengganti yang dikarang', () => {
    expect(kode()).not.toMatch(/\|\|\s*'Auditor'/);
  });

  it('otoritas TIDAK diputuskan di dalam view — didelegasikan ke indep_approval', () => {
    const k = kode();
    expect(k, 'view harus memanggil indepStepAuthority').toContain('indepStepAuthority');
    expect(k, 'view harus memanggil indepCanWrite').toContain('indepCanWrite');
    /* Pola lama yang tak boleh kembali: pembubuhan tanpa syarat. */
    expect(k).not.toMatch(/steps\[n\s*-\s*1\]\s*=/);
    /* Id ancaman lama dari panjang array. */
    expect(k).not.toMatch(/list\.length\s*\+\s*1/);
  });

  it('tombol "Minta Deklarasi" hidup — tidak ada tombol mati tersisa', () => {
    const baris = kode().split('\n').filter((l) => l.includes('Minta Deklarasi'));
    expect(baris.length, 'tombol "Minta Deklarasi" hilang dari sumber').toBeGreaterThan(0);
    baris.forEach((l) => {
      expect(l, `tombol mati (tanpa onClick): ${l.trim().slice(0, 120)}`).toContain('onClick');
    });
  });

  it('setiap <Btn>/<button> di modul ini punya onClick atau type submit', () => {
    const mati = kode().split('\n')
      .filter((l) => /<(Btn|button)\b/.test(l))
      .filter((l) => !/onClick=/.test(l));
    expect(mati.map((l) => l.trim().slice(0, 90)), 'kontrol tanpa handler').toEqual([]);
  });
});

/* ============================================================
   Pelengkap — derivasi rotasi & label tanggal
   ============================================================ */
describe('rotasi & tanggal', () => {
  it('kelayakan pengakuan rotasi diturunkan dari rotTier, bukan ambang yang diketik', () => {
    expect(indepRotationAckRelevant({ rotationClient: '—', tenure: 9, rotationLimit: 5 })).toBe(false);
    expect(indepRotationAckRelevant({ rotationClient: 'PT A Tbk', tenure: 5, rotationLimit: 5 })).toBe(true);   // due
    expect(indepRotationAckRelevant({ rotationClient: 'PT A Tbk', tenure: 4.6, rotationLimit: 5 })).toBe(true); // alert
    expect(indepRotationAckRelevant({ rotationClient: 'PT A Tbk', tenure: 4, rotationLimit: 5 })).toBe(true);   // warn
    expect(indepRotationAckRelevant({ rotationClient: 'PT A Tbk', tenure: 3.9, rotationLimit: 5 })).toBe(false);
  });

  it('label tanggal memformat ISO dan MELEWATKAN rekaman lama apa adanya', () => {
    expect(indepDateLabel('2026-03-09')).toBe('09 Mar 2026');
    expect(indepDateLabel('21 Agt 2026')).toBe('21 Agt 2026');
    expect(indepDateLabel(undefined)).toBe('');
  });
});
