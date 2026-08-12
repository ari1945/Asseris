/* ============================================================
   Asseris — Gerbang sign-off estimasi ber-pakar (SA 620 · SA 500 ¶8)
   ------------------------------------------------------------
   Estimasi yang jalur responsnya "Gunakan pakar (SA 620)" bersandar
   SEPENUHNYA pada pekerjaan pihak ketiga. Menandatangani kertas kerja
   SA 540 tanpa mengevaluasi pekerjaan itu — dan tanpa dokumennya ada di
   bukti kertas kerja — berarti menyatakan kecukupan bukti yang tak pernah
   diperiksa.

   Mengikuti pola `useEthicsGate` yang sudah ada: logika MURNI di
   `canon_expert_eval.ts`, hook tipis di sini, `wp_signoff` memakainya
   sebagai `canSign` + `noAuthHint`.

   PRD prd-sa620-expert-gate-server PR-1 — gerbang ini TIDAK LAGI sendirian di
   lapisan UI: `server/src/signoff.ts` menegakkan aturan yang sama atas jalur
   tulis `state.set`, memakai `expertGateBlockers` yang sama persis. Gate di sini
   tetap ada dan tetap perlu — ia mencegah SEBELUM tulisan dikirim, dan menjelaskan
   sebabnya; server menolak yang menembusnya.
   ============================================================ */
import React from 'react';
import { useAmsPersist, useFirm } from './contexts';
import { api } from './api';
import { EST_SEED, type Estimate, type EstState } from './canon_estimates';
import { expertGateBlockers, type ExpertEvalState, type ExpertGateBlocker } from './canon_expert_eval';
import { useExpertDocs } from './expert_docs';

export interface EstimateExpertGate {
  blocked: boolean;
  blockers: ExpertGateBlocker[];
  /** ringkas untuk hint tombol sign-off */
  hint?: string;
  /**
   * Q2 — registri estimasi BELUM pernah tersimpan di server, sehingga penegakan
   * server tak dapat melihat satu pun estimasi berjalur SA 620. Tulisan tetap
   * diizinkan (fail-open) dan ditandai `expert-gate:no-register` di jejak audit;
   * ini padanan yang dilihat orang yang sedang menandatangani. Tanpa surface ini,
   * celahnya hanya terlihat oleh yang membaca jejak audit — bukan oleh yang
   * membubuhkan tanda tangan.
   */
  serverBlind: boolean;
}

/** Sudahkah `estimates.v1` pernah ditulis ke server untuk perikatan aktif?
 *  `null` = belum diketahui / server tak terjangkau — jangan mengklaim apa pun. */
function useRegisterOnServer(active: boolean): boolean | null {
  /* tipe struktural, BUKAN `any` (ratchet W15) — pola yang sama dengan contexts.tsx. */
  const firm = useFirm() as { activeEngagement?: { id?: string } | null } | null;
  const engId = (firm && firm.activeEngagement && firm.activeEngagement.id) || '';
  /* Argumen tipe generik TIDAK dapat dipakai pada hook React di repo ini (tak ada
     @types/react → TS2347); tipe dinyatakan lewat `as` di titik kembali. Pola yang
     sama dengan contexts.tsx. */
  const [onServer, setOnServer] = React.useState(null);
  React.useEffect(() => {
    if (!active || !engId) { setOnServer(null); return; }
    let cancelled = false;
    const stateGet = (api as unknown as {
      state: { get: { query: (a: { scope: string; scopeId: string; key: string }) => Promise<{ value: unknown; version: number }> } };
    }).state.get;
    stateGet.query({ scope: 'engagement', scopeId: engId, key: 'estimates.v1' })
      .then(res => { if (!cancelled) setOnServer(res.version > 0); })
      .catch(() => { if (!cancelled) setOnServer(null); });
    return () => { cancelled = true; };
  }, [active, engId]);
  return onServer as boolean | null;
}

export function useEstimateExpertGate(moduleId: string): EstimateExpertGate {
  const gated = moduleId === 'sa540';
  const [est] = useAmsPersist('estimates.v1', () => EST_SEED);
  const [expertEval] = useAmsPersist('expertEval.v1', () => ({} as ExpertEvalState));
  /* Hook dipanggil TANPA SYARAT (aturan hooks); `gated` yang mematikan kuerinya. */
  const onServer = useRegisterOnServer(gated);
  /* PR-2 — dokumen pakar kini dibaca dari DMS SERVER, bukan `localStorage`. Daftar
     yang SAMA dengan yang ditampilkan pemilih di view_sa540; bila keduanya berbeda,
     gerbang akan memblokir dokumen yang tampak ada di layar. */
  const { docs, ready } = useExpertDocs();
  /* gerbang ini hanya relevan bagi kertas kerja estimasi */
  if (!gated) return { blocked: false, blockers: [], serverBlind: false };
  const register: Estimate[] = (est && (est as EstState).register) || [];
  /* Limb DOKUMEN hanya ditegakkan bila daftar DMS benar-benar sampai. Saat server tak
     terjangkau, menyimpulkan "tak ada dokumen" akan memblokir seluruh sign-off SA 540
     setiap kali jaringan terputus — kegagalan yang jauh lebih besar daripada yang
     dicegahnya, dan server (PR-3) tetap menjadi otoritas akhirnya. */
  const blockers = expertGateBlockers(
    register, expertEval as ExpertEvalState, docs.map(d => d.id), { requireDocument: ready },
  );
  /* Buta hanya bila server MENJAWAB bahwa dokumennya belum ada (`false`), tidak saat
     jawabannya belum tiba (`null`) — banner yang berkedip pada setiap muat akan
     dianggap derau, dan peringatan yang dianggap derau tak dibaca. */
  const serverBlind = onServer === false;
  if (!blockers.length) return { blocked: false, blockers, serverBlind };
  const names = blockers.map(b => b.id).join(', ');
  return {
    blocked: true,
    blockers,
    serverBlind,
    hint: `evaluasi pekerjaan pakar belum lengkap (${names})`,
  };
}
