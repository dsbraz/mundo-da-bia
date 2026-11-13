import { expect, it } from 'vitest';
import { initialAlbum } from './houses';
import { initialWorld } from './world';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { buildingModels, type Building, type Neighborhood } from './neighborhood-types';
import { inPassages } from './placement';
import { addRoom } from './rooms';
import { clearPassages } from './passage-clearance';
import type { Actor, PieceKind, RoomTemplate } from './types';
import { decodeNeighborhood, encodeNeighborhood } from '../persistence/neighborhood';

const town = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
/** Every piece standing in a doorway, the stairs or the stairwell of its room, as "room:kind". */
const blocked = (building: Building) => building.layout.pieces.filter(p => inPassages(building, p) > 0).map(p => `${p.room}:${p.kind}`);
const floors = (count: number) => {
  let next = town();
  for (let floor = 1; floor < count; floor++) next = neighborhoodAction(next, { type: 'add-floor', building: 1 });
  return next.buildings[0]!;
};

it('a casa nova, com 1, 2 ou 3 andares, não tem peça em porta, escada ou vão de escada', () => {
  expect([1, 2, 3].map(count => blocked(floors(count)))).toEqual([[], [], []]);
});
it('toda construção nova (e o mercado) nasce com as passagens livres', () => {
  const built = buildingModels.map(model => [model, blocked(neighborhoodAction(town(), { type: 'construct', plot: 1, model }).buildings[1]!)]);
  expect(built).toEqual(buildingModels.map(model => [model, []]));
  const market = neighborhoodAction(town(), { type: 'construct', plot: 1, model: 'shop', plan: 'market' }).buildings[1]!;
  expect(blocked(market)).toEqual([]);
});
it('cada cômodo de uma instituição recebe todas as peças do seu modelo, longe das passagens', () => {
  const counts: Partial<Record<RoomTemplate, number>> = { classroom: 5, sportsfield: 1, gym: 2 };
  for (const model of buildingModels.filter(m => !['house', 'apartment', 'shop'].includes(m))) {
    const layout = neighborhoodAction(town(), { type: 'construct', plot: 1, model }).buildings[1]!.layout;
    for (const [id, room] of Object.entries(layout.rooms)) expect([model, id, layout.pieces.filter(p => p.room === id).length]).toEqual([model, id, counts[room.template] ?? 3]);
  }
});
it('um cômodo novo ao lado do quarto tira a cama da porta que se abre; a casa segue sem peça em passagem', () => {
  for (const cell of [2, 3]) expect(blocked(neighborhoodAction(town(), { type: 'add-module', building: 1, cell, template: 'kitchen' }).buildings[0]!)).toEqual([]);
});
const piece = (t: Neighborhood, kind: PieceKind) => t.buildings[0]!.layout.pieces.find(p => p.kind === kind)!;
const luna = (actors: readonly Actor[]) => actors.find(a => a.id === 'luna')!;
it('a escada de um andar novo leva o sofá para o lado e o abajur para junto do palco; quem está sentado vai junto e o save segue válido', () => {
  const before = town(), after = neighborhoodAction(before, { type: 'add-floor', building: 1 });
  expect(piece(after, 'sofa')).toMatchObject({ x: 200, y: 300 }); expect(piece(after, 'lamp')).toMatchObject({ x: 920, y: 160 });
  expect(luna(after.actors)).toMatchObject({ seat: luna(before.actors).seat, x: luna(before.actors).x + 140, y: luna(before.actors).y + 30 });
  expect(decodeNeighborhood(encodeNeighborhood(after))).toEqual(after);
  // The same in the open house (Criar → new room upstairs).
  const world = addRoom(initialWorld(), { name: 'Sótão', template: 'empty', size: 'medium', cell: 4 });
  expect(luna(world.actors)).toMatchObject({ seat: luna(after.actors).seat, x: luna(after.actors).x, y: luna(after.actors).y });
});
it('a peça que um save antigo já deixava numa passagem fica onde está; só sai o que a obra nova cobriria', () => {
  const old = town(), building = old.buildings[0]!;
  const rooms = { ...building.layout.rooms, sala: { ...building.layout.rooms.sala, size: 'small' as const } };
  const lot5 = { ...old, buildings: [{ ...building, layout: { ...building.layout, rooms, pieces: building.layout.pieces.map(p => p.kind === 'stage' ? { ...p, x: 830 } : p) } }] };
  const after = neighborhoodAction(lot5, { type: 'add-floor', building: 1 });
  expect(piece(after, 'stage')).toEqual(piece(lot5, 'stage'));
  expect(blocked(after.buildings[0]!)).toEqual(['sala:stage']);
});
it('sem lugar livre no cômodo, a peça fica e a passagem continua', () => {
  const world = initialWorld(), beds = [0, 400, 775].flatMap(x => [115, 215, 315].map(y => ({ x, y })));
  const pieces = beds.map((p, i) => ({ id: i + 1, kind: 'bed' as const, room: 'sala' as const, color: 'original' as const, flipped: false, ...p }));
  const layout = { ...world.layout, pieces, nextId: pieces.length + 1 };
  const full = { ...world, actors: [], items: [], layout };
  expect(clearPassages(full, { ...layout, rooms: { sala: layout.rooms.sala } as typeof layout.rooms })).toBe(full);
});
