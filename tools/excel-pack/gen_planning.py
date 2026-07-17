"""Core Planning: 10_Risiko, 11_Materialitas, 12_ICFR, 13_StrategyMemo."""
from xhelp import *
from gen_ref_setup import sum_cats, MAP_LR_PRATAX_L, MAP_ASET_L, MAP_EK_LR_L

WTB_J = "'20_WTB'!$J$6:$J$155"
WTB_C = "'20_WTB'!$C$6:$C$155"


def build_risiko(wb):
    ws = wb.create_sheet('10_Risiko')
    title(ws, '10 · Register Risiko Salah Saji Material (SA 315/330)',
          'RoMM = kombinasi Risiko Inheren × Risiko Pengendalian (matriks kanon). Risiko signifikan wajib respons substantif.')
    widths(ws, {'A': 8, 'B': 20, 'C': 44, 'D': 24, 'E': 9, 'F': 12, 'G': 12, 'H': 12, 'I': 18, 'J': 44, 'K': 10})
    headrow(ws, 5, ['Kode', 'Area / Siklus', 'Deskripsi Risiko', 'Asersi Terdampak', 'Fraud?',
                    'R. Inheren', 'R. Pengendalian', 'RoMM', 'Klasifikasi', 'Respons Audit Direncanakan', 'Ref WP'])
    for r in range(6, 36):
        for colref in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I', 'J', 'K']:
            inp(ws, f'{colref}{r}')
        frm(ws, f'H{r}', f'=IF(OR($F{r}="",$G{r}=""),"",VLOOKUP($F{r}&"|"&$G{r},ROMM_TBL,2,0))', bold=True)
    for name, rng in [('LIST_ASERSI', 'D6:D35'), ('LIST_YATIDAK', 'E6:E35'), ('LIST_LMH', 'F6:F35'),
                      ('LIST_LMH', 'G6:G35'), ('LIST_SIGNIF', 'I6:I35')]:
        dv_name(ws, name, rng)
    contoh = [
        ('R-01', 'Pendapatan', 'Presumsi risiko fraud pengakuan pendapatan — pengakuan dini menjelang tutup buku (contoh)',
         'Pisah Batas', 'Ya', 'Tinggi', 'Moderat', 'Risiko Signifikan', 'Cutoff 2 sisi ±10 hari; vouching ke BAST; JET filter Desember', 'C-2'),
        ('R-02', 'Persediaan', 'Penilaian NRV persediaan lambat bergerak (contoh)',
         'Akurasi/Penilaian', 'Tidak', 'Moderat', 'Moderat', 'Signifikan', 'Uji NRV vs harga jual setelah tanggal neraca; reviu aging', 'C-3'),
    ]
    for i, row in enumerate(contoh):
        r = 6 + i
        for j, v in enumerate(row):
            col = 'ABCDEFGIJK'[j]
            ws[f'{col}{r}'] = v
    cell(ws, 'A37', 'Jumlah risiko:', font=F_BOLD, border=False)
    frm(ws, 'B37', '=COUNTIF(A6:A35,"<>")-COUNTBLANK(A6:A35)+COUNTA(A6:A35)', fmt=NUM, bold=True)
    ws['B37'] = '=COUNTA(A6:A35)'
    cell(ws, 'C37', 'Risiko signifikan:', font=F_BOLD, border=False)
    frm(ws, 'D37', '=COUNTIF(I6:I35,"Risiko Signifikan")+COUNTIF(I6:I35,"Signifikan")', fmt=NUM, bold=True)
    ws.freeze_panes = 'A6'
    protect(ws)
    return ws


