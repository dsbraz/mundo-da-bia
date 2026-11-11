import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { plotSpots } from '../src/domain/garden';
import { canPoint } from '../src/presentation/plaza-garden';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import type { PlazaPlot } from '../src/domain/progress';
import type { Piece, Point } from '../src/domain/types';
import { onPiece, readTown, tap } from './helpers';

const start = new Date('2026-11-11T15:00:00');
const key = 'mundo-da-bia:neighborhood:v3';
const stove: Piece = { id: 90, kind: 'stove', room: 'quarto', x: 300, y: 250, color: 'original', flipped: false };
/** Bia alone in the plaza at `at` (v3 save, the rest at home, the ball away, a stove in the bedroom), with the fake clock. */
async function plaza(page: Page, at: Point, change: (town: Neighborhood) => Neighborhood = t => t, size = { width: 1280, height: 800 }) {
  let town = migrateNeighborhood(initialAlbum(initialWorld()));
  town = neighborhoodAction(town, { type: 'transport', actor: 'bia', location: { kind: 'street' }, point: at });
  town = { ...town, items: town.items.map(i => i.kind === 'bola' ? { ...i, x: 1500 } : i),
    buildings: town.buildings.map(b => b.id === 1 ? { ...b, layout: { ...b.layout, nextId: 91, pieces: [...b.layout.pieces, stove] } } : b) };
  await page.clock.install({ time: start });
  await page.addInitScript(([k, value]) => { if (!localStorage.getItem(k!)) localStorage.setItem(k!, value!); }, [key, encodeNeighborhood(change(town))]);
  await page.setViewportSize(size); await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
}
const canvas = (page: Page) => page.locator('canvas');
const garden = (page: Page) => canvas(page).getAttribute('data-garden');
/** Plays scene time in `step` ms frames (at most 15 s) until `done`. */
async function until(page: Page, done: () => Promise<boolean>, step = 50) {
  for (let t = 0; t < 15000 && !await done(); t += step) await page.clock.runFor(step);
  expect(await done()).toBe(true);
}
const plotTap = (page: Page, plot: PlazaPlot) => tap(page, plotSpots[plot].x, plotSpots[plot].y - 14);
async function tend(page: Page, plot: PlazaPlot, watered: boolean) {
  await plotTap(page, plot);
  await until(page, async () => (await readTown(page)).progress.plaza[plot]?.watered === watered);
}
const at = (plot: PlazaPlot, crop: string, stage: number, thirsty: boolean) => `${plot}:${crop}:${stage}:${thirsty ? 'sede' : 'ok'}`;

