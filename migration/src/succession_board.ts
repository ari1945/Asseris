/* ============================================================
   Asseris — Suksesi & Karier: LAPISAN TAMPILAN (murni, teruji di node)
   ------------------------------------------------------------
   `canon_succession` sudah melakukan hal yang paling sulit: menurunkan
   kesiapan dari sertifikasi × kompetensi × progres IDP, lalu menandai
   `contradicts` ketika klaim yang tertulis di data tidak sama dengan
   turunannya. Yang hilang bukan perhitungannya, melainkan penyampaiannya —
   view menghitung jumlah kontradiksi lalu membuang variabelnya.

   Berkas ini adalah selector antara data dan layar. Dua tugasnya:

     1. MENGUMPULKAN kontradiksi menjadi daftar yang dapat dirender apa
        adanya — klaim, turunan, dan pemblokir ter-enumerasi — sehingga
        peringatan tidak lagi menyusut menjadi satu glyph.

     2. MENOLAK MENGARANG ORANG. `AMS.byId` punya fallback yang mengembalikan
        orang palsu berjenjang 'Junior' untuk id apa pun (data_people.ts).
        Di modul suksesi fallback itu paling berbahaya: perencanaan suksesi
        ADALAH tentang orang yang mungkin pergi, dan grade/cert palsu itu
        masuk ke mesin kesiapan — melahirkan skor untuk orang yang tidak ada,
        yang ikut terbawa ke ekspor tersegel. Di sini rujukan yang tidak dapat
        diselesaikan tetap berupa rujukan: `ada:false`, kesiapan `null`, dan
        `readinessFor` tidak pernah dipanggil untuknya.

   `byId` sendiri TIDAK diubah — ia dipakai lintas modul.

   Fungsi MURNI. Diuji di succession_board.test.ts.
   ============================================================ */
import { successionRoleState } from './canon_succession';
import type { Readiness, ReadinessBlocker } from './canon_succession';

export interface RosterPerson {
  id: string;
  name: string;
  role: string;
  grade: string;
  cert?: string;
}

export interface SuccessorInput {
  id: string;
  /** Klaim LAMA (literal di data). Dipertahankan hanya untuk dibandingkan. */
  readiness?: string;
  gaps?: string;
}

export interface RoleInput {
  id: string;
  role: string;
  incumbent: string;
  critical?: string;
  riskOfLoss?: string;
  vacancyImpact?: string;
  successors: readonly SuccessorInput[];
}

/** Rujukan orang. `ada:false` = id tidak ada di roster — jangan dikarang. */
export interface PersonRef {
  id: string;
  ada: boolean;
  name: string;
  role: string;
  grade: string;
  cert: string;
}

export interface BoardSuccessor {
  ref: PersonRef;
  claimed: string | null;
  /** `null` bila rujukan tak dapat diselesaikan — kesiapan TIDAK dihitung. */
  readiness: Readiness | null;
  contradicts: boolean;
  gaps: string;
}

export interface BoardRole {
  id: string;
  role: string;
  critical: string;
  riskOfLoss: string;
  vacancyImpact: string;
  incumbent: PersonRef;
  successors: BoardSuccessor[];
  readyNow: number;
  atRisk: boolean;
}

/** Satu klaim kesiapan yang dibantah bukti — lengkap dengan alasannya. */
export interface Contradiction {
  roleId: string;
  role: string;
  candidateId: string;
  candidateName: string;
  claimed: string;
  derived: string;
  blockers: ReadinessBlocker[];
}

export type UnresolvedKind = 'pemangku' | 'kandidat';

export interface UnresolvedRef {
  kind: UnresolvedKind;
  id: string;
  roleId: string;
  role: string;
}

export interface SuccessionKpi {
  roles: number;
  /** Peran dengan ≥1 penerus yang kesiapan TURUNANNYA 'Siap sekarang'. */
  withReady: number;
  /** Peran dengan risiko kehilangan pemangku di atas 'Rendah'. */
  riskOfLoss: number;
  /** Peran tanpa satu pun penerus yang dapat diselesaikan ke roster. */
  withoutSuccessor: number;
  /** Klaim kesiapan yang dibantah bukti. Sinyal utama modul ini. */
  contradicting: number;
  unresolved: number;
}

