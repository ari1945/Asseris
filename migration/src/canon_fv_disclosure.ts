/* ============================================================
   Asseris — PSAK 68 · kecukupan pengungkapan nilai wajar (¶91-99)
   ------------------------------------------------------------
   Modul MURNI (tanpa React/DOM). Menurunkan status tiap butir
   pengungkapan wajib DARI hasil `AMS_CANON.psak68()` — bukan dari
   daftar `ok: true` yang dipaku.

   Sebelum modul ini, ketujuh butir di `view_psak68.tsx` bernilai
   `ok: true` secara literal: tidak ada keadaan dunia yang membuatnya
   merah, sehingga panel "kecukupan CALK" tak pernah dapat gagal.

   Tipe masukan dibuat STRUKTURAL (hanya field yang dipakai) supaya
   modul ini tak terikat pada bentuk penuh `psak68()` dan dapat diuji
   dengan fixture kecil.
   ============================================================ */

export interface FvInputLike { k: string; obs: boolean; val?: string; range?: string }
export interface FvItemLike {
  id: string; label: string; cls: string; level: number;
  technique?: string; inputs?: FvInputLike[]; hbu?: string | null;
}
export interface FvSensLike { item?: string; label: string }
export interface FvRollForwardLike { opening: number; closing: number }
export interface FvTransfersLike { note?: string }
export interface Psak68Like {
  items: FvItemLike[];
  l3: FvItemLike[];
  l3Total: number;
  l3RF: FvRollForwardLike;
  sens: FvSensLike[];
  transfers: FvTransfersLike;
  byLevel: Array<{ level: number; n: number }>;
}

export interface DisclosureCheck {
  id: string;
  ref: string;
  t: string;
  ok: boolean;
  /** Alasan BILA tidak terpenuhi — menyebut pos yang kurang, bukan "belum lengkap". */
  why: string;
}

/** Kelas non-keuangan yang tunduk pada pengungkapan penggunaan tertinggi & terbaik (¶93i). */
const NON_FINANCIAL_CLS = 'Revaluasi';
/** Toleransi penutupan roll-forward (Rp juta) — pembulatan, bukan kelonggaran. */
export const RF_TOLERANCE = 1;

function names(list: FvItemLike[]): string {
  return list.map(i => i.label).join(', ');
}

/** Input tak teramati dianggap TERUNGKAP KUANTITATIF bila membawa nilai atau rentang. */
function hasQuantUnobservable(it: FvItemLike): boolean {
  const inputs = it.inputs || [];
  const unobs = inputs.filter(i => !i.obs);
  if (!unobs.length) return false;
  return unobs.every(i => !!(i.val || i.range));
}

export function fvDisclosureChecks(p: Psak68Like): DisclosureCheck[] {
  const items = p.items || [];
  const l3 = p.l3 || [];
  const sens = p.sens || [];
  const byLevel = p.byLevel || [];

  // ¶93b — tabel hierarki mencakup SELURUH pos yang diukur pada nilai wajar
  const levelled = byLevel.reduce((a, b) => a + (b.n || 0), 0);
  const hierarchyOk = items.length > 0 && levelled === items.length;

  // ¶93d — teknik valuasi & input dinyatakan untuk tiap pos
  const noTechnique = items.filter(i => !i.technique || !(i.inputs || []).length);

  // ¶93e — roll-forward Level 3 MENUTUP ke saldo akhir Level 3
  const rfGap = Math.round((p.l3RF ? p.l3RF.closing : 0) - (p.l3Total || 0));
  const rfOk = l3.length === 0 || Math.abs(rfGap) <= RF_TOLERANCE;

  // ¶93d — informasi KUANTITATIF input tak teramati signifikan, per pos Level 3
  const noQuant = l3.filter(i => !hasQuantUnobservable(i));

  // ¶93h — sensitivitas menutup SETIAP pos Level 3, bukan sekadar "ada tabelnya"
  const covered = new Set(sens.map(s => s.item).filter(Boolean));
  const noSens = l3.filter(i => !covered.has(i.id));

  // ¶93c — kebijakan & jumlah transfer antar level dinyatakan
  const transfersOk = !!(p.transfers && (p.transfers.note || '').trim());

  // ¶93i — penggunaan tertinggi & terbaik untuk aset NON-KEUANGAN
  const nonFin = items.filter(i => i.cls === NON_FINANCIAL_CLS);
  const noHbu = nonFin.filter(i => !(i.hbu || '').trim());

  return [
    {
      id: 'hierarchy', ref: '¶93b', t: 'Tabel hierarki nilai wajar per level',
      ok: hierarchyOk,
      why: items.length === 0 ? 'Belum ada pos diukur pada nilai wajar.'
        : `Tabel hierarki hanya mencakup ${levelled} dari ${items.length} pos.`,
    },
    {
      id: 'technique', ref: '¶93d', t: 'Teknik valuasi & input yang digunakan',
      ok: noTechnique.length === 0,
      why: `Teknik atau input belum dinyatakan: ${names(noTechnique)}.`,
    },
    {
      id: 'l3rollforward', ref: '¶93e', t: 'Rekonsiliasi saldo Level 3 (roll-forward)',
      ok: rfOk,
      why: `Roll-forward tidak menutup ke saldo Level 3 — selisih ${rfGap.toLocaleString('id-ID')} jt.`,
    },
    {
      id: 'l3quant', ref: '¶93d', t: 'Informasi kuantitatif input tak teramati signifikan',
      ok: noQuant.length === 0,
      why: `Input tak teramati tanpa nilai/rentang kuantitatif: ${names(noQuant)}.`,
    },
    {
      id: 'l3sens', ref: '¶93h', t: 'Narasi sensitivitas Level 3 terhadap input',
      ok: noSens.length === 0,
      why: `Pos Level 3 tanpa analisis sensitivitas: ${names(noSens)}.`,
    },
    {
      id: 'transfers', ref: '¶93c', t: 'Kebijakan & jumlah transfer antar level',
      ok: transfersOk,
      why: 'Kebijakan transfer antar level belum dinyatakan.',
    },
    {
      id: 'hbu', ref: '¶93i', t: 'Penggunaan tertinggi & terbaik aset non-keuangan',
      ok: noHbu.length === 0,
      why: `Aset non-keuangan tanpa pernyataan penggunaan tertinggi & terbaik: ${names(noHbu)}.`,
    },
  ];
}

export interface DisclosureSummary { checks: DisclosureCheck[]; open: DisclosureCheck[]; ok: boolean }

export function fvDisclosureSummary(p: Psak68Like): DisclosureSummary {
  const checks = fvDisclosureChecks(p);
  const open = checks.filter(c => !c.ok);
  return { checks, open, ok: open.length === 0 };
}
