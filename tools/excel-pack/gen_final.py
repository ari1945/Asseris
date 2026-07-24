"""3 · Penyelesaian & Pelaporan: 40_LK, 41_Pengungkapan, 42_Opini, 43_EQR, 44_ML, 90_MatriksSA."""
from xhelp import *
from gen_ref_setup import MAP_AL, MAP_ATL, MAP_LJPDK, MAP_LJPJG, MAP_EK, MAP_LR, sum_cats

WTB_J = "'20_WTB'!$J$6:$J$155"
WTB_D = "'20_WTB'!$D$6:$D$155"
WTB_C = "'20_WTB'!$C$6:$C$155"


def _sumifs(col, cat, neg=False):
    s = f'SUMIFS({col},{WTB_C},"{cat}")'
    return f'=-({s})' if neg else f'={s}'


def build_lk(wb):
    ws = wb.create_sheet('40_LK')
    title(ws, '40 · Draf Laporan Keuangan (dari mapping WTB)',
          'Seluruh angka = SUMIFS atas kolom Mapping LK di 20_WTB. Arus kas metode tidak langsung — mengikat exact ke mutasi TB.')
    widths(ws, {'A': 44, 'B': 18, 'C': 18})
    r = 4
    cell(ws, f'A{r}', 'LAPORAN POSISI KEUANGAN', font=F_BOLD, fill=FILL_SUB, border=False)
    frm(ws, f'B{r}', '=TEXT(PERIODE_AKHIR,"dd/mm/yyyy")', bold=True, link=True)
    cell(ws, f'C{r}', 'Tahun Lalu', font=F_BOLD, align='center')
    r += 1

    def section(rows_, label, neg, subtotal_label):
        nonlocal r
        cell(ws, f'A{r}', label, font=F_BOLD)
        r += 1
        first = r
        for cat in rows_:
            cell(ws, f'A{r}', '   ' + cat)
            frm(ws, f'B{r}', _sumifs(WTB_J, cat, neg), fmt=RP)
            frm(ws, f'C{r}', _sumifs(WTB_D, cat, neg), fmt=RP)
            r += 1
        cell(ws, f'A{r}', subtotal_label, font=F_BOLD, fill=FILL_GREY)
        frm(ws, f'B{r}', f'=SUM(B{first}:B{r - 1})', fmt=RP, bold=True, fill=FILL_GREY)
        frm(ws, f'C{r}', f'=SUM(C{first}:C{r - 1})', fmt=RP, bold=True, fill=FILL_GREY)
        r += 1
        return r - 1  # baris subtotal

    st_al = section(MAP_AL, 'ASET LANCAR', False, 'Jumlah Aset Lancar')
    st_atl = section(MAP_ATL, 'ASET TIDAK LANCAR', False, 'Jumlah Aset Tidak Lancar')
    cell(ws, f'A{r}', 'JUMLAH ASET', font=F_BOLD, fill=FILL_SUB)
    frm(ws, f'B{r}', f'=B{st_al}+B{st_atl}', fmt=RP, bold=True, fill=FILL_SUB)
    frm(ws, f'C{r}', f'=C{st_al}+C{st_atl}', fmt=RP, bold=True, fill=FILL_SUB)
    tot_aset = r
    r += 2
    st_ljpdk = section(MAP_LJPDK, 'LIABILITAS JANGKA PENDEK', True, 'Jumlah Liabilitas Jangka Pendek')
    st_ljpjg = section(MAP_LJPJG, 'LIABILITAS JANGKA PANJANG', True, 'Jumlah Liabilitas Jangka Panjang')
    # Ekuitas + laba berjalan
    cell(ws, f'A{r}', 'EKUITAS', font=F_BOLD)
    r += 1
    ek_first = r
    for cat in MAP_EK:
        cell(ws, f'A{r}', '   ' + cat)
        frm(ws, f'B{r}', _sumifs(WTB_J, cat, True), fmt=RP)
        frm(ws, f'C{r}', _sumifs(WTB_D, cat, True), fmt=RP)
        r += 1
    cell(ws, f'A{r}', '   Laba (rugi) tahun berjalan')
    frm(ws, f'B{r}', '=' + sum_cats(WTB_J, WTB_C, MAP_LR, neg=True), fmt=RP)
    frm(ws, f'C{r}', '=' + sum_cats(WTB_D, WTB_C, MAP_LR, neg=True), fmt=RP)
    r += 1
    cell(ws, f'A{r}', 'Jumlah Ekuitas', font=F_BOLD, fill=FILL_GREY)
    frm(ws, f'B{r}', f'=SUM(B{ek_first}:B{r - 1})', fmt=RP, bold=True, fill=FILL_GREY)
    frm(ws, f'C{r}', f'=SUM(C{ek_first}:C{r - 1})', fmt=RP, bold=True, fill=FILL_GREY)
    st_ek = r
    r += 1
    cell(ws, f'A{r}', 'JUMLAH LIABILITAS & EKUITAS', font=F_BOLD, fill=FILL_SUB)
    frm(ws, f'B{r}', f'=B{st_ljpdk}+B{st_ljpjg}+B{st_ek}', fmt=RP, bold=True, fill=FILL_SUB)
    frm(ws, f'C{r}', f'=C{st_ljpdk}+C{st_ljpjg}+C{st_ek}', fmt=RP, bold=True, fill=FILL_SUB)
    tot_le = r
    r += 1
    cell(ws, f'A{r}', 'CHECK (Aset − Liab&Ekuitas, harus 0)', font=F_SMALL)
    frm(ws, f'B{r}', f'=B{tot_aset}-B{tot_le}', fmt=RP)
    frm(ws, f'C{r}', f'=C{tot_aset}-C{tot_le}', fmt=RP)
    r += 2

    cell(ws, f'A{r}', 'LAPORAN LABA RUGI', font=F_BOLD, fill=FILL_SUB, border=False)
    r += 1
    lr_cells = {}
    for cat in MAP_LR:
        cell(ws, f'A{r}', '   ' + cat)
        frm(ws, f'B{r}', _sumifs(WTB_J, cat, True), fmt=RP)
        frm(ws, f'C{r}', _sumifs(WTB_D, cat, True), fmt=RP)
        lr_cells[cat] = r
        r += 1
        if cat == 'Beban Pokok Pendapatan':
            cell(ws, f'A{r}', 'LABA KOTOR', font=F_BOLD, fill=FILL_GREY)
            frm(ws, f'B{r}', f'=SUM(B{lr_cells["Pendapatan"]}:B{r - 1})', fmt=RP, bold=True, fill=FILL_GREY)
            frm(ws, f'C{r}', f'=SUM(C{lr_cells["Pendapatan"]}:C{r - 1})', fmt=RP, bold=True, fill=FILL_GREY)
            r += 1
        if cat == 'Beban (Manfaat) Pajak Tangguhan':
            pass
    first_lr = lr_cells['Pendapatan']
    last_pratax = lr_cells['Beban Keuangan']
    cell(ws, f'A{r}', 'LABA SEBELUM PAJAK', font=F_BOLD, fill=FILL_GREY)
    frm(ws, f'B{r}', f'=SUM(B{first_lr}:B{last_pratax})-B{lr_cells["Beban Pokok Pendapatan"] + 1}', fmt=RP, bold=True, fill=FILL_GREY)
    frm(ws, f'C{r}', f'=SUM(C{first_lr}:C{last_pratax})-C{lr_cells["Beban Pokok Pendapatan"] + 1}', fmt=RP, bold=True, fill=FILL_GREY)
    pbt = r
    r += 1
    cell(ws, f'A{r}', 'LABA (RUGI) BERSIH', font=F_BOLD, fill=FILL_SUB)
    frm(ws, f'B{r}', f'=B{pbt}+B{lr_cells["Beban Pajak Kini"]}+B{lr_cells["Beban (Manfaat) Pajak Tangguhan"]}', fmt=RP, bold=True, fill=FILL_SUB)
    frm(ws, f'C{r}', f'=C{pbt}+C{lr_cells["Beban Pajak Kini"]}+C{lr_cells["Beban (Manfaat) Pajak Tangguhan"]}', fmt=RP, bold=True, fill=FILL_SUB)
    laba_bersih = r
    r += 2

    cell(ws, f'A{r}', 'LAPORAN ARUS KAS (metode tidak langsung — level TB)', font=F_BOLD, fill=FILL_SUB, border=False)
    r += 1
    cell(ws, f'A{r}', '   Laba (rugi) tahun berjalan')
    frm(ws, f'B{r}', f'=B{laba_bersih}', fmt=RP, link=True)
    cfo_first = r
    r += 1
    cell(ws, f'A{r}', '   Eliminasi L/R tahun lalu di TB (tertutup ke saldo laba)')
    frm(ws, f'B{r}', '=' + sum_cats(WTB_D, WTB_C, MAP_LR), fmt=RP)
    r += 1
    for cat in [c for c in MAP_AL if c != 'Kas & Setara Kas'] + MAP_LJPDK:
        cell(ws, f'A{r}', f'   Mutasi {cat}')
        frm(ws, f'B{r}', f'=-(SUMIFS({WTB_J},{WTB_C},"{cat}")-SUMIFS({WTB_D},{WTB_C},"{cat}"))', fmt=RP)
        r += 1
    cell(ws, f'A{r}', 'Kas Neto dari Aktivitas Operasi', font=F_BOLD, fill=FILL_GREY)
    frm(ws, f'B{r}', f'=SUM(B{cfo_first}:B{r - 1})', fmt=RP, bold=True, fill=FILL_GREY)
    cfo = r
    r += 1
    cfi_first = r
    for cat in MAP_ATL:
        cell(ws, f'A{r}', f'   Mutasi {cat}')
        frm(ws, f'B{r}', f'=-(SUMIFS({WTB_J},{WTB_C},"{cat}")-SUMIFS({WTB_D},{WTB_C},"{cat}"))', fmt=RP)
        r += 1
    cell(ws, f'A{r}', 'Kas Neto untuk Aktivitas Investasi', font=F_BOLD, fill=FILL_GREY)
    frm(ws, f'B{r}', f'=SUM(B{cfi_first}:B{r - 1})', fmt=RP, bold=True, fill=FILL_GREY)
    cfi = r
    r += 1
    cff_first = r
    for cat in MAP_LJPJG + MAP_EK:
        cell(ws, f'A{r}', f'   Mutasi {cat}')
        frm(ws, f'B{r}', f'=-(SUMIFS({WTB_J},{WTB_C},"{cat}")-SUMIFS({WTB_D},{WTB_C},"{cat}"))', fmt=RP)
        r += 1
    cell(ws, f'A{r}', 'Kas Neto dari Aktivitas Pendanaan', font=F_BOLD, fill=FILL_GREY)
    frm(ws, f'B{r}', f'=SUM(B{cff_first}:B{r - 1})', fmt=RP, bold=True, fill=FILL_GREY)
    cff = r
    r += 1
    rows = [
        ('KENAIKAN (PENURUNAN) KAS', f'=B{cfo}+B{cfi}+B{cff}'),
        ('Kas & setara kas awal tahun', f'=SUMIFS({WTB_D},{WTB_C},"Kas & Setara Kas")'),
        ('Kas & setara kas akhir tahun', None),
        ('CHECK vs WTB (harus 0)', None),
    ]
    cell(ws, f'A{r}', rows[0][0], font=F_BOLD, fill=FILL_SUB)
    frm(ws, f'B{r}', rows[0][1], fmt=RP, bold=True, fill=FILL_SUB)
    naik = r; r += 1
    cell(ws, f'A{r}', rows[1][0])
    frm(ws, f'B{r}', rows[1][1], fmt=RP)
    awal = r; r += 1
    cell(ws, f'A{r}', rows[2][0], font=F_BOLD)
    frm(ws, f'B{r}', f'=B{naik}+B{awal}', fmt=RP, bold=True)
    akhir = r; r += 1
    cell(ws, f'A{r}', rows[3][0], font=F_SMALL)
    frm(ws, f'B{r}', f'=B{akhir}-SUMIFS({WTB_J},{WTB_C},"Kas & Setara Kas")', fmt=RP)
    protect(ws)
    return ws


