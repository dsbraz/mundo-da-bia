import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { gameSpace, hopPosition, hopTiles } from './game-space';

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
