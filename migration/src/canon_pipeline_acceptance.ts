/* ============================================================
   Asseris — canon_pipeline_acceptance: KESIAPAN PENERIMAAN yang DAPAT GAGAL.

   PRD `docs/prd-sales-pipeline-deepening.md` · PR-2.

   Panel "Penerimaan Klien (SA 220 / SMM)" di sheet detail peluang dulu berbunyi:

     const accept = [
       { t: 'Integritas & reputasi calon klien',             ok: true },
       { t: 'Independensi & potensi konflik kepentingan',    ok: true },
       { t: 'Kompetensi & kapasitas sumber daya',            ok: o.stage !== 'Lead' },
       { t: 'Penilaian risiko perikatan & fee proporsional', ok: o.prob >= 50 },
     ];

   Dua baris pertama DIPAKU `true` — dua tuntutan paling keras SA 220/SMM 1
   dirender hijau tanpa membaca apa pun, dan secara struktural TAK PERNAH bisa
   merah. Dua sisanya diturunkan dari tahap & probabilitas, yaitu dari hal yang
   justru seharusnya DIGERBANGI oleh penilaian penerimaan — sirkular: seret
   kartu ke kanan, "penilaian penerimaan" membaik. Kesimpulannya pun ikut:
   `prob >= 50` ⇒ "siap terbitkan engagement letter & konversi ke perikatan".

   Padahal datanya SUDAH ADA, satu modul di sebelahnya:
     · register prospek  — keputusan akseptasi, faktor berbobot, PMPJ, surat
     · AMS.INDEPENDENCE  — deklarasi, konflik, tenur & batas rotasi
   Contoh yang dulu tertutup centang hijau: OPP-107 dimiliki Bayu Saputra yang
   `declared: false`, dan OPP-101 sudah disetujui 'Terima' pada 2026-02-26 —
   papan masih memperlakukannya sebagai calon yang belum dinilai.

   ATURAN PEMANDU: **register mengalahkan penilaian-diri.** Skor faktor adalah
   penilaian tim atas dirinya sendiri; deklarasi independensi, kecocokan
   skrining, dan tenur rotasi adalah fakta terdaftar. Bila keduanya berselisih,
   yang terdaftar menang dan barisnya merah.
   ============================================================ */

import type { ClientRow } from './ams_types';
import type { Opportunity } from './canon_pipeline';

/* ---------------------------------------------------------------
   Bentuk sumber (data prospek/independensi belum bertipe di ams_types)
   --------------------------------------------------------------- */

export interface AccFactor { k: string; w: number; s: number; note: string }

export interface ProspectLike {
  id: string; name: string; source?: string; fee?: number; converted?: boolean;
  acceptance?: { approved?: boolean; decision?: string; approver?: string; date?: string; safeguard?: string; factors?: AccFactor[] };
  pmpj?: { verified?: boolean; riskRating?: string; cddLevel?: string; str?: boolean; screening?: { name: string; list: string; hit: boolean; status: string }[] };
  letter?: { version?: number; status?: string };
}

export interface IndependenceRow {
  id: string; name: string; declared: boolean; conflicts: number; finInterest?: string;
  rotationClient?: string; tenure?: number; rotationLimit?: number; basis?: string;
}

export type ReadinessStatus = 'ok' | 'issue' | 'belum-dinilai';

export interface ReadinessRow {
  /** Kunci stabil (dipakai uji & deep-link), sejajar urutan ACC_FACTORS. */
  key: 'integritas' | 'independensi' | 'kompetensi' | 'risiko' | 'imbalan';
  label: string;
  status: ReadinessStatus;
  /** Kalimat yang MENYEBUT sumbernya. Tak pernah kosong. */
  basis: string;
  weight: number;
  /** Skor penilaian-diri 1–5, atau null bila belum dinilai. */
  score: number | null;
}

