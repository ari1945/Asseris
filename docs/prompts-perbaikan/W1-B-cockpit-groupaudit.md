# W1-B — `programme` (Program Audit) · `groupaudit` (SA 600)

> ⛔ **PAKET DITAHAN — JANGAN DIKERJAKAN.** Keputusan Ari, 2026-08-28.
>
> **28 dari 32 berkas gelombang W1 SUDAH dikonversi** di cabang yang belum mendarat,
> `claude/intelligent-keller-7b28db` (ahead 4 / behind 60), dengan arsitektur yang
> **berlawanan** dengan prompt ini: argumen `firm:` dan `scopeId:` **dicabut seluruhnya**
> dari call-site, dan eksporter MENARIK identitas dari SSOT (`export_identity.ts`).
> PRD-nya — `docs/prd-export-seal-identity-ssot.md`, ada di cabang itu, status
> `Draft — menunggu sign-off` — melingkupi **123 call-site di ±60 view**, dan menemukan
> kelas keempat yang prompt ini lewatkan: `\|\| 'default'` truthy ⇒
> `assertEngagementAccess` JALAN dan GAGAL ⇒ artefak **diam-diam tidak tersegel**.
>
> PRD itu membantah pendekatan prompt ini secara langsung: *"Selama identitas boleh
> didorong pemanggil, tombol ekspor ke-124 bebas mengarangnya lagi."*
>
> Mengerjakan paket ini sekarang = mengulang kerja yang sudah ada, dalam bentuk yang
> lebih lemah, **dan membuat arc itu tak bisa mendarat**. Yang berjalan dari gelombang
> W1 hanya **W1-E** (kontrol palsu — di luar lingkup arc ekspor).
>
> Isi di bawah dipertahankan sebagai temuan terverifikasi (nomor baris sahih per
> `8a8cc54`), bukan sebagai perintah kerja. Lihat `00-LANJUTKAN.md` § "Gelombang W1".



> 🔴 **KOREKSI 2026-08-28 — identitas modul.** Berkas ini semula berjudul "cockpit".
> **`view_cockpit.tsx` BUKAN modul Cockpit.** `lazy_views.tsx:112-113` merutekan:
> `'cockpit'` → `view_cockpit2.tsx` (`EngagementCockpit`, 1196 baris) dan
> `'programme'` → `view_cockpit.tsx` (`AuditProgramme`, 710 baris).
> Paket ini memiliki **`view_cockpit.tsx` = modul PROGRAM AUDIT**. Modul Cockpit
> (`view_cockpit2.tsx`) **bersih** dari kelas cacat ini dan TERLARANG disentuh.

**Berkas yang DIMILIKI paket ini:**
`migration/src/view_cockpit.tsx` · `view_groupaudit.tsx`
\+ `migration/src/w1b_sealed_identity.test.ts` (baru).

**Diverifikasi ulang 2026-08-28 terhadap `origin/master` = `8a8cc54`** — semua situs
masih hidup pada nomor baris di bawah; nol berkas paket ini tersentuh gelombang W0
(#318–#322).

| Berkas | Baris | Isi |
|---|---|---|
| `view_cockpit.tsx` (modul **programme**) | 203 | `scopeId: (window as {activeEngagement?…}).activeEngagement?.id` — ekspor `programme-export` |
| `view_cockpit.tsx` | 205 | `firm: 'KAP Wijaya Hartono & Rekan'` |
| `view_groupaudit.tsx` | 226 | `const eng = (window as {activeEngagement?: {id?; clientName?; fy?}}).activeEngagement;` |
| `view_groupaudit.tsx` | 228 · 230 | `scopeId: eng?.id` · `firm: 'KAP Wijaya…'` |

> **`groupaudit` lebih parah dari yang lain di gelombang ini.** Ia membaca TIGA
> bidang dari objek window hantu itu — `id`, `clientName`, dan `fy`. Ketiganya selalu
> `undefined`. Jadi memo SA 600 tersegel terbit dengan judul/`meta` yang kehilangan
> nama klien dan tahun buku sekaligus, sementara segelnya menyatakan artefak itu sah.
> Telusuri SETIAP pemakaian `eng` di berkas itu sebelum mengubah apa pun.

> **Catatan:** ekspor XLSX modul Cockpit sudah dibersihkan PR #265 (`cockpit_report.ts`
> — payload jadi fungsi murni, teruji). Yang tersisa dan cacat adalah ekspor
> **`programme-export`** milik modul Program Audit di `view_cockpit.tsx:203-205`.
> **Jangan menyentuh `cockpit_report.ts`, `cockpit_report.test.ts`, maupun
> `view_cockpit2.tsx`.**

---

## Prompt (salin seluruh blok ini sebagai pesan pertama di sesi baru)

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia).

Baca berurutan sebelum menyentuh kode:
1. CLAUDE.md di root repo.
2. docs/PROMPT-PERBAIKAN-MODUL.md BLOK-A (preamble tetap).
3. docs/prompts-perbaikan/W1-00-IDENTITAS-TERSEGEL.md — brief kelas cacat, SSOT,
   bentuk gerbang, larangan. Wajib.
4. docs/prompts-perbaikan/W1-B-cockpit-groupaudit.md — berkas ini.

TUGAS: ekspor 'programme-export' di modul PROGRAM AUDIT (view_cockpit.tsx — rute
'programme'), dan memo SA 600 di modul groupaudit.

