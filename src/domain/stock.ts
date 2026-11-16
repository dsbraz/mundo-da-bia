import { basics, stockLimit } from './ingredients';
import type { Basic, Ingredient, Stock } from './ingredients';
import type { Building, BuildingModel, Neighborhood } from './neighborhood-types';

/** 4 of each basic: how every house starts (§3.4) and how an untouched one reads. */
export function fullStock(): Stock { return Object.fromEntries(basics.map(b => [b, stockLimit])); }
/** The pantry of `building`: absent means it never cooked, so it is full. */
export function stockOf(building: Pick<Building, 'stock'>): Stock { return building.stock ?? fullStock(); }
const homes: readonly BuildingModel[] = ['house', 'apartment'];
/** The family's home, where the Turma lives: the first house (the lowest id), else the first building. Its pantry and fridge are the only
 *  ones (decision #11): every kitchen of the neighborhood (the reception counter, a break room, another house) cooks from them. */
export function familyHome<B extends Pick<Building, 'id' | 'model'>>(town: { buildings: readonly B[] }): B {
  const houses = town.buildings.filter(b => homes.includes(b.model));
  return (houses.length ? houses : town.buildings).reduce((a, b) => b.id < a.id ? b : a);
}
const isBasic = (id: Ingredient): id is Basic => (basics as readonly string[]).includes(id);
/** One of each basic in `bowl` is used up; the last one leaves the pantry (crops and specials are not the pantry's). */
export function takeStock(stock: Stock | undefined, bowl: readonly Ingredient[]): Stock {
  const next = { ...stock ?? fullStock() };
  for (const id of bowl.filter(isBasic)) { const left = (next[id] ?? 0) - 1; if (left > 0) next[id] = left; else delete next[id]; }
  return next;
}
/** Undo in Create brings old houses back but never refills a pantry or a fridge: each house keeps the stock and snacks it has now. */
export function keepStock(next: Neighborhood, current: Neighborhood): Neighborhood['buildings'] {
  return next.buildings.map(b => {
    const now = current.buildings.find(c => c.id === b.id);
    if (!now) return b;
    const rest = { ...b }; delete rest.stock; delete rest.snacks;
    return { ...rest, ...(now.stock ? { stock: now.stock } : {}), ...(now.snacks === undefined ? {} : { snacks: now.snacks }) };
  });
}