def build_materialitas(wb):
    ws = wb.create_sheet('11_Materialitas')
    title(ws, '11 · Materialitas (SA 320) — Sumber Kebenaran Tunggal',
          'OM = benchmark × %.  PM = %PM × OM.  CTT = %CTT × OM.  Default kanon Asseris: 5% · 75% · 5%. '
          'Nilai benchmark ditarik LIVE dari 20_WTB.')
    widths(ws, {'A': 34, 'B': 20, 'C': 24, 'D': 40})
    headrow(ws, 5, ['Benchmark', 'Nilai (dari WTB)', '% Lazim', 'Catatan'])
    bench = [
        ('Laba Sebelum Pajak', '=' + sum_cats(WTB_J, WTB_C, MAP_LR_PRATAX_L, neg=True), '3% – 10%', 'Entitas berorientasi laba (default kanon)'),
        ('Pendapatan', "=-SUMIFS('20_WTB'!$J$6:$J$155,'20_WTB'!$C$6:$C$155,\"Pendapatan\")", '0,5% – 3%', 'Laba fluktuatif / mendekati impas'),
        ('Total Aset', '=' + sum_cats(WTB_J, WTB_C, MAP_ASET_L), '0,5% – 2%', 'Entitas padat aset / investasi'),
        ('Ekuitas (termasuk laba berjalan)', '=' + sum_cats(WTB_J, WTB_C, MAP_EK_LR_L, neg=True), '1% – 5%', 'Entitas jasa keuangan / rugi'),
    ]
    for i, (lbl, f, pct_, ket) in enumerate(bench):
        r = 6 + i
        cell(ws, f'A{r}', lbl)
        frm(ws, f'B{r}', f, fmt=RP, link=True)
        cell(ws, f'C{r}', pct_, align='center')
        cell(ws, f'D{r}', ket, font=F_SMALL, wrap=True)

    rows = [
        ('Benchmark dipilih', 'Laba Sebelum Pajak', None, 'input-assum'),
        ('% Materialitas (OM)', 0.05, PCT, 'input-assum'),
        ('OM hitung (benchmark × %)', '=IFERROR(INDEX($B$6:$B$9,MATCH($B$11,$A$6:$A$9,0))*$B$12,"")', RP, 'frm'),
        ('Override OM (kosongkan bila tidak)', None, RP, 'input'),
        ('OM — MATERIALITAS BERLAKU', '=IF($B$14="",$B$13,$B$14)', RP, 'frm'),
        ('% Materialitas Pelaksanaan (PM)', 0.75, PCT0, 'input-assum'),
        ('PM — MATERIALITAS PELAKSANAAN', '=ROUND($B$15*$B$16,0)', RP, 'frm'),
        ('% Ambang Salah Saji Jelas Tidak Penting (CTT)', 0.05, PCT0, 'input-assum'),
        ('CTT — AMBANG', '=ROUND($B$15*$B$18,0)', RP, 'frm'),
    ]
    for i, (lbl, val, fmt_, kind) in enumerate(rows):
        r = 11 + i
        cell(ws, f'A{r}', lbl, font=F_BOLD if 'BERLAKU' in lbl or lbl.startswith(('PM', 'CTT')) else F_BASE)
        if kind == 'frm':
            frm(ws, f'B{r}', val, fmt=fmt_, bold=True, fill=FILL_GREY)
        else:
            inp(ws, f'B{r}', val, fmt=fmt_, assum=(kind == 'input-assum'))
    dv_name(ws, 'BENCH_LABELS', 'B11')
    cell(ws, 'A21', 'Dasar pertimbangan pemilihan benchmark & persentase (SA 320.A4–A13):', font=F_BOLD, border=False)
    for r in range(22, 26):
        inp(ws, f'A{r}')
        ws.merge_cells(f'A{r}:D{r}')
    note(ws, 'A27', 'Named ranges: MAT_OM = B15 · MAT_PM = B17 · MAT_CTT = B19 — dipakai seluruh workbook. '
                    'Revisi materialitas saat audit berlangsung: dokumentasikan alasan di atas.')
    protect(ws)
    return ws


