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
it('releaseOutdoor frees only what the actor holds; the equipment needs the street and the actor on it', async () => {
  const { releaseOutdoor, initialOutdoor, interactOutdoor } = await import('./outdoor');
  expect(releaseOutdoor({ ...initialOutdoor(), bench: 'bia', swing: 'luna' }, 'bia')).toEqual({ ...initialOutdoor(), bench: null, swing: 'luna' });
  expect(releaseOutdoor({ ...initialOutdoor(), bench: 'luna', swing: 'bia' }, 'bia')).toEqual({ ...initialOutdoor(), bench: 'luna', swing: null });
  const t = outside();
  const inside = { ...t, location: { kind: 'interior' as const, building: 1, room: 'sala' as const } };
  expect(interactOutdoor(inside, { type: 'outdoor', actor: 'bia', target: 'swing' })).toBe(inside);
  expect(interactOutdoor(t, { type: 'outdoor', actor: 'rui', target: 'swing' })).toBe(t);
  expect(interactOutdoor(t, { type: 'outdoor', actor: 'rui', target: 'mail', building: 1 })).toBe(t);
});
it('on the swing she stands at its point, off her seat, with what she holds; leaving changes only the equipment (W3L-13: the swing plays, the bench rests)', () => {
  let t = outside();
  t = { ...t, items: t.items.map((i, n) => n === 0 ? { ...i, holder: 'bia' as const, location: { kind: 'street' as const } } : i),
    actors: t.actors.map(a => a.id === 'bia' ? { ...a, seat: '1.0', resting: true, needs: { fome: 20, sono: 0, tedio: 50, alegria: 0 } } : a) };
  const swung = neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target: 'swing' }), bia = swung.actors.find(a => a.id === 'bia')!;
  expect([bia.x, bia.y, bia.seat, bia.resting, bia.needs?.tedio]).toEqual([400, 445, null, false, 10]);
  expect(swung.actors.filter(a => a.id !== 'bia')).toEqual(t.actors.filter(a => a.id !== 'bia'));
  expect([swung.items[0]!.x, swung.items[0]!.y]).toEqual([400, 445]);
  expect(swung.items.slice(1)).toEqual(t.items.slice(1));
  expect(neighborhoodAction(swung, { type: 'outdoor', actor: 'bia', target: 'swing' }).outdoor.swing).toBe('bia');
  const left = neighborhoodAction(swung, { type: 'outdoor', actor: 'bia', target: 'leave' });
  expect(left.actors).toEqual(swung.actors); expect(left.outdoor.swing).toBeNull();
  const bench = neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target: 'bench' }).actors.find(a => a.id === 'bia')!;
  expect([bench.x, bench.y, bench.needs?.tedio]).toEqual([180, 445, 50]);
});
it('mail and bells are kept apart, and so are the buildings', () => {
  let t = outside();
  t = neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target: 'mail', building: 1 });
  expect([t.outdoor.mail, t.outdoor.bells]).toEqual([[1], []]);
  t = { ...t, outdoor: { ...t.outdoor, mail: [7, 1] } };
  t = neighborhoodAction(t, { type: 'outdoor', actor: 'bia', target: 'mail', building: 1 });
  expect(t.outdoor.mail).toEqual([7]);
});
it('the plaza ball is added once', async () => {
  const { plazaBall } = await import('./outdoor');
  const once = plazaBall({ items: [] as import('./neighborhood-types').NeighborhoodItem[] });
  expect(once.items).toEqual([{ id: '1:bola', kind: 'bola', room: 'sala', location: { kind: 'street' }, x: 320, y: 525, holder: null, spot: 'floor' }]);
  expect(plazaBall(once)).toBe(once);
  expect(plazaBall({ items: [{ ...once.items[0]!, kind: 'lanche' as const }] }).items).toHaveLength(2);
});
