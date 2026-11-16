import { expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { migrateNeighborhood, undoTo } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import type { Neighborhood, NeighborhoodItem } from '../domain/neighborhood-types';

it('desfazer com um prato na mão: a mão segura só o prato, o objeto antigo fica no chão aos pés dela e o save continua legível', () => {
  const base = migrateNeighborhood(initialAlbum(initialWorld()));
  const bia = base.actors.find(a => a.id === 'bia')!, toy = base.items.find(i => i.kind !== 'prato')!;
  const at = (x: number) => ({ location: bia.location, room: bia.room, x, y: bia.y });
  // Before the undo point Bia held the toy; since then she put it down, walked and picked up a dish.
  const older: Neighborhood = { ...base, items: base.items.map(i => i.id === toy.id ? { ...i, ...at(bia.x), holder: 'bia', spot: 'floor' } : i) };
  const plate = { id: '90:prato', kind: 'prato', recipe: 'pizza', ...at(bia.x + 100), holder: 'bia', spot: 'floor' } as NeighborhoodItem;
  const now: Neighborhood = { ...base, nextItem: 91, items: [...base.items.map(i => i.id === toy.id ? { ...i, holder: null } : i), plate],
    actors: base.actors.map(a => a.id === 'bia' ? { ...a, x: bia.x + 100 } : a) };
  const back = undoTo(older, now);
  expect(back.items.filter(i => i.holder === 'bia').map(i => i.id)).toEqual(['90:prato']);
  expect(back.items.find(i => i.id === '90:prato')).toMatchObject({ x: bia.x, y: bia.y, location: bia.location });
  expect(back.items.find(i => i.id === toy.id)).toMatchObject({ holder: null, spot: 'floor', x: bia.x, y: bia.y });
  expect(decodeNeighborhood(encodeNeighborhood(back))).not.toBeNull();
});
