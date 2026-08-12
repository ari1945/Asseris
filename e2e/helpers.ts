// Helper bersama untuk kelima perjalanan e2e.
//
// Seluruh panggilan API dilakukan DARI browser (window.AMS_API, tRPC client
// dengan credentials:'include'), sehingga perjalanan memakai sesi cookie
// HttpOnly yang sama dengan UI — bukan token bearer yang ditempel manual.
import { expect, type Page } from '@playwright/test';

export interface E2EUser {
  id: string;
  name: string;
  email: string;
  password: string;
}

export const USERS = {
  manager: { id: 'WHR-AM-0142', name: 'Anindya Pramesti', email: 'anindya.p@whr-cpa.id', password: 'Manager#2025!' },
  partner: { id: 'WHR-EP-0001', name: 'Hartono Wijaya', email: 'hartono.w@whr-cpa.id', password: 'Partner#2025!' },
  partner2: { id: 'WHR-EP-0002', name: 'Rudi Gunawan', email: 'rudi.g@whr-cpa.id', password: 'Rekan#2025!' },
  senior: { id: 'WHR-SR-0210', name: 'Dimas Raharjo', email: 'dimas.r@whr-cpa.id', password: 'Senior#2025!' },
  junior: { id: 'WHR-JR-0388', name: 'Fajar Nugroho', email: 'fajar.n@whr-cpa.id', password: 'Junior#2025!' },
} as const satisfies Record<string, E2EUser>;

export const ENG_014 = 'ENG-2025-014';
export const ENG_031 = 'ENG-2025-031';

type StateTarget = { scope: string; scopeId: string; key: string };

/** Login lewat layar LoginScreen dan tunggu hidrasi selesai (topbar + chip user). */
export async function login(page: Page, user: E2EUser): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#lg-email')).toBeVisible();
  await page.locator('#lg-email').fill(user.email);
  await page.locator('#lg-pw').fill(user.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.user-chip .u-name')).toContainText(user.name.split(' ')[0]);
}

export async function logout(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await (window as any).AMS_API.auth.logout.mutate();
  });
}

/** Panggil prosedur tRPC apa pun dari konteks browser dan normalisasi hasil/error. */
export async function trpcSafe<T = unknown>(
  page: Page,
  path: string,
  kind: 'query' | 'mutation',
  input?: unknown,
): Promise<{ ok: true; data: T } | { ok: false; code: string; message: string }> {
  return page.evaluate(
    async ({ path: p, kind: k, input: i }) => {
      const api = (window as any).AMS_API;
      try {
        // path seperti "state.get" / "audit.list" — telusuri objek bersarang.
        const [group, method] = p.split('.');
        const fn = api[group]?.[method];
        if (!fn) throw new Error(`prosedur tak dikenal: ${p}`);
        const data = k === 'query' ? await fn.query(i) : await fn.mutate(i);
        return { ok: true as const, data };
      } catch (e: any) {
        const d = e?.data ?? e?.shape?.data;
        return {
          ok: false as const,
          code: String(d?.code ?? 'UNKNOWN'),
          message: String(e?.message ?? e ?? ''),
        };
      }
    },
    { path, kind, input },
  );
}

export function stateGetSafe(page: Page, target: StateTarget) {
  return trpcSafe<any>(page, 'state.get', 'query', target);
}

export function stateSetSafe(
  page: Page,
  target: StateTarget & { value: unknown; baseVersion: number },
) {
  return trpcSafe<{ version: number }>(page, 'state.set', 'mutation', target);
}

export function stateHistorySafe(page: Page, target: StateTarget) {
  return trpcSafe<Array<{ version: number; updatedAt: string; updatedBy: string | null; value: unknown }>>(
    page,
    'state.history',
    'query',
    target,
  );
}

export function auditListSafe(page: Page, limit = 200) {
  return trpcSafe<Array<{
    seq: number; action: string; scope: string | null; scopeId: string | null;
    key: string | null; detail: string | null; actorUserId: string | null;
  }>>(page, 'audit.list', 'query', { limit });
}

export function auditVerifySafe(page: Page) {
  return trpcSafe<{ ok: boolean; brokenAt: number | null; count: number }>(page, 'audit.verify', 'query');
}

/** Ganti engagement aktif lewat dropdown TopBar dan tunggu UI mengonfirmasi. */
export async function switchEngagement(page: Page, engagementId: string): Promise<void> {
  await page.locator('.top-ctx').click();
  const menu = page.locator('.dropmenu');
  await expect(menu).toBeVisible();
  await menu.getByText(engagementId, { exact: false }).first().click();
  await expect(page.locator('.top-ctx')).toContainText(engagementId);
}

/** Navigasi hash langsung ke modul (mis. '#/wtb'), cara yang sama dengan tautan dalam. */
export async function gotoModule(page: Page, moduleId: string): Promise<void> {
  await page.evaluate((m) => {
    window.location.hash = `#/${m}`;
  }, moduleId);
  await page.waitForTimeout(300);
}

export function shortName(fullName: string): string {
  const parts = fullName.replace(/,.*$/, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** Bentuk tanda tangan rantai kertas kerja yang sah bagi guard server. */
export function wpSignature(user: E2EUser, atIso: string) {
  return { by: shortName(user.name), byUserId: user.id, at: atIso, contentHash: 'e2e-wp-chain' };
}
