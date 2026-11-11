import { describe, expect, it } from 'vitest';
import { cook, hint, known, pantry, recipes, secretRecipes, startingRecipes } from './recipes';
import { ingredientIds } from './ingredients';
import type { CookInput, Ingredient, Utensil } from './recipes';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { initialAlbum } from './houses';
import { initialWorld } from './world';
import { spawnItem } from './portable';
import { recipeIds } from './progress';
import type { Neighborhood } from './neighborhood-types';
import type { Piece, PieceKind } from './types';

const sala = { kind: 'interior' as const, building: 1, room: 'sala' as const };
const piece = (id: number, kind: PieceKind, x: number, y: number, room: 'sala' | 'quarto' = 'sala'): Piece => ({ id, kind, room, x, y, color: 'original', flipped: false });
/** House 1 with a stove (50) and a counter at the right wall (51) in the living room, a cart in the bedroom (52) and a sofa; Bia in the living room. */
function kitchen(): Neighborhood {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  const [house] = town.buildings;
  const pieces = [...house!.layout.pieces, piece(50, 'stove', 300, 250), piece(51, 'counter', 780, 300), piece(52, 'kitchen-cart', 300, 250, 'quarto'), piece(53, 'sofa', 40, 300)];
  return { ...town, buildings: [{ ...house!, layout: { ...house!.layout, nextId: 60, pieces } }] };
}
const stocked = (town: Neighborhood): Neighborhood => ({ ...town, progress: { ...town.progress, specials: ['chocolate', 'canela', 'mel'],
  basket: { alface: 6, tomate: 6, cenoura: 6, milho: 6, morango: 6, abobora: 6 } } });
const input = (ingredients: Ingredient[], utensil: Utensil, extra: Partial<CookInput> = {}): CookInput => ({ building: 1, piece: 50, cook: 'bia', ingredients, utensil, ...extra });

// The 29 rows of §3.2, typed again here (not read from the table) so a slip in either shows.
const table: [string, Ingredient[], Utensil][] = [
  ['sanduiche', ['pao', 'queijo'], 'tabua'], ['ovo-mexido', ['ovo'], 'panela'], ['panqueca', ['farinha', 'ovo', 'leite'], 'panela'],
  ['bolo-simples', ['farinha', 'ovo', 'acucar'], 'forno'], ['leite-batidinho', ['leite', 'acucar'], 'liquidificador'], ['torrada', ['pao'], 'forno'],
  ['pao-de-queijo', ['farinha', 'queijo', 'ovo'], 'forno'], ['biscoito', ['farinha', 'acucar'], 'forno'], ['pudim', ['leite', 'ovo', 'acucar'], 'panela'],
  ['misto-quente', ['pao', 'queijo'], 'forno'], ['pipoca', ['milho'], 'panela'], ['salada', ['alface', 'tomate'], 'tabua'],
  ['vitamina-de-morango', ['morango', 'leite'], 'liquidificador'], ['sopa-de-legumes', ['cenoura', 'abobora', 'tomate'], 'panela'],
  ['bolo-de-cenoura', ['farinha', 'ovo', 'cenoura'], 'forno'], ['torta-de-abobora', ['farinha', 'abobora', 'acucar'], 'forno'],
  ['pizza', ['farinha', 'tomate', 'queijo'], 'forno'], ['curau', ['milho', 'leite', 'acucar'], 'panela'], ['suco-de-cenoura', ['cenoura'], 'liquidificador'],
  ['sanduiche-natural', ['pao', 'alface', 'tomate'], 'tabua'], ['brigadeiro', ['chocolate', 'leite', 'acucar'], 'panela'],
  ['bolo-de-chocolate', ['farinha', 'ovo', 'chocolate'], 'forno'], ['torrada-de-canela', ['pao', 'canela', 'acucar'], 'forno'],
  ['morango-com-mel', ['morango', 'mel'], 'tabua'], ['batata-frita', ['batata', 'oleo'], 'panela'], ['pastel', ['farinha', 'queijo', 'oleo'], 'panela'],
  ['petisco-de-gato', ['peixe', 'farinha'], 'forno'], ['chocolate-quente', ['leite', 'chocolate', 'canela'], 'panela'], ['bolo-de-mel', ['farinha', 'ovo', 'mel'], 'forno'],
];

