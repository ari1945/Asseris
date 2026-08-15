import React from 'react';
import { useAmsPersist } from './contexts';
import { AMS } from './data';
import { currentBalances, mergeSeedJournals, statements } from './firm_ledger';
import type { CoaAccount, GlJournal } from './firm_ledger';

/* ============================================================
   Asseris — useFirmCoa: SATU PINTU saldo Buku Besar firma.

   `firm_ledger.ts` (Program E) sudah menurunkan saldo tiap akun dari jurnal
   TERPOSTING dan sudah benar — tetapi sampai 2026-08-15 ia hanya dipakai
   `view_firmgl`. Seluruh sisa aplikasi lewat `FIRMFIN` membaca
   `coaOf(ctx) = ctx.coa || AMS.FIRM_COA`, dan TIDAK ADA satu pun pemanggil yang
   mengirim `ctx.coa`. Akibatnya tujuh fungsi (pl · balanceSheet · arAging · ap ·
   wip · cash · budget, dan lewat mereka kpis/reconciliations/provenance) membaca
   seed statis.

   Terukur: memposting `JV-0307` (akrual PPh 21 Rp 210 jt) membuat buku besar
   menyatakan laba bersih 2.800 → 2.590 jt sementara Firm Finance tetap 2.800 jt.
   Satu klik "Posting" ⇒ dua angka laba untuk satu firma.

   Hook ini menutup celah itu: konsumen memasukkan `coa` yang dikembalikan di sini
   ke dalam ctx FIRMFIN, sehingga memposting/membatalkan jurnal menggeser SELURUH
   aplikasi — bukan satu modul.

   NOL-DELTA pada seed bersih, secara aljabar:
     opening = seed − efek(seedGl)   dan   current = opening + efek(gl)
   sehingga saat `gl == seedGl` (keadaan boot), `current == seed`. Tidak ada satu
   angka pun yang bergerak sampai seseorang benar-benar memposting.

   SATU PINTU, bukan dipanggil ulang di banyak komponen: `useServerState` tak punya
   broadcast lintas-instance (gotcha arc #237), jadi dua salinan state yang hidup
   bersamaan bisa menyimpang. Semua konsumen memakai hook ini.
   ============================================================ */

export interface FirmCoaResult {
  /** COA dengan `bal` = saldo TURUNAN jurnal terposting (bukan seed). */
  coa: CoaAccount[];
  /** Jurnal berjalan (terpersist `firmgl`). */
  gl: GlJournal[];
  /** Jurnal seed — jangkar saldo awal. */
  seedGl: GlJournal[];
  /** Jurnal yang belum diposting; keadaan NORMAL, ditampilkan sebagai informasi. */
  pending: GlJournal[];
  /** Neraca seimbang menurut buku besar (aset = liabilitas + ekuitas). */
  balanced: boolean;
}

export function useFirmCoa(): FirmCoaResult {
  const seedCoa = AMS.FIRM_COA as unknown as CoaAccount[];
  const seedGl = AMS.FIRM_GL as unknown as GlJournal[];
  /* Kunci `firmgl` sudah dipakai `view_firmgl`; dibaca di sini agar posting di modul
     itu langsung tercermin di seluruh konsumen FIRMFIN. */
  const [glStored] = useAmsPersist('firmgl', () => seedGl) as [GlJournal[], unknown];
  /* Cache localStorage bisa tertinggal di belakang seed — `mergeSeedJournals` menutup
     celah itu. WAJIB sama dengan yang dipakai `view_firmgl`, kalau tidak kedua layar
     menghitung dari daftar jurnal yang berbeda. */
  /* Anotasi eksplisit: `React.useMemo` di repo ini untyped → tanpa ini `gl` jadi `any`
     dan `.filter` di bawah kehilangan tipe parameternya. */
  const gl: GlJournal[] = React.useMemo(() => mergeSeedJournals(glStored, seedGl), [glStored, seedGl]);

  return React.useMemo(() => {
    const bal = currentBalances(seedCoa, seedGl, gl);
    const st = statements(seedCoa, seedGl, gl);
    return {
      coa: seedCoa.map((a) => ({ ...a, bal: bal[a.code] })),
      gl,
      seedGl,
      pending: gl.filter((j) => !j.posted),
      balanced: st.balanced,
    };
  }, [seedCoa, seedGl, gl]);
}
