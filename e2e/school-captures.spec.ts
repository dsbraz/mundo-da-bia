import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { drawingIds } from '../src/domain/progress';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import { ready } from './helpers';
import { openSchool, seatAt, tapBoard } from './school-helpers';

// Captures of W3L-26 for the art review, landscape only: 1024×768 and 1280×800.
const sizes = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }];
const name = (view: string, size: typeof sizes[number]) => `reports/review/school-${view}-${size.width}.png`;

for (const size of sizes) test(`capturas da escola a ${size.width}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize(size);
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await openSchool(page);
  await page.screenshot({ path: name('classroom', size) });
  await tapBoard(page);
  await expect(page.locator('.missing-bubble:not(.thought)')).toBeVisible();
  await page.screenshot({ path: name('missing-desk', size) });
  await seatAt(page, 'bia', 0); await seatAt(page, 'leo', 1);
  await page.clock.runFor(3000);
  await tapBoard(page);
  await page.clock.runFor(9000);
  await page.screenshot({ path: name('lesson-drawing', size) });
  await page.clock.runFor(11_500);
  await expect(page.locator('canvas')).toHaveAttribute('data-lesson', 'sol:done');
  await page.clock.runFor(400);
  await page.screenshot({ path: name('lesson-done', size) });
});
/** Home's living room after four lessons, the fridge closed and open. */
function withDrawings(open: boolean): Neighborhood {
  const world = initialWorld(); world.home = { ...world.home, fridge: open };
  const town = migrateNeighborhood(initialAlbum(world));
  return { ...town, progress: { ...town.progress, drawings: [...drawingIds.slice(0, 5)] } };
}
async function openHome(page: Page, town: Neighborhood) {
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); }, ['mundo-da-bia:neighborhood:v3', encodeNeighborhood(town)]);
  await ready(page);
}
for (const size of sizes) for (const open of [false, true]) test(`desenhos na geladeira ${open ? 'aberta' : 'fechada'} a ${size.width}`, async ({ page }) => {
  await page.setViewportSize(size);
  await openHome(page, withDrawings(open));
  await expect(page.locator('canvas')).toHaveAttribute('data-fridge-drawings', drawingIds.slice(1, 5).join(' '));
  await page.screenshot({ path: name(`fridge-${open ? 'open' : 'closed'}`, size) });
});
