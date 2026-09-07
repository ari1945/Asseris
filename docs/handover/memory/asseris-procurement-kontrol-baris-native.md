---
name: asseris-procurement-kontrol-baris-native
description: Pola KONVERGEN untuk baris tabel terpilih (.pc-rowbtn/.ia-rowbtn/.proc-rowbtn) + resep gerbang jsdom yang terbukti merah; 88 berkas masih memikul <tr onClick>
metadata: 
  node_type: memory
  type: project
  originSessionId: 1263aeac-b733-4735-a86e-147068403830
  modified: 2026-08-26T17:03:56.308Z
---

Perbaikan `procurement` — **PR #308 MENDARAT `0f9ed9f`** (2026-08-26; CI 9/9 setelah
`update-branch` ke `7fb1a4a`). Cabang remote sudah dihapus.

## Pola konvergen — baris tabel yang dapat dipilih

Dua commit 2026-08-24 memakai bentuk yang SAMA; ikuti ini, jangan mengarang varian:

```
.x-rowbtn{ display:…; background:none; border:0; padding:0; margin:0;
           font:inherit; color:inherit; text-align:left; cursor:pointer; }
.x-rowbtn:focus-visible{ outline:2px solid var(--blue); outline-offset:2px; border-radius:4px; }
```

```tsx
<tr className={sel ? 'sel' : ''}>            {/* tr TANPA onClick & TANPA cursor:pointer */}
  <td …><button type="button" className="x-rowbtn" aria-pressed={…}
          title={…} onClick={…}>{id}</button></td>
```

- `.pc-rowbtn` — `view_pc_org.tsx` (#301) · `.ia-rowbtn` — `view_internalaudit.tsx` (#296)
  · `.proc-rowbtn` — `view_procurement.tsx` (arc ini).
- CSS-nya **inline `<style>{X_BTN_CSS}</style>`** di dalam komponennya, bukan di
  `styles_*.css` — supaya perbaikan satu modul tak menyentuh berkas CSS bersama.
- `.dtbl tbody tr.sel td { background: var(--blue-100); }` sudah ada di
  `styles_chrome.css` — pertahankan kelas `sel` di `<tr>` untuk sorotan barisnya.

## Sapuan yang benar

`grep '<tr onClick'` MELEWATKAN kasus nyata — atribut sering mendahului `onClick`.
Pakai `grep -nE '<(tr|div|span|td|li)[^>]*onClick'` **plus** varian multi-baris
(`grep -nzoP '<tag\b[^>]*?onClick'`) karena tag pembuka bisa membentang beberapa baris.
Cara paling jujur & termurah: `grep -n 'onClick'` lalu periksa elemen tiap barisnya.

**Sisa utang: 88 berkas di `migration/src` masih memikul `<tr … onClick>`** (per
`f650c74`). Ini utang se-repo, bukan per modul.

## Resep gerbang jsdom yang terbukti MERAH

Pola dari `revenue_row_control.test.ts` (#278) → disalin ke
`procurement_row_control.test.ts` (9 uji; MERAH 6 gagal/3 lolos sebelum perbaikan):

- `// @vitest-environment jsdom` + `createRoot` + `React.act`, `IS_REACT_ACT_ENVIRONMENT = true`.
- `vi.mock('./contexts')` dengan `importActual` + **kunci konteks NYATA**
  (`engagements`/`clients`/`activeEngagementId`) — `firm_identity.test.ts` FI-2 adalah
  gerbang yang MENGGAGALKAN mock yang mengarang bentuk konteks. `vi.mock('./shell')`
  untuk menetralkan `SubBar`.
- Data seed (`data_backoffice.ts` dsb.) **jangan** di-mock — yang diuji kontrolnya.
- Buka tabnya dulu: `Tabs` (`ui.tsx`) merender `<button className="tab">`, klik via `.click()`.
- **Batas jujur jsdom:** jsdom TIDAK menerjemahkan Enter/Space jadi `click`. Jadi
  "aktif dengan Enter" dibuktikan STRUKTURAL (benar-benar `<button type="button">`,
  tak disabled, tanpa tabIndex buatan, `focus()` berhasil) + PERILAKU (mengaktifkannya
  benar-benar mengubah seleksi & membuka drawer vendor yang BENAR). Nyatakan batas ini
  di header uji; jangan mengklaim lebih.
- Gerbang sumber wajib **membuang komentar dulu** — berkas yang baik mengutip pola lama
  sebagai catatan sejarah, dan pemindai naif akan menuduh catatan itu sendiri.

Terkait: [[asseris-ekspor-segel-degradasi]] · [[asseris-a11y-badge-button-native]] ·
[[asseris-icon-button-names]] · [[asseris-arc-prompt-perbaikan-modul]]