test('plantar alface, regar e avançar 2 min mostra o broto; repetindo até pronto, colher leva a alface para a despensa da bancada', async ({ page }) => {
  await plaza(page, { x: 760, y: 520 });
  await plotTap(page, 'praca-3');
  const bag = page.locator('#seed-bag');
  await until(page, () => bag.isVisible());
  await expect(bag.locator('[data-crop]')).toHaveCount(3);
  await expect(bag).not.toContainText(/\d/);
  for (const label of await bag.locator('[aria-label]').evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')))) expect(label).not.toMatch(/\d/);
  await page.screenshot({ path: 'reports/plaza-garden-bag-1280.png' });
  await bag.locator('[data-crop="alface"]').click();
  await expect(bag).toBeHidden();
  expect((await readTown(page)).progress.plaza['praca-3']).toMatchObject({ crop: 'alface', stage: 0, watered: false });
  await expect(canvas(page)).toHaveAttribute('data-garden', new RegExp(at('praca-3', 'alface', 0, true)));
  await tend(page, 'praca-3', true);
  await page.clock.fastForward(2 * 60_000);
  await expect(canvas(page)).toHaveAttribute('data-garden', new RegExp(at('praca-3', 'alface', 1, true)));
  await page.screenshot({ path: 'reports/plaza-garden-sprout-1280.png' });
  for (const minutes of [4, 4, 5]) { await tend(page, 'praca-3', true); await page.clock.fastForward(minutes * 60_000); }
  await expect(canvas(page)).toHaveAttribute('data-garden', new RegExp(at('praca-3', 'alface', 4, false)));
  await plotTap(page, 'praca-3');
  await until(page, async () => (await readTown(page)).progress.basket.alface === 2);
  expect((await readTown(page)).progress.plaza['praca-3']).toBeUndefined();
  await expect(page.locator('#announcement')).not.toContainText(/\d/);
  // Indoors at the stove, the basket is in the bench's pantry. The page saves the plaza as it hides, so the move into the bedroom is
  // written as the next page starts, before the game reads it.
  const town = await readTown(page);
  const inside = JSON.stringify({ version: 3, town: { ...town, location: { kind: 'interior', building: 1, room: 'quarto' },
    actors: town.actors.map(a => a.id === 'bia' ? { ...a, room: 'quarto', location: { kind: 'interior', building: 1, room: 'quarto' }, x: 700, y: 520 } : a) } });
  await page.addInitScript(([k, value]) => { if (sessionStorage.getItem('to-bedroom')) { sessionStorage.removeItem('to-bedroom'); localStorage.setItem(k!, value!); } }, [key, inside]);
  await page.evaluate(() => sessionStorage.setItem('to-bedroom', '1'));
  await page.reload(); await expect(canvas(page)).toHaveAttribute('data-ready', 'true');
  await tap(page, ...await onPiece(page, 'stove', 355, 320));
  await until(page, () => page.locator('#kitchen-bench').isVisible());
  await expect(page.locator('#kitchen-bench .bench-pantry [data-ingredient="alface"]')).toBeVisible();
});

test('sem rega por 30 dias a planta continua viva e no mesmo estágio, com sede', async ({ page }) => {
  await plaza(page, { x: 760, y: 520 }, t => ({ ...t, progress: { ...t.progress, plaza: { 'praca-2': { crop: 'tomate', stage: 2, since: start.getTime(), watered: false } } } }));
  // 30 days, in jumps of 10 (a single jump that long overflows the browser's timers).
  for (let i = 0; i < 3; i++) await page.clock.fastForward(10 * 24 * 3_600_000);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(canvas(page)).toHaveAttribute('data-garden', new RegExp(at('praca-2', 'tomate', 2, true)));
  expect((await readTown(page)).progress.plaza['praca-2']).toEqual({ crop: 'tomate', stage: 2, since: start.getTime(), watered: false });
});

test('o regador da praça rega o canteiro com sede mais perto de quem está escolhido, mesmo que não seja o primeiro', async ({ page }) => {
  const dry = { stage: 1 as const, since: 0, watered: false };
  await plaza(page, { x: 720, y: 450 }, t => ({ ...t, progress: { ...t.progress, plaza: { 'praca-2': { crop: 'cenoura', ...dry }, 'praca-3': { crop: 'alface', ...dry } } } }));
  await tap(page, canPoint.x, canPoint.y - 12);
  await until(page, async () => (await readTown(page)).progress.plaza['praca-2']?.watered === true);
  await until(page, async () => await canvas(page).getAttribute('data-water') === 'drops');
  const bia = (await readTown(page)).actors[0]!;
  // Beside the right column, she faces left: the spout points at the plot.
  expect(bia.x).toBeGreaterThan(plotSpots['praca-2'].x);
  expect(Number(await canvas(page).getAttribute('data-water-x'))).toBe(bia.x - 3);
  expect((await readTown(page)).progress.plaza['praca-3']?.watered).toBe(false);
  await page.clock.runFor(200);
  await page.screenshot({ path: 'reports/plaza-garden-water-1280.png' });
});

test('cesta cheia: a planta pronta continua no canteiro, a cesta balança e nada se perde', async ({ page }) => {
  await plaza(page, { x: 760, y: 520 }, t => ({ ...t, progress: { ...t.progress, basket: { alface: 6 }, plaza: { 'praca-4': { crop: 'alface', stage: 4, since: 0, watered: false } } } }));
  const before = await readTown(page);
  await plotTap(page, 'praca-4');
  await until(page, async () => !!await canvas(page).getAttribute('data-basket-full'));
  await expect(page.locator('#announcement')).toHaveText('Cesta cheia! Vamos cozinhar?');
  expect((await readTown(page)).progress).toEqual(before.progress);
});

test('o tempo faz a planta crescer enquanto ela anda, sem interromper a caminhada', async ({ page }) => {
  // Watered long ago: the next tick moves the lettuce to the sprout. Scene time is frozen once the page is ready, so that tick is the
  // one the tab's return dispatches in the middle of the walk.
  await plaza(page, { x: 300, y: 520 }, t => ({ ...t, progress: { ...t.progress, plaza: { 'praca-1': { crop: 'alface', stage: 0, since: start.getTime() - 200_000, watered: true } } } }));
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 500);
  await tap(page, 1000, 525);
  await page.clock.runFor(600);
  expect(await canvas(page).getAttribute('data-walking')).toBe('bia');
  const before = Number(await canvas(page).getAttribute('data-walk-x'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(canvas(page)).toHaveAttribute('data-garden', new RegExp(at('praca-1', 'alface', 1, true)));
  expect((await readTown(page)).progress.plaza['praca-1']?.stage).toBe(1);
  await page.clock.runFor(300);
  expect(await canvas(page).getAttribute('data-walking')).toBe('bia');
  expect(Number(await canvas(page).getAttribute('data-walk-x'))).toBeGreaterThan(before);
  await until(page, async () => await canvas(page).getAttribute('data-walking') === '', 250);
  expect((await readTown(page)).actors[0]!.x).toBeGreaterThan(900);
});

const sizes = [[390, 844], [768, 1024], [1024, 768], [1280, 800]] as const;
const shown = (t: Neighborhood): Neighborhood => ({ ...t, progress: { ...t.progress, seeds: ['alface', 'tomate', 'cenoura', 'milho', 'morango', 'abobora'], basket: { tomate: 2, alface: 4 },
  plaza: { 'praca-1': { crop: 'tomate', stage: 4, since: 0, watered: false }, 'praca-2': { crop: 'alface', stage: 1, since: 0, watered: false },
    'praca-3': { crop: 'cenoura', stage: 3, since: 0, watered: false }, 'praca-4': { crop: 'morango', stage: 2, since: start.getTime(), watered: true } } } });
for (const reduced of [false, true]) for (const [width, height] of sizes) test(`captura da horta a ${width}${reduced ? ' (movimento reduzido: gota parada, sem pulso)' : ''}: os quatro canteiros inteiros`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await plaza(page, { x: 680, y: 525 }, shown, { width, height });
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
  await page.clock.runFor(400);
  await page.screenshot({ path: `reports/plaza-garden-${width}${reduced ? '-reduced' : ''}.png` });
  // Every plot box lies inside the scene's visible area.
  const world = (await page.locator('#world').boundingBox())!;
  for (const plot of ['praca-1', 'praca-2', 'praca-3', 'praca-4'] as const) {
    const left = await page.locator('canvas').evaluate((c, x) => { const b = c.getBoundingClientRect(), s = b.width / Number(c.dataset.viewWidth); return b.x + (x - Number(c.dataset.viewX) - Number(c.dataset.cameraX)) * s; }, plotSpots[plot].x - 38);
    const right = await page.locator('canvas').evaluate((c, x) => { const b = c.getBoundingClientRect(), s = b.width / Number(c.dataset.viewWidth); return b.x + (x - Number(c.dataset.viewX) - Number(c.dataset.cameraX)) * s; }, plotSpots[plot].x + 38);
    expect(left, plot).toBeGreaterThanOrEqual(world.x); expect(right, plot).toBeLessThanOrEqual(world.x + world.width);
  }
  if (width === 390 || width === 1024) {
    await tap(page, plotSpots['praca-1'].x, plotSpots['praca-1'].y - 40);
    await until(page, async () => !!await canvas(page).getAttribute('data-harvest'));
    await page.clock.runFor(reduced ? 60 : 200);
    await page.screenshot({ path: `reports/plaza-garden-harvest-${width}${reduced ? '-reduced' : ''}.png` });
    await page.clock.runFor(1500);
    await tap(page, plotSpots['praca-1'].x, plotSpots['praca-1'].y - 14);
    await until(page, () => page.locator('#seed-bag').isVisible());
    await page.screenshot({ path: `reports/plaza-garden-bag-${width}${reduced ? '-reduced' : ''}.png` });
  }
});
