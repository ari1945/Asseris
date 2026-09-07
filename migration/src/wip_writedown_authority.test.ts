/* ============================================================
   WIP — OTORISASI write-down manual (W2 · W3 · W4), plus karantina W1.

   Uji ini melengkapi `firm_wip.test.ts` (yang memaku ARITMETIKA write-down)
   dengan pertanyaan yang berbeda: siapa yang melakukannya, siapa yang boleh
   menyetujuinya, dan kapan tenggatnya jatuh.

   Rujukan cacat: docs/prompts-perbaikan/11-wip.md (W1–W4) dan usulan W1 di
   docs/usulan-W1-wip-writedown-otorisasi.md.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { FIRMFIN, WIP_WRITEOFF_APPROVAL_MIN } from './data_firmfin';
import { AJE_SLA_HOURS, ajeRejectOverlay, parseStamp, stepAuthority } from './aje_approval';
import { applyWipAdj, wipAdjAmounts, type WipAdjDoc } from './wip_adj';
import './data_platform';   // side-effect: memasang AMS.PLATFORM.buildApprovals

/* ---------- tipe minimum yang dibutuhkan uji (berkas uji WAJIB bebas `any`) ---------- */
interface WipRowLite { id: string; unbilled: number }
interface WipModelLite { registerAll: WipRowLite[]; netRecoverable: number; unbilledTotal: number; totManualWriteDown: number }
interface ChainStepLite { role: string; name?: string; status?: string }
interface ApprovalLite {
  id: string; kind: string; from?: string; role?: string; amount: number;
  submitted?: string | null; due?: string | null; step: number; chain: ChainStepLite[];
  attributionUnknown?: boolean;
}
interface PlatformLite { buildApprovals: (ctx: { engagements: unknown; clients: unknown; wipAdj?: WipAdjDoc }) => ApprovalLite[] }

const platform = (): PlatformLite => (AMS as unknown as { PLATFORM: PlatformLite }).PLATFORM;
const ctx = () => ({ engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS });
const model = (doc?: WipAdjDoc): WipModelLite =>
  FIRMFIN.wip(ctx(), undefined, undefined, wipAdjAmounts(doc)) as unknown as WipModelLite;

const approvals = (wipAdj?: WipAdjDoc): ApprovalLite[] =>
  platform().buildApprovals({ engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS, wipAdj });

/** Perikatan pertama dengan saldo WIP positif — target penyesuaian. */
const targetId = (): string => {
  const r = model().registerAll.find(x => x.unbilled > 0);
  if (!r) throw new Error('fixture: tak ada perikatan ber-WIP positif');
  return r.id;
};

/** Manajer perikatan target — nama yang DULU salah dipakai sebagai `from`. */
const targetManager = (id: string): string => {
  const e = (AMS.ENGAGEMENTS as { id: string; manager: string }[]).find(x => x.id === id);
  if (!e) throw new Error('fixture: perikatan target tak ditemukan');
  return e.manager;
};

/* Pelaku write-down: seorang 'Finance Firma' — peran yang memang memegang
   FIRMFIN_EDIT (rbac.ts) sehingga benar-benar dapat menulis `wip.adj`, dan
   yang JELAS bukan manajer perikatan mana pun. */
const ACTOR = { name: 'Lestari Anjani', role: 'Finance Firma' };
const AMOUNT = 3 * WIP_WRITEOFF_APPROVAL_MIN;
const nowIso = (): string => new Date().toISOString();

const itemFor = (id: string, doc: WipAdjDoc): ApprovalLite => {
  const it = approvals(doc).find(x => x.id === 'APR-WIPADJ-' + id);
  if (!it) throw new Error('write-down ≥ ambang tak memunculkan item antrean');
  return it;
};

/* ============================================================
   W2 — pelaku tercatat, dan `from` memakai pelaku itu
   ============================================================ */
describe('W2 — write-down manual teratribusi ke pelakunya', () => {
  it('`from` pada item antrean = PELAKU dari sesi, bukan manajer perikatan', () => {
    const id = targetId();
    const doc = applyWipAdj({}, id, AMOUNT, ACTOR, nowIso());
    const it = itemFor(id, doc);
    expect(it.from).toBe(ACTOR.name);
    expect(it.role).toBe(ACTOR.role);
    expect(it.from).not.toBe(targetManager(id));
  });

  it('waktu pengajuan = waktu tindakan yang tercatat, bukan konstanta modul', () => {
    const id = targetId();
    const at = nowIso();
    const it = itemFor(id, applyWipAdj({}, id, AMOUNT, ACTOR, at));
    expect(it.submitted).toBe(at);
  });

  it('jumlah kumulatif: dua write-down berurutan menjadi satu entri yang bertambah', () => {
    const id = targetId();
    const half = Math.round(AMOUNT / 2);
    let doc: WipAdjDoc = applyWipAdj({}, id, half, ACTOR, nowIso());
    doc = applyWipAdj(doc, id, half, ACTOR, nowIso());
    expect(wipAdjAmounts(doc)[id]).toBe(half * 2);
    expect(model(doc).totManualWriteDown).toBe(half * 2);
  });

  it('BACA-LEWAT: entri warisan (angka telanjang) tetap menggerakkan angka & tetap memunculkan item', () => {
    const id = targetId();
    const legacy: WipAdjDoc = { [id]: AMOUNT };
    expect(wipAdjAmounts(legacy)[id]).toBe(AMOUNT);
    expect(model(legacy).netRecoverable).toBeLessThan(model().netRecoverable);
    const it = itemFor(id, legacy);
    /* Pelakunya TIDAK diketahui — dan tidak dikarang menjadi manajer perikatan. */
    expect(it.from).toBe('');
    expect(it.attributionUnknown).toBe(true);
  });

  it('pelaku TIDAK dapat menyetujui write-down-nya sendiri (SoD)', () => {
    const id = targetId();
    const it = itemFor(id, applyWipAdj({}, id, AMOUNT, ACTOR, nowIso()));
    const gate = stepAuthority(it, { name: ACTOR.name, role: 'Engagement Partner' });
    expect(gate.ok).toBe(false);
    expect(gate.reason).toMatch(/sendiri/);
  });

  it('item warisan tak beratribusi TIDAK dapat disetujui — SoD tak terbuktikan', () => {
    const id = targetId();
    const it = itemFor(id, { [id]: AMOUNT });
    const gate = stepAuthority(it, { name: 'Hartono Wijaya, CPA', role: 'Rekan Pemimpin' });
    expect(gate.ok).toBe(false);
    expect(gate.reason).toMatch(/pelaku/i);
  });
});

