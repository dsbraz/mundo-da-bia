import { expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { spawnItem } from '../domain/portable';
import { decode, encode } from './save';
import type { Neighborhood } from '../domain/neighborhood-types';

const base = () => migrateNeighborhood(initialAlbum(initialWorld()));
const room = (building: number) => ({ kind: 'interior' as const, building, room: 'sala' as const });
const roundTrip = (town: Neighborhood) => decodeNeighborhood(encodeNeighborhood(town));

it('save com prato de receita desconhecida carrega sem ele; prato conhecido, caprichado e adereços ficam', () => {
  let town = spawnItem(base(), { kind: 'prato', recipe: 'pizza', fancy: true, location: room(1), point: { x: 400, y: 530 } });
  town = spawnItem(town, { kind: 'regador', location: { kind: 'street' }, point: { x: 900, y: 520 } });
  expect(roundTrip(town)).toEqual(town);
  const raw = JSON.parse(encodeNeighborhood(town));
  raw.town.items.push({ ...raw.town.items.at(-2), id: '9:prato', recipe: 'lasanha', holder: 'bia', x: 520, y: 530 });
  raw.town.items.push({ ...raw.town.items.at(-3), id: '10:prato', recipe: undefined });
  raw.town.items.push({ ...raw.town.items.at(-1), id: '11:telescopio', kind: 'telescopio' });
  expect(decodeNeighborhood(JSON.stringify(raw))).toEqual(town);
});
it('id de item segue número:tipo com sufixo igual ao tipo e único', () => {
  const town = spawnItem(base(), { kind: 'prato', recipe: 'pizza', location: room(1), point: { x: 400, y: 530 } });
  const dish = town.items.at(-1)!;
  const withItem = (item: object) => roundTrip({ ...town, items: [...town.items.slice(0, -1), { ...dish, ...item }] as Neighborhood['items'] });
  expect(withItem({ id: '2:lanche' })).toBeNull();
  expect(withItem({ id: '0:prato' })).toBeNull();
  expect(withItem({ id: '2:Prato' })).toBeNull();
  expect(withItem({ id: '1:lanche', kind: 'lanche', recipe: undefined })).toBeNull();
  expect(withItem({ id: '1:prato' })).not.toBeNull();
  expect(withItem({ fancy: false })).toBeNull();
  expect(withItem({ recipe: 'pizza', kind: 'colher', id: '2:colher' })).toBeNull();
  expect(withItem({ recipe: undefined, kind: 'colher', id: '2:colher', spot: 'drawer' })).not.toBeNull();
  expect(withItem({ recipe: undefined, kind: 'colher', id: '2:colher', spot: 'fridge' })).toBeNull();
  expect(withItem({ spot: 'bolso' })).toBeNull();
  expect(withItem({ holder: 'ze' })).toBeNull();
  expect(withItem({ x: 30 })).toBeNull();
  expect(withItem({ holder: 'bia', x: 520, y: 530 })).not.toBeNull();
});
it('prato na geladeira é válido e microfone na geladeira continua inválido', () => {
  const town = base(), fridge = town.items.find(i => i.spot === 'fridge')!;
  const dish = { ...fridge, id: `${town.nextItem}:prato` as const, kind: 'prato' as const, recipe: 'panqueca' as const };
  expect(roundTrip({ ...town, nextItem: town.nextItem + 1, items: [...town.items, dish] })?.items.at(-1)).toEqual(dish);
  const mic = town.items.find(i => i.kind === 'microfone')!;
  expect(roundTrip({ ...town, items: town.items.map(i => i === mic ? { ...mic, spot: 'fridge', x: fridge.x, y: fridge.y } : i) })).toBeNull();
});
it('duplicar uma casa com dois pratos e remover outra com um prato mantém ids únicos e o save carrega', () => {
  let town = neighborhoodAction(base(), { type: 'construct', plot: 1, model: 'house' });
  town = spawnItem(town, { kind: 'prato', recipe: 'pizza', location: room(1), point: { x: 400, y: 530 } });
  town = spawnItem(town, { kind: 'prato', recipe: 'curau', location: room(1), point: { x: 450, y: 530 } });
  town = spawnItem(town, { kind: 'prato', recipe: 'pudim', location: room(2), point: { x: 450, y: 530 } });
  const duplicated = neighborhoodAction(town, { type: 'duplicate', building: 1 });
  expect(duplicated.items).toEqual(town.items);
  const removed = neighborhoodAction(duplicated, { type: 'remove-building', building: 2 });
  const moved = removed.items.find(i => i.recipe === 'pudim')!;
  expect(moved.location).toEqual({ kind: 'street' });
  expect(new Set(removed.items.map(i => i.id)).size).toBe(removed.items.length);
  expect(roundTrip(removed)).toEqual(removed);
});
it('o save legado de casa única, versões 1 a 4, continua carregando', () => {
  const world = initialWorld();
  expect(decode(encode(world))).toEqual(world);
  expect(decode(JSON.stringify({ version: 3, state: world }))).toEqual(world);
  expect(decode(JSON.stringify({ version: 2, state: world }))).toEqual(world);
  const legacy = JSON.parse(JSON.stringify({ ...world, layout: undefined, home: undefined, actors: world.actors.map(a => ({ ...a, seat: undefined, look: 'festa' })),
    items: world.items.map(i => ({ ...i, spot: undefined })) }));
  expect(legacy.items[0]).not.toHaveProperty('spot');
  expect(decode(JSON.stringify({ version: 1, state: legacy })).actors.every(a => a.look === 'festa')).toBe(true);
});
