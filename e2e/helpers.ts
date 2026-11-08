import { expect, type Page } from '@playwright/test';
import { localWorld } from '../src/domain/neighborhood';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import type { World } from '../src/domain/types';
export const readTown = (page: Page): Promise<Neighborhood> => page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:neighborhood:v2')!).town);
export const read = async (page: Page): Promise<World> => localWorld(await readTown(page));
export async function ready(page: Page) { await page.goto('/'); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true'); }
export async function tray(page: Page, tab?: string) {
  if (await page.locator('#tray-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('#tray-toggle').click();
  if (tab) await page.getByRole('button', { name: tab, exact: true }).click();
}
export async function closeTray(page: Page) { if (await page.locator('#tray-toggle').getAttribute('aria-expanded') === 'true') await page.locator('#tray-toggle').click(); }
export async function create(page: Page, name = 'Livre') {
  await page.locator('#map-toggle').click(); await page.locator('#add-room').click();
  await page.getByRole('button', { name: `Criar ${name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Construir cômodo', exact: true }).click();
}
export async function point(page: Page, x: number, y: number) {
  return (await points(page, [[x, y]]))[0]!;
}
async function points(page: Page, positions: [number, number][]) {
  const state = await read(page); const width = { small: 1000, medium: 1200, large: 1400 }[state.layout.rooms[state.room]!.size];
  let box = (await page.locator('canvas').boundingBox())!;
  const viewport = page.viewportSize()!;
  const xs = positions.map(([x]) => box.x + x * box.width / width);
  const left = Math.min(...xs), right = Math.max(...xs);
  const shift = left < 24 ? left - 24 : right > viewport.width - 24 ? right - viewport.width + 24 : 0;
  if (shift) { await page.locator('canvas').dispatchEvent('wheel', { deltaX: shift, deltaY: 0 }); box = (await page.locator('canvas').boundingBox())!; }
  return positions.map(([x, y]) => ({ x: box.x + x * box.width / width, y: box.y + y * box.height / 600 }));
}
export async function drag(page: Page, from: [number, number], to: [number, number], cancel = false) {
  const [a, b] = (await points(page, [from, to])) as [{ x: number; y: number }, { x: number; y: number }];
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 });
  if (cancel) await page.keyboard.press('Escape'); await page.mouse.up();
}
export async function tap(page: Page, x: number, y: number) { const p = await point(page, x, y); await page.touchscreen.tap(p.x, p.y); }
export async function clear(page: Page) {
  await page.locator('#map-toggle').click();
  if (!await page.locator('#room-options').evaluate(n => (n as HTMLDetailsElement).open)) await page.locator('#room-options summary').click();
  await page.locator('#clear-room').click(); await page.locator('#confirm-clear').click();
}

export async function swipe(page: Page, from: number, to: number) {
  const session = await page.context().newCDPSession(page);
  const a = { x: from, y: 115 }, b = { x: to, y: 115 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x, y: b.y, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
}

export async function explore(page: Page) {
  if (await page.locator('#navigation-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('#navigation-toggle').click();
}
export async function visitNeighbor(page: Page, direction: 'next' | 'previous' = 'next') {
  await explore(page); await page.getByRole('button', { name: direction === 'next' ? 'Próximo →' : '← Anterior', exact: true }).click();
  await page.locator('#navigation-toggle').click();
}
export async function choice(page: Page, id: string, value: string) {
  const label = await page.locator(`${id} option[value="${value}"]`).textContent();
  await page.locator(`${id} + .choice-cards`).getByRole('button', { name: label!, exact: true }).click();
}
