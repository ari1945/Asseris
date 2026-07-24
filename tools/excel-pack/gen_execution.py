"""2 · Pelaksanaan: 20_WTB, 21_AJE, 22_IndeksWP, 23_Asersi, 24_Analitis, 25_JET, 26_BookTax, 27_Sampling."""
from xhelp import *
from gen_ref_setup import sum_cats, MAP_LR_PRATAX_L

WTB_TOP, WTB_BOT = 6, 155
AJE_TOP, AJE_BOT = 6, 65
RJE_TOP, RJE_BOT = 71, 110
JET_TOP, JET_BOT = 6, 3005

# (kode, nama, mapping, CY unadjusted dlm Rp) — contoh seimbang; PY = 90% CY
CONTOH_WTB = [
    ('1101', 'Kas dan setara kas (contoh)', 'Kas & Setara Kas', 500_000_000),
    ('1201', 'Piutang usaha (contoh)', 'Piutang Usaha', 800_000_000),
    ('1301', 'Persediaan (contoh)', 'Persediaan', 700_000_000),
    ('1501', 'Aset tetap (contoh)', 'Aset Tetap', 2_100_000_000),
    ('2101', 'Utang usaha (contoh)', 'Utang Usaha', -600_000_000),
    ('2102', 'Beban akrual (contoh)', 'Beban Akrual', -100_000_000),
    ('2201', 'Utang bank jangka panjang (contoh)', 'Utang Bank Jangka Panjang', -900_000_000),
    ('3101', 'Modal saham (contoh)', 'Modal Saham', -1_000_000_000),
    ('2103', 'Utang pajak (contoh)', 'Utang Pajak', -140_000_000),
    ('3201', 'Saldo laba (contoh)', 'Saldo Laba', -700_000_000),
    ('4101', 'Pendapatan (contoh)', 'Pendapatan', -5_000_000_000),
    ('5101', 'Beban pokok pendapatan (contoh)', 'Beban Pokok Pendapatan', 3_000_000_000),
    ('6101', 'Beban umum & administrasi (contoh)', 'Beban Umum & Administrasi', 1_100_000_000),
    ('6201', 'Beban keuangan (contoh)', 'Beban Keuangan', 60_000_000),
    ('7101', 'Beban pajak kini (contoh)', 'Beban Pajak Kini', 180_000_000),
]


