import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { seatPoint } from '../src/domain/seats';
import { footprint } from '../src/domain/placement';
import type { Piece, World } from '../src/domain/types';
import { point, read, ready } from './helpers';

const shots = 'reports/wave3-life-3';
const chair: Piece = { id: 20, kind: 'chair', room: 'sala', x: 640, y: 400, color: 'original', flipped: false };
/** The living room with its table and a free chair, the Bia at x 400 and the teddy bear on the floor at x 860; the others in the
 *  bedroom; paused clock. */
function room(): World {
  const world = initialWorld();
  world.layout = { ...world.layout, pieces: [...world.layout.pieces.filter(p => p.kind !== 'sofa' && p.kind !== 'stage'), chair], nextId: 21 };
  world.actors = world.actors.map(a => ({ ...a, room: a.id === 'bia' ? 'sala' : 'quarto', x: 400, y: 530, seat: null }));
  world.items = world.items.map((i, n) => ({ ...i, room: n === 3 ? 'sala' : 'quarto', spot: 'floor', x: 860, y: 530 }));
  return world;
}
async function seed(page: Page, reduced: boolean) {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(room()))));
  await ready(page); await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
}
/** A finger drag in world coordinates, one step per frame. */
async function carry(page: Page, from: [number, number], to: [number, number]) {
  const a = await point(page, ...from); await page.mouse.move(a.x, a.y); await page.mouse.down();
  for (let k = 1; k <= 10; k++) { const p = await point(page, from[0] + (to[0] - from[0]) * k / 10, from[1] + (to[1] - from[1]) * k / 10); await page.mouse.move(p.x, p.y); await page.clock.runFor(32); }
  await page.mouse.up();
}
const table = (world: World) => world.layout.pieces.find(p => p.kind === 'table')!;

for (const reduced of [false, true]) test(`soltar o ursinho acima da mesa o deixa na mesa, e acima do chão ele cai no chão${reduced ? ' (movimento reduzido, sem quique)' : ''}`, async ({ page }) => {
  await seed(page, reduced);
  const top = table(await read(page)), above: [number, number] = [top.x + 140, top.y - 90];
  await carry(page, [860, 500], above);
  await page.clock.runFor(reduced ? 60 : 150);
  if (!reduced) await page.screenshot({ path: `${shots}/physics-teddy-falling-1024.png` });
  await page.clock.runFor(600);
  const teddy = (await read(page)).items.find(i => i.kind === 'ursinho')!;
  expect(teddy).toMatchObject({ spot: 'table', holder: null });
  expect(Math.abs(teddy.x - above[0])).toBeLessThanOrEqual(12);
  await page.screenshot({ path: `${shots}/physics-teddy-on-table-1024${reduced ? '-reduced' : ''}.png` });
  if (!reduced) {
    await page.setViewportSize({ width: 844, height: 390 }); await page.clock.runFor(300);
    await page.screenshot({ path: `${shots}/physics-teddy-on-table-844.png` });
    await page.setViewportSize({ width: 1024, height: 768 }); await page.clock.runFor(300);
  }
  // Let go high on the wall, away from the table: it falls to the floor below, never stays in the air.
  await carry(page, [teddy.x, teddy.y - 28], [880, 250]);
  await page.clock.runFor(800);
  expect((await read(page)).items.find(i => i.kind === 'ursinho')).toMatchObject({ spot: 'floor', y: 410 });
});

test('soltar a Bia 50 px ao lado de uma cadeira livre a senta (o ímã de assento)', async ({ page }) => {
  await seed(page, false);
  const world = await read(page), seat = seatPoint(world, '20.0')!;
  await carry(page, [400, 515], [seat.x + 50, seat.y - 15]);
  await page.clock.runFor(400);
  expect((await read(page)).actors[0]).toMatchObject({ seat: '20.0', x: seat.x, y: seat.y });
  await page.screenshot({ path: `${shots}/physics-chair-magnet-1024.png` });
  await page.setViewportSize({ width: 844, height: 390 }); await page.clock.runFor(300);
  await page.screenshot({ path: `${shots}/physics-chair-magnet-844.png` });
});

for (const reduced of [false, true]) test(`soltar a Bia sobre a mesa a deixa ao lado da mesa, nunca dentro dela${reduced ? ' (movimento reduzido)' : ''}`, async ({ page }) => {
  await seed(page, reduced);
  const area = footprint(table(await read(page)))!;
  await carry(page, [400, 515], [(area.left + area.right) / 2, (area.top + area.bottom) / 2]);
  await page.clock.runFor(400);
  const bia = (await read(page)).actors[0]!;
  expect(bia.x < area.left || bia.x > area.right || bia.y < area.top || bia.y > area.bottom).toBe(true);
  await page.screenshot({ path: `${shots}/physics-beside-table-1024${reduced ? '-reduced' : ''}.png` });
  if (!reduced) { await page.setViewportSize({ width: 844, height: 390 }); await page.clock.runFor(300); await page.screenshot({ path: `${shots}/physics-beside-table-844.png` }); }
});
