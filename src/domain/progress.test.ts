import { expect, it } from 'vitest';
import { initialProgress, nextItemAfter, recipeIds, goalIds, specialIds } from './progress';
import { cropIds } from './types';

it('o próximo item vem depois do maior prefixo numérico', () => {
  expect(nextItemAfter([])).toBe(1);
  expect(nextItemAfter([{ id: '1:lanche' }, { id: '7:lanche' }, { id: '3:bola' }])).toBe(8);
  expect(nextItemAfter([{ id: 'lanche' }, { id: '2:peixe' }])).toBe(3);
});
it('cada estado inicial é novo e os ids são únicos', () => {
  const a = initialProgress(); a.seeds.push('milho'); a.post.inbox.push(1);
  expect(initialProgress().seeds).toEqual(['alface', 'tomate', 'cenoura']);
  expect(initialProgress().post.inbox).toEqual([]);
  expect(recipeIds).toHaveLength(27); expect(goalIds).toHaveLength(12); expect(specialIds).toHaveLength(3); expect(cropIds).toHaveLength(6);
  for (const ids of [recipeIds, goalIds, specialIds, cropIds]) expect(new Set(ids).size).toBe(ids.length);
});
