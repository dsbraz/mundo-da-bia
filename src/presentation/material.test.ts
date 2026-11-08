import { expect, it } from 'vitest';
import { recolor } from './svg-source';
it('recolore materiais explícitos sem alterar luz e contornos', () => {
  const svg = '<path fill="var(--piece-base, #ffd477)"/><path fill="var(--piece-dark, #a56730)"/><path fill="#fff1b3"/>';
  expect(recolor(svg, 'mint')).toContain('fill="#91b7a7"');
  expect(recolor(svg, 'mint')).toContain('fill="#638e82"');
  expect(recolor(svg, 'mint')).toContain('fill="#fff1b3"');
  expect(recolor(svg, 'original')).toContain('fill="#ffd477"');
});
