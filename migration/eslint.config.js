// Asseris — ESLint flat config (W1).
// Purpose: an agent-callable quality gate over the ESM target (migration/src).
// `no-undef` + `react/jsx-no-undef` are the regression net for the window→ESM
// migration (W3): any symbol not yet wired by the codemod shows up here.
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        // React/ReactDOM are imported per-file by the codemod, but a few legacy
        // refs may remain global during the dual-publish phase.
        React: 'readonly',
        ReactDOM: 'readonly',
        // Intentional imperative runtime bus (kept across the migration on purpose).
        __amsOpenSA: 'readonly',
        __amsOpenCopilot: 'readonly',
        __amsSetSidebar: 'readonly',
        amsApplyPrefs: 'readonly',
        compliancePct: 'readonly',
      },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: '18.3' } },
    rules: {
      // --- the W3 migration gate ---
      // no-undef (non-JSX refs) is a hard gate — already green.
      'no-undef': 'error',
      // ERROR since W3 Phase 4: the dynamic-window JSX (<window.X/>) was rewritten
      // to imported refs, so any unwired JSX component is now a real regression.
      'react/jsx-no-undef': 'error',
      // real correctness bug — silent data loss from duplicate object keys.
      'no-dupe-keys': 'error',
      // --- hooks correctness ---
      // ERROR since W3 Phase 4: the buildless-era defensive guards
      // `(typeof useNav === 'function') ? useNav() : (()=>{})` were dissolved to
      // bare imported-hook calls and `window.useAmsPersist` was renamed to a
      // proper `useAmsPersist` hook, so any remaining conditional/misplaced hook
      // call is a real rules-of-hooks bug.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
      // --- quieted during migration (revisit post-W3/W5) ---
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-cond-assign': 'off',
      'no-control-regex': 'off',
      'no-prototype-builtins': 'off',
      'no-fallthrough': 'off',
      'no-useless-escape': 'off',
      'no-misleading-character-class': 'off',
      'no-irregular-whitespace': 'off',
      'react/no-unknown-property': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'react/jsx-key': 'off',
    },
  },
  // --- W15: TypeScript tier — :any regrowth ratchet (D2) ---
  // ESLint tak melint .ts(x) sampai W15 (tsc yang menjaganya). Blok ini menambah
  // SATU rule berarti: `no-explicit-any` sbg ratchet KERAS — meniru gerbang W13
  // (noImplicitAny): `:any` yg ADA di-grandfather lewat baseline `eslint-suppressions.json`
  // (codemod W13 yg menyiramnya), `:any` BARU = error → gagal CI/pre-commit. Output
  // tetap bersih (yg ter-suppress tak dicetak), jadi gerbang no-undef/hooks lama tetap
  // terbaca. Severity 'error' WAJIB — fitur suppressions ESLint hanya berlaku utk error.
  // Regenerasi baseline saat sengaja menurunkan :any: `npm run lint:any-baseline`.
  // Parser TS sintaktik saja (tanpa parserOptions.project → cepat; rule ini tak butuh
  // info-tipe). tsc full-strict tetap pemilik kebenaran tipe; rule core yg misfire off.
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, React: 'readonly', ReactDOM: 'readonly' },
    },
    plugins: { '@typescript-eslint': tseslint.plugin, react, 'react-hooks': reactHooks },
    settings: { react: { version: '18.3' } },
    rules: {
      // the W15 ratchet (error; existing grandfathered via eslint-suppressions.json)
      '@typescript-eslint/no-explicit-any': 'error',
      // hooks correctness tetap berlaku utk .tsx
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
      // tsc (full strict) pemilik kebenaran ini utk .ts(x); rule core misfire → off
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-dupe-class-members': 'off',
      'no-empty': 'off',
      'no-cond-assign': 'off',
      'no-control-regex': 'off',
      'no-prototype-builtins': 'off',
      'no-fallthrough': 'off',
      'no-useless-escape': 'off',
      'no-misleading-character-class': 'off',
      'no-irregular-whitespace': 'off',
      'react/no-unknown-property': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'react/jsx-key': 'off',
      'react/jsx-no-undef': 'off',
    },
  },

  /* ------------------------------------------------------------------
     PR-1 SMM — gerbang nomenklatur standar manajemen mutu.

     IAPI mengesahkan SMM 1 & SMM 2 (18-09-2024, efektif 31-12-2025);
     SMM 1 MENGGANTIKAN SPM 1. "ISQM 1/2" adalah standar IAASB — acuan
     penyusunan, bukan standar yang mengikat KAP Indonesia.

     Sebelum PR ini, nama standar yang tidak berlaku tersebar di 74
     berkas dan tak ada yang bisa menangkapnya. Aturan di bawah adalah
     penangkapnya: ia menyasar PERMUKAAN YANG DIBACA PENGGUNA (literal
     string, teks JSX, template) — bukan komentar, yang tidak tampil.

     Dijalankan lewat gerbang `npm run lint` yang sudah ada; tidak
     menambah dependensi. (Alternatifnya, uji pemindai filesystem,
     menuntut devDependency `@types/node` yang belum ada di `migration/`
     — keputusan terpisah; lihat catatan `exclude` di tsconfig.test.json.)
     ------------------------------------------------------------------ */
  {
    files: ['src/**/*.{ts,tsx}'],
    // Berkas yang MEMANG harus menyebut nama lama: kanon yang
    // mendokumentasikan penggantian, dan uji yang memakainya sbg tripwire.
    ignores: ['src/canon_smm_refs.ts', 'src/canon_smm_refs.test.ts'],
    rules: {
      'no-restricted-syntax': ['error',
        { selector: 'Literal[value=/\\bISQM\\b/]',            message: 'Pakai "SMM 1"/"SMM 2" (IAPI), bukan "ISQM" (IAASB).' },
        { selector: 'JSXText[value=/\\bISQM\\b/]',            message: 'Pakai "SMM 1"/"SMM 2" (IAPI), bukan "ISQM" (IAASB).' },
        { selector: 'TemplateElement[value.raw=/\\bISQM\\b/]', message: 'Pakai "SMM 1"/"SMM 2" (IAPI), bukan "ISQM" (IAASB).' },

        { selector: 'Literal[value=/\\bSPM\\b/]',             message: 'SPM 1 digantikan SMM 1 sejak 31-12-2025.' },
        { selector: 'JSXText[value=/\\bSPM\\b/]',             message: 'SPM 1 digantikan SMM 1 sejak 31-12-2025.' },
        { selector: 'TemplateElement[value.raw=/\\bSPM\\b/]',  message: 'SPM 1 digantikan SMM 1 sejak 31-12-2025.' },

        { selector: 'Literal[value=/(Sistem|Standar) Pengelolaan Mutu/]', message: 'Istilah SMM adalah "manajemen mutu", bukan "pengelolaan mutu".' },
        { selector: 'JSXText[value=/(Sistem|Standar) Pengelolaan Mutu/]', message: 'Istilah SMM adalah "manajemen mutu", bukan "pengelolaan mutu".' },

        // Penerimaan & Keberlanjutan = ¶30 (tujuan mutu) · ¶34(d) (respons spesifik).
        // "¶33–34" menunjuk Informasi & Komunikasi + Respons Spesifik — keliru,
        // dan keliru itu tersebar di 9 berkas sebelum PR ini.
        { selector: 'Literal[value=/¶33[–-]34/]', message: 'Penerimaan & Keberlanjutan = ¶30 · ¶34(d), bukan ¶33–34.' },
        { selector: 'JSXText[value=/¶33[–-]34/]', message: 'Penerimaan & Keberlanjutan = ¶30 · ¶34(d), bukan ¶33–34.' },

        // Register keluhan & tuduhan = ketentuan ¶34(c), bukan materi penerapan ¶A56.
        // Disempitkan ke konteks SMM: `SA 500 ¶A56` (IPE) & `SA 530 ¶A56` sah.
        { selector: 'Literal[value=/SMM[^\\n]{0,20}¶A56/]', message: 'Register keluhan & tuduhan = ¶34(c), bukan ¶A56.' },
        { selector: 'JSXText[value=/SMM[^\\n]{0,20}¶A56/]', message: 'Register keluhan & tuduhan = ¶34(c), bukan ¶A56.' },
      ],
    },
  },
];
