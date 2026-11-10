import { expect, it, vi } from 'vitest';
import { initialWorld } from '../domain/world';
import { createPlayGesture } from './play-gesture';
function setup(scale = 1) {
  const state = initialWorld(); const move = vi.fn(), walk = vi.fn(), pickup = vi.fn(), dispatch = vi.fn(), previewActor = vi.fn();
  const gesture = createPlayGesture(() => state, vi.fn(), move, {
    walk, pickup, dispatch, previewActor, preview: vi.fn(), wardrobe: () => false, toggleWardrobe: vi.fn(), screenScale: () => ({ x: scale, y: scale }),
  });
  return { gesture, move, walk, pickup, dispatch, previewActor };
}
it.each([.5, 1, 2])('uses eight screen pixels before dragging at scale %s', scale => {
  const s = setup(scale); s.gesture.start(1, { x: 520, y: 400 });
  s.gesture.update(1, { x: 520 + 7 / scale, y: 400 });
  expect(s.previewActor).not.toHaveBeenCalled();
  s.gesture.end(1, { x: 520 + 7 / scale, y: 400 }); expect(s.move).not.toHaveBeenCalled();
});
it('a background drag returning to its origin never walks', () => {
  const s = setup(); s.gesture.start(1, { x: 950, y: 530 });
  s.gesture.update(1, { x: 850, y: 530 }); s.gesture.end(1, { x: 950, y: 530 });
  expect(s.walk).not.toHaveBeenCalled();
});
it('clicking a loose object requests pickup without placing it', () => {
  const s = setup(); s.gesture.start(1, { x: 600, y: 402 }); s.gesture.end(1, { x: 600, y: 402 });
  expect(s.pickup).toHaveBeenCalledExactlyOnceWith('microfone'); expect(s.dispatch).not.toHaveBeenCalled();
});
it('cancelling a background gesture does not reset an independently walking actor', () => {
  const s = setup(); s.gesture.start(1, { x: 950, y: 530 }); s.gesture.cancel();
  expect(s.previewActor).not.toHaveBeenCalled();
});
function ballSetup() {
  const state = initialWorld(); state.layout.pieces = []; state.actors = state.actors.map(a => ({ ...a, room: 'quarto' }));
  state.items = [{ id: '1:bola', kind: 'bola', room: 'sala', x: 400, y: 530, holder: null, spot: 'floor' } as typeof state.items[number], ...state.items.filter(i => i.room !== 'sala')];
  let now = 0; const dispatch = vi.fn(), roll = vi.fn();
  const gesture = createPlayGesture(() => state, vi.fn(), vi.fn(), { dispatch, roll, clock: () => now, preview: vi.fn(), wardrobe: () => false, toggleWardrobe: vi.fn() });
  const drag = (to: number, ms: number) => { gesture.start(1, { x: 400, y: 502 }); for (let x = 420; x <= to; x += 20) { now += ms; gesture.update(1, { x, y: 502 }); } gesture.end(1, { x: to, y: 502 }); };
  return { dispatch, roll, drag };
}
it('a ball let go while the finger still moves rolls with its speed instead of being placed', () => {
  const s = ballSetup(); s.drag(600, 16);
  expect(s.dispatch.mock.calls).toEqual([]);
  const [id, point, velocity] = s.roll.mock.calls[0]!;
  expect(id).toBe('1:bola'); expect(point).toEqual({ x: 600, y: 530 }); expect(velocity.x).toBeCloseTo(20 / 16); expect(velocity.y).toBe(0);
});
it('a ball set down slowly is placed as before', () => {
  const s = ballSetup(); s.drag(600, 400);
  expect(s.roll).not.toHaveBeenCalled(); expect(s.dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'place', item: '1:bola', point: { x: 600, y: 530 } });
});
