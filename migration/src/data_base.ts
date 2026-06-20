/* ============================================================
   NeoSuite AMS — data base (helper fmt/rp) (W3 split dari data.js; perilaku identik).
   ============================================================ */
  const fmt = (n: any, d = 0) =>
    (n < 0 ? '(' : '') +
    Math.abs(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }) +
    (n < 0 ? ')' : '');
  const rp = (n: any, d = 0) => 'Rp ' + fmt(n, d);

  /* ---- The firm ---- */

export { fmt, rp };
