import { expect, it } from 'vitest';
import { initialWorld } from './world';
import { initialAlbum } from './houses';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
function outside() {
  let t = migrateNeighborhood(initialAlbum(initialWorld()));
  for (const actor of ['bia', 'luna'] as const) t = neighborhoodAction(t, { type: 'transport', actor, location: { kind: 'street' }, point: { x: 300, y: 520 } });
  return t;
}
it('occupies, prevents sharing and releases equipment without duplicating actors', () => {
  let t = outside(); t = neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target: 'bench' });
  expect(t.outdoor.bench).toBe('bia');
  expect(neighborhoodAction(t, { type: 'outdoor', actor: 'luna', target: 'bench' })).toBe(t);
  t = neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target: 'swing' });
  expect(t.outdoor.bench).toBeNull(); expect(t.outdoor.swing).toBe('bia');
  t = neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target: 'leave' }); expect(t.outdoor.swing).toBeNull();
});
it('persists mail and bells and rejects absent residents or buildings; the old flowerbed watering no longer changes anything (§4.3)', () => {
  let t = outside();
  expect(neighborhoodAction(t, { type: 'outdoor', actor: 'leo', target: 'water' })).toBe(t);
  expect(neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target: 'water' })).toBe(t);
  expect(neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target: 'bell', building: 999 })).toBe(t);
  for (const target of ['bell', 'mail'] as const) t = neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target, building: 1 });
  expect(t.outdoor.mail).toEqual([1]); expect(t.outdoor.bells).toEqual([1]);
});
it('releases occupancy on movement and transport and toggles mail independently', async () => {
  const { localWorld, storeWorld } = await import('./neighborhood');
  const { transition } = await import('./world');
  let t = outside(); t = neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target: 'bench' });
  t = storeWorld(t, transition(localWorld(t), { type: 'move', actor: 'bia', point: { x: 300, y: 510 } }).state);
  expect(t.outdoor.bench).toBeNull();
  t = neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target: 'swing' });
  t = neighborhoodAction(t, { type: 'transport', actor: 'bia', location: { kind: 'interior', building: 1, room: 'sala' }, point: { x: 300, y: 510 } });
  expect(t.outdoor.swing).toBeNull();
  expect(neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target: 'water' })).toBe(t);
  t = outside();
  for (const target of ['mail', 'bell'] as const) {
    t = neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target, building: 1 });
    t = neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target, building: 1 });
  }
  expect(t.outdoor.mail).toEqual([]); expect(t.outdoor.bells).toEqual([]);
});
it('releases a bench when bringing its occupant indoors at the same coordinates', async () => {
  const { localWorld, storeWorld } = await import('./neighborhood');
  const { transition } = await import('./world');
  let t = neighborhoodAction(outside(), { type: 'outdoor', actor: 'bia', target: 'bench' });
  t = neighborhoodAction(t, { type: 'visit', location: { kind: 'interior', building: 1, room: 'sala' } });
  const world = transition(localWorld(t), { type: 'travel', actor: 'bia', room: 'sala' }).state;
  t = storeWorld(t, world);
  expect(t.actors[0]!.location).toEqual(t.location);
  expect(t.outdoor.bench).toBeNull();
});
