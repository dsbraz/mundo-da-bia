import { expect, it } from 'vitest';
import { lookIds, type LookId } from '../domain/types';
import { initialWorld, transition } from '../domain/world';
import { encode, decode } from '../persistence/save';
import { outfitLayer } from '../presentation/outfit';
import human from '../presentation/assets/human.svg?raw';
const additions = ['nurse', 'police', 'detective', 'office', 'sport', 'outing'];
it('inclui seis figurinos completos para cada personagem humano e preserva o save', () => {
  expect(lookIds).toEqual(expect.arrayContaining(additions));
  for (const look of additions) for (const actor of ['bia', 'luna', 'leo', 'rui'] as const) {
    const dressed = transition(initialWorld(), { type: 'dress', actor, look: look as LookId }).state;
    expect(dressed.actors.find(a => a.id === actor)!.look).toBe(look);
    expect(decode(encode(dressed))).toEqual(dressed);
  }
});
it('roupas de profissão e passeio têm desenho próprio para todos os humanos', () => {
  for (const look of additions) for (const masculine of [false, true]) {
    expect(outfitLayer(look, masculine)).toBe(`body-${look}`);
    expect(human).toContain(`id="body-${look}"`);
  }
});
