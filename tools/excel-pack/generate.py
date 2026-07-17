"""Perakit Asseris Engagement Pack (Excel) — jalankan: python generate.py"""
import os
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName

import gen_ref_setup as rs
import gen_engagement as ge
import gen_planning as gp
import gen_execution as gx
import gen_specifics as gs
import gen_final as gf
from gen_ref_setup import LISTS

OUT = os.path.join(os.path.dirname(__file__), 'dist', 'Asseris Engagement Pack.xlsx')

TAB = {'eng': '2563EB', 'plan': '0E7490', 'exec': '1F2A44', 'spec': 'B45309', 'fin': '166534', 'ref': '6B7280'}


def main():
    wb = Workbook()
    wb.remove(wb.active)

    order = [
        (rs.build_petunjuk, 'ref'), (rs.build_setup, 'ref'),
        (ge.build_cockpit, 'eng'), (ge.build_tugas, 'eng'), (ge.build_program, 'eng'),
        (ge.build_catatanreviu, 'eng'), (ge.build_timebudget, 'eng'), (ge.build_timeline, 'eng'),
        (gp.build_risiko, 'plan'), (gp.build_materialitas, 'plan'), (gp.build_icfr, 'plan'), (gp.build_strategy, 'plan'),
        (gx.build_wtb, 'exec'), (gx.build_aje, 'exec'), (gx.build_indekswp, 'exec'), (gx.build_asersi, 'exec'),
        (gx.build_analitis, 'exec'), (gx.build_jet, 'exec'), (gx.build_booktax, 'exec'), (gx.build_sampling, 'exec'),
        (gs.build_konfirmasi, 'spec'), (gs.build_gc, 'spec'), (gs.build_saldoawal, 'spec'),
        (gs.build_subsequent, 'spec'), (gs.build_related, 'spec'), (gs.build_grupaudit, 'spec'),
        (gs.build_reliance, 'spec'), (gs.build_sad, 'spec'), (gs.build_evaluasibukti, 'spec'),
        (gf.build_lk, 'fin'), (gf.build_pengungkapan, 'fin'), (gf.build_opini, 'fin'),
        (gf.build_eqr, 'fin'), (gf.build_ml, 'fin'), (gf.build_matriks, 'fin'),
        (rs.build_ref, 'ref'),
    ]
    for fn, grp in order:
        ws = fn(wb)
        ws.sheet_properties.tabColor = TAB[grp]

    names = {
        'KLIEN': "'SETUP'!$B$6",
        'PERIODE_AWAL': "'SETUP'!$B$9",
        'PERIODE_AKHIR': "'SETUP'!$B$10",
        'TIM': "'SETUP'!$B$17:$B$22",
        'MAP_LK': 'REF!$A$2:$A$40',
        'MAP_AL': 'REF!$A$2:$A$8',
        'MAP_ASET': 'REF!$A$2:$A$15',
        'MAP_LJPDK': 'REF!$A$16:$A$21',
        'MAP_LIAB': 'REF!$A$16:$A$26',
        'MAP_EK_LR': 'REF!$A$27:$A$40',
        'MAP_LR_PRATAX': 'REF!$A$31:$A$38',
        'MAP_LR_ALL': 'REF!$A$31:$A$40',
        'RF_MUS': 'REF!$N$2:$O$4',
        'ROMM_TBL': 'REF!$P$2:$Q$10',
        'OPINI_TBL': 'REF!$T$20:$V$23',
        'BENCH_LABELS': "'11_Materialitas'!$A$6:$A$9",
        'MAT_OM': "'11_Materialitas'!$B$15",
        'MAT_PM': "'11_Materialitas'!$B$17",
        'MAT_CTT': "'11_Materialitas'!$B$19",
        'SAD_UNCORR': "'37_SAD'!$E$48",
    }
    for col, (nm, items) in LISTS.items():
        names[nm] = f'REF!${col}$2:${col}${1 + len(items)}'
    for nm, ref in names.items():
        wb.defined_names[nm] = DefinedName(nm, attr_text=ref)

    wb.calculation.fullCalcOnLoad = True
    wb.properties.title = 'Asseris Engagement Pack'
    wb.properties.creator = 'Asseris — turunan metodologi (Excel edition)'
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    wb.save(OUT)
    print('OK:', OUT)
    print('sheets:', len(wb.sheetnames))


if __name__ == '__main__':
    main()
