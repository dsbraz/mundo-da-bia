import { expect, it, vi } from 'vitest';
import { landscapeOnly } from './landscape-only';

it('em pé o jogo fica inerte; ao deitar volta a responder, e o pedido de travar deitado falha em silêncio', async () => {
  let change = () => {};
  const media = { matches: true, addEventListener: (_: string, run: () => void) => { change = run; } };
  const lock = vi.fn(() => Promise.reject(new Error('not fullscreen')));
  vi.stubGlobal('screen', { orientation: { lock } });
  const game = { inert: false } as HTMLElement;
  landscapeOnly(game, media as never);
  expect(game.inert).toBe(true); expect(lock).toHaveBeenCalledWith('landscape');
  media.matches = false; change();
  expect(game.inert).toBe(false);
  await Promise.resolve();
  vi.unstubAllGlobals();
});