DISCLOSURE = [
    ('Umum (PSAK 1/201)', ['Identitas entitas, domisili & kegiatan usaha', 'Pernyataan kepatuhan terhadap SAK',
                           'Dasar pengukuran & kebijakan akuntansi signifikan', 'Pertimbangan & estimasi signifikan',
                           'Informasi komparatif & reklasifikasi']),
    ('Aset', ['Rincian kas & deposito (dibatasi penggunaannya?)', 'Umur piutang & penyisihan kerugian (PSAK 71)',
              'Metode biaya & NRV persediaan (PSAK 14)', 'Mutasi aset tetap, penyusutan, jaminan (PSAK 16)',
              'Uji penurunan nilai bila ada indikasi (PSAK 48)']),
    ('Liabilitas & Ekuitas', ['Rincian & jadwal jatuh tempo pinjaman + covenant', 'Liabilitas sewa & maturitas (PSAK 73)',
                              'Imbalan kerja: asumsi aktuaria (PSAK 24)', 'Modal: jumlah saham, nilai nominal, pemegang']),
    ('L/R & Lainnya', ['Disagregasi pendapatan (PSAK 72)', 'Rekonsiliasi beban pajak & tarif efektif (PSAK 46)',
                       'Transaksi & saldo pihak berelasi (PSAK 7)', 'Komitmen & kontinjensi (PSAK 57)',
                       'Peristiwa setelah periode pelaporan', 'Instrumen keuangan: risiko & nilai wajar (PSAK 60/68)',
                       'Kelangsungan usaha (bila ada ketidakpastian material)']),
]


