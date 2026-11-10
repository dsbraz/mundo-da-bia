import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { plazaBall } from '../src/domain/outdoor';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { point, readTown, ready, tap } from './helpers';

/** The street with Bia at x `bia` on the ball's line and the plaza ball resting at 320, 525. */
function plazaBallTown(bia: number) {
  const town = plazaBall(migrateNeighborhood(initialAlbum(initialWorld())));
  town.location = { kind: 'street' };
  town.actors = town.actors.map(a => a.id === 'bia' ? { ...a, location: { kind: 'street' }, x: bia, y: 525, seat: null } : a);
  town.items = town.items.map(i => i.kind === 'bola' ? { ...i, location: { kind: 'street' }, x: 320, y: 525, holder: null, spot: 'floor' } : i);
  return town;
}
async function street(page: Page, bia = 150) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(plazaBallTown(bia)));
  await page.setViewportSize({ width: 1024, height: 768 }); await ready(page);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
}
const ball = async (page: Page) => (await readTown(page)).items.find(i => i.kind === 'bola')!;
const rolling = (page: Page) => page.locator('canvas').getAttribute('data-rolling');
async function clip(page: Page) {
  const a = await point(page, 100, 380), b = await point(page, 900, 560);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}
/** Flicks the ball (drawn at y 508 over its floor point 525) to the right, 20 px per 16 ms frame. */
async function flick(page: Page) {
  const path = [];
  for (let x = 420; x >= 320; x -= 20) path.unshift(await point(page, x, 508));
  await page.mouse.move(path[0]!.x, path[0]!.y); await page.mouse.down();
  for (const p of path.slice(1)) { await page.clock.runFor(16); await page.mouse.move(p.x, p.y); }
  await page.mouse.up();
}

test('jogar a bola faz ela rolar e parar; só o ponto final vai para o save, e recarregar a mostra lá', async ({ page }) => {
  await street(page);
  await flick(page); await page.clock.runFor(32);
  expect(await rolling(page)).toBe('1:bola');
  expect(await ball(page)).toMatchObject({ x: 320, y: 525, holder: null });
  await page.clock.runFor(300); await page.screenshot({ path: 'reports/ball-rolling.png', clip: await clip(page) });
  const saved = new Set<number>();
  for (let t = 0; t < 8000 && await rolling(page); t += 100) { saved.add((await ball(page)).x); await page.clock.runFor(100); }
  expect(await rolling(page)).toBe('');
  // While it rolled the save kept the start; one place at the stop.
  expect([...saved]).toEqual([320]);
  const end = await ball(page); expect(end.x).toBeGreaterThan(600); expect(end).toMatchObject({ holder: null, spot: 'floor' });
  await page.screenshot({ path: 'reports/ball-rest.png', clip: await clip(page) });
  const town = await readTown(page); await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  expect(await readTown(page)).toEqual(town);
});

test('uma criança andando chuta a bola sem parar de andar', async ({ page }) => {
  await street(page);
  await tap(page, 560, 525);
  for (let t = 0; t < 8000 && !await rolling(page); t += 100) await page.clock.runFor(100);
  expect(await rolling(page)).toBe('1:bola');
  await page.screenshot({ path: 'reports/ball-kick.png', clip: await clip(page) });
  for (let t = 0; t < 10000 && (await rolling(page) || await page.locator('canvas').getAttribute('data-walking')); t += 100) await page.clock.runFor(100);
  expect((await ball(page)).x).toBeGreaterThan(360);
  expect(Math.abs((await readTown(page)).actors.find(a => a.id === 'bia')!.x - 560)).toBeLessThan(2);
});

test('com movimento reduzido a bola aparece de uma vez onde pararia, com um fade', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await street(page);
  await flick(page); await page.clock.runFor(32);
  expect(await rolling(page)).toBeFalsy();
  const end = await ball(page); expect(end.x).toBeGreaterThan(600);
  await expect(page.locator('canvas')).toHaveAttribute('data-landing', '1:bola');
  await page.clock.runFor(60); await page.screenshot({ path: 'reports/ball-reduced.png', clip: await clip(page) });
  await page.clock.runFor(200); await expect(page.locator('canvas')).toHaveAttribute('data-landing', '');
});
