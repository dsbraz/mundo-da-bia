import type { Neighborhood, NeighborhoodItem } from './neighborhood-types';
import { recipeIds, revealShelves, specialIds } from './progress';
import type { Progress, RecipeId } from './progress';
import { cropIds } from './types';
import type { ActorId, ItemId, Piece, PieceKind, Point } from './types';
import { basics, utensils } from './ingredients';
import type { Ingredient, Stock, Utensil } from './ingredients';
import { fullStock, stockOf, takeStock } from './stock';
import { pieceBounds } from './layout';
import { roomWidths } from './geometry';
import { spawnItem } from './portable';

export type { Ingredient, Utensil } from './ingredients';
export interface Recipe { id: RecipeId; utensil: Utensil; ingredients: readonly Ingredient[] }
const rows: [Utensil, ...Ingredient[]][] = [
  ['tabua', 'pao', 'queijo'], ['panela', 'ovo'], ['panela', 'farinha', 'ovo', 'leite'], ['forno', 'farinha', 'ovo', 'acucar'],
  ['liquidificador', 'leite', 'acucar'], ['forno', 'pao'], ['forno', 'farinha', 'queijo', 'ovo'], ['forno', 'farinha', 'acucar'],
  ['panela', 'leite', 'ovo', 'acucar'], ['forno', 'pao', 'queijo'], ['panela', 'milho'], ['tabua', 'alface', 'tomate'],
  ['liquidificador', 'morango', 'leite'], ['panela', 'cenoura', 'abobora', 'tomate'], ['forno', 'farinha', 'ovo', 'cenoura'],
  ['forno', 'farinha', 'abobora', 'acucar'], ['forno', 'farinha', 'tomate', 'queijo'], ['panela', 'milho', 'leite', 'acucar'],
  ['liquidificador', 'cenoura'], ['tabua', 'pao', 'alface', 'tomate'], ['panela', 'chocolate', 'leite', 'acucar'],
  ['forno', 'farinha', 'ovo', 'chocolate'], ['forno', 'pao', 'canela', 'acucar'], ['tabua', 'morango', 'mel'], ['panela', 'batata', 'oleo'],
  ['panela', 'farinha', 'queijo', 'oleo'], ['forno', 'peixe', 'farinha'], ['panela', 'leite', 'chocolate', 'canela'], ['forno', 'farinha', 'ovo', 'mel'],
];
/** The 29 recipes of §3.2 in the book's order: an exact set of ingredients (any order) and one utensil. */
export const recipes: readonly Recipe[] = recipeIds.map((id, i) => { const [utensil, ...ingredients] = rows[i]!; return { id, utensil, ingredients }; });
/** Known from the start: R01–R06. The last three (S1–S3) are secret, without a silhouette in the book. */
export const startingRecipes: readonly RecipeId[] = recipeIds.slice(0, 6);
export const secretRecipes: readonly RecipeId[] = recipeIds.slice(-3);
/** Where the bench opens (the bakery's display case joins in W3-21). */
export const benchKinds: readonly PieceKind[] = ['stove', 'counter', 'kitchen-cart'];
type BenchKind = 'stove' | 'counter' | 'kitchen-cart';
/** What each bench piece cooks with (W3L-16); a utensil it lacks is drawn as a silhouette and asks for the piece that has it. */
export const benchUtensils: Readonly<Record<BenchKind, readonly Utensil[]>> = { stove: ['panela', 'forno'], counter: ['tabua', 'liquidificador'], 'kitchen-cart': ['tabua'] };
/** The piece to look for when `utensil` is not at hand: the stove for the pan and the oven, the counter otherwise. */
export const utensilPiece = (utensil: Utensil): 'stove' | 'counter' => benchUtensils.stove.includes(utensil) ? 'stove' : 'counter';
/** Loose dishes a house holds; past it the bench does not cook. */
export const tableLimit = 6;
export interface CookInput { building: number; piece: number; cook: ActorId; ingredients: readonly Ingredient[]; utensil: Utensil }
export type Outcome =
  | { kind: 'dish'; recipe: RecipeId; item: ItemId; fancy: boolean; discovered: boolean }
  | { kind: 'utensil'; utensil: Utensil }
  /** The utensil is not at this piece (W3L-16): nothing changes and the bubble shows the piece that has it. */
  | { kind: 'missing'; want: 'stove' | 'counter' }
  | { kind: 'ghost'; ingredient: Ingredient }
  | { kind: 'steam' } | { kind: 'full' } | { kind: 'none' };
type Cooked = { town: Neighborhood; outcome: Outcome };

