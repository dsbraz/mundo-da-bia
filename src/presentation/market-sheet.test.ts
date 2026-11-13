import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

it('a folha do mercado não repete id: a bolha (views) e as peças (grupos) recortam desenhos diferentes', () => {
  const ids = [...readFileSync('public/art/market.svg', 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  expect(ids.filter((id, n) => ids.indexOf(id) !== n)).toEqual([]);
  for (const id of ['checkout', 'piece-checkout', 'market-shelf', 'shelf-sign-0', 'seed-packet']) expect(ids).toContain(id);
});
