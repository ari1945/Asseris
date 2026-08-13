/* ============================================================
   Asseris — gerbang lint BACKEND & E2E (PRD prd-lint-coverage-server-e2e)
   ------------------------------------------------------------
   `npm run lint` di `migration/` hanya menjangkau `migration/src`.
   `server/` dan `e2e/` karena itu TIDAK PERNAH DILINT sama sekali —
   termasuk kode penjaga baru seperti `signoff.ts` (gerbang EQR,
   otoritas sign-off, imutabilitas AJE), yaitu justru permukaan yang
   paling menentukan integritas data.

   Config ini hidup di ROOT (opsi A pada PRD §11 Q1), bukan menumpang
   `migration/node_modules`: gerbang seluruh repo tidak boleh terkopel
   permanen pada isi satu paket. Biayanya satu `npm ci` di root.

   LINGKUP SENGAJA SEMPIT. Yang dijaga adalah kelas kesalahan yang
   tsc TIDAK tangkap:
     · variabel/impor yang tak terpakai (kode mati, impor basi)
     · blok kosong, kunci duplikat, kode tak terjangkau
     · kondisi konstan, escape regex sia-sia

   BUKAN gaya penulisan, BUKAN `no-console` (server memakai logger
   terstruktur tetapi skrip & seed memang menulis ke konsol dengan sah
   — PRD §11 Q3 menjawab: TIDAK dinyalakan sekarang), dan BUKAN aturan
   type-aware (butuh program tsc penuh; biaya CI jauh lebih besar).

   `migration/` DIKECUALIKAN di sini — ia punya gerbangnya sendiri
   dengan ratchet `no-explicit-any` dan aturan React/hooks yang tidak
   relevan bagi backend.
   ============================================================ */
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/node_modules/**', '**/dist/**', '**/build/**',
      '**/prisma/generated/**', '**/playwright-report/**', '**/test-results/**',
      /* punya gerbang sendiri (migration/eslint.config.js) */
      'migration/**',
      /* referensi beku — bukan sumber (CLAUDE.md §8) */
      'app/**', 'NeoSuite AMS.html',
    ],
  },
  {
    files: ['server/**/*.ts', 'e2e/**/*.ts', 'tools/**/*.mjs'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      /* tsc (strict) pemilik kebenaran untuk tipe & simbol tak dikenal. */
      'no-undef': 'off',
      'no-unused-vars': 'off',
      /* Versi TS-aware: menangkap impor & binding basi yang tsc biarkan
         (noUnusedLocals tidak menjangkau parameter & destructuring). */
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_',
      }],

      /* Kelas kesalahan yang tsc TIDAK tangkap. */
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-dupe-keys': 'error',
      'no-dupe-else-if': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-useless-escape': 'error',
      'no-self-compare': 'error',
      'no-unsafe-finally': 'error',
      'require-atomic-updates': 'off',
    },
  },
];
