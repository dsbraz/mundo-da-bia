import type { Item } from '../domain/types';
import type { NeighborhoodItem } from '../domain/neighborhood-types';
import type { RecipeId } from '../domain/progress';
import { itemKind } from '../domain/item-kind';
import { palette } from './palette';

/** The new art lives in `public/art/*.svg` sheets: each drawing is a `<g id>` in its own box, cut out here (never bundled with ?raw). */
export interface Box { width: number; height: number }
export const dishBox: Box = { width: 100, height: 100 };
export const bowlBox: Box = { width: 240, height: 120 };
export const steamBox: Box = { width: 120, height: 90 };
/** The same paths in the silhouette tone (§6): fills in `silhouette`, lines a step darker so the shape still reads; `none` stays. */
export function silhouette(markup: string): string {
  return markup.replace(/fill="(?!none")[^"]*"/g, `fill="${palette.silhouette}"`).replace(/stroke="(?!none")[^"]*"/g, `stroke="${palette.silhouetteLine}"`);
}
const encode = (svg: string) => `data:image/svg+xml;base64,${btoa(Array.from(new TextEncoder().encode(svg), byte => String.fromCharCode(byte)).join(''))}`;
/** The parts `ids` of a sheet (drawn in order, one over the other) as one SVG data URL in a `box` view; `dim` draws the silhouette. */
export function sheetPart(source: string, ids: readonly string[], box: Box, dim = false): string {
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml'), writer = new XMLSerializer();
  const parts = ids.map(id => { const part = parsed.getElementById(id); if (!part) throw new Error(`Desenho ausente: ${id}`); return writer.serializeToString(part); }).join('');
  return encode(`<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}">${dim ? silhouette(parts) : parts}</svg>`);
}
const sources = new Map<string, Promise<string>>();
/** The text of `/art/<name>.svg`, fetched once. */
export function sheet(name: 'dishes' | 'kitchen' | 'book' | 'chair' | 'market'): Promise<string> {
  if (!sources.has(name)) sources.set(name, fetch(`/art/${name}.svg`).then(response => response.text()));
  return sources.get(name)!;
}
/** A dish's recipe and finish, or null for any other object. */
export function dishOf(item: Item): { recipe: RecipeId; fancy: boolean } | null {
  const { recipe, fancy } = item as Partial<NeighborhoodItem>;
  return itemKind(item) === 'prato' && recipe ? { recipe, fancy: fancy === true } : null;
}
export const dishParts = (recipe: RecipeId, fancy: boolean) => fancy ? [recipe, 'garnish'] : [recipe];
/** The texture an object is drawn with: its kind, or for a dish its recipe (and the garnish when fancy). */
export function itemTexture(item: Item): string {
  const dish = dishOf(item);
  return dish ? `dish-${dish.recipe}${dish.fancy ? '-fancy' : ''}` : itemKind(item);
}
let dishSource: string | null = null;
const icons = new Map<string, string>();
/** Keeps the dishes sheet (read in the scene's preload) for the DOM icons. */
export function keepDishes(source: string) { dishSource = source; }
/** Shows `item` in `image`; a dish whose sheet is not read yet gets its drawing as soon as it arrives. */
export function showItem(image: HTMLImageElement, item: Item) {
  image.src = itemIcon(item);
  if (dishOf(item) && !dishSource) void sheet('dishes').then(source => { keepDishes(source); image.src = itemIcon(item); });
}
/** The picture of an object in the DOM (tray, panel, badges): a dish shows its own drawing once the sheet is read. */
export function itemIcon(item: Item): string {
  const dish = dishOf(item);
  if (!dish || !dishSource) return `/icons/${dish ? 'lanche' : itemKind(item)}.svg`;
  const key = itemTexture(item);
  if (!icons.has(key)) icons.set(key, sheetPart(dishSource, dishParts(dish.recipe, dish.fancy), dishBox));
  return icons.get(key)!;
}
