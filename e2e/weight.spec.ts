import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { point, read, ready } from './helpers';

/** The living room without furniture, Bia selected at x 400, the teddy bear on the floor at x 700; paused clock. */
async function room(page: Page) {
  const world = initialWorld(); world.layout.pieces = [];
  world.actors = world.actors.map(a => ({ ...a, room: a.id === 'bia' ? 'sala' : 'quarto', x: 400, y: 530, seat: null }));
  world.items = world.items.map((i, n) => ({ ...i, room: n === 3 ? 'sala' : 'quarto', spot: 'floor', x: 700, y: 530 }));
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await page.setViewportSize({ width: 1280, height: 800 }); await ready(page);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
}
const canvas = (page: Page) => page.locator('canvas');
async function clip(page: Page, x: number) {
  const a = await point(page, x - 130, 270), b = await point(page, x + 130, 560);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}
/** Holds Bia by the body and carries her to x, one finger step per frame. */
async function carry(page: Page, to: number) {
  const from = await point(page, 400, 440); await page.mouse.move(from.x, from.y); await page.mouse.down();
  for (let x = 400; x <= to; x += 25) { const p = await point(page, x, 440); await page.mouse.move(p.x, p.y); await page.clock.runFor(32); }
}

for (const reduced of [false, true]) test(`arrastar a Bia a carrega sem o ciclo de caminhada e soltar a faz cair na sombra${reduced ? ' (movimento reduzido)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await room(page); await carry(page, 600);
  await expect(canvas(page)).toHaveAttribute('data-gait', 'bia:carried');
  await page.screenshot({ path: `reports/weight-carried${reduced ? '-reduced' : ''}.png`, clip: await clip(page, 600) });
  await page.mouse.up(); await page.clock.runFor(60);
  const bia = (await read(page)).actors[0]!; expect(bia.x).toBeCloseTo(600, 3); expect(bia.y).toBe(530);
  if (reduced) await expect(canvas(page)).toHaveAttribute('data-gait', '');
  else {
    await expect(canvas(page)).toHaveAttribute('data-gait', 'bia:drop');
    await page.clock.runFor(100); await page.screenshot({ path: 'reports/weight-drop-squash.png', clip: await clip(page, 600) });
    await page.clock.runFor(200); await expect(canvas(page)).toHaveAttribute('data-gait', '');
  }
  // Nothing holds input: a tap right away walks.
  const there = await point(page, 900, 530); await page.mouse.click(there.x, there.y); await page.clock.runFor(100);
  await expect(canvas(page)).toHaveAttribute('data-gait', 'bia:walk');
});

for (const reduced of [false, true]) test(`um brinquedo solto cai e quica uma vez antes de parar${reduced ? ' (movimento reduzido: aparece aos poucos)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await room(page);
  const to = await point(page, 560, 500), from = await point(page, 700, 502);
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(from.x + 20, from.y, { steps: 2 }); await page.mouse.move(to.x, to.y, { steps: 6 }); await page.clock.runFor(32);
  await page.mouse.up(); await page.clock.runFor(32);
  const bear = (await read(page)).items[3]!;
  expect(bear).toMatchObject({ holder: null, spot: 'floor' }); expect(Math.abs(bear.x - 560)).toBeLessThan(4);
  await expect(canvas(page)).toHaveAttribute('data-landing', bear.id);
  await page.clock.runFor(reduced ? 30 : 180);
  await page.screenshot({ path: `reports/weight-object-${reduced ? 'fade' : 'bounce'}.png`, clip: await clip(page, 560) });
  await page.clock.runFor(400); await expect(canvas(page)).toHaveAttribute('data-landing', '');
});
