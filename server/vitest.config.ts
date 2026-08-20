import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Isolated DB file so tests never touch dev.db. Injected into every worker's
    // process.env; globalSetup pushes the schema to it before the suite runs.
    env: { DATABASE_URL: 'file:./test.db' },
    globalSetup: './src/__tests__/globalSetup.ts',
    include: ['src/**/*.test.ts'],
    // Run test files sequentially. They share one SQLite test.db, and W10's audit chain is
    // global mutable state every state.set appends to — parallel files would race on max(seq).
    // Production is single-process (the audit append queue assumes it), so serial files match
    // the real concurrency model rather than papering over a test-only multi-worker race.
    fileParallelism: false,
    /* Default vitest 5 dtk dikalibrasi untuk uji unit. Suite ini adalah uji
       INTEGRASI atas SQLite yang menjalankan scrypt — fungsi yang SENGAJA mahal
       (hardening W7). `auth.test.ts` mengukur ~1,2–1,7 dtk per uji TOTP saat
       mesin senggang, yaitu ~35% dari budget 5 dtk; di bawah kontensi (verify
       penuh menjalankan build frontend berbarengan) keduanya sudah pernah
       TIMEOUT — bukan karena hang, melainkan karena marginnya tipis.

       15 dtk memberi margin ~9× terhadap kasus terburuk yang terukur, tanpa
       menyembunyikan hang sungguhan terlalu lama. Kelambatannya inheren pada
       desain scrypt, jadi menaikkan batas adalah perbaikan yang tepat — bukan
       menutupi uji yang lambat karena cacat. */
    testTimeout: 15_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      // Tahap 7 — coverage CI bertahap untuk tujuh area kunci. Threshold per-glob di bawah
      // adalah BASELINE saat Tahap 7 dibuka (mengukur keadaan nyata, bukan target ideal);
      // rencana menaikkannya per gelombang ada di BUILD.md › Tahap 7. Artefak
      // coverage/coverage-summary.json di-upload CI agar trennya bisa dipantau.
      include: [
        'src/auth/**',
        'src/security/**',
        'src/rbac.ts',
        'src/roleStore.ts',
        'src/engagementAccess.ts',
        'src/stateAccess.ts',
        'src/stateMutation.ts',
        'src/payloadLimits.ts',
        'src/audit/**',
        'src/attachments/**',
        'src/integrations/**',
      ],
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      // Baseline Tahap 7 (diukur 2026-08-12 atas 372 tes server, sqlite test.db):
      //   auth 98/82 · security 98/76 · rbac 100 · roleStore 94/81 · engagementAccess 100
      //   stateAccess 97/91 · stateMutation 93/83 · payloadLimits 100/63
      //   audit 90/86 · attachments 96/68 · integrations 95/73 (lines/branches)
      // Ambang di bawah ini menyisakan ruang aman ~2-8 poin agar CI stabil, dan
      // tetap menutup regresi berarti. Kenaikan bertahap per gelombang: BUILD.md › Tahap 7.
      //
      // RE-BASELINE 2026-08-20 — vitest 2 → 4 (@vitest/coverage-v8 4.x).
      // v8 coverage kini MEMETAKAN ULANG berbasis AST; di v2 ia memakai rentang byte
      // mentah V8 yang MELEBIH-HITUNG statement/branch/function yang tereksekusi
      // sebagian. Uji, kode, dan jumlah tes TIDAK berubah (431 lulus sebelum & sesudah)
      // — yang berubah alat ukurnya, dan ukuran barunya lebih jujur. Buktinya ada pada
      // bentuk pergeserannya: `lines` nyaris diam (audit 90→87,4 · attachments 96→95,8 ·
      // security 98→98,2 · auth 98→99,0), sedangkan statements/branches/functions yang
      // jatuh — persis yang disentuh pemetaan-ulang, bukan yang disentuh regresi uji.
      // Terukur 2026-08-20 (lines/stat/func/bran):
      //   auth 98,96/94,44/96,00/89,83 · security 98,18/85,71/92,86/80,00 · rbac 100/100/100/—
      //   roleStore 94,74/90,91/100/72,22 · engagementAccess 100/100/100/100
      //   stateAccess 96,15/90,00/100/91,18 · stateMutation 90,48/85,11/100/72,41
      //   payloadLimits 100/89,47/100/72,73 · audit 87,40/83,22/67,74/70,75
      //   attachments 95,80/88,30/100/73,91 · integrations 96,74/95,15/100/76,80
      // Ambang yang TURUN hanyalah yang alat ukur barunya melewatinya; tak satu pun uji
      // dihapus untuk memenuhinya. Dua ambang yang mendarat PERSIS di angka terukur
      // (stateAccess statements, stateMutation statements) ikut diberi margin — ambang
      // tanpa margin adalah CI yang gemetar, bukan gerbang yang ketat.
      thresholds: {
        'src/auth/**': { lines: 90, statements: 90, functions: 90, branches: 70 },
        'src/security/**': { lines: 90, statements: 80, functions: 80, branches: 65 },
        'src/rbac.ts': { lines: 90, statements: 90, functions: 90, branches: 85 },
        'src/roleStore.ts': { lines: 85, statements: 85, functions: 85, branches: 70 },
        'src/engagementAccess.ts': { lines: 90, statements: 90, functions: 90, branches: 90 },
        'src/stateAccess.ts': { lines: 90, statements: 88, functions: 90, branches: 80 },
        'src/stateMutation.ts': { lines: 85, statements: 82, functions: 85, branches: 70 },
        'src/payloadLimits.ts': { lines: 90, statements: 85, functions: 90, branches: 55 },
        'src/audit/**': { lines: 85, statements: 80, functions: 65, branches: 68 },
        'src/attachments/**': { lines: 90, statements: 85, functions: 90, branches: 60 },
        'src/integrations/**': { lines: 90, statements: 90, functions: 90, branches: 65 },
      },
    },
  },
});