/* ============================================================
   W3 — langkah yang DITEGAKKAN = langkah yang DITAMPILKAN
   ============================================================ */
describe('W3 — kewenangan per-langkah pada item WIP Write-off', () => {
  const item = (step: number): ApprovalLite => {
    const id = targetId();
    const it = itemFor(id, applyWipAdj({}, id, AMOUNT, ACTOR, nowIso()));
    /* Rantai yang DITAMPILKAN: Audit Manager → Managing Partner. */
    expect(it.chain.map(c => c.role)).toEqual(['Audit Manager', 'Managing Partner']);
    return { ...it, step, chain: it.chain.map((c, i) => (i < step ? { ...c, status: 'approved' } : c)) };
  };

  it('langkah 0 (Audit Manager) — pemegang peran Audit Manager BOLEH', () => {
    expect(stepAuthority(item(0), { name: 'Anindya Pramesti', role: 'Audit Manager' }).ok).toBe(true);
  });

  it('langkah 1 (Managing Partner) — pemegang peran Audit Manager DITOLAK', () => {
    const gate = stepAuthority(item(1), { name: 'Rina Kusuma', role: 'Audit Manager' });
    expect(gate.ok).toBe(false);
    expect(gate.reason).toMatch(/Managing Partner/);
  });

  it('langkah 1 (Managing Partner) — peran tingkat-partner BOLEH', () => {
    expect(stepAuthority(item(1), { name: 'Hartono Wijaya, CPA', role: 'Rekan Pemimpin' }).ok).toBe(true);
  });

  it('langkah 1 — Finance Firma DITOLAK meski ia boleh MEMBUAT write-down', () => {
    const gate = stepAuthority(item(1), { name: 'Bendahara Lain', role: 'Finance Firma' });
    expect(gate.ok).toBe(false);
  });
});

/* ============================================================
   W4 — item baru tidak lahir dalam keadaan lewat tenggat
   ============================================================ */
describe('W4 — SLA item write-down manual', () => {
  it('tenggat = pengajuan + jendela SLA langkah persetujuan, bukan pengajuan itu sendiri', () => {
    const id = targetId();
    const at = nowIso();
    const it = itemFor(id, applyWipAdj({}, id, AMOUNT, ACTOR, at));
    const submitted = parseStamp(it.submitted);
    const due = parseStamp(it.due);
    expect(submitted).not.toBeNull();
    expect(due).not.toBeNull();
    expect((due as number) - (submitted as number)).toBe(AJE_SLA_HOURS * 3.6e6);
  });

  it('item yang baru dibuat TIDAK terhitung lewat tenggat', () => {
    const id = targetId();
    const it = itemFor(id, applyWipAdj({}, id, AMOUNT, ACTOR, nowIso()));
    expect((parseStamp(it.due) as number) - Date.now()).toBeGreaterThan(0);
  });
});

/* ============================================================
   W1 — KARANTINA. Cacat ini DIDOKUMENTASIKAN, belum diperbaiki: perbaikannya
   menuntut keputusan Ari (menahan efek vs efek-segera-plus-pembatalan), lihat
   docs/usulan-W1-wip-writedown-otorisasi.md.
   ============================================================ */
describe('W1 — penolakan write-down (KARANTINA)', () => {
  // KARANTINA s/d keputusan W1 (dibuat 2026-08-21). `it.fails()` menjaga master
  // tetap hijau sementara cacatnya tetap terbaca sebagai kode yang dijalankan
  // (BUILD.md §R-7). Hapus `.fails` begitu opsi W1 dipilih & diimplementasikan.
  it.fails('setelah item DITOLAK, nilai WIP kembali seperti sebelum write-down', () => {
    const id = targetId();
    const before = model().netRecoverable;
    const doc = applyWipAdj({}, id, AMOUNT, ACTOR, nowIso());
    expect(model(doc).netRecoverable).toBeLessThan(before);

    /* Inilah SELURUH yang dilakukan `decide('reject')` di view_platform.tsx:184 —
       ia menulis overlay keputusan. Jalur tulis-balik ke modul sumber hanya ada
       untuk AJE (`d.writesBack && d.sourceModule === 'aje'`, baris 177), jadi
       `wip.adj` tak tersentuh dan angka firma tetap turun. */
    const ov = ajeRejectOverlay({
      prevEntry: undefined,
      user: { name: 'Hartono Wijaya, CPA', role: 'Rekan Pemimpin' },
      ts: nowIso(), note: 'Dasar penurunan nilai tidak memadai.',
    });
    expect(ov.status).toBe('rejected');

    expect(model(doc).netRecoverable).toBe(before);
  });
});
