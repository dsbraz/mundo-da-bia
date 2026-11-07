import { expect, type Page } from '@playwright/test';
import type { World } from '../src/domain/types';
export const read = (page: Page): Promise<World> => page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:v1')!).state);
export async function ready(page: Page) { await page.goto('/'); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true'); }
export async function tray(page: Page, tab?: string) {
  if (await page.locator('#tray-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('#tray-toggle').click();
  if (tab) await page.getByRole('button', { name: tab, exact: true }).click();
}
export async function closeTray(page: Page) { if (await page.locator('#tray-toggle').getAttribute('aria-expanded') === 'true') await page.locator('#tray-toggle').click(); }
export async function create(page: Page, name = 'Livre') {
  await page.locator('#map-toggle').click(); await page.locator('#add-room').click();
  await page.getByRole('button', { name: `Criar ${name}`, exact: true }).click();
}
export async function point(page: Page, x: number, y: number) {
  const state = await read(page); const width = { small: 1000, medium: 1200, large: 1400 }[state.layout.rooms[state.room]!.size];
  const box = (await page.locator('canvas').boundingBox())!;
  return { x: box.x + x * box.width / width, y: box.y + y * box.height / 600 };
}
export async function drag(page: Page, from: [number, number], to: [number, number], cancel = false) {
  const a = await point(page, ...from), b = await point(page, ...to);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 });
  if (cancel) await page.keyboard.press('Escape'); await page.mouse.up();
}
export async function tap(page: Page, x: number, y: number) { const p = await point(page, x, y); await page.touchscreen.tap(p.x, p.y); }
export async function clear(page: Page) {
  await page.locator('#map-toggle').click();
  if (!await page.locator('#room-options').evaluate(n => (n as HTMLDetailsElement).open)) await page.locator('#room-options summary').click();
  await page.locator('#clear-room').click(); await page.locator('#confirm-clear').click();
}
