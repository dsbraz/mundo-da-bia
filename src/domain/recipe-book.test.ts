import { expect, it } from 'vitest';
import { bookPages, clue } from './recipe-book';
import { recipes, secretRecipes } from './recipes';
import { initialProgress } from './progress';
import type { Progress } from './progress';

const page = (progress: Progress, id: string) => bookPages(progress).find(p => p.id === id);
const entry = (progress: Progress, id: string) => bookPages(progress).flatMap(p => p.entries).find(e => e.recipe === id);

it('um save novo tem uma página por utensílio, na ordem, e nenhuma de segredos', () => {
  expect(bookPages(initialProgress()).map(p => p.id)).toEqual(['tabua', 'panela', 'forno', 'liquidificador']);
});

it('a página do forno mostra o bolo colorido com todos os ingredientes e o pão de queijo em silhueta com uma dica só', () => {
  const forno = page(initialProgress(), 'forno')!;
  expect(forno.entries[0]).toEqual({ recipe: 'bolo-simples', utensil: 'forno', known: true, fancy: false, ingredients: ['farinha', 'ovo', 'acucar'] });
  expect(forno.entries.find(e => e.recipe === 'pao-de-queijo')).toEqual({ recipe: 'pao-de-queijo', utensil: 'forno', known: false, fancy: false, ingredients: ['queijo'] });
});

it('cada página traz as receitas do seu utensílio na ordem da tabela, silhuetas misturadas, sem as secretas', () => {
  const pages = bookPages(initialProgress());
  for (const p of pages) {
    expect(p.entries.map(e => e.recipe)).toEqual(recipes.filter(r => r.utensil === p.id && !secretRecipes.includes(r.id)).map(r => r.id));
    expect(p.entries.every(e => e.utensil === p.id)).toBe(true);
  }
  expect(pages.flatMap(p => p.entries)).toHaveLength(26);
  expect(pages.flatMap(p => p.entries).filter(e => e.known)).toHaveLength(6);
});

it('cozinhar o pão de queijo deixa ele colorido; caprichado ganha fita; um cartão revela todos os ingredientes', () => {
  const cooked = { ...initialProgress(), recipes: ['pao-de-queijo' as const], fancy: ['pao-de-queijo' as const, 'torrada' as const] };
  expect(entry(cooked, 'pao-de-queijo')).toMatchObject({ known: true, fancy: true, ingredients: ['farinha', 'queijo', 'ovo'] });
  expect(entry(cooked, 'torrada')).toMatchObject({ known: true, fancy: true });
  expect(entry(cooked, 'panqueca')).toMatchObject({ known: true, fancy: false });
  const revealed = { ...initialProgress(), revealed: ['bolo-de-cenoura' as const] };
  expect(entry(revealed, 'bolo-de-cenoura')).toMatchObject({ known: false, ingredients: ['farinha', 'ovo', 'cenoura'] });
  expect(entry(revealed, 'pizza')).toMatchObject({ known: false, ingredients: ['tomate'] });
});

it('a página de segredos só existe depois do primeiro segredo e mostra apenas os descobertos', () => {
  expect(page(initialProgress(), 'segredos')).toBeUndefined();
  expect(page({ ...initialProgress(), revealed: [...secretRecipes] }, 'segredos')).toBeUndefined();
  const one = { ...initialProgress(), recipes: ['chocolate-quente' as const], fancy: ['chocolate-quente' as const] };
  expect(bookPages(one).map(p => p.id)).toEqual(['tabua', 'panela', 'forno', 'liquidificador', 'segredos']);
  expect(page(one, 'segredos')!.entries).toEqual([{ recipe: 'chocolate-quente', utensil: 'panela', known: true, fancy: true, ingredients: ['leite', 'chocolate', 'canela'] }]);
  const all = { ...initialProgress(), recipes: [...secretRecipes].reverse() };
  expect(page(all, 'segredos')!.entries.map(e => e.recipe)).toEqual([...secretRecipes]);
});

it('a dica de uma silhueta é o ingrediente mais raro da receita (o primeiro, no empate)', () => {
  expect(clue(recipes.find(r => r.id === 'pao-de-queijo')!)).toBe('queijo');
  expect(clue(recipes.find(r => r.id === 'bolo-de-cenoura')!)).toBe('cenoura');
  expect(clue(recipes.find(r => r.id === 'pipoca')!)).toBe('milho');
  expect(clue(recipes.find(r => r.id === 'salada')!)).toBe('alface');
  expect(clue(recipes.find(r => r.id === 'morango-com-mel')!)).toBe('morango');
  for (const recipe of recipes) expect(recipe.ingredients).toContain(clue(recipe));
});
