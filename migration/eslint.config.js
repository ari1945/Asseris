// NeoSuite AMS — ESLint flat config (W1).
// Purpose: an agent-callable quality gate over the ESM target (migration/src).
// `no-undef` + `react/jsx-no-undef` are the regression net for the window→ESM
// migration (W3): any symbol not yet wired by the codemod shows up here.
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

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
      // jsx-no-undef is the W3 component-wiring WORKLIST (warn, not error): the
      // 444 hits are 3 unpublished helper components (KvBox/RowKv/Kv) + 2 views
      // used across files, plus a rule limitation (it ignores declared globals,
      // so it false-flags `window` in <window.X/> dynamic renders). Promote to
      // error once W3 wires the components and removes the dynamic-window JSX.
      'react/jsx-no-undef': 'warn',
      // real correctness bug — silent data loss from duplicate object keys.
      'no-dupe-keys': 'error',
      // --- hooks correctness ---
      // WARN (not error) during migration: the 163 current hits are intentional
      // buildless-era patterns, not bugs — the CLAUDE.md rule-#6 defensive guard
      // `(typeof useNav === 'function') ? useNav() : (()=>{})` (conditional call)
      // and `window.useAmsPersist` (window-assigned custom hook the plugin can't
      // see). Both disappear once W3 makes imports static; promote to error then.
      'react-hooks/rules-of-hooks': 'warn',
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
];
