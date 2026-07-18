# Dependency Upgrade Backlog

Deliberate major upgrades held out of the automated Dependabot flow. Each is a
breaking change that must be done on its own branch with the full gate green
(`npm run typecheck && npm run lint && npm test && npm run build` for
`migration/`; `npm run typecheck && npm test` for `server/`) and live
verification, **not** an auto-merge.

Dependabot is configured (`.github/dependabot.yml`) to hold the majors below via
`ignore`. When you start an upgrade, remove its matching `ignore` entry so
Dependabot resumes tracking it.

Context: these surfaced as failing Dependabot PRs #50/#51/#53/#54/#63/#66
(closed 2026-07-18 in favour of this tracked backlog).

---

## 1. React 18 → 19 (`migration/`)

- **Packages:** `react`, `react-dom` (must move together — split PRs fail with
  `ERESOLVE` peer conflict because `react-dom@18` peer-requires `react@^18`).
- **Why deferred:** major runtime upgrade with real breaking changes
  (removed `defaultProps` on function components, ref/`propTypes` changes,
  new JSX transform expectations). This app has ~170 `.tsx` views.
- **Scope / steps:**
  1. Branch; bump `react` + `react-dom` to 19 together.
  2. Check `@types/react` / `@types/react-dom` alignment (note: repo runs
     without `@types/react` in places — see CLAUDE.md gotchas).
  3. `npm run typecheck && npm run lint && npm test && npm run build`.
  4. Live-verify the SPA boots and key views render (dashboard, a WP, personal).
- **Risk:** medium-high (surface area = every view).

## 2. Prisma 6 → 7 (`server/`)

- **Packages:** `prisma`, `@prisma/client` (move together).
- **Why deferred:** hard breaking config change. Prisma 7 rejects `url` inside
  the `datasource` block:
  > `P1012 ... The datasource property 'url' is no longer supported in schema
  > files. Move connection URLs ... to prisma.config.ts ...`
- **Scope / steps:**
  1. Branch; bump both to 7.
  2. Create `prisma.config.ts`; move `DATABASE_URL` out of `schema.prisma`;
     wire a driver adapter (SQLite dev / Postgres prod).
  3. Regenerate client; run migrations; `npm run typecheck && npm test`.
  4. Live-verify healthz/seed/login + the deploy package's caddy-edge path.
- **Risk:** medium (isolated to the data layer, but touches boot + deploy).

## 3. TypeScript 7 toolchain (`server/` + `migration/`)

- **Packages:** `typescript` 6→7, `@types/node` 22→26, `vitest` 2→4.
- **Why deferred:** TS 7 is a major compiler jump against a full-`strict`
  codebase. First surfaced error (there are likely more behind it):
  > `server/src/crypto/signing.ts(52,39): TS2345: 'KeyObject' is not assignable
  > to ... 'JsonWebKeyInput | PublicKeyInput | RawPublicKeyInput | BinaryLike'`
  (`@types/node` 26 narrowed the `createPublicKey` overloads).
- **Scope / steps:**
  1. Branch; bump `typescript`, `@types/node`, `vitest` together in both
     workspaces.
  2. Fix type fallout (start at `signing.ts:52`) until `npm run typecheck` is 0.
  3. Confirm `vitest` 4 config still works; run full test suites.
  4. Watch for `tsc` behaviour changes vs the W14 full-strict baseline.
- **Risk:** medium-high (compiler-wide; can cascade through canon `.ts`).

## 4. Vite 8 (`migration/`)

- **Packages:** `vite` 5→8, `@vitejs/plugin-react` 4→6 (move together — CI is red
  on either alone; #78 and #80 failed individually).
- **Why deferred:** major build-tool upgrade; plugin-react 6 targets Vite 8.
- **Scope / steps:** branch; bump both together; `npm run build` + `npm run dev`
  smoke; confirm the ESM/Babel-in-browser boot chain (see CLAUDE.md) still serves.
- **Risk:** medium (build/dev tooling; no runtime app-code change expected).

## 5. ESLint 10 ecosystem (`migration/`)

- **Packages:** `eslint` 9→10, `@eslint/js` 9→10 (and the react eslint plugins).
- **Why deferred:** ESLint 10 outruns `eslint-plugin-react`'s peer range (#66/#83).
- **Do when:** the react eslint plugins publish ESLint 10 peer support. Low urgency.
- **Risk:** low (lint-only; no shipped code affected).

_Note: the deferred majors above are held in `.github/dependabot.yml` via `ignore`.
Remove the matching entry when you start the upgrade so Dependabot resumes it._

---

_Last updated: 2026-07-18._
