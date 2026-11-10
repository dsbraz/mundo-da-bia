import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { point, readTown, ready, tap } from './helpers';

/** Bia sitting on the plaza swing, the clock paused. */
async function onSwing(page: Page) {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  town.location = { kind: 'street' }; town.outdoor.swing = 'bia';
  town.actors = town.actors.map(a => a.id === 'bia' ? { ...a, location: { kind: 'street' }, x: 400, y: 445, seat: null } : a);
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(town));
  await page.setViewportSize({ width: 1024, height: 768 }); await ready(page);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
}
const swing = async (page: Page) => Number(await page.locator('canvas').getAttribute('data-swing'));
async function clip(page: Page) {
  const a = await point(page, 260, 200), b = await point(page, 540, 470);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}
/** Three taps in a row on the swing, 0.8 s apart; returns how wide it swings after each. */
async function pushThrice(page: Page) {
  const sizes: number[] = [];
  for (let n = 0; n < 3; n++) { await tap(page, 400, 470); await page.clock.runFor(50); sizes.push(await swing(page)); await page.clock.runFor(750); }
  return sizes;
}

test('três toques seguidos levam o balanço mais alto; quem sai deixa o assento balançando até parar em cerca de 8 s', async ({ page }) => {
  await onSwing(page);
  expect(await swing(page)).toBe(0);
  const sizes = await pushThrice(page);
  expect(sizes[0]).toBeGreaterThan(.1); expect(sizes[1]).toBeGreaterThan(sizes[0]! * 1.3); expect(sizes[2]).toBeGreaterThan(sizes[1]! * 1.15);
  await expect(page.locator('canvas')).toHaveAttribute('data-faces', /bia:laugh/);
  await page.screenshot({ path: 'reports/swing-high.png', clip: await clip(page) });
  expect((await readTown(page)).outdoor.swing).toBe('bia');
  // Getting down without reading: a tap on the floor walks away from the swing.
  await tap(page, 250, 520);
  for (let t = 0; t < 6000 && (await readTown(page)).outdoor.swing; t += 100) await page.clock.runFor(100);
  expect((await readTown(page)).outdoor.swing).toBeNull();
  const left = await swing(page); expect(left).toBeGreaterThan(0);
  await page.screenshot({ path: 'reports/swing-empty.png', clip: await clip(page) });
  let still = 0;
  for (; still < 12000 && await swing(page) > 0; still += 250) await page.clock.runFor(250);
  expect(await swing(page)).toBe(0); expect(still).toBeGreaterThan(2000); expect(still).toBeLessThanOrEqual(9000);
});

test('com movimento reduzido o balanço fica parado, mas o toque responde com riso', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await onSwing(page);
  expect(await pushThrice(page)).toEqual([0, 0, 0]);
  await tap(page, 400, 470); await page.clock.runFor(50);
  await expect(page.locator('canvas')).toHaveAttribute('data-faces', /bia:laugh/);
  await page.screenshot({ path: 'reports/swing-reduced.png', clip: await clip(page) });
  expect((await readTown(page)).outdoor.swing).toBe('bia');
});