describe('as 29 receitas', () => {
  it('cada uma cozinha a partir de uma despensa completa, com os ingredientes em qualquer ordem', () => {
    expect(table.map(([id]) => id)).toEqual([...recipeIds]);
    for (const [id, ingredients, utensil] of table) {
      for (const order of [ingredients, [...ingredients].reverse()]) {
        const result = cook(stocked(kitchen()), input(order, utensil));
        expect(result.outcome, id).toMatchObject({ kind: 'dish', recipe: id });
        expect(result.town.items.at(-1), id).toMatchObject({ kind: 'prato', recipe: id, location: sala, holder: null, spot: 'floor' });
      }
    }
    expect(recipes.map(r => [r.id, [...r.ingredients], r.utensil])).toEqual(table);
  });
  it('não há dois pares conjunto+utensílio iguais', () => {
    const pairs = recipes.map(r => `${[...r.ingredients].sort().join('+')}@${r.utensil}`);
    expect(new Set(pairs).size).toBe(29);
  });
  it('os 18 ingredientes aparecem em alguma receita', () => {
    expect(ingredientIds).toHaveLength(18);
    expect([...new Set(recipes.flatMap(r => r.ingredients))].sort()).toEqual([...ingredientIds].sort());
    expect(startingRecipes).toEqual(['sanduiche', 'ovo-mexido', 'panqueca', 'bolo-simples', 'leite-batidinho', 'torrada']);
    expect(secretRecipes).toEqual(['petisco-de-gato', 'chocolate-quente', 'bolo-de-mel']);
  });
});

describe('as quatro saídas da bancada', () => {
  it('pão+queijo na panela devolve a dica do utensílio: o da não descoberta primeiro, depois o de menor número', () => {
    const town = kitchen();
    expect(cook(town, input(['pao', 'queijo'], 'panela'))).toEqual({ town, outcome: { kind: 'utensil', utensil: 'forno' } });
    const discovered = { ...town, progress: { ...town.progress, recipes: ['misto-quente' as const] } };
    expect(cook(discovered, input(['queijo', 'pao'], 'liquidificador')).outcome).toEqual({ kind: 'utensil', utensil: 'tabua' });
    expect(hint(discovered.progress, ['pao', 'queijo'], 'tabua')).toEqual({ kind: 'utensil', utensil: 'forno' });
  });
  it('em save novo, farinha+ovo no forno mostra o fantasma do queijo (pão de queijo, a não descoberta de menor número)', () => {
    const town = kitchen();
    expect(cook(town, input(['farinha', 'ovo'], 'forno'))).toEqual({ town, outcome: { kind: 'ghost', ingredient: 'queijo' } });
    const later = { ...town, progress: { ...town.progress, recipes: ['pao-de-queijo' as const] } };
    expect(cook(later, input(['ovo', 'farinha'], 'forno')).outcome).toEqual({ kind: 'ghost', ingredient: 'cenoura' });
    const all = { ...town, progress: { ...town.progress, recipes: [...recipeIds.slice(6)] } };
    expect(cook(all, input(['ovo', 'farinha'], 'forno')).outcome).toEqual({ kind: 'ghost', ingredient: 'acucar' });
    expect(cook(town, input(['leite'], 'liquidificador')).outcome).toEqual({ kind: 'ghost', ingredient: 'morango' });
  });
  it('o resto vira vapor, e nenhuma receita errada muda a cesta', () => {
    const town = stocked(kitchen());
    for (const attempt of [input(['alface', 'chocolate'], 'forno'), input(['pao', 'queijo'], 'panela'), input(['farinha', 'ovo'], 'forno'), input(['peixe'], 'tabua')]) {
      const result = cook(town, attempt);
      expect(result.town).toBe(town);
      expect(result.town.progress.basket).toEqual(town.progress.basket);
    }
    expect(cook(town, input(['alface', 'chocolate'], 'forno')).outcome).toEqual({ kind: 'steam' });
    expect(cook(town, input(['peixe'], 'tabua')).outcome).toEqual({ kind: 'steam' });
  });
});

