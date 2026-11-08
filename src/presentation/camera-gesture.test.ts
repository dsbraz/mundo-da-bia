import { expect, it, vi } from 'vitest';
import { cameraGesture } from './camera-gesture';
const p = { x: 100, y: 100 };
function setup(background = true) {
  const base = { start: vi.fn(() => true), update: vi.fn(), end: vi.fn(), cancel: vi.fn() }, pan = vi.fn();
  return { base, pan, gesture: cameraGesture(base, () => background, pan) };
}
it('um dedo no fundo explora sem emitir clique ao soltar, mesmo retornando ao início', () => {
  const { gesture, base, pan } = setup(); gesture.start(1, p, p);
  gesture.update(1, p, { x: 108, y: 100 }); gesture.update(1, p, p); gesture.end(1, p, p);
  expect(pan).toHaveBeenCalledTimes(2); expect(base.cancel).toHaveBeenCalledOnce(); expect(base.end).not.toHaveBeenCalled();
});
it('toque curto continua clique e personagem mantém seu gesto', () => {
  const { gesture, base, pan } = setup(false); gesture.start(1, p, p); gesture.update(1, p, { x: 200, y: 100 }); gesture.end(1, p, p);
  expect(base.update).toHaveBeenCalledOnce(); expect(base.end).toHaveBeenCalledOnce(); expect(pan).not.toHaveBeenCalled();
  const bg = setup(); bg.gesture.start(1, p, p); bg.gesture.update(1, p, { x: 107, y: 100 }); bg.gesture.end(1, p, p); expect(bg.base.end).toHaveBeenCalledOnce();
});
it('segundo dedo não rouba a ação; cancelamento limpa todos os contatos', () => {
  const { gesture, base } = setup(); gesture.start(1, p, p); expect(gesture.start(2, p, p)).toBe(false);
  gesture.update(2, p, p); gesture.end(1, p, p); expect(gesture.start(3, p, p)).toBe(false);
  gesture.end(2, p, p); gesture.reset(); expect(gesture.start(4, p, p)).toBe(true);
  expect(base.start).toHaveBeenCalledTimes(2);
});
it('cancelar limpa também os contatos do roteador interno antes do próximo arraste', () => {
  const base = { start: vi.fn(() => true), update: vi.fn(), end: vi.fn(), cancel: vi.fn(), reset: vi.fn() };
  const gesture = cameraGesture(base, () => false, vi.fn());
  gesture.start(1, p, p); gesture.reset();
  expect(base.reset).toHaveBeenCalledOnce();
});
it('perder a captura do segundo dedo não cancela o primeiro', () => {
  const { gesture, base } = setup(false);
  gesture.start(1, p, p); gesture.start(2, p, p); gesture.end(2, p, p);
  expect(gesture.cancelPointer(2)).toBe(false);
  gesture.update(1, p, { x: 150, y: 100 }); gesture.end(1, p, p);
  expect(base.end).toHaveBeenCalledOnce(); expect(base.cancel).not.toHaveBeenCalled();
});
