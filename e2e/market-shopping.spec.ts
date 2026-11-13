import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import { onPiece, ready, readTown, tap } from './helpers';

const saveKey = 'mundo-da-bia:neighborhood:v3';
const hall = { kind: 'interior' as const, building: 2, room: 'sala' as const };
/** A home with an empty pantry and a stove where the wardrobe was, a market next door, and Bia alone in the market hall. */
function town(): Neighborhood {
  const world = initialWorld();
  world.layout = { ...world.layout, pieces: [...world.layout.pieces.filter(p => p.kind !== 'wardrobe'), { id: 50, kind: 'stove', room: 'sala', x: 300, y: 250, color: 'original', flipped: false }], nextId: 100 };
  world.actors = world.actors.map(a => ({ ...a, room: a.id === 'bia' ? 'sala' : 'quarto', x: 760, y: 520, seat: null }));
  const built = neighborhoodAction(migrateNeighborhood(initialAlbum(world)), { type: 'construct', plot: 1, model: 'shop', plan: 'market' });
  return { ...built, location: hall, buildings: built.buildings.map(b => b.id === 1 ? { ...b, stock: {} } : b),
    actors: built.actors.map(a => a.id === 'bia' ? { ...a, location: hall, room: 'sala', x: 520, y: 540 } : a) };
}
async function open(page: Page) {
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); }, [saveKey, encodeNeighborhood(town())]);
  await page.addInitScript(() => {
    const w = window as unknown as { bubbles: string[][] }; w.bubbles = [];
    new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => {
      if (n instanceof HTMLElement && /bubble/.test(n.className)) w.bubbles.push([...n.querySelectorAll('img')].map(i => i.getAttribute('src')!));
    }))).observe(document, { childList: true, subtree: true });
  });
  await ready(page);
}
const panel = (page: Page) => page.locator('#market-panel');
const bag = async (page: Page) => (await readTown(page)).items.find(i => i.kind === 'sacola');
const goStreet = async (page: Page) => { await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Ir para Rua', exact: true }).click(); };

for (const hidden of [false, true]) test(`W3L-22: pega pão e leite na prateleira, não sai sem passar no caixa, bip-bip, e em casa a sacola enche a geladeira${hidden ? ' (com todo texto transparente)' : ''}`, async ({ page }) => {
  // Four real walks across a wide hall and two houses: more time than the default 30 s under load.
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page);
  if (hidden) await page.addStyleTag({ content: '*{color:transparent!important}' });
  // The first shelf (bakery and dairy): she walks there and its goods open beside the scene, by picture.
  await tap(page, ...await onPiece(page, 'market-shelf', 225, 330));
  await expect(panel(page)).toBeVisible({ timeout: 15000 });
  await panel(page).locator('.market-good[data-good="pao"]').click();
  await panel(page).locator('.market-good[data-good="leite"]').click();
  await expect(panel(page)).toHaveAttribute('data-bag', 'pao leite');
  await expect(panel(page).locator('.bag-slot[data-good="pao"] img')).toHaveCount(1);
  expect(await panel(page).innerText()).not.toMatch(/\d/);
  expect(await panel(page).evaluate(n => [...n.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join(' '))).not.toMatch(/\d|R\$/);
  expect(await bag(page)).toMatchObject({ holder: 'bia', contents: ['pao', 'leite'], paid: false });
  // Out before the checkout: refused, and the bubble draws the checkout.
  await page.locator('#market-panel .bench-close').click();
  await goStreet(page);
  expect((await readTown(page)).actors[0]!.location).toEqual(hall);
  await expect.poll(() => page.evaluate(() => (window as unknown as { bubbles: string[][] }).bubbles.flat())).toContain('/art/market.svg#checkout');
  await page.keyboard.press('Escape');
  if (await page.locator('#close-map').isVisible()) await page.locator('#close-map').click();
  // Beep, beep: the bag gets its ribbon.
  await tap(page, ...await onPiece(page, 'checkout', 876, 370));
  await expect.poll(async () => (await bag(page))?.paid, { timeout: 20000 }).toBe(true);
  await goStreet(page);
  expect((await readTown(page)).actors[0]!.location).toEqual({ kind: 'street' });
  expect(await bag(page)).toMatchObject({ holder: 'bia', paid: true });
  const home = (await readTown(page)).buildings[0]!;
  await page.locator('#map-toggle').click();
  await page.locator('#neighborhood-list').getByRole('button', { name: `Ir para ${home.name}`, exact: true }).click();
  await expect.poll(async () => (await readTown(page)).actors[0]!.location).toMatchObject({ kind: 'interior', building: 1 });
  if (await page.locator('#close-map').isVisible()) await page.locator('#close-map').click();
  // At home: the fridge tapped with the bag in hand puts the goods away; the empty bag is gone.
  // Under load the camera may still be settling on arrival: tap again until the goods are put away.
  await expect(async () => {
    await tap(page, ...await onPiece(page, 'fridge', 680, 282));
    await expect.poll(async () => (await readTown(page)).buildings[0]!.stock, { timeout: 5000 }).toEqual({ pao: 1, leite: 1 });
  }).toPass({ timeout: 30000 });
  expect(await bag(page)).toBeUndefined();
  // The bread is in the bench's pantry now.
  await tap(page, ...await onPiece(page, 'stove', 355, 320));
  await expect(page.locator('#kitchen-bench .bench-pantry [data-ingredient="pao"]')).toBeVisible();
  expect(errors).toEqual([]);
});
