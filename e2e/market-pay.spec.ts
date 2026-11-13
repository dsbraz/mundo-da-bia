import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import type { Piece } from '../src/domain/types';
import { drag, ready, readTown, tap } from './helpers';
import { playUntilTrue } from './session';

// Lot 6F: "não está claro como pagar no mercado" and "comidas na geladeira que parecem que não acabam". Every step here is a tap or a
// drag on a drawing, and every cue is asserted as a drawing in the page; text is made transparent where the journey must not need it.
const saveKey = 'mundo-da-bia:neighborhood:v3';
const hall = { kind: 'interior' as const, building: 2, room: 'sala' as const };
/** Home (1) with `snacks` left in the fridge and a market next door (2); Bia in the market hall, or at home by the fridge. */
function town(where: 'market' | 'home', snacks?: number): Neighborhood {
  const world = initialWorld();
  world.actors = world.actors.map(a => ({ ...a, room: a.id === 'bia' ? 'sala' : 'quarto', x: 470, y: 530, seat: null }));
  const built = neighborhoodAction(migrateNeighborhood(initialAlbum(world)), { type: 'construct', plot: 1, model: 'shop', plan: 'market' });
  const stocked = { ...built, buildings: built.buildings.map(b => b.id === 1 && snacks !== undefined ? { ...b, snacks } : b) };
  return where === 'home' ? stocked : { ...stocked, location: hall, actors: stocked.actors.map(a => a.id === 'bia' ? { ...a, location: hall, room: 'sala', x: 520, y: 540 } : a) };
}
async function open(page: Page, start: Neighborhood, size = { width: 1024, height: 768 }) {
  await page.setViewportSize(size);
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!); }, [saveKey, encodeNeighborhood(start)]);
  await ready(page);
}
const pieces = async (page: Page, kind: Piece['kind']) => (await readTown(page)).buildings.find(b => b.id === 2)!.layout.pieces.filter(p => p.kind === kind).sort((a, b) => a.id - b.id);
const bag = async (page: Page) => (await readTown(page)).items.find(i => i.kind === 'sacola');
const panel = (page: Page) => page.locator('#market-panel');
/** At the greengrocer shelf (fish and snack), she bags `goods` by their pictures and closes the shelf. */
async function shop(page: Page, goods: string[]) {
  const shelf = (await pieces(page, 'market-shelf'))[1]!;
  await tap(page, shelf.x + 85, shelf.y + 120);
  await expect(panel(page)).toBeVisible({ timeout: 15000 });
  for (const good of goods) await panel(page).locator(`.market-good[data-good="${good}"]`).click();
  await expect(panel(page)).toHaveAttribute('data-bag', goods.join(' '));
}
const paid = (page: Page) => expect.poll(async () => (await bag(page))?.paid, { timeout: 20000 }).toBe(true);
const goStreet = async (page: Page) => { await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Ir para Rua', exact: true }).click(); };

test('lote 6F: o caixa chama, só com toques e sem ler: seta, sacola com o que tem dentro, mão na primeira vez, bip, recibo e sacola com o visto', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page, town('market', 0));
  await page.addStyleTag({ content: '*{color:transparent!important}' });
  await shop(page, ['lanche', 'peixe']);
  // With goods not paid for, the shelf itself shows the register to touch.
  await expect(panel(page).locator('.market-pay')).toBeVisible();
  await panel(page).locator('.bench-close').click();
  // The checkout calls: the bouncing arrow over the register, the bag with its two goods beside a register, and the ghost hand once.
  await expect(page.locator('#checkout-call')).toBeVisible();
  await expect(page.locator('#market-chip .chip-good')).toHaveCount(2);
  await expect(page.locator('#market-chip .chip-good img[src="/icons/lanche.svg"]')).toHaveCount(1);
  await expect(page.locator('#checkout-hint')).toBeVisible();
  expect(await page.locator('#market-chip').innerText()).not.toMatch(/\d/);
  expect(await page.locator('#market-chip, #checkout-call').evaluateAll(n => n.map(e => e.getAttribute('aria-label')).join(' '))).not.toMatch(/\d|R\$/);
  // A touch on the arrow: she walks to the checkout, beep, the receipt pops with its check, and the call is over.
  await page.locator('#checkout-call').click();
  await expect(page.locator('#checkout-receipt img.paper')).toBeVisible({ timeout: 20000 });
  await paid(page);
  await expect(page.locator('#checkout-call')).toHaveCount(0);
  await expect(page.locator('#market-chip')).toHaveCount(0);
  // Home with the paid bag: the fridge tapped puts the snack away (and the fish into the pantry).
  await goStreet(page);
  await expect.poll(async () => (await readTown(page)).actors[0]!.location.kind).toBe('street');
  await page.locator('#map-toggle').click();
  await page.locator('#neighborhood-list').getByRole('button', { name: /^Ir para Minha casa$/ }).click();
  await expect.poll(async () => (await readTown(page)).actors[0]!.location).toMatchObject({ kind: 'interior', building: 1 });
  if (await page.locator('#close-map').isVisible()) await page.locator('#close-map').click();
  await expect(async () => {
    await tap(page, 680, 282);
    await expect.poll(async () => (await readTown(page)).buildings[0]!.snacks, { timeout: 5000 }).toBe(1);
  }).toPass({ timeout: 30000 });
  expect(errors).toEqual([]);
});

