import { expect, it } from 'vitest';
import { armJoints, standFor, writerAt } from './lesson-writer';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

it('o braço de quem escreve vai do ombro até o giz, com o cotovelo para baixo e sem esticar além do braço', () => {
  const shoulder = { x: 300, y: 260 }, chalk = { x: 260, y: 215 };
  const { elbow, hand } = armJoints(shoulder, chalk, 32, 30);
  expect(hand).toEqual(chalk);
  expect(dist(shoulder, elbow)).toBeCloseTo(32);
  expect(dist(elbow, hand)).toBeCloseTo(30);
  // The elbow bends below the straight line from the shoulder to the chalk (the arm does not twist up).
  expect(elbow.y).toBeGreaterThan(shoulder.y + (chalk.y - shoulder.y) * (elbow.x - shoulder.x) / (chalk.x - shoulder.x));
  const far = armJoints(shoulder, { x: 100, y: 100 }, 32, 30);
  expect(dist(shoulder, far.hand)).toBeLessThanOrEqual(62.01);
});
it('ela fica do lado ainda não escrito do giz, de frente para ele, sem cobrir o que já está escrito', () => {
  const stand = standFor({ x: 400, y: 200 }, 395, .88);
  expect(stand.x).toBeGreaterThan(400 + 15);
  expect(stand.y).toBe(395);
});
it('ela anda do lugar dela até o quadro no começo da aula, e volta no fim; sem lugar, aparece e some ali mesmo', () => {
  const from = { x: 900, y: 480 }, stand = { x: 500, y: 395 };
  expect(writerAt(from, stand, 0, false)).toMatchObject({ x: 900, y: 480, alpha: 1 });
  expect(writerAt(from, stand, 1500, false)).toMatchObject({ x: 500, y: 395 });
  const half = writerAt(from, stand, 750, false);
  expect(half.x).toBeLessThan(900); expect(half.x).toBeGreaterThan(500);
  expect(writerAt(null, stand, 0, false).alpha).toBe(0);
  expect(writerAt(null, stand, 1500, false)).toMatchObject({ x: 500, alpha: 1 });
  // Reduced motion: already at the board.
  expect(writerAt(from, stand, 0, true)).toMatchObject({ x: 500, y: 395, alpha: 1 });
});
