# Rekalkulasi + scan error + baca nilai kunci via Excel COM
$path = Join-Path $PSScriptRoot 'dist\Asseris Engagement Pack.xlsx'
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $wb = $excel.Workbooks.Open($path)
    $excel.CalculateFullRebuild()
    while ($excel.CalculationState -ne 0) { Start-Sleep -Milliseconds 200 }

    $errors = @()
    foreach ($ws in $wb.Worksheets) {
        $used = $ws.UsedRange
        try {
            $errCells = $used.SpecialCells(-4123, 16)  # xlCellTypeFormulas, xlErrors
            foreach ($c in $errCells) {
                $errors += "$($ws.Name)!$($c.Address($false,$false)) = $($c.Text)"
                if ($errors.Count -gt 60) { break }
            }
        } catch {}
        if ($errors.Count -gt 60) { break }
    }
    Write-Output ("TOTAL_ERRORS: " + $errors.Count)
    $errors | Select-Object -First 60 | ForEach-Object { Write-Output $_ }

    function V($sheet, $cell) { $wb.Worksheets.Item($sheet).Range($cell).Text }
    Write-Output "--- NILAI KUNCI ---"
    Write-Output ("WTB check K3        : " + (V '20_WTB' 'K3'))
    Write-Output ("WTB total final J3  : " + (V '20_WTB' 'J3'))
    Write-Output ("Benchmark PBT B6    : " + (V '11_Materialitas' 'B6'))
    Write-Output ("OM  B15             : " + (V '11_Materialitas' 'B15'))
    Write-Output ("PM  B17             : " + (V '11_Materialitas' 'B17'))
    Write-Output ("CTT B19             : " + (V '11_Materialitas' 'B19'))
    Write-Output ("AJE posted ke WTB F17 (BUA): " + (V '20_WTB' 'F17'))
    Write-Output ("Cockpit opini       : " + (V '00_Cockpit' 'E29'))
    Write-Output ("Opini D5            : " + (V '42_Opini' 'D5'))
    Write-Output ("LK check neraca     : ")
    # cari baris CHECK di 40_LK kolom A
    $lk = $wb.Worksheets.Item('40_LK')
    for ($i = 1; $i -le 130; $i++) {
        $a = $lk.Cells.Item($i, 1).Value2
        if ($a -like 'CHECK*') { Write-Output ("  40_LK A$i '" + $a + "' B=" + $lk.Cells.Item($i, 2).Text + " C=" + $lk.Cells.Item($i, 3).Text) }
        if ($a -like 'Kas Neto*' -or $a -like 'KENAIKAN*') { Write-Output ("  40_LK A$i '" + $a + "' B=" + $lk.Cells.Item($i, 2).Text) }
    }
    Write-Output ("SAD uncorr E48      : " + (V '37_SAD' 'E48'))
    Write-Output ("Sampling n B12      : " + (V '27_Sampling' 'B12'))
    Write-Output ("Sampling interval   : " + (V '27_Sampling' 'B13'))
    Write-Output ("GC rasio lancar B6  : " + (V '31_GC' 'B6'))
    Write-Output ("BookTax selisih B33 : " + (V '26_BookTax' 'B33'))
    Write-Output ("JET N digit Q16     : " + (V '25_JET' 'Q16'))

    $wb.Save()
    $wb.Close($true)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