test('lote 6F: sair sem pagar mostra o caixa num balão que leva a pagar; arrastar a Bia até o caixa também paga', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, town('market'));
  await shop(page, ['batata']);
  await panel(page).locator('.bench-close').click();
  await goStreet(page);
  const bubble = page.locator('.missing-bubble.tappable[data-need="checkout"]');
  await expect(bubble).toBeVisible();
  expect((await readTown(page)).actors[0]!.location).toEqual(hall);
  if (await page.locator('#close-map').isVisible()) await page.locator('#close-map').click();
  await expect(bubble).toBeVisible();
  await bubble.click();
  await paid(page);
  // A second bag: this time she is dragged to the checkout with it, and that pays too.
  const [, greens] = await pieces(page, 'market-shelf'), counter = (await pieces(page, 'checkout'))[0]!;
  await tap(page, greens!.x + 85, greens!.y + 120);
  await expect(panel(page)).toBeVisible({ timeout: 15000 });
  await panel(page).locator('.market-good[data-good="oleo"]').click();
  await expect.poll(async () => (await bag(page))?.paid).toBe(false);
  await panel(page).locator('.bench-close').click();
  const bia = (await readTown(page)).actors[0]!;
  await drag(page, [bia.x, bia.y - 80], [counter.x + 40, counter.y + 210]);
  await expect(page.locator('#checkout-receipt')).toHaveCount(1, { timeout: 15000 });
  await paid(page);
});

test('lote 6F: o lanche acaba depois de 4; em silhueta mostra o mercado, e com fome o balão desenha o mercado e leva ao Mapa', async ({ page }) => {
  test.setTimeout(240_000);
  await page.clock.install({ time: new Date('2026-11-13T15:00:00') });
  await open(page, town('home'));
  for (let left = 3; left >= 0; left--) {
    const bia = (await readTown(page)).actors[0]!;
    await drag(page, [680, 310], [bia.x, bia.y - 70]);
    await expect.poll(async () => (await readTown(page)).buildings[0]!.snacks, { timeout: 15000 }).toBe(left);
  }
  // The fifth stays in the fridge as a silhouette: a touch shows the market (a touch on that opens the Map).
  await tap(page, 680, 310);
  await expect(page.locator('.missing-bubble[data-need="market"]')).toBeVisible();
  await page.screenshot({ path: 'reports/review/fridge-empty-silhouette-1024.png' });
  // Hungry later, with nothing left at home: the thought draws the market, and a touch marks it on the Map.
  const thought = page.locator('.missing-bubble.thought[data-need="fome"]');
  await playUntilTrue(page, async () => await thought.count() > 0, 20);
  await expect(thought).toHaveAttribute('data-market', 'true');
  await expect(thought.locator('img')).toHaveAttribute('src', '/art/market.svg#market');
  await thought.click();
  await expect(page.locator('#neighborhood-list [data-building="2"]')).toHaveClass(/marked/);
});

// Captures for the art review, landscape only.
for (const size of [{ width: 1024, height: 768 }, { width: 1280, height: 800 }]) test(`capturas do caixa e da geladeira vazia a ${size.width}`, async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, town('market'), size);
  await shop(page, ['lanche', 'peixe', 'batata']);
  await page.screenshot({ path: `reports/review/market-pay-shelf-${size.width}.png` });
  await panel(page).locator('.bench-close').click();
  await expect(page.locator('#checkout-hint')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `reports/review/market-pay-call-${size.width}.png` });
  await page.locator('#market-chip .chip-pay').click();
  await paid(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `reports/review/market-pay-receipt-${size.width}.png` });
});
for (const size of [{ width: 1024, height: 768 }, { width: 1280, height: 800 }]) test(`captura da geladeira vazia a ${size.width}`, async ({ page }) => {
  const empty = town('home', 0), fish = { ...empty, buildings: empty.buildings.map(b => b.id === 1 ? { ...b, stock: { ovo: 2, leite: 1 } } : b) };
  await open(page, fish, size);
  await tap(page, 680, 310);
  await expect(page.locator('.missing-bubble[data-need="market"]')).toBeVisible();
  await page.screenshot({ path: `reports/review/fridge-empty-${size.width}.png` });
});