describe('o prato que nasce', () => {
  it('consome uma unidade de cada ingrediente da horta, nunca básicos nem especiais, e a última unidade sai da cesta', () => {
    const town = { ...kitchen(), progress: { ...kitchen().progress, basket: { alface: 1, tomate: 3, milho: 2 }, specials: ['mel' as const] } };
    const salad = cook(town, input(['tomate', 'alface'], 'tabua')).town;
    expect(salad.progress.basket).toEqual({ tomate: 2, milho: 2 });
    expect(salad.progress.specials).toEqual(['mel']);
    const cake = cook(salad, input(['farinha', 'ovo', 'mel'], 'forno')).town;
    expect(cake.progress.basket).toEqual({ tomate: 2, milho: 2 });
    expect(cake.progress.specials).toEqual(['mel']);
  });
  it('a receita nova entra em progress.recipes uma vez; as 6 iniciais nunca entram', () => {
    const first = cook(kitchen(), input(['farinha', 'queijo', 'ovo'], 'forno'));
    expect(first.outcome).toEqual({ kind: 'dish', recipe: 'pao-de-queijo', item: '2:prato', fancy: false, discovered: true });
    expect(first.town.progress.recipes).toEqual(['pao-de-queijo']);
    const again = cook(first.town, input(['ovo', 'farinha', 'queijo'], 'forno'));
    expect(again.outcome).toEqual({ kind: 'dish', recipe: 'pao-de-queijo', item: '3:prato', fancy: false, discovered: false });
    expect(again.town.progress.recipes).toEqual(['pao-de-queijo']);
    expect(cook(kitchen(), input(['farinha', 'ovo', 'leite'], 'panela')).town.progress.recipes).toEqual([]);
    expect(again.town.nextItem).toBe(4);
  });
  it('com o look chef sai caprichado, e a primeira vez de cada receita entra em progress.fancy', () => {
    const town = kitchen(), chef = { ...town, actors: town.actors.map(a => a.id === 'bia' ? { ...a, look: 'chef' as const } : a) };
    const once = cook(chef, input(['ovo'], 'panela'));
    expect(once.outcome).toMatchObject({ kind: 'dish', recipe: 'ovo-mexido', fancy: true });
    expect(once.town.items.at(-1)!.fancy).toBe(true);
    expect(once.town.progress.fancy).toEqual(['ovo-mexido']);
    expect(cook(once.town, input(['ovo'], 'panela')).town.progress.fancy).toEqual(['ovo-mexido']);
    const lunaChef = { ...town, actors: town.actors.map(a => a.id === 'luna' ? { ...a, look: 'chef' as const } : a) };
    expect(cook(lunaChef, input(['ovo'], 'panela')).outcome).toMatchObject({ fancy: false });
    const plain = cook(town, input(['ovo'], 'panela')).town;
    expect(Object.hasOwn(plain.items.at(-1)!, 'fancy')).toBe(false);
    expect(plain.progress.fancy).toEqual([]);
  });
  it('nasce no piso junto da peça, dentro das margens, e cada prato a seguir fica ao lado', () => {
    const at = (town: Neighborhood) => { const { x, y } = town.items.at(-1)!; return { x, y }; };
    const first = cook(kitchen(), input(['ovo'], 'panela')).town;
    expect(at(first)).toEqual({ x: 355, y: 414 });
    const second = cook(first, input(['ovo'], 'panela')).town;
    expect(at(second)).toEqual({ x: 403, y: 414 });
    const third = cook(second, input(['ovo'], 'panela')).town;
    expect(at(third)).toEqual({ x: 307, y: 414 });
    const fourth = cook(third, input(['ovo'], 'panela')).town;
    expect(at(fourth)).toEqual({ x: 355, y: 428 });
    const edge = cook(kitchen(), input(['ovo'], 'panela', { piece: 51 })).town;
    expect(at(edge)).toEqual({ x: 890, y: 454 });
    const wall = { ...kitchen(), buildings: kitchen().buildings.map(b => ({ ...b, layout: { ...b.layout, pieces: b.layout.pieces.map(p => p.id === 51 ? { ...p, kind: 'kitchen-cart' as const, x: 860 } : p) } })) };
    expect(at(cook(cook(wall, input(['ovo'], 'panela', { piece: 51 })).town, input(['ovo'], 'panela', { piece: 51 })).town)).toEqual({ x: 940, y: 474 });
    const low = cook({ ...kitchen(), buildings: kitchen().buildings.map(b => ({ ...b, layout: { ...b.layout, pieces: b.layout.pieces.map(p => p.id === 51 ? { ...p, x: 0, y: 420 } : p) } })) },
      input(['ovo'], 'panela', { piece: 51 })).town;
    expect(at(low)).toEqual({ x: 110, y: 540 });
  });
  it('o 7º prato numa casa é recusado e nada muda; pratos na mão ou em outra casa não contam', () => {
    let town = kitchen();
    for (let i = 0; i < 6; i++) town = cook(town, input(['ovo'], 'panela')).town;
    expect(town.items.filter(i => i.kind === 'prato')).toHaveLength(6);
    expect(cook(town, input(['ovo'], 'panela'))).toEqual({ town, outcome: { kind: 'full' } });
    expect(cook(town, input(['pao', 'queijo'], 'panela')).outcome).toEqual({ kind: 'utensil', utensil: 'forno' });
    const held = { ...town, items: town.items.map(i => i.id === '2:prato' ? { ...i, holder: 'luna' as const } : i) };
    expect(cook(held, input(['ovo'], 'panela')).outcome.kind).toBe('dish');
    const street = spawnItem(kitchen(), { kind: 'prato', recipe: 'pizza', location: { kind: 'street' }, point: { x: 600, y: 520 } });
    let elsewhere = street; for (let i = 0; i < 6; i++) elsewhere = cook(elsewhere, input(['ovo'], 'panela')).town;
    expect(elsewhere.items.filter(i => i.kind === 'prato')).toHaveLength(7);
  });
});

