import { expect, it, vi } from 'vitest';
import { initialWorld } from '../domain/world';
import { createBuildGesture } from './build-gesture';

it('arrasta mantendo o ponto de pega, confirma uma vez e não grava prévias', () => {
  const state = initialWorld(); const select = vi.fn(); const preview = vi.fn(); const commit = vi.fn();
  const gesture = createBuildGesture(() => state, select, preview, commit);
  const sofa = state.layout.pieces.find(p => p.kind === 'sofa')!;
  expect(gesture.start(1, { x: 200, y: 310 })).toBe(true);
  expect(select).toHaveBeenCalledWith(sofa.id);
  gesture.update(1, { x: 300, y: 350 });
  expect(preview).toHaveBeenLastCalledWith({ type: 'move', id: sofa.id, point: { x: 160, y: 310 } });
  expect(commit).not.toHaveBeenCalled();
  gesture.end(1, { x: 300, y: 350 });
  expect(commit).toHaveBeenCalledExactlyOnceWith({ type: 'move', id: sofa.id, point: { x: 160, y: 310 } });
});
it('cancelar, trocar cômodo e segundo ponteiro não confirmam movimento', () => {
  const state = initialWorld(); const commit = vi.fn(); const preview = vi.fn();
  const gesture = createBuildGesture(() => state, vi.fn(), preview, commit);
  gesture.start(1, { x: 200, y: 310 });
  expect(gesture.start(2, { x: 200, y: 310 })).toBe(false);
  gesture.end(2, { x: 300, y: 350 });
  gesture.cancel(); gesture.end(1, { x: 300, y: 350 });
  expect(commit).not.toHaveBeenCalled();
  gesture.start(1, { x: 200, y: 310 }); state.room = 'quarto';
  gesture.end(1, { x: 300, y: 350 });
  expect(commit).not.toHaveBeenCalled();
  expect(preview).toHaveBeenLastCalledWith(null);
});
