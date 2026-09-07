/* ============================================================
   Asseris — `wip.adj`: WRITE-DOWN WIP MANUAL YANG TERATRIBUSI (W2)
   ------------------------------------------------------------
   Dokumen `wip.adj` dulu berbentuk `{ <engagementId>: <jumlah> }`. Bentuk itu
   menyimpan BERAPA, tetapi tidak SIAPA dan tidak KAPAN — padahal ia adalah
   satu-satunya jejak sebuah tindakan yang menurunkan angka keuangan firma.

   Akibatnya berantai. `data_platform.buildApprovals` harus mengisi `from`
   sebuah item persetujuan dengan seseorang, dan satu-satunya nama yang tersedia
   adalah MANAJER PERIKATAN. Gerbang pemisahan tugas di `stepAuthority`
   membandingkan `user.name === it.from`, sehingga ia:
     · memblokir manajer perikatan — yang mungkin tak melakukan apa pun; dan
     · MEMBIARKAN pelaku sebenarnya menyetujui write-down-nya sendiri.
   Peran 'Finance Firma' memegang FIRMFIN_EDIT (boleh menulis write-down) dan
   peran Partner memegang FIRMFIN_EDIT sekaligus kewenangan menyetujui — jadi
   celahnya bukan teoretis.

   Modul ini MURNI (tanpa React/`window`/DOM) supaya satu bentuk dokumen dipakai
   penulis (modul WIP), pembaca angka (`FIRMFIN.wip` lewat `useFirmWip`), dan
   penurun antrean (`buildApprovals`) — bukan tiga tafsiran yang bisa menyimpang.

   BACA-LEWAT DATA LAMA. Entri bentuk lama (angka telanjang) TIDAK dibuang dan
   TIDAK dikarang atribusinya: ia dibaca sebagai entri ber-`attributed: false`
   dengan `by`/`at` kosong. Mengarang pelakunya berarti menerbitkan bukti audit
   palsu — persis cacat yang modul ini ada untuk menutupnya. Konsekuensinya
   ditegakkan di hilir: item persetujuan tak beratribusi tidak dapat disetujui
   (SoD tak dapat dibuktikan bila pelakunya tak diketahui), dan jalan keluarnya
   adalah Reset lalu ulangi write-down — dua tindakan yang keduanya teratribusi.
   ============================================================ */

/** Satu write-down manual: jumlah + identitas pelaku + waktu. */
export interface WipAdjEntry {
  /** Jumlah kumulatif penurunan nilai atas perikatan ini (Rp, ≥ 0). */
  amount: number;
  /** Nama pelaku dari SESI (bukan literal); '' pada entri warisan. */
  by: string;
  /** Peran pelaku saat tindakan diambil; '' pada entri warisan. */
  byRole: string;
  /** ISO 8601 waktu tindakan; '' pada entri warisan. */
  at: string;
}

/** Bentuk dokumen `wip.adj` sebagaimana ia bisa muncul di persist: entri
 *  teratribusi (baru) ATAU angka telanjang (warisan). */
export type WipAdjDoc = Record<string, WipAdjEntry | number | null | undefined>;

/** Entri yang sudah dinormalkan, berikut id perikatannya. */
export interface WipAdjRecord extends WipAdjEntry {
  engId: string;
  /** `false` = entri warisan; pelakunya TIDAK diketahui (bukan: tidak ada). */
  attributed: boolean;
}

/** Identitas pelaku dari sesi. */
export interface WipAdjActor { name?: string; role?: string }

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Satu nilai dokumen → entri ternormalkan, atau null bila bukan write-down. */
export function wipAdjRecord(engId: string, v: WipAdjEntry | number | null | undefined): WipAdjRecord | null {
  if (v == null) return null;
  if (typeof v === 'number') {
    const amount = Math.max(0, num(v));
    return amount > 0 ? { engId, amount, by: '', byRole: '', at: '', attributed: false } : null;
  }
  if (typeof v !== 'object') return null;
  const amount = Math.max(0, num(v.amount));
  if (amount <= 0) return null;
  const by = String(v.by ?? '').trim();
  const at = String(v.at ?? '').trim();
  return {
    engId, amount, by, byRole: String(v.byRole ?? '').trim(), at,
    /* Teratribusi HANYA bila KEDUANYA ada. Nama tanpa waktu (atau sebaliknya)
       tak cukup untuk menjadi jejak: yang satu tak dapat diperiksa tanpa yang
       lain. Dibiarkan longgar, `at: ''` akan diam-diam menjadi `due` kosong. */
    attributed: by !== '' && at !== '',
  };
}

/** Seluruh entri dokumen, ternormalkan, urut id agar hasilnya deterministik. */
export function wipAdjRecords(doc: WipAdjDoc | null | undefined): WipAdjRecord[] {
  if (!doc || typeof doc !== 'object') return [];
  const out: WipAdjRecord[] = [];
  for (const engId of Object.keys(doc).sort()) {
    const rec = wipAdjRecord(engId, doc[engId]);
    if (rec) out.push(rec);
  }
  return out;
}

/**
 * Proyeksi { engagementId: jumlah } — bentuk yang dikonsumsi `FIRMFIN.wip`.
 *
 * Kontrak `FIRMFIN.wip(ctx, provFactor, liveByEng, adjByEng)` SENGAJA tidak
 * diubah: ia dipakai Dashboard, cockpit Beranda, Firm Finance & ekspor. Yang
 * berubah hanyalah siapa yang menyiapkan argumennya.
 */
export function wipAdjAmounts(doc: WipAdjDoc | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of wipAdjRecords(doc)) out[r.engId] = r.amount;
  return out;
}

/**
 * Tambahkan `delta` pada write-down perikatan `engId`, TERATRIBUSI ke `actor`.
 *
 * Selalu mengembalikan dokumen baru (tak memutasi masukan) supaya aman dipakai
 * sebagai pembaru fungsional `useAmsPersist`. Entri warisan yang ditimpa di
 * sini menjadi teratribusi — jumlah lamanya tetap dihitung, pelakunya menjadi
 * orang yang menambahkan, dan itulah pernyataan yang jujur: hanya penambahan
 * terakhir yang benar-benar diketahui pelakunya.
 */
export function applyWipAdj(
  doc: WipAdjDoc | null | undefined,
  engId: string,
  delta: number,
  actor: WipAdjActor,
  at: string,
): WipAdjDoc {
  const add = Math.max(0, num(delta));
  const prev = wipAdjRecord(engId, (doc || {})[engId]);
  const next: WipAdjEntry = {
    amount: (prev ? prev.amount : 0) + add,
    by: String((actor && actor.name) || '').trim(),
    byRole: String((actor && actor.role) || '').trim(),
    at: String(at || '').trim(),
  };
  return { ...(doc || {}), [engId]: next };
}

/** Cabut seluruh write-down manual atas `engId`. */
export function clearWipAdj(doc: WipAdjDoc | null | undefined, engId: string): WipAdjDoc {
  const next: WipAdjDoc = { ...(doc || {}) };
  delete next[engId];
  return next;
}
