/* ============================================================
   Wedge MVP F3/F6 — generator workbook CONTOH (template D3)
   ------------------------------------------------------------
   Menghasilkan workbook .xlsx in-memory (Uint8Array) berisi sheet
   TB/GL/FISKAL yang valid & seimbang, dengan beberapa jurnal berisiko
   agar mesin diagnostik menyala. Dipakai:
     · tombol "Muat data contoh" (pengguna mencoba tanpa menyiapkan data)
     · verifikasi F3/F6 (melewati pipeline xlsx yang SAMA dgn unggahan nyata)
   Deterministik (tanpa Math.random) → hasil dapat direproduksi.
   ============================================================ */

let _xlsx: any = null;
async function loadXlsx(): Promise<any> {
  if (_xlsx) return _xlsx;
  const mod: any = await import('xlsx');
  _xlsx = mod && mod.utils ? mod : (mod.default || mod);
  return _xlsx;
}

/* —— GL contoh: ~38 jurnal rutin "bersih" + 4 jurnal berisiko —— */
function sampleGlAoa(): any[][] {
  const header = ['ID', 'Tanggal', 'Jam', 'User', 'Debit', 'Kredit', 'Nilai', 'Keterangan'];
  const rows: any[][] = [header];
  const clean = [
    { dr: '5-2100', cr: '1-1100', u: 'staff.gl' },
    { dr: '5-3100', cr: '2-1100', u: 'staff.ap' },
    { dr: '1-1300', cr: '4-1100', u: 'staff.ar' },
    { dr: '5-1100', cr: '1-1300', u: 'staff.gl' },
  ];
  // hari kerja Juni 2025 (16=Senin), jam kerja, nilai non-bulat
  for (let i = 0; i < 38; i++) {
    const c = clean[i % clean.length];
    const day = 16 + (i % 5);                 // 16..20 Juni 2025 (Sen–Jum)
    rows.push([
      'JV-25-' + String(1000 + i), `${day}-06-2025`, `${9 + (i % 8)}:${(i * 7) % 60 < 10 ? '0' : ''}${(i * 7) % 60}`,
      c.u, c.dr, c.cr, 11_000_000 + i * 137_911 + (i % 7) * 311, 'Transaksi operasional rutin',
    ]);
  }
  // jurnal berisiko (akhir tahun, larut malam, bulat besar, user/akun jarang)
  rows.push(['JV-25-9001', '27-12-2025', '23:48', 'finance.adm2', '4-1100', '1-1200', 2_000_000_000, 'Pembalikan pendapatan tanpa dokumen retur']);
  rows.push(['JV-25-9002', '28-12-2025', '22:15', 'gl.manager', '6-1300', '1-1100', 1_500_000_000, 'Beban akrual bulat tanpa lampiran tagihan']);
  rows.push(['JV-25-9003', '31-12-2025', '21:05', 'ceo.override', '9-9999', '1-1100', 985_000_000, 'Penyesuaian manual akun tidak lazim']);
  rows.push(['JV-25-9004', '28-12-2025', '06:30', 'finance.adm2', '6-1900', '2-1100', 750_000_000, 'Beban lain-lain bulat menjelang tutup buku']);
  return rows;
}

/* —— TB contoh: seimbang (Σ saldo bertanda = 0) —— */
function sampleTbAoa(): any[][] {
  const rows: any[][] = [['Kode', 'Nama', 'Saldo']];
  const tb: [string, string, number][] = [
    ['1-1100', 'Kas dan setara kas', 18_500_000_000],
    ['1-1200', 'Piutang usaha', 12_300_000_000],
    ['1-1300', 'Persediaan', 9_800_000_000],
    ['1-2100', 'Aset tetap (neto)', 24_400_000_000],
    ['2-1100', 'Utang usaha', -8_700_000_000],
    ['2-1300', 'Beban akrual', -3_100_000_000],
    ['2-2100', 'Utang bank jangka panjang', -15_000_000_000],
    ['3-1100', 'Modal saham', -20_000_000_000],
    ['3-3100', 'Saldo laba', -18_200_000_000],
    ['4-1100', 'Pendapatan', -78_500_000_000],
    ['5-1100', 'Beban pokok', 41_000_000_000],
    ['5-2100', 'Beban operasi', 17_300_000_000],
    ['5-3100', 'Beban umum & administrasi', 11_900_000_000],
    ['6-1300', 'Beban akrual lain', 3_100_000_000],
    ['6-1900', 'Beban lain-lain', 2_700_000_000],
  ];
  // baris penutup penyeimbang agar Σ = 0 persis
  const sum = tb.reduce((s, r) => s + r[2], 0);
  if (sum !== 0) tb.push(['8-9999', 'Selisih pembulatan (penyeimbang)', -sum]);
  for (const [code, name, bal] of tb) rows.push([code, name, bal]);
  return rows;
}

/* —— FISKAL contoh (Rp JUTA) → memicu bt-perm (permAdd/pbt > 8%) —— */
function sampleFiskalAoa(): any[][] {
  return [
    ['pbt', 48_500],
    ['permAdd', 4_200],
    ['permLess', 3_000],
    ['taxExpBooked', 12_000],
    ['dtaReported', 1_800],
    ['taxLoss', 900],
  ];
}

/** Bangun workbook contoh → Uint8Array .xlsx (dibaca pipeline parseImportWorkbook). */
export async function buildSampleWorkbook(): Promise<Uint8Array> {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sampleTbAoa()), 'TB');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sampleGlAoa()), 'GL');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sampleFiskalAoa()), 'FISKAL');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}
