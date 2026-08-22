/* ============================================================
   PEMISAHAN TUGAS RANTAI INDEPENDENSI — PENEGAKAN SERVER.

   Sebelum berkas ini, satu-satunya gerbang server atas `indepAppr` adalah
   `capForWrite` = HR_MANAGE: gerbang per-DOKUMEN. Ia tak pernah menanyakan lapis
   MANA, atas deklarasi SIAPA, oleh ORANG YANG MANA. Sebuah panggilan tRPC
   langsung dengan sesi Admin HR yang sah karenanya dapat menulis

       { 'EMP-001': { level: 3, steps: [sig, sig, sig] } }

   dengan ketiga tanda tangan atas namanya sendiri — atau atas nama orang lain —
   dan tak ada apa pun yang menolaknya. Gerbang UI (PR ini, `view_people.tsx`)
   tidak berdaya atas jalur itu: ia tidak dilewati sama sekali.

   Uji di sini MURNI (tanpa DB) dan memanggil `guardSignoffWrite` persis seperti
   `router.state.set` memanggilnya. Aturannya sendiri diimpor dari modul murni
   yang SAMA dengan yang dipakai UI (`migration/src/indep_approval`) — satu
   definisi, dua sisi.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { guardSignoffWrite, signoffContextNeeds, isSignoffKey, type SignoffContext } from '../signoff';
import { CAP } from '../rbac';

const HARTONO = { id: 'u-hw', name: 'Hartono Wijaya', role: 'Rekan Pemimpin' };      // hr.manage + firm.admin
const YUNI = { id: 'u-ym', name: 'Yuni Marlina', role: 'Admin & HR Firma' };         // hr.manage, TANPA firm.admin
const DEWI = { id: 'u-da', name: 'Dewi Anggraini', role: 'Admin & HR Firma' };       // HRD kedua
const ANINDYA = { id: 'u-ap', name: 'Anindya Pramesti', role: 'Audit Manager' };     // TANPA hr.manage

const EMP = { HARTONO: 'EMP-001', YUNI: 'EMP-901', DEWI: 'EMP-902', ANINDYA: 'EMP-007' };
const AT = '2026-03-09';   // AMS.TODAY

type Actor = typeof HARTONO;
/** Konteks yang dipasok router (`loadSignoffContext`) — empId aktor dari SESI, bukan dari payload. */
const ctxOf = (empId: string | null): SignoffContext => ({ siblings: {}, liveAttachmentIds: {}, actorEmpId: empId });
/** Tanda tangan SAH oleh `a`. */
const sig = (a: Actor, empId: string) => ({ by: a.name, byUserId: a.id, byEmpId: empId, at: AT });
const rec = (steps: Array<unknown>) => ({ level: steps.length, steps, period: 'TA 2026' });

describe('perkabelan', () => {
  it('keempat dokumen independensi melewati guardSignoffWrite', () => {
    ['indepAppr', 'independence', 'indepThreats', 'indepRotAck'].forEach((k) => {
      expect(isSignoffKey(k), `${k} tak dijaga`).toBe(true);
    });
  });

  it('indepAppr meminta empId aktor HANYA bila diff menyentuh tanda tangan', () => {
    const doc = { [EMP.HARTONO]: rec([sig(HARTONO, EMP.HARTONO)]) };
    expect(signoffContextNeeds('indepAppr', doc, doc)).toBeNull();
    expect(signoffContextNeeds('indepAppr', {}, doc)?.actorEmpId).toBe(true);
  });

  it('FAIL-CLOSED bila router lupa memasok konteks', () => {
    const next = { [EMP.HARTONO]: rec([sig(HARTONO, EMP.HARTONO)]) };
    expect(() => guardSignoffWrite(HARTONO, 'indepAppr', {}, next)).toThrow(/signoff:context-missing/);
  });
});