def build_pengungkapan(wb):
    ws = wb.create_sheet('41_Pengungkapan')
    title(ws, '41 · Daftar-Uji Pengungkapan LK', 'Daftar-uji ringkas — bukan pengganti daftar-uji lengkap per PSAK untuk entitas kompleks.')
    widths(ws, {'A': 62, 'B': 12, 'C': 14, 'D': 34})
    headrow(ws, 5, ['Item Pengungkapan', 'Status', 'Ref Catatan LK', 'Keterangan'])
    r = 6
    for group, items in DISCLOSURE:
        cell(ws, f'A{r}', group, font=F_BOLD, fill=FILL_SUB)
        ws.merge_cells(f'A{r}:D{r}')
        r += 1
        for it in items:
            cell(ws, f'A{r}', it, wrap=True)
            inp(ws, f'B{r}')
            inp(ws, f'C{r}')
            inp(ws, f'D{r}')
            r += 1
    from gen_specifics import dv_inline
    dv_inline(ws, ['Ya', 'Tidak', 'N/A'], f'B6:B{r - 1}')
    frm(ws, 'B3', f'=COUNTIF(B6:B{r - 1},"Tidak")&" item BELUM diungkap"', bold=True)
    cell(ws, 'A3', 'Ringkasan:', font=F_BOLD, border=False)
    protect(ws)
    return ws


