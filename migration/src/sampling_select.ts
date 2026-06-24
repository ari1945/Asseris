/* ============================================================
   Asseris — SA 530 · seleksi item Monetary Unit Sampling (PPS sistematis)
   ------------------------------------------------------------
   Fungsi MURNI & DETERMINISTIK (diuji unit: sampling_select.test.ts).
   Titik-mulai acak (seed, disimpan) + interval (dari kalkulator MUS) →
   unit moneter yang "tertusuk" dipetakan ke item populasi. Item dengan
   nilai buku ≥ interval pasti tertusuk (key item / top-stratum 100%).
   ============================================================ */

export type PopItem = { id: string; name: string; bv: number };
export type SelectedItem = { id: string; name: string; bv: number; hits: number; key: boolean };

/* Populasi ILUSTRATIF (bukan sub-ledger nyata) — 100 saldo piutang condong:
   beberapa saldo besar dominan + ekor panjang. Disimpan sebagai BOBOT relatif;
   nilai buku aktual diturunkan via scalePopulation() agar total = nilai populasi
   (bv) kalkulator → reaktif & SSOT. */
function buildPopulation(): PopItem[] {
  const big = [380, 300, 250, 205, 175, 150]; // 6 saldo besar dominan
  const items: PopItem[] = [];
  for (let i = 0; i < 100; i++) {
    const w = i < big.length ? big[i] : Math.max(4, Math.round(150 / (i - big.length + 2)));
    items.push({ id: 'AR-' + String(i + 1).padStart(3, '0'), name: 'Pelanggan ' + String(i + 1).padStart(3, '0'), bv: w });
  }
  return items;
}
export const SA530_POPULATION: PopItem[] = buildPopulation();

/* Skala bobot populasi ilustratif → nilai buku aktual yang totalnya = totalBv. */
export function scalePopulation(weights: PopItem[], totalBv: number): PopItem[] {
  const sum = weights.reduce((s, p) => s + p.bv, 0) || 1;
  return weights.map(p => ({ ...p, bv: Math.max(1, Math.round((p.bv / sum) * totalBv)) }));
}

/* Seleksi MUS sistematis. seedStart ∈ (0, interval]; titik seleksi =
   seedStart, +interval, … ≤ total. Mengembalikan item terpilih unik
   (dengan jumlah 'hits' & penanda key item bv ≥ interval). */
export function selectMus(pop: PopItem[], interval: number, seedStart: number): SelectedItem[] {
  if (interval <= 0 || seedStart <= 0) return [];
  const total = pop.reduce((s, p) => s + p.bv, 0);
  const result: SelectedItem[] = [];
  const index = new Map<string, SelectedItem>();
  let lower = 0;
  let point = seedStart;
  for (const item of pop) {
    const upper = lower + item.bv;
    while (point <= upper && point <= total) {
      const ex = index.get(item.id);
      if (ex) { ex.hits += 1; }
      else {
        const sel: SelectedItem = { id: item.id, name: item.name, bv: item.bv, hits: 1, key: item.bv >= interval };
        index.set(item.id, sel);
        result.push(sel);
      }
      point += interval;
    }
    lower = upper;
  }
  return result;
}
