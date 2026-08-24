/* ============================================================
   Asseris — derivasi struktur organisasi (murni, tanpa render)

   Modul `orgchart` menggambar struktur firma dari `AMS.ORG` + `AMS.DEPT_HEAD`.
   Sebelum berkas ini ada, seluruh derivasinya hidup di dalam komponen React
   sehingga tak satu pun dapat diuji di node — dan tiga cacat bersembunyi di sana:

     · daftar divisi diturunkan dari `Object.keys(DEPT_HEAD)` (4 kepala divisi),
       bukan dari nilai `dept` yang benar-benar ada di `ORG` (5 divisi). Divisi
       'Kepemimpinan Firma' tidak punya kepala, sehingga Managing Partner
       menghilang dari tab "Divisi" TANPA SUARA;
     · `staff.filter(s => !(ORG[s.id]||{}).reports)` menyamakan "puncak organisasi
       yang sah" dengan "tak punya entri ORG sama sekali";
     · `spanAll` berekursi tanpa penjaga simpul terkunjungi — satu lingkaran
       pelaporan di `ORG` menggantungkan tab "Rentang Kendali".

   ATURAN BERKAS INI: tidak ada penghilangan senyap. Setiap orang di roster
   muncul di salah satu keranjang, dan keranjang "bermasalah" (tanpa divisi ·
   tanpa atasan · tak terjangkau) dikembalikan agar tampilan dapat
   MENGATAKANNYA, bukan menyembunyikannya.
   ============================================================ */

export type OrgLine = { reports?: string | null; dept?: string | null };
export type OrgMap = Record<string, OrgLine | undefined>;
export type HasId = { id: string };

/** Alasan seseorang tidak berada di bawah siapa pun. */
export type AlasanTanpaAtasan =
  | 'tanpa-entri'          // tidak ada baris di ORG sama sekali (mis. karyawan baru)
  | 'atasan-tak-dikenal';  // `reports` menunjuk id yang tak ada di roster

export type OrgOrphan<P> = { person: P; alasan: AlasanTanpaAtasan; reports: string | null };

export type OrgDept<P> = {
  dept: string;
  /** id kepala divisi menurut DEPT_HEAD; null bila divisi ini tak punya kepala. */
  headId: string | null;
  /** kepala yang ditunjuk DEPT_HEAD tapi tak ada di roster (data rusak). */
  headHilang: boolean;
  members: P[];
};

export type OrgNode<P> = { person: P; children: OrgNode<P>[] };

export type OrgSpan = { direct: number; total: number };

const line = (org: OrgMap, id: string): OrgLine | undefined => org[id];
const deptOf = (org: OrgMap, id: string): string => String(line(org, id)?.dept || '').trim();
const reportsOf = (org: OrgMap, id: string): string => String(line(org, id)?.reports || '').trim();

/* ------------------------------------------------------------------
   Divisi
   ------------------------------------------------------------------ */

/**
 * Semesta divisi = gabungan nilai `dept` yang BENAR-BENAR dipakai di ORG dengan
 * kunci DEPT_HEAD. Diturunkan dari struktur, bukan dari daftar kepala divisi:
 * divisi tanpa kepala tetap ada, dan kepala tanpa anggota juga tetap ada.
 */
export function orgDeptNames(org: OrgMap, deptHead: Record<string, string> = {}): string[] {
  const set = new Set<string>();
  for (const id of Object.keys(org)) { const d = deptOf(org, id); if (d) set.add(d); }
  for (const d of Object.keys(deptHead)) { const t = d.trim(); if (t) set.add(t); }
  return [...set].sort((a, b) => a.localeCompare(b, 'id-ID'));
}

/** Kepala divisi yang ditunjuk DEPT_HEAD tapi tidak ada di roster. */
export function orgDeptHeadsHilang<P extends HasId>(
  deptHead: Record<string, string>, staff: readonly P[],
): { dept: string; headId: string }[] {
  const ids = new Set(staff.map((s) => s.id));
  return Object.entries(deptHead)
    .filter(([, headId]) => !!headId && !ids.has(headId))
    .map(([dept, headId]) => ({ dept, headId }));
}

/**
 * Divisi + anggotanya. `tanpaDivisi` memuat orang yang PUNYA entri ORG tetapi
 * tanpa nilai `dept` — mereka tidak boleh lenyap dari tampilan.
 */
export function orgDepartments<P extends HasId>(
  staff: readonly P[], org: OrgMap, deptHead: Record<string, string> = {},
): { departments: OrgDept<P>[]; tanpaDivisi: P[] } {
  const ids = new Set(staff.map((s) => s.id));
  const departments = orgDeptNames(org, deptHead).map((dept) => {
    const headId = deptHead[dept] || null;
    return {
      dept,
      headId,
      headHilang: !!headId && !ids.has(headId),
      members: staff.filter((s) => deptOf(org, s.id) === dept),
    };
  });
  const tanpaDivisi = staff.filter((s) => !!line(org, s.id) && !deptOf(org, s.id));
  return { departments, tanpaDivisi };
}

/* ------------------------------------------------------------------
   Akar pohon
   ------------------------------------------------------------------ */

