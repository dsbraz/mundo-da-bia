import { afterEach, expect, it, vi } from 'vitest';
import { walking } from './walking';
import { gaitSpeed } from './gait';
import { initialWorld } from '../domain/world';
function setup() {
  let now = 0; const frames = new Map<number, FrameRequestCallback>(); let serial = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++serial, callback); return serial; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const state = initialWorld(); state.layout.pieces = [];
  const commit = vi.fn(), preview = vi.fn(), hint = vi.fn(), face = vi.fn();
  const walk = walking({ state: () => state, selected: () => 'bia', commit, preview, hint, face });
  function advance() { now += 50; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(now)); }
  return { state, commit, preview, hint, face, walk, advance };
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
  s.state.actors[0]!.room = 'quarto';
  s.walk.start({ x: 500, y: 520 }); expect(s.hint).toHaveBeenCalled(); expect(s.commit).toHaveBeenCalledOnce();
});
it('a tap on the wall walks to the baseboard and looks at the tapped point', () => {
  const s = setup(); vi.stubGlobal('matchMedia', () => ({ matches: true }));
  s.walk.start({ x: 500, y: 20 });
  expect(s.commit).toHaveBeenCalledExactlyOnceWith('bia', { x: 500, y: 410 }); expect(s.hint).not.toHaveBeenCalled();
  expect(s.face).toHaveBeenCalledWith('bia', { x: 500, y: 20 });
});
it('a tap right against furniture walks to its side instead of refusing', () => {
  const s = setup(); vi.stubGlobal('matchMedia', () => ({ matches: true }));
  s.state.layout.pieces = [{ id: 1, kind: 'table', room: 'sala', x: 250, y: 350, flipped: false, color: 'original' }];
  s.walk.start({ x: 350, y: 450 });
  expect(s.hint).not.toHaveBeenCalled(); expect(s.commit).toHaveBeenCalledOnce();
  const stop = s.commit.mock.calls[0]![1];
  expect(Math.abs(stop.x - 350)).toBeLessThanOrEqual(150); expect(stop).not.toEqual({ x: 350, y: 450 });
  expect(s.face).toHaveBeenCalledWith('bia', { x: 350, y: 450 });
});
it('reduced motion confirms immediately and equipment completes once', () => {
  const s = setup(), complete = vi.fn(); vi.stubGlobal('matchMedia', () => ({ matches: true }));
  s.walk.start({ x: 600, y: 500 }, complete); expect(s.commit).toHaveBeenCalledOnce(); expect(complete).toHaveBeenCalledOnce();
});

it('an invalid replacement stops the previous command without completing its action', () => {
  const s = setup(), complete = vi.fn();
  s.walk.start({ x: 900, y: 530 }, complete); s.advance();
  s.state.actors[0]!.room = 'quarto'; s.walk.start({ x: 500, y: 20 });
  for (let n = 0; n < 50; n++) s.advance();
  expect(s.commit).toHaveBeenCalledOnce(); expect(complete).not.toHaveBeenCalled();
});
it('completes an interaction at the current position without an endless walk', () => {
  const s = setup(), complete = vi.fn(), actor = s.state.actors[0]!;
  s.walk.start({ x: actor.x, y: actor.y }, complete); s.advance();
  expect(complete).toHaveBeenCalledOnce(); expect(s.commit).toHaveBeenCalledOnce();
});
it('um novo destino durante a caminhada preserva a velocidade já adquirida', () => {
  const s = setup(); s.walk.start({ x: 900, y: 530 });
  for (let n = 0; n < 5; n++) s.advance();
  const before = s.preview.mock.calls.at(-1)![1];
  s.walk.start({ x: 850, y: 530 }); s.advance();
  const after = s.preview.mock.calls.at(-1)![1];
  // Full speed carries over (a restart from rest would cover only 3 px in this 50 ms frame).
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeCloseTo(gaitSpeed(1, false).top * 50);
});
it('on the street the walk is scaled like the figure: 0.6 of the indoor speed', () => {
  const s = setup(); s.state.streetWidth = 3000;
  s.walk.start({ x: 950, y: 530 });
  for (let n = 0; n < 12; n++) s.advance();
  const [a, b] = s.preview.mock.calls.slice(-2).map(call => call[1]);
  expect(b.x - a.x).toBeCloseTo(gaitSpeed(.6, false).top * 50);
});
