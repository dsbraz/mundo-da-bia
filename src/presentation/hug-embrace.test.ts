import { expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { armAround, armPoints, hugGap, hugLean, shoulder } from './hug-embrace';

const who = (world: ReturnType<typeof initialWorld>, id: string) => world.actors.find(a => a.id === id)!;
it('no abraço os dois se inclinam até os corpos se sobreporem (lote 6B): o domínio guarda 70 entre os pés, o desenho só 34', () => {
  const hugged = transition(initialWorld(), { type: 'hug', actor: 'bia', other: 'leo' }).state, bia = who(hugged, 'bia'), leo = who(hugged, 'leo');
  expect(bia.x - leo.x).toBe(70);
  const a = hugLean(bia, leo), b = hugLean(leo, bia);
  expect([a, b]).toEqual([-18, 18]);
  expect(Math.abs(bia.x + a - (leo.x + b))).toBe(hugGap);
  // Already that close (or closer), nobody moves.
  expect(hugLean({ x: 100, y: 0 }, { x: 120, y: 0 })).toBe(0);
});
it('o braço de quem chega passa por cima dos ombros do outro e a mão aparece do outro lado', () => {
  const world = initialWorld(), bia = { ...who(world, 'bia'), x: 490 }, leo = who(world, 'leo');
  const arm = armAround(bia, leo, -18, 18);
  // From the Bia's near shoulder (to the left of her) to beyond the Léo's far side, at shoulder height, arching up.
  expect(arm.start.x).toBeLessThan(490 - 18);
  expect(arm.hand.x).toBeLessThan(leo.x + 18);
  expect(arm.hand.y).toBeCloseTo(leo.y - shoulder(leo) + 14);
  expect(arm.bend.y).toBeLessThan(Math.min(arm.start.y, arm.hand.y));
  const points = armPoints(arm);
  expect(points[0]).toEqual(arm.start); expect(points.at(-1)).toEqual(arm.hand);
  // A grown-up's shoulders are higher than a child's; a cat's back is low.
  expect(shoulder(who(world, 'daniel'))).toBeGreaterThan(shoulder(who(world, 'bia')) * 1.25);
  expect(shoulder(who(world, 'mimi'))).toBeLessThan(shoulder(who(world, 'bia')) / 2);
});
