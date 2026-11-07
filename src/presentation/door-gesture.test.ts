import { expect, it, vi } from 'vitest';
import { initialWorld } from '../domain/world';
import { doorAt } from './door-controls';
import { createPlayGesture } from './play-gesture';
it('atravessa só ao soltar o personagem, nunca no cancelamento ou arraste de roupa', () => {
  const state = initialWorld(); const cross = vi.fn(); const move = vi.fn();
  const play = { cross, dispatch: vi.fn(), preview: vi.fn(), wardrobe: () => true, toggleWardrobe: vi.fn() };
  const gesture = createPlayGesture(() => state, vi.fn(), move, play);
  gesture.start(1, { x: 520, y: 400 }); gesture.update(1, { x: 960, y: 370 });
  expect(cross).not.toHaveBeenCalled(); gesture.cancel(); gesture.end(1, { x: 960, y: 370 });
  expect(cross).not.toHaveBeenCalled();
  gesture.start(2, { x: 335, y: 200 }); gesture.end(2, { x: 960, y: 370 });
  expect(cross).not.toHaveBeenCalled();
  gesture.start(3, { x: 520, y: 400 }); gesture.end(3, { x: 960, y: 370 });
  expect(cross).toHaveBeenCalledExactlyOnceWith('bia', 'right'); expect(move).not.toHaveBeenCalled();
});
it('ignora extremos sem porta e solturas fora da tela', () => {
  const state = initialWorld();
  for (const point of [{ x: 30, y: 370 }, { x: 960, y: 200 }, { x: 960, y: 500 }, { x: 500, y: 370 }, { x: 1200, y: 370 }]) expect(doorAt(state, point)).toBeUndefined();
});
