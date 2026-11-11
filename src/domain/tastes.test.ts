import { expect, it } from 'vitest';
import { tastes } from './tastes';
import { recipeIds } from './progress';
import { actorIds } from './types';

it('cada personagem tem um prato favorito que é receita existente e um presente só seu (tabela 3.4)', () => {
  expect(tastes).toEqual({
    bia: { favorite: 'batata-frita', gift: 'toldo' },
    luna: { favorite: 'pizza', gift: 'estetoscopio' },
    leo: { favorite: 'bolo-de-cenoura', gift: 'regador' },
    rui: { favorite: 'pipoca', gift: 'cesta' },
    mimi: { favorite: 'petisco-de-gato', gift: 'curativo' },
    nino: { favorite: 'leite-batidinho', gift: 'lanterna' },
    pipoca: { favorite: 'ovo-mexido', gift: 'mel' },
  });
  for (const id of actorIds) expect(recipeIds).toContain(tastes[id].favorite);
  expect(new Set(actorIds.map(id => tastes[id].gift)).size).toBe(actorIds.length);
});

it('ninguém mais tem o favorito da Bia', () => {
  expect(actorIds.filter(id => tastes[id].favorite === tastes.bia.favorite)).toEqual(['bia']);
});
