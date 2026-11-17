import { expect, it, vi } from 'vitest';
import { bindKeyboard } from './keyboard';
import { initialWorld } from '../domain/world';
import type { Point } from '../domain/types';

function keyboard(at: Point & { seat?: string }) {
  let press: (event: KeyboardEvent) => void = () => {};
  const root = { addEventListener: (_: string, listener: typeof press) => { press = listener; } } as unknown as HTMLElement;
  const move = vi.fn((point: Point) => { at = point; });
  bindKeyboard(root, { building: () => false, state: initialWorld, piece: () => null, actor: () => at, edit: vi.fn(), move, stopWalk: vi.fn() });
  return { move, point: () => at, press: (key: string) => press({ key, target: { closest: () => null }, preventDefault: vi.fn() } as unknown as KeyboardEvent) };
}

it('setas não entram na mesa sólida, mas permitem afastar-se dela', () => {
  const keys = keyboard({ x: 420, y: 530 });
  keys.press('ArrowLeft'); keys.press('ArrowLeft');
  expect(keys.move).not.toHaveBeenCalled();
  keys.press('ArrowRight'); expect(keys.point()).toEqual({ x: 440, y: 530 });
});

it('setas ficam no chão visível e permitem voltar para baixo imediatamente', () => {
  const keys = keyboard({ x: 700, y: 410 });
  for (let n = 0; n < 10; n++) keys.press('ArrowUp');
  expect(keys.point()).toEqual({ x: 700, y: 410 });
  keys.press('ArrowDown'); expect(keys.point()).toEqual({ x: 700, y: 430 });
});

it('quem está no sofá consegue levantar para o chão pelo teclado', () => {
  const keys = keyboard({ x: 150, y: 400, seat: '2.0' });
  keys.press('ArrowDown');
  expect(keys.move).toHaveBeenCalled();
  expect(keys.point().y).toBeGreaterThan(458);
});
