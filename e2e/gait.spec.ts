import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { point, ready, tap } from './helpers';

/** Bia and Mimi on the street, far from the plaza, with a paused clock. */
async function street(page: Page) {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  town.location = { kind: 'street' };
  town.actors = town.actors.map(a => a.id === 'bia' ? { ...a, location: { kind: 'street' }, x: 700, y: 520 } : a.id === 'mimi' ? { ...a, location: { kind: 'street' }, x: 820, y: 530 } : a);
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(town));
  await page.setViewportSize({ width: 1280, height: 800 }); await ready(page);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
}
const walkX = async (page: Page) => Number(await page.locator('canvas').getAttribute('data-walk-x'));
async function clip(page: Page, x: number, y: number, height: number) {
  const a = await point(page, x - 90, y - height), b = await point(page, x + 90, y + 20);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}

test('na rua a figura menor anda mais devagar, na mesma cadência, sem patinar', async ({ page }) => {
  await street(page);
  await tap(page, 940, 520);
  await page.clock.runFor(400); await expect(page.locator('canvas')).toHaveAttribute('data-gait', /bia:walk/);
  const from = await walkX(page);
  await page.clock.runFor(500);
  // Full speed on the street is 0.6 × 0.2 px/ms: 60 px in 500 ms (indoors it would be 100).
  expect(await walkX(page) - from).toBeGreaterThan(50); expect(await walkX(page) - from).toBeLessThan(70);
  await page.screenshot({ path: 'reports/gait-street-walk.png', clip: await clip(page, await walkX(page), 520, 160) });
});

test('o gato trota com a cauda erguida', async ({ page }) => {
  await street(page);
  await tap(page, 820, 500); await expect(page.locator('#actor-context')).toContainText(/Mimi/);
  await tap(page, 600, 530);
  await page.clock.runFor(500); await expect(page.locator('canvas')).toHaveAttribute('data-gait', /mimi:trot/);
  await page.screenshot({ path: 'reports/gait-cat-trot.png', clip: await clip(page, await walkX(page), 530, 100) });
});
