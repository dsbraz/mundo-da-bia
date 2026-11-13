import { expect, test, type Page } from '@playwright/test';
import { initialWorld, transition } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { addRoom } from '../src/domain/rooms';
import { seatPoint } from '../src/domain/seats';
import { visualPiecePoint } from '../src/presentation/furniture-scale';
import { drag, read, ready, tap } from './helpers';

/** A new bathroom (with its toilet) and the Bia standing in it, the others at home in the living room. */
async function bathroom(page: Page, width: number, height: number) {
  let world = addRoom(initialWorld(), { name: 'Banheiro', template: 'bathroom', size: 'medium', cell: 2 });
  world = transition(world, { type: 'travel', actor: 'bia', room: world.room }).state;
  world.actors = world.actors.map(a => a.id === 'bia' ? { ...a, x: 200, y: 520 } : a);
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await page.setViewportSize({ width, height }); await ready(page);
}
const bia = async (page: Page) => (await read(page)).actors.find(a => a.id === 'bia')!;

for (const [width, height] of [[1024, 768], [1280, 800]] as const) test(`no banheiro novo tem vaso: a Bia senta nele, um toque dá a descarga e ela se levanta feliz (${width})`, async ({ page }) => {
  await bathroom(page, width, height);
  const world = await read(page), toilet = world.layout.pieces.find(p => p.room === world.room && p.kind === 'toilet')!;
  expect(toilet).toBeDefined();
  const seat = `${toilet.id}.0` as const, at = visualPiecePoint(toilet, seatPoint(world, seat)!), start = await bia(page);
  await drag(page, [start.x, start.y - 110], [at.x, at.y - 40]);
  await expect.poll(async () => (await bia(page)).seat).toBe(seat);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `reports/review/toilet-sit-${width}.png` });
  // The tank's lever stays in view beside her: a touch there flushes, with nobody walking over.
  await tap(page, toilet.x + 9, toilet.y + 22);
  await expect(page.locator('canvas')).toHaveAttribute('data-flush', String(toilet.id));
  await page.waitForTimeout(250);
  await page.screenshot({ path: `reports/review/toilet-flush-${width}.png` });
  await expect.poll(async () => (await bia(page)).seat).toBeNull();
  const after = await bia(page);
  expect(Math.abs(after.x - (toilet.x + 55))).toBeGreaterThan(55);
  await expect(page.locator('canvas')).toHaveAttribute('data-reaction', 'bia:');
  await expect(page.locator('canvas')).toHaveAttribute('data-flush', '');
  await page.screenshot({ path: `reports/review/toilet-stand-${width}.png` });
});
test('o vaso está no catálogo do Criar, entre as peças do banheiro, com seu desenho', async ({ page }) => {
  await bathroom(page, 1024, 768);
  await page.locator('#build-toggle').click();
  await page.locator('[data-category-filter="bathroom"]').click();
  const card = page.locator('.catalog-piece[data-kind="toilet"]');
  await expect(card).toBeVisible();
  await expect(card.locator('img')).toHaveJSProperty('complete', true);
  await page.screenshot({ path: 'reports/review/toilet-catalog-1024.png' });
});
