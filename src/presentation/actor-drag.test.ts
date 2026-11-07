import { expect, it, vi } from 'vitest';
import { initialWorld } from '../domain/world';
import { createPlayGesture } from './play-gesture';
it('mantém o ponto de pega, faz prévia e só confirma um movimento ao soltar', () => {
  const state = initialWorld(); const move = vi.fn(); const previewActor = vi.fn();
  const play = { dispatch: vi.fn(), preview: vi.fn(), previewActor, wardrobe: () => false, toggleWardrobe: vi.fn() };
  const gesture = createPlayGesture(() => state, vi.fn(), move, play);
  gesture.start(1, { x: 520, y: 400 });
  gesture.update(1, { x: 560, y: 390 });
  expect(move).not.toHaveBeenCalled();
  expect(previewActor).toHaveBeenLastCalledWith('bia', { x: 560, y: 520 });
  gesture.end(1, { x: 560, y: 390 });
  expect(move).toHaveBeenCalledExactlyOnceWith({ x: 560, y: 520 });
});
it('cancelar um personagem restaura sua posição e ignora eventos tardios', () => {
  const state = initialWorld(); const move = vi.fn();
  const gesture = createPlayGesture(() => state, vi.fn(), move);
  gesture.start(1, { x: 520, y: 400 }); gesture.update(1, { x: 560, y: 390 }); gesture.cancel();
  gesture.end(1, { x: 600, y: 400 });
  expect(move).not.toHaveBeenCalled();
});
