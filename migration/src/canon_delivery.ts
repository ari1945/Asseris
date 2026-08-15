/* ============================================================
   Asseris — Derivasi Delivery/Milestone (Fase 4 · PR-A2)  [PURE, ESM]
   ------------------------------------------------------------
   SSOT: rencana pengiriman (fase + milestone per perikatan) tersimpan
   di deliveryPlan.v1 (firm-scope, editable, seed dari AMS.DELIVERY);
   STATUS milestone (done/due/upcoming) DITURUNKAN dari flag `done`
   tersimpan × klok tunggal AMS.TODAY — bukan label seed beku. Progres/
   deadline/burn tetap dari AMS.ENGAGEMENTS (sudah nyata).

   PURE (tak menyentuh AMS_CANON) — pola canon_assertions/canon_capacity.
   Konsumen: view_delivery (editable), view_audittimeline (baca-saja).
   ============================================================ */

export interface DeliveryPhase { name: string; start: string; end: string }
/* Satu pergeseran komitmen tanggal — DATA, bukan penyuntingan. */
export interface MilestoneShift { at: string; by: string; from: string; to: string; reason?: string }

/* ------------------------------------------------------------------
   PR-3 — MILESTONE BERTIPE

   Sebelum PR ini milestone hanya punya label bebas, dan konsumen mengenalinya
   dengan REGEX ATAS LABEL: `view_audittimeline` mencari tanggal tanda tangan
   lewat `/sign|opini/i.test(m.label)`. Mengganti label "Sign-off" menjadi
   "Penerbitan laporan" membuat linimasa yang DIHADAPKAN KE KLIEN kehilangan
   tanggal tanda tangannya — diam-diam, tanpa error.

   `kind` adalah kontraknya. Regex hanya hidup di `inferKindFromLabel`, dipakai
   SEKALI untuk memigrasi dokumen lama; sesudah itu tak ada konsumen yang menebak
   dari teks.
   ------------------------------------------------------------------ */
export type MilestoneKind =
  | 'kickoff' | 'interim' | 'stocktake' | 'confirmation'
  | 'fieldwork-end' | 'eqr' | 'signoff' | 'archive' | 'other';

export const MILESTONE_KIND_LABEL: Record<MilestoneKind, string> = {
  kickoff: 'Kickoff', interim: 'Reviu interim', stocktake: 'Observasi persediaan',
  confirmation: 'Konfirmasi pihak ketiga', 'fieldwork-end': 'Selesai fieldwork',
  eqr: 'EQR (SA 220)', signoff: 'Tanda tangan / penerbitan', archive: 'Arsip (SMM)',
  other: 'Lainnya',
};

/* Urutan kanonik pekerjaan perikatan. `other` sengaja TIDAK berperingkat — ia
   tak pernah menghasilkan temuan urutan, karena tak ada urutan yang benar
   untuk sesuatu yang tak kita klasifikasikan. */
const KIND_RANK: Partial<Record<MilestoneKind, number>> = {
  kickoff: 0, interim: 1, stocktake: 2, confirmation: 2,
  'fieldwork-end': 3, eqr: 4, signoff: 5, archive: 6,
};
export function milestoneRank(kind: MilestoneKind): number | null {
  const r = KIND_RANK[kind];
  return r === undefined ? null : r;
}

/* Peta label → kind, HANYA untuk migrasi dokumen lama & seed tanpa `kind`.
   Urutan diuji: yang lebih spesifik lebih dulu ("sign-off opini" jangan
   tertangkap 'stocktake' dsb). */
export function inferKindFromLabel(label: string): MilestoneKind {
  const s = (label || '').toLowerCase();
  if (/\beqr\b|quality review|penelaahan mutu/.test(s)) return 'eqr';
  if (/sign-?off|tanda tangan|opini|penerbitan|laporan (reviu|temuan|auditor)/.test(s)) return 'signoff';
  if (/arsip|archive|assembly/.test(s)) return 'archive';
  if (/selesai (fieldwork|prosedur)|akhir fieldwork/.test(s)) return 'fieldwork-end';
  if (/stock ?opname|observasi persediaan|stocktake/.test(s)) return 'stocktake';
  if (/konfirmasi|confirmation/.test(s)) return 'confirmation';
  if (/interim/.test(s)) return 'interim';
  if (/kick-?off|mulai perikatan/.test(s)) return 'kickoff';
  return 'other';
}