def build_icfr(wb):
    ws = wb.create_sheet('12_ICFR')
    title(ws, '12 · Pemahaman & Pengujian Pengendalian Internal (SA 315/330)',
          'Level entitas (COSO) + pengendalian kunci per siklus. Bila TOC tidak efektif → strategi full substantif.')
    widths(ws, {'A': 34, 'B': 14, 'C': 50, 'D': 12})
    cell(ws, 'A4', 'A. PENGENDALIAN LEVEL ENTITAS (COSO)', font=F_BOLD, fill=FILL_SUB, border=False)
    headrow(ws, 5, ['Komponen', 'Penilaian', 'Catatan / Bukti Pemahaman', 'Ref WP'])
    coso = ['Lingkungan Pengendalian', 'Penilaian Risiko Entitas', 'Aktivitas Pengendalian',
            'Informasi & Komunikasi', 'Pemantauan', 'Pengendalian Umum TI (ITGC)']
    for i, komp in enumerate(coso):
        r = 6 + i
        cell(ws, f'A{r}', komp)
        inp(ws, f'B{r}')
        inp(ws, f'C{r}')
        inp(ws, f'D{r}')
    dv_name(ws, 'LIST_LMH', 'B6:B11')

    cell(ws, 'A14', 'B. PENGENDALIAN KUNCI PER SIKLUS & UJI PENGENDALIAN (TOC)', font=F_BOLD, fill=FILL_SUB, border=False)
    headrow(ws, 15, ['Siklus / Pengendalian Kunci', 'D&I OK?', 'Prosedur & Hasil TOC', 'Hasil TOC'])
    cell(ws, 'E15', 'Strategi', font=F_HEAD, fill=FILL_HEAD, align='center')
    ws.column_dimensions['E'].width = 24
    for r in range(16, 36):
        inp(ws, f'A{r}')
        inp(ws, f'B{r}')
        inp(ws, f'C{r}')
        inp(ws, f'D{r}')
        frm(ws, f'E{r}', f'=IF($A{r}="","",IF($D{r}="Efektif","Dapat mengandalkan pengendalian","Full substantif"))', bold=True)
    dv_name(ws, 'LIST_YATIDAK', 'B16:B35')
    dv_name(ws, 'LIST_TOC', 'D16:D35')
    ws['A16'] = 'Penjualan — otorisasi kredit & pencocokan 3 arah (contoh)'
    ws['B16'] = 'Ya'
    ws['D16'] = 'Tidak Diuji'
    protect(ws)
    return ws


def build_strategy(wb):
    ws = wb.create_sheet('13_StrategyMemo')
    title(ws, '13 · Memorandum Strategi Audit Keseluruhan (SA 300/330)',
          'Ringkasan strategi; angka ditarik live dari modul lain — tidak diketik ulang.')
    widths(ws, {'A': 36, 'B': 26, 'C': 26, 'D': 26})
    r = 4
    cell(ws, f'A{r}', 'RINGKASAN KUNCI (live)', font=F_BOLD, fill=FILL_SUB, border=False); r += 1
    pairs = [
        ('Klien / Periode', '=KLIEN&" — "&TEXT(PERIODE_AKHIR,"dd/mm/yyyy")'),
        ('Materialitas (OM / PM / CTT)', '=TEXT(MAT_OM,"#,##0")&" / "&TEXT(MAT_PM,"#,##0")&" / "&TEXT(MAT_CTT,"#,##0")'),
        ('Jumlah risiko teridentifikasi', "=COUNTA('10_Risiko'!A6:A35)"),
        ('— di antaranya signifikan', '=\'10_Risiko\'!D37'),
        ('Status WTB', "='20_WTB'!K3"),
    ]
    for lbl, f in pairs:
        cell(ws, f'A{r}', lbl)
        frm(ws, f'B{r}', f, bold=True, link=True)
        ws.merge_cells(f'B{r}:D{r}')
        r += 1
    r += 1
    sections = [
        'Karakteristik perikatan, kerangka pelaporan & lingkup',
        'Fokus area berisiko & arah respons (rujuk 10_Risiko)',
        'Penggunaan pakar / auditor komponen / organisasi jasa',
        'Rencana keterlibatan EQR & konsultasi',
        'Susunan tim, supervisi & jadwal tonggak (rujuk 05_Timeline)',
    ]
    for s in sections:
        cell(ws, f'A{r}', s, font=F_BOLD, fill=FILL_SUB, border=False)
        r += 1
        for rr in range(r, r + 3):
            inp(ws, f'A{rr}')
            ws.merge_cells(f'A{rr}:D{rr}')
        r += 4
    cell(ws, f'A{r}', 'PERSETUJUAN', font=F_BOLD, fill=FILL_SUB, border=False); r += 1
    headrow(ws, r, ['Peran', 'Nama', 'Tanda Tangan / Inisial', 'Tanggal'])
    r += 1
    for i, peran in enumerate(['Disusun — Senior/Manajer', 'Direviu — Manajer/Partner', 'Disetujui — Rekan Perikatan']):
        cell(ws, f'A{r + i}', peran)
        inp(ws, f'B{r + i}')
        inp(ws, f'C{r + i}')
        inp(ws, f'D{r + i}', fmt=DATE)
    protect(ws)
    return ws
