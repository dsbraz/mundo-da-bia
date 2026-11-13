import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { doorFront } from '../src/presentation/neighborhood-doors';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import { onPiece, ready, swipe, tap } from './helpers';

// Captures of lot 4 (W3L-21 to W3L-23) for the art review: 1024×768 and 844×390, and reduced motion at 1024.
const saveKey = 'mundo-da-bia:neighborhood:v3', dir = 'reports/wave3-life-4';
const sizes = [{ width: 1024, height: 768, reduced: false }, { width: 844, height: 390, reduced: false }, { width: 1024, height: 768, reduced: true }];
const name = (view: string, size: typeof sizes[number]) => `${dir}/${view}-${size.width}${size.reduced ? '-reduced' : ''}.png`;
async function open(page: Page, town: Neighborhood, size: typeof sizes[number]) {
  if (size.reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize(size);
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); }, [saveKey, encodeNeighborhood(town)]);
  await ready(page);
}
/** A new game with a market on plot 1; the others stay home. */
function withMarket(): Neighborhood {
  const world = initialWorld();
  world.actors = world.actors.map(a => ({ ...a, room: a.id === 'bia' ? 'sala' : 'quarto', x: 760, y: 520, seat: null }));
  return neighborhoodAction(migrateNeighborhood(initialAlbum(world)), { type: 'construct', plot: 1, model: 'shop', plan: 'market' });
}
const hall = { kind: 'interior' as const, building: 2, room: 'sala' as const };
const inHall = (town: Neighborhood): Neighborhood => ({ ...town, location: hall, actors: town.actors.map(a => a.id === 'bia' ? { ...a, location: hall, room: 'sala', x: 520, y: 540 } : a) });
/** Home's living room with the fridge open, a stove where the wardrobe was, and `stock` in the pantry. */
function openFridge(stock: Record<string, number> | undefined): Neighborhood {
  const world = initialWorld();
  world.home = { ...world.home, fridge: true };
  world.layout = { ...world.layout, pieces: [...world.layout.pieces.filter(p => p.kind !== 'wardrobe'), { id: 90, kind: 'stove', room: 'sala', x: 300, y: 250, color: 'original', flipped: false }], nextId: 100 };
  world.actors = world.actors.map(a => ({ ...a, room: a.id === 'bia' ? 'sala' : 'quarto', x: 480, y: 540, seat: null }));
  const town = migrateNeighborhood(initialAlbum(world));
  return { ...town, buildings: town.buildings.map(b => b.id === 1 ? (stock ? { ...b, stock } : b) : b) };
}

for (const size of sizes) test(`capturas do lote 4 a ${size.width}${size.reduced ? ' (movimento reduzido)' : ''}`, async ({ page }) => {
  const town = withMarket(), door = doorFront(town, hall);
  const street = neighborhoodAction(town, { type: 'transport', actor: 'bia', location: { kind: 'street' }, point: { x: door.x + 140, y: door.y + 30 } });
  await open(page, street, size);
  // The camera slides along the street until the market's door is in the middle.
  const camera = async () => Number(await page.locator('canvas').getAttribute('data-camera-x'));
  for (let n = 0; n < 8 && await camera() < door.x - 520; n++) await swipe(page, size.width - 150, size.width - 450);
  await page.waitForTimeout(400);
  await page.screenshot({ path: name('market-facade', size) });
});
for (const size of sizes) test(`interior do mercado e a sacola a ${size.width}${size.reduced ? ' (movimento reduzido)' : ''}`, async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, inHall(withMarket()), size);
  await page.screenshot({ path: name('market-interior', size) });
  await tap(page, ...await onPiece(page, 'market-shelf', 225, 330));
  const panel = page.locator('#market-panel');
  await expect(panel).toBeVisible({ timeout: 15000 });
  for (const good of ['pao', 'leite', 'queijo']) await panel.locator(`.market-good[data-good="${good}"]`).click();
  await expect(panel).toHaveAttribute('data-bag', 'pao leite queijo');
  await page.waitForTimeout(500);
  await page.screenshot({ path: name('market-bag', size) });
  await page.locator('#market-panel .bench-close').click();
  await tap(page, ...await onPiece(page, 'checkout', 876, 370));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('mundo-da-bia:neighborhood:v3')!).town.items.some((i: { kind: string; paid?: boolean }) => i.kind === 'sacola' && i.paid)), { timeout: 20000 }).toBe(true);
  await page.waitForTimeout(300);
  await page.screenshot({ path: name('market-paid', size) });
});
for (const size of sizes) test(`geladeira cheia a ${size.width}${size.reduced ? ' (movimento reduzido)' : ''}`, async ({ page }) => {
  await open(page, openFridge(undefined), size);
  await page.screenshot({ path: name('fridge-full', size) });
});
for (const size of sizes) test(`geladeira vazia e a bancada em silhueta a ${size.width}${size.reduced ? ' (movimento reduzido)' : ''}`, async ({ page: empty }) => {
  await open(empty, openFridge({}), size);
  await empty.screenshot({ path: name('fridge-empty', size) });
  // The bench with an empty pantry: every basic is a silhouette, and a tap shows the market bubble.
  await tap(empty, ...await onPiece(empty, 'stove', 355, 320));
  await expect(empty.locator('#kitchen-bench')).toBeVisible();
  await empty.locator('#kitchen-bench .bench-pantry [data-ingredient="leite"]').click();
  await expect(empty.locator('.missing-bubble')).toBeVisible();
  await empty.screenshot({ path: name('pantry-silhouette', size) });
});