export function known(progress: Progress, id: RecipeId): boolean { return startingRecipes.includes(id) || progress.recipes.includes(id); }
/** What she can put in the bowl: the basics the house's pantry still has (W3L-20), a crop while the basket has some, and the specials she has won. */
export function pantry(progress: Progress, stock: Stock = fullStock()): Ingredient[] {
  return [...basics.filter(b => (stock[b] ?? 0) > 0), ...cropIds.filter(crop => (progress.basket[crop] ?? 0) > 0), ...specialIds.filter(id => progress.specials.includes(id))];
}
const sameSet = (recipe: Recipe, bowl: readonly Ingredient[]) => recipe.ingredients.length === bowl.length && bowl.every(i => recipe.ingredients.includes(i));
/** Undiscovered recipes first, then the table's order. */
const byPriority = (progress: Progress, list: Recipe[]) => [...list].sort((a, b) => Number(known(progress, a.id)) - Number(known(progress, b.id)));
/** Outcomes 2 to 4 of §3.2, none of which uses anything up: the right utensil wobbles, a ghost shows the missing ingredient, or steam. */
export function hint(progress: Progress, bowl: readonly Ingredient[], utensil: Utensil): Outcome {
  const [other] = byPriority(progress, recipes.filter(r => r.utensil !== utensil && sameSet(r, bowl)));
  if (other) return { kind: 'utensil', utensil: other.utensil };
  const [partial] = byPriority(progress, recipes.filter(r => r.utensil === utensil && bowl.every(i => r.ingredients.includes(i))));
  const missing = partial?.ingredients.find(i => !bowl.includes(i));
  return missing ? { kind: 'ghost', ingredient: missing } : { kind: 'steam' };
}
function validBowl(progress: Progress, stock: Stock, bowl: readonly Ingredient[], utensil: Utensil) {
  const available = pantry(progress, stock);
  return utensils.includes(utensil) && bowl.length >= 1 && bowl.length <= 3 && new Set(bowl).size === bowl.length && bowl.every(i => available.includes(i));
}
/** The bench piece of `input`, with the cook beside it in the same room, or nothing. */
function bench(town: Neighborhood, input: CookInput): Piece | undefined {
  const piece = town.buildings.find(b => b.id === input.building)?.layout.pieces.find(p => p.id === input.piece && benchKinds.includes(p.kind));
  const cook = town.actors.find(a => a.id === input.cook);
  const where = cook?.location;
  return piece && where?.kind === 'interior' && where.building === input.building && where.room === piece.room ? piece : undefined;
}
const looseDishes = (town: Neighborhood, building: number) => town.items.filter(i => i.kind === 'prato' && i.holder === null && i.location.kind === 'interior' && i.location.building === building);
/** On the floor in front of the piece, inside the room's 60 px margins; each loose dish already there pushes the next one aside. */
function dishPoint(town: Neighborhood, building: number, piece: Piece, count: number): Point {
  const box = pieceBounds[piece.kind], size = town.buildings.find(b => b.id === building)!.layout.rooms[piece.room]!.size;
  const x = piece.x + box.width / 2 + [0, 48, -48][count % 3]!, y = piece.y + box.height + 24 + Math.floor(count / 3) * 14;
  return { x: Math.min(roomWidths[size] - 60, Math.max(60, x)), y: Math.min(540, Math.max(280, y)) };
}
function useCrops(progress: Progress, bowl: readonly Ingredient[]): Progress['basket'] {
  const basket = { ...progress.basket };
  for (const crop of cropIds.filter(c => bowl.includes(c))) { const left = basket[crop]! - 1; if (left > 0) basket[crop] = left; else delete basket[crop]; }
  return basket;
}
const add = <T>(list: readonly T[], id: T, when: boolean) => when && !list.includes(id) ? [...list, id] : [...list];
function serveDish(town: Neighborhood, input: CookInput, piece: Piece, recipe: Recipe): Cooked {
  const dishes = looseDishes(town, input.building);
  if (dishes.length >= tableLimit) return { town, outcome: { kind: 'full' } };
  const fancy = town.actors.find(a => a.id === input.cook)!.look === 'chef', discovered = !known(town.progress, recipe.id);
  const location = { kind: 'interior' as const, building: input.building, room: piece.room };
  const spawned = spawnItem(town, { kind: 'prato', recipe: recipe.id, ...(fancy ? { fancy: true as const } : {}), location, point: dishPoint(town, input.building, piece, dishes.length) });
  const progress = revealShelves({ ...town.progress, basket: useCrops(town.progress, input.ingredients),
    recipes: add(town.progress.recipes, recipe.id, discovered), fancy: add(town.progress.fancy, recipe.id, fancy) }, false);
  const item = (spawned.items.at(-1) as NeighborhoodItem).id;
  const buildings = spawned.buildings.map(b => b.id === input.building ? { ...b, stock: takeStock(b.stock, input.ingredients) } : b);
  return { town: { ...handed(spawned, input.cook, item), buildings, progress }, outcome: { kind: 'dish', recipe: recipe.id, item, fancy, discovered } };
}
/** The ready dish goes to the cook's hand (W3L-07) when it is free; otherwise it stays on the floor by the bench. */
function handed(town: Neighborhood, cook: ActorId, item: ItemId): Neighborhood {
  const who = town.actors.find(a => a.id === cook)!;
  if (town.items.some(i => i.holder === cook)) return town;
  return { ...town, items: town.items.map(i => i.id === item ? { ...i, holder: cook, x: who.x, y: who.y } : i) };
}
/** The cook at the bench: a dish for an exact set and utensil, otherwise a hint that changes nothing (§3.2). */
export function cook(town: Neighborhood, input: CookInput): Cooked {
  const piece = bench(town, input);
  const house = town.buildings.find(b => b.id === input.building);
  if (!piece || !validBowl(town.progress, stockOf(house!), input.ingredients, input.utensil)) return { town, outcome: { kind: 'none' } };
  if (!benchUtensils[piece.kind as BenchKind].includes(input.utensil)) return { town, outcome: { kind: 'missing', want: utensilPiece(input.utensil) } };
  const recipe = recipes.find(r => r.utensil === input.utensil && sameSet(r, input.ingredients));
  return recipe ? serveDish(town, input, piece, recipe) : { town, outcome: hint(town.progress, input.ingredients, input.utensil) };
}
