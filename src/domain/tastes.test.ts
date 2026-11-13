import { expect, it } from 'vitest';
import { tastes } from './tastes';
import { recipeIds } from './progress';
import { actorIds } from './types';

it('cada personagem tem um prato favorito que é receita existente e um presente só seu (tabela 3.4)', () => {
  expect(tastes).toEqual({
    bia: { favorite: 'batata-frita', gift: 'toldo', game: 'corda' },
    luna: { favorite: 'pizza', gift: 'estetoscopio', game: 'amarelinha' },
    leo: { favorite: 'bolo-de-cenoura', gift: 'regador', game: 'regar', pace: { sono: 1.1 } },
    rui: { favorite: 'pipoca', gift: 'cesta', game: 'bola', pace: { tedio: 1.4, fome: 0.6 } },
    mimi: { favorite: 'petisco-de-gato', gift: 'curativo', game: 'bola', pace: { sono: 1.5, fome: 0.6 } },
    nino: { favorite: 'leite-batidinho', gift: 'lanterna', game: 'bola', pace: { sono: 1.5, fome: 0.6 } },
    pipoca: { favorite: 'ovo-mexido', gift: 'mel', game: 'bola', pace: { sono: 1.5, fome: 0.6 } },
    daniel: { favorite: 'misto-quente', gift: 'canela', game: 'tv', pace: { tedio: 0.6 } },
    fabiana: { favorite: 'sopa-de-legumes', gift: 'colher', game: 'tv', pace: { tedio: 0.6 } },
  });
  for (const id of actorIds) expect(recipeIds).toContain(tastes[id].favorite);
  expect(new Set(actorIds.map(id => tastes[id].gift)).size).toBe(actorIds.length);
});

it('ninguém mais tem o favorito da Bia', () => {
  expect(actorIds.filter(id => tastes[id].favorite === tastes.bia.favorite)).toEqual(['bia']);
});