export type VerdictState =
  | 'tanpa-prospek' | 'klien-eksisting' | 'dalam-penilaian'
  | 'ditolak' | 'diterima' | 'siap-surat';

export interface AcceptanceReadiness {
  prospect: ProspectLike | null;
  /** Bagaimana prospek ditemukan — `null` bila tak ada. */
  linkedBy: 'source' | 'nama' | null;
  rows: ReadinessRow[];
  /** Σ(bobot × skor) / Σbobot atas faktor yang SUDAH dinilai; null bila belum ada. */
  composite: number | null;
  issues: number;
  gates: { acceptance: boolean; pmpj: boolean; letter: boolean; converted: boolean };
  verdict: { state: VerdictState; text: string };
  /** Selisih nilai peluang vs fee prospek — dua angka untuk satu perikatan. */
  feeMismatch: { opp: number; prospect: number } | null;
}

const LABELS: { key: ReadinessRow['key']; label: string }[] = [
  { key: 'integritas', label: 'Integritas & reputasi manajemen' },
  { key: 'independensi', label: 'Independensi & konflik kepentingan' },
  { key: 'kompetensi', label: 'Kompetensi, waktu & kapasitas tim' },
  { key: 'risiko', label: 'Risiko perikatan & industri' },
  { key: 'imbalan', label: 'Etika & proporsionalitas imbalan' },
];

/** Bobot cadangan bila faktor belum ada — mengikuti ACC_FACTORS (Σ = 100). */
const FALLBACK_WEIGHT = [25, 20, 20, 25, 10];

const bare = (n: string) => (n || '').split(',')[0].trim();

/**
 * Faktor dianggap BELUM dinilai bila catatannya kosong: ACC_FACTORS mengisi
 * default `{ s: 3, note: '' }`, jadi skor 3 tanpa catatan berarti "belum
 * disentuh", bukan "cukup". Membacanya sebagai hijau persis kesalahan lama.
 */
function assessed(f?: AccFactor): boolean {
  return !!(f && typeof f.note === 'string' && f.note.trim().length > 0);
}

/**
 * Temukan prospek untuk sebuah peluang: `source` dulu, baru nama.
 *
 * Fallback nama HANYA berlaku untuk peluang intake (`origin: 'baru'`) — di sana
 * satu entitas = satu catatan penerimaan. Untuk cross-sell, satu klien punya
 * BANYAK peluang jasa sementara catatan prospeknya (bila ada) menyangkut
 * perikatan lain. Terbukti hidup: OPP-201 (ESG Assurance Rp 480 jt) tertaut
 * ke PROS-04 — catatan prospek AUDIT klien yang sama (fee Rp 1.850 jt) —
 * sehingga papan menampilkan keputusan penerimaan perikatan yang berbeda
 * seolah milik peluang ini.
 */
export function findProspect(opp: Opportunity, prospects: ProspectLike[]): { p: ProspectLike | null; by: 'source' | 'nama' | null } {
  const bySource = (prospects || []).find((p) => p.source === opp.id);
  if (bySource) return { p: bySource, by: 'source' };
  if (opp.origin === 'cross-sell') return { p: null, by: null };
  const byName = (prospects || []).find((p) => p.name === opp.name);
  if (byName) return { p: byName, by: 'nama' };
  return { p: null, by: null };
}

/**
 * Sinyal independensi dari REGISTER (bukan penilaian-diri tim).
 * Mengembalikan daftar temuan; kosong = tak ada yang menghalangi.
 */
