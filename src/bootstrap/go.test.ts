import { expect, it, vi } from 'vitest';
import { goTo } from './go';
import { migrateNeighborhood } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import type { Neighborhood } from '../domain/neighborhood-types';

function setup(building: boolean, town: Neighborhood = migrateNeighborhood(initialAlbum(initialWorld()))) {
  const townDispatch = vi.fn(), dispatch = vi.fn();
  const go = goTo({ town: () => town, selected: () => 'bia', building: () => building, townDispatch, dispatch });
  return { go, townDispatch, dispatch, town };
}

it('takes the selected character along to a room of the same house while playing', () => {
  const { go, townDispatch, dispatch, town } = setup(false);
  const home = town.buildings[0]!;
  go({ kind: 'interior', building: home.id, room: 'room-1' });
  expect(townDispatch).not.toHaveBeenCalled();
  expect(dispatch).toHaveBeenCalledWith({ type: 'travel', actor: 'bia', room: 'room-1' });
});

it('only changes the view while creating', () => {
  const { go, townDispatch, dispatch } = setup(true);
  go({ kind: 'street' });
  expect(townDispatch).toHaveBeenCalledWith({ type: 'visit', location: { kind: 'street' } });
  expect(dispatch).not.toHaveBeenCalled();
});

it('gathers the character into the current room and walks out to the street together', () => {
  const { go, townDispatch, dispatch, town } = setup(false);
  go({ kind: 'street' });
  expect(dispatch).toHaveBeenCalledWith({ type: 'travel', actor: 'bia', room: town.location.kind === 'interior' ? town.location.room : '' });
  expect(townDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'transport', actor: 'bia', location: { kind: 'street' } }));
});

it('opens another house first, then brings the character in, from the street', () => {
  const base = migrateNeighborhood(initialAlbum(initialWorld()));
  const { go, townDispatch, dispatch } = setup(false, { ...base, location: { kind: 'street' } });
  const target = { kind: 'interior' as const, building: base.buildings[0]!.id, room: base.buildings[0]!.entry };
  go(target);
  expect(townDispatch).toHaveBeenCalledWith({ type: 'visit', location: target });
  expect(dispatch).toHaveBeenCalledWith({ type: 'travel', actor: 'bia', room: target.room });
  go({ kind: 'street' });
  expect(townDispatch).toHaveBeenCalledTimes(1);
});
