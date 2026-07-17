"""Sheet PETUNJUK, SETUP, dan REF (list tersembunyi + tabel referensi)."""
from xhelp import *

MAP_AL = ['Kas & Setara Kas', 'Piutang Usaha', 'Piutang Lainnya', 'Persediaan',
          'Pajak Dibayar Dimuka', 'Biaya Dibayar Dimuka & Uang Muka', 'Aset Lancar Lainnya']
MAP_ATL = ['Aset Tetap', 'Properti Investasi', 'Aset Takberwujud', 'Aset Hak-Guna',
           'Investasi pada Entitas Lain', 'Aset Pajak Tangguhan', 'Aset Tidak Lancar Lainnya']
MAP_LJPDK = ['Utang Usaha', 'Utang Bank Jangka Pendek', 'Beban Akrual', 'Utang Pajak',
             'Liabilitas Sewa Jangka Pendek', 'Liabilitas Jangka Pendek Lainnya']
MAP_LJPJG = ['Utang Bank Jangka Panjang', 'Liabilitas Sewa Jangka Panjang',
             'Liabilitas Imbalan Kerja', 'Liabilitas Pajak Tangguhan', 'Liabilitas Jangka Panjang Lainnya']
MAP_EK = ['Modal Saham', 'Tambahan Modal Disetor', 'Saldo Laba', 'Komponen Ekuitas Lainnya']
MAP_LR = ['Pendapatan', 'Beban Pokok Pendapatan', 'Beban Penjualan', 'Beban Umum & Administrasi',
          'Pendapatan Lainnya', 'Beban Lainnya', 'Pendapatan Keuangan', 'Beban Keuangan',
          'Beban Pajak Kini', 'Beban (Manfaat) Pajak Tangguhan']
MAP_ALL = MAP_AL + MAP_ATL + MAP_LJPDK + MAP_LJPJG + MAP_EK + MAP_LR  # baris 2..40
MAP_LR_PRATAX_L = MAP_LR[:-2]
MAP_ASET_L = MAP_AL + MAP_ATL
MAP_LIAB_L = MAP_LJPDK + MAP_LJPJG
MAP_EK_LR_L = MAP_EK + MAP_LR


def sum_cats(col_rng, map_rng, cats, neg=False):
    """=SUM(SUMIFS(col, map, {"a","b",...})) — pola robust (N()/SUMPRODUCT atas range tak andal)."""
    a = '{"' + '","'.join(cats) + '"}'
    s = f'SUM(SUMIFS({col_rng},{map_rng},{a}))'
    return f'-({s})' if neg else s

LISTS = {
    'C': ('LIST_STATUS', ['Belum', 'Proses', 'Selesai', 'N/A']),
    'D': ('LIST_YATIDAK', ['Ya', 'Tidak']),
    'E': ('LIST_LMH', ['Rendah', 'Moderat', 'Tinggi']),
    'F': ('LIST_ASERSI', ['Keberadaan/Keterjadian', 'Kelengkapan', 'Akurasi/Penilaian',
                          'Pisah Batas', 'Klasifikasi', 'Hak & Kewajiban', 'Penyajian & Pengungkapan']),
    'G': ('LIST_TIPE_SAD', ['Faktual', 'Judgmental', 'Proyeksi']),
    'H': ('LIST_JENIS_KONF', ['Bank', 'Piutang Usaha', 'Utang Usaha', 'Hukum', 'Lainnya']),
    'I': ('LIST_HASIL_KONF', ['Cocok', 'Selisih', 'Tidak Kembali', 'Prosedur Alternatif']),
    'J': ('LIST_AJE_STATUS', ['Draft', 'Posted']),
    'K': ('LIST_SIGNIF', ['Signifikan', 'Risiko Signifikan', 'Tidak Signifikan']),
    'L': ('LIST_KOMPONEN', ['Audit Penuh', 'Audit Akun Spesifik', 'Reviu', 'Prosedur Analitis']),
    'V': ('LIST_TASK', ['Open', 'Proses', 'Selesai']),
    'W': ('LIST_FASE', ['Perencanaan', 'Pekerjaan Lapangan', 'Penyelesaian', 'Pelaporan']),
    'X': ('LIST_KERANGKA', ['SAK', 'SAK EP', 'SAK EMKM']),
    'Y': ('LIST_TOC', ['Efektif', 'Tidak Efektif', 'Tidak Diuji']),
    'Z': ('LIST_KOREKSI', ['Dikoreksi', 'Tidak Dikoreksi']),
}