def build_wtb(wb):
    ws = wb.create_sheet('20_WTB')
    title(ws, '20 · Working Trial Balance',
          'Saldo bertanda: Debit (+) / Kredit (−). Kolom AJE/RJE ditarik OTOMATIS dari 21_AJE (status Posted) — jangan diketik.')
    widths(ws, {'A': 10, 'B': 38, 'C': 30, 'D': 16, 'E': 16, 'F': 14, 'G': 14, 'H': 14, 'I': 14, 'J': 17, 'K': 10})
    cell(ws, 'A3', 'CHECK (Σ harus 0):', font=F_BOLD, border=False)
    for col in ['D', 'E', 'J']:
        frm(ws, f'{col}3', f'=SUM({col}{WTB_TOP}:{col}{WTB_BOT})', fmt=RP, bold=True)
    frm(ws, 'K3', f'=IF(AND(ABS(D3)<1,ABS(E3)<1,ABS(J3)<1),"SEIMBANG","TIDAK SEIMBANG")', bold=True)
    headrow(ws, 5, ['Kode', 'Nama Akun', 'Mapping LK', 'Saldo PY (Audited)', 'Saldo CY (Unadjusted)',
                    'AJE Dr', 'AJE Cr', 'RJE Dr', 'RJE Cr', 'Saldo Final', 'Ref WP'])
    for r in range(WTB_TOP, WTB_BOT + 1):
        for colref in ['A', 'B', 'C', 'D', 'E', 'K']:
            inp(ws, f'{colref}{r}', fmt=RP if colref in 'DE' else None)
        frm(ws, f'F{r}', f'=IF($A{r}="","",SUMIFS(\'21_AJE\'!$E${AJE_TOP}:$E${AJE_BOT},\'21_AJE\'!$C${AJE_TOP}:$C${AJE_BOT},$A{r},\'21_AJE\'!$G${AJE_TOP}:$G${AJE_BOT},"Posted"))', fmt=RP, link=True)
        frm(ws, f'G{r}', f'=IF($A{r}="","",SUMIFS(\'21_AJE\'!$F${AJE_TOP}:$F${AJE_BOT},\'21_AJE\'!$C${AJE_TOP}:$C${AJE_BOT},$A{r},\'21_AJE\'!$G${AJE_TOP}:$G${AJE_BOT},"Posted"))', fmt=RP, link=True)
        frm(ws, f'H{r}', f'=IF($A{r}="","",SUMIFS(\'21_AJE\'!$E${RJE_TOP}:$E${RJE_BOT},\'21_AJE\'!$C${RJE_TOP}:$C${RJE_BOT},$A{r},\'21_AJE\'!$G${RJE_TOP}:$G${RJE_BOT},"Posted"))', fmt=RP, link=True)
        frm(ws, f'I{r}', f'=IF($A{r}="","",SUMIFS(\'21_AJE\'!$F${RJE_TOP}:$F${RJE_BOT},\'21_AJE\'!$C${RJE_TOP}:$C${RJE_BOT},$A{r},\'21_AJE\'!$G${RJE_TOP}:$G${RJE_BOT},"Posted"))', fmt=RP, link=True)
        frm(ws, f'J{r}', f'=IF($A{r}="","",E{r}+F{r}-G{r}+H{r}-I{r})', fmt=RP, bold=True)
    dv_name(ws, 'MAP_LK', f'C{WTB_TOP}:C{WTB_BOT}')
    for i, (kode, nama, mapping, cy) in enumerate(CONTOH_WTB):
        r = WTB_TOP + i
        ws[f'A{r}'] = kode
        ws[f'B{r}'] = nama
        ws[f'C{r}'] = mapping
        ws[f'D{r}'] = round(cy * 0.9)
        ws[f'E{r}'] = cy
    ws.freeze_panes = 'A6'
    protect(ws)
    return ws


def _jurnal_block(ws, top, bot, header_row, label):
    cell(ws, f'A{header_row - 1}', label, font=F_BOLD, fill=FILL_SUB, border=False)
    headrow(ws, header_row, ['No', 'Ref WP', 'Kode Akun', 'Nama Akun', 'Debit', 'Kredit', 'Status', 'Keterangan'])
    for r in range(top, bot + 1):
        for colref in ['A', 'B', 'C', 'E', 'F', 'H']:
            inp(ws, f'{colref}{r}', fmt=RP if colref in 'EF' else None)
        inp(ws, f'G{r}')
        frm(ws, f'D{r}', f'=IF($C{r}="","",IFERROR(VLOOKUP($C{r},\'20_WTB\'!$A${WTB_TOP}:$B${WTB_BOT},2,0),"⚠ kode tak ada di WTB"))', link=True)
    tr = bot + 1
    cell(ws, f'D{tr}', 'TOTAL', font=F_BOLD, fill=FILL_GREY)
    frm(ws, f'E{tr}', f'=SUM(E{top}:E{bot})', fmt=RP, bold=True, fill=FILL_GREY)
    frm(ws, f'F{tr}', f'=SUM(F{top}:F{bot})', fmt=RP, bold=True, fill=FILL_GREY)
    frm(ws, f'G{tr}', f'=IF(ABS(E{tr}-F{tr})<1,"SEIMBANG","TIDAK SEIMBANG")', bold=True, fill=FILL_GREY)


