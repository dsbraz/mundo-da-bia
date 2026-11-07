import { expect, it, vi } from 'vitest';
import { houseInput } from './house-input';
import { initialWorld } from '../domain/world';
function setup() {
  const gesture = { start: vi.fn(() => true), update: vi.fn(), end: vi.fn(), cancel: vi.fn() };
  const dispatch = vi.fn(), pan = vi.fn();
  const canvas = { getBoundingClientRect: () => ({ width: 1000 }) } as HTMLCanvasElement;
  const input = houseInput(canvas, initialWorld, () => gesture, { building: () => false, wardrobe: () => false, dispatch, pan, transfer: vi.fn(), progress: vi.fn() });
  const p = (x: number, y = 100) => ({ x, y });
  return { input, gesture, dispatch, pan, p };
}
it.each([[700, 100], [520, 450], [150, 300]])('dois dedos sobre %s,%s cancelam a interação e navegam pelo centro', (x, y) => {
  const { input, gesture, dispatch, p } = setup();
  input.start(1, p(x, y), p(700)); input.start(2, p(x + 50, y), p(800));
  expect(gesture.cancel).toHaveBeenCalled();
  input.update(1, p(x - 300, y), p(400)); input.update(2, p(x - 250, y), p(500));
  input.end(1, p(x - 300, y), p(400)); input.end(2, p(x - 250, y), p(500));
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'room', room: 'quarto' });
  expect(gesture.end).not.toHaveBeenCalled();
});
it('fixa o arraste aos 12px e não aceita o segundo dedo', () => {
  const { input, gesture, dispatch, p } = setup();
  input.start(1, p(520, 450), p(520)); input.update(1, p(532, 450), p(532));
  input.start(2, p(600), p(600)); input.update(2, p(100), p(100)); input.end(2, p(100), p(100));
  input.end(1, p(540, 450), p(540)); expect(gesture.end).toHaveBeenCalledTimes(1); expect(dispatch).not.toHaveBeenCalled();
});
it('terceiro contato cancela e ignora os dedos restantes', () => {
  const { input, dispatch, p } = setup();
  input.start(1, p(700), p(700)); input.start(2, p(800), p(800));
  input.update(1, p(100), p(100)); input.start(3, p(400), p(400));
  for (const id of [1, 2, 3]) input.end(id, p(100), p(100));
  expect(dispatch).not.toHaveBeenCalled();
});
it('cancelamento do sistema permite um novo gesto após todos os contatos saírem', () => {
  const { input, dispatch, p } = setup();
  input.start(1, p(700), p(700)); input.start(2, p(800), p(800)); input.update(1, p(100), p(100)); input.cancel();
  input.end(1, p(100), p(100)); input.end(2, p(200), p(200)); expect(dispatch).not.toHaveBeenCalled();
  input.start(3, p(700), p(700)); input.start(4, p(800), p(800)); input.update(3, p(100), p(100));
  input.end(3, p(100), p(100)); input.end(4, p(800), p(800)); expect(dispatch).toHaveBeenCalledTimes(1);
});
it('perda de foco limpa contatos sem confirmar navegação', () => {
  const { input, dispatch, p } = setup();
  input.start(1, p(700), p(700)); input.start(2, p(800), p(800)); input.update(1, p(100), p(100)); input.reset!();
  input.start(3, p(700), p(700)); input.start(4, p(800), p(800)); input.update(3, p(100), p(100)); input.end(3, p(100), p(100));
  expect(dispatch).toHaveBeenCalledTimes(1);
});