def build_opini(wb):
    ws = wb.create_sheet('42_Opini')
    title(ws, '42 · Audit Opinion Generator (SA 700 · 705 · 570)',
          'Decision tree SA 705: sifat hal (salah saji vs pembatasan lingkup) × pervasivitas. Draf paragraf terakit otomatis.')
    widths(ws, {'A': 56, 'B': 12, 'C': 44, 'D': 34})
    cell(ws, 'D4', 'OPINI INDIKATIF', font=F_BOLD, fill=FILL_SUB, border=False)
    frm(ws, 'D5', '=VLOOKUP($B$11,OPINI_TBL,2,0)', bold=True, fill=FILL_ASSUM)

    qs = [
        ('Q1 — Terdapat pembatasan ruang lingkup material (bukti cukup & tepat tidak dapat diperoleh)?', None),
        ('Q2 — Bila Q1 = Ya: dampaknya pervasif terhadap LK?', None),
        ('Q3 — Terdapat salah saji material yang TIDAK dikoreksi?', '=IF(ABS(SAD_UNCORR)>=MAT_OM,"Indikasi dari 37_SAD: Σ tidak dikoreksi ≥ OM — pertimbangkan Ya","Info 37_SAD: Σ tidak dikoreksi < OM")'),
        ('Q4 — Bila Q3 = Ya: dampaknya pervasif terhadap LK?', None),
    ]
    for i, (q, adv) in enumerate(qs):
        r = 6 + i
        cell(ws, f'A{r}', q, wrap=True)
        inp(ws, f'B{r}', 'Tidak')
        if adv:
            frm(ws, f'C{r}', adv, link=True)
    dv_name(ws, 'LIST_YATIDAK', 'B6:B9')
    frm(ws, 'B11', '=IF(AND(B6="Ya",B7="Ya"),"TMP",IF(AND(B8="Ya",B9="Ya"),"TW",IF(OR(B6="Ya",B8="Ya"),"WDP","WTP")))', bold=True)
    cell(ws, 'A11', 'Kode keputusan (SA 705):', font=F_BOLD, border=False)

    cell(ws, 'A13', 'DRAF PARAGRAF OPINI', font=F_BOLD, fill=FILL_SUB, border=False)
    frm(ws, 'A14', '=SUBSTITUTE(SUBSTITUTE(VLOOKUP($B$11,OPINI_TBL,3,0),"[KLIEN]",KLIEN),"[TGL]",TEXT(PERIODE_AKHIR,"d mmmm yyyy"))')
    ws.merge_cells('A14:D17')
    ws['A14'].alignment = Alignment(wrap_text=True, vertical='top')

    cell(ws, 'A19', 'BASIS UNTUK OPINI (uraikan bila modifikasian)', font=F_BOLD, fill=FILL_SUB, border=False)
    for r in range(20, 23):
        inp(ws, f'A{r}')
        ws.merge_cells(f'A{r}:D{r}')

    cell(ws, 'A24', 'KELANGSUNGAN USAHA (SA 570)', font=F_BOLD, fill=FILL_SUB, border=False)
    cell(ws, 'A25', 'Terdapat ketidakpastian material going concern (rujuk 31_GC)?')
    inp(ws, 'B25', 'Tidak')
    cell(ws, 'A26', 'Bila Ya: pengungkapan di LK memadai?')
    inp(ws, 'B26')
    dv_name(ws, 'LIST_YATIDAK', 'B25:B26')
    frm(ws, 'C25', '=IF(B25="Ya",IF(B26="Ya","→ Tambahkan paragraf Ketidakpastian Material terkait Kelangsungan Usaha","→ Pengungkapan tidak memadai: modifikasi opini (WDP/TW)"),"—")', bold=True)
    ws.merge_cells('C25:D26')

    cell(ws, 'A28', 'PENANDATANGANAN', font=F_BOLD, fill=FILL_SUB, border=False)
    rows = [('Tanggal laporan auditor', DATE), ('Nama Rekan (AP) penandatangan', None), ('No. Registrasi AP', None), ('No. Izin KAP', None)]
    for i, (lbl, fmt_) in enumerate(rows):
        r = 29 + i
        cell(ws, f'A{r}', lbl)
        inp(ws, f'B{r}', fmt=fmt_)
        ws.merge_cells(f'B{r}:C{r}')
    protect(ws)
    return ws


