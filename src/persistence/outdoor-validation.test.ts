import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { encodeNeighborhood, decodeNeighborhood } from './neighborhood';
import type { Outdoor } from '../domain/neighborhood-types';
function occupied() {
  let town = migrateNeighborhood(initialAlbum(initialWorld()));
  town = neighborhoodAction(town, { type: 'transport', actor: 'bia', location: { kind: 'street' }, point: { x: 180, y: 510 } });
  return neighborhoodAction(town, { type: 'outdoor', actor: 'bia', target: 'bench' });
}
it('round-trips occupied equipment and mail without losing hands or position', () => {
  let town = occupied();
  town = neighborhoodAction(town, { type: 'outdoor', actor: 'bia', target: 'mail', building: 1 });
  town = neighborhoodAction(town, { type: 'outdoor', actor: 'bia', target: 'bell', building: 1 });
  expect(decodeNeighborhood(encodeNeighborhood(town))).toEqual(town);
});
it('rejects absent equipment, malformed state and references to missing constructions', () => {
  const town = occupied();
  for (const outdoor of [null, [], {}, { ...town.outdoor, watered: 1 }, { ...town.outdoor, bench: 'missing' },
    { ...town.outdoor, swing: 'bia' }, { ...town.outdoor, mail: null }, { ...town.outdoor, bells: [2] },
    { ...town.outdoor, mail: [1, 1] }, { ...town.outdoor, bells: ['1'] }, { ...town.outdoor, bench: undefined }]) {
    expect(decodeNeighborhood(encodeNeighborhood({ ...town, outdoor: outdoor as Outdoor }))).toBeNull();
  }
});
it('rejects occupants who moved away, including one-coordinate discrepancies', () => {
  const town = occupied();
  for (const patch of [{ x: 181 }, { y: 446 }, { location: { kind: 'interior' as const, building: 1, room: 'sala' as const } }]) {
    const next = { ...town, actors: town.actors.map(a => a.id === 'bia' ? { ...a, ...patch } : a) };
    expect(decodeNeighborhood(encodeNeighborhood(next))).toBeNull();
  }
});
