import { expect, it } from 'vitest';
import { createGesture } from './gestures';
it('cancelar o gesto preserva o último movimento e ignora eventos tardios', () => {
  const moves: number[] = [];
  const gesture = createGesture(point => moves.push(point.x));
  gesture.start(1);
  gesture.move(2, { x: 200, y: 400 });
  gesture.move(1, { x: 350, y: 400 });
  gesture.cancel();
  gesture.move(1, { x: 500, y: 400 });
  expect(moves).toEqual([350]);
});
it('somente um ponteiro controla o gesto até terminar', () => {
  const moves: number[] = [];
  const gesture = createGesture(point => moves.push(point.x));
  expect(gesture.start(1)).toBe(true);
  expect(gesture.start(2)).toBe(false);
  gesture.end(2);
  gesture.move(1, { x: 400, y: 400 });
  gesture.end(1);
  gesture.move(1, { x: 500, y: 400 });
  expect(moves).toEqual([400]);
  expect(gesture.start(2)).toBe(true);
});
