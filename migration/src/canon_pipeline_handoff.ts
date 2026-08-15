/* ============================================================
   Asseris — canon_pipeline_handoff: serah-terima peluang → prospek yang
   TIDAK MENGARANG apa pun dan TIDAK GAGAL DIAM-DIAM.

   PRD `docs/prd-sales-pipeline-deepening.md` · PR-3.

   `toOnboarding()` lama mengarang tiga field dan gagal senyap pada yang keempat:

     materiality: Math.round(o.value * 2.5)
        Materialitas SA 320 adalah persentase BENCHMARK ENTITAS (laba/pendapatan/
        aset), bukan kelipatan fee KAP. Faktor 2,5 adalah rata-rata rasio seed
        (2,66 · 2,11 · 2,37) — sebuah PLUG. Dan ia tidak inert: nilai itu mengalir
        `addEngagement({ materiality })` → `materialityFor({ engMateriality })`
        (contexts.tsx) → ambang kertas kerja (wp_canon), pembacaan neraca saldo
        (view_execution), dan cakupan asersi. Fee KAP menentukan materialitas
        audit klien.

     partner: o.owner.includes(',') ? o.owner : o.owner + ', CPA'
        Menempelkan gelar CPA pada siapa pun. OPP-107 dimiliki Bayu Saputra —
        seorang Audit MANAGER — dan konversi mengangkatnya jadi "Bayu Saputra,
        CPA" selaku Engagement Partner. Bandingkan PROS-05: partner sebenarnya
        Sari Dewanti, CPA, dengan Bayu sebagai manajer.

     budgetHrs: value / 700_000
        Tarif Senior, sementara kapasitas memakai CAP_BLENDED_RATE 800_000 untuk
        konversi yang sama. (Dituntaskan PR-5; di sini hanya diberi nama.)

     amsAddProspect → `if (cur.some(...)) return;`
        Duplikat di-`return` TANPA pesan, sementara pemanggil tetap menandai
        peluang Won lalu berpindah halaman. Untuk 4 dari 7 peluang seed
        prospeknya SUDAH ADA — jadi tombolnya mengubah status peluang dan tidak
        membuat apa pun.

   Berkas ini MURNI: ia MEMUTUSKAN dan MENYUSUN, tidak menulis. Penulisan tetap
   di lapisan React lewat `useAmsPersist('prospects')` (server-SSOT), bukan
   `localStorage.setItem` mentah.
   ============================================================ */

import type { Opportunity } from './canon_pipeline';
import type { AccFactor, ProspectLike } from './canon_pipeline_acceptance';
import { findProspect } from './canon_pipeline_acceptance';
import type { ClientRow, StaffRow } from './ams_types';

export type HandoffKind = 'buat' | 'sudah-ada' | 'tolak';

export interface HandoffPlan {
  kind: HandoffKind;
  /** Prospek yang sudah ada (kind='sudah-ada'), atau null. */
  existing: ProspectLike | null;
  /** Prospek baru yang akan ditulis (kind='buat'), atau null. */
  draft: ProspectLike | null;
  /** Kalimat untuk pengguna. TIDAK PERNAH kosong — kegagalan harus terlihat. */
  message: string;
  /**
   * Field yang sengaja DIKOSONGKAN karena tak punya dasar, beserta alasannya.
   * Ditampilkan ke pengguna supaya "belum ditetapkan" adalah keadaan yang
   * terlihat, bukan nol yang menyamar sebagai angka.
   */
  unset: { field: string; reason: string }[];
}

/** Standar profesi yang berlaku untuk sebuah jenis jasa. */
export function standardFor(service: string): string {
  const s = (service || '').toLowerCase();
  if (s.includes('review') || s.includes('reviu')) return 'SPR 2400';
  if (s.includes('due diligence')) return 'SJAH 3000';
  if (s.includes('agreed-upon') || s.includes('aup')) return 'SJAT 4400';
  return 'SA';
}

/**
 * Partner penanggung jawab: diambil dari ROSTER STAF, tak pernah dikarang.
 *
 * Pemilik peluang adalah pemilik hubungan KOMERSIAL — belum tentu partner
 * perikatan. Yang menghalangi bukan soal gelar melainkan PERAN: Bayu Saputra
 * memang memegang CPA, tetapi ia Audit Manager, sehingga ia tidak boleh menjadi
 * Engagement Partner (SA 220.14). Kode lama menempelkan ", CPA" pada siapa pun
 * dan dengan itu mengangkatnya jadi partner.
 *
 * Gelar yang dipakai adalah gelar yang BENAR-BENAR TERCATAT di kolom `cert`.
 */
