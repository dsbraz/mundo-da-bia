import { describe, expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { plotStart } from '../domain/neighborhood-geometry';
import type { Neighborhood } from '../domain/neighborhood-types';
import { destinationPoint, doorFront, doorStep } from './neighborhood-doors';

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
    const quarto = neighborhoodAction(inside, { type: 'visit', location: { kind: 'interior', building: building.id, room: 'quarto' } });
    expect(doorStep(quarto, { kind: 'street' })).toBeNull();
  });
});
