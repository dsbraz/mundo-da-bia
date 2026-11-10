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
it('does not replace a held object, including when the hand fills during walking', () => {
  const s = setup(); s.pickup(); s.world.items.find(i => i.id === 'ursinho')!.holder = 'bia'; s.arrive();
  expect(s.dispatch).not.toHaveBeenCalled(); expect(s.hint).toHaveBeenLastCalledWith('Mãos cheias! Larga um antes.');
  s.pickup(); expect(s.start).toHaveBeenCalledOnce(); expect(s.cancel).toHaveBeenCalledTimes(2);
});
it('uses the existing pickup action once it arrives', () => {
  const s = setup(); s.pickup(); s.arrive(); expect(s.dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'pick', actor: 'bia', item: 'microfone' });
});
it('a removed object cannot complete pickup', () => {
  const s = setup(); s.pickup(); s.world.items = []; s.arrive(); expect(s.dispatch).not.toHaveBeenCalled();
});