def build_eqr(wb):
    ws = wb.create_sheet('43_EQR')
    title(ws, '43 · Penelaahan Mutu Perikatan — EQR (ISQM 2)',
          'Wajib untuk emiten/entitas berisiko tinggi sesuai kebijakan KAP. EQR bukan anggota tim perikatan.')
    widths(ws, {'A': 62, 'B': 12, 'C': 40})
    headrow(ws, 5, ['Prosedur Penelaahan', 'Status', 'Catatan EQR'])
    items = ['Independensi & objektivitas penelaah terpenuhi', 'Diskusi hal signifikan dengan rekan perikatan',
             'Reviu penilaian risiko & respons atas risiko signifikan', 'Reviu pertimbangan signifikan & kesimpulan tim',
             'Reviu materialitas & SAD (salah saji tidak dikoreksi)', 'Reviu going concern & peristiwa setelah periode',
             'Reviu draf LK & kesesuaian pengungkapan', 'Reviu draf laporan auditor & ketepatan opini',
             'Konsultasi atas hal sulit/kontroversial telah dilakukan & didokumentasikan',
             'Penelaahan selesai SEBELUM tanggal laporan auditor']
    for i, it in enumerate(items):
        r = 6 + i
        cell(ws, f'A{r}', it, wrap=True)
        inp(ws, f'B{r}')
        inp(ws, f'C{r}')
    dv_name(ws, 'LIST_STATUS', 'B6:B15')
    frm(ws, 'B17', '=IF(COUNTIF(B6:B15,"Selesai")=10,"EQR TUNTAS","Belum tuntas: "&(10-COUNTIF(B6:B15,"Selesai"))&" item")', bold=True)
    cell(ws, 'A17', 'Kesimpulan:', font=F_BOLD, border=False)
    cell(ws, 'A19', 'Nama Penelaah (EQR)')
    inp(ws, 'B19')
    cell(ws, 'A20', 'Tanggal selesai penelaahan')
    inp(ws, 'B20', fmt=DATE)
    protect(ws)
    return ws