describe('indepAppr — celah yang ditutup: tiga lapis sekali tulis', () => {
  it('MENOLAK rantai lengkap yang ditulis satu orang dalam satu panggilan', () => {
    const next = {
      [EMP.HARTONO]: rec([sig(YUNI, EMP.YUNI), sig(YUNI, EMP.YUNI), sig(YUNI, EMP.YUNI)]),
    };
    expect(() => guardSignoffWrite(YUNI, 'indepAppr', {}, next, Date.now(), ctxOf(EMP.YUNI)))
      .toThrow(/indep-appr:self:EMP-001/);
  });

  it('MENOLAK lapis 1 yang ditandatangani orang lain (deklarasi = pernyataan pribadi)', () => {
    const next = { [EMP.HARTONO]: rec([sig(YUNI, EMP.YUNI)]) };
    expect(() => guardSignoffWrite(YUNI, 'indepAppr', {}, next, Date.now(), ctxOf(EMP.YUNI)))
      .toThrow(/hanya yang bersangkutan/);
  });

  it('MENOLAK deklaran yang mereviu deklarasinya sendiri (lapis 2)', () => {
    const prev = { [EMP.HARTONO]: rec([sig(HARTONO, EMP.HARTONO)]) };
    const next = { [EMP.HARTONO]: rec([sig(HARTONO, EMP.HARTONO), sig(HARTONO, EMP.HARTONO)]) };
    expect(() => guardSignoffWrite(HARTONO, 'indepAppr', prev, next, Date.now(), ctxOf(EMP.HARTONO)))
      .toThrow(/pemisahan tugas/);
  });

  it('MENOLAK orang yang sudah mengisi lapis 2 dari mengisi lapis 3', () => {
    /* Baris milik ANINDYA — supaya yang menyala adalah aturan "satu orang satu
       lapis" dan bukan "tak boleh mereviu diri sendiri". Hartono memegang
       hr.manage DAN firm.admin, jadi tanpa aturan ini ia lolos di kedua lapis. */
    const prev = { [EMP.ANINDYA]: rec([sig(ANINDYA, EMP.ANINDYA), sig(HARTONO, EMP.HARTONO)]) };
    const next = {
      [EMP.ANINDYA]: rec([sig(ANINDYA, EMP.ANINDYA), sig(HARTONO, EMP.HARTONO), sig(HARTONO, EMP.HARTONO)]),
    };
    expect(() => guardSignoffWrite(HARTONO, 'indepAppr', prev, next, Date.now(), ctxOf(EMP.HARTONO)))
      .toThrow(/satu orang tidak dapat mengisi dua lapis/);
  });

  it('MENOLAK lapis 3 dari peran tanpa firm.admin (Admin & HR)', () => {
    const prev = { [EMP.HARTONO]: rec([sig(ANINDYA, EMP.ANINDYA), sig(YUNI, EMP.YUNI)]) };
    const next = {
      [EMP.HARTONO]: rec([sig(ANINDYA, EMP.ANINDYA), sig(YUNI, EMP.YUNI), sig(DEWI, EMP.DEWI)]),
    };
    expect(() => guardSignoffWrite(DEWI, 'indepAppr', prev, next, Date.now(), ctxOf(EMP.DEWI)))
      .toThrow(/firm\.admin/);
  });

  it('MENOLAK lompat lapis (langsung ke lapis 3 dari rantai kosong)', () => {
    const next = { [EMP.HARTONO]: { level: 3, steps: [undefined, undefined, sig(HARTONO, EMP.HARTONO)], period: 'TA 2026' } };
    expect(() => guardSignoffWrite(HARTONO, 'indepAppr', {}, next, Date.now(), ctxOf(EMP.HARTONO)))
      .toThrow(/belum giliran/);
  });

  it('MENERIMA lapis 2 dari pemegang hr.manage yang bukan deklaran', () => {
    const prev = { [EMP.HARTONO]: rec([sig(HARTONO, EMP.HARTONO)]) };
    const next = { [EMP.HARTONO]: rec([sig(HARTONO, EMP.HARTONO), sig(YUNI, EMP.YUNI)]) };
    expect(guardSignoffWrite(YUNI, 'indepAppr', prev, next, Date.now(), ctxOf(EMP.YUNI)))
      .toEqual([{ what: 'indep-appr:ethics:EMP-001', cap: CAP.HR_MANAGE }]);
  });

  it('MENERIMA rantai tuntas oleh tiga orang berbeda', () => {
    /* Deklarasi milik DEWI: ia menandatangani lapis 1 sendiri, Yuni mereviu,
       Hartono menyetujui. Tiga tanda tangan, tiga orang, tiga panggilan terpisah. */
    const s1 = { [EMP.DEWI]: rec([sig(DEWI, EMP.DEWI)]) };
    const s2 = { [EMP.DEWI]: rec([sig(DEWI, EMP.DEWI), sig(YUNI, EMP.YUNI)]) };
    const s3 = { [EMP.DEWI]: rec([sig(DEWI, EMP.DEWI), sig(YUNI, EMP.YUNI), sig(HARTONO, EMP.HARTONO)]) };
    expect(guardSignoffWrite(DEWI, 'indepAppr', {}, s1, Date.now(), ctxOf(EMP.DEWI)))
      .toEqual([{ what: 'indep-appr:self:EMP-902', cap: CAP.HR_MANAGE }]);
    expect(guardSignoffWrite(YUNI, 'indepAppr', s1, s2, Date.now(), ctxOf(EMP.YUNI)))
      .toEqual([{ what: 'indep-appr:ethics:EMP-902', cap: CAP.HR_MANAGE }]);
    expect(guardSignoffWrite(HARTONO, 'indepAppr', s2, s3, Date.now(), ctxOf(EMP.HARTONO)))
      .toEqual([{ what: 'indep-appr:partner:EMP-902', cap: CAP.FIRM_ADMIN }]);
  });

  it('pegawai TANPA hr.manage tak dapat menandatangani lapis 1 lewat dokumen ini', () => {
    /* Bukan celah, melainkan pembagian jalur: menulis `indepAppr` adalah kewenangan
       SDM & Kepatuhan. Deklarasi mandiri seorang auditor lapangan berjalan lewat
       `personal.declare` (`personalSelfService.declareSelf`), yang menyentuh baris
       miliknya sendiri dan TIDAK melewati `state.set`. */
    const next = { [EMP.ANINDYA]: rec([sig(ANINDYA, EMP.ANINDYA)]) };
    expect(() => guardSignoffWrite(ANINDYA, 'indepAppr', {}, next, Date.now(), ctxOf(EMP.ANINDYA)))
      .toThrow(/hr\.manage/);
  });
});

