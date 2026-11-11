import type { ActorId, CropId, Item, Plant } from './types';

/** Recipes R01–R24 and the secrets S1–S3, in the book's order; these strings are save format. */
export const recipeIds = ['sanduiche', 'ovo-mexido', 'panqueca', 'bolo-simples', 'leite-batidinho', 'torrada', 'pao-de-queijo', 'biscoito', 'pudim',
  'misto-quente', 'pipoca', 'salada', 'vitamina-de-morango', 'sopa-de-legumes', 'bolo-de-cenoura', 'torta-de-abobora', 'pizza', 'curau',
  'suco-de-cenoura', 'sanduiche-natural', 'brigadeiro', 'bolo-de-chocolate', 'torrada-de-canela', 'morango-com-mel',
  'petisco-de-gato', 'chocolate-quente', 'bolo-de-mel'] as const;
export const specialIds = ['chocolate', 'canela', 'mel'] as const;
/** The 12 goals of W3-10, in their order. */
export const goalIds = ['panqueca', 'alface', 'padaria', 'favorito', 'forno', 'quarto', 'tres-canteiros', 'prato-na-praca', 'carta',
  'caprichado', 'bolo-de-chocolate', 'cafe-com-gatos'] as const;
export const plazaPlots = ['praca-1', 'praca-2', 'praca-3', 'praca-4'] as const;
/** Letters L01–L12 and the notes B1–B8. */
export const letterCount = 20;
export const inboxLimit = 3;
export const basketLimit = 6;
export type RecipeId = typeof recipeIds[number];
export type SpecialId = typeof specialIds[number];
export type GoalId = typeof goalIds[number];
export type PlazaPlot = typeof plazaPlots[number];
export interface Post { day: number | null; next: number; inbox: number[] }
/** What the child has gained; it only grows. */
export interface Progress {
  recipes: RecipeId[]; fancy: RecipeId[]; seeds: CropId[]; specials: SpecialId[];
  basket: Partial<Record<CropId, number>>; plaza: Partial<Record<PlazaPlot, Plant>>; post: Post;
  revealed: RecipeId[]; favorites: ActorId[]; goals: GoalId[];
}
export function initialProgress(): Progress {
  return { recipes: [], fancy: [], seeds: ['alface', 'tomate', 'cenoura'], specials: [], basket: {}, plaza: {},
    post: { day: null, next: 0, inbox: [] }, revealed: [], favorites: [], goals: [] };
}
/** The next free item number: one past the largest numeric prefix among the item ids (1 with none). */
export function nextItemAfter(items: readonly Pick<Item, 'id'>[]): number {
  return Math.max(0, ...items.map(i => Number.parseInt(String(i.id), 10)).filter(Number.isSafeInteger)) + 1;
}