def build_aje(wb):
    ws = wb.create_sheet('21_AJE')
    title(ws, '21 · Adjusting & Reclassifying Journal Entries',
          'Hanya status "Posted" yang mengalir ke 20_WTB. Debit & Kredit dicatat POSITIF pada baris akun masing-masing.')
    widths(ws, {'A': 8, 'B': 10, 'C': 12, 'D': 36, 'E': 16, 'F': 16, 'G': 11, 'H': 40})
    _jurnal_block(ws, AJE_TOP, AJE_BOT, 5, 'AJE — JURNAL PENYESUAIAN (salah saji terkoreksi)')
    _jurnal_block(ws, RJE_TOP, RJE_BOT, 70, 'RJE — JURNAL REKLASIFIKASI (tanpa dampak laba)')
    dv_name(ws, 'LIST_AJE_STATUS', f'G{AJE_TOP}:G{AJE_BOT}')
    dv_name(ws, 'LIST_AJE_STATUS', f'G{RJE_TOP}:G{RJE_BOT}')
    contoh = [('AJE-1', 'C-5', '6101', 25_000_000, None, 'Posted', 'Akrual beban listrik Des (contoh)'),
              ('AJE-1', 'C-5', '2102', None, 25_000_000, 'Posted', 'Akrual beban listrik Des (contoh)')]
    for i, (no, ref, kode, dr, cr, st, ket) in enumerate(contoh):
        r = AJE_TOP + i
        ws[f'A{r}'] = no; ws[f'B{r}'] = ref; ws[f'C{r}'] = kode
        if dr: ws[f'E{r}'] = dr
        if cr: ws[f'F{r}'] = cr
        ws[f'G{r}'] = st; ws[f'H{r}'] = ket
    ws.freeze_panes = 'A6'
    protect(ws)
    return ws


WP_INDEX = [
    ('A. PERENCANAAN', [
        ('A-1', 'Penerimaan & Keberlanjutan Klien', 'SA 210 · ISQM 1'),
        ('A-2', 'Surat Perikatan Audit', 'SA 210'),
        ('A-3', 'Independensi & Etika Tim', 'Kode Etik · SA 220'),
        ('A-4', 'Strategi Audit Keseluruhan → 13_StrategyMemo', 'SA 300'),
        ('A-5', 'Materialitas → 11_Materialitas', 'SA 320'),
        ('A-6', 'Pemahaman Entitas & Lingkungannya', 'SA 315'),
        ('A-7', 'Register Risiko (RoMM) → 10_Risiko', 'SA 315'),
        ('A-8', 'Matriks Asersi → 23_Asersi', 'SA 315'),
        ('A-9', 'Pemahaman Pengendalian Internal → 12_ICFR', 'SA 315'),
        ('A-10', 'Prosedur Analitis Awal', 'SA 520'),
    ]),
    ('B. RESPONS RISIKO', [
        ('B-1', 'Program Audit → 02_Program', 'SA 330'),
        ('B-2', 'Uji Pengendalian (TOC) → 12_ICFR', 'SA 330'),
        ('B-3', 'Sampling Audit → 27_Sampling', 'SA 530'),
        ('B-4', 'Journal Entry Testing → 25_JET', 'SA 240'),
    ]),
    ('C. SUBSTANTIF PER SIKLUS', [
        ('C-1', 'Kas & Bank + Konfirmasi → 30_Konfirmasi', 'SA 505'),
        ('C-2', 'Piutang Usaha & Pendapatan', 'SA 505 · PSAK 72'),
        ('C-3', 'Persediaan & Stock Opname', 'SA 501'),
        ('C-4', 'Aset Tetap & Penyusutan', 'PSAK 16'),
        ('C-5', 'Utang Usaha & Beban Akrual', '—'),
        ('C-6', 'Pinjaman, Bunga & Covenant', '—'),
        ('C-7', 'Ekuitas & Korporasi', '—'),
        ('C-8', 'Payroll & Imbalan Kerja', 'PSAK 24'),
        ('C-9', 'Pajak & Book-Tax → 26_BookTax', 'PSAK 46'),
        ('C-10', 'Pihak Berelasi → 34_PihakBerelasi', 'SA 550'),
    ]),
    ('D. PENYELESAIAN & PELAPORAN', [
        ('D-1', 'Ikhtisar Salah Saji (SAD) → 37_SAD', 'SA 450'),
        ('D-2', 'Prosedur Analitis Akhir → 24_Analitis', 'SA 520'),
        ('D-3', 'Going Concern → 31_GC', 'SA 570'),
        ('D-4', 'Peristiwa Setelah Periode → 33_PeristiwaSetelah', 'SA 560'),
        ('D-5', 'Representasi Tertulis Manajemen', 'SA 580'),
        ('D-6', 'Evaluasi Kecukupan Bukti → 38_EvaluasiBukti', 'SA 500'),
        ('D-7', 'Daftar-Uji Pengungkapan → 41_Pengungkapan', 'PSAK'),
        ('D-8', 'Penelaahan Mutu (EQR) → 43_EQR', 'ISQM 2'),
        ('D-9', 'Opini & Laporan Auditor → 42_Opini', 'SA 700/705'),
        ('D-10', 'Management Letter → 44_ML', 'SA 260/265'),
        ('D-11', 'Perakitan Arsip Final (≤60 hari)', 'SA 230'),
    ]),
]
WP_FASE = {'A': 'Perencanaan', 'B': 'Pekerjaan Lapangan', 'C': 'Pekerjaan Lapangan', 'D': 'Penyelesaian'}
IWP_TOP, IWP_BOT = 6, 55