export interface SuccessionBoard {
  roles: BoardRole[];
  kpi: SuccessionKpi;
  contradictions: Contradiction[];
  unresolved: UnresolvedRef[];
}

/** Label yang aman dirender: nama bila orangnya ada, pernyataan bila tidak. */
export function refLabel(ref: PersonRef): string {
  return ref.ada ? ref.name : `${ref.id} — tidak ada di roster`;
}

/** Penyelesai rujukan terhadap satu roster. Tanpa fallback yang mengarang. */
export function refResolver(staff: readonly RosterPerson[]): (id: string) => PersonRef {
  const index = new Map<string, RosterPerson>();
  for (const p of staff) index.set(p.id, p);
  return (id: string): PersonRef => {
    const p = index.get(id);
    return p
      ? { id, ada: true, name: p.name, role: p.role, grade: p.grade, cert: p.cert || '' }
      : { id, ada: false, name: '', role: '', grade: '', cert: '' };
  };
}

export function successionBoard(args: {
  roles: readonly RoleInput[];
  staff: readonly RosterPerson[];
  readinessFor: (empId: string) => Readiness;
}): SuccessionBoard {
  const resolve = refResolver(args.staff);
  const roles: BoardRole[] = [];
  const contradictions: Contradiction[] = [];
  const unresolved: UnresolvedRef[] = [];

  for (const r of args.roles) {
    const incumbent = resolve(r.incumbent);
    if (!incumbent.ada) unresolved.push({ kind: 'pemangku', id: r.incumbent, roleId: r.id, role: r.role });

    const refs = r.successors.map((s) => ({ s, ref: resolve(s.id) }));
    for (const x of refs) {
      if (!x.ref.ada) unresolved.push({ kind: 'kandidat', id: x.s.id, roleId: r.id, role: r.role });
    }

    /* Kanon dipanggil HANYA untuk orang yang benar-benar ada di roster. */
    const dikenal = refs.filter((x) => x.ref.ada);
    const st = successionRoleState({
      role: r.role,
      incumbent: r.incumbent,
      critical: r.critical,
      successors: dikenal.map((x) => ({ id: x.s.id, claimed: x.s.readiness, gaps: x.s.gaps })),
      readinessFor: args.readinessFor,
    });

    const successors: BoardSuccessor[] = [];
    let k = 0;
    for (const x of refs) {
      if (!x.ref.ada) {
        successors.push({ ref: x.ref, claimed: x.s.readiness || null, readiness: null, contradicts: false, gaps: x.s.gaps || '' });
        continue;
      }
      /* `successionRoleState` memetakan `dikenal` dalam urutan yang sama —
         zip lewat indeks, bukan lewat id (id kembar tak akan saling menelan). */
      const cs = st.successors[k++];
      successors.push({ ref: x.ref, claimed: cs.claimed, readiness: cs.readiness, contradicts: cs.contradicts, gaps: x.s.gaps || '' });
      if (cs.contradicts && cs.claimed) {
        contradictions.push({
          roleId: r.id, role: r.role,
          candidateId: x.ref.id, candidateName: x.ref.name,
          claimed: cs.claimed, derived: cs.readiness.label,
          blockers: cs.readiness.blockers,
        });
      }
    }

    roles.push({
      id: r.id, role: r.role,
      critical: r.critical || '', riskOfLoss: r.riskOfLoss || '', vacancyImpact: r.vacancyImpact || '',
      incumbent, successors, readyNow: st.readyNow, atRisk: st.atRisk,
    });
  }

  return {
    roles,
    contradictions,
    unresolved,
    kpi: {
      roles: roles.length,
      withReady: roles.filter((r) => r.readyNow > 0).length,
      riskOfLoss: roles.filter((r) => r.riskOfLoss !== 'Rendah').length,
      withoutSuccessor: roles.filter((r) => r.successors.every((s) => !s.ref.ada)).length,
      contradicting: contradictions.length,
      unresolved: unresolved.length,
    },
  };
}
