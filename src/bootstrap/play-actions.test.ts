import { expect, it, vi } from 'vitest';
import { playActions } from './play-actions';
import { initialWorld } from '../domain/world';
import type { ActorId, World } from '../domain/types';

/** The living room with a mirror on the wall and `who` selected there. */
function setup(who: ActorId) {
  const base = initialWorld(), start = vi.fn();
  const state: World = { ...base, layout: { ...base.layout, pieces: [...base.layout.pieces.filter(p => p.room !== 'sala'), { id: 100, kind: 'mirror', room: 'sala', x: 380, y: 130, color: 'original', flipped: false }], nextId: 101 } };
  const deps = { root: { classList: { add: vi.fn() } } as unknown as HTMLElement, state: () => state, selected: () => who, choose: vi.fn(), light: vi.fn(), settle: vi.fn(),
    cancelGame: vi.fn(), walker: { cancel: vi.fn(), start } as never, dispatch: vi.fn(), toggleWardrobe: vi.fn(), refuse: vi.fn(), bench: vi.fn(), serve: vi.fn(),
    looks: vi.fn(), grimace: vi.fn(), instead: () => null };
  return { actions: playActions(deps), deps, start };
}

it('o espelho tocado abre os Looks para uma pessoa, mas não para um gato (gato não se veste; ele só vai até lá e ronrona)', () => {
  const bia = setup('bia');
  bia.actions.perform({ type: 'use', id: 100 });
  expect(bia.deps.looks).toHaveBeenCalledTimes(1);
  const mimi = setup('mimi');
  mimi.actions.perform({ type: 'use', id: 100 });
  expect(mimi.deps.looks).not.toHaveBeenCalled();
  expect(mimi.start).toHaveBeenCalledTimes(1);
});
