import { expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { armAround, armPoints, hugFront, hugGap, hugLean, shoulder } from './hug-embrace';

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
it('com quem é maior, o braço abraça na altura de quem é menor; quem é menor fica na frente, para os dois aparecerem', () => {
  const world = initialWorld(), bia = { ...who(world, 'bia'), x: 690 }, fabiana = { ...who(world, 'fabiana'), room: 'sala' as const, x: 760, y: 530 };
  // The Bia's arm goes round the Fabiana's waist, at the Bia's own shoulder height, not up over the grown-up's shoulders.
  const up = armAround(bia, fabiana, 18, -18);
  expect(up.hand.y).toBeCloseTo(bia.y - shoulder(bia) + 14);
  // A grown-up hugging a child reaches down to the child's shoulders.
  const down = armAround(fabiana, bia, -18, 18);
  expect(down.hand.y).toBeCloseTo(bia.y - shoulder(bia) + 14);
  expect(down.start.y).toBeLessThan(down.hand.y);
  // In front: the smaller one (the child before the grown-up, the cat before the child); of two the same size, who came.
  const mimi = who(world, 'mimi'), leo = who(world, 'leo');
  expect([hugFront(bia, fabiana), hugFront(fabiana, bia), hugFront(bia, mimi), hugFront(bia, leo)].map(a => a.id)).toEqual(['bia', 'bia', 'mimi', 'bia']);
});
