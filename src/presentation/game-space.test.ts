import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { freestFloor, gameSpace, hopPosition, hopTiles } from './game-space';

it('mantém todas as casas no piso, com profundidade e pares de pés na mesma linha', () => {
  const origin = { x: 650, y: 530 };
  expect(hopTiles.every(t => origin.y + t.y >= 400)).toBe(true);
  expect(hopPosition(origin, 3)).toEqual(hopPosition(origin, 4));
  expect(hopPosition(origin, 6)).toEqual(hopPosition(origin, 7));
  expect(hopPosition(origin, 8).x).toBeGreaterThan(origin.x);
});

it('recusa uma área tomada por móveis ou pessoas e encontra chão livre sem atravessá-los', () => {
  const world = initialWorld();
  expect(gameSpace(world, world.actors[0]!, 'hopscotch')).toBeNull();
  world.layout.pieces = []; world.actors.forEach(a => { a.x = 200; });
  world.items.forEach(i => { i.x = 100; });
  world.actors[0]!.x = 650;
  const point = gameSpace(world, world.actors[0]!, 'hopscotch');
  expect(point).not.toBeNull(); expect(point!.y).toBe(530);
});
it('quintal novo conserva espaço para amarelinha com toda a mobília', async () => {
  const { addRoom } = await import('../domain/rooms');
  const world = addRoom(initialWorld(), { name: 'Quintal', template: 'playground', size: 'small', cell: 2 });
  world.actors = [{ ...world.actors[0]!, room: world.room, x: 650, y: 530 }]; world.items = [];
  expect(world.layout.pieces.filter(p => p.room === world.room)).toHaveLength(3);
  expect(gameSpace(world, world.actors[0]!, 'hopscotch')).not.toBeNull();
});

it('sem espaço totalmente livre, escolhe o chão mais livre e alcançável em vez de recusar', () => {
  const world = initialWorld(), bia = world.actors[0]!;
  expect(gameSpace(world, bia, 'hopscotch')).toBeNull();
  const point = freestFloor(world, bia, 'hopscotch')!;
  expect(point.y).toBe(530); expect(point.x).toBeGreaterThanOrEqual(130); expect(point.x).toBeLessThanOrEqual(870);
  const crowded = { ...world, layout: { ...world.layout, pieces: [] } };
  expect(gameSpace(crowded, bia, 'hopscotch')).toBeNull();
  expect(freestFloor(crowded, bia, 'hopscotch')).toEqual({ x: 530, y: 530 });
  expect(freestFloor({ ...world, streetWidth: 3000 }, bia, 'rope')).toBeNull();
});
