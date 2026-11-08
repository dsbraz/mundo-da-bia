import { expect, it } from 'vitest';
import { outfitLayer } from './outfit';
import { lookIds } from '../domain/types';
it('Rui e Léo usam versões com calça ou bermuda em todos os looks', () => {
  for (const look of lookIds) expect(['body-spiderman', 'body-superman', 'body-casual', 'body-neon', 'body-denim', 'body-rehearsal', 'body-overalls', 'body-rumi', 'body-mira-shorts', 'body-zoey']).toContain(outfitLayer(look, true));
  expect(outfitLayer('festa')).toBe('body'); expect(outfitLayer('aurora')).toBe('body-aurora');
});
it('os três figurinos têm camadas próprias, mantendo as variantes com bermuda', () => {
  expect(lookIds).toEqual(expect.arrayContaining(['rumi', 'mira', 'zoey']));
  for (const look of ['rumi', 'mira', 'zoey']) expect(outfitLayer(look)).toBe(`body-${look}`);
  expect(outfitLayer('mira', true)).toBe('body-mira-shorts');
});
it('inclui dois heróis completos para todos os humanos', () => {
  expect(lookIds).toEqual(expect.arrayContaining(['spiderman', 'superman']));
  for (const look of ['spiderman', 'superman']) {
    expect(outfitLayer(look)).toBe(`body-${look}`);
    expect(outfitLayer(look, true)).toBe(`body-${look}`);
  }
});
