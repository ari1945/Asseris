import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  ['frontend lint', 'migration', 'node_modules/eslint/bin/eslint.js', ['src']],
  ['frontend typecheck', 'migration', 'node_modules/typescript/bin/tsc', ['--noEmit']],
  ['frontend test typecheck', 'migration', 'node_modules/typescript/bin/tsc', ['--noEmit', '-p', 'tsconfig.test.json']],
  ['frontend tests', 'migration', 'node_modules/vitest/vitest.mjs', ['run']],
  ['backend typecheck', 'server', 'node_modules/typescript/bin/tsc', ['--noEmit']],
  ['backend tests', 'server', 'node_modules/vitest/vitest.mjs', ['run']],
];

const failures = [];
for (const [label, workspace, entry, args] of checks) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, [resolve(root, workspace, entry), ...args], {
    cwd: resolve(root, workspace),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.status !== 0) failures.push(label);
}

if (failures.length) {
  console.error(`\nVERIFY FAILED: ${failures.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('\nVERIFY PASSED');
}
