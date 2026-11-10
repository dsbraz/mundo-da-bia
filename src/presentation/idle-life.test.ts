import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import type { World } from '../domain/types';
import { breath, catTail, curledTail, earTwitch, favoriteSpot, glancing, idleClock, idleMs, phaseOf, stretch, wanderAt, wanderStay } from './idle-life';
import { floorTop } from './floor-band';
import { strollSpeed } from './stroll';

const span = (f: (t: number) => number, until = 30000) => { let lo = Infinity, hi = -Infinity; for (let t = 0; t < until; t += 25) { const v = f(t); lo = Math.min(lo, v); hi = Math.max(hi, v); } return { lo, hi }; };
it('cada personagem tem sua própria fase, estável entre recargas', () => {
  const phases = (['bia', 'luna', 'leo', 'rui', 'mimi', 'nino', 'pipoca'] as const).map(phaseOf);
  expect(new Set(phases).size).toBe(7); expect(phaseOf('bia')).toBe(phases[0]);
  phases.forEach(p => { expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThan(Math.PI * 2); });
});
it('respira com scaleY de ±1,2%', () => {
  const { lo, hi } = span(t => breath(t, 1, false));
  expect(hi).toBeCloseTo(.012, 3); expect(lo).toBeCloseTo(-.012, 3);
});
it('olha para alguém a cada 6 a 10 s, por um instante', () => {
  for (const id of ['bia', 'luna', 'mimi'] as const) {
    const starts: number[] = [];
    for (let t = 0, was = glancing(0, phaseOf(id), false); t < 60000; t += 50) { const now = glancing(t, phaseOf(id), false); if (now && !was) starts.push(t); was = now; }
    expect(starts.length).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < starts.length; i++) { expect(starts[i]! - starts[i - 1]!).toBeGreaterThanOrEqual(6000); expect(starts[i]! - starts[i - 1]!).toBeLessThanOrEqual(10050); }
  }
});
it('o gato balança a cauda até 0,25 rad, mexe as orelhas de vez em quando e se espreguiça até 10%', () => {
  const tail = span(t => catTail(t, 2, false, false));
  expect(tail.hi).toBeCloseTo(.25, 2); expect(tail.lo).toBeCloseTo(-.25, 2);
  const ears = span(t => earTwitch(t, 2, false));
  expect(ears.hi).toBeGreaterThan(.05); expect(ears.lo).toBe(0);
  let twitching = 0; for (let t = 0; t < 30000; t += 25) if (earTwitch(t, 2, false)) twitching++;
  expect(twitching).toBeLessThan(30000 / 25 / 5);
  const s = span(t => stretch(t, 2, false));
  expect(s.hi).toBeGreaterThan(.06); expect(s.hi).toBeLessThanOrEqual(.1); expect(s.lo).toBe(0);
});
it('descansando, o gato fica enrolado: cauda dobrada e parada', () => {
  expect(catTail(0, 2, true, false)).toBe(curledTail); expect(catTail(9999, 2, true, false)).toBe(curledTail);
  expect(catTail(500, 2, true, true)).toBe(curledTail);
});
it('com movimento reduzido nada disso se mexe', () => {
  for (const t of [0, 1234, 9876, 25000]) {
    expect(breath(t, 1, true)).toBe(0); expect(glancing(t, 1, true)).toBe(false); expect(catTail(t, 1, false, true)).toBe(0);
    expect(earTwitch(t, 1, true)).toBe(0); expect(stretch(t, 1, true)).toBe(0);
  }
});
it('o ócio conta por quadros (sem saltos de relógio) e zera com qualquer toque', () => {
  const clock = idleClock();
  expect(clock.tick(0)).toBeLessThan(100);
  clock.tick(60000); // a 60 s jump (paused test clock, waking tab) counts as one frame
  expect(clock.tick(60016)).toBeLessThan(100);
  let t = 60016; while (t < 60016 + idleMs) clock.tick(t += 16);
  expect(clock.tick(t += 16)).toBeGreaterThanOrEqual(idleMs);
  clock.reset(); expect(clock.tick(t + 16)).toBeLessThan(100);
});
it('a peça favorita do gato está no cômodo: ele vai até ela no chão pintado; sem ela, não vai', () => {
  const world: World = initialWorld();
  const spot = favoriteSpot(world, 'nino')!;
  expect(spot.y).toBeGreaterThanOrEqual(floorTop(world));
  expect(favoriteSpot({ ...world, layout: { ...world.layout, pieces: [] } }, 'nino')).toBeNull();
  expect(favoriteSpot(world, 'bia')).toBeNull();
});
it('o passeio vai, fica um pouco e volta para onde estava, sem mudar o save', () => {
  const plan = { actor: 'nino' as const, home: { x: 600, y: 530 }, target: { x: 300, y: 470 }, start: 1000 };
  expect(wanderAt(plan, 1000)).toMatchObject({ phase: 'go', point: plan.home });
  const there = wanderAt(plan, 1000 + 3000);
  expect(there.phase).toBe('stay'); expect(there.point).toEqual(plan.target);
  const go = Math.hypot(300, 60) / strollSpeed, back = wanderAt(plan, 1000 + go + wanderStay + 600);
  expect(back.phase).toBe('back'); expect(back.direction).toBe(1);
  expect(wanderAt(plan, 1000 + 20000)).toMatchObject({ phase: 'done', point: plan.home });
  const recalled = wanderAt({ ...plan, recall: { from: { x: 400, y: 500 }, start: 5000 } }, 5000);
  expect(recalled).toMatchObject({ phase: 'back', point: { x: 400, y: 500 } });
  expect(wanderAt({ ...plan, recall: { from: { x: 400, y: 500 }, start: 5000 } }, 9000).phase).toBe('done');
});
