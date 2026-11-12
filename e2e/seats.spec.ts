import { expect, test } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { fromPiece } from '../src/domain/layout';
import { visualPiecePoint } from '../src/presentation/furniture-scale';
import type { Piece, World } from '../src/domain/types';
import { drag, read, ready } from './helpers';

/** A guest room with two beds side by side; Bia stands in it. */
function twoBeds(): World {
  const world = initialWorld();
  world.room = 'quarto'; world.layout.rooms.quarto.size = 'medium';
  const bed = (id: number, x: number): Piece => ({ id, kind: 'bed', room: 'quarto', x, y: 145, color: 'original', flipped: false });
  world.layout.pieces = [...world.layout.pieces.filter(p => p.room === 'sala'), bed(8, 20), bed(11, 560)];
  world.layout.nextId = 12;
  world.actors = world.actors.map(a => a.id === 'bia' ? { ...a, room: 'quarto', x: 520, y: 530, seat: null } : { ...a, room: 'sala', seat: null, x: 300 + actorsX(a.id), y: 530 });
  return world;
}
const actorsX = (id: string) => ['luna', 'leo', 'rui', 'mimi', 'nino', 'pipoca'].indexOf(id) * 90;

test('soltar a Bia na segunda cama de um quarto com duas camas a deita ali', async ({ page }) => {
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(twoBeds())) as never));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  const world = await read(page), second = world.layout.pieces.find(p => p.id === 11)!;
  expect(world.room).toBe('quarto');
  const mattress = visualPiecePoint(second, fromPiece(second, { x: 790, y: 330 }));
  const bia = world.actors.find(a => a.id === 'bia')!;
  await drag(page, [bia.x, bia.y - 110], [mattress.x, mattress.y]);
  await expect.poll(async () => (await read(page)).actors.find(a => a.id === 'bia')).toMatchObject({ seat: '11.0', resting: true });
  await page.screenshot({ path: 'reports/wave3-life-1b/second-bed-1024.png' });
});
