import { test, expect } from '@playwright/test';
import { initialWorld, transition } from '../src/domain/world';
import { addRoom } from '../src/domain/rooms';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { lookIds, roomTemplates } from '../src/domain/types';
import type { LookId, World } from '../src/domain/types';
import { ready, readTown, tap, tray, closeTray } from './helpers';
test.use({ video: 'on' });
function cast(look: LookId): World {
  let world = initialWorld(); world.layout.rooms.sala.size = 'large';
  world.layout.pieces = [
    { id: 1, kind: 'sofa', room: 'sala', x: 60, y: 270, color: 'original', flipped: false },
    { id: 2, kind: 'bed', room: 'sala', x: 850, y: 145, color: 'original', flipped: false },
    { id: 3, kind: 'armchair', room: 'sala', x: 500, y: 270, color: 'original', flipped: false },
  ]; world.layout.nextId = 4;
  world.items = world.items.map(i => ({ ...i, spot: 'floor' }));
  world.actors = world.actors.map((a, i) => ({ ...a, look, x: [330, 150, 1085, 780, 450, 650, 1000][i]!, y: 530, seat: null }));
  world.actors.slice(0, 4).forEach((a, index) => { world = transition(world, { type: 'pick', actor: a.id, item: world.items[index]!.id }).state; });
  world = transition(world, { type: 'sit', actor: 'luna', seat: '1.0' }).state;
  world = transition(world, { type: 'sit', actor: 'leo', seat: '2.0' }).state;
  return { ...world, show: false };
}
for (const look of lookIds) test(`visual: ${look}, corpo, roupa e objeto em poses e caminhada`, async ({ page }) => {
  await page.setViewportSize({ width: 1792, height: 768 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const saved = encodeNeighborhood(migrateNeighborhood(initialAlbum(cast(look))));
  await page.addInitScript(value => localStorage.setItem('mundo-da-bia:neighborhood:v2', value), saved);
  await ready(page); await page.screenshot({ path: `reports/visual-${look}-poses.png` });
  await tray(page, 'Turma'); await page.getByRole('button', { name: 'Rui', exact: true }).click(); await closeTray(page);
  const before = await readTown(page); await tap(page, 1160, 530);
  await expect(page.locator('canvas')).toHaveAttribute('data-walking', 'rui');
  // W3L-03: the action ring steps aside while the character walks and comes back beside them when they stop.
  await expect(page.locator('#actor-context')).toBeHidden();
  expect((await readTown(page)).actors[3]!.x).toBe(before.actors[3]!.x);
  await page.screenshot({ path: `reports/visual-${look}-walking.png` });
  await expect.poll(async () => (await readTown(page)).actors[3]!.x).toBeCloseTo(1160, 0);
  expect((await readTown(page)).items.find(i => i.holder === 'rui')!.x).toBeCloseTo(1160, 0);
  await expect(page.locator('#actor-context')).toBeVisible();
  expect(errors).toEqual([]);
});
for (const template of roomTemplates) for (const width of [1024, 1280]) test(`visual: ${template} em ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 1024 ? 768 : 800 });
  let world = addRoom(initialWorld(), { name: template, template, size: 'medium', cell: 2 });
  world = transition(world, { type: 'summon' }).state;
  const saved = encodeNeighborhood(migrateNeighborhood(initialAlbum(world)));
  await page.addInitScript(value => localStorage.setItem('mundo-da-bia:neighborhood:v2', value), saved);
  await ready(page); await page.screenshot({ path: `reports/visual-room-${template}-${width}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
