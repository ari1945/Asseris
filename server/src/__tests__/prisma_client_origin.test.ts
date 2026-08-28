import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

/* ============================================================
   Gerbang asal-usul client Prisma — DIUJI DENGAN MEMAKSANYA MERAH.

   `tools/ensure-prisma-client.mjs` sudah memuat pelajarannya sendiri: "gerbang yang
   belum pernah terlihat MERAH belum membuktikan apa pun". Pelajaran itu ditulis
   sesudah versi pertamanya memakai `includes('server/prisma')` — dan path worktree
   JUGA mengandung itu, jadi ia lolos.

   Pelajaran yang sama lalu menggigit dua kali lagi:
     · 2026-08-27 — 19 uji backend gagal `The table main.StateDoc does not exist`
       sementara gerbangnya mencetak OK. Sebabnya bukan regex: ia memeriksa SEKALI di
       langkah 1 dari 12, lalu sesi paralel memanggang ulang client bersama di tengah
       pipeline. Gerbangnya benar; jendelanya yang salah.
     · Diagnosis pertamanya pun keliru — grep `"sourceFilePath":"` (tanpa spasi
       sesudah titik dua) memberi nol hasil atas keluaran Prisma 6.19 yang menulis
       `"sourceFilePath": "`, dan dari situ lahir kesimpulan "kuncinya hilang".

   Karena itu gerbangnya diuji atas POHON PALSU yang keadaannya benar-benar dibangun,
   dan dijalankan sebagai PROSES — bukan dengan memanggil ulang logikanya. Uji yang
   memanggil ulang logika gerbang hanya membuktikan logika itu konsisten dgn dirinya.
   ============================================================ */

const GATE = resolve('../tools/ensure-prisma-client.mjs');

const trees: string[] = [];
afterAll(() => {
  for (const t of trees) rmSync(t, { recursive: true, force: true });
});

function tmpTree(prefix = 'gate-prisma-'): string {
  const t = mkdtempSync(join(tmpdir(), prefix));
  trees.push(t);
  return t;
}

const schemaOf = (provider: string) =>
  `datasource db {\n  provider = "${provider}"\n  url = env("DATABASE_URL")\n}\n`;

/** Skema milik pohon itu sendiri — nilai `baked` yang SEHAT. */
const ownSchema = (root: string) => join(root, 'server', 'prisma', 'schema.prisma');

interface TreeOpts {
  /** Provider di skema SUMBER. `null` = tak ada skema sumber sama sekali. */
  source?: string | null;
  /** Provider di skema TERGENERASI. `null` = client belum pernah digenerasi. */
  generated?: string | null;
  /** Path skema yang DIPANGGANG ke index.js; `(root) => string`. */
  baked?: ((root: string) => string) | null;
}

/**
 * Bangun pohon palsu berisi persis apa yang dibaca gerbang.
 *
 * `baked: null` menulis index.js TANPA penanda — meniru Prisma yang memindahkan
 * kuncinya antar-versi, keadaan yang dulu dikira "aman".
 */
function makeTree(opts: TreeOpts = {}): string {
  const root = tmpTree();
  const server = join(root, 'server');
  mkdirSync(join(server, 'prisma'), { recursive: true });
  if (opts.source !== null) writeFileSync(ownSchema(root), schemaOf(opts.source ?? 'sqlite'));

  if (opts.generated === null) return root;

  const client = join(server, 'node_modules', '.prisma', 'client');
  mkdirSync(client, { recursive: true });
  writeFileSync(join(client, 'schema.prisma'), schemaOf(opts.generated ?? 'sqlite'));
  /* Prisma menulis path Windows dengan backslash GANDA di dalam sumber JS-nya.
     Fixture meniru itu persis — kalau tidak, uji ini lolos di Linux dan justru
     melewatkan platform tempat cacatnya terjadi. */
  const marker = opts.baked == null
    ? '{ "somethingElse": "penanda dipindah versi lain" }'
    : `{ "sourceFilePath": "${opts.baked(root).replace(/\\/g, '\\\\')}" }`;
  writeFileSync(join(client, 'index.js'), `module.exports.config = ${marker};\n`);
  return root;
}

