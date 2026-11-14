import { expect, it, vi } from 'vitest';
import { initialWorld } from '../domain/world';
import type { ActorId } from '../domain/types';
import { createPlayGesture } from './play-gesture';
function setup(selected: ActorId) {
  const state = initialWorld(); state.actors = state.actors.map(a => a.id === 'luna' ? { ...a, x: 300, y: 530, seat: null } : { ...a, x: 900, y: 530, seat: null });
  const select = vi.fn(), move = vi.fn(), poke = vi.fn(), cancelWalk = vi.fn(), dispatch = vi.fn(), previewActor = vi.fn();
  const gesture = createPlayGesture(() => state, select, move, {
    poke, cancelWalk, dispatch, selected: () => selected, preview: vi.fn(), previewActor, wardrobe: () => false, toggleWardrobe: vi.fn(),
  });
  return { gesture, select, move, poke, cancelWalk, dispatch, previewActor };
}
const body = { x: 300, y: 450 };
it('o primeiro toque seleciona e não reage', () => {
  const s = setup('bia'); s.gesture.start(1, body); s.gesture.end(1, body);
  expect(s.select).toHaveBeenCalledWith('luna'); expect(s.poke).not.toHaveBeenCalled();
});
it('o segundo toque, sem arraste, reage sem selecionar de novo nem interromper a caminhada', () => {
  const s = setup('luna'); s.gesture.start(1, body); s.gesture.end(1, body);
  expect(s.poke).toHaveBeenCalledExactlyOnceWith('luna');
  expect(s.select).not.toHaveBeenCalled(); expect(s.cancelWalk).not.toHaveBeenCalled();
  expect(s.dispatch).not.toHaveBeenCalled(); expect(s.move).not.toHaveBeenCalled();
  expect(s.previewActor).not.toHaveBeenCalled();
});
it('arrastar o já selecionado só interrompe a caminhada quando o arraste começa e não reage', () => {
  const s = setup('luna'); s.gesture.start(1, body);
  s.gesture.update(1, { x: 303, y: 450 }); expect(s.cancelWalk).not.toHaveBeenCalled();
  s.gesture.update(1, { x: 360, y: 450 }); s.gesture.update(1, { x: 380, y: 450 });
  expect(s.cancelWalk).toHaveBeenCalledOnce(); expect(s.select).toHaveBeenCalledOnce();
  s.gesture.end(1, { x: 380, y: 450 });
  expect(s.poke).not.toHaveBeenCalled(); expect(s.move).toHaveBeenCalled();
});
it('tocar em quem está sentado no vaso dá a descarga (escolhida ou não), em vez de reagir', () => {
  for (const selected of ['luna', 'bia'] as const) {
    const state = initialWorld(), dispatch = vi.fn(), poke = vi.fn();
    state.layout = { ...state.layout, pieces: [...state.layout.pieces, { id: 40, kind: 'toilet', room: 'sala', x: 250, y: 310, color: 'original', flipped: false }], nextId: 41 };
    state.actors = state.actors.map(a => a.id === 'luna' ? { ...a, x: 305, y: 428, seat: '40.0' } : { ...a, x: 900, y: 530, seat: null });
    const gesture = createPlayGesture(() => state, vi.fn(), vi.fn(), { poke, dispatch, selected: () => selected, preview: vi.fn(), wardrobe: () => false, toggleWardrobe: vi.fn() });
    gesture.start(1, { x: 305, y: 370 }); gesture.end(1, { x: 305, y: 370 });
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'use', id: 40 }); expect(poke).not.toHaveBeenCalled();
  }
});