export interface DeliveryMilestone {
  label: string;
  /* KONTRAK bagi konsumen (mis. tanggal tanda tangan di linimasa klien).
     Label boleh diganti bebas tanpa memutus siapa pun. */
  kind: MilestoneKind;
  /* komitmen KINI — dapat digeser */
  date: string;
  /* komitmen SEMULA — tidak pernah disunting dari UI. Inilah yang membuat
     keterlambatan tak dapat dihapus dengan menarik date-picker. */
  baselineDate: string;
  done: boolean;
  shifts?: MilestoneShift[];
}
export interface DeliveryEngPlan { id: string; phases: DeliveryPhase[]; milestones: DeliveryMilestone[] }
export type MilestoneStatus = 'done' | 'due' | 'upcoming';
/* Milestone seed lama membawa status string; peta ke flag `done` tersimpan. */
export interface SeedMilestone { label: string; kind?: MilestoneKind; date: string; status?: string; done?: boolean }
export interface SeedEngPlan { id: string; phases: DeliveryPhase[]; milestones: SeedMilestone[] }

const DAY = 864e5;
export function deliveryDaysTo(dateStr: string, today: string): number {
  return Math.round((new Date(dateStr + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / DAY);
}

/* Status TURUNAN: done tersimpan → 'done'; selain itu ≤7 hari (termasuk lewat
   tempo) → 'due', sisanya 'upcoming'. Lewat-tempo tetap terdeteksi konsumen via
   deliveryDaysTo<0 (warna merah teks + hitung overdue) tanpa nilai status baru. */
export function milestoneStatus(m: { done?: boolean; date: string }, today: string): MilestoneStatus {
  if (m.done) return 'done';
  return deliveryDaysTo(m.date, today) <= 7 ? 'due' : 'upcoming';
}

/* Seed deliveryPlan.v1 dari AMS.DELIVERY: status:'done' → done:true (buang
   label status turunan; date+done adalah satu-satunya state tersimpan). */
export function seedDeliveryPlan(delivery: SeedEngPlan[]): DeliveryEngPlan[] {
  return delivery.map((d) => ({
    id: d.id,
    phases: d.phases.map((p) => ({ name: p.name, start: p.start, end: p.end })),
    /* baselineDate = tanggal seed. Seed ADALAH komitmen semula; sesudah ini hanya
       `date` yang bergerak, dan setiap pergerakan meninggalkan jejak di `shifts`. */
    milestones: d.milestones.map((m) => ({
      label: m.label, kind: m.kind ?? inferKindFromLabel(m.label),
      date: m.date, baselineDate: m.date,
      done: m.done ?? m.status === 'done', shifts: [],
    })),
  }));
}

/* ------------------------------------------------------------------
   PR-2 — BASELINE & PERGESERAN

   `seedDeliveryPlan` hanya berjalan bila BELUM ada dokumen tersimpan. Dokumen
   `deliveryPlan.v1` yang sudah ada di server (ditulis sebelum PR ini) tidak
   punya `baselineDate` — karena itu normalisasi dijalankan pada setiap PEMBACAAN,
   bukan hanya saat seed. Tanpa ini, rencana lama akan tampak "tak pernah tergeser"
   selamanya: tepat kebohongan yang PR ini cabut.

   Migrasi maju bersifat konservatif: `baselineDate ??= date`. Untuk rencana lama
   ini berarti pergeseran yang SUDAH terjadi sebelum PR ini tidak dapat dipulihkan
   (jejaknya memang tidak pernah ada) — kita tidak mengarangnya. Yang dijamin:
   sejak titik ini, tak ada pergeseran yang tak tercatat.
   ------------------------------------------------------------------ */
export function normalizeDeliveryPlan(raw: unknown): DeliveryEngPlan[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is DeliveryEngPlan => !!p && typeof p === 'object').map((p) => ({
    id: p.id,
    phases: Array.isArray(p.phases) ? p.phases : [],
    milestones: (Array.isArray(p.milestones) ? p.milestones : []).map((m) => ({
      label: m.label,
      /* dokumen lama tak punya `kind` — diturunkan SEKALI dari label di sini.
         Sesudah tersimpan, label bebas diganti tanpa mengubah kind. */
      kind: m.kind || inferKindFromLabel(m.label),
      date: m.date,
      baselineDate: m.baselineDate || m.date,
      done: !!m.done,
      shifts: Array.isArray(m.shifts) ? m.shifts : [],
    })),
  }));
}

/* Pergeseran milestone dalam hari: >0 tergeser MUNDUR (melonggar), <0 maju. */
export function milestoneSlip(m: { date: string; baselineDate?: string }): number {
  return m.baselineDate ? deliveryDaysTo(m.date, m.baselineDate) : 0;
}

/* Q-2 = opsi (c): alasan WAJIB hanya untuk pergeseran mundur — friksi diletakkan
   tepat pada tindakan yang melonggarkan komitmen / menghapus kabar buruk.
   Menjadwalkan lebih AWAL tidak perlu dibenarkan. */
export function shiftRequiresReason(from: string, to: string): boolean {
  return deliveryDaysTo(to, from) > 0;
}

/* Terapkan pergeseran tanggal SAMBIL mencatatnya. MURNI: mengembalikan milestone
   baru; tak pernah menyentuh `baselineDate`. */
export function shiftMilestone(
  m: DeliveryMilestone,
  to: string,
  ctx: { at: string; by: string; reason?: string },
): DeliveryMilestone {
  if (!to || to === m.date) return m;
  const rec: MilestoneShift = { at: ctx.at, by: ctx.by, from: m.date, to };
  if (ctx.reason) rec.reason = ctx.reason;
  return { ...m, date: to, shifts: [...(m.shifts || []), rec] };
}

/* LEWAT TEMPO YANG TAK DAPAT DIHAPUS.

   `deliveryDaysTo(m.date, today) < 0` dihitung terhadap tanggal yang baru saja
   digeser — satu tarikan date-picker mengubah 3 lewat-tempo menjadi 0. Angka di
   bawah ini dihitung terhadap KOMITMEN SEMULA, sehingga menggeser tanggal tidak
   menurunkannya. Menyelesaikan pekerjaannya yang menurunkannya. */
export function overdueVsBaseline(plans: DeliveryEngPlan[], today: string): number {
  return plans.reduce((n, p) => n + p.milestones.filter(
    (m) => !m.done && deliveryDaysTo(m.baselineDate || m.date, today) < 0,
  ).length, 0);
}

export interface PlanSlipSummary {
  /* milestone yang tanggalnya bergerak dari baseline (arah mana pun) */
  shiftedCount: number;
  /* jumlah hari pergeseran MUNDUR saja — perlonggaran komitmen bersih */
  totalSlipDays: number;
  /* pergeseran mundur terbesar & pemiliknya (untuk kalimat ringkas) */
  maxSlip: number;
  worst: { eng: string; label: string; slip: number } | null;
}

export function planSlipSummary(plans: DeliveryEngPlan[]): PlanSlipSummary {
  let shiftedCount = 0, totalSlipDays = 0, maxSlip = 0;
  let worst: PlanSlipSummary['worst'] = null;
  plans.forEach((p) => p.milestones.forEach((m) => {
    const slip = milestoneSlip(m);
    if (slip !== 0) shiftedCount++;
    if (slip > 0) {
      totalSlipDays += slip;
      if (slip > maxSlip) { maxSlip = slip; worst = { eng: p.id, label: m.label, slip }; }
    }
  }));
  return { shiftedCount, totalSlipDays, maxSlip, worst };
}

/* Sisipkan status turunan ke tiap milestone (untuk render). */
export function withMilestoneStatus(plan: DeliveryEngPlan, today: string): { id: string; phases: DeliveryPhase[]; milestones: (DeliveryMilestone & { status: MilestoneStatus; slip: number })[] } {
  return {
    id: plan.id,
    phases: plan.phases,
    milestones: plan.milestones.map((m) => ({ ...m, status: milestoneStatus(m, today), slip: milestoneSlip(m) })),
  };
}

/* ------------------------------------------------------------------
   PR-3 — KONSISTENSI RENCANA

   Sebuah "rencana" yang tak pernah bisa dinyatakan tidak konsisten bukanlah
   rencana. Sebelum PR ini tak ada yang mendeteksi bila tanda tangan dijadwalkan
   MENDAHULUI selesainya fieldwork, fase Finalisasi mulai sebelum Eksekusi
   berakhir, atau milestone jatuh SETELAH tenggat pelaporan perikatan.

   Temuan BERNAMA (bukan sekadar "ada masalah") supaya auditor tahu apa yang
   harus diperbaiki. Murni: `today` & `deadline` diserahkan pemanggil.
   ------------------------------------------------------------------ */
export type PlanIssueKind = 'sequence' | 'phase-overlap' | 'phase-gap' | 'past-deadline';

export interface PlanIssue {
  kind: PlanIssueKind;
  eng: string;
  /* kalimat siap-tampil (Bahasa Indonesia) */
  detail: string;
}

/* Ambang lubang antar-fase: akhir pekan & hari libur adalah jeda yang WAJAR,
   jadi hanya lubang > 7 hari yang dilaporkan. Tumpang-tindih dilaporkan tegas. */
const PHASE_GAP_TOLERANCE_DAYS = 7;

export function planConsistency(
  plan: DeliveryEngPlan,
  eng: { deadline?: string | null } | null | undefined,
): PlanIssue[] {
  const out: PlanIssue[] = [];
  const id = plan.id;

  /* 1 — URUTAN. Milestone berperingkat yang dijadwalkan mendahului milestone
     berperingkat LEBIH RENDAH melanggar urutan pekerjaan perikatan. */
  const ranked = plan.milestones
    .map((m) => ({ m, r: milestoneRank(m.kind) }))
    .filter((x): x is { m: DeliveryMilestone; r: number } => x.r !== null);
  ranked.forEach((a) => ranked.forEach((b) => {
    if (a.r >= b.r) return;                                  // a harus lebih dulu
    if (deliveryDaysTo(b.m.date, a.m.date) >= 0) return;      // b memang setelah a — benar
    out.push({
      kind: 'sequence', eng: id,
      detail: `"${b.m.label}" (${MILESTONE_KIND_LABEL[b.m.kind]}) dijadwalkan ${b.m.date}, mendahului "${a.m.label}" (${MILESTONE_KIND_LABEL[a.m.kind]}) pada ${a.m.date}`,
    });
  }));

  /* 2 — FASE. Diurutkan menurut mulai; tumpang-tindih & lubang besar dinamai. */
  const phases = [...plan.phases].sort((x, y) => deliveryDaysTo(x.start, y.start));
  for (let i = 0; i + 1 < phases.length; i++) {
    const cur = phases[i], nxt = phases[i + 1];
    const slack = deliveryDaysTo(nxt.start, cur.end);         // hari antara akhir cur & mulai nxt
    if (slack < 0) {
      out.push({
        kind: 'phase-overlap', eng: id,
        detail: `Fase "${nxt.name}" mulai ${nxt.start}, sebelum "${cur.name}" berakhir ${cur.end} (tumpang-tindih ${Math.abs(slack)} hari)`,
      });
    } else if (slack > PHASE_GAP_TOLERANCE_DAYS) {
      out.push({
        kind: 'phase-gap', eng: id,
        detail: `Lubang ${slack} hari antara "${cur.name}" (berakhir ${cur.end}) dan "${nxt.name}" (mulai ${nxt.start})`,
      });
    }
  }

  /* 3 — TENGGAT. Milestone yang jatuh setelah tenggat pelaporan perikatan adalah
     rencana yang, bila dijalankan sesuai rencana, TETAP terlambat. */
  const dl = eng && eng.deadline;
  if (dl) {
    plan.milestones.forEach((m) => {
      const over = deliveryDaysTo(m.date, dl);
      if (over > 0) {
        out.push({
          kind: 'past-deadline', eng: id,
          detail: `"${m.label}" dijadwalkan ${m.date}, ${over} hari SETELAH tenggat perikatan ${dl}`,
        });
      }
    });
  }

  return out;
}

/* Konsistensi seluruh portofolio. `engOf` memasok tenggat per perikatan. */
export function planConsistencyAll(
  plans: DeliveryEngPlan[],
  engOf: (id: string) => { deadline?: string | null } | null | undefined,
): PlanIssue[] {
  return plans.flatMap((p) => planConsistency(p, engOf(p.id)));
}

/* Cari milestone menurut KONTRAK, bukan menurut tebakan teks. Menggantikan
   `/sign|opini/i.test(m.label)` di view_audittimeline. */
export function milestoneOfKind<T extends { kind: MilestoneKind }>(
  milestones: T[], kind: MilestoneKind,
): T | undefined {
  return milestones.find((m) => m.kind === kind);
}