function runGate(root: string, mode: 'check' | 'fix' = 'check') {
  const args = mode === 'check' ? [GATE, '--root', root, '--check'] : [GATE, '--root', root];
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

describe('HIJAU hanya bila client memang milik pohon ini', () => {
  it('client terpanggang di pohon SENDIRI → keluar 0', () => {
    const r = runGate(makeTree({ baked: ownSchema }));
    expect(r.code, r.out).toBe(0);
    expect(r.out).toMatch(/OK — client tergenerasi cocok/);
  });
});

describe('MERAH — dan tiap sebabnya disebut namanya', () => {
  it('terpanggang ke WORKTREE LAIN DI BAWAH ROOT YANG SAMA → merah (jebakan substring)', () => {
    /* Kasus historisnya. Path asing di bawah `<root>/.claude/worktrees/…` MENGANDUNG
       `server/prisma`, jadi pemeriksaan `includes()` MELOLOSKANNYA; hanya perbandingan
       prefiks absolut yang menangkapnya. */
    const foreignOf = (root: string) =>
      join(root, '.claude', 'worktrees', 'w0-hcm', 'server', 'prisma', 'schema.prisma');
    const root = makeTree({ baked: foreignOf });
    const r = runGate(root);

    expect(r.code, r.out).toBe(1);
    expect(r.out).toMatch(/POHON LAIN/);
    expect(r.out, 'pesannya harus MENYEBUT pohon asingnya, bukan sekadar "tidak cocok"')
      .toContain('w0-hcm');
    /* Pastikan uji ini benar-benar menguji jebakannya: path asing itu memang
       mengandung substring yang dulu meloloskannya. */
    expect(foreignOf(root).replace(/\\/g, '/')).toContain('server/prisma');
  });

  it('PENANDA TAK TERBACA (kunci Prisma pindah versi) → merah, bukan diam-diam OK', () => {
    const r = runGate(makeTree({ baked: null }));
    expect(r.code, r.out).toBe(1);
    expect(r.out).toMatch(/TAK TERBACA/);
    expect(r.out).toMatch(/sourceFilePath/);
  });

  it('provider tergenerasi ≠ provider skema (sisa e2e Postgres) → merah', () => {
    const r = runGate(makeTree({ generated: 'postgresql', baked: ownSchema }));
    expect(r.code, r.out).toBe(1);
    expect(r.out).toMatch(/postgresql/);
  });

  it('client belum pernah digenerasi → merah', () => {
    const r = runGate(makeTree({ generated: null }));
    expect(r.code, r.out).toBe(1);
    expect(r.out).toMatch(/belum pernah digenerasi/);
  });

  it('skema sumber tak terbaca → merah, bukan lolos senyap', () => {
    const r = runGate(makeTree({ source: null, generated: null }));
    expect(r.code, r.out).toBe(1);
    expect(r.out).toMatch(/tidak dapat membaca provider/);
  });
});

describe('mode --check MEMBANTAH, tidak memperbaiki', () => {
  it('tak pernah mengucapkan "regenerasi…", dan menunjuk mode perbaiki', () => {
    const r = runGate(makeTree({ baked: null }), 'check');
    expect(r.code).toBe(1);
    expect(r.out, 'memperbaiki di titik pakai = tarik-menarik dgn sesi lain atas satu node_modules')
      .not.toMatch(/regenerasi…/);
    expect(r.out).toMatch(/ensure-prisma-client\.mjs/);
  });

  it('penanda tak terbaca menyuruh MEMPERBARUI gerbang, bukan melonggarkannya', () => {
    const r = runGate(makeTree({ baked: null }));
    expect(r.out).toMatch(/jangan melonggarkan gerbangnya/);
  });

  /* Obat harus cocok dengan sebab. Resep isolasi (membongkar node_modules) hanya sah
     bila node_modules memang DIBAGI; menyodorkannya untuk provider yang tak cocok
     menyuruh orang melakukan pekerjaan besar demi masalah satu perintah. */
  it('pohon dengan node_modules SENDIRI tidak disuruh membongkar node_modules', () => {
    const r = runGate(makeTree({ generated: 'postgresql', baked: ownSchema }));
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/postgresql/);
    expect(r.out, 'resep isolasi tak relevan di sini — obatnya cukup regenerate')
      .not.toMatch(/npm ci --no-audit --no-fund/);
  });
});

describe('prasyarat balapan: server/node_modules yang DIBAGI', () => {
  it('junction ke luar pohon DISEBUTKAN — tanpa itu jendelanya tak bisa ditutup', () => {
    const donor = tmpTree('gate-prisma-donor-');
    const client = join(donor, '.prisma', 'client');
    mkdirSync(client, { recursive: true });
    writeFileSync(join(client, 'schema.prisma'), schemaOf('sqlite'));

    const root = tmpTree();
    mkdirSync(join(root, 'server', 'prisma'), { recursive: true });
    writeFileSync(ownSchema(root), schemaOf('sqlite'));
    writeFileSync(
      join(client, 'index.js'),
      `module.exports.config = { "sourceFilePath": "${ownSchema(root).replace(/\\/g, '\\\\')}" };\n`,
    );
    try {
      symlinkSync(donor, join(root, 'server', 'node_modules'), 'junction');
    } catch {
      /* Symlink butuh hak khusus di sebagian Windows. Di sana pernyataan ini tak dapat
         diuji — dilewati dengan sengaja, bukan dianggap lulus. */
      return;
    }

    const r = runGate(root);
    expect(r.out, 'node_modules bersama WAJIB disebut — ia prasyarat tabrakannya').toMatch(/DIBAGI/);
  });

  it('bila DIBAGI dan tidak cocok, resep isolasinya ikut diberikan', () => {
    const donor = tmpTree('gate-prisma-donor-');
    const client = join(donor, '.prisma', 'client');
    mkdirSync(client, { recursive: true });
    writeFileSync(join(client, 'schema.prisma'), schemaOf('sqlite'));
    /* Terpanggang ke pohon LAIN — persis insiden 2026-08-27. */
    writeFileSync(
      join(client, 'index.js'),
      'module.exports.config = { "sourceFilePath": "'
      + join(donor, 'w0-hcm', 'server', 'prisma', 'schema.prisma').replace(/\\/g, '\\\\')
      + '" };\n',
    );

    const root = tmpTree();
    mkdirSync(join(root, 'server', 'prisma'), { recursive: true });
    writeFileSync(ownSchema(root), schemaOf('sqlite'));
    try {
      symlinkSync(donor, join(root, 'server', 'node_modules'), 'junction');
    } catch {
      return;
    }

    const r = runGate(root);
    expect(r.code, r.out).toBe(1);
    expect(r.out).toMatch(/POHON LAIN/);
    expect(r.out, 'di sinilah resep isolasi memang obatnya').toMatch(/npm ci --no-audit --no-fund/);
  });
});
