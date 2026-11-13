import { describe, expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { plotStart } from '../domain/neighborhood-geometry';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { RoomId } from '../domain/types';
import { destinationPoint, doorAt, doorBox, doorDropAt, doorFront, doorStep, doors } from './neighborhood-doors';

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
  it('a sala tem a porta da rua e uma porta no fim da parede, à direita, para o quarto; o quarto, uma à esquerda de volta', () => {
    const town = sala(), quarto = at(town, 'quarto');
    expect(doors(town).map(d => [d.name, d.kind])).toEqual([['Rua', 'door'], ['Quarto dos sonhos', 'passage']]);
    expect(doors(town)[1]!.box).toEqual({ x: 880, y: 182, width: 104, height: 228 });
    expect(doors(quarto).map(d => [d.location, d.box.x])).toEqual([[where(town, 'sala'), 16]]);
    expect(doorAt(town, { x: 930, y: 300 })?.location).toEqual(where(town, 'quarto'));
    expect(doorAt(town, { x: 870, y: 300 })).toBeUndefined();
    expect(doorDropAt(town, { x: 930, y: 430 })?.location).toEqual(where(town, 'quarto'));
    expect(doorBox(town, doors(town)[1]!)).toEqual({ x: 880, y: 182, width: 104, height: 228, depth: 406 });
  });
  it('anda até a passagem, sai por ela e chega diante da passagem correspondente do outro cômodo', () => {
    const town = sala(), quarto = at(town, 'quarto');
    expect(doorFront(town, where(town, 'quarto'))).toEqual({ x: 932, y: 432 });
    expect(destinationPoint(town, where(town, 'quarto'))).toEqual({ x: 68, y: 480 });
    expect(destinationPoint(quarto, where(town, 'sala'))).toEqual({ x: 932, y: 480 });
    expect(doorStep(quarto, where(town, 'sala'))).toEqual({ x: 68, y: 412 });
    // Back in the living room from the bedroom: out of the right doorway, not the street door.
    expect(doorStep(town, where(town, 'quarto'))).toEqual({ x: 932, y: 412 });
    expect(doorFront(town, { kind: 'street' })).toEqual({ x: 550, y: 432 });
  });
  it('o primeiro cômodo de cada andar tem escada: sobe no fim esquerdo da parede e desce por um vão no chão', () => {
    const town = upstairs(), top = at(town, 'room-3');
    expect(doors(town).find(d => d.kind === 'up')).toMatchObject({ location: where(town, 'room-3'), box: { x: 16, y: 150, width: 170, height: 260 } });
    expect(doors(top).find(d => d.kind === 'down')).toMatchObject({ location: where(town, 'sala'), box: { x: 40, y: 516, width: 210, height: 84 } });
    expect(destinationPoint(town, where(town, 'room-3'))).toEqual({ x: 145, y: 505 });
    expect(destinationPoint(top, where(town, 'sala'))).toEqual({ x: 101, y: 480 });
    expect(doorFront(top, where(town, 'sala'))).toEqual({ x: 145, y: 505 });
    expect(doorStep(town, where(town, 'room-3'))).toEqual({ x: 101, y: 412 });
    expect(doorStep(top, where(town, 'sala'))).toEqual({ x: 145, y: 560 });
    expect(doorDropAt(top, { x: 150, y: 540 })?.kind).toBe('down');
  });
});
