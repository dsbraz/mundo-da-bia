import { expect, it, vi } from 'vitest';
import { initialWorld } from '../domain/world';
import { pickupItem } from './item-pickup';
function setup() {
  const world = initialWorld(); world.layout.pieces = [];
  const item = world.items.find(i => i.id === 'microfone')!; item.spot = 'floor'; item.x = 700; item.y = 520;
  let arrive = () => {}; const dispatch = vi.fn(), hint = vi.fn(), cancel = vi.fn();
  const start = vi.fn((_point, complete) => { arrive = complete; });
  const pickup = () => pickupItem('microfone', { state: () => world, selected: () => 'bia', dispatch, hint, walk: { start, cancel } });
  return { world, item, pickup, dispatch, hint, start, cancel, arrive: () => arrive() };
}
it('walks before picking up and rechecks the object on arrival', () => {
  const s = setup(); s.pickup(); expect(s.dispatch).not.toHaveBeenCalled(); expect(s.start).toHaveBeenCalledOnce();
  s.item.holder = 'luna'; s.arrive(); expect(s.dispatch).not.toHaveBeenCalled(); expect(s.hint).toHaveBeenCalled();
});
it('a full hand lets go by itself on arrival, without an order, including when it fills during walking', () => {
  const s = setup(); s.pickup(); s.world.items.find(i => i.id === 'ursinho')!.holder = 'bia'; s.arrive();
  expect(s.dispatch.mock.calls).toEqual([[{ type: 'drop', actor: 'bia' }], [{ type: 'pick', actor: 'bia', item: 'microfone' }]]);
  s.dispatch.mockClear(); s.pickup();
  expect(s.dispatch).not.toHaveBeenCalled(); expect(s.start).toHaveBeenCalledTimes(2); expect(s.cancel).toHaveBeenCalledTimes(2);
  s.arrive(); expect(s.dispatch.mock.calls).toEqual([[{ type: 'drop', actor: 'bia' }], [{ type: 'pick', actor: 'bia', item: 'microfone' }]]);
  expect(s.hint).not.toHaveBeenCalled();
});
it('keeps holding when the new pickup cannot happen', () => {
  const taken = setup(); taken.world.items.find(i => i.id === 'ursinho')!.holder = 'bia'; taken.item.holder = 'luna';
  taken.pickup(); expect(taken.dispatch).not.toHaveBeenCalled(); expect(taken.start).not.toHaveBeenCalled(); expect(taken.hint).toHaveBeenCalled();
  const moved = setup(); moved.world.items.find(i => i.id === 'ursinho')!.holder = 'bia';
  moved.pickup(); moved.item.x = 300; moved.arrive(); expect(moved.dispatch).not.toHaveBeenCalled(); expect(moved.hint).toHaveBeenCalled();
  const own = setup(); own.item.holder = 'bia';
  own.pickup(); expect(own.dispatch).not.toHaveBeenCalled(); expect(own.start).not.toHaveBeenCalled(); expect(own.hint).not.toHaveBeenCalled();
});
it('uses the existing pickup action once it arrives', () => {
  const s = setup(); s.pickup(); s.arrive(); expect(s.dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'pick', actor: 'bia', item: 'microfone' });
});
it('a removed object cannot complete pickup', () => {
  const s = setup(); s.pickup(); s.world.items = []; s.arrive(); expect(s.dispatch).not.toHaveBeenCalled();
});