⚠ JEBAKAN NAMA BERKAS — baca dua kali:
  view_cockpit.tsx   = modul 'programme' (AuditProgramme, 710 baris)  ← MILIKMU
  view_cockpit2.tsx  = modul 'cockpit'   (EngagementCockpit, 1196 br) ← TERLARANG
Dibuktikan di lazy_views.tsx:112-113. view_cockpit2.tsx sudah bersih dari kelas cacat
ini (PR #265) dan dijaga LIMA gerbang — cockpit_conventions.test.ts, cockpit_gate.test.ts,
cockpit_isolation.test.ts, cockpit_report.test.ts, cockpit_timeline.test.ts —
menyentuhnya akan memerahkan lima gerbang yang bukan urusanmu.

BERKAS YANG BOLEH KAMU SENTUH — HANYA INI:
  migration/src/view_cockpit.tsx
  migration/src/view_groupaudit.tsx
  migration/src/w1b_sealed_identity.test.ts   (baru)
Tujuh sesi lain mengerjakan kelas cacat yang sama di berkas lain secara paralel.

KEADAAN AWAL YANG SUDAH BENAR — JANGAN DIULANG, JANGAN DIRUSAK:
- Ekspor XLSX status report cockpit sudah dibereskan PR #265: payload dirakit oleh
  fungsi MURNI buildCockpitStatusReport di cockpit_report.ts, dengan gerbangnya
  sendiri di cockpit_report.test.ts (termasuk §C-2 identitas). JANGAN menyentuh
  kedua berkas itu, dan jangan "menyeragamkan" jalur itu dengan jalur yang kamu
  perbaiki. Yang cacat adalah jalur LAIN: 'programme-export' di view_cockpit.tsx:203
  (modul Program Audit).

YANG HARUS DITUTUP:

1. view_cockpit.tsx:205 dan view_groupaudit.tsx:230 — `firm:` literal.
   → useFirmName() dari './firm_identity' (SUDAH ADA; JANGAN diubah).
     Tiru bentuk view_firmtreasury.tsx:131,165,187 termasuk tombol disabled + title.

2. view_cockpit.tsx:203 dan view_groupaudit.tsx:226 — `window as {activeEngagement}`.
   → window.activeEngagement TIDAK PERNAH DITULIS. Buktikan:
       git grep -nE "window\.activeEngagement *=" -- migration/src server/src
     Nilainya selalu undefined; server/src/router.ts:735 karena itu MELEWATI
     assertEngagementAccess, dan segel tetap terbit dengan scope 'engagement'.
   → Sumber yang benar: useFirm().activeEngagement.
   → Tanpa perikatan aktif: TOLAK menerbitkan. JANGAN memilihkan perikatan — itu
     cacat yang ditutup PR #317. Presedens: attachment_scope.ts + view_sa580.tsx.

3. groupaudit KHUSUS: `eng.clientName` dan `eng.fy` juga dibaca dari objek hantu itu
   dan karena itu selalu undefined. Telusuri SEMUA pemakaian variabel `eng` di
   view_groupaudit.tsx sebelum mengubah — jangan berhenti di baris 226/228/230.
   Nama klien dan tahun buku ditarik dari konteks yang sama (useFirm()), dan ketika
   tak tersedia payload TIDAK terbit — bukan terbit dengan em-dash. Berkas tersegel
   yang menyebut klien "undefined" lebih buruk daripada tak ada berkas.

⛔ LARANGAN
- Jangan mengubah cockpit_report.ts, cockpit_report.test.ts, firm_identity.ts,
  attachment_scope.ts, export_pdf.ts, export_xlsx.ts, contexts.tsx,
  server/src/router.ts. Yakin salah satunya harus berubah? BERHENTI dan laporkan.
- Gerbangmu memindai HANYA kedua view milik paket ini — jangan sensus repo-wide.
- Jangan menyentuh migration/eslint-suppressions.json. `:any` baru = lint merah.
- Jangan menyelipkan arc firm-erp PR-2..PR-6 / delivery PR-4..PR-6.
- Jangan menyentuh view_cockpit2.tsx (modul Cockpit) — berkas LAIN, sudah bersih,
  dijaga lima gerbang.
- Kamu hanya mengerjakan jalur ekspor 'programme-export'. Temuan lain: laporkan.

GERBANG (bentuk lengkap di W1-00 §6): §1 PERILAKU · §2 SUMBER (hanya dua berkas ini,
komentar dibuang dulu) · §3 ANTI-TAUTOLOGI. Untuk groupaudit, §1 wajib memuat satu
uji yang membuktikan nama klien pada payload BERUBAH saat perikatan aktif diganti —
bukan sekadar "tidak undefined".

Buktikan gerbang MERAH dulu:  git stash && npm test -- w1b_sealed_identity  → gagal
                              git stash pop

SELESAI BILA:
[ ] Output merah gerbang pada kode LAMA ditempel di deskripsi PR
[ ] Tiga call-site (cockpit ×1, groupaudit ×1 + turunan clientName/fy) bersih
[ ] Tanpa identitas firma ATAU tanpa perikatan aktif ⇒ ekspor tidak terbit, UI
    mengatakan alasannya
[ ] cockpit_report.ts & cockpit_report.test.ts TIDAK berubah (tunjukkan git status)
[ ] `npm run verify` dari root HIJAU
[ ] Deskripsi PR menyebut apa yang TIDAK dikerjakan dan mengapa
```