/**
 * Memisahkan dua keadaan yang dulu disamakan:
 *   `puncak`      — ada baris ORG, `reports` sengaja kosong ⇒ puncak yang SAH.
 *   `tanpaAtasan` — tak ada baris ORG, atau `reports` menunjuk orang yang tak
 *                   ada di roster ⇒ garis pelaporan BELUM DIBERESKAN.
 */
export function orgRoots<P extends HasId>(
  staff: readonly P[], org: OrgMap,
): { puncak: P[]; tanpaAtasan: OrgOrphan<P>[] } {
  const ids = new Set(staff.map((s) => s.id));
  const puncak: P[] = [];
  const tanpaAtasan: OrgOrphan<P>[] = [];
  for (const s of staff) {
    const l = line(org, s.id);
    const rep = reportsOf(org, s.id);
    if (!l) { tanpaAtasan.push({ person: s, alasan: 'tanpa-entri', reports: null }); continue; }
    if (!rep) { puncak.push(s); continue; }
    if (!ids.has(rep)) tanpaAtasan.push({ person: s, alasan: 'atasan-tak-dikenal', reports: rep });
  }
  return { puncak, tanpaAtasan };
}

/* ------------------------------------------------------------------
   Pohon, rentang kendali, siklus
   ------------------------------------------------------------------ */

function childrenIndex<P extends HasId>(staff: readonly P[], org: OrgMap): Map<string, P[]> {
  const idx = new Map<string, P[]>();
  for (const s of staff) {
    const rep = reportsOf(org, s.id);
    if (!rep) continue;
    const bucket = idx.get(rep);
    if (bucket) bucket.push(s); else idx.set(rep, [s]);
  }
  return idx;
}

export function orgChildrenOf<P extends HasId>(staff: readonly P[], org: OrgMap, id: string): P[] {
  return childrenIndex(staff, org).get(id) || [];
}

/**
 * Pohon siap-render. Satu himpunan `seen` dipakai lintas akar sehingga data
 * bersiklus BERAKHIR (simpul yang sudah digambar tidak digambar lagi) alih-alih
 * membuat komponen berekursi tanpa henti.
 */
export function orgTree<P extends HasId>(
  staff: readonly P[], org: OrgMap, roots: readonly P[],
): OrgNode<P>[] {
  const idx = childrenIndex(staff, org);
  const seen = new Set<string>();
  const build = (p: P): OrgNode<P> => {
    const kids = (idx.get(p.id) || []).filter((c) => !seen.has(c.id));
    kids.forEach((c) => seen.add(c.id));
    return { person: p, children: kids.map(build) };
  };
  const out: OrgNode<P>[] = [];
  for (const r of roots) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(build(r));
  }
  return out;
}

/** Orang yang tidak muncul di pohon sama sekali (mis. terjebak di dalam siklus). */
export function orgUnreachable<P extends HasId>(staff: readonly P[], tree: readonly OrgNode<P>[]): P[] {
  const seen = new Set<string>();
  const walk = (n: OrgNode<P>): void => { seen.add(n.person.id); n.children.forEach(walk); };
  tree.forEach(walk);
  return staff.filter((s) => !seen.has(s.id));
}

/**
 * Rentang kendali per orang. Iteratif + himpunan terkunjungi: pada data
 * bersiklus fungsi ini BERAKHIR (setiap orang dihitung sekali), tidak menggantung.
 */
export function orgSpan<P extends HasId>(staff: readonly P[], org: OrgMap): Map<string, OrgSpan> {
  const idx = childrenIndex(staff, org);
  const out = new Map<string, OrgSpan>();
  for (const s of staff) {
    const seen = new Set<string>([s.id]);
    const stack: string[] = [s.id];
    let total = 0;
    while (stack.length) {
      const x = stack.pop() as string;
      for (const c of idx.get(x) || []) {
        if (seen.has(c.id)) continue;
        seen.add(c.id); total++; stack.push(c.id);
      }
    }
    out.set(s.id, { direct: (idx.get(s.id) || []).length, total });
  }
  return out;
}

/**
 * Lingkaran pelaporan pada ORG (A→B→A). Setiap siklus dikembalikan sekali,
 * dinormalkan agar mulai dari id terkecil supaya perbandingan uji deterministik.
 */
export function orgCycles(org: OrgMap): string[][] {
  const state = new Map<string, 1 | 2>();   // 1 sedang ditelusuri · 2 selesai
  const out: string[][] = [];
  const lihat = new Set<string>();
  for (const start of Object.keys(org)) {
    if (state.get(start)) continue;
    const path: string[] = [];
    let cur: string | undefined = start;
    while (cur && state.get(cur) !== 2) {
      if (state.get(cur) === 1) {
        const cycle = path.slice(path.indexOf(cur));
        const kecil = [...cycle].sort()[0];
        const pivot = cycle.indexOf(kecil);
        const norm = [...cycle.slice(pivot), ...cycle.slice(0, pivot)];
        const key = norm.join('>');
        if (!lihat.has(key)) { lihat.add(key); out.push(norm); }
        break;
      }
      state.set(cur, 1);
      path.push(cur);
      const rep = reportsOf(org, cur);
      cur = rep && org[rep] ? rep : undefined;
    }
    path.forEach((p) => state.set(p, 2));
  }
  return out;
}
