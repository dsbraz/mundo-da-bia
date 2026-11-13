import type { ActorId, CropId, Item, Plant } from './types';

/** Recipes R01–R26 and the secrets S1–S3, in the book's order; these strings are save format. R25 and R26 (batata frita and pastel, the
 *  Bia's favourites) came within v3, as 4.4 allows: an earlier v3 build drops them instead of losing the house. */
export const recipeIds = ['sanduiche', 'ovo-mexido', 'panqueca', 'bolo-simples', 'leite-batidinho', 'torrada', 'pao-de-queijo', 'biscoito', 'pudim',
  'misto-quente', 'pipoca', 'salada', 'vitamina-de-morango', 'sopa-de-legumes', 'bolo-de-cenoura', 'torta-de-abobora', 'pizza', 'curau',
  'suco-de-cenoura', 'sanduiche-natural', 'brigadeiro', 'bolo-de-chocolate', 'torrada-de-canela', 'morango-com-mel', 'batata-frita', 'pastel',
  'petisco-de-gato', 'chocolate-quente', 'bolo-de-mel'] as const;
export const specialIds = ['chocolate', 'canela', 'mel'] as const;
/** The 12 goals of W3-10, in their order. */
export const goalIds = ['panqueca', 'alface', 'padaria', 'favorito', 'forno', 'quarto', 'tres-canteiros', 'prato-na-praca', 'carta',
  'caprichado', 'bolo-de-chocolate', 'cafe-com-gatos'] as const;
export const plazaPlots = ['praca-1', 'praca-2', 'praca-3', 'praca-4'] as const;
/** What appears on the market's specials shelf, one at a time (§3.4, W3L-23): the specials and the seeds she does not start with. */
export const shelfIds = ['chocolate', 'canela', 'mel', 'semente-milho', 'semente-morango', 'semente-abobora'] as const;
export type ShelfUnlock = typeof shelfIds[number];
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
  /** What has appeared on the market's shelves (W3L-23); it only grows. */
  shelves: ShelfUnlock[];
}
export function initialProgress(): Progress {
  return { recipes: [], fancy: [], seeds: ['alface', 'tomate', 'cenoura'], specials: [], basket: {}, plaza: {},
    post: { day: null, next: 0, inbox: [] }, revealed: [], favorites: [], goals: [], shelves: [] };
}
/** When each appears (§3.4): the first harvest brings corn seeds; discovered recipes bring the specials, and after a harvest more seeds. */
const reveals: readonly [ShelfUnlock, (recipes: number, harvested: boolean) => boolean][] = [
  ['semente-milho', (_, harvested) => harvested], ['chocolate', n => n >= 1], ['canela', n => n >= 3], ['mel', n => n >= 5],
  ['semente-morango', (n, harvested) => harvested && n >= 2], ['semente-abobora', (n, harvested) => harvested && n >= 4],
];
/** What is new on the market's shelves after a harvest (`harvest`) or a recipe: it only grows, in the order it appeared. */
export function revealShelves(progress: Progress, harvest: boolean): Progress {
  const harvested = harvest || progress.shelves.includes('semente-milho');
  const fresh = reveals.filter(([id, when]) => !progress.shelves.includes(id) && when(progress.recipes.length, harvested)).map(([id]) => id);
  return fresh.length ? { ...progress, shelves: [...progress.shelves, ...fresh] } : progress;
}
/** The next free item number: one past the largest numeric prefix among the item ids (1 with none). */
export function nextItemAfter(items: readonly Pick<Item, 'id'>[]): number {
  return Math.max(0, ...items.map(i => Number.parseInt(String(i.id), 10)).filter(Number.isSafeInteger)) + 1;
}
