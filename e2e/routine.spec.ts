import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { readTown, ready } from './helpers';
import { playMinutes } from './session';

/** A school next door, everyone at home in the living room; the morning begins with the session. */
async function openHome(page: Page) {
  const town = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'school' });
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); }, ['mundo-da-bia:neighborhood:v3', encodeNeighborhood(town)]);
  await ready(page);
}
const wish = (page: Page) => page.locator('.missing-bubble.wish');
const sizes = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }];
const shot = (view: string, size: typeof sizes[number]) => `reports/review/routine-${view}-${size.width}.png`;

test('W3L-27: de manhã a mochila tracejada leva ao Mapa com a escola marcada; ignorar não muda nada; a fome vence a hora', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openHome(page);
  // The first half minute of play never opens with a suggestion.
  await expect(wish(page)).toHaveCount(0);
  await playMinutes(page, .5);
  await expect(wish(page)).toHaveAttribute('data-suggestion', 'mochila');
  await expect(wish(page)).toHaveAttribute('data-actor', 'bia');
  expect(await wish(page).textContent()).not.toMatch(/\d/);
  const before = await readTown(page);
  // A touch opens the Map with the school marked; closing it clears the mark.
  await wish(page).click();
  const school = page.locator('#neighborhood-list [data-building="2"]');
  await expect(school).toHaveClass(/marked/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.marked')).toHaveCount(0);
  // Ignored all morning: by the afternoon the backpack is gone (her needs or the hour speak now) and nothing of the routine was saved.
  await playMinutes(page, 4.5);
  await expect(page.locator('.missing-bubble.wish[data-suggestion="mochila"]')).toHaveCount(0);
  const after = await readTown(page);
  expect(after.progress).toEqual(before.progress);
  expect(after.location).toEqual(before.location);
  expect(errors).toEqual([]);
});

test('W3L-27: de manhã o sino da escola brilha na rua; com fome na rua, a sugestão é o prato (casa), não a hora', async ({ page }) => {
  test.setTimeout(180_000);
  await openHome(page);
  await page.locator('#map-toggle').click();
  await page.locator('#go-street').click();
  await expect.poll(async () => (await readTown(page)).location.kind).toBe('street');
  await expect(page.locator('canvas')).toHaveAttribute('data-bell', 'on');
  // The morning on the street suggests nothing (the backpack is for home); in the afternoon, hungry, the plate leads home.
  await playMinutes(page, .5);
  await expect(wish(page)).toHaveCount(0);
  await playMinutes(page, 4.5);
  await expect(page.locator('canvas')).not.toHaveAttribute('data-bell', 'on');
  await expect(wish(page)).toHaveAttribute('data-suggestion', 'prato');
  await wish(page).click();
  await expect(page.locator('#neighborhood-list [data-building="1"]')).toHaveClass(/marked/);
});

// Captures for the art review, landscape only.
for (const size of sizes) test(`capturas da rotina a ${size.width}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize(size);
  await openHome(page);
  await playMinutes(page, .5);
  await expect(wish(page)).toHaveAttribute('data-suggestion', 'mochila');
  await page.screenshot({ path: shot('bubble', size) });
  await wish(page).click();
  await expect(page.locator('#neighborhood-list [data-building="2"]')).toHaveClass(/marked/);
  await page.screenshot({ path: shot('map', size) });
  await page.locator('#go-street').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-bell', 'on');
  await page.waitForTimeout(1500); // the street fades in
  await page.screenshot({ path: shot('bell', size) });
});
