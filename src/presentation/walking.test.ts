import { afterEach, expect, it, vi } from 'vitest';
import { walking } from './walking';
import { initialWorld } from '../domain/world';
function setup() {
  let now = 0; const frames = new Map<number, FrameRequestCallback>(); let serial = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++serial, callback); return serial; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const state = initialWorld(); state.layout.pieces = [];
  const commit = vi.fn(), preview = vi.fn(), hint = vi.fn();
  const walk = walking({ state: () => state, selected: () => 'bia', commit, preview, hint });
  function advance() { now += 50; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(now)); }
  return { state, commit, preview, hint, walk, advance };
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('confirms the visible stop once before replacing unfinished routes', () => {
  const s = setup(); s.walk.start({ x: 800, y: 530 }); s.advance(); expect(s.commit).not.toHaveBeenCalled();
  s.walk.start({ x: 600, y: 530 }); for (let n = 0; n < 30; n++) s.advance();
  expect(s.commit).toHaveBeenCalledTimes(2); expect(s.commit).toHaveBeenLastCalledWith('bia', { x: 600, y: 530 });
});
it('cancel confirms the visible position once; inaccessible destinations do not move', () => {
  const s = setup(); s.walk.start({ x: 900, y: 530 }); s.advance(); s.walk.cancel();
  const visible = [...s.preview.mock.calls].reverse().find(call => call[0] === 'bia')![1];
  for (let n = 0; n < 50; n++) s.advance(); expect(s.commit).toHaveBeenCalledExactlyOnceWith('bia', visible);
  s.walk.start({ x: 500, y: 20 }); expect(s.hint).toHaveBeenCalled(); expect(s.commit).toHaveBeenCalledOnce();
});
it('reduced motion confirms immediately and equipment completes once', () => {
  const s = setup(), complete = vi.fn(); vi.stubGlobal('matchMedia', () => ({ matches: true }));
  s.walk.start({ x: 600, y: 500 }, complete); expect(s.commit).toHaveBeenCalledOnce(); expect(complete).toHaveBeenCalledOnce();
});

it('an invalid replacement stops the previous command without completing its action', () => {
  const s = setup(), complete = vi.fn();
  s.walk.start({ x: 900, y: 530 }, complete); s.advance();
  s.walk.start({ x: 500, y: 20 });
  for (let n = 0; n < 50; n++) s.advance();
  expect(s.commit).toHaveBeenCalledOnce(); expect(complete).not.toHaveBeenCalled();
});
it('completes an interaction at the current position without an endless walk', () => {
  const s = setup(), complete = vi.fn(), actor = s.state.actors[0]!;
  s.walk.start({ x: actor.x, y: actor.y }, complete); s.advance();
  expect(complete).toHaveBeenCalledOnce(); expect(s.commit).toHaveBeenCalledOnce();
});
