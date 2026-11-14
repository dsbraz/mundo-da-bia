import { expect, it, vi } from 'vitest';
import { initialWorld } from '../domain/world';
import { createPlayGesture } from './play-gesture';
it('soltar o personagem na lateral do cômodo não troca de cômodo: ele fica encostado na parede', () => {
  const state = initialWorld(); const dispatch = vi.fn(); const move = vi.fn();
  const play = { dispatch, preview: vi.fn(), wardrobe: () => true, toggleWardrobe: vi.fn() };
  const gesture = createPlayGesture(() => state, vi.fn(), move, play);
  gesture.start(3, { x: 520, y: 400 }); gesture.end(3, { x: 1190, y: 370 });
  expect(dispatch).not.toHaveBeenCalled(); expect(move).toHaveBeenCalledExactlyOnceWith({ x: 1140, y: 500 });
});
