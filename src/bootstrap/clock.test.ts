import { expect, it } from 'vitest';
import { startTicks, type ClockPort } from './clock';

function fakeClock() {
  let now = 1000, timer: (() => void) | null = null, visible: (() => void) | null = null, period = 0;
  const port: ClockPort = { now: () => now, today: () => ({ y: 2026, m: 11, d: 10 }),
    every: (ms, fn) => { period = ms; timer = fn; return () => { timer = null; }; },
    onVisible: fn => { visible = fn; return () => { visible = null; }; } };
  return { port, advance: (ms: number) => { now += ms; timer?.(); }, show: () => visible?.(), period: () => period, armed: () => !!timer || !!visible };
}
it('despacha um tick com a hora a cada 30 s e ao voltar a aba, e para', () => {
  const clock = fakeClock(), ticks: number[] = [];
  const stop = startTicks(clock.port, now => ticks.push(now));
  expect(clock.period()).toBe(30_000);
  clock.advance(30_000); clock.show();
  expect(ticks).toEqual([31_000, 31_000]);
  stop(); expect(clock.armed()).toBe(false);
});
