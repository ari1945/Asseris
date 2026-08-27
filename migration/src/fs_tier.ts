/* ============================================================
   §5 — SKALA TIPOGRAFI MENGIKAT, juga untuk ukuran PROPORSIONAL

   Sebagian komponen ukurannya memang proporsional terhadap dimensi lain:
   inisial di dalam lingkaran `Avatar`, label format di dalam `FmtBadge`.
   Yang salah bukan proporsinya — yang salah adalah MENDARATNYA di piksel
   bebas. `size * 0.4` pada Avatar 16px menghasilkan 6,4px; `size * 0.185`
   pada FmtBadge 38px menghasilkan 7,03px. Keduanya menembus lantai 11px dan
   tak pernah ada di skala.

   `fsTier` menyalurkan piksel bebas ke anggota skala TERDEKAT. Lantai 11px
   otomatis: 11 adalah anggota terkecil, jadi apa pun di bawahnya mendarat di
   sana. Hasilnya dipakai sebagai KELAS (`fs-xs` … `fs-d3`, didefinisikan di
   styles_base.css dengan nilai `var(--fs-*)`) — BUKAN sebagai `fontSize`
   inline terhitung, supaya gerbang `typography_scale.test.ts` benar-benar
   dapat melarang bentuk terhitung tanpa pengecualian.

   Berkas terpisah (bukan di ui.tsx) supaya dapat diuji tanpa memuat React.
   ============================================================ */

export const FS_TIER: ReadonlyArray<{ px: number; tier: string }> = [
  { px: 11, tier: 'xs' }, { px: 12, tier: 'sm' }, { px: 13, tier: 'md' },
  { px: 15, tier: 'lg' }, { px: 19, tier: 'xl' },
  { px: 22, tier: 'd1' }, { px: 28, tier: 'd2' }, { px: 34, tier: 'd3' },
];

/* Anggota skala terdekat dari `px`. Seri: yang lebih kecil menang (11,5 → 11),
   jadi pemetaannya deterministik. */
export function fsTier(px: number): string {
  let best = FS_TIER[0];
  for (const c of FS_TIER) if (Math.abs(c.px - px) < Math.abs(best.px - px)) best = c;
  return best.tier;
}

/* Nilai piksel anggota itu — untuk uji & untuk pembaca yang ingin tahu
   berapa hasilnya, tanpa menghitung ulang tabelnya. */
export function fsTierPx(px: number): number {
  const t = fsTier(px);
  return (FS_TIER.find((c) => c.tier === t) as { px: number }).px;
}