def build_indekswp(wb):
    ws = wb.create_sheet('22_IndeksWP')
    title(ws, '22 · Indeks Kertas Kerja & Sign-off',
          'Status turunan otomatis dari kolom sign-off. CATATAN: SoD (penyusun ≠ pereviu) TIDAK di-enforce Excel — disiplin tim.')
    widths(ws, {'A': 8, 'B': 46, 'C': 20, 'D': 16, 'E': 12, 'F': 16, 'G': 12, 'H': 16, 'I': 12, 'J': 12, 'K': 24})
    headrow(ws, 5, ['Ref', 'Kertas Kerja', 'Fase', 'Preparer', 'Tgl', 'Reviewer', 'Tgl', 'Partner', 'Tgl', 'Status', 'Standar / Ket'])
    r = IWP_TOP
    for section, items in WP_INDEX:
        cell(ws, f'A{r}', section, font=F_BOLD, fill=FILL_SUB)
        ws.merge_cells(f'A{r}:K{r}')
        r += 1
        for ref, judul, std in items:
            cell(ws, f'A{r}', ref, font=F_BOLD)
            cell(ws, f'B{r}', judul, wrap=True)
            cell(ws, f'C{r}', WP_FASE[ref[0]])
            for colref in ['D', 'F', 'H']:
                inp(ws, f'{colref}{r}')
            for colref in ['E', 'G', 'I']:
                inp(ws, f'{colref}{r}', fmt=DATE)
            frm(ws, f'J{r}', f'=IF($A{r}="","",IF($H{r}<>"","Final",IF($F{r}<>"","Direviu",IF($D{r}<>"","Disiapkan","Belum"))))', bold=True)
            cell(ws, f'K{r}', std, font=F_SMALL)
            r += 1
    global IWP_LAST
    IWP_LAST = r - 1
    for rr in range(r, IWP_BOT + 1):
        for colref in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K']:
            inp(ws, f'{colref}{rr}', fmt=DATE if colref in 'EGI' else None)
        frm(ws, f'J{rr}', f'=IF($A{rr}="","",IF($H{rr}<>"","Final",IF($F{rr}<>"","Direviu",IF($D{rr}<>"","Disiapkan","Belum"))))', bold=True)
    dv_name(ws, 'TIM', f'D{IWP_TOP}:D{IWP_BOT}')
    dv_name(ws, 'TIM', f'F{IWP_TOP}:F{IWP_BOT}')
    dv_name(ws, 'TIM', f'H{IWP_TOP}:H{IWP_BOT}')
    dv_name(ws, 'LIST_FASE', f'C{IWP_TOP}:C{IWP_BOT}')
    ws.freeze_panes = 'A6'
    protect(ws)
    return ws


