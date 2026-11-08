import { expect, it, vi } from 'vitest';
import { neighborhoodGesture } from './neighborhood-gesture';
import { migrateNeighborhood, localWorld, neighborhoodAction } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
it('only a completed actor drag uses outdoor equipment', () => {
  let town = migrateNeighborhood(initialAlbum(initialWorld()));
  town = neighborhoodAction(town, { type: 'transport', actor: 'bia', location: { kind: 'street' }, point: { x: 300, y: 510 } });
  const drop = vi.fn(() => true), base = { start: () => true, update: vi.fn(), end: vi.fn(), cancel: vi.fn() };
  const gesture = neighborhoodGesture(base, { town: () => town, world: () => localWorld(town), building: () => false, dispatch: vi.fn(), plot: vi.fn(), preview: vi.fn(), progress: vi.fn(), drop });
  gesture.start(1, { x: 300, y: 420 }); gesture.update(1, { x: 180, y: 445 }); gesture.cancel(); expect(drop).not.toHaveBeenCalled();
  gesture.start(2, { x: 300, y: 420 }); gesture.end(2, { x: 180, y: 445 });
  expect(drop).toHaveBeenCalledExactlyOnceWith('bia', { x: 180, y: 445 }); expect(base.end).not.toHaveBeenCalled();
});
