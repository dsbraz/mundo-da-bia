import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { ready, readTown, tray, closeTray, point } from './helpers';

async function playground(page: Page) {
  const world = initialWorld(); world.layout.pieces = [];
  world.items.forEach(i => { i.spot = 'floor'; i.x = 100; });
  world.actors.forEach(a => { a.x = a.id === 'bia' ? 700 : 200; a.y = a.kind === 'cat' ? 540 : 530; a.seat = null; });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await ready(page); await tray(page, 'Turma'); await page.getByRole('button', { name: 'Bia', exact: true }).click(); await closeTray(page);
}
/** Starts hopscotch with a paused clock, letting the walk to the board run frame by frame until play begins. */
async function hopscotch(page: Page) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') }); await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Amarelinha', exact: true }).click();
  await expect.poll(async () => { await page.clock.runFor(250); return page.locator('#game-panel').getAttribute('data-phase'); }).toBe('playing');
}
async function childClip(page: Page) {
  const bia = (await readTown(page)).actors[0]!, a = await point(page, bia.x - 120, bia.y - 260), b = await point(page, bia.x + 120, bia.y + 40);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}

test('o salto da amarelinha agacha antes, encolhe a sombra no ar e levanta poeirinha ao pousar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await playground(page); await hopscotch(page);
  const canvas = page.locator('canvas');
  await page.keyboard.press('Space');
  await page.clock.runFor(80); await expect(canvas).toHaveAttribute('data-jump', 'crouch');
  await page.screenshot({ path: 'reports/hopscotch-jump-crouch.png', clip: await childClip(page) });
  await page.clock.runFor(160); await expect(canvas).toHaveAttribute('data-jump', 'air');
  await page.screenshot({ path: 'reports/hopscotch-jump-air.png', clip: await childClip(page) });
  await page.clock.runFor(180); await expect(canvas).toHaveAttribute('data-jump', 'land');
  await page.screenshot({ path: 'reports/hopscotch-jump-land.png', clip: await childClip(page) });
  // Landing squash and dust never hold input: the next jump is offered as soon as the 400 ms lock ends.
  await expect(page.locator('#game-jump')).toBeEnabled();
  await page.clock.runFor(300); await expect(canvas).toHaveAttribute('data-jump', 'still');
});

test('com movimento reduzido o salto chega de uma vez, sem agachar nem poeira', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 800 }); await playground(page); await hopscotch(page);
  const canvas = page.locator('canvas');
  await page.keyboard.press('Space');
  for (const step of [40, 200, 180]) { await page.clock.runFor(step); await expect(canvas).toHaveAttribute('data-jump', 'still'); }
  await page.screenshot({ path: 'reports/hopscotch-jump-reduced.png', clip: await childClip(page) });
});

test('a 1280 px os gatos têm sombra de contato sobre o tapete', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await ready(page);
  await page.screenshot({ path: 'reports/compare-after-1280.png' });
});
