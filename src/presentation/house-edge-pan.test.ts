import { afterEach, expect, it, vi } from 'vitest';
import { houseEdgePan } from './house-edge-pan';
afterEach(() => vi.useRealTimers());
it('perto da lateral da cena (medida na própria cena, não na janela) desliza a vista e redesenha no mesmo ponto; longe ou nulo para', () => {
  vi.useFakeTimers();
  const root = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 800, height: 600 }) } as HTMLElement, pan = vi.fn(), preview = vi.fn();
  const edge = houseEdgePan(root, pan, preview);
  edge({ clientX: 870, clientY: 300 }); vi.advanceTimersByTime(48);
  expect(pan).toHaveBeenCalledTimes(3); expect(pan).toHaveBeenLastCalledWith(8); expect(preview).toHaveBeenLastCalledWith({ clientX: 870, clientY: 300 });
  edge({ clientX: 130, clientY: 300 }); vi.advanceTimersByTime(16); expect(pan).toHaveBeenLastCalledWith(-8);
  edge({ clientX: 500, clientY: 300 }); vi.advanceTimersByTime(100); expect(pan).toHaveBeenCalledTimes(4);
  edge({ clientX: 870, clientY: 700 }); vi.advanceTimersByTime(100); expect(pan).toHaveBeenCalledTimes(4);
  edge({ clientX: 870, clientY: 300 }); edge(null); vi.advanceTimersByTime(100); expect(pan).toHaveBeenCalledTimes(4);
});