ASERSI_COLS = ['Keberadaan/ Keterjadian', 'Kelengkapan', 'Akurasi/ Penilaian', 'Pisah Batas', 'Klasifikasi', 'Hak & Kewajiban', 'Penyajian']


def build_asersi(wb):
    ws = wb.create_sheet('23_Asersi')
    title(ws, '23 · Matriks Asersi per Akun Signifikan (SA 315)',
          'Tandai "x" pada asersi relevan. Flag GAP bila ada asersi relevan tetapi belum ada referensi WP.')
    widths(ws, {'A': 30, 'B': 17, 'C': 12, 'D': 12, 'E': 12, 'F': 12, 'G': 12, 'H': 12, 'I': 12, 'J': 12, 'K': 18})
    headrow(ws, 5, ['Akun / Area Signifikan', 'Saldo Final'] + ASERSI_COLS + ['Ref WP', 'Flag'])
    # kolom: A akun, B saldo, C..I asersi, J ref, K flag — geser: 2 + 7 = 9 → J=ref, K=flag
    for r in range(6, 36):
        inp(ws, f'A{r}')
        frm(ws, f'B{r}', f'=IF($A{r}="","",IFERROR(SUMIFS(\'20_WTB\'!$J${WTB_TOP}:$J${WTB_BOT},\'20_WTB\'!$B${WTB_TOP}:$B${WTB_BOT},$A{r}),0))', fmt=RP, link=True)
        for colref in ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']:
            inp(ws, f'{colref}{r}')
        frm(ws, f'K{r}', f'=IF($A{r}="","",IF(COUNTIF(C{r}:I{r},"x")=0,"—",IF($J{r}="","GAP — tanpa WP","OK")))', bold=True)
    note(ws, 'A37', 'Sumber saldo: match nama akun WTB (kolom B) — atau ketik manual bila area gabungan beberapa akun.')
    ws.freeze_panes = 'A6'
    protect(ws)
    return ws


def build_analitis(wb):
    ws = wb.create_sheet('24_Analitis')
    title(ws, '24 · Analytical Review (SA 520)',
          'Flux CY final vs PY audited. Flag INVESTIGASI bila |Δ| > CTT DAN |Δ%| > ambang.')
    widths(ws, {'A': 10, 'B': 38, 'C': 17, 'D': 17, 'E': 16, 'F': 10, 'G': 14, 'H': 40, 'I': 30})
    cell(ws, 'A3', 'Ambang Δ%:', font=F_BOLD, border=False)
    inp(ws, 'B3', 0.10, fmt=PCT0, assum=True)
    cell(ws, 'C3', 'CTT (dari 11_Materialitas):', font=F_BOLD, border=False)
    frm(ws, 'D3', '=MAT_CTT', fmt=RP, bold=True, link=True)
    headrow(ws, 5, ['Kode', 'Nama Akun', 'Saldo PY', 'Saldo Final CY', 'Δ (Rp)', 'Δ %', 'Flag', 'Penjelasan Manajemen / Analisis', 'Kesimpulan Auditor'])
    for r in range(6, 6 + (WTB_BOT - WTB_TOP + 1)):
        w = WTB_TOP + (r - 6)
        frm(ws, f'A{r}', f'=IF(\'20_WTB\'!A{w}="","",\'20_WTB\'!A{w})', link=True)
        frm(ws, f'B{r}', f'=IF($A{r}="","",\'20_WTB\'!B{w})', link=True)
        frm(ws, f'C{r}', f'=IF($A{r}="","",\'20_WTB\'!D{w})', fmt=RP, link=True)
        frm(ws, f'D{r}', f'=IF($A{r}="","",\'20_WTB\'!J{w})', fmt=RP, link=True)
        frm(ws, f'E{r}', f'=IF($A{r}="","",D{r}-C{r})', fmt=RP)
        frm(ws, f'F{r}', f'=IF($A{r}="","",IF(C{r}=0,"",E{r}/ABS(C{r})))', fmt=PCT)
        frm(ws, f'G{r}', f'=IF($A{r}="","",IF(AND(ABS(E{r})>MAT_CTT,IF(F{r}="",TRUE,ABS(F{r})>$B$3)),"INVESTIGASI",""))', bold=True)
        inp(ws, f'H{r}')
        inp(ws, f'I{r}')
    ws.freeze_panes = 'A6'
    protect(ws)
    return ws


