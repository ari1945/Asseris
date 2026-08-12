# e2e — Playwright atas stack Postgres (Tahap 7–9)

Perjalanan end-to-end yang menembak stack NYATA (Postgres + server tRPC + SPA hasil
`vite build`), bukan mock:

1. **Login cookie HttpOnly & hidrasi** — `ams_session` ber-flag `HttpOnly` + `SameSite=Strict`,
   tak terbaca JavaScript, aplikasi terhidrasi dari Postgres setelah login dan reload.
2. **Penolakan engagement lintas-user** — non-anggota ditolak baca/tulis/history
   (`FORBIDDEN`) dan switcher UI tidak menawarkan perikatan yang tak boleh diakses.
3. **Edit lalu berpindah engagement** — edit di ENG-2025-014, pindah via UI ke
   ENG-2025-031, WTB rehidrasi, edit kedua tidak bocor, keduanya hidup berdampingan.
4. **Sign-off berurutan dengan SoD** — preparer → reviewer → partner → EQR; tiap slot
   menuntut kapabilitas peran, dan partner yang sama ditolak di EQR (satu-orang-satu-langkah).
5. **Mutasi → StateDocHistory + audit event** — tiap `state.set` menulis riwayat
   append-only + event `STATE_SET` berantai (hash-chain terverifikasi).
6. **Budget hidrasi frontend (Tahap 8)** — login fresh → aplikasi siap dalam
   budget waktu (CI), mencegah regresi boot.
7. **Gerbang pakar SA 620 (PRD prd-sa620-expert-gate-server)** — `state.set` ditembak
   LANGSUNG, tanpa menyentuh UI: tanda tangan SA 540 ditolak saat evaluasi pakar belum
   4/4, saat laporan pakar tak ditautkan, saat tautannya warisan (uid localStorage), dan
   sesudah dokumennya dicabut dari DMS; diterima saat dokumennya hidup; pencabutan tanda
   tangan tetap boleh.
8. **Aksesibilitas & smoke keyboard (Tahap 9)** — pemindaian axe (0 pelanggaran
   impact `critical` di login/Beranda/Dashboard/Pengaturan) + smoke navigasi
   keyboard: Tab, fokus, Space men-toggle switch native, Escape menutup menu.

## Prasyarat

- Node 22+ (`npm ci` di `server/`, `migration/`, dan `e2e/`).
- Postgres 16 yang bisa dijangkau dari mesin lokal. Cara paling cepat:

  ```bash
  docker compose up -d db
  docker compose exec -T db createdb -U neosuite neosuite_e2e   # sekali saja
  ```

  Atau pakai Postgres sendiri; cukup set `DATABASE_URL` ke DB khusus e2e.

## Menjalankan

```bash
cd e2e
npm ci
npm run install:browsers        # playwright install chromium
$env:DATABASE_URL='postgresql://neosuite:changeme@localhost:5432/neosuite_e2e'   # PowerShell
npm test
```

Yang terjadi saat `npm test`:

- `stack:api` (webServer 1): generate Prisma client dari skema Postgres turunan
  (`server/prisma/schema.postgres.prisma`, gitignored) → `migrate deploy` →
  **seed demo DESTRUKTIF** atas `DATABASE_URL` → jalankan server tRPC di `:5181`.
- `stack:web` (webServer 2): `vite build` → `vite preview` di `:5180` dengan proxy
  `/trpc` same-origin.

`reuseExistingServer: false` sengaja dipasang: e2e menolak menembak server dev yang
kebetulan berjalan di port yang sama (pesan kesalahan eksplisit).

## Port & env

| Variabel | Default | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgresql://neosuite:changeme@localhost:5432/neosuite_e2e` | WAJIB Postgres; seed bersifat destruktif, jadi arahkan ke DB demo/e2e saja |
| `E2E_API_PORT` | `5181` | Port API tRPC (ubah bersama target proxy di `migration/vite.config.mjs`) |
| `E2E_WEB_PORT` | `5180` | Port SPA preview |

## CI

`.github/workflows/e2e.yml` menjalankan suite ini terhadap service container
`postgres:16-alpine` di setiap PR yang menyentuh `server/`, `migration/`, atau `e2e/`.
Artefak `playwright-report/` di-upload saat gagal.

## Catatan keamanan

- Seed demo memakai kredensial dev yang terdokumentasi (BUILD.md) — jangan pernah
  mengarahkan `DATABASE_URL` e2e ke DB produksi/pilot.
- `server/.env` / `server/.env.local` yang memuat `DATABASE_URL` akan ditolak oleh
  `start-api.mjs` (env.ts memuatnya saat boot dan bisa menimpa pilihan e2e).
