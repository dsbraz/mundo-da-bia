import { expect, it } from 'vitest';
import { knownPlant, knownProgress } from './progress-validation';
import { initialProgress } from '../domain/progress';

const plant = { crop: 'alface', stage: 0, since: 0, watered: false };
it('progresso ausente ou que não é objeto volta ao inicial', () => {
  for (const value of [undefined, null, 3, 'x', []]) expect(knownProgress(value)).toEqual(initialProgress());
});
it('listas tiram ids desconhecidos e repetidos e mantêm a ordem; campo que não é lista volta ao inicial', () => {
  const progress = knownProgress({ recipes: ['pizza', 'lasanha', 'pizza', 'curau', 7], fancy: ['panqueca', 'panqueca'], seeds: 'alface',
    specials: ['mel', 'baunilha'], revealed: ['curau', null], favorites: ['luna', 'ze', 'luna'], goals: ['carta', 'voar'] });
  expect(progress).toMatchObject({ recipes: ['pizza', 'curau'], fancy: ['panqueca'], seeds: ['alface', 'tomate', 'cenoura'],
    specials: ['mel'], revealed: ['curau'], favorites: ['luna'], goals: ['carta'] });
  expect(knownProgress({ seeds: [] }).seeds).toEqual([]);
  expect(knownProgress({}).recipes).toEqual([]);
});
it('cesta: chave desconhecida, valor não inteiro ou ≤ 0 saem; acima de 6 vira 6', () => {
  expect(knownProgress({ basket: { kiwi: 2, alface: 1, tomate: 7, cenoura: 0, milho: -1, morango: 1.5, abobora: '2' } }).basket)
    .toEqual({ alface: 1, tomate: 6 });
  expect(knownProgress({ basket: { abobora: 6 } }).basket).toEqual({ abobora: 6 });
  expect(knownProgress({ basket: [] }).basket).toEqual({});
});
it('planta inválida sai sozinha e a válida é reconstruída só com seus campos', () => {
  expect(knownPlant({ ...plant, extra: 1 })).toEqual(plant);
  expect(knownPlant({ ...plant, stage: 4, since: 1.5, watered: true })).toEqual({ crop: 'alface', stage: 4, since: 1.5, watered: true });
  for (const bad of [{ crop: 'kiwi' }, { stage: 5 }, { stage: -1 }, { stage: 1.5 }, { stage: '1' }, { since: -1 }, { since: Number.POSITIVE_INFINITY },
    { since: Number.NaN }, { since: '3' }, { watered: 'sim' }]) expect(knownPlant({ ...plant, ...bad })).toBeNull();
  expect(knownPlant(null)).toBeNull();
  const plaza = knownProgress({ plaza: { 'praca-1': plant, 'praca-2': { ...plant, crop: 'kiwi' }, 'praca-9': plant } }).plaza;
  expect(plaza).toEqual({ 'praca-1': plant });
  expect(knownProgress({ plaza: 'x' }).plaza).toEqual({});
});
it('correio: inbox filtrada e truncada em 3; day e next inválidos voltam ao inicial', () => {
  expect(knownProgress({ post: { day: 20000, next: 4, inbox: [3, 3, -1, 20, 19, 1.5, '2', 0, 5, 6] } }).post).toEqual({ day: 20000, next: 4, inbox: [3, 19, 0] });
  expect(knownProgress({ post: { day: 0, next: 0, inbox: [] } }).post).toEqual({ day: 0, next: 0, inbox: [] });
  expect(knownProgress({ post: { day: -1, next: -2, inbox: 'x' } }).post).toEqual({ day: null, next: 0, inbox: [] });
  expect(knownProgress({ post: { day: 1.5, next: 1.5 } }).post).toEqual({ day: null, next: 0, inbox: [] });
  expect(knownProgress({ post: { day: null, next: 2 } }).post).toEqual({ day: null, next: 2, inbox: [] });
  expect(knownProgress({ post: 4 }).post).toEqual(initialProgress().post);
});
it('campo extra em progress é ignorado', () => {
  expect(knownProgress({ moedas: 99 })).toEqual(initialProgress());
});
