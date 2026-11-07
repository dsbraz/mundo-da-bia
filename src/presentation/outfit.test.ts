import { expect, it } from 'vitest';
import { outfitLayer } from './outfit';
import { lookIds } from '../domain/types';
it('Rui e Léo usam versões com calça ou bermuda em todos os looks', () => {
  for (const look of lookIds) expect(['body-casual', 'body-neon', 'body-denim', 'body-rehearsal', 'body-overalls']).toContain(outfitLayer(look, true));
  expect(outfitLayer('festa')).toBe('body'); expect(outfitLayer('aurora')).toBe('body-aurora');
});
