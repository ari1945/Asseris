/* ============================================================
   Asseris — Gerbang Masuk Perikatan (SA 210 / SA 220 / ISQM 1)
   PRD: docs/prd-acceptance-to-engagement-flow-sa210.md (M1).

   Fungsi MURNI — tanpa `window`, React, atau I/O (fit harness node,
   pola sama `rbac.ts`). Menegakkan prasyarat transisi Perencanaan→Eksekusi:
     (1) keputusan PENERIMAAN (klien baru) / KEBERLANJUTAN (klien lanjutan)
         disetujui — SA 220 / ISQM 1 ¶33–34, DAN
     (2) SURAT PERIKATAN ditandatangani — SA 210.

   Penegakan & UI = M4 (di-wire ke `engagementGate` cabang →Eksekusi,
   severity 'confirm', graduated Q1). Output sengaja sebentuk kriteria
   `engagementGate` ({key,label,met,detail,view}) agar wiring M4 trivial.

   FAIL-SAFE: input legacy/sebagian (engagement lama tanpa field warisan)
   ⇒ blocker "Pra-akseptasi", BUKAN exception. Ambiguitas → memblok.
   ============================================================ */

/* Keputusan penerimaan/keberlanjutan — bentuk warisan dari
   `prospect.acceptance` (klien baru) ATAU keputusan modul `continuance`
   (klien lanjutan). Kedua kosakata putusan didukung resolver di bawah. */
export type AcceptanceRef = {
  approved?: boolean;
  decision?: string;      // 'Terima' | 'Terima dengan Syarat' | 'Lanjut' | 'Lanjut dengan Syarat' | 'Tidak Dilanjutkan' | 'Tertunda' | …
  approver?: string;
  date?: string;
};

/* Surat perikatan — bentuk warisan dari `prospect.letter`. */
export type EngagementLetterRef = {
  status?: string;        // 'none' | 'draft' | 'sent' | 'signed'
  version?: number;
  scope?: string;
  esign?: unknown[];
};

export type ClientKind = 'Klien Baru' | 'Keberlanjutan' | string;

/* Konteks gerbang. Diturunkan dari engagement (M2: clientKind/acceptanceRef/
   engagementLetter) atau langsung dari prospek (M3 mapper). */
export type EngagementEntryContext = {
  clientKind?: ClientKind;
  acceptanceRef?: AcceptanceRef | null;
  engagementLetter?: EngagementLetterRef | null;
};

export type EntryCriterion = {
  key: 'accepted' | 'letterSigned';
  label: string;
  met: boolean;
  detail: string;
  view: string;           // modul tujuan untuk menyelesaikan blocker
};

export type EntryGateResult = {
  ok: boolean;
  allMet: boolean;        // alias `ok` (paritas bentuk dgn engagementGate)
  blockers: EntryCriterion[];
  criteria: EntryCriterion[];
};

/* Putusan "go" (positif) vs "no-go/tunda" (negatif). Penerimaan dengan
   syarat / keberlanjutan dengan syarat = tetap GO (diterima dengan
   safeguard). Cek NEGATIF dulu agar "Tidak Dilanjutkan" tak salah-cocok
   substring "lanjut". */
const NEGATIVE = /(tidak\s+di?lanjut|tidak\s+di?terima|ditolak|\btolak\b|reject|decline|pending|tertunda|menunggu)/i;
const POSITIVE = /(terima|lanjut|setuju|disetujui|accept|continue|approve)/i;

/* isDecisionApproved — true bila putusan adalah GO. Kosakata-ganda:
   - boolean `approved` eksplisit diutamakan, NAMUN teks negatif tegas
     menimpa `approved:true` (data kontradiktif → fail-safe memblok);
   - bila `approved` undefined, simpulkan dari teks `decision`. */
function isDecisionApproved(ref: AcceptanceRef | null | undefined): boolean {
  if (!ref) return false;
  const text = (ref.decision || '').trim();
  if (text && NEGATIVE.test(text)) return false;   // negatif tegas → blokir, apa pun `approved`
  if (ref.approved === true) return true;
  if (ref.approved === false) return false;
  if (!text) return false;                          // tak ada sinyal → fail-safe blokir
  return POSITIVE.test(text);
}

