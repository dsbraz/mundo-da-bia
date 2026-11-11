import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import type { Piece, PieceKind, World } from '../src/domain/types';
import { onPiece, point, read, ready, tap } from './helpers';

const piece = (id: number, kind: PieceKind, x: number, y: number, active?: boolean): Piece => ({ id, kind, room: 'sala', x, y, color: 'original', flipped: false, ...(active ? { active } : {}) });
/** The living room with only `pieces`, Bia alone in it at x 760; paused clock once ready. */
async function room(page: Page, pieces: Piece[], size: 'small' | 'large' = 'small') {
  const world: World = initialWorld();
  world.layout = { ...world.layout, pieces, nextId: 100, rooms: { ...world.layout.rooms, sala: { ...world.layout.rooms.sala!, size } } };
  world.actors = world.actors.map(a => ({ ...a, room: a.id === 'bia' ? 'sala' : 'quarto', x: 760, y: 520, seat: null }));
  world.items = world.items.map(i => ({ ...i, room: 'quarto', spot: 'floor', x: 500, y: 520 }));
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await page.setViewportSize({ width: 1280, height: 800 }); await ready(page);
}
async function clip(page: Page, left: number, top: number, right: number, bottom: number) {
  const a = await point(page, left, top), b = await point(page, right, bottom);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}
const canvas = (page: Page) => page.locator('canvas');

for (const reduced of [false, true]) test(`tocar na pia leva a Bia até ela e as bolhas aparecem${reduced ? ' (movimento reduzido: bolhas paradas)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await room(page, [piece(1, 'sink', 300, 250)]);
  await tap(page, 390, 330);
  await expect(canvas(page)).toHaveAttribute('data-walking', 'bia');
  await expect.poll(async () => (await read(page)).layout.pieces[0]!.active).toBe(true);
  const bia = (await read(page)).actors[0]!;
  expect(Math.abs(bia.x - 390)).toBeLessThanOrEqual(110); expect(bia.y).toBeGreaterThanOrEqual(410);
  await expect(canvas(page)).toHaveAttribute('data-uses', 'sink');
  await page.clock.pauseAt(new Date('2026-01-01T00:10:00Z'));
  await page.screenshot({ path: `reports/use-sink${reduced ? '-reduced' : '-a'}.png`, clip: await clip(page, 260, 150, 560, 560) });
  await page.clock.runFor(500);
  if (!reduced) await page.screenshot({ path: 'reports/use-sink-b.png', clip: await clip(page, 260, 150, 560, 560) });
  await page.clock.resume();
  // A second touch switches it off: the bubbles go away.
  await tap(page, 390, 330);
  await expect.poll(async () => (await read(page)).layout.pieces[0]!.active).toBe(false);
  await expect(canvas(page)).toHaveAttribute('data-uses', '');
});

for (const reduced of [false, true]) test(`os móveis do dia a dia ligados mostram seus efeitos (o carrinho de cozinha agora abre a bancada)${reduced ? ' (movimento reduzido)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await room(page, [piece(1, 'sink', 20, 250, true), piece(2, 'washer', 230, 255, true), piece(3, 'planter', 390, 280, true), piece(4, 'bookcase', 590, 190, true), piece(5, 'kitchen-cart', 780, 260, true), piece(6, 'picnic-table', 960, 260, true)], 'large');
  await expect(canvas(page)).toHaveAttribute('data-uses', 'sink washer planter bookcase picnic-table');
  await page.clock.pauseAt(new Date('2026-01-01T00:10:00Z'));
  await page.screenshot({ path: `reports/use-everyday${reduced ? '-reduced' : ''}.png` });
});

test('tocar no carrinho de cozinha leva a Bia até ele e abre a bancada, sem ligar o móvel', async ({ page }) => {
  await room(page, [piece(1, 'kitchen-cart', 300, 250)]);
  await tap(page, ...await onPiece(page, 'kitchen-cart', 360, 320));
  await expect(page.locator('#kitchen-bench')).toBeVisible();
  const bia = (await read(page)).actors[0]!;
  expect(Math.abs(bia.x - 360)).toBeLessThanOrEqual(120);
  expect((await read(page)).layout.pieces[0]!.active).toBeUndefined();
  await expect(canvas(page)).toHaveAttribute('data-uses', '');
});