def build_jet(wb):
    ws = wb.create_sheet('25_JET')
    title(ws, '25 · Journal Entry Testing (SA 240)',
          'Tempel GL pada kolom A–G (maks 3.000 baris — lihat PETUNJUK untuk perluasan). Helper & Benford otomatis.')
    widths(ws, {'A': 12, 'B': 12, 'C': 12, 'D': 34, 'E': 12, 'F': 15, 'G': 15, 'H': 15, 'I': 8, 'J': 9, 'K': 9, 'L': 10, 'M': 9,
                'O': 8, 'P': 12, 'Q': 12, 'R': 12, 'S': 10})
    headrow(ws, 5, ['Tanggal', 'No Jurnal', 'Kode Akun', 'Deskripsi', 'User', 'Debit', 'Kredit',
                    'Nilai', 'Digit-1', 'Wknd', 'Bulat', 'Dekat CTT', '≥ OM'])
    for r in range(JET_TOP, JET_BOT + 1):
        for colref in ['A', 'B', 'C', 'D', 'E', 'F', 'G']:
            inp(ws, f'{colref}{r}', fmt=DATE if colref == 'A' else (RP if colref in 'FG' else None))
        frm(ws, f'H{r}', f'=IF($A{r}="","",MAX(N(F{r}),N(G{r})))', fmt=RP)
        frm(ws, f'I{r}', f'=IF($H{r}="","",IF($H{r}<=0,"",LEFT(TEXT($H{r},"0"),1)))')
        frm(ws, f'J{r}', f'=IF($A{r}="","",--(WEEKDAY($A{r},2)>5))', fmt=NUM)
        frm(ws, f'K{r}', f'=IF($H{r}="","",IF($H{r}=0,0,--(MOD($H{r},1000000)=0)))', fmt=NUM)
        frm(ws, f'L{r}', f'=IF($H{r}="","",--(AND($H{r}>=0.9*MAT_CTT,$H{r}<MAT_CTT)))', fmt=NUM)
        frm(ws, f'M{r}', f'=IF($H{r}="","",--($H{r}>=MAT_OM))', fmt=NUM)
    # Ringkasan Benford + counter (kolom O..S, baris 5..17)
    headrow(ws, 5, ['Digit', 'Ekspektasi', 'Aktual', 'Deviasi', 'Flag'], start=15)
    for d in range(1, 10):
        r = 5 + d
        cell(ws, f'O{r}', d, align='center')
        frm(ws, f'P{r}', f'=LOG10(1+1/O{r})', fmt=PCT)
        frm(ws, f'Q{r}', f'=IF($Q$16=0,"",COUNTIF($I${JET_TOP}:$I${JET_BOT},TEXT(O{r},"0"))/$Q$16)', fmt=PCT)
        frm(ws, f'R{r}', f'=IF(Q{r}="","",Q{r}-P{r})', fmt=PCT)
        frm(ws, f'S{r}', f'=IF(R{r}="","",IF(ABS(R{r})>0.03,"⚠",""))', bold=True)
    cell(ws, 'P16', 'N (digit 1–9):', font=F_BOLD, fill=FILL_GREY)
    frm(ws, 'Q16', f'=SUMPRODUCT(COUNTIF($I${JET_TOP}:$I${JET_BOT},{{"1";"2";"3";"4";"5";"6";"7";"8";"9"}}))', fmt=NUM, bold=True, fill=FILL_GREY)
    rows = [('Entri akhir pekan', 'J'), ('Angka bulat (kelipatan Rp 1 jt)', 'K'), ('Dekat CTT (90–100%)', 'L'), ('≥ Materialitas (OM)', 'M')]
    for i, (lbl, colref) in enumerate(rows):
        r = 18 + i
        cell(ws, f'P{r}', lbl, fill=FILL_GREY)
        frm(ws, f'Q{r}', f'=SUM({colref}${JET_TOP}:{colref}${JET_BOT})', fmt=NUM, bold=True, fill=FILL_GREY)
    contoh = [('2025-12-31', 'JV-9001', '6101', 'Penyesuaian akhir tahun (contoh)', 'admin', 15_000_000, None),
              ('2025-12-28', 'JV-8990', '4101', 'Koreksi pendapatan (contoh)', 'staf1', None, 9_999_999),
              ('2025-11-15', 'JV-7551', '5101', 'Pembelian rutin (contoh)', 'staf2', 125_400_000, None)]
    from datetime import datetime
    for i, (tgl, no, kode, desc, user, dr, cr) in enumerate(contoh):
        r = JET_TOP + i
        ws[f'A{r}'] = datetime.strptime(tgl, '%Y-%m-%d')
        ws[f'B{r}'] = no; ws[f'C{r}'] = kode; ws[f'D{r}'] = desc; ws[f'E{r}'] = user
        if dr: ws[f'F{r}'] = dr
        if cr: ws[f'G{r}'] = cr
    ws.freeze_panes = 'A6'
    protect(ws)
    return ws


