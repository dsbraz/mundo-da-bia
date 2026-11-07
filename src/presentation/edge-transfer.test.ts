import { it, expect, vi } from 'vitest';
import { edgeTransfer } from './edge-transfer';
it('espera 500ms na borda, confirma só ao soltar, limita uma travessia', () => {
  vi.useFakeTimers(); const commit = vi.fn(), preview = vi.fn(), neighbor = vi.fn(() => 'quarto' as const);
  const drag = edgeTransfer({ width: () => 1000, neighbor, preview, commit, progress: vi.fn() });
  drag.update({ x: 960, y: 400 }); vi.advanceTimersByTime(499); expect(drag.crossed()).toBe(false);
  vi.advanceTimersByTime(1); expect(drag.crossed()).toBe(true); expect(commit).not.toHaveBeenCalled();
  drag.update({ x: 10, y: 450 }); vi.advanceTimersByTime(1000); expect(neighbor).toHaveBeenCalledTimes(1);
  expect(drag.end({ x: 120, y: 500 })).toBe(true); expect(commit).toHaveBeenCalledExactlyOnceWith('quarto', { x: 120, y: 500 });
  expect(drag.end({ x: 120, y: 500 })).toBe(false); vi.useRealTimers();
});
it('sair da borda reinicia a espera; cancelar não confirma', () => {
  vi.useFakeTimers(); const commit = vi.fn();
  const drag = edgeTransfer({ width: () => 1000, neighbor: () => 'quarto', preview: vi.fn(), commit, progress: vi.fn() });
  drag.update({ x: 960, y: 400 }); vi.advanceTimersByTime(400); drag.update({ x: 500, y: 400 });
  drag.update({ x: 960, y: 400 }); vi.advanceTimersByTime(400); expect(drag.crossed()).toBe(false);
  vi.advanceTimersByTime(100); drag.cancel(); drag.end({ x: 100, y: 500 }); expect(commit).not.toHaveBeenCalled(); vi.useRealTimers();
});