function isLetterSigned(letter: EngagementLetterRef | null | undefined): boolean {
  if (!letter) return false;
  return (letter.status || '').trim().toLowerCase() === 'signed';
}

function acceptanceDetail(ref: AcceptanceRef | null | undefined, approved: boolean): string {
  if (!approved) return 'Pra-akseptasi — keputusan penerimaan/keberlanjutan belum disetujui';
  const r = ref || {};
  const bits = [r.decision, r.approver, r.date].filter((x): x is string => !!x && !!x.trim());
  return bits.length ? `Disetujui — ${bits.join(' · ')}` : 'Disetujui';
}

function letterDetail(letter: EngagementLetterRef | null | undefined, signed: boolean): string {
  if (signed) return 'Surat perikatan ditandatangani (SA 210)';
  const s = (letter && letter.status) ? letter.status : 'belum dibuat';
  return `Surat perikatan belum ditandatangani — status: ${s}`;
}

/* engagementEntryGate — daftar prasyarat masuk Eksekusi untuk SATU
   konteks engagement. Murni: tak menyentuh storage/jam/peran. */
export function engagementEntryGate(ctx: EngagementEntryContext | null | undefined): EntryGateResult {
  const c = ctx || {};
  const kind: ClientKind = c.clientKind === 'Keberlanjutan' ? 'Keberlanjutan' : 'Klien Baru';

  const accepted = isDecisionApproved(c.acceptanceRef);
  const letterSigned = isLetterSigned(c.engagementLetter);

  const criteria: EntryCriterion[] = [
    {
      key: 'accepted',
      label: kind === 'Keberlanjutan'
        ? 'Keputusan keberlanjutan klien disetujui (ISQM 1 ¶33–34 / SA 220)'
        : 'Keputusan penerimaan klien disetujui (SA 220 / ISQM 1)',
      met: accepted,
      detail: acceptanceDetail(c.acceptanceRef, accepted),
      view: kind === 'Keberlanjutan' ? 'continuance' : 'onboarding',
    },
    {
      key: 'letterSigned',
      label: 'Surat perikatan ditandatangani (SA 210)',
      met: letterSigned,
      detail: letterDetail(c.engagementLetter, letterSigned),
      view: 'onboarding',
    },
  ];

  const blockers = criteria.filter((x) => !x.met);
  return { ok: blockers.length === 0, allMet: blockers.length === 0, blockers, criteria };
}

/* engagementEntryContext (M2) — petakan objek engagement (membawa field
   warisan M2) ke konteks gerbang. Seam tunggal yang dipakai M4 agar wiring
   tak menjamah bentuk engagement langsung. Toleran data legacy: field hilang
   → null/undefined → gerbang fail-safe "Pra-akseptasi". */
export function engagementEntryContext(
  eng: {
    clientKind?: ClientKind;
    acceptanceRef?: AcceptanceRef | null;
    engagementLetter?: EngagementLetterRef | null;
  } | null | undefined
): EngagementEntryContext {
  const e = eng || {};
  return {
    clientKind: e.clientKind,
    acceptanceRef: e.acceptanceRef ?? null,
    engagementLetter: e.engagementLetter ?? null,
  };
}

/* ---- M3: konversi prospek → warisan engagement ----
   Prospek onboarding (acceptance + letter) → field warisan engagement.
   Dipakai konverter `StepConvert.doConvert` agar engagement hasil konversi
   LOLOS gerbang masuk Eksekusi by construction (provenance terbawa, bukan
   default Pra-akseptasi). Pure → ber-test tanpa React. */
export type ProspectLike = {
  id?: string;
  kind?: ClientKind;
  acceptance?: { approved?: boolean; decision?: string; approver?: string; date?: string } | null;
  letter?: EngagementLetterRef | null;
};

export type EngagementInheritance = {
  clientKind?: ClientKind;
  originProspectId: string | null;
  acceptanceRef: AcceptanceRef | null;
  engagementLetter: EngagementLetterRef | null;
};

export function prospectToEngagementInheritance(p: ProspectLike | null | undefined): EngagementInheritance {
  const pr = p || {};
  const a = pr.acceptance || null;
  return {
    clientKind: pr.kind,
    originProspectId: pr.id ?? null,
    acceptanceRef: a ? { approved: a.approved, decision: a.decision, approver: a.approver, date: a.date } : null,
    engagementLetter: pr.letter ?? null,
  };
}
