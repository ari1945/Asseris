/* ============================================================
   Asseris — Independensi per-Anggota Tim (SA 220.16–24 · ISQM 1 · Kode Etik/IESBA 290)

   Mesin murni & deterministik: setiap anggota tim perikatan menyatakan
   independensi untuk perikatan tertentu — mengidentifikasi ancaman (5
   kategori IESBA) + pengaman. Status per-anggota di-roll-up ke kesimpulan
   independensi tingkat-perikatan (bersih / ter-safeguard / terblokir), yang
   menjadi prasyarat sign-off/penerbitan opini (mirror gerbang etik/AML).

   Berbeda dari `INDEPENDENCE` (per-AP, rotasi) & `ethics_gate` (per-user,
   tahunan firm-wide): ini per (anggota × perikatan). SSOT roster = SCHEDULE.
   Tidak ada angka hardcode.
   ============================================================ */

export type ThreatKey = 'selfInterest' | 'selfReview' | 'advocacy' | 'familiarity' | 'intimidation';

export interface ThreatMeta {
  key: ThreatKey;
  label: string;
  hint: string;
}

/* 5 kategori ancaman independensi (Kode Etik IAPI / IESBA 290 · SA 220.A). */
export const THREATS: ThreatMeta[] = [
  { key: 'selfInterest', label: 'Kepentingan pribadi', hint: 'Kepentingan finansial, ketergantungan imbalan, pinjaman/hubungan bisnis dengan klien.' },
  { key: 'selfReview', label: 'Telaah-pribadi', hint: 'Menelaah hasil pekerjaan/jasa non-asurans yang dibuat sendiri.' },
  { key: 'advocacy', label: 'Advokasi', hint: 'Memihak/mempromosikan posisi klien hingga objektivitas terganggu.' },
  { key: 'familiarity', label: 'Kedekatan', hint: 'Hubungan dekat/keluarga atau asosiasi lama dengan klien/tim klien.' },
  { key: 'intimidation', label: 'Intimidasi', hint: 'Tekanan (aktual/dirasakan) dari klien atas objektivitas auditor.' },
];

export interface MemberDeclaration {
  /** kategori ancaman yang ditandai ADA oleh anggota. */
  threats: Partial<Record<ThreatKey, boolean>>;
  /** pengaman atas ancaman teridentifikasi (wajib bila ada ancaman agar tak memblok). */
  safeguards: string;
  note: string;
  signed: boolean;
  signedAt?: string;
}

/** Deklarasi seluruh anggota sebuah perikatan (keyed by nama anggota). */
export type EngagementDeclarations = Record<string, MemberDeclaration>;

export interface MemberRef {
  member: string;
  role: string;
}

export type MemberIndepStatus = 'clean' | 'safeguarded' | 'threat' | 'undeclared';

export interface MemberIndepRow {
  member: string;
  role: string;
  signed: boolean;
  threats: ThreatKey[];
  hasThreat: boolean;
  safeguarded: boolean;
  status: MemberIndepStatus;
  /** memblok: belum menyatakan (undeclared) ATAU ada ancaman tanpa pengaman (threat). */
  blocked: boolean;
  signedAt?: string;
}

export interface EngagementIndependence {
  rows: MemberIndepRow[];
  total: number;
  signed: number;
  withThreat: number;
  blockers: number;
  /** bersih bila tak ada pemblokir (roster kosong = bersih — tak ada yg dinyatakan). */
  clear: boolean;
}

const EMPTY_DECL: MemberDeclaration = { threats: {}, safeguards: '', note: '', signed: false };

export function activeThreats(d: MemberDeclaration): ThreatKey[] {
  return THREATS.map((t) => t.key).filter((k) => !!d.threats[k]);
}

export function memberIndepStatus(d: MemberDeclaration): { status: MemberIndepStatus; blocked: boolean; threats: ThreatKey[]; safeguarded: boolean } {
  const threats = activeThreats(d);
  const hasThreat = threats.length > 0;
  const safeguarded = hasThreat && !!(d.safeguards && d.safeguards.trim());
  if (!d.signed) return { status: 'undeclared', blocked: true, threats, safeguarded };
  if (!hasThreat) return { status: 'clean', blocked: false, threats, safeguarded };
  if (safeguarded) return { status: 'safeguarded', blocked: false, threats, safeguarded };
  return { status: 'threat', blocked: true, threats, safeguarded };
}

/** Roster anggota unik yang di-staffing ke sebuah perikatan (SSOT: SCHEDULE.alloc). */
export function rosterForEngagement(
  schedule: { member: string; role: string; alloc?: { eng?: string }[] }[],
  engId: string,
): MemberRef[] {
  const seen = new Set<string>();
  const out: MemberRef[] = [];
  for (const s of schedule) {
    if (!s.alloc || !s.alloc.some((a) => a.eng === engId)) continue;
    if (!seen.has(s.member)) { seen.add(s.member); out.push({ member: s.member, role: s.role }); }
  }
  return out;
}

export function engagementIndependence(roster: MemberRef[], decls: EngagementDeclarations): EngagementIndependence {
  const rows: MemberIndepRow[] = roster.map((m) => {
    const d = decls[m.member] || EMPTY_DECL;
    const s = memberIndepStatus(d);
    return {
      member: m.member, role: m.role, signed: !!d.signed,
      threats: s.threats, hasThreat: s.threats.length > 0, safeguarded: s.safeguarded,
      status: s.status, blocked: s.blocked, signedAt: d.signedAt,
    };
  });
  // urut: pemblokir/ancaman dulu (paling perlu perhatian).
  const rank: Record<MemberIndepStatus, number> = { undeclared: 0, threat: 1, safeguarded: 2, clean: 3 };
  rows.sort((a, b) => rank[a.status] - rank[b.status]);
  const blockers = rows.filter((r) => r.blocked).length;
  return {
    rows,
    total: rows.length,
    signed: rows.filter((r) => r.signed).length,
    withThreat: rows.filter((r) => r.hasThreat).length,
    blockers,
    // roster kosong → tak ada pemblokir → bersih (jangan memblok perikatan tanpa data staffing).
    clear: blockers === 0,
  };
}

/* Seed demo deterministik: semua deklarasi ditandatangani & bersih, KECUALI satu Senior
   pertama diberi ancaman kedekatan yang SUDAH ter-safeguard (tetap tak memblok) — agar
   matriks memperlihatkan variasi realistik tanpa memblok penerbitan opini. */
export function seedDeclarations(roster: MemberRef[]): EngagementDeclarations {
  const out: EngagementDeclarations = {};
  let taggedSenior = false;
  for (const m of roster) {
    if (!taggedSenior && m.role === 'Senior') {
      out[m.member] = {
        threats: { familiarity: true },
        safeguards: 'Rotasi personel siklus depan + penelaahan tambahan atas area sensitif (SA 220).',
        note: 'Asosiasi profesional lama dengan tim klien.',
        signed: true, signedAt: '2026-01-15',
      };
      taggedSenior = true;
    } else {
      out[m.member] = { threats: {}, safeguards: '', note: '', signed: true, signedAt: '2026-01-15' };
    }
  }
  return out;
}