ROMM = [('Rendah|Rendah', 'Rendah'), ('Rendah|Moderat', 'Rendah'), ('Rendah|Tinggi', 'Moderat'),
        ('Moderat|Rendah', 'Rendah'), ('Moderat|Moderat', 'Moderat'), ('Moderat|Tinggi', 'Tinggi'),
        ('Tinggi|Rendah', 'Moderat'), ('Tinggi|Moderat', 'Tinggi'), ('Tinggi|Tinggi', 'Tinggi')]

OPINI_TEKS = {
    'WTP': ('Wajar Tanpa Modifikasian',
            'Menurut opini kami, laporan keuangan terlampir menyajikan secara wajar, dalam semua hal yang material, '
            'posisi keuangan [KLIEN] tanggal [TGL], serta kinerja keuangan dan arus kasnya untuk tahun yang berakhir '
            'pada tanggal tersebut, sesuai dengan Standar Akuntansi Keuangan di Indonesia.'),
    'WDP': ('Wajar Dengan Pengecualian',
            'Menurut opini kami, kecuali untuk dampak hal yang dijelaskan dalam paragraf Basis untuk Opini Wajar Dengan '
            'Pengecualian, laporan keuangan terlampir menyajikan secara wajar, dalam semua hal yang material, posisi '
            'keuangan [KLIEN] tanggal [TGL], serta kinerja keuangan dan arus kasnya untuk tahun yang berakhir pada '
            'tanggal tersebut, sesuai dengan Standar Akuntansi Keuangan di Indonesia.'),
    'TW': ('Tidak Wajar',
           'Menurut opini kami, karena signifikansi hal yang dijelaskan dalam paragraf Basis untuk Opini Tidak Wajar, '
           'laporan keuangan terlampir tidak menyajikan secara wajar posisi keuangan [KLIEN] tanggal [TGL], serta '
           'kinerja keuangan dan arus kasnya untuk tahun yang berakhir pada tanggal tersebut, sesuai dengan Standar '
           'Akuntansi Keuangan di Indonesia.'),
    'TMP': ('Tidak Menyatakan Pendapat',
            'Kami tidak menyatakan suatu opini atas laporan keuangan terlampir [KLIEN]. Karena signifikansi hal yang '
            'dijelaskan dalam paragraf Basis untuk Tidak Menyatakan Pendapat, kami tidak dapat memperoleh bukti audit '
            'yang cukup dan tepat untuk menyediakan suatu basis bagi opini audit atas laporan keuangan ini.'),
}


def build_ref(wb):
    ws = wb.create_sheet('REF')
    ws['A1'] = 'MAP_LK'
    for i, m in enumerate(MAP_ALL):
        ws.cell(row=2 + i, column=1, value=m)
    for col, (name, items) in LISTS.items():
        ws[f'{col}1'] = name
        for i, it in enumerate(items):
            ws[f'{col}{2 + i}'] = it
    # Faktor keandalan MUS (risiko salah penerimaan) — match praktik & canon SA530
    ws['N1'] = 'RF_MUS'
    for i, (lvl, rf) in enumerate([('Tinggi', 3.0), ('Moderat', 2.31), ('Rendah', 1.9)]):
        ws[f'N{2 + i}'] = lvl
        ws[f'O{2 + i}'] = rf
    ws['P1'] = 'ROMM'
    for i, (k, v) in enumerate(ROMM):
        ws[f'P{2 + i}'] = k
        ws[f'Q{2 + i}'] = v
    ws['S1'] = 'BENFORD'
    for d in range(1, 10):
        ws[f'S{1 + d}'] = d
        ws[f'T{1 + d}'] = f'=LOG10(1+1/S{1 + d})'
    ws['U19'] = 'TEKS OPINI'
    for i, key in enumerate(['WTP', 'WDP', 'TW', 'TMP']):
        ws[f'T{20 + i}'] = key
        ws[f'U{20 + i}'] = OPINI_TEKS[key][0]
        ws[f'V{20 + i}'] = OPINI_TEKS[key][1]
    ws.sheet_state = 'hidden'
    return ws


