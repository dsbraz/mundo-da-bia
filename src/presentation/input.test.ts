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
    dataset: { viewWidth: '1000', viewX: '0', viewY: '0', cameraX: '0' },
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

it('cancelar arraste de objeto não altera a brincadeira; ponteiro secundário não pode soltá-lo', () => {
  const state = initialWorld();
  const canvas = Object.assign(new EventTarget(), {
    dataset: { viewWidth: '1000', viewX: '0', viewY: '0', cameraX: '0' },
    setPointerCapture: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }),
  });
  vi.stubGlobal('window', new EventTarget());
  const dispatch = vi.fn(); const preview = vi.fn();
  bindInput(canvas as unknown as HTMLCanvasElement, () => state, vi.fn(), vi.fn(), {
    dispatch, preview, wardrobe: () => false, toggleWardrobe: vi.fn(),
  });
  const send = (type: string, x: number, y: number, pointerId = 1) => canvas.dispatchEvent(Object.assign(new Event(type), { pointerId, clientX: x, clientY: y }));
  send('pointerdown', 600, 402);
  send('pointermove', 160, 350);
  send('pointerup', 160, 350, 2);
  expect(dispatch).not.toHaveBeenCalled();
  expect(preview).toHaveBeenLastCalledWith({ kind: 'item', id: 'microfone', point: { x: 160, y: 350 } });
  send('pointercancel', 160, 350);
  send('pointerup', 160, 350);
  expect(dispatch).not.toHaveBeenCalled();
  expect(preview).toHaveBeenLastCalledWith(null);
});

it('trocar de cômodo durante arraste descarta a entrega e limpa a prévia', () => {
  const state = initialWorld();
  const canvas = Object.assign(new EventTarget(), {
    dataset: { viewWidth: '1000', viewX: '0', viewY: '0', cameraX: '0' },
    setPointerCapture: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }),
  });
  vi.stubGlobal('window', new EventTarget());
  const dispatch = vi.fn(); const preview = vi.fn();
  bindInput(canvas as unknown as HTMLCanvasElement, () => state, vi.fn(), vi.fn(), {
    dispatch, preview, wardrobe: () => false, toggleWardrobe: vi.fn(),
  });
  canvas.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerId: 1, clientX: 600, clientY: 402 }));
  state.room = 'quarto';
  canvas.dispatchEvent(Object.assign(new Event('pointerup'), { pointerId: 1, clientX: 160, clientY: 350 }));
  expect(dispatch).not.toHaveBeenCalled();
  expect(preview).toHaveBeenLastCalledWith(null);
});
it('soltar a personagem além da borda da cena a leva até a borda; em Criar, soltar fora devolve a peça', () => {
  // A room as wide as the scene (1000), so its border is the scene's.
  const state = initialWorld(); state.layout.rooms.sala.size = 'small';
  const parent = { closest: () => null, getBoundingClientRect: () => ({ left: 0, top: 0, right: 1000, bottom: 600, width: 1000, height: 600 }) };
  const canvas = Object.assign(new EventTarget(), {
    dataset: { viewWidth: '1000', viewX: '0', viewY: '0', cameraX: '0' }, parentElement: parent,
    setPointerCapture: vi.fn(), getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }),
  });
  vi.stubGlobal('window', new EventTarget());
  const move = vi.fn(), building = { value: false }, build = { start: vi.fn(() => true), update: vi.fn(), end: vi.fn(), cancel: vi.fn() };
  bindInput(canvas as unknown as HTMLCanvasElement, () => state, vi.fn(), move, { dispatch: vi.fn(), preview: vi.fn(), wardrobe: () => false, toggleWardrobe: vi.fn() },
    { enabled: () => building.value, gesture: build });
  const send = (type: string, x: number, y: number) => canvas.dispatchEvent(Object.assign(new Event(type), { pointerId: 1, clientX: x, clientY: y }));
  send('pointerdown', 520, 440); send('pointermove', 900, 440); send('pointerup', 1040, 440);
  expect(move).toHaveBeenCalledExactlyOnceWith({ x: 940, y: 530 });
  building.value = true;
  send('pointerdown', 300, 300); send('pointermove', 400, 300); send('pointerup', 1040, 300);
  expect(build.cancel).toHaveBeenCalled(); expect(build.end).toHaveBeenCalledWith(1, { x: 999, y: 300 });
});
