import { expect, it } from 'vitest';
import { initialAlbum } from './houses';
import { initialWorld, transition } from './world';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { decodeNeighborhood, encodeNeighborhood } from '../persistence/neighborhood';
import { streetWidth } from './neighborhood-geometry';
import { buy, checkout, unpaidExit } from './market';

it.each([false, true])('excluir mercado devolve compras não pagas e preserva as pagas: pago=%s', paid => {
  let town = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'shop', plan: 'market' });
  town = neighborhoodAction(town, { type: 'transport', actor: 'bia', location: { kind: 'interior', building: 2, room: 'sala' }, point: { x: 500, y: 520 } });
  const shelf = town.buildings[1]!.layout.pieces.find(p => p.kind === 'market-shelf')!;
  town = buy(town, { actor: 'bia', piece: shelf.id, good: 'pao' }).town;
  if (paid) town = checkout(town, 'bia').town;
  const bag = town.items.find(i => i.kind === 'sacola')!;
  const next = neighborhoodAction(town, { type: 'remove-building', building: 2 });
  expect(next.items.some(i => i.id === bag.id)).toBe(paid);
  expect(unpaidExit(next, { type: 'transport', actor: 'bia', location: { kind: 'interior', building: 1, room: 'sala' }, point: { x: 500, y: 520 } })).toBeNull();
  expect(decodeNeighborhood(encodeNeighborhood(next))).toEqual(next);
  expect(town.items).toContainEqual(bag);
});

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

it('excluir a casa do último terreno deixa toda a turma dentro da rua e o bairro legível', () => {
  const initial = migrateNeighborhood(initialAlbum(initialWorld()));
  const town = neighborhoodAction(initial, { type: 'construct', plot: initial.plots - 1, model: 'house' });
  const building = town.buildings.find(b => b.plot === town.plots - 1)!.id;
  const room = { location: { kind: 'interior' as const, building, room: 'sala' as const }, room: 'sala' as const, x: 500 };
  const inside = { ...town, actors: town.actors.map(a => ({ ...a, ...room, seat: null })),
    items: town.items.map((i, n) => n === 0 ? { ...i, ...room, holder: 'laura' as const, spot: 'floor' as const } : i) };
  const next = neighborhoodAction(inside, { type: 'remove-building', building });
  expect(next.actors.every(a => a.x >= 60 && a.x <= streetWidth(next.plots) - 60)).toBe(true);
  expect(next.items.find(i => i.holder === 'laura')!.x).toBe(next.actors.find(a => a.id === 'laura')!.x);
  expect(decodeNeighborhood(encodeNeighborhood(next))).toEqual(next);
});
