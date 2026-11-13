import { expect, it } from 'vitest';
import { playTime, startTicks, type ClockPort } from './clock';

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
function manualClock() {
  let now = 5000, hidden = false;
  const port: ClockPort = { hidden: () => hidden, now: () => now, today: () => ({ y: 2026, m: 11, d: 12 }), every: () => () => {}, onVisible: () => () => {} };
  return { port, wait: (ms: number) => { now += ms; return now; }, hide: (value: boolean) => { hidden = value; } };
}
it('o tempo de Brincar chega ao live em passos de no máximo 60 s, com a fase do dia no começo de cada passo', () => {
  const clock = manualClock(), life = playTime(clock.port);
  const steps = Array.from({ length: 21 }, () => life.take(clock.wait(30_000)));
  expect(steps.every(s => s.elapsed === 30_000)).toBe(true);
  expect([steps[0]!.phase, steps[19]!.phase, steps[20]!.phase]).toEqual(['manha', 'tarde', 'entardecer']);
  expect(life.take(clock.wait(3 * 24 * 3600_000)).elapsed).toBe(60_000);
  expect(life.take(clock.port.now()).elapsed).toBe(0);
});
it('o tempo em Criar não conta: a vida pausa e volta de onde parou', () => {
  const clock = manualClock(), life = playTime(clock.port);
  clock.wait(20_000); life.mode(false);
  clock.wait(40_000); life.mode(true);
  expect(life.take(clock.wait(10_000))).toEqual({ elapsed: 30_000, phase: 'manha' });
  life.mode(false); life.mode(false);
  expect(life.take(clock.wait(30_000)).elapsed).toBe(0);
});
it('a fase mostrada (W3L-11) é a do tempo de Brincar já jogado: noite aos 12 min, e Criar não a avança', () => {
  const clock = manualClock(), life = playTime(clock.port);
  expect(life.phase()).toBe('manha');
  for (let n = 0; n < 24; n++) life.take(clock.wait(30_000));
  expect(life.phase()).toBe('noite');
  life.mode(false); life.take(clock.wait(10 * 60_000));
  expect(life.phase()).toBe('noite');
});
it('uma aba escondida não acumula vida a cada tick: uma hora fora conta 60 s na volta', () => {
  const clock = manualClock(), life = playTime(clock.port);
  clock.hide(true);
  const hidden = Array.from({ length: 120 }, () => life.take(clock.wait(30_000)).elapsed);
  expect(hidden.every(elapsed => elapsed === 0)).toBe(true);
  clock.hide(false);
  expect(life.take(clock.wait(1000))).toEqual({ elapsed: 60_000, phase: 'manha' });
});
it('dormir a noite (W3L-15) leva à manhã seguinte: a fase volta a manha e o dia segue dali', () => {
  const clock = manualClock(), life = playTime(clock.port);
  for (let n = 0; n < 24; n++) life.take(clock.wait(30_000));
  life.morning();
  // 2026-11-12 is a night of stars: the day lasts 19 min.
  expect([life.phase(), life.played()]).toEqual(['manha', 19 * 60_000]);
  expect(life.take(clock.wait(30_000))).toEqual({ elapsed: 30_000, phase: 'manha' });
});
