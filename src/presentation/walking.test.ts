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
it('only commits the confirmed endpoint and replaces unfinished routes', () => {
  const s = setup(); s.walk.start({ x: 800, y: 530 }); s.advance(); expect(s.commit).not.toHaveBeenCalled();
  s.walk.start({ x: 600, y: 530 }); for (let n = 0; n < 30; n++) s.advance();
  expect(s.commit).toHaveBeenCalledExactlyOnceWith('bia', { x: 600, y: 530 });
});
it('cancel and inaccessible destinations never persist intermediate positions', () => {
  const s = setup(); s.walk.start({ x: 900, y: 530 }); s.advance(); s.walk.cancel();
  for (let n = 0; n < 50; n++) s.advance(); expect(s.commit).not.toHaveBeenCalled();
  s.walk.start({ x: 500, y: 20 }); expect(s.hint).toHaveBeenCalled(); expect(s.commit).not.toHaveBeenCalled();
});
it('reduced motion confirms immediately and equipment completes once', () => {
  const s = setup(), complete = vi.fn(); vi.stubGlobal('matchMedia', () => ({ matches: true }));
  s.walk.start({ x: 600, y: 500 }, complete); expect(s.commit).toHaveBeenCalledOnce(); expect(complete).toHaveBeenCalledOnce();
});