export function independenceFindings(
  opp: Opportunity,
  independence: IndependenceRow[],
  clients: ClientRow[],
): string[] {
  const owner = bare(opp.owner);
  const row = (independence || []).find((r) => bare(r.name) === owner);
  if (!row) return [`Pemilik peluang "${owner}" tidak terdaftar di register independensi — status tidak dapat dipastikan.`];

  const out: string[] = [];
  if (!row.declared) out.push(`${owner} BELUM menandatangani deklarasi independensi (register ${row.id}).`);
  if ((row.conflicts || 0) > 0) {
    out.push(`${row.conflicts} konflik tercatat atas ${owner}: ${row.finInterest || 'rincian tidak dicatat'} (register ${row.id}).`);
  }
  /* Rotasi hanya relevan bila peluang menyangkut klien yang memang jadi dasar
     tenur partner — cross-sell ke klien eksisting. */
  const client = opp.clientId ? (clients || []).find((c) => c.id === opp.clientId) : null;
  if (client && row.rotationClient === client.name) {
    const t = row.tenure || 0, lim = row.rotationLimit || 0;
    if (lim > 0 && t >= lim) {
      out.push(`Rotasi: tahun ke-${t} dari batas ${lim} atas ${client.name}${row.basis ? ' (' + row.basis + ')' : ''}.`);
    }
  }
  return out;
}

/** Kecocokan skrining PMPJ yang belum dinyatakan bersih. */
function screeningHits(p: ProspectLike | null): { name: string; list: string; status: string }[] {
  return ((p && p.pmpj && p.pmpj.screening) || []).filter((s) => s.hit)
    .map((s) => ({ name: s.name, list: s.list, status: s.status }));
}

export function acceptanceReadiness(
  opp: Opportunity,
  ctx: { prospects: ProspectLike[]; independence: IndependenceRow[]; clients: ClientRow[] },
): AcceptanceReadiness {
  const { p, by } = findProspect(opp, ctx.prospects || []);
  const acc = (p && p.acceptance) || null;
  const factors = (acc && acc.factors) || [];
  const approved = !!(acc && acc.approved);
  const decision = (acc && acc.decision) || '';
  const indepFindings = independenceFindings(opp, ctx.independence || [], ctx.clients || []);
  const hits = screeningHits(p);

  const rows: ReadinessRow[] = LABELS.map((meta, i) => {
    const f = factors[i];
    const weight = f ? f.w : FALLBACK_WEIGHT[i];
    const score = assessed(f) ? f!.s : null;
    let status: ReadinessStatus = score === null ? 'belum-dinilai' : (score <= 2 ? 'issue' : 'ok');
    let basis = score === null
      ? (p ? 'Faktor belum dinilai di register prospek (skor default, tanpa catatan).'
           : 'Belum ada catatan prospek — faktor ini belum pernah dinilai.')
      : `Penilaian tim ${score}/5 — ${f!.note}`;

    /* REGISTER MENGALAHKAN PENILAIAN-DIRI. Sinyal terdaftar di bawah ini
       memerahkan baris berapa pun skor yang diberikan tim atas dirinya. */
    if (meta.key === 'independensi' && indepFindings.length) {
      status = 'issue';
      basis = indepFindings.join(' ');
    }
    if (meta.key === 'integritas' && hits.length) {
      const mitigated = hits.every((h) => /mitigasi/i.test(h.status || ''));
      /* Kecocokan yang sudah dimitigasi DAN keputusannya sudah diambil dengan
         syarat tertulis boleh hijau — tetapi faktanya tetap DISEBUT, tak pernah
         disembunyikan. Tanpa keputusan, kecocokan = hal terbuka. */
      status = (mitigated && approved) ? 'ok' : 'issue';
      basis = hits.map((h) => `${h.list} — ${h.name}: ${h.status}`).join(' · ')
        + (mitigated && approved && acc && acc.safeguard ? ` Pengaman: ${acc.safeguard}` : '');
    }
    if (meta.key === 'risiko' && p && p.pmpj && p.pmpj.riskRating === 'Tinggi' && !p.pmpj.verified) {
      status = 'issue';
      basis = `PMPJ risiko TINGGI (${p.pmpj.cddLevel || 'CDD tidak dicatat'}) dan verifikasi belum selesai.`
        + (score !== null ? ` Penilaian tim ${score}/5 — ${f!.note}` : '');
    }
    return { key: meta.key, label: meta.label, status, basis, weight, score };
  });

  const scored = rows.filter((r) => r.score !== null);
  const wSum = scored.reduce((s, r) => s + r.weight, 0);
  const composite = wSum ? +(scored.reduce((s, r) => s + r.weight * (r.score as number), 0) / wSum).toFixed(2) : null;
  const issues = rows.filter((r) => r.status === 'issue').length;

  const gates = {
    acceptance: approved && decision !== 'Tolak',
    pmpj: !!(p && p.pmpj && p.pmpj.verified),
    letter: !!(p && p.letter && p.letter.status === 'signed'),
    converted: !!(p && p.converted),
  };

  const feeMismatch = (p && typeof p.fee === 'number' && p.fee !== opp.value)
    ? { opp: opp.value, prospect: p.fee } : null;

  const verdict = buildVerdict({ opp, p, by, approved, decision, acc, gates, issues });

  return { prospect: p, linkedBy: by, rows, composite, issues, gates, verdict, feeMismatch };
}