describe('indepAppr — integritas tanda tangan', () => {
  it('MENOLAK tanda tangan yang menyebut orang lain', () => {
    const next = { [EMP.YUNI]: rec([sig(HARTONO, EMP.HARTONO)]) };   // Yuni menulis, mengaku Hartono
    expect(() => guardSignoffWrite(YUNI, 'indepAppr', {}, next, Date.now(), ctxOf(EMP.YUNI)))
      .toThrow(/signature-identity-mismatch/);
  });

  it('MENOLAK tanda tangan tanpa byUserId (bentuk yang hanya mengetik nama)', () => {
    const next = { [EMP.YUNI]: { level: 1, steps: [{ by: 'Yuni Marlina', at: AT }], period: 'TA 2026' } };
    expect(() => guardSignoffWrite(YUNI, 'indepAppr', {}, next, Date.now(), ctxOf(EMP.YUNI)))
      .toThrow(/signature-identity-mismatch/);
  });

  it('MENOLAK penulisan-ulang tanda tangan yang sudah ada', () => {
    const prev = { [EMP.HARTONO]: rec([sig(HARTONO, EMP.HARTONO)]) };
    const next = { [EMP.HARTONO]: rec([sig(YUNI, EMP.YUNI)]) };
    expect(() => guardSignoffWrite(YUNI, 'indepAppr', prev, next, Date.now(), ctxOf(EMP.YUNI)))
      .toThrow(/signature-overwrite/);
  });

  it('MENOLAK sesi yang tak terpetakan ke personel firma', () => {
    const next = { [EMP.HARTONO]: rec([sig(HARTONO, EMP.HARTONO)]) };
    expect(() => guardSignoffWrite(HARTONO, 'indepAppr', {}, next, Date.now(), ctxOf(null)))
      .toThrow(/no-emp-mapping/);
  });

  it('PEMBATALAN rantai menuntut firm.admin', () => {
    const prev = { [EMP.HARTONO]: rec([sig(DEWI, EMP.DEWI), sig(YUNI, EMP.YUNI)]) };
    const next = { [EMP.HARTONO]: { level: 0, steps: [], period: 'TA 2026' } };
    expect(() => guardSignoffWrite(YUNI, 'indepAppr', prev, next, Date.now(), ctxOf(EMP.YUNI)))
      .toThrow(/requires:firm\.admin/);
    expect(guardSignoffWrite(HARTONO, 'indepAppr', prev, next, Date.now(), ctxOf(EMP.HARTONO)))
      .toEqual([
        { what: 'indep-appr:reset:self:EMP-001', cap: CAP.FIRM_ADMIN },
        { what: 'indep-appr:reset:ethics:EMP-001', cap: CAP.FIRM_ADMIN },
      ]);
  });
});

