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
  const s = setup(); s.gesture.start(1, { x: 900, y: 252 }); s.gesture.end(1, { x: 900, y: 252 });
  expect(s.pickup).toHaveBeenCalledExactlyOnceWith('microfone'); expect(s.dispatch).not.toHaveBeenCalled();
});