describe('o que a bancada não aceita', () => {
  it('ingrediente que ela não tem, repetido, tigela vazia ou cheia demais devolvem o mesmo bairro', () => {
    const town = kitchen();
    for (const ingredients of [['alface', 'tomate'], ['chocolate', 'leite', 'acucar'], ['ovo', 'ovo'], [], ['farinha', 'ovo', 'leite', 'acucar'], ['kiwi']] as Ingredient[][]) {
      expect(cook(town, input(ingredients, 'panela'))).toEqual({ town, outcome: { kind: 'none' } });
    }
    expect(cook(town, input(['ovo'], 'grelha' as Utensil)).outcome).toEqual({ kind: 'none' });
  });
  it('só cozinha em fogão, bancada ou carrinho da casa, com quem cozinha no mesmo cômodo', () => {
    const town = kitchen();
    expect(cook(town, input(['ovo'], 'panela', { piece: 53 })).outcome).toEqual({ kind: 'none' });
    expect(cook(town, input(['ovo'], 'panela', { piece: 52 })).outcome).toEqual({ kind: 'none' });
    expect(cook(town, input(['ovo'], 'panela', { piece: 99 })).outcome).toEqual({ kind: 'none' });
    expect(cook(town, input(['ovo'], 'panela', { building: 7 })).outcome).toEqual({ kind: 'none' });
    expect(cook(town, input(['ovo'], 'panela', { cook: 'ze' as 'bia' })).outcome).toEqual({ kind: 'none' });
    const moved = { ...town, actors: town.actors.map(a => a.id === 'bia' ? { ...a, room: 'quarto' as const, location: { ...sala, room: 'quarto' as const } } : a) };
    expect(cook(moved, input(['ovo'], 'panela', { piece: 52 })).town.items.at(-1)).toMatchObject({ recipe: 'ovo-mexido', location: { ...sala, room: 'quarto' } });
    expect(cook(moved, input(['ovo'], 'panela')).outcome).toEqual({ kind: 'none' });
    const outside = { ...town, actors: town.actors.map(a => a.id === 'bia' ? { ...a, location: { kind: 'street' as const } } : a) };
    expect(cook(outside, input(['ovo'], 'panela')).outcome).toEqual({ kind: 'none' });
  });
});

it('a despensa tem os básicos, o que há na cesta e os especiais ganhos; as 6 primeiras receitas já são conhecidas', () => {
  const progress = { ...kitchen().progress, basket: { milho: 2, morango: 1 }, specials: ['canela' as const] };
  expect(pantry(progress)).toEqual(['farinha', 'ovo', 'leite', 'acucar', 'pao', 'queijo', 'peixe', 'batata', 'oleo', 'milho', 'morango', 'canela']);
  expect(recipeIds.filter(id => known(kitchen().progress, id))).toEqual(recipeIds.slice(0, 6));
  expect(known({ ...progress, recipes: ['pizza'] }, 'pizza')).toBe(true);
});

it('a ação cook do bairro aplica a mesma regra', () => {
  const town = kitchen(), action = { type: 'cook' as const, ...input(['farinha', 'queijo', 'ovo'], 'forno') };
  expect(neighborhoodAction(town, action)).toEqual(cook(town, input(['farinha', 'queijo', 'ovo'], 'forno')).town);
  expect(neighborhoodAction(town, { ...action, ingredients: ['kiwi' as Ingredient] })).toBe(town);
});