def build_booktax(wb):
    ws = wb.create_sheet('26_BookTax')
    title(ws, '26 · Rekonsiliasi Book–Tax (Diagnostik Deterministik)',
          'Subset deterministik modul Tax Audit Diagnostic Asseris (narasi AI tidak tersedia di Excel).')
    widths(ws, {'A': 52, 'B': 18, 'C': 40})
    cell(ws, 'A4', 'Laba akuntansi sebelum pajak (dari WTB)', font=F_BOLD)
    frm(ws, 'B4', '=' + sum_cats("'20_WTB'!$J$6:$J$155", "'20_WTB'!$C$6:$C$155", MAP_LR_PRATAX_L, neg=True), fmt=RP, bold=True, link=True)
    cell(ws, 'A6', 'KOREKSI FISKAL (+/−) — positif menambah penghasilan kena pajak', font=F_BOLD, fill=FILL_SUB)
    ws.merge_cells('A6:C6')
    headrow(ws, 7, ['Uraian Koreksi', 'Jumlah (+/−)', 'Dasar / Referensi'])
    for r in range(8, 28):
        inp(ws, f'A{r}')
        inp(ws, f'B{r}', fmt=RP)
        inp(ws, f'C{r}')
    ws['A8'] = 'Beban tanpa daftar nominatif (contoh)'; ws['B8'] = 12_000_000
    cell(ws, 'A29', 'Penghasilan Kena Pajak', font=F_BOLD, fill=FILL_GREY)
    frm(ws, 'B29', '=B4+SUM(B8:B28)', fmt=RP, bold=True, fill=FILL_GREY)
    cell(ws, 'A30', 'Tarif PPh Badan')
    inp(ws, 'B30', 0.22, fmt=PCT0, assum=True)
    cell(ws, 'A31', 'PPh terutang (hitung)', font=F_BOLD)
    frm(ws, 'B31', '=IF(B29<=0,0,ROUND(B29*B30,0))', fmt=RP, bold=True)
    cell(ws, 'A32', 'Beban pajak kini per buku (WTB)')
    frm(ws, 'B32', '=SUMIFS(\'20_WTB\'!$J$6:$J$155,\'20_WTB\'!$C$6:$C$155,"Beban Pajak Kini")', fmt=RP, link=True)
    cell(ws, 'A33', 'Selisih (indikasi eksposur / lebih catat)', font=F_BOLD)
    frm(ws, 'B33', '=B31-B32', fmt=RP, bold=True)
    frm(ws, 'C33', '=IF(ABS(B33)>MAT_CTT,"⚠ > CTT — investigasi","OK (≤ CTT)")', bold=True)
    protect(ws)
    return ws


