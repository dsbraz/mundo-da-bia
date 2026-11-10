import { visualPiecePoint } from '../src/presentation/furniture-scale';
import { fixture } from '../src/domain/layout';
import type { PieceKind } from '../src/domain/types';
import { expect, type Page } from '@playwright/test';
import { localWorld } from '../src/domain/neighborhood';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import type { World } from '../src/domain/types';
export const readTown = (page: Page): Promise<Neighborhood> => page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:neighborhood:v2')!).town);
export const read = async (page: Page): Promise<World> => localWorld(await readTown(page));
/** Plays scene time in `step` ms frames until `read` gives `value` (at most `limit` ms of scene time), then asserts it. */
export async function playUntil<T>(page: Page, read: () => Promise<T>, value: T, step = 50, limit = 15000) {
  for (let t = 0; t < limit && await read() !== value; t += step) await page.clock.runFor(step);
  expect(await read()).toBe(value);
}
export async function ready(page: Page) { await page.goto('/'); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true'); }
export async function tray(page: Page, tab?: string) {
  if (await page.locator('#tray-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('#tray-toggle').click();
  if (tab) await page.locator('.mode-tray:not([hidden])').getByRole('button', { name: tab, exact: true }).click();
}
export async function closeTray(page: Page) { if (await page.locator('#tray-toggle').getAttribute('aria-expanded') === 'true') await page.locator('#tray-toggle').click(); }
export async function create(page: Page, name = 'Livre') {
  await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Organizar', exact: true }).click(); await page.locator('#add-room').click();
  await page.getByRole('button', { name: `Criar ${name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Construir cômodo', exact: true }).click();
}
/** In play, tapping the current room on the Map brings the selected character into it. */
export async function bringHere(page: Page) {
  await page.locator('#map-toggle').click(); await page.locator('#room-map .room-card > button[aria-pressed=true]').click();
}
export async function point(page: Page, x: number, y: number) {
  return (await points(page, [[x, y]]))[0]!;
}
async function points(page: Page, positions: [number, number][]) {
  const project = () => page.locator('canvas').evaluate((canvas, positions) => {
    const box = canvas.getBoundingClientRect(), scale = box.width / Number(canvas.dataset.viewWidth);
    return positions.map(([x, y]) => ({ x: box.x + (x - Number(canvas.dataset.viewX) - Number(canvas.dataset.cameraX)) * scale,
      y: box.y + (y - Number(canvas.dataset.viewY)) * scale }));
  }, positions);
  let projected = await project();
  const viewport = (await page.locator('#world').boundingBox())!;
  const left = Math.min(...projected.map(p => p.x)), right = Math.max(...projected.map(p => p.x));
  const shift = left < viewport.x + 24 ? left - viewport.x - 24 : right > viewport.x + viewport.width - 24 ? right - viewport.x - viewport.width + 24 : 0;
  if (shift) { await page.locator('canvas').dispatchEvent('wheel', { deltaX: shift, deltaY: 0 }); projected = await project(); }
  return projected;
}

export async function drag(page: Page, from: [number, number], to: [number, number], cancel = false) {
  const [a, b] = (await points(page, [from, to])) as [{ x: number; y: number }, { x: number; y: number }];
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  if (Math.hypot(b.x - a.x, b.y - a.y) < 12) await page.mouse.move(a.x + 16, a.y);
  await page.mouse.move(b.x, b.y, { steps: 8 });
  if (cancel) await page.keyboard.press('Escape'); await page.mouse.up();
}
export async function tap(page: Page, x: number, y: number) { const p = await point(page, x, y); await page.touchscreen.tap(p.x, p.y); }
export async function clear(page: Page) {
  await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Organizar', exact: true }).click();
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
  if (!await page.locator('#room-dialog').isVisible()) await page.locator('#map-toggle').click();
  if (!await page.locator('#navigation-shortcuts').evaluate(n => (n as HTMLDetailsElement).open)) await page.locator('#navigation-shortcuts summary').click();
}
export async function visitNeighbor(page: Page, direction: 'next' | 'previous' = 'next') {
  await explore(page); await page.getByRole('button', { name: direction === 'next' ? 'Próximo →' : '← Anterior', exact: true }).click();
  await page.locator('#close-map').click();
}
export async function choice(page: Page, id: string, value: string) {
  const label = await page.locator(`${id} option[value="${value}"]`).textContent();
  await page.locator(`${id} + .choice-cards`).getByRole('button', { name: label!, exact: true }).click();
}

export async function onPiece(page: Page, kind: PieceKind, x: number, y: number): Promise<[number, number]> {
  const world = await read(page), piece = fixture(world, kind)!;
  const point = visualPiecePoint(piece, { x, y });
  return [point.x, point.y];
}
