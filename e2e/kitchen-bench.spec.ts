import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import type { Piece, World } from '../src/domain/types';
import { onPiece, ready, readTown, tap } from './helpers';

const stove: Piece = { id: 1, kind: 'stove', room: 'sala', x: 300, y: 250, color: 'original', flipped: false };
/** A small living room with only a stove at x 300 and Bia alone at x 760 (v3 save); the clock is installed before loading. */
async function kitchen(page: Page, change: (town: Neighborhood) => Neighborhood = town => town) {
  const world: World = initialWorld();
  world.layout = { ...world.layout, pieces: [stove], nextId: 100, rooms: { ...world.layout.rooms, sala: { ...world.layout.rooms.sala!, size: 'small' } } };
  world.actors = world.actors.map(a => ({ ...a, room: a.id === 'bia' ? 'sala' : 'quarto', x: 760, y: 520, seat: null }));
  world.items = world.items.map(i => ({ ...i, room: 'quarto', spot: 'floor', x: 500, y: 520 }));
  await page.clock.install({ time: new Date('2026-01-01T09:00:00Z') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(change(migrateNeighborhood(initialAlbum(world)))));
  await ready(page);
}
const bench = (page: Page) => page.locator('#kitchen-bench');
async function openBench(page: Page) {
  await tap(page, ...await onPiece(page, 'stove', 355, 320));
  await expect(bench(page)).toBeVisible();
}
const ingredient = (page: Page, id: string) => bench(page).locator(`.bench-pantry [data-ingredient="${id}"]`);
const utensil = (page: Page, id: string) => bench(page).locator(`[data-utensil="${id}"]`);
async function dragIn(page: Page, ...ids: string[]) { for (const id of ids) await ingredient(page, id).dragTo(bench(page).locator('[data-bowl]')); }
const dishes = async (page: Page) => (await readTown(page)).items.filter(i => i.kind === 'prato');

for (const reduced of [false, true]) test(`tocar no fogão, arrastar farinha, ovo e leite e tocar na panela faz uma panqueca no chão, junto do fogão${reduced ? ' (movimento reduzido: sem vapor nem quique)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await kitchen(page);
  await openBench(page);
  const bia = (await readTown(page)).actors[0]!;
  expect(Math.abs(bia.x - 355)).toBeLessThanOrEqual(110);
  await dragIn(page, 'farinha', 'ovo', 'leite');
  await expect(bench(page)).toHaveAttribute('data-bowl', 'farinha ovo leite');
  // Scene time from here on is played in frames, so the steam is caught while it rises.
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
  await utensil(page, 'panela').click();
  expect((await dishes(page)).map(d => [d.recipe, d.x, d.y])).toEqual([['panqueca', 355, 414]]);
  await expect(bench(page)).toHaveAttribute('data-bowl', '');
  const motion = await bench(page).locator('[data-bowl]').evaluate(n => getComputedStyle(n).animationName);
  expect(motion === 'none').toBe(reduced);
  // Nothing holds the touch: during the 1.2 s of cooking the bowl already takes the next ingredient.
  await ingredient(page, 'ovo').click();
  await expect(bench(page)).toHaveAttribute('data-bowl', 'ovo');
  const data = (key: string) => page.locator('canvas').evaluate((c, k) => (c as HTMLCanvasElement).dataset[k] ?? '', key);
  for (let t = 0; t < 1000 && !await data('dishPop'); t += 50) await page.clock.runFor(50);
  expect(await data('dishPop')).toBe((await dishes(page))[0]!.id);
  expect(await data('cooking')).toBe(reduced ? '' : 'steam');
  for (const width of [1024, 1280]) {
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 800 });
    await page.clock.runFor(150);
    await page.screenshot({ path: `reports/kitchen-bench-${width}${reduced ? '-reduced' : ''}.png` });
  }
});

test('sem texto: com todo texto transparente, o mesmo fluxo faz a panqueca', async ({ page }) => {
  await kitchen(page);
  await page.addStyleTag({ content: '*{color:transparent!important}' });
  await openBench(page);
  await dragIn(page, 'leite', 'farinha', 'ovo');
  await utensil(page, 'panela').click();
  await expect.poll(async () => (await dishes(page)).map(d => d.recipe)).toEqual(['panqueca']);
  await page.screenshot({ path: 'reports/kitchen-bench-no-text.png' });
});

test('as dicas não gastam nada: o utensílio certo balança, o fantasma mostra o que falta e o resto vira vapor', async ({ page }) => {
  await kitchen(page, town => ({ ...town, progress: { ...town.progress, basket: { tomate: 2 } } }));
  await openBench(page);
  // The wobble and the steam last under a second: scene time stops here so a slow machine still sees them.
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
  const before = await readTown(page);
  await ingredient(page, 'pao').click(); await ingredient(page, 'queijo').click();
  await utensil(page, 'panela').click();
  await expect(bench(page)).toHaveAttribute('data-wobble', 'forno');
  await expect(utensil(page, 'forno')).toHaveClass(/wobble/);
  await bench(page).locator('[data-slot="0"]').click(); await bench(page).locator('[data-slot="0"]').click();
  await ingredient(page, 'farinha').click(); await ingredient(page, 'ovo').click();
  await utensil(page, 'forno').click();
  await expect(bench(page).locator('[data-slot="2"]')).toHaveAttribute('data-ghost', 'queijo');
  await bench(page).locator('[data-slot="1"]').click(); await bench(page).locator('[data-slot="0"]').click();
  await ingredient(page, 'tomate').click(); await ingredient(page, 'peixe').click();
  await utensil(page, 'liquidificador').click();
  await expect(bench(page)).toHaveAttribute('data-steam', 'true');
  expect(await readTown(page)).toEqual(before);
  await expect(ingredient(page, 'tomate').locator('.pile img')).toHaveCount(1);
  await expect(bench(page)).not.toContainText(/\d/);
});

test('mesa cheia: com 6 pratos na casa a bancada não cozinha e os pratos pulam', async ({ page }) => {
  await kitchen(page, town => ({ ...town, nextItem: 20, items: [...town.items, ...[0, 1, 2, 3, 4, 5].map(i => ({ id: `${10 + i}:prato` as const, kind: 'prato' as const, recipe: 'torrada' as const,
    room: 'sala' as const, location: { kind: 'interior' as const, building: 1, room: 'sala' as const }, x: 200 + i * 60, y: 500, holder: null, spot: 'floor' as const }))] }));
  await openBench(page);
  await ingredient(page, 'ovo').click(); await utensil(page, 'panela').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-dish-hop', /\d/);
  expect(await dishes(page)).toHaveLength(6);
  await expect(page.locator('#announcement')).toHaveText('Mesa cheia! Quem quer comer?');
});
