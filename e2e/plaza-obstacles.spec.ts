import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { Point } from '../src/domain/types';
import { playUntil as play, point, readTown, tap } from './helpers';

/** Bia alone in the plaza at `at`, the rest of the cast at home, the ball out of the way; paused clock once ready. */
async function plaza(page: Page, at: Point) {
  let town = migrateNeighborhood(initialAlbum(initialWorld()));
  town = neighborhoodAction(town, { type: 'transport', actor: 'bia', location: { kind: 'street' }, point: at });
  town = { ...town, items: town.items.map(i => i.kind === 'bola' ? { ...i, x: 1500 } : i) };
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(town));
  await page.setViewportSize({ width: 1280, height: 800 }); await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
}
const canvas = (page: Page) => page.locator('canvas');
const playUntil = (page: Page, name: string, value: string) => play(page, () => canvas(page).getAttribute(name), value, 30);
async function clip(page: Page, x: number, top: number, bottom: number, half = 170) {
  const a = await point(page, x - half, top), b = await point(page, x + half, bottom);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}

test('a criança contorna a horta em vez de passar por cima', async ({ page }) => {
  await plaza(page, { x: 470, y: 455 });
  await tap(page, 700, 455);
  let lowest = 0, shot = false;
  // At most 15 s of scene time, in 50 ms frames, until she stops at x 700.
  for (let t = 0; t < 15000; t += 50) {
    await page.clock.runFor(50);
    const walking = await canvas(page).getAttribute('data-walking'), x = Number(await canvas(page).getAttribute('data-walk-x')), y = Number(await canvas(page).getAttribute('data-walk-y'));
    if (walking) lowest = Math.max(lowest, y);
    if (walking && !shot && x > 560) { shot = true; await page.screenshot({ path: 'reports/plaza-around-flowerbed.png', clip: await clip(page, 573, 300, 560, 220) }); }
    if (!walking && Math.round((await readTown(page)).actors[0]!.x) === 700) break;
  }
  expect(await canvas(page).getAttribute('data-walking')).toBe('');
  expect(Math.round((await readTown(page)).actors[0]!.x)).toBe(700);
  expect(lowest).toBeGreaterThan(498);
});

for (const reduced of [false, true]) test(`subir no banco é um arco de 260 ms${reduced ? ' (movimento reduzido: fade)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await plaza(page, { x: 300, y: 520 });
  await tap(page, 180, 430);
  await playUntil(page, 'data-climb', 'bia');
  expect((await readTown(page)).outdoor.bench).toBe('bia');
  await page.clock.runFor(reduced ? 60 : 110);
  await page.screenshot({ path: `reports/plaza-climb-bench${reduced ? '-reduced' : ''}.png`, clip: await clip(page, 180, 300, 560) });
  // The hop ends quickly: nothing waits on it.
  await page.clock.runFor(300);
  await expect(canvas(page)).toHaveAttribute('data-climb', '');
});

test('subir no balanço também é um arco', async ({ page }) => {
  await plaza(page, { x: 300, y: 520 });
  await tap(page, 400, 430);
  await playUntil(page, 'data-climb', 'bia');
  expect((await readTown(page)).outdoor.swing).toBe('bia');
  await page.clock.runFor(110);
  await page.screenshot({ path: 'reports/plaza-climb-swing.png', clip: await clip(page, 400, 250, 560) });
  await page.clock.runFor(300); await expect(canvas(page)).toHaveAttribute('data-climb', '');
});

for (const reduced of [false, true]) test(`as gotas saem do bico do regador da praça, virado para o canteiro${reduced ? ' (movimento reduzido: só o regador, sem gotas)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await plaza(page, { x: 700, y: 520 });
  // The can rests left of the plots; she waters the plot nearest to her (the front right one), standing at its right.
  await tap(page, 470, 516);
  await playUntil(page, 'data-water', reduced ? 'can' : 'drops');
  const town = await readTown(page), bia = town.actors[0]!;
  expect(bia.x).toBeGreaterThan(612);
  expect(town.outdoor.watered).toBe(false);
  if (!reduced) {
    expect(Number(await canvas(page).getAttribute('data-water-x'))).toBe(bia.x - 3);
    expect(Number(await canvas(page).getAttribute('data-water-y'))).toBe(bia.y - 44);
  }
  await page.clock.runFor(250);
  await page.screenshot({ path: `reports/plaza-water${reduced ? '-reduced' : ''}.png`, clip: await clip(page, 600, 300, 560) });
  await page.clock.runFor(1200); await expect(canvas(page)).toHaveAttribute('data-water', '');
});
