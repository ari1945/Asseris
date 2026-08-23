/* ============================================================
   Asseris — KEPUTUSAN KANDIDAT PENCATATAN GANDA ASET TETAP (MURNI)
   prompt 33-fixedassets FA2 · usulan-FA2 disetujui (opsi yang direkomendasikan).
   ------------------------------------------------------------
   Panel "Kandidat Pencatatan Ganda" menyatakan sendiri "perlu keputusan firma",
   tetapi sampai sekarang tak ada cara merekamnya: nol persistensi, nol pelaku,
   nol tanggal. Tiap kali layar dibuka, pasangan yang sama muncul lagi seolah
   belum pernah dilihat siapa pun — Rp 2,5 miliar harga perolehan berdiri di
   daftar "mungkin dicatat dua kali" tanpa tempat untuk mengatakan "sudah kami
   periksa".

   TIGA KEPUTUSAN YANG MEMBENTUK BERKAS INI:

   1 · LINGKUP = FIRMA. Kuncinya `assetDupDecisions.v1`, scope `firm` (default
       `useAmsPersist` untuk kunci yang tak terdaftar di `AMS_PERSIST_SCOPE`).
       Register aset tetap adalah data firma; menyimpan keputusannya di bawah
       perikatan yang kebetulan aktif berarti keputusan yang sama harus diambil
       ulang tiap perikatan. Ini yang membedakannya dari `diagnostics.v1`
       (engagement) yang polanya ditiru.

   2 · KEWENANGAN = `FIRMFIN_EDIT`, DIDAFTARKAN EKSPLISIT di `capForWrite`
       (rbac.ts). Tanpa cabang eksplisit, kunci firm-scope jatuh ke `FIRM_ADMIN`
       — Partner saja — sehingga peran 'Finance Firma' yang justru memegang
       register ini akan menekan tombol lalu tulisannya ditolak server.

   3 · YANG DIPUTUSKAN TETAP TAMPIL (opsi B). Register aset tetap adalah dokumen
       yang diaudit: keputusan yang tak terlihat lagi tak dapat ditinjau, dan
       tahun depan seseorang akan menghitung ulang kandidat yang sama tanpa tahu
       sudah ada yang memeriksanya.

   YANG SENGAJA TIDAK DILAKUKAN — MENGUBAH REGISTER. Verdict `duplikat` MENYATAKAN
   bahwa firma mengakui satu aset fisik tercatat dua kali; ia TIDAK menghentikan
   pengakuan baris mana pun. Menghentikan pengakuan menggeser `totCost`/`totNbv`,
   roll-forward, dan saldo yang dibandingkan dengan kontrol GL `1-400` — itu PR-2,
   dengan risiko §8 R-1 yang sudah terdokumentasi. Sampai itu dikerjakan, keputusan
   `duplikat` adalah pengungkapan: "register memuat Rp X yang kami sendiri nyatakan
   tercatat dua kali."

   Berkas ini MURNI: tak ada React, tak ada `window`, tak ada jam mesin. Stempel
   `when` SELALU datang dari klok SSOT (`AMS.TODAY`) di pemanggilnya — `Date.now()`
   dan `new Date()` tanpa argumen digerbangi repo (clock_ssot.test.ts).
   ============================================================ */
import type { DupCandidate } from './data_fixedassets';

export type DupVerdict = 'bukan' | 'duplikat';

export const DUP_VERDICT_LABEL: Record<DupVerdict, string> = {
  bukan: 'Bukan duplikat',
  duplikat: 'Duplikat dikonfirmasi',
};

/**
 * Satu keputusan firma atas satu pasangan.
 *
 * Ia MEMOTRET pasangannya (nama, kelas, selisih hari, nilai gabungan). Alasannya
 * bukan kenyamanan: seed register dapat berubah, dan `duplicateCandidates()` akan
 * berhenti memunculkan pasangan lama. Keputusan yang tak dapat ditampilkan tanpa
 * menghitung ulang pasangannya bukan catatan — ia catatan yang hilang diam-diam
 * ketika satu tanggal perolehan dikoreksi.
 */
export interface DupDecision {
  verdict: DupVerdict;
  who: string;
  role: string;
  /** Tanggal dari klok SSOT (`AMS.TODAY`), ISO. */
  when: string;
  reason: string;
  /* --- potret pasangan pada saat diputuskan --- */
  cat: string;
  finId: string;
  finName: string;
  gaId: string;
  gaName: string;
  daysApart: number;
  combinedCost: number;
}

export type DupDecisionMap = Record<string, DupDecision>;

/** Sisi Keuangan & sisi GA dari sebuah pasangan, dalam urutan yang tetap. */
function sisi(d: DupCandidate): { fin: DupCandidate['a']; ga: DupCandidate['b'] } {
  if (d.a.src === 'finance' && d.b.src !== 'finance') return { fin: d.a, ga: d.b };
  if (d.b.src === 'finance' && d.a.src !== 'finance') return { fin: d.b, ga: d.a };
  /* Tak mungkin lewat `duplicateCandidates` (ia menolak pasangan se-register),
     tetapi kunci HARUS tetap total & stabil bila mesin itu suatu hari berubah. */
  return d.a.id <= d.b.id ? { fin: d.a, ga: d.b } : { fin: d.b, ga: d.a };
}

