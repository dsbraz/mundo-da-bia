import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { RecipeId } from '../src/domain/progress';
import type { Piece, World } from '../src/domain/types';
import { closeTray, drag, point, readTown, ready, tray } from './helpers';

const spots = { bia: 760, luna: 300, mimi: 480 } as Record<string, number>;
const piece = (id: number, kind: Piece['kind'], x: number, y: number): Piece => ({ id, kind, room: 'sala', x, y, color: 'original', flipped: false });
/** A table with a chair on each side (W3L-07: a person eats seated), as a new kitchen gets them. */
const dining = [piece(100, 'table', 380, 300), piece(101, 'chair', 286, 285), piece(102, 'chair', 624, 285)];
/** The living room with Bia, Luna and Mimi, the dining table (unless `furnished` is false) and one dish on the floor at x 620 (v3 save);
 *  clock installed before loading. */
async function table(page: Page, recipe: RecipeId, furnished = true) {
  const world: World = initialWorld();
  world.layout = { ...world.layout, pieces: [...world.layout.pieces.filter(p => p.room !== 'sala'), ...(furnished ? dining : [])], nextId: 103 };
  world.actors = world.actors.map(a => ({ ...a, room: a.id in spots ? 'sala' : 'quarto', x: spots[a.id] ?? 500, y: 520, seat: null }));
  world.items = world.items.map(i => ({ ...i, room: 'quarto', spot: 'floor', x: 500, y: 520 }));
  const town = migrateNeighborhood(initialAlbum(world));
  const dish = { id: '20:prato' as const, kind: 'prato' as const, recipe, room: 'sala' as const, location: { kind: 'interior' as const, building: 1, room: 'sala' as const },
    x: 620, y: 500, holder: null, spot: 'floor' as const };
  await page.clock.install({ time: new Date('2026-01-01T09:00:00Z') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood({ ...town, nextItem: 21, items: [...town.items, dish] }));
  await page.setViewportSize({ width: 1280, height: 800 }); await ready(page);
}
const canvas = (page: Page) => page.locator('canvas');
const dishes = async (page: Page) => (await readTown(page)).items.filter(i => i.kind === 'prato');
const actor = async (page: Page, id: string) => (await readTown(page)).actors.find(a => a.id === id)!;
async function clip(page: Page, x: number) {
  const a = await point(page, x - 170, 230), b = await point(page, x + 170, 560);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}

for (const reduced of [false, true]) test(`soltar a pizza na Luna: ela come, o prato some e o favorito dá dança e coração${reduced ? ' (movimento reduzido: braços para cima, sem confete)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await table(page, 'pizza');
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
  await drag(page, [620, 490], [300, 420]);
  // W3L-07: she walks to the chair, sits, the plate goes to the table and is eaten in three bites before the reaction.
  for (let t = 0; t < 8000 && (await dishes(page)).length; t += 100) await page.clock.runFor(100);
  expect(await dishes(page)).toEqual([]);
  expect(await actor(page, 'luna')).toMatchObject({ fed: true, seat: '101.0', x: 331, y: 393 });
  await expect(canvas(page)).toHaveAttribute('data-meal-on', 'table');
  await expect(canvas(page)).toHaveAttribute('data-meal', 'full');
  await expect(canvas(page)).not.toHaveAttribute('data-heart', 'luna');
  for (const width of [1024, 844]) {
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 390 });
    await page.clock.runFor(50);
    await page.screenshot({ path: `reports/wave3-life-1b/eat-seated-full-${width}${reduced ? '-reduced' : ''}.png` });
  }
  await page.clock.runFor(1000);
  await expect(canvas(page)).toHaveAttribute('data-meal', reduced ? 'full' : 'half');
  if (!reduced) await page.screenshot({ path: 'reports/wave3-life-1b/eat-seated-half-844.png' });
  await page.clock.runFor(700);
  await expect(canvas(page)).toHaveAttribute('data-meal', 'empty');
  await page.screenshot({ path: `reports/wave3-life-1b/eat-seated-empty-844${reduced ? '-reduced' : ''}.png` });
  for (let t = 0; t < 3000 && await canvas(page).getAttribute('data-meal') !== 'done'; t += 100) await page.clock.runFor(100);
  await expect(canvas(page)).toHaveAttribute('data-meal-steps', reduced ? 'full empty' : 'full half empty');
  await expect(canvas(page)).toHaveAttribute('data-favorite', 'luna');
  await expect(canvas(page)).toHaveAttribute('data-heart', 'luna');
  await expect(canvas(page)).toHaveAttribute('data-reaction', /^luna:/);
  await page.clock.runFor(300);
  if (reduced) await expect(canvas(page)).not.toHaveAttribute('data-confetti', 'on'); else await expect(canvas(page)).toHaveAttribute('data-confetti', 'on');
  await page.screenshot({ path: `reports/eat-favorite${reduced ? '-reduced' : ''}.png`, clip: await clip(page, 300) });
  await expect(page.locator('#announcement')).not.toContainText(/\d/);
});

test('sem assento na sala, soltar a pizza na Luna mostra o balão da mesa com cadeira e o prato fica na mão dela', async ({ page }) => {
  await table(page, 'pizza', false);
  await drag(page, [620, 490], [300, 420]);
  await expect(page.locator('.missing-bubble')).toHaveAttribute('data-need', 'table');
  await expect(page.locator('.missing-bubble img.need')).toHaveAttribute('src', '/art/needs.svg#table');
  await expect.poll(async () => (await dishes(page)).map(d => d.holder)).toEqual(['luna']);
  expect((await actor(page, 'luna')).fed).toBe(false);
  await page.screenshot({ path: 'reports/wave3-life-1b/no-seat-bubble-1280.png' });
});

test('soltar a pizza na Mimi: ela cheira, prefere peixinho e o prato fica', async ({ page }) => {
  await table(page, 'pizza');
  await drag(page, [620, 490], [480, 470]);
  await expect(page.locator('#announcement')).toHaveText('Miau? (Mimi: prefiro peixinho)');
  expect((await dishes(page)).map(d => d.id)).toEqual(['20:prato']);
  expect((await actor(page, 'mimi')).fed).toBe(false);
});

test('pegar o ovo mexido pela bandeja e usar Comer: o botão mostra o prato, a Bia come e a mão fica livre', async ({ page }) => {
  await table(page, 'ovo-mexido');
  await tray(page, 'Objetos');
  const card = page.getByRole('button', { name: 'Ovo mexido', exact: true });
  await expect(card.locator('img')).toHaveAttribute('src', /^data:image\/svg\+xml/);
  await card.click(); await closeTray(page);
  await expect.poll(async () => (await dishes(page))[0]?.holder).toBe('bia');
  const eat = page.getByRole('button', { name: 'Comer', exact: true });
  await expect(eat).toBeEnabled();
  await expect(eat.locator('img')).toHaveAttribute('src', /^data:image\/svg\+xml/);
  for (const width of [1024, 1280]) {
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 800 });
    await page.clock.runFor(150);
    await page.screenshot({ path: `reports/eat-panel-${width}.png` });
  }
  await eat.click();
  await expect.poll(() => dishes(page)).toEqual([]);
  expect((await actor(page, 'bia')).fed).toBe(true);
});