export function partnerFromRoster(owner: string, staff: StaffRow[]): { partner: string | null; manager: string | null; why: string } {
  const bare = (n: string) => (n || '').split(',')[0].trim();
  const row = (staff || []).find((s) => bare(s.name) === bare(owner));
  if (!row) {
    return { partner: null, manager: null, why: `"${bare(owner)}" tidak ditemukan di roster staf — peran & gelar tidak dapat dipastikan.` };
  }
  const isPartner = /partner|rekan/i.test(row.role || '') || /partner|rekan/i.test(row.grade || '');
  if (isPartner) {
    const cert = (row.cert || '').split(',')[0].trim();
    return {
      partner: cert ? `${bare(row.name)}, ${cert}` : bare(row.name),
      manager: null,
      why: `Diambil dari roster staf: ${row.id} · ${row.role}${cert ? ' · ' + cert : ''}.`,
    };
  }
  return {
    partner: null,
    manager: bare(row.name),
    why: `${bare(row.name)} terdaftar sebagai ${row.role} (${row.id})${row.cert ? ', bersertifikat ' + row.cert : ''} — bukan Partner. Penanggung jawab perikatan harus ditunjuk manusia (SA 220.14).`,
  };
}

/** Faktor akseptasi kosong: skor default TANPA catatan = belum dinilai. */
export function blankFactors(template: AccFactor[]): AccFactor[] {
  return (template || []).map((f) => ({ k: f.k, w: f.w, s: 3, note: '' }));
}

export function planHandoff(
  opp: Opportunity,
  ctx: { prospects: ProspectLike[]; clients: ClientRow[]; staff: StaffRow[]; factorTemplate: AccFactor[] },
): HandoffPlan {
  const { p: existing } = findProspect(opp, ctx.prospects || []);
  if (existing) {
    return {
      kind: 'sudah-ada', existing, draft: null, unset: [],
      message: `Peluang ini sudah punya catatan prospek ${existing.id}. Serah-terima tidak diulang — buka prospeknya untuk melanjutkan penerimaan.`,
    };
  }

  /* Cross-sell = klien eksisting: yang berlaku KEBERLANJUTAN, bukan penerimaan
     klien baru. Membuat prospek "Klien Baru" untuk klien yang sudah ada akan
     menduplikasi entitas di roster. */
  if (opp.origin === 'cross-sell') {
    const client = (ctx.clients || []).find((c) => c.id === opp.clientId);
    return {
      kind: 'tolak', existing: null, draft: null, unset: [],
      message: `${client ? client.name : opp.name} sudah menjadi klien. Jasa tambahan dinilai lewat KEBERLANJUTAN (SMM 1 ¶34(d) / SA 220.20) di modul Keberlanjutan Klien, bukan lewat penerimaan klien baru.`,
    };
  }

  const roster = partnerFromRoster(opp.owner, ctx.staff || []);
  const unset: { field: string; reason: string }[] = [
    {
      field: 'Materialitas (SA 320)',
      reason: 'Ditetapkan dari benchmark laporan keuangan entitas, bukan dari fee. Belum ada angka entitas pada tahap prospek — diisi saat perencanaan.',
    },
    { field: 'NPWP', reason: 'Belum diperoleh dari calon klien.' },
  ];
  if (!roster.partner) unset.push({ field: 'Partner perikatan', reason: roster.why });

  const draft: ProspectLike = {
    id: 'PROS-' + opp.id.replace('OPP-', ''),
    name: opp.name,
    source: opp.id,
    fee: opp.value,
    acceptance: { approved: false, decision: '', approver: '', date: '', safeguard: '', factors: blankFactors(ctx.factorTemplate) },
    pmpj: { verified: false, riskRating: 'Sedang', cddLevel: 'Standar', str: false, screening: [] },
    letter: { version: 0, status: 'draft' },
  };
  /* Field di luar kontrak ProspectLike (dikonsumsi modul Onboarding) — disusun
     di sini agar seluruh keputusan "apa yang boleh diisi" hidup di satu tempat. */
  const extra = {
    industry: opp.industry, city: '', listed: false, kind: 'Klien Baru',
    service: opp.service, standard: standardFor(opp.service),
    partner: roster.partner, manager: roster.manager,
    materiality: null, npwp: '', fyEnd: '', deadline: opp.close, budgetHrs: null,
    converted: false,
  };

  return {
    kind: 'buat',
    existing: null,
    draft: Object.assign(draft, extra) as ProspectLike,
    unset,
    message: `Prospek ${draft.id} dibuat dari ${opp.id}. ${unset.length} field sengaja dikosongkan karena belum punya dasar — isi sebelum konversi ke perikatan.`,
  };
}

/**
 * Terapkan rencana pada daftar prospek. Mengembalikan daftar BARU bila ada yang
 * ditulis, atau `null` bila tidak ada perubahan — pemanggil memakai `null` untuk
 * TIDAK mengubah apa pun (termasuk tidak menggeser tahap peluang).
 */
export function applyHandoff(plan: HandoffPlan, prospects: ProspectLike[]): ProspectLike[] | null {
  if (plan.kind !== 'buat' || !plan.draft) return null;
  if ((prospects || []).some((p) => p.id === plan.draft!.id)) return null;   // idempoten
  return [plan.draft, ...(prospects || [])];
}