def build_sampling(wb):
    ws = wb.create_sheet('27_Sampling')
    title(ws, '27 · Sampling Audit — MUS (SA 530)',
          'Monetary Unit Sampling: n = Populasi × RF ÷ (TM − ES × Faktor Ekspansi). Default TM = PM (kanon Asseris).')
    widths(ws, {'A': 40, 'B': 20, 'C': 8, 'D': 14, 'E': 26, 'F': 16, 'G': 16, 'H': 16, 'I': 16, 'J': 16})
    params = [
        ('Populasi (nilai buku, Rp)', 2_000_000_000, RP, False),
        ('Risiko salah penerimaan', 'Moderat', None, False),
        ('Faktor keandalan (RF)', '=VLOOKUP(B6,RF_MUS,2,0)', '0.00', None),
        ('Override TM (kosongkan = pakai PM)', None, RP, False),
        ('Tolerable Misstatement (TM) efektif', '=IF(B8="",MAT_PM,B8)', RP, None),
        ('Salah saji diperkirakan (ES)', 0, RP, False),
        ('Faktor ekspansi', 1.6, '0.0', True),
        ('Ukuran sampel (n)', '=IF(B9-B10*B11<=0,"TM terlalu kecil",ROUNDUP(B5*B7/(B9-B10*B11),0))', NUM, None),
        ('Interval sampling (J)', '=IF(ISNUMBER(B12),ROUND(B5/B12,0),"")', RP, None),
        ('Titik awal acak (≤ interval)', 1_234_567, RP, False),
    ]
    for i, (lbl, val, fmt_, assum) in enumerate(params):
        r = 5 + i
        cell(ws, f'A{r}', lbl)
        if assum is None:
            frm(ws, f'B{r}', val, fmt=fmt_, bold=True)
        else:
            inp(ws, f'B{r}', val, fmt=fmt_, assum=assum)
    dv_name(ws, 'LIST_LMH', 'B6')
    cell(ws, 'A16', 'EVALUASI', font=F_BOLD, fill=FILL_SUB, border=False)
    frm(ws, 'B16', '=IF(ISNUMBER(H20),IF(H20+B10<B9,"DAPAT DITERIMA — proyeksi + ES < TM","TIDAK DAPAT DITERIMA — perluas pengujian"),"")', bold=True)
    ws.merge_cells('B16:F16')
    cell(ws, 'G20', 'Σ Proyeksi:', font=F_BOLD, fill=FILL_GREY)
    frm(ws, 'H20', '=IF(COUNT(H22:H521)=0,0,SUM(H22:H521))', fmt=RP, bold=True, fill=FILL_GREY)
    headrow(ws, 21, ['k', 'Titik Seleksi (Rp kumulatif)', '', '', 'Item / No Dokumen', 'Nilai Buku', 'Nilai Audit', 'Proyeksi Salah Saji', '', 'Catatan'])
    for i in range(500):
        r = 22 + i
        cell(ws, f'A{r}', i + 1, align='center')
        frm(ws, f'B{r}', f'=IF(ISNUMBER($B$12),IF(A{r}<=$B$12,$B$14+(A{r}-1)*$B$13,""),"")', fmt=RP)
        inp(ws, f'E{r}')
        inp(ws, f'F{r}', fmt=RP)
        inp(ws, f'G{r}', fmt=RP)
        frm(ws, f'H{r}', f'=IF(OR(F{r}="",G{r}=""),"",IF(F{r}>=$B$13,F{r}-G{r},IF(F{r}=0,0,(F{r}-G{r})/F{r}*$B$13)))', fmt=RP)
        inp(ws, f'J{r}')
    ws.freeze_panes = 'A22'
    protect(ws)
    return ws