def build_setup(wb):
    ws = wb.create_sheet('SETUP')
    title(ws, 'SETUP — Identitas & Parameter Perikatan',
          'Isi sel berlatar biru/kuning. Semua sheet lain menarik dari sini (SSOT). Sel kuning = asumsi kunci.')
    widths(ws, {'A': 30, 'B': 34, 'C': 26, 'D': 16, 'E': 40})

    rows = [
        ('Nama KAP', 'KAP [Nama] & Rekan'),
        ('Nama Klien (entitas)', 'PT Contoh Sejahtera (contoh — ganti)'),
        ('Alamat Klien', 'Jakarta'),
        ('Tahun Buku', 2025),
        ('Periode Mulai', '01/01/2025'),
        ('Periode Akhir (tanggal LK)', '31/12/2025'),
        ('Kerangka Pelaporan', 'SAK'),
        ('Nomor Perikatan', 'ENG-2025-001'),
    ]
    cell(ws, 'A4', 'IDENTITAS PERIKATAN', font=F_BOLD, fill=FILL_SUB, border=False)
    for i, (lbl, val) in enumerate(rows):
        r = 5 + i
        cell(ws, f'A{r}', lbl)
        c = inp(ws, f'B{r}', val)
        if lbl.startswith('Periode'):
            from datetime import datetime
            c.value = datetime.strptime(val, '%d/%m/%Y')
            c.number_format = DATE
    dv_name(ws, 'LIST_KERANGKA', 'B11')

    cell(ws, 'A15', 'TIM PERIKATAN', font=F_BOLD, fill=FILL_SUB, border=False)
    headrow(ws, 16, ['Peran', 'Nama', 'Inisial'], start=1)
    roles = ['Rekan Perikatan (Partner)', 'Penelaah Mutu (EQR)', 'Manajer', 'Senior', 'Junior 1', 'Junior 2']
    contoh = ['Hartono (contoh)', '', 'Yuni (contoh)', 'Dimas (contoh)', 'Fajar (contoh)', '']
    for i, role in enumerate(roles):
        r = 17 + i
        cell(ws, f'A{r}', role)
        inp(ws, f'B{r}', contoh[i] or None)
        inp(ws, f'C{r}', None)

    cell(ws, 'A25', 'CATATAN', font=F_BOLD, fill=FILL_SUB, border=False)
    note(ws, 'A26', 'Materialitas diatur di sheet 11_Materialitas. Parameter sampling di 27_Sampling. '
                    'Baris bertanda "(contoh)" adalah ilustrasi — ganti dengan data engagement Anda.')
    ws.merge_cells('A26:E27')
    protect(ws)
    return ws


