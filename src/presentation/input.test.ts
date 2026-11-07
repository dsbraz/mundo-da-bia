import { afterEach, expect, it, vi } from 'vitest';
import { initialWorld } from '../domain/world';
import { bindInput } from './input';

afterEach(() => vi.unstubAllGlobals());

it.each([
  { biaY: 430, lunaY: 410, reverse: false, selected: 'bia' },
  { biaY: 410, lunaY: 430, reverse: false, selected: 'luna' },
  { biaY: 430, lunaY: 430, reverse: false, selected: 'luna' },
  { biaY: 430, lunaY: 430, reverse: true, selected: 'bia' },
])('seleciona quem aparece na frente na sobreposição: $selected ($biaY, $lunaY, $reverse)', ({ biaY, lunaY, reverse, selected }) => {
  const state = initialWorld();
  state.actors.forEach(actor => {
    actor.x = actor.id === 'bia' || actor.id === 'luna' ? 300 : 800;
    actor.y = actor.id === 'bia' ? biaY : lunaY;
    actor.room = 'sala';
  });
  if (reverse) state.actors.reverse();
  const before = structuredClone(state);
  const canvas = Object.assign(new EventTarget(), {
    setPointerCapture: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }),
  });
  vi.stubGlobal('window', new EventTarget());
  const select = vi.fn();
  const move = vi.fn();
  bindInput(canvas as unknown as HTMLCanvasElement, () => state, select, move);
  canvas.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerId: 1, clientX: 300, clientY: 380 }));
  expect(select).toHaveBeenCalledExactlyOnceWith(selected);
  expect(move).not.toHaveBeenCalled();
  expect(state).toEqual(before);
});