def build_ml(wb):
    ws = wb.create_sheet('44_ML')
    title(ws, '44 · Management Letter & Komunikasi TCWG (SA 260/265)',
          'Defisiensi signifikan WAJIB dikomunikasikan tertulis kepada TCWG (SA 265).')
    widths(ws, {'A': 6, 'B': 20, 'C': 40, 'D': 16, 'E': 34, 'F': 34, 'G': 14, 'H': 12})
    headrow(ws, 5, ['No', 'Area', 'Temuan / Defisiensi', 'Signifikan? (SA 265)', 'Rekomendasi', 'Respons Manajemen', 'PIC Klien', 'Target'])
    for r in range(6, 26):
        for colref in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']:
            inp(ws, f'{colref}{r}', fmt=DATE if colref == 'H' else None)
    dv_name(ws, 'LIST_YATIDAK', 'D6:D25')
    frm(ws, 'B3', '=COUNTIF(D6:D25,"Ya")&" defisiensi signifikan → wajib surat TCWG"', bold=True)
    cell(ws, 'A3', 'Ringkasan:', font=F_BOLD, border=False)
    ws.freeze_panes = 'A6'
    protect(ws)
    return ws


MATRIKS = [
    ('00_Cockpit', 'Engagement Cockpit', '—'), ('01_Tugas', 'My Tasks', '—'),
    ('02_Program', 'Audit Programme', 'SA 300 · 330'), ('03_CatatanReviu', 'Review Notes', 'SA 220 · 230'),
    ('04_TimeBudget', 'Time & Budget', '—'), ('05_Timeline', 'Jadwal & Lini Masa Audit', '—'),
    ('10_Risiko', 'Risk Assessment', 'SA 315 · 330'), ('11_Materialitas', 'Materiality', 'SA 320'),
    ('12_ICFR', 'Internal Control', 'SA 315 · 330'), ('13_StrategyMemo', 'Strategy Memo', 'SA 300'),
    ('20_WTB', 'Working Trial Balance', 'SA 230'), ('21_AJE', 'Adjusting Entries (AJE)', 'SA 450'),
    ('22_IndeksWP', 'Working Papers', 'SA 230'), ('23_Asersi', 'Matriks Asersi', 'SA 315'),
    ('24_Analitis', 'Analytical Review', 'SA 520'), ('25_JET', 'Journal Entry Testing', 'SA 240'),
    ('26_BookTax', 'Tax Audit Diagnostic (deterministik)', 'PSAK 46'), ('27_Sampling', 'SA 530 · Sampling Audit', 'SA 530'),
    ('30_Konfirmasi', 'Confirmation Hub', 'SA 505'), ('31_GC', 'Going Concern', 'SA 570'),
    ('32_SaldoAwal', 'Opening Balance', 'SA 510'), ('33_PeristiwaSetelah', 'Subsequent Events', 'SA 560'),
    ('34_PihakBerelasi', 'Related Parties', 'SA 550'), ('35_GrupAudit', 'Group Audit', 'SA 600'),
    ('36_Reliance', 'Internal Audit · Expert · Service Org', 'SA 610 · 620 · 402'),
    ('37_SAD', 'SAD Ledger', 'SA 450'), ('38_EvaluasiBukti', 'Evidence Evaluation', 'SA 500'),
    ('40_LK', 'Financial Statement Generator', 'PSAK 1/201'), ('41_Pengungkapan', 'Daftar-Uji Pengungkapan', 'PSAK'),
    ('42_Opini', 'Audit Opinion Generator', 'SA 700 · 705 · 706'), ('43_EQR', 'EQR Workflow', 'ISQM 2'),
    ('44_ML', 'Management Letter', 'SA 260 · 265'),
]


def build_matriks(wb):
    ws = wb.create_sheet('90_MatriksSA')
    title(ws, '90 · Matriks Kepatuhan — Sheet ↔ Modul Asseris ↔ Standar', 'Jejak asal-usul tiap sheet terhadap modul workspace Perikatan Asseris.')
    widths(ws, {'A': 18, 'B': 44, 'C': 26})
    headrow(ws, 5, ['Sheet', 'Modul Asseris (workspace Perikatan)', 'Standar Utama'])
    for i, (sh, mod, sa) in enumerate(MATRIKS):
        r = 6 + i
        cell(ws, f'A{r}', sh, font=F_BOLD)
        cell(ws, f'B{r}', mod)
        cell(ws, f'C{r}', sa)
    protect(ws)
    return ws
