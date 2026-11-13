import { describe, expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { unfelt } from './neighborhood-v3';
import { migrateNeighborhood } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld, transition } from '../domain/world';
import { addRoom } from '../domain/rooms';
import type { Neighborhood } from '../domain/neighborhood-types';

/** A home with a new bathroom (its toilet) and the Bia seated on the toilet. */
function home(): Neighborhood {
  let world = addRoom(initialWorld(), { name: 'Banheiro', template: 'bathroom', size: 'medium', cell: 2 });
  world = transition(world, { type: 'travel', actor: 'bia', room: world.room }).state;
  const toilet = world.layout.pieces.find(p => p.room === world.room && p.kind === 'toilet')!;
  world = transition(world, { type: 'sit', actor: 'bia', seat: `${toilet.id}.0` }).state;
  return migrateNeighborhood(initialAlbum(world));
}
const withoutNeeds = (town: Neighborhood): Neighborhood => ({ ...town, actors: town.actors.map(unfelt) });
const bia = (town: Neighborhood) => town.actors.find(a => a.id === 'bia')!;

describe('o vaso sanitário no save', () => {
  it('a Bia sentada no vaso volta sentada nele depois de encode e decode', () => {
    const town = home();
    expect(bia(town).seat).not.toBeNull();
    expect(decodeNeighborhood(encodeNeighborhood(town))).toEqual(withoutNeeds(town));
  });
  it('um build anterior, que não conhece o vaso, lê o save novo: o vaso sai sozinho e quem estava nele fica em pé', () => {
    const town = home();
    const raw = JSON.parse(encodeNeighborhood(town)) as { town: { buildings: { layout: { pieces: { kind: string }[] } }[] } };
    // What an older build sees: a piece kind it does not know.
    raw.town.buildings[0]!.layout.pieces.forEach(p => { if (p.kind === 'toilet') p.kind = 'vaso-do-futuro'; });
    const loaded = decodeNeighborhood(JSON.stringify(raw))!;
    expect(loaded.buildings[0]!.layout.pieces).toEqual(town.buildings[0]!.layout.pieces.filter(p => p.kind !== 'toilet'));
    expect(bia(loaded).seat).toBeNull();
    expect(loaded.actors.filter(a => a.id !== 'bia')).toEqual(withoutNeeds(town).actors.filter(a => a.id !== 'bia'));
  });
});