describe('independence — deklarasi tahunan adalah pernyataan PRIBADI', () => {
  const row = (id: string, declared: boolean) => ({ id, name: id, declared, conflicts: 0, tenure: 0, rotationLimit: 5 });

  it('MENOLAK Admin HR yang mencentang deklarasi orang lain', () => {
    const prev = [row(EMP.HARTONO, false)];
    const next = [row(EMP.HARTONO, true)];
    expect(() => guardSignoffWrite(YUNI, 'independence', prev, next, Date.now(), ctxOf(EMP.YUNI)))
      .toThrow(/indep-decl:not-own:EMP-001/);
  });

  it('MENERIMA deklarasi atas baris SENDIRI', () => {
    const prev = [row(EMP.YUNI, false)];
    const next = [row(EMP.YUNI, true)];
    expect(guardSignoffWrite(YUNI, 'independence', prev, next, Date.now(), ctxOf(EMP.YUNI)))
      .toEqual([{ what: 'indep-decl:EMP-901', cap: '' }]);
  });

  it('MENCABUT deklarasi menuntut firm.admin', () => {
    const prev = [row(EMP.HARTONO, true)];
    const next = [row(EMP.HARTONO, false)];
    expect(() => guardSignoffWrite(YUNI, 'independence', prev, next, Date.now(), ctxOf(EMP.YUNI)))
      .toThrow(/requires:firm\.admin/);
    expect(() => guardSignoffWrite(HARTONO, 'independence', prev, next, Date.now(), ctxOf(EMP.HARTONO)))
      .not.toThrow();
  });

  it('permintaan deklarasi (`requested`) BUKAN aksi otoritatif — tak menuntut apa pun', () => {
    const prev = [row(EMP.HARTONO, false)];
    const next = [{ ...row(EMP.HARTONO, false), requested: true, requestedAt: AT }];
    expect(signoffContextNeeds('independence', prev, next)).toBeNull();
    expect(guardSignoffWrite(YUNI, 'independence', prev, next, Date.now())).toEqual([]);
  });
});

describe('indepThreats / indepRotAck — jejak harus menyebut pembubuhnya', () => {
  const threat = (extra: Record<string, unknown>) => [{
    id: 'TH-EMP-001-1', personId: EMP.HARTONO, type: 'Kedekatan', desc: 'x',
    severity: 'Sedang', safeguard: 'y', status: 'Terbuka', by: '', at: '', ...extra,
  }];

  it('MENOLAK mitigasi yang mengaku dibubuhkan orang lain', () => {
    const next = threat({ status: 'Dimitigasi', by: HARTONO.name, byUserId: HARTONO.id, at: AT });
    expect(() => guardSignoffWrite(YUNI, 'indepThreats', threat({}), next, Date.now()))
      .toThrow(/signature-identity-mismatch:indepThreats/);
  });

  it('MENERIMA mitigasi yang menyebut sesinya', () => {
    const next = threat({ status: 'Dimitigasi', by: YUNI.name, byUserId: YUNI.id, at: AT });
    expect(guardSignoffWrite(YUNI, 'indepThreats', threat({}), next, Date.now()))
      .toEqual([{ what: 'indepThreats:TH-EMP-001-1', cap: '' }]);
  });

  it('entri seed yang belum beratribusi (`by: ""`) tidak dituntut apa pun', () => {
    const seed = threat({ status: 'Dimitigasi' });
    expect(guardSignoffWrite(YUNI, 'indepThreats', seed, seed, Date.now())).toEqual([]);
  });

  it('pengakuan rotasi MENOLAK atribusi palsu', () => {
    const next = { [EMP.HARTONO]: { acknowledged: true, action: 'tunjuk pengganti', by: HARTONO.name, byUserId: HARTONO.id, at: AT } };
    expect(() => guardSignoffWrite(YUNI, 'indepRotAck', {}, next, Date.now()))
      .toThrow(/signature-identity-mismatch:indepRotAck/);
    const mine = { [EMP.HARTONO]: { acknowledged: true, action: 'tunjuk pengganti', by: YUNI.name, byUserId: YUNI.id, at: AT } };
    expect(guardSignoffWrite(YUNI, 'indepRotAck', {}, mine, Date.now()))
      .toEqual([{ what: 'indepRotAck:EMP-001', cap: '' }]);
  });
});
