import { expect, it } from 'vitest';
import { initialAlbum } from './houses';
import { initialWorld, transition } from './world';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { decodeNeighborhood, encodeNeighborhood } from '../persistence/neighborhood';

it('excluir uma casa libera o terreno e preserva a turma e seus objetos na rua', () => {
  const world = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'microfone' }).state;
  const initial = migrateNeighborhood(initialAlbum(world));
  const town = neighborhoodAction(initial, { type: 'construct', plot: 1, model: 'house' });
  const next = neighborhoodAction(town, { type: 'remove-building', building: 1 });
  expect(next.buildings).toEqual([town.buildings[1]]);
  expect(next.location).toEqual({ kind: 'street' });
  expect(next.actors).toHaveLength(town.actors.length);
  expect(next.items).toHaveLength(town.items.length);
  expect(next.actors.every(a => a.location.kind === 'street' && a.seat === null && !a.resting)).toBe(true);
  expect(next.items.every(i => i.location.kind === 'street' && i.spot === 'floor')).toBe(true);
  expect(next.items.find(i => i.holder === 'bia')).toMatchObject({ x: next.actors[0]!.x, y: next.actors[0]!.y });
  expect(decodeNeighborhood(encodeNeighborhood(next))).toEqual(next);
  expect(neighborhoodAction(next, { type: 'construct', plot: 0, model: 'shop' }).buildings).toHaveLength(2);
  expect(town.buildings).toHaveLength(2);
});

it('excluir outra casa mantém a vista e os moradores; última casa e ID ausente não mudam nada', () => {
  const initial = migrateNeighborhood(initialAlbum(initialWorld()));
  expect(neighborhoodAction(initial, { type: 'remove-building', building: 1 })).toBe(initial);
  const town = neighborhoodAction(initial, { type: 'construct', plot: 1, model: 'house' });
  expect(neighborhoodAction(town, { type: 'remove-building', building: 999 })).toBe(town);
  const next = neighborhoodAction(town, { type: 'remove-building', building: 2 });
  expect(next.location).toEqual(town.location);
  expect(next.actors).toEqual(town.actors);
  expect(next.items).toEqual(town.items);
  expect(decodeNeighborhood(encodeNeighborhood(next))).toEqual(next);
});