/** Kunci stabil sebuah pasangan — tidak bergantung urutan `a`/`b`. */
export function dupPairKey(d: DupCandidate): string {
  const { fin, ga } = sisi(d);
  return `${fin.id}|${ga.id}`;
}

export interface DupDecisionInput {
  verdict: DupVerdict;
  who: string;
  role: string;
  when: string;
  reason: string;
}

/**
 * Bentuk catatan keputusan. MELEMPAR bila pelaku, alasan, atau tanggalnya kosong.
 *
 * Ketiganya bukan kolom opsional: keputusan tanpa penanggung jawab tak dapat
 * dipertanggungjawabkan, pertimbangan yang tak ditulis tak dapat ditinjau, dan
 * stempel yang kosong membuat urutan kejadian tak dapat direkonstruksi.
 */
export function dupDecisionRecord(d: DupCandidate, input: DupDecisionInput): DupDecision {
  const who = String(input.who || '').trim();
  const reason = String(input.reason || '').trim();
  const when = String(input.when || '').trim();
  if (!who) throw new Error('dupDecisionRecord: pelaku kosong — keputusan tanpa penanggung jawab bukan catatan.');
  if (!reason) throw new Error('dupDecisionRecord: alasan kosong — pertimbangan yang tak ditulis tak dapat ditinjau.');
  if (!when) throw new Error('dupDecisionRecord: tanggal kosong — stempel diambil dari klok SSOT (AMS.TODAY).');
  const { fin, ga } = sisi(d);
  return {
    verdict: input.verdict,
    who, role: String(input.role || '').trim(), when, reason,
    cat: d.cat,
    finId: fin.id, finName: fin.name,
    gaId: ga.id, gaName: ga.name,
    daysApart: d.daysApart,
    combinedCost: d.combinedCost,
  };
}

export interface DupBoardRow {
  key: string;
  cat: string;
  finId: string; finName: string;
  gaId: string; gaName: string;
  daysApart: number;
  combinedCost: number;
  decision: DupDecision | null;
  /** `false` = keputusan tersimpan, tetapi mesin TAK LAGI memunculkan pasangannya. */
  detected: boolean;
}

export interface DupBoard {
  rows: DupBoardRow[];
  /** Terdeteksi & belum diputuskan. */
  open: number;
  /** Punya keputusan — termasuk yang sudah usang. */
  decided: number;
  /** Terdeteksi DAN diputuskan `duplikat` — inilah yang masih ada di register. */
  confirmed: number;
  confirmedCost: number;
  /** Keputusan yang pasangannya tak lagi dihitung mesin. */
  stale: number;
}

/**
 * Gabungkan kandidat yang dihitung mesin dengan keputusan yang tersimpan.
 *
 * Yang terdeteksi tampil lebih dulu (urutan mesin: nilai gabungan menurun), lalu
 * keputusan usang. `confirmed`/`confirmedCost` SENGAJA hanya menghitung yang masih
 * terdeteksi: pasangan yang tak lagi dihitung tidak lagi menggambarkan register,
 * dan menjumlahkannya akan melaporkan kelebihan pencatatan yang tak ada lagi.
 */
export function dupBoard(dups: readonly DupCandidate[], decisions: DupDecisionMap): DupBoard {
  const map = decisions || {};
  const rows: DupBoardRow[] = dups.map((d) => {
    const key = dupPairKey(d);
    const { fin, ga } = sisi(d);
    return {
      key, cat: d.cat,
      finId: fin.id, finName: fin.name, gaId: ga.id, gaName: ga.name,
      daysApart: d.daysApart, combinedCost: d.combinedCost,
      decision: map[key] || null,
      detected: true,
    };
  });

  const terdeteksi = new Set(rows.map((r) => r.key));
  const usang: DupBoardRow[] = Object.keys(map)
    .filter((k) => !terdeteksi.has(k))
    .map((k) => {
      const dec = map[k];
      return {
        key: k, cat: dec.cat,
        finId: dec.finId, finName: dec.finName, gaId: dec.gaId, gaName: dec.gaName,
        daysApart: dec.daysApart, combinedCost: dec.combinedCost,
        decision: dec, detected: false,
      };
    })
    .sort((x, y) => y.combinedCost - x.combinedCost);

  const semua = [...rows, ...usang];
  const aktifDup = rows.filter((r) => r.decision && r.decision.verdict === 'duplikat');
  return {
    rows: semua,
    open: rows.filter((r) => !r.decision).length,
    decided: semua.filter((r) => r.decision).length,
    confirmed: aktifDup.length,
    confirmedCost: aktifDup.reduce((s, r) => s + r.combinedCost, 0),
    stale: usang.length,
  };
}
