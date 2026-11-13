import { describe, expect, it } from 'vitest';
import { basics, stockLimit } from './ingredients';
import { fullStock, stockOf, takeStock } from './stock';
import { cook, pantry } from './recipes';
import type { CookInput, Ingredient, Utensil } from './recipes';
import { localWorld, migrateNeighborhood, neighborhoodAction, undoTo } from './neighborhood';
import { construct, duplicateBuilding } from './buildings';
import { initialAlbum } from './houses';
import { initialWorld, transition } from './world';
import type { Neighborhood } from './neighborhood-types';
import type { Piece } from './types';

const stove: Piece = { id: 50, kind: 'stove', room: 'sala', x: 300, y: 250, color: 'original', flipped: false };
/** House 1 with a stove in the living room; `stock` replaces the pantry (absent: never touched, so full). */
function kitchen(stock?: Partial<Record<Ingredient, number>>): Neighborhood {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  const [house] = town.buildings;
  return { ...town, buildings: [{ ...house!, ...(stock ? { stock } : {}), layout: { ...house!.layout, nextId: 60, pieces: [...house!.layout.pieces, stove] } }] };
}
const input = (ingredients: Ingredient[], utensil: Utensil): CookInput => ({ building: 1, piece: 50, cook: 'bia', ingredients, utensil });
const stockIn = (town: Neighborhood, id = 1) => stockOf(town.buildings.find(b => b.id === id)!);

describe('a despensa da casa (W3L-20)', () => {
  it('uma casa que nunca cozinhou tem 4 de cada básico, e a casa nova nasce cheia', () => {
    expect(stockLimit).toBe(4);
    expect(fullStock()).toEqual(Object.fromEntries(basics.map(b => [b, 4])));
    expect(stockIn(kitchen())).toEqual(fullStock());
    const built = construct(kitchen(), 1, 'house');
    expect(stockIn(built, 2)).toEqual(fullStock());
    expect(fullStock()).not.toBe(fullStock());
  });
  it('cozinhar panqueca tira 1 farinha, 1 ovo e 1 leite, e nada mais', () => {
    const town = cook(kitchen(), input(['farinha', 'ovo', 'leite'], 'panela')).town;
    expect(stockIn(town)).toEqual({ ...fullStock(), farinha: 3, ovo: 3, leite: 3 });
    expect(stockIn(cook(town, input(['ovo'], 'panela')).town)).toEqual({ ...fullStock(), farinha: 3, ovo: 2, leite: 3 });
  });
  it('receita errada, dica ou fantasma não tiram nada', () => {
    const town = kitchen();
    for (const attempt of [input(['pao', 'queijo'], 'panela'), input(['farinha', 'ovo'], 'forno'), input(['peixe', 'leite'], 'panela')]) {
      expect(cook(town, attempt).town).toBe(town);
    }
  });
  it('o último sai da despensa, e sem ele o básico não entra na tigela', () => {
    const town = cook(kitchen({ ovo: 1 }), input(['ovo'], 'panela')).town;
    expect(stockIn(town)).toEqual({});
    expect(cook(town, input(['ovo'], 'panela'))).toEqual({ town, outcome: { kind: 'none' } });
    expect(pantry(town.progress, stockIn(town))).toEqual([]);
    expect(pantry(town.progress, { leite: 2 })).toEqual(['leite']);
  });
  it('a horta e os especiais não dependem da despensa', () => {
    const town = { ...kitchen({}), progress: { ...kitchen().progress, basket: { milho: 1 }, specials: ['mel' as const] } };
    expect(pantry(town.progress, {})).toEqual(['milho', 'mel']);
    expect(cook(town, input(['milho'], 'panela')).outcome).toMatchObject({ kind: 'dish', recipe: 'pipoca' });
    expect(stockIn(cook(town, input(['milho'], 'panela')).town)).toEqual({});
  });
  it('com a despensa zerada e sem mercado, o lanche de sempre ainda mata a fome (sem beco sem saída)', () => {
    const town = kitchen({}), world = localWorld(town);
    const held = transition(world, { type: 'pick', actor: 'bia', item: '1:lanche' }).state;
    const fed = transition(held, { type: 'feed', actor: 'bia' });
    expect(fed.events.map(e => e.type)).toContain('fed');
    expect(fed.state.items.find(i => i.id === '1:lanche')).toMatchObject({ holder: null, spot: 'fridge' });
  });
  it('takeStock tira um de cada básico da tigela, ignora o resto e nunca fica negativo', () => {
    expect(takeStock({ farinha: 2, ovo: 1 }, ['farinha', 'ovo', 'milho'])).toEqual({ farinha: 1 });
    expect(takeStock(undefined, ['pao'])).toEqual({ ...fullStock(), pao: 3 });
    expect(takeStock({}, ['pao'])).toEqual({});
  });
  it('a cópia da casa leva a despensa, e desfazer em Criar não devolve nada à despensa', () => {
    const cooked = cook(kitchen(), input(['ovo'], 'panela')).town;
    expect(stockIn(duplicateBuilding(cooked, 1), 2)).toEqual(stockIn(cooked));
    const undone = undoTo(kitchen(), cooked);
    expect(stockIn(undone)).toEqual({ ...fullStock(), ovo: 3 });
    const removed = undoTo(kitchen(), { ...cooked, buildings: [] });
    expect(removed.buildings[0]!.stock).toBeUndefined();
  });
  it('a ação cook do bairro aplica a mesma regra', () => {
    const town = kitchen({ ovo: 2 });
    expect(stockIn(neighborhoodAction(town, { type: 'cook', ...input(['ovo'], 'panela') }))).toEqual({ ovo: 1 });
  });
});
