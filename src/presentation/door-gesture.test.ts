import { expect, it, vi } from 'vitest';
import { initialWorld } from '../domain/world';
import { doorAt } from './door-controls';
import { createPlayGesture } from './play-gesture';
it('soltar o personagem na lateral do cômodo não troca de cômodo: ele fica encostado na parede', () => {
  const state = initialWorld(); const dispatch = vi.fn(); const move = vi.fn();
  const play = { dispatch, preview: vi.fn(), wardrobe: () => true, toggleWardrobe: vi.fn() };
  const gesture = createPlayGesture(() => state, vi.fn(), move, play);
  gesture.start(3, { x: 520, y: 400 }); gesture.end(3, { x: 990, y: 370 });
  expect(dispatch).not.toHaveBeenCalled(); expect(move).toHaveBeenCalledExactlyOnceWith({ x: 940, y: 500 });
});
it('ignora extremos sem porta e solturas fora da tela', () => {
  const state = initialWorld();
  for (const point of [{ x: 30, y: 370 }, { x: 960, y: 200 }, { x: 960, y: 500 }, { x: 500, y: 370 }, { x: 1200, y: 370 }]) expect(doorAt(state, point)).toBeUndefined();
});