PETUNJUK_TEKS = [
    ('URUTAN PENGISIAN', [
        '1. SETUP — identitas perikatan & tim.',
        '2. 20_WTB — impor/ketik trial balance (kode, nama, mapping LK, saldo PY & CY). Pastikan baris CHECK = SEIMBANG.',
        '3. 11_Materialitas — pilih benchmark & persentase → OM/PM/CTT mengalir otomatis ke seluruh workbook.',
        '4. 10_Risiko + 23_Asersi + 12_ICFR + 13_StrategyMemo — perencanaan (SA 315/320/300/330).',
        '5. 02_Program + 22_IndeksWP — rencanakan prosedur & kertas kerja; status ter-roll-up ke 00_Cockpit.',
        '6. Eksekusi: 21_AJE (jurnal koreksi auto-post ke WTB), 24_Analitis, 25_JET, 27_Sampling, 30_Konfirmasi, dst.',
        '7. 37_SAD — akumulasi salah saji tidak dikoreksi; banding otomatis vs OM/PM (SA 450).',
        '8. Finalisasi: 40_LK (draf LK dari mapping WTB), 41_Pengungkapan, 42_Opini, 43_EQR, 44_ML.',
    ]),
    ('LEGENDA WARNA', [
        'Sel BIRU MUDA + teks biru = INPUT (tidak terkunci — silakan isi).',
        'Sel KUNING = ASUMSI KUNCI (benchmark, persentase, parameter) — ubah dengan pertimbangan.',
        'Teks hitam = FORMULA (terkunci). Teks hijau = tarikan dari sheet lain (terkunci).',
        'Latar hijau/merah pada sel status = flag otomatis (OK / perlu perhatian).',
    ]),
    ('PRINSIP SATU SUMBER KEBENARAN (SSOT)', [
        'Semua angka hilir (materialitas, analitis, sampling, SAD, LK, opini) ditarik dari 20_WTB dan parameter '
        'di 11_Materialitas melalui formula & named ranges — meniru arsitektur AMS_CANON pada aplikasi Asseris.',
        'JANGAN mengetik ulang angka yang sudah ada di WTB. Ubah sumbernya, seluruh workbook mengikuti.',
        'AJE tidak diketik di kolom WTB — catat di 21_AJE dengan status "Posted", WTB menariknya via SUMIFS.',
    ]),
    ('KETERBATASAN vs APLIKASI ASSERIS (dinyatakan jujur)', [
        'Tanpa enforcement: pemisahan tugas sign-off (SoD), gerbang fase, dan RBAC hanya berupa kolom/flag — Excel '
        'tidak bisa memblokir. Di Asseris hal ini dipaksakan server.',
        'Tanpa audit trail & versi: tidak ada riwayat perubahan ber-hash. Simpan salinan per milestone secara manual.',
        'Satu editor pada satu waktu; tidak ada portal klien/PBC, copilot AI, konektor Coretax, atau segel dokumen.',
        'Proteksi sheet TANPA password (agar tidak mengunci diri sendiri) — membukanya adalah keputusan sadar Anda.',
    ]),
    ('KAPASITAS & KINERJA', [
        '20_WTB: 150 baris akun. 21_AJE: 60 jurnal. 25_JET: 3.000 baris GL (perluas dengan menyalin formula helper '
        'kolom H–L ke bawah bila perlu; di atas ±50.000 baris pertimbangkan memecah file).',
        'Formula volatile dihindari kecuali TODAY() pada aging tugas.',
    ]),
]


def build_petunjuk(wb):
    ws = wb.create_sheet('PETUNJUK')
    title(ws, 'Asseris Engagement Pack — Petunjuk Penggunaan',
          'Template kertas kerja audit satu-perikatan · Bahasa Indonesia · tanpa makro · turunan metodologi Asseris')
    widths(ws, {'A': 118})
    r = 4
    for section, lines in PETUNJUK_TEKS:
        cell(ws, f'A{r}', section, font=F_BOLD, fill=FILL_SUB, border=False)
        r += 1
        for ln in lines:
            c = ws.cell(row=r, column=1, value=ln)
            c.font = F_BASE
            c.alignment = Alignment(wrap_text=True, vertical='top')
            ws.row_dimensions[r].height = max(15, 13 * (1 + len(ln) // 110))
            r += 1
        r += 1
    # contoh visual legenda
    inp(ws, 'B6', 'contoh input')
    inp(ws, 'B7', 'contoh asumsi', assum=True)
    protect(ws)
    return ws
