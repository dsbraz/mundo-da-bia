import { expect, it } from 'vitest';
import { framing } from './viewport';
it('preenche retrato sem deformar e limita a câmera', () => {
  const view = framing(768, 1024, 1000, { x: 500, y: 300 });
  expect(view.scale).toBeCloseTo(1024 / 600);
  expect(view.x).toBeCloseTo(275);
  expect(view.y).toBe(0);
});
it('preenche paisagem e mantém o centro possível após rotação', () => {
  const view = framing(1400, 700, 1000, { x: 900, y: 580 });
  expect(view.scale).toBe(1.4);
  expect(view.x).toBe(0); expect(view.y).toBeCloseTo(100);
});
