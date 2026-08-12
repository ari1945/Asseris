import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

function migrationSql(): string {
  const root = resolve('prisma/migrations');
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readFileSync(resolve(root, entry.name, 'migration.sql'), 'utf8'))
    .join('\n');
}

describe('Tahap 0 — reproduksi bootstrap database production', () => {
  it('schema production dapat dibangun lengkap hanya dari Prisma migration', () => {
    const schema = readFileSync(resolve('prisma/schema.prisma'), 'utf8');
    const models = [...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map((match) => ({
      name: match[1],
      fields: [...match[2].matchAll(/^\s+(\w+)\s+(?:String|Int|Float|Boolean|DateTime)(?:\?|\[\])?\b/gm)]
        .map((field) => field[1]),
    }));
    const sql = migrationSql();
    const missingTables = models.map((model) => model.name)
      .filter((model) => !new RegExp(`CREATE TABLE\\s+"${model}"`, 'i').test(sql));
    const missingColumns = models.flatMap((model) => {
      const create = new RegExp(`CREATE TABLE\\s+"${model.name}"\\s*\\(([\\s\\S]*?)\\);`, 'i').exec(sql)?.[1] ?? '';
      return model.fields
        .filter((field) => !new RegExp(`"${field}"`, 'i').test(create)
          && !new RegExp(`ALTER TABLE\\s+"${model.name}"\\s+ADD COLUMN\\s+"${field}"`, 'i').test(sql))
        .map((field) => `${model.name}.${field}`);
    });
    const rootCompose = readFileSync(resolve('../docker-compose.yml'), 'utf8');
    const deployCompose = readFileSync(resolve('../deploy/aws-ec2-test/docker-compose.deploy.yml'), 'utf8');

    expect(rootCompose).toContain('prisma migrate deploy');
    expect(deployCompose).toContain('prisma migrate deploy');
    expect(rootCompose).not.toMatch(/command:[^\n]*prisma db push/);
    expect(deployCompose).not.toMatch(/command:[^\n]*prisma db push/);
    expect(missingTables, `Model tanpa CREATE TABLE di prisma/migrations: ${missingTables.join(', ')}`).toEqual([]);
    expect(missingColumns, `Kolom tanpa migration: ${missingColumns.join(', ')}`).toEqual([]);
  });
});