function buildVerdict(a: {
  opp: Opportunity; p: ProspectLike | null; by: 'source' | 'nama' | null;
  approved: boolean; decision: string;
  acc: ProspectLike['acceptance'] | null;
  gates: AcceptanceReadiness['gates']; issues: number;
}): AcceptanceReadiness['verdict'] {
  const open = a.issues ? ` ${a.issues} hal terbuka pada penilaian.` : '';

  if (!a.p) {
    return a.opp.origin === 'cross-sell'
      ? { state: 'klien-eksisting', text: 'Klien eksisting — keputusan yang berlaku adalah KEBERLANJUTAN (SMM 1 ¶34(d) / SA 220.20), dinilai di modul Keberlanjutan Klien, bukan di sini.' + open }
      : { state: 'tanpa-prospek', text: 'Belum ada catatan prospek: penilaian penerimaan SA 220 belum dimulai. Peluang ini belum boleh diperlakukan sebagai perikatan.' + open };
  }
  if (a.decision === 'Tolak') {
    return { state: 'ditolak', text: `Perikatan DITOLAK pada ${a.acc?.date || 'tanggal tidak dicatat'}${a.acc?.approver ? ' oleh ' + a.acc.approver : ''}.` };
  }
  if (!a.approved) {
    return { state: 'dalam-penilaian', text: `Prospek ${a.p.id} terdaftar, keputusan penerimaan BELUM diambil.` + open };
  }

  const head = `${a.decision || 'Diterima'} — ${a.acc?.approver || 'penyetuju tidak dicatat'}, ${a.acc?.date || 'tanggal tidak dicatat'}.`
    + (a.acc?.safeguard ? ` Syarat: ${a.acc.safeguard}` : '');
  if (!a.gates.pmpj) {
    return { state: 'diterima', text: head + ' PMPJ belum diverifikasi — surat perikatan belum boleh terbit.' + open };
  }
  /* Hal terbuka MENGHALANGI, bukan sekadar dicatat. Keputusan akseptasi yang
     sudah diambil tidak menyembuhkan temuan register: SA 220.16/SMM 1 ¶29
     menuntut ancaman independensi diselesaikan SEBELUM perikatan diterima atau
     dilanjutkan. Terbukti hidup di seed: OPP-107 sudah 'Terima' 2026-02-10
     dengan PMPJ terverifikasi, sementara pemilik peluangnya belum menandatangani
     deklarasi independensi sama sekali. */
  if (a.issues) {
    return { state: 'diterima', text: head + ` PMPJ terverifikasi, TETAPI ${a.issues} hal terbuka pada penilaian — selesaikan sebelum menerbitkan surat perikatan (SA 210).` };
  }
  return { state: 'siap-surat', text: head + ' PMPJ terverifikasi, tidak ada hal terbuka — surat perikatan (SA 210) dapat diterbitkan.' };
}
