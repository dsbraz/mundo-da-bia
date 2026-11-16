import { describe, expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { plotStart } from '../domain/neighborhood-geometry';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { Piece, RoomId } from '../domain/types';
import { footprint } from '../domain/placement';
import { destinationPoint, doorAt, doorBox, doorDropAt, doorFront, doorStep, doors } from './neighborhood-doors';
import { passages } from '../domain/passages';

const home = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
const street = (town: Neighborhood): Neighborhood => neighborhoodAction(town, { type: 'visit', location: { kind: 'street' } });

describe('portas contínuas', () => {
  it('quem entra em casa aparece na frente da porta da rua, não no canto esquerdo', () => {
    const town = street(home()), building = town.buildings[0]!;
    expect(destinationPoint(town, { kind: 'interior', building: building.id, room: building.entry })).toEqual({ x: 550, y: 480 });
    // A room without the street door keeps its left-side arrival.
    expect(destinationPoint(town, { kind: 'interior', building: building.id, room: 'quarto' })).toEqual({ x: 160, y: 520 });
  });
  it('para sair, anda até a frente da porta: a da fachada na rua, a da rua no interior', () => {
    const inside = home(), outside = street(inside), building = outside.buildings[0]!;
    expect(doorFront(outside, { kind: 'interior', building: building.id, room: building.entry })).toEqual({ x: plotStart(building.plot) + 220, y: 452 });
    expect(doorFront(inside, { kind: 'street' })).toEqual({ x: 550, y: 432 });
  });
  it('quem chega sai andando do vão da porta por onde entrou', () => {
    const inside = home(), outside = street(inside), building = outside.buildings[0]!;
    expect(doorStep(inside, { kind: 'street' })).toEqual({ x: 550, y: 412 });
    expect(doorStep(outside, inside.location)).toEqual({ x: plotStart(building.plot) + 220, y: 448 });
    expect(doorStep(outside, { kind: 'street' })).toBeNull();
    expect(doorStep(outside, { ...inside.location, room: 'quarto' } as typeof inside.location)).toEqual({ x: plotStart(building.plot) + 220, y: 448 });
    const quarto = neighborhoodAction(inside, { type: 'visit', location: { kind: 'interior', building: building.id, room: 'quarto' } });
    expect(doorStep(quarto, { kind: 'street' })).toBeNull();
  });
});
describe('doorDropAt', () => {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  it('aceita os pés no vão da porta e na faixa de chão logo diante da soleira, nunca no meio do chão', () => {
    expect(doorDropAt(town, { x: 550, y: 410 })?.name).toBe('Rua');
    expect(doorDropAt(town, { x: 500, y: 434 })?.name).toBe('Rua');
    expect(doorDropAt(town, { x: 550, y: 435 })).toBeUndefined();
    expect(doorDropAt(town, { x: 496, y: 420 })).toBeUndefined();
    expect(doorDropAt(town, { x: 550, y: 181 })).toBeUndefined();
    expect(doorBox(town, doorDropAt(town, { x: 550, y: 300 })!)).toEqual({ x: 498, y: 182, width: 104, height: 228 });
  });
});
describe('passagens entre cômodos', () => {
  const sala = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
  const at = (town: Neighborhood, room: RoomId): Neighborhood => neighborhoodAction(town, { type: 'visit', location: { kind: 'interior', building: town.buildings[0]!.id, room } });
  const upstairs = (): Neighborhood => neighborhoodAction(sala(), { type: 'add-floor', building: sala().buildings[0]!.id });
  const where = (town: Neighborhood, room: RoomId) => ({ kind: 'interior' as const, building: town.buildings[0]!.id, room });
  it('lote 8A: sem portas entre cômodos; a sala leva ao quarto pela beirada direita do chão, o quarto volta pela esquerda', () => {
    const town = sala(), quarto = at(town, 'quarto');
    expect(doors(town).map(d => [d.name, d.kind])).toEqual([['Rua', 'door'], ['Quarto dos sonhos', 'edge']]);
    expect(doors(town)[1]!.box).toEqual({ x: 1136, y: 400, width: 64, height: 200 });
    expect(doors(quarto).map(d => [d.location, d.box.x])).toEqual([[where(town, 'sala'), 0]]);
    // Only the floor's edge: the wall above it and the floor before it are no way through.
    expect(doorDropAt(town, { x: 1170, y: 520 })?.location).toEqual(where(town, 'quarto'));
    expect(doorDropAt(town, { x: 1130, y: 520 })).toBeUndefined();
    expect(doorAt(town, { x: 1170, y: 300 })).toBeUndefined();
    expect(doorDropAt(quarto, { x: 30, y: 480 })?.location).toEqual(where(town, 'sala'));
  });
  it('lote 8A: sai andando pela beirada, para fora do cômodo, e entra andando pela beirada oposta do vizinho', () => {
    const town = sala(), quarto = at(town, 'quarto');
    expect(doorFront(town, where(town, 'quarto'))).toEqual({ x: 1050, y: 500 });
    expect(doors(town)[1]!.sill).toEqual({ x: 1270, y: 500 });
    expect(destinationPoint(town, where(town, 'quarto'))).toEqual({ x: 150, y: 500 });
    expect(destinationPoint(quarto, where(town, 'sala'))).toEqual({ x: 1050, y: 500 });
    expect(doorStep(quarto, where(town, 'sala'))).toEqual({ x: -70, y: 500 });
    expect(doorStep(town, where(town, 'quarto'))).toEqual({ x: 1270, y: 500 });
    expect(doorFront(town, { kind: 'street' })).toEqual({ x: 550, y: 432 });
  });
  it('lote 8A: o primeiro cômodo de cada andar tem o vão da escada na ponta esquerda: sobe até o teto; em cima, chega por um vão no chão', () => {
    const town = upstairs(), top = at(town, 'room-3'), column = { x: 0, y: 0, width: 240, height: 600 };
    expect(doors(town).find(d => d.kind === 'up')).toMatchObject({ location: where(town, 'room-3'), box: { x: 0, y: 20, width: 240, height: 430 } });
    expect(doors(top).find(d => d.kind === 'down')).toMatchObject({ location: where(town, 'sala'), box: { x: 16, y: 478, width: 214, height: 122 } });
    expect(passages(town.buildings[0]!.layout, 'sala')[0]!.zone).toEqual(column);
    expect(passages(town.buildings[0]!.layout, 'room-3')[0]!.zone).toEqual(column);
    expect(destinationPoint(town, where(town, 'room-3'))).toEqual({ x: 262, y: 520 });
    expect(destinationPoint(top, where(town, 'sala'))).toEqual({ x: 228, y: 480 });
    expect(doorFront(top, where(town, 'sala'))).toEqual({ x: 262, y: 520 });
    expect(doorStep(town, where(town, 'room-3'))).toEqual({ x: 110, y: 200 });
    expect(doorStep(top, where(town, 'sala'))).toEqual({ x: 110, y: 585 });
    expect(doorDropAt(top, { x: 150, y: 540 })?.kind).toBe('down');
    // The flight takes whoever is dropped on its steps or at its foot.
    expect(doorDropAt(town, { x: 200, y: 460 })?.kind).toBe('up');
    expect(doorDropAt(town, { x: 260, y: 460 })).toBeUndefined();
  });
  it('#24: pelo Mapa (ou a seta do balão), o quarto de cima recebe quem chega diante do vão da escada, nunca dentro dele', () => {
    const id = sala().buildings[0]!.id;
    const built = neighborhoodAction(neighborhoodAction(sala(), { type: 'add-module', building: id, cell: 2, template: 'kitchen' }), { type: 'add-module', building: id, cell: 4, template: 'bedroom' });
    const rooms = built.buildings[0]!.layout.rooms, ids = Object.keys(rooms) as RoomId[];
    const kitchen = ids.find(r => rooms[r]!.cell === 2)!, upstairs = ids.find(r => rooms[r]!.cell === 4)!;
    const point = destinationPoint(at(built, kitchen), where(built, upstairs));
    const inside = passages(built.buildings[0]!.layout, upstairs).some(({ box: b }) => point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height);
    expect(inside).toBe(false);
    expect(point).toEqual({ x: 262, y: 520 });
  });
  it('#24: pelo Mapa, quem chega a um cômodo nunca fica em pé dentro de um móvel', () => {
    const town = sala(), building = town.buildings[0]!;
    const table: Piece = { id: 99, kind: 'table', room: 'quarto', color: 'original', flipped: false, x: 60, y: building.layout.pieces.find(p => p.kind === 'table')!.y };
    const furnished = { ...town, buildings: [{ ...building, layout: { ...building.layout, pieces: [...building.layout.pieces, table] } }] };
    const point = destinationPoint(street(furnished), where(furnished, 'quarto')), f = footprint(table)!;
    expect(f.left <= 160 && 160 <= f.right && f.top <= 520 && 520 <= f.bottom).toBe(true);
    expect(point.x >= f.left && point.x <= f.right && point.y >= f.top && point.y <= f.bottom).toBe(false);
  });
  it('#24: com um móvel diante do vão da escada, quem chega lá em cima sai do móvel sem cair no vão', () => {
    const town = upstairs(), building = town.buildings[0]!;
    // A bed, deep: its nearest free side is the left one, toward the well.
    const bed: Piece = { id: 99, kind: 'bed', room: 'room-3', color: 'original', flipped: false, x: 240, y: 293 };
    const furnished = { ...town, buildings: [{ ...building, layout: { ...building.layout, pieces: [...building.layout.pieces, bed] } }] };
    const point = destinationPoint(street(furnished), where(furnished, 'room-3')), f = footprint(bed)!;
    expect(f.left <= 262 && 262 <= f.right && f.top <= 520 && 520 <= f.bottom).toBe(true);
    expect(point.x >= f.left && point.x <= f.right && point.y >= f.top && point.y <= f.bottom).toBe(false);
    expect(passages(furnished.buildings[0]!.layout, 'room-3').some(({ box: b }) => point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height)).toBe(false);
  });
});
