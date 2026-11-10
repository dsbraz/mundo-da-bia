import { expect, it } from 'vitest';
import { jumpFrame, jumpMs } from './jump-motion';

it('o salto começa agachando: não sai do lugar, fica mais baixo e sem poeira', () => {
  const crouch = jumpFrame(40, false);
  expect(crouch).toMatchObject({ phase: 'crouch', travel: 0, lift: 0, dust: 0 });
  expect(crouch.squash).toBeLessThan(0); expect(crouch.squash).toBeGreaterThanOrEqual(-.1);
});
it('no ar sobe até 28, anda pelo caminho e a sombra encolhe', () => {
  const top = jumpFrame(245, false);
  expect(top.phase).toBe('air'); expect(top.lift).toBeCloseTo(28, 0); expect(top.travel).toBeCloseTo(.5, 1);
  expect(top.shadow).toBeLessThan(.75); expect(top.shadow).toBeGreaterThan(.5);
  expect(jumpFrame(100, false).shadow).toBeGreaterThan(top.shadow);
});
it('aterrissa no tempo de sempre, com squash que volta e poeirinha que some', () => {
  expect(jumpMs).toBe(400);
  const land = jumpFrame(jumpMs + 10, false);
  expect(land).toMatchObject({ phase: 'land', travel: 1, lift: 0 });
  expect(land.squash).toBeLessThan(0); expect(land.squash).toBeGreaterThanOrEqual(-.1); expect(land.dust).toBeGreaterThan(0);
  expect(jumpFrame(jumpMs + 100, false).dust).toBeGreaterThan(land.dust);
  expect(jumpFrame(jumpMs + 200, false)).toEqual({ phase: 'still', travel: 1, lift: 0, squash: 0, shadow: 1, dust: 0 });
});
it('squash e estica ficam em até 10% em todo o salto', () => {
  for (let t = 0; t < 600; t += 5) expect(Math.abs(jumpFrame(t, false).squash)).toBeLessThanOrEqual(.1);
});
it('antes do primeiro salto fica parado', () => {
  expect(jumpFrame(Number.POSITIVE_INFINITY, false).phase).toBe('still');
});
it('com movimento reduzido chega de uma vez: sem agachar, sem pular, sem poeira', () => {
  for (const t of [0, 40, 245, 410]) expect(jumpFrame(t, true)).toEqual({ phase: 'still', travel: 1, lift: 0, squash: 0, shadow: 1, dust: 0 });
});
